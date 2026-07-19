"""
API endpoints — QMS (Quality Management System)
Prefijo: /qms
"""
from datetime import date, datetime
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.infrastructure.models.mes import MESOEERegistro, MESOrdenProduccion, MESParada
from app.core.dependencies import get_current_user
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.qms import (
    QMSProceso, QMSProcedimiento, QMSIndicador, QMSMetaIndicador,
    QMSMedicionIndicador, QMSNoConformidad, QMSHallazgo, QMSAuditoria,
    QMSAuditoriaHallazgo, QMSCAPA, QMSCAPATarea, QMSRiesgo,
    QMSQueja, QMSEvaluacionProveedor, QMSCambio, QMSMejora,
    QMSEncuesta, QMSEncuestaRespuesta, QMSCompetenciaProceso, QMSKPIDiario,
)
from app.application.schemas.qms import (
    QMSProcesoCreate, QMSProcesoUpdate, QMSProcesoResponse,
    QMSProcedimientoCreate, QMSProcedimientoUpdate, QMSProcedimientoResponse,
    QMSIndicadorCreate, QMSIndicadorUpdate, QMSIndicadorResponse,
    QMSMetaIndicadorCreate, QMSMetaIndicadorResponse,
    QMSMedicionIndicadorCreate, QMSMedicionIndicadorResponse,
    QMSNoConformidadCreate, QMSNoConformidadUpdate, QMSNoConformidadResponse,
    QMSHallazgoCreate, QMSHallazgoUpdate, QMSHallazgoResponse,
    QMSAuditoriaCreate, QMSAuditoriaUpdate, QMSAuditoriaResponse,
    QMSAuditoriaHallazgoCreate, QMSAuditoriaHallazgoResponse,
    QMSCAPACreate, QMSCAPAUpdate, QMSCAPAResponse,
    QMSCAPATareaCreate, QMSCAPATareaUpdate, QMSCAPATareaResponse,
    QMSRiesgoCreate, QMSRiesgoUpdate, QMSRiesgoResponse,
    QMSQuejaCreate, QMSQuejaUpdate, QMSQuejaResponse,
    QMSEvaluacionProveedorCreate, QMSEvaluacionProveedorUpdate, QMSEvaluacionProveedorResponse,
    QMSCambioCreate, QMSCambioUpdate, QMSCambioResponse,
    QMSMejoraCreate, QMSMejoraUpdate, QMSMejoraResponse,
    QMSEncuestaCreate, QMSEncuestaUpdate, QMSEncuestaResponse,
    QMSEncuestaRespuestaCreate, QMSEncuestaRespuestaResponse,
    QMSCompetenciaProcesoCreate, QMSCompetenciaProcesoResponse,
    QMSKPIDiarioResponse, QMSDashboardKPIs,
)

router = APIRouter(prefix="/qms", tags=["QMS"])


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _calcular_prioridad_riesgo(nivel: int) -> str:
    """Determina la prioridad de un riesgo según su nivel (prob * impacto)."""
    if nivel <= 4:
        return "BAJA"
    elif nivel <= 9:
        return "MEDIA"
    elif nivel <= 14:
        return "ALTA"
    else:
        return "CRITICA"


def _calcular_clasificacion_proveedor(puntaje: float) -> str:
    """Determina la clasificación de un proveedor según su puntaje total."""
    if puntaje >= 90:
        return "excelente"
    elif puntaje >= 75:
        return "bueno"
    elif puntaje >= 60:
        return "regular"
    else:
        return "deficiente"


# ===========================================================================
# 1. DASHBOARD KPIs
# ===========================================================================

