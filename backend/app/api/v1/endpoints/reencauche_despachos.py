"""
Planta de reencauche · recogidas, entregas, liquidación, garantías y CMMS.

`router_tms` cuelga de /tms: las solicitudes de recogida pendientes aparecen
en la planificación del TMS, así que las ve quien tiene el TMS contratado.
"""
from datetime import date, datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import paginacion, reencauche_flujo as flujo, reencauche_logistica as logi
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.infrastructure.models.reencauche import (
    RTMArchivo, RTMCarcasa, RTMEntrega, RTMEntregaCarcasa, RTMLiquidacion, RTMLiquidacionLinea, RTMRecepcion,
    RTMReclamo, RTMSolicitudRecogida,
)
from app.infrastructure.models.tms import TMSParada, TMSViaje
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.wms import WMSCliente, WMSDepositante

router = APIRouter(prefix="/reencauche", tags=["Planta de reencauche"])
router_tms = APIRouter(prefix="/tms", tags=["TMS"])


def _f(v):
    return float(v) if v is not None else None


async def _deps(db: AsyncSession, ids) -> Dict[int, str]:
    ids = [i for i in set(ids) if i]
    return {i: n for i, n in (await db.execute(select(WMSDepositante.id, WMSDepositante.nombre).where(
        WMSDepositante.id.in_(ids or [0])))).all()}


# ── Recogidas ─────────────────────────────────────────────────────────────────

class SolicitudIn(BaseModel):
    depositante_id: int
    sede: str = Field(min_length=2, max_length=150)
    ciudad: str = Field(min_length=2, max_length=100)
    direccion: Optional[str] = Field(default=None, max_length=300)
    contacto: Optional[str] = Field(default=None, max_length=150)
    telefono: Optional[str] = Field(default=None, max_length=30)
    fecha_requerida: date
    cantidad_estimada: int = Field(gt=0, le=2000)
    observaciones: Optional[str] = None


async def _solicitud_dict(db: AsyncSession, s: RTMSolicitudRecogida, deps=None) -> Dict:
    deps = deps or await _deps(db, [s.depositante_id])
    parada = await db.get(TMSParada, s.parada_id) if s.parada_id else None
    viaje = await db.get(TMSViaje, s.viaje_id) if s.viaje_id else None
    rec = (await db.execute(select(RTMRecepcion).where(RTMRecepcion.solicitud_id == s.id))).scalar()
    return {"id": s.id, "codigo": s.codigo, "depositante_id": s.depositante_id, "cliente": deps.get(s.depositante_id),
            "sede": s.sede, "ciudad": s.ciudad, "direccion": s.direccion, "contacto": s.contacto,
            "telefono": s.telefono, "fecha_requerida": s.fecha_requerida, "cantidad_estimada": s.cantidad_estimada,
            "estado": s.estado, "viaje_id": s.viaje_id, "viaje": viaje.codigo if viaje else None,
            "viaje_estado": getattr(viaje.estado, "value", viaje.estado) if viaje else None,
            "parada_id": s.parada_id, "recogidas": parada.recogida_cantidad if parada else None,
            "remision": parada.recogida_remision if parada else None,
            "recepcion_id": rec.id if rec else None, "recepcion": rec.codigo if rec else None,
            "observaciones": s.observaciones}


