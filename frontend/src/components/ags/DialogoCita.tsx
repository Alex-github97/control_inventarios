/**
 * Diálogo para agendar o reprogramar una cita.
 *
 * Mantiene su propio estado local: así escribir en el formulario no vuelve a
 * renderizar la agenda completa que hay detrás.
 */
import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem,
  Stack, Typography, Box, Chip, IconButton, Autocomplete, Divider, Alert, alpha,
  ToggleButtonGroup, ToggleButton, CircularProgress, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add, Delete, Store, Home, Schedule } from '@mui/icons-material'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import {
  AGS_COLOR, AGS_DARK, fmtCOP, fmtMinutos, fmtHora, ORIGENES_CITA,
  type Cita, type Cliente, type Profesional, type Servicio, type DisponibilidadProfesional,
} from '@/utils/ags'

interface LineaEditable {
  servicio_id: number | null
  nombre: string
  precio: number
  duracion: number
  cantidad: number
}

interface Props {
  abierto: boolean
  cita: Cita | null
  inicioSugerido?: string
  profesionalSugerido?: number
  onCerrar: () => void
  onGuardado: () => void
}

const VACIO = {
  cliente_id: null as number | null,
  profesional_id: null as number | null,
  fecha: '',
  hora: '',
  lugar: 'LOCAL',
  direccion_servicio: '',
  origen: 'MOSTRADOR',
  descuento: 0,
  descuento_motivo: '',
  notas: '',
}

