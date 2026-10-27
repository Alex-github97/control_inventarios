"""
Asistente de reuniones del CRM: la reunión, quién estuvo, qué se dijo y qué
se comprometió.

Los compromisos nuestros, al aprobarse, se vuelven `crm_actividad` (la tarea
que el CRM ya sabe seguir); aquí solo queda el enlace. La cola de trabajos vive
en la base y no en Redis ni en memoria: en producción corren varios procesos y
cualquiera puede morir a mitad de un trabajo.
"""
import sqlalchemy as sa

from app.infrastructure.models.base import Base, TimestampMixin

# Estados de la reunión (spec crm/captura-reuniones).
PROGRAMADA, EN_CURSO, PROCESANDO, POR_REVISAR, CERRADA, FALLIDA = (
    "PROGRAMADA", "EN_CURSO", "PROCESANDO", "POR_REVISAR", "CERRADA", "FALLIDA")
ESTADOS_REUNION = (PROGRAMADA, EN_CURSO, PROCESANDO, POR_REVISAR, CERRADA, FALLIDA)
ORIGENES = ("PRESENCIAL", "VIRTUAL")


class CRMReunion(Base, TimestampMixin):
    __tablename__ = "crm_reunion"
    id             = sa.Column(sa.Integer, primary_key=True, index=True)
    cliente_id     = sa.Column(sa.Integer, sa.ForeignKey("crm_cliente.id"), nullable=False, index=True)
    oportunidad_id = sa.Column(sa.Integer, sa.ForeignKey("crm_oportunidad.id"), nullable=True)
    titulo         = sa.Column(sa.String(200), nullable=False)
    origen         = sa.Column(sa.String(12), nullable=False)          # PRESENCIAL | VIRTUAL
    plataforma     = sa.Column(sa.String(20), nullable=True)           # MEET | TEAMS | ZOOM
    enlace         = sa.Column(sa.String(500), nullable=True)
    fecha          = sa.Column(sa.DateTime(timezone=True), nullable=False)
    estado         = sa.Column(sa.String(12), nullable=False, default=PROGRAMADA, index=True)
    motivo_falla   = sa.Column(sa.String(300), nullable=True)
    # Qué produjo el audio: grabador_web, carga_archivo, vexa… (design D1).
    fuente_captura = sa.Column(sa.String(30), nullable=True)
    creada_por_id  = sa.Column(sa.Integer, sa.ForeignKey("usuarios.id"), nullable=True)

    # Constancia del aviso de grabación (Ley 1581): sin ella no se graba.
    aviso_texto        = sa.Column(sa.Text, nullable=True)
    aviso_confirmado_por_id = sa.Column(sa.Integer, sa.ForeignKey("usuarios.id"), nullable=True)
    aviso_confirmado_en     = sa.Column(sa.DateTime(timezone=True), nullable=True)

    # El audio: se borra al vencer la retención; la transcripción se queda.
    audio_ruta        = sa.Column(sa.String(400), nullable=True)
    audio_duracion_s  = sa.Column(sa.Integer, nullable=True)
    audio_borrado_en  = sa.Column(sa.DateTime(timezone=True), nullable=True)
    audio_borrado_por_id = sa.Column(sa.Integer, sa.ForeignKey("usuarios.id"), nullable=True)
    # Partes recibidas del grabador web, para saber si la secuencia está completa.
    partes_recibidas  = sa.Column(sa.Integer, nullable=False, default=0)

    resumen        = sa.Column(sa.Text, nullable=True)
    interaccion_id = sa.Column(sa.Integer, sa.ForeignKey("crm_interaccion.id"), nullable=True)
    cerrada_en     = sa.Column(sa.DateTime(timezone=True), nullable=True)


class CRMReunionParticipante(Base, TimestampMixin):
    __tablename__ = "crm_reunion_participante"
    id          = sa.Column(sa.Integer, primary_key=True, index=True)
    reunion_id  = sa.Column(sa.Integer, sa.ForeignKey("crm_reunion.id", ondelete="CASCADE"), nullable=False, index=True)
    # Uno de los dos, o ninguno si la captura trajo un nombre que no se pudo
    # emparejar (un invitado del cliente que no está en el CRM).
    contacto_id = sa.Column(sa.Integer, sa.ForeignKey("crm_contacto.id"), nullable=True)
    usuario_id  = sa.Column(sa.Integer, sa.ForeignKey("usuarios.id"), nullable=True)
    nombre      = sa.Column(sa.String(160), nullable=False)
    # El nombre con que apareció en la captura (el de la pantalla de Meet…).
    nombre_captura = sa.Column(sa.String(160), nullable=True)


class CRMReunionTramo(Base, TimestampMixin):
    __tablename__ = "crm_reunion_tramo"
    id              = sa.Column(sa.Integer, primary_key=True, index=True)
    reunion_id      = sa.Column(sa.Integer, sa.ForeignKey("crm_reunion.id", ondelete="CASCADE"), nullable=False, index=True)
    orden           = sa.Column(sa.Integer, nullable=False)
    inicio_s        = sa.Column(sa.Float, nullable=False)
    fin_s           = sa.Column(sa.Float, nullable=False)
    texto           = sa.Column(sa.Text, nullable=False)
    # Si alguien lo corrigió, aquí queda lo que dijo la transcripción.
    texto_original  = sa.Column(sa.Text, nullable=True)
    corregido_por_id = sa.Column(sa.Integer, sa.ForeignKey("usuarios.id"), nullable=True)
    participante_id = sa.Column(sa.Integer, sa.ForeignKey("crm_reunion_participante.id", ondelete="SET NULL"), nullable=True)


