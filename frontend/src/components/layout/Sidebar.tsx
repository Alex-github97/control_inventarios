import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Tooltip, alpha,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  ViewModule as EstibasIcon,
  LocalShipping as VehiculosIcon,
  Assignment as ManifiestosIcon,
  LocationOn as UbicacionesIcon,
  Business as ProveedoresIcon,
  SwapHoriz as MovimientosIcon,
  Timeline as TrazabilidadIcon,
  NotificationsActive as AlertasIcon,
  BrokenImage as DanosIcon,
  People as UsuariosIcon,
  Build as MantenimientoIcon,
  AttachMoney as CostosIcon,
  Storage as ConsultasIcon,
  AdminPanelSettings as RolesIcon,
  Route as FletesDespachoIcon,
  CorporateFare as FletesGeneradoresIcon,
  DirectionsBus as FletesConductoresIcon,
  DirectionsCar as FlotaVehiculosIcon,
  LocalGasStation as FlotaCombustibleIcon,
  Description as FlotaDocumentosIcon,
  Construction as FlotaMantenimientoIcon,
  Group as FlotaPersonalIcon,
  Settings as FlotaConfigIcon,
  AccountTree as FlotaRutinasIcon,
  Shield as FlotaConfiabilidadIcon,
  ChevronLeft, ChevronRight,
  BarChart as TableroIcon,
  MergeType as MotorIcon,
  Monitor as TMSDashIconTMS,
  CalendarMonth as TMSPlaneacionIconTMS,
  AirportShuttle as TMSViajesIconTMS,
  Output as TMSDespachosIconTMS,
  GpsFixed as TMSTrackingIconTMS,
  Commute as TMSVehiculosIconTMS,
  RecentActors as TMSConductoresIconTMS,
  CenterFocusStrong as TMSTorreIconTMS,
  ForkRight as TMSRutasIconTMS,
  FilePresent as TMSDocumentosIconTMS,
  Savings as TMSCostosIconTMS,
  Speed as TMSOTIFIconTMS,
  AccountBalance as TMSLiquidacionesIconTMS,
  DisplaySettings as TMSConfigIconTMS,
  Inventory2 as LocativaActivosIcon,
  Handyman as LocativaOTMLIcon,
  ReportProblem as LocativaRiesgoMLIcon,
  Bolt as LocativaEnergiaMLIcon,
  Tune as LocativaConfigMLIcon,
  Warehouse as WMSDashboardIcon,
  MoveToInbox as WMSInboundIcon,
  Inventory as WMSInventoryIcon,
  ContentPasteSearch as WMSPickingIcon,
  Send as WMSDespachoIcon,
  QrCodeScanner as WMSTrazabilidadIcon,
  ManageAccounts as WMSConfigIcon,
  PeopleAlt as GHDashboardIcon,
  Groups as GHColaboradoresIcon,
  DriveEta as GHConductoresIcon,
  Payments as GHNominaIcon,
  MedicalServices as GHIncapIcon,
  BeachAccess as GHVacacionesIcon,
  PersonSearch as GHReclutIcon,
  Assessment as GHEvalIcon,
  School as GHCapacitIcon,
  HealthAndSafety as GHSSTIcon,
  HowToReg as GHConfigIcon,
  FolderSpecial as DMSDashIconDMS,
  FolderOpen as DMSRepositorioIconDMS,
  Article as DMSDocumentosIconDMS,
  Category as DMSCategoriasIconDMS,
  FolderShared as DMSExpedientesIconDMS,
  Rule as DMSWorkflowIconDMS,
  Draw as DMSFirmasIconDMS,
  ManageSearch as DMSBusquedaIconDMS,
  Archive as DMSRetencionIconDMS,
  Policy as DMSAuditoriaIconDMS,
  Hub as DMSIntegracionesIconDMS,
  Psychology as DMSIAIconDMS,
  Public as DMSPortalIconDMS,
  SettingsApplications as DMSConfigIconDMS,
  WorkspacePremium as QMSDashIconQMS,
  DeviceHub as QMSProcesosIconQMS,
  Analytics as QMSIndicadoresIconQMS,
  BugReport as QMSNCIconQMS,
  FactCheck as QMSAuditoriasIconQMS,
  FindInPage as QMSHallazgosIconQMS,
  Dangerous as QMSRiesgosIconQMS,
  SupportAgent as QMSQuejasIconQMS,
  Storefront as QMSProveedoresIconQMS,
  TrendingUp as QMSMejoraIconQMS,
  Poll as QMSEncuestasIconQMS,
  ChangeCircle as QMSCambiosIconQMS,
  AutoFixHigh as QMSIAIconQMS,
  SettingsSuggest as QMSConfigIconQMS,
  GppGood as GRCDashIconGRC,
  AccountTree as GRCGobiernoIconGRC,
  Policy as GRCPoliticasIconGRC,
  Gavel as GRCObligacionesIconGRC,
  Warning as GRCRiesgosIconGRC,
  Shield as GRCControlesIconGRC,
  CheckCircle as GRCCumplimientoIconGRC,
  Business as GRCTercerosIconGRC,
  FindInPage as GRCAuditoriasIconGRC,
  BugReport as GRCHallazgosIconGRC,
  Router as GRCContinuidadIconGRC,
  Security as GRCIncidentesIconGRC,
  AutoAwesome as GRCIAIconGRC,
  ManageSearch as GRCConfigIconGRC,
  School as LMSUniversidadIcon,
  MenuBook as LMSCatalogoIcon,
  PlayCircle as LMSMiAprendizajeIcon,
  AccountTree as LMSRutasIcon,
  PersonAdd as LMSOnboardingIcon,
  Psychology as LMSCompetenciasIcon,
  WorkspacePremium as LMSCertificacionesIcon,
  Quiz as LMSEvaluacionesIcon,
  Lightbulb as LMSBancoIcon,
  LibraryBooks as LMSKnowledgeIcon,
  EmojiEvents as LMSGamificacionIcon,
  AutoAwesome as LMSIAIcon,
  Assessment as LMSReportesIcon,
  Settings as LMSConfigIcon,
  TrendingUp as CRMDashIconCRM,
  People as CRMClientesIconCRM,
  Whatshot as CRMLeadsIconCRM,
  Receipt as CRMCotizacionesIconCRM,
  Handshake as CRMContratosIconCRM,
  SupportAgent as CRMTicketsIconCRM,
  Hub as CRMInteraccionesIconCRM,
  Campaign as CRMCampanasIconCRM,
  StarRate as CRMEncuestasIconCRM,
  VpnKey as CRMCuentasIconCRM,
  AttachMoney as CRMRentabilidadIconCRM,
  AutoAwesome as CRMIAIconCRM,
  Assessment as CRMReportesIconCRM,
  Settings as CRMConfigIconCRM,
  Engineering as EAMDashIconEAM,
  AccountTree as EAMActivosIconEAM,
  Assignment as EAMOTIconEAM,
  EventRepeat as EAMPlanesIconEAM,
  PlaylistAddCheck as EAMChecklistIconEAM,
  Science as EAMLubricacionIconEAM,
  TireRepair as EAMNeumaticosIconEAM,
  LocalGasStation as EAMCombustibleIconEAM,
  Inventory as EAMInventarioIconEAM,
  ShowChart as EAMConfiabilidadIconEAM,
  VerifiedUser as EAMGarantiasIconEAM,
  PrecisionManufacturing as EAMIAIconEAM,
  BarChart as EAMReportesIconEAM,
  Tune as EAMConfigIconEAM,
  Factory as MESDashIconMES,
  DeviceHub as MESPlantaIconMES,
  ListAlt as MESOrdenesIconMES,
  CalendarViewMonth as MESProgramacionIconMES,
  PlayCircle as MESEjecucionIconMES,
  Timeline as MESTrazabilidadIconMES,
  Verified as MESCalidadIconMES,
  Recycling as MESScrapIconMES,
  Speed as MESOEEIconMES,
  Inventory2 as MESInventarioIconMES,
  MenuBook as MESBOMIconMES,
  AutoAwesome as MESIAIconMES,
  Assessment as MESReportesIconMES,
  SettingsSuggest as MESConfigIconMES,
  ScatterPlot as APSDashIconAPS,
  Leaderboard as APSDemandaIconAPS,
  SyncAlt as APSSOIPIconAPS,
  EventNote as APSPlanIconAPS,
  StackedBarChart as APSCapacidadIconAPS,
  AllInclusive as APSInventarioIconAPS,
  CallSplit as APSDistribucionIconAPS,
  LegendToggle as APSTransporteIconAPS,
  Explore as APSEscenariosIconAPS,
  Lock as APSRestricionesIconAPS,
  QueryStats as APSKPIsIconAPS,
  Insights as APSIAIconAPS,
  InsertChart as APSReportesIconAPS,
  Biotech as APSConfigIconAPS,
} from '@mui/icons-material'
import { COMMAND_CENTER_DASHBOARDS } from '@/config/commandCenter'

