"""
Tableros de llantas: la pila de descarte, el parque montado y el índice de
reencauche (I.R.), con el filtro común de `core/neumaticos_filtros`.

Todo es agregado en SQL: la empresa de prueba tiene 96 mil llantas y 63 mil
bajas, y traerlas a Python para contarlas es justo lo que tumba un proceso
(`consultas-con-volumen`). Cada respuesta son unos pocos cientos de filas.

I.R. (índice de reencauche) = promedio de reencauches del grupo: una llanta
nueva vale 0, con un reencauche 1, con dos 2… Sale del contador `reencauches`
de la llanta, que no cambia después de la baja; por eso en la pila de descarte
mide cuántas vidas alcanzaron las llantas antes de botarse.
"""
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy import and_, func, literal_column, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.informe_flota_cola import DIRECTO_MAX, armar, flota_de
from app.core.neumaticos_filtros import (
    SIN_DOT, FiltrosLlanta, clave, condiciones, etiqueta_referencia, filtros_llanta,
)
from app.infrastructure.models.eam import (
    EAMDanoNeumaticoCatalogo, EAMInformeFlotaTrabajo, EAMMotivoFinVida, EAMNeumatico as N, EAMNeumaticoConfig,
)
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/eam/neumaticos/reportes", tags=["CMMS/EAM · Neumáticos · Tableros"])

SIN_MOTIVO = "Sin motivo registrado"
SIN_DATO = "Sin dato"
OTRAS = "Otras"
# Cuántas marcas y referencias se muestran en los cruces; el resto va a «Otras».
TOPE_MARCAS = 15
TOPE_REFERENCIAS = 25

REENC = func.coalesce(N.reencauches, 0)
MONTADA = N.estado == "INSTALADO"
BAJA = N.estado == "BAJA"


# ─── Modelos de respuesta ─────────────────────────────────────────────────────

class Opcion(BaseModel):
    valor: str
    cantidad: int
    marca: Optional[str] = None


class OpcionNumero(BaseModel):
    valor: int          # 0 = sin DOT válido
    cantidad: int


class OpcionesFiltro(BaseModel):
    marcas: List[Opcion]
    referencias: List[Opcion]
    medidas: List[Opcion]
    anios: List[OpcionNumero]
    semanas: List[OpcionNumero]


class Distribucion(BaseModel):
    reencauches: int
    cantidad: int


class IndiceReencauche(BaseModel):
    llantas: int
    ir: Optional[float] = None
    distribucion: List[Distribucion]


class Reparto(BaseModel):
    id: Optional[int] = None
    nombre: str
    cantidad: int
    porcentaje: float


class FilaCruce(BaseModel):
    categoria: str
    marca: Optional[str] = None
    total: int
    ir: Optional[float] = None
    # dano_id (o «null» para sin motivo) → cantidad
    por_dano: Dict[str, int]


class Mes(BaseModel):
    mes: str
    total: int
    por_dano: Dict[str, int]


class TableroDescarte(BaseModel):
    total: int
    ir: IndiceReencauche
    por_dano: List[Reparto]
    por_motivo_fin: List[Reparto]
    por_marca: List[FilaCruce]
    por_referencia: List[FilaCruce]
    mensual: List[Mes]


class FilaParque(BaseModel):
    categoria: str
    marca: Optional[str] = None
    llantas: int
    profundidad_promedio: Optional[float] = None
    bajo_minimo: int
    ir: Optional[float] = None


class TableroParque(BaseModel):
    llantas: int
    profundidad_minima: float
    bajo_minimo: int
    ir: IndiceReencauche
    por_marca: List[FilaParque]
    por_referencia: List[FilaParque]
    por_medida: List[FilaParque]


# ─── Utilidades ───────────────────────────────────────────────────────────────

def _base(f: FiltrosLlanta, *extra) -> list:
    return [*condiciones(f), *extra]


async def _indice(db: AsyncSession, donde: list) -> IndiceReencauche:
    filas = (await db.execute(
        select(REENC.label("r"), func.count().label("n")).where(and_(*donde)).group_by(REENC).order_by(REENC)
    )).all()
    total = sum(f.n for f in filas)
    suma = sum(f.r * f.n for f in filas)
    return IndiceReencauche(
        llantas=total, ir=round(suma / total, 2) if total else None,
        distribucion=[Distribucion(reencauches=f.r, cantidad=f.n) for f in filas])


