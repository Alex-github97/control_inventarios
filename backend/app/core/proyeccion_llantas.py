"""
Proyección de kilometraje de llantas y plan de recambio.

    Proyección = km recorridos + km/mm × mm útiles que le quedan

  * mm útiles: los utilizables de la llanta, de la configuración (general o por
    dimensión); sin configurar, la profundidad de diseño menos la mínima.
  * km/mm: el de la propia llanta en su vida actual si ya rodó lo suficiente
    (≥ 1.000 km y ≥ 1 mm gastado); si no, el promedio histórico de las vidas
    TERMINADAS de su referencia y vida, luego de su referencia, de su dimensión
    y por último de la flota. Siempre se dice de dónde salió.
  * km diario de cada vehículo: de sus lecturas de odómetro con fecha
    (movimientos de llantas y tanqueos) en la ventana configurada.

Con eso cada llanta tiene km faltantes, días restantes y fecha estimada de
cambio, y el plan los agrupa por mes, tipo de eje (direccional, tracción,
libre) y dimensión.

Para TittanLite no hay vida registrada: la profundidad actual sale de su última
inspección Lite y el km/mm es el promedio de la cuenta en TittanWare.
"""
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rendimiento_llantas import SIN_DATO, grupo_vida
from app.infrastructure.models.eam import (
    EAMActivo, EAMMovimientoNeumatico, EAMNeumatico, EAMNeumaticoConfig, EAMRegistroCombustible,
)

KM_MINIMO_PROPIO = 1000
MM_MINIMO_PROPIO = 1.0
MUESTRA_MINIMA = 3        # vidas terminadas para que un promedio valga
EJES = {"DIRECCIONAL": "Direccional", "TRACCION": "Tracción", "LIBRE": "Libre"}


@dataclass
class Proyeccion:
    neumatico_id: Optional[int]
    codigo: str
    activo_id: Optional[int]
    placa: Optional[str]
    tipo_vehiculo: Optional[str]
    posicion: Optional[str]
    tipo_uso: str
    medida: str
    marca: Optional[str]
    referencia: Optional[str]
    vida: str
    profundidad_actual: Optional[float]
    mm_utiles: Optional[float]
    mm_usados: Optional[float]
    mm_restantes: Optional[float]
    km_recorridos: float
    km_mm: Optional[float]
    fuente_km_mm: str
    km_faltantes: Optional[float]
    km_proyectado: Optional[float]
    km_diario: Optional[float]
    dias_restantes: Optional[int]
    fecha_cambio: Optional[date]


async def configuracion(db: AsyncSession) -> Dict[str, Any]:
    cfg = await db.get(EAMNeumaticoConfig, 1)
    return {
        "minima": float(cfg.profundidad_minima) if cfg and cfg.profundidad_minima is not None else 3.0,
        "mm_utiles": cfg.mm_utiles if cfg else None,
        "por_medida": {str(k).strip().upper(): float(v) for k, v in ((cfg.mm_utiles_por_medida if cfg else None)
                                                                    or {}).items() if v},
        "ventana": (cfg.ventana_km_diario if cfg and cfg.ventana_km_diario else 90),
    }


def mm_utiles(cfg: Dict[str, Any], medida: Optional[str], profundidad_inicial: Optional[float]) -> Optional[float]:
    m = (medida or "").strip().upper()
    if m and m in cfg["por_medida"]:
        return cfg["por_medida"][m]
    if cfg["mm_utiles"]:
        return float(cfg["mm_utiles"])
    if profundidad_inicial:
        return max(0.0, profundidad_inicial - cfg["minima"])
    return None


