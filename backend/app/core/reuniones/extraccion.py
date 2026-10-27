"""
Lo que se verifica en nuestro código después de la extracción.

El modelo propone; aquí se decide qué se muestra:
- una cita que no aparece en la transcripción se descarta (el modelo a veces
  «parafrasea» y otras inventa);
- la fecha se valida (formato, y que no quede antes de la reunión ni absurda);
- el responsable se empareja con los participantes por nombre, y si hay duda
  queda «por asignar»: un compromiso mal asignado es peor que uno sin dueño.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import date, timedelta
from typing import List, Optional, Sequence


def normalizar(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto or "")
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    t = re.sub(r"[^\w\s]", " ", t)
    return " ".join(t.split())


@dataclass
class TramoTexto:
    inicio_s: float
    texto: str


class Buscador:
    """Busca una cita en la transcripción y dice en qué minuto empieza."""

    def __init__(self, tramos: Sequence[TramoTexto]) -> None:
        partes, self._mapa = [], []   # (posición donde empieza el tramo, inicio_s)
        pos = 0
        for t in tramos:
            n = normalizar(t.texto)
            if not n:
                continue
            self._mapa.append((pos, t.inicio_s))
            partes.append(n)
            pos += len(n) + 1
        self.texto = " ".join(partes)

    def minuto(self, cita: str) -> Optional[float]:
        """El inicio (s) del tramo donde empieza la cita, o None si no está."""
        c = normalizar(cita)
        # Una cita de dos palabras aparece en cualquier parte: no es evidencia.
        if len(c.split()) < 3:
            return None
        i = self.texto.find(c)
        if i < 0:
            return None
        inicio = None
        for pos, seg in self._mapa:
            if pos <= i:
                inicio = seg
            else:
                break
        return inicio


def fecha_valida(texto: Optional[str], fecha_reunion: date) -> Optional[date]:
    if not texto:
        return None
    try:
        f = date.fromisoformat(texto.strip()[:10])
    except ValueError:
        return None
    # Antes de la reunión no puede vencer algo que se acordó en ella; a más de
    # dos años es casi seguro un error de cálculo.
    if f < fecha_reunion or f > fecha_reunion + timedelta(days=730):
        return None
    return f


@dataclass
class Candidato:
    participante_id: int
    nombre: str
    lado: str          # NUESTRO (usuario de la empresa) | CLIENTE (contacto)


def emparejar(nombre_dicho: Optional[str], candidatos: List[Candidato]) -> Optional[Candidato]:
    """El único participante cuyo nombre contiene todas las palabras dichas.

    «Juan» empareja con «Juan Pérez» si no hay otro Juan; «Pérez» igual. Si
    dos coinciden, o ninguno, no se adivina.
    """
    palabras = [p for p in normalizar(nombre_dicho or "").split() if len(p) > 1]
    if not palabras:
        return None
    hallados = [c for c in candidatos if all(p in normalizar(c.nombre).split() for p in palabras)]
    return hallados[0] if len(hallados) == 1 else None
