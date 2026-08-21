"""Catálogo maestro de la plataforma.

Problema que resuelve: cada módulo tiene decenas de campos de clasificación
guardados como texto libre (ciudad, área, cargo, categoría, motivo, unidad de
medida…). Escritos a mano, "Bodega Norte", "bodega norte" y "Bod. Norte" cuentan
como tres valores distintos y ningún reporte agrupado cuadra.

En el CMMS esto se resolvió con tablas dedicadas por catálogo. Eso funciona
cuando el catálogo lleva atributos propios — la referencia de una llanta guarda
su profundidad inicial, el modelo de un vehículo su motor y sus ejes — pero
replicarlo para ~190 campos de 15 módulos serían decenas de tablas casi
idénticas, cada una con su CRUD.

De ahí este modelo único con dos discriminadores (`modulo` + `tipo`) y jerarquía
por auto-referencia (`padre_id`), que cubre tanto listas planas como cadenas de
varios niveles con un solo CRUD y un solo componente de interfaz.

La regla para decidir dónde va un catálogo nuevo:
  · Si es solo una lista controlada de valores  → acá.
  · Si cada valor carga atributos del negocio   → tabla propia del módulo.
"""
import sqlalchemy as sa
from sqlalchemy import UniqueConstraint, Index
from app.core.database import Base
from app.infrastructure.models.base import TimestampMixin


# `GLOBAL` es el módulo de los catálogos compartidos. Que cada módulo tuviera su
# propia lista de ciudades sería el mismo problema de duplicación un nivel más
# arriba.
MODULO_GLOBAL = "GLOBAL"


class CatalogoMaestro(Base, TimestampMixin):
    __tablename__ = "catalogo_maestro"
    __table_args__ = (
        # El nombre se repite entre padres distintos: "Norte" puede ser un área
        # de dos sedes diferentes.
        UniqueConstraint("modulo", "tipo", "nombre", "padre_id",
                         name="uq_catalogo_maestro_valor"),
        Index("ix_catalogo_maestro_busqueda", "modulo", "tipo", "activo"),
    )

    id     = sa.Column(sa.Integer, primary_key=True, index=True)
    modulo = sa.Column(sa.String(20), nullable=False, index=True)   # GLOBAL, HCM, WMS…
    tipo   = sa.Column(sa.String(40), nullable=False, index=True)   # CIUDAD, CARGO…
    nombre = sa.Column(sa.String(200), nullable=False)
    codigo = sa.Column(sa.String(60), nullable=True)   # PUC, código DANE, SKU…

    # Jerarquía: el padre es otro valor del catálogo, normalmente de otro tipo
    # (una ciudad cuelga de un departamento).
    padre_id = sa.Column(sa.Integer, sa.ForeignKey("catalogo_maestro.id", ondelete="CASCADE"),
                         nullable=True, index=True)

    orden  = sa.Column(sa.Integer, default=0)
    color  = sa.Column(sa.String(9), nullable=True)
    # Escape para los pocos atributos extra que no justifican una tabla propia
    metadatos = sa.Column(sa.JSON, nullable=True)
    activo = sa.Column(sa.Boolean, default=True, nullable=False)


# ──────────────────────────────────────────
# REGISTRO DE CATÁLOGOS
# ──────────────────────────────────────────
#
# Declara qué catálogos existen, cómo se llaman en pantalla y de quién dependen.
# Al ser declarativo, agregar un catálogo a un módulo es una línea acá y no una
# tabla, un CRUD y una pantalla nuevas. `padre` apunta al tipo del nivel de
# arriba; si es None el catálogo es plano.

def _c(modulo, tipo, label, descripcion, padre=None):
    return {"modulo": modulo, "tipo": tipo, "label": label,
            "descripcion": descripcion, "padre": padre}


