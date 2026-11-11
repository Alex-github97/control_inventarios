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
from datetime import date, datetime, timedelta
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


class ResumenDisposicion(BaseModel):
    """Lo que solo se sabe al examinar la carcasa (registros de disposición final)."""
    registradas: int
    profundidad_remanente: Optional[float] = None     # mm promedio de la menor medición
    mm_desperdiciados: Optional[float] = None         # remanente sobre el mínimo legal, sumado
    con_reparaciones: int = 0
    regrabadas: int = 0
    con_fotos: int = 0


class TableroDescarte(BaseModel):
    total: int
    ir: IndiceReencauche
    por_dano: List[Reparto]
    por_motivo_fin: List[Reparto]
    por_marca: List[FilaCruce]
    por_referencia: List[FilaCruce]
    mensual: List[Mes]
    # Ejes del catálogo de daños: dónde, qué avería, por qué, qué grupo y de quién.
    por_ubicacion: List[Reparto] = []
    por_categoria: List[Reparto] = []
    por_causa: List[Reparto] = []
    por_motivo_dano: List[Reparto] = []
    por_responsable: List[Reparto] = []
    por_medida: List[FilaCruce] = []
    por_vida: List[Reparto] = []
    disposicion: Optional[ResumenDisposicion] = None


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

    catalogo = {d.id: d for d in (await db.execute(select(EAMDanoNeumaticoCatalogo))).scalars()}
    danos = {k: (f"{d.codigo} · {d.nombre}" if d.codigo else d.nombre) for k, d in catalogo.items()}
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

    def por_eje(atributo: str) -> List[Reparto]:
        import unicodedata
        conteo: Dict[str, int] = defaultdict(int)
        rotulo: Dict[str, str] = {}
        for d, n_ in por_dano.items():
            valor = getattr(catalogo.get(d), atributo, None) if d is not None else None
            texto = " ".join((valor or "").strip().upper().split()) or SIN_DATO
            # «MALA REPARACIÓN» y «MALA REPARACION» son el mismo grupo.
            k = unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode()
            conteo[k] += n_
            if k not in rotulo or texto != k:      # se prefiere el rótulo con tilde
                rotulo[k] = texto
        # Las bajas sin código clasificado no dicen nada de este eje: se dejan
        # fuera y el porcentaje es sobre las clasificadas.
        conteo = {rotulo[k]: v for k, v in conteo.items() if rotulo[k] != SIN_DATO}
        base = sum(conteo.values())
        salida = [Reparto(nombre=k, cantidad=v, porcentaje=round(100 * v / base, 1) if base else 0.0)
                  for k, v in conteo.items()]
        return sorted(salida, key=lambda r: (-r.cantidad, r.nombre))

    por_vida = {f_.r: f_.n for f_ in (await db.execute(
        select(REENC.label("r"), func.count().label("n")).where(*donde).group_by(REENC))).all()}
    vidas = [Reparto(id=r, nombre="Original" if r == 0 else f"Reencauche {r}", cantidad=c,
                     porcentaje=round(100 * c / total, 1) if total else 0.0) for r, c in sorted(por_vida.items())]

    # Disposición final: solo las llantas del filtro que tienen su registro.
    from app.infrastructure.models.eam import EAMNeumaticoDisposicion as Disp, EAMNeumaticoFoto as Foto
    menor = func.least(func.coalesce(Disp.profundidad_interna, 99), func.coalesce(Disp.profundidad_central, 99),
                       func.coalesce(Disp.profundidad_externa, 99))
    medida = func.nullif(menor, 99)
    cfg = await db.get(EAMNeumaticoConfig, 1)
    minimo = float(cfg.profundidad_minima) if cfg and cfg.profundidad_minima is not None else 3.0
    con_foto = select(Foto.neumatico_id).distinct().subquery()
    r = (await db.execute(
        select(func.count(), func.avg(medida), func.sum(func.greatest(medida - minimo, 0)),
               func.count().filter(Disp.reparaciones > 0), func.count().filter(Disp.regrabada.is_(True)),
               func.count(con_foto.c.neumatico_id))
        .select_from(Disp).join(N, N.id == Disp.neumatico_id)
        .outerjoin(con_foto, con_foto.c.neumatico_id == N.id).where(*donde))).one()
    disposicion = ResumenDisposicion(
        registradas=r[0], profundidad_remanente=round(float(r[1]), 1) if r[1] is not None else None,
        mm_desperdiciados=round(float(r[2]), 1) if r[2] is not None else None,
        con_reparaciones=r[3] or 0, regrabadas=r[4] or 0, con_fotos=r[5] or 0)

    return TableroDescarte(
        total=total,
        ir=await _indice(db, donde),
        por_dano=_reparto(por_dano, danos, total),
        por_ubicacion=por_eje("ubicacion"),
        por_categoria=por_eje("categoria"),
        por_causa=por_eje("causa"),
        por_motivo_dano=por_eje("motivo"),
        por_responsable=por_eje("responsable"),
        por_medida=await cruce([clave(N.medida)], [N.medida], TOPE_MARCAS),
        por_vida=vidas,
        disposicion=disposicion,
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


# ─── Informes PDF de rendimiento y composición ────────────────────────────────

ALCANCE_TEXTO = {"TODAS": "Todas las vidas", "TERMINADAS": "Vidas terminadas", "EN_SERVICIO": "Vidas en servicio"}


def _describir(tipo: str, alcance: str, desde: Optional[date], hasta: Optional[date], km_minimo: float,
               f: FiltrosLlanta) -> Tuple[str, str]:
    """El periodo (para la portada) y el alcance con los filtros (para el pie)."""
    periodo = (f"Del {desde:%d/%m/%Y} al {hasta:%d/%m/%Y}" if desde and hasta else
               f"Desde el {desde:%d/%m/%Y}" if desde else f"Hasta el {hasta:%d/%m/%Y}" if hasta else "Todo el histórico")
    if tipo == "COMPOSICION":
        return f"Corte al {date.today():%d/%m/%Y}", "Llantas montadas en vehículos"
    partes = [ALCANCE_TEXTO.get(alcance, alcance), periodo.lower() if periodo != "Todo el histórico" else "todo el histórico",
              f"mínimo {km_minimo:,.0f} km por vida".replace(",", ".")]
    for nombre, valores in (("marca", f.marcas), ("referencia", f.referencias), ("medida", f.medidas),
                            ("año DOT", f.anios), ("semana DOT", f.semanas)):
        if valores:
            partes.append(f"{nombre}: {', '.join(str(v) for v in valores[:4])}{'…' if len(valores) > 4 else ''}")
    return periodo, " · ".join(partes)


async def _composicion(db: AsyncSession) -> Tuple[Dict[str, List[Tuple[str, int]]], int]:
    """El parque montado contado en SQL por marca, medida, referencia, vida y uso."""
    async def contar(*cols, rotulo=None):
        q = (select(*[func.max(func.trim(c)) for c in cols], func.count())
             .where(MONTADA).group_by(*[clave(c) for c in cols]).order_by(func.count().desc()))
        filas = (await db.execute(q)).all()
        return [((rotulo(*fila[:-1]) if rotulo else fila[0]) or SIN_DATO, fila[-1]) for fila in filas]

    total = (await db.execute(select(func.count()).where(MONTADA))).scalar_one()
    vidas = (await db.execute(select(REENC, func.count()).where(MONTADA).group_by(REENC).order_by(REENC))).all()
    return {
        "Marca": await contar(N.marca),
        "Medida": await contar(N.medida),
        "Referencia": await contar(N.marca, N.referencia, rotulo=etiqueta_referencia),
        "Vida": [("VN" if r == 0 else f"R{r}", n) for r, n in vidas],
        "Tipo de uso": await contar(N.tipo_uso),
    }, total


@router.post("/informe-pdf")
async def informe_pdf(
    tipo: str = Query(..., description="TABLERO, CPK, KM, KM_MM, VIDAS o COMPOSICION"),
    alcance: str = Query("TODAS"),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    km_minimo: float = Query(1000, ge=0),
    muestra: int = Query(5, ge=1),
    dimension: str = Query("marca"),
    f: FiltrosLlanta = Depends(filtros_llanta),
    db: AsyncSession = Depends(get_db),
    yo: Usuario = Depends(get_current_user),
):
    """Informe PDF de consultoría (portada, resumen ejecutivo con hallazgos y
    una página por idea) de los informes de rendimiento y composición. Usa los
    mismos cálculos que la pantalla, con los mismos filtros."""
    import asyncio
    from datetime import datetime

    from app.api.v1.endpoints.eam_neumaticos_informes import _alcance, _filtrar, _llantas_del_filtro, _vidas
    from app.core import informe_rendimiento_pdf as irp
    from app.core.pdf_marca import Encabezado
    from app.core.rendimiento_llantas import DIMENSIONES, agrupar, resumir

    tipo = (tipo or "").upper()
    if tipo not in irp.TIPOS:
        raise HTTPException(400, f"Informe desconocido: {tipo}")
    alcance = _alcance(alcance)
    if dimension not in {c for c, _ in DIMENSIONES}:
        dimension = "marca"
    periodo, descripcion = _describir(tipo, alcance, desde, hasta, km_minimo, f)
    datos = irp.Datos(dimension=dimension, muestra=muestra, descripcion=descripcion)

    if tipo in ("TABLERO", "COMPOSICION"):
        datos.parque = (await tablero_parque(f=f if tipo == "TABLERO" else FiltrosLlanta(), db=db)).model_dump()
    if tipo == "COMPOSICION":
        datos.composicion, datos.composicion_total = await _composicion(db)
    else:
        todas = await _vidas(db)
        llantas = await _llantas_del_filtro(db, f)

        def calcular():
            vidas = _filtrar(todas, alcance, desde, hasta, llantas)
            rend = {"resumen": resumir(vidas, km_minimo),
                    "dimensiones": [{"clave": c, "nombre": n, "grupos": agrupar(vidas, c, km_minimo)}
                                    for c, n in DIMENSIONES]}
            resumen_v = None
            if tipo == "VIDAS":
                resumen_v = irp.resumen_vidas([
                    {"codigo": v.codigo, "vida": v.vida, "terminada": v.terminada, "km": v.km, "cpk": v.cpk,
                     "km_mm": v.km_mm, "motivo_fin": v.categorias.get("motivo_fin"),
                     "marca": v.categorias.get("marca"), "medida": v.categorias.get("medida"),
                     "vehiculo": v.categorias.get("vehiculo")} for v in vidas], km_minimo)
            return rend, resumen_v
        datos.rendimiento, datos.vidas = await asyncio.to_thread(calcular)

    empresa, logo = await _empresa(db)
    enc = Encabezado(empresa=empresa, periodo=periodo, generado_en=datetime.now(), logo=logo,
                     generado_por=f"{yo.nombre} {getattr(yo, 'apellido', '') or ''}".strip() or yo.username)
    pdf = await asyncio.to_thread(irp.generar, tipo, datos, enc)
    nombre = f"llantas-{tipo.lower().replace('_', '-')}-{date.today():%Y%m%d}.pdf"
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{nombre}"'})


# ─── Estado de llantas a piso y composición por vida ──────────────────────────

AGRUPACIONES = {"DIA": ("day", 31), "SEMANA": ("week", 7 * 13), "MES": ("month", 365), "ANIO": ("year", 365 * 5)}


class PeriodoEstado(BaseModel):
    periodo: date
    critica: int
    moderada: int
    buena: int
    sin_medida: int
    total: int


class EstadoPiso(BaseModel):
    agrupacion: str
    desde: date
    hasta: date
    rango_critico_mm: float
    rango_moderado_mm: float
    periodos: List[PeriodoEstado]


@router.get("/estado-piso", response_model=EstadoPiso)
async def estado_piso(
    agrupacion: str = Query("MES", description="DIA, SEMANA, MES o ANIO"),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    activo_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Cuántas llantas había en cada rango de profundidad, periodo por periodo.

    Cada llanta cuenta una vez por periodo, con su ÚLTIMA inspección del periodo
    y la profundidad del surco más gastado (la que decide si sigue rodando). Los
    rangos son los de la configuración: hasta el crítico, hasta el moderado y por
    encima buen estado. Sin fechas: el último mes por día, trece semanas, doce
    meses o cinco años.
    """
    agrupacion = agrupacion.upper()
    if agrupacion not in AGRUPACIONES:
        raise HTTPException(422, "La agrupación es DIA, SEMANA, MES o ANIO.")
    trunc, dias_defecto = AGRUPACIONES[agrupacion]
    hasta = hasta or date.today()
    desde = desde or (hasta - timedelta(days=dias_defecto))
    if desde > hasta:
        raise HTTPException(422, "La fecha inicial es posterior a la final.")
    if agrupacion == "DIA" and (hasta - desde).days > 366:
        raise HTTPException(422, "Por día se muestra hasta un año: agrupe por semana o por mes.")
    cfg = (await db.execute(select(EAMNeumaticoConfig).order_by(EAMNeumaticoConfig.id).limit(1))).scalar()
    critico = float(cfg.rango_critico_mm if cfg and cfg.rango_critico_mm is not None else 3.0)
    moderado = float(cfg.rango_moderado_mm if cfg and cfg.rango_moderado_mm is not None else 6.0)
    filtro_activo = "AND n.activo_id = :activo" if activo_id else ""
    filas = (await db.execute(text(f"""
        WITH ultima AS (
            SELECT DISTINCT ON (i.neumatico_id, date_trunc(:g, i.fecha))
                   date_trunc(:g, i.fecha)::date AS periodo,
                   LEAST(i.profundidad_izq, i.profundidad_centro, i.profundidad_der) AS prof
              FROM eam_inspeccion_neumatico i
              JOIN eam_neumatico n ON n.id = i.neumatico_id
             WHERE i.fecha >= :desde AND i.fecha < :hasta {filtro_activo}
             ORDER BY i.neumatico_id, date_trunc(:g, i.fecha), i.fecha DESC, i.id DESC)
        SELECT periodo,
               count(*) FILTER (WHERE prof <= :c),
               count(*) FILTER (WHERE prof > :c AND prof <= :m),
               count(*) FILTER (WHERE prof > :m),
               count(*) FILTER (WHERE prof IS NULL),
               count(*)
          FROM ultima GROUP BY periodo ORDER BY periodo"""),
        {"g": trunc, "desde": datetime.combine(desde, datetime.min.time()),
         "hasta": datetime.combine(hasta + timedelta(days=1), datetime.min.time()),
         "activo": activo_id, "c": critico, "m": moderado})).all()
    return EstadoPiso(agrupacion=agrupacion, desde=desde, hasta=hasta, rango_critico_mm=critico,
                      rango_moderado_mm=moderado,
                      periodos=[PeriodoEstado(periodo=p, critica=a, moderada=b, buena=c, sin_medida=d, total=t)
                                for p, a, b, c, d, t in filas])


class VidaCantidad(BaseModel):
    vida: str
    reencauches: int
    llantas: int


@router.get("/composicion-vida", response_model=List[VidaCantidad])
async def composicion_vida(activo_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    """Las llantas montadas por vida: nueva (VN) o el número de reencauches (R1, R2…)."""
    q = select(REENC, func.count()).where(MONTADA)
    if activo_id:
        q = q.where(N.activo_id == activo_id)
    filas = (await db.execute(q.group_by(REENC).order_by(REENC))).all()
    return [VidaCantidad(vida="VN" if r == 0 else f"R{r}", reencauches=r, llantas=n) for r, n in filas]
