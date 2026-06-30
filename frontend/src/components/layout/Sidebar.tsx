import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
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
  AccountBalance as ERPDashIconERP,
  ReceiptLong as ERPContabilidadIconERP,
  AccountBalanceWallet as ERPTesoreriaIconERP,
  RequestQuote as ERPCxCIconERP,
  Payment as ERPCxPIconERP,
  Receipt as ERPFacturacionIconERP,
  Calculate as ERPTributacionIconERP,
  Summarize as ERPPresupuestosIconERP,
  Analytics as ERPCosteoIconERP,
  MergeType as ERPConsolidacionIconERP,
  Inventory2 as ERPActivosIconERP,
  ShoppingCart as ERPComprasIconERP,
  Work as ERPProyectosIconERP,
  AutoGraph as ERPEPMIconERP,
  Assessment as ERPReportesIconERP,
  Settings as ERPConfigIconERP,
  // SCM icons
  Grain as SCMTorreIconSCM,
  Store as SCMProvIconSCM,
  NoteAdd as SCMSolicIconSCM,
  AddShoppingCart as SCMOCIconSCM,
  SignalCellularAlt as SCMPlanIconSCM,
  CompareArrows as SCMInvIconSCM,
  FlightTakeoff as SCMLogIconSCM,
  AssignmentReturn as SCMDevIconSCM,
  WaterfallChart as SCMAnalIconSCM,
  GppBad as SCMRiskIconSCM,
  AppSettingsAlt as SCMCfgIconSCM,
  // SST icons
  HealthAndSafety as SSTDashIconSST,
  ReportProblem as SSTIncidentesIconSST,
  GppBad as SSTRiesgosIconSST,
  Checklist as SSTInspeccionesIconSST,
  SafetyDivider as SSTEPPIconSST,
  School as SSTCapacitacionIconSST,
  Folder as SSTDocumentosIconSST,
  LocalFireDepartment as SSTEmergenciasIconSST,
  Analytics as SSTIndicadoresIconSST,
  Settings as SSTConfigIconSST,
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
const GF_COLOR  = '#32AC5C'
const ML_COLOR  = '#0D9488'
const WMS_COLOR = '#1E40AF'
const GH_COLOR  = '#BE185D'
const TMS_COLOR = '#0369A1'
const DMS_COLOR = '#0E7490'
const QMS_COLOR = '#059669'
const GRC_COLOR = '#6D28D9'
const LMS_COLOR = '#D97706'
const CRM_COLOR = '#DC2626'
const EAM_COLOR = '#32AC5C'
const MES_COLOR = '#0891B2'
const APS_COLOR = '#7C3AED'
const ERP_COLOR = '#1A3A6B'
const SCM_COLOR = '#0C4D8C'
const SST_COLOR = '#C53030'

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
  section?: string
  exact?: boolean
}

const CI_NAV_ITEMS: NavItem[] = [
  { label: 'nav.dashboard',     icon: <DashboardIcon     fontSize="small" />, path: '/dashboard',     section: 'section.principal' },
  { label: 'nav.estibas',       icon: <EstibasIcon       fontSize="small" />, path: '/estibas',       section: 'section.principal' },
  { label: 'nav.movimientos',   icon: <MovimientosIcon   fontSize="small" />, path: '/movimientos',   section: 'section.operaciones' },
  { label: 'nav.trazabilidad',  icon: <TrazabilidadIcon  fontSize="small" />, path: '/trazabilidad',  section: 'section.operaciones' },
  { label: 'nav.manifiestos',   icon: <ManifiestosIcon   fontSize="small" />, path: '/manifiestos',   section: 'section.operaciones' },
  { label: 'nav.mantenimiento', icon: <MantenimientoIcon fontSize="small" />, path: '/mantenimiento', section: 'section.operaciones' },
  { label: 'nav.vehiculos',     icon: <VehiculosIcon     fontSize="small" />, path: '/vehiculos',     section: 'section.recursos' },
  { label: 'nav.ubicaciones',   icon: <UbicacionesIcon   fontSize="small" />, path: '/ubicaciones',   section: 'section.recursos' },
  { label: 'nav.proveedores',   icon: <ProveedoresIcon   fontSize="small" />, path: '/proveedores',   section: 'section.recursos' },
  { label: 'nav.clientes',      icon: <UsuariosIcon      fontSize="small" />, path: '/clientes',      section: 'section.recursos' },
  { label: 'nav.danos',         icon: <DanosIcon         fontSize="small" />, path: '/danos',         section: 'section.control' },
  { label: 'nav.alertas',       icon: <AlertasIcon       fontSize="small" />, path: '/alertas',       section: 'section.control' },
  { label: 'nav.costos',        icon: <CostosIcon        fontSize="small" />, path: '/costos',        section: 'section.control' },
  { label: 'nav.consultas',     icon: <ConsultasIcon     fontSize="small" />, path: '/consultas',     section: 'section.control' },
]

const TX_NAV_ITEMS: NavItem[] = [
  { label: 'nav.tablero',      icon: <TableroIcon fontSize="small" />, path: '/tarifax/tablero', section: 'section.tarifax' },
  { label: 'nav.motorTarifax', icon: <MotorIcon   fontSize="small" />, path: '/tarifax/motor',   section: 'section.tarifax' },
]

const FT_NAV_ITEMS: NavItem[] = [
  { label: 'nav.despachoViajes',   icon: <FletesDespachoIcon    fontSize="small" />, path: '/fletes',             section: 'section.despacho', exact: true },
  { label: 'nav.generadoresCarga', icon: <FletesGeneradoresIcon fontSize="small" />, path: '/fletes/generadores', section: 'section.catalogos' },
  { label: 'nav.conductores',      icon: <FletesConductoresIcon fontSize="small" />, path: '/fletes/conductores', section: 'section.catalogos' },
]

