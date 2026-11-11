"""
Disposición final de llantas: el examen de la carcasa que se desecha.

Cada registro cuelga de una llanta que queda dada de baja. Si la llanta tenía
seguimiento, la disposición hace la baja con el mismo movimiento de siempre
(cierra su vida, valida fechas y lecturas); si no existía —llantas históricas,
o de una flota que apenas se empieza a seguir— se crea ya dada de baja con lo
que se sabe de ella. Así la pila de desechos, el historial de la llanta y los
indicadores cuentan lo mismo.

El daño sale del catálogo de la cuenta, que clasifica cada código por ubicación,
avería, causa, motivo y responsable. Las fotos (número, daño, banda) quedan en la
llanta y se ven en su historial.
"""
import hashlib
import io
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.paginacion import contar, poner_total
from app.core.tenant import ESQUEMA_POR_DEFECTO, esquema_actual
from app.infrastructure.models.eam import (
    EAMDanoNeumaticoCatalogo as Dano, EAMNeumatico, EAMNeumaticoDisposicion as Disp, EAMNeumaticoFoto as Foto,
)
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/eam/neumaticos/disposicion", tags=["CMMS/EAM · Neumáticos · Disposición final"])

TIPOS_FOTO = ("NUMERO", "DANO", "BANDA", "OTRA")
MAX_FOTO = 12 * 1024 * 1024


def _quien(u: Usuario) -> str:
    return (f"{u.nombre or ''} {u.apellido or ''}".strip() or u.username)[:100]


def _num(v) -> Optional[float]:
    if v in (None, ""):
        return None
    try:
        return float(str(v).replace(",", "."))
    except ValueError:
        raise ValueError(f"«{v}» no es un número")


