/**
 * Disposición final de llantas: el examen de la carcasa que se desecha.
 *
 *  - CatalogoDanosDisposicion: los códigos de daño de la cuenta, con ubicación,
 *    avería, causa, motivo y responsable (y el catálogo de referencia de 40
 *    códigos para empezar).
 *  - DialogoDisposicion: registra la disposición de una llanta —con
 *    seguimiento o no— con sus profundidades y fotos.
 *  - ListaDisposiciones: la pila examinada, con búsqueda y la ficha de cada una.
 *  - FotosLlanta: las fotos de una llanta, para su historial.
 *
 * La baja, el cierre de la vida y las validaciones las hace el servidor.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableHead, TablePagination,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add, AddAPhoto, DeleteForever, PhotoLibrary, Recycling, Search } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { CargueMasivo } from '@/components/catalogo/CargueMasivo'
import { mensajeDeError } from '@/utils/errorApi'

const B = '/eam/neumaticos/disposicion'
const ROJO = '#B91C1C'

export interface DanoLlanta {
  id: number; codigo: string; nombre: string; severidad: string; accion: string; descripcion?: string | null
  ubicacion?: string | null; categoria?: string | null; causa?: string | null; motivo?: string | null
  responsable?: string | null
}
interface FotoLlanta { id: number; tipo: string; nombre?: string | null; fecha?: string | null; registrado_por?: string | null }
interface FilaDisposicion {
  id: number; neumatico_id: number; fecha: string; codigo: string; marca?: string | null; referencia?: string | null
  medida?: string | null; vida: number; origen: string; dano_codigo?: string | null; dano?: string | null
  ubicacion_dano?: string | null; responsable?: string | null; profundidad_minima?: number | null
  reparaciones?: number | null; fotos: number
}
interface FichaDisposicion extends FilaDisposicion {
  dot?: string | null; km_total?: number | null; categoria?: string | null; causa?: string | null; motivo?: string | null
  profundidad_interna?: number | null; profundidad_central?: number | null; profundidad_externa?: number | null
  regrabada?: boolean; diseno_reencauche?: string | null; ubicacion_actual?: string | null; rechazo?: string | null
  observaciones?: string | null; registrado_por?: string | null; fotos_detalle?: FotoLlanta[]
}

const TIPOS_FOTO: Record<string, string> = { NUMERO: 'Número de la llanta', DANO: 'Daño', BANDA: 'Banda de rodamiento', OTRA: 'Otra' }
const hoy = () => new Date().toISOString().slice(0, 10)
const fechaCorta = (v?: string | null) => v ? new Date(v).toLocaleDateString('es-CO') : '—'
const vida = (r: number) => r === 0 ? 'Original' : `R${r}`

export const useDanosLlanta = () => useQuery<DanoLlanta[]>({
  queryKey: ['eam-danos-neu'], queryFn: () => api.get('/eam/neumaticos/danos-catalogo').then(r => r.data),
})

/* ── Catálogo de daños ─────────────────────────────────────────────────────── */
const VACIO = { codigo: '', nombre: '', ubicacion: '', categoria: '', causa: '', motivo: '', responsable: '', severidad: 'GRAVE', accion: 'DESCARTE' }

