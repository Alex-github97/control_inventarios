/**
 * Configuración de SCM: solo las reglas que el sistema de verdad aplica.
 *
 * Antes había catorce interruptores (notificaciones, flujos, integraciones) y
 * cuatro umbrales que vivían en el navegador: «Guardar cambios» mostraba
 * «¡Guardado!» y no enviaba nada, y ningún cálculo los leía. Las notificaciones
 * por correo y las integraciones no existen en el módulo, así que no se
 * ofrecen. Lo que queda se guarda en scm_parametro y cada regla dice dónde se
 * aplica.
 */
import { useEffect, useState } from 'react'
import { Box, Typography, Card, CardContent, Chip, alpha, Switch, FormControlLabel, Button, TextField, Tab, Tabs } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Settings, Save } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient } from '@/api/client'
import { mensajeDeError } from '@/utils/errorApi'

import { COLOR_MODULO } from '@/config/marca'
import { AdminCatalogos } from '@/components/catalogo/AdminCatalogos'
const SCM_COLOR = COLOR_MODULO
const BORDER  = `rgba(12,77,140,0.25)`

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: BORDER } },
}

interface Parametros {
  monto_doble_aprobacion: number | null
  solicitud_exige_items: boolean
  dias_oc_sin_confirmar: number
  dias_evaluacion_proveedor: number
}

function Regla({ titulo, donde, children }: { titulo: string; donde: string; children: React.ReactNode }) {
  return (
    <Box sx={{ p: 2, bgcolor: '#F9FAFB', borderRadius: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{titulo}</Typography>
      {children}
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{donde}</Typography>
    </Box>
  )
}

export default function SCMConfig() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const { data } = useQuery<Parametros>({
    queryKey: ['scm-parametros'],
    queryFn: () => apiClient.get('/scm/parametros').then(r => r.data),
  })
  const [form, setForm] = useState<{ monto: string; items: boolean; diasOc: string; diasEval: string } | null>(null)
  useEffect(() => {
    if (data) setForm({
      monto: data.monto_doble_aprobacion == null ? '' : String(data.monto_doble_aprobacion),
      items: data.solicitud_exige_items,
      diasOc: String(data.dias_oc_sin_confirmar),
      diasEval: String(data.dias_evaluacion_proveedor),
    })
  }, [data])

  const guardar = useMutation({
    mutationFn: () => apiClient.put('/scm/parametros', {
      monto_doble_aprobacion: form!.monto.trim() ? Number(form!.monto) : null,
      solicitud_exige_items: form!.items,
      dias_oc_sin_confirmar: Number(form!.diasOc),
      dias_evaluacion_proveedor: Number(form!.diasEval),
    }),
    onSuccess: () => { toast.success('Configuración guardada'); qc.invalidateQueries({ queryKey: ['scm-parametros'] }) },
    onError: (e) => toast.error(mensajeDeError(e, 'No se pudo guardar la configuración')),
  })

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Settings sx={{ color: SCM_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Configuración SCM</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Reglas de compra y catálogos del módulo</Typography>
            </Box>
            <Chip label="SCM" size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: '#5B9BD5', fontWeight: 700, border: `1px solid ${alpha(SCM_COLOR, 0.35)}` }} />
          </Box>
          {tab === 0 && (
            <Button variant="contained" startIcon={<Save />} disabled={!form || guardar.isPending}
              onClick={() => guardar.mutate()} sx={{ bgcolor: SCM_COLOR }}>
              {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          )}
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: `1px solid ${BORDER}`, '& .MuiTab-root': { color: 'text.disabled', minHeight: 40, textTransform: 'none' }, '& .Mui-selected': { color: '#5B9BD5' }, '& .MuiTabs-indicator': { bgcolor: SCM_COLOR } }}>
          <Tab label="Reglas de compra" />
          <Tab label="Catálogos" />
        </Tabs>

        {tab === 1 && <AdminCatalogos modulo="SCM" color={COLOR_MODULO} />}

        {tab === 0 && form && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>Aprobación</Typography>
                  <Regla titulo="Doble aprobación de órdenes de compra"
                    donde="Una OC por encima de este total solo sale del borrador si la envía un administrador distinto de quien la creó. Vacío: sin doble aprobación.">
                    <TextField label="Tope (COP)" type="number" size="small" fullWidth sx={SX_INPUT}
                      value={form.monto} onChange={e => setForm(f => f && ({ ...f, monto: e.target.value }))} />
                  </Regla>
                  <Regla titulo="Solicitudes con ítems"
                    donde="Encendido: no se puede crear una solicitud de compra sin al menos un ítem descrito.">
                    <FormControlLabel label="Exigir al menos un ítem"
                      control={<Switch checked={form.items} onChange={e => setForm(f => f && ({ ...f, items: e.target.checked }))} />} />
                  </Regla>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>Alertas del tablero</Typography>
                  <Regla titulo="OC sin confirmar"
                    donde="Una OC enviada que el proveedor no ha confirmado en este plazo aparece en las alertas de la Torre de Control.">
                    <TextField label="Días desde la emisión" type="number" size="small" fullWidth sx={SX_INPUT}
                      value={form.diasOc} onChange={e => setForm(f => f && ({ ...f, diasOc: e.target.value }))} />
                  </Regla>
                  <Regla titulo="Evaluación de proveedores"
                    donde="Un proveedor al que se le compró en el último año y que no se ha evaluado en este plazo aparece en las alertas.">
                    <TextField label="Días entre evaluaciones" type="number" size="small" fullWidth sx={SX_INPUT}
                      value={form.diasEval} onChange={e => setForm(f => f && ({ ...f, diasEval: e.target.value }))} />
                  </Regla>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
