"""Fase 2 del asistente de reuniones: el bot en reuniones virtuales.

Vexa se reemplaza por un servidor falso (httpx.MockTransport) que habla su API
0.12 tal como la documenta (POST /bots, GET /transcripts, /recordings…), y
OpenAI por el doble de las pruebas de la fase 1. El audio sí es real.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tests/humo_reuniones_bot.py
"""
import asyncio
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

os.environ.setdefault("SQLALCHEMY_ECHO", "0")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy import delete, func, select, update

import app.main as m
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.database import AsyncSessionLocal
from app.core.reuniones import audio, captura, cola, ia, vexa
from app.core.reuniones.ia import ResultadoReunion
from app.core.sesiones import token_de_herramienta
from app.infrastructure.models.crm import CRMActividad, CRMCliente, CRMContacto, CRMInteraccion
from app.infrastructure.models.crm_reuniones import CRMReunion, CRMReunionCompromiso, CRMReunionTrabajo

ESQUEMA, CODIGO = "cli_acme", "acme"
X = "HB%d" % (int(time.time()) % 100000)
API = "/api/v1/crm/reuniones"
TMP = Path(tempfile.mkdtemp(prefix="reuniones_bot_"))
fallos = []


def ok(cond, nombre, extra=""):
    print(("  ok  " if cond else "FALLA ") + nombre + (("  ->  " + str(extra)) if extra != "" else ""))
    if not cond:
        fallos.append(nombre)


class UsuarioFalso:
    id, username, nombre, apellido, rol_id, rol = 1, "admin", "Ana", "Prueba", None, "ADMINISTRADOR"
    email, activo, permisos = "admin@prueba-tittanware.com", True, {}


m.app.dependency_overrides[get_current_user] = lambda: UsuarioFalso()


class MotorFalso:
    def transcribir(self, ruta, palabras_clave):
        return f"frase {ruta.stem}"

    def extraer(self, transcripcion, contexto):
        return ResultadoReunion(resumen="Reunión virtual de prueba.", items=[])

    def credencial_vivo(self):
        return {"valor": "x"}


def generar(nombre, segundos):
    destino = TMP / f"{nombre}.webm"
    expr = "if(lt(mod(t\\,9.2)\\,8)\\,0.5*sin(2*PI*440*t)\\,0)"
    subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-f", "lavfi", "-i", f"aevalsrc={expr}:s=16000:d={segundos}",
                    "-ac", "1", "-c:a", "libopus", "-b:a", "24k", str(destino)], check=True, capture_output=True)
    return destino


# ── El Vexa falso ──────────────────────────────────────────────────────────────
class VexaFalso:
    """Cada reunión avanza un paso de su guion en cada consulta de estado."""

    def __init__(self):
        self.guiones = {}          # native_id -> lista de (status, error)
        self.pedidos = []
        self.retirados = []
        self.ocupado = False
        self.audio = None
        self.segmentos = []

    def manejar(self, req: httpx.Request) -> httpx.Response:
        if req.headers.get("X-API-Key") != settings.VEXA_API_KEY:
            return httpx.Response(401)
        p, met = req.url.path, req.method
        if met == "POST" and p == "/bots":
            cuerpo = json.loads(req.content)
            self.pedidos.append(cuerpo)
            if self.ocupado:
                return httpx.Response(403, json={"detail": "concurrency limit"})
            return httpx.Response(201, json={"id": 700 + len(self.pedidos), "status": "requested"})
        if met == "GET" and p.startswith("/transcripts/"):
            nid = p.split("/", 3)[3]
            guion = self.guiones[nid]
            status, error = guion.pop(0) if len(guion) > 1 else guion[0]
            reg = {"id": 701, "status": status, "data": {"last_error": error} if error else {}}
            if status == "completed":
                reg["segments"] = self.segmentos
            return httpx.Response(200, json=reg)
        if met == "GET" and p == "/recordings":
            return httpx.Response(200, json={"recordings": [{"id": 55, "meeting_id": 701}]})
        if met == "GET" and p == "/recordings/55/master":
            return httpx.Response(200, json={"raw_url": "/recordings/55/media/9/raw", "format": "webm"})
        if met == "GET" and p == "/recordings/55/media/9/raw":
            return httpx.Response(200, content=self.audio.read_bytes())
        if met == "DELETE" and p.startswith("/bots/"):
            self.retirados.append(p)
            return httpx.Response(200, json={"status": "stopping"})
        return httpx.Response(404)


