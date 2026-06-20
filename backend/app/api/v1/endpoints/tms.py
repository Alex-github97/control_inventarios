"""
API endpoints — TMS (Transportation Management System)
Prefijo: /tms
"""
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, or_, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.tms import (
    TMSZona, TMSTipoServicio, TMSVehiculo, TMSViaje, TMSParada,
    TMSEvento, TMSDocumento, TMSPOD, TMSRuta, TMSPuntoRuta,
    TMSCostoViaje, TMSLiquidacion, TMSOTIFRegistro, TMSAlerta, TMSKPIDiario,
    EstadoVehiculoTMSEnum, EstadoViajeTMSEnum, EstadoLiquidacionTMSEnum,
    NivelAlertaTMSEnum, TipoEventoTMSEnum,
)
from app.application.schemas.tms import (
    TMSZonaCreate, TMSZonaUpdate, TMSZonaResponse,
    TMSTipoServicioCreate, TMSTipoServicioUpdate, TMSTipoServicioResponse,
    TMSVehiculoCreate, TMSVehiculoUpdate, TMSVehiculoResponse,
    TMSViajeCreate, TMSViajeUpdate, TMSViajeResponse, TMSViajeListResponse,
    TMSParadaCreate, TMSParadaUpdate, TMSParadaResponse,
    TMSEventoCreate, TMSEventoResponse,
    TMSDocumentoCreate, TMSDocumentoUpdate, TMSDocumentoResponse,
    TMSPODCreate, TMSPODResponse,
    TMSRutaCreate, TMSRutaUpdate, TMSRutaResponse,
    TMSPuntoRutaCreate, TMSPuntoRutaResponse,
    TMSCostoViajeCreate, TMSCostoViajeUpdate, TMSCostoViajeResponse,
    TMSLiquidacionCreate, TMSLiquidacionUpdate, TMSLiquidacionResponse,
    TMSOTIFRegistroCreate, TMSOTIFRegistroResponse,
    TMSAlertaCreate, TMSAlertaResponse,
    TMSDashboardKPIs,
)

router = APIRouter(prefix="/tms", tags=["tms"])


# ─── Utilidades internas ───────────────────────────────────────────────────────

def _calcular_costos(
    combustible: float,
    peajes: float,
    viaticos: float,
    horas_extras: float,
    mantenimiento: float,
    costos_indirectos: float,
    valor_flete_cobrado: float,
    distancia_km: Optional[float],
    num_entregas: Optional[int],
) -> dict:
    costo_total = combustible + peajes + viaticos + horas_extras + mantenimiento + costos_indirectos
    margen = valor_flete_cobrado - costo_total
    costo_por_km = costo_total / distancia_km if distancia_km and distancia_km > 0 else 0.0
    costo_por_entrega = costo_total / num_entregas if num_entregas and num_entregas > 0 else 0.0
    return {
        "costo_total": costo_total,
        "margen": margen,
        "costo_por_km": costo_por_km,
        "costo_por_entrega": costo_por_entrega,
    }


async def _viaje_to_response(db: AsyncSession, viaje: TMSViaje) -> TMSViajeResponse:
    """Construye TMSViajeResponse con campos calculados (placa, conductor)."""
    vehiculo_placa = None
    if viaje.vehiculo_id:
        veh = await db.get(TMSVehiculo, viaje.vehiculo_id)
        if veh:
            vehiculo_placa = veh.placa

    conductor_nombre = None
    if viaje.conductor_hcm_id:
        try:
            from app.infrastructure.models.hcm import HCMConductor
            cond = await db.get(HCMConductor, viaje.conductor_hcm_id)
            if cond:
                conductor_nombre = getattr(cond, "nombre_completo", None) or getattr(cond, "nombre", None)
        except Exception:
            pass
    if not conductor_nombre and viaje.conductor_legacy_id:
        try:
            from app.infrastructure.models.conductor import Conductor
            cond = await db.get(Conductor, viaje.conductor_legacy_id)
            if cond:
                conductor_nombre = getattr(cond, "nombre_completo", None) or getattr(cond, "nombre", None)
        except Exception:
            pass

    generador_nombre = None

    return TMSViajeResponse(
        id=viaje.id,
        codigo=viaje.codigo,
        tipo_servicio=viaje.tipo_servicio,
        estado=viaje.estado,
        vehiculo_id=viaje.vehiculo_id,
        vehiculo_placa=vehiculo_placa,
        conductor_hcm_id=viaje.conductor_hcm_id,
        conductor_nombre=conductor_nombre,
        conductor_legacy_id=viaje.conductor_legacy_id,
        empresa_id=viaje.empresa_id,
        generador_id=viaje.generador_id,
        generador_nombre=generador_nombre,
        flete_id=viaje.flete_id,
        wms_despacho_id=viaje.wms_despacho_id,
        origen_ciudad=viaje.origen_ciudad,
        destino_ciudad=viaje.destino_ciudad,
        fecha_programada_cargue=viaje.fecha_programada_cargue,
        fecha_real_cargue=viaje.fecha_real_cargue,
        fecha_programada_entrega=viaje.fecha_programada_entrega,
        fecha_real_entrega=viaje.fecha_real_entrega,
        distancia_km=viaje.distancia_km,
        peso_kg=viaje.peso_kg,
        num_entregas=viaje.num_entregas,
        valor_flete=viaje.valor_flete,
        otif_on_time=viaje.otif_on_time,
        otif_in_full=viaje.otif_in_full,
        notas=viaje.notas,
        created_at=viaje.created_at,
    )


