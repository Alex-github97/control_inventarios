"""
El CUFE se calcula con la fórmula del anexo técnico de la DIAN.

El caso es el ejemplo publicado en el anexo: si la cadena o el formato de los
valores (dos decimales, hora con zona -05:00) cambian, la DIAN rechazaría el
documento, y esta prueba lo detecta antes.
"""
from datetime import date

from app.core.facturacion_dian import codigo_unico, CONSUMIDOR_FINAL


def test_cufe_del_ejemplo_del_anexo_tecnico():
    cufe = codigo_unico("323200000129", date(2019, 1, 16), "10:53:10-05:00", 1500000, 285000, 0, 0, 1785000,
                        "700085371", "800199436", "693ff6f2a553c3646a063436fd4dd9ded0311471", "1")
    assert cufe == ("8bb918b19ba22a694f1da11c643b5e9de39adf60311cf179179e9b33381030bc"
                    "d4c3c3f156c506ed5908f9276f5bd9b4")


def test_consumidor_final_usa_el_documento_generico():
    a = codigo_unico("POS1", date(2026, 1, 1), "10:00:00-05:00", 100, 19, 0, 0, 119, "900", None, "pin", "2")
    b = codigo_unico("POS1", date(2026, 1, 1), "10:00:00-05:00", 100, 19, 0, 0, 119, "900", CONSUMIDOR_FINAL, "pin", "2")
    assert a == b
