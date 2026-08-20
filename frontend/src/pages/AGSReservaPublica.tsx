/**
 * Página pública de autoagendamiento — /reservar/:slug
 *
 * La ve el cliente final, sin login y casi siempre desde el celular. De ahí las
 * decisiones: un paso a la vez, botones grandes, y nada de jerga interna del
 * negocio. No usa Layout porque no debe mostrar la barra lateral del sistema.
 */
import { useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, Card, CardContent, Chip, Divider,
  alpha, Alert, CircularProgress, Stepper, Step, StepLabel, IconButton, Avatar,
  ToggleButtonGroup, ToggleButton, InputAdornment, Paper, Container,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  ArrowBack, CheckCircle, Schedule, Person, Event, ContentCut, Place, Store,
  Home, Phone, WhatsApp, Search, EventBusy, Storefront, ArrowForward,
} from '@mui/icons-material'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { publicClient as api } from '@/api/publico'
import {
  AGS_COLOR, AGS_DARK, fmtCOP, fmtMinutos, fmtFecha, hoyISO, sumarDiasISO, DIAS_SEMANA,
} from '@/utils/ags'

interface NegocioPublico {
  nombre: string
  tipo_negocio?: string | null
  telefono?: string | null
  direccion?: string | null
  ciudad?: string | null
  hora_apertura?: string | null
  hora_cierre?: string | null
  dias_laborales?: number[] | null
  mensaje_bienvenida?: string | null
  dias_max_anticipacion: number
  permite_cancelar_online: boolean
  horas_min_cancelacion: number
  requiere_confirmacion: boolean
}

interface ServicioPublico {
  id: number
  nombre: string
  descripcion?: string | null
  categoria?: string | null
  categoria_color?: string | null
  duracion_min: number
  precio: number
  permite_domicilio: boolean
}

interface ProfesionalPublico {
  id: number
  nombre: string
  especialidad?: string | null
  color?: string | null
}

interface SlotPublico {
  hora_inicio: string
  hora_fin: string
  inicio: string
  profesional_id: number
  profesional: string
}

interface ReservaOut {
  codigo: string
  estado: string
  fecha_inicio: string
  fecha_fin: string
  servicio: string
  profesional: string
  total: number
  requiere_confirmacion: boolean
  mensaje: string
}

interface CitaPublica {
  codigo: string
  estado: string
  fecha_inicio: string
  fecha_fin: string
  servicios: string
  profesional: string
  total: number
  lugar?: string | null
  direccion_servicio?: string | null
  puede_cancelar: boolean
  motivo_no_cancelable?: string | null
}

const PASOS = ['Servicio', 'Quién lo atiende', 'Día y hora', 'Sus datos']

/** Los próximos N días que el negocio atiende, para la tira de fechas. */
function fechasDisponibles(dias: number[], maxDias: number): string[] {
  const salida: string[] = []
  for (let i = 0; i < maxDias && salida.length < 21; i++) {
    const iso = sumarDiasISO(hoyISO(), i)
    const d = new Date(`${iso}T12:00:00`)
    const dow = d.getDay() === 0 ? 7 : d.getDay()
    if (dias.includes(dow)) salida.push(iso)
  }
  return salida
}

