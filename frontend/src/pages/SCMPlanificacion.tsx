/**
 * SCM · Planificación de abastecimiento
 *
 * Era una maqueta: cuatro «planes» con presupuestos de miles de millones, una
 * demanda con «forecast +28 %» y un «accuracy 82 %» —el sistema no pronostica
 * nada—.
 *
 * Ahora es reposición con datos: qué referencias hay que pedir, cuánto duran
 * las existencias al ritmo real de consumo, lo que ya viene en camino y la
 * cantidad sugerida. Y la variación real de lo comprado por categoría:
 * medida, no pronosticada.
 */
import { useState } from 'react'
import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper, LinearProgress, Typography, TextField, MenuItem, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Timeline } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { scmApi } from '@/api/scm'
import { Cifra, Encabezado } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SCM_COLOR = COLOR_MODULO
const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const CAT: Record<string, string> = { INSUMOS: 'Insumos', SERVICIOS: 'Servicios', EQUIPOS: 'Equipos', MATERIALES: 'Materiales', LOGISTICA: 'Logística', IT: 'Tecnología', REPUESTOS: 'Repuestos', PAPELERIA: 'Papelería', OTROS: 'Otros' }

export default function SCMPlanificacion() {
  const [dias, setDias] = useState(90)
  const { data, isLoading } = useQuery({ queryKey: ['scm-reposicion', dias], queryFn: () => scmApi.reposicion(dias) })
  const { data: demanda = [] } = useQuery({ queryKey: ['scm-demanda'], queryFn: scmApi.demanda })
  const items = data?.items ?? []
  const pedir = items.filter(i => i.sugerido > 0)
  const sinCobertura = items.filter(i => i.existencias <= 0)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
          <Encabezado icono={<Timeline sx={{ fontSize: 28 }} />} titulo="Planificación de abastecimiento" subtitulo="SCM · Reposición por consumo real y variación de compras" color={SCM_COLOR} />
          <TextField select size="small" label="Consumo de los últimos" value={dias} onChange={e => setDias(Number(e.target.value))} sx={{ minWidth: 190 }}>
            {[30, 90, 180, 365].map(d => <MenuItem key={d} value={d}>{d} días</MenuItem>)}
          </TextField>
        </Box>
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 4 }}><Cifra etiqueta="Referencias por reponer" valor={pedir.length} color={SCM_COLOR} sub="Bajo el mínimo o con menos de 15 días de cobertura" /></Grid>
          <Grid size={{ xs: 6, md: 4 }}><Cifra etiqueta="Sin existencias" valor={sinCobertura.length} color="#DC2626" /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Cifra etiqueta="Ya cubiertas con órdenes en camino" valor={items.filter(i => i.sugerido === 0).length} color="#15803D" /></Grid>
        </Grid>

        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', mb: 3 }}>
          <Typography fontWeight={700} fontSize={14} sx={{ p: 2, pb: 0 }}>Reposición sugerida</Typography>
          <Typography fontSize={11} color="text.secondary" sx={{ px: 2 }}>Sugerido = hasta el máximo (o dos veces el mínimo si no hay máximo), descontando existencias y lo que ya viene en camino.</Typography>
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Referencia</TableCell><TableCell align="right">Existencias</TableCell><TableCell align="right">Mínimo</TableCell>
              <TableCell align="right">Consumo / día</TableCell><TableCell align="right">Cobertura</TableCell><TableCell align="right">En camino</TableCell><TableCell align="right">Sugerido</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {!isLoading && items.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>Nada que reponer: todo está sobre el mínimo con cobertura suficiente</TableCell></TableRow>}
              {items.map(i => {
                const c = i.dias_cobertura == null ? undefined : i.dias_cobertura < 7 ? '#DC2626' : i.dias_cobertura < 15 ? '#D97706' : undefined
                return (
                  <TableRow key={i.repuesto_id}>
                    <TableCell sx={{ fontSize: 12 }}><Box component="span" sx={{ fontFamily: 'monospace' }}>{i.codigo}</Box> · {i.nombre}{i.categoria && <Box component="span" sx={{ color: 'text.secondary' }}> · {i.categoria}</Box>}</TableCell>
                    <TableCell align="right" sx={{ color: i.existencias <= 0 ? 'error.main' : undefined, fontWeight: 700 }}>{i.existencias}</TableCell>
                    <TableCell align="right">{i.minimo}</TableCell>
                    <TableCell align="right" sx={{ fontSize: 12 }}>{i.consumo_diario ? i.consumo_diario.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : 'Sin consumo'}</TableCell>
                    <TableCell align="right" sx={{ color: c, fontWeight: c ? 700 : 400, fontSize: 12 }}>{i.dias_cobertura == null ? '—' : `${i.dias_cobertura} días`}</TableCell>
                    <TableCell align="right">{i.en_camino || '—'}</TableCell>
                    <TableCell align="right">{i.sugerido > 0 ? <Chip size="small" label={`${i.sugerido.toLocaleString('es-CO')} ${i.unidad ?? ''}`} sx={{ fontWeight: 700, bgcolor: alpha(SCM_COLOR, 0.12), color: SCM_COLOR }} /> : <Chip size="small" label="Cubierto" color="success" variant="outlined" />}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          <Typography fontWeight={700} fontSize={14} sx={{ p: 2, pb: 0 }}>Compras por categoría</Typography>
          <Typography fontSize={11} color="text.secondary" sx={{ px: 2 }}>Valor de las órdenes de compra de los últimos 90 días frente a los 90 anteriores.</Typography>
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Categoría</TableCell><TableCell align="right">Últimos 90 días</TableCell><TableCell align="right">90 días anteriores</TableCell><TableCell align="right">Variación</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {demanda.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin órdenes de compra en los últimos 180 días</TableCell></TableRow>}
              {demanda.map(d => (
                <TableRow key={d.categoria}>
                  <TableCell>{CAT[d.categoria] ?? d.categoria}</TableCell>
                  <TableCell align="right">{cop(d.actual)}</TableCell>
                  <TableCell align="right">{cop(d.anterior)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: d.variacion_pct == null ? 'text.secondary' : d.variacion_pct > 0 ? '#D97706' : '#15803D' }}>
                    {d.variacion_pct == null ? 'Nueva' : `${d.variacion_pct > 0 ? '+' : ''}${d.variacion_pct}%`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Layout>
  )
}