# ─── Catálogo de referencia ───────────────────────────────────────────────────
# Los códigos de desecho más usados en Colombia (catálogo «Prodes»): código,
# ubicación, avería, causa, motivo y responsable. Se cargan a pedido, sin pisar
# lo que la cuenta ya tenga.
REFERENCIA = [
    ('A1-1', 'CARCASA', 'BAJA PRESION', 'MALA REPARACION PROPIA', 'MALA REPARACION', 'MTTO LLANTAS'),
    ('A1-2', 'CARCASA', 'BAJA PRESION', 'MALA REPARACION TERCERA (REENCAUCHE)', 'MALA REPARACION', 'TERCERO'),
    ('A1-3', 'CARCASA', 'BAJA PRESION', 'MALA REPARACION CALLEJERA', 'MALA REPARACION', 'FORTUITO'),
    ('A2', 'CARCASA', 'BAJA PRESION', 'IMPACTO O PERFORACION', 'DAÑO ACCIDENTAL', 'FORTUITO'),
    ('A3', 'CARCASA', 'BAJA PRESION', 'MAL SELLADO POR CALOR O PESTAÑA', 'CALOR', 'FORTUITO'),
    ('A4', 'CARCASA', 'BAJA PRESION', 'OPERACIÓN', 'OPERATIVO', 'FORTUITO'),
    ('B1', 'COSTADO', 'DESENVOLVIMIENTO DE VOLTEO', 'CALOR', 'CALOR', 'OPERADOR'),
    ('B2', 'COSTADO', 'DESENVOLVIMIENTO DE VOLTEO', 'BAJA PRESION', 'OPERATIVO', 'OPERADOR'),
    ('B3', 'COSTADO', 'DESENVOLVIMIENTO DE VOLTEO', 'SOBRECARGA', 'OPERATIVO', 'OPERADOR'),
    ('C1', 'COSTADO', 'GRIETA CIRCUNFERENCIAL ARRIBA DE LA PESTAÑA', 'CALOR', 'CALOR', 'OPERADOR'),
    ('C2', 'COSTADO', 'GRIETA CIRCUNFERENCIAL ARRIBA DE LA PESTAÑA', 'SOBRECARGA', 'OPERATIVO', 'OPERADOR'),
    ('D1', 'COSTADO', 'CORTE/ IMPACTO/ DESGASTE', 'ACCIDENTAL', 'DAÑO ACCIDENTAL', 'OPERADOR'),
    ('D2', 'COSTADO', 'CORTE/ IMPACTO/ DESGASTE', 'REPETITIVO', 'OPERATIVO', 'OPERADOR'),
    ('D3', 'COSTADO', 'CORTE/ IMPACTO/ DESGASTE', 'ELEMENTO FIJO DE VEHICULO O ELEMENTO ENTRE PACHAS',
     'DAÑO ACCIDENTAL', 'FORTUITO'),
    ('D4', 'COSTADO', 'CORTE/ IMPACTO/ DESGASTE', 'BAJA PRESION (CORTE TIPO CREMALLERA)', 'OPERATIVO', 'OPERADOR'),
    ('E1-1', 'COSTADO', 'SEPARACIÓN/ INFILTRACIÓN', 'MALA REPARACIÓN - PROPIA', 'MALA REPARACIÓN', 'MTTO LLANTAS'),
    ('E1-2', 'COSTADO', 'SEPARACIÓN/ INFILTRACIÓN', 'MALA REPARACIÓN - TERCERA (REENCAUCHE)', 'MALA REPARACIÓN',
     'TERCERO'),
    ('E1-3', 'COSTADO', 'SEPARACIÓN/ INFILTRACIÓN', 'MALA REPARACIÓN - CALLEJERA', 'MALA REPARACIÓN', 'FORTUITO'),
    ('E2', 'COSTADO', 'SEPARACIÓN/ INFILTRACIÓN', 'IMPACTO/ PERFORACIÓN', 'DAÑO ACCIDENTAL', 'FORTUITO'),
    ('E3', 'COSTADO', 'SEPARACIÓN/ INFILTRACIÓN', 'MAL SELLADO POR CALOR PESTAÑA', 'CALOR', 'FORTUITO'),
    ('F1', 'PESTAÑA', 'CRISTALIZACIÓN / PESTAÑA DAÑADA / DETERIORADA', 'CALOR', 'CALOR', 'OPERADOR'),
    ('F2', 'PESTAÑA', 'CRISTALIZACIÓN / PESTAÑA DAÑADA / DETERIORADA', 'MONTAJE', 'OPERATIVO', 'MTTO LLANTAS'),
    ('F3', 'PESTAÑA', 'CRISTALIZACIÓN / PESTAÑA DAÑADA / DETERIORADA', 'BAJA PRESIÓN', 'OPERATIVO', 'OPERADOR'),
    ('F4', 'PESTAÑA', 'CRISTALIZACIÓN / PESTAÑA DAÑADA / DETERIORADA', 'CONTACTO CON RIN', 'OPERATIVO',
     'MTTO LLANTAS'),
    ('G1', 'BANDA DE RODAMIENTO', 'DESGASTE', 'BLOQUEO POR PROBLEMAS MECANICOS', 'OPERATIVO', 'MTTO'),
    ('G2', 'BANDA DE RODAMIENTO', 'DESGASTE', 'EXCESIVO POR USO', 'OPERATIVO', 'OPERADOR'),
    ('G3', 'BANDA DE RODAMIENTO', 'DESGASTE', 'IRREGULAR POR PROBLEMAS MECANICOS O FALTA DE ROTACIÓN',
     'OPERATIVO', 'MTTO'),
    ('H1-1', 'BANDA DE RODAMIENTO', 'DESPRENDIMIENTO DE BANDA', 'MALA REPARACIÓN - PROPIA', 'MALA REPARACIÓN',
     'MTTO LLANTAS'),
    ('H1-2', 'BANDA DE RODAMIENTO', 'DESPRENDIMIENTO DE BANDA', 'MALA REPARACIÓN - TERCERA (REENCAUCHE)',
     'MALA REPARACIÓN', 'TERCERO'),
    ('H1-3', 'BANDA DE RODAMIENTO', 'DESPRENDIMIENTO DE BANDA', 'MALA REPARACIÓN - CALLEJERA', 'MALA REPARACIÓN',
     'FORTUITO'),
    ('H2', 'BANDA DE RODAMIENTO', 'DESPRENDIMIENTO DE BANDA', 'REENCAUCHE', 'GARANTÍA', 'TERCERO'),
    ('H3', 'BANDA DE RODAMIENTO', 'DESPRENDIMIENTO DE BANDA', 'IMPACTO', 'DAÑO ACCIDENTAL', 'FORTUITO'),
    ('I1-1', 'BANDA DE RODAMIENTO', 'CORTE/ IMPACTO/ PERFORACIÓN', 'MALA REPARACIÓN - PROPIA', 'MALA REPARACIÓN',
     'MTTO LLANTAS'),
    ('I1-2', 'BANDA DE RODAMIENTO', 'CORTE/ IMPACTO/ PERFORACIÓN', 'MALA REPARACIÓN - TERCERA (REENCAUCHE)',
     'MALA REPARACIÓN', 'TERCERO'),
    ('I1-3', 'BANDA DE RODAMIENTO', 'CORTE/ IMPACTO/ PERFORACIÓN', 'MALA REPARACIÓN - CALLEJERA',
     'MALA REPARACIÓN', 'FORTUITO'),
    ('I2', 'BANDA DE RODAMIENTO', 'CORTE/ IMPACTO/ PERFORACIÓN', 'ACCIDENTAL/ OBJETO/ PERFORACIÓN',
     'DAÑO ACCIDENTAL', 'FORTUITO'),
    ('I3', 'BANDA DE RODAMIENTO', 'CORTE/ IMPACTO/ PERFORACIÓN', 'HERIDAS CONTINUAS', 'DAÑO ACCIDENTAL', 'FORTUITO'),
    ('I4', 'BANDA DE RODAMIENTO', 'CORTE/ IMPACTO/ PERFORACIÓN', 'HERIDA FUERA DE LIMITE', 'DAÑO ACCIDENTAL',
     'FORTUITO'),
    ('F.C', 'FIN DE CICLO', 'FIN DE CICLO', 'FIN DE CICLO', 'FIN DE CICLO', 'FIN DE CICLO'),
    ('G.R', 'GARANTIA', 'GARANTIA', 'GARANTIA', 'GARANTIA', 'GARANTIA'),
]


