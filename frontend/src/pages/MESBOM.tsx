import { useMemo, useState } from 'react'
import {
  Box, Typography, Chip, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem, Button, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, Tabs, Tab, Card, CardContent, InputAdornment, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add as AddIcon, AccountTree as TreeIcon, Science as ScienceIcon,
  ListAlt as ListAltIcon, PlaylistAdd as PlaylistAddIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'

// ─── Constantes ───────────────────────────────────────────────────────────────
const MES_COLOR = '#0891B2'
const MES_DARK = '#0E7490'

const TIPOS_BOM = ['SIMPLE', 'MULTINIVEL', 'CONFIGURABLE', 'ALTERNATIVA'] as const

const TIPO_BOM_STYLE: Record<string, { color: string; bg: string }> = {
  SIMPLE:       { color: '#2563EB', bg: '#EFF6FF' },
  MULTINIVEL:   { color: '#7C3AED', bg: '#F5F3FF' },
  CONFIGURABLE: { color: '#D97706', bg: '#FFFBEB' },
  ALTERNATIVA:  { color: '#0F766E', bg: '#F0FDFA' },
}

// Orden sugerido de productos en selects: PRODUCTO_TERMINADO primero
const ORDEN_TIPO_PRODUCTO: Record<string, number> = {
  PRODUCTO_TERMINADO: 0, SEMIELABORADO: 1, SUBPRODUCTO: 2, MATERIA_PRIMA: 3, EMPAQUE: 4,
}

// ─── Tipos (contrato del backend) ────────────────────────────────────────────
interface BOM {
  id: number; producto_id: number; version: string; tipo: string; vigente: boolean
}
interface BOMDetalle {
  id: number; bom_id: number; componente_id: number; cantidad: number
  unidad_medida: string; merma_pct: number; nivel: number
}
interface Receta {
  id: number; producto_id: number; version: string; nombre: string
  rendimiento_pct: number; vigente: boolean
}
interface Producto { id: number; codigo: string; nombre: string; tipo: string; unidad_medida: string }

const EMPTY_BOM_FORM = { producto_id: '', version: '1.0', tipo: 'SIMPLE', descripcion: '', vigente: true }
const EMPTY_COMP_FORM = { componente_id: '', cantidad: '', unidad_medida: 'UN', merma_pct: '0', nivel: '1' }
const EMPTY_RECETA_FORM = { producto_id: '', nombre: '', version: '1.0', rendimiento_pct: '100', tiempo_proceso_min: '', vigente: true }

export default function MESBOM() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [bomSel, setBomSel] = useState<BOM | null>(null)

  // Diálogo nueva BOM
  const [bomOpen, setBomOpen] = useState(false)
  const [bomForm, setBomForm] = useState({ ...EMPTY_BOM_FORM })
  const [bomTried, setBomTried] = useState(false)

  // Formulario agregar componente (panel derecho)
  const [compForm, setCompForm] = useState({ ...EMPTY_COMP_FORM })
  const [compTried, setCompTried] = useState(false)

  // Diálogo nueva receta
  const [recetaOpen, setRecetaOpen] = useState(false)
  const [recetaForm, setRecetaForm] = useState({ ...EMPTY_RECETA_FORM })
  const [recetaTried, setRecetaTried] = useState(false)

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: boms = [], isLoading: cargandoBoms } = useQuery<BOM[]>({
    queryKey: ['mes-boms'], queryFn: () => api.get('/mes/bom').then(r => r.data),
  })
  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['mes-productos'], queryFn: () => api.get('/mes/productos').then(r => r.data),
  })
  const { data: recetas = [], isLoading: cargandoRecetas } = useQuery<Receta[]>({
    queryKey: ['mes-recetas'], queryFn: () => api.get('/mes/recetas').then(r => r.data),
  })
  const { data: detalles = [], isLoading: cargandoDet } = useQuery<BOMDetalle[]>({
    queryKey: ['mes-bom-det', bomSel?.id],
    queryFn: () => api.get(`/mes/bom/${bomSel!.id}/detalles`).then(r => r.data),
    enabled: !!bomSel,
  })

  const producto = (id: number) => productos.find(p => p.id === id)

  // Productos ordenados: PRODUCTO_TERMINADO primero, luego por código
  const productosOrdenados = useMemo(() =>
    [...productos].sort((a, b) => {
      const oa = ORDEN_TIPO_PRODUCTO[a.tipo] ?? 9
      const ob = ORDEN_TIPO_PRODUCTO[b.tipo] ?? 9
      return oa !== ob ? oa - ob : a.codigo.localeCompare(b.codigo)
    }), [productos])

  // Candidatos a componente: cualquier producto excepto el padre de la BOM seleccionada
  const candidatosComponente = useMemo(() =>
    productosOrdenados.filter(p => p.id !== bomSel?.producto_id), [productosOrdenados, bomSel])

  // ─── Mutaciones ─────────────────────────────────────────────────────────────
  const mutCrearBom = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/bom', body),
    onSuccess: (r: any) => {
      toast.success(`BOM v${r.data?.version ?? bomForm.version} creada`)
      qc.invalidateQueries({ queryKey: ['mes-boms'] })
      setBomOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear la BOM'),
  })

  const mutAgregarComp = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post(`/mes/bom/${bomSel!.id}/detalles`, body),
    onSuccess: () => {
      toast.success('Componente agregado a la BOM')
      qc.invalidateQueries({ queryKey: ['mes-bom-det'] })
      setCompForm({ ...EMPTY_COMP_FORM })
      setCompTried(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al agregar el componente'),
  })

  const mutCrearReceta = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/mes/recetas', body),
    onSuccess: (r: any) => {
      toast.success(`Receta "${r.data?.nombre ?? recetaForm.nombre}" creada`)
      qc.invalidateQueries({ queryKey: ['mes-recetas'] })
      setRecetaOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al crear la receta'),
  })

  // ─── Acciones ───────────────────────────────────────────────────────────────
  const abrirNuevaBom = () => { setBomForm({ ...EMPTY_BOM_FORM }); setBomTried(false); setBomOpen(true) }
  const abrirNuevaReceta = () => { setRecetaForm({ ...EMPTY_RECETA_FORM }); setRecetaTried(false); setRecetaOpen(true) }

  const seleccionarBom = (b: BOM) => {
    setBomSel(b)
    setCompForm({ ...EMPTY_COMP_FORM })
    setCompTried(false)
  }

  const crearBom = () => {
    setBomTried(true)
    if (!bomForm.producto_id) return
    mutCrearBom.mutate({
      producto_id: Number(bomForm.producto_id),
      version: bomForm.version.trim() || '1.0',
      tipo: bomForm.tipo,
      descripcion: bomForm.descripcion.trim() || undefined,
      vigente: bomForm.vigente,
    })
  }

  const agregarComponente = () => {
    setCompTried(true)
    if (!bomSel) return
    const cantidadOk = compForm.cantidad !== '' && Number(compForm.cantidad) > 0
    const mermaOk = compForm.merma_pct === '' || Number(compForm.merma_pct) >= 0
    if (!compForm.componente_id || !cantidadOk || !mermaOk) return
    mutAgregarComp.mutate({
      bom_id: bomSel.id, // el schema del backend exige el bom_id también en el body
      componente_id: Number(compForm.componente_id),
      nivel: compForm.nivel ? Number(compForm.nivel) : 1,
      cantidad: Number(compForm.cantidad),
      unidad_medida: compForm.unidad_medida.trim() || 'UN',
      merma_pct: compForm.merma_pct ? Number(compForm.merma_pct) : 0,
    })
  }

  const crearReceta = () => {
    setRecetaTried(true)
    const rend = Number(recetaForm.rendimiento_pct)
    const rendOk = recetaForm.rendimiento_pct !== '' && rend >= 0 && rend <= 100
    if (!recetaForm.producto_id || !recetaForm.nombre.trim() || !rendOk) return
    mutCrearReceta.mutate({
      producto_id: Number(recetaForm.producto_id),
      version: recetaForm.version.trim() || '1.0',
      nombre: recetaForm.nombre.trim(),
      rendimiento_pct: rend,
      tiempo_proceso_min: recetaForm.tiempo_proceso_min ? Number(recetaForm.tiempo_proceso_min) : undefined,
      vigente: recetaForm.vigente,
    })
  }

  // Al elegir componente, autocompletar su unidad de medida (editable)
  const onComponenteChange = (id: string) => {
    const p = producto(Number(id))
    setCompForm(f => ({ ...f, componente_id: id, unidad_medida: p?.unidad_medida ?? f.unidad_medida }))
  }

  // ─── Validaciones visuales ──────────────────────────────────────────────────
  const invBomProducto = bomTried && !bomForm.producto_id
  const invCompComponente = compTried && !compForm.componente_id
  const invCompCantidad = compTried && (compForm.cantidad === '' || Number(compForm.cantidad) <= 0)
  const invCompMerma = compTried && compForm.merma_pct !== '' && Number(compForm.merma_pct) < 0
  const invRecProducto = recetaTried && !recetaForm.producto_id
  const invRecNombre = recetaTried && !recetaForm.nombre.trim()
  const invRecRendimiento = recetaTried && (recetaForm.rendimiento_pct === '' || Number(recetaForm.rendimiento_pct) < 0 || Number(recetaForm.rendimiento_pct) > 100)

  const chipVigente = (vigente: boolean) => (
    <Chip size="small" label={vigente ? 'Vigente' : 'No vigente'}
      sx={{ fontWeight: 700, fontSize: 10,
        color: vigente ? '#16A34A' : '#94A3B8',
        bgcolor: vigente ? '#F0FDF4' : '#F1F5F9' }} />
  )

  return (
    <Layout title="MES · BOM y Recetas">
      <Box sx={{ p: 3, bgcolor: '#F0F2F5', minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <TreeIcon sx={{ color: MES_COLOR, fontSize: 34 }} />
            <Box>
              <Typography variant="h5" fontWeight={800} color={MES_DARK}>BOM y Recetas</Typography>
              <Typography fontSize={12} color="text.secondary">
                Listas de materiales y recetas versionadas · información documentada del producto — ISO 9001 §8.5.1
              </Typography>
            </Box>
          </Stack>
          {tab === 0 ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNuevaBom}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
              Nueva BOM
            </Button>
          ) : (
            <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNuevaReceta}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
              Nueva receta
            </Button>
          )}
        </Stack>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 700 },
          '& .Mui-selected': { color: `${MES_DARK} !important` },
          '& .MuiTabs-indicator': { bgcolor: MES_COLOR } }}>
          <Tab icon={<ListAltIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="BOM (Listas de materiales)" />
          <Tab icon={<ScienceIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Recetas" />
        </Tabs>

        {/* ── Tab 0: BOM — maestro-detalle ─────────────────────────────────── */}
        {tab === 0 && (
          <Grid container spacing={2.5}>
            {/* Panel izquierdo: lista de BOMs */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={1.25}>
                {cargandoBoms && (
                  <Paper elevation={0} sx={{ p: 3, borderRadius: '14px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                    <Typography color="text.secondary" fontSize={13}>Cargando BOMs…</Typography>
                  </Paper>
                )}
                {!cargandoBoms && boms.length === 0 && (
                  <Paper elevation={0} sx={{ p: 3, borderRadius: '14px', border: '1px dashed #CBD5E1', textAlign: 'center', bgcolor: '#FFFFFF' }}>
                    <Typography color="text.secondary" fontSize={13}>
                      Sin listas de materiales. Cree la primera con "Nueva BOM".
                    </Typography>
                  </Paper>
                )}
                {boms.map(b => {
                  const p = producto(b.producto_id)
                  const st = TIPO_BOM_STYLE[b.tipo] ?? TIPO_BOM_STYLE.SIMPLE
                  const activa = bomSel?.id === b.id
                  return (
                    <Card key={b.id} elevation={0} onClick={() => seleccionarBom(b)}
                      sx={{ cursor: 'pointer', borderRadius: '14px', bgcolor: '#FFFFFF',
                        border: `2px solid ${activa ? MES_COLOR : '#E5E7EB'}`,
                        transition: 'border-color .15s, box-shadow .15s',
                        '&:hover': { borderColor: activa ? MES_COLOR : alpha(MES_COLOR, 0.45), boxShadow: '0 4px 14px rgba(0,0,0,0.06)' } }}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography fontSize={13.5} fontWeight={700} color="#1E293B" noWrap>
                              {p ? `${p.codigo} — ${p.nombre}` : `Producto #${b.producto_id}`}
                            </Typography>
                            <Typography fontSize={11} color="text.secondary">
                              {p?.tipo ? p.tipo.replace(/_/g, ' ') : 'Producto'}
                            </Typography>
                          </Box>
                          <Chip size="small" label={`v${b.version}`}
                            sx={{ fontWeight: 800, fontSize: 10, color: MES_DARK, bgcolor: alpha(MES_COLOR, 0.1) }} />
                        </Stack>
                        <Stack direction="row" gap={0.75} mt={1} flexWrap="wrap">
                          <Chip size="small" label={b.tipo} sx={{ fontWeight: 700, fontSize: 10, color: st.color, bgcolor: st.bg }} />
                          {chipVigente(b.vigente)}
                        </Stack>
                      </CardContent>
                    </Card>
                  )
                })}
              </Stack>
            </Grid>

            {/* Panel derecho: componentes de la BOM seleccionada */}
            <Grid size={{ xs: 12, md: 7 }}>
              {!bomSel ? (
                <Paper elevation={0} sx={{ p: 6, borderRadius: '14px', border: '2px dashed #CBD5E1', textAlign: 'center', bgcolor: '#FFFFFF' }}>
                  <TreeIcon sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
                  <Typography color="text.secondary" fontWeight={600}>Seleccione una BOM</Typography>
                  <Typography fontSize={12} color="text.secondary">
                    Elija una lista de materiales del panel izquierdo para ver y agregar sus componentes.
                  </Typography>
                </Paper>
              ) : (
                <Paper elevation={0} sx={{ borderRadius: '14px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', overflow: 'hidden' }}>
                  {/* Encabezado del detalle */}
                  <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid #E5E7EB', bgcolor: alpha(MES_COLOR, 0.04) }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography fontWeight={800} fontSize={14.5} color={MES_DARK}>
                          Componentes — {producto(bomSel.producto_id)?.codigo ?? `#${bomSel.producto_id}`} v{bomSel.version}
                        </Typography>
                        <Typography fontSize={11.5} color="text.secondary">
                          {producto(bomSel.producto_id)?.nombre ?? ''}
                        </Typography>
                      </Box>
                      <Chip size="small" label={`${detalles.length} componente${detalles.length === 1 ? '' : 's'}`}
                        sx={{ fontWeight: 800, fontSize: 11, color: MES_DARK, bgcolor: alpha(MES_COLOR, 0.12) }} />
                    </Stack>
                  </Box>

                  {/* Formulario compacto: agregar componente */}
                  <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #F1F5F9' }}>
                    <Stack direction="row" alignItems="center" gap={0.75} mb={1.25}>
                      <PlaylistAddIcon sx={{ fontSize: 18, color: MES_COLOR }} />
                      <Typography fontSize={12.5} fontWeight={700} color="#475569">Agregar componente</Typography>
                    </Stack>
                    <Grid container spacing={1.25}>
                      <Grid size={{ xs: 12, sm: 5 }}>
                        <TextField select label="Componente *" size="small" fullWidth value={compForm.componente_id}
                          onChange={e => onComponenteChange(e.target.value)}
                          error={invCompComponente} helperText={invCompComponente ? 'Seleccione el componente' : ''}>
                          <MenuItem value="">Seleccionar…</MenuItem>
                          {candidatosComponente.map(p => (
                            <MenuItem key={p.id} value={String(p.id)}>{p.codigo} — {p.nombre}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 2.5 }}>
                        <TextField label="Cantidad *" type="number" size="small" fullWidth value={compForm.cantidad}
                          onChange={e => setCompForm(f => ({ ...f, cantidad: e.target.value }))}
                          error={invCompCantidad} helperText={invCompCantidad ? 'Mayor que cero' : ''}
                          inputProps={{ min: 0, step: 'any' }} />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 1.5 }}>
                        <TextField label="UM" size="small" fullWidth value={compForm.unidad_medida}
                          onChange={e => setCompForm(f => ({ ...f, unidad_medida: e.target.value }))} />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 1.5 }}>
                        <TextField label="Merma %" type="number" size="small" fullWidth value={compForm.merma_pct}
                          onChange={e => setCompForm(f => ({ ...f, merma_pct: e.target.value }))}
                          error={invCompMerma} helperText={invCompMerma ? 'Debe ser ≥ 0' : ''}
                          inputProps={{ min: 0, step: 'any' }} />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 1.5 }}>
                        <TextField label="Nivel" type="number" size="small" fullWidth value={compForm.nivel}
                          onChange={e => setCompForm(f => ({ ...f, nivel: e.target.value }))}
                          inputProps={{ min: 1, step: 1 }} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Button variant="contained" size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                          disabled={mutAgregarComp.isPending} onClick={agregarComponente}
                          sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK }, textTransform: 'none', fontWeight: 700 }}>
                          Agregar
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Tabla de componentes */}
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Componente', 'Nivel', 'Cantidad', 'Merma %'].map(h =>
                            <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detalles.map(d => {
                          const c = producto(d.componente_id)
                          return (
                            <TableRow key={d.id} hover>
                              <TableCell>
                                <Typography fontSize={13} fontWeight={600}>{c?.nombre ?? `#${d.componente_id}`}</Typography>
                                <Typography fontSize={11} color="text.secondary">{c?.codigo}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip size="small" label={`N${d.nivel}`}
                                  sx={{ fontWeight: 700, fontSize: 10, color: '#475569', bgcolor: '#F1F5F9' }} />
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                {d.cantidad.toLocaleString('es-CO')} <Typography component="span" fontSize={11} color="text.secondary">{d.unidad_medida}</Typography>
                              </TableCell>
                              <TableCell sx={{ color: d.merma_pct > 0 ? '#D97706' : 'inherit', fontWeight: d.merma_pct > 0 ? 700 : 400 }}>
                                {d.merma_pct.toLocaleString('es-CO')}%
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {detalles.length === 0 && (
                          <TableRow><TableCell colSpan={4} align="center">
                            <Typography color="text.secondary" fontSize={12.5} py={2.5}>
                              {cargandoDet ? 'Cargando componentes…' : 'Sin componentes. Agregue el primero con el formulario superior.'}
                            </Typography>
                          </TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              )}
            </Grid>
          </Grid>
        )}

        {/* ── Tab 1: Recetas ───────────────────────────────────────────────── */}
        {tab === 1 && (
          <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Producto', 'Nombre', 'Versión', 'Rendimiento', 'Vigente'].map(h =>
                    <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {recetas.map(r => {
                  const p = producto(r.producto_id)
                  const rendAlto = r.rendimiento_pct >= 95
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Typography fontSize={13} fontWeight={600}>{p?.nombre ?? `#${r.producto_id}`}</Typography>
                        <Typography fontSize={11} color="text.secondary">{p?.codigo}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{r.nombre}</TableCell>
                      <TableCell>
                        <Chip size="small" label={`v${r.version}`}
                          sx={{ fontWeight: 800, fontSize: 10, color: MES_DARK, bgcolor: alpha(MES_COLOR, 0.1) }} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={`${r.rendimiento_pct.toLocaleString('es-CO')}%`}
                          sx={{ fontWeight: 700, fontSize: 11,
                            color: rendAlto ? '#16A34A' : '#D97706',
                            bgcolor: rendAlto ? '#F0FDF4' : '#FFFBEB' }} />
                      </TableCell>
                      <TableCell>{chipVigente(r.vigente)}</TableCell>
                    </TableRow>
                  )
                })}
                {recetas.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" py={3}>
                      {cargandoRecetas ? 'Cargando…' : 'Sin recetas. Cree la primera con "Nueva receta".'}
                    </Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* ── Diálogo nueva BOM ── */}
        <Dialog open={bomOpen} onClose={() => setBomOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nueva lista de materiales (BOM)</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField select label="Producto *" size="small" fullWidth value={bomForm.producto_id}
                  onChange={e => setBomForm(f => ({ ...f, producto_id: e.target.value }))}
                  error={invBomProducto} helperText={invBomProducto ? 'Seleccione el producto de la BOM' : 'Típicamente un producto terminado o semielaborado'}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {productosOrdenados.map(p => (
                    <MenuItem key={p.id} value={String(p.id)}>{p.codigo} — {p.nombre} · {p.tipo.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Versión" size="small" fullWidth value={bomForm.version}
                  onChange={e => setBomForm(f => ({ ...f, version: e.target.value }))}
                  helperText="Control de versiones de la información documentada"
                  InputProps={{ startAdornment: <InputAdornment position="start">v</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Tipo" size="small" fullWidth value={bomForm.tipo}
                  onChange={e => setBomForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS_BOM.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Descripción" size="small" fullWidth multiline minRows={2} value={bomForm.descripcion}
                  onChange={e => setBomForm(f => ({ ...f, descripcion: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField select label="Vigencia" size="small" fullWidth value={bomForm.vigente ? '1' : '0'}
                  onChange={e => setBomForm(f => ({ ...f, vigente: e.target.value === '1' }))}>
                  <MenuItem value="1">Vigente</MenuItem>
                  <MenuItem value="0">No vigente</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ fontSize: 12.5 }}>
                  La BOM define la <b>estructura de materiales</b> del producto. Después de crearla, agregue sus componentes
                  desde el panel derecho — cada versión queda como registro trazable.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setBomOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={mutCrearBom.isPending} onClick={crearBom}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Crear BOM</Button>
          </DialogActions>
        </Dialog>

        {/* ── Diálogo nueva receta ── */}
        <Dialog open={recetaOpen} onClose={() => setRecetaOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nueva receta</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField select label="Producto *" size="small" fullWidth value={recetaForm.producto_id}
                  onChange={e => setRecetaForm(f => ({ ...f, producto_id: e.target.value }))}
                  error={invRecProducto} helperText={invRecProducto ? 'Seleccione el producto de la receta' : ''}>
                  <MenuItem value="">Seleccionar…</MenuItem>
                  {productosOrdenados.map(p => (
                    <MenuItem key={p.id} value={String(p.id)}>{p.codigo} — {p.nombre} · {p.tipo.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField label="Nombre *" size="small" fullWidth value={recetaForm.nombre}
                  onChange={e => setRecetaForm(f => ({ ...f, nombre: e.target.value }))}
                  error={invRecNombre} helperText={invRecNombre ? 'Indique el nombre de la receta' : ''} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Versión" size="small" fullWidth value={recetaForm.version}
                  onChange={e => setRecetaForm(f => ({ ...f, version: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start">v</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField label="Rendimiento *" type="number" size="small" fullWidth value={recetaForm.rendimiento_pct}
                  onChange={e => setRecetaForm(f => ({ ...f, rendimiento_pct: e.target.value }))}
                  error={invRecRendimiento} helperText={invRecRendimiento ? 'Entre 0 y 100' : ''}
                  inputProps={{ min: 0, max: 100, step: 'any' }}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField label="Tiempo de proceso" type="number" size="small" fullWidth value={recetaForm.tiempo_proceso_min}
                  onChange={e => setRecetaForm(f => ({ ...f, tiempo_proceso_min: e.target.value }))}
                  inputProps={{ min: 0, step: 'any' }}
                  InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Vigencia" size="small" fullWidth value={recetaForm.vigente ? '1' : '0'}
                  onChange={e => setRecetaForm(f => ({ ...f, vigente: e.target.value === '1' }))}>
                  <MenuItem value="1">Vigente</MenuItem>
                  <MenuItem value="0">No vigente</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ fontSize: 12.5 }}>
                  La receta documenta las <b>condiciones de proceso</b> (rendimiento y tiempo) del producto,
                  complementando la BOM como información documentada de producción.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setRecetaOpen(false)}>Cancelar</Button>
            <Button variant="contained" disabled={mutCrearReceta.isPending} onClick={crearReceta}
              sx={{ bgcolor: MES_COLOR, '&:hover': { bgcolor: MES_DARK } }}>Crear receta</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