export function DialogoCita({
  abierto, cita, inicioSugerido, profesionalSugerido, onCerrar, onGuardado,
}: Props) {
  const [form, setForm] = useState({ ...VACIO })
  const [lineas, setLineas] = useState<LineaEditable[]>([])
  const [wasOpen, setWasOpen] = useState(false)

  // Reset al abrir, comparando contra el estado previo en lugar de useEffect.
  if (abierto && !wasOpen) {
    setWasOpen(true)
    if (cita) {
      setForm({
        cliente_id: cita.cliente_id,
        profesional_id: cita.profesional_id,
        fecha: cita.fecha_inicio.slice(0, 10),
        hora: fmtHora(cita.fecha_inicio),
        lugar: cita.lugar ?? 'LOCAL',
        direccion_servicio: cita.direccion_servicio ?? '',
        origen: cita.origen ?? 'MOSTRADOR',
        descuento: cita.descuento ?? 0,
        descuento_motivo: cita.descuento_motivo ?? '',
        notas: cita.notas ?? '',
      })
      setLineas((cita.servicios ?? []).map(s => ({
        servicio_id: s.servicio_id ?? null,
        nombre: s.nombre_servicio,
        precio: s.precio_unitario,
        duracion: s.duracion_min,
        cantidad: s.cantidad,
      })))
    } else {
      setForm({
        ...VACIO,
        fecha: inicioSugerido ? inicioSugerido.slice(0, 10) : '',
        hora: inicioSugerido ? inicioSugerido.slice(11, 16) : '',
        profesional_id: profesionalSugerido ?? null,
      })
      setLineas([])
    }
  }
  if (!abierto && wasOpen) setWasOpen(false)

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['ags-clientes-min'],
    queryFn: async () => (await api.get('/ags/clientes?solo_activos=true')).data,
    enabled: abierto,
  })
  const { data: profesionales = [] } = useQuery<Profesional[]>({
    queryKey: ['ags-profesionales'],
    queryFn: async () => (await api.get('/ags/profesionales?solo_activos=true')).data,
    enabled: abierto,
  })
  const { data: servicios = [] } = useQuery<Servicio[]>({
    queryKey: ['ags-servicios-activos'],
    queryFn: async () => (await api.get('/ags/servicios?solo_activos=true')).data,
    enabled: abierto,
  })

  const duracionTotal = lineas.reduce((s, l) => s + l.duracion * l.cantidad, 0)
  const subtotal = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0)
  const total = Math.max(subtotal - (Number(form.descuento) || 0), 0)

  // Horas libres reales para la fecha y duración elegidas
  const { data: disponibilidad = [], isFetching: buscandoHoras } = useQuery<DisponibilidadProfesional[]>({
    queryKey: ['ags-disponibilidad', form.fecha, form.profesional_id, duracionTotal],
    queryFn: async () => (await api.get('/ags/agenda/disponibilidad', {
      params: {
        fecha: form.fecha,
        duracion_min: duracionTotal || 30,
        ...(form.profesional_id ? { profesional_id: form.profesional_id } : {}),
      },
    })).data,
    enabled: abierto && Boolean(form.fecha),
  })

  const miDisponibilidad = disponibilidad.find(d => d.profesional_id === form.profesional_id)
  const clienteSel = clientes.find(c => c.id === form.cliente_id) ?? null

  const guardar = useMutation({
    mutationFn: async () => {
      const cuerpo = {
        cliente_id: form.cliente_id,
        profesional_id: form.profesional_id,
        fecha_inicio: `${form.fecha}T${form.hora}:00`,
        servicios: lineas.map(l => ({
          servicio_id: l.servicio_id,
          nombre_servicio: l.nombre,
          cantidad: l.cantidad,
          precio_unitario: l.precio,
          duracion_min: l.duracion,
        })),
        lugar: form.lugar,
        direccion_servicio: form.direccion_servicio || null,
        origen: form.origen,
        descuento: Number(form.descuento) || 0,
        descuento_motivo: form.descuento_motivo || null,
        notas: form.notas || null,
      }
      return cita
        ? (await api.put(`/ags/citas/${cita.id}`, cuerpo)).data
        : (await api.post('/ags/citas', cuerpo)).data
    },
    onSuccess: (d: Cita) => {
      toast.success(cita ? `Cita ${d.codigo} actualizada` : `Cita ${d.codigo} agendada`)
      onGuardado()
      onCerrar()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar la cita'),
  })

  const agregarServicio = (s: Servicio) => {
    setLineas(prev => [...prev, {
      servicio_id: s.id, nombre: s.nombre, precio: s.precio,
      duracion: s.duracion_min, cantidad: 1,
    }])
    // Un servicio a domicilio arrastra el lugar: evita cobrar mal el traslado.
    if (s.permite_domicilio && form.lugar === 'LOCAL' && lineas.length === 0) {
      setForm(f => ({ ...f, lugar: 'DOMICILIO' }))
    }
  }

  const faltantes: string[] = []
  if (!form.cliente_id) faltantes.push('cliente')
  if (!form.profesional_id) faltantes.push('profesional')
  if (!form.fecha) faltantes.push('fecha')
  if (!form.hora) faltantes.push('hora')
  if (lineas.length === 0) faltantes.push('al menos un servicio')
  if (form.lugar === 'DOMICILIO' && !form.direccion_servicio && !clienteSel?.direccion) {
    faltantes.push('dirección del domicilio')
  }

  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {cita ? `Editar cita ${cita.codigo}` : 'Agendar cita'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Cliente y profesional */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              options={clientes}
              value={clienteSel}
              onChange={(_e, v) => setForm(f => ({ ...f, cliente_id: v?.id ?? null }))}
              getOptionLabel={c => `${c.nombre}${c.telefono ? ` · ${c.telefono}` : ''}`}
              renderInput={p => <TextField {...p} label="Cliente" size="small" required />}
              noOptionsText="No hay clientes. Regístrelos en la sección Clientes."
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select fullWidth size="small" label="Profesional" required
              value={form.profesional_id ?? ''}
              onChange={e => setForm(f => ({ ...f, profesional_id: Number(e.target.value) }))}
            >
              {profesionales.map(p => (
                <MenuItem key={p.id} value={p.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color || AGS_COLOR }} />
                    <span>{p.nombre}</span>
                    {p.especialidad && (
                      <Typography variant="caption" color="text.secondary">· {p.especialidad}</Typography>
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Servicios */}
          <Grid size={12}>
            <Divider textAlign="left" sx={{ my: 0.5 }}>
              <Typography variant="caption" fontWeight={700}>SERVICIOS</Typography>
            </Divider>
            <Autocomplete
              options={servicios}
              value={null}
              onChange={(_e, v) => { if (v) agregarServicio(v) }}
              getOptionLabel={s => s.nombre}
              groupBy={s => s.categoria_nombre ?? 'Sin categoría'}
              renderOption={(props, s) => (
                <Box component="li" {...props} key={s.id}>
                  <Stack direction="row" justifyContent="space-between" sx={{ width: '100%' }}>
                    <span>{s.nombre}</span>
                    <Typography variant="caption" color="text.secondary">
                      {fmtMinutos(s.duracion_min)} · {fmtCOP(s.precio)}
                    </Typography>
                  </Stack>
                </Box>
              )}
              renderInput={p => (
                <TextField {...p} size="small" label="Agregar servicio del catálogo"
                  placeholder="Escriba para buscar…" />
              )}
            />

            {lineas.length > 0 && (
              <Stack spacing={0.8} sx={{ mt: 1.2 }}>
                {lineas.map((l, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center"
                    sx={{ p: 1, borderRadius: 1, bgcolor: alpha(AGS_COLOR, 0.05) }}>
                    <Typography variant="body2" sx={{ flex: 1 }} noWrap>{l.nombre}</Typography>
                    <TextField
                      size="small" type="number" label="Cant." value={l.cantidad}
                      onChange={e => {
                        const v = Math.max(Number(e.target.value) || 1, 1)
                        setLineas(prev => prev.map((x, j) => j === i ? { ...x, cantidad: v } : x))
                      }}
                      sx={{ width: 78 }} inputProps={{ min: 1, step: 1 }}
                    />
                    <TextField
                      size="small" type="number" label="Min." value={l.duracion}
                      onChange={e => {
                        const v = Math.max(Number(e.target.value) || 0, 0)
                        setLineas(prev => prev.map((x, j) => j === i ? { ...x, duracion: v } : x))
                      }}
                      sx={{ width: 86 }}
                    />
                    <TextField
                      size="small" type="number" label="Precio" value={l.precio}
                      onChange={e => {
                        const v = Math.max(Number(e.target.value) || 0, 0)
                        setLineas(prev => prev.map((x, j) => j === i ? { ...x, precio: v } : x))
                      }}
                      sx={{ width: 120 }}
                    />
                    <Typography variant="body2" fontWeight={700} sx={{ width: 96, textAlign: 'right' }}>
                      {fmtCOP(l.precio * l.cantidad)}
                    </Typography>
                    <IconButton size="small" onClick={() => setLineas(prev => prev.filter((_x, j) => j !== i))}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ pt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Duración total: <strong>{fmtMinutos(duracionTotal)}</strong>
                  </Typography>
                  <Typography variant="caption">
                    Subtotal: <strong>{fmtCOP(subtotal)}</strong>
                  </Typography>
                </Stack>
              </Stack>
            )}
          </Grid>

          {/* Fecha, hora y disponibilidad */}
          <Grid size={12}>
            <Divider textAlign="left" sx={{ my: 0.5 }}>
              <Typography variant="caption" fontWeight={700}>CUÁNDO</Typography>
            </Divider>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              type="date" fullWidth size="small" label="Fecha" required
              value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              type="time" fullWidth size="small" label="Hora de inicio" required
              value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select fullWidth size="small" label="Origen de la reserva"
              value={form.origen} onChange={e => setForm(f => ({ ...f, origen: e.target.value }))}
            >
              {ORIGENES_CITA.map(o => <MenuItem key={o.valor} value={o.valor}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>

          {form.fecha && form.profesional_id && (
            <Grid size={12}>
              {buscandoHoras ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={14} />
                  <Typography variant="caption" color="text.secondary">Buscando horas libres…</Typography>
                </Stack>
              ) : !miDisponibilidad?.trabaja ? (
                <Alert severity="warning" icon={<Schedule fontSize="small" />}>
                  {miDisponibilidad?.motivo_no_disponible ?? 'Sin jornada configurada para ese día.'}
                  {' '}Puede agendar de todas formas escribiendo la hora, pero quedará fuera de su jornada.
                </Alert>
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.6 }}>
                    Horas libres para {fmtMinutos(duracionTotal || 30)}
                    {miDisponibilidad.jornada.length > 0 && ` · jornada ${miDisponibilidad.jornada.join(' y ')}`}
                  </Typography>
                  {miDisponibilidad.slots.length === 0 ? (
                    <Alert severity="info" sx={{ py: 0.2 }}>
                      No queda ningún espacio de {fmtMinutos(duracionTotal || 30)} ese día.
                      Pruebe otra fecha u otra persona.
                    </Alert>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                      {miDisponibilidad.slots.map(s => (
                        <Chip
                          key={s.hora_inicio} size="small" label={s.hora_inicio}
                          onClick={() => setForm(f => ({ ...f, hora: s.hora_inicio }))}
                          variant={form.hora === s.hora_inicio ? 'filled' : 'outlined'}
                          sx={{
                            fontVariantNumeric: 'tabular-nums',
                            ...(form.hora === s.hora_inicio
                              ? { bgcolor: AGS_COLOR, color: '#fff' }
                              : { borderColor: alpha(AGS_COLOR, 0.4) }),
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Grid>
          )}

          {/* Lugar */}
          <Grid size={12}>
            <Divider textAlign="left" sx={{ my: 0.5 }}>
              <Typography variant="caption" fontWeight={700}>DÓNDE</Typography>
            </Divider>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <ToggleButtonGroup
              exclusive size="small" fullWidth value={form.lugar}
              onChange={(_e, v) => { if (v) setForm(f => ({ ...f, lugar: v })) }}
            >
              <ToggleButton value="LOCAL"><Store fontSize="small" sx={{ mr: 0.5 }} />En el local</ToggleButton>
              <ToggleButton value="DOMICILIO"><Home fontSize="small" sx={{ mr: 0.5 }} />Domicilio</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          {form.lugar === 'DOMICILIO' && (
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth size="small" label="Dirección del servicio"
                value={form.direccion_servicio}
                onChange={e => setForm(f => ({ ...f, direccion_servicio: e.target.value }))}
                placeholder={clienteSel?.direccion ?? 'Calle 00 # 00-00, barrio'}
                helperText={clienteSel?.direccion && !form.direccion_servicio
                  ? `Si lo deja vacío se usa la del cliente: ${clienteSel.direccion}`
                  : undefined}
              />
            </Grid>
          )}

          {/* Descuento y notas */}
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              type="number" fullWidth size="small" label="Descuento"
              value={form.descuento}
              onChange={e => setForm(f => ({ ...f, descuento: Number(e.target.value) || 0 }))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth size="small" label="Motivo del descuento"
              value={form.descuento_motivo}
              onChange={e => setForm(f => ({ ...f, descuento_motivo: e.target.value }))}
              disabled={!form.descuento}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth size="small" label="Notas" value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Preferencias, alergias, detalles del trabajo…"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={800}>
            Total: {fmtCOP(total)}
            {duracionTotal > 0 && (
              <Typography component="span" variant="caption" color="text.secondary">
                {' '}· {fmtMinutos(duracionTotal)}
              </Typography>
            )}
          </Typography>
          {faltantes.length > 0 && (
            <Typography variant="caption" color="warning.main">
              Falta: {faltantes.join(', ')}
            </Typography>
          )}
        </Box>
        <Button onClick={onCerrar}>Cancelar</Button>
        <Tooltip title={faltantes.length ? `Falta: ${faltantes.join(', ')}` : ''}>
          <span>
            <Button
              variant="contained" onClick={() => guardar.mutate()}
              disabled={faltantes.length > 0 || guardar.isPending}
              sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
            >
              {guardar.isPending ? 'Guardando…' : cita ? 'Guardar cambios' : 'Agendar'}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  )
}