const GF_NAV_ITEMS: NavItem[] = [
  { label: 'nav.dashboard',     icon: <TableroIcon          fontSize="small" />, path: '/flota',              section: 'section.general',         exact: true },
  { label: 'nav.vehiculos',     icon: <FlotaVehiculosIcon   fontSize="small" />, path: '/flota/vehiculos',    section: 'section.flota' },
  { label: 'nav.combustible',   icon: <FlotaCombustibleIcon fontSize="small" />, path: '/flota/combustible',  section: 'section.flota' },
  { label: 'nav.documentos',    icon: <FlotaDocumentosIcon  fontSize="small" />, path: '/flota/documentos',   section: 'section.flota' },
  { label: 'nav.personal',      icon: <FlotaPersonalIcon    fontSize="small" />, path: '/flota/personal',     section: 'section.personal' },
  { label: 'nav.ordenesTrabajo',icon: <FlotaMantenimientoIcon fontSize="small" />, path: '/flota/mantenimiento', section: 'section.mantenimiento' },
  { label: 'nav.programasMto',  icon: <FlotaRutinasIcon      fontSize="small" />, path: '/flota/rutinas',      section: 'section.mantenimiento' },
  { label: 'nav.confiabilidad', icon: <FlotaConfiabilidadIcon fontSize="small" />, path: '/flota/confiabilidad', section: 'section.confiabilidad' },
  { label: 'nav.configuracion', icon: <FlotaConfigIcon       fontSize="small" />, path: '/flota/config',       section: 'section.sistema' },
]
const GF_SECTIONS = ['section.general', 'section.flota', 'section.personal', 'section.mantenimiento', 'section.confiabilidad', 'section.sistema']

const ML_NAV_ITEMS: NavItem[] = [
  { label: 'nav.dashboard',     icon: <TableroIcon           fontSize="small" />, path: '/locativa',           section: 'section.general', exact: true },
  { label: 'nav.activos',       icon: <LocativaActivosIcon   fontSize="small" />, path: '/locativa/activos',   section: 'section.gestion' },
  { label: 'nav.ordenesTrabajo',icon: <LocativaOTMLIcon      fontSize="small" />, path: '/locativa/ordenes',   section: 'section.gestion' },
  { label: 'nav.riesgos',       icon: <LocativaRiesgoMLIcon  fontSize="small" />, path: '/locativa/riesgos',   section: 'section.control' },
  { label: 'nav.energia',       icon: <LocativaEnergiaMLIcon fontSize="small" />, path: '/locativa/energia',   section: 'section.control' },
  { label: 'nav.configuracion', icon: <LocativaConfigMLIcon  fontSize="small" />, path: '/locativa/config',    section: 'section.sistema' },
]
const ML_SECTIONS = ['section.general', 'section.gestion', 'section.control', 'section.sistema']

const WMS_NAV_ITEMS: NavItem[] = [
  { label: 'nav.dashboard',     icon: <WMSDashboardIcon    fontSize="small" />, path: '/wms',              section: 'section.general',          exact: true },
  { label: 'nav.recepcion',     icon: <WMSInboundIcon      fontSize="small" />, path: '/wms/recepcion',    section: 'section.inbound' },
  { label: 'nav.inventario',    icon: <WMSInventoryIcon    fontSize="small" />, path: '/wms/inventario',   section: 'section.almacenamiento' },
  { label: 'nav.picking',       icon: <WMSPickingIcon      fontSize="small" />, path: '/wms/picking',      section: 'section.outbound' },
  { label: 'nav.despacho',      icon: <WMSDespachoIcon     fontSize="small" />, path: '/wms/despacho',     section: 'section.outbound' },
  { label: 'nav.trazabilidad',  icon: <WMSTrazabilidadIcon fontSize="small" />, path: '/wms/trazabilidad', section: 'section.control' },
  { label: 'nav.configuracion', icon: <WMSConfigIcon       fontSize="small" />, path: '/wms/config',       section: 'section.sistema' },
]
const WMS_SECTIONS = ['section.general', 'section.inbound', 'section.almacenamiento', 'section.outbound', 'section.control', 'section.sistema']

const GH_NAV_ITEMS: NavItem[] = [
  { label: 'nav.dashboard',     icon: <GHDashboardIcon     fontSize="small" />, path: '/gh',               section: 'section.general',       exact: true },
  { label: 'nav.colaboradores', icon: <GHColaboradoresIcon fontSize="small" />, path: '/gh/colaboradores', section: 'section.personas' },
  { label: 'nav.conductores',   icon: <GHConductoresIcon   fontSize="small" />, path: '/gh/conductores',   section: 'section.personas' },
  { label: 'nav.nomina',        icon: <GHNominaIcon        fontSize="small" />, path: '/gh/nomina',        section: 'section.nomina' },
  { label: 'nav.incapacidades', icon: <GHIncapIcon         fontSize="small" />, path: '/gh/incapacidades', section: 'section.nomina' },
  { label: 'nav.vacaciones',    icon: <GHVacacionesIcon    fontSize="small" />, path: '/gh/vacaciones',    section: 'section.nomina' },
  { label: 'nav.reclutamiento', icon: <GHReclutIcon        fontSize="small" />, path: '/gh/reclutamiento', section: 'section.reclutamiento' },
  { label: 'nav.evaluacion',    icon: <GHEvalIcon          fontSize="small" />, path: '/gh/evaluacion',    section: 'section.desarrollo' },
  { label: 'nav.capacitacion',  icon: <GHCapacitIcon       fontSize="small" />, path: '/gh/capacitacion',  section: 'section.desarrollo' },
  { label: 'nav.sst',           icon: <GHSSTIcon           fontSize="small" />, path: '/gh/sst',           section: 'section.sst' },
  { label: 'nav.configuracion', icon: <GHConfigIcon        fontSize="small" />, path: '/gh/config',        section: 'section.sistema' },
]
const GH_SECTIONS = ['section.general', 'section.personas', 'section.nomina', 'section.reclutamiento', 'section.desarrollo', 'section.sst', 'section.sistema']

