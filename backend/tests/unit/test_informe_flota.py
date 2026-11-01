"""
Resumen ejecutivo del informe de flota.
"""
from datetime import datetime

from app.core.informe_flota_pdf import Encabezado, generar, resumir
from app.core.neumaticos_flota import PosicionFlota, VehiculoFlota
from app.core.neumaticos_novedades import LlantaInsp, Umbrales, novedades, sugerencias

U = Umbrales()
HOY = datetime(2026, 10, 1)


def vehiculo(aid, tipo, llantas):
    v = VehiculoFlota(activo_id=aid, codigo=f"V{aid}", placa=f"AAA{aid:03d}", nombre="Tractocamión", tipo=tipo,
                      marca="Volvo", linea="VNL")
    for i, ll in enumerate(llantas, 1):
        v.posiciones.append(PosicionFlota(codigo=f"E2-P{i}", label=f"Pos. {i}", eje=2, lado="IZQ" if i % 2 else "DER",
                                          numero=i, llanta=ll))
    v.posiciones.append(PosicionFlota(codigo="REPUESTO", label="Repuesto", eje=0, lado="-", numero=None))
    return v


def ll(nid, aid, prof, presion=110, marca="Michelin", fecha=HOY, reenc=0):
    return LlantaInsp(neumatico_id=nid, codigo=f"L{nid}", activo_id=aid, posicion=f"P{nid}", marca=marca,
                      medida="295/80R22.5", izq=prof, centro=prof, der=prof, presion=presion, fecha=fecha,
                      reencauches=reenc, eje=2, lado="IZQ" if nid % 2 else "DER")


def test_resumen_de_una_jornada():
    flota = [vehiculo(1, "Vehículo", [ll(1, 1, 2.5, presion=70), ll(2, 1, 12, reenc=2)]),
             vehiculo(2, "Remolque", [ll(3, 2, 10, marca="Goodyear"), ll(4, 2, 10, fecha=None)])]
    todas = [x for v in flota for x in v.llantas]
    nov = novedades(todas, U)
    r = resumir(flota, nov, sugerencias(todas, [], U), U)
    assert (r.vehiculos_alcance, r.vehiculos_inspeccionados) == (2, 2)
    assert (r.llantas_montadas, r.llantas_inspeccionadas) == (4, 3)
    assert dict(r.por_marca) == {"Michelin": 2, "Goodyear": 1}
    assert dict(r.por_tipo_vehiculo) == {"Vehículo": 1, "Remolque": 1}
    # La llanta 1 tiene dos novedades (profundidad y presión) y cuenta una vez.
    assert r.llantas_con_novedad >= 1 and r.novedades >= 2
    pct = {t: p for t, _, _, p in r.por_novedad}
    assert round(sum(pct.values())) == 100
    assert r.bajo_minimo == 1 and r.ir == round(2 / 3, 2)


def test_el_pdf_se_genera():
    flota = [vehiculo(1, "Vehículo", [ll(1, 1, 2.5), ll(2, 1, 12), ll(3, 1, 9, fecha=None)])]
    todas = [x for v in flota for x in v.llantas]
    nov = novedades(todas, U)
    sug = sugerencias(todas, [], U)
    pdf = generar(flota, nov, sug, resumir(flota, nov, sug, U), U,
                  Encabezado("Empresa · Prueba", "Última inspección", "Prueba", HOY))
    assert pdf[:5] == b"%PDF-" and len(pdf) > 2000
