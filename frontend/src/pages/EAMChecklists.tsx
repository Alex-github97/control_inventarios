/**
 * Checklists e inspecciones — operación.
 *
 * Antes eran 1.234 líneas sin una sola llamada de red. Ahora todo sale de
 * `/eam/chk`.
 *
 * La pantalla de llenado guarda a medida que se responde, no al final: una
 * inspección de cuarenta preguntas en un patio con mala señal no se puede
 * perder porque falte una.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, Chip, Alert, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Tabs, Tab,
  Divider, ToggleButton, ToggleButtonGroup, LinearProgress, InputAdornment,
  Avatar,
} from '@mui/material'
import {
  Add, Search, Settings, PhotoCamera, CheckCircle, Cancel, RemoveCircleOutline,
  FactCheck, WarningAmber, Assignment, DeleteOutline, Send, Visibility,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { apiClient as api } from '@/api/client'
import {
  chkApi, ETIQUETA_RESULTADO,
  type Ejecucion, type DetalleEjecucion, type ItemEnEjecucion, type Hallazgo,
} from '@/api/checklists'

const mensaje = (e: any) =>
  e?.response?.data?.detail ?? e?.message ?? 'No se pudo completar la operación'

const fecha = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const colorResultado = (r?: string | null) =>
  r === 'APROBADO' ? ESTADO.exito
    : r === 'APROBADO_CON_OBSERVACIONES' ? ESTADO.alerta
    : r === 'RECHAZADO' ? ESTADO.peligro : PALETA.acero

function Resultado({ valor }: { valor?: string | null }) {
  const color = colorResultado(valor)
  return (
    <Chip label={ETIQUETA_RESULTADO[valor ?? 'PENDIENTE'] ?? valor} size="small" sx={{
      height: 21, fontSize: 10.5, fontWeight: 800,
      bgcolor: `${color}1F`, color,
    }} />
  )
}

export default function EAMChecklists() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [abriendo, setAbriendo] = useState(false)
  const [llenando, setLlenando] = useState<number | null>(null)

  const { data: ejecuciones = [], isLoading } = useQuery({
    queryKey: ['chk-ejecuciones'], queryFn: () => chkApi.ejecuciones.listar(),
  })
  const { data: pendientes = [] } = useQuery({
    queryKey: ['chk-pendientes'], queryFn: () => chkApi.pendientes(),
  })
  const { data: analitica } = useQuery({
    queryKey: ['chk-analitica'], queryFn: () => chkApi.analitica(),
  })
  const { data: plantillas = [] } = useQuery({
    queryKey: ['chk-plantillas'], queryFn: () => chkApi.plantillas.listar(),
  })

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['chk-ejecuciones'] })
    qc.invalidateQueries({ queryKey: ['chk-pendientes'] })
    qc.invalidateQueries({ queryKey: ['chk-analitica'] })
  }

  const filtradas = ejecuciones.filter(e =>
    !busqueda || `${e.numero} ${e.activo_codigo} ${e.plantilla}`
      .toLowerCase().includes(busqueda.toLowerCase()))

  const rechazadas = ejecuciones.filter(e => e.resultado === 'RECHAZADO')
  const vencidas = pendientes.filter(p => p.estado === 'VENCIDA')

  return (
    <Layout title="Inspecciones y checklists">
      <Box className="anim-page-in">
        <Stack direction="row" alignItems="flex-start" spacing={2} mb={2.5} flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography variant="h6" fontWeight={800}>Inspecciones y checklists</Typography>
            <Typography variant="caption" color="text.secondary">
              Con evidencia fotográfica, hallazgos tipificados y orden de trabajo automática
            </Typography>
          </Box>
          <Button startIcon={<Settings />} variant="outlined"
            onClick={() => navigate('/eam/checklists/config')} sx={{ textTransform: 'none' }}>
            Plantillas
          </Button>
          <Button startIcon={<Add />} variant="contained" onClick={() => setAbriendo(true)}
            disabled={plantillas.length === 0}
            sx={{ textTransform: 'none', fontWeight: 700 }}>
            Nueva inspección
          </Button>
        </Stack>

        {plantillas.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }} action={
            <Button size="small" onClick={() => navigate('/eam/checklists/config')}>
              Crear plantilla
            </Button>
          }>
            No hay plantillas todavía. Una plantilla define qué se revisa, con qué peso y qué
            se considera crítico.
          </Alert>
        )}

        {vencidas.length > 0 && (
          <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}>
            Hay {vencidas.length} {vencidas.length === 1 ? 'inspección vencida' : 'inspecciones vencidas'}:{' '}
            {vencidas.slice(0, 3).map(p => `${p.activo} · ${p.codigo}`).join(' · ')}
          </Alert>
        )}

        {rechazadas.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {rechazadas.length} {rechazadas.length === 1 ? 'inspección rechazada' : 'inspecciones rechazadas'}.
            Esos equipos no deberían estar operando sin revisión.
          </Alert>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 2.5, borderBottom: `1px solid ${PALETA.niebla}` }}>
          <Tab label={`Inspecciones (${ejecuciones.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label={`Programadas (${pendientes.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Tablero" sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>

        {tab === 0 && (
          <Box>
            <TextField size="small" placeholder="Buscar por número, activo o plantilla…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
              sx={{ mb: 2, width: 340 }} />
            {isLoading ? <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} /> : (
              <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['NÚMERO', 'ACTIVO', 'PLANTILLA', 'FECHA', 'CONFORMIDAD',
                        'RESULTADO', 'ESTADO', ''].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtradas.map(e => (
                      <TableRow key={e.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {e.numero}
                          {(e.fotos ?? 0) > 0 && (
                            <Tooltip title={`${e.fotos} evidencias`}>
                              <PhotoCamera sx={{ fontSize: 13, ml: 0.5, color: PALETA.acero }} />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {e.activo_codigo}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {e.activo_nombre}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{e.plantilla}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            v{e.plantilla_version}
                          </Typography>
                        </TableCell>
                        <TableCell>{fecha(e.fecha_inicio)}</TableCell>
                        <TableCell>
                          {e.pct_conforme != null ? (
                            <Box sx={{ minWidth: 90 }}>
                              <Typography variant="caption" sx={{ fontWeight: 800 }}>
                                {e.pct_conforme}%
                              </Typography>
                              <LinearProgress variant="determinate" value={e.pct_conforme} sx={{
                                mt: 0.3, height: 5, borderRadius: 99, bgcolor: PALETA.niebla,
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 99, bgcolor: colorResultado(e.resultado) },
                              }} />
                              {e.no_conformes > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  {e.no_conformes} hallazgos
                                  {e.criticos_no_conformes > 0 && ` · ${e.criticos_no_conformes} críticos`}
                                </Typography>
                              )}
                            </Box>
                          ) : '—'}
                        </TableCell>
                        <TableCell><Resultado valor={e.resultado} /></TableCell>
                        <TableCell>
                          <Chip label={e.estado === 'BORRADOR' ? 'En curso'
                            : e.estado === 'COMPLETADA' ? 'Cerrada' : 'Anulada'} size="small" sx={{
                              height: 19, fontSize: 10, fontWeight: 700,
                              bgcolor: e.estado === 'BORRADOR' ? `${COLOR_MODULO}1A` : `${PALETA.acero}1A`,
                              color: e.estado === 'BORRADOR' ? COLOR_MODULO : PALETA.grafito }} />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title={e.estado === 'BORRADOR' ? 'Continuar' : 'Ver'}>
                            <IconButton size="small" onClick={() => setLlenando(e.id)}>
                              {e.estado === 'BORRADOR'
                                ? <Assignment fontSize="small" />
                                : <Visibility fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          {e.ot_id && (
                            <Tooltip title="Ver la orden de trabajo generada">
                              <IconButton size="small"
                                onClick={() => navigate('/eam/ordenes-trabajo')}>
                                <Send fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtradas.length === 0 && (
                      <TableRow><TableCell colSpan={8} sx={{ py: 5, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Todavía no hay inspecciones registradas.
                        </Typography>
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['ACTIVO', 'PLANTILLA', 'ÚLTIMA', 'PRÓXIMA', 'ESTADO', ''].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pendientes.map(p => (
                  <TableRow key={`${p.plantilla_id}-${p.activo_id}`} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.activo}</TableCell>
                    <TableCell>{p.plantilla}</TableCell>
                    <TableCell>{fecha(p.ultima_fecha)}</TableCell>
                    <TableCell>{fecha(p.proxima_fecha)}</TableCell>
                    <TableCell>
                      <Chip label={p.estado === 'VENCIDA'
                        ? `Vencida hace ${Math.abs(p.dias)} d` : `En ${p.dias} d`}
                        size="small" sx={{
                          height: 20, fontSize: 10, fontWeight: 700,
                          bgcolor: p.estado === 'VENCIDA' ? `${ESTADO.peligro}1A` : `${ESTADO.alerta}1A`,
                          color: p.estado === 'VENCIDA' ? ESTADO.peligro : ESTADO.alerta }} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" sx={{ textTransform: 'none' }}
                        onClick={() => setAbriendo(true)}>Inspeccionar</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pendientes.length === 0 && (
                  <TableRow><TableCell colSpan={6} sx={{ py: 5, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Nada programado en los próximos días.
                    </Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {tab === 2 && analitica && (
          <Box>
            <Card sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap
                divider={<Divider orientation="vertical" flexItem />}>
                <Box sx={{ flex: 1, minWidth: 130 }}>
                  <Typography variant="caption" color="text.secondary">Inspecciones</Typography>
                  <Typography variant="h6" fontWeight={800}>{analitica.total}</Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Typography variant="caption" color="text.secondary">Conformidad promedio</Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {analitica.promedio_conformidad != null
                      ? `${analitica.promedio_conformidad}%` : '—'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 130 }}>
                  <Typography variant="caption" color="text.secondary">Rechazadas</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{
                    color: analitica.rechazadas ? ESTADO.peligro : ESTADO.exito }}>
                    {analitica.rechazadas}
                  </Typography>
                </Box>
              </Stack>
            </Card>

            <Box sx={{ display: 'grid', gap: 2,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Card sx={{ borderRadius: 3, p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={800}>Lo que más se reprueba</Typography>
                <Typography variant="caption" color="text.secondary">
                  Donde hay que actuar primero
                </Typography>
                <Stack spacing={1} mt={2}>
                  {analitica.items_mas_reprobados.map(i => (
                    <Stack key={i.etiqueta} direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" sx={{ flex: 1 }}>{i.etiqueta}</Typography>
                      {i.critico && <Chip label="Crítico" size="small" sx={{
                        height: 17, fontSize: 9, fontWeight: 800,
                        bgcolor: `${ESTADO.peligro}1A`, color: ESTADO.peligro }} />}
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>{i.cantidad}</Typography>
                    </Stack>
                  ))}
                  {analitica.items_mas_reprobados.length === 0 && (
                    <Typography variant="body2" sx={{ py: 2, textAlign: 'center', color: PALETA.acero }}>
                      Sin hallazgos en el periodo
                    </Typography>
                  )}
                </Stack>
              </Card>

              <Card sx={{ borderRadius: 3, p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={800}>Hallazgos tipificados</Typography>
                <Typography variant="caption" color="text.secondary">
                  Agrupados por el catálogo, no por texto libre
                </Typography>
                <Stack spacing={1} mt={2}>
                  {analitica.hallazgos.map(h => (
                    <Stack key={h.etiqueta} direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" sx={{ flex: 1 }}>{h.etiqueta}</Typography>
                      <Chip label={h.severidad} size="small" sx={{
                        height: 17, fontSize: 9, fontWeight: 700,
                        bgcolor: h.severidad === 'GRAVE' ? `${ESTADO.peligro}1A` : `${ESTADO.alerta}1A`,
                        color: h.severidad === 'GRAVE' ? ESTADO.peligro : ESTADO.alerta }} />
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>{h.cantidad}</Typography>
                    </Stack>
                  ))}
                  {analitica.hallazgos.length === 0 && (
                    <Typography variant="body2" sx={{ py: 2, textAlign: 'center', color: PALETA.acero }}>
                      Sin hallazgos catalogados
                    </Typography>
                  )}
                </Stack>
              </Card>
            </Box>
          </Box>
        )}

        {abriendo && (
          <DialogoAbrir onCerrar={() => setAbriendo(false)}
            onAbierta={id => { setAbriendo(false); refrescar(); setLlenando(id) }} />
        )}
        {llenando && (
          <DialogoLlenar eid={llenando} onCerrar={() => { setLlenando(null); refrescar() }} />
        )}
      </Box>
    </Layout>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Abrir una inspección: plantilla + activo.
   ═══════════════════════════════════════════════════════════════════════════ */
