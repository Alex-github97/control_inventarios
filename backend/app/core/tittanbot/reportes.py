"""
Los archivos que TittanBot arma para descargar.

El modelo no ve los datos: solo elige el reporte. El servidor arma el archivo
—los PDF por la propia API con el token del usuario, el Excel con SQL en el
esquema de la empresa— y el chat muestra un enlace que solo su dueño abre y
que vence en dos horas. Al modelo le llega el título y cuántas filas tiene.
"""
import os
import secrets
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict

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


async def _pdf_api(ctx: Contexto, ruta: str, params: dict, nombre: str, titulo: str) -> Dict[str, Any]:
    resp = await ejecutor.llamar_api("GET", ruta, ctx.headers, params=params)
    if resp.status_code != 200:
        return {"exito": False, "resultado": str(ejecutor._detalle(resp))}
    d = await _guardar(ctx, resp.content, nombre, "application/pdf")
    return {"exito": True, "titulo": titulo, **d}


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
    return {"exito": False, "resultado": f"No existe el reporte «{tipo}»."}
