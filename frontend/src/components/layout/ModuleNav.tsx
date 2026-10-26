import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Button, Menu, MenuItem, ListItemIcon, ListItemText, Typography, alpha } from '@mui/material'
import { KeyboardArrowDownRounded } from '@mui/icons-material'
import { COLOR_MODULO } from '@/config/marca'
import { useModuleNav } from './Sidebar'

// Por encima de esta cantidad de ítems, el menú se agrupa por secciones desplegables
const FLAT_MAX_ITEMS = 7

interface NavEntry {
  label: string
  icon: React.ReactNode
  path: string
  exact?: boolean
}

function isActivePath(pathname: string, item: NavEntry) {
  return pathname === item.path ||
    (!item.exact && item.path !== '/dashboard' && pathname.startsWith(item.path))
}

interface ModuleNavProps {
  title?: string
}

export function ModuleNav({ title }: ModuleNavProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const { navItems, sections } = useModuleNav()
  // Sobre la barra blanca va el acento base; el del módulo es el tono para fondo oscuro
  const activeColor = COLOR_MODULO
  const [menu, setMenu] = useState<{ anchor: HTMLElement; section: string } | null>(null)

  const flat = sections.length === 1 || navItems.length <= FLAT_MAX_ITEMS
  const groups = sections
    .map(section => ({ section, items: navItems.filter(i => i.section === section) }))
    .filter(g => g.items.length > 0)

  // Pestaña del menú: texto gris, color del módulo y subrayado cuando está activa
  const tabSx = (active: boolean) => ({
    position: 'relative' as const,
    height: '100%',
    px: 1.5,
    minWidth: 0,
    borderRadius: 0,
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
    textTransform: 'none' as const,
    fontSize: 13.5,
    fontWeight: active ? 600 : 500,
    letterSpacing: active ? '-0.01em' : 'normal',
    color: active ? activeColor : '#4D4D4D',
    '& .MuiButton-startIcon': { mr: 0.75, color: active ? activeColor : '#8C8C8C', transition: 'color 0.15s ease' },
    '&::after': {
      content: '""',
      position: 'absolute' as const,
      left: 10, right: 10, bottom: 0,
      height: 2.5,
      borderRadius: '3px 3px 0 0',
      background: active ? activeColor : 'transparent',
      boxShadow: active ? `0 -2px 10px ${alpha(activeColor, 0.45)}` : 'none',
      transition: 'background 0.2s ease',
    },
    '&:hover': {
      bgcolor: alpha(activeColor, 0.05),
      color: active ? activeColor : '#1A1A1A',
      '& .MuiButton-startIcon': { color: activeColor },
    },
    transition: 'color 0.15s ease, background 0.15s ease',
  })

  const renderLink = (item: NavEntry) => (
    <Button
      key={item.path}
      onClick={() => navigate(item.path)}
      startIcon={item.icon}
      sx={tabSx(isActivePath(pathname, item))}
    >
      {t(item.label)}
    </Button>
  )

  const openGroup = menu ? groups.find(g => g.section === menu.section) : undefined

  return (
    <Box
      component="nav"
      sx={{
        height: 48,
        display: 'flex',
        alignItems: 'stretch',
        bgcolor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'saturate(180%) blur(8px)',
        borderBottom: '1px solid #E5E5E5',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        px: { xs: 1, sm: 1.5 },
      }}
    >
      <Box
        sx={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'stretch',
          overflowX: 'auto', overflowY: 'hidden',
          '&::-webkit-scrollbar': { height: 0 },
        }}
      >
        {flat
          ? navItems.map(renderLink)
          : groups.map(({ section, items }) => {
              if (items.length === 1) return renderLink(items[0])
              const active = items.some(i => isActivePath(pathname, i))
              const isOpen = menu?.section === section
              return (
                <Button
                  key={section}
                  onClick={e => setMenu({ anchor: e.currentTarget, section })}
                  endIcon={
                    <KeyboardArrowDownRounded
                      sx={{ fontSize: '18px !important', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                    />
                  }
                  sx={{ ...tabSx(active), '& .MuiButton-endIcon': { ml: 0.25 } }}
                >
                  {t(section)}
                </Button>
              )
            })}
      </Box>

      {title && (
        <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', pl: 2, flexShrink: 0, maxWidth: 320 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: activeColor, mr: 1, boxShadow: `0 0 8px ${alpha(activeColor, 0.7)}` }} />
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.01em' }}>
            {title}
          </Typography>
        </Box>
      )}

      <Menu
        open={Boolean(menu)}
        anchorEl={menu?.anchor}
        onClose={() => setMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          elevation: 6,
          sx: { mt: 0.5, minWidth: 230, borderRadius: '12px', border: '1px solid #E5E5E5', py: 0.5 },
        }}
      >
        {openGroup?.items.map(item => {
          const active = isActivePath(pathname, item)
          return (
            <MenuItem
              key={item.path}
              onClick={() => { setMenu(null); navigate(item.path) }}
              sx={{
                mx: 0.75, my: 0.25, borderRadius: '8px', py: 0.9,
                bgcolor: active ? alpha(activeColor, 0.1) : 'transparent',
                '&:hover': { bgcolor: active ? alpha(activeColor, 0.14) : alpha(activeColor, 0.06) },
              }}
            >
              <ListItemIcon sx={{ minWidth: '32px !important', color: active ? activeColor : '#8C8C8C' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={t(item.label)}
                primaryTypographyProps={{
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? activeColor : '#333333',
                }}
              />
              {active && (
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: activeColor, ml: 1.5, boxShadow: `0 0 8px ${activeColor}` }} />
              )}
            </MenuItem>
          )
        })}
      </Menu>
    </Box>
  )
}