const DRAWER_WIDTH      = 252
const DRAWER_COLLAPSED  = 68
const COMPACT_THRESHOLD = 140
const CI_COLOR  = '#32AC5C'
const TX_COLOR  = '#369E4D'
const CF_COLOR  = '#6366F1'
const CC_COLOR  = '#0EA5E9'
const FT_COLOR  = '#F59E0B'
const GF_COLOR  = '#7C3AED'
const ML_COLOR  = '#0D9488'
const WMS_COLOR = '#1E40AF'
const GH_COLOR  = '#BE185D'
const TMS_COLOR = '#0369A1'
const DMS_COLOR = '#0E7490'
const QMS_COLOR = '#059669'
const GRC_COLOR = '#6D28D9'
const LMS_COLOR = '#D97706'
const CRM_COLOR = '#DC2626'
const EAM_COLOR = '#EA580C'
const MES_COLOR = '#0891B2'
const APS_COLOR = '#7C3AED'

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
  section?: string
  exact?: boolean
}

const CI_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     icon: <DashboardIcon     fontSize="small" />, path: '/dashboard',     section: 'Principal' },
  { label: 'Estibas',       icon: <EstibasIcon       fontSize="small" />, path: '/estibas',       section: 'Principal' },
  { label: 'Movimientos',   icon: <MovimientosIcon   fontSize="small" />, path: '/movimientos',   section: 'Operaciones' },
  { label: 'Trazabilidad',  icon: <TrazabilidadIcon  fontSize="small" />, path: '/trazabilidad',  section: 'Operaciones' },
  { label: 'Manifiestos',   icon: <ManifiestosIcon   fontSize="small" />, path: '/manifiestos',   section: 'Operaciones' },
  { label: 'Mantenimiento', icon: <MantenimientoIcon fontSize="small" />, path: '/mantenimiento', section: 'Operaciones' },
  { label: 'Vehículos',     icon: <VehiculosIcon     fontSize="small" />, path: '/vehiculos',     section: 'Recursos' },
  { label: 'Ubicaciones',   icon: <UbicacionesIcon   fontSize="small" />, path: '/ubicaciones',   section: 'Recursos' },
  { label: 'Proveedores',   icon: <ProveedoresIcon   fontSize="small" />, path: '/proveedores',   section: 'Recursos' },
  { label: 'Daños',         icon: <DanosIcon         fontSize="small" />, path: '/danos',         section: 'Control' },
  { label: 'Alertas',       icon: <AlertasIcon       fontSize="small" />, path: '/alertas',       section: 'Control' },
  { label: 'Costos',        icon: <CostosIcon        fontSize="small" />, path: '/costos',        section: 'Control' },
  { label: 'Consultas',     icon: <ConsultasIcon     fontSize="small" />, path: '/consultas',     section: 'Control' },
]

const TX_NAV_ITEMS: NavItem[] = [
  { label: 'Tablero',       icon: <TableroIcon fontSize="small" />, path: '/tarifax/tablero', section: 'TarifaX' },
  { label: 'Motor TarifaX', icon: <MotorIcon   fontSize="small" />, path: '/tarifax/motor',   section: 'TarifaX' },
]

const FT_NAV_ITEMS: NavItem[] = [
  { label: 'Despacho de Viajes',    icon: <FletesDespachoIcon    fontSize="small" />, path: '/fletes',              section: 'Despacho', exact: true },
  { label: 'Generadores de Carga',  icon: <FletesGeneradoresIcon fontSize="small" />, path: '/fletes/generadores',  section: 'Catálogos' },
  { label: 'Conductores',           icon: <FletesConductoresIcon fontSize="small" />, path: '/fletes/conductores',  section: 'Catálogos' },
]

