import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Tooltip, alpha, Button,
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
  ChevronLeft, ChevronRight,
  BarChart as TableroIcon,
  MergeType as MotorIcon,
} from '@mui/icons-material'

const DRAWER_WIDTH     = 252
const DRAWER_COLLAPSED = 68
const CI_COLOR  = '#32AC5C'
const TX_COLOR  = '#369E4D'

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
  section?: string
}

const CI_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    icon: <DashboardIcon   fontSize="small" />, path: '/dashboard',    section: 'Principal' },
  { label: 'Estibas',      icon: <EstibasIcon     fontSize="small" />, path: '/estibas',      section: 'Principal' },
  { label: 'Movimientos',  icon: <MovimientosIcon fontSize="small" />, path: '/movimientos',  section: 'Operaciones' },
  { label: 'Trazabilidad', icon: <TrazabilidadIcon fontSize="small"/>, path: '/trazabilidad', section: 'Operaciones' },
  { label: 'Manifiestos',  icon: <ManifiestosIcon fontSize="small" />, path: '/manifiestos',  section: 'Operaciones' },
  { label: 'Vehículos',    icon: <VehiculosIcon   fontSize="small" />, path: '/vehiculos',    section: 'Recursos' },
  { label: 'Ubicaciones',  icon: <UbicacionesIcon fontSize="small" />, path: '/ubicaciones',  section: 'Recursos' },
  { label: 'Proveedores',  icon: <ProveedoresIcon fontSize="small" />, path: '/proveedores',  section: 'Recursos' },
  { label: 'Mantenimiento', icon: <MantenimientoIcon fontSize="small" />, path: '/mantenimiento', section: 'Operaciones' },
  { label: 'Daños',        icon: <DanosIcon       fontSize="small" />, path: '/danos',        section: 'Control' },
  { label: 'Alertas',      icon: <AlertasIcon     fontSize="small" />, path: '/alertas',      section: 'Control' },
  { label: 'Costos',       icon: <CostosIcon      fontSize="small" />, path: '/costos',       section: 'Control' },
  { label: 'Usuarios',     icon: <UsuariosIcon    fontSize="small" />, path: '/usuarios',     section: 'Control' },
]

const TX_NAV_ITEMS: NavItem[] = [
  { label: 'Tablero', icon: <TableroIcon fontSize="small" />, path: '/tarifax/tablero', section: 'TarifaX' },
  { label: 'Motor TarifaX', icon: <MotorIcon fontSize="small" />, path: '/tarifax/motor', section: 'TarifaX' },
]

