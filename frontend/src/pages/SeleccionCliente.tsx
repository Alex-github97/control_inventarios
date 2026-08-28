/**
 * Paso previo al login: a qué empresa se entra.
 *
 * La plataforma es multicliente y cada empresa vive en su propio esquema, así
 * que hay que saber cuál antes de poder buscar al usuario: dos empresas pueden
 * tener un "admin" cada una y son personas distintas.
 *
 * No hay lista de clientes a propósito — quien entra debe conocer su código,
 * de modo que desde fuera no se pueda averiguar qué empresas usan la
 * plataforma.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, TextField, Button, Typography, Stack, Alert,
  CircularProgress, InputAdornment,
} from '@mui/material'
import { Business, ArrowForward } from '@mui/icons-material'
import { Logotipo } from '@/components/Logotipo'
import { resolverCliente, guardarCliente, clienteGuardado } from '@/api/cliente'

export default function SeleccionCliente() {
  const navigate = useNavigate()
  const guardado = clienteGuardado()
  const [codigo, setCodigo] = useState(guardado?.codigo ?? '')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const continuar = async () => {
    const limpio = codigo.trim().toLowerCase()
    if (!limpio) {
      setError('Escriba el código de su empresa')
      return
    }
    setCargando(true)
    setError('')
    try {
      const cliente = await resolverCliente(limpio)
      guardarCliente(cliente)
      navigate('/login')
    } catch (e: any) {
      // El mensaje del servidor distingue "no existe" de "suspendido", que son
      // cosas distintas para quien está intentando entrar.
      setError(e?.response?.data?.detail ?? 'No se pudo verificar la empresa. Intente de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1A1A1A 0%, #333333 100%)', p: 2,
    }}>
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 4, boxShadow: 8 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={1.5} alignItems="center" mb={3}>
            <Logotipo tamano={22} conLema />
            <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>Ingrese a su empresa</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Escriba el código que le fue asignado para continuar al inicio de sesión.
            </Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            fullWidth autoFocus label="Código de la empresa" value={codigo}
            onChange={e => setCodigo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') continuar() }}
            disabled={cargando}
            placeholder="por ejemplo: demo"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><Business sx={{ fontSize: 18 }} /></InputAdornment>
              ),
            }}
            // El código es la llave del esquema; se normaliza acá para que no
            // dependa de cómo lo escriban.
            inputProps={{ style: { textTransform: 'lowercase' }, maxLength: 40 }}
            sx={{ mb: 2 }}
          />

          <Button
            fullWidth variant="contained" size="large" onClick={continuar}
            disabled={cargando || !codigo.trim()}
            endIcon={cargando ? undefined : <ArrowForward />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1.2 }}
          >
            {cargando ? <CircularProgress size={22} color="inherit" /> : 'Continuar'}
          </Button>

          <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
            ¿No conoce el código de su empresa? Consúltelo con su administrador.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
