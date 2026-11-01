"""
Hallazgos y resúmenes de los informes PDF de rendimiento y composición.
"""
import re
from datetime import datetime

from app.core.informe_rendimiento_pdf import (
    Datos, comparables, dinero, generar, hallazgo, lectura, num, pct, resumen_composicion, resumen_vidas,
)
from app.core.pdf_marca import Encabezado


def grupo(cat, cpk, vidas=10, km=50_000, km_mm=5_000, km_total=1_000_000):
    return {"categoria": cat, "vidas": vidas, "llantas": vidas, "terminadas": vidas, "cpk": cpk, "n_cpk": vidas,
            "cpk_min": cpk, "cpk_max": cpk, "km_promedio": km, "km_mediana": km, "km_max": km, "n_km": vidas,
            "km_mm": km_mm, "mm_promedio": 10, "n_km_mm": vidas, "km_total": km_total, "costo_total": cpk * km_total}


GRUPOS = [grupo("A", 20.0), grupo("B", 15.0), grupo("C", 30.0), grupo("D", 1.0, vidas=2)]


def test_numeros_con_puntuacion_colombiana():
    assert num(1234567.891, 2) == "1.234.567,89"
    assert num(None) == "-"
    assert pct(97, 28557) == "0,3 %" and pct(1, 4) == "25 %"
    assert dinero(199_643_900_000) == "$199.644 M"


def test_comparables_respeta_la_muestra_y_ordena():
    assert [g["categoria"] for g in comparables(GRUPOS, "cpk", 5)] == ["B", "A", "C"]
    assert [g["categoria"] for g in comparables(GRUPOS, "km_mm", 5)][0] in {"A", "B", "C"}


def test_hallazgo_nombra_el_mejor_y_la_brecha_con_la_flota():
    h = hallazgo("marca", GRUPOS, "cpk", 5, flota=20.0)
    assert h == "La marca «B» logra el menor costo por kilómetro: $15,00/km, 25 % por debajo de la flota"
    assert hallazgo("marca", GRUPOS[:1], "cpk", 5, 20.0) is None


def test_lectura_con_el_otro_extremo_la_brecha_y_el_ahorro():
    frases = lectura("marca", GRUPOS, "cpk", 5)
    assert frases[0] == "En el otro extremo, «C» registra $30,00/km."
    assert "2,0 veces" in frases[1]
    # (30 - 15) $/km por el millón de km de «C».
    assert "$15.000.000" in frases[2]
    assert "1 quedan fuera" in frases[3]


def test_resumen_de_vidas():
    vidas = [{"codigo": f"L{i}", "vida": "VN", "terminada": i % 2 == 0, "km": 10_000 * i, "cpk": 10 + i,
              "km_mm": 1000, "motivo_fin": "Desgaste" if i < 6 else "Daño"} for i in range(1, 11)]
    r = resumen_vidas(vidas, km_minimo=1000, tope=2)
    assert (r.total, r.terminadas, r.en_servicio) == (10, 5, 5)
    assert r.km_mediana == 55_000
    assert r.motivos == [("Daño", 3), ("Desgaste", 2)]
    assert [v["codigo"] for v in r.mejores] == ["L2", "L4"]
    assert [v["codigo"] for v in r.peores] == ["L10", "L8"]
    assert sum(n for _, n in r.distribucion_km) == 10


def test_resumen_de_composicion():
    frases = resumen_composicion({"Marca": [("X", 60), ("Y", 30), ("Z", 10)], "Medida": [("295", 100)],
                                  "Vida": [("VN", 75), ("R1", 25)]}, 100)
    assert frases[0] == "«X» concentra el 60 % del parque montado."
    assert any("25 % de las llantas a piso ya fue reencauchada" in f for f in frases)


def test_los_seis_informes_se_generan():
    rend = {"resumen": grupo("Flota", 20.0, vidas=40), "dimensiones": [
        {"clave": c, "nombre": n, "grupos": GRUPOS} for c, n in
        (("marca", "Marca"), ("referencia", "Referencia"), ("medida", "Medida"), ("vida", "Vida"))]}
    enc = Encabezado("Empresa", "Todo el histórico", "Prueba", datetime(2026, 11, 1))
    parque = {"llantas": 100, "bajo_minimo": 3, "profundidad_minima": 3.0, "ir": {"ir": 0.5},
              "por_marca": [{"categoria": "A", "llantas": 100, "profundidad_promedio": 9.0, "bajo_minimo": 3, "ir": 0.5}],
              "por_referencia": [], "por_medida": []}
    vidas = resumen_vidas([{"codigo": "L1", "vida": "VN", "terminada": True, "km": 50_000, "cpk": 12, "km_mm": 900}], 1000)
    for tipo in ("TABLERO", "CPK", "KM", "KM_MM", "VIDAS", "COMPOSICION"):
        d = Datos(rendimiento=rend, parque=parque, vidas=vidas, composicion={"Marca": [("A", 100)], "Vida": [("VN", 100)]},
                  composicion_total=100, descripcion="Todas las vidas")
        pdf = generar(tipo, d, enc)
        assert pdf[:5] == b"%PDF-" and len(re.findall(rb"/Type\s*/Page(?!s)", pdf)) >= 3, tipo
