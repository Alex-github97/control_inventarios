"""
La flota con la última inspección de cada llanta montada, lista para calcular
novedades y sugerencias (`core/neumaticos_novedades`) y para el informe PDF.

Una consulta para las llantas (con la última inspección y la última rotación
por LATERAL, una búsqueda por índice por llanta) y otra para los vehículos. Con
la empresa de prueba son 3.000 vehículos y 28 mil llantas montadas.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Sequence

from sqlalchemy import select, true
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.consultas import en_lista
from app.core.neumaticos_filtros import FiltrosLlanta, condiciones
from app.core.neumaticos_novedades import LlantaInsp, Umbrales, reglas_iniciales
from app.infrastructure.models.eam import (
    EAMActivo, EAMInspeccionNeumatico, EAMMovimientoNeumatico, EAMNeumatico, EAMNeumaticoConfig,
    EAMReglaSugerenciaCondicion, EAMReglaSugerenciaNeumatico,
)

TIPO_VEHICULO = {"VEHICULO": "Vehículo", "REMOLQUE": "Remolque", "MOTOCICLETA": "Motocicleta",
                 "MONTACARGAS": "Montacargas", "EQUIPO_PATIO": "Equipo de patio",
                 "EQUIPO_LOGISTICO": "Equipo logístico"}


@dataclass
class PosicionFlota:
    codigo: str
    label: str
    eje: int
    lado: str
    numero: Optional[int]
    llanta: Optional[LlantaInsp] = None


@dataclass
class VehiculoFlota:
    activo_id: int
    codigo: str
    placa: Optional[str]
    nombre: str
    tipo: str
    marca: Optional[str]
    linea: Optional[str]
    posiciones: List[PosicionFlota] = field(default_factory=list)

    @property
    def llantas(self) -> List[LlantaInsp]:
        return [p.llanta for p in self.posiciones if p.llanta is not None]

    @property
    def ultima_inspeccion(self) -> Optional[datetime]:
        return max((ll.fecha for ll in self.llantas if ll.fecha), default=None)


async def umbrales(db: AsyncSession) -> Umbrales:
    cfg = await db.get(EAMNeumaticoConfig, 1)
    if cfg is None:
        return Umbrales()
    return Umbrales(
        profundidad_minima=cfg.profundidad_minima or 3.0,
        margen_alerta=cfg.margen_alerta_profundidad if cfg.margen_alerta_profundidad is not None else 2.0,
        presion_min=cfg.presion_min or 90.0, presion_max=cfg.presion_max or 120.0,
        umbral_desalineacion=cfg.umbral_desalineacion or 2.0,
        diferencia_hombros=cfg.diferencia_hombros if cfg.diferencia_hombros is not None else 3.0)


async def reglas(db: AsyncSession, solo_activas: bool = False) -> List[EAMReglaSugerenciaNeumatico]:
    """Las reglas de sugerencia de la empresa. La primera vez siembra las
    iniciales; la marca en la configuración evita que vuelvan si la empresa las
    borra. La fila de configuración se bloquea para que dos procesos que llegan a
    la vez no siembren dos veces."""
    cfg = (await db.execute(select(EAMNeumaticoConfig).where(EAMNeumaticoConfig.id == 1)
                            .with_for_update())).scalar_one_or_none()
    if cfg is None:
        cfg = EAMNeumaticoConfig(id=1)
        db.add(cfg)
        await db.flush()
    if not cfg.reglas_sembradas:
        for r in reglas_iniciales(await umbrales(db)):
            db.add(EAMReglaSugerenciaNeumatico(
                nombre=r["nombre"], tipo=r["tipo"], prioridad=r["prioridad"], texto=r["texto"], activa=True,
                condiciones=[EAMReglaSugerenciaCondicion(campo=c, operador=o, valor=v) for c, o, v in r["condiciones"]]))
        cfg.reglas_sembradas = True
        await db.commit()
    q = select(EAMReglaSugerenciaNeumatico).order_by(EAMReglaSugerenciaNeumatico.prioridad,
                                                     EAMReglaSugerenciaNeumatico.nombre)
    if solo_activas:
        q = q.where(EAMReglaSugerenciaNeumatico.activa.is_(True))
    return list((await db.execute(q)).scalars().all())


def _ultima_inspeccion(desde, hasta):
    I = EAMInspeccionNeumatico
    q = select(I).where(I.neumatico_id == EAMNeumatico.id)
    if desde is not None:
        q = q.where(I.fecha >= desde)
    if hasta is not None:
        q = q.where(I.fecha <= hasta)
    return aliased(I, q.order_by(I.fecha.desc(), I.id.desc()).limit(1).lateral())


def _ultima_rotacion():
    M = EAMMovimientoNeumatico
    q = (select(M.km_odometro).where(M.neumatico_id == EAMNeumatico.id,
                                     M.tipo_movimiento.in_(("ROTACION", "VOLTEO", "INSTALACION")),
                                     M.km_odometro.isnot(None))
         .order_by(M.fecha.desc().nulls_last(), M.id.desc()).limit(1).lateral())
    return q


async def cargar_flota(db: AsyncSession, *, activo_ids: Optional[Sequence[int]] = None,
                       tipos_vehiculo: Optional[Sequence[str]] = None, filtros: Optional[FiltrosLlanta] = None,
                       desde: Optional[datetime] = None, hasta: Optional[datetime] = None) -> List[VehiculoFlota]:
    """Los vehículos con esquema de ejes, cada posición con su llanta montada y
    la última inspección dentro del periodo.

    El filtro de llantas no esconde posiciones: marca `en_filtro` en cada llanta
    y deja fuera los vehículos que no tienen ninguna que lo cumpla. Así el
    esquema siempre muestra el vehículo completo."""
    from app.api.v1.endpoints.eam import _generar_posiciones   # evita la importación circular

    qa = select(EAMActivo).where(EAMActivo.activo.is_(True), EAMActivo.numero_ejes.isnot(None))
    if activo_ids:
        qa = qa.where(EAMActivo.id.in_(list(activo_ids)))
    if tipos_vehiculo:
        qa = qa.where(EAMActivo.tipo_activo.in_(list(tipos_vehiculo)))
    activos = (await db.execute(qa.order_by(EAMActivo.codigo))).scalars().all()
    if not activos:
        return []

    N = EAMNeumatico
    ult = _ultima_inspeccion(desde, hasta)
    rot = _ultima_rotacion()
    filtro = condiciones(filtros) if filtros and not filtros.vacio else []
    cols = [N.id, N.codigo, N.activo_id, N.posicion, N.marca, N.referencia, N.medida, N.tipo_uso, N.reencauches,
            N.presion_recomendada, ult.fecha, ult.profundidad_izq, ult.profundidad_centro, ult.profundidad_der,
            ult.presion_psi, ult.estado_visual, ult.km_odometro, ult.observaciones, rot.c.km_odometro.label("km_rot")]
    if filtro:
        from sqlalchemy import and_
        cols.append(and_(*filtro).label("en_filtro"))
    q = (select(*cols).select_from(N).outerjoin(ult, true()).outerjoin(rot, true())
         # La lista de vehículos ya resuelta, como arreglo: con la subconsulta,
         # Postgres calculaba la última inspección de todas las llantas montadas
         # antes de filtrar, y 5 vehículos tardaban lo mismo que la flota entera.
         .where(N.estado == "INSTALADO", en_lista(N.activo_id, [a.id for a in activos])))
    por_pos: Dict[tuple, object] = {(f.activo_id, f.posicion): f for f in (await db.execute(q)).all()}

    salida: List[VehiculoFlota] = []
    for a in activos:
        v = VehiculoFlota(activo_id=a.id, codigo=a.codigo, placa=a.placa, nombre=a.nombre,
                          tipo=TIPO_VEHICULO.get(a.tipo_activo or "", a.tipo_activo or "Sin tipo"),
                          marca=a.marca, linea=a.linea)
        layout = _generar_posiciones(a.numero_ejes, a.tiene_repuesto if a.tiene_repuesto is not None else True,
                                     layout=a.layout_llantas, cantidad_repuestos=a.cantidad_repuestos or 1)
        for p in layout:
            pos = PosicionFlota(codigo=p["codigo"], label=p.get("label") or p["codigo"], eje=p.get("eje") or 0,
                                lado=p.get("lado") or "-", numero=p.get("numero"))
            f = por_pos.get((a.id, p["codigo"]))
            if f is not None:
                pos.llanta = LlantaInsp(
                    neumatico_id=f.id, codigo=f.codigo, activo_id=a.id, posicion=p["codigo"], posicion_label=pos.label,
                    eje=pos.eje, lado=pos.lado, marca=f.marca, referencia=f.referencia, medida=f.medida,
                    tipo_uso=f.tipo_uso, reencauches=f.reencauches or 0, izq=f.profundidad_izq,
                    centro=f.profundidad_centro, der=f.profundidad_der, presion=f.presion_psi,
                    presion_recomendada=f.presion_recomendada, estado_visual=f.estado_visual, fecha=f.fecha,
                    km_inspeccion=f.km_odometro, km_rotacion=f.km_rot, observaciones=f.observaciones,
                    en_filtro=bool(f.en_filtro) if filtro else True)
            v.posiciones.append(pos)
        if filtro and not any(ll.en_filtro for ll in v.llantas):
            continue
        salida.append(v)
    return salida
