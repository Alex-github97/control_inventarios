import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, Typography, Tooltip, alpha } from '@mui/material'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from 'react-i18next'

// Claves de permiso requeridas por workspace (vacío = siempre visible)
const WORKSPACE_PERM_KEYS: Record<string, string[]> = {
  control:  ['dashboard','estibas','movimientos','manifiestos','vehiculos','ubicaciones','proveedores','alertas','danos','trazabilidad','mantenimiento','costos','consultas'],
  tarifax:  ['tx'],
  grc:      ['grc'],
  qms:      ['qms'],
  dms:      ['dms'],
  tms:      ['tms', 'ft'],
  eam:      ['eam', 'gf', 'ml'],
  wms:      ['wms'],
  gh:       ['gh'],
  command:  [],
  lms:      ['lms'],
  crm:      ['crm'],
  mes:      ['mes'],
  aps:      ['aps'],
  erp:      ['erp'],
  scm:      ['scm'],
  config:   ['usuarios'],
}

const PANEL_BG         = '#060C1A'
const CI_COLOR         = '#32AC5C'
const TX_COLOR         = '#48BB78'
const CF_COLOR         = '#6366F1'
const CC_COLOR         = '#0EA5E9'
const GF_COLOR         = '#7C3AED'
const ML_COLOR         = '#0D9488'
const WMS_COLOR        = '#1E40AF'
const GH_COLOR         = '#BE185D'
const TMS_COLOR        = '#0369A1'
const DMS_COLOR        = '#0E7490'
const QMS_COLOR        = '#059669'
const GRC_COLOR        = '#6D28D9'
const LMS_COLOR        = '#D97706'
const CRM_COLOR        = '#DC2626'
const EAM_COLOR        = '#EA580C'
const MES_COLOR        = '#0891B2'
const APS_COLOR        = '#7C3AED'
const ERP_COLOR        = '#1A3A6B'
const SCM_COLOR        = '#0C4D8C'
const COMPACT_THRESHOLD = 80

const WORKSPACES = [
  {
    id:    'control',
    label: 'ws.control',
    short: 'CE',
    color: CI_COLOR,
    path:  '/dashboard',
    isActive: (p: string) =>
      !p.startsWith('/tarifax') && !p.startsWith('/usuarios') &&
      !p.startsWith('/command-center') && !p.startsWith('/fletes') &&
      !p.startsWith('/tms') && !p.startsWith('/dms') && !p.startsWith('/qms') &&
      !p.startsWith('/grc') && !p.startsWith('/flota') && !p.startsWith('/locativa') &&
      !p.startsWith('/wms') && !p.startsWith('/gh') && !p.startsWith('/lms') &&
      !p.startsWith('/crm') && !p.startsWith('/eam') && !p.startsWith('/mes') && !p.startsWith('/aps') && !p.startsWith('/erp'),
  },
  {
    id:    'tarifax',
    label: 'ws.tarifax',
    short: 'TX',
    color: TX_COLOR,
    path:  '/tarifax/tablero',
    isActive: (p: string) => p.startsWith('/tarifax'),
  },
  {
    id:    'grc',
    label: 'ws.grc',
    short: 'GRC',
    color: GRC_COLOR,
    path:  '/grc',
    isActive: (p: string) => p.startsWith('/grc'),
  },
  {
    id:    'qms',
    label: 'ws.qms',
    short: 'QMS',
    color: QMS_COLOR,
    path:  '/qms',
    isActive: (p: string) => p.startsWith('/qms'),
  },
  {
    id:    'dms',
    label: 'ws.dms',
    short: 'DMS',
    color: DMS_COLOR,
    path:  '/dms',
    isActive: (p: string) => p.startsWith('/dms'),
  },
  {
    id:    'tms',
    label: 'ws.tms',
    short: 'TMS',
    color: TMS_COLOR,
    path:  '/tms',
    isActive: (p: string) => p.startsWith('/tms') || p.startsWith('/fletes'),
  },
  {
    id:    'eam',
    label: 'ws.eam',
    short: 'EAM',
    color: EAM_COLOR,
    path:  '/eam',
    isActive: (p: string) => p.startsWith('/eam') || p.startsWith('/flota') || p.startsWith('/locativa'),
  },
  {
    id:    'wms',
    label: 'ws.wms',
    short: 'WMS',
    color: WMS_COLOR,
    path:  '/wms',
    isActive: (p: string) => p.startsWith('/wms'),
  },
  {
    id:    'gh',
    label: 'ws.gh',
    short: 'GH',
    color: GH_COLOR,
    path:  '/gh',
    isActive: (p: string) => p.startsWith('/gh'),
  },
  {
    id:    'command',
    label: 'ws.command',
    short: 'CC',
    color: CC_COLOR,
    path:  '/command-center',
    isActive: (p: string) => p.startsWith('/command-center'),
  },
  {
    id:    'lms',
    label: 'ws.lms',
    short: 'LMS',
    color: LMS_COLOR,
    path:  '/lms',
    isActive: (p: string) => p.startsWith('/lms'),
  },
  {
    id:    'crm',
    label: 'ws.crm',
    short: 'CRM',
    color: CRM_COLOR,
    path:  '/crm',
    isActive: (p: string) => p.startsWith('/crm'),
  },
  {
    id:    'mes',
    label: 'ws.mes',
    short: 'MES',
    color: MES_COLOR,
    path:  '/mes',
    isActive: (p: string) => p.startsWith('/mes'),
  },
  {
    id:    'aps',
    label: 'ws.aps',
    short: 'APS',
    color: APS_COLOR,
    path:  '/aps',
    isActive: (p: string) => p.startsWith('/aps'),
  },
  {
    id:    'erp',
    label: 'ws.erp',
    short: 'ERP',
    color: ERP_COLOR,
    path:  '/erp',
    isActive: (p: string) => p.startsWith('/erp'),
  },
  {
    id:    'scm',
    label: 'ws.scm',
    short: 'SCM',
    color: SCM_COLOR,
    path:  '/scm',
    isActive: (p: string) => p.startsWith('/scm'),
  },
  {
    id:    'config',
    label: 'ws.config',
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
  const { user }        = useAuthStore()
  const { t }           = useTranslation()
  const isAdmin         = user?.rol === 'ADMINISTRADOR'

  const visibleWorkspaces = WORKSPACES.filter(ws => {
    if (isAdmin) return true
    const keys = WORKSPACE_PERM_KEYS[ws.id]
    if (!keys || keys.length === 0) return true
    return keys.some(k => user?.permisos?.[k])
  })

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
            {t('ws.espacios')}
          </Typography>
        )}
      </Box>

      {/* Workspace items */}
      <Box sx={{ flex: 1, p: 0.75, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {visibleWorkspaces.map(ws => {
          const active = ws.isActive(pathname)
          return (
            <Tooltip key={ws.id} title={!showText ? t(ws.label) : ''} placement="right" arrow>
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
                      {t(ws.label)}
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
