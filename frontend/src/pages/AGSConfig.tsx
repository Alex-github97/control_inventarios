/**
 * AGS · Configuración — datos del negocio, jornada general y políticas de agenda.
 */
import { useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Card, CardContent, Chip,
  Switch, FormControlLabel, alpha, Divider, Alert, InputAdornment, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Save, Storefront, Schedule, Policy, WhatsApp, RestartAlt } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import {
  AGS_COLOR, AGS_DARK, DIAS_SEMANA, TIPOS_NEGOCIO, type AGSConfigData,
} from '@/utils/ags'

const PLANTILLA_DEFECTO =
  'Hola {cliente}, le recordamos su cita en {negocio} el {fecha} a las {hora} '
  + 'para {servicio}. Cualquier cambio nos avisa.'

const VARIABLES = ['{cliente}', '{negocio}', '{fecha}', '{hora}', '{servicio}', '{codigo}', '{total}']

export default function AGSConfig() {
  const qc = useQueryClient()
  const [form, setForm] = useState<AGSConfigData | null>(null)

  const { data, isLoading } = useQuery<AGSConfigData>({
    queryKey: ['ags-config'],
    queryFn: async () => (await api.get('/ags/config')).data,
  })

  // Se copia la respuesta al estado editable la primera vez que llega.
  if (data && form === null) setForm({ ...data })

  const guardar = useMutation({
    mutationFn: async () => (await api.put('/ags/config', form)).data,
    onSuccess: (d: AGSConfigData) => {
      toast.success('Configuración guardada')
      setForm({ ...d })
      qc.invalidateQueries({ queryKey: ['ags-config'] })
      qc.invalidateQueries({ queryKey: ['ags-dashboard'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar'),
  })

  const set = <K extends keyof AGSConfigData>(k: K, v: AGSConfigData[K]) =>
    setForm(f => (f ? { ...f, [k]: v } : f))

  const alternarDia = (dia: number) => {
    if (!form) return
    const actuales = form.dias_laborales ?? []
    set('dias_laborales', actuales.includes(dia)
      ? actuales.filter(d => d !== dia)
      : [...actuales, dia].sort((a, b) => a - b))
  }

  const insertarVariable = (v: string) =>
    set('mensaje_recordatorio', `${form?.mensaje_recordatorio ?? ''}${v}`)

  if (isLoading || !form) {
    return (
      <Layout title="Configuración">
        <Typography variant="body2" color="text.secondary">Cargando…</Typography>
      </Layout>
    )
  }

  const horaInvalida = Boolean(form.hora_apertura && form.hora_cierre
    && form.hora_cierre <= form.hora_apertura)

  return (
    <Layout title="Configuración">
      <Box className="anim-page-in">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Configuración</Typography>
            <Typography variant="body2" color="text.secondary">
              Datos del negocio y reglas que sigue la agenda
            </Typography>
          </Box>
          <Button
            variant="contained" startIcon={<Save />} onClick={() => guardar.mutate()}
            disabled={guardar.isPending || horaInvalida}
            sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
          >
            {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </Stack>

        <Grid container spacing={2}>
          {/* ── Datos del negocio ── */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Storefront sx={{ color: AGS_COLOR }} />
                  <Typography variant="subtitle1" fontWeight={800}>El negocio</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      fullWidth size="small" label="Nombre del negocio" required
                      value={form.nombre_negocio}
                      onChange={e => set('nombre_negocio', e.target.value)}
                      helperText="Aparece en el tablero y en los recordatorios"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      select fullWidth size="small" label="Tipo de negocio"
                      value={form.tipo_negocio ?? ''}
                      onChange={e => set('tipo_negocio', e.target.value)}
                    >
                      {TIPOS_NEGOCIO.map(t => (
                        <MenuItem key={t.valor} value={t.valor}>{t.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth size="small" label="NIT / documento"
                      value={form.nit ?? ''} onChange={e => set('nit', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth size="small" label="Teléfono"
                      value={form.telefono ?? ''} onChange={e => set('telefono', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth size="small" label="Ciudad"
                      value={form.ciudad ?? ''} onChange={e => set('ciudad', e.target.value)}
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      fullWidth size="small" label="Dirección"
                      value={form.direccion ?? ''} onChange={e => set('direccion', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Horario general ── */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Schedule sx={{ color: AGS_COLOR }} />
                  <Typography variant="subtitle1" fontWeight={800}>Horario de atención</Typography>
                </Stack>

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.8 }}>
                  Días que atiende el negocio
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 2 }}>
                  {DIAS_SEMANA.map(d => {
                    const activo = (form.dias_laborales ?? []).includes(d.valor)
                    return (
                      <Chip
                        key={d.valor} label={d.corto} size="small"
                        onClick={() => alternarDia(d.valor)}
                        variant={activo ? 'filled' : 'outlined'}
                        sx={activo ? { bgcolor: AGS_COLOR, color: '#fff' } : undefined}
                      />
                    )
                  })}
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 4 }}>
                    <TextField
                      type="time" fullWidth size="small" label="Abre" value={form.hora_apertura ?? ''}
                      onChange={e => set('hora_apertura', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 4 }}>
                    <TextField
                      type="time" fullWidth size="small" label="Cierra" value={form.hora_cierre ?? ''}
                      onChange={e => set('hora_cierre', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      error={horaInvalida}
                      helperText={horaInvalida ? 'Debe ser después de la apertura' : undefined}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      select fullWidth size="small" label="Bloques de agenda"
                      value={form.intervalo_agenda_min ?? 30}
                      onChange={e => set('intervalo_agenda_min', Number(e.target.value))}
                    >
                      {[10, 15, 20, 30, 60].map(m => (
                        <MenuItem key={m} value={m}>Cada {m} min</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>

                <Alert severity="info" sx={{ mt: 2, py: 0.3 }}>
                  Este horario define la ventana que muestra la agenda. La disponibilidad real de
                  cada persona sale de su jornada individual, en <strong>Equipo</strong>.
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Políticas ── */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Policy sx={{ color: AGS_COLOR }} />
                  <Typography variant="subtitle1" fontWeight={800}>Políticas y dinero</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 4 }}>
                    <TextField
                      fullWidth size="small" label="Moneda" value={form.moneda ?? 'COP'}
                      onChange={e => set('moneda', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 4 }}>
                    <TextField
                      type="number" fullWidth size="small" label="IVA" value={form.iva_pct ?? 0}
                      onChange={e => set('iva_pct', Number(e.target.value) || 0)}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      type="number" fullWidth size="small" label="Comisión por defecto"
                      value={form.comision_defecto_pct ?? 0}
                      onChange={e => set('comision_defecto_pct', Number(e.target.value) || 0)}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                      helperText="Si la persona no tiene una propia"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      type="number" fullWidth size="small" label="Anticipación mínima"
                      value={form.anticipacion_minima_min ?? 0}
                      onChange={e => set('anticipacion_minima_min', Number(e.target.value) || 0)}
                      InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
                      helperText="No ofrecer horas tan cercanas al momento actual"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      type="number" fullWidth size="small" label="Tolerancia de espera"
                      value={form.tolerancia_no_show_min ?? 15}
                      onChange={e => set('tolerancia_no_show_min', Number(e.target.value) || 0)}
                      InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
                      helperText="Antes de marcar que el cliente no asistió"
                    />
                  </Grid>
                  <Grid size={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(form.permite_sobrecupo)}
                          onChange={e => set('permite_sobrecupo', e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">Permitir sobrecupo</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Deja agendar dos citas a la misma hora con la misma persona.
                            Con esto apagado, la agenda rechaza los cruces.
                          </Typography>
                        </Box>
                      }
                    />
                    {form.permite_sobrecupo && (
                      <Alert severity="warning" sx={{ mt: 1, py: 0.3 }}>
                        Con el sobrecupo activo se pierde la protección contra doble reserva,
                        que es justamente el error más costoso de estos negocios. Actívelo solo
                        si de verdad atiende a dos personas en paralelo.
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Recordatorio ── */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <WhatsApp sx={{ color: '#25D366' }} />
                  <Typography variant="subtitle1" fontWeight={800}>
                    Recordatorio por WhatsApp
                  </Typography>
                </Stack>
                <TextField
                  fullWidth size="small" multiline rows={4} label="Plantilla del mensaje"
                  value={form.mensaje_recordatorio ?? ''}
                  onChange={e => set('mensaje_recordatorio', e.target.value)}
                />
                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                  {VARIABLES.map(v => (
                    <Tooltip key={v} title="Insertar al final del mensaje">
                      <Chip
                        size="small" label={v} onClick={() => insertarVariable(v)}
                        sx={{ fontFamily: 'monospace', fontSize: 10.5, cursor: 'pointer' }}
                      />
                    </Tooltip>
                  ))}
                </Stack>
                <Button
                  size="small" startIcon={<RestartAlt />} sx={{ mt: 1 }}
                  onClick={() => set('mensaje_recordatorio', PLANTILLA_DEFECTO)}
                >
                  Restaurar plantilla
                </Button>

                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Así se verá
                </Typography>
                <Box sx={{
                  p: 1.5, borderRadius: 2, bgcolor: alpha('#25D366', 0.08),
                  border: `1px solid ${alpha('#25D366', 0.25)}`,
                }}>
                  <Typography variant="body2">
                    {(form.mensaje_recordatorio ?? '')
                      .replace('{cliente}', 'María Rodríguez')
                      .replace('{negocio}', form.nombre_negocio || 'Mi negocio')
                      .replace('{fecha}', '24/08/2026')
                      .replace('{hora}', '9:00 AM')
                      .replace('{servicio}', 'Corte de cabello dama')
                      .replace('{codigo}', 'CITA-00001')
                      .replace('{total}', '35.000')}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  El sistema no envía mensajes por su cuenta: desde la agenda abre WhatsApp con el
                  texto listo para que usted lo revise antes de enviarlo.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
