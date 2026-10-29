"""
Analítica del CMMS: Weibull por modo de falla, tendencia por equipo,
predicción de fallas con aprendizaje automático y anomalías.

La pantalla «IA» de mantenimiento mostraba probabilidades de falla, lecturas de
sensores, ventanas de mantenimiento y un asistente, todo escrito a mano. Aquí
cada cifra sale de las órdenes de trabajo, los tanqueos y los medidores de la
empresa, y viene con la muestra que la respalda.

LA VIDA SE MIDE EN KILÓMETROS CUANDO SE PUEDE
Una pieza de un camión se gasta rodando, no mirando el calendario: dos camiones
con el mismo mes de uso y 3.000 contra 15.000 km no tienen el mismo riesgo. Si
el grupo tiene lecturas de odómetro suficientes, la vida va en km; si no, en
días, y la respuesta dice cuál usó.
"""
import asyncio
from bisect import bisect_left, bisect_right
from collections import defaultdict
from datetime import datetime, timedelta
from statistics import median
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.analitica import predictivo
from app.core.analitica.weibull import (
    ajustar_weibull, crow_amsaa, fallas_esperadas, prob_falla_condicional,
    reemplazo_optimo, confiabilidad,
)
from app.core.database import get_db
from app.infrastructure.models.eam import (
    EAMActivo, EAMOrdenTrabajo, EAMFallaCatalogo, EAMRegistroCombustible,
)

router = APIRouter(prefix="/eam/analitica", tags=["CMMS/EAM · Analítica"])

HORIZONTE_DIAS = 30
CRITICIDAD = {"BAJA": 0, "MEDIA": 1, "ALTA": 2, "CRITICA": 3}


# ─── Carga ─────────────────────────────────────────────────────────────────────

class Datos:
    """Todo lo que usa la analítica, leído una vez por consulta."""

    def __init__(self, activos, ordenes, modos, lecturas, ahora):
        self.activos: Dict[int, EAMActivo] = activos
        self.ordenes: List[EAMOrdenTrabajo] = ordenes
        self.modos: Dict[int, str] = modos
        self.lecturas: Dict[int, Tuple[np.ndarray, np.ndarray]] = lecturas
        self.ahora: datetime = ahora
        # Las órdenes de cada equipo y el inicio de su observación, una vez.
        # Antes cada equipo recorría TODAS las órdenes para hallar las suyas:
        # 3.000 equipos por 100 mil órdenes son 300 millones de comparaciones.
        self.por_activo: Dict[int, List[EAMOrdenTrabajo]] = defaultdict(list)
        for o in ordenes:
            self.por_activo[o.activo_id].append(o)
        self.inicio: Dict[int, datetime] = {}
        for aid, os_ in self.por_activo.items():
            self.inicio[aid] = min(_fecha(o) for o in os_)
        for aid, (x, _) in lecturas.items():
            f = datetime.fromtimestamp(x[0])
            if aid not in self.inicio or f < self.inicio[aid]:
                self.inicio[aid] = f

    def km_en(self, activo_id: int, fecha: datetime) -> Optional[float]:
        """Odómetro interpolado a una fecha. Sin extrapolar: fuera del rango de
        lecturas no se sabe, y se dice que no se sabe."""
        l = self.lecturas.get(activo_id)
        if l is None:
            return None
        x, y = l
        t = fecha.timestamp()
        if t < x[0] or t > x[-1]:
            return None
        return float(np.interp(t, x, y))

    def km_por_dia(self, activo_id: int, dias: int = 90) -> Optional[float]:
        l = self.lecturas.get(activo_id)
        if l is None:
            return None
        x, y = l
        fin = x[-1]
        ini = max(x[0], fin - dias * 86400)
        if fin - ini < 7 * 86400:
            return None
        return float((np.interp(fin, x, y) - np.interp(ini, x, y)) / ((fin - ini) / 86400))


def _fecha(o: EAMOrdenTrabajo) -> Optional[datetime]:
    f = o.fecha_inicio or o.fecha_fin or o.created_at
    return f.replace(tzinfo=None) if f else None


def _es_preventiva(o: EAMOrdenTrabajo) -> bool:
    return o.plan_id is not None or (o.tipo_ot or "").upper().startswith(("PREV", "PRED"))


