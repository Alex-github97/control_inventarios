/**
 * Entrada de la consola del operador.
 *
 * Es una aplicación aparte de la del portal, con su propia compilación: así el
 * código que administra a todas las empresas no viaja al navegador de ninguna
 * de ellas. La seguridad no depende de eso —`require_operador` lo comprueba en
 * el servidor en cada petición— pero no hay razón para repartir esta pantalla.
 */
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Box, AppBar, Toolbar, Tabs, Tab, Button, Typography, Chip } from '@mui/material'
import { Logout } from '@mui/icons-material'
import { Toaster } from 'react-hot-toast'
import { theme } from '@/theme/theme'
import { Logotipo } from '@/components/Logotipo'
import { PALETA, SUPERFICIE } from '@/config/marca'
import { sesion } from './api'
import Ingreso from './Ingreso'
import Empresas from './Empresas'
import Contabilidad from './Contabilidad'
import Soporte from './Soporte'
import Equipo from './Equipo'
import Bitacora from './Bitacora'
import '@/index.css'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function Consola() {
  const s = sesion.leer()
  const [pestana, setPestana] = useState(0)

  if (!s) return <Ingreso />

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: SUPERFICIE.contenido }}>
      <AppBar position="sticky" elevation={0} sx={{
        bgcolor: SUPERFICIE.barra, borderBottom: `1px solid ${SUPERFICIE.divisorOscuro}`,
      }}>
        <Toolbar sx={{ gap: 2 }}>
          <Logotipo tamano={15} claro />
          <Chip label="OPERADOR" size="small" sx={{
            height: 20, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
            bgcolor: 'rgba(255,255,255,0.14)', color: '#FFF',
          }} />
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {s.usuario} · {s.empresa}
          </Typography>
          <Button
            size="small" startIcon={<Logout />} sx={{ color: 'rgba(255,255,255,0.8)', textTransform: 'none' }}
            onClick={() => { sesion.cerrar(); location.reload() }}
          >
            Salir
          </Button>
        </Toolbar>
        <Tabs
          value={pestana} onChange={(_, v) => setPestana(v)}
          sx={{
            px: 2, minHeight: 40, bgcolor: SUPERFICIE.barra,
            '& .MuiTab-root': { color: 'rgba(255,255,255,0.6)', textTransform: 'none', minHeight: 40 },
            '& .Mui-selected': { color: '#FFF' },
          }}
        >
          <Tab label="Empresas" />
          <Tab label="Contabilidad" />
          <Tab label="Soporte" />
          <Tab label="Equipo" />
          <Tab label="Bitácora" />
        </Tabs>
      </AppBar>

      <Box sx={{ p: 3, maxWidth: 1280, mx: 'auto' }}>
        {pestana === 0 && <Empresas />}
        {pestana === 1 && <Contabilidad />}
        {pestana === 2 && <Soporte />}
        {pestana === 3 && <Equipo />}
        {pestana === 4 && <Bitacora />}
      </Box>

      <Typography variant="caption" sx={{
        display: 'block', textAlign: 'center', pb: 3, color: PALETA.acero,
      }}>
        Consola del operador · TittanWare
      </Typography>
    </Box>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Consola />
        <Toaster position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
