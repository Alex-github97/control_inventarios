"""
El ajuste tiene que recuperar parámetros conocidos. Se simulan vidas de una
Weibull con β y η fijos, se censura una parte como en una flota real (equipos
que siguen andando al cortar) y se comprueba que el ajuste vuelve a dar lo que
se simuló. Si no lo hace con datos de laboratorio, no hay que creerle con los
de un taller.
"""
import math

import numpy as np

from app.core.analitica.weibull import (
    ajustar_weibull, crow_amsaa, prob_falla_condicional, reemplazo_optimo, vida_b,
)


def _muestra(beta, eta, n, corte, semilla=7):
    rng = np.random.default_rng(semilla)
    vidas = eta * rng.weibull(beta, n)
    cortes = rng.uniform(0, corte, n)
    t = np.minimum(vidas, cortes)
    return t, vidas <= cortes


def test_recupera_desgaste_con_censura():
    t, d = _muestra(2.5, 80_000, 400, 160_000)
    assert 0.2 < 1 - d.mean() < 0.8          # hay censura de verdad
    r = ajustar_weibull(t, d)
    assert r["suficiente"]
    assert abs(r["beta"] - 2.5) / 2.5 < 0.12
    assert abs(r["eta"] - 80_000) / 80_000 < 0.08
    assert r["ic90_beta"][0] < 2.5 < r["ic90_beta"][1]
    assert r["patron"] == "DESGASTE"
    assert r["p_valor_vs_exponencial"] < 0.001


def test_ignorar_la_censura_acorta_la_vida():
    """La razón de ser de la censura: sin ella, η sale mucho menor."""
    t, d = _muestra(2.5, 80_000, 400, 120_000)
    con = ajustar_weibull(t, d)["eta"]
    sin = ajustar_weibull(t[d], np.ones(int(d.sum()), bool))["eta"]
    assert sin < con * 0.85


def test_tasa_constante_no_se_confunde_con_desgaste():
    t, d = _muestra(1.0, 500, 300, 2000, semilla=3)
    r = ajustar_weibull(t, d)
    assert r["patron"] == "ALEATORIA"
    assert r["p_valor_vs_exponencial"] > 0.05


def test_pocas_fallas_no_ajusta():
    r = ajustar_weibull([100, 200, 300, 400], [True, True, True, False])
    assert not r["suficiente"] and r["fallas"] == 3


def test_probabilidad_condicional_y_b10():
    assert abs(vida_b(1.0, 1000, 0.10) - 1000 * -math.log(0.9)) < 1e-6
    # Sin memoria: con β = 1 la edad no cambia el riesgo
    a = prob_falla_condicional(0, 100, 1.0, 1000)
    b = prob_falla_condicional(5000, 100, 1.0, 1000)
    assert abs(a - b) < 1e-9
    # Con desgaste, la pieza vieja es más riesgosa
    assert prob_falla_condicional(900, 100, 3.0, 1000) > prob_falla_condicional(100, 100, 3.0, 1000)


def test_reemplazo_solo_con_desgaste_y_falla_cara():
    assert reemplazo_optimo(0.8, 1000, 100, 1000) is None
    assert reemplazo_optimo(3.0, 1000, 1000, 500) is None
    r = reemplazo_optimo(3.0, 1000, 100, 1000)
    assert r and 0 < r["edad"] < 1000 and r["ahorro_pct"] > 0
    # Prevenir casi tan caro como fallar: el óptimo se va al infinito y no
    # debe salir como recomendación con 0 % de ahorro.
    assert reemplazo_optimo(3.064, 73035, 2_400_000, 2_527_928) is None


def test_crow_amsaa_detecta_deterioro():
    # Fallas que se aceleran: t_i = T (i/n)^(1/β) con β = 2.5
    T, n = 10_000, 25
    tiempos = [T * (i / n) ** (1 / 2.5) for i in range(1, n + 1)]
    r = crow_amsaa(tiempos, T)
    assert r["tendencia"] == "DETERIORO" and r["beta"] > 1.8
    # Espaciado uniforme: sin tendencia
    r2 = crow_amsaa([T * i / n for i in range(1, n + 1)], T)
    assert r2["tendencia"] == "ESTABLE"
