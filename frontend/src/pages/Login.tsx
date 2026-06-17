import React, { useState } from 'react'
import {
  Box, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress, alpha,
} from '@mui/material'
import {
  Visibility, VisibilityOff, LockOutlined, PersonOutline,
  Inventory2, LocalShipping, QrCode2, CheckCircle,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const PRIMARY      = '#32AC5C'
const PRIMARY_DARK = '#27884A'

const FEATURES = [
  { icon: <Inventory2 sx={{ fontSize: 18 }} />, text: 'Gestión de estibas en tiempo real' },
  { icon: <LocalShipping sx={{ fontSize: 18 }} />, text: 'Trazabilidad completa de movimientos' },
  { icon: <QrCode2 sx={{ fontSize: 18 }} />, text: 'Escaneo QR y RFID integrado' },
  { icon: <CheckCircle sx={{ fontSize: 18 }} />, text: 'Alertas automáticas y reportes' },
]

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login }  = useAuthStore()
  const navigate   = useNavigate()

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

      {/* ── Left panel (branding) ── */}
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
        {/* Background pattern dots */}
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.07,
          backgroundImage: 'radial-gradient(circle, #32AC5C 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />

        {/* Glow orbs */}
        <Box sx={{ position: 'absolute', top: -80, left: -80, width: 320, height: 320,
          borderRadius: '50%', background: alpha(PRIMARY, 0.12), filter: 'blur(60px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: -60, width: 260, height: 260,
          borderRadius: '50%', background: alpha(PRIMARY, 0.08), filter: 'blur(50px)', pointerEvents: 'none' }} />

        {/* Logo */}
        <Box sx={{ position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: '12px',
              background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 8px 24px ${alpha(PRIMARY, 0.4)}`,
            }}>
              <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px' }}>CI</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#FFF', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Control de</Typography>
              <Typography sx={{ color: PRIMARY, fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Inventarios</Typography>
            </Box>
          </Box>
        </Box>

        {/* Main copy */}
        <Box sx={{ position: 'relative' }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Typography sx={{
              color: '#FFF', fontWeight: 800, fontSize: '2rem',
              lineHeight: 1.2, letterSpacing: '-0.03em', mb: 1.5,
            }}>
              Trazabilidad total<br />
              <Box component="span" sx={{ color: PRIMARY }}>de cada estiba</Box>
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, mb: 4 }}>
              Plataforma empresarial para ICOLTRANS.<br />
              Control, visibilidad y eficiencia operacional.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 + i * 0.08 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      width: 32, height: 32, borderRadius: '8px',
                      bgcolor: alpha(PRIMARY, 0.15),
                      border: `1px solid ${alpha(PRIMARY, 0.25)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: PRIMARY, flexShrink: 0,
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
        </Box>

        {/* Footer */}
        <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, position: 'relative' }}>
          © 2025 Industria Colombiana de Logística y Transporte
        </Typography>
      </Box>

      {/* ── Right panel (form) ── */}
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
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '10px',
              background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${alpha(PRIMARY, 0.35)}`,
            }}>
              <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: 14 }}>CI</Typography>
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0D1117' }}>
              Control de Inventarios
            </Typography>
          </Box>

          {/* Heading */}
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
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: '10px', fontSize: 13 }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151', mb: 0.75 }}>
                Usuario
              </Typography>
              <TextField
                fullWidth
                placeholder="Tu nombre de usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutline sx={{ fontSize: 18, color: '#9CA3AF' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#FFF',
                    fontSize: 14,
                    borderRadius: '10px',
                    '& fieldset': { borderColor: '#E5E7EB' },
                    '&:hover fieldset': { borderColor: '#D1D5DB' },
                    '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 },
                    '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(PRIMARY, 0.12)}` },
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 3.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151', mb: 0.75 }}>
                Contraseña
              </Typography>
              <TextField
                fullWidth
                placeholder="Tu contraseña"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ fontSize: 18, color: '#9CA3AF' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small" tabIndex={-1}>
                        {showPwd
                          ? <VisibilityOff sx={{ fontSize: 18, color: '#9CA3AF' }} />
                          : <Visibility sx={{ fontSize: 18, color: '#9CA3AF' }} />
                        }
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#FFF',
                    fontSize: 14,
                    borderRadius: '10px',
                    '& fieldset': { borderColor: '#E5E7EB' },
                    '&:hover fieldset': { borderColor: '#D1D5DB' },
                    '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 },
                    '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(PRIMARY, 0.12)}` },
                  },
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.35,
                fontSize: 14.5,
                fontWeight: 700,
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
                boxShadow: `0 4px 14px ${alpha(PRIMARY, 0.4)}`,
                letterSpacing: '-0.01em',
                '&:hover': {
                  background: `linear-gradient(135deg, #3DC46A 0%, ${PRIMARY} 100%)`,
                  boxShadow: `0 6px 20px ${alpha(PRIMARY, 0.5)}`,
                  transform: 'translateY(-1px)',
                },
                '&:active': { transform: 'translateY(0)' },
                transition: 'all 0.18s ease',
              }}
            >
              {loading
                ? <CircularProgress size={20} sx={{ color: '#FFF' }} />
                : 'Ingresar al sistema'
              }
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
