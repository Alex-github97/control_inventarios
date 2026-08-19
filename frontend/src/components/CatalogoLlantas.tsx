import { useState } from 'react'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, IconButton, Chip,
  Table, TableHead, TableBody, TableRow, TableCell, Card, CardContent, Alert, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add as AddIcon, DeleteForever, Straighten } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'

export interface MarcaNeu { id: number; nombre: string; ambito: string }
export interface DimensionNeu { id: number; nombre: string; ambito: string }
export interface ReferenciaNeu { id: number; marca_id: number; nombre: string; ambito: string; tipo_uso?: string | null; marca_nombre?: string | null }
export interface ReferenciaDimension {
  id: number; referencia_id: number; dimension_id: number; dimension_nombre?: string | null
  profundidad_inicial: number; profundidad_minima?: number | null
  vida_util_km?: number | null; presion_recomendada?: number | null
}

const TIPOS_USO = ['DIRECCIONAL', 'TRACCION', 'REMOLQUE', 'MULTIPOSICION', 'REPUESTO']

/**
 * Administra el catálogo jerárquico que alimenta la creación de llantas y de
 * bandas de reencauche: marca → referencia → (referencia + dimensión) →
 * profundidad inicial. La profundidad vive en la combinación referencia+dimensión
 * porque una misma referencia calza distinto según la medida.
 *
 * `ambito`: 'LLANTA' para llantas, 'BANDA' para bandas de reencauche.
 */
