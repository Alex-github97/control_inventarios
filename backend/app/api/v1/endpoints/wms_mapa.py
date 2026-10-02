"""
WMS · Mapa visual: fotos reales de las estanterías (en blanco y negro) con sus
celdas pintadas según lo ocupadas que están, y el plano de la bodega para
navegar entre ellas. Prefijo: /wms/mapa

Las imágenes se guardan en la carpeta del cliente (como los adjuntos de EAM) y
se sirven por la API con sesión: una foto de la bodega muestra mercancía de
terceros y no va en una carpeta pública.
"""
from __future__ import annotations

import io
import re
import uuid
from collections import defaultdict
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.tenant import ESQUEMA_POR_DEFECTO, esquema_actual
from app.infrastructure.models.wms import (
    WMSInventarioUbicacion, WMSMapaCelda, WMSMapaFoto, WMSPlano, WMSProducto, WMSUbicacion, WMSZona,
)

router = APIRouter(prefix="/wms/mapa", tags=["wms-mapa"])
MAX_BYTES = 20 * 1024 * 1024
LADO_MAX = 2200


def _carpeta() -> Path:
    esquema = re.sub(r"[^A-Za-z0-9_]", "_", esquema_actual() or ESQUEMA_POR_DEFECTO)
    destino = Path(settings.UPLOAD_DIR) / "wms_mapa" / esquema
    destino.mkdir(parents=True, exist_ok=True)
    return destino


async def _guardar_imagen(archivo: UploadFile) -> tuple:
    """La foto se guarda en blanco y negro, con contraste ajustado, girada según
    su EXIF y reducida: es lo que se va a ver, y pesa una fracción."""
    from PIL import Image, ImageOps, UnidentifiedImageError
    datos = await archivo.read()
    if len(datos) > MAX_BYTES:
        raise HTTPException(413, "La imagen pasa de 20 MB.")
    try:
        img = Image.open(io.BytesIO(datos))
        img = ImageOps.exif_transpose(img)
    except (UnidentifiedImageError, OSError):
        raise HTTPException(422, "El archivo no es una imagen (JPG, PNG o WEBP).")
    img = ImageOps.autocontrast(img.convert("L"), cutoff=1)
    img.thumbnail((LADO_MAX, LADO_MAX))
    nombre = f"{uuid.uuid4().hex}.jpg"
    ruta = _carpeta() / nombre
    img.save(ruta, "JPEG", quality=82, optimize=True)
    return str(ruta.relative_to(Path(settings.UPLOAD_DIR))), img.width, img.height


def _servir(relativa: str) -> FileResponse:
    ruta = Path(settings.UPLOAD_DIR) / relativa
    if not ruta.is_file():
        raise HTTPException(404, "La imagen no está en el servidor.")
    return FileResponse(ruta, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})


def _foto_dict(f: WMSMapaFoto, asignadas: int = 0) -> dict:
    return {"id": f.id, "almacen_id": f.almacen_id, "nombre": f.nombre, "ancho": f.ancho, "alto": f.alto,
            "esquinas": f.esquinas, "filas": f.filas, "columnas": f.columnas, "pasillo": f.pasillo,
            "estanteria": f.estanteria, "notas": f.notas, "celdas_asignadas": asignadas,
            "calibrada": bool(f.esquinas and f.filas and f.columnas)}


async def _foto(db, fid) -> WMSMapaFoto:
    f = await db.get(WMSMapaFoto, fid)
    if f is None:
        raise HTTPException(404, "Foto no encontrada.")
    return f


# ── Fotos de estanterías ─────────────────────────────────────────────────────

