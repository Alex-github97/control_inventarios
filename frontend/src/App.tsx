import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, Box, Typography, Button } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { theme } from '@/theme/theme'
import { useAuthStore } from '@/store/authStore'

// Prefijo de ruta → clave de permiso. Las rutas no listadas aquí son de libre acceso.
const ROUTE_PERM_MAP: Record<string, string> = {
  '/dashboard':    'dashboard',
  '/estibas':      'estibas',
  '/movimientos':  'movimientos',
  '/manifiestos':  'manifiestos',
  '/vehiculos':    'vehiculos',
  '/ubicaciones':  'ubicaciones',
  '/proveedores':  'proveedores',
  '/alertas':      'alertas',
  '/danos':        'danos',
  '/trazabilidad': 'trazabilidad',
  '/mantenimiento':'mantenimiento',
  '/costos':       'costos',
  '/consultas':    'consultas',
  '/tarifax':      'tx',
  '/fletes':       'ft',
  '/flota':        'gf',
  '/locativa':     'ml',
  '/wms':          'wms',
  '/gh':           'gh',
  '/tms':          'tms',
  '/dms':          'dms',
  '/qms':          'qms',
  '/grc':          'grc',
  '/lms':          'lms',
  '/crm':          'crm',
  '/eam':          'eam',
  '/mes':          'mes',
  '/aps':          'aps',
  '/erp':          'erp',
  '/usuarios':     'usuarios',
}

function SinAcceso() {
  const navigate = useNavigate()
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', bgcolor: '#060C1A', gap: 2,
    }}>
      <Typography variant="h4" sx={{ color: '#EF4444', fontWeight: 800 }}>
        Acceso restringido
      </Typography>
      <Typography sx={{ color: '#94A3B8', textAlign: 'center', maxWidth: 380 }}>
        No tienes permiso para acceder a esta sección. Contacta a tu administrador si crees que es un error.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button variant="outlined" onClick={() => navigate(-1)}
          sx={{ borderColor: '#475569', color: '#94A3B8' }}>
          Volver
        </Button>
        <Button variant="contained" onClick={() => navigate('/command-center')}
          sx={{ bgcolor: '#32AC5C', '&:hover': { bgcolor: '#27884A' } }}>
          Ir al inicio
        </Button>
      </Box>
    </Box>
  )
}

