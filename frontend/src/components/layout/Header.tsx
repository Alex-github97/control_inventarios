import React, { useState } from 'react'
import {
  AppBar, Toolbar, Typography, Box, IconButton, Avatar, Badge,
  Chip, Tooltip, alpha, Popover, List, ListItem, Divider, Button,
} from '@mui/material'
import { Notifications, QrCode2, LogoutOutlined, NotificationsNone } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useQuery, useIsFetching, useIsMutating } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const PRIMARY = '#32AC5C'

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

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
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
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        color: '#1E293B',
        zIndex: 1100,
        // hairline degradado en el borde inferior
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${alpha(PRIMARY, 0.35)}, transparent)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: '64px !important' }}>
        {title ? (
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#0D1117', letterSpacing: '-0.01em' }}
            >
              {title}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1 }} />
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Escanear QR">
            <IconButton
              size="small"
              onClick={() => navigate('/estibas/scan')}
              sx={{
                color: '#94A3B8', width: 36, height: 36, borderRadius: '10px',
                '&:hover': { bgcolor: alpha(PRIMARY, 0.08), color: PRIMARY },
                transition: 'all 0.15s ease',
              }}
            >
              <QrCode2 fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Botón de alertas — abre popover */}
          <IconButton
            size="small"
            onClick={e => setAlertAnchor(e.currentTarget)}
            sx={{
              color: alertCount ? '#EF4444' : '#94A3B8',
              width: 36, height: 36, borderRadius: '10px',
              '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', color: '#EF4444' },
              transition: 'all 0.15s ease',
            }}
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
              <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#1E293B' }}>
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
                          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#1E293B', lineHeight: 1.35 }}>
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
                sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 600, color: PRIMARY }}
              >
                Ver todas las alertas →
              </Button>
            </Box>
          </Popover>

          <Box sx={{ width: 1, height: 24, bgcolor: '#E2E8F0', mx: 0.5 }} />

          {/* User */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 0.5, pr: 0.5, py: 0.5, borderRadius: '12px', cursor: 'default' }}>
            <Avatar sx={{
              width: 32, height: 32, fontSize: 12, fontWeight: 700,
              background: `linear-gradient(135deg, ${PRIMARY} 0%, #27884A 100%)`,
              boxShadow: `0 2px 8px ${alpha(PRIMARY, 0.35)}`,
            }}>
              {initials}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#1E293B', lineHeight: 1.2 }}>
                {user?.nombre} {user?.apellido}
              </Typography>
              <Chip
                label={rolLabel}
                size="small"
                sx={{
                  height: 16, fontSize: 10, fontWeight: 700,
                  bgcolor: alpha(PRIMARY, 0.1), color: '#27884A',
                  border: `1px solid ${alpha(PRIMARY, 0.2)}`,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            </Box>

            <Tooltip title="Cerrar sesión">
              <IconButton
                size="small"
                onClick={logout}
                sx={{
                  color: '#CBD5E1', width: 32, height: 32, borderRadius: '8px',
                  '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', color: '#EF4444' },
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
            background: `linear-gradient(90deg, transparent, ${PRIMARY}, #5FD184, transparent)`,
            animation: 'progressSlide 1.1s ease-in-out infinite',
          }}
        />
      </Box>
    </AppBar>
  )
}