async def _cargar(db: AsyncSession) -> Datos:
    ahora = datetime.now()
    activos = {a.id: a for a in (await db.execute(
        select(EAMActivo).where(EAMActivo.activo.is_(True)))).scalars().all()}
    # Solo las columnas que usa la analítica: son todas las órdenes de la
    # historia, y el objeto ORM completo de cada una pesaba más que el cálculo.
    # Por la conexión y no por la sesión ORM: son cientos de miles de filas de
    # solo lectura y la capa ORM duplicaba el tiempo de leerlas.
    O = EAMOrdenTrabajo
    conn = await db.connection()
    filas_ot = (await conn.execute(select(
        O.id, O.numero, O.activo_id, O.fecha_inicio, O.fecha_fin, O.created_at, O.estado,
        O.odometro, O.plan_id, O.tipo_ot, O.es_falla, O.costo_total, O.falla_id,
    ).where(O.estado.is_distinct_from("CANCELADA")))).all()
    modos = {m.id: m.descripcion for m in (await db.execute(select(EAMFallaCatalogo))).scalars().all()}
    R = EAMRegistroCombustible
    tanqueos = (await conn.execute(select(R.activo_id, R.fecha, R.odometro)
                                   .where(R.odometro.isnot(None)))).all()
    # Lo demás es CPU: en un hilo, para que el proceso siga atendiendo.
    return await asyncio.to_thread(_armar_datos, activos, filas_ot, modos, tanqueos, ahora)


def _armar_datos(activos, filas_ot, modos, tanqueos, ahora) -> Datos:
    ordenes = [o for o in filas_ot if o.activo_id in activos and _fecha(o)]
    puntos: Dict[int, List[Tuple[float, float]]] = defaultdict(list)
    for o in ordenes:
        if o.odometro:
            puntos[o.activo_id].append((_fecha(o).timestamp(), float(o.odometro)))
    for aid, f, km in tanqueos:
        if aid in activos and f:
            puntos[aid].append((f.replace(tzinfo=None).timestamp(), float(km)))
    for aid, a in activos.items():
        if a.odometro_actual and puntos.get(aid):
            puntos[aid].append((ahora.timestamp(), float(a.odometro_actual)))

    lecturas = {}
    for aid, ps in puntos.items():
        ps.sort()
        # El odómetro no retrocede: una lectura menor que la anterior es un
        # error de digitación y se descarta en vez de promediarla.
        x, y, tope = [], [], -1.0
        for t, km in ps:
            if km >= tope and (not x or t > x[-1]):
                x.append(t); y.append(km); tope = km
        if len(x) >= 2 and y[-1] > y[0]:
            lecturas[aid] = (np.array(x), np.array(y))
    return Datos(activos, ordenes, modos, lecturas, ahora)


def _inicio_observacion(d: Datos, aid: int) -> Optional[datetime]:
    return d.inicio.get(aid)


# ─── Weibull por modo de falla ────────────────────────────────────────────────

def _vidas(d: Datos, poblacion: List[int], fallas: Dict[int, List[datetime]], unidad: str):
    """Intervalos de vida con su censura, en km o en días."""
    tiempos, fallo, estado_actual = [], [], {}
    for aid in poblacion:
        ini = _inicio_observacion(d, aid)
        if not ini:
            continue
        if unidad == "km":
            medir = lambda f: d.km_en(aid, f)
        else:
            medir = lambda f: (f - ini).total_seconds() / 86400
        p0, pfin = medir(ini), medir(d.ahora)
        if p0 is None or pfin is None:
            continue
        marcas = [m for m in (medir(f) for f in sorted(fallas.get(aid, []))) if m is not None]
        previo, renovado = p0, False
        for m in marcas:
            if m - previo > 0:
                tiempos.append(m - previo)
                # Antes de la primera falla no se sabe la edad de la pieza:
                # llegó AL MENOS hasta aquí, y así se registra.
                fallo.append(renovado)
            previo, renovado = m, True
        if pfin - previo > 0:
            tiempos.append(pfin - previo)
            fallo.append(False)
        estado_actual[aid] = {"edad": max(pfin - previo, 0), "desde_falla": renovado}
    return tiempos, fallo, estado_actual


