"""
Checklists e inspecciones — modelo de datos.

Reemplaza a `eam_checklist_*`, que era un esqueleto de cuatro tablas sin forma
de responder nada: no existía endpoint de respuestas, la foto era una sola URL
por pregunta y la sección era un texto suelto que no se podía ordenar ni
ponderar. Aquellas tablas quedaron vacías en local y en producción, así que no
hay nada que migrar.

Sigue la misma lógica del módulo de llantas: catálogos que se configuran antes
de operar, jerarquía real, y un registro histórico que no se deforma cuando
alguien edita la configuración.

LAS TRES DECISIONES QUE SOSTIENEN EL MODELO

1. ALCANCE POR JERARQUÍA, NO POR ACTIVO
   Igual que los planes de mantenimiento: una plantilla declara tipo → marca →
   línea y cubre a todo activo que encaje. Una inspección preoperacional de
   tractocamión se escribe una vez, no una por cada placa.

2. LA PLANTILLA SE VERSIONA
   Una inspección firmada hace seis meses tiene que seguir significando lo
   mismo hoy. Si alguien agrega una pregunta o cambia un peso, la plantilla
   sube de versión y las ejecuciones viejas conservan la suya. Sin esto, editar
   una plantilla reescribiría la historia — y esa historia es justamente lo que
   se le muestra a un auditor.

3. LAS FOTOS SON VARIAS Y VIVEN APARTE
   Antes era un `foto_url` por respuesta. Una llanta con daño necesita la foto
   general, la del detalle y la del número de serie. Tabla propia, y la ruta en
   disco lleva el esquema del cliente adentro por la misma razón que los
   adjuntos de las órdenes: dos empresas pueden tener la ejecución número 5.
"""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, UniqueConstraint, Index, JSON,
)
from app.infrastructure.models.base import Base, TimestampMixin


# ══════════════════════════════════════════════════════════════════════════════
# CATÁLOGOS
# ══════════════════════════════════════════════════════════════════════════════

class ChkCategoria(Base, TimestampMixin):
    """Para qué sirve la plantilla: preoperacional, seguridad, entrega, calidad.

    Agrupa los informes del tablero. Sin esto, veinte plantillas son una lista
    plana y no se puede responder «cómo vamos en seguridad».
    """
    __tablename__ = "eam_chk_categoria"
    __table_args__ = (UniqueConstraint("nombre", name="uq_eam_chk_categoria_nombre"),)
    id          = Column(Integer, primary_key=True, index=True)
    codigo      = Column(String(40), nullable=True)
    nombre      = Column(String(120), nullable=False)
    descripcion = Column(String(300), nullable=True)
    color       = Column(String(9), nullable=True)
    activo      = Column(Boolean, default=True, nullable=False)


class ChkHallazgo(Base, TimestampMixin):
    """Catálogo de hallazgos tipificados. Espeja el catálogo de daños de llantas.

    Es lo que permite pasar de «hubo 40 no conformidades» a «la fuga de aceite
    aparece en 12 equipos de la misma línea». Un texto libre no agrupa.
    """
    __tablename__ = "eam_chk_hallazgo"
    __table_args__ = (UniqueConstraint("codigo", name="uq_eam_chk_hallazgo_codigo"),)
    id          = Column(Integer, primary_key=True, index=True)
    codigo      = Column(String(40), nullable=False)
    nombre      = Column(String(200), nullable=False)
    categoria   = Column(String(40), nullable=True)   # MECANICO, SEGURIDAD, DOCUMENTAL…
    # LEVE | MODERADO | GRAVE — GRAVE es el que puede detener el equipo.
    severidad   = Column(String(20), default="MODERADO", nullable=False)
    descripcion = Column(String(400), nullable=True)
    accion_sugerida = Column(String(300), nullable=True)
    # Si al marcarlo debe abrirse una orden de trabajo automáticamente.
    genera_ot   = Column(Boolean, default=False, nullable=False)
    activo      = Column(Boolean, default=True, nullable=False)


# ══════════════════════════════════════════════════════════════════════════════
# PLANTILLA
# ══════════════════════════════════════════════════════════════════════════════

