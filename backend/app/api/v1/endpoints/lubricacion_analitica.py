"""
Lubricación — analítica y siembra de la configuración inicial.

La analítica cruza los análisis con la jerarquía del CMMS —activo → marca →
línea— igual que ya lo hace el tablero de causas raíz, para poder pasar de
«qué nos falla» a «qué nos falla en esta flota».

Las preguntas que responde, y por qué cada una importa:

  Vida lograda contra recomendada   suele revelar que se está botando aceite
                                    bueno. Es lo que paga el programa.
  Costo por hora lubricada          hace comparables dos equipos distintos.
  Adherencia al muestreo            si no se muestrea cuando toca, el resto de
                                    los números son adorno.
  Aciertos del diagnóstico          si el análisis no acierta, hay que arreglar
                                    el análisis, no comprar más muestras.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.endpoints.lubricacion_operacion import (
    medidor_del_equipo, unidad_efectiva, unidad_efectiva_sql, vida_de_carga,
)
from app.infrastructure.models.eam import EAMActivo
from app.infrastructure.models.lubricacion import (
    LubeTipoCompartimento, LubeProducto, LubeMarca, LubeParametro,
    LubeMotivoDrenaje, LubeModoFalla, LubeMetodoMuestreo,
    LubeCompartimento, LubeCarga, LubeRelleno,
    LubeMuestra, LubeResultado, LubeDiagnostico,
)

router = APIRouter(prefix="/eam/lube", tags=["CMMS/EAM · Lubricación"])


@router.get("/analitica", response_model=Dict[str, Any])
async def analitica(marca: Optional[str] = None, linea: Optional[str] = None,
                    dias: int = Query(365, ge=30, le=1825),
                    db: AsyncSession = Depends(get_db)):
    desde = datetime.utcnow() - timedelta(days=dias)

    # Base: las muestras del periodo, ya cruzadas con la jerarquía del activo.
    # Se cuentan en SQL: traerlas como objetos eran tres por muestra, y con un
    # par de años de historia el proceso dejaba de contestar.
    base = (select(LubeMuestra.severidad, func.count(LubeMuestra.id))
            .join(LubeCompartimento, LubeCompartimento.id == LubeMuestra.compartimento_id)
            .join(EAMActivo, EAMActivo.id == LubeCompartimento.activo_id)
            .where(and_(LubeMuestra.fecha_toma >= desde,
                        LubeMuestra.estado != "ANULADA")))
    # Marca y línea son texto en `eam_activo`, no llaves foráneas. Es la misma
    # convención que usa el tablero de causa raíz, y hay que respetarla para que
    # los dos tableros filtren igual y sus cifras se puedan comparar.
    if marca:
        base = base.where(EAMActivo.marca == marca)
    if linea:
        base = base.where(EAMActivo.linea == linea)

    por_severidad: Dict[str, int] = {
        sev: n for sev, n in (await db.execute(base.group_by(LubeMuestra.severidad))).all()}
    total = sum(por_severidad.values())

    # ── Vida lograda contra recomendada ──────────────────────────────────────
    # Solo cargas ya drenadas: una carga viva todavía puede rendir más.
    r = await db.execute(
        select(LubeMotivoDrenaje.nombre, LubeMotivoDrenaje.categoria,
               LubeMotivoDrenaje.evitable, func.count(LubeCarga.id),
               func.avg(LubeCarga.vida_lograda))
        .join(LubeCarga, LubeCarga.motivo_drenaje_id == LubeMotivoDrenaje.id)
        .where(and_(LubeCarga.estado == "DRENADA", LubeCarga.fecha_drenaje >= desde))
        .group_by(LubeMotivoDrenaje.nombre, LubeMotivoDrenaje.categoria,
                  LubeMotivoDrenaje.evitable)
        .order_by(func.count(LubeCarga.id).desc()))
    drenajes = [{"etiqueta": n, "categoria": cat, "evitable": bool(ev),
                 "cantidad": c, "vida_promedio": round(float(v), 1) if v else None}
                for n, cat, ev, c, v in r.all()]

    # ── Costo por unidad de vida, por tipo de compartimento ──────────────────
    # El aceite de reposición entra en la cuenta. Dejarlo fuera daría un costo
    # por hora más bajo que el de la ficha de cada carga —que sí lo suma— y dos
    # cifras distintas para el mismo concepto destruyen la confianza en ambas.
    # En un equipo con fuga, además, el relleno puede ser el grueso del gasto.
    rellenos = (select(LubeRelleno.carga_id.label("carga_id"),
                       func.sum(func.coalesce(LubeRelleno.costo, 0)).label("costo"))
                .group_by(LubeRelleno.carga_id).subquery())
    unidad = unidad_efectiva_sql().label("unidad")
    r = await db.execute(
        select(LubeTipoCompartimento.nombre, unidad,
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
        .where(and_(LubeCarga.estado == "DRENADA", LubeCarga.fecha_drenaje >= desde))
        .group_by(LubeTipoCompartimento.nombre, unidad))
    costos = []
    for nombre, unidad, n, costo, vida in r.all():
        costo, vida = float(costo or 0), float(vida or 0)
        costos.append({"etiqueta": nombre, "unidad": unidad, "cargas": n,
                       "costo_total": round(costo, 2),
                       "vida_total": round(vida, 1),
                       "costo_por_unidad": round(costo / vida, 2) if vida else None})

    # ── Parámetros que más disparan ──────────────────────────────────────────
    r = await db.execute(
        select(LubeParametro.nombre, LubeParametro.grupo, LubeParametro.origen_probable,
               func.count(LubeResultado.id))
        .join(LubeResultado, LubeResultado.parametro_id == LubeParametro.id)
        .join(LubeMuestra, LubeMuestra.id == LubeResultado.muestra_id)
        .where(and_(LubeResultado.estado.in_(("MARGINAL", "CRITICO")),
                    LubeMuestra.fecha_toma >= desde))
        .group_by(LubeParametro.nombre, LubeParametro.grupo, LubeParametro.origen_probable)
        .order_by(func.count(LubeResultado.id).desc()).limit(12))
    parametros = [{"etiqueta": n, "grupo": g, "origen": o, "cantidad": c}
                  for n, g, o, c in r.all()]

    # ── Por marca y por línea, la jerarquía del CMMS ─────────────────────────
    async def _por(campo):
        q = (select(campo, func.count(LubeMuestra.id),
                    func.sum(case((LubeMuestra.severidad.in_(
                        ("CRITICO", "ACCION_INMEDIATA")), 1), else_=0)))
             .join(LubeCompartimento, LubeCompartimento.activo_id == EAMActivo.id)
             .join(LubeMuestra, LubeMuestra.compartimento_id == LubeCompartimento.id)
             .where(and_(LubeMuestra.fecha_toma >= desde,
                         LubeMuestra.estado != "ANULADA", campo.isnot(None)))
             .group_by(campo).order_by(func.count(LubeMuestra.id).desc()).limit(15))
        return [{"etiqueta": n, "cantidad": c, "criticas": int(k or 0)}
                for n, c, k in (await db.execute(q)).all()]

    por_marca = await _por(EAMActivo.marca)
    por_linea = await _por(EAMActivo.linea)

    # ── Aciertos del diagnóstico ─────────────────────────────────────────────
    r = await db.execute(
        select(LubeDiagnostico.verificacion, func.count(LubeDiagnostico.id))
        .group_by(LubeDiagnostico.verificacion))
    verificacion = {v: c for v, c in r.all()}
    confirmados = verificacion.get("CONFIRMADO", 0)
    desmentidos = verificacion.get("DESMENTIDO", 0)
    acierto = (round(confirmados / (confirmados + desmentidos) * 100, 1)
               if (confirmados + desmentidos) else None)

    # ── Calidad del dato: muestras tomadas sin puerto dedicado ───────────────
    r = await db.execute(
        select(func.count(LubeCompartimento.id))
        .where(and_(LubeCompartimento.activo.is_(True),
                    LubeCompartimento.tiene_puerto_muestreo.is_(False))))
    sin_puerto = r.scalar() or 0
    r = await db.execute(select(func.count(LubeCompartimento.id))
                         .where(LubeCompartimento.activo.is_(True)))
    compartimentos = r.scalar() or 0

    return {
        "total_muestras": total,
        "por_severidad": por_severidad,
        "criticas": por_severidad.get("CRITICO", 0) + por_severidad.get("ACCION_INMEDIATA", 0),
        "drenajes": drenajes,
        "costos": costos,
        "parametros": parametros,
        "por_marca": por_marca,
        "por_linea": por_linea,
        "diagnostico": {"confirmados": confirmados, "desmentidos": desmentidos,
                        "pendientes": verificacion.get("PENDIENTE", 0),
                        "acierto_pct": acierto},
        "compartimentos": compartimentos,
        "sin_puerto_muestreo": sin_puerto,
    }


UMBRAL_PROXIMO = 0.9   # desde el 90 % de la frecuencia se avisa con tiempo


@router.get("/pendientes", response_model=List[Dict[str, Any]])
async def pendientes(db: AsyncSession = Depends(get_db)):
    """Compartimentos a los que les toca muestra: la lista de trabajo del día.

    Se cuenta desde la ÚLTIMA MUESTRA de la carga viva, o desde el llenado si la
    carga todavía no tiene ninguna, contra la frecuencia del compartimento. Antes
    se contaba solo cuántas muestras tenía la carga viva: cada cambio de aceite
    dejaba al compartimento como «nunca muestreado», y en una flota grande la
    lista traía todos los equipos, que es lo mismo que no traer ninguno.

    Tres estados, en este orden de urgencia:
      VENCIDO       ya pasó la frecuencia
      PROXIMO       le falta menos del 10 %; sirve para programar la toma
      SIN_HISTORIA  el compartimento nunca se ha muestreado: le falta la línea
                    base, sin la cual las primeras tendencias no dicen nada
    """
    por_carga = (select(LubeMuestra.carga_id,
                        func.max(LubeMuestra.medidor_equipo).label("lectura"),
                        func.max(LubeMuestra.fecha_toma).label("fecha"))
                 .where(LubeMuestra.estado != "ANULADA")
                 .group_by(LubeMuestra.carga_id).subquery())
    por_comp = (select(LubeMuestra.compartimento_id,
                       func.max(LubeMuestra.fecha_toma).label("fecha"))
                .where(LubeMuestra.estado != "ANULADA")
                .group_by(LubeMuestra.compartimento_id).subquery())
    rellenos = (select(LubeRelleno.carga_id, func.max(LubeRelleno.medidor).label("lectura"))
                .group_by(LubeRelleno.carga_id).subquery())
    r = await db.execute(
        select(LubeCompartimento, LubeCarga, EAMActivo.codigo,
               EAMActivo.odometro_actual, EAMActivo.horometro_actual,
               LubeTipoCompartimento.nombre, LubeTipoCompartimento.unidad_vida,
               por_carga.c.lectura, por_carga.c.fecha, por_comp.c.fecha,
               rellenos.c.lectura)
        .join(EAMActivo, EAMActivo.id == LubeCompartimento.activo_id)
        .join(LubeTipoCompartimento,
              LubeTipoCompartimento.id == LubeCompartimento.tipo_compartimento_id)
        .join(LubeCarga, and_(LubeCarga.compartimento_id == LubeCompartimento.id,
                              LubeCarga.estado == "ACTIVA"))
        .outerjoin(por_carga, por_carga.c.carga_id == LubeCarga.id)
        .outerjoin(por_comp, por_comp.c.compartimento_id == LubeCompartimento.id)
        .outerjoin(rellenos, rellenos.c.carga_id == LubeCarga.id)
        .where(LubeCompartimento.activo.is_(True)))

    ahora = datetime.utcnow()
    salida = []
    for (comp, carga, activo, odo, horo, tipo, unidad_tipo,
         lectura_muestra, fecha_muestra_carga, ultima_comp, lectura_relleno) in r.all():
        unidad = unidad_efectiva(unidad_tipo, odo, horo)
        del_equipo = medidor_del_equipo(unidad, odo, horo)
        conocidas = [v for v in (lectura_muestra, lectura_relleno) if v is not None]
        vida = vida_de_carga(carga, unidad, max(conocidas) if conocidas else None,
                             del_equipo, ahora)

        # Cuánto lleva desde la última toma de esta carga (o desde el llenado).
        desde = None
        if unidad == "DIAS":
            base = fecha_muestra_carga or carga.fecha_llenado
            desde = float((ahora - base).days) if base else None
        elif vida is not None:
            base = (lectura_muestra - carga.medidor_inicio
                    if lectura_muestra is not None and carga.medidor_inicio is not None
                    and lectura_muestra >= carga.medidor_inicio else 0.0)
            desde = round(max(0.0, vida - base), 2)

        frecuencia = comp.frecuencia_muestreo
        avance = (desde / frecuencia) if (frecuencia and desde is not None) else None
        if avance is not None and avance >= 1:
            estado, motivo = "VENCIDO", "Superó la frecuencia de muestreo"
        elif avance is not None and avance >= UMBRAL_PROXIMO:
            estado, motivo = "PROXIMO", "Le toca pronto"
        elif not ultima_comp:
            estado, motivo = "SIN_HISTORIA", "Nunca se ha muestreado"
        else:
            continue

        salida.append({
            "compartimento_id": comp.id, "activo": activo, "compartimento": comp.nombre,
            "tipo": tipo, "unidad": unidad, "carga_id": carga.id,
            "vida_actual": vida, "desde_ultima": desde,
            "frecuencia_muestreo": frecuencia,
            "avance_pct": round(avance * 100, 1) if avance is not None else None,
            "ultima_muestra": ultima_comp, "critico": comp.critico,
            "estado": estado, "motivo": motivo,
        })

    orden = {"VENCIDO": 0, "PROXIMO": 1, "SIN_HISTORIA": 2}
    return sorted(salida, key=lambda x: (orden[x["estado"]], not x["critico"],
                                         -(x["avance_pct"] or 0), x["activo"]))
