"""
La disponibilidad se mide contra las horas que cada activo debía estar
disponible, no contra 24 horas de todos. Un montacargas de un turno que
estuvo 20 horas en taller perdió mucho más de su tiempo que un camión de
operación continua con la misma parada.
"""
from datetime import datetime, timedelta
from types import SimpleNamespace

from app.core.confiabilidad import disponibilidad, horas_programadas


def _orden(horas):
    inicio = datetime(2026, 1, 10)
    return (SimpleNamespace(fecha_inicio=inicio, fecha_fin=inicio + timedelta(hours=horas),
                            afecta_disponibilidad=True, es_falla=True), None)


def test_un_turno_pierde_mas_con_la_misma_parada():
    continuo = [SimpleNamespace(horas_programadas_mes=None)]
    un_turno = [SimpleNamespace(horas_programadas_mes=176)]
    ordenes = [_orden(20)]
    d_cont = disponibilidad(ordenes, continuo, 30)
    d_turno = disponibilidad(ordenes, un_turno, 30)
    assert round(d_cont, 2) == round((720 - 20) / 720 * 100, 2)
    assert round(d_turno, 2) == round((176 - 20) / 176 * 100, 2)
    assert d_turno < d_cont


def test_compatible_con_el_conteo():
    assert horas_programadas(3, 10) == 3 * 10 * 24
    assert disponibilidad([], 0, 30) is None
