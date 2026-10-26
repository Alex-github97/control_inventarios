import React from 'react'
import { Box } from '@mui/material'
import { Header } from './Header'
import { ModuleNav } from './ModuleNav'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  noPadding?: boolean
}

export function Layout({ children, title, noPadding = false }: LayoutProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        // Las páginas sin padding (p. ej. tableros Power BI) ocupan exactamente la ventana
        ...(noPadding ? { height: '100vh' } : { minHeight: '100vh' }),
        bgcolor: '#F5F7F8',
        // Tintes radiales muy sutiles: dan profundidad sin romper el tema claro
        backgroundImage: `
          radial-gradient(1100px 500px at 85% -10%, rgba(47,111,235,0.045), transparent 60%),
          radial-gradient(900px 420px at -10% 110%, rgba(26,26,26,0.035), transparent 60%)
        `,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Navegación superior: barra de marca + menú del módulo */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, flexShrink: 0 }}>
        <Header />
        <ModuleNav title={title} />
      </Box>

      {/* Contenido principal */}
      <Box
        component="main"
        className="anim-page-in"
        sx={{
          flex: 1,
          p: noPadding ? 0 : { xs: 2, sm: 3 },
          overflow: noPadding ? 'hidden' : 'visible',
          display: noPadding ? 'flex' : 'block',
          flexDirection: 'column',
          minHeight: 0,
          minWidth: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