export default function AGSReservaPublica() {
  const { slug = '' } = useParams()
  const [paso, setPaso] = useState(0)
  const [servicio, setServicio] = useState<ServicioPublico | null>(null)
  const [profesionalId, setProfesionalId] = useState<number | null>(null)
  const [fecha, setFecha] = useState('')
  const [slot, setSlot] = useState<SlotPublico | null>(null)
  const [lugar, setLugar] = useState('LOCAL')
  const [datos, setDatos] = useState({ nombre: '', telefono: '', email: '', notas: '', direccion: '' })
  const [reserva, setReserva] = useState<ReservaOut | null>(null)

  // Modo consulta: "ya reservé, quiero ver o cancelar mi cita"
  const [modoConsulta, setModoConsulta] = useState(false)
  const [consulta, setConsulta] = useState({ codigo: '', telefono: '' })
  const [citaEncontrada, setCitaEncontrada] = useState<CitaPublica | null>(null)

  const { data: negocio, isLoading, error } = useQuery<NegocioPublico>({
    queryKey: ['publico-negocio', slug],
    queryFn: async () => (await api.get(`/ags/publico/${slug}`)).data,
    retry: false,
  })

  const { data: servicios = [] } = useQuery<ServicioPublico[]>({
    queryKey: ['publico-servicios', slug],
    queryFn: async () => (await api.get(`/ags/publico/${slug}/servicios`)).data,
    enabled: Boolean(negocio),
  })

  const { data: profesionales = [] } = useQuery<ProfesionalPublico[]>({
    queryKey: ['publico-profesionales', slug, servicio?.id],
    queryFn: async () => (await api.get(`/ags/publico/${slug}/profesionales`, {
      params: servicio ? { servicio_id: servicio.id } : {},
    })).data,
    enabled: Boolean(negocio) && Boolean(servicio),
  })

  const { data: slots = [], isFetching: buscandoSlots } = useQuery<SlotPublico[]>({
    queryKey: ['publico-disponibilidad', slug, fecha, servicio?.id, profesionalId],
    queryFn: async () => (await api.get(`/ags/publico/${slug}/disponibilidad`, {
      params: {
        fecha, servicio_id: servicio!.id,
        ...(profesionalId ? { profesional_id: profesionalId } : {}),
      },
    })).data,
    enabled: Boolean(negocio) && Boolean(servicio) && Boolean(fecha),
    retry: false,
  })

  const reservar = useMutation({
    mutationFn: async () => (await api.post(`/ags/publico/${slug}/reservar`, {
      nombre: datos.nombre,
      telefono: datos.telefono,
      email: datos.email || null,
      servicio_id: servicio!.id,
      profesional_id: slot?.profesional_id ?? profesionalId,
      fecha_inicio: slot!.inicio,
      notas: datos.notas || null,
      lugar,
      direccion_servicio: lugar === 'DOMICILIO' ? datos.direccion : null,
    })).data as ReservaOut,
    onSuccess: (d) => setReserva(d),
  })

  const buscarCita = useMutation({
    mutationFn: async () => (await api.get(`/ags/publico/${slug}/cita`, {
      params: { codigo: consulta.codigo, telefono: consulta.telefono },
    })).data as CitaPublica,
    onSuccess: (d) => setCitaEncontrada(d),
  })

  const cancelarCita = useMutation({
    mutationFn: async () => (await api.post(`/ags/publico/${slug}/cancelar`, {
      codigo: consulta.codigo, telefono: consulta.telefono,
    })).data as CitaPublica,
    onSuccess: (d) => setCitaEncontrada(d),
  })

  const fechas = useMemo(
    () => fechasDisponibles(negocio?.dias_laborales ?? [1, 2, 3, 4, 5, 6],
      negocio?.dias_max_anticipacion ?? 30),
    [negocio],
  )

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, ServicioPublico[]>()
    for (const s of servicios) {
      const k = s.categoria ?? 'Otros'
      mapa.set(k, [...(mapa.get(k) ?? []), s])
    }
    return [...mapa.entries()]
  }, [servicios])

  const errorMsg = (e: any) => e?.response?.data?.detail ?? 'Algo salió mal. Intente de nuevo.'

  // ── Estados de carga y error del negocio ──
  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress sx={{ color: AGS_COLOR }} />
      </Box>
    )
  }
  if (error || !negocio) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
        <Card sx={{ maxWidth: 440, textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <EventBusy sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Agenda no disponible
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {errorMsg(error)}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  const encabezado = (
    <Box sx={{
      background: `linear-gradient(135deg, ${AGS_COLOR} 0%, ${AGS_DARK} 100%)`,
      color: '#fff', py: 3.5, px: 2,
    }}>
      <Container maxWidth="sm" disableGutters>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 48, height: 48 }}>
            <Storefront />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} noWrap>{negocio.nombre}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {[negocio.direccion, negocio.ciudad].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Stack>
        {negocio.mensaje_bienvenida && (
          <Typography variant="body2" sx={{ mt: 1.5, opacity: 0.95 }}>
            {negocio.mensaje_bienvenida}
          </Typography>
        )}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.8 }}>
          {negocio.hora_apertura && negocio.hora_cierre && (
            <Chip
              size="small" icon={<Schedule sx={{ fontSize: 14, color: '#fff !important' }} />}
              label={`${negocio.hora_apertura} – ${negocio.hora_cierre}`}
              sx={{ bgcolor: alpha('#fff', 0.2), color: '#fff', height: 24 }}
            />
          )}
          <Chip
            size="small"
            label={(negocio.dias_laborales ?? []).map(
              d => DIAS_SEMANA.find(x => x.valor === d)?.corto).filter(Boolean).join(' ')}
            sx={{ bgcolor: alpha('#fff', 0.2), color: '#fff', height: 24 }}
          />
          {negocio.telefono && (
            <Chip
              size="small" icon={<Phone sx={{ fontSize: 14, color: '#fff !important' }} />}
              label={negocio.telefono} component="a"
              href={`tel:${negocio.telefono}`} clickable
              sx={{ bgcolor: alpha('#fff', 0.2), color: '#fff', height: 24 }}
            />
          )}
        </Stack>
      </Container>
    </Box>
  )

  // ── Comprobante de la reserva ──
  if (reserva) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {encabezado}
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Card>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 56, color: '#16A34A', mb: 1 }} />
              <Typography variant="h6" fontWeight={800} gutterBottom>
                {reserva.requiere_confirmacion ? '¡Reserva registrada!' : '¡Cita confirmada!'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {reserva.mensaje}
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, textAlign: 'left', mb: 2 }}>
                <Stack spacing={1}>
                  {[
                    ['Código', reserva.codigo],
                    ['Servicio', reserva.servicio],
                    ['Atiende', reserva.profesional],
                    ['Fecha', fmtFecha(reserva.fecha_inicio)],
                    ['Hora', `${reserva.fecha_inicio.slice(11, 16)} – ${reserva.fecha_fin.slice(11, 16)}`],
                    ['Valor', fmtCOP(reserva.total)],
                  ].map(([k, v]) => (
                    <Stack key={k} direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">{k}</Typography>
                      <Typography variant="body2" fontWeight={700}>{v}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>

              <Alert severity="info" sx={{ textAlign: 'left', mb: 2 }}>
                Guarde el código <strong>{reserva.codigo}</strong>. Con ese código y su
                teléfono puede consultar o cancelar la cita desde esta misma página.
              </Alert>

              <Stack spacing={1}>
                {negocio.telefono && (
                  <Button
                    variant="outlined" startIcon={<WhatsApp />}
                    href={`https://wa.me/${negocio.telefono.replace(/\D/g, '').length === 10
                      ? '57' + negocio.telefono.replace(/\D/g, '')
                      : negocio.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hola, acabo de reservar la cita ${reserva.codigo}.`)}`}
                    target="_blank" rel="noopener"
                    sx={{ borderColor: '#25D366', color: '#25D366' }}
                  >
                    Escribir al negocio
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setReserva(null); setPaso(0); setServicio(null); setProfesionalId(null)
                    setFecha(''); setSlot(null)
                    setDatos({ nombre: '', telefono: '', email: '', notas: '', direccion: '' })
                  }}
                >
                  Reservar otra cita
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    )
  }

  // ── Modo consulta / cancelación ──
  if (modoConsulta) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {encabezado}
        <Container maxWidth="sm" sx={{ py: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => {
            setModoConsulta(false); setCitaEncontrada(null)
          }} sx={{ mb: 2 }}>
            Volver a reservar
          </Button>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                Consultar mi cita
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Escriba el código que recibió y el teléfono con el que reservó.
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth size="small" label="Código de la cita" placeholder="CITA-00001"
                  value={consulta.codigo}
                  onChange={e => setConsulta(c => ({ ...c, codigo: e.target.value }))}
                />
                <TextField
                  fullWidth size="small" label="Teléfono" placeholder="300 000 0000"
                  value={consulta.telefono}
                  onChange={e => setConsulta(c => ({ ...c, telefono: e.target.value }))}
                />
                <Button
                  variant="contained" startIcon={<Search />}
                  onClick={() => buscarCita.mutate()}
                  disabled={!consulta.codigo.trim() || !consulta.telefono.trim() || buscarCita.isPending}
                  sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
                >
                  {buscarCita.isPending ? 'Buscando…' : 'Buscar'}
                </Button>
                {buscarCita.isError && (
                  <Alert severity="error">{errorMsg(buscarCita.error)}</Alert>
                )}
              </Stack>

              {citaEncontrada && (
                <>
                  <Divider sx={{ my: 2.5 }} />
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1}>
                      {[
                        ['Código', citaEncontrada.codigo],
                        ['Estado', citaEncontrada.estado],
                        ['Servicio', citaEncontrada.servicios],
                        ['Atiende', citaEncontrada.profesional],
                        ['Fecha', fmtFecha(citaEncontrada.fecha_inicio)],
                        ['Hora', citaEncontrada.fecha_inicio.slice(11, 16)],
                        ['Valor', fmtCOP(citaEncontrada.total)],
                      ].map(([k, v]) => (
                        <Stack key={k} direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">{k}</Typography>
                          <Typography variant="body2" fontWeight={700}>{v}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>

                  {citaEncontrada.puede_cancelar ? (
                    <Button
                      fullWidth color="error" variant="outlined" sx={{ mt: 2 }}
                      onClick={() => {
                        if (window.confirm('¿Seguro que desea cancelar esta cita?')) {
                          cancelarCita.mutate()
                        }
                      }}
                      disabled={cancelarCita.isPending}
                    >
                      {cancelarCita.isPending ? 'Cancelando…' : 'Cancelar mi cita'}
                    </Button>
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {citaEncontrada.motivo_no_cancelable}
                    </Alert>
                  )}
                  {cancelarCita.isError && (
                    <Alert severity="error" sx={{ mt: 1 }}>{errorMsg(cancelarCita.error)}</Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
    )
  }

  // ── Asistente de reserva ──
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {encabezado}
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Stepper activeStep={paso} alternativeLabel sx={{ mb: 3 }}>
          {PASOS.map(p => (
            <Step key={p}>
              <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: 11.5 } }}>{p}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Paso 0 · Servicio */}
        {paso === 0 && (
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
              ¿Qué servicio necesita?
            </Typography>
            {porCategoria.length === 0 && (
              <Alert severity="info">Este negocio todavía no publicó su lista de servicios.</Alert>
            )}
            {porCategoria.map(([cat, lista]) => (
              <Box key={cat} sx={{ mb: 2.5 }}>
                <Typography variant="overline" color="text.secondary">{cat}</Typography>
                <Stack spacing={1} sx={{ mt: 0.5 }}>
                  {lista.map(s => (
                    <Card
                      key={s.id} variant="outlined"
                      onClick={() => {
                        setServicio(s); setProfesionalId(null); setSlot(null)
                        setLugar(s.permite_domicilio ? 'DOMICILIO' : 'LOCAL')
                        setPaso(1)
                      }}
                      sx={{
                        cursor: 'pointer', transition: 'all .15s',
                        '&:hover': { borderColor: AGS_COLOR, transform: 'translateY(-1px)', boxShadow: 2 },
                      }}
                    >
                      <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700}>{s.nombre}</Typography>
                            {s.descripcion && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {s.descripcion}
                              </Typography>
                            )}
                            <Stack direction="row" spacing={0.6} sx={{ mt: 0.5 }}>
                              <Chip size="small" icon={<Schedule sx={{ fontSize: 12 }} />}
                                label={fmtMinutos(s.duracion_min)}
                                sx={{ height: 20, fontSize: 10.5 }} />
                              {s.permite_domicilio && (
                                <Chip size="small" icon={<Home sx={{ fontSize: 12 }} />}
                                  label="A domicilio" sx={{ height: 20, fontSize: 10.5 }} />
                              )}
                            </Stack>
                          </Box>
                          <Stack alignItems="flex-end">
                            <Typography variant="subtitle2" fontWeight={800} color={AGS_COLOR}>
                              {fmtCOP(s.precio)}
                            </Typography>
                            <ArrowForward sx={{ fontSize: 16, color: 'text.disabled' }} />
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />
            <Button fullWidth startIcon={<Search />} onClick={() => setModoConsulta(true)}>
              Ya tengo una cita — consultar o cancelar
            </Button>
          </Box>
        )}

        {/* Paso 1 · Profesional */}
        {paso === 1 && servicio && (
          <Box>
            <Button startIcon={<ArrowBack />} onClick={() => setPaso(0)} sx={{ mb: 1 }}>
              Cambiar servicio
            </Button>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
              ¿Con quién desea atenderse?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {servicio.nombre} · {fmtMinutos(servicio.duracion_min)} · {fmtCOP(servicio.precio)}
            </Typography>

            <Stack spacing={1}>
              <Card
                variant="outlined"
                onClick={() => { setProfesionalId(null); setSlot(null); setPaso(2) }}
                sx={{
                  cursor: 'pointer', borderColor: profesionalId === null ? AGS_COLOR : undefined,
                  '&:hover': { borderColor: AGS_COLOR },
                }}
              >
                <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(AGS_COLOR, 0.15), color: AGS_COLOR }}>
                      <ContentCut />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>Cualquiera disponible</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Le asignamos a quien tenga el cupo — normalmente hay más horas libres
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {profesionales.map(p => (
                <Card
                  key={p.id} variant="outlined"
                  onClick={() => { setProfesionalId(p.id); setSlot(null); setPaso(2) }}
                  sx={{
                    cursor: 'pointer', borderColor: profesionalId === p.id ? AGS_COLOR : undefined,
                    '&:hover': { borderColor: AGS_COLOR },
                  }}
                >
                  <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{
                        bgcolor: alpha(p.color || AGS_COLOR, 0.15),
                        color: p.color || AGS_COLOR, fontWeight: 800,
                      }}>
                        {p.nombre.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{p.nombre}</Typography>
                        {p.especialidad && (
                          <Typography variant="caption" color="text.secondary">
                            {p.especialidad}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        )}

        {/* Paso 2 · Día y hora */}
        {paso === 2 && servicio && (
          <Box>
            <Button startIcon={<ArrowBack />} onClick={() => setPaso(1)} sx={{ mb: 1 }}>
              Cambiar quién atiende
            </Button>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
              ¿Qué día le sirve?
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 2 }}>
              {fechas.map(f => {
                const d = new Date(`${f}T12:00:00`)
                const activo = fecha === f
                return (
                  <Paper
                    key={f} variant="outlined"
                    onClick={() => { setFecha(f); setSlot(null) }}
                    sx={{
                      minWidth: 62, p: 1, textAlign: 'center', cursor: 'pointer', flexShrink: 0,
                      ...(activo
                        ? { bgcolor: AGS_COLOR, color: '#fff', borderColor: AGS_COLOR }
                        : { '&:hover': { borderColor: AGS_COLOR } }),
                    }}
                  >
                    <Typography variant="caption" display="block" sx={{ opacity: 0.85, fontSize: 10 }}>
                      {d.toLocaleDateString('es-CO', { weekday: 'short' })}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                      {d.getDate()}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.85, fontSize: 10 }}>
                      {d.toLocaleDateString('es-CO', { month: 'short' })}
                    </Typography>
                  </Paper>
                )
              })}
            </Box>

            {fecha && (
              <Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                  Horas libres
                </Typography>
                {buscandoSlots ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} sx={{ color: AGS_COLOR }} />
                    <Typography variant="caption" color="text.secondary">Consultando…</Typography>
                  </Stack>
                ) : slots.length === 0 ? (
                  <Alert severity="info">
                    No quedan cupos ese día para {servicio.nombre}. Pruebe otra fecha
                    {profesionalId ? ' o elija «cualquiera disponible»' : ''}.
                  </Alert>
                ) : (
                  <Grid container spacing={1}>
                    {slots.map(s => (
                      <Grid key={`${s.hora_inicio}-${s.profesional_id}`} size={{ xs: 4, sm: 3 }}>
                        <Button
                          fullWidth
                          variant={slot?.hora_inicio === s.hora_inicio ? 'contained' : 'outlined'}
                          onClick={() => setSlot(s)}
                          sx={{
                            fontVariantNumeric: 'tabular-nums',
                            ...(slot?.hora_inicio === s.hora_inicio
                              ? { bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }
                              : { borderColor: alpha(AGS_COLOR, 0.4), color: 'text.primary' }),
                          }}
                        >
                          {s.hora_inicio}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                )}

                {slot && (
                  <Button
                    fullWidth variant="contained" sx={{
                      mt: 2.5, bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK },
                    }}
                    endIcon={<ArrowForward />}
                    onClick={() => setPaso(3)}
                  >
                    Continuar · {slot.hora_inicio} con {slot.profesional}
                  </Button>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Paso 3 · Datos */}
        {paso === 3 && servicio && slot && (
          <Box>
            <Button startIcon={<ArrowBack />} onClick={() => setPaso(2)} sx={{ mb: 1 }}>
              Cambiar día u hora
            </Button>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: alpha(AGS_COLOR, 0.04) }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary">Su reserva</Typography>
                <Typography variant="body2" fontWeight={800}>{servicio.nombre}</Typography>
                <Typography variant="body2">
                  {fmtFecha(slot.inicio)} a las {slot.hora_inicio} · {slot.profesional}
                </Typography>
                <Typography variant="body2" fontWeight={800} color={AGS_COLOR} sx={{ mt: 0.5 }}>
                  {fmtCOP(servicio.precio)}
                </Typography>
              </CardContent>
            </Card>

            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
              Sus datos
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth size="small" label="Nombre completo" required
                value={datos.nombre}
                onChange={e => setDatos(d => ({ ...d, nombre: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="Teléfono" required
                placeholder="300 000 0000"
                value={datos.telefono}
                onChange={e => setDatos(d => ({ ...d, telefono: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment>,
                }}
                helperText="Con este número le confirmamos la cita"
              />
              <TextField
                fullWidth size="small" label="Correo (opcional)" value={datos.email}
                onChange={e => setDatos(d => ({ ...d, email: e.target.value }))}
              />

              {servicio.permite_domicilio && (
                <>
                  <ToggleButtonGroup
                    exclusive fullWidth size="small" value={lugar}
                    onChange={(_e, v) => { if (v) setLugar(v) }}
                  >
                    <ToggleButton value="LOCAL">
                      <Store fontSize="small" sx={{ mr: 0.5 }} />En el local
                    </ToggleButton>
                    <ToggleButton value="DOMICILIO">
                      <Home fontSize="small" sx={{ mr: 0.5 }} />A domicilio
                    </ToggleButton>
                  </ToggleButtonGroup>
                  {lugar === 'DOMICILIO' && (
                    <TextField
                      fullWidth size="small" label="Dirección" required
                      placeholder="Calle 00 # 00-00, barrio"
                      value={datos.direccion}
                      onChange={e => setDatos(d => ({ ...d, direccion: e.target.value }))}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Place fontSize="small" /></InputAdornment>,
                      }}
                    />
                  )}
                </>
              )}

              <TextField
                fullWidth size="small" label="Algo que debamos saber (opcional)"
                multiline rows={2} value={datos.notas}
                onChange={e => setDatos(d => ({ ...d, notas: e.target.value }))}
              />

              {reservar.isError && <Alert severity="error">{errorMsg(reservar.error)}</Alert>}

              <Button
                fullWidth size="large" variant="contained"
                onClick={() => reservar.mutate()}
                disabled={
                  reservar.isPending
                  || datos.nombre.trim().length < 3
                  || datos.telefono.replace(/\D/g, '').length < 7
                  || (lugar === 'DOMICILIO' && !datos.direccion.trim())
                }
                sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
              >
                {reservar.isPending ? 'Reservando…' : 'Confirmar reserva'}
              </Button>
              <Typography variant="caption" color="text.secondary" textAlign="center">
                {negocio.requiere_confirmacion
                  ? 'El negocio confirmará su reserva.'
                  : 'Su cita queda confirmada de inmediato.'}
                {negocio.permite_cancelar_online && negocio.horas_min_cancelacion > 0
                  && ` Puede cancelar hasta ${negocio.horas_min_cancelacion} horas antes.`}
              </Typography>
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  )
}