class CRMReunionCompromiso(Base, TimestampMixin):
    __tablename__ = "crm_reunion_compromiso"
    id              = sa.Column(sa.Integer, primary_key=True, index=True)
    reunion_id      = sa.Column(sa.Integer, sa.ForeignKey("crm_reunion.id", ondelete="CASCADE"), nullable=False, index=True)
    cliente_id      = sa.Column(sa.Integer, sa.ForeignKey("crm_cliente.id"), nullable=False, index=True)
    tipo            = sa.Column(sa.String(12), nullable=False)          # COMPROMISO | ACUERDO | RIESGO
    lado            = sa.Column(sa.String(10), nullable=True)           # NUESTRO | CLIENTE (solo compromisos)
    descripcion     = sa.Column(sa.Text, nullable=False)
    responsable_nombre = sa.Column(sa.String(160), nullable=True)       # como se dijo
    participante_id = sa.Column(sa.Integer, sa.ForeignKey("crm_reunion_participante.id", ondelete="SET NULL"), nullable=True)
    fecha_limite    = sa.Column(sa.Date, nullable=True)                 # vacía = no definida
    cita            = sa.Column(sa.Text, nullable=False)
    minuto_s        = sa.Column(sa.Float, nullable=True)
    estado          = sa.Column(sa.String(12), nullable=False, default="PROPUESTO", index=True)
    revisado_por_id = sa.Column(sa.Integer, sa.ForeignKey("usuarios.id"), nullable=True)
    revisado_en     = sa.Column(sa.DateTime(timezone=True), nullable=True)
    actividad_id    = sa.Column(sa.Integer, sa.ForeignKey("crm_actividad.id"), nullable=True)
    cumplido_en     = sa.Column(sa.DateTime(timezone=True), nullable=True)


class CRMReunionTrabajo(Base, TimestampMixin):
    """Cola de trabajos de fondo. Se reclama con FOR UPDATE SKIP LOCKED."""
    __tablename__ = "crm_reunion_trabajo"
    # El ciclo busca lo pendiente y vencido; sin este índice recorre la tabla.
    __table_args__ = (sa.Index("ix_crm_reunion_trabajo_cola", "estado", "siguiente_intento"),)
    id              = sa.Column(sa.Integer, primary_key=True, index=True)
    reunion_id       = sa.Column(sa.Integer, sa.ForeignKey("crm_reunion.id", ondelete="CASCADE"), nullable=True, index=True)
    tipo             = sa.Column(sa.String(20), nullable=False)         # TRANSCRIBIR | EXTRAER | SONDEAR_BOT | BORRAR_AUDIO
    estado           = sa.Column(sa.String(12), nullable=False, default="PENDIENTE")  # PENDIENTE | HECHO | FALLIDO
    intentos         = sa.Column(sa.Integer, nullable=False, default=0)
    siguiente_intento = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    ultimo_error     = sa.Column(sa.Text, nullable=True)


class CRMReunionCaptura(Base, TimestampMixin):
    """El bot (u otro proveedor) que graba una reunión virtual (design D1).

    Tabla aparte y no columnas de la reunión: cada proveedor guarda aquí lo
    suyo (sus identificadores, su estado, sus tramos de habla) y el resto del
    CRM no se entera de cuál fue.
    """
    __tablename__ = "crm_reunion_captura"
    id               = sa.Column(sa.Integer, primary_key=True, index=True)
    reunion_id       = sa.Column(sa.Integer, sa.ForeignKey("crm_reunion.id", ondelete="CASCADE"), nullable=False, index=True)
    proveedor        = sa.Column(sa.String(20), nullable=False)          # vexa | recall | …
    plataforma       = sa.Column(sa.String(20), nullable=False)          # MEET | TEAMS | ZOOM
    id_externo       = sa.Column(sa.String(300), nullable=False)         # el id de la reunión para el proveedor
    datos            = sa.Column(sa.JSON, nullable=True)                 # lo demás que el proveedor necesite
    estado_proveedor = sa.Column(sa.String(40), nullable=True)           # tal como lo dice el proveedor
    detalle          = sa.Column(sa.String(500), nullable=True)
    # Quién habló y cuándo, como lo entregó la captura: [{nombre, inicio_s, fin_s}].
    segmentos        = sa.Column(sa.JSON, nullable=True)
    terminada_en     = sa.Column(sa.DateTime(timezone=True), nullable=True)


class CRMReunionConfig(Base, TimestampMixin):
    """Una sola fila por empresa: texto del aviso, retención y tope mensual."""
    __tablename__ = "crm_reunion_config"
    id                   = sa.Column(sa.Integer, primary_key=True)
    aviso_texto          = sa.Column(sa.Text, nullable=False, default=(
        "Esta reunión será grabada y transcrita para registrar los acuerdos en nuestro CRM. "
        "El audio se conserva por un tiempo limitado y luego se borra."))
    retencion_audio_dias = sa.Column(sa.Integer, nullable=False, default=90)
    tope_minutos_mes     = sa.Column(sa.Integer, nullable=True)       # vacío = sin tope
