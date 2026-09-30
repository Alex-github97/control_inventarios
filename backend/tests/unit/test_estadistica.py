"""
Las cartas y las comparaciones tienen que acertar donde se sabe la respuesta:
detectar un cambio que se sembró, callarse donde no hay nada y no inventar
diferencias cuando se hacen muchas comparaciones con datos iguales.
"""
import numpy as np

from app.core.analitica.estadistica import (
    benjamini_hochberg, carta_imr, carta_p_laney, comparar_grupos, mann_whitney,
)


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
