"""Cubicaje: lecturas, calibración y geometría con casos de resultado conocido."""
import pytest

from app.core.wms_cubicaje import (
    ajustar_eje, ajustar_peso, armar_estiba, cajas_por_cama, cuantas_caben, procesar_lecturas,
)

CAL = {"base_x_mm": 800, "base_y_mm": 600, "base_z_mm": 700, "escala_x": 1, "escala_y": 1, "escala_z": 1,
       "tara_crudo": 1000, "escala_peso": 0.5}


def test_lecturas_mediana_resiste_una_lectura_mala():
    m = procesar_lecturas({"x": [400, 400, 401, 399, 400], "y": [300, 300, 300], "z": [500, 500, 500],
                           "peso": [5000, 5000, 5002]}, CAL, tolerancia_mm=2)
    assert (m.largo_cm, m.ancho_cm, m.alto_cm) == (40.0, 30.0, 20.0)
    assert m.peso_kg == 2.0          # (5000 − 1000) × 0,5 g = 2000 g
    assert m.estable


def test_lecturas_inestables_se_marcan():
    m = procesar_lecturas({"x": [400, 420, 380], "y": [300], "z": [500]}, CAL, tolerancia_mm=2)
    assert not m.estable and any("inestables" in a for a in m.avisos)


def test_eje_sin_calibrar_no_inventa_medida():
    m = procesar_lecturas({"x": [400], "y": [300], "z": [500]}, {**CAL, "base_z_mm": None})
    assert m.alto_cm is None and any("no está calibrado" in a for a in m.avisos)


def test_calibracion_recupera_base_y_escala():
    base, escala = 812.0, 1.012
    muestras = [(base - real / escala, real) for real in (100.0, 250.0, 400.0)]
    b, e = ajustar_eje(muestras)
    assert b == pytest.approx(base, abs=0.01) and e == pytest.approx(escala, abs=1e-6)


def test_calibracion_con_un_bloque_fija_la_base():
    assert ajustar_eje([(700.0, 100.0)]) == (800.0, 1.0)


def test_calibracion_rechaza_escala_absurda():
    with pytest.raises(ValueError):
        ajustar_eje([(700, 100), (600, 500)])


def test_bascula():
    tara, esc = ajustar_peso([(1000, 0), (21000, 10000)])
    assert tara == 1000 and esc == 0.5


def test_cajas_por_cama_patron_mixto():
    # 40×30 en 120×100: en una sola orientación caben 9; con dos bloques, 10.
    n, patron = cajas_por_cama((120, 100), 40, 30)
    assert n == 10 and "girado" in patron


def test_armar_estiba_limitada_por_peso():
    r = armar_estiba((40, 30, 25), peso_caja_kg=20, alto_max_cm=150, peso_max_kg=800)
    # alto: (150 − 14,5) // 25 = 5 camas; peso: 800 // (20 × 10) = 4 camas.
    assert (r["ti"], r["hi"], r["cajas"], r["limita"]) == (10, 4, 40, "peso")


def test_cuantas_caben_prueba_orientaciones():
    # 100×50×40 con caja 30×40×20 (alto 20): de pie caben 3 × 1 × 2 = 6;
    # acostada (30×20×40) también 6. Ante el empate se queda de pie.
    n, orient = cuantas_caben((100, 50, 40), (30, 40, 20))
    assert n == 6 and orient[2] == 20
    # «Este lado arriba»: sin acostarla, el alto 20 se conserva y también son 6.
    n2, _ = cuantas_caben((100, 50, 40), (30, 40, 20), rotar_alto=False)
    assert n2 == 6
