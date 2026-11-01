"""
El filtro común de los tableros de llantas: marca, referencia, dimensión y
semana y año de fabricación (del DOT).

Una sola función lo aplica en el tablero de descarte, en el general, en el
informe de flota y en la lista de descarte. Por eso el total que muestra un
tablero y el de la lista a la que salta cuadran por construcción: no son dos
filtros escritos dos veces.

Se compara sin distinguir mayúsculas ni espacios de los extremos, porque marca,
referencia y medida se guardan como texto y una variante («Michelin » contra
«MICHELIN») no debe partir un grupo en dos.
"""
from dataclasses import dataclass, field
from typing import List, Optional

from fastapi import Query
from sqlalchemy import and_, func, or_, tuple_

from app.infrastructure.models.eam import EAMNeumatico

# Así se rotula una referencia: la misma referencia puede existir en dos marcas.
SEP_REFERENCIA = " · "
# Valor que, en los filtros de año o semana, pide las llantas sin DOT legible.
SIN_DOT = 0


def clave(col):
    """La forma de comparar y agrupar un texto de catálogo."""
    return func.upper(func.trim(col))


def etiqueta_referencia(marca: Optional[str], referencia: Optional[str]) -> Optional[str]:
    if not referencia:
        return None
    return f"{(marca or '').strip()}{SEP_REFERENCIA}{referencia.strip()}" if marca else referencia.strip()


@dataclass
class FiltrosLlanta:
    marcas: List[str] = field(default_factory=list)
    # Cada referencia viene rotulada «Marca · Referencia».
    referencias: List[str] = field(default_factory=list)
    medidas: List[str] = field(default_factory=list)
    anios: List[int] = field(default_factory=list)
    semanas: List[int] = field(default_factory=list)

    @property
    def vacio(self) -> bool:
        return not (self.marcas or self.referencias or self.medidas or self.anios or self.semanas)


def filtros_llanta(
    marca: Optional[List[str]] = Query(None, description="Marcas (se puede repetir)"),
    referencia: Optional[List[str]] = Query(None, description="Referencias «Marca · Referencia»"),
    medida: Optional[List[str]] = Query(None, description="Dimensiones"),
    anio_fabricacion: Optional[List[int]] = Query(None, description="Años del DOT; 0 = sin DOT válido"),
    semana_fabricacion: Optional[List[int]] = Query(None, description="Semanas del DOT; 0 = sin DOT válido"),
) -> FiltrosLlanta:
    """Dependencia de FastAPI con los filtros de la petición."""
    limpio = lambda xs: [x.strip() for x in (xs or []) if x and x.strip()]  # noqa: E731
    return FiltrosLlanta(marcas=limpio(marca), referencias=limpio(referencia), medidas=limpio(medida),
                         anios=list(anio_fabricacion or []), semanas=list(semana_fabricacion or []))


def _por_dot(col, valores: List[int]):
    reales = [v for v in valores if v != SIN_DOT]
    partes = []
    if reales:
        partes.append(col.in_(reales))
    if SIN_DOT in valores:
        partes.append(col.is_(None))
    return or_(*partes)


def condiciones(f: FiltrosLlanta, N=EAMNeumatico) -> list:
    """Las condiciones WHERE del filtro, para agregarlas a cualquier consulta
    que tenga la tabla de llantas (o un alias de ella)."""
    c = []
    if f.marcas:
        c.append(clave(N.marca).in_([m.upper() for m in f.marcas]))
    if f.referencias:
        pares = []
        for r in f.referencias:
            marca, _, ref = r.partition(SEP_REFERENCIA)
            if not ref:   # vino sin marca
                marca, ref = "", marca
            pares.append((marca.strip().upper(), ref.strip().upper()))
        c.append(tuple_(func.coalesce(clave(N.marca), ""), clave(N.referencia)).in_(pares))
    if f.medidas:
        c.append(clave(N.medida).in_([m.upper() for m in f.medidas]))
    if f.anios:
        c.append(_por_dot(N.dot_anio, f.anios))
    if f.semanas:
        c.append(_por_dot(N.dot_semana, f.semanas))
    return c


def aplicar(q, f: FiltrosLlanta, N=EAMNeumatico):
    c = condiciones(f, N)
    return q.where(and_(*c)) if c else q
