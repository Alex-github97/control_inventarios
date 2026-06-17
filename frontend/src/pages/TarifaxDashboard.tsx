import React from 'react'
import { Box, Typography, Paper, Chip } from '@mui/material'
import { BarChart as BarChartIcon, OpenInNew } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const POWERBI_URL =
  'https://app.powerbi.com/view?r=eyJrIjoiNTA3OGUwYjMtYzFiNC00MGI1LWFiODctMmJhNWJhNGJmYTVlIiwidCI6ImE0ZTY3MjkxLWI5ZTAtNDFmNS05YmUxLTM1NmFiMmMwOTE4YyIsImMiOjR9'

const TX_COLOR = '#369E4D'

export default function TarifaxDashboard() {
  return (
    <Layout title="Tablero TarifaX">
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${TX_COLOR} 0%, #1f6130 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BarChartIcon sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>
              Dashboard de Tarifas
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>
              Panel de control · Métricas de fletes SICETAC
            </Typography>
          </Box>
          <Chip
            label="Power BI"
            size="small"
            icon={<OpenInNew sx={{ fontSize: 12 }} />}
            sx={{
              ml: 'auto',
              bgcolor: '#EEF2FF',
              color: '#4338CA',
              fontWeight: 600,
              fontSize: 11,
              height: 24,
            }}
          />
        </Box>
      </Box>

      {/* Power BI iframe */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
          bgcolor: '#fff',
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {['#EF4444', '#F59E0B', '#10B981'].map((c) => (
              <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
            ))}
          </Box>
          <Typography
            sx={{
              fontSize: 11,
              color: '#94A3B8',
              fontFamily: 'monospace',
              ml: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            app.powerbi.com — Tablero SICETAC
          </Typography>
        </Box>
        <Box sx={{ position: 'relative', width: '100%', height: 680 }}>
          <iframe
            src={POWERBI_URL}
            title="Tablero TarifaX — Power BI"
            width="100%"
            height="100%"
            style={{ border: 'none', display: 'block' }}
            allowFullScreen
          />
        </Box>
      </Paper>

      <Typography
        variant="caption"
        sx={{ display: 'block', textAlign: 'center', color: '#94A3B8', mt: 1.5 }}
      >
        Reporte embebido desde Power BI Service · ICOLTRANS
      </Typography>
    </Layout>
  )
}