@router.get("/weibull", response_model=Dict[str, Any])
async def weibull_por_modo(costo_preventivo: Optional[float] = Query(None, ge=0),
                           db: AsyncSession = Depends(get_db)):
    """Un ajuste de Weibull por cada modo de falla con historia suficiente.

    La población de cada modo son los equipos activos del mismo tipo que los
    que han tenido ese modo: los que nunca fallaron también cuentan, como
    vidas censuradas. Las fallas sin modo registrado se agrupan por tipo de
    equipo y se marcan, porque mezclan piezas distintas.
    """
    d = await _cargar(db)

    def calcular():
        grupos: Dict[Any, Dict[int, List[datetime]]] = defaultdict(lambda: defaultdict(list))
        costos_falla: Dict[Any, List[float]] = defaultdict(list)
        tipos_de: Dict[Any, set] = defaultdict(set)
        for o in d.ordenes:
            if not o.es_falla:
                continue
            a = d.activos[o.activo_id]
            clave = ("modo", o.falla_id) if o.falla_id else ("tipo", a.tipo_activo or "—")
            grupos[clave][o.activo_id].append(_fecha(o))
            tipos_de[clave].add(a.tipo_activo)
            if o.costo_total:
                costos_falla[clave].append(o.costo_total)

        salida = []
        for clave, fallas in grupos.items():
            poblacion = [aid for aid, a in d.activos.items() if a.tipo_activo in tipos_de[clave]]
            con_km = [aid for aid in poblacion if aid in d.lecturas]
            # En km solo si casi toda la población tiene odómetro Y todos los que
            # fallaron también: si no, sus fallas se perderían del ajuste.
            unidad = ("km" if len(con_km) >= 0.8 * len(poblacion) and all(aid in d.lecturas for aid in fallas)
                      else "días")
            if unidad == "km":
                poblacion = con_km
            tiempos, fallo, estado = _vidas(d, poblacion, fallas, unidad)
            ajuste = ajustar_weibull(tiempos, fallo)
            nombre = (d.modos.get(clave[1], f"Modo {clave[1]}") if clave[0] == "modo"
                      else f"Fallas sin modo registrado · {clave[1]}")

            riesgo = []
            reemplazo = None
            cp = costo_preventivo
            if cp is None:
                en_poblacion = set(poblacion)
                prev = [o.costo_total for o in d.ordenes
                        if _es_preventiva(o) and o.costo_total and o.activo_id in en_poblacion]
                cp = median(prev) if prev else None
            cf = median(costos_falla[clave]) if costos_falla[clave] else None
            if ajuste.get("suficiente"):
                b, e = ajuste["beta"], ajuste["eta"]
                for aid, st in estado.items():
                    if unidad == "km":
                        ritmo = d.km_por_dia(aid)
                        if not ritmo:
                            continue
                        h = ritmo * HORIZONTE_DIAS
                    else:
                        h = HORIZONTE_DIAS
                    a = d.activos[aid]
                    riesgo.append({
                        "activo_id": aid, "codigo": a.codigo, "nombre": a.nombre,
                        "edad": round(st["edad"], 1), "edad_minima": not st["desde_falla"],
                        "prob_30d": round(prob_falla_condicional(st["edad"], h, b, e) * 100, 1),
                        "confiabilidad_actual": round(confiabilidad(st["edad"], b, e) * 100, 1),
                    })
                riesgo.sort(key=lambda r: -r["prob_30d"])
                if cp and cf:
                    reemplazo = reemplazo_optimo(b, e, cp, cf)
            salida.append({
                "grupo": nombre, "es_modo": clave[0] == "modo", "unidad": unidad,
                "equipos": len(poblacion), **ajuste,
                # Las fallas de la base, no los intervalos que dejan: dos fallas el
                # mismo día, o la primera del registro, no dan una vida completa.
                "fallas_registradas": sum(len(v) for v in fallas.values()),
                "costo_falla_mediano": round(cf, 0) if cf else None,
                "costo_preventivo_mediano": round(cp, 0) if cp else None,
                "reemplazo": reemplazo,
                "riesgo": riesgo[:15],
            })
        salida.sort(key=lambda g: (not g.get("suficiente"), -(g.get("fallas") or 0)))
        return {"horizonte_dias": HORIZONTE_DIAS, "grupos": salida,
                "fallas_totales": sum(1 for o in d.ordenes if o.es_falla),
                "fallas_con_modo": sum(1 for o in d.ordenes if o.es_falla and o.falla_id)}
    return await asyncio.to_thread(calcular)


