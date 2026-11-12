"""
Lo que entra y sale de la planta de reencauche: recepción, recogidas, entregas,
disposición de rechazos, liquidación, garantías y el enlace con Gestión de Activos.

- La recogida es nueva en el TMS: un viaje de primera milla con una parada por
  sede y la planta como destino; cada parada pide cantidad y remisión.
- La entrega deja sus documentos en el WMS (orden de salida, despacho, salida
  por serie) y viaja en un viaje del TMS; la prueba de entrega marca las
  llantas como entregadas.
- La liquidación se factura en el ERP con la misma mecánica de la factura de
  despacho del WMS (resolución vigente, consecutivo DIAN, asiento de venta).

Las funciones no hacen commit, igual que `reencauche_flujo`.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import facturacion_dian as dian, reencauche_flujo as flujo, reencauche_wms as rwms, wms_contable
from app.core.reencauche_semilla import config as obtener_config
from app.core.wms_operacion import depositante_propio
from app.infrastructure.models.reencauche import (
    RTMCarcasa, RTMDisposicion, RTMEntrega, RTMEntregaCarcasa, RTMLiquidacion, RTMLiquidacionLinea, RTMOrden,
    RTMPaso, RTMEtapa, RTMRecepcion, RTMReclamo, RTMSolicitudRecogida, RTMTarifa,
)
from app.infrastructure.models.tms import (
    EstadoParadaTMSEnum, EstadoViajeTMSEnum, TipoEventoTMSEnum, TipoParadaTMSEnum, TipoServicioTMSEnum, TMSEvento,
    TMSParada, TMSViaje, TMSViajeDespacho,
)
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.wms import (
    WMSAlmacen, WMSCliente, WMSDepositante, WMSDespacho, WMSDespachoDetalle, WMSOrdenSalida, WMSOrdenSalidaDetalle,
    WMSProducto,
)

CENT = Decimal("0.01")
IVA_SERVICIO = Decimal("19")


def _r2(v) -> Decimal:
    return Decimal(str(v or 0)).quantize(CENT, ROUND_HALF_UP)


def hoy() -> date:
    return wms_contable.hoy()


# ── Recepción ─────────────────────────────────────────────────────────────────

async def crear_recepcion(db: AsyncSession, usuario: Usuario, depositante_id: int, remision: Optional[str] = None,
                          cantidad_declarada: Optional[int] = None, solicitud_id: Optional[int] = None,
                          placa: Optional[str] = None, entrega_nombre: Optional[str] = None,
                          observaciones: Optional[str] = None, eam_lote_id: Optional[int] = None) -> RTMRecepcion:
    rwms.planta_lista(await obtener_config(db))
    if not await db.get(WMSDepositante, depositante_id):
        raise HTTPException(404, "El propietario no existe.")
    viaje_id = parada_id = None
    if solicitud_id:
        sol = await db.get(RTMSolicitudRecogida, solicitud_id)
        if sol is None:
            raise HTTPException(404, "La solicitud de recogida no existe.")
        if sol.estado != "RECOGIDA":
            raise HTTPException(409, "La recogida todavía no se completó en el viaje.")
        if (await db.execute(select(RTMRecepcion.id).where(RTMRecepcion.solicitud_id == sol.id))).first():
            raise HTTPException(409, "Esa recogida ya tiene recepción.")
        parada = await db.get(TMSParada, sol.parada_id)
        depositante_id, viaje_id, parada_id = sol.depositante_id, sol.viaje_id, sol.parada_id
        cantidad_declarada, remision = parada.recogida_cantidad, parada.recogida_remision or remision
    r = RTMRecepcion(codigo=await flujo.consecutivo(db, RTMRecepcion, "RC"), depositante_id=depositante_id,
                     remision=(remision or "").strip() or None, cantidad_declarada=cantidad_declarada,
                     solicitud_id=solicitud_id, viaje_id=viaje_id, parada_id=parada_id, placa=placa,
                     entrega_nombre=entrega_nombre, observaciones=observaciones, estado="EN_CURSO",
                     usuario_id=usuario.id, eam_lote_id=eam_lote_id)
    db.add(r)
    await db.flush()
    return r


async def coincidencias(db: AsyncSession, codigo: Optional[str], dot: Optional[str], serie: Optional[str]) -> List[RTMCarcasa]:
    """Una llanta que ya pasó por la planta, por su código, DOT o serie."""
    conds = []
    if codigo:
        conds.append(RTMCarcasa.codigo == codigo.strip())
    if dot:
        conds.append(RTMCarcasa.dot == dot.strip())
    if serie:
        conds.append(RTMCarcasa.serie == serie.strip())
    if not conds:
        return []
    from sqlalchemy import or_
    return list((await db.execute(select(RTMCarcasa).where(or_(*conds)).limit(10))).scalars())


async def registrar_carcasa(db: AsyncSession, rec: RTMRecepcion, usuario: Usuario, datos: Dict) -> Dict:
    if rec.estado != "EN_CURSO":
        raise HTTPException(409, "La recepción está cerrada: abra otra.")
    cfg = await obtener_config(db)
    propietario = rec.depositante_id
    propia = propietario == await depositante_propio(db)
    if datos.get("carcasa_id"):
        c = await db.get(RTMCarcasa, int(datos["carcasa_id"]))
        if c is None:
            raise HTTPException(404, "La carcasa no existe.")
        if c.estado not in ("ENTREGADA", "VENDIDA"):
            raise HTTPException(409, f"La carcasa {c.codigo} está {c.estado.lower().replace('_', ' ')}: solo vuelve "
                                     "una llanta que ya salió de la planta.")
        c.depositante_id, c.recepcion_id, c.estado = propietario, rec.id, "EN_PLANTA"
        for campo in ("profundidad_mm", "estado_costados", "posicion_anterior", "observaciones"):
            if datos.get(campo) is not None:
                setattr(c, campo, datos[campo])
        nueva = False
    else:
        for campo in ("marca", "medida", "modelo"):
            if not str(datos.get(campo) or "").strip():
                raise HTTPException(422, f"Falta {campo} de la carcasa.")
        codigo = str(datos.get("codigo") or "").strip().upper()
        if codigo:
            otra = (await db.execute(select(RTMCarcasa).where(RTMCarcasa.codigo == codigo))).scalar()
            if otra is not None:
                dueno = await db.get(WMSDepositante, otra.depositante_id)
                raise HTTPException(409, f"El código {codigo} ya pertenece a la carcasa {otra.marca} {otra.medida} "
                                         f"de {dueno.nombre if dueno else 'otro propietario'}.")
        else:
            codigo = await flujo.codigo_carcasa(db)
        dot = str(datos.get("dot") or "").strip().upper() or None
        c = RTMCarcasa(codigo=codigo, depositante_id=propietario, marca=datos["marca"].strip(),
                       medida=datos["medida"].strip(), modelo=datos["modelo"].strip(), dot=dot,
                       dot_ilegible=bool(datos.get("dot_ilegible")) or not dot,
                       serie=(str(datos.get("serie") or "").strip() or None), profundidad_mm=datos.get("profundidad_mm"),
                       estado_costados=datos.get("estado_costados"), reencauches=int(datos.get("reencauches") or 0),
                       posicion_anterior=datos.get("posicion_anterior"), observaciones=datos.get("observaciones"),
                       costo_compra=datos.get("costo_compra") if propia else None, estado="EN_PLANTA",
                       recepcion_id=rec.id, eam_neumatico_id=datos.get("eam_neumatico_id"))
        db.add(c)
        nueva = True
    await db.flush()
    await rwms.entrar_carcasa(db, cfg, c, usuario.id, flujo.nombre_usuario(usuario))
    orden = await flujo.abrir_orden(db, c, rec, usuario, banda_producto_id=datos.get("banda_producto_id"),
                                    prioridad=int(datos.get("prioridad") or 3), ruta_id=datos.get("ruta_id"))
    await db.flush()
    return {"carcasa_id": c.id, "codigo": c.codigo, "nueva": nueva, "orden_id": orden.id, "orden": orden.codigo,
            "numero_reencauche": orden.numero_reencauche}


async def cerrar_recepcion(db: AsyncSession, rec: RTMRecepcion, usuario: Usuario) -> RTMRecepcion:
    if rec.estado != "EN_CURSO":
        raise HTTPException(409, "La recepción ya está cerrada.")
    contadas = (await db.execute(select(func.count()).select_from(RTMCarcasa).where(
        RTMCarcasa.recepcion_id == rec.id))).scalar() or 0
    if rec.cantidad_declarada is None:
        rec.cantidad_declarada = contadas
    rec.contadas, rec.diferencia = contadas, contadas - rec.cantidad_declarada
    rec.estado, rec.cerrada_en = "CERRADA", flujo.ahora()
    if rec.solicitud_id:
        sol = await db.get(RTMSolicitudRecogida, rec.solicitud_id)
        sol.estado = "RECIBIDA"
    if rec.diferencia and rec.viaje_id:
        db.add(TMSEvento(viaje_id=rec.viaje_id, parada_id=rec.parada_id, tipo_evento=TipoEventoTMSEnum.INCIDENTE,
                         descripcion=f"Novedad de recogida: el conductor registró {rec.cantidad_declarada} llantas y la "
                                     f"planta contó {contadas} (diferencia {rec.diferencia:+d}) en la recepción {rec.codigo}.",
                         timestamp=flujo.ahora(), registrado_por_id=usuario.id))
    await db.flush()
    return rec


# ── Recogidas en el TMS ───────────────────────────────────────────────────────

async def _codigo_viaje(db: AsyncSession) -> str:
    anio = datetime.utcnow().year
    n = ((await db.execute(select(func.count(TMSViaje.id)))).scalar() or 0) + 1
    while True:
        codigo = f"VJ-{anio}-{n:06d}"
        if (await db.execute(select(TMSViaje.id).where(TMSViaje.codigo == codigo))).first() is None:
            return codigo
        n += 1


async def _almacen_planta(db: AsyncSession) -> WMSAlmacen:
    cfg = await obtener_config(db)
    rwms.planta_lista(cfg)
    return await db.get(WMSAlmacen, cfg.almacen_id)


async def programar_recogidas(db: AsyncSession, usuario: Usuario, solicitud_ids: List[int], fecha: datetime,
                              vehiculo_id: Optional[int] = None) -> TMSViaje:
    if not solicitud_ids:
        raise HTTPException(422, "Elija al menos una solicitud de recogida.")
    sols = list((await db.execute(select(RTMSolicitudRecogida).where(RTMSolicitudRecogida.id.in_(solicitud_ids))
                                  .order_by(RTMSolicitudRecogida.fecha_requerida, RTMSolicitudRecogida.id)
                                  .with_for_update())).scalars())
    if len(sols) != len(set(solicitud_ids)):
        raise HTTPException(404, "Alguna solicitud no existe.")
    for s in sols:
        if s.estado != "PENDIENTE":
            raise HTTPException(409, f"La solicitud {s.codigo} ya está {s.estado.lower()}.")
    planta = await _almacen_planta(db)
    total = sum(s.cantidad_estimada for s in sols)
    viaje = TMSViaje(codigo=await _codigo_viaje(db), tipo_servicio=TipoServicioTMSEnum.PRIMERA_MILLA,
                     estado=EstadoViajeTMSEnum.PROGRAMADO, vehiculo_id=vehiculo_id,
                     origen_ciudad=sols[0].ciudad, origen_direccion=sols[0].direccion,
                     destino_ciudad=planta.ciudad or planta.nombre, destino_direccion=planta.direccion,
                     destino_lat=planta.lat, destino_lng=planta.lng, fecha_programada_cargue=fecha,
                     fecha_programada_entrega=fecha + timedelta(hours=8), num_entregas=len(sols),
                     descripcion_carga=f"Recogida de carcasas para reencauche: {total} llantas estimadas",
                     creado_por_id=usuario.id)
    db.add(viaje)
    await db.flush()
    deps = {d.id: d.nombre for d in (await db.execute(select(WMSDepositante).where(
        WMSDepositante.id.in_([s.depositante_id for s in sols])))).scalars()}
    for i, s in enumerate(sols, start=1):
        p = TMSParada(viaje_id=viaje.id, secuencia=i,
                      tipo=TipoParadaTMSEnum.ORIGEN if i == 1 else TipoParadaTMSEnum.PARADA_INTERMEDIA,
                      ciudad=s.ciudad, direccion=s.direccion, contacto=s.contacto, telefono_contacto=s.telefono,
                      estado=EstadoParadaTMSEnum.PENDIENTE,
                      observaciones=f"Recogida {s.codigo} · {deps.get(s.depositante_id)} · {s.sede} · "
                                    f"{s.cantidad_estimada} llantas estimadas. Registre cantidad y remisión.")
        db.add(p)
        await db.flush()
        s.estado, s.viaje_id, s.parada_id = "PROGRAMADA", viaje.id, p.id
    db.add(TMSParada(viaje_id=viaje.id, secuencia=len(sols) + 1, tipo=TipoParadaTMSEnum.DESTINO,
                     ciudad=planta.ciudad or planta.nombre, direccion=planta.direccion, lat=planta.lat, lng=planta.lng,
                     estado=EstadoParadaTMSEnum.PENDIENTE, observaciones="Planta de reencauche"))
    await db.flush()
    return viaje


async def al_completar_parada(db: AsyncSession, parada: TMSParada, estado: str, cantidad: Optional[int],
                              remision: Optional[str]) -> None:
    """Enganche del TMS: completar una parada de recogida pide lo recogido.
    Para las demás paradas no hace nada."""
    sol = (await db.execute(select(RTMSolicitudRecogida).where(RTMSolicitudRecogida.parada_id == parada.id))).scalar()
    if sol is None or str(estado).upper() != "COMPLETADA":
        return
    if cantidad is None or cantidad < 0:
        raise HTTPException(422, "Esta parada es una recogida de llantas: registre la cantidad recogida y la remisión "
                                 "del cliente para completarla.")
    parada.recogida_cantidad = int(cantidad)
    parada.recogida_remision = (remision or "").strip() or None
    sol.estado = "RECOGIDA"


# ── Entregas ──────────────────────────────────────────────────────────────────

async def _por_entregar(db: AsyncSession, depositante_id: int) -> Dict[str, List]:
    activas = select(RTMEntregaCarcasa.carcasa_id).join(RTMEntrega, RTMEntrega.id == RTMEntregaCarcasa.entrega_id).where(
        RTMEntrega.estado.in_(("BORRADOR", "DESPACHADA")))
    # Con tope: una entrega es lo que cabe en un despacho, no el inventario entero.
    terminadas = list((await db.execute(select(RTMCarcasa).where(
        RTMCarcasa.depositante_id == depositante_id, RTMCarcasa.estado == "TERMINADA",
        RTMCarcasa.id.notin_(activas)).order_by(RTMCarcasa.codigo).limit(500))).scalars())
    devoluciones = list((await db.execute(
        select(RTMCarcasa).join(RTMDisposicion, RTMDisposicion.carcasa_id == RTMCarcasa.id).where(
            RTMCarcasa.depositante_id == depositante_id, RTMCarcasa.estado == "RECHAZADA",
            RTMDisposicion.tipo == "DEVOLUCION", RTMDisposicion.estado == "PENDIENTE",
            RTMCarcasa.id.notin_(activas)).order_by(RTMCarcasa.codigo).limit(500))).scalars())
    return {"terminadas": terminadas, "devoluciones": devoluciones}


async def propuesta_entrega(db: AsyncSession, depositante_id: int) -> Dict:
    p = await _por_entregar(db, depositante_id)
    return {k: [{"id": c.id, "codigo": c.codigo, "medida": c.medida, "marca": c.marca} for c in v] for k, v in p.items()}


async def _ultima_orden(db: AsyncSession, carcasa_id: int) -> Optional[RTMOrden]:
    return (await db.execute(select(RTMOrden).where(RTMOrden.carcasa_id == carcasa_id)
                             .order_by(RTMOrden.id.desc()).limit(1))).scalar()


async def _precio_venta(db: AsyncSession, c: RTMCarcasa, orden: RTMOrden) -> Optional[Decimal]:
    t = (await db.execute(select(RTMTarifa).where(
        RTMTarifa.activo.is_(True), RTMTarifa.tipo == "VENTA", RTMTarifa.medida.in_((c.medida,)),
        RTMTarifa.banda_producto_id.in_((orden.banda_producto_id,)) | RTMTarifa.banda_producto_id.is_(None))
        .order_by(RTMTarifa.banda_producto_id.is_(None), RTMTarifa.id.desc()).limit(1))).scalar()
    return _r2(t.valor) if t else None


async def crear_entrega(db: AsyncSession, usuario: Usuario, depositante_id: int, carcasa_ids: List[int],
                        modo: str = "VIAJE", wms_cliente_id: Optional[int] = None, ciudad: Optional[str] = None,
                        direccion: Optional[str] = None, precios: Optional[Dict[int, float]] = None) -> RTMEntrega:
    if not carcasa_ids:
        raise HTTPException(422, "La entrega no tiene llantas.")
    modo = modo.upper()
    if modo not in ("VIAJE", "MOSTRADOR"):
        raise HTTPException(422, "La entrega es por viaje o en mostrador.")
    dep = await db.get(WMSDepositante, depositante_id)
    if dep is None:
        raise HTTPException(404, "El propietario no existe.")
    venta = bool(dep.propio)
    if venta and not wms_cliente_id:
        raise HTTPException(422, "Las reencauchadas de la planta se venden: indique el cliente comprador.")
    disponibles = await _por_entregar(db, depositante_id)
    terminadas = {c.id for c in disponibles["terminadas"]}
    devoluciones = {c.id for c in disponibles["devoluciones"]}
    e = RTMEntrega(codigo=await flujo.consecutivo(db, RTMEntrega, "EN"), depositante_id=depositante_id,
                   tipo="VENTA" if venta else "SERVICIO", wms_cliente_id=wms_cliente_id, modo=modo, estado="BORRADOR",
                   ciudad=ciudad, direccion=direccion, usuario_id=usuario.id)
    db.add(e)
    await db.flush()
    for cid in dict.fromkeys(int(x) for x in carcasa_ids):
        c = await db.get(RTMCarcasa, cid)
        if c is None:
            raise HTTPException(404, f"La carcasa {cid} no existe.")
        if c.depositante_id != depositante_id:
            raise HTTPException(409, f"La carcasa {c.codigo} es de otro propietario.")
        orden = await _ultima_orden(db, c.id)
        if cid in terminadas:
            tipo = "TERMINADA"
        elif cid in devoluciones:
            tipo = "DEVOLUCION"
        elif orden is not None and orden.retenida:
            raise HTTPException(409, f"La carcasa {c.codigo} está retenida: no se puede despachar.")
        elif c.estado == "RECHAZADA":
            raise HTTPException(409, f"La carcasa {c.codigo} está rechazada sin disposición de devolución.")
        else:
            raise HTTPException(409, f"La carcasa {c.codigo} no está lista para entregar "
                                     f"({c.estado.lower().replace('_', ' ')}).")
        precio = None
        if venta and tipo == "TERMINADA":
            precio = _r2((precios or {}).get(cid)) if (precios or {}).get(cid) else await _precio_venta(db, c, orden)
            if not precio:
                raise HTTPException(422, f"Falta el precio de venta de {c.codigo}: regístrelo o cree la tarifa de venta.")
        db.add(RTMEntregaCarcasa(entrega_id=e.id, carcasa_id=c.id, orden_id=orden.id, tipo=tipo, precio=precio))
    await db.flush()
    return e


async def _cliente_wms(db: AsyncSession, dep: WMSDepositante) -> WMSCliente:
    q = select(WMSCliente).where(WMSCliente.nit == dep.nit) if dep.nit else \
        select(WMSCliente).where(WMSCliente.codigo == f"RTM-{dep.codigo}"[:30])
    cli = (await db.execute(q.limit(1))).scalar()
    if cli is None:
        cli = WMSCliente(codigo=f"RTM-{dep.codigo}"[:30], nombre=dep.nombre, nit=dep.nit, email=dep.email,
                         telefono=dep.telefono, activo=True)
        db.add(cli)
        await db.flush()
    return cli


async def despachar(db: AsyncSession, e: RTMEntrega, usuario: Usuario, placa: Optional[str] = None,
                    recibe_nombre: Optional[str] = None, fecha_programada: Optional[datetime] = None) -> RTMEntrega:
    """Los documentos del WMS, la salida por serie y, si va por viaje, el viaje
    del TMS. En mostrador se entrega en el acto."""
    if e.estado != "BORRADOR":
        raise HTTPException(409, "La entrega ya se despachó.")
    if e.modo == "MOSTRADOR" and (not placa or not recibe_nombre):
        raise HTTPException(422, "En mostrador registre la placa del vehículo y el nombre de quien recibe.")
    alm = await _almacen_planta(db)
    dep = await db.get(WMSDepositante, e.depositante_id)
    cli = await db.get(WMSCliente, e.wms_cliente_id) if e.wms_cliente_id else await _cliente_wms(db, dep)
    e.wms_cliente_id = cli.id
    lineas = list((await db.execute(select(RTMEntregaCarcasa, RTMCarcasa).join(
        RTMCarcasa, RTMCarcasa.id == RTMEntregaCarcasa.carcasa_id).where(RTMEntregaCarcasa.entrega_id == e.id))).all())
    for ec, c in lineas:
        o = await _ultima_orden(db, c.id)
        if o is not None and o.retenida:
            raise HTTPException(409, f"La carcasa {c.codigo} está retenida: no se puede despachar.")
    os_ = WMSOrdenSalida(numero_orden=f"RTM-{e.codigo}", cliente_id=cli.id, almacen_id=alm.id,
                         depositante_id=e.depositante_id, fecha_emision=hoy(), estado="DESPACHADO", prioridad="NORMAL",
                         canal="B2B", destino_ciudad=e.ciudad, destino_direccion=e.direccion)
    db.add(os_)
    await db.flush()
    por_producto: Dict[int, List] = {}
    for ec, c in lineas:
        por_producto.setdefault(c.wms_producto_id, []).append((ec, c))
    for pid, filas in por_producto.items():
        precios = [float(ec.precio) for ec, _ in filas if ec.precio is not None]
        db.add(WMSOrdenSalidaDetalle(orden_id=os_.id, producto_id=pid, cantidad_solicitada=len(filas),
                                     cantidad_preparada=len(filas), cantidad_despachada=len(filas),
                                     precio_unitario=(sum(precios) / len(precios)) if precios else None,
                                     estado="COMPLETO"))
    desp = WMSDespacho(numero_despacho=f"DS-RTM-{e.codigo}", orden_id=os_.id, fecha_despacho=hoy(),
                       estado="ENTREGADO" if e.modo == "MOSTRADOR" else "EN_TRANSITO", vehiculo_placa=placa,
                       notas=f"Entrega de la planta de reencauche {e.codigo}")
    db.add(desp)
    await db.flush()
    for pid, filas in por_producto.items():
        db.add(WMSDespachoDetalle(despacho_id=desp.id, producto_id=pid, cantidad=len(filas)))
    for ec, c in lineas:
        await rwms.sacar(db, c, "DESPACHO", "DESPACHO", desp.id, usuario.id)
        c.estado = "DESPACHADA"
    e.wms_orden_id, e.wms_despacho_id, e.placa = os_.id, desp.id, placa
    e.estado = "DESPACHADA"
    if e.tipo == "VENTA":
        # Lo de la planta se vende: costo de ventas y factura, como cualquier despacho propio.
        await wms_contable.contabilizar_despacho(db, desp, flujo.nombre_usuario(usuario))
    else:
        await generar_liquidacion(db, e)
    if e.modo == "VIAJE":
        destino = e.ciudad or cli.ciudad or dep.nombre
        viaje = TMSViaje(codigo=await _codigo_viaje(db), tipo_servicio=TipoServicioTMSEnum.DISTRIBUCION,
                         estado=EstadoViajeTMSEnum.PROGRAMADO, wms_despacho_id=desp.id,
                         origen_ciudad=alm.ciudad or alm.nombre, origen_direccion=alm.direccion, origen_lat=alm.lat,
                         origen_lng=alm.lng, destino_ciudad=destino, destino_direccion=e.direccion,
                         fecha_programada_cargue=fecha_programada or flujo.ahora(), num_entregas=1,
                         descripcion_carga=f"Entrega de {len(lineas)} llantas de la planta de reencauche ({e.codigo})",
                         creado_por_id=usuario.id)
        db.add(viaje)
        await db.flush()
        db.add(TMSParada(viaje_id=viaje.id, secuencia=1, tipo=TipoParadaTMSEnum.ORIGEN, ciudad=alm.ciudad or alm.nombre,
                         direccion=alm.direccion, lat=alm.lat, lng=alm.lng, estado=EstadoParadaTMSEnum.PENDIENTE,
                         observaciones="Planta de reencauche"))
        dest = TMSParada(viaje_id=viaje.id, secuencia=2, tipo=TipoParadaTMSEnum.DESTINO, ciudad=destino,
                         direccion=e.direccion, estado=EstadoParadaTMSEnum.PENDIENTE,
                         observaciones=f"Entrega {e.codigo} · {cli.nombre} · {len(lineas)} llantas")
        db.add(dest)
        await db.flush()
        db.add(TMSViajeDespacho(viaje_id=viaje.id, despacho_id=desp.id, parada_id=dest.id))
        e.viaje_id = viaje.id
    else:
        await entregar(db, e, usuario, recibe_nombre)
    await db.flush()
    return e


async def entregar(db: AsyncSession, e: RTMEntrega, usuario: Optional[Usuario], recibe_nombre: Optional[str],
                   momento: Optional[datetime] = None) -> None:
    if e.estado != "DESPACHADA":
        return
    momento = momento or flujo.ahora()
    e.estado, e.recibe_nombre, e.recibido_en = "ENTREGADA", recibe_nombre, momento
    lineas = list((await db.execute(select(RTMEntregaCarcasa, RTMCarcasa).join(
        RTMCarcasa, RTMCarcasa.id == RTMEntregaCarcasa.carcasa_id).where(RTMEntregaCarcasa.entrega_id == e.id))).all())
    for ec, c in lineas:
        if ec.tipo == "DEVOLUCION":
            c.estado = "DISPUESTA"
            d = (await db.execute(select(RTMDisposicion).where(RTMDisposicion.orden_id == ec.orden_id))).scalar()
            if d:
                d.estado = "CUMPLIDA"
        else:
            c.estado = "VENDIDA" if e.tipo == "VENTA" else "ENTREGADA"
        await resultado_a_cmms(db, c, ec)
    if e.wms_despacho_id:
        desp = await db.get(WMSDespacho, e.wms_despacho_id)
        desp.estado, desp.fecha_entrega_real = "ENTREGADO", momento.date()
        os_ = await db.get(WMSOrdenSalida, desp.orden_id)
        os_.estado = "ENTREGADO"


async def al_registrar_pod(db: AsyncSession, viaje_id: int, parada_id: Optional[int], receptor: Optional[str],
                           momento: Optional[datetime]) -> int:
    """Enganche del TMS: la prueba de entrega marca las llantas como entregadas.
    Solo toca las entregas de la planta; los demás despachos siguen igual."""
    q = select(RTMEntrega).where(RTMEntrega.viaje_id == viaje_id, RTMEntrega.estado == "DESPACHADA")
    if parada_id:
        ids = [d for (d,) in (await db.execute(select(TMSViajeDespacho.despacho_id).where(
            TMSViajeDespacho.viaje_id == viaje_id, TMSViajeDespacho.parada_id == parada_id))).all()]
        if ids:
            q = q.where(RTMEntrega.wms_despacho_id.in_(ids))
    n = 0
    for e in (await db.execute(q)).scalars():
        await entregar(db, e, None, receptor, momento)
        n += 1
    return n


# ── Disposición de rechazos ───────────────────────────────────────────────────

async def disponer(db: AsyncSession, usuario: Usuario, carcasa_ids: List[int], tipo: str, gestor: Optional[str] = None,
                   acta: Optional[str] = None, valor: Optional[float] = None) -> int:
    tipo = tipo.upper()
    if tipo not in ("DEVOLUCION", "GESTOR", "VENTA"):
        raise HTTPException(422, "La disposición es devolución, gestor o venta.")
    if tipo == "GESTOR" and (not acta or not gestor):
        raise HTTPException(422, "La entrega a gestor exige el nombre del gestor y el número de acta o certificado.")
    cfg = await obtener_config(db)
    propio = await depositante_propio(db)
    movs = []
    for cid in dict.fromkeys(int(x) for x in carcasa_ids):
        c = await db.get(RTMCarcasa, cid)
        if c is None:
            raise HTTPException(404, f"La carcasa {cid} no existe.")
        orden = await _ultima_orden(db, c.id)
        if c.estado != "RECHAZADA" or orden is None or orden.estado != "RECHAZADA":
            raise HTTPException(409, f"La carcasa {c.codigo} no está rechazada.")
        previa = (await db.execute(select(RTMDisposicion).where(RTMDisposicion.orden_id == orden.id))).scalar()
        if previa is not None and not (previa.tipo == "DEVOLUCION" and previa.estado == "PENDIENTE"):
            raise HTTPException(409, f"La carcasa {c.codigo} ya tiene disposición ({previa.tipo.lower()}).")
        if tipo == "DEVOLUCION" and c.depositante_id == propio:
            raise HTTPException(409, f"La carcasa {c.codigo} es de la planta: no hay a quién devolverla.")
        if tipo == "VENTA" and (c.depositante_id != propio or not cfg.permite_venta_rechazo):
            raise HTTPException(409, "Solo se venden como carcasa no apta las de la planta, y si la empresa lo habilitó.")
        d = previa or RTMDisposicion(carcasa_id=c.id, orden_id=orden.id)
        d.tipo, d.gestor, d.acta, d.usuario_id = tipo, gestor, acta, usuario.id
        d.valor = valor if tipo == "VENTA" else None
        d.estado = "PENDIENTE" if tipo == "DEVOLUCION" else "CUMPLIDA"
        if previa is None:
            db.add(d)
        if tipo != "DEVOLUCION":
            mov = await rwms.sacar(db, c, "BAJA" if tipo == "GESTOR" else "VENTA", "RTM_DISPOSICION", orden.id,
                                   usuario.id, estado_serie="DADO_DE_BAJA" if tipo == "GESTOR" else "DESPACHADO")
            if mov is not None and c.depositante_id == propio:
                movs.append(mov)
            c.estado = "DISPUESTA" if tipo == "GESTOR" else "VENDIDA"
    if movs:
        await wms_contable.contabilizar_ajuste(db, movs, flujo.nombre_usuario(usuario),
                                               f"Carcasas rechazadas · {tipo.lower()}" + (f" acta {acta}" if acta else ""),
                                               "rtm_disposicion", None)
    await db.flush()
    return len(carcasa_ids)


# ── Liquidación ───────────────────────────────────────────────────────────────

async def _cargo_inspeccion(db: AsyncSession, depositante_id: int) -> Decimal:
    t = (await db.execute(select(RTMTarifa).where(
        RTMTarifa.activo.is_(True), RTMTarifa.tipo == "CARGO_INSPECCION",
        (RTMTarifa.depositante_id == depositante_id) | RTMTarifa.depositante_id.is_(None))
        .order_by(RTMTarifa.depositante_id.is_(None), RTMTarifa.id.desc()).limit(1))).scalar()
    if t is not None:
        return _r2(t.valor)
    return _r2((await obtener_config(db)).cargo_inspeccion)


async def generar_liquidacion(db: AsyncSession, e: RTMEntrega) -> RTMLiquidacion:
    liq = RTMLiquidacion(codigo=await flujo.consecutivo(db, RTMLiquidacion, "LQ"), entrega_id=e.id,
                         depositante_id=e.depositante_id, estado="BORRADOR")
    db.add(liq)
    await db.flush()
    cargo = await _cargo_inspeccion(db, e.depositante_id)
    subtotal = Decimal(0)
    lineas = (await db.execute(select(RTMEntregaCarcasa, RTMCarcasa, RTMOrden).join(
        RTMCarcasa, RTMCarcasa.id == RTMEntregaCarcasa.carcasa_id).join(
        RTMOrden, RTMOrden.id == RTMEntregaCarcasa.orden_id).where(RTMEntregaCarcasa.entrega_id == e.id))).all()
    for ec, c, o in lineas:
        if ec.tipo == "TERMINADA":
            banda = await db.get(WMSProducto, o.banda_producto_id) if o.banda_producto_id else None
            v = _r2(o.precio)
            db.add(RTMLiquidacionLinea(liquidacion_id=liq.id, carcasa_id=c.id, concepto="REENCAUCHE",
                                       descripcion=f"Reencauche {c.medida} · {banda.nombre if banda else 'banda'} · {c.codigo}"[:300],
                                       cantidad=1, valor_unitario=v, total=v))
            subtotal += v
            for r in (o.precio_detalle or {}).get("reparaciones", []):
                if r.get("valor"):
                    t = _r2(Decimal(str(r["valor"])) * r["cantidad"])
                    db.add(RTMLiquidacionLinea(liquidacion_id=liq.id, carcasa_id=c.id, concepto="REPARACION",
                                               descripcion=f"Reparación {r['tipo_reparacion'].lower()} · {c.codigo}"[:300],
                                               cantidad=r["cantidad"], valor_unitario=_r2(r["valor"]), total=t))
                    subtotal += t
        elif cargo > 0:
            db.add(RTMLiquidacionLinea(liquidacion_id=liq.id, carcasa_id=c.id, concepto="CARGO_INSPECCION",
                                       descripcion=f"Inspección de carcasa rechazada · {c.codigo}", cantidad=1,
                                       valor_unitario=cargo, total=cargo))
            subtotal += cargo
    liq.subtotal = _r2(subtotal)
    liq.iva = _r2(subtotal * IVA_SERVICIO / 100)
    liq.total = liq.subtotal + liq.iva
    await db.flush()
    return liq


async def aprobar_liquidacion(db: AsyncSession, liq: RTMLiquidacion, usuario: Usuario) -> RTMLiquidacion:
    if liq.estado not in ("BORRADOR", "APROBADA"):
        raise HTTPException(409, f"La liquidación está {liq.estado.lower()}.")
    liq.estado, liq.aprobada_por_id = "APROBADA", usuario.id
    try:
        async with db.begin_nested():
            fac = await _facturar(db, liq, usuario)
        liq.factura_id, liq.aviso_factura, liq.estado = fac.id, None, "FACTURADA"
    except HTTPException as e:
        liq.aviso_factura = str(e.detail)[:300]
    await db.flush()
    return liq


async def _facturar(db: AsyncSession, liq: RTMLiquidacion, usuario: Usuario):
    from app.core import erp_motor
    from app.infrastructure.models.erp import ERPFacturaCliente, ERPLineaFacturaCliente, EstadoFactura, TipoComprobante
    from app.infrastructure.models.erp_nucleo import ERPTercero

    emp = await wms_contable.empresa(db)
    if emp is None:
        raise HTTPException(422, "Configure primero la empresa en Finanzas: la factura necesita emisor.")
    dep = await db.get(WMSDepositante, liq.depositante_id)
    t = await db.get(ERPTercero, dep.tercero_id) if dep.tercero_id else None
    if t is None:
        if not dep.nit:
            raise HTTPException(422, f"El cliente {dep.nombre} no tiene NIT ni tercero en Finanzas: complételo y apruebe de nuevo.")
        t = await wms_contable.tercero(db, emp, dep.nombre, dep.nit, dep.email, cliente=True)
    lineas = (await db.execute(select(RTMLiquidacionLinea).where(
        RTMLiquidacionLinea.liquidacion_id == liq.id).order_by(RTMLiquidacionLinea.id))).scalars().all()
    if not lineas:
        raise HTTPException(422, "La liquidación no tiene nada que cobrar.")
    res = await wms_contable.resolucion_vigente(db, emp.id)
    try:
        numero, res = await dian.tomar_numero(db, res.id)
    except dian.ResolucionInvalida as e:
        raise HTTPException(409, str(e))
    subtotal, iva = _r2(liq.subtotal), _r2(liq.iva)
    total = subtotal + iva
    h, momento = hoy(), datetime.now(timezone.utc)
    fac = ERPFacturaCliente(
        empresa_id=emp.id, numero=numero, cliente_nombre=t.razon_social or dep.nombre, cliente_nit=t.numero_identificacion,
        cliente_email=dep.email, fecha=h, fecha_vencimiento=h + timedelta(days=30), subtotal=subtotal,
        total_impuestos=iva, total=total, saldo=total, estado=EstadoFactura.EMITIDA, moneda="COP",
        concepto=f"Servicio de reencauche · liquidación {liq.codigo}",
        cufe=dian.codigo_unico(numero, h, dian.hora_colombia(momento), subtotal, iva, 0, 0, total, emp.nit,
                               t.numero_identificacion, res.clave_tecnica, res.ambiente),
        numero_electronico=numero, resolucion_id=res.id, origen="REENCAUCHE", estado_dian="POR_TRANSMITIR")
    db.add(fac)
    await db.flush()
    for l in lineas:
        base = _r2(l.total)
        imp = _r2(base * IVA_SERVICIO / 100)
        db.add(ERPLineaFacturaCliente(factura_id=fac.id, descripcion=l.descripcion[:500], cantidad=l.cantidad,
                                      precio_unitario=l.valor_unitario, descuento_pct=0, subtotal=base,
                                      total_impuesto=imp, total=base + imp))
    asiento = [erp_motor.Linea("cartera", debito=total, tercero_id=t.id),
               erp_motor.Linea("ingreso", credito=subtotal, tercero_id=t.id)]
    if iva:
        asiento.append(erp_motor.Linea("iva_generado", credito=iva, tercero_id=t.id))
    try:
        await erp_motor.asentar(db, empresa_id=emp.id, evento="VENTA_FACTURA", tipo=TipoComprobante.DIARIO, fecha=h,
                                concepto=f"Factura {numero} - {dep.nombre} (reencauche {liq.codigo})", lineas=asiento,
                                usuario=flujo.nombre_usuario(usuario), documento_tipo="factura_cliente",
                                documento_id=fac.id, documento_numero=numero)
    except erp_motor.ErrorContable as e:
        raise HTTPException(422, f"No se pudo contabilizar la factura: {e.detail if hasattr(e, 'detail') else e}")
    return fac


# ── Garantías ─────────────────────────────────────────────────────────────────

FALLAS = ("DESPRENDIMIENTO", "SEPARACION", "DESGASTE_IRREGULAR", "FALLA_PREMATURA", "DANO_CARCASA")


async def crear_reclamo(db: AsyncSession, codigo: str, falla: str, km: Optional[float], condiciones: Optional[str],
                        fecha: Optional[date] = None) -> RTMReclamo:
    c = (await db.execute(select(RTMCarcasa).where(RTMCarcasa.codigo == (codigo or "").strip().upper()))).scalar()
    entregada = None
    if c is not None:
        entregada = (await db.execute(
            select(RTMEntregaCarcasa.orden_id).join(RTMEntrega, RTMEntrega.id == RTMEntregaCarcasa.entrega_id)
            .where(RTMEntregaCarcasa.carcasa_id == c.id, RTMEntregaCarcasa.tipo == "TERMINADA",
                   RTMEntrega.estado == "ENTREGADA").order_by(RTMEntrega.id.desc()).limit(1))).scalar()
    if entregada is None:
        raise HTTPException(409, f"La llanta {codigo} no tiene entrega registrada: no se puede reclamar garantía.")
    falla = falla.upper()
    if falla not in FALLAS:
        raise HTTPException(422, "Falla no reconocida.")
    r = RTMReclamo(codigo=await flujo.consecutivo(db, RTMReclamo, "GR"), carcasa_id=c.id, orden_id=entregada,
                   falla=falla, km=km, condiciones=condiciones, estado="RECIBIDO", fecha=fecha or hoy())
    db.add(r)
    await db.flush()
    return r


async def avanzar_reclamo(db: AsyncSession, r: RTMReclamo, usuario: Usuario, estado: str, dictamen: Optional[str] = None,
                          causa: Optional[str] = None, compensacion: Optional[str] = None,
                          compensacion_valor: Optional[float] = None) -> RTMReclamo:
    estado = estado.upper()
    orden_estados = ["RECIBIDO", "EN_ANALISIS", "DICTAMINADO", "CERRADO"]
    if estado not in orden_estados or orden_estados.index(estado) != orden_estados.index(r.estado) + 1:
        raise HTTPException(409, f"Un reclamo {r.estado.lower().replace('_', ' ')} no pasa a {estado.lower().replace('_', ' ')}.")
    if estado == "DICTAMINADO":
        await flujo.exigir_rol(db, usuario, "TECNICO", "dictaminar una garantía")
        if (dictamen or "").upper() not in ("PROCEDE", "NO_PROCEDE", "PARCIAL"):
            raise HTTPException(422, "El dictamen es procede, no procede o procede parcial.")
        if not causa:
            raise HTTPException(422, "El dictamen exige la causa probable.")
        r.dictamen, r.causa, r.dictaminado_por_id, r.dictaminado_en = dictamen.upper(), causa, usuario.id, flujo.ahora()
        if r.dictamen != "NO_PROCEDE":
            r.compensacion, r.compensacion_valor = compensacion, compensacion_valor
    r.estado = estado
    await db.flush()
    return r


# ── CMMS de la misma empresa ──────────────────────────────────────────────────

async def depositante_flota(db: AsyncSession) -> int:
    cfg = await obtener_config(db)
    if cfg.depositante_flota_id:
        return cfg.depositante_flota_id
    d = (await db.execute(select(WMSDepositante).where(WMSDepositante.codigo == "RTM-FLOTA"))).scalar()
    if d is None:
        d = WMSDepositante(codigo="RTM-FLOTA", nombre="Flota propia (Gestión de Activos)", propio=False, activo=True,
                           notas="Llantas de la flota de la empresa enviadas a su propia planta de reencauche.")
        db.add(d)
        await db.flush()
    cfg.depositante_flota_id = d.id
    return d.id


async def recibir_lote_cmms(db: AsyncSession, usuario: Usuario, lote_id: int) -> RTMRecepcion:
    from app.infrastructure.models.eam import EAMNeumatico, EAMReencaucheDetalle, EAMReencaucheLote

    lote = await db.get(EAMReencaucheLote, lote_id)
    if lote is None:
        raise HTTPException(404, "El lote de Gestión de Activos no existe.")
    if (await db.execute(select(RTMRecepcion.id).where(RTMRecepcion.eam_lote_id == lote.id))).first():
        raise HTTPException(409, f"El lote {lote.codigo} ya se recibió en la planta.")
    dets = (await db.execute(select(EAMReencaucheDetalle, EAMNeumatico).join(
        EAMNeumatico, EAMNeumatico.id == EAMReencaucheDetalle.neumatico_id).where(
        EAMReencaucheDetalle.lote_id == lote.id, EAMReencaucheDetalle.resultado == "PENDIENTE"))).all()
    if not dets:
        raise HTTPException(409, "El lote no tiene llantas pendientes.")
    rec = await crear_recepcion(db, usuario, await depositante_flota(db), remision=lote.remision or lote.codigo,
                                cantidad_declarada=len(dets), eam_lote_id=lote.id,
                                observaciones=f"Lote de reencauche {lote.codigo} de Gestión de Activos")
    for det, neu in dets:
        previa = (await db.execute(select(RTMCarcasa).where(
            (RTMCarcasa.eam_neumatico_id == neu.id) | (RTMCarcasa.codigo == neu.codigo)))).scalars().first()
        if previa is not None and previa.eam_neumatico_id in (None, neu.id) and previa.estado in ("ENTREGADA", "VENDIDA"):
            previa.eam_neumatico_id = neu.id
            await registrar_carcasa(db, rec, usuario, {"carcasa_id": previa.id})
        else:
            codigo = neu.codigo if previa is None else f"CM-{neu.codigo}"
            await registrar_carcasa(db, rec, usuario, {
                "codigo": codigo, "marca": neu.marca or "N/D", "medida": neu.medida or "N/D",
                "modelo": neu.referencia or "N/D", "reencauches": neu.reencauches or 0,
                "profundidad_mm": neu.profundidad_actual, "eam_neumatico_id": neu.id})
    await cerrar_recepcion(db, rec, usuario)
    return rec


async def resultado_a_cmms(db: AsyncSession, c: RTMCarcasa, ec: RTMEntregaCarcasa) -> None:
    """Al entregar una llanta de un lote de Gestión de Activos, el detalle del lote queda con
    su resultado por el mismo camino de la pantalla de Gestión de Activos."""
    if not c.eam_neumatico_id:
        return
    orden = await db.get(RTMOrden, ec.orden_id)
    rec = await db.get(RTMRecepcion, orden.recepcion_id)
    if not rec or not rec.eam_lote_id:
        return
    from app.api.v1.endpoints.eam import ReencaucheDetalleUpdate, aplicar_resultado_reencauche
    from app.infrastructure.models.eam import EAMReencaucheDetalle

    det = (await db.execute(select(EAMReencaucheDetalle).where(
        EAMReencaucheDetalle.lote_id == rec.eam_lote_id, EAMReencaucheDetalle.neumatico_id == c.eam_neumatico_id))).scalar()
    if det is None or det.resultado != "PENDIENTE":
        return
    if ec.tipo == "TERMINADA":
        final = (await db.execute(select(RTMPaso.mediciones).join(RTMEtapa, RTMEtapa.id == RTMPaso.etapa_id).where(
            RTMPaso.orden_id == orden.id, RTMEtapa.codigo == "INSP_FINAL", RTMPaso.estado == "CERRADO")
            .order_by(RTMPaso.id.desc()).limit(1))).scalar()
        prof = next((m["valor"] for m in (final or []) if m.get("clave") == "profundidad_final"), None)
        banda = await db.get(WMSProducto, orden.banda_producto_id) if orden.banda_producto_id else None
        det.banda = (banda.nombre if banda else None)
        await aplicar_resultado_reencauche(db, det, ReencaucheDetalleUpdate(
            resultado="REENCAUCHADA", profundidad_nueva=prof, costo=float(orden.precio or 0) or None))
    else:
        await aplicar_resultado_reencauche(db, det, ReencaucheDetalleUpdate(resultado="RECHAZO"))


# ── Venta en el punto de venta ────────────────────────────────────────────────

async def producto_por_serie(db: AsyncSession, codigo: str, ubicaciones: List[int]) -> Optional[WMSProducto]:
    """El producto de una reencauchada de la planta lista para vender, por su
    código, si está en una zona que el POS puede vender."""
    c = (await db.execute(select(RTMCarcasa).where(RTMCarcasa.codigo == codigo.upper(),
                                                   RTMCarcasa.estado == "TERMINADA"))).scalar()
    if c is None or c.depositante_id != await depositante_propio(db) or c.wms_ubicacion_id not in (ubicaciones or []):
        return None
    return await db.get(WMSProducto, c.wms_producto_id)


async def vender_serie_en_pos(db: AsyncSession, producto_id: int, codigo: str, cantidad, ubicaciones: List[int],
                              usuario_id: int, referencia: str):
    from app.core import wms_inventario as inv

    if Decimal(str(cantidad)) != 1:
        raise HTTPException(422, "Una llanta con código se vende de a una.")
    c = (await db.execute(select(RTMCarcasa).where(RTMCarcasa.codigo == codigo.strip().upper())
                          .with_for_update())).scalar()
    if c is None or c.wms_producto_id != producto_id:
        raise HTTPException(422, f"La llanta {codigo} no corresponde a ese producto.")
    if c.estado != "TERMINADA" or c.depositante_id != await depositante_propio(db):
        raise HTTPException(409, f"La llanta {c.codigo} no está disponible para la venta.")
    if c.wms_ubicacion_id not in ubicaciones:
        raise HTTPException(409, f"La llanta {c.codigo} no está en una zona que esta caja pueda vender.")
    ubic = c.wms_ubicacion_id
    await inv.mover(db, tipo="DESPACHO", producto_id=producto_id, cantidad=1, origen=ubic, referencia=referencia,
                    usuario_id=usuario_id, notas=f"Venta POS de la reencauchada {c.codigo}", documento_tipo="POS_VENTA",
                    serie_id=c.wms_serie_id)
    c.estado, c.wms_ubicacion_id = "VENDIDA", None
    return inv.Asignacion(ubicacion_id=ubic, lote_id=None, cantidad=Decimal(1))