def _reparto(conteos: Dict[Optional[int], int], nombres: Dict[int, str], total: int) -> List[Reparto]:
    salida = [Reparto(id=k, nombre=nombres.get(k, SIN_MOTIVO) if k is not None else SIN_MOTIVO,
                      cantidad=v, porcentaje=round(100 * v / total, 1) if total else 0.0)
              for k, v in conteos.items()]
    return sorted(salida, key=lambda r: (-r.cantidad, r.nombre))


def _clave_dano(d: Optional[int]) -> str:
    return str(d) if d is not None else "null"


# ─── Opciones de los filtros ──────────────────────────────────────────────────

@router.get("/opciones-filtro", response_model=OpcionesFiltro)
async def opciones_filtro(
    alcance: str = Query("TODAS", description="TODAS, BAJA o MONTADAS"),
    marca: Optional[List[str]] = Query(None, description="Marcas elegidas: acotan las referencias"),
    db: AsyncSession = Depends(get_db),
):
    """Los valores que se pueden elegir en cada filtro, con cuántas llantas
    tiene cada uno. Salen de los datos de la empresa, no de una lista fija."""
    alcance = (alcance or "TODAS").upper()
    donde = [BAJA] if alcance == "BAJA" else [MONTADA] if alcance == "MONTADAS" else []

    async def conteo(col, *extra):
        q = (select(func.max(func.trim(col)).label("v"), func.count().label("n"))
             .where(col.isnot(None), func.trim(col) != "", *donde, *extra)
             .group_by(clave(col)).order_by(func.max(func.trim(col))))
        return [Opcion(valor=f.v, cantidad=f.n) for f in (await db.execute(q)).all()]

    marcas = await conteo(N.marca)
    elegidas = [m.strip().upper() for m in (marca or []) if m and m.strip()]
    q = (select(func.max(func.trim(N.marca)).label("m"), func.max(func.trim(N.referencia)).label("r"),
                func.count().label("n"))
         .where(N.referencia.isnot(None), func.trim(N.referencia) != "", *donde,
                *([clave(N.marca).in_(elegidas)] if elegidas else []))
         .group_by(clave(N.marca), clave(N.referencia)))
    referencias = sorted(
        (Opcion(valor=etiqueta_referencia(f.m, f.r), marca=f.m, cantidad=f.n) for f in (await db.execute(q)).all()),
        key=lambda o: o.valor.upper())

    async def por_dot(col):
        # El 0 va literal: como parámetro, Postgres no reconoce que el SELECT y
        # el GROUP BY son la misma expresión.
        v = func.coalesce(col, literal_column(str(SIN_DOT)))
        q = select(v.label("v"), func.count().label("n")).where(*donde).group_by(v).order_by(v)
        return [OpcionNumero(valor=f.v, cantidad=f.n) for f in (await db.execute(q)).all()]

    return OpcionesFiltro(marcas=marcas, referencias=referencias, medidas=await conteo(N.medida),
                          anios=await por_dot(N.dot_anio), semanas=await por_dot(N.dot_semana))


# ─── Pila de descarte ─────────────────────────────────────────────────────────

