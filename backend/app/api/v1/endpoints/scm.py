from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.proveedor import Proveedor
from app.infrastructure.models.scm import (
    ScmSolicitudCompra, ScmSolicitudItem, ScmOrdenCompra, ScmOrdenItem,
    ScmEvaluacionProveedor, EstadoSolicitudSCM, EstadoOrdenSCM,
    CategoriaSCM, PrioridadSCM, ClasificacionProveedor, RecomendacionProveedor,
)

router = APIRouter(prefix="/scm", tags=["SCM"])


# ── Helpers ────────────────────────────────────────────────────────────────

async def _gen_numero_solicitud(db: AsyncSession) -> str:
    year = date.today().year
    res = await db.execute(select(func.count(ScmSolicitudCompra.id)))
    seq = (res.scalar_one() or 0) + 1
    return f"SCM-SOL-{year}-{seq:05d}"


async def _gen_numero_orden(db: AsyncSession) -> str:
    year = date.today().year
    res = await db.execute(select(func.count(ScmOrdenCompra.id)))
    seq = (res.scalar_one() or 0) + 1
    return f"SCM-OC-{year}-{seq:05d}"


def _solicitud_to_dict(s: ScmSolicitudCompra, include_items: bool = False) -> dict:
    d = {
        "id": s.id,
        "numero": s.numero,
        "titulo": s.titulo,
        "descripcion": s.descripcion,
        "categoria": s.categoria.value if s.categoria else None,
        "prioridad": s.prioridad.value if s.prioridad else None,
        "estado": s.estado.value if s.estado else None,
        "fecha_requerida": s.fecha_requerida.isoformat() if s.fecha_requerida else None,
        "presupuesto_estimado": s.presupuesto_estimado,
        "moneda": s.moneda,
        "justificacion": s.justificacion,
        "observaciones": s.observaciones,
        "fecha_aprobacion": s.fecha_aprobacion.isoformat() if s.fecha_aprobacion else None,
        "motivo_rechazo": s.motivo_rechazo,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "solicitante_id": s.solicitante_id,
        "aprobador_id": s.aprobador_id,
        "proveedor_id": s.proveedor_id,
    }
    if include_items and s.items:
        d["items"] = [
            {
                "id": i.id,
                "descripcion": i.descripcion,
                "unidad": i.unidad,
                "cantidad": i.cantidad,
                "precio_estimado": i.precio_estimado,
                "total_estimado": i.total_estimado,
                "especificaciones": i.especificaciones,
            }
            for i in s.items
        ]
    return d


def _orden_to_dict(o: ScmOrdenCompra, include_items: bool = False) -> dict:
    d = {
        "id": o.id,
        "numero": o.numero,
        "solicitud_id": o.solicitud_id,
        "proveedor_id": o.proveedor_id,
        "creado_por_id": o.creado_por_id,
        "estado": o.estado.value if o.estado else None,
        "categoria": o.categoria.value if o.categoria else None,
        "prioridad": o.prioridad.value if o.prioridad else None,
        "fecha_emision": o.fecha_emision.isoformat() if o.fecha_emision else None,
        "fecha_entrega_esperada": o.fecha_entrega_esperada.isoformat() if o.fecha_entrega_esperada else None,
        "fecha_entrega_real": o.fecha_entrega_real.isoformat() if o.fecha_entrega_real else None,
        "subtotal": o.subtotal,
        "impuestos": o.impuestos,
        "total": o.total,
        "moneda": o.moneda,
        "condiciones_pago": o.condiciones_pago,
        "lugar_entrega": o.lugar_entrega,
        "notas": o.notas,
        "codigo_sap": o.codigo_sap,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }
    if include_items and o.items:
        d["items"] = [
            {
                "id": i.id,
                "descripcion": i.descripcion,
                "codigo_producto": i.codigo_producto,
                "unidad": i.unidad,
                "cantidad": i.cantidad,
                "cantidad_recibida": i.cantidad_recibida,
                "precio_unitario": i.precio_unitario,
                "descuento_pct": i.descuento_pct,
                "total": i.total,
                "especificaciones": i.especificaciones,
            }
            for i in o.items
        ]
    return d