CATALOGOS_REGISTRO = [
    # ── Compartidos ──────────────────────────────────────────────────────
    _c(MODULO_GLOBAL, "PAIS", "Países", "Base de la jerarquía geográfica"),
    _c(MODULO_GLOBAL, "DEPARTAMENTO", "Departamentos", "Departamento o estado", "PAIS"),
    _c(MODULO_GLOBAL, "CIUDAD", "Ciudades", "Municipio o ciudad", "DEPARTAMENTO"),
    _c(MODULO_GLOBAL, "SEDE", "Sedes", "Plantas, centros de distribución, oficinas"),
    # Plana a propósito: en los formularios "Área" se usa suelta, y exigir una
    # sede antes de poder registrar áreas sería friccion sin ganancia.
    _c(MODULO_GLOBAL, "AREA", "Áreas", "Área funcional de la organización"),
    # Cargo y Proceso los usan GRC, MES, QMS y SST por igual: van a GLOBAL para
    # no dejar cuatro listas paralelas de lo mismo.
    _c(MODULO_GLOBAL, "CARGO", "Cargos", "Cargo dentro de la organización"),
    _c(MODULO_GLOBAL, "PROCESO", "Procesos", "Procesos del sistema de gestión"),
    _c(MODULO_GLOBAL, "CENTRO_COSTO", "Centros de costo", "A dónde se cargan los costos"),
    _c(MODULO_GLOBAL, "CUENTA_CONTABLE", "Cuentas contables", "Cuenta del PUC"),
    _c(MODULO_GLOBAL, "UNIDAD_MEDIDA", "Unidades de medida", "Unidad, caja, kilo, litro…"),
    _c(MODULO_GLOBAL, "MONEDA", "Monedas", "Monedas usadas en la operación"),

    # ── Gestión Humana ───────────────────────────────────────────────────
    _c("HCM", "TIPO_DOCUMENTO", "Tipos de documento", "Cédula, pasaporte, NIT…"),
    _c("HCM", "TIPO_CONTRATO", "Tipos de contrato", "Término fijo, indefinido, obra labor"),
    _c("HCM", "TIPO_SALARIO", "Tipos de salario", "Ordinario, integral, variable"),
    _c("HCM", "MOTIVO_RETIRO", "Motivos de retiro", "Por qué termina el vínculo"),
    _c("HCM", "NIVEL_EDUCATIVO", "Niveles educativos", "Escolaridad del empleado"),
    _c("HCM", "EPS", "EPS", "Entidades promotoras de salud"),
    _c("HCM", "AFP", "Fondos de pensión", "Administradoras de fondos de pensiones"),
    _c("HCM", "ARL", "ARL", "Administradoras de riesgos laborales"),
    _c("HCM", "CAJA_COMPENSACION", "Cajas de compensación", "Caja a la que está afiliado"),

    # ── Almacén WMS ──────────────────────────────────────────────────────
    _c("WMS", "CATEGORIA_PRODUCTO", "Categorías de producto", "Primer nivel del surtido"),
    _c("WMS", "SUBCATEGORIA_PRODUCTO", "Subcategorías", "Depende de la categoría", "CATEGORIA_PRODUCTO"),
    _c("WMS", "TIPO_EMPAQUE", "Tipos de empaque", "Caja, estiba, granel, saco"),
    _c("WMS", "MOTIVO_AJUSTE", "Motivos de ajuste", "Por qué se ajusta el inventario"),
    _c("WMS", "MOTIVO_DEVOLUCION", "Motivos de devolución", "Por qué se devuelve la mercancía"),

    # ── Transporte TMS ───────────────────────────────────────────────────
    _c("TMS", "TIPO_CARGA", "Tipos de carga", "Seca, refrigerada, peligrosa, granel"),
    _c("TMS", "TIPO_CARROCERIA", "Tipos de carrocería", "Furgón, planchón, tanque, estacas"),
    _c("TMS", "TIPO_SERVICIO", "Tipos de servicio", "Urbano, nacional, última milla"),
    _c("TMS", "MOTIVO_DEMORA", "Motivos de demora", "Por qué se retrasó el viaje"),
    _c("TMS", "MOTIVO_NOVEDAD", "Motivos de novedad", "Novedades en ruta"),

    # ── SG-SST ───────────────────────────────────────────────────────────
    _c("SST", "TIPO_PELIGRO", "Tipos de peligro", "Clasificación GTC 45"),
    _c("SST", "PELIGRO", "Peligros", "Peligro concreto del tipo", "TIPO_PELIGRO"),
    _c("SST", "PARTE_CUERPO", "Partes del cuerpo", "Parte afectada en el incidente"),
    _c("SST", "TIPO_EPP", "Tipos de EPP", "Elementos de protección personal"),
    _c("SST", "MOTIVO_INSPECCION", "Motivos de inspección", "Por qué se inspecciona"),

    # ── Calidad QMS ──────────────────────────────────────────────────────
    _c("QMS", "TIPO_NOCONFORMIDAD", "Tipos de no conformidad", "Clasificación del hallazgo"),
    _c("QMS", "CAUSA_RAIZ", "Causas raíz", "Categorías de causa"),
    _c("QMS", "TIPO_AUDITORIA", "Tipos de auditoría", "Interna, externa, de proveedor"),

    # ── Gobierno GRC ─────────────────────────────────────────────────────
    _c("GRC", "CATEGORIA_RIESGO", "Categorías de riesgo", "Primer nivel del mapa de riesgos"),
    _c("GRC", "TIPO_CONTROL", "Tipos de control", "Preventivo, detectivo, correctivo"),
    _c("GRC", "MARCO_NORMATIVO", "Marcos normativos", "Norma o ley que aplica"),

    # ── Aprendizaje LMS ──────────────────────────────────────────────────
    _c("LMS", "CATEGORIA_CURSO", "Categorías de curso", "Agrupación de la oferta"),
    _c("LMS", "MODALIDAD", "Modalidades", "Presencial, virtual, mixta"),
    _c("LMS", "COMPETENCIA", "Competencias", "Competencias que desarrolla"),

    # ── Documentos DMS ───────────────────────────────────────────────────
    _c("DMS", "SERIE_DOCUMENTAL", "Series documentales", "Primer nivel de la TRD"),
    _c("DMS", "SUBSERIE_DOCUMENTAL", "Subseries", "Depende de la serie", "SERIE_DOCUMENTAL"),
    _c("DMS", "TIPO_SOPORTE", "Tipos de soporte", "Físico, digital, híbrido"),

    # ── Cadena de suministro SCM ─────────────────────────────────────────
    _c("SCM", "CATEGORIA_COMPRA", "Categorías de compra", "Familia de lo que se compra"),
    _c("SCM", "TIPO_PROVEEDOR", "Tipos de proveedor", "Bienes, servicios, transporte"),
    _c("SCM", "MOTIVO_RECHAZO", "Motivos de rechazo", "Por qué se rechaza una solicitud"),

    # ── ERP ──────────────────────────────────────────────────────────────
    _c("ERP", "TIPO_COMPROBANTE", "Tipos de comprobante", "Factura, nota, recibo"),
    _c("ERP", "FORMA_PAGO", "Formas de pago", "Contado, crédito, transferencia"),
    _c("ERP", "TIPO_IMPUESTO", "Tipos de impuesto", "IVA, retefuente, ICA"),

    # ── Manufactura MES ──────────────────────────────────────────────────
    _c("MES", "LINEA_PRODUCCION", "Líneas de producción", "Líneas de la planta"),
    _c("MES", "TURNO", "Turnos", "Turnos de trabajo"),
    _c("MES", "TIPO_PARADA", "Tipos de parada", "Clasificación de la parada de máquina"),
    _c("MES", "MOTIVO_SCRAP", "Motivos de scrap", "Por qué se descarta producto"),

    # ── Planeación APS ───────────────────────────────────────────────────
    _c("APS", "FAMILIA_PRODUCTO", "Familias de producto", "Agrupación para pronóstico"),
    _c("APS", "POLITICA_INVENTARIO", "Políticas de inventario", "Cómo se reabastece"),

    # ── CRM ──────────────────────────────────────────────────────────────
    _c("CRM", "SECTOR_ECONOMICO", "Sectores económicos", "Sector del cliente"),
    _c("CRM", "ORIGEN_LEAD", "Orígenes de lead", "De dónde llegó el prospecto"),
    _c("CRM", "MOTIVO_PERDIDA", "Motivos de pérdida", "Por qué se perdió la oportunidad"),
]


def catalogos_de(modulo: str):
    """Catálogos declarados para un módulo, más los compartidos."""
    return [c for c in CATALOGOS_REGISTRO
            if c["modulo"] == modulo or c["modulo"] == MODULO_GLOBAL]


def buscar_registro(modulo: str, tipo: str):
    for c in CATALOGOS_REGISTRO:
        if c["modulo"] == modulo and c["tipo"] == tipo:
            return c
    return None


MODULOS_CON_CATALOGO = sorted({c["modulo"] for c in CATALOGOS_REGISTRO})