const GF_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',         icon: <TableroIcon          fontSize="small" />, path: '/flota',               section: 'General',         exact: true },
  { label: 'Vehículos',         icon: <FlotaVehiculosIcon   fontSize="small" />, path: '/flota/vehiculos',     section: 'Flota' },
  { label: 'Combustible',       icon: <FlotaCombustibleIcon fontSize="small" />, path: '/flota/combustible',   section: 'Flota' },
  { label: 'Documentos',        icon: <FlotaDocumentosIcon  fontSize="small" />, path: '/flota/documentos',    section: 'Flota' },
  { label: 'Personal',          icon: <FlotaPersonalIcon    fontSize="small" />, path: '/flota/personal',      section: 'Personal' },
  { label: 'Órdenes de Trabajo',    icon: <FlotaMantenimientoIcon    fontSize="small" />, path: '/flota/mantenimiento',    section: 'Mantenimiento' },
  { label: 'Programas de Mto.',     icon: <FlotaRutinasIcon          fontSize="small" />, path: '/flota/rutinas',          section: 'Mantenimiento' },
  { label: 'Confiabilidad',         icon: <FlotaConfiabilidadIcon    fontSize="small" />, path: '/flota/confiabilidad',    section: 'Confiabilidad' },
  { label: 'Configuración',         icon: <FlotaConfigIcon           fontSize="small" />, path: '/flota/config',           section: 'Sistema' },
]
const GF_SECTIONS = ['General', 'Flota', 'Personal', 'Mantenimiento', 'Confiabilidad', 'Sistema']

const ML_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',         icon: <TableroIcon            fontSize="small" />, path: '/locativa',            section: 'General',       exact: true },
  { label: 'Activos',           icon: <LocativaActivosIcon    fontSize="small" />, path: '/locativa/activos',    section: 'Gestión' },
  { label: 'Órdenes de Trabajo',icon: <LocativaOTMLIcon       fontSize="small" />, path: '/locativa/ordenes',    section: 'Gestión' },
  { label: 'Riesgos',           icon: <LocativaRiesgoMLIcon   fontSize="small" />, path: '/locativa/riesgos',    section: 'Control' },
  { label: 'Energía',           icon: <LocativaEnergiaMLIcon  fontSize="small" />, path: '/locativa/energia',    section: 'Control' },
  { label: 'Configuración',     icon: <LocativaConfigMLIcon   fontSize="small" />, path: '/locativa/config',     section: 'Sistema' },
]
const ML_SECTIONS = ['General', 'Gestión', 'Control', 'Sistema']

const WMS_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      icon: <WMSDashboardIcon    fontSize="small" />, path: '/wms',                 section: 'General',       exact: true },
  { label: 'Recepción',      icon: <WMSInboundIcon      fontSize="small" />, path: '/wms/recepcion',       section: 'Inbound' },
  { label: 'Inventario',     icon: <WMSInventoryIcon    fontSize="small" />, path: '/wms/inventario',      section: 'Almacenamiento' },
  { label: 'Picking',        icon: <WMSPickingIcon      fontSize="small" />, path: '/wms/picking',         section: 'Outbound' },
  { label: 'Despacho',       icon: <WMSDespachoIcon     fontSize="small" />, path: '/wms/despacho',        section: 'Outbound' },
  { label: 'Trazabilidad',   icon: <WMSTrazabilidadIcon fontSize="small" />, path: '/wms/trazabilidad',    section: 'Control' },
  { label: 'Configuración',  icon: <WMSConfigIcon       fontSize="small" />, path: '/wms/config',          section: 'Sistema' },
]
const WMS_SECTIONS = ['General', 'Inbound', 'Almacenamiento', 'Outbound', 'Control', 'Sistema']

const GH_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     icon: <GHDashboardIcon     fontSize="small" />, path: '/gh',               section: 'General',       exact: true },
  { label: 'Colaboradores', icon: <GHColaboradoresIcon fontSize="small" />, path: '/gh/colaboradores', section: 'Personas' },
  { label: 'Conductores',   icon: <GHConductoresIcon   fontSize="small" />, path: '/gh/conductores',   section: 'Personas' },
  { label: 'Nómina',        icon: <GHNominaIcon        fontSize="small" />, path: '/gh/nomina',        section: 'Nómina' },
  { label: 'Incapacidades', icon: <GHIncapIcon         fontSize="small" />, path: '/gh/incapacidades', section: 'Nómina' },
  { label: 'Vacaciones',    icon: <GHVacacionesIcon    fontSize="small" />, path: '/gh/vacaciones',    section: 'Nómina' },
  { label: 'Reclutamiento', icon: <GHReclutIcon        fontSize="small" />, path: '/gh/reclutamiento', section: 'Reclutamiento' },
  { label: 'Evaluación',    icon: <GHEvalIcon          fontSize="small" />, path: '/gh/evaluacion',    section: 'Desarrollo' },
  { label: 'Capacitación',  icon: <GHCapacitIcon       fontSize="small" />, path: '/gh/capacitacion',  section: 'Desarrollo' },
  { label: 'SST',           icon: <GHSSTIcon           fontSize="small" />, path: '/gh/sst',           section: 'SST' },
  { label: 'Configuración', icon: <GHConfigIcon        fontSize="small" />, path: '/gh/config',        section: 'Sistema' },
]
const GH_SECTIONS = ['General', 'Personas', 'Nómina', 'Reclutamiento', 'Desarrollo', 'SST', 'Sistema']

const TMS_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',        icon: <TMSDashIconTMS        fontSize="small" />, path: '/tms',               section: 'General',    exact: true },
  { label: 'Viajes',           icon: <TMSViajesIconTMS      fontSize="small" />, path: '/tms/viajes',        section: 'Operación' },
  { label: 'Planeación',       icon: <TMSPlaneacionIconTMS  fontSize="small" />, path: '/tms/planeacion',    section: 'Operación' },
  { label: 'Despachos',        icon: <TMSDespachosIconTMS   fontSize="small" />, path: '/tms/despachos',     section: 'Operación' },
  { label: 'Tracking',         icon: <TMSTrackingIconTMS    fontSize="small" />, path: '/tms/tracking',      section: 'Operación' },
  { label: 'Vehículos',        icon: <TMSVehiculosIconTMS   fontSize="small" />, path: '/tms/vehiculos',     section: 'Recursos' },
  { label: 'Conductores',      icon: <TMSConductoresIconTMS fontSize="small" />, path: '/tms/conductores',   section: 'Recursos' },
  { label: 'Rutas',            icon: <TMSRutasIconTMS       fontSize="small" />, path: '/tms/rutas',         section: 'Logística' },
  { label: 'Torre de Control', icon: <TMSTorreIconTMS       fontSize="small" />, path: '/tms/torre-control', section: 'Logística' },
  { label: 'Costos',           icon: <TMSCostosIconTMS      fontSize="small" />, path: '/tms/costos',        section: 'Financiero' },
  { label: 'OTIF',             icon: <TMSOTIFIconTMS        fontSize="small" />, path: '/tms/otif',          section: 'Financiero' },
  { label: 'Liquidaciones',    icon: <TMSLiquidacionesIconTMS fontSize="small" />, path: '/tms/liquidaciones', section: 'Financiero' },
  { label: 'Despacho Fletes',  icon: <FletesDespachoIcon    fontSize="small" />, path: '/fletes',            section: 'Fletes',    exact: true },
  { label: 'Generadores',      icon: <FletesGeneradoresIcon fontSize="small" />, path: '/fletes/generadores',section: 'Fletes' },
  { label: 'Cond. Fletes',     icon: <FletesConductoresIcon fontSize="small" />, path: '/fletes/conductores',section: 'Fletes' },
  { label: 'Documentos',       icon: <TMSDocumentosIconTMS  fontSize="small" />, path: '/tms/documentos',    section: 'Sistema' },
  { label: 'Configuración',    icon: <TMSConfigIconTMS      fontSize="small" />, path: '/tms/config',        section: 'Sistema' },
]
const TMS_SECTIONS = ['General', 'Operación', 'Recursos', 'Logística', 'Financiero', 'Fletes', 'Sistema']

