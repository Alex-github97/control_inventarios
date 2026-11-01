"""
Reglas de sugerencia de llantas y lo que generan sobre la última inspección.

El motor (campos, operadores, evaluación) está en `core/neumaticos_novedades`;
aquí solo se guardan las reglas y se sirven los resultados a la pantalla.
"""
import asyncio
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.neumaticos_flota import cargar_flota, reglas, umbrales
from app.core.neumaticos_novedades import (
    CAMPOS, OPERADORES_NUM, OPERADORES_TEXTO, TIPOS_NOVEDAD, TIPOS_REGLA, novedades, sugerencias,
    validar_condicion,
)
from app.infrastructure.models.eam import EAMReglaSugerenciaCondicion, EAMReglaSugerenciaNeumatico

router = APIRouter(prefix="/eam/neumaticos/sugerencias", tags=["CMMS/EAM · Neumáticos · Sugerencias"])


class CondicionIn(BaseModel):
    campo: str
    operador: str
    valor: str


class ReglaIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    tipo: str = "OTRO"
    prioridad: int = Field(3, ge=1, le=9)
    texto: str = Field(min_length=1)
    activa: bool = True
    condiciones: List[CondicionIn] = Field(min_length=1)


class CondicionOut(CondicionIn):
    id: int


class ReglaOut(BaseModel):
    id: int
    nombre: str
    tipo: str
    prioridad: int
    texto: str
    activa: bool
    condiciones: List[CondicionOut]


class Campo(BaseModel):
    campo: str
    nombre: str
    tipo: str
    unidad: Optional[str] = None
    opciones: Optional[List[str]] = None
    operadores: List[str]


class Catalogo(BaseModel):
    campos: List[Campo]
    tipos: List[str]
    tipos_novedad: Dict[str, str]
    marcadores: List[str]


class VistaPrevia(BaseModel):
    llantas_evaluadas: int
    llantas_cumplen: int
    ejemplos: List[str]


class NovedadOut(BaseModel):
    neumatico_id: int
    posicion: str
    tipo: str
    nombre: str
    texto: str


class SugerenciaOut(BaseModel):
    neumatico_id: int
    posicion: str
    regla_id: int
    regla: str
    tipo: str
    prioridad: int
    texto: str
    valores: Dict[str, Any]


class DelVehiculo(BaseModel):
    novedades: List[NovedadOut]
    sugerencias: List[SugerenciaOut]


def _validar(data: ReglaIn) -> None:
    if data.tipo not in TIPOS_REGLA:
        raise HTTPException(422, f"El tipo «{data.tipo}» no existe.")
    for c in data.condiciones:
        error = validar_condicion(c.campo, c.operador, c.valor)
        if error:
            raise HTTPException(422, error)


def _salida(r: EAMReglaSugerenciaNeumatico) -> ReglaOut:
    return ReglaOut(id=r.id, nombre=r.nombre, tipo=r.tipo, prioridad=r.prioridad, texto=r.texto, activa=r.activa,
                    condiciones=[CondicionOut(id=c.id, campo=c.campo, operador=c.operador, valor=c.valor)
                                 for c in r.condiciones])


def _condiciones(data: ReglaIn) -> List[EAMReglaSugerenciaCondicion]:
    # Los valores de texto se guardan en mayúsculas, como los compara el motor.
    return [EAMReglaSugerenciaCondicion(
        campo=c.campo, operador=c.operador,
        valor=c.valor.strip().upper() if CAMPOS[c.campo][1] == "texto" else c.valor.strip().replace(",", "."))
        for c in data.condiciones]


@router.get("/campos", response_model=Catalogo)
async def campos():
    """Lo que se puede usar en una regla: campos, operadores, tipos y marcadores."""
    salida = []
    for clave, (nombre, tipo, extra) in CAMPOS.items():
        salida.append(Campo(campo=clave, nombre=nombre, tipo=tipo,
                            unidad=extra if isinstance(extra, str) else None,
                            opciones=extra if isinstance(extra, list) else None,
                            operadores=list(OPERADORES_NUM if tipo == "num" else OPERADORES_TEXTO)))
    return Catalogo(campos=salida, tipos=list(TIPOS_REGLA), tipos_novedad=TIPOS_NOVEDAD,
                    marcadores=["codigo", "posicion", "profundidad", "marca", "referencia", "medida", *CAMPOS])