@router.get("/recogidas")
async def recogidas(estado: Optional[str] = None, limite: int = Query(200, ge=1, le=1000),
                    db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    q = select(RTMSolicitudRecogida).order_by(RTMSolicitudRecogida.fecha_requerida.desc(), RTMSolicitudRecogida.id.desc())
    if estado:
        q = q.where(RTMSolicitudRecogida.estado == estado)
    filas = (await db.execute(q.limit(limite))).scalars().all()
    deps = await _deps(db, [s.depositante_id for s in filas])
    return [await _solicitud_dict(db, s, deps) for s in filas]


@router.post("/recogidas", status_code=201)
async def crear_recogida(data: SolicitudIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    if not await db.get(WMSDepositante, data.depositante_id):
        raise HTTPException(404, "El cliente no existe.")
    s = RTMSolicitudRecogida(codigo=await flujo.consecutivo(db, RTMSolicitudRecogida, "RG"), estado="PENDIENTE",
                             **data.model_dump())
    db.add(s)
    await db.commit()
    return await _solicitud_dict(db, s)


@router.post("/recogidas/{sid}/cancelar")
async def cancelar_recogida(sid: int, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    s = await db.get(RTMSolicitudRecogida, sid)
    if s is None:
        raise HTTPException(404, "Solicitud no encontrada.")
    if s.estado != "PENDIENTE":
        raise HTTPException(409, "Solo se cancela una solicitud que no se ha programado.")
    s.estado = "CANCELADA"
    await db.commit()
    return await _solicitud_dict(db, s)


class ProgramarIn(BaseModel):
    solicitud_ids: List[int]
    fecha: datetime
    vehiculo_id: Optional[int] = None


@router.post("/recogidas/programar", status_code=201)
async def programar(data: ProgramarIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    viaje = await logi.programar_recogidas(db, yo, data.solicitud_ids, data.fecha, data.vehiculo_id)
    await db.commit()
    paradas = (await db.execute(select(TMSParada).where(TMSParada.viaje_id == viaje.id)
                                .order_by(TMSParada.secuencia))).scalars().all()
    return {"viaje_id": viaje.id, "codigo": viaje.codigo,
            "paradas": [{"id": p.id, "secuencia": p.secuencia, "tipo": getattr(p.tipo, "value", p.tipo),
                         "ciudad": p.ciudad, "observaciones": p.observaciones} for p in paradas]}


@router_tms.get("/recogidas-reencauche")
async def recogidas_para_tms(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Para la planificación del TMS: recogidas de llantas pendientes de programar."""
    filas = (await db.execute(select(RTMSolicitudRecogida).where(RTMSolicitudRecogida.estado == "PENDIENTE")
                              .order_by(RTMSolicitudRecogida.fecha_requerida))).scalars().all()
    deps = await _deps(db, [s.depositante_id for s in filas])
    return [{"id": s.id, "codigo": s.codigo, "cliente": deps.get(s.depositante_id), "sede": s.sede, "ciudad": s.ciudad,
             "direccion": s.direccion, "fecha_requerida": s.fecha_requerida, "cantidad_estimada": s.cantidad_estimada}
            for s in filas]


# ── Entregas ──────────────────────────────────────────────────────────────────

@router.get("/entregas/propuesta")
async def propuesta(depositante_id: int, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Lo listo para entregar a ese cliente: terminadas y rechazadas por devolver.
    Las retenidas no aparecen."""
    return await logi.propuesta_entrega(db, depositante_id)


@router.get("/clientes-wms")
async def clientes_wms(q: Optional[str] = None, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    consulta = select(WMSCliente).where(WMSCliente.activo.isnot(False))
    if q:
        consulta = consulta.where(WMSCliente.nombre.ilike(f"%{q}%"))
    return [{"id": c.id, "nombre": c.nombre, "nit": c.nit, "ciudad": c.ciudad}
            for c in (await db.execute(consulta.order_by(WMSCliente.nombre).limit(50))).scalars()]


class EntregaIn(BaseModel):
    depositante_id: int
    carcasa_ids: List[int]
    modo: str = "VIAJE"
    wms_cliente_id: Optional[int] = None
    ciudad: Optional[str] = Field(default=None, max_length=100)
    direccion: Optional[str] = Field(default=None, max_length=300)
    precios: Dict[int, float] = {}


async def _entrega_dict(db: AsyncSession, e: RTMEntrega, detalle: bool = True) -> Dict:
    dep = await db.get(WMSDepositante, e.depositante_id)
    cli = await db.get(WMSCliente, e.wms_cliente_id) if e.wms_cliente_id else None
    viaje = await db.get(TMSViaje, e.viaje_id) if e.viaje_id else None
    liq = (await db.execute(select(RTMLiquidacion).where(RTMLiquidacion.entrega_id == e.id))).scalar()
    lineas = (await db.execute(select(RTMEntregaCarcasa, RTMCarcasa).join(
        RTMCarcasa, RTMCarcasa.id == RTMEntregaCarcasa.carcasa_id).where(RTMEntregaCarcasa.entrega_id == e.id)
        .order_by(RTMCarcasa.codigo))).all()
    d = {"id": e.id, "codigo": e.codigo, "depositante_id": e.depositante_id, "propietario": dep.nombre if dep else None,
         "cliente": cli.nombre if cli else (dep.nombre if dep else None), "tipo": e.tipo, "modo": e.modo,
         "estado": e.estado, "viaje_id": e.viaje_id, "viaje": viaje.codigo if viaje else None,
         "wms_despacho_id": e.wms_despacho_id, "ciudad": e.ciudad, "direccion": e.direccion, "placa": e.placa,
         "recibe_nombre": e.recibe_nombre, "recibido_en": e.recibido_en, "creada_en": e.created_at,
         "terminadas": sum(1 for ec, _ in lineas if ec.tipo == "TERMINADA"),
         "devoluciones": sum(1 for ec, _ in lineas if ec.tipo == "DEVOLUCION"),
         "liquidacion_id": liq.id if liq else None, "liquidacion": liq.codigo if liq else None}
    if detalle:
        d["llantas"] = [{"carcasa_id": c.id, "codigo": c.codigo, "medida": c.medida, "tipo": ec.tipo,
                         "precio": _f(ec.precio)} for ec, c in lineas]
    return d


@router.get("/entregas")
async def entregas(respuesta: Response, estado: Optional[str] = None, depositante_id: Optional[int] = None,
                   limite: int = Query(50, ge=1, le=500), desplazamiento: int = Query(0, ge=0),
                   db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    q = select(RTMEntrega).order_by(RTMEntrega.id.desc())
    if estado:
        q = q.where(RTMEntrega.estado == estado)
    if depositante_id:
        q = q.where(RTMEntrega.depositante_id == depositante_id)
    return [await _entrega_dict(db, e, False) for e in await paginacion.pagina(db, q, respuesta, limite, desplazamiento)]


@router.post("/entregas", status_code=201)
async def crear_entrega(data: EntregaIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    e = await logi.crear_entrega(db, yo, data.depositante_id, data.carcasa_ids, data.modo, data.wms_cliente_id,
                                 data.ciudad, data.direccion, data.precios)
    await db.commit()
    return await _entrega_dict(db, e)


@router.get("/entregas/{eid}")
async def ver_entrega(eid: int, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    e = await db.get(RTMEntrega, eid)
    if e is None:
        raise HTTPException(404, "Entrega no encontrada.")
    return await _entrega_dict(db, e)


class DespacharIn(BaseModel):
    placa: Optional[str] = Field(default=None, max_length=15)
    recibe_nombre: Optional[str] = Field(default=None, max_length=150)
    fecha_programada: Optional[datetime] = None


@router.post("/entregas/{eid}/despachar")
async def despachar(eid: int, data: DespacharIn, db: AsyncSession = Depends(get_db),
                    yo: Usuario = Depends(get_current_user)):
    e = (await db.execute(select(RTMEntrega).where(RTMEntrega.id == eid).with_for_update())).scalar()
    if e is None:
        raise HTTPException(404, "Entrega no encontrada.")
    await logi.despachar(db, e, yo, data.placa, data.recibe_nombre, data.fecha_programada)
    await db.commit()
    return await _entrega_dict(db, e)


@router.post("/entregas/{eid}/anular")
async def anular_entrega(eid: int, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    e = await db.get(RTMEntrega, eid)
    if e is None:
        raise HTTPException(404, "Entrega no encontrada.")
    if e.estado != "BORRADOR":
        raise HTTPException(409, "Solo se anula una entrega que no se ha despachado.")
    e.estado = "ANULADA"
    await db.commit()
    return await _entrega_dict(db, e)


# ── Liquidación ───────────────────────────────────────────────────────────────

async def _liq_dict(db: AsyncSession, l: RTMLiquidacion, detalle: bool = True) -> Dict:
    dep = await db.get(WMSDepositante, l.depositante_id)
    e = await db.get(RTMEntrega, l.entrega_id)
    d = {"id": l.id, "codigo": l.codigo, "entrega_id": l.entrega_id, "entrega": e.codigo if e else None,
         "depositante_id": l.depositante_id, "cliente": dep.nombre if dep else None, "estado": l.estado,
         "subtotal": _f(l.subtotal), "iva": _f(l.iva), "total": _f(l.total), "factura_id": l.factura_id,
         "aviso_factura": l.aviso_factura, "creada_en": l.created_at}
    if detalle:
        d["lineas"] = [{"id": x.id, "carcasa_id": x.carcasa_id, "concepto": x.concepto, "descripcion": x.descripcion,
                        "cantidad": x.cantidad, "valor_unitario": _f(x.valor_unitario), "total": _f(x.total)}
                       for x in (await db.execute(select(RTMLiquidacionLinea).where(
                           RTMLiquidacionLinea.liquidacion_id == l.id).order_by(RTMLiquidacionLinea.id))).scalars()]
        if l.factura_id:
            from app.infrastructure.models.erp import ERPFacturaCliente
            f = await db.get(ERPFacturaCliente, l.factura_id)
            d["factura"] = f.numero if f else None
    return d


@router.get("/liquidaciones")
async def liquidaciones(respuesta: Response, estado: Optional[str] = None, depositante_id: Optional[int] = None,
                        limite: int = Query(50, ge=1, le=500), desplazamiento: int = Query(0, ge=0),
                        db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    q = select(RTMLiquidacion).order_by(RTMLiquidacion.id.desc())
    if estado:
        q = q.where(RTMLiquidacion.estado == estado)
    if depositante_id:
        q = q.where(RTMLiquidacion.depositante_id == depositante_id)
    return [await _liq_dict(db, l, False) for l in await paginacion.pagina(db, q, respuesta, limite, desplazamiento)]


@router.get("/liquidaciones/{lid}")
async def ver_liquidacion(lid: int, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    l = await db.get(RTMLiquidacion, lid)
    if l is None:
        raise HTTPException(404, "Liquidación no encontrada.")
    return await _liq_dict(db, l)


@router.post("/liquidaciones/{lid}/aprobar")
async def aprobar_liquidacion(lid: int, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    """Aprobar factura en el ERP. Si la factura no se puede emitir (sin
    Finanzas, sin resolución, cliente sin NIT) queda aprobada con el aviso y se
    reintenta aprobando de nuevo."""
    l = (await db.execute(select(RTMLiquidacion).where(RTMLiquidacion.id == lid).with_for_update())).scalar()
    if l is None:
        raise HTTPException(404, "Liquidación no encontrada.")
    await logi.aprobar_liquidacion(db, l, yo)
    await db.commit()
    return await _liq_dict(db, l)


# ── Garantías ─────────────────────────────────────────────────────────────────

class ReclamoIn(BaseModel):
    codigo: str
    falla: str
    km: Optional[float] = Field(default=None, ge=0)
    condiciones: Optional[str] = None
    fecha: Optional[date] = None


async def _reclamo_dict(db: AsyncSession, r: RTMReclamo) -> Dict:
    c = await db.get(RTMCarcasa, r.carcasa_id)
    dep = await db.get(WMSDepositante, c.depositante_id) if c else None
    fotos = [{"id": a.id, "nombre": a.nombre} for a in (await db.execute(select(RTMArchivo).where(
        RTMArchivo.entidad == "RECLAMO", RTMArchivo.entidad_id == r.id))).scalars()]
    return {"id": r.id, "codigo": r.codigo, "carcasa_id": r.carcasa_id, "llanta": c.codigo if c else None,
            "cliente": dep.nombre if dep else None, "medida": c.medida if c else None, "orden_id": r.orden_id,
            "falla": r.falla, "km": r.km, "condiciones": r.condiciones, "estado": r.estado, "dictamen": r.dictamen,
            "causa": r.causa, "compensacion": r.compensacion, "compensacion_valor": _f(r.compensacion_valor),
            "fecha": r.fecha, "dictaminado_en": r.dictaminado_en, "fotos": fotos}


@router.get("/reclamos")
async def reclamos(respuesta: Response, estado: Optional[str] = None, limite: int = Query(50, ge=1, le=500),
                   desplazamiento: int = Query(0, ge=0), db: AsyncSession = Depends(get_db),
                   _: Usuario = Depends(get_current_user)):
    q = select(RTMReclamo).order_by(RTMReclamo.id.desc())
    if estado:
        q = q.where(RTMReclamo.estado == estado)
    return [await _reclamo_dict(db, r) for r in await paginacion.pagina(db, q, respuesta, limite, desplazamiento)]


@router.post("/reclamos", status_code=201)
async def crear_reclamo(data: ReclamoIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    r = await logi.crear_reclamo(db, data.codigo, data.falla, data.km, data.condiciones, data.fecha)
    await db.commit()
    return await _reclamo_dict(db, r)


class AvanceReclamoIn(BaseModel):
    estado: str
    dictamen: Optional[str] = None
    causa: Optional[str] = Field(default=None, max_length=200)
    compensacion: Optional[str] = Field(default=None, max_length=200)
    compensacion_valor: Optional[float] = Field(default=None, ge=0)


@router.post("/reclamos/{rid}/avanzar")
async def avanzar_reclamo(rid: int, data: AvanceReclamoIn, db: AsyncSession = Depends(get_db),
                          yo: Usuario = Depends(get_current_user)):
    r = await db.get(RTMReclamo, rid)
    if r is None:
        raise HTTPException(404, "Reclamo no encontrado.")
    await logi.avanzar_reclamo(db, r, yo, data.estado, data.dictamen, data.causa, data.compensacion,
                               data.compensacion_valor)
    await db.commit()
    return await _reclamo_dict(db, r)


@router.post("/reclamos/{rid}/fotos", status_code=201)
async def subir_foto_reclamo(rid: int, archivo: UploadFile = File(...), db: AsyncSession = Depends(get_db),
                             yo: Usuario = Depends(get_current_user)):
    from app.api.v1.endpoints.reencauche_operacion import guardar_archivo
    if not await db.get(RTMReclamo, rid):
        raise HTTPException(404, "Reclamo no encontrado.")
    res = await guardar_archivo(db, "RECLAMO", rid, archivo, yo.id)
    await db.commit()
    return res


# ── CMMS ──────────────────────────────────────────────────────────────────────

@router.get("/cmms/lotes")
async def lotes_cmms(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Lotes de reencauche abiertos del CMMS de la misma empresa que todavía no
    llegan a la planta."""
    from app.infrastructure.models.eam import EAMReencaucheDetalle, EAMReencaucheLote
    recibidos = select(RTMRecepcion.eam_lote_id).where(RTMRecepcion.eam_lote_id.isnot(None))
    filas = (await db.execute(
        select(EAMReencaucheLote, func.count(EAMReencaucheDetalle.id))
        .join(EAMReencaucheDetalle, EAMReencaucheDetalle.lote_id == EAMReencaucheLote.id)
        .where(EAMReencaucheLote.estado == "ABIERTO", EAMReencaucheDetalle.resultado == "PENDIENTE",
               EAMReencaucheLote.id.notin_(recibidos))
        .group_by(EAMReencaucheLote.id).order_by(EAMReencaucheLote.fecha_envio.desc()).limit(200))).all()
    return [{"id": l.id, "codigo": l.codigo, "fecha_envio": l.fecha_envio, "proveedor": l.proveedor,
             "remision": l.remision, "llantas": n} for l, n in filas]


@router.post("/cmms/lotes/{lote_id}/recibir", status_code=201)
async def recibir_lote(lote_id: int, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    rec = await logi.recibir_lote_cmms(db, yo, lote_id)
    await db.commit()
    return {"recepcion_id": rec.id, "codigo": rec.codigo, "carcasas": rec.contadas}
