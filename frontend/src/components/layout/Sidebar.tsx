import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Tooltip, alpha
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
  ChevronLeft, ChevronRight,
} from '@mui/icons-material'

const DRAWER_WIDTH     = 252
const DRAWER_COLLAPSED = 68
const PRIMARY = '#32AC5C'

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
  section?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    icon: <DashboardIcon   fontSize="small" />, path: '/dashboard',    section: 'Principal' },
  { label: 'Estibas',      icon: <EstibasIcon     fontSize="small" />, path: '/estibas',      section: 'Principal' },
  { label: 'Movimientos',  icon: <MovimientosIcon fontSize="small" />, path: '/movimientos',  section: 'Operaciones' },
  { label: 'Trazabilidad', icon: <TrazabilidadIcon fontSize="small"/>, path: '/trazabilidad', section: 'Operaciones' },
  { label: 'Manifiestos',  icon: <ManifiestosIcon fontSize="small" />, path: '/manifiestos',  section: 'Operaciones' },
  { label: 'Vehículos',    icon: <VehiculosIcon   fontSize="small" />, path: '/vehiculos',    section: 'Recursos' },
  { label: 'Ubicaciones',  icon: <UbicacionesIcon fontSize="small" />, path: '/ubicaciones',  section: 'Recursos' },
  { label: 'Proveedores',  icon: <ProveedoresIcon fontSize="small" />, path: '/proveedores',  section: 'Recursos' },
  { label: 'Daños',        icon: <DanosIcon       fontSize="small" />, path: '/danos',        section: 'Control' },
  { label: 'Alertas',      icon: <AlertasIcon     fontSize="small" />, path: '/alertas',      section: 'Control' },
  { label: 'Usuarios',     icon: <UsuariosIcon    fontSize="small" />, path: '/usuarios',     section: 'Control' },
]

const SECTIONS = ['Principal', 'Operaciones', 'Recursos', 'Control']

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [collapsed, setCollapsed] = useState(false)

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
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${PRIMARY} 0%, #27884A 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${alpha(PRIMARY, 0.4)}`,
          }}
        >
          <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: 14, letterSpacing: '-0.5px' }}>
            CI
          </Typography>
        </Box>
        {!collapsed && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              Control de
            </Typography>
            <Typography sx={{ color: PRIMARY, fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              Inventarios
            </Typography>
          </Box>
        )}
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1.5, px: collapsed ? 1 : 1.5,
        '&::-webkit-scrollbar': { width: 0 },
      }}>
        {SECTIONS.map(section => {
          const items = NAV_ITEMS.filter(i => i.section === section)
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
                  mt: section !== 'Principal' ? 1 : 0,
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
                              ? `linear-gradient(90deg, ${alpha(PRIMARY, 0.18)}, ${alpha(PRIMARY, 0.08)})`
                              : 'transparent',
                            '&:hover': {
                              background: active
                                ? `linear-gradient(90deg, ${alpha(PRIMARY, 0.22)}, ${alpha(PRIMARY, 0.12)})`
                                : 'rgba(255,255,255,0.05)',
                            },
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 0,
                              mr: collapsed ? 0 : 1.25,
                              color: active ? PRIMARY : 'rgba(255,255,255,0.4)',
                              transition: 'color 0.15s ease',
                              '& svg': {
                                filter: active ? `drop-shadow(0 0 6px ${alpha(PRIMARY, 0.5)})` : 'none',
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
                              bgcolor: PRIMARY,
                              boxShadow: `0 0 8px ${PRIMARY}`,
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
      <Box sx={{
        p: 1.5,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
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