const DMS_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      icon: <DMSDashIconDMS          fontSize="small" />, path: '/dms',               section: 'General',       exact: true },
  { label: 'Repositorio',    icon: <DMSRepositorioIconDMS   fontSize="small" />, path: '/dms/repositorio',   section: 'Repositorio' },
  { label: 'Documentos',     icon: <DMSDocumentosIconDMS    fontSize="small" />, path: '/dms/documentos',    section: 'Repositorio' },
  { label: 'Categorías',     icon: <DMSCategoriasIconDMS    fontSize="small" />, path: '/dms/categorias',    section: 'Clasificación' },
  { label: 'Expedientes',    icon: <DMSExpedientesIconDMS   fontSize="small" />, path: '/dms/expedientes',   section: 'Clasificación' },
  { label: 'Workflows',      icon: <DMSWorkflowIconDMS      fontSize="small" />, path: '/dms/workflow',      section: 'Flujos' },
  { label: 'Firmas',         icon: <DMSFirmasIconDMS        fontSize="small" />, path: '/dms/firmas',        section: 'Flujos' },
  { label: 'Búsqueda',       icon: <DMSBusquedaIconDMS      fontSize="small" />, path: '/dms/busqueda',      section: 'Búsqueda' },
  { label: 'Retención',      icon: <DMSRetencionIconDMS     fontSize="small" />, path: '/dms/retencion',     section: 'Cumplimiento' },
  { label: 'Auditoría',      icon: <DMSAuditoriaIconDMS     fontSize="small" />, path: '/dms/auditoria',     section: 'Cumplimiento' },
  { label: 'Integraciones',  icon: <DMSIntegracionesIconDMS fontSize="small" />, path: '/dms/integraciones', section: 'Inteligencia' },
  { label: 'IA Documental',  icon: <DMSIAIconDMS            fontSize="small" />, path: '/dms/ia',            section: 'Inteligencia' },
  { label: 'Portal',         icon: <DMSPortalIconDMS        fontSize="small" />, path: '/dms/portal',        section: 'Portal' },
  { label: 'Configuración',  icon: <DMSConfigIconDMS        fontSize="small" />, path: '/dms/config',        section: 'Sistema' },
]
const DMS_SECTIONS = ['General', 'Repositorio', 'Clasificación', 'Flujos', 'Búsqueda', 'Cumplimiento', 'Inteligencia', 'Portal', 'Sistema']

const QMS_NAV_ITEMS: NavItem[] = [
  { label: 'Torre de Control',  icon: <QMSDashIconQMS         fontSize="small" />, path: '/qms',                  section: 'General',        exact: true },
  { label: 'Procesos',          icon: <QMSProcesosIconQMS     fontSize="small" />, path: '/qms/procesos',         section: 'Procesos' },
  { label: 'Indicadores',       icon: <QMSIndicadoresIconQMS  fontSize="small" />, path: '/qms/indicadores',      section: 'Procesos' },
  { label: 'No Conformidades',  icon: <QMSNCIconQMS           fontSize="small" />, path: '/qms/no-conformidades', section: 'Calidad' },
  { label: 'Auditorías',        icon: <QMSAuditoriasIconQMS   fontSize="small" />, path: '/qms/auditorias',       section: 'Calidad' },
  { label: 'Hallazgos',         icon: <QMSHallazgosIconQMS    fontSize="small" />, path: '/qms/hallazgos',        section: 'Calidad' },
  { label: 'Riesgos',           icon: <QMSRiesgosIconQMS      fontSize="small" />, path: '/qms/riesgos',          section: 'Operacional' },
  { label: 'Cambios',           icon: <QMSCambiosIconQMS      fontSize="small" />, path: '/qms/cambios',          section: 'Operacional' },
  { label: 'Quejas y Reclamos', icon: <QMSQuejasIconQMS       fontSize="small" />, path: '/qms/quejas',           section: 'Operacional' },
  { label: 'Proveedores',       icon: <QMSProveedoresIconQMS  fontSize="small" />, path: '/qms/proveedores',      section: 'Relacionamiento' },
  { label: 'Encuestas',         icon: <QMSEncuestasIconQMS    fontSize="small" />, path: '/qms/encuestas',        section: 'Relacionamiento' },
  { label: 'Mejora Continua',   icon: <QMSMejoraIconQMS       fontSize="small" />, path: '/qms/mejora',           section: 'Mejora' },
  { label: 'IA Calidad',        icon: <QMSIAIconQMS           fontSize="small" />, path: '/qms/ia',               section: 'Mejora' },
  { label: 'Configuración',     icon: <QMSConfigIconQMS       fontSize="small" />, path: '/qms/config',           section: 'Sistema' },
]
const QMS_SECTIONS = ['General', 'Procesos', 'Calidad', 'Operacional', 'Relacionamiento', 'Mejora', 'Sistema']

