import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, alpha } from '@mui/material'
import { Schedule, OpenInNew } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { COMMAND_CENTER_DASHBOARDS } from '@/config/commandCenter'

const CC_COLOR = '#0EA5E9'

export default function CommandCenter() {
  const { dashboardId } = useParams<{ dashboardId: string }>()
  const navigate = useNavigate()

  // Si no hay ID, redirige al primer dashboard disponible
  React.useEffect(() => {
    if (!dashboardId) {
      const first = COMMAND_CENTER_DASHBOARDS.find(d => d.url) ?? COMMAND_CENTER_DASHBOARDS[0]
      navigate(first.path, { replace: true })
    }
  }, [dashboardId, navigate])

  const dashboard = COMMAND_CENTER_DASHBOARDS.find(d => d.id === dashboardId)

  if (!dashboard) return null

  // ── Placeholder "Próximamente" ──────────────────────────────────────────
  if (!dashboard.url) {
    return (
      <Layout title={dashboard.shortLabel} noPadding={false}>
        <Box
          sx={{
            height: '100%',
            minHeight: 400,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          {/* Icono */}
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '20px',
              bgcolor: alpha(dashboard.color, 0.12),
              border: `2px solid ${alpha(dashboard.color, 0.25)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1,
            }}
          >
            <Schedule sx={{ fontSize: 36, color: dashboard.color }} />
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: '#1E293B', letterSpacing: '-0.02em' }}>
            Próximamente
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#64748B', textAlign: 'center', maxWidth: 380, lineHeight: 1.7 }}>
            El dashboard de <strong>{dashboard.label}</strong> está en construcción.
            Será publicado en cuanto esté disponible.
          </Typography>

          {/* Chip del color del dashboard */}
          <Box
            sx={{
              mt: 1,
              px: 2, py: 0.75,
              borderRadius: '20px',
              bgcolor: alpha(dashboard.color, 0.1),
              border: `1px solid ${alpha(dashboard.color, 0.25)}`,
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: dashboard.color }}>
              {dashboard.shortLabel}
            </Typography>
          </Box>
        </Box>
      </Layout>
    )
  }

  // ── Dashboard con iframe Power BI ───────────────────────────────────────
  return (
    <Layout title={dashboard.shortLabel} noPadding>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Barra superior con nombre completo y enlace externo */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 1,
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: dashboard.color,
                boxShadow: `0 0 6px ${alpha(dashboard.color, 0.7)}`,
              }}
            />
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
              {dashboard.label}
            </Typography>
          </Box>
          <Box
            component="a"
            href={dashboard.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: 12,
              color: '#94A3B8',
              textDecoration: 'none',
              px: 1.5,
              py: 0.5,
              borderRadius: '6px',
              '&:hover': { color: CC_COLOR, bgcolor: alpha(CC_COLOR, 0.06) },
              transition: 'all 0.15s',
            }}
          >
            <OpenInNew sx={{ fontSize: 14 }} />
            Abrir en Power BI
          </Box>
        </Box>

        {/* iframe */}
        <Box
          component="iframe"
          src={dashboard.url}
          title={dashboard.label}
          allowFullScreen
          sx={{
            flex: 1,
            width: '100%',
            border: 'none',
            display: 'block',
          }}
        />
      </Box>
    </Layout>
  )
}
