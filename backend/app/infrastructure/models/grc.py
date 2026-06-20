"""
GRC - Governance, Risk & Compliance
ISO 31000 · ISO 37301 · ISO 27001 · ISO 22301 · COSO ERM · COBIT · NIST CSF
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime,
    Numeric, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from app.infrastructure.models.base import Base, TimestampMixin, SoftDeleteMixin


# ────────────────────────────────────────────
# Enums
# ────────────────────────────────────────────

class TipoRiesgoGRCEnum(str, enum.Enum):
    ESTRATEGICO   = "estrategico"
    OPERATIVO     = "operativo"
    FINANCIERO    = "financiero"
    TECNOLOGICO   = "tecnologico"
    LOGISTICO     = "logistico"
    TRANSPORTE    = "transporte"
    RRHH          = "rrhh"
    LEGAL         = "legal"
    AMBIENTAL     = "ambiental"
    REPUTACIONAL  = "reputacional"
    CIBERSEGURIDAD = "ciberseguridad"

class PrioridadRiesgoGRCEnum(str, enum.Enum):
    BAJA    = "baja"
    MEDIA   = "media"
    ALTA    = "alta"
    CRITICA = "critica"

class EstadoRiesgoGRCEnum(str, enum.Enum):
    IDENTIFICADO = "identificado"
    EN_ANALISIS  = "en_analisis"
    TRATAMIENTO  = "tratamiento"
    ACEPTADO     = "aceptado"
    MITIGADO     = "mitigado"
    CERRADO      = "cerrado"

class TratamientoRiesgoGRCEnum(str, enum.Enum):
    MITIGAR    = "mitigar"
    TRANSFERIR = "transferir"
    EVITAR     = "evitar"
    ACEPTAR    = "aceptar"

class TipoControlGRCEnum(str, enum.Enum):
    PREVENTIVO    = "preventivo"
    DETECTIVO     = "detectivo"
    CORRECTIVO    = "correctivo"
    COMPENSATORIO = "compensatorio"

class EfectividadControlGRCEnum(str, enum.Enum):
    EFECTIVO              = "efectivo"
    PARCIALMENTE_EFECTIVO = "parcialmente_efectivo"
    INEFECTIVO            = "inefectivo"
    NO_PROBADO            = "no_probado"

class EstadoPoliticaGRCEnum(str, enum.Enum):
    BORRADOR    = "borrador"
    EN_REVISION = "en_revision"
    APROBADA    = "aprobada"
    PUBLICADA   = "publicada"
    VENCIDA     = "vencida"
    ARCHIVADA   = "archivada"

class TipoObligacionGRCEnum(str, enum.Enum):
    LEY              = "ley"
    REGLAMENTO       = "reglamento"
    NORMA            = "norma"
    CONTRATO         = "contrato"
    POLITICA_INTERNA = "politica_interna"
    REQUISITO_CLIENTE = "requisito_cliente"

class EstadoCumplimientoGRCEnum(str, enum.Enum):
    CUMPLE         = "cumple"
    CUMPLE_PARCIAL = "cumple_parcial"
    NO_CUMPLE      = "no_cumple"
    NO_APLICA      = "no_aplica"
    EN_EVALUACION  = "en_evaluacion"

class TipoAuditoriaGRCEnum(str, enum.Enum):
    INTERNA      = "interna"
    EXTERNA      = "externa"
    FINANCIERA   = "financiera"
    OPERATIVA    = "operativa"
    TECNOLOGICA  = "tecnologica"
    REGULATORIA  = "regulatoria"
    CUMPLIMIENTO = "cumplimiento"

class EstadoAuditoriaGRCEnum(str, enum.Enum):
    PLANIFICADA   = "planificada"
    EN_EJECUCION  = "en_ejecucion"
    EN_REVISION   = "en_revision"
    COMPLETADA    = "completada"
    CANCELADA     = "cancelada"

class SeveridadGRCEnum(str, enum.Enum):
    BAJA    = "baja"
    MEDIA   = "media"
    ALTA    = "alta"
    CRITICA = "critica"

class EstadoHallazgoGRCEnum(str, enum.Enum):
    ABIERTO        = "abierto"
    EN_REMEDIACION = "en_remediacion"
    VERIFICACION   = "verificacion"
    CERRADO        = "cerrado"
    VENCIDO        = "vencido"

class TipoTerceroGRCEnum(str, enum.Enum):
    PROVEEDOR   = "proveedor"
    CLIENTE     = "cliente"
    CONTRATISTA = "contratista"
    ALIADO      = "aliado"


# ────────────────────────────────────────────
# Modelos — orden FK-safe
# ────────────────────────────────────────────

class GRCComite(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_comite'
    id           = Column(Integer, primary_key=True)
    nombre       = Column(String(200), nullable=False)
    tipo         = Column(String(100))
    presidente   = Column(String(200))
    secretario   = Column(String(200))
    periodicidad = Column(String(50))
    descripcion  = Column(Text)
    activo       = Column(Boolean, default=True)
    riesgos      = relationship('GRCRiesgo', back_populates='comite')


class GRCPolitica(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_politica'
    id                     = Column(Integer, primary_key=True)
    codigo                 = Column(String(30), unique=True)
    nombre                 = Column(String(300), nullable=False)
    tipo                   = Column(String(100))
    version                = Column(String(20), default='1.0')
    estado                 = Column(Enum(EstadoPoliticaGRCEnum), default=EstadoPoliticaGRCEnum.BORRADOR)
    propietario            = Column(String(200))
    aprobador              = Column(String(200))
    fecha_aprobacion       = Column(Date)
    fecha_vigencia         = Column(Date)
    fecha_revision         = Column(Date)
    alcance                = Column(Text)
    dms_documento_id       = Column(Integer)
    aceptaciones_requeridas = Column(Boolean, default=False)
    aceptaciones_count     = Column(Integer, default=0)


class GRCObligacion(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_obligacion'
    id                  = Column(Integer, primary_key=True)
    codigo              = Column(String(30), unique=True)
    nombre              = Column(String(300), nullable=False)
    tipo                = Column(Enum(TipoObligacionGRCEnum))
    pais                = Column(String(100), default='Colombia')
    industria           = Column(String(200))
    area                = Column(String(200))
    descripcion         = Column(Text)
    fuente              = Column(String(300))
    fecha_vigencia      = Column(Date)
    fecha_vencimiento   = Column(Date)
    responsable         = Column(String(200))
    estado_cumplimiento = Column(Enum(EstadoCumplimientoGRCEnum), default=EstadoCumplimientoGRCEnum.EN_EVALUACION)
    cumplimientos       = relationship('GRCMatrizCumplimiento', back_populates='obligacion')


class GRCControl(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_control'
    id                  = Column(Integer, primary_key=True)
    codigo              = Column(String(30), unique=True)
    nombre              = Column(String(300), nullable=False)
    tipo                = Column(Enum(TipoControlGRCEnum))
    descripcion         = Column(Text)
    proceso             = Column(String(200))
    area                = Column(String(200))
    responsable         = Column(String(200))
    frecuencia          = Column(String(100))
    efectividad         = Column(Enum(EfectividadControlGRCEnum), default=EfectividadControlGRCEnum.NO_PROBADO)
    ultima_evaluacion   = Column(Date)
    proxima_evaluacion  = Column(Date)
    automatizado        = Column(Boolean, default=False)
    activo              = Column(Boolean, default=True)


class GRCRiesgo(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_riesgo'
    id                      = Column(Integer, primary_key=True)
    codigo                  = Column(String(30), unique=True)
    nombre                  = Column(String(300), nullable=False)
    descripcion             = Column(Text)
    tipo                    = Column(Enum(TipoRiesgoGRCEnum))
    proceso                 = Column(String(200))
    area                    = Column(String(200))
    responsable             = Column(String(200))
    probabilidad_inherente  = Column(Integer)
    impacto_inherente       = Column(Integer)
    nivel_inherente         = Column(Integer)
    probabilidad_residual   = Column(Integer)
    impacto_residual        = Column(Integer)
    nivel_residual          = Column(Integer)
    prioridad               = Column(Enum(PrioridadRiesgoGRCEnum))
    estado                  = Column(Enum(EstadoRiesgoGRCEnum), default=EstadoRiesgoGRCEnum.IDENTIFICADO)
    tratamiento             = Column(Enum(TratamientoRiesgoGRCEnum))
    apetito_riesgo          = Column(String(50))
    comite_id               = Column(Integer, ForeignKey('grc_comite.id'))
    comite                  = relationship('GRCComite', back_populates='riesgos')
    controles               = relationship('GRCRiesgoControl', back_populates='riesgo')
    tratamientos            = relationship('GRCTratamiento', back_populates='riesgo')


class GRCRiesgoControl(Base, TimestampMixin):
    __tablename__ = 'grc_riesgo_control'
    id                      = Column(Integer, primary_key=True)
    riesgo_id               = Column(Integer, ForeignKey('grc_riesgo.id'), nullable=False)
    control_id              = Column(Integer, ForeignKey('grc_control.id'), nullable=False)
    efectividad_sobre_riesgo = Column(Integer)
    observaciones           = Column(Text)
    riesgo                  = relationship('GRCRiesgo', back_populates='controles')
    control                 = relationship('GRCControl')


class GRCTratamiento(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_tratamiento'
    id             = Column(Integer, primary_key=True)
    riesgo_id      = Column(Integer, ForeignKey('grc_riesgo.id'), nullable=False)
    tipo           = Column(Enum(TratamientoRiesgoGRCEnum))
    descripcion    = Column(Text)
    responsable    = Column(String(200))
    fecha_objetivo = Column(Date)
    estado         = Column(String(50), default='pendiente')
    avance         = Column(Integer, default=0)
    evidencia_url  = Column(Text)
    riesgo         = relationship('GRCRiesgo', back_populates='tratamientos')


class GRCMatrizCumplimiento(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_matriz_cumplimiento'
    id                 = Column(Integer, primary_key=True)
    obligacion_id      = Column(Integer, ForeignKey('grc_obligacion.id'), nullable=False)
    proceso            = Column(String(200))
    area               = Column(String(200))
    responsable        = Column(String(200))
    estado             = Column(Enum(EstadoCumplimientoGRCEnum), default=EstadoCumplimientoGRCEnum.EN_EVALUACION)
    puntaje            = Column(Integer)
    ultima_evaluacion  = Column(Date)
    proxima_evaluacion = Column(Date)
    evidencias         = Column(Text)
    observaciones      = Column(Text)
    obligacion         = relationship('GRCObligacion', back_populates='cumplimientos')


class GRCEvidencia(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_evidencia'
    id                = Column(Integer, primary_key=True)
    nombre            = Column(String(300), nullable=False)
    tipo              = Column(String(100))
    descripcion       = Column(Text)
    url               = Column(Text)
    dms_documento_id  = Column(Integer)
    fecha_emision     = Column(Date)
    fecha_vencimiento = Column(Date)
    responsable       = Column(String(200))
    referencia_tipo   = Column(String(100))
    referencia_id     = Column(Integer)
    activa            = Column(Boolean, default=True)


class GRCAuditoria(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_auditoria'
    id             = Column(Integer, primary_key=True)
    codigo         = Column(String(30), unique=True)
    nombre         = Column(String(300), nullable=False)
    tipo           = Column(Enum(TipoAuditoriaGRCEnum))
    estado         = Column(Enum(EstadoAuditoriaGRCEnum), default=EstadoAuditoriaGRCEnum.PLANIFICADA)
    auditor_lider  = Column(String(200))
    equipo_auditor = Column(Text)
    auditado       = Column(String(300))
    fecha_inicio   = Column(Date)
    fecha_fin      = Column(Date)
    fecha_reporte  = Column(Date)
    alcance        = Column(Text)
    criterios      = Column(Text)
    presupuesto    = Column(Numeric(15, 2))
    observaciones  = Column(Text)
    hallazgos      = relationship('GRCHallazgo', back_populates='auditoria')


class GRCHallazgo(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_hallazgo'
    id            = Column(Integer, primary_key=True)
    codigo        = Column(String(30), unique=True)
    auditoria_id  = Column(Integer, ForeignKey('grc_auditoria.id'))
    titulo        = Column(String(300), nullable=False)
    descripcion   = Column(Text)
    tipo          = Column(String(100))
    severidad     = Column(Enum(SeveridadGRCEnum))
    proceso       = Column(String(200))
    area          = Column(String(200))
    responsable   = Column(String(200))
    fecha_limite  = Column(Date)
    estado        = Column(Enum(EstadoHallazgoGRCEnum), default=EstadoHallazgoGRCEnum.ABIERTO)
    riesgo_asociado = Column(Text)
    impacto       = Column(Text)
    recomendacion = Column(Text)
    auditoria     = relationship('GRCAuditoria', back_populates='hallazgos')
    planes        = relationship('GRCPlanAccion', back_populates='hallazgo')


class GRCPlanAccion(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_plan_accion'
    id             = Column(Integer, primary_key=True)
    hallazgo_id    = Column(Integer, ForeignKey('grc_hallazgo.id'), nullable=False)
    accion         = Column(Text, nullable=False)
    responsable    = Column(String(200))
    fecha_objetivo = Column(Date)
    estado         = Column(String(50), default='pendiente')
    avance         = Column(Integer, default=0)
    evidencia      = Column(Text)
    observaciones  = Column(Text)
    hallazgo       = relationship('GRCHallazgo', back_populates='planes')


class GRCIncidente(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_incidente'
    id                  = Column(Integer, primary_key=True)
    codigo              = Column(String(30), unique=True)
    titulo              = Column(String(300), nullable=False)
    tipo                = Column(String(100))
    descripcion         = Column(Text)
    severidad           = Column(Enum(SeveridadGRCEnum))
    impacto             = Column(Text)
    urgencia            = Column(String(50))
    proceso             = Column(String(200))
    area                = Column(String(200))
    reportado_por       = Column(String(200))
    responsable         = Column(String(200))
    fecha_ocurrencia    = Column(DateTime)
    fecha_cierre        = Column(DateTime)
    estado              = Column(String(50), default='abierto')
    causa_raiz          = Column(Text)
    acciones_tomadas    = Column(Text)
    lecciones_aprendidas = Column(Text)


class GRCContinuidad(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_continuidad'
    id                      = Column(Integer, primary_key=True)
    proceso                 = Column(String(300), nullable=False)
    criticidad              = Column(String(50))
    rto_horas               = Column(Integer)
    rpo_horas               = Column(Integer)
    impacto_financiero_hora = Column(Numeric(15, 2))
    impacto_operativo       = Column(Text)
    sistemas_criticos       = Column(Text)
    dependencias            = Column(Text)
    responsable             = Column(String(200))
    plan_contingencia       = Column(Text)
    estado_plan             = Column(String(50), default='activo')
    ultima_revision         = Column(Date)
    simulacros              = relationship('GRCSimulacro', back_populates='continuidad')


class GRCSimulacro(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_simulacro'
    id             = Column(Integer, primary_key=True)
    continuidad_id = Column(Integer, ForeignKey('grc_continuidad.id'))
    nombre         = Column(String(300))
    fecha          = Column(Date)
    tipo           = Column(String(100))
    resultado      = Column(String(50))
    participantes  = Column(Integer)
    observaciones  = Column(Text)
    lecciones      = Column(Text)
    continuidad    = relationship('GRCContinuidad', back_populates='simulacros')


class GRCTercero(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_tercero'
    id           = Column(Integer, primary_key=True)
    nombre       = Column(String(300), nullable=False)
    nit          = Column(String(50))
    tipo         = Column(Enum(TipoTerceroGRCEnum))
    pais         = Column(String(100), default='Colombia')
    sector       = Column(String(200))
    contacto     = Column(String(200))
    nivel_riesgo = Column(String(50))
    estado       = Column(String(50), default='activo')
    evaluaciones = relationship('GRCEvaluacionTercero', back_populates='tercero')


class GRCEvaluacionTercero(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'grc_evaluacion_tercero'
    id                  = Column(Integer, primary_key=True)
    tercero_id          = Column(Integer, ForeignKey('grc_tercero.id'), nullable=False)
    periodo             = Column(String(20))
    cumplimiento_legal  = Column(Integer)
    riesgo_reputacional = Column(Integer)
    solidez_financiera  = Column(Integer)
    seguridad_info      = Column(Integer)
    puntaje_total       = Column(Numeric(5, 2))
    clasificacion       = Column(String(50))
    evaluador           = Column(String(200))
    observaciones       = Column(Text)
    tercero             = relationship('GRCTercero', back_populates='evaluaciones')


class GRCKPIDiario(Base, TimestampMixin):
    __tablename__ = 'grc_kpi_diario'
    id                      = Column(Integer, primary_key=True)
    fecha                   = Column(Date, nullable=False)
    riesgos_abiertos        = Column(Integer, default=0)
    riesgos_criticos        = Column(Integer, default=0)
    controles_efectivos_pct = Column(Numeric(5, 2))
    cumplimiento_general_pct = Column(Numeric(5, 2))
    obligaciones_vencidas   = Column(Integer, default=0)
    hallazgos_abiertos      = Column(Integer, default=0)
    auditorias_en_curso     = Column(Integer, default=0)
    incidentes_abiertos     = Column(Integer, default=0)
    terceros_criticos       = Column(Integer, default=0)
    politicas_vencidas      = Column(Integer, default=0)
