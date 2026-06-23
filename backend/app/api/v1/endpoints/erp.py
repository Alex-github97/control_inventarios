"""
ERP — Enterprise Resource Planning
Núcleo financiero, administrativo, tributario y contable corporativo.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.infrastructure.models.usuario import Usuario
from app.infrastructure.models.erp import (
    ERPEmpresa, ERPPlanCuenta, ERPCentroCosto, ERPComprobante, ERPComprobanteLinea,
    ERPBanco, ERPCuentaBancaria, ERPMovimientoBancario, ERPTipoImpuesto,
    ERPFacturaCliente, ERPLineaFacturaCliente, ERPFacturaProveedor,
    ERPPago, ERPPresupuesto, ERPLineaPresupuesto, ERPActivoFijo, ERPDepreciacionActivo,
    ERPRequisicion, ERPLineaRequisicion, ERPOrdenCompra, ERPLineaOrdenCompra,
    ERPProyecto, ERPGastoProyecto, ERPTasaCambio, ERPAuditoria,
    TipoCuenta, NaturalezaCuenta, EstadoComprobante, TipoComprobante,
    TipoCuentaBancaria, EstadoFactura, TipoImpuestoEnum, TipoPresupuesto,
    EstadoPresupuesto, MetodoDepreciacion, EstadoActivoFijo, EstadoOC,
    EstadoRequisicion, EstadoPago, TipoPago, EstadoProyecto, TipoMovimientoBancario,
    TipoCentroCosto,
)

router = APIRouter(prefix="/erp", tags=["ERP"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class EmpresaCreate(BaseModel):
    nit: str
    razon_social: str
    nombre_comercial: Optional[str] = None
    pais: str = "Colombia"
    ciudad: Optional[str] = None
    moneda_base: str = "COP"
    sector: Optional[str] = None
    regimen_fiscal: Optional[str] = None
    norma_contable: str = "IFRS"
    es_holding: bool = False
    holding_id: Optional[int] = None

class EmpresaResponse(EmpresaCreate):
    id: int
    activo: bool
    model_config = {"from_attributes": True}


class PlanCuentaCreate(BaseModel):
    codigo: str
    nombre: str
    tipo: TipoCuenta
    naturaleza: NaturalezaCuenta
    nivel: int = 1
    cuenta_padre_id: Optional[int] = None
    es_auxiliar: bool = False
    acepta_movimientos: bool = True
    empresa_id: Optional[int] = None

class PlanCuentaResponse(PlanCuentaCreate):
    id: int
    activo: bool
    model_config = {"from_attributes": True}


class CentroCostoCreate(BaseModel):
    codigo: str
    nombre: str
    tipo: TipoCentroCosto = TipoCentroCosto.OPERATIVO
    responsable: Optional[str] = None
    presupuesto_anual: Optional[float] = None
    padre_id: Optional[int] = None
    empresa_id: Optional[int] = None

class CentroCostoResponse(CentroCostoCreate):
    id: int
    activo: bool
    model_config = {"from_attributes": True}


class ComprobanteLineaCreate(BaseModel):
    cuenta_id: int
    centro_costo_id: Optional[int] = None
    debito: float = 0
    credito: float = 0
    concepto: Optional[str] = None
    tercero: Optional[str] = None

class ComprobanteCreate(BaseModel):
    numero: str
    tipo: TipoComprobante
    fecha: date
    concepto: str
    empresa_id: Optional[int] = None
    referencia: Optional[str] = None
    lineas: List[ComprobanteLineaCreate] = []

class ComprobanteResponse(BaseModel):
    id: int
    numero: str
    tipo: TipoComprobante
    fecha: date
    concepto: str
    estado: EstadoComprobante
    total_debito: float
    total_credito: float
    periodo: Optional[str]
    model_config = {"from_attributes": True}


class BancoCreate(BaseModel):
    nombre: str
    codigo: Optional[str] = None
    swift: Optional[str] = None
    pais: str = "Colombia"

class BancoResponse(BancoCreate):
    id: int
    activo: bool
    model_config = {"from_attributes": True}


class CuentaBancariaCreate(BaseModel):
    banco_id: int
    numero: str
    tipo: TipoCuentaBancaria
    moneda: str = "COP"
    descripcion: Optional[str] = None
    empresa_id: Optional[int] = None

class CuentaBancariaResponse(CuentaBancariaCreate):
    id: int
    saldo_contable: float
    saldo_disponible: float
    activo: bool
    model_config = {"from_attributes": True}


class MovimientoBancarioCreate(BaseModel):
    cuenta_id: int
    fecha: date
    tipo: TipoMovimientoBancario
    monto: float
    concepto: str
    referencia: Optional[str] = None

class MovimientoBancarioResponse(MovimientoBancarioCreate):
    id: int
    conciliado: bool
    model_config = {"from_attributes": True}


class TipoImpuestoCreate(BaseModel):
    nombre: str
    codigo: str
    tipo: TipoImpuestoEnum
    porcentaje: float = 0
    pais: str = "Colombia"
    descripcion: Optional[str] = None

class TipoImpuestoResponse(TipoImpuestoCreate):
    id: int
    activo: bool
    model_config = {"from_attributes": True}


class LineaFacturaCreate(BaseModel):
    descripcion: str
    cantidad: float = 1
    precio_unitario: float = 0
    descuento_pct: float = 0
    impuesto_id: Optional[int] = None
    cuenta_id: Optional[int] = None
    centro_costo_id: Optional[int] = None

class FacturaClienteCreate(BaseModel):
    numero: str
    cliente_nombre: str
    cliente_nit: Optional[str] = None
    cliente_email: Optional[str] = None
    fecha: date
    fecha_vencimiento: date
    moneda: str = "COP"
    centro_costo_id: Optional[int] = None
    proyecto_id: Optional[int] = None
    concepto: Optional[str] = None
    empresa_id: Optional[int] = None
    lineas: List[LineaFacturaCreate] = []

class FacturaClienteResponse(BaseModel):
    id: int
    numero: str
    cliente_nombre: str
    cliente_nit: Optional[str]
    fecha: date
    fecha_vencimiento: date
    subtotal: float
    total_impuestos: float
    total: float
    saldo: float
    estado: EstadoFactura
    moneda: str
    model_config = {"from_attributes": True}


class FacturaProveedorCreate(BaseModel):
    numero_proveedor: str
    proveedor_nombre: str
    proveedor_nit: Optional[str] = None
    fecha: date
    fecha_vencimiento: date
    subtotal: float = 0
    total_impuestos: float = 0
    retenciones: float = 0
    total: float = 0
    moneda: str = "COP"
    orden_compra_id: Optional[int] = None
    centro_costo_id: Optional[int] = None
    concepto: Optional[str] = None
    empresa_id: Optional[int] = None

class FacturaProveedorResponse(FacturaProveedorCreate):
    id: int
    neto_pagar: float
    saldo: float
    estado: EstadoFactura
    model_config = {"from_attributes": True}


class PagoCreate(BaseModel):
    tipo: TipoPago
    numero: str
    fecha: date
    factura_cliente_id: Optional[int] = None
    factura_proveedor_id: Optional[int] = None
    cuenta_bancaria_id: Optional[int] = None
    monto: float
    moneda: str = "COP"
    metodo_pago: Optional[str] = None
    referencia: Optional[str] = None
    concepto: Optional[str] = None
    empresa_id: Optional[int] = None

class PagoResponse(PagoCreate):
    id: int
    estado: EstadoPago
    model_config = {"from_attributes": True}


class PresupuestoCreate(BaseModel):
    nombre: str
    tipo: TipoPresupuesto
    anio: int
    moneda: str = "COP"
    responsable: Optional[str] = None
    descripcion: Optional[str] = None
    empresa_id: Optional[int] = None

class PresupuestoResponse(PresupuestoCreate):
    id: int
    estado: EstadoPresupuesto
    total_presupuestado: float
    total_ejecutado: float
    activo: bool
    model_config = {"from_attributes": True}


class ActivoFijoCreate(BaseModel):
    codigo: str
    nombre: str
    categoria: str
    subcategoria: Optional[str] = None
    fecha_adquisicion: date
    valor_adquisicion: float
    valor_residual: float = 0
    vida_util_meses: int = 60
    metodo_depreciacion: MetodoDepreciacion = MetodoDepreciacion.LINEA_RECTA
    ubicacion: Optional[str] = None
    responsable: Optional[str] = None
    centro_costo_id: Optional[int] = None
    empresa_id: Optional[int] = None
    serie: Optional[str] = None
    proveedor: Optional[str] = None

class ActivoFijoResponse(ActivoFijoCreate):
    id: int
    depreciacion_acumulada: float
    valor_libro: float
    estado: EstadoActivoFijo
    activo: bool
    model_config = {"from_attributes": True}


class RequisicionCreate(BaseModel):
    numero: str
    solicitante: str
    fecha: date
    fecha_requerida: date
    urgente: bool = False
    centro_costo_id: Optional[int] = None
    justificacion: Optional[str] = None
    empresa_id: Optional[int] = None

class RequisicionResponse(RequisicionCreate):
    id: int
    estado: EstadoRequisicion
    activo: bool
    model_config = {"from_attributes": True}


class LineaOCCreate(BaseModel):
    descripcion: str
    unidad: Optional[str] = None
    cantidad: float = 1
    precio_unitario: float = 0
    descuento_pct: float = 0
    impuesto_id: Optional[int] = None
    cuenta_id: Optional[int] = None

class OrdenCompraCreate(BaseModel):
    numero: str
    proveedor_nombre: str
    proveedor_nit: Optional[str] = None
    fecha: date
    fecha_entrega: Optional[date] = None
    condiciones_pago: Optional[str] = None
    lugar_entrega: Optional[str] = None
    centro_costo_id: Optional[int] = None
    requisicion_id: Optional[int] = None
    moneda: str = "COP"
    empresa_id: Optional[int] = None
    observaciones: Optional[str] = None
    lineas: List[LineaOCCreate] = []

class OrdenCompraResponse(BaseModel):
    id: int
    numero: str
    proveedor_nombre: str
    proveedor_nit: Optional[str]
    fecha: date
    estado: EstadoOC
    subtotal: float
    total_impuestos: float
    total: float
    moneda: str
    activo: bool
    model_config = {"from_attributes": True}


class ProyectoCreate(BaseModel):
    codigo: str
    nombre: str
    tipo: Optional[str] = None
    cliente: Optional[str] = None
    responsable: Optional[str] = None
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    presupuesto_total: float = 0
    centro_costo_id: Optional[int] = None
    descripcion: Optional[str] = None
    empresa_id: Optional[int] = None

class ProyectoResponse(ProyectoCreate):
    id: int
    ejecutado_total: float
    ingresos_total: float
    estado: EstadoProyecto
    activo: bool
    model_config = {"from_attributes": True}


# ── DASHBOARD KPIs ────────────────────────────────────────────────────────────

@router.get("/dashboard/kpis")
async def get_erp_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    hoy = date.today()

    # Facturas cliente
    r_fc = await db.execute(
        select(
            func.count(ERPFacturaCliente.id).label("total_facturas"),
            func.coalesce(func.sum(ERPFacturaCliente.total), 0).label("total_facturado"),
            func.coalesce(func.sum(ERPFacturaCliente.saldo), 0).label("cartera_total"),
        ).where(ERPFacturaCliente.activo == True)
    )
    kpi_fc = r_fc.one()

    # Cartera vencida
    r_vencida = await db.execute(
        select(func.coalesce(func.sum(ERPFacturaCliente.saldo), 0)).where(
            and_(ERPFacturaCliente.activo == True, ERPFacturaCliente.fecha_vencimiento < hoy,
                 ERPFacturaCliente.estado == EstadoFactura.VENCIDA)
        )
    )
    cartera_vencida = float(r_vencida.scalar() or 0)

    # Cuentas por pagar
    r_fp = await db.execute(
        select(
            func.count(ERPFacturaProveedor.id).label("total"),
            func.coalesce(func.sum(ERPFacturaProveedor.saldo), 0).label("total_por_pagar"),
        ).where(ERPFacturaProveedor.activo == True)
    )
    kpi_fp = r_fp.one()

    # Activos fijos
    r_af = await db.execute(
        select(
            func.count(ERPActivoFijo.id).label("total"),
            func.coalesce(func.sum(ERPActivoFijo.valor_adquisicion), 0).label("valor_total"),
            func.coalesce(func.sum(ERPActivoFijo.valor_libro), 0).label("valor_libro_total"),
        ).where(ERPActivoFijo.activo == True)
    )
    kpi_af = r_af.one()

    # Presupuesto año actual
    r_pres = await db.execute(
        select(
            func.coalesce(func.sum(ERPPresupuesto.total_presupuestado), 0).label("presupuestado"),
            func.coalesce(func.sum(ERPPresupuesto.total_ejecutado), 0).label("ejecutado"),
        ).where(and_(ERPPresupuesto.activo == True, ERPPresupuesto.anio == hoy.year,
                     ERPPresupuesto.estado == EstadoPresupuesto.APROBADO))
    )
    kpi_pres = r_pres.one()

    # Saldo bancario
    r_banco = await db.execute(
        select(func.coalesce(func.sum(ERPCuentaBancaria.saldo_disponible), 0)).where(
            ERPCuentaBancaria.activo == True
        )
    )
    saldo_bancario = float(r_banco.scalar() or 0)

    # Órdenes de compra pendientes
    r_oc = await db.execute(
        select(
            func.count(ERPOrdenCompra.id),
            func.coalesce(func.sum(ERPOrdenCompra.total), 0),
        ).where(and_(ERPOrdenCompra.activo == True,
                     ERPOrdenCompra.estado.in_([EstadoOC.APROBADA, EstadoOC.BORRADOR])))
    )
    kpi_oc = r_oc.one()

    return {
        "facturacion": {
            "total_facturas": int(kpi_fc.total_facturas),
            "total_facturado": float(kpi_fc.total_facturado),
            "cartera_total": float(kpi_fc.cartera_total),
            "cartera_vencida": cartera_vencida,
        },
        "cuentas_pagar": {
            "total_facturas": int(kpi_fp.total),
            "total_por_pagar": float(kpi_fp.total_por_pagar),
        },
        "activos_fijos": {
            "total_activos": int(kpi_af.total),
            "valor_adquisicion": float(kpi_af.valor_total),
            "valor_libro": float(kpi_af.valor_libro_total),
        },
        "presupuesto": {
            "presupuestado": float(kpi_pres.presupuestado),
            "ejecutado": float(kpi_pres.ejecutado),
            "ejecucion_pct": (float(kpi_pres.ejecutado) / float(kpi_pres.presupuestado) * 100)
                             if float(kpi_pres.presupuestado) > 0 else 0,
        },
        "tesoreria": {
            "saldo_bancario": saldo_bancario,
        },
        "compras": {
            "oc_pendientes": int(kpi_oc[0]),
            "valor_oc_pendiente": float(kpi_oc[1]),
        },
    }


# ── EMPRESAS ──────────────────────────────────────────────────────────────────

@router.get("/empresas", response_model=List[EmpresaResponse])
async def listar_empresas(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    r = await db.execute(select(ERPEmpresa).where(ERPEmpresa.activo == True).order_by(ERPEmpresa.razon_social))
    return list(r.scalars().all())

@router.post("/empresas", response_model=EmpresaResponse, status_code=201)
async def crear_empresa(data: EmpresaCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    emp = ERPEmpresa(**data.model_dump())
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    return emp

@router.put("/empresas/{empresa_id}", response_model=EmpresaResponse)
async def actualizar_empresa(empresa_id: int, data: EmpresaCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    emp = await db.get(ERPEmpresa, empresa_id)
    if not emp:
        raise HTTPException(404, "Empresa no encontrada")
    for k, v in data.model_dump().items():
        setattr(emp, k, v)
    await db.commit()
    await db.refresh(emp)
    return emp


# ── PLAN DE CUENTAS ───────────────────────────────────────────────────────────

@router.get("/contabilidad/cuentas", response_model=List[PlanCuentaResponse])
async def listar_cuentas(
    tipo: Optional[TipoCuenta] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(ERPPlanCuenta).where(ERPPlanCuenta.activo == True)
    if tipo:
        q = q.where(ERPPlanCuenta.tipo == tipo)
    if search:
        q = q.where(ERPPlanCuenta.nombre.ilike(f"%{search}%") | ERPPlanCuenta.codigo.ilike(f"%{search}%"))
    r = await db.execute(q.order_by(ERPPlanCuenta.codigo))
    return list(r.scalars().all())

@router.post("/contabilidad/cuentas", response_model=PlanCuentaResponse, status_code=201)
async def crear_cuenta(data: PlanCuentaCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    existing = await db.execute(select(ERPPlanCuenta).where(ERPPlanCuenta.codigo == data.codigo))
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Ya existe la cuenta con código {data.codigo}")
    cuenta = ERPPlanCuenta(**data.model_dump())
    db.add(cuenta)
    await db.commit()
    await db.refresh(cuenta)
    return cuenta

@router.delete("/contabilidad/cuentas/{cuenta_id}", status_code=204)
async def eliminar_cuenta(cuenta_id: int, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    c = await db.get(ERPPlanCuenta, cuenta_id)
    if not c:
        raise HTTPException(404, "Cuenta no encontrada")
    c.activo = False
    await db.commit()


# ── CENTROS DE COSTO ──────────────────────────────────────────────────────────

@router.get("/contabilidad/centros-costo", response_model=List[CentroCostoResponse])
async def listar_centros_costo(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    r = await db.execute(select(ERPCentroCosto).where(ERPCentroCosto.activo == True).order_by(ERPCentroCosto.codigo))
    return list(r.scalars().all())

@router.post("/contabilidad/centros-costo", response_model=CentroCostoResponse, status_code=201)
async def crear_centro_costo(data: CentroCostoCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    cc = ERPCentroCosto(**data.model_dump())
    db.add(cc)
    await db.commit()
    await db.refresh(cc)
    return cc

@router.delete("/contabilidad/centros-costo/{cc_id}", status_code=204)
async def eliminar_centro_costo(cc_id: int, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    cc = await db.get(ERPCentroCosto, cc_id)
    if not cc:
        raise HTTPException(404, "Centro de costo no encontrado")
    cc.activo = False
    await db.commit()


# ── COMPROBANTES ──────────────────────────────────────────────────────────────

@router.get("/contabilidad/comprobantes", response_model=List[ComprobanteResponse])
async def listar_comprobantes(
    tipo: Optional[TipoComprobante] = Query(None),
    estado: Optional[EstadoComprobante] = Query(None),
    periodo: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(ERPComprobante)
    if tipo:
        q = q.where(ERPComprobante.tipo == tipo)
    if estado:
        q = q.where(ERPComprobante.estado == estado)
    if periodo:
        q = q.where(ERPComprobante.periodo == periodo)
    r = await db.execute(q.order_by(ERPComprobante.fecha.desc()))
    return list(r.scalars().all())

@router.post("/contabilidad/comprobantes", response_model=ComprobanteResponse, status_code=201)
async def crear_comprobante(data: ComprobanteCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    total_d = sum(l.debito for l in data.lineas)
    total_c = sum(l.credito for l in data.lineas)
    if abs(total_d - total_c) > 0.01:
        raise HTTPException(400, "El comprobante no cuadra: débitos ≠ créditos")
    periodo = data.fecha.strftime("%Y-%m")
    comp = ERPComprobante(
        **{k: v for k, v in data.model_dump(exclude={"lineas"}).items()},
        total_debito=total_d, total_credito=total_c, periodo=periodo,
        creado_por=current_user.nombre,
    )
    db.add(comp)
    await db.flush()
    for ldata in data.lineas:
        linea = ERPComprobanteLinea(comprobante_id=comp.id, **ldata.model_dump())
        db.add(linea)
    await db.commit()
    await db.refresh(comp)
    return comp

@router.post("/contabilidad/comprobantes/{comp_id}/contabilizar", response_model=ComprobanteResponse)
async def contabilizar_comprobante(comp_id: int, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    comp = await db.get(ERPComprobante, comp_id)
    if not comp:
        raise HTTPException(404, "Comprobante no encontrado")
    if comp.estado != EstadoComprobante.BORRADOR:
        raise HTTPException(400, "Solo se pueden contabilizar comprobantes en estado BORRADOR")
    comp.estado = EstadoComprobante.CONTABILIZADO
    comp.contabilizado_por = current_user.nombre
    comp.contabilizado_en = datetime.now()
    await db.commit()
    await db.refresh(comp)
    return comp


# ── BANCOS ────────────────────────────────────────────────────────────────────

@router.get("/tesoreria/bancos", response_model=List[BancoResponse])
async def listar_bancos(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    r = await db.execute(select(ERPBanco).where(ERPBanco.activo == True).order_by(ERPBanco.nombre))
    return list(r.scalars().all())

@router.post("/tesoreria/bancos", response_model=BancoResponse, status_code=201)
async def crear_banco(data: BancoCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    b = ERPBanco(**data.model_dump())
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return b


# ── CUENTAS BANCARIAS ──────────────────────────────────────────────────────────

@router.get("/tesoreria/cuentas", response_model=List[CuentaBancariaResponse])
async def listar_cuentas_bancarias(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    r = await db.execute(select(ERPCuentaBancaria).where(ERPCuentaBancaria.activo == True).order_by(ERPCuentaBancaria.numero))
    return list(r.scalars().all())

@router.post("/tesoreria/cuentas", response_model=CuentaBancariaResponse, status_code=201)
async def crear_cuenta_bancaria(data: CuentaBancariaCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    cb = ERPCuentaBancaria(**data.model_dump())
    db.add(cb)
    await db.commit()
    await db.refresh(cb)
    return cb


# ── MOVIMIENTOS BANCARIOS ─────────────────────────────────────────────────────

@router.get("/tesoreria/movimientos", response_model=List[MovimientoBancarioResponse])
async def listar_movimientos(
    cuenta_id: Optional[int] = Query(None),
    conciliado: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(ERPMovimientoBancario)
    if cuenta_id:
        q = q.where(ERPMovimientoBancario.cuenta_id == cuenta_id)
    if conciliado is not None:
        q = q.where(ERPMovimientoBancario.conciliado == conciliado)
    r = await db.execute(q.order_by(ERPMovimientoBancario.fecha.desc()))
    return list(r.scalars().all())

@router.post("/tesoreria/movimientos", response_model=MovimientoBancarioResponse, status_code=201)
async def registrar_movimiento(data: MovimientoBancarioCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    mv = ERPMovimientoBancario(**data.model_dump())
    db.add(mv)
    # Actualizar saldo cuenta
    cb = await db.get(ERPCuentaBancaria, data.cuenta_id)
    if cb:
        if data.tipo == TipoMovimientoBancario.CREDITO:
            cb.saldo_contable = float(cb.saldo_contable) + data.monto
            cb.saldo_disponible = float(cb.saldo_disponible) + data.monto
        else:
            cb.saldo_contable = float(cb.saldo_contable) - data.monto
            cb.saldo_disponible = float(cb.saldo_disponible) - data.monto
    await db.commit()
    await db.refresh(mv)
    return mv


# ── IMPUESTOS ─────────────────────────────────────────────────────────────────

@router.get("/tributacion/impuestos", response_model=List[TipoImpuestoResponse])
async def listar_impuestos(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    r = await db.execute(select(ERPTipoImpuesto).where(ERPTipoImpuesto.activo == True).order_by(ERPTipoImpuesto.nombre))
    return list(r.scalars().all())

@router.post("/tributacion/impuestos", response_model=TipoImpuestoResponse, status_code=201)
async def crear_impuesto(data: TipoImpuestoCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    existing = await db.execute(select(ERPTipoImpuesto).where(ERPTipoImpuesto.codigo == data.codigo))
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Ya existe impuesto con código {data.codigo}")
    imp = ERPTipoImpuesto(**data.model_dump())
    db.add(imp)
    await db.commit()
    await db.refresh(imp)
    return imp

@router.delete("/tributacion/impuestos/{imp_id}", status_code=204)
async def eliminar_impuesto(imp_id: int, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    imp = await db.get(ERPTipoImpuesto, imp_id)
    if not imp:
        raise HTTPException(404, "Impuesto no encontrado")
    imp.activo = False
    await db.commit()


# ── CUENTAS POR COBRAR ────────────────────────────────────────────────────────

@router.get("/cxc/facturas", response_model=List[FacturaClienteResponse])
async def listar_facturas_cliente(
    estado: Optional[EstadoFactura] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(ERPFacturaCliente).where(ERPFacturaCliente.activo == True)
    if estado:
        q = q.where(ERPFacturaCliente.estado == estado)
    if search:
        q = q.where(ERPFacturaCliente.cliente_nombre.ilike(f"%{search}%") | ERPFacturaCliente.numero.ilike(f"%{search}%"))
    r = await db.execute(q.order_by(ERPFacturaCliente.fecha.desc()))
    return list(r.scalars().all())

@router.post("/cxc/facturas", response_model=FacturaClienteResponse, status_code=201)
async def crear_factura_cliente(data: FacturaClienteCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    existing = await db.execute(select(ERPFacturaCliente).where(ERPFacturaCliente.numero == data.numero))
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Ya existe factura con número {data.numero}")
    subtotal = 0.0
    total_imp = 0.0
    for l in data.lineas:
        base = l.cantidad * l.precio_unitario * (1 - l.descuento_pct / 100)
        imp = 0.0
        if l.impuesto_id:
            t = await db.get(ERPTipoImpuesto, l.impuesto_id)
            if t:
                imp = base * float(t.porcentaje) / 100
        subtotal += base
        total_imp += imp
    total = subtotal + total_imp
    fc = ERPFacturaCliente(
        **{k: v for k, v in data.model_dump(exclude={"lineas"}).items()},
        subtotal=subtotal, total_impuestos=total_imp, total=total, saldo=total,
    )
    db.add(fc)
    await db.flush()
    for ldata in data.lineas:
        base = ldata.cantidad * ldata.precio_unitario * (1 - ldata.descuento_pct / 100)
        imp = 0.0
        if ldata.impuesto_id:
            t = await db.get(ERPTipoImpuesto, ldata.impuesto_id)
            if t:
                imp = base * float(t.porcentaje) / 100
        linea = ERPLineaFacturaCliente(
            factura_id=fc.id, **{k: v for k, v in ldata.model_dump().items()},
            subtotal=base, total_impuesto=imp, total=base + imp,
        )
        db.add(linea)
    await db.commit()
    await db.refresh(fc)
    return fc

@router.get("/cxc/aging")
async def aging_cuentas_cobrar(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    hoy = date.today()
    r = await db.execute(
        select(ERPFacturaCliente).where(
            and_(ERPFacturaCliente.activo == True, ERPFacturaCliente.saldo > 0)
        )
    )
    facturas = r.scalars().all()
    buckets = {"corriente": 0, "1_30": 0, "31_60": 0, "61_90": 0, "mas_90": 0}
    for f in facturas:
        dias = (hoy - f.fecha_vencimiento).days
        saldo = float(f.saldo)
        if dias <= 0:
            buckets["corriente"] += saldo
        elif dias <= 30:
            buckets["1_30"] += saldo
        elif dias <= 60:
            buckets["31_60"] += saldo
        elif dias <= 90:
            buckets["61_90"] += saldo
        else:
            buckets["mas_90"] += saldo
    return buckets


# ── CUENTAS POR PAGAR ─────────────────────────────────────────────────────────

@router.get("/cxp/facturas", response_model=List[FacturaProveedorResponse])
async def listar_facturas_proveedor(
    estado: Optional[EstadoFactura] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(ERPFacturaProveedor).where(ERPFacturaProveedor.activo == True)
    if estado:
        q = q.where(ERPFacturaProveedor.estado == estado)
    if search:
        q = q.where(ERPFacturaProveedor.proveedor_nombre.ilike(f"%{search}%"))
    r = await db.execute(q.order_by(ERPFacturaProveedor.fecha_vencimiento.asc()))
    return list(r.scalars().all())

@router.post("/cxp/facturas", response_model=FacturaProveedorResponse, status_code=201)
async def crear_factura_proveedor(data: FacturaProveedorCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    neto = data.total - data.retenciones
    fp = ERPFacturaProveedor(**data.model_dump(), neto_pagar=neto, saldo=neto)
    db.add(fp)
    await db.commit()
    await db.refresh(fp)
    return fp


# ── PAGOS ─────────────────────────────────────────────────────────────────────

@router.get("/pagos", response_model=List[PagoResponse])
async def listar_pagos(
    tipo: Optional[TipoPago] = Query(None),
    estado: Optional[EstadoPago] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(ERPPago)
    if tipo:
        q = q.where(ERPPago.tipo == tipo)
    if estado:
        q = q.where(ERPPago.estado == estado)
    r = await db.execute(q.order_by(ERPPago.fecha.desc()))
    return list(r.scalars().all())

@router.post("/pagos", response_model=PagoResponse, status_code=201)
async def registrar_pago(data: PagoCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    pago = ERPPago(**data.model_dump(), estado=EstadoPago.PROCESADO)
    db.add(pago)
    # Actualizar saldo factura
    if data.factura_cliente_id:
        fc = await db.get(ERPFacturaCliente, data.factura_cliente_id)
        if fc:
            nuevo_saldo = max(0, float(fc.saldo) - data.monto)
            fc.saldo = nuevo_saldo
            fc.estado = EstadoFactura.PAGADA if nuevo_saldo == 0 else EstadoFactura.PARCIALMENTE_PAGADA
    if data.factura_proveedor_id:
        fp = await db.get(ERPFacturaProveedor, data.factura_proveedor_id)
        if fp:
            nuevo_saldo = max(0, float(fp.saldo) - data.monto)
            fp.saldo = nuevo_saldo
            fp.estado = EstadoFactura.PAGADA if nuevo_saldo == 0 else EstadoFactura.PARCIALMENTE_PAGADA
    await db.commit()
    await db.refresh(pago)
    return pago


# ── PRESUPUESTOS ──────────────────────────────────────────────────────────────

@router.get("/presupuestos", response_model=List[PresupuestoResponse])
async def listar_presupuestos(
    anio: Optional[int] = Query(None),
    tipo: Optional[TipoPresupuesto] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(ERPPresupuesto).where(ERPPresupuesto.activo == True)
    if anio:
        q = q.where(ERPPresupuesto.anio == anio)
    if tipo:
        q = q.where(ERPPresupuesto.tipo == tipo)
    r = await db.execute(q.order_by(ERPPresupuesto.anio.desc(), ERPPresupuesto.nombre))
    return list(r.scalars().all())

@router.post("/presupuestos", response_model=PresupuestoResponse, status_code=201)
async def crear_presupuesto(data: PresupuestoCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    p = ERPPresupuesto(**data.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p

@router.post("/presupuestos/{pres_id}/aprobar", response_model=PresupuestoResponse)
async def aprobar_presupuesto(pres_id: int, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    p = await db.get(ERPPresupuesto, pres_id)
    if not p:
        raise HTTPException(404, "Presupuesto no encontrado")
    p.estado = EstadoPresupuesto.APROBADO
    await db.commit()
    await db.refresh(p)
    return p


# ── ACTIVOS FIJOS ─────────────────────────────────────────────────────────────

@router.get("/activos", response_model=List[ActivoFijoResponse])
async def listar_activos(
    categoria: Optional[str] = Query(None),
    estado: Optional[EstadoActivoFijo] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(ERPActivoFijo).where(ERPActivoFijo.activo == True)
    if categoria:
        q = q.where(ERPActivoFijo.categoria == categoria)
    if estado:
        q = q.where(ERPActivoFijo.estado == estado)
    r = await db.execute(q.order_by(ERPActivoFijo.codigo))
    return list(r.scalars().all())

@router.post("/activos", response_model=ActivoFijoResponse, status_code=201)
async def crear_activo(data: ActivoFijoCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    existing = await db.execute(select(ERPActivoFijo).where(ERPActivoFijo.codigo == data.codigo))
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Ya existe activo con código {data.codigo}")
    af = ERPActivoFijo(**data.model_dump(), valor_libro=data.valor_adquisicion)
    db.add(af)
    await db.commit()
    await db.refresh(af)
    return af

@router.post("/activos/{activo_id}/depreciar")
async def calcular_depreciacion(activo_id: int, fecha: date = Query(...), db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    af = await db.get(ERPActivoFijo, activo_id)
    if not af:
        raise HTTPException(404, "Activo no encontrado")
    if af.metodo_depreciacion == MetodoDepreciacion.LINEA_RECTA:
        dep_mensual = (float(af.valor_adquisicion) - float(af.valor_residual)) / af.vida_util_meses
    else:
        dep_mensual = (float(af.valor_libro) * 2) / af.vida_util_meses
    nueva_acum = float(af.depreciacion_acumulada) + dep_mensual
    nuevo_libro = max(float(af.valor_residual), float(af.valor_adquisicion) - nueva_acum)
    dep = ERPDepreciacionActivo(
        activo_id=activo_id, periodo=fecha.strftime("%Y-%m"), fecha=fecha,
        valor_depreciacion=dep_mensual, depreciacion_acumulada=nueva_acum, valor_libro=nuevo_libro,
    )
    af.depreciacion_acumulada = nueva_acum
    af.valor_libro = nuevo_libro
    db.add(dep)
    await db.commit()
    return {"depreciacion": dep_mensual, "acumulada": nueva_acum, "valor_libro": nuevo_libro}


# ── COMPRAS ───────────────────────────────────────────────────────────────────

@router.get("/compras/requisiciones", response_model=List[RequisicionResponse])
async def listar_requisiciones(
    estado: Optional[EstadoRequisicion] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(ERPRequisicion).where(ERPRequisicion.activo == True)
    if estado:
        q = q.where(ERPRequisicion.estado == estado)
    r = await db.execute(q.order_by(ERPRequisicion.fecha.desc()))
    return list(r.scalars().all())

@router.post("/compras/requisiciones", response_model=RequisicionResponse, status_code=201)
async def crear_requisicion(data: RequisicionCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    req = ERPRequisicion(**data.model_dump())
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req

@router.post("/compras/requisiciones/{req_id}/aprobar", response_model=RequisicionResponse)
async def aprobar_requisicion(req_id: int, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    req = await db.get(ERPRequisicion, req_id)
    if not req:
        raise HTTPException(404, "Requisición no encontrada")
    req.estado = EstadoRequisicion.APROBADA
    req.aprobado_por = current_user.nombre
    req.fecha_aprobacion = date.today()
    await db.commit()
    await db.refresh(req)
    return req

@router.get("/compras/ordenes", response_model=List[OrdenCompraResponse])
async def listar_ordenes_compra(
    estado: Optional[EstadoOC] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(ERPOrdenCompra).where(ERPOrdenCompra.activo == True)
    if estado:
        q = q.where(ERPOrdenCompra.estado == estado)
    r = await db.execute(q.order_by(ERPOrdenCompra.fecha.desc()))
    return list(r.scalars().all())

@router.post("/compras/ordenes", response_model=OrdenCompraResponse, status_code=201)
async def crear_orden_compra(data: OrdenCompraCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    subtotal = sum(l.cantidad * l.precio_unitario * (1 - l.descuento_pct / 100) for l in data.lineas)
    total_imp = 0.0
    for l in data.lineas:
        if l.impuesto_id:
            t = await db.get(ERPTipoImpuesto, l.impuesto_id)
            if t:
                base = l.cantidad * l.precio_unitario * (1 - l.descuento_pct / 100)
                total_imp += base * float(t.porcentaje) / 100
    total = subtotal + total_imp
    oc = ERPOrdenCompra(
        **{k: v for k, v in data.model_dump(exclude={"lineas"}).items()},
        subtotal=subtotal, total_impuestos=total_imp, total=total,
    )
    db.add(oc)
    await db.flush()
    for ldata in data.lineas:
        base = ldata.cantidad * ldata.precio_unitario * (1 - ldata.descuento_pct / 100)
        imp = 0.0
        if ldata.impuesto_id:
            t = await db.get(ERPTipoImpuesto, ldata.impuesto_id)
            if t:
                imp = base * float(t.porcentaje) / 100
        linea = ERPLineaOrdenCompra(
            orden_id=oc.id, **{k: v for k, v in ldata.model_dump().items()},
            subtotal=base, total_impuesto=imp, total=base + imp,
        )
        db.add(linea)
    await db.commit()
    await db.refresh(oc)
    return oc

@router.post("/compras/ordenes/{oc_id}/aprobar", response_model=OrdenCompraResponse)
async def aprobar_orden_compra(oc_id: int, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    oc = await db.get(ERPOrdenCompra, oc_id)
    if not oc:
        raise HTTPException(404, "Orden de compra no encontrada")
    oc.estado = EstadoOC.APROBADA
    oc.aprobado_por = current_user.nombre
    oc.fecha_aprobacion = date.today()
    await db.commit()
    await db.refresh(oc)
    return oc


# ── PROYECTOS ─────────────────────────────────────────────────────────────────

@router.get("/proyectos", response_model=List[ProyectoResponse])
async def listar_proyectos(
    estado: Optional[EstadoProyecto] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(ERPProyecto).where(ERPProyecto.activo == True)
    if estado:
        q = q.where(ERPProyecto.estado == estado)
    r = await db.execute(q.order_by(ERPProyecto.fecha_inicio.desc()))
    return list(r.scalars().all())

@router.post("/proyectos", response_model=ProyectoResponse, status_code=201)
async def crear_proyecto(data: ProyectoCreate, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    existing = await db.execute(select(ERPProyecto).where(ERPProyecto.codigo == data.codigo))
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Ya existe proyecto con código {data.codigo}")
    proy = ERPProyecto(**data.model_dump())
    db.add(proy)
    await db.commit()
    await db.refresh(proy)
    return proy

@router.get("/proyectos/{proy_id}/rentabilidad")
async def rentabilidad_proyecto(proy_id: int, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    proy = await db.get(ERPProyecto, proy_id)
    if not proy:
        raise HTTPException(404, "Proyecto no encontrado")
    r_gastos = await db.execute(
        select(func.coalesce(func.sum(ERPGastoProyecto.monto), 0)).where(ERPGastoProyecto.proyecto_id == proy_id)
    )
    total_gastos = float(r_gastos.scalar() or 0)
    utilidad = float(proy.ingresos_total) - total_gastos
    margen = (utilidad / float(proy.ingresos_total) * 100) if float(proy.ingresos_total) > 0 else 0
    return {
        "proyecto": proy.nombre,
        "ingresos": float(proy.ingresos_total),
        "gastos": total_gastos,
        "utilidad": utilidad,
        "margen_pct": round(margen, 2),
        "presupuesto": float(proy.presupuesto_total),
        "ejecucion_pct": (total_gastos / float(proy.presupuesto_total) * 100) if float(proy.presupuesto_total) > 0 else 0,
    }


# ── TASAS DE CAMBIO ───────────────────────────────────────────────────────────

@router.get("/tasas-cambio")
async def listar_tasas(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    r = await db.execute(select(ERPTasaCambio).order_by(ERPTasaCambio.fecha.desc()).limit(50))
    items = r.scalars().all()
    return [{"id": t.id, "moneda_origen": t.moneda_origen, "moneda_destino": t.moneda_destino, "fecha": t.fecha, "tasa": float(t.tasa)} for t in items]

@router.post("/tasas-cambio", status_code=201)
async def crear_tasa(moneda_origen: str, moneda_destino: str, fecha: date, tasa: float, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    t = ERPTasaCambio(moneda_origen=moneda_origen, moneda_destino=moneda_destino, fecha=fecha, tasa=tasa)
    db.add(t)
    await db.commit()
    return {"ok": True}


# ── REPORTES ──────────────────────────────────────────────────────────────────

@router.get("/reportes/estado-resultados")
async def estado_resultados(
    anio: int = Query(...),
    mes: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # Ingresos y egresos del periodo via comprobantes contabilizados
    periodo_filter = f"{anio:04d}-{mes:02d}" if mes else str(anio)
    q_ingresos = select(func.coalesce(func.sum(ERPComprobanteLinea.credito - ERPComprobanteLinea.debito), 0)).join(
        ERPComprobante
    ).join(ERPPlanCuenta).where(
        and_(ERPComprobante.estado == EstadoComprobante.CONTABILIZADO,
             ERPPlanCuenta.tipo == TipoCuenta.INGRESO,
             ERPComprobante.periodo.like(f"{anio}%") if not mes else ERPComprobante.periodo == periodo_filter)
    )
    q_egresos = select(func.coalesce(func.sum(ERPComprobanteLinea.debito - ERPComprobanteLinea.credito), 0)).join(
        ERPComprobante
    ).join(ERPPlanCuenta).where(
        and_(ERPComprobante.estado == EstadoComprobante.CONTABILIZADO,
             ERPPlanCuenta.tipo == TipoCuenta.EGRESO,
             ERPComprobante.periodo.like(f"{anio}%") if not mes else ERPComprobante.periodo == periodo_filter)
    )
    r_i = await db.execute(q_ingresos)
    r_e = await db.execute(q_egresos)
    ingresos = float(r_i.scalar() or 0)
    egresos = float(r_e.scalar() or 0)
    return {
        "periodo": periodo_filter,
        "ingresos": ingresos,
        "egresos": egresos,
        "utilidad_neta": ingresos - egresos,
        "margen": round((ingresos - egresos) / ingresos * 100, 2) if ingresos > 0 else 0,
    }