# ── Dashboard ──────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def scm_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    total_sol = await db.execute(select(func.count(ScmSolicitudCompra.id)))
    sol_pendientes = await db.execute(
        select(func.count(ScmSolicitudCompra.id)).where(
            ScmSolicitudCompra.estado == EstadoSolicitudSCM.PENDIENTE
        )
    )
    oc_abiertas = await db.execute(
        select(func.count(ScmOrdenCompra.id)).where(
            ScmOrdenCompra.estado.in_([
                EstadoOrdenSCM.ENVIADA, EstadoOrdenSCM.CONFIRMADA, EstadoOrdenSCM.EN_TRANSITO,
                EstadoOrdenSCM.RECIBIDA_PARCIAL,
            ])
        )
    )
    valor_oc = await db.execute(
        select(func.coalesce(func.sum(ScmOrdenCompra.total), 0)).where(
            ScmOrdenCompra.estado.in_([
                EstadoOrdenSCM.ENVIADA, EstadoOrdenSCM.CONFIRMADA, EstadoOrdenSCM.EN_TRANSITO,
                EstadoOrdenSCM.RECIBIDA_PARCIAL,
            ])
        )
    )
    proveedores_activos = await db.execute(
        select(func.count(Proveedor.id)).where(Proveedor.activo == True)
    )
    oc_por_estado = await db.execute(
        select(ScmOrdenCompra.estado, func.count(ScmOrdenCompra.id).label("cnt"))
        .group_by(ScmOrdenCompra.estado)
    )
    sol_por_estado = await db.execute(
        select(ScmSolicitudCompra.estado, func.count(ScmSolicitudCompra.id).label("cnt"))
        .group_by(ScmSolicitudCompra.estado)
    )
    return {
        "kpis": {
            "total_solicitudes": total_sol.scalar_one(),
            "solicitudes_pendientes": sol_pendientes.scalar_one(),
            "oc_abiertas": oc_abiertas.scalar_one(),
            "valor_oc_en_proceso": valor_oc.scalar_one(),
            "proveedores_activos": proveedores_activos.scalar_one(),
        },
        "oc_por_estado": {row.estado.value: row.cnt for row in oc_por_estado.all()},
        "sol_por_estado": {row.estado.value: row.cnt for row in sol_por_estado.all()},
    }


# ── Solicitudes de Compra ──────────────────────────────────────────────────

class SolicitudItemIn(BaseModel):
    descripcion: str
    unidad: Optional[str] = None
    cantidad: float = 1
    precio_estimado: Optional[float] = None
    especificaciones: Optional[str] = None


class SolicitudCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    categoria: CategoriaSCM = CategoriaSCM.OTROS
    prioridad: PrioridadSCM = PrioridadSCM.MEDIA
    fecha_requerida: Optional[date] = None
    presupuesto_estimado: Optional[float] = None
    moneda: str = "COP"
    justificacion: Optional[str] = None
    proveedor_id: Optional[int] = None
    items: List[SolicitudItemIn] = []


class AprobarRechazarIn(BaseModel):
    motivo: Optional[str] = None


