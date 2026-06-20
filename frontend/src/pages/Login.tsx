import React, { useState, useEffect } from 'react'
import {
  Box, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress, alpha,
} from '@mui/material'
import {
  Visibility, VisibilityOff, LockOutlined, PersonOutline,
  Inventory2, LocalShipping, QrCode2, CheckCircle,
  TableChart, TrendingUp, CompareArrows, CloudDownload,
  Route, AssignmentInd, QueuePlayNext, Schedule,
  DirectionsCar, Build, LocalGasStation, Description,
  Engineering, Shield, Bolt, Inventory2 as ActivoIcon2,
  Warehouse, MoveToInbox, SwapHoriz, Send as WMSDespachoIcon,
  PeopleAlt, Groups as GroupsIcon, Payments as PaymentsIcon, HealthAndSafety as HASIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULOS DEL CARRUSEL
// Para agregar un nuevo módulo simplemente añade un objeto a este array.
// Campos:
//   id          → clave única (string)
//   badge       → texto del ícono cuadrado (2–3 letras)
//   appName     → línea 1 del nombre de la app
//   appAccent   → línea 2 del nombre de la app (en color)
//   headline    → título grande, línea 1
//   headlineAccent → título grande, línea 2 (en color)
//   description → subtítulo debajo del headline
//   color       → color primario del módulo (hex)
//   colorDark   → color primario oscuro (para gradientes)
//   features    → array de { icon: ReactNode, text: string }
// ─────────────────────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: 'ce',
    badge: 'CE',
    appName: 'Control de',
    appAccent: 'Estibas',
    headline: 'Trazabilidad total',
    headlineAccent: 'de cada estiba',
    description: 'Plataforma empresarial para ICOLTRANS.\nControl, visibilidad y eficiencia operacional.',
    color: '#32AC5C',
    colorDark: '#27884A',
    features: [
      { icon: <Inventory2 sx={{ fontSize: 17 }} />, text: 'Gestión de estibas en tiempo real' },
      { icon: <LocalShipping sx={{ fontSize: 17 }} />, text: 'Trazabilidad completa de movimientos' },
      { icon: <QrCode2 sx={{ fontSize: 17 }} />, text: 'Escaneo QR y RFID integrado' },
      { icon: <CheckCircle sx={{ fontSize: 17 }} />, text: 'Alertas automáticas y reportes de costos' },
    ],
  },
  {
    id: 'tx',
    badge: 'TX',
    appName: 'TarifaX',
    appAccent: 'Motor de Tarifas',
    headline: 'Cruces de tarifas',
    headlineAccent: 'al instante',
    description: 'Motor de cruce de fletes SICETAC.\nCompara y toma decisiones en segundos.',
    color: '#369E4D',
    colorDark: '#1f6130',
    features: [
      { icon: <CompareArrows sx={{ fontSize: 17 }} />, text: 'Cruza los fletes con el × TARIFARIO_SICETAC en un clic' },
      { icon: <TrendingUp sx={{ fontSize: 17 }} />, text: 'Métricas de coincidencia automáticas' },
      { icon: <CloudDownload sx={{ fontSize: 17 }} />, text: 'Resultado descargable en Excel' },
      { icon: <TableChart sx={{ fontSize: 17 }} />, text: 'Dashboard Power BI integrado para evaluar tendencias' },
    ],
  },
  {
     id: 'Command Center',
     badge: 'CC',
     appName: 'Command Center',
     appAccent: 'Visualización de datos',
     headline: 'Analiza tus datos y',
     headlineAccent: 'Toma decisiones en segundos',
     description: 'Modúlo dedicado a la visualización y analítica de datos.',
     color: '#3B82F6',
     colorDark: '#1D4ED8',
     features: [
       { icon: <TableChart sx={{ fontSize: 17 }} />, text: 'Dashboard Operaciones, Almacenamiento y Logística' },
       { icon: <TableChart sx={{ fontSize: 17 }} />, text: 'Dashboard Mantenimiento' },
       { icon: <TableChart sx={{ fontSize: 17 }} />, text: 'Dashboard Gestión Humana' },
     ],
   },
  {
    id: 'fletes',
    badge: 'FT',
    appName: 'Módulo de',
    appAccent: 'Fletes',
    headline: 'Despacho y asignación',
    headlineAccent: 'de conductores',
    description: 'Gestión integral de fletes para ICOLTRANS.\nRegistra viajes, asigna conductores y administra turnos.',
    color: '#F59E0B',
    colorDark: '#D97706',
    features: [
      { icon: <Route sx={{ fontSize: 17 }} />, text: 'Registro de fletes con origen, destino y tipo de vehículo' },
      { icon: <AssignmentInd sx={{ fontSize: 17 }} />, text: 'Asignación directa de conductor y vehículo al viaje' },
      { icon: <QueuePlayNext sx={{ fontSize: 17 }} />, text: 'Sistema de enturnamiento de conductores disponibles' },
      { icon: <Schedule sx={{ fontSize: 17 }} />, text: 'Agenda de citas de cargue y entrega por ciudad' },
    ],
  },
  {
    id: 'flota',
    badge: 'GF',
    appName: 'Gestión de',
    appAccent: 'Flotas',
    headline: 'Control total',
    headlineAccent: 'de tu flota vehicular',
    description: 'Módulo integral de gestión de flotas para ICOLTRANS.\nVehículos, mantenimiento, combustible y documentos.',
    color: '#7C3AED',
    colorDark: '#5B21B6',
    features: [
      { icon: <DirectionsCar sx={{ fontSize: 17 }} />, text: 'Catálogo de vehículos con semáforo documental' },
      { icon: <Build sx={{ fontSize: 17 }} />, text: 'Órdenes de trabajo: preventivo y correctivo' },
      { icon: <LocalGasStation sx={{ fontSize: 17 }} />, text: 'Registro y análisis de consumo de combustible' },
      { icon: <Description sx={{ fontSize: 17 }} />, text: 'Alertas automáticas de vencimiento de documentos' },
    ],
  },
  {
    id: 'locativa',
    badge: 'ML',
    appName: 'Mantenimiento',
    appAccent: 'Locativo',
    headline: 'Activos bajo control,',
    headlineAccent: 'instalaciones en orden',
    description: 'ISO 55000 · ISO 41001 · IAS 16 · ISO 31000.\nGestión integral de activos físicos e instalaciones.',
    color: '#0D9488',
    colorDark: '#0F766E',
    features: [
      { icon: <ActivoIcon2 sx={{ fontSize: 17 }} />, text: 'Inventario de activos con valoración IAS 16' },
      { icon: <Engineering sx={{ fontSize: 17 }} />, text: 'Órdenes de trabajo preventivas y correctivas' },
      { icon: <Shield sx={{ fontSize: 17 }} />, text: 'Registro de riesgos ISO 31000 con matriz 5×5' },
      { icon: <Bolt sx={{ fontSize: 17 }} />, text: 'Monitoreo de energía y detección de anomalías ISO 50001' },
    ],
  },
  {
    id: 'gh',
    badge: 'GH',
    appName: 'Gestión',
    appAccent: 'Humana HCM',
    headline: 'Personas en el centro,',
    headlineAccent: 'operación sin límites',
    description: 'ISO 45001 · SGSST · Nómina · Talento.\nCiclo completo del colaborador, desde el ingreso hasta la desvinculación.',
    color: '#BE185D',
    colorDark: '#9D174D',
    features: [
      { icon: <PeopleAlt sx={{ fontSize: 17 }} />, text: 'Colaboradores y conductores con perfil 360°' },
      { icon: <PaymentsIcon sx={{ fontSize: 17 }} />, text: 'Nómina automática: horas extras, recargos y cesantías' },
      { icon: <GroupsIcon sx={{ fontSize: 17 }} />, text: 'Reclutamiento, evaluación de desempeño y capacitación' },
      { icon: <HASIcon sx={{ fontSize: 17 }} />, text: 'SST ISO 45001: incidentes, riesgos e inspecciones' },
    ],
  },
  {
    id: 'wms',
    badge: 'WMS',
    appName: 'Warehouse',
    appAccent: 'Management System',
    headline: 'Bodega inteligente,',
    headlineAccent: 'despacho perfecto',
    description: 'OTIF · Fill Rate · Inventory Accuracy.\nGestión end-to-end de la cadena logística interna.',
    color: '#1E40AF',
    colorDark: '#1e3a8a',
    features: [
      { icon: <MoveToInbox sx={{ fontSize: 17 }} />, text: 'Recepción con ASN y control de calidad por lote' },
      { icon: <Warehouse sx={{ fontSize: 17 }} />, text: 'Inventario por ubicación FIFO/FEFO con conteos cíclicos' },
      { icon: <SwapHoriz sx={{ fontSize: 17 }} />, text: 'Picking Batch/Zone/Wave con confirmación QR' },
      { icon: <WMSDespachoIcon sx={{ fontSize: 17 }} />, text: 'Despacho OTIF y trazabilidad total por producto/lote' },
    ],
  },

]

