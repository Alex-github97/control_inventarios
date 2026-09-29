/**
 * QMS · Evaluación de proveedores
 *
 * Era una maqueta: ocho evaluaciones escritas a mano y un diálogo con
 * deslizadores que no guardaba nada. El servidor ya tenía el CRUD.
 *
 * El puntaje y la clasificación los calcula el servidor —promedio de los
 * cuatro criterios— y aquí solo se muestran; la vista previa del diálogo
 * repite la misma regla para que quien evalúa sepa qué va a salir.
 *
 * Las cifras de arriba y el ranking cuentan la ÚLTIMA evaluación de cada
 * proveedor. Contando todas, un proveedor evaluado cada mes pesaría doce veces
 * más que uno evaluado una vez al año.
 */
import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, alpha, Slider,
  IconButton, Tooltip, LinearProgress, Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Storefront, Add, Edit, WarningAmber } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { qmsApi, aNumero, aUmbrales, type EvaluacionProveedor } from '@/api/qms'

import { COLOR_MODULO } from '@/config/marca'
const QMS_COLOR = COLOR_MODULO

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const CLASIF_COLOR: Record<string, string> = { excelente: QMS_COLOR, bueno: '#0369A1', regular: '#D97706', deficiente: '#DC2626' }
const CLASIF_MEDAL: Record<string, string> = { excelente: '🥇', bueno: '🥈', regular: '🥉', deficiente: '' }

/** La misma regla que `_calcular_clasificacion_proveedor` del servidor. */
const clasificar = (p: number) => (p >= 90 ? 'excelente' : p >= 75 ? 'bueno' : p >= 60 ? 'regular' : 'deficiente')
const colorPuntaje = (v: number) => CLASIF_COLOR[clasificar(v)]
const claveProveedor = (e: EvaluacionProveedor) => (e.proveedor_nit || e.proveedor_nombre).trim().toLowerCase()
const mesActual = () => new Date().toISOString().slice(0, 7)

function ScoreBar({ value }: { value: number }) {
  const color = colorPuntaje(value)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9' }}>
        <Box sx={{ width: `${Math.min(value, 100)}%`, height: '100%', borderRadius: 3, bgcolor: color }} />
      </Box>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color, minWidth: 30, textAlign: 'right' }}>{value}</Typography>
    </Box>
  )
}

const VACIO = {
  proveedor_nombre: '', proveedor_nit: '', periodo: mesActual(), observaciones: '',
  calidad: 80, cumplimiento: 80, servicio: 80, tiempos: 80,
}

