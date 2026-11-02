"""
La única puerta para cambiar una orden de reencauche.

Toda escritura sobre una orden pasa por aquí —desde la terminal, la pantalla,
una importación o el generador de datos— y por eso las reglas se cumplen igual
en todos lados, como en `wms_inventario.mover`:

- una carcasa no tiene dos órdenes abiertas;
- solo se registra la etapa en que está la carcasa, y si la anterior era punto
  de decisión, tuvo que quedar aprobada;
- una condicional espera dictamen técnico, una retenida espera liberación y una
  rechazada solo admite disposición;
- una medida fuera de tolerancia no deja cerrar la etapa sin una decisión;
- un daño fuera de límite no se repara sin autorización técnica;
- los insumos salen del WMS por lote desde la ubicación de la estación;
- los pasos cerrados no se editan: corregir es otro paso que anula al anterior.

Las funciones no hacen commit: quien llama confirma la transacción entera, así
que un fallo a mitad de camino no deja la llanta movida en el WMS sin su paso.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import reencauche_reglas as reglas, reencauche_wms as rwms
from app.core.reencauche_semilla import config as obtener_config
from app.infrastructure.models.reencauche import (
    RTMCarcasa, RTMCiclo, RTMCicloCarcasa, RTMConsumo, RTMDefecto, RTMDictamen, RTMEquipo, RTMEspecificacion,
    RTMEtapa, RTMInsumo, RTMLimiteReparacion, RTMMotivoRechazo, RTMOrden, RTMPaso, RTMPasoDefecto,
    RTMPasoMotivo, RTMPasoPrueba, RTMPlantaConfig, RTMReceta, RTMRecepcion, RTMReparacion, RTMRetencion,
    RTMRolUsuario, RTMRuta, RTMRutaEtapa, RTMTarifa,
)
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.wms import WMSLote, WMSProducto

CENT = Decimal("0.01")
ROLES = ("TECNICO", "CALIDAD", "SUPERVISOR")


def ahora() -> datetime:
    return datetime.now(timezone.utc)


def _r2(v) -> Decimal:
    return Decimal(str(v or 0)).quantize(CENT, ROUND_HALF_UP)


def nombre_usuario(u: Usuario) -> str:
    return getattr(u, "username", None) or str(getattr(u, "id", "?"))


# ── Roles ─────────────────────────────────────────────────────────────────────

async def tiene_rol(db: AsyncSession, usuario: Usuario, rol: str) -> bool:
    if str(getattr(usuario.rol, "value", usuario.rol)) == "ADMINISTRADOR":
        return True
    return (await db.execute(select(RTMRolUsuario.id).where(
        RTMRolUsuario.usuario_id == usuario.id, RTMRolUsuario.rol == rol))).first() is not None


async def exigir_rol(db: AsyncSession, usuario: Usuario, rol: str, accion: str) -> None:
    if not await tiene_rol(db, usuario, rol):
        nombre = {"TECNICO": "técnico", "CALIDAD": "de calidad", "SUPERVISOR": "supervisor"}[rol]
        raise HTTPException(403, f"Solo un usuario con rol {nombre} de la planta puede {accion}.")


# ── Consecutivos ──────────────────────────────────────────────────────────────

async def consecutivo(db: AsyncSession, modelo, prefijo: str, ancho: int = 5) -> str:
    n = ((await db.execute(select(func.count()).select_from(modelo))).scalar() or 0) + 1
    while True:
        codigo = f"{prefijo}-{n:0{ancho}d}"
        if (await db.execute(select(modelo.id).where(modelo.codigo == codigo))).first() is None:
            return codigo
        n += 1


async def codigo_carcasa(db: AsyncSession) -> str:
    """El siguiente consecutivo, con la configuración bloqueada: dos recepciones
    a la vez no pueden tomar el mismo número."""
    cfg = (await db.execute(select(RTMPlantaConfig).order_by(RTMPlantaConfig.id).limit(1)
                            .with_for_update())).scalar()
    if cfg is None:
        cfg = await obtener_config(db)
    while True:
        cfg.consecutivo = (cfg.consecutivo or 0) + 1
        codigo = f"{cfg.prefijo_codigo or 'RT-'}{cfg.consecutivo:06d}"
        if (await db.execute(select(RTMCarcasa.id).where(RTMCarcasa.codigo == codigo))).first() is None:
            return codigo


# ── Ruta ──────────────────────────────────────────────────────────────────────

async def etapas_de_ruta(db: AsyncSession, ruta_id: int) -> List[Tuple[RTMRutaEtapa, RTMEtapa]]:
    return list((await db.execute(
        select(RTMRutaEtapa, RTMEtapa).join(RTMEtapa, RTMEtapa.id == RTMRutaEtapa.etapa_id)
        .where(RTMRutaEtapa.ruta_id == ruta_id).order_by(RTMRutaEtapa.secuencia))).all())


async def ruta_por_defecto(db: AsyncSession, ruta_id: Optional[int] = None) -> RTMRuta:
    if ruta_id:
        ruta = await db.get(RTMRuta, ruta_id)
        if ruta is None or not ruta.activo:
            raise HTTPException(409, "La ruta elegida no existe o está inactiva: las órdenes nuevas usan rutas activas.")
        return ruta
    ruta = (await db.execute(select(RTMRuta).where(RTMRuta.activo.is_(True))
                             .order_by(RTMRuta.por_defecto.desc(), RTMRuta.id).limit(1))).scalar()
    if ruta is None:
        raise HTTPException(409, "No hay ninguna ruta de producción activa.")
    return ruta


async def etapa_actual(db: AsyncSession, orden: RTMOrden) -> Optional[RTMEtapa]:
    return await db.get(RTMEtapa, orden.etapa_actual_id) if orden.etapa_actual_id else None


async def _ruta_etapa_actual(db: AsyncSession, orden: RTMOrden) -> Optional[RTMRutaEtapa]:
    return (await db.execute(select(RTMRutaEtapa).where(
        RTMRutaEtapa.ruta_id == orden.ruta_id, RTMRutaEtapa.secuencia == orden.secuencia_actual))).scalar()


# ── Apertura ──────────────────────────────────────────────────────────────────

async def abrir_orden(db: AsyncSession, carcasa: RTMCarcasa, recepcion: RTMRecepcion, usuario: Usuario,
                      banda_producto_id: Optional[int] = None, prioridad: int = 3,
                      ruta_id: Optional[int] = None) -> RTMOrden:
    """La visita de la carcasa. La recepción queda registrada como su primer
    paso y la carcasa espera en la cola de la etapa siguiente."""
    if (await db.execute(select(RTMOrden.id).where(RTMOrden.carcasa_id == carcasa.id,
                                                   RTMOrden.estado == "ABIERTA"))).first():
        raise HTTPException(409, f"La carcasa {carcasa.codigo} ya tiene una orden abierta.")
    ruta = await ruta_por_defecto(db, ruta_id)
    pasos = await etapas_de_ruta(db, ruta.id)
    if not pasos:
        raise HTTPException(409, f"La ruta {ruta.nombre} no tiene etapas.")
    if banda_producto_id:
        await _validar_insumo(db, banda_producto_id, "BANDA")
    momento = ahora()
    n = ((await db.execute(select(func.count()).select_from(RTMOrden).where(
        RTMOrden.carcasa_id == carcasa.id))).scalar() or 0) + 1
    orden = RTMOrden(codigo=f"{carcasa.codigo}-V{n}", carcasa_id=carcasa.id, recepcion_id=recepcion.id,
                     ruta_id=ruta.id, banda_producto_id=banda_producto_id, prioridad=prioridad,
                     numero_reencauche=(carcasa.reencauches or 0) + 1, estado="ABIERTA", recibida_en=momento,
                     costo_insumos=0, primera_pasada=True)
    db.add(orden)
    await db.flush()
    primero, etapa = pasos[0]
    if etapa.tipo == "RECEPCION":
        db.add(RTMPaso(orden_id=orden.id, etapa_id=etapa.id, operario_id=usuario.id, inicio=momento, fin=momento,
                       espera_s=0, estado="CERRADO", decision="APROBADA"))
        orden.secuencia_actual = primero.secuencia
        await _avanzar(db, orden, usuario)
    else:
        orden.etapa_actual_id, orden.secuencia_actual, orden.desde_espera = etapa.id, primero.secuencia, momento
    return orden


async def _validar_insumo(db: AsyncSession, producto_id: int, clase: Optional[str] = None) -> RTMInsumo:
    ins = (await db.execute(select(RTMInsumo).where(RTMInsumo.producto_id == producto_id,
                                                    RTMInsumo.activo.is_(True)))).scalar()
    if ins is None:
        raise HTTPException(422, "El producto no está registrado como insumo de la planta.")
    if clase and ins.clase != clase:
        raise HTTPException(422, f"El producto es {ins.clase.lower()}, no {clase.lower()}.")
    return ins


# ── Avance ────────────────────────────────────────────────────────────────────

async def _avanzar(db: AsyncSession, orden: RTMOrden, usuario: Usuario) -> None:
    """A la etapa siguiente de la ruta; si no hay más, la orden termina."""
    siguiente = (await db.execute(
        select(RTMRutaEtapa, RTMEtapa).join(RTMEtapa, RTMEtapa.id == RTMRutaEtapa.etapa_id)
        .where(RTMRutaEtapa.ruta_id == orden.ruta_id, RTMRutaEtapa.secuencia > (orden.secuencia_actual or 0))
        .order_by(RTMRutaEtapa.secuencia).limit(1))).first()
    orden.en_proceso = False
    orden.decision_pendiente = None
    if siguiente is None:
        await _terminar_orden(db, orden, usuario)
        return
    re_, etapa = siguiente
    orden.etapa_actual_id, orden.secuencia_actual, orden.desde_espera = etapa.id, re_.secuencia, ahora()


async def _terminar_orden(db: AsyncSession, orden: RTMOrden, usuario: Usuario) -> None:
    cfg = await obtener_config(db)
    carcasa = await db.get(RTMCarcasa, orden.carcasa_id)
    banda = await db.get(WMSProducto, orden.banda_producto_id) if orden.banda_producto_id else None
    await rwms.transformar(db, cfg, carcasa, banda, Decimal(str(orden.costo_insumos or 0)), orden.id, usuario.id)
    orden.estado, orden.terminada_en = "TERMINADA", ahora()
    orden.etapa_actual_id = None
    carcasa.estado = "TERMINADA"
    carcasa.reencauches = (carcasa.reencauches or 0) + 1


# ── Iniciar una etapa ─────────────────────────────────────────────────────────

async def validar_para_registrar(db: AsyncSession, orden: Optional[RTMOrden], carcasa: RTMCarcasa) -> RTMOrden:
    """Por qué una carcasa no puede registrar una etapa ahora mismo."""
    if orden is None:
        ultima = (await db.execute(select(RTMOrden).where(RTMOrden.carcasa_id == carcasa.id)
                                   .order_by(RTMOrden.id.desc()).limit(1))).scalar()
        if ultima is not None and ultima.estado == "RECHAZADA":
            raise HTTPException(409, f"La carcasa {carcasa.codigo} fue rechazada en esta visita: solo admite disposición.")
        if ultima is not None and ultima.estado == "TERMINADA":
            raise HTTPException(409, f"La carcasa {carcasa.codigo} ya terminó su reencauche.")
        raise HTTPException(409, f"La carcasa {carcasa.codigo} no tiene una orden abierta: debe pasar por recepción.")
    if orden.retenida:
        raise HTTPException(409, f"La carcasa {carcasa.codigo} está retenida: espera la liberación de calidad.")
    if orden.decision_pendiente == "CONDICIONAL":
        raise HTTPException(409, f"La carcasa {carcasa.codigo} es condicional: espera dictamen técnico.")
    return orden


async def orden_abierta(db: AsyncSession, carcasa_id: int, bloquear: bool = True) -> Optional[RTMOrden]:
    q = select(RTMOrden).where(RTMOrden.carcasa_id == carcasa_id, RTMOrden.estado == "ABIERTA")
    if bloquear:
        q = q.with_for_update()
    return (await db.execute(q)).scalar()


async def iniciar(db: AsyncSession, carcasa: RTMCarcasa, equipo: RTMEquipo, usuario: Usuario) -> RTMPaso:
    orden = await validar_para_registrar(db, await orden_abierta(db, carcasa.id), carcasa)
    etapa = await etapa_actual(db, orden)
    if equipo.estado != "ACTIVO":
        raise HTTPException(409, f"El equipo {equipo.nombre} está {equipo.estado.lower()}.")
    if not equipo.ubicacion_id:
        raise HTTPException(409, f"El equipo {equipo.nombre} no tiene ubicación del WMS: asígnela en Configuración.")
    if etapa.tipos_equipo and equipo.tipo not in etapa.tipos_equipo:
        raise HTTPException(409, f"La carcasa {carcasa.codigo} está en «{etapa.nombre}», que no se hace en "
                                 f"{equipo.nombre}.")
    if etapa.tipo == "VULCANIZACION":
        raise HTTPException(409, "La vulcanización se registra por ciclo de autoclave, no carcasa por carcasa.")
    if orden.en_proceso:
        raise HTTPException(409, f"La carcasa {carcasa.codigo} ya está en proceso en «{etapa.nombre}».")
    momento = ahora()
    espera = int((momento - orden.desde_espera).total_seconds()) if orden.desde_espera else None
    paso = RTMPaso(orden_id=orden.id, etapa_id=etapa.id, equipo_id=equipo.id, operario_id=usuario.id, inicio=momento,
                   espera_s=espera, estado="ABIERTO")
    db.add(paso)
    orden.en_proceso = True
    await db.flush()
    return paso


async def omitir(db: AsyncSession, carcasa: RTMCarcasa, usuario: Usuario, motivo: Optional[str]) -> RTMPaso:
    """Saltar una etapa opcional, dejando quién lo decidió."""
    orden = await validar_para_registrar(db, await orden_abierta(db, carcasa.id), carcasa)
    re_ = await _ruta_etapa_actual(db, orden)
    etapa = await etapa_actual(db, orden)
    if re_ is None or re_.obligatoria:
        raise HTTPException(409, f"«{etapa.nombre}» es obligatoria en la ruta: no se puede omitir.")
    if orden.en_proceso:
        raise HTTPException(409, "La etapa ya empezó: termínela en vez de omitirla.")
    momento = ahora()
    paso = RTMPaso(orden_id=orden.id, etapa_id=etapa.id, operario_id=usuario.id, inicio=momento, fin=momento,
                   estado="OMITIDO", omitida=True, observaciones=motivo or "Etapa opcional omitida")
    db.add(paso)
    await _avanzar(db, orden, usuario)
    await db.flush()
    return paso


# ── Terminar una etapa ────────────────────────────────────────────────────────

async def especificacion(db: AsyncSession, medida: str, banda_producto_id: Optional[int]) -> Optional[RTMEspecificacion]:
    filas = (await db.execute(select(RTMEspecificacion).where(
        RTMEspecificacion.medida == medida, RTMEspecificacion.activo.is_(True)))).scalars().all()
    exacta = [e for e in filas if banda_producto_id and e.banda_producto_id == banda_producto_id]
    general = [e for e in filas if e.banda_producto_id is None]
    return (exacta or general or [None])[0]


async def _registrar_consumos(db: AsyncSession, orden: RTMOrden, paso: RTMPaso, etapa: RTMEtapa, equipo: RTMEquipo,
                              consumos: List[Dict], usuario: Usuario) -> List:
    if consumos and not etapa.insumos:
        raise HTTPException(422, f"«{etapa.nombre}» no consume insumos.")
    movs = []
    for c in consumos:
        ins = await _validar_insumo(db, int(c["producto_id"]))
        if ins.clase not in etapa.insumos:
            raise HTTPException(422, f"«{etapa.nombre}» no consume {ins.clase.lower()}.")
        if ins.clase == "BANDA":
            if orden.banda_producto_id and orden.banda_producto_id != ins.producto_id:
                pedida = await db.get(WMSProducto, orden.banda_producto_id)
                raise HTTPException(422, f"La orden pide la banda {pedida.nombre}.")
            orden.banda_producto_id = ins.producto_id
        lote_id = c.get("lote_id")
        if not lote_id and c.get("numero_lote"):
            lote_id = (await db.execute(select(WMSLote.id).where(
                WMSLote.producto_id == ins.producto_id, WMSLote.numero_lote == str(c["numero_lote"]).strip()))).scalar()
            if lote_id is None:
                raise HTTPException(404, f"El lote {c['numero_lote']} no existe para ese insumo.")
        cantidad = float(c["cantidad"])
        if cantidad <= 0:
            raise HTTPException(422, "La cantidad consumida debe ser mayor que cero.")
        mov = await rwms.consumir(db, ins.producto_id, lote_id, cantidad, equipo.ubicacion_id, orden.id,
                                  f"{orden.codigo} · {etapa.codigo}", usuario.id)
        await db.flush()
        cu = Decimal(str(mov.costo_unitario or 0))
        costo = _r2(cu * Decimal(str(cantidad)))
        db.add(RTMConsumo(paso_id=paso.id, orden_id=orden.id, producto_id=ins.producto_id, lote_id=lote_id,
                          cantidad=cantidad, costo_unitario=cu, costo=costo, wms_movimiento_id=mov.id))
        orden.costo_insumos = _r2(Decimal(str(orden.costo_insumos or 0)) + costo)
        movs.append(mov)
    return movs


async def _registrar_reparaciones(db: AsyncSession, paso: RTMPaso, etapa: RTMEtapa, reparaciones: List[Dict],
                                  usuario: Usuario, autorizar: bool) -> None:
    if reparaciones and not etapa.reparaciones:
        raise HTTPException(422, f"En «{etapa.nombre}» no se registran reparaciones.")
    limites = {(l.ubicacion, l.tipo_dano): l.tamano_max_mm
               for l in (await db.execute(select(RTMLimiteReparacion))).scalars()}
    for r in reparaciones:
        ubic, tipo = str(r["ubicacion"]).upper(), str(r["tipo_dano"]).upper()
        tamano = float(r["tamano_mm"])
        limite = limites.get((ubic, tipo))
        fuera = reglas.excede_limite(tamano, limite)
        autorizado = None
        if fuera:
            if not autorizar or not await tiene_rol(db, usuario, "TECNICO"):
                raise HTTPException(422, f"El daño de {tamano:g} mm en {ubic.lower()} excede el límite de {limite:g} mm: "
                                         "requiere la autorización de un usuario con rol técnico, o rechace la carcasa.")
            autorizado = usuario.id
        db.add(RTMReparacion(paso_id=paso.id, tipo_dano=tipo, ubicacion=ubic, tamano_mm=tamano,
                             profundidad_mm=r.get("profundidad_mm"), tipo_reparacion=str(r["tipo_reparacion"]).upper(),
                             material=r.get("material"), fuera_limite=fuera, autorizado_por_id=autorizado))


async def _congelar_precio(db: AsyncSession, orden: RTMOrden, carcasa: RTMCarcasa) -> None:
    """El precio se fija al aprobar la inspección final: un cambio posterior de
    tarifa no lo toca."""
    if orden.precio is not None:
        return
    tarifas = (await db.execute(select(RTMTarifa).where(
        RTMTarifa.activo.is_(True),
        (RTMTarifa.depositante_id == carcasa.depositante_id) | RTMTarifa.depositante_id.is_(None)))).scalars().all()

    def mejor(cands):
        cands = sorted(cands, key=lambda t: (t.depositante_id is None, t.banda_producto_id is None, -t.id))
        return cands[0] if cands else None

    base = mejor([t for t in tarifas if t.tipo == "REENCAUCHE" and (t.medida in (None, carcasa.medida))
                  and (t.banda_producto_id in (None, orden.banda_producto_id))])
    reparaciones = (await db.execute(
        select(RTMReparacion.tipo_reparacion, func.count()).join(RTMPaso, RTMPaso.id == RTMReparacion.paso_id)
        .where(RTMPaso.orden_id == orden.id).group_by(RTMReparacion.tipo_reparacion))).all()
    detalle = []
    for tipo, n in reparaciones:
        t = mejor([x for x in tarifas if x.tipo == "REPARACION" and (x.tipo_reparacion or "").upper() == tipo])
        detalle.append({"tipo_reparacion": tipo, "cantidad": n, "valor": float(t.valor) if t else 0.0})
    orden.precio = _r2(base.valor) if base else Decimal(0)
    orden.precio_detalle = {"reencauche": float(orden.precio), "tarifa_id": base.id if base else None,
                            "especial": bool(base and base.depositante_id), "reparaciones": detalle}


async def terminar(db: AsyncSession, paso: RTMPaso, usuario: Usuario, *, mediciones: Optional[Dict] = None,
                   decision: Optional[str] = None, accion_fuera: Optional[str] = None,
                   defectos: Optional[List[Dict]] = None, motivos: Optional[List[int]] = None,
                   reparaciones: Optional[List[Dict]] = None, consumos: Optional[List[Dict]] = None,
                   pruebas: Optional[List[Dict]] = None, autorizar_reparacion: bool = False,
                   observaciones: Optional[str] = None) -> Dict:
    if paso.estado != "ABIERTO":
        raise HTTPException(409, "Ese paso ya está cerrado: los pasos cerrados no se editan.")
    orden = (await db.execute(select(RTMOrden).where(RTMOrden.id == paso.orden_id).with_for_update())).scalar_one()
    if orden.estado != "ABIERTA" or orden.etapa_actual_id != paso.etapa_id:
        raise HTTPException(409, "La orden ya no está en esa etapa.")
    etapa = await db.get(RTMEtapa, paso.etapa_id)
    equipo = await db.get(RTMEquipo, paso.equipo_id) if paso.equipo_id else None
    carcasa = await db.get(RTMCarcasa, orden.carcasa_id)
    motivos = [int(m) for m in (motivos or [])]
    decision = (decision or "").upper() or None
    accion_fuera = (accion_fuera or "").upper() or None

    spec = await especificacion(db, carcasa.medida, orden.banda_producto_id)
    try:
        meds, fuera = reglas.evaluar_mediciones(etapa.mediciones or [], mediciones or {}, spec.limites if spec else None)
    except ValueError as e:
        raise HTTPException(422, str(e))
    vacio_falla = any(m["clave"] == "vacio_conforme" and m["conforme"] is False for m in meds)
    fuera_num = any(m["conforme"] is False and m["clave"] != "vacio_conforme" for m in meds)

    # Qué pasa con la orden.
    if etapa.decision:
        permitidas = reglas.DECISIONES_FINAL if etapa.decision_final else reglas.DECISIONES
        if decision not in permitidas:
            raise HTTPException(422, f"«{etapa.nombre}» termina con una decisión: {', '.join(p.lower() for p in permitidas)}.")
        if fuera_num and decision == "APROBADA":
            raise HTTPException(422, "Hay mediciones fuera de tolerancia: no se puede aprobar. Elija condicional, "
                                     "corrección o rechazo.")
        resultado = decision
    elif fuera_num:
        if accion_fuera not in reglas.ACCIONES_FUERA:
            raise HTTPException(422, "Hay mediciones fuera de tolerancia: elija repetir, enviar a evaluación o rechazar "
                                     "antes de cerrar la etapa.")
        resultado = {"REPETIR": "REPETIR", "EVALUACION": "EVALUACION", "RECHAZAR": "RECHAZADA"}[accion_fuera]
    elif vacio_falla:
        resultado = "NO_CONFORME"
    else:
        resultado = decision if decision in ("RECHAZADA",) else None
    if resultado == "RECHAZADA" and not motivos:
        raise HTTPException(422, "Un rechazo necesita al menos un motivo del catálogo.")
    if motivos:
        validos = {i for (i,) in (await db.execute(select(RTMMotivoRechazo.id).where(
            RTMMotivoRechazo.id.in_(motivos)))).all()}
        if validos != set(motivos):
            raise HTTPException(422, "Algún motivo de rechazo no existe.")

    # El registro del paso.
    paso.mediciones, paso.fuera_tolerancia = meds or None, bool(fuera)
    paso.decision, paso.observaciones, paso.fin, paso.estado = resultado or "APROBADA", observaciones, ahora(), "CERRADO"
    for d in defectos or []:
        if not await db.get(RTMDefecto, int(d["defecto_id"])):
            raise HTTPException(422, "Algún defecto no existe en el catálogo.")
        db.add(RTMPasoDefecto(paso_id=paso.id, defecto_id=int(d["defecto_id"]), ubicacion=d.get("ubicacion"),
                              tamano_mm=d.get("tamano_mm")))
    for m in motivos:
        db.add(RTMPasoMotivo(paso_id=paso.id, motivo_id=m))
    for p in pruebas or []:
        db.add(RTMPasoPrueba(paso_id=paso.id, prueba=str(p["prueba"]).upper(), equipo_id=p.get("equipo_id"),
                             resultado=str(p["resultado"]), conforme=p.get("conforme")))
    await _registrar_reparaciones(db, paso, etapa, reparaciones or [], usuario, autorizar_reparacion)
    movs = await _registrar_consumos(db, orden, paso, etapa, equipo, consumos or [], usuario) if consumos else []
    if movs and not await rwms.es_propia(db, carcasa.depositante_id):
        await rwms.asentar_consumos_cliente(db, movs, orden.codigo, orden.id, nombre_usuario(usuario))

    orden.en_proceso = False
    if resultado == "RECHAZADA":
        await rechazar(db, orden, usuario, etapa.id)
    elif resultado in ("CONDICIONAL", "EVALUACION"):
        orden.decision_pendiente = "CONDICIONAL"
    elif resultado in ("REPETIR", "NO_CONFORME"):
        orden.primera_pasada = False
        orden.desde_espera = ahora()
    elif resultado == "RETENIDA":
        await retener(db, orden, usuario, "Retenida en la inspección final" + (f": {observaciones}" if observaciones else ""),
                      "INSPECCION_FINAL")
        orden.desde_espera = ahora()
    else:
        if etapa.codigo == "INSP_INICIAL":
            cfg = await obtener_config(db)
            await rwms.trasladar(db, carcasa, cfg.ubic_produccion_id, usuario.id, orden.codigo)
        if resultado == "CORRECCION":
            orden.primera_pasada = False
        if etapa.decision_final:
            await _congelar_precio(db, orden, carcasa)
        await _avanzar(db, orden, usuario)
    await db.flush()
    return {"paso_id": paso.id, "resultado": paso.decision, "mediciones": meds, "orden_estado": orden.estado,
            "etapa_actual_id": orden.etapa_actual_id, "decision_pendiente": orden.decision_pendiente}


# ── Rechazo, retención y dictamen ─────────────────────────────────────────────

async def rechazar(db: AsyncSession, orden: RTMOrden, usuario: Usuario, etapa_id: Optional[int]) -> None:
    """Definitivo: la carcasa sale del flujo y solo puede pasar a disposición."""
    cfg = await obtener_config(db)
    carcasa = await db.get(RTMCarcasa, orden.carcasa_id)
    orden.estado, orden.etapa_rechazo_id = "RECHAZADA", etapa_id or orden.etapa_actual_id
    orden.etapa_actual_id, orden.en_proceso, orden.decision_pendiente = None, False, None
    orden.terminada_en = ahora()
    carcasa.estado = "RECHAZADA"
    for r in (await db.execute(select(RTMRetencion).where(RTMRetencion.orden_id == orden.id,
                                                          RTMRetencion.estado == "ABIERTA"))).scalars():
        r.estado, r.cerrada_por_id, r.cerrada_en = "RECHAZADA", usuario.id, ahora()
    orden.retenida = False
    if cfg.ubic_rechazos_id:
        await rwms.trasladar(db, carcasa, cfg.ubic_rechazos_id, usuario.id, orden.codigo)


async def retener(db: AsyncSession, orden: RTMOrden, usuario: Optional[Usuario], motivo: str, origen: str = "MANUAL",
                  ciclo_id: Optional[int] = None) -> RTMRetencion:
    if orden.estado != "ABIERTA":
        raise HTTPException(409, "Solo se retiene una carcasa que sigue en proceso.")
    r = RTMRetencion(orden_id=orden.id, origen=origen, ciclo_id=ciclo_id, motivo=motivo[:300],
                     retenida_por_id=usuario.id if usuario else None, estado="ABIERTA")
    db.add(r)
    orden.retenida, orden.primera_pasada = True, False
    await db.flush()
    return r


async def liberar(db: AsyncSession, retencion: RTMRetencion, usuario: Usuario, justificacion: str) -> None:
    await exigir_rol(db, usuario, "CALIDAD", "liberar una retención")
    if retencion.estado != "ABIERTA":
        raise HTTPException(409, "La retención ya está cerrada.")
    if not justificacion or len(justificacion.strip()) < 5:
        raise HTTPException(422, "Liberar una retención exige una justificación.")
    retencion.estado, retencion.cerrada_por_id, retencion.cerrada_en = "LIBERADA", usuario.id, ahora()
    retencion.justificacion = justificacion.strip()
    orden = await db.get(RTMOrden, retencion.orden_id)
    await db.flush()
    abiertas = (await db.execute(select(func.count()).select_from(RTMRetencion).where(
        RTMRetencion.orden_id == orden.id, RTMRetencion.estado == "ABIERTA"))).scalar()
    if not abiertas:
        orden.retenida = False
        orden.desde_espera = ahora()


async def rechazar_retenida(db: AsyncSession, retencion: RTMRetencion, usuario: Usuario, justificacion: str,
                            motivos: List[int]) -> None:
    await exigir_rol(db, usuario, "CALIDAD", "rechazar una carcasa retenida")
    if retencion.estado != "ABIERTA":
        raise HTTPException(409, "La retención ya está cerrada.")
    if not motivos:
        raise HTTPException(422, "Un rechazo necesita al menos un motivo del catálogo.")
    orden = await db.get(RTMOrden, retencion.orden_id)
    retencion.justificacion = justificacion
    paso = RTMPaso(orden_id=orden.id, etapa_id=orden.etapa_actual_id, operario_id=usuario.id, inicio=ahora(),
                   fin=ahora(), estado="CERRADO", decision="RECHAZADA",
                   observaciones=f"Rechazada al cerrar la retención: {justificacion}")
    db.add(paso)
    await db.flush()
    for m in motivos:
        db.add(RTMPasoMotivo(paso_id=paso.id, motivo_id=int(m)))
    await rechazar(db, orden, usuario, orden.etapa_actual_id)


async def dictaminar(db: AsyncSession, orden: RTMOrden, usuario: Usuario, resultado: str, justificacion: str,
                     motivos: Optional[List[int]] = None) -> RTMDictamen:
    await exigir_rol(db, usuario, "TECNICO", "dictaminar una carcasa condicional")
    if orden.estado != "ABIERTA" or orden.decision_pendiente != "CONDICIONAL":
        raise HTTPException(409, "La carcasa no está esperando dictamen.")
    resultado = resultado.upper()
    if resultado not in ("APROBAR", "RECHAZAR"):
        raise HTTPException(422, "El dictamen es aprobar o rechazar.")
    if not justificacion or len(justificacion.strip()) < 5:
        raise HTTPException(422, "El dictamen exige una justificación.")
    paso = (await db.execute(select(RTMPaso).where(RTMPaso.orden_id == orden.id, RTMPaso.etapa_id == orden.etapa_actual_id,
                                                   RTMPaso.estado == "CERRADO")
                             .order_by(RTMPaso.id.desc()).limit(1))).scalar()
    d = RTMDictamen(orden_id=orden.id, paso_id=paso.id if paso else None, resultado=resultado,
                    justificacion=justificacion.strip(), tecnico_id=usuario.id)
    db.add(d)
    await db.flush()
    if resultado == "RECHAZAR":
        if not motivos:
            raise HTTPException(422, "Un rechazo necesita al menos un motivo del catálogo.")
        if paso:
            for m in motivos:
                db.add(RTMPasoMotivo(paso_id=paso.id, motivo_id=int(m)))
        await rechazar(db, orden, usuario, orden.etapa_actual_id)
    else:
        etapa = await etapa_actual(db, orden)
        carcasa = await db.get(RTMCarcasa, orden.carcasa_id)
        if etapa.codigo == "INSP_INICIAL":
            cfg = await obtener_config(db)
            await rwms.trasladar(db, carcasa, cfg.ubic_produccion_id, usuario.id, orden.codigo)
        if etapa.decision_final:
            await _congelar_precio(db, orden, carcasa)
        await _avanzar(db, orden, usuario)
    await db.flush()
    return d


async def corregir(db: AsyncSession, paso: RTMPaso, usuario: Usuario, mediciones: Dict, motivo: str) -> RTMPaso:
    """Un paso cerrado no se edita: se registra otro que lo anula, y la hoja de
    vida muestra los dos con sus autores."""
    await exigir_rol(db, usuario, "SUPERVISOR", "corregir un paso cerrado")
    if paso.estado != "CERRADO":
        raise HTTPException(409, "Solo se corrige un paso cerrado.")
    if (await db.execute(select(RTMPaso.id).where(RTMPaso.anula_id == paso.id))).first():
        raise HTTPException(409, "Ese paso ya fue corregido: corrija la corrección.")
    if not motivo or len(motivo.strip()) < 5:
        raise HTTPException(422, "Una corrección exige el motivo.")
    orden = await db.get(RTMOrden, paso.orden_id)
    etapa = await db.get(RTMEtapa, paso.etapa_id)
    carcasa = await db.get(RTMCarcasa, orden.carcasa_id)
    spec = await especificacion(db, carcasa.medida, orden.banda_producto_id)
    previas = {m["clave"]: m["valor"] for m in (paso.mediciones or [])}
    try:
        meds, fuera = reglas.evaluar_mediciones(etapa.mediciones or [], {**previas, **(mediciones or {})},
                                                spec.limites if spec else None)
    except ValueError as e:
        raise HTTPException(422, str(e))
    nuevo = RTMPaso(orden_id=paso.orden_id, etapa_id=paso.etapa_id, equipo_id=paso.equipo_id, operario_id=usuario.id,
                    inicio=paso.inicio, fin=paso.fin, mediciones=meds, fuera_tolerancia=fuera, decision=paso.decision,
                    estado="CERRADO", ciclo_id=paso.ciclo_id, anula_id=paso.id, motivo_correccion=motivo.strip(),
                    observaciones=paso.observaciones)
    db.add(nuevo)
    await db.flush()
    return nuevo


# ── Vulcanización ─────────────────────────────────────────────────────────────

async def receta_para(db: AsyncSession, orden: RTMOrden, equipo: RTMEquipo) -> Optional[RTMReceta]:
    cojin = (await db.execute(
        select(RTMConsumo.producto_id).join(RTMInsumo, RTMInsumo.producto_id == RTMConsumo.producto_id)
        .where(RTMConsumo.orden_id == orden.id, RTMInsumo.clase == "COJIN").order_by(RTMConsumo.id.desc())
        .limit(1))).scalar()
    cands = (await db.execute(select(RTMReceta).where(RTMReceta.equipo_id == equipo.id,
                                                      RTMReceta.estado == "APROBADA"))).scalars().all()
    cands = [r for r in cands if r.banda_producto_id in (None, orden.banda_producto_id)
             and r.cojin_producto_id in (None, cojin)]
    cands.sort(key=lambda r: (r.banda_producto_id is None, r.cojin_producto_id is None, -r.version))
    return cands[0] if cands else None


async def encamisado_conforme(db: AsyncSession, orden: RTMOrden) -> bool:
    env = (await db.execute(select(RTMEtapa.id).where(RTMEtapa.codigo == "ENVELOPADO"))).scalar()
    paso = (await db.execute(select(RTMPaso).where(
        RTMPaso.orden_id == orden.id, RTMPaso.etapa_id == env, RTMPaso.estado == "CERRADO")
        .order_by(RTMPaso.id.desc()).limit(1))).scalar()
    if paso is None:
        return False
    return any(m.get("clave") == "vacio_conforme" and m.get("conforme") for m in (paso.mediciones or []))


async def crear_ciclo(db: AsyncSession, equipo: RTMEquipo, usuario: Usuario) -> RTMCiclo:
    if equipo.tipo != "AUTOCLAVE":
        raise HTTPException(422, "Los ciclos de vulcanización son de autoclaves.")
    if equipo.estado != "ACTIVO":
        raise HTTPException(409, f"El autoclave {equipo.nombre} está {equipo.estado.lower()}.")
    abierto = (await db.execute(select(RTMCiclo).where(RTMCiclo.equipo_id == equipo.id,
                                                       RTMCiclo.estado.in_(("ARMANDO", "EN_CURSO"))))).scalar()
    if abierto:
        raise HTTPException(409, f"El autoclave ya tiene el ciclo {abierto.codigo} {abierto.estado.lower().replace('_', ' ')}.")
    n = ((await db.execute(select(func.count()).select_from(RTMCiclo).where(RTMCiclo.equipo_id == equipo.id))).scalar() or 0) + 1
    while True:
        codigo = f"{equipo.codigo}-{n:04d}"
        if (await db.execute(select(RTMCiclo.id).where(RTMCiclo.codigo == codigo))).first() is None:
            break
        n += 1
    c = RTMCiclo(codigo=codigo, equipo_id=equipo.id, operario_id=usuario.id, estado="ARMANDO")
    db.add(c)
    await db.flush()
    return c


async def cargar(db: AsyncSession, ciclo: RTMCiclo, carcasa: RTMCarcasa, usuario: Usuario) -> Dict:
    if ciclo.estado != "ARMANDO":
        raise HTTPException(409, "El ciclo ya no admite carga.")
    orden = await validar_para_registrar(db, await orden_abierta(db, carcasa.id), carcasa)
    etapa = await etapa_actual(db, orden)
    if etapa.tipo != "VULCANIZACION":
        if etapa.codigo == "ENVELOPADO":
            raise HTTPException(409, f"La carcasa {carcasa.codigo} sigue en encamisado: falta una prueba de vacío conforme.")
        raise HTTPException(409, f"La carcasa {carcasa.codigo} está en «{etapa.nombre}», no en vulcanización.")
    if not await encamisado_conforme(db, orden):
        raise HTTPException(409, f"La carcasa {carcasa.codigo} no tiene el encamisado con prueba de vacío conforme.")
    otro = (await db.execute(select(RTMCiclo.codigo).join(RTMCicloCarcasa, RTMCicloCarcasa.ciclo_id == RTMCiclo.id).where(
        RTMCicloCarcasa.orden_id == orden.id, RTMCiclo.estado.in_(("ARMANDO", "EN_CURSO"))))).scalar()
    if otro:
        raise HTTPException(409, f"La carcasa ya está cargada en el ciclo {otro}.")
    equipo = await db.get(RTMEquipo, ciclo.equipo_id)
    receta = await receta_para(db, orden, equipo)
    if receta is None:
        banda = await db.get(WMSProducto, orden.banda_producto_id) if orden.banda_producto_id else None
        raise HTTPException(409, f"Falta una receta validada para la banda {banda.nombre if banda else '(sin banda)'} "
                                 f"en el autoclave {equipo.nombre}.")
    if ciclo.receta_id and ciclo.receta_id != receta.id:
        actual = await db.get(RTMReceta, ciclo.receta_id)
        raise HTTPException(409, f"El ciclo ya está armado con la receta {actual.codigo} v{actual.version}; "
                                 f"esta carcasa lleva la {receta.codigo} v{receta.version}.")
    cargadas = (await db.execute(select(func.count()).select_from(RTMCicloCarcasa).where(
        RTMCicloCarcasa.ciclo_id == ciclo.id))).scalar() or 0
    if cargadas >= (equipo.capacidad or 1):
        raise HTTPException(409, f"El autoclave tiene capacidad para {equipo.capacidad} llantas y ya está lleno.")
    ciclo.receta_id = receta.id
    db.add(RTMCicloCarcasa(ciclo_id=ciclo.id, orden_id=orden.id))
    await db.flush()
    return {"ciclo": ciclo.codigo, "cargadas": cargadas + 1, "capacidad": equipo.capacidad, "receta": receta.codigo}


async def iniciar_ciclo(db: AsyncSession, ciclo: RTMCiclo, usuario: Usuario) -> None:
    if ciclo.estado != "ARMANDO":
        raise HTTPException(409, "El ciclo no está armándose.")
    filas = (await db.execute(select(RTMCicloCarcasa).where(RTMCicloCarcasa.ciclo_id == ciclo.id))).scalars().all()
    if not filas:
        raise HTTPException(409, "El ciclo no tiene carcasas cargadas.")
    receta = await db.get(RTMReceta, ciclo.receta_id)
    momento = ahora()
    ciclo.estado, ciclo.inicio, ciclo.operario_id = "EN_CURSO", momento, usuario.id
    ciclo.fin_estimado = momento + timedelta(minutes=float(receta.tiempo_min))
    for f in filas:
        orden = await db.get(RTMOrden, f.orden_id)
        espera = int((momento - orden.desde_espera).total_seconds()) if orden.desde_espera else None
        db.add(RTMPaso(orden_id=orden.id, etapa_id=orden.etapa_actual_id, equipo_id=ciclo.equipo_id,
                       operario_id=usuario.id, inicio=momento, espera_s=espera, estado="ABIERTO", ciclo_id=ciclo.id))
        orden.en_proceso = True
    await db.flush()


async def cerrar_ciclo(db: AsyncSession, ciclo: RTMCiclo, usuario: Usuario, reales: Dict,
                       origen: str = "MANUAL") -> Dict:
    if ciclo.estado != "EN_CURSO":
        raise HTTPException(409, "El ciclo no está en curso.")
    receta = await db.get(RTMReceta, ciclo.receta_id)
    reales = dict(reales)
    if reales.get("tiempo") is None and reales.get("fin"):
        fin = reales["fin"] if isinstance(reales["fin"], datetime) else datetime.fromisoformat(str(reales["fin"]))
        reales["tiempo"] = (fin - ciclo.inicio).total_seconds() / 60
    try:
        detalle, conforme, desviadas = reglas.comparar_variables(
            {k: getattr(receta, k) for k in ("temperatura_c", "temperatura_tol", "presion_bar", "presion_tol",
                                             "vacio_bar", "vacio_tol", "tiempo_min", "tiempo_tol")}, reales)
    except ValueError as e:
        raise HTTPException(422, str(e))
    momento = ahora()
    ciclo.variables, ciclo.conforme, ciclo.origen_variables = detalle, conforme, origen
    ciclo.fin, ciclo.estado = momento, "CERRADO"
    pasos = (await db.execute(select(RTMPaso).where(RTMPaso.ciclo_id == ciclo.id,
                                                    RTMPaso.estado == "ABIERTO"))).scalars().all()
    motivo = f"Ciclo {ciclo.codigo} con desviación de {', '.join(desviadas)}" if desviadas else None
    for p in pasos:
        p.fin, p.estado, p.decision = momento, "CERRADO", "APROBADA" if conforme else "RETENIDA"
        p.mediciones = [{"clave": k, "nombre": k, "valor": v["real"], "min": v["objetivo"] - v["tolerancia"],
                         "max": v["objetivo"] + v["tolerancia"], "conforme": v["conforme"]} for k, v in detalle.items()]
        p.fuera_tolerancia = not conforme
        orden = await db.get(RTMOrden, p.orden_id)
        await _avanzar(db, orden, usuario)
        if motivo:
            await retener(db, orden, None, motivo, "CICLO", ciclo.id)
    await db.flush()
    return {"conforme": conforme, "desviadas": desviadas, "variables": detalle, "carcasas": len(pasos)}
