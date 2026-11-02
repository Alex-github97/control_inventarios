"""
Planta de reencauche · configuración y catálogos.

Planta (almacén del WMS y sus zonas), equipos, rutas y etapas, especificaciones,
límites de reparación, defectos, motivos de rechazo, insumos, recetas, tarifas
y los roles de la planta (técnico, calidad, supervisor).
"""
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import reencauche_flujo as flujo, reencauche_wms as rwms
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.reencauche_semilla import config as obtener_config
from app.infrastructure.models.reencauche import (
    RTMDefecto, RTMEquipo, RTMEspecificacion, RTMEtapa, RTMInsumo, RTMLimiteReparacion, RTMMotivoRechazo, RTMOrden,
    RTMReceta, RTMRolUsuario, RTMRuta, RTMRutaEtapa, RTMTarifa,
)
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.wms import WMSAlmacen, WMSDepositante, WMSLote, WMSProducto, WMSUbicacion

router = APIRouter(prefix="/reencauche", tags=["Planta de reencauche"])

TIPOS_EQUIPO = ["RASPADORA", "DESTALONADORA", "ESCARIADORA", "CEMENTADORA", "EXTRUSORA", "CORTADORA", "EMBANDADORA",
                "ENVELOPADORA", "AUTOCLAVE", "INSPECCION", "SHEAROGRAFO", "ACABADO", "OTRO"]
CLASES_INSUMO = ["BANDA", "COJIN", "CEMENTO", "PARCHE", "RELLENO", "COMPUESTO"]


def _f(v):
    return float(v) if v is not None else None


# ── Planta ────────────────────────────────────────────────────────────────────

class PlantaIn(BaseModel):
    almacen_id: Optional[int] = None
    prefijo_codigo: Optional[str] = Field(default=None, max_length=10)
    cargo_inspeccion: Optional[float] = Field(default=None, ge=0)
    permite_venta_rechazo: Optional[bool] = None
    costo_hora_mano_obra: Optional[float] = Field(default=None, ge=0)


async def _planta_dict(db: AsyncSession) -> Dict:
    cfg = await obtener_config(db)
    ubic = {}
    for attr, _, nombre, _ in rwms.ZONAS:
        uid = getattr(cfg, attr)
        u = await db.get(WMSUbicacion, uid) if uid else None
        ubic[attr.replace("ubic_", "").replace("_id", "")] = {"id": uid, "codigo": u.codigo if u else None,
                                                             "nombre": nombre}
    alm = await db.get(WMSAlmacen, cfg.almacen_id) if cfg.almacen_id else None
    return {"almacen_id": cfg.almacen_id, "almacen": alm.nombre if alm else None, "ubicaciones": ubic,
            "prefijo_codigo": cfg.prefijo_codigo, "consecutivo": cfg.consecutivo,
            "cargo_inspeccion": _f(cfg.cargo_inspeccion), "permite_venta_rechazo": cfg.permite_venta_rechazo,
            "costo_hora_mano_obra": _f(cfg.costo_hora_mano_obra),
            "lista": bool(cfg.almacen_id and cfg.ubic_recepcion_id and cfg.ubic_produccion_id)}