async def tablas_km_mm(db: AsyncSession, vidas=None) -> Dict[str, Dict]:
    """km/mm promedio de las vidas TERMINADAS: por (referencia, vida), por
    referencia, por dimensión y de la flota. Promedio ponderado: km / mm totales."""
    if vidas is None:
        from app.api.v1.endpoints.eam_neumaticos_informes import _vidas
        vidas = await _vidas(db)
    acum: Dict[str, Dict[Any, List[float]]] = {k: defaultdict(lambda: [0.0, 0.0, 0]) for k in
                                               ("ref_vida", "ref", "medida", "flota")}
    for v in vidas:
        if not v.terminada or not v.km or not v.mm or v.km < KM_MINIMO_PROPIO or v.mm < MM_MINIMO_PROPIO:
            continue
        ref = (v.categorias.get("referencia") or SIN_DATO).upper()
        claves = {"ref_vida": (ref, v.categorias.get("vida")), "ref": ref,
                  "medida": (v.categorias.get("medida") or SIN_DATO).strip().upper(), "flota": "flota"}
        for tabla, k in claves.items():
            a = acum[tabla][k]
            a[0] += v.km
            a[1] += v.mm
            a[2] += 1
    return {t: {k: (a[0] / a[1], a[2]) for k, a in d.items() if a[1] and a[2] >= (1 if t == "flota" else MUESTRA_MINIMA)}
            for t, d in acum.items()}


def km_mm_de_referencia(tablas, referencia: str, vida: str, medida: str) -> Tuple[Optional[float], str]:
    # Las claves de las tablas van en mayúsculas: Lite y TittanWare no escriben igual.
    referencia = (referencia or SIN_DATO).upper()
    for tabla, clave, nombre in (("ref_vida", (referencia, vida), f"promedio de {referencia} {vida}"),
                                 ("ref", referencia, f"promedio de {referencia}"),
                                 ("medida", (medida or "").strip().upper(), f"promedio de la dimensión {medida}"),
                                 ("flota", "flota", "promedio de la flota")):
        if clave in tablas.get(tabla, {}):
            v, n = tablas[tabla][clave]
            return round(v, 1), f"{nombre} ({n} vidas)"
    return None, "sin historial"


async def km_diario(db: AsyncSession, ventana: int, activo_ids: Optional[List[int]] = None,
                    extra: Optional[Dict[int, List[Tuple[datetime, float]]]] = None) -> Dict[int, float]:
    """km por día de cada vehículo con sus lecturas de odómetro con fecha. Se
    toma la ventana; si en ella hay menos de 7 días de diferencia, todo lo que
    haya."""
    if not extra:
        return await _km_diario_en_base(db, ventana, activo_ids)
    lecturas: Dict[int, List[Tuple[datetime, float]]] = defaultdict(list)
    for tabla, col_km in ((EAMMovimientoNeumatico, EAMMovimientoNeumatico.km_odometro),
                          (EAMRegistroCombustible, EAMRegistroCombustible.odometro)):
        q = select(tabla.activo_id, tabla.fecha, col_km).where(
            tabla.activo_id.isnot(None), tabla.fecha.isnot(None), col_km.isnot(None), col_km > 0)
        if activo_ids:
            q = q.where(tabla.activo_id.in_(activo_ids))
        for aid, f, km in (await db.execute(q)).all():
            lecturas[aid].append((f.replace(tzinfo=None) if hasattr(f, "tzinfo") else f, float(km)))
    for aid, ls in (extra or {}).items():
        lecturas[aid].extend(ls)
    corte = datetime.now() - timedelta(days=ventana)
    salida = {}
    for aid, ls in lecturas.items():
        for conjunto in ([x for x in ls if x[0] >= corte], ls):
            if len(conjunto) < 2:
                continue
            a, b = min(conjunto), max(conjunto)
            dias = (b[0] - a[0]).total_seconds() / 86400
            if dias >= 7 and b[1] > a[1]:
                salida[aid] = round((b[1] - a[1]) / dias, 1)
                break
    return salida


