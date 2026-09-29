/**
 * SCM · Inventario
 *
 * Era una maqueta: cuatro bodegas con «$ 3.8 B» y porcentajes de ocupación
 * que el sistema no puede saber —no registra la capacidad de las bodegas—, y
 * tres alertas escritas a mano.
 *
 * Ahora muestra el inventario real del módulo de inventario: valor y
 * referencias por bodega, y lo que está bajo el mínimo junto con lo que ya
 * viene en camino en órdenes de compra abiertas, para no pedir dos veces.
 */
import { Box, Typography, Paper, Chip, Table, TableBody, TableCell, TableHead, TableRow, LinearProgress, Button, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Inventory2 } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { scmApi } from '@/api/scm'
import { Cifra, Encabezado } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SCM_COLOR = COLOR_MODULO
const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function SCMInventario() {
  const { data, isLoading } = useQuery({ queryKey: ['scm-inventario'], queryFn: scmApi.inventario })
  const bodegas = data?.bodegas ?? []
  const alertas = data?.alertas ?? []
  const sinCubrir = alertas.filter(a => a.cantidad + a.en_camino < a.minimo)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Inventory2 sx={{ fontSize: 28 }} />} titulo="Inventario" subtitulo="SCM · Existencias por bodega y alertas de mínimo" color={SCM_COLOR} />
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Valor del inventario" valor={cop(data?.valor_total ?? 0)} color={SCM_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Bodegas activas" valor={bodegas.length} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Bajo el mínimo" valor={alertas.length} color="#D97706" sub={`${alertas.filter(a => a.nivel === 'CRITICO').length} críticas`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Sin cubrir con lo pedido" valor={sinCubrir.length} color="#DC2626" sub="Aun con lo que viene en camino" /></Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
              <Typography fontWeight={700} fontSize={14} sx={{ p: 2, pb: 1 }}>Bodegas</Typography>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
                  <TableCell>Bodega</TableCell><TableCell align="right">Referencias</TableCell><TableCell align="right">Valor</TableCell><TableCell align="right">Bajo mín.</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {!isLoading && bodegas.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin bodegas activas</TableCell></TableRow>}
                  {bodegas.map(b => {
                    const pct = data?.valor_total ? (b.valor / data.valor_total) * 100 : 0
                    return (
                      <TableRow key={b.id}>
                        <TableCell sx={{ fontSize: 12 }}><b>{b.nombre}</b>
                          <Box sx={{ mt: 0.5, height: 4, borderRadius: 2, bgcolor: '#E5E7EB' }}><Box sx={{ height: 4, borderRadius: 2, width: `${pct}%`, bgcolor: SCM_COLOR }} /></Box>
                        </TableCell>
                        <TableCell align="right">{b.referencias}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12 }}>{cop(b.valor)}</TableCell>
                        <TableCell align="right" sx={{ color: b.bajo_minimo ? 'error.main' : undefined, fontWeight: b.bajo_minimo ? 700 : 400 }}>{b.bajo_minimo}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
              <Box sx={{ p: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography fontWeight={700} fontSize={14}>Referencias bajo el mínimo</Typography>
                <Button size="small" component={RouterLink} to="/scm/planificacion">Ver reposición sugerida</Button>
              </Box>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
                  <TableCell>Referencia</TableCell><TableCell>Bodega</TableCell><TableCell align="right">Existencias</TableCell>
                  <TableCell align="right">Mínimo</TableCell><TableCell align="right">En camino</TableCell><TableCell>Nivel</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {!isLoading && alertas.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>Todo está sobre el mínimo</TableCell></TableRow>}
                  {alertas.map(a => {
                    const c = a.nivel === 'CRITICO' ? '#DC2626' : '#D97706'
                    return (
                      <TableRow key={`${a.repuesto_id}-${a.bodega}`}>
                        <TableCell sx={{ fontSize: 12 }}><Box component="span" sx={{ fontFamily: 'monospace' }}>{a.codigo}</Box> · {a.nombre}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{a.bodega ?? 'Sin existencias en ninguna'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: c }}>{a.cantidad}</TableCell>
                        <TableCell align="right">{a.minimo}</TableCell>
                        <TableCell align="right">{a.en_camino || '—'}</TableCell>
                        <TableCell><Chip size="small" label={a.nivel === 'CRITICO' ? 'Crítico' : 'Bajo'} sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(c, 0.12), color: c }} /></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