# ─── DASHBOARD — KPIs ─────────────────────────────────────────────────────────

@router.get("/dashboard/kpis", response_model=TMSDashboardKPIs)
async def dashboard_kpis(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    hoy = date.today()
    inicio_mes = datetime(hoy.year, hoy.month, 1)

    # viajes_hoy
    r = await db.execute(
        select(func.count(TMSViaje.id)).where(
            TMSViaje.deleted_at.is_(None),
            func.date(TMSViaje.fecha_programada_cargue) == hoy,
        )
    )
    viajes_hoy = r.scalar() or 0

    # viajes_en_transito
    r = await db.execute(
        select(func.count(TMSViaje.id)).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.estado == EstadoViajeTMSEnum.EN_TRANSITO,
        )
    )
    viajes_en_transito = r.scalar() or 0

    # viajes_completados_hoy
    r = await db.execute(
        select(func.count(TMSViaje.id)).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.estado == EstadoViajeTMSEnum.ENTREGADO,
            func.date(TMSViaje.fecha_real_entrega) == hoy,
        )
    )
    viajes_completados_hoy = r.scalar() or 0

    # viajes_programados
    r = await db.execute(
        select(func.count(TMSViaje.id)).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.estado == EstadoViajeTMSEnum.PROGRAMADO,
        )
    )
    viajes_programados = r.scalar() or 0

    # vehiculos_activos (EN_VIAJE)
    r = await db.execute(
        select(func.count(TMSVehiculo.id)).where(
            TMSVehiculo.deleted_at.is_(None),
            TMSVehiculo.estado_operativo == EstadoVehiculoTMSEnum.EN_VIAJE,
        )
    )
    vehiculos_activos = r.scalar() or 0

    # vehiculos_disponibles
    r = await db.execute(
        select(func.count(TMSVehiculo.id)).where(
            TMSVehiculo.deleted_at.is_(None),
            TMSVehiculo.estado_operativo == EstadoVehiculoTMSEnum.DISPONIBLE,
        )
    )
    vehiculos_disponibles = r.scalar() or 0

    # conductores_activos (distinct conductor_hcm_id en viajes EN_TRANSITO)
    r = await db.execute(
        select(func.count(func.distinct(TMSViaje.conductor_hcm_id))).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.estado == EstadoViajeTMSEnum.EN_TRANSITO,
            TMSViaje.conductor_hcm_id.isnot(None),
        )
    )
    conductores_hcm = r.scalar() or 0

    r2 = await db.execute(
        select(func.count(func.distinct(TMSViaje.conductor_legacy_id))).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.estado == EstadoViajeTMSEnum.EN_TRANSITO,
            TMSViaje.conductor_legacy_id.isnot(None),
            TMSViaje.conductor_hcm_id.is_(None),
        )
    )
    conductores_legacy = r2.scalar() or 0
    conductores_activos = conductores_hcm + conductores_legacy

    # OTIF del mes (viajes ENTREGADOS este mes)
    r = await db.execute(
        select(
            func.count(TMSViaje.id),
            func.sum(
                func.cast(
                    and_(
                        TMSViaje.otif_on_time == True,
                        TMSViaje.otif_in_full == True,
                    ),
                    type_=None,
                )
            ),
            func.sum(func.cast(TMSViaje.otif_on_time == True, type_=None)),
            func.sum(func.cast(TMSViaje.otif_in_full == True, type_=None)),
        ).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.estado == EstadoViajeTMSEnum.ENTREGADO,
            TMSViaje.fecha_real_entrega >= inicio_mes,
        )
    )
    row = r.one()
    total_entregados_mes = row[0] or 0
    otif_count = int(row[1] or 0)
    on_time_count = int(row[2] or 0)
    in_full_count = int(row[3] or 0)

    otif_rate = round(otif_count / total_entregados_mes * 100, 2) if total_entregados_mes else 0.0
    on_time_rate = round(on_time_count / total_entregados_mes * 100, 2) if total_entregados_mes else 0.0
    in_full_rate = round(in_full_count / total_entregados_mes * 100, 2) if total_entregados_mes else 0.0

    # costo_promedio_km
    r = await db.execute(select(func.avg(TMSCostoViaje.costo_por_km)))
    costo_promedio_km = float(r.scalar() or 0.0)

    # km_recorridos_mes
    r = await db.execute(
        select(func.sum(TMSViaje.distancia_km)).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.estado == EstadoViajeTMSEnum.ENTREGADO,
            TMSViaje.fecha_real_entrega >= inicio_mes,
        )
    )
    km_recorridos_mes = float(r.scalar() or 0.0)

    # alertas_criticas (CRITICA y no leída)
    r = await db.execute(
        select(func.count(TMSAlerta.id)).where(
            TMSAlerta.nivel == NivelAlertaTMSEnum.CRITICA,
            TMSAlerta.leida == False,
        )
    )
    alertas_criticas = r.scalar() or 0

    # alertas_activas (no leída)
    r = await db.execute(
        select(func.count(TMSAlerta.id)).where(TMSAlerta.leida == False)
    )
    alertas_activas = r.scalar() or 0

    return TMSDashboardKPIs(
        viajes_hoy=viajes_hoy,
        viajes_en_transito=viajes_en_transito,
        viajes_completados_hoy=viajes_completados_hoy,
        viajes_programados=viajes_programados,
        vehiculos_activos=vehiculos_activos,
        vehiculos_disponibles=vehiculos_disponibles,
        conductores_activos=conductores_activos,
        otif_rate=otif_rate,
        on_time_rate=on_time_rate,
        in_full_rate=in_full_rate,
        costo_promedio_km=costo_promedio_km,
        km_recorridos_mes=km_recorridos_mes,
        alertas_criticas=alertas_criticas,
        alertas_activas=alertas_activas,
    )