const GRC_NAV_ITEMS: NavItem[] = [
  { label: 'Torre de Control',  icon: <GRCDashIconGRC          fontSize="small" />, path: '/grc',                section: 'General',       exact: true },
  { label: 'Gobierno',          icon: <GRCGobiernoIconGRC      fontSize="small" />, path: '/grc/gobierno',       section: 'Gobierno' },
  { label: 'Políticas',         icon: <GRCPoliticasIconGRC     fontSize="small" />, path: '/grc/politicas',      section: 'Gobierno' },
  { label: 'Obligaciones',      icon: <GRCObligacionesIconGRC  fontSize="small" />, path: '/grc/obligaciones',   section: 'Cumplimiento' },
  { label: 'Cumplimiento',      icon: <GRCCumplimientoIconGRC  fontSize="small" />, path: '/grc/cumplimiento',   section: 'Cumplimiento' },
  { label: 'Riesgos',           icon: <GRCRiesgosIconGRC       fontSize="small" />, path: '/grc/riesgos',        section: 'Riesgos' },
  { label: 'Controles',         icon: <GRCControlesIconGRC     fontSize="small" />, path: '/grc/controles',      section: 'Riesgos' },
  { label: 'Terceros',          icon: <GRCTercerosIconGRC      fontSize="small" />, path: '/grc/terceros',       section: 'Riesgos' },
  { label: 'Auditorías',        icon: <GRCAuditoriasIconGRC    fontSize="small" />, path: '/grc/auditorias',     section: 'Auditoría' },
  { label: 'Hallazgos',         icon: <GRCHallazgosIconGRC     fontSize="small" />, path: '/grc/hallazgos',      section: 'Auditoría' },
  { label: 'Continuidad',       icon: <GRCContinuidadIconGRC   fontSize="small" />, path: '/grc/continuidad',    section: 'Continuidad' },
  { label: 'Incidentes',        icon: <GRCIncidentesIconGRC    fontSize="small" />, path: '/grc/incidentes',     section: 'Continuidad' },
  { label: 'IA GRC',            icon: <GRCIAIconGRC            fontSize="small" />, path: '/grc/ia',             section: 'Inteligencia' },
  { label: 'Configuración',     icon: <GRCConfigIconGRC        fontSize="small" />, path: '/grc/config',         section: 'Sistema' },
]
const GRC_SECTIONS = ['General', 'Gobierno', 'Cumplimiento', 'Riesgos', 'Auditoría', 'Continuidad', 'Inteligencia', 'Sistema']

const LMS_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',       icon: <LMSReportesIcon      fontSize="small" />, path: '/lms',                section: 'General',    exact: true },
  { label: 'Mi Aprendizaje',  icon: <LMSMiAprendizajeIcon fontSize="small" />, path: '/lms/mi-aprendizaje', section: 'General' },
  { label: 'Universidad',     icon: <LMSUniversidadIcon   fontSize="small" />, path: '/lms/universidad',    section: 'Academia' },
  { label: 'Catálogo',        icon: <LMSCatalogoIcon      fontSize="small" />, path: '/lms/catalogo',       section: 'Academia' },
  { label: 'Rutas',           icon: <LMSRutasIcon         fontSize="small" />, path: '/lms/rutas',          section: 'Academia' },
  { label: 'Onboarding',      icon: <LMSOnboardingIcon    fontSize="small" />, path: '/lms/onboarding',     section: 'Talento' },
  { label: 'Competencias',    icon: <LMSCompetenciasIcon  fontSize="small" />, path: '/lms/competencias',   section: 'Talento' },
  { label: 'Evaluaciones',    icon: <LMSEvaluacionesIcon  fontSize="small" />, path: '/lms/evaluaciones',   section: 'Evaluación' },
  { label: 'Banco Preguntas', icon: <LMSBancoIcon         fontSize="small" />, path: '/lms/banco-preguntas',section: 'Evaluación' },
  { label: 'Certificaciones', icon: <LMSCertificacionesIcon fontSize="small" />, path: '/lms/certificaciones', section: 'Evaluación' },
  { label: 'Conocimiento',    icon: <LMSKnowledgeIcon     fontSize="small" />, path: '/lms/conocimiento',   section: 'Conocimiento' },
  { label: 'Gamificación',    icon: <LMSGamificacionIcon  fontSize="small" />, path: '/lms/gamificacion',   section: 'Analítica' },
  { label: 'IA LMS',          icon: <LMSIAIcon            fontSize="small" />, path: '/lms/ia',             section: 'Analítica' },
  { label: 'Reportes',        icon: <LMSReportesIcon      fontSize="small" />, path: '/lms/reportes',       section: 'Analítica' },
  { label: 'Configuración',   icon: <LMSConfigIcon        fontSize="small" />, path: '/lms/config',         section: 'Sistema' },
]
const LMS_SECTIONS = ['General', 'Academia', 'Talento', 'Evaluación', 'Conocimiento', 'Analítica', 'Sistema']

const CRM_NAV_ITEMS: NavItem[] = [
  { label: 'Torre Comercial',  icon: <CRMDashIconCRM         fontSize="small" />, path: '/crm',                section: 'General',    exact: true },
  { label: 'Clientes 360',     icon: <CRMClientesIconCRM     fontSize="small" />, path: '/crm/clientes',       section: 'General' },
  { label: 'Lead Scoring',     icon: <CRMLeadsIconCRM        fontSize="small" />, path: '/crm/leads',          section: 'Comercial' },
  { label: 'Oportunidades',    icon: <CRMDashIconCRM         fontSize="small" />, path: '/crm/oportunidades', section: 'Comercial' },
  { label: 'Cotizaciones',     icon: <CRMCotizacionesIconCRM fontSize="small" />, path: '/crm/cotizaciones',   section: 'Comercial' },
  { label: 'Contratos & SLA',  icon: <CRMContratosIconCRM    fontSize="small" />, path: '/crm/contratos',      section: 'Contratos' },
  { label: 'Cuentas Clave',    icon: <CRMCuentasIconCRM      fontSize="small" />, path: '/crm/cuentas-clave',  section: 'Contratos' },
  { label: 'Tickets PQRS',     icon: <CRMTicketsIconCRM      fontSize="small" />, path: '/crm/tickets',        section: 'Servicio' },
  { label: 'Interacciones',    icon: <CRMInteraccionesIconCRM fontSize="small" />, path: '/crm/interacciones', section: 'Servicio' },
  { label: 'Campañas',         icon: <CRMCampanasIconCRM     fontSize="small" />, path: '/crm/campanas',       section: 'Marketing' },
  { label: 'NPS & Encuestas',  icon: <CRMEncuestasIconCRM    fontSize="small" />, path: '/crm/encuestas',      section: 'Marketing' },
  { label: 'Rentabilidad',     icon: <CRMRentabilidadIconCRM fontSize="small" />, path: '/crm/rentabilidad',   section: 'Analítica' },
  { label: 'IA Comercial',     icon: <CRMIAIconCRM           fontSize="small" />, path: '/crm/ia',             section: 'Analítica' },
  { label: 'Reportes',         icon: <CRMReportesIconCRM     fontSize="small" />, path: '/crm/reportes',       section: 'Analítica' },
  { label: 'Configuración',    icon: <CRMConfigIconCRM       fontSize="small" />, path: '/crm/config',         section: 'Sistema' },
]
const CRM_SECTIONS = ['General', 'Comercial', 'Contratos', 'Servicio', 'Marketing', 'Analítica', 'Sistema']

