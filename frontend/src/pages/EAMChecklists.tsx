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
  Add, Search, Settings, PhotoCamera, RemoveCircleOutline,
  FactCheck, WarningAmber, Assignment, Send, Visibility,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { apiClient as api } from '@/api/client'
import {
  chkApi, ETIQUETA_RESULTADO,
  type Ejecucion, type DetalleEjecucion, type PreguntaEnEjecucion, type Hallazgo,
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
                  Suma todas las plantillas: la misma pregunta cuenta una sola vez
                </Typography>
                <Stack spacing={1} mt={2}>
                  {analitica.preguntas_mas_reprobadas.map(i => (
                    <Stack key={i.etiqueta} direction="row" spacing={1} alignItems="center">
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" display="block">{i.etiqueta}</Typography>
                        <Typography variant="caption" color="text.secondary">{i.sistema}</Typography>
                      </Box>
                      {i.critico && <Chip label="Crítica" size="small" sx={{
                        height: 17, fontSize: 9, fontWeight: 800,
                        bgcolor: `${ESTADO.peligro}1A`, color: ESTADO.peligro }} />}
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>{i.cantidad}</Typography>
                    </Stack>
                  ))}
                  {analitica.preguntas_mas_reprobadas.length === 0 && (
                    <Typography variant="body2" sx={{ py: 2, textAlign: 'center', color: PALETA.acero }}>
                      Sin hallazgos en el periodo
                    </Typography>
                  )}
                </Stack>
              </Card>

              <Card sx={{ borderRadius: 3, p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={800}>Por sistema</Typography>
                <Typography variant="caption" color="text.secondary">
                  Qué parte del activo concentra los hallazgos
                </Typography>
                <Stack spacing={1} mt={2}>
                  {analitica.por_sistema.map(s => (
                    <Stack key={s.etiqueta} direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" sx={{ flex: 1, fontWeight: 600 }}>
                        {s.etiqueta}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>{s.cantidad}</Typography>
                    </Stack>
                  ))}
                  {analitica.por_sistema.length === 0 && (
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
   Abrir una inspección: PRIMERO el activo, después la plantilla.

   Es el orden natural —se tiene el equipo enfrente— y es el que hace útil la
   configuración: al elegir el activo solo aparecen las plantillas declaradas
   para su tipo, en vez de la lista completa.
   ═══════════════════════════════════════════════════════════════════════════ */
function DialogoAbrir({ onCerrar, onAbierta }: {
  onCerrar: () => void; onAbierta: (id: number) => void
}) {
  const [activo, setActivo] = useState<number | ''>('')
  const [plantilla, setPlantilla] = useState<number | ''>('')
  const [medidor, setMedidor] = useState('')

  const { data: activos = [] } = useQuery<any[]>({
    queryKey: ['eam-activos-chk'],
    queryFn: () => api.get('/eam/activos').then(r =>
      Array.isArray(r.data) ? r.data : (r.data?.items ?? [])),
  })

  // Solo las plantillas declaradas para el tipo de ese activo. La consulta se
  // hace en el servidor: la regla vive en la configuración, no en la pantalla.
  const { data: disponibles = [], isFetching } = useQuery({
    queryKey: ['chk-plantillas-activo', activo],
    queryFn: () => chkApi.plantillasDeActivo(activo as number),
    enabled: !!activo,
  })

  const elegida = disponibles.find(p => p.id === plantilla)
  const equipo = activos.find(a => a.id === activo)

  const abrir = useMutation({
    mutationFn: () => chkApi.ejecuciones.abrir({
      plantilla_id: plantilla, activo_id: activo,
      odometro: medidor === '' ? null : Number(medidor),
    }),
    onSuccess: (e) => { toast.success(`Inspección ${e.numero} abierta`); onAbierta(e.id) },
    onError: (e: any) => toast.error(mensaje(e), { duration: 7000 }),
  })

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Nueva inspección</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField select size="small" label="1 · Activo a inspeccionar" value={activo}
            onChange={e => { setActivo(Number(e.target.value) || ''); setPlantilla('') }}>
            {activos.map(a => (
              <MenuItem key={a.id} value={a.id}>
                {a.codigo} · {a.nombre}
                {a.tipo_activo ? ` (${a.tipo_activo})` : ''}
              </MenuItem>
            ))}
          </TextField>

          <TextField select size="small" label="2 · Checklist a aplicar" value={plantilla}
            disabled={!activo || isFetching}
            helperText={!activo ? 'Escoja primero el activo'
              : isFetching ? 'Buscando los checklists de ese equipo…'
              : disponibles.length === 0
                ? `No hay checklists configurados para activos de tipo ${equipo?.tipo_activo ?? 'sin tipo'}`
                : `${disponibles.length} configurados para ${equipo?.tipo_activo}`}
            onChange={e => setPlantilla(Number(e.target.value) || '')}>
            {disponibles.map(p => (
              <MenuItem key={p.id} value={p.id}>
                {p.codigo} · {p.nombre} (v{p.version}, {p.total_preguntas ?? 0} preguntas)
              </MenuItem>
            ))}
          </TextField>

          {activo && !isFetching && disponibles.length === 0 && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Ninguna plantilla declara el tipo <b>{equipo?.tipo_activo ?? 'sin tipo'}</b>.
              Agréguelo en Plantillas → armar → «Aplica a estos activos».
            </Alert>
          )}

          {elegida && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Aprueba desde {elegida.umbral_aprobacion}% de conformidad
              {elegida.critico_reprueba && ' · una pregunta crítica no conforme la rechaza'}
              {elegida.requiere_firma && ' · exige firma'}
              {elegida.genera_ot && ' · abre orden de trabajo si hay hallazgos'}
            </Alert>
          )}

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
   Llenar la inspección. Guarda a medida que se responde, no al final: una
   inspección de cuarenta preguntas en un patio con mala señal no se puede
   perder porque falte una.
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

  // Se parte de lo ya guardado: reabrir una inspección a medias no debe
  // mostrarla en blanco.
  useEffect(() => {
    if (!data) return
    const inicial: Record<number, any> = {}
    for (const s of data.sistemas) {
      for (const q of s.preguntas) {
        if (q.respuesta) {
          inicial[q.pregunta_id] = {
            opcion_id: q.respuesta.opcion_id,
            valor_texto: q.respuesta.valor_texto,
            valor_numero: q.respuesta.valor_numero,
            observacion: q.respuesta.observacion,
            hallazgo_id: q.respuesta.hallazgo_id,
            no_aplica: q.respuesta.no_aplica,
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
        + (r.ot_creada ? ` · se abrió ${r.ot_creada.numero}` : ''), { duration: 6000 })
      onCerrar()
    },
    onError: (e: any) => toast.error(mensaje(e), { duration: 7000 }),
  })

  const subir = useMutation({
    mutationFn: ({ archivo, pregunta_id }: { archivo: File; pregunta_id: number }) => {
      const respuesta = data?.sistemas.flatMap(s => s.preguntas)
        .find(q => q.pregunta_id === pregunta_id)?.respuesta
      return chkApi.ejecuciones.subirFoto(eid, archivo, respuesta?.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chk-ejecucion', eid] })
      toast.success('Evidencia cargada')
    },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  /** Guarda la pregunta apenas se responde. */
  const responder = (pregunta_id: number, cambio: Record<string, any>) => {
    const actual = { ...(borrador[pregunta_id] ?? {}), ...cambio }
    setBorrador(prev => ({ ...prev, [pregunta_id]: actual }))
    guardar.mutate([{ pregunta_id, ...actual }])
  }

  const preguntas = data?.sistemas.flatMap(s => s.preguntas) ?? []
  const respondidas = preguntas.filter(q => {
    const b = borrador[q.pregunta_id]
    return b && (b.opcion_id != null || b.valor_numero != null
                 || (b.valor_texto ?? '') !== '' || b.no_aplica)
  }).length
  const avance = preguntas.length ? Math.round(respondidas / preguntas.length * 100) : 0

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
                {respondidas} de {preguntas.length} respondidas
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
                Se llenó con la versión {data.ejecucion.plantilla_version} de la plantilla y la
                actual es la {data.plantilla?.version_actual}. Se conserva como se firmó.
              </Alert>
            )}

            {data.sistemas.map(sistema => (
              <Box key={sistema.id} mb={2.5}>
                <Typography variant="caption" sx={{
                  fontWeight: 800, letterSpacing: '0.08em', color: PALETA.grafito }}>
                  {sistema.nombre.toUpperCase()}
                </Typography>
                <Stack spacing={1.25} mt={1}>
                  {sistema.preguntas.map(q => (
                    <FilaPregunta key={q.pregunta_id} q={q}
                      valor={borrador[q.pregunta_id] ?? {}}
                      hallazgos={hallazgos} soloLectura={cerrada}
                      onCambio={c => responder(q.pregunta_id, c)}
                      onFoto={f => subir.mutate({ archivo: f, pregunta_id: q.pregunta_id })} />
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
                  disabled={cerrada} required onChange={e => setFirma(e.target.value)}
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

/**
 * Una pregunta con el control que dicte su clasificación.
 *
 * Va a nivel de módulo y no dentro del padre: definida adentro, React la
 * trataría como un tipo nuevo en cada render y la remontaría a cada tecla,
 * perdiendo el foco del campo de observación.
 */
function FilaPregunta({ q, valor, hallazgos, soloLectura, onCambio, onFoto }: {
  q: PreguntaEnEjecucion; valor: Record<string, any>; hallazgos: Hallazgo[]
  soloLectura: boolean
  onCambio: (c: Record<string, any>) => void
  onFoto: (f: File) => void
}) {
  const cla = q.clasificacion
  const opcion = cla.opciones.find(o => o.id === valor.opcion_id)

  // Fuera del rango declarado se marca no conforme solo, igual que en el
  // servidor: el inspector ve el rojo antes de guardar.
  const fueraDeRango = cla.tipo === 'NUMERO' && valor.valor_numero != null
    && ((cla.valor_min != null && valor.valor_numero < cla.valor_min)
        || (cla.valor_max != null && valor.valor_numero > cla.valor_max))
  const noConforme = !valor.no_aplica && (opcion?.conforme === false || fueraDeRango)
  const conforme = !valor.no_aplica && (opcion?.conforme === true
    || (cla.tipo === 'NUMERO' && valor.valor_numero != null && !fueraDeRango))

  const fotos = q.respuesta?.fotos ?? []

  return (
    <Card variant="outlined" sx={{
      p: 1.5, borderRadius: 2,
      borderLeft: `3px solid ${valor.no_aplica ? PALETA.acero
        : noConforme ? ESTADO.peligro
        : conforme ? ESTADO.exito : PALETA.niebla}`,
    }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start" flexWrap="wrap" useFlexGap>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{q.texto}</Typography>
            {q.critico && <Chip label="Crítica" size="small" sx={{
              height: 16, fontSize: 9, fontWeight: 800,
              bgcolor: `${ESTADO.peligro}1A`, color: ESTADO.peligro }} />}
            {q.peso !== 1 && (
              <Tooltip title="Peso al calcular la conformidad">
                <Chip label={`×${q.peso}`} size="small" sx={{
                  height: 16, fontSize: 9, fontWeight: 700,
                  bgcolor: `${PALETA.acero}1A`, color: PALETA.grafito }} />
              </Tooltip>
            )}
          </Stack>
          {q.ayuda && (
            <Typography variant="caption" color="text.secondary">{q.ayuda}</Typography>
          )}
          {cla.tipo === 'NUMERO' && (cla.valor_min != null || cla.valor_max != null) && (
            <Typography variant="caption" display="block" color="text.secondary">
              Aceptable de {cla.valor_min ?? '—'} a {cla.valor_max ?? '—'} {cla.unidad}
            </Typography>
          )}
        </Box>

        <Box>
          {cla.tipo === 'OPCIONES' && (
            <ToggleButtonGroup exclusive size="small" disabled={soloLectura}
              value={valor.no_aplica ? 'na' : (valor.opcion_id ?? null)}
              onChange={(_: any, v: any) => {
                if (v === null) return
                onCambio(v === 'na'
                  ? { no_aplica: true, opcion_id: null }
                  : { no_aplica: false, opcion_id: v })
              }}>
              {cla.opciones.map(o => (
                <ToggleButton key={o.id} value={o.id} sx={{
                  textTransform: 'none', px: 1.5,
                  '&.Mui-selected': {
                    bgcolor: `${o.conforme === true ? ESTADO.exito
                      : o.conforme === false ? ESTADO.peligro : PALETA.acero}22`,
                    color: o.conforme === true ? ESTADO.exito
                      : o.conforme === false ? ESTADO.peligro : PALETA.grafito,
                    fontWeight: 800,
                  },
                }}>
                  {o.nombre}
                </ToggleButton>
              ))}
              <Tooltip title="El equipo no tiene este componente. Sale del cálculo en vez de contar como fallo.">
                <ToggleButton value="na" sx={{ textTransform: 'none', px: 1.25 }}>
                  <RemoveCircleOutline sx={{ fontSize: 15, mr: 0.4 }} />N/A
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          )}
          {cla.tipo === 'NUMERO' && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <TextField size="small" type="number" sx={{ width: 140 }} disabled={soloLectura}
                label={cla.unidad ?? 'Valor'} error={fueraDeRango}
                value={valor.valor_numero ?? ''}
                onChange={e => onCambio({ no_aplica: false,
                  valor_numero: e.target.value === '' ? null : Number(e.target.value) })} />
              <Tooltip title="No aplica">
                <IconButton size="small" disabled={soloLectura}
                  color={valor.no_aplica ? 'primary' : 'default'}
                  onClick={() => onCambio({ no_aplica: !valor.no_aplica, valor_numero: null })}>
                  <RemoveCircleOutline fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
          {(cla.tipo === 'TEXTO' || cla.tipo === 'FECHA') && (
            <TextField size="small" sx={{ width: 210 }} disabled={soloLectura}
              type={cla.tipo === 'FECHA' ? 'date' : 'text'}
              InputLabelProps={cla.tipo === 'FECHA' ? { shrink: true } : undefined}
              value={valor.valor_texto ?? ''}
              onChange={e => onCambio({ valor_texto: e.target.value })} />
          )}
        </Box>

        {(q.requiere_foto || fotos.length > 0) && !soloLectura && (
          <Tooltip title={q.requiere_foto ? 'Esta pregunta pide evidencia' : 'Agregar evidencia'}>
            <IconButton component="label" size="small" sx={{
              color: q.requiere_foto && fotos.length === 0 ? ESTADO.alerta : undefined }}>
              <PhotoCamera fontSize="small" />
              <input hidden type="file" accept="image/*,.pdf" capture="environment"
                onChange={e => { const f = e.target.files?.[0]; if (f) onFoto(f) }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {noConforme && (
        <Stack direction="row" spacing={1} mt={1.25} flexWrap="wrap" useFlexGap>
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
            required={q.exige_observacion_no_conforme}
            error={q.exige_observacion_no_conforme && !(valor.observacion ?? '').trim()}
            helperText={q.exige_observacion_no_conforme
              ? 'Obligatorio para poder cerrar la inspección' : undefined}
            onChange={e => onCambio({ observacion: e.target.value })} />
        </Stack>
      )}

      {fotos.length > 0 && (
        <Stack direction="row" spacing={1} mt={1.25} flexWrap="wrap" useFlexGap>
          {fotos.map(f => (
            <Tooltip key={f.id} title={f.nombre ?? 'Evidencia'}>
              <Avatar variant="rounded" src={f.url} sx={{
                width: 48, height: 48, cursor: 'pointer',
                border: `1px solid ${PALETA.niebla}` }}
                onClick={() => window.open(f.url, '_blank')} />
            </Tooltip>
          ))}
        </Stack>
      )}
    </Card>
  )
}
