"""
Permisos de perfil en la API: qué clave pide cada ruta.

Fija las reglas que más fácil se rompen con un cambio: el administrador pasa
siempre, la lectura de usuarios es libre pero crearlos no, los cruces entre
módulos que usan las pantallas, y las rutas que no piden nada.
"""
from app.core.permisos_ruta import claves_de_ruta, permitido


def test_cada_modulo_pide_su_clave():
    assert claves_de_ruta("/api/v1/eam/ots", "GET") == ("eam",)
    assert claves_de_ruta("/api/v1/lubricacion/x", "POST") == ("eam",)
    assert claves_de_ruta("/api/v1/hcm/nomina", "GET") == ("gh",)
    assert claves_de_ruta("/api/v1/erp/asientos", "POST") == ("erp",)
    assert claves_de_ruta("/api/v1/tittanbot/mensaje", "POST") == ("asistente",)


def test_rutas_que_no_piden_permiso():
    for ruta in ("/api/v1/auth/login", "/api/v1/alertas", "/api/v1/movil/version", "/api/v1/movil/apk/abc",
                 "/api/v1/catalogos/x", "/api/v1/soporte/tickets"):
        assert claves_de_ruta(ruta, "GET") is None, ruta


def test_usuarios_se_leen_libre_pero_se_administran_con_permiso():
    assert claves_de_ruta("/api/v1/usuarios/", "GET") is None
    assert claves_de_ruta("/api/v1/usuarios/", "POST") == ("usuarios",)
    assert claves_de_ruta("/api/v1/roles/3", "PUT") == ("usuarios",)


def test_cruces_entre_modulos():
    assert "tms" in claves_de_ruta("/api/v1/hcm/conductores", "GET")
    assert "tms" not in claves_de_ruta("/api/v1/hcm/conductores", "POST")
    assert "pos" in claves_de_ruta("/api/v1/wms/almacenes/", "GET")
    assert "pos" in claves_de_ruta("/api/v1/erp/resoluciones", "POST")
    assert "tms" in claves_de_ruta("/api/v1/eam/vehiculos-combinados", "GET")


def test_prefijo_mas_largo_gana():
    # /eam/... no le roba la ruta a otro prefijo más específico ni al revés.
    assert claves_de_ruta("/api/v1/eamx", "GET") is None
    assert claves_de_ruta("/api/v1/flota/vehiculos", "GET") == ("gf", "eam")


def test_permitido():
    assert permitido("ADMINISTRADOR", {}, ("erp",))
    assert permitido("SUPERVISOR", {"eam": True}, ("eam",))
    assert not permitido("SUPERVISOR", {"eam": False, "tms": True}, ("eam",))
    assert permitido("OPERADOR", {"tms": True}, ("gh", "tms"))
    assert not permitido(None, None, ("eam",))
