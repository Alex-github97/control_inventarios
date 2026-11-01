"""
Logo de cada empresa cliente: lo sube su administrador y lo usan el portal de
ingreso y los informes PDF.

Se guarda normalizado a PNG (fondo transparente conservado, lado mayor acotado)
en `UPLOAD_DIR/logos/<codigo>.png`, un archivo por empresa. Así el PDF no
depende de una URL externa ni de formatos que fpdf no lee, y el portal lo pide
a una ruta pública fija.

Las empresas antiguas pueden tener en `logo_url` una dirección externa puesta
por el operador. Para el PDF se descarga una vez (con tiempo corto) y se guarda
en la misma carpeta; si falla, el informe sale sin logo.
"""
import io
import logging
from pathlib import Path
from typing import Optional

from app.core.config import settings

log = logging.getLogger(__name__)

MAX_BYTES = 5 * 1024 * 1024
LADO_MAX = 1200
FORMATOS = {"PNG", "JPEG", "WEBP", "GIF", "BMP"}


class LogoInvalido(ValueError):
    pass


def _carpeta() -> Path:
    return Path(settings.UPLOAD_DIR) / "logos"


def ruta(codigo: str) -> Path:
    return _carpeta() / f"{codigo}.png"


def ruta_externa(codigo: str) -> Path:
    return _carpeta() / f"{codigo}.externo.png"


def url_publica(codigo: str) -> str:
    return f"/api/v1/auth/clientes/{codigo}/logo"


def normalizar(contenido: bytes) -> bytes:
    """La imagen subida, como PNG acotado. Rechaza lo que no es una imagen."""
    if len(contenido) > MAX_BYTES:
        raise LogoInvalido(f"La imagen pesa más de {MAX_BYTES // (1024 * 1024)} MB")
    from PIL import Image, UnidentifiedImageError
    try:
        img = Image.open(io.BytesIO(contenido))
        img.load()
    except (UnidentifiedImageError, OSError) as e:
        raise LogoInvalido("El archivo no es una imagen válida (use PNG o JPG).") from e
    if img.format not in FORMATOS:
        raise LogoInvalido("Formato no admitido: use PNG, JPG o WEBP.")
    img = img.convert("RGBA")
    # Recorta el margen transparente: un logo con mucho aire queda diminuto al centrarlo.
    caja = img.getchannel("A").getbbox()
    if caja:
        img = img.crop(caja)
    img.thumbnail((LADO_MAX, LADO_MAX))
    salida = io.BytesIO()
    img.save(salida, "PNG", optimize=True)
    return salida.getvalue()


def guardar(codigo: str, contenido: bytes) -> None:
    datos = normalizar(contenido)
    _carpeta().mkdir(parents=True, exist_ok=True)
    temporal = ruta(codigo).with_suffix(".tmp")
    temporal.write_bytes(datos)
    temporal.replace(ruta(codigo))


def borrar(codigo: str) -> None:
    for p in (ruta(codigo), ruta_externa(codigo)):
        p.unlink(missing_ok=True)


async def para_pdf(codigo: Optional[str], logo_url: Optional[str]) -> Optional[str]:
    """Ruta local del logo para el informe, o None si no hay ninguno legible."""
    if not codigo:
        return None
    propio = ruta(codigo)
    if propio.is_file():
        return str(propio)
    if not logo_url or not logo_url.startswith("http"):
        return None
    externo = ruta_externa(codigo)
    if externo.is_file():
        return str(externo)
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5, follow_redirects=True) as c:
            r = await c.get(logo_url)
            r.raise_for_status()
        datos = normalizar(r.content)
        _carpeta().mkdir(parents=True, exist_ok=True)
        externo.write_bytes(datos)
        return str(externo)
    except Exception as e:  # noqa: BLE001 — sin logo el informe sale igual
        log.info("No se pudo traer el logo externo de %s: %s", codigo, e)
        return None
