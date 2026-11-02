"""
Planta de reencauche · operación.

Recepción y carcasas, terminal de estación (escanear, iniciar, terminar,
omitir), colas por estación, evaluación técnica, retenciones, disposición de
rechazos, ciclos de vulcanización y corrección de pasos. Toda escritura sobre
una orden pasa por `core/reencauche_flujo`.

Los pasos no tienen PUT ni DELETE: un paso cerrado no se edita ni se borra; se
corrige con `POST /pasos/{id}/corregir`, que deja los dos registros.
"""
import os
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import paginacion, reencauche_flujo as flujo, reencauche_logistica as logi
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.tenant import esquema_actual
from app.infrastructure.models.reencauche import (
    RTMArchivo, RTMCarcasa, RTMCiclo, RTMCicloCarcasa, RTMDisposicion, RTMEquipo, RTMEtapa, RTMMotivoRechazo,
    RTMOrden, RTMPaso, RTMPasoMotivo, RTMPasoPrueba, RTMReceta, RTMRecepcion, RTMRetencion, RTMSolicitudRecogida,
)
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.wms import WMSDepositante, WMSProducto

router = APIRouter(prefix="/reencauche", tags=["Planta de reencauche"])


def _f(v):
    return float(v) if v is not None else None


async def _carcasa_por_codigo(db: AsyncSession, codigo: str) -> RTMCarcasa:
    c = (await db.execute(select(RTMCarcasa).where(RTMCarcasa.codigo == (codigo or "").strip().upper()))).scalar()
    if c is None:
        raise HTTPException(404, f"El código {codigo} no está registrado: la llanta debe pasar primero por recepción.")
    return c


async def _equipo_por_codigo(db: AsyncSession, codigo: str) -> RTMEquipo:
    e = (await db.execute(select(RTMEquipo).where(RTMEquipo.codigo == (codigo or "").strip().upper()))).scalar()
    if e is None:
        raise HTTPException(404, f"No hay ninguna estación con el código {codigo}.")
    return e


async def _nombres_dep(db: AsyncSession, ids) -> Dict[int, str]:
    ids = [i for i in set(ids) if i]
    if not ids:
        return {}
    return {i: n for i, n in (await db.execute(select(WMSDepositante.id, WMSDepositante.nombre).where(
        WMSDepositante.id.in_(ids)))).all()}


# ── Recepción ─────────────────────────────────────────────────────────────────

class RecepcionIn(BaseModel):
    depositante_id: Optional[int] = None
    remision: Optional[str] = Field(default=None, max_length=60)
    cantidad_declarada: Optional[int] = Field(default=None, ge=0)
    solicitud_id: Optional[int] = None
    placa: Optional[str] = Field(default=None, max_length=15)
    entrega_nombre: Optional[str] = Field(default=None, max_length=150)
    observaciones: Optional[str] = None


async def _recepcion_dict(db: AsyncSession, r: RTMRecepcion, deps=None) -> Dict:
    deps = deps or await _nombres_dep(db, [r.depositante_id])
    registradas = (await db.execute(select(func.count()).select_from(RTMCarcasa).where(
        RTMCarcasa.recepcion_id == r.id))).scalar()
    return {"id": r.id, "codigo": r.codigo, "depositante_id": r.depositante_id, "cliente": deps.get(r.depositante_id),
            "remision": r.remision, "cantidad_declarada": r.cantidad_declarada, "registradas": registradas,
            "contadas": r.contadas, "diferencia": r.diferencia, "estado": r.estado, "viaje_id": r.viaje_id,
            "solicitud_id": r.solicitud_id, "eam_lote_id": r.eam_lote_id, "placa": r.placa,
            "entrega_nombre": r.entrega_nombre, "creada_en": r.created_at, "cerrada_en": r.cerrada_en,
            "observaciones": r.observaciones}


@router.get("/recepciones")
async def recepciones(respuesta: Response, estado: Optional[str] = None, depositante_id: Optional[int] = None,
                      con_diferencia: bool = False, limite: int = Query(50, ge=1, le=500),
                      desplazamiento: int = Query(0, ge=0), db: AsyncSession = Depends(get_db),
                      _: Usuario = Depends(get_current_user)):
    q = select(RTMRecepcion).order_by(RTMRecepcion.id.desc())
    if estado:
        q = q.where(RTMRecepcion.estado == estado)
    if depositante_id:
        q = q.where(RTMRecepcion.depositante_id == depositante_id)
    if con_diferencia:
        q = q.where(RTMRecepcion.diferencia != 0)
    filas = await paginacion.pagina(db, q, respuesta, limite, desplazamiento)
    deps = await _nombres_dep(db, [r.depositante_id for r in filas])
    return [await _recepcion_dict(db, r, deps) for r in filas]


