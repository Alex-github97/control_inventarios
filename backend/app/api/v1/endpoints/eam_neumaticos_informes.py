"""
Informes de rendimiento de llantas: CPK, km recorridos y km/mm por categoría.

Este archivo solo junta los datos. Las fórmulas viven en
`app.core.rendimiento_llantas`, que no toca la base y por eso tiene pruebas
unitarias.

Todo se carga en un puñado de consultas y se cruza en memoria. Con miles de
llantas son decenas de miles de filas pequeñas, y cruzarlas en Python es más
simple y más rápido que doce agregaciones SQL distintas, una por categoría.
"""
from collections import defaultdict
from datetime import date, datetime, time as hora
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rendimiento_llantas import (
    DIMENSIONES, SIN_DATO, VidaLlanta, a_datetime, agrupar, en_periodo, etiqueta_vida,
    grupo_vida, km_de_vida, mm_de_vida, resumir, suma_en_lapso, ultimo_antes,
)
from app.infrastructure.models.eam import (
    EAMActivo, EAMAjusteNeumatico, EAMBandaReencauche, EAMMotivoFinVida,
    EAMMovimientoNeumatico, EAMNeumatico, EAMReencaucheDetalle, EAMReencaucheLote,
    EAMReesculturado, EAMTrabajoRealizadoNeumatico, EAMVidaNeumatico, EAMZonaNeumatico,
)

router = APIRouter(prefix="/eam/neumaticos/reportes", tags=["CMMS/EAM · Neumáticos · Informes"])

ALCANCES = {"TODAS", "TERMINADAS", "EN_SERVICIO"}


class MetricasRendimiento(BaseModel):
    vidas: int
    llantas: int
    terminadas: int
    costo_total: Optional[float] = None
    km_total: Optional[float] = None
    cpk: Optional[float] = None
    cpk_min: Optional[float] = None
    cpk_max: Optional[float] = None
    n_cpk: int
    km_promedio: Optional[float] = None
    km_mediana: Optional[float] = None
    km_max: Optional[float] = None
    n_km: int
    km_mm: Optional[float] = None
    mm_promedio: Optional[float] = None
    n_km_mm: int


class GrupoRendimiento(MetricasRendimiento):
    categoria: str


class DimensionRendimiento(BaseModel):
    clave: str
    nombre: str
    grupos: List[GrupoRendimiento]


class RendimientoResponse(BaseModel):
    resumen: MetricasRendimiento
    dimensiones: List[DimensionRendimiento]


class VidaRendimiento(BaseModel):
    neumatico_id: int
    codigo: str
    vida: str
    terminada: bool
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    km: Optional[float] = None
    mm: Optional[float] = None
    costo: Optional[float] = None
    cpk: Optional[float] = None
    km_mm: Optional[float] = None
    categorias: Dict[str, str]


