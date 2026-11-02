"""
Planta de reencauche · consultas.

Hoja de vida de una llanta, trazabilidad hacia atrás (por lote de insumo, por
ciclo, por equipo y periodo), tablero de la planta, indicadores y conciliación
con el WMS.

Los indicadores se calculan SIEMPRE de los registros —pasos, decisiones,
ciclos, consumos, reclamos—, nunca se digitan, y se agregan en la base: con
años de operación, traer las filas para contarlas en Python ocuparía el proceso
más de lo que el supervisor de uvicorn tolera (memoria `workers-mueren`).
"""
from datetime import date, datetime, time, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import and_, case, distinct, func, literal, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import paginacion, reencauche_flujo as flujo, reencauche_reglas as reglas, reencauche_wms as rwms
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.reencauche_semilla import config as obtener_config
from app.infrastructure.models.reencauche import (
    RTMArchivo, RTMCarcasa, RTMCiclo, RTMCicloCarcasa, RTMConsumo, RTMDefecto, RTMDictamen, RTMDisposicion,
    RTMEntrega, RTMEntregaCarcasa, RTMEquipo, RTMEspecificacion, RTMEtapa, RTMInsumo, RTMMotivoRechazo, RTMOrden,
    RTMPaso, RTMPasoDefecto, RTMPasoMotivo, RTMPasoPrueba, RTMReclamo, RTMRecepcion, RTMReparacion, RTMRetencion,
    RTMRutaEtapa,
)
from app.infrastructure.models.tms import TMSViaje
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.wms import WMSDepositante, WMSLote, WMSMovimientoInventario, WMSProducto

router = APIRouter(prefix="/reencauche", tags=["Planta de reencauche"])


def _f(v, dec: Optional[int] = None):
    if v is None:
        return None
    return round(float(v), dec) if dec is not None else float(v)


async def _usuarios(db: AsyncSession, ids) -> Dict[int, str]:
    ids = [i for i in set(ids) if i]
    return {u.id: f"{u.nombre} {u.apellido}".strip() for u in (await db.execute(
        select(Usuario).where(Usuario.id.in_(ids or [0])))).scalars()}


# ── Hoja de vida ──────────────────────────────────────────────────────────────

