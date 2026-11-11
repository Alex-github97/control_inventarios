"""
TittanLite: inspecciones y disposiciones de llantas en campo, sin restricciones,
y el informe que se arma con ellas.

Lo usa la app TittanLite (y la web). Trabaja sobre los vehículos que ya existen
en la cuenta, propone las llantas montadas y los catálogos de marcas y
referencias, pero acepta lo que el inspector vea aunque contradiga el
seguimiento. Cada línea se intenta sincronizar con TittanWare usando sus mismas
reglas (`crear_inspeccion`, `registrar` de la disposición): lo que no pasa se
queda en Lite como RECHAZADA, con el motivo.
"""
import asyncio
import hashlib
import io
import re
import unicodedata
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.paginacion import contar, poner_total
from app.core.tenant import ESQUEMA_POR_DEFECTO, esquema_actual
from app.infrastructure.models.eam import (
    EAMActivo, EAMDanoNeumaticoCatalogo, EAMNeumatico, EAMNeumaticoFoto,
)
from app.infrastructure.models.lite import LiteDisposicion, LiteFoto, LiteInspeccion, LiteInspeccionLlanta
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/eam/lite", tags=["TittanLite"])

NOVEDADES_CAMPO: Dict[str, str] = {
    "BAJA_PRESION": "Baja presión", "ALTA_PRESION": "Alta presión", "CORTE": "Corte o herida",
    "DESGASTE_IRREGULAR": "Desgaste irregular", "OBJETO_INCRUSTADO": "Objeto incrustado",
    "ABULTAMIENTO": "Abultamiento", "SEPARACION": "Separación", "VALVULA": "Válvula o tapa",
    "RIN": "Rin dañado", "SIN_LLANTA": "Posición sin llanta", "OTRA": "Otra",
}
TIPOS_FOTO = ("NUMERO", "DANO", "BANDA", "OTRA")
MAX_FOTO = 12 * 1024 * 1024


def _quien(u: Usuario) -> str:
    return (f"{u.nombre or ''} {u.apellido or ''}".strip() or u.username)[:120]


# ─── Lo que la app necesita para trabajar ─────────────────────────────────────

@router.get("/catalogos")
async def catalogos(db: AsyncSession = Depends(get_db)):
    """Marcas, referencias y medidas que ya existen en la cuenta, el catálogo de
    daños y las novedades de campo. La app los ofrece como sugerencia; se puede
    escribir otra cosa."""
    N = EAMNeumatico
    refs = (await db.execute(
        select(func.upper(func.trim(N.marca)), func.upper(func.trim(N.referencia)), func.count())
        .where(N.marca.isnot(None)).group_by(func.upper(func.trim(N.marca)), func.upper(func.trim(N.referencia)))
        .order_by(func.count().desc()).limit(600))).all()
    medidas = [m for (m,) in (await db.execute(
        select(func.trim(N.medida)).where(N.medida.isnot(None)).group_by(func.trim(N.medida))
        .order_by(func.count().desc()).limit(80))).all() if m]
    marcas = sorted({m for m, _, _ in refs if m})
    danos = (await db.execute(select(EAMDanoNeumaticoCatalogo).where(EAMDanoNeumaticoCatalogo.activo.isnot(False))
                              .order_by(EAMDanoNeumaticoCatalogo.codigo))).scalars().all()
    from app.core.neumaticos_flota import umbrales
    u = await umbrales(db)
    return {
        "marcas": marcas,
        "referencias": [{"marca": m, "referencia": r} for m, r, _ in refs if m and r],
        "medidas": medidas,
        "danos": [{"id": d.id, "codigo": d.codigo, "nombre": d.nombre, "ubicacion": d.ubicacion,
                   "causa": d.causa, "responsable": d.responsable} for d in danos],
        "novedades": [{"clave": k, "nombre": v} for k, v in NOVEDADES_CAMPO.items()],
        "umbrales": {"profundidad_minima": u.profundidad_minima, "margen_alerta": u.margen_alerta,
                     "presion_min": u.presion_min, "presion_max": u.presion_max},
    }


@router.get("/vehiculos")
async def vehiculos(buscar: Optional[str] = None, limite: int = Query(50, ge=1, le=500),
                    db: AsyncSession = Depends(get_db)):
    """Los vehículos de la cuenta con su esquema de posiciones y la llanta que
    TittanWare tiene montada en cada una (para proponerla en la inspección)."""
    from app.api.v1.endpoints.eam import _generar_posiciones
    q = select(EAMActivo).where(EAMActivo.activo.is_(True), EAMActivo.numero_ejes.isnot(None))
    if buscar and buscar.strip():
        p = f"%{buscar.strip()}%"
        q = q.where(or_(EAMActivo.placa.ilike(p), EAMActivo.codigo.ilike(p), EAMActivo.nombre.ilike(p)))
    activos = (await db.execute(q.order_by(EAMActivo.placa, EAMActivo.codigo).limit(limite))).scalars().all()
    montadas: Dict[tuple, EAMNeumatico] = {}
    if activos:
        for n in (await db.execute(select(EAMNeumatico).where(
                EAMNeumatico.estado == "INSTALADO", EAMNeumatico.activo_id.in_([a.id for a in activos])))).scalars():
            montadas[(n.activo_id, n.posicion)] = n
    # La última inspección Lite de cada vehículo, con sus llantas tal como se
    # tomaron: la app la muestra y propone esos datos en la siguiente.
    ultimas: Dict[int, Dict[str, Any]] = {}
    if activos:
        ids = [a.id for a in activos]
        sub = (select(LiteInspeccion.activo_id, func.max(LiteInspeccion.id).label("iid"))
               .where(LiteInspeccion.activo_id.in_(ids)).group_by(LiteInspeccion.activo_id).subquery())
        insps = {i.id: i for i in (await db.execute(
            select(LiteInspeccion).join(sub, sub.c.iid == LiteInspeccion.id))).scalars()}
        if insps:
            lineas: Dict[int, Dict[str, Any]] = {}
            for ln in (await db.execute(select(LiteInspeccionLlanta).where(
                    LiteInspeccionLlanta.inspeccion_id.in_(list(insps))))).scalars():
                lineas.setdefault(ln.inspeccion_id, {})[ln.posicion or ""] = {
                    "codigo": ln.codigo, "marca": ln.marca, "referencia": ln.referencia, "medida": ln.medida,
                    "reencauches": ln.reencauches, "profundidad_externa": ln.profundidad_externa,
                    "profundidad_central": ln.profundidad_central, "profundidad_interna": ln.profundidad_interna,
                    "presion": ln.presion, "novedades": ln.novedades or [], "observacion": ln.observacion}
            for i in insps.values():
                ultimas[i.activo_id] = {"fecha": i.fecha, "odometro": i.odometro, "inspector": i.inspector,
                                        "llantas": lineas.get(i.id, {})}
    salida = []
    for a in activos:
        layout = _generar_posiciones(a.numero_ejes, a.tiene_repuesto if a.tiene_repuesto is not None else True,
                                     layout=a.layout_llantas, cantidad_repuestos=a.cantidad_repuestos or 1)
        posiciones = []
        for p in layout:
            n = montadas.get((a.id, p["codigo"]))
            posiciones.append({
                "codigo": p["codigo"], "label": p.get("label") or p["codigo"], "eje": p.get("eje") or 0,
                "lado": p.get("lado") or "-",
                "llanta": {"neumatico_id": n.id, "codigo": n.codigo, "marca": n.marca, "referencia": n.referencia,
                           "medida": n.medida, "reencauches": n.reencauches or 0,
                           "profundidad_actual": n.profundidad_actual,
                           "presion_recomendada": n.presion_recomendada} if n else None,
            })
        salida.append({"activo_id": a.id, "codigo": a.codigo, "placa": a.placa, "nombre": a.nombre,
                       "tipo": a.tipo_activo, "marca": a.marca, "linea": a.linea,
                       "odometro_actual": a.odometro_actual, "horometro_actual": a.horometro_actual,
                       "posiciones": posiciones, "ultima_inspeccion": ultimas.get(a.id)})
    return salida


# ─── Inspecciones ─────────────────────────────────────────────────────────────

class LlantaLiteIn(BaseModel):
    posicion: Optional[str] = None
    codigo: Optional[str] = None
    marca: Optional[str] = None
    referencia: Optional[str] = None
    medida: Optional[str] = None
    reencauches: Optional[int] = Field(None, ge=0, le=20)
    profundidad_interna: Optional[float] = Field(None, ge=0, le=40)
    profundidad_central: Optional[float] = Field(None, ge=0, le=40)
    profundidad_externa: Optional[float] = Field(None, ge=0, le=40)
    presion: Optional[float] = Field(None, ge=0, le=250)
    novedades: List[str] = []
    observacion: Optional[str] = None


class InspeccionLiteIn(BaseModel):
    uuid: str = Field(min_length=8, max_length=40)
    activo_id: int
    fecha: datetime
    odometro: Optional[float] = Field(None, ge=0)
    horometro: Optional[float] = Field(None, ge=0)
    inspector: Optional[str] = None
    observaciones: Optional[str] = None
    llantas: List[LlantaLiteIn] = []
    sincronizar: bool = True