@router.get("/reemplazo", response_model=Dict[str, Any])
async def calcular_reemplazo(beta: float = Query(..., gt=0), eta: float = Query(..., gt=0),
                             costo_preventivo: float = Query(..., gt=0),
                             costo_falla: float = Query(..., gt=0)):
    """El reemplazo óptimo con los costos que ponga el usuario. El costo
    preventivo por defecto es el de un preventivo completo de la flota, no el
    de cambiar esa pieza, y solo quien conoce el taller sabe el segundo."""
    r = reemplazo_optimo(beta, eta, costo_preventivo, costo_falla)
    if r is None:
        motivo = ("Sin desgaste (β ≤ 1) cambiar la pieza antes no reduce fallas" if beta <= 1
                  else "Con estos costos sale más barato usar la pieza hasta que falle")
        return {"recomendado": False, "motivo": motivo}
    return {"recomendado": True, **r}


# ─── Tendencia por equipo (Crow-AMSAA) ────────────────────────────────────────

@router.get("/tendencia", response_model=Dict[str, Any])
async def tendencia_por_equipo(db: AsyncSession = Depends(get_db)):
    """¿Qué equipos se están deteriorando? Crow-AMSAA sobre todas sus fallas,
    en días desde que empezó el registro de cada uno."""
    d = await _cargar(db)

    def calcular():
        fallas: Dict[int, List[datetime]] = defaultdict(list)
        for o in d.ordenes:
            if o.es_falla:
                fallas[o.activo_id].append(_fecha(o))
        equipos, insuficientes = [], 0
        for aid, fs in fallas.items():
            ini = _inicio_observacion(d, aid)
            T = (d.ahora - ini).total_seconds() / 86400
            # Las fallas que abren el registro no dan tiempo transcurrido: el
            # instante cero es la primera observación.
            tiempos = [(f - ini).total_seconds() / 86400 for f in fs]
            r = crow_amsaa(tiempos, T)
            if not r.get("suficiente"):
                insuficientes += 1
                continue
            a = d.activos[aid]
            equipos.append({
                "activo_id": aid, "codigo": a.codigo, "nombre": a.nombre,
                "tipo": a.tipo_activo, "marca": a.marca, "linea": a.linea,
                "dias_observados": round(T), **{k: v for k, v in r.items() if k != "lambda"},
                "fallas_esperadas_90d": fallas_esperadas(r, T, 90),
            })
        orden = {"DETERIORO": 0, "ESTABLE": 1, "MEJORA": 2}
        equipos.sort(key=lambda e: (orden[e["tendencia"]], e["p_valor_tendencia"]))
        return {"equipos": equipos, "sin_datos_suficientes": insuficientes,
                "minimo_fallas": 4}
    return await asyncio.to_thread(calcular)


# ─── Predicción con aprendizaje automático ────────────────────────────────────

ETIQUETAS = {
    "dias_desde_falla": "Días desde la última falla",
    "sin_falla_previa": "Sin fallas registradas antes",
    "fallas_90d": "Fallas en los últimos 90 días",
    "fallas_365d": "Fallas en el último año",
    "preventivos_90d": "Preventivos en los últimos 90 días",
    "costo_90d": "Costo de mantenimiento en 90 días",
    "km_30d": "Kilómetros recorridos en 30 días",
    "edad_anios": "Edad del equipo (años)",
    "criticidad": "Criticidad",
    "tipo": "Tipo de equipo",
    "marca": "Marca",
}


class _Historia:
    """Las órdenes de un equipo ordenadas por fecha, con sumas acumuladas, para
    responder «cuántas fallas / cuánto costo en los 90 días antes de X» con dos
    búsquedas binarias en vez de recorrer toda su historia en cada foto."""

    def __init__(self, ordenes: List[EAMOrdenTrabajo]):
        os_ = sorted(ordenes, key=_fecha)
        self.fechas = [_fecha(o) for o in os_]
        self.fallas = [f for f, o in zip(self.fechas, os_) if o.es_falla]
        self.costo = [0.0]
        self.prev = [0]
        for o in os_:
            self.costo.append(self.costo[-1] + (o.costo_total or 0))
            self.prev.append(self.prev[-1] + (1 if _es_preventiva(o) else 0))

    def falla_entre(self, desde: datetime, hasta: datetime) -> bool:
        """¿Alguna falla con desde < fecha <= hasta?"""
        return bisect_right(self.fallas, desde) < bisect_right(self.fallas, hasta)