const CI_SECTIONS = ['Principal', 'Operaciones', 'Recursos', 'Control']
const TX_SECTIONS = ['TarifaX']

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const isTarifax   = location.pathname.startsWith('/tarifax')
  const activeColor = isTarifax ? TX_COLOR : CI_COLOR
  const navItems    = isTarifax ? TX_NAV_ITEMS : CI_NAV_ITEMS
  const sections    = isTarifax ? TX_SECTIONS  : CI_SECTIONS

  const width = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
          overflowX: 'hidden',
          background: '#111827',
          borderRight: '1px solid rgba(255,255,255,0.04)',
        },
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          px: collapsed ? 1.5 : 2.5,
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
            background: `linear-gradient(135deg, ${activeColor} 0%, ${isTarifax ? '#1f6130' : '#27884A'} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${alpha(activeColor, 0.4)}`,
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: 13, letterSpacing: '-0.5px' }}>
            {isTarifax ? 'TX' : 'CI'}
          </Typography>
        </Box>
        {!collapsed && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              {isTarifax ? 'TarifaX' : 'Control de'}
            </Typography>
            <Typography sx={{ color: activeColor, fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, whiteSpace: 'nowrap', transition: 'color 0.3s ease' }}>
              {isTarifax ? 'Motor de Tarifas' : 'Inventarios'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* App switcher */}
      <Box sx={{ px: collapsed ? 1 : 1.5, pt: 1.25, pb: 0.5 }}>
        {collapsed ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Tooltip title="Control de Inventarios" placement="right" arrow>
              <Box
                onClick={() => navigate('/dashboard')}
                sx={{
                  width: 44, height: 28, borderRadius: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: !isTarifax ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: !isTarifax ? `1px solid ${alpha(CI_COLOR, 0.4)}` : '1px solid transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  transition: 'all 0.15s',
                  mx: 'auto',
                }}
              >
                <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: !isTarifax ? CI_COLOR : 'rgba(255,255,255,0.35)', letterSpacing: '-0.3px' }}>
                  CI
                </Typography>
              </Box>
            </Tooltip>
            <Tooltip title="TarifaX" placement="right" arrow>
              <Box
                onClick={() => navigate('/tarifax/tablero')}
                sx={{
                  width: 44, height: 28, borderRadius: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: isTarifax ? alpha(TX_COLOR, 0.2) : 'transparent',
                  border: isTarifax ? `1px solid ${alpha(TX_COLOR, 0.4)}` : '1px solid transparent',
                  '&:hover': { bgcolor: isTarifax ? alpha(TX_COLOR, 0.25) : 'rgba(255,255,255,0.08)' },
                  transition: 'all 0.15s',
                  mx: 'auto',
                }}
              >
                <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: isTarifax ? TX_COLOR : 'rgba(255,255,255,0.35)', letterSpacing: '-0.3px' }}>
                  TX
                </Typography>
              </Box>
            </Tooltip>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              p: 0.5,
              bgcolor: 'rgba(255,255,255,0.04)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Button
              fullWidth
              size="small"
              onClick={() => navigate('/dashboard')}
              sx={{
                borderRadius: '9px',
                py: 0.6,
                bgcolor: !isTarifax ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: !isTarifax ? '#fff' : 'rgba(255,255,255,0.38)',
                fontWeight: !isTarifax ? 700 : 500,
                fontSize: 11.5,
                minWidth: 0,
                '&:hover': { bgcolor: !isTarifax ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)' },
                transition: 'all 0.15s ease',
                textTransform: 'none',
                letterSpacing: 0,
                boxShadow: !isTarifax ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              Control
            </Button>
            <Button
              fullWidth
              size="small"
              onClick={() => navigate('/tarifax/tablero')}
              sx={{
                borderRadius: '9px',
                py: 0.6,
                bgcolor: isTarifax ? alpha(TX_COLOR, 0.22) : 'transparent',
                color: isTarifax ? TX_COLOR : 'rgba(255,255,255,0.38)',
                fontWeight: isTarifax ? 700 : 500,
                fontSize: 11.5,
                minWidth: 0,
                '&:hover': { bgcolor: isTarifax ? alpha(TX_COLOR, 0.3) : 'rgba(255,255,255,0.06)' },
                transition: 'all 0.15s ease',
                textTransform: 'none',
                letterSpacing: 0,
                boxShadow: isTarifax ? `0 1px 4px ${alpha(TX_COLOR, 0.25)}` : 'none',
              }}
            >
              TarifaX
            </Button>
          </Box>
        )}
      </Box>

      {/* Nav */}
      <Box sx={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1.5, px: collapsed ? 1 : 1.5,
        '&::-webkit-scrollbar': { width: 0 },
      }}>
        {sections.map(section => {
          const items = navItems.filter(i => i.section === section)
          return (
            <Box key={section} sx={{ mb: 0.5 }}>
              {!collapsed && (
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
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                  return (
                    <Tooltip
                      key={item.path}
                      title={collapsed ? item.label : ''}
                      placement="right"
                      arrow
                    >
                      <ListItem disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          onClick={() => navigate(item.path)}
                          sx={{
                            borderRadius: '10px',
                            py: collapsed ? 1.25 : 0.9,
                            px: collapsed ? 1.25 : 1.25,
                            minWidth: 0,
                            justifyContent: collapsed ? 'center' : 'flex-start',
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
                              mr: collapsed ? 0 : 1.25,
                              color: active ? activeColor : 'rgba(255,255,255,0.4)',
                              transition: 'color 0.15s ease',
                              '& svg': {
                                filter: active ? `drop-shadow(0 0 6px ${alpha(activeColor, 0.5)})` : 'none',
                              },
                            }}
                          >
                            {item.icon}
                          </ListItemIcon>
                          {!collapsed && (
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
                          {!collapsed && active && (
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
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: 'rgba(255,255,255,0.3)',
            '&:hover': { color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(255,255,255,0.05)' },
            transition: 'all 0.15s ease',
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.25, color: 'inherit' }}>
            {collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary="Colapsar"
              primaryTypographyProps={{ fontSize: 12.5, color: 'inherit', fontWeight: 500 }}
            />
          )}
        </ListItemButton>
      </Box>
    </Drawer>
  )
}
