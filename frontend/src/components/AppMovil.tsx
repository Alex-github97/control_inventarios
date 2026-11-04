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
  Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography,
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
  'Cuando termine, toque la notificación de la descarga o abra el archivo en «Descargas».',
  'Si Android lo pide, permita instalar apps de esta fuente y toque «Instalar».',
  'Abra TittanWare e ingrese con el código de su empresa, su usuario y su contraseña.',
]

// En el teléfono el panel se arma alrededor del botón; el QR sobra (ya se está en el teléfono).
const AGENTE = typeof navigator === 'undefined' ? '' : navigator.userAgent
const ES_IOS = /iPhone|iPad|iPod/i.test(AGENTE)
const EN_TELEFONO = ES_IOS || /Android/i.test(AGENTE)

export function PanelAppMovil() {
  const [qr, setQr] = useState<string | null>(null)
  const [descargando, setDescargando] = useState(false)
  const [iniciada, setIniciada] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data, isLoading, error: errorVersion } = useQuery({
    queryKey: ['movil-version'],
    queryFn: () => apiClient.get<VersionApp>('/movil/version').then(r => r.data),
    retry: false,
  })

  useEffect(() => {
    if (EN_TELEFONO) return
    QRCode.toDataURL(`${window.location.origin}/app-movil`, { margin: 1, width: 360, color: { dark: '#0E1013', light: '#FFFFFF' } })
      .then(setQr).catch(() => setQr(null))
  }, [])

  const descargar = async () => {
    if (!data) return
    setDescargando(true)
    setError(null)
    try {
      // Enlace firmado de 10 minutos que abre el propio navegador: así baja con
      // su gestor de descargas. Bajarlo a memoria y armar un `blob:` falla en
      // el teléfono, que es justo donde se descarga.
      const r = await apiClient.post<{ url: string }>('/movil/enlace-descarga')
      const base = new URL(apiClient.defaults.baseURL ?? '/api/v1', window.location.href)
      window.location.assign(new URL(r.data.url, base).href)
      setIniciada(true)
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo descargar la app'))
    } finally {
      setDescargando(false)
    }
  }

  const sinVersion = (errorVersion as { response?: { status?: number } } | null)?.response?.status === 404

  const etiqueta = ES_IOS ? 'Solo para Android'
    : isLoading ? 'Consultando versión…'
    : descargando ? 'Preparando descarga…'
    : data ? `Descargar APK · ${(data.tamano / 1e6).toFixed(0)} MB`
    : sinVersion ? 'Aún no publicada'
    : 'Descarga no disponible'

  return (
    <Stack spacing={3}>
      <Box sx={{
        borderRadius: 4, p: { xs: 2.5, sm: 3.5 }, color: '#fff',
        // El tema le pone color propio a Typography; dentro de la tarjeta, blanco.
        '& .MuiTypography-root': { color: 'inherit' },
        background: `linear-gradient(140deg, ${ACENTO.profundo} 0%, ${ACENTO.base} 100%)`,
      }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <PhoneAndroid />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={800} lineHeight={1.2}>TittanWare para Android</Typography>
                <Typography variant="body2" sx={{ opacity: .85 }}>
                  {data ? `Versión ${data.version} · publicada ${new Date(data.publicada).toLocaleDateString('es-CO', { dateStyle: 'medium' })}`
                    : 'Las órdenes de trabajo del CMMS en el teléfono'}
                </Typography>
              </Box>
            </Stack>

            <Button fullWidth variant="contained" size="large" onClick={descargar}
              disabled={!data || descargando || ES_IOS}
              startIcon={descargando || isLoading ? <CircularProgress size={20} color="inherit" /> : <Download />}
              sx={{
                minHeight: 56, borderRadius: 3, fontSize: '1.05rem', fontWeight: 700, textTransform: 'none',
                bgcolor: '#fff', color: ACENTO.profundo, boxShadow: '0 6px 20px rgba(0,0,0,.18)',
                '&:hover': { bgcolor: '#F1F5FF' },
                '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,.22)', color: 'rgba(255,255,255,.9)' },
              }}>
              {etiqueta}
            </Button>

            {iniciada && (
              <Typography variant="body2" role="status" sx={{ bgcolor: 'rgba(255,255,255,.14)', borderRadius: 2, px: 1.5, py: 1 }}>
                La descarga empezó. Búsquela en las notificaciones o en «Descargas» y ábrala para instalar.
              </Typography>
            )}
            {sinVersion && !ES_IOS && (
              <Typography variant="body2" sx={{ opacity: .9 }}>
                La app todavía no se ha publicado en el servidor. El botón se activa solo en cuanto se publique.
              </Typography>
            )}
            {ES_IOS && (
              <Typography variant="body2" sx={{ opacity: .9 }}>
                Por ahora la app existe solo para Android. En el iPhone puede seguir usando el portal en el navegador.
              </Typography>
            )}
          </Stack>

          {qr && (
            <Stack alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
              <Box component="img" src={qr} alt="Código QR para abrir la descarga en el teléfono"
                sx={{ width: 168, height: 168, borderRadius: 3, p: 1, bgcolor: '#fff' }} />
              <Typography variant="caption" sx={{ opacity: .9, textAlign: 'center', maxWidth: 180 }}>
                Escanéelo con el teléfono para descargar ahí
              </Typography>
            </Stack>
          )}
        </Stack>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {errorVersion && !sinVersion && (
        <Alert severity="error">{mensajeDeError(errorVersion, 'No se pudo consultar la versión de la app')}</Alert>
      )}
      {data?.notas && (
        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Qué trae esta versión</Typography>
          <Typography variant="body2" color="text.secondary">{data.notas}</Typography>
        </Box>
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
      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="md" fullWidth fullScreen={EN_TELEFONO}>
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
