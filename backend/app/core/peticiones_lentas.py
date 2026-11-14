"""
Deja constancia de las peticiones lentas, para optimizar con datos y no a ojo.

POR QUÉ
Hasta el 2026-11-14 la plataforma no registraba cuánto tardaba cada ruta: una
queja de «está lento» no se podía ubicar en una pantalla concreta. Ahora toda
petición que pase de `PETICION_LENTA_MS` deja una línea en el registro:

    LENTA 2314 ms GET /api/v1/eam/neumaticos/informes/{tipo} -> 200 (/api/v1/eam/neumaticos/informes/cpk)

Se anota la ruta con su plantilla (`{tipo}`) para poder agruparlas, y la URL
real al final para reproducir el caso. Para verlas en el servidor:

    docker logs prod_backend 2>&1 | grep LENTA

Es ASGI puro (no `BaseHTTPMiddleware`): no envuelve la respuesta ni la parte en
trozos, así que no cambia nada de lo que el usuario recibe; solo mide.
"""
import logging
import time

from app.core.config import settings

# El de uvicorn es el que ya sale en `docker logs`.
log = logging.getLogger("uvicorn.error")


class PeticionesLentas:
    def __init__(self, app):
        self.app = app
        self.umbral = settings.PETICION_LENTA_MS / 1000.0

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or self.umbral <= 0:
            return await self.app(scope, receive, send)
        inicio = time.perf_counter()
        estado = {"codigo": 0}

        async def enviar(mensaje):
            if mensaje["type"] == "http.response.start":
                estado["codigo"] = mensaje["status"]
            await send(mensaje)

        try:
            await self.app(scope, receive, enviar)
        finally:
            duracion = time.perf_counter() - inicio
            if duracion >= self.umbral:
                ruta = scope.get("route")
                plantilla = getattr(ruta, "path", None) or scope.get("path", "")
                prefijo = settings.API_V1_PREFIX
                real = scope.get("path", "")
                if real.startswith(prefijo) and not plantilla.startswith(prefijo):
                    plantilla = prefijo + plantilla
                log.warning("LENTA %d ms %s %s -> %s (%s)", duracion * 1000,
                            scope.get("method", "?"), plantilla, estado["codigo"] or "sin respuesta", real)