def _texto(v: Optional[str]) -> Optional[str]:
    return " ".join(str(v).split()).upper() if v not in (None, "") else None


def _estado_visual(pmin: Optional[float], u) -> Optional[str]:
    if pmin is None:
        return None
    if pmin <= u.profundidad_minima:
        return "CRITICO"
    return "REGULAR" if pmin <= u.profundidad_minima + u.margen_alerta else "BUENO"


def _nota(ln: LiteInspeccionLlanta) -> Optional[str]:
    partes = [NOVEDADES_CAMPO.get(n, n) for n in (ln.novedades or [])]
    if ln.observacion:
        partes.append(ln.observacion)
    return ("TittanLite: " + "; ".join(partes))[:500] if partes else "TittanLite"


async def _sync_linea(db: AsyncSession, insp: LiteInspeccion, ln: LiteInspeccionLlanta, quien: str, u) -> None:
    from app.api.v1.endpoints.eam import InspeccionNeuCreate, crear_inspeccion
    if ln.sync_estado == "SINCRONIZADA":
        return
    # Los commits de por medio vencen los objetos: se guardan los ids antes.
    lid = ln.id
    if not ln.codigo:
        ln.sync_estado, ln.sync_motivo = "SIN_SEGUIMIENTO", "Sin código de llanta"
        return
    neu = (await db.execute(select(EAMNeumatico).where(EAMNeumatico.codigo == ln.codigo))).scalar()
    if neu is None:
        ln.sync_estado, ln.sync_motivo = "SIN_SEGUIMIENTO", "La llanta no existe en TittanWare"
        return
    ln.neumatico_id = neu_id = neu.id
    if neu.estado == "BAJA":
        ln.sync_estado, ln.sync_motivo = "RECHAZADA", "En TittanWare la llanta está dada de baja"
        return
    if neu.estado != "INSTALADO" or neu.activo_id != insp.activo_id or (
            neu.posicion and ln.posicion and neu.posicion != ln.posicion):
        donde = "sin montar" if neu.estado != "INSTALADO" else None
        if donde is None:
            act = await db.get(EAMActivo, neu.activo_id) if neu.activo_id else None
            donde = f"en {(act.placa or act.codigo) if act else '?'} posición {neu.posicion or '?'}"
        ln.sync_estado = "RECHAZADA"
        ln.sync_motivo = f"En TittanWare la llanta está {donde}; registre el movimiento allá para sincronizar"
        return
    pmin = min([v for v in (ln.profundidad_interna, ln.profundidad_central, ln.profundidad_externa)
                if v is not None], default=None)
    try:
        # Convención de TittanWare: izquierda = hombro externo, derecha = interno.
        r = await crear_inspeccion(neu_id, InspeccionNeuCreate(
            fecha=insp.fecha, profundidad_izq=ln.profundidad_externa, profundidad_centro=ln.profundidad_central,
            profundidad_der=ln.profundidad_interna, presion_psi=ln.presion, km_odometro=insp.odometro,
            posicion=ln.posicion, estado_visual=_estado_visual(pmin, u), observaciones=_nota(ln),
            tecnico=insp.inspector or quien), db=db)
    except HTTPException as e:
        await db.rollback()
        ln = await db.get(LiteInspeccionLlanta, lid)
        ln.neumatico_id = neu_id
        ln.sync_estado, ln.sync_motivo = "RECHAZADA", str(e.detail)[:400]
        await db.commit()
        return
    principal_id = r.id
    ln = await db.get(LiteInspeccionLlanta, lid)
    ln.sync_estado, ln.sync_motivo, ln.inspeccion_principal_id = "SINCRONIZADA", None, principal_id
    for f in (await db.execute(select(LiteFoto).where(LiteFoto.inspeccion_llanta_id == lid,
                                                      LiteFoto.foto_principal_id.is_(None)))).scalars():
        foto = EAMNeumaticoFoto(neumatico_id=neu_id, tipo=f.tipo, archivo=f.archivo, nombre=f.nombre,
                                registrado_por=quien)
        db.add(foto)
        await db.flush()
        f.foto_principal_id = foto.id


def _resumen_estado(estados: List[str]) -> str:
    if not estados:
        return "SIN_SEGUIMIENTO"
    c = set(estados)
    if c == {"SINCRONIZADA"}:
        return "SINCRONIZADA"
    if c == {"SIN_SEGUIMIENTO"}:
        return "SIN_SEGUIMIENTO"
    if "PENDIENTE" in c:
        return "PENDIENTE"
    return "PARCIAL" if "SINCRONIZADA" in c else ("RECHAZADA" if "RECHAZADA" in c else "SIN_SEGUIMIENTO")


async def sincronizar_inspeccion(db: AsyncSession, insp_id: int, quien: str) -> None:
    from app.core.neumaticos_flota import umbrales
    u = await umbrales(db)
    ids = [i for (i,) in (await db.execute(select(LiteInspeccionLlanta.id)
                                           .where(LiteInspeccionLlanta.inspeccion_id == insp_id)
                                           .order_by(LiteInspeccionLlanta.id))).all()]
    for lid in ids:
        insp = await db.get(LiteInspeccion, insp_id)
        ln = await db.get(LiteInspeccionLlanta, lid)
        await _sync_linea(db, insp, ln, quien, u)
        await db.commit()
    insp = await db.get(LiteInspeccion, insp_id)
    estados = [e for (e,) in (await db.execute(select(LiteInspeccionLlanta.sync_estado)
                                               .where(LiteInspeccionLlanta.inspeccion_id == insp_id))).all()]
    insp.estado_sync = _resumen_estado(estados)
    insp.sincronizada_en = datetime.utcnow()
    await db.commit()


async def _ficha_inspeccion(db: AsyncSession, insp: LiteInspeccion) -> Dict[str, Any]:
    act = await db.get(EAMActivo, insp.activo_id)
    lineas = (await db.execute(select(LiteInspeccionLlanta).where(LiteInspeccionLlanta.inspeccion_id == insp.id)
                               .order_by(LiteInspeccionLlanta.id))).scalars().all()
    fotos: Dict[int, List[dict]] = {}
    if lineas:
        for f in (await db.execute(select(LiteFoto).where(LiteFoto.inspeccion_llanta_id.in_([x.id for x in lineas]))
                                   .order_by(LiteFoto.id))).scalars():
            fotos.setdefault(f.inspeccion_llanta_id, []).append({"id": f.id, "tipo": f.tipo})
    return {
        "id": insp.id, "uuid": insp.uuid, "activo_id": insp.activo_id,
        "placa": (act.placa or act.codigo) if act else None, "fecha": insp.fecha, "odometro": insp.odometro,
        "inspector": insp.inspector, "observaciones": insp.observaciones, "estado_sync": insp.estado_sync,
        "llantas": [{
            "id": x.id, "posicion": x.posicion, "codigo": x.codigo, "marca": x.marca, "referencia": x.referencia,
            "medida": x.medida, "reencauches": x.reencauches, "profundidad_interna": x.profundidad_interna,
            "profundidad_central": x.profundidad_central, "profundidad_externa": x.profundidad_externa,
            "presion": x.presion, "novedades": x.novedades or [], "observacion": x.observacion,
            "sync_estado": x.sync_estado, "sync_motivo": x.sync_motivo, "fotos": fotos.get(x.id, []),
        } for x in lineas],
    }


@router.post("/inspecciones", status_code=201)
async def crear_inspeccion_lite(data: InspeccionLiteIn, db: AsyncSession = Depends(get_db),
                                usuario: Usuario = Depends(get_current_user)):
    quien = _quien(usuario)
    ya = (await db.execute(select(LiteInspeccion).where(LiteInspeccion.uuid == data.uuid))).scalar()
    if ya:      # reintento de la app: se devuelve lo que ya quedó
        return await _ficha_inspeccion(db, ya)
    if not await db.get(EAMActivo, data.activo_id):
        raise HTTPException(404, "Ese vehículo no existe en la cuenta")
    if data.fecha.replace(tzinfo=None) > datetime.now() + timedelta(hours=6):
        raise HTTPException(422, "La fecha no puede estar en el futuro")
    insp = LiteInspeccion(uuid=data.uuid, activo_id=data.activo_id, fecha=data.fecha.replace(tzinfo=None),
                          odometro=data.odometro, horometro=data.horometro,
                          inspector=data.inspector or quien, observaciones=data.observaciones,
                          usuario_id=usuario.id)
    db.add(insp)
    await db.flush()
    iid = insp.id
    for ll in data.llantas:
        db.add(LiteInspeccionLlanta(
            inspeccion_id=insp.id, posicion=(ll.posicion or "").strip() or None,
            codigo=(str(ll.codigo).strip() if ll.codigo not in (None, "") else None),
            marca=_texto(ll.marca), referencia=_texto(ll.referencia), medida=(ll.medida or "").strip() or None,
            reencauches=ll.reencauches, profundidad_interna=ll.profundidad_interna,
            profundidad_central=ll.profundidad_central, profundidad_externa=ll.profundidad_externa,
            presion=ll.presion, novedades=[n for n in ll.novedades if n in NOVEDADES_CAMPO] or None,
            observacion=ll.observacion))
    await db.commit()
    if data.sincronizar:
        await sincronizar_inspeccion(db, iid, quien)
    return await _ficha_inspeccion(db, await db.get(LiteInspeccion, iid))