const TMS_NAV_ITEMS: NavItem[] = [
  { label: 'nav.dashboard',     icon: <TMSDashIconTMS          fontSize="small" />, path: '/tms',               section: 'section.general',    exact: true },
  { label: 'nav.viajes',        icon: <TMSViajesIconTMS        fontSize="small" />, path: '/tms/viajes',        section: 'section.operacion' },
  { label: 'nav.planeacion',    icon: <TMSPlaneacionIconTMS    fontSize="small" />, path: '/tms/planeacion',    section: 'section.operacion' },
  { label: 'nav.despachos',     icon: <TMSDespachosIconTMS     fontSize="small" />, path: '/tms/despachos',     section: 'section.operacion' },
  { label: 'nav.tracking',      icon: <TMSTrackingIconTMS      fontSize="small" />, path: '/tms/tracking',      section: 'section.operacion' },
  { label: 'nav.vehiculos',     icon: <TMSVehiculosIconTMS     fontSize="small" />, path: '/tms/vehiculos',     section: 'section.recursos' },
  { label: 'nav.conductores',   icon: <TMSConductoresIconTMS   fontSize="small" />, path: '/tms/conductores',   section: 'section.recursos' },
  { label: 'nav.rutas',         icon: <TMSRutasIconTMS         fontSize="small" />, path: '/tms/rutas',         section: 'section.logistica' },
  { label: 'nav.torreControl',  icon: <TMSTorreIconTMS         fontSize="small" />, path: '/tms/torre-control', section: 'section.logistica' },
  { label: 'nav.costos',        icon: <TMSCostosIconTMS        fontSize="small" />, path: '/tms/costos',        section: 'section.financiero' },
  { label: 'nav.otif',          icon: <TMSOTIFIconTMS          fontSize="small" />, path: '/tms/otif',          section: 'section.financiero' },
  { label: 'nav.liquidaciones', icon: <TMSLiquidacionesIconTMS fontSize="small" />, path: '/tms/liquidaciones', section: 'section.financiero' },
  { label: 'nav.despachoFletes',icon: <FletesDespachoIcon      fontSize="small" />, path: '/fletes',            section: 'section.fletes',    exact: true },
  { label: 'nav.generadores',   icon: <FletesGeneradoresIcon   fontSize="small" />, path: '/fletes/generadores',section: 'section.fletes' },
  { label: 'nav.condFletes',    icon: <FletesConductoresIcon   fontSize="small" />, path: '/fletes/conductores',section: 'section.fletes' },
  { label: 'nav.documentos',    icon: <TMSDocumentosIconTMS    fontSize="small" />, path: '/tms/documentos',    section: 'section.sistema' },
  { label: 'nav.configuracion', icon: <TMSConfigIconTMS        fontSize="small" />, path: '/tms/config',        section: 'section.sistema' },
]
const TMS_SECTIONS = ['section.general', 'section.operacion', 'section.recursos', 'section.logistica', 'section.financiero', 'section.fletes', 'section.sistema']

const DMS_NAV_ITEMS: NavItem[] = [
  { label: 'nav.dashboard',     icon: <DMSDashIconDMS          fontSize="small" />, path: '/dms',               section: 'section.general',      exact: true },
  { label: 'nav.repositorio',   icon: <DMSRepositorioIconDMS   fontSize="small" />, path: '/dms/repositorio',   section: 'section.repositorio' },
  { label: 'nav.documentos',    icon: <DMSDocumentosIconDMS    fontSize="small" />, path: '/dms/documentos',    section: 'section.repositorio' },
  { label: 'nav.categorias',    icon: <DMSCategoriasIconDMS    fontSize="small" />, path: '/dms/categorias',    section: 'section.clasificacion' },
  { label: 'nav.expedientes',   icon: <DMSExpedientesIconDMS   fontSize="small" />, path: '/dms/expedientes',   section: 'section.clasificacion' },
  { label: 'nav.workflows',     icon: <DMSWorkflowIconDMS      fontSize="small" />, path: '/dms/workflow',      section: 'section.flujos' },
  { label: 'nav.firmas',        icon: <DMSFirmasIconDMS        fontSize="small" />, path: '/dms/firmas',        section: 'section.flujos' },
  { label: 'nav.busqueda',      icon: <DMSBusquedaIconDMS      fontSize="small" />, path: '/dms/busqueda',      section: 'section.busqueda' },
  { label: 'nav.retencion',     icon: <DMSRetencionIconDMS     fontSize="small" />, path: '/dms/retencion',     section: 'section.cumplimiento' },
  { label: 'nav.auditoria',     icon: <DMSAuditoriaIconDMS     fontSize="small" />, path: '/dms/auditoria',     section: 'section.cumplimiento' },
  { label: 'nav.integraciones', icon: <DMSIntegracionesIconDMS fontSize="small" />, path: '/dms/integraciones', section: 'section.inteligencia' },
  { label: 'nav.iaDocumental',  icon: <DMSIAIconDMS            fontSize="small" />, path: '/dms/ia',            section: 'section.inteligencia' },
  { label: 'nav.portal',        icon: <DMSPortalIconDMS        fontSize="small" />, path: '/dms/portal',        section: 'section.portal' },
  { label: 'nav.configuracion', icon: <DMSConfigIconDMS        fontSize="small" />, path: '/dms/config',        section: 'section.sistema' },
]
const DMS_SECTIONS = ['section.general', 'section.repositorio', 'section.clasificacion', 'section.flujos', 'section.busqueda', 'section.cumplimiento', 'section.inteligencia', 'section.portal', 'section.sistema']

const QMS_NAV_ITEMS: NavItem[] = [
  { label: 'nav.torreControl',    icon: <QMSDashIconQMS         fontSize="small" />, path: '/qms',                  section: 'section.general',        exact: true },
  { label: 'nav.procesos',        icon: <QMSProcesosIconQMS     fontSize="small" />, path: '/qms/procesos',         section: 'section.procesos' },
  { label: 'nav.indicadores',     icon: <QMSIndicadoresIconQMS  fontSize="small" />, path: '/qms/indicadores',      section: 'section.procesos' },
  { label: 'nav.noConformidades', icon: <QMSNCIconQMS           fontSize="small" />, path: '/qms/no-conformidades', section: 'section.calidad' },
  { label: 'nav.auditorias',      icon: <QMSAuditoriasIconQMS   fontSize="small" />, path: '/qms/auditorias',       section: 'section.calidad' },
  { label: 'nav.hallazgos',       icon: <QMSHallazgosIconQMS    fontSize="small" />, path: '/qms/hallazgos',        section: 'section.calidad' },
  { label: 'nav.riesgos',         icon: <QMSRiesgosIconQMS      fontSize="small" />, path: '/qms/riesgos',          section: 'section.operacional' },
  { label: 'nav.cambios',         icon: <QMSCambiosIconQMS      fontSize="small" />, path: '/qms/cambios',          section: 'section.operacional' },
  { label: 'nav.quejasReclamos',  icon: <QMSQuejasIconQMS       fontSize="small" />, path: '/qms/quejas',           section: 'section.operacional' },
  { label: 'nav.proveedores',     icon: <QMSProveedoresIconQMS  fontSize="small" />, path: '/qms/proveedores',      section: 'section.relacionamiento' },
  { label: 'nav.encuestas',       icon: <QMSEncuestasIconQMS    fontSize="small" />, path: '/qms/encuestas',        section: 'section.relacionamiento' },
  { label: 'nav.mejoraContinua',  icon: <QMSMejoraIconQMS       fontSize="small" />, path: '/qms/mejora',           section: 'section.mejora' },
  { label: 'nav.iaCalidad',       icon: <QMSIAIconQMS           fontSize="small" />, path: '/qms/ia',               section: 'section.mejora' },
  { label: 'nav.configuracion',   icon: <QMSConfigIconQMS       fontSize="small" />, path: '/qms/config',           section: 'section.sistema' },
]
const QMS_SECTIONS = ['section.general', 'section.procesos', 'section.calidad', 'section.operacional', 'section.relacionamiento', 'section.mejora', 'section.sistema']

