"""
La terminal de planta: donde el operario mueve la orden estación por estación.

QUÉ RESUELVE
Una orden liberada no pasa de «en ejecución» a «cerrada» de un salto. La recorre
la línea: entra material, la toca una máquina, luego otra, se inspecciona y sale
producto. Sin registrar ese recorrido, el sistema solo sabe el total producido y
no sabe responder la única pregunta que hace quien está esperando la orden:
**dónde va**.

Este módulo expone lo que necesita una pantalla puesta en el piso de la planta,
al lado de la máquina:

  * las estaciones de la línea, en el orden en que el material las recorre;
  * cuánto puede tomar cada estación ahora mismo;
  * el registro del avance, firmado por el operario que lo hizo.

LA REGLA QUE LO SOSTIENE
**Una estación no puede producir más de lo que le entregó la anterior.** Es la
restricción que hace que el recorrido signifique algo: sin ella, la suma de los
avances puede superar lo que entró a la línea y el tablero mostraría un
cumplimiento imposible. Se valida al registrar y no al consultar, porque un dato
imposible no debe llegar a guardarse.

La primera estación —la entrada de material— está limitada por lo planificado en
la orden. Las demás, por lo que produjo la estación de la que reciben.

CÓMO SE IDENTIFICA EL OPERARIO
Con su código de operario, que es lo que lleva en el carné y lo que sabe de
memoria. No es una segunda contraseña: la sesión de la empresa ya está abierta en
la terminal, y esto solo dice **quién** está reportando, que es lo que la
trazabilidad necesita. Pedirle al operario de planta una contraseña larga en un
teclado con guantes es la forma más segura de que tres operarios compartan la
misma sesión y el registro deje de servir para nada.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.infrastructure.models.mes import (
    EstadoEjecucionMESEnum, EstadoOrdenProduccionEnum, MESAvanceEstacion,
    MESEquipo, MESFlujoConexion, MESFlujoNodo, MESLinea, MESOperacion,
    MESOperario, MESOrdenProduccion, MESProducto, TipoNodoFlujoEnum,
    TurnoMESEnum,
)

router = APIRouter(prefix="/mes/planta", tags=["mes-planta"])


def _valor(x: Any) -> Any:
    return x.value if hasattr(x, "value") else x


def _ahora() -> datetime:
    return datetime.now(timezone.utc)


# ─── Ordenar las estaciones como las recorre el material ──────────────────────

def ordenar_estaciones(nodos: List[MESFlujoNodo],
                       conexiones: List[MESFlujoConexion]) -> List[MESFlujoNodo]:
    """Pone las estaciones en el orden en que el material las atraviesa.

    Es un orden topológico: primero lo que no depende de nada —las entradas de
    material—, después lo que solo depende de eso, y así. No se usa la posición
    en el lienzo porque el dibujo puede estar acomodado de cualquier forma y una
    línea que se devuelve para reproceso quedaría al revés.

    Los ciclos —que existen: un reproceso devuelve material a una etapa
    anterior— romperían un orden topológico estricto, así que lo que queda sin
    resolver se agrega al final por su posición horizontal. Es una salida
    deliberada: mejor mostrar todas las estaciones en un orden aproximado que
    esconder las que participan en un ciclo.
    """
    # Los retrabajos y el scrap no marcan el avance del material hacia adelante.
    hacia_adelante = [c for c in conexiones
                      if _valor(c.tipo) in ("NORMAL", "ALTERNA")]
    entrantes: Dict[int, set] = {n.id: set() for n in nodos}
    for c in hacia_adelante:
        if c.destino_id in entrantes and c.origen_id in entrantes:
            entrantes[c.destino_id].add(c.origen_id)

    por_id = {n.id: n for n in nodos}
    listos = sorted([n for n in nodos if not entrantes[n.id]],
                    key=lambda n: (n.pos_x, n.pos_y))
    orden: List[MESFlujoNodo] = []
    vistos: set = set()

    while listos:
        actual = listos.pop(0)
        if actual.id in vistos:
            continue
        vistos.add(actual.id)
        orden.append(actual)
        siguientes = sorted(
            [por_id[c.destino_id] for c in hacia_adelante
             if c.origen_id == actual.id and c.destino_id in por_id],
            key=lambda n: (n.pos_x, n.pos_y))
        for s in siguientes:
            if s.id in vistos:
                continue
            entrantes[s.id].discard(actual.id)
            if not entrantes[s.id]:
                listos.append(s)

    faltantes = sorted([n for n in nodos if n.id not in vistos],
                       key=lambda n: (n.pos_x, n.pos_y))
    return orden + faltantes


def predecesores(nodo_id: int, conexiones: List[MESFlujoConexion]) -> List[int]:
    return [c.origen_id for c in conexiones
            if c.destino_id == nodo_id and _valor(c.tipo) in ("NORMAL", "ALTERNA")]


# ─── Esquemas ─────────────────────────────────────────────────────────────────

class Identificacion(BaseModel):
    codigo: str = Field(..., description="El código del operario, el de su carné")


class RegistroAvance(BaseModel):
    orden_id: int
    nodo_id: int
    operario_id: int
    cantidad_producida: float = Field(0, ge=0)
    cantidad_scrap: float = Field(0, ge=0)
    turno: str = "MANANA"
    observaciones: Optional[str] = None
    # Cerrar la estación dice «por acá ya no pasa más de esta orden». Se pide
    # explícito y no se deduce de haber alcanzado la cantidad, porque una orden
    # puede cerrarse corta a propósito.
    cerrar: bool = False


# ─── Quién reporta ────────────────────────────────────────────────────────────

@router.post("/identificar")
async def identificar(
    datos: Identificacion,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Dice qué operario está frente a la terminal."""
    codigo = datos.codigo.strip()
    operario = (await db.execute(
        select(MESOperario).where(
            func.upper(MESOperario.codigo) == codigo.upper())
    )).scalar_one_or_none()
    if operario is None:
        raise HTTPException(404, f"No hay ningún operario con el código «{codigo}».")
    if not operario.activo:
        raise HTTPException(
            403, f"{operario.nombre} está inactivo y no puede reportar producción.")
    return {
        "id": operario.id, "codigo": operario.codigo, "nombre": operario.nombre,
        "cargo": operario.cargo, "planta_id": operario.planta_id,
    }


