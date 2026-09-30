"""
El pronóstico tiene que elegir el método correcto donde la respuesta se
conoce: estacional para una serie estacional, Croston para una intermitente,
y no inventar tendencia en una serie plana.
"""
import numpy as np

from app.core.aps.pronostico import clasificar_demanda, pronosticar, z_servicio


def test_estacional_elige_holt_winters_y_acierta_el_pico():
    rng = np.random.default_rng(1)
    meses = np.arange(36)
    y = 1000 + 400 * np.sin(2 * np.pi * meses / 12) + rng.normal(0, 40, 36)
    r = pronosticar(y, 12)
    assert r["metodo"] == "HOLT_WINTERS"
    real = 1000 + 400 * np.sin(2 * np.pi * np.arange(36, 48) / 12)
    assert np.mean(np.abs(np.array(r["pronostico"]) - real)) < 120
    assert r["fva_pct"] > 30          # le quita buena parte del error al ingenuo


def test_intermitente_usa_croston_o_promedio_y_no_un_mes_cero():
    rng = np.random.default_rng(2)
    y = np.where(rng.random(30) < 0.25, rng.integers(20, 40, 30), 0).astype(float)
    assert clasificar_demanda(y)["tipo"] in ("INTERMITENTE", "IRREGULAR")
    r = pronosticar(y, 3)
    assert any(c["metodo"] == "CROSTON" for c in r["comparacion"])
    assert 2 < r["pronostico"][0] < 15      # tasa media por mes, no cero ni un pico


def test_plana_no_inventa_tendencia():
    rng = np.random.default_rng(3)
    y = 500 + rng.normal(0, 30, 24)
    r = pronosticar(y, 6)
    assert abs(r["pronostico"][-1] - 500) < 60
    assert r["inferior"][0] < r["pronostico"][0] < r["superior"][0]
    assert r["superior"][5] - r["inferior"][5] > r["superior"][0] - r["inferior"][0]


def test_pocos_datos_lo_dice():
    r = pronosticar([10, 12, 11], 3)
    assert not r["suficiente"] and r["metodo"] == "PROMEDIO"


def test_z_servicio():
    assert abs(z_servicio(95) - 1.645) < 0.01
    assert abs(z_servicio(50)) < 1e-9