async def _vidas(db: AsyncSession) -> List[VidaLlanta]:
    neumaticos = list((await db.execute(select(EAMNeumatico))).scalars().all())
    if not neumaticos:
        return []

    vidas_por_llanta = defaultdict(list)
    for v in (await db.execute(
        select(EAMVidaNeumatico).order_by(EAMVidaNeumatico.neumatico_id, EAMVidaNeumatico.numero_vida)
    )).scalars().all():
        vidas_por_llanta[v.neumatico_id].append(v)

    # Lo que se suma o se descuenta a la vida en la que ocurrió.
    reesculturados = defaultdict(list)     # (fecha, costo)
    mm_reesculturados = defaultdict(list)  # (fecha, mm de labrado agregados)
    for r in (await db.execute(
        select(EAMReesculturado).where(EAMReesculturado.deshecho.isnot(True))
    )).scalars().all():
        reesculturados[r.neumatico_id].append((r.fecha, r.costo or 0))
        if r.profundidad_nueva is not None and r.profundidad_anterior is not None:
            mm_reesculturados[r.neumatico_id].append(
                (r.fecha, max(0.0, r.profundidad_nueva - r.profundidad_anterior)))
    reparaciones = defaultdict(list)
    for t in (await db.execute(select(EAMTrabajoRealizadoNeumatico))).scalars().all():
        reparaciones[t.neumatico_id].append((t.fecha, (t.costo_unitario or 0) * (t.cantidad or 1)))
    ajustes = defaultdict(list)
    for a in (await db.execute(select(EAMAjusteNeumatico))).scalars().all():
        ajustes[a.neumatico_id].append((a_datetime(a.fecha), a.valor or 0))

    # Banda y proveedor de cada reencauche, en el orden en que se hicieron: el
    # k-ésimo reencauche aprobado de una carcasa abrió su k-ésima vida reencauchada.
    bandas = {b.id: " ".join(x for x in (b.marca, b.referencia) if x)
              for b in (await db.execute(select(EAMBandaReencauche))).scalars().all()}
    reencauches = defaultdict(list)
    for det, lote in (await db.execute(
        select(EAMReencaucheDetalle, EAMReencaucheLote)
        .join(EAMReencaucheLote, EAMReencaucheLote.id == EAMReencaucheDetalle.lote_id)
        .where(EAMReencaucheDetalle.resultado == "REENCAUCHADA")
        .order_by(EAMReencaucheLote.fecha_envio, EAMReencaucheDetalle.id)
    )).all():
        reencauches[det.neumatico_id].append(
            (bandas.get(det.banda_id) or det.banda or SIN_DATO, lote.proveedor or SIN_DATO))

    # Vehículo en el que rodó cada vida: el último montaje antes de que terminara.
    montajes = defaultdict(lambda: ([], []))
    for nid, fecha, activo_id in (await db.execute(
        select(EAMMovimientoNeumatico.neumatico_id, EAMMovimientoNeumatico.fecha,
               EAMMovimientoNeumatico.activo_id)
        .where(EAMMovimientoNeumatico.activo_id.isnot(None), EAMMovimientoNeumatico.fecha.isnot(None))
        .order_by(EAMMovimientoNeumatico.neumatico_id, EAMMovimientoNeumatico.fecha)
    )).all():
        montajes[nid][0].append(fecha)
        montajes[nid][1].append(activo_id)
    activos = {a.id: a for a in (await db.execute(select(EAMActivo))).scalars().all()}
    zonas = {z.id: z.nombre for z in (await db.execute(select(EAMZonaNeumatico))).scalars().all()}
    motivos = {m.id: m.nombre for m in (await db.execute(select(EAMMotivoFinVida))).scalars().all()}

    ahora = datetime.utcnow()
    salida: List[VidaLlanta] = []
    for n in neumaticos:
        fijas = {
            "marca": n.marca or SIN_DATO,
            "referencia": " ".join(x for x in (n.marca, n.referencia) if x) or SIN_DATO,
            "medida": n.medida or SIN_DATO,
            "tipo_uso": n.tipo_uso or SIN_DATO,
            "zona": zonas.get(n.zona_id, SIN_DATO),
            "tipo_rin": n.tipo_rin or SIN_DATO,
        }

        def armar(numero_vida, tipo, terminada, inicio, fin, km, mm, costo, motivo, banda, proveedor):
            fechas, ids = montajes[n.id]
            montaje = ultimo_antes(fechas, list(zip(fechas, ids)), fin or ahora)
            activo_id = montaje[1] if montaje else None
            # Un montaje anterior al inicio pertenece a la vida pasada: la vida
            # reencauchada arranca en la bodega, no en el vehículo de antes.
            if montaje and inicio is not None and montaje[0] < inicio:
                activo_id = None
            if activo_id is None and not terminada:
                activo_id = n.activo_id
            activo = activos.get(activo_id)
            vida = etiqueta_vida(tipo, numero_vida)
            return VidaLlanta(
                neumatico_id=n.id, codigo=n.codigo, numero_vida=numero_vida, vida=vida,
                terminada=terminada, fecha_inicio=inicio, fecha_fin=fin,
                km=km, mm=mm, costo=costo,
                categorias={
                    **fijas,
                    "vida": grupo_vida(vida),
                    "tipo_vehiculo": (activo.tipo_activo if activo else None) or SIN_DATO,
                    "vehiculo": (activo.placa or activo.codigo) if activo else SIN_DATO,
                    "banda": banda or ("Llanta nueva" if tipo == "NUEVA" else SIN_DATO),
                    "proveedor": proveedor or SIN_DATO,
                    "motivo_fin": (motivo or SIN_DATO) if terminada else "En servicio",
                },
            )

        registros = vidas_por_llanta.get(n.id)
        if not registros:
            # Llanta anterior al registro de vidas: se toma entera como una sola
            # vida, con el mismo criterio que el indicador de CPK de la llanta.
            # Su costo ya incluye los reesculturados.
            terminada = n.estado == "BAJA"
            costo = (n.costo or 0) + suma_en_lapso(reparaciones[n.id], None, None) \
                - suma_en_lapso(ajustes[n.id], None, None)
            salida.append(armar(
                (n.reencauches or 0) + 1, "NUEVA" if not n.reencauches else "REENCAUCHADA",
                terminada, a_datetime(n.fecha_instalacion),
                a_datetime(n.fecha_baja) if terminada else None,
                n.km_total, mm_de_vida(n.profundidad_diseño, n.profundidad_actual),
                max(costo, 0) if n.costo else None,
                motivos.get(n.motivo_fin_vida_id) if terminada else None, None, n.proveedor,
            ))
            continue

        reenc = reencauches.get(n.id, [])
        n_reenc = 0
        km_fin_anterior = None
        for v in registros:
            terminada = v.fecha_fin is not None
            if terminada:
                km = km_de_vida(v.km_inicio, v.km_fin, km_fin_anterior)
                prof_final = v.profundidad_final
            else:
                km = n.km_total
                prof_final = n.profundidad_actual
            inicial = v.profundidad_inicial
            if inicial is None and v.tipo == "NUEVA":
                inicial = n.profundidad_diseño
            if inicial is not None:
                # El reesculturado agrega labrado: sin sumarlo, los mm gastados
                # saldrían menores de lo que la llanta realmente rodó.
                inicial += suma_en_lapso(mm_reesculturados[n.id], v.fecha_inicio, v.fecha_fin)
            mm = mm_de_vida(inicial, prof_final)

            costo_base = v.costo
            if costo_base is None and v.tipo == "NUEVA":
                costo_base = n.costo if not terminada else None
            costo = (costo_base or 0) \
                + suma_en_lapso(reesculturados[n.id], v.fecha_inicio, v.fecha_fin) \
                + suma_en_lapso(reparaciones[n.id], v.fecha_inicio, v.fecha_fin) \
                - suma_en_lapso(ajustes[n.id], v.fecha_inicio, v.fecha_fin)

            banda = proveedor = None
            if v.tipo == "REENCAUCHADA":
                if n_reenc < len(reenc):
                    banda, proveedor = reenc[n_reenc]
                n_reenc += 1
            else:
                proveedor = n.proveedor

            motivo = motivos.get(v.motivo_cierre_id) if terminada else None
            if terminada and motivo is None and v is registros[-1] and n.estado == "BAJA":
                motivo = motivos.get(n.motivo_fin_vida_id)
            salida.append(armar(
                v.numero_vida, v.tipo, terminada, v.fecha_inicio, v.fecha_fin, km, mm,
                max(costo, 0) if (costo_base or costo > 0) else None,
                motivo, banda, proveedor,
            ))
            if terminada:
                km_fin_anterior = v.km_fin
    return salida


