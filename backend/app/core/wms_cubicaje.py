"""
Cubicaje: de las lecturas del cubicador a las medidas, la calibración, cuántas
cajas caben en una estiba o en una ubicación y cuánto espacio se está usando.

Todo aquí es cálculo puro (sin base de datos) salvo `ocupacion_ubicaciones`,
para poder probarlo con números conocidos.

**Cómo mide la estación.** La caja se apoya en la esquina de dos paredes de
referencia, sobre la báscula. Cada láser mira hacia la caja desde la pared
opuesta: lo que la caja mide en ese eje es la distancia del láser a la pared de
referencia (la base) menos lo que lee el láser. Con varias lecturas por eje se
toma la mediana (resiste una lectura mala) y la dispersión dice si la caja se
movió o está mal apoyada.

**Calibración.** Con bloques de medida conocida se ajusta, por eje,
`medida = escala × (base − lectura)`. Con un bloque se fija la base; con dos o
más de distinto tamaño, mínimos cuadrados dan base y escala. El peso igual:
`gramos = (crudo − tara) × escala`.
"""
from __future__ import annotations

from dataclasses import dataclass
from itertools import permutations
from statistics import median, pstdev
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

EJES = ("x", "y", "z")           # x = largo, y = ancho, z = alto
ESTIBA_ESTANDAR = (120.0, 100.0)  # cm, estiba colombiana/europea común
ALTO_ESTIBA_CM = 14.5


@dataclass
class Medida:
    largo_cm: Optional[float]
    ancho_cm: Optional[float]
    alto_cm: Optional[float]
    peso_kg: Optional[float]
    dispersion_mm: float
    estable: bool
    avisos: List[str]


def _limpias(valores: Iterable) -> List[float]:
    return [float(v) for v in (valores or []) if v is not None and float(v) > 0]


def procesar_lecturas(lecturas: Dict[str, Sequence[float]], cal: dict, tolerancia_mm: float = 2.0) -> Medida:
    """`lecturas` = {"x": [mm…], "y": [...], "z": [...], "peso": [crudo…]}.
    `cal` = {"base_x_mm", "escala_x", …, "tara_crudo", "escala_peso"}."""
    dims, dispersiones, avisos = {}, [], []
    for eje in EJES:
        vals = _limpias(lecturas.get(eje))
        base = cal.get(f"base_{eje}_mm")
        if not vals:
            dims[eje] = None
            avisos.append(f"Sin lecturas del eje {eje}.")
            continue
        if base is None:
            dims[eje] = None
            avisos.append(f"El eje {eje} no está calibrado.")
            continue
        m = median(vals)
        dispersiones.append(pstdev(vals) if len(vals) > 1 else 0.0)
        mm = (cal.get(f"escala_{eje}") or 1.0) * (base - m)
        if mm < 0:
            avisos.append(f"El eje {eje} lee más que su base: ¿la caja está bien apoyada?")
            mm = 0.0
        dims[eje] = round(mm / 10.0, 1)
    peso = None
    crudos = [float(v) for v in (lecturas.get("peso") or []) if v is not None]
    if crudos and cal.get("tara_crudo") is not None and cal.get("escala_peso"):
        peso = round(max(0.0, (median(crudos) - cal["tara_crudo"]) * cal["escala_peso"]) / 1000.0, 3)
    elif crudos:
        avisos.append("La báscula no está calibrada.")
    disp = round(max(dispersiones), 2) if dispersiones else 0.0
    estable = disp <= tolerancia_mm
    if not estable:
        avisos.append(f"Lecturas inestables (±{disp} mm): vuelva a medir con la caja quieta contra las paredes.")
    return Medida(dims["x"], dims["y"], dims["z"], peso, disp, estable, avisos)


def ajustar_eje(muestras: Sequence[Tuple[float, float]]) -> Tuple[float, float]:
    """Base y escala de un eje con muestras (lectura_mm, real_mm).
    Un bloque: escala 1 y base = lectura + real. Dos o más: mínimos cuadrados
    de real = c0 + c1·lectura, con escala = −c1 y base = c0 / escala."""
    if not muestras:
        raise ValueError("Sin muestras para calibrar.")
    if len(muestras) == 1 or len({round(l, 3) for l, _ in muestras}) == 1:
        l, r = muestras[-1]
        return l + r, 1.0
    n = len(muestras)
    sx = sum(l for l, _ in muestras); sy = sum(r for _, r in muestras)
    sxx = sum(l * l for l, _ in muestras); sxy = sum(l * r for l, r in muestras)
    c1 = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    c0 = (sy - c1 * sx) / n
    escala = -c1
    if not 0.8 < escala < 1.2:
        raise ValueError(f"La escala calculada ({escala:.3f}) no es razonable: revise que los bloques y sus medidas reales "
                         "correspondan a las lecturas.")
    return c0 / escala, escala