const GRC_NAV_ITEMS: NavItem[] = [
  { label: 'nav.torreControl',  icon: <GRCDashIconGRC         fontSize="small" />, path: '/grc',              section: 'section.general',      exact: true },
  { label: 'nav.gobierno',      icon: <GRCGobiernoIconGRC     fontSize="small" />, path: '/grc/gobierno',     section: 'section.gobierno' },
  { label: 'nav.politicas',     icon: <GRCPoliticasIconGRC    fontSize="small" />, path: '/grc/politicas',    section: 'section.gobierno' },
  { label: 'nav.obligaciones',  icon: <GRCObligacionesIconGRC fontSize="small" />, path: '/grc/obligaciones', section: 'section.cumplimiento' },
  { label: 'nav.cumplimiento',  icon: <GRCCumplimientoIconGRC fontSize="small" />, path: '/grc/cumplimiento', section: 'section.cumplimiento' },
  { label: 'nav.riesgos',       icon: <GRCRiesgosIconGRC      fontSize="small" />, path: '/grc/riesgos',      section: 'section.riesgos' },
  { label: 'nav.controles',     icon: <GRCControlesIconGRC    fontSize="small" />, path: '/grc/controles',    section: 'section.riesgos' },
  { label: 'nav.terceros',      icon: <GRCTercerosIconGRC     fontSize="small" />, path: '/grc/terceros',     section: 'section.riesgos' },
  { label: 'nav.auditorias',    icon: <GRCAuditoriasIconGRC   fontSize="small" />, path: '/grc/auditorias',   section: 'section.auditoria' },
  { label: 'nav.hallazgos',     icon: <GRCHallazgosIconGRC    fontSize="small" />, path: '/grc/hallazgos',    section: 'section.auditoria' },
  { label: 'nav.continuidad',   icon: <GRCContinuidadIconGRC  fontSize="small" />, path: '/grc/continuidad',  section: 'section.continuidad' },
  { label: 'nav.incidentes',    icon: <GRCIncidentesIconGRC   fontSize="small" />, path: '/grc/incidentes',   section: 'section.continuidad' },
  { label: 'nav.iaGrc',         icon: <GRCIAIconGRC           fontSize="small" />, path: '/grc/ia',           section: 'section.inteligencia' },
  { label: 'nav.configuracion', icon: <GRCConfigIconGRC       fontSize="small" />, path: '/grc/config',       section: 'section.sistema' },
]
const GRC_SECTIONS = ['section.general', 'section.gobierno', 'section.cumplimiento', 'section.riesgos', 'section.auditoria', 'section.continuidad', 'section.inteligencia', 'section.sistema']

const LMS_NAV_ITEMS: NavItem[] = [
  { label: 'nav.dashboard',       icon: <LMSReportesIcon       fontSize="small" />, path: '/lms',                 section: 'section.general',     exact: true },
  { label: 'nav.miAprendizaje',   icon: <LMSMiAprendizajeIcon  fontSize="small" />, path: '/lms/mi-aprendizaje',  section: 'section.general' },
  { label: 'nav.universidad',     icon: <LMSUniversidadIcon    fontSize="small" />, path: '/lms/universidad',     section: 'section.academia' },
  { label: 'nav.catalogo',        icon: <LMSCatalogoIcon       fontSize="small" />, path: '/lms/catalogo',        section: 'section.academia' },
  { label: 'nav.rutas',           icon: <LMSRutasIcon          fontSize="small" />, path: '/lms/rutas',           section: 'section.academia' },
  { label: 'nav.onboarding',      icon: <LMSOnboardingIcon     fontSize="small" />, path: '/lms/onboarding',      section: 'section.talento' },
  { label: 'nav.competencias',    icon: <LMSCompetenciasIcon   fontSize="small" />, path: '/lms/competencias',    section: 'section.talento' },
  { label: 'nav.evaluaciones',    icon: <LMSEvaluacionesIcon   fontSize="small" />, path: '/lms/evaluaciones',    section: 'section.evaluacion' },
  { label: 'nav.bancoPreguntas',  icon: <LMSBancoIcon          fontSize="small" />, path: '/lms/banco-preguntas', section: 'section.evaluacion' },
  { label: 'nav.certificaciones', icon: <LMSCertificacionesIcon fontSize="small" />, path: '/lms/certificaciones', section: 'section.evaluacion' },
  { label: 'nav.conocimiento',    icon: <LMSKnowledgeIcon      fontSize="small" />, path: '/lms/conocimiento',    section: 'section.conocimiento' },
  { label: 'nav.gamificacion',    icon: <LMSGamificacionIcon   fontSize="small" />, path: '/lms/gamificacion',    section: 'section.analitica' },
  { label: 'nav.iaLms',           icon: <LMSIAIcon             fontSize="small" />, path: '/lms/ia',              section: 'section.analitica' },
  { label: 'nav.reportes',        icon: <LMSReportesIcon       fontSize="small" />, path: '/lms/reportes',        section: 'section.analitica' },
  { label: 'nav.configuracion',   icon: <LMSConfigIcon         fontSize="small" />, path: '/lms/config',          section: 'section.sistema' },
]
const LMS_SECTIONS = ['section.general', 'section.academia', 'section.talento', 'section.evaluacion', 'section.conocimiento', 'section.analitica', 'section.sistema']

