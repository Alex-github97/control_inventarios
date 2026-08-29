import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, Typography, Tooltip, alpha } from '@mui/material'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from 'react-i18next'

import { COLOR_MODULO_SOBRE_OSCURO, SUPERFICIE, MARCA, ACENTO } from '@/config/marca'
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
  sst:      ['sst'],
  ags:      ['ags'],
  config:   ['usuarios'],
}

// El id del espacio y la clave del módulo del servidor coinciden salvo acá.
// `config` no se lista: administrar la propia empresa es esencial y nunca se
// oculta.
const MODULO_DE_WORKSPACE: Record<string, string> = {
  control: 'control',
  config: 'base',
}

const PANEL_BG         = '#0D0D0D'
const CI_COLOR         = COLOR_MODULO_SOBRE_OSCURO
const TX_COLOR         = COLOR_MODULO_SOBRE_OSCURO
const CF_COLOR         = COLOR_MODULO_SOBRE_OSCURO
const CC_COLOR         = COLOR_MODULO_SOBRE_OSCURO
const GF_COLOR         = COLOR_MODULO_SOBRE_OSCURO
const ML_COLOR         = COLOR_MODULO_SOBRE_OSCURO
const WMS_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const GH_COLOR         = COLOR_MODULO_SOBRE_OSCURO
const TMS_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const DMS_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const QMS_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const GRC_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const LMS_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const CRM_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const EAM_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const MES_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const APS_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const ERP_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const SCM_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const SST_COLOR        = COLOR_MODULO_SOBRE_OSCURO
const AGS_COLOR        = COLOR_MODULO_SOBRE_OSCURO
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
      !p.startsWith('/crm') && !p.startsWith('/eam') && !p.startsWith('/mes') && !p.startsWith('/aps') && !p.startsWith('/erp') && !p.startsWith('/ags'),
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
    id:    'ags',
    label: 'ws.ags',
    short: 'AGS',
    color: AGS_COLOR,
    path:  '/ags',
    isActive: (p: string) => p.startsWith('/ags'),
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
    id:    'sst',
    label: 'ws.sst',
    short: 'SST',
    color: SST_COLOR,
    path:  '/sst',
    isActive: (p: string) => p.startsWith('/sst'),
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
  const { user, modulos } = useAuthStore()
  const { t }           = useTranslation()
  const isAdmin         = user?.rol === 'ADMINISTRADOR'

  // Un módulo que la empresa no contrató no se muestra: el servidor lo
  // rechazaría igual, y dejarlo visible solo lleva al usuario a un error. Sin
  // lista (sesión anterior a esto) se muestra todo, que es lo mismo que asume
  // el servidor.
  const contratados = new Set(modulos ?? [])
  const todo = contratados.size === 0 || contratados.has('*')

  const visibleWorkspaces = WORKSPACES.filter(ws => {
    if (!todo && !contratados.has(MODULO_DE_WORKSPACE[ws.id] ?? ws.id)) return false
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
        background: `linear-gradient(180deg, ${PANEL_BG} 0%, #080808 100%)`,
        // El divisor tiene que verse: este panel y la barra lateral son ambos
        // casi negros y sin la linea se leen como una sola superficie.
        borderRight: `1px solid ${SUPERFICIE.divisorOscuro}`,
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
        {/* El distintivo decía «IC» escrito a mano, de Icoltrans: la empresa que
            encargó el software, no el producto. Ahora sale de MARCA, así que si
            la marca cambia no hay que acordarse de este archivo. */}
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '9px',
            background: `linear-gradient(135deg, ${ACENTO.base} 0%, ${ACENTO.profundo} 100%)`,
            border: '1px solid rgba(255,255,255,0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '0.02em' }}>
            {MARCA.sigla}
          </Typography>
        </Box>

        {/* Plegado queda solo el distintivo; desplegado, el nombre completo. El
            rótulo «Espacios» sobraba: la columna de iconos ya se explica sola, y
            este es el sitio donde se espera ver la marca. */}
        {showText && (
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.82)',
              letterSpacing: '0.22em',
              whiteSpace: 'nowrap',
            }}
          >
            {MARCA.logotipo}
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
                    transform: 'translateX(2px)',
                    '& .ws-badge': {
                      transform: 'scale(1.1) rotate(-3deg)',
                      boxShadow: `0 6px 18px ${alpha(ws.color, 0.5)}`,
                    },
                  },
                  '&:active': { transform: 'translateX(2px) scale(0.98)' },
                  transition: 'all 0.18s cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                {/* Badge */}
                <Box
                  className="ws-badge"
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
                    transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
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
