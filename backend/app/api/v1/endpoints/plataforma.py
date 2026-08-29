"""
Consola del operador: administración de las empresas y de su gente.

Esto NO es la administración que usa cada empresa sobre sí misma —esa vive en
`usuarios.py` y trabaja siempre dentro del esquema de quien está conectado—.
Acá el operador actúa *sobre otros esquemas*, que es un poder distinto y mucho
mayor, y por eso está en un módulo aparte, detrás de `require_operador` y con
todo lo que hace registrado en la bitácora.

Regla que sostiene el diseño: la consola administra el **acceso**, no los datos.
Deja crear usuarios y devolver claves, que es lo que hace falta para dar de alta
y para rescatar a un cliente bloqueado; no deja leer sus estibas, sus activos ni
sus llantas.
"""
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, get_db_plataforma
from app.core.security import decode_token, hash_password
from app.core.tenant import ESQUEMA_PLATAFORMA, codigo_valido
from app.infrastructure.models.plataforma import PlataformaCliente, PlataformaBitacora
from app.infrastructure.models.usuario import Usuario
from app.api.v1.endpoints.auth import require_operador

router = APIRouter(prefix="/plataforma", tags=["Consola del operador"])


# ─── Trabajar dentro del esquema de otra empresa ──────────────────────────────

@asynccontextmanager
async def _sesion_de(esquema: str):
    """Una sesión apuntando al esquema de la empresa indicada.

    `get_db` fija el esquema a partir del token, que es el de quien está
    conectado; acá hace falta lo contrario: el operador entra desde su propia
    empresa y necesita escribir en la de otra.

    El esquema se interpola porque `search_path` no admite parámetros, así que
    solo puede venir del registro —nunca de la petición— y aun así se valida.
    """
    if not esquema or not esquema.replace("_", "").isalnum():
        raise HTTPException(400, f"Esquema inválido: «{esquema}»")
    async with AsyncSessionLocal() as s:
        try:
            await s.execute(text(f'SET search_path TO "{esquema}"'))
            yield s
            await s.commit()
        except Exception:
            await s.rollback()
            raise


def _clave_temporal() -> str:
    """Una clave de un solo uso, para entregar y cambiar.

    Se excluyen los caracteres que se confunden al dictarla por teléfono (O/0,
    l/1/I), porque estas claves se entregan a mano.
    """
    alfabeto = "".join(c for c in string.ascii_letters + string.digits if c not in "O0lI1")
    return "".join(secrets.choice(alfabeto) for _ in range(14))


async def _anotar(
    db: AsyncSession, request: Request, accion: str,
    empresa: Optional[str] = None, detalle: Optional[str] = None,
) -> None:
    """Deja constancia de lo que acaba de hacer el operador."""
    auth = request.headers.get("authorization") or ""
    datos = decode_token(auth[7:]) if auth.lower().startswith("bearer ") else {}
    db.add(PlataformaBitacora(
        fecha=datetime.utcnow(),
        actor=str(datos.get("sub") or "?"),
        actor_empresa=str(datos.get("cli") or "?"),
        accion=accion,
        empresa_codigo=empresa,
        detalle=detalle,
    ))


async def _empresa(db: AsyncSession, cliente_id: int) -> PlataformaCliente:
    r = await db.execute(select(PlataformaCliente).where(PlataformaCliente.id == cliente_id))
    cliente = r.scalar_one_or_none()
    if not cliente:
        raise HTTPException(404, "No existe esa empresa")
    return cliente


# ─── Lo que se manda y se devuelve ────────────────────────────────────────────