const EAM_NAV_ITEMS: NavItem[] = [
  { label: 'Torre de Control',  icon: <EAMDashIconEAM          fontSize="small" />, path: '/eam',                 section: 'General',         exact: true },
  { label: 'Activos',           icon: <EAMActivosIconEAM       fontSize="small" />, path: '/eam/activos',         section: 'General' },
  { label: 'Órdenes de Trabajo',icon: <EAMOTIconEAM            fontSize="small" />, path: '/eam/ordenes-trabajo', section: 'Mantenimiento' },
  { label: 'Planes de Mant.',   icon: <EAMPlanesIconEAM        fontSize="small" />, path: '/eam/planes',          section: 'Mantenimiento' },
  { label: 'Checklists',        icon: <EAMChecklistIconEAM     fontSize="small" />, path: '/eam/checklists',      section: 'Mantenimiento' },
  { label: 'Lubricación',       icon: <EAMLubricacionIconEAM   fontSize="small" />, path: '/eam/lubricacion',     section: 'Lubricación' },
  { label: 'Neumáticos',        icon: <EAMNeumaticosIconEAM    fontSize="small" />, path: '/eam/neumaticos',      section: 'Lubricación' },
  { label: 'Combustible',       icon: <EAMCombustibleIconEAM   fontSize="small" />, path: '/eam/combustible',     section: 'Lubricación' },
  { label: 'Inventario',        icon: <EAMInventarioIconEAM    fontSize="small" />, path: '/eam/inventario',      section: 'Inventario' },
  { label: 'Garantías',         icon: <EAMGarantiasIconEAM     fontSize="small" />, path: '/eam/garantias',       section: 'Inventario' },
  { label: 'Confiabilidad',     icon: <EAMConfiabilidadIconEAM fontSize="small" />, path: '/eam/confiabilidad',   section: 'Confiabilidad' },
  { label: 'IA Predictiva',     icon: <EAMIAIconEAM            fontSize="small" />, path: '/eam/ia',              section: 'Inteligencia' },
  { label: 'Reportes',          icon: <EAMReportesIconEAM      fontSize="small" />, path: '/eam/reportes',        section: 'Inteligencia' },
  { label: 'Configuración',     icon: <EAMConfigIconEAM        fontSize="small" />, path: '/eam/config',          section: 'Sistema' },
]
const EAM_SECTIONS = ['General', 'Mantenimiento', 'Lubricación', 'Inventario', 'Confiabilidad', 'Inteligencia', 'Sistema']

const MES_NAV_ITEMS: NavItem[] = [
  { label: 'Torre de Control',  icon: <MESDashIconMES          fontSize="small" />, path: '/mes',                 section: 'General',         exact: true },
  { label: 'Plantas & Líneas',  icon: <MESPlantaIconMES        fontSize="small" />, path: '/mes/planta',          section: 'General' },
  { label: 'Órdenes Producción',icon: <MESOrdenesIconMES       fontSize="small" />, path: '/mes/ordenes',         section: 'Producción' },
  { label: 'Programación APS',  icon: <MESProgramacionIconMES  fontSize="small" />, path: '/mes/programacion',    section: 'Producción' },
  { label: 'Ejecución Planta',  icon: <MESEjecucionIconMES     fontSize="small" />, path: '/mes/ejecucion',       section: 'Producción' },
  { label: 'Trazabilidad',      icon: <MESTrazabilidadIconMES  fontSize="small" />, path: '/mes/trazabilidad',    section: 'Producción' },
  { label: 'Control Calidad',   icon: <MESCalidadIconMES       fontSize="small" />, path: '/mes/calidad',         section: 'Calidad' },
  { label: 'Scrap & Lean',      icon: <MESScrapIconMES         fontSize="small" />, path: '/mes/scrap',           section: 'Calidad' },
  { label: 'OEE',               icon: <MESOEEIconMES           fontSize="small" />, path: '/mes/oee',             section: 'Analítica' },
  { label: 'WIP & Materiales',  icon: <MESInventarioIconMES    fontSize="small" />, path: '/mes/inventario',      section: 'Analítica' },
  { label: 'BOM & Recetas',     icon: <MESBOMIconMES           fontSize="small" />, path: '/mes/bom',             section: 'Ingeniería' },
  { label: 'IA Manufactura',    icon: <MESIAIconMES            fontSize="small" />, path: '/mes/ia',              section: 'Inteligencia' },
  { label: 'Reportes',          icon: <MESReportesIconMES      fontSize="small" />, path: '/mes/reportes',        section: 'Inteligencia' },
  { label: 'Configuración',     icon: <MESConfigIconMES        fontSize="small" />, path: '/mes/config',          section: 'Sistema' },
]
const MES_SECTIONS = ['General', 'Producción', 'Calidad', 'Analítica', 'Ingeniería', 'Inteligencia', 'Sistema']

const APS_NAV_ITEMS: NavItem[] = [
  { label: 'Torre de Control',    icon: <APSDashIconAPS          fontSize="small" />, path: '/aps',                 section: 'General',      exact: true },
  { label: 'Demand Planning',     icon: <APSDemandaIconAPS       fontSize="small" />, path: '/aps/demanda',         section: 'Demanda' },
  { label: 'S&OP / IBP',          icon: <APSSOIPIconAPS          fontSize="small" />, path: '/aps/soip',            section: 'Demanda' },
  { label: 'Plan Maestro MPS',    icon: <APSPlanIconAPS          fontSize="small" />, path: '/aps/plan',            section: 'Supply' },
  { label: 'Capacidad CRP',       icon: <APSCapacidadIconAPS     fontSize="small" />, path: '/aps/capacidad',       section: 'Supply' },
  { label: 'Inventario Multi-E',  icon: <APSInventarioIconAPS    fontSize="small" />, path: '/aps/inventario',      section: 'Supply' },
  { label: 'Distribución DRP',    icon: <APSDistribucionIconAPS  fontSize="small" />, path: '/aps/distribucion',    section: 'Logística' },
  { label: 'Transporte TRP',      icon: <APSTransporteIconAPS    fontSize="small" />, path: '/aps/transporte',      section: 'Logística' },
  { label: 'Simulador What-If',   icon: <APSEscenariosIconAPS    fontSize="small" />, path: '/aps/escenarios',      section: 'Analítica' },
  { label: 'Restricciones',       icon: <APSRestricionesIconAPS  fontSize="small" />, path: '/aps/restricciones',   section: 'Analítica' },
  { label: 'KPIs & Control',      icon: <APSKPIsIconAPS          fontSize="small" />, path: '/aps/kpis',            section: 'Analítica' },
  { label: 'IA Autónoma APS',     icon: <APSIAIconAPS            fontSize="small" />, path: '/aps/ia',              section: 'Inteligencia' },
  { label: 'Reportes',            icon: <APSReportesIconAPS      fontSize="small" />, path: '/aps/reportes',        section: 'Inteligencia' },
  { label: 'Configuración',       icon: <APSConfigIconAPS        fontSize="small" />, path: '/aps/config',          section: 'Sistema' },
]
const APS_SECTIONS = ['General', 'Demanda', 'Supply', 'Logística', 'Analítica', 'Inteligencia', 'Sistema']

