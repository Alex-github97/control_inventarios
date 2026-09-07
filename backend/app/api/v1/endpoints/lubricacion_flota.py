"""
Lubricación — la flota como eje del análisis.

QUÉ RESUELVE ESTE ARCHIVO
Todo lo anterior respondía «qué le pasa a esta muestra». Acá la pregunta es
«qué le pasa a este segmento de la flota»: los Cascadia con motor DD15, los
tractocamiones de una línea, una placa concreta. Es la pregunta con la que se
decide un intervalo de cambio o un cambio de proveedor de aceite, y no se
puede responder muestra por muestra.

EL EJE ES EL KILOMETRAJE, NO LA FECHA
Un vehículo parado tres meses no envejece su aceite. Dos muestras con la misma
fecha y con 8.000 km de diferencia no son comparables, y un informe que grafique
contra el calendario mezcla las dos. Por eso todas las series de acá van contra
`medidor_equipo` —la lectura del odómetro al tomar la muestra— y no contra
`fecha_toma`. Es la misma razón por la que ASTM D7669 pide normalizar la
tendencia por unidad de vida del aceite.

LA CORRELACIÓN ES DE PEARSON, Y SE DICE
Se calcula con `normas_lubricacion.pearson`, que devuelve `None` cuando no hay
con qué —menos de cuatro puntos, o una serie constante— en vez de un cero que
se leería como «no hay relación». Cada coeficiente viaja con su `n`: un 0,99
sobre cuatro puntos no dice nada, y sin la cantidad de muestras eso no se ve.
"""
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Select, and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.normas_lubricacion import (
    FUENTES, GRUPO_DESGASTE, LIMITES_HIDRAULICO, LIMITES_MOTOR, NATURALEZA,
    BANDA_SAE_100C, DESVIO_VISCOSIDAD, MINIMO_POBLACION_D7720,
    PERCENTIL_CONDENA, PERCENTIL_PRECAUCION, REGLAS,
    limites_estadisticos, pearson, regresion,
)
from app.infrastructure.models.eam import EAMActivo
from app.infrastructure.models.lubricacion import (
    LubeCarga, LubeCompartimento, LubeDiagnostico, LubeMotivoDrenaje,
    LubeMuestra, LubeParametro, LubeRelleno, LubeResultado,
    LubeTipoCompartimento,
)

router = APIRouter(prefix="/eam/lube/interpretacion",
                   tags=["CMMS/EAM · Lubricación · Interpretación"])


# ══════════════════════════════════════════════════════════════════════════════
# El filtro de flota
#
# Marca, línea, modelo, tipo y motor son TEXTO en `eam_activo`, no llaves
# foráneas. Es la convención que ya usan el tablero de causa raíz y la
# analítica de lubricación, y hay que respetarla: si este informe filtrara por
# otro camino, sus cifras no se podrían comparar con las de aquellos y habría
# dos verdades para la misma pregunta.
# ══════════════════════════════════════════════════════════════════════════════

class FiltroFlota:
    """Los criterios de segmentación, como dependencia de FastAPI.

    Va como clase y no como seis parámetros repetidos en cada endpoint porque
    son seis, aparecen en cinco endpoints, y cada vez que se agregara uno
    habría que acordarse de los cinco sitios.
    """

    def __init__(
        self,
        marca: Optional[str] = Query(None, description="Marca del vehículo"),
        linea: Optional[str] = Query(None, description="Línea del vehículo"),
        modelo: Optional[str] = Query(None, description="Modelo del vehículo"),
        tipo: Optional[str] = Query(None, description="Tipo de activo"),
        motor: Optional[str] = Query(None, description="Motor: «marca · línea»"),
        placa: Optional[str] = Query(None, description="Código o placa del activo"),
        compartimento: Optional[str] = Query(
            None, description="Código del tipo de compartimento: MOT, HID…"),
    ):
        self.marca = marca or None
        self.linea = linea or None
        self.modelo = modelo or None
        self.tipo = tipo or None
        self.motor = motor or None
        self.placa = placa or None
        self.compartimento = compartimento or None

    @property
    def activo(self) -> bool:
        """¿Hay algún criterio puesto? Sirve para rotular la pantalla."""
        return any([self.marca, self.linea, self.modelo, self.tipo,
                    self.motor, self.placa, self.compartimento])

    def aplicar(self, q: Select) -> Select:
        """Añade los criterios a una consulta que ya tenga `EAMActivo` unido."""
        if self.marca:
            q = q.where(EAMActivo.marca == self.marca)
        if self.linea:
            q = q.where(EAMActivo.linea == self.linea)
        if self.modelo:
            q = q.where(EAMActivo.modelo == self.modelo)
        if self.tipo:
            q = q.where(EAMActivo.tipo_activo == self.tipo)
        if self.placa:
            # El activo se identifica por código, y la placa es un campo
            # aparte que puede estar vacío. Se acepta cualquiera de los dos
            # porque quien escribe en el filtro no sabe cuál guardó el sistema.
            q = q.where((EAMActivo.codigo == self.placa)
                        | (EAMActivo.placa == self.placa))
        if self.motor:
            # El motor se identifica por «marca · línea» en un solo valor:
            # separarlo en dos selectores obligaría a escoger la marca del
            # motor antes de ver las opciones, y nadie recuerda que el DD15 es
            # Detroit.
            marca, _, linea = self.motor.partition(" · ")
            q = q.where(EAMActivo.motor_marca == marca.strip())
            if linea.strip():
                q = q.where(EAMActivo.motor_linea == linea.strip())
        if self.compartimento:
            q = q.where(LubeTipoCompartimento.codigo == self.compartimento)
        return q

    def como_dict(self) -> Dict[str, Optional[str]]:
        return {"marca": self.marca, "linea": self.linea, "modelo": self.modelo,
                "tipo": self.tipo, "motor": self.motor, "placa": self.placa,
                "compartimento": self.compartimento}