export function CatalogoLlantas({ ambito, color, colorDark }: { ambito: 'LLANTA' | 'BANDA'; color: string; colorDark: string }) {
  const qc = useQueryClient()
  const etiqueta = ambito === 'LLANTA' ? 'llantas' : 'bandas de reencauche'

  const [marcaForm, setMarcaForm] = useState('')
  const [dimForm, setDimForm] = useState('')
  const [refForm, setRefForm] = useState({ marca_id: '', nombre: '', tipo_uso: '' })
  const [refSel, setRefSel] = useState<ReferenciaNeu | null>(null)
  const [rdForm, setRdForm] = useState({ dimension_id: '', profundidad_inicial: '', profundidad_minima: '', vida_util_km: '', presion_recomendada: '' })

  const claves = {
    marcas: ['eam-cat-marcas', ambito],
    dims: ['eam-cat-dimensiones', ambito],
    refs: ['eam-cat-referencias', ambito],
    rd: ['eam-cat-ref-dim', refSel?.id],
  }

  const { data: marcas = [] } = useQuery<MarcaNeu[]>({
    queryKey: claves.marcas,
    queryFn: () => api.get('/eam/neumaticos/catalogo/marcas', { params: { ambito } }).then(r => r.data),
  })
  const { data: dimensiones = [] } = useQuery<DimensionNeu[]>({
    queryKey: claves.dims,
    queryFn: () => api.get('/eam/neumaticos/catalogo/dimensiones', { params: { ambito } }).then(r => r.data),
  })
  const { data: referencias = [] } = useQuery<ReferenciaNeu[]>({
    queryKey: claves.refs,
    queryFn: () => api.get('/eam/neumaticos/catalogo/referencias', { params: { ambito } }).then(r => r.data),
  })
  const { data: refDims = [] } = useQuery<ReferenciaDimension[]>({
    queryKey: claves.rd,
    queryFn: () => api.get(`/eam/neumaticos/catalogo/referencias/${refSel!.id}/dimensiones`).then(r => r.data),
    enabled: !!refSel,
  })

  const err = (e: any, def: string) => toast.error(e?.response?.data?.detail ?? def)

  const mutMarca = useMutation({
    mutationFn: () => api.post('/eam/neumaticos/catalogo/marcas', { nombre: marcaForm.trim(), ambito }),
    onSuccess: () => { toast.success('Marca agregada'); qc.invalidateQueries({ queryKey: claves.marcas }); setMarcaForm('') },
    onError: (e: any) => err(e, 'No se pudo agregar la marca'),
  })
  const mutMarcaDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/catalogo/marcas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: claves.marcas }); qc.invalidateQueries({ queryKey: claves.refs }) },
    onError: (e: any) => err(e, 'No se pudo eliminar'),
  })
  const mutDim = useMutation({
    mutationFn: () => api.post('/eam/neumaticos/catalogo/dimensiones', { nombre: dimForm.trim(), ambito }),
    onSuccess: () => { toast.success('Dimensión agregada'); qc.invalidateQueries({ queryKey: claves.dims }); setDimForm('') },
    onError: (e: any) => err(e, 'No se pudo agregar la dimensión'),
  })
  const mutDimDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/catalogo/dimensiones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: claves.dims }),
    onError: (e: any) => err(e, 'No se pudo eliminar'),
  })
  const mutRef = useMutation({
    mutationFn: () => api.post('/eam/neumaticos/catalogo/referencias', {
      marca_id: Number(refForm.marca_id), nombre: refForm.nombre.trim(), ambito,
      tipo_uso: refForm.tipo_uso || undefined,
    }),
    onSuccess: () => { toast.success('Referencia agregada'); qc.invalidateQueries({ queryKey: claves.refs }); setRefForm({ marca_id: refForm.marca_id, nombre: '', tipo_uso: '' }) },
    onError: (e: any) => err(e, 'No se pudo agregar la referencia'),
  })
  const mutRefDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/catalogo/referencias/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: claves.refs }); setRefSel(null) },
    onError: (e: any) => err(e, 'No se pudo eliminar'),
  })
  const mutRd = useMutation({
    mutationFn: () => api.post('/eam/neumaticos/catalogo/referencia-dimension', {
      referencia_id: refSel!.id, dimension_id: Number(rdForm.dimension_id),
      profundidad_inicial: Number(rdForm.profundidad_inicial),
      profundidad_minima: rdForm.profundidad_minima ? Number(rdForm.profundidad_minima) : undefined,
      vida_util_km: rdForm.vida_util_km ? Number(rdForm.vida_util_km) : undefined,
      presion_recomendada: rdForm.presion_recomendada ? Number(rdForm.presion_recomendada) : undefined,
    }),
    onSuccess: () => {
      toast.success('Dimensión configurada para la referencia')
      qc.invalidateQueries({ queryKey: claves.rd })
      setRdForm({ dimension_id: '', profundidad_inicial: '', profundidad_minima: '', vida_util_km: '', presion_recomendada: '' })
    },
    onError: (e: any) => err(e, 'No se pudo configurar'),
  })
  const mutRdDel = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/neumaticos/catalogo/referencia-dimension/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: claves.rd }),
    onError: (e: any) => err(e, 'No se pudo eliminar'),
  })

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Alert severity="info" sx={{ py: 0.5 }}>
          Al crear {etiqueta} solo se puede elegir de este catálogo. La <b>profundidad inicial</b> se define
          por cada combinación de <b>referencia + dimensión</b>, porque la misma referencia calza distinto según la medida.
        </Alert>
      </Grid>

      {/* Marcas */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ bgcolor: '#FFFFFF', height: '100%' }}>
          <CardContent>
            <Typography fontWeight={700} mb={1.5}>Marcas ({marcas.length})</Typography>
            <Stack direction="row" gap={1} mb={1.5}>
              <TextField size="small" fullWidth label="Nueva marca" value={marcaForm} onChange={e => setMarcaForm(e.target.value)} />
              <Button variant="contained" disabled={!marcaForm.trim() || mutMarca.isPending} onClick={() => mutMarca.mutate()}
                sx={{ bgcolor: color, '&:hover': { bgcolor: colorDark }, minWidth: 44 }}><AddIcon /></Button>
            </Stack>
            <Stack direction="row" gap={0.75} flexWrap="wrap">
              {marcas.map(m => (
                <Chip key={m.id} label={m.nombre} size="small" onDelete={() => mutMarcaDel.mutate(m.id)} sx={{ fontSize: 12 }} />
              ))}
              {marcas.length === 0 && <Typography fontSize={12} color="text.secondary">Sin marcas configuradas</Typography>}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Dimensiones */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ bgcolor: '#FFFFFF', height: '100%' }}>
          <CardContent>
            <Typography fontWeight={700} mb={1.5}>Dimensiones ({dimensiones.length})</Typography>
            <Stack direction="row" gap={1} mb={1.5}>
              <TextField size="small" fullWidth label="Nueva dimensión" placeholder="Ej: 295/80R22.5" value={dimForm} onChange={e => setDimForm(e.target.value)} />
              <Button variant="contained" disabled={!dimForm.trim() || mutDim.isPending} onClick={() => mutDim.mutate()}
                sx={{ bgcolor: color, '&:hover': { bgcolor: colorDark }, minWidth: 44 }}><AddIcon /></Button>
            </Stack>
            <Stack direction="row" gap={0.75} flexWrap="wrap">
              {dimensiones.map(d => (
                <Chip key={d.id} label={d.nombre} size="small" onDelete={() => mutDimDel.mutate(d.id)} sx={{ fontSize: 12 }} />
              ))}
              {dimensiones.length === 0 && <Typography fontSize={12} color="text.secondary">Sin dimensiones configuradas</Typography>}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Referencias por marca */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ bgcolor: '#FFFFFF', height: '100%' }}>
          <CardContent>
            <Typography fontWeight={700} mb={0.5}>Referencias ({referencias.length})</Typography>
            <Typography fontSize={11.5} color="text.secondary" mb={1.5}>Cada referencia pertenece a una marca</Typography>
            <Stack spacing={1} mb={1.5}>
              <TextField select size="small" label="Marca *" value={refForm.marca_id} onChange={e => setRefForm(f => ({ ...f, marca_id: e.target.value }))}>
                <MenuItem value="">Seleccionar…</MenuItem>
                {marcas.map(m => <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>)}
              </TextField>
              <Stack direction="row" gap={1}>
                <TextField size="small" fullWidth label="Referencia *" placeholder="Ej: XZA2" value={refForm.nombre} onChange={e => setRefForm(f => ({ ...f, nombre: e.target.value }))} />
                <TextField select size="small" label="Uso" sx={{ minWidth: 130 }} value={refForm.tipo_uso} onChange={e => setRefForm(f => ({ ...f, tipo_uso: e.target.value }))}>
                  <MenuItem value="">—</MenuItem>
                  {TIPOS_USO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <Button variant="contained" disabled={!refForm.marca_id || !refForm.nombre.trim() || mutRef.isPending} onClick={() => mutRef.mutate()}
                  sx={{ bgcolor: color, '&:hover': { bgcolor: colorDark }, minWidth: 44 }}><AddIcon /></Button>
              </Stack>
            </Stack>
            <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
              <Table size="small">
                <TableBody>
                  {referencias.map(r => (
                    <TableRow key={r.id} hover selected={refSel?.id === r.id} sx={{ cursor: 'pointer' }} onClick={() => setRefSel(r)}>
                      <TableCell sx={{ fontWeight: 600, fontSize: 12.5 }}>{r.nombre}</TableCell>
                      <TableCell sx={{ fontSize: 11.5, color: '#64748B' }}>{r.marca_nombre}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{r.tipo_uso ?? '—'}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); mutRefDel.mutate(r.id) }}>
                          <DeleteForever sx={{ fontSize: 15 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {referencias.length === 0 && (
                    <TableRow><TableCell colSpan={4} align="center">
                      <Typography fontSize={12} color="text.secondary" py={1}>Sin referencias</Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Profundidad por dimensión de la referencia elegida */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Card sx={{ bgcolor: '#FFFFFF', height: '100%' }}>
          <CardContent>
            <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
              <Straighten sx={{ color: colorDark, fontSize: 20 }} />
              <Typography fontWeight={700}>Profundidad por dimensión</Typography>
            </Stack>
            {!refSel ? (
              <Typography fontSize={12.5} color="text.secondary" py={3} textAlign="center">
                Selecciona una referencia de la izquierda para configurar en qué dimensiones existe y con qué profundidad inicial.
              </Typography>
            ) : (
              <>
                <Typography fontSize={11.5} color="text.secondary" mb={1.5}>
                  Referencia <b>{refSel.nombre}</b> · marca {refSel.marca_nombre}
                </Typography>
                <Grid container spacing={1} mb={1.5} alignItems="center">
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField select size="small" fullWidth label="Dimensión *" value={rdForm.dimension_id} onChange={e => setRdForm(f => ({ ...f, dimension_id: e.target.value }))}>
                      <MenuItem value="">Seleccionar…</MenuItem>
                      {dimensiones.map(d => <MenuItem key={d.id} value={String(d.id)}>{d.nombre}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2 }}><TextField size="small" fullWidth type="number" label="Prof. inicial *" value={rdForm.profundidad_inicial} onChange={e => setRdForm(f => ({ ...f, profundidad_inicial: e.target.value }))} /></Grid>
                  <Grid size={{ xs: 6, sm: 2 }}><TextField size="small" fullWidth type="number" label="Prof. mínima" value={rdForm.profundidad_minima} onChange={e => setRdForm(f => ({ ...f, profundidad_minima: e.target.value }))} /></Grid>
                  <Grid size={{ xs: 6, sm: 2 }}><TextField size="small" fullWidth type="number" label="Vida útil km" value={rdForm.vida_util_km} onChange={e => setRdForm(f => ({ ...f, vida_util_km: e.target.value }))} /></Grid>
                  <Grid size={{ xs: 6, sm: 2 }}>
                    <Button fullWidth variant="contained" disabled={!rdForm.dimension_id || !rdForm.profundidad_inicial || mutRd.isPending} onClick={() => mutRd.mutate()}
                      sx={{ bgcolor: color, '&:hover': { bgcolor: colorDark }, textTransform: 'none' }}>Agregar</Button>
                  </Grid>
                </Grid>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Dimensión', 'Prof. inicial', 'Prof. mínima', 'Vida útil', ''].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {refDims.map(rd => (
                      <TableRow key={rd.id} hover>
                        <TableCell sx={{ fontWeight: 600, fontSize: 12.5 }}>{rd.dimension_nombre}</TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>{rd.profundidad_inicial} mm</TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>{rd.profundidad_minima != null ? `${rd.profundidad_minima} mm` : '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12.5 }}>{rd.vida_util_km != null ? `${rd.vida_util_km.toLocaleString('es-CO')} km` : '—'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Quitar esta dimensión de la referencia">
                            <IconButton size="small" color="error" onClick={() => mutRdDel.mutate(rd.id)}>
                              <DeleteForever sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {refDims.length === 0 && (
                      <TableRow><TableCell colSpan={5} align="center">
                        <Typography fontSize={12} color="text.secondary" py={1.5}>
                          Esta referencia aún no tiene dimensiones configuradas: no se podrá usar al crear {etiqueta}.
                        </Typography>
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
