from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, Column, Integer, String, Boolean
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime, timezone
from app.core.database import get_db, Base
from app.core.dependencies import get_current_user, require_operador, require_supervisor
from app.infrastructure.models.manifiesto import Manifiesto, EstadoManifiesto, ManifiestoHistorial, TipoCambioEstado
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/manifiestos", tags=["Manifiestos"])


class ClienteManifiesto(Base):
    __tablename__ = "clientes_manifiestos"
    __table_args__ = {"extend_existing": True}
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False, unique=True)
    nit = Column(String(50), nullable=True)
    activo = Column(Boolean, nullable=False, default=True)


class ClienteCreate(BaseModel):
    nombre: str
    nit: Optional[str] = None


class ClienteResponse(BaseModel):
    id: int
    nombre: str
    nit: Optional[str] = None
    activo: bool
    model_config = {"from_attributes": True}


# Transiciones de corrección permitidas (hacia atrás).
# Solo SUPERVISOR y ADMIN pueden ejecutarlas.
_REVERT_TRANS: dict[EstadoManifiesto, EstadoManifiesto] = {
    EstadoManifiesto.EN_CARGUE:   EstadoManifiesto.PROGRAMADO,
    EstadoManifiesto.EN_TRANSITO: EstadoManifiesto.EN_CARGUE,
    EstadoManifiesto.ENTREGADO:   EstadoManifiesto.EN_TRANSITO,
    EstadoManifiesto.CANCELADO:   EstadoManifiesto.PROGRAMADO,
    EstadoManifiesto.CON_NOVEDAD: EstadoManifiesto.EN_TRANSITO,
}


class RevertirEstadoRequest(BaseModel):
    observacion: str


class ManifiestoCreate(BaseModel):
    numero: str
    vehiculo_id: int
    conductor_id: Optional[int] = None
    origen_id: int
    destino_id: int
    cliente_nombre: Optional[str] = None
    cliente_nit: Optional[str] = None
    fecha_programada: date
    observaciones: Optional[str] = None


class ManifiestoResponse(BaseModel):
    id: int
    numero: str
    vehiculo_id: int
    conductor_id: Optional[int] = None
    origen_id: int
    destino_id: int
    cliente_nombre: Optional[str] = None
    cliente_nit: Optional[str] = None
    fecha_programada: date
    fecha_salida: Optional[datetime] = None
    fecha_llegada: Optional[datetime] = None
    estado: EstadoManifiesto
    total_estibas_cargadas: int
    total_estibas_descargadas: int
    observaciones: Optional[str] = None

    model_config = {"from_attributes": True}


@router.get("/", response_model=List[ManifiestoResponse])
async def listar_manifiestos(
    estado: Optional[EstadoManifiesto] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    query = select(Manifiesto).offset(skip).limit(limit).order_by(Manifiesto.fecha_programada.desc())
    if estado:
        query = query.where(Manifiesto.estado == estado)
    if fecha_desde:
        query = query.where(Manifiesto.fecha_programada >= fecha_desde)
    if fecha_hasta:
        query = query.where(Manifiesto.fecha_programada <= fecha_hasta)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/", response_model=ManifiestoResponse, status_code=201)
async def crear_manifiesto(
    data: ManifiestoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_operador),
):
    existing = await db.execute(select(Manifiesto).where(Manifiesto.numero == data.numero))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"El manifiesto {data.numero} ya existe")

    manifiesto = Manifiesto(**data.model_dump(), usuario_creacion_id=current_user.id)
    db.add(manifiesto)
    await db.flush()
    await db.refresh(manifiesto)
    return manifiesto


# ── Clientes de manifiestos ───────────────────────────────────────────────────

@router.get("/clientes", response_model=List[ClienteResponse])
async def listar_clientes(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(ClienteManifiesto)
        .where(ClienteManifiesto.activo == True)
        .order_by(ClienteManifiesto.nombre)
    )
    return list(result.scalars().all())