@router.get("/descarte", response_model=TableroDescarte)
async def tablero_descarte(
    desde: Optional[date] = Query(None, description="Bajas desde esta fecha"),
    hasta: Optional[date] = Query(None, description="Bajas hasta esta fecha"),
    f: FiltrosLlanta = Depends(filtros_llanta),
    db: AsyncSession = Depends(get_db),
):
    """Por qué y qué se descarta: reparto por daño y por motivo de fin de vida,
    cruces de marca y referencia por daño, I.R. y evolución mensual."""
    donde = _base(f, BAJA)
    if desde:
        donde.append(N.fecha_baja >= desde)
    if hasta:
        donde.append(N.fecha_baja <= hasta)

    danos = {d.id: d.nombre for d in (await db.execute(select(EAMDanoNeumaticoCatalogo))).scalars()}
    motivos = {m.id: m.nombre for m in (await db.execute(select(EAMMotivoFinVida))).scalars()}

    por_dano = {f_.d: f_.n for f_ in (await db.execute(
        select(N.dano_id.label("d"), func.count().label("n")).where(*donde).group_by(N.dano_id))).all()}
    total = sum(por_dano.values())
    por_motivo = {f_.d: f_.n for f_ in (await db.execute(
        select(N.motivo_fin_vida_id.label("d"), func.count().label("n")).where(*donde)
        .group_by(N.motivo_fin_vida_id))).all()}

    async def cruce(cols_clave, cols_rotulo, tope) -> List[FilaCruce]:
        q = (select(*[func.max(func.trim(c)).label(f"r{i}") for i, c in enumerate(cols_rotulo)],
                    N.dano_id.label("d"), func.count().label("n"), func.sum(REENC).label("s"))
             .where(*donde).group_by(*cols_clave, N.dano_id))
        grupos: Dict[tuple, dict] = {}
        for fila in (await db.execute(q)).all():
            rotulo = tuple(getattr(fila, f"r{i}") for i in range(len(cols_rotulo)))
            g = grupos.setdefault(rotulo, {"total": 0, "suma": 0, "danos": defaultdict(int)})
            g["total"] += fila.n
            g["suma"] += fila.s or 0
            g["danos"][_clave_dano(fila.d)] += fila.n
        orden = sorted(grupos.items(), key=lambda kv: -kv[1]["total"])
        principales, resto = orden[:tope], orden[tope:]
        if resto:
            otras = {"total": 0, "suma": 0, "danos": defaultdict(int)}
            for _, g in resto:
                otras["total"] += g["total"]
                otras["suma"] += g["suma"]
                for k, v in g["danos"].items():
                    otras["danos"][k] += v
            principales.append(((OTRAS,), otras))
        salida = []
        for rotulo, g in principales:
            if len(rotulo) == 2:
                categoria, marca = etiqueta_referencia(rotulo[0], rotulo[1]) or SIN_DATO, rotulo[0]
            else:
                categoria, marca = rotulo[0] or SIN_DATO, None
            salida.append(FilaCruce(categoria=categoria, marca=marca, total=g["total"],
                                    ir=round(g["suma"] / g["total"], 2) if g["total"] else None,
                                    por_dano=dict(g["danos"])))
        return salida

    mes = func.to_char(N.fecha_baja, "YYYY-MM")
    mensual: Dict[str, Mes] = {}
    for fila in (await db.execute(
        select(mes.label("m"), N.dano_id.label("d"), func.count().label("n"))
        .where(*donde, N.fecha_baja.isnot(None)).group_by(mes, N.dano_id).order_by(mes)
    )).all():
        m = mensual.setdefault(fila.m, Mes(mes=fila.m, total=0, por_dano={}))
        m.total += fila.n
        m.por_dano[_clave_dano(fila.d)] = m.por_dano.get(_clave_dano(fila.d), 0) + fila.n

    return TableroDescarte(
        total=total,
        ir=await _indice(db, donde),
        por_dano=_reparto(por_dano, danos, total),
        por_motivo_fin=_reparto(por_motivo, motivos, total),
        por_marca=await cruce([clave(N.marca)], [N.marca], TOPE_MARCAS),
        por_referencia=await cruce([clave(N.marca), clave(N.referencia)], [N.marca, N.referencia],
                                   TOPE_REFERENCIAS),
        mensual=list(mensual.values()),
    )


# ─── Parque montado (llantas a piso) ──────────────────────────────────────────

@router.get("/parque", response_model=TableroParque)
async def tablero_parque(
    f: FiltrosLlanta = Depends(filtros_llanta),
    db: AsyncSession = Depends(get_db),
):
    """Las llantas montadas por marca, referencia y dimensión: cuántas hay, su
    profundidad promedio (la última conocida, que es la de su última
    inspección), cuántas están bajo el mínimo y su I.R. a piso."""
    cfg = await db.get(EAMNeumaticoConfig, 1)
    minimo = float(cfg.profundidad_minima) if cfg and cfg.profundidad_minima is not None else 3.0
    donde = _base(f, MONTADA)
    bajo = func.count().filter(N.profundidad_actual <= minimo)

    async def grupo(cols_clave, cols_rotulo) -> List[FilaParque]:
        q = (select(*[func.max(func.trim(c)).label(f"r{i}") for i, c in enumerate(cols_rotulo)],
                    func.count().label("n"), func.avg(N.profundidad_actual).label("p"),
                    bajo.label("b"), func.avg(REENC).label("ir"))
             .where(*donde).group_by(*cols_clave).order_by(func.count().desc()))
        salida = []
        for fila in (await db.execute(q)).all():
            if len(cols_rotulo) == 2:
                categoria, marca = etiqueta_referencia(fila.r0, fila.r1) or SIN_DATO, fila.r0
            else:
                categoria, marca = fila.r0 or SIN_DATO, None
            salida.append(FilaParque(
                categoria=categoria, marca=marca, llantas=fila.n,
                profundidad_promedio=round(float(fila.p), 1) if fila.p is not None else None,
                bajo_minimo=fila.b, ir=round(float(fila.ir), 2) if fila.ir is not None else None))
        return salida

    tot = (await db.execute(select(func.count(), bajo).where(*donde))).one()
    return TableroParque(
        llantas=tot[0], profundidad_minima=minimo, bajo_minimo=tot[1],
        ir=await _indice(db, donde),
        por_marca=await grupo([clave(N.marca)], [N.marca]),
        por_referencia=await grupo([clave(N.marca), clave(N.referencia)], [N.marca, N.referencia]),
        por_medida=await grupo([clave(N.medida)], [N.medida]),
    )


