"""
API endpoints — WMS (Warehouse Management System)
Prefijo: /wms
"""
from datetime import date, datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, or_, Integer
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_supervisor
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.wms import (
    WMSTipoZona, WMSTipoUbicacion, WMSUnidadMedida, WMSMotivoMovimiento, WMSCategoriaProducto, WMSFamiliaProducto,
    WMSPais, WMSCiudad,
    WMSAlmacen, WMSZona, WMSUbicacion, WMSProducto, WMSLote, WMSSerie,
    WMSProveedor, WMSCliente, WMSTransportadora,
    WMSOrdenCompra, WMSOrdenCompraDetalle,
    WMSRecepcion, WMSRecepcionDetalle,
    WMSInventarioUbicacion, WMSMovimientoInventario,
    WMSConteoInventario, WMSConteoDetalle,
    WMSOrdenSalida, WMSOrdenSalidaDetalle,
    WMSPickingTarea, WMSPickingDetalle,
    WMSDespacho, WMSDespachoDetalle, WMSHistorialEstado,
    WMSDevolucion, WMSDevolucionDetalle,
    WMSEventoTrazabilidad, WMSKPIDiario,
)
from app.infrastructure.models.tms import TMSViaje, TipoServicioTMSEnum, EstadoViajeTMSEnum

# ─── WMS — revertir estado ────────────────────────────────────────────────────
_REVERT_DESPACHO_TRANS: dict[str, str] = {
    "LISTO":       "PREPARANDO",
    "EN_TRANSITO": "LISTO",
    "ENTREGADO":   "EN_TRANSITO",
    "INCIDENCIA":  "EN_TRANSITO",
}

# Transiciones de avance permitidas para un despacho
_DESPACHO_ESTADOS = {"PREPARANDO", "LISTO", "EN_TRANSITO", "ENTREGADO", "INCIDENCIA"}
_DESPACHO_TRANS_NEXT: dict[str, set[str]] = {
    "PREPARANDO":  {"LISTO", "INCIDENCIA"},
    "LISTO":       {"EN_TRANSITO", "INCIDENCIA"},
    "EN_TRANSITO": {"ENTREGADO", "INCIDENCIA"},
    "INCIDENCIA":  {"EN_TRANSITO", "LISTO"},
    "ENTREGADO":   set(),
}


class RevertirDespachoRequest(BaseModel):
    observacion: str
from app.application.schemas.wms import (
    WMSTipoZonaCreate, WMSTipoZonaUpdate, WMSTipoZonaResponse,
    WMSTipoUbicacionCreate, WMSTipoUbicacionUpdate, WMSTipoUbicacionResponse,
    WMSMotivoMovimientoCreate, WMSMotivoMovimientoUpdate, WMSMotivoMovimientoResponse,
    WMSUnidadMedidaCreate, WMSUnidadMedidaUpdate, WMSUnidadMedidaResponse,
    WMSCategoriaProductoCreate, WMSCategoriaProductoUpdate, WMSCategoriaProductoResponse,
    WMSFamiliaProductoCreate, WMSFamiliaProductoUpdate, WMSFamiliaProductoResponse,
    WMSPaisCreate, WMSPaisUpdate, WMSPaisResponse,
    WMSCiudadCreate, WMSCiudadUpdate, WMSCiudadResponse,
    WMSAlmacenCreate, WMSAlmacenUpdate, WMSAlmacenResponse,
    WMSZonaCreate, WMSZonaUpdate, WMSZonaResponse,
    WMSUbicacionCreate, WMSUbicacionUpdate, WMSUbicacionResponse,
    WMSProductoCreate, WMSProductoUpdate, WMSProductoResponse,
    WMSLoteCreate, WMSLoteUpdate, WMSLoteResponse,
    WMSSerieCreate, WMSSerieUpdate, WMSSerieResponse,
    WMSProveedorCreate, WMSProveedorUpdate, WMSProveedorResponse,
    WMSClienteCreate, WMSClienteUpdate, WMSClienteResponse,
    WMSTransportadoraCreate, WMSTransportadoraUpdate, WMSTransportadoraResponse,
    WMSOrdenCompraCreate, WMSOrdenCompraUpdate, WMSOrdenCompraResponse,
    WMSRecepcionCreate, WMSRecepcionUpdate, WMSRecepcionResponse,
    WMSInventarioResponse, WMSAjusteInventario, WMSTransferenciaInventario, WMSReservaBloqueo, WMSMovimientoResponse,
    WMSConteoCreate, WMSConteoUpdate, WMSConteoResponse, WMSConteoDetalleUpdate,
    WMSOrdenSalidaCreate, WMSOrdenSalidaUpdate, WMSOrdenSalidaEstado, WMSOrdenSalidaResponse,
    WMSPickingTareaCreate, WMSPickingTareaUpdate, WMSPickingTareaResponse, WMSPickingConfirmItem,
    WMSDespachoCreate, WMSDespachoDetalleCreate, WMSDespachoUpdate, WMSDespachoEstado, WMSDespachoResponse,
    WMSDevolucionCreate, WMSDevolucionUpdate, WMSDevolucionProcesar, WMSDevolucionResponse,
    WMSEventoTrazabilidadResponse,
    WMSKPIs, WMSAlertasResponse,
)

router = APIRouter(prefix="/wms", tags=["wms"])


# ─── Utilidades internas ───────────────────────────────────────────────────────

async def _registrar_evento(
    db: AsyncSession,
    tipo_evento: str,
    descripcion: str,
    entidad_tipo: Optional[str] = None,
    entidad_id: Optional[int] = None,
    usuario_id: Optional[int] = None,
    producto_id: Optional[int] = None,
    lote_id: Optional[int] = None,
    ubicacion_id: Optional[int] = None,
    datos: Optional[Dict[str, Any]] = None,
):
    ev = WMSEventoTrazabilidad(
        tipo_evento=tipo_evento,
        entidad_tipo=entidad_tipo,
        entidad_id=entidad_id,
        descripcion=descripcion,
        datos_adicionales=datos,
        usuario_id=usuario_id,
        producto_id=producto_id,
        lote_id=lote_id,
        ubicacion_id=ubicacion_id,
    )
    db.add(ev)


async def _ajustar_inventario(
    db: AsyncSession,
    producto_id: int,
    ubicacion_id: int,
    lote_id: Optional[int],
    delta: float,
):
    """Incrementa (delta>0) o decrementa (delta<0) stock disponible en ubicacion."""
    stmt = select(WMSInventarioUbicacion).where(
        and_(
            WMSInventarioUbicacion.producto_id == producto_id,
            WMSInventarioUbicacion.ubicacion_id == ubicacion_id,
            WMSInventarioUbicacion.lote_id == lote_id,
        )
    )
    r = await db.execute(stmt)
    inv = r.scalar_one_or_none()
    if inv is None:
        inv = WMSInventarioUbicacion(
            producto_id=producto_id,
            ubicacion_id=ubicacion_id,
            lote_id=lote_id,
            cantidad_disponible=max(0, delta),
        )
        db.add(inv)
    else:
        inv.cantidad_disponible = max(0, inv.cantidad_disponible + delta)


async def _next_numero(db: AsyncSession, Model, numero_col, prefix: str) -> str:
    """Genera un consecutivo único PREFIJO-AAAAMMDD-#### para un documento."""
    hoy = date.today().strftime("%Y%m%d")
    r = await db.execute(select(func.count(Model.id)))
    n = (r.scalar() or 0) + 1
    while True:
        candidato = f"{prefix}-{hoy}-{n:04d}"
        ex = await db.execute(select(Model.id).where(numero_col == candidato))
        if ex.first() is None:
            return candidato
        n += 1


async def _almacen_de_ubicacion(db: AsyncSession, ubicacion_id: int):
    """Devuelve el WMSAlmacen al que pertenece una ubicación (via zona)."""
    r = await db.execute(
        select(WMSAlmacen)
        .join(WMSZona, WMSAlmacen.id == WMSZona.almacen_id)
        .join(WMSUbicacion, WMSZona.id == WMSUbicacion.zona_id)
        .where(WMSUbicacion.id == ubicacion_id)
    )
    return r.scalar_one_or_none()


async def _bloquear_si_dependientes(db: AsyncSession, DepModel, fk_col, valor: int, etiqueta: str):
    """Lanza 409 si existen registros dependientes que impedirían el borrado."""
    r = await db.execute(select(func.count(DepModel.id)).where(fk_col == valor))
    n = r.scalar() or 0
    if n:
        raise HTTPException(409, f"No se puede eliminar: existen {n} {etiqueta} asociados")


# ─── CATÁLOGOS — Tipos de Zona ────────────────────────────────────────────────

def _simple_crud(Model, router, prefix, tag, SchemaCreate, SchemaUpdate, SchemaResponse):
    """Helper — genera CRUD genérico para catálogos simples sin relaciones."""
    pass  # se expande manualmente por endpoint

@router.get("/tipos-zona/", response_model=List[WMSTipoZonaResponse])
async def listar_tipos_zona(activo: Optional[bool] = None, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    q = select(WMSTipoZona)
    if activo is not None: q = q.where(WMSTipoZona.activo == activo)
    r = await db.execute(q.order_by(WMSTipoZona.nombre))
    return list(r.scalars().all())

@router.post("/tipos-zona/", response_model=WMSTipoZonaResponse, status_code=201)
async def crear_tipo_zona(data: WMSTipoZonaCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = WMSTipoZona(**data.model_dump()); db.add(obj); await db.flush(); await db.refresh(obj); return obj

@router.put("/tipos-zona/{id}", response_model=WMSTipoZonaResponse)
async def actualizar_tipo_zona(id: int, data: WMSTipoZonaUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSTipoZona).where(WMSTipoZona.id == id))
    obj = r.scalar_one_or_none()
    if not obj: raise HTTPException(404, "No encontrado")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    await db.flush(); await db.refresh(obj); return obj

@router.delete("/tipos-zona/{id}", status_code=204)
async def eliminar_tipo_zona(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSTipoZona).where(WMSTipoZona.id == id))
    obj = r.scalar_one_or_none()
    if obj: await db.delete(obj); await db.flush()


# ─── CATÁLOGOS — Tipos de Ubicación ───────────────────────────────────────────

@router.get("/tipos-ubicacion/", response_model=List[WMSTipoUbicacionResponse])
async def listar_tipos_ubicacion(activo: Optional[bool] = None, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    q = select(WMSTipoUbicacion)
    if activo is not None: q = q.where(WMSTipoUbicacion.activo == activo)
    r = await db.execute(q.order_by(WMSTipoUbicacion.nombre))
    return list(r.scalars().all())

@router.post("/tipos-ubicacion/", response_model=WMSTipoUbicacionResponse, status_code=201)
async def crear_tipo_ubicacion(data: WMSTipoUbicacionCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = WMSTipoUbicacion(**data.model_dump()); db.add(obj); await db.flush(); await db.refresh(obj); return obj

@router.put("/tipos-ubicacion/{id}", response_model=WMSTipoUbicacionResponse)
async def actualizar_tipo_ubicacion(id: int, data: WMSTipoUbicacionUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSTipoUbicacion).where(WMSTipoUbicacion.id == id))
    obj = r.scalar_one_or_none()
    if not obj: raise HTTPException(404, "No encontrado")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    await db.flush(); await db.refresh(obj); return obj

@router.delete("/tipos-ubicacion/{id}", status_code=204)
async def eliminar_tipo_ubicacion(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSTipoUbicacion).where(WMSTipoUbicacion.id == id))
    obj = r.scalar_one_or_none()
    if obj: await db.delete(obj); await db.flush()


# ─── CATÁLOGOS — Unidades de Medida ───────────────────────────────────────────

@router.get("/unidades-medida/", response_model=List[WMSUnidadMedidaResponse])
async def listar_unidades_medida(activo: Optional[bool] = None, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    q = select(WMSUnidadMedida)
    if activo is not None: q = q.where(WMSUnidadMedida.activo == activo)
    r = await db.execute(q.order_by(WMSUnidadMedida.nombre))
    return list(r.scalars().all())

@router.post("/unidades-medida/", response_model=WMSUnidadMedidaResponse, status_code=201)
async def crear_unidad_medida(data: WMSUnidadMedidaCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = WMSUnidadMedida(**data.model_dump()); db.add(obj); await db.flush(); await db.refresh(obj); return obj

@router.put("/unidades-medida/{id}", response_model=WMSUnidadMedidaResponse)
async def actualizar_unidad_medida(id: int, data: WMSUnidadMedidaUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSUnidadMedida).where(WMSUnidadMedida.id == id))
    obj = r.scalar_one_or_none()
    if not obj: raise HTTPException(404, "No encontrado")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    await db.flush(); await db.refresh(obj); return obj

@router.delete("/unidades-medida/{id}", status_code=204)
async def eliminar_unidad_medida(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSUnidadMedida).where(WMSUnidadMedida.id == id))
    obj = r.scalar_one_or_none()
    if obj: await db.delete(obj); await db.flush()


# ─── CATÁLOGOS — Motivos de Reserva/Bloqueo ───────────────────────────────────

