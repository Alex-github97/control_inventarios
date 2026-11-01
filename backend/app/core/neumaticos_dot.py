"""
Semana y año de fabricación de una llanta, leídos de su DOT.

El DOT termina en cuatro dígitos SSAA: semana (01-53) y año de dos cifras.
«DOT 4B7X ABC 2321» es la semana 23 de 2021. Desde el 2000 el formato es ese;
los DOT anteriores tenían tres dígitos y no se interpretan.

Un DOT que no se puede leer no impide guardar la llanta: queda sin fecha de
fabricación y los tableros la muestran como «Sin DOT válido». La misma regla
está escrita en SQL en `SQL_RELLENO` para interpretar de una vez las llantas que
ya existían; si cambia una, debe cambiar la otra.
"""
import re
from datetime import date, timedelta
from typing import Optional, Tuple

_FINAL = re.compile(r"(\d{4})\D*$")


def interpretar_dot(dot: Optional[str], registro: Optional[date] = None) -> Tuple[Optional[int], Optional[int]]:
    """(semana, año) del DOT, o (None, None) si no es válido.

    No es válido si no termina en cuatro dígitos, si la semana no existe o si la
    fecha de fabricación es posterior al registro de la llanta (una llanta no se
    registra antes de fabricarse: es un DOT mal digitado).
    """
    if not dot:
        return None, None
    m = _FINAL.search(dot.strip())
    if not m:
        return None, None
    semana, anio = int(m.group(1)[:2]), 2000 + int(m.group(1)[2:])
    if not 1 <= semana <= 53:
        return None, None
    inicio_semana = date(anio, 1, 1) + timedelta(weeks=semana - 1)
    if inicio_semana > (registro or date.today()):
        return None, None
    return semana, anio


# Rellena las llantas que tienen DOT y todavía no tienen la fecha interpretada.
SQL_RELLENO = r"""
WITH d AS (
    SELECT id, substring(dot from '(\d{4})\D*$') AS c,
           COALESCE(created_at::date, current_date) AS registro
    FROM eam_neumatico
    WHERE dot IS NOT NULL AND dot_anio IS NULL
), v AS (
    SELECT id, substr(c, 1, 2)::int AS semana, 2000 + substr(c, 3, 2)::int AS anio, registro
    FROM d WHERE c IS NOT NULL
)
UPDATE eam_neumatico n
SET dot_semana = v.semana, dot_anio = v.anio
FROM v
WHERE n.id = v.id AND v.semana BETWEEN 1 AND 53
  AND make_date(v.anio, 1, 1) + (v.semana - 1) * 7 <= v.registro
"""
