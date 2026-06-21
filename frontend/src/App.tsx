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
import CommandCenter from '@/pages/CommandCenter'
import Mantenimiento from '@/pages/Mantenimiento'
import CostosReporte from '@/pages/CostosReporte'
import Consultas from '@/pages/Consultas'
import Fletes from '@/pages/Fletes'
import FletesGeneradores from '@/pages/FletesGeneradores'
import FletesConductores from '@/pages/FletesConductores'
import FlotaDashboard from '@/pages/FlotaDashboard'
import FlotaVehiculos from '@/pages/FlotaVehiculos'
import FlotaCombustible from '@/pages/FlotaCombustible'
import FlotaDocumentos from '@/pages/FlotaDocumentos'
import FlotaMantenimiento from '@/pages/FlotaMantenimiento'
import FlotaPersonal from '@/pages/FlotaPersonal'
import FlotaConfig from '@/pages/FlotaConfig'
import FlotaRutinas from '@/pages/FlotaRutinas'
import FlotaConfiabilidad from '@/pages/FlotaConfiabilidad'
import LocativaDashboard from '@/pages/LocativaDashboard'
import LocativaActivos from '@/pages/LocativaActivos'
import LocativaOrdenes from '@/pages/LocativaOrdenes'
import LocativaRiesgos from '@/pages/LocativaRiesgos'
import LocativaEnergia from '@/pages/LocativaEnergia'
import LocativaConfig from '@/pages/LocativaConfig'
import WMSDashboard from '@/pages/WMSDashboard'
import WMSRecepcion from '@/pages/WMSRecepcion'
import WMSInventario from '@/pages/WMSInventario'
import WMSPicking from '@/pages/WMSPicking'
import WMSDespacho from '@/pages/WMSDespacho'
import WMSTrazabilidad from '@/pages/WMSTrazabilidad'
import WMSConfig from '@/pages/WMSConfig'
import GHDashboard from '@/pages/GHDashboard'
import GHColaboradores from '@/pages/GHColaboradores'
import GHConductores from '@/pages/GHConductores'
import GHIncapacidades from '@/pages/GHIncapacidades'
import GHVacaciones from '@/pages/GHVacaciones'
import GHReclutamiento from '@/pages/GHReclutamiento'
import GHCapacitacion from '@/pages/GHCapacitacion'
import GHSST from '@/pages/GHSST'
import GHNomina from '@/pages/GHNomina'
import GHEvaluacion from '@/pages/GHEvaluacion'
import GHConfig from '@/pages/GHConfig'
import TMSDashboard from '@/pages/TMSDashboard'
import TMSViajes from '@/pages/TMSViajes'
import TMSPlaneacion from '@/pages/TMSPlaneacion'
import TMSDespachos from '@/pages/TMSDespachos'
import TMSTracking from '@/pages/TMSTracking'
import TMSVehiculos from '@/pages/TMSVehiculos'
import TMSConductores from '@/pages/TMSConductores'
import TMSTorreControl from '@/pages/TMSTorreControl'
import TMSRutas from '@/pages/TMSRutas'
import TMSDocumentos from '@/pages/TMSDocumentos'
import TMSCostos from '@/pages/TMSCostos'
import TMSOTIF from '@/pages/TMSOTIF'
import TMSLiquidaciones from '@/pages/TMSLiquidaciones'
import TMSConfig from '@/pages/TMSConfig'
import DMSDashboard from '@/pages/DMSDashboard'
import DMSRepositorio from '@/pages/DMSRepositorio'
import DMSDocumentos from '@/pages/DMSDocumentos'
import DMSCategorias from '@/pages/DMSCategorias'
import DMSExpedientes from '@/pages/DMSExpedientes'
import DMSWorkflow from '@/pages/DMSWorkflow'
import DMSFirmas from '@/pages/DMSFirmas'
import DMSBusqueda from '@/pages/DMSBusqueda'
import DMSRetencion from '@/pages/DMSRetencion'
import DMSAuditoria from '@/pages/DMSAuditoria'
import DMSIntegraciones from '@/pages/DMSIntegraciones'
import DMSIA from '@/pages/DMSIA'
import DMSPortal from '@/pages/DMSPortal'
import DMSConfig from '@/pages/DMSConfig'
import QMSDashboard from '@/pages/QMSDashboard'
import QMSProcesos from '@/pages/QMSProcesos'
import QMSIndicadores from '@/pages/QMSIndicadores'
import QMSNoConformidades from '@/pages/QMSNoConformidades'
import QMSAuditorias from '@/pages/QMSAuditorias'
import QMSHallazgos from '@/pages/QMSHallazgos'
import QMSRiesgos from '@/pages/QMSRiesgos'
import QMSQuejas from '@/pages/QMSQuejas'
import QMSProveedores from '@/pages/QMSProveedores'
import QMSMejora from '@/pages/QMSMejora'
import QMSEncuestas from '@/pages/QMSEncuestas'
import QMSCambios from '@/pages/QMSCambios'
import QMSIA from '@/pages/QMSIA'
import QMSConfig from '@/pages/QMSConfig'
import GRCDashboard from '@/pages/GRCDashboard'
import GRCGobierno from '@/pages/GRCGobierno'
import GRCPoliticas from '@/pages/GRCPoliticas'
import GRCObligaciones from '@/pages/GRCObligaciones'
import GRCRiesgos from '@/pages/GRCRiesgos'
import GRCControles from '@/pages/GRCControles'
import GRCCumplimiento from '@/pages/GRCCumplimiento'
import GRCTerceros from '@/pages/GRCTerceros'
import GRCAuditorias from '@/pages/GRCAuditorias'
import GRCHallazgos from '@/pages/GRCHallazgos'
import GRCContinuidad from '@/pages/GRCContinuidad'
import GRCIncidentes from '@/pages/GRCIncidentes'
import GRCIA from '@/pages/GRCIA'
import GRCConfig from '@/pages/GRCConfig'
import LMSDashboard from '@/pages/LMSDashboard'
import LMSMiAprendizaje from '@/pages/LMSMiAprendizaje'
import LMSUniversidad from '@/pages/LMSUniversidad'
import LMSCatalogo from '@/pages/LMSCatalogo'
import LMSRutas from '@/pages/LMSRutas'
import LMSOnboarding from '@/pages/LMSOnboarding'
import LMSCompetencias from '@/pages/LMSCompetencias'
import LMSEvaluaciones from '@/pages/LMSEvaluaciones'
import LMSBancoPreguntas from '@/pages/LMSBancoPreguntas'
import LMSCertificaciones from '@/pages/LMSCertificaciones'
import LMSKnowledge from '@/pages/LMSKnowledge'
import LMSGamificacion from '@/pages/LMSGamificacion'
import LMSIA from '@/pages/LMSIA'
import LMSReportes from '@/pages/LMSReportes'
import LMSConfig from '@/pages/LMSConfig'
import CRMDashboard from '@/pages/CRMDashboard'
import CRMClientes from '@/pages/CRMClientes'
import CRMLeads from '@/pages/CRMLeads'
import CRMOportunidades from '@/pages/CRMOportunidades'
import CRMCotizaciones from '@/pages/CRMCotizaciones'
import CRMContratos from '@/pages/CRMContratos'
import CRMTickets from '@/pages/CRMTickets'
import CRMInteracciones from '@/pages/CRMInteracciones'
import CRMCampanas from '@/pages/CRMCampanas'
import CRMEncuestas from '@/pages/CRMEncuestas'
import CRMCuentasClave from '@/pages/CRMCuentasClave'
import CRMRentabilidad from '@/pages/CRMRentabilidad'
import CRMIA from '@/pages/CRMIA'
import CRMReportes from '@/pages/CRMReportes'
import CRMConfig from '@/pages/CRMConfig'
import EAMDashboard from '@/pages/EAMDashboard'
import EAMActivos from '@/pages/EAMActivos'
import EAMOrdenesTrabajo from '@/pages/EAMOrdenesTrabajo'
import EAMPlanesMant from '@/pages/EAMPlanesMant'
import EAMChecklists from '@/pages/EAMChecklists'
import EAMLubricacion from '@/pages/EAMLubricacion'
import EAMNeumaticos from '@/pages/EAMNeumaticos'
import EAMCombustible from '@/pages/EAMCombustible'
import EAMInventario from '@/pages/EAMInventario'
import EAMConfiabilidad from '@/pages/EAMConfiabilidad'
import EAMGarantias from '@/pages/EAMGarantias'
import EAMIA from '@/pages/EAMIA'
import EAMReportes from '@/pages/EAMReportes'
import EAMConfig from '@/pages/EAMConfig'
import MESDashboard from '@/pages/MESDashboard'
import MESPlanta from '@/pages/MESPlanta'
import MESOrdenes from '@/pages/MESOrdenes'
import MESProgramacion from '@/pages/MESProgramacion'
import MESEjecucion from '@/pages/MESEjecucion'
import MESTrazabilidad from '@/pages/MESTrazabilidad'
import MESCalidad from '@/pages/MESCalidad'
import MESScrap from '@/pages/MESScrap'
import MESOEE from '@/pages/MESOEE'
import MESInventario from '@/pages/MESInventario'
import MESBOM from '@/pages/MESBOM'
import MESIA from '@/pages/MESIA'
import MESReportes from '@/pages/MESReportes'
import MESConfig from '@/pages/MESConfig'

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
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
