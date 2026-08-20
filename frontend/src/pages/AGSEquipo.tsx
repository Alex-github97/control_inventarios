/**
 * AGS · Equipo — quién presta los servicios, su jornada y su comisión.
 *
 * La jornada no es un dato decorativo: es lo que la agenda usa para saber qué
 * horas ofrecer, así que se edita aquí día por día.
 */
import { useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Card, CardContent, Chip,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch, FormControlLabel, alpha, Tooltip, Menu,
  ListItemIcon, ListItemText, InputAdornment, Alert, Divider, Avatar, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add, Edit, Delete, MoreVert, Schedule, EventBusy, Groups, Home,
  ContentCut, PersonOff, ContentCopy,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import {
  AGS_COLOR, AGS_DARK, fmtCOP, fmtCortoCOP, fmtMinutos, fmtFechaHora, DIAS_SEMANA,
  hoyISO, type Profesional, type Servicio, type Horario, type Ausencia,
} from '@/utils/ags'

const PRO_VACIO = {
  nombre: '', documento: '', telefono: '', email: '', especialidad: '',
  color: AGS_COLOR, comision_pct: 0, salario_base: 0,
  acepta_domicilio: false, notas: '', activo: true,
}

/** Jornada por defecto al crear: lunes a sábado con hora de almuerzo. */
function jornadaSugerida(): Horario[] {
  const franjas: Horario[] = []
  for (let d = 1; d <= 6; d++) {
    franjas.push({ dia_semana: d, hora_inicio: '08:00', hora_fin: '12:00', activo: true })
    franjas.push({ dia_semana: d, hora_inicio: '14:00', hora_fin: '18:00', activo: true })
  }
  return franjas
}

export default function AGSEquipo() {
  const qc = useQueryClient()
  const [dlgPro, setDlgPro] = useState<{ abierto: boolean; item: Profesional | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState({ ...PRO_VACIO })
  const [wasOpen, setWasOpen] = useState(false)

  const [dlgHorario, setDlgHorario] = useState<Profesional | null>(null)
  const [franjas, setFranjas] = useState<Horario[]>([])
  const [horarioId, setHorarioId] = useState<number | null>(null)

  const [dlgServicios, setDlgServicios] = useState<Profesional | null>(null)
  const [seleccion, setSeleccion] = useState<number[]>([])
  const [serviciosId, setServiciosId] = useState<number | null>(null)

  const [dlgAusencia, setDlgAusencia] = useState(false)
  const [formAus, setFormAus] = useState({
    profesional_id: '' as number | '', fecha_inicio: '', fecha_fin: '',
    motivo: '', tipo: 'PERMISO',
  })

  const [menu, setMenu] = useState<{ el: HTMLElement; item: Profesional } | null>(null)

  if (dlgPro.abierto && !wasOpen) {
    setWasOpen(true)
    setForm(dlgPro.item
      ? {
        nombre: dlgPro.item.nombre, documento: dlgPro.item.documento ?? '',
        telefono: dlgPro.item.telefono ?? '', email: dlgPro.item.email ?? '',
        especialidad: dlgPro.item.especialidad ?? '', color: dlgPro.item.color ?? AGS_COLOR,
        comision_pct: dlgPro.item.comision_pct ?? 0, salario_base: dlgPro.item.salario_base ?? 0,
        acepta_domicilio: Boolean(dlgPro.item.acepta_domicilio), notas: dlgPro.item.notas ?? '',
        activo: dlgPro.item.activo !== false,
      }
      : { ...PRO_VACIO })
  }
  if (!dlgPro.abierto && wasOpen) setWasOpen(false)

  if (dlgHorario && horarioId !== dlgHorario.id) {
    setHorarioId(dlgHorario.id)
    const actuales = dlgHorario.horarios ?? []
    setFranjas(actuales.length ? actuales.map(h => ({ ...h })) : jornadaSugerida())
  }
  if (!dlgHorario && horarioId !== null) setHorarioId(null)

  if (dlgServicios && serviciosId !== dlgServicios.id) {
    setServiciosId(dlgServicios.id)
    setSeleccion(dlgServicios.servicios_ids ?? [])
  }
  if (!dlgServicios && serviciosId !== null) setServiciosId(null)

  const { data: profesionales = [] } = useQuery<Profesional[]>({
    queryKey: ['ags-profesionales-todos'],
    queryFn: async () => (await api.get('/ags/profesionales')).data,
  })
  const { data: servicios = [] } = useQuery<Servicio[]>({
    queryKey: ['ags-servicios-activos'],
    queryFn: async () => (await api.get('/ags/servicios?solo_activos=true')).data,
  })
  const { data: ausencias = [] } = useQuery<Ausencia[]>({
    queryKey: ['ags-ausencias'],
    queryFn: async () => (await api.get('/ags/ausencias')).data,
  })

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['ags-profesionales-todos'] })
    qc.invalidateQueries({ queryKey: ['ags-profesionales'] })
    qc.invalidateQueries({ queryKey: ['ags-ausencias'] })
  }

  const guardarPro = useMutation({
    mutationFn: async () => dlgPro.item
      ? (await api.put(`/ags/profesionales/${dlgPro.item.id}`, form)).data
      : (await api.post('/ags/profesionales', form)).data,
    onSuccess: async (creado: Profesional) => {
      // A quien se acaba de crear se le siembra la jornada típica: sin
      // jornada la agenda no le ofrece ninguna hora y parece estar roto.
      if (!dlgPro.item) {
        try {
          await api.put(`/ags/profesionales/${creado.id}/horarios`, jornadaSugerida())
          toast.success(`${creado.nombre} registrado con jornada lunes a sábado. Ajústela si es distinta.`)
        } catch {
          toast.success(`${creado.nombre} registrado. Defina su jornada para poder agendarle.`)
        }
      } else {
        toast.success('Datos actualizados')
      }
      invalidar()
      setDlgPro({ abierto: false, item: null })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar'),
  })

  const desactivar = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/ags/profesionales/${id}`)).data,
    onSuccess: () => { toast.success('Profesional desactivado'); invalidar() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo desactivar'),
  })

  const guardarHorario = useMutation({
    mutationFn: async () => (await api.put(
      `/ags/profesionales/${dlgHorario!.id}/horarios`,
      franjas.filter(f => f.hora_inicio && f.hora_fin),
    )).data,
    onSuccess: () => {
      toast.success('Jornada guardada')
      invalidar()
      setDlgHorario(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar la jornada'),
  })

  const guardarServicios = useMutation({
    mutationFn: async () => (await api.put(
      `/ags/profesionales/${dlgServicios!.id}/servicios`, { servicios_ids: seleccion })).data,
    onSuccess: () => {
      toast.success('Servicios asignados')
      invalidar()
      setDlgServicios(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo asignar'),
  })

  const crearAusencia = useMutation({
    mutationFn: async () => (await api.post('/ags/ausencias', {
      profesional_id: formAus.profesional_id === '' ? null : formAus.profesional_id,
      fecha_inicio: formAus.fecha_inicio,
      fecha_fin: formAus.fecha_fin,
      motivo: formAus.motivo || null,
      tipo: formAus.tipo,
    })).data,
    onSuccess: () => {
      toast.success('Agenda bloqueada en ese rango')
      invalidar()
      setDlgAusencia(false)
      setFormAus({ profesional_id: '', fecha_inicio: '', fecha_fin: '', motivo: '', tipo: 'PERMISO' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo bloquear'),
  })

  const eliminarAusencia = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/ags/ausencias/${id}`)).data,
    onSuccess: () => { toast.success('Bloqueo eliminado'); invalidar() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo eliminar'),
  })

  const horasJornada = (h: Horario[]) => h.reduce((s, f) => {
    const [hi, mi] = f.hora_inicio.split(':').map(Number)
    const [hf, mf] = f.hora_fin.split(':').map(Number)
    return s + Math.max((hf * 60 + mf) - (hi * 60 + mi), 0)
  }, 0)

  const totalIngresos = useMemo(
    () => profesionales.reduce((s, p) => s + (p.ingresos_mes ?? 0), 0), [profesionales])

  return (
    <Layout title="Equipo">
      <Box className="anim-page-in">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Equipo</Typography>
            <Typography variant="body2" color="text.secondary">
              {profesionales.filter(p => p.activo !== false).length} activo(s) ·
              {' '}{fmtCortoCOP(totalIngresos)} producidos este mes
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<EventBusy />} onClick={() => setDlgAusencia(true)}>
              Bloquear agenda
            </Button>
            <Button
              variant="contained" startIcon={<Add />}
              onClick={() => setDlgPro({ abierto: true, item: null })}
              sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
            >
              Registrar persona
            </Button>
          </Stack>
        </Stack>

        {profesionales.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Todavía no hay nadie registrado. Sin al menos una persona con jornada definida
            la agenda no puede ofrecer horas.
          </Alert>
        )}

        {/* ── Tarjetas del equipo ── */}
        <Grid container spacing={2} className="anim-stagger">
          {profesionales.map(p => {
            const color = p.color || AGS_COLOR
            const minutos = horasJornada(p.horarios ?? [])
            const inactivo = p.activo === false
            return (
              <Grid key={p.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card sx={{
                  height: '100%', borderTop: `3px solid ${color}`,
                  opacity: inactivo ? 0.6 : 1,
                }}>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Avatar sx={{ bgcolor: alpha(color, 0.15), color, fontWeight: 800 }}>
                        {p.nombre.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={800} noWrap>{p.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {p.codigo}{p.especialidad ? ` · ${p.especialidad}` : ''}
                        </Typography>
                        {p.telefono && (
                          <Typography variant="caption" color="text.secondary">{p.telefono}</Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={0.3} alignItems="center">
                        {inactivo && (
                          <Chip size="small" label="Inactivo"
                            sx={{ height: 19, fontSize: 10, bgcolor: alpha('#64748B', 0.15) }} />
                        )}
                        <IconButton size="small" onClick={e => setMenu({ el: e.currentTarget, item: p })}>
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    <Grid container spacing={1}>
                      <Grid size={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Comisión</Typography>
                        <Typography variant="body2" fontWeight={700}>{p.comision_pct ?? 0}%</Typography>
                      </Grid>
                      <Grid size={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Citas del mes</Typography>
                        <Typography variant="body2" fontWeight={700}>{p.citas_mes ?? 0}</Typography>
                      </Grid>
                      <Grid size={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Producción</Typography>
                        <Typography variant="body2" fontWeight={700}>{fmtCortoCOP(p.ingresos_mes)}</Typography>
                      </Grid>
                      <Grid size={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Jornada semanal</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {minutos > 0 ? fmtMinutos(minutos) : '—'}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                      {(p.horarios ?? []).length === 0 ? (
                        <Chip
                          size="small" icon={<Schedule sx={{ fontSize: 13 }} />}
                          label="Sin jornada" color="warning" variant="outlined"
                          onClick={() => setDlgHorario(p)}
                          sx={{ height: 22, fontSize: 10.5 }}
                        />
                      ) : (
                        DIAS_SEMANA.filter(d => (p.horarios ?? []).some(h => h.dia_semana === d.valor))
                          .map(d => (
                            <Chip
                              key={d.valor} size="small" label={d.corto}
                              sx={{
                                height: 21, fontSize: 10, fontWeight: 700,
                                bgcolor: alpha(color, 0.12), color,
                              }}
                            />
                          ))
                      )}
                      {p.acepta_domicilio && (
                        <Tooltip title="Atiende a domicilio">
                          <Chip size="small" icon={<Home sx={{ fontSize: 13 }} />} label="Domicilio"
                            sx={{ height: 21, fontSize: 10 }} />
                        </Tooltip>
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Button size="small" startIcon={<Schedule />} onClick={() => setDlgHorario(p)}
                        sx={{ fontSize: 11.5 }}>
                        Jornada
                      </Button>
                      <Button size="small" startIcon={<ContentCut />} onClick={() => setDlgServicios(p)}
                        sx={{ fontSize: 11.5 }}>
                        Servicios ({(p.servicios_ids ?? []).length || 'todos'})
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>

        {/* ── Bloqueos de agenda ── */}
        {ausencias.length > 0 && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                Bloqueos de agenda
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Quién</TableCell>
                    <TableCell>Desde</TableCell>
                    <TableCell>Hasta</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Motivo</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ausencias.map(a => (
                    <TableRow key={a.id} hover>
                      <TableCell>{a.profesional_nombre}</TableCell>
                      <TableCell>{fmtFechaHora(a.fecha_inicio)}</TableCell>
                      <TableCell>{fmtFechaHora(a.fecha_fin)}</TableCell>
                      <TableCell><Chip size="small" label={a.tipo} sx={{ height: 20, fontSize: 10.5 }} /></TableCell>
                      <TableCell>
                        <Typography variant="caption">{a.motivo ?? '—'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => eliminarAusencia.mutate(a.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── Menú ── */}
        <Menu open={Boolean(menu)} anchorEl={menu?.el} onClose={() => setMenu(null)}>
          <MenuItem onClick={() => { setDlgPro({ abierto: true, item: menu!.item }); setMenu(null) }}>
            <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
            <ListItemText>Editar datos</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setDlgHorario(menu!.item); setMenu(null) }}>
            <ListItemIcon><Schedule fontSize="small" /></ListItemIcon>
            <ListItemText>Definir jornada</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setDlgServicios(menu!.item); setMenu(null) }}>
            <ListItemIcon><ContentCut fontSize="small" /></ListItemIcon>
            <ListItemText>Servicios que presta</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem
            disabled={menu?.item.activo === false}
            onClick={() => {
              if (window.confirm(`¿Desactivar a ${menu!.item.nombre}?`)) desactivar.mutate(menu!.item.id)
              setMenu(null)
            }}
          >
            <ListItemIcon><PersonOff fontSize="small" color="error" /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ color: 'error.main' }}>Desactivar</ListItemText>
          </MenuItem>
        </Menu>

        {/* ── Diálogo de datos ── */}
        <Dialog open={dlgPro.abierto} onClose={() => setDlgPro({ abierto: false, item: null })}
          maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {dlgPro.item ? `Editar ${dlgPro.item.nombre}` : 'Registrar persona'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 7 }}>
                <TextField fullWidth size="small" label="Nombre completo" required autoFocus
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField fullWidth size="small" label="Especialidad"
                  placeholder="Estilista, barbero, plomero…"
                  value={form.especialidad}
                  onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Documento" value={form.documento}
                  onChange={e => setForm(f => ({ ...f, documento: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Teléfono" value={form.telefono}
                  onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Correo" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField
                  type="number" fullWidth size="small" label="Comisión"
                  value={form.comision_pct}
                  onChange={e => setForm(f => ({ ...f, comision_pct: Number(e.target.value) || 0 }))}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  helperText="Sobre la mano de obra"
                />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField
                  type="number" fullWidth size="small" label="Salario base"
                  value={form.salario_base}
                  onChange={e => setForm(f => ({ ...f, salario_base: Number(e.target.value) || 0 }))}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Color en la agenda" type="color"
                  value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth size="small" label="Notas" multiline rows={2} value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={<Switch checked={form.acepta_domicilio}
                    onChange={e => setForm(f => ({ ...f, acepta_domicilio: e.target.checked }))} />}
                  label={<Typography variant="body2">Atiende a domicilio</Typography>}
                />
                <FormControlLabel
                  control={<Switch checked={form.activo}
                    onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />}
                  label={<Typography variant="body2">Activo</Typography>}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDlgPro({ abierto: false, item: null })}>Cancelar</Button>
            <Button
              variant="contained" onClick={() => guardarPro.mutate()}
              disabled={!form.nombre.trim() || guardarPro.isPending}
              sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
            >
              {guardarPro.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo de jornada ── */}
        <Dialog open={Boolean(dlgHorario)} onClose={() => setDlgHorario(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            Jornada de {dlgHorario?.nombre}
            <Typography variant="caption" color="text.secondary" display="block">
              La agenda solo ofrece horas dentro de estas franjas
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              {DIAS_SEMANA.map(d => {
                const delDia = franjas.filter(f => f.dia_semana === d.valor)
                return (
                  <Box key={d.valor}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" fontWeight={700}>{d.label}</Typography>
                      <Button
                        size="small" startIcon={<Add sx={{ fontSize: 15 }} />}
                        onClick={() => setFranjas(p => [...p, {
                          dia_semana: d.valor, hora_inicio: '08:00', hora_fin: '12:00', activo: true,
                        }])}
                        sx={{ fontSize: 11 }}
                      >
                        Franja
                      </Button>
                    </Stack>
                    {delDia.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">No trabaja</Typography>
                    ) : (
                      <Stack spacing={0.6} sx={{ mt: 0.4 }}>
                        {delDia.map(f => {
                          const idx = franjas.indexOf(f)
                          return (
                            <Stack key={idx} direction="row" spacing={1} alignItems="center">
                              <TextField
                                type="time" size="small" label="Desde" value={f.hora_inicio}
                                onChange={e => setFranjas(p => p.map((x, j) =>
                                  j === idx ? { ...x, hora_inicio: e.target.value } : x))}
                                InputLabelProps={{ shrink: true }} sx={{ width: 130 }}
                              />
                              <TextField
                                type="time" size="small" label="Hasta" value={f.hora_fin}
                                onChange={e => setFranjas(p => p.map((x, j) =>
                                  j === idx ? { ...x, hora_fin: e.target.value } : x))}
                                InputLabelProps={{ shrink: true }} sx={{ width: 130 }}
                                error={f.hora_fin <= f.hora_inicio}
                              />
                              <IconButton size="small"
                                onClick={() => setFranjas(p => p.filter((_x, j) => j !== idx))}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Stack>
                          )
                        })}
                      </Stack>
                    )}
                  </Box>
                )
              })}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              startIcon={<ContentCopy />} sx={{ mr: 'auto' }}
              onClick={() => setFranjas(jornadaSugerida())}
            >
              Jornada típica
            </Button>
            <Button onClick={() => setDlgHorario(null)}>Cancelar</Button>
            <Button
              variant="contained" onClick={() => guardarHorario.mutate()}
              disabled={guardarHorario.isPending
                || franjas.some(f => f.hora_fin <= f.hora_inicio)}
              sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
            >
              Guardar jornada
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo de servicios que presta ── */}
        <Dialog open={Boolean(dlgServicios)} onClose={() => setDlgServicios(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            Servicios que presta {dlgServicios?.nombre}
            <Typography variant="caption" color="text.secondary" display="block">
              Si no marca ninguno, se asume que puede prestar todos
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={0.3}>
              {servicios.map(s => (
                <FormControlLabel
                  key={s.id}
                  control={
                    <Switch
                      size="small" checked={seleccion.includes(s.id)}
                      onChange={e => setSeleccion(p =>
                        e.target.checked ? [...p, s.id] : p.filter(x => x !== s.id))}
                    />
                  }
                  label={
                    <Stack direction="row" spacing={1} alignItems="baseline">
                      <Typography variant="body2">{s.nombre}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.categoria_nombre} · {fmtMinutos(s.duracion_min)} · {fmtCOP(s.precio)}
                      </Typography>
                    </Stack>
                  }
                />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button sx={{ mr: 'auto' }} onClick={() => setSeleccion(servicios.map(s => s.id))}>
              Marcar todos
            </Button>
            <Button onClick={() => setSeleccion([])}>Limpiar</Button>
            <Button onClick={() => setDlgServicios(null)}>Cancelar</Button>
            <Button
              variant="contained" onClick={() => guardarServicios.mutate()}
              disabled={guardarServicios.isPending}
              sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
            >
              Guardar
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo de bloqueo ── */}
        <Dialog open={dlgAusencia} onClose={() => setDlgAusencia(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Bloquear agenda</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                select fullWidth size="small" label="Quién"
                value={formAus.profesional_id}
                onChange={e => setFormAus(f => ({
                  ...f, profesional_id: e.target.value === '' ? '' : Number(e.target.value),
                }))}
              >
                <MenuItem value="">Todo el negocio (festivo, cierre)</MenuItem>
                {profesionales.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </TextField>
              <TextField
                type="datetime-local" fullWidth size="small" label="Desde" required
                value={formAus.fecha_inicio} InputLabelProps={{ shrink: true }}
                onChange={e => setFormAus(f => ({ ...f, fecha_inicio: e.target.value }))}
              />
              <TextField
                type="datetime-local" fullWidth size="small" label="Hasta" required
                value={formAus.fecha_fin} InputLabelProps={{ shrink: true }}
                onChange={e => setFormAus(f => ({ ...f, fecha_fin: e.target.value }))}
              />
              <TextField
                select fullWidth size="small" label="Tipo" value={formAus.tipo}
                onChange={e => setFormAus(f => ({ ...f, tipo: e.target.value }))}
              >
                {['PERMISO', 'VACACIONES', 'INCAPACIDAD', 'FESTIVO', 'CAPACITACION', 'OTRO']
                  .map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField
                fullWidth size="small" label="Motivo" value={formAus.motivo}
                onChange={e => setFormAus(f => ({ ...f, motivo: e.target.value }))}
              />
              <Alert severity="info" sx={{ py: 0.3 }}>
                Si ya hay citas agendadas en ese rango, el sistema no deja bloquear:
                primero hay que reprogramarlas.
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDlgAusencia(false)}>Cancelar</Button>
            <Button
              variant="contained" onClick={() => crearAusencia.mutate()}
              disabled={!formAus.fecha_inicio || !formAus.fecha_fin || crearAusencia.isPending}
              sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
            >
              Bloquear
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
