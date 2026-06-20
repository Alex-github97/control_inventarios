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

  const isFletes   = location.pathname.startsWith('/fletes')
  const isFlota    = location.pathname.startsWith('/flota')
  const isTarifax  = location.pathname.startsWith('/tarifax')
  const isConfig   = location.pathname.startsWith('/usuarios')
  const isCommand  = location.pathname.startsWith('/command-center')
  const isLocativa = location.pathname.startsWith('/locativa')
  const isWMS      = location.pathname.startsWith('/wms')
  const isGH       = location.pathname.startsWith('/gh')

  const activeColor = isCommand ? CC_COLOR : isConfig ? CF_COLOR : isTarifax ? TX_COLOR : isFletes ? FT_COLOR : isFlota ? GF_COLOR : isLocativa ? ML_COLOR : isWMS ? WMS_COLOR : isGH ? GH_COLOR : CI_COLOR
  const navItems    = isCommand ? CC_NAV_ITEMS : isConfig ? CONFIG_NAV_ITEMS : isTarifax ? TX_NAV_ITEMS : isFletes ? FT_NAV_ITEMS : isFlota ? GF_NAV_ITEMS : isLocativa ? ML_NAV_ITEMS : isWMS ? WMS_NAV_ITEMS : isGH ? GH_NAV_ITEMS : CI_NAV_ITEMS
  const sections    = isCommand ? CC_SECTIONS  : isConfig ? CONFIG_SECTIONS  : isTarifax ? TX_SECTIONS  : isFletes ? FT_SECTIONS  : isFlota ? GF_SECTIONS  : isLocativa ? ML_SECTIONS  : isWMS ? WMS_SECTIONS : isGH ? GH_SECTIONS : CI_SECTIONS

  const logoShort = isCommand ? 'CC' : isConfig ? 'CF' : isTarifax ? 'TX' : isFletes ? 'FT' : isFlota ? 'GF' : isLocativa ? 'ML' : isWMS ? 'WMS' : isGH ? 'GH' : 'CE'
  const logoLine1 = isCommand ? 'Command' : isConfig ? 'Configuración' : isTarifax ? 'TarifaX' : isFletes ? 'Módulo de' : isFlota ? 'Gestión de' : isLocativa ? 'Mantenimiento' : isWMS ? 'Warehouse' : isGH ? 'Gestión' : 'Control de'
  const logoLine2 = isCommand ? 'Center'  : isConfig ? 'del Sistema'  : isTarifax ? 'Motor de Tarifas' : isFletes ? 'Fletes' : isFlota ? 'Flotas' : isLocativa ? 'Locativo' : isWMS ? 'Management' : isGH ? 'Humana' : 'Estibas'

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
              : isFletes
              ? `linear-gradient(135deg, ${FT_COLOR} 0%, #D97706 100%)`
              : isFlota
              ? `linear-gradient(135deg, ${GF_COLOR} 0%, #5B21B6 100%)`
              : isCommand
              ? `linear-gradient(135deg, ${CC_COLOR} 0%, #0369A1 100%)`
              : isLocativa
              ? `linear-gradient(135deg, ${ML_COLOR} 0%, #0F766E 100%)`
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