def _filtrar(vidas: List[VidaLlanta], alcance: str,
             desde: Optional[date], hasta: Optional[date]) -> List[VidaLlanta]:
    ini = datetime.combine(desde, hora.min) if desde else None
    fin = datetime.combine(hasta, hora.max) if hasta else None
    salida = []
    for v in vidas:
        if alcance == "TERMINADAS" and not v.terminada:
            continue
        if alcance == "EN_SERVICIO" and v.terminada:
            continue
        if en_periodo(v, ini, fin):
            salida.append(v)
    return salida


def _alcance(valor: str) -> str:
    valor = (valor or "TODAS").upper()
    return valor if valor in ALCANCES else "TODAS"


@router.get("/rendimiento", response_model=RendimientoResponse)
async def rendimiento(
    alcance: str = Query("TODAS", description="TODAS, TERMINADAS o EN_SERVICIO"),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    km_minimo: float = Query(1000, ge=0, description="Vidas con menos km no entran al CPK ni al km/mm"),
    db: AsyncSession = Depends(get_db),
):
    """Tablero de rendimiento: las métricas globales y, para cada categoría, las
    de cada uno de sus valores. Se devuelven todas las categorías de una vez
    para que cambiar de categoría en pantalla no vuelva a consultar."""
    vidas = _filtrar(await _vidas(db), _alcance(alcance), desde, hasta)
    return RendimientoResponse(
        resumen=MetricasRendimiento(**resumir(vidas, km_minimo)),
        dimensiones=[
            DimensionRendimiento(
                clave=clave, nombre=nombre,
                grupos=[GrupoRendimiento(**g) for g in agrupar(vidas, clave, km_minimo)],
            )
            for clave, nombre in DIMENSIONES
        ],
    )


@router.get("/rendimiento/vidas", response_model=List[VidaRendimiento])
async def rendimiento_por_vida(
    alcance: str = Query("TODAS"),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """Una fila por vida con sus métricas: el detalle detrás del tablero."""
    vidas = _filtrar(await _vidas(db), _alcance(alcance), desde, hasta)
    return [
        VidaRendimiento(
            neumatico_id=v.neumatico_id, codigo=v.codigo, vida=v.vida, terminada=v.terminada,
            fecha_inicio=v.fecha_inicio, fecha_fin=v.fecha_fin,
            km=round(v.km, 0) if v.km is not None else None,
            mm=round(v.mm, 1) if v.mm is not None else None,
            costo=round(v.costo, 2) if v.costo is not None else None,
            cpk=round(v.cpk, 2) if v.cpk is not None else None,
            km_mm=round(v.km_mm, 1) if v.km_mm is not None else None,
            categorias=v.categorias,
        )
        for v in sorted(vidas, key=lambda x: (x.codigo, x.numero_vida))
    ]