def ajustar_peso(muestras: Sequence[Tuple[float, float]]) -> Tuple[float, float]:
    """Tara y escala de la báscula con muestras (crudo, gramos reales); una
    muestra con 0 g es la tara."""
    ceros = [c for c, g in muestras if g == 0]
    con_peso = [(c, g) for c, g in muestras if g > 0]
    if not ceros or not con_peso:
        raise ValueError("Para calibrar la báscula se necesita una lectura vacía (0 g) y una con peso conocido.")
    tara = median(ceros)
    escalas = [g / (c - tara) for c, g in con_peso if c != tara]
    if not escalas:
        raise ValueError("La lectura con peso es igual a la vacía: la celda de carga no responde.")
    return tara, median(escalas)


# ── Geometría ────────────────────────────────────────────────────────────────

def cuantas_caben(espacio: Sequence[float], caja: Sequence[float], rotar_alto: bool = True) -> Tuple[int, Tuple[float, float, float]]:
    """Cuántas cajas iguales caben en un espacio (largo, ancho, alto), probando
    las orientaciones. Sin `rotar_alto` la caja no se acuesta (este lado arriba)."""
    L, W, H = espacio
    mejor, orient = 0, tuple(caja)
    # Primero las orientaciones que conservan el alto: ante un empate se
    # prefiere no acostar la caja (menos manipulación, menos daño).
    de_pie = [(caja[0], caja[1], caja[2]), (caja[1], caja[0], caja[2])]
    opciones = de_pie + ([o for o in permutations(caja) if o not in de_pie] if rotar_alto else [])
    for a, b, c in opciones:
        if a <= 0 or b <= 0 or c <= 0:
            continue
        n = int(L // a) * int(W // b) * int(H // c)
        if n > mejor:
            mejor, orient = n, (a, b, c)
    return mejor, orient


def cajas_por_cama(base: Sequence[float], caja_l: float, caja_a: float) -> Tuple[int, str]:
    """Cajas por cama en la base de una estiba. Prueba las dos orientaciones
    puras y los patrones de dos bloques (una franja en un sentido y el resto
    girado), que es lo que se arma a mano en una bodega."""
    L, W = base
    mejor, patron = 0, ""
    for l, a in ((caja_l, caja_a), (caja_a, caja_l)):
        n = int(L // l) * int(W // a)
        if n > mejor:
            mejor, patron = n, f"{int(L // l)}×{int(W // a)}"
        # Bloque 1: k columnas en esta orientación a lo largo; el resto girado.
        for k in range(1, int(L // l) + 1):
            resto = L - k * l
            n1 = k * int(W // a)
            n2 = int(resto // a) * int(W // l)
            if n1 + n2 > mejor:
                mejor, patron = n1 + n2, f"{k}×{int(W // a)} + {int(resto // a)}×{int(W // l)} girado"
        # Bloque 2: k filas a lo ancho; el resto girado.
        for k in range(1, int(W // a) + 1):
            resto = W - k * a
            n1 = int(L // l) * k
            n2 = int(L // a) * int(resto // l)
            if n1 + n2 > mejor:
                mejor, patron = n1 + n2, f"{int(L // l)}×{k} + {int(L // a)}×{int(resto // l)} girado"
    return mejor, patron


def armar_estiba(caja: Sequence[float], peso_caja_kg: Optional[float] = None, base: Sequence[float] = ESTIBA_ESTANDAR,
                 alto_max_cm: float = 150.0, peso_max_kg: float = 1000.0, max_apilado: Optional[int] = None) -> dict:
    """Ti × Hi: cuántas cajas por cama y cuántas camas, respetando alto total
    (con la estiba), peso y apilamiento máximo. Dice qué lo limita."""
    l, a, h = caja
    if min(l, a, h) <= 0:
        raise ValueError("La caja necesita largo, ancho y alto mayores que cero.")
    ti, patron = cajas_por_cama(base, l, a)
    if ti == 0:
        return {"ti": 0, "hi": 0, "cajas": 0, "limita": "La caja es más grande que la base de la estiba."}
    hi_alto = int((alto_max_cm - ALTO_ESTIBA_CM) // h)
    hi, limita = hi_alto, "alto"
    if max_apilado and max_apilado < hi:
        hi, limita = max_apilado, "apilamiento máximo de la caja"
    if peso_caja_kg:
        hi_peso = int(peso_max_kg // (peso_caja_kg * ti))
        if hi_peso < hi:
            hi, limita = hi_peso, "peso"
    hi = max(hi, 0)
    cajas = ti * hi
    uso_base = ti * l * a / (base[0] * base[1])
    return {"ti": ti, "hi": hi, "cajas": cajas, "patron": patron, "limita": limita,
            "alto_total_cm": round(ALTO_ESTIBA_CM + hi * h, 1),
            "peso_total_kg": round(cajas * peso_caja_kg, 1) if peso_caja_kg else None,
            "aprovechamiento_base_pct": round(uso_base * 100, 1),
            "aprovechamiento_cubico_pct": round(cajas * l * a * h / (base[0] * base[1] * (alto_max_cm - ALTO_ESTIBA_CM)) * 100, 1)
            if alto_max_cm > ALTO_ESTIBA_CM else None}


def volumen_m3(l: Optional[float], a: Optional[float], h: Optional[float]) -> Optional[float]:
    return round(l * a * h / 1_000_000, 6) if l and a and h else None
