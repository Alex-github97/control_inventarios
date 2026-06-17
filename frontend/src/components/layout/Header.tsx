import React from 'react'
import { AppBar, Toolbar, Typography, Box, IconButton, Avatar, Badge, Chip, Tooltip, alpha } from '@mui/material'
import { Notifications, QrCode2, LogoutOutlined } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

const PRIMARY = '#32AC5C'

const ROL_LABEL: Record<string, string> = {
  ADMINISTRADOR:        'Admin',
  SUPERVISOR_LOGISTICO: 'Supervisor',
  OPERADOR_BODEGA:      'Operador',
}

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const { data: alertCount } = useQuery({
    queryKey: ['alertas-count'],
    queryFn: () => apiClient.get<{ count: number }>('/alertas/no-leidas/count').then(r => r.data.count),
    refetchInterval: 60000,
  })

  const initials = `${user?.nombre?.[0] ?? ''}${user?.apellido?.[0] ?? ''}`.toUpperCase()
  const rolLabel = ROL_LABEL[user?.rol ?? ''] ?? user?.rol?.replace('_', ' ') ?? ''

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        color: '#1E293B',
        zIndex: 1100,
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: '64px !important' }}>
        {/* Page title */}
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

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Escanear QR">
            <IconButton
              size="small"
              onClick={() => navigate('/estibas/scan')}
              sx={{
                color: '#94A3B8',
                width: 36, height: 36,
                borderRadius: '10px',
                '&:hover': { bgcolor: alpha(PRIMARY, 0.08), color: PRIMARY },
                transition: 'all 0.15s ease',
              }}
            >
              <QrCode2 fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Alertas">
            <IconButton
              size="small"
              onClick={() => navigate('/alertas')}
              sx={{
                color: '#94A3B8',
                width: 36, height: 36,
                borderRadius: '10px',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', color: '#EF4444' },
                transition: 'all 0.15s ease',
              }}
            >
              <Badge
                badgeContent={alertCount || 0}
                color="error"
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: 10,
                    height: 16,
                    minWidth: 16,
                    padding: '0 4px',
                  },
                }}
              >
                <Notifications fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Divider */}
          <Box sx={{ width: 1, height: 24, bgcolor: '#E2E8F0', mx: 0.5 }} />

          {/* User */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              pl: 0.5,
              pr: 0.5,
              py: 0.5,
              borderRadius: '12px',
              cursor: 'default',
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: 12,
                fontWeight: 700,
                background: `linear-gradient(135deg, ${PRIMARY} 0%, #27884A 100%)`,
                boxShadow: `0 2px 8px ${alpha(PRIMARY, 0.35)}`,
              }}
            >
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
                  height: 16,
                  fontSize: 10,
                  fontWeight: 700,
                  bgcolor: alpha(PRIMARY, 0.1),
                  color: '#27884A',
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
                  color: '#CBD5E1',
                  width: 32, height: 32,
                  borderRadius: '8px',
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
    </AppBar>
  )
}
