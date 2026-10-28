"""
Rendimiento y costo de las llantas, por vida y agrupado por categoría.

LA UNIDAD ES LA VIDA, NO LA LLANTA
Una carcasa que se reencaucha dos veces tiene tres vidas con costos, bandas y
desgastes distintos. Medir la llanta entera mezclaría una vida nueva de
$2.000.000 con un reencauche de $600.000 y el CPK resultante no describiría a
ninguna de las dos. Por eso cada métrica se calcula por vida y la categoría
«vida» (VN, R1, R2…) es una más entre las que se pueden comparar.

LAS TRES MÉTRICAS
- CPK (costo por kilómetro) = costo de la vida / km recorridos en ella.
- Rendimiento = km recorridos en la vida.
- km/mm = km recorridos / milímetros de labrado gastados.

Al agrupar, el CPK y el km/mm de una categoría son el cociente de las sumas
(Σcosto / Σkm), no el promedio de los CPK de cada vida. Una vida de 800 km con
un CPK absurdo pesaría lo mismo que una de 90.000 km si se promediaran.

El costo de una vida es el de la compra (o del reencauche) más los
reesculturados y reparaciones hechos mientras duró, menos los ajustes
(deducciones por garantía, recuperación de banda…) aplicados en ese lapso.
"""
from __future__ import annotations

from bisect import bisect_right
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

SIN_DATO = "Sin dato"

# Orden en que se ofrecen las categorías en pantalla. La clave es el campo de
# `VidaLlanta.categorias`.
DIMENSIONES: List[Tuple[str, str]] = [
    ("marca", "Marca"),
    ("referencia", "Referencia"),
    ("medida", "Medida"),
    ("vida", "Vida"),
    ("tipo_uso", "Tipo de uso"),
    ("tipo_vehiculo", "Tipo de vehículo"),
    ("vehiculo", "Vehículo"),
    ("banda", "Banda de reencauche"),
    ("proveedor", "Proveedor"),
    ("zona", "Zona"),
    ("motivo_fin", "Motivo de fin de vida"),
    ("tipo_rin", "Tipo de rin"),
]


@dataclass
class VidaLlanta:
    neumatico_id: int
    codigo: str
    numero_vida: int
    vida: str                    # VN, R1, R2…
    terminada: bool
    fecha_inicio: Optional[datetime]
    fecha_fin: Optional[datetime]
    km: Optional[float]          # None: el registro no permite calcularlo
    mm: Optional[float]          # mm de labrado gastados
    costo: Optional[float]
    categorias: Dict[str, str] = field(default_factory=dict)

    @property
    def cpk(self) -> Optional[float]:
        if self.costo and self.km and self.km > 0:
            return self.costo / self.km
        return None

    @property
    def km_mm(self) -> Optional[float]:
        if self.km and self.km > 0 and self.mm and self.mm > 0:
            return self.km / self.mm
        return None


def etiqueta_vida(tipo: Optional[str], numero_vida: Optional[int]) -> str:
    if (tipo or "NUEVA") == "NUEVA":
        return "VN"
    return f"R{max(1, (numero_vida or 2) - 1)}"


def grupo_vida(etiqueta: str) -> str:
    """R3, R4… se juntan: casi nunca hay muestra suficiente para separarlas."""
    if etiqueta.startswith("R") and etiqueta[1:].isdigit() and int(etiqueta[1:]) >= 3:
        return "R3+"
    return etiqueta


def km_de_vida(km_inicio: Optional[float], km_fin: Optional[float],
               km_fin_vida_anterior: Optional[float]) -> Optional[float]:
    """Km recorridos en una vida terminada.

    Al reencauchar, la vida nueva se abre con `km_inicio = 0` aunque el contador
    de la llanta siga desde donde iba (la llanta guarda `km_inicio = km_actual`).
    Sin corregirlo, la segunda vida se quedaría con los kilómetros de la primera.
    Cuando la vida no trae inicio y hay una anterior, arranca donde esa terminó.
    """
    if km_fin is None:
        return None
    inicio = km_inicio or 0
    if not inicio and km_fin_vida_anterior:
        inicio = km_fin_vida_anterior
    if km_fin < inicio:
        return None
    return km_fin - inicio


def mm_de_vida(profundidad_inicial: Optional[float],
               profundidad_final: Optional[float]) -> Optional[float]:
    if profundidad_inicial is None or profundidad_final is None:
        return None
    gastado = profundidad_inicial - profundidad_final
    return gastado if gastado > 0 else None