@router.post("/inspecciones/{iid}/sincronizar")
async def resincronizar(iid: int, db: AsyncSession = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    """Vuelve a intentar las líneas pendientes o rechazadas (p. ej. después de
    registrar en TittanWare el movimiento que faltaba)."""
    quien = _quien(usuario)
    insp = await db.get(LiteInspeccion, iid)
    if not insp:
        raise HTTPException(404, "Esa inspección no existe")
    for ln in (await db.execute(select(LiteInspeccionLlanta).where(
            LiteInspeccionLlanta.inspeccion_id == iid,
            LiteInspeccionLlanta.sync_estado.in_(["RECHAZADA", "PENDIENTE", "SIN_SEGUIMIENTO"])))).scalars():
        ln.sync_estado = "PENDIENTE"
    await db.commit()
    await sincronizar_inspeccion(db, iid, quien)
    return await _ficha_inspeccion(db, await db.get(LiteInspeccion, iid))


@router.get("/inspecciones")
async def listar_inspecciones(respuesta: Response, desde: Optional[date] = None, hasta: Optional[date] = None,
                              activo_id: Optional[int] = None, estado_sync: Optional[str] = None,
                              limite: int = Query(50, ge=1, le=500), desplazamiento: int = Query(0, ge=0),
                              db: AsyncSession = Depends(get_db)):
    q = select(LiteInspeccion, EAMActivo).join(EAMActivo, EAMActivo.id == LiteInspeccion.activo_id)
    if desde:
        q = q.where(LiteInspeccion.fecha >= datetime.combine(desde, datetime.min.time()))
    if hasta:
        q = q.where(LiteInspeccion.fecha <= datetime.combine(hasta, datetime.max.time()))
    if activo_id:
        q = q.where(LiteInspeccion.activo_id == activo_id)
    if estado_sync:
        q = q.where(LiteInspeccion.estado_sync == estado_sync)
    poner_total(respuesta, await contar(db, q), limite, desplazamiento)
    filas = (await db.execute(q.order_by(desc(LiteInspeccion.fecha), desc(LiteInspeccion.id))
                              .offset(desplazamiento).limit(limite))).all()
    conteo: Dict[int, Counter] = {}
    if filas:
        for iid, est, n in (await db.execute(
                select(LiteInspeccionLlanta.inspeccion_id, LiteInspeccionLlanta.sync_estado, func.count())
                .where(LiteInspeccionLlanta.inspeccion_id.in_([i.id for i, _ in filas]))
                .group_by(LiteInspeccionLlanta.inspeccion_id, LiteInspeccionLlanta.sync_estado))).all():
            conteo.setdefault(iid, Counter())[est] = n
    return [{"id": i.id, "fecha": i.fecha, "activo_id": a.id, "placa": a.placa or a.codigo, "inspector": i.inspector,
             "odometro": i.odometro, "estado_sync": i.estado_sync, "llantas": sum(conteo.get(i.id, Counter()).values()),
             "sincronizadas": conteo.get(i.id, Counter()).get("SINCRONIZADA", 0),
             "rechazadas": conteo.get(i.id, Counter()).get("RECHAZADA", 0)} for i, a in filas]


@router.get("/inspecciones/{iid}")
async def ver_inspeccion(iid: int, db: AsyncSession = Depends(get_db)):
    insp = await db.get(LiteInspeccion, iid)
    if not insp:
        raise HTTPException(404, "Esa inspección no existe")
    return await _ficha_inspeccion(db, insp)


# ─── Disposiciones ────────────────────────────────────────────────────────────

class DisposicionLiteIn(BaseModel):
    uuid: str = Field(min_length=8, max_length=40)
    fecha: datetime
    codigo: str = Field(min_length=1, max_length=50)
    activo_id: Optional[int] = None
    dano_id: Optional[int] = None
    marca: Optional[str] = None
    referencia: Optional[str] = None
    medida: Optional[str] = None
    dot: Optional[str] = None
    reencauches: Optional[int] = Field(None, ge=0, le=20)
    profundidad_interna: Optional[float] = Field(None, ge=0, le=40)
    profundidad_central: Optional[float] = Field(None, ge=0, le=40)
    profundidad_externa: Optional[float] = Field(None, ge=0, le=40)
    reparaciones: Optional[int] = Field(None, ge=0)
    regrabada: bool = False
    diseno_reencauche: Optional[str] = None
    ubicacion_actual: Optional[str] = None
    observaciones: Optional[str] = None
    inspector: Optional[str] = None
    sincronizar: bool = True


async def sincronizar_disposicion(db: AsyncSession, did: int, quien: str) -> None:
    from app.api.v1.endpoints.eam_neumaticos_disposicion import DisposicionIn, registrar
    d = await db.get(LiteDisposicion, did)
    if d.sync_estado == "SINCRONIZADA":
        return
    neu = (await db.execute(select(EAMNeumatico).where(EAMNeumatico.codigo == d.codigo))).scalar()
    neu_id = neu.id if neu else None
    if neu is None:
        d.sync_estado, d.sync_motivo = "SIN_SEGUIMIENTO", "La llanta no existe en TittanWare"
        await db.commit()
        return
    try:
        disp = await registrar(db, DisposicionIn(
            neumatico_id=neu_id, fecha=d.fecha, dano_id=d.dano_id, profundidad_interna=d.profundidad_interna,
            profundidad_central=d.profundidad_central, profundidad_externa=d.profundidad_externa,
            reparaciones=d.reparaciones, regrabada=bool(d.regrabada), diseno_reencauche=d.diseno_reencauche,
            ubicacion_actual=d.ubicacion_actual, observaciones=d.observaciones, origen="LITE"), quien)
        await db.flush()
        disp_id = disp.id
        d = await db.get(LiteDisposicion, did)
        d.sync_estado, d.sync_motivo, d.disposicion_id = "SINCRONIZADA", None, disp_id
        for f in (await db.execute(select(LiteFoto).where(LiteFoto.disposicion_id == did,
                                                          LiteFoto.foto_principal_id.is_(None)))).scalars():
            foto = EAMNeumaticoFoto(neumatico_id=neu_id, disposicion_id=disp_id, tipo=f.tipo, archivo=f.archivo,
                                    nombre=f.nombre, registrado_por=quien)
            db.add(foto)
            await db.flush()
            f.foto_principal_id = foto.id
        await db.commit()
    except ValueError as e:
        await db.rollback()
        d = await db.get(LiteDisposicion, did)
        d.sync_estado, d.sync_motivo = "RECHAZADA", str(e)[:400]
        await db.commit()


def _ficha_disp(d: LiteDisposicion, fotos: List[dict]) -> Dict[str, Any]:
    return {k: getattr(d, k) for k in (
        "id", "uuid", "fecha", "codigo", "activo_id", "dano_id", "marca", "referencia", "medida", "dot", "reencauches",
        "profundidad_interna", "profundidad_central", "profundidad_externa", "reparaciones", "regrabada",
        "diseno_reencauche", "ubicacion_actual", "observaciones", "inspector", "sync_estado", "sync_motivo")} | {
        "fotos": fotos}


@router.post("/disposiciones", status_code=201)
async def crear_disposicion_lite(data: DisposicionLiteIn, db: AsyncSession = Depends(get_db),
                                 usuario: Usuario = Depends(get_current_user)):
    quien = _quien(usuario)
    ya = (await db.execute(select(LiteDisposicion).where(LiteDisposicion.uuid == data.uuid))).scalar()
    if ya:
        return _ficha_disp(ya, [])
    if data.dano_id and not await db.get(EAMDanoNeumaticoCatalogo, data.dano_id):
        raise HTTPException(422, "Ese código de daño no existe en el catálogo")
    campos = data.model_dump(exclude={"uuid", "sincronizar", "fecha", "marca", "referencia", "inspector"})
    d = LiteDisposicion(uuid=data.uuid, fecha=data.fecha.replace(tzinfo=None), marca=_texto(data.marca),
                        referencia=_texto(data.referencia), inspector=data.inspector or quien,
                        usuario_id=usuario.id, **campos)
    d.codigo = d.codigo.strip()
    db.add(d)
    await db.flush()
    did = d.id
    await db.commit()
    if data.sincronizar:
        await sincronizar_disposicion(db, did, quien)
    return _ficha_disp(await db.get(LiteDisposicion, did), [])


@router.post("/disposiciones/{did}/sincronizar")
async def resincronizar_disposicion(did: int, db: AsyncSession = Depends(get_db),
                                    usuario: Usuario = Depends(get_current_user)):
    quien = _quien(usuario)
    d = await db.get(LiteDisposicion, did)
    if not d:
        raise HTTPException(404, "Esa disposición no existe")
    if d.sync_estado != "SINCRONIZADA":
        d.sync_estado = "PENDIENTE"
        await db.commit()
        await sincronizar_disposicion(db, did, quien)
    return _ficha_disp(await db.get(LiteDisposicion, did), [])


@router.get("/disposiciones")
async def listar_disposiciones_lite(respuesta: Response, desde: Optional[date] = None, hasta: Optional[date] = None,
                                    estado_sync: Optional[str] = None, limite: int = Query(50, ge=1, le=500),
                                    desplazamiento: int = Query(0, ge=0), db: AsyncSession = Depends(get_db)):
    q = select(LiteDisposicion)
    if desde:
        q = q.where(LiteDisposicion.fecha >= datetime.combine(desde, datetime.min.time()))
    if hasta:
        q = q.where(LiteDisposicion.fecha <= datetime.combine(hasta, datetime.max.time()))
    if estado_sync:
        q = q.where(LiteDisposicion.sync_estado == estado_sync)
    poner_total(respuesta, await contar(db, q), limite, desplazamiento)
    filas = (await db.execute(q.order_by(desc(LiteDisposicion.fecha)).offset(desplazamiento).limit(limite))).scalars()
    return [_ficha_disp(d, []) for d in filas]


# ─── Fotos ────────────────────────────────────────────────────────────────────

def _carpeta() -> str:
    return "llantas/" + re.sub(r"[^A-Za-z0-9_]", "_", esquema_actual() or ESQUEMA_POR_DEFECTO)


@router.post("/fotos", status_code=201)
async def subir_foto_lite(archivo: UploadFile = File(...), tipo: str = Form("OTRA"),
                          inspeccion_llanta_id: Optional[int] = Form(None), disposicion_id: Optional[int] = Form(None),
                          db: AsyncSession = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    from app.api.v1.endpoints.eam_neumaticos_disposicion import _normalizar
    if bool(inspeccion_llanta_id) == bool(disposicion_id):
        raise HTTPException(422, "Indique la llanta inspeccionada o la disposición de la foto")
    tipo = (tipo or "OTRA").upper()
    if tipo not in TIPOS_FOTO:
        raise HTTPException(422, f"Tipo de foto inválido; use {', '.join(TIPOS_FOTO)}")
    padre = await db.get(LiteInspeccionLlanta, inspeccion_llanta_id) if inspeccion_llanta_id \
        else await db.get(LiteDisposicion, disposicion_id)
    if padre is None:
        raise HTTPException(404, "No existe el registro de la foto")
    contenido = await archivo.read(MAX_FOTO + 1)
    if len(contenido) > MAX_FOTO:
        raise HTTPException(413, "La foto pesa más de 12 MB")
    datos = await asyncio.to_thread(_normalizar, contenido)
    (Path(settings.UPLOAD_DIR) / _carpeta()).mkdir(parents=True, exist_ok=True)
    relativa = f"{_carpeta()}/lite_{tipo.lower()}_{hashlib.md5(datos).hexdigest()[:14]}.jpg"
    (Path(settings.UPLOAD_DIR) / relativa).write_bytes(datos)
    f = LiteFoto(inspeccion_llanta_id=inspeccion_llanta_id, disposicion_id=disposicion_id, tipo=tipo,
                 archivo=relativa, nombre=(archivo.filename or "foto")[:200])
    db.add(f)
    await db.flush()
    # Si el registro ya entró a TittanWare, la foto va también al historial de la llanta.
    neumatico_id = padre.neumatico_id if inspeccion_llanta_id else None
    if disposicion_id and padre.sync_estado == "SINCRONIZADA":
        neumatico_id = (await db.execute(select(EAMNeumatico.id).where(EAMNeumatico.codigo == padre.codigo))).scalar()
    if neumatico_id and padre.sync_estado == "SINCRONIZADA":
        foto = EAMNeumaticoFoto(neumatico_id=neumatico_id, tipo=tipo, archivo=relativa, nombre=f.nombre,
                                disposicion_id=padre.disposicion_id if disposicion_id else None,
                                registrado_por=_quien(usuario))
        db.add(foto)
        await db.flush()
        f.foto_principal_id = foto.id
    await db.commit()
    return {"id": f.id, "tipo": f.tipo}


@router.get("/fotos/{fid}/archivo")
async def ver_foto_lite(fid: int, db: AsyncSession = Depends(get_db)):
    f = await db.get(LiteFoto, fid)
    ruta = Path(settings.UPLOAD_DIR) / f.archivo if f else None
    if not ruta or not ruta.is_file():
        raise HTTPException(404, "Esa foto no existe")
    return FileResponse(ruta, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})


# ─── El informe ───────────────────────────────────────────────────────────────

def _norma(t: str) -> str:
    t = unicodedata.normalize("NFD", t.lower()).encode("ascii", "ignore").decode()
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", t).split())


async def flota_lite(db: AsyncSession, desde: Optional[datetime], hasta: Optional[datetime],
                     activo_ids: Optional[List[int]] = None):
    """La flota armada con la ÚLTIMA inspección Lite de cada vehículo en el
    periodo, con el mismo esquema de posiciones que usa TittanWare. Devuelve
    también las líneas, para los conteos que el informe de flota no trae."""
    from app.api.v1.endpoints.eam import _generar_posiciones
    from app.core.neumaticos_flota import TIPO_VEHICULO, PosicionFlota, VehiculoFlota
    from app.core.neumaticos_novedades import LlantaInsp
    q = select(LiteInspeccion)
    if desde:
        q = q.where(LiteInspeccion.fecha >= desde)
    if hasta:
        q = q.where(LiteInspeccion.fecha <= hasta)
    if activo_ids:
        q = q.where(LiteInspeccion.activo_id.in_(activo_ids))
    ultima: Dict[int, LiteInspeccion] = {}
    for i in (await db.execute(q.order_by(LiteInspeccion.fecha, LiteInspeccion.id))).scalars():
        ultima[i.activo_id] = i
    if not ultima:
        return [], []
    activos = {a.id: a for a in (await db.execute(select(EAMActivo).where(EAMActivo.id.in_(list(ultima))))).scalars()}
    lineas = (await db.execute(select(LiteInspeccionLlanta).where(
        LiteInspeccionLlanta.inspeccion_id.in_([i.id for i in ultima.values()])))).scalars().all()
    por_insp: Dict[int, List[LiteInspeccionLlanta]] = {}
    for ln in lineas:
        por_insp.setdefault(ln.inspeccion_id, []).append(ln)
    # Lo que TittanWare sabe de cada llanta: completa lo que el inspector no
    # escribió (marca, referencia, medida, vida) y pone las montadas que no se
    # inspeccionaron como «sin inspección» en vez de «vacía».
    codigos = {ln.codigo for ln in lineas if ln.codigo}
    conocidas = {n.codigo: n for n in (await db.execute(select(EAMNeumatico).where(
        or_(EAMNeumatico.codigo.in_(codigos or {""}),
            (EAMNeumatico.estado == "INSTALADO") & EAMNeumatico.activo_id.in_(list(ultima)))))).scalars()}
    montadas = {(n.activo_id, n.posicion): n for n in conocidas.values() if n.estado == "INSTALADO"}
    recomendada = {n.id: n.presion_recomendada for n in conocidas.values()}
    flota = []
    for aid, insp in sorted(ultima.items(), key=lambda kv: (activos[kv[0]].placa or activos[kv[0]].codigo or "")):
        a = activos[aid]
        v = VehiculoFlota(activo_id=a.id, codigo=a.codigo, placa=a.placa, nombre=a.nombre,
                          tipo=TIPO_VEHICULO.get(a.tipo_activo or "", a.tipo_activo or "Sin tipo"), marca=a.marca,
                          linea=a.linea)
        layout = _generar_posiciones(a.numero_ejes or 2, a.tiene_repuesto if a.tiene_repuesto is not None else True,
                                     layout=a.layout_llantas, cantidad_repuestos=a.cantidad_repuestos or 1)
        en_pos = {ln.posicion: ln for ln in por_insp.get(insp.id, [])}
        codigos = {p["codigo"] for p in layout}
        extra = [{"codigo": p, "label": p, "eje": 0, "lado": "-"} for p in en_pos if p and p not in codigos]
        for p in [*layout, *extra]:
            pos = PosicionFlota(codigo=p["codigo"], label=p.get("label") or p["codigo"], eje=p.get("eje") or 0,
                                lado=p.get("lado") or "-", numero=p.get("numero"))
            ln = en_pos.get(p["codigo"])
            if ln is None:
                n = montadas.get((a.id, p["codigo"]))
                if n is not None:
                    pos.llanta = LlantaInsp(
                        neumatico_id=-1_000_000 - n.id, codigo=n.codigo, activo_id=a.id, posicion=pos.codigo,
                        posicion_label=pos.label, eje=pos.eje, lado=pos.lado, marca=_texto(n.marca),
                        referencia=_texto(n.referencia),
                        medida=n.medida, reencauches=n.reencauches or 0, fecha=None)
            elif "SIN_LLANTA" not in (ln.novedades or []):
                k = conocidas.get(ln.codigo) if ln.codigo else None
                pos.llanta = LlantaInsp(
                    neumatico_id=-ln.id, codigo=ln.codigo or "s/c", activo_id=a.id, posicion=pos.codigo,
                    posicion_label=pos.label, eje=pos.eje, lado=pos.lado,
                    marca=_texto(ln.marca or (k.marca if k else None)),
                    referencia=_texto(ln.referencia or (k.referencia if k else None)),
                    medida=ln.medida or (k.medida if k else None),
                    reencauches=ln.reencauches if ln.reencauches is not None else ((k.reencauches or 0) if k else 0),
                    izq=ln.profundidad_externa,
                    centro=ln.profundidad_central, der=ln.profundidad_interna, presion=ln.presion,
                    presion_recomendada=recomendada.get(ln.neumatico_id), fecha=insp.fecha,
                    km_inspeccion=insp.odometro, observaciones=_nota(ln))
            v.posiciones.append(pos)
        flota.append(v)
    return flota, [ln for i in ultima.values() for ln in por_insp.get(i.id, [])]


def _completar(r, lineas: List[LiteInspeccionLlanta]):
    """Lo que el inspector marcó en campo, para el resumen."""
    tags = Counter(NOVEDADES_CAMPO.get(n, n) for ln in lineas for n in (ln.novedades or []))
    r.novedades_campo = tags.most_common()
    textos: Dict[str, List[str]] = {}
    for ln in lineas:
        if ln.observacion and ln.observacion.strip():
            textos.setdefault(_norma(ln.observacion), []).append(ln.observacion.strip())
    r.observaciones = sorted(((Counter(v).most_common(1)[0][0], len(v)) for v in textos.values()),
                             key=lambda x: -x[1])[:12]
    return r


def _periodo(desde: Optional[date], hasta: Optional[date]):
    d = datetime.combine(desde, datetime.min.time()) if desde else None
    h = datetime.combine(hasta, datetime.max.time()) if hasta else None
    return d, h


async def _armar(db: AsyncSession, desde, hasta, activo_ids):
    from app.core.informe_flota_pdf import resumir
    from app.core.neumaticos_flota import reglas, umbrales
    from app.core.neumaticos_novedades import novedades, sugerencias
    d, h = _periodo(desde, hasta)
    flota, lineas = await flota_lite(db, d, h, activo_ids)
    u = await umbrales(db)
    rs = await reglas(db, solo_activas=True)

    def calcular():
        llantas = [ll for v in flota for ll in v.llantas]
        nov = novedades(llantas, u)
        sug = sugerencias(llantas, rs, u)
        return nov, sug, _completar(resumir(flota, nov, sug, u), lineas)
    nov, sug, r = await asyncio.to_thread(calcular)
    return flota, lineas, nov, sug, r, u


@router.get("/informe")
async def informe(desde: Optional[date] = None, hasta: Optional[date] = None,
                  activo_ids: Optional[List[int]] = Query(None), db: AsyncSession = Depends(get_db)):
    """El informe TittanLite en datos, para la pantalla."""
    from app.core.informe_flota_pdf import estado_de
    flota, lineas, nov, sug, r, u = await _armar(db, desde, hasta, activo_ids)
    sync = Counter(ln.sync_estado for ln in lineas)
    return {
        "vehiculos": r.vehiculos_inspeccionados, "llantas": r.llantas_inspeccionadas,
        "profundidad_promedio": r.profundidad_promedio, "bajo_minimo": r.bajo_minimo, "ir": r.ir,
        "novedades": r.novedades, "llantas_con_novedad": r.llantas_con_novedad,
        "por_estado": r.por_estado, "por_marca": r.por_marca, "por_dimension": r.por_dimension,
        "por_vida": r.por_vida, "por_referencia": r.por_referencia,
        "por_novedad": [(nombre, c) for _, nombre, c, _ in r.por_novedad if c],
        "novedades_campo": r.novedades_campo, "observaciones": r.observaciones,
        "sincronizacion": dict(sync),
        "umbrales": {"profundidad_minima": u.profundidad_minima, "margen_alerta": u.margen_alerta},
        "por_vehiculo": [{
            "activo_id": v.activo_id, "placa": v.placa or v.codigo, "tipo": v.tipo, "fecha": v.ultima_inspeccion,
            "posiciones": [{"codigo": p.codigo, "label": p.label, "eje": p.eje, "lado": p.lado,
                            "llanta": {"codigo": p.llanta.codigo, "marca": p.llanta.marca, "referencia": p.llanta.referencia,
                                       "medida": p.llanta.medida, "vida": p.llanta.vida, "pmin": p.llanta.pmin,
                                       "presion": p.llanta.presion, "estado": estado_de(p.llanta.pmin, u),
                                       "novedades": [n.texto for n in nov.get(p.llanta.neumatico_id, [])]}
                            if p.llanta else None} for p in v.posiciones],
        } for v in flota],
    }


async def informe_pdf_bytes(db: AsyncSession, desde, hasta, activo_ids, quien: str) -> bytes:
    from app.api.v1.endpoints.eam_neumaticos_tableros import _empresa
    from app.core.informe_flota_cola import periodo_texto
    from app.core.informe_flota_pdf import Encabezado, generar
    flota, lineas, nov, sug, r, u = await _armar(db, desde, hasta, activo_ids)
    if not flota:
        raise HTTPException(404, "No hay inspecciones de TittanLite en el periodo")
    empresa, logo = await _empresa(db)
    fotos = await _fotos_informe(db, lineas, desde, hasta)
    enc = Encabezado(empresa=empresa, periodo=periodo_texto({"desde": desde.isoformat() if desde else None,
                                                                "hasta": hasta.isoformat() if hasta else None}),
                     generado_por=quien, generado_en=datetime.now(), logo=logo)
    return await asyncio.to_thread(generar, flota, nov, sug, r, u, enc, "Informe TittanLite de llantas", fotos)


async def _fotos_informe(db: AsyncSession, lineas, desde, hasta) -> Dict[str, Any]:
    """Las fotos para el PDF: por vehículo (de sus llantas inspeccionadas) y las
    de las disposiciones del periodo. Rutas locales con su rótulo."""
    raiz = Path(settings.UPLOAD_DIR)
    insp = {i.id: i for i in (await db.execute(select(LiteInspeccion).where(
        LiteInspeccion.id.in_({ln.inspeccion_id for ln in lineas} or {0})))).scalars()}
    por_linea = {ln.id: ln for ln in lineas}
    salida: Dict[str, Any] = {"vehiculos": {}, "disposiciones": []}
    if por_linea:
        for f in (await db.execute(select(LiteFoto).where(LiteFoto.inspeccion_llanta_id.in_(list(por_linea)))
                                   .order_by(LiteFoto.id))).scalars():
            ln = por_linea[f.inspeccion_llanta_id]
            ruta = raiz / f.archivo
            if ruta.is_file():
                salida["vehiculos"].setdefault(insp[ln.inspeccion_id].activo_id, []).append(
                    (str(ruta), f"{ln.posicion or ''} · {ln.codigo or 's/c'} · {f.tipo.title()}"))
    q = select(LiteDisposicion)
    d0, h0 = _periodo(desde, hasta)
    if d0:
        q = q.where(LiteDisposicion.fecha >= d0)
    if h0:
        q = q.where(LiteDisposicion.fecha <= h0)
    disps = (await db.execute(q.order_by(LiteDisposicion.fecha))).scalars().all()
    if disps:
        danos = {d.id: f"{d.codigo} · {d.nombre}" for d in (await db.execute(select(EAMDanoNeumaticoCatalogo))).scalars()}
        fotos_d: Dict[int, List[tuple]] = {}
        for f in (await db.execute(select(LiteFoto).where(LiteFoto.disposicion_id.in_([d.id for d in disps]))
                                   .order_by(LiteFoto.id))).scalars():
            if (raiz / f.archivo).is_file():
                fotos_d.setdefault(f.disposicion_id, []).append((str(raiz / f.archivo), f.tipo.title()))
        for d in disps:
            prof = [x for x in (d.profundidad_externa, d.profundidad_central, d.profundidad_interna) if x is not None]
            salida["disposiciones"].append({
                "titulo": f"Llanta {d.codigo} · {d.marca or ''} {d.referencia or ''} {d.medida or ''}".strip(),
                "detalle": " · ".join(x for x in [f"{d.fecha:%d/%m/%Y}", danos.get(d.dano_id),
                                                  f"Prof. mín. {min(prof):g} mm" if prof else None,
                                                  d.observaciones] if x),
                "fotos": fotos_d.get(d.id, [])})
    return salida


@router.get("/informe/pdf")
async def informe_pdf(desde: Optional[date] = None, hasta: Optional[date] = None,
                      activo_ids: Optional[List[int]] = Query(None), db: AsyncSession = Depends(get_db),
                      usuario: Usuario = Depends(get_current_user)):
    contenido = await informe_pdf_bytes(db, desde, hasta, activo_ids, _quien(usuario))
    return Response(contenido, media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="tittanlite-{date.today():%Y%m%d}.pdf"',
        "Access-Control-Expose-Headers": "Content-Disposition"})