def _severidad(motivo: str) -> str:
    return "LEVE" if motivo in ("FIN DE CICLO", "GARANTIA", "GARANTÍA") else "GRAVE"


@router.post("/catalogo-referencia")
async def cargar_catalogo_referencia(db: AsyncSession = Depends(get_db)):
    """Agrega los códigos de referencia que la cuenta no tenga. No modifica los
    que ya existen: si la cuenta personalizó un código, se respeta."""
    existentes = {c for (c,) in (await db.execute(select(Dano.codigo))).all()}
    nuevos = 0
    for codigo, ubic, averia, causa, motivo, resp in REFERENCIA:
        if codigo in existentes:
            continue
        nombre = averia if averia == causa else f"{averia.title()} – {causa.title()}"
        db.add(Dano(codigo=codigo, nombre=nombre[:150], ubicacion=ubic, categoria=averia, causa=causa,
                    motivo=motivo, responsable=resp, severidad=_severidad(motivo), accion="DESCARTE",
                    descripcion=(f"Daño en {ubic.lower()} que causó {averia.lower()} por {causa.lower()}, "
                                 f"motivo {motivo.lower()}; responsable {resp.lower()}")[:300], activo=True))
        nuevos += 1
    await db.commit()
    return {"agregados": nuevos, "ya_existian": len(REFERENCIA) - nuevos}


# ─── Registro ─────────────────────────────────────────────────────────────────

class DisposicionIn(BaseModel):
    # La llanta: por id, o por código (si no existe se crea dada de baja).
    neumatico_id: Optional[int] = None
    codigo: Optional[str] = None
    fecha: datetime
    dano_id: Optional[int] = None
    dano_codigo: Optional[str] = None
    profundidad_interna: Optional[float] = None
    profundidad_central: Optional[float] = None
    profundidad_externa: Optional[float] = None
    reparaciones: Optional[int] = None
    regrabada: bool = False
    diseno_reencauche: Optional[str] = None
    ubicacion_actual: Optional[str] = None
    rechazo: Optional[str] = None
    observaciones: Optional[str] = None
    km_odometro: Optional[float] = None
    motivo_fin_vida_id: Optional[int] = None
    # Solo si la llanta no existe todavía:
    marca: Optional[str] = None
    referencia: Optional[str] = None
    medida: Optional[str] = None
    dot: Optional[str] = None
    reencauches: Optional[int] = None
    origen: str = "TITTANWARE"


