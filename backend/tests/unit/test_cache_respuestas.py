"""La memoria de respuestas repite lo mismo, y deja de hacerlo cuando alguien escribe."""
import asyncio
import uuid
from dataclasses import dataclass, field
from typing import List, Optional

import httpx
import pytest
import pytest_asyncio
from fastapi import Depends, FastAPI, Query, Response

from app.core import cache_respuestas as cr
from app.core.tenant import fijar_esquema

pytestmark = pytest.mark.asyncio


@dataclass
class Filtros:
    marcas: List[str] = field(default_factory=list)


def filtros(marca: Optional[List[str]] = Query(None)) -> Filtros:
    return Filtros(marcas=list(marca or []))


class Raro:
    pass


def _app(cuenta):
    app = FastAPI()

    @app.middleware("http")
    async def empresa(request, call_next):
        fijar_esquema(request.headers.get("x-empresa", "cli_prueba"))
        return await call_next(request)

    @app.get("/informe")
    @cr.en_cache(minutos=5)
    async def informe(respuesta: Response, meses: int = 6, f: Filtros = Depends(filtros)):
        cuenta["informe"] += 1
        await asyncio.sleep(0.05)
        respuesta.headers["X-Total-Count"] = "42"
        return {"meses": meses, "marcas": f.marcas, "vez": cuenta["informe"], "texto": "ñandú"}

    @app.get("/archivo")
    @cr.en_cache(minutos=5)
    async def archivo():
        cuenta["archivo"] += 1
        return Response(b"\x00\x01binario", media_type="application/vnd.ms-excel",
                        headers={"Content-Disposition": 'attachment; filename="a.xlsx"'})

    @app.get("/raro")
    @cr.en_cache(minutos=5)
    async def raro(r: Raro = Depends(Raro)):
        cuenta["raro"] += 1
        return {"vez": cuenta["raro"]}

    @app.get("/falla")
    @cr.en_cache(minutos=5)
    async def falla():
        cuenta["falla"] += 1
        return Response("no", status_code=404)

    @app.post("/registro")
    async def registro(mal: bool = False):
        return Response(status_code=422 if mal else 201)

    app.add_middleware(cr.CacheDeRespuestas)
    return app


@pytest_asyncio.fixture
async def c():
    cr._cliente = None   # un cliente de Redis por prueba: cada una tiene su ciclo de eventos
    try:
        await cr._r().ping()
    except Exception:  # noqa: BLE001
        pytest.skip("sin Redis")
    cuenta = {"informe": 0, "archivo": 0, "raro": 0, "falla": 0}
    empresa = f"cli_t{uuid.uuid4().hex[:10]}"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=_app(cuenta)), base_url="http://t",
                                 headers={"x-empresa": empresa}) as cliente:
        cliente.cuenta = cuenta
        yield cliente
    async for k in cr._r().scan_iter(f"*{empresa}*"):
        await cr._r().delete(k)
    await cr._r().aclose()
    cr._cliente = None


async def test_la_repetida_es_identica_y_no_recalcula(c):
    a = await c.get("/informe?meses=3")
    b = await c.get("/informe?meses=3")
    assert a.content == b.content and c.cuenta["informe"] == 1
    assert "x-tittan-cache" not in a.headers and b.headers["x-tittan-cache"] == "guardada"
    assert a.headers["content-type"] == b.headers["content-type"]
    assert b.headers["x-total-count"] == "42"
    assert int(b.headers["content-length"]) == len(b.content)
    assert b.json()["texto"] == "ñandú"


async def test_cada_parametro_y_cada_filtro_tiene_su_respuesta(c):
    await c.get("/informe?meses=3")
    assert (await c.get("/informe?meses=4")).json()["meses"] == 4
    m = await c.get("/informe?meses=3&marca=MICHELIN")
    g = await c.get("/informe?meses=3&marca=GOODYEAR")
    assert m.json()["marcas"] == ["MICHELIN"] and g.json()["marcas"] == ["GOODYEAR"]
    assert c.cuenta["informe"] == 4


async def test_cada_empresa_tiene_la_suya(c):
    a = await c.get("/informe")
    b = await c.get("/informe", headers={"x-empresa": c.headers["x-empresa"] + "b"})
    assert a.json()["vez"] == 1 and b.json()["vez"] == 2


async def test_escribir_invalida_y_un_error_no(c):
    await c.get("/informe")
    assert (await c.post("/registro?mal=true")).status_code == 422
    assert (await c.get("/informe")).json()["vez"] == 1          # el rechazo no cambió nada
    assert (await c.post("/registro")).status_code == 201
    r = await c.get("/informe")
    assert r.json()["vez"] == 2 and "x-tittan-cache" not in r.headers
    assert (await c.get("/informe")).json()["vez"] == 2


async def test_archivos_binarios_con_su_nombre(c):
    a = await c.get("/archivo")
    b = await c.get("/archivo")
    assert a.content == b.content == b"\x00\x01binario" and c.cuenta["archivo"] == 1
    assert b.headers["content-disposition"] == a.headers["content-disposition"]
    assert b.headers["content-type"] == "application/vnd.ms-excel"


async def test_parametro_indescriptible_no_se_guarda(c):
    assert (await c.get("/raro")).json()["vez"] == 1
    assert (await c.get("/raro")).json()["vez"] == 2


async def test_lo_que_no_es_200_no_se_guarda(c):
    await c.get("/falla")
    await c.get("/falla")
    assert c.cuenta["falla"] == 2


async def test_dos_a_la_vez_calculan_una_sola(c):
    a, b, d = await asyncio.gather(c.get("/informe?meses=9"), c.get("/informe?meses=9"), c.get("/informe?meses=9"))
    assert c.cuenta["informe"] == 1
    assert a.content == b.content == d.content
