"""
Autenticación por omisión para toda la API.

De las 1.236 rutas, 470 no pedían token: se podía leer y escribir sin
identificarse. Poner la dependencia en cada una era editar 470 firmas y, sobre
todo, dejar la puerta abierta a que la próxima ruta naciera igual de expuesta.

Acá se exige token en todas y se exime a mano el puñado que debe ser público.
El defecto pasa a ser seguro: una ruta nueva queda protegida sin que nadie tenga
que acordarse.
"""
from fastapi import Depends, HTTPException, Request, status

from app.core.security import decode_token

# Lo único que se atiende sin sesión, y por qué.
RUTAS_PUBLICAS = (
    "/api/v1/auth/login",              # todavía no hay sesión
    "/api/v1/auth/clientes",           # paso previo: a qué empresa se entra
    "/api/v1/ags/publico",             # reserva de citas por parte del cliente final
    "/api/v1/landing/contenido",       # la pagina publica la ve cualquiera
    "/health",
    "/api/docs",
    "/api/redoc",
    "/api/openapi.json",
)


def es_publica(ruta: str) -> bool:
    return any(ruta.startswith(p) for p in RUTAS_PUBLICAS)


async def exigir_sesion(request: Request) -> None:
    """Exige token salvo en las rutas públicas.

    Se resuelve por ruta y no por router para que las excepciones queden
    enumeradas en un solo sitio, a la vista.
    """
    if es_publica(request.url.path):
        return
    # OPTIONS lo manda el navegador antes de la petición real, sin cabeceras.
    if request.method == "OPTIONS":
        return
    credenciales = request.headers.get("authorization") or ""
    if not credenciales.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionó token de acceso",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Se verifica la firma y el vencimiento, no solo que venga algo: comprobar
    # únicamente que la cabecera existe dejaría pasar cualquier texto.
    # `decode_token` lanza 401 por su cuenta si no cuadra.
    payload = decode_token(credenciales[7:])
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token no sirve para acceder; use el de acceso, no el de refresco",
            headers={"WWW-Authenticate": "Bearer"},
        )
