/**
 * AGS · Clientes — quiénes son y cuánto ha dejado cada uno.
 *
 * Más allá del directorio, la tabla responde la pregunta que importa en estos
 * negocios: quién vale la pena recuperar y quién quedó debiendo.
 */
import { useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, Card, CardContent, Chip, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch, FormControlLabel, alpha, Tooltip, Menu,
  ListItemIcon, ListItemText, InputAdornment, Alert, Divider, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add, Edit, MoreVert, Search, History, WhatsApp, Download, PersonOff,
  Cake, Place, WarningAmber, TrendingUp,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { exportarExcel } from '@/utils/exportar'
import {
  AGS_COLOR, AGS_DARK, fmtCOP, fmtCortoCOP, fmtFecha, fmtFechaHora, estadoCita,
  type Cliente, type HistorialCliente,
} from '@/utils/ags'

const CLIENTE_VACIO = {
  nombre: '', documento: '', telefono: '', email: '', direccion: '',
  barrio: '', ciudad: '', fecha_nacimiento: '', como_nos_conocio: '',
  acepta_recordatorios: true, notas: '', activo: true,
}

const ORDENES = [
  { valor: 'gasto', label: 'Mayor gasto' },
  { valor: 'reciente', label: 'Visita más reciente' },
  { valor: 'perdidos', label: 'Más tiempo sin venir' },
  { valor: 'deuda', label: 'Saldo pendiente' },
  { valor: 'nombre', label: 'Nombre' },
] as const

export default function AGSClientes() {
  const qc = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<string>('gasto')
  const [soloDeudores, setSoloDeudores] = useState(false)

  const [dlg, setDlg] = useState<{ abierto: boolean; item: Cliente | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState({ ...CLIENTE_VACIO })
  const [wasOpen, setWasOpen] = useState(false)
  const [historialDe, setHistorialDe] = useState<Cliente | null>(null)
  const [menu, setMenu] = useState<{ el: HTMLElement; item: Cliente } | null>(null)

  if (dlg.abierto && !wasOpen) {
    setWasOpen(true)
    setForm(dlg.item
      ? {
        nombre: dlg.item.nombre, documento: dlg.item.documento ?? '',
        telefono: dlg.item.telefono ?? '', email: dlg.item.email ?? '',
        direccion: dlg.item.direccion ?? '', barrio: dlg.item.barrio ?? '',
        ciudad: dlg.item.ciudad ?? '',
        fecha_nacimiento: dlg.item.fecha_nacimiento ?? '',
        como_nos_conocio: dlg.item.como_nos_conocio ?? '',
        acepta_recordatorios: dlg.item.acepta_recordatorios !== false,
        notas: dlg.item.notas ?? '', activo: dlg.item.activo !== false,
      }
      : { ...CLIENTE_VACIO })
  }
  if (!dlg.abierto && wasOpen) setWasOpen(false)

  const { data: clientes = [], isLoading } = useQuery<Cliente[]>({
    queryKey: ['ags-clientes'],
    queryFn: async () => (await api.get('/ags/clientes')).data,
  })

  const { data: historial } = useQuery<HistorialCliente>({
    queryKey: ['ags-historial-cliente', historialDe?.id],
    queryFn: async () => (await api.get(`/ags/clientes/${historialDe!.id}/historial`)).data,
    enabled: Boolean(historialDe),
  })

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['ags-clientes'] })
    qc.invalidateQueries({ queryKey: ['ags-clientes-min'] })
  }

  const guardar = useMutation({
    mutationFn: async () => {
      const cuerpo = { ...form, fecha_nacimiento: form.fecha_nacimiento || null }
      return dlg.item
        ? (await api.put(`/ags/clientes/${dlg.item.id}`, cuerpo)).data
        : (await api.post('/ags/clientes', cuerpo)).data
    },
    onSuccess: () => {
      toast.success(dlg.item ? 'Cliente actualizado' : 'Cliente registrado')
      invalidar()
      setDlg({ abierto: false, item: null })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar'),
  })

  const desactivar = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/ags/clientes/${id}`)).data,
    onSuccess: () => { toast.success('Cliente desactivado'); invalidar() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo desactivar'),
  })

  const abrirWhatsApp = (c: Cliente) => {
    if (!c.telefono) { toast.error('El cliente no tiene teléfono registrado'); return }
    let digitos = c.telefono.replace(/\D/g, '')
    if (digitos.length === 10) digitos = `57${digitos}`
    window.open(`https://wa.me/${digitos}`, '_blank', 'noopener')
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    let lista = clientes.filter(c => {
      if (soloDeudores && (c.saldo_pendiente ?? 0) <= 0) return false
      if (!q) return true
      return c.nombre.toLowerCase().includes(q)
        || (c.telefono ?? '').includes(q)
        || (c.documento ?? '').toLowerCase().includes(q)
        || c.codigo.toLowerCase().includes(q)
        || (c.barrio ?? '').toLowerCase().includes(q)
    })
    lista = [...lista].sort((a, b) => {
      switch (orden) {
        case 'gasto': return (b.total_gastado ?? 0) - (a.total_gastado ?? 0)
        case 'deuda': return (b.saldo_pendiente ?? 0) - (a.saldo_pendiente ?? 0)
        case 'nombre': return a.nombre.localeCompare(b.nombre)
        case 'reciente':
          return new Date(b.ultima_visita ?? 0).getTime() - new Date(a.ultima_visita ?? 0).getTime()
        case 'perdidos': {
          // Los que nunca han venido van al final: no son clientes perdidos,
          // son clientes que todavía no han estrenado.
          if (!a.ultima_visita) return 1
          if (!b.ultima_visita) return -1
          return new Date(a.ultima_visita).getTime() - new Date(b.ultima_visita).getTime()
        }
        default: return 0
      }
    })
    return lista
  }, [clientes, busqueda, orden, soloDeudores])

  const resumen = useMemo(() => ({
    total: clientes.length,
    conDeuda: clientes.filter(c => (c.saldo_pendiente ?? 0) > 0).length,
    deuda: clientes.reduce((s, c) => s + (c.saldo_pendiente ?? 0), 0),
    facturado: clientes.reduce((s, c) => s + (c.total_gastado ?? 0), 0),
  }), [clientes])

  const diasSin = (c: Cliente): number | null => {
    if (!c.ultima_visita) return null
    return Math.floor((Date.now() - new Date(c.ultima_visita).getTime()) / 86400000)
  }

  const exportar = () => {
    if (!filtrados.length) { toast.error('No hay clientes para exportar'); return }
    exportarExcel({
      archivo: 'ags-clientes',
      titulo: 'Clientes e ingresos por cliente',
      color: AGS_COLOR,
      columnas: [
        { key: 'codigo', header: 'Código' },
        { key: 'nombre', header: 'Cliente' },
        { key: 'telefono', header: 'Teléfono' },
        { key: 'barrio', header: 'Barrio' },
        { key: 'total_citas', header: 'Citas' },
        { key: 'citas_completadas', header: 'Atendidas' },
        { key: 'citas_no_asistio', header: 'No asistió' },
        { key: 'total_gastado', header: 'Total gastado' },
        { key: 'ticket_promedio', header: 'Ticket promedio' },
        { key: 'saldo_pendiente', header: 'Saldo pendiente' },
        { key: 'ultima', header: 'Última visita' },
      ],
      filas: filtrados.map(c => ({ ...c, ultima: fmtFecha(c.ultima_visita) })),
    })
    toast.success('Clientes exportados')
  }

  return (
    <Layout title="Clientes">
      <Box className="anim-page-in">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Clientes</Typography>
            <Typography variant="body2" color="text.secondary">
              {resumen.total} registrados · {fmtCortoCOP(resumen.facturado)} facturado histórico
              {resumen.conDeuda > 0 && ` · ${resumen.conDeuda} con saldo pendiente`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<Download />} onClick={exportar}>Excel</Button>
            <Button
              variant="contained" startIcon={<Add />}
              onClick={() => setDlg({ abierto: true, item: null })}
              sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
            >
              Registrar cliente
            </Button>
          </Stack>
        </Stack>

        {resumen.deuda > 0 && (
          <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}
            action={<Button size="small" onClick={() => { setSoloDeudores(true); setOrden('deuda') }}>
              Ver deudores
            </Button>}>
            Hay <strong>{fmtCOP(resumen.deuda)}</strong> por cobrar repartidos
            en {resumen.conDeuda} cliente(s).
          </Alert>
        )}

        <Card sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              size="small" placeholder="Buscar por nombre, teléfono, documento o barrio…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              sx={{ flex: 1, minWidth: 260 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            />
            <TextField
              select size="small" label="Ordenar por" sx={{ minWidth: 190 }}
              value={orden} onChange={e => setOrden(e.target.value)}
            >
              {ORDENES.map(o => <MenuItem key={o.valor} value={o.valor}>{o.label}</MenuItem>)}
            </TextField>
            <FormControlLabel
              control={<Switch size="small" checked={soloDeudores}
                onChange={e => setSoloDeudores(e.target.checked)} />}
              label={<Typography variant="body2">Solo con saldo</Typography>}
            />
          </Stack>
        </Card>

        <Card>
          {isLoading && <LinearProgress />}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Contacto</TableCell>
                <TableCell align="right">Citas</TableCell>
                <TableCell align="right">Gastado</TableCell>
                <TableCell align="right">Ticket</TableCell>
                <TableCell>Última visita</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {clientes.length === 0
                        ? 'Todavía no hay clientes registrados.'
                        : 'Ningún cliente coincide con el filtro.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {filtrados.map(c => {
                const dias = diasSin(c)
                const inactivo = c.activo === false
                return (
                  <TableRow key={c.id} hover sx={{ opacity: inactivo ? 0.55 : 1 }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{c.nombre}</Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption" color="text.secondary">{c.codigo}</Typography>
                        {c.barrio && (
                          <Tooltip title={c.direccion ?? c.barrio}>
                            <Chip
                              size="small" icon={<Place sx={{ fontSize: 11 }} />} label={c.barrio}
                              sx={{ height: 17, fontSize: 9.5 }}
                            />
                          </Tooltip>
                        )}
                        {(c.citas_no_asistio ?? 0) >= 2 && (
                          <Tooltip title={`${c.citas_no_asistio} inasistencias. Conviene pedirle confirmación o anticipo.`}>
                            <Chip
                              size="small" label={`${c.citas_no_asistio} no-show`}
                              sx={{ height: 17, fontSize: 9.5, bgcolor: alpha('#DC2626', 0.13), color: '#DC2626' }}
                            />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block">{c.telefono ?? '—'}</Typography>
                      {c.email && (
                        <Typography variant="caption" color="text.secondary" noWrap display="block"
                          sx={{ maxWidth: 160 }}>
                          {c.email}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{c.citas_completadas ?? 0}</Typography>
                      {(c.total_citas ?? 0) !== (c.citas_completadas ?? 0) && (
                        <Typography variant="caption" color="text.secondary">
                          de {c.total_citas}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {fmtCOP(c.total_gastado)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">{fmtCOP(c.ticket_promedio)}</Typography>
                    </TableCell>
                    <TableCell>
                      {c.ultima_visita ? (
                        <>
                          <Typography variant="caption" display="block">{fmtFecha(c.ultima_visita)}</Typography>
                          <Typography
                            variant="caption"
                            color={dias !== null && dias > 60 ? 'warning.main' : 'text.secondary'}
                          >
                            hace {dias} día{dias === 1 ? '' : 's'}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Sin visitas</Typography>
                      )}
                      {c.proxima_cita && (
                        <Typography variant="caption" color="primary.main" display="block">
                          próxima {fmtFecha(c.proxima_cita)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {(c.saldo_pendiente ?? 0) > 0 ? (
                        <Typography variant="body2" fontWeight={700} color="error.main">
                          {fmtCOP(c.saldo_pendiente)}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0} justifyContent="flex-end">
                        <Tooltip title="Historial">
                          <IconButton size="small" onClick={() => setHistorialDe(c)}>
                            <History fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Escribir por WhatsApp">
                          <IconButton size="small" onClick={() => abrirWhatsApp(c)}>
                            <WhatsApp fontSize="small" sx={{ color: c.telefono ? '#25D366' : undefined }} />
                          </IconButton>
                        </Tooltip>
                        <IconButton size="small" onClick={e => setMenu({ el: e.currentTarget, item: c })}>
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>

        <Menu open={Boolean(menu)} anchorEl={menu?.el} onClose={() => setMenu(null)}>
          <MenuItem onClick={() => { setDlg({ abierto: true, item: menu!.item }); setMenu(null) }}>
            <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
            <ListItemText>Editar cliente</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setHistorialDe(menu!.item); setMenu(null) }}>
            <ListItemIcon><History fontSize="small" /></ListItemIcon>
            <ListItemText>Ver historial</ListItemText>
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

        {/* ── Diálogo de cliente ── */}
        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })}
          maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {dlg.item ? `Editar ${dlg.item.nombre}` : 'Registrar cliente'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 7 }}>
                <TextField fullWidth size="small" label="Nombre completo" required autoFocus
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  fullWidth size="small" label="Teléfono" value={form.telefono}
                  onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                  helperText="Con este número se busca al cliente y se le recuerda la cita"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" label="Documento" value={form.documento}
                  onChange={e => setForm(f => ({ ...f, documento: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField fullWidth size="small" label="Correo" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth size="small" label="Dirección" value={form.direccion}
                  onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                  helperText="Se usa por defecto en los servicios a domicilio"
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField fullWidth size="small" label="Barrio" value={form.barrio}
                  onChange={e => setForm(f => ({ ...f, barrio: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField fullWidth size="small" label="Ciudad" value={form.ciudad}
                  onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField
                  type="date" fullWidth size="small" label="Cumpleaños"
                  value={form.fecha_nacimiento} InputLabelProps={{ shrink: true }}
                  onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 8 }}>
                <TextField
                  fullWidth size="small" label="¿Cómo nos conoció?"
                  placeholder="Instagram, recomendado, pasaba por el local…"
                  value={form.como_nos_conocio}
                  onChange={e => setForm(f => ({ ...f, como_nos_conocio: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth size="small" label="Notas" multiline rows={2} value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Alergias, tono de tinte, preferencias, detalles del inmueble…"
                />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={<Switch checked={form.acepta_recordatorios}
                    onChange={e => setForm(f => ({ ...f, acepta_recordatorios: e.target.checked }))} />}
                  label={<Typography variant="body2">Acepta recordatorios por WhatsApp</Typography>}
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
            <Button onClick={() => setDlg({ abierto: false, item: null })}>Cancelar</Button>
            <Button
              variant="contained" onClick={() => guardar.mutate()}
              disabled={!form.nombre.trim() || guardar.isPending}
              sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
            >
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Historial ── */}
        <Dialog open={Boolean(historialDe)} onClose={() => setHistorialDe(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            Historial de {historialDe?.nombre}
            {historialDe?.telefono && (
              <Typography variant="caption" color="text.secondary" display="block">
                {historialDe.telefono}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {[
                ['Citas', String(historial?.total_citas ?? 0)],
                ['Total gastado', fmtCOP(historial?.total_gastado)],
                ['Ticket promedio', fmtCOP(historial?.ticket_promedio)],
                ['Saldo pendiente', fmtCOP(historial?.saldo_pendiente)],
              ].map(([k, v]) => (
                <Grid key={k} size={{ xs: 6, md: 3 }}>
                  <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: alpha(AGS_COLOR, 0.06) }}>
                    <Typography variant="caption" color="text.secondary" display="block">{k}</Typography>
                    <Typography variant="subtitle1" fontWeight={800}>{v}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
              {historial?.servicio_favorito && (
                <Chip size="small" icon={<TrendingUp sx={{ fontSize: 14 }} />}
                  label={`Favorito: ${historial.servicio_favorito}`}
                  sx={{ bgcolor: alpha(AGS_COLOR, 0.12), color: AGS_COLOR }} />
              )}
              {historial?.dias_desde_ultima !== null && historial?.dias_desde_ultima !== undefined && (
                <Chip size="small" label={`Hace ${historial.dias_desde_ultima} días que no viene`} />
              )}
            </Stack>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Servicios</TableCell>
                  <TableCell>Atendió</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Pagado</TableCell>
                  <TableCell>Medio</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(historial?.citas ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Este cliente todavía no tiene citas.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {(historial?.citas ?? []).map(c => {
                  const est = estadoCita(c.estado)
                  return (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11.5 }}>{c.codigo}</TableCell>
                      <TableCell>{fmtFechaHora(c.fecha_inicio)}</TableCell>
                      <TableCell><Typography variant="caption">{c.servicios}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{c.profesional}</Typography></TableCell>
                      <TableCell align="right">{fmtCOP(c.total)}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="caption"
                          color={c.total_pagado < c.total ? 'error.main' : 'success.main'}
                        >
                          {fmtCOP(c.total_pagado)}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography variant="caption">{c.medio_pago ?? '—'}</Typography></TableCell>
                      <TableCell>
                        <Chip size="small" label={est.label}
                          sx={{
                            height: 19, fontSize: 10, fontWeight: 700,
                            bgcolor: alpha(est.color, 0.13), color: est.color,
                          }} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setHistorialDe(null)}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
