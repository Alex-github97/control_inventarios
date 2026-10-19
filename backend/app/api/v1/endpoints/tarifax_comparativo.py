"""
TarifaX · Tablero comparativo: tarifas de clientes contra SICETAC, mes a mes.

- Las negociaciones (el consolidado comercial) se cargan como un archivo y
  reemplazan las anteriores.
- SICETAC se carga por mes (enero a diciembre de cada año). Cada archivo queda
  guardado, reducido a lo que usa el cruce, en el almacenamiento de la empresa.
- Además del cargado por meses, el tarifario vigente de TarifaX se usa como un
  periodo más («Tarifario TarifaX vigente»), para tener comparación desde el
  primer día.
- El cruce se recalcula al cargar cualquiera de las dos cosas, o al cambiar las
  equivalencias de ciudades, y queda guardado: el tablero solo consulta.
"""
import asyncio
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import delete, func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import tarifax_comparativo as tc
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.tenant import ESQUEMA_POR_DEFECTO, esquema_actual
from app.infrastructure.models.tarifax import (
    TarifaxAliasCiudad, TarifaxComparacion, TarifaxNegociacion, TarifaxSicetacPeriodo,
)
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/tarifax/comparativo", tags=["TarifaX · Comparativo"])

MAX_MB = 80
# Equivalencias que se siembran la primera vez: los nombres en que el
# consolidado comercial y SICETAC difieren con seguridad.
ALIAS_INICIALES = {
    "BOGOTA": "BOGOTA, D.C.", "CARTAGENA": "CARTAGENA DE INDIAS", "SIBERIA-FUNZA": "FUNZA",
    "GUADALAJARA DE BUGA": "BUGA", "EL ESPINAL": "ESPINAL",
}

_vigente_cache: Dict[str, object] = {}


def _carpeta() -> Path:
    esquema = re.sub(r"[^A-Za-z0-9_]", "_", esquema_actual() or ESQUEMA_POR_DEFECTO)
    d = Path(settings.UPLOAD_DIR) / "tarifax_sicetac" / esquema
    d.mkdir(parents=True, exist_ok=True)
    return d


async def _leer_archivo(archivo: UploadFile) -> bytes:
    contenido = await archivo.read()
    if not contenido:
        raise HTTPException(422, "El archivo está vacío.")
    if len(contenido) > MAX_MB * 1024 * 1024:
        raise HTTPException(422, f"El archivo pesa más de {MAX_MB} MB.")
    nombre = (archivo.filename or "").lower()
    if not nombre.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(422, "Se aceptan archivos de Excel (.xlsx, .xls) o .csv.")
    return contenido


def _sicetac_vigente() -> Optional[pd.DataFrame]:
    """El tarifario de TarifaX agrupado como un periodo más. Se agrupa una vez
    por versión del archivo (si lo reemplazan, cambia la fecha y se recalcula)."""
    from app.api.v1.endpoints.tarifax import DF1_PATH, _load_df1
    if not DF1_PATH.exists():
        return None
    marca = DF1_PATH.stat().st_mtime
    if _vigente_cache.get("marca") != marca:
        _vigente_cache["df"] = tc.agrupar_sicetac(_load_df1())
        _vigente_cache["marca"] = marca
    return _vigente_cache["df"]


def _mapeo() -> Dict[str, str]:
    from app.api.v1.endpoints.tarifax import _load_mapeo_raw
    return _load_mapeo_raw()


async def _alias(db: AsyncSession) -> Dict[str, str]:
    filas = (await db.execute(select(TarifaxAliasCiudad))).scalars().all()
    if not filas:
        for k, v in ALIAS_INICIALES.items():
            db.add(TarifaxAliasCiudad(nombre=k, equivale_a=v))
        await db.flush()
        return dict(ALIAS_INICIALES)
    return {f.nombre: f.equivale_a for f in filas}


async def _recalcular(db: AsyncSession, periodos: Optional[List[str]] = None) -> Dict[str, int]:
    """Rehace el cruce de los periodos indicados (todos si no se indica)."""
    negs = [dict(id=n.id, cliente=n.cliente, servicio=n.servicio, origen=n.origen, destino=n.destino,
                 categoria_vehiculo=n.categoria_vehiculo, tarifa=n.tarifa)
            for n in (await db.execute(select(TarifaxNegociacion))).scalars()]
    alias, mapeo = await _alias(db), _mapeo()
    registrados = {p.periodo: p for p in (await db.execute(select(TarifaxSicetacPeriodo))).scalars()}
    objetivo = periodos or (["VIGENTE"] + sorted(registrados))
    resumen = {}
    for periodo in objetivo:
        if periodo == "VIGENTE":
            sic = await asyncio.to_thread(_sicetac_vigente)
        else:
            reg = registrados.get(periodo)
            sic = await asyncio.to_thread(pd.read_pickle, reg.ruta, compression="gzip") if reg and Path(reg.ruta).exists() else None
        await db.execute(delete(TarifaxComparacion).where(TarifaxComparacion.periodo == periodo))
        if sic is None or not negs:
            resumen[periodo] = 0
            continue
        filas = await asyncio.to_thread(tc.cruzar, negs, sic, alias, mapeo, periodo)
        for i in range(0, len(filas), 5000):
            await db.execute(insert(TarifaxComparacion), filas[i:i + 5000])
        resumen[periodo] = len(filas)
    return resumen


