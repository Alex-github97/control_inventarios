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


OFICIAL = ["ORIGEN", "DESTINO", "TIPO_VEHICULO", "TIPO_CARROCERIA", "TIPO_CARGA", "CONDICION_CARGA", "VIA_ESTANDAR",
           "COSTO_HORA", "HORAS_LOGISTICAS", "COSTO_MOVILIZACION", "COSTO_TOTAL_VIAJE", "DISTANCIA"]


def test_sicetac_oficial_solo_via_estandar_cargado_y_por_tipo_de_carga():
    sic = tc.agrupar_sicetac(pd.DataFrame([
        ("IBAGUE", "SOGAMOSO", "2", "FURGON", "General", "CARGADO", "SI", 100, 8, 1000, 1800, 413),
        ("IBAGUE", "SOGAMOSO", "2", "FURGON", "Granel Sólido", "CARGADO", "SI", 90, 8, 900, 1620, 413),
        # Vía alterna y retorno vacío: otros costos, no entran al promedio.
        ("IBAGUE", "SOGAMOSO", "2", "FURGON", "General", "CARGADO", "NO", 100, 8, 5000, 5800, 450),
        ("IBAGUE", "SOGAMOSO", "2", "FURGON", "General", "VACIO", "SI", 100, 8, 9000, 9800, 413),
    ], columns=OFICIAL))
    por = {r.tipo_carga: r for r in sic.itertuples()}
    assert set(por) == {"GENERAL", "GRANEL SOLIDO"}
    g = por["GENERAL"]
    assert (g.costo, g.costo_mov, g.horas_sicetac, g.valor_hora) == (1800, 1000, 8, 100)
    filas = tc.cruzar([neg(1, "Ibague", "Sogamoso", "POR TIPO DE VEHICULO SENCILLO", 2000)], sic, {}, MAPEO, "2026-07")
    f = next(x for x in filas if x["tipo_carga"] == "GENERAL")
    assert (f["costo_mov"], f["horas_sicetac"], f["costo_sicetac"]) == (1000, 8, 1800)


def test_tarifario_sin_componentes_no_trae_movilizacion():
    f = tc.cruzar([neg(1, "Funza", "Cali", "POR TIPO DE VEHICULO SENCILLO", 1500)],
                  sicetac(("FUNZA", "CALI", "2", "FURGON", 1000, 455)), {}, MAPEO, "VIGENTE")[0]
    assert f["costo_mov"] is None and f["horas_sicetac"] is None and f["tipo_carga"] is None


def test_falta_de_columnas_dice_cuales_encontro(tmp_path):
    ruta = tmp_path / "marzo.csv"
    ruta.write_text("FECHA;MUNICIPIO_O;MUNICIPIO_D;VALOR\n2026-03-01;A;B;1\n", encoding="utf-8")
    try:
        tc.leer_sicetac_archivo(str(ruta), "marzo.csv")
        assert False, "debía fallar"
    except tc.ArchivoInvalido as e:
        assert "MUNICIPIO_O" in str(e) and "Columnas encontradas" in str(e)


def test_lectura_de_excel_informa_avance_con_total(tmp_path):
    ruta = tmp_path / "sic.xlsx"
    filas = [("TITULO DEL REPORTE",) + (None,) * (len(OFICIAL) - 1), tuple(OFICIAL)]
    filas += [("FUNZA", "CALI", "2", "FURGON", "General", "CARGADO", "SI", 100, 4, 1000, 1400, 455)] * 5
    pd.DataFrame(filas).to_excel(ruta, header=False, index=False)
    avances = []
    sic = tc.leer_sicetac_archivo(str(ruta), "sic.xlsx", lambda n, t: avances.append((n, t)))
    assert len(sic) == 1 and sic["costo"].iloc[0] == 1400
    assert avances[-1][0] == 5 and avances[-1][1] == 5