async def _dano(db: AsyncSession, dano_id: Optional[int], codigo: Optional[str]) -> Optional[Dano]:
    if dano_id:
        d = await db.get(Dano, dano_id)
        if not d:
            raise ValueError("Ese código de daño no existe en el catálogo")
        return d
    if codigo and str(codigo).strip():
        d = (await db.execute(select(Dano).where(func.upper(Dano.codigo) == str(codigo).strip().upper()))).scalar()
        if not d:
            # «GR» por «G.R», «e12» por «E1-2»: se compara sin puntuación.
            limpio = re.sub(r"[^A-Z0-9]", "", str(codigo).upper())
            for x in (await db.execute(select(Dano))).scalars():
                if re.sub(r"[^A-Z0-9]", "", (x.codigo or "").upper()) == limpio:
                    d = x
                    break
        if not d:
            raise ValueError(f"El código de daño «{codigo}» no está en el catálogo de la cuenta")
        return d
    return None


async def registrar(db: AsyncSession, data: DisposicionIn, quien: str) -> Disp:
    """Hace la baja (si hace falta) y guarda la disposición. Lanza ValueError con
    el motivo legible; el que llama decide si es un 4xx o un error de fila."""
    from app.api.v1.endpoints.eam import MovNeumaticoCreate, crear_movimiento_neumatico

    for k in ("profundidad_interna", "profundidad_central", "profundidad_externa"):
        v = getattr(data, k)
        if v is not None and (v < 0 or v > 40):
            raise ValueError("Las profundidades van de 0 a 40 mm")
    if data.reparaciones is not None and data.reparaciones < 0:
        raise ValueError("Las reparaciones no pueden ser negativas")
    if data.fecha.replace(tzinfo=None) > datetime.now():
        raise ValueError("La fecha no puede estar en el futuro")
    dano = await _dano(db, data.dano_id, data.dano_codigo)

    neu = None
    if data.neumatico_id:
        neu = await db.get(EAMNeumatico, data.neumatico_id)
        if not neu:
            raise ValueError("Esa llanta no existe")
    elif data.codigo and str(data.codigo).strip():
        neu = (await db.execute(select(EAMNeumatico).where(EAMNeumatico.codigo == str(data.codigo).strip()))).scalar()
    else:
        raise ValueError("Indique la llanta: su código o su id")

    if neu is not None:
        ya = (await db.execute(select(Disp.id).where(Disp.neumatico_id == neu.id))).scalar()
        if ya:
            raise ValueError(f"La llanta {neu.codigo} ya tiene su disposición final registrada")

    profundidades = [v for v in (data.profundidad_interna, data.profundidad_central, data.profundidad_externa)
                     if v is not None]
    if neu is None:
        # Llanta sin seguimiento: entra ya dada de baja con lo que se sabe.
        neu = EAMNeumatico(
            codigo=str(data.codigo).strip()[:50], marca=(data.marca or "").strip().upper() or None,
            referencia=(data.referencia or "").strip().upper() or None, medida=(data.medida or "").strip() or None,
            dot=(str(data.dot).strip() if data.dot not in (None, "") else None), reencauches=data.reencauches or 0,
            estado="BAJA", fecha_baja=data.fecha.date(), dano_id=dano.id if dano else None,
            motivo_baja=(data.observaciones or (dano.nombre if dano else None) or "Disposición final")[:255],
            motivo_fin_vida_id=data.motivo_fin_vida_id, es_usada=True,
            profundidad_actual=min(profundidades) if profundidades else None,
        )
        db.add(neu)
        await db.flush()
    elif neu.estado != "BAJA":
        try:
            await crear_movimiento_neumatico(MovNeumaticoCreate(
                neumatico_id=neu.id, tipo_movimiento="BAJA", fecha=data.fecha,
                dano_id=dano.id if dano else None, motivo_fin_vida_id=data.motivo_fin_vida_id,
                motivo=(data.observaciones or (dano.nombre if dano else None)), km_odometro=data.km_odometro,
                tecnico=quien), db=db)
        except HTTPException as e:
            raise ValueError(str(e.detail))
        await db.refresh(neu)
    elif dano is not None:
        neu.dano_id = dano.id      # ya estaba de baja: se le precisa el daño
    if profundidades:
        neu.profundidad_actual = min(profundidades)
        if data.profundidad_interna is not None:
            neu.profundidad_interna = data.profundidad_interna
        if data.profundidad_externa is not None:
            neu.profundidad_externa = data.profundidad_externa

    disp = Disp(neumatico_id=neu.id, fecha=data.fecha.replace(tzinfo=None), dano_id=dano.id if dano else neu.dano_id,
                profundidad_interna=data.profundidad_interna, profundidad_central=data.profundidad_central,
                profundidad_externa=data.profundidad_externa, reparaciones=data.reparaciones,
                regrabada=bool(data.regrabada), diseno_reencauche=(data.diseno_reencauche or None),
                ubicacion_actual=data.ubicacion_actual, rechazo=data.rechazo, observaciones=data.observaciones,
                origen=(data.origen or "TITTANWARE")[:20], registrado_por=quien)
    db.add(disp)
    await db.flush()
    return disp