def _base_muestras(f: FiltroFlota, desde: Optional[datetime] = None) -> Select:
    """Las muestras válidas del segmento, con la jerarquía del activo unida.

    `LubeTipoCompartimento` entra siempre en el JOIN aunque no se filtre por
    él: el filtro por familia de compartimento lo necesita, y montar dos
    consultas distintas según el filtro es la manera de que una de las dos se
    quede sin arreglar.
    """
    q = (select(LubeMuestra, LubeCompartimento, EAMActivo, LubeTipoCompartimento)
         .join(LubeCompartimento,
               LubeCompartimento.id == LubeMuestra.compartimento_id)
         .join(EAMActivo, EAMActivo.id == LubeCompartimento.activo_id)
         .join(LubeTipoCompartimento,
               LubeTipoCompartimento.id == LubeCompartimento.tipo_compartimento_id)
         .where(LubeMuestra.estado != "ANULADA"))
    if desde is not None:
        q = q.where(LubeMuestra.fecha_toma >= desde)
    return f.aplicar(q)


# ══════════════════════════════════════════════════════════════════════════════
# 1. Las opciones de los filtros
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/filtros")
async def filtros(db: AsyncSession = Depends(get_db)):
    """Qué se puede escoger, y solo lo que tiene muestras.

    POR QUÉ SOLO LO QUE TIENE MUESTRAS
    Un selector que ofrece treinta marcas de las cuales cuatro tienen análisis
    hace que el usuario escoja una de las veintiséis vacías y concluya que la
    pantalla está rota. Se listan las opciones con su conteo de muestras, y las
    que no tienen no aparecen.

    Cada opción viaja con su padre —la línea sabe de qué marca es— para que el
    frontend pueda encadenar los selectores sin volver a preguntar.
    """
    filas = (await db.execute(
        select(EAMActivo.tipo_activo, EAMActivo.marca, EAMActivo.linea,
               EAMActivo.modelo, EAMActivo.motor_marca, EAMActivo.motor_linea,
               EAMActivo.codigo, EAMActivo.placa, EAMActivo.nombre,
               func.count(LubeMuestra.id))
        .join(LubeCompartimento, LubeCompartimento.activo_id == EAMActivo.id)
        .join(LubeMuestra, LubeMuestra.compartimento_id == LubeCompartimento.id)
        .where(LubeMuestra.estado != "ANULADA")
        .group_by(EAMActivo.tipo_activo, EAMActivo.marca, EAMActivo.linea,
                  EAMActivo.modelo, EAMActivo.motor_marca,
                  EAMActivo.motor_linea, EAMActivo.codigo, EAMActivo.placa,
                  EAMActivo.nombre)
    )).all()

    tipos: Dict[str, int] = defaultdict(int)
    marcas: Dict[str, int] = defaultdict(int)
    lineas: Dict[tuple, int] = defaultdict(int)
    modelos: Dict[tuple, int] = defaultdict(int)
    motores: Dict[tuple, int] = defaultdict(int)
    placas: List[Dict[str, Any]] = []

    for (tipo, marca, linea, modelo, mot_marca, mot_linea,
         codigo, placa, nombre, n) in filas:
        if tipo:
            tipos[tipo] += n
        if marca:
            marcas[marca] += n
            if linea:
                lineas[(linea, marca)] += n
                if modelo:
                    modelos[(modelo, linea)] += n
        if mot_marca:
            etiqueta = f"{mot_marca} · {mot_linea}" if mot_linea else mot_marca
            motores[(etiqueta, marca or "")] += n
        placas.append({"valor": codigo, "etiqueta": codigo,
                       "detalle": f"{nombre}"[:60],
                       "placa": placa, "marca": marca, "linea": linea,
                       "modelo": modelo, "muestras": n})

    def _lista(d: Dict[Any, int], con_padre: bool = False):
        salida = []
        for clave, n in d.items():
            if con_padre:
                valor, padre = clave
                salida.append({"valor": valor, "etiqueta": valor,
                               "padre": padre or None, "muestras": n})
            else:
                salida.append({"valor": clave, "etiqueta": clave,
                               "padre": None, "muestras": n})
        salida.sort(key=lambda x: (-x["muestras"], x["etiqueta"]))
        return salida

    comps = (await db.execute(
        select(LubeTipoCompartimento.codigo, LubeTipoCompartimento.nombre,
               func.count(LubeMuestra.id))
        .join(LubeCompartimento,
              LubeCompartimento.tipo_compartimento_id == LubeTipoCompartimento.id)
        .join(LubeMuestra, LubeMuestra.compartimento_id == LubeCompartimento.id)
        .where(LubeMuestra.estado != "ANULADA")
        .group_by(LubeTipoCompartimento.codigo, LubeTipoCompartimento.nombre)
    )).all()

    placas.sort(key=lambda x: x["etiqueta"])
    return {
        "tipos": _lista(tipos),
        "marcas": _lista(marcas),
        "lineas": _lista(lineas, con_padre=True),
        "modelos": _lista(modelos, con_padre=True),
        "motores": _lista(motores, con_padre=True),
        "compartimentos": [{"valor": c, "etiqueta": n, "padre": None,
                            "muestras": k} for c, n, k in comps
                           if c and c != "GRA"],
        "placas": placas,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 2. El tablero del programa
#
# Mudado desde la pantalla de operación de lubricación. Allá estaba fuera de
# lugar: aquella pantalla es para registrar cargas y muestras, y un tablero
# entre las pestañas de registro obliga a irse del trabajo para consultar y a
# volver. Acá vive con el resto del análisis y hereda el filtro de flota, que
# es lo que le faltaba: «parámetros que más disparan» sin poder acotar a una
# familia de motores no permite actuar sobre nada.
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/programa")
async def programa(
    dias: int = Query(365, ge=30, le=3650),
    f: FiltroFlota = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Cómo va el programa en el segmento filtrado.

    SIN TOPE EN LA LISTA DE PARÁMETROS
    La versión anterior mostraba los doce que más disparan. Doce es suficiente
    para la foto general y es exactamente lo que estorba cuando se busca un
    parámetro concreto: el que se quiere revisar es, casi siempre, uno que no
    está entre los doce primeros. Acá va la lista completa de todo lo que se
    disparó alguna vez, y la pantalla la muestra en un cuadro del mismo tamaño
    con desplazamiento.
    """
    desde = datetime.utcnow() - timedelta(days=dias)

    filas = (await db.execute(_base_muestras(f, desde))).all()
    ids = [m.id for m, _, _, _ in filas]
    total = len(filas)

    por_severidad: Dict[str, int] = defaultdict(int)
    for m, _c, _a, _t in filas:
        por_severidad[m.severidad or "PENDIENTE"] += 1

    # ── Parámetros que disparan, completos y con su código ───────────────────
    # El código viaja porque la pantalla lo necesita para pedir la correlación
    # de ese parámetro al hacer clic. Sin él habría que adivinarlo del nombre.
    parametros: List[Dict[str, Any]] = []
    if ids:
        r = await db.execute(
            select(LubeParametro.codigo, LubeParametro.nombre,
                   LubeParametro.grupo, LubeParametro.unidad,
                   LubeParametro.origen_probable,
                   func.count(LubeResultado.id),
                   func.sum(case((LubeResultado.estado == "CRITICO", 1), else_=0)),
                   func.count(func.distinct(LubeMuestra.compartimento_id)))
            .join(LubeResultado, LubeResultado.parametro_id == LubeParametro.id)
            .join(LubeMuestra, LubeMuestra.id == LubeResultado.muestra_id)
            .where(and_(LubeResultado.estado.in_(("MARGINAL", "CRITICO")),
                        LubeResultado.muestra_id.in_(ids)))
            .group_by(LubeParametro.codigo, LubeParametro.nombre,
                      LubeParametro.grupo, LubeParametro.unidad,
                      LubeParametro.origen_probable)
            .order_by(func.count(LubeResultado.id).desc()))
        parametros = [{
            "codigo": cod, "etiqueta": nom, "grupo": gr, "unidad": un,
            "origen": org, "cantidad": c, "criticas": int(k or 0),
            "equipos": eq,
        } for cod, nom, gr, un, org, c, k, eq in r.all()]

    # ── Motivos de drenaje del segmento ──────────────────────────────────────
    q = (select(LubeMotivoDrenaje.nombre, LubeMotivoDrenaje.categoria,
                LubeMotivoDrenaje.evitable, func.count(LubeCarga.id),
                func.avg(LubeCarga.vida_lograda))
         .join(LubeCarga, LubeCarga.motivo_drenaje_id == LubeMotivoDrenaje.id)
         .join(LubeCompartimento,
               LubeCompartimento.id == LubeCarga.compartimento_id)
         .join(EAMActivo, EAMActivo.id == LubeCompartimento.activo_id)
         .join(LubeTipoCompartimento,
               LubeTipoCompartimento.id == LubeCompartimento.tipo_compartimento_id)
         .where(and_(LubeCarga.estado == "DRENADA",
                     LubeCarga.fecha_drenaje >= desde))
         .group_by(LubeMotivoDrenaje.nombre, LubeMotivoDrenaje.categoria,
                   LubeMotivoDrenaje.evitable)
         .order_by(func.count(LubeCarga.id).desc()))
    drenajes = [{"etiqueta": n, "categoria": cat, "evitable": bool(ev),
                 "cantidad": c, "vida_promedio": round(float(v), 1) if v else None}
                for n, cat, ev, c, v in (await db.execute(f.aplicar(q))).all()]

    # ── Costo por unidad de vida ─────────────────────────────────────────────
    # El aceite de reposición entra en la cuenta: en un equipo con fuga puede
    # ser el grueso del gasto, y dejarlo fuera daría un costo por hora más bajo
    # que el de la ficha de cada carga.
    rellenos = (select(LubeRelleno.carga_id.label("carga_id"),
                       func.sum(func.coalesce(LubeRelleno.costo, 0)).label("costo"))
                .group_by(LubeRelleno.carga_id).subquery())
    q = (select(LubeTipoCompartimento.nombre, LubeTipoCompartimento.unidad_vida,
                func.count(LubeCarga.id),
                func.sum(func.coalesce(LubeCarga.costo_aceite, 0)
                         + func.coalesce(LubeCarga.costo_filtro, 0)
                         + func.coalesce(LubeCarga.costo_mano_obra, 0)
                         + func.coalesce(rellenos.c.costo, 0)),
                func.sum(LubeCarga.vida_lograda))
         .join(LubeCompartimento,
               LubeCompartimento.tipo_compartimento_id == LubeTipoCompartimento.id)
         .join(EAMActivo, EAMActivo.id == LubeCompartimento.activo_id)
         .join(LubeCarga, LubeCarga.compartimento_id == LubeCompartimento.id)
         .outerjoin(rellenos, rellenos.c.carga_id == LubeCarga.id)
         .where(and_(LubeCarga.estado == "DRENADA",
                     LubeCarga.fecha_drenaje >= desde))
         .group_by(LubeTipoCompartimento.nombre,
                   LubeTipoCompartimento.unidad_vida))
    costos = []
    for nombre, unidad, n, costo, vida in (await db.execute(f.aplicar(q))).all():
        costo, vida = float(costo or 0), float(vida or 0)
        costos.append({"etiqueta": nombre, "unidad": unidad, "cargas": n,
                       "costo_total": round(costo, 2), "vida_total": round(vida, 1),
                       "costo_por_unidad": round(costo / vida, 2) if vida else None})

    # ── Por marca y por línea dentro del segmento ────────────────────────────
    async def _por(campo):
        q = (select(campo, func.count(LubeMuestra.id),
                    func.sum(case((LubeMuestra.severidad.in_(
                        ("CRITICO", "ACCION_INMEDIATA")), 1), else_=0)))
             .join(LubeCompartimento, LubeCompartimento.activo_id == EAMActivo.id)
             .join(LubeTipoCompartimento,
                   LubeTipoCompartimento.id == LubeCompartimento.tipo_compartimento_id)
             .join(LubeMuestra,
                   LubeMuestra.compartimento_id == LubeCompartimento.id)
             .where(and_(LubeMuestra.fecha_toma >= desde,
                         LubeMuestra.estado != "ANULADA", campo.isnot(None)))
             .group_by(campo).order_by(func.count(LubeMuestra.id).desc()))
        return [{"etiqueta": n, "cantidad": c, "criticas": int(k or 0)}
                for n, c, k in (await db.execute(f.aplicar(q))).all()]

    por_marca = await _por(EAMActivo.marca)
    por_linea = await _por(EAMActivo.linea)

    # ── Acierto del diagnóstico, solo del segmento ───────────────────────────
    # La versión anterior contaba los diagnósticos de toda la empresa y los
    # presentaba junto a cifras filtradas. Con un filtro puesto eso produce un
    # tablero donde una parte de los números habla de la flota entera: la
    # inconsistencia no se nota y desacredita el resto.
    verificacion: Dict[str, int] = {}
    if ids:
        verificacion = {v: c for v, c in (await db.execute(
            select(LubeDiagnostico.verificacion, func.count(LubeDiagnostico.id))
            .where(LubeDiagnostico.muestra_id.in_(ids))
            .group_by(LubeDiagnostico.verificacion))).all()}
    confirmados = verificacion.get("CONFIRMADO", 0)
    desmentidos = verificacion.get("DESMENTIDO", 0)
    acierto = (round(confirmados / (confirmados + desmentidos) * 100, 1)
               if (confirmados + desmentidos) else None)

    # ── Calidad del dato: compartimentos sin puerto de muestreo ──────────────
    q = (select(func.count(func.distinct(LubeCompartimento.id)))
         .select_from(LubeCompartimento)
         .join(EAMActivo, EAMActivo.id == LubeCompartimento.activo_id)
         .join(LubeTipoCompartimento,
               LubeTipoCompartimento.id == LubeCompartimento.tipo_compartimento_id)
         .where(and_(LubeCompartimento.activo.is_(True),
                     LubeTipoCompartimento.codigo != "GRA")))
    comps_total = (await db.execute(f.aplicar(q))).scalar() or 0
    sin_puerto = (await db.execute(f.aplicar(
        q.where(LubeCompartimento.tiene_puerto_muestreo.is_(False))))).scalar() or 0

    return {
        "filtro": f.como_dict(),
        "dias": dias,
        "total_muestras": total,
        "por_severidad": dict(por_severidad),
        "criticas": (por_severidad.get("CRITICO", 0)
                     + por_severidad.get("ACCION_INMEDIATA", 0)),
        "parametros": parametros,
        "drenajes": drenajes,
        "costos": costos,
        "por_marca": por_marca,
        "por_linea": por_linea,
        "diagnostico": {"confirmados": confirmados, "desmentidos": desmentidos,
                        "pendientes": verificacion.get("PENDIENTE", 0),
                        "acierto_pct": acierto},
        "compartimentos": comps_total,
        "sin_puerto_muestreo": sin_puerto,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 3. La correlación de UN parámetro contra todos los demás
#
# Es lo que se abre al hacer clic en un parámetro del tablero. La matriz
# completa —que sigue existiendo en la pestaña de correlación— responde «qué se
# mueve con qué en general»; esto responde «este que me está disparando, con
# qué viene acompañado», que es la pregunta que se hace cuando ya se detectó
# algo y hay que decidir qué revisar.
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/correlacion-de/{codigo}")
async def correlacion_de(
    codigo: str,
    dias: int = Query(1460, ge=90, le=3650),
    minimo: int = Query(6, ge=4, le=200),
    f: FiltroFlota = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Pearson de un parámetro contra el resto, ordenado por fuerza.

    Solo se emparejan muestras donde AMBOS parámetros están medidos. Rellenar
    el faltante con cero produciría correlaciones altísimas entre parámetros
    que simplemente se piden juntos en el mismo paquete de laboratorio.
    """
    catalogo = {p.codigo: p for p in (await db.execute(
        select(LubeParametro))).scalars().all()}
    objetivo = catalogo.get(codigo)
    if not objetivo:
        raise HTTPException(404, f"No existe el parámetro «{codigo}».")
    if objetivo.es_texto:
        raise HTTPException(
            400, f"«{objetivo.nombre}» no es numérico: el código ISO 4406 son "
                 f"tres números que solo tienen sentido juntos y no se "
                 f"correlaciona.")

    desde = datetime.utcnow() - timedelta(days=dias)
    q = (select(LubeResultado.muestra_id, LubeParametro.codigo,
                LubeResultado.valor)
         .join(LubeParametro, LubeParametro.id == LubeResultado.parametro_id)
         .join(LubeMuestra, LubeMuestra.id == LubeResultado.muestra_id)
         .join(LubeCompartimento,
               LubeCompartimento.id == LubeMuestra.compartimento_id)
         .join(EAMActivo, EAMActivo.id == LubeCompartimento.activo_id)
         .join(LubeTipoCompartimento,
               LubeTipoCompartimento.id == LubeCompartimento.tipo_compartimento_id)
         .where(and_(LubeMuestra.fecha_toma >= desde,
                     LubeMuestra.estado != "ANULADA",
                     LubeResultado.valor.isnot(None),
                     LubeParametro.es_texto.is_(False))))

    por_muestra: Dict[int, Dict[str, float]] = defaultdict(dict)
    for muestra_id, cod, valor in (await db.execute(f.aplicar(q))).all():
        por_muestra[muestra_id][cod] = float(valor)

    contra: List[Dict[str, Any]] = []
    for otro, p in catalogo.items():
        if otro == codigo or p.es_texto:
            continue
        xs, ys = [], []
        for valores in por_muestra.values():
            if codigo in valores and otro in valores:
                xs.append(valores[codigo])
                ys.append(valores[otro])
        if len(xs) < minimo:
            continue
        r = pearson(xs, ys)
        contra.append({
            "codigo": otro, "nombre": p.nombre, "grupo": p.grupo,
            "unidad": p.unidad, "origen_probable": p.origen_probable,
            "r": r, "n": len(xs),
        })

    # Por fuerza de la relación, sin importar el signo: una correlación
    # negativa fuerte —viscosidad contra combustible— es tan informativa como
    # una positiva, y ordenar por valor con signo la manda al final.
    contra.sort(key=lambda x: -abs(x["r"]) if x["r"] is not None else 1)

    return {
        "codigo": codigo,
        "nombre": objetivo.nombre,
        "unidad": objetivo.unidad,
        "grupo": objetivo.grupo,
        "origen_probable": objetivo.origen_probable,
        "filtro": f.como_dict(),
        "muestras": len(por_muestra),
        "metodo": "Coeficiente de correlación de Pearson sobre las muestras "
                  "donde ambos parámetros están medidos.",
        "contra": contra,
        "nota": "Que dos parámetros suban juntos no prueba que uno cause el "
                "otro: pueden tener los dos una tercera causa, o coincidir. "
                "El coeficiente sirve para orientar qué revisar, no para "
                "concluir.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# 4. Evolución contra el kilometraje
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/evolucion")
async def evolucion(
    dias: int = Query(1460, ge=90, le=3650),
    f: FiltroFlota = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Cómo se comporta cada muestra a lo largo del recorrido del vehículo.

    Una serie por placa, con el kilometraje en el eje y la severidad de cada
    muestra como color. Responde «cómo viene esta flota con el recorrido», que
    es distinto de «cómo viene con el tiempo»: un vehículo parado no envejece
    su aceite.

    Las muestras sin lectura de odómetro quedan fuera y se informa cuántas
    son. Ponerlas en cero las apilaría todas al comienzo del eje e inventaría
    una tendencia inicial que no existe.
    """
    desde = datetime.utcnow() - timedelta(days=dias)
    filas = (await db.execute(_base_muestras(f, desde)
                              .order_by(LubeMuestra.fecha_toma))).all()
    if not filas:
        return {"filtro": f.como_dict(), "placas": [], "muestras": 0,
                "sin_medidor": 0, "resumen": {}}

    ids = [m.id for m, _, _, _ in filas]
    # Cuántos parámetros fuera de rango tiene cada muestra: es el indicador
    # que hace legible la serie. Graficar treinta parámetros por placa produce
    # un plato de espagueti; graficar «cuántos hallazgos» produce una línea que
    # se entiende.
    hallazgos: Dict[int, Dict[str, int]] = defaultdict(
        lambda: {"marginal": 0, "critico": 0})
    for muestra_id, estado, n in (await db.execute(
        select(LubeResultado.muestra_id, LubeResultado.estado, func.count())
        .where(and_(LubeResultado.muestra_id.in_(ids),
                    LubeResultado.estado.in_(("MARGINAL", "CRITICO"))))
        .group_by(LubeResultado.muestra_id, LubeResultado.estado)
    )).all():
        hallazgos[muestra_id][str(estado).lower()] = n

    por_placa: Dict[str, Dict[str, Any]] = {}
    sin_medidor = 0
    resumen: Dict[str, int] = defaultdict(int)

    for muestra, comp, activo, tipo in filas:
        resumen[muestra.severidad or "PENDIENTE"] += 1
        if muestra.medidor_equipo is None:
            sin_medidor += 1
            continue
        clave = activo.codigo
        p = por_placa.setdefault(clave, {
            "placa": activo.codigo, "activo": activo.nombre,
            "marca": activo.marca, "linea": activo.linea,
            "modelo": activo.modelo,
            "motor": (f"{activo.motor_marca} · {activo.motor_linea}"
                      if activo.motor_marca and activo.motor_linea
                      else activo.motor_marca),
            "puntos": [],
        })
        h = hallazgos.get(muestra.id, {"marginal": 0, "critico": 0})
        p["puntos"].append({
            "km": round(float(muestra.medidor_equipo), 1),
            "fecha": muestra.fecha_toma,
            "numero": muestra.numero,
            "compartimento": comp.nombre,
            "tipo_compartimento": tipo.codigo,
            "severidad": muestra.severidad,
            "horas_aceite": muestra.horas_aceite,
            "hallazgos": h["marginal"] + h["critico"],
            "criticos": h["critico"],
            "muestra_id": muestra.id,
            "compartimento_id": comp.id,
        })

    placas = []
    for p in por_placa.values():
        p["puntos"].sort(key=lambda x: x["km"])
        kms = [x["km"] for x in p["puntos"]]
        malos = [float(x["hallazgos"]) for x in p["puntos"]]
        p["muestras"] = len(p["puntos"])
        p["km_min"], p["km_max"] = (min(kms), max(kms)) if kms else (None, None)
        # La pendiente de «hallazgos contra kilometraje» dice si el equipo se
        # está deteriorando con el recorrido o si se mantiene.
        p["tendencia"] = regresion(kms, malos)
        placas.append(p)
    placas.sort(key=lambda x: -x["muestras"])

    return {
        "filtro": f.como_dict(),
        "placas": placas,
        "muestras": len(filas),
        "sin_medidor": sin_medidor,
        "resumen": dict(resumen),
    }


# ══════════════════════════════════════════════════════════════════════════════
# 5. Dispersión: cada parámetro contra el kilometraje
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/dispersion")
async def dispersion(
    dias: int = Query(1460, ge=90, le=3650),
    minimo: int = Query(6, ge=4, le=500),
    f: FiltroFlota = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Un diagrama de dispersión por parámetro: valor contra kilometraje.

    PARA QUÉ SIRVE ESTA PANTALLA
    Para ver de un golpe qué le pasa al aceite con el recorrido en todas sus
    categorías a la vez. Los metales de desgaste deberían subir con el
    kilometraje —eso es normal—; el TBN debería bajar. Lo que interesa son los
    que NO se comportan así: un silicio que sube con el kilometraje delata una
    entrada de polvo que se abre con el uso, y un hierro plano en un motor con
    mucho recorrido suele significar que las muestras no se están tomando
    igual.

    Cada panel trae su recta de mínimos cuadrados, su r de Pearson y su
    pendiente por cada 1.000 km. La pendiente es la cifra con la que se decide
    un intervalo; el r dice si esa pendiente significa algo.
    """
    desde = datetime.utcnow() - timedelta(days=dias)
    filas = (await db.execute(_base_muestras(f, desde))).all()
    if not filas:
        return {"filtro": f.como_dict(), "parametros": [], "muestras": 0,
                "sin_medidor": 0}

    # El kilometraje de cada muestra. Sin él la muestra no entra: es el eje.
    km_de: Dict[int, float] = {}
    placa_de: Dict[int, str] = {}
    sin_medidor = 0
    for muestra, _comp, activo, _tipo in filas:
        if muestra.medidor_equipo is None:
            sin_medidor += 1
            continue
        km_de[muestra.id] = float(muestra.medidor_equipo)
        placa_de[muestra.id] = activo.codigo

    if not km_de:
        return {"filtro": f.como_dict(), "parametros": [],
                "muestras": len(filas), "sin_medidor": sin_medidor,
                "motivo": "Ninguna muestra del segmento tiene lectura de "
                          "odómetro. Sin ella no se puede graficar contra el "
                          "kilometraje."}

    catalogo = {p.id: p for p in (await db.execute(
        select(LubeParametro))).scalars().all()}

    puntos_de: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
    for r in (await db.execute(
        select(LubeResultado)
        .where(and_(LubeResultado.muestra_id.in_(list(km_de.keys())),
                    LubeResultado.valor.isnot(None)))
    )).scalars().all():
        p = catalogo.get(r.parametro_id)
        if not p or p.es_texto:
            continue
        puntos_de[r.parametro_id].append({
            "km": round(km_de[r.muestra_id], 1),
            "valor": float(r.valor),
            "estado": r.estado or "NORMAL",
            "placa": placa_de.get(r.muestra_id),
            "muestra_id": r.muestra_id,
        })

    # El orden de presentación: el grupo primero —desgaste, contaminación,
    # aditivo, propiedad— porque así se lee un boletín, y dentro de cada grupo
    # el que más se dispara. Alfabético pondría el aluminio antes del hierro y
    # nadie busca así.
    ORDEN_GRUPO = {"DESGASTE": 0, "CONTAMINACION": 1, "PROPIEDAD": 2,
                   "ADITIVO": 3}

    salida = []
    for pid, puntos in puntos_de.items():
        if len(puntos) < minimo:
            continue
        p = catalogo[pid]
        xs = [x["km"] for x in puntos]
        ys = [x["valor"] for x in puntos]
        fuera = sum(1 for x in puntos if x["estado"] in ("MARGINAL", "CRITICO"))
        salida.append({
            "codigo": p.codigo, "nombre": p.nombre, "unidad": p.unidad,
            "grupo": p.grupo, "origen_probable": p.origen_probable,
            "bidireccional": bool(p.bidireccional),
            "es_desgaste": p.codigo in GRUPO_DESGASTE,
            "puntos": sorted(puntos, key=lambda x: x["km"]),
            "fuera_de_rango": fuera,
            "regresion": regresion(xs, ys),
            "minimo": round(min(ys), 3), "maximo": round(max(ys), 3),
            "promedio": round(sum(ys) / len(ys), 3),
        })
    salida.sort(key=lambda x: (ORDEN_GRUPO.get(x["grupo"], 9),
                              -x["fuera_de_rango"]))

    return {
        "filtro": f.como_dict(),
        "parametros": salida,
        "muestras": len(km_de),
        "sin_medidor": sin_medidor,
        "nota": "La pendiente va por cada 1.000 km. Que un metal de desgaste "
                "suba con el recorrido es normal; lo que hay que mirar son "
                "los que no se comportan como deberían.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# 6. Los límites vigentes, con su fuente
#
# La pantalla tiene que poder mostrar de dónde sale cada umbral. Sin esto, un
# informe que dice «basado en normas internacionales» es una afirmación que
# nadie puede verificar, que es exactamente lo que se quería dejar atrás.
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/normas")
async def normas(
    dias: int = Query(1460, ge=90, le=3650),
    f: FiltroFlota = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Los criterios con que se juzga cada parámetro, y de dónde salen.

    Incluye los límites estadísticos calculados sobre la flota filtrada
    (ASTM D7720), separados POR FAMILIA DE COMPARTIMENTO y con su `n`, para que
    se vea sobre cuántas mediciones se apoya cada uno y cuáles no alcanzaron
    población suficiente.
    """
    desde = datetime.utcnow() - timedelta(days=dias)
    filas = (await db.execute(_base_muestras(f, desde))).all()

    catalogo = {p.id: p for p in (await db.execute(
        select(LubeParametro))).scalars().all()}

    # La población se separa por familia de compartimento. Es la mitad de lo
    # que pide D7720: el percentil solo dice algo sobre equipos comparables, y
    # un motor diésel y un sistema hidráulico no lo son.
    tipo_de_muestra = {m.id: (t.codigo or "SIN_TIPO") for m, _c, _a, t in filas}
    nombre_tipo = {(t.codigo or "SIN_TIPO"): t.nombre for _m, _c, _a, t in filas}
    poblaciones: Dict[str, Dict[str, List[float]]] = defaultdict(
        lambda: defaultdict(list))
    if tipo_de_muestra:
        for mid, pid, valor in (await db.execute(
            select(LubeResultado.muestra_id, LubeResultado.parametro_id,
                   LubeResultado.valor)
            .where(and_(LubeResultado.muestra_id.in_(list(tipo_de_muestra)),
                        LubeResultado.valor.isnot(None)))
        )).all():
            p = catalogo.get(pid)
            if p and p.codigo in GRUPO_DESGASTE:
                poblaciones[tipo_de_muestra[mid]][p.codigo].append(float(valor))

    por_familia = []
    for tipo, pob in poblaciones.items():
        estadisticos = limites_estadisticos(pob)
        por_familia.append({
            "tipo": tipo,
            "nombre": nombre_tipo.get(tipo, tipo),
            "muestras": sum(1 for t in tipo_de_muestra.values() if t == tipo),
            "estadisticos": estadisticos,
            # Los que se quedaron sin límite y por qué. Es información: un
            # parámetro sin límite no es un parámetro sano, es uno sin
            # criterio, y la pantalla tiene que decirlo en vez de dejar la
            # celda vacía.
            "insuficientes": [
                {"codigo": c, "n": len(v),
                 "faltan": MINIMO_POBLACION_D7720 - len(v)}
                for c, v in pob.items() if c not in estadisticos
            ],
        })
    por_familia.sort(key=lambda x: -x["muestras"])

    # Los límites se declaran por código —«hollin», «tbn»— porque es la llave
    # con la que se buscan. Para mostrarlos hay que ponerles el nombre y la
    # unidad del catálogo: una tabla de criterios que dice «oxidacion 20 / 30»
    # sin decir de qué unidad habla no se puede contrastar con un boletín.
    por_codigo = {p.codigo: p for p in catalogo.values()}

    def _con_nombre(limites: Dict[str, Any]) -> Dict[str, Any]:
        salida = {}
        for codigo, l in limites.items():
            p = por_codigo.get(codigo)
            salida[codigo] = {**l,
                              "nombre": p.nombre if p else codigo,
                              "unidad": p.unidad if p else None,
                              "grupo": p.grupo if p else None}
        return salida

    return {
        "filtro": f.como_dict(),
        "fuentes": FUENTES,
        "naturaleza": NATURALEZA,
        "limites_motor": _con_nombre(LIMITES_MOTOR),
        "limites_hidraulico": _con_nombre(LIMITES_HIDRAULICO),
        "por_familia": por_familia,
        "minimo_poblacion": MINIMO_POBLACION_D7720,
        "percentiles": {"precaucion": PERCENTIL_PRECAUCION,
                        "condena": PERCENTIL_CONDENA},
        "banda_sae": BANDA_SAE_100C,
        "desvio_viscosidad": DESVIO_VISCOSIDAD,
        "reglas": [{k: v for k, v in r.items()
                    if k not in ("exige", "tambien", "prohibe")}
                   for r in REGLAS],
        "advertencia": "Las normas ASTM e ISO definen CÓMO SE MIDE, no cuándo "
                       "es malo. Cada límite de acá lleva por separado el "
                       "método del ensayo y el origen del umbral, porque citar "
                       "una norma de ensayo como si fuera la fuente de un "
                       "límite es una cita falsa.",
    }