async def _hoja(db: AsyncSession, c: RTMCarcasa) -> Dict:
    dep = await db.get(WMSDepositante, c.depositante_id)
    etapas = {e.id: e for e in (await db.execute(select(RTMEtapa))).scalars()}
    equipos = {e.id: e for e in (await db.execute(select(RTMEquipo))).scalars()}
    ordenes = (await db.execute(select(RTMOrden).where(RTMOrden.carcasa_id == c.id).order_by(RTMOrden.id))).scalars().all()
    pasos_todos = (await db.execute(select(RTMPaso).where(RTMPaso.orden_id.in_([o.id for o in ordenes] or [0]))
                                    .order_by(RTMPaso.inicio.nullsfirst(), RTMPaso.id))).scalars().all()
    ids_pasos = [p.id for p in pasos_todos]
    anulados = {p.anula_id: p.id for p in pasos_todos if p.anula_id}
    nombres = await _usuarios(db, [p.operario_id for p in pasos_todos])
    defectos = {}
    for pd, d in (await db.execute(select(RTMPasoDefecto, RTMDefecto).join(RTMDefecto, RTMDefecto.id == RTMPasoDefecto.defecto_id)
                                   .where(RTMPasoDefecto.paso_id.in_(ids_pasos or [0])))).all():
        defectos.setdefault(pd.paso_id, []).append({"defecto": d.nombre, "zona": d.zona, "ubicacion": pd.ubicacion,
                                                    "tamano_mm": pd.tamano_mm})
    motivos = {}
    for pm, m in (await db.execute(select(RTMPasoMotivo, RTMMotivoRechazo).join(
            RTMMotivoRechazo, RTMMotivoRechazo.id == RTMPasoMotivo.motivo_id).where(RTMPasoMotivo.paso_id.in_(ids_pasos or [0])))).all():
        motivos.setdefault(pm.paso_id, []).append(m.nombre)
    reparaciones = {}
    for r in (await db.execute(select(RTMReparacion).where(RTMReparacion.paso_id.in_(ids_pasos or [0])))).scalars():
        reparaciones.setdefault(r.paso_id, []).append({"tipo_dano": r.tipo_dano, "ubicacion": r.ubicacion,
                                                       "tamano_mm": r.tamano_mm, "profundidad_mm": r.profundidad_mm,
                                                       "tipo_reparacion": r.tipo_reparacion, "material": r.material,
                                                       "fuera_limite": r.fuera_limite})
    consumos = {}
    for cs, p, l in (await db.execute(select(RTMConsumo, WMSProducto, WMSLote).join(WMSProducto, WMSProducto.id == RTMConsumo.producto_id)
                                      .outerjoin(WMSLote, WMSLote.id == RTMConsumo.lote_id)
                                      .where(RTMConsumo.paso_id.in_(ids_pasos or [0])))).all():
        consumos.setdefault(cs.paso_id, []).append({"insumo": p.nombre, "lote": l.numero_lote if l else None,
                                                    "lote_id": cs.lote_id, "cantidad": cs.cantidad,
                                                    "unidad": p.unidad_medida, "costo": _f(cs.costo)})
    pruebas = {}
    for pr in (await db.execute(select(RTMPasoPrueba).where(RTMPasoPrueba.paso_id.in_(ids_pasos or [0])))).scalars():
        archivos = [{"id": a.id, "nombre": a.nombre} for a in (await db.execute(select(RTMArchivo).where(
            RTMArchivo.entidad == "PRUEBA", RTMArchivo.entidad_id == pr.id))).scalars()]
        pruebas.setdefault(pr.paso_id, []).append({"id": pr.id, "prueba": pr.prueba, "resultado": pr.resultado,
                                                   "conforme": pr.conforme, "archivos": archivos})
    ciclos = {x.id: x for x in (await db.execute(select(RTMCiclo).where(
        RTMCiclo.id.in_([p.ciclo_id for p in pasos_todos if p.ciclo_id] or [0])))).scalars()}
    visitas = []
    for o in ordenes:
        rec = await db.get(RTMRecepcion, o.recepcion_id)
        viaje_rec = await db.get(TMSViaje, rec.viaje_id) if rec and rec.viaje_id else None
        banda = await db.get(WMSProducto, o.banda_producto_id) if o.banda_producto_id else None
        pasos = []
        for p in [x for x in pasos_todos if x.orden_id == o.id]:
            e = etapas.get(p.etapa_id)
            eq = equipos.get(p.equipo_id)
            ciclo = ciclos.get(p.ciclo_id)
            pasos.append({
                "id": p.id, "etapa": e.nombre if e else None, "etapa_codigo": e.codigo if e else None,
                "equipo": eq.nombre if eq else None, "operario": nombres.get(p.operario_id), "inicio": p.inicio,
                "fin": p.fin, "estado": p.estado, "omitida": p.omitida, "decision": p.decision,
                "mediciones": p.mediciones, "fuera_tolerancia": p.fuera_tolerancia, "observaciones": p.observaciones,
                "anulado_por": anulados.get(p.id), "anula_a": p.anula_id, "motivo_correccion": p.motivo_correccion,
                "defectos": defectos.get(p.id, []), "motivos": motivos.get(p.id, []),
                "reparaciones": reparaciones.get(p.id, []), "consumos": consumos.get(p.id, []),
                "pruebas": pruebas.get(p.id, []),
                "ciclo": {"id": ciclo.id, "codigo": ciclo.codigo, "variables": ciclo.variables,
                          "conforme": ciclo.conforme} if ciclo else None})
        retenciones = [{"motivo": r.motivo, "origen": r.origen, "estado": r.estado, "creada_en": r.created_at,
                        "justificacion": r.justificacion, "cerrada_en": r.cerrada_en}
                       for r in (await db.execute(select(RTMRetencion).where(RTMRetencion.orden_id == o.id)
                                                  .order_by(RTMRetencion.id))).scalars()]
        dict_nombres = await _usuarios(db, [d.tecnico_id for d in (await db.execute(select(RTMDictamen).where(
            RTMDictamen.orden_id == o.id))).scalars()])
        dictamenes = [{"resultado": d.resultado, "justificacion": d.justificacion,
                       "tecnico": dict_nombres.get(d.tecnico_id), "fecha": d.created_at}
                      for d in (await db.execute(select(RTMDictamen).where(RTMDictamen.orden_id == o.id))).scalars()]
        disp = (await db.execute(select(RTMDisposicion).where(RTMDisposicion.orden_id == o.id))).scalar()
        entrega = (await db.execute(select(RTMEntrega, RTMEntregaCarcasa).join(
            RTMEntregaCarcasa, RTMEntregaCarcasa.entrega_id == RTMEntrega.id).where(
            RTMEntregaCarcasa.orden_id == o.id, RTMEntrega.estado != "ANULADA"))).first()
        viaje_ent = await db.get(TMSViaje, entrega[0].viaje_id) if entrega and entrega[0].viaje_id else None
        visitas.append({
            "orden_id": o.id, "orden": o.codigo, "numero_reencauche": o.numero_reencauche, "estado": o.estado,
            "banda": banda.nombre if banda else None, "recibida_en": o.recibida_en, "terminada_en": o.terminada_en,
            "etapa_rechazo": etapas[o.etapa_rechazo_id].nombre if o.etapa_rechazo_id in etapas else None,
            "precio": _f(o.precio), "costo_insumos": _f(o.costo_insumos), "primera_pasada": o.primera_pasada,
            "recepcion": {"codigo": rec.codigo, "remision": rec.remision, "fecha": rec.created_at,
                          "viaje": viaje_rec.codigo if viaje_rec else None} if rec else None,
            "pasos": pasos, "retenciones": retenciones, "dictamenes": dictamenes,
            "disposicion": {"tipo": disp.tipo, "gestor": disp.gestor, "acta": disp.acta, "estado": disp.estado,
                            "fecha": disp.created_at} if disp else None,
            "entrega": {"codigo": entrega[0].codigo, "estado": entrega[0].estado, "modo": entrega[0].modo,
                        "viaje": viaje_ent.codigo if viaje_ent else None, "placa": entrega[0].placa,
                        "recibe": entrega[0].recibe_nombre, "fecha": entrega[0].recibido_en} if entrega else None})
    reclamos = [{"codigo": r.codigo, "falla": r.falla, "km": r.km, "estado": r.estado, "dictamen": r.dictamen,
                 "causa": r.causa, "compensacion": r.compensacion, "fecha": r.fecha, "orden_id": r.orden_id}
                for r in (await db.execute(select(RTMReclamo).where(RTMReclamo.carcasa_id == c.id)
                                           .order_by(RTMReclamo.id))).scalars()]
    movimientos = [{"fecha": m.created_at, "tipo": m.tipo, "documento": m.documento_tipo,
                    "referencia": m.referencia_documento, "producto": p.nombre,
                    "sentido": "entra" if m.ubicacion_origen_id is None else "sale" if m.ubicacion_destino_id is None
                    else "traslado"}
                   for m, p in (await db.execute(select(WMSMovimientoInventario, WMSProducto).join(
                       WMSProducto, WMSProducto.id == WMSMovimientoInventario.producto_id).where(
                       WMSMovimientoInventario.serie_id == c.wms_serie_id).order_by(WMSMovimientoInventario.id))).all()] \
        if c.wms_serie_id else []
    from app.api.v1.endpoints.reencauche_operacion import ubicacion_actual
    abierta = next((o for o in ordenes if o.estado == "ABIERTA"), None)
    return {"carcasa": {"id": c.id, "codigo": c.codigo, "cliente": dep.nombre if dep else None, "marca": c.marca,
                        "medida": c.medida, "modelo": c.modelo, "dot": c.dot, "dot_ilegible": c.dot_ilegible,
                        "serie": c.serie, "profundidad_mm": c.profundidad_mm, "estado_costados": c.estado_costados,
                        "reencauches": c.reencauches, "posicion_anterior": c.posicion_anterior,
                        "observaciones": c.observaciones, "estado": c.estado, "eam_neumatico_id": c.eam_neumatico_id,
                        "ubicacion": await ubicacion_actual(db, c, abierta)},
            "visitas": visitas, "reclamos": reclamos, "movimientos_wms": movimientos}