const CONFIG_NAV_ITEMS: NavItem[] = [
  { label: 'Usuarios', icon: <UsuariosIcon fontSize="small" />, path: '/usuarios',       section: 'Administración', exact: true },
  { label: 'Roles',    icon: <RolesIcon   fontSize="small" />, path: '/usuarios/roles', section: 'Administración' },
]

const CC_NAV_ITEMS: NavItem[] = COMMAND_CENTER_DASHBOARDS.map(d => ({
  label:   d.shortLabel,
  icon:    d.icon,
  path:    d.path,
  section: 'Dashboards',
  exact:   true,
}))

const CI_SECTIONS     = ['Principal', 'Operaciones', 'Recursos', 'Control']
const TX_SECTIONS     = ['TarifaX']
const FT_SECTIONS     = ['Despacho', 'Catálogos']
const CONFIG_SECTIONS = ['Administración']
const CC_SECTIONS     = ['Dashboards']

interface SidebarProps {
  open: boolean
  onClose: () => void
  width?: number
  dragging?: boolean
}

export function Sidebar({ open, onClose, width: widthProp, dragging }: SidebarProps) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const isGRC      = location.pathname.startsWith('/grc')
  const isQMS      = location.pathname.startsWith('/qms')
  const isDMS      = location.pathname.startsWith('/dms')
  const isTMS      = location.pathname.startsWith('/tms') || location.pathname.startsWith('/fletes')
  const isFletes   = false // absorbed by isTMS
  const isFlota    = location.pathname.startsWith('/flota')
  const isTarifax  = location.pathname.startsWith('/tarifax')
  const isConfig   = location.pathname.startsWith('/usuarios')
  const isCommand  = location.pathname.startsWith('/command-center')
  const isLocativa = location.pathname.startsWith('/locativa')
  const isWMS      = location.pathname.startsWith('/wms')
  const isGH       = location.pathname.startsWith('/gh')
  const isLMS      = location.pathname.startsWith('/lms')
  const isCRM      = location.pathname.startsWith('/crm')
  const isEAM      = location.pathname.startsWith('/eam')
  const isMES      = location.pathname.startsWith('/mes')
  const isAPS      = location.pathname.startsWith('/aps')

  const activeColor = isCommand ? CC_COLOR : isConfig ? CF_COLOR : isTarifax ? TX_COLOR : isGRC ? GRC_COLOR : isQMS ? QMS_COLOR : isDMS ? DMS_COLOR : isTMS ? TMS_COLOR : isFletes ? FT_COLOR : isFlota ? GF_COLOR : isLocativa ? ML_COLOR : isWMS ? WMS_COLOR : isGH ? GH_COLOR : isLMS ? LMS_COLOR : isCRM ? CRM_COLOR : isEAM ? EAM_COLOR : isMES ? MES_COLOR : isAPS ? APS_COLOR : CI_COLOR
  const navItems    = isCommand ? CC_NAV_ITEMS : isConfig ? CONFIG_NAV_ITEMS : isTarifax ? TX_NAV_ITEMS : isGRC ? GRC_NAV_ITEMS : isQMS ? QMS_NAV_ITEMS : isDMS ? DMS_NAV_ITEMS : isTMS ? TMS_NAV_ITEMS : isFletes ? FT_NAV_ITEMS : isFlota ? GF_NAV_ITEMS : isLocativa ? ML_NAV_ITEMS : isWMS ? WMS_NAV_ITEMS : isGH ? GH_NAV_ITEMS : isLMS ? LMS_NAV_ITEMS : isCRM ? CRM_NAV_ITEMS : isEAM ? EAM_NAV_ITEMS : isMES ? MES_NAV_ITEMS : isAPS ? APS_NAV_ITEMS : CI_NAV_ITEMS
  const sections    = isCommand ? CC_SECTIONS  : isConfig ? CONFIG_SECTIONS  : isTarifax ? TX_SECTIONS  : isGRC ? GRC_SECTIONS  : isQMS ? QMS_SECTIONS  : isDMS ? DMS_SECTIONS  : isTMS ? TMS_SECTIONS  : isFletes ? FT_SECTIONS  : isFlota ? GF_SECTIONS  : isLocativa ? ML_SECTIONS  : isWMS ? WMS_SECTIONS : isGH ? GH_SECTIONS : isLMS ? LMS_SECTIONS : isCRM ? CRM_SECTIONS : isEAM ? EAM_SECTIONS : isMES ? MES_SECTIONS : isAPS ? APS_SECTIONS : CI_SECTIONS

  const logoShort = isCommand ? 'CC' : isConfig ? 'CF' : isTarifax ? 'TX' : isGRC ? 'GRC' : isQMS ? 'QMS' : isDMS ? 'DMS' : isTMS ? 'TMS' : isFletes ? 'FT' : isFlota ? 'GF' : isLocativa ? 'ML' : isWMS ? 'WMS' : isGH ? 'GH' : isLMS ? 'LMS' : isCRM ? 'CRM' : isEAM ? 'EAM' : isMES ? 'MES' : isAPS ? 'APS' : 'CE'
  const logoLine1 = isCommand ? 'Command' : isConfig ? 'Configuración' : isTarifax ? 'TarifaX' : isGRC ? 'Governance' : isQMS ? 'Quality' : isDMS ? 'Document' : isTMS ? 'Transportation' : isFletes ? 'Módulo de' : isFlota ? 'Gestión de' : isLocativa ? 'Mantenimiento' : isWMS ? 'Warehouse' : isGH ? 'Gestión' : isLMS ? 'Learning' : isCRM ? 'Customer' : isEAM ? 'CMMS /' : isMES ? 'Manufacturing' : isAPS ? 'Advanced Planning' : 'Control de'
  const logoLine2 = isCommand ? 'Center'  : isConfig ? 'del Sistema'  : isTarifax ? 'Motor de Tarifas' : isGRC ? 'Risk & Compliance' : isQMS ? 'Management System' : isDMS ? 'Management System' : isTMS ? 'Management System' : isFletes ? 'Fletes' : isFlota ? 'Flotas' : isLocativa ? 'Locativo' : isWMS ? 'Management' : isGH ? 'Humana' : isLMS ? 'Management System' : isCRM ? 'Relationship Mgmt' : isEAM ? 'Enterprise Assets' : isMES ? 'Execution System' : isAPS ? '& Scheduling' : 'Estibas'

  const width    = collapsed ? DRAWER_COLLAPSED : (widthProp ?? DRAWER_WIDTH)
  const showText = !collapsed && (widthProp === undefined || widthProp >= COMPACT_THRESHOLD)

  return (
    <Box
      component="nav"
      sx={{
        width,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'auto',
        background: '#111827',
        borderRight: '1px solid rgba(255,255,255,0.04)',
        boxSizing: 'border-box',
        transition: dragging ? 'none' : 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        '&::-webkit-scrollbar': { width: 0 },
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          px: showText ? 2.5 : 1.5,
          gap: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          transition: 'all 0.22s',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: isConfig
              ? `linear-gradient(135deg, ${CF_COLOR} 0%, #4F46E5 100%)`
              : isQMS
              ? `linear-gradient(135deg, ${QMS_COLOR} 0%, #047857 100%)`
              : isDMS
              ? `linear-gradient(135deg, ${DMS_COLOR} 0%, #0C6A80 100%)`
              : isTMS
              ? `linear-gradient(135deg, ${TMS_COLOR} 0%, #0284C7 100%)`
              : isFlota
              ? `linear-gradient(135deg, ${GF_COLOR} 0%, #5B21B6 100%)`
              : isCommand
              ? `linear-gradient(135deg, ${CC_COLOR} 0%, #0284C7 100%)`
              : isLocativa
              ? `linear-gradient(135deg, ${ML_COLOR} 0%, #0F766E 100%)`
              : isWMS
              ? `linear-gradient(135deg, ${WMS_COLOR} 0%, #1D4ED8 100%)`
              : isGH
              ? `linear-gradient(135deg, ${GH_COLOR} 0%, #9D174D 100%)`
              : isGRC
              ? `linear-gradient(135deg, ${GRC_COLOR} 0%, #5B21B6 100%)`
              : isLMS
              ? `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`
              : isCRM
              ? `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`
              : isEAM
              ? `linear-gradient(135deg, ${EAM_COLOR} 0%, #C2410C 100%)`
              : isMES
              ? `linear-gradient(135deg, ${MES_COLOR} 0%, #0E7490 100%)`
              : isAPS
              ? `linear-gradient(135deg, ${APS_COLOR} 0%, #6D28D9 100%)`
              : `linear-gradient(135deg, ${activeColor} 0%, ${isTarifax ? '#1f6130' : '#27884A'} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${alpha(activeColor, 0.4)}`,
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: 13, letterSpacing: '-0.5px' }}>
            {logoShort}
          </Typography>
        </Box>
        {showText && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              {logoLine1}
            </Typography>
            <Typography sx={{ color: activeColor, fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, whiteSpace: 'nowrap', transition: 'color 0.3s ease' }}>
              {logoLine2}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Nav */}
      <Box sx={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1.5, px: showText ? 1.5 : 1,
        '&::-webkit-scrollbar': { width: 0 },
      }}>
        {sections.map(section => {
          const items = navItems.filter(i => i.section === section)
          return (
            <Box key={section} sx={{ mb: 0.5 }}>
              {showText && (
                <Typography sx={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.28)',
                  px: 1.5,
                  py: 1,
                  mt: section !== sections[0] ? 1 : 0,
                }}>
                  {section}
                </Typography>
              )}
              <List disablePadding>
                {items.map(item => {
                  const active = location.pathname === item.path ||
                    (!item.exact && item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                  return (
                    <Tooltip
                      key={item.path}
                      title={!showText ? item.label : ''}
                      placement="right"
                      arrow
                    >
                      <ListItem disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          onClick={() => navigate(item.path)}
                          sx={{
                            borderRadius: '10px',
                            py: showText ? 0.9 : 1.25,
                            px: 1.25,
                            minWidth: 0,
                            justifyContent: showText ? 'flex-start' : 'center',
                            background: active
                              ? `linear-gradient(90deg, ${alpha(activeColor, 0.18)}, ${alpha(activeColor, 0.08)})`
                              : 'transparent',
                            '&:hover': {
                              background: active
                                ? `linear-gradient(90deg, ${alpha(activeColor, 0.22)}, ${alpha(activeColor, 0.12)})`
                                : 'rgba(255,255,255,0.05)',
                            },
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 0,
                              mr: showText ? 1.25 : 0,
                              color: active ? activeColor : 'rgba(255,255,255,0.4)',
                              transition: 'color 0.15s ease',
                              '& svg': {
                                filter: active ? `drop-shadow(0 0 6px ${alpha(activeColor, 0.5)})` : 'none',
                              },
                            }}
                          >
                            {item.icon}
                          </ListItemIcon>
                          {showText && (
                            <ListItemText
                              primary={item.label}
                              primaryTypographyProps={{
                                fontSize: 13.5,
                                fontWeight: active ? 600 : 400,
                                color: active ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                                letterSpacing: active ? '-0.01em' : 'normal',
                                transition: 'color 0.15s ease',
                              }}
                            />
                          )}
                          {showText && active && (
                            <Box sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: activeColor,
                              boxShadow: `0 0 8px ${activeColor}`,
                              flexShrink: 0,
                            }} />
                          )}
                        </ListItemButton>
                      </ListItem>
                    </Tooltip>
                  )
                })}
              </List>
            </Box>
          )
        })}
      </Box>

      {/* Collapse toggle */}
      <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <ListItemButton
          onClick={() => setCollapsed(!collapsed)}
          sx={{
            borderRadius: '10px',
            py: 0.9,
            px: 1.25,
            justifyContent: showText ? 'flex-start' : 'center',
            color: 'rgba(255,255,255,0.3)',
            '&:hover': { color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(255,255,255,0.05)' },
            transition: 'all 0.15s ease',
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, mr: showText ? 1.25 : 0, color: 'inherit' }}>
            {!showText ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
          </ListItemIcon>
          {showText && (
            <ListItemText
              primary="Colapsar"
              primaryTypographyProps={{ fontSize: 12.5, color: 'inherit', fontWeight: 500 }}
            />
          )}
        </ListItemButton>
      </Box>
    </Box>
  )
}
