/**
 * QMS · Encuestas de satisfacción
 *
 * Era una maqueta: cinco encuestas con NPS y CSAT escritos a mano, un análisis
 * por pregunta con distribuciones inventadas y un botón «Crear» que no creaba.
 * Además no había forma de registrar una respuesta, que es lo único que le da
 * contenido a una encuesta.
 *
 * DÓNDE VIVE CADA DATO
 *  - Las preguntas van en `qms_encuesta.preguntas` como JSON: una lista de
 *    textos. Todas se califican de 1 a 5.
 *  - Cada respuesta guarda en `respuestas` un JSON `{ "<índice>": <1-5> }`,
 *    más su NPS (0-10) y su CSAT (1-5) en columnas propias.
 *  - Total, NPS y CSAT de la encuesta los recalcula el servidor desde sus
 *    respuestas cada vez que entra una. El análisis por pregunta se calcula
 *    aquí, de las respuestas: no se guarda en ningún lado.
 */
import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, alpha,
  LinearProgress, IconButton, Tooltip, Switch, FormControlLabel, Rating, Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Poll, Add, Edit, RateReview } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { qmsApi, aNumero, type Encuesta, type RespuestaEncuesta } from '@/api/qms'

import { COLOR_MODULO } from '@/config/marca'
const QMS_COLOR = COLOR_MODULO

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

// Enum de la base.
const TIPOS = ['CLIENTE', 'EMPLEADO', 'PROVEEDOR', 'INTERNO']
const TIPO_COLOR: Record<string, string> = {
  CLIENTE: '#0369A1', EMPLEADO: '#7C3AED', PROVEEDOR: '#D97706', INTERNO: QMS_COLOR,
}
const COLOR_ESTRELLA = ['#DC2626', '#EA580C', '#D97706', alpha(QMS_COLOR, 0.5), QMS_COLOR]

