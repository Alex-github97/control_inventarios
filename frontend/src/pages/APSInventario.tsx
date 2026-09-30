/**
 * APS · Inventario objetivo
 *
 * Era maqueta: parámetros «óptimos», coberturas y una matriz ABC-XYZ escritos
 * a mano. Ahora cada cifra se calcula:
 *
 *   stock de seguridad = z(nivel de servicio) × error del pronóstico × √(1 + LT/30)
 *   punto de reorden   = demanda durante el tiempo de entrega + stock de seguridad
 *   EOQ                = √(2 × demanda anual × costo de pedido ÷ costo de mantener)
 *   ABC                = por valor anual consumido (80 / 15 / 5 %)
 *   XYZ                = por variabilidad mensual (CV ≤ 0,5 / ≤ 1 / > 1)
 *
 * El stock de seguridad usa el error real del pronóstico, no la variación de
 * la demanda: si la demanda sube en diciembre y el modelo lo sabe, eso no es
 * incertidumbre y no debe inflar el inventario.
 */
import { useState } from 'react'
import { Box, Paper, Typography, Tabs, Tab, LinearProgress, Alert, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Inventory } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, n1, pesos, nombreP, nombreU } from '@/api/aps'
import { Encabezado, Cifra, Etiqueta } from '@/components/comun/Registro'
import { Existencias } from '@/pages/APSConfig'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
const LECTURA: Record<string, string> = {
  AX: 'Valiosos y estables: control estrecho, pedidos frecuentes', AY: 'Valiosos, algo variables', AZ: 'Valiosos e impredecibles: revisar políticas una a una',
  BX: 'Intermedios y estables', BY: 'Intermedios', BZ: 'Intermedios e impredecibles',
  CX: 'Poco valor y estables: automatizar', CY: 'Poco valor', CZ: 'Poco valor e impredecibles: considerar bajo pedido',
}

function Objetivo() {
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'inventario'], queryFn: apsApi.inventario })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  if (!data.inventario.length) return <Alert severity="info" sx={{ m: 3 }}>Sin demanda registrada no hay con qué calcular el inventario objetivo.</Alert>
  const k = data.kpis
  const filas = [...data.inventario].sort((a, b) => b.valor_anual - a.valor_anual)
  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Inventario valorizado hoy" valor={pesos(k.valor_inventario)} color={C} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Cobertura" valor={k.cobertura_dias != null ? `${n0(k.cobertura_dias)} días` : '—'} color="#7C3AED" /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Rotación proyectada" valor={k.rotacion_proyectada != null ? `${n1(k.rotacion_proyectada)} veces/año` : '—'} color="#16A34A" /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Bajo el punto de reorden" valor={filas.filter(f => f.stock_actual < f.punto_reorden).length} color="#DC2626" sub={`de ${filas.length} productos-ubicación`} /></Grid>
      </Grid>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', maxHeight: 560 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}>
            <TableCell>Producto</TableCell><TableCell>Ubicación</TableCell><TableCell>Clase</TableCell><TableCell align="right">Demanda/mes</TableCell>
            <TableCell align="right">Stock seguridad</TableCell><TableCell align="right">Punto de reorden</TableCell><TableCell align="right">EOQ</TableCell>
            <TableCell align="right">Máximo</TableCell><TableCell align="right">Existencias</TableCell><TableCell align="right">Cobertura</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {filas.map(f => {
              const bajo = f.stock_actual < f.punto_reorden, exceso = f.stock_actual > f.stock_maximo * 1.5
              return (
                <TableRow key={`${f.producto_id}-${f.ubicacion_id}`} sx={{ '& td': { fontSize: 12 } }}>
                  <TableCell><b>{nombreP(data, f.producto_id)}</b></TableCell><TableCell>{nombreU(data, f.ubicacion_id)}</TableCell>
                  <TableCell><Etiqueta texto={`${f.abc}${f.xyz ?? ''}`} color={f.abc === 'A' ? '#DC2626' : f.abc === 'B' ? '#D97706' : '#64748B'} /></TableCell>
                  <TableCell align="right">{n0(f.demanda_mensual)}</TableCell><TableCell align="right">{n0(f.stock_seguridad)}</TableCell>
                  <TableCell align="right">{n0(f.punto_reorden)}</TableCell><TableCell align="right">{n0(f.eoq)}</TableCell><TableCell align="right">{n0(f.stock_maximo)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: bajo ? '#DC2626' : exceso ? '#D97706' : undefined }}>{n0(f.stock_actual)}</TableCell>
                  <TableCell align="right">{f.cobertura_dias != null ? `${n0(f.cobertura_dias)} d` : '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>
      <Typography fontSize={11} color="text.secondary" mt={1}>Rojo: existencias por debajo del punto de reorden. Naranja: más de 1,5 veces el máximo (exceso). Sin costo unitario no se calcula el EOQ.</Typography>
    </Box>
  )
}

function Matriz() {
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'inventario'], queryFn: apsApi.inventario })
  if (isLoading) return <LinearProgress />
  if (!data) return null
  return (
    <Box sx={{ p: 3 }}>
      <Typography fontSize={13} color="text.secondary" mb={2}>ABC por valor anual consumido; XYZ por qué tan variable es la demanda mes a mes. Cada cuadrante pide una política distinta.</Typography>
      <Grid container spacing={1} sx={{ maxWidth: 900 }}>
        {['A', 'B', 'C'].map(a => ['X', 'Y', 'Z'].map(x => (
          <Grid key={a + x} size={4}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', bgcolor: a === 'A' ? '#FEF2F2' : a === 'B' ? '#FFFBEB' : '#F8FAFC' }}>
              <Typography fontWeight={800}>{a}{x} · {data.matriz[a + x] ?? 0}</Typography>
              <Typography fontSize={11} color="text.secondary">{LECTURA[a + x]}</Typography>
            </Paper>
          </Grid>
        )))}
      </Grid>
      {(data.matriz['A-'] || data.matriz['B-'] || data.matriz['C-']) && <Typography fontSize={11} color="text.secondary" mt={1}>Sin clase XYZ (menos de dos meses de historia): {(data.matriz['A-'] ?? 0) + (data.matriz['B-'] ?? 0) + (data.matriz['C-'] ?? 0)}.</Typography>}
    </Box>
  )
}

export default function APSInventario() {
  const [tab, setTab] = useState(0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Inventory sx={{ fontSize: 28 }} />} titulo="Inventario objetivo" subtitulo="APS · Stock de seguridad, punto de reorden, EOQ y clasificación ABC-XYZ calculados" color={C} />
        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }}>
            <Tab label="Inventario objetivo" /><Tab label="Matriz ABC-XYZ" /><Tab label="Existencias y políticas" />
          </Tabs>
          {tab === 0 && <Objetivo />}{tab === 1 && <Matriz />}{tab === 2 && <Existencias />}
        </Paper>
      </Box>
    </Layout>
  )
}
