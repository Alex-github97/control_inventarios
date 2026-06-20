"""
API endpoints — HCM (Human Capital Management / Gestión Humana)
Prefijo: /gh
"""
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.hcm import (
    HCMEmpresa, HCMSede, HCMArea, HCMCargo, HCMCentroCosto,
    HCMColaborador, HCMColaboradorHistorial, HCMContrato,
    HCMConductor, HCMConductorVehiculoTipo, HCMConductorCobertura,
    HCMConductorDocumento, HCMConductorAccidente,
    HCMNominaPeriodo, HCMNominaDetalle, HCMNovedad, HCMLiquidacion,
    HCMIncapacidad, HCMVacacion,
    HCMVacante, HCMPostulacion, HCMEntrevista,
    HCMEvaluacion, HCMEvaluacionDetalle,
    HCMCapacitacion, HCMColaboradorCapacitacion,
    HCMSSTIncidente, HCMSSTRiesgo, HCMSSTInspeccion,
    HCMKPIDiario,
    EstadoNominaEnum, EstadoLaboralEnum,
)
from app.application.schemas.hcm import (
    HCMEmpresaCreate, HCMEmpresaUpdate, HCMEmpresaResponse,
    HCMSedeCreate, HCMSedeUpdate, HCMSedeResponse,
    HCMAreaCreate, HCMAreaUpdate, HCMAreaResponse,
    HCMCargoCreate, HCMCargoUpdate, HCMCargoResponse,
    HCMCentroCostoCreate, HCMCentroCostoUpdate, HCMCentroCostoResponse,
    HCMColaboradorCreate, HCMColaboradorUpdate, HCMColaboradorResponse,
    HCMColaboradorListResponse, HCMColaboradorHistorialResponse,
    HCMAsignarUsuarioRequest,
    HCMContratoCreate, HCMContratoUpdate, HCMContratoResponse,
    HCMConductorCreate, HCMConductorUpdate, HCMConductorResponse,
    HCMConductorDocumentoCreate, HCMConductorDocumentoResponse,
    HCMConductorAccidenteCreate, HCMConductorAccidenteResponse,
    HCMNominaPeriodoCreate, HCMNominaPeriodoUpdate, HCMNominaPeriodoResponse,
    HCMNominaDetalleCreate, HCMNominaDetalleResponse,
    HCMNovedadCreate, HCMNovedadUpdate, HCMNovedadResponse,
    HCMLiquidacionCreate, HCMLiquidacionResponse,
    HCMIncapacidadCreate, HCMIncapacidadUpdate, HCMIncapacidadResponse,
    HCMVacacionCreate, HCMVacacionUpdate, HCMVacacionResponse,
    HCMVacanteCreate, HCMVacanteUpdate, HCMVacanteResponse,
    HCMPostulacionCreate, HCMPostulacionUpdate, HCMPostulacionResponse,
    HCMEntrevistaCreate, HCMEntrevistaUpdate, HCMEntrevistaResponse,
    HCMEvaluacionCreate, HCMEvaluacionUpdate, HCMEvaluacionResponse,
    HCMEvaluacionDetalleCreate, HCMEvaluacionDetalleResponse, HCMEvaluacionDetallesBulk,
    HCMCapacitacionCreate, HCMCapacitacionUpdate, HCMCapacitacionResponse,
    HCMColaboradorCapacitacionCreate, HCMColaboradorCapacitacionUpdateCompletar,
    HCMColaboradorCapacitacionResponse, HCMCapacitacionAsignarRequest,
    HCMSSTIncidenteCreate, HCMSSTIncidenteUpdate, HCMSSTIncidenteResponse,
    HCMSSTRiesgoCreate, HCMSSTRiesgoUpdate, HCMSSTRiesgoResponse,
    HCMSSTInspeccionCreate, HCMSSTInspeccionUpdate, HCMSSTInspeccionResponse,
    HCMKPIsDashboard, HCMAlertaItem,
)

router = APIRouter(prefix="/gh", tags=["hcm"])


# ─── Utilidades ───────────────────────────────────────────────────────────────

def _nombre_completo(c: HCMColaborador) -> str:
    return f"{c.nombres} {c.apellidos}"


async def _get_colaborador_or_404(db: AsyncSession, colaborador_id: int) -> HCMColaborador:
    r = await db.execute(select(HCMColaborador).where(
        HCMColaborador.id == colaborador_id,
        HCMColaborador.deleted_at.is_(None),
    ))
    c = r.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado")
    return c


def _build_colaborador_response(c: HCMColaborador, es_conductor: bool = False) -> dict:
    return {
        "id": c.id,
        "tipo_documento": c.tipo_documento,
        "numero_documento": c.numero_documento,
        "nombres": c.nombres,
        "apellidos": c.apellidos,
        "nombre_completo": _nombre_completo(c),
        "fecha_nacimiento": c.fecha_nacimiento,
        "genero": c.genero,
        "nacionalidad": c.nacionalidad,
        "estado_civil": c.estado_civil,
        "direccion": c.direccion,
        "ciudad": c.ciudad,
        "departamento": c.departamento,
        "pais": c.pais,
        "telefono": c.telefono,
        "email": c.email,
        "foto_url": c.foto_url,
        "codigo_empleado": c.codigo_empleado,
        "empresa_id": c.empresa_id,
        "empresa_nombre": c.empresa.nombre if c.empresa else None,
        "sede_id": c.sede_id,
        "sede_nombre": c.sede.nombre if c.sede else None,
        "area_id": c.area_id,
        "area_nombre": c.area.nombre if c.area else None,
        "cargo_id": c.cargo_id,
        "cargo_nombre": c.cargo.nombre if c.cargo else None,
        "centro_costo_id": c.centro_costo_id,
        "jefe_id": c.jefe_id,
        "jefe_nombre": _nombre_completo(c.jefe) if c.jefe else None,
        "tipo_contrato": c.tipo_contrato,
        "fecha_ingreso": c.fecha_ingreso,
        "fecha_retiro": c.fecha_retiro,
        "estado_laboral": c.estado_laboral,
        "salario_base": c.salario_base,
        "tipo_salario": c.tipo_salario,
        "auxilio_transporte": c.auxilio_transporte,
        "bonificaciones_fijas": c.bonificaciones_fijas,
        "usuario_id": c.usuario_id,
        "es_conductor": es_conductor,
        "created_at": c.created_at,
    }


# ─── DASHBOARD ────────────────────────────────────────────────────────────────

