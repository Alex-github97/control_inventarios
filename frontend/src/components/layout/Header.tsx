import React, { useState } from 'react'
import {
  AppBar, Toolbar, Typography, Box, IconButton, Avatar, Badge,
  Chip, Tooltip, alpha, Popover, List, ListItem, Divider, Button,
} from '@mui/material'
import {
  Notifications, QrCode2, LogoutOutlined, NotificationsNone,
  SupportAgent,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useQuery, useIsFetching, useIsMutating } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MARCA, ACENTO, PALETA, SUPERFICIE } from '@/config/marca'
import { Logotipo } from '@/components/Logotipo'
import { useModuleNav } from './Sidebar'
import { BarraModulos } from './BarraModulos'

// Barra superior: las mismas superficies oscuras que tenían el panel de espacios y la barra lateral
const BAR_BG = `linear-gradient(90deg, ${PALETA.abismo} 0%, ${SUPERFICIE.barra} 60%, #171717 100%)`

const ROL_LABEL: Record<string, string> = {
  ADMINISTRADOR:        'Admin',
  SUPERVISOR_LOGISTICO: 'Supervisor',
  OPERADOR_BODEGA:      'Operador',
}

const NIVEL_STYLE: Record<string, { bg: string; color: string }> = {
  CRITICA:     { bg: '#FEF2F2', color: '#DC2626' },
  ADVERTENCIA: { bg: '#FFFBEB', color: '#D97706' },
  INFO:        { bg: '#EFF6FF', color: '#2563EB' },
}

// Botones de icono sobre la barra oscura
const iconoOscuroSx = (hover: string) => ({
  color: 'rgba(255,255,255,0.55)', width: 36, height: 36, borderRadius: '10px',
  '&:hover': { bgcolor: alpha(hover, 0.16), color: hover },
  transition: 'all 0.15s ease',
})

