/**
 * Sugerencias de llantas: las reglas que las generan (Configuración) y lo que
 * sugieren para un vehículo según la última inspección de cada llanta.
 *
 * Una regla es «si se cumplen todas estas condiciones, sugerir este texto».
 * Los campos y operadores salen de una lista cerrada del servidor: una regla no
 * puede escribir código ni referirse a un dato que no existe. El texto admite
 * marcadores entre llaves ({posicion}, {profundidad}…).
 */
import { useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  MenuItem, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add, Delete, Edit, Lightbulb, ReportProblem } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { COLOR_MODULO } from '@/config/marca'

const COLOR = COLOR_MODULO
const BASE = '/eam/neumaticos/sugerencias'

interface Campo { campo: string; nombre: string; tipo: 'num' | 'texto'; unidad?: string | null; opciones?: string[] | null; operadores: string[] }
interface Catalogo { campos: Campo[]; tipos: string[]; tipos_novedad: Record<string, string>; marcadores: string[] }
interface Condicion { id?: number; campo: string; operador: string; valor: string }
interface Regla { id: number; nombre: string; tipo: string; prioridad: number; texto: string; activa: boolean; condiciones: Condicion[] }
type ReglaForm = Omit<Regla, 'id'> & { id?: number }

const TIPO: Record<string, string> = {
  ROTACION: 'Rotación', REENCAUCHE: 'Reencauche', RETIRO: 'Retiro', PRESION: 'Presión', ALINEACION: 'Alineación', OTRO: 'Otro',
}
const PRIORIDAD_COLOR = (p: number) => (p <= 1 ? '#DC2626' : p === 2 ? '#D97706' : '#64748B')
const VACIA: ReglaForm = { nombre: '', tipo: 'OTRO', prioridad: 3, texto: '', activa: true, condiciones: [{ campo: 'profundidad_minima', operador: '<=', valor: '' }] }

function mensaje(e: unknown) {
  const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof d === 'string' ? d : 'No se pudo guardar la regla'
}

// ─── Configuración ──────────────────────────────────────────────────────────

