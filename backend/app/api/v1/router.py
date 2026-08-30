from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, usuarios, estibas, ubicaciones, proveedores,
    vehiculos, manifiestos, movimientos, dashboard, alertas, danos, tarifax, mantenimiento, consultas, roles, fletes, flota, locative, wms, hcm, tms, dms, qms, grc, lms, crm, eam, mes, aps, erp, scan_sessions, scm, sst, lubricacion, lubricacion_gestion, lubricacion_operacion, lubricacion_analitica, ags, catalogos, plataforma, plataforma_comercial, plataforma_contable, eam_importar, eam_config, eam_dashboard, checklists, checklists_ejecucion, eam_adjuntos, eam_causa_raiz, soporte, soporte_agil, plataforma_equipo, landing
)

api_router = APIRouter()

api_router.include_router(erp.router)
api_router.include_router(auth.router)
# Consola del operador: administra OTRAS empresas, no la propia.
api_router.include_router(plataforma.router)
api_router.include_router(plataforma_comercial.router)
api_router.include_router(plataforma_contable.router)
# El equipo de la consola y sus roles.
api_router.include_router(plataforma_equipo.router)
# Contenido de la pagina publica. Su lectura no exige sesion.
api_router.include_router(landing.router)
# Cargue masivo de los catalogos del CMMS.
api_router.include_router(eam_importar.router)
# Centros de costo y tipos de trabajo: eran maqueta, ahora persisten.
api_router.include_router(eam_config.router)
api_router.include_router(eam_dashboard.router)
# Checklists: /eam/chk, otra capa del CMMS.
api_router.include_router(checklists.router)
api_router.include_router(checklists_ejecucion.router)
# Documentos de las ordenes de trabajo.
api_router.include_router(eam_adjuntos.router)
# Analisis de causa raiz: informe, PDF y analitica del dashboard.
api_router.include_router(eam_causa_raiz.router)
# Mesa de ayuda: el cliente escribe, soporte responde desde la consola.
api_router.include_router(soporte.router)
# Tablero, backlog, sprints y metricas: solo para el equipo.
api_router.include_router(soporte_agil.router)
api_router.include_router(roles.router)
api_router.include_router(usuarios.router)
api_router.include_router(estibas.router)
api_router.include_router(ubicaciones.router)
api_router.include_router(proveedores.router)
api_router.include_router(vehiculos.router)
api_router.include_router(manifiestos.router)
api_router.include_router(movimientos.router)
api_router.include_router(dashboard.router)
api_router.include_router(alertas.router)
api_router.include_router(danos.router)
api_router.include_router(tarifax.router)
api_router.include_router(mantenimiento.router)
api_router.include_router(consultas.router)
api_router.include_router(fletes.router)
api_router.include_router(flota.router)
api_router.include_router(locative.router)
api_router.include_router(wms.router)
api_router.include_router(hcm.router)
api_router.include_router(tms.router)
api_router.include_router(dms.router)
api_router.include_router(qms.router)
api_router.include_router(grc.router)
api_router.include_router(lms.router)
api_router.include_router(crm.router)
api_router.include_router(eam.router)
api_router.include_router(mes.router)
api_router.include_router(aps.router)
api_router.include_router(scan_sessions.router)
api_router.include_router(scm.router)
api_router.include_router(sst.router)
api_router.include_router(lubricacion.router)
# Lubricación cuelga de /eam/lube: es una capa del CMMS, no un módulo aparte,
# así que el control de acceso por módulo la trata como parte de EAM.
api_router.include_router(lubricacion_gestion.router)
api_router.include_router(lubricacion_operacion.router)
api_router.include_router(lubricacion_analitica.router)
api_router.include_router(ags.router)
api_router.include_router(catalogos.router)
