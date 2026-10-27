"""
El bot propio, sobre Vexa 0.12 autoalojado (design D3).

Vexa entra a la reunión con un navegador, graba el audio y transcribe por
participante. De Vexa se toman la grabación y los tramos de habla con su
hablante; la transcripción que queda en el CRM se hace con nuestro flujo
(gpt-transcribe y el vocabulario del cliente), igual que en las presenciales.

Vexa no tiene webhooks hacia el cliente: la cola consulta su estado cada
pocos segundos (trabajo SONDEAR_BOT).

Lo que la documentación de 0.12 no fija (formato de la grabación, códigos de
falla) se lee con tolerancia y se ajusta contra el servidor real (tarea 6.1).
"""
from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional

import httpx

from app.core.config import settings
from app.core.reuniones import servicio
from app.core.reuniones.captura import (
    NOMBRE_BOT, CapturaNoDisponible, Destino, EstadoBot, ResultadoCaptura,
)
from app.infrastructure.models.crm_reuniones import CRMReunionCaptura

PLATAFORMA_VEXA = {"MEET": "google_meet", "TEAMS": "teams", "ZOOM": "zoom"}
EN_CURSO = {"requested", "joining", "awaiting_admission", "needs_help", "active", "stopping"}

# Transporte inyectable: las pruebas montan un Vexa falso sin red.
_transporte_de_pruebas: Optional[httpx.AsyncBaseTransport] = None


def usar_transporte_de_pruebas(t: Optional[httpx.AsyncBaseTransport]) -> None:
    global _transporte_de_pruebas
    _transporte_de_pruebas = t


def motivo_legible(estado: str, detalle: str) -> str:
    """Traduce la falla del bot a algo que el ejecutivo pueda entender y resolver."""
    d = (detalle or "").lower()
    if any(p in d for p in ("admission", "admit", "waiting room", "waitingroom", "lobby", "sala de espera")):
        return "El bot no fue admitido: nadie lo dejó entrar desde la sala de espera."
    if any(p in d for p in ("anonymous", "guest", "sign in", "sign-in", "not allowed", "blocked")):
        return ("La organización de la reunión no permite invitados anónimos. "
                "Grabe la reunión desde la aplicación o suba la grabación al terminar.")
    if any(p in d for p in ("not found", "invalid meeting", "does not exist", "ended")):
        return "La reunión no existe o ya terminó."
    return f"El bot no pudo grabar la reunión ({detalle or estado})."


