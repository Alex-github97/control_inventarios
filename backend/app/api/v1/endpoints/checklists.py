"""
Checklists e inspecciones — configuración y ejecución.

Rutas bajo `/eam/chk`: es una capa del CMMS, no un módulo aparte, así que el
control de acceso por módulo la trata como parte de EAM.

CÓMO SE CALIFICA UNA INSPECCIÓN
El porcentaje de conformidad es ponderado —cada ítem tiene peso— y los ítems
marcados «no aplica» se excluyen del divisor en vez de contar como fallo:
castigar a un equipo por no tener un componente que nunca debió tener produce
números que nadie respeta.

El resultado sale de dos reglas, en este orden:

  1. Si hay algún ítem CRÍTICO no conforme y la plantilla lo declara así, la
     inspección queda RECHAZADA sin importar el porcentaje. En una
     preoperacional, unos frenos malos no se compensan con veinte respuestas
     buenas.
  2. Si no, se compara el porcentaje contra el umbral de la plantilla.

VERSIONADO
Tocar la estructura de una plantilla en uso sube su versión. Las ejecuciones
guardan la versión con la que se llenaron, así que una inspección firmada hace
seis meses sigue significando lo mismo hoy.
"""
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter, Depends, File, Form, HTTPException, Request, UploadFile,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import decode_token
from app.core.tenant import esquema_actual, ESQUEMA_POR_DEFECTO
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.eam import EAMActivo, EAMOrdenTrabajo
from app.infrastructure.models.checklist import (
    ChkCategoria, ChkHallazgo, ChkPlantilla, ChkSeccion, ChkItem,
    ChkEjecucion, ChkRespuesta, ChkFoto, ChkProgramacion,
)

router = APIRouter(prefix="/eam/chk", tags=["CMMS/EAM · Checklists"])

TIPOS_ITEM = {
    "CONFORME_NO": "Conforme / No conforme",
    "SI_NO": "Sí / No",
    "TEXTO": "Texto libre",
    "NUMERO": "Número",
    "OPCIONES": "Lista de opciones",
    "FECHA": "Fecha",
    "RANGO": "Rango (1 a 5)",
}

EXTENSIONES_FOTO = {".png", ".jpg", ".jpeg", ".webp", ".heic", ".gif", ".bmp", ".pdf"}
MAX_BYTES = 15 * 1024 * 1024


def _quien(u: Usuario) -> str:
    return getattr(u, "username", None) or getattr(u, "nombre", None) or "—"


def _carpeta() -> str:
    """Subcarpeta del cliente en curso. Impide que una empresa pise a otra."""
    esquema = esquema_actual() or ESQUEMA_POR_DEFECTO
    return f"eam_chk/{re.sub(r'[^A-Za-z0-9_]', '_', esquema)}"


def _nombre_seguro(nombre: str) -> str:
    limpio = re.sub(r"[^A-Za-z0-9._ -]", "_", os.path.basename(nombre or "foto"))
    return limpio[:120] or "foto"


# ══════════════════════════════════════════════════════════════════════════════
# CATÁLOGOS
# ══════════════════════════════════════════════════════════════════════════════

class CategoriaIn(BaseModel):
    codigo: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    color: Optional[str] = None
    activo: bool = True