# ─── ALERTAS ──────────────────────────────────────────────────────────────────

@router.get("/alertas", response_model=List[TMSAlertaResponse])
async def listar_alertas(
    leida: Optional[bool] = None,
    nivel: Optional[str] = None,
    viaje_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(TMSAlerta)
    if leida is not None:
        q = q.where(TMSAlerta.leida == leida)
    if nivel:
        q = q.where(TMSAlerta.nivel == nivel)
    if viaje_id:
        q = q.where(TMSAlerta.viaje_id == viaje_id)
    q = q.order_by(TMSAlerta.fecha_alerta.desc()).limit(50)
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/alertas", response_model=TMSAlertaResponse, status_code=201)
async def crear_alerta(
    data: TMSAlertaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    alerta = TMSAlerta(**data.model_dump())
    db.add(alerta)
    await db.commit()
    await db.refresh(alerta)
    return alerta


@router.put("/alertas/{alerta_id}/leer")
async def marcar_alerta_leida(
    alerta_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    alerta = await db.get(TMSAlerta, alerta_id)
    if not alerta:
        raise HTTPException(404, "Alerta no encontrada")
    alerta.leida = True
    await db.commit()
    return {"mensaje": "Alerta marcada como leída"}


# ─── CONFIG — Zonas ───────────────────────────────────────────────────────────

@router.get("/config/zonas", response_model=List[TMSZonaResponse])
async def listar_zonas(
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(TMSZona)
    if activo is not None:
        q = q.where(TMSZona.activo == activo)
    r = await db.execute(q.order_by(TMSZona.nombre))
    return r.scalars().all()


@router.post("/config/zonas", response_model=TMSZonaResponse, status_code=201)
async def crear_zona(
    data: TMSZonaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    zona = TMSZona(**data.model_dump())
    db.add(zona)
    await db.commit()
    await db.refresh(zona)
    return zona


@router.put("/config/zonas/{zona_id}", response_model=TMSZonaResponse)
async def actualizar_zona(
    zona_id: int,
    data: TMSZonaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    zona = await db.get(TMSZona, zona_id)
    if not zona:
        raise HTTPException(404, "Zona no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(zona, k, v)
    await db.commit()
    await db.refresh(zona)
    return zona


@router.delete("/config/zonas/{zona_id}", status_code=204)
async def eliminar_zona(
    zona_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    zona = await db.get(TMSZona, zona_id)
    if not zona:
        raise HTTPException(404, "Zona no encontrada")
    await db.delete(zona)
    await db.commit()


# ─── CONFIG — Tipos de Servicio ───────────────────────────────────────────────

@router.get("/config/tipos-servicio", response_model=List[TMSTipoServicioResponse])
async def listar_tipos_servicio(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    r = await db.execute(select(TMSTipoServicio).order_by(TMSTipoServicio.nombre))
    return r.scalars().all()


@router.post("/config/tipos-servicio", response_model=TMSTipoServicioResponse, status_code=201)
async def crear_tipo_servicio(
    data: TMSTipoServicioCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ts = TMSTipoServicio(**data.model_dump())
    db.add(ts)
    await db.commit()
    await db.refresh(ts)
    return ts


@router.put("/config/tipos-servicio/{ts_id}", response_model=TMSTipoServicioResponse)
async def actualizar_tipo_servicio(
    ts_id: int,
    data: TMSTipoServicioUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ts = await db.get(TMSTipoServicio, ts_id)
    if not ts:
        raise HTTPException(404, "Tipo de servicio no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(ts, k, v)
    await db.commit()
    await db.refresh(ts)
    return ts


# ─── VEHÍCULOS ────────────────────────────────────────────────────────────────

@router.get("/vehiculos", response_model=List[TMSVehiculoResponse])
async def listar_vehiculos(
    estado_operativo: Optional[str] = None,
    tipo_vehiculo: Optional[str] = None,
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(TMSVehiculo).where(TMSVehiculo.deleted_at.is_(None))
    if estado_operativo:
        q = q.where(TMSVehiculo.estado_operativo == estado_operativo)
    if tipo_vehiculo:
        q = q.where(TMSVehiculo.tipo_vehiculo == tipo_vehiculo)
    r = await db.execute(q.order_by(TMSVehiculo.placa))
    vehiculos = r.scalars().all()

    resultado = []
    for veh in vehiculos:
        r2 = await db.execute(
            select(func.count(TMSViaje.id)).where(
                TMSViaje.deleted_at.is_(None),
                TMSViaje.vehiculo_id == veh.id,
                TMSViaje.estado == EstadoViajeTMSEnum.EN_TRANSITO,
            )
        )
        viajes_activos = r2.scalar() or 0
        resp = TMSVehiculoResponse.model_validate(veh)
        resp.viajes_activos = viajes_activos
        resultado.append(resp)

    return resultado


@router.post("/vehiculos", response_model=TMSVehiculoResponse, status_code=201)
async def crear_vehiculo(
    data: TMSVehiculoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    veh = TMSVehiculo(**data.model_dump())
    db.add(veh)
    await db.commit()
    await db.refresh(veh)
    resp = TMSVehiculoResponse.model_validate(veh)
    resp.viajes_activos = 0
    return resp


@router.get("/vehiculos/{vehiculo_id}", response_model=TMSVehiculoResponse)
async def obtener_vehiculo(
    vehiculo_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    veh = await db.get(TMSVehiculo, vehiculo_id)
    if not veh or veh.deleted_at:
        raise HTTPException(404, "Vehículo no encontrado")
    r = await db.execute(
        select(func.count(TMSViaje.id)).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.vehiculo_id == veh.id,
            TMSViaje.estado == EstadoViajeTMSEnum.EN_TRANSITO,
        )
    )
    viajes_activos = r.scalar() or 0
    resp = TMSVehiculoResponse.model_validate(veh)
    resp.viajes_activos = viajes_activos
    return resp


@router.put("/vehiculos/{vehiculo_id}", response_model=TMSVehiculoResponse)
async def actualizar_vehiculo(
    vehiculo_id: int,
    data: TMSVehiculoUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    veh = await db.get(TMSVehiculo, vehiculo_id)
    if not veh or veh.deleted_at:
        raise HTTPException(404, "Vehículo no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(veh, k, v)
    await db.commit()
    await db.refresh(veh)
    r = await db.execute(
        select(func.count(TMSViaje.id)).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.vehiculo_id == veh.id,
            TMSViaje.estado == EstadoViajeTMSEnum.EN_TRANSITO,
        )
    )
    viajes_activos = r.scalar() or 0
    resp = TMSVehiculoResponse.model_validate(veh)
    resp.viajes_activos = viajes_activos
    return resp


@router.put("/vehiculos/{vehiculo_id}/estado")
async def actualizar_estado_vehiculo(
    vehiculo_id: int,
    estado_operativo: str = Query(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    veh = await db.get(TMSVehiculo, vehiculo_id)
    if not veh or veh.deleted_at:
        raise HTTPException(404, "Vehículo no encontrado")
    veh.estado_operativo = estado_operativo
    await db.commit()
    return {"mensaje": "Estado actualizado"}


# ─── VIAJES ───────────────────────────────────────────────────────────────────

@router.get("/viajes", response_model=TMSViajeListResponse)
async def listar_viajes(
    estado: Optional[str] = None,
    empresa_id: Optional[int] = None,
    q: Optional[str] = Query(None, description="Buscar por código o ciudad"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    stmt = select(TMSViaje).where(TMSViaje.deleted_at.is_(None))
    if estado:
        stmt = stmt.where(TMSViaje.estado == estado)
    if empresa_id:
        stmt = stmt.where(TMSViaje.empresa_id == empresa_id)
    if q:
        stmt = stmt.where(
            or_(
                TMSViaje.codigo.ilike(f"%{q}%"),
                TMSViaje.origen_ciudad.ilike(f"%{q}%"),
                TMSViaje.destino_ciudad.ilike(f"%{q}%"),
            )
        )

    # Total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_r = await db.execute(count_stmt)
    total = total_r.scalar() or 0

    # Paginado
    stmt = stmt.order_by(TMSViaje.id.desc()).offset((page - 1) * per_page).limit(per_page)
    r = await db.execute(stmt)
    viajes = r.scalars().all()

    items = []
    for viaje in viajes:
        items.append(await _viaje_to_response(db, viaje))

    return TMSViajeListResponse(items=items, total=total, page=page, per_page=per_page)


@router.post("/viajes", response_model=TMSViajeResponse, status_code=201)
async def crear_viaje(
    data: TMSViajeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # Generar código automático VJ-{YYYY}-{NNNNNN}
    anio = datetime.utcnow().year
    r = await db.execute(select(func.count(TMSViaje.id)))
    total = (r.scalar() or 0) + 1
    codigo = f"VJ-{anio}-{total:06d}"

    payload = data.model_dump()
    viaje = TMSViaje(**payload, codigo=codigo, creado_por_id=current_user.id)
    db.add(viaje)
    await db.commit()
    await db.refresh(viaje)
    return await _viaje_to_response(db, viaje)


@router.get("/viajes/{viaje_id}", response_model=TMSViajeResponse)
async def obtener_viaje(
    viaje_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    viaje = await db.get(TMSViaje, viaje_id)
    if not viaje or viaje.deleted_at:
        raise HTTPException(404, "Viaje no encontrado")
    return await _viaje_to_response(db, viaje)


@router.put("/viajes/{viaje_id}", response_model=TMSViajeResponse)
async def actualizar_viaje(
    viaje_id: int,
    data: TMSViajeUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    viaje = await db.get(TMSViaje, viaje_id)
    if not viaje or viaje.deleted_at:
        raise HTTPException(404, "Viaje no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(viaje, k, v)
    await db.commit()
    await db.refresh(viaje)
    return await _viaje_to_response(db, viaje)


@router.put("/viajes/{viaje_id}/estado")
async def actualizar_estado_viaje(
    viaje_id: int,
    estado: str = Query(...),
    notas: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    viaje = await db.get(TMSViaje, viaje_id)
    if not viaje or viaje.deleted_at:
        raise HTTPException(404, "Viaje no encontrado")

    estado_actual = viaje.estado.value if hasattr(viaje.estado, "value") else viaje.estado
    estado_nuevo = estado.upper()

    # Validar transiciones
    transiciones_validas = {
        "PROGRAMADO": ["ASIGNADO", "CANCELADO"],
        "ASIGNADO": ["EN_TRANSITO", "CANCELADO"],
        "EN_TRANSITO": ["ENTREGADO", "CANCELADO"],
        "ENTREGADO": ["CERRADO"],
        "CERRADO": [],
        "CANCELADO": [],
    }
    permitidos = transiciones_validas.get(estado_actual, [])
    if estado_nuevo not in permitidos:
        raise HTTPException(
            400,
            f"Transición no permitida: {estado_actual} → {estado_nuevo}. "
            f"Transiciones válidas: {permitidos}",
        )

    # Validaciones específicas de transición
    if estado_nuevo == "ASIGNADO":
        if not viaje.vehiculo_id or (not viaje.conductor_hcm_id and not viaje.conductor_legacy_id):
            raise HTTPException(400, "El viaje debe tener vehículo y conductor asignados para pasar a ASIGNADO")

    if estado_nuevo == "EN_TRANSITO":
        viaje.fecha_real_cargue = datetime.utcnow()

    if estado_nuevo == "ENTREGADO":
        viaje.fecha_real_entrega = datetime.utcnow()
        # Calcular OTIF
        if viaje.fecha_programada_entrega and viaje.fecha_real_entrega:
            viaje.otif_on_time = viaje.fecha_real_entrega <= viaje.fecha_programada_entrega
        else:
            viaje.otif_on_time = None

    viaje.estado = estado_nuevo
    if notas:
        viaje.notas = notas

    await db.commit()
    await db.refresh(viaje)
    resp = await _viaje_to_response(db, viaje)
    return {"mensaje": "Estado actualizado", "viaje": resp}


@router.delete("/viajes/{viaje_id}", status_code=204)
async def eliminar_viaje(
    viaje_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    viaje = await db.get(TMSViaje, viaje_id)
    if not viaje or viaje.deleted_at:
        raise HTTPException(404, "Viaje no encontrado")
    viaje.deleted_at = datetime.utcnow()
    await db.commit()


# ─── PARADAS ──────────────────────────────────────────────────────────────────

@router.get("/viajes/{viaje_id}/paradas", response_model=List[TMSParadaResponse])
async def listar_paradas(
    viaje_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    r = await db.execute(
        select(TMSParada)
        .where(TMSParada.viaje_id == viaje_id)
        .order_by(TMSParada.secuencia)
    )
    return r.scalars().all()


@router.post("/paradas", response_model=TMSParadaResponse, status_code=201)
async def crear_parada(
    data: TMSParadaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    parada = TMSParada(**data.model_dump())
    db.add(parada)
    await db.commit()
    await db.refresh(parada)
    return parada


@router.put("/paradas/{parada_id}", response_model=TMSParadaResponse)
async def actualizar_parada(
    parada_id: int,
    data: TMSParadaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    parada = await db.get(TMSParada, parada_id)
    if not parada:
        raise HTTPException(404, "Parada no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(parada, k, v)
    await db.commit()
    await db.refresh(parada)
    return parada


@router.put("/paradas/{parada_id}/estado")
async def actualizar_estado_parada(
    parada_id: int,
    estado: str = Query(...),
    tiempo_real_llegada: Optional[datetime] = Query(None),
    tiempo_real_salida: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    parada = await db.get(TMSParada, parada_id)
    if not parada:
        raise HTTPException(404, "Parada no encontrada")
    parada.estado = estado
    if tiempo_real_llegada:
        parada.tiempo_real_llegada = tiempo_real_llegada
    if tiempo_real_salida:
        parada.tiempo_real_salida = tiempo_real_salida
    await db.commit()
    return {"mensaje": "Estado de parada actualizado"}


@router.delete("/paradas/{parada_id}", status_code=204)
async def eliminar_parada(
    parada_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    parada = await db.get(TMSParada, parada_id)
    if not parada:
        raise HTTPException(404, "Parada no encontrada")
    await db.delete(parada)
    await db.commit()


# ─── EVENTOS (Tracking) ───────────────────────────────────────────────────────

@router.get("/viajes/{viaje_id}/eventos", response_model=List[TMSEventoResponse])
async def listar_eventos(
    viaje_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    r = await db.execute(
        select(TMSEvento)
        .where(TMSEvento.viaje_id == viaje_id)
        .order_by(TMSEvento.timestamp.desc())
    )
    return r.scalars().all()


@router.post("/eventos", response_model=TMSEventoResponse, status_code=201)
async def crear_evento(
    data: TMSEventoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    evento = TMSEvento(**data.model_dump(), registrado_por_id=current_user.id)
    db.add(evento)
    await db.flush()

    # Si el evento es LLEGADA_DESTINO, actualizar estado del viaje si aplica
    if data.tipo_evento == TipoEventoTMSEnum.LLEGADA_DESTINO:
        viaje = await db.get(TMSViaje, data.viaje_id)
        if viaje and viaje.estado == EstadoViajeTMSEnum.EN_TRANSITO:
            viaje.estado = EstadoViajeTMSEnum.ENTREGADO
            viaje.fecha_real_entrega = datetime.utcnow()
            if viaje.fecha_programada_entrega and viaje.fecha_real_entrega:
                viaje.otif_on_time = viaje.fecha_real_entrega <= viaje.fecha_programada_entrega

    await db.commit()
    await db.refresh(evento)
    return evento


# ─── DOCUMENTOS ───────────────────────────────────────────────────────────────

@router.get("/viajes/{viaje_id}/documentos", response_model=List[TMSDocumentoResponse])
async def listar_documentos(
    viaje_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    r = await db.execute(
        select(TMSDocumento)
        .where(TMSDocumento.viaje_id == viaje_id)
        .order_by(TMSDocumento.id)
    )
    return r.scalars().all()


@router.post("/documentos", response_model=TMSDocumentoResponse, status_code=201)
async def crear_documento(
    data: TMSDocumentoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    doc = TMSDocumento(**data.model_dump())
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.put("/documentos/{doc_id}", response_model=TMSDocumentoResponse)
async def actualizar_documento(
    doc_id: int,
    data: TMSDocumentoUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    doc = await db.get(TMSDocumento, doc_id)
    if not doc:
        raise HTTPException(404, "Documento no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(doc, k, v)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/documentos/{doc_id}", status_code=204)
async def eliminar_documento(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    doc = await db.get(TMSDocumento, doc_id)
    if not doc:
        raise HTTPException(404, "Documento no encontrado")
    await db.delete(doc)
    await db.commit()


# ─── POD ──────────────────────────────────────────────────────────────────────

@router.get("/viajes/{viaje_id}/pod", response_model=TMSPODResponse)
async def obtener_pod(
    viaje_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    r = await db.execute(select(TMSPOD).where(TMSPOD.viaje_id == viaje_id))
    pod = r.scalar_one_or_none()
    if not pod:
        raise HTTPException(404, "POD no encontrado para este viaje")
    return pod


@router.post("/pod", response_model=TMSPODResponse, status_code=201)
async def crear_pod(
    data: TMSPODCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # Verificar que no exista ya un POD para este viaje
    r = await db.execute(select(TMSPOD).where(TMSPOD.viaje_id == data.viaje_id))
    existente = r.scalar_one_or_none()
    if existente:
        raise HTTPException(409, "Ya existe un POD para este viaje")

    pod = TMSPOD(**data.model_dump(), registrado_por_id=current_user.id)
    db.add(pod)
    await db.commit()
    await db.refresh(pod)
    return pod


# ─── RUTAS ────────────────────────────────────────────────────────────────────

@router.get("/rutas", response_model=List[TMSRutaResponse])
async def listar_rutas(
    activo: Optional[bool] = None,
    origen: Optional[str] = None,
    destino: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(TMSRuta)
    if activo is not None:
        q = q.where(TMSRuta.activo == activo)
    if origen:
        q = q.where(TMSRuta.origen.ilike(f"%{origen}%"))
    if destino:
        q = q.where(TMSRuta.destino.ilike(f"%{destino}%"))
    r = await db.execute(q.order_by(TMSRuta.nombre))
    return r.scalars().all()


@router.post("/rutas", response_model=TMSRutaResponse, status_code=201)
async def crear_ruta(
    data: TMSRutaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ruta = TMSRuta(**data.model_dump())
    db.add(ruta)
    await db.commit()
    await db.refresh(ruta)
    return ruta


@router.put("/rutas/{ruta_id}", response_model=TMSRutaResponse)
async def actualizar_ruta(
    ruta_id: int,
    data: TMSRutaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ruta = await db.get(TMSRuta, ruta_id)
    if not ruta:
        raise HTTPException(404, "Ruta no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(ruta, k, v)
    await db.commit()
    await db.refresh(ruta)
    return ruta


@router.get("/rutas/{ruta_id}/puntos", response_model=List[TMSPuntoRutaResponse])
async def listar_puntos_ruta(
    ruta_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    r = await db.execute(
        select(TMSPuntoRuta)
        .where(TMSPuntoRuta.ruta_id == ruta_id)
        .order_by(TMSPuntoRuta.secuencia)
    )
    return r.scalars().all()


@router.post("/rutas/{ruta_id}/puntos", response_model=TMSPuntoRutaResponse, status_code=201)
async def crear_punto_ruta(
    ruta_id: int,
    data: TMSPuntoRutaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    punto = TMSPuntoRuta(**data.model_dump(), ruta_id=ruta_id)
    db.add(punto)
    await db.commit()
    await db.refresh(punto)
    return punto


@router.delete("/rutas/{ruta_id}/puntos", status_code=204)
async def eliminar_puntos_ruta(
    ruta_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    await db.execute(sa_delete(TMSPuntoRuta).where(TMSPuntoRuta.ruta_id == ruta_id))
    await db.commit()


# ─── COSTOS ───────────────────────────────────────────────────────────────────

@router.get("/viajes/{viaje_id}/costos", response_model=TMSCostoViajeResponse)
async def obtener_costos(
    viaje_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    r = await db.execute(select(TMSCostoViaje).where(TMSCostoViaje.viaje_id == viaje_id))
    costo = r.scalar_one_or_none()
    if not costo:
        raise HTTPException(404, "Costos no encontrados para este viaje")
    return costo


@router.post("/costos", response_model=TMSCostoViajeResponse, status_code=201)
async def crear_costos(
    data: TMSCostoViajeCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    # Verificar que no exista ya un registro de costos para este viaje
    r = await db.execute(select(TMSCostoViaje).where(TMSCostoViaje.viaje_id == data.viaje_id))
    if r.scalar_one_or_none():
        raise HTTPException(409, "Ya existen costos registrados para este viaje")

    # Obtener distancia y num_entregas del viaje
    viaje = await db.get(TMSViaje, data.viaje_id)
    distancia_km = viaje.distancia_km if viaje else None
    num_entregas = viaje.num_entregas if viaje else None

    calculos = _calcular_costos(
        combustible=data.combustible,
        peajes=data.peajes,
        viaticos=data.viaticos,
        horas_extras=data.horas_extras,
        mantenimiento=data.mantenimiento,
        costos_indirectos=data.costos_indirectos,
        valor_flete_cobrado=data.valor_flete_cobrado,
        distancia_km=distancia_km,
        num_entregas=num_entregas,
    )

    costo = TMSCostoViaje(
        **data.model_dump(),
        **calculos,
    )
    db.add(costo)
    await db.commit()
    await db.refresh(costo)
    return costo


@router.put("/costos/{costo_id}", response_model=TMSCostoViajeResponse)
async def actualizar_costos(
    costo_id: int,
    data: TMSCostoViajeUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    costo = await db.get(TMSCostoViaje, costo_id)
    if not costo:
        raise HTTPException(404, "Registro de costos no encontrado")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(costo, k, v)

    # Obtener distancia y num_entregas del viaje
    viaje = await db.get(TMSViaje, costo.viaje_id)
    distancia_km = viaje.distancia_km if viaje else None
    num_entregas = viaje.num_entregas if viaje else None

    calculos = _calcular_costos(
        combustible=costo.combustible,
        peajes=costo.peajes,
        viaticos=costo.viaticos,
        horas_extras=costo.horas_extras,
        mantenimiento=costo.mantenimiento,
        costos_indirectos=costo.costos_indirectos,
        valor_flete_cobrado=costo.valor_flete_cobrado,
        distancia_km=distancia_km,
        num_entregas=num_entregas,
    )
    for k, v in calculos.items():
        setattr(costo, k, v)

    await db.commit()
    await db.refresh(costo)
    return costo


# ─── LIQUIDACIONES ────────────────────────────────────────────────────────────

@router.get("/liquidaciones", response_model=List[TMSLiquidacionResponse])
async def listar_liquidaciones(
    estado: Optional[str] = None,
    conductor_hcm_id: Optional[int] = None,
    periodo: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(TMSLiquidacion)
    if estado:
        q = q.where(TMSLiquidacion.estado == estado)
    if conductor_hcm_id:
        q = q.where(TMSLiquidacion.conductor_hcm_id == conductor_hcm_id)
    if periodo:
        q = q.where(TMSLiquidacion.periodo == periodo)
    r = await db.execute(q.order_by(TMSLiquidacion.id.desc()))
    return r.scalars().all()


@router.post("/liquidaciones", response_model=TMSLiquidacionResponse, status_code=201)
async def crear_liquidacion(
    data: TMSLiquidacionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    total_a_pagar = data.valor_flete + data.bonificaciones - data.descuentos - data.anticipos
    liq = TMSLiquidacion(**data.model_dump(), total_a_pagar=total_a_pagar)
    db.add(liq)
    await db.commit()
    await db.refresh(liq)
    return liq


@router.put("/liquidaciones/{liq_id}", response_model=TMSLiquidacionResponse)
async def actualizar_liquidacion(
    liq_id: int,
    data: TMSLiquidacionUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    liq = await db.get(TMSLiquidacion, liq_id)
    if not liq:
        raise HTTPException(404, "Liquidación no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(liq, k, v)
    # Recalcular total
    liq.total_a_pagar = liq.valor_flete + liq.bonificaciones - liq.descuentos - liq.anticipos
    await db.commit()
    await db.refresh(liq)
    return liq


@router.post("/liquidaciones/{liq_id}/aprobar")
async def aprobar_liquidacion(
    liq_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    liq = await db.get(TMSLiquidacion, liq_id)
    if not liq:
        raise HTTPException(404, "Liquidación no encontrada")
    liq.estado = EstadoLiquidacionTMSEnum.APROBADA
    liq.aprobado_por_id = current_user.id
    await db.commit()
    return {"mensaje": "Liquidación aprobada"}


@router.post("/liquidaciones/{liq_id}/pagar")
async def pagar_liquidacion(
    liq_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    liq = await db.get(TMSLiquidacion, liq_id)
    if not liq:
        raise HTTPException(404, "Liquidación no encontrada")
    liq.estado = EstadoLiquidacionTMSEnum.PAGADA
    liq.pagado_en = datetime.utcnow()
    await db.commit()
    return {"mensaje": "Liquidación marcada como pagada"}


# ─── OTIF ─────────────────────────────────────────────────────────────────────

@router.get("/otif", response_model=List[TMSOTIFRegistroResponse])
async def listar_otif(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    cliente: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(TMSOTIFRegistro)
    if fecha_desde:
        q = q.where(TMSOTIFRegistro.fecha >= fecha_desde)
    if fecha_hasta:
        q = q.where(TMSOTIFRegistro.fecha <= fecha_hasta)
    if cliente:
        q = q.where(TMSOTIFRegistro.cliente.ilike(f"%{cliente}%"))
    r = await db.execute(q.order_by(TMSOTIFRegistro.fecha.desc()))
    return r.scalars().all()


@router.post("/otif", response_model=TMSOTIFRegistroResponse, status_code=201)
async def crear_otif(
    data: TMSOTIFRegistroCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    # Verificar que no exista ya un registro OTIF para este viaje
    r = await db.execute(select(TMSOTIFRegistro).where(TMSOTIFRegistro.viaje_id == data.viaje_id))
    if r.scalar_one_or_none():
        raise HTTPException(409, "Ya existe un registro OTIF para este viaje")

    otif = data.on_time and data.in_full
    registro = TMSOTIFRegistro(**data.model_dump(), otif=otif)
    db.add(registro)
    await db.commit()
    await db.refresh(registro)
    return registro


@router.get("/otif/resumen")
async def resumen_otif(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(
        func.count(TMSOTIFRegistro.id),
        func.sum(func.cast(TMSOTIFRegistro.on_time == True, type_=None)),
        func.sum(func.cast(TMSOTIFRegistro.in_full == True, type_=None)),
        func.sum(func.cast(TMSOTIFRegistro.otif == True, type_=None)),
    )
    if fecha_desde:
        q = q.where(TMSOTIFRegistro.fecha >= fecha_desde)
    if fecha_hasta:
        q = q.where(TMSOTIFRegistro.fecha <= fecha_hasta)

    r = await db.execute(q)
    row = r.one()
    total = row[0] or 0
    on_time_count = int(row[1] or 0)
    in_full_count = int(row[2] or 0)
    otif_count = int(row[3] or 0)

    on_time_rate = round(on_time_count / total * 100, 2) if total else 0.0
    in_full_rate = round(in_full_count / total * 100, 2) if total else 0.0
    otif_rate = round(otif_count / total * 100, 2) if total else 0.0

    return {
        "on_time_rate": on_time_rate,
        "in_full_rate": in_full_rate,
        "otif_rate": otif_rate,
        "total": total,
    }


# ─── KPIs DIARIOS ─────────────────────────────────────────────────────────────

@router.post("/kpis/calcular")
async def calcular_kpis_diarios(
    empresa_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    hoy = date.today()
    inicio_hoy = datetime(hoy.year, hoy.month, hoy.day)
    inicio_mes = datetime(hoy.year, hoy.month, 1)

    # Viajes programados hoy
    r = await db.execute(
        select(func.count(TMSViaje.id)).where(
            TMSViaje.deleted_at.is_(None),
            func.date(TMSViaje.fecha_programada_cargue) == hoy,
            *([TMSViaje.empresa_id == empresa_id] if empresa_id else []),
        )
    )
    viajes_programados = r.scalar() or 0

    # Viajes completados hoy
    r = await db.execute(
        select(func.count(TMSViaje.id)).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.estado == EstadoViajeTMSEnum.ENTREGADO,
            func.date(TMSViaje.fecha_real_entrega) == hoy,
            *([TMSViaje.empresa_id == empresa_id] if empresa_id else []),
        )
    )
    viajes_completados = r.scalar() or 0

    # Viajes cancelados hoy
    r = await db.execute(
        select(func.count(TMSViaje.id)).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.estado == EstadoViajeTMSEnum.CANCELADO,
            func.date(TMSViaje.created_at) == hoy,
            *([TMSViaje.empresa_id == empresa_id] if empresa_id else []),
        )
    )
    viajes_cancelados = r.scalar() or 0

    # OTIF del mes
    r = await db.execute(
        select(
            func.count(TMSViaje.id),
            func.sum(func.cast(TMSViaje.otif_on_time == True, type_=None)),
            func.sum(func.cast(TMSViaje.otif_in_full == True, type_=None)),
            func.sum(
                func.cast(
                    and_(TMSViaje.otif_on_time == True, TMSViaje.otif_in_full == True),
                    type_=None,
                )
            ),
        ).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.estado == EstadoViajeTMSEnum.ENTREGADO,
            TMSViaje.fecha_real_entrega >= inicio_mes,
            *([TMSViaje.empresa_id == empresa_id] if empresa_id else []),
        )
    )
    row = r.one()
    total_ent = row[0] or 0
    on_time_rate = round(int(row[1] or 0) / total_ent * 100, 2) if total_ent else 0.0
    in_full_rate = round(int(row[2] or 0) / total_ent * 100, 2) if total_ent else 0.0
    otif_rate = round(int(row[3] or 0) / total_ent * 100, 2) if total_ent else 0.0

    # KM recorridos y costo promedio km
    r = await db.execute(
        select(func.sum(TMSViaje.distancia_km)).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.estado == EstadoViajeTMSEnum.ENTREGADO,
            func.date(TMSViaje.fecha_real_entrega) == hoy,
            *([TMSViaje.empresa_id == empresa_id] if empresa_id else []),
        )
    )
    km_recorridos = float(r.scalar() or 0.0)

    r = await db.execute(select(func.avg(TMSCostoViaje.costo_por_km)))
    costo_promedio_km = float(r.scalar() or 0.0)

    # Conductores activos hoy
    r = await db.execute(
        select(func.count(func.distinct(TMSViaje.conductor_hcm_id))).where(
            TMSViaje.deleted_at.is_(None),
            TMSViaje.estado == EstadoViajeTMSEnum.EN_TRANSITO,
            TMSViaje.conductor_hcm_id.isnot(None),
            *([TMSViaje.empresa_id == empresa_id] if empresa_id else []),
        )
    )
    conductores_activos = r.scalar() or 0

    # Upsert TMSKPIDiario
    r = await db.execute(
        select(TMSKPIDiario).where(
            TMSKPIDiario.fecha == hoy,
            *([TMSKPIDiario.empresa_id == empresa_id] if empresa_id else [TMSKPIDiario.empresa_id.is_(None)]),
        )
    )
    kpi = r.scalar_one_or_none()

    if kpi is None:
        kpi = TMSKPIDiario(
            empresa_id=empresa_id,
            fecha=hoy,
        )
        db.add(kpi)

    kpi.viajes_programados = viajes_programados
    kpi.viajes_completados = viajes_completados
    kpi.viajes_cancelados = viajes_cancelados
    kpi.on_time_rate = on_time_rate
    kpi.in_full_rate = in_full_rate
    kpi.otif_rate = otif_rate
    kpi.costo_promedio_km = costo_promedio_km
    kpi.km_recorridos = km_recorridos
    kpi.conductores_activos = conductores_activos

    await db.commit()
    return {"mensaje": "KPIs calculados"}