async def _ficha(db: AsyncSession, d: Disp, con_fotos: bool = True) -> Dict[str, Any]:
    neu = await db.get(EAMNeumatico, d.neumatico_id)
    dano = await db.get(Dano, d.dano_id) if d.dano_id else None
    salida = {
        "id": d.id, "neumatico_id": d.neumatico_id, "fecha": d.fecha, "origen": d.origen,
        "codigo": neu.codigo if neu else None, "marca": neu.marca if neu else None,
        "referencia": neu.referencia if neu else None, "medida": neu.medida if neu else None,
        "dot": neu.dot if neu else None, "vida": (neu.reencauches or 0) if neu else None,
        "km_total": neu.km_total if neu else None,
        "dano_id": d.dano_id, "dano_codigo": dano.codigo if dano else None, "dano": dano.nombre if dano else None,
        "ubicacion_dano": dano.ubicacion if dano else None, "categoria": dano.categoria if dano else None,
        "causa": dano.causa if dano else None, "motivo": dano.motivo if dano else None,
        "responsable": dano.responsable if dano else None,
        "profundidad_interna": d.profundidad_interna, "profundidad_central": d.profundidad_central,
        "profundidad_externa": d.profundidad_externa, "reparaciones": d.reparaciones, "regrabada": d.regrabada,
        "diseno_reencauche": d.diseno_reencauche, "ubicacion_actual": d.ubicacion_actual, "rechazo": d.rechazo,
        "observaciones": d.observaciones, "registrado_por": d.registrado_por,
    }
    if con_fotos:
        salida["fotos"] = await _fotos(db, neumatico_id=d.neumatico_id)
    return salida


@router.post("", status_code=201)
async def crear_disposicion(data: DisposicionIn, db: AsyncSession = Depends(get_db),
                            usuario: Usuario = Depends(get_current_user)):
    try:
        disp = await registrar(db, data, _quien(usuario))
    except ValueError as e:
        await db.rollback()
        raise HTTPException(422, str(e))
    await db.commit()
    await db.refresh(disp)
    return await _ficha(db, disp)