/** Las preguntas, venga el JSON como lista de textos o de objetos. */
function leerPreguntas(json?: string | null): string[] {
  if (!json) return []
  try {
    const v = JSON.parse(json)
    if (!Array.isArray(v)) return []
    return v.map(p => (typeof p === 'string' ? p : p?.texto ?? p?.pregunta ?? '')).filter(Boolean)
  } catch { return [] }
}
function leerRespuestas(json?: string | null): Record<string, number> {
  if (!json) return {}
  try { const v = JSON.parse(json); return v && typeof v === 'object' ? v : {} } catch { return {} }
}
const colorNps = (n: number) => (n >= 50 ? QMS_COLOR : n >= 0 ? '#D97706' : '#DC2626')
const errorDe = (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar')

const ENC_VACIA = { nombre: '', tipo: 'CLIENTE', descripcion: '', fecha_inicio: '', fecha_fin: '', preguntas: '', activa: true }
const RESP_VACIA = { respondente_nombre: '', nps: null as number | null, csat: null as number | null, notas: {} as Record<string, number>, comentario: '' }

export default function QMSEncuestas() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [dlgEnc, setDlgEnc] = useState<{ abierto: boolean; item: Encuesta | null }>({ abierto: false, item: null })
  const [fe, setFe] = useState({ ...ENC_VACIA })
  const [responder, setResponder] = useState<Encuesta | null>(null)
  const [fr, setFr] = useState({ ...RESP_VACIA })
  const [analizadaId, setAnalizadaId] = useState<number | ''>('')

  const { data: encuestas = [], isLoading } = useQuery({
    queryKey: ['qms-encuestas'], queryFn: () => qmsApi.encuestas(),
  })
  const idAnalisis = analizadaId || encuestas[0]?.id
  const analizada = encuestas.find(e => e.id === idAnalisis)
  const { data: respuestas = [], isFetching: cargandoResp } = useQuery<RespuestaEncuesta[]>({
    queryKey: ['qms-encuesta-respuestas', idAnalisis],
    queryFn: () => qmsApi.respuestas(idAnalisis as number),
    enabled: !!idAnalisis && tab === 1,
  })

  const conNps = encuestas.filter(e => e.nps_score != null)
  const conCsat = encuestas.filter(e => e.csat_score != null)
  const promedio = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)
  const npsProm = promedio(conNps.map(e => aNumero(e.nps_score)))
  const csatProm = promedio(conCsat.map(e => aNumero(e.csat_score)))

  // Análisis por pregunta de la encuesta elegida.
  const analisis = useMemo(() => {
    const preguntas = leerPreguntas(analizada?.preguntas)
    return preguntas.map((texto, i) => {
      const dist = [0, 0, 0, 0, 0]
      for (const r of respuestas) {
        const v = Number(leerRespuestas(r.respuestas)[String(i)])
        if (v >= 1 && v <= 5) dist[v - 1]++
      }
      const n = dist.reduce((s, x) => s + x, 0)
      const prom = n ? dist.reduce((s, x, j) => s + x * (j + 1), 0) / n : null
      return { texto, dist, n, prom }
    })
  }, [analizada, respuestas])
  const npsDist = useMemo(() => {
    const d = { promotores: 0, pasivos: 0, detractores: 0 }
    for (const r of respuestas) {
      if (r.nps_valor == null) continue
      if (r.nps_valor >= 9) d.promotores++
      else if (r.nps_valor >= 7) d.pasivos++
      else d.detractores++
    }
    return d
  }, [respuestas])
  const comentarios = respuestas.filter(r => r.comentario?.trim())

  const abrirEnc = (item: Encuesta | null) => {
    setFe(item ? {
      nombre: item.nombre, tipo: item.tipo, descripcion: item.descripcion ?? '',
      fecha_inicio: item.fecha_inicio?.slice(0, 10) ?? '', fecha_fin: item.fecha_fin?.slice(0, 10) ?? '',
      preguntas: leerPreguntas(item.preguntas).join('\n'), activa: item.activa,
    } : { ...ENC_VACIA })
    setDlgEnc({ abierto: true, item })
  }
  const abrirResp = (enc: Encuesta) => { setFr({ ...RESP_VACIA, notas: {} }); setResponder(enc) }

  const guardarEnc = useMutation({
    mutationFn: () => {
      const preguntas = fe.preguntas.split('\n').map(p => p.trim()).filter(Boolean)
      const cuerpo: Partial<Encuesta> = {
        nombre: fe.nombre.trim(), tipo: fe.tipo, descripcion: fe.descripcion.trim() || null,
        fecha_inicio: fe.fecha_inicio ? `${fe.fecha_inicio}T00:00:00` : null,
        fecha_fin: fe.fecha_fin ? `${fe.fecha_fin}T00:00:00` : null,
        preguntas: JSON.stringify(preguntas), activa: fe.activa,
      }
      return dlgEnc.item ? qmsApi.editarEncuesta(dlgEnc.item.id, cuerpo) : qmsApi.crearEncuesta(cuerpo)
    },
    onSuccess: () => {
      toast.success(dlgEnc.item ? 'Encuesta actualizada' : 'Encuesta creada')
      qc.invalidateQueries({ queryKey: ['qms-encuestas'] })
      setDlgEnc({ abierto: false, item: null })
    },
    onError: errorDe,
  })
  const alternarActiva = useMutation({
    mutationFn: (e: Encuesta) => qmsApi.editarEncuesta(e.id, { activa: !e.activa }),
    onSuccess: (r) => { toast.success(r.activa ? 'Encuesta abierta' : 'Encuesta cerrada'); qc.invalidateQueries({ queryKey: ['qms-encuestas'] }) },
    onError: errorDe,
  })
  const guardarResp = useMutation({
    mutationFn: () => qmsApi.responderEncuesta(responder!.id, {
      encuesta_id: responder!.id,
      respondente_nombre: fr.respondente_nombre.trim() || null,
      respondente_tipo: responder!.tipo,
      respuestas: JSON.stringify(fr.notas),
      nps_valor: fr.nps, csat_valor: fr.csat,
      comentario: fr.comentario.trim() || null,
    }),
    onSuccess: () => {
      toast.success('Respuesta registrada')
      qc.invalidateQueries({ queryKey: ['qms-encuestas'] })
      qc.invalidateQueries({ queryKey: ['qms-encuesta-respuestas', responder!.id] })
      setResponder(null)
    },
    onError: errorDe,
  })

  const preguntasResp = leerPreguntas(responder?.preguntas)
  const respVacia = fr.nps == null && fr.csat == null && Object.keys(fr.notas).length === 0

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Poll sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Encuestas de Satisfacción</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>QMS · NPS · CSAT · Clima organizacional</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => abrirEnc(null)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Nueva Encuesta
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Encuestas Activas', value: String(encuestas.filter(e => e.activa).length), color: QMS_COLOR },
            { label: 'Respuestas Totales', value: String(encuestas.reduce((s, e) => s + (e.total_respuestas ?? 0), 0)), color: '#0369A1' },
            { label: 'NPS Promedio', value: npsProm == null ? '—' : npsProm.toFixed(0), color: npsProm == null ? '#6B7280' : colorNps(npsProm) },
            { label: 'CSAT Promedio (% satisfechos)', value: csatProm == null ? '—' : `${csatProm.toFixed(0)}%`, color: '#D97706' },
          ].map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.disabled', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="Encuestas" />
          <Tab label="Análisis Preguntas" />
        </Tabs>

        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        <TabPanel value={tab} index={0}>
          {!isLoading && encuestas.length === 0 && <Alert severity="info">Todavía no hay encuestas. Crea una con «Nueva Encuesta».</Alert>}
          <Grid container spacing={2}>
            {encuestas.map(e => {
              const tc = TIPO_COLOR[e.tipo] || '#6B7280'
              const nps = e.nps_score != null ? aNumero(e.nps_score) : null
              const csat = e.csat_score != null ? aNumero(e.csat_score) : null
              const nPreg = leerPreguntas(e.preguntas).length
              return (
                <Grid key={e.id} size={{ xs: 12, md: 6 }}>
                  <Card sx={{ border: `1px solid ${alpha(tc, 0.22)}`, borderRadius: 2 }}>
                    <CardContent sx={{ p: '16px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14, lineHeight: 1.3 }}>{e.nombre}</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                            <Chip label={e.tipo} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(tc, 0.15), color: tc }} />
                            <Chip label={`${nPreg} pregunta${nPreg === 1 ? '' : 's'}`} size="small" sx={{ fontSize: 9, height: 18 }} />
                            {e.fecha_fin && <Chip label={`Cierra ${e.fecha_fin.slice(0, 10)}`} size="small" sx={{ fontSize: 9, height: 18 }} />}
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                          <Tooltip title={e.activa ? 'Cerrar la encuesta' : 'Volver a abrirla'}>
                            <Chip label={e.activa ? 'activa' : 'cerrada'} size="small" onClick={() => alternarActiva.mutate(e)}
                              sx={{ fontSize: 9, height: 18, cursor: 'pointer', bgcolor: e.activa ? alpha(QMS_COLOR, 0.15) : '#F1F5F9', color: e.activa ? QMS_COLOR : 'text.disabled' }} />
                          </Tooltip>
                          <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${e.nombre}`} onClick={() => abrirEnc(e)}><Edit sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#D97706' }}>{csat == null ? '—' : `${csat.toFixed(0)}%`}</Typography>
                          <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>CSAT</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 20, fontWeight: 800, color: nps == null ? 'text.disabled' : colorNps(nps) }}>{nps == null ? '—' : nps.toFixed(0)}</Typography>
                          <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>NPS</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0369A1' }}>{e.total_respuestas ?? 0}</Typography>
                          <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>Respuestas</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }} />
                        <Button size="small" startIcon={<RateReview />} disabled={!e.activa} onClick={() => abrirResp(e)} sx={{ color: QMS_COLOR }}>
                          Registrar respuesta
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          {encuestas.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No hay encuestas para analizar.</Typography>
          ) : (
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
              <CardContent>
                <TextField select size="small" label="Encuesta" value={idAnalisis ?? ''} sx={{ minWidth: 320, mb: 2 }}
                  onChange={e => setAnalizadaId(Number(e.target.value))}>
                  {encuestas.map(e => <MenuItem key={e.id} value={e.id}>{e.nombre}</MenuItem>)}
                </TextField>
                {cargandoResp && <LinearProgress sx={{ mb: 2 }} />}
                {!cargandoResp && respuestas.length === 0 && (
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Esta encuesta todavía no tiene respuestas.</Typography>
                )}
                {respuestas.length > 0 && (
                  <>
                    <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                      {[
                        ['Promotores (9-10)', npsDist.promotores, QMS_COLOR],
                        ['Pasivos (7-8)', npsDist.pasivos, '#D97706'],
                        ['Detractores (0-6)', npsDist.detractores, '#DC2626'],
                      ].map(([l, v, c]) => (
                        <Box key={l as string}>
                          <Typography sx={{ fontSize: 20, fontWeight: 800, color: c as string }}>{v as number}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{l as string}</Typography>
                        </Box>
                      ))}
                    </Box>
                    {analisis.length === 0 && (
                      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>La encuesta no tiene preguntas de escala; solo se mide NPS y CSAT.</Typography>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {analisis.map((p, i) => {
                        const max = Math.max(...p.dist, 1)
                        return (
                          <Box key={i} sx={{ pb: 2, borderBottom: '1px solid #F1F5F9' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography sx={{ fontSize: 13, color: 'text.primary', flex: 1 }}>{p.texto}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                                <Typography sx={{ fontSize: 18, fontWeight: 800, color: p.prom == null ? 'text.disabled' : p.prom >= 4.5 ? QMS_COLOR : p.prom >= 4 ? '#D97706' : '#DC2626' }}>
                                  {p.prom == null ? '—' : p.prom.toFixed(1)}
                                </Typography>
                                <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>/ 5 · {p.n} resp.</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', height: 44 }}>
                              {p.dist.map((v, j) => (
                                <Box key={j} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                                  <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>{v}</Typography>
                                  <Box sx={{ width: '80%', height: `${(v / max) * 26}px`, borderRadius: '3px 3px 0 0', bgcolor: COLOR_ESTRELLA[j], minHeight: 2 }} />
                                  <Typography sx={{ fontSize: 8, color: 'text.disabled' }}>{'★'.repeat(j + 1)}</Typography>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                    {comentarios.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1 }}>Comentarios ({comentarios.length})</Typography>
                        {comentarios.slice(0, 30).map(r => (
                          <Box key={r.id} sx={{ py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
                            <Typography sx={{ fontSize: 12.5 }}>{r.comentario}</Typography>
                            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                              {r.respondente_nombre || 'Anónimo'} · {r.created_at?.slice(0, 10) ?? ''}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabPanel>

        <Dialog open={dlgEnc.abierto} onClose={() => setDlgEnc({ abierto: false, item: null })} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{dlgEnc.item ? 'Editar Encuesta' : 'Nueva Encuesta'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre de la encuesta" required fullWidth size="small" value={fe.nombre} onChange={e => setFe({ ...fe, nombre: e.target.value })} />
            <TextField select label="Dirigida a" fullWidth size="small" value={fe.tipo} onChange={e => setFe({ ...fe, tipo: e.target.value })}>
              {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField label="Descripción / objetivo" multiline rows={2} fullWidth size="small" value={fe.descripcion} onChange={e => setFe({ ...fe, descripcion: e.target.value })} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Abre" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} value={fe.fecha_inicio} onChange={e => setFe({ ...fe, fecha_inicio: e.target.value })} />
              <TextField label="Cierra" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} value={fe.fecha_fin} onChange={e => setFe({ ...fe, fecha_fin: e.target.value })} />
            </Box>
            <TextField label="Preguntas (una por línea, se califican de 1 a 5)" multiline minRows={4} fullWidth size="small"
              value={fe.preguntas} onChange={e => setFe({ ...fe, preguntas: e.target.value })}
              helperText={dlgEnc.item && (dlgEnc.item.total_respuestas ?? 0) > 0
                ? 'Ya tiene respuestas: cambiar el orden de las preguntas mezcla sus resultados. Agrega las nuevas al final.'
                : 'El NPS y el CSAT se preguntan siempre; no hace falta escribirlos.'} />
            <FormControlLabel control={<Switch checked={fe.activa} onChange={e => setFe({ ...fe, activa: e.target.checked })} />} label="Recibiendo respuestas" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDlgEnc({ abierto: false, item: null })} color="inherit">Cancelar</Button>
            <Button variant="contained" disabled={!fe.nombre.trim() || guardarEnc.isPending} onClick={() => guardarEnc.mutate()}
              sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>{dlgEnc.item ? 'Guardar' : 'Crear Encuesta'}</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={!!responder} onClose={() => setResponder(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Registrar respuesta · {responder?.nombre}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Quién responde (opcional)" fullWidth size="small" value={fr.respondente_nombre}
              onChange={e => setFr({ ...fr, respondente_nombre: e.target.value })} />
            <Box>
              <Typography sx={{ fontSize: 13, mb: 0.5 }}>¿Qué tan probable es que nos recomiende? (0 a 10)</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {Array.from({ length: 11 }, (_, n) => (
                  <Chip key={n} label={n} size="small" clickable onClick={() => setFr({ ...fr, nps: fr.nps === n ? null : n })}
                    sx={{ minWidth: 34, fontWeight: 700, bgcolor: fr.nps === n ? colorNps(n >= 9 ? 100 : n >= 7 ? 0 : -1) : undefined, color: fr.nps === n ? '#fff' : undefined }} />
                ))}
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 13, mb: 0.5 }}>Satisfacción general (1 a 5)</Typography>
              <Rating value={fr.csat} onChange={(_, v) => setFr({ ...fr, csat: v })} />
            </Box>
            {preguntasResp.map((p, i) => (
              <Box key={i}>
                <Typography sx={{ fontSize: 13, mb: 0.5 }}>{p}</Typography>
                <Rating value={fr.notas[String(i)] ?? null}
                  onChange={(_, v) => {
                    const notas = { ...fr.notas }
                    if (v == null) delete notas[String(i)]; else notas[String(i)] = v
                    setFr({ ...fr, notas })
                  }} />
              </Box>
            ))}
            <TextField label="Comentario" multiline minRows={2} fullWidth size="small" value={fr.comentario}
              onChange={e => setFr({ ...fr, comentario: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setResponder(null)} color="inherit">Cancelar</Button>
            <Button variant="contained" disabled={(respVacia && !fr.comentario.trim()) || guardarResp.isPending}
              onClick={() => guardarResp.mutate()} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>Registrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
