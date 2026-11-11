"""
App móvil del CMMS: sesión de dispositivo, versión publicada y descarga del APK.

- `POST /movil/sesion`: ingreso desde el teléfono. Mismas comprobaciones que
  el portal (`auth.autenticar`) y además exige el CMMS contratado. Devuelve un
  token de acceso normal y un secreto de renovación de un solo uso.
- `POST /movil/renovar`: cambia el secreto por un token nuevo y un secreto
  nuevo. Falla si el dispositivo se revocó, venció (30 días sin uso), el
  usuario quedó inactivo o cambió su clave.
- `GET /movil/version` (público) y `GET /movil/descarga` (con sesión y CMMS):
  el APK vive en `uploads/movil/`, junto a `version.json`, que escribe
  `tools/publicar_apk.py`. Es el mismo archivo para todas las empresas.
"""
import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import _cliente_de_la_peticion, autenticar
from app.application.schemas.usuario import LoginRequest, UsuarioResponse
from app.core import sesiones
from app.core.acceso_modulos import modulos_de
from app.core.config import settings
from app.core.database import get_db, get_db_plataforma
from app.core.dependencies import get_current_user, require_admin
from app.core.security import create_access_token, decode_token, firmar
from app.infrastructure.models.movil import MovilDispositivo
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/movil", tags=["App móvil"])

VIGENCIA = timedelta(days=30)
CARPETA_APK = Path(settings.UPLOAD_DIR) / "movil"
_REVOCADO = "Este teléfono ya no tiene acceso. Vuelva a ingresar."


def _huella(secreto: str) -> str:
    return hashlib.sha256(secreto.encode()).hexdigest()


def _huella_clave(usuario: Usuario) -> str:
    return hashlib.sha256(usuario.hashed_password.encode()).hexdigest()[:16]


def _sin_acceso(detalle: str = _REVOCADO) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detalle, headers={"WWW-Authenticate": "Bearer"})