export function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { activeColor, logoShort, logoLine1, logoLine2, logoGradient } = useModuleNav()
  const [alertAnchor, setAlertAnchor] = useState<HTMLElement | null>(null)
  const isFetching = useIsFetching()
  const isMutating = useIsMutating()
  const busy = isFetching + isMutating > 0

  const { data: alertCount } = useQuery({
    queryKey: ['alertas-count'],
    queryFn: () => apiClient.get<{ count: number }>('/alertas/no-leidas/count').then(r => r.data.count),
    refetchInterval: 60000,
  })

  const { data: unreadAlerts = [] } = useQuery({
    queryKey: ['alertas-preview'],
    queryFn: () => apiClient.get('/alertas', { params: { resuelta: false, limit: 5 } }).then(r => r.data),
    refetchInterval: 60000,
  })

  const initials = `${user?.nombre?.[0] ?? ''}${user?.apellido?.[0] ?? ''}`.toUpperCase()
  const rolLabel = ROL_LABEL[user?.rol ?? ''] ?? user?.rol?.replace('_', ' ') ?? ''

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{
        backgroundColor: PALETA.tinta,
        backgroundImage: BAR_BG,
        color: '#FFFFFF',
        borderBottom: `1px solid ${SUPERFICIE.divisorOscuro}`,
      }}
    >
      <Toolbar sx={{ gap: 1.5, minHeight: '60px !important', px: { xs: 1.5, sm: 2.5 } }}>
        {/* Marca del producto + módulo activo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
          {/* El logo lleva al inicio; la ruta "/" decide la página según el usuario */}
          <Tooltip title="Ir al inicio">
            <Box
              component="button"
              type="button"
              onClick={() => navigate('/')}
              aria-label="Ir al inicio"
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.25,
                p: 0.5, m: -0.5, border: 'none', borderRadius: '10px',
                background: 'transparent', cursor: 'pointer',
                transition: 'background 0.15s ease',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                '&:hover .tw-badge': { boxShadow: `0 4px 14px ${alpha(ACENTO.base, 0.5)}` },
                '&:focus-visible': { outline: `2px solid ${ACENTO.claro}`, outlineOffset: 2 },
              }}
            >
              <Box
                className="tw-badge"
                sx={{
                  width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
                  background: `linear-gradient(135deg, ${ACENTO.base} 0%, ${ACENTO.profundo} 100%)`,
                  border: '1px solid rgba(255,255,255,0.16)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'box-shadow 0.15s ease',
                }}
              >
                <Typography sx={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '0.02em' }}>
                  {MARCA.sigla}
                </Typography>
              </Box>
              <Box sx={{ display: { xs: 'none', lg: 'flex' } }}>
                <Logotipo tamano={12} claro />
              </Box>
            </Box>
          </Tooltip>
          <Box sx={{ width: '1px', height: 26, bgcolor: 'rgba(255,255,255,0.12)', flexShrink: 0, mx: 0.5 }} />
          <Box
            sx={{
              width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
              background: logoGradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${alpha(activeColor, 0.35)}`,
              transition: 'background 0.3s ease, box-shadow 0.3s ease',
            }}
          >
            <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: 12, letterSpacing: '-0.5px' }}>
              {logoShort}
            </Typography>
          </Box>
          {/* El nombre largo solo en pantallas anchas: el módulo activo ya se ve resaltado en la barra */}
          <Box sx={{ display: { xs: 'none', xl: 'block' }, whiteSpace: 'nowrap' }}>
            <Typography sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
              {logoLine1}
            </Typography>
            <Typography sx={{ color: activeColor, fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
              {logoLine2}
            </Typography>
          </Box>
        </Box>

        {/* Todos los módulos a la vista; cada uno despliega sus submódulos */}
        <BarraModulos />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Soporte técnico">
            <IconButton size="small" onClick={() => navigate('/soporte')} sx={iconoOscuroSx(ACENTO.claro)}>
              <SupportAgent fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Escanear QR">
            <IconButton size="small" onClick={() => navigate('/estibas/scan')} sx={iconoOscuroSx(ACENTO.claro)}>
              <QrCode2 fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Botón de alertas — abre popover */}
          <IconButton
            size="small"
            onClick={e => setAlertAnchor(e.currentTarget)}
            sx={{ ...iconoOscuroSx('#EF4444'), color: alertCount ? '#F87171' : 'rgba(255,255,255,0.55)' }}
          >
            <Badge
              badgeContent={alertCount || 0}
              color="error"
              max={99}
              sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16, padding: '0 4px' } }}
            >
              <Notifications fontSize="small" />
            </Badge>
          </IconButton>

          {/* Popover de alertas */}
          <Popover
            open={Boolean(alertAnchor)}
            anchorEl={alertAnchor}
            onClose={() => setAlertAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              elevation: 4,
              sx: { borderRadius: '12px', width: 340, mt: 0.5, overflow: 'hidden' },
            }}
          >
            {/* Encabezado */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#1A1A1A' }}>
                Alertas pendientes
              </Typography>
              {alertCount ? (
                <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>
                  {alertCount} sin resolver
                </Typography>
              ) : (
                <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>Sin alertas activas</Typography>
              )}
            </Box>

            {/* Lista */}
            {(unreadAlerts as any[]).length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <NotificationsNone sx={{ fontSize: 36, color: '#CBD5E1', mb: 0.5 }} />
                <Typography sx={{ fontSize: 13, color: '#94A3B8' }}>Todo en orden</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {(unreadAlerts as any[]).map((a: any, i: number) => {
                  const ns = NIVEL_STYLE[a.nivel] ?? NIVEL_STYLE.INFO
                  return (
                    <React.Fragment key={a.id}>
                      {i > 0 && <Divider />}
                      <ListItem sx={{ px: 2, py: 1.25, alignItems: 'flex-start', gap: 1 }}>
                        <Box sx={{
                          mt: 0.3, px: 0.75, py: 0.2, borderRadius: '5px',
                          bgcolor: ns.bg, flexShrink: 0,
                        }}>
                          <Typography sx={{ fontSize: 10, fontWeight: 700, color: ns.color, whiteSpace: 'nowrap' }}>
                            {a.nivel}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.35 }}>
                            {a.titulo}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: '#94A3B8', mt: 0.3 }}>
                            {a.created_at
                              ? format(new Date(a.created_at), "d MMM HH:mm", { locale: es })
                              : ''}
                          </Typography>
                        </Box>
                      </ListItem>
                    </React.Fragment>
                  )
                })}
              </List>
            )}

            {/* Pie */}
            <Box sx={{ borderTop: '1px solid #E2E8F0', px: 2, py: 1 }}>
              <Button
                fullWidth
                size="small"
                onClick={() => { setAlertAnchor(null); navigate('/alertas') }}
                sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 600, color: ACENTO.base }}
              >
                Ver todas las alertas →
              </Button>
            </Box>
          </Popover>

          <Box sx={{ width: '1px', height: 24, bgcolor: 'rgba(255,255,255,0.12)', mx: 0.5, flexShrink: 0 }} />

          {/* User */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 0.5, pr: 0.5, py: 0.5, borderRadius: '12px', cursor: 'default' }}>
            <Avatar sx={{
              width: 32, height: 32, fontSize: 12, fontWeight: 700,
              background: `linear-gradient(135deg, ${ACENTO.base} 0%, ${ACENTO.profundo} 100%)`,
              boxShadow: `0 2px 8px ${alpha(ACENTO.base, 0.35)}`,
            }}>
              {initials}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#FFFFFF', lineHeight: 1.2 }}>
                {user?.nombre} {user?.apellido}
              </Typography>
              <Chip
                label={rolLabel}
                size="small"
                sx={{
                  height: 16, fontSize: 10, fontWeight: 700,
                  bgcolor: alpha(ACENTO.claro, 0.16), color: ACENTO.claro,
                  border: `1px solid ${alpha(ACENTO.claro, 0.3)}`,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            </Box>

            <Tooltip title="Cerrar sesión">
              <IconButton
                size="small"
                onClick={logout}
                sx={{
                  color: 'rgba(255,255,255,0.4)', width: 32, height: 32, borderRadius: '8px',
                  '&:hover': { bgcolor: 'rgba(239,68,68,0.16)', color: '#F87171' },
                  transition: 'all 0.15s ease',
                }}
              >
                <LogoutOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Toolbar>

      {/* Barra de progreso global — visible mientras hay peticiones en vuelo */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -1,
          height: 2.5,
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: busy ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      >
        <Box
          sx={{
            width: '45%',
            height: '100%',
            borderRadius: 99,
            background: `linear-gradient(90deg, transparent, ${ACENTO.base}, ${ACENTO.claro}, transparent)`,
            animation: 'progressSlide 1.1s ease-in-out infinite',
          }}
        />
      </Box>
    </AppBar>
  )
}
