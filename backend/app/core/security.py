"""
Contraseñas y tokens.

CONTRASEÑAS: ARGON2id
Antes se usaba passlib con bcrypt. passlib no se mantiene desde 2020 (rompe con
bcrypt ≥ 4.1) y bcrypt corta en silencio la clave a 72 bytes: dos claves largas
que empiezan igual pasaban por la misma. Argon2id es la primera recomendación
de OWASP: resiste ataques con GPU porque cada intento exige memoria, no solo
cálculo. Parámetros: el perfil de bajo consumo de RFC 9106 (64 MiB, 3 pasadas,
4 hilos), que en el servidor tarda del orden de 50–100 ms por intento.

Las claves que ya estaban en bcrypt siguen funcionando: al entrar con una
clave correcta se rehace el hash en Argon2id (`verificar_clave` devuelve el
nuevo), así la base se migra sola sin pedirle nada a nadie.

TOKENS: PyJWT
python-jose 3.3.0 tiene vulnerabilidades publicadas (CVE-2024-33663 y
CVE-2024-33664) y casi no se mantiene. PyJWT exige declarar el algoritmo al
validar, que es lo que evita la confusión de algoritmos.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Tuple

import bcrypt
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from fastapi import HTTPException, status

from app.core.config import settings

_argon2 = PasswordHasher()   # RFC 9106, perfil de bajo consumo: m=64 MiB, t=3, p=4

# Una clave más larga que esto no es una clave, es un intento de agotar el
# servidor (Argon2 procesa toda la entrada).
_LARGO_MAXIMO = 256

# Hash de relleno: cuando el usuario no existe se verifica contra él igual, para
# que la respuesta tarde lo mismo y no delate qué usuarios existen.
_HASH_DE_RELLENO = _argon2.hash("clave-de-relleno-que-nadie-usa")


def hash_password(password: str) -> str:
    return _argon2.hash(password)


def verificar_clave(plain_password: str, hashed_password: Optional[str]) -> Tuple[bool, Optional[str]]:
    """(correcta, hash_nuevo). `hash_nuevo` viene cuando hay que guardarlo:
    la clave estaba en bcrypt o en un Argon2 con parámetros viejos."""
    if not plain_password or len(plain_password) > _LARGO_MAXIMO:
        return False, None
    if not hashed_password:
        _argon2_verificar_relleno(plain_password)
        return False, None
    if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            ok = bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except ValueError:
            return False, None
        return ok, (hash_password(plain_password) if ok else None)
    try:
        _argon2.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False, None
    return True, (hash_password(plain_password) if _argon2.check_needs_rehash(hashed_password) else None)


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    return verificar_clave(plain_password, hashed_password)[0]


def _argon2_verificar_relleno(plain_password: str) -> None:
    try:
        _argon2.verify(_HASH_DE_RELLENO, plain_password)
    except Exception:  # noqa: BLE001 — solo importa gastar el mismo tiempo
        pass


def verificar_sin_usuario(plain_password: str) -> None:
    """Gasta lo mismo que una verificación real cuando el usuario no existe."""
    _argon2_verificar_relleno(plain_password[:_LARGO_MAXIMO] if plain_password else "x")


# ─── Política de contraseñas ──────────────────────────────────────────────────
# OWASP ASVS 4 (2.1): mínimo 12 caracteres, máximo de al menos 64, sin reglas de
# composición (obligan a «Clave2026!», que es justo lo que se adivina primero),
# y rechazo de claves conocidas y de las que repiten el usuario.
LARGO_MINIMO = 12
_COMUNES = {
    "123456789012", "1234567890123", "qwertyuiopas", "contraseña123", "contrasena123", "password1234",
    "passwordpassword", "administrador", "administrador1", "admin1234567", "tittanware", "tittanware2026",
    "colombia2026", "colombia12345", "bogota123456", "iloveyou1234", "aaaaaaaaaaaa", "111111111111",
    "000000000000", "abc123456789", "qwerty123456", "1q2w3e4r5t6y", "welcome12345", "bienvenido123",
}


def problema_de_clave(clave: str, usuario: Optional[str] = None) -> Optional[str]:
    """None si la clave sirve; si no, el porqué, para mostrárselo a la persona."""
    if len(clave) < LARGO_MINIMO:
        return f"La contraseña debe tener al menos {LARGO_MINIMO} caracteres."
    if len(clave) > 128:
        return "La contraseña no puede tener más de 128 caracteres."
    baja = clave.lower()
    if baja in _COMUNES or len(set(baja)) <= 3:
        return "Esa contraseña es demasiado común o repetitiva. Use una frase que solo usted conozca."
    if usuario and len(usuario) >= 3 and usuario.lower() in baja:
        return "La contraseña no puede contener el nombre de usuario."
    return None


# ─── Tokens ───────────────────────────────────────────────────────────────────

def create_access_token(
    subject: Any, expires_delta: Optional[timedelta] = None,
    cliente: Optional[str] = None, esquema: Optional[str] = None,
    usuario: Optional[str] = None, depositante: Optional[int] = None,
    sesion: Optional[str] = None,
) -> str:
    """El cliente viaja dentro del token, firmado.

    Si el inquilino se tomara de una cabecera suelta, cualquiera podría pedir
    datos de otro cliente con su propio token: el usuario es válido, solo cambia
    a qué esquema apunta. Yendo firmado, cambiarlo invalida la firma.

    `sesion` (sid) ata el token a una sesión del servidor: sin ella viva —por
    inactividad, por salir o porque se cambió la clave— el token ya no abre nada
    aunque no haya vencido.
    """
    ahora = datetime.now(timezone.utc)
    expire = ahora + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {"sub": str(subject), "exp": expire, "iat": ahora, "type": "access"}
    if cliente:
        payload["cli"] = cliente
    if esquema:
        payload["esq"] = esquema
    # El nombre de usuario, además del id. `sub` lleva el id, que es lo correcto
    # para identificar, pero todo lo que se muestra o se compara con una tabla
    # —el autor de un mensaje de soporte, el miembro del equipo— usa el nombre.
    # Sin esto había que consultar la base en cada petición solo para saberlo, y
    # los mensajes salían firmados con un número.
    if usuario:
        payload["usr"] = usuario
    # Usuario del portal de un depositante: la API solo le abre su portal.
    if depositante:
        payload["dep"] = depositante
    if sesion:
        payload["sid"] = sesion
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    subject: Any, cliente: Optional[str] = None, esquema: Optional[str] = None,
    sesion: Optional[str] = None,
) -> str:
    ahora = datetime.now(timezone.utc)
    expire = ahora + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(subject), "exp": expire, "iat": ahora, "type": "refresh"}
    if cliente:
        payload["cli"] = cliente
    if esquema:
        payload["esq"] = esquema
    if sesion:
        payload["sid"] = sesion
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def firmar(payload: dict) -> str:
    """Firma un token con otra forma (el de un dispositivo, por ejemplo)."""
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        # `algorithms` fijo: nunca se acepta el algoritmo que diga el token. El
        # vencimiento se valida siempre que venga; el token del cubicador no lo
        # lleva a propósito (se revoca por su huella) y los de usuario siempre.
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM],
                          options={"require": ["sub"]})
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