@router.get("/fotos")
async def listar_fotos(almacen_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    fotos = (await db.execute(select(WMSMapaFoto).where(WMSMapaFoto.almacen_id == almacen_id)
                              .order_by(WMSMapaFoto.pasillo, WMSMapaFoto.estanteria, WMSMapaFoto.nombre))).scalars().all()
    conteo = defaultdict(int)
    for c in (await db.execute(select(WMSMapaCelda).where(WMSMapaCelda.foto_id.in_([f.id for f in fotos] or [0]),
                                                          WMSMapaCelda.ubicacion_id.isnot(None)))).scalars():
        conteo[c.foto_id] += 1
    return [_foto_dict(f, conteo[f.id]) for f in fotos]


@router.post("/fotos", status_code=201)
async def subir_foto(almacen_id: int = Form(...), nombre: str = Form(...), pasillo: Optional[str] = Form(None),
                     estanteria: Optional[str] = Form(None), archivo: UploadFile = File(...),
                     db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    relativa, ancho, alto = await _guardar_imagen(archivo)
    f = WMSMapaFoto(almacen_id=almacen_id, nombre=nombre.strip()[:150] or "Estantería", archivo=relativa, ancho=ancho,
                    alto=alto, pasillo=(pasillo or None), estanteria=(estanteria or None))
    db.add(f)
    await db.flush()
    return _foto_dict(f)


@router.get("/fotos/{fid}/imagen")
async def imagen_foto(fid: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return _servir((await _foto(db, fid)).archivo)


class CalibrarIn(BaseModel):
    nombre: Optional[str] = Field(default=None, max_length=150)
    esquinas: List[List[float]] = Field(min_length=4, max_length=4)
    filas: int = Field(ge=1, le=30)
    columnas: int = Field(ge=1, le=60)
    pasillo: Optional[str] = None
    estanteria: Optional[str] = None
    notas: Optional[str] = None


@router.put("/fotos/{fid}")
async def calibrar(fid: int, data: CalibrarIn, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    f = await _foto(db, fid)
    if any(len(p) != 2 or not (0 <= p[0] <= 1 and 0 <= p[1] <= 1) for p in data.esquinas):
        raise HTTPException(422, "Cada esquina es un punto (x, y) entre 0 y 1.")
    cambia_grilla = (f.filas, f.columnas) != (data.filas, data.columnas)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(f, k, v)
    if cambia_grilla:
        # Otra cuadrícula: las celdas fuera de ella ya no existen.
        for c in (await db.execute(select(WMSMapaCelda).where(WMSMapaCelda.foto_id == fid))).scalars():
            if c.fila >= data.filas or c.columna >= data.columnas:
                await db.delete(c)
    return _foto_dict(f)


def _num(texto: Optional[str]) -> Optional[int]:
    m = re.search(r"\d+", texto or "")
    return int(m.group()) if m else None


class AutoIn(BaseModel):
    pasillo: Optional[str] = None
    estanteria: Optional[str] = None


@router.post("/fotos/{fid}/autoasignar")
async def autoasignar(fid: int, data: AutoIn, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    """Asigna cada celda a la ubicación del mismo pasillo (y estantería) cuyo
    nivel y posición correspondan: el nivel 1 es la fila de abajo y la
    posición 1 la columna de la izquierda."""
    f = await _foto(db, fid)
    if not (f.filas and f.columnas):
        raise HTTPException(422, "Primero defina las filas y columnas de la foto.")
    pasillo = data.pasillo if data.pasillo is not None else f.pasillo
    estanteria = data.estanteria if data.estanteria is not None else f.estanteria
    if not pasillo and not estanteria:
        raise HTTPException(422, "Indique el pasillo o la estantería de la foto.")
    q = select(WMSUbicacion).join(WMSZona, WMSZona.id == WMSUbicacion.zona_id).where(
        WMSZona.almacen_id == f.almacen_id, WMSUbicacion.activo.isnot(False))
    candidatas = [u for u in (await db.execute(q)).scalars().all()
                  if (not pasillo or (u.pasillo or "").strip().upper() == pasillo.strip().upper())
                  and (not estanteria or (u.estanteria or "").strip().upper() == estanteria.strip().upper())]
    por_celda = {}
    for u in candidatas:
        nivel, pos = _num(u.nivel) or 1, _num(u.posicion)
        if pos is None:
            continue
        fila, col = f.filas - nivel, pos - 1
        if 0 <= fila < f.filas and 0 <= col < f.columnas:
            por_celda[(fila, col)] = u.id
    for c in (await db.execute(select(WMSMapaCelda).where(WMSMapaCelda.foto_id == fid))).scalars():
        await db.delete(c)
    await db.flush()
    for (fila, col), uid in por_celda.items():
        db.add(WMSMapaCelda(foto_id=fid, fila=fila, columna=col, ubicacion_id=uid))
    f.pasillo, f.estanteria = pasillo, estanteria
    return {"asignadas": len(por_celda), "celdas": f.filas * f.columnas,
            "sin_ubicacion": f.filas * f.columnas - len(por_celda),
            "ubicaciones_fuera": len(candidatas) - len(por_celda)}


class CeldaIn(BaseModel):
    fila: int = Field(ge=0)
    columna: int = Field(ge=0)
    ubicacion_id: Optional[int] = None


@router.put("/fotos/{fid}/celdas")
async def asignar_celdas(fid: int, data: List[CeldaIn], db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    f = await _foto(db, fid)
    actuales = {(c.fila, c.columna): c for c in (await db.execute(select(WMSMapaCelda).where(WMSMapaCelda.foto_id == fid))).scalars()}
    for d in data:
        if f.filas is None or d.fila >= f.filas or d.columna >= (f.columnas or 0):
            raise HTTPException(422, f"La celda ({d.fila}, {d.columna}) está fuera de la cuadrícula.")
        if d.ubicacion_id:
            u = await db.get(WMSUbicacion, d.ubicacion_id)
            z = await db.get(WMSZona, u.zona_id) if u else None
            if z is None or z.almacen_id != f.almacen_id:
                raise HTTPException(422, "La ubicación es de otro almacén.")
            for k, c in actuales.items():   # una ubicación, una sola celda en la foto
                if c.ubicacion_id == d.ubicacion_id and k != (d.fila, d.columna):
                    c.ubicacion_id = None
        c = actuales.get((d.fila, d.columna))
        if c is None:
            c = WMSMapaCelda(foto_id=fid, fila=d.fila, columna=d.columna)
            db.add(c)
            actuales[(d.fila, d.columna)] = c
        c.ubicacion_id = d.ubicacion_id
    return {"ok": True}


async def _estado_ubicaciones(db, almacen_id: int, ubicacion_ids, producto_id=None, depositante_id=None) -> dict:
    """Ocupación y contenido de cada ubicación (por volumen si hay medidas)."""
    from app.api.v1.endpoints.wms_cubicaje import ocupacion
    ocu = {u["id"]: u for u in await ocupacion(db, almacen_id) if u["id"] in set(ubicacion_ids)}
    filas = (await db.execute(select(WMSInventarioUbicacion, WMSProducto).join(
        WMSProducto, WMSProducto.id == WMSInventarioUbicacion.producto_id).where(
        WMSInventarioUbicacion.ubicacion_id.in_(list(ubicacion_ids) or [0])))).all()
    contenido = defaultdict(list)
    bloqueado = defaultdict(float)
    resaltar = set()
    for f, p in filas:
        total = (f.cantidad_disponible or 0) + (f.cantidad_reservada or 0) + (f.cantidad_bloqueada or 0)
        if total <= 0:
            continue
        contenido[f.ubicacion_id].append({"sku": p.sku, "nombre": p.nombre, "unidades": total})
        bloqueado[f.ubicacion_id] += f.cantidad_bloqueada or 0
        if (producto_id and p.id == producto_id) or (depositante_id and p.depositante_id == depositante_id):
            resaltar.add(f.ubicacion_id)
    out = {}
    for uid in ubicacion_ids:
        o = ocu.get(uid, {})
        unidades = sum(x["unidades"] for x in contenido[uid])
        pct = o.get("ocupacion_pct")
        if unidades <= 0:
            estado = "VACIA"
        elif bloqueado[uid] >= unidades - 1e-9:
            estado = "BLOQUEADA"
        elif pct is None:
            estado = "OCUPADA"
        else:
            estado = "LLENA" if pct > 95 else "CASI_LLENA" if pct > 80 else "OCUPADA"
        out[uid] = {"codigo": o.get("codigo"), "unidades": unidades, "ocupacion_pct": pct, "estado": estado,
                    "contenido": sorted(contenido[uid], key=lambda x: -x["unidades"])[:6], "resaltar": uid in resaltar}
    return out


@router.get("/fotos/{fid}/estado")
async def estado_foto(fid: int, producto_id: Optional[int] = None, depositante_id: Optional[int] = None,
                      db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    f = await _foto(db, fid)
    celdas = (await db.execute(select(WMSMapaCelda).where(WMSMapaCelda.foto_id == fid))).scalars().all()
    asig = {(c.fila, c.columna): c.ubicacion_id for c in celdas if c.ubicacion_id}
    est = await _estado_ubicaciones(db, f.almacen_id, set(asig.values()), producto_id, depositante_id)
    out = []
    for fila in range(f.filas or 0):
        for col in range(f.columnas or 0):
            uid = asig.get((fila, col))
            out.append({"fila": fila, "columna": col, "ubicacion_id": uid,
                        **(est.get(uid) if uid else {"codigo": None, "unidades": 0, "ocupacion_pct": None,
                                                     "estado": "SIN_ASIGNAR", "contenido": [], "resaltar": False})})
    resumen = defaultdict(int)
    for c in out:
        resumen[c["estado"]] += 1
    return {"foto": _foto_dict(f, len(asig)), "celdas": out, "resumen": resumen}


# ── Plano de la bodega ───────────────────────────────────────────────────────

@router.get("/plano")
async def ver_plano(almacen_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    p = (await db.execute(select(WMSPlano).where(WMSPlano.almacen_id == almacen_id))).scalar_one_or_none()
    if p is None:
        return None
    # Cada estantería marcada con su ocupación: para ver de un vistazo dónde hay espacio.
    marcas = []
    for m in p.marcas or []:
        datos = dict(m)
        if m.get("foto_id"):
            celdas = (await db.execute(select(WMSMapaCelda).where(WMSMapaCelda.foto_id == m["foto_id"],
                                                                  WMSMapaCelda.ubicacion_id.isnot(None)))).scalars().all()
            est = await _estado_ubicaciones(db, almacen_id, {c.ubicacion_id for c in celdas})
            ocupadas = sum(1 for e in est.values() if e["estado"] != "VACIA")
            datos.update(celdas=len(est), ocupadas=ocupadas,
                         ocupacion_pct=round(ocupadas / len(est) * 100, 1) if est else None)
        marcas.append(datos)
    return {"id": p.id, "almacen_id": p.almacen_id, "ancho": p.ancho, "alto": p.alto, "marcas": marcas}


@router.post("/plano", status_code=201)
async def subir_plano(almacen_id: int = Form(...), archivo: UploadFile = File(...), db: AsyncSession = Depends(get_db),
                      _=Depends(get_current_user)):
    relativa, ancho, alto = await _guardar_imagen(archivo)
    p = (await db.execute(select(WMSPlano).where(WMSPlano.almacen_id == almacen_id))).scalar_one_or_none()
    if p is None:
        p = WMSPlano(almacen_id=almacen_id, archivo=relativa, ancho=ancho, alto=alto, marcas=[])
        db.add(p)
    else:
        p.archivo, p.ancho, p.alto = relativa, ancho, alto
    await db.flush()
    return {"id": p.id, "ancho": ancho, "alto": alto}


@router.get("/plano/{pid}/imagen")
async def imagen_plano(pid: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    p = await db.get(WMSPlano, pid)
    if p is None:
        raise HTTPException(404, "Plano no encontrado.")
    return _servir(p.archivo)


class MarcaIn(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    w: float = Field(gt=0, le=1)
    h: float = Field(gt=0, le=1)
    etiqueta: str = Field(min_length=1, max_length=60)
    foto_id: Optional[int] = None


@router.put("/plano/{pid}/marcas")
async def guardar_marcas(pid: int, data: List[MarcaIn], db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    p = await db.get(WMSPlano, pid)
    if p is None:
        raise HTTPException(404, "Plano no encontrado.")
    for m in data:
        if m.foto_id:
            f = await db.get(WMSMapaFoto, m.foto_id)
            if f is None or f.almacen_id != p.almacen_id:
                raise HTTPException(422, f"La foto de «{m.etiqueta}» no es de este almacén.")
    p.marcas = [m.model_dump() for m in data]
    return {"marcas": p.marcas}


@router.get("/buscar")
async def buscar(almacen_id: int, q: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    """¿Dónde está? Las fotos y celdas donde hay un producto (por SKU, nombre o código de barras)."""
    t = f"%{q.strip()}%"
    prods = (await db.execute(select(WMSProducto).where(
        WMSProducto.sku.ilike(t) | WMSProducto.nombre.ilike(t) | WMSProducto.codigo_barras.ilike(t)).limit(20))).scalars().all()
    if not prods:
        return {"productos": [], "fotos": []}
    filas = (await db.execute(select(WMSInventarioUbicacion.ubicacion_id).join(WMSUbicacion, WMSUbicacion.id == WMSInventarioUbicacion.ubicacion_id)
                              .join(WMSZona, WMSZona.id == WMSUbicacion.zona_id)
                              .where(WMSZona.almacen_id == almacen_id, WMSInventarioUbicacion.producto_id.in_([p.id for p in prods]),
                                     (WMSInventarioUbicacion.cantidad_disponible + WMSInventarioUbicacion.cantidad_reservada
                                      + WMSInventarioUbicacion.cantidad_bloqueada) > 0))).scalars().all()
    celdas = (await db.execute(select(WMSMapaCelda, WMSMapaFoto).join(WMSMapaFoto, WMSMapaFoto.id == WMSMapaCelda.foto_id)
                               .where(WMSMapaCelda.ubicacion_id.in_(set(filas) or {0})))).all()
    fotos = defaultdict(list)
    nombres = {}
    for c, f in celdas:
        fotos[f.id].append({"fila": c.fila, "columna": c.columna, "ubicacion_id": c.ubicacion_id})
        nombres[f.id] = f.nombre
    return {"productos": [{"id": p.id, "sku": p.sku, "nombre": p.nombre} for p in prods],
            "ubicaciones": len(set(filas)), "fuera_del_mapa": len(set(filas) - {c.ubicacion_id for c, _ in celdas}),
            "fotos": [{"foto_id": k, "nombre": nombres[k], "celdas": v} for k, v in fotos.items()]}
