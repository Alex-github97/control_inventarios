"""Cruce de tarifas de clientes contra SICETAC (app/core/tarifax_comparativo.py)."""
import pandas as pd

from app.core import tarifax_comparativo as tc

MAPEO = {"TRACTOCAMION": "3S2", "TURBO": "2L3 Liviano entre 7.5 y 8 Tonel.", "SENCILLO": "2"}


def sicetac(*filas):
    return tc.agrupar_sicetac(pd.DataFrame(filas, columns=[
        "ORIGEN", "DESTINO", "TIPO_VEHICULO", "TIPO_CARROCERIA", "COSTO_TOTAL_VIAJE", "DISTANCIA"]))


def neg(i, origen, destino, tipo, tarifa):
    return {"id": i, "cliente": "CLIENTE", "servicio": "MASIVO", "origen": origen, "destino": destino,
            "categoria_vehiculo": tc.categoria_de(tipo), "tarifa": tarifa}


def test_categoria_solo_para_tarifas_por_vehiculo():
    assert tc.categoria_de("POR TIPO DE VEHICULO TURBO") == "TURBO"
    assert tc.categoria_de("por tipo de vehículo tractomula") == "TRACTOMULA"
    assert tc.categoria_de("TARIFA POR KILO") is None
    assert tc.categoria_de(None) is None


def test_normaliza_tildes_espacios_y_mayusculas():
    assert tc.normalizar("  Bogotá   d.c. ") == "BOGOTA D.C."


def test_variacion_contra_sicetac_por_carroceria():
    sic = sicetac(("FUNZA", "CALI", "3S2", "FURGON", 1000, 455), ("FUNZA", "CALI", "3S2", "ESTACAS", 800, 455))
    filas = tc.cruzar([neg(1, "Funza", "Cali", "POR TIPO DE VEHICULO TRACTOMULA", 1500)], sic, {}, MAPEO, "2026-01")
    por = {f["carroceria"]: f for f in filas}
    # TRACTOMULA no está en el mapeo, pero es sinónimo de TRACTOCAMION.
    assert por["FURGON"]["variacion_pct"] == 50.0 and por["FURGON"]["diferencia"] == 500
    assert por["ESTACAS"]["variacion_pct"] == 87.5
    assert all(f["estado"] == "OK" and f["tipo_vehiculo"] == "3S2" for f in filas)


def test_promedia_filas_repetidas_de_sicetac():
    sic = sicetac(("A", "B", "2", "FURGON", 100, 10), ("A", "B", "2", "FURGON", 300, 10))
    [f] = tc.cruzar([neg(1, "A", "B", "POR TIPO DE VEHICULO SENCILLO", 400)], sic, {}, MAPEO, "P")
    assert f["costo_sicetac"] == 200 and f["variacion_pct"] == 100.0


def test_equivalencia_de_ciudad():
    sic = sicetac(("BOGOTA, D.C.", "CALI", "2", "FURGON", 100, 450))
    sin = tc.cruzar([neg(1, "BOGOTA", "CALI", "POR TIPO DE VEHICULO SENCILLO", 90)], sic, {}, MAPEO, "P")
    con = tc.cruzar([neg(1, "BOGOTA", "CALI", "POR TIPO DE VEHICULO SENCILLO", 90)], sic, {"BOGOTA": "BOGOTA, D.C."}, MAPEO, "P")
    assert sin[0]["estado"] == "SIN_RUTA"
    assert con[0]["estado"] == "OK" and con[0]["variacion_pct"] == -10.0


def test_sin_equivalencia_de_vehiculo_y_no_comparables():
    sic = sicetac(("A", "B", "2", "FURGON", 100, 10))
    filas = tc.cruzar([
        neg(1, "A", "B", "POR TIPO DE VEHICULO DOBLETROQUE", 100),   # sin mapeo
        neg(2, "A", "B", "TARIFA POR KILO", 100),                     # no es por viaje
        neg(3, "A", "B", "POR TIPO DE VEHICULO SENCILLO", 0),         # tarifa en cero
    ], sic, {}, MAPEO, "P")
    assert [f["estado"] for f in filas] == ["SIN_VEHICULO"]


def test_nombre_del_periodo():
    assert tc.nombre_periodo("2026-03") == "Marzo 2026"
    assert tc.nombre_periodo("VIGENTE") == "Tarifario TarifaX vigente"


def test_valor_hora_logistica_del_archivo_sicetac():
    base = pd.DataFrame([("A", "B", "2", "FURGON", 100, 10, 7), ("A", "B", "2", "FURGON", 300, 10, 9)],
                        columns=["ORIGEN", "DESTINO", "TIPO_VEHICULO", "TIPO_CARROCERIA", "COSTO_TOTAL_VIAJE",
                                 "DISTANCIA", "VALOR_HORA_LOGISTICA"])
    [f] = tc.cruzar([neg(1, "A", "B", "POR TIPO DE VEHICULO SENCILLO", 400)], tc.agrupar_sicetac(base), {}, MAPEO, "P")
    assert f["valor_hora"] == 8 and f["costo_sicetac"] == 200


def test_sin_valor_hora_en_el_archivo_queda_vacio():
    [f] = tc.cruzar([neg(1, "A", "B", "POR TIPO DE VEHICULO SENCILLO", 400)],
                    sicetac(("A", "B", "2", "FURGON", 100, 10)), {}, MAPEO, "P")
    assert f["valor_hora"] is None


def test_extrae_el_vehiculo_del_tipo_de_tarifa_en_cualquier_posicion():
    assert tc.categoria_de("TARIFA TURBO") == "TURBO"
    assert tc.categoria_de("TRACTOMULA X VIAJE") == "TRACTOMULA"      # el compuesto, no «MULA»
    assert tc.categoria_de("Tarifa doble troque") == "DOBLETROQUE"
    assert tc.categoria_de("POR METRO CUBICO 0,5 A 5") is None
    assert tc.categoria_de("TURBO POR KILO") is None                  # por peso no es por viaje
    assert tc.categoria_de("RANGO DE KILOS 1 A 500") is None


def test_la_comparacion_guarda_el_tipo_de_tarifa():
    n = {**neg(1, "A", "B", "POR TIPO DE VEHICULO SENCILLO", 150), "tipo_tarifa": "POR TIPO DE VEHICULO SENCILLO"}
    [f] = tc.cruzar([n], sicetac(("A", "B", "2", "FURGON", 100, 10)), {}, MAPEO, "P")
    assert f["tipo_tarifa"] == "POR TIPO DE VEHICULO SENCILLO" and f["categoria"] == "SENCILLO"