const CRM_NAV_ITEMS: NavItem[] = [
  { label: 'nav.torreComercial', icon: <CRMDashIconCRM          fontSize="small" />, path: '/crm',               section: 'section.general',   exact: true },
  { label: 'nav.clientes360',    icon: <CRMClientesIconCRM      fontSize="small" />, path: '/crm/clientes',      section: 'section.general' },
  { label: 'nav.leadScoring',    icon: <CRMLeadsIconCRM         fontSize="small" />, path: '/crm/leads',         section: 'section.comercial' },
  { label: 'nav.oportunidades',  icon: <CRMDashIconCRM          fontSize="small" />, path: '/crm/oportunidades', section: 'section.comercial' },
  { label: 'nav.cotizaciones',   icon: <CRMCotizacionesIconCRM  fontSize="small" />, path: '/crm/cotizaciones',  section: 'section.comercial' },
  { label: 'nav.contratosSla',   icon: <CRMContratosIconCRM     fontSize="small" />, path: '/crm/contratos',     section: 'section.contratos' },
  { label: 'nav.cuentasClave',   icon: <CRMCuentasIconCRM       fontSize="small" />, path: '/crm/cuentas-clave', section: 'section.contratos' },
  { label: 'nav.ticketsPqrs',    icon: <CRMTicketsIconCRM       fontSize="small" />, path: '/crm/tickets',       section: 'section.servicio' },
  { label: 'nav.interacciones',  icon: <CRMInteraccionesIconCRM fontSize="small" />, path: '/crm/interacciones', section: 'section.servicio' },
  { label: 'nav.campanas',       icon: <CRMCampanasIconCRM      fontSize="small" />, path: '/crm/campanas',      section: 'section.marketing' },
  { label: 'nav.npsEncuestas',   icon: <CRMEncuestasIconCRM     fontSize="small" />, path: '/crm/encuestas',     section: 'section.marketing' },
  { label: 'nav.rentabilidad',   icon: <CRMRentabilidadIconCRM  fontSize="small" />, path: '/crm/rentabilidad',  section: 'section.analitica' },
  { label: 'nav.iaComercial',    icon: <CRMIAIconCRM            fontSize="small" />, path: '/crm/ia',            section: 'section.analitica' },
  { label: 'nav.reportes',       icon: <CRMReportesIconCRM      fontSize="small" />, path: '/crm/reportes',      section: 'section.analitica' },
  { label: 'nav.configuracion',  icon: <CRMConfigIconCRM        fontSize="small" />, path: '/crm/config',        section: 'section.sistema' },
]
const CRM_SECTIONS = ['section.general', 'section.comercial', 'section.contratos', 'section.servicio', 'section.marketing', 'section.analitica', 'section.sistema']

const EAM_NAV_ITEMS: NavItem[] = [
  { label: 'nav.torreControl',   icon: <EAMDashIconEAM          fontSize="small" />, path: '/eam',                 section: 'section.general',         exact: true },
  { label: 'nav.activos',        icon: <EAMActivosIconEAM       fontSize="small" />, path: '/eam/activos',         section: 'section.general' },
  { label: 'nav.ordenesTrabajo', icon: <EAMOTIconEAM            fontSize="small" />, path: '/eam/ordenes-trabajo', section: 'section.mantenimiento' },
  { label: 'nav.planesMant',     icon: <EAMPlanesIconEAM        fontSize="small" />, path: '/eam/planes',          section: 'section.mantenimiento' },
  { label: 'nav.checklists',     icon: <EAMChecklistIconEAM     fontSize="small" />, path: '/eam/checklists',      section: 'section.mantenimiento' },
  { label: 'nav.lubricacion',    icon: <EAMLubricacionIconEAM   fontSize="small" />, path: '/eam/lubricacion',     section: 'section.lubricacion' },
  { label: 'nav.neumaticos',     icon: <EAMNeumaticosIconEAM    fontSize="small" />, path: '/eam/neumaticos',      section: 'section.lubricacion' },
  { label: 'nav.combustible',    icon: <EAMCombustibleIconEAM   fontSize="small" />, path: '/eam/combustible',     section: 'section.lubricacion' },
  { label: 'nav.inventario',     icon: <EAMInventarioIconEAM    fontSize="small" />, path: '/eam/inventario',      section: 'section.inventario' },
  { label: 'nav.garantias',      icon: <EAMGarantiasIconEAM     fontSize="small" />, path: '/eam/garantias',       section: 'section.inventario' },
  { label: 'nav.confiabilidad',  icon: <EAMConfiabilidadIconEAM fontSize="small" />, path: '/eam/confiabilidad',   section: 'section.confiabilidad' },
  { label: 'nav.iaPredictiva',   icon: <EAMIAIconEAM            fontSize="small" />, path: '/eam/ia',              section: 'section.inteligencia' },
  { label: 'nav.reportes',       icon: <EAMReportesIconEAM      fontSize="small" />, path: '/eam/reportes',        section: 'section.inteligencia' },
  { label: 'nav.configuracion',  icon: <EAMConfigIconEAM        fontSize="small" />, path: '/eam/config',          section: 'section.sistema' },
]
const EAM_SECTIONS = ['section.general', 'section.mantenimiento', 'section.lubricacion', 'section.inventario', 'section.confiabilidad', 'section.inteligencia', 'section.sistema']

const MES_NAV_ITEMS: NavItem[] = [
  { label: 'nav.torreControl',    icon: <MESDashIconMES         fontSize="small" />, path: '/mes',              section: 'section.general',     exact: true },
  { label: 'nav.plantasLineas',   icon: <MESPlantaIconMES       fontSize="small" />, path: '/mes/planta',       section: 'section.general' },
  { label: 'nav.ordenesProd',     icon: <MESOrdenesIconMES      fontSize="small" />, path: '/mes/ordenes',      section: 'section.produccion' },
  { label: 'nav.programacionAps', icon: <MESProgramacionIconMES fontSize="small" />, path: '/mes/programacion', section: 'section.produccion' },
  { label: 'nav.ejecucionPlanta', icon: <MESEjecucionIconMES    fontSize="small" />, path: '/mes/ejecucion',    section: 'section.produccion' },
  { label: 'nav.trazabilidad',    icon: <MESTrazabilidadIconMES fontSize="small" />, path: '/mes/trazabilidad', section: 'section.produccion' },
  { label: 'nav.controlCalidad',  icon: <MESCalidadIconMES      fontSize="small" />, path: '/mes/calidad',      section: 'section.calidad' },
  { label: 'nav.scrapLean',       icon: <MESScrapIconMES        fontSize="small" />, path: '/mes/scrap',        section: 'section.calidad' },
  { label: 'nav.oee',             icon: <MESOEEIconMES          fontSize="small" />, path: '/mes/oee',          section: 'section.analitica' },
  { label: 'nav.wipMateriales',   icon: <MESInventarioIconMES   fontSize="small" />, path: '/mes/inventario',   section: 'section.analitica' },
  { label: 'nav.bomRecetas',      icon: <MESBOMIconMES          fontSize="small" />, path: '/mes/bom',          section: 'section.ingenieria' },
  { label: 'nav.iaManufactura',   icon: <MESIAIconMES           fontSize="small" />, path: '/mes/ia',           section: 'section.inteligencia' },
  { label: 'nav.reportes',        icon: <MESReportesIconMES     fontSize="small" />, path: '/mes/reportes',     section: 'section.inteligencia' },
  { label: 'nav.configuracion',   icon: <MESConfigIconMES       fontSize="small" />, path: '/mes/config',       section: 'section.sistema' },
]
const MES_SECTIONS = ['section.general', 'section.produccion', 'section.calidad', 'section.analitica', 'section.ingenieria', 'section.inteligencia', 'section.sistema']

