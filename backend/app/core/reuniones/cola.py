"""
La cola de trabajos del asistente de reuniones (design D2).

Cómo se reparte entre varios procesos sin que dos hagan lo mismo:
1. Reclamar es UNA sentencia: toma el trabajo vencido más antiguo con
   `FOR UPDATE SKIP LOCKED` y le corre `siguiente_intento` hacia adelante (un
   «préstamo»). Se confirma enseguida, así que el candado dura milisegundos.
2. Quien lo reclamó lo ejecuta en otra transacción. Si termina, lo marca HECHO.
3. Si el proceso muere a mitad, nadie lo marca: al vencer el préstamo vuelve a
   estar disponible y otro proceso lo retoma. Por eso cada trabajo debe poder
   repetirse sin daño (transcribir borra los tramos antes de escribirlos;
   extraer reemplaza solo lo PROPUESTO).

`BackgroundTasks` de FastAPI no sirve: muere con el proceso, y en producción
los procesos han muerto.
"""
from __future__ import annotations

import asyncio
import logging
import zlib
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable, Dict, Optional

from sqlalchemy import text

from app.core.database import AsyncSessionLocal, engine
from app.core.reuniones import ia, servicio
from app.infrastructure.models.crm_reuniones import PROCESANDO, CRMReunion, CRMReunionTrabajo

log = logging.getLogger(__name__)

INTERVALO = 15
MAX_INTENTOS = 5
# Cuánto se «presta» un trabajo al reclamarlo. Transcribir una reunión larga
# tarda; si el préstamo vence antes, otro proceso la empezaría también.
PRESTAMO = {"TRANSCRIBIR": 45 * 60}
PRESTAMO_POR_DEFECTO = 10 * 60
RETENCION_CADA = 3600

_RECLAMAR = text("""
    UPDATE crm_reunion_trabajo
       SET intentos = intentos + 1,
           siguiente_intento = now() + make_interval(secs => CASE tipo
                                   WHEN 'TRANSCRIBIR' THEN CAST(:prestamo_transcribir AS DOUBLE PRECISION)
                                   ELSE CAST(:prestamo_otro AS DOUBLE PRECISION) END)
     WHERE id = (SELECT id FROM crm_reunion_trabajo
                  WHERE estado = 'PENDIENTE' AND siguiente_intento <= now()
                    AND (CAST(:tipo AS TEXT) IS NULL OR tipo = CAST(:tipo AS TEXT))
                  ORDER BY siguiente_intento, id
                  FOR UPDATE SKIP LOCKED
                  LIMIT 1)
 RETURNING id, tipo, reunion_id, intentos
""")


def espera(intentos: int) -> int:
    """30 s, 1 min, 2 min, 4 min… con tope de una hora."""
    return min(30 * 2 ** max(intentos - 1, 0), 3600)


async def reclamar(esquema: str, tipo: Optional[str] = None):
    async with AsyncSessionLocal(info={"esquema": esquema}) as db:
        fila = (await db.execute(_RECLAMAR, {
            "prestamo_transcribir": PRESTAMO["TRANSCRIBIR"], "prestamo_otro": PRESTAMO_POR_DEFECTO,
            "tipo": tipo})).first()
        await db.commit()
        return fila


async def _transcribir(db, esquema: str, r: CRMReunion) -> None:
    await servicio.transcribir(db, esquema, r)
    await servicio.encolar(db, r.id, "EXTRAER")


async def _extraer(db, esquema: str, r: CRMReunion) -> None:
    await servicio.extraer(db, esquema, r)
    await servicio.listo_para_revisar(r)


MANEJADORES: Dict[str, Callable[..., Awaitable[None]]] = {
    "TRANSCRIBIR": _transcribir,
    "EXTRAER": _extraer,
}


async def ejecutar(esquema: str, fila) -> bool:
    """Ejecuta un trabajo reclamado. Devuelve True si terminó bien."""
    trabajo_id, tipo, reunion_id, intentos = fila
    manejador = MANEJADORES.get(tipo)
    try:
        async with AsyncSessionLocal(info={"esquema": esquema}) as db:
            t = await db.get(CRMReunionTrabajo, trabajo_id)
            r = await db.get(CRMReunion, reunion_id) if reunion_id else None
            if manejador is None or (reunion_id and r is None):
                t.estado, t.ultimo_error = "FALLIDO", "Trabajo sin manejador o reunión inexistente."
                await db.commit()
                return False
            await manejador(db, esquema, r)
            t.estado, t.ultimo_error = "HECHO", None
            await db.commit()
            return True
    except ia.NoConfigurado as e:
        # Sin clave no tiene sentido reintentar: se avisa de una vez.
        return await _fallo(esquema, trabajo_id, reunion_id, str(e), definitivo=True)
    except Exception as e:  # noqa: BLE001 — cualquier falla del trabajo se registra y se reintenta
        log.warning("Reuniones (%s) trabajo %s %s: %s", esquema, trabajo_id, tipo, e)
        return await _fallo(esquema, trabajo_id, reunion_id, f"{type(e).__name__}: {e}",
                            definitivo=intentos >= MAX_INTENTOS)