async def informe_excel_bytes(db: AsyncSession, desde, hasta, activo_ids) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    from app.core.informe_flota_pdf import estado_de
    flota, lineas, nov, sug, r, u = await _armar(db, desde, hasta, activo_ids)
    if not flota:
        raise HTTPException(404, "No hay inspecciones de TittanLite en el periodo")
    placas = {v.activo_id: v.placa or v.codigo for v in flota}
    insp = {i.id: i for i in (await db.execute(select(LiteInspeccion).where(
        LiteInspeccion.id.in_({ln.inspeccion_id for ln in lineas} or {0})))).scalars()}

    def construir() -> bytes:
        libro = Workbook()
        h = libro.active
        h.title = "Resumen"
        negrita, titulo = Font(bold=True), Font(bold=True, size=13)
        h.append(["Informe TittanLite de llantas"]); h["A1"].font = titulo
        h.append([f"Periodo: {desde or 'inicio'} a {hasta or 'hoy'}"])
        h.append([])
        for etiqueta, valor in (("Vehículos inspeccionados", r.vehiculos_inspeccionados),
                                ("Llantas inspeccionadas", r.llantas_inspeccionadas),
                                ("Profundidad promedio (mm)", r.profundidad_promedio),
                                ("Bajo el mínimo", r.bajo_minimo), ("Novedades", r.novedades)):
            h.append([etiqueta, valor])
        for nombre, filas in (("Estado", r.por_estado), ("Marca", r.por_marca), ("Dimensión", r.por_dimension),
                              ("Vida", r.por_vida), ("Referencia", r.por_referencia),
                              ("Novedades calculadas", [(n, c) for _, n, c, _ in r.por_novedad if c]),
                              ("Novedades de campo", r.novedades_campo), ("Observaciones recurrentes", r.observaciones)):
            h.append([]); h.append([nombre, "Cantidad", "%"])
            for c in h[h.max_row]:
                c.font = negrita
            total = sum(x[1] for x in filas) or 1
            for valor, cant in filas:
                h.append([valor, cant, round(100 * cant / total, 1)])
        h.column_dimensions["A"].width = 46
        d = libro.create_sheet("Llantas")
        enc = ["Fecha", "Placa", "Posición", "Código", "Marca", "Referencia", "Medida", "Vida", "Prof. interna",
               "Prof. central", "Prof. externa", "Prof. mínima", "Estado", "Presión", "Novedades", "Observación",
               "Sincronización", "Motivo"]
        d.append(enc)
        for c in d[1]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = PatternFill("solid", fgColor="1F4E79")
        for ln in lineas:
            i = insp.get(ln.inspeccion_id)
            prof = [x for x in (ln.profundidad_interna, ln.profundidad_central, ln.profundidad_externa) if x is not None]
            pmin = min(prof) if prof else None
            d.append([i.fecha.strftime("%Y-%m-%d") if i else None, placas.get(i.activo_id) if i else None, ln.posicion,
                      ln.codigo, ln.marca, ln.referencia, ln.medida,
                      "VN" if not ln.reencauches else f"R{ln.reencauches}", ln.profundidad_interna,
                      ln.profundidad_central, ln.profundidad_externa, pmin, estado_de(pmin, u), ln.presion,
                      ", ".join(NOVEDADES_CAMPO.get(n, n) for n in (ln.novedades or [])), ln.observacion,
                      ln.sync_estado, ln.sync_motivo])
        for col, ancho in zip("ABCDEFGHIJKLMNOPQR", (11, 10, 12, 12, 14, 14, 13, 6, 9, 9, 9, 9, 9, 8, 30, 36, 15, 50)):
            d.column_dimensions[col].width = ancho
        d.freeze_panes = "A2"
        b = io.BytesIO()
        libro.save(b)
        return b.getvalue()
    return await asyncio.to_thread(construir)


