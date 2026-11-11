/**
 * Informe TittanLite: lo que inspeccionó la app en campo, sin restricciones.
 *
 * Composición de llantas a piso (marca, dimensión, vida, referencia), estado
 * bueno / regular / crítico por profundidad mínima, esquema por vehículo,
 * novedades (calculadas y marcadas en campo) y observaciones más recurrentes.
 * Abajo, las inspecciones con su sincronización con TittanWare: lo rechazado se
 * puede reintentar después de corregir el seguimiento.
 */
import { useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogContent, DialogTitle, IconButton, LinearProgress, Stack,
  Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tooltip, Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Close, Download, PictureAsPdf, Sync } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { mensajeDeError } from '@/utils/errorApi'
import { BotonesEnviar } from '@/components/mensajeria/Mensajeria'

const B = '/eam/lite'
const COLOR_ESTADO: Record<string, string> = { Bueno: '#16A34A', Regular: '#D97706', 'Crítico': '#DC2626' }
const ETIQUETA_SYNC: Record<string, { texto: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
  SINCRONIZADA: { texto: 'Sincronizada', color: 'success' }, PARCIAL: { texto: 'Parcial', color: 'warning' },
  RECHAZADA: { texto: 'Rechazada', color: 'error' }, SIN_SEGUIMIENTO: { texto: 'Solo en Lite', color: 'default' },
  PENDIENTE: { texto: 'Pendiente', color: 'info' },
}
const n = (x: number) => x.toLocaleString('es-CO')
type Par = [string, number]

interface Informe {
  vehiculos: number; llantas: number; profundidad_promedio: number | null; bajo_minimo: number; ir: number | null
  novedades: number; llantas_con_novedad: number
  por_estado: Par[]; por_marca: Par[]; por_dimension: Par[]; por_vida: Par[]; por_referencia: Par[]
  por_novedad: Par[]; novedades_campo: Par[]; observaciones: Par[]
  sincronizacion: Record<string, number>
  umbrales: { profundidad_minima: number; margen_alerta: number }
  por_vehiculo: {
    activo_id: number; placa: string; tipo: string; fecha: string | null
    posiciones: { codigo: string; label: string; eje: number; lado: string
      llanta: { codigo: string; marca?: string | null; referencia?: string | null; medida?: string | null; vida: string
        pmin: number | null; presion: number | null; estado: string | null; novedades: string[] } | null }[]
  }[]
}

