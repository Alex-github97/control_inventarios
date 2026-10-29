"""Ayudas para consultas sobre muchos registros.

`columna.in_(ids)` manda un parámetro por cada id, y Postgres no admite más de
32.767 parámetros en una consulta: pasado ese número la consulta ni arranca y la
pantalla da 500. Le pasó a las últimas inspecciones de llantas con una flota
grande. `= ANY(:arreglo)` manda la lista entera como UN parámetro.
"""
from typing import Iterable

from sqlalchemy import Integer, any_, bindparam
from sqlalchemy.dialects.postgresql import ARRAY


def en_lista(columna, valores: Iterable[int]):
    """`columna = ANY(:valores)`: lo mismo que `columna.in_(valores)`, sin tope."""
    return columna == any_(bindparam("valores", list(valores), type_=ARRAY(Integer), unique=True))