class UsuarioDeEmpresa(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    apellido: str
    email: str
    username: str
    rol: str
    cargo: Optional[str] = None
    activo: bool
    bloqueado: Optional[bool] = None
    ultimo_login: Optional[datetime] = None


class UsuarioNuevo(BaseModel):
    nombre: str
    apellido: str = ""
    email: EmailStr
    username: str
    rol: str = "ADMINISTRADOR"
    cargo: Optional[str] = None


class UsuarioCambios(BaseModel):
    """Todo opcional: se manda solo lo que cambia."""
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email: Optional[EmailStr] = None
    rol: Optional[str] = None
    cargo: Optional[str] = None
    activo: Optional[bool] = None


class ClaveEntregada(BaseModel):
    """La clave se muestra una sola vez, al crearla o restablecerla.

    No se guarda en claro en ningún lado: si se pierde, se restablece otra.
    """
    username: str
    clave_temporal: str


class EmpresaEnLista(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: str
    nombre: str
    esquema: str
    nit: Optional[str] = None
    logo_url: Optional[str] = None
    color: Optional[str] = None
    activo: bool
    es_operador: bool = False
    suspendido_desde: Optional[datetime] = None
    # Cuántos usuarios tiene. Una empresa en cero no la puede usar nadie: es el
    # estado en el que quedaba toda empresa recién creada antes de esta consola.
    usuarios: int = 0
    usuarios_activos: int = 0


class AsientoBitacora(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha: datetime
    actor: str
    actor_empresa: str
    accion: str
    empresa_codigo: Optional[str] = None
    detalle: Optional[str] = None


# ─── Empresas ─────────────────────────────────────────────────────────────────

@router.get("/empresas", response_model=List[EmpresaEnLista])
async def listar_empresas(
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(require_operador),
):
    """Las empresas, con cuánta gente tiene cada una.

    El conteo se pide esquema por esquema porque cada empresa tiene su propia
    tabla `usuarios`; son pocas empresas y la consola no se abre a cada rato.
    """
    r = await db.execute(select(PlataformaCliente).order_by(PlataformaCliente.nombre))
    empresas = list(r.scalars().all())

    salida: List[EmpresaEnLista] = []
    for e in empresas:
        total = activos = 0
        try:
            async with _sesion_de(e.esquema) as s:
                total = (await s.execute(text("SELECT count(*) FROM usuarios"))).scalar() or 0
                activos = (await s.execute(
                    text("SELECT count(*) FROM usuarios WHERE activo")
                )).scalar() or 0
        except Exception:
            # Un esquema a medio crear no debe tumbar la lista entera: se
            # muestra en cero, que es justo la señal de que algo le falta.
            pass
        ficha = EmpresaEnLista.model_validate(e)
        ficha.usuarios, ficha.usuarios_activos = total, activos
        salida.append(ficha)
    return salida


class EmpresaNueva(BaseModel):
    codigo: str
    nombre: str
    nit: Optional[str] = None
    logo_url: Optional[str] = None
    color: Optional[str] = None
    # El primer administrador va en el mismo paso a propósito: una empresa sin
    # usuarios no la puede usar nadie, y así no queda ninguna a medio dar de alta.
    admin_nombre: str = "Administrador"
    admin_apellido: str = ""
    admin_email: EmailStr
    admin_username: str = "admin"


class EmpresaCreada(BaseModel):
    empresa: EmpresaEnLista
    acceso: ClaveEntregada


@router.post("/empresas", response_model=EmpresaCreada, status_code=201)
async def crear_empresa(
    data: EmpresaNueva,
    request: Request,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(require_operador),
):
    """Da de alta una empresa: su esquema, sus tablas y su administrador.

    Las tres cosas van juntas porque por separado no sirven de nada: hasta
    ahora el alta creaba el esquema y las 416 tablas pero ningún usuario, y la
    empresa quedaba inaccesible — había que sembrarle el administrador con SQL
    directo en el servidor.
    """
    codigo = (data.codigo or "").strip().lower()
    if not codigo_valido(codigo):
        raise HTTPException(
            400,
            "El código debe empezar por letra y llevar solo minúsculas, dígitos o "
            "guion bajo: termina siendo el nombre del esquema donde viven sus datos.",
        )
    ya = await db.execute(select(PlataformaCliente).where(PlataformaCliente.codigo == codigo))
    if ya.scalar_one_or_none():
        raise HTTPException(409, f"Ya existe una empresa con el código «{codigo}»")

    from app.core.tenant import nombre_esquema
    cliente = PlataformaCliente(
        codigo=codigo, nombre=data.nombre.strip(), esquema=nombre_esquema(codigo),
        nit=data.nit, logo_url=data.logo_url, color=data.color, activo=True,
    )
    db.add(cliente)
    await db.flush()

    # Se levantan acá y no en el próximo arranque: la empresa debe poder entrar
    # apenas se le da de alta.
    from app.main import _migrar_esquema
    await _migrar_esquema(cliente.esquema)

    clave = _clave_temporal()
    async with _sesion_de(cliente.esquema) as s:
        s.add(Usuario(
            nombre=data.admin_nombre.strip() or "Administrador",
            apellido=data.admin_apellido.strip(),
            email=str(data.admin_email),
            username=data.admin_username.strip().lower(),
            hashed_password=hash_password(clave),
            rol="ADMINISTRADOR",
            activo=True,
        ))

    await _anotar(db, request, "empresa.alta", codigo,
                  f"con administrador «{data.admin_username}»")
    await db.commit(); await db.refresh(cliente)

    ficha = EmpresaEnLista.model_validate(cliente)
    ficha.usuarios = ficha.usuarios_activos = 1
    return EmpresaCreada(
        empresa=ficha,
        acceso=ClaveEntregada(username=data.admin_username.strip().lower(),
                              clave_temporal=clave),
    )


class EmpresaCambios(BaseModel):
    nombre: Optional[str] = None
    nit: Optional[str] = None
    logo_url: Optional[str] = None
    color: Optional[str] = None


@router.put("/empresas/{cliente_id}", response_model=EmpresaEnLista)
async def editar_empresa(
    cliente_id: int, data: EmpresaCambios, request: Request,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(require_operador),
):
    """El código no se toca: es el nombre del esquema, y cambiarlo dejaría
    todas sus tablas huérfanas."""
    cliente = await _empresa(db, cliente_id)
    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(cliente, campo, valor)
    await _anotar(db, request, "empresa.edicion", cliente.codigo)
    await db.commit(); await db.refresh(cliente)
    return EmpresaEnLista.model_validate(cliente)


@router.put("/empresas/{cliente_id}/estado", response_model=EmpresaEnLista)
async def cambiar_estado(
    cliente_id: int, activo: bool, request: Request,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(require_operador),
):
    """Suspende o reactiva el acceso. No borra nada.

    No hay borrado de empresas a propósito: eliminar una sería eliminar su
    esquema entero con todo lo que tenga dentro.
    """
    cliente = await _empresa(db, cliente_id)
    if cliente.es_operador and not activo:
        raise HTTPException(
            400,
            "No se puede suspender a la empresa que opera la plataforma: nadie "
            "podría volver a entrar a esta consola para reactivarla.",
        )
    cliente.activo = activo
    cliente.suspendido_desde = None if activo else datetime.utcnow()
    await _anotar(db, request, "empresa.reactivacion" if activo else "empresa.suspension",
                  cliente.codigo)
    await db.commit(); await db.refresh(cliente)
    return EmpresaEnLista.model_validate(cliente)


# ─── Usuarios de una empresa ──────────────────────────────────────────────────

@router.get("/empresas/{cliente_id}/usuarios", response_model=List[UsuarioDeEmpresa])
async def listar_usuarios(
    cliente_id: int,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(require_operador),
):
    cliente = await _empresa(db, cliente_id)
    async with _sesion_de(cliente.esquema) as s:
        r = await s.execute(select(Usuario).order_by(Usuario.username))
        return [UsuarioDeEmpresa.model_validate(u) for u in r.scalars().all()]


@router.post("/empresas/{cliente_id}/usuarios", response_model=ClaveEntregada, status_code=201)
async def crear_usuario(
    cliente_id: int, data: UsuarioNuevo, request: Request,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(require_operador),
):
    """Crea un usuario dentro de la empresa y devuelve su clave temporal."""
    cliente = await _empresa(db, cliente_id)
    usuario = data.username.strip().lower()
    clave = _clave_temporal()
    async with _sesion_de(cliente.esquema) as s:
        choque = await s.execute(
            select(func.count()).select_from(Usuario).where(
                (Usuario.username == usuario) | (Usuario.email == str(data.email))
            )
        )
        if choque.scalar():
            raise HTTPException(409, "Ya hay un usuario con ese nombre o ese correo en esta empresa")
        s.add(Usuario(
            nombre=data.nombre.strip(), apellido=data.apellido.strip(),
            email=str(data.email), username=usuario,
            hashed_password=hash_password(clave),
            rol=data.rol, cargo=data.cargo, activo=True,
        ))
    await _anotar(db, request, "usuario.alta", cliente.codigo, f"«{usuario}»")
    await db.commit()
    return ClaveEntregada(username=usuario, clave_temporal=clave)


@router.put("/empresas/{cliente_id}/usuarios/{usuario_id}", response_model=UsuarioDeEmpresa)
async def editar_usuario(
    cliente_id: int, usuario_id: int, data: UsuarioCambios, request: Request,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(require_operador),
):
    cliente = await _empresa(db, cliente_id)
    cambios = data.model_dump(exclude_unset=True)
    async with _sesion_de(cliente.esquema) as s:
        r = await s.execute(select(Usuario).where(Usuario.id == usuario_id))
        u = r.scalar_one_or_none()
        if not u:
            raise HTTPException(404, "Ese usuario no existe en esta empresa")
        if cambios.get("activo") is False:
            # Dejar a una empresa sin ningún administrador activo la vuelve
            # inaccesible para su propia gente.
            quedan = await s.execute(text(
                "SELECT count(*) FROM usuarios "
                "WHERE activo AND rol = 'ADMINISTRADOR' AND id <> :id"), {"id": usuario_id})
            if u.rol == "ADMINISTRADOR" and not (quedan.scalar() or 0):
                raise HTTPException(
                    400,
                    "Es el único administrador activo de la empresa: si se desactiva, "
                    "nadie de esa empresa podría volver a entrar. Cree otro primero.",
                )
        for campo, valor in cambios.items():
            setattr(u, campo, str(valor) if campo == "email" else valor)
        await s.flush()
        ficha = UsuarioDeEmpresa.model_validate(u)
    await _anotar(db, request, "usuario.edicion", cliente.codigo,
                  f"«{ficha.username}»: {', '.join(cambios) or 'sin cambios'}")
    await db.commit()
    return ficha


@router.post("/empresas/{cliente_id}/usuarios/{usuario_id}/clave", response_model=ClaveEntregada)
async def restablecer_clave(
    cliente_id: int, usuario_id: int, request: Request,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(require_operador),
):
    """Devuelve el acceso a un usuario bloqueado, con una clave de un solo uso.

    Es la vía para rescatar a una empresa que perdió a su administrador. Antes
    de existir esto, la única salida era entrar por SSH y escribir el hash a
    mano en la base.
    """
    cliente = await _empresa(db, cliente_id)
    clave = _clave_temporal()
    async with _sesion_de(cliente.esquema) as s:
        r = await s.execute(select(Usuario).where(Usuario.id == usuario_id))
        u = r.scalar_one_or_none()
        if not u:
            raise HTTPException(404, "Ese usuario no existe en esta empresa")
        u.hashed_password = hash_password(clave)
        u.intentos_fallidos = 0
        u.bloqueado = False
        usuario = u.username
    await _anotar(db, request, "usuario.clave", cliente.codigo, f"«{usuario}»")
    await db.commit()
    return ClaveEntregada(username=usuario, clave_temporal=clave)


# ─── Bitácora ─────────────────────────────────────────────────────────────────

@router.get("/bitacora", response_model=List[AsientoBitacora])
async def ver_bitacora(
    empresa: Optional[str] = None, limite: int = 200,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(require_operador),
):
    q = select(PlataformaBitacora).order_by(PlataformaBitacora.fecha.desc())
    if empresa:
        q = q.where(PlataformaBitacora.empresa_codigo == empresa)
    r = await db.execute(q.limit(min(limite, 1000)))
    return [AsientoBitacora.model_validate(a) for a in r.scalars().all()]
