/**
 * La app móvil del CMMS: versión publicada, descarga del APK, código QR y
 * cómo instalarla. Se muestra como ventana desde el encabezado y como página
 * en /app-movil, que es a donde lleva el QR: en el teléfono se ingresa al
 * portal y se descarga desde ahí, así la descarga sigue exigiendo sesión.
 *
 * Solo para empresas con el CMMS: el servidor lo vuelve a comprobar (el prefijo
 * /movil pertenece al módulo eam).
 */
import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography,
} from '@mui/material'
import { Close, Download, PhoneAndroid } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { ACENTO } from '@/config/marca'
import { mensajeDeError } from '@/utils/errorApi'

interface VersionApp {
  version: string
  codigo: number
  notas: string
  publicada: string
  tamano: number
  sha256: string
  minima?: string | null
}

export function useTieneCmms(): boolean {
  const modulos = useAuthStore(s => s.modulos)
  return modulos.includes('*') || modulos.includes('eam')
}

const PASOS = [
  'Toque «Descargar APK» en el teléfono Android (o escanee el código desde el computador).',
  'Abra el archivo descargado. Si Android lo pide, permita instalar apps de esta fuente.',
  'Abra TittanWare e ingrese con el código de su empresa, su usuario y su contraseña.',
]

export function PanelAppMovil() {
  const [qr, setQr] = useState<string | null>(null)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data, isLoading, error: errorVersion } = useQuery({
    queryKey: ['movil-version'],
    queryFn: () => apiClient.get<VersionApp>('/movil/version').then(r => r.data),
    retry: false,
  })

  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/app-movil`, { margin: 1, width: 360, color: { dark: '#0E1013', light: '#FFFFFF' } })
      .then(setQr).catch(() => setQr(null))
  }, [])

  const descargar = async () => {
    if (!data) return
    setDescargando(true)
    setError(null)
    try {
      const r = await apiClient.get('/movil/descarga', { responseType: 'blob', timeout: 300_000 })
      const url = URL.createObjectURL(r.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `TittanWare-${data.version}.apk`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo descargar la app'))
    } finally {
      setDescargando(false)
    }
  }

  const sinVersion = (errorVersion as { response?: { status?: number } } | null)?.response?.status === 404

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
      <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>TittanWare para Android</Typography>
          <Typography variant="body2" color="text.secondary">
            Las órdenes de trabajo del CMMS en el teléfono: vea las suyas, inícielas y ciérrelas junto al equipo.
          </Typography>
        </Box>

        {isLoading ? <CircularProgress size={24} /> : sinVersion ? (
          <Alert severity="info">Todavía no hay una versión publicada de la app. Aparecerá aquí en cuanto se publique.</Alert>
        ) : errorVersion ? (
          <Alert severity="error">{mensajeDeError(errorVersion, 'No se pudo consultar la versión de la app')}</Alert>
        ) : data && (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`Versión ${data.version}`} sx={{ fontWeight: 600, bgcolor: `${ACENTO.base}14`, color: ACENTO.profundo }} />
              <Chip size="small" variant="outlined" label={`${(data.tamano / 1e6).toFixed(1)} MB`} />
              <Chip size="small" variant="outlined" label={`Publicada ${new Date(data.publicada).toLocaleDateString('es-CO', { dateStyle: 'medium' })}`} />
            </Stack>
            {data.notas && <Typography variant="body2">{data.notas}</Typography>}
            <Box>
              <Button variant="contained" size="large" startIcon={descargando ? <CircularProgress size={18} color="inherit" /> : <Download />}
                onClick={descargar} disabled={descargando}>
                {descargando ? 'Descargando…' : 'Descargar APK'}
              </Button>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
          </>
        )}

        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Cómo instalarla</Typography>
          <Stack component="ol" spacing={0.75} sx={{ m: 0, pl: 2.5 }}>
            {PASOS.map(p => <Typography key={p} component="li" variant="body2" color="text.secondary">{p}</Typography>)}
          </Stack>
        </Box>
        <Typography variant="caption" color="text.secondary">
          El teléfono queda vinculado a su usuario por 30 días desde el último uso. Si lo pierde, avise a su administrador para retirarle el acceso.
        </Typography>
      </Stack>

      {qr && (
        <Stack alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
          <Box component="img" src={qr} alt="Código QR para abrir la descarga en el teléfono"
            sx={{ width: 180, height: 180, borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 1, bgcolor: '#fff' }} />
          <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ maxWidth: 180 }}>
            Escanéelo con el teléfono para descargar ahí
          </Typography>
        </Stack>
      )}
    </Stack>
  )
}

/** Botón del encabezado. No aparece si la empresa no tiene el CMMS. */
export function BotonAppMovil({ sx }: { sx?: object }) {
  const tiene = useTieneCmms()
  const [abierto, setAbierto] = useState(false)
  if (!tiene) return null
  return (
    <>
      <Tooltip title="App móvil">
        <IconButton size="small" onClick={() => setAbierto(true)} sx={sx} aria-label="App móvil">
          <PhoneAndroid fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          App móvil
          <IconButton aria-label="Cerrar" onClick={() => setAbierto(false)} sx={{ position: 'absolute', right: 12, top: 12 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent><PanelAppMovil /></DialogContent>
      </Dialog>
    </>
  )
}
