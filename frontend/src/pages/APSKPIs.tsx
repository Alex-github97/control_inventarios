/**
 * APS · Indicadores
 *
 * Era una «Supply Chain Control Tower» con indicadores escritos a mano. Ahora
 * cada indicador sale del plan vigente o de los pronósticos publicados, y la
 * tabla dice cómo se calcula cada uno: un indicador sin fórmula visible no se
 * puede discutir en una reunión.
 */
import { Box, Paper, Typography, LinearProgress, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import { Speed } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, n1, pesos, pct, mesCorto } from '@/api/aps'
import { Encabezado } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO

export default function APSKPIs() {
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'exactitud'], queryFn: apsApi.exactitud })
  const k = data?.kpis
  const filas: [string, string, string][] = k ? [
    ['Exactitud del pronóstico publicado', pct(k.exactitud_publicada_pct), `100 − WAPE de lo publicado contra la demanda real (${k.periodos_publicados_evaluados} meses evaluados)`],
    ['Sesgo del pronóstico publicado', k.sesgo_publicado_pct != null ? `${k.sesgo_publicado_pct > 0 ? '+' : ''}${n1(k.sesgo_publicado_pct)} %` : '—', 'Σ(pronóstico − real) ÷ Σ real. Positivo: se pronosticó de más'],
    ['Exactitud en validación', pct(k.exactitud_validacion_pct), 'Del método elegido, en los meses que no vio al ajustar, ponderado por volumen'],
    ['Series con historia suficiente', `${k.series_con_historia_suficiente} de ${k.series}`, 'Producto-ubicación con al menos 6 meses de demanda'],
    ['Inventario valorizado', pesos(k.valor_inventario), 'Existencias × costo unitario'],
    ['Cobertura', k.cobertura_dias != null ? `${n0(k.cobertura_dias)} días` : '—', 'Existencias ÷ demanda diaria de los próximos 3 meses'],
    ['Rotación proyectada', k.rotacion_proyectada != null ? `${n1(k.rotacion_proyectada)} veces/año` : '—', 'Costo de la demanda anual ÷ inventario promedio proyectado'],
    ['Uso de capacidad promedio', pct(k.uso_capacidad_promedio_pct), 'Carga del plan ÷ capacidad, promedio de recursos y meses'],
    ['Uso de capacidad máximo', pct(k.uso_capacidad_maximo_pct), 'El peor recurso en su peor mes'],
    ['Recursos sobrecargados', n0(k.recursos_sobrecargados), 'Recursos con algún mes por encima del 100 %'],
    ['Órdenes sugeridas', n0(k.ordenes_sugeridas), 'Producción, compra y traslado que el plan propone'],
    ['Órdenes atrasadas', n0(k.ordenes_atrasadas), 'Debían lanzarse antes de hoy para llegar a tiempo: riesgo de quiebre'],
    ['Costo de producción y compras', pesos(k.costo_ordenes), 'Cantidad × costo unitario de las órdenes sugeridas'],
    ['Alertas críticas', n0(k.alertas_criticas), 'Quiebres por atraso y capacidad por encima del 120 %'],
  ] : []
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Speed sx={{ fontSize: 28 }} />} titulo="Indicadores de planeación" subtitulo="APS · Cada indicador con su fórmula, calculado del plan vigente" color={C} />
        {isLoading && <LinearProgress />}
        {k && (<>
          <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 12, fontWeight: 700 } }}><TableCell>Indicador</TableCell><TableCell align="right">Valor</TableCell><TableCell>Cómo se calcula</TableCell></TableRow></TableHead>
              <TableBody>{filas.map(([a, b, c]) => <TableRow key={a} sx={{ '& td': { fontSize: 13 } }}><TableCell><b>{a}</b></TableCell><TableCell align="right" sx={{ fontWeight: 800, color: C }}>{b}</TableCell><TableCell sx={{ color: 'text.secondary', fontSize: '12px !important' }}>{c}</TableCell></TableRow>)}</TableBody>
            </Table>
          </Paper>
          {data!.por_mes.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={800} mb={1}>Exactitud publicada por mes</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 140 }}>
                {data!.por_mes.map(m => (
                  <Box key={m.clave} sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography fontSize={11} fontWeight={700}>{pct(m.exactitud_pct)}</Typography>
                    <Box sx={{ height: `${Math.max(0, m.exactitud_pct ?? 0)}px`, bgcolor: C, borderRadius: 1, opacity: 0.8 }} />
                    <Typography fontSize={10} color="text.secondary">{mesCorto(m.clave)}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
        </>)}
      </Box>
    </Layout>
  )
}
