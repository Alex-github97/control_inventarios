"""
Registro de las rutas de la API, módulo por módulo.

Cada archivo de endpoints se importa SOLO si su módulo está cargado en este
servidor (`MODULOS_SERVIDOR`, ver core/modulos_servidor.py). Importarlos todos
costaba ~330 MB por proceso en servidores que solo atienden un módulo.

EL ORDEN IMPORTA: cuando dos rutas chocan, gana la primera registrada (por eso
`gestion` va antes que `gestion_incidencias`, o `erp` antes que `erp_contable`).
La tabla conserva el orden en que se registraban antes de este cambio.

`None` en la clave = no se vende aparte: acceso, consola, landing, soporte,
gestión interna y TittanBot van en todos los servidores.
"""
import importlib

from fastapi import APIRouter

from app.core.modulos_servidor import cargado

# (archivo en endpoints/, atributo del router, clave del módulo)
RUTAS = (
    ("erp", "router", "erp"),
    # El núcleo contable cuelga del mismo prefijo /erp: desde fuera es el mismo módulo.
    ("erp_contable", "router", "erp"),
    ("erp_gestion", "router", "erp"),
    ("auth", "router", None),
    ("movil", "router", "eam"),
    # Consola del operador: administra OTRAS empresas, no la propia.
    ("plataforma", "router", None),
    ("plataforma_comercial", "router", None),
    ("plataforma_contable", "router", None),
    ("plataforma_equipo", "router", None),
    # Contenido de la página pública. Su lectura no exige sesión.
    ("landing", "router", None),
    # Gestión de Activos (antes CMMS): catálogos, tablero, checklists, combustible…
    ("eam_importar", "router", "eam"),
    ("eam_config", "router", "eam"),
    ("eam_dashboard", "router", "eam"),
    ("checklists", "router", "eam"),
    ("checklists_ejecucion", "router", "eam"),
    ("combustible", "router", "eam"),
    ("inventario", "router", "eam"),
    ("eam_confiabilidad", "router", "eam"),
    ("eam_analitica", "router", "eam"),
    ("eam_garantias_apoyo", "router", "eam"),
    ("mes_analitica", "router", "mes"),
    ("qms_analitica", "router", "qms"),
    ("grc_analitica", "router", "grc"),
    ("eam_reportes", "router", "eam"),
    ("eam_neumaticos_informes", "router", "eam"),
    ("eam_neumaticos_tableros", "router", "eam"),
    ("eam_neumaticos_disposicion", "router", "eam"),
    ("eam_lite", "router", "eam"),
    ("eam_neumaticos_proyeccion", "router", "eam"),
    ("eam_mensajeria", "router", "eam"),
    ("eam_neumaticos_sugerencias", "router", "eam"),
    ("eam_adjuntos", "router", "eam"),
    ("eam_causa_raiz", "router", "eam"),
    # Mesa de ayuda y tablero del equipo.
    ("soporte", "router", None),
    ("soporte_agil", "router", None),
    # Gestión de proyectos: `gestion` antes que `gestion_incidencias` (ambos en /gestion).
    ("gestion", "router", None),
    ("gestion_incidencias", "router", None),
    ("gestion_consultas", "router", None),
    ("gestion_agil", "router", None),
    ("gestion_pizarras", "router", None),
    ("gestion_config", "router", None),
    ("gestion_formulario", "router", None),
    ("roles", "router", None),
    ("usuarios", "router", None),
    ("estibas", "router", "control"),
    ("ubicaciones", "router", "control"),
    ("proveedores", "router", None),
    ("vehiculos", "router", "eam"),
    ("manifiestos", "router", "control"),
    ("movimientos", "router", "control"),
    ("dashboard", "router", "control"),
    ("alertas", "router", None),
    ("danos", "router", "control"),
    ("tarifax", "router", "tarifax"),
    ("tarifax_comparativo", "router", "tarifax"),
    ("mantenimiento", "router", "eam"),
    ("consultas", "router", "control"),
    ("fletes", "router", "tms"),
    ("flota", "router", "eam"),
    ("locative", "router", "locativa"),
    ("wms", "router", "wms"),
    ("wms_trazable", "router", "wms"),
    ("wms_cubicaje", "router", "wms"),
    ("wms_indicadores", "router", "wms"),
    ("wms_sugerencias", "router", "wms"),
    ("wms_maquila", "router", "wms"),
    ("wms_mapa", "router", "wms"),
    ("wms_traslados", "router", "wms"),
    # Tareas dirigidas: frentes de picking, reabastecimiento y asignación.
    ("wms_operacion_tareas", "router", "wms"),
    ("wms_portal", "router", "wms"),
    ("hcm", "router", "gh"),
    ("tms", "router", "tms"),
    ("dms", "router", "dms"),
    ("qms", "router", "qms"),
    ("grc", "router", "grc"),
    ("grc_relaciones", "router", "grc"),
    ("grc_config", "router", "grc"),
    ("pos", "router", "pos"),
    ("erp_facturacion", "router", "erp"),
    ("lms", "router", "lms"),
    ("lms_aprendizaje", "router", "lms"),
    ("crm", "router", "crm"),
    ("crm_reuniones", "router", "crm"),
    ("eam", "router", "eam"),
    ("mes", "router", "mes"),
    ("mes_flujo", "router", "mes"),
    ("mes_planta", "router", "mes"),
    ("aps", "router", "aps"),
    ("scan_sessions", "router", "control"),
    ("scm", "router", "scm"),
    ("sst", "router", "sst"),
    # Lubricación cuelga de /eam/lube: es una capa de Gestión de Activos.
    ("lubricacion", "router", "eam"),
    ("lubricacion_gestion", "router", "eam"),
    ("lubricacion_operacion", "router", "eam"),
    ("lubricacion_analitica", "router", "eam"),
    ("lubricacion_interpretacion", "router", "eam"),
    ("lubricacion_flota", "router", "eam"),
    ("lubricacion_importar", "router", "eam"),
    ("lubricacion_informes", "router", "eam"),
    ("tittanbot", "router", None),
    ("ags", "router", "ags"),
    ("catalogos", "router", None),
    # Planta de reencauche: la carcasa como unidad de trabajo, sobre el WMS y el TMS.
    ("reencauche", "router", "reencauche"),
    ("reencauche_operacion", "router", "reencauche"),
    ("reencauche_despachos", "router", "reencauche"),
    ("reencauche_consultas", "router", "reencauche"),
    # Las recogidas de llantas pendientes, vistas desde la planificación del TMS.
    ("reencauche_despachos", "router_tms", "reencauche"),
)

api_router = APIRouter()

for _archivo, _atributo, _modulo in RUTAS:
    if cargado(_modulo):
        _m = importlib.import_module(f"app.api.v1.endpoints.{_archivo}")
        api_router.include_router(getattr(_m, _atributo))