@router.get("/solicitudes")
async def listar_solicitudes(
    estado: Optional[str] = Query(None),
    prioridad: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    conds = [ScmSolicitudCompra.activo == True]
    if estado:
        conds.append(ScmSolicitudCompra.estado == EstadoSolicitudSCM(estado))
    if prioridad:
        conds.append(ScmSolicitudCompra.prioridad == PrioridadSCM(prioridad))
    where = and_(*conds)

    total_res = await db.execute(select(func.count(ScmSolicitudCompra.id)).where(where))
    total = total_res.scalar_one()

    result = await db.execute(
        select(ScmSolicitudCompra).where(where)
        .options(selectinload(ScmSolicitudCompra.items))
        .order_by(ScmSolicitudCompra.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    items = list(result.scalars().all())
    return {
        "items": [_solicitud_to_dict(s, include_items=True) for s in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/solicitudes", status_code=201)
async def crear_solicitud(
    data: SolicitudCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    numero = await _gen_numero_solicitud(db)
    presupuesto = data.presupuesto_estimado
    if not presupuesto and data.items:
        presupuesto = sum(
            (i.cantidad * (i.precio_estimado or 0)) for i in data.items
        )

    sol = ScmSolicitudCompra(
        numero=numero,
        solicitante_id=current_user.id,
        titulo=data.titulo,
        descripcion=data.descripcion,
        categoria=data.categoria,
        prioridad=data.prioridad,
        estado=EstadoSolicitudSCM.BORRADOR,
        fecha_requerida=data.fecha_requerida,
        presupuesto_estimado=presupuesto,
        moneda=data.moneda,
        justificacion=data.justificacion,
        proveedor_id=data.proveedor_id,
    )
    db.add(sol)
    await db.flush()

    for item_data in data.items:
        total_est = item_data.cantidad * (item_data.precio_estimado or 0)
        item = ScmSolicitudItem(
            solicitud_id=sol.id,
            descripcion=item_data.descripcion,
            unidad=item_data.unidad,
            cantidad=item_data.cantidad,
            precio_estimado=item_data.precio_estimado,
            total_estimado=total_est or None,
            especificaciones=item_data.especificaciones,
        )
        db.add(item)

    await db.commit()
    await db.refresh(sol)
    return _solicitud_to_dict(sol)


@router.put("/solicitudes/{solicitud_id}/enviar")
async def enviar_solicitud(
    solicitud_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    sol = await db.get(ScmSolicitudCompra, solicitud_id)
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if sol.estado != EstadoSolicitudSCM.BORRADOR:
        raise HTTPException(status_code=400, detail="Solo se pueden enviar solicitudes en borrador")
    sol.estado = EstadoSolicitudSCM.PENDIENTE
    await db.commit()
    return _solicitud_to_dict(sol)


@router.put("/solicitudes/{solicitud_id}/aprobar")
async def aprobar_solicitud(
    solicitud_id: int,
    body: AprobarRechazarIn = AprobarRechazarIn(),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    sol = await db.get(ScmSolicitudCompra, solicitud_id)
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    sol.estado = EstadoSolicitudSCM.APROBADA
    sol.aprobador_id = current_user.id
    sol.fecha_aprobacion = date.today()
    await db.commit()
    return _solicitud_to_dict(sol)


@router.put("/solicitudes/{solicitud_id}/rechazar")
async def rechazar_solicitud(
    solicitud_id: int,
    body: AprobarRechazarIn,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    sol = await db.get(ScmSolicitudCompra, solicitud_id)
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    sol.estado = EstadoSolicitudSCM.RECHAZADA
    sol.aprobador_id = current_user.id
    sol.motivo_rechazo = body.motivo
    await db.commit()
    return _solicitud_to_dict(sol)


# ── Órdenes de Compra ─────────────────────────────────────────────────────

class OrdenItemIn(BaseModel):
    descripcion: str
    codigo_producto: Optional[str] = None
    unidad: Optional[str] = None
    cantidad: float = 1
    precio_unitario: float = 0
    descuento_pct: Optional[float] = 0
    especificaciones: Optional[str] = None


class OrdenCreate(BaseModel):
    proveedor_id: int
    solicitud_id: Optional[int] = None
    categoria: CategoriaSCM = CategoriaSCM.OTROS
    prioridad: PrioridadSCM = PrioridadSCM.MEDIA
    fecha_entrega_esperada: Optional[date] = None
    moneda: str = "COP"
    condiciones_pago: Optional[str] = None
    lugar_entrega: Optional[str] = None
    notas: Optional[str] = None
    impuestos_pct: float = 19.0
    items: List[OrdenItemIn] = []


class EstadoUpdate(BaseModel):
    estado: EstadoOrdenSCM
    fecha_entrega_real: Optional[date] = None
    notas: Optional[str] = None


@router.get("/ordenes-compra")
async def listar_ordenes(
    estado: Optional[str] = Query(None),
    proveedor_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    conds = [ScmOrdenCompra.activo == True]
    if estado:
        conds.append(ScmOrdenCompra.estado == EstadoOrdenSCM(estado))
    if proveedor_id:
        conds.append(ScmOrdenCompra.proveedor_id == proveedor_id)
    where = and_(*conds)

    total_res = await db.execute(select(func.count(ScmOrdenCompra.id)).where(where))
    total = total_res.scalar_one()

    result = await db.execute(
        select(ScmOrdenCompra).where(where)
        .options(selectinload(ScmOrdenCompra.items))
        .order_by(ScmOrdenCompra.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    items = list(result.scalars().all())
    return {
        "items": [_orden_to_dict(o, include_items=True) for o in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/ordenes-compra", status_code=201)
async def crear_orden(
    data: OrdenCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    proveedor = await db.get(Proveedor, data.proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    numero = await _gen_numero_orden(db)

    subtotal = sum(
        item.cantidad * item.precio_unitario * (1 - (item.descuento_pct or 0) / 100)
        for item in data.items
    )
    impuestos = subtotal * data.impuestos_pct / 100
    total = subtotal + impuestos

    orden = ScmOrdenCompra(
        numero=numero,
        solicitud_id=data.solicitud_id,
        proveedor_id=data.proveedor_id,
        creado_por_id=current_user.id,
        estado=EstadoOrdenSCM.BORRADOR,
        categoria=data.categoria,
        prioridad=data.prioridad,
        fecha_emision=date.today(),
        fecha_entrega_esperada=data.fecha_entrega_esperada,
        moneda=data.moneda,
        condiciones_pago=data.condiciones_pago,
        lugar_entrega=data.lugar_entrega,
        notas=data.notas,
        subtotal=round(subtotal, 2),
        impuestos=round(impuestos, 2),
        total=round(total, 2),
    )
    db.add(orden)
    await db.flush()

    for item_data in data.items:
        item_total = (
            item_data.cantidad
            * item_data.precio_unitario
            * (1 - (item_data.descuento_pct or 0) / 100)
        )
        item = ScmOrdenItem(
            orden_id=orden.id,
            descripcion=item_data.descripcion,
            codigo_producto=item_data.codigo_producto,
            unidad=item_data.unidad,
            cantidad=item_data.cantidad,
            precio_unitario=item_data.precio_unitario,
            descuento_pct=item_data.descuento_pct,
            total=round(item_total, 2),
            especificaciones=item_data.especificaciones,
        )
        db.add(item)

    await db.commit()
    await db.refresh(orden)
    return _orden_to_dict(orden)


@router.get("/ordenes-compra/{orden_id}")
async def detalle_orden(
    orden_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(ScmOrdenCompra).where(ScmOrdenCompra.id == orden_id)
        .options(selectinload(ScmOrdenCompra.items))
    )
    orden = result.scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return _orden_to_dict(orden, include_items=True)


@router.put("/ordenes-compra/{orden_id}/estado")
async def actualizar_estado_orden(
    orden_id: int,
    body: EstadoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    orden = await db.get(ScmOrdenCompra, orden_id)
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    orden.estado = body.estado
    if body.fecha_entrega_real:
        orden.fecha_entrega_real = body.fecha_entrega_real
    if body.notas:
        orden.notas = body.notas
    await db.commit()
    return _orden_to_dict(orden)


# ── Evaluaciones de Proveedor ──────────────────────────────────────────────

class EvaluacionCreate(BaseModel):
    proveedor_id: int
    periodo: str
    calidad: Optional[float] = None
    tiempo_entrega: Optional[float] = None
    precio: Optional[float] = None
    servicio: Optional[float] = None
    documentacion: Optional[float] = None
    comentarios: Optional[str] = None
    recomendacion: Optional[RecomendacionProveedor] = None


@router.get("/evaluaciones/proveedor/{proveedor_id}")
async def evaluaciones_proveedor(
    proveedor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(ScmEvaluacionProveedor)
        .where(ScmEvaluacionProveedor.proveedor_id == proveedor_id)
        .order_by(ScmEvaluacionProveedor.created_at.desc())
    )
    rows = result.scalars().all()
    return [
        {
            "id": e.id,
            "periodo": e.periodo,
            "calidad": e.calidad,
            "tiempo_entrega": e.tiempo_entrega,
            "precio": e.precio,
            "servicio": e.servicio,
            "documentacion": e.documentacion,
            "puntaje_total": e.puntaje_total,
            "clasificacion": e.clasificacion.value if e.clasificacion else None,
            "comentarios": e.comentarios,
            "recomendacion": e.recomendacion.value if e.recomendacion else None,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in rows
    ]


@router.post("/evaluaciones", status_code=201)
async def crear_evaluacion(
    data: EvaluacionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    scores = [v for v in [data.calidad, data.tiempo_entrega, data.precio, data.servicio, data.documentacion] if v is not None]
    puntaje = round(sum(scores) / len(scores), 2) if scores else None

    clasificacion = None
    if puntaje is not None:
        if puntaje >= 8.5:
            clasificacion = ClasificacionProveedor.A
        elif puntaje >= 7.0:
            clasificacion = ClasificacionProveedor.B
        elif puntaje >= 5.5:
            clasificacion = ClasificacionProveedor.C
        else:
            clasificacion = ClasificacionProveedor.D

    ev = ScmEvaluacionProveedor(
        proveedor_id=data.proveedor_id,
        evaluador_id=current_user.id,
        periodo=data.periodo,
        calidad=data.calidad,
        tiempo_entrega=data.tiempo_entrega,
        precio=data.precio,
        servicio=data.servicio,
        documentacion=data.documentacion,
        puntaje_total=puntaje,
        clasificacion=clasificacion,
        comentarios=data.comentarios,
        recomendacion=data.recomendacion,
    )
    db.add(ev)
    await db.commit()
    return {"id": ev.id, "puntaje_total": puntaje, "clasificacion": clasificacion.value if clasificacion else None}


# ── Proveedores SCM ────────────────────────────────────────────────────────

@router.get("/proveedores")
async def proveedores_scm(
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    conds = [Proveedor.activo == True]
    if q:
        conds.append(Proveedor.razon_social.ilike(f"%{q}%"))
    where = and_(*conds)

    total_res = await db.execute(select(func.count(Proveedor.id)).where(where))
    total = total_res.scalar_one()

    result = await db.execute(
        select(Proveedor).where(where)
        .order_by(Proveedor.razon_social)
        .offset((page - 1) * page_size).limit(page_size)
    )
    proveedores = result.scalars().all()

    prov_ids = [p.id for p in proveedores]
    oc_counts: dict = {}
    if prov_ids:
        oc_res = await db.execute(
            select(ScmOrdenCompra.proveedor_id, func.count(ScmOrdenCompra.id).label("cnt"))
            .where(ScmOrdenCompra.proveedor_id.in_(prov_ids))
            .group_by(ScmOrdenCompra.proveedor_id)
        )
        oc_counts = {row.proveedor_id: row.cnt for row in oc_res.all()}

    eval_res = await db.execute(
        select(
            ScmEvaluacionProveedor.proveedor_id,
            func.avg(ScmEvaluacionProveedor.puntaje_total).label("prom"),
            func.max(ScmEvaluacionProveedor.clasificacion).label("cls"),
        )
        .where(ScmEvaluacionProveedor.proveedor_id.in_(prov_ids))
        .group_by(ScmEvaluacionProveedor.proveedor_id)
    )
    eval_map: dict = {row.proveedor_id: {"prom": row.prom, "cls": row.cls} for row in eval_res.all()}

    items = []
    for p in proveedores:
        ev = eval_map.get(p.id, {})
        items.append({
            "id": p.id,
            "nit": p.nit,
            "razon_social": p.razon_social,
            "nombre_comercial": p.nombre_comercial,
            "tipo": p.tipo,
            "contacto_nombre": p.contacto_nombre,
            "contacto_email": p.contacto_email,
            "ciudad": p.ciudad,
            "total_ordenes": oc_counts.get(p.id, 0),
            "puntaje_promedio": round(ev.get("prom") or 0, 1) if ev.get("prom") else None,
            "clasificacion": ev.get("cls").value if ev.get("cls") else None,
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size}
