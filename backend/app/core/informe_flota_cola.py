"""
El informe PDF de flota: armarlo (directo o en segundo plano) y la cola que
reparte los grandes entre los procesos.

La cola sigue el patrón de la de reuniones (`core/reuniones/cola.py`): reclamar
es una sola sentencia con `FOR UPDATE SKIP LOCKED` que «presta» el trabajo
corriendo `siguiente_intento`; si el proceso muere a mitad, el préstamo vence y
otro lo retoma. Armar el PDF se puede repetir sin daño: sobrescribe el archivo.
"""
import asyncio
import logging
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional, Tuple

from sqlalchemy import text

from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.core.informe_flota_pdf import Encabezado, generar, resumir
from app.core.neumaticos_filtros import FiltrosLlanta
from app.core.neumaticos_flota import cargar_flota, reglas, umbrales
from app.core.neumaticos_novedades import novedades, sugerencias
from app.infrastructure.models.eam import EAMInformeFlotaTrabajo

log = logging.getLogger(__name__)

# Hasta cuántos vehículos se responde el PDF en la misma petición (unos
# segundos). Más que eso va a la cola.
DIRECTO_MAX = 200
INTERVALO = 10
PRESTAMO_S = 30 * 60
MAX_INTENTOS = 3
RAIZ = Path(settings.UPLOAD_DIR) / "informes_llantas"


def _fecha(valor) -> Optional[datetime]:
    if not valor:
        return None
    d = date.fromisoformat(valor) if isinstance(valor, str) else valor
    return datetime(d.year, d.month, d.day)


def periodo_texto(p: dict) -> str:
    desde, hasta = p.get("desde"), p.get("hasta")
    if desde and hasta:
        return f"Inspecciones del {date.fromisoformat(desde):%d/%m/%Y} al {date.fromisoformat(hasta):%d/%m/%Y}"
    if desde:
        return f"Inspecciones desde el {date.fromisoformat(desde):%d/%m/%Y}"
    if hasta:
        return f"Inspecciones hasta el {date.fromisoformat(hasta):%d/%m/%Y}"
    return "Última inspección registrada"


async def flota_de(db, p: dict):
    f = FiltrosLlanta(marcas=p.get("marca") or [], referencias=p.get("referencia") or [],
                      medidas=p.get("medida") or [], anios=p.get("anio_fabricacion") or [],
                      semanas=p.get("semana_fabricacion") or [])
    hasta = _fecha(p.get("hasta"))
    if hasta:
        hasta = hasta.replace(hour=23, minute=59, second=59)
    return await cargar_flota(db, activo_ids=p.get("activo_ids") or None, tipos_vehiculo=p.get("tipos_vehiculo") or None,
                              filtros=f, desde=_fecha(p.get("desde")), hasta=hasta)


async def armar(db, p: dict, flota=None) -> Tuple[bytes, int]:
    """El PDF y cuántos vehículos lleva. `p` son los parámetros del informe más
    la empresa, quien lo pide y el logo, ya resueltos."""
    if flota is None:
        flota = await flota_de(db, p)
    u = await umbrales(db)
    rs = await reglas(db, solo_activas=True)
    enc = Encabezado(empresa=p.get("empresa") or "", periodo=periodo_texto(p), generado_por=p.get("usuario") or "",
                     generado_en=datetime.now(), logo=p.get("logo"))

    def calcular():
        llantas = [ll for v in flota for ll in v.llantas]
        nov = novedades(llantas, u)
        sug = sugerencias(llantas, rs, u)
        return generar(flota, nov, sug, resumir(flota, nov, sug, u), u, enc)
    return await asyncio.to_thread(calcular), len(flota)


# ── La cola ───────────────────────────────────────────────────────────────────

_RECLAMAR = text("""
    UPDATE eam_informe_flota_trabajo
       SET intentos = intentos + 1,
           siguiente_intento = now() + make_interval(secs => CAST(:prestamo AS DOUBLE PRECISION))
     WHERE id = (SELECT id FROM eam_informe_flota_trabajo
                  WHERE estado = 'PENDIENTE' AND siguiente_intento <= now()
                  ORDER BY siguiente_intento, id
                  FOR UPDATE SKIP LOCKED LIMIT 1)
 RETURNING id, intentos
""")


async def _tiene_tabla(esquema: str) -> bool:
    async with engine.connect() as c:
        return bool((await c.execute(text("SELECT to_regclass(:t)"),
                                     {"t": f'"{esquema}".eam_informe_flota_trabajo'})).scalar())


async def vuelta(esquema: str) -> int:
    if not await _tiene_tabla(esquema):
        return 0
    async with AsyncSessionLocal(info={"esquema": esquema}) as db:
        fila = (await db.execute(_RECLAMAR, {"prestamo": PRESTAMO_S})).first()
        await db.commit()
    if fila is None:
        return 0
    trabajo_id, intentos = fila
    try:
        async with AsyncSessionLocal(info={"esquema": esquema}) as db:
            t = await db.get(EAMInformeFlotaTrabajo, trabajo_id)
            pdf, n = await armar(db, t.parametros)
            carpeta = RAIZ / esquema
            carpeta.mkdir(parents=True, exist_ok=True)
            ruta = carpeta / f"{trabajo_id}.pdf"
            await asyncio.to_thread(ruta.write_bytes, pdf)
            t.estado, t.archivo, t.vehiculos, t.error = "LISTO", str(ruta), n, None
            t.terminado_en = datetime.now(timezone.utc)
            await db.commit()
    except Exception as e:  # noqa: BLE001 — se registra y se reintenta
        log.warning("Informe de flota (%s) trabajo %s: %s", esquema, trabajo_id, e)
        async with AsyncSessionLocal(info={"esquema": esquema}) as db:
            t = await db.get(EAMInformeFlotaTrabajo, trabajo_id)
            t.error = f"{type(e).__name__}: {e}"[:2000]
            if intentos >= MAX_INTENTOS:
                t.estado = "FALLIDO"
            await db.commit()
    return 1


async def ciclo() -> None:
    from app.core.reuniones.cola import _esquemas
    while True:
        await asyncio.sleep(INTERVALO)
        try:
            for esq in await _esquemas():
                try:
                    await vuelta(esq)
                except Exception as e:  # noqa: BLE001 — un cliente con error no frena a los demás
                    log.warning("Informe de flota (%s): %s", esq, e)
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001
            log.warning("Informe de flota: %s", e)