class CategoriaOut(CategoriaIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class HallazgoIn(BaseModel):
    codigo: str
    nombre: str
    categoria: Optional[str] = None
    severidad: str = "MODERADO"
    descripcion: Optional[str] = None
    accion_sugerida: Optional[str] = None
    genera_ot: bool = False
    activo: bool = True


class HallazgoOut(HallazgoIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


@router.get("/tipos-item", response_model=List[Dict[str, str]])
async def tipos_item():
    return [{"clave": k, "label": v} for k, v in TIPOS_ITEM.items()]


@router.get("/categorias", response_model=List[CategoriaOut])
async def listar_categorias(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(ChkCategoria).where(ChkCategoria.activo.is_(True))
                         .order_by(ChkCategoria.nombre))
    return list(r.scalars().all())


@router.post("/categorias", response_model=CategoriaOut, status_code=201)
async def crear_categoria(data: CategoriaIn, db: AsyncSession = Depends(get_db)):
    nombre = (data.nombre or "").strip()
    if not nombre:
        raise HTTPException(400, "El nombre es obligatorio")
    r = await db.execute(select(func.count()).select_from(ChkCategoria)
                         .where(func.lower(ChkCategoria.nombre) == nombre.lower()))
    if r.scalar():
        raise HTTPException(409, f"Ya existe la categoría «{nombre}»")
    obj = ChkCategoria(**{**data.model_dump(), "nombre": nombre})
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.put("/categorias/{cid}", response_model=CategoriaOut)
async def editar_categoria(cid: int, data: CategoriaIn, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ChkCategoria, cid)
    if not obj:
        raise HTTPException(404, "Esa categoría no existe")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/categorias/{cid}", status_code=204)
async def borrar_categoria(cid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ChkCategoria, cid)
    if not obj:
        raise HTTPException(404, "Esa categoría no existe")
    obj.activo = False
    await db.commit()


@router.get("/hallazgos", response_model=List[HallazgoOut])
async def listar_hallazgos(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(ChkHallazgo).where(ChkHallazgo.activo.is_(True))
                         .order_by(ChkHallazgo.categoria, ChkHallazgo.nombre))
    return list(r.scalars().all())


@router.post("/hallazgos", response_model=HallazgoOut, status_code=201)
async def crear_hallazgo(data: HallazgoIn, db: AsyncSession = Depends(get_db)):
    codigo = (data.codigo or "").strip().upper()
    if not codigo:
        raise HTTPException(400, "El código es obligatorio")
    r = await db.execute(select(func.count()).select_from(ChkHallazgo)
                         .where(func.upper(ChkHallazgo.codigo) == codigo))
    if r.scalar():
        raise HTTPException(409, f"Ya existe el hallazgo «{codigo}»")
    obj = ChkHallazgo(**{**data.model_dump(), "codigo": codigo})
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.put("/hallazgos/{hid}", response_model=HallazgoOut)
async def editar_hallazgo(hid: int, data: HallazgoIn, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ChkHallazgo, hid)
    if not obj:
        raise HTTPException(404, "Ese hallazgo no existe")
    for k, v in data.model_dump().items():
        setattr(obj, k, v.strip().upper() if k == "codigo" and isinstance(v, str) else v)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/hallazgos/{hid}", status_code=204)
async def borrar_hallazgo(hid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ChkHallazgo, hid)
    if not obj:
        raise HTTPException(404, "Ese hallazgo no existe")
    obj.activo = False
    await db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# PLANTILLAS
# ══════════════════════════════════════════════════════════════════════════════

class PlantillaIn(BaseModel):
    codigo: str
    nombre: str
    categoria_id: Optional[int] = None
    descripcion: Optional[str] = None
    tipo_activo: Optional[str] = None
    marca: Optional[str] = None
    linea: Optional[str] = None
    activo_id: Optional[int] = None
    periodicidad_dias: Optional[int] = None
    requiere_firma: bool = False
    umbral_aprobacion: float = 100
    critico_reprueba: bool = True
    genera_ot: bool = False
    pide_medidor: bool = False
    activo: bool = True


class PlantillaOut(PlantillaIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    version: int
    categoria: Optional[str] = None
    total_items: Optional[int] = None
    ejecuciones: Optional[int] = None


class SeccionIn(BaseModel):
    plantilla_id: int
    nombre: str
    orden: int = 0
    descripcion: Optional[str] = None


class SeccionOut(SeccionIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool = True


class ItemIn(BaseModel):
    plantilla_id: int
    seccion_id: Optional[int] = None
    orden: int = 0
    pregunta: str
    ayuda: Optional[str] = None
    tipo: str = "CONFORME_NO"
    opciones: Optional[List[str]] = None
    unidad: Optional[str] = None
    valor_min: Optional[float] = None
    valor_max: Optional[float] = None
    obligatorio: bool = True
    critico: bool = False
    requiere_foto: bool = False
    exige_observacion_no_conforme: bool = True
    peso: float = 1


class ItemOut(ItemIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool = True


async def _subir_version(db: AsyncSession, plantilla_id: int) -> None:
    """Sube la versión de la plantilla si ya tiene ejecuciones.

    Solo si ya se usó: mientras se está armando, cada pregunta nueva subiría la
    versión y el número perdería todo significado.
    """
    r = await db.execute(select(func.count()).select_from(ChkEjecucion)
                         .where(ChkEjecucion.plantilla_id == plantilla_id))
    if r.scalar():
        p = await db.get(ChkPlantilla, plantilla_id)
        if p:
            p.version = (p.version or 1) + 1


@router.get("/plantillas", response_model=List[PlantillaOut])
async def listar_plantillas(categoria_id: Optional[int] = None,
                            tipo_activo: Optional[str] = None,
                            db: AsyncSession = Depends(get_db)):
    q = (select(ChkPlantilla, ChkCategoria.nombre)
         .outerjoin(ChkCategoria, ChkCategoria.id == ChkPlantilla.categoria_id)
         .where(ChkPlantilla.activo.is_(True)).order_by(ChkPlantilla.codigo))
    if categoria_id:
        q = q.where(ChkPlantilla.categoria_id == categoria_id)
    if tipo_activo:
        q = q.where(or_(ChkPlantilla.tipo_activo == tipo_activo,
                        ChkPlantilla.tipo_activo.is_(None)))
    filas = (await db.execute(q)).all()

    ids = [p.id for p, _ in filas]
    conteo_items: Dict[int, int] = {}
    conteo_ejec: Dict[int, int] = {}
    if ids:
        r = await db.execute(select(ChkItem.plantilla_id, func.count(ChkItem.id))
                             .where(and_(ChkItem.plantilla_id.in_(ids),
                                         ChkItem.activo.is_(True)))
                             .group_by(ChkItem.plantilla_id))
        conteo_items = {k: v for k, v in r.all()}
        r = await db.execute(select(ChkEjecucion.plantilla_id, func.count(ChkEjecucion.id))
                             .where(ChkEjecucion.plantilla_id.in_(ids))
                             .group_by(ChkEjecucion.plantilla_id))
        conteo_ejec = {k: v for k, v in r.all()}

    salida = []
    for p, cat in filas:
        d = PlantillaOut.model_validate(p).model_dump()
        d["categoria"] = cat
        d["total_items"] = conteo_items.get(p.id, 0)
        d["ejecuciones"] = conteo_ejec.get(p.id, 0)
        salida.append(d)
    return salida


@router.post("/plantillas", response_model=PlantillaOut, status_code=201)
async def crear_plantilla(data: PlantillaIn, db: AsyncSession = Depends(get_db)):
    codigo = (data.codigo or "").strip().upper()
    if not codigo:
        raise HTTPException(400, "El código es obligatorio")
    r = await db.execute(select(func.count()).select_from(ChkPlantilla)
                         .where(func.upper(ChkPlantilla.codigo) == codigo))
    if r.scalar():
        raise HTTPException(409, f"Ya existe una plantilla con el código «{codigo}»")
    obj = ChkPlantilla(**{**data.model_dump(), "codigo": codigo}, version=1)
    db.add(obj); await db.commit(); await db.refresh(obj)
    return PlantillaOut.model_validate(obj)


@router.put("/plantillas/{pid}", response_model=PlantillaOut)
async def editar_plantilla(pid: int, data: PlantillaIn, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ChkPlantilla, pid)
    if not obj:
        raise HTTPException(404, "Esa plantilla no existe")
    # Cambiar el umbral o la regla de crítico altera cómo se califica: eso sí es
    # un cambio de versión.
    cambia_calificacion = (obj.umbral_aprobacion != data.umbral_aprobacion
                           or obj.critico_reprueba != data.critico_reprueba)
    for k, v in data.model_dump().items():
        setattr(obj, k, v.strip().upper() if k == "codigo" and isinstance(v, str) else v)
    if cambia_calificacion:
        await _subir_version(db, pid)
    await db.commit(); await db.refresh(obj)
    return PlantillaOut.model_validate(obj)


@router.delete("/plantillas/{pid}", status_code=204)
async def borrar_plantilla(pid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ChkPlantilla, pid)
    if not obj:
        raise HTTPException(404, "Esa plantilla no existe")
    obj.activo = False
    await db.commit()


class DuplicarIn(BaseModel):
    codigo: str
    nombre: str


@router.post("/plantillas/{pid}/duplicar", response_model=PlantillaOut, status_code=201)
async def duplicar(pid: int, data: DuplicarIn, db: AsyncSession = Depends(get_db)):
    """El código y el nombre van en el cuerpo y no en la URL: un nombre de
    plantilla lleva espacios y acentos, y como parámetro de consulta obliga a
    codificarlo a mano en cada llamada."""
    codigo, nombre = data.codigo, data.nombre

    # Copiar es la forma práctica de crear la inspección de otra línea de
    # equipos: se parte de una que ya funciona en vez de escribir cuarenta
    # preguntas de nuevo.
    origen = await db.get(ChkPlantilla, pid)
    if not origen:
        raise HTTPException(404, "Esa plantilla no existe")
    codigo = (codigo or "").strip().upper()
    r = await db.execute(select(func.count()).select_from(ChkPlantilla)
                         .where(func.upper(ChkPlantilla.codigo) == codigo))
    if r.scalar():
        raise HTTPException(409, f"Ya existe una plantilla con el código «{codigo}»")

    nueva = ChkPlantilla(
        codigo=codigo, nombre=nombre, categoria_id=origen.categoria_id,
        descripcion=origen.descripcion, tipo_activo=origen.tipo_activo,
        marca=origen.marca, linea=origen.linea,
        periodicidad_dias=origen.periodicidad_dias,
        requiere_firma=origen.requiere_firma,
        umbral_aprobacion=origen.umbral_aprobacion,
        critico_reprueba=origen.critico_reprueba, genera_ot=origen.genera_ot,
        pide_medidor=origen.pide_medidor, version=1)
    db.add(nueva); await db.commit(); await db.refresh(nueva)

    r = await db.execute(select(ChkSeccion).where(and_(
        ChkSeccion.plantilla_id == pid, ChkSeccion.activo.is_(True))))
    mapa_seccion: Dict[int, int] = {}
    for s in r.scalars().all():
        copia = ChkSeccion(plantilla_id=nueva.id, nombre=s.nombre,
                           orden=s.orden, descripcion=s.descripcion)
        db.add(copia); await db.flush()
        mapa_seccion[s.id] = copia.id

    r = await db.execute(select(ChkItem).where(and_(
        ChkItem.plantilla_id == pid, ChkItem.activo.is_(True))))
    for i in r.scalars().all():
        db.add(ChkItem(
            plantilla_id=nueva.id, seccion_id=mapa_seccion.get(i.seccion_id),
            orden=i.orden, pregunta=i.pregunta, ayuda=i.ayuda, tipo=i.tipo,
            opciones=i.opciones, unidad=i.unidad, valor_min=i.valor_min,
            valor_max=i.valor_max, obligatorio=i.obligatorio, critico=i.critico,
            requiere_foto=i.requiere_foto,
            exige_observacion_no_conforme=i.exige_observacion_no_conforme,
            peso=i.peso))
    await db.commit()
    return PlantillaOut.model_validate(nueva)


@router.get("/plantillas/{pid}/estructura", response_model=Dict[str, Any])
async def estructura(pid: int, db: AsyncSession = Depends(get_db)):
    """La plantilla completa: secciones con sus ítems, lista para llenar."""
    p = await db.get(ChkPlantilla, pid)
    if not p:
        raise HTTPException(404, "Esa plantilla no existe")

    r = await db.execute(select(ChkSeccion).where(and_(
        ChkSeccion.plantilla_id == pid, ChkSeccion.activo.is_(True)))
        .order_by(ChkSeccion.orden, ChkSeccion.id))
    secciones = list(r.scalars().all())

    r = await db.execute(select(ChkItem).where(and_(
        ChkItem.plantilla_id == pid, ChkItem.activo.is_(True)))
        .order_by(ChkItem.orden, ChkItem.id))
    items = list(r.scalars().all())

    por_seccion: Dict[Optional[int], List[Dict[str, Any]]] = {}
    for i in items:
        por_seccion.setdefault(i.seccion_id, []).append(
            ItemOut.model_validate(i).model_dump())

    bloques = [{"id": s.id, "nombre": s.nombre, "orden": s.orden,
                "descripcion": s.descripcion, "items": por_seccion.get(s.id, [])}
               for s in secciones]
    sueltos = por_seccion.get(None, [])
    if sueltos:
        # Los ítems sin sección se muestran juntos al final en vez de perderse.
        bloques.append({"id": None, "nombre": "Sin sección", "orden": 9999,
                        "descripcion": None, "items": sueltos})

    return {"plantilla": PlantillaOut.model_validate(p).model_dump(),
            "secciones": bloques,
            "total_items": len(items),
            "criticos": sum(1 for i in items if i.critico)}


@router.post("/secciones", response_model=SeccionOut, status_code=201)
async def crear_seccion(data: SeccionIn, db: AsyncSession = Depends(get_db)):
    if not await db.get(ChkPlantilla, data.plantilla_id):
        raise HTTPException(400, "Esa plantilla no existe")
    obj = ChkSeccion(**data.model_dump())
    db.add(obj); await _subir_version(db, data.plantilla_id)
    await db.commit(); await db.refresh(obj)
    return obj


@router.put("/secciones/{sid}", response_model=SeccionOut)
async def editar_seccion(sid: int, data: SeccionIn, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ChkSeccion, sid)
    if not obj:
        raise HTTPException(404, "Esa sección no existe")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/secciones/{sid}", status_code=204)
async def borrar_seccion(sid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ChkSeccion, sid)
    if not obj:
        raise HTTPException(404, "Esa sección no existe")
    obj.activo = False
    # Los ítems de la sección se van con ella; se desactivan, no se borran,
    # porque hay respuestas históricas apuntándoles.
    r = await db.execute(select(ChkItem).where(ChkItem.seccion_id == sid))
    for i in r.scalars().all():
        i.activo = False
    await _subir_version(db, obj.plantilla_id)
    await db.commit()


@router.post("/items", response_model=ItemOut, status_code=201)
async def crear_item(data: ItemIn, db: AsyncSession = Depends(get_db)):
    if data.tipo not in TIPOS_ITEM:
        raise HTTPException(400, f"Tipo no válido. Opciones: {', '.join(TIPOS_ITEM)}")
    if data.tipo == "OPCIONES" and not (data.opciones or []):
        raise HTTPException(400, "Una pregunta de opciones necesita al menos una opción")
    obj = ChkItem(**data.model_dump())
    db.add(obj); await _subir_version(db, data.plantilla_id)
    await db.commit(); await db.refresh(obj)
    return obj


@router.put("/items/{iid}", response_model=ItemOut)
async def editar_item(iid: int, data: ItemIn, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ChkItem, iid)
    if not obj:
        raise HTTPException(404, "Esa pregunta no existe")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    await _subir_version(db, obj.plantilla_id)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/items/{iid}", status_code=204)
async def borrar_item(iid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(ChkItem, iid)
    if not obj:
        raise HTTPException(404, "Esa pregunta no existe")
    # Nunca se borra: hay respuestas apuntando acá, y borrarlo dejaría
    # inspecciones firmadas con respuestas sin pregunta.
    obj.activo = False
    await _subir_version(db, obj.plantilla_id)
    await db.commit()


class ReordenIn(BaseModel):
    ids: List[int]


@router.put("/items/reordenar", response_model=Dict[str, int])
async def reordenar(data: ReordenIn, db: AsyncSession = Depends(get_db)):
    """Guarda el orden en que quedaron tras arrastrar."""
    for posicion, iid in enumerate(data.ids):
        obj = await db.get(ChkItem, iid)
        if obj:
            obj.orden = posicion
    await db.commit()
    return {"actualizados": len(data.ids)}
