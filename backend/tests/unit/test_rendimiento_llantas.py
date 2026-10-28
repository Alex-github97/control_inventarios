"""
CPK, rendimiento y km/mm de llantas.

Las cifras de una categoría salen del cociente de las sumas, no del promedio
de cada vida, y las vidas con muy pocos kilómetros no deforman el CPK.
"""
from datetime import datetime

from app.core.rendimiento_llantas import (
    VidaLlanta, agrupar, en_periodo, etiqueta_vida, grupo_vida, km_de_vida, mm_de_vida,
    resumir, suma_en_lapso,
)


def _vida(nid=1, km=None, mm=None, costo=None, terminada=True, inicio=None, fin=None, **categorias):
    return VidaLlanta(neumatico_id=nid, codigo=f"L{nid}", numero_vida=1, vida="VN",
                      terminada=terminada, fecha_inicio=inicio, fecha_fin=fin,
                      km=km, mm=mm, costo=costo, categorias=categorias)


def test_el_cpk_de_un_grupo_es_el_cociente_de_las_sumas():
    vidas = [_vida(1, km=100_000, mm=15, costo=2_000_000),
             _vida(2, km=10_000, mm=2, costo=1_000_000)]
    r = resumir(vidas)
    # (2.000.000 + 1.000.000) / 110.000 km, no el promedio de 20 y 100.
    assert r["cpk"] == round(3_000_000 / 110_000, 2)
    assert r["km_mm"] == round(110_000 / 17, 1)
    assert r["km_promedio"] == 55_000
    assert (r["cpk_min"], r["cpk_max"]) == (20.0, 100.0)


def test_las_vidas_cortas_no_entran_al_cpk_pero_si_se_cuentan():
    vidas = [_vida(1, km=80_000, mm=12, costo=1_600_000),
             _vida(2, km=300, mm=0.1, costo=1_500_000)]
    r = resumir(vidas, km_minimo=1000)
    assert r["cpk"] == 20.0
    assert r["n_cpk"] == 1
    assert r["vidas"] == 2
    assert r["costo_total"] == 3_100_000


def test_sin_kilometros_ni_desgaste_no_hay_cociente():
    r = resumir([_vida(1, km=None, mm=None, costo=500_000)])
    assert r["cpk"] is None and r["km_mm"] is None and r["km_promedio"] is None


def test_agrupar_reparte_por_categoria_y_marca_lo_que_falta():
    vidas = [_vida(1, km=50_000, costo=1_000_000, marca="Michelin"),
             _vida(2, km=40_000, costo=1_200_000, marca="Michelin"),
             _vida(3, km=60_000, costo=900_000)]
    grupos = {g["categoria"]: g for g in agrupar(vidas, "marca")}
    assert grupos["Michelin"]["vidas"] == 2
    assert grupos["Michelin"]["cpk"] == round(2_200_000 / 90_000, 2)
    assert grupos["Sin dato"]["cpk"] == 15.0


def test_la_vida_reencauchada_arranca_donde_termino_la_anterior():
    # Al reencauchar, la vida nueva queda con km_inicio = 0 aunque el contador
    # de la llanta siga en 90.000.
    assert km_de_vida(0, 150_000, km_fin_vida_anterior=90_000) == 60_000
    assert km_de_vida(0, 90_000, km_fin_vida_anterior=None) == 90_000
    assert km_de_vida(20_000, 15_000, None) is None


def test_mm_gastados():
    assert mm_de_vida(18, 4) == 14
    assert mm_de_vida(18, 18) is None
    assert mm_de_vida(None, 4) is None


def test_etiquetas_de_vida():
    assert etiqueta_vida("NUEVA", 1) == "VN"
    assert etiqueta_vida("REENCAUCHADA", 2) == "R1"
    assert grupo_vida("R2") == "R2"
    assert grupo_vida("R4") == "R3+"


def test_costos_solo_dentro_de_la_vida():
    eventos = [(datetime(2026, 1, 5), 100), (datetime(2026, 3, 1), 50), (datetime(2026, 6, 1), 30)]
    assert suma_en_lapso(eventos, datetime(2026, 1, 1), datetime(2026, 3, 1)) == 100
    assert suma_en_lapso(eventos, datetime(2026, 3, 1), None) == 80


def test_periodo_toma_las_vidas_que_rodaron_en_el():
    v = _vida(inicio=datetime(2026, 1, 1), fin=datetime(2026, 4, 1))
    assert en_periodo(v, datetime(2026, 3, 1), datetime(2026, 5, 1))
    assert not en_periodo(v, datetime(2026, 5, 1), None)
    abierta = _vida(terminada=False, inicio=datetime(2026, 1, 1))
    assert en_periodo(abierta, datetime(2026, 9, 1), None)
    assert not en_periodo(abierta, None, datetime(2025, 12, 1))
