"""
El IVA de la agenda se discrimina dentro del precio, no se suma.

Los precios al público ya lo incluyen: un corte de $119.000 con IVA del 19 %
cuesta $119.000 y de eso $19.000 son impuesto. La propina no es venta del
negocio y no lleva IVA; el descuento sí reduce la base.
"""
from datetime import datetime
from types import SimpleNamespace

from app.api.v1.endpoints.ags import _recalcular_totales


def _cita(descuento=0.0, propina=0.0):
    return SimpleNamespace(descuento=descuento, propina=propina, fecha_inicio=datetime(2026, 9, 1, 10),
                           subtotal=0, total_materiales=0, comision_profesional=0, total=0,
                           iva_incluido=0, duracion_min=0, fecha_fin=None)


def _servicio(valor):
    return SimpleNamespace(subtotal=valor, duracion_min=30, comision_pct=None)


def test_el_iva_sale_del_precio_y_el_total_no_cambia():
    c = _cita()
    _recalcular_totales(c, [_servicio(119_000)], [], 0, iva_pct=19)
    assert c.total == 119_000
    assert c.iva_incluido == 19_000


def test_la_propina_no_lleva_iva_y_el_descuento_reduce_la_base():
    c = _cita(descuento=19_000, propina=10_000)
    materiales = [SimpleNamespace(subtotal=19_000)]
    _recalcular_totales(c, [_servicio(119_000)], materiales, 0, iva_pct=19)
    # gravado = 119.000 + 19.000 - 19.000 = 119.000 → IVA 19.000
    assert c.iva_incluido == 19_000
    assert c.total == 129_000


def test_sin_tasa_no_hay_iva():
    c = _cita()
    _recalcular_totales(c, [_servicio(50_000)], [], 0)
    assert c.iva_incluido == 0