@router.get("/informe/excel")
async def informe_excel(desde: Optional[date] = None, hasta: Optional[date] = None,
                        activo_ids: Optional[List[int]] = Query(None), db: AsyncSession = Depends(get_db)):
    contenido = await informe_excel_bytes(db, desde, hasta, activo_ids)
    return Response(contenido, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="tittanlite-{date.today():%Y%m%d}.xlsx"',
                             "Access-Control-Expose-Headers": "Content-Disposition"})


# ─── Reportería TittanLite: tablero y exportaciones masivas ───────────────────
#
# Todo sale por SQL agregado o en tuplas, nunca en objetos ORM: con meses de
# inspecciones son decenas de miles de líneas, y cargarlas como objetos es lo
# que tumba a los workers (ver core/paginacion.py).

_FILTRO_FECHA = ("(CAST(:d AS timestamp) IS NULL OR i.fecha >= :d) "
                 "AND (CAST(:h AS timestamp) IS NULL OR i.fecha <= :h)")
_PMIN = "LEAST(ln.profundidad_externa, ln.profundidad_central, ln.profundidad_interna)"
# Las novedades se guardan como lista JSON, pero hay filas con `null` JSON: se
# tratan como lista vacía (jsonb_array_length falla con un escalar).
_NOV = ("(CASE WHEN jsonb_typeof(CAST(ln.novedades AS jsonb)) = 'array' "
        "THEN CAST(ln.novedades AS jsonb) ELSE '[]'::jsonb END)")
