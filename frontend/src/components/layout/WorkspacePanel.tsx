import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, Typography, Tooltip, alpha } from '@mui/material'

const PANEL_BG         = '#060C1A'
const CI_COLOR         = '#32AC5C'
const TX_COLOR         = '#48BB78'
const CF_COLOR         = '#6366F1'
const CC_COLOR         = '#0EA5E9'
const FT_COLOR         = '#F59E0B'
const GF_COLOR         = '#7C3AED'
const ML_COLOR         = '#0D9488'
const WMS_COLOR        = '#1E40AF'
const COMPACT_THRESHOLD = 80

const WORKSPACES = [
  {
    id:    'control',
    label: 'Control de Estibas',
    short: 'CE',
    color: CI_COLOR,
    path:  '/dashboard',
    isActive: (p: string) =>
      !p.startsWith('/tarifax') && !p.startsWith('/usuarios') &&
      !p.startsWith('/command-center') && !p.startsWith('/fletes') &&
      !p.startsWith('/flota') && !p.startsWith('/locativa') && !p.startsWith('/wms'),
  },
  {
    id:    'tarifax',
    label: 'TarifaX',
    short: 'TX',
    color: TX_COLOR,
    path:  '/tarifax/tablero',
    isActive: (p: string) => p.startsWith('/tarifax'),
  },
  {
    id:    'fletes',
    label: 'Módulo de Fletes',
    short: 'FT',
    color: FT_COLOR,
    path:  '/fletes',
    isActive: (p: string) => p.startsWith('/fletes'),
  },
  {
    id:    'flota',
    label: 'Gestión de Flotas',
    short: 'GF',
    color: GF_COLOR,
    path:  '/flota',
    isActive: (p: string) => p.startsWith('/flota'),
  },
  {
    id:    'locativa',
    label: 'Mant. Locativo',
    short: 'ML',
    color: ML_COLOR,
    path:  '/locativa',
    isActive: (p: string) => p.startsWith('/locativa'),
  },
  {
    id:    'wms',
    label: 'WMS',
    short: 'WMS',
    color: WMS_COLOR,
    path:  '/wms',
    isActive: (p: string) => p.startsWith('/wms'),
  },
  {
    id:    'command',
    label: 'Command Center',
    short: 'CC',
    color: CC_COLOR,
    path:  '/command-center',
    isActive: (p: string) => p.startsWith('/command-center'),
  },
  {
    id:    'config',
    label: 'Configuración',
    short: 'CF',
    color: CF_COLOR,
    path:  '/usuarios',
    isActive: (p: string) => p.startsWith('/usuarios'),
  },
]

interface WorkspacePanelProps {
  width: number
  dragging?: boolean
}

export function WorkspacePanel({ width, dragging }: WorkspacePanelProps) {
  const navigate        = useNavigate()
  const { pathname }    = useLocation()
  const showText        = width >= COMPACT_THRESHOLD

  return (
    <Box
      sx={{
        width,
        flexShrink: 0,
        background: `linear-gradient(180deg, #0A1628 0%, ${PANEL_BG} 100%)`,
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: dragging ? 'none' : 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: showText ? 'flex-start' : 'center',
          px: showText ? 1.5 : 1,
          gap: 1,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #1A3A72 0%, #0C1E44 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: 8.5, fontWeight: 900, color: 'rgba(255,255,255,0.65)', letterSpacing: '-0.3px' }}>
            IC
          </Typography>
        </Box>

        {showText && (
          <Typography
            sx={{
              fontSize: 9.5,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.28)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Espacios
          </Typography>
        )}
      </Box>

      {/* Workspace items */}
      <Box sx={{ flex: 1, p: 0.75, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {WORKSPACES.map(ws => {
          const active = ws.isActive(pathname)
          return (
            <Tooltip key={ws.id} title={!showText ? ws.label : ''} placement="right" arrow>
              <Box
                onClick={() => navigate(ws.path)}
                sx={{
                  borderRadius: '12px',
                  cursor: 'pointer',
                  p: showText ? '9px 10px' : '9px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: showText ? 1.25 : 0,
                  justifyContent: showText ? 'flex-start' : 'center',
                  background: active ? alpha(ws.color, 0.13) : 'transparent',
                  border: `1px solid ${active ? alpha(ws.color, 0.3) : 'transparent'}`,
                  '&:hover': {
                    background: active ? alpha(ws.color, 0.2) : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${active ? alpha(ws.color, 0.4) : 'rgba(255,255,255,0.08)'}`,
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Badge */}
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    background: active
                      ? `linear-gradient(135deg, ${ws.color} 0%, ${alpha(ws.color, 0.65)} 100%)`
                      : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: active ? `0 4px 14px ${alpha(ws.color, 0.38)}` : 'none',
                    border: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: active ? '#FFF' : 'rgba(255,255,255,0.25)',
                      letterSpacing: '-0.3px',
                    }}
                  >
                    {ws.short}
                  </Typography>
                </Box>

                {showText && (
                  <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        fontWeight: active ? 700 : 500,
                        color: active ? '#FFF' : 'rgba(255,255,255,0.38)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.3,
                      }}
                    >
                      {ws.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: active ? alpha(ws.color, 0.85) : 'rgba(255,255,255,0.2)',
                        fontWeight: 500,
                        lineHeight: 1.3,
                      }}
                    >
                      {active ? 'Activo' : 'Ir al módulo'}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Tooltip>
          )
        })}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 1,
          borderTop: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {showText ? (
          <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.06em' }}>
            v1.4.0
          </Typography>
        ) : (
          <Box sx={{ width: 18, height: 2, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />
        )}
      </Box>
    </Box>
  )
}