def _variables(d: Datos, aid: int, corte: datetime, historias: Dict[int, "_Historia"]) -> Dict:
    a = d.activos[aid]
    h = historias.get(aid) or _Historia([])
    n = bisect_right(h.fechas, corte)
    i90 = bisect_left(h.fechas, corte - timedelta(days=90))
    nf = bisect_right(h.fallas, corte)
    ult = h.fallas[nf - 1] if nf else None
    dias = lambda f: (corte - f).total_seconds() / 86400
    km_ahora, km_antes = d.km_en(aid, corte), d.km_en(aid, corte - timedelta(days=30))
    return {
        "dias_desde_falla": min(dias(ult), 730) if ult else None,
        "sin_falla_previa": 0 if ult else 1,
        "fallas_90d": nf - bisect_left(h.fallas, corte - timedelta(days=90)),
        "fallas_365d": nf - bisect_left(h.fallas, corte - timedelta(days=365)),
        "preventivos_90d": h.prev[n] - h.prev[min(i90, n)],
        "costo_90d": h.costo[n] - h.costo[min(i90, n)],
        "km_30d": (km_ahora - km_antes) if km_ahora is not None and km_antes is not None else None,
        "edad_anios": (corte.year - a.anio) if a.anio else None,
        "criticidad": CRITICIDAD.get((a.criticidad or "").upper()),
        "tipo": a.tipo_activo or "—",
        "marca": a.marca or "—",
    }


# Con una flota grande la historia da cientos de miles de fotos. Un modelo de
# este tamaño no mejora con más de unas decenas de miles, y entrenar con todas
# llevaba minutos; pasado el tope se toma una muestra fija (misma semilla, mismo
# resultado cada vez), repartida por igual en el tiempo.
MAX_OBSERVACIONES = 60_000


@router.get("/prediccion", response_model=Dict[str, Any])
async def prediccion_de_fallas(db: AsyncSession = Depends(get_db)):
    """Probabilidad de que cada equipo tenga una falla en los próximos 30 días.

    Se arma una foto de cada equipo cada 14 días de su historia —qué tan
    reciente fue su última falla, cuánto rodó, cuánto preventivo tuvo— y si
    falló en los 30 días siguientes. Con eso se entrena y se valida contra los
    meses más recientes (ver `core/analitica/predictivo.py`).
    """
    d = await _cargar(db)
    # Armar las fotos y entrenar es CPU pura: en un hilo, para que el proceso
    # siga atendiendo a los demás mientras tanto.
    return await asyncio.to_thread(_predecir, d)


def _predecir(d: Datos) -> Dict[str, Any]:
    historias = {aid: _Historia(os_) for aid, os_ in d.por_activo.items()}

    filas, y, fechas = [], [], []
    ultimo_corte = d.ahora - timedelta(days=HORIZONTE_DIAS)
    for aid in d.activos:
        ini = _inicio_observacion(d, aid)
        if not ini:
            continue
        h = historias.get(aid) or _Historia([])
        corte = ini + timedelta(days=60)
        while corte <= ultimo_corte:
            filas.append(_variables(d, aid, corte, historias))
            y.append(int(h.falla_entre(corte, corte + timedelta(days=HORIZONTE_DIAS))))
            fechas.append(corte)
            corte += timedelta(days=14)

    observaciones = len(filas)
    if observaciones > MAX_OBSERVACIONES:
        elegidas = np.sort(np.random.default_rng(0).choice(observaciones, MAX_OBSERVACIONES, replace=False))
        filas = [filas[i] for i in elegidas]
        y = [y[i] for i in elegidas]
        fechas = [fechas[i] for i in elegidas]

    r = predictivo.entrenar(filas, y, fechas, categoricas=["tipo", "marca"], etiquetas=ETIQUETAS)
    equipos = []
    if r.get("suficiente"):
        actuales = {aid: _variables(d, aid, d.ahora, historias) for aid in d.activos}
        p = predictivo.predecir(r, list(actuales.values()))
        for (aid, v), prob in zip(actuales.items(), p):
            a = d.activos[aid]
            equipos.append({"activo_id": aid, "codigo": a.codigo, "nombre": a.nombre,
                            "prob_30d": round(float(prob) * 100, 1),
                            "fuera_de_experiencia": predictivo.fuera_de_experiencia(r, v, ETIQUETAS),
                            "dias_desde_falla": round(v["dias_desde_falla"]) if v["dias_desde_falla"] is not None else None,
                            "fallas_365d": v["fallas_365d"],
                            "km_30d": round(v["km_30d"]) if v["km_30d"] is not None else None})
        equipos.sort(key=lambda e: -e["prob_30d"])
    return {"horizonte_dias": HORIZONTE_DIAS, **predictivo.publico(r), "equipos": equipos,
            "observaciones_historia": observaciones}


