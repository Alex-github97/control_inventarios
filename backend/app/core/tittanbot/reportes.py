"""
Los archivos que TittanBot arma para descargar.

El modelo no ve los datos: solo elige el reporte. El servidor arma el archivo
—los PDF por la propia API con el token del usuario, el Excel con SQL en el
esquema de la empresa— y el chat muestra un enlace que solo su dueño abre y
que vence en dos horas. Al modelo le llega el título y cuántas filas tiene.
"""
import asyncio
import os
import secrets
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.tittanbot import ejecutor
from app.core.tittanbot.herramientas import Contexto, _filtro_ordenes, _filas
from app.infrastructure.models.tittanbot import TittanbotDescarga

RAIZ = Path(settings.UPLOAD_DIR) / "tittanbot"
VIGENCIA = timedelta(hours=2)


def _limpiar_viejos() -> None:
    limite = time.time() - 6 * 3600
    for f in RAIZ.glob("*") if RAIZ.exists() else []:
        try:
            if f.stat().st_mtime < limite:
                f.unlink()
        except OSError:
            pass


async def _guardar(ctx: Contexto, contenido: bytes, nombre: str, tipo: str) -> Dict[str, Any]:
    RAIZ.mkdir(parents=True, exist_ok=True)
    _limpiar_viejos()
    token = secrets.token_urlsafe(24)
    ruta = RAIZ / f"{ctx.esquema}-{token}{Path(nombre).suffix}"
    ruta.write_bytes(contenido)
    ctx.db.add(TittanbotDescarga(token=token, usuario_id=ctx.usuario.id, nombre=nombre, ruta=str(ruta),
                                 tipo=tipo, vence=datetime.utcnow() + VIGENCIA))
    await ctx.db.flush()
    d = {"token": token, "nombre": nombre}
    ctx.descargas.append(d)
    return d


