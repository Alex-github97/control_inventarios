"""
Novedades y sugerencias de llantas sobre la última inspección.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List

from app.core.neumaticos_novedades import (
    LlantaInsp, Umbrales, novedades, reglas_iniciales, sugerencias, validar_condicion, variables,
)

U = Umbrales(profundidad_minima=3.0, margen_alerta=2.0, presion_min=90, presion_max=120,
             umbral_desalineacion=2.0, diferencia_hombros=3.0)
HOY = datetime(2026, 10, 1)


def ll(nid, pos="E2-IZQ-EXT", eje=2, lado="IZQ", prof=(10, 10, 10), presion=110, **kw):
    izq, centro, der = prof
    return LlantaInsp(neumatico_id=nid, codigo=f"L{nid}", activo_id=1, posicion=pos, eje=eje, lado=lado,
                      izq=izq, centro=centro, der=der, presion=presion, fecha=kw.pop("fecha", HOY), **kw)


@dataclass
class Cond:
    campo: str
    operador: str
    valor: str


@dataclass
class Regla:
    id: int
    nombre: str
    tipo: str
    prioridad: int
    texto: str
    activa: bool = True
    condiciones: List[Cond] = field(default_factory=list)


def tipos(nov, nid):
    return sorted(n.tipo for n in nov.get(nid, []))


def test_llanta_con_dos_novedades():
    nov = novedades([ll(1, prof=(2.5, 3, 3), presion=70)], U)
    assert tipos(nov, 1) == ["PRESION", "PROFUNDIDAD_MINIMA"]


def test_cerca_del_minimo_y_desgaste_irregular():
    nov = novedades([ll(1, prof=(4.5, 6, 9), estado_visual="REGULAR")], U)
    assert tipos(nov, 1) == ["DESGASTE_IRREGULAR", "ESTADO_VISUAL", "PROFUNDIDAD_ALERTA"]


def test_sin_inspeccion_no_tiene_novedades():
    nov = novedades([ll(1, prof=(1, 1, 1), fecha=None)], U)
    assert nov == {}


def test_desalineacion_marca_la_mas_gastada_del_eje():
    llantas = [ll(1, prof=(10, 10, 10)), ll(2, pos="E2-DER-EXT", lado="DER", prof=(7, 7, 7))]
    nov = novedades(llantas, U)
    assert tipos(nov, 2) == ["DESALINEACION"] and 1 not in nov


def test_par_dual_y_diferencia_eje():
    llantas = [ll(1, pos="E2-IZQ-EXT", prof=(12, 12, 12)), ll(2, pos="E2-IZQ-INT", prof=(8, 8, 8)),
               ll(3, pos="E2-DER-INT", lado="DER", prof=(11, 11, 11))]
    v = variables(llantas, U)
    assert v[2]["diferencia_par_dual"] == 4.0
    assert v[2]["diferencia_eje"] == 4.0 and v[1]["diferencia_eje"] == 0.0
    assert v[3]["diferencia_par_dual"] is None   # sola en su lado


def test_crear_una_regla_con_marcadores():
    regla = Regla(1, "Reencauchar", "REENCAUCHE", 1,
                  "Programar reencauche de la posición {posicion} ({profundidad} mm)",
                  condiciones=[Cond("profundidad_minima", "<=", "4"), Cond("reencauches", "<", "3")])
    llantas = [ll(1, prof=(3.8, 5, 5), posicion_label="Pos. 3", reencauches=1),
               ll(2, prof=(3.5, 5, 5), reencauches=3), ll(3, prof=(9, 9, 9))]
    s = sugerencias(llantas, [regla], U)
    assert list(s) == [1]
    assert s[1][0].texto == "Programar reencauche de la posición Pos. 3 (3.8 mm)"
    assert s[1][0].valores == {"profundidad_minima": 3.8, "reencauches": 1}


def test_regla_sobre_el_par_dual():
    regla = Regla(1, "Dual", "ROTACION", 2, "Rotar {codigo}", condiciones=[Cond("diferencia_par_dual", ">", "3")])
    llantas = [ll(1, pos="E2-IZQ-EXT", prof=(12, 12, 12)), ll(2, pos="E2-IZQ-INT", prof=(8.5, 8.5, 8.5)),
               ll(3, pos="E1-IZQ", eje=1, prof=(4, 4, 4))]
    assert sorted(sugerencias(llantas, [regla], U)) == [1, 2]


def test_regla_desactivada_no_sugiere():
    regla = Regla(1, "X", "OTRO", 1, "x", activa=False, condiciones=[Cond("presion", ">", "0")])
    assert sugerencias([ll(1)], [regla], U) == {}


def test_reglas_iniciales_equivalen_a_las_alertas():
    reglas = [Regla(i, r["nombre"], r["tipo"], r["prioridad"], r["texto"],
                    condiciones=[Cond(*c) for c in r["condiciones"]]) for i, r in enumerate(reglas_iniciales(U), 1)]
    llantas = [ll(1, prof=(2.8, 3, 3)), ll(2, pos="E2-DER-EXT", lado="DER", presion=130, prof=(9, 9, 9))]
    s = sugerencias(llantas, reglas, U)
    assert {x.tipo for x in s[1]} == {"RETIRO", "ALINEACION"}
    assert [x.tipo for x in s[2]] == ["PRESION"]
    assert "{" not in s[1][0].texto


def test_validar_condicion():
    assert validar_condicion("profundidad_minima", "<=", "4") is None
    assert validar_condicion("inventado", "=", "1") is not None
    assert validar_condicion("presion", "<", "mucho") is not None
    assert validar_condicion("estado_visual", "<", "BUENO") is not None
    assert validar_condicion("estado_visual", "=", "pésimo") is not None
    assert validar_condicion("vida", "=", "r2") is None
