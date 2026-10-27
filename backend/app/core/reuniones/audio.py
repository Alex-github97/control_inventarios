"""
El audio de las reuniones, siempre en disco y nunca entero en memoria.

Los procesos del backend ya murieron por falta de memoria con un archivo de
21 MB cargado en cada uno; una reunión de una hora pesa más que eso. Todo pasa
por ffmpeg con archivos, y las funciones son síncronas para correrlas con
`asyncio.to_thread` sin frenar al resto de peticiones.

Por qué se parte en los silencios: `gpt-transcribe` no devuelve marcas de
tiempo, así que el minuto de cada tramo sale de dónde empieza el trozo. Cortar
en un silencio evita partir una frase por la mitad.
"""
from __future__ import annotations

import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

from app.core.config import settings

RAIZ = Path(settings.UPLOAD_DIR) / "reuniones"
FORMATOS = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"}

# Trozos de 15 a 60 s: lo bastante cortos para que el minuto de un compromiso
# sea preciso, y lo bastante largos para que cada uno tenga contexto.
TROZO_MIN_S = 15.0
TROZO_MAX_S = 60.0


class ErrorAudio(Exception):
    pass


def carpeta(esquema: str, reunion_id: int) -> Path:
    d = RAIZ / esquema / str(reunion_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def carpeta_partes(esquema: str, reunion_id: int) -> Path:
    d = carpeta(esquema, reunion_id) / "partes"
    d.mkdir(parents=True, exist_ok=True)
    return d


# Una «sesión» es un MediaRecorder: si el ejecutivo recarga la página a mitad
# de la reunión, el grabador vuelve a empezar con una cabecera nueva y sus
# partes no se pueden pegar byte a byte con las de antes.
def ruta_parte(esquema: str, reunion_id: int, sesion: int, numero: int) -> Path:
    return carpeta_partes(esquema, reunion_id) / f"s{sesion:02d}_{numero:06d}.webm"


def partes_faltantes(esquema: str, reunion_id: int, sesiones: Dict[int, int]) -> List[str]:
    """Las partes que faltan, como «sesión-número», según cuántas dijo el grabador."""
    faltan = []
    for sesion, total in sorted(sesiones.items()):
        for n in range(1, total + 1):
            if not ruta_parte(esquema, reunion_id, sesion, n).exists():
                faltan.append(f"{sesion}-{n}")
    return faltan


def _ffmpeg(*args: str) -> subprocess.CompletedProcess:
    if not shutil.which("ffmpeg"):
        raise ErrorAudio("ffmpeg no está instalado en el servidor.")
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-y", *args],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise ErrorAudio("ffmpeg: " + (r.stderr.strip().splitlines() or ["error"])[-1][:300])
    return r


def unir_partes(esquema: str, reunion_id: int, sesiones: Dict[int, int]) -> Path:
    """Une las partes del grabador web en un solo archivo, en orden.

    Dentro de una sesión, las partes de MediaRecorder son trozos de UN mismo
    flujo webm (solo la primera trae la cabecera): se pegan los bytes tal cual
    y se reempaqueta. Si hubo varias sesiones, cada una queda como archivo
    propio y se unen recodificando, que es lo único que acepta cabeceras
    distintas.
    """
    base = carpeta(esquema, reunion_id)
    por_sesion = []
    for sesion, total in sorted(sesiones.items()):
        crudo = base / f"sesion{sesion:02d}_cruda.webm"
        with crudo.open("wb") as salida:
            for n in range(1, total + 1):
                with ruta_parte(esquema, reunion_id, sesion, n).open("rb") as parte:
                    shutil.copyfileobj(parte, salida)
        limpio = base / f"sesion{sesion:02d}.webm"
        _ffmpeg("-i", str(crudo), "-c", "copy", str(limpio))
        crudo.unlink(missing_ok=True)
        por_sesion.append(limpio)

    final = base / "grabacion.webm"
    if len(por_sesion) == 1:
        por_sesion[0].replace(final)
    else:
        entradas = []
        for p in por_sesion:
            entradas += ["-i", str(p)]
        filtro = "".join(f"[{i}:a]" for i in range(len(por_sesion))) + f"concat=n={len(por_sesion)}:v=0:a=1[a]"
        _ffmpeg(*entradas, "-filter_complex", filtro, "-map", "[a]", "-c:a", "libopus", "-b:a", "48k", str(final))
        for p in por_sesion:
            p.unlink(missing_ok=True)
    return final


def normalizar(origen: Path, destino: Path) -> Path:
    """Mono, 16 kHz, Opus a 24 kbps: una hora queda en unos 11 MB."""
    _ffmpeg("-i", str(origen), "-vn", "-ac", "1", "-ar", "16000",
            "-c:a", "libopus", "-b:a", "24k", str(destino))
    return destino


def duracion(ruta: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", str(ruta)], capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        raise ErrorAudio("No se pudo leer la duración del audio.")


def silencios(ruta: Path) -> List[float]:
    """El punto medio de cada silencio de al menos 0,4 s."""
    r = _ffmpeg("-i", str(ruta), "-af", "silencedetect=noise=-35dB:d=0.4", "-f", "null", "-")
    inicios = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    fines = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return [(a + b) / 2 for a, b in zip(inicios, fines)]


def cortes(total_s: float, puntos_silencio: List[float]) -> List[tuple]:
    """Los trozos (inicio, fin) cortando en silencios.

    Se corta en el primer silencio después de TROZO_MIN_S, hasta el final: así
    el minuto de cada tramo es preciso también al cierre de la reunión. Si no
    hay silencio antes de TROZO_MAX_S, se corta ahí (alguien habló un minuto
    seguido sin pausa: es raro y el costo es una palabra partida). No se deja
    un último trozo de menos de 3 s: se suma al anterior.
    """
    trozos, inicio = [], 0.0
    puntos = sorted(p for p in puntos_silencio if 0 < p < total_s)
    while True:
        candidatos = [p for p in puntos if inicio + TROZO_MIN_S <= p <= inicio + TROZO_MAX_S and total_s - p >= 3]
        if candidatos:
            corte = candidatos[0]
        elif total_s - inicio > TROZO_MAX_S:
            corte = inicio + TROZO_MAX_S
        else:
            break
        trozos.append((inicio, corte))
        inicio = corte
    if total_s - inicio > 0.2:
        trozos.append((inicio, total_s))
    return trozos


@dataclass
class Trozo:
    inicio_s: float
    fin_s: float
    ruta: Path


def partir(normalizado: Path, carpeta_trozos: Path) -> List[Trozo]:
    carpeta_trozos.mkdir(parents=True, exist_ok=True)
    total = duracion(normalizado)
    resultado = []
    for i, (a, b) in enumerate(cortes(total, silencios(normalizado)), start=1):
        destino = carpeta_trozos / f"{i:05d}.ogg"
        _ffmpeg("-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", str(normalizado), "-c", "copy", str(destino))
        resultado.append(Trozo(a, b, destino))
    return resultado


def borrar_todo(esquema: str, reunion_id: int) -> None:
    shutil.rmtree(RAIZ / esquema / str(reunion_id), ignore_errors=True)
