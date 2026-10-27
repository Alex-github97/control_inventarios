"""
WMS · Operación de tareas. Prefijo: /wms

- Frentes de picking (mínimo / máximo por producto y ubicación, alternos).
- Parámetros de tareas y reabastecimiento por almacén.
- Reabastecimiento: evaluar, aprobar, rechazar.
- Quién recibe tareas lo decide core/personal.py (sin módulo de jornadas).
- Asignación dirigida: «Tomar siguiente», confirmar origen, reasignar.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import personal as per
from app.core import wms_tareas_dirigidas as wtd
from app.core import wms_espacio as esp_mod
from app.core import wms_reabastecimiento as reab
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_supervisor
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.wms import (
    WMSAlmacen, WMSFrentePicking, WMSInventarioUbicacion, WMSProducto, WMSTarea, WMSUbicacion, WMSZona,
)

router = APIRouter(prefix="/wms", tags=["wms-operacion-tareas"])
ZONAS_NO_FRENTE = ("RECEPCION", "CUARENTENA", "DESPACHO", "TRANSITO", "CROSS_DOCKING")


async def _tareas(db, tareas):
    from app.api.v1.endpoints.wms_trazable import _tareas_dict
    return await _tareas_dict(db, tareas)


async def _nombres(db, ids) -> dict:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    return {u.id: f"{u.nombre} {u.apellido or ''}".strip()
            for u in (await db.execute(select(Usuario).where(Usuario.id.in_(ids)))).scalars()}


# ═════════════════════════════════════════════════════════════════════════════
# Parámetros
# ═════════════════════════════════════════════════════════════════════════════
CAMPOS_CFG = ("reabastecimiento_activo", "estrategia_picking", "requiere_aprobacion", "picking_solo_frentes", "picking_reserva_si_falta",
              "picking_excluir_pos", "exigir_escaneo_origen", "liberar_asignada_min", "alerta_en_curso_min",
              "nivel_montacargas", "aprovechamiento_pct")


ESTRATEGIAS_PICKING = ("SINGLE", "WAVE", "BATCH", "ZONE", "CLUSTER")


class ConfigIn(BaseModel):
    reabastecimiento_activo: bool = True
    estrategia_picking: str = "SINGLE"
    requiere_aprobacion: bool = True
    picking_solo_frentes: bool = True
    picking_reserva_si_falta: bool = False
    picking_excluir_pos: bool = True
    exigir_escaneo_origen: bool = True
    liberar_asignada_min: int = Field(15, ge=1, le=480)
    alerta_en_curso_min: int = Field(30, ge=1, le=480)
    nivel_montacargas: int = Field(2, ge=1, le=30)
    aprovechamiento_pct: float = Field(85, ge=30, le=100)


@router.get("/config-tareas")
async def ver_config(almacen_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    c = await reab.config(db, almacen_id)
    return {k: getattr(c, k) for k in CAMPOS_CFG}


@router.put("/config-tareas")
async def guardar_config(almacen_id: int, data: ConfigIn, db: AsyncSession = Depends(get_db), _=Depends(require_supervisor)):
    if await db.get(WMSAlmacen, almacen_id) is None:
        raise HTTPException(404, "Almacén no encontrado.")
    datos = data.model_dump()
    if datos.get("estrategia_picking") not in ESTRATEGIAS_PICKING:
        raise HTTPException(422, "Estrategia de picking no válida.")
    c = await reab.config(db, almacen_id, crear=True)
    for k, v in datos.items():
        setattr(c, k, v)
    return {k: getattr(c, k) for k in CAMPOS_CFG}


# ═════════════════════════════════════════════════════════════════════════════
# Frentes de picking
# ═════════════════════════════════════════════════════════════════════════════
class FrenteIn(BaseModel):
    almacen_id: int
    producto_id: int
    ubicacion_id: int
    unidad: str = "UNIDAD"
    minimo: float = Field(0, ge=0)
    maximo: float = Field(0, ge=0)
    prioridad: int = Field(1, ge=1, le=20)
    activo: bool = True


async def _frentes_dict(db, frentes) -> list:
    est = await reab.estado_frentes(db, frentes)
    prods = {p.id: p for p in (await db.execute(select(WMSProducto).where(
        WMSProducto.id.in_({f.producto_id for f in frentes} or {0})))).scalars()}
    ubic = {u.id: u for u in (await db.execute(select(WMSUbicacion).where(
        WMSUbicacion.id.in_({f.ubicacion_id for f in frentes} or {0})))).scalars()}
    zonas = {z.id: z for z in (await db.execute(select(WMSZona).where(
        WMSZona.id.in_({u.zona_id for u in ubic.values()} or {0})))).scalars()}
    abiertas = dict((await db.execute(select(WMSTarea.documento_id, func.count()).where(
        WMSTarea.documento_tipo == "FRENTE", WMSTarea.estado.in_(reab.ABIERTAS),
        WMSTarea.documento_id.in_([f.id for f in frentes] or [0])).group_by(WMSTarea.documento_id))).all())
    # Espacio (m³ y kg) de cada posición y quién más la comparte.
    aprov = {}
    for a in {f.almacen_id for f in frentes}:
        aprov[a] = ((await reab.config(db, a)).aprovechamiento_pct or 85) / 100
    espacios = {}
    for a in aprov:
        espacios.update(await esp_mod.espacios(db, {f.ubicacion_id for f in frentes if f.almacen_id == a}, aprov[a]))
    vecinos = {}
    for g in (await db.execute(select(WMSFrentePicking).where(WMSFrentePicking.ubicacion_id.in_(
            {f.ubicacion_id for f in frentes} or {0}), WMSFrentePicking.activo.is_(True)))).scalars():
        vecinos.setdefault(g.ubicacion_id, set()).add(g.producto_id)
    for uid, e in espacios.items():
        vecinos.setdefault(uid, set()).update(e.productos)
    nombres = {p.id: (p.sku, p.nombre) for p in (await db.execute(select(WMSProducto).where(
        WMSProducto.id.in_({x for v in vecinos.values() for x in v} or {0})))).scalars()}
    out = []
    for f in frentes:
        p, u = prods.get(f.producto_id), ubic.get(f.ubicacion_id)
        z = zonas.get(u.zona_id) if u else None
        out.append({"id": f.id, "almacen_id": f.almacen_id, "producto_id": f.producto_id, "sku": p.sku if p else None,
                    "producto": p.nombre if p else None, "ubicacion_id": f.ubicacion_id, "ubicacion": u.codigo if u else None,
                    "zona": z.codigo if z else None, "sala_pos": bool(z and z.vendible_pos), "unidad": f.unidad,
                    "minimo": f.minimo, "maximo": f.maximo, "prioridad": f.prioridad, "activo": f.activo,
                    "tareas_abiertas": abiertas.get(f.id, 0), **est[f.id],
                    "espacio": espacios[f.ubicacion_id].dict() if f.ubicacion_id in espacios else None,
                    "comparte_con": [{"producto_id": x, "sku": nombres.get(x, (None, None))[0], "producto": nombres.get(x, (None, None))[1]}
                                     for x in sorted(vecinos.get(f.ubicacion_id, set())) if x != f.producto_id]})
    return out


async def aviso_capacidad(db, ubicacion_id: int, almacen_id: int, propio: Optional[dict] = None,
                          excluir_id: Optional[int] = None) -> Optional[dict]:
    """¿Los máximos de todos los frentes de la posición caben en ella (m³ y kg)?
    Es un aviso: no bloquea. `propio` = el frente que se está creando o editando."""
    frentes = (await db.execute(select(WMSFrentePicking).where(
        WMSFrentePicking.ubicacion_id == ubicacion_id, WMSFrentePicking.activo.is_(True),
        WMSFrentePicking.id != (excluir_id or 0)))).scalars().all()
    lista = [(f.producto_id, f.unidad, f.maximo) for f in frentes]
    if propio:
        lista.append((propio["producto_id"], propio["unidad"], propio["maximo"]))
    aprov = ((await reab.config(db, almacen_id)).aprovechamiento_pct or 85) / 100
    e = (await esp_mod.espacios(db, [ubicacion_id], aprov)).get(ubicacion_id)
    if e is None or (e.util_m3 is None and not e.cap_kg):
        return None
    med = await esp_mod.medidas(db, {p for p, _, _ in lista})
    m3 = kg = 0.0
    sin = []
    for pid, unidad, maximo in lista:
        k = await reab.factor(db, pid, unidad) or 1
        m = med.get(pid)
        if m and m.vol_u:
            m3 += maximo * k * m.vol_u
        else:
            sin.append(pid)
        if m and m.peso_u:
            kg += maximo * k * m.peso_u
    textos = []
    if e.util_m3 is not None and m3 > e.util_m3 + 1e-9:
        textos.append(f"Los máximos de esta posición ocupan {m3:.2f} m³ y la posición tiene {e.util_m3:.2f} m³ útiles".replace(".", ","))
    if e.cap_kg and kg > e.cap_kg + 1e-9:
        textos.append(f"Los máximos pesan {kg:,.0f} kg y la posición soporta {e.cap_kg:,.0f} kg".replace(",", "."))
    return {"suma_m3": round(m3, 3), "util_m3": None if e.util_m3 is None else round(e.util_m3, 3), "suma_kg": round(kg, 1),
            "cap_kg": e.cap_kg, "productos": len(lista), "sin_medidas": len(sin),
            "aviso": ". ".join(textos) + "." if textos else None}


@router.get("/frentes")
async def listar_frentes(almacen_id: int, producto_id: Optional[int] = None, db: AsyncSession = Depends(get_db),
                         _=Depends(get_current_user)):
    q = select(WMSFrentePicking).where(WMSFrentePicking.almacen_id == almacen_id)
    if producto_id:
        q = q.where(WMSFrentePicking.producto_id == producto_id)
    frentes = (await db.execute(q.order_by(WMSFrentePicking.producto_id, WMSFrentePicking.prioridad))).scalars().all()
    return await _frentes_dict(db, frentes)


async def _validar_frente(db, d: FrenteIn, fid: Optional[int] = None) -> None:
    if d.unidad not in reab.UNIDADES:
        raise HTTPException(422, f"Unidad inválida: use {', '.join(reab.UNIDADES)}.")
    if d.maximo and d.minimo > d.maximo:
        raise HTTPException(422, "El mínimo no puede ser mayor que el máximo.")
    if d.maximo <= 0:
        raise HTTPException(422, "Indique el máximo del frente (hasta cuánto se llena).")
    u = await db.get(WMSUbicacion, d.ubicacion_id)
    z = await db.get(WMSZona, u.zona_id) if u else None
    if u is None or z is None or z.almacen_id != d.almacen_id:
        raise HTTPException(422, "La ubicación no es de este almacén.")
    if z.tipo in ZONAS_NO_FRENTE:
        raise HTTPException(422, f"Una ubicación de {z.tipo.lower()} no puede ser frente de picking.")
    if await db.get(WMSProducto, d.producto_id) is None:
        raise HTTPException(404, "Producto no encontrado.")
    if await reab.factor(db, d.producto_id, d.unidad) is None:
        raise HTTPException(422, f"El producto no tiene empaque «{d.unidad.lower()}» registrado (Cubicaje › Productos).")
    dup = (await db.execute(select(WMSFrentePicking.id).where(
        WMSFrentePicking.producto_id == d.producto_id, WMSFrentePicking.ubicacion_id == d.ubicacion_id,
        WMSFrentePicking.id != (fid or 0)))).first()
    if dup:
        raise HTTPException(409, "Ese producto ya tiene un frente en esa ubicación.")


@router.post("/frentes", status_code=201)
async def crear_frente(d: FrenteIn, db: AsyncSession = Depends(get_db), _=Depends(require_supervisor)):
    await _validar_frente(db, d)
    f = WMSFrentePicking(**d.model_dump())
    db.add(f)
    await db.flush()
    r = (await _frentes_dict(db, [f]))[0]
    r["capacidad"] = await aviso_capacidad(db, f.ubicacion_id, f.almacen_id)
    return r


@router.put("/frentes/{fid}")
async def editar_frente(fid: int, d: FrenteIn, db: AsyncSession = Depends(get_db), _=Depends(require_supervisor)):
    f = await db.get(WMSFrentePicking, fid)
    if f is None:
        raise HTTPException(404, "Frente no encontrado.")
    await _validar_frente(db, d, fid)
    for k, v in d.model_dump().items():
        setattr(f, k, v)
    await db.flush()
    r = (await _frentes_dict(db, [f]))[0]
    r["capacidad"] = await aviso_capacidad(db, f.ubicacion_id, f.almacen_id)
    return r


@router.get("/frentes/capacidad")
async def revisar_capacidad(almacen_id: int, ubicacion_id: int, producto_id: Optional[int] = None, unidad: str = "UNIDAD",
                            maximo: float = 0, excluir_id: Optional[int] = None, db: AsyncSession = Depends(get_db),
                            _=Depends(get_current_user)):
    """Revisión en vivo mientras se configura un frente (no bloquea)."""
    propio = {"producto_id": producto_id, "unidad": unidad, "maximo": maximo} if producto_id and maximo > 0 else None
    return await aviso_capacidad(db, ubicacion_id, almacen_id, propio, excluir_id) or {"aviso": None, "util_m3": None, "cap_kg": None}


class CambiarProductoIn(BaseModel):
    producto_id: int
    unidad: Optional[str] = None
    minimo: Optional[float] = Field(None, ge=0)
    maximo: Optional[float] = Field(None, gt=0)


async def _reserva_para(db, almacen_id: int, producto_id: int, lote_id: Optional[int]) -> Optional[int]:
    """Dónde guardar lo que sale de un frente: con el mismo producto (fuera de
    frentes) o una ubicación vacía de almacenamiento que no sea frente."""
    frentes = select(WMSFrentePicking.ubicacion_id).where(WMSFrentePicking.activo.is_(True))
    base = (select(WMSUbicacion.id).join(WMSZona, WMSZona.id == WMSUbicacion.zona_id).where(
        WMSZona.almacen_id == almacen_id, WMSZona.tipo == "ALMACENAMIENTO", WMSZona.vendible_pos.isnot(True),
        WMSUbicacion.activo.isnot(False), WMSUbicacion.id.notin_(frentes)))
    ya = (await db.execute(base.join(WMSInventarioUbicacion, WMSInventarioUbicacion.ubicacion_id == WMSUbicacion.id).where(
        WMSInventarioUbicacion.producto_id == producto_id, WMSInventarioUbicacion.cantidad_disponible > 0)
        .order_by(WMSUbicacion.codigo).limit(1))).scalar()
    if ya:
        return ya
    ocupadas = select(WMSInventarioUbicacion.ubicacion_id).where(
        (WMSInventarioUbicacion.cantidad_disponible + WMSInventarioUbicacion.cantidad_reservada
         + WMSInventarioUbicacion.cantidad_bloqueada) > 0)
    return (await db.execute(base.where(WMSUbicacion.id.notin_(ocupadas)).order_by(WMSUbicacion.codigo).limit(1))).scalar()


@router.post("/frentes/{fid}/cambiar-producto")
async def cambiar_producto(fid: int, d: CambiarProductoIn, db: AsyncSession = Depends(get_db), _=Depends(require_supervisor)):
    """Rotación de marcas en una posición: el frente actual se deshabilita (no se
    borra), el producto nuevo queda con el mismo mínimo y máximo, y si quedan
    unidades del anterior se crea la tarea de vaciado hacia la reserva."""
    f = await db.get(WMSFrentePicking, fid)
    if f is None:
        raise HTTPException(404, "Frente no encontrado.")
    if d.producto_id == f.producto_id:
        raise HTTPException(422, "Elija un producto distinto al actual.")
    datos = FrenteIn(almacen_id=f.almacen_id, producto_id=d.producto_id, ubicacion_id=f.ubicacion_id,
                     unidad=d.unidad or f.unidad, minimo=d.minimo if d.minimo is not None else f.minimo,
                     maximo=d.maximo or f.maximo, prioridad=f.prioridad, activo=True)
    if await reab.factor(db, datos.producto_id, datos.unidad) is None:
        datos.unidad = "UNIDAD"     # el producto nuevo no tiene ese empaque: se mide en unidades
    existente = (await db.execute(select(WMSFrentePicking).where(
        WMSFrentePicking.producto_id == d.producto_id, WMSFrentePicking.ubicacion_id == f.ubicacion_id))).scalar()
    if existente is None:
        await _validar_frente(db, datos)
        nuevo = WMSFrentePicking(**datos.model_dump())
        db.add(nuevo)
    else:
        nuevo = existente
        for k2, v in datos.model_dump().items():
            setattr(nuevo, k2, v)
    f.activo = False
    await db.flush()
    # Vaciado: lo que queda del producto anterior vuelve a la reserva.
    tareas = []
    filas = (await db.execute(select(WMSInventarioUbicacion).where(
        WMSInventarioUbicacion.ubicacion_id == f.ubicacion_id, WMSInventarioUbicacion.producto_id == f.producto_id,
        WMSInventarioUbicacion.cantidad_disponible > 0))).scalars().all()
    for fila in filas:
        destino = await _reserva_para(db, f.almacen_id, f.producto_id, fila.lote_id)
        prod = await db.get(WMSProducto, f.producto_id)
        t = WMSTarea(tipo="MOVIMIENTO", estado="PENDIENTE", prioridad=4, almacen_id=f.almacen_id,
                     depositante_id=prod.depositante_id if prod else None, producto_id=f.producto_id, lote_id=fila.lote_id,
                     cantidad=float(fila.cantidad_disponible), ubicacion_origen_id=f.ubicacion_id,
                     contenedor_origen_id=fila.contenedor_id, ubicacion_sugerida_id=destino,
                     documento_tipo="FRENTE", documento_id=f.id,
                     razon_sugerencia="Vaciado del frente por cambio de producto: devolver a la reserva")
        db.add(t)
        tareas.append(t)
    await db.flush()
    r = (await _frentes_dict(db, [nuevo]))[0]
    r["anterior_id"] = f.id
    r["tareas_vaciado"] = [t.id for t in tareas]
    r["capacidad"] = await aviso_capacidad(db, nuevo.ubicacion_id, nuevo.almacen_id)
    return r


@router.get("/frentes/sin-medidas")
async def sin_medidas(almacen_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    """Posiciones de frentes sin medidas (m³) y productos de frentes sin medidas
    ni peso: sin ellos el reabastecimiento usa solo el máximo del frente."""
    frentes = (await db.execute(select(WMSFrentePicking).where(WMSFrentePicking.almacen_id == almacen_id,
                                                               WMSFrentePicking.activo.is_(True)))).scalars().all()
    ubic = {u.id: u for u in (await db.execute(select(WMSUbicacion).where(
        WMSUbicacion.id.in_({f.ubicacion_id for f in frentes} or {0})))).scalars()}
    med = await esp_mod.medidas(db, {f.producto_id for f in frentes})
    prods = {p.id: p for p in (await db.execute(select(WMSProducto).where(
        WMSProducto.id.in_({f.producto_id for f in frentes} or {0})))).scalars()}
    posiciones = [{"ubicacion_id": u.id, "codigo": u.codigo, "falta": [x for x, v in (("medidas", u.largo_cm and u.ancho_cm and u.alto_cm or u.capacidad_m3), ("peso máximo", u.capacidad_kg)) if not v]}
                  for u in ubic.values() if not ((u.largo_cm and u.ancho_cm and u.alto_cm) or u.capacidad_m3) or not u.capacidad_kg]
    productos = [{"producto_id": pid, "sku": prods[pid].sku if pid in prods else None, "producto": prods[pid].nombre if pid in prods else None,
                  "falta": [x for x, v in (("volumen o medidas", m.vol_u), ("peso", m.peso_u)) if not v]}
                 for pid, m in med.items() if not m.vol_u or not m.peso_u]
    return {"posiciones": sorted(posiciones, key=lambda x: x["codigo"]), "productos": sorted(productos, key=lambda x: x["sku"] or "")}


# ── Tipos de posición: medidas que se aplican a un rack, pasillo o zona ──────

class TipoPosicionIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    largo_cm: float = Field(gt=0, le=5000)
    ancho_cm: float = Field(gt=0, le=5000)
    alto_cm: float = Field(gt=0, le=5000)
    capacidad_kg: Optional[float] = Field(None, gt=0)
    activo: bool = True


def _tipo_dict(t) -> dict:
    return {"id": t.id, "nombre": t.nombre, "largo_cm": t.largo_cm, "ancho_cm": t.ancho_cm, "alto_cm": t.alto_cm,
            "capacidad_kg": t.capacidad_kg, "activo": t.activo,
            "volumen_m3": round(t.largo_cm * t.ancho_cm * t.alto_cm / 1e6, 3)}


@router.get("/tipos-posicion")
async def listar_tipos_posicion(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    from app.infrastructure.models.wms import WMSTipoPosicion
    tipos = (await db.execute(select(WMSTipoPosicion).order_by(WMSTipoPosicion.nombre))).scalars().all()
    usos = dict((await db.execute(select(WMSUbicacion.tipo_posicion_id, func.count()).where(
        WMSUbicacion.tipo_posicion_id.isnot(None)).group_by(WMSUbicacion.tipo_posicion_id))).all())
    return [{**_tipo_dict(t), "ubicaciones": usos.get(t.id, 0)} for t in tipos]


@router.post("/tipos-posicion", status_code=201)
async def crear_tipo_posicion(d: TipoPosicionIn, db: AsyncSession = Depends(get_db), _=Depends(require_supervisor)):
    from app.infrastructure.models.wms import WMSTipoPosicion
    if (await db.execute(select(WMSTipoPosicion.id).where(func.lower(WMSTipoPosicion.nombre) == d.nombre.strip().lower()))).first():
        raise HTTPException(409, "Ya existe un tipo de posición con ese nombre.")
    t = WMSTipoPosicion(**{**d.model_dump(), "nombre": d.nombre.strip()})
    db.add(t)
    await db.flush()
    return _tipo_dict(t)


@router.put("/tipos-posicion/{tid}")
async def editar_tipo_posicion(tid: int, d: TipoPosicionIn, db: AsyncSession = Depends(get_db), _=Depends(require_supervisor)):
    """Cambiar las medidas del tipo las cambia en las ubicaciones que lo usan."""
    from app.infrastructure.models.wms import WMSTipoPosicion
    t = await db.get(WMSTipoPosicion, tid)
    if t is None:
        raise HTTPException(404, "Tipo de posición no encontrado.")
    for k2, v in d.model_dump().items():
        setattr(t, k2, v)
    for u in (await db.execute(select(WMSUbicacion).where(WMSUbicacion.tipo_posicion_id == tid))).scalars():
        u.largo_cm, u.ancho_cm, u.alto_cm, u.capacidad_kg = t.largo_cm, t.ancho_cm, t.alto_cm, t.capacidad_kg
        u.capacidad_m3 = round(t.largo_cm * t.ancho_cm * t.alto_cm / 1e6, 4)
    await db.flush()
    return _tipo_dict(t)


@router.delete("/tipos-posicion/{tid}", status_code=204)
async def borrar_tipo_posicion(tid: int, db: AsyncSession = Depends(get_db), _=Depends(require_supervisor)):
    from app.infrastructure.models.wms import WMSTipoPosicion
    t = await db.get(WMSTipoPosicion, tid)
    if t:
        await db.delete(t)     # las ubicaciones conservan sus medidas (el vínculo queda en blanco)


class AplicarTipoIn(BaseModel):
    almacen_id: int
    zona_id: Optional[int] = None
    pasillo: Optional[str] = None
    estanteria: Optional[str] = None
    nivel: Optional[str] = None
    elemento_id: Optional[int] = None      # una estructura del constructor
    ubicacion_ids: Optional[List[int]] = None
    solo_sin_medidas: bool = False
    simular: bool = False


@router.post("/tipos-posicion/{tid}/aplicar")
async def aplicar_tipo_posicion(tid: int, d: AplicarTipoIn, db: AsyncSession = Depends(get_db), _=Depends(require_supervisor)):
    """Aplica las medidas del tipo a muchas posiciones de una vez: una zona, un
    pasillo, un rack (estantería), un nivel, una estructura del constructor o
    una lista de ubicaciones."""
    from app.infrastructure.models.wms import WMSLayoutPosicion, WMSTipoPosicion
    t = await db.get(WMSTipoPosicion, tid)
    if t is None:
        raise HTTPException(404, "Tipo de posición no encontrado.")
    q = select(WMSUbicacion).join(WMSZona, WMSZona.id == WMSUbicacion.zona_id).where(
        WMSZona.almacen_id == d.almacen_id, WMSZona.tipo.notin_(ZONAS_NO_FRENTE), WMSUbicacion.activo.isnot(False))
    if d.zona_id:
        q = q.where(WMSUbicacion.zona_id == d.zona_id)
    if d.pasillo:
        q = q.where(func.upper(WMSUbicacion.pasillo) == d.pasillo.strip().upper())
    if d.estanteria:
        q = q.where(func.upper(WMSUbicacion.estanteria) == d.estanteria.strip().upper())
    if d.nivel:
        q = q.where(WMSUbicacion.nivel == d.nivel.strip())
    if d.elemento_id:
        q = q.where(WMSUbicacion.id.in_(select(WMSLayoutPosicion.ubicacion_id).where(WMSLayoutPosicion.elemento_id == d.elemento_id)))
    if d.ubicacion_ids:
        q = q.where(WMSUbicacion.id.in_(d.ubicacion_ids))
    if not any((d.zona_id, d.pasillo, d.estanteria, d.nivel, d.elemento_id, d.ubicacion_ids)):
        raise HTTPException(422, "Indique a qué aplicar las medidas: zona, pasillo, rack, nivel o estructura.")
    ubics = (await db.execute(q.order_by(WMSUbicacion.codigo))).scalars().all()
    if d.solo_sin_medidas:
        ubics = [u for u in ubics if not (u.largo_cm and u.ancho_cm and u.alto_cm)]
    if not d.simular:
        for u in ubics:
            u.largo_cm, u.ancho_cm, u.alto_cm, u.capacidad_kg = t.largo_cm, t.ancho_cm, t.alto_cm, t.capacidad_kg
            u.capacidad_m3 = round(t.largo_cm * t.ancho_cm * t.alto_cm / 1e6, 4)
            u.tipo_posicion_id = t.id
        await db.flush()
    return {"tipo": t.nombre, "ubicaciones": len(ubics), "codigos": [u.codigo for u in ubics[:30]], "simulado": d.simular}


# ── Del slotting al frente: dejar la sugerencia configurada con un clic ──────

class SlottingFrenteIn(BaseModel):
    almacen_id: int
    producto_id: int
    ubicacion_id: int                       # la ubicación sugerida por el slotting
    origen_id: Optional[int] = None         # de dónde mover lo que hay (si se quiere)
    lote_id: Optional[int] = None
    cantidad: Optional[float] = Field(None, gt=0)
    unidad: str = "UNIDAD"
    minimo: Optional[float] = Field(None, ge=0)
    maximo: Optional[float] = Field(None, gt=0)


@router.post("/slotting/aplicar-frente", status_code=201)
async def slotting_a_frente(d: SlottingFrenteIn, db: AsyncSession = Depends(get_db), _=Depends(require_supervisor)):
    """La ubicación sugerida pasa a ser el frente principal del producto (los que
    tuviera quedan como alternos) y, si se indica, se crea la tarea para mover
    allí la mercancía."""
    maximo = d.maximo or d.cantidad or 1
    datos = FrenteIn(almacen_id=d.almacen_id, producto_id=d.producto_id, ubicacion_id=d.ubicacion_id, unidad=d.unidad,
                     minimo=d.minimo if d.minimo is not None else round(maximo * 0.25, 2), maximo=maximo, prioridad=1, activo=True)
    if await reab.factor(db, d.producto_id, d.unidad) is None:
        datos.unidad = "UNIDAD"
    otros = (await db.execute(select(WMSFrentePicking).where(WMSFrentePicking.almacen_id == d.almacen_id,
                                                             WMSFrentePicking.producto_id == d.producto_id))).scalars().all()
    existente = next((o for o in otros if o.ubicacion_id == d.ubicacion_id), None)
    if existente is None:
        await _validar_frente(db, datos)
    for o in otros:
        if o is not existente and o.prioridad <= 1:
            o.prioridad = 2
    if existente:
        for k2, v in datos.model_dump().items():
            setattr(existente, k2, v)
        f = existente
    else:
        f = WMSFrentePicking(**datos.model_dump())
        db.add(f)
    await db.flush()
    tarea_id = None
    if d.origen_id and d.cantidad and d.origen_id != d.ubicacion_id:
        prod = await db.get(WMSProducto, d.producto_id)
        t = WMSTarea(tipo="MOVIMIENTO", estado="PENDIENTE", prioridad=6, almacen_id=d.almacen_id,
                     depositante_id=prod.depositante_id if prod else None, producto_id=d.producto_id, lote_id=d.lote_id,
                     cantidad=d.cantidad, ubicacion_origen_id=d.origen_id, ubicacion_sugerida_id=d.ubicacion_id,
                     documento_tipo="SLOTTING", documento_id=f.id, razon_sugerencia="Slotting: llevar al nuevo frente de picking")
        db.add(t)
        await db.flush()
        tarea_id = t.id
    r = (await _frentes_dict(db, [f]))[0]
    r["tarea_id"] = tarea_id
    r["capacidad"] = await aviso_capacidad(db, f.ubicacion_id, f.almacen_id)
    return r


@router.delete("/frentes/{fid}", status_code=204)
async def borrar_frente(fid: int, db: AsyncSession = Depends(get_db), _=Depends(require_supervisor)):
    f = await db.get(WMSFrentePicking, fid)
    if f is None:
        raise HTTPException(404, "Frente no encontrado.")
    abiertas = (await db.execute(select(WMSTarea.id).where(WMSTarea.documento_tipo == "FRENTE", WMSTarea.documento_id == fid,
                                                           WMSTarea.estado.in_(reab.ABIERTAS)))).first()
    if abiertas:
        raise HTTPException(409, "El frente tiene reabastecimientos abiertos: termínelos o cancélelos, o deshabilítelo.")
    await db.delete(f)


# ═════════════════════════════════════════════════════════════════════════════
# Reabastecimiento
# ═════════════════════════════════════════════════════════════════════════════
@router.post("/reabastecimiento/evaluar")
async def evaluar(almacen_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await reab.evaluar(db, almacen_id)


class IdsIn(BaseModel):
    ids: List[int] = Field(min_length=1)


class MotivoIn(BaseModel):
    motivo: str = Field(min_length=3, max_length=200)


@router.post("/tareas/aprobar")
async def aprobar(data: IdsIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(require_supervisor)):
    tareas = (await db.execute(select(WMSTarea).where(WMSTarea.id.in_(data.ids)).with_for_update())).scalars().all()
    hechas = []
    for t in tareas:
        if t.estado != "POR_APROBAR":
            continue
        t.estado, t.aprobada_por_id, t.aprobada_en = "PENDIENTE", yo.id, per.ahora()
        hechas.append(t)
    return {"aprobadas": len(hechas), "tareas": await _tareas(db, hechas)}


@router.post("/tareas/{tid}/rechazar")
async def rechazar(tid: int, data: MotivoIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(require_supervisor)):
    t = (await db.execute(select(WMSTarea).where(WMSTarea.id == tid).with_for_update())).scalar_one_or_none()
    if t is None:
        raise HTTPException(404, "Tarea no encontrada.")
    if t.estado != "POR_APROBAR":
        raise HTTPException(409, "Solo se rechaza una tarea por aprobar.")
    t.estado, t.notas, t.aprobada_por_id, t.terminada_en = "RECHAZADA", data.motivo, yo.id, per.ahora()
    return (await _tareas(db, [t]))[0]


class ReasignarIn(BaseModel):
    operario_id: Optional[int] = None       # None = devolver a la cola


@router.post("/tareas/{tid}/reasignar")
async def reasignar(tid: int, data: ReasignarIn, db: AsyncSession = Depends(get_db), _=Depends(require_supervisor)):
    t = (await db.execute(select(WMSTarea).where(WMSTarea.id == tid).with_for_update())).scalar_one_or_none()
    if t is None:
        raise HTTPException(404, "Tarea no encontrada.")
    if t.estado not in ("PENDIENTE", "ASIGNADA", "EN_CURSO"):
        raise HTTPException(409, f"No se reasigna una tarea {t.estado.lower()}.")
    if data.operario_id is None:
        t.estado, t.operario_id, t.asignada_en, t.iniciada_en, t.jornada_id, t.origen_confirmado = \
            "PENDIENTE", None, None, None, None, None
    else:
        j = await per.jornada_abierta(db, data.operario_id, t.almacen_id)
        if j is None:
            raise HTTPException(409, "Ese usuario no recibe tareas de bodega: necesita un rol con permiso del WMS.")
        if await wtd.tarea_actual(db, data.operario_id):
            raise HTTPException(409, "Ese operario ya tiene una tarea en sus manos.")
        t.estado, t.operario_id, t.asignada_en, t.jornada_id = "ASIGNADA", data.operario_id, per.ahora(), j.id
        t.iniciada_en, t.origen_confirmado = None, None
    return (await _tareas(db, [t]))[0]


# ═════════════════════════════════════════════════════════════════════════════
# Operario: tomar siguiente y confirmar origen
# ═════════════════════════════════════════════════════════════════════════════
@router.post("/tareas/siguiente")
async def tomar_siguiente(almacen_id: Optional[int] = None, db: AsyncSession = Depends(get_db),
                          yo: Usuario = Depends(get_current_user)):
    t = await wtd.siguiente(db, yo.id, almacen_id)
    return {"tarea": (await _tareas(db, [t]))[0] if t else None}


class OrigenIn(BaseModel):
    codigo: str = Field(min_length=1, max_length=60)


@router.post("/tareas/{tid}/confirmar-origen")
async def confirmar_origen(tid: int, data: OrigenIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    t = (await db.execute(select(WMSTarea).where(WMSTarea.id == tid).with_for_update())).scalar_one_or_none()
    if t is None:
        raise HTTPException(404, "Tarea no encontrada.")
    if t.estado not in ("PENDIENTE", "ASIGNADA", "EN_CURSO"):
        raise HTTPException(409, f"La tarea está {t.estado.lower()}.")
    if t.operario_id and t.operario_id != yo.id:
        raise HTTPException(409, "La tarea está asignada a otro operario.")
    await wtd.confirmar_origen(db, t, data.codigo)
    t.operario_id = yo.id
    if t.jornada_id is None:
        j = await per.jornada_abierta(db, yo.id)
        t.jornada_id = j.id if j else None
    return (await _tareas(db, [t]))[0]


class NovedadIn(BaseModel):
    tipo: str = Field(pattern="^(FALTANTE|DANADO|UBICACION_BLOQUEADA|OTRO)$")
    detalle: Optional[str] = Field(None, max_length=200)


@router.post("/tareas/{tid}/novedad")
async def novedad(tid: int, data: NovedadIn, db: AsyncSession = Depends(get_db), yo: Usuario = Depends(get_current_user)):
    """El operario no puede hacer la tarea: vuelve a la cola con la novedad
    anotada (prioridad alta para que el supervisor la vea)."""
    t = (await db.execute(select(WMSTarea).where(WMSTarea.id == tid).with_for_update())).scalar_one_or_none()
    if t is None or t.estado not in ("ASIGNADA", "EN_CURSO"):
        raise HTTPException(409, "Solo se reporta una novedad sobre una tarea en sus manos.")
    texto = {"FALTANTE": "Faltante en origen", "DANADO": "Mercancía dañada", "UBICACION_BLOQUEADA": "Ubicación bloqueada",
             "OTRO": "Novedad"}[data.tipo]
    t.notas = f"{(t.notas or '').strip()} [{per.ahora():%d/%m %H:%M}] {texto}: {data.detalle or ''}".strip()[:2000]
    t.estado, t.operario_id, t.asignada_en, t.iniciada_en, t.jornada_id, t.origen_confirmado = \
        "PENDIENTE", None, None, None, None, None
    t.prioridad = min(t.prioridad, 1)
    if data.tipo != "OTRO" and t.tipo == "REABASTECIMIENTO":
        # No se vuelve a ofrecer hasta que el supervisor la revise.
        t.estado = "POR_APROBAR"
    return (await _tareas(db, [t]))[0]
