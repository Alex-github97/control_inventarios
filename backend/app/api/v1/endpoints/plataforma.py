"""
Consola del operador: administración de las empresas y de su gente.

Esto NO es la administración que usa cada empresa sobre sí misma —esa vive en
`usuarios.py` y trabaja siempre dentro del esquema de quien está conectado—.
Acá el operador actúa *sobre otros esquemas*, que es un poder distinto y mucho
mayor, y por eso está en un módulo aparte, detrás de un permiso concreto y con
todo lo que hace registrado en la bitácora.

Regla que sostiene el diseño: la consola administra el **acceso**, no los datos.
Deja crear usuarios y devolver claves, que es lo que hace falta para dar de alta
y para rescatar a un cliente bloqueado; no deja leer sus estibas, sus activos ni
sus llantas.
"""
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional
import json
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
from app.core.permisos_consola import exigir
from app.core.permisos_perfil import PERMISOS_PERFIL, normalizar as normalizar_permisos

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
        actor=str(datos.get("usr") or datos.get("sub") or "?"),
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
    _=Depends(exigir("empresas.ver")),
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
    _=Depends(exigir("empresas.crear")),
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
    _=Depends(exigir("empresas.editar")),
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
    _=Depends(exigir("empresas.editar")),
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

async def _rol_id_de(s: AsyncSession, nombre: str) -> int:
    """El id del perfil que se llama así, dentro del esquema ya seleccionado.

    Se exige que exista: dejar el vínculo vacío no falla en ninguna parte, pero
    deja a la persona sin un solo permiso y sin nada que lo explique.
    """
    fila = (await s.execute(text("SELECT id FROM roles WHERE upper(nombre) = :n"),
                            {"n": (nombre or "").strip().upper()})).first()
    if not fila:
        raise HTTPException(
            400,
            f"Esa empresa no tiene un perfil «{nombre}». Créelo primero en la "
            f"pestaña Perfiles, o escoja uno de los que ya tiene.")
    return fila[0]


@router.get("/empresas/{cliente_id}/usuarios", response_model=List[UsuarioDeEmpresa])
async def listar_usuarios(
    cliente_id: int,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(exigir("empresas.ver")),
):
    cliente = await _empresa(db, cliente_id)
    async with _sesion_de(cliente.esquema) as s:
        r = await s.execute(select(Usuario).order_by(Usuario.username))
        return [UsuarioDeEmpresa.model_validate(u) for u in r.scalars().all()]