export function ReglasSugerencia() {
  const qc = useQueryClient()
  const { data: cat } = useQuery<Catalogo>({ queryKey: ['neu-sug-campos'], queryFn: () => api.get(`${BASE}/campos`).then(r => r.data), staleTime: Infinity })
  const { data: reglas = [] } = useQuery<Regla[]>({ queryKey: ['neu-sug-reglas'], queryFn: () => api.get(`${BASE}/reglas`).then(r => r.data) })
  const [form, setForm] = useState<ReglaForm | null>(null)
  const [previa, setPrevia] = useState<{ llantas_evaluadas: number; llantas_cumplen: number; ejemplos: string[] } | null>(null)

  const campo = (c: string) => cat?.campos.find(x => x.campo === c)
  const describir = (c: Condicion) => {
    const k = campo(c.campo)
    return `${k?.nombre ?? c.campo} ${c.operador} ${c.valor}${k?.unidad ? ` ${k.unidad}` : ''}`
  }
  const invalidar = () => { qc.invalidateQueries({ queryKey: ['neu-sug-reglas'] }); qc.invalidateQueries({ queryKey: ['neu-sug-vehiculo'] }) }

  const guardar = useMutation({
    mutationFn: (f: ReglaForm) => (f.id ? api.put(`${BASE}/reglas/${f.id}`, f) : api.post(`${BASE}/reglas`, f)),
    onSuccess: () => { toast.success('Regla guardada'); setForm(null); setPrevia(null); invalidar() },
    onError: e => toast.error(mensaje(e)),
  })
  const alternar = useMutation({
    mutationFn: (r: Regla) => api.put(`${BASE}/reglas/${r.id}`, { ...r, activa: !r.activa }),
    onSuccess: invalidar, onError: e => toast.error(mensaje(e)),
  })
  const borrar = useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/reglas/${id}`),
    onSuccess: () => { toast.success('Regla eliminada'); invalidar() },
  })
  const probar = useMutation({
    mutationFn: (f: ReglaForm) => api.post(`${BASE}/vista-previa`, f).then(r => r.data),
    onSuccess: setPrevia, onError: e => toast.error(mensaje(e)),
  })

  const cambiarCond = (i: number, cambio: Partial<Condicion>) => setForm(f => {
    if (!f) return f
    const condiciones = f.condiciones.map((c, j) => {
      if (j !== i) return c
      const nueva = { ...c, ...cambio }
      // Al cambiar de campo, el operador y el valor deben servir para el nuevo.
      if (cambio.campo) {
        const k = campo(cambio.campo)
        if (k && !k.operadores.includes(nueva.operador)) nueva.operador = k.operadores[0]
        nueva.valor = k?.opciones ? k.opciones[0] : ''
      }
      return nueva
    })
    return { ...f, condiciones }
  })

  return (
    <Card sx={{ bgcolor: '#FFFFFF' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} gap={1} flexWrap="wrap">
          <Stack direction="row" alignItems="center" gap={1}>
            <Lightbulb sx={{ color: COLOR }} /><Typography fontWeight={700}>Reglas de sugerencia</Typography>
          </Stack>
          <Button size="small" variant="contained" startIcon={<Add />} onClick={() => { setForm({ ...VACIA }); setPrevia(null) }}
            sx={{ bgcolor: COLOR, textTransform: 'none' }}>Nueva regla</Button>
        </Stack>
        <Typography fontSize={12} color="text.secondary" mb={1.5}>
          Se evalúan sobre la última inspección de cada llanta montada y aparecen en la vista del vehículo y en el informe PDF de flota.
          Una regla sugiere cuando se cumplen todas sus condiciones.
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow>{['Activa', 'Regla', 'Tipo', 'Prioridad', 'Condiciones', ''].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {reglas.map(r => (
                <TableRow key={r.id} hover sx={{ opacity: r.activa ? 1 : 0.55 }}>
                  <TableCell><Switch size="small" checked={r.activa} onChange={() => alternar.mutate(r)} inputProps={{ 'aria-label': `Activar ${r.nombre}` }} /></TableCell>
                  <TableCell>
                    <Typography fontSize={13} fontWeight={600}>{r.nombre}</Typography>
                    <Typography fontSize={11.5} color="text.secondary">{r.texto}</Typography>
                  </TableCell>
                  <TableCell><Chip size="small" label={TIPO[r.tipo] ?? r.tipo} /></TableCell>
                  <TableCell><Typography fontSize={12.5} fontWeight={700} color={PRIORIDAD_COLOR(r.prioridad)}>{r.prioridad}</Typography></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{r.condiciones.map(describir).join(' y ')}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" aria-label={`Editar ${r.nombre}`} onClick={() => { setForm({ ...r }); setPrevia(null) }}><Edit sx={{ fontSize: 16 }} /></IconButton>
                    <IconButton size="small" aria-label={`Eliminar ${r.nombre}`} onClick={() => { if (confirm(`¿Eliminar la regla «${r.nombre}»?`)) borrar.mutate(r.id) }}><Delete sx={{ fontSize: 16 }} /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {reglas.length === 0 && <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" py={2} fontSize={13}>No hay reglas.</Typography></TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box>
      </CardContent>

      <Dialog open={!!form} onClose={() => setForm(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>{form?.id ? 'Editar regla' : 'Nueva regla de sugerencia'}</DialogTitle>
        {form && (
          <DialogContent dividers>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Nombre" size="small" fullWidth value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField select label="Tipo" size="small" fullWidth value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  {(cat?.tipos ?? Object.keys(TIPO)).map(t => <MenuItem key={t} value={t}>{TIPO[t] ?? t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField select label="Prioridad" size="small" fullWidth value={form.prioridad} onChange={e => setForm({ ...form, prioridad: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5].map(p => <MenuItem key={p} value={p}>{p}{p === 1 ? ' · la más urgente' : ''}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Texto de la sugerencia" size="small" fullWidth multiline minRows={2} value={form.texto}
                  onChange={e => setForm({ ...form, texto: e.target.value })}
                  helperText={`Marcadores: ${(cat?.marcadores ?? []).slice(0, 8).map(m => `{${m}}`).join(' ')}…`} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography fontSize={13} fontWeight={700} mb={0.5}>Condiciones (todas deben cumplirse)</Typography>
                <Stack spacing={1}>
                  {form.condiciones.map((c, i) => {
                    const k = campo(c.campo)
                    return (
                      <Stack key={i} direction="row" gap={1} alignItems="center">
                        <TextField select size="small" label="Campo" value={c.campo} onChange={e => cambiarCond(i, { campo: e.target.value })} sx={{ flex: 2 }}>
                          {(cat?.campos ?? []).map(x => <MenuItem key={x.campo} value={x.campo}>{x.nombre}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" label="Operador" value={c.operador} onChange={e => cambiarCond(i, { operador: e.target.value })} sx={{ width: 100 }}>
                          {(k?.operadores ?? ['=']).map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                        {k?.opciones ? (
                          <TextField select size="small" label="Valor" value={c.valor} onChange={e => cambiarCond(i, { valor: e.target.value })} sx={{ flex: 1 }}>
                            {k.opciones.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                          </TextField>
                        ) : (
                          <TextField size="small" label={`Valor${k?.unidad ? ` (${k.unidad})` : ''}`} value={c.valor} onChange={e => cambiarCond(i, { valor: e.target.value })} sx={{ flex: 1 }} />
                        )}
                        <IconButton size="small" aria-label="Quitar condición" disabled={form.condiciones.length === 1}
                          onClick={() => setForm({ ...form, condiciones: form.condiciones.filter((_, j) => j !== i) })}><Delete sx={{ fontSize: 16 }} /></IconButton>
                      </Stack>
                    )
                  })}
                  <Box>
                    <Button size="small" startIcon={<Add />} sx={{ textTransform: 'none' }}
                      onClick={() => setForm({ ...form, condiciones: [...form.condiciones, { campo: 'profundidad_minima', operador: '<=', valor: '' }] })}>
                      Agregar condición
                    </Button>
                  </Box>
                </Stack>
              </Grid>
              {previa && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info">
                    Hoy la cumplen <b>{previa.llantas_cumplen.toLocaleString('es-CO')}</b> de {previa.llantas_evaluadas.toLocaleString('es-CO')} llantas
                    montadas con inspección.
                    {previa.ejemplos.map((e, i) => <Typography key={i} fontSize={12} mt={0.5}>· {e}</Typography>)}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => form && probar.mutate(form)} disabled={!form || probar.isPending} sx={{ textTransform: 'none', mr: 'auto' }}>
            {probar.isPending ? 'Calculando…' : 'Vista previa'}
          </Button>
          <Button onClick={() => setForm(null)}>Cancelar</Button>
          <Button variant="contained" disabled={!form || !form.nombre.trim() || !form.texto.trim() || guardar.isPending}
            onClick={() => form && guardar.mutate(form)} sx={{ bgcolor: COLOR }}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

/** Los dos umbrales de novedad que agrega el informe de flota. */
export function UmbralesNovedad() {
  const qc = useQueryClient()
  const { data } = useQuery<{ margen_alerta_profundidad?: number; diferencia_hombros?: number }>({
    queryKey: ['eam-neu-config'], queryFn: () => api.get('/eam/neumaticos/config').then(r => r.data),
  })
  const [v, setV] = useState<{ margen?: string; hombros?: string }>({})
  const guardar = useMutation({
    mutationFn: () => api.put('/eam/neumaticos/config', {
      margen_alerta_profundidad: Number(v.margen ?? data?.margen_alerta_profundidad),
      diferencia_hombros: Number(v.hombros ?? data?.diferencia_hombros),
    }),
    onSuccess: () => { toast.success('Umbrales guardados'); setV({}); qc.invalidateQueries({ queryKey: ['eam-neu-config'] }) },
  })
  return (
    <Card sx={{ bgcolor: '#FFFFFF' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1} mb={1}>
          <ReportProblem sx={{ color: COLOR }} /><Typography fontWeight={700}>Umbrales de novedad</Typography>
        </Stack>
        <Typography fontSize={12} color="text.secondary" mb={1.5}>Con qué se marcan las novedades del informe de flota, además de la profundidad mínima, el rango de presión y la desalineación.</Typography>
        <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
          <TextField size="small" type="number" label="Cerca del mínimo: margen (mm)" sx={{ width: 230 }}
            value={v.margen ?? data?.margen_alerta_profundidad ?? ''} onChange={e => setV({ ...v, margen: e.target.value })} />
          <TextField size="small" type="number" label="Desgaste irregular entre hombros (mm)" sx={{ width: 270 }}
            value={v.hombros ?? data?.diferencia_hombros ?? ''} onChange={e => setV({ ...v, hombros: e.target.value })} />
          <Button size="small" variant="outlined" disabled={!Object.keys(v).length || guardar.isPending} onClick={() => guardar.mutate()} sx={{ textTransform: 'none' }}>Guardar</Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ─── Vista del vehículo ─────────────────────────────────────────────────────

interface DelVehiculo {
  novedades: { neumatico_id: number; posicion: string; tipo: string; nombre: string; texto: string }[]
  sugerencias: { neumatico_id: number; posicion: string; regla_id: number; regla: string; tipo: string; prioridad: number; texto: string; valores: Record<string, unknown> }[]
}

export function SugerenciasVehiculo({ activoId }: { activoId: number }) {
  const { data } = useQuery<DelVehiculo>({
    queryKey: ['neu-sug-vehiculo', activoId],
    queryFn: () => api.get(`${BASE}/vehiculo/${activoId}`).then(r => r.data),
  })
  const { data: cat } = useQuery<Catalogo>({ queryKey: ['neu-sug-campos'], queryFn: () => api.get(`${BASE}/campos`).then(r => r.data), staleTime: Infinity })
  if (!data) return null
  const nombre = (c: string) => cat?.campos.find(x => x.campo === c)?.nombre ?? c
  return (
    <Card sx={{ bgcolor: '#FFFFFF' }} aria-label="Sugerencias del vehículo">
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1} mb={1}>
          <Lightbulb sx={{ color: COLOR }} /><Typography fontWeight={700}>Sugerencias según la última inspección</Typography>
        </Stack>
        {data.sugerencias.length === 0 && <Typography fontSize={12.5} color="text.secondary">Sin sugerencias para este vehículo.</Typography>}
        <Stack spacing={0.75}>
          {data.sugerencias.map((s, i) => (
            <Tooltip key={i} placement="top-start" title={
              <Box>
                <Typography fontSize={12} fontWeight={700}>Regla: {s.regla}</Typography>
                {Object.entries(s.valores).map(([k, v]) => <Typography key={k} fontSize={11.5}>{nombre(k)}: {String(v)}</Typography>)}
              </Box>
            }>
              <Stack direction="row" gap={1} alignItems="flex-start" sx={{ p: 0.75, borderRadius: 1.5, bgcolor: alpha(PRIORIDAD_COLOR(s.prioridad), 0.06) }}>
                <Chip size="small" label={TIPO[s.tipo] ?? s.tipo} sx={{ height: 20, fontSize: 10.5, bgcolor: alpha(PRIORIDAD_COLOR(s.prioridad), 0.15), color: PRIORIDAD_COLOR(s.prioridad), fontWeight: 700 }} />
                <Typography fontSize={12.5}>{s.texto}</Typography>
              </Stack>
            </Tooltip>
          ))}
        </Stack>
        {data.novedades.length > 0 && (
          <>
            <Typography fontWeight={700} fontSize={13} mt={2} mb={0.5}>Novedades</Typography>
            <Stack direction="row" gap={0.75} flexWrap="wrap">
              {data.novedades.map((n, i) => (
                <Tooltip key={i} title={n.texto}><Chip size="small" variant="outlined" label={`${n.posicion} · ${n.nombre}`} /></Tooltip>
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  )
}
