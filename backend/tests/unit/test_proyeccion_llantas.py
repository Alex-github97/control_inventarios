"""Proyección de llantas: la fórmula, los mm útiles y el agrupado del plan."""
from datetime import date, timedelta

from app.core import proyeccion_llantas as pl

CFG = {"minima": 3.0, "mm_utiles": None, "por_medida": {"295/80R22.5": 14.0}, "ventana": 90}


def _p(**kw):
    base = dict(neumatico_id=1, codigo="L1", activo_id=1, placa="ABC123", tipo_vehiculo="Vehículo", posicion="E1-IZQ",
                tipo_uso="DIRECCIONAL", medida="295/80R22.5", marca="X", referencia="Y", vida="VN",
                profundidad_actual=9.0, mm_utiles=14.0, mm_usados=6.0, mm_restantes=8.0, km_recorridos=60000,
                km_mm=10000.0, fuente_km_mm="de la propia llanta", km_faltantes=None, km_proyectado=None,
                km_diario=200.0, dias_restantes=None, fecha_cambio=None)
    base.update(kw)
    return pl._completar(pl.Proyeccion(**base))


def test_proyeccion_suma_lo_recorrido_y_lo_que_falta():
    p = _p()
    assert p.km_faltantes == 80000            # 10.000 km/mm × 8 mm restantes
    assert p.km_proyectado == 140000          # 60.000 recorridos + 80.000
    assert p.dias_restantes == 400            # 80.000 / 200 km diarios
    assert p.fecha_cambio == date.today() + timedelta(days=400)


def test_mm_utiles_por_dimension_general_o_diseno():
    assert pl.mm_utiles(CFG, "295/80r22.5", 20) == 14.0           # la dimensión manda
    assert pl.mm_utiles({**CFG, "mm_utiles": 12.0}, "11R22.5", 20) == 12.0
    assert pl.mm_utiles(CFG, "11R22.5", 18) == 15.0                # diseño − mínima


def test_sin_km_diario_no_hay_fecha():
    p = _p(km_diario=None)
    assert p.km_proyectado == 140000 and p.fecha_cambio is None


def test_plan_agrupa_por_mes_eje_y_dimension():
    ps = [_p(), _p(tipo_uso="TRACCION", km_mm=1000.0), _p(tipo_uso="LIBRE", mm_restantes=0.0), _p(km_diario=None)]
    r = pl.plan(ps, meses=24)
    assert r["total"] == 3 and r["sin_fecha"] == {"sin km diario del vehículo": 1}
    assert r["por_eje"] == {"Direccional": 1, "Tracción": 1, "Libre": 1}
    assert r["meses"][0]["mes"] == "Vencidas" and r["meses"][0]["por_eje"] == {"Libre": 1}


def test_referencia_cae_a_dimension_y_flota():
    tablas = {"ref_vida": {}, "ref": {"MICHELIN · X": (9000.0, 5)}, "medida": {"11R22.5": (7000.0, 50)},
              "flota": {"flota": (6000.0, 900)}}
    assert pl.km_mm_de_referencia(tablas, "Michelin · X", "VN", "11R22.5")[0] == 9000.0
    assert pl.km_mm_de_referencia(tablas, "Otra", "VN", "11r22.5")[0] == 7000.0
    assert pl.km_mm_de_referencia(tablas, "Otra", "VN", "22.5")[0] == 6000.0
