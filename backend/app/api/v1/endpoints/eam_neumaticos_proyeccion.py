"""
Proyección de kilometraje de cada llanta y plan de recambio (TittanWare y
TittanLite). El cálculo está en `core/proyeccion_llantas.py`.
"""
import asyncio
import io
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import proyeccion_llantas as pl
from app.core.database import get_db

router = APIRouter(prefix="/eam/neumaticos/proyeccion", tags=["CMMS/EAM · Neumáticos · Proyección"])

TOPE_LISTA = 3000


async def _proyecciones(db, origen: str, activo_ids, tipos_vehiculo, dias_lite: int):
    if origen == "LITE":
        return await pl.proyectar_lite(db, datetime.now() - timedelta(days=dias_lite), activo_ids)
    return await pl.proyectar_flota(db, activo_ids, tipos_vehiculo)


def _orden(p: pl.Proyeccion):
    return (p.fecha_cambio is None, p.fecha_cambio or date.max, p.placa or "", p.posicion or "")


@router.get("/llanta/{nid}")
async def proyeccion_llanta(nid: int, db: AsyncSession = Depends(get_db)):
    """La proyección de una llanta montada, con de dónde salió cada número."""
    from app.infrastructure.models.eam import EAMNeumatico
    n = await db.get(EAMNeumatico, nid)
    if not n:
        raise HTTPException(404, "Esa llanta no existe")
    if n.estado != "INSTALADO" or not n.activo_id:
        return {"proyeccion": None, "motivo": "Solo se proyectan llantas montadas"}
    ps = await pl.proyectar_flota(db, [n.activo_id])
    p = next((x for x in ps if x.neumatico_id == nid), None)
    return {"proyeccion": pl.como_dict(p) if p else None}


@router.get("/plan")
async def plan_recambio(
    origen: str = Query("TITTANWARE", description="TITTANWARE o LITE"),
    meses: int = Query(6, ge=1, le=24),
    activo_ids: Optional[List[int]] = Query(None),
    tipos_vehiculo: Optional[List[str]] = Query(None),
    dias_lite: int = Query(180, ge=7, le=1095, description="LITE: inspecciones de los últimos N días"),
    db: AsyncSession = Depends(get_db),
):
    """Cuándo se acaba cada llanta montada y cuántas hay que cambiar por mes,
    por tipo de eje y por dimensión."""
    origen = origen.upper()
    ps = await _proyecciones(db, origen, activo_ids, tipos_vehiculo, dias_lite)
    cfg = await pl.configuracion(db)
    ps.sort(key=_orden)
    return {"origen": origen, "configuracion": {"mm_utiles": cfg["mm_utiles"], "por_medida": cfg["por_medida"],
                                                "profundidad_minima": cfg["minima"], "ventana_km_diario": cfg["ventana"]},
            "plan": pl.plan(ps, meses), "llantas": [pl.como_dict(p) for p in ps[:TOPE_LISTA]],
            "total_llantas": len(ps)}


async def excel_plan(db: AsyncSession, origen: str, meses: int, activo_ids=None, tipos_vehiculo=None,
                     dias_lite: int = 180) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    ps = await _proyecciones(db, origen.upper(), activo_ids, tipos_vehiculo, dias_lite)
    ps.sort(key=_orden)
    resumen = pl.plan(ps, meses)

    def construir() -> bytes:
        libro = Workbook()
        h = libro.active
        h.title = "Plan de recambio"
        h.append([f"Plan de recambio de llantas · {'TittanLite' if origen.upper() == 'LITE' else 'TittanWare'}"])
        h["A1"].font = Font(bold=True, size=13)
        h.append([f"Próximos {meses} meses · generado el {date.today():%d/%m/%Y}"])
        h.append([])
        ejes = ["Direccional", "Tracción", "Libre", "Sin dato de eje"]
        h.append(["Mes", "Total", *ejes])
        for c in h[h.max_row]:
            c.font = Font(bold=True)
        for m in resumen["meses"]:
            h.append([m["mes"], m["total"], *[m["por_eje"].get(e, 0) for e in ejes]])
        h.append(["Total", resumen["total"], *[resumen["por_eje"].get(e, 0) for e in ejes]])
        h.append([])
        h.append(["Mes", "Tipo de eje", "Dimensión", "Llantas"])
        for c in h[h.max_row]:
            c.font = Font(bold=True)
        for m in resumen["meses"]:
            for x in m["cruce"]:
                h.append([m["mes"], x["eje"], x["medida"], x["cantidad"]])
        if resumen["sin_fecha"]:
            h.append([])
            h.append(["Llantas sin fecha estimada", "Motivo"])
            for motivo, c in resumen["sin_fecha"].items():
                h.append([c, motivo])
        h.column_dimensions["A"].width = 26
        d = libro.create_sheet("Llantas")
        enc = ["Fecha de cambio", "Días", "Placa", "Posición", "Código", "Eje", "Dimensión", "Marca", "Referencia",
               "Vida", "Prof. actual", "mm útiles", "mm usados", "mm restantes", "Km recorridos", "Km/mm",
               "Origen del km/mm", "Km faltantes", "Km proyectado", "Km diario del vehículo"]
        d.append(enc)
        for c in d[1]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = PatternFill("solid", fgColor="1F4E79")
        for p in ps:
            d.append([p.fecha_cambio, p.dias_restantes, p.placa, p.posicion, p.codigo,
                      pl.EJES.get(p.tipo_uso, "Sin dato"), p.medida, p.marca, p.referencia, p.vida,
                      p.profundidad_actual, p.mm_utiles, p.mm_usados, p.mm_restantes, p.km_recorridos, p.km_mm,
                      p.fuente_km_mm, p.km_faltantes, p.km_proyectado, p.km_diario])
        for col, ancho in zip("ABCDEFGHIJKLMNOPQRST", (14, 7, 10, 12, 13, 12, 13, 13, 13, 6, 9, 9, 9, 10, 12, 9,
                                                       34, 12, 12, 12)):
            d.column_dimensions[col].width = ancho
        d.freeze_panes = "A2"
        b = io.BytesIO()
        libro.save(b)
        return b.getvalue()
    return await asyncio.to_thread(construir)


@router.get("/plan/excel")
async def plan_excel(origen: str = "TITTANWARE", meses: int = Query(6, ge=1, le=24),
                     activo_ids: Optional[List[int]] = Query(None), tipos_vehiculo: Optional[List[str]] = Query(None),
                     dias_lite: int = Query(180, ge=7, le=1095), db: AsyncSession = Depends(get_db)):
    contenido = await excel_plan(db, origen, meses, activo_ids, tipos_vehiculo, dias_lite)
    nombre = f"plan-recambio-{'lite-' if origen.upper() == 'LITE' else ''}{date.today():%Y%m%d}.xlsx"
    return Response(contenido, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="{nombre}"',
                             "Access-Control-Expose-Headers": "Content-Disposition"})