_SQL_KM_DIARIO = """
WITH lecturas AS (
    SELECT activo_id, fecha, km_odometro::float8 AS km FROM eam_movimiento_neumatico
     WHERE activo_id IS NOT NULL AND fecha IS NOT NULL AND km_odometro > 0 {filtro}
    UNION ALL
    SELECT activo_id, fecha, odometro::float8 FROM eam_registro_combustible
     WHERE activo_id IS NOT NULL AND fecha IS NOT NULL AND odometro > 0 {filtro}
)
SELECT activo_id,
       count(*) FILTER (WHERE fecha >= :corte),
       min(fecha) FILTER (WHERE fecha >= :corte),
       (array_agg(km ORDER BY fecha, km) FILTER (WHERE fecha >= :corte))[1],
       max(fecha) FILTER (WHERE fecha >= :corte),
       (array_agg(km ORDER BY fecha DESC, km DESC) FILTER (WHERE fecha >= :corte))[1],
       count(*), min(fecha), (array_agg(km ORDER BY fecha, km))[1],
       max(fecha), (array_agg(km ORDER BY fecha DESC, km DESC))[1]
  FROM lecturas GROUP BY activo_id
"""


async def _km_diario_en_base(db: AsyncSession, ventana: int,
                             activo_ids: Optional[List[int]] = None) -> Dict[int, float]:
    """Lo mismo que el cálculo en memoria de `km_diario`, pero la base devuelve
    solo la primera y la última lectura de cada vehículo (en la ventana y en
    total) en vez de todas: con 3.000 vehículos eran 600 mil filas y 6 s.

    «Primera» y «última» se desempatan igual que `min`/`max` sobre la pareja
    (fecha, km): a igual fecha, el km menor abre y el mayor cierra.
    """
    parametros: Dict[str, Any] = {"corte": datetime.now() - timedelta(days=ventana)}
    filtro = ""
    if activo_ids:
        filtro = "AND activo_id = ANY(:ids)"
        parametros["ids"] = list(activo_ids)
    salida = {}
    for aid, n1, fa1, ka1, fb1, kb1, n2, fa2, ka2, fb2, kb2 in (
            await db.execute(text(_SQL_KM_DIARIO.format(filtro=filtro)), parametros)).all():
        for n, fa, ka, fb, kb in ((n1, fa1, ka1, fb1, kb1), (n2, fa2, ka2, fb2, kb2)):
            if n < 2:
                continue
            dias = (fb - fa).total_seconds() / 86400
            if dias >= 7 and kb > ka:
                salida[aid] = round((kb - ka) / dias, 1)
                break
    return salida


def _completar(p: Proyeccion) -> Proyeccion:
    if p.km_mm is not None and p.mm_restantes is not None:
        p.km_faltantes = round(p.km_mm * p.mm_restantes)
        p.km_proyectado = round(p.km_recorridos + p.km_faltantes)
    if p.km_faltantes is not None and p.km_diario:
        p.dias_restantes = int(p.km_faltantes / p.km_diario)
        p.fecha_cambio = date.today() + timedelta(days=p.dias_restantes)
    return p