class ProveedorVexa:
    nombre = "vexa"

    def __init__(self) -> None:
        if not (settings.VEXA_URL and settings.VEXA_API_KEY):
            raise CapturaNoDisponible("El bot de reuniones no está configurado en este servidor.")
        self.base = settings.VEXA_URL.rstrip("/")

    def _cliente(self, timeout: float = 30) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=self.base, headers={"X-API-Key": settings.VEXA_API_KEY},
                                 timeout=timeout, transport=_transporte_de_pruebas)

    async def pedir_bot(self, destino: Destino) -> Dict:
        if destino.plataforma not in PLATAFORMA_VEXA:
            raise CapturaNoDisponible("Plataforma no admitida.")
        cuerpo = {
            "platform": PLATAFORMA_VEXA[destino.plataforma], "native_meeting_id": destino.id_externo,
            "bot_name": NOMBRE_BOT, "language": "es",
            # La grabación es la que se transcribe en el CRM; la transcripción de
            # Vexa da quién habló y cuándo.
            "recording_enabled": True, "transcribe_enabled": True,
        }
        if destino.clave:
            cuerpo["passcode"] = destino.clave
        if destino.plataforma == "ZOOM" and destino.enlace:
            cuerpo["meeting_url"] = destino.enlace
        async with self._cliente() as c:
            r = await c.post("/bots", json=cuerpo)
        if r.status_code == 409:
            raise CapturaNoDisponible("Ya hay un bot grabando esa reunión.")
        if r.status_code in (403, 429):
            raise CapturaNoDisponible("El bot está ocupado en otras reuniones. Intente en unos minutos o grabe desde la aplicación.")
        if r.status_code == 503:
            raise CapturaNoDisponible("El bot no tiene configurado su servicio de transcripción.")
        r.raise_for_status()
        d = r.json() if r.content else {}
        return {"meeting_id": d.get("id") or d.get("meeting_id"), "plataforma_vexa": cuerpo["platform"]}

    async def _registro(self, cap: CRMReunionCaptura) -> dict:
        plat = (cap.datos or {}).get("plataforma_vexa") or PLATAFORMA_VEXA[cap.plataforma]
        async with self._cliente() as c:
            r = await c.get(f"/transcripts/{plat}/{cap.id_externo}")
        r.raise_for_status()
        return r.json()

    async def estado(self, cap: CRMReunionCaptura) -> EstadoBot:
        d = await self._registro(cap)
        reunion = d.get("meeting") if isinstance(d.get("meeting"), dict) else d
        est = str(reunion.get("status") or "requested").lower()
        if est in EN_CURSO:
            return EstadoBot(estado=est, en_reunion=est in ("active", "stopping"))
        if est == "completed":
            return EstadoBot(estado=est, terminado=True, exito=True)
        datos = reunion.get("data") or {}
        detalle = " ".join(str(x) for x in (
            reunion.get("last_error"), reunion.get("error_details"), datos.get("last_error"),
            datos.get("error_details"), datos.get("auto_join_error"), datos.get("reason")) if x)
        return EstadoBot(estado=est, terminado=True, exito=False, motivo=motivo_legible(est, detalle))

    async def resultado(self, cap: CRMReunionCaptura, carpeta: Path) -> ResultadoCaptura:
        d = await self._registro(cap)
        segs: List[servicio.Segmento] = []
        for s in d.get("segments") or []:
            if s.get("completed") is False:
                continue                       # borradores en vivo: no son definitivos
            nombre = (s.get("speaker") or "").strip()
            if nombre and s.get("start") is not None and s.get("end") is not None:
                segs.append(servicio.Segmento(nombre, float(s["start"]), float(s["end"])))
        reunion = d.get("meeting") if isinstance(d.get("meeting"), dict) else d
        meeting_id = (cap.datos or {}).get("meeting_id") or reunion.get("id")
        destino = carpeta / "grabacion_bot"
        async with self._cliente(timeout=300) as c:
            lista = (await c.get("/recordings", params={"meeting_id": meeting_id} if meeting_id else None)).json()
            grabaciones = lista.get("recordings", lista) if isinstance(lista, dict) else lista
            grab = next((g for g in grabaciones if not meeting_id or g.get("meeting_id") in (meeting_id, None)), None)
            if not grab:
                raise RuntimeError("El bot terminó pero Vexa no tiene la grabación.")
            maestro = (await c.get(f"/recordings/{grab['id']}/master", params={"type": "audio"})).json()
            url = maestro.get("raw_url")
            if not url:
                raise RuntimeError("Vexa no entregó la dirección del audio.")
            ext = Path(str(maestro.get("filename") or maestro.get("format") or ".webm")).suffix or ".webm"
            destino = destino.with_suffix(ext if ext.startswith(".") else "." + ext)
            async with c.stream("GET", url) as r:
                r.raise_for_status()
                with destino.open("wb") as f:
                    async for trozo in r.aiter_bytes(1 << 20):
                        f.write(trozo)
        return ResultadoCaptura(audio=destino, participantes=list(dict.fromkeys(s.nombre_captura for s in segs)),
                                segmentos=segs)

    async def retirar(self, cap: CRMReunionCaptura) -> None:
        plat = (cap.datos or {}).get("plataforma_vexa") or PLATAFORMA_VEXA[cap.plataforma]
        async with self._cliente() as c:
            r = await c.delete(f"/bots/{plat}/{cap.id_externo}")
        if r.status_code not in (200, 202, 204, 404):
            r.raise_for_status()
