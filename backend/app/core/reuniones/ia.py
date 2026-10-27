"""
Lo único que habla con OpenAI.

Tres operaciones: transcribir un trozo de audio, extraer los resultados de una
transcripción y emitir una credencial efímera para el texto en vivo. Las demás
partes del asistente reciben el `Motor` y no saben de la API; las pruebas
cambian `motor()` por un doble y no gastan ni dependen de la red.

`store=False` en la extracción: la respuesta no queda guardada del lado de
OpenAI. El audio y el texto igual salen del servidor; eso lo dice el aviso.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import List, Literal, Optional, Protocol

from pydantic import BaseModel, Field

from app.core.config import settings


class NoConfigurado(Exception):
    """No hay OPENAI_API_KEY: la función está apagada en este servidor."""


# ── Lo que devuelve la extracción (Structured Outputs) ────────────────────────
class ItemExtraido(BaseModel):
    tipo: Literal["COMPROMISO", "ACUERDO", "RIESGO"]
    descripcion: str = Field(description="Qué hay que hacer, qué se acordó o qué riesgo se mencionó, en una frase.")
    responsable: Optional[str] = Field(
        description="Nombre de quien se comprometió, tal como aparece en la reunión. Null si no se dijo o no es un compromiso.")
    lado: Optional[Literal["NUESTRO", "CLIENTE"]] = Field(
        description="NUESTRO si se compromete la empresa que organiza la reunión; CLIENTE si se compromete el cliente. Null si no es un compromiso o no se sabe.")
    fecha_limite: Optional[str] = Field(
        description="Fecha límite en formato AAAA-MM-DD calculada desde la fecha de la reunión. Null si no se dijo una fecha.")
    cita: str = Field(description="Frase copiada TEXTUALMENTE de la transcripción que respalda este punto.")


class ResultadoReunion(BaseModel):
    resumen: str = Field(description="Resumen de la reunión en 3 a 6 frases.")
    items: List[ItemExtraido]


INSTRUCCIONES = """Eres el asistente de un CRM comercial colombiano. Recibes la transcripción de una reunión entre {empresa} y su cliente {cliente}.

Devuelve:
- un resumen breve;
- los COMPROMISOS: alguien se obliga a hacer algo («yo les envío», «nosotros revisamos y les confirmamos el martes»);
- los ACUERDOS: decisiones que tomaron entre ambos;
- los RIESGOS: problemas, quejas o amenazas para la relación o el negocio.

Reglas:
- No inventes. Si nadie se comprometió a nada, la lista de compromisos va vacía.
- La «cita» debe ser una frase copiada TEXTUALMENTE de la transcripción, sin corregirla.
- La fecha de la reunión es {fecha} ({dia}). Calcula las fechas relativas («el viernes», «mañana», «la otra semana») desde ahí, en hora de Colombia. Si no se dijo cuándo, fecha_limite es null.
- El responsable se escribe como lo nombraron en la reunión; si no queda claro quién, es null.

Participantes conocidos:
{participantes}"""


class Motor(Protocol):
    def transcribir(self, ruta: Path, palabras_clave: List[str]) -> str: ...
    def extraer(self, transcripcion: str, contexto: dict) -> ResultadoReunion: ...
    def credencial_vivo(self) -> dict: ...


_DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]


def _palabras_validas(palabras: List[str]) -> str:
    # Una por línea y sin <, > ni saltos: OpenAI rechaza la petición entera si
    # una sola no cumple (guía de speech-to-text).
    limpias = []
    for p in palabras:
        p = " ".join(str(p).replace("<", " ").replace(">", " ").split())
        if p and p not in limpias:
            limpias.append(p)
    return "\n".join(limpias[:100])


class MotorOpenAI:
    def __init__(self) -> None:
        if not settings.OPENAI_API_KEY:
            raise NoConfigurado("El asistente de reuniones no está configurado en este servidor (falta OPENAI_API_KEY).")
        from openai import OpenAI
        # Reintentos del SDK para los cortes cortos; los largos los maneja la
        # cola con su propio espaciado.
        self.cliente = OpenAI(api_key=settings.OPENAI_API_KEY, max_retries=2, timeout=120)

    def transcribir(self, ruta: Path, palabras_clave: List[str]) -> str:
        with ruta.open("rb") as f:
            r = self.cliente.audio.transcriptions.create(
                model=settings.OPENAI_MODELO_TRANSCRIPCION,
                file=f,
                languages=["es"],
                keywords=_palabras_validas(palabras_clave) or None,
                response_format="json",
            )
        return (getattr(r, "text", "") or "").strip()

    def extraer(self, transcripcion: str, contexto: dict) -> ResultadoReunion:
        f: date = contexto["fecha"]
        sistema = INSTRUCCIONES.format(
            empresa=contexto.get("empresa") or "la empresa",
            cliente=contexto.get("cliente") or "el cliente",
            fecha=f.isoformat(), dia=_DIAS[f.weekday()],
            participantes="\n".join(f"- {p}" for p in contexto.get("participantes", [])) or "- (sin lista)",
        )
        r = self.cliente.responses.parse(
            model=settings.OPENAI_MODELO_EXTRACCION,
            input=[{"role": "system", "content": sistema},
                   {"role": "user", "content": transcripcion}],
            text_format=ResultadoReunion,
            store=False,
        )
        if r.output_parsed is None:
            raise RuntimeError("La extracción no devolvió un resultado válido (rechazo o respuesta incompleta).")
        return r.output_parsed

    def credencial_vivo(self) -> dict:
        r = self.cliente.realtime.client_secrets.create(
            expires_after={"anchor": "created_at", "seconds": 600},
            session={
                "type": "transcription",
                "audio": {"input": {
                    "transcription": {"model": settings.OPENAI_MODELO_VIVO, "languages": ["es"]},
                    # gpt-live-transcribe no admite VAD del servidor: el
                    # navegador decide cuándo termina cada turno.
                    "turn_detection": None,
                }},
            },
        )
        return {"valor": r.value, "vence": getattr(r, "expires_at", None)}


_motor_de_pruebas: Optional[Motor] = None


def motor() -> Motor:
    """El motor en uso. Lanza NoConfigurado si falta la clave."""
    if _motor_de_pruebas is not None:
        return _motor_de_pruebas
    return MotorOpenAI()


def configurado() -> bool:
    return _motor_de_pruebas is not None or bool(settings.OPENAI_API_KEY)


def usar_motor_de_pruebas(m: Optional[Motor]) -> None:
    global _motor_de_pruebas
    _motor_de_pruebas = m
