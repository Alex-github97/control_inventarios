"""
Publica una versión del APK de la app móvil.

    python tools/publicar_apk.py TittanWare.apk --version 1.0.0 --codigo 1 \
        --notas "Primera versión: ingreso y mis órdenes" [--minima 1.0.0]

Copia el APK a uploads/movil/ (volumen persistente en producción) y escribe
version.json, que leen GET /movil/version y GET /movil/descarga. Escribe el
manifiesto al final y de forma atómica: nadie descarga un APK a medio copiar.
Conserva las tres versiones anteriores por si hay que volver atrás.
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.core.config import settings  # noqa: E402

CARPETA = Path(settings.UPLOAD_DIR) / "movil"


def main() -> None:
    a = argparse.ArgumentParser()
    a.add_argument("apk")
    a.add_argument("--version", required=True)
    a.add_argument("--codigo", type=int, required=True)
    a.add_argument("--notas", default="")
    a.add_argument("--minima")
    o = a.parse_args()

    origen = Path(o.apk)
    if not origen.is_file() or origen.read_bytes()[:2] != b"PK":
        sys.exit(f"{origen} no es un APK")
    CARPETA.mkdir(parents=True, exist_ok=True)
    archivo = f"tittanware-{o.version}.apk"
    shutil.copyfile(origen, CARPETA / archivo)
    datos = (CARPETA / archivo).read_bytes()
    manifiesto = {
        "version": o.version, "codigo": o.codigo, "notas": o.notas, "minima": o.minima,
        "archivo": archivo, "tamano": len(datos), "sha256": hashlib.sha256(datos).hexdigest(),
        "publicada": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    tmp = CARPETA / "version.json.tmp"
    tmp.write_text(json.dumps(manifiesto, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, CARPETA / "version.json")

    viejos = sorted((p for p in CARPETA.glob("tittanware-*.apk") if p.name != archivo),
                    key=lambda p: p.stat().st_mtime, reverse=True)
    for p in viejos[3:]:
        p.unlink()
    print(f"Publicada {o.version} ({len(datos) / 1e6:.1f} MB) → {CARPETA / archivo}")


if __name__ == "__main__":
    main()
