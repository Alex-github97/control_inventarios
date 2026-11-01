/**
 * Logo de la empresa cliente, en la configuración de la cuenta.
 *
 * Lo cambia solo el administrador de la empresa. Se usa en el portal de
 * ingreso y en la portada de los informes PDF (estado de llantas de la flota).
 */
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Card, CircularProgress, Typography, alpha } from '@mui/material'
import { Business as BusinessIcon, DeleteOutline, Upload } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { clienteGuardado, guardarCliente } from '@/api/cliente'
import { useAuthStore } from '@/store/authStore'

interface EmpresaCuenta {
  codigo: string
  nombre: string
  nit?: string | null
  logo_url?: string | null
  logo_propio: boolean
}

const ACCENT = '#1A1A1A'

export function LogoEmpresa() {
  const user = useAuthStore(s => s.user)
  const esAdmin = user?.rol === 'ADMINISTRADOR'
  const qc = useQueryClient()
  const entrada = useRef<HTMLInputElement>(null)

  const { data: empresa, isLoading } = useQuery<EmpresaCuenta>({
    queryKey: ['cuenta-empresa'],
    queryFn: () => api.get('/auth/empresa').then(r => r.data),
  })

  const [version, setVersion] = useState(0)

  const alCambiar = (e: EmpresaCuenta) => {
    qc.setQueryData(['cuenta-empresa'], e)
    setVersion(Date.now())
    // El portal de ingreso lee el logo del cliente guardado en el navegador.
    const guardado = clienteGuardado()
    if (guardado?.codigo === e.codigo) guardarCliente({ ...guardado, logo_url: e.logo_url ?? null })
  }

  const subir = useMutation({
    mutationFn: (archivo: File) => {
      const datos = new FormData()
      datos.append('archivo', archivo)
      return api.post<EmpresaCuenta>('/auth/empresa/logo', datos).then(r => r.data)
    },
    onSuccess: e => { alCambiar(e); toast.success('Logo actualizado') },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo subir el logo'),
  })
  const quitar = useMutation({
    mutationFn: () => api.delete<EmpresaCuenta>('/auth/empresa/logo').then(r => r.data),
    onSuccess: e => { alCambiar(e); toast.success('Logo quitado') },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo quitar el logo'),
  })

  // El archivo propio cambia sin cambiar de URL: la versión evita la caché.
  const src = empresa?.logo_url
    ? `${empresa.logo_url}${empresa.logo_propio ? `?v=${version}` : ''}`
    : null
  const ocupado = subir.isPending || quitar.isPending

  return (
    <Card sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
      <Box sx={{
        px: 3, py: 2.5,
        background: `linear-gradient(135deg, ${alpha(ACCENT, 0.12)} 0%, ${alpha(ACCENT, 0.04)} 100%)`,
        borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: '10px',
          bgcolor: alpha(ACCENT, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BusinessIcon sx={{ color: ACCENT, fontSize: 20 }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>
            Logo de la empresa
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#64748B' }}>
            Aparece en el portal de ingreso y en la portada de los informes PDF.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 3, display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{
          width: 240, height: 110, borderRadius: '12px', border: '1px dashed #CBD5E1', bgcolor: '#F8FAFC',
          display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
        }}>
          {isLoading ? <CircularProgress size={22} /> : src ? (
            <Box component="img" src={src} alt={`Logo de ${empresa?.nombre ?? 'la empresa'}`}
              sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <Typography sx={{ fontSize: 12.5, color: '#94A3B8', textAlign: 'center' }}>
              Sin logo: la portada muestra el nombre de la empresa
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#1E293B' }}>{empresa?.nombre ?? ''}</Typography>
          {esAdmin ? (
            <>
              <Typography sx={{ fontSize: 12, color: '#64748B', mt: 0.5, mb: 1.5 }}>
                PNG o JPG de hasta 5 MB. Mejor con fondo transparente; el margen vacío se recorta solo.
              </Typography>
              <input ref={entrada} type="file" accept="image/png,image/jpeg,image/webp" hidden
                onChange={e => {
                  const archivo = e.target.files?.[0]
                  if (archivo) subir.mutate(archivo)
                  e.target.value = ''
                }} />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="contained" size="small" startIcon={<Upload />} disabled={ocupado}
                  onClick={() => entrada.current?.click()}
                  sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 700 }}>
                  {subir.isPending ? 'Subiendo…' : src ? 'Cambiar logo' : 'Subir logo'}
                </Button>
                {empresa?.logo_url && (
                  <Button size="small" color="error" startIcon={<DeleteOutline />} disabled={ocupado}
                    onClick={() => quitar.mutate()} sx={{ textTransform: 'none' }}>
                    Quitar
                  </Button>
                )}
              </Box>
            </>
          ) : (
            <Typography sx={{ fontSize: 12, color: '#64748B', mt: 0.5 }}>
              Solo el administrador de la empresa puede cambiar el logo.
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  )
}
