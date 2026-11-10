/**
 * Quién firma los informes de lubricación.
 *
 * El análisis lo interpreta el sistema con norma, pero el informe que se le
 * entrega al cliente lo firma una persona. Aquí se escriben sus datos y se sube
 * la firma; al lado se ve el bloque tal como sale en el PDF, para no tener que
 * descargar un informe para revisar cómo quedó.
 */
import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, Divider, Skeleton, Stack, TextField, Typography,
} from '@mui/material'
import { DeleteOutline, Draw, PictureAsPdf, Save } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PALETA } from '@/config/marca'
import { informesLubeApi, type Asesor } from '@/api/lube'
import { mensajeDeError } from '@/utils/errorApi'

const CAMPOS: { clave: keyof Asesor; etiqueta: string; ayuda: string; ejemplo: string }[] = [
  { clave: 'nombre', etiqueta: 'Nombre completo', ayuda: 'Como debe aparecer bajo la firma', ejemplo: 'Ana María Rojas' },
  { clave: 'cargo', etiqueta: 'Cargo', ayuda: 'Su papel frente al cliente', ejemplo: 'Asesora en lubricación y confiabilidad' },
  { clave: 'credenciales', etiqueta: 'Certificaciones', ayuda: 'ICML, tarjeta profesional…', ejemplo: 'ICML MLA II · MLT I' },
  { clave: 'empresa', etiqueta: 'Empresa que presta la asesoría', ayuda: 'Si es distinta del cliente', ejemplo: 'TittanWare' },
  { clave: 'contacto', etiqueta: 'Contacto', ayuda: 'Correo y teléfono para dudas sobre el informe', ejemplo: 'ana@empresa.com · 300 000 0000' },
]

export function PanelAsesor() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['lube-asesor'], queryFn: informesLubeApi.asesor })
  const [form, setForm] = useState<Asesor>({})
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null)

  useEffect(() => { if (data) setForm(data) }, [data])
  useEffect(() => {
    let url: string | null = null
    if (data?.tiene_firma) {
      informesLubeApi.firma().then(u => { url = u; setFirmaUrl(u) }).catch(() => setFirmaUrl(null))
    } else {
      setFirmaUrl(null)
    }
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [data?.tiene_firma, data])

  const listo = (a: Asesor) => qc.setQueryData(['lube-asesor'], a)
  const guardar = useMutation({
    mutationFn: () => informesLubeApi.guardarAsesor(form),
    onSuccess: a => { listo(a); toast.success('Datos del asesor guardados') },
    onError: e => toast.error(mensajeDeError(e)),
  })
  const subir = useMutation({
    mutationFn: (f: File) => informesLubeApi.subirFirma(f),
    onSuccess: a => { listo(a); toast.success('Firma cargada') },
    onError: e => toast.error(mensajeDeError(e)),
  })
  const quitar = useMutation({
    mutationFn: informesLubeApi.borrarFirma,
    onSuccess: a => { listo(a); toast.success('Firma eliminada') },
    onError: e => toast.error(mensajeDeError(e)),
  })
  const flota = useMutation({
    mutationFn: () => informesLubeApi.flotaPdf({ dias: 365 }),
    onError: e => toast.error(mensajeDeError(e)),
  })

  const cambios = JSON.stringify({ ...data, tiene_firma: undefined }) !== JSON.stringify({ ...form, tiene_firma: undefined })

  if (isLoading) return <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} />

  return (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        <Typography variant="subtitle1" fontWeight={800}>Asesor que firma los informes</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          El sistema interpreta las muestras con norma; el informe que se le entrega al cliente
          lo firma usted. Estos datos salen al pie del informe de cada muestra y del informe de flota.
        </Typography>
        {!data?.nombre && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Sin nombre, los informes salen firmados como «Asesor de lubricación».
          </Alert>
        )}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          {CAMPOS.map(c => (
            <TextField key={c.clave} size="small" label={c.etiqueta} helperText={c.ayuda}
              placeholder={c.ejemplo} value={(form[c.clave] as string) ?? ''}
              onChange={e => setForm({ ...form, [c.clave]: e.target.value })} />
          ))}
        </Box>
        <TextField size="small" fullWidth multiline minRows={3} sx={{ mt: 2 }}
          label="Alcance del informe (opcional)"
          helperText="Sale junto a la firma. Si lo deja vacío, se usa un texto de alcance estándar."
          placeholder="La interpretación se apoya en los resultados del laboratorio…"
          value={form.nota ?? ''} onChange={e => setForm({ ...form, nota: e.target.value })} />

        <Stack direction="row" spacing={1.5} mt={2} flexWrap="wrap" useFlexGap>
          <Button variant="contained" startIcon={<Save />} disabled={!cambios || guardar.isPending}
            onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            {guardar.isPending ? 'Guardando…' : 'Guardar datos'}
          </Button>
          <Button component="label" variant="outlined" startIcon={<Draw />} disabled={subir.isPending}
            sx={{ textTransform: 'none' }}>
            {subir.isPending ? 'Cargando…' : data?.tiene_firma ? 'Cambiar firma' : 'Cargar firma (PNG o JPG)'}
            <input hidden type="file" accept="image/png,image/jpeg"
              onChange={e => { const f = e.target.files?.[0]; if (f) subir.mutate(f); e.target.value = '' }} />
          </Button>
          {data?.tiene_firma && (
            <Button color="inherit" startIcon={<DeleteOutline />} onClick={() => quitar.mutate()}
              sx={{ textTransform: 'none' }}>
              Quitar firma
            </Button>
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
          Firme en una hoja blanca y tómele una foto, o use una imagen con fondo transparente. El
          sistema recorta el blanco sobrante.
        </Typography>
      </Box>

      {/* Vista previa del bloque de firma, como sale en el PDF. */}
      <Card variant="outlined" sx={{ width: { xs: '100%', lg: 380 }, p: 3, borderRadius: 3, flexShrink: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.08em', color: PALETA.acero }}>
          ASÍ SALE EN EL INFORME
        </Typography>
        <Box sx={{ height: 72, mt: 2, display: 'flex', alignItems: 'flex-end' }}>
          {firmaUrl
            ? <Box component="img" src={firmaUrl} alt="Firma del asesor" sx={{ maxHeight: 68, maxWidth: '80%' }} />
            : <Typography variant="caption" color="text.secondary">Sin firma cargada</Typography>}
        </Box>
        <Divider sx={{ borderColor: '#051C2C', borderBottomWidth: 1.5, mb: 1 }} />
        <Typography fontWeight={800} fontSize={14}>{form.nombre || 'Asesor de lubricación'}</Typography>
        {[form.cargo, form.credenciales, form.empresa, form.contacto].filter(Boolean).map((t, i) => (
          <Typography key={i} variant="body2" color="text.secondary" fontSize={12.5}>{t}</Typography>
        ))}
        <Typography variant="caption" color="text.secondary" fontStyle="italic">
          Firmado el {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Button fullWidth variant="outlined" startIcon={<PictureAsPdf />} disabled={flota.isPending}
          onClick={() => flota.mutate()} sx={{ textTransform: 'none' }}>
          {flota.isPending ? 'Armando el informe…' : 'Probar: informe de flota del último año'}
        </Button>
      </Card>
    </Stack>
  )
}