const APS_NAV_ITEMS: NavItem[] = [
  { label: 'nav.torreControl',    icon: <APSDashIconAPS         fontSize="small" />, path: '/aps',               section: 'section.general',   exact: true },
  { label: 'nav.demandPlanning',  icon: <APSDemandaIconAPS      fontSize="small" />, path: '/aps/demanda',       section: 'section.demanda' },
  { label: 'nav.soipIbp',         icon: <APSSOIPIconAPS         fontSize="small" />, path: '/aps/soip',          section: 'section.demanda' },
  { label: 'nav.planMaestroMps',  icon: <APSPlanIconAPS         fontSize="small" />, path: '/aps/plan',          section: 'section.supply' },
  { label: 'nav.capacidadCrp',    icon: <APSCapacidadIconAPS    fontSize="small" />, path: '/aps/capacidad',     section: 'section.supply' },
  { label: 'nav.inventarioMultiE',icon: <APSInventarioIconAPS   fontSize="small" />, path: '/aps/inventario',    section: 'section.supply' },
  { label: 'nav.distribucionDrp', icon: <APSDistribucionIconAPS fontSize="small" />, path: '/aps/distribucion',  section: 'section.logistica' },
  { label: 'nav.transporteTrp',   icon: <APSTransporteIconAPS   fontSize="small" />, path: '/aps/transporte',    section: 'section.logistica' },
  { label: 'nav.simuladorWhatIf', icon: <APSEscenariosIconAPS   fontSize="small" />, path: '/aps/escenarios',    section: 'section.analitica' },
  { label: 'nav.restricciones',   icon: <APSRestricionesIconAPS fontSize="small" />, path: '/aps/restricciones', section: 'section.analitica' },
  { label: 'nav.kpisControl',     icon: <APSKPIsIconAPS         fontSize="small" />, path: '/aps/kpis',          section: 'section.analitica' },
  { label: 'nav.iaAutonomaAps',   icon: <APSIAIconAPS           fontSize="small" />, path: '/aps/ia',            section: 'section.inteligencia' },
  { label: 'nav.reportes',        icon: <APSReportesIconAPS     fontSize="small" />, path: '/aps/reportes',      section: 'section.inteligencia' },
  { label: 'nav.configuracion',   icon: <APSConfigIconAPS       fontSize="small" />, path: '/aps/config',        section: 'section.sistema' },
]
const APS_SECTIONS = ['section.general', 'section.demanda', 'section.supply', 'section.logistica', 'section.analitica', 'section.inteligencia', 'section.sistema']

const ERP_NAV_ITEMS: NavItem[] = [
  { label: 'nav.dashboard',       icon: <ERPDashIconERP         fontSize="small" />, path: '/erp',                   section: 'section.general',    exact: true },
  { label: 'nav.contabilidad',    icon: <ERPContabilidadIconERP fontSize="small" />, path: '/erp/contabilidad',      section: 'section.contabilidad' },
  { label: 'nav.tesoreria',       icon: <ERPTesoreriaIconERP    fontSize="small" />, path: '/erp/tesoreria',         section: 'section.contabilidad' },
  { label: 'nav.cxc',             icon: <ERPCxCIconERP          fontSize="small" />, path: '/erp/cxc',               section: 'section.cuentas' },
  { label: 'nav.cxp',             icon: <ERPCxPIconERP          fontSize="small" />, path: '/erp/cxp',               section: 'section.cuentas' },
  { label: 'nav.facturacion',     icon: <ERPFacturacionIconERP  fontSize="small" />, path: '/erp/facturacion',       section: 'section.cuentas' },
  { label: 'nav.tributacion',     icon: <ERPTributacionIconERP  fontSize="small" />, path: '/erp/tributacion',       section: 'section.fiscal' },
  { label: 'nav.presupuestos',    icon: <ERPPresupuestosIconERP fontSize="small" />, path: '/erp/presupuestos',      section: 'section.fiscal' },
  { label: 'nav.costeo',          icon: <ERPCosteoIconERP       fontSize="small" />, path: '/erp/costeo',            section: 'section.fiscal' },
  { label: 'nav.consolidacion',   icon: <ERPConsolidacionIconERP fontSize="small" />, path: '/erp/consolidacion',   section: 'section.corporativo' },
  { label: 'nav.activos',         icon: <ERPActivosIconERP      fontSize="small" />, path: '/erp/activos',           section: 'section.corporativo' },
  { label: 'nav.compras',         icon: <ERPComprasIconERP      fontSize="small" />, path: '/erp/compras',           section: 'section.corporativo' },
  { label: 'nav.proyectos',       icon: <ERPProyectosIconERP    fontSize="small" />, path: '/erp/proyectos',         section: 'section.analitica' },
  { label: 'nav.epm',             icon: <ERPEPMIconERP          fontSize="small" />, path: '/erp/epm',               section: 'section.analitica' },
  { label: 'nav.reportes',        icon: <ERPReportesIconERP     fontSize="small" />, path: '/erp/reportes',          section: 'section.analitica' },
  { label: 'nav.configuracion',   icon: <ERPConfigIconERP       fontSize="small" />, path: '/erp/config',            section: 'section.sistema' },
]
const ERP_SECTIONS = ['section.general', 'section.contabilidad', 'section.cuentas', 'section.fiscal', 'section.corporativo', 'section.analitica', 'section.sistema']