# ─── Estado ───────────────────────────────────────────────────────────────────

@router.get("/estado")
async def estado(anio: int = Query(default_factory=lambda: datetime.now().year),
                 db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    total = (await db.execute(select(func.count(TarifaxNegociacion.id)))).scalar() or 0
    comparables = (await db.execute(select(func.count(TarifaxNegociacion.id)).where(
        TarifaxNegociacion.categoria_vehiculo.isnot(None)))).scalar() or 0
    clientes = (await db.execute(select(func.count(func.distinct(TarifaxNegociacion.cliente))))).scalar() or 0
    ultima = (await db.execute(select(TarifaxNegociacion.archivo, TarifaxNegociacion.created_at)
                               .order_by(TarifaxNegociacion.id.desc()).limit(1))).first()
    regs = {p.periodo: p for p in (await db.execute(select(TarifaxSicetacPeriodo))).scalars()}
    anios = sorted({p.anio for p in regs.values()} | {anio, datetime.now().year})
    meses = []
    for m in range(1, 13):
        per = f"{anio}-{m:02d}"
        r = regs.get(per)
        meses.append({"periodo": per, "mes": m, "nombre": tc.MESES[m - 1], "cargado": bool(r),
                      "archivo": r.archivo if r else None, "filas": r.filas if r else 0,
                      "rutas": r.rutas if r else 0,
                      "cargado_en": r.updated_at.isoformat() if r and r.updated_at else None,
                      "usuario": r.usuario if r else None})
    from app.api.v1.endpoints.tarifax import DF1_PATH
    return {"negociaciones": {"total": total, "comparables": comparables, "clientes": clientes,
                              "archivo": ultima[0] if ultima else None,
                              "cargado_en": ultima[1].isoformat() if ultima and ultima[1] else None},
            "anio": anio, "anios": anios, "meses": meses, "vigente": DF1_PATH.exists()}


# ─── Cargas ───────────────────────────────────────────────────────────────────

@router.post("/negociaciones")
async def cargar_negociaciones(archivo: UploadFile = File(...), db: AsyncSession = Depends(get_db),
                               _: Usuario = Depends(get_current_user)):
    """Reemplaza las tarifas negociadas por las del archivo y recalcula el cruce."""
    contenido = await _leer_archivo(archivo)
    try:
        df = await asyncio.to_thread(tc.leer_negociaciones, contenido, archivo.filename or "")
    except tc.ArchivoInvalido as e:
        raise HTTPException(422, str(e))
    await db.execute(delete(TarifaxComparacion))
    await db.execute(delete(TarifaxNegociacion))
    registros = _registros(df)
    for r in registros:
        r["archivo"] = archivo.filename
    for i in range(0, len(registros), 5000):
        await db.execute(insert(TarifaxNegociacion), registros[i:i + 5000])
    await db.flush()
    resumen = await _recalcular(db)
    await db.commit()
    comparables = int(df["categoria_vehiculo"].notna().sum())
    return {"filas": len(df), "comparables": comparables, "clientes": int(df["cliente"].nunique()),
            "no_comparables": len(df) - comparables, "periodos": resumen}


@router.post("/sicetac/{anio}/{mes}")
async def cargar_sicetac(anio: int, mes: int, archivo: UploadFile = File(...),
                         db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    """Carga (o reemplaza) el SICETAC de un mes y cruza las negociaciones con él."""
    if not 1 <= mes <= 12 or not 2000 <= anio <= 2100:
        raise HTTPException(422, "Mes o año fuera de rango.")
    contenido = await _leer_archivo(archivo)
    try:
        sic = await asyncio.to_thread(tc.leer_sicetac, contenido, archivo.filename or "")
    except tc.ArchivoInvalido as e:
        raise HTTPException(422, str(e))
    periodo = f"{anio}-{mes:02d}"
    ruta = _carpeta() / f"{periodo}.pkl.gz"
    await asyncio.to_thread(sic.to_pickle, ruta, compression="gzip")
    reg = (await db.execute(select(TarifaxSicetacPeriodo).where(TarifaxSicetacPeriodo.periodo == periodo))).scalar_one_or_none()
    if reg is None:
        reg = TarifaxSicetacPeriodo(periodo=periodo, anio=anio, mes=mes, ruta=str(ruta))
        db.add(reg)
    reg.archivo, reg.ruta, reg.filas = archivo.filename, str(ruta), len(sic)
    reg.rutas = int(sic[["o", "d"]].drop_duplicates().shape[0])
    reg.usuario = yo.username
    reg.updated_at = datetime.now(timezone.utc)
    await db.flush()
    resumen = await _recalcular(db, [periodo])
    await db.commit()
    ok = (await db.execute(select(func.count(func.distinct(TarifaxComparacion.negociacion_id))).where(
        TarifaxComparacion.periodo == periodo, TarifaxComparacion.estado == "OK"))).scalar() or 0
    return {"periodo": periodo, "nombre": tc.nombre_periodo(periodo), "rutas": reg.rutas,
            "combinaciones": len(sic), "filas_cruce": resumen.get(periodo, 0), "tarifas_con_referencia": ok}


@router.delete("/sicetac/{anio}/{mes}")
async def borrar_sicetac(anio: int, mes: int, db: AsyncSession = Depends(get_db),
                         _: Usuario = Depends(get_current_user)):
    periodo = f"{anio}-{mes:02d}"
    reg = (await db.execute(select(TarifaxSicetacPeriodo).where(TarifaxSicetacPeriodo.periodo == periodo))).scalar_one_or_none()
    if reg is None:
        raise HTTPException(404, "Ese mes no está cargado.")
    await db.execute(delete(TarifaxComparacion).where(TarifaxComparacion.periodo == periodo))
    Path(reg.ruta).unlink(missing_ok=True)
    await db.delete(reg)
    await db.commit()
    return {"ok": True}


@router.post("/recalcular")
async def recalcular(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Rehace todo el cruce: tras cambiar equivalencias de ciudades o el mapeo de vehículos."""
    resumen = await _recalcular(db)
    await db.commit()
    return {"periodos": resumen}


# ─── Equivalencias de ciudades ────────────────────────────────────────────────

class AliasIn(BaseModel):
    alias: Dict[str, str]


@router.get("/alias")
async def ver_alias(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    a = await _alias(db)
    await db.commit()
    return a


@router.put("/alias")
async def guardar_alias(data: AliasIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    limpio = {tc.normalizar(k): tc.normalizar(v) for k, v in data.alias.items() if tc.normalizar(k) and tc.normalizar(v)}
    await db.execute(delete(TarifaxAliasCiudad))
    for k, v in limpio.items():
        db.add(TarifaxAliasCiudad(nombre=k, equivale_a=v))
    await db.flush()
    resumen = await _recalcular(db)
    await db.commit()
    return {"alias": len(limpio), "periodos": resumen}


# ─── Tablero ──────────────────────────────────────────────────────────────────

def _registros(df: pd.DataFrame) -> List[dict]:
    """Filas listas para JSON: los vacíos de pandas (NaN) pasan a None."""
    return df.astype(object).where(pd.notna(df), None).to_dict("records")


def _lista(v: Optional[str]) -> List[str]:
    return [x for x in (v or "").split("|") if x]


def _ponderada(t: pd.Series, s: pd.Series) -> Optional[float]:
    """Variación del conjunto: total cobrado contra total SICETAC (no promedio de porcentajes)."""
    st = float(s.sum())
    return round((float(t.sum()) - st) / st * 100, 2) if st else None


@router.get("/tablero")
async def tablero(periodos: Optional[str] = None, clientes: Optional[str] = None, origenes: Optional[str] = None,
                  destinos: Optional[str] = None, servicios: Optional[str] = None, categorias: Optional[str] = None,
                  carroceria: str = "FURGON", db: AsyncSession = Depends(get_db),
                  _: Usuario = Depends(get_current_user)):
    """Todo lo que pinta el tablero, con los filtros aplicados. Los filtros van
    separados por «|». La carrocería se elige una: SICETAC cambia el costo
    según la carrocería y mezclarlas promediaría cosas distintas."""
    C = TarifaxComparacion
    q = select(C.periodo, C.cliente, C.servicio, C.origen, C.destino, C.categoria, C.tipo_vehiculo,
               C.carroceria, C.distancia, C.tarifa_cliente, C.costo_sicetac, C.diferencia, C.variacion_pct, C.estado)
    rows = (await db.execute(q.where((C.carroceria == carroceria) | (C.estado != "OK")))).all()
    carrocerias = [r for (r,) in (await db.execute(select(C.carroceria).where(C.carroceria.isnot(None)).distinct()))]
    cols = ["periodo", "cliente", "servicio", "origen", "destino", "categoria", "tipo_vehiculo", "carroceria",
            "distancia", "tarifa", "sicetac", "diferencia", "variacion", "estado"]
    df = pd.DataFrame(rows, columns=cols)
    vacio = {"opciones": {"periodos": [], "clientes": [], "origenes": [], "destinos": [], "servicios": [],
                          "categorias": [], "carrocerias": sorted(carrocerias)},
             "kpis": None, "por_mes": [], "por_cliente": [], "por_categoria": [], "detalle": [], "sin_referencia": [],
             "sin_referencia_total": 0, "carroceria": carroceria}
    if df.empty:
        return vacio

    def opciones(col):
        return sorted(df[col].dropna().unique().tolist())
    orden_per = sorted(df["periodo"].unique(), key=lambda p: (p != "VIGENTE", p))
    vacio["opciones"].update({"periodos": [{"periodo": p, "nombre": tc.nombre_periodo(p)} for p in orden_per],
                              "clientes": opciones("cliente"), "origenes": opciones("origen"),
                              "destinos": opciones("destino"), "servicios": opciones("servicio"),
                              "categorias": opciones("categoria")})
    for col, val in (("periodo", periodos), ("cliente", clientes), ("origen", origenes), ("destino", destinos),
                     ("servicio", servicios), ("categoria", categorias)):
        sel = _lista(val)
        if sel:
            df = df[df[col].isin(sel)]
    ok = df[df["estado"] == "OK"]
    sin = df[df["estado"] != "OK"].drop_duplicates(["cliente", "origen", "destino", "categoria"])
    if ok.empty:
        vacio.update({"sin_referencia": sin.head(500).pipe(_registros),
                      "sin_referencia_total": len(sin)})
        return vacio
    rutas = ok[["origen", "destino"]].drop_duplicates()
    kpis = {
        "tarifas": int(len(ok)), "clientes": int(ok["cliente"].nunique()), "rutas": int(len(rutas)),
        "variacion": _ponderada(ok["tarifa"], ok["sicetac"]),
        "mediana": round(float(ok["variacion"].median()), 2),
        "por_debajo": int((ok["variacion"] < 0).sum()),
        "por_debajo_pct": round(float((ok["variacion"] < 0).mean() * 100), 1),
        "tarifa_total": float(ok["tarifa"].sum()), "sicetac_total": float(ok["sicetac"].sum()),
        "sin_referencia": int(len(sin)),
        "cobertura_pct": round(len(ok.drop_duplicates(["cliente", "origen", "destino", "categoria"]))
                               / max(1, len(ok.drop_duplicates(["cliente", "origen", "destino", "categoria"])) + len(sin)) * 100, 1),
    }
    por_mes = [{"periodo": p, "nombre": tc.nombre_periodo(p), "tarifas": int(len(g)),
                "variacion": _ponderada(g["tarifa"], g["sicetac"]),
                "tarifa_prom": round(float(g["tarifa"].mean()), 0), "sicetac_prom": round(float(g["sicetac"].mean()), 0),
                "por_debajo": int((g["variacion"] < 0).sum())}
               for p, g in sorted(ok.groupby("periodo"), key=lambda x: (x[0] != "VIGENTE", x[0]))]
    por_cliente = sorted([{"cliente": c, "tarifas": int(len(g)), "rutas": int(len(g[["origen", "destino"]].drop_duplicates())),
                           "variacion": _ponderada(g["tarifa"], g["sicetac"]),
                           "por_debajo": int((g["variacion"] < 0).sum())}
                          for c, g in ok.groupby("cliente")], key=lambda r: (r["variacion"] is None, r["variacion"]))
    por_categoria = [{"categoria": c, "tipo_vehiculo": g["tipo_vehiculo"].iloc[0], "tarifas": int(len(g)),
                      "variacion": _ponderada(g["tarifa"], g["sicetac"])} for c, g in ok.groupby("categoria")]
    detalle = ok.assign(nombre_periodo=ok["periodo"].map(tc.nombre_periodo)).sort_values("variacion")
    return {**vacio, "kpis": kpis, "por_mes": por_mes, "por_cliente": por_cliente, "por_categoria": por_categoria,
            "detalle": detalle.head(3000).pipe(_registros),
            "detalle_total": int(len(detalle)),
            "sin_referencia": sin.head(500).pipe(_registros),
            "sin_referencia_total": int(len(sin))}