async def proyectar_flota(db: AsyncSession, activo_ids: Optional[List[int]] = None,
                          tipos_vehiculo: Optional[List[str]] = None) -> List[Proyeccion]:
    """Una proyección por llanta montada."""
    from app.api.v1.endpoints.eam_neumaticos_informes import _vidas
    from app.core.neumaticos_flota import TIPO_VEHICULO
    cfg = await configuracion(db)
    vidas = await _vidas(db)
    tablas = await tablas_km_mm(db, vidas)
    abiertas = {v.neumatico_id: v for v in vidas if not v.terminada}
    q = select(EAMNeumatico, EAMActivo).join(EAMActivo, EAMActivo.id == EAMNeumatico.activo_id).where(
        EAMNeumatico.estado == "INSTALADO")
    if activo_ids:
        q = q.where(EAMActivo.id.in_(activo_ids))
    if tipos_vehiculo:
        q = q.where(EAMActivo.tipo_activo.in_(tipos_vehiculo))
    filas = (await db.execute(q)).all()
    diario = await km_diario(db, cfg["ventana"], list({a.id for _, a in filas}) or None)
    salida = []
    for n, a in filas:
        v = abiertas.get(n.id)
        vida = grupo_vida(v.vida) if v else ("VN" if not n.reencauches else f"R{n.reencauches}")
        referencia = v.categorias.get("referencia") if v else (f"{n.marca} · {n.referencia}" if n.referencia else n.marca)
        inicial = n.profundidad_diseño
        actual = n.profundidad_actual
        utiles = mm_utiles(cfg, n.medida, inicial)
        usados = (v.mm if v and v.mm is not None else
                  (max(0.0, inicial - actual) if inicial is not None and actual is not None else None))
        recorridos = float(v.km or 0) if v else float(n.km_total or 0)
        if recorridos >= KM_MINIMO_PROPIO and usados and usados >= MM_MINIMO_PROPIO:
            kmm, fuente = round(recorridos / usados, 1), "de la propia llanta"
        else:
            kmm, fuente = km_mm_de_referencia(tablas, referencia or SIN_DATO, vida, n.medida)
        restantes = (max(0.0, utiles - usados) if utiles is not None and usados is not None else
                     (max(0.0, actual - cfg["minima"]) if actual is not None else None))
        salida.append(_completar(Proyeccion(
            neumatico_id=n.id, codigo=n.codigo, activo_id=a.id, placa=a.placa or a.codigo,
            tipo_vehiculo=TIPO_VEHICULO.get(a.tipo_activo or "", a.tipo_activo), posicion=n.posicion,
            tipo_uso=(n.tipo_uso or SIN_DATO).upper(), medida=(n.medida or SIN_DATO).strip(), marca=n.marca,
            referencia=n.referencia, vida=vida, profundidad_actual=actual, mm_utiles=utiles,
            mm_usados=round(usados, 1) if usados is not None else None,
            mm_restantes=round(restantes, 1) if restantes is not None else None, km_recorridos=round(recorridos),
            km_mm=kmm, fuente_km_mm=fuente, km_faltantes=None, km_proyectado=None, km_diario=diario.get(a.id),
            dias_restantes=None, fecha_cambio=None)))
    return salida