@router.get("/planta")
async def ver_planta(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return await _planta_dict(db)


@router.put("/planta")
async def guardar_planta(data: PlantaIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    cfg = await obtener_config(db)
    if data.almacen_id:
        await rwms.configurar_planta(db, cfg, data.almacen_id)
    if data.prefijo_codigo is not None:
        cfg.prefijo_codigo = data.prefijo_codigo.strip().upper() or "RT-"
    if data.cargo_inspeccion is not None:
        cfg.cargo_inspeccion = data.cargo_inspeccion
    if data.permite_venta_rechazo is not None:
        cfg.permite_venta_rechazo = data.permite_venta_rechazo
    if data.costo_hora_mano_obra is not None:
        cfg.costo_hora_mano_obra = data.costo_hora_mano_obra
    await db.commit()
    return await _planta_dict(db)


@router.get("/almacenes")
async def almacenes(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return [{"id": a.id, "codigo": a.codigo, "nombre": a.nombre, "ciudad": a.ciudad}
            for a in (await db.execute(select(WMSAlmacen).where(WMSAlmacen.activo.isnot(False))
                                       .order_by(WMSAlmacen.nombre))).scalars()]


@router.get("/propietarios")
async def propietarios(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Los dueños posibles de una carcasa: los depositantes del WMS. El propio es la planta."""
    from app.core.wms_operacion import depositante_propio
    propio = await depositante_propio(db)
    await db.commit()
    return [{"id": d.id, "codigo": d.codigo, "nombre": d.nombre, "nit": d.nit, "propio": d.id == propio}
            for d in (await db.execute(select(WMSDepositante).where(WMSDepositante.activo.isnot(False))
                                       .order_by(WMSDepositante.propio.desc(), WMSDepositante.nombre))).scalars()]


class PropietarioIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    nit: Optional[str] = Field(default=None, max_length=30)
    email: Optional[str] = Field(default=None, max_length=120)
    telefono: Optional[str] = Field(default=None, max_length=30)
    contacto: Optional[str] = Field(default=None, max_length=100)


@router.post("/propietarios", status_code=201)
async def crear_propietario(data: PropietarioIn, db: AsyncSession = Depends(get_db),
                            _: Usuario = Depends(get_current_user)):
    """Un cliente nuevo de la planta queda como depositante del WMS."""
    import re
    base = re.sub(r"[^A-Z0-9]", "", data.nombre.upper())[:20] or "CLIENTE"
    codigo, n = base, 1
    while (await db.execute(select(WMSDepositante.id).where(WMSDepositante.codigo == codigo))).first():
        n += 1
        codigo = f"{base}{n}"
    d = WMSDepositante(codigo=codigo, nombre=data.nombre.strip(), nit=data.nit, email=data.email,
                       telefono=data.telefono, contacto=data.contacto, propio=False, activo=True)
    db.add(d)
    await db.commit()
    return {"id": d.id, "codigo": d.codigo, "nombre": d.nombre, "nit": d.nit, "propio": False}


# ── Roles de la planta ────────────────────────────────────────────────────────

class RolesIn(BaseModel):
    usuario_id: int
    roles: List[str]


@router.get("/roles")
async def roles(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    filas = (await db.execute(select(RTMRolUsuario, Usuario).join(Usuario, Usuario.id == RTMRolUsuario.usuario_id))).all()
    salida: Dict[int, Dict] = {}
    for r, u in filas:
        salida.setdefault(u.id, {"usuario_id": u.id, "usuario": u.username, "nombre": u.nombre, "roles": []})["roles"].append(r.rol)
    return list(salida.values())


@router.get("/roles/yo")
async def mis_roles(db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    return {r: await flujo.tiene_rol(db, yo, r) for r in flujo.ROLES}


@router.put("/roles")
async def guardar_roles(data: RolesIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    malos = [r for r in data.roles if r not in flujo.ROLES]
    if malos:
        raise HTTPException(422, f"Roles desconocidos: {', '.join(malos)}.")
    if not await db.get(Usuario, data.usuario_id):
        raise HTTPException(404, "El usuario no existe.")
    await db.execute(delete(RTMRolUsuario).where(RTMRolUsuario.usuario_id == data.usuario_id))
    for r in dict.fromkeys(data.roles):
        db.add(RTMRolUsuario(usuario_id=data.usuario_id, rol=r))
    await db.commit()
    return {"usuario_id": data.usuario_id, "roles": list(dict.fromkeys(data.roles))}


@router.get("/usuarios")
async def usuarios(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return [{"id": u.id, "usuario": u.username, "nombre": u.nombre}
            for u in (await db.execute(select(Usuario).where(Usuario.activo.is_(True)).order_by(Usuario.nombre))).scalars()]


# ── Equipos ───────────────────────────────────────────────────────────────────

class EquipoIn(BaseModel):
    codigo: str = Field(min_length=1, max_length=30)
    nombre: str = Field(min_length=2, max_length=120)
    tipo: str
    capacidad: int = Field(default=1, ge=1, le=200)
    ubicacion_id: Optional[int] = None
    crear_ubicacion: bool = True
    eam_activo_id: Optional[int] = None
    estado: str = "ACTIVO"


async def _equipo_dict(db: AsyncSession, e: RTMEquipo) -> Dict:
    u = await db.get(WMSUbicacion, e.ubicacion_id) if e.ubicacion_id else None
    return {"id": e.id, "codigo": e.codigo, "nombre": e.nombre, "tipo": e.tipo, "capacidad": e.capacidad,
            "ubicacion_id": e.ubicacion_id, "ubicacion": u.codigo if u else None, "eam_activo_id": e.eam_activo_id,
            "estado": e.estado}


@router.get("/equipos")
async def equipos(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return [await _equipo_dict(db, e) for e in (await db.execute(select(RTMEquipo).order_by(RTMEquipo.codigo))).scalars()]


@router.get("/equipos/tipos")
async def tipos_equipo(_: Usuario = Depends(get_current_user)):
    return TIPOS_EQUIPO


async def _guardar_equipo(db: AsyncSession, e: RTMEquipo, data: EquipoIn) -> None:
    if data.tipo not in TIPOS_EQUIPO:
        raise HTTPException(422, "Tipo de equipo desconocido.")
    if data.estado not in ("ACTIVO", "MANTENIMIENTO", "INACTIVO"):
        raise HTTPException(422, "Estado desconocido.")
    otro = (await db.execute(select(RTMEquipo.id).where(RTMEquipo.codigo == data.codigo.strip().upper(),
                                                        RTMEquipo.id != (e.id or 0)))).first()
    if otro:
        raise HTTPException(409, f"Ya existe un equipo con el código {data.codigo}.")
    e.codigo, e.nombre, e.tipo = data.codigo.strip().upper(), data.nombre.strip(), data.tipo
    e.capacidad, e.eam_activo_id, e.estado = data.capacidad, data.eam_activo_id, data.estado
    if data.ubicacion_id:
        if not await db.get(WMSUbicacion, data.ubicacion_id):
            raise HTTPException(404, "La ubicación no existe.")
        e.ubicacion_id = data.ubicacion_id
    elif not e.ubicacion_id and data.crear_ubicacion:
        cfg = await obtener_config(db)
        if cfg.ubic_produccion_id:
            e.ubicacion_id = await rwms.ubicacion_estacion(db, cfg, e)


@router.post("/equipos", status_code=201)
async def crear_equipo(data: EquipoIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    e = RTMEquipo()
    await _guardar_equipo(db, e, data)
    db.add(e)
    await db.commit()
    return await _equipo_dict(db, e)


@router.put("/equipos/{eid}")
async def editar_equipo(eid: int, data: EquipoIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    e = await db.get(RTMEquipo, eid)
    if e is None:
        raise HTTPException(404, "Equipo no encontrado.")
    await _guardar_equipo(db, e, data)
    await db.commit()
    return await _equipo_dict(db, e)


# ── Etapas y rutas ────────────────────────────────────────────────────────────

class EtapaIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    mediciones: List[Dict] = []
    tipos_equipo: List[str] = []
    insumos: List[str] = []
    descripcion: Optional[str] = None
    activo: bool = True


def _etapa_dict(e: RTMEtapa) -> Dict:
    return {"id": e.id, "codigo": e.codigo, "nombre": e.nombre, "tipo": e.tipo, "decision": e.decision,
            "decision_final": e.decision_final, "mediciones": e.mediciones or [], "reparaciones": e.reparaciones,
            "insumos": e.insumos or [], "tipos_equipo": e.tipos_equipo or [], "descripcion": e.descripcion,
            "activo": e.activo}


@router.get("/etapas")
async def etapas(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return [_etapa_dict(e) for e in (await db.execute(select(RTMEtapa).order_by(RTMEtapa.id))).scalars()]


@router.put("/etapas/{eid}")
async def editar_etapa(eid: int, data: EtapaIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    e = await db.get(RTMEtapa, eid)
    if e is None:
        raise HTTPException(404, "Etapa no encontrada.")
    for m in data.mediciones:
        if not m.get("clave") or not m.get("nombre") or m.get("tipo", "NUMERO") not in ("NUMERO", "SI_NO"):
            raise HTTPException(422, "Cada medición necesita clave, nombre y tipo (NUMERO o SI_NO).")
    if any(t not in TIPOS_EQUIPO for t in data.tipos_equipo) or any(c not in CLASES_INSUMO for c in data.insumos):
        raise HTTPException(422, "Tipo de equipo o clase de insumo desconocido.")
    e.nombre, e.mediciones, e.tipos_equipo, e.insumos = data.nombre, data.mediciones, data.tipos_equipo, data.insumos
    e.descripcion, e.activo = data.descripcion, data.activo
    await db.commit()
    return _etapa_dict(e)


async def _ruta_dict(db: AsyncSession, r: RTMRuta) -> Dict:
    pasos = await flujo.etapas_de_ruta(db, r.id)
    abiertas = (await db.execute(select(func.count()).select_from(RTMOrden).where(
        RTMOrden.ruta_id == r.id, RTMOrden.estado == "ABIERTA"))).scalar()
    return {"id": r.id, "codigo": r.codigo, "nombre": r.nombre, "descripcion": r.descripcion,
            "por_defecto": r.por_defecto, "activo": r.activo, "ordenes_abiertas": abiertas,
            "etapas": [{"etapa_id": e.id, "codigo": e.codigo, "nombre": e.nombre, "secuencia": re_.secuencia,
                        "obligatoria": re_.obligatoria, "decision": e.decision} for re_, e in pasos]}


@router.get("/rutas")
async def rutas(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return [await _ruta_dict(db, r) for r in (await db.execute(select(RTMRuta).order_by(RTMRuta.id))).scalars()]


class RutaIn(BaseModel):
    codigo: str = Field(min_length=2, max_length=30)
    nombre: str = Field(min_length=2, max_length=120)
    descripcion: Optional[str] = None
    por_defecto: bool = False
    activo: bool = True
    # [{etapa_id, obligatoria}] en orden
    etapas: List[Dict]


async def _guardar_ruta(db: AsyncSession, r: RTMRuta, data: RutaIn) -> None:
    if not data.etapas:
        raise HTTPException(422, "La ruta necesita etapas.")
    ids = [int(x["etapa_id"]) for x in data.etapas]
    if len(set(ids)) != len(ids):
        raise HTTPException(422, "Una etapa no puede repetirse en la ruta.")
    existentes = {e.id: e for e in (await db.execute(select(RTMEtapa).where(RTMEtapa.id.in_(ids)))).scalars()}
    if len(existentes) != len(ids):
        raise HTTPException(422, "Alguna etapa no existe.")
    if r.id and (await db.execute(select(func.count()).select_from(RTMOrden).where(
            RTMOrden.ruta_id == r.id, RTMOrden.estado == "ABIERTA"))).scalar():
        actuales = [(re_.etapa_id, re_.obligatoria) for re_, _ in await flujo.etapas_de_ruta(db, r.id)]
        if actuales != [(int(x["etapa_id"]), bool(x.get("obligatoria", True))) for x in data.etapas]:
            raise HTTPException(409, "La ruta tiene órdenes abiertas: cree una variante en vez de cambiar sus etapas.")
    r.codigo, r.nombre, r.descripcion, r.activo = data.codigo.strip().upper(), data.nombre, data.descripcion, data.activo
    if data.por_defecto:
        for otra in (await db.execute(select(RTMRuta).where(RTMRuta.por_defecto.is_(True)))).scalars():
            otra.por_defecto = False
    r.por_defecto = data.por_defecto
    if not r.id:
        db.add(r)
        await db.flush()
    await db.execute(delete(RTMRutaEtapa).where(RTMRutaEtapa.ruta_id == r.id))
    for i, x in enumerate(data.etapas, start=1):
        db.add(RTMRutaEtapa(ruta_id=r.id, etapa_id=int(x["etapa_id"]), secuencia=i,
                            obligatoria=bool(x.get("obligatoria", True))))


@router.post("/rutas", status_code=201)
async def crear_ruta(data: RutaIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    if (await db.execute(select(RTMRuta.id).where(RTMRuta.codigo == data.codigo.strip().upper()))).first():
        raise HTTPException(409, "Ya existe una ruta con ese código.")
    r = RTMRuta()
    await _guardar_ruta(db, r, data)
    await db.commit()
    return await _ruta_dict(db, r)


@router.put("/rutas/{rid}")
async def editar_ruta(rid: int, data: RutaIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    r = await db.get(RTMRuta, rid)
    if r is None:
        raise HTTPException(404, "Ruta no encontrada.")
    await _guardar_ruta(db, r, data)
    await db.commit()
    return await _ruta_dict(db, r)


# ── Catálogos simples ─────────────────────────────────────────────────────────

class CatalogoIn(BaseModel):
    codigo: Optional[str] = Field(default=None, max_length=30)
    nombre: str = Field(min_length=2, max_length=200)
    zona: Optional[str] = None
    activo: bool = True


ZONAS_DEFECTO = ["BANDA", "HOMBROS", "COSTADOS", "TALONES", "INTERIOR", "CARCASA_RASPADA"]


@router.get("/defectos")
async def defectos(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return [{"id": d.id, "codigo": d.codigo, "nombre": d.nombre, "zona": d.zona, "activo": d.activo}
            for d in (await db.execute(select(RTMDefecto).order_by(RTMDefecto.zona, RTMDefecto.nombre))).scalars()]


@router.post("/defectos", status_code=201)
async def crear_defecto(data: CatalogoIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    from app.core.reencauche_semilla import codigo_de
    if data.zona not in ZONAS_DEFECTO:
        raise HTTPException(422, "Zona desconocida.")
    codigo = (data.codigo or codigo_de(data.nombre, data.zona[:3])).upper()
    if (await db.execute(select(RTMDefecto.id).where(RTMDefecto.codigo == codigo))).first():
        raise HTTPException(409, "Ya existe un defecto con ese código.")
    d = RTMDefecto(codigo=codigo, nombre=data.nombre.strip(), zona=data.zona, activo=True)
    db.add(d)
    await db.commit()
    return {"id": d.id, "codigo": d.codigo, "nombre": d.nombre, "zona": d.zona, "activo": True}


@router.put("/defectos/{did}")
async def editar_defecto(did: int, data: CatalogoIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    d = await db.get(RTMDefecto, did)
    if d is None:
        raise HTTPException(404, "Defecto no encontrado.")
    d.nombre, d.activo = data.nombre.strip(), data.activo
    if data.zona in ZONAS_DEFECTO:
        d.zona = data.zona
    await db.commit()
    return {"id": d.id, "codigo": d.codigo, "nombre": d.nombre, "zona": d.zona, "activo": d.activo}


@router.get("/motivos")
async def motivos(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return [{"id": m.id, "codigo": m.codigo, "nombre": m.nombre, "activo": m.activo}
            for m in (await db.execute(select(RTMMotivoRechazo).order_by(RTMMotivoRechazo.nombre))).scalars()]


@router.post("/motivos", status_code=201)
async def crear_motivo(data: CatalogoIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    from app.core.reencauche_semilla import codigo_de
    codigo = (data.codigo or codigo_de(data.nombre, "MR")).upper()
    if (await db.execute(select(RTMMotivoRechazo.id).where(RTMMotivoRechazo.codigo == codigo))).first():
        raise HTTPException(409, "Ya existe un motivo con ese código.")
    m = RTMMotivoRechazo(codigo=codigo, nombre=data.nombre.strip(), activo=True)
    db.add(m)
    await db.commit()
    return {"id": m.id, "codigo": m.codigo, "nombre": m.nombre, "activo": True}


@router.put("/motivos/{mid}")
async def editar_motivo(mid: int, data: CatalogoIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    m = await db.get(RTMMotivoRechazo, mid)
    if m is None:
        raise HTTPException(404, "Motivo no encontrado.")
    m.nombre, m.activo = data.nombre.strip(), data.activo
    await db.commit()
    return {"id": m.id, "codigo": m.codigo, "nombre": m.nombre, "activo": m.activo}


class LimiteIn(BaseModel):
    ubicacion: str
    tipo_dano: str = Field(min_length=2, max_length=30)
    tamano_max_mm: float = Field(ge=0)


@router.get("/limites")
async def limites(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return [{"id": l.id, "ubicacion": l.ubicacion, "tipo_dano": l.tipo_dano, "tamano_max_mm": l.tamano_max_mm,
             "plantilla": l.plantilla}
            for l in (await db.execute(select(RTMLimiteReparacion).order_by(RTMLimiteReparacion.ubicacion,
                                                                            RTMLimiteReparacion.tipo_dano))).scalars()]


@router.put("/limites")
async def guardar_limite(data: LimiteIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    ubic, tipo = data.ubicacion.upper(), data.tipo_dano.strip().upper()
    if ubic not in ("CORONA", "HOMBRO", "COSTADO", "TALON", "INTERIOR"):
        raise HTTPException(422, "Ubicación desconocida.")
    l = (await db.execute(select(RTMLimiteReparacion).where(RTMLimiteReparacion.ubicacion == ubic,
                                                            RTMLimiteReparacion.tipo_dano == tipo))).scalar()
    if l is None:
        l = RTMLimiteReparacion(ubicacion=ubic, tipo_dano=tipo)
        db.add(l)
    l.tamano_max_mm, l.plantilla = data.tamano_max_mm, False
    await db.commit()
    return {"id": l.id, "ubicacion": l.ubicacion, "tipo_dano": l.tipo_dano, "tamano_max_mm": l.tamano_max_mm,
            "plantilla": False}


# ── Especificaciones ──────────────────────────────────────────────────────────

class EspecificacionIn(BaseModel):
    medida: str = Field(min_length=3, max_length=40)
    banda_producto_id: Optional[int] = None
    limites: Dict[str, Dict[str, Optional[float]]] = {}
    longitud_banda_m: Optional[float] = Field(default=None, gt=0)
    longitud_cojin_m: Optional[float] = Field(default=None, gt=0)
    cemento_estandar: Optional[float] = Field(default=None, gt=0)
    activo: bool = True


async def _espec_dict(db: AsyncSession, e: RTMEspecificacion) -> Dict:
    b = await db.get(WMSProducto, e.banda_producto_id) if e.banda_producto_id else None
    return {"id": e.id, "medida": e.medida, "banda_producto_id": e.banda_producto_id, "banda": b.nombre if b else None,
            "limites": e.limites or {}, "longitud_banda_m": e.longitud_banda_m, "longitud_cojin_m": e.longitud_cojin_m,
            "cemento_estandar": e.cemento_estandar, "activo": e.activo}


@router.get("/especificaciones")
async def especificaciones(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return [await _espec_dict(db, e) for e in (await db.execute(
        select(RTMEspecificacion).order_by(RTMEspecificacion.medida, RTMEspecificacion.id))).scalars()]


@router.get("/especificaciones/vigente")
async def especificacion_vigente(medida: str, banda_producto_id: Optional[int] = None,
                                 db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    e = await flujo.especificacion(db, medida, banda_producto_id)
    return await _espec_dict(db, e) if e else None


async def _guardar_espec(db: AsyncSession, e: RTMEspecificacion, data: EspecificacionIn) -> None:
    for clave, lim in data.limites.items():
        mn, mx = lim.get("min"), lim.get("max")
        if mn is not None and mx is not None and mn > mx:
            raise HTTPException(422, f"En «{clave}» el mínimo es mayor que el máximo.")
    if data.banda_producto_id:
        await flujo._validar_insumo(db, data.banda_producto_id, "BANDA")
    e.medida, e.banda_producto_id, e.limites = data.medida.strip(), data.banda_producto_id, data.limites
    e.longitud_banda_m, e.longitud_cojin_m, e.cemento_estandar = data.longitud_banda_m, data.longitud_cojin_m, data.cemento_estandar
    e.activo = data.activo


@router.post("/especificaciones", status_code=201)
async def crear_especificacion(data: EspecificacionIn, db: AsyncSession = Depends(get_db),
                               _: Usuario = Depends(require_admin)):
    if (await db.execute(select(RTMEspecificacion.id).where(
            RTMEspecificacion.medida == data.medida.strip(),
            RTMEspecificacion.banda_producto_id.is_(None) if data.banda_producto_id is None
            else RTMEspecificacion.banda_producto_id == data.banda_producto_id))).first():
        raise HTTPException(409, "Ya existe una especificación para esa medida y banda.")
    e = RTMEspecificacion()
    await _guardar_espec(db, e, data)
    db.add(e)
    await db.commit()
    return await _espec_dict(db, e)


@router.put("/especificaciones/{eid}")
async def editar_especificacion(eid: int, data: EspecificacionIn, db: AsyncSession = Depends(get_db),
                                _: Usuario = Depends(require_admin)):
    e = await db.get(RTMEspecificacion, eid)
    if e is None:
        raise HTTPException(404, "Especificación no encontrada.")
    await _guardar_espec(db, e, data)
    await db.commit()
    return await _espec_dict(db, e)


# ── Insumos ───────────────────────────────────────────────────────────────────

class InsumoIn(BaseModel):
    producto_id: int
    clase: str
    ancho_mm: Optional[float] = None
    activo: bool = True


async def _insumo_dict(db: AsyncSession, i: RTMInsumo, cfg=None) -> Dict:
    p = await db.get(WMSProducto, i.producto_id)
    cfg = cfg or await obtener_config(db)
    existencia = await rwms.disponible(db, i.producto_id, almacen_id=cfg.almacen_id) if cfg.almacen_id else None
    return {"id": i.id, "producto_id": i.producto_id, "sku": p.sku if p else None, "nombre": p.nombre if p else None,
            "referencia": p.referencia if p else None, "unidad": p.unidad_medida if p else None, "clase": i.clase,
            "ancho_mm": i.ancho_mm, "activo": i.activo, "costo_promedio": _f(p.costo_promedio) if p else None,
            "existencia": _f(existencia)}


@router.get("/insumos")
async def insumos(clase: Optional[str] = None, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    q = select(RTMInsumo).order_by(RTMInsumo.clase, RTMInsumo.id)
    if clase:
        q = q.where(RTMInsumo.clase == clase.upper())
    cfg = await obtener_config(db)
    return [await _insumo_dict(db, i, cfg) for i in (await db.execute(q)).scalars()]


@router.get("/insumos/productos")
async def productos_wms(q: Optional[str] = None, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Productos propios del WMS para marcarlos como insumo."""
    from app.core.wms_operacion import depositante_propio
    propio = await depositante_propio(db)
    consulta = select(WMSProducto).where(WMSProducto.activo.isnot(False),
                                         (WMSProducto.depositante_id == propio) | WMSProducto.depositante_id.is_(None),
                                         WMSProducto.categoria.notin_((rwms.CAT_CARCASA, rwms.CAT_REENCAUCHADA))
                                         | WMSProducto.categoria.is_(None))
    if q:
        consulta = consulta.where(WMSProducto.nombre.ilike(f"%{q}%") | WMSProducto.sku.ilike(f"%{q}%"))
    return [{"id": p.id, "sku": p.sku, "nombre": p.nombre, "unidad": p.unidad_medida}
            for p in (await db.execute(consulta.order_by(WMSProducto.nombre).limit(50))).scalars()]


@router.get("/insumos/{producto_id}/lotes")
async def lotes_insumo(producto_id: int, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return [{"id": l.id, "numero_lote": l.numero_lote, "vence": l.fecha_vencimiento}
            for l in (await db.execute(select(WMSLote).where(WMSLote.producto_id == producto_id,
                                                             WMSLote.activo.isnot(False))
                                       .order_by(WMSLote.id.desc()).limit(100))).scalars()]


@router.put("/insumos")
async def guardar_insumo(data: InsumoIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    if data.clase not in CLASES_INSUMO:
        raise HTTPException(422, "Clase de insumo desconocida.")
    if not await db.get(WMSProducto, data.producto_id):
        raise HTTPException(404, "El producto no existe.")
    i = (await db.execute(select(RTMInsumo).where(RTMInsumo.producto_id == data.producto_id))).scalar()
    if i is None:
        i = RTMInsumo(producto_id=data.producto_id)
        db.add(i)
    i.clase, i.ancho_mm, i.activo = data.clase, data.ancho_mm, data.activo
    await db.commit()
    return await _insumo_dict(db, i)


# ── Recetas ───────────────────────────────────────────────────────────────────

class RecetaIn(BaseModel):
    codigo: str = Field(min_length=2, max_length=30)
    nombre: str = Field(min_length=2, max_length=120)
    equipo_id: int
    banda_producto_id: Optional[int] = None
    cojin_producto_id: Optional[int] = None
    temperatura_c: float = Field(gt=0)
    temperatura_tol: float = Field(ge=0)
    presion_bar: float = Field(gt=0)
    presion_tol: float = Field(ge=0)
    vacio_bar: float
    vacio_tol: float = Field(ge=0)
    tiempo_min: float = Field(gt=0)
    tiempo_tol: float = Field(ge=0)


async def _receta_dict(db: AsyncSession, r: RTMReceta) -> Dict:
    eq = await db.get(RTMEquipo, r.equipo_id)
    b = await db.get(WMSProducto, r.banda_producto_id) if r.banda_producto_id else None
    c = await db.get(WMSProducto, r.cojin_producto_id) if r.cojin_producto_id else None
    return {"id": r.id, "codigo": r.codigo, "version": r.version, "nombre": r.nombre, "equipo_id": r.equipo_id,
            "equipo": eq.nombre if eq else None, "banda_producto_id": r.banda_producto_id, "banda": b.nombre if b else None,
            "cojin_producto_id": r.cojin_producto_id, "cojin": c.nombre if c else None,
            "temperatura_c": r.temperatura_c, "temperatura_tol": r.temperatura_tol, "presion_bar": r.presion_bar,
            "presion_tol": r.presion_tol, "vacio_bar": r.vacio_bar, "vacio_tol": r.vacio_tol,
            "tiempo_min": r.tiempo_min, "tiempo_tol": r.tiempo_tol, "estado": r.estado, "aprobada_en": r.aprobada_en}


@router.get("/recetas")
async def recetas(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return [await _receta_dict(db, r) for r in (await db.execute(
        select(RTMReceta).order_by(RTMReceta.codigo, RTMReceta.version.desc()))).scalars()]


@router.post("/recetas", status_code=201)
async def crear_receta(data: RecetaIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Una versión nueva en borrador. Cambiar una receta es crear otra versión:
    los ciclos guardan con cuál corrieron."""
    eq = await db.get(RTMEquipo, data.equipo_id)
    if eq is None or eq.tipo != "AUTOCLAVE":
        raise HTTPException(422, "Las recetas son de un autoclave.")
    if data.banda_producto_id:
        await flujo._validar_insumo(db, data.banda_producto_id, "BANDA")
    if data.cojin_producto_id:
        await flujo._validar_insumo(db, data.cojin_producto_id, "COJIN")
    codigo = data.codigo.strip().upper()
    version = ((await db.execute(select(func.max(RTMReceta.version)).where(RTMReceta.codigo == codigo))).scalar() or 0) + 1
    r = RTMReceta(**{**data.model_dump(), "codigo": codigo}, version=version, estado="BORRADOR")
    db.add(r)
    await db.commit()
    return await _receta_dict(db, r)


@router.post("/recetas/{rid}/aprobar")
async def aprobar_receta(rid: int, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    await flujo.exigir_rol(db, yo, "CALIDAD", "aprobar una receta")
    r = await db.get(RTMReceta, rid)
    if r is None:
        raise HTTPException(404, "Receta no encontrada.")
    if r.estado != "BORRADOR":
        raise HTTPException(409, "Solo se aprueba una receta en borrador.")
    for vieja in (await db.execute(select(RTMReceta).where(RTMReceta.codigo == r.codigo, RTMReceta.id != r.id,
                                                           RTMReceta.estado == "APROBADA"))).scalars():
        vieja.estado = "OBSOLETA"
    r.estado, r.aprobada_por_id, r.aprobada_en = "APROBADA", yo.id, flujo.ahora()
    await db.commit()
    return await _receta_dict(db, r)


# ── Tarifas ───────────────────────────────────────────────────────────────────

class TarifaIn(BaseModel):
    depositante_id: Optional[int] = None
    tipo: str
    medida: Optional[str] = None
    banda_producto_id: Optional[int] = None
    tipo_reparacion: Optional[str] = None
    valor: float = Field(ge=0)
    activo: bool = True


async def _tarifa_dict(db: AsyncSession, t: RTMTarifa) -> Dict:
    d = await db.get(WMSDepositante, t.depositante_id) if t.depositante_id else None
    b = await db.get(WMSProducto, t.banda_producto_id) if t.banda_producto_id else None
    return {"id": t.id, "depositante_id": t.depositante_id, "cliente": d.nombre if d else "General", "tipo": t.tipo,
            "medida": t.medida, "banda_producto_id": t.banda_producto_id, "banda": b.nombre if b else None,
            "tipo_reparacion": t.tipo_reparacion, "valor": _f(t.valor), "activo": t.activo}


@router.get("/tarifas")
async def tarifas(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return [await _tarifa_dict(db, t) for t in (await db.execute(
        select(RTMTarifa).order_by(RTMTarifa.tipo, RTMTarifa.depositante_id.nullsfirst(), RTMTarifa.medida))).scalars()]


async def _guardar_tarifa(db: AsyncSession, t: RTMTarifa, data: TarifaIn) -> None:
    if data.tipo not in ("REENCAUCHE", "REPARACION", "CARGO_INSPECCION", "VENTA"):
        raise HTTPException(422, "Tipo de tarifa desconocido.")
    if data.tipo in ("REENCAUCHE", "VENTA") and not data.medida:
        raise HTTPException(422, "Esta tarifa es por medida.")
    if data.tipo == "REPARACION" and not data.tipo_reparacion:
        raise HTTPException(422, "Indique el tipo de reparación.")
    for k, v in data.model_dump().items():
        setattr(t, k, v.strip().upper() if k == "tipo_reparacion" and v else v)


@router.post("/tarifas", status_code=201)
async def crear_tarifa(data: TarifaIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    t = RTMTarifa()
    await _guardar_tarifa(db, t, data)
    db.add(t)
    await db.commit()
    return await _tarifa_dict(db, t)


@router.put("/tarifas/{tid}")
async def editar_tarifa(tid: int, data: TarifaIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Cambiar una tarifa no toca los precios ya congelados en las órdenes."""
    t = await db.get(RTMTarifa, tid)
    if t is None:
        raise HTTPException(404, "Tarifa no encontrada.")
    await _guardar_tarifa(db, t, data)
    await db.commit()
    return await _tarifa_dict(db, t)