@router.get("/hoja-de-vida")
async def hoja_de_vida(q: str, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Por código, DOT o serie. Si varias coinciden (un DOT repetido), las lista."""
    t = q.strip().upper()
    filas = (await db.execute(select(RTMCarcasa).where(or_(RTMCarcasa.codigo == t, RTMCarcasa.dot == t,
                                                           RTMCarcasa.serie == q.strip())).limit(20))).scalars().all()
    if not filas:
        raise HTTPException(404, f"No hay ninguna llanta con el código, DOT o serie «{q}».")
    if len(filas) > 1:
        return {"varias": [{"id": c.id, "codigo": c.codigo, "medida": c.medida, "marca": c.marca, "estado": c.estado}
                           for c in filas]}
    return await _hoja(db, filas[0])


@router.get("/carcasas/{cid}/hoja-de-vida")
async def hoja_por_id(cid: int, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    c = await db.get(RTMCarcasa, cid)
    if c is None:
        raise HTTPException(404, "Carcasa no encontrada.")
    return await _hoja(db, c)


# ── Trazabilidad hacia atrás ──────────────────────────────────────────────────

async def _filas_traza(db: AsyncSession, orden_ids_q, respuesta: Response, limite: int, desplazamiento: int) -> Dict:
    from app.api.v1.endpoints.reencauche_operacion import ubicacion_actual
    consulta = (select(RTMCarcasa, RTMOrden).join(RTMOrden, RTMOrden.carcasa_id == RTMCarcasa.id)
                .where(RTMOrden.id.in_(orden_ids_q)).order_by(RTMCarcasa.codigo))
    total = await paginacion.contar(db, consulta)
    paginacion.poner_total(respuesta, total, limite, desplazamiento)
    filas = (await db.execute(consulta.offset(desplazamiento).limit(limite))).all()
    deps = {i: n for i, n in (await db.execute(select(WMSDepositante.id, WMSDepositante.nombre))).all()}
    resumen = {k: v for k, v in (await db.execute(
        select(RTMCarcasa.estado, func.count(distinct(RTMCarcasa.id))).join(RTMOrden, RTMOrden.carcasa_id == RTMCarcasa.id)
        .where(RTMOrden.id.in_(orden_ids_q)).group_by(RTMCarcasa.estado))).all()}
    por_cliente = [{"cliente": deps.get(d), "carcasas": n} for d, n in (await db.execute(
        select(RTMCarcasa.depositante_id, func.count(distinct(RTMCarcasa.id))).join(RTMOrden, RTMOrden.carcasa_id == RTMCarcasa.id)
        .where(RTMOrden.id.in_(orden_ids_q)).group_by(RTMCarcasa.depositante_id))).all()]
    items = []
    for c, o in filas:
        items.append({"carcasa_id": c.id, "codigo": c.codigo, "cliente": deps.get(c.depositante_id), "medida": c.medida,
                      "orden": o.codigo, "estado": c.estado,
                      "ubicacion": await ubicacion_actual(db, c, o if o.estado == "ABIERTA" else None)})
    en_planta = sum(n for k, n in resumen.items() if k in ("EN_PLANTA", "TERMINADA", "RECHAZADA"))
    return {"total": total, "en_planta": en_planta, "fuera": total - en_planta, "por_estado": resumen,
            "por_cliente": por_cliente, "carcasas": items}


@router.get("/trazabilidad/lote")
async def por_lote(respuesta: Response, lote_id: Optional[int] = None, numero_lote: Optional[str] = None,
                   producto_id: Optional[int] = None, limite: int = Query(100, ge=1, le=1000),
                   desplazamiento: int = Query(0, ge=0), db: AsyncSession = Depends(get_db),
                   _: Usuario = Depends(get_current_user)):
    """Todas las carcasas que consumieron un lote de insumo: el proveedor avisa
    que el lote está defectuoso y se sabe cuáles siguen en planta y a quién se
    entregaron las demás."""
    if not lote_id:
        q = select(WMSLote.id).where(WMSLote.numero_lote == (numero_lote or "").strip())
        if producto_id:
            q = q.where(WMSLote.producto_id == producto_id)
        ids = [i for (i,) in (await db.execute(q)).all()]
        if not ids:
            raise HTTPException(404, "El lote no existe.")
    else:
        ids = [lote_id]
    return await _filas_traza(db, select(RTMConsumo.orden_id).where(RTMConsumo.lote_id.in_(ids)), respuesta, limite,
                              desplazamiento)


@router.get("/trazabilidad/ciclo")
async def por_ciclo(respuesta: Response, codigo: str, limite: int = Query(100, ge=1, le=1000),
                    desplazamiento: int = Query(0, ge=0), db: AsyncSession = Depends(get_db),
                    _: Usuario = Depends(get_current_user)):
    ciclo = (await db.execute(select(RTMCiclo).where(RTMCiclo.codigo == codigo.strip().upper()))).scalar()
    if ciclo is None:
        raise HTTPException(404, "El ciclo no existe.")
    res = await _filas_traza(db, select(RTMCicloCarcasa.orden_id).where(RTMCicloCarcasa.ciclo_id == ciclo.id),
                             respuesta, limite, desplazamiento)
    res["ciclo"] = {"codigo": ciclo.codigo, "inicio": ciclo.inicio, "fin": ciclo.fin, "variables": ciclo.variables,
                    "conforme": ciclo.conforme}
    return res


@router.get("/trazabilidad/equipo")
async def por_equipo(respuesta: Response, equipo_id: int, desde: date, hasta: date,
                     limite: int = Query(100, ge=1, le=1000), desplazamiento: int = Query(0, ge=0),
                     db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Las carcasas procesadas en un equipo entre dos fechas (p. ej. un sensor
    descalibrado del 3 al 10 de octubre)."""
    ini = datetime.combine(desde, time.min, tzinfo=timezone(timedelta(hours=-5)))
    fin = datetime.combine(hasta + timedelta(days=1), time.min, tzinfo=timezone(timedelta(hours=-5)))
    return await _filas_traza(db, select(RTMPaso.orden_id).where(
        RTMPaso.equipo_id == equipo_id, RTMPaso.inicio >= ini, RTMPaso.inicio < fin), respuesta, limite, desplazamiento)


# ── Tablero ───────────────────────────────────────────────────────────────────

@router.get("/tablero")
async def tablero(depositante_id: Optional[int] = None, db: AsyncSession = Depends(get_db),
                  _: Usuario = Depends(get_current_user)):
    """El estado de la planta ahora: cuántas llantas hay en cada etapa, cuántas
    retenidas, condicionales, listas para entregar y rechazos por disponer; y si
    alcanza la banda para lo que está en cola."""
    filtro_c = [RTMCarcasa.depositante_id == depositante_id] if depositante_id else []
    por_etapa = {e: (n, p) for e, n, p in (await db.execute(
        select(RTMOrden.etapa_actual_id, func.count(), func.sum(case((RTMOrden.en_proceso, 1), else_=0)))
        .join(RTMCarcasa, RTMCarcasa.id == RTMOrden.carcasa_id)
        .where(RTMOrden.estado == "ABIERTA", RTMOrden.retenida.is_(False), RTMOrden.decision_pendiente.is_(None),
               *filtro_c).group_by(RTMOrden.etapa_actual_id))).all()}
    ruta = await flujo.ruta_por_defecto(db)
    etapas = []
    for re_, e in await flujo.etapas_de_ruta(db, ruta.id):
        n, p = por_etapa.get(e.id, (0, 0))
        etapas.append({"etapa_id": e.id, "codigo": e.codigo, "nombre": e.nombre, "en_cola": n - (p or 0),
                       "en_proceso": p or 0})
    contar = lambda *w: select(func.count()).select_from(RTMOrden).join(RTMCarcasa, RTMCarcasa.id == RTMOrden.carcasa_id).where(*w, *filtro_c)
    retenidas = (await db.execute(contar(RTMOrden.estado == "ABIERTA", RTMOrden.retenida.is_(True)))).scalar()
    condicionales = (await db.execute(contar(RTMOrden.estado == "ABIERTA", RTMOrden.decision_pendiente == "CONDICIONAL"))).scalar()
    por_estado = {k: v for k, v in (await db.execute(select(RTMCarcasa.estado, func.count()).where(*filtro_c)
                                                     .group_by(RTMCarcasa.estado))).all()}
    con_disp = select(RTMDisposicion.carcasa_id).where(RTMDisposicion.estado == "CUMPLIDA")
    rechazos = (await db.execute(select(func.count()).select_from(RTMCarcasa).where(
        RTMCarcasa.estado == "RECHAZADA", RTMCarcasa.id.notin_(con_disp), *filtro_c))).scalar()
    deps = {i: n for i, n in (await db.execute(select(WMSDepositante.id, WMSDepositante.nombre))).all()}
    clientes = [{"depositante_id": d, "cliente": deps.get(d), "en_planta": int(a or 0), "listas": int(b or 0),
                 "rechazadas": int(r or 0)} for d, a, b, r in (await db.execute(
        select(RTMCarcasa.depositante_id, func.sum(case((RTMCarcasa.estado == "EN_PLANTA", 1), else_=0)),
               func.sum(case((RTMCarcasa.estado == "TERMINADA", 1), else_=0)),
               func.sum(case((RTMCarcasa.estado == "RECHAZADA", 1), else_=0)))
        .where(RTMCarcasa.estado.in_(("EN_PLANTA", "TERMINADA", "RECHAZADA")), *filtro_c)
        .group_by(RTMCarcasa.depositante_id).order_by(func.count().desc()).limit(50))).all()]
    return {"etapas": etapas, "retenidas": retenidas, "condicionales": condicionales,
            "en_planta": por_estado.get("EN_PLANTA", 0), "listas_entrega": por_estado.get("TERMINADA", 0),
            "rechazos_por_disponer": rechazos, "clientes": clientes, "bandas": await _faltante_banda(db)}


async def _faltante_banda(db: AsyncSession) -> List[Dict]:
    """Banda pedida por las carcasas que todavía no la tienen cortada, contra
    las existencias del almacén de la planta."""
    cfg = await obtener_config(db)
    sec_corte = (await db.execute(select(func.min(RTMRutaEtapa.secuencia)).join(RTMEtapa, RTMEtapa.id == RTMRutaEtapa.etapa_id)
                                  .where(RTMEtapa.codigo == "PREP_BANDA"))).scalar()
    q = (select(RTMOrden.banda_producto_id, RTMCarcasa.medida, func.count())
         .join(RTMCarcasa, RTMCarcasa.id == RTMOrden.carcasa_id)
         .where(RTMOrden.estado == "ABIERTA", RTMOrden.banda_producto_id.isnot(None))
         .group_by(RTMOrden.banda_producto_id, RTMCarcasa.medida))
    if sec_corte:
        q = q.where(or_(RTMOrden.secuencia_actual <= sec_corte, RTMOrden.secuencia_actual.is_(None)))
    pedido: Dict[int, Dict] = {}
    specs = {(e.medida, e.banda_producto_id): e.longitud_banda_m for e in (await db.execute(select(RTMEspecificacion))).scalars()}
    for banda, medida, n in (await db.execute(q)).all():
        largo = specs.get((medida, banda)) or specs.get((medida, None)) or 0
        p = pedido.setdefault(banda, {"carcasas": 0, "metros": 0.0, "sin_especificacion": 0})
        p["carcasas"] += n
        p["metros"] += n * largo
        if not largo:
            p["sin_especificacion"] += n
    salida = []
    for banda, p in pedido.items():
        prod = await db.get(WMSProducto, banda)
        hay = float(await rwms.disponible(db, banda, almacen_id=cfg.almacen_id)) if cfg.almacen_id else 0.0
        salida.append({"banda_producto_id": banda, "banda": prod.nombre if prod else None, **p,
                       "metros": round(p["metros"], 2), "existencia": round(hay, 2),
                       "faltante": round(max(0.0, p["metros"] - hay), 2)})
    return sorted(salida, key=lambda x: -x["faltante"])


# ── Indicadores ───────────────────────────────────────────────────────────────

def _rango(desde: Optional[date], hasta: Optional[date]):
    bog = timezone(timedelta(hours=-5))
    hasta = hasta or (datetime.now(bog).date())
    desde = desde or (hasta - timedelta(days=30))
    return desde, hasta, datetime.combine(desde, time.min, tzinfo=bog), datetime.combine(hasta + timedelta(days=1), time.min, tzinfo=bog)


def _ordenes_filtradas(ini, fin, depositante_id, medida, marca, banda_producto_id, equipo_id, operario_id):
    q = select(RTMOrden.id).join(RTMCarcasa, RTMCarcasa.id == RTMOrden.carcasa_id).where(
        RTMOrden.recibida_en >= ini, RTMOrden.recibida_en < fin)
    if depositante_id:
        q = q.where(RTMCarcasa.depositante_id == depositante_id)
    if medida:
        q = q.where(RTMCarcasa.medida == medida)
    if marca:
        q = q.where(RTMCarcasa.marca.ilike(marca))
    if banda_producto_id:
        q = q.where(RTMOrden.banda_producto_id == banda_producto_id)
    if equipo_id:
        q = q.where(RTMOrden.id.in_(select(RTMPaso.orden_id).where(RTMPaso.equipo_id == equipo_id)))
    if operario_id:
        q = q.where(RTMOrden.id.in_(select(RTMPaso.orden_id).where(RTMPaso.operario_id == operario_id)))
    return q


DURACION = func.extract("epoch", RTMPaso.fin - RTMPaso.inicio)


@router.get("/indicadores")
async def indicadores(desde: Optional[date] = None, hasta: Optional[date] = None, depositante_id: Optional[int] = None,
                      medida: Optional[str] = None, marca: Optional[str] = None,
                      banda_producto_id: Optional[int] = None, equipo_id: Optional[int] = None,
                      operario_id: Optional[int] = None, db: AsyncSession = Depends(get_db),
                      _: Usuario = Depends(get_current_user)):
    desde, hasta, ini, fin = _rango(desde, hasta)
    ords = _ordenes_filtradas(ini, fin, depositante_id, medida, marca, banda_producto_id, equipo_id, operario_id).subquery()
    en = RTMOrden.id.in_(select(ords.c.id))
    etapas = {e.codigo: e for e in (await db.execute(select(RTMEtapa))).scalars()}
    nombre_etapa = {e.id: e.nombre for e in etapas.values()}
    cfg = await obtener_config(db)

    # Recepción e inspección inicial.
    recibidas = (await db.execute(select(func.count()).select_from(RTMOrden).where(en))).scalar() or 0
    ii = etapas.get("INSP_INICIAL")
    dec = {k: v for k, v in (await db.execute(
        select(RTMPaso.decision, func.count(distinct(RTMPaso.orden_id))).where(
            RTMPaso.orden_id.in_(select(ords.c.id)), RTMPaso.etapa_id == (ii.id if ii else 0), RTMPaso.estado == "CERRADO",
            RTMPaso.anula_id.is_(None)).group_by(RTMPaso.decision))).all()}
    aprobadas_dictamen = (await db.execute(
        select(func.count(distinct(RTMDictamen.orden_id))).join(RTMPaso, RTMPaso.id == RTMDictamen.paso_id).where(
            RTMDictamen.orden_id.in_(select(ords.c.id)), RTMDictamen.resultado == "APROBAR",
            RTMPaso.etapa_id == (ii.id if ii else 0)))).scalar() or 0
    aprobadas_ini = (dec.get("APROBADA", 0) or 0) + aprobadas_dictamen
    rechazo_ini = (await db.execute(select(func.count()).select_from(RTMOrden).where(
        en, RTMOrden.estado == "RECHAZADA", RTMOrden.etapa_rechazo_id == (ii.id if ii else 0)))).scalar() or 0
    t_insp = (await db.execute(select(func.avg(DURACION)).where(
        RTMPaso.orden_id.in_(select(ords.c.id)), RTMPaso.etapa_id == (ii.id if ii else 0), RTMPaso.fin.isnot(None),
        RTMPaso.inicio.isnot(None)))).scalar()

    rech_q = (select(RTMCarcasa.marca, RTMCarcasa.medida, func.count()).join(RTMOrden, RTMOrden.carcasa_id == RTMCarcasa.id)
              .where(en, RTMOrden.estado == "RECHAZADA"))
    por_marca: Dict[str, int] = {}
    por_medida: Dict[str, int] = {}
    for m, md, n in (await db.execute(rech_q.group_by(RTMCarcasa.marca, RTMCarcasa.medida))).all():
        por_marca[m] = por_marca.get(m, 0) + n
        por_medida[md] = por_medida.get(md, 0) + n
    por_motivo = [{"motivo": n, "carcasas": c} for n, c in (await db.execute(
        select(RTMMotivoRechazo.nombre, func.count(distinct(RTMPaso.orden_id)))
        .join(RTMPasoMotivo, RTMPasoMotivo.motivo_id == RTMMotivoRechazo.id).join(RTMPaso, RTMPaso.id == RTMPasoMotivo.paso_id)
        .join(RTMOrden, RTMOrden.id == RTMPaso.orden_id).where(en, RTMOrden.estado == "RECHAZADA")
        .group_by(RTMMotivoRechazo.nombre).order_by(func.count(distinct(RTMPaso.orden_id)).desc()))).all()]

    # Embudo y rendimiento de carcasas.
    estados = {k: v for k, v in (await db.execute(select(RTMOrden.estado, func.count()).where(en)
                                                  .group_by(RTMOrden.estado))).all()}
    terminadas = estados.get("TERMINADA", 0)
    rechazadas = estados.get("RECHAZADA", 0)
    salidas = {e: n for e, n in (await db.execute(select(RTMOrden.etapa_rechazo_id, func.count()).where(
        en, RTMOrden.estado == "RECHAZADA").group_by(RTMOrden.etapa_rechazo_id))).all()}
    ruta = await flujo.ruta_por_defecto(db)
    embudo, quedan = [], recibidas
    for re_, e in await flujo.etapas_de_ruta(db, ruta.id):
        if e.decision or salidas.get(e.id):
            sale = salidas.get(e.id, 0)
            quedan -= sale
            embudo.append({"etapa": e.nombre, "rechazadas": sale, "siguen": quedan})

    # Primera pasada.
    fpy_ok = (await db.execute(select(func.count()).select_from(RTMOrden).where(
        en, RTMOrden.estado == "TERMINADA", RTMOrden.primera_pasada.is_(True)))).scalar() or 0
    cerradas = terminadas + rechazadas

    # Tiempos por etapa y cuello de botella.
    tiempos = [{"etapa": nombre_etapa.get(e), "proceso_min": _f(p / 60 if p else None, 1),
                "espera_min": _f(w / 60 if w else None, 1), "pasos": n} for e, p, w, n in (await db.execute(
        select(RTMPaso.etapa_id, func.avg(DURACION), func.avg(RTMPaso.espera_s), func.count())
        .where(RTMPaso.orden_id.in_(select(ords.c.id)), RTMPaso.estado == "CERRADO", RTMPaso.anula_id.is_(None),
               RTMPaso.omitida.is_(False)).group_by(RTMPaso.etapa_id))).all()]
    con_espera = [t for t in tiempos if t["espera_min"] is not None]
    cuello = max(con_espera, key=lambda t: t["espera_min"])["etapa"] if con_espera else None
    total_planta = (await db.execute(select(func.avg(func.extract("epoch", RTMOrden.terminada_en - RTMOrden.recibida_en)))
                                     .where(en, RTMOrden.estado == "TERMINADA"))).scalar()
    por_maquina = [{"equipo": n, "llantas": c} for n, c in (await db.execute(
        select(RTMEquipo.nombre, func.count(distinct(RTMPaso.orden_id))).join(RTMEquipo, RTMEquipo.id == RTMPaso.equipo_id)
        .where(RTMPaso.orden_id.in_(select(ords.c.id)), RTMPaso.estado == "CERRADO")
        .group_by(RTMEquipo.nombre).order_by(func.count(distinct(RTMPaso.orden_id)).desc()))).all()]
    hora_local = func.extract("hour", func.timezone("America/Bogota", RTMPaso.fin))
    turno = case((and_(hora_local >= 6, hora_local < 14), literal("Mañana (6–14)")),
                 (and_(hora_local >= 14, hora_local < 22), literal("Tarde (14–22)")), else_=literal("Noche (22–6)"))
    marcacion = etapas.get("MARCACION")
    por_turno = [{"turno": t, "llantas": n} for t, n in (await db.execute(
        select(turno, func.count()).where(RTMPaso.orden_id.in_(select(ords.c.id)), RTMPaso.estado == "CERRADO",
                                          RTMPaso.etapa_id == (marcacion.id if marcacion else 0))
        .group_by(turno))).all()]
    horas_hombre = ((await db.execute(select(func.sum(DURACION)).where(
        RTMPaso.orden_id.in_(select(ords.c.id)), RTMPaso.estado == "CERRADO", RTMPaso.ciclo_id.is_(None)))).scalar() or 0) / 3600

    # Vulcanización.
    ciclos_q = select(RTMCiclo.id).where(RTMCiclo.estado == "CERRADO", RTMCiclo.inicio >= ini, RTMCiclo.inicio < fin)
    if equipo_id:
        ciclos_q = ciclos_q.where(RTMCiclo.equipo_id == equipo_id)
    autoclaves = []
    for eq_id, nombre, n, llantas, *desv in (await db.execute(
            select(RTMCiclo.equipo_id, RTMEquipo.nombre, func.count(distinct(RTMCiclo.id)),
                   func.count(RTMCicloCarcasa.id),
                   *[func.count(distinct(case((text(f"rtm_ciclo.variables->'{v}'->>'conforme' = 'false'"), RTMCiclo.id))))
                     for v in ("temperatura", "presion", "vacio", "tiempo")])
            .join(RTMEquipo, RTMEquipo.id == RTMCiclo.equipo_id)
            .outerjoin(RTMCicloCarcasa, RTMCicloCarcasa.ciclo_id == RTMCiclo.id)
            .where(RTMCiclo.id.in_(ciclos_q)).group_by(RTMCiclo.equipo_id, RTMEquipo.nombre))).all():
        autoclaves.append({"equipo_id": eq_id, "autoclave": nombre, "ciclos": n,
                           "llantas_por_ciclo": round(llantas / n, 1) if n else None,
                           "desviacion_pct": {v: reglas.pct(d, n) for v, d in zip(("temperatura", "presion", "vacio", "tiempo"), desv)}})
    ciclos_total = sum(a["ciclos"] for a in autoclaves)
    con_desv = (await db.execute(select(func.count()).select_from(RTMCiclo).where(
        RTMCiclo.id.in_(ciclos_q), RTMCiclo.conforme.is_(False)))).scalar() or 0

    # Consumos y reparaciones.
    consumos = [{"clase": cl, "insumo": n, "unidad": u, "cantidad": _f(q, 2), "carcasas": c,
                 "por_llanta": _f(q / c, 3) if c else None, "costo": _f(cs, 2)} for cl, n, u, q, c, cs in (await db.execute(
        select(RTMInsumo.clase, WMSProducto.nombre, WMSProducto.unidad_medida, func.sum(RTMConsumo.cantidad),
               func.count(distinct(RTMConsumo.orden_id)), func.sum(RTMConsumo.costo))
        .join(RTMInsumo, RTMInsumo.producto_id == RTMConsumo.producto_id)
        .join(WMSProducto, WMSProducto.id == RTMConsumo.producto_id)
        .where(RTMConsumo.orden_id.in_(select(ords.c.id)))
        .group_by(RTMInsumo.clase, WMSProducto.nombre, WMSProducto.unidad_medida)
        .order_by(RTMInsumo.clase, WMSProducto.nombre))).all()]
    reparaciones = (await db.execute(select(func.count()).select_from(RTMReparacion).join(
        RTMPaso, RTMPaso.id == RTMReparacion.paso_id).where(RTMPaso.orden_id.in_(select(ords.c.id))))).scalar() or 0

    # Calidad final.
    final = etapas.get("INSP_FINAL")
    dec_final = {k: v for k, v in (await db.execute(
        select(RTMPaso.decision, func.count(distinct(RTMPaso.orden_id))).where(
            RTMPaso.orden_id.in_(select(ords.c.id)), RTMPaso.etapa_id == (final.id if final else 0),
            RTMPaso.estado == "CERRADO", RTMPaso.anula_id.is_(None)).group_by(RTMPaso.decision))).all()}
    inspeccionadas_final = sum(dec_final.values())
    defectos = [{"defecto": n, "zona": z, "veces": c} for n, z, c in (await db.execute(
        select(RTMDefecto.nombre, RTMDefecto.zona, func.count()).join(RTMPasoDefecto, RTMPasoDefecto.defecto_id == RTMDefecto.id)
        .join(RTMPaso, RTMPaso.id == RTMPasoDefecto.paso_id).where(RTMPaso.orden_id.in_(select(ords.c.id)))
        .group_by(RTMDefecto.nombre, RTMDefecto.zona).order_by(func.count().desc()).limit(15))).all()]

    # Garantías por cada 100 llantas entregadas en el periodo (mismos filtros de llanta).
    filtro_c = []
    if depositante_id:
        filtro_c.append(RTMCarcasa.depositante_id == depositante_id)
    if medida:
        filtro_c.append(RTMCarcasa.medida == medida)
    if marca:
        filtro_c.append(RTMCarcasa.marca.ilike(marca))
    entregadas = (await db.execute(select(func.count()).select_from(RTMEntregaCarcasa).join(
        RTMEntrega, RTMEntrega.id == RTMEntregaCarcasa.entrega_id).join(RTMCarcasa, RTMCarcasa.id == RTMEntregaCarcasa.carcasa_id)
        .where(RTMEntrega.estado == "ENTREGADA", RTMEntregaCarcasa.tipo == "TERMINADA", RTMEntrega.recibido_en >= ini,
               RTMEntrega.recibido_en < fin, *filtro_c))).scalar() or 0
    rec_q = select(RTMReclamo.dictamen, func.count()).join(RTMCarcasa, RTMCarcasa.id == RTMReclamo.carcasa_id).where(
        RTMReclamo.fecha >= desde, RTMReclamo.fecha <= hasta, *filtro_c).group_by(RTMReclamo.dictamen)
    recl = {k: v for k, v in (await db.execute(rec_q)).all()}
    reclamos_total = sum(recl.values())
    procedentes = recl.get("PROCEDE", 0) + recl.get("PARCIAL", 0)

    # Costo por llanta aprobada: insumos + mano de obra registrada.
    insumos_term = (await db.execute(select(func.sum(RTMOrden.costo_insumos)).where(en, RTMOrden.estado == "TERMINADA"))).scalar() or 0
    horas_term = ((await db.execute(select(func.sum(DURACION)).join(RTMOrden, RTMOrden.id == RTMPaso.orden_id).where(
        en, RTMOrden.estado == "TERMINADA", RTMPaso.estado == "CERRADO", RTMPaso.ciclo_id.is_(None)))).scalar() or 0) / 3600
    mano_obra = float(horas_term) * float(cfg.costo_hora_mano_obra or 0)

    return {
        "periodo": {"desde": desde, "hasta": hasta},
        "recepcion": {"recibidas": recibidas, "aprobadas_inicial": aprobadas_ini,
                      "aceptacion_inicial_pct": reglas.pct(aprobadas_ini, recibidas),
                      "rechazo_inicial_pct": reglas.pct(rechazo_ini, recibidas),
                      "condicionales_pct": reglas.pct(dec.get("CONDICIONAL", 0), recibidas),
                      "tiempo_inspeccion_min": _f(t_insp / 60 if t_insp else None, 1),
                      "rechazos_por_marca": sorted([{"marca": k, "carcasas": v} for k, v in por_marca.items()], key=lambda x: -x["carcasas"]),
                      "rechazos_por_medida": sorted([{"medida": k, "carcasas": v} for k, v in por_medida.items()], key=lambda x: -x["carcasas"]),
                      "rechazos_por_motivo": por_motivo},
        "embudo": {"etapas": embudo, "terminadas": terminadas, "rechazadas": rechazadas,
                   "en_proceso": estados.get("ABIERTA", 0), "rendimiento_pct": reglas.pct(terminadas, recibidas)},
        "primera_pasada": {"terminadas_primera": fpy_ok, "cerradas": cerradas, "fpy_pct": reglas.pct(fpy_ok, cerradas)},
        "tiempos": {"por_etapa": tiempos, "cuello_de_botella": cuello,
                    "total_planta_h": _f(total_planta / 3600 if total_planta else None, 1),
                    "por_maquina": por_maquina, "por_turno": por_turno, "horas_hombre": round(float(horas_hombre), 1),
                    "productividad": round(terminadas / float(horas_hombre), 2) if horas_hombre else None},
        "vulcanizacion": {"ciclos": ciclos_total, "ciclos_con_desviacion": con_desv,
                          "desviacion_pct": reglas.pct(con_desv, ciclos_total), "autoclaves": autoclaves},
        "consumos": {"insumos": consumos, "reparaciones": reparaciones,
                     "reparaciones_por_carcasa": round(reparaciones / recibidas, 2) if recibidas else None},
        "calidad": {"inspeccionadas_final": inspeccionadas_final,
                    "aprobacion_final_pct": reglas.pct(dec_final.get("APROBADA", 0) + dec_final.get("CORRECCION", 0), inspeccionadas_final),
                    "defectos": defectos, "entregadas": entregadas, "reclamos": reclamos_total,
                    "reclamos_por_100": reglas.por_cien(reclamos_total, entregadas),
                    "garantias_procedentes": procedentes,
                    "garantias_por_100": reglas.por_cien(procedentes, entregadas)},
        "costo": {"insumos": round(float(insumos_term), 2), "mano_obra": round(mano_obra, 2),
                  "por_llanta": round((float(insumos_term) + mano_obra) / terminadas, 2) if terminadas else None},
    }


# ── Conciliación con el WMS y existencias de insumos ──────────────────────────

@router.get("/conciliacion")
async def conciliacion(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return await rwms.conciliacion(db)


@router.get("/insumos/faltantes")
async def faltantes(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return await _faltante_banda(db)


@router.get("/novedades")
async def novedades(depositante_id: Optional[int] = None, db: AsyncSession = Depends(get_db),
                    _: Usuario = Depends(get_current_user)):
    """Recepciones cerradas con diferencia contra la remisión o lo recogido."""
    q = select(RTMRecepcion).where(RTMRecepcion.estado == "CERRADA", RTMRecepcion.diferencia != 0).order_by(
        RTMRecepcion.id.desc()).limit(200)
    if depositante_id:
        q = q.where(RTMRecepcion.depositante_id == depositante_id)
    deps = {i: n for i, n in (await db.execute(select(WMSDepositante.id, WMSDepositante.nombre))).all()}
    return [{"recepcion": r.codigo, "cliente": deps.get(r.depositante_id), "remision": r.remision,
             "declaradas": r.cantidad_declarada, "contadas": r.contadas, "diferencia": r.diferencia,
             "viaje_id": r.viaje_id, "fecha": r.cerrada_en} for r in (await db.execute(q)).scalars()]
