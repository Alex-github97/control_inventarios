/**
 * Checklists · Configuración.
 *
 * Tres pestañas, en el orden en que se usan: las plantillas —con su constructor
 * de secciones y preguntas—, el catálogo de hallazgos y las categorías.
 *
 * El constructor avisa cuando la plantilla ya tiene inspecciones hechas: a
 * partir de ahí, cada cambio sube la versión y las inspecciones viejas
 * conservan la suya. Eso no se puede descubrir por accidente.
 */
import { useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, Chip, Alert, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Switch,
  FormControlLabel, Tabs, Tab, Divider, InputAdornment,
} from '@mui/material'
import {
  Add, Edit, DeleteOutline, ContentCopy, Search, Rule, ArrowBack,
  DragIndicator, WarningAmber,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { apiClient as api } from '@/api/client'
import {
  chkApi, ETIQUETA_TIPO,
  type Plantilla, type Item, type Hallazgo, type Categoria,
} from '@/api/checklists'

const mensaje = (e: any) =>
  e?.response?.data?.detail ?? e?.message ?? 'No se pudo completar la operación'

const chip = (texto: string, color: string) => (
  <Chip label={texto} size="small" sx={{
    height: 19, fontSize: 10, fontWeight: 700, bgcolor: `${color}1A`, color }} />
)

export default function EAMChecklistsConfig() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [editando, setEditando] = useState<number | null>(null)

  if (editando) {
    return <Layout title="Checklists · Configuración"><Constructor pid={editando} onVolver={() => setEditando(null)} /></Layout>
  }

  return (
    <Layout title="Checklists · Configuración">
      <Box className="anim-page-in">
        <Stack direction="row" alignItems="flex-start" spacing={2} mb={2.5}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={800}>Checklists · Configuración</Typography>
            <Typography variant="caption" color="text.secondary">
              Qué se revisa, con qué peso y qué se considera crítico
            </Typography>
          </Box>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/eam/checklists')}
            sx={{ textTransform: 'none' }}>
            Volver a inspecciones
          </Button>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 2.5, borderBottom: `1px solid ${PALETA.niebla}` }}>
          <Tab label="Plantillas" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Catálogo de hallazgos" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Categorías" sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>

        {tab === 0 && <Plantillas onEditar={setEditando} />}
        {tab === 1 && <Hallazgos />}
        {tab === 2 && <Categorias />}
      </Box>
    </Layout>
  )
}