@router.post("/recepciones", status_code=201)
async def crear_recepcion(data: RecepcionIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    if not data.depositante_id and not data.solicitud_id:
        raise HTTPException(422, "Indique el propietario de las llantas.")
    dueno = data.depositante_id
    if data.solicitud_id:
        s = await db.get(RTMSolicitudRecogida, data.solicitud_id)
        if s is None:
            raise HTTPException(404, "La solicitud de recogida no existe.")
        dueno = s.depositante_id
    r = await logi.crear_recepcion(db, yo, dueno, data.remision, data.cantidad_declarada, data.solicitud_id,
                                   data.placa, data.entrega_nombre, data.observaciones)
    await db.commit()
    return await _recepcion_dict(db, r)


@router.get("/recepciones/{rid}")
async def ver_recepcion(rid: int, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    r = await db.get(RTMRecepcion, rid)
    if r is None:
        raise HTTPException(404, "Recepción no encontrada.")
    d = await _recepcion_dict(db, r)
    d["carcasas"] = [_carcasa_corta(c) for c in (await db.execute(
        select(RTMCarcasa).where(RTMCarcasa.recepcion_id == r.id).order_by(RTMCarcasa.id))).scalars()]
    return d


class CarcasaIn(BaseModel):
    carcasa_id: Optional[int] = None
    codigo: Optional[str] = Field(default=None, max_length=40)
    marca: Optional[str] = Field(default=None, max_length=80)
    medida: Optional[str] = Field(default=None, max_length=40)
    modelo: Optional[str] = Field(default=None, max_length=80)
    dot: Optional[str] = Field(default=None, max_length=20)
    dot_ilegible: bool = False
    serie: Optional[str] = Field(default=None, max_length=60)
    profundidad_mm: Optional[float] = Field(default=None, ge=0, le=40)
    estado_costados: Optional[str] = Field(default=None, max_length=150)
    reencauches: Optional[int] = Field(default=None, ge=0, le=10)
    posicion_anterior: Optional[str] = Field(default=None, max_length=40)
    observaciones: Optional[str] = None
    costo_compra: Optional[float] = Field(default=None, ge=0)
    banda_producto_id: Optional[int] = None
    prioridad: int = Field(default=3, ge=1, le=5)
    ruta_id: Optional[int] = None


@router.post("/recepciones/{rid}/carcasas", status_code=201)
async def registrar_carcasa(rid: int, data: CarcasaIn, db: AsyncSession = Depends(get_db),
                            yo: Usuario = Depends(get_current_user)):
    r = (await db.execute(select(RTMRecepcion).where(RTMRecepcion.id == rid).with_for_update())).scalar()
    if r is None:
        raise HTTPException(404, "Recepción no encontrada.")
    res = await logi.registrar_carcasa(db, r, yo, data.model_dump())
    await db.commit()
    return res


@router.post("/recepciones/{rid}/cerrar")
async def cerrar_recepcion(rid: int, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    r = (await db.execute(select(RTMRecepcion).where(RTMRecepcion.id == rid).with_for_update())).scalar()
    if r is None:
        raise HTTPException(404, "Recepción no encontrada.")
    await logi.cerrar_recepcion(db, r, yo)
    await db.commit()
    return await _recepcion_dict(db, r)


# ── Carcasas ──────────────────────────────────────────────────────────────────

def _carcasa_corta(c: RTMCarcasa) -> Dict:
    return {"id": c.id, "codigo": c.codigo, "marca": c.marca, "medida": c.medida, "modelo": c.modelo, "dot": c.dot,
            "dot_ilegible": c.dot_ilegible, "serie": c.serie, "reencauches": c.reencauches, "estado": c.estado,
            "depositante_id": c.depositante_id}


async def ubicacion_actual(db: AsyncSession, c: RTMCarcasa, orden: Optional[RTMOrden]) -> str:
    """Dónde está la llanta, en palabras: recepción, cola de una estación, en
    proceso, retenida, evaluación técnica, terminado, rechazos o despachada."""
    if c.estado == "TERMINADA":
        return "Producto terminado"
    if c.estado == "RECHAZADA":
        return "Rechazos · espera disposición"
    if c.estado in ("DESPACHADA", "ENTREGADA", "VENDIDA", "DISPUESTA"):
        return {"DESPACHADA": "Despachada", "ENTREGADA": "Entregada", "VENDIDA": "Vendida",
                "DISPUESTA": "Dispuesta"}[c.estado]
    if orden is None:
        return "Sin orden"
    etapa = await db.get(RTMEtapa, orden.etapa_actual_id) if orden.etapa_actual_id else None
    nombre = etapa.nombre if etapa else "?"
    if orden.retenida:
        return f"Retenida en «{nombre}»"
    if orden.decision_pendiente == "CONDICIONAL":
        return f"Evaluación técnica («{nombre}»)"
    if etapa is not None and etapa.codigo == "INSP_INICIAL" and not orden.en_proceso:
        return "Recepción · cola de inspección inicial"
    return f"{'En proceso' if orden.en_proceso else 'En cola'} · {nombre}"


@router.get("/carcasas")
async def carcasas(respuesta: Response, q: Optional[str] = None, depositante_id: Optional[int] = None,
                   estado: Optional[str] = None, etapa_id: Optional[int] = None, medida: Optional[str] = None,
                   limite: int = Query(50, ge=1, le=500), desplazamiento: int = Query(0, ge=0),
                   db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Lista paginada en el servidor; busca por código, DOT, serie o cliente."""
    consulta = select(RTMCarcasa).order_by(RTMCarcasa.id.desc())
    if q:
        t = q.strip()
        deps = select(WMSDepositante.id).where(WMSDepositante.nombre.ilike(f"%{t}%"))
        consulta = consulta.where(or_(RTMCarcasa.codigo.ilike(f"%{t}%"), RTMCarcasa.dot.ilike(f"%{t}%"),
                                      RTMCarcasa.serie.ilike(f"%{t}%"), RTMCarcasa.depositante_id.in_(deps)))
    if depositante_id:
        consulta = consulta.where(RTMCarcasa.depositante_id == depositante_id)
    if estado:
        consulta = consulta.where(RTMCarcasa.estado == estado)
    if medida:
        consulta = consulta.where(RTMCarcasa.medida == medida)
    if etapa_id:
        consulta = consulta.where(RTMCarcasa.id.in_(select(RTMOrden.carcasa_id).where(
            RTMOrden.estado == "ABIERTA", RTMOrden.etapa_actual_id == etapa_id)))
    filas = await paginacion.pagina(db, consulta, respuesta, limite, desplazamiento)
    deps = await _nombres_dep(db, [c.depositante_id for c in filas])
    ordenes = {o.carcasa_id: o for o in (await db.execute(select(RTMOrden).where(
        RTMOrden.carcasa_id.in_([c.id for c in filas] or [0]), RTMOrden.estado == "ABIERTA"))).scalars()}
    salida = []
    for c in filas:
        d = _carcasa_corta(c)
        d["cliente"] = deps.get(c.depositante_id)
        d["ubicacion"] = await ubicacion_actual(db, c, ordenes.get(c.id))
        salida.append(d)
    return salida


@router.get("/carcasas/coincidencias")
async def coincidencias(codigo: Optional[str] = None, dot: Optional[str] = None, serie: Optional[str] = None,
                        db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """¿Ya pasó por la planta? Se propone usar la misma carcasa, con su historia."""
    filas = await logi.coincidencias(db, codigo, dot, serie)
    deps = await _nombres_dep(db, [c.depositante_id for c in filas])
    return [{**_carcasa_corta(c), "cliente": deps.get(c.depositante_id),
             "puede_volver": c.estado in ("ENTREGADA", "VENDIDA")} for c in filas]


@router.get("/carcasas/etiqueta/{codigo}")
async def etiqueta(codigo: str, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Lo que va impreso en la etiqueta de la carcasa."""
    c = await _carcasa_por_codigo(db, codigo)
    dep = await db.get(WMSDepositante, c.depositante_id)
    orden = await flujo.orden_abierta(db, c.id, bloquear=False)
    banda = await db.get(WMSProducto, orden.banda_producto_id) if orden and orden.banda_producto_id else None
    return {"codigo": c.codigo, "cliente": dep.nombre if dep else None, "medida": c.medida, "marca": c.marca,
            "modelo": c.modelo, "dot": c.dot, "orden": orden.codigo if orden else None,
            "reencauche": orden.numero_reencauche if orden else None, "banda": banda.nombre if banda else None,
            "fecha": c.created_at}


# ── Terminal de estación y colas ──────────────────────────────────────────────

async def _orden_dict(db: AsyncSession, o: RTMOrden, c: Optional[RTMCarcasa] = None) -> Dict:
    c = c or await db.get(RTMCarcasa, o.carcasa_id)
    etapa = await db.get(RTMEtapa, o.etapa_actual_id) if o.etapa_actual_id else None
    banda = await db.get(WMSProducto, o.banda_producto_id) if o.banda_producto_id else None
    dep = await db.get(WMSDepositante, c.depositante_id)
    re_ = await flujo._ruta_etapa_actual(db, o) if o.estado == "ABIERTA" else None
    paso_abierto = (await db.execute(select(RTMPaso).where(RTMPaso.orden_id == o.id, RTMPaso.estado == "ABIERTO")
                                     .order_by(RTMPaso.id.desc()).limit(1))).scalar()
    spec = await flujo.especificacion(db, c.medida, o.banda_producto_id)
    return {"orden_id": o.id, "orden": o.codigo, "carcasa_id": c.id, "codigo": c.codigo, "cliente": dep.nombre if dep else None,
            "medida": c.medida, "marca": c.marca, "modelo": c.modelo, "estado": o.estado, "prioridad": o.prioridad,
            "numero_reencauche": o.numero_reencauche, "banda_producto_id": o.banda_producto_id,
            "banda": banda.nombre if banda else None, "etapa": {
                "id": etapa.id, "codigo": etapa.codigo, "nombre": etapa.nombre, "tipo": etapa.tipo,
                "decision": etapa.decision, "decision_final": etapa.decision_final, "mediciones": etapa.mediciones or [],
                "reparaciones": etapa.reparaciones, "insumos": etapa.insumos or [], "tipos_equipo": etapa.tipos_equipo or [],
                "obligatoria": re_.obligatoria if re_ else True} if etapa else None,
            "en_proceso": o.en_proceso, "paso_abierto_id": paso_abierto.id if paso_abierto else None,
            "decision_pendiente": o.decision_pendiente, "retenida": o.retenida, "desde_espera": o.desde_espera,
            "costo_insumos": _f(o.costo_insumos), "precio": _f(o.precio),
            "especificacion": {"limites": spec.limites, "longitud_banda_m": spec.longitud_banda_m,
                               "longitud_cojin_m": spec.longitud_cojin_m, "cemento_estandar": spec.cemento_estandar}
            if spec else None,
            "ubicacion": await ubicacion_actual(db, c, o if o.estado == "ABIERTA" else None)}


@router.get("/estaciones/{codigo}")
async def estacion(codigo: str, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    e = await _equipo_por_codigo(db, codigo)
    etapas = [x for x in (await db.execute(select(RTMEtapa).where(RTMEtapa.activo.is_(True)))).scalars()
              if e.tipo in (x.tipos_equipo or [])]
    return {"id": e.id, "codigo": e.codigo, "nombre": e.nombre, "tipo": e.tipo, "estado": e.estado,
            "capacidad": e.capacidad, "tiene_ubicacion": bool(e.ubicacion_id),
            "etapas": [{"id": x.id, "codigo": x.codigo, "nombre": x.nombre} for x in etapas]}


@router.get("/estaciones/{codigo}/cola")
async def cola_estacion(codigo: str, limite: int = Query(100, ge=1, le=500), db: AsyncSession = Depends(get_db),
                        _: Usuario = Depends(get_current_user)):
    """Lo que espera en la estación, por prioridad y antigüedad."""
    e = await _equipo_por_codigo(db, codigo)
    etapas = [x.id for x in (await db.execute(select(RTMEtapa))).scalars() if e.tipo in (x.tipos_equipo or [])]
    filas = (await db.execute(
        select(RTMOrden, RTMCarcasa).join(RTMCarcasa, RTMCarcasa.id == RTMOrden.carcasa_id)
        .where(RTMOrden.estado == "ABIERTA", RTMOrden.etapa_actual_id.in_(etapas or [0]),
               RTMOrden.decision_pendiente.is_(None), RTMOrden.retenida.is_(False))
        .order_by(RTMOrden.en_proceso.desc(), RTMOrden.prioridad, RTMOrden.desde_espera).limit(limite))).all()
    deps = await _nombres_dep(db, [c.depositante_id for _, c in filas])
    bandas = {p.id: p.nombre for p in (await db.execute(select(WMSProducto).where(
        WMSProducto.id.in_([o.banda_producto_id for o, _ in filas if o.banda_producto_id] or [0])))).scalars()}
    etiquetas = {x.id: x.nombre for x in (await db.execute(select(RTMEtapa))).scalars()}
    salida = []
    for o, c in filas:
        fila = {"orden_id": o.id, "codigo": c.codigo, "cliente": deps.get(c.depositante_id), "medida": c.medida,
                "marca": c.marca, "banda": bandas.get(o.banda_producto_id), "prioridad": o.prioridad,
                "etapa": etiquetas.get(o.etapa_actual_id), "en_proceso": o.en_proceso, "desde": o.desde_espera}
        if e.tipo == "AUTOCLAVE":
            receta = await flujo.receta_para(db, o, e)
            fila["receta"] = f"{receta.codigo} v{receta.version}" if receta else None
        salida.append(fila)
    return salida


@router.get("/terminal/{estacion}/{codigo}")
async def escanear(estacion: str, codigo: str, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Lo que la terminal muestra al escanear una carcasa en una estación."""
    e = await _equipo_por_codigo(db, estacion)
    c = await _carcasa_por_codigo(db, codigo)
    o = await flujo.orden_abierta(db, c.id, bloquear=False)
    if o is None:
        await flujo.validar_para_registrar(db, None, c)
    d = await _orden_dict(db, o, c)
    etapa = d["etapa"]
    aviso = None
    if o.retenida:
        aviso = "Retenida: espera la liberación de calidad."
    elif o.decision_pendiente:
        aviso = "Condicional: espera dictamen técnico."
    elif etapa and etapa["tipos_equipo"] and e.tipo not in etapa["tipos_equipo"]:
        aviso = f"La carcasa está en «{etapa['nombre']}», que no se hace en esta estación."
    d["puede_registrar"] = aviso is None
    d["aviso"] = aviso
    return d


class AccionIn(BaseModel):
    estacion: str
    codigo: str


@router.post("/terminal/iniciar")
async def iniciar(data: AccionIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    e = await _equipo_por_codigo(db, data.estacion)
    c = await _carcasa_por_codigo(db, data.codigo)
    paso = await flujo.iniciar(db, c, e, yo)
    await db.commit()
    return {"paso_id": paso.id, "inicio": paso.inicio}


class OmitirIn(BaseModel):
    codigo: str
    motivo: Optional[str] = None


@router.post("/terminal/omitir")
async def omitir(data: OmitirIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    c = await _carcasa_por_codigo(db, data.codigo)
    paso = await flujo.omitir(db, c, yo, data.motivo)
    await db.commit()
    return {"paso_id": paso.id, "omitida": True}


class TerminarIn(BaseModel):
    mediciones: Dict = {}
    decision: Optional[str] = None
    accion_fuera: Optional[str] = None
    defectos: List[Dict] = []
    motivos: List[int] = []
    reparaciones: List[Dict] = []
    consumos: List[Dict] = []
    pruebas: List[Dict] = []
    autorizar_reparacion: bool = False
    observaciones: Optional[str] = None


@router.post("/pasos/{paso_id}/terminar")
async def terminar(paso_id: int, data: TerminarIn, db: AsyncSession = Depends(get_db),
                   yo: Usuario = Depends(get_current_user)):
    paso = (await db.execute(select(RTMPaso).where(RTMPaso.id == paso_id).with_for_update())).scalar()
    if paso is None:
        raise HTTPException(404, "Paso no encontrado.")
    res = await flujo.terminar(db, paso, yo, **data.model_dump())
    await db.commit()
    return res


class CorregirIn(BaseModel):
    mediciones: Dict
    motivo: str = Field(min_length=5)


@router.post("/pasos/{paso_id}/corregir", status_code=201)
async def corregir(paso_id: int, data: CorregirIn, db: AsyncSession = Depends(get_db),
                   yo: Usuario = Depends(get_current_user)):
    paso = await db.get(RTMPaso, paso_id)
    if paso is None:
        raise HTTPException(404, "Paso no encontrado.")
    nuevo = await flujo.corregir(db, paso, yo, data.mediciones, data.motivo)
    await db.commit()
    return {"paso_id": nuevo.id, "anula_id": paso.id, "mediciones": nuevo.mediciones}


@router.get("/ordenes/{orden_id}")
async def ver_orden(orden_id: int, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    o = await db.get(RTMOrden, orden_id)
    if o is None:
        raise HTTPException(404, "Orden no encontrada.")
    return await _orden_dict(db, o)


class OrdenIn(BaseModel):
    prioridad: Optional[int] = Field(default=None, ge=1, le=5)
    banda_producto_id: Optional[int] = None


@router.put("/ordenes/{orden_id}")
async def editar_orden(orden_id: int, data: OrdenIn, db: AsyncSession = Depends(get_db),
                       _: Usuario = Depends(get_current_user)):
    """Solo lo que no es historia: la prioridad y la banda pedida (mientras no se
    haya cortado banda)."""
    o = await db.get(RTMOrden, orden_id)
    if o is None or o.estado != "ABIERTA":
        raise HTTPException(409, "Solo se edita una orden abierta.")
    if data.prioridad is not None:
        o.prioridad = data.prioridad
    if data.banda_producto_id is not None:
        from app.infrastructure.models.reencauche import RTMConsumo, RTMInsumo
        cortada = (await db.execute(select(RTMConsumo.id).join(RTMInsumo, RTMInsumo.producto_id == RTMConsumo.producto_id)
                                    .where(RTMConsumo.orden_id == o.id, RTMInsumo.clase == "BANDA"))).first()
        if cortada:
            raise HTTPException(409, "La banda ya se cortó: no se puede cambiar.")
        await flujo._validar_insumo(db, data.banda_producto_id, "BANDA")
        o.banda_producto_id = data.banda_producto_id
    await db.commit()
    return await _orden_dict(db, o)


# ── Evaluación técnica y retenciones ──────────────────────────────────────────

@router.get("/evaluacion")
async def cola_evaluacion(limite: int = Query(200, ge=1, le=500), db: AsyncSession = Depends(get_db),
                          _: Usuario = Depends(get_current_user)):
    """Las condicionales que esperan dictamen técnico, las más antiguas primero."""
    filas = (await db.execute(select(RTMOrden).where(RTMOrden.estado == "ABIERTA",
                                                     RTMOrden.decision_pendiente == "CONDICIONAL")
                              .order_by(RTMOrden.desde_espera).limit(limite))).scalars().all()
    salida = []
    for o in filas:
        d = await _orden_dict(db, o)
        paso = (await db.execute(select(RTMPaso).where(RTMPaso.orden_id == o.id, RTMPaso.estado == "CERRADO")
                                 .order_by(RTMPaso.id.desc()).limit(1))).scalar()
        d["ultimo_paso"] = {"id": paso.id, "decision": paso.decision, "mediciones": paso.mediciones,
                            "observaciones": paso.observaciones, "fin": paso.fin} if paso else None
        salida.append(d)
    return salida


class DictamenIn(BaseModel):
    resultado: str
    justificacion: str = Field(min_length=5)
    motivos: List[int] = []


@router.post("/ordenes/{orden_id}/dictamen")
async def dictaminar(orden_id: int, data: DictamenIn, db: AsyncSession = Depends(get_db),
                     yo: Usuario = Depends(get_current_user)):
    o = (await db.execute(select(RTMOrden).where(RTMOrden.id == orden_id).with_for_update())).scalar()
    if o is None:
        raise HTTPException(404, "Orden no encontrada.")
    d = await flujo.dictaminar(db, o, yo, data.resultado, data.justificacion, data.motivos)
    await db.commit()
    return {"dictamen_id": d.id, "resultado": d.resultado, "orden_estado": o.estado}


class RetenerIn(BaseModel):
    codigo: str
    motivo: str = Field(min_length=5, max_length=300)


@router.post("/retenciones", status_code=201)
async def retener(data: RetenerIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    c = await _carcasa_por_codigo(db, data.codigo)
    o = await flujo.orden_abierta(db, c.id)
    if o is None:
        raise HTTPException(409, f"La carcasa {c.codigo} no está en proceso.")
    r = await flujo.retener(db, o, yo, data.motivo, "MANUAL")
    await db.commit()
    return {"retencion_id": r.id}


@router.get("/retenciones")
async def retenciones(estado: str = "ABIERTA", limite: int = Query(200, ge=1, le=1000),
                      db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    filas = (await db.execute(
        select(RTMRetencion, RTMOrden, RTMCarcasa).join(RTMOrden, RTMOrden.id == RTMRetencion.orden_id)
        .join(RTMCarcasa, RTMCarcasa.id == RTMOrden.carcasa_id).where(RTMRetencion.estado == estado)
        .order_by(RTMRetencion.id.desc()).limit(limite))).all()
    deps = await _nombres_dep(db, [c.depositante_id for _, _, c in filas])
    ciclos = {x.id: x.codigo for x in (await db.execute(select(RTMCiclo).where(
        RTMCiclo.id.in_([r.ciclo_id for r, _, _ in filas if r.ciclo_id] or [0])))).scalars()}
    etapas = {x.id: x.nombre for x in (await db.execute(select(RTMEtapa))).scalars()}
    return [{"id": r.id, "codigo": c.codigo, "cliente": deps.get(c.depositante_id), "medida": c.medida,
             "orden_id": o.id, "origen": r.origen, "ciclo": ciclos.get(r.ciclo_id), "motivo": r.motivo,
             "etapa": etapas.get(o.etapa_actual_id), "estado": r.estado, "creada_en": r.created_at,
             "justificacion": r.justificacion, "cerrada_en": r.cerrada_en} for r, o, c in filas]


class CerrarRetencionIn(BaseModel):
    accion: str
    justificacion: str = Field(min_length=5)
    motivos: List[int] = []


@router.post("/retenciones/{rid}/cerrar")
async def cerrar_retencion(rid: int, data: CerrarRetencionIn, db: AsyncSession = Depends(get_db),
                           yo: Usuario = Depends(get_current_user)):
    r = (await db.execute(select(RTMRetencion).where(RTMRetencion.id == rid).with_for_update())).scalar()
    if r is None:
        raise HTTPException(404, "Retención no encontrada.")
    if data.accion.upper() == "LIBERAR":
        await flujo.liberar(db, r, yo, data.justificacion)
    elif data.accion.upper() == "RECHAZAR":
        await flujo.rechazar_retenida(db, r, yo, data.justificacion, data.motivos)
    else:
        raise HTTPException(422, "La retención se libera o se rechaza.")
    await db.commit()
    return {"id": r.id, "estado": r.estado}


@router.post("/ordenes/reabrir/{codigo}")
async def reabrir(codigo: str, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Una rechazada no vuelve al flujo: esta ruta existe para decirlo y ofrecer
    la disposición, en vez de que alguien lo intente por otro lado."""
    c = await _carcasa_por_codigo(db, codigo)
    if c.estado == "RECHAZADA":
        raise HTTPException(409, f"La carcasa {c.codigo} fue rechazada en esta visita: solo admite disposición "
                                 "(devolución, gestor o venta como carcasa no apta).")
    raise HTTPException(409, "Una orden se abre en la recepción.")


# ── Disposición de rechazos ───────────────────────────────────────────────────

@router.get("/rechazos")
async def rechazos(respuesta: Response, pendientes: bool = True, depositante_id: Optional[int] = None,
                   limite: int = Query(100, ge=1, le=500), desplazamiento: int = Query(0, ge=0),
                   db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    con_disp = select(RTMDisposicion.carcasa_id).where(RTMDisposicion.estado == "CUMPLIDA")
    q = select(RTMCarcasa).where(RTMCarcasa.estado == "RECHAZADA").order_by(RTMCarcasa.id.desc())
    if pendientes:
        q = q.where(RTMCarcasa.id.notin_(con_disp))
    if depositante_id:
        q = q.where(RTMCarcasa.depositante_id == depositante_id)
    filas = await paginacion.pagina(db, q, respuesta, limite, desplazamiento)
    deps = await _nombres_dep(db, [c.depositante_id for c in filas])
    etapas = {x.id: x.nombre for x in (await db.execute(select(RTMEtapa))).scalars()}
    salida = []
    for c in filas:
        o = (await db.execute(select(RTMOrden).where(RTMOrden.carcasa_id == c.id).order_by(RTMOrden.id.desc())
                              .limit(1))).scalar()
        disp = (await db.execute(select(RTMDisposicion).where(RTMDisposicion.orden_id == o.id))).scalar() if o else None
        motivos = [n for (n,) in (await db.execute(
            select(RTMMotivoRechazo.nombre).join(RTMPasoMotivo, RTMPasoMotivo.motivo_id == RTMMotivoRechazo.id)
            .join(RTMPaso, RTMPaso.id == RTMPasoMotivo.paso_id).where(RTMPaso.orden_id == o.id))).all()] if o else []
        salida.append({**_carcasa_corta(c), "cliente": deps.get(c.depositante_id),
                       "etapa_rechazo": etapas.get(o.etapa_rechazo_id) if o else None, "motivos": motivos,
                       "disposicion": disp.tipo if disp else None, "disposicion_estado": disp.estado if disp else None})
    return salida


class DisponerIn(BaseModel):
    carcasa_ids: List[int]
    tipo: str
    gestor: Optional[str] = Field(default=None, max_length=150)
    acta: Optional[str] = Field(default=None, max_length=60)
    valor: Optional[float] = Field(default=None, ge=0)


@router.post("/rechazos/disponer")
async def disponer(data: DisponerIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    n = await logi.disponer(db, yo, data.carcasa_ids, data.tipo, data.gestor, data.acta, data.valor)
    await db.commit()
    return {"carcasas": n, "tipo": data.tipo.upper()}


# ── Vulcanización ─────────────────────────────────────────────────────────────

async def _ciclo_dict(db: AsyncSession, c: RTMCiclo) -> Dict:
    eq = await db.get(RTMEquipo, c.equipo_id)
    receta = await db.get(RTMReceta, c.receta_id) if c.receta_id else None
    carcasas = [x for (x,) in (await db.execute(select(RTMCarcasa.codigo).join(
        RTMOrden, RTMOrden.carcasa_id == RTMCarcasa.id).join(RTMCicloCarcasa, RTMCicloCarcasa.orden_id == RTMOrden.id)
        .where(RTMCicloCarcasa.ciclo_id == c.id).order_by(RTMCarcasa.codigo))).all()]
    return {"id": c.id, "codigo": c.codigo, "equipo_id": c.equipo_id, "equipo": eq.nombre if eq else None,
            "capacidad": eq.capacidad if eq else None, "estado": c.estado,
            "receta": {"id": receta.id, "codigo": receta.codigo, "version": receta.version, "nombre": receta.nombre,
                       "temperatura_c": receta.temperatura_c, "presion_bar": receta.presion_bar,
                       "vacio_bar": receta.vacio_bar, "tiempo_min": receta.tiempo_min} if receta else None,
            "carcasas": carcasas, "inicio": c.inicio, "fin_estimado": c.fin_estimado, "fin": c.fin,
            "variables": c.variables, "conforme": c.conforme}


@router.get("/vulcanizacion/tablero")
async def tablero_vulcanizacion(desde: Optional[datetime] = None, hasta: Optional[datetime] = None,
                                db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Cada autoclave: libre, en ciclo (con su hora de fin) o en mantenimiento, y
    su utilización en el periodo."""
    ahora = flujo.ahora()
    hasta = hasta or ahora
    from datetime import timedelta
    desde = desde or (hasta - timedelta(days=7))
    salida = []
    for eq in (await db.execute(select(RTMEquipo).where(RTMEquipo.tipo == "AUTOCLAVE").order_by(RTMEquipo.codigo))).scalars():
        actual = (await db.execute(select(RTMCiclo).where(RTMCiclo.equipo_id == eq.id,
                                                          RTMCiclo.estado.in_(("ARMANDO", "EN_CURSO")))
                                   .order_by(RTMCiclo.id.desc()).limit(1))).scalar()
        usados = (await db.execute(select(RTMCiclo.inicio, func.coalesce(RTMCiclo.fin, ahora)).where(
            RTMCiclo.equipo_id == eq.id, RTMCiclo.inicio.isnot(None), RTMCiclo.inicio < hasta,
            func.coalesce(RTMCiclo.fin, ahora) > desde))).all()
        segundos = sum((min(f, hasta) - max(i, desde)).total_seconds() for i, f in usados)
        total = (hasta - desde).total_seconds()
        estado = "MANTENIMIENTO" if eq.estado == "MANTENIMIENTO" else (
            "EN_CICLO" if actual is not None and actual.estado == "EN_CURSO" else
            "ARMANDO" if actual is not None else "LIBRE")
        salida.append({"equipo_id": eq.id, "codigo": eq.codigo, "nombre": eq.nombre, "capacidad": eq.capacidad,
                       "estado": estado, "ciclo": await _ciclo_dict(db, actual) if actual else None,
                       "ciclos_periodo": len(usados),
                       "utilizacion": round(100 * segundos / total, 1) if total > 0 else None})
    return {"desde": desde, "hasta": hasta, "autoclaves": salida}


@router.get("/ciclos")
async def ciclos(respuesta: Response, equipo_id: Optional[int] = None, estado: Optional[str] = None,
                 limite: int = Query(50, ge=1, le=500), desplazamiento: int = Query(0, ge=0),
                 db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    q = select(RTMCiclo).order_by(RTMCiclo.id.desc())
    if equipo_id:
        q = q.where(RTMCiclo.equipo_id == equipo_id)
    if estado:
        q = q.where(RTMCiclo.estado == estado)
    return [await _ciclo_dict(db, c) for c in await paginacion.pagina(db, q, respuesta, limite, desplazamiento)]


class CicloIn(BaseModel):
    equipo_id: int


@router.post("/ciclos", status_code=201)
async def crear_ciclo(data: CicloIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    eq = await db.get(RTMEquipo, data.equipo_id)
    if eq is None:
        raise HTTPException(404, "Equipo no encontrado.")
    c = await flujo.crear_ciclo(db, eq, yo)
    await db.commit()
    return await _ciclo_dict(db, c)


class CargarIn(BaseModel):
    codigo: str


@router.post("/ciclos/{cid}/cargar")
async def cargar(cid: int, data: CargarIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    ciclo = (await db.execute(select(RTMCiclo).where(RTMCiclo.id == cid).with_for_update())).scalar()
    if ciclo is None:
        raise HTTPException(404, "Ciclo no encontrado.")
    c = await _carcasa_por_codigo(db, data.codigo)
    res = await flujo.cargar(db, ciclo, c, yo)
    await db.commit()
    return res


@router.post("/ciclos/{cid}/iniciar")
async def iniciar_ciclo(cid: int, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    ciclo = (await db.execute(select(RTMCiclo).where(RTMCiclo.id == cid).with_for_update())).scalar()
    if ciclo is None:
        raise HTTPException(404, "Ciclo no encontrado.")
    await flujo.iniciar_ciclo(db, ciclo, yo)
    await db.commit()
    return await _ciclo_dict(db, ciclo)


class CerrarCicloIn(BaseModel):
    temperatura: float
    presion: float
    vacio: float
    tiempo: Optional[float] = Field(default=None, gt=0)
    origen: str = "MANUAL"


@router.post("/ciclos/{cid}/cerrar")
async def cerrar_ciclo(cid: int, data: CerrarCicloIn, db: AsyncSession = Depends(get_db),
                       yo: Usuario = Depends(get_current_user)):
    """Cierre con las variables reales: ingresadas por el operario o, si el
    autoclave tiene conexión, enviadas por su controlador (origen CONTROLADOR)."""
    ciclo = (await db.execute(select(RTMCiclo).where(RTMCiclo.id == cid).with_for_update())).scalar()
    if ciclo is None:
        raise HTTPException(404, "Ciclo no encontrado.")
    reales = data.model_dump(exclude={"origen"})
    if reales.get("tiempo") is None:
        reales["fin"] = flujo.ahora()
    res = await flujo.cerrar_ciclo(db, ciclo, yo, reales, data.origen.upper())
    await db.commit()
    return res


# ── Archivos de pruebas especiales ────────────────────────────────────────────

EXT = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff", ".dcm"}


async def guardar_archivo(db: AsyncSession, entidad: str, entidad_id: int, archivo: UploadFile, usuario_id: int) -> Dict:
    nombre = os.path.basename(archivo.filename or "archivo")
    ext = os.path.splitext(nombre)[1].lower()
    if ext not in EXT:
        raise HTTPException(422, "Tipo de archivo no admitido (PDF o imagen).")
    datos = await archivo.read()
    if len(datos) > 25 * 1024 * 1024:
        raise HTTPException(413, "El archivo pasa de 25 MB.")
    carpeta = os.path.join(settings.UPLOAD_DIR, "reencauche", esquema_actual(), entidad.lower(), str(entidad_id))
    os.makedirs(carpeta, exist_ok=True)
    a = RTMArchivo(entidad=entidad, entidad_id=entidad_id, nombre=nombre, ruta="", tipo_mime=archivo.content_type,
                   bytes=len(datos), usuario_id=usuario_id)
    db.add(a)
    await db.flush()
    ruta = os.path.join(carpeta, f"{a.id}{ext}")
    with open(ruta, "wb") as f:
        f.write(datos)
    a.ruta = ruta
    return {"id": a.id, "nombre": a.nombre, "bytes": a.bytes}


@router.post("/pruebas/{prueba_id}/archivo", status_code=201)
async def subir_archivo_prueba(prueba_id: int, archivo: UploadFile = File(...), db: AsyncSession = Depends(get_db),
                               yo: Usuario = Depends(get_current_user)):
    if not await db.get(RTMPasoPrueba, prueba_id):
        raise HTTPException(404, "Prueba no encontrada.")
    res = await guardar_archivo(db, "PRUEBA", prueba_id, archivo, yo.id)
    await db.commit()
    return res


@router.get("/archivos/{aid}")
async def descargar_archivo(aid: int, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    a = await db.get(RTMArchivo, aid)
    if a is None or not os.path.exists(a.ruta):
        raise HTTPException(404, "Archivo no encontrado.")
    return FileResponse(a.ruta, media_type=a.tipo_mime or "application/octet-stream", filename=a.nombre)
