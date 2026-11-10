"""
Informes PDF de lubricación: lo que se redacta y que los dos documentos se generan.
"""
from datetime import datetime

from app.core import informe_lubricacion_pdf as ilp
from app.core.pdf_marca import Encabezado

HOY = datetime(2026, 11, 10, 9, 0)
ENC = Encabezado(empresa="Transportes Prueba", periodo="Último año", generado_por="Prueba", generado_en=HOY)


def test_resumen_sin_muestras_lo_dice():
    assert "no se registraron muestras" in ilp.resumen_ejecutivo({"total_muestras": 0})[0]


def test_resumen_empieza_por_lo_critico_y_avisa_la_cobertura_baja():
    frases = ilp.resumen_ejecutivo({
        "total_muestras": 200, "criticas": 10, "equipos_criticos": 4, "cobertura_pct": 40.0,
        "sin_historico": 30, "vencidos": 5, "proximos": 2,
        "parametros": [{"etiqueta": "Hierro (Fe)", "cantidad": 12, "origen": "Camisas, anillos"}],
        "drenajes": [{"etiqueta": "Calendario", "cantidad": 8, "evitable": True},
                     {"etiqueta": "Condición", "cantidad": 2, "evitable": False}],
        "acierto_pct": None, "confirmados": 0, "desmentidos": 0,
    })
    assert frases[0].startswith("10 de 200 muestras (5,0 %)") and "4 equipo(s)" in frases[0]
    assert any("Hierro (Fe) (camisas, anillos)" in f for f in frases)
    assert any("40,0 %" in f and "30 nunca" in f for f in frases)
    assert any(f.startswith("5 compartimento(s)") for f in frases)
    assert any("8 de 10 cambios" in f for f in frases)
    assert any("Ningún diagnóstico se ha verificado" in f for f in frases)


def test_resumen_con_buena_cobertura_no_la_menciona():
    frases = ilp.resumen_ejecutivo({"total_muestras": 50, "criticas": 0, "cobertura_pct": 95.0,
                                    "acierto_pct": 80, "confirmados": 4, "desmentidos": 1})
    assert not any("compartimentos tiene muestra" in f for f in frases)
    assert any("el 80 % se confirmó" in f for f in frases)


def test_agrupar_por_hallazgo_prefiere_la_accion_del_asesor():
    filas = [
        {"patron": "Refrigerante", "placa": "A", "accion_sugerida": "Norma", "accion_de_persona": False},
        {"patron": "Refrigerante", "placa": "B", "accion_sugerida": "Del asesor", "accion_de_persona": True},
        {"patron": "Refrigerante", "placa": "B", "accion_sugerida": "Norma", "accion_de_persona": False},
        {"patron": "Polvo", "placa": "C", "accion_sugerida": "Filtro", "accion_de_persona": False},
    ]
    g = ilp.agrupar_por_hallazgo(filas)
    assert [x["patron"] for x in g] == ["Refrigerante", "Polvo"]
    assert g[0]["equipos"] == 2 and g[0]["muestras"] == 3 and g[0]["accion"] == "Del asesor"


def test_estado_legible():
    assert ilp.estado_legible("CONDENA")[0] == "Condena"
    assert ilp.estado_legible("PRECAUCION")[0] == "Precaución"
    assert ilp.estado_legible(None)[0] == "Normal"


def _muestra():
    return {
        "id": 1, "numero": "LUB-1", "compartimento": "Motor", "fecha_toma": HOY, "medidor_equipo": 120_000,
        "horas_aceite": 12_000, "severidad": "CRITICO", "activo_codigo": "TC-1",
        "resultados": [
            {"codigo": "fe", "nombre": "Hierro (Fe)", "unidad": "ppm", "grupo": "DESGASTE", "valor": 80.0,
             "estado": "CRITICO", "tasa_cambio": 12.5},
            {"codigo": "iso4406", "nombre": "Código ISO 4406", "unidad": "—", "grupo": "CONTAMINACION",
             "valor": None, "valor_texto": "18/16/13", "estado": "NORMAL"},
        ],
    }


def test_pdf_de_muestra_se_genera_con_y_sin_interpretacion():
    fila = {"muestra_id": 1, "severidad_norma": "CRITICO", "patron": "Desgaste de camisas",
            "lectura": "El hierro subió.", "accion_sugerida": "Revisar camisas.", "criterio": "ASTM D7720",
            "fuentes": ["ASTM D7720"], "detalle": [
                {"codigo": "fe", "estado": "CONDENA", "limite": {"precaucion": 50, "condena": 70,
                                                                 "criterio": "ASTM D7720"},
                 "tendencia": {"variacion": 60}}]}
    asesor = ilp.Asesor(nombre="Ana Rojas", cargo="Asesora", credenciales="ICML MLA II")
    for f in (fila, None):
        pdf = ilp.generar_muestra(ilp.DatosMuestra(muestra=_muestra(), fila=f, unidad_vida="KM",
                                                   diagnostico={"conclusion": "Confirmar", "recomendacion": "Abrir"}),
                                  asesor, ENC)
        assert pdf[:5] == b"%PDF-" and len(pdf) > 2000


def test_pdf_de_flota_se_genera():
    d = ilp.DatosFlota(
        periodo="Último año",
        programa={"total_muestras": 10, "criticas": 1, "parametros": [{"etiqueta": "Hierro", "cantidad": 3}],
                  "drenajes": [{"etiqueta": "Calendario", "cantidad": 4, "evitable": True}],
                  "costos": [{"etiqueta": "Motor", "unidad": "KM", "cargas": 4, "costo_total": 1e6,
                              "costo_por_unidad": 50}],
                  "por_marca": {"grupos": [{"etiqueta": "Volvo", "cantidad": 10, "criticas": 1}]},
                  "diagnostico": {"acierto_pct": None}},
        cobertura={"compartimentos_analizables": 5, "con_muestra_en_el_anio": 3, "cobertura_pct": 60.0,
                   "sin_historico": [{}]},
        criticos=[{"placa": "TC-1", "compartimento": "Motor", "fecha_toma": HOY, "tipo": "Fe",
                   "patron": "Desgaste", "accion_sugerida": "Revisar", "severidad_norma": "CRITICO"}],
        resumen_norma={"CRITICO": 1}, pendientes=[{"estado": "VENCIDO", "activo": "TC-2", "compartimento": "Motor",
                                                  "unidad": "KM", "desde_ultima": 16000,
                                                  "frecuencia_muestreo": 15000, "avance_pct": 107}])
    pdf = ilp.generar_flota(d, ilp.Asesor(), ENC)
    assert pdf[:5] == b"%PDF-" and len(pdf) > 4000