const Login = React.lazy(() => import('@/pages/Login'))
const Dashboard = React.lazy(() => import('@/pages/Dashboard'))
const Estibas = React.lazy(() => import('@/pages/Estibas'))
const EstibaDetalle = React.lazy(() => import('@/pages/EstibaDetalle'))
const Movimientos = React.lazy(() => import('@/pages/Movimientos'))
const Manifiestos = React.lazy(() => import('@/pages/Manifiestos'))
const Vehiculos = React.lazy(() => import('@/pages/Vehiculos'))
const Ubicaciones = React.lazy(() => import('@/pages/Ubicaciones'))
const Proveedores = React.lazy(() => import('@/pages/Proveedores'))
const Alertas = React.lazy(() => import('@/pages/Alertas'))
const Danos = React.lazy(() => import('@/pages/Danos'))
const Trazabilidad = React.lazy(() => import('@/pages/Trazabilidad'))
const EstibasCargaMasiva = React.lazy(() => import('@/pages/EstibasCargaMasiva'))
const MovimientosCargaMasiva = React.lazy(() => import('@/pages/MovimientosCargaMasiva'))
const TarifaxDashboard = React.lazy(() => import('@/pages/TarifaxDashboard'))
const TarifaxMotor = React.lazy(() => import('@/pages/TarifaxMotor'))
const Usuarios = React.lazy(() => import('@/pages/Usuarios'))
const Roles = React.lazy(() => import('@/pages/Roles'))
const CommandCenter = React.lazy(() => import('@/pages/CommandCenter'))
const Mantenimiento = React.lazy(() => import('@/pages/Mantenimiento'))
const CostosReporte = React.lazy(() => import('@/pages/CostosReporte'))
const Consultas = React.lazy(() => import('@/pages/Consultas'))
const Fletes = React.lazy(() => import('@/pages/Fletes'))
const FletesGeneradores = React.lazy(() => import('@/pages/FletesGeneradores'))
const FletesConductores = React.lazy(() => import('@/pages/FletesConductores'))
const FlotaDashboard = React.lazy(() => import('@/pages/FlotaDashboard'))
const FlotaVehiculos = React.lazy(() => import('@/pages/FlotaVehiculos'))
const FlotaCombustible = React.lazy(() => import('@/pages/FlotaCombustible'))
const FlotaDocumentos = React.lazy(() => import('@/pages/FlotaDocumentos'))
const FlotaMantenimiento = React.lazy(() => import('@/pages/FlotaMantenimiento'))
const FlotaPersonal = React.lazy(() => import('@/pages/FlotaPersonal'))
const FlotaConfig = React.lazy(() => import('@/pages/FlotaConfig'))
const FlotaRutinas = React.lazy(() => import('@/pages/FlotaRutinas'))
const FlotaConfiabilidad = React.lazy(() => import('@/pages/FlotaConfiabilidad'))
const LocativaDashboard = React.lazy(() => import('@/pages/LocativaDashboard'))
const LocativaActivos = React.lazy(() => import('@/pages/LocativaActivos'))
const LocativaOrdenes = React.lazy(() => import('@/pages/LocativaOrdenes'))
const LocativaRiesgos = React.lazy(() => import('@/pages/LocativaRiesgos'))
const LocativaEnergia = React.lazy(() => import('@/pages/LocativaEnergia'))
const LocativaConfig = React.lazy(() => import('@/pages/LocativaConfig'))
const WMSDashboard = React.lazy(() => import('@/pages/WMSDashboard'))
const WMSRecepcion = React.lazy(() => import('@/pages/WMSRecepcion'))
const WMSInventario = React.lazy(() => import('@/pages/WMSInventario'))
const WMSPicking = React.lazy(() => import('@/pages/WMSPicking'))
const WMSDespacho = React.lazy(() => import('@/pages/WMSDespacho'))
const WMSTrazabilidad = React.lazy(() => import('@/pages/WMSTrazabilidad'))
const WMSConfig = React.lazy(() => import('@/pages/WMSConfig'))
const GHDashboard = React.lazy(() => import('@/pages/GHDashboard'))
const GHColaboradores = React.lazy(() => import('@/pages/GHColaboradores'))
const GHConductores = React.lazy(() => import('@/pages/GHConductores'))
const GHIncapacidades = React.lazy(() => import('@/pages/GHIncapacidades'))
const GHVacaciones = React.lazy(() => import('@/pages/GHVacaciones'))
const GHReclutamiento = React.lazy(() => import('@/pages/GHReclutamiento'))
const GHCapacitacion = React.lazy(() => import('@/pages/GHCapacitacion'))
const GHSST = React.lazy(() => import('@/pages/GHSST'))
const GHNomina = React.lazy(() => import('@/pages/GHNomina'))
const GHEvaluacion = React.lazy(() => import('@/pages/GHEvaluacion'))
const GHConfig = React.lazy(() => import('@/pages/GHConfig'))
const TMSDashboard = React.lazy(() => import('@/pages/TMSDashboard'))
const TMSViajes = React.lazy(() => import('@/pages/TMSViajes'))
const TMSPlaneacion = React.lazy(() => import('@/pages/TMSPlaneacion'))
const TMSDespachos = React.lazy(() => import('@/pages/TMSDespachos'))
const TMSTracking = React.lazy(() => import('@/pages/TMSTracking'))
const TMSVehiculos = React.lazy(() => import('@/pages/TMSVehiculos'))
const TMSConductores = React.lazy(() => import('@/pages/TMSConductores'))
const TMSTorreControl = React.lazy(() => import('@/pages/TMSTorreControl'))
const TMSRutas = React.lazy(() => import('@/pages/TMSRutas'))
const TMSDocumentos = React.lazy(() => import('@/pages/TMSDocumentos'))
const TMSCostos = React.lazy(() => import('@/pages/TMSCostos'))
const TMSOTIF = React.lazy(() => import('@/pages/TMSOTIF'))
const TMSLiquidaciones = React.lazy(() => import('@/pages/TMSLiquidaciones'))
const TMSConfig = React.lazy(() => import('@/pages/TMSConfig'))
const DMSDashboard = React.lazy(() => import('@/pages/DMSDashboard'))
const DMSRepositorio = React.lazy(() => import('@/pages/DMSRepositorio'))
const DMSDocumentos = React.lazy(() => import('@/pages/DMSDocumentos'))
const DMSCategorias = React.lazy(() => import('@/pages/DMSCategorias'))
const DMSExpedientes = React.lazy(() => import('@/pages/DMSExpedientes'))
const DMSWorkflow = React.lazy(() => import('@/pages/DMSWorkflow'))
const DMSFirmas = React.lazy(() => import('@/pages/DMSFirmas'))
const DMSBusqueda = React.lazy(() => import('@/pages/DMSBusqueda'))
const DMSRetencion = React.lazy(() => import('@/pages/DMSRetencion'))
const DMSAuditoria = React.lazy(() => import('@/pages/DMSAuditoria'))
const DMSIntegraciones = React.lazy(() => import('@/pages/DMSIntegraciones'))
const DMSIA = React.lazy(() => import('@/pages/DMSIA'))
const DMSPortal = React.lazy(() => import('@/pages/DMSPortal'))
const DMSConfig = React.lazy(() => import('@/pages/DMSConfig'))
const QMSDashboard = React.lazy(() => import('@/pages/QMSDashboard'))
const QMSProcesos = React.lazy(() => import('@/pages/QMSProcesos'))
const QMSIndicadores = React.lazy(() => import('@/pages/QMSIndicadores'))
const QMSNoConformidades = React.lazy(() => import('@/pages/QMSNoConformidades'))
const QMSAuditorias = React.lazy(() => import('@/pages/QMSAuditorias'))
const QMSHallazgos = React.lazy(() => import('@/pages/QMSHallazgos'))
const QMSRiesgos = React.lazy(() => import('@/pages/QMSRiesgos'))
const QMSQuejas = React.lazy(() => import('@/pages/QMSQuejas'))
const QMSProveedores = React.lazy(() => import('@/pages/QMSProveedores'))
const QMSMejora = React.lazy(() => import('@/pages/QMSMejora'))
const QMSEncuestas = React.lazy(() => import('@/pages/QMSEncuestas'))
const QMSCambios = React.lazy(() => import('@/pages/QMSCambios'))
const QMSIA = React.lazy(() => import('@/pages/QMSIA'))
const QMSConfig = React.lazy(() => import('@/pages/QMSConfig'))
const GRCDashboard = React.lazy(() => import('@/pages/GRCDashboard'))
const GRCGobierno = React.lazy(() => import('@/pages/GRCGobierno'))
const GRCPoliticas = React.lazy(() => import('@/pages/GRCPoliticas'))
const GRCObligaciones = React.lazy(() => import('@/pages/GRCObligaciones'))
const GRCRiesgos = React.lazy(() => import('@/pages/GRCRiesgos'))
const GRCControles = React.lazy(() => import('@/pages/GRCControles'))
const GRCCumplimiento = React.lazy(() => import('@/pages/GRCCumplimiento'))
const GRCTerceros = React.lazy(() => import('@/pages/GRCTerceros'))
const GRCAuditorias = React.lazy(() => import('@/pages/GRCAuditorias'))
const GRCHallazgos = React.lazy(() => import('@/pages/GRCHallazgos'))
const GRCContinuidad = React.lazy(() => import('@/pages/GRCContinuidad'))
const GRCIncidentes = React.lazy(() => import('@/pages/GRCIncidentes'))
const GRCIA = React.lazy(() => import('@/pages/GRCIA'))
const GRCConfig = React.lazy(() => import('@/pages/GRCConfig'))
const LMSDashboard = React.lazy(() => import('@/pages/LMSDashboard'))
const LMSMiAprendizaje = React.lazy(() => import('@/pages/LMSMiAprendizaje'))
const LMSUniversidad = React.lazy(() => import('@/pages/LMSUniversidad'))
const LMSCatalogo = React.lazy(() => import('@/pages/LMSCatalogo'))
const LMSRutas = React.lazy(() => import('@/pages/LMSRutas'))
const LMSOnboarding = React.lazy(() => import('@/pages/LMSOnboarding'))
const LMSCompetencias = React.lazy(() => import('@/pages/LMSCompetencias'))
const LMSEvaluaciones = React.lazy(() => import('@/pages/LMSEvaluaciones'))
const LMSBancoPreguntas = React.lazy(() => import('@/pages/LMSBancoPreguntas'))
const LMSCertificaciones = React.lazy(() => import('@/pages/LMSCertificaciones'))
const LMSKnowledge = React.lazy(() => import('@/pages/LMSKnowledge'))
const LMSGamificacion = React.lazy(() => import('@/pages/LMSGamificacion'))
const LMSIA = React.lazy(() => import('@/pages/LMSIA'))
const LMSReportes = React.lazy(() => import('@/pages/LMSReportes'))
const LMSConfig = React.lazy(() => import('@/pages/LMSConfig'))
const CRMDashboard = React.lazy(() => import('@/pages/CRMDashboard'))
const CRMClientes = React.lazy(() => import('@/pages/CRMClientes'))
const CRMLeads = React.lazy(() => import('@/pages/CRMLeads'))
const CRMOportunidades = React.lazy(() => import('@/pages/CRMOportunidades'))
const CRMCotizaciones = React.lazy(() => import('@/pages/CRMCotizaciones'))
const CRMContratos = React.lazy(() => import('@/pages/CRMContratos'))
const CRMTickets = React.lazy(() => import('@/pages/CRMTickets'))
const CRMInteracciones = React.lazy(() => import('@/pages/CRMInteracciones'))
const CRMCampanas = React.lazy(() => import('@/pages/CRMCampanas'))
const CRMEncuestas = React.lazy(() => import('@/pages/CRMEncuestas'))
const CRMCuentasClave = React.lazy(() => import('@/pages/CRMCuentasClave'))
const CRMRentabilidad = React.lazy(() => import('@/pages/CRMRentabilidad'))
const CRMIA = React.lazy(() => import('@/pages/CRMIA'))
const CRMReportes = React.lazy(() => import('@/pages/CRMReportes'))
const CRMConfig = React.lazy(() => import('@/pages/CRMConfig'))
const EAMDashboard = React.lazy(() => import('@/pages/EAMDashboard'))
const EAMActivos = React.lazy(() => import('@/pages/EAMActivos'))
const EAMOrdenesTrabajo = React.lazy(() => import('@/pages/EAMOrdenesTrabajo'))
const EAMPlanesMant = React.lazy(() => import('@/pages/EAMPlanesMant'))
const EAMChecklists = React.lazy(() => import('@/pages/EAMChecklists'))
const EAMLubricacion = React.lazy(() => import('@/pages/EAMLubricacion'))
const EAMNeumaticos = React.lazy(() => import('@/pages/EAMNeumaticos'))
const EAMCombustible = React.lazy(() => import('@/pages/EAMCombustible'))
const EAMInventario = React.lazy(() => import('@/pages/EAMInventario'))
const EAMConfiabilidad = React.lazy(() => import('@/pages/EAMConfiabilidad'))
const EAMGarantias = React.lazy(() => import('@/pages/EAMGarantias'))
const EAMIA = React.lazy(() => import('@/pages/EAMIA'))
const EAMReportes = React.lazy(() => import('@/pages/EAMReportes'))
const EAMConfig = React.lazy(() => import('@/pages/EAMConfig'))
const MESDashboard = React.lazy(() => import('@/pages/MESDashboard'))
const MESPlanta = React.lazy(() => import('@/pages/MESPlanta'))
const MESOrdenes = React.lazy(() => import('@/pages/MESOrdenes'))
const MESProgramacion = React.lazy(() => import('@/pages/MESProgramacion'))
const MESEjecucion = React.lazy(() => import('@/pages/MESEjecucion'))
const MESTrazabilidad = React.lazy(() => import('@/pages/MESTrazabilidad'))
const MESCalidad = React.lazy(() => import('@/pages/MESCalidad'))
const MESScrap = React.lazy(() => import('@/pages/MESScrap'))
const MESOEE = React.lazy(() => import('@/pages/MESOEE'))
const MESInventario = React.lazy(() => import('@/pages/MESInventario'))
const MESBOM = React.lazy(() => import('@/pages/MESBOM'))
const MESIA = React.lazy(() => import('@/pages/MESIA'))
const MESReportes = React.lazy(() => import('@/pages/MESReportes'))
const MESConfig = React.lazy(() => import('@/pages/MESConfig'))
const APSDashboard = React.lazy(() => import('@/pages/APSDashboard'))
const APSDemanda = React.lazy(() => import('@/pages/APSDemanda'))
const APSSOIP = React.lazy(() => import('@/pages/APSSOIP'))
const APSPlan = React.lazy(() => import('@/pages/APSPlan'))
const APSCapacidad = React.lazy(() => import('@/pages/APSCapacidad'))
const APSInventario = React.lazy(() => import('@/pages/APSInventario'))
const APSDistribucion = React.lazy(() => import('@/pages/APSDistribucion'))
const APSTransporte = React.lazy(() => import('@/pages/APSTransporte'))
const APSEscenarios = React.lazy(() => import('@/pages/APSEscenarios'))
const APSRestricciones = React.lazy(() => import('@/pages/APSRestricciones'))
const APSKPIs = React.lazy(() => import('@/pages/APSKPIs'))
const APSAI = React.lazy(() => import('@/pages/APSAI'))
const APSReportes = React.lazy(() => import('@/pages/APSReportes'))
const APSConfig = React.lazy(() => import('@/pages/APSConfig'))
const ERPDashboard = React.lazy(() => import('@/pages/ERPDashboard'))
const ERPContabilidad = React.lazy(() => import('@/pages/ERPContabilidad'))
const ERPTesoreria = React.lazy(() => import('@/pages/ERPTesoreria'))
const ERPCxC = React.lazy(() => import('@/pages/ERPCxC'))
const ERPCxP = React.lazy(() => import('@/pages/ERPCxP'))
const ERPFacturacion = React.lazy(() => import('@/pages/ERPFacturacion'))
const ERPTributacion = React.lazy(() => import('@/pages/ERPTributacion'))
const ERPPresupuestos = React.lazy(() => import('@/pages/ERPPresupuestos'))
const ERPCosteo = React.lazy(() => import('@/pages/ERPCosteo'))
const ERPConsolidacion = React.lazy(() => import('@/pages/ERPConsolidacion'))
const ERPActivos = React.lazy(() => import('@/pages/ERPActivos'))
const ERPCompras = React.lazy(() => import('@/pages/ERPCompras'))
const ERPProyectos = React.lazy(() => import('@/pages/ERPProyectos'))
const ERPEPM = React.lazy(() => import('@/pages/ERPEPM'))
const ERPReportes = React.lazy(() => import('@/pages/ERPReportes'))
const ERPConfig = React.lazy(() => import('@/pages/ERPConfig'))
const Configuracion = React.lazy(() => import('@/pages/Configuracion'))
const Clientes = React.lazy(() => import('@/pages/Clientes'))
const ScannerMovil = React.lazy(() => import('@/pages/ScannerMovil'))

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
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Sesión anterior sin permisos cargados → forzar re-login
  if (user?.permisos === undefined) return <Navigate to="/login" replace />

  // ADMINISTRADOR tiene acceso a todo
  if (user.rol === 'ADMINISTRADOR') return <>{children}</>

  // Buscar si la ruta actual requiere algún permiso
  const matchedPrefix = Object.keys(ROUTE_PERM_MAP).find(prefix =>
    location.pathname.startsWith(prefix)
  )
  if (matchedPrefix) {
    const key = ROUTE_PERM_MAP[matchedPrefix]
    if (!user.permisos[key]) return <Navigate to="/sin-acceso" replace />
  }

  return <>{children}</>
}

