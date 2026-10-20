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
    TarifaxAjuste, TarifaxAliasCiudad, TarifaxComparacion, TarifaxHoraLogistica, TarifaxNegociacion,
    TarifaxSicetacPeriodo,
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


def _firma_mapeo(mapeo: Dict[str, str]) -> str:
    import json
    return json.dumps(tc.mapeo_categorias(mapeo), sort_keys=True)


async def _sincronizar_mapeo(db: AsyncSession) -> None:
    """Si las equivalencias de vehículos cambiaron desde el último cruce (por
    ejemplo, editadas en el motor de tarifas), rehace el cruce."""
    actual = _firma_mapeo(_mapeo())
    guardado = (await db.execute(select(TarifaxAjuste.valor).where(TarifaxAjuste.clave == "mapeo"))).scalar()
    hay_cruce = (await db.execute(select(TarifaxComparacion.id).limit(1))).first()
    if hay_cruce and guardado != actual:
        await _recalcular(db)
        await db.commit()


async def _recalcular(db: AsyncSession, periodos: Optional[List[str]] = None) -> Dict[str, int]:
    """Rehace el cruce de los periodos indicados (todos si no se indica)."""
    negs = []
    for n in (await db.execute(select(TarifaxNegociacion))).scalars():
        # El tipo de vehículo se vuelve a extraer del tipo de tarifa en cada
        # recálculo: así una mejora de la extracción alcanza lo ya cargado.
        cat = tc.categoria_de(n.tipo_tarifa)
        if cat != n.categoria_vehiculo:
            n.categoria_vehiculo = cat
        negs.append(dict(id=n.id, cliente=n.cliente, servicio=n.servicio, origen=n.origen, destino=n.destino,
                         tipo_tarifa=n.tipo_tarifa, dpto_origen=n.dpto_origen, dpto_destino=n.dpto_destino,
                         categoria_vehiculo=cat, tarifa=n.tarifa))
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
    # Con qué equivalencias quedó hecho el cruce (ver `_sincronizar_mapeo`).
    firma = _firma_mapeo(mapeo)
    aj = (await db.execute(select(TarifaxAjuste).where(TarifaxAjuste.clave == "mapeo"))).scalar_one_or_none()
    if aj is None:
        db.add(TarifaxAjuste(clave="mapeo", valor=firma))
    else:
        aj.valor = firma
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
    # Cada categoría de vehículo de los clientes y su equivalencia SICETAC
    # (la misma configuración del motor de tarifas).
    crudo = _mapeo()
    mapa = tc.mapeo_categorias(crudo)
    directas = {tc.normalizar(k) for k in crudo}
    vehiculos = []
    for cat, n in (await db.execute(select(TarifaxNegociacion.categoria_vehiculo, func.count(TarifaxNegociacion.id))
                                    .where(TarifaxNegociacion.categoria_vehiculo.isnot(None))
                                    .group_by(TarifaxNegociacion.categoria_vehiculo)
                                    .order_by(func.count(TarifaxNegociacion.id).desc()))).all():
        clave = tc.normalizar(cat)
        sinonimo = tc.SINONIMOS_CATEGORIA.get(clave)
        vehiculos.append({"categoria": cat, "tarifas": n, "tipo_sicetac": mapa.get(clave),
                          "por": "MAPEO" if clave in directas else ("SINONIMO" if clave in mapa else None),
                          "sinonimo_de": sinonimo if clave not in directas and clave in mapa else None})
    return {"vehiculos": vehiculos,
            "negociaciones": {"total": total, "comparables": comparables, "clientes": clientes,
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


class HorasIn(BaseModel):
    valores: Dict[str, float]


@router.get("/horas-logisticas")
async def ver_horas(db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Valor de una hora logística por configuración SICETAC, y qué periodos ya
    lo traen en su propio archivo (esos no usan esta tabla)."""
    C = TarifaxComparacion
    tipos = [t for (t,) in (await db.execute(select(C.tipo_vehiculo).where(C.tipo_vehiculo.isnot(None)).distinct()))]
    valores = {h.tipo_vehiculo: h.valor_hora for h in (await db.execute(select(TarifaxHoraLogistica))).scalars()}
    con_archivo = [p for (p,) in (await db.execute(select(C.periodo).where(C.valor_hora.isnot(None)).distinct()))]
    return {"tipos": sorted(set(tipos) | set(valores)), "valores": valores,
            "periodos_con_valor_en_archivo": [{"periodo": p, "nombre": tc.nombre_periodo(p)} for p in sorted(con_archivo)]}


@router.put("/horas-logisticas")
async def guardar_horas(data: HorasIn, db: AsyncSession = Depends(get_db), _: Usuario = Depends(get_current_user)):
    if any(v < 0 for v in data.valores.values()):
        raise HTTPException(422, "El valor de la hora logística no puede ser negativo.")
    await db.execute(delete(TarifaxHoraLogistica))
    for tipo, valor in data.valores.items():
        if tc.normalizar(tipo) and valor:
            db.add(TarifaxHoraLogistica(tipo_vehiculo=tc.normalizar(tipo), valor_hora=float(valor)))
    await db.commit()
    return {"ok": True}


@router.get("/tablero")
async def tablero(periodos: Optional[str] = None, clientes: Optional[str] = None, origenes: Optional[str] = None,
                  destinos: Optional[str] = None, servicios: Optional[str] = None, categorias: Optional[str] = None,
                  dptos_origen: Optional[str] = None, dptos_destino: Optional[str] = None,
                  tipos_tarifa: Optional[str] = None,
                  posicion: Optional[str] = None, carroceria: str = "FURGON",
                  horas: float = Query(0, ge=0, le=240), db: AsyncSession = Depends(get_db),
                  _: Usuario = Depends(get_current_user)):
    """Todo lo que pinta el tablero, con los filtros aplicados (separados por «|»).

    La carrocería se elige una: SICETAC cambia el costo según la carrocería y
    mezclarlas promediaría cosas distintas.

    `horas`: horas logísticas que se suman al costo SICETAC del viaje, a su
    valor por hora (el del archivo del mes, o el de la configuración del
    vehículo). Con horas = 0 el SICETAC es el costo del viaje solo.
    `posicion`: ENCIMA o DEBAJO de SICETAC, ya con las horas sumadas."""
    await _sincronizar_mapeo(db)
    C = TarifaxComparacion
    q = select(C.periodo, C.cliente, C.servicio, C.origen, C.destino, C.dpto_origen, C.dpto_destino, C.tipo_tarifa, C.categoria,
               C.tipo_vehiculo, C.carroceria, C.distancia, C.tarifa_cliente, C.costo_sicetac, C.valor_hora, C.estado)
    rows = (await db.execute(q.where((C.carroceria == carroceria) | (C.estado != "OK")))).all()
    carrocerias = [r for (r,) in (await db.execute(select(C.carroceria).where(C.carroceria.isnot(None)).distinct()))]
    valor_conf = {h.tipo_vehiculo: h.valor_hora for h in (await db.execute(select(TarifaxHoraLogistica))).scalars()}
    cols = ["periodo", "cliente", "servicio", "origen", "destino", "dpto_origen", "dpto_destino", "tipo_tarifa", "categoria",
            "tipo_vehiculo", "carroceria", "distancia", "tarifa", "sicetac_base", "valor_hora", "estado"]
    df = pd.DataFrame(rows, columns=cols)
    # Las negociaciones que no entran al cruce (paqueteo: por kilo, caja o
    # volumen; o tarifa en cero) igual cuentan: dan las opciones de los filtros
    # tal como vienen en el archivo y se listan como no comparables.
    N = TarifaxNegociacion
    negs = pd.DataFrame((await db.execute(select(
        N.cliente, N.servicio, N.origen, N.destino, N.dpto_origen, N.dpto_destino, N.tipo_tarifa,
        N.categoria_vehiculo, N.tarifa))).all(),
        columns=["cliente", "servicio", "origen", "destino", "dpto_origen", "dpto_destino", "tipo_tarifa", "categoria", "tarifa"])
    if not negs.empty:
        negs["tarifa"] = pd.to_numeric(negs["tarifa"], errors="coerce")
        nc = negs[negs["categoria"].isna() | negs["tarifa"].isna() | (negs["tarifa"] <= 0)].copy()
        nc["motivo"] = nc.apply(lambda r: "Tarifa en cero o vacía" if pd.isna(r["tarifa"]) or r["tarifa"] <= 0
                                else "No es por viaje (por kilo, caja o volumen): SICETAC da el costo de un viaje", axis=1)
    else:
        nc = negs.assign(motivo=None)
    vacio = {"opciones": {"periodos": [], "clientes": [], "origenes": [], "destinos": [], "servicios": [],
                          "categorias": [], "dptos_origen": [], "dptos_destino": [], "tipos_tarifa": [],
                          "carrocerias": sorted(carrocerias)},
             "kpis": None, "por_mes": [], "por_cliente": [], "por_categoria": [], "detalle": [], "sin_referencia": [],
             "sin_referencia_total": 0, "carroceria": carroceria, "horas": horas,
             "no_comparables": [], "no_comparables_total": 0, "no_comparables_tarifas": 0}
    if df.empty and negs.empty:
        return vacio

    # SICETAC del análisis = costo del viaje + horas × valor de la hora.
    vh = pd.to_numeric(df["valor_hora"], errors="coerce")
    vh = vh.fillna(pd.to_numeric(df["tipo_vehiculo"].map(
        lambda t: valor_conf.get(tc.normalizar(t)) if isinstance(t, str) else None), errors="coerce"))
    df["valor_hora"] = vh
    df["horas_valor"] = (vh.fillna(0) * horas).round(0)
    df["tarifa"] = pd.to_numeric(df["tarifa"], errors="coerce")
    df["sicetac_base"] = pd.to_numeric(df["sicetac_base"], errors="coerce")
    df["sicetac"] = df["sicetac_base"] + df["horas_valor"]
    df["diferencia"] = (df["tarifa"] - df["sicetac"]).round(0)
    df["variacion"] = (df["diferencia"] / df["sicetac"] * 100).round(2)

    def opciones(col):
        valores = set(df[col].dropna().unique().tolist()) if col in df else set()
        if col in negs:
            valores |= set(negs[col].dropna().unique().tolist())
        return sorted(valores)
    orden_per = sorted(df["periodo"].unique(), key=lambda p: (p != "VIGENTE", p))
    vacio["opciones"].update({"periodos": [{"periodo": p, "nombre": tc.nombre_periodo(p)} for p in orden_per],
                              "clientes": opciones("cliente"), "origenes": opciones("origen"),
                              "destinos": opciones("destino"), "servicios": opciones("servicio"),
                              "categorias": opciones("categoria"), "dptos_origen": opciones("dpto_origen"),
                              "dptos_destino": opciones("dpto_destino"), "tipos_tarifa": opciones("tipo_tarifa")})
    for col, val in (("periodo", periodos), ("cliente", clientes), ("origen", origenes), ("destino", destinos),
                     ("servicio", servicios), ("categoria", categorias), ("dpto_origen", dptos_origen),
                     ("dpto_destino", dptos_destino), ("tipo_tarifa", tipos_tarifa)):
        sel = _lista(val)
        if sel:
            df = df[df[col].isin(sel)]
    for col, val in (("cliente", clientes), ("origen", origenes), ("destino", destinos), ("servicio", servicios),
                     ("categoria", categorias), ("dpto_origen", dptos_origen), ("dpto_destino", dptos_destino),
                     ("tipo_tarifa", tipos_tarifa)):
        sel = _lista(val)
        if sel and not nc.empty:
            nc = nc[nc[col].isin(sel)]
    vacio.update({"no_comparables": _registros(nc.head(500)) if not nc.empty else [],
                  "no_comparables_total": int(len(nc)),
                  "no_comparables_tarifas": int(len(nc))})
    ok = df[df["estado"] == "OK"]
    if posicion == "DEBAJO":
        ok = ok[ok["variacion"] < 0]
    elif posicion == "ENCIMA":
        ok = ok[ok["variacion"] >= 0]
    sin = df[df["estado"] != "OK"].drop_duplicates(["cliente", "origen", "destino", "categoria"])
    if ok.empty:
        vacio.update({"sin_referencia": sin.head(500).pipe(_registros),
                      "sin_referencia_total": len(sin)})
        return vacio
    rutas = ok[["origen", "destino"]].drop_duplicates()
    llaves = ["cliente", "origen", "destino", "categoria"]
    kpis = {
        "tarifas": int(len(ok)), "clientes": int(ok["cliente"].nunique()), "rutas": int(len(rutas)),
        "variacion": _ponderada(ok["tarifa"], ok["sicetac"]),
        "mediana": round(float(ok["variacion"].median()), 2),
        "por_debajo": int((ok["variacion"] < 0).sum()),
        "por_debajo_pct": round(float((ok["variacion"] < 0).mean() * 100), 1),
        "tarifa_total": float(ok["tarifa"].sum()), "sicetac_total": float(ok["sicetac"].sum()),
        "sicetac_base_total": float(ok["sicetac_base"].sum()), "horas_total": float(ok["horas_valor"].sum()),
        "horas": horas, "horas_sin_valor": int(ok["valor_hora"].isna().sum()) if horas else 0,
        "sin_referencia": int(len(sin)),
        "cobertura_pct": round(len(ok.drop_duplicates(llaves)) / max(1, len(ok.drop_duplicates(llaves)) + len(sin)) * 100, 1),
    }
    por_mes = []
    for p, g in sorted(ok.groupby("periodo"), key=lambda x: (x[0] != "VIGENTE", x[0])):
        base, hv, sic, tar = (float(g[c].mean()) for c in ("sicetac_base", "horas_valor", "sicetac", "tarifa"))
        por_mes.append({"periodo": p, "nombre": tc.nombre_periodo(p), "tarifas": int(len(g)),
                        "variacion": _ponderada(g["tarifa"], g["sicetac"]),
                        "sicetac_base_prom": round(base, 0), "horas_prom": round(hv, 0),
                        "sicetac_prom": round(sic, 0), "tarifa_prom": round(tar, 0),
                        # La cascada usa promedios: su variación es la de los promedios.
                        "variacion_prom": round((tar - sic) / sic * 100, 2) if sic else None,
                        "por_debajo": int((g["variacion"] < 0).sum())})
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
