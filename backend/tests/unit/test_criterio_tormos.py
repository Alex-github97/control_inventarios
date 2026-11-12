"""Criterio de lubricación según Tormos (Reverté, 2005): límites, árbol de
Blevins para el silicio, relación sodio/boro y degradación relativa al aceite
nuevo."""
from app.core.normas_lubricacion import (
    LIMITES_MOTOR, PERCENTIL_CONDENA, diagnosticar, evaluar_muestra,
)

U = {"si": "ppm", "al": "ppm", "fe": "ppm", "cr": "ppm", "sn": "ppm", "pb": "ppm", "cu": "ppm",
     "na": "ppm", "b": "ppm", "k": "ppm", "tbn": "mgKOH/g", "combustible": "%", "agua": "%",
     "hollin": "%", "visc100": "cSt"}
# Límites de flota de ejemplo para los metales de desgaste.
FLOTA = {m: {"precaucion": 20.0, "condena": 40.0, "direccion": "ALTO"} for m in
         ("fe", "cr", "sn", "pb", "cu", "al")}


def regla(valores, **kw):
    ev = evaluar_muestra(valores=valores, unidades=U, estadisticos=FLOTA, **kw)
    return diagnosticar(ev)["codigo"], ev


def test_limites_del_libro():
    assert LIMITES_MOTOR["agua"]["condena"] == 0.25          # tabla 5.12, CMT-UPV
    assert LIMITES_MOTOR["combustible"]["condena"] == 4.0
    assert LIMITES_MOTOR["hollin"]["condena"] == 3.0
    assert LIMITES_MOTOR["si"]["precaucion"] == 15.0
    assert PERCENTIL_CONDENA == 96.0                          # 7.3.3


def test_piston_recalentado_aluminio_y_silicio_uno_a_uno():
    codigo, _ = regla({"si": 45, "al": 44, "fe": 50, "cr": 25})
    assert codigo == "PISTON_RECALENTADO"


def test_polvo_exterior_mucho_mas_silicio_que_aluminio():
    codigo, _ = regla({"si": 60, "al": 18, "fe": 50, "cr": 25})
    assert codigo == "POLVO_CON_DESGASTE"


def test_parte_alta_sin_aluminio():
    codigo, _ = regla({"si": 30, "al": 2, "fe": 50, "cr": 25, "sn": 25})
    assert codigo == "DESGASTE_PARTE_ALTA"


def test_aceite_sucio_o_filtro_sin_hierro_ni_cromo():
    codigo, _ = regla({"si": 30, "al": 10, "pb": 30})
    assert codigo == "SUCIEDAD_ACEITE_FILTRO"


def test_silicio_y_aluminio_sin_desgaste_es_toma_de_muestra():
    codigo, _ = regla({"si": 30, "al": 10})
    assert codigo == "POLVO_CONFIRMADO"


def test_silicio_sin_aluminio_antiespumante_o_sellador():
    assert regla({"si": 25, "al": 1})[0] == "SILICIO_SIN_ALUMINIO"   # < 40 ppm
    assert regla({"si": 80, "al": 1})[0] == "SILICIO_SELLADOR"       # ≥ 40 ppm


def test_sodio_sobre_boro_es_refrigerante():
    codigo, ev = regla({"na": 60, "b": 15})
    assert ev["relacion_na_b"] == 4.0
    assert codigo == "REFRIGERANTE_NA_B"
    # Con el boro normal (≈100 veces el sodio) no se dispara.
    assert regla({"na": 25, "b": 400})[0] != "REFRIGERANTE_NA_B"


def test_tbn_relativo_al_aceite_nuevo():
    # 4,5 de 10 nuevos: le queda el 45 % → condena aunque supere el mínimo absoluto.
    _, ev = regla({"tbn": 4.5}, tbn_nuevo=10.0)
    assert ev["hallazgos"]["tbn"]["estado"] == "CONDENA"
    _, ev = regla({"tbn": 5.8}, tbn_nuevo=10.0)
    assert ev["hallazgos"]["tbn"]["estado"] == "PRECAUCION"
    _, ev = regla({"tbn": 8.0}, tbn_nuevo=10.0)
    assert "tbn" not in ev["hallazgos"]
    # Sin ficha del producto, solo el mínimo absoluto de 2,0.
    _, ev = regla({"tbn": 4.5})
    assert "tbn" not in ev["hallazgos"]


def test_tbn_perdido_por_dilucion():
    codigo, _ = regla({"tbn": 4.0, "combustible": 4.5}, tbn_nuevo=10.0)
    assert codigo == "TBN_POR_DILUCION"


def test_viscosidad_contra_el_aceite_nuevo():
    _, ev = regla({"visc100": 10.0}, grado_sae="15W-40", visc100_nuevo=15.0)
    d = ev["desvio_viscosidad"]
    assert d["referencia"] == 15.0 and d["estado"] == "CONDENA" and d["criterio"] == "Aceite nuevo + Tormos"


def test_tendencia_por_tasa_no_confunde_envejecimiento_con_falla():
    # Mismo hierro por km de aceite (30 ppm a 10.000 km y 45 a 15.000): no es salto.
    _, ev = regla({"fe": 45}, anteriores={"fe": 30, "_vida": 10000}, vida=15000)
    assert not (ev["hallazgos"].get("fe") or {}).get("tendencia")
    # La tasa se triplica (30 a 10.000 km → 30 a 3.000 km) y el valor ya está en zona: salto.
    _, ev = regla({"fe": 30}, anteriores={"fe": 30, "_vida": 10000}, vida=3000)
    assert ev["hallazgos"]["fe"]["tendencia"]["estado"] == "CONDENA"


def test_aditivos_y_valores_infimos_no_disparan_tendencia():
    _, ev = regla({"b": 200, "fe": 9}, anteriores={"b": 40, "fe": 2})
    assert "b" not in ev["hallazgos"]          # el boro es aditivo
    assert "fe" not in ev["hallazgos"]         # 9 ppm, por debajo de la mitad del límite de 20


def test_percentil_de_flota_no_queda_bajo_el_ruido():
    from app.core.normas_lubricacion import limites_estadisticos
    lim = limites_estadisticos({"sn": [0.0] * 200 + [1.0] * 10})
    assert lim["sn"]["precaucion"] >= 5.0 and lim["sn"]["condena"] >= 10.0
