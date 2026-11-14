"""Un servidor carga solo los módulos de MODULOS_SERVIDOR (core/modulos_servidor.py)."""
import json
import os
import subprocess
import sys

import pytest

from app.core import modulos_servidor as ms
from app.core.config import settings

_RUTAS = """
import json, sys
from app.api.v1.router import api_router
rutas = sorted({r.path for r in api_router.routes})
cargados = sorted(m.split('.')[-1] for m in sys.modules if m.startswith('app.api.v1.endpoints.'))
print(json.dumps({"rutas": rutas, "archivos": cargados}))
"""


def _arrancar(valor: str) -> dict:
    env = {**os.environ, "MODULOS_SERVIDOR": valor}
    salida = subprocess.run([sys.executable, "-c", _RUTAS], env=env, capture_output=True, text=True,
                            cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))), timeout=300)
    assert salida.returncode == 0, salida.stderr[-2000:]
    return json.loads(salida.stdout.strip().splitlines()[-1])


@pytest.fixture(scope="module")
def todo():
    return _arrancar("")


@pytest.fixture(scope="module")
def solo_ga():
    return _arrancar("eam")


def test_sin_variable_se_carga_todo(todo):
    assert any(r.startswith("/tarifax") for r in todo["rutas"])
    assert any(r.startswith("/wms") for r in todo["rutas"])
    assert any(r.startswith("/eam/lube") for r in todo["rutas"])
    assert len(todo["rutas"]) > 300


def test_solo_gestion_de_activos(solo_ga, todo):
    prefijos_fuera = ("/tarifax", "/wms", "/erp", "/tms", "/crm", "/estibas", "/hcm", "/mes", "/pos")
    assert not [r for r in solo_ga["rutas"] if r.startswith(prefijos_fuera)]
    # Lo de Gestión de Activos y lo básico sigue completo.
    for prefijo in ("/eam", "/lubricacion", "/flota", "/movil", "/auth", "/usuarios", "/plataforma", "/tittanbot"):
        assert [r for r in todo["rutas"] if r.startswith(prefijo)] == \
               [r for r in solo_ga["rutas"] if r.startswith(prefijo)], prefijo
    # Y lo pesado de otros módulos ni se importa.
    assert not {"tarifax", "tarifax_comparativo", "movimientos", "hcm", "wms"} & set(solo_ga["archivos"])


def _con(valor, monkeypatch):
    monkeypatch.setattr(settings, "MODULOS_SERVIDOR", valor)
    return ms._calcular()


def test_dependencias_y_esenciales(monkeypatch):
    assert _con("", monkeypatch) is None
    assert _con("todos", monkeypatch) is None
    assert _con("reencauche", monkeypatch) == {"reencauche", "wms", "tms", "gh", "base"}
    assert _con(" EAM , tarifax ", monkeypatch) == {"eam", "tarifax", "base"}


def test_modulo_desconocido_carga_todo(monkeypatch):
    # Un error de tipeo no puede dejar a un cliente sin su módulo.
    assert _con("eam,flotas", monkeypatch) is None