# ─── El tablero de la línea ───────────────────────────────────────────────────

@router.get("/tablero")
async def tablero(
    linea_id: int,
    orden_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Las estaciones de una línea y el avance de una orden en cada una.

    Devuelve, por estación, cuánto lleva producido y **cuánto puede tomar
    todavía**. Ese último número es el que evita que el operario tenga que
    calcular de cabeza si le alcanza el material, y es el mismo que valida el
    servidor al registrar: si la pantalla ofrece un tope distinto al que el
    servidor aplica, el operario recibe un rechazo que no entiende.
    """
    linea = await db.get(MESLinea, linea_id)
    if linea is None:
        raise HTTPException(404, "La línea no existe.")

    nodos = list((await db.execute(
        select(MESFlujoNodo).where(MESFlujoNodo.linea_id == linea_id,
                                   MESFlujoNodo.activo.is_(True)))).scalars().all())
    conexiones = list((await db.execute(
        select(MESFlujoConexion).where(
            MESFlujoConexion.linea_id == linea_id))).scalars().all())

    if not nodos:
        return {
            "linea": {"id": linea.id, "codigo": linea.codigo, "nombre": linea.nombre},
            "orden": None, "estaciones": [],
            "aviso": "Esta línea todavía no tiene esquema. Dibújelo en "
                     "«Plantas & Líneas» para poder reportar por estación.",
        }

    ordenadas = ordenar_estaciones(nodos, conexiones)

    orden = None
    avances: Dict[int, MESAvanceEstacion] = {}
    if orden_id:
        orden = await db.get(MESOrdenProduccion, orden_id)
        if orden is None:
            raise HTTPException(404, "La orden no existe.")
        avances = {a.nodo_id: a for a in (await db.execute(
            select(MESAvanceEstacion).where(
                MESAvanceEstacion.orden_id == orden_id))).scalars().all()}

    # Nombres para mostrar: la máquina, el producto o la operación del nodo.
    equipos = {e.id: e.nombre for e in (await db.execute(
        select(MESEquipo))).scalars().all()}
    productos = {p.id: p.nombre for p in (await db.execute(
        select(MESProducto))).scalars().all()}
    operaciones = {o.id: o.nombre for o in (await db.execute(
        select(MESOperacion))).scalars().all()}

    producido_por_nodo = {nid: (a.cantidad_producida or 0.0)
                          for nid, a in avances.items()}
    plan = float(orden.cantidad_planificada) if orden else 0.0

    estaciones = []
    for posicion, nodo in enumerate(ordenadas, start=1):
        previos = predecesores(nodo.id, conexiones)
        # Lo que esta estación puede tomar: lo que le entregaron los anteriores
        # —o lo planificado, si es la primera— menos lo que ya procesó.
        if previos:
            entrante = sum(producido_por_nodo.get(p, 0.0) for p in previos)
        else:
            entrante = plan
        avance = avances.get(nodo.id)
        procesado = ((avance.cantidad_producida or 0.0)
                     + (avance.cantidad_scrap or 0.0)) if avance else 0.0
        disponible = max(0.0, round(entrante - procesado, 4))

        estaciones.append({
            "posicion": posicion,
            "nodo_id": nodo.id,
            "tipo": _valor(nodo.tipo),
            "nombre": (nodo.nombre
                       or equipos.get(nodo.equipo_id)
                       or productos.get(nodo.producto_id)
                       or operaciones.get(nodo.operacion_id)
                       or f"Estación {posicion}"),
            "operacion": operaciones.get(nodo.operacion_id),
            "equipo": equipos.get(nodo.equipo_id),
            "es_cuello_botella": bool(nodo.es_cuello_botella),
            "tiempo_ciclo_seg": nodo.tiempo_ciclo_seg,
            "cantidad_entrante": round(entrante, 4),
            "cantidad_producida": round(avance.cantidad_producida, 4) if avance else 0.0,
            "cantidad_scrap": round(avance.cantidad_scrap, 4) if avance else 0.0,
            "cantidad_disponible": disponible,
            "estado": _valor(avance.estado) if avance else "PENDIENTE",
            "operario_id": avance.operario_id if avance else None,
            "fecha_inicio": avance.fecha_inicio if avance else None,
            "fecha_fin": avance.fecha_fin if avance else None,
            "observaciones": avance.observaciones if avance else None,
            # Se puede reportar si hay algo que procesar y la estación no está
            # cerrada. La pantalla usa esto para habilitar el botón, y el
            # servidor aplica la misma regla al guardar.
            "puede_reportar": bool(
                orden
                and _valor(orden.estado) in ("LIBERADA", "EN_EJECUCION")
                and disponible > 0
                and (not avance or _valor(avance.estado) != "COMPLETADA")),
        })

    return {
        "linea": {"id": linea.id, "codigo": linea.codigo, "nombre": linea.nombre},
        "orden": None if not orden else {
            "id": orden.id, "numero": orden.numero,
            "estado": _valor(orden.estado),
            "cantidad_planificada": orden.cantidad_planificada,
            "cantidad_producida": orden.cantidad_producida,
            "cantidad_scrap": orden.cantidad_scrap,
            "unidad_medida": orden.unidad_medida,
        },
        "estaciones": estaciones,
    }


@router.get("/ordenes")
async def ordenes_en_piso(
    linea_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Las órdenes que se pueden trabajar ahora: liberadas o en ejecución.

    Una orden planeada todavía no baja a la planta, y una cerrada ya no se toca.
    Mostrarlas todas obligaría al operario a buscar la suya entre cientos.
    """
    q = select(MESOrdenProduccion).where(
        MESOrdenProduccion.estado.in_([EstadoOrdenProduccionEnum.LIBERADA,
                                       EstadoOrdenProduccionEnum.EN_EJECUCION]))
    if linea_id:
        q = q.where(MESOrdenProduccion.linea_id == linea_id)
    ordenes = (await db.execute(
        q.order_by(MESOrdenProduccion.id.desc()).limit(100))).scalars().all()
    productos = {p.id: p for p in (await db.execute(
        select(MESProducto))).scalars().all()}
    return [{
        "id": o.id, "numero": o.numero, "estado": _valor(o.estado),
        "linea_id": o.linea_id,
        "producto": (f"{productos[o.producto_id].codigo} — "
                     f"{productos[o.producto_id].nombre}")
                    if o.producto_id in productos else None,
        "cantidad_planificada": o.cantidad_planificada,
        "cantidad_producida": o.cantidad_producida,
        "unidad_medida": o.unidad_medida,
    } for o in ordenes]


# ─── Registrar el avance ──────────────────────────────────────────────────────

@router.post("/avance")
async def registrar_avance(
    datos: RegistroAvance,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Suma lo que esta estación hizo con esta orden.

    Suma, no reemplaza: el operario reporta varias veces durante el turno y cada
    reporte se agrega al acumulado de la estación. Reemplazar obligaría a que
    escriba el total corregido cada vez, que es donde se equivoca.
    """
    if datos.cantidad_producida <= 0 and datos.cantidad_scrap <= 0 and not datos.cerrar:
        raise HTTPException(400, "No hay nada que registrar: indique cuánto "
                                 "produjo, cuánto se perdió, o cierre la estación.")

    orden = await db.get(MESOrdenProduccion, datos.orden_id)
    if orden is None:
        raise HTTPException(404, "La orden no existe.")
    if _valor(orden.estado) not in ("LIBERADA", "EN_EJECUCION"):
        raise HTTPException(
            409, f"La orden {orden.numero} está {_valor(orden.estado).lower()} "
                 f"y no admite reportes de producción.")

    nodo = await db.get(MESFlujoNodo, datos.nodo_id)
    if nodo is None:
        raise HTTPException(404, "La estación no existe.")
    if orden.linea_id and nodo.linea_id != orden.linea_id:
        raise HTTPException(
            409, "Esa estación no pertenece a la línea de la orden.")

    operario = await db.get(MESOperario, datos.operario_id)
    if operario is None or not operario.activo:
        raise HTTPException(403, "El operario no existe o está inactivo.")

    conexiones = list((await db.execute(
        select(MESFlujoConexion).where(
            MESFlujoConexion.linea_id == nodo.linea_id))).scalars().all())
    previos = predecesores(nodo.id, conexiones)

    avances = {a.nodo_id: a for a in (await db.execute(
        select(MESAvanceEstacion).where(
            MESAvanceEstacion.orden_id == orden.id))).scalars().all()}

    if previos:
        entrante = sum((avances[p].cantidad_producida or 0.0)
                       for p in previos if p in avances)
    else:
        entrante = float(orden.cantidad_planificada)

    avance = avances.get(nodo.id)
    procesado = ((avance.cantidad_producida or 0.0)
                 + (avance.cantidad_scrap or 0.0)) if avance else 0.0
    disponible = round(entrante - procesado, 4)
    pedido = datos.cantidad_producida + datos.cantidad_scrap

    if pedido > disponible + 1e-6:
        # El mensaje dice el número, no solo que no se puede: el operario tiene
        # que poder corregir sin llamar a nadie.
        origen = ("lo planificado en la orden" if not previos
                  else "lo que entregó la estación anterior")
        raise HTTPException(
            409,
            f"No se puede registrar {pedido:g}: en esta estación solo hay "
            f"{disponible:g} disponible según {origen}.")

    if avance is None:
        avance = MESAvanceEstacion(
            orden_id=orden.id, nodo_id=nodo.id, operario_id=operario.id,
            turno=TurnoMESEnum(datos.turno) if datos.turno in
                  TurnoMESEnum.__members__ else TurnoMESEnum.MANANA,
            estado=EstadoEjecucionMESEnum.EN_PROGRESO,
            cantidad_producida=0.0, cantidad_scrap=0.0,
            fecha_inicio=_ahora())
        db.add(avance)
        await db.flush()

    avance.cantidad_producida = round(
        (avance.cantidad_producida or 0.0) + datos.cantidad_producida, 4)
    avance.cantidad_scrap = round(
        (avance.cantidad_scrap or 0.0) + datos.cantidad_scrap, 4)
    avance.operario_id = operario.id
    if datos.observaciones:
        avance.observaciones = datos.observaciones
    if datos.cerrar:
        avance.estado = EstadoEjecucionMESEnum.COMPLETADA
        avance.fecha_fin = _ahora()
    else:
        avance.estado = EstadoEjecucionMESEnum.EN_PROGRESO

    # La orden avanza cuando avanza su ÚLTIMA estación, no con cada reporte.
    # Sumando todos los avances, una pieza que pasa por cinco máquinas contaría
    # cinco veces y el cumplimiento saldría al 500%.
    await db.flush()
    nodos = list((await db.execute(
        select(MESFlujoNodo).where(MESFlujoNodo.linea_id == nodo.linea_id,
                                   MESFlujoNodo.activo.is_(True)))).scalars().all())
    ordenadas = ordenar_estaciones(nodos, conexiones)
    ultimo = ordenadas[-1] if ordenadas else None

    frescos = {a.nodo_id: a for a in (await db.execute(
        select(MESAvanceEstacion).where(
            MESAvanceEstacion.orden_id == orden.id))).scalars().all()}
    if ultimo and ultimo.id in frescos:
        orden.cantidad_producida = frescos[ultimo.id].cantidad_producida or 0.0
    # El scrap sí es la suma de todas las estaciones: cada pérdida ocurre una
    # sola vez y en un solo lugar.
    orden.cantidad_scrap = round(
        sum((a.cantidad_scrap or 0.0) for a in frescos.values()), 4)

    if _valor(orden.estado) == "LIBERADA":
        orden.estado = EstadoOrdenProduccionEnum.EN_EJECUCION
        if not orden.fecha_inicio_real:
            orden.fecha_inicio_real = _ahora()

    await db.commit()
    await db.refresh(avance)

    return {
        "avance": {
            "id": avance.id, "nodo_id": avance.nodo_id,
            "cantidad_producida": avance.cantidad_producida,
            "cantidad_scrap": avance.cantidad_scrap,
            "estado": _valor(avance.estado),
        },
        "orden": {
            "id": orden.id, "numero": orden.numero,
            "estado": _valor(orden.estado),
            "cantidad_producida": orden.cantidad_producida,
            "cantidad_scrap": orden.cantidad_scrap,
        },
        "mensaje": (f"{operario.nombre} registró {datos.cantidad_producida:g} "
                    f"en {nodo.nombre or 'la estación'}."),
    }


@router.get("/recorrido/{orden_id}")
async def recorrido(
    orden_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Por dónde ha pasado una orden, en orden y con quién la trabajó.

    Es lo que consume la trazabilidad: la lista de estaciones que tocaron la
    orden, con la cantidad, el operario y la hora. Sin esto, el expediente del
    lote dice cuánto se produjo pero no dónde ni quién.
    """
    orden = await db.get(MESOrdenProduccion, orden_id)
    if orden is None:
        raise HTTPException(404, "La orden no existe.")
    if not orden.linea_id:
        return {"orden_id": orden_id, "estaciones": []}

    nodos = list((await db.execute(
        select(MESFlujoNodo).where(
            MESFlujoNodo.linea_id == orden.linea_id))).scalars().all())
    conexiones = list((await db.execute(
        select(MESFlujoConexion).where(
            MESFlujoConexion.linea_id == orden.linea_id))).scalars().all())
    avances = {a.nodo_id: a for a in (await db.execute(
        select(MESAvanceEstacion).where(
            MESAvanceEstacion.orden_id == orden_id))).scalars().all()}
    operarios = {o.id: o.nombre for o in (await db.execute(
        select(MESOperario))).scalars().all()}
    equipos = {e.id: e.nombre for e in (await db.execute(
        select(MESEquipo))).scalars().all()}

    salida = []
    for posicion, nodo in enumerate(ordenar_estaciones(nodos, conexiones), start=1):
        a = avances.get(nodo.id)
        if a is None:
            continue
        salida.append({
            "posicion": posicion, "nodo_id": nodo.id,
            "estacion": nodo.nombre or equipos.get(nodo.equipo_id)
                        or f"Estación {posicion}",
            "tipo": _valor(nodo.tipo),
            "operario": operarios.get(a.operario_id),
            "turno": _valor(a.turno),
            "cantidad_producida": a.cantidad_producida,
            "cantidad_scrap": a.cantidad_scrap,
            "estado": _valor(a.estado),
            "fecha_inicio": a.fecha_inicio, "fecha_fin": a.fecha_fin,
            "observaciones": a.observaciones,
        })
    return {"orden_id": orden_id, "estaciones": salida}
