"""
TittanBot: qué herramientas recibe cada perfil, que las acciones no se puedan
ejecutar sin confirmación, y que la guía encuentre lo que se le pregunta.
"""
from types import SimpleNamespace

from app.core.tittanbot.guia import buscar
from app.core.tittanbot.herramientas import CATALOGO, POR_NOMBRE, disponibles


def _u(rol, **permisos):
    return SimpleNamespace(rol=rol, permisos=permisos)


def test_sin_cmms_solo_quedan_las_generales():
    nombres = {h.nombre for h in disponibles(_u("CONSULTA", estibas=True))}
    # ver_adjunto, importar_excel y plantilla_cargue no piden permiso: revisan el permiso
    # del cargue elegido.
    assert nombres == {"mi_dia", "guia_de_uso", "crear_ticket_soporte", "ver_adjunto", "importar_excel",
                       "plantilla_cargue"}


def test_cada_modulo_abre_solo_sus_herramientas():
    solo_cmms = {h.nombre for h in disponibles(_u("SUPERVISOR", eam=True))}
    assert "crear_orden" in solo_cmms and "crear_viaje" not in solo_cmms and "ajustar_inventario" not in solo_cmms
    solo_wms = {h.nombre for h in disponibles(_u("SUPERVISOR", wms=True))}
    assert {"crear_recepcion", "trasladar_inventario", "crear_despacho"} <= solo_wms and "crear_orden" not in solo_wms
    solo_tms = {h.nombre for h in disponibles(_u("SUPERVISOR", tms=True))}
    assert "crear_viaje" in solo_tms and "existencias_wms" not in solo_tms
    assert len(disponibles(_u("ADMINISTRADOR"))) == len(CATALOGO)


def test_las_acciones_de_modulo_piden_confirmacion():
    for h in CATALOGO:
        if h.construir or h.accion:
            assert h.destructiva and h.resumir, h.nombre


def test_cargues_del_wms_resuelven_por_sku_y_ubicacion():
    from app.core.tittanbot import importar
    from app.core.tittanbot.wms import _construir_traslado
    assert {"wms_ajustes", "wms_traslados", "tms_viajes"} <= set(importar.DESTINOS)
    metodo, ruta, cuerpo = _construir_traslado({"producto_id": 1, "ubicacion_origen_id": 2,
                                                "ubicacion_destino_id": 3, "cantidad": "5"})
    assert (metodo, ruta) == ("POST", "/api/v1/wms/inventario/transferencia/")
    assert cuerpo == {"producto_id": 1, "ubicacion_origen_id": 2, "ubicacion_destino_id": 3, "cantidad": 5.0}


def test_toda_accion_es_destructiva_y_se_construye_sin_tocar_la_base():
    for nombre in ("crear_orden", "cambiar_estado_orden", "crear_ticket_soporte"):
        h = POR_NOMBRE[nombre]
        assert h.destructiva and h.construir and not h.consultar
    metodo, ruta, cuerpo = POR_NOMBRE["crear_orden"].construir({"activo_id": 7, "descripcion": "Fuga"})
    assert (metodo, ruta) == ("POST", "/api/v1/eam/ots") and cuerpo["activo_id"] == 7


def test_las_consultas_no_son_destructivas():
    assert all(not h.destructiva for h in CATALOGO if h.consultar)


def test_esquemas_cerrados_para_el_modelo():
    for h in CATALOGO:
        assert h.para_modelo()["input_schema"]["additionalProperties"] is False


def test_guia():
    assert "Registrar muestra" in buscar("¿Cómo registro una muestra de aceite?")[0]
    assert "Ctrl+K" in buscar("no encuentro una pantalla en el menu")[0]


def test_respaldo_solo_en_modelos_que_lo_admiten(monkeypatch):
    from app.core.config import settings
    from app.core.tittanbot import motor
    monkeypatch.setattr(settings, "TITTANBOT_MODELO", "claude-haiku-5-5")
    op = motor._opciones_modelo()
    assert op["model"] == "claude-haiku-5-5" and "fallbacks" not in op and "betas" not in op
    monkeypatch.setattr(settings, "TITTANBOT_MODELO", "claude-sonnet-5-5")
    assert motor._opciones_modelo()["fallbacks"] == "default"


def test_generar_reporte_ofrece_todos_los_informes():
    tipos = POR_NOMBRE["generar_reporte"].esquema["properties"]["tipo"]["enum"]
    assert set(tipos) == {"ordenes_excel", "lubricacion_flota_pdf", "lubricacion_muestra_pdf",
                          "llantas_flota_pdf", "llantas_rendimiento_pdf", "causa_raiz_pdf",
                          "tittanlite_pdf", "tittanlite_excel", "plan_recambio_excel", "disposicion_excel"}


def test_plantilla_con_obligatorias_marcadas_y_lista_desplegable():
    import io
    from openpyxl import load_workbook
    from app.core.tittanbot import importar
    d = importar.DESTINOS["tms_viajes"]
    libro = load_workbook(io.BytesIO(importar._libro_plantilla(d, d.columnas)))
    assert libro.sheetnames == ["Datos", "Instrucciones"]
    encabezados = [c.value for c in libro["Datos"][1]]
    assert "Origen *" in encabezados and "Placa" in encabezados
    # El encabezado con asterisco se empareja igual que el título limpio.
    assert importar._norma("Origen *") == importar._norma("Origen")
    assert len(libro["Datos"].data_validations.dataValidation) == 1
