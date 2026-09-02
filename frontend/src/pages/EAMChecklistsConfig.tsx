/**
 * Checklists · Configuración.
 *
 * Las pestañas van en el orden en que hay que llenarlas, y cada una explica de
 * qué depende la siguiente:
 *
 *   Clasificaciones → cómo se responde
 *   Sistemas        → qué parte del activo
 *   Preguntas       → el banco global: pertenece a un sistema, usa una clasificación
 *   Plantillas      → escoge del banco y declara a qué activos aplica
 *   Catálogos       → hallazgos y categorías
 *
 * El banco es global a propósito: la misma pregunta sirve en la preoperacional
 * diaria y en la revisión mensual, y así el tablero puede contar cuántas veces
 * falló sumando todas las plantillas.
 */
import { useMemo, useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, Chip, Alert, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Switch,
  FormControlLabel, Tabs, Tab, Divider, InputAdornment, Checkbox, Autocomplete,
} from '@mui/material'
import {
  Add, Edit, DeleteOutline, ContentCopy, Search, Rule, ArrowBack,
  WarningAmber, Category, Tune, HelpOutline, Layers,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { apiClient as api } from '@/api/client'
import {
  chkApi, ETIQUETA_TIPO_CLASIFICACION,
  type Clasificacion, type OpcionEntrada, type Sistema, type Pregunta,
  type Plantilla, type Hallazgo, type Categoria,
} from '@/api/checklists'


import { mensajeDeError } from '@/utils/errorApi'
const chip = (texto: string, color: string) => (
  <Chip label={texto} size="small" sx={{
    height: 19, fontSize: 10, fontWeight: 700, bgcolor: `${color}1A`, color }} />
)

export default function EAMChecklistsConfig() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [armando, setArmando] = useState<number | null>(null)

  if (armando) {
    return (
      <Layout title="Checklists · Configuración">
        <Armador pid={armando} onVolver={() => setArmando(null)} />
      </Layout>
    )
  }

  const pestanas = [
    { label: 'Clasificaciones', icono: <Tune fontSize="small" /> },
    { label: 'Sistemas', icono: <Layers fontSize="small" /> },
    { label: 'Banco de preguntas', icono: <HelpOutline fontSize="small" /> },
    { label: 'Plantillas', icono: <Rule fontSize="small" /> },
    { label: 'Hallazgos y categorías', icono: <Category fontSize="small" /> },
  ]

  return (
    <Layout title="Checklists · Configuración">
      <Box className="anim-page-in">
        <Stack direction="row" alignItems="flex-start" spacing={2} mb={2.5}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={800}>Checklists · Configuración</Typography>
            <Typography variant="caption" color="text.secondary">
              Clasificación → sistema → pregunta. Las plantillas escogen del banco.
            </Typography>
          </Box>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/eam/checklists')}
            sx={{ textTransform: 'none' }}>
            Volver a inspecciones
          </Button>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ mb: 2.5, borderBottom: `1px solid ${PALETA.niebla}` }}>
          {pestanas.map(p => (
            <Tab key={p.label} label={p.label} icon={p.icono} iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 700, minHeight: 48 }} />
          ))}
        </Tabs>

        {tab === 0 && <Clasificaciones />}
        {tab === 1 && <Sistemas />}
        {tab === 2 && <Preguntas />}
        {tab === 3 && <Plantillas onArmar={setArmando} />}
        {tab === 4 && <Catalogos />}
      </Box>
    </Layout>
  )
}