async def _ordenes_excel(ctx: Contexto, a: dict) -> Dict[str, Any]:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    donde, p = _filtro_ordenes(a, ctx.usuario)
    filas = await _filas(ctx.db, f"""
        SELECT o.numero, a.codigo AS placa, a.nombre AS activo, o.tipo_ot, o.estado, o.prioridad,
               o.descripcion, o.tecnico_asignado, o.created_at, o.fecha_requerida, o.fecha_fin,
               o.tiempo_real_horas, o.costo_mano_obra, o.costo_repuestos, o.costo_servicios, o.costo_total
          FROM eam_orden_trabajo o JOIN eam_activo a ON a.id = o.activo_id
         WHERE {donde} ORDER BY o.id DESC LIMIT 20000""", p)
    columnas = ["Número", "Placa", "Activo", "Tipo", "Estado", "Prioridad", "Descripción", "Técnico",
                "Creada", "Requerida", "Cerrada", "Horas reales", "Mano de obra", "Repuestos", "Servicios", "Total"]
    libro = Workbook()
    hoja = libro.active
    hoja.title = "Órdenes"
    hoja.append(columnas)
    for celda in hoja[1]:
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = PatternFill("solid", fgColor="051C2C")
    def sin_zona(v):
        # Excel no admite fechas con zona horaria (created_at la trae).
        return v.replace(tzinfo=None) if hasattr(v, "tzinfo") and v.tzinfo else v

    for f in filas:
        f = {k: sin_zona(v) for k, v in f.items()}
        hoja.append([f["numero"], f["placa"], f["activo"], f["tipo_ot"], f["estado"], f["prioridad"],
                     f["descripcion"], f["tecnico_asignado"], f["created_at"], f["fecha_requerida"], f["fecha_fin"],
                     f["tiempo_real_horas"], f["costo_mano_obra"], f["costo_repuestos"], f["costo_servicios"],
                     f["costo_total"]])
    for col, ancho in zip("ABCDEFGHIJKLMNOP", (16, 11, 28, 13, 13, 10, 50, 22, 18, 18, 18, 11, 13, 13, 13, 13)):
        hoja.column_dimensions[col].width = ancho
    hoja.freeze_panes = "A2"
    import io
    salida = io.BytesIO()
    libro.save(salida)
    d = await _guardar(ctx, salida.getvalue(), f"ordenes-{datetime.now():%Y%m%d-%H%M}.xlsx",
                       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    return {"exito": True, "titulo": "Órdenes de trabajo (Excel)", "filas": len(filas), **d}


async def _pdf_api(ctx: Contexto, ruta: str, params: dict, nombre: str, titulo: str,
                   metodo: str = "GET", cuerpo: Optional[dict] = None) -> Dict[str, Any]:
    resp = await ejecutor.llamar_api(metodo, ruta, ctx.headers, cuerpo=cuerpo, params=params)
    if resp.status_code != 200:
        return {"exito": False, "resultado": str(ejecutor._detalle(resp))}
    d = await _guardar(ctx, resp.content, nombre, "application/pdf")
    return {"exito": True, "titulo": titulo, **d}


def _lista(v) -> Optional[List[str]]:
    if not v:
        return None
    return [x.strip() for x in (v if isinstance(v, list) else str(v).split(",")) if str(x).strip()]


async def _llantas_flota(ctx: Contexto, a: dict) -> Dict[str, Any]:
    """El informe de estado de llantas de la flota. Con más de doscientos
    vehículos el servidor lo arma en segundo plano: se espera hasta un minuto
    —el proxy corta la petición a los 120 s, y el turno incluye también las
    llamadas al modelo—, y si no está, se le dice que lo pida en un rato."""
    cuerpo: Dict[str, Any] = {k: v for k, v in {
        "marca": _lista(a.get("marca")), "tipos_vehiculo": _lista(a.get("tipo_vehiculo")),
        "desde": a.get("desde"), "hasta": a.get("hasta")}.items() if v}
    if a.get("placa"):
        filas = await _filas(ctx.db, "SELECT id FROM eam_activo WHERE codigo ILIKE :p OR placa ILIKE :p",
                             {"p": a["placa"].strip()})
        if not filas:
            return {"exito": False, "resultado": f"No hay un equipo con la placa «{a['placa']}»."}
        cuerpo["activo_ids"] = [f["id"] for f in filas]
    base = "/api/v1/eam/neumaticos/reportes/informe-flota"
    nombre = f"estado-llantas-flota-{datetime.now():%Y%m%d}.pdf"
    titulo = "Informe de estado de llantas de la flota (PDF)"
    resp = await ejecutor.llamar_api("POST", base, ctx.headers, cuerpo=cuerpo)
    if resp.status_code == 200:
        d = await _guardar(ctx, resp.content, nombre, "application/pdf")
        return {"exito": True, "titulo": titulo, **d}
    if resp.status_code != 202:
        return {"exito": False, "resultado": str(ejecutor._detalle(resp))}
    tid = resp.json().get("trabajo_id")
    for _ in range(20):
        await asyncio.sleep(3)
        estado = (await ejecutor.llamar_api("GET", f"{base}/trabajos/{tid}", ctx.headers)).json()
        if estado.get("estado") == "LISTO":
            return await _pdf_api(ctx, f"{base}/trabajos/{tid}/archivo", {}, nombre, titulo)
        if estado.get("estado") == "FALLIDO":
            return {"exito": False, "resultado": f"El informe falló: {estado.get('error')}"}
    return {"exito": False, "resultado": "La flota es grande y el informe se sigue armando en segundo plano. "
                                          "Pídamelo de nuevo en unos minutos."}


TIPOS_LLANTAS = {"TABLERO", "CPK", "KM", "KM_MM", "VIDAS", "COMPOSICION"}


async def _llantas_rendimiento(ctx: Contexto, a: dict) -> Dict[str, Any]:
    tipo = (a.get("informe_llantas") or "TABLERO").upper()
    if tipo not in TIPOS_LLANTAS:
        return {"exito": False, "resultado": "Informe de llantas desconocido. Use uno de: "
                                              + ", ".join(sorted(TIPOS_LLANTAS)) + "."}
    params = {k: v for k, v in {"tipo": tipo, "desde": a.get("desde"), "hasta": a.get("hasta"),
                                "marca": _lista(a.get("marca"))}.items() if v}
    return await _pdf_api(ctx, "/api/v1/eam/neumaticos/reportes/informe-pdf", params,
                          f"llantas-{tipo.lower().replace('_', '-')}-{datetime.now():%Y%m%d}.pdf",
                          f"Informe de llantas: {tipo} (PDF)", metodo="POST")


async def _causa_raiz(ctx: Contexto, a: dict) -> Dict[str, Any]:
    ref = (a.get("numero") or a.get("placa") or "").strip()
    filas = await _filas(ctx.db, """
        SELECT r.id, r.ot_numero FROM eam_causa_raiz r LEFT JOIN eam_activo a ON a.id = r.activo_id
         WHERE r.ot_numero ILIKE :r OR a.codigo ILIKE :r OR a.placa ILIKE :r OR r.id::text = :r
         ORDER BY r.id DESC LIMIT 1""", {"r": ref})
    if not filas:
        return {"exito": False, "resultado": f"No hay un análisis de causa raíz para «{ref}»."}
    f = filas[0]
    return await _pdf_api(ctx, f"/api/v1/eam/causa-raiz/{f['id']}/pdf", {},
                          f"causa-raiz-{(f['ot_numero'] or f['id'])}.pdf".replace("/", "-"),
                          f"Análisis de causa raíz {f['ot_numero'] or f['id']} (PDF)")


async def _tittanlite(ctx: Contexto, a: dict, pdf: bool) -> Dict[str, Any]:
    """El informe de las inspecciones de TittanLite: composición a piso,
    estado bueno/regular/crítico, esquema por vehículo y novedades."""
    from datetime import date, timedelta
    from fastapi import HTTPException
    from app.api.v1.endpoints.eam_lite import informe_excel_bytes, informe_pdf_bytes
    hasta = date.fromisoformat(a["hasta"][:10]) if a.get("hasta") else None
    desde = date.fromisoformat(a["desde"][:10]) if a.get("desde") else date.today() - timedelta(days=int(a.get("dias") or 30))
    ids = None
    if a.get("placa"):
        filas = await _filas(ctx.db, "SELECT id FROM eam_activo WHERE placa ILIKE :p OR codigo ILIKE :p",
                             {"p": a["placa"].strip()})
        if not filas:
            return {"exito": False, "resultado": f"No hay un vehículo con placa «{a['placa']}»."}
        ids = [f["id"] for f in filas]
    nombre_u = f"{getattr(ctx.usuario, 'nombre', '') or ''} {getattr(ctx.usuario, 'apellido', '') or ''}".strip()
    try:
        if pdf:
            contenido = await informe_pdf_bytes(ctx.db, desde, hasta, ids, nombre_u or "TittanBot")
            d = await _guardar(ctx, contenido, f"tittanlite-{datetime.now():%Y%m%d}.pdf", "application/pdf")
        else:
            contenido = await informe_excel_bytes(ctx.db, desde, hasta, ids)
            d = await _guardar(ctx, contenido, f"tittanlite-{datetime.now():%Y%m%d}.xlsx",
                               "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    except HTTPException as e:
        return {"exito": False, "resultado": str(e.detail)}
    return {"exito": True, "archivo": d["nombre"], "token": d["token"],
            "resultado": f"Informe TittanLite desde {desde:%d/%m/%Y} listo para descargar."}


async def _disposicion_excel(ctx: Contexto, a: dict) -> Dict[str, Any]:
    """Pila de desechos y disposición final: el tablero (por ubicación, avería,
    causa, motivo, responsable, marca, dimensión, vida) y una fila por llanta."""
    import io
    from datetime import date, timedelta
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    hasta = a.get("hasta") or date.today().isoformat()
    desde = a.get("desde") or (date.today() - timedelta(days=int(a.get("dias") or 90))).isoformat()
    params = {"desde": desde[:10], "hasta": hasta[:10]}
    r = await ejecutor.llamar_api("GET", "/api/v1/eam/neumaticos/reportes/descarte", ctx.headers, params=params)
    if r.status_code != 200:
        return {"exito": False, "resultado": str(ejecutor._detalle(r))}
    t = r.json()
    filas: List[dict] = []
    for pagina in range(10):
        rr = await ejecutor.llamar_api("GET", "/api/v1/eam/neumaticos/disposicion", ctx.headers,
                                       params={**params, "limite": 500, "desplazamiento": pagina * 500})
        lote = rr.json() if rr.status_code == 200 else []
        filas += lote
        if len(lote) < 500:
            break

    libro = Workbook()
    h = libro.active
    h.title = "Resumen"
    h.append(["Pila de desechos y disposición final"])
    h["A1"].font = Font(bold=True, size=13)
    h.append([f"Bajas del {desde[:10]} al {hasta[:10]}"])
    h.append([])
    h.append(["Llantas dadas de baja", t.get("total")])
    h.append(["Índice de reencauche (I.R.)", (t.get("ir") or {}).get("ir")])
    disp = t.get("disposicion") or {}
    h.append(["Con examen de disposición", disp.get("registradas")])
    h.append(["Profundidad remanente promedio (mm)", disp.get("profundidad_remanente")])
    h.append(["Con reparaciones", disp.get("con_reparaciones")])
    for titulo, clave in (("Por código de daño", "por_dano"), ("Dónde está el daño", "por_ubicacion"),
                          ("Categoría de daño", "por_categoria"), ("Causa", "por_causa"), ("Motivo", "por_motivo_dano"),
                          ("Responsable", "por_responsable"), ("Vida", "por_vida")):
        h.append([])
        h.append([titulo, "Llantas", "%"])
        for c in h[h.max_row]:
            c.font = Font(bold=True)
        for x in t.get(clave) or []:
            h.append([x.get("nombre"), x.get("cantidad"), x.get("porcentaje")])
    for titulo, clave in (("Por marca", "por_marca"), ("Por dimensión", "por_medida")):
        h.append([])
        h.append([titulo, "Llantas", "I.R."])
        for c in h[h.max_row]:
            c.font = Font(bold=True)
        for x in t.get(clave) or []:
            h.append([x.get("categoria"), x.get("total"), x.get("ir")])
    h.column_dimensions["A"].width = 52
    d = libro.create_sheet("Llantas")
    d.append(["Fecha", "Llanta", "Marca", "Referencia", "Dimensión", "Vida", "Código de daño", "Daño",
              "Ubicación del daño", "Responsable", "Prof. mínima (mm)", "Reparaciones", "Fotos", "Origen"])
    for c in d[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="051C2C")
    for f in filas:
        d.append([str(f.get("fecha") or "")[:10], f.get("codigo"), f.get("marca"), f.get("referencia"), f.get("medida"),
                  "VN" if not f.get("vida") else f"R{f.get('vida')}", f.get("dano_codigo"), f.get("dano"),
                  f.get("ubicacion_dano"), f.get("responsable"), f.get("profundidad_minima"), f.get("reparaciones"),
                  f.get("fotos"), f.get("origen")])
    for col, ancho in zip("ABCDEFGHIJKLMN", (11, 12, 14, 14, 13, 6, 10, 40, 20, 14, 10, 10, 7, 11)):
        d.column_dimensions[col].width = ancho
    d.freeze_panes = "A2"
    salida = io.BytesIO()
    libro.save(salida)
    g = await _guardar(ctx, salida.getvalue(), f"pila-desechos-{datetime.now():%Y%m%d}.xlsx",
                       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    return {"exito": True, "titulo": "Pila de desechos y disposición final (Excel)", "filas": len(filas), **g}


async def generar(ctx: Contexto, a: dict) -> Dict[str, Any]:
    tipo = a.get("tipo")
    if tipo == "ordenes_excel":
        return await _ordenes_excel(ctx, a)
    if tipo == "lubricacion_flota_pdf":
        params = {k: v for k, v in {"dias": a.get("dias") or 365, "marca": a.get("marca")}.items() if v}
        return await _pdf_api(ctx, "/api/v1/eam/lube/informes/flota", params,
                              f"programa-aceite-{datetime.now():%Y%m%d}.pdf", "Informe del programa de aceite (PDF)")
    if tipo == "lubricacion_muestra_pdf":
        numero = (a.get("numero") or "").strip()
        filas = await _filas(ctx.db, "SELECT id, numero FROM eam_lube_muestra WHERE numero ILIKE :n LIMIT 1",
                             {"n": numero})
        if not filas:
            return {"exito": False, "resultado": f"No hay una muestra con el número «{numero}»."}
        return await _pdf_api(ctx, f"/api/v1/eam/lube/informes/muestra/{filas[0]['id']}", {},
                              f"analisis-aceite-{filas[0]['numero']}.pdf", f"Informe de la muestra {filas[0]['numero']}")
    if tipo == "llantas_flota_pdf":
        return await _llantas_flota(ctx, a)
    if tipo == "llantas_rendimiento_pdf":
        return await _llantas_rendimiento(ctx, a)
    if tipo == "causa_raiz_pdf":
        return await _causa_raiz(ctx, a)
    if tipo == "disposicion_excel":
        return await _disposicion_excel(ctx, a)
    if tipo == "plan_recambio_excel":
        from app.api.v1.endpoints.eam_neumaticos_proyeccion import excel_plan
        origen = "LITE" if (a.get("origen") or "").upper() == "LITE" else "TITTANWARE"
        meses = max(1, min(int(a.get("meses") or 6), 24))
        contenido = await excel_plan(ctx.db, origen, meses)
        d = await _guardar(ctx, contenido, f"plan-recambio-{'lite-' if origen == 'LITE' else ''}{datetime.now():%Y%m%d}.xlsx",
                           "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        return {"exito": True, "archivo": d["nombre"], "token": d["token"],
                "resultado": f"Plan de recambio de los próximos {meses} meses listo para descargar."}
    if tipo in ("tittanlite_pdf", "tittanlite_excel"):
        return await _tittanlite(ctx, a, tipo == "tittanlite_pdf")
    return {"exito": False, "resultado": f"No existe el reporte «{tipo}»."}
