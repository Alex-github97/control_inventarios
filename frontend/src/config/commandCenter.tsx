import React from 'react'
import { Build, LocalShipping, People } from '@mui/icons-material'

export interface DashboardConfig {
  id: string
  label: string        // nombre completo (sidebar expandida, encabezado de página)
  shortLabel: string   // nombre corto (tooltip icono-only, breadcrumb)
  description: string
  color: string
  url: string | null   // null = próximamente
  path: string
  icon: React.ReactNode
}

// ─────────────────────────────────────────────────────────────────────────────
// AGREGAR UN NUEVO DASHBOARD
// Añade un objeto al array siguiendo la misma estructura.
// Campos:
//   id          → slug único en la URL  (sin espacios ni caracteres especiales)
//   label       → nombre completo del dashboard
//   shortLabel  → nombre corto para la barra lateral
//   description → descripción breve que aparece en la pantalla "Próximamente"
//   color       → color identificador (hex)
//   url         → URL de Power BI reportEmbed   |  null = Próximamente
//   path        → ruta interna, SIEMPRE empieza con /command-center/
//   icon        → ícono de @mui/icons-material con fontSize="small"
// ─────────────────────────────────────────────────────────────────────────────
export const COMMAND_CENTER_DASHBOARDS: DashboardConfig[] = [
  {
    id: 'mantenimiento',
    label: 'Gestión de Mantenimiento General',
    shortLabel: 'Mantenimiento',
    description: 'KPIs de mantenimiento preventivo y correctivo de flota y equipos.',
    color: '#F59E0B',
    url: 'https://app.powerbi.com/reportEmbed?reportId=80040d09-235b-47dd-a3e6-b6428dd7c615&autoAuth=true&ctid=a4e67291-b9e0-41f5-9be1-356ab2c0918c',
    path: '/command-center/mantenimiento',
    icon: <Build fontSize="small" />,
  },
  {
    id: 'operaciones',
    label: 'Gestión de Operaciones, Logística y Almacenamiento',
    shortLabel: 'Operaciones',
    description: 'Indicadores de operaciones logísticas, fletes y almacenamiento.',
    color: '#3B82F6',
    url: 'https://app.powerbi.com/reportEmbed?reportId=7e7a73ef-415c-4448-a561-b77f287af7df&autoAuth=true&ctid=a4e67291-b9e0-41f5-9be1-356ab2c0918c',
    path: '/command-center/operaciones',
    icon: <LocalShipping fontSize="small" />,
  },
  {
    id: 'gestion-humana',
    label: 'Gestión Humana',
    shortLabel: 'Gestión Humana',
    description: 'Indicadores de talento humano, nómina y bienestar.',
    color: '#8B5CF6',
    url: null,
    path: '/command-center/gestion-humana',
    icon: <People fontSize="small" />,
  },

  // ── Ejemplo para agregar un nuevo dashboard ──────────────────────────────
  // {
  //   id: 'financiero',
  //   label: 'Gestión Financiera',
  //   shortLabel: 'Financiero',
  //   description: 'Indicadores financieros y de tesorería.',
  //   color: '#10B981',
  //   url: 'https://app.powerbi.com/reportEmbed?reportId=TU_REPORT_ID&autoAuth=true&ctid=a4e67291-b9e0-41f5-9be1-356ab2c0918c',
  //   path: '/command-center/financiero',
  //   icon: <TrendingUp fontSize="small" />,
  // },
]