const INTERVAL_MS = 5000  // milisegundos entre cada slide

// Variantes de animación: la nueva slide entra desde la derecha
const slideVariants = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  exit:  { x: -60, opacity: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [slide, setSlide]       = useState(0)
  const { login }  = useAuthStore()
  const navigate   = useNavigate()

  const current = MODULES[slide]

  // Auto-avance del carrusel
  useEffect(() => {
    const timer = setInterval(() => {
      setSlide(s => (s + 1) % MODULES.length)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(username, password)
      toast.success('Bienvenido al sistema')
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Panel izquierdo — carrusel ── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '45%',
          background: `linear-gradient(150deg, #0D1117 0%, #111827 60%, #0D2010 100%)`,
          p: 5,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Puntos de fondo */}
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.07,
          backgroundImage: 'radial-gradient(circle, #32AC5C 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />

        {/* Orbes de luz — cambian de color con el módulo activo */}
        <AnimatePresence mode="sync">
          <motion.div
            key={`orb-top-${slide}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ position: 'absolute', top: -80, left: -80, width: 320, height: 320,
              borderRadius: '50%', background: alpha(current.color, 0.14),
              filter: 'blur(60px)', pointerEvents: 'none' }}
          />
          <motion.div
            key={`orb-bot-${slide}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ position: 'absolute', bottom: -60, right: -60, width: 260, height: 260,
              borderRadius: '50%', background: alpha(current.color, 0.09),
              filter: 'blur(50px)', pointerEvents: 'none' }}
          />
        </AnimatePresence>

        {/* Badge de la app (arriba a la izquierda) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`badge-${slide}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35 }}
            style={{ position: 'relative' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                width: 44, height: 44, borderRadius: '12px',
                background: `linear-gradient(135deg, ${current.color} 0%, ${current.colorDark} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 24px ${alpha(current.color, 0.45)}`,
                transition: 'all 0.4s ease',
              }}>
                <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px' }}>
                  {current.badge}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: '#FFF', fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 }}>
                  {current.appName}
                </Typography>
                <Typography sx={{ color: current.color, fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, transition: 'color 0.4s ease' }}>
                  {current.appAccent}
                </Typography>
              </Box>
            </Box>
          </motion.div>
        </AnimatePresence>

        {/* Contenido principal — anima como carrusel */}
        <Box sx={{ position: 'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {/* Headline */}
              <Typography sx={{
                color: '#FFF', fontWeight: 800, fontSize: '2rem',
                lineHeight: 1.2, letterSpacing: '-0.03em', mb: 1.5,
              }}>
                {current.headline}<br />
                <Box component="span" sx={{ color: current.color, transition: 'color 0.4s ease' }}>
                  {current.headlineAccent}
                </Box>
              </Typography>

              {/* Descripción */}
              <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 13.5, lineHeight: 1.75, mb: 4, whiteSpace: 'pre-line' }}>
                {current.description}
              </Typography>

              {/* Lista de características */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                {current.features.map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 + i * 0.07 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 32, height: 32, borderRadius: '8px',
                        bgcolor: alpha(current.color, 0.15),
                        border: `1px solid ${alpha(current.color, 0.28)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: current.color, flexShrink: 0,
                        transition: 'all 0.4s ease',
                      }}>
                        {f.icon}
                      </Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13.5 }}>
                        {f.text}
                      </Typography>
                    </Box>
                  </motion.div>
                ))}
              </Box>
            </motion.div>
          </AnimatePresence>
        </Box>

        {/* Footer: indicadores de slide + copyright */}
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Dots */}
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {MODULES.map((m, i) => (
              <Box
                key={m.id}
                onClick={() => setSlide(i)}
                sx={{
                  height: 6,
                  width: i === slide ? 22 : 6,
                  borderRadius: 99,
                  bgcolor: i === slide ? current.color : 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.35s ease',
                  '&:hover': { bgcolor: i === slide ? current.color : 'rgba(255,255,255,0.4)' },
                }}
              />
            ))}
          </Box>
          <Typography sx={{ color: 'rgba(255,255,255,0.18)', fontSize: 11.5 }}>
            © 2026 Industria Colombiana de Logística y Transporte
          </Typography>
        </Box>
      </Box>

      {/* ── Panel derecho — formulario ── */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F8FAFC',
        p: { xs: 3, sm: 5 },
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          {/* Logo ICOLTRANS */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4.5 }}>
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E8EDF2',
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                px: 4,
                py: 2.5,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                component="img"
                src="/logo-icoltrans.png"
                alt="ICOLTRANS · Aligeramos sus cargas"
                sx={{ width: 200, height: 'auto', display: 'block' }}
              />
            </Box>
          </Box>

          {/* Título */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{
              fontWeight: 800, fontSize: '1.75rem', color: '#0D1117',
              letterSpacing: '-0.03em', lineHeight: 1.2, mb: 0.75,
            }}>
              Bienvenido
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: 14 }}>
              Ingresa tus credenciales para continuar
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '10px', fontSize: 13 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151', mb: 0.75 }}>Usuario</Typography>
              <TextField
                fullWidth placeholder="Tu nombre de usuario"
                value={username} onChange={e => setUsername(e.target.value)}
                required size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><PersonOutline sx={{ fontSize: 18, color: '#9CA3AF' }} /></InputAdornment>,
                }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#FFF', fontSize: 14, borderRadius: '10px',
                  '& fieldset': { borderColor: '#E5E7EB' }, '&:hover fieldset': { borderColor: '#D1D5DB' },
                  '&.Mui-focused fieldset': { borderColor: '#32AC5C', borderWidth: 1.5 },
                  '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(50,172,92,0.12)' } } }}
              />
            </Box>

            <Box sx={{ mb: 3.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151', mb: 0.75 }}>Contraseña</Typography>
              <TextField
                fullWidth placeholder="Tu contraseña"
                type={showPwd ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                required size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockOutlined sx={{ fontSize: 18, color: '#9CA3AF' }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small" tabIndex={-1}>
                        {showPwd
                          ? <VisibilityOff sx={{ fontSize: 18, color: '#9CA3AF' }} />
                          : <Visibility sx={{ fontSize: 18, color: '#9CA3AF' }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#FFF', fontSize: 14, borderRadius: '10px',
                  '& fieldset': { borderColor: '#E5E7EB' }, '&:hover fieldset': { borderColor: '#D1D5DB' },
                  '&.Mui-focused fieldset': { borderColor: '#32AC5C', borderWidth: 1.5 },
                  '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(50,172,92,0.12)' } } }}
              />
            </Box>

            <Button
              type="submit" fullWidth variant="contained" disabled={loading}
              sx={{
                py: 1.35, fontSize: 14.5, fontWeight: 700, borderRadius: '10px',
                background: 'linear-gradient(135deg, #32AC5C 0%, #27884A 100%)',
                boxShadow: '0 4px 14px rgba(50,172,92,0.4)', letterSpacing: '-0.01em',
                '&:hover': { background: 'linear-gradient(135deg, #3DC46A 0%, #32AC5C 100%)',
                  boxShadow: '0 6px 20px rgba(50,172,92,0.5)', transform: 'translateY(-1px)' },
                '&:active': { transform: 'translateY(0)' },
                transition: 'all 0.18s ease',
              }}
            >
              {loading ? <CircularProgress size={20} sx={{ color: '#FFF' }} /> : 'Ingresar al sistema'}
            </Button>
          </form>

          <Typography sx={{ mt: 4, textAlign: 'center', color: '#CBD5E1', fontSize: 12 }}>
            © 2025 ICOLTRANS · Uso interno exclusivo
          </Typography>
        </motion.div>
      </Box>
    </Box>
  )
}