def suma_en_lapso(eventos: Sequence[Tuple[datetime, float]],
                  desde: Optional[datetime], hasta: Optional[datetime]) -> float:
    """Suma los montos de `eventos` (ordenados por fecha) dentro de [desde, hasta)."""
    total = 0.0
    for fecha, monto in eventos:
        if fecha is None or not monto:
            continue
        if desde is not None and fecha < desde:
            continue
        if hasta is not None and fecha >= hasta:
            continue
        total += monto
    return total


def ultimo_antes(fechas: Sequence[datetime], valores: Sequence, limite: datetime):
    """Valor del último evento con fecha <= limite (`fechas` ordenadas)."""
    i = bisect_right(fechas, limite)
    return valores[i - 1] if i else None


def a_datetime(valor) -> Optional[datetime]:
    if valor is None or isinstance(valor, datetime):
        return valor
    if isinstance(valor, date):
        return datetime(valor.year, valor.month, valor.day)
    return None


def en_periodo(v: VidaLlanta, desde: Optional[datetime], hasta: Optional[datetime]) -> bool:
    """La vida rodó en algún momento del periodo."""
    if hasta is not None and v.fecha_inicio is not None and v.fecha_inicio > hasta:
        return False
    if desde is not None and v.fecha_fin is not None and v.fecha_fin < desde:
        return False
    return True


def _r(x: Optional[float], d: int = 2) -> Optional[float]:
    return round(x, d) if x is not None else None


def resumir(vidas: Iterable[VidaLlanta], km_minimo: float = 0) -> Dict:
    """Métricas de un conjunto de vidas.

    Las vidas con menos de `km_minimo` no entran al CPK ni al km/mm: una
    llanta recién montada con 300 km tiene un CPK de miles de pesos que no dice
    nada de su rendimiento. Sí cuentan en el número de vidas y en el costo.
    """
    vidas = list(vidas)
    medibles = [v for v in vidas if v.km is not None and v.km >= max(km_minimo, 0) and v.km > 0]
    con_costo = [v for v in medibles if v.costo and v.costo > 0]
    con_mm = [v for v in medibles if v.mm and v.mm > 0]

    km_cpk = sum(v.km for v in con_costo)
    costo_cpk = sum(v.costo for v in con_costo)
    km_mm_num = sum(v.km for v in con_mm)
    mm_den = sum(v.mm for v in con_mm)
    cpks = sorted(v.cpk for v in con_costo)
    kms = sorted(v.km for v in medibles)

    return {
        "vidas": len(vidas),
        "llantas": len({v.neumatico_id for v in vidas}),
        "terminadas": sum(1 for v in vidas if v.terminada),
        "costo_total": _r(sum(v.costo or 0 for v in vidas)),
        "km_total": _r(sum(v.km or 0 for v in vidas), 0),
        "cpk": _r(costo_cpk / km_cpk) if km_cpk else None,
        "cpk_min": _r(cpks[0]) if cpks else None,
        "cpk_max": _r(cpks[-1]) if cpks else None,
        "n_cpk": len(con_costo),
        "km_promedio": _r(sum(kms) / len(kms), 0) if kms else None,
        "km_mediana": _r(_mediana(kms), 0) if kms else None,
        "km_max": _r(kms[-1], 0) if kms else None,
        "n_km": len(kms),
        "km_mm": _r(km_mm_num / mm_den, 1) if mm_den else None,
        "mm_promedio": _r(mm_den / len(con_mm), 1) if con_mm else None,
        "n_km_mm": len(con_mm),
    }


def _mediana(ordenados: List[float]) -> float:
    n = len(ordenados)
    m = n // 2
    return ordenados[m] if n % 2 else (ordenados[m - 1] + ordenados[m]) / 2


def agrupar(vidas: Iterable[VidaLlanta], dimension: str, km_minimo: float = 0) -> List[Dict]:
    grupos: Dict[str, List[VidaLlanta]] = defaultdict(list)
    for v in vidas:
        grupos[v.categorias.get(dimension) or SIN_DATO].append(v)
    salida = [{"categoria": k, **resumir(vs, km_minimo)} for k, vs in grupos.items()]
    salida.sort(key=lambda g: (-g["vidas"], g["categoria"]))
    return salida
