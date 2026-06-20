from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from decimal import Decimal

from app.core.database import get_db
from app.infrastructure.models.crm import (
    CRMEjecutivoComercial, CRMCliente, CRMContacto, CRMLead,
    CRMOportunidad, CRMCotizacion, CRMCotizacionItem, CRMContrato,
    CRMContratoSLA, CRMTicket, CRMInteraccion, CRMCampana, CRMCampanaCliente,
    CRMEncuesta, CRMCuentaClave, CRMObjetivoComercial, CRMActividad,
    CRMRiesgoCliente, CRMSaludCliente, CRMKPIDiario,
    EstadoClienteEnum, TipoClienteEnum, SegmentoClienteEnum,
    EstadoLeadEnum, EstadoOportunidadEnum, EstadoCotizacionEnum,
    EstadoContratoEnum, EstadoTicketEnum, TipoTicketEnum,
    TipoInteraccionEnum, TipoCampanaEnum, TipoEncuestaEnum, NivelRiesgoClienteEnum,
)

router = APIRouter(prefix="/crm", tags=["CRM"])


# ──────────────────────────────────────────
# SCHEMAS
# ──────────────────────────────────────────

class EjecutivoCreate(BaseModel):
    codigo: str
    nombre: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    region: Optional[str] = None
    meta_anual: Optional[Decimal] = None

