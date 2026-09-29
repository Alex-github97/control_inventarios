/**
 * SCM · Logística de abastecimiento
 *
 * Era una maqueta: cuatro «embarques» —uno desde Shanghái— y un 87 % de
 * entregas a tiempo escritos a mano. El sistema no registra embarques: lo que
 * sí sabe es qué órdenes de compra están en camino y cuándo debían llegar.
 * Eso es lo que muestra: lo pendiente por recibir, su atraso, y la
 * puntualidad de los proveedores en los últimos 90 días.
 */
import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper, LinearProgress, Typography, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { LocalShipping } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { scmApi } from '@/api/scm'
import { Cifra, Encabezado, fmtFecha } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SCM_COLOR = COLOR_MODULO
const ESTADOS: Record<string, { l: string; c: string }> = {
  ENVIADA: { l: 'Enviada', c: '#6B7280' }, CONFIRMADA: { l: 'Confirmada', c: '#0369A1' },
  EN_TRANSITO: { l: 'En tránsito', c: '#7C3AED' }, RECIBIDA_PARCIAL: { l: 'Recibida parcial', c: '#D97706' },
}
const cop = (n?: number | null) => (n == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n))

export default function SCMLogistica() {
  const { data, isLoading } = useQuery({ queryKey: ['scm-entrantes'], queryFn: scmApi.entrantes })
  const lista = data?.en_camino ?? []
  const atrasadas = lista.filter(o => o.dias_atraso > 0)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<LocalShipping sx={{ fontSize: 28 }} />} titulo="Logística de abastecimiento" subtitulo="SCM · Órdenes de compra en camino y puntualidad de proveedores" color={SCM_COLOR} />
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Órdenes en camino" valor={lista.length} color={SCM_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Atrasadas" valor={atrasadas.length} color="#DC2626" sub="Pasada la fecha esperada" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Entregas a tiempo (90 días)" valor={data?.a_tiempo_pct == null ? '—' : `${data.a_tiempo_pct}%`} color="#15803D" sub={data?.medibles ? `Sobre ${data.medibles} órdenes con fecha esperada` : 'Sin órdenes recibidas con fecha'} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Recibidas este mes" valor={data?.recibidas_mes ?? 0} color="#0369A1" /></Grid>
        </Grid>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Orden</TableCell><TableCell>Proveedor</TableCell><TableCell>Destino</TableCell><TableCell>Esperada</TableCell>
              <TableCell align="right">Recibido</TableCell><TableCell align="right">Valor</TableCell><TableCell>Estado</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {!isLoading && lista.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>No hay órdenes de compra en camino</TableCell></TableRow>}
              {lista.map(o => {
                const e = ESTADOS[o.estado] ?? { l: o.estado, c: '#6B7280' }
                const pct = o.unidades_pedidas ? (o.unidades_recibidas / o.unidades_pedidas) * 100 : 0
                return (
                  <TableRow key={o.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{o.numero}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{o.proveedor ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{o.lugar_entrega ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmtFecha(o.fecha_esperada)}
                      {o.dias_atraso > 0 && <Typography fontSize={11} color="error.main" fontWeight={700}>{o.dias_atraso} día{o.dias_atraso === 1 ? '' : 's'} de atraso</Typography>}</TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, minWidth: 110 }}>{o.unidades_recibidas} / {o.unidades_pedidas}
                      <Box sx={{ mt: 0.5, height: 4, borderRadius: 2, bgcolor: '#E5E7EB' }}><Box sx={{ height: 4, borderRadius: 2, width: `${pct}%`, bgcolor: SCM_COLOR }} /></Box></TableCell>
                    <TableCell align="right" sx={{ fontSize: 12 }}>{cop(o.total)}</TableCell>
                    <TableCell><Chip size="small" label={e.l} sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(e.c, 0.12), color: e.c }} /></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Paper>
        <Typography fontSize={11} color="text.secondary" mt={1}>Los estados de cada orden se actualizan en Órdenes de compra.</Typography>
      </Box>
    </Layout>
  )
}