# ─── Anomalías ─────────────────────────────────────────────────────────────────

def _atipicos(valores: List[Tuple[Any, float]], umbral: float = 3.5):
    """Puntaje z modificado de Iglewicz y Hoaglin: usa la mediana y la
    desviación absoluta mediana, así que un par de valores enormes no mueven
    la referencia contra la que se les compara (con la media sí lo harían)."""
    if len(valores) < 8:
        return []
    xs = np.array([v for _, v in valores], dtype=float)
    med = float(np.median(xs))
    mad = float(np.median(np.abs(xs - med)))
    if mad == 0:
        return []
    return [(k, v, round(0.6745 * (v - med) / mad, 1), med)
            for k, v in valores if abs(0.6745 * (v - med) / mad) > umbral]


@router.get("/anomalias", response_model=Dict[str, Any])
async def anomalias(dias: int = Query(365, ge=30, le=1825), db: AsyncSession = Depends(get_db)):
    """Órdenes con costo o duración fuera de lo normal para su tipo, y
    tanqueos con rendimiento fuera de lo normal para el mismo equipo."""
    d = await _cargar(db)
    desde = d.ahora - timedelta(days=dias)
    R = EAMRegistroCombustible
    rend = (await (await db.connection()).execute(select(R.activo_id, R.fecha, R.rendimiento).where(
        R.rendimiento.isnot(None), R.fecha >= desde))).all()
    return await asyncio.to_thread(_anomalias, d, desde, dias, rend)


def _anomalias(d: Datos, desde: datetime, dias: int, rend) -> Dict[str, Any]:
    recientes = [o for o in d.ordenes if _fecha(o) >= desde]
    salida = []

    por_tipo: Dict[Tuple, List] = defaultdict(list)
    for o in recientes:
        a = d.activos[o.activo_id]
        clase = "Preventiva" if _es_preventiva(o) else ("Falla" if o.es_falla else "Correctiva")
        por_tipo[(clase, a.tipo_activo or "—")].append(o)
    for (clase, tipo), os_ in por_tipo.items():
        for o, v, z, med in _atipicos([(o, o.costo_total) for o in os_ if o.costo_total]):
            salida.append({"clase": "COSTO", "referencia": o.numero, "activo": d.activos[o.activo_id].codigo,
                           "activo_id": o.activo_id, "fecha": _fecha(o).date().isoformat(),
                           "detalle": f"Orden {clase.lower()} de {tipo.lower()}",
                           "valor": round(v), "normal": round(med), "z": z})
        dur = [(o, (o.fecha_fin - o.fecha_inicio).total_seconds() / 3600)
               for o in os_ if o.fecha_inicio and o.fecha_fin and o.fecha_fin > o.fecha_inicio]
        for o, v, z, med in _atipicos(dur):
            salida.append({"clase": "DURACION", "referencia": o.numero, "activo": d.activos[o.activo_id].codigo,
                           "activo_id": o.activo_id, "fecha": _fecha(o).date().isoformat(),
                           "detalle": f"Orden {clase.lower()} de {tipo.lower()} (horas)",
                           "valor": round(v, 1), "normal": round(med, 1), "z": z})

    por_equipo: Dict[int, List] = defaultdict(list)
    for r in rend:
        if r.activo_id in d.activos and r.rendimiento > 0:
            por_equipo[r.activo_id].append(r)
    for aid, rs in por_equipo.items():
        # Cada equipo contra sí mismo: un tractocamión y una camioneta no
        # tienen el mismo rendimiento normal.
        for r, v, z, med in _atipicos([(r, r.rendimiento) for r in rs]):
            salida.append({"clase": "RENDIMIENTO", "referencia": f"Tanqueo {r.fecha.date().isoformat()}",
                           "activo": d.activos[aid].codigo, "activo_id": aid,
                           "fecha": r.fecha.date().isoformat(),
                           "detalle": "Rendimiento de combustible (km/gal) frente al del mismo equipo",
                           "valor": round(v, 2), "normal": round(med, 2), "z": z})
    salida.sort(key=lambda x: -abs(x["z"]))
    return {"dias": dias, "anomalias": salida, "umbral_z": 3.5,
            "ordenes_revisadas": len(recientes), "tanqueos_revisados": len(rend)}