class EjecutivoResponse(EjecutivoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool


class ClienteCreate(BaseModel):
    codigo: str
    razon_social: str
    nit: Optional[str] = None
    tipo: TipoClienteEnum = TipoClienteEnum.EMPRESA
    segmento: Optional[SegmentoClienteEnum] = None
    estado: EstadoClienteEnum = EstadoClienteEnum.PROSPECTO
    industria: Optional[str] = None
    pais: str = "Colombia"
    ciudad: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    sitio_web: Optional[str] = None
    ejecutivo_id: Optional[int] = None
    potencial_anual: Optional[Decimal] = None
    notas: Optional[str] = None

class ClienteResponse(ClienteCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ingresos_ytd: Decimal
    health_score: int
    lead_score: int
    activo: bool


class ContactoCreate(BaseModel):
    cliente_id: int
    nombre: str
    cargo: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    linkedin: Optional[str] = None
    es_decisor: bool = False
    es_principal: bool = False

class ContactoResponse(ContactoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool


class LeadCreate(BaseModel):
    codigo: str
    cliente_id: Optional[int] = None
    ejecutivo_id: Optional[int] = None
    empresa: str
    contacto: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    fuente: Optional[str] = None
    industria: Optional[str] = None
    estado: EstadoLeadEnum = EstadoLeadEnum.FRIO
    score: int = 0
    potencial: Optional[Decimal] = None
    notas: Optional[str] = None

class LeadResponse(LeadCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    convertido: bool


class OportunidadCreate(BaseModel):
    codigo: str
    cliente_id: int
    lead_id: Optional[int] = None
    ejecutivo_id: Optional[int] = None
    nombre: str
    descripcion: Optional[str] = None
    estado: EstadoOportunidadEnum = EstadoOportunidadEnum.IDENTIFICACION
    probabilidad: int = 10
    valor_estimado: Optional[Decimal] = None
    servicio: Optional[str] = None
    fecha_esperada: Optional[date] = None

class OportunidadResponse(OportunidadCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    valor_contratado: Optional[Decimal]
    fecha_cierre: Optional[date]
    motivo_perdida: Optional[str]


class CotizacionCreate(BaseModel):
    codigo: str
    oportunidad_id: Optional[int] = None
    cliente_id: int
    ejecutivo_id: Optional[int] = None
    estado: EstadoCotizacionEnum = EstadoCotizacionEnum.BORRADOR
    validez_dias: int = 30
    notas: Optional[str] = None

class CotizacionResponse(CotizacionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    version: int
    subtotal: Decimal
    iva: Decimal
    total: Decimal
    fecha_envio: Optional[date]
    fecha_vencimiento: Optional[date]


class ContratoCreate(BaseModel):
    codigo: str
    cliente_id: int
    oportunidad_id: Optional[int] = None
    ejecutivo_id: Optional[int] = None
    nombre: str
    estado: EstadoContratoEnum = EstadoContratoEnum.BORRADOR
    tipo_servicio: Optional[str] = None
    valor_mensual: Optional[Decimal] = None
    valor_total: Optional[Decimal] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    duracion_meses: Optional[int] = None
    auto_renovacion: bool = False
    notas: Optional[str] = None

class ContratoResponse(ContratoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class TicketCreate(BaseModel):
    codigo: str
    cliente_id: int
    contrato_id: Optional[int] = None
    contacto_id: Optional[int] = None
    ejecutivo_id: Optional[int] = None
    tipo: TipoTicketEnum = TipoTicketEnum.SOLICITUD
    estado: EstadoTicketEnum = EstadoTicketEnum.ABIERTO
    prioridad: str = "MEDIA"
    asunto: str
    descripcion: Optional[str] = None
    canal: Optional[str] = None

class TicketResponse(TicketCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha_limite: Optional[datetime]
    fecha_resolucion: Optional[datetime]
    tiempo_respuesta_hrs: Optional[Decimal]
    tiempo_solucion_hrs: Optional[Decimal]
    satisfaccion: Optional[int]


class InteraccionCreate(BaseModel):
    cliente_id: int
    contacto_id: Optional[int] = None
    ticket_id: Optional[int] = None
    oportunidad_id: Optional[int] = None
    ejecutivo_id: Optional[int] = None
    tipo: TipoInteraccionEnum
    asunto: Optional[str] = None
    descripcion: Optional[str] = None
    duracion_min: Optional[int] = None
    resultado: Optional[str] = None
    proximo_paso: Optional[str] = None
    fecha_interaccion: Optional[datetime] = None

class InteraccionResponse(InteraccionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class EncuestaCreate(BaseModel):
    codigo: str
    cliente_id: int
    ticket_id: Optional[int] = None
    tipo: TipoEncuestaEnum
    puntaje: Optional[int] = None
    comentario: Optional[str] = None

class EncuestaResponse(EncuestaCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    respondida: bool
    fecha_envio: Optional[date]
    fecha_respuesta: Optional[date]


class KPIDiarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha: date
    total_clientes: int
    clientes_activos: int
    total_leads: int
    leads_calientes: int
    pipeline_valor: Decimal
    oportunidades_activas: int
    tasa_conversion: Decimal
    win_rate: Decimal
    tickets_abiertos: int
    tickets_escalados: int
    nps_promedio: Decimal
    csat_promedio: Decimal
    contratos_activos: int
    contratos_por_vencer: int
    ingresos_mes: Decimal
    churn_rate: Decimal


# ──────────────────────────────────────────
# ENDPOINTS — EJECUTIVOS
# ──────────────────────────────────────────

@router.get("/ejecutivos", response_model=List[EjecutivoResponse])
async def listar_ejecutivos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CRMEjecutivoComercial).where(CRMEjecutivoComercial.activo == True))
    return result.scalars().all()

@router.post("/ejecutivos", response_model=EjecutivoResponse)
async def crear_ejecutivo(data: EjecutivoCreate, db: AsyncSession = Depends(get_db)):
    obj = CRMEjecutivoComercial(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/ejecutivos/{id}", response_model=EjecutivoResponse)
async def obtener_ejecutivo(id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(CRMEjecutivoComercial, id)
    if not obj:
        raise HTTPException(404, "Ejecutivo no encontrado")
    return obj


# ──────────────────────────────────────────
# ENDPOINTS — CLIENTES
# ──────────────────────────────────────────

@router.get("/clientes", response_model=List[ClienteResponse])
async def listar_clientes(
    estado: Optional[str] = None,
    segmento: Optional[str] = None,
    ejecutivo_id: Optional[int] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CRMCliente).where(CRMCliente.activo == True)
    if estado:
        stmt = stmt.where(CRMCliente.estado == estado)
    if segmento:
        stmt = stmt.where(CRMCliente.segmento == segmento)
    if ejecutivo_id:
        stmt = stmt.where(CRMCliente.ejecutivo_id == ejecutivo_id)
    if q:
        stmt = stmt.where(CRMCliente.razon_social.ilike(f"%{q}%"))
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/clientes", response_model=ClienteResponse)
async def crear_cliente(data: ClienteCreate, db: AsyncSession = Depends(get_db)):
    obj = CRMCliente(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.get("/clientes/{id}", response_model=ClienteResponse)
async def obtener_cliente(id: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(CRMCliente, id)
    if not obj:
        raise HTTPException(404, "Cliente no encontrado")
    return obj

@router.put("/clientes/{id}", response_model=ClienteResponse)
async def actualizar_cliente(id: int, data: ClienteCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(CRMCliente, id)
    if not obj:
        raise HTTPException(404, "Cliente no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


# ──────────────────────────────────────────
# ENDPOINTS — CONTACTOS
# ──────────────────────────────────────────

@router.get("/contactos", response_model=List[ContactoResponse])
async def listar_contactos(cliente_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(CRMContacto).where(CRMContacto.activo == True)
    if cliente_id:
        stmt = stmt.where(CRMContacto.cliente_id == cliente_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/contactos", response_model=ContactoResponse)
async def crear_contacto(data: ContactoCreate, db: AsyncSession = Depends(get_db)):
    obj = CRMContacto(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ──────────────────────────────────────────
# ENDPOINTS — LEADS
# ──────────────────────────────────────────

@router.get("/leads", response_model=List[LeadResponse])
async def listar_leads(
    estado: Optional[str] = None,
    ejecutivo_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CRMLead)
    if estado:
        stmt = stmt.where(CRMLead.estado == estado)
    if ejecutivo_id:
        stmt = stmt.where(CRMLead.ejecutivo_id == ejecutivo_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/leads", response_model=LeadResponse)
async def crear_lead(data: LeadCreate, db: AsyncSession = Depends(get_db)):
    obj = CRMLead(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.put("/leads/{id}", response_model=LeadResponse)
async def actualizar_lead(id: int, data: LeadCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(CRMLead, id)
    if not obj:
        raise HTTPException(404, "Lead no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


# ──────────────────────────────────────────
# ENDPOINTS — OPORTUNIDADES
# ──────────────────────────────────────────

@router.get("/oportunidades", response_model=List[OportunidadResponse])
async def listar_oportunidades(
    estado: Optional[str] = None,
    cliente_id: Optional[int] = None,
    ejecutivo_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CRMOportunidad)
    if estado:
        stmt = stmt.where(CRMOportunidad.estado == estado)
    if cliente_id:
        stmt = stmt.where(CRMOportunidad.cliente_id == cliente_id)
    if ejecutivo_id:
        stmt = stmt.where(CRMOportunidad.ejecutivo_id == ejecutivo_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/oportunidades", response_model=OportunidadResponse)
async def crear_oportunidad(data: OportunidadCreate, db: AsyncSession = Depends(get_db)):
    obj = CRMOportunidad(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.put("/oportunidades/{id}/estado")
async def actualizar_estado_oportunidad(id: int, estado: str, db: AsyncSession = Depends(get_db)):
    obj = await db.get(CRMOportunidad, id)
    if not obj:
        raise HTTPException(404, "Oportunidad no encontrada")
    obj.estado = estado
    await db.commit()
    return {"ok": True}


# ──────────────────────────────────────────
# ENDPOINTS — COTIZACIONES
# ──────────────────────────────────────────

@router.get("/cotizaciones", response_model=List[CotizacionResponse])
async def listar_cotizaciones(
    estado: Optional[str] = None,
    cliente_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CRMCotizacion)
    if estado:
        stmt = stmt.where(CRMCotizacion.estado == estado)
    if cliente_id:
        stmt = stmt.where(CRMCotizacion.cliente_id == cliente_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/cotizaciones", response_model=CotizacionResponse)
async def crear_cotizacion(data: CotizacionCreate, db: AsyncSession = Depends(get_db)):
    obj = CRMCotizacion(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ──────────────────────────────────────────
# ENDPOINTS — CONTRATOS
# ──────────────────────────────────────────

@router.get("/contratos", response_model=List[ContratoResponse])
async def listar_contratos(
    estado: Optional[str] = None,
    cliente_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CRMContrato)
    if estado:
        stmt = stmt.where(CRMContrato.estado == estado)
    if cliente_id:
        stmt = stmt.where(CRMContrato.cliente_id == cliente_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/contratos", response_model=ContratoResponse)
async def crear_contrato(data: ContratoCreate, db: AsyncSession = Depends(get_db)):
    obj = CRMContrato(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.put("/contratos/{id}", response_model=ContratoResponse)
async def actualizar_contrato(id: int, data: ContratoCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.get(CRMContrato, id)
    if not obj:
        raise HTTPException(404, "Contrato no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


# ──────────────────────────────────────────
# ENDPOINTS — TICKETS
# ──────────────────────────────────────────

@router.get("/tickets", response_model=List[TicketResponse])
async def listar_tickets(
    estado: Optional[str] = None,
    cliente_id: Optional[int] = None,
    tipo: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CRMTicket)
    if estado:
        stmt = stmt.where(CRMTicket.estado == estado)
    if cliente_id:
        stmt = stmt.where(CRMTicket.cliente_id == cliente_id)
    if tipo:
        stmt = stmt.where(CRMTicket.tipo == tipo)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/tickets", response_model=TicketResponse)
async def crear_ticket(data: TicketCreate, db: AsyncSession = Depends(get_db)):
    obj = CRMTicket(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.put("/tickets/{id}/estado")
async def actualizar_estado_ticket(id: int, estado: str, db: AsyncSession = Depends(get_db)):
    obj = await db.get(CRMTicket, id)
    if not obj:
        raise HTTPException(404, "Ticket no encontrado")
    obj.estado = estado
    await db.commit()
    return {"ok": True}


# ──────────────────────────────────────────
# ENDPOINTS — INTERACCIONES
# ──────────────────────────────────────────

@router.get("/interacciones", response_model=List[InteraccionResponse])
async def listar_interacciones(
    cliente_id: Optional[int] = None,
    tipo: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CRMInteraccion).order_by(CRMInteraccion.created_at.desc())
    if cliente_id:
        stmt = stmt.where(CRMInteraccion.cliente_id == cliente_id)
    if tipo:
        stmt = stmt.where(CRMInteraccion.tipo == tipo)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/interacciones", response_model=InteraccionResponse)
async def crear_interaccion(data: InteraccionCreate, db: AsyncSession = Depends(get_db)):
    obj = CRMInteraccion(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ──────────────────────────────────────────
# ENDPOINTS — ENCUESTAS
# ──────────────────────────────────────────

@router.get("/encuestas", response_model=List[EncuestaResponse])
async def listar_encuestas(
    cliente_id: Optional[int] = None,
    tipo: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CRMEncuesta)
    if cliente_id:
        stmt = stmt.where(CRMEncuesta.cliente_id == cliente_id)
    if tipo:
        stmt = stmt.where(CRMEncuesta.tipo == tipo)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/encuestas", response_model=EncuestaResponse)
async def crear_encuesta(data: EncuestaCreate, db: AsyncSession = Depends(get_db)):
    obj = CRMEncuesta(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ──────────────────────────────────────────
# ENDPOINTS — KPIs
# ──────────────────────────────────────────

@router.get("/kpis/dashboard")
async def kpis_dashboard(db: AsyncSession = Depends(get_db)):
    total_clientes = (await db.execute(select(func.count()).select_from(CRMCliente).where(CRMCliente.activo == True))).scalar_one()
    clientes_activos = (await db.execute(select(func.count()).select_from(CRMCliente).where(CRMCliente.estado == 'CLIENTE_ACTIVO'))).scalar_one()
    total_leads = (await db.execute(select(func.count()).select_from(CRMLead))).scalar_one()
    leads_calientes = (await db.execute(select(func.count()).select_from(CRMLead).where(CRMLead.estado == 'CALIENTE'))).scalar_one()
    oportunidades_activas = (await db.execute(select(func.count()).select_from(CRMOportunidad).where(CRMOportunidad.estado.not_in(['CIERRE_GANADO', 'CIERRE_PERDIDO'])))).scalar_one()
    tickets_abiertos = (await db.execute(select(func.count()).select_from(CRMTicket).where(CRMTicket.estado == 'ABIERTO'))).scalar_one()
    tickets_escalados = (await db.execute(select(func.count()).select_from(CRMTicket).where(CRMTicket.estado == 'ESCALADO'))).scalar_one()
    contratos_activos = (await db.execute(select(func.count()).select_from(CRMContrato).where(CRMContrato.estado == 'ACTIVO'))).scalar_one()
    return {
        "total_clientes": total_clientes,
        "clientes_activos": clientes_activos,
        "total_leads": total_leads,
        "leads_calientes": leads_calientes,
        "oportunidades_activas": oportunidades_activas,
        "tickets_abiertos": tickets_abiertos,
        "tickets_escalados": tickets_escalados,
        "contratos_activos": contratos_activos,
    }

@router.get("/kpis/diarios", response_model=List[KPIDiarioResponse])
async def kpis_diarios(
    limit: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CRMKPIDiario).order_by(CRMKPIDiario.fecha.desc()).limit(limit)
    )
    return result.scalars().all()