async function descargar(ruta: string, params: Record<string, unknown>, nombre: string) {
  const r = await api.get(ruta, { params, responseType: 'blob', timeout: 300_000 })
  const url = URL.createObjectURL(r.data as Blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function Kpi({ titulo, valor, nota, color }: { titulo: string; valor: string; nota?: string; color?: string }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography fontSize={11.5} color="text.secondary">{titulo}</Typography>
        <Typography fontSize={22} fontWeight={800} sx={{ color: color ?? 'text.primary', lineHeight: 1.3 }}>{valor}</Typography>
        {nota && <Typography fontSize={11} color="text.secondary">{nota}</Typography>}
      </CardContent>
    </Card>
  )
}

function Reparto({ titulo, filas, maximo = 10 }: { titulo: string; filas: Par[]; maximo?: number }) {
  const total = filas.reduce((t, [, c]) => t + c, 0) || 1
  const tope = Math.max(1, ...filas.map(([, c]) => c))
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography fontWeight={700} fontSize={14} mb={1}>{titulo}</Typography>
        {filas.length === 0 && <Typography fontSize={12} color="text.secondary">Sin datos.</Typography>}
        {filas.slice(0, maximo).map(([nombre, c]) => (
          <Box key={nombre} sx={{ mb: 0.75 }}>
            <Stack direction="row" justifyContent="space-between" gap={1}>
              <Typography fontSize={12} noWrap title={nombre}>{nombre}</Typography>
              <Typography fontSize={12} color="text.secondary" flexShrink={0}>{n(c)} · {(100 * c / total).toFixed(1)} %</Typography>
            </Stack>
            <Box sx={{ height: 5, borderRadius: 3, bgcolor: '#EEF2F7' }}>
              <Box sx={{ width: `${100 * c / tope}%`, height: '100%', borderRadius: 3, bgcolor: '#2563EB' }} />
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  )
}

function Histograma({ filas, minimo, margen }: { filas: Par[]; minimo: number; margen: number }) {
  const total = filas.reduce((t, [, c]) => t + c, 0) || 1
  const tope = Math.max(1, ...filas.map(([, c]) => c))
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography fontWeight={700} fontSize={14}>Estado de las llantas</Typography>
        <Typography fontSize={11.5} color="text.secondary" mb={1.5}>
          Por profundidad mínima: crítico en o bajo {minimo} mm, regular hasta {minimo + margen} mm.
        </Typography>
        <Stack direction="row" alignItems="flex-end" justifyContent="space-around" sx={{ height: 170 }}
          role="img" aria-label={filas.map(([e, c]) => `${e}: ${c}`).join(', ')}>
          {filas.map(([estado, c]) => (
            <Stack key={estado} alignItems="center" sx={{ width: '28%', height: '100%', justifyContent: 'flex-end' }}>
              <Typography fontSize={12} fontWeight={800}>{n(c)}</Typography>
              <Typography fontSize={10.5} color="text.secondary" mb={0.5}>{(100 * c / total).toFixed(1)} %</Typography>
              <Box sx={{ width: '100%', height: `${Math.max(2, 120 * c / tope)}px`, borderRadius: '6px 6px 0 0', bgcolor: COLOR_ESTADO[estado] }} />
              <Typography fontSize={12.5} fontWeight={800} mt={0.5} sx={{ color: COLOR_ESTADO[estado] }}>{estado}</Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

function Esquema({ v }: { v: Informe['por_vehiculo'][number] }) {
  const ejes = [...new Set(v.posiciones.filter(p => p.eje > 0).map(p => p.eje))].sort((a, b) => a - b)
  const extra = v.posiciones.filter(p => p.eje <= 0)
  const caja = (p: Informe['por_vehiculo'][number]['posiciones'][number]) => {
    const ll = p.llanta
    const color = !ll ? '#E5E7EB' : ll.estado ? COLOR_ESTADO[ll.estado] : '#94A3B8'
    return (
      <Tooltip key={p.codigo} title={ll ? `${p.label} · ${ll.codigo} · ${[ll.marca, ll.referencia, ll.medida, ll.vida].filter(Boolean).join(' ')}${ll.pmin != null ? ` · ${ll.pmin} mm` : ' · sin inspección'}${ll.novedades.length ? ` · ${ll.novedades.join('; ')}` : ''}` : `${p.label}: vacía`}>
        <Box sx={{ width: 34, height: 52, borderRadius: 1, bgcolor: color, color: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 10.5, fontWeight: 800, border: ll?.novedades.length ? '2px solid #0F172A' : 'none' }}>
          {ll?.pmin != null ? ll.pmin : ''}
        </Box>
      </Tooltip>
    )
  }
  return (
    <Stack spacing={1} alignItems="center">
      {ejes.map(e => {
        const pos = v.posiciones.filter(p => p.eje === e)
        const izq = pos.filter(p => p.lado.startsWith('I'))
        const der = pos.filter(p => !p.lado.startsWith('I'))
        return (
          <Stack key={e} direction="row" alignItems="center" spacing={0.75}>
            <Stack direction="row" spacing={0.5}>{izq.map(caja)}</Stack>
            <Box sx={{ width: 70, height: 4, bgcolor: '#64748B', borderRadius: 2 }} />
            <Stack direction="row" spacing={0.5}>{der.map(caja)}</Stack>
          </Stack>
        )
      })}
      {extra.length > 0 && <Stack direction="row" spacing={0.5}>{extra.map(caja)}</Stack>}
    </Stack>
  )
}

function Inspecciones({ desde, hasta }: { desde: string; hasta: string }) {
  const qc = useQueryClient()
  const [pagina, setPagina] = useState(0)
  const [ver, setVer] = useState<number | null>(null)
  const { data } = useQuery({
    queryKey: ['lite-inspecciones', desde, hasta, pagina],
    queryFn: () => api.get(`${B}/inspecciones`, { params: { desde: desde || undefined, hasta: hasta || undefined, limite: 25, desplazamiento: pagina * 25 } })
      .then(r => ({ filas: r.data as any[], total: Number(r.headers['x-total-count'] ?? r.data.length) })),
    placeholderData: p => p,
  })
  const { data: ficha } = useQuery({
    queryKey: ['lite-inspeccion', ver], queryFn: () => api.get(`${B}/inspecciones/${ver}`).then(r => r.data), enabled: !!ver,
  })
  const reintentar = useMutation({
    mutationFn: (id: number) => api.post(`${B}/inspecciones/${id}/sincronizar`, null, { timeout: 120_000 }).then(r => r.data),
    onSuccess: (d: any) => {
      toast.success(`Sincronización: ${ETIQUETA_SYNC[d.estado_sync]?.texto ?? d.estado_sync}`)
      qc.invalidateQueries({ queryKey: ['lite-inspecciones'] }); qc.invalidateQueries({ queryKey: ['lite-inspeccion'] })
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 0 }}>
        <Typography fontWeight={700} fontSize={14}>Inspecciones de TittanLite</Typography>
        <Typography fontSize={11.5} color="text.secondary">
          Lo que no pasó las reglas de TittanWare queda solo en Lite con su motivo. Corrija el seguimiento y reintente.
        </Typography>
      </CardContent>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow>{['Fecha', 'Vehículo', 'Inspector', 'Llantas', 'Sincronizadas', 'Rechazadas', 'Estado', ''].map(h =>
            <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11.5 }}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {(data?.filas ?? []).map(f => (
              <TableRow key={f.id} hover sx={{ cursor: 'pointer' }} onClick={() => setVer(f.id)}>
                <TableCell>{new Date(f.fecha).toLocaleDateString('es-CO')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{f.placa}</TableCell>
                <TableCell>{f.inspector}</TableCell>
                <TableCell>{f.llantas}</TableCell>
                <TableCell>{f.sincronizadas}</TableCell>
                <TableCell>{f.rechazadas}</TableCell>
                <TableCell><Chip size="small" label={ETIQUETA_SYNC[f.estado_sync]?.texto ?? f.estado_sync} color={ETIQUETA_SYNC[f.estado_sync]?.color ?? 'default'} /></TableCell>
                <TableCell align="right">
                  {['RECHAZADA', 'PARCIAL', 'PENDIENTE'].includes(f.estado_sync) && (
                    <Tooltip title="Reintentar la sincronización">
                      <IconButton size="small" aria-label="Reintentar" disabled={reintentar.isPending}
                        onClick={e => { e.stopPropagation(); reintentar.mutate(f.id) }}><Sync fontSize="small" /></IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(data?.filas ?? []).length === 0 && (
              <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" py={1.5}>Sin inspecciones de TittanLite en el periodo.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      <TablePagination component="div" count={data?.total ?? 0} page={pagina} rowsPerPage={25} rowsPerPageOptions={[25]}
        onPageChange={(_, p) => setPagina(p)} />
      <Dialog open={!!ver} onClose={() => setVer(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Inspección {ficha?.placa ?? ''} · {ficha ? new Date(ficha.fecha).toLocaleString('es-CO') : ''}
          <IconButton aria-label="Cerrar" onClick={() => setVer(null)} sx={{ position: 'absolute', right: 8, top: 8 }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead><TableRow>{['Pos.', 'Llanta', 'Marca · ref.', 'Int/Cen/Ext', 'Psi', 'Novedades', 'Sincronización'].map(h =>
              <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11.5 }}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {(ficha?.llantas ?? []).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{l.posicion}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{l.codigo ?? '—'}</TableCell>
                  <TableCell>{[l.marca, l.referencia].filter(Boolean).join(' · ') || '—'}</TableCell>
                  <TableCell>{[l.profundidad_interna, l.profundidad_central, l.profundidad_externa].map((v: any) => v ?? '—').join(' / ')}</TableCell>
                  <TableCell>{l.presion ?? '—'}</TableCell>
                  <TableCell>{[...(l.novedades ?? []), l.observacion].filter(Boolean).join(' · ') || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={ETIQUETA_SYNC[l.sync_estado]?.texto ?? l.sync_estado} color={ETIQUETA_SYNC[l.sync_estado]?.color ?? 'default'} />
                    {l.sync_motivo && <Typography fontSize={11} color="text.secondary" mt={0.5}>{l.sync_motivo}</Typography>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function InformeTittanLite({ desde, hasta }: { desde: string; hasta: string }) {
  const params = { desde: desde || undefined, hasta: hasta || undefined }
  const [bajando, setBajando] = useState<'' | 'pdf' | 'excel'>('')
  const { data, isLoading, isFetching, isError } = useQuery<Informe>({
    queryKey: ['lite-informe', desde, hasta],
    queryFn: () => api.get(`${B}/informe`, { params, timeout: 300_000 }).then(r => r.data),
    placeholderData: p => p,
  })
  const bajar = async (tipo: 'pdf' | 'excel') => {
    setBajando(tipo)
    try {
      await descargar(`${B}/informe/${tipo}`, params, `tittanlite-${new Date().toISOString().slice(0, 10)}.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`)
    } catch (e: any) { toast.error(mensajeDeError(e, 'No hay inspecciones de TittanLite en el periodo')) } finally { setBajando('') }
  }

  if (isError) return <Alert severity="error">No se pudo cargar el informe de TittanLite.</Alert>
  if (isLoading || !data) return <LinearProgress />
  const sync = data.sincronizacion
  const totalSync = Object.values(sync).reduce((t, c) => t + c, 0)

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
        <Typography fontSize={12.5} color="text.secondary" sx={{ flex: 1 }}>
          Con la última inspección de TittanLite de cada vehículo en el periodo. Incluye lo que no pasó a TittanWare.
        </Typography>
        <Button variant="contained" color="error" startIcon={<PictureAsPdf />} disabled={!!bajando || !data.vehiculos}
          onClick={() => bajar('pdf')} sx={{ textTransform: 'none', fontWeight: 700 }}>{bajando === 'pdf' ? 'Generando…' : 'Informe PDF'}</Button>
        <BotonesEnviar informe={{ tipo: 'tittanlite_pdf', desde: desde || undefined, hasta: hasta || undefined }} />
        <Button variant="contained" startIcon={<Download />} disabled={!!bajando || !data.vehiculos}
          onClick={() => bajar('excel')} sx={{ textTransform: 'none', fontWeight: 700 }}>{bajando === 'excel' ? 'Generando…' : 'Descargar Excel'}</Button>
      </Stack>
      {isFetching && <LinearProgress />}
      {!data.vehiculos ? (
        <Alert severity="info">No hay inspecciones de TittanLite en el periodo.</Alert>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 2.4 }}><Kpi titulo="Vehículos inspeccionados" valor={n(data.vehiculos)} /></Grid>
            <Grid size={{ xs: 6, md: 2.4 }}><Kpi titulo="Llantas inspeccionadas" valor={n(data.llantas)} /></Grid>
            <Grid size={{ xs: 6, md: 2.4 }}><Kpi titulo="Profundidad promedio" valor={data.profundidad_promedio != null ? `${data.profundidad_promedio} mm` : '—'} nota="mínima de cada llanta" /></Grid>
            <Grid size={{ xs: 6, md: 2.4 }}><Kpi titulo="Novedades" valor={n(data.novedades)} nota={`en ${n(data.llantas_con_novedad)} llantas`} color={data.novedades ? '#DC2626' : undefined} /></Grid>
            <Grid size={{ xs: 12, md: 2.4 }}><Kpi titulo="Sincronizadas con TittanWare" valor={totalSync ? `${Math.round(100 * (sync.SINCRONIZADA ?? 0) / totalSync)} %` : '—'}
              nota={`${n(sync.RECHAZADA ?? 0)} rechazadas · ${n(sync.SIN_SEGUIMIENTO ?? 0)} solo en Lite`} /></Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}><Histograma filas={data.por_estado} minimo={data.umbrales.profundidad_minima} margen={data.umbrales.margen_alerta} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Reparto titulo="Por marca" filas={data.por_marca} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Reparto titulo="Por dimensión" filas={data.por_dimension} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Reparto titulo="Por vida" filas={data.por_vida} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Reparto titulo="Por referencia" filas={data.por_referencia} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Reparto titulo="Novedades calculadas" filas={data.por_novedad} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><Reparto titulo="Novedades marcadas en campo" filas={data.novedades_campo} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><Reparto titulo="Observaciones más recurrentes" filas={data.observaciones} /></Grid>
          </Grid>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={700} fontSize={14}>Esquema de llantas por vehículo</Typography>
              <Typography fontSize={11.5} color="text.secondary" mb={1.5}>
                El número es la profundidad mínima (mm); borde oscuro = con novedades; gris = montada sin inspección.
              </Typography>
              <Grid container spacing={2}>
                {data.por_vehiculo.slice(0, 60).map(v => (
                  <Grid key={v.activo_id} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 1.5 }}>
                      <Typography fontWeight={800} fontSize={13}>{v.placa}</Typography>
                      <Typography fontSize={11} color="text.secondary" mb={1}>
                        {v.tipo} · {v.fecha ? new Date(v.fecha).toLocaleDateString('es-CO') : 'sin fecha'}
                      </Typography>
                      <Esquema v={v} />
                    </Box>
                  </Grid>
                ))}
              </Grid>
              {data.por_vehiculo.length > 60 && (
                <Typography fontSize={11.5} color="text.secondary" mt={1}>Se muestran 60 de {data.por_vehiculo.length}; el PDF los trae todos.</Typography>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <Inspecciones desde={desde} hasta={hasta} />
    </Stack>
  )
}