const SCM_NAV_ITEMS: NavItem[] = [
  { label: 'nav.torreScm',        icon: <SCMTorreIconSCM  fontSize="small" />, path: '/scm',                   section: 'section.general',       exact: true },
  { label: 'nav.proveedoresScm',  icon: <SCMProvIconSCM   fontSize="small" />, path: '/scm/proveedores',       section: 'section.general' },
  { label: 'nav.solicitudesCompra', icon: <SCMSolicIconSCM fontSize="small" />, path: '/scm/solicitudes',      section: 'section.compras' },
  { label: 'nav.ordenesCompra',   icon: <SCMOCIconSCM     fontSize="small" />, path: '/scm/ordenes-compra',    section: 'section.compras' },
  { label: 'nav.planificacionScm',icon: <SCMPlanIconSCM   fontSize="small" />, path: '/scm/planificacion',     section: 'section.planificacion' },
  { label: 'nav.inventarioScm',   icon: <SCMInvIconSCM    fontSize="small" />, path: '/scm/inventario',        section: 'section.planificacion' },
  { label: 'nav.logisticaScm',    icon: <SCMLogIconSCM    fontSize="small" />, path: '/scm/logistica',         section: 'section.logistica' },
  { label: 'nav.devolucionesScm', icon: <SCMDevIconSCM    fontSize="small" />, path: '/scm/devoluciones',      section: 'section.logistica' },
  { label: 'nav.analyticsScm',    icon: <SCMAnalIconSCM   fontSize="small" />, path: '/scm/analitica',         section: 'section.analitica' },
  { label: 'nav.riesgosScm',      icon: <SCMRiskIconSCM   fontSize="small" />, path: '/scm/riesgos',           section: 'section.analitica' },
  { label: 'nav.configuracion',   icon: <SCMCfgIconSCM    fontSize="small" />, path: '/scm/config',            section: 'section.sistema' },
]
const SCM_SECTIONS = ['section.general', 'section.compras', 'section.planificacion', 'section.logistica', 'section.analitica', 'section.sistema']

const SST_NAV_ITEMS: NavItem[] = [
  { label: 'nav.sstDashboard',    icon: <SSTDashIconSST       fontSize="small" />, path: '/sst',                section: 'section.general',       exact: true },
  { label: 'nav.sstIncidentes',   icon: <SSTIncidentesIconSST fontSize="small" />, path: '/sst/incidentes',     section: 'section.gestion' },
  { label: 'nav.sstRiesgos',      icon: <SSTRiesgosIconSST    fontSize="small" />, path: '/sst/riesgos',        section: 'section.gestion' },
  { label: 'nav.sstInspecciones', icon: <SSTInspeccionesIconSST fontSize="small" />, path: '/sst/inspecciones', section: 'section.gestion' },
  { label: 'nav.sstEPP',          icon: <SSTEPPIconSST        fontSize="small" />, path: '/sst/epp',            section: 'section.gestion' },
  { label: 'nav.sstCapacitacion', icon: <SSTCapacitacionIconSST fontSize="small" />, path: '/sst/capacitacion', section: 'section.programas' },
  { label: 'nav.sstDocumentos',   icon: <SSTDocumentosIconSST fontSize="small" />, path: '/sst/documentos',     section: 'section.programas' },
  { label: 'nav.sstEmergencias',  icon: <SSTEmergenciasIconSST fontSize="small" />, path: '/sst/emergencias',   section: 'section.programas' },
  { label: 'nav.sstIndicadores',  icon: <SSTIndicadoresIconSST fontSize="small" />, path: '/sst/indicadores',   section: 'section.analitica' },
  { label: 'nav.configuracion',   icon: <SSTConfigIconSST     fontSize="small" />, path: '/sst/config',         section: 'section.sistema' },
]
const SST_SECTIONS = ['section.general', 'section.gestion', 'section.programas', 'section.analitica', 'section.sistema']

const CONFIG_NAV_ITEMS: NavItem[] = [
  { label: 'nav.usuarios',             icon: <UsuariosIcon   fontSize="small" />, path: '/usuarios',       section: 'section.administracion', exact: true },
  { label: 'nav.roles',                icon: <RolesIcon      fontSize="small" />, path: '/usuarios/roles', section: 'section.administracion' },
  { label: 'nav.configuracionGeneral', icon: <FlotaConfigIcon fontSize="small" />, path: '/configuracion',  section: 'section.administracion' },
]

const CC_NAV_ITEMS: NavItem[] = COMMAND_CENTER_DASHBOARDS.map(d => ({
  label:   d.shortLabel,
  icon:    d.icon,
  path:    d.path,
  section: 'section.dashboards',
  exact:   true,
}))

const CI_SECTIONS     = ['section.principal', 'section.operaciones', 'section.recursos', 'section.control']
const TX_SECTIONS     = ['section.tarifax']
const FT_SECTIONS     = ['section.despacho', 'section.catalogos']
const CONFIG_SECTIONS = ['section.administracion']
const CC_SECTIONS     = ['section.dashboards']