# Mismas claves en todas las tablas que comparten la dimensión (el filtro cruzado
# las une por nombre).
def _marca(expr: str) -> str:
    """La marca como la tiene el catálogo («BF Goodrich» = «BFGOODRICH» = «bf goodrich»):
    en Lite se escribe a mano, y sin esto cada variante salía como otra marca."""
    clave = "LOWER(REGEXP_REPLACE({}, '[[:space:]]', '', 'g'))"
    return (f"UPPER(COALESCE((SELECT mc.nombre FROM eam_marca_neumatico mc WHERE mc.ambito = 'LLANTA' "
            f"AND {clave.format('mc.nombre')} = {clave.format(expr)} ORDER BY mc.activo DESC, mc.id LIMIT 1), "
            f"TRIM({expr}), 'SIN MARCA'))")


_DIM_LLANTA = f"""
    {_marca("COALESCE(NULLIF(TRIM(ln.marca), ''), n.marca)")} AS marca,
    COALESCE(UPPER(REPLACE(COALESCE(NULLIF(TRIM(ln.medida), ''), n.medida), ' ', '')), 'SIN MEDIDA') AS medida,
    'V' || LEAST(COALESCE(ln.reencauches, n.reencauches, 0), 9) AS vida,
    CASE WHEN {_PMIN} IS NULL THEN 'R99'
         ELSE 'R' || LPAD(CAST(CAST(LEAST(FLOOR({_PMIN} / 2), 8) AS int) AS text), 2, '0') END AS rango,
    CASE WHEN {_PMIN} IS NULL THEN 'Sin medir' WHEN {_PMIN} <= :minimo THEN 'Crítico'
         WHEN {_PMIN} <= :regular THEN 'Regular' ELSE 'Bueno' END AS estado,
    COALESCE(a.tipo_activo, 'SIN TIPO') AS tipo_vehiculo"""


def _parametros(desde, hasta, u) -> Dict[str, Any]:
    d, h = _periodo(desde, hasta)
    return {"d": d, "h": h, "minimo": u.profundidad_minima, "regular": u.profundidad_minima + u.margen_alerta}


def _tabla(r) -> Dict[str, Any]:
    return {"columnas": list(r.keys()), "filas": [list(f) for f in r.all()]}