function DialogoAbrir({ onCerrar, onAbierta }: {
  onCerrar: () => void; onAbierta: (id: number) => void
}) {
  const [plantilla, setPlantilla] = useState<number | ''>('')
  const [activo, setActivo] = useState<number | ''>('')
  const [medidor, setMedidor] = useState('')

  const { data: plantillas = [] } = useQuery({
    queryKey: ['chk-plantillas'], queryFn: () => chkApi.plantillas.listar(),
  })
  const { data: activos = [] } = useQuery<any[]>({
    queryKey: ['eam-activos-chk'],
    queryFn: () => api.get('/eam/activos').then(r =>
      Array.isArray(r.data) ? r.data : (r.data?.items ?? [])),
  })

  const elegida = plantillas.find(p => p.id === plantilla)

  // El alcance de la plantilla filtra los activos: ofrecer un montacargas para
  // una preoperacional de tractocamión solo invita a equivocarse.
  const candidatos = useMemo(() => activos.filter(a =>
    !elegida
    || ((!elegida.tipo_activo || a.tipo_activo === elegida.tipo_activo)
        && (!elegida.marca || a.marca === elegida.marca)
        && (!elegida.linea || a.linea === elegida.linea))), [activos, elegida])

  const abrir = useMutation({
    mutationFn: () => chkApi.ejecuciones.abrir({
      plantilla_id: plantilla, activo_id: activo,
      odometro: medidor === '' ? null : Number(medidor),
    }),
    onSuccess: (e) => { toast.success(`Inspección ${e.numero} abierta`); onAbierta(e.id) },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Nueva inspección</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField select size="small" label="Plantilla" value={plantilla}
            onChange={e => { setPlantilla(Number(e.target.value) || ''); setActivo('') }}>
            {plantillas.map(p => (
              <MenuItem key={p.id} value={p.id}>
                {p.codigo} · {p.nombre} (v{p.version}, {p.total_items ?? 0} preguntas)
              </MenuItem>
            ))}
          </TextField>
          {elegida && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Aprueba desde {elegida.umbral_aprobacion}% de conformidad
              {elegida.critico_reprueba && ' · un ítem crítico no conforme la rechaza'}
              {elegida.requiere_firma && ' · exige firma'}
              {elegida.genera_ot && ' · abre orden de trabajo si hay hallazgos'}
            </Alert>
          )}
          <TextField select size="small" label="Activo" value={activo}
            disabled={!plantilla}
            helperText={elegida && candidatos.length < activos.length
              ? `Filtrado por el alcance de la plantilla: ${candidatos.length} de ${activos.length} activos`
              : undefined}
            onChange={e => setActivo(Number(e.target.value) || '')}>
            {candidatos.map(a => (
              <MenuItem key={a.id} value={a.id}>{a.codigo} · {a.nombre}</MenuItem>
            ))}
          </TextField>
          {elegida?.pide_medidor && (
            <TextField size="small" label="Lectura del equipo" type="number" value={medidor}
              onChange={e => setMedidor(e.target.value)}
              helperText="Kilometraje u horómetro al momento de la inspección" />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" disabled={!plantilla || !activo || abrir.isPending}
          onClick={() => abrir.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {abrir.isPending ? 'Abriendo…' : 'Comenzar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Llenar la inspección. Guarda a medida, no al final.
   ═══════════════════════════════════════════════════════════════════════════ */
function DialogoLlenar({ eid, onCerrar }: { eid: number; onCerrar: () => void }) {
  const qc = useQueryClient()
  const [borrador, setBorrador] = useState<Record<number, any>>({})
  const [firma, setFirma] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const { data, isLoading } = useQuery<DetalleEjecucion>({
    queryKey: ['chk-ejecucion', eid], queryFn: () => chkApi.ejecuciones.detalle(eid),
  })
  const { data: hallazgos = [] } = useQuery({
    queryKey: ['chk-hallazgos'], queryFn: () => chkApi.hallazgos.listar(),
  })

  const cerrada = data?.ejecucion.estado !== 'BORRADOR'

  // Se parte de lo ya guardado para que reabrir una inspección a medias no la
  // muestre en blanco.
  useEffect(() => {
    if (!data) return
    const inicial: Record<number, any> = {}
    for (const s of data.secciones) {
      for (const i of s.items) {
        if (i.respuesta) {
          inicial[i.item_id] = {
            valor_texto: i.respuesta.valor_texto, valor_numero: i.respuesta.valor_numero,
            valor_bool: i.respuesta.valor_bool, observacion: i.respuesta.observacion,
            hallazgo_id: i.respuesta.hallazgo_id, no_aplica: i.respuesta.no_aplica,
          }
        }
      }
    }
    setBorrador(inicial)
    setObservaciones(data.ejecucion.observaciones ?? '')
    setFirma(data.ejecucion.firma_nombre ?? '')
  }, [data])

  const guardar = useMutation({
    mutationFn: (respuestas: any[]) => chkApi.ejecuciones.guardar(eid, respuestas),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chk-ejecucion', eid] }),
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const cerrar = useMutation({
    mutationFn: () => chkApi.ejecuciones.cerrar(eid, {
      firma_nombre: firma || null, observaciones: observaciones || null }),
    onSuccess: (r: any) => {
      toast.success(
        `${ETIQUETA_RESULTADO[r.resultado] ?? r.resultado} · ${r.pct_conforme ?? 0}% conforme`
        + (r.ot_creada ? ` · se abrió ${r.ot_creada.numero}` : ''),
        { duration: 6000 })
      onCerrar()
    },
    onError: (e: any) => toast.error(mensaje(e), { duration: 7000 }),
  })

  const subir = useMutation({
    mutationFn: ({ archivo, item_id }: { archivo: File; item_id: number }) => {
      const respuesta = data?.secciones.flatMap(s => s.items)
        .find(i => i.item_id === item_id)?.respuesta
      return chkApi.ejecuciones.subirFoto(eid, archivo, respuesta?.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chk-ejecucion', eid] })
      toast.success('Evidencia cargada')
    },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  /** Guarda un ítem apenas se responde. Una inspección larga no se puede perder. */
  const responder = (item_id: number, cambio: Record<string, any>) => {
    const actual = { ...(borrador[item_id] ?? {}), ...cambio }
    setBorrador(prev => ({ ...prev, [item_id]: actual }))
    guardar.mutate([{ item_id, ...actual }])
  }

  const items = data?.secciones.flatMap(s => s.items) ?? []
  const respondidos = items.filter(i => {
    const b = borrador[i.item_id]
    return b && (b.valor_bool != null || b.valor_numero != null
                 || (b.valor_texto ?? '') !== '' || b.no_aplica)
  }).length
  const avance = items.length ? Math.round(respondidos / items.length * 100) : 0

  return (
    <Dialog open onClose={onCerrar} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={800}>
              {data?.ejecucion.numero} · {data?.plantilla?.nombre}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {data?.activo?.codigo} · {data?.activo?.nombre}
              {data?.ejecucion.ejecutado_por && ` · ${data.ejecucion.ejecutado_por}`}
            </Typography>
          </Box>
          {cerrada && <Resultado valor={data?.ejecucion.resultado} />}
        </Stack>
        {!cerrada && (
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                {respondidos} de {items.length} respondidas
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{avance}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={avance} sx={{
              mt: 0.4, height: 5, borderRadius: 99, bgcolor: PALETA.niebla,
              '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: COLOR_MODULO } }} />
          </Box>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {isLoading || !data ? <Skeleton variant="rectangular" height={320} /> : (
          <Box>
            {data.version_desactualizada && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Esta inspección se llenó con la versión {data.ejecucion.plantilla_version} de la
                plantilla y la actual es la {data.plantilla?.version_actual}. Se conserva como
                se firmó: las preguntas pueden no coincidir con las de una inspección reciente.
              </Alert>
            )}

            {data.secciones.map(seccion => (
              <Box key={String(seccion.id)} mb={2.5}>
                <Typography variant="caption" sx={{
                  fontWeight: 800, letterSpacing: '0.08em', color: PALETA.grafito }}>
                  {seccion.nombre.toUpperCase()}
                </Typography>
                <Stack spacing={1.25} mt={1}>
                  {seccion.items.map(item => (
                    <FilaItem key={item.item_id} item={item} valor={borrador[item.item_id] ?? {}}
                      hallazgos={hallazgos} soloLectura={cerrada}
                      onCambio={c => responder(item.item_id, c)}
                      onFoto={f => subir.mutate({ archivo: f, item_id: item.item_id })} />
                  ))}
                </Stack>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              <TextField size="small" label="Observaciones generales" multiline rows={2}
                value={observaciones} disabled={cerrada}
                onChange={e => setObservaciones(e.target.value)} />
              {data.plantilla?.requiere_firma && (
                <TextField size="small" label="Firma de quien inspecciona" value={firma}
                  disabled={cerrada} required
                  onChange={e => setFirma(e.target.value)}
                  helperText="Esta plantilla exige firma para poder cerrarse" />
              )}
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>
          {cerrada ? 'Cerrar' : 'Guardar y salir'}
        </Button>
        {!cerrada && (
          <Button variant="contained" disabled={cerrar.isPending}
            onClick={() => cerrar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            {cerrar.isPending ? 'Cerrando…' : 'Cerrar inspección'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

/** Una pregunta con su control según el tipo. */
function FilaItem({ item, valor, hallazgos, soloLectura, onCambio, onFoto }: {
  item: ItemEnEjecucion; valor: Record<string, any>; hallazgos: Hallazgo[]
  soloLectura: boolean
  onCambio: (c: Record<string, any>) => void
  onFoto: (f: File) => void
}) {
  const noConforme = valor.valor_bool === false
    || (item.tipo === 'NUMERO' && valor.valor_numero != null
        && ((item.valor_min != null && valor.valor_numero < item.valor_min)
            || (item.valor_max != null && valor.valor_numero > item.valor_max)))

  const fotos = item.respuesta?.fotos ?? []

  return (
    <Card variant="outlined" sx={{
      p: 1.5, borderRadius: 2,
      borderLeft: `3px solid ${valor.no_aplica ? PALETA.acero
        : noConforme ? ESTADO.peligro
        : valor.valor_bool === true ? ESTADO.exito : PALETA.niebla}`,
    }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start" flexWrap="wrap" useFlexGap>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.pregunta}</Typography>
            {item.critico && <Chip label="Crítico" size="small" sx={{
              height: 16, fontSize: 9, fontWeight: 800,
              bgcolor: `${ESTADO.peligro}1A`, color: ESTADO.peligro }} />}
            {item.peso !== 1 && (
              <Tooltip title="Peso al calcular la conformidad">
                <Chip label={`×${item.peso}`} size="small" sx={{
                  height: 16, fontSize: 9, fontWeight: 700,
                  bgcolor: `${PALETA.acero}1A`, color: PALETA.grafito }} />
              </Tooltip>
            )}
          </Stack>
          {item.ayuda && (
            <Typography variant="caption" color="text.secondary">{item.ayuda}</Typography>
          )}
          {item.tipo === 'NUMERO' && (item.valor_min != null || item.valor_max != null) && (
            <Typography variant="caption" display="block" color="text.secondary">
              Rango aceptable: {item.valor_min ?? '—'} a {item.valor_max ?? '—'} {item.unidad}
            </Typography>
          )}
        </Box>

        <Box>
          {(item.tipo === 'CONFORME_NO' || item.tipo === 'SI_NO') && (
            <ToggleButtonGroup exclusive size="small" disabled={soloLectura}
              value={valor.no_aplica ? 'na' : valor.valor_bool === true ? 'si'
                : valor.valor_bool === false ? 'no' : null}
              onChange={(_, v) => {
                if (v === null) return
                onCambio(v === 'na'
                  ? { no_aplica: true, valor_bool: null }
                  : { no_aplica: false, valor_bool: v === 'si' })
              }}>
              <ToggleButton value="si" sx={{ textTransform: 'none', px: 1.5 }}>
                <CheckCircle sx={{ fontSize: 16, mr: 0.5,
                  color: valor.valor_bool === true ? ESTADO.exito : 'inherit' }} />
                {item.tipo === 'SI_NO' ? 'Sí' : 'Conforme'}
              </ToggleButton>
              <ToggleButton value="no" sx={{ textTransform: 'none', px: 1.5 }}>
                <Cancel sx={{ fontSize: 16, mr: 0.5,
                  color: valor.valor_bool === false ? ESTADO.peligro : 'inherit' }} />
                No
              </ToggleButton>
              <Tooltip title="El equipo no tiene este componente. Sale del cálculo en vez de contar como fallo.">
                <ToggleButton value="na" sx={{ textTransform: 'none', px: 1.5 }}>
                  <RemoveCircleOutline sx={{ fontSize: 16, mr: 0.5 }} />N/A
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          )}
          {item.tipo === 'NUMERO' && (
            <TextField size="small" type="number" sx={{ width: 150 }} disabled={soloLectura}
              label={item.unidad ?? 'Valor'} value={valor.valor_numero ?? ''}
              onChange={e => onCambio({
                valor_numero: e.target.value === '' ? null : Number(e.target.value) })} />
          )}
          {(item.tipo === 'TEXTO' || item.tipo === 'FECHA') && (
            <TextField size="small" sx={{ width: 200 }} disabled={soloLectura}
              type={item.tipo === 'FECHA' ? 'date' : 'text'}
              InputLabelProps={item.tipo === 'FECHA' ? { shrink: true } : undefined}
              value={valor.valor_texto ?? ''}
              onChange={e => onCambio({ valor_texto: e.target.value })} />
          )}
          {item.tipo === 'OPCIONES' && (
            <TextField select size="small" sx={{ width: 190 }} disabled={soloLectura}
              value={valor.valor_texto ?? ''}
              onChange={e => onCambio({ valor_texto: e.target.value })}>
              {(item.opciones ?? []).map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
          )}
          {item.tipo === 'RANGO' && (
            <ToggleButtonGroup exclusive size="small" disabled={soloLectura}
              value={valor.valor_numero ?? null}
              onChange={(_, v) => v != null && onCambio({ valor_numero: v })}>
              {[1, 2, 3, 4, 5].map(n => (
                <ToggleButton key={n} value={n} sx={{ px: 1.25 }}>{n}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        </Box>

        {(item.requiere_foto || fotos.length > 0) && !soloLectura && (
          <Tooltip title={item.requiere_foto ? 'Esta pregunta pide evidencia' : 'Agregar evidencia'}>
            <IconButton component="label" size="small" sx={{
              color: item.requiere_foto && fotos.length === 0 ? ESTADO.alerta : undefined }}>
              <PhotoCamera fontSize="small" />
              <input hidden type="file" accept="image/*,.pdf" capture="environment"
                onChange={e => { const f = e.target.files?.[0]; if (f) onFoto(f) }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {noConforme && !valor.no_aplica && (
        <Stack spacing={1} mt={1.25}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField select size="small" label="Hallazgo" sx={{ minWidth: 200 }}
              disabled={soloLectura} value={valor.hallazgo_id ?? ''}
              helperText="Tipificarlo permite agruparlo en el tablero"
              onChange={e => onCambio({ hallazgo_id: Number(e.target.value) || null })}>
              <MenuItem value="">Sin tipificar</MenuItem>
              {hallazgos.map(h => (
                <MenuItem key={h.id} value={h.id}>
                  {h.nombre}{h.genera_ot ? ' · abre OT' : ''}
                </MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="Qué se encontró" sx={{ flex: 1, minWidth: 240 }}
              disabled={soloLectura} value={valor.observacion ?? ''}
              required={item.exige_observacion_no_conforme}
              error={item.exige_observacion_no_conforme && !(valor.observacion ?? '').trim()}
              helperText={item.exige_observacion_no_conforme
                ? 'Obligatorio para poder cerrar la inspección' : undefined}
              onChange={e => onCambio({ observacion: e.target.value })} />
          </Stack>
        </Stack>
      )}

      {fotos.length > 0 && (
        <Stack direction="row" spacing={1} mt={1.25} flexWrap="wrap" useFlexGap>
          {fotos.map(f => (
            <Tooltip key={f.id} title={f.nombre ?? 'Evidencia'}>
              <Avatar variant="rounded" src={f.url} sx={{
                width: 48, height: 48, cursor: 'pointer', border: `1px solid ${PALETA.niebla}` }}
                onClick={() => window.open(f.url, '_blank')} />
            </Tooltip>
          ))}
        </Stack>
      )}
    </Card>
  )
}