@router.get("/reglas", response_model=List[ReglaOut])
async def listar(db: AsyncSession = Depends(get_db)):
    return [_salida(r) for r in await reglas(db)]


@router.post("/reglas", response_model=ReglaOut, status_code=201)
async def crear(data: ReglaIn, db: AsyncSession = Depends(get_db)):
    _validar(data)
    await reglas(db)   # siembra las iniciales antes de agregar la primera propia
    r = EAMReglaSugerenciaNeumatico(nombre=data.nombre.strip(), tipo=data.tipo, prioridad=data.prioridad,
                                    texto=data.texto.strip(), activa=data.activa, condiciones=_condiciones(data))
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return _salida(r)


@router.put("/reglas/{rid}", response_model=ReglaOut)
async def editar(rid: int, data: ReglaIn, db: AsyncSession = Depends(get_db)):
    _validar(data)
    r = await db.get(EAMReglaSugerenciaNeumatico, rid)
    if r is None:
        raise HTTPException(404, "Regla no encontrada")
    r.nombre, r.tipo, r.prioridad = data.nombre.strip(), data.tipo, data.prioridad
    r.texto, r.activa = data.texto.strip(), data.activa
    r.condiciones = _condiciones(data)
    await db.commit()
    await db.refresh(r)
    return _salida(r)


@router.delete("/reglas/{rid}", status_code=204)
async def borrar(rid: int, db: AsyncSession = Depends(get_db)):
    r = await db.get(EAMReglaSugerenciaNeumatico, rid)
    if r is None:
        raise HTTPException(404, "Regla no encontrada")
    await db.delete(r)
    await db.commit()


@router.post("/vista-previa", response_model=VistaPrevia)
async def vista_previa(data: ReglaIn, db: AsyncSession = Depends(get_db)):
    """Cuántas llantas montadas cumplen hoy la regla, con su última inspección,
    antes de guardarla."""
    _validar(data)
    u = await umbrales(db)
    flota = await cargar_flota(db)
    regla = EAMReglaSugerenciaNeumatico(id=0, nombre=data.nombre, tipo=data.tipo, prioridad=data.prioridad,
                                        texto=data.texto, activa=True, condiciones=_condiciones(data))

    def calcular():
        llantas = [ll for v in flota for ll in v.llantas]
        s = sugerencias(llantas, [regla], u)
        return VistaPrevia(llantas_evaluadas=sum(1 for ll in llantas if ll.inspeccionada),
                           llantas_cumplen=len(s), ejemplos=[x[0].texto for x in list(s.values())[:3]])
    return await asyncio.to_thread(calcular)


@router.get("/vehiculo/{activo_id}", response_model=DelVehiculo)
async def del_vehiculo(activo_id: int, db: AsyncSession = Depends(get_db)):
    """Novedades y sugerencias de las llantas montadas en un vehículo, según la
    última inspección de cada una."""
    flota = await cargar_flota(db, activo_ids=[activo_id])
    if not flota:
        return DelVehiculo(novedades=[], sugerencias=[])
    u = await umbrales(db)
    llantas = flota[0].llantas
    nov = novedades(llantas, u)
    sug = sugerencias(llantas, await reglas(db, solo_activas=True), u)
    pos = {ll.neumatico_id: ll.posicion for ll in llantas}
    return DelVehiculo(
        novedades=[NovedadOut(neumatico_id=nid, posicion=pos[nid], tipo=n.tipo, nombre=TIPOS_NOVEDAD[n.tipo], texto=n.texto)
                   for nid, lista in nov.items() for n in lista],
        sugerencias=sorted((SugerenciaOut(**s.__dict__) for lista in sug.values() for s in lista),
                           key=lambda s: (s.prioridad, s.posicion)))
