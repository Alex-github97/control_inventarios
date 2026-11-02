"""
Reglas de la planta de reencauche que no necesitan base de datos.
"""
import pytest

from app.core.reencauche_reglas import comparar_variables, evaluar_mediciones, excede_limite, pct, por_cien
from app.core.reencauche_semilla import ETAPAS, codigo_de, DEFECTOS, MOTIVOS

RASPADO = [{"clave": "diametro", "nombre": "Diámetro de raspado", "unidad": "mm", "tipo": "NUMERO"},
           {"clave": "ancho", "nombre": "Ancho de raspado", "unidad": "mm", "tipo": "NUMERO"}]
LIMITES = {"diametro": {"min": 1010, "max": 1030}, "ancho": {"min": 220, "max": 240}}

RECETA = {"temperatura_c": 98, "temperatura_tol": 3, "presion_bar": 6, "presion_tol": 0.5, "vacio_bar": -0.8,
          "vacio_tol": 0.1, "tiempo_min": 180, "tiempo_tol": 5}


def test_medicion_dentro_de_tolerancia():
    meds, fuera = evaluar_mediciones(RASPADO, {"diametro": 1020, "ancho": "230"}, LIMITES)
    assert not fuera and all(m["conforme"] for m in meds)
    assert meds[1]["valor"] == 230.0


def test_raspado_dos_mm_bajo_el_minimo_queda_fuera():
    meds, fuera = evaluar_mediciones(RASPADO, {"diametro": 1008, "ancho": 230}, LIMITES)
    assert fuera
    assert meds[0] == {"clave": "diametro", "nombre": "Diámetro de raspado", "valor": 1008.0, "unidad": "mm",
                       "min": 1010.0, "max": 1030.0, "conforme": False}


def test_sin_especificacion_se_registra_sin_comparar():
    meds, fuera = evaluar_mediciones(RASPADO, {"diametro": 1, "ancho": 2}, None)
    assert not fuera and all(m["conforme"] is None for m in meds)


def test_falta_una_medicion_o_no_es_numero():
    with pytest.raises(ValueError, match="Falta la medición «Ancho de raspado»"):
        evaluar_mediciones(RASPADO, {"diametro": 1020}, LIMITES)
    with pytest.raises(ValueError, match="debe ser un número"):
        evaluar_mediciones(RASPADO, {"diametro": "mucho", "ancho": 230}, LIMITES)


def test_prueba_de_vacio_si_no():
    defin = [{"clave": "vacio_conforme", "nombre": "Conserva el vacío", "tipo": "SI_NO"}]
    assert evaluar_mediciones(defin, {"vacio_conforme": False}, None) == (
        [{"clave": "vacio_conforme", "nombre": "Conserva el vacío", "valor": False, "unidad": "", "conforme": False}], True)
    assert evaluar_mediciones(defin, {"vacio_conforme": True}, None)[1] is False


def test_ciclo_conforme():
    det, ok, desviadas = comparar_variables(RECETA, {"temperatura": 99, "presion": 6.2, "vacio": -0.85, "tiempo": 182})
    assert ok and desviadas == [] and det["tiempo"]["objetivo"] == 180


def test_ciclo_ocho_minutos_corto_se_desvia_en_tiempo():
    det, ok, desviadas = comparar_variables(RECETA, {"temperatura": 98, "presion": 6, "vacio": -0.8, "tiempo": 172})
    assert not ok and desviadas == ["tiempo"] and det["tiempo"]["conforme"] is False


def test_tolerancia_exacta_es_conforme():
    assert comparar_variables(RECETA, {"temperatura": 101, "presion": 5.5, "vacio": -0.9, "tiempo": 185})[1]


def test_variable_faltante():
    with pytest.raises(ValueError, match="presión"):
        comparar_variables(RECETA, {"temperatura": 98, "vacio": -0.8, "tiempo": 180})


def test_limite_de_reparacion():
    assert excede_limite(45, 25)          # corte de 45 mm en un costado con límite de 25
    assert not excede_limite(25, 25)
    assert excede_limite(1, 0)            # límite 0: esa zona no se repara
    assert not excede_limite(300, None)   # sin límite configurado no se bloquea


def test_porcentajes():
    assert pct(820, 1000) == 82.0
    assert pct(6, 40) == 15.0
    assert por_cien(14, 2000) == 0.7
    assert pct(1, 0) is None


def test_la_ruta_en_frio_tiene_quince_etapas_y_cuatro_decisiones():
    assert len(ETAPAS) == 15
    decisiones = [e[0] for e in ETAPAS if e[3]]
    assert decisiones == ["INSP_INICIAL", "INSP_RASPADO", "DESENVELOPADO", "INSP_FINAL"]
    opcionales = [e[0] for e in ETAPAS if not e[9]]
    assert opcionales == ["DESTALONADO", "ESCARIADO"]


def test_codigos_de_catalogo_no_se_repiten():
    codigos = [codigo_de(n, z[:3]) for z, ns in DEFECTOS.items() for n in ns]
    assert len(codigos) == len(set(codigos))
    motivos = [codigo_de(n, "MR") for n in MOTIVOS]
    assert len(motivos) == len(set(motivos))