export default function QMSProveedores() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [dlg, setDlg] = useState<{ abierto: boolean; item: EvaluacionProveedor | null }>({ abierto: false, item: null })
  const [f, setF] = useState({ ...VACIO })

  const { data: evaluaciones = [], isLoading } = useQuery({
    queryKey: ['qms-evaluaciones-proveedores'], queryFn: () => qmsApi.evaluaciones(),
  })

  // La vigente es la del período más reciente, no la última que se registró:
  // una evaluación atrasada que se carga hoy no debe reemplazar a la del mes.
  const ultimas = useMemo(() => {
    const orden = [...evaluaciones].sort((a, b) => b.periodo.localeCompare(a.periodo) || b.id - a.id)
    const vistos = new Map<string, EvaluacionProveedor>()
    for (const e of orden) if (!vistos.has(claveProveedor(e))) vistos.set(claveProveedor(e), e)
    return [...vistos.values()]
  }, [evaluaciones])
  const ranking = [...ultimas].sort((a, b) => aNumero(b.puntaje_total) - aNumero(a.puntaje_total))
  const cuenta = (c: string) => ultimas.filter(e => e.clasificacion === c).length

  // El mínimo es el de Configuración → Umbrales: por debajo, el proveedor
  // queda marcado para seguimiento.
  const { data: params } = useQuery({ queryKey: ['qms-parametros'], queryFn: qmsApi.parametros })
  const minimo = aUmbrales(params).proveedor_puntaje_minimo
  const bajoMinimo = (e: EvaluacionProveedor) => aNumero(e.puntaje_total) < minimo

  const previewTotal = (f.calidad + f.cumplimiento + f.servicio + f.tiempos) / 4
  const previewClasif = clasificar(previewTotal)

  const abrir = (item: EvaluacionProveedor | null) => {
    setF(item ? {
      proveedor_nombre: item.proveedor_nombre, proveedor_nit: item.proveedor_nit ?? '',
      periodo: item.periodo, observaciones: item.observaciones ?? '',
      calidad: aNumero(item.calidad), cumplimiento: aNumero(item.cumplimiento),
      servicio: aNumero(item.servicio), tiempos: aNumero(item.tiempos),
    } : { ...VACIO, periodo: mesActual() })
    setDlg({ abierto: true, item })
  }

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo: Partial<EvaluacionProveedor> = {
        proveedor_nombre: f.proveedor_nombre.trim(), proveedor_nit: f.proveedor_nit.trim() || null,
        periodo: f.periodo, observaciones: f.observaciones.trim() || null,
        calidad: f.calidad, cumplimiento: f.cumplimiento, servicio: f.servicio, tiempos: f.tiempos,
      }
      return dlg.item ? qmsApi.editarEvaluacion(dlg.item.id, cuerpo) : qmsApi.crearEvaluacion(cuerpo)
    },
    onSuccess: (r) => {
      toast.success(`Evaluación guardada: ${aNumero(r.puntaje_total).toFixed(1)} · ${r.clasificacion ?? ''}`)
      qc.invalidateQueries({ queryKey: ['qms-evaluaciones-proveedores'] })
      setDlg({ abierto: false, item: null })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar'),
  })

  const criterios: [string, 'calidad' | 'cumplimiento' | 'servicio' | 'tiempos'][] = [
    ['Calidad', 'calidad'], ['Cumplimiento', 'cumplimiento'],
    ['Servicio', 'servicio'], ['Tiempos de Entrega', 'tiempos'],
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Storefront sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Evaluación de Proveedores</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>QMS · Calificación y seguimiento ISO 9001</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => abrir(null)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Nueva Evaluación
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Excelentes', value: cuenta('excelente'), color: QMS_COLOR },
            { label: 'Buenos', value: cuenta('bueno'), color: '#0369A1' },
            { label: 'Regulares', value: cuenta('regular'), color: '#D97706' },
            { label: 'Deficientes', value: cuenta('deficiente'), color: '#DC2626' },
          ].map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label={`Evaluaciones (${evaluaciones.length})`} />
          <Tab label="Ranking" />
        </Tabs>

        {ultimas.some(bajoMinimo) && (
          <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}>
            {ultimas.filter(bajoMinimo).length} proveedor(es) por debajo del puntaje mínimo de {minimo} en su última evaluación:{' '}
            {ultimas.filter(bajoMinimo).map(e => e.proveedor_nombre).join(', ')}.
          </Alert>
        )}

        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        <TabPanel value={tab} index={0}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Proveedor</TableCell><TableCell>NIT</TableCell><TableCell>Período</TableCell><TableCell>Calidad</TableCell><TableCell>Cumplimiento</TableCell><TableCell>Servicio</TableCell><TableCell>Tiempos</TableCell><TableCell>Total</TableCell><TableCell>Clasificación</TableCell><TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {evaluaciones.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={10} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>Sin evaluaciones registradas</TableCell></TableRow>
                )}
                {evaluaciones.map(e => {
                  const clasif = e.clasificacion ?? clasificar(aNumero(e.puntaje_total))
                  const c = CLASIF_COLOR[clasif] ?? '#6B7280'
                  return (
                    <TableRow key={e.id} sx={{ '& td': { borderColor: '#E5E7EB', color: 'text.primary', fontSize: 12 } }}>
                      <TableCell sx={{ maxWidth: 180 }}><Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.proveedor_nombre}</Typography></TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{e.proveedor_nit || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{e.periodo}</TableCell>
                      <TableCell sx={{ minWidth: 80 }}><ScoreBar value={aNumero(e.calidad)} /></TableCell>
                      <TableCell sx={{ minWidth: 80 }}><ScoreBar value={aNumero(e.cumplimiento)} /></TableCell>
                      <TableCell sx={{ minWidth: 80 }}><ScoreBar value={aNumero(e.servicio)} /></TableCell>
                      <TableCell sx={{ minWidth: 80 }}><ScoreBar value={aNumero(e.tiempos)} /></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontWeight: 800, color: c, fontSize: 14 }}>{aNumero(e.puntaje_total).toFixed(1)}</Typography>
                          {bajoMinimo(e) && <Tooltip title={`Por debajo del mínimo (${minimo})`}><WarningAmber sx={{ fontSize: 15, color: '#DC2626' }} /></Tooltip>}
                        </Box>
                      </TableCell>
                      <TableCell><Chip label={`${CLASIF_MEDAL[clasif] ?? ''} ${clasif}`} size="small" sx={{ fontSize: 9, height: 20, bgcolor: alpha(c, 0.15), color: c, fontWeight: 700 }} /></TableCell>
                      <TableCell><Tooltip title="Editar"><IconButton size="small" aria-label={`Editar evaluación de ${e.proveedor_nombre}`} onClick={() => abrir(e)}><Edit sx={{ fontSize: 14 }} /></IconButton></Tooltip></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          {ranking.length === 0 && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>El ranking aparece con la primera evaluación.</Typography>}
          <Grid container spacing={2}>
            {ranking.map((e, i) => {
              const clasif = e.clasificacion ?? clasificar(aNumero(e.puntaje_total))
              const c = CLASIF_COLOR[clasif] ?? '#6B7280'
              return (
                <Grid key={e.id} size={{ xs: 12, md: 6 }}>
                  <Card sx={{ border: `1px solid ${alpha(c, 0.25)}`, borderRadius: 2 }}>
                    <CardContent sx={{ p: '14px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: 20 }}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}</Typography>
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{e.proveedor_nombre}</Typography>
                            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>Última evaluación: {e.periodo}</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography sx={{ fontSize: 20, fontWeight: 800, color: c }}>{aNumero(e.puntaje_total).toFixed(1)}</Typography>
                          <Chip label={clasif} size="small" sx={{ fontSize: 9, height: 16, bgcolor: alpha(c, 0.15), color: c }} />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        {([['Cal.', e.calidad], ['Cum.', e.cumplimiento], ['Serv.', e.servicio], ['T.Entr.', e.tiempos]] as [string, number | null | undefined][]).map(([l, v]) => (
                          <Box key={l} sx={{ flex: 1, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{l}</Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{aNumero(v)}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{dlg.item ? 'Editar Evaluación' : 'Nueva Evaluación de Proveedor'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Proveedor" required fullWidth size="small" value={f.proveedor_nombre}
              onChange={e => setF({ ...f, proveedor_nombre: e.target.value })} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="NIT" fullWidth size="small" value={f.proveedor_nit}
                helperText="Con el NIT se reconocen las evaluaciones del mismo proveedor"
                onChange={e => setF({ ...f, proveedor_nit: e.target.value })} />
              <TextField label="Período" type="month" required size="small" sx={{ minWidth: 170 }} value={f.periodo}
                InputLabelProps={{ shrink: true }} onChange={e => setF({ ...f, periodo: e.target.value })} />
            </Box>
            {criterios.map(([label, k]) => (
              <Box key={k}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>{label}: {f[k]}</Typography>
                <Slider value={f[k]} min={0} max={100} step={1} aria-label={label}
                  onChange={(_, v) => setF({ ...f, [k]: v as number })} sx={{ color: QMS_COLOR }} />
              </Box>
            ))}
            <TextField label="Observaciones" fullWidth size="small" multiline minRows={2} value={f.observaciones}
              onChange={e => setF({ ...f, observaciones: e.target.value })} />
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(CLASIF_COLOR[previewClasif], 0.1), border: `1px solid ${alpha(CLASIF_COLOR[previewClasif], 0.3)}` }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: CLASIF_COLOR[previewClasif] }}>Puntaje Total: {previewTotal.toFixed(1)} → {previewClasif.toUpperCase()}</Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDlg({ abierto: false, item: null })} color="inherit">Cancelar</Button>
            <Button variant="contained" disabled={!f.proveedor_nombre.trim() || !f.periodo || guardar.isPending}
              onClick={() => guardar.mutate()} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
