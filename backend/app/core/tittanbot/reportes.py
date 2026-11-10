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
    return {"exito": False, "resultado": f"No existe el reporte «{tipo}»."}