class DatosDispositivo(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    modelo: Optional[str] = Field(None, max_length=120)
    version_app: Optional[str] = Field(None, max_length=30)


class SesionMovilRequest(LoginRequest):
    dispositivo: DatosDispositivo


class RenovarRequest(BaseModel):
    renovacion: str = Field(..., min_length=20, max_length=200)


class SesionMovilResponse(BaseModel):
    access_token: str
    renovacion: str
    dispositivo_id: int
    vence: datetime
    user: UsuarioResponse
    modulos: List[str]
    empresa: str


async def _tokens(cliente, usuario: Usuario, disp: MovilDispositivo, db: AsyncSession) -> SesionMovilResponse:
    """Rota el secreto del dispositivo y emite un token de acceso atado a una
    sesión nueva del servidor (la misma clase de sesión del portal)."""
    secreto = secrets.token_urlsafe(48)
    ahora = datetime.now(timezone.utc)
    disp.huella_anterior = disp.huella
    disp.huella = _huella(secreto)
    disp.ultimo_uso = ahora
    disp.vence = ahora + VIGENCIA
    await db.commit()
    sid = await sesiones.crear(usuario.id, cliente.esquema, cliente.codigo)
    return SesionMovilResponse(
        access_token=create_access_token(usuario.id, cliente=cliente.codigo, esquema=cliente.esquema,
                                         usuario=usuario.username, sesion=sid),
        renovacion=secreto, dispositivo_id=disp.id, vence=disp.vence,
        user=UsuarioResponse.model_validate(usuario),
        modulos=sorted(await modulos_de(cliente.codigo)), empresa=cliente.nombre,
    )


async def _exigir_cmms(codigo: str) -> None:
    permitidos = await modulos_de(codigo)
    if "*" not in permitidos and "eam" not in permitidos:
        raise HTTPException(status.HTTP_403_FORBIDDEN,
                            "Su empresa no tiene contratado el CMMS, que es lo que trae la app móvil.")


@router.post("/sesion", response_model=SesionMovilResponse)
async def abrir_sesion(
    data: SesionMovilRequest, request: Request,
    x_cliente: Optional[str] = Header(None, alias="X-Cliente"),
    db: AsyncSession = Depends(get_db), db_plataforma: AsyncSession = Depends(get_db_plataforma),
):
    cliente, usuario = await autenticar(data, request, x_cliente, db, db_plataforma)
    await _exigir_cmms(cliente.codigo)
    ahora = datetime.now(timezone.utc)
    disp = MovilDispositivo(
        usuario_id=usuario.id, nombre=data.dispositivo.nombre.strip(), modelo=data.dispositivo.modelo,
        version_app=data.dispositivo.version_app, huella=_huella(secrets.token_urlsafe(32)),
        huella_clave=_huella_clave(usuario), ultimo_uso=ahora, vence=ahora + VIGENCIA,
    )
    db.add(disp)
    await db.flush()
    return await _tokens(cliente, usuario, disp, db)


@router.post("/renovar", response_model=SesionMovilResponse)
async def renovar(
    data: RenovarRequest,
    x_cliente: Optional[str] = Header(None, alias="X-Cliente"),
    x_app_version: Optional[str] = Header(None, alias="X-App-Version"),
    db: AsyncSession = Depends(get_db), db_plataforma: AsyncSession = Depends(get_db_plataforma),
):
    cliente = await _cliente_de_la_peticion(x_cliente, db_plataforma)
    await db.execute(text(f'SET search_path TO "{cliente.esquema}"'))
    huella = _huella(data.renovacion)
    disp = (await db.execute(select(MovilDispositivo).where(
        or_(MovilDispositivo.huella == huella, MovilDispositivo.huella_anterior == huella))
        .with_for_update())).scalar_one_or_none()
    if disp is None:
        raise _sin_acceso()
    ahora = datetime.now(timezone.utc)

    async def revocar(motivo: str):
        disp.revocado_en, disp.motivo = ahora, motivo
        await db.commit()
        raise _sin_acceso(motivo if "clave" in motivo else _REVOCADO)

    if disp.revocado_en:
        raise _sin_acceso()
    if disp.huella_anterior == huella and disp.huella != huella:
        # El secreto ya se había cambiado: alguien más lo tiene.
        await revocar("Se usó un secreto de renovación ya reemplazado.")
    if disp.vence < ahora:
        await revocar("Venció por 30 días sin uso.")
    usuario = await db.get(Usuario, disp.usuario_id)
    if usuario is None or not usuario.activo or usuario.bloqueado:
        await revocar("El usuario está inactivo o bloqueado.")
    if _huella_clave(usuario) != disp.huella_clave:
        await revocar("Su clave cambió: vuelva a ingresar con la nueva.")
    await _exigir_cmms(cliente.codigo)
    if x_app_version:
        disp.version_app = x_app_version[:30]
    return await _tokens(cliente, usuario, disp, db)


# ─── Dispositivos del usuario (revocar) ─────────────────────────────────────

class DispositivoResponse(BaseModel):
    id: int
    usuario_id: int
    nombre: str
    modelo: Optional[str]
    version_app: Optional[str]
    ultimo_uso: datetime
    vence: datetime
    revocado_en: Optional[datetime]
    motivo: Optional[str]

    model_config = {"from_attributes": True}


@router.get("/dispositivos", response_model=List[DispositivoResponse])
async def listar_dispositivos(usuario_id: Optional[int] = None, db: AsyncSession = Depends(get_db),
                              actual: Usuario = Depends(get_current_user)):
    """Los propios; un administrador puede ver los de cualquiera."""
    if usuario_id is not None and usuario_id != actual.id:
        await require_admin(actual)
    q = select(MovilDispositivo).where(MovilDispositivo.usuario_id == (usuario_id or actual.id))
    return (await db.execute(q.order_by(MovilDispositivo.ultimo_uso.desc()).limit(50))).scalars().all()


@router.delete("/dispositivos/{dispositivo_id}", status_code=204)
async def revocar_dispositivo(dispositivo_id: int, db: AsyncSession = Depends(get_db),
                              actual: Usuario = Depends(get_current_user)):
    disp = await db.get(MovilDispositivo, dispositivo_id)
    if disp is None:
        raise HTTPException(404, "Dispositivo no encontrado")
    if disp.usuario_id != actual.id:
        await require_admin(actual)
    if not disp.revocado_en:
        disp.revocado_en = datetime.now(timezone.utc)
        disp.motivo = f"Revocado por {actual.username}."
        await db.commit()


# ─── Versión y descarga ─────────────────────────────────────────────────────

class VersionResponse(BaseModel):
    version: str
    codigo: int
    notas: str = ""
    publicada: str
    tamano: int
    sha256: str
    minima: Optional[str] = None


# Dos apps desde el mismo código: TittanWare (CMMS) en uploads/movil/ y
# TittanLite (llantas) en uploads/movil/lite/. Cada una con su version.json.
APPS = {"cmms": ("", "TittanWare"), "lite": ("lite", "TittanLite")}


def _app(app: Optional[str]) -> str:
    return app if app in APPS else "cmms"


def _carpeta(app: str) -> Path:
    sub = APPS[_app(app)][0]
    return CARPETA_APK / sub if sub else CARPETA_APK


def _manifiesto(app: str = "cmms") -> Optional[dict]:
    carpeta = _carpeta(app)
    try:
        datos = json.loads((carpeta / "version.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return datos if (carpeta / datos.get("archivo", "")).is_file() else None


@router.get("/version", response_model=VersionResponse)
async def version_publicada(app: str = "cmms"):
    """Pública: la app la consulta antes de ingresar para saber si hay una nueva."""
    m = _manifiesto(app)
    if m is None:
        raise HTTPException(404, "Todavía no hay una versión publicada de la app.")
    return VersionResponse(**{k: m[k] for k in VersionResponse.model_fields if k in m})


class EnlaceDescarga(BaseModel):
    url: str
    vence: datetime


@router.post("/enlace-descarga", response_model=EnlaceDescarga)
async def enlace_descarga(app: str = "cmms", usuario: Usuario = Depends(get_current_user)):
    """Un enlace directo al APK, válido unos minutos.

    En el teléfono la descarga tiene que hacerla el navegador, con su gestor de
    descargas: bajar 48 MB por JavaScript a memoria y armar un enlace `blob:`
    falla en Android (navegadores de lectores de QR, Samsung Internet, datos
    móviles lentos). Y el navegador no manda la cabecera Authorization al abrir
    un enlace, por eso el permiso va firmado en la URL. Se emite aquí, con sesión
    y con el CMMS ya comprobado por el middleware de módulos.
    """
    if _manifiesto(app) is None:
        raise HTTPException(404, "Todavía no hay una versión publicada de la app.")
    vence = datetime.now(timezone.utc) + timedelta(minutes=10)
    token = firmar({"sub": str(usuario.id), "type": "apk", "app": _app(app), "exp": vence})
    return EnlaceDescarga(url=f"/api/v1/movil/apk/{token}", vence=vence)


def _servir_apk(app: str = "cmms") -> FileResponse:
    m = _manifiesto(app)
    if m is None:
        raise HTTPException(404, "Todavía no hay una versión publicada de la app.")
    return FileResponse(_carpeta(app) / m["archivo"], media_type="application/vnd.android.package-archive",
                        filename=f"{APPS[_app(app)][1]}-{m['version']}.apk")


@router.get("/apk/{token}")
async def descargar_con_enlace(token: str):
    """El APK por el enlace firmado (ruta pública: el permiso es el token)."""
    datos = decode_token(token)
    if datos.get("type") != "apk":
        raise HTTPException(401, "El enlace de descarga no es válido.")
    return _servir_apk(datos.get("app") or "cmms")


@router.get("/descarga")
async def descargar(app: str = "cmms", _: Usuario = Depends(get_current_user)):
    """El APK, solo con sesión: el prefijo /movil pertenece al CMMS, así que el
    middleware de módulos ya negó el paso a una empresa sin él."""
    return _servir_apk(app)