# ─── Informe PDF de flota ─────────────────────────────────────────────────────

class InformeFlotaIn(BaseModel):
    activo_ids: Optional[List[int]] = None
    tipos_vehiculo: Optional[List[str]] = None
    marca: Optional[List[str]] = None
    referencia: Optional[List[str]] = None
    medida: Optional[List[str]] = None
    anio_fabricacion: Optional[List[int]] = None
    semana_fabricacion: Optional[List[int]] = None
    desde: Optional[date] = None
    hasta: Optional[date] = None


class TrabajoInforme(BaseModel):
    trabajo_id: int
    estado: str
    vehiculos: int
    error: Optional[str] = None


async def _empresa(db: AsyncSession) -> Tuple[str, Optional[str]]:
    """Nombre de la empresa y la ruta local de su logo (el que subió su
    administrador, o el externo descargado una vez)."""
    from app.core import logo_empresa
    from app.core.tenant import esquema_actual
    fila = (await db.execute(text("SELECT codigo, nombre, logo_url FROM public.plataforma_cliente WHERE esquema = :e"),
                             {"e": esquema_actual() or "public"})).first()
    if fila is None:
        return "", None
    return fila.nombre, await logo_empresa.para_pdf(fila.codigo, fila.logo_url)


@router.post("/informe-flota")
async def informe_flota(data: InformeFlotaIn, db: AsyncSession = Depends(get_db),
                        yo: Usuario = Depends(get_current_user)):
    """El informe PDF del estado de llantas de la flota con la última
    inspección. Hasta 200 vehículos responde el PDF; con más, lo encola y
    devuelve el trabajo (202) para consultar su estado y descargarlo después."""
    empresa, logo = await _empresa(db)
    p = {**data.model_dump(mode="json"), "empresa": empresa, "logo": logo,
         "usuario": f"{yo.nombre} {getattr(yo, 'apellido', '') or ''}".strip() or yo.username}
    flota = await flota_de(db, p)
    if not flota:
        raise HTTPException(404, "No hay vehículos con esquema de llantas que cumplan el filtro.")
    if len(flota) <= DIRECTO_MAX:
        pdf, _ = await armar(db, p, flota)
        nombre = f"estado-llantas-flota-{date.today():%Y%m%d}.pdf"
        return Response(pdf, media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{nombre}"'})
    t = EAMInformeFlotaTrabajo(parametros=p, vehiculos=len(flota), usuario_id=yo.id, estado="PENDIENTE")
    db.add(t)
    await db.commit()
    return JSONResponse(status_code=202, content=TrabajoInforme(
        trabajo_id=t.id, estado=t.estado, vehiculos=t.vehiculos).model_dump())


@router.get("/informe-flota/trabajos/{tid}", response_model=TrabajoInforme)
async def estado_informe(tid: int, db: AsyncSession = Depends(get_db)):
    t = await db.get(EAMInformeFlotaTrabajo, tid)
    if t is None:
        raise HTTPException(404, "Informe no encontrado")
    return TrabajoInforme(trabajo_id=t.id, estado=t.estado, vehiculos=t.vehiculos,
                          error=t.error if t.estado == "FALLIDO" else None)


@router.get("/informe-flota/trabajos/{tid}/archivo")
async def descargar_informe(tid: int, db: AsyncSession = Depends(get_db)):
    t = await db.get(EAMInformeFlotaTrabajo, tid)
    if t is None or t.estado != "LISTO" or not t.archivo or not Path(t.archivo).is_file():
        raise HTTPException(404, "El informe todavía no está listo")
    return FileResponse(t.archivo, media_type="application/pdf",
                        filename=f"estado-llantas-flota-{t.created_at:%Y%m%d}-{t.id}.pdf")
