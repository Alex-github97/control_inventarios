"""
API endpoints — WMS (Warehouse Management System)
Prefijo: /wms
"""
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, or_, Integer
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.wms import (
    WMSAlmacen, WMSZona, WMSUbicacion, WMSProducto, WMSLote, WMSSerie,
    WMSProveedor, WMSCliente, WMSTransportadora,
    WMSOrdenCompra, WMSOrdenCompraDetalle,
    WMSRecepcion, WMSRecepcionDetalle,
    WMSInventarioUbicacion, WMSMovimientoInventario,
    WMSConteoInventario, WMSConteoDetalle,
    WMSOrdenSalida, WMSOrdenSalidaDetalle,
    WMSPickingTarea, WMSPickingDetalle,
    WMSDespacho, WMSDespachoDetalle,
    WMSDevolucion, WMSDevolucionDetalle,
    WMSEventoTrazabilidad, WMSKPIDiario,
)
from app.application.schemas.wms import (
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
    WMSInventarioResponse, WMSAjusteInventario, WMSTransferenciaInventario, WMSMovimientoResponse,
    WMSConteoCreate, WMSConteoUpdate, WMSConteoResponse, WMSConteoDetalleUpdate,
    WMSOrdenSalidaCreate, WMSOrdenSalidaUpdate, WMSOrdenSalidaEstado, WMSOrdenSalidaResponse,
    WMSPickingTareaCreate, WMSPickingTareaUpdate, WMSPickingTareaResponse, WMSPickingConfirmItem,
    WMSDespachoCreate, WMSDespachoUpdate, WMSDespachoEstado, WMSDespachoResponse,
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
    rec = WMSRecepcion(**payload, operario_id=current_user.id)
    db.add(rec)
    await db.flush()
    for d in data.detalles:
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

    for det in rec.detalles:
        if det.estado_calidad == "APROBADO" and det.ubicacion_id and det.cantidad_recibida > 0:
            await _ajustar_inventario(
                db, det.producto_id, det.ubicacion_id, det.lote_id, det.cantidad_recibida
            )
            mov = WMSMovimientoInventario(
                tipo="RECEPCION",
                producto_id=det.producto_id,
                ubicacion_destino_id=det.ubicacion_id,
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
                ubicacion_id=det.ubicacion_id,
            )
    rec.estado = "COMPLETA"

    # Actualizar OC si aplica
    if rec.orden_compra_id:
        oc = await db.get(WMSOrdenCompra, rec.orden_compra_id)
        if oc:
            oc_dets = await db.execute(
                select(WMSOrdenCompraDetalle).where(WMSOrdenCompraDetalle.orden_id == oc.id)
            )
            for ocd in oc_dets.scalars().all():
                for det in rec.detalles:
                    if det.producto_id == ocd.producto_id:
                        ocd.cantidad_recibida = (ocd.cantidad_recibida or 0) + det.cantidad_recibida
            total_sol = sum(d.cantidad_solicitada for d in oc_dets.scalars().all() if False) or 1
            oc.estado = "COMPLETA"

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
    if almacen_id:
        q = q.join(WMSUbicacion, WMSInventarioUbicacion.ubicacion_id == WMSUbicacion.id)\
             .join(WMSZona, WMSUbicacion.zona_id == WMSZona.id)\
             .where(WMSZona.almacen_id == almacen_id)
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

    mov = WMSMovimientoInventario(
        tipo="TRANSFERENCIA",
        producto_id=data.producto_id,
        ubicacion_origen_id=data.ubicacion_origen_id,
        ubicacion_destino_id=data.ubicacion_destino_id,
        lote_id=data.lote_id,
        cantidad=data.cantidad,
        referencia_documento="TRANSFERENCIA",
        usuario_id=current_user.id,
        notas=data.notas,
    )
    db.add(mov)
    await db.commit()
    r2 = await db.execute(
        select(WMSMovimientoInventario)
        .options(selectinload(WMSMovimientoInventario.producto))
        .where(WMSMovimientoInventario.id == mov.id)
    )
    return r2.scalar_one()


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

    for det in orden.detalles:
        cantidad_pendiente = det.cantidad_solicitada - det.cantidad_preparada
        if cantidad_pendiente <= 0:
            continue

        # FIFO: inventario ordenado por fecha_vencimiento de lote (ASC nulls last)
        inv_q = (
            select(WMSInventarioUbicacion)
            .join(WMSLote, WMSInventarioUbicacion.lote_id == WMSLote.id, isouter=True)
            .where(
                WMSInventarioUbicacion.producto_id == det.producto_id,
                WMSInventarioUbicacion.cantidad_disponible > 0,
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

        for inv in inventarios:
            if cantidad_pendiente <= 0:
                break
            tomar = min(inv.cantidad_disponible, cantidad_pendiente)
            inv.cantidad_disponible -= tomar
            inv.cantidad_reservada = (inv.cantidad_reservada or 0) + tomar
            cantidad_pendiente -= tomar

            pick_det = WMSPickingDetalle(
                tarea_id=tarea.id,
                producto_id=det.producto_id,
                ubicacion_id=inv.ubicacion_id,
                lote_id=inv.lote_id,
                cantidad_solicitada=tomar,
            )
            db.add(pick_det)

    orden.estado = "EN_PICKING"
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

    det.cantidad_pickeada = data.cantidad_pickeada
    det.confirmado = True
    det.timestamp_confirmacion = datetime.utcnow()

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
    payload = data.model_dump(exclude={"detalles"})
    despacho = WMSDespacho(**payload)
    db.add(despacho)
    await db.flush()
    for d in data.detalles:
        det = WMSDespachoDetalle(despacho_id=despacho.id, **d.model_dump())
        db.add(det)
        # Descontar inventario al despachar
        inv_stmt = select(WMSInventarioUbicacion).where(
            and_(
                WMSInventarioUbicacion.producto_id == d.producto_id,
                WMSInventarioUbicacion.lote_id == d.lote_id,
                WMSInventarioUbicacion.cantidad_reservada >= d.cantidad,
            )
        )
        inv_r = await db.execute(inv_stmt)
        inv = inv_r.scalars().first()
        if inv:
            inv.cantidad_reservada -= d.cantidad
        # Registrar movimiento
        mov = WMSMovimientoInventario(
            tipo="DESPACHO",
            producto_id=d.producto_id,
            lote_id=d.lote_id,
            cantidad=d.cantidad,
            referencia_documento=data.numero_despacho,
            usuario_id=current_user.id,
        )
        db.add(mov)

    # Actualizar orden
    orden = await db.get(WMSOrdenSalida, data.orden_id)
    if orden:
        orden.estado = "DESPACHADO"

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
    _=Depends(get_current_user),
):
    obj = await db.get(WMSDespacho, despacho_id)
    if not obj or obj.deleted_at:
        raise HTTPException(404, "Despacho no encontrado")
    obj.estado = data.estado
    if data.fecha_entrega_real:
        obj.fecha_entrega_real = data.fecha_entrega_real
    if data.estado == "ENTREGADO":
        # Actualizar orden a ENTREGADO
        orden = await db.get(WMSOrdenSalida, obj.orden_id)
        if orden:
            orden.estado = "ENTREGADO"
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

@router.get("/trazabilidad/producto/{sku}", response_model=List[WMSEventoTrazabilidadResponse])
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
    r = await db.execute(
        select(WMSEventoTrazabilidad)
        .where(WMSEventoTrazabilidad.producto_id == prod.id)
        .order_by(WMSEventoTrazabilidad.created_at.desc())
        .limit(limit)
    )
    return r.scalars().all()


@router.get("/trazabilidad/lote/{numero_lote}", response_model=List[WMSEventoTrazabilidadResponse])
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
    r = await db.execute(
        select(WMSEventoTrazabilidad)
        .where(WMSEventoTrazabilidad.lote_id == lote.id)
        .order_by(WMSEventoTrazabilidad.created_at.desc())
        .limit(limit)
    )
    return r.scalars().all()


@router.get("/trazabilidad/ubicacion/{codigo}", response_model=List[WMSEventoTrazabilidadResponse])
async def trazabilidad_ubicacion(
    codigo: str,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ubic_r = await db.execute(select(WMSUbicacion).where(WMSUbicacion.codigo == codigo))
    ubic = ubic_r.scalar_one_or_none()
    if not ubic:
        raise HTTPException(404, f"Ubicación '{codigo}' no encontrada")
    r = await db.execute(
        select(WMSEventoTrazabilidad)
        .where(WMSEventoTrazabilidad.ubicacion_id == ubic.id)
        .order_by(WMSEventoTrazabilidad.created_at.desc())
        .limit(limit)
    )
    return r.scalars().all()


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
    prox_venc_q = select(func.count(WMSLote.id)).where(
        WMSLote.activo == True,
        WMSLote.fecha_vencimiento.isnot(None),
        WMSLote.fecha_vencimiento <= date(hoy.year, hoy.month + 1 if hoy.month < 12 else 1, hoy.day),
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