/* ═══ 1 · Clasificaciones ═══════════════════════════════════════════════════ */
function Clasificaciones() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [edicion, setEdicion] = useState<Clasificacion | null>(null)
  const [f, setF] = useState<any>({})
  const [opciones, setOpciones] = useState<OpcionEntrada[]>([])

  const { data = [], isLoading } = useQuery({
    queryKey: ['chk-clasificaciones'], queryFn: () => chkApi.clasificaciones.listar(),
  })
  const invalidar = () => qc.invalidateQueries({ queryKey: ['chk-clasificaciones'] })

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = { ...f, opciones: f.tipo === 'OPCIONES' ? opciones : [] }
      return edicion ? chkApi.clasificaciones.editar(edicion.id, cuerpo)
                     : chkApi.clasificaciones.crear(cuerpo)
    },
    onSuccess: () => { invalidar(); setAbierto(false); toast.success('Guardada') },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const borrar = useMutation({
    mutationFn: (id: number) => chkApi.clasificaciones.borrar(id),
    onSuccess: () => { invalidar(); toast.success('Desactivada') },
    onError: (e: any) => toast.error(mensajeDeError(e), { duration: 6000 }),
  })

  const abrir = (c?: Clasificacion) => {
    setEdicion(c ?? null)
    setF(c ? { ...c } : { nombre: '', tipo: 'OPCIONES' })
    setOpciones(c ? c.opciones.map(o => ({
      nombre: o.nombre, orden: o.orden, conforme: o.conforme,
      puntaje: o.puntaje, color: o.color })) : [
      { nombre: 'Bueno', conforme: true, puntaje: 1, orden: 0 },
      { nombre: 'Malo', conforme: false, puntaje: 0, orden: 1 },
    ])
    setAbierto(true)
  }

  const cambiarOpcion = (i: number, campo: string, valor: any) =>
    setOpciones(opciones.map((o, j) => j === i ? { ...o, [campo]: valor } : o))

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Define cómo se responde una pregunta. Cada opción declara si cuenta como conforme y
        <b> cuánto puntúa</b>: así «Regular» puede valer medio punto en vez de obligar a
        decidir entre aprobado y reprobado.
      </Alert>
      <Stack direction="row" mb={2}>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<Add />} onClick={() => abrir()}
          sx={{ textTransform: 'none', fontWeight: 700 }}>Nueva clasificación</Button>
      </Stack>

      {isLoading ? <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 3 }} /> : (
        <Stack spacing={1.5}>
          {data.map(c => (
            <Card key={c.id} sx={{ borderRadius: 3, p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" fontWeight={800}>{c.nombre}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ETIQUETA_TIPO_CLASIFICACION[c.tipo] ?? c.tipo}
                    {c.tipo === 'NUMERO' && (c.valor_min != null || c.valor_max != null)
                      && ` · aceptable de ${c.valor_min ?? '—'} a ${c.valor_max ?? '—'} ${c.unidad ?? ''}`}
                    {' · '}{c.usos ?? 0} {c.usos === 1 ? 'pregunta la usa' : 'preguntas la usan'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {c.opciones.map(o => (
                    <Tooltip key={o.id} title={`Puntaje ${o.puntaje} · ${
                      o.conforme === true ? 'cuenta conforme'
                      : o.conforme === false ? 'cuenta hallazgo' : 'informativa'}`}>
                      <Chip label={`${o.nombre} · ${o.puntaje}`} size="small" sx={{
                        height: 22, fontSize: 11, fontWeight: 700,
                        bgcolor: `${o.conforme === true ? ESTADO.exito
                          : o.conforme === false ? ESTADO.peligro : PALETA.acero}1A`,
                        color: o.conforme === true ? ESTADO.exito
                          : o.conforme === false ? ESTADO.peligro : PALETA.grafito }} />
                    </Tooltip>
                  ))}
                </Stack>
                <IconButton size="small" onClick={() => abrir(c)}><Edit fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => borrar.mutate(c.id)}>
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Stack>
            </Card>
          ))}
          {data.length === 0 && (
            <Card sx={{ borderRadius: 3, p: 5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Sin clasificaciones. Es lo primero que hay que crear.
              </Typography>
            </Card>
          )}
        </Stack>
      )}

      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edicion ? 'Editar clasificación' : 'Nueva clasificación'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField size="small" label="Nombre" value={f.nombre ?? ''} fullWidth
              onChange={e => setF({ ...f, nombre: e.target.value })}
              helperText="Por ejemplo: Bueno / Regular / Malo, o Cumple / No cumple" />
            <TextField select size="small" label="Cómo se responde" value={f.tipo ?? 'OPCIONES'}
              onChange={e => setF({ ...f, tipo: e.target.value })}>
              {Object.entries(ETIQUETA_TIPO_CLASIFICACION).map(([k, v]) => (
                <MenuItem key={k} value={v && k}>{v}</MenuItem>
              ))}
            </TextField>

            {f.tipo === 'NUMERO' && (
              <>
                <Stack direction="row" spacing={1.5}>
                  <TextField size="small" label="Unidad" value={f.unidad ?? ''} sx={{ width: 110 }}
                    onChange={e => setF({ ...f, unidad: e.target.value })} />
                  <TextField size="small" label="Mínimo" type="number" fullWidth
                    value={f.valor_min ?? ''}
                    onChange={e => setF({ ...f, valor_min: e.target.value === '' ? null : Number(e.target.value) })} />
                  <TextField size="small" label="Máximo" type="number" fullWidth
                    value={f.valor_max ?? ''}
                    onChange={e => setF({ ...f, valor_max: e.target.value === '' ? null : Number(e.target.value) })} />
                </Stack>
                <Alert severity="info" sx={{ py: 0.25 }}>
                  Un valor fuera del rango se marca no conforme solo, sin que el inspector
                  tenga que decidirlo.
                </Alert>
              </>
            )}

            {f.tipo === 'OPCIONES' && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: PALETA.grafito }}>
                  OPCIONES DE RESPUESTA
                </Typography>
                <Stack spacing={1} mt={1}>
                  {opciones.map((o, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center">
                      <TextField size="small" label="Opción" value={o.nombre} sx={{ flex: 1 }}
                        onChange={e => cambiarOpcion(i, 'nombre', e.target.value)} />
                      <TextField select size="small" label="Cuenta como" sx={{ width: 140 }}
                        value={o.conforme === true ? 'si' : o.conforme === false ? 'no' : 'info'}
                        onChange={e => cambiarOpcion(i, 'conforme',
                          e.target.value === 'si' ? true : e.target.value === 'no' ? false : null)}>
                        <MenuItem value="si">Conforme</MenuItem>
                        <MenuItem value="no">Hallazgo</MenuItem>
                        <MenuItem value="info">Informativa</MenuItem>
                      </TextField>
                      <TextField size="small" label="Puntaje" type="number" sx={{ width: 100 }}
                        inputProps={{ step: 0.1, min: 0, max: 1 }} value={o.puntaje ?? 1}
                        onChange={e => cambiarOpcion(i, 'puntaje', Number(e.target.value))} />
                      <IconButton size="small"
                        onClick={() => setOpciones(opciones.filter((_, j) => j !== i))}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Box>
                    <Button size="small" startIcon={<Add />} sx={{ textTransform: 'none' }}
                      onClick={() => setOpciones([...opciones,
                        { nombre: '', conforme: null, puntaje: 0.5, orden: opciones.length }])}>
                      Agregar opción
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    El puntaje va de 0 a 1 y es lo que suma del peso de la pregunta.
                  </Typography>
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" disabled={!f.nombre || guardar.isPending}
            onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/* ═══ 2 · Sistemas ══════════════════════════════════════════════════════════ */
function Sistemas() {
  const qc = useQueryClient()
  const [f, setF] = useState<any>({ nombre: '', orden: 0 })
  const [edicion, setEdicion] = useState<Sistema | null>(null)

  const { data = [] } = useQuery({ queryKey: ['chk-sistemas'], queryFn: () => chkApi.sistemas.listar() })
  const invalidar = () => qc.invalidateQueries({ queryKey: ['chk-sistemas'] })

  const guardar = useMutation({
    mutationFn: () => edicion ? chkApi.sistemas.editar(edicion.id, f) : chkApi.sistemas.crear(f),
    onSuccess: () => { invalidar(); setF({ nombre: '', orden: 0 }); setEdicion(null) },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const borrar = useMutation({
    mutationFn: (id: number) => chkApi.sistemas.borrar(id),
    onSuccess: () => { invalidar(); toast.success('Desactivado') },
    onError: (e: any) => toast.error(mensajeDeError(e), { duration: 6000 }),
  })

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        El sistema mecánico o electrónico del activo: motor, frenos, eléctrico, cabina,
        documentos. Es global, y por eso el tablero puede responder <b>qué sistema concentra
        los hallazgos</b> cruzando todas las inspecciones.
      </Alert>
      <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
        <TextField size="small" label="Nombre del sistema" value={f.nombre} sx={{ width: 260 }}
          onChange={e => setF({ ...f, nombre: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter' && f.nombre.trim()) guardar.mutate() }} />
        <TextField size="small" label="Orden" type="number" value={f.orden ?? 0} sx={{ width: 100 }}
          onChange={e => setF({ ...f, orden: Number(e.target.value) })} />
        <Button variant="contained" startIcon={<Add />} disabled={!f.nombre?.trim()}
          onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {edicion ? 'Guardar' : 'Agregar'}
        </Button>
        {edicion && (
          <Button onClick={() => { setEdicion(null); setF({ nombre: '', orden: 0 }) }}
            sx={{ textTransform: 'none' }}>Cancelar</Button>
        )}
      </Stack>
      <Card sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['ORDEN', 'SISTEMA', 'PREGUNTAS', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(s => (
              <TableRow key={s.id} hover>
                <TableCell sx={{ width: 70, color: PALETA.acero }}>{s.orden}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{s.nombre}</TableCell>
                <TableCell>{s.preguntas ?? 0}</TableCell>
                <TableCell align="right" sx={{ width: 90 }}>
                  <IconButton size="small" onClick={() => { setEdicion(s); setF({ ...s }) }}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => borrar.mutate(s.id)}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={4} sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Sin sistemas.</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Box>
  )
}

/* ═══ 3 · Banco de preguntas ════════════════════════════════════════════════ */
function Preguntas() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [edicion, setEdicion] = useState<Pregunta | null>(null)
  const [f, setF] = useState<any>({})
  const [filtroSistema, setFiltroSistema] = useState<number | ''>('')
  const [busqueda, setBusqueda] = useState('')

  const { data: sistemas = [] } = useQuery({ queryKey: ['chk-sistemas'], queryFn: () => chkApi.sistemas.listar() })
  const { data: clasificaciones = [] } = useQuery({
    queryKey: ['chk-clasificaciones'], queryFn: () => chkApi.clasificaciones.listar() })
  const { data = [] } = useQuery({
    queryKey: ['chk-preguntas', filtroSistema, busqueda],
    queryFn: () => chkApi.preguntas.listar({
      sistema_id: filtroSistema || undefined, buscar: busqueda || undefined }),
  })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['chk-preguntas'] })
  const guardar = useMutation({
    mutationFn: () => edicion ? chkApi.preguntas.editar(edicion.id, f) : chkApi.preguntas.crear(f),
    onSuccess: () => { invalidar(); setAbierto(false); toast.success('Guardada') },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const borrar = useMutation({
    mutationFn: (id: number) => chkApi.preguntas.borrar(id),
    onSuccess: () => { invalidar(); toast.success('Desactivada') },
  })

  const listo = sistemas.length > 0 && clasificaciones.length > 0

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Las preguntas son un <b>banco global</b>, no propiedad de una plantilla. «Nivel de
        aceite del motor» se escribe una vez y sirve en la preoperacional diaria, en la
        entrega de turno y en la revisión mensual.
      </Alert>
      {!listo && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Antes de crear preguntas hacen falta {sistemas.length === 0 && 'sistemas'}
          {sistemas.length === 0 && clasificaciones.length === 0 && ' y '}
          {clasificaciones.length === 0 && 'clasificaciones'}.
        </Alert>
      )}

      <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
        <TextField size="small" placeholder="Buscar…" value={busqueda} sx={{ width: 240 }}
          onChange={e => setBusqueda(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
        <TextField select size="small" label="Sistema" value={filtroSistema} sx={{ width: 200 }}
          onChange={e => setFiltroSistema(Number(e.target.value) || '')}>
          <MenuItem value="">Todos</MenuItem>
          {sistemas.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<Add />} disabled={!listo}
          onClick={() => {
            setEdicion(null)
            setF({ texto: '', sistema_id: sistemas[0]?.id, clasificacion_id: clasificaciones[0]?.id,
                   critico: false, requiere_foto: false,
                   exige_observacion_no_conforme: true, peso: 1 })
            setAbierto(true)
          }} sx={{ textTransform: 'none', fontWeight: 700 }}>Nueva pregunta</Button>
      </Stack>

      <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['SISTEMA', 'PREGUNTA', 'SE RESPONDE CON', 'ATRIBUTOS', 'EN USO', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(p => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ fontSize: 12, color: PALETA.grafito }}>{p.sistema}</TableCell>
                <TableCell>
                  <Typography variant="body2">{p.texto}</Typography>
                  {p.ayuda && (
                    <Typography variant="caption" color="text.secondary">{p.ayuda}</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{p.clasificacion}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {p.critico && chip('Crítica', ESTADO.peligro)}
                    {p.peso !== 1 && chip(`×${p.peso}`, PALETA.acero)}
                    {p.requiere_foto && chip('Foto', COLOR_MODULO)}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {p.usos ?? 0} {p.usos === 1 ? 'plantilla' : 'plantillas'}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ width: 90 }}>
                  <IconButton size="small" onClick={() => { setEdicion(p); setF({ ...p }); setAbierto(true) }}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => borrar.mutate(p.id)}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={6} sx={{ py: 5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {busqueda || filtroSistema ? 'Nada coincide.' : 'El banco está vacío.'}
                </Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edicion ? 'Editar pregunta' : 'Nueva pregunta'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {edicion && (edicion.usos ?? 0) > 0 && (
              <Alert severity="warning" sx={{ py: 0.25 }}>
                Está en {edicion.usos} plantillas. Editarla las afecta a todas y les sube la
                versión.
              </Alert>
            )}
            <TextField size="small" label="Pregunta" fullWidth value={f.texto ?? ''}
              onChange={e => setF({ ...f, texto: e.target.value })} />
            <TextField size="small" label="Ayuda para quien inspecciona" fullWidth
              value={f.ayuda ?? ''} onChange={e => setF({ ...f, ayuda: e.target.value })}
              helperText="Opcional: cómo se verifica, qué mirar" />
            <Stack direction="row" spacing={1.5}>
              <TextField select size="small" label="Sistema" fullWidth value={f.sistema_id ?? ''}
                onChange={e => setF({ ...f, sistema_id: Number(e.target.value) })}>
                {sistemas.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Se responde con" fullWidth
                value={f.clasificacion_id ?? ''}
                onChange={e => setF({ ...f, clasificacion_id: Number(e.target.value) })}>
                {clasificaciones.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre}{c.tipo !== 'OPCIONES' ? ` (${c.tipo.toLowerCase()})` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField size="small" label="Peso" type="number" value={f.peso ?? 1} sx={{ width: 140 }}
              onChange={e => setF({ ...f, peso: Number(e.target.value) })}
              helperText="Cuánto vale al calcular la conformidad" />
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
                Sin esto la inspección se llena de hallazgos sin contexto que nadie puede accionar
              </Typography></Box>}
              control={<Switch checked={!!f.exige_observacion_no_conforme}
                onChange={e => setF({ ...f, exige_observacion_no_conforme: e.target.checked })} />} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" disabled={!f.texto || !f.sistema_id || !f.clasificacion_id}
            onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/* ═══ 4 · Plantillas ════════════════════════════════════════════════════════ */
function Plantillas({ onArmar }: { onArmar: (id: number) => void }) {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [edicion, setEdicion] = useState<Plantilla | null>(null)
  const [f, setF] = useState<any>({})

  const { data = [], isLoading } = useQuery({
    queryKey: ['chk-plantillas'], queryFn: () => chkApi.plantillas.listar() })
  const { data: categorias = [] } = useQuery({
    queryKey: ['chk-categorias'], queryFn: () => chkApi.categorias.listar() })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['chk-plantillas'] })
  const guardar = useMutation({
    mutationFn: () => edicion ? chkApi.plantillas.editar(edicion.id, f) : chkApi.plantillas.crear(f),
    onSuccess: () => { invalidar(); setAbierto(false); toast.success('Guardada') },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const duplicar = useMutation({
    mutationFn: ({ id, codigo, nombre }: any) => chkApi.duplicar(id, codigo, nombre),
    onSuccess: () => { invalidar(); toast.success('Duplicada con sus preguntas y tipos') },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const borrar = useMutation({
    mutationFn: (id: number) => chkApi.plantillas.borrar(id),
    onSuccess: () => { invalidar(); toast.success('Desactivada') },
  })

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Una plantilla escoge preguntas del banco y declara <b>a qué tipos de activo aplica</b>.
        Al crear una inspección se elige primero el activo, y solo aparecen las plantillas
        configuradas para su tipo.
      </Alert>
      <Stack direction="row" mb={2}>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<Add />}
          onClick={() => {
            setEdicion(null)
            setF({ codigo: '', nombre: '', umbral_aprobacion: 100, critico_reprueba: true,
                   requiere_firma: false, genera_ot: false, pide_medidor: false })
            setAbierto(true)
          }} sx={{ textTransform: 'none', fontWeight: 700 }}>Nueva plantilla</Button>
      </Stack>

      {isLoading ? <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 3 }} /> : (
        <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['CÓDIGO', 'NOMBRE', 'APLICA A', 'PREGUNTAS', 'REGLAS', 'USOS', ''].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map(p => (
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
                  <TableCell>
                    {p.tipos.length === 0 ? (
                      <Tooltip title="Sin tipo declarado no aparecerá al crear una inspección">
                        <Chip label="Sin asignar" size="small" sx={{
                          height: 19, fontSize: 10, fontWeight: 700,
                          bgcolor: `${ESTADO.alerta}1A`, color: ESTADO.alerta }} />
                      </Tooltip>
                    ) : (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {p.tipos.map(t => chip(
                          t.tipo_activo + (t.marca ? ` · ${t.marca}` : ''), COLOR_MODULO))}
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {p.total_preguntas ?? 0}
                    {(p.total_preguntas ?? 0) === 0 && (
                      <Typography variant="caption" display="block" sx={{ color: ESTADO.alerta }}>
                        sin armar
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {chip(`≥${p.umbral_aprobacion}%`, PALETA.grafito)}
                      {p.critico_reprueba && chip('Crítica reprueba', ESTADO.peligro)}
                      {p.requiere_firma && chip('Firma', PALETA.acero)}
                      {p.genera_ot && chip('Abre OT', ESTADO.alerta)}
                    </Stack>
                  </TableCell>
                  <TableCell>{p.ejecuciones ?? 0}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Escoger preguntas y tipos de activo">
                      <IconButton size="small" onClick={() => onArmar(p.id)}>
                        <Rule fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicar">
                      <IconButton size="small" onClick={() => {
                        const codigo = window.prompt('Código de la nueva plantilla')
                        if (!codigo) return
                        const nombre = window.prompt('Nombre', p.nombre)
                        if (!nombre) return
                        duplicar.mutate({ id: p.id, codigo, nombre })
                      }}><ContentCopy fontSize="small" /></IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => { setEdicion(p); setF({ ...p }); setAbierto(true) }}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => borrar.mutate(p.id)}>
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow><TableCell colSpan={7} sx={{ py: 5, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Sin plantillas.</Typography>
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
              <TextField size="small" label="Código" value={f.codigo ?? ''} sx={{ width: 170 }}
                onChange={e => setF({ ...f, codigo: e.target.value })} />
              <TextField size="small" label="Nombre" value={f.nombre ?? ''} fullWidth
                onChange={e => setF({ ...f, nombre: e.target.value })} />
            </Stack>
            <TextField select size="small" label="Categoría" value={f.categoria_id ?? ''}
              onChange={e => setF({ ...f, categoria_id: Number(e.target.value) || null })}>
              <MenuItem value="">—</MenuItem>
              {categorias.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Umbral de aprobación (%)" type="number" fullWidth
                value={f.umbral_aprobacion ?? 100}
                onChange={e => setF({ ...f, umbral_aprobacion: Number(e.target.value) })} />
              <TextField size="small" label="Periodicidad (días)" type="number" fullWidth
                value={f.periodicidad_dias ?? ''} helperText="Vacío = a demanda"
                onChange={e => setF({ ...f,
                  periodicidad_dias: e.target.value === '' ? null : Number(e.target.value) })} />
            </Stack>
            <FormControlLabel label={<Box>
              <Typography variant="body2">Una pregunta crítica no conforme reprueba</Typography>
              <Typography variant="caption" color="text.secondary">
                Sin importar el porcentaje
              </Typography></Box>}
              control={<Switch checked={!!f.critico_reprueba}
                onChange={e => setF({ ...f, critico_reprueba: e.target.checked })} />} />
            <FormControlLabel label="Exige firma"
              control={<Switch checked={!!f.requiere_firma}
                onChange={e => setF({ ...f, requiere_firma: e.target.checked })} />} />
            <FormControlLabel label="Abre orden de trabajo si hay hallazgos"
              control={<Switch checked={!!f.genera_ot}
                onChange={e => setF({ ...f, genera_ot: e.target.checked })} />} />
            <FormControlLabel label="Pide la lectura del equipo"
              control={<Switch checked={!!f.pide_medidor}
                onChange={e => setF({ ...f, pide_medidor: e.target.checked })} />} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" disabled={!f.codigo || !f.nombre}
            onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/* ═══ Armador: escoge preguntas del banco y tipos de activo ═════════════════ */
function Armador({ pid, onVolver }: { pid: number; onVolver: () => void }) {
  const qc = useQueryClient()
  const [seleccion, setSeleccion] = useState<number[] | null>(null)
  const [nuevoTipo, setNuevoTipo] = useState<any>({ tipo_activo: '', marca: '', linea: '' })

  const { data: estructura, isLoading } = useQuery({
    queryKey: ['chk-estructura', pid], queryFn: () => chkApi.estructura(pid) })
  const { data: banco = [] } = useQuery({
    queryKey: ['chk-preguntas', '', ''], queryFn: () => chkApi.preguntas.listar() })
  const { data: tipos = [] } = useQuery({
    queryKey: ['chk-tipos', pid], queryFn: () => chkApi.tipos.listar(pid) })
  const { data: filtros } = useQuery<{ tipos: string[]; marcas: string[] }>({
    queryKey: ['eam-dash-filtros'],
    queryFn: () => api.get('/eam/dashboard/filtros').then(r => r.data) })

  const plantilla: Plantilla | undefined = estructura?.plantilla
  const yaUsada = (plantilla?.ejecuciones ?? 0) > 0

  // Las escogidas salen de la estructura hasta que el usuario toque algo.
  const escogidas: number[] = useMemo(() => seleccion ?? (
    estructura?.sistemas?.flatMap((s: any) =>
      s.preguntas.map((q: any) => q.pregunta_id as number)) ?? []
  ), [seleccion, estructura])

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['chk-estructura', pid] })
    qc.invalidateQueries({ queryKey: ['chk-plantillas'] })
    qc.invalidateQueries({ queryKey: ['chk-preguntas'] })
  }

  const guardar = useMutation({
    mutationFn: () => chkApi.fijarPreguntas(pid, escogidas),
    onSuccess: (r: any) => {
      invalidar(); setSeleccion(null)
      toast.success(`${r.total} preguntas en la plantilla`)
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const agregarTipo = useMutation({
    mutationFn: () => chkApi.tipos.agregar(pid, {
      tipo_activo: nuevoTipo.tipo_activo,
      marca: nuevoTipo.marca || null, linea: nuevoTipo.linea || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chk-tipos', pid] })
      qc.invalidateQueries({ queryKey: ['chk-plantillas'] })
      setNuevoTipo({ tipo_activo: '', marca: '', linea: '' })
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const quitarTipo = useMutation({
    mutationFn: (tid: number) => chkApi.tipos.quitar(tid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chk-tipos', pid] })
      qc.invalidateQueries({ queryKey: ['chk-plantillas'] })
    },
  })

  const porSistema = useMemo(() => {
    const g: Record<string, Pregunta[]> = {}
    for (const p of banco) (g[p.sistema ?? 'Sin sistema'] ??= []).push(p)
    return g
  }, [banco])

  const alternar = (id: number) =>
    setSeleccion(escogidas.includes(id)
      ? escogidas.filter(x => x !== id) : [...escogidas, id])

  const cambiado = seleccion !== null

  return (
    <Box className="anim-page-in">
      <Stack direction="row" alignItems="flex-start" spacing={2} mb={2}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800}>
            {plantilla?.codigo} · {plantilla?.nombre}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Versión {plantilla?.version} · {escogidas.length} preguntas escogidas del banco
          </Typography>
        </Box>
        {cambiado && (
          <Button variant="contained" onClick={() => guardar.mutate()} disabled={guardar.isPending}
            sx={{ textTransform: 'none', fontWeight: 700 }}>Guardar selección</Button>
        )}
        <Button startIcon={<ArrowBack />} onClick={onVolver} sx={{ textTransform: 'none' }}>
          Volver
        </Button>
      </Stack>

      {yaUsada && (
        <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}>
          Esta plantilla ya tiene inspecciones hechas. Cambiar sus preguntas sube la versión;
          las inspecciones anteriores conservan la suya y se siguen viendo como se firmaron.
        </Alert>
      )}

      {/* ── Tipos de activo ── */}
      <Card sx={{ borderRadius: 3, p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={800}>Aplica a estos activos</Typography>
        <Typography variant="caption" color="text.secondary">
          Al crear una inspección y elegir el activo, esta plantilla solo aparecerá si su tipo
          está acá. La marca y la línea son opcionales: vacías significan «cualquiera».
        </Typography>
        <Stack direction="row" spacing={0.75} mt={1.5} mb={1.5} flexWrap="wrap" useFlexGap>
          {tipos.map(t => (
            <Chip key={t.id} onDelete={() => quitarTipo.mutate(t.id)}
              label={[t.tipo_activo, t.marca, t.linea].filter(Boolean).join(' › ')}
              sx={{ fontWeight: 700 }} />
          ))}
          {tipos.length === 0 && (
            <Typography variant="caption" sx={{ color: ESTADO.alerta, fontWeight: 700 }}>
              Sin tipos declarados: esta plantilla no aparecerá al crear una inspección.
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label="Tipo de activo" sx={{ minWidth: 180 }}
            value={nuevoTipo.tipo_activo}
            onChange={e => setNuevoTipo({ ...nuevoTipo, tipo_activo: e.target.value })}>
            {(filtros?.tipos ?? []).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Marca (opcional)" sx={{ minWidth: 160 }}
            value={nuevoTipo.marca}
            onChange={e => setNuevoTipo({ ...nuevoTipo, marca: e.target.value })}>
            <MenuItem value="">Todas</MenuItem>
            {(filtros?.marcas ?? []).map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Línea (opcional)" sx={{ width: 150 }}
            value={nuevoTipo.linea}
            onChange={e => setNuevoTipo({ ...nuevoTipo, linea: e.target.value })} />
          <Button startIcon={<Add />} disabled={!nuevoTipo.tipo_activo}
            onClick={() => agregarTipo.mutate()} sx={{ textTransform: 'none' }}>Agregar</Button>
        </Stack>
      </Card>

      {/* ── Selección de preguntas ── */}
      <Card sx={{ borderRadius: 3, p: 2 }}>
        <Typography variant="subtitle2" fontWeight={800}>Preguntas del banco</Typography>
        <Typography variant="caption" color="text.secondary">
          Marque las que componen este checklist. Se usan las mismas del banco, no copias.
        </Typography>
        {isLoading ? <Skeleton variant="rectangular" height={240} sx={{ mt: 2 }} /> : (
          <Box mt={2}>
            {Object.entries(porSistema).map(([sistema, preguntas]) => (
              <Box key={sistema} mb={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="caption" sx={{
                    fontWeight: 800, letterSpacing: '0.08em', color: PALETA.grafito }}>
                    {sistema.toUpperCase()}
                  </Typography>
                  <Button size="small" sx={{ textTransform: 'none', fontSize: 11 }}
                    onClick={() => {
                      const ids = preguntas.map(p => p.id)
                      const todas = ids.every(i => escogidas.includes(i))
                      setSeleccion(todas ? escogidas.filter(i => !ids.includes(i))
                                         : [...new Set([...escogidas, ...ids])])
                    }}>
                    {preguntas.every(p => escogidas.includes(p.id)) ? 'Quitar todas' : 'Marcar todas'}
                  </Button>
                </Stack>
                <Stack spacing={0.5} mt={0.5}>
                  {preguntas.map(p => (
                    <Stack key={p.id} direction="row" alignItems="center" spacing={1}
                      onClick={() => alternar(p.id)}
                      sx={{ cursor: 'pointer', px: 1, py: 0.5, borderRadius: 1.5,
                            bgcolor: escogidas.includes(p.id) ? `${COLOR_MODULO}0D` : undefined,
                            '&:hover': { bgcolor: PALETA.bruma } }}>
                      <Checkbox size="small" checked={escogidas.includes(p.id)} />
                      <Typography variant="body2" sx={{ flex: 1 }}>{p.texto}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.clasificacion}
                      </Typography>
                      {p.critico && chip('Crítica', ESTADO.peligro)}
                      {p.peso !== 1 && chip(`×${p.peso}`, PALETA.acero)}
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ))}
            {banco.length === 0 && (
              <Typography variant="body2" sx={{ py: 3, textAlign: 'center', color: PALETA.acero }}>
                El banco está vacío. Cree preguntas antes de armar la plantilla.
              </Typography>
            )}
          </Box>
        )}
      </Card>
    </Box>
  )
}

/* ═══ 5 · Hallazgos y categorías ════════════════════════════════════════════ */
function Catalogos() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [edicion, setEdicion] = useState<Hallazgo | null>(null)
  const [f, setF] = useState<any>({})
  const [categoria, setCategoria] = useState('')

  const { data: hallazgos = [] } = useQuery({
    queryKey: ['chk-hallazgos'], queryFn: () => chkApi.hallazgos.listar() })
  const { data: categorias = [] } = useQuery({
    queryKey: ['chk-categorias'], queryFn: () => chkApi.categorias.listar() })

  const guardar = useMutation({
    mutationFn: () => edicion ? chkApi.hallazgos.editar(edicion.id, f) : chkApi.hallazgos.crear(f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chk-hallazgos'] }); setAbierto(false)
      toast.success('Guardado')
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const crearCategoria = useMutation({
    mutationFn: () => chkApi.categorias.crear({ nombre: categoria }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chk-categorias'] }); setCategoria('')
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Tipificar los hallazgos permite pasar de «hubo 40 no conformidades» a «la fuga de
        aceite aparece en 12 equipos de la misma línea». Un texto libre no agrupa.
      </Alert>
      <Stack direction="row" mb={2}>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<Add />}
          onClick={() => { setEdicion(null); setF({ severidad: 'MODERADO', genera_ot: false }); setAbierto(true) }}
          sx={{ textTransform: 'none', fontWeight: 700 }}>Nuevo hallazgo</Button>
      </Stack>
      <Card sx={{ borderRadius: 3, overflow: 'auto', mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['CÓDIGO', 'NOMBRE', 'CATEGORÍA', 'SEVERIDAD', 'ACCIÓN SUGERIDA', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {hallazgos.map(h => (
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
                  <IconButton size="small" onClick={() => chkApi.hallazgos.borrar(h.id)
                    .then(() => qc.invalidateQueries({ queryKey: ['chk-hallazgos'] }))}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {hallazgos.length === 0 && (
              <TableRow><TableCell colSpan={6} sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Sin hallazgos.</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Typography variant="subtitle2" fontWeight={800} mb={1}>Categorías de plantilla</Typography>
      <Typography variant="caption" color="text.secondary">
        Agrupan las plantillas en los informes: preoperacional, seguridad, entrega de turno.
      </Typography>
      <Stack direction="row" spacing={1.5} mt={1.5} mb={1.5}>
        <TextField size="small" label="Nueva categoría" value={categoria} sx={{ width: 260 }}
          onChange={e => setCategoria(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && categoria.trim()) crearCategoria.mutate() }} />
        <Button startIcon={<Add />} disabled={!categoria.trim()}
          onClick={() => crearCategoria.mutate()} sx={{ textTransform: 'none' }}>Agregar</Button>
      </Stack>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {categorias.map((c: Categoria) => (
          <Chip key={c.id} label={c.nombre}
            onDelete={() => chkApi.categorias.borrar(c.id)
              .then(() => qc.invalidateQueries({ queryKey: ['chk-categorias'] }))} />
        ))}
      </Stack>

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
            <FormControlLabel label="Abre orden de trabajo por sí solo"
              control={<Switch checked={!!f.genera_ot}
                onChange={e => setF({ ...f, genera_ot: e.target.checked })} />} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" disabled={!f.codigo || !f.nombre}
            onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