@router.get("")
async def listar_disposiciones(
    respuesta: Response,
    desde: Optional[date] = None, hasta: Optional[date] = None,
    dano_id: Optional[int] = None, marca: Optional[str] = None,
    buscar: Optional[str] = Query(None, description="Código de llanta, marca, referencia o código de daño"),
    limite: int = Query(50, ge=1, le=500), desplazamiento: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    q = (select(Disp, EAMNeumatico, Dano)
         .join(EAMNeumatico, EAMNeumatico.id == Disp.neumatico_id)
         .outerjoin(Dano, Dano.id == Disp.dano_id))
    if desde:
        q = q.where(Disp.fecha >= datetime.combine(desde, datetime.min.time()))
    if hasta:
        q = q.where(Disp.fecha <= datetime.combine(hasta, datetime.max.time()))
    if dano_id:
        q = q.where(Disp.dano_id == dano_id)
    if marca:
        q = q.where(func.upper(func.trim(EAMNeumatico.marca)) == marca.strip().upper())
    if buscar and buscar.strip():
        p = f"%{buscar.strip()}%"
        q = q.where(or_(EAMNeumatico.codigo.ilike(p), EAMNeumatico.marca.ilike(p),
                        EAMNeumatico.referencia.ilike(p), Dano.codigo.ilike(p), Dano.nombre.ilike(p)))
    poner_total(respuesta, await contar(db, q), limite, desplazamiento)
    filas = (await db.execute(q.order_by(desc(Disp.fecha), desc(Disp.id)).offset(desplazamiento).limit(limite))).all()
    ids = [n.id for _, n, _ in filas]
    fotos: Dict[int, int] = {}
    if ids:
        fotos = {nid: c for nid, c in (await db.execute(
            select(Foto.neumatico_id, func.count()).where(Foto.neumatico_id.in_(ids))
            .group_by(Foto.neumatico_id))).all()}
    return [{
        "id": d.id, "neumatico_id": n.id, "fecha": d.fecha, "codigo": n.codigo, "marca": n.marca,
        "referencia": n.referencia, "medida": n.medida, "vida": n.reencauches or 0, "origen": d.origen,
        "dano_codigo": k.codigo if k else None, "dano": k.nombre if k else None,
        "ubicacion_dano": k.ubicacion if k else None, "responsable": k.responsable if k else None,
        "profundidad_minima": min([v for v in (d.profundidad_interna, d.profundidad_central, d.profundidad_externa)
                                   if v is not None], default=None),
        "reparaciones": d.reparaciones, "fotos": fotos.get(n.id, 0),
    } for d, n, k in filas]


@router.get("/llanta/{nid}")
async def disposicion_de_llanta(nid: int, db: AsyncSession = Depends(get_db)):
    """Para el historial de la llanta: su disposición (si la tiene) y sus fotos."""
    d = (await db.execute(select(Disp).where(Disp.neumatico_id == nid))).scalar()
    return {"disposicion": await _ficha(db, d, con_fotos=False) if d else None,
            "fotos": await _fotos(db, neumatico_id=nid)}


@router.get("/{did}")
async def ver_disposicion(did: int, db: AsyncSession = Depends(get_db)):
    d = await db.get(Disp, did)
    if not d:
        raise HTTPException(404, "Esa disposición no existe")
    return await _ficha(db, d)


# ─── Fotos ────────────────────────────────────────────────────────────────────

def _carpeta() -> str:
    esquema = re.sub(r"[^A-Za-z0-9_]", "_", esquema_actual() or ESQUEMA_POR_DEFECTO)
    return f"llantas/{esquema}"


def _normalizar(contenido: bytes) -> bytes:
    """JPEG de hasta 1600 px: una foto de celular pesa 4-8 MB y en el historial
    se ven decenas. Si no es una imagen legible, se rechaza."""
    from PIL import Image, ImageOps
    try:
        img = Image.open(io.BytesIO(contenido))
        img = ImageOps.exif_transpose(img).convert("RGB")
    except Exception:
        raise HTTPException(400, "El archivo no es una imagen válida (JPG, PNG o WEBP)")
    img.thumbnail((1600, 1600))
    salida = io.BytesIO()
    img.save(salida, "JPEG", quality=85, optimize=True)
    return salida.getvalue()


async def _fotos(db: AsyncSession, neumatico_id: int) -> List[Dict[str, Any]]:
    filas = (await db.execute(select(Foto).where(Foto.neumatico_id == neumatico_id)
                              .order_by(Foto.created_at, Foto.id))).scalars().all()
    return [{"id": f.id, "tipo": f.tipo, "nombre": f.nombre, "disposicion_id": f.disposicion_id,
             "fecha": f.created_at, "registrado_por": f.registrado_por} for f in filas]


async def guardar_foto(db: AsyncSession, neumatico_id: int, contenido: bytes, nombre: str, tipo: str,
                       quien: str, disposicion_id: Optional[int] = None) -> Foto:
    if len(contenido) > MAX_FOTO:
        raise HTTPException(413, "La foto pesa más de 12 MB")
    tipo = (tipo or "OTRA").upper()
    if tipo not in TIPOS_FOTO:
        raise HTTPException(422, f"Tipo de foto inválido; use {', '.join(TIPOS_FOTO)}")
    import asyncio
    datos = await asyncio.to_thread(_normalizar, contenido)
    carpeta = Path(settings.UPLOAD_DIR) / _carpeta()
    carpeta.mkdir(parents=True, exist_ok=True)
    relativa = f"{_carpeta()}/n{neumatico_id}_{tipo.lower()}_{hashlib.md5(datos).hexdigest()[:12]}.jpg"
    (Path(settings.UPLOAD_DIR) / relativa).write_bytes(datos)
    f = Foto(neumatico_id=neumatico_id, disposicion_id=disposicion_id, tipo=tipo, archivo=relativa,
             nombre=(nombre or "foto")[:200], registrado_por=quien)
    db.add(f)
    await db.flush()
    return f


@router.post("/llanta/{nid}/fotos", status_code=201)
async def subir_fotos(nid: int, archivos: List[UploadFile] = File(...), tipo: str = Form("OTRA"),
                      db: AsyncSession = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    neu = await db.get(EAMNeumatico, nid)
    if not neu:
        raise HTTPException(404, "Esa llanta no existe")
    disp = (await db.execute(select(Disp.id).where(Disp.neumatico_id == nid))).scalar()
    for a in archivos[:10]:
        await guardar_foto(db, nid, await a.read(MAX_FOTO + 1), a.filename or "foto", tipo, _quien(usuario), disp)
    await db.commit()
    return await _fotos(db, nid)


@router.get("/fotos/{fid}/archivo")
async def ver_foto(fid: int, db: AsyncSession = Depends(get_db)):
    f = await db.get(Foto, fid)
    if not f:
        raise HTTPException(404, "Esa foto no existe")
    ruta = Path(settings.UPLOAD_DIR) / f.archivo
    try:
        ruta.resolve().relative_to(Path(settings.UPLOAD_DIR).resolve())
    except ValueError:
        raise HTTPException(404, "Esa foto no existe")
    if not ruta.is_file():
        raise HTTPException(410, "El archivo de la foto ya no está en el servidor")
    return FileResponse(ruta, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})


@router.delete("/fotos/{fid}", status_code=204)
async def borrar_foto(fid: int, db: AsyncSession = Depends(get_db)):
    f = await db.get(Foto, fid)
    if not f:
        raise HTTPException(404, "Esa foto no existe")
    (Path(settings.UPLOAD_DIR) / f.archivo).unlink(missing_ok=True)
    await db.delete(f)
    await db.commit()


# ─── Cargue masivo (históricos, como el formulario de campo) ──────────────────

COLUMNAS = [
    {"clave": "codigo", "titulo": "Código de llanta", "requerida": True,
     "ayuda": "El número de la llanta. Si no existe en el sistema se crea dada de baja", "ejemplo": "275731"},
    {"clave": "fecha", "titulo": "Fecha", "requerida": True, "ayuda": "AAAA-MM-DD", "ejemplo": "2026-11-10"},
    {"clave": "dano_codigo", "titulo": "Código de daño", "requerida": True,
     "ayuda": "Un código del catálogo de daños de la cuenta", "ejemplo": "E1-2"},
    {"clave": "marca", "titulo": "Marca", "requerida": False, "ayuda": "Solo si la llanta no existe", "ejemplo": "GITI"},
    {"clave": "referencia", "titulo": "Referencia", "requerida": False, "ejemplo": "GAR879"},
    {"clave": "medida", "titulo": "Dimensión", "requerida": False, "ejemplo": "295/80R22.5"},
    {"clave": "dot", "titulo": "DOT", "requerida": False, "ejemplo": "4617"},
    {"clave": "reencauches", "titulo": "Número de reencauches", "requerida": False,
     "ayuda": "La vida: 0 = original", "ejemplo": "1"},
    {"clave": "diseno_reencauche", "titulo": "Diseño reencauche", "requerida": False, "ejemplo": "RT56"},
    {"clave": "profundidad_interna", "titulo": "Prof Int", "requerida": False, "ayuda": "mm", "ejemplo": "5"},
    {"clave": "profundidad_central", "titulo": "Prof Cent", "requerida": False, "ayuda": "mm", "ejemplo": "5"},
    {"clave": "profundidad_externa", "titulo": "Prof Ext", "requerida": False, "ayuda": "mm", "ejemplo": "6"},
    {"clave": "reparaciones", "titulo": "Cantidad de reparaciones", "requerida": False, "ejemplo": "0"},
    {"clave": "rechazo", "titulo": "Rechazo", "requerida": False, "ayuda": "Quién la rechazó o por qué"},
    {"clave": "ubicacion_actual", "titulo": "Ubicación Actual", "requerida": False, "ejemplo": "ALPUJARRA"},
    {"clave": "regrabada", "titulo": "Regrabada", "requerida": False, "ayuda": "SI o NO", "ejemplo": "NO"},
    {"clave": "observaciones", "titulo": "Observaciones", "requerida": False},
]


@router.get("/importar/plantilla")
async def plantilla_importar():
    return {"ruta": "disposicion", "titulo": "Disposición final de llantas", "columnas": COLUMNAS}


def _fecha(v) -> datetime:
    if isinstance(v, datetime):
        return v
    t = str(v or "").strip()
    for formato in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(t[:19], formato)
        except ValueError:
            continue
    raise ValueError(f"fecha «{t}» no reconocida (use AAAA-MM-DD)")


def _texto(v) -> Optional[str]:
    """Las celdas de Excel traen números donde se esperaba texto (7095.0)."""
    if v in (None, ""):
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip() or None


def _entero(v) -> Optional[int]:
    n = _num(v)
    return int(round(n)) if n is not None else None


@router.post("/importar")
async def importar(data: Dict[str, List[Dict[str, Any]]], db: AsyncSession = Depends(get_db),
                   usuario: Usuario = Depends(get_current_user)):
    """Una disposición por fila. Las filas con error no se graban y se informan
    con su número; las demás sí."""
    filas = data.get("filas") or []
    if len(filas) > 5000:
        raise HTTPException(413, "Máximo 5.000 filas por cargue")
    quien = _quien(usuario)
    creados, omitidos, errores = 0, 0, []
    for i, f in enumerate(filas, start=2):
        try:
            entrada = DisposicionIn(
                codigo=_texto(f.get("codigo")), fecha=_fecha(f.get("fecha")),
                dano_codigo=_texto(f.get("dano_codigo")), marca=_texto(f.get("marca")),
                referencia=_texto(f.get("referencia")), medida=_texto(f.get("medida")), dot=_texto(f.get("dot")),
                reencauches=_entero(f.get("reencauches")),
                diseno_reencauche=(_texto(f.get("diseno_reencauche"))
                                   if f.get("diseno_reencauche") not in (None, "", 0, "0") else None),
                profundidad_interna=_num(f.get("profundidad_interna")),
                profundidad_central=_num(f.get("profundidad_central")),
                profundidad_externa=_num(f.get("profundidad_externa")),
                reparaciones=_entero(f.get("reparaciones")), rechazo=_texto(f.get("rechazo")),
                ubicacion_actual=_texto(f.get("ubicacion_actual")),
                regrabada=str(f.get("regrabada") or "").strip().upper() in ("SI", "SÍ", "S", "X", "1", "TRUE"),
                observaciones=_texto(f.get("observaciones")), origen="IMPORTADO")
            if not entrada.codigo:
                raise ValueError("falta el código de la llanta")
            await registrar(db, entrada, quien)
            await db.commit()
            creados += 1
        except ValueError as e:
            await db.rollback()
            if "ya tiene su disposición" in str(e):
                omitidos += 1
            else:
                errores.append({"fila": i, "motivo": str(e)})
        except Exception as e:  # noqa: BLE001 — la fila se informa, el cargue sigue
            await db.rollback()
            errores.append({"fila": i, "motivo": f"no se pudo grabar: {str(e)[:150]}"})
    return {"creados": creados, "omitidos": omitidos, "errores": errores}
