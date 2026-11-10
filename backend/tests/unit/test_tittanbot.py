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
    assert nombres == {"mi_dia", "guia_de_uso", "crear_ticket_soporte"}


def test_con_cmms_y_administrador_estan_todas():
    assert len(disponibles(_u("SUPERVISOR", eam=True))) == len(CATALOGO)
    assert len(disponibles(_u("ADMINISTRADOR"))) == len(CATALOGO)


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
                          "llantas_flota_pdf", "llantas_rendimiento_pdf", "causa_raiz_pdf"}