@router.get("/dashboard/kpis", response_model=HCMKPIsDashboard)
async def get_dashboard_kpis(
    empresa_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    hoy = date.today()
    q_base = select(func.count()).select_from(HCMColaborador).where(
        HCMColaborador.deleted_at.is_(None)
    )
    if empresa_id:
        q_base = q_base.where(HCMColaborador.empresa_id == empresa_id)

    total = (await db.execute(q_base)).scalar() or 0
    activo = (await db.execute(q_base.where(
        HCMColaborador.estado_laboral == EstadoLaboralEnum.ACTIVO
    ))).scalar() or 0
    retirado = (await db.execute(q_base.where(
        HCMColaborador.estado_laboral == EstadoLaboralEnum.RETIRADO
    ))).scalar() or 0

    inicio_mes = hoy.replace(day=1)
    nuevos = (await db.execute(q_base.where(
        HCMColaborador.fecha_ingreso >= inicio_mes
    ))).scalar() or 0

    q_cond = select(func.count()).select_from(HCMConductor).where(HCMConductor.activo_conduccion == True)
    cond_activos = (await db.execute(q_cond)).scalar() or 0

    from datetime import timedelta
    en_30 = hoy + timedelta(days=30)
    cond_vencer = (await db.execute(
        select(func.count()).select_from(HCMConductor).where(
            HCMConductor.fecha_vencimiento_licencia <= en_30,
            HCMConductor.fecha_vencimiento_licencia >= hoy,
            HCMConductor.activo_conduccion == True,
        )
    )).scalar() or 0

    inc_activas = (await db.execute(
        select(func.count()).select_from(HCMIncapacidad).where(
            HCMIncapacidad.fecha_fin >= hoy,
            HCMIncapacidad.estado == "ACTIVA",
        )
    )).scalar() or 0

    vac_pendientes = (await db.execute(
        select(func.count()).select_from(HCMVacacion).where(
            HCMVacacion.estado == "PENDIENTE"
        )
    )).scalar() or 0

    costo_mes_r = await db.execute(
        select(func.sum(HCMNominaDetalle.neto_pagado)).select_from(HCMNominaDetalle).join(
            HCMNominaPeriodo, HCMNominaDetalle.periodo_id == HCMNominaPeriodo.id
        ).where(
            HCMNominaPeriodo.fecha_inicio >= inicio_mes,
            HCMNominaPeriodo.estado == EstadoNominaEnum.PAGADA,
        )
    )
    costo_mes = costo_mes_r.scalar() or 0.0

    rotacion = round((retirado / total * 100) if total > 0 else 0, 2)
    ausentismo = round((inc_activas / activo * 100) if activo > 0 else 0, 2)

    return HCMKPIsDashboard(
        headcount_total=total,
        headcount_activo=activo,
        headcount_retirado=retirado,
        nuevos_ingresos_mes=nuevos,
        rotacion_mensual=rotacion,
        conductores_activos=cond_activos,
        conductores_licencias_por_vencer=cond_vencer,
        incapacidades_activas=inc_activas,
        vacaciones_pendientes=vac_pendientes,
        ausentismo_rate=ausentismo,
        costo_nomina_mes=costo_mes,
    )


@router.get("/dashboard/alertas", response_model=List[HCMAlertaItem])
async def get_alertas(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    from datetime import timedelta
    hoy = date.today()
    alertas: List[HCMAlertaItem] = []

    # Licencias por vencer en 30 días
    conductores_r = await db.execute(
        select(HCMConductor).where(
            HCMConductor.fecha_vencimiento_licencia <= hoy + timedelta(days=30),
            HCMConductor.fecha_vencimiento_licencia >= hoy,
            HCMConductor.activo_conduccion == True,
        )
    )
    for cond in conductores_r.scalars().all():
        dias = (cond.fecha_vencimiento_licencia - hoy).days
        colab = await db.get(HCMColaborador, cond.colaborador_id)
        alertas.append(HCMAlertaItem(
            tipo="LICENCIA_POR_VENCER",
            mensaje=f"Licencia de conducción vence en {dias} días",
            colaborador_id=colab.id if colab else None,
            colaborador_nombre=_nombre_completo(colab) if colab else None,
            dias_restantes=dias,
            nivel="danger" if dias <= 7 else "warning",
        ))

    # Contratos por vencer en 30 días
    contratos_r = await db.execute(
        select(HCMContrato).where(
            HCMContrato.fecha_fin != None,
            HCMContrato.fecha_fin <= hoy + timedelta(days=30),
            HCMContrato.fecha_fin >= hoy,
            HCMContrato.estado == "ACTIVO",
        )
    )
    for cont in contratos_r.scalars().all():
        dias = (cont.fecha_fin - hoy).days
        colab = await db.get(HCMColaborador, cont.colaborador_id)
        alertas.append(HCMAlertaItem(
            tipo="CONTRATO_POR_VENCER",
            mensaje=f"Contrato vence en {dias} días",
            colaborador_id=colab.id if colab else None,
            colaborador_nombre=_nombre_completo(colab) if colab else None,
            dias_restantes=dias,
            nivel="danger" if dias <= 5 else "warning",
        ))

    return alertas


# ─── CONFIGURACIÓN — Empresas ─────────────────────────────────────────────────

@router.get("/config/empresas", response_model=List[HCMEmpresaResponse])
async def listar_empresas(
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMEmpresa)
    if activo is not None:
        q = q.where(HCMEmpresa.activo == activo)
    r = await db.execute(q.order_by(HCMEmpresa.nombre))
    return r.scalars().all()


@router.post("/config/empresas", response_model=HCMEmpresaResponse, status_code=201)
async def crear_empresa(
    data: HCMEmpresaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    empresa = HCMEmpresa(**data.model_dump())
    db.add(empresa)
    await db.commit()
    await db.refresh(empresa)
    return empresa


@router.put("/config/empresas/{empresa_id}", response_model=HCMEmpresaResponse)
async def actualizar_empresa(
    empresa_id: int,
    data: HCMEmpresaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    empresa = await db.get(HCMEmpresa, empresa_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(empresa, k, v)
    await db.commit()
    await db.refresh(empresa)
    return empresa


# ─── CONFIGURACIÓN — Sedes ────────────────────────────────────────────────────

@router.get("/config/sedes", response_model=List[HCMSedeResponse])
async def listar_sedes(
    empresa_id: Optional[int] = None,
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMSede)
    if empresa_id:
        q = q.where(HCMSede.empresa_id == empresa_id)
    if activo is not None:
        q = q.where(HCMSede.activo == activo)
    r = await db.execute(q.order_by(HCMSede.nombre))
    return r.scalars().all()


@router.post("/config/sedes", response_model=HCMSedeResponse, status_code=201)
async def crear_sede(
    data: HCMSedeCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    sede = HCMSede(**data.model_dump())
    db.add(sede)
    await db.commit()
    await db.refresh(sede)
    return sede


@router.put("/config/sedes/{sede_id}", response_model=HCMSedeResponse)
async def actualizar_sede(
    sede_id: int,
    data: HCMSedeUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    sede = await db.get(HCMSede, sede_id)
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(sede, k, v)
    await db.commit()
    await db.refresh(sede)
    return sede


# ─── CONFIGURACIÓN — Áreas ────────────────────────────────────────────────────

@router.get("/config/areas", response_model=List[HCMAreaResponse])
async def listar_areas(
    empresa_id: Optional[int] = None,
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMArea)
    if empresa_id:
        q = q.where(HCMArea.empresa_id == empresa_id)
    if activo is not None:
        q = q.where(HCMArea.activo == activo)
    r = await db.execute(q.order_by(HCMArea.nombre))
    return r.scalars().all()


@router.post("/config/areas", response_model=HCMAreaResponse, status_code=201)
async def crear_area(
    data: HCMAreaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    area = HCMArea(**data.model_dump())
    db.add(area)
    await db.commit()
    await db.refresh(area)
    return area


@router.put("/config/areas/{area_id}", response_model=HCMAreaResponse)
async def actualizar_area(
    area_id: int,
    data: HCMAreaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    area = await db.get(HCMArea, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Área no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(area, k, v)
    await db.commit()
    await db.refresh(area)
    return area


# ─── CONFIGURACIÓN — Cargos ───────────────────────────────────────────────────

@router.get("/config/cargos", response_model=List[HCMCargoResponse])
async def listar_cargos(
    empresa_id: Optional[int] = None,
    area_id: Optional[int] = None,
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMCargo)
    if empresa_id:
        q = q.where(HCMCargo.empresa_id == empresa_id)
    if area_id:
        q = q.where(HCMCargo.area_id == area_id)
    if activo is not None:
        q = q.where(HCMCargo.activo == activo)
    r = await db.execute(q.order_by(HCMCargo.nombre))
    return r.scalars().all()


@router.post("/config/cargos", response_model=HCMCargoResponse, status_code=201)
async def crear_cargo(
    data: HCMCargoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    cargo = HCMCargo(**data.model_dump())
    db.add(cargo)
    await db.commit()
    await db.refresh(cargo)
    return cargo


@router.put("/config/cargos/{cargo_id}", response_model=HCMCargoResponse)
async def actualizar_cargo(
    cargo_id: int,
    data: HCMCargoUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    cargo = await db.get(HCMCargo, cargo_id)
    if not cargo:
        raise HTTPException(status_code=404, detail="Cargo no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cargo, k, v)
    await db.commit()
    await db.refresh(cargo)
    return cargo


# ─── CONFIGURACIÓN — Centros de Costo ────────────────────────────────────────

@router.get("/config/centros-costo", response_model=List[HCMCentroCostoResponse])
async def listar_centros_costo(
    empresa_id: Optional[int] = None,
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMCentroCosto)
    if empresa_id:
        q = q.where(HCMCentroCosto.empresa_id == empresa_id)
    if activo is not None:
        q = q.where(HCMCentroCosto.activo == activo)
    r = await db.execute(q.order_by(HCMCentroCosto.nombre))
    return r.scalars().all()


@router.post("/config/centros-costo", response_model=HCMCentroCostoResponse, status_code=201)
async def crear_centro_costo(
    data: HCMCentroCostoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    cc = HCMCentroCosto(**data.model_dump())
    db.add(cc)
    await db.commit()
    await db.refresh(cc)
    return cc


@router.put("/config/centros-costo/{cc_id}", response_model=HCMCentroCostoResponse)
async def actualizar_centro_costo(
    cc_id: int,
    data: HCMCentroCostoUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    cc = await db.get(HCMCentroCosto, cc_id)
    if not cc:
        raise HTTPException(status_code=404, detail="Centro de costo no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cc, k, v)
    await db.commit()
    await db.refresh(cc)
    return cc


# ─── COLABORADORES ────────────────────────────────────────────────────────────

@router.get("/colaboradores", response_model=HCMColaboradorListResponse)
async def listar_colaboradores(
    empresa_id: Optional[int] = None,
    estado_laboral: Optional[str] = None,
    area_id: Optional[int] = None,
    cargo_id: Optional[int] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    stmt = select(HCMColaborador).where(HCMColaborador.deleted_at.is_(None))
    if empresa_id:
        stmt = stmt.where(HCMColaborador.empresa_id == empresa_id)
    if estado_laboral:
        stmt = stmt.where(HCMColaborador.estado_laboral == estado_laboral)
    if area_id:
        stmt = stmt.where(HCMColaborador.area_id == area_id)
    if cargo_id:
        stmt = stmt.where(HCMColaborador.cargo_id == cargo_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(
            HCMColaborador.nombres.ilike(like),
            HCMColaborador.apellidos.ilike(like),
            HCMColaborador.numero_documento.ilike(like),
            HCMColaborador.codigo_empleado.ilike(like),
        ))

    total_r = await db.execute(select(func.count()).select_from(stmt.subquery()))
    total = total_r.scalar() or 0

    stmt = stmt.order_by(HCMColaborador.apellidos, HCMColaborador.nombres)
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    items = result.scalars().all()

    # Determinar cuáles son conductores
    conductor_ids_r = await db.execute(
        select(HCMConductor.colaborador_id).where(HCMConductor.activo_conduccion == True)
    )
    conductor_ids = set(r[0] for r in conductor_ids_r.all())

    responses = []
    for c in items:
        d = _build_colaborador_response(c, es_conductor=c.id in conductor_ids)
        responses.append(HCMColaboradorResponse(**d))

    return HCMColaboradorListResponse(items=responses, total=total, page=page, per_page=per_page)


@router.post("/colaboradores", response_model=HCMColaboradorResponse, status_code=201)
async def crear_colaborador(
    data: HCMColaboradorCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    payload = data.model_dump()
    if not payload.get("codigo_empleado"):
        count_r = await db.execute(select(func.count()).select_from(HCMColaborador))
        count = (count_r.scalar() or 0) + 1
        payload["codigo_empleado"] = f"EMP{count:05d}"

    c = HCMColaborador(**payload)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return HCMColaboradorResponse(**_build_colaborador_response(c))


@router.get("/colaboradores/{colaborador_id}", response_model=HCMColaboradorResponse)
async def obtener_colaborador(
    colaborador_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    c = await _get_colaborador_or_404(db, colaborador_id)
    conductor_r = await db.execute(
        select(HCMConductor).where(HCMConductor.colaborador_id == colaborador_id)
    )
    es_cond = conductor_r.scalar_one_or_none() is not None
    return HCMColaboradorResponse(**_build_colaborador_response(c, es_conductor=es_cond))


@router.put("/colaboradores/{colaborador_id}", response_model=HCMColaboradorResponse)
async def actualizar_colaborador(
    colaborador_id: int,
    data: HCMColaboradorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    c = await _get_colaborador_or_404(db, colaborador_id)
    cambios = data.model_dump(exclude_unset=True)
    for campo, nuevo_val in cambios.items():
        viejo_val = getattr(c, campo, None)
        setattr(c, campo, nuevo_val)
        if str(viejo_val) != str(nuevo_val):
            historial = HCMColaboradorHistorial(
                colaborador_id=colaborador_id,
                campo=campo,
                valor_anterior=str(viejo_val) if viejo_val is not None else None,
                valor_nuevo=str(nuevo_val) if nuevo_val is not None else None,
                usuario_cambio=current_user.username,
                fecha_cambio=datetime.utcnow(),
            )
            db.add(historial)
    await db.commit()
    await db.refresh(c)
    return HCMColaboradorResponse(**_build_colaborador_response(c))


@router.delete("/colaboradores/{colaborador_id}", status_code=204)
async def eliminar_colaborador(
    colaborador_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    c = await _get_colaborador_or_404(db, colaborador_id)
    c.deleted_at = datetime.utcnow()
    c.estado_laboral = EstadoLaboralEnum.RETIRADO
    await db.commit()


@router.post("/colaboradores/{colaborador_id}/asignar-usuario", response_model=HCMColaboradorResponse)
async def asignar_usuario(
    colaborador_id: int,
    data: HCMAsignarUsuarioRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    c = await _get_colaborador_or_404(db, colaborador_id)
    if data.usuario_id is not None:
        usuario = await db.get(Usuario, data.usuario_id)
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
    c.usuario_id = data.usuario_id
    await db.commit()
    await db.refresh(c)
    return HCMColaboradorResponse(**_build_colaborador_response(c))


@router.get("/colaboradores/{colaborador_id}/historial", response_model=List[HCMColaboradorHistorialResponse])
async def historial_colaborador(
    colaborador_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    await _get_colaborador_or_404(db, colaborador_id)
    r = await db.execute(
        select(HCMColaboradorHistorial)
        .where(HCMColaboradorHistorial.colaborador_id == colaborador_id)
        .order_by(HCMColaboradorHistorial.fecha_cambio.desc())
    )
    return r.scalars().all()


# ─── CONTRATOS ────────────────────────────────────────────────────────────────

@router.get("/colaboradores/{colaborador_id}/contratos", response_model=List[HCMContratoResponse])
async def listar_contratos(
    colaborador_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    await _get_colaborador_or_404(db, colaborador_id)
    r = await db.execute(
        select(HCMContrato)
        .where(HCMContrato.colaborador_id == colaborador_id)
        .order_by(HCMContrato.fecha_inicio.desc())
    )
    return r.scalars().all()


@router.post("/contratos", response_model=HCMContratoResponse, status_code=201)
async def crear_contrato(
    data: HCMContratoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    contrato = HCMContrato(**data.model_dump(), estado="ACTIVO")
    db.add(contrato)
    await db.commit()
    await db.refresh(contrato)
    return contrato


@router.put("/contratos/{contrato_id}", response_model=HCMContratoResponse)
async def actualizar_contrato(
    contrato_id: int,
    data: HCMContratoUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    contrato = await db.get(HCMContrato, contrato_id)
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(contrato, k, v)
    await db.commit()
    await db.refresh(contrato)
    return contrato


# ─── CONDUCTORES ──────────────────────────────────────────────────────────────

@router.get("/conductores", response_model=List[HCMConductorResponse])
async def listar_conductores(
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMConductor)
    if activo is not None:
        q = q.where(HCMConductor.activo_conduccion == activo)
    r = await db.execute(q)
    conductores = r.scalars().all()

    hoy = date.today()
    result = []
    for cond in conductores:
        colab = await db.get(HCMColaborador, cond.colaborador_id)
        tipos_r = await db.execute(
            select(HCMConductorVehiculoTipo.tipo_vehiculo).where(
                HCMConductorVehiculoTipo.conductor_id == cond.id
            )
        )
        coberturas_r = await db.execute(
            select(HCMConductorCobertura.escala).where(
                HCMConductorCobertura.conductor_id == cond.id
            )
        )
        docs_count_r = await db.execute(
            select(func.count()).select_from(HCMConductorDocumento).where(
                HCMConductorDocumento.conductor_id == cond.id
            )
        )
        dias = (cond.fecha_vencimiento_licencia - hoy).days if cond.fecha_vencimiento_licencia else 0
        result.append(HCMConductorResponse(
            id=cond.id,
            colaborador_id=cond.colaborador_id,
            colaborador_nombre=_nombre_completo(colab) if colab else None,
            colaborador_documento=colab.numero_documento if colab else None,
            num_licencia=cond.num_licencia,
            tipo_licencia=cond.tipo_licencia,
            fecha_expedicion_licencia=cond.fecha_expedicion_licencia,
            fecha_vencimiento_licencia=cond.fecha_vencimiento_licencia,
            restricciones=cond.restricciones,
            anos_experiencia=cond.anos_experiencia,
            activo_conduccion=cond.activo_conduccion,
            vehiculos_tipos=[row[0] for row in tipos_r.all()],
            coberturas=[row[0] for row in coberturas_r.all()],
            documentos_count=docs_count_r.scalar() or 0,
            dias_hasta_vencimiento=dias,
            created_at=cond.created_at,
        ))
    return result


@router.post("/conductores", response_model=HCMConductorResponse, status_code=201)
async def crear_conductor(
    data: HCMConductorCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    existing_r = await db.execute(
        select(HCMConductor).where(HCMConductor.colaborador_id == data.colaborador_id)
    )
    if existing_r.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="El colaborador ya es conductor")

    payload = data.model_dump(exclude={"vehiculos_tipos", "coberturas"})
    cond = HCMConductor(**payload, activo_conduccion=True)
    db.add(cond)
    await db.flush()

    for tipo in data.vehiculos_tipos:
        db.add(HCMConductorVehiculoTipo(conductor_id=cond.id, tipo_vehiculo=tipo))
    for escala in data.coberturas:
        db.add(HCMConductorCobertura(conductor_id=cond.id, escala=escala))

    await db.commit()
    await db.refresh(cond)

    colab = await db.get(HCMColaborador, cond.colaborador_id)
    hoy = date.today()
    dias = (cond.fecha_vencimiento_licencia - hoy).days if cond.fecha_vencimiento_licencia else 0
    return HCMConductorResponse(
        id=cond.id, colaborador_id=cond.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        colaborador_documento=colab.numero_documento if colab else None,
        num_licencia=cond.num_licencia, tipo_licencia=cond.tipo_licencia,
        fecha_expedicion_licencia=cond.fecha_expedicion_licencia,
        fecha_vencimiento_licencia=cond.fecha_vencimiento_licencia,
        restricciones=cond.restricciones, anos_experiencia=cond.anos_experiencia,
        activo_conduccion=cond.activo_conduccion,
        vehiculos_tipos=data.vehiculos_tipos, coberturas=data.coberturas,
        documentos_count=0, dias_hasta_vencimiento=dias, created_at=cond.created_at,
    )


@router.put("/conductores/{conductor_id}", response_model=HCMConductorResponse)
async def actualizar_conductor(
    conductor_id: int,
    data: HCMConductorUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    cond = await db.get(HCMConductor, conductor_id)
    if not cond:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    payload = data.model_dump(exclude_unset=True, exclude={"vehiculos_tipos", "coberturas"})
    for k, v in payload.items():
        setattr(cond, k, v)

    if data.vehiculos_tipos is not None:
        await db.execute(
            select(HCMConductorVehiculoTipo).where(HCMConductorVehiculoTipo.conductor_id == conductor_id)
        )
        # Delete existing and re-insert
        from sqlalchemy import delete as sa_delete
        await db.execute(sa_delete(HCMConductorVehiculoTipo).where(HCMConductorVehiculoTipo.conductor_id == conductor_id))
        for tipo in data.vehiculos_tipos:
            db.add(HCMConductorVehiculoTipo(conductor_id=conductor_id, tipo_vehiculo=tipo))

    if data.coberturas is not None:
        from sqlalchemy import delete as sa_delete
        await db.execute(sa_delete(HCMConductorCobertura).where(HCMConductorCobertura.conductor_id == conductor_id))
        for escala in data.coberturas:
            db.add(HCMConductorCobertura(conductor_id=conductor_id, escala=escala))

    await db.commit()
    await db.refresh(cond)

    colab = await db.get(HCMColaborador, cond.colaborador_id)
    hoy = date.today()
    dias = (cond.fecha_vencimiento_licencia - hoy).days if cond.fecha_vencimiento_licencia else 0
    tipos_r = await db.execute(select(HCMConductorVehiculoTipo.tipo_vehiculo).where(HCMConductorVehiculoTipo.conductor_id == conductor_id))
    coberturas_r = await db.execute(select(HCMConductorCobertura.escala).where(HCMConductorCobertura.conductor_id == conductor_id))
    docs_r = await db.execute(select(func.count()).select_from(HCMConductorDocumento).where(HCMConductorDocumento.conductor_id == conductor_id))

    return HCMConductorResponse(
        id=cond.id, colaborador_id=cond.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        colaborador_documento=colab.numero_documento if colab else None,
        num_licencia=cond.num_licencia, tipo_licencia=cond.tipo_licencia,
        fecha_expedicion_licencia=cond.fecha_expedicion_licencia,
        fecha_vencimiento_licencia=cond.fecha_vencimiento_licencia,
        restricciones=cond.restricciones, anos_experiencia=cond.anos_experiencia,
        activo_conduccion=cond.activo_conduccion,
        vehiculos_tipos=[row[0] for row in tipos_r.all()],
        coberturas=[row[0] for row in coberturas_r.all()],
        documentos_count=docs_r.scalar() or 0,
        dias_hasta_vencimiento=dias, created_at=cond.created_at,
    )


@router.get("/conductores/{conductor_id}/documentos", response_model=List[HCMConductorDocumentoResponse])
async def listar_documentos_conductor(
    conductor_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    r = await db.execute(
        select(HCMConductorDocumento)
        .where(HCMConductorDocumento.conductor_id == conductor_id)
        .order_by(HCMConductorDocumento.fecha_vencimiento.asc())
    )
    return r.scalars().all()


@router.post("/conductores/documentos", response_model=HCMConductorDocumentoResponse, status_code=201)
async def crear_documento_conductor(
    data: HCMConductorDocumentoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    hoy = date.today()
    estado = "VIGENTE"
    if data.fecha_vencimiento:
        delta = (data.fecha_vencimiento - hoy).days
        if delta < 0:
            estado = "VENCIDO"
        elif delta <= 30:
            estado = "POR_VENCER"
    doc = HCMConductorDocumento(**data.model_dump(), estado=estado)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/conductores/{conductor_id}/accidentes", response_model=List[HCMConductorAccidenteResponse])
async def listar_accidentes_conductor(
    conductor_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    r = await db.execute(
        select(HCMConductorAccidente)
        .where(HCMConductorAccidente.conductor_id == conductor_id)
        .order_by(HCMConductorAccidente.fecha.desc())
    )
    return r.scalars().all()


@router.post("/conductores/accidentes", response_model=HCMConductorAccidenteResponse, status_code=201)
async def crear_accidente_conductor(
    data: HCMConductorAccidenteCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    acc = HCMConductorAccidente(**data.model_dump())
    db.add(acc)
    await db.commit()
    await db.refresh(acc)
    return acc


# ─── NÓMINA — Períodos ────────────────────────────────────────────────────────

@router.get("/nomina/periodos", response_model=List[HCMNominaPeriodoResponse])
async def listar_periodos(
    empresa_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMNominaPeriodo)
    if empresa_id:
        q = q.where(HCMNominaPeriodo.empresa_id == empresa_id)
    if estado:
        q = q.where(HCMNominaPeriodo.estado == estado)
    r = await db.execute(q.order_by(HCMNominaPeriodo.fecha_inicio.desc()))
    periodos = r.scalars().all()

    result = []
    for p in periodos:
        count_r = await db.execute(
            select(func.count()).select_from(HCMNominaDetalle).where(HCMNominaDetalle.periodo_id == p.id)
        )
        result.append(HCMNominaPeriodoResponse(
            id=p.id, empresa_id=p.empresa_id, nombre=p.nombre,
            fecha_inicio=p.fecha_inicio, fecha_fin=p.fecha_fin,
            estado=p.estado, total_devengado=p.total_devengado,
            total_deducido=p.total_deducido, total_neto=p.total_neto,
            empleados_count=count_r.scalar() or 0,
            notas=p.notas, created_at=p.created_at,
        ))
    return result


@router.post("/nomina/periodos", response_model=HCMNominaPeriodoResponse, status_code=201)
async def crear_periodo(
    data: HCMNominaPeriodoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    periodo = HCMNominaPeriodo(
        **data.model_dump(),
        estado=EstadoNominaEnum.BORRADOR,
        total_devengado=0, total_deducido=0, total_neto=0,
    )
    db.add(periodo)
    await db.commit()
    await db.refresh(periodo)
    return HCMNominaPeriodoResponse(
        id=periodo.id, empresa_id=periodo.empresa_id, nombre=periodo.nombre,
        fecha_inicio=periodo.fecha_inicio, fecha_fin=periodo.fecha_fin,
        estado=periodo.estado, total_devengado=0, total_deducido=0, total_neto=0,
        empleados_count=0, notas=periodo.notas, created_at=periodo.created_at,
    )


@router.post("/nomina/periodos/{periodo_id}/procesar")
async def procesar_periodo(
    periodo_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    periodo = await db.get(HCMNominaPeriodo, periodo_id)
    if not periodo:
        raise HTTPException(status_code=404, detail="Período no encontrado")
    if periodo.estado not in (EstadoNominaEnum.BORRADOR, EstadoNominaEnum.EN_PROCESO):
        raise HTTPException(status_code=400, detail="El período no está en estado procesable")

    colaboradores_r = await db.execute(
        select(HCMColaborador).where(
            HCMColaborador.empresa_id == periodo.empresa_id,
            HCMColaborador.deleted_at.is_(None),
            HCMColaborador.estado_laboral == EstadoLaboralEnum.ACTIVO,
        )
    )
    colaboradores = colaboradores_r.scalars().all()

    total_dev = 0.0
    total_ded = 0.0

    for c in colaboradores:
        existing_r = await db.execute(
            select(HCMNominaDetalle).where(
                HCMNominaDetalle.periodo_id == periodo_id,
                HCMNominaDetalle.colaborador_id == c.id,
            )
        )
        if existing_r.scalar_one_or_none():
            continue

        salud = round(c.salario_base * 0.04, 2)
        pension = round(c.salario_base * 0.04, 2)
        devengado = c.salario_base + c.auxilio_transporte + c.bonificaciones_fijas
        deducido = salud + pension
        neto = devengado - deducido

        detalle = HCMNominaDetalle(
            periodo_id=periodo_id,
            colaborador_id=c.id,
            salario_base=c.salario_base,
            horas_extras=0, recargo_nocturno=0, dominicales=0, festivos=0,
            bonificaciones=c.bonificaciones_fijas, comisiones=0, viaticos=0,
            auxilio_transporte=c.auxilio_transporte, otros_devengados=0,
            total_devengado=devengado,
            salud=salud, pension=pension,
            fondo_solidaridad=0, retencion_fuente=0, embargo=0, otros_descuentos=0,
            total_deducido=deducido,
            neto_pagado=neto,
        )
        db.add(detalle)
        total_dev += devengado
        total_ded += deducido

    periodo.estado = EstadoNominaEnum.EN_PROCESO
    periodo.total_devengado = total_dev
    periodo.total_deducido = total_ded
    periodo.total_neto = total_dev - total_ded
    await db.commit()
    return {"mensaje": f"Período procesado con {len(colaboradores)} colaboradores"}


@router.post("/nomina/periodos/{periodo_id}/cerrar")
async def cerrar_periodo(
    periodo_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    periodo = await db.get(HCMNominaPeriodo, periodo_id)
    if not periodo:
        raise HTTPException(status_code=404, detail="Período no encontrado")
    if periodo.estado != EstadoNominaEnum.EN_PROCESO:
        raise HTTPException(status_code=400, detail="Solo se pueden cerrar períodos en proceso")
    periodo.estado = EstadoNominaEnum.CERRADA
    await db.commit()
    return {"mensaje": "Período cerrado exitosamente"}


@router.get("/nomina/periodos/{periodo_id}/detalles", response_model=List[HCMNominaDetalleResponse])
async def listar_detalles_periodo(
    periodo_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    r = await db.execute(
        select(HCMNominaDetalle).where(HCMNominaDetalle.periodo_id == periodo_id)
    )
    detalles = r.scalars().all()
    result = []
    for d in detalles:
        colab = await db.get(HCMColaborador, d.colaborador_id)
        result.append(HCMNominaDetalleResponse(
            id=d.id, periodo_id=d.periodo_id, colaborador_id=d.colaborador_id,
            colaborador_nombre=_nombre_completo(colab) if colab else None,
            salario_base=d.salario_base, horas_extras=d.horas_extras,
            recargo_nocturno=d.recargo_nocturno, dominicales=d.dominicales,
            festivos=d.festivos, bonificaciones=d.bonificaciones,
            comisiones=d.comisiones, viaticos=d.viaticos,
            auxilio_transporte=d.auxilio_transporte, otros_devengados=d.otros_devengados,
            total_devengado=d.total_devengado, salud=d.salud, pension=d.pension,
            fondo_solidaridad=d.fondo_solidaridad, retencion_fuente=d.retencion_fuente,
            embargo=d.embargo, otros_descuentos=d.otros_descuentos,
            total_deducido=d.total_deducido, neto_pagado=d.neto_pagado,
            created_at=d.created_at,
        ))
    return result


@router.post("/nomina/detalles", response_model=HCMNominaDetalleResponse, status_code=201)
async def crear_detalle_nomina(
    data: HCMNominaDetalleCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    payload = data.model_dump()
    devengado = (
        payload["salario_base"] + payload["horas_extras"] + payload["recargo_nocturno"] +
        payload["dominicales"] + payload["festivos"] + payload["bonificaciones"] +
        payload["comisiones"] + payload["viaticos"] + payload["auxilio_transporte"] +
        payload["otros_devengados"]
    )
    deducido = (
        payload["salud"] + payload["pension"] + payload["fondo_solidaridad"] +
        payload["retencion_fuente"] + payload["embargo"] + payload["otros_descuentos"]
    )
    payload["total_devengado"] = devengado
    payload["total_deducido"] = deducido
    payload["neto_pagado"] = devengado - deducido
    detalle = HCMNominaDetalle(**payload)
    db.add(detalle)
    await db.commit()
    await db.refresh(detalle)
    colab = await db.get(HCMColaborador, detalle.colaborador_id)
    return HCMNominaDetalleResponse(
        id=detalle.id, periodo_id=detalle.periodo_id, colaborador_id=detalle.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        salario_base=detalle.salario_base, horas_extras=detalle.horas_extras,
        recargo_nocturno=detalle.recargo_nocturno, dominicales=detalle.dominicales,
        festivos=detalle.festivos, bonificaciones=detalle.bonificaciones,
        comisiones=detalle.comisiones, viaticos=detalle.viaticos,
        auxilio_transporte=detalle.auxilio_transporte, otros_devengados=detalle.otros_devengados,
        total_devengado=detalle.total_devengado, salud=detalle.salud, pension=detalle.pension,
        fondo_solidaridad=detalle.fondo_solidaridad, retencion_fuente=detalle.retencion_fuente,
        embargo=detalle.embargo, otros_descuentos=detalle.otros_descuentos,
        total_deducido=detalle.total_deducido, neto_pagado=detalle.neto_pagado,
        created_at=detalle.created_at,
    )


# ─── NOVEDADES ────────────────────────────────────────────────────────────────

@router.get("/nomina/novedades", response_model=List[HCMNovedadResponse])
async def listar_novedades(
    colaborador_id: Optional[int] = None,
    periodo_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMNovedad)
    if colaborador_id:
        q = q.where(HCMNovedad.colaborador_id == colaborador_id)
    if periodo_id:
        q = q.where(HCMNovedad.periodo_id == periodo_id)
    r = await db.execute(q.order_by(HCMNovedad.fecha.desc()))
    novedades = r.scalars().all()
    result = []
    for n in novedades:
        colab = await db.get(HCMColaborador, n.colaborador_id)
        periodo = await db.get(HCMNominaPeriodo, n.periodo_id) if n.periodo_id else None
        result.append(HCMNovedadResponse(
            id=n.id, colaborador_id=n.colaborador_id,
            colaborador_nombre=_nombre_completo(colab) if colab else None,
            periodo_id=n.periodo_id,
            periodo_nombre=periodo.nombre if periodo else None,
            tipo_novedad=n.tipo_novedad, descripcion=n.descripcion,
            valor=n.valor, fecha=n.fecha, aprobado_por=n.aprobado_por,
            notas=n.notas, created_at=n.created_at,
        ))
    return result


@router.post("/nomina/novedades", response_model=HCMNovedadResponse, status_code=201)
async def crear_novedad(
    data: HCMNovedadCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    nov = HCMNovedad(**data.model_dump())
    db.add(nov)
    await db.commit()
    await db.refresh(nov)
    colab = await db.get(HCMColaborador, nov.colaborador_id)
    return HCMNovedadResponse(
        id=nov.id, colaborador_id=nov.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        periodo_id=nov.periodo_id, periodo_nombre=None,
        tipo_novedad=nov.tipo_novedad, descripcion=nov.descripcion,
        valor=nov.valor, fecha=nov.fecha, aprobado_por=nov.aprobado_por,
        notas=nov.notas, created_at=nov.created_at,
    )


@router.put("/nomina/novedades/{novedad_id}", response_model=HCMNovedadResponse)
async def actualizar_novedad(
    novedad_id: int,
    data: HCMNovedadUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    nov = await db.get(HCMNovedad, novedad_id)
    if not nov:
        raise HTTPException(status_code=404, detail="Novedad no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(nov, k, v)
    await db.commit()
    await db.refresh(nov)
    colab = await db.get(HCMColaborador, nov.colaborador_id)
    return HCMNovedadResponse(
        id=nov.id, colaborador_id=nov.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        periodo_id=nov.periodo_id, periodo_nombre=None,
        tipo_novedad=nov.tipo_novedad, descripcion=nov.descripcion,
        valor=nov.valor, fecha=nov.fecha, aprobado_por=nov.aprobado_por,
        notas=nov.notas, created_at=nov.created_at,
    )


@router.delete("/nomina/novedades/{novedad_id}", status_code=204)
async def eliminar_novedad(
    novedad_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    nov = await db.get(HCMNovedad, novedad_id)
    if not nov:
        raise HTTPException(status_code=404, detail="Novedad no encontrada")
    await db.delete(nov)
    await db.commit()


# ─── LIQUIDACIONES ────────────────────────────────────────────────────────────

@router.get("/nomina/liquidaciones", response_model=List[HCMLiquidacionResponse])
async def listar_liquidaciones(
    colaborador_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMLiquidacion)
    if colaborador_id:
        q = q.where(HCMLiquidacion.colaborador_id == colaborador_id)
    r = await db.execute(q.order_by(HCMLiquidacion.fecha_liquidacion.desc()))
    liquidaciones = r.scalars().all()
    result = []
    for liq in liquidaciones:
        colab = await db.get(HCMColaborador, liq.colaborador_id)
        result.append(HCMLiquidacionResponse(
            id=liq.id, colaborador_id=liq.colaborador_id,
            colaborador_nombre=_nombre_completo(colab) if colab else None,
            fecha_liquidacion=liq.fecha_liquidacion, motivo_retiro=liq.motivo_retiro,
            dias_trabajados=liq.dias_trabajados, prima=liq.prima,
            cesantias=liq.cesantias, intereses_cesantias=liq.intereses_cesantias,
            vacaciones_compensadas=liq.vacaciones_compensadas,
            indemnizacion=liq.indemnizacion, otros_conceptos=liq.otros_conceptos,
            deducciones=liq.deducciones, total_pagar=liq.total_pagar,
            estado=liq.estado, notas=liq.notas, created_at=liq.created_at,
        ))
    return result


@router.post("/nomina/liquidaciones", response_model=HCMLiquidacionResponse, status_code=201)
async def crear_liquidacion(
    data: HCMLiquidacionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    payload = data.model_dump()
    total = (
        payload["prima"] + payload["cesantias"] + payload["intereses_cesantias"] +
        payload["vacaciones_compensadas"] + payload["indemnizacion"] +
        payload["otros_conceptos"] - payload["deducciones"]
    )
    liq = HCMLiquidacion(**payload, total_pagar=total, estado="PENDIENTE")
    db.add(liq)
    await db.commit()
    await db.refresh(liq)
    colab = await db.get(HCMColaborador, liq.colaborador_id)
    return HCMLiquidacionResponse(
        id=liq.id, colaborador_id=liq.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        fecha_liquidacion=liq.fecha_liquidacion, motivo_retiro=liq.motivo_retiro,
        dias_trabajados=liq.dias_trabajados, prima=liq.prima,
        cesantias=liq.cesantias, intereses_cesantias=liq.intereses_cesantias,
        vacaciones_compensadas=liq.vacaciones_compensadas,
        indemnizacion=liq.indemnizacion, otros_conceptos=liq.otros_conceptos,
        deducciones=liq.deducciones, total_pagar=liq.total_pagar,
        estado=liq.estado, notas=liq.notas, created_at=liq.created_at,
    )


# ─── INCAPACIDADES ────────────────────────────────────────────────────────────

@router.get("/incapacidades", response_model=List[HCMIncapacidadResponse])
async def listar_incapacidades(
    colaborador_id: Optional[int] = None,
    tipo_incapacidad: Optional[str] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMIncapacidad)
    if colaborador_id:
        q = q.where(HCMIncapacidad.colaborador_id == colaborador_id)
    if tipo_incapacidad:
        q = q.where(HCMIncapacidad.tipo_incapacidad == tipo_incapacidad)
    if estado:
        q = q.where(HCMIncapacidad.estado == estado)
    r = await db.execute(q.order_by(HCMIncapacidad.fecha_inicio.desc()))
    incapacidades = r.scalars().all()
    result = []
    for inc in incapacidades:
        colab = await db.get(HCMColaborador, inc.colaborador_id)
        result.append(HCMIncapacidadResponse(
            id=inc.id, colaborador_id=inc.colaborador_id,
            colaborador_nombre=_nombre_completo(colab) if colab else None,
            tipo_incapacidad=inc.tipo_incapacidad, diagnostico=inc.diagnostico,
            entidad_emisora=inc.entidad_emisora,
            fecha_inicio=inc.fecha_inicio, fecha_fin=inc.fecha_fin,
            dias=inc.dias, costo_empresa=inc.costo_empresa, costo_eps=inc.costo_eps,
            archivo_url=inc.archivo_url, estado=inc.estado,
            notas=inc.notas, created_at=inc.created_at,
        ))
    return result


@router.post("/incapacidades", response_model=HCMIncapacidadResponse, status_code=201)
async def crear_incapacidad(
    data: HCMIncapacidadCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    payload = data.model_dump()
    if payload["dias"] == 0 and payload["fecha_inicio"] and payload["fecha_fin"]:
        payload["dias"] = (payload["fecha_fin"] - payload["fecha_inicio"]).days + 1
    inc = HCMIncapacidad(**payload, estado="ACTIVA")
    db.add(inc)
    await db.commit()
    await db.refresh(inc)
    colab = await db.get(HCMColaborador, inc.colaborador_id)
    return HCMIncapacidadResponse(
        id=inc.id, colaborador_id=inc.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        tipo_incapacidad=inc.tipo_incapacidad, diagnostico=inc.diagnostico,
        entidad_emisora=inc.entidad_emisora,
        fecha_inicio=inc.fecha_inicio, fecha_fin=inc.fecha_fin,
        dias=inc.dias, costo_empresa=inc.costo_empresa, costo_eps=inc.costo_eps,
        archivo_url=inc.archivo_url, estado=inc.estado,
        notas=inc.notas, created_at=inc.created_at,
    )


@router.put("/incapacidades/{incapacidad_id}", response_model=HCMIncapacidadResponse)
async def actualizar_incapacidad(
    incapacidad_id: int,
    data: HCMIncapacidadUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    inc = await db.get(HCMIncapacidad, incapacidad_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incapacidad no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(inc, k, v)
    await db.commit()
    await db.refresh(inc)
    colab = await db.get(HCMColaborador, inc.colaborador_id)
    return HCMIncapacidadResponse(
        id=inc.id, colaborador_id=inc.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        tipo_incapacidad=inc.tipo_incapacidad, diagnostico=inc.diagnostico,
        entidad_emisora=inc.entidad_emisora,
        fecha_inicio=inc.fecha_inicio, fecha_fin=inc.fecha_fin,
        dias=inc.dias, costo_empresa=inc.costo_empresa, costo_eps=inc.costo_eps,
        archivo_url=inc.archivo_url, estado=inc.estado,
        notas=inc.notas, created_at=inc.created_at,
    )


# ─── VACACIONES ───────────────────────────────────────────────────────────────

@router.get("/vacaciones", response_model=List[HCMVacacionResponse])
async def listar_vacaciones(
    colaborador_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMVacacion)
    if colaborador_id:
        q = q.where(HCMVacacion.colaborador_id == colaborador_id)
    if estado:
        q = q.where(HCMVacacion.estado == estado)
    r = await db.execute(q.order_by(HCMVacacion.fecha_inicio.desc()))
    vacaciones = r.scalars().all()
    result = []
    for v in vacaciones:
        colab = await db.get(HCMColaborador, v.colaborador_id)
        result.append(HCMVacacionResponse(
            id=v.id, colaborador_id=v.colaborador_id,
            colaborador_nombre=_nombre_completo(colab) if colab else None,
            fecha_inicio=v.fecha_inicio, fecha_fin=v.fecha_fin,
            dias_disfrutados=v.dias_disfrutados, tipo=v.tipo,
            estado=v.estado, aprobado_por=v.aprobado_por,
            notas=v.notas, created_at=v.created_at,
        ))
    return result


@router.post("/vacaciones", response_model=HCMVacacionResponse, status_code=201)
async def crear_vacacion(
    data: HCMVacacionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    payload = data.model_dump()
    if payload["dias_disfrutados"] == 0:
        payload["dias_disfrutados"] = (payload["fecha_fin"] - payload["fecha_inicio"]).days + 1
    vac = HCMVacacion(**payload, estado="PENDIENTE")
    db.add(vac)
    await db.commit()
    await db.refresh(vac)
    colab = await db.get(HCMColaborador, vac.colaborador_id)
    return HCMVacacionResponse(
        id=vac.id, colaborador_id=vac.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        fecha_inicio=vac.fecha_inicio, fecha_fin=vac.fecha_fin,
        dias_disfrutados=vac.dias_disfrutados, tipo=vac.tipo,
        estado=vac.estado, aprobado_por=vac.aprobado_por,
        notas=vac.notas, created_at=vac.created_at,
    )


@router.put("/vacaciones/{vacacion_id}", response_model=HCMVacacionResponse)
async def actualizar_vacacion(
    vacacion_id: int,
    data: HCMVacacionUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    vac = await db.get(HCMVacacion, vacacion_id)
    if not vac:
        raise HTTPException(status_code=404, detail="Vacación no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(vac, k, v)
    await db.commit()
    await db.refresh(vac)
    colab = await db.get(HCMColaborador, vac.colaborador_id)
    return HCMVacacionResponse(
        id=vac.id, colaborador_id=vac.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        fecha_inicio=vac.fecha_inicio, fecha_fin=vac.fecha_fin,
        dias_disfrutados=vac.dias_disfrutados, tipo=vac.tipo,
        estado=vac.estado, aprobado_por=vac.aprobado_por,
        notas=vac.notas, created_at=vac.created_at,
    )


@router.post("/vacaciones/{vacacion_id}/aprobar")
async def aprobar_vacacion(
    vacacion_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    vac = await db.get(HCMVacacion, vacacion_id)
    if not vac:
        raise HTTPException(status_code=404, detail="Vacación no encontrada")
    vac.estado = "APROBADA"
    vac.aprobado_por = current_user.username
    await db.commit()
    return {"mensaje": "Vacación aprobada"}


@router.post("/vacaciones/{vacacion_id}/rechazar")
async def rechazar_vacacion(
    vacacion_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    vac = await db.get(HCMVacacion, vacacion_id)
    if not vac:
        raise HTTPException(status_code=404, detail="Vacación no encontrada")
    vac.estado = "RECHAZADA"
    await db.commit()
    return {"mensaje": "Vacación rechazada"}


# ─── RECLUTAMIENTO — Vacantes ─────────────────────────────────────────────────

@router.get("/reclutamiento/vacantes", response_model=List[HCMVacanteResponse])
async def listar_vacantes(
    empresa_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMVacante)
    if empresa_id:
        q = q.where(HCMVacante.empresa_id == empresa_id)
    if estado:
        q = q.where(HCMVacante.estado == estado)
    r = await db.execute(q.order_by(HCMVacante.fecha_apertura.desc()))
    vacantes = r.scalars().all()
    result = []
    for v in vacantes:
        cargo = await db.get(HCMCargo, v.cargo_id) if v.cargo_id else None
        result.append(HCMVacanteResponse(
            id=v.id, empresa_id=v.empresa_id, cargo_id=v.cargo_id,
            cargo_nombre=cargo.nombre if cargo else None,
            titulo=v.titulo, num_vacantes=v.num_vacantes,
            descripcion=v.descripcion, requisitos=v.requisitos,
            salario_min=v.salario_min, salario_max=v.salario_max,
            fecha_apertura=v.fecha_apertura, fecha_cierre=v.fecha_cierre,
            estado=v.estado, tipo_contrato=v.tipo_contrato,
            modalidad=v.modalidad, created_at=v.created_at,
        ))
    return result


@router.post("/reclutamiento/vacantes", response_model=HCMVacanteResponse, status_code=201)
async def crear_vacante(
    data: HCMVacanteCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    vacante = HCMVacante(**data.model_dump(), estado="ABIERTA")
    db.add(vacante)
    await db.commit()
    await db.refresh(vacante)
    cargo = await db.get(HCMCargo, vacante.cargo_id) if vacante.cargo_id else None
    return HCMVacanteResponse(
        id=vacante.id, empresa_id=vacante.empresa_id, cargo_id=vacante.cargo_id,
        cargo_nombre=cargo.nombre if cargo else None,
        titulo=vacante.titulo, num_vacantes=vacante.num_vacantes,
        descripcion=vacante.descripcion, requisitos=vacante.requisitos,
        salario_min=vacante.salario_min, salario_max=vacante.salario_max,
        fecha_apertura=vacante.fecha_apertura, fecha_cierre=vacante.fecha_cierre,
        estado=vacante.estado, tipo_contrato=vacante.tipo_contrato,
        modalidad=vacante.modalidad, created_at=vacante.created_at,
    )


@router.put("/reclutamiento/vacantes/{vacante_id}", response_model=HCMVacanteResponse)
async def actualizar_vacante(
    vacante_id: int,
    data: HCMVacanteUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    vacante = await db.get(HCMVacante, vacante_id)
    if not vacante:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(vacante, k, v)
    await db.commit()
    await db.refresh(vacante)
    cargo = await db.get(HCMCargo, vacante.cargo_id) if vacante.cargo_id else None
    return HCMVacanteResponse(
        id=vacante.id, empresa_id=vacante.empresa_id, cargo_id=vacante.cargo_id,
        cargo_nombre=cargo.nombre if cargo else None,
        titulo=vacante.titulo, num_vacantes=vacante.num_vacantes,
        descripcion=vacante.descripcion, requisitos=vacante.requisitos,
        salario_min=vacante.salario_min, salario_max=vacante.salario_max,
        fecha_apertura=vacante.fecha_apertura, fecha_cierre=vacante.fecha_cierre,
        estado=vacante.estado, tipo_contrato=vacante.tipo_contrato,
        modalidad=vacante.modalidad, created_at=vacante.created_at,
    )


# ─── RECLUTAMIENTO — Postulaciones ───────────────────────────────────────────

@router.get("/reclutamiento/postulaciones", response_model=List[HCMPostulacionResponse])
async def listar_postulaciones(
    vacante_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMPostulacion)
    if vacante_id:
        q = q.where(HCMPostulacion.vacante_id == vacante_id)
    if estado:
        q = q.where(HCMPostulacion.estado == estado)
    r = await db.execute(q.order_by(HCMPostulacion.created_at.desc()))
    postulaciones = r.scalars().all()
    result = []
    for p in postulaciones:
        vacante = await db.get(HCMVacante, p.vacante_id)
        result.append(HCMPostulacionResponse(
            id=p.id, vacante_id=p.vacante_id,
            vacante_titulo=vacante.titulo if vacante else None,
            nombres=p.nombres, apellidos=p.apellidos, email=p.email,
            telefono=p.telefono, cv_url=p.cv_url,
            fecha_postulacion=p.fecha_postulacion,
            estado=p.estado, puntuacion=p.puntuacion,
            notas=p.notas, created_at=p.created_at,
        ))
    return result


@router.post("/reclutamiento/postulaciones", response_model=HCMPostulacionResponse, status_code=201)
async def crear_postulacion(
    data: HCMPostulacionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    post = HCMPostulacion(**data.model_dump(), estado="NUEVA", fecha_postulacion=date.today())
    db.add(post)
    await db.commit()
    await db.refresh(post)
    vacante = await db.get(HCMVacante, post.vacante_id)
    return HCMPostulacionResponse(
        id=post.id, vacante_id=post.vacante_id,
        vacante_titulo=vacante.titulo if vacante else None,
        nombres=post.nombres, apellidos=post.apellidos, email=post.email,
        telefono=post.telefono, cv_url=post.cv_url,
        fecha_postulacion=post.fecha_postulacion,
        estado=post.estado, puntuacion=post.puntuacion,
        notas=post.notas, created_at=post.created_at,
    )


@router.put("/reclutamiento/postulaciones/{postulacion_id}", response_model=HCMPostulacionResponse)
async def actualizar_postulacion(
    postulacion_id: int,
    data: HCMPostulacionUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    post = await db.get(HCMPostulacion, postulacion_id)
    if not post:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(post, k, v)
    await db.commit()
    await db.refresh(post)
    vacante = await db.get(HCMVacante, post.vacante_id)
    return HCMPostulacionResponse(
        id=post.id, vacante_id=post.vacante_id,
        vacante_titulo=vacante.titulo if vacante else None,
        nombres=post.nombres, apellidos=post.apellidos, email=post.email,
        telefono=post.telefono, cv_url=post.cv_url,
        fecha_postulacion=post.fecha_postulacion,
        estado=post.estado, puntuacion=post.puntuacion,
        notas=post.notas, created_at=post.created_at,
    )


# ─── RECLUTAMIENTO — Entrevistas ──────────────────────────────────────────────

@router.get("/reclutamiento/entrevistas", response_model=List[HCMEntrevistaResponse])
async def listar_entrevistas(
    postulacion_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMEntrevista)
    if postulacion_id:
        q = q.where(HCMEntrevista.postulacion_id == postulacion_id)
    r = await db.execute(q.order_by(HCMEntrevista.fecha.desc()))
    entrevistas = r.scalars().all()
    result = []
    for e in entrevistas:
        post = await db.get(HCMPostulacion, e.postulacion_id)
        result.append(HCMEntrevistaResponse(
            id=e.id, postulacion_id=e.postulacion_id,
            postulante_nombre=f"{post.nombres} {post.apellidos}" if post else None,
            fecha=e.fecha, tipo=e.tipo, entrevistador=e.entrevistador,
            resultado=e.resultado, calificacion=e.calificacion,
            notas=e.notas, created_at=e.created_at,
        ))
    return result


@router.post("/reclutamiento/entrevistas", response_model=HCMEntrevistaResponse, status_code=201)
async def crear_entrevista(
    data: HCMEntrevistaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ent = HCMEntrevista(**data.model_dump())
    db.add(ent)
    await db.commit()
    await db.refresh(ent)
    post = await db.get(HCMPostulacion, ent.postulacion_id)
    return HCMEntrevistaResponse(
        id=ent.id, postulacion_id=ent.postulacion_id,
        postulante_nombre=f"{post.nombres} {post.apellidos}" if post else None,
        fecha=ent.fecha, tipo=ent.tipo, entrevistador=ent.entrevistador,
        resultado=ent.resultado, calificacion=ent.calificacion,
        notas=ent.notas, created_at=ent.created_at,
    )


@router.put("/reclutamiento/entrevistas/{entrevista_id}", response_model=HCMEntrevistaResponse)
async def actualizar_entrevista(
    entrevista_id: int,
    data: HCMEntrevistaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ent = await db.get(HCMEntrevista, entrevista_id)
    if not ent:
        raise HTTPException(status_code=404, detail="Entrevista no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(ent, k, v)
    await db.commit()
    await db.refresh(ent)
    post = await db.get(HCMPostulacion, ent.postulacion_id)
    return HCMEntrevistaResponse(
        id=ent.id, postulacion_id=ent.postulacion_id,
        postulante_nombre=f"{post.nombres} {post.apellidos}" if post else None,
        fecha=ent.fecha, tipo=ent.tipo, entrevistador=ent.entrevistador,
        resultado=ent.resultado, calificacion=ent.calificacion,
        notas=ent.notas, created_at=ent.created_at,
    )


# ─── EVALUACIONES ─────────────────────────────────────────────────────────────

@router.get("/evaluaciones", response_model=List[HCMEvaluacionResponse])
async def listar_evaluaciones(
    colaborador_id: Optional[int] = None,
    estado: Optional[str] = None,
    tipo_evaluacion: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMEvaluacion)
    if colaborador_id:
        q = q.where(HCMEvaluacion.colaborador_id == colaborador_id)
    if estado:
        q = q.where(HCMEvaluacion.estado == estado)
    if tipo_evaluacion:
        q = q.where(HCMEvaluacion.tipo_evaluacion == tipo_evaluacion)
    r = await db.execute(q.order_by(HCMEvaluacion.fecha.desc()))
    evaluaciones = r.scalars().all()
    result = []
    for ev in evaluaciones:
        colab = await db.get(HCMColaborador, ev.colaborador_id)
        evaluador = await db.get(HCMColaborador, ev.evaluador_id) if ev.evaluador_id else None
        result.append(HCMEvaluacionResponse(
            id=ev.id, colaborador_id=ev.colaborador_id,
            colaborador_nombre=_nombre_completo(colab) if colab else None,
            periodo=ev.periodo, tipo_evaluacion=ev.tipo_evaluacion,
            evaluador_id=ev.evaluador_id,
            evaluador_nombre=_nombre_completo(evaluador) if evaluador else None,
            fecha=ev.fecha, calificacion_total=ev.calificacion_total,
            estado=ev.estado, notas=ev.notas, created_at=ev.created_at,
        ))
    return result


@router.post("/evaluaciones", response_model=HCMEvaluacionResponse, status_code=201)
async def crear_evaluacion(
    data: HCMEvaluacionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ev = HCMEvaluacion(**data.model_dump(), estado="PENDIENTE")
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    colab = await db.get(HCMColaborador, ev.colaborador_id)
    return HCMEvaluacionResponse(
        id=ev.id, colaborador_id=ev.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        periodo=ev.periodo, tipo_evaluacion=ev.tipo_evaluacion,
        evaluador_id=ev.evaluador_id, evaluador_nombre=None,
        fecha=ev.fecha, calificacion_total=ev.calificacion_total,
        estado=ev.estado, notas=ev.notas, created_at=ev.created_at,
    )


@router.put("/evaluaciones/{evaluacion_id}", response_model=HCMEvaluacionResponse)
async def actualizar_evaluacion(
    evaluacion_id: int,
    data: HCMEvaluacionUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ev = await db.get(HCMEvaluacion, evaluacion_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(ev, k, v)
    await db.commit()
    await db.refresh(ev)
    colab = await db.get(HCMColaborador, ev.colaborador_id)
    evaluador = await db.get(HCMColaborador, ev.evaluador_id) if ev.evaluador_id else None
    return HCMEvaluacionResponse(
        id=ev.id, colaborador_id=ev.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        periodo=ev.periodo, tipo_evaluacion=ev.tipo_evaluacion,
        evaluador_id=ev.evaluador_id,
        evaluador_nombre=_nombre_completo(evaluador) if evaluador else None,
        fecha=ev.fecha, calificacion_total=ev.calificacion_total,
        estado=ev.estado, notas=ev.notas, created_at=ev.created_at,
    )


@router.get("/evaluaciones/{evaluacion_id}/detalles", response_model=List[HCMEvaluacionDetalleResponse])
async def listar_detalles_evaluacion(
    evaluacion_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    r = await db.execute(
        select(HCMEvaluacionDetalle).where(HCMEvaluacionDetalle.evaluacion_id == evaluacion_id)
    )
    return r.scalars().all()


@router.post("/evaluaciones/{evaluacion_id}/detalles/bulk", response_model=List[HCMEvaluacionDetalleResponse])
async def crear_detalles_evaluacion(
    evaluacion_id: int,
    data: HCMEvaluacionDetallesBulk,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ev = await db.get(HCMEvaluacion, evaluacion_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")

    # Eliminar detalles existentes antes de re-insertar
    from sqlalchemy import delete as sa_delete
    await db.execute(sa_delete(HCMEvaluacionDetalle).where(HCMEvaluacionDetalle.evaluacion_id == evaluacion_id))

    detalles = []
    suma_pond = 0.0
    suma_pesos = 0.0
    for d in data.detalles:
        det = HCMEvaluacionDetalle(**d.model_dump())
        det.evaluacion_id = evaluacion_id
        db.add(det)
        detalles.append(det)
        suma_pond += d.calificacion * d.peso
        suma_pesos += d.peso

    # Calcular calificación total ponderada
    if suma_pesos > 0:
        ev.calificacion_total = round(suma_pond / suma_pesos, 2)
        ev.estado = "COMPLETADA"

    await db.commit()
    for det in detalles:
        await db.refresh(det)
    return detalles


# ─── CAPACITACIONES ───────────────────────────────────────────────────────────

@router.get("/capacitaciones", response_model=List[HCMCapacitacionResponse])
async def listar_capacitaciones(
    empresa_id: Optional[int] = None,
    activo: Optional[bool] = None,
    aplica_conductores: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMCapacitacion)
    if empresa_id:
        q = q.where(HCMCapacitacion.empresa_id == empresa_id)
    if activo is not None:
        q = q.where(HCMCapacitacion.activo == activo)
    if aplica_conductores is not None:
        q = q.where(HCMCapacitacion.aplica_conductores == aplica_conductores)
    r = await db.execute(q.order_by(HCMCapacitacion.nombre))
    return r.scalars().all()


@router.post("/capacitaciones", response_model=HCMCapacitacionResponse, status_code=201)
async def crear_capacitacion(
    data: HCMCapacitacionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    cap = HCMCapacitacion(**data.model_dump(), activo=True)
    db.add(cap)
    await db.commit()
    await db.refresh(cap)
    return cap


@router.put("/capacitaciones/{capacitacion_id}", response_model=HCMCapacitacionResponse)
async def actualizar_capacitacion(
    capacitacion_id: int,
    data: HCMCapacitacionUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    cap = await db.get(HCMCapacitacion, capacitacion_id)
    if not cap:
        raise HTTPException(status_code=404, detail="Capacitación no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cap, k, v)
    await db.commit()
    await db.refresh(cap)
    return cap


@router.post("/capacitaciones/{capacitacion_id}/asignar", response_model=List[HCMColaboradorCapacitacionResponse])
async def asignar_capacitacion(
    capacitacion_id: int,
    data: HCMCapacitacionAsignarRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    cap = await db.get(HCMCapacitacion, capacitacion_id)
    if not cap:
        raise HTTPException(status_code=404, detail="Capacitación no encontrada")

    result = []
    for colab_id in data.colaborador_ids:
        existing_r = await db.execute(
            select(HCMColaboradorCapacitacion).where(
                HCMColaboradorCapacitacion.colaborador_id == colab_id,
                HCMColaboradorCapacitacion.capacitacion_id == capacitacion_id,
            )
        )
        if existing_r.scalar_one_or_none():
            continue
        asig = HCMColaboradorCapacitacion(
            colaborador_id=colab_id,
            capacitacion_id=capacitacion_id,
            estado="PENDIENTE",
        )
        db.add(asig)
        result.append(asig)

    await db.commit()
    for a in result:
        await db.refresh(a)

    responses = []
    for a in result:
        colab = await db.get(HCMColaborador, a.colaborador_id)
        responses.append(HCMColaboradorCapacitacionResponse(
            id=a.id, colaborador_id=a.colaborador_id,
            colaborador_nombre=_nombre_completo(colab) if colab else None,
            capacitacion_id=a.capacitacion_id,
            capacitacion_nombre=cap.nombre,
            estado=a.estado, fecha_completado=a.fecha_completado,
            calificacion=a.calificacion, certificado_url=a.certificado_url,
            fecha_vencimiento=a.fecha_vencimiento, notas=a.notas,
            created_at=a.created_at,
        ))
    return responses


@router.get("/capacitaciones/asignaciones", response_model=List[HCMColaboradorCapacitacionResponse])
async def listar_asignaciones_capacitacion(
    capacitacion_id: Optional[int] = None,
    colaborador_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMColaboradorCapacitacion)
    if capacitacion_id:
        q = q.where(HCMColaboradorCapacitacion.capacitacion_id == capacitacion_id)
    if colaborador_id:
        q = q.where(HCMColaboradorCapacitacion.colaborador_id == colaborador_id)
    if estado:
        q = q.where(HCMColaboradorCapacitacion.estado == estado)
    r = await db.execute(q)
    asignaciones = r.scalars().all()
    result = []
    for a in asignaciones:
        colab = await db.get(HCMColaborador, a.colaborador_id)
        cap = await db.get(HCMCapacitacion, a.capacitacion_id)
        result.append(HCMColaboradorCapacitacionResponse(
            id=a.id, colaborador_id=a.colaborador_id,
            colaborador_nombre=_nombre_completo(colab) if colab else None,
            capacitacion_id=a.capacitacion_id,
            capacitacion_nombre=cap.nombre if cap else None,
            estado=a.estado, fecha_completado=a.fecha_completado,
            calificacion=a.calificacion, certificado_url=a.certificado_url,
            fecha_vencimiento=a.fecha_vencimiento, notas=a.notas,
            created_at=a.created_at,
        ))
    return result


@router.post("/capacitaciones/asignaciones/{asignacion_id}/completar", response_model=HCMColaboradorCapacitacionResponse)
async def completar_asignacion(
    asignacion_id: int,
    data: HCMColaboradorCapacitacionUpdateCompletar,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    asig = await db.get(HCMColaboradorCapacitacion, asignacion_id)
    if not asig:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    asig.estado = "COMPLETADO"
    asig.fecha_completado = date.today()
    if data.calificacion is not None:
        asig.calificacion = data.calificacion
    if data.fecha_vencimiento is not None:
        asig.fecha_vencimiento = data.fecha_vencimiento
    await db.commit()
    await db.refresh(asig)
    colab = await db.get(HCMColaborador, asig.colaborador_id)
    cap = await db.get(HCMCapacitacion, asig.capacitacion_id)
    return HCMColaboradorCapacitacionResponse(
        id=asig.id, colaborador_id=asig.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        capacitacion_id=asig.capacitacion_id,
        capacitacion_nombre=cap.nombre if cap else None,
        estado=asig.estado, fecha_completado=asig.fecha_completado,
        calificacion=asig.calificacion, certificado_url=asig.certificado_url,
        fecha_vencimiento=asig.fecha_vencimiento, notas=asig.notas,
        created_at=asig.created_at,
    )


# ─── SST — Incidentes ─────────────────────────────────────────────────────────

@router.get("/sst/incidentes", response_model=List[HCMSSTIncidenteResponse])
async def listar_incidentes(
    empresa_id: Optional[int] = None,
    tipo_sst: Optional[str] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMSSTIncidente)
    if empresa_id:
        q = q.where(HCMSSTIncidente.empresa_id == empresa_id)
    if tipo_sst:
        q = q.where(HCMSSTIncidente.tipo_sst == tipo_sst)
    if estado:
        q = q.where(HCMSSTIncidente.estado == estado)
    r = await db.execute(q.order_by(HCMSSTIncidente.fecha.desc()))
    incidentes = r.scalars().all()
    result = []
    for inc in incidentes:
        colab = await db.get(HCMColaborador, inc.colaborador_id) if inc.colaborador_id else None
        result.append(HCMSSTIncidenteResponse(
            id=inc.id, empresa_id=inc.empresa_id, sede_id=inc.sede_id,
            colaborador_id=inc.colaborador_id,
            colaborador_nombre=_nombre_completo(colab) if colab else None,
            fecha=inc.fecha, tipo_sst=inc.tipo_sst, descripcion=inc.descripcion,
            causa=inc.causa, consecuencias=inc.consecuencias,
            dias_incapacidad=inc.dias_incapacidad, investigado=inc.investigado,
            medidas_correctivas=inc.medidas_correctivas,
            estado=inc.estado, archivo_url=inc.archivo_url, created_at=inc.created_at,
        ))
    return result


@router.post("/sst/incidentes", response_model=HCMSSTIncidenteResponse, status_code=201)
async def crear_incidente(
    data: HCMSSTIncidenteCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    inc = HCMSSTIncidente(**data.model_dump(), investigado=False, estado="ABIERTO")
    db.add(inc)
    await db.commit()
    await db.refresh(inc)
    colab = await db.get(HCMColaborador, inc.colaborador_id) if inc.colaborador_id else None
    return HCMSSTIncidenteResponse(
        id=inc.id, empresa_id=inc.empresa_id, sede_id=inc.sede_id,
        colaborador_id=inc.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        fecha=inc.fecha, tipo_sst=inc.tipo_sst, descripcion=inc.descripcion,
        causa=inc.causa, consecuencias=inc.consecuencias,
        dias_incapacidad=inc.dias_incapacidad, investigado=inc.investigado,
        medidas_correctivas=inc.medidas_correctivas,
        estado=inc.estado, archivo_url=None, created_at=inc.created_at,
    )


@router.put("/sst/incidentes/{incidente_id}", response_model=HCMSSTIncidenteResponse)
async def actualizar_incidente(
    incidente_id: int,
    data: HCMSSTIncidenteUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    inc = await db.get(HCMSSTIncidente, incidente_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(inc, k, v)
    await db.commit()
    await db.refresh(inc)
    colab = await db.get(HCMColaborador, inc.colaborador_id) if inc.colaborador_id else None
    return HCMSSTIncidenteResponse(
        id=inc.id, empresa_id=inc.empresa_id, sede_id=inc.sede_id,
        colaborador_id=inc.colaborador_id,
        colaborador_nombre=_nombre_completo(colab) if colab else None,
        fecha=inc.fecha, tipo_sst=inc.tipo_sst, descripcion=inc.descripcion,
        causa=inc.causa, consecuencias=inc.consecuencias,
        dias_incapacidad=inc.dias_incapacidad, investigado=inc.investigado,
        medidas_correctivas=inc.medidas_correctivas,
        estado=inc.estado, archivo_url=inc.archivo_url, created_at=inc.created_at,
    )


# ─── SST — Riesgos ────────────────────────────────────────────────────────────

@router.get("/sst/riesgos", response_model=List[HCMSSTRiesgoResponse])
async def listar_riesgos(
    empresa_id: Optional[int] = None,
    area_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMSSTRiesgo)
    if empresa_id:
        q = q.where(HCMSSTRiesgo.empresa_id == empresa_id)
    if area_id:
        q = q.where(HCMSSTRiesgo.area_id == area_id)
    if estado:
        q = q.where(HCMSSTRiesgo.estado == estado)
    r = await db.execute(q.order_by(HCMSSTRiesgo.nivel_riesgo.desc()))
    riesgos = r.scalars().all()
    result = []
    for riesgo in riesgos:
        area = await db.get(HCMArea, riesgo.area_id) if riesgo.area_id else None
        responsable = await db.get(HCMColaborador, riesgo.responsable_id) if riesgo.responsable_id else None
        result.append(HCMSSTRiesgoResponse(
            id=riesgo.id, empresa_id=riesgo.empresa_id, area_id=riesgo.area_id,
            area_nombre=area.nombre if area else None,
            fuente=riesgo.fuente, descripcion=riesgo.descripcion,
            probabilidad=riesgo.probabilidad, impacto=riesgo.impacto,
            nivel_riesgo=riesgo.nivel_riesgo, control=riesgo.control,
            responsable_id=riesgo.responsable_id,
            responsable_nombre=_nombre_completo(responsable) if responsable else None,
            fecha_revision=riesgo.fecha_revision,
            estado=riesgo.estado, created_at=riesgo.created_at,
        ))
    return result


@router.post("/sst/riesgos", response_model=HCMSSTRiesgoResponse, status_code=201)
async def crear_riesgo(
    data: HCMSSTRiesgoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    payload = data.model_dump()
    payload["nivel_riesgo"] = payload["probabilidad"] * payload["impacto"]
    riesgo = HCMSSTRiesgo(**payload, estado="ACTIVO")
    db.add(riesgo)
    await db.commit()
    await db.refresh(riesgo)
    area = await db.get(HCMArea, riesgo.area_id) if riesgo.area_id else None
    responsable = await db.get(HCMColaborador, riesgo.responsable_id) if riesgo.responsable_id else None
    return HCMSSTRiesgoResponse(
        id=riesgo.id, empresa_id=riesgo.empresa_id, area_id=riesgo.area_id,
        area_nombre=area.nombre if area else None,
        fuente=riesgo.fuente, descripcion=riesgo.descripcion,
        probabilidad=riesgo.probabilidad, impacto=riesgo.impacto,
        nivel_riesgo=riesgo.nivel_riesgo, control=riesgo.control,
        responsable_id=riesgo.responsable_id,
        responsable_nombre=_nombre_completo(responsable) if responsable else None,
        fecha_revision=riesgo.fecha_revision,
        estado=riesgo.estado, created_at=riesgo.created_at,
    )


@router.put("/sst/riesgos/{riesgo_id}", response_model=HCMSSTRiesgoResponse)
async def actualizar_riesgo(
    riesgo_id: int,
    data: HCMSSTRiesgoUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    riesgo = await db.get(HCMSSTRiesgo, riesgo_id)
    if not riesgo:
        raise HTTPException(status_code=404, detail="Riesgo no encontrado")
    payload = data.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(riesgo, k, v)
    if "probabilidad" in payload or "impacto" in payload:
        riesgo.nivel_riesgo = riesgo.probabilidad * riesgo.impacto
    await db.commit()
    await db.refresh(riesgo)
    area = await db.get(HCMArea, riesgo.area_id) if riesgo.area_id else None
    responsable = await db.get(HCMColaborador, riesgo.responsable_id) if riesgo.responsable_id else None
    return HCMSSTRiesgoResponse(
        id=riesgo.id, empresa_id=riesgo.empresa_id, area_id=riesgo.area_id,
        area_nombre=area.nombre if area else None,
        fuente=riesgo.fuente, descripcion=riesgo.descripcion,
        probabilidad=riesgo.probabilidad, impacto=riesgo.impacto,
        nivel_riesgo=riesgo.nivel_riesgo, control=riesgo.control,
        responsable_id=riesgo.responsable_id,
        responsable_nombre=_nombre_completo(responsable) if responsable else None,
        fecha_revision=riesgo.fecha_revision,
        estado=riesgo.estado, created_at=riesgo.created_at,
    )


# ─── SST — Inspecciones ───────────────────────────────────────────────────────

@router.get("/sst/inspecciones", response_model=List[HCMSSTInspeccionResponse])
async def listar_inspecciones(
    empresa_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(HCMSSTInspeccion)
    if empresa_id:
        q = q.where(HCMSSTInspeccion.empresa_id == empresa_id)
    if estado:
        q = q.where(HCMSSTInspeccion.estado == estado)
    r = await db.execute(q.order_by(HCMSSTInspeccion.fecha.desc()))
    inspecciones = r.scalars().all()
    result = []
    for ins in inspecciones:
        inspector = await db.get(HCMColaborador, ins.inspector_id) if ins.inspector_id else None
        result.append(HCMSSTInspeccionResponse(
            id=ins.id, empresa_id=ins.empresa_id, sede_id=ins.sede_id,
            fecha=ins.fecha, tipo=ins.tipo, inspector_id=ins.inspector_id,
            inspector_nombre=_nombre_completo(inspector) if inspector else None,
            hallazgos=ins.hallazgos, acciones=ins.acciones,
            estado=ins.estado, archivo_url=ins.archivo_url, created_at=ins.created_at,
        ))
    return result


@router.post("/sst/inspecciones", response_model=HCMSSTInspeccionResponse, status_code=201)
async def crear_inspeccion(
    data: HCMSSTInspeccionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ins = HCMSSTInspeccion(**data.model_dump(), estado="PROGRAMADA")
    db.add(ins)
    await db.commit()
    await db.refresh(ins)
    inspector = await db.get(HCMColaborador, ins.inspector_id) if ins.inspector_id else None
    return HCMSSTInspeccionResponse(
        id=ins.id, empresa_id=ins.empresa_id, sede_id=ins.sede_id,
        fecha=ins.fecha, tipo=ins.tipo, inspector_id=ins.inspector_id,
        inspector_nombre=_nombre_completo(inspector) if inspector else None,
        hallazgos=ins.hallazgos, acciones=ins.acciones,
        estado=ins.estado, archivo_url=None, created_at=ins.created_at,
    )


@router.put("/sst/inspecciones/{inspeccion_id}", response_model=HCMSSTInspeccionResponse)
async def actualizar_inspeccion(
    inspeccion_id: int,
    data: HCMSSTInspeccionUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ins = await db.get(HCMSSTInspeccion, inspeccion_id)
    if not ins:
        raise HTTPException(status_code=404, detail="Inspección no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(ins, k, v)
    await db.commit()
    await db.refresh(ins)
    inspector = await db.get(HCMColaborador, ins.inspector_id) if ins.inspector_id else None
    return HCMSSTInspeccionResponse(
        id=ins.id, empresa_id=ins.empresa_id, sede_id=ins.sede_id,
        fecha=ins.fecha, tipo=ins.tipo, inspector_id=ins.inspector_id,
        inspector_nombre=_nombre_completo(inspector) if inspector else None,
        hallazgos=ins.hallazgos, acciones=ins.acciones,
        estado=ins.estado, archivo_url=ins.archivo_url, created_at=ins.created_at,
    )