// Mapeo de path de CI → clave de permiso
const CI_PATH_TO_PERM: Record<string, string> = {
  '/dashboard':    'dashboard',
  '/estibas':      'estibas',
  '/movimientos':  'movimientos',
  '/manifiestos':  'manifiestos',
  '/vehiculos':    'vehiculos',
  '/ubicaciones':  'ubicaciones',
  '/proveedores':  'proveedores',
  '/alertas':      'alertas',
  '/danos':        'danos',
  '/trazabilidad': 'trazabilidad',
  '/mantenimiento':'mantenimiento',
  '/costos':       'costos',
  '/consultas':    'consultas',
}

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
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const isAdmin = user?.rol === 'ADMINISTRADOR'

  // Filtrar ítems de CI según permisos del usuario
  const visibleCIItems = isAdmin
    ? CI_NAV_ITEMS
    : CI_NAV_ITEMS.filter(item => {
        const permKey = CI_PATH_TO_PERM[item.path]
        return !permKey || !!user?.permisos?.[permKey]
      })

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
  const isERP      = location.pathname.startsWith('/erp')
  const isSCM      = location.pathname.startsWith('/scm')
  const isSST      = location.pathname.startsWith('/sst')

  const activeColor = isCommand ? CC_COLOR : isConfig ? CF_COLOR : isTarifax ? TX_COLOR : isGRC ? GRC_COLOR : isQMS ? QMS_COLOR : isDMS ? DMS_COLOR : isTMS ? TMS_COLOR : isFletes ? FT_COLOR : isFlota ? GF_COLOR : isLocativa ? ML_COLOR : isWMS ? WMS_COLOR : isGH ? GH_COLOR : isLMS ? LMS_COLOR : isCRM ? CRM_COLOR : isEAM ? EAM_COLOR : isMES ? MES_COLOR : isAPS ? APS_COLOR : isERP ? ERP_COLOR : isSCM ? SCM_COLOR : isSST ? SST_COLOR : CI_COLOR
  const navItems    = isCommand ? CC_NAV_ITEMS : isConfig ? CONFIG_NAV_ITEMS : isTarifax ? TX_NAV_ITEMS : isGRC ? GRC_NAV_ITEMS : isQMS ? QMS_NAV_ITEMS : isDMS ? DMS_NAV_ITEMS : isTMS ? TMS_NAV_ITEMS : isFletes ? FT_NAV_ITEMS : isFlota ? GF_NAV_ITEMS : isLocativa ? ML_NAV_ITEMS : isWMS ? WMS_NAV_ITEMS : isGH ? GH_NAV_ITEMS : isLMS ? LMS_NAV_ITEMS : isCRM ? CRM_NAV_ITEMS : isEAM ? EAM_NAV_ITEMS : isMES ? MES_NAV_ITEMS : isAPS ? APS_NAV_ITEMS : isERP ? ERP_NAV_ITEMS : isSCM ? SCM_NAV_ITEMS : isSST ? SST_NAV_ITEMS : visibleCIItems
  const sections    = isCommand ? CC_SECTIONS  : isConfig ? CONFIG_SECTIONS  : isTarifax ? TX_SECTIONS  : isGRC ? GRC_SECTIONS  : isQMS ? QMS_SECTIONS  : isDMS ? DMS_SECTIONS  : isTMS ? TMS_SECTIONS  : isFletes ? FT_SECTIONS  : isFlota ? GF_SECTIONS  : isLocativa ? ML_SECTIONS  : isWMS ? WMS_SECTIONS : isGH ? GH_SECTIONS : isLMS ? LMS_SECTIONS : isCRM ? CRM_SECTIONS : isEAM ? EAM_SECTIONS : isMES ? MES_SECTIONS : isAPS ? APS_SECTIONS : isERP ? ERP_SECTIONS : isSCM ? SCM_SECTIONS : isSST ? SST_SECTIONS : CI_SECTIONS

  const logoShort = isCommand ? 'CC' : isConfig ? 'CF' : isTarifax ? 'TX' : isGRC ? 'GRC' : isQMS ? 'QMS' : isDMS ? 'DMS' : isTMS ? 'TMS' : isFletes ? 'FT' : isFlota ? 'GF' : isLocativa ? 'ML' : isWMS ? 'WMS' : isGH ? 'GH' : isLMS ? 'LMS' : isCRM ? 'CRM' : isEAM ? 'EAM' : isMES ? 'MES' : isAPS ? 'APS' : isERP ? 'ERP' : isSCM ? 'SCM' : isSST ? 'SST' : 'CE'
  const logoLine1 = isCommand ? t('logo.cc1') : isConfig ? t('logo.cfg1') : isTarifax ? t('logo.tx1') : isGRC ? t('logo.grc1') : isQMS ? t('logo.qms1') : isDMS ? t('logo.dms1') : isTMS ? t('logo.tms1') : isFletes ? t('logo.ft1') : isFlota ? t('logo.gf1') : isLocativa ? t('logo.ml1') : isWMS ? t('logo.wms1') : isGH ? t('logo.gh1') : isLMS ? t('logo.lms1') : isCRM ? t('logo.crm1') : isEAM ? t('logo.eam1') : isMES ? t('logo.mes1') : isAPS ? t('logo.aps1') : isERP ? t('logo.erp1') : isSCM ? t('logo.scm1') : isSST ? t('logo.sst1') : t('logo.ci1')
  const logoLine2 = isCommand ? t('logo.cc2') : isConfig ? t('logo.cfg2') : isTarifax ? t('logo.tx2') : isGRC ? t('logo.grc2') : isQMS ? t('logo.qms2') : isDMS ? t('logo.dms2') : isTMS ? t('logo.tms2') : isFletes ? t('logo.ft2') : isFlota ? t('logo.gf2') : isLocativa ? t('logo.ml2') : isWMS ? t('logo.wms2') : isGH ? t('logo.gh2') : isLMS ? t('logo.lms2') : isCRM ? t('logo.crm2') : isEAM ? t('logo.eam2') : isMES ? t('logo.mes2') : isAPS ? t('logo.aps2') : isERP ? t('logo.erp2') : isSCM ? t('logo.scm2') : isSST ? t('logo.sst2') : t('logo.ci2')

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
              ? `linear-gradient(135deg, ${GF_COLOR} 0%, #27884A 100%)`
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
              ? `linear-gradient(135deg, ${EAM_COLOR} 0%, #27884A 100%)`
              : isMES
              ? `linear-gradient(135deg, ${MES_COLOR} 0%, #0E7490 100%)`
              : isAPS
              ? `linear-gradient(135deg, ${APS_COLOR} 0%, #6D28D9 100%)`
              : isERP
              ? `linear-gradient(135deg, ${ERP_COLOR} 0%, #1E40AF 100%)`
              : isSCM
              ? `linear-gradient(135deg, ${SCM_COLOR} 0%, #0A3D72 100%)`
              : isSST
              ? `linear-gradient(135deg, ${SST_COLOR} 0%, #7F1D1D 100%)`
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
                  {t(section)}
                </Typography>
              )}
              <List disablePadding>
                {items.map(item => {
                  const active = location.pathname === item.path ||
                    (!item.exact && item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                  return (
                    <Tooltip
                      key={item.path}
                      title={!showText ? t(item.label) : ''}
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
                              primary={t(item.label)}
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
              primary={t('common.collapse')}
              primaryTypographyProps={{ fontSize: 12.5, color: 'inherit', fontWeight: 500 }}
            />
          )}
        </ListItemButton>
      </Box>
    </Box>
  )
}
