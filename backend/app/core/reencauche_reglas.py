"""
Las reglas de la planta de reencauche que no necesitan la base de datos.

Van aparte para poder probarlas con valores escritos a mano: comparar una
medición contra su especificación, un ciclo contra su receta, un daño contra su
límite de reparación.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

DECISIONES = ("APROBADA", "CONDICIONAL", "RECHAZADA")
DECISIONES_FINAL = DECISIONES + ("RETENIDA", "CORRECCION")
# Lo que se puede hacer con una medida fuera de tolerancia en una etapa de proceso.
ACCIONES_FUERA = ("REPETIR", "EVALUACION", "RECHAZAR")

VARIABLES = (
    # (clave en el ciclo, campo objetivo y tolerancia en la receta, nombre)
    ("temperatura", "temperatura_c", "temperatura_tol", "temperatura"),
    ("presion", "presion_bar", "presion_tol", "presión"),
    ("vacio", "vacio_bar", "vacio_tol", "vacío"),
    ("tiempo", "tiempo_min", "tiempo_tol", "tiempo"),
)


def _num(v) -> Optional[float]:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def evaluar_mediciones(definicion: List[Dict], valores: Dict, limites: Optional[Dict]) -> Tuple[List[Dict], bool]:
    """Cada medición que pide la etapa, con su valor, sus límites y si está
    conforme. Devuelve (mediciones, alguna fuera de tolerancia).

    - NUMERO: se compara con `limites[clave] = {min, max}` si la especificación
      lo trae; sin especificación queda registrada sin comparar (conforme=None).
    - SI_NO: conforme es el valor mismo (p. ej. «conserva el vacío»).
    Una medición que la etapa pide y no llegó es un error de quien llama.
    """
    limites = limites or {}
    salida, fuera = [], False
    for m in definicion or []:
        clave = m["clave"]
        if clave not in valores or valores[clave] is None or valores[clave] == "":
            raise ValueError(f"Falta la medición «{m.get('nombre', clave)}».")
        if m.get("tipo") == "SI_NO":
            valor = valores[clave] in (True, "true", "SI", "si", 1, "1")
            fila = {"clave": clave, "nombre": m.get("nombre"), "valor": valor, "unidad": "", "conforme": valor}
        else:
            valor = _num(valores[clave])
            if valor is None:
                raise ValueError(f"La medición «{m.get('nombre', clave)}» debe ser un número.")
            lim = limites.get(clave) or {}
            mn, mx = _num(lim.get("min")), _num(lim.get("max"))
            conforme = None if mn is None and mx is None else (
                (mn is None or valor >= mn) and (mx is None or valor <= mx))
            fila = {"clave": clave, "nombre": m.get("nombre"), "valor": valor, "unidad": m.get("unidad"),
                    "min": mn, "max": mx, "conforme": conforme}
        if fila["conforme"] is False:
            fuera = True
        salida.append(fila)
    return salida, fuera


def comparar_variables(receta: Dict, reales: Dict) -> Tuple[Dict, bool, List[str]]:
    """Variables reales del ciclo contra la receta. `reales` trae temperatura
    (máxima), presión (media), vacío (mínimo) y tiempo (duración en minutos).
    Devuelve (detalle por variable, conforme, nombres de las desviadas)."""
    detalle, desviadas = {}, []
    for clave, campo, tol, nombre in VARIABLES:
        real = _num(reales.get(clave))
        if real is None:
            raise ValueError(f"Falta la variable real «{nombre}» del ciclo.")
        objetivo, tolerancia = float(receta[campo]), float(receta[tol])
        ok = abs(real - objetivo) <= tolerancia + 1e-9
        detalle[clave] = {"real": real, "objetivo": objetivo, "tolerancia": tolerancia, "conforme": ok}
        if not ok:
            desviadas.append(nombre)
    return detalle, not desviadas, desviadas


def excede_limite(tamano_mm: float, limite_mm: Optional[float]) -> bool:
    """Sin límite configurado para esa ubicación y daño no se bloquea; un
    límite de 0 significa que esa zona no se repara."""
    return limite_mm is not None and float(tamano_mm) > float(limite_mm)


def pct(parte, total, dec: int = 1) -> Optional[float]:
    return round(100.0 * parte / total, dec) if total else None


def por_cien(parte, total, dec: int = 2) -> Optional[float]:
    """Por cada 100 (garantías por cada 100 llantas entregadas)."""
    return round(100.0 * parte / total, dec) if total else None