async def proyectar_lite(db: AsyncSession, desde: Optional[datetime] = None,
                         activo_ids: Optional[List[int]] = None) -> List[Proyeccion]:
    """Con la última inspección de TittanLite de cada vehículo: profundidad de
    campo, km/mm promedio de la cuenta en TittanWare y km diario de las lecturas
    Lite (o, si no alcanzan, las de TittanWare)."""
    from app.core.neumaticos_flota import TIPO_VEHICULO
    from app.infrastructure.models.lite import LiteInspeccion, LiteInspeccionLlanta
    cfg = await configuracion(db)
    tablas = await tablas_km_mm(db)
    q = select(LiteInspeccion)
    if desde:
        q = q.where(LiteInspeccion.fecha >= desde)
    if activo_ids:
        q = q.where(LiteInspeccion.activo_id.in_(activo_ids))
    todas = (await db.execute(q.order_by(LiteInspeccion.fecha))).scalars().all()
    ultima: Dict[int, Any] = {}
    lecturas: Dict[int, List[Tuple[datetime, float]]] = defaultdict(list)
    for i in todas:
        ultima[i.activo_id] = i
        if i.odometro:
            lecturas[i.activo_id].append((i.fecha, float(i.odometro)))
    if not ultima:
        return []
    activos = {a.id: a for a in (await db.execute(select(EAMActivo).where(EAMActivo.id.in_(list(ultima))))).scalars()}
    diario = await km_diario(db, cfg["ventana"], list(ultima), extra=lecturas)
    lineas = (await db.execute(select(LiteInspeccionLlanta).where(
        LiteInspeccionLlanta.inspeccion_id.in_([i.id for i in ultima.values()])))).scalars().all()
    por_insp = {i.id: i for i in ultima.values()}
    conocidas = {n.codigo: n for n in (await db.execute(select(EAMNeumatico).where(
        EAMNeumatico.codigo.in_({ln.codigo for ln in lineas if ln.codigo} or {""})))).scalars()}
    # Profundidad nueva típica de cada dimensión en la cuenta, para estimar los
    # mm usados de una llanta que TittanWare no conoce.
    diseno: Dict[str, List[float]] = defaultdict(list)
    for med, prof in (await db.execute(select(EAMNeumatico.medida, EAMNeumatico.profundidad_diseño).where(
            EAMNeumatico.profundidad_diseño.isnot(None)))).all():
        diseno[(med or "").strip().upper()].append(prof)
    salida = []
    for ln in lineas:
        if "SIN_LLANTA" in (ln.novedades or []):
            continue
        insp = por_insp[ln.inspeccion_id]
        a = activos.get(insp.activo_id)
        k = conocidas.get(ln.codigo) if ln.codigo else None
        medida = (ln.medida or (k.medida if k else None) or SIN_DATO).strip()
        marca = ln.marca or (k.marca if k else None)
        ref_txt = ln.referencia or (k.referencia if k else None)
        referencia = f"{marca} · {ref_txt}" if marca and ref_txt else (marca or SIN_DATO)
        reenc = ln.reencauches if ln.reencauches is not None else ((k.reencauches or 0) if k else 0)
        vida = grupo_vida("VN" if not reenc else f"R{reenc}")
        prof = [x for x in (ln.profundidad_interna, ln.profundidad_central, ln.profundidad_externa) if x is not None]
        actual = min(prof) if prof else None
        tipicas = diseno.get(medida.upper())
        inicial = (k.profundidad_diseño if k and k.profundidad_diseño else
                   (sum(tipicas) / len(tipicas) if tipicas else None))
        utiles = mm_utiles(cfg, medida, inicial)
        usados = max(0.0, inicial - actual) if inicial is not None and actual is not None else None
        restantes = (max(0.0, utiles - usados) if utiles is not None and usados is not None else
                     (max(0.0, actual - cfg["minima"]) if actual is not None else None))
        kmm, fuente = km_mm_de_referencia(tablas, referencia, vida, medida)
        recorridos = round(kmm * usados) if kmm and usados else 0.0
        salida.append(_completar(Proyeccion(
            neumatico_id=k.id if k else None, codigo=ln.codigo or "s/c", activo_id=insp.activo_id,
            placa=(a.placa or a.codigo) if a else None,
            tipo_vehiculo=TIPO_VEHICULO.get(a.tipo_activo or "", a.tipo_activo) if a else None, posicion=ln.posicion,
            tipo_uso=((k.tipo_uso if k else None) or _eje_de_posicion(ln.posicion)).upper(), medida=medida,
            marca=marca, referencia=ref_txt, vida=vida, profundidad_actual=actual, mm_utiles=utiles,
            mm_usados=round(usados, 1) if usados is not None else None,
            mm_restantes=round(restantes, 1) if restantes is not None else None, km_recorridos=recorridos,
            km_mm=kmm, fuente_km_mm=fuente + (" · km recorridos estimados" if recorridos else ""),
            km_faltantes=None, km_proyectado=None, km_diario=diario.get(insp.activo_id), dias_restantes=None,
            fecha_cambio=None)))
    return salida


def _eje_de_posicion(posicion: Optional[str]) -> str:
    """Sin dato de uso, el primer eje se toma como direccional y el resto como
    tracción: es lo más común en camiones; se dice como estimado."""
    if posicion and posicion.upper().startswith("E1"):
        return "DIRECCIONAL"
    return "TRACCION" if posicion and posicion.upper().startswith("E") else SIN_DATO


