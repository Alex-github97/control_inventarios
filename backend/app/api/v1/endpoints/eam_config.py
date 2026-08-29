"""
Centros de costo y tipos de trabajo del CMMS.

Estos dos catálogos se mostraban en la pantalla de configuración pero no
existían: la página los tenía escritos a mano y los guardaba en memoria, así
que lo que se creaba desaparecía al recargar. Acá quedan de verdad.

El centro de costo tiene tabla propia y no va al catálogo maestro porque carga
atributos del negocio —ciudad y plataforma—, que es la regla del módulo para
decidir dónde vive cada cosa.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.infrastructure.models.eam import EAMCentroCosto, EAMTipoTrabajo

router = APIRouter(prefix="/eam", tags=["CMMS/EAM"])


# ─── Centros de costo ─────────────────────────────────────────────────────────

class CentroCostoBase(BaseModel):
    codigo: str
    nombre: str
    ciudad: Optional[str] = None
    plataforma: Optional[str] = None
    activo: bool = True


class CentroCostoResponse(CentroCostoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


@router.get("/catalogos/centros-costo", response_model=List[CentroCostoResponse])
async def listar_centros(db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(EAMCentroCosto).where(EAMCentroCosto.activo == True)  # noqa: E712
        .order_by(EAMCentroCosto.codigo))
    return list(r.scalars().all())


@router.post("/catalogos/centros-costo", response_model=CentroCostoResponse, status_code=201)
async def crear_centro(data: CentroCostoBase, db: AsyncSession = Depends(get_db)):
    codigo = (data.codigo or "").strip()
    if not codigo:
        raise HTTPException(400, "El código es obligatorio")
    ya = await db.execute(select(func.count()).select_from(EAMCentroCosto).where(
        func.lower(EAMCentroCosto.codigo) == codigo.lower()))
    if ya.scalar():
        raise HTTPException(409, f"Ya existe un centro de costo con el código «{codigo}»")
    obj = EAMCentroCosto(**{**data.model_dump(), "codigo": codigo})
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.put("/catalogos/centros-costo/{cid}", response_model=CentroCostoResponse)
async def editar_centro(cid: int, data: CentroCostoBase, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMCentroCosto, cid)
    if not obj:
        raise HTTPException(404, "Ese centro de costo no existe")
    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(obj, campo, valor)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/catalogos/centros-costo/{cid}", status_code=204)
async def borrar_centro(cid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMCentroCosto, cid)
    if not obj:
        raise HTTPException(404, "Ese centro de costo no existe")
    # Se desactiva en vez de borrarse: puede estar referenciado en costos ya
    # registrados, y borrarlo dejaría esos costos sin a dónde imputarse.
    obj.activo = False
    await db.commit()


# ─── Tipos de trabajo ─────────────────────────────────────────────────────────

CATEGORIAS = ("PREVENTIVO", "CORRECTIVO", "PREDICTIVO", "INSPECCION", "EMERGENCIA")


class TipoTrabajoBase(BaseModel):
    nombre: str
    categoria: Optional[str] = None
    descripcion: Optional[str] = None
    # Texto y no número: hay trabajos cuya duración es "Variable".
    duracion: Optional[str] = None
    requiere_taller: bool = False
    requiere_materiales: bool = False
    sistema: Optional[str] = None
    subsistema: Optional[str] = None
    activo: bool = True


class TipoTrabajoResponse(TipoTrabajoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


@router.get("/catalogos/tipos-trabajo-completo", response_model=List[TipoTrabajoResponse])
async def listar_tipos(db: AsyncSession = Depends(get_db)):
    """Con todos los campos.

    La ruta lleva sufijo porque `/catalogos/tipos-trabajo` ya existía devolviendo
    solo nombre y categoría, y hay pantallas que la consumen así.
    """
    r = await db.execute(
        select(EAMTipoTrabajo).where(EAMTipoTrabajo.activo == True)  # noqa: E712
        .order_by(EAMTipoTrabajo.nombre))
    return list(r.scalars().all())


def _validar_categoria(categoria: Optional[str]) -> Optional[str]:
    if not categoria:
        return None
    valor = categoria.strip().upper()
    if valor not in CATEGORIAS:
        raise HTTPException(
            400,
            f"«{categoria}» no es una categoría válida. Use una de: {', '.join(CATEGORIAS)}.",
        )
    return valor


@router.post("/catalogos/tipos-trabajo-completo", response_model=TipoTrabajoResponse,
             status_code=201)
async def crear_tipo(data: TipoTrabajoBase, db: AsyncSession = Depends(get_db)):
    nombre = (data.nombre or "").strip()
    if not nombre:
        raise HTTPException(400, "El nombre es obligatorio")
    ya = await db.execute(select(func.count()).select_from(EAMTipoTrabajo).where(
        func.lower(EAMTipoTrabajo.nombre) == nombre.lower()))
    if ya.scalar():
        raise HTTPException(409, f"Ya existe un tipo de trabajo llamado «{nombre}»")
    obj = EAMTipoTrabajo(**{
        **data.model_dump(), "nombre": nombre,
        "categoria": _validar_categoria(data.categoria),
    })
    db.add(obj); await db.commit(); await db.refresh(obj)
    return obj


@router.put("/catalogos/tipos-trabajo-completo/{tid}", response_model=TipoTrabajoResponse)
async def editar_tipo(tid: int, data: TipoTrabajoBase, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMTipoTrabajo, tid)
    if not obj:
        raise HTTPException(404, "Ese tipo de trabajo no existe")
    cambios = data.model_dump(exclude_unset=True)
    if "categoria" in cambios:
        cambios["categoria"] = _validar_categoria(cambios["categoria"])
    for campo, valor in cambios.items():
        setattr(obj, campo, valor)
    await db.commit(); await db.refresh(obj)
    return obj


@router.delete("/catalogos/tipos-trabajo-completo/{tid}", status_code=204)
async def borrar_tipo(tid: int, db: AsyncSession = Depends(get_db)):
    obj = await db.get(EAMTipoTrabajo, tid)
    if not obj:
        raise HTTPException(404, "Ese tipo de trabajo no existe")
    # Se desactiva: las OTs ya emitidas lo referencian.
    obj.activo = False
    await db.commit()