export function CatalogoDanosDisposicion() {
  const qc = useQueryClient()
  const { data: danos = [] } = useDanosLlanta()
  const [form, setForm] = useState(VACIO)
  const [filtro, setFiltro] = useState('')
  const refrescar = () => qc.invalidateQueries({ queryKey: ['eam-danos-neu'] })
  const crear = useMutation({
    mutationFn: () => api.post('/eam/neumaticos/danos-catalogo', form),
    onSuccess: () => { toast.success('Código de daño agregado'); setForm(VACIO); refrescar() },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const borrar = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/danos-catalogo/${id}`),
    onSuccess: () => { toast.success('Código eliminado'); refrescar() },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo eliminar: puede estar en uso')),
  })
  const referencia = useMutation({
    mutationFn: () => api.post(`${B}/catalogo-referencia`).then(r => r.data),
    onSuccess: (r: any) => { toast.success(r.agregados ? `Se agregaron ${r.agregados} códigos` : 'Ya tenía todos los códigos de referencia'); refrescar() },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const visibles = useMemo(() => {
    const t = filtro.trim().toLowerCase()
    return t ? danos.filter(d => [d.codigo, d.nombre, d.ubicacion, d.categoria, d.causa, d.responsable]
      .some(x => (x ?? '').toLowerCase().includes(t))) : danos
  }, [danos, filtro])
  const campo = (k: keyof typeof VACIO, label: string, md = 2) => (
    <Grid size={{ xs: 6, md }}>
      <TextField label={label} size="small" fullWidth value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
    </Grid>
  )

  return (
    <Card sx={{ bgcolor: '#FFFFFF' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1} mb={1.5}>
          <Recycling sx={{ color: ROJO }} />
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={700}>Catálogo de daños · disposición final</Typography>
            <Typography variant="caption" color="text.secondary">
              Cada código dice dónde está el daño, qué avería es, su causa, el motivo y el responsable: con eso se
              arma el tablero de la pila de desechos.
            </Typography>
          </Box>
          <Button size="small" variant="outlined" disabled={referencia.isPending} onClick={() => referencia.mutate()}
            sx={{ textTransform: 'none' }}>
            Cargar catálogo de referencia (40 códigos)
          </Button>
        </Stack>
        <Grid container spacing={1} mb={1.5}>
          {campo('codigo', 'Código', 1.5)}
          {campo('nombre', 'Descripción', 2.5)}
          {campo('ubicacion', 'Ubicación del daño')}
          {campo('categoria', 'Avería')}
          {campo('causa', 'Causa')}
          {campo('motivo', 'Motivo', 1)}
          {campo('responsable', 'Responsable', 1)}
          <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="small" variant="contained" startIcon={<Add />} disabled={!form.codigo.trim() || !form.nombre.trim() || crear.isPending}
              onClick={() => crear.mutate()} sx={{ textTransform: 'none' }}>Agregar código</Button>
          </Grid>
        </Grid>
        <TextField size="small" placeholder="Buscar código, ubicación, causa…" value={filtro} onChange={e => setFiltro(e.target.value)}
          InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> }} sx={{ mb: 1, minWidth: 280 }} />
        <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>{['Código', 'Descripción', 'Ubicación', 'Avería', 'Causa', 'Motivo', 'Responsable', ''].map(h =>
                <TableCell key={h} sx={{ fontWeight: 700, bgcolor: '#FFFFFF' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {visibles.map(d => (
                <TableRow key={d.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{d.codigo}</TableCell>
                  <TableCell>{d.nombre}</TableCell>
                  <TableCell>{d.ubicacion ?? '—'}</TableCell>
                  <TableCell>{d.categoria ?? '—'}</TableCell>
                  <TableCell>{d.causa ?? '—'}</TableCell>
                  <TableCell>{d.motivo ?? '—'}</TableCell>
                  <TableCell>{d.responsable ?? '—'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" aria-label={`Eliminar ${d.codigo}`} onClick={() => borrar.mutate(d.id)}>
                      <DeleteForever sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {visibles.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={1}>
                    {danos.length ? 'Ningún código coincide.' : 'Sin códigos: cargue el catálogo de referencia o agréguelos.'}
                  </Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </CardContent>
    </Card>
  )
}

/* ── Fotos (carga con sesión, se muestran como blob) ───────────────────────── */
function Miniatura({ foto, onBorrar, alto = 96 }: { foto: FotoLlanta; onBorrar?: () => void; alto?: number }) {
  const [url, setUrl] = useState<string | null>(null)
  const [abierta, setAbierta] = useState(false)
  useEffect(() => {
    let vivo = true
    let creada: string | null = null
    api.get(`${B}/fotos/${foto.id}/archivo`, { responseType: 'blob' })
      .then(r => { if (vivo) { creada = URL.createObjectURL(r.data as Blob); setUrl(creada) } })
      .catch(() => {})
    return () => { vivo = false; if (creada) URL.revokeObjectURL(creada) }
  }, [foto.id])
  return (
    <Box sx={{ position: 'relative', width: alto * 1.3, height: alto, borderRadius: 1.5, overflow: 'hidden', bgcolor: '#F1F5F9', flexShrink: 0 }}>
      {url && (
        <Box component="img" src={url} alt={TIPOS_FOTO[foto.tipo] ?? 'Foto'} onClick={() => setAbierta(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
      )}
      <Chip size="small" label={TIPOS_FOTO[foto.tipo] ?? foto.tipo}
        sx={{ position: 'absolute', left: 4, bottom: 4, height: 18, fontSize: 10, bgcolor: 'rgba(15,23,42,0.72)', color: '#fff' }} />
      {onBorrar && (
        <IconButton size="small" aria-label="Eliminar foto" onClick={onBorrar}
          sx={{ position: 'absolute', right: 2, top: 2, bgcolor: 'rgba(255,255,255,0.85)', p: 0.25 }}>
          <DeleteForever sx={{ fontSize: 15, color: ROJO }} />
        </IconButton>
      )}
      <Dialog open={abierta} onClose={() => setAbierta(false)} maxWidth="lg">
        {url && <Box component="img" src={url} alt={TIPOS_FOTO[foto.tipo] ?? 'Foto'} sx={{ maxWidth: '90vw', maxHeight: '85vh', display: 'block' }} />}
      </Dialog>
    </Box>
  )
}

function SubirFotos({ neumaticoId, onListo }: { neumaticoId: number; onListo: () => void }) {
  const [tipo, setTipo] = useState('DANO')
  const subir = useMutation({
    mutationFn: (archivos: FileList) => {
      const fd = new FormData()
      Array.from(archivos).forEach(a => fd.append('archivos', a))
      fd.append('tipo', tipo)
      return api.post(`${B}/llanta/${neumaticoId}/fotos`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 })
    },
    onSuccess: () => { toast.success('Foto(s) guardada(s)'); onListo() },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <TextField select size="small" label="Qué muestra" value={tipo} onChange={e => setTipo(e.target.value)} sx={{ minWidth: 190 }}>
        {Object.entries(TIPOS_FOTO).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
      </TextField>
      <Button component="label" size="small" variant="outlined" startIcon={<AddAPhoto />} disabled={subir.isPending} sx={{ textTransform: 'none' }}>
        {subir.isPending ? 'Subiendo…' : 'Agregar fotos'}
        <input hidden type="file" accept="image/*" multiple
          onChange={e => { if (e.target.files?.length) subir.mutate(e.target.files); e.target.value = '' }} />
      </Button>
    </Stack>
  )
}

/** Las fotos de una llanta y su disposición final, para el historial. */
export function FotosLlanta({ neumaticoId, editable = true }: { neumaticoId: number; editable?: boolean }) {
  const qc = useQueryClient()
  const { data } = useQuery<{ disposicion: FichaDisposicion | null; fotos: FotoLlanta[] }>({
    queryKey: ['eam-neu-fotos', neumaticoId], queryFn: () => api.get(`${B}/llanta/${neumaticoId}`).then(r => r.data),
  })
  const refrescar = () => qc.invalidateQueries({ queryKey: ['eam-neu-fotos', neumaticoId] })
  const borrar = useMutation({
    mutationFn: (id: number) => api.delete(`${B}/fotos/${id}`),
    onSuccess: refrescar, onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const d = data?.disposicion
  return (
    <Stack spacing={1.25}>
      {d && (
        <Alert severity="error" icon={<Recycling />}>
          <Typography variant="body2" fontWeight={800}>
            Disposición final el {fechaCorta(d.fecha)}{d.dano_codigo ? ` · ${d.dano_codigo} ${d.dano ?? ''}` : ''}
          </Typography>
          <Typography variant="caption" display="block">
            {[d.ubicacion_dano && `Ubicación: ${d.ubicacion_dano}`, d.causa && `Causa: ${d.causa}`,
              d.responsable && `Responsable: ${d.responsable}`,
              [d.profundidad_interna, d.profundidad_central, d.profundidad_externa].some(v => v != null)
                && `Profundidades I/C/E: ${[d.profundidad_interna, d.profundidad_central, d.profundidad_externa].map(v => v ?? '—').join(' / ')} mm`,
              d.reparaciones != null && `${d.reparaciones} reparación(es)`, d.regrabada && 'Regrabada',
              d.ubicacion_actual && `Está en: ${d.ubicacion_actual}`, d.observaciones].filter(Boolean).join(' · ')}
          </Typography>
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
        {(data?.fotos ?? []).map(f => (
          <Miniatura key={f.id} foto={f} onBorrar={editable ? () => borrar.mutate(f.id) : undefined} />
        ))}
        {(data?.fotos ?? []).length === 0 && (
          <Typography variant="caption" color="text.secondary">Sin fotos de esta llanta.</Typography>
        )}
      </Stack>
      {editable && <SubirFotos neumaticoId={neumaticoId} onListo={refrescar} />}
    </Stack>
  )
}

/* ── Registro ──────────────────────────────────────────────────────────────── */
interface LlantaBuscada { id: number; codigo: string; marca?: string | null; referencia?: string | null; medida?: string | null; estado?: string | null; reencauches?: number | null }

export function DialogoDisposicion({ onCerrar, onListo }: { onCerrar: () => void; onListo: () => void }) {
  const { data: danos = [] } = useDanosLlanta()
  const [texto, setTexto] = useState('')
  const [llanta, setLlanta] = useState<LlantaBuscada | null>(null)
  const [form, setForm] = useState({
    fecha: hoy(), dano_id: '' as number | '', profundidad_interna: '', profundidad_central: '', profundidad_externa: '',
    reparaciones: '', regrabada: false, diseno_reencauche: '', ubicacion_actual: '', rechazo: '', observaciones: '',
    marca: '', referencia: '', medida: '', dot: '', reencauches: '0',
  })
  const [creada, setCreada] = useState<FichaDisposicion | null>(null)
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))

  const { data: opciones = [] } = useQuery<LlantaBuscada[]>({
    queryKey: ['eam-neu-buscar-disp', texto],
    queryFn: () => api.get('/eam/neumaticos', { params: { busqueda: texto, limite: 15 } }).then(r => r.data),
    enabled: texto.trim().length >= 2,
  })
  const nueva = !llanta && texto.trim().length > 0
  const dano = danos.find(d => d.id === form.dano_id)
  const numero = (v: string) => v === '' ? null : Number(v.replace(',', '.'))
  const malas = ['profundidad_interna', 'profundidad_central', 'profundidad_externa']
    .filter(k => (form as any)[k] !== '' && !(Number((form as any)[k]) >= 0 && Number((form as any)[k]) <= 40))
  const errores = (!llanta && !texto.trim()) || !form.dano_id || form.fecha > hoy() || malas.length > 0

  const guardar = useMutation({
    mutationFn: () => api.post(B, {
      neumatico_id: llanta?.id ?? null, codigo: llanta ? null : texto.trim(),
      fecha: `${form.fecha}T08:00:00`, dano_id: form.dano_id || null,
      profundidad_interna: numero(form.profundidad_interna), profundidad_central: numero(form.profundidad_central),
      profundidad_externa: numero(form.profundidad_externa), reparaciones: form.reparaciones === '' ? null : Number(form.reparaciones),
      regrabada: form.regrabada, diseno_reencauche: form.diseno_reencauche || null, ubicacion_actual: form.ubicacion_actual || null,
      rechazo: form.rechazo || null, observaciones: form.observaciones || null,
      ...(nueva ? { marca: form.marca || null, referencia: form.referencia || null, medida: form.medida || null,
        dot: form.dot || null, reencauches: Number(form.reencauches) || 0 } : {}),
    }).then(r => r.data as FichaDisposicion),
    onSuccess: d => { toast.success(`Disposición final de la llanta ${d.codigo} registrada`); setCreada(d); onListo() },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  return (
    <Dialog open onClose={onCerrar} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Disposición final de una llanta
        <Typography variant="caption" display="block" color="text.secondary">
          Si la llanta tiene seguimiento se da de baja y se cierra su vida; si no existe, se crea ya dada de baja.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {creada ? (
          <Stack spacing={2}>
            <Alert severity="success">
              Llanta {creada.codigo} · {creada.marca ?? ''} {creada.referencia ?? ''} · {creada.dano_codigo} {creada.dano}.
              Agregue ahora las fotos del número, del daño y de la banda.
            </Alert>
            <FotosLlanta neumaticoId={creada.neumatico_id} />
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Autocomplete
              freeSolo options={opciones} value={llanta}
              getOptionLabel={o => typeof o === 'string' ? o : `${o.codigo} · ${o.marca ?? ''} ${o.referencia ?? ''} ${o.medida ?? ''} (${o.estado ?? ''})`}
              onInputChange={(_, v) => { setTexto(v); if (llanta && v !== llanta.codigo) setLlanta(null) }}
              onChange={(_, v) => setLlanta(v && typeof v !== 'string' ? v : null)}
              renderInput={p => <TextField {...p} size="small" label="Código de la llanta" required
                helperText={llanta ? `Con seguimiento: ${llanta.estado === 'BAJA' ? 'ya está dada de baja' : 'se dará de baja'}`
                  : nueva ? 'No está en el sistema: se creará dada de baja con los datos de abajo' : 'Escriba al menos 2 caracteres'} />} />
            {nueva && (
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6, md: 3 }}><TextField size="small" fullWidth label="Marca" value={form.marca} onChange={e => set('marca', e.target.value)} /></Grid>
                <Grid size={{ xs: 6, md: 3 }}><TextField size="small" fullWidth label="Referencia" value={form.referencia} onChange={e => set('referencia', e.target.value)} /></Grid>
                <Grid size={{ xs: 6, md: 2 }}><TextField size="small" fullWidth label="Dimensión" value={form.medida} onChange={e => set('medida', e.target.value)} /></Grid>
                <Grid size={{ xs: 3, md: 2 }}><TextField size="small" fullWidth label="DOT" value={form.dot} onChange={e => set('dot', e.target.value)} /></Grid>
                <Grid size={{ xs: 3, md: 2 }}><TextField size="small" fullWidth type="number" label="Vida (reenc.)" value={form.reencauches} onChange={e => set('reencauches', e.target.value)} inputProps={{ min: 0 }} /></Grid>
              </Grid>
            )}
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField size="small" fullWidth type="date" label="Fecha" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                  InputLabelProps={{ shrink: true }} inputProps={{ max: hoy() }} error={form.fecha > hoy()} />
              </Grid>
              <Grid size={{ xs: 12, md: 9 }}>
                <TextField select size="small" fullWidth required label="Código de daño" value={form.dano_id}
                  onChange={e => set('dano_id', Number(e.target.value) || '')}
                  helperText={dano ? [dano.ubicacion, dano.categoria, dano.causa, dano.responsable && `responsable ${dano.responsable}`].filter(Boolean).join(' · ')
                    : danos.length ? 'Del catálogo de daños de la cuenta' : 'Configure el catálogo de daños en Configuración'}>
                  {danos.map(d => <MenuItem key={d.id} value={d.id}>{d.codigo} · {d.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              {([['profundidad_interna', 'Interna mm'], ['profundidad_central', 'Central mm'], ['profundidad_externa', 'Externa mm']] as const).map(([k, l]) => (
                <Grid key={k} size={{ xs: 4, md: 2 }}>
                  <TextField size="small" fullWidth type="number" label={l} value={form[k]} onChange={e => set(k, e.target.value)}
                    error={malas.includes(k)} inputProps={{ min: 0, max: 40, step: 'any' }} />
                </Grid>
              ))}
              <Grid size={{ xs: 6, md: 2 }}>
                <TextField size="small" fullWidth type="number" label="Reparaciones" value={form.reparaciones} onChange={e => set('reparaciones', e.target.value)} inputProps={{ min: 0 }} />
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <TextField size="small" fullWidth label="Diseño de reencauche" value={form.diseno_reencauche} onChange={e => set('diseno_reencauche', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField size="small" fullWidth label="Ubicación actual de la carcasa" value={form.ubicacion_actual} onChange={e => set('ubicacion_actual', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField size="small" fullWidth label="Rechazo (quién / por qué)" value={form.rechazo} onChange={e => set('rechazo', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel control={<Switch checked={form.regrabada} onChange={e => set('regrabada', e.target.checked)} />} label="Fue regrabada" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField size="small" fullWidth multiline minRows={2} label="Observaciones" value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
              </Grid>
            </Grid>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>{creada ? 'Cerrar' : 'Cancelar'}</Button>
        {!creada && (
          <Button variant="contained" disabled={errores || guardar.isPending} onClick={() => guardar.mutate()}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: ROJO, '&:hover': { bgcolor: '#7F1D1D' } }}>
            {guardar.isPending ? 'Registrando…' : 'Registrar disposición'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

/* ── Cargue masivo (históricos, como el formulario de campo) ─────────────── */
function CargueDisposicion({ onListo }: { onListo: () => void }) {
  const { data } = useQuery({
    queryKey: ['eam-neu-disp-plantilla'], queryFn: () => api.get(`${B}/importar/plantilla`).then(r => r.data),
  })
  if (!data) return null
  return (
    <Box mb={2}>
      <CargueMasivo compacto titulo={data.titulo} nombreArchivo="plantilla-disposicion-final" columnas={data.columnas}
        color={ROJO} onListo={onListo}
        onImportar={async filas => {
          // Por trozos: cada fila puede dar de baja una llanta y cerrar su vida.
          const total = { creados: 0, omitidos: 0, errores: [] as { fila: number; motivo: string }[] }
          for (let i = 0; i < filas.length; i += 300) {
            const r = (await api.post(`${B}/importar`, { filas: filas.slice(i, i + 300) }, { timeout: 600_000 })).data
            total.creados += r.creados; total.omitidos += r.omitidos
            total.errores.push(...r.errores.map((e: any) => ({ ...e, fila: e.fila + i })))
          }
          return { ...total, total: filas.length }
        }} />
    </Box>
  )
}

/* ── Lista ─────────────────────────────────────────────────────────────────── */
export function ListaDisposiciones({ desde, hasta }: { desde?: string; hasta?: string }) {
  const qc = useQueryClient()
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(0)
  const [porPagina, setPorPagina] = useState(25)
  const [registrar, setRegistrar] = useState(false)
  const [importar, setImportar] = useState(false)
  const [ver, setVer] = useState<FilaDisposicion | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['eam-neu-disposiciones', buscar, pagina, porPagina, desde, hasta],
    queryFn: () => api.get<FilaDisposicion[]>(B, { params: { buscar: buscar || undefined, desde: desde || undefined, hasta: hasta || undefined,
      limite: porPagina, desplazamiento: pagina * porPagina } })
      .then(r => ({ filas: r.data, total: Number(r.headers['x-total-count'] ?? r.data.length) })),
    placeholderData: p => p,
  })
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['eam-neu-disposiciones'] })
    qc.invalidateQueries({ queryKey: ['eam-neu-tablero-descarte'] })
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1} alignItems={{ md: 'center' }} mb={1.5}>
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={800} fontSize={15}>Disposición final</Typography>
            <Typography variant="caption" color="text.secondary">
              El examen de cada carcasa desechada: daño, profundidades, reparaciones y fotos.
            </Typography>
          </Box>
          <TextField size="small" placeholder="Llanta, marca, referencia o daño" value={buscar}
            onChange={e => { setBuscar(e.target.value); setPagina(0) }} sx={{ minWidth: 240 }}
            InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> }} />
          <Button size="small" variant="outlined" onClick={() => setImportar(v => !v)} sx={{ textTransform: 'none' }}>Cargue masivo</Button>
          <Button size="small" variant="contained" startIcon={<Recycling />} onClick={() => setRegistrar(true)}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: ROJO, '&:hover': { bgcolor: '#7F1D1D' } }}>Registrar disposición</Button>
        </Stack>
        {importar && <CargueDisposicion onListo={refrescar} />}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>{['Fecha', 'Llanta', 'Marca · referencia', 'Medida', 'Vida', 'Daño', 'Ubicación', 'Responsable', 'Prof. mín.', 'Fotos'].map(h =>
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11.5 }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {(data?.filas ?? []).map(f => (
                <TableRow key={f.id} hover sx={{ cursor: 'pointer' }} onClick={() => setVer(f)}>
                  <TableCell>{fechaCorta(f.fecha)}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{f.codigo}</TableCell>
                  <TableCell>{[f.marca, f.referencia].filter(Boolean).join(' · ') || '—'}</TableCell>
                  <TableCell>{f.medida ?? '—'}</TableCell>
                  <TableCell>{vida(f.vida)}</TableCell>
                  <TableCell><Tooltip title={f.dano ?? ''}><span><b>{f.dano_codigo ?? '—'}</b></span></Tooltip></TableCell>
                  <TableCell>{f.ubicacion_dano ?? '—'}</TableCell>
                  <TableCell>{f.responsable ?? '—'}</TableCell>
                  <TableCell>{f.profundidad_minima != null ? `${f.profundidad_minima} mm` : '—'}</TableCell>
                  <TableCell>{f.fotos ? <Chip size="small" icon={<PhotoLibrary sx={{ fontSize: 14 }} />} label={f.fotos} /> : '—'}</TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.filas ?? []).length === 0 && (
                <TableRow><TableCell colSpan={10} align="center">
                  <Typography color="text.secondary" py={1.5}>{buscar ? 'Ninguna disposición coincide.' : 'Todavía no hay disposiciones registradas.'}</Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        <TablePagination component="div" count={data?.total ?? 0} page={pagina} rowsPerPage={porPagina}
          onPageChange={(_, p) => setPagina(p)} onRowsPerPageChange={e => { setPorPagina(Number(e.target.value)); setPagina(0) }}
          rowsPerPageOptions={[25, 50, 100]} labelRowsPerPage="Por página" />
      </CardContent>
      {registrar && <DialogoDisposicion onCerrar={() => setRegistrar(false)} onListo={refrescar} />}
      {ver && (
        <Dialog open onClose={() => setVer(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            Llanta {ver.codigo}
            <Typography variant="caption" display="block" color="text.secondary">
              {[ver.marca, ver.referencia, ver.medida, vida(ver.vida)].filter(Boolean).join(' · ')}
            </Typography>
          </DialogTitle>
          <DialogContent dividers><FotosLlanta neumaticoId={ver.neumatico_id} /></DialogContent>
          <DialogActions><Button onClick={() => { setVer(null); refrescar() }} sx={{ textTransform: 'none' }}>Cerrar</Button></DialogActions>
        </Dialog>
      )}
    </Card>
  )
}
