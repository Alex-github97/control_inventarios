"""
La captura de reuniones virtuales, independiente del proveedor (design D1).

Un proveedor (el bot propio sobre Vexa hoy; Recall.ai u otro mañana) solo
tiene que saber cuatro cosas: mandar el bot, decir en qué va, entregar el
resultado y retirarse. El resultado es siempre el mismo: un archivo de audio,
quiénes aparecieron y, si los tiene, los tramos de habla de cada uno.

`recibir()` es la única puerta de entrada al CRM: arma los participantes,
guarda los tramos y deja la reunión lista para transcribir. Por eso cambiar de
proveedor no cambia nada de lo que viene después.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Protocol
from urllib.parse import parse_qs, unquote, urlparse

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.reuniones import servicio
from app.core.reuniones.extraccion import Candidato, emparejar
from app.infrastructure.models.crm_reuniones import (
    PROCESANDO, CRMReunion, CRMReunionCaptura, CRMReunionParticipante,
)

NOMBRE_BOT = "Asistente TittanWare — grabando"


class CapturaNoDisponible(Exception):
    """El proveedor no puede atender esta reunión (sin configurar, plataforma no admitida…)."""


@dataclass
class Destino:
    """A qué reunión mandar el bot, ya interpretado desde el enlace."""
    plataforma: str                 # MEET | TEAMS | ZOOM
    id_externo: str
    clave: Optional[str] = None     # passcode de Teams
    enlace: Optional[str] = None


@dataclass
class EstadoBot:
    estado: str                     # tal como lo dice el proveedor
    terminado: bool = False
    exito: bool = False
    motivo: Optional[str] = None    # por qué falló, en palabras para el usuario
    en_reunion: bool = False


@dataclass
class ResultadoCaptura:
    audio: Path
    participantes: List[str] = field(default_factory=list)
    segmentos: List[servicio.Segmento] = field(default_factory=list)


class Proveedor(Protocol):
    nombre: str
    async def pedir_bot(self, destino: Destino) -> Dict: ...
    async def estado(self, cap: CRMReunionCaptura) -> EstadoBot: ...
    async def resultado(self, cap: CRMReunionCaptura, carpeta: Path) -> ResultadoCaptura: ...
    async def retirar(self, cap: CRMReunionCaptura) -> None: ...


# ── Del enlace a la reunión ───────────────────────────────────────────────────
_MEET = re.compile(r"meet\.google\.com/([a-z]{3}-[a-z]{4}-[a-z]{3})", re.I)


def destino_de(enlace: str) -> Destino:
    """Interpreta el enlace de la reunión. Lanza CapturaNoDisponible si no se entiende."""
    e = (enlace or "").strip()
    u = urlparse(e if "://" in e else "https://" + e)
    host = (u.hostname or "").lower()
    m = _MEET.search(e)
    if m:
        return Destino("MEET", m.group(1).lower(), enlace=e)
    if host.endswith("teams.live.com"):
        # https://teams.live.com/meet/9381234567890?p=AbCdEf
        num = re.search(r"/meet/(\d{10,15})", u.path)
        if num:
            return Destino("TEAMS", num.group(1), clave=(parse_qs(u.query).get("p") or [None])[0], enlace=e)
    if host.endswith("teams.microsoft.com"):
        # https://teams.microsoft.com/l/meetup-join/19%3ameeting_XXX%40thread.v2/0?context=…
        hilo = re.search(r"meetup-join/([^/]+)", u.path)
        if hilo:
            return Destino("TEAMS", unquote(hilo.group(1)), enlace=e)
        num = re.search(r"/meet/(\d{10,15})", u.path)
        if num:
            return Destino("TEAMS", num.group(1), clave=(parse_qs(u.query).get("p") or [None])[0], enlace=e)
    if host.endswith("zoom.us"):
        num = re.search(r"/j/(\d{9,12})", u.path)
        if num:
            return Destino("ZOOM", num.group(1), clave=(parse_qs(u.query).get("pwd") or [None])[0], enlace=e)
    raise CapturaNoDisponible("No se reconoce el enlace. Pegue el enlace completo de Google Meet, Microsoft Teams o Zoom.")


# ── La única puerta de entrada al CRM ─────────────────────────────────────────
async def recibir(db: AsyncSession, r: CRMReunion, cap: Optional[CRMReunionCaptura],
                  res: ResultadoCaptura, fuente: str) -> None:
    """Deja la reunión con su audio, sus participantes y sus tramos, lista para transcribir."""
    parts = await servicio.participantes(db, r.id)
    cands = [Candidato(p.id, p.nombre, "NUESTRO" if p.usuario_id else "CLIENTE") for p in parts]
    nombres = list(dict.fromkeys([*res.participantes, *[s.nombre_captura for s in res.segmentos]]))
    for nombre in nombres:
        if not nombre or nombre == NOMBRE_BOT:
            continue
        ya = next((p for p in parts if p.nombre_captura == nombre), None)
        if ya:
            continue
        # Se empareja con quien ya estaba invitado («Marta G.» con «Marta Gómez»);
        # si no, entra como participante sin identificar, que el ejecutivo puede
        # asignar después.
        hallado = emparejar(nombre, cands)
        if hallado:
            p = next(p for p in parts if p.id == hallado.participante_id)
            if not p.nombre_captura:
                p.nombre_captura = nombre
                continue
        nuevo = CRMReunionParticipante(reunion_id=r.id, nombre=nombre[:160], nombre_captura=nombre[:160])
        db.add(nuevo)
        parts.append(nuevo)
    if cap is not None:
        cap.segmentos = [{"nombre": s.nombre_captura, "inicio_s": s.inicio_s, "fin_s": s.fin_s} for s in res.segmentos]
        cap.terminada_en = servicio.ahora()
    r.audio_ruta, r.estado, r.fuente_captura, r.motivo_falla = str(res.audio), PROCESANDO, fuente, None
    await db.flush()
    await servicio.encolar(db, r.id, "TRANSCRIBIR")


def segmentos_de(cap: Optional[CRMReunionCaptura]) -> List[servicio.Segmento]:
    if not cap or not cap.segmentos:
        return []
    return [servicio.Segmento(s["nombre"], float(s["inicio_s"]), float(s["fin_s"])) for s in cap.segmentos]


# ── Proveedor en uso ──────────────────────────────────────────────────────────
_proveedor_de_pruebas: Optional[Proveedor] = None


def proveedor() -> Proveedor:
    if _proveedor_de_pruebas is not None:
        return _proveedor_de_pruebas
    from app.core.reuniones.vexa import ProveedorVexa
    return ProveedorVexa()


def configurado() -> bool:
    from app.core.config import settings
    return _proveedor_de_pruebas is not None or bool(settings.VEXA_URL and settings.VEXA_API_KEY)


def usar_proveedor_de_pruebas(p: Optional[Proveedor]) -> None:
    global _proveedor_de_pruebas
    _proveedor_de_pruebas = p