@router.post("/empresas/{cliente_id}/usuarios", response_model=ClaveEntregada, status_code=201)
async def crear_usuario(
    cliente_id: int, data: UsuarioNuevo, request: Request,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(exigir("usuarios.crear")),
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
        # El nombre y el id del perfil van juntos: el nombre es lo que se
        # muestra y el id es de donde salen los permisos.
        rol = (data.rol or "").strip().upper()
        s.add(Usuario(
            nombre=data.nombre.strip(), apellido=data.apellido.strip(),
            email=str(data.email), username=usuario,
            hashed_password=hash_password(clave),
            rol=rol, rol_id=await _rol_id_de(s, rol),
            cargo=data.cargo, activo=True,
        ))
    await _anotar(db, request, "usuario.alta", cliente.codigo, f"«{usuario}»")
    await db.commit()
    return ClaveEntregada(username=usuario, clave_temporal=clave)


@router.put("/empresas/{cliente_id}/usuarios/{usuario_id}", response_model=UsuarioDeEmpresa)
async def editar_usuario(
    cliente_id: int, usuario_id: int, data: UsuarioCambios, request: Request,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(exigir("usuarios.editar")),
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
        if "rol" in cambios:
            cambios["rol"] = (cambios["rol"] or "").strip().upper()
            u.rol_id = await _rol_id_de(s, cambios["rol"])
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
    _=Depends(exigir("usuarios.clave")),
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
    _=Depends(exigir("bitacora.ver")),
):
    q = select(PlataformaBitacora).order_by(PlataformaBitacora.fecha.desc())
    if empresa:
        q = q.where(PlataformaBitacora.empresa_codigo == empresa)
    r = await db.execute(q.limit(min(limite, 1000)))
    return [AsientoBitacora.model_validate(a) for a in r.scalars().all()]


# ══════════════════════════════════════════════════════════════════════════════
# LOS PERFILES DE UNA EMPRESA
# ══════════════════════════════════════════════════════════════════════════════
#
# Un perfil es el conjunto de pantallas que puede ver una persona dentro de su
# empresa. Existían desde el principio en `/roles`, pero ese camino solo sirve
# desde dentro de la propia empresa: la consola administra a todas, y no tiene
# —ni debe tener— una sesión abierta en cada una.
#
# Por eso estos endpoints entran por el esquema del cliente, igual que ya lo
# hacía la edición de usuarios. El operador administra desde afuera, y cada
# empresa sigue pudiendo administrarse a sí misma por su propio camino.

class PermisoDisponible(BaseModel):
    clave: str
    nombre: str
    grupo: str


@router.get("/permisos-perfil", response_model=List[PermisoDisponible])
async def permisos_de_perfil(_=Depends(exigir("empresas.ver"))):
    """Qué se puede marcar en un perfil.

    Lo sirve el servidor en vez de que la pantalla lo tenga escrito: era
    justamente lo que estaba desincronizado, y así agregar un módulo nuevo lo
    hace aparecer solo en la consola.
    """
    return [PermisoDisponible(clave=p.clave, nombre=p.nombre, grupo=p.grupo)
            for p in PERMISOS_PERFIL]


class PerfilDeEmpresa(BaseModel):
    id: int
    nombre: str
    label: Optional[str] = None
    descripcion: Optional[str] = None
    color: Optional[str] = None
    permisos: dict
    es_sistema: bool = False
    total_usuarios: int = 0


class PerfilNuevo(BaseModel):
    nombre: str
    label: Optional[str] = None
    descripcion: Optional[str] = None
    color: Optional[str] = "#6366f1"
    permisos: dict = {}


class PerfilCambios(BaseModel):
    """Todo opcional: se manda solo lo que cambia."""
    nombre: Optional[str] = None
    label: Optional[str] = None
    descripcion: Optional[str] = None
    color: Optional[str] = None
    permisos: Optional[dict] = None


async def _perfiles_de(esquema: str) -> List[PerfilDeEmpresa]:
    async with _sesion_de(esquema) as s:
        filas = (await s.execute(text(
            "SELECT id, nombre, label, descripcion, color, permisos, es_sistema "
            "FROM roles ORDER BY es_sistema DESC, nombre"))).all()
        # Cuántos los usan: un perfil con gente adentro no se puede borrar sin
        # dejar a esa gente sin permisos.
        conteo = {n: c for n, c in (await s.execute(text(
            "SELECT rol, count(*) FROM usuarios WHERE activo GROUP BY rol"))).all()}
    return [
        PerfilDeEmpresa(
            id=f[0], nombre=f[1], label=f[2], descripcion=f[3], color=f[4],
            permisos=normalizar_permisos(f[5]), es_sistema=bool(f[6]),
            total_usuarios=conteo.get(f[1], 0),
        )
        for f in filas
    ]


@router.get("/empresas/{cliente_id}/perfiles", response_model=List[PerfilDeEmpresa])
async def listar_perfiles(
    cliente_id: int,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(exigir("empresas.ver")),
):
    cliente = await _empresa(db, cliente_id)
    return await _perfiles_de(cliente.esquema)


@router.post("/empresas/{cliente_id}/perfiles", response_model=PerfilDeEmpresa,
             status_code=201)
async def crear_perfil(
    cliente_id: int, data: PerfilNuevo, request: Request,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(exigir("usuarios.editar")),
):
    cliente = await _empresa(db, cliente_id)
    nombre = (data.nombre or "").strip().upper()
    if not nombre:
        raise HTTPException(400, "El perfil necesita un nombre")

    async with _sesion_de(cliente.esquema) as s:
        ya = await s.execute(text("SELECT 1 FROM roles WHERE upper(nombre) = :n"),
                             {"n": nombre})
        if ya.scalar():
            raise HTTPException(409, f"Esa empresa ya tiene un perfil «{nombre}»")
        r = await s.execute(text(
            "INSERT INTO roles (nombre, label, descripcion, color, permisos, "
            "es_sistema, created_at, updated_at) "
            "VALUES (:n, :l, :d, :c, CAST(:p AS jsonb), false, now(), now()) "
            "RETURNING id"), {
                "n": nombre, "l": data.label or data.nombre,
                "d": data.descripcion, "c": data.color or "#6366f1",
                "p": json.dumps(normalizar_permisos(data.permisos))})
        nuevo = r.scalar()

    await _anotar(db, request, "perfil.creacion", cliente.codigo, f"«{nombre}»")
    await db.commit()
    perfiles = await _perfiles_de(cliente.esquema)
    return next(p for p in perfiles if p.id == nuevo)


@router.put("/empresas/{cliente_id}/perfiles/{perfil_id}", response_model=PerfilDeEmpresa)
async def editar_perfil(
    cliente_id: int, perfil_id: int, data: PerfilCambios, request: Request,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(exigir("usuarios.editar")),
):
    cliente = await _empresa(db, cliente_id)
    cambios = data.model_dump(exclude_unset=True)

    async with _sesion_de(cliente.esquema) as s:
        actual = (await s.execute(text(
            "SELECT nombre, es_sistema FROM roles WHERE id = :i"),
            {"i": perfil_id})).first()
        if not actual:
            raise HTTPException(404, "Ese perfil no existe en esta empresa")

        # El perfil de administrador se puede renombrar y describir, pero no
        # recortar: quitarle permisos deja a la empresa sin quien administre
        # su propia gente, y solo la consola podría devolvérselos.
        if actual[0] == "ADMINISTRADOR" and "permisos" in cambios:
            raise HTTPException(
                409,
                "El perfil ADMINISTRADOR no puede quedarse sin permisos: es el "
                "único que puede volver a repartirlos dentro de la empresa.")

        sets, valores = [], {"i": perfil_id}
        for campo in ("nombre", "label", "descripcion", "color"):
            if campo in cambios:
                sets.append(f"{campo} = :{campo}")
                valores[campo] = (cambios[campo] or "").strip().upper() \
                    if campo == "nombre" else cambios[campo]
        if "permisos" in cambios:
            sets.append("permisos = CAST(:permisos AS jsonb)")
            valores["permisos"] = json.dumps(normalizar_permisos(cambios["permisos"]))
        if not sets:
            raise HTTPException(400, "No hay nada que cambiar")
        sets.append("updated_at = now()")

        # Renombrar el perfil tiene que arrastrar a quienes lo tienen: el
        # usuario guarda el nombre del rol, no solo su id, y si se cambia uno
        # sin el otro esa gente se queda con un perfil que ya no existe.
        if "nombre" in cambios:
            await s.execute(text("UPDATE usuarios SET rol = :nuevo WHERE rol = :viejo"),
                            {"nuevo": valores["nombre"], "viejo": actual[0]})
        await s.execute(text(f"UPDATE roles SET {', '.join(sets)} WHERE id = :i"),
                        valores)

    await _anotar(db, request, "perfil.edicion", cliente.codigo,
                  f"«{actual[0]}»: {', '.join(cambios)}")
    await db.commit()
    perfiles = await _perfiles_de(cliente.esquema)
    return next(p for p in perfiles if p.id == perfil_id)


@router.delete("/empresas/{cliente_id}/perfiles/{perfil_id}", status_code=204)
async def borrar_perfil(
    cliente_id: int, perfil_id: int, request: Request,
    db: AsyncSession = Depends(get_db_plataforma),
    _=Depends(exigir("usuarios.editar")),
):
    cliente = await _empresa(db, cliente_id)
    async with _sesion_de(cliente.esquema) as s:
        fila = (await s.execute(text(
            "SELECT nombre, es_sistema FROM roles WHERE id = :i"),
            {"i": perfil_id})).first()
        if not fila:
            raise HTTPException(404, "Ese perfil no existe en esta empresa")
        if fila[1]:
            raise HTTPException(
                409, "Ese perfil es del sistema y no se puede eliminar.")
        usando = (await s.execute(text(
            "SELECT count(*) FROM usuarios WHERE rol = :n AND activo"),
            {"n": fila[0]})).scalar() or 0
        if usando:
            raise HTTPException(
                409,
                f"Hay {usando} usuario(s) con ese perfil. Cámbieles el perfil "
                f"antes de eliminarlo, o se quedarían sin permisos.")
        await s.execute(text("DELETE FROM roles WHERE id = :i"), {"i": perfil_id})

    await _anotar(db, request, "perfil.borrado", cliente.codigo, f"«{fila[0]}»")
    await db.commit()