async def _fallo(esquema: str, trabajo_id: int, reunion_id: Optional[int], motivo: str, definitivo: bool) -> bool:
    async with AsyncSessionLocal(info={"esquema": esquema}) as db:
        t = await db.get(CRMReunionTrabajo, trabajo_id)
        t.ultimo_error = motivo[:2000]
        if definitivo:
            t.estado = "FALLIDO"
            r = await db.get(CRMReunion, reunion_id) if reunion_id else None
            if r is not None:
                que = "la transcripción" if t.tipo == "TRANSCRIBIR" else "la extracción"
                await servicio.fallar(r, f"Falló {que}: {motivo}")
        else:
            t.siguiente_intento = datetime.now(timezone.utc) + timedelta(seconds=espera(t.intentos))
        await db.commit()
    return False


async def reintentar(db, r: CRMReunion) -> str:
    """Vuelve a encolar lo que falló: la extracción si ya hay transcripción, si no la transcripción."""
    tiene_tramos = bool(await servicio.tramos_de(db, r.id))
    tipo = "EXTRAER" if tiene_tramos else "TRANSCRIBIR"
    if tipo == "TRANSCRIBIR" and not r.audio_ruta:
        raise ValueError("No hay audio que transcribir: se borró o nunca se grabó.")
    r.estado, r.motivo_falla = PROCESANDO, None
    await servicio.encolar(db, r.id, tipo)
    return tipo


# ── El ciclo de fondo ──────────────────────────────────────────────────────────
async def _esquemas() -> list:
    async with engine.connect() as c:
        hay = (await c.execute(text("SELECT to_regclass('public.plataforma_cliente')"))).scalar()
        if not hay:
            return ["public"]
        filas = (await c.execute(text("SELECT esquema FROM public.plataforma_cliente WHERE activo = true"))).all()
    return list(dict.fromkeys(["public", *[f[0] for f in filas if f[0]]]))


async def _tiene_tablas(esquema: str) -> bool:
    async with engine.connect() as c:
        return bool((await c.execute(text("SELECT to_regclass(:t)"),
                                     {"t": f'"{esquema}".crm_reunion_trabajo'})).scalar())


async def vuelta(esquema: str, maximo: int = 3) -> int:
    """Hasta `maximo` trabajos de este esquema. Devuelve cuántos ejecutó."""
    if not await _tiene_tablas(esquema):
        return 0
    hechos = 0
    for _ in range(maximo):
        fila = await reclamar(esquema)
        if fila is None:
            break
        await ejecutar(esquema, fila)
        hechos += 1
    return hechos


async def retencion(esquema: str) -> None:
    """Una vez por hora y por esquema, con candado: solo un proceso la hace."""
    clave = zlib.crc32(f"crm-reuniones-retencion:{esquema}".encode())
    async with engine.connect() as candado:
        if not (await candado.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": clave})).scalar():
            return
        try:
            async with AsyncSessionLocal(info={"esquema": esquema}) as db:
                n = await servicio.aplicar_retencion(db, esquema)
                await db.commit()
                if n:
                    log.info("Reuniones (%s): audio borrado de %d reuniones por retención.", esquema, n)
        finally:
            await candado.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": clave})


async def ciclo() -> None:
    ultima_retencion = 0.0
    while True:
        await asyncio.sleep(INTERVALO)
        try:
            esquemas = await _esquemas()
            # Sin clave de OpenAI no se reclama nada: los trabajos esperan en la
            # cola en vez de fallar, y arrancan solos cuando se configure.
            for esq in (esquemas if ia.configurado() else []):
                try:
                    await vuelta(esq)
                except Exception as e:  # noqa: BLE001 — un cliente con error no frena a los demás
                    log.warning("Reuniones (%s): %s", esq, e)
            reloj = asyncio.get_running_loop().time()
            if reloj - ultima_retencion >= RETENCION_CADA:
                ultima_retencion = reloj
                for esq in esquemas:
                    try:
                        if await _tiene_tablas(esq):
                            await retencion(esq)
                    except Exception as e:  # noqa: BLE001
                        log.warning("Reuniones, retención (%s): %s", esq, e)
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001
            log.warning("Reuniones: %s", e)