function PageLoader() {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', bgcolor: '#060C1A',
    }}>
      <Box sx={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid #1E3A5F', borderTop: '3px solid #32AC5C',
        animation: 'spin 0.7s linear infinite',
        '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
      }} />
    </Box>
  )
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
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/sin-acceso" element={<SinAcceso />} />
            <Route path="/scanner-movil" element={<ScannerMovil />} />
            <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
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
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
            <Route path="/danos" element={<ProtectedRoute><Danos /></ProtectedRoute>} />
            <Route path="/trazabilidad" element={<ProtectedRoute><Trazabilidad /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
            <Route path="/usuarios/roles" element={<ProtectedRoute><Roles /></ProtectedRoute>} />
            <Route path="/command-center" element={<ProtectedRoute><CommandCenter /></ProtectedRoute>} />
            <Route path="/command-center/:dashboardId" element={<ProtectedRoute><CommandCenter /></ProtectedRoute>} />
            <Route path="/mantenimiento" element={<ProtectedRoute><Mantenimiento /></ProtectedRoute>} />
            <Route path="/costos" element={<ProtectedRoute><CostosReporte /></ProtectedRoute>} />
            <Route path="/consultas" element={<ProtectedRoute><Consultas /></ProtectedRoute>} />
            <Route path="/fletes" element={<ProtectedRoute><Fletes /></ProtectedRoute>} />
            <Route path="/fletes/generadores" element={<ProtectedRoute><FletesGeneradores /></ProtectedRoute>} />
            <Route path="/fletes/conductores" element={<ProtectedRoute><FletesConductores /></ProtectedRoute>} />
            <Route path="/flota" element={<ProtectedRoute><FlotaDashboard /></ProtectedRoute>} />
            <Route path="/flota/vehiculos" element={<ProtectedRoute><FlotaVehiculos /></ProtectedRoute>} />
            <Route path="/flota/combustible" element={<ProtectedRoute><FlotaCombustible /></ProtectedRoute>} />
            <Route path="/flota/documentos" element={<ProtectedRoute><FlotaDocumentos /></ProtectedRoute>} />
            <Route path="/flota/mantenimiento" element={<ProtectedRoute><FlotaMantenimiento /></ProtectedRoute>} />
            <Route path="/flota/personal" element={<ProtectedRoute><FlotaPersonal /></ProtectedRoute>} />
            <Route path="/flota/config" element={<ProtectedRoute><FlotaConfig /></ProtectedRoute>} />
            <Route path="/flota/rutinas" element={<ProtectedRoute><FlotaRutinas /></ProtectedRoute>} />
            <Route path="/flota/confiabilidad" element={<ProtectedRoute><FlotaConfiabilidad /></ProtectedRoute>} />
            <Route path="/locativa" element={<ProtectedRoute><LocativaDashboard /></ProtectedRoute>} />
            <Route path="/locativa/activos" element={<ProtectedRoute><LocativaActivos /></ProtectedRoute>} />
            <Route path="/locativa/ordenes" element={<ProtectedRoute><LocativaOrdenes /></ProtectedRoute>} />
            <Route path="/locativa/riesgos" element={<ProtectedRoute><LocativaRiesgos /></ProtectedRoute>} />
            <Route path="/locativa/energia" element={<ProtectedRoute><LocativaEnergia /></ProtectedRoute>} />
            <Route path="/locativa/config" element={<ProtectedRoute><LocativaConfig /></ProtectedRoute>} />
            <Route path="/tarifax/tablero" element={<ProtectedRoute><TarifaxDashboard /></ProtectedRoute>} />
            <Route path="/tarifax/motor" element={<ProtectedRoute><TarifaxMotor /></ProtectedRoute>} />
            <Route path="/wms" element={<ProtectedRoute><WMSDashboard /></ProtectedRoute>} />
            <Route path="/wms/recepcion" element={<ProtectedRoute><WMSRecepcion /></ProtectedRoute>} />
            <Route path="/wms/inventario" element={<ProtectedRoute><WMSInventario /></ProtectedRoute>} />
            <Route path="/wms/picking" element={<ProtectedRoute><WMSPicking /></ProtectedRoute>} />
            <Route path="/wms/despacho" element={<ProtectedRoute><WMSDespacho /></ProtectedRoute>} />
            <Route path="/wms/trazabilidad" element={<ProtectedRoute><WMSTrazabilidad /></ProtectedRoute>} />
            <Route path="/wms/config" element={<ProtectedRoute><WMSConfig /></ProtectedRoute>} />
            <Route path="/gh" element={<ProtectedRoute><GHDashboard /></ProtectedRoute>} />
            <Route path="/gh/colaboradores" element={<ProtectedRoute><GHColaboradores /></ProtectedRoute>} />
            <Route path="/gh/conductores" element={<ProtectedRoute><GHConductores /></ProtectedRoute>} />
            <Route path="/gh/incapacidades" element={<ProtectedRoute><GHIncapacidades /></ProtectedRoute>} />
            <Route path="/gh/vacaciones" element={<ProtectedRoute><GHVacaciones /></ProtectedRoute>} />
            <Route path="/gh/reclutamiento" element={<ProtectedRoute><GHReclutamiento /></ProtectedRoute>} />
            <Route path="/gh/capacitacion" element={<ProtectedRoute><GHCapacitacion /></ProtectedRoute>} />
            <Route path="/gh/sst" element={<ProtectedRoute><GHSST /></ProtectedRoute>} />
            <Route path="/gh/nomina" element={<ProtectedRoute><GHNomina /></ProtectedRoute>} />
            <Route path="/gh/evaluacion" element={<ProtectedRoute><GHEvaluacion /></ProtectedRoute>} />
            <Route path="/gh/config" element={<ProtectedRoute><GHConfig /></ProtectedRoute>} />
            <Route path="/tms" element={<ProtectedRoute><TMSDashboard /></ProtectedRoute>} />
            <Route path="/tms/viajes" element={<ProtectedRoute><TMSViajes /></ProtectedRoute>} />
            <Route path="/tms/planeacion" element={<ProtectedRoute><TMSPlaneacion /></ProtectedRoute>} />
            <Route path="/tms/despachos" element={<ProtectedRoute><TMSDespachos /></ProtectedRoute>} />
            <Route path="/tms/tracking" element={<ProtectedRoute><TMSTracking /></ProtectedRoute>} />
            <Route path="/tms/vehiculos" element={<ProtectedRoute><TMSVehiculos /></ProtectedRoute>} />
            <Route path="/tms/conductores" element={<ProtectedRoute><TMSConductores /></ProtectedRoute>} />
            <Route path="/tms/torre-control" element={<ProtectedRoute><TMSTorreControl /></ProtectedRoute>} />
            <Route path="/tms/rutas" element={<ProtectedRoute><TMSRutas /></ProtectedRoute>} />
            <Route path="/tms/documentos" element={<ProtectedRoute><TMSDocumentos /></ProtectedRoute>} />
            <Route path="/tms/costos" element={<ProtectedRoute><TMSCostos /></ProtectedRoute>} />
            <Route path="/tms/otif" element={<ProtectedRoute><TMSOTIF /></ProtectedRoute>} />
            <Route path="/tms/liquidaciones" element={<ProtectedRoute><TMSLiquidaciones /></ProtectedRoute>} />
            <Route path="/tms/config" element={<ProtectedRoute><TMSConfig /></ProtectedRoute>} />
            <Route path="/dms" element={<ProtectedRoute><DMSDashboard /></ProtectedRoute>} />
            <Route path="/dms/repositorio" element={<ProtectedRoute><DMSRepositorio /></ProtectedRoute>} />
            <Route path="/dms/documentos" element={<ProtectedRoute><DMSDocumentos /></ProtectedRoute>} />
            <Route path="/dms/categorias" element={<ProtectedRoute><DMSCategorias /></ProtectedRoute>} />
            <Route path="/dms/expedientes" element={<ProtectedRoute><DMSExpedientes /></ProtectedRoute>} />
            <Route path="/dms/workflow" element={<ProtectedRoute><DMSWorkflow /></ProtectedRoute>} />
            <Route path="/dms/firmas" element={<ProtectedRoute><DMSFirmas /></ProtectedRoute>} />
            <Route path="/dms/busqueda" element={<ProtectedRoute><DMSBusqueda /></ProtectedRoute>} />
            <Route path="/dms/retencion" element={<ProtectedRoute><DMSRetencion /></ProtectedRoute>} />
            <Route path="/dms/auditoria" element={<ProtectedRoute><DMSAuditoria /></ProtectedRoute>} />
            <Route path="/dms/integraciones" element={<ProtectedRoute><DMSIntegraciones /></ProtectedRoute>} />
            <Route path="/dms/ia" element={<ProtectedRoute><DMSIA /></ProtectedRoute>} />
            <Route path="/dms/portal" element={<ProtectedRoute><DMSPortal /></ProtectedRoute>} />
            <Route path="/dms/config" element={<ProtectedRoute><DMSConfig /></ProtectedRoute>} />
            <Route path="/qms" element={<ProtectedRoute><QMSDashboard /></ProtectedRoute>} />
            <Route path="/qms/procesos" element={<ProtectedRoute><QMSProcesos /></ProtectedRoute>} />
            <Route path="/qms/indicadores" element={<ProtectedRoute><QMSIndicadores /></ProtectedRoute>} />
            <Route path="/qms/no-conformidades" element={<ProtectedRoute><QMSNoConformidades /></ProtectedRoute>} />
            <Route path="/qms/auditorias" element={<ProtectedRoute><QMSAuditorias /></ProtectedRoute>} />
            <Route path="/qms/hallazgos" element={<ProtectedRoute><QMSHallazgos /></ProtectedRoute>} />
            <Route path="/qms/riesgos" element={<ProtectedRoute><QMSRiesgos /></ProtectedRoute>} />
            <Route path="/qms/quejas" element={<ProtectedRoute><QMSQuejas /></ProtectedRoute>} />
            <Route path="/qms/proveedores" element={<ProtectedRoute><QMSProveedores /></ProtectedRoute>} />
            <Route path="/qms/mejora" element={<ProtectedRoute><QMSMejora /></ProtectedRoute>} />
            <Route path="/qms/encuestas" element={<ProtectedRoute><QMSEncuestas /></ProtectedRoute>} />
            <Route path="/qms/cambios" element={<ProtectedRoute><QMSCambios /></ProtectedRoute>} />
            <Route path="/qms/ia" element={<ProtectedRoute><QMSIA /></ProtectedRoute>} />
            <Route path="/qms/config" element={<ProtectedRoute><QMSConfig /></ProtectedRoute>} />
            <Route path="/grc" element={<ProtectedRoute><GRCDashboard /></ProtectedRoute>} />
            <Route path="/grc/gobierno" element={<ProtectedRoute><GRCGobierno /></ProtectedRoute>} />
            <Route path="/grc/politicas" element={<ProtectedRoute><GRCPoliticas /></ProtectedRoute>} />
            <Route path="/grc/obligaciones" element={<ProtectedRoute><GRCObligaciones /></ProtectedRoute>} />
            <Route path="/grc/riesgos" element={<ProtectedRoute><GRCRiesgos /></ProtectedRoute>} />
            <Route path="/grc/controles" element={<ProtectedRoute><GRCControles /></ProtectedRoute>} />
            <Route path="/grc/cumplimiento" element={<ProtectedRoute><GRCCumplimiento /></ProtectedRoute>} />
            <Route path="/grc/terceros" element={<ProtectedRoute><GRCTerceros /></ProtectedRoute>} />
            <Route path="/grc/auditorias" element={<ProtectedRoute><GRCAuditorias /></ProtectedRoute>} />
            <Route path="/grc/hallazgos" element={<ProtectedRoute><GRCHallazgos /></ProtectedRoute>} />
            <Route path="/grc/continuidad" element={<ProtectedRoute><GRCContinuidad /></ProtectedRoute>} />
            <Route path="/grc/incidentes" element={<ProtectedRoute><GRCIncidentes /></ProtectedRoute>} />
            <Route path="/grc/ia" element={<ProtectedRoute><GRCIA /></ProtectedRoute>} />
            <Route path="/grc/config" element={<ProtectedRoute><GRCConfig /></ProtectedRoute>} />
            <Route path="/lms" element={<ProtectedRoute><LMSDashboard /></ProtectedRoute>} />
            <Route path="/lms/mi-aprendizaje" element={<ProtectedRoute><LMSMiAprendizaje /></ProtectedRoute>} />
            <Route path="/lms/universidad" element={<ProtectedRoute><LMSUniversidad /></ProtectedRoute>} />
            <Route path="/lms/catalogo" element={<ProtectedRoute><LMSCatalogo /></ProtectedRoute>} />
            <Route path="/lms/rutas" element={<ProtectedRoute><LMSRutas /></ProtectedRoute>} />
            <Route path="/lms/onboarding" element={<ProtectedRoute><LMSOnboarding /></ProtectedRoute>} />
            <Route path="/lms/competencias" element={<ProtectedRoute><LMSCompetencias /></ProtectedRoute>} />
            <Route path="/lms/evaluaciones" element={<ProtectedRoute><LMSEvaluaciones /></ProtectedRoute>} />
            <Route path="/lms/banco-preguntas" element={<ProtectedRoute><LMSBancoPreguntas /></ProtectedRoute>} />
            <Route path="/lms/certificaciones" element={<ProtectedRoute><LMSCertificaciones /></ProtectedRoute>} />
            <Route path="/lms/conocimiento" element={<ProtectedRoute><LMSKnowledge /></ProtectedRoute>} />
            <Route path="/lms/gamificacion" element={<ProtectedRoute><LMSGamificacion /></ProtectedRoute>} />
            <Route path="/lms/ia" element={<ProtectedRoute><LMSIA /></ProtectedRoute>} />
            <Route path="/lms/reportes" element={<ProtectedRoute><LMSReportes /></ProtectedRoute>} />
            <Route path="/lms/config" element={<ProtectedRoute><LMSConfig /></ProtectedRoute>} />
            <Route path="/crm" element={<ProtectedRoute><CRMDashboard /></ProtectedRoute>} />
            <Route path="/crm/clientes" element={<ProtectedRoute><CRMClientes /></ProtectedRoute>} />
            <Route path="/crm/leads" element={<ProtectedRoute><CRMLeads /></ProtectedRoute>} />
            <Route path="/crm/oportunidades" element={<ProtectedRoute><CRMOportunidades /></ProtectedRoute>} />
            <Route path="/crm/cotizaciones" element={<ProtectedRoute><CRMCotizaciones /></ProtectedRoute>} />
            <Route path="/crm/contratos" element={<ProtectedRoute><CRMContratos /></ProtectedRoute>} />
            <Route path="/crm/tickets" element={<ProtectedRoute><CRMTickets /></ProtectedRoute>} />
            <Route path="/crm/interacciones" element={<ProtectedRoute><CRMInteracciones /></ProtectedRoute>} />
            <Route path="/crm/campanas" element={<ProtectedRoute><CRMCampanas /></ProtectedRoute>} />
            <Route path="/crm/encuestas" element={<ProtectedRoute><CRMEncuestas /></ProtectedRoute>} />
            <Route path="/crm/cuentas-clave" element={<ProtectedRoute><CRMCuentasClave /></ProtectedRoute>} />
            <Route path="/crm/rentabilidad" element={<ProtectedRoute><CRMRentabilidad /></ProtectedRoute>} />
            <Route path="/crm/ia" element={<ProtectedRoute><CRMIA /></ProtectedRoute>} />
            <Route path="/crm/reportes" element={<ProtectedRoute><CRMReportes /></ProtectedRoute>} />
            <Route path="/crm/config" element={<ProtectedRoute><CRMConfig /></ProtectedRoute>} />
            <Route path="/eam" element={<ProtectedRoute><EAMDashboard /></ProtectedRoute>} />
            <Route path="/eam/activos" element={<ProtectedRoute><EAMActivos /></ProtectedRoute>} />
            <Route path="/eam/ordenes-trabajo" element={<ProtectedRoute><EAMOrdenesTrabajo /></ProtectedRoute>} />
            <Route path="/eam/planes" element={<ProtectedRoute><EAMPlanesMant /></ProtectedRoute>} />
            <Route path="/eam/checklists" element={<ProtectedRoute><EAMChecklists /></ProtectedRoute>} />
            <Route path="/eam/lubricacion" element={<ProtectedRoute><EAMLubricacion /></ProtectedRoute>} />
            <Route path="/eam/neumaticos" element={<ProtectedRoute><EAMNeumaticos /></ProtectedRoute>} />
            <Route path="/eam/combustible" element={<ProtectedRoute><EAMCombustible /></ProtectedRoute>} />
            <Route path="/eam/inventario" element={<ProtectedRoute><EAMInventario /></ProtectedRoute>} />
            <Route path="/eam/confiabilidad" element={<ProtectedRoute><EAMConfiabilidad /></ProtectedRoute>} />
            <Route path="/eam/garantias" element={<ProtectedRoute><EAMGarantias /></ProtectedRoute>} />
            <Route path="/eam/ia" element={<ProtectedRoute><EAMIA /></ProtectedRoute>} />
            <Route path="/eam/reportes" element={<ProtectedRoute><EAMReportes /></ProtectedRoute>} />
            <Route path="/eam/config" element={<ProtectedRoute><EAMConfig /></ProtectedRoute>} />
            <Route path="/mes" element={<ProtectedRoute><MESDashboard /></ProtectedRoute>} />
            <Route path="/mes/planta" element={<ProtectedRoute><MESPlanta /></ProtectedRoute>} />
            <Route path="/mes/ordenes" element={<ProtectedRoute><MESOrdenes /></ProtectedRoute>} />
            <Route path="/mes/programacion" element={<ProtectedRoute><MESProgramacion /></ProtectedRoute>} />
            <Route path="/mes/ejecucion" element={<ProtectedRoute><MESEjecucion /></ProtectedRoute>} />
            <Route path="/mes/trazabilidad" element={<ProtectedRoute><MESTrazabilidad /></ProtectedRoute>} />
            <Route path="/mes/calidad" element={<ProtectedRoute><MESCalidad /></ProtectedRoute>} />
            <Route path="/mes/scrap" element={<ProtectedRoute><MESScrap /></ProtectedRoute>} />
            <Route path="/mes/oee" element={<ProtectedRoute><MESOEE /></ProtectedRoute>} />
            <Route path="/mes/inventario" element={<ProtectedRoute><MESInventario /></ProtectedRoute>} />
            <Route path="/mes/bom" element={<ProtectedRoute><MESBOM /></ProtectedRoute>} />
            <Route path="/mes/ia" element={<ProtectedRoute><MESIA /></ProtectedRoute>} />
            <Route path="/mes/reportes" element={<ProtectedRoute><MESReportes /></ProtectedRoute>} />
            <Route path="/mes/config" element={<ProtectedRoute><MESConfig /></ProtectedRoute>} />
            <Route path="/aps" element={<ProtectedRoute><APSDashboard /></ProtectedRoute>} />
            <Route path="/aps/demanda" element={<ProtectedRoute><APSDemanda /></ProtectedRoute>} />
            <Route path="/aps/soip" element={<ProtectedRoute><APSSOIP /></ProtectedRoute>} />
            <Route path="/aps/plan" element={<ProtectedRoute><APSPlan /></ProtectedRoute>} />
            <Route path="/aps/capacidad" element={<ProtectedRoute><APSCapacidad /></ProtectedRoute>} />
            <Route path="/aps/inventario" element={<ProtectedRoute><APSInventario /></ProtectedRoute>} />
            <Route path="/aps/distribucion" element={<ProtectedRoute><APSDistribucion /></ProtectedRoute>} />
            <Route path="/aps/transporte" element={<ProtectedRoute><APSTransporte /></ProtectedRoute>} />
            <Route path="/aps/escenarios" element={<ProtectedRoute><APSEscenarios /></ProtectedRoute>} />
            <Route path="/aps/restricciones" element={<ProtectedRoute><APSRestricciones /></ProtectedRoute>} />
            <Route path="/aps/kpis" element={<ProtectedRoute><APSKPIs /></ProtectedRoute>} />
            <Route path="/aps/ia" element={<ProtectedRoute><APSAI /></ProtectedRoute>} />
            <Route path="/aps/reportes" element={<ProtectedRoute><APSReportes /></ProtectedRoute>} />
            <Route path="/aps/config" element={<ProtectedRoute><APSConfig /></ProtectedRoute>} />
            <Route path="/erp" element={<ProtectedRoute><ERPDashboard /></ProtectedRoute>} />
            <Route path="/erp/contabilidad" element={<ProtectedRoute><ERPContabilidad /></ProtectedRoute>} />
            <Route path="/erp/tesoreria" element={<ProtectedRoute><ERPTesoreria /></ProtectedRoute>} />
            <Route path="/erp/cxc" element={<ProtectedRoute><ERPCxC /></ProtectedRoute>} />
            <Route path="/erp/cxp" element={<ProtectedRoute><ERPCxP /></ProtectedRoute>} />
            <Route path="/erp/facturacion" element={<ProtectedRoute><ERPFacturacion /></ProtectedRoute>} />
            <Route path="/erp/tributacion" element={<ProtectedRoute><ERPTributacion /></ProtectedRoute>} />
            <Route path="/erp/presupuestos" element={<ProtectedRoute><ERPPresupuestos /></ProtectedRoute>} />
            <Route path="/erp/costeo" element={<ProtectedRoute><ERPCosteo /></ProtectedRoute>} />
            <Route path="/erp/consolidacion" element={<ProtectedRoute><ERPConsolidacion /></ProtectedRoute>} />
            <Route path="/erp/activos" element={<ProtectedRoute><ERPActivos /></ProtectedRoute>} />
            <Route path="/erp/compras" element={<ProtectedRoute><ERPCompras /></ProtectedRoute>} />
            <Route path="/erp/proyectos" element={<ProtectedRoute><ERPProyectos /></ProtectedRoute>} />
            <Route path="/erp/epm" element={<ProtectedRoute><ERPEPM /></ProtectedRoute>} />
            <Route path="/erp/reportes" element={<ProtectedRoute><ERPReportes /></ProtectedRoute>} />
            <Route path="/erp/config" element={<ProtectedRoute><ERPConfig /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