/* ── Plantillas ──────────────────────────────────────────────────────────── */
function Plantillas({ onEditar }: { onEditar: (id: number) => void }) {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [edicion, setEdicion] = useState<Plantilla | null>(null)
  const [form, setForm] = useState<any>({})
  const [busqueda, setBusqueda] = useState('')

  const { data: plantillas = [], isLoading } = useQuery({
    queryKey: ['chk-plantillas'], queryFn: () => chkApi.plantillas.listar(),
  })
  const { data: categorias = [] } = useQuery({
    queryKey: ['chk-categorias'], queryFn: () => chkApi.categorias.listar(),
  })
  const { data: filtros } = useQuery<{ tipos: string[]; marcas: string[] }>({
    queryKey: ['eam-dash-filtros'],
    queryFn: () => api.get('/eam/dashboard/filtros').then(r => r.data),
  })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['chk-plantillas'] })

  const guardar = useMutation({
    mutationFn: (d: any) => edicion ? chkApi.plantillas.editar(edicion.id, d)
                                    : chkApi.plantillas.crear(d),
    onSuccess: () => { invalidar(); setAbierto(false); toast.success('Guardada') },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const duplicar = useMutation({
    mutationFn: ({ id, codigo, nombre }: any) => chkApi.duplicar(id, codigo, nombre),
    onSuccess: () => { invalidar(); toast.success('Plantilla duplicada con sus preguntas') },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const borrar = useMutation({
    mutationFn: (id: number) => chkApi.plantillas.borrar(id),
    onSuccess: () => { invalidar(); toast.success('Desactivada') },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const abrir = (p?: Plantilla) => {
    setEdicion(p ?? null)
    setForm(p ? { ...p } : {
      codigo: '', nombre: '', umbral_aprobacion: 100, critico_reprueba: true,
      requiere_firma: false, genera_ot: false, pide_medidor: false,
    })
    setAbierto(true)
  }

  const filtradas = plantillas.filter(p =>
    !busqueda || `${p.codigo} ${p.nombre} ${p.categoria}`.toLowerCase()
      .includes(busqueda.toLowerCase()))

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <TextField size="small" placeholder="Buscar…" value={busqueda} sx={{ width: 260 }}
          onChange={e => setBusqueda(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<Add />} onClick={() => abrir()}
          sx={{ textTransform: 'none', fontWeight: 700 }}>Nueva plantilla</Button>
      </Stack>

      {isLoading ? <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 3 }} /> : (
        <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['CÓDIGO', 'NOMBRE', 'ALCANCE', 'PREGUNTAS', 'REGLAS', 'USOS', ''].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtradas.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {p.codigo}
                    <Typography variant="caption" display="block" color="text.secondary">
                      v{p.version}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {p.nombre}
                    {p.categoria && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {p.categoria}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {[p.tipo_activo, p.marca, p.linea].filter(Boolean).join(' › ') || 'Todos'}
                    {p.periodicidad_dias && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        cada {p.periodicidad_dias} d
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{p.total_items ?? 0}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {chip(`≥${p.umbral_aprobacion}%`, COLOR_MODULO)}
                      {p.critico_reprueba && chip('Crítico reprueba', ESTADO.peligro)}
                      {p.requiere_firma && chip('Firma', PALETA.grafito)}
                      {p.genera_ot && chip('Abre OT', ESTADO.alerta)}
                    </Stack>
                  </TableCell>
                  <TableCell>{p.ejecuciones ?? 0}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Preguntas y secciones">
                      <IconButton size="small" onClick={() => onEditar(p.id)}>
                        <Rule fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicar con sus preguntas">
                      <IconButton size="small" onClick={() => {
                        const codigo = window.prompt('Código de la nueva plantilla')
                        if (!codigo) return
                        const nombre = window.prompt('Nombre de la nueva plantilla', p.nombre)
                        if (!nombre) return
                        duplicar.mutate({ id: p.id, codigo, nombre })
                      }}><ContentCopy fontSize="small" /></IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => abrir(p)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => borrar.mutate(p.id)}>
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filtradas.length === 0 && (
                <TableRow><TableCell colSpan={7} sx={{ py: 5, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Todavía no hay plantillas.
                  </Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edicion ? `Editar ${edicion.codigo}` : 'Nueva plantilla'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Código" value={form.codigo ?? ''} sx={{ width: 170 }}
                onChange={e => setForm({ ...form, codigo: e.target.value })} />
              <TextField size="small" label="Nombre" value={form.nombre ?? ''} fullWidth
                onChange={e => setForm({ ...form, nombre: e.target.value })} />
            </Stack>
            <TextField select size="small" label="Categoría" value={form.categoria_id ?? ''}
              onChange={e => setForm({ ...form, categoria_id: Number(e.target.value) || null })}>
              <MenuItem value="">—</MenuItem>
              {categorias.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
            </TextField>

            <Divider><Typography variant="caption">Alcance</Typography></Divider>
            <Alert severity="info" sx={{ py: 0.25 }}>
              Vacío significa «todos». Igual que en los planes de mantenimiento: una
              preoperacional de tractocamión se escribe una vez, no una por placa.
            </Alert>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <TextField select size="small" label="Tipo de activo" sx={{ minWidth: 160, flex: 1 }}
                value={form.tipo_activo ?? ''}
                onChange={e => setForm({ ...form, tipo_activo: e.target.value || null })}>
                <MenuItem value="">Todos</MenuItem>
                {(filtros?.tipos ?? []).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Marca" sx={{ minWidth: 150, flex: 1 }}
                value={form.marca ?? ''}
                onChange={e => setForm({ ...form, marca: e.target.value || null })}>
                <MenuItem value="">Todas</MenuItem>
                {(filtros?.marcas ?? []).map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Línea" sx={{ minWidth: 140, flex: 1 }}
                value={form.linea ?? ''}
                onChange={e => setForm({ ...form, linea: e.target.value || null })} />
            </Stack>

            <Divider><Typography variant="caption">Reglas</Typography></Divider>
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Umbral de aprobación (%)" type="number" fullWidth
                value={form.umbral_aprobacion ?? 100}
                onChange={e => setForm({ ...form, umbral_aprobacion: Number(e.target.value) })} />
              <TextField size="small" label="Periodicidad (días)" type="number" fullWidth
                value={form.periodicidad_dias ?? ''}
                helperText="Vacío = a demanda"
                onChange={e => setForm({ ...form,
                  periodicidad_dias: e.target.value === '' ? null : Number(e.target.value) })} />
            </Stack>
            <FormControlLabel label={<Box>
              <Typography variant="body2">Un ítem crítico no conforme reprueba</Typography>
              <Typography variant="caption" color="text.secondary">
                Sin importar el porcentaje. Unos frenos malos no se compensan con veinte
                respuestas buenas.
              </Typography></Box>}
              control={<Switch checked={!!form.critico_reprueba}
                onChange={e => setForm({ ...form, critico_reprueba: e.target.checked })} />} />
            <FormControlLabel label="Exige firma de quien inspecciona"
              control={<Switch checked={!!form.requiere_firma}
                onChange={e => setForm({ ...form, requiere_firma: e.target.checked })} />} />
            <FormControlLabel label={<Box>
              <Typography variant="body2">Abre orden de trabajo si hay hallazgos</Typography>
              <Typography variant="caption" color="text.secondary">
                Prioridad alta y un día de plazo si hubo críticos
              </Typography></Box>}
              control={<Switch checked={!!form.genera_ot}
                onChange={e => setForm({ ...form, genera_ot: e.target.checked })} />} />
            <FormControlLabel label="Pide la lectura del equipo al inspeccionar"
              control={<Switch checked={!!form.pide_medidor}
                onChange={e => setForm({ ...form, pide_medidor: e.target.checked })} />} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" disabled={!form.codigo || !form.nombre || guardar.isPending}
            onClick={() => guardar.mutate(form)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/* ── Constructor de la plantilla ─────────────────────────────────────────── */
function Constructor({ pid, onVolver }: { pid: number; onVolver: () => void }) {
  const qc = useQueryClient()
  const [dlgSeccion, setDlgSeccion] = useState(false)
  const [nombreSeccion, setNombreSeccion] = useState('')
  const [dlgItem, setDlgItem] = useState<{ seccion_id: number | null } | null>(null)
  const [itemEdicion, setItemEdicion] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['chk-estructura', pid], queryFn: () => chkApi.estructura(pid),
  })
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['chk-estructura', pid] })
    qc.invalidateQueries({ queryKey: ['chk-plantillas'] })
  }

  const crearSeccion = useMutation({
    mutationFn: () => chkApi.secciones.crear({
      plantilla_id: pid, nombre: nombreSeccion,
      orden: (data?.secciones?.length ?? 0) + 1 } as any),
    onSuccess: () => { invalidar(); setDlgSeccion(false); setNombreSeccion('') },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const borrarSeccion = useMutation({
    mutationFn: (sid: number) => chkApi.secciones.borrar(sid),
    onSuccess: () => { invalidar(); toast.success('Sección y sus preguntas desactivadas') },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const guardarItem = useMutation({
    mutationFn: (d: any) => itemEdicion?.id
      ? chkApi.items.editar(itemEdicion.id, d) : chkApi.items.crear(d),
    onSuccess: () => { invalidar(); setDlgItem(null); setItemEdicion(null) },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const borrarItem = useMutation({
    mutationFn: (iid: number) => chkApi.items.borrar(iid),
    onSuccess: () => { invalidar(); toast.success('Pregunta desactivada') },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const plantilla: Plantilla | undefined = data?.plantilla
  const yaUsada = (plantilla?.ejecuciones ?? 0) > 0

  const abrirItem = (seccion_id: number | null, item?: any) => {
    setItemEdicion(item ?? null)
    setDlgItem({ seccion_id: item?.seccion_id ?? seccion_id })
  }

  return (
    <Box className="anim-page-in">
      <Stack direction="row" alignItems="flex-start" spacing={2} mb={2}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800}>
            {plantilla?.codigo} · {plantilla?.nombre}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Versión {plantilla?.version} · {data?.total_items ?? 0} preguntas
            {data?.criticos ? ` · ${data.criticos} críticas` : ''}
          </Typography>
        </Box>
        <Button startIcon={<ArrowBack />} onClick={onVolver} sx={{ textTransform: 'none' }}>
          Volver
        </Button>
      </Stack>

      {yaUsada && (
        <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}>
          Esta plantilla ya tiene inspecciones hechas. Cada cambio en su estructura sube la
          versión, y las inspecciones anteriores conservan la suya: se siguen viendo tal como
          se firmaron.
        </Alert>
      )}

      {isLoading ? <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} /> : (
        <Box>
          {(data?.secciones ?? []).map((s: any) => (
            <Card key={String(s.id)} sx={{ borderRadius: 3, p: 2, mb: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
                  {s.nombre}
                  <Typography component="span" variant="caption" color="text.secondary">
                    {' '}· {s.items.length} preguntas
                  </Typography>
                </Typography>
                <Button size="small" startIcon={<Add />} sx={{ textTransform: 'none' }}
                  onClick={() => abrirItem(s.id)}>Pregunta</Button>
                {s.id != null && (
                  <IconButton size="small" onClick={() => borrarSeccion.mutate(s.id)}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                )}
              </Stack>
              <Table size="small">
                <TableBody>
                  {s.items.map((i: Item) => (
                    <TableRow key={i.id} hover>
                      <TableCell sx={{ width: 30, color: PALETA.acero }}>
                        <DragIndicator fontSize="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{i.pregunta}</Typography>
                        {i.ayuda && (
                          <Typography variant="caption" color="text.secondary">{i.ayuda}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: PALETA.grafito }}>
                        {ETIQUETA_TIPO[i.tipo] ?? i.tipo}
                        {i.tipo === 'NUMERO' && (i.valor_min != null || i.valor_max != null) && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {i.valor_min ?? '—'} a {i.valor_max ?? '—'} {i.unidad}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {i.critico && chip('Crítico', ESTADO.peligro)}
                          {i.peso !== 1 && chip(`×${i.peso}`, PALETA.acero)}
                          {i.requiere_foto && chip('Foto', COLOR_MODULO)}
                          {!i.obligatorio && chip('Opcional', PALETA.acero)}
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ width: 90 }}>
                        <IconButton size="small" onClick={() => abrirItem(s.id, i)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => borrarItem.mutate(i.id)}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {s.items.length === 0 && (
                    <TableRow><TableCell colSpan={5} sx={{ py: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Sección vacía
                      </Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          ))}

          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" startIcon={<Add />} sx={{ textTransform: 'none' }}
              onClick={() => setDlgSeccion(true)}>Agregar sección</Button>
            <Button startIcon={<Add />} sx={{ textTransform: 'none' }}
              onClick={() => abrirItem(null)}>Pregunta sin sección</Button>
          </Stack>
        </Box>
      )}

      <Dialog open={dlgSeccion} onClose={() => setDlgSeccion(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Nueva sección</DialogTitle>
        <DialogContent dividers>
          <TextField autoFocus fullWidth size="small" label="Nombre" sx={{ mt: 1 }}
            value={nombreSeccion} onChange={e => setNombreSeccion(e.target.value)}
            helperText="Por ejemplo: Motor, Luces, Documentos" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlgSeccion(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" disabled={!nombreSeccion.trim()}
            onClick={() => crearSeccion.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {dlgItem && (
        <DialogoItem plantillaId={pid} seccionId={dlgItem.seccion_id} inicial={itemEdicion}
          onCerrar={() => { setDlgItem(null); setItemEdicion(null) }}
          onGuardar={d => guardarItem.mutate(d)} guardando={guardarItem.isPending} />
      )}
    </Box>
  )
}

/** Formulario de una pregunta. Fuera del padre para no perder el foco al escribir. */
function DialogoItem({ plantillaId, seccionId, inicial, onCerrar, onGuardar, guardando }: {
  plantillaId: number; seccionId: number | null; inicial: any
  onCerrar: () => void; onGuardar: (d: any) => void; guardando: boolean
}) {
  const [f, setF] = useState<any>(inicial ?? {
    pregunta: '', tipo: 'CONFORME_NO', obligatorio: true, critico: false,
    requiere_foto: false, exige_observacion_no_conforme: true, peso: 1,
  })
  const [opciones, setOpciones] = useState((inicial?.opciones ?? []).join('\n'))

  const enviar = () => {
    if (!f.pregunta?.trim()) { toast.error('Falta la pregunta'); return }
    onGuardar({
      ...f, plantilla_id: plantillaId, seccion_id: seccionId,
      peso: Number(f.peso) || 1,
      valor_min: f.valor_min === '' || f.valor_min == null ? null : Number(f.valor_min),
      valor_max: f.valor_max === '' || f.valor_max == null ? null : Number(f.valor_max),
      opciones: f.tipo === 'OPCIONES'
        ? opciones.split('\n').map((x: string) => x.trim()).filter(Boolean) : null,
    })
  }

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {inicial ? 'Editar pregunta' : 'Nueva pregunta'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField autoFocus size="small" label="Pregunta" fullWidth value={f.pregunta ?? ''}
            onChange={e => setF({ ...f, pregunta: e.target.value })} />
          <TextField size="small" label="Ayuda para quien inspecciona" fullWidth
            value={f.ayuda ?? ''} onChange={e => setF({ ...f, ayuda: e.target.value })}
            helperText="Opcional: cómo se verifica, qué mirar" />
          <TextField select size="small" label="Tipo de respuesta" value={f.tipo}
            onChange={e => setF({ ...f, tipo: e.target.value })}>
            {Object.entries(ETIQUETA_TIPO).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>

          {f.tipo === 'NUMERO' && (
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Unidad" value={f.unidad ?? ''} sx={{ width: 110 }}
                onChange={e => setF({ ...f, unidad: e.target.value })} />
              <TextField size="small" label="Mínimo" type="number" fullWidth
                value={f.valor_min ?? ''} onChange={e => setF({ ...f, valor_min: e.target.value })} />
              <TextField size="small" label="Máximo" type="number" fullWidth
                value={f.valor_max ?? ''} onChange={e => setF({ ...f, valor_max: e.target.value })} />
            </Stack>
          )}
          {f.tipo === 'NUMERO' && (
            <Alert severity="info" sx={{ py: 0.25 }}>
              Un valor fuera de ese rango se marca no conforme solo, sin que el inspector
              tenga que decidirlo.
            </Alert>
          )}
          {f.tipo === 'OPCIONES' && (
            <TextField size="small" label="Opciones" multiline rows={4} value={opciones}
              onChange={e => setOpciones(e.target.value)}
              helperText="Una por línea" />
          )}

          <TextField size="small" label="Peso" type="number" value={f.peso ?? 1} sx={{ width: 140 }}
            onChange={e => setF({ ...f, peso: e.target.value })}
            helperText="Cuánto vale al calcular la conformidad" />

          <FormControlLabel label="Obligatoria"
            control={<Switch checked={!!f.obligatorio}
              onChange={e => setF({ ...f, obligatorio: e.target.checked })} />} />
          <FormControlLabel label={<Box>
            <Typography variant="body2">Crítica</Typography>
            <Typography variant="caption" color="text.secondary">
              Si queda no conforme puede reprobar toda la inspección
            </Typography></Box>}
            control={<Switch checked={!!f.critico}
              onChange={e => setF({ ...f, critico: e.target.checked })} />} />
          <FormControlLabel label="Pide fotografía"
            control={<Switch checked={!!f.requiere_foto}
              onChange={e => setF({ ...f, requiere_foto: e.target.checked })} />} />
          <FormControlLabel label={<Box>
            <Typography variant="body2">Exige explicar si queda no conforme</Typography>
            <Typography variant="caption" color="text.secondary">
              Sin esto la inspección se llena de rojos sin contexto que nadie puede accionar
            </Typography></Box>}
            control={<Switch checked={!!f.exige_observacion_no_conforme}
              onChange={e => setF({ ...f, exige_observacion_no_conforme: e.target.checked })} />} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" onClick={enviar} disabled={guardando}
          sx={{ textTransform: 'none', fontWeight: 700 }}>Guardar</Button>
      </DialogActions>
    </Dialog>
  )
}

/* ── Catálogo de hallazgos ───────────────────────────────────────────────── */
function Hallazgos() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [edicion, setEdicion] = useState<Hallazgo | null>(null)
  const [f, setF] = useState<any>({})

  const { data = [] } = useQuery({ queryKey: ['chk-hallazgos'], queryFn: () => chkApi.hallazgos.listar() })
  const invalidar = () => qc.invalidateQueries({ queryKey: ['chk-hallazgos'] })

  const guardar = useMutation({
    mutationFn: (d: any) => edicion ? chkApi.hallazgos.editar(edicion.id, d)
                                    : chkApi.hallazgos.crear(d),
    onSuccess: () => { invalidar(); setAbierto(false); toast.success('Guardado') },
    onError: (e: any) => toast.error(mensaje(e)),
  })
  const borrar = useMutation({
    mutationFn: (id: number) => chkApi.hallazgos.borrar(id),
    onSuccess: () => { invalidar(); toast.success('Desactivado') },
  })

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Tipificar los hallazgos es lo que permite pasar de «hubo 40 no conformidades» a «la
        fuga de aceite aparece en 12 equipos de la misma línea». Un texto libre no agrupa.
      </Alert>
      <Stack direction="row" mb={2}>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<Add />}
          onClick={() => { setEdicion(null); setF({ severidad: 'MODERADO', genera_ot: false }); setAbierto(true) }}
          sx={{ textTransform: 'none', fontWeight: 700 }}>Nuevo hallazgo</Button>
      </Stack>
      <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['CÓDIGO', 'NOMBRE', 'CATEGORÍA', 'SEVERIDAD', 'ACCIÓN SUGERIDA', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(h => (
              <TableRow key={h.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{h.codigo}</TableCell>
                <TableCell>
                  {h.nombre}
                  {h.genera_ot && (
                    <Typography variant="caption" display="block" sx={{ color: ESTADO.alerta }}>
                      abre orden de trabajo
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{h.categoria ?? '—'}</TableCell>
                <TableCell>{chip(h.severidad,
                  h.severidad === 'GRAVE' ? ESTADO.peligro
                    : h.severidad === 'MODERADO' ? ESTADO.alerta : ESTADO.exito)}</TableCell>
                <TableCell sx={{ fontSize: 12, color: PALETA.grafito }}>
                  {h.accion_sugerida ?? '—'}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => { setEdicion(h); setF({ ...h }); setAbierto(true) }}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => borrar.mutate(h.id)}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={6} sx={{ py: 5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Sin hallazgos catalogados.</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edicion ? 'Editar hallazgo' : 'Nuevo hallazgo'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Código" value={f.codigo ?? ''} sx={{ width: 160 }}
                onChange={e => setF({ ...f, codigo: e.target.value })} />
              <TextField size="small" label="Nombre" value={f.nombre ?? ''} fullWidth
                onChange={e => setF({ ...f, nombre: e.target.value })} />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Categoría" value={f.categoria ?? ''} fullWidth
                onChange={e => setF({ ...f, categoria: e.target.value })}
                helperText="Mecánico, seguridad, documental…" />
              <TextField select size="small" label="Severidad" value={f.severidad ?? 'MODERADO'}
                sx={{ width: 160 }} onChange={e => setF({ ...f, severidad: e.target.value })}>
                <MenuItem value="LEVE">Leve</MenuItem>
                <MenuItem value="MODERADO">Moderado</MenuItem>
                <MenuItem value="GRAVE">Grave</MenuItem>
              </TextField>
            </Stack>
            <TextField size="small" label="Acción sugerida" multiline rows={2}
              value={f.accion_sugerida ?? ''}
              onChange={e => setF({ ...f, accion_sugerida: e.target.value })} />
            <FormControlLabel label={<Box>
              <Typography variant="body2">Abre orden de trabajo por sí solo</Typography>
              <Typography variant="caption" color="text.secondary">
                Aunque la plantilla no lo pida
              </Typography></Box>}
              control={<Switch checked={!!f.genera_ot}
                onChange={e => setF({ ...f, genera_ot: e.target.checked })} />} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" disabled={!f.codigo || !f.nombre}
            onClick={() => guardar.mutate(f)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/* ── Categorías ──────────────────────────────────────────────────────────── */
function Categorias() {
  const qc = useQueryClient()
  const [nombre, setNombre] = useState('')
  const { data = [] } = useQuery({ queryKey: ['chk-categorias'], queryFn: () => chkApi.categorias.listar() })

  const crear = useMutation({
    mutationFn: () => chkApi.categorias.crear({ nombre } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chk-categorias'] }); setNombre('')
      toast.success('Categoría creada')
    },
    onError: (e: any) => toast.error(mensaje(e)),
  })
  const borrar = useMutation({
    mutationFn: (id: number) => chkApi.categorias.borrar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chk-categorias'] }),
  })

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Agrupan las plantillas en los informes. Sin ellas, veinte plantillas son una lista
        plana y no se puede responder «cómo vamos en seguridad».
      </Alert>
      <Stack direction="row" spacing={1.5} mb={2}>
        <TextField size="small" label="Nueva categoría" value={nombre} sx={{ width: 280 }}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && nombre.trim()) crear.mutate() }} />
        <Button variant="contained" startIcon={<Add />} disabled={!nombre.trim()}
          onClick={() => crear.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Agregar
        </Button>
      </Stack>
      <Card sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableBody>
            {data.map((c: Categoria) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.nombre}</TableCell>
                <TableCell align="right" sx={{ width: 60 }}>
                  <IconButton size="small" onClick={() => borrar.mutate(c.id)}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Sin categorías.</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Box>
  )
}