@router.get("/dashboard", response_model=QMSDashboardKPIs)
async def get_qms_dashboard(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    today = date.today()

    # NC abiertas (sin deleted_at y con estado distinto de "cerrada")
    r = await db.execute(
        select(func.count(QMSNoConformidad.id)).where(
            and_(
                QMSNoConformidad.deleted_at.is_(None),
                QMSNoConformidad.estado != "cerrada",
            )
        )
    )
    nc_abiertas = r.scalar() or 0

    # Total NC
    r = await db.execute(
        select(func.count(QMSNoConformidad.id)).where(
            QMSNoConformidad.deleted_at.is_(None)
        )
    )
    total_nc = r.scalar() or 0

    # Hallazgos abiertos
    r = await db.execute(
        select(func.count(QMSHallazgo.id)).where(
            and_(
                QMSHallazgo.deleted_at.is_(None),
                QMSHallazgo.estado != "cerrado",
            )
        )
    )
    hallazgos_abiertos = r.scalar() or 0

    # CAPA abiertas
    r = await db.execute(
        select(func.count(QMSCAPA.id)).where(
            and_(
                QMSCAPA.deleted_at.is_(None),
                QMSCAPA.estado != "cerrada",
            )
        )
    )
    capa_abiertas = r.scalar() or 0

    # CAPA vencidas (fecha_limite_implementacion < hoy y no cerradas)
    r = await db.execute(
        select(func.count(QMSCAPA.id)).where(
            and_(
                QMSCAPA.deleted_at.is_(None),
                QMSCAPA.estado != "cerrada",
                QMSCAPA.fecha_limite_implementacion < datetime.utcnow(),
            )
        )
    )
    capa_vencidas = r.scalar() or 0

    # Riesgos críticos
    r = await db.execute(
        select(func.count(QMSRiesgo.id)).where(
            and_(
                QMSRiesgo.deleted_at.is_(None),
                QMSRiesgo.prioridad == "CRITICA",
            )
        )
    )
    riesgos_criticos = r.scalar() or 0

    # Total riesgos activos
    r = await db.execute(
        select(func.count(QMSRiesgo.id)).where(
            and_(
                QMSRiesgo.deleted_at.is_(None),
                QMSRiesgo.estado == "activo",
            )
        )
    )
    riesgos_activos = r.scalar() or 0

    # Quejas abiertas
    r = await db.execute(
        select(func.count(QMSQueja.id)).where(
            and_(
                QMSQueja.deleted_at.is_(None),
                QMSQueja.estado != "cerrada",
            )
        )
    )
    quejas_abiertas = r.scalar() or 0

    # Auditorías en curso
    r = await db.execute(
        select(func.count(QMSAuditoria.id)).where(
            and_(
                QMSAuditoria.deleted_at.is_(None),
                QMSAuditoria.estado == "en_curso",
            )
        )
    )
    auditorias_en_curso = r.scalar() or 0

    # Mejoras implementadas este año
    r = await db.execute(
        select(func.count(QMSMejora.id)).where(
            and_(
                QMSMejora.deleted_at.is_(None),
                QMSMejora.estado == "implementada",
                func.extract("year", QMSMejora.created_at) == today.year,
            )
        )
    )
    mejoras_implementadas = r.scalar() or 0

    # Procesos activos
    r = await db.execute(
        select(func.count(QMSProceso.id)).where(
            QMSProceso.activo == True
        )
    )
    procesos_activos = r.scalar() or 0

    # Índice de calidad (fórmula simple: base 100 descontando NC abiertas)
    indice_calidad = round(max(0.0, 100.0 - (nc_abiertas * 2) - (riesgos_criticos * 3)), 2)

    # Evaluaciones de proveedores este periodo
    r = await db.execute(
        select(func.count(QMSEvaluacionProveedor.id)).where(
            func.extract("year", QMSEvaluacionProveedor.created_at) == today.year
        )
    )
    evaluaciones_proveedores = r.scalar() or 0

    return QMSDashboardKPIs(
        nc_abiertas=nc_abiertas,
        total_nc=total_nc,
        hallazgos_abiertos=hallazgos_abiertos,
        capa_abiertas=capa_abiertas,
        capa_vencidas=capa_vencidas,
        riesgos_criticos=riesgos_criticos,
        riesgos_activos=riesgos_activos,
        quejas_abiertas=quejas_abiertas,
        auditorias_en_curso=auditorias_en_curso,
        mejoras_implementadas=mejoras_implementadas,
        procesos_activos=procesos_activos,
        indice_calidad=indice_calidad,
        evaluaciones_proveedores=evaluaciones_proveedores,
    )


# ===========================================================================
# 2. PROCESOS
# ===========================================================================

@router.get("/procesos/arbol")
async def arbol_procesos(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Retorna la jerarquía padre-hijo para el mapa de procesos."""
    r = await db.execute(
        select(QMSProceso).where(QMSProceso.activo == True).order_by(QMSProceso.nombre)
    )
    todos = r.scalars().all()

    # Construir árbol
    mapa: dict = {}
    raices: list = []
    for p in todos:
        mapa[p.id] = {"id": p.id, "nombre": p.nombre, "tipo": p.tipo, "hijos": []}
    for p in todos:
        if p.padre_id and p.padre_id in mapa:
            mapa[p.padre_id]["hijos"].append(mapa[p.id])
        elif not p.padre_id:
            raices.append(mapa[p.id])
    return raices


@router.get("/procesos", response_model=List[QMSProcesoResponse])
async def listar_procesos(
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    padre_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSProceso).where(QMSProceso.activo == True)
    if tipo:
        q = q.where(QMSProceso.tipo == tipo)
    if estado:
        q = q.where(QMSProceso.estado == estado)
    if padre_id is not None:
        q = q.where(QMSProceso.padre_id == padre_id)
    q = q.order_by(QMSProceso.nombre).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/procesos", response_model=QMSProcesoResponse, status_code=201)
async def crear_proceso(
    data: QMSProcesoCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = QMSProceso(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/procesos/{proceso_id}", response_model=QMSProcesoResponse)
async def obtener_proceso(
    proceso_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSProceso, proceso_id)
    if not item or not item.activo:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")
    return item


@router.put("/procesos/{proceso_id}", response_model=QMSProcesoResponse)
async def actualizar_proceso(
    proceso_id: int,
    data: QMSProcesoUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSProceso, proceso_id)
    if not item or not item.activo:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/procesos/{proceso_id}", status_code=204)
async def eliminar_proceso(
    proceso_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSProceso, proceso_id)
    if not item or not item.activo:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")
    item.activo = False
    await db.commit()


# ===========================================================================
# 3. PROCEDIMIENTOS
# ===========================================================================

@router.get("/procedimientos", response_model=List[QMSProcedimientoResponse])
async def listar_procedimientos(
    proceso_id: Optional[int] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSProcedimiento).where(QMSProcedimiento.deleted_at.is_(None))
    if proceso_id is not None:
        q = q.where(QMSProcedimiento.proceso_id == proceso_id)
    if tipo:
        q = q.where(QMSProcedimiento.tipo == tipo)
    if estado:
        q = q.where(QMSProcedimiento.estado == estado)
    q = q.order_by(QMSProcedimiento.nombre).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/procedimientos", response_model=QMSProcedimientoResponse, status_code=201)
async def crear_procedimiento(
    data: QMSProcedimientoCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = QMSProcedimiento(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/procedimientos/{proc_id}", response_model=QMSProcedimientoResponse)
async def actualizar_procedimiento(
    proc_id: int,
    data: QMSProcedimientoUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSProcedimiento, proc_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Procedimiento no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/procedimientos/{proc_id}", status_code=204)
async def eliminar_procedimiento(
    proc_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSProcedimiento, proc_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Procedimiento no encontrado")
    item.deleted_at = datetime.utcnow()
    await db.commit()


# ===========================================================================
# 4. INDICADORES Y MEDICIONES
# ===========================================================================

@router.get("/indicadores", response_model=List[QMSIndicadorResponse])
async def listar_indicadores(
    proceso_id: Optional[int] = None,
    tipo: Optional[str] = None,
    activo: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSIndicador)
    if proceso_id is not None:
        q = q.where(QMSIndicador.proceso_id == proceso_id)
    if tipo:
        q = q.where(QMSIndicador.tipo == tipo)
    if activo is not None:
        q = q.where(QMSIndicador.activo == activo)
    q = q.order_by(QMSIndicador.nombre).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/indicadores", response_model=QMSIndicadorResponse, status_code=201)
async def crear_indicador(
    data: QMSIndicadorCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = QMSIndicador(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


def _f(v):
    return float(v) if v is not None else None

@router.get("/indicadores/tablero")
async def tablero_indicadores(
    solo_activos: bool = True,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Tablero de KPIs: cada indicador configurado con su última medición,
    cumplimiento vs meta y un histórico corto para el sparkline."""
    q = select(QMSIndicador)
    if solo_activos:
        q = q.where(QMSIndicador.activo == True)
    r = await db.execute(q.order_by(QMSIndicador.nombre))
    out = []
    for ind in r.scalars().all():
        rm = await db.execute(
            select(QMSMedicionIndicador)
            .where(QMSMedicionIndicador.indicador_id == ind.id)
            .order_by(QMSMedicionIndicador.periodo.desc())
            .limit(8)
        )
        meds = rm.scalars().all()
        ultima = meds[0] if meds else None
        out.append({
            "id": ind.id, "codigo": ind.codigo, "nombre": ind.nombre,
            "tipo": ind.tipo, "unidad": ind.unidad, "frecuencia": ind.frecuencia,
            "modulo_origen": ind.modulo_origen, "proceso_id": ind.proceso_id, "activo": ind.activo,
            "meta": _f(ind.meta), "meta_min": _f(ind.meta_min), "meta_max": _f(ind.meta_max),
            "valor_actual": _f(ultima.valor) if ultima else None,
            "periodo_actual": ultima.periodo if ultima else None,
            "cumple": ultima.cumple_meta if ultima else None,
            "variacion_pct": _f(ultima.variacion_pct) if ultima else None,
            "historico": [_f(m.valor) for m in reversed(meds)],
        })
    return out

@router.get("/mediciones", response_model=List[QMSMedicionIndicadorResponse])
async def listar_mediciones(
    indicador_id: Optional[int] = None,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSMedicionIndicador)
    if indicador_id is not None:
        q = q.where(QMSMedicionIndicador.indicador_id == indicador_id)
    q = q.order_by(QMSMedicionIndicador.created_at.desc()).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()

# ─── Fuentes de indicadores de la plataforma (para arrastrar al QMS) ──────────
# `auto`=True: el valor se calcula desde los datos reales del módulo origen.
# `direccion`: 'mayor' → cumple si valor >= meta; 'menor' → cumple si valor <= meta.
PLATFORM_SOURCES: List[dict] = [
    {"key": "MES_OEE",            "nombre": "OEE Global (MES)",                 "modulo": "MES",      "unidad": "%",   "tipo": "operativo",   "meta": 85, "direccion": "mayor", "auto": True},
    {"key": "MES_CUMPLIMIENTO",   "nombre": "Cumplimiento de producción (MES)", "modulo": "MES",      "unidad": "%",   "tipo": "operativo",   "meta": 95, "direccion": "mayor", "auto": True},
    {"key": "MES_SCRAP",          "nombre": "Scrap rate (MES)",                 "modulo": "MES",      "unidad": "%",   "tipo": "operativo",   "meta": 3,  "direccion": "menor", "auto": True},
    {"key": "MES_PARADAS",        "nombre": "Minutos de parada (MES)",          "modulo": "MES",      "unidad": "min", "tipo": "operativo",   "meta": 0,  "direccion": "menor", "auto": True},
    {"key": "TMS_OTIF",           "nombre": "OTIF Transporte (TMS)",            "modulo": "TMS",      "unidad": "%",   "tipo": "operativo",   "meta": 95, "direccion": "mayor", "auto": False},
    {"key": "WMS_EXACTITUD",      "nombre": "Exactitud de inventario (WMS)",    "modulo": "WMS",      "unidad": "%",   "tipo": "operativo",   "meta": 98, "direccion": "mayor", "auto": False},
    {"key": "WMS_RECHAZO",        "nombre": "Índice de rechazo (WMS)",          "modulo": "WMS",      "unidad": "%",   "tipo": "operativo",   "meta": 1,  "direccion": "menor", "auto": False},
    {"key": "CRM_SATISFACCION",   "nombre": "Satisfacción del cliente (CRM)",   "modulo": "CRM",      "unidad": "/5",  "tipo": "tactico",     "meta": 4.5, "direccion": "mayor", "auto": False},
    {"key": "SST_ACCIDENTES",     "nombre": "Accidentes SST",                   "modulo": "SST",      "unidad": "und", "tipo": "estrategico", "meta": 0,  "direccion": "menor", "auto": False},
    {"key": "COMPRAS_PROVEEDORES","nombre": "Proveedores aprobados (Compras)",  "modulo": "Compras",  "unidad": "%",   "tipo": "tactico",     "meta": 90, "direccion": "mayor", "auto": False},
    {"key": "EAM_DISPONIBILIDAD", "nombre": "Disponibilidad de flota (EAM)",    "modulo": "EAM",      "unidad": "%",   "tipo": "operativo",   "meta": 92, "direccion": "mayor", "auto": False},
]
_SOURCE_BY_KEY = {s["key"]: s for s in PLATFORM_SOURCES}


def _cumple(valor: Optional[float], meta: Optional[float], direccion: str) -> Optional[bool]:
    if valor is None or meta is None:
        return None
    return valor <= meta if direccion == "menor" else valor >= meta


def _rango_periodos(desde: str, hasta: str) -> List[str]:
    y1, m1 = int(desde[:4]), int(desde[5:7])
    y2, m2 = int(hasta[:4]), int(hasta[5:7])
    out: List[str] = []
    y, m = y1, m1
    while (y, m) <= (y2, m2) and len(out) < 60:
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            m = 1; y += 1
    return out


async def _serie_fuente(db: AsyncSession, key: str, desde: str, hasta: str) -> Dict[str, float]:
    """Calcula el valor real del indicador por período (YYYY-MM) desde el módulo origen."""
    out: Dict[str, float] = {}
    if key == "MES_OEE":
        per = func.to_char(MESOEERegistro.fecha, "YYYY-MM")
        q = select(per, func.avg(MESOEERegistro.oee)).where(per >= desde, per <= hasta).group_by(per)
        for p, v in (await db.execute(q)).all():
            if v is not None:
                out[p] = round(float(v), 2)
    elif key in ("MES_CUMPLIMIENTO", "MES_SCRAP"):
        per = func.to_char(MESOrdenProduccion.fecha_fin_real, "YYYY-MM")
        q = (select(per, func.sum(MESOrdenProduccion.cantidad_producida), func.sum(MESOrdenProduccion.cantidad_scrap),
                    func.sum(MESOrdenProduccion.cantidad_planificada))
             .where(MESOrdenProduccion.fecha_fin_real.isnot(None), per >= desde, per <= hasta).group_by(per))
        for p, prod, scrap, plan in (await db.execute(q)).all():
            prod = float(prod or 0); scrap = float(scrap or 0); plan = float(plan or 0)
            if key == "MES_CUMPLIMIENTO" and plan > 0:
                out[p] = round(prod / plan * 100, 2)
            elif key == "MES_SCRAP" and (prod + scrap) > 0:
                out[p] = round(scrap / (prod + scrap) * 100, 2)
    elif key == "MES_PARADAS":
        per = func.to_char(MESParada.fecha_inicio, "YYYY-MM")
        q = select(per, func.sum(MESParada.duracion_min)).where(per >= desde, per <= hasta).group_by(per)
        for p, v in (await db.execute(q)).all():
            out[p] = round(float(v or 0), 1)
    return out


@router.get("/fuentes")
async def fuentes_indicadores(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Catálogo de indicadores disponibles en la plataforma para arrastrar al QMS."""
    r = await db.execute(select(QMSIndicador.codigo))
    existentes = {c for (c,) in r.all() if c}
    return [{**s, "importado": s["key"] in existentes} for s in PLATFORM_SOURCES]


class ImportarReq(BaseModel):
    claves: List[str]

@router.post("/indicadores/importar")
async def importar_indicadores(data: ImportarReq, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Da de alta en el QMS los indicadores seleccionados del resto de módulos."""
    creados = 0
    for key in data.claves:
        src = _SOURCE_BY_KEY.get(key)
        if not src:
            continue
        ex = await db.execute(select(QMSIndicador).where(QMSIndicador.codigo == key))
        if ex.scalar_one_or_none():
            continue
        db.add(QMSIndicador(
            codigo=key, nombre=src["nombre"], modulo_origen=src["modulo"], unidad=src["unidad"],
            tipo=src["tipo"], frecuencia="mensual", meta=src["meta"], activo=True,
        ))
        creados += 1
    await db.commit()
    return {"creados": creados}


class SincronizarReq(BaseModel):
    desde: str   # YYYY-MM
    hasta: str

@router.post("/indicadores/sincronizar")
async def sincronizar_indicadores(data: SincronizarReq, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Arrastra (upsert) los valores reales por período de los indicadores automáticos."""
    r = await db.execute(select(QMSIndicador).where(QMSIndicador.codigo.isnot(None)))
    inds = r.scalars().all()
    total, autos = 0, 0
    for ind in inds:
        src = _SOURCE_BY_KEY.get(ind.codigo or "")
        if not src or not src["auto"]:
            continue
        autos += 1
        serie = await _serie_fuente(db, ind.codigo, data.desde, data.hasta)
        meta = float(ind.meta) if ind.meta is not None else None
        for periodo, valor in serie.items():
            ex = await db.execute(
                select(QMSMedicionIndicador).where(
                    QMSMedicionIndicador.indicador_id == ind.id,
                    QMSMedicionIndicador.periodo == periodo,
                )
            )
            m = ex.scalar_one_or_none()
            cumple = _cumple(valor, meta, src["direccion"])
            if m:
                m.valor = valor; m.cumple_meta = cumple
            else:
                db.add(QMSMedicionIndicador(indicador_id=ind.id, periodo=periodo, valor=valor, cumple_meta=cumple))
            total += 1
    await db.commit()
    return {"indicadores_automaticos": autos, "mediciones_sincronizadas": total}


@router.get("/matriz")
async def matriz_cumplimiento(
    desde: str = Query(..., description="YYYY-MM"),
    hasta: str = Query(..., description="YYYY-MM"),
    modulo: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Matriz de cumplimiento indicadores × períodos (auditoría y seguimiento)."""
    periodos = _rango_periodos(desde, hasta)
    q = select(QMSIndicador).where(QMSIndicador.activo == True)
    if modulo:
        q = q.where(QMSIndicador.modulo_origen == modulo)
    r = await db.execute(q.order_by(QMSIndicador.modulo_origen, QMSIndicador.nombre))
    filas = []
    for ind in r.scalars().all():
        rm = await db.execute(
            select(QMSMedicionIndicador).where(
                QMSMedicionIndicador.indicador_id == ind.id,
                QMSMedicionIndicador.periodo >= desde,
                QMSMedicionIndicador.periodo <= hasta,
            )
        )
        med = {m.periodo: m for m in rm.scalars().all()}
        valores = {}
        cumplidos = contados = 0
        for p in periodos:
            m = med.get(p)
            if m:
                valores[p] = {"valor": float(m.valor), "cumple": m.cumple_meta}
                contados += 1
                if m.cumple_meta:
                    cumplidos += 1
            else:
                valores[p] = None
        filas.append({
            "id": ind.id, "codigo": ind.codigo, "nombre": ind.nombre,
            "modulo_origen": ind.modulo_origen, "unidad": ind.unidad,
            "meta": float(ind.meta) if ind.meta is not None else None,
            "auto": _SOURCE_BY_KEY.get(ind.codigo or "", {}).get("auto", False),
            "valores": valores,
            "cumplimiento_pct": round(cumplidos / contados * 100, 1) if contados else None,
        })
    return {"periodos": periodos, "filas": filas}


@router.get("/indicadores/{ind_id}", response_model=QMSIndicadorResponse)
async def obtener_indicador(
    ind_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSIndicador, ind_id)
    if not item:
        raise HTTPException(status_code=404, detail="Indicador no encontrado")
    return item


@router.put("/indicadores/{ind_id}", response_model=QMSIndicadorResponse)
async def actualizar_indicador(
    ind_id: int,
    data: QMSIndicadorUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSIndicador, ind_id)
    if not item:
        raise HTTPException(status_code=404, detail="Indicador no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/indicadores/{ind_id}/mediciones", response_model=List[QMSMedicionIndicadorResponse])
async def listar_mediciones_indicador(
    ind_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = (
        select(QMSMedicionIndicador)
        .where(QMSMedicionIndicador.indicador_id == ind_id)
        .order_by(QMSMedicionIndicador.fecha.desc())
        .offset(skip)
        .limit(limit)
    )
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/mediciones", response_model=QMSMedicionIndicadorResponse, status_code=201)
async def registrar_medicion(
    data: QMSMedicionIndicadorCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = QMSMedicionIndicador(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/metas", response_model=List[QMSMetaIndicadorResponse])
async def listar_metas(
    indicador_id: Optional[int] = None,
    periodo: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSMetaIndicador)
    if indicador_id is not None:
        q = q.where(QMSMetaIndicador.indicador_id == indicador_id)
    if periodo:
        q = q.where(QMSMetaIndicador.periodo == periodo)
    q = q.order_by(QMSMetaIndicador.id.desc()).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/metas", response_model=QMSMetaIndicadorResponse, status_code=201)
async def crear_meta(
    data: QMSMetaIndicadorCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = QMSMetaIndicador(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


# ===========================================================================
# 5. NO CONFORMIDADES
# ===========================================================================

@router.get("/no-conformidades", response_model=List[QMSNoConformidadResponse])
async def listar_no_conformidades(
    estado: Optional[str] = None,
    clasificacion: Optional[str] = None,
    origen: Optional[str] = None,
    proceso_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSNoConformidad).where(QMSNoConformidad.deleted_at.is_(None))
    if estado:
        q = q.where(QMSNoConformidad.estado == estado)
    if clasificacion:
        q = q.where(QMSNoConformidad.clasificacion == clasificacion)
    if origen:
        q = q.where(QMSNoConformidad.origen == origen)
    if proceso_id is not None:
        q = q.where(QMSNoConformidad.proceso_id == proceso_id)
    q = q.order_by(QMSNoConformidad.created_at.desc()).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/no-conformidades", response_model=QMSNoConformidadResponse, status_code=201)
async def crear_no_conformidad(
    data: QMSNoConformidadCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    # Auto-generar código NC-YYYY-NNN
    result = await db.execute(select(func.count(QMSNoConformidad.id)))
    n = (result.scalar() or 0) + 1
    codigo = f"NC-{datetime.now().year}-{n:03d}"

    payload = data.model_dump()
    payload["codigo"] = codigo
    item = QMSNoConformidad(**payload)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/no-conformidades/{nc_id}", response_model=QMSNoConformidadResponse)
async def obtener_no_conformidad(
    nc_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSNoConformidad, nc_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="No conformidad no encontrada")
    return item


@router.put("/no-conformidades/{nc_id}", response_model=QMSNoConformidadResponse)
async def actualizar_no_conformidad(
    nc_id: int,
    data: QMSNoConformidadUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSNoConformidad, nc_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="No conformidad no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/no-conformidades/{nc_id}", status_code=204)
async def eliminar_no_conformidad(
    nc_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSNoConformidad, nc_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="No conformidad no encontrada")
    item.deleted_at = datetime.utcnow()
    await db.commit()


@router.put("/no-conformidades/{nc_id}/cerrar", response_model=QMSNoConformidadResponse)
async def cerrar_no_conformidad(
    nc_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSNoConformidad, nc_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="No conformidad no encontrada")
    if item.estado == "cerrada":
        raise HTTPException(status_code=400, detail="La no conformidad ya está cerrada")
    item.estado = "cerrada"
    item.fecha_cierre = datetime.utcnow()
    if body.get("observaciones_cierre"):
        item.observaciones_cierre = body["observaciones_cierre"]
    await db.commit()
    await db.refresh(item)
    return item


# ===========================================================================
# 6. HALLAZGOS
# ===========================================================================

@router.get("/hallazgos", response_model=List[QMSHallazgoResponse])
async def listar_hallazgos(
    estado: Optional[str] = None,
    tipo: Optional[str] = None,
    auditoria_id: Optional[int] = None,
    proceso_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSHallazgo).where(QMSHallazgo.deleted_at.is_(None))
    if estado:
        q = q.where(QMSHallazgo.estado == estado)
    if tipo:
        q = q.where(QMSHallazgo.tipo == tipo)
    if auditoria_id is not None:
        q = q.where(QMSHallazgo.auditoria_id == auditoria_id)
    if proceso_id is not None:
        q = q.where(QMSHallazgo.proceso_id == proceso_id)
    q = q.order_by(QMSHallazgo.created_at.desc()).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/hallazgos", response_model=QMSHallazgoResponse, status_code=201)
async def crear_hallazgo(
    data: QMSHallazgoCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = QMSHallazgo(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/hallazgos/{hall_id}", response_model=QMSHallazgoResponse)
async def obtener_hallazgo(
    hall_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSHallazgo, hall_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Hallazgo no encontrado")
    return item


@router.put("/hallazgos/{hall_id}", response_model=QMSHallazgoResponse)
async def actualizar_hallazgo(
    hall_id: int,
    data: QMSHallazgoUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSHallazgo, hall_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Hallazgo no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/hallazgos/{hall_id}", status_code=204)
async def eliminar_hallazgo(
    hall_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSHallazgo, hall_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Hallazgo no encontrado")
    item.deleted_at = datetime.utcnow()
    await db.commit()


# ===========================================================================
# 7. AUDITORIAS
# ===========================================================================

@router.get("/auditorias", response_model=List[QMSAuditoriaResponse])
async def listar_auditorias(
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSAuditoria).where(QMSAuditoria.deleted_at.is_(None))
    if tipo:
        q = q.where(QMSAuditoria.tipo == tipo)
    if estado:
        q = q.where(QMSAuditoria.estado == estado)
    q = q.order_by(QMSAuditoria.created_at.desc()).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/auditorias", response_model=QMSAuditoriaResponse, status_code=201)
async def crear_auditoria(
    data: QMSAuditoriaCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    # Auto-generar código AUD-YYYY-NNN
    result = await db.execute(select(func.count(QMSAuditoria.id)))
    n = (result.scalar() or 0) + 1
    codigo = f"AUD-{datetime.now().year}-{n:03d}"

    payload = data.model_dump()
    payload["codigo"] = codigo
    item = QMSAuditoria(**payload)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/auditorias/{aud_id}", response_model=QMSAuditoriaResponse)
async def obtener_auditoria(
    aud_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSAuditoria, aud_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")
    return item


@router.put("/auditorias/{aud_id}", response_model=QMSAuditoriaResponse)
async def actualizar_auditoria(
    aud_id: int,
    data: QMSAuditoriaUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSAuditoria, aud_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/auditorias/{aud_id}", status_code=204)
async def eliminar_auditoria(
    aud_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSAuditoria, aud_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")
    item.deleted_at = datetime.utcnow()
    await db.commit()


@router.post("/auditorias/{aud_id}/hallazgos", response_model=QMSAuditoriaHallazgoResponse, status_code=201)
async def agregar_hallazgo_auditoria(
    aud_id: int,
    data: QMSAuditoriaHallazgoCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    aud = await db.get(QMSAuditoria, aud_id)
    if not aud or aud.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")
    payload = data.model_dump()
    payload["auditoria_id"] = aud_id
    item = QMSAuditoriaHallazgo(**payload)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


# ===========================================================================
# 8. CAPA (Acción Correctiva / Preventiva / de Mejora)
# ===========================================================================

@router.get("/capas", response_model=List[QMSCAPAResponse])
async def listar_capas(
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    nc_id: Optional[int] = None,
    proceso_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSCAPA).where(QMSCAPA.deleted_at.is_(None))
    if tipo:
        q = q.where(QMSCAPA.tipo == tipo)
    if estado:
        q = q.where(QMSCAPA.estado == estado)
    if nc_id is not None:
        q = q.where(QMSCAPA.nc_id == nc_id)
    if proceso_id is not None:
        q = q.where(QMSCAPA.proceso_id == proceso_id)
    q = q.order_by(QMSCAPA.created_at.desc()).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/capas", response_model=QMSCAPAResponse, status_code=201)
async def crear_capa(
    data: QMSCAPACreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    # Auto-generar código CAPA-YYYY-NNN
    result = await db.execute(select(func.count(QMSCAPA.id)))
    n = (result.scalar() or 0) + 1
    codigo = f"CAPA-{datetime.now().year}-{n:03d}"

    payload = data.model_dump()
    payload["codigo"] = codigo
    item = QMSCAPA(**payload)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/capas/{capa_id}", response_model=QMSCAPAResponse)
async def obtener_capa(
    capa_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSCAPA, capa_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="CAPA no encontrada")
    return item


@router.put("/capas/{capa_id}", response_model=QMSCAPAResponse)
async def actualizar_capa(
    capa_id: int,
    data: QMSCAPAUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSCAPA, capa_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="CAPA no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/capas/{capa_id}", status_code=204)
async def eliminar_capa(
    capa_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSCAPA, capa_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="CAPA no encontrada")
    item.deleted_at = datetime.utcnow()
    await db.commit()


@router.get("/capas/{capa_id}/tareas", response_model=List[QMSCAPATareaResponse])
async def listar_tareas_capa(
    capa_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = (
        select(QMSCAPATarea)
        .where(QMSCAPATarea.capa_id == capa_id)
        .order_by(QMSCAPATarea.orden)
    )
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/capas/{capa_id}/tareas", response_model=QMSCAPATareaResponse, status_code=201)
async def agregar_tarea_capa(
    capa_id: int,
    data: QMSCAPATareaCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    capa = await db.get(QMSCAPA, capa_id)
    if not capa or capa.deleted_at is not None:
        raise HTTPException(status_code=404, detail="CAPA no encontrada")
    payload = data.model_dump()
    payload["capa_id"] = capa_id
    item = QMSCAPATarea(**payload)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/capa-tareas/{tarea_id}", response_model=QMSCAPATareaResponse)
async def actualizar_tarea_capa(
    tarea_id: int,
    data: QMSCAPATareaUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSCAPATarea, tarea_id)
    if not item:
        raise HTTPException(status_code=404, detail="Tarea CAPA no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


# ===========================================================================
# 9. RIESGOS
# ===========================================================================

@router.get("/riesgos", response_model=List[QMSRiesgoResponse])
async def listar_riesgos(
    prioridad: Optional[str] = None,
    estado: Optional[str] = None,
    proceso_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSRiesgo).where(QMSRiesgo.deleted_at.is_(None))
    if prioridad:
        q = q.where(QMSRiesgo.prioridad == prioridad)
    if estado:
        q = q.where(QMSRiesgo.estado == estado)
    if proceso_id is not None:
        q = q.where(QMSRiesgo.proceso_id == proceso_id)
    q = q.order_by(QMSRiesgo.nivel_riesgo.desc()).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/riesgos", response_model=QMSRiesgoResponse, status_code=201)
async def crear_riesgo(
    data: QMSRiesgoCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    payload = data.model_dump()
    # Auto-calcular nivel_riesgo y prioridad
    nivel = payload.get("probabilidad", 1) * payload.get("impacto", 1)
    payload["nivel_riesgo"] = nivel
    payload["prioridad"] = _calcular_prioridad_riesgo(nivel)
    item = QMSRiesgo(**payload)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/riesgos/{riesgo_id}", response_model=QMSRiesgoResponse)
async def obtener_riesgo(
    riesgo_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSRiesgo, riesgo_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Riesgo no encontrado")
    return item


@router.put("/riesgos/{riesgo_id}", response_model=QMSRiesgoResponse)
async def actualizar_riesgo(
    riesgo_id: int,
    data: QMSRiesgoUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSRiesgo, riesgo_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Riesgo no encontrado")
    payload = data.model_dump(exclude_unset=True)
    # Recalcular nivel y prioridad si cambian probabilidad o impacto
    prob = payload.get("probabilidad", item.probabilidad)
    imp = payload.get("impacto", item.impacto)
    if "probabilidad" in payload or "impacto" in payload:
        nivel = prob * imp
        payload["nivel_riesgo"] = nivel
        payload["prioridad"] = _calcular_prioridad_riesgo(nivel)
    for k, v in payload.items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/riesgos/{riesgo_id}", status_code=204)
async def eliminar_riesgo(
    riesgo_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSRiesgo, riesgo_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Riesgo no encontrado")
    item.deleted_at = datetime.utcnow()
    await db.commit()


# ===========================================================================
# 10. QUEJAS Y RECLAMOS
# ===========================================================================

@router.get("/quejas", response_model=List[QMSQuejaResponse])
async def listar_quejas(
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    origen: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSQueja).where(QMSQueja.deleted_at.is_(None))
    if tipo:
        q = q.where(QMSQueja.tipo == tipo)
    if estado:
        q = q.where(QMSQueja.estado == estado)
    if origen:
        q = q.where(QMSQueja.origen == origen)
    q = q.order_by(QMSQueja.created_at.desc()).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/quejas", response_model=QMSQuejaResponse, status_code=201)
async def crear_queja(
    data: QMSQuejaCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    # Auto-generar código QRE-YYYY-NNN
    result = await db.execute(select(func.count(QMSQueja.id)))
    n = (result.scalar() or 0) + 1
    codigo = f"QRE-{datetime.now().year}-{n:03d}"

    payload = data.model_dump()
    payload["codigo"] = codigo
    item = QMSQueja(**payload)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/quejas/{queja_id}", response_model=QMSQuejaResponse)
async def obtener_queja(
    queja_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSQueja, queja_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Queja no encontrada")
    return item


@router.put("/quejas/{queja_id}", response_model=QMSQuejaResponse)
async def actualizar_queja(
    queja_id: int,
    data: QMSQuejaUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSQueja, queja_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Queja no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/quejas/{queja_id}", status_code=204)
async def eliminar_queja(
    queja_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSQueja, queja_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Queja no encontrada")
    item.deleted_at = datetime.utcnow()
    await db.commit()


# ===========================================================================
# 11. EVALUACION DE PROVEEDORES
# ===========================================================================

@router.get("/evaluaciones-proveedores", response_model=List[QMSEvaluacionProveedorResponse])
async def listar_evaluaciones_proveedores(
    proveedor_nit: Optional[str] = None,
    periodo: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSEvaluacionProveedor)
    if proveedor_nit:
        q = q.where(QMSEvaluacionProveedor.proveedor_nit == proveedor_nit)
    if periodo:
        q = q.where(QMSEvaluacionProveedor.periodo == periodo)
    q = q.order_by(QMSEvaluacionProveedor.created_at.desc()).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/evaluaciones-proveedores", response_model=QMSEvaluacionProveedorResponse, status_code=201)
async def crear_evaluacion_proveedor(
    data: QMSEvaluacionProveedorCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    payload = data.model_dump()
    # Auto-calcular puntaje_total promedio de 4 criterios
    calidad = payload.get("calidad", 0) or 0
    cumplimiento = payload.get("cumplimiento", 0) or 0
    servicio = payload.get("servicio", 0) or 0
    tiempos = payload.get("tiempos", 0) or 0
    puntaje_total = (calidad + cumplimiento + servicio + tiempos) / 4
    payload["puntaje_total"] = round(puntaje_total, 2)
    payload["clasificacion"] = _calcular_clasificacion_proveedor(puntaje_total)
    item = QMSEvaluacionProveedor(**payload)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/evaluaciones-proveedores/{eval_id}", response_model=QMSEvaluacionProveedorResponse)
async def actualizar_evaluacion_proveedor(
    eval_id: int,
    data: QMSEvaluacionProveedorUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSEvaluacionProveedor, eval_id)
    if not item:
        raise HTTPException(status_code=404, detail="Evaluación de proveedor no encontrada")
    payload = data.model_dump(exclude_unset=True)
    # Recalcular puntaje si se actualizan criterios
    criterios = {"calidad", "cumplimiento", "servicio", "tiempos"}
    if criterios.intersection(payload.keys()):
        cal = payload.get("calidad", item.calidad) or 0
        cum = payload.get("cumplimiento", item.cumplimiento) or 0
        ser = payload.get("servicio", item.servicio) or 0
        tie = payload.get("tiempos", item.tiempos) or 0
        puntaje_total = (cal + cum + ser + tie) / 4
        payload["puntaje_total"] = round(puntaje_total, 2)
        payload["clasificacion"] = _calcular_clasificacion_proveedor(puntaje_total)
    for k, v in payload.items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/evaluaciones-proveedores/resumen")
async def resumen_evaluaciones_proveedores(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Resumen por proveedor con su última clasificación y puntaje."""
    # Subconsulta: última evaluación por proveedor_nit
    subq = (
        select(
            QMSEvaluacionProveedor.proveedor_nit,
            func.max(QMSEvaluacionProveedor.id).label("last_id"),
        )
        .group_by(QMSEvaluacionProveedor.proveedor_nit)
        .subquery()
    )
    stmt = select(QMSEvaluacionProveedor).join(
        subq,
        and_(
            QMSEvaluacionProveedor.proveedor_nit == subq.c.proveedor_nit,
            QMSEvaluacionProveedor.id == subq.c.last_id,
        ),
    )
    r = await db.execute(stmt)
    items = r.scalars().all()
    return [
        {
            "proveedor_nit": e.proveedor_nit,
            "ultima_clasificacion": e.clasificacion,
            "ultimo_puntaje": e.puntaje_total,
            "ultimo_periodo": e.periodo,
        }
        for e in items
    ]


# ===========================================================================
# 12. CAMBIOS
# ===========================================================================

@router.get("/cambios", response_model=List[QMSCambioResponse])
async def listar_cambios(
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    proceso_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSCambio).where(QMSCambio.deleted_at.is_(None))
    if tipo:
        q = q.where(QMSCambio.tipo == tipo)
    if estado:
        q = q.where(QMSCambio.estado == estado)
    if proceso_id is not None:
        q = q.where(QMSCambio.proceso_id == proceso_id)
    q = q.order_by(QMSCambio.created_at.desc()).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/cambios", response_model=QMSCambioResponse, status_code=201)
async def crear_cambio(
    data: QMSCambioCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    # Auto-generar código CHG-YYYY-NNN
    result = await db.execute(select(func.count(QMSCambio.id)))
    n = (result.scalar() or 0) + 1
    codigo = f"CHG-{datetime.now().year}-{n:03d}"

    payload = data.model_dump()
    payload["codigo"] = codigo
    item = QMSCambio(**payload)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/cambios/{cambio_id}", response_model=QMSCambioResponse)
async def obtener_cambio(
    cambio_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSCambio, cambio_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Cambio no encontrado")
    return item


@router.put("/cambios/{cambio_id}", response_model=QMSCambioResponse)
async def actualizar_cambio(
    cambio_id: int,
    data: QMSCambioUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSCambio, cambio_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Cambio no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/cambios/{cambio_id}", status_code=204)
async def eliminar_cambio(
    cambio_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSCambio, cambio_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Cambio no encontrado")
    item.deleted_at = datetime.utcnow()
    await db.commit()


# ===========================================================================
# 13. MEJORA CONTINUA
# ===========================================================================

@router.get("/mejoras", response_model=List[QMSMejoraResponse])
async def listar_mejoras(
    estado: Optional[str] = None,
    proceso_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSMejora).where(QMSMejora.deleted_at.is_(None))
    if estado:
        q = q.where(QMSMejora.estado == estado)
    if proceso_id is not None:
        q = q.where(QMSMejora.proceso_id == proceso_id)
    q = q.order_by(QMSMejora.created_at.desc()).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/mejoras", response_model=QMSMejoraResponse, status_code=201)
async def crear_mejora(
    data: QMSMejoraCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    # Auto-generar código MJR-YYYY-NNN
    result = await db.execute(select(func.count(QMSMejora.id)))
    n = (result.scalar() or 0) + 1
    codigo = f"MJR-{datetime.now().year}-{n:03d}"

    payload = data.model_dump()
    payload["codigo"] = codigo
    item = QMSMejora(**payload)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/mejoras/{mejora_id}", response_model=QMSMejoraResponse)
async def obtener_mejora(
    mejora_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSMejora, mejora_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Mejora no encontrada")
    return item


@router.put("/mejoras/{mejora_id}", response_model=QMSMejoraResponse)
async def actualizar_mejora(
    mejora_id: int,
    data: QMSMejoraUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSMejora, mejora_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Mejora no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/mejoras/{mejora_id}", status_code=204)
async def eliminar_mejora(
    mejora_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSMejora, mejora_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Mejora no encontrada")
    item.deleted_at = datetime.utcnow()
    await db.commit()


# ===========================================================================
# 14. ENCUESTAS
# ===========================================================================

@router.get("/encuestas", response_model=List[QMSEncuestaResponse])
async def listar_encuestas(
    tipo: Optional[str] = None,
    activa: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSEncuesta).where(QMSEncuesta.deleted_at.is_(None))
    if tipo:
        q = q.where(QMSEncuesta.tipo == tipo)
    if activa is not None:
        q = q.where(QMSEncuesta.activa == activa)
    q = q.order_by(QMSEncuesta.created_at.desc()).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/encuestas", response_model=QMSEncuestaResponse, status_code=201)
async def crear_encuesta(
    data: QMSEncuestaCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = QMSEncuesta(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/encuestas/{enc_id}", response_model=QMSEncuestaResponse)
async def obtener_encuesta(
    enc_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSEncuesta, enc_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
    return item


@router.put("/encuestas/{enc_id}", response_model=QMSEncuestaResponse)
async def actualizar_encuesta(
    enc_id: int,
    data: QMSEncuestaUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSEncuesta, enc_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/encuestas/{enc_id}/respuestas", response_model=QMSEncuestaRespuestaResponse, status_code=201)
async def registrar_respuesta_encuesta(
    enc_id: int,
    data: QMSEncuestaRespuestaCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    enc = await db.get(QMSEncuesta, enc_id)
    if not enc or enc.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
    if not enc.activa:
        raise HTTPException(status_code=400, detail="La encuesta no está activa")
    payload = data.model_dump()
    payload["encuesta_id"] = enc_id
    item = QMSEncuestaRespuesta(**payload)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/encuestas/{enc_id}/respuestas", response_model=List[QMSEncuestaRespuestaResponse])
async def listar_respuestas_encuesta(
    enc_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = (
        select(QMSEncuestaRespuesta)
        .where(QMSEncuestaRespuesta.encuesta_id == enc_id)
        .order_by(QMSEncuestaRespuesta.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    r = await db.execute(q)
    return r.scalars().all()


# ===========================================================================
# 15. COMPETENCIAS POR PROCESO
# ===========================================================================

@router.get("/competencias-proceso", response_model=List[QMSCompetenciaProcesoResponse])
async def listar_competencias_proceso(
    proceso_id: Optional[int] = None,
    cargo: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSCompetenciaProceso)
    if proceso_id is not None:
        q = q.where(QMSCompetenciaProceso.proceso_id == proceso_id)
    if cargo:
        q = q.where(QMSCompetenciaProceso.cargo == cargo)
    q = q.order_by(QMSCompetenciaProceso.id).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/competencias-proceso", response_model=QMSCompetenciaProcesoResponse, status_code=201)
async def crear_competencia_proceso(
    data: QMSCompetenciaProcesoCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = QMSCompetenciaProceso(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/competencias-proceso/{comp_id}", status_code=204)
async def eliminar_competencia_proceso(
    comp_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    item = await db.get(QMSCompetenciaProceso, comp_id)
    if not item:
        raise HTTPException(status_code=404, detail="Competencia de proceso no encontrada")
    await db.delete(item)
    await db.commit()


# ===========================================================================
# 16. KPI DIARIO
# ===========================================================================

@router.get("/kpi-diario", response_model=List[QMSKPIDiarioResponse])
async def listar_kpi_diario(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    q = select(QMSKPIDiario)
    if fecha_inicio:
        q = q.where(QMSKPIDiario.fecha >= fecha_inicio)
    if fecha_fin:
        q = q.where(QMSKPIDiario.fecha <= fecha_fin)
    q = q.order_by(QMSKPIDiario.fecha.desc()).offset(skip).limit(limit)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/kpi-diario/calcular", response_model=QMSKPIDiarioResponse, status_code=201)
async def calcular_kpi_diario(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Calcula y guarda el KPI del día actual basado en datos reales de BD."""
    hoy = date.today()

    # Verificar si ya existe KPI para hoy
    existing = await db.execute(
        select(QMSKPIDiario).where(QMSKPIDiario.fecha == hoy)
    )
    kpi_existente = existing.scalar_one_or_none()

    # NC abiertas
    r = await db.execute(
        select(func.count(QMSNoConformidad.id)).where(
            and_(
                QMSNoConformidad.deleted_at.is_(None),
                QMSNoConformidad.estado != "cerrada",
            )
        )
    )
    nc_abiertas = r.scalar() or 0

    # NC cerradas hoy
    r = await db.execute(
        select(func.count(QMSNoConformidad.id)).where(
            and_(
                QMSNoConformidad.deleted_at.is_(None),
                QMSNoConformidad.estado == "cerrada",
                func.date(QMSNoConformidad.fecha_cierre) == hoy,
            )
        )
    )
    nc_cerradas_hoy = r.scalar() or 0

    # CAPA abiertas
    r = await db.execute(
        select(func.count(QMSCAPA.id)).where(
            and_(
                QMSCAPA.deleted_at.is_(None),
                QMSCAPA.estado != "cerrada",
            )
        )
    )
    capa_abiertas = r.scalar() or 0

    # Riesgos activos totales
    r = await db.execute(
        select(func.count(QMSRiesgo.id)).where(
            and_(
                QMSRiesgo.deleted_at.is_(None),
                QMSRiesgo.estado == "activo",
            )
        )
    )
    riesgos_activos = r.scalar() or 0

    # Quejas abiertas
    r = await db.execute(
        select(func.count(QMSQueja.id)).where(
            and_(
                QMSQueja.deleted_at.is_(None),
                QMSQueja.estado != "cerrada",
            )
        )
    )
    quejas_abiertas = r.scalar() or 0

    # Indice calidad del día
    indice_calidad = round(max(0.0, 100.0 - (nc_abiertas * 2) - (riesgos_activos * 0.5)), 2)

    datos_kpi = {
        "fecha": hoy,
        "nc_abiertas": nc_abiertas,
        "nc_cerradas_hoy": nc_cerradas_hoy,
        "capa_abiertas": capa_abiertas,
        "riesgos_activos": riesgos_activos,
        "quejas_abiertas": quejas_abiertas,
        "indice_calidad": indice_calidad,
    }

    if kpi_existente:
        # Actualizar el existente
        for k, v in datos_kpi.items():
            setattr(kpi_existente, k, v)
        await db.commit()
        await db.refresh(kpi_existente)
        return kpi_existente
    else:
        item = QMSKPIDiario(**datos_kpi)
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item