class ChkPlantilla(Base, TimestampMixin):
    """La definición de una inspección.

    El alcance se declara por jerarquía —tipo, marca, línea— y cualquiera de los
    tres puede quedar vacío para significar «todos». `activo_id` existe para la
    inspección que aplica a un solo equipo.
    """
    __tablename__ = "eam_chk_plantilla"
    __table_args__ = (UniqueConstraint("codigo", name="uq_eam_chk_plantilla_codigo"),)
    id           = Column(Integer, primary_key=True, index=True)
    codigo       = Column(String(40), nullable=False)
    nombre       = Column(String(200), nullable=False)
    categoria_id = Column(Integer, ForeignKey("eam_chk_categoria.id"), nullable=True)
    descripcion  = Column(Text, nullable=True)

    # Alcance por jerarquía. Vacío = aplica a todos los de ese nivel.
    tipo_activo  = Column(String(50), nullable=True)
    marca        = Column(String(100), nullable=True)
    linea        = Column(String(100), nullable=True)
    activo_id    = Column(Integer, ForeignKey("eam_activo.id"), nullable=True)

    # Sube sola cuando se toca la estructura. Las ejecuciones guardan la suya.
    version      = Column(Integer, default=1, nullable=False)

    # Cada cuántos días toca repetirla. Vacío = se hace cuando se necesite.
    periodicidad_dias = Column(Integer, nullable=True)

    requiere_firma = Column(Boolean, default=False, nullable=False)
    # Porcentaje de conformidad mínimo para dar por aprobada la inspección.
    umbral_aprobacion = Column(Float, default=100, nullable=False)
    # Un ítem crítico no conforme reprueba la inspección completa, sin importar
    # el porcentaje: en una preoperacional, unos frenos malos no se compensan
    # con veinte respuestas buenas.
    critico_reprueba = Column(Boolean, default=True, nullable=False)
    # Abrir orden de trabajo automáticamente al encontrar no conformidades.
    genera_ot = Column(Boolean, default=False, nullable=False)

    # Pedir la lectura del equipo al ejecutar: es lo que enlaza la inspección
    # con el mantenimiento por kilometraje.
    pide_medidor = Column(Boolean, default=False, nullable=False)

    activo = Column(Boolean, default=True, nullable=False)