VEXA = VexaFalso()


async def sondear_hasta_terminar(rid, maximo=12):
    """Lo que haría el ciclo: reclamar y ejecutar SONDEAR_BOT hasta que deje de reprogramarse."""
    for _ in range(maximo):
        async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
            await db.execute(update(CRMReunionTrabajo).where(CRMReunionTrabajo.reunion_id == rid,
                             CRMReunionTrabajo.estado == "PENDIENTE").values(siguiente_intento=func.now()))
            await db.commit()
        n = await cola.vuelta(ESQUEMA, maximo=5)
        async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
            r = await db.get(CRMReunion, rid)
            if r.estado not in ("EN_CURSO", "PROCESANDO") or not n:
                return r.estado
    return "SIN_TERMINAR"


async def principal():
    settings.VEXA_URL, settings.VEXA_API_KEY = "http://vexa.prueba", "clave-vexa-prueba"
    vexa.usar_transporte_de_pruebas(httpx.MockTransport(VEXA.manejar))
    ia.usar_motor_de_pruebas(MotorFalso())
    token = token_de_herramienta(subject=1, cliente=CODIGO, esquema=ESQUEMA, usuario="admin")

    async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
        cli = CRMCliente(codigo=X, razon_social=f"Distribuidora {X} SAS", activo=True)
        db.add(cli)
        await db.flush()
        c1 = CRMContacto(cliente_id=cli.id, nombre="Marta Gómez", activo=True)
        db.add(c1)
        await db.commit()
        cli_id, c1_id = cli.id, c1.id

    tr = httpx.ASGITransport(app=m.app)
    try:
        async with httpx.AsyncClient(transport=tr, base_url="http://t", timeout=120,
                                     headers={"Authorization": f"Bearer {token}"}) as api:
            async def nueva(enlace, titulo="Virtual"):
                r = await api.post(API, json={"cliente_id": cli_id, "titulo": titulo, "origen": "VIRTUAL",
                                              "enlace": enlace, "participantes": [{"contacto_id": c1_id}]})
                assert r.status_code == 201, r.text
                rid = r.json()["id"]
                await api.post(f"{API}/{rid}/aviso", json={"confirmo": True})
                return rid

            print("── Enlaces")
            d = captura.destino_de("https://meet.google.com/abc-defg-hij?authuser=0")
            ok(d.plataforma == "MEET" and d.id_externo == "abc-defg-hij", "Google Meet: id del enlace", d)
            d = captura.destino_de("https://teams.live.com/meet/9381234567890?p=AbCdEf")
            ok(d.plataforma == "TEAMS" and d.id_externo == "9381234567890" and d.clave == "AbCdEf",
               "Teams personal: número y código de acceso", d)
            d = captura.destino_de("https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZmQ5%40thread.v2/0?context=%7b%7d")
            ok(d.plataforma == "TEAMS" and d.id_externo == "19:meeting_ZmQ5@thread.v2", "Teams de empresa: hilo de la reunión", d)
            d = captura.destino_de("https://us02web.zoom.us/j/81234567890?pwd=xyz")
            ok(d.plataforma == "ZOOM" and d.id_externo == "81234567890", "Zoom: número de la reunión", d)

            # ── Bot que entra, graba y entrega ─────────────────────────────────
            print("── El bot entra y graba")
            rid = await nueva("https://meet.google.com/abc-defg-hij", "Comité de servicio")
            VEXA.guiones["abc-defg-hij"] = [("joining", None), ("awaiting_admission", None), ("active", None),
                                            ("active", None), ("completed", None)]
            VEXA.audio = generar("bot", 60)
            VEXA.segmentos = [
                {"speaker": "Marta G.", "start": 0, "end": 27, "text": "x", "completed": True},
                {"speaker": "Pedro Invitado", "start": 27, "end": 60, "text": "y", "completed": True},
                {"speaker": "Marta G.", "start": 58, "end": 59, "text": "borrador", "completed": False},
            ]
            r = await api.post(f"{API}/{rid}/bot")
            ok(r.status_code == 200 and r.json()["estado"] == "EN_CURSO", "Pedir el bot deja la reunión EN_CURSO", r.text[:160])
            pedido = VEXA.pedidos[-1]
            ok(pedido["bot_name"] == "Asistente TittanWare — grabando" and pedido["platform"] == "google_meet"
               and pedido["native_meeting_id"] == "abc-defg-hij" and pedido["recording_enabled"] and pedido["language"] == "es",
               "El bot entra con el nombre que anuncia la grabación", pedido)
            await sondear_hasta_terminar(rid, maximo=3)
            d = (await api.get(f"{API}/{rid}")).json()
            ok(d["bot"] and d["bot"]["estado"] in ("awaiting_admission", "active"), "Mientras tanto se ve el estado del bot", d["bot"])
            estado = await sondear_hasta_terminar(rid)
            await cola.vuelta(ESQUEMA, maximo=10)            # transcribir y extraer
            await cola.vuelta(ESQUEMA, maximo=10)
            d = (await api.get(f"{API}/{rid}")).json()
            ok(d["estado"] == "POR_REVISAR" and d["fuente_captura"] == "vexa" and d["tramos"],
               "Al terminar la reunión pasa a procesarse y queda por revisar", (estado, d["estado"], d["motivo_falla"]))
            nombres = {p["id"]: p for p in d["participantes"]}
            marta = next(p for p in d["participantes"] if p["contacto_id"] == c1_id)
            pedro = next((p for p in d["participantes"] if p["nombre"] == "Pedro Invitado"), None)
            ok(pedro is not None and pedro["contacto_id"] is None, "Quien no estaba invitado entra como participante sin identificar")
            ok(d["tramos"][0]["participante_id"] == marta["id"] and d["tramos"][-1]["participante_id"] == pedro["id"],
               "Cada tramo trae el nombre de quien habló («Marta G.» se reconoce como Marta Gómez)",
               [nombres.get(t["participante_id"], {}).get("nombre") for t in d["tramos"]])
            ok(not any(p["nombre"].startswith("Asistente TittanWare") for p in d["participantes"]), "El bot no queda como participante")

            # ── No admitido ────────────────────────────────────────────────────
            print("── Fallos del bot")
            rid2 = await nueva("https://meet.google.com/zzz-yyyy-xxx", "Nadie lo admite")
            VEXA.guiones["zzz-yyyy-xxx"] = [("awaiting_admission", None),
                                            ("failed", "Bot was not admitted: waiting room timeout")]
            await api.post(f"{API}/{rid2}/bot")
            await sondear_hasta_terminar(rid2)
            d2 = (await api.get(f"{API}/{rid2}")).json()
            ok(d2["estado"] == "FALLIDA" and "no fue admitido" in (d2["motivo_falla"] or ""),
               "Nadie admite al bot: FALLIDA con «no fue admitido»", d2["motivo_falla"])
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                alerta = (await db.execute(select(CRMActividad).where(CRMActividad.cliente_id == cli_id,
                          CRMActividad.tipo == "ALERTA_REUNION"))).scalars().first()
            ok(alerta is not None and alerta.prioridad == "ALTA" and "Nadie lo admite" in alerta.asunto,
               "Queda una alerta urgente en las actividades del CRM", alerta and alerta.asunto)

            rid3 = await nueva("https://teams.live.com/meet/9381234567890?p=AbCdEf", "Teams cerrado")
            VEXA.guiones["9381234567890"] = [("joining", None), ("failed", "Anonymous join is not allowed by the organizer")]
            await api.post(f"{API}/{rid3}/bot")
            ok(VEXA.pedidos[-1].get("passcode") == "AbCdEf" and VEXA.pedidos[-1]["platform"] == "teams", "Teams lleva su código de acceso")
            await sondear_hasta_terminar(rid3)
            d3 = (await api.get(f"{API}/{rid3}")).json()
            ok(d3["estado"] == "FALLIDA" and "invitados anónimos" in (d3["motivo_falla"] or ""),
               "Teams sin invitados anónimos: el motivo lo dice", d3["motivo_falla"])

            rid4 = await nueva("https://us02web.zoom.us/j/81234567890?pwd=xyz", "Zoom")
            r = await api.post(f"{API}/{rid4}/bot")
            ok(r.status_code == 409 and "cuenta de Zoom" in r.text, "Zoom sin cuenta conectada: no se envía el bot", r.status_code)
            ok(VEXA.pedidos[-1]["platform"] != "zoom", "Y no se le pide nada a Vexa")

            VEXA.ocupado = True
            rid5 = await nueva("https://meet.google.com/ocu-pado-xyz", "Ocupado")
            r = await api.post(f"{API}/{rid5}/bot")
            ok(r.status_code == 409 and "ocupado" in r.text, "Bot ocupado: lo dice y la reunión sigue programada", r.status_code)
            ok((await api.get(f"{API}/{rid5}")).json()["estado"] == "PROGRAMADA", "La reunión sigue PROGRAMADA")
            VEXA.ocupado = False

            r = await api.post(API, json={"cliente_id": cli_id, "titulo": "Webex", "origen": "VIRTUAL",
                                          "enlace": "https://empresa.webex.com/meet/sala"})
            ok(r.status_code == 422, "Plataforma no admitida: se rechaza al crear la reunión", r.status_code)

            # ── Retirar el bot ─────────────────────────────────────────────────
            rid6 = await nueva("https://meet.google.com/ret-irar-bot", "Retirar")
            VEXA.guiones["ret-irar-bot"] = [("active", None)]
            await api.post(f"{API}/{rid6}/bot")
            r = await api.post(f"{API}/{rid6}/bot/retirar")
            ok(r.status_code == 200 and VEXA.retirados and VEXA.retirados[-1].endswith("/google_meet/ret-irar-bot"),
               "Retirar el bot se lo pide a Vexa", VEXA.retirados[-1:])

            # ── 6.4 Otro proveedor de captura ──────────────────────────────────
            print("── Cambio de proveedor de captura")

            class OtroProveedor:
                nombre = "recall"

                async def pedir_bot(self, destino):
                    return {"bot_id": "rc-1"}

                async def estado(self, cap):
                    return captura.EstadoBot(estado="done", terminado=True, exito=True)

                async def resultado(self, cap, carpeta):
                    return captura.ResultadoCaptura(audio=generar("otro", 40), participantes=["Marta Gómez"],
                                                    segmentos=[captura.servicio.Segmento("Marta Gómez", 0, 40)])

                async def retirar(self, cap):
                    pass

            captura.usar_proveedor_de_pruebas(OtroProveedor())
            rid7 = await nueva("https://meet.google.com/otr-opro-vee", "Otro proveedor")
            await api.post(f"{API}/{rid7}/bot")
            await sondear_hasta_terminar(rid7)
            await cola.vuelta(ESQUEMA, maximo=10)
            await cola.vuelta(ESQUEMA, maximo=10)
            d7 = (await api.get(f"{API}/{rid7}")).json()
            ok(d7["estado"] == "POR_REVISAR" and d7["fuente_captura"] == "recall"
               and all(t["participante_id"] == marta_id(d7, c1_id) for t in d7["tramos"]),
               "Otro proveedor: se transcribe y queda por revisar igual, con sus hablantes", (d7["estado"], d7["motivo_falla"]))
            captura.usar_proveedor_de_pruebas(None)
    finally:
        async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
            ids = list((await db.execute(select(CRMReunion.id).where(CRMReunion.cliente_id == cli_id))).scalars())
            await db.execute(delete(CRMReunionCompromiso).where(CRMReunionCompromiso.cliente_id == cli_id))
            await db.execute(delete(CRMReunion).where(CRMReunion.cliente_id == cli_id))
            await db.execute(delete(CRMActividad).where(CRMActividad.cliente_id == cli_id))
            await db.execute(delete(CRMInteraccion).where(CRMInteraccion.cliente_id == cli_id))
            await db.execute(delete(CRMContacto).where(CRMContacto.cliente_id == cli_id))
            await db.execute(delete(CRMCliente).where(CRMCliente.id == cli_id))
            await db.commit()
        for i in ids:
            audio.borrar_todo(ESQUEMA, i)
        ia.usar_motor_de_pruebas(None)
        vexa.usar_transporte_de_pruebas(None)
        settings.VEXA_URL = settings.VEXA_API_KEY = ""

    print()
    print("Bot de reuniones: %d fallos." % len(fallos))
    return 1 if fallos else 0


def marta_id(d, contacto_id):
    return next(p["id"] for p in d["participantes"] if p["contacto_id"] == contacto_id)


if __name__ == "__main__":
    sys.exit(asyncio.run(principal()))
