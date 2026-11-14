"""Las peticiones lentas dejan constancia; las rápidas no, y la respuesta no cambia."""
import asyncio
import logging

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core import peticiones_lentas as pl


def _app(umbral_ms, monkeypatch):
    monkeypatch.setattr(pl.settings, "PETICION_LENTA_MS", umbral_ms)
    app = FastAPI()

    @app.get("/api/v1/cosa/{cid}")
    async def cosa(cid: int, espera: float = 0):
        await asyncio.sleep(espera)
        return {"id": cid}

    app.add_middleware(pl.PeticionesLentas)
    return TestClient(app)


def test_la_lenta_se_anota_con_plantilla_y_url_real(monkeypatch, caplog):
    cliente = _app(50, monkeypatch)
    with caplog.at_level(logging.WARNING, logger="uvicorn.error"):
        r = cliente.get("/api/v1/cosa/7?espera=0.08")
    assert r.json() == {"id": 7}
    lineas = [m for m in caplog.messages if m.startswith("LENTA")]
    assert len(lineas) == 1
    assert "GET /api/v1/cosa/{cid} -> 200 (/api/v1/cosa/7)" in lineas[0]


def test_la_rapida_no_se_anota(monkeypatch, caplog):
    cliente = _app(500, monkeypatch)
    with caplog.at_level(logging.WARNING, logger="uvicorn.error"):
        assert cliente.get("/api/v1/cosa/7").status_code == 200
    assert not [m for m in caplog.messages if m.startswith("LENTA")]


def test_con_cero_no_mide(monkeypatch, caplog):
    cliente = _app(0, monkeypatch)
    with caplog.at_level(logging.WARNING, logger="uvicorn.error"):
        assert cliente.get("/api/v1/cosa/7?espera=0.05").status_code == 200
    assert not [m for m in caplog.messages if m.startswith("LENTA")]