class ChkSeccion(Base, TimestampMixin):
    """Bloque ordenado dentro de una plantilla: «Motor», «Luces», «Documentos».

    Antes era un texto en cada pregunta, así que no se podía reordenar ni saber
    qué sección concentra los problemas.
    """
    __tablename__ = "eam_chk_seccion"
    id           = Column(Integer, primary_key=True, index=True)
    plantilla_id = Column(Integer, ForeignKey("eam_chk_plantilla.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    orden        = Column(Integer, default=0, nullable=False)
    nombre       = Column(String(150), nullable=False)
    descripcion  = Column(String(300), nullable=True)
    activo       = Column(Boolean, default=True, nullable=False)


class ChkItem(Base, TimestampMixin):
    """Una pregunta de la inspección.

    Nunca se borra de verdad: se desactiva. Una respuesta histórica apunta acá,
    y borrar el ítem dejaría inspecciones firmadas con respuestas sin pregunta.
    """
    __tablename__ = "eam_chk_item"
    __table_args__ = (Index("ix_eam_chk_item_seccion_orden", "seccion_id", "orden"),)
    id          = Column(Integer, primary_key=True, index=True)
    plantilla_id = Column(Integer, ForeignKey("eam_chk_plantilla.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    seccion_id  = Column(Integer, ForeignKey("eam_chk_seccion.id", ondelete="CASCADE"),
                         nullable=True, index=True)
    orden       = Column(Integer, default=0, nullable=False)
    pregunta    = Column(String(400), nullable=False)
    ayuda       = Column(String(400), nullable=True)

    # CONFORME_NO | SI_NO | TEXTO | NUMERO | OPCIONES | FECHA | RANGO
    tipo        = Column(String(20), default="CONFORME_NO", nullable=False)
    opciones    = Column(JSON, nullable=True)      # para OPCIONES
    unidad      = Column(String(20), nullable=True)  # para NUMERO
    # Fuera de este rango la respuesta numérica se marca no conforme sola.
    valor_min   = Column(Float, nullable=True)
    valor_max   = Column(Float, nullable=True)

    obligatorio = Column(Boolean, default=True, nullable=False)
    critico     = Column(Boolean, default=False, nullable=False)
    requiere_foto = Column(Boolean, default=False, nullable=False)
    # Si al responder «no conforme» hay que explicar por qué. Sin esto, una
    # inspección se llena de rojos sin contexto que nadie puede accionar.
    exige_observacion_no_conforme = Column(Boolean, default=True, nullable=False)
    # Peso relativo al calcular el porcentaje de conformidad.
    peso        = Column(Float, default=1, nullable=False)
    activo      = Column(Boolean, default=True, nullable=False)


# ══════════════════════════════════════════════════════════════════════════════
# EJECUCIÓN
# ══════════════════════════════════════════════════════════════════════════════

class ChkEjecucion(Base, TimestampMixin):
    """Una inspección realizada sobre un activo."""
    __tablename__ = "eam_chk_ejecucion"
    __table_args__ = (
        UniqueConstraint("numero", name="uq_eam_chk_ejecucion_numero"),
        Index("ix_eam_chk_ejecucion_activo_fecha", "activo_id", "fecha_inicio"),
    )
    id           = Column(Integer, primary_key=True, index=True)
    numero       = Column(String(40), nullable=False)
    plantilla_id = Column(Integer, ForeignKey("eam_chk_plantilla.id"), nullable=False, index=True)
    # La versión con la que se llenó. Es lo que permite editar la plantilla sin
    # reescribir el pasado.
    plantilla_version = Column(Integer, default=1, nullable=False)
    activo_id    = Column(Integer, ForeignKey("eam_activo.id"), nullable=False, index=True)
    ot_id        = Column(Integer, ForeignKey("eam_orden_trabajo.id"), nullable=True)

    ejecutado_por = Column(String(120), nullable=True)
    fecha_inicio  = Column(DateTime, nullable=False)
    fecha_fin     = Column(DateTime, nullable=True)

    # BORRADOR | COMPLETADA | ANULADA
    estado    = Column(String(20), default="BORRADOR", nullable=False)
    # APROBADO | APROBADO_CON_OBSERVACIONES | RECHAZADO | PENDIENTE
    resultado = Column(String(30), default="PENDIENTE", nullable=False)

    pct_conforme  = Column(Float, nullable=True)
    total_items   = Column(Integer, default=0)
    no_conformes  = Column(Integer, default=0)
    criticos_no_conformes = Column(Integer, default=0)

    odometro   = Column(Float, nullable=True)
    horometro  = Column(Float, nullable=True)
    ubicacion  = Column(String(200), nullable=True)
    latitud    = Column(Float, nullable=True)
    longitud   = Column(Float, nullable=True)

    observaciones = Column(Text, nullable=True)
    firma_nombre  = Column(String(150), nullable=True)
    firma_archivo = Column(String(400), nullable=True)
    firma_fecha   = Column(DateTime, nullable=True)


class ChkRespuesta(Base, TimestampMixin):
    """La respuesta a un ítem dentro de una ejecución."""
    __tablename__ = "eam_chk_respuesta"
    __table_args__ = (
        UniqueConstraint("ejecucion_id", "item_id", name="uq_eam_chk_respuesta"),
    )
    id           = Column(Integer, primary_key=True, index=True)
    ejecucion_id = Column(Integer, ForeignKey("eam_chk_ejecucion.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    item_id      = Column(Integer, ForeignKey("eam_chk_item.id"), nullable=False)

    # El valor se guarda en la columna que corresponda al tipo del ítem; así una
    # respuesta numérica se puede promediar y una de texto se puede buscar.
    valor_texto  = Column(Text, nullable=True)
    valor_numero = Column(Float, nullable=True)
    valor_bool   = Column(Boolean, nullable=True)

    conforme     = Column(Boolean, nullable=True)
    observacion  = Column(Text, nullable=True)
    hallazgo_id  = Column(Integer, ForeignKey("eam_chk_hallazgo.id"), nullable=True)
    # No aplica: el equipo no tiene ese componente. Se excluye del porcentaje en
    # vez de contar como no conforme, que sería castigar al equipo por no tener
    # algo que nunca debió tener.
    no_aplica    = Column(Boolean, default=False, nullable=False)


class ChkFoto(Base, TimestampMixin):
    """Evidencia fotográfica. Varias por respuesta, o de la ejecución completa.

    La ruta lleva el esquema del cliente adentro: dos empresas pueden tener la
    ejecución número 5, y sin eso la segunda pisaría el archivo de la primera.
    """
    __tablename__ = "eam_chk_foto"
    id           = Column(Integer, primary_key=True, index=True)
    ejecucion_id = Column(Integer, ForeignKey("eam_chk_ejecucion.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    # Vacío = foto general de la inspección, no de una pregunta concreta.
    respuesta_id = Column(Integer, ForeignKey("eam_chk_respuesta.id", ondelete="CASCADE"),
                          nullable=True, index=True)
    archivo   = Column(String(500), nullable=False)
    nombre    = Column(String(200), nullable=True)
    tipo_mime = Column(String(100), nullable=True)
    tamano    = Column(Integer, nullable=True)
    nota      = Column(String(300), nullable=True)
    subido_por = Column(String(120), nullable=True)


class ChkProgramacion(Base, TimestampMixin):
    """Cuándo le toca la próxima inspección a cada activo.

    Vive por activo y no en la plantilla, igual que en los planes de
    mantenimiento: cada equipo lleva su propia fecha.
    """
    __tablename__ = "eam_chk_programacion"
    __table_args__ = (
        UniqueConstraint("plantilla_id", "activo_id", name="uq_eam_chk_programacion"),
    )
    id           = Column(Integer, primary_key=True, index=True)
    plantilla_id = Column(Integer, ForeignKey("eam_chk_plantilla.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    activo_id    = Column(Integer, ForeignKey("eam_activo.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    ultima_fecha = Column(DateTime, nullable=True)
    # Se conserva aunque se borre la ejecución: la inspección se hizo, aunque el
    # papel ya no esté.
    ultima_ejecucion_id = Column(
        Integer, ForeignKey("eam_chk_ejecucion.id", ondelete="SET NULL"), nullable=True)
    proxima_fecha = Column(DateTime, nullable=True)
    activo        = Column(Boolean, default=True, nullable=False)