def test_vale_la_fecha_mas_reciente_y_no_el_promedio():
    cols = ["FECHA_SICETAC", "DPTO_ORIGEN", "ORIGEN", "DESTINO", "TIPO_VEHICULO", "TIPO_CARROCERIA", "COSTO_TOTAL_VIAJE"]
    sic = tc.agrupar_sicetac(pd.DataFrame([
        ("2026-07-01", "CUNDINAMARCA", "FUNZA", "CALI", "2", "FURGON", 1000),
        ("2026-07-15", "CUNDINAMARCA", "FUNZA", "CALI", "2", "FURGON", 1200),
        ("2026-07-15", "CUNDINAMARCA", "FUNZA", "CALI", "2", "FURGON", 1400),
    ], columns=cols))
    assert sic["costo"].tolist() == [1300] and sic["fecha"].tolist() == ["2026-07-15"]
    f = tc.cruzar([neg(1, "Funza", "Cali", "POR TIPO DE VEHICULO SENCILLO", 1300)], sic, {}, MAPEO, "2026-07")[0]
    assert f["fecha_sicetac"] == "2026-07-15" and f["variacion_pct"] == 0


def test_formato_con_departamento_pegado_y_otros_nombres_de_columna():
    cols = ["PERIODO", "ORIGEN", "DESTINO", "CONFIGURACION", "TIPO_CARGA", "UNIDAD TRANSPORTE", "CONDICION_CARGA",
            "DISTANCIA KM", "VALOR HORA", "HORAS LOGISTICAS", "COSTO HORA", "VALOR MOVILIZACION", "COSTO VIAJE", "VIA ESTANDAR"]
    sic = tc.agrupar_sicetac(pd.DataFrame([
        ("2026-03-01", "BOGOTA BOGOTA D. C.", "CALI VALLE DEL CAUCA", "2L3 Liviano entre 7.5 y 8 Tonel.", "General",
         "FURGON", "CARGADO", 460, 100, 8, 800, 1000, 1800, "SI"),
    ], columns=cols))
    r = sic.iloc[0]
    assert (r.o, r.d, r.carroceria, r.valor_hora, r.costo_mov, r.costo) == ("BOGOTA", "CALI", "FURGON", 100, 1000, 1800)
    # Las negociaciones dicen BOGOTA → «BOGOTA, D.C.»; la equivalencia se aplica también al SICETAC.
    filas = tc.cruzar([neg(1, "Bogota", "Cali", "POR TIPO DE VEHICULO TURBO", 2000)], sic,
                      {"BOGOTA": "BOGOTA, D.C."}, MAPEO, "2026-03")
    assert filas[0]["estado"] == "OK" and filas[0]["tipo_vehiculo"] == "2L3"


def test_rige_la_carga_mas_reciente_del_cliente_en_ese_mes():
    negs = [{"cliente": "A", "periodo": None, "tarifa": 1}, {"cliente": "A", "periodo": "2026-03", "tarifa": 2},
            {"cliente": "A", "periodo": "2026-07", "tarifa": 3}, {"cliente": "B", "periodo": None, "tarifa": 9}]
    rige = lambda p: sorted((n["cliente"], n["tarifa"]) for n in tc.vigentes(negs, p))  # noqa: E731
    assert rige("2026-01") == [("A", 1), ("B", 9)]      # antes de su primera carga: el consolidado
    assert rige("2026-05") == [("A", 2), ("B", 9)]
    assert rige("2026-07") == [("A", 3), ("B", 9)]
    assert rige("VIGENTE") == [("A", 3), ("B", 9)]


def test_plantilla_con_anio_y_mes(tmp_path):
    import io
    df = pd.DataFrame([("C1", "MASIVO", "YUMBO", "CALI", "POR TIPO DE VEHICULO TURBO", 100, 2026, 3),
                       ("C1", "MASIVO", "YUMBO", "BUGA", "POR TIPO DE VEHICULO TURBO", 200, None, None)],
                      columns=["CLIENTE", "TIPO DE SERVICIO", "ORIGEN", "DESTINO", "TIPO DE TARIFA", "TARIFA", "AÑO", "MES"])
    b = io.BytesIO(); df.to_excel(b, index=False)
    out = tc.leer_negociaciones(b.getvalue(), "n.xlsx")
    assert out["periodo"].tolist()[0] == "2026-03" and pd.isna(out["periodo"].tolist()[1])
    df.loc[0, "MES"] = 13
    b = io.BytesIO(); df.to_excel(b, index=False)
    try:
        tc.leer_negociaciones(b.getvalue(), "n.xlsx"); assert False
    except tc.ArchivoInvalido as e:
        assert "fila" in str(e)