@router.post("/clientes", response_model=ClienteResponse, status_code=201)
async def crear_cliente(
    data: ClienteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_operador),
):
    nombre = data.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")
    existing = await db.execute(
        select(ClienteManifiesto).where(ClienteManifiesto.nombre == nombre)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe un cliente con ese nombre")
    cliente = ClienteManifiesto(nombre=nombre, nit=data.nit)
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.delete("/clientes/{cliente_id}", status_code=204)
async def eliminar_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_operador),
):
    cliente = await db.get(ClienteManifiesto, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    cliente.activo = False
    await db.commit()


@router.get("/{manifiesto_id}", response_model=ManifiestoResponse)
async def obtener_manifiesto(
    manifiesto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Manifiesto).where(Manifiesto.id == manifiesto_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Manifiesto no encontrado")
    return m


@router.patch("/{manifiesto_id}/estado")
async def cambiar_estado_manifiesto(
    manifiesto_id: int,
    nuevo_estado: EstadoManifiesto,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_operador),
):
    result = await db.execute(select(Manifiesto).where(Manifiesto.id == manifiesto_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Manifiesto no encontrado")
    estado_anterior = m.estado
    m.estado = nuevo_estado
    if nuevo_estado == EstadoManifiesto.EN_TRANSITO and not m.fecha_salida:
        m.fecha_salida = datetime.now(timezone.utc)
    if nuevo_estado == EstadoManifiesto.ENTREGADO and not m.fecha_llegada:
        m.fecha_llegada = datetime.now(timezone.utc)

    db.add(ManifiestoHistorial(
        manifiesto_id=manifiesto_id,
        estado_anterior=estado_anterior.value,
        estado_nuevo=nuevo_estado.value,
        tipo_cambio=TipoCambioEstado.AVANCE,
        usuario_id=current_user.id,
    ))
    await db.flush()
    return {"message": "Estado actualizado", "estado": nuevo_estado}


@router.post("/{manifiesto_id}/estado/revertir")
async def revertir_estado_manifiesto(
    manifiesto_id: int,
    data: RevertirEstadoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_supervisor),
):
    """Corrige un estado registrado por error. Solo SUPERVISOR y ADMIN.
    La observación es obligatoria para dejar trazabilidad del motivo."""
    if not data.observacion or not data.observacion.strip():
        raise HTTPException(status_code=400, detail="La observación es obligatoria para corregir un estado")

    result = await db.execute(select(Manifiesto).where(Manifiesto.id == manifiesto_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Manifiesto no encontrado")

    estado_anterior = m.estado
    estado_destino = _REVERT_TRANS.get(estado_anterior)
    if not estado_destino:
        raise HTTPException(
            status_code=400,
            detail=f"El estado '{estado_anterior.value}' no puede ser revertido",
        )

    m.estado = estado_destino

    # Limpiar fechas automáticas que ya no aplican
    if estado_anterior == EstadoManifiesto.EN_TRANSITO:
        m.fecha_salida = None
    if estado_anterior == EstadoManifiesto.ENTREGADO:
        m.fecha_llegada = None

    db.add(ManifiestoHistorial(
        manifiesto_id=manifiesto_id,
        estado_anterior=estado_anterior.value,
        estado_nuevo=estado_destino.value,
        tipo_cambio=TipoCambioEstado.CORRECCION,
        observacion=data.observacion.strip(),
        usuario_id=current_user.id,
    ))
    await db.flush()
    return {
        "message": "Estado corregido",
        "estado_anterior": estado_anterior.value,
        "estado": estado_destino.value,
    }


@router.get("/{manifiesto_id}/historial")
async def historial_manifiesto(
    manifiesto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(ManifiestoHistorial)
        .where(ManifiestoHistorial.manifiesto_id == manifiesto_id)
        .options(selectinload(ManifiestoHistorial.usuario))
        .order_by(ManifiestoHistorial.fecha.desc())
    )
    registros = list(result.scalars().all())
    return [
        {
            "id":              r.id,
            "estado_anterior": r.estado_anterior,
            "estado_nuevo":    r.estado_nuevo,
            "tipo_cambio":     r.tipo_cambio.value,
            "observacion":     r.observacion,
            "usuario":         f"{r.usuario.nombre} {r.usuario.apellido}" if r.usuario else "Sistema",
            "fecha":           r.fecha.isoformat(),
        }
        for r in registros
    ]


@router.get("/{manifiesto_id}/estibas")
async def estibas_en_manifiesto(
    manifiesto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    from sqlalchemy.orm import selectinload
    from app.infrastructure.models.movimiento import Movimiento, TipoMovimiento

    result = await db.execute(
        select(Movimiento)
        .where(Movimiento.manifiesto_id == manifiesto_id, Movimiento.tipo == TipoMovimiento.CARGA)
        .options(selectinload(Movimiento.estiba))
        .order_by(Movimiento.fecha_movimiento)
    )
    cargas = list(result.scalars().all())
    items = []
    for mov in cargas:
        if not mov.estiba:
            continue
        estiba = mov.estiba
        estado_val = estiba.estado.value if estiba.estado else "DESCONOCIDO"
        ya_descargada = estado_val not in ("EN_TRANSITO", "CARGADA")
        items.append({
            "estiba_id": estiba.id,
            "codigo_interno": estiba.codigo_interno,
            "estado_actual": estado_val,
            "fecha_carga": mov.fecha_movimiento.isoformat(),
            "ya_descargada": ya_descargada,
        })
    return items