@router.get("/tablero/modelo")
async def tablero_modelo(desde: Optional[date] = None, hasta: Optional[date] = None,
                         db: AsyncSession = Depends(get_db)):
    """Los hechos del tablero TittanLite, ya agrupados por las dimensiones que se
    filtran en el navegador:

      * piso: las llantas de la ÚLTIMA inspección Lite de cada vehículo en el
        periodo (lo que hay montado según campo), por marca, medida, vida,
        rango de profundidad, estado, tipo de vehículo y si tiene novedad.
      * inspecciones: todas las del periodo, por mes, inspector y tipo.
      * novedades: lo marcado en campo en las llantas a piso.
      * desechos: las disposiciones finales registradas en Lite.
    """
    from sqlalchemy import text
    from app.core.neumaticos_flota import umbrales
    u = await umbrales(db)
    p = _parametros(desde, hasta, u)
    ultima = f"""
        WITH ult AS (
            SELECT DISTINCT ON (i.activo_id) i.id, i.activo_id FROM eam_lite_inspeccion i
            WHERE {_FILTRO_FECHA} ORDER BY i.activo_id, i.fecha DESC, i.id DESC),
        l AS (
            SELECT ln.presion, ln.novedades, {_DIM_LLANTA}, {_PMIN} AS pmin,
                   CASE WHEN jsonb_array_length({_NOV}) > 0 THEN 'Con novedad' ELSE 'Sin novedad' END AS novedad
            FROM ult JOIN eam_lite_inspeccion_llanta ln ON ln.inspeccion_id = ult.id
            JOIN eam_activo a ON a.id = ult.activo_id
            LEFT JOIN eam_neumatico n ON n.id = COALESCE(ln.neumatico_id,
                (SELECT n2.id FROM eam_neumatico n2 WHERE n2.codigo = ln.codigo LIMIT 1))
            WHERE NOT jsonb_exists({_NOV}, 'SIN_LLANTA'))"""
    piso = await db.execute(text(f"""{ultima}
        SELECT marca, medida, vida, rango, estado, tipo_vehiculo, novedad,
               COUNT(*) AS n, COALESCE(SUM(pmin), 0) AS mm, COUNT(pmin) AS n_mm,
               COUNT(*) FILTER (WHERE pmin <= :minimo) AS criticas,
               COALESCE(SUM(presion), 0) AS psi, COUNT(presion) AS n_psi
        FROM l GROUP BY 1, 2, 3, 4, 5, 6, 7"""), p)
    novedades = await db.execute(text(f"""{ultima}
        SELECT x.novedad AS tipo_novedad, marca, medida, vida, rango, estado, tipo_vehiculo, COUNT(*) AS n
        FROM l CROSS JOIN LATERAL jsonb_array_elements_text(
            CASE WHEN jsonb_typeof(CAST(l.novedades AS jsonb)) = 'array' THEN CAST(l.novedades AS jsonb)
                 ELSE '[]'::jsonb END) AS x(novedad)
        GROUP BY 1, 2, 3, 4, 5, 6, 7"""), p)
    inspecciones = await db.execute(text(f"""
        SELECT to_char(i.fecha, 'YYYY-MM') AS mes,
               COALESCE(NULLIF(TRIM(i.inspector), ''), 'Sin inspector') AS inspector,
               COALESCE(a.tipo_activo, 'SIN TIPO') AS tipo_vehiculo,
               COUNT(DISTINCT i.id) AS inspecciones, COUNT(DISTINCT i.activo_id) AS vehiculos,
               COUNT(ln.id) AS llantas,
               COUNT(ln.id) FILTER (WHERE {_PMIN} <= :minimo) AS criticas,
               COUNT(ln.id) FILTER (WHERE ln.sync_estado = 'SINCRONIZADA') AS sincronizadas
        FROM eam_lite_inspeccion i JOIN eam_activo a ON a.id = i.activo_id
        LEFT JOIN eam_lite_inspeccion_llanta ln ON ln.inspeccion_id = i.id
        WHERE {_FILTRO_FECHA} GROUP BY 1, 2, 3"""), p)
    desechos = await db.execute(text(f"""
        SELECT to_char(ln.fecha, 'YYYY-MM') AS mes,
               COALESCE(dc.codigo || ' · ' || dc.nombre, 'Sin daño') AS dano,
               COALESCE(NULLIF(TRIM(dc.causa), ''), 'Sin causa') AS causa,
               {_marca("NULLIF(TRIM(ln.marca), '')")} AS marca,
               COALESCE(UPPER(REPLACE(NULLIF(TRIM(ln.medida), ''), ' ', '')), 'SIN MEDIDA') AS medida,
               'V' || LEAST(COALESCE(ln.reencauches, 0), 9) AS vida,
               CASE WHEN {_PMIN} IS NULL THEN 'R99'
                    ELSE 'R' || LPAD(CAST(CAST(LEAST(FLOOR({_PMIN} / 2), 8) AS int) AS text), 2, '0') END AS rango,
               COUNT(*) AS n, COALESCE(SUM({_PMIN}), 0) AS mm, COUNT({_PMIN}) AS n_mm
        FROM eam_lite_disposicion ln LEFT JOIN eam_dano_neumatico_catalogo dc ON dc.id = ln.dano_id
        WHERE (CAST(:d AS timestamp) IS NULL OR ln.fecha >= :d) AND (CAST(:h AS timestamp) IS NULL OR ln.fecha <= :h)
        GROUP BY 1, 2, 3, 4, 5, 6, 7"""), p)
    nov = _tabla(novedades)
    i_tipo = nov["columnas"].index("tipo_novedad")
    for f in nov["filas"]:
        f[i_tipo] = NOVEDADES_CAMPO.get(f[i_tipo], f[i_tipo])
    return {"piso": _tabla(piso), "novedades": nov, "inspecciones": _tabla(inspecciones),
            "desechos": _tabla(desechos),
            "umbrales": {"profundidad_minima": u.profundidad_minima, "margen_alerta": u.margen_alerta}}


@router.get("/desechos/modelo")
async def desechos_modelo(desde: Optional[date] = None, hasta: Optional[date] = None,
                          db: AsyncSession = Depends(get_db)):
    """La pila de desecho de TittanLite para su tablero: una tabla de hechos ya
    agrupada por todas las dimensiones que se filtran en el navegador (daño y
    su clasificación del catálogo, marca, medida, vida, profundidad, mes,
    inspector y sincronización)."""
    from sqlalchemy import text
    from app.core.neumaticos_flota import umbrales
    u = await umbrales(db)
    p = _parametros(desde, hasta, u)
    r = await db.execute(text(f"""
        SELECT to_char(ln.fecha, 'YYYY-MM') AS mes,
               COALESCE(NULLIF(TRIM(ln.inspector), ''), 'Sin inspector') AS inspector,
               COALESCE(dc.codigo || ' · ' || dc.nombre, 'Sin daño') AS dano,
               COALESCE(NULLIF(TRIM(dc.ubicacion), ''), 'Sin dato') AS ubicacion,
               COALESCE(NULLIF(TRIM(dc.categoria), ''), 'Sin dato') AS categoria,
               COALESCE(NULLIF(TRIM(dc.causa), ''), 'Sin causa') AS causa,
               COALESCE(NULLIF(TRIM(dc.motivo), ''), 'Sin dato') AS motivo,
               COALESCE(NULLIF(TRIM(dc.responsable), ''), 'Sin dato') AS responsable,
               {_marca("COALESCE(NULLIF(TRIM(ln.marca), ''), n.marca)")} AS marca,
               COALESCE(UPPER(REPLACE(COALESCE(NULLIF(TRIM(ln.medida), ''), n.medida), ' ', '')), 'SIN MEDIDA') AS medida,
               'V' || LEAST(COALESCE(ln.reencauches, n.reencauches, 0), 9) AS vida,
               CASE WHEN {_PMIN} IS NULL THEN 'R99'
                    ELSE 'R' || LPAD(CAST(CAST(LEAST(FLOOR({_PMIN} / 2), 8) AS int) AS text), 2, '0') END AS rango,
               CASE WHEN ln.sync_estado = 'SINCRONIZADA' THEN 'En TittanWare' ELSE 'Solo en Lite' END AS sincronizacion,
               COUNT(*) AS n, COALESCE(SUM({_PMIN}), 0) AS mm, COUNT({_PMIN}) AS n_mm,
               COALESCE(SUM(GREATEST({_PMIN} - :minimo, 0)), 0) AS mm_desp,
               COUNT(*) FILTER (WHERE COALESCE(ln.reparaciones, 0) > 0) AS reparadas,
               COALESCE(SUM(ln.reparaciones), 0) AS reparaciones,
               COUNT(*) FILTER (WHERE ln.regrabada) AS regrabadas,
               COUNT(*) FILTER (WHERE {_PMIN} > :regular) AS con_labrado
        FROM eam_lite_disposicion ln
        LEFT JOIN eam_dano_neumatico_catalogo dc ON dc.id = ln.dano_id
        LEFT JOIN eam_neumatico n ON n.id = (SELECT n2.id FROM eam_neumatico n2 WHERE n2.codigo = ln.codigo LIMIT 1)
        WHERE (CAST(:d AS timestamp) IS NULL OR ln.fecha >= :d) AND (CAST(:h AS timestamp) IS NULL OR ln.fecha <= :h)
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13"""), p)
    return {"desechos": _tabla(r),
            "umbrales": {"profundidad_minima": u.profundidad_minima, "margen_alerta": u.margen_alerta}}


def _libro_xlsx(hojas: List[tuple]) -> bytes:
    """Libro en modo de solo escritura (no guarda las celdas en memoria): aguanta
    cientos de miles de filas. Cada hoja: (título, encabezados, filas, anchos)."""
    from openpyxl import Workbook
    from openpyxl.cell import WriteOnlyCell
    from openpyxl.styles import Font, PatternFill
    libro = Workbook(write_only=True)
    for titulo, encabezados, filas, anchos in hojas:
        h = libro.create_sheet(titulo[:31])
        for i, ancho in enumerate(anchos):
            h.column_dimensions[chr(65 + i) if i < 26 else "A" + chr(65 + i - 26)].width = ancho
        h.freeze_panes = "A2"
        cab = []
        for e in encabezados:
            c = WriteOnlyCell(h, value=e)
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = PatternFill("solid", fgColor="1F4E79")
            cab.append(c)
        h.append(cab)
        for f in filas:
            h.append(list(f))
    b = io.BytesIO()
    libro.save(b)
    return b.getvalue()


