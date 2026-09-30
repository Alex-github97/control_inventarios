"""
Las cartas y las comparaciones tienen que acertar donde se sabe la respuesta:
detectar un cambio que se sembró, callarse donde no hay nada y no inventar
diferencias cuando se hacen muchas comparaciones con datos iguales.
"""
import numpy as np

from app.core.analitica.estadistica import (
    benjamini_hochberg, carta_c, carta_imr, carta_p_laney, comparar_grupos, mann_kendall,
    mann_whitney, regresion_lineal,
)
from app.core.analitica.estadistica import kaplan_meier, spearman, supervivencia_en
from app.core.analitica.texto import agrupar


def test_kaplan_meier_con_abiertos_no_acorta_el_tiempo():
    rng = np.random.default_rng(12)
    reales = rng.exponential(30, 200)              # mediana real = 30·ln2 ≈ 20,8
    corte = rng.uniform(0, 60, 200)
    t = np.minimum(reales, corte)
    cerrado = reales <= corte
    km = kaplan_meier(t, cerrado)
    solo_cerrados = float(np.median(t[cerrado]))
    assert abs(km["mediana"] - 20.8) < 4
    assert solo_cerrados < km["mediana"]           # el sesgo que KM corrige
    valores = [v for _, v in km["curva"]]
    assert valores[0] == 1.0 and all(a >= b for a, b in zip(valores, valores[1:]))
    assert supervivencia_en(km["curva"], km["mediana"]) <= 0.5 < supervivencia_en(km["curva"], km["mediana"] - 1)


def test_spearman():
    x = np.arange(12)
    assert spearman(x, x ** 2)["rho"] == 1.0
    r = spearman(x, np.random.default_rng(13).normal(0, 1, 12))
    assert r["p"] > 0.05


def test_mann_kendall_distingue_tendencia_de_ruido():
    rng = np.random.default_rng(8)
    sube = rng.poisson(np.linspace(3, 9, 24))
    r = mann_kendall(sube)
    assert r["tendencia"] == "SUBE" and r["pendiente"] > 0
    plano = rng.poisson(5, 24)
    assert mann_kendall(plano)["tendencia"] == "ESTABLE"
    assert not mann_kendall([1, 2, 3])["suficiente"]


def test_regresion_con_intervalo():
    x = np.arange(18)
    y = 85 - 1.2 * x + np.random.default_rng(9).normal(0, 1.5, 18)
    r = regresion_lineal(x, y)
    assert r["significativa"] and r["ic90"][0] < -1.2 < r["ic90"][1]
    ruido = regresion_lineal(x, 80 + np.random.default_rng(10).normal(0, 2, 18))
    assert not ruido["significativa"]


def test_carta_c_marca_un_mes_anomalo():
    conteos = [4, 5, 3, 6, 4, 5, 4, 3, 5, 4, 6, 5, 4, 18, 5]
    c = carta_c(conteos, [str(i) for i in range(15)])
    assert "Fuera de los límites de control" in c["serie"][13]["alertas"]


def test_agrupa_textos_del_mismo_problema():
    textos = [
        "Remisión entregada sin firma del cliente", "Falta firma del cliente en la remisión de entrega",
        "Remisiones sin firma de recibido del cliente", "Guía de entrega sin firma del cliente",
        "Temperatura fuera de rango en furgón refrigerado", "Furgón refrigerado con temperatura fuera de rango",
        "Registro de temperatura del furgón refrigerado fuera de rango",
        "Error en la factura del cliente", "Cliente reporta llamada tardía",
        "Extintor vencido",   # palabras que no aparecen en ningún otro texto
    ]
    r = agrupar(textos)
    conjuntos = [set(g["indices"]) for g in r["grupos"]]
    assert any({0, 1, 2}.issubset(s) for s in conjuntos)
    assert any({4, 5, 6}.issubset(s) for s in conjuntos)
    assert not any(s & {0, 1, 2} and s & {4, 5, 6} for s in conjuntos)


def test_imr_detecta_un_cambio_de_nivel():
    rng = np.random.default_rng(1)
    x = list(rng.normal(70, 2, 30)) + list(rng.normal(62, 2, 15))
    c = carta_imr(x, [str(i) for i in range(len(x))])
    assert c["suficiente"] and 66 < c["centro"] < 74
    # Casi todo lo posterior al cambio se marca; antes, a lo sumo algunas
    # falsas alarmas (el periodo base de esta semilla salió muy quieto).
    despues = [bool(p["alertas"]) for p in c["serie"][30:]]
    antes = [bool(p["alertas"]) for p in c["serie"][:30]]
    assert sum(despues) / len(despues) >= 0.8
    assert sum(antes) <= 3


def test_imr_estable_casi_sin_falsas_alarmas():
    rng = np.random.default_rng(2)
    x = rng.normal(70, 2, 60)
    c = carta_imr(x, [str(i) for i in range(60)])
    fuera = sum(1 for p in c["serie"] if "Fuera de los límites de control" in p["alertas"])
    assert fuera <= 1


def test_laney_no_marca_todo_con_sobredispersion():
    """Con miles de unidades por corrida y variación real entre corridas, la
    carta p clásica marcaría casi todo; la de Laney no."""
    rng = np.random.default_rng(3)
    tam = rng.integers(3000, 6000, 40)
    tasas = np.clip(rng.normal(0.03, 0.006, 40), 0.001, None)
    d = rng.binomial(tam, tasas)
    c = carta_p_laney(d, tam, [str(i) for i in range(40)])
    assert c["sobredispersion"] > 2
    fuera = sum(1 for p in c["serie"] if "Fuera de los límites de control" in p["alertas"])
    assert fuera <= 2


def test_laney_detecta_una_corrida_mala():
    rng = np.random.default_rng(4)
    tam = np.full(30, 1000)
    d = rng.binomial(tam, 0.02)
    d[25] = 120
    c = carta_p_laney(d, tam, [str(i) for i in range(30)])
    assert "Fuera de los límites de control" in c["serie"][25]["alertas"]


def test_mann_whitney_y_correccion():
    rng = np.random.default_rng(5)
    p, prob = mann_whitney(rng.normal(5, 1, 40), rng.normal(3, 1, 40))
    assert p < 0.001 and prob > 0.8
    ajust = benjamini_hochberg([0.01, 0.04, 0.03, 0.5])
    assert ajust[0] == 0.04 and all(a >= b for a, b in zip(ajust, [0.01, 0.04, 0.03, 0.5]))


def test_comparar_encuentra_al_operario_malo_y_nada_mas():
    rng = np.random.default_rng(6)
    corridas = []
    for i in range(300):
        # El turno se reparte al azar: con i % 3, OP3 caía siempre de
        # mañana y la mañana salía «culpable» por confusión, no por causa.
        op = f"OP{i % 6}"
        turno = ["M", "T", "N"][int(rng.integers(0, 3))]
        tasa = rng.normal(2.0, 0.5) + (1.5 if op == "OP3" else 0)
        corridas.append({"operario": op, "turno": turno, "tasa": tasa})
    r = comparar_grupos(corridas, {"operario": "Operario", "turno": "Turno"})
    sig = [x for x in r if x["significativo"]]
    assert any(x["nivel"] == "OP3" and x["media"] > x["media_resto"] for x in sig)
    assert not any(x["factor"] == "Turno" for x in sig)
    # Sin efecto espejo: los demás operarios no salen «mejores que el resto»
    # solo porque el resto incluye a OP3.
    assert [x["nivel"] for x in sig] == ["OP3"]