@router.get("/motivos-movimiento/", response_model=List[WMSMotivoMovimientoResponse])
async def listar_motivos_movimiento(
    tipo: Optional[str] = None,
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(WMSMotivoMovimiento)
    if tipo:
        q = q.where(WMSMotivoMovimiento.tipo == tipo)
    if activo is not None:
        q = q.where(WMSMotivoMovimiento.activo == activo)
    r = await db.execute(q.order_by(WMSMotivoMovimiento.nombre))
    return r.scalars().all()

@router.post("/motivos-movimiento/", response_model=WMSMotivoMovimientoResponse, status_code=201)
async def crear_motivo_movimiento(data: WMSMotivoMovimientoCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = WMSMotivoMovimiento(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj

@router.put("/motivos-movimiento/{id}", response_model=WMSMotivoMovimientoResponse)
async def actualizar_motivo_movimiento(id: int, data: WMSMotivoMovimientoUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(WMSMotivoMovimiento, id)
    if not obj:
        raise HTTPException(404, "Motivo no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj

@router.delete("/motivos-movimiento/{id}", status_code=204)
async def eliminar_motivo_movimiento(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(WMSMotivoMovimiento, id)
    if obj:
        await db.delete(obj); await db.commit()


# ─── CATÁLOGOS — Categorías de Producto ───────────────────────────────────────

@router.get("/categorias-producto/", response_model=List[WMSCategoriaProductoResponse])
async def listar_categorias(activo: Optional[bool] = None, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    q = select(WMSCategoriaProducto)
    if activo is not None: q = q.where(WMSCategoriaProducto.activo == activo)
    r = await db.execute(q.order_by(WMSCategoriaProducto.nombre))
    return list(r.scalars().all())

@router.post("/categorias-producto/", response_model=WMSCategoriaProductoResponse, status_code=201)
async def crear_categoria(data: WMSCategoriaProductoCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = WMSCategoriaProducto(**data.model_dump()); db.add(obj); await db.flush(); await db.refresh(obj); return obj

@router.put("/categorias-producto/{id}", response_model=WMSCategoriaProductoResponse)
async def actualizar_categoria(id: int, data: WMSCategoriaProductoUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSCategoriaProducto).where(WMSCategoriaProducto.id == id))
    obj = r.scalar_one_or_none()
    if not obj: raise HTTPException(404, "No encontrado")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    await db.flush(); await db.refresh(obj); return obj

@router.delete("/categorias-producto/{id}", status_code=204)
async def eliminar_categoria(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSCategoriaProducto).where(WMSCategoriaProducto.id == id))
    obj = r.scalar_one_or_none()
    if obj:
        await _bloquear_si_dependientes(db, WMSFamiliaProducto, WMSFamiliaProducto.categoria_id, id, "familias")
        await db.delete(obj); await db.flush()


# ─── CATÁLOGOS — Familias de Producto ─────────────────────────────────────────

@router.get("/familias-producto/", response_model=List[WMSFamiliaProductoResponse])
async def listar_familias(
    activo: Optional[bool] = None,
    categoria_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(WMSFamiliaProducto).options(selectinload(WMSFamiliaProducto.categoria))
    if activo is not None: q = q.where(WMSFamiliaProducto.activo == activo)
    if categoria_id is not None: q = q.where(WMSFamiliaProducto.categoria_id == categoria_id)
    r = await db.execute(q.order_by(WMSFamiliaProducto.nombre))
    items = list(r.scalars().all())
    return [WMSFamiliaProductoResponse(id=f.id, nombre=f.nombre, categoria_id=f.categoria_id, activo=f.activo, categoria_nombre=f.categoria.nombre if f.categoria else None) for f in items]

@router.post("/familias-producto/", response_model=WMSFamiliaProductoResponse, status_code=201)
async def crear_familia(data: WMSFamiliaProductoCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = WMSFamiliaProducto(**data.model_dump()); db.add(obj); await db.flush()
    await db.refresh(obj)
    r = await db.execute(select(WMSCategoriaProducto).where(WMSCategoriaProducto.id == obj.categoria_id))
    cat = r.scalar_one_or_none()
    return WMSFamiliaProductoResponse(id=obj.id, nombre=obj.nombre, categoria_id=obj.categoria_id, activo=obj.activo, categoria_nombre=cat.nombre if cat else None)

@router.put("/familias-producto/{id}", response_model=WMSFamiliaProductoResponse)
async def actualizar_familia(id: int, data: WMSFamiliaProductoUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSFamiliaProducto).options(selectinload(WMSFamiliaProducto.categoria)).where(WMSFamiliaProducto.id == id))
    obj = r.scalar_one_or_none()
    if not obj: raise HTTPException(404, "No encontrado")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(obj, k, v)
    await db.flush(); await db.refresh(obj)
    r2 = await db.execute(select(WMSCategoriaProducto).where(WMSCategoriaProducto.id == obj.categoria_id))
    cat = r2.scalar_one_or_none()
    return WMSFamiliaProductoResponse(id=obj.id, nombre=obj.nombre, categoria_id=obj.categoria_id, activo=obj.activo, categoria_nombre=cat.nombre if cat else None)

@router.delete("/familias-producto/{id}", status_code=204)
async def eliminar_familia(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSFamiliaProducto).where(WMSFamiliaProducto.id == id))
    obj = r.scalar_one_or_none()
    if obj: await db.delete(obj); await db.flush()


# ─── CATÁLOGOS — Países ────────────────────────────────────────────────────────

@router.get("/paises/", response_model=List[WMSPaisResponse])
async def listar_paises(activo: Optional[bool] = None, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    q = select(WMSPais)
    if activo is not None:
        q = q.where(WMSPais.activo == activo)
    r = await db.execute(q.order_by(WMSPais.nombre))
    return list(r.scalars().all())

@router.post("/paises/", response_model=WMSPaisResponse, status_code=201)
async def crear_pais(data: WMSPaisCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = WMSPais(**data.model_dump())
    db.add(obj); await db.flush(); await db.refresh(obj)
    return obj

@router.put("/paises/{pais_id}", response_model=WMSPaisResponse)
async def actualizar_pais(pais_id: int, data: WMSPaisUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSPais).where(WMSPais.id == pais_id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "País no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.flush(); await db.refresh(obj)
    return obj

@router.delete("/paises/{pais_id}", status_code=204)
async def eliminar_pais(pais_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSPais).where(WMSPais.id == pais_id))
    obj = r.scalar_one_or_none()
    if obj:
        await _bloquear_si_dependientes(db, WMSCiudad, WMSCiudad.pais_id, pais_id, "ciudades")
        await db.delete(obj)
        await db.flush()


# ─── CATÁLOGOS — Ciudades ──────────────────────────────────────────────────────

@router.get("/ciudades/", response_model=List[WMSCiudadResponse])
async def listar_ciudades(
    activo: Optional[bool] = None,
    pais_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(WMSCiudad).options(selectinload(WMSCiudad.pais))
    if activo is not None:
        q = q.where(WMSCiudad.activo == activo)
    if pais_id is not None:
        q = q.where(WMSCiudad.pais_id == pais_id)
    r = await db.execute(q.order_by(WMSCiudad.nombre))
    items = list(r.scalars().all())
    return [
        WMSCiudadResponse(
            id=c.id, nombre=c.nombre, pais_id=c.pais_id,
            activo=c.activo, pais_nombre=c.pais.nombre if c.pais else None,
            created_at=c.created_at,
        )
        for c in items
    ]

@router.post("/ciudades/", response_model=WMSCiudadResponse, status_code=201)
async def crear_ciudad(data: WMSCiudadCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = WMSCiudad(**data.model_dump())
    db.add(obj); await db.flush()
    await db.refresh(obj)
    r = await db.execute(select(WMSPais).where(WMSPais.id == obj.pais_id))
    p = r.scalar_one_or_none()
    return WMSCiudadResponse(id=obj.id, nombre=obj.nombre, pais_id=obj.pais_id, activo=obj.activo, pais_nombre=p.nombre if p else None, created_at=obj.created_at)

@router.put("/ciudades/{ciudad_id}", response_model=WMSCiudadResponse)
async def actualizar_ciudad(ciudad_id: int, data: WMSCiudadUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSCiudad).options(selectinload(WMSCiudad.pais)).where(WMSCiudad.id == ciudad_id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Ciudad no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.flush(); await db.refresh(obj)
    r2 = await db.execute(select(WMSPais).where(WMSPais.id == obj.pais_id))
    p = r2.scalar_one_or_none()
    return WMSCiudadResponse(id=obj.id, nombre=obj.nombre, pais_id=obj.pais_id, activo=obj.activo, pais_nombre=p.nombre if p else None, created_at=obj.created_at)

@router.delete("/ciudades/{ciudad_id}", status_code=204)
async def eliminar_ciudad(ciudad_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.execute(select(WMSCiudad).where(WMSCiudad.id == ciudad_id))
    obj = r.scalar_one_or_none()
    if obj:
        await db.delete(obj)
        await db.flush()


# ─── CATÁLOGOS — Almacenes ─────────────────────────────────────────────────────

@router.get("/almacenes/", response_model=List[WMSAlmacenResponse])
async def listar_almacenes(
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(WMSAlmacen)
    if activo is not None:
        q = q.where(WMSAlmacen.activo == activo)
    r = await db.execute(q.order_by(WMSAlmacen.nombre))
    return r.scalars().all()


@router.post("/almacenes/", response_model=WMSAlmacenResponse, status_code=201)
async def crear_almacen(
    data: WMSAlmacenCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = WMSAlmacen(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.put("/almacenes/{almacen_id}", response_model=WMSAlmacenResponse)
async def actualizar_almacen(
    almacen_id: int,
    data: WMSAlmacenUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSAlmacen, almacen_id)
    if not obj:
        raise HTTPException(404, "Almacén no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/almacenes/{almacen_id}", status_code=204)
async def eliminar_almacen(
    almacen_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSAlmacen, almacen_id)
    if not obj:
        raise HTTPException(404, "Almacén no encontrado")
    await _bloquear_si_dependientes(db, WMSZona, WMSZona.almacen_id, almacen_id, "zonas")
    await db.delete(obj); await db.commit()


# ─── CATÁLOGOS — Zonas ────────────────────────────────────────────────────────

@router.get("/zonas/", response_model=List[WMSZonaResponse])
async def listar_zonas(
    almacen_id: Optional[int] = None,
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(WMSZona)
    if almacen_id:
        q = q.where(WMSZona.almacen_id == almacen_id)
    if activo is not None:
        q = q.where(WMSZona.activo == activo)
    r = await db.execute(q.order_by(WMSZona.codigo))
    return r.scalars().all()


@router.post("/zonas/", response_model=WMSZonaResponse, status_code=201)
async def crear_zona(
    data: WMSZonaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = WMSZona(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.put("/zonas/{zona_id}", response_model=WMSZonaResponse)
async def actualizar_zona(
    zona_id: int,
    data: WMSZonaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSZona, zona_id)
    if not obj:
        raise HTTPException(404, "Zona no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/zonas/{zona_id}", status_code=204)
async def eliminar_zona(
    zona_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSZona, zona_id)
    if not obj:
        raise HTTPException(404, "Zona no encontrada")
    await _bloquear_si_dependientes(db, WMSUbicacion, WMSUbicacion.zona_id, zona_id, "ubicaciones")
    await db.delete(obj); await db.commit()


# ─── CATÁLOGOS — Ubicaciones ──────────────────────────────────────────────────

@router.get("/ubicaciones/", response_model=List[WMSUbicacionResponse])
async def listar_ubicaciones(
    zona_id: Optional[int] = None,
    tipo: Optional[str] = None,
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(WMSUbicacion)
    if zona_id:
        q = q.where(WMSUbicacion.zona_id == zona_id)
    if tipo:
        q = q.where(WMSUbicacion.tipo == tipo)
    if activo is not None:
        q = q.where(WMSUbicacion.activo == activo)
    r = await db.execute(q.order_by(WMSUbicacion.codigo))
    return r.scalars().all()


@router.post("/ubicaciones/", response_model=WMSUbicacionResponse, status_code=201)
async def crear_ubicacion(
    data: WMSUbicacionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = WMSUbicacion(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.put("/ubicaciones/{ubicacion_id}", response_model=WMSUbicacionResponse)
async def actualizar_ubicacion(
    ubicacion_id: int,
    data: WMSUbicacionUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSUbicacion, ubicacion_id)
    if not obj:
        raise HTTPException(404, "Ubicación no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/ubicaciones/{ubicacion_id}", status_code=204)
async def eliminar_ubicacion(
    ubicacion_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSUbicacion, ubicacion_id)
    if not obj:
        raise HTTPException(404, "Ubicación no encontrada")
    await _bloquear_si_dependientes(db, WMSInventarioUbicacion, WMSInventarioUbicacion.ubicacion_id, ubicacion_id, "registros de inventario")
    await db.delete(obj); await db.commit()


# ─── CATÁLOGOS — Productos ────────────────────────────────────────────────────

@router.get("/productos/", response_model=List[WMSProductoResponse])
async def listar_productos(
    categoria: Optional[str] = None,
    activo: Optional[bool] = None,
    q: Optional[str] = Query(None, description="Buscar por SKU o nombre"),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    stmt = select(WMSProducto)
    if categoria:
        stmt = stmt.where(WMSProducto.categoria == categoria)
    if activo is not None:
        stmt = stmt.where(WMSProducto.activo == activo)
    if q:
        stmt = stmt.where(
            or_(WMSProducto.sku.ilike(f"%{q}%"), WMSProducto.nombre.ilike(f"%{q}%"))
        )
    r = await db.execute(stmt.order_by(WMSProducto.nombre))
    return r.scalars().all()


@router.post("/productos/", response_model=WMSProductoResponse, status_code=201)
async def crear_producto(
    data: WMSProductoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = WMSProducto(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.put("/productos/{producto_id}", response_model=WMSProductoResponse)
async def actualizar_producto(
    producto_id: int,
    data: WMSProductoUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSProducto, producto_id)
    if not obj:
        raise HTTPException(404, "Producto no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/productos/{producto_id}", status_code=204)
async def eliminar_producto(
    producto_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSProducto, producto_id)
    if not obj:
        raise HTTPException(404, "Producto no encontrado")
    await _bloquear_si_dependientes(db, WMSInventarioUbicacion, WMSInventarioUbicacion.producto_id, producto_id, "registros de inventario")
    await _bloquear_si_dependientes(db, WMSLote, WMSLote.producto_id, producto_id, "lotes")
    await db.delete(obj); await db.commit()


# ─── CATÁLOGOS — Lotes ────────────────────────────────────────────────────────

@router.get("/lotes/", response_model=List[WMSLoteResponse])
async def listar_lotes(
    producto_id: Optional[int] = None,
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(WMSLote)
    if producto_id:
        q = q.where(WMSLote.producto_id == producto_id)
    if activo is not None:
        q = q.where(WMSLote.activo == activo)
    r = await db.execute(q.order_by(WMSLote.numero_lote))
    return r.scalars().all()


@router.post("/lotes/", response_model=WMSLoteResponse, status_code=201)
async def crear_lote(
    data: WMSLoteCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = WMSLote(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.put("/lotes/{lote_id}", response_model=WMSLoteResponse)
async def actualizar_lote(
    lote_id: int,
    data: WMSLoteUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSLote, lote_id)
    if not obj:
        raise HTTPException(404, "Lote no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/lotes/{lote_id}", status_code=204)
async def eliminar_lote(
    lote_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSLote, lote_id)
    if not obj:
        raise HTTPException(404, "Lote no encontrado")
    await db.delete(obj); await db.commit()


# ─── CATÁLOGOS — Proveedores WMS ──────────────────────────────────────────────

@router.get("/proveedores/", response_model=List[WMSProveedorResponse])
async def listar_proveedores_wms(
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(WMSProveedor)
    if activo is not None:
        q = q.where(WMSProveedor.activo == activo)
    r = await db.execute(q.order_by(WMSProveedor.nombre))
    return r.scalars().all()


@router.post("/proveedores/", response_model=WMSProveedorResponse, status_code=201)
async def crear_proveedor_wms(
    data: WMSProveedorCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = WMSProveedor(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.put("/proveedores/{proveedor_id}", response_model=WMSProveedorResponse)
async def actualizar_proveedor_wms(
    proveedor_id: int,
    data: WMSProveedorUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSProveedor, proveedor_id)
    if not obj:
        raise HTTPException(404, "Proveedor no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/proveedores/{proveedor_id}", status_code=204)
async def eliminar_proveedor_wms(
    proveedor_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSProveedor, proveedor_id)
    if not obj:
        raise HTTPException(404, "Proveedor no encontrado")
    await db.delete(obj); await db.commit()


# ─── CATÁLOGOS — Clientes WMS ─────────────────────────────────────────────────

@router.get("/clientes/", response_model=List[WMSClienteResponse])
async def listar_clientes_wms(
    segmento: Optional[str] = None,
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(WMSCliente)
    if segmento:
        q = q.where(WMSCliente.segmento == segmento)
    if activo is not None:
        q = q.where(WMSCliente.activo == activo)
    r = await db.execute(q.order_by(WMSCliente.nombre))
    return r.scalars().all()


@router.post("/clientes/", response_model=WMSClienteResponse, status_code=201)
async def crear_cliente_wms(
    data: WMSClienteCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = WMSCliente(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.put("/clientes/{cliente_id}", response_model=WMSClienteResponse)
async def actualizar_cliente_wms(
    cliente_id: int,
    data: WMSClienteUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSCliente, cliente_id)
    if not obj:
        raise HTTPException(404, "Cliente no encontrado")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/clientes/{cliente_id}", status_code=204)
async def eliminar_cliente_wms(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSCliente, cliente_id)
    if not obj:
        raise HTTPException(404, "Cliente no encontrado")
    await db.delete(obj); await db.commit()


# ─── CATÁLOGOS — Transportadoras ──────────────────────────────────────────────

@router.get("/transportadoras/", response_model=List[WMSTransportadoraResponse])
async def listar_transportadoras(
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(WMSTransportadora)
    if activo is not None:
        q = q.where(WMSTransportadora.activo == activo)
    r = await db.execute(q.order_by(WMSTransportadora.nombre))
    return r.scalars().all()


@router.post("/transportadoras/", response_model=WMSTransportadoraResponse, status_code=201)
async def crear_transportadora(
    data: WMSTransportadoraCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = WMSTransportadora(**data.model_dump())
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.put("/transportadoras/{trans_id}", response_model=WMSTransportadoraResponse)
async def actualizar_transportadora(
    trans_id: int,
    data: WMSTransportadoraUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSTransportadora, trans_id)
    if not obj:
        raise HTTPException(404, "Transportadora no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/transportadoras/{trans_id}", status_code=204)
async def eliminar_transportadora(
    trans_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSTransportadora, trans_id)
    if not obj:
        raise HTTPException(404, "Transportadora no encontrada")
    await db.delete(obj); await db.commit()


# ─── INBOUND — Órdenes de Compra ──────────────────────────────────────────────

@router.get("/ordenes-compra/", response_model=List[WMSOrdenCompraResponse])
async def listar_ordenes_compra(
    estado: Optional[str] = None,
    proveedor_id: Optional[int] = None,
    almacen_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = (
        select(WMSOrdenCompra)
        .options(
            selectinload(WMSOrdenCompra.proveedor),
            selectinload(WMSOrdenCompra.almacen),
            selectinload(WMSOrdenCompra.detalles).selectinload(WMSOrdenCompraDetalle.producto),
        )
        .where(WMSOrdenCompra.deleted_at.is_(None))
    )
    if estado:
        q = q.where(WMSOrdenCompra.estado == estado)
    if proveedor_id:
        q = q.where(WMSOrdenCompra.proveedor_id == proveedor_id)
    if almacen_id:
        q = q.where(WMSOrdenCompra.almacen_id == almacen_id)
    r = await db.execute(q.order_by(WMSOrdenCompra.fecha_emision.desc()))
    return r.scalars().all()


@router.post("/ordenes-compra/", response_model=WMSOrdenCompraResponse, status_code=201)
async def crear_orden_compra(
    data: WMSOrdenCompraCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    payload = data.model_dump(exclude={"detalles"})
    if not payload.get("numero_oc"):
        payload["numero_oc"] = await _next_numero(db, WMSOrdenCompra, WMSOrdenCompra.numero_oc, "OC")
    if not payload.get("fecha_emision"):
        payload["fecha_emision"] = date.today()
    oc = WMSOrdenCompra(**payload)
    db.add(oc)
    await db.flush()
    for d in data.detalles:
        det = WMSOrdenCompraDetalle(orden_id=oc.id, **d.model_dump())
        db.add(det)
    await db.commit()
    r = await db.execute(
        select(WMSOrdenCompra)
        .options(
            selectinload(WMSOrdenCompra.proveedor),
            selectinload(WMSOrdenCompra.almacen),
            selectinload(WMSOrdenCompra.detalles).selectinload(WMSOrdenCompraDetalle.producto),
        )
        .where(WMSOrdenCompra.id == oc.id)
    )
    return r.scalar_one()


@router.put("/ordenes-compra/{oc_id}", response_model=WMSOrdenCompraResponse)
async def actualizar_orden_compra(
    oc_id: int,
    data: WMSOrdenCompraUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSOrdenCompra, oc_id)
    if not obj or obj.deleted_at:
        raise HTTPException(404, "Orden de compra no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit()
    r = await db.execute(
        select(WMSOrdenCompra)
        .options(
            selectinload(WMSOrdenCompra.proveedor),
            selectinload(WMSOrdenCompra.almacen),
            selectinload(WMSOrdenCompra.detalles).selectinload(WMSOrdenCompraDetalle.producto),
        )
        .where(WMSOrdenCompra.id == oc_id)
    )
    return r.scalar_one()


# ─── INBOUND — Recepciones ────────────────────────────────────────────────────

@router.get("/recepciones/", response_model=List[WMSRecepcionResponse])
async def listar_recepciones(
    estado: Optional[str] = None,
    almacen_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = (
        select(WMSRecepcion)
        .options(
            selectinload(WMSRecepcion.almacen),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.producto),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.lote),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.ubicacion),
        )
        .where(WMSRecepcion.deleted_at.is_(None))
    )
    if estado:
        q = q.where(WMSRecepcion.estado == estado)
    if almacen_id:
        q = q.where(WMSRecepcion.almacen_id == almacen_id)
    r = await db.execute(q.order_by(WMSRecepcion.fecha_recepcion.desc()))
    return r.scalars().all()


@router.post("/recepciones/", response_model=WMSRecepcionResponse, status_code=201)
async def crear_recepcion(
    data: WMSRecepcionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    payload = data.model_dump(exclude={"detalles"})
    if not payload.get("numero_recepcion"):
        payload["numero_recepcion"] = await _next_numero(db, WMSRecepcion, WMSRecepcion.numero_recepcion, "REC")
    if not payload.get("fecha_recepcion"):
        payload["fecha_recepcion"] = date.today()
    rec = WMSRecepcion(**payload, operario_id=current_user.id)
    db.add(rec)
    await db.flush()
    for d in data.detalles:
        if not d.producto_id:
            raise HTTPException(400, "Cada línea de recepción debe tener un producto válido")
        det = WMSRecepcionDetalle(recepcion_id=rec.id, **d.model_dump())
        db.add(det)
    await db.commit()
    r = await db.execute(
        select(WMSRecepcion)
        .options(
            selectinload(WMSRecepcion.almacen),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.producto),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.lote),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.ubicacion),
        )
        .where(WMSRecepcion.id == rec.id)
    )
    return r.scalar_one()


@router.put("/recepciones/{rec_id}", response_model=WMSRecepcionResponse)
async def actualizar_recepcion(
    rec_id: int,
    data: WMSRecepcionUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSRecepcion, rec_id)
    if not obj or obj.deleted_at:
        raise HTTPException(404, "Recepción no encontrada")
    if obj.estado == "COMPLETA":
        raise HTTPException(400, "No se puede modificar una recepción completa")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit()
    r = await db.execute(
        select(WMSRecepcion)
        .options(
            selectinload(WMSRecepcion.almacen),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.producto),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.lote),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.ubicacion),
        )
        .where(WMSRecepcion.id == rec_id)
    )
    return r.scalar_one()


@router.post("/recepciones/{rec_id}/completar", response_model=WMSRecepcionResponse)
async def completar_recepcion(
    rec_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Cierra la recepción (PUT_AWAY): actualiza inventario por ubicación para
    cada detalle con estado_calidad APROBADO y con ubicacion_id asignada.
    """
    r = await db.execute(
        select(WMSRecepcion)
        .options(
            selectinload(WMSRecepcion.almacen),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.producto),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.lote),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.ubicacion),
        )
        .where(WMSRecepcion.id == rec_id)
    )
    rec = r.scalar_one_or_none()
    if not rec or rec.deleted_at:
        raise HTTPException(404, "Recepción no encontrada")
    if rec.estado == "COMPLETA":
        raise HTTPException(400, "Recepción ya está completa")

    # Ubicación de recepción por defecto del almacén (fallback cuando el
    # detalle no trae ubicacion_id explícita), para garantizar el ingreso al stock.
    ubic_default_id: Optional[int] = None
    ub_r = await db.execute(
        select(WMSUbicacion.id)
        .join(WMSZona, WMSUbicacion.zona_id == WMSZona.id)
        .where(WMSZona.almacen_id == rec.almacen_id, WMSUbicacion.activo == True)
        .order_by(WMSUbicacion.id.asc())
        .limit(1)
    )
    ubic_default_id = ub_r.scalar_one_or_none()

    for det in rec.detalles:
        destino_ubic = det.ubicacion_id or ubic_default_id
        if det.estado_calidad == "APROBADO" and destino_ubic and det.cantidad_recibida > 0:
            if not det.ubicacion_id:
                det.ubicacion_id = destino_ubic
            await _ajustar_inventario(
                db, det.producto_id, destino_ubic, det.lote_id, det.cantidad_recibida
            )
            mov = WMSMovimientoInventario(
                tipo="RECEPCION",
                producto_id=det.producto_id,
                ubicacion_destino_id=destino_ubic,
                lote_id=det.lote_id,
                cantidad=det.cantidad_recibida,
                referencia_documento=rec.numero_recepcion,
                usuario_id=current_user.id,
                notas=f"Recepción {rec.numero_recepcion} completada",
            )
            db.add(mov)
            await _registrar_evento(
                db, "RECEPCION_COMPLETADA",
                f"Ingreso {det.cantidad_recibida} unidades de producto {det.producto_id}",
                entidad_tipo="WMSRecepcion", entidad_id=rec_id,
                usuario_id=current_user.id,
                producto_id=det.producto_id, lote_id=det.lote_id,
                ubicacion_id=destino_ubic,
            )
    rec.estado = "COMPLETA"

    # Actualizar OC si aplica: COMPLETA solo si todas las líneas quedan cubiertas.
    if rec.orden_compra_id:
        oc = await db.get(WMSOrdenCompra, rec.orden_compra_id)
        if oc:
            oc_dets_r = await db.execute(
                select(WMSOrdenCompraDetalle).where(WMSOrdenCompraDetalle.orden_id == oc.id)
            )
            oc_dets = oc_dets_r.scalars().all()
            for ocd in oc_dets:
                for det in rec.detalles:
                    if det.producto_id == ocd.producto_id:
                        ocd.cantidad_recibida = (ocd.cantidad_recibida or 0) + det.cantidad_recibida
            if oc_dets and all(
                (ocd.cantidad_recibida or 0) >= (ocd.cantidad_solicitada or 0) for ocd in oc_dets
            ):
                oc.estado = "COMPLETA"
            else:
                oc.estado = "PARCIAL"

    await db.commit()
    r2 = await db.execute(
        select(WMSRecepcion)
        .options(
            selectinload(WMSRecepcion.almacen),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.producto),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.lote),
            selectinload(WMSRecepcion.detalles).selectinload(WMSRecepcionDetalle.ubicacion),
        )
        .where(WMSRecepcion.id == rec_id)
    )
    return r2.scalar_one()


# ─── INVENTARIO ────────────────────────────────────────────────────────────────

@router.get("/inventario/", response_model=List[WMSInventarioResponse])
async def ver_inventario(
    almacen_id: Optional[int] = None,
    producto_id: Optional[int] = None,
    ubicacion_id: Optional[int] = None,
    lote_id: Optional[int] = None,
    zona: Optional[str] = None,
    producto: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = (
        select(WMSInventarioUbicacion)
        .options(
            selectinload(WMSInventarioUbicacion.producto),
            selectinload(WMSInventarioUbicacion.ubicacion),
            selectinload(WMSInventarioUbicacion.lote),
        )
    )
    if producto_id:
        q = q.where(WMSInventarioUbicacion.producto_id == producto_id)
    if ubicacion_id:
        q = q.where(WMSInventarioUbicacion.ubicacion_id == ubicacion_id)
    if lote_id:
        q = q.where(WMSInventarioUbicacion.lote_id == lote_id)
    if almacen_id or (zona and zona.strip()):
        q = q.join(WMSUbicacion, WMSInventarioUbicacion.ubicacion_id == WMSUbicacion.id)\
             .join(WMSZona, WMSUbicacion.zona_id == WMSZona.id)
        if almacen_id:
            q = q.where(WMSZona.almacen_id == almacen_id)
        if zona and zona.strip():
            like = f"%{zona.strip()}%"
            q = q.where(or_(WMSZona.codigo.ilike(like), WMSZona.nombre.ilike(like), WMSZona.tipo.ilike(like)))
    if producto and producto.strip():
        like = f"%{producto.strip()}%"
        q = q.join(WMSProducto, WMSInventarioUbicacion.producto_id == WMSProducto.id)\
             .where(or_(WMSProducto.sku.ilike(like), WMSProducto.nombre.ilike(like)))
    r = await db.execute(q)
    return r.scalars().all()


@router.post("/inventario/ajuste/", response_model=WMSMovimientoResponse, status_code=201)
async def ajustar_inventario(
    data: WMSAjusteInventario,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Ajuste manual de inventario a un valor absoluto."""
    stmt = select(WMSInventarioUbicacion).where(
        and_(
            WMSInventarioUbicacion.producto_id == data.producto_id,
            WMSInventarioUbicacion.ubicacion_id == data.ubicacion_id,
            WMSInventarioUbicacion.lote_id == data.lote_id,
        )
    )
    r = await db.execute(stmt)
    inv = r.scalar_one_or_none()
    cantidad_anterior = inv.cantidad_disponible if inv else 0
    delta = data.cantidad_nueva - cantidad_anterior

    await _ajustar_inventario(db, data.producto_id, data.ubicacion_id, data.lote_id, delta)

    mov = WMSMovimientoInventario(
        tipo="AJUSTE",
        producto_id=data.producto_id,
        ubicacion_destino_id=data.ubicacion_id if delta > 0 else None,
        ubicacion_origen_id=data.ubicacion_id if delta < 0 else None,
        lote_id=data.lote_id,
        cantidad=abs(delta),
        referencia_documento="AJUSTE_MANUAL",
        usuario_id=current_user.id,
        notas=data.motivo,
    )
    db.add(mov)
    await _registrar_evento(
        db, "AJUSTE_INVENTARIO",
        f"Ajuste de {cantidad_anterior} a {data.cantidad_nueva} unidades",
        entidad_tipo="WMSInventarioUbicacion",
        usuario_id=current_user.id,
        producto_id=data.producto_id, lote_id=data.lote_id, ubicacion_id=data.ubicacion_id,
    )
    await db.commit()
    r2 = await db.execute(
        select(WMSMovimientoInventario)
        .options(selectinload(WMSMovimientoInventario.producto))
        .where(WMSMovimientoInventario.id == mov.id)
    )
    return r2.scalar_one()


@router.post("/inventario/transferencia/", response_model=WMSMovimientoResponse, status_code=201)
async def transferir_inventario(
    data: WMSTransferenciaInventario,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Mueve stock de una ubicación a otra."""
    stmt = select(WMSInventarioUbicacion).where(
        and_(
            WMSInventarioUbicacion.producto_id == data.producto_id,
            WMSInventarioUbicacion.ubicacion_id == data.ubicacion_origen_id,
            WMSInventarioUbicacion.lote_id == data.lote_id,
        )
    )
    r = await db.execute(stmt)
    inv_origen = r.scalar_one_or_none()
    if not inv_origen or inv_origen.cantidad_disponible < data.cantidad:
        raise HTTPException(400, "Stock insuficiente en ubicación origen")

    await _ajustar_inventario(db, data.producto_id, data.ubicacion_origen_id, data.lote_id, -data.cantidad)
    await _ajustar_inventario(db, data.producto_id, data.ubicacion_destino_id, data.lote_id, data.cantidad)

    referencia = "TRANSFERENCIA"
    notas = data.notas
    tms_codigo: Optional[str] = None

    # Gestión de transporte por TMS: crea un viaje de traslado entre almacenes.
    if (data.gestion_transporte or "").upper() == "TMS":
        alm_ori = await _almacen_de_ubicacion(db, data.ubicacion_origen_id)
        alm_des = await _almacen_de_ubicacion(db, data.ubicacion_destino_id)
        tms_codigo = await _next_numero(db, TMSViaje, TMSViaje.codigo, "TRAS")
        prod = await db.get(WMSProducto, data.producto_id)
        # Datos logísticos derivados del producto y la cantidad trasladada
        peso = round((prod.peso_kg or 0) * data.cantidad, 2) if prod else None
        volumen = round((prod.volumen_m3 or 0) * data.cantidad, 3) if prod else None
        # Servicio urbano si es dentro de la misma ciudad; nacional si es intermunicipal
        misma_ciudad = bool(alm_ori and alm_des and alm_ori.ciudad and alm_ori.ciudad == alm_des.ciudad)
        tipo_serv = TipoServicioTMSEnum.TERRESTRE_URBANO if misma_ciudad else TipoServicioTMSEnum.TERRESTRE_NACIONAL
        viaje = TMSViaje(
            codigo=tms_codigo,
            tipo_servicio=tipo_serv,
            estado=EstadoViajeTMSEnum.PROGRAMADO,
            origen_ciudad=(alm_ori.ciudad if alm_ori else None),
            origen_direccion=(f"{alm_ori.nombre} — {alm_ori.direccion or ''}".strip(" —") if alm_ori else None),
            destino_ciudad=(alm_des.ciudad if alm_des else None),
            destino_direccion=(f"{alm_des.nombre} — {alm_des.direccion or ''}".strip(" —") if alm_des else None),
            peso_kg=peso or None,
            volumen_m3=volumen or None,
            num_entregas=1,
            fecha_programada_cargue=datetime.now(timezone.utc),
            descripcion_carga=data.descripcion_carga or (f"Traslado de {data.cantidad:g} x {prod.nombre}" if prod else f"Traslado de {data.cantidad:g} unidades"),
            notas=f"Generado desde WMS · traslado entre almacenes. {data.notas or ''}".strip(),
            creado_por_id=current_user.id,
        )
        db.add(viaje)
        referencia = f"TRASLADO/TMS:{tms_codigo}"
        notas = f"{notas or ''} | Transporte gestionado por TMS ({tms_codigo})".strip(" |")

    mov = WMSMovimientoInventario(
        tipo="TRANSFERENCIA",
        producto_id=data.producto_id,
        ubicacion_origen_id=data.ubicacion_origen_id,
        ubicacion_destino_id=data.ubicacion_destino_id,
        lote_id=data.lote_id,
        cantidad=data.cantidad,
        referencia_documento=referencia,
        usuario_id=current_user.id,
        notas=notas,
    )
    db.add(mov)
    # Evento de trazabilidad (ISO 9001 §8.5.2): la transferencia queda en el
    # historial del producto, del lote y de ambas ubicaciones.
    await _registrar_evento(
        db, "TRANSFERENCIA",
        f"Transferencia de {data.cantidad:g} und · ubicación {data.ubicacion_origen_id} → {data.ubicacion_destino_id}"
        + (f" · transporte TMS {tms_codigo}" if tms_codigo else ""),
        entidad_tipo="MOVIMIENTO", usuario_id=current_user.id,
        producto_id=data.producto_id, lote_id=data.lote_id,
        ubicacion_id=data.ubicacion_destino_id,
        datos={"origen_id": data.ubicacion_origen_id, "destino_id": data.ubicacion_destino_id,
               "cantidad": data.cantidad, "referencia": referencia},
    )
    await db.commit()
    r2 = await db.execute(
        select(WMSMovimientoInventario)
        .options(selectinload(WMSMovimientoInventario.producto))
        .where(WMSMovimientoInventario.id == mov.id)
    )
    return r2.scalar_one()


@router.post("/inventario/reserva-bloqueo/", response_model=WMSInventarioResponse)
async def reservar_bloquear_inventario(
    data: WMSReservaBloqueo,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Reserva / libera / bloquea / desbloquea stock de una ubicación.
    Mueve cantidades entre disponible ↔ reservada ↔ bloqueada sin cambiar el total.
    """
    accion = (data.accion or "").upper()
    if accion not in ("RESERVAR", "LIBERAR", "BLOQUEAR", "DESBLOQUEAR"):
        raise HTTPException(400, "Acción inválida (RESERVAR/LIBERAR/BLOQUEAR/DESBLOQUEAR)")

    r = await db.execute(
        select(WMSInventarioUbicacion).where(
            and_(
                WMSInventarioUbicacion.producto_id == data.producto_id,
                WMSInventarioUbicacion.ubicacion_id == data.ubicacion_id,
                WMSInventarioUbicacion.lote_id == data.lote_id,
            )
        )
    )
    inv = r.scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "No existe inventario para ese producto/ubicación/lote")

    disp = inv.cantidad_disponible or 0
    res = inv.cantidad_reservada or 0
    blo = inv.cantidad_bloqueada or 0
    c = data.cantidad

    if accion == "RESERVAR":
        if disp < c:
            raise HTTPException(400, f"Disponible insuficiente (disponible {disp:g}, solicitado {c:g})")
        inv.cantidad_disponible = disp - c
        inv.cantidad_reservada = res + c
    elif accion == "LIBERAR":
        if res < c:
            raise HTTPException(400, f"Reservado insuficiente (reservado {res:g}, solicitado {c:g})")
        inv.cantidad_reservada = res - c
        inv.cantidad_disponible = disp + c
    elif accion == "BLOQUEAR":
        if disp < c:
            raise HTTPException(400, f"Disponible insuficiente (disponible {disp:g}, solicitado {c:g})")
        inv.cantidad_disponible = disp - c
        inv.cantidad_bloqueada = blo + c
    else:  # DESBLOQUEAR
        if blo < c:
            raise HTTPException(400, f"Bloqueado insuficiente (bloqueado {blo:g}, solicitado {c:g})")
        inv.cantidad_bloqueada = blo - c
        inv.cantidad_disponible = disp + c

    await _registrar_evento(
        db, f"INV_{accion}",
        f"{accion} {c:g} unidades del producto {data.producto_id}" + (f" — {data.motivo}" if data.motivo else ""),
        entidad_tipo="WMSInventarioUbicacion", entidad_id=inv.id,
        usuario_id=current_user.id,
        producto_id=data.producto_id, lote_id=data.lote_id, ubicacion_id=data.ubicacion_id,
    )
    await db.commit()
    r2 = await db.execute(
        select(WMSInventarioUbicacion)
        .options(
            selectinload(WMSInventarioUbicacion.producto),
            selectinload(WMSInventarioUbicacion.ubicacion),
            selectinload(WMSInventarioUbicacion.lote),
        )
        .where(WMSInventarioUbicacion.id == inv.id)
    )
    return r2.scalar_one()


async def _listar_movimientos(db: AsyncSession, tipo: str, limite: int = 100):
    r = await db.execute(
        select(WMSMovimientoInventario)
        .options(selectinload(WMSMovimientoInventario.producto))
        .where(WMSMovimientoInventario.tipo == tipo)
        .order_by(WMSMovimientoInventario.id.desc())
        .limit(limite)
    )
    return r.scalars().all()


@router.get("/inventario/movimientos/", response_model=List[WMSMovimientoResponse])
async def listar_movimientos_inventario(
    tipo: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = (
        select(WMSMovimientoInventario)
        .options(selectinload(WMSMovimientoInventario.producto))
        .order_by(WMSMovimientoInventario.id.desc())
        .limit(200)
    )
    if tipo:
        q = q.where(WMSMovimientoInventario.tipo == tipo)
    r = await db.execute(q)
    return r.scalars().all()


@router.get("/inventario/ajustes/", response_model=List[WMSMovimientoResponse])
async def historial_ajustes(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await _listar_movimientos(db, "AJUSTE")


@router.get("/inventario/transferencias/", response_model=List[WMSMovimientoResponse])
async def historial_transferencias(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await _listar_movimientos(db, "TRANSFERENCIA")


# ─── INVENTARIO — Conteos ─────────────────────────────────────────────────────

@router.get("/conteos/", response_model=List[WMSConteoResponse])
async def listar_conteos(
    estado: Optional[str] = None,
    almacen_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = (
        select(WMSConteoInventario)
        .options(
            selectinload(WMSConteoInventario.almacen),
            selectinload(WMSConteoInventario.detalles).selectinload(WMSConteoDetalle.producto),
            selectinload(WMSConteoInventario.detalles).selectinload(WMSConteoDetalle.ubicacion),
        )
    )
    if estado:
        q = q.where(WMSConteoInventario.estado == estado)
    if almacen_id:
        q = q.where(WMSConteoInventario.almacen_id == almacen_id)
    r = await db.execute(q.order_by(WMSConteoInventario.fecha_programada.desc()))
    return r.scalars().all()


@router.post("/conteos/", response_model=WMSConteoResponse, status_code=201)
async def crear_conteo(
    data: WMSConteoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    payload = data.model_dump(exclude={"detalles"})
    conteo = WMSConteoInventario(**payload, operario_id=current_user.id)
    db.add(conteo)
    await db.flush()

    if data.detalles:
        for d in data.detalles:
            # Cargar cantidad_sistema del inventario actual
            inv_stmt = select(WMSInventarioUbicacion).where(
                and_(
                    WMSInventarioUbicacion.producto_id == d.producto_id,
                    WMSInventarioUbicacion.ubicacion_id == d.ubicacion_id,
                    WMSInventarioUbicacion.lote_id == d.lote_id,
                )
            )
            inv_r = await db.execute(inv_stmt)
            inv = inv_r.scalar_one_or_none()
            det = WMSConteoDetalle(
                conteo_id=conteo.id,
                producto_id=d.producto_id,
                ubicacion_id=d.ubicacion_id,
                lote_id=d.lote_id,
                cantidad_sistema=inv.cantidad_disponible if inv else 0,
            )
            db.add(det)
    else:
        # Sin detalles explícitos: tomar una foto del inventario del almacén
        # (todas las ubicaciones con stock) para que el operario capture el físico.
        inv_r = await db.execute(
            select(WMSInventarioUbicacion)
            .join(WMSUbicacion, WMSInventarioUbicacion.ubicacion_id == WMSUbicacion.id)
            .join(WMSZona, WMSUbicacion.zona_id == WMSZona.id)
            .where(WMSZona.almacen_id == conteo.almacen_id)
            .order_by(WMSInventarioUbicacion.ubicacion_id.asc())
        )
        for inv in inv_r.scalars().all():
            det = WMSConteoDetalle(
                conteo_id=conteo.id,
                producto_id=inv.producto_id,
                ubicacion_id=inv.ubicacion_id,
                lote_id=inv.lote_id,
                cantidad_sistema=inv.cantidad_disponible or 0,
            )
            db.add(det)

    await db.commit()
    r = await db.execute(
        select(WMSConteoInventario)
        .options(
            selectinload(WMSConteoInventario.almacen),
            selectinload(WMSConteoInventario.detalles).selectinload(WMSConteoDetalle.producto),
            selectinload(WMSConteoInventario.detalles).selectinload(WMSConteoDetalle.ubicacion),
        )
        .where(WMSConteoInventario.id == conteo.id)
    )
    return r.scalar_one()


@router.put("/conteos/{conteo_id}/detalles/{detalle_id}", response_model=WMSConteoResponse)
async def actualizar_detalle_conteo(
    conteo_id: int,
    detalle_id: int,
    data: WMSConteoDetalleUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Captura la cantidad física de una línea del conteo (marca el conteo EN_PROCESO)."""
    conteo = await db.get(WMSConteoInventario, conteo_id)
    if not conteo:
        raise HTTPException(404, "Conteo no encontrado")
    if conteo.estado == "COMPLETO":
        raise HTTPException(400, "El conteo ya está completo")
    det = await db.get(WMSConteoDetalle, detalle_id)
    if not det or det.conteo_id != conteo_id:
        raise HTTPException(404, "Detalle de conteo no encontrado")

    if data.cantidad_fisica is not None:
        if data.cantidad_fisica < 0:
            raise HTTPException(400, "La cantidad física no puede ser negativa")
        det.cantidad_fisica = data.cantidad_fisica
        det.diferencia = data.cantidad_fisica - det.cantidad_sistema
    if data.ajustado is not None:
        det.ajustado = data.ajustado
    if conteo.estado == "PROGRAMADO":
        conteo.estado = "EN_PROCESO"
        if not conteo.fecha_inicio:
            conteo.fecha_inicio = datetime.utcnow()

    await db.commit()
    r = await db.execute(
        select(WMSConteoInventario)
        .options(
            selectinload(WMSConteoInventario.almacen),
            selectinload(WMSConteoInventario.detalles).selectinload(WMSConteoDetalle.producto),
            selectinload(WMSConteoInventario.detalles).selectinload(WMSConteoDetalle.ubicacion),
        )
        .where(WMSConteoInventario.id == conteo_id)
    )
    return r.scalar_one()


@router.put("/conteos/{conteo_id}/completar", response_model=WMSConteoResponse)
async def completar_conteo(
    conteo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Reconcilia el conteo: calcula diferencias y genera ajustes de inventario."""
    r = await db.execute(
        select(WMSConteoInventario)
        .options(
            selectinload(WMSConteoInventario.almacen),
            selectinload(WMSConteoInventario.detalles).selectinload(WMSConteoDetalle.producto),
            selectinload(WMSConteoInventario.detalles).selectinload(WMSConteoDetalle.ubicacion),
            selectinload(WMSConteoInventario.detalles).selectinload(WMSConteoDetalle.lote),
        )
        .where(WMSConteoInventario.id == conteo_id)
    )
    conteo = r.scalar_one_or_none()
    if not conteo:
        raise HTTPException(404, "Conteo no encontrado")
    if conteo.estado == "COMPLETO":
        raise HTTPException(400, "Conteo ya está completo")

    for det in conteo.detalles:
        if det.cantidad_fisica is not None:
            det.diferencia = det.cantidad_fisica - det.cantidad_sistema
            if det.diferencia != 0:
                await _ajustar_inventario(
                    db, det.producto_id, det.ubicacion_id, det.lote_id, det.diferencia
                )
                mov = WMSMovimientoInventario(
                    tipo="CONTEO",
                    producto_id=det.producto_id,
                    ubicacion_destino_id=det.ubicacion_id if det.diferencia > 0 else None,
                    ubicacion_origen_id=det.ubicacion_id if det.diferencia < 0 else None,
                    lote_id=det.lote_id,
                    cantidad=abs(det.diferencia),
                    referencia_documento=f"CONTEO-{conteo_id}",
                    usuario_id=current_user.id,
                    notas="Ajuste por conteo físico",
                )
                db.add(mov)
                # Trazabilidad del ajuste por conteo (ISO 9001: la reconciliación
                # de inventario queda registrada con usuario y diferencia)
                await _registrar_evento(
                    db, "AJUSTE",
                    f"Ajuste por conteo físico #{conteo_id}: {'+' if det.diferencia > 0 else ''}{det.diferencia:g} und "
                    f"({det.producto.nombre if det.producto else det.producto_id})",
                    entidad_tipo="CONTEO", entidad_id=conteo_id, usuario_id=current_user.id,
                    producto_id=det.producto_id, lote_id=det.lote_id, ubicacion_id=det.ubicacion_id,
                    datos={"sistema": det.cantidad_sistema, "fisica": det.cantidad_fisica,
                           "diferencia": det.diferencia},
                )
            det.ajustado = True

    conteo.estado = "COMPLETO"
    conteo.fecha_fin = datetime.utcnow()
    await db.commit()

    r2 = await db.execute(
        select(WMSConteoInventario)
        .options(
            selectinload(WMSConteoInventario.almacen),
            selectinload(WMSConteoInventario.detalles).selectinload(WMSConteoDetalle.producto),
            selectinload(WMSConteoInventario.detalles).selectinload(WMSConteoDetalle.ubicacion),
        )
        .where(WMSConteoInventario.id == conteo_id)
    )
    return r2.scalar_one()


# ─── OUTBOUND — Órdenes de Salida ─────────────────────────────────────────────

@router.get("/ordenes-salida/", response_model=List[WMSOrdenSalidaResponse])
async def listar_ordenes_salida(
    estado: Optional[str] = None,
    prioridad: Optional[str] = None,
    cliente_id: Optional[int] = None,
    almacen_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = (
        select(WMSOrdenSalida)
        .options(
            selectinload(WMSOrdenSalida.cliente),
            selectinload(WMSOrdenSalida.almacen),
            selectinload(WMSOrdenSalida.detalles).selectinload(WMSOrdenSalidaDetalle.producto),
        )
        .where(WMSOrdenSalida.deleted_at.is_(None))
    )
    if estado:
        q = q.where(WMSOrdenSalida.estado == estado)
    if prioridad:
        q = q.where(WMSOrdenSalida.prioridad == prioridad)
    if cliente_id:
        q = q.where(WMSOrdenSalida.cliente_id == cliente_id)
    if almacen_id:
        q = q.where(WMSOrdenSalida.almacen_id == almacen_id)
    r = await db.execute(q.order_by(WMSOrdenSalida.fecha_emision.desc()))
    return r.scalars().all()


@router.post("/ordenes-salida/", response_model=WMSOrdenSalidaResponse, status_code=201)
async def crear_orden_salida(
    data: WMSOrdenSalidaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    payload = data.model_dump(exclude={"detalles"})
    if not payload.get("numero_orden"):
        payload["numero_orden"] = await _next_numero(db, WMSOrdenSalida, WMSOrdenSalida.numero_orden, "OS")
    if not payload.get("fecha_emision"):
        payload["fecha_emision"] = date.today()
    orden = WMSOrdenSalida(**payload)
    db.add(orden)
    await db.flush()
    for d in data.detalles:
        det = WMSOrdenSalidaDetalle(orden_id=orden.id, **d.model_dump())
        db.add(det)
    await db.commit()
    r = await db.execute(
        select(WMSOrdenSalida)
        .options(
            selectinload(WMSOrdenSalida.cliente),
            selectinload(WMSOrdenSalida.almacen),
            selectinload(WMSOrdenSalida.detalles).selectinload(WMSOrdenSalidaDetalle.producto),
        )
        .where(WMSOrdenSalida.id == orden.id)
    )
    return r.scalar_one()


@router.put("/ordenes-salida/{orden_id}/estado", response_model=WMSOrdenSalidaResponse)
async def actualizar_estado_orden_salida(
    orden_id: int,
    data: WMSOrdenSalidaEstado,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSOrdenSalida, orden_id)
    if not obj or obj.deleted_at:
        raise HTTPException(404, "Orden de salida no encontrada")
    obj.estado = data.estado
    await db.commit()
    r = await db.execute(
        select(WMSOrdenSalida)
        .options(
            selectinload(WMSOrdenSalida.cliente),
            selectinload(WMSOrdenSalida.almacen),
            selectinload(WMSOrdenSalida.detalles).selectinload(WMSOrdenSalidaDetalle.producto),
        )
        .where(WMSOrdenSalida.id == orden_id)
    )
    return r.scalar_one()


@router.post("/ordenes-salida/{orden_id}/generar-picking", response_model=WMSPickingTareaResponse, status_code=201)
async def generar_picking(
    orden_id: int,
    tipo: str = Query("SINGLE"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Auto-genera una tarea de picking a partir del inventario disponible (FIFO por vencimiento de lote).
    Reserva stock en WMSInventarioUbicacion y crea los WMSPickingDetalle.
    """
    r = await db.execute(
        select(WMSOrdenSalida)
        .options(
            selectinload(WMSOrdenSalida.detalles).selectinload(WMSOrdenSalidaDetalle.producto),
        )
        .where(WMSOrdenSalida.id == orden_id, WMSOrdenSalida.deleted_at.is_(None))
    )
    orden = r.scalar_one_or_none()
    if not orden:
        raise HTTPException(404, "Orden de salida no encontrada")
    if orden.estado not in ("PENDIENTE", "EN_PICKING"):
        raise HTTPException(400, f"Estado {orden.estado} no permite generar picking")

    tarea = WMSPickingTarea(
        orden_id=orden_id,
        operario_id=current_user.id,
        tipo=tipo,
        estado="PENDIENTE",
        fecha_asignacion=datetime.utcnow(),
    )
    db.add(tarea)
    await db.flush()

    faltantes: list[str] = []
    for det in orden.detalles:
        cantidad_pendiente = det.cantidad_solicitada - det.cantidad_preparada
        if cantidad_pendiente <= 0:
            continue

        # FIFO: inventario del ALMACÉN de la orden, ordenado por fecha_vencimiento (ASC nulls last)
        inv_q = (
            select(WMSInventarioUbicacion)
            .join(WMSUbicacion, WMSInventarioUbicacion.ubicacion_id == WMSUbicacion.id)
            .join(WMSZona, WMSUbicacion.zona_id == WMSZona.id)
            .join(WMSLote, WMSInventarioUbicacion.lote_id == WMSLote.id, isouter=True)
            .where(
                WMSInventarioUbicacion.producto_id == det.producto_id,
                WMSInventarioUbicacion.cantidad_disponible > 0,
                WMSZona.almacen_id == orden.almacen_id,
            )
            .order_by(
                WMSLote.fecha_vencimiento.asc().nullslast(),
                WMSInventarioUbicacion.id.asc(),
            )
        )
        if det.lote_id:
            inv_q = inv_q.where(WMSInventarioUbicacion.lote_id == det.lote_id)

        inv_r = await db.execute(inv_q)
        inventarios = inv_r.scalars().all()

        preparado = 0.0
        for inv in inventarios:
            if cantidad_pendiente <= 0:
                break
            tomar = min(inv.cantidad_disponible, cantidad_pendiente)
            inv.cantidad_disponible -= tomar
            inv.cantidad_reservada = (inv.cantidad_reservada or 0) + tomar
            cantidad_pendiente -= tomar
            preparado += tomar

            pick_det = WMSPickingDetalle(
                tarea_id=tarea.id,
                producto_id=det.producto_id,
                ubicacion_id=inv.ubicacion_id,
                lote_id=inv.lote_id,
                cantidad_solicitada=tomar,
            )
            db.add(pick_det)

        # Reflejar avance de reserva en la línea de la orden
        det.cantidad_preparada = (det.cantidad_preparada or 0) + preparado
        if cantidad_pendiente > 0:
            faltantes.append(f"producto {det.producto_id}: faltan {cantidad_pendiente:g}")

    orden.estado = "EN_PICKING"
    if faltantes:
        await _registrar_evento(
            db, "PICKING_PARCIAL",
            "Picking parcial por stock insuficiente: " + "; ".join(faltantes),
            entidad_tipo="WMSOrdenSalida", entidad_id=orden_id,
            usuario_id=current_user.id,
        )
    await db.commit()

    r2 = await db.execute(
        select(WMSPickingTarea)
        .options(
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.producto),
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.ubicacion),
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.lote),
        )
        .where(WMSPickingTarea.id == tarea.id)
    )
    return r2.scalar_one()


# ─── OUTBOUND — Picking ───────────────────────────────────────────────────────

@router.get("/picking-tareas/", response_model=List[WMSPickingTareaResponse])
async def listar_picking_tareas(
    estado: Optional[str] = None,
    orden_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = (
        select(WMSPickingTarea)
        .options(
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.producto),
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.ubicacion),
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.lote),
        )
    )
    if estado:
        q = q.where(WMSPickingTarea.estado == estado)
    if orden_id:
        q = q.where(WMSPickingTarea.orden_id == orden_id)
    r = await db.execute(q.order_by(WMSPickingTarea.id.desc()))
    return r.scalars().all()


@router.post("/picking-tareas/", response_model=WMSPickingTareaResponse, status_code=201)
async def crear_picking_tarea(
    data: WMSPickingTareaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    tarea = WMSPickingTarea(
        orden_id=data.orden_id,
        operario_id=current_user.id,
        tipo=data.tipo,
        estado="PENDIENTE",
        fecha_asignacion=datetime.utcnow(),
    )
    db.add(tarea)
    await db.flush()
    for d in data.detalles:
        det = WMSPickingDetalle(tarea_id=tarea.id, **d.model_dump())
        db.add(det)
    await db.commit()
    r = await db.execute(
        select(WMSPickingTarea)
        .options(
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.producto),
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.ubicacion),
        )
        .where(WMSPickingTarea.id == tarea.id)
    )
    return r.scalar_one()


@router.put("/picking-tareas/{tarea_id}", response_model=WMSPickingTareaResponse)
async def actualizar_picking_tarea(
    tarea_id: int,
    data: WMSPickingTareaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(WMSPickingTarea, tarea_id)
    if not obj:
        raise HTTPException(404, "Tarea de picking no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    if data.estado == "EN_PROGRESO" and not obj.fecha_inicio:
        obj.fecha_inicio = datetime.utcnow()
    await db.commit()
    r = await db.execute(
        select(WMSPickingTarea)
        .options(
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.producto),
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.ubicacion),
        )
        .where(WMSPickingTarea.id == tarea_id)
    )
    return r.scalar_one()


@router.post("/picking-tareas/{tarea_id}/confirmar-item", response_model=WMSPickingTareaResponse)
async def confirmar_item_picking(
    tarea_id: int,
    data: WMSPickingConfirmItem,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Confirma el picking de un ítem específico (simula escaneo)."""
    tarea = await db.get(WMSPickingTarea, tarea_id)
    if not tarea:
        raise HTTPException(404, "Tarea de picking no encontrada")
    det = await db.get(WMSPickingDetalle, data.detalle_id)
    if not det or det.tarea_id != tarea_id:
        raise HTTPException(404, "Detalle de picking no encontrado")
    if det.confirmado:
        raise HTTPException(400, "Ítem ya confirmado")
    if data.cantidad_pickeada <= 0 or data.cantidad_pickeada > det.cantidad_solicitada:
        raise HTTPException(
            400,
            f"La cantidad pickeada debe estar entre 0 y {det.cantidad_solicitada:g}",
        )

    det.cantidad_pickeada = data.cantidad_pickeada
    det.confirmado = True
    det.timestamp_confirmacion = datetime.utcnow()

    # Si se pickea menos de lo reservado, liberar el sobrante (reservada → disponible)
    sobrante = det.cantidad_solicitada - data.cantidad_pickeada
    if sobrante > 0:
        inv_r = await db.execute(
            select(WMSInventarioUbicacion).where(
                and_(
                    WMSInventarioUbicacion.producto_id == det.producto_id,
                    WMSInventarioUbicacion.ubicacion_id == det.ubicacion_id,
                    WMSInventarioUbicacion.lote_id == det.lote_id,
                )
            )
        )
        inv = inv_r.scalar_one_or_none()
        if inv:
            inv.cantidad_reservada = max(0, (inv.cantidad_reservada or 0) - sobrante)
            inv.cantidad_disponible = (inv.cantidad_disponible or 0) + sobrante

    tarea.items_pickeados = (tarea.items_pickeados or 0) + 1

    # Verificar si todos los ítems están confirmados
    todos_r = await db.execute(
        select(WMSPickingDetalle).where(WMSPickingDetalle.tarea_id == tarea_id)
    )
    todos = todos_r.scalars().all()
    if all(d.confirmado for d in todos):
        tarea.estado = "COMPLETADA"
        tarea.fecha_fin = datetime.utcnow()

    await db.commit()
    r = await db.execute(
        select(WMSPickingTarea)
        .options(
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.producto),
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.ubicacion),
            selectinload(WMSPickingTarea.detalles).selectinload(WMSPickingDetalle.lote),
        )
        .where(WMSPickingTarea.id == tarea_id)
    )
    return r.scalar_one()


# ─── OUTBOUND — Despachos ─────────────────────────────────────────────────────

@router.get("/despachos/", response_model=List[WMSDespachoResponse])
async def listar_despachos(
    estado: Optional[str] = None,
    orden_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = (
        select(WMSDespacho)
        .options(
            selectinload(WMSDespacho.transportadora),
            selectinload(WMSDespacho.detalles).selectinload(WMSDespachoDetalle.producto),
            selectinload(WMSDespacho.detalles).selectinload(WMSDespachoDetalle.lote),
        )
        .where(WMSDespacho.deleted_at.is_(None))
    )
    if estado:
        q = q.where(WMSDespacho.estado == estado)
    if orden_id:
        q = q.where(WMSDespacho.orden_id == orden_id)
    r = await db.execute(q.order_by(WMSDespacho.fecha_despacho.desc()))
    return r.scalars().all()


@router.post("/despachos/", response_model=WMSDespachoResponse, status_code=201)
async def crear_despacho(
    data: WMSDespachoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # Cargar la orden (con detalles) para validar/descontar contra su almacén.
    orden_r = await db.execute(
        select(WMSOrdenSalida)
        .options(selectinload(WMSOrdenSalida.detalles))
        .where(WMSOrdenSalida.id == data.orden_id, WMSOrdenSalida.deleted_at.is_(None))
    )
    orden = orden_r.scalar_one_or_none()
    if not orden:
        raise HTTPException(404, "Orden de salida no encontrada")

    # Determinar las líneas a despachar: las provistas o, si no vienen, las
    # confirmadas en el picking de la orden.
    lineas = list(data.detalles)
    if not lineas:
        pick_r = await db.execute(
            select(WMSPickingDetalle)
            .join(WMSPickingTarea, WMSPickingDetalle.tarea_id == WMSPickingTarea.id)
            .where(
                WMSPickingTarea.orden_id == orden.id,
                WMSPickingDetalle.confirmado == True,
                WMSPickingDetalle.cantidad_pickeada > 0,
            )
        )
        lineas = [
            WMSDespachoDetalleCreate(
                producto_id=pd.producto_id, lote_id=pd.lote_id, cantidad=pd.cantidad_pickeada
            )
            for pd in pick_r.scalars().all()
        ]
    if not lineas:
        raise HTTPException(400, "No hay ítems para despachar (sin detalles ni picking confirmado)")

    if not payload.get("numero_despacho"):
        payload["numero_despacho"] = await _next_numero(db, WMSDespacho, WMSDespacho.numero_despacho, "DESP")
    if not payload.get("fecha_despacho"):
        payload["fecha_despacho"] = date.today()
    despacho = WMSDespacho(**payload)
    db.add(despacho)
    await db.flush()

    for d in lineas:
        det = WMSDespachoDetalle(despacho_id=despacho.id, **d.model_dump())
        db.add(det)

        # Descontar del stock reservado, recorriendo todas las ubicaciones
        # reservadas del almacén de la orden hasta cubrir la cantidad.
        inv_r = await db.execute(
            select(WMSInventarioUbicacion)
            .join(WMSUbicacion, WMSInventarioUbicacion.ubicacion_id == WMSUbicacion.id)
            .join(WMSZona, WMSUbicacion.zona_id == WMSZona.id)
            .where(
                WMSInventarioUbicacion.producto_id == d.producto_id,
                WMSInventarioUbicacion.lote_id == d.lote_id,
                WMSInventarioUbicacion.cantidad_reservada > 0,
                WMSZona.almacen_id == orden.almacen_id,
            )
            .order_by(WMSInventarioUbicacion.id.asc())
        )
        invs = inv_r.scalars().all()
        disponible_reservado = sum((inv.cantidad_reservada or 0) for inv in invs)
        if disponible_reservado < d.cantidad:
            raise HTTPException(
                400,
                f"Stock reservado insuficiente para el producto {d.producto_id} "
                f"(reservado {disponible_reservado:g}, requerido {d.cantidad:g}). "
                "Genere/confirme el picking antes de despachar.",
            )
        pendiente = d.cantidad
        for inv in invs:
            if pendiente <= 0:
                break
            tomar = min(inv.cantidad_reservada or 0, pendiente)
            inv.cantidad_reservada -= tomar
            pendiente -= tomar

        # Registrar movimiento de salida
        mov = WMSMovimientoInventario(
            tipo="DESPACHO",
            producto_id=d.producto_id,
            lote_id=d.lote_id,
            cantidad=d.cantidad,
            referencia_documento=payload["numero_despacho"],
            usuario_id=current_user.id,
        )
        db.add(mov)

        # Actualizar cantidad_despachada de la línea de la orden
        for od in orden.detalles:
            if od.producto_id == d.producto_id and (od.lote_id == d.lote_id or d.lote_id is None):
                od.cantidad_despachada = (od.cantidad_despachada or 0) + d.cantidad
                break

    # Derivar estado de la orden: DESPACHADO si todas las líneas quedan cubiertas.
    if orden.detalles and all(
        (od.cantidad_despachada or 0) >= (od.cantidad_solicitada or 0) for od in orden.detalles
    ):
        orden.estado = "DESPACHADO"
    else:
        orden.estado = "EMPACANDO"

    # Gestión de transporte por TMS: crea el viaje del despacho (vinculado).
    if (data.gestion_transporte or "").upper() == "TMS":
        alm = await db.get(WMSAlmacen, orden.almacen_id)
        cli = await db.get(WMSCliente, orden.cliente_id)
        tms_codigo = await _next_numero(db, TMSViaje, TMSViaje.codigo, "DESP")
        fcarga = datetime.combine(despacho.fecha_despacho, datetime.min.time()) if despacho.fecha_despacho else datetime.now(timezone.utc)
        fentrega = datetime.combine(despacho.fecha_entrega_estimada, datetime.min.time()) if despacho.fecha_entrega_estimada else None
        viaje = TMSViaje(
            codigo=tms_codigo,
            tipo_servicio=TipoServicioTMSEnum.DISTRIBUCION,
            estado=EstadoViajeTMSEnum.PROGRAMADO,
            wms_despacho_id=despacho.id,
            origen_ciudad=(alm.ciudad if alm else None),
            origen_direccion=(f"{alm.nombre} — {alm.direccion or ''}".strip(" —") if alm else None),
            destino_ciudad=(cli.ciudad if cli else None),
            destino_direccion=(cli.nombre if cli else None),
            peso_kg=data.peso_total_kg,
            volumen_m3=data.volumen_total_m3,
            num_entregas=1,
            fecha_programada_cargue=fcarga,
            fecha_programada_entrega=fentrega,
            descripcion_carga=f"Despacho {payload['numero_despacho']} — orden {orden.numero_orden}",
            notas=f"Generado desde WMS · despacho. Placa {despacho.vehiculo_placa or '-'} · conductor {despacho.conductor_nombre or '-'}",
            creado_por_id=current_user.id,
        )
        db.add(viaje)
        despacho.notas = f"{despacho.notas or ''} | Transporte gestionado por TMS ({tms_codigo})".strip(" |")

    # Evento de trazabilidad por cada línea despachada (ISO 9001 §8.5.2)
    for d in lineas:
        await _registrar_evento(
            db, "DESPACHO",
            f"Despacho {payload['numero_despacho']} · orden {orden.numero_orden} · {d.cantidad:g} und",
            entidad_tipo="DESPACHO", entidad_id=despacho.id, usuario_id=current_user.id,
            producto_id=d.producto_id, lote_id=d.lote_id,
            datos={"numero_despacho": payload["numero_despacho"], "orden": orden.numero_orden,
                   "cantidad": d.cantidad},
        )

    await db.commit()
    r = await db.execute(
        select(WMSDespacho)
        .options(
            selectinload(WMSDespacho.transportadora),
            selectinload(WMSDespacho.detalles).selectinload(WMSDespachoDetalle.producto),
            selectinload(WMSDespacho.detalles).selectinload(WMSDespachoDetalle.lote),
        )
        .where(WMSDespacho.id == despacho.id)
    )
    return r.scalar_one()


@router.put("/despachos/{despacho_id}/estado", response_model=WMSDespachoResponse)
async def actualizar_estado_despacho(
    despacho_id: int,
    data: WMSDespachoEstado,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    obj = await db.get(WMSDespacho, despacho_id)
    if not obj or obj.deleted_at:
        raise HTTPException(404, "Despacho no encontrado")
    if data.estado not in _DESPACHO_ESTADOS:
        raise HTTPException(400, f"Estado de despacho inválido: {data.estado}")
    estado_anterior = obj.estado
    if data.estado != estado_anterior and data.estado not in _DESPACHO_TRANS_NEXT.get(estado_anterior, set()):
        raise HTTPException(
            400, f"Transición no permitida: {estado_anterior} → {data.estado}"
        )
    obj.estado = data.estado
    if data.fecha_entrega_real:
        obj.fecha_entrega_real = data.fecha_entrega_real
    if data.estado == "ENTREGADO":
        if not obj.fecha_entrega_real:
            obj.fecha_entrega_real = date.today()
        orden = await db.get(WMSOrdenSalida, obj.orden_id)
        if orden:
            orden.estado = "ENTREGADO"
    db.add(WMSHistorialEstado(
        entidad_tipo="DESPACHO",
        entidad_id=despacho_id,
        estado_anterior=estado_anterior,
        estado_nuevo=data.estado,
        tipo_cambio="AVANCE",
        usuario_id=current_user.id,
    ))
    await db.commit()
    r = await db.execute(
        select(WMSDespacho)
        .options(
            selectinload(WMSDespacho.transportadora),
            selectinload(WMSDespacho.detalles).selectinload(WMSDespachoDetalle.producto),
        )
        .where(WMSDespacho.id == despacho_id)
    )
    return r.scalar_one()


@router.get("/despachos/{despacho_id}/historial")
async def historial_despacho(
    despacho_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Retorna el historial completo de cambios de estado del despacho."""
    result = await db.execute(
        select(WMSHistorialEstado)
        .options(selectinload(WMSHistorialEstado.usuario))
        .where(
            WMSHistorialEstado.entidad_tipo == "DESPACHO",
            WMSHistorialEstado.entidad_id == despacho_id,
        )
        .order_by(WMSHistorialEstado.fecha.asc())
    )
    registros = list(result.scalars().all())
    return [
        {
            "id":              r.id,
            "estado_anterior": r.estado_anterior,
            "estado_nuevo":    r.estado_nuevo,
            "tipo_cambio":     r.tipo_cambio,
            "observacion":     r.observacion,
            "usuario":         f"{r.usuario.nombre} {r.usuario.apellido}" if r.usuario else "Sistema",
            "fecha":           r.fecha.isoformat(),
        }
        for r in registros
    ]


@router.post("/despachos/{despacho_id}/estado/revertir")
async def revertir_estado_despacho(
    despacho_id: int,
    data: RevertirDespachoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_supervisor),
):
    """Corrige un estado de despacho registrado por error. Solo SUPERVISOR y ADMIN."""
    if not data.observacion or not data.observacion.strip():
        raise HTTPException(400, "La observación es obligatoria para revertir un estado")

    obj = await db.get(WMSDespacho, despacho_id)
    if not obj or obj.deleted_at:
        raise HTTPException(404, "Despacho no encontrado")

    estado_destino = _REVERT_DESPACHO_TRANS.get(obj.estado)
    if not estado_destino:
        raise HTTPException(400, f"El estado '{obj.estado}' no puede ser revertido")

    estado_anterior = obj.estado
    obj.estado = estado_destino

    if estado_anterior == "ENTREGADO":
        obj.fecha_entrega_real = None
        orden = await db.get(WMSOrdenSalida, obj.orden_id)
        if orden:
            orden.estado = "DESPACHADO"

    db.add(WMSHistorialEstado(
        entidad_tipo="DESPACHO",
        entidad_id=despacho_id,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_destino,
        tipo_cambio="CORRECCION",
        observacion=data.observacion.strip(),
        usuario_id=current_user.id,
    ))
    await db.commit()
    return {
        "message": "Estado revertido",
        "estado_anterior": estado_anterior,
        "estado": estado_destino,
    }


# ─── DEVOLUCIONES ─────────────────────────────────────────────────────────────

@router.get("/devoluciones/", response_model=List[WMSDevolucionResponse])
async def listar_devoluciones(
    estado: Optional[str] = None,
    tipo: Optional[str] = None,
    almacen_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = (
        select(WMSDevolucion)
        .options(
            selectinload(WMSDevolucion.almacen),
            selectinload(WMSDevolucion.detalles).selectinload(WMSDevolucionDetalle.producto),
            selectinload(WMSDevolucion.detalles).selectinload(WMSDevolucionDetalle.lote),
        )
    )
    if estado:
        q = q.where(WMSDevolucion.estado == estado)
    if tipo:
        q = q.where(WMSDevolucion.tipo == tipo)
    if almacen_id:
        q = q.where(WMSDevolucion.almacen_id == almacen_id)
    r = await db.execute(q.order_by(WMSDevolucion.fecha_recepcion.desc()))
    return r.scalars().all()


@router.post("/devoluciones/", response_model=WMSDevolucionResponse, status_code=201)
async def crear_devolucion(
    data: WMSDevolucionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    payload = data.model_dump(exclude={"detalles"})
    dev = WMSDevolucion(**payload)
    db.add(dev)
    await db.flush()
    for d in data.detalles:
        det = WMSDevolucionDetalle(devolucion_id=dev.id, **d.model_dump())
        db.add(det)
    await db.commit()
    r = await db.execute(
        select(WMSDevolucion)
        .options(
            selectinload(WMSDevolucion.almacen),
            selectinload(WMSDevolucion.detalles).selectinload(WMSDevolucionDetalle.producto),
            selectinload(WMSDevolucion.detalles).selectinload(WMSDevolucionDetalle.lote),
        )
        .where(WMSDevolucion.id == dev.id)
    )
    return r.scalar_one()


@router.put("/devoluciones/{dev_id}/procesar", response_model=WMSDevolucionResponse)
async def procesar_devolucion(
    dev_id: int,
    data: WMSDevolucionProcesar,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Procesa la devolución: si estado=REINGRESADA, ingresa inventario
    para los ítems con accion=REINGRESAR.
    """
    r = await db.execute(
        select(WMSDevolucion)
        .options(
            selectinload(WMSDevolucion.almacen),
            selectinload(WMSDevolucion.detalles).selectinload(WMSDevolucionDetalle.producto),
            selectinload(WMSDevolucion.detalles).selectinload(WMSDevolucionDetalle.lote),
        )
        .where(WMSDevolucion.id == dev_id)
    )
    dev = r.scalar_one_or_none()
    if not dev:
        raise HTTPException(404, "Devolución no encontrada")

    dev.estado = data.estado

    if data.estado == "REINGRESADA":
        # Buscar ubicación de cuarentena o primera ubicación del almacén
        ubic_r = await db.execute(
            select(WMSUbicacion)
            .join(WMSZona, WMSUbicacion.zona_id == WMSZona.id)
            .where(
                WMSZona.almacen_id == dev.almacen_id,
                WMSUbicacion.activo == True,
            )
            .limit(1)
        )
        ubic = ubic_r.scalar_one_or_none()

        for det in dev.detalles:
            if det.accion == "REINGRESAR" and not det.reingresado and ubic:
                await _ajustar_inventario(
                    db, det.producto_id, ubic.id, det.lote_id, det.cantidad
                )
                det.reingresado = True
                mov = WMSMovimientoInventario(
                    tipo="DEVOLUCION",
                    producto_id=det.producto_id,
                    ubicacion_destino_id=ubic.id,
                    lote_id=det.lote_id,
                    cantidad=det.cantidad,
                    referencia_documento=dev.numero_devolucion,
                    usuario_id=current_user.id,
                    notas="Reingreso por devolución",
                )
                db.add(mov)
                # Trazabilidad del reingreso (ISO 9001 §8.5.2 / §8.7)
                await _registrar_evento(
                    db, "DEVOLUCION",
                    f"Reingreso por devolución {dev.numero_devolucion}: {det.cantidad:g} und "
                    f"({det.producto.nombre if det.producto else det.producto_id})",
                    entidad_tipo="DEVOLUCION", entidad_id=dev.id, usuario_id=current_user.id,
                    producto_id=det.producto_id, lote_id=det.lote_id, ubicacion_id=ubic.id,
                    datos={"numero_devolucion": dev.numero_devolucion, "accion": det.accion,
                           "cantidad": det.cantidad},
                )

    await db.commit()
    r2 = await db.execute(
        select(WMSDevolucion)
        .options(
            selectinload(WMSDevolucion.almacen),
            selectinload(WMSDevolucion.detalles).selectinload(WMSDevolucionDetalle.producto),
            selectinload(WMSDevolucion.detalles).selectinload(WMSDevolucionDetalle.lote),
        )
        .where(WMSDevolucion.id == dev_id)
    )
    return r2.scalar_one()


# ─── TRAZABILIDAD ─────────────────────────────────────────────────────────────

from app.infrastructure.models.usuario import Usuario as _UsuarioModel


def _serialize_evento(ev: WMSEventoTrazabilidad, usuario_nombre: Optional[str] = None) -> Dict[str, Any]:
    return {
        "id":               ev.id,
        "tipo_evento":      ev.tipo_evento,
        "descripcion":      ev.descripcion,
        "fecha_hora":       ev.created_at.isoformat() if ev.created_at else None,
        "usuario_nombre":   usuario_nombre,
        "datos_adicionales": ev.datos_adicionales,
    }


async def _eventos_con_usuario(db: AsyncSession, eventos: list) -> list:
    usuario_ids = {ev.usuario_id for ev in eventos if ev.usuario_id}
    nombres: Dict[int, str] = {}
    if usuario_ids:
        u_r = await db.execute(
            select(_UsuarioModel).where(_UsuarioModel.id.in_(usuario_ids))
        )
        for u in u_r.scalars().all():
            nombres[u.id] = f"{u.nombre} {u.apellido}"
    return [_serialize_evento(ev, nombres.get(ev.usuario_id)) for ev in eventos]


@router.get("/trazabilidad/producto/{sku}")
async def trazabilidad_producto(
    sku: str,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    prod_r = await db.execute(select(WMSProducto).where(WMSProducto.sku == sku))
    prod = prod_r.scalar_one_or_none()
    if not prod:
        raise HTTPException(404, f"Producto con SKU '{sku}' no encontrado")

    stock_r = await db.execute(
        select(func.coalesce(func.sum(WMSInventarioUbicacion.cantidad_disponible), 0.0))
        .where(WMSInventarioUbicacion.producto_id == prod.id)
    )
    stock_total = float(stock_r.scalar() or 0)

    ev_r = await db.execute(
        select(WMSEventoTrazabilidad)
        .where(WMSEventoTrazabilidad.producto_id == prod.id)
        .order_by(WMSEventoTrazabilidad.created_at.asc())
        .limit(limit)
    )
    eventos_raw = list(ev_r.scalars().all())
    eventos = await _eventos_con_usuario(db, eventos_raw)

    return {
        "nombre":      prod.nombre,
        "sku":         prod.sku,
        "stock_total": stock_total,
        "eventos":     eventos,
    }


@router.get("/trazabilidad/lote/{numero_lote}")
async def trazabilidad_lote(
    numero_lote: str,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    lote_r = await db.execute(select(WMSLote).where(WMSLote.numero_lote == numero_lote))
    lote = lote_r.scalars().first()
    if not lote:
        raise HTTPException(404, f"Lote '{numero_lote}' no encontrado")

    ev_r = await db.execute(
        select(WMSEventoTrazabilidad)
        .where(WMSEventoTrazabilidad.lote_id == lote.id)
        .order_by(WMSEventoTrazabilidad.created_at.asc())
        .limit(limit)
    )
    eventos_raw = list(ev_r.scalars().all())
    eventos = await _eventos_con_usuario(db, eventos_raw)

    venc = lote.fecha_vencimiento.isoformat() if lote.fecha_vencimiento else None
    estado = "vencido" if (lote.fecha_vencimiento and str(lote.fecha_vencimiento) < str(date.today())) else "activo"

    return {
        "numero_lote":      lote.numero_lote,
        "fecha_vencimiento": venc,
        "estado":           estado if lote.activo else "inactivo",
        "eventos":          eventos,
    }


@router.get("/trazabilidad/ubicacion/{codigo}")
async def trazabilidad_ubicacion(
    codigo: str,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ubic_r = await db.execute(
        select(WMSUbicacion)
        .options(selectinload(WMSUbicacion.zona))
        .where(WMSUbicacion.codigo == codigo)
    )
    ubic = ubic_r.scalar_one_or_none()
    if not ubic:
        raise HTTPException(404, f"Ubicación '{codigo}' no encontrada")

    ev_r = await db.execute(
        select(WMSEventoTrazabilidad)
        .where(WMSEventoTrazabilidad.ubicacion_id == ubic.id)
        .order_by(WMSEventoTrazabilidad.created_at.asc())
        .limit(limit)
    )
    eventos_raw = list(ev_r.scalars().all())
    eventos = await _eventos_con_usuario(db, eventos_raw)

    return {
        "codigo":    ubic.codigo,
        "zona":      ubic.zona.nombre if ubic.zona else "—",
        "capacidad": ubic.capacidad_kg,
        "eventos":   eventos,
    }


# ─── DASHBOARD — KPIs ─────────────────────────────────────────────────────────

@router.get("/dashboard/kpis", response_model=WMSKPIs)
async def dashboard_kpis(
    almacen_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    hoy = date.today()
    f_desde = fecha_desde or date(hoy.year, hoy.month, 1)
    f_hasta = fecha_hasta or hoy

    # Base filter para órdenes de salida entregadas
    filtro_base = [
        WMSOrdenSalida.deleted_at.is_(None),
        WMSOrdenSalida.estado == "ENTREGADO",
    ]
    if almacen_id:
        filtro_base.append(WMSOrdenSalida.almacen_id == almacen_id)

    # Total entregadas en el período (usando fecha de despacho vía join)
    total_r = await db.execute(
        select(func.count(WMSOrdenSalida.id)).where(*filtro_base)
    )
    ordenes_entregadas_total = total_r.scalar() or 0

    # On-Time: entregadas donde fecha_entrega_real <= fecha_requerida
    ot_r = await db.execute(
        select(func.count(WMSDespacho.id))
        .join(WMSOrdenSalida, WMSDespacho.orden_id == WMSOrdenSalida.id)
        .where(
            WMSDespacho.deleted_at.is_(None),
            WMSDespacho.estado == "ENTREGADO",
            WMSOrdenSalida.fecha_requerida.isnot(None),
            WMSDespacho.fecha_entrega_real <= WMSOrdenSalida.fecha_requerida,
            *(([WMSOrdenSalida.almacen_id == almacen_id] if almacen_id else [])
        ),
    ))
    ordenes_on_time = ot_r.scalar() or 0

    # In-Full: todas las líneas de la orden completas (cantidad_despachada >= cantidad_solicitada)
    # Usamos subquery: ordenes donde ningún detalle tenga cantidad_despachada < cantidad_solicitada
    if_r = await db.execute(
        select(func.count(WMSOrdenSalida.id))
        .where(
            *filtro_base,
            ~WMSOrdenSalida.id.in_(
                select(WMSOrdenSalidaDetalle.orden_id).where(
                    WMSOrdenSalidaDetalle.cantidad_despachada < WMSOrdenSalidaDetalle.cantidad_solicitada
                )
            ),
        )
    )
    ordenes_in_full = if_r.scalar() or 0

    # OTIF: on_time AND in_full — aproximado con conteos separados (no podemos cruzar IDs sin subquery compleja)
    ordenes_otif = min(ordenes_on_time, ordenes_in_full)

    # Perfect Order = OTIF (sin calidad deficiente) — simplificado
    ordenes_perfect = ordenes_otif

    on_time_pct = round(ordenes_on_time / ordenes_entregadas_total * 100, 2) if ordenes_entregadas_total else 0.0
    in_full_pct = round(ordenes_in_full / ordenes_entregadas_total * 100, 2) if ordenes_entregadas_total else 0.0
    otif_pct = round(ordenes_otif / ordenes_entregadas_total * 100, 2) if ordenes_entregadas_total else 0.0
    perfect_pct = round(ordenes_perfect / ordenes_entregadas_total * 100, 2) if ordenes_entregadas_total else 0.0

    # Fill Rate: unidades despachadas / unidades solicitadas (todas las órdenes)
    fr_r = await db.execute(
        select(
            func.sum(WMSOrdenSalidaDetalle.cantidad_solicitada),
            func.sum(WMSOrdenSalidaDetalle.cantidad_despachada),
        )
        .join(WMSOrdenSalida, WMSOrdenSalidaDetalle.orden_id == WMSOrdenSalida.id)
        .where(WMSOrdenSalida.deleted_at.is_(None),
               *([WMSOrdenSalida.almacen_id == almacen_id] if almacen_id else []))
    )
    fr_row = fr_r.one()
    unidades_sol = fr_row[0] or 0.0
    unidades_des = fr_row[1] or 0.0
    fill_rate_pct = round(unidades_des / unidades_sol * 100, 2) if unidades_sol else 0.0

    # Inventory Accuracy: ubicaciones contadas correctamente (diferencia==0) / total contadas
    ia_r = await db.execute(
        select(
            func.count(WMSConteoDetalle.id),
            func.sum(
                func.cast(
                    and_(WMSConteoDetalle.cantidad_fisica.isnot(None), WMSConteoDetalle.diferencia == 0),
                    Integer,
                )
            ),
        )
        .where(WMSConteoDetalle.ajustado == True)
    )
    ia_row = ia_r.one()
    ubic_contadas = ia_row[0] or 0
    ubic_correctas = int(ia_row[1] or 0)
    ia_pct = round(ubic_correctas / ubic_contadas * 100, 2) if ubic_contadas else 0.0

    # Pendientes
    rec_pend_r = await db.execute(
        select(func.count(WMSRecepcion.id)).where(
            WMSRecepcion.deleted_at.is_(None),
            WMSRecepcion.estado.in_(["BORRADOR", "EN_PROCESO"]),
            *([WMSRecepcion.almacen_id == almacen_id] if almacen_id else []),
        )
    )
    recepciones_pendientes = rec_pend_r.scalar() or 0

    ord_pend_r = await db.execute(
        select(func.count(WMSOrdenSalida.id)).where(
            WMSOrdenSalida.deleted_at.is_(None),
            WMSOrdenSalida.estado.in_(["PENDIENTE", "EN_PICKING", "EMPACANDO"]),
            *([WMSOrdenSalida.almacen_id == almacen_id] if almacen_id else []),
        )
    )
    ordenes_salida_pendientes = ord_pend_r.scalar() or 0

    # Órdenes por estado
    estados_r = await db.execute(
        select(WMSOrdenSalida.estado, func.count(WMSOrdenSalida.id))
        .where(WMSOrdenSalida.deleted_at.is_(None),
               *([WMSOrdenSalida.almacen_id == almacen_id] if almacen_id else []))
        .group_by(WMSOrdenSalida.estado)
    )
    ordenes_por_estado = {row[0]: row[1] for row in estados_r.all()}

    return WMSKPIs(
        ordenes_entregadas_total=ordenes_entregadas_total,
        ordenes_on_time=ordenes_on_time,
        on_time_pct=on_time_pct,
        ordenes_in_full=ordenes_in_full,
        in_full_pct=in_full_pct,
        ordenes_otif=ordenes_otif,
        otif_pct=otif_pct,
        ordenes_perfect=ordenes_perfect,
        perfect_order_pct=perfect_pct,
        unidades_solicitadas=unidades_sol,
        unidades_despachadas=unidades_des,
        fill_rate_pct=fill_rate_pct,
        ubicaciones_contadas=ubic_contadas,
        ubicaciones_correctas=ubic_correctas,
        inventory_accuracy_pct=ia_pct,
        recepciones_pendientes=recepciones_pendientes,
        ordenes_salida_pendientes=ordenes_salida_pendientes,
        ordenes_por_estado=ordenes_por_estado,
    )


@router.get("/dashboard/alertas", response_model=WMSAlertasResponse)
async def dashboard_alertas(
    almacen_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    hoy = date.today()
    alertas = []

    # Recepciones pendientes (BORRADOR o EN_PROCESO)
    rec_q = select(func.count(WMSRecepcion.id)).where(
        WMSRecepcion.deleted_at.is_(None),
        WMSRecepcion.estado.in_(["BORRADOR", "EN_PROCESO"]),
    )
    if almacen_id:
        rec_q = rec_q.where(WMSRecepcion.almacen_id == almacen_id)
    rec_r = await db.execute(rec_q)
    recepciones_pendientes = rec_r.scalar() or 0
    if recepciones_pendientes:
        alertas.append({"tipo": "RECEPCION_PENDIENTE", "mensaje": f"{recepciones_pendientes} recepciones en proceso", "count": recepciones_pendientes})

    # Órdenes urgentes pendientes
    urg_q = select(func.count(WMSOrdenSalida.id)).where(
        WMSOrdenSalida.deleted_at.is_(None),
        WMSOrdenSalida.prioridad.in_(["ALTA", "URGENTE"]),
        WMSOrdenSalida.estado.in_(["PENDIENTE", "EN_PICKING"]),
    )
    if almacen_id:
        urg_q = urg_q.where(WMSOrdenSalida.almacen_id == almacen_id)
    urg_r = await db.execute(urg_q)
    ordenes_urgentes = urg_r.scalar() or 0
    if ordenes_urgentes:
        alertas.append({"tipo": "ORDEN_URGENTE", "mensaje": f"{ordenes_urgentes} órdenes urgentes sin despachar", "count": ordenes_urgentes})

    # Órdenes vencidas (fecha_requerida < hoy y no entregadas)
    venc_q = select(func.count(WMSOrdenSalida.id)).where(
        WMSOrdenSalida.deleted_at.is_(None),
        WMSOrdenSalida.fecha_requerida < hoy,
        WMSOrdenSalida.estado.notin_(["ENTREGADO", "CANCELADO"]),
    )
    if almacen_id:
        venc_q = venc_q.where(WMSOrdenSalida.almacen_id == almacen_id)
    venc_r = await db.execute(venc_q)
    ordenes_vencidas = venc_r.scalar() or 0
    if ordenes_vencidas:
        alertas.append({"tipo": "ORDEN_VENCIDA", "mensaje": f"{ordenes_vencidas} órdenes con fecha vencida", "count": ordenes_vencidas})

    # Lotes próximos a vencer (dentro de 30 días)
    limite_venc = hoy + timedelta(days=30)
    prox_venc_q = select(func.count(WMSLote.id)).where(
        WMSLote.activo == True,
        WMSLote.fecha_vencimiento.isnot(None),
        WMSLote.fecha_vencimiento <= limite_venc,
        WMSLote.fecha_vencimiento >= hoy,
    )
    prox_r = await db.execute(prox_venc_q)
    productos_proximos_vencer = prox_r.scalar() or 0
    if productos_proximos_vencer:
        alertas.append({"tipo": "LOTE_PROXIMO_VENCER", "mensaje": f"{productos_proximos_vencer} lotes vencen en los próximos 30 días", "count": productos_proximos_vencer})

    return WMSAlertasResponse(
        recepciones_pendientes=recepciones_pendientes,
        ordenes_urgentes=ordenes_urgentes,
        ordenes_vencidas=ordenes_vencidas,
        productos_proximos_vencer=productos_proximos_vencer,
        alertas=alertas,
    )
