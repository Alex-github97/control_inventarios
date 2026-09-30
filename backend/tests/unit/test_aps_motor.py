"""
El motor en un caso armado a mano: una planta que surte a un centro de
distribución, un producto que se fabrica y otro que se compra.
"""
from datetime import date

from app.core.aps.motor import Datos, calcular, meses_de_entrega, sumar_meses

HOY = date(2026, 9, 15)


def _historia(valor, meses=18):
    return {sumar_meses("2026-09", -i): float(valor) for i in range(1, meses + 1)}


def _datos(**cambios):
    base = dict(
        ubicaciones={1: {"nombre": "Planta", "abastecida_por_id": None},
                     2: {"nombre": "CD Norte", "abastecida_por_id": 1}},
        productos={10: {"codigo": "A", "nombre": "Fabricado", "costo_unitario": 1000, "lead_time_dias": 20, "peso_kg": 10},
                   20: {"codigo": "B", "nombre": "Comprado", "costo_unitario": 500, "lead_time_dias": 45, "peso_kg": None}},
        recursos={100: {"nombre": "Línea 1", "capacidad_diaria": 8, "eficiencia_pct": 100}},
        rutas=[{"producto_id": 10, "recurso_id": 100, "horas_por_unidad": 0.5}],
        parametros={(10, 2): {"stock_actual": 0}, (10, 1): {"stock_actual": 0, "lote_produccion": 200},
                    (20, 1): {"stock_actual": 1000}},
        demanda={(10, 2): _historia(100), (10, 1): _historia(50), (20, 1): _historia(80)},
        config={"horizonte_meses": 4, "dias_habiles_mes": 20},
        hoy=HOY,
    )
    base.update(cambios)
    return Datos(**base)


def test_cascada_drp_mps_rccp():
    r = calcular(_datos())
    assert r["periodos"] == ["2026-09", "2026-10", "2026-11", "2026-12"]
    # El CD pide traslados a la planta: sin stock, cubre la demanda de 100 al mes.
    tras = [t for t in r["traslados"] if t["producto_id"] == 10]
    assert tras and all(t["origen_id"] == 1 for t in tras)
    assert sum(t["cantidad"] for t in tras) >= 400
    # La planta planea su demanda propia MÁS los traslados.
    mps_a = next(m for m in r["mps"] if m["producto_id"] == 10 and m["ubicacion_id"] == 1)
    assert mps_a["tipo"] == "PRODUCCION"
    assert mps_a["filas"][0]["demanda"] >= 50 + mps_a["filas"][0]["traslados"] - 1e-6
    assert all(o["cantidad"] >= 200 for o in r["ordenes"] if o["producto_id"] == 10)   # lote mínimo
    # La carga es cantidad × horas por unidad, sobre 8 h × 20 días = 160 h.
    prod = sum(o["cantidad"] for o in r["ordenes"] if o["producto_id"] == 10 and o["periodo_recepcion"] == "2026-10")
    c = next(x for x in r["capacidad"] if x["periodo"] == "2026-10")
    assert abs(c["carga_horas"] - prod * 0.5) < 1e-6 and c["capacidad_horas"] == 160


def test_comprado_con_stock_y_tiempo_largo():
    r = calcular(_datos())
    mps_b = next(m for m in r["mps"] if m["producto_id"] == 20)
    assert mps_b["tipo"] == "COMPRA"
    # 1000 unidades cubren varios meses de 80: no hay orden el primer mes.
    assert mps_b["filas"][0]["planificadas"] == 0
    # 45 días = 2 meses de anticipación.
    assert meses_de_entrega(45) == 2
    for o in (o for o in r["ordenes"] if o["producto_id"] == 20):
        assert o["periodo_lanzamiento"] == sumar_meses(o["periodo_recepcion"], -2)


def test_atraso_genera_alerta_critica():
    # Sin stock y con 60 días de entrega, lo del primer mes ya no llega a tiempo.
    r = calcular(_datos(parametros={(20, 1): {"stock_actual": 0}}))
    assert any(o["atrasada"] for o in r["ordenes"] if o["producto_id"] == 20)
    assert any(a["tipo"] == "QUIEBRE_STOCK" and a["nivel"] == "CRITICA" for a in r["alertas"])


def test_escenario_de_demanda_y_capacidad():
    base = calcular(_datos())
    mas = calcular(_datos(), delta_demanda_pct=50, delta_capacidad_pct=-50)
    assert mas["kpis"]["unidades_produccion"] > base["kpis"]["unidades_produccion"]
    assert mas["kpis"]["uso_capacidad_maximo_pct"] > base["kpis"]["uso_capacidad_maximo_pct"]


def test_ordenes_aprobadas_no_se_vuelven_a_sugerir():
    base = calcular(_datos())
    primera = next(o for o in base["ordenes"] if o["producto_id"] == 10)
    aprobada = {"producto_id": 10, "ubicacion_id": 1, "tipo": "PRODUCCION",
                "cantidad": primera["cantidad"], "periodo": primera["periodo_recepcion"]}
    luego = calcular(_datos(programadas=[aprobada]))
    assert sum(o["cantidad"] for o in luego["ordenes"] if o["producto_id"] == 10) < \
        sum(o["cantidad"] for o in base["ordenes"] if o["producto_id"] == 10)


def test_transporte_por_peso_y_aviso_sin_peso():
    r = calcular(_datos(camion_kg={1: 1000}))
    t = r["transporte"][0]
    assert t["kg"] == t["unidades"] * 10
    assert t["camiones"] == -(-t["kg"] // 1000)