def _respuesta_xlsx(contenido: bytes, nombre: str) -> Response:
    return Response(contenido, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="{nombre}"',
                             "Access-Control-Expose-Headers": "Content-Disposition"})


def _vida(r) -> str:
    return "VN" if not r else f"R{r}"


async def inspecciones_excel_bytes(db: AsyncSession, desde, hasta) -> bytes:
    """TODAS las llantas de TODAS las inspecciones Lite del periodo (no solo la
    última por vehículo), una fila por llanta."""
    from sqlalchemy import text
    from app.core.neumaticos_flota import umbrales
    u = await umbrales(db)
    p = _parametros(desde, hasta, u)
    filas = (await db.execute(text(f"""
        SELECT i.fecha, COALESCE(a.placa, a.codigo), a.codigo, a.tipo_activo, i.odometro, i.inspector,
               ln.posicion, ln.codigo, COALESCE(NULLIF(TRIM(ln.marca), ''), n.marca),
               COALESCE(NULLIF(TRIM(ln.referencia), ''), n.referencia), COALESCE(NULLIF(TRIM(ln.medida), ''), n.medida),
               COALESCE(ln.reencauches, n.reencauches),
               ln.profundidad_externa, ln.profundidad_central, ln.profundidad_interna, {_PMIN},
               CASE WHEN {_PMIN} IS NULL THEN NULL WHEN {_PMIN} <= :minimo THEN 'Crítico'
                    WHEN {_PMIN} <= :regular THEN 'Regular' ELSE 'Bueno' END,
               ln.presion, ln.novedades, ln.observacion,
               (SELECT COUNT(*) FROM eam_lite_foto f WHERE f.inspeccion_llanta_id = ln.id),
               ln.sync_estado, ln.sync_motivo, i.observaciones, i.id
        FROM eam_lite_inspeccion i JOIN eam_activo a ON a.id = i.activo_id
        JOIN eam_lite_inspeccion_llanta ln ON ln.inspeccion_id = i.id
        LEFT JOIN eam_neumatico n ON n.id = COALESCE(ln.neumatico_id,
            (SELECT n2.id FROM eam_neumatico n2 WHERE n2.codigo = ln.codigo LIMIT 1))
        WHERE {_FILTRO_FECHA}
        ORDER BY i.fecha, i.id, ln.posicion"""), p)).all()
    if not filas:
        raise HTTPException(404, "No hay inspecciones de TittanLite en el periodo")
    sync = {"SINCRONIZADA": "En TittanWare", "PARCIAL": "Parcial", "RECHAZADA": "Solo en Lite (rechazada)",
            "SIN_SEGUIMIENTO": "Solo en Lite", "PENDIENTE": "Pendiente"}

    def construir() -> bytes:
        datos = []
        for f in filas:
            nov = f[18] if isinstance(f[18], list) else []
            datos.append([f[0].strftime("%Y-%m-%d"), f[0].strftime("%H:%M"), f[1], f[2], f[3], f[4], f[5], f[6], f[7],
                          f[8], f[9], f[10], _vida(f[11]), f[12], f[13], f[14], f[15], f[16], f[17],
                          ", ".join(NOVEDADES_CAMPO.get(x, x) for x in nov), f[19], f[20],
                          sync.get(f[21], f[21]), f[22], f[23], f[24]])
        return _libro_xlsx([(
            "Inspecciones",
            ["Fecha", "Hora", "Placa", "Código vehículo", "Tipo de vehículo", "Odómetro", "Inspector", "Posición",
             "Código llanta", "Marca", "Referencia", "Medida", "Vida", "Prof. externa", "Prof. central",
             "Prof. interna", "Prof. mínima", "Estado", "Presión (psi)", "Novedades", "Observación", "Fotos",
             "Sincronización", "Motivo", "Observaciones generales", "N.º inspección"],
            datos, [11, 7, 10, 13, 13, 11, 22, 12, 13, 14, 14, 13, 6, 9, 9, 9, 9, 9, 9, 30, 34, 6, 18, 44, 34, 10])])
    return await asyncio.to_thread(construir)


async def desechos_excel_bytes(db: AsyncSession, desde, hasta) -> bytes:
    """La pila de desecho registrada en Lite: una fila por llanta desechada, con
    el daño del catálogo, y un resumen por daño, causa y marca."""
    from sqlalchemy import text
    d, h = _periodo(desde, hasta)
    filas = (await db.execute(text(f"""
        SELECT ln.fecha, ln.codigo, COALESCE(a.placa, a.codigo), ln.marca, ln.referencia, ln.medida, ln.dot,
               ln.reencauches, dc.codigo, dc.nombre, dc.ubicacion, dc.categoria, dc.causa, dc.motivo, dc.responsable,
               ln.profundidad_externa, ln.profundidad_central, ln.profundidad_interna, {_PMIN},
               ln.reparaciones, ln.regrabada, ln.diseno_reencauche, ln.ubicacion_actual, ln.observaciones,
               ln.inspector, (SELECT COUNT(*) FROM eam_lite_foto f WHERE f.disposicion_id = ln.id),
               ln.sync_estado, ln.sync_motivo
        FROM eam_lite_disposicion ln
        LEFT JOIN eam_dano_neumatico_catalogo dc ON dc.id = ln.dano_id
        LEFT JOIN eam_activo a ON a.id = ln.activo_id
        WHERE (CAST(:d AS timestamp) IS NULL OR ln.fecha >= :d) AND (CAST(:h AS timestamp) IS NULL OR ln.fecha <= :h)
        ORDER BY ln.fecha, ln.id"""), {"d": d, "h": h})).all()
    if not filas:
        raise HTTPException(404, "No hay llantas desechadas en TittanLite en el periodo")
    sync = {"SINCRONIZADA": "En TittanWare", "RECHAZADA": "Solo en Lite (rechazada)",
            "SIN_SEGUIMIENTO": "Solo en Lite", "PENDIENTE": "Pendiente"}

    def construir() -> bytes:
        detalle = [[f[0].strftime("%Y-%m-%d"), f[1], f[2], f[3], f[4], f[5], f[6], _vida(f[7]), f[8], f[9], f[10],
                    f[11], f[12], f[13], f[14], f[15], f[16], f[17], f[18], f[19], "Sí" if f[20] else "No", f[21],
                    f[22], f[23], f[24], f[25], sync.get(f[26], f[26]), f[27]] for f in filas]
        total = len(filas)

        def resumen(indice, nombre):
            c = Counter((f[indice] or f"Sin {nombre.lower()}") if not isinstance(indice, tuple)
                        else " · ".join(x for x in (f[indice[0]], f[indice[1]]) if x) or "Sin daño" for f in filas)
            return [[k, v, round(100 * v / total, 1)] for k, v in c.most_common()]
        bloques = []
        for nombre, filas_r in (("Daño", resumen((8, 9), "Daño")), ("Causa", resumen(12, "Causa")),
                                ("Ubicación del daño", resumen(10, "Ubicación")), ("Marca", resumen(3, "Marca")),
                                ("Medida", resumen(5, "Medida"))):
            bloques += [[nombre.upper(), "Llantas", "%"], *filas_r, []]
        return _libro_xlsx([
            ("Pila de desecho",
             ["Fecha", "Código llanta", "Vehículo", "Marca", "Referencia", "Medida", "DOT", "Vida", "Cód. daño", "Daño",
              "Ubicación del daño", "Avería", "Causa", "Motivo", "Responsable", "Prof. externa", "Prof. central",
              "Prof. interna", "Prof. mínima", "Reparaciones", "Regrabada", "Diseño reencauche", "Dónde está la carcasa",
              "Observaciones", "Inspector", "Fotos", "Sincronización", "Motivo de sincronización"],
             detalle, [11, 13, 10, 14, 14, 13, 8, 6, 9, 30, 18, 22, 24, 18, 14, 9, 9, 9, 9, 8, 8, 16, 22, 34, 20, 6, 18, 40]),
            ("Resumen", [f"Llantas desechadas: {total}", "", ""], bloques, [40, 10, 8]),
        ])
    return await asyncio.to_thread(construir)


@router.get("/exportar/inspecciones")
async def exportar_inspecciones(desde: Optional[date] = None, hasta: Optional[date] = None,
                                db: AsyncSession = Depends(get_db)):
    return _respuesta_xlsx(await inspecciones_excel_bytes(db, desde, hasta),
                           f"tittanlite-inspecciones-{date.today():%Y%m%d}.xlsx")


@router.get("/exportar/desechos")
async def exportar_desechos(desde: Optional[date] = None, hasta: Optional[date] = None,
                            db: AsyncSession = Depends(get_db)):
    return _respuesta_xlsx(await desechos_excel_bytes(db, desde, hasta),
                           f"tittanlite-pila-desecho-{date.today():%Y%m%d}.xlsx")
