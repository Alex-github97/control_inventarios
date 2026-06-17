import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { theme } from '@/theme/theme'
import { useAuthStore } from '@/store/authStore'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Estibas from '@/pages/Estibas'
import EstibaDetalle from '@/pages/EstibaDetalle'
import Movimientos from '@/pages/Movimientos'
import Manifiestos from '@/pages/Manifiestos'
import Vehiculos from '@/pages/Vehiculos'
import Ubicaciones from '@/pages/Ubicaciones'
import Proveedores from '@/pages/Proveedores'
import Alertas from '@/pages/Alertas'
import Danos from '@/pages/Danos'
import Trazabilidad from '@/pages/Trazabilidad'
import EstibasCargaMasiva from '@/pages/EstibasCargaMasiva'
import MovimientosCargaMasiva from '@/pages/MovimientosCargaMasiva'
import TarifaxDashboard from '@/pages/TarifaxDashboard'
import TarifaxMotor from '@/pages/TarifaxMotor'
import Usuarios from '@/pages/Usuarios'
import Roles from '@/pages/Roles'
import Mantenimiento from '@/pages/Mantenimiento'
import CostosReporte from '@/pages/CostosReporte'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500 },
            success: { iconTheme: { primary: '#32AC5C', secondary: '#FFF' } },
          }}
        />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/estibas" element={<ProtectedRoute><Estibas /></ProtectedRoute>} />
            <Route path="/estibas/cargue-masivo" element={<ProtectedRoute><EstibasCargaMasiva /></ProtectedRoute>} />
            <Route path="/estibas/:id" element={<ProtectedRoute><EstibaDetalle /></ProtectedRoute>} />
            <Route path="/movimientos" element={<ProtectedRoute><Movimientos /></ProtectedRoute>} />
            <Route path="/movimientos/cargue-masivo" element={<ProtectedRoute><MovimientosCargaMasiva /></ProtectedRoute>} />
            <Route path="/manifiestos" element={<ProtectedRoute><Manifiestos /></ProtectedRoute>} />
            <Route path="/vehiculos" element={<ProtectedRoute><Vehiculos /></ProtectedRoute>} />
            <Route path="/ubicaciones" element={<ProtectedRoute><Ubicaciones /></ProtectedRoute>} />
            <Route path="/proveedores" element={<ProtectedRoute><Proveedores /></ProtectedRoute>} />
            <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
            <Route path="/danos" element={<ProtectedRoute><Danos /></ProtectedRoute>} />
            <Route path="/trazabilidad" element={<ProtectedRoute><Trazabilidad /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
            <Route path="/usuarios/roles" element={<ProtectedRoute><Roles /></ProtectedRoute>} />
            <Route path="/mantenimiento" element={<ProtectedRoute><Mantenimiento /></ProtectedRoute>} />
            <Route path="/costos" element={<ProtectedRoute><CostosReporte /></ProtectedRoute>} />
            <Route path="/tarifax/tablero" element={<ProtectedRoute><TarifaxDashboard /></ProtectedRoute>} />
            <Route path="/tarifax/motor" element={<ProtectedRoute><TarifaxMotor /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