def plan(proyecciones: List[Proyeccion], meses: int = 6) -> Dict[str, Any]:
    """Cuántas llantas se cambian por mes, por tipo de eje y por dimensión."""
    hoy = date.today()
    limite = date(hoy.year + (hoy.month - 1 + meses) // 12, (hoy.month - 1 + meses) % 12 + 1, 1)
    por_mes: Dict[str, Dict[str, Any]] = {}
    sin_fecha = defaultdict(int)
    # Para el tablero: qué tan urgente, qué vehículos y qué marcas.
    rangos = [("Vencidas", 0), ("En 30 días", 30), ("31 a 90 días", 90), ("91 a 180 días", 180),
              ("Más de 180 días", 10 ** 6)]
    urgencia = {r: 0 for r, _ in rangos}
    por_vehiculo: Dict[str, int] = defaultdict(int)
    por_marca: Dict[str, int] = defaultdict(int)
    for p in proyecciones:
        if p.fecha_cambio is None:
            motivo = ("sin km diario del vehículo" if p.km_faltantes is not None and not p.km_diario
                      else "sin km/mm" if p.km_mm is None else "sin profundidad")
            sin_fecha[motivo] += 1
            continue
        if p.fecha_cambio >= limite:
            continue
        mes = "Vencidas" if p.dias_restantes is not None and p.dias_restantes <= 0 else p.fecha_cambio.strftime("%Y-%m")
        urgencia[next(r for r, tope in rangos if (p.dias_restantes or 0) <= tope)] += 1
        por_vehiculo[p.placa or "Sin placa"] += 1
        por_marca[(p.marca or SIN_DATO).strip().upper()] += 1
        m = por_mes.setdefault(mes, {"mes": mes, "total": 0, "por_eje": defaultdict(int), "por_medida": defaultdict(int),
                                     "cruce": defaultdict(int)})
        eje = EJES.get(p.tipo_uso, "Sin dato de eje")
        m["total"] += 1
        m["por_eje"][eje] += 1
        m["por_medida"][p.medida] += 1
        m["cruce"][(eje, p.medida)] += 1
    filas = sorted(por_mes.values(), key=lambda x: ("0" if x["mes"] == "Vencidas" else x["mes"]))
    for m in filas:
        m["por_eje"] = dict(m["por_eje"])
        m["por_medida"] = dict(m["por_medida"])
        m["cruce"] = [{"eje": e, "medida": med, "cantidad": c} for (e, med), c in
                      sorted(m["cruce"].items(), key=lambda kv: -kv[1])]
    totales_eje = defaultdict(int)
    totales_medida = defaultdict(int)
    for m in filas:
        for k, v in m["por_eje"].items():
            totales_eje[k] += v
        for k, v in m["por_medida"].items():
            totales_medida[k] += v
    con = [p for p in proyecciones if p.km_proyectado]
    return {
        "meses": filas, "horizonte_meses": meses,
        "total": sum(m["total"] for m in filas),
        "por_eje": dict(totales_eje), "por_medida": dict(sorted(totales_medida.items(), key=lambda kv: -kv[1])),
        "sin_fecha": dict(sin_fecha), "llantas": len(proyecciones),
        "urgencia": [{"rango": r, "cantidad": c} for r, c in urgencia.items()],
        "por_vehiculo": [{"placa": k, "cantidad": v} for k, v in sorted(por_vehiculo.items(), key=lambda kv: -kv[1])[:12]],
        "por_marca": [{"marca": k, "cantidad": v} for k, v in sorted(por_marca.items(), key=lambda kv: -kv[1])[:10]],
        "km_proyectado_promedio": round(sum(p.km_proyectado for p in con) / len(con)) if con else None,
    }


def como_dict(p: Proyeccion) -> Dict[str, Any]:
    d = asdict(p)
    d["fecha_cambio"] = p.fecha_cambio.isoformat() if p.fecha_cambio else None
    return d
