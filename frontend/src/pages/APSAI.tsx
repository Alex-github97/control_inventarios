/**
 * APS · Analítica de la demanda
 *
 * Era una pantalla «IA autónoma» con predicciones de quiebre al 65 %, una
 * «optimización» con ahorros del 11 %, un «gemelo digital» y un asistente,
 * todo escrito a mano. Ahora responde tres preguntas con los datos:
 *
 *  - ¿Qué tan pronosticable es cada producto? Clasificación de Syntetos-Boylan
 *    (intervalo entre demandas y variabilidad del tamaño).
 *  - ¿Qué método ganó y cuánto aporta? El valor agregado del pronóstico (FVA):
 *    cuánto error le quita al método ingenuo. Si es cero o negativo, el
 *    modelo no está ayudando.
 *  - ¿Qué meses de la historia son atípicos? Un pedido extraordinario o un
 *    error de digitación distorsionan el pronóstico: conviene revisarlos.
 */
import { useState } from 'react'
import { Box, Paper, Typography, Tabs, Tab, LinearProgress, Alert, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Insights } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, n1, pct, nombreP, nombreU, mesCorto, CLASE_DEMANDA } from '@/api/aps'
import { Encabezado, Cifra, Etiqueta } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
const CONSEJO: Record<string, string> = {
  SUAVE: 'Se pronostica bien con métodos clásicos.',
  ERRATICA: 'Pedidos todos los meses pero de tamaño muy variable: stock de seguridad alto o acuerdos de volumen.',
  INTERMITENTE: 'Meses sin demanda y pedidos de tamaño parecido: Croston; considerar bajo pedido.',
  IRREGULAR: 'Meses sin demanda y pedidos de tamaño muy variable: lo más difícil de pronosticar; revisar si conviene tenerlo en inventario.',
  SIN_DATOS: 'Menos de dos meses con demanda.',
}

export default function APSAI() {
  const [tab, setTab] = useState(0)
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'analitica'], queryFn: apsApi.analitica })
  const series = data?.series ?? []
  const sinValor = series.filter(s => s.fva_pct != null && s.fva_pct <= 0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Insights sx={{ fontSize: 28 }} />} titulo="Analítica de la demanda" subtitulo="APS · Qué tan pronosticable es cada producto, qué método ganó y qué meses son atípicos" color={C} />
        {isLoading && <LinearProgress />}
        {data && !series.length && <Alert severity="info">Sin demanda registrada no hay nada que analizar.</Alert>}
        {series.length > 0 && (<>
          <Grid container spacing={2} mb={2}>
            {Object.entries(CLASE_DEMANDA).filter(([k]) => data!.clases[k]).map(([k, [t, col]]) => (
              <Grid key={k} size={{ xs: 6, md: 3 }}><Cifra etiqueta={`Demanda ${t.toLowerCase()}`} valor={data!.clases[k]} color={col} sub={CONSEJO[k]} /></Grid>
            ))}
          </Grid>
          <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }}>
              <Tab label="Métodos y valor agregado" /><Tab label={`Meses atípicos (${data!.atipicos.length})`} />
            </Tabs>
            {tab === 0 && (
              <Box sx={{ p: 3 }}>
                {sinValor.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{sinValor.length} serie(s) donde el mejor método no le gana al ingenuo (repetir el último mes): el pronóstico no está agregando valor ahí.</Alert>}
                <Table size="small">
                  <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Producto</TableCell><TableCell>Ubicación</TableCell><TableCell>Demanda</TableCell><TableCell align="right">ADI</TableCell><TableCell align="right">CV²</TableCell><TableCell>Método ganador</TableCell><TableCell align="right">WAPE</TableCell><TableCell align="right">Valor agregado</TableCell></TableRow></TableHead>
                  <TableBody>
                    {series.map(s => (
                      <TableRow key={`${s.producto_id}-${s.ubicacion_id}`} sx={{ '& td': { fontSize: 12 } }}>
                        <TableCell><b>{nombreP(data, s.producto_id)}</b></TableCell><TableCell>{nombreU(data, s.ubicacion_id)}</TableCell>
                        <TableCell><Etiqueta texto={CLASE_DEMANDA[s.clase.tipo]?.[0] ?? s.clase.tipo} color={CLASE_DEMANDA[s.clase.tipo]?.[1] ?? '#64748B'} /></TableCell>
                        <TableCell align="right">{n1(s.clase.adi)}</TableCell><TableCell align="right">{n1(s.clase.cv2)}</TableCell>
                        <TableCell>{s.metodo ?? '—'}</TableCell><TableCell align="right">{pct(s.wape)}</TableCell>
                        <TableCell align="right" sx={{ color: (s.fva_pct ?? 0) <= 0 ? '#DC2626' : '#16A34A', fontWeight: 700 }}>{s.fva_pct != null ? `${n1(s.fva_pct)} %` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Typography fontSize={11} color="text.secondary" mt={1}>ADI: meses promedio entre demandas (1 = todos los meses). CV²: variabilidad del tamaño del pedido. Valor agregado: cuánto error le quita el método al ingenuo en los meses de validación.</Typography>
              </Box>
            )}
            {tab === 1 && (
              <Box sx={{ p: 3 }}>
                {!data!.atipicos.length && <Alert severity="success">Ningún mes se aleja de lo normal en las series con al menos 12 meses.</Alert>}
                {data!.atipicos.length > 0 && (
                  <Table size="small">
                    <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Producto</TableCell><TableCell>Ubicación</TableCell><TableCell>Mes</TableCell><TableCell align="right">Demanda</TableCell><TableCell align="right">Lo normal (mediana)</TableCell><TableCell align="right">Desvío</TableCell></TableRow></TableHead>
                    <TableBody>
                      {data!.atipicos.map((a, i) => (
                        <TableRow key={i} sx={{ '& td': { fontSize: 12 } }}>
                          <TableCell><b>{nombreP(data, a.producto_id)}</b></TableCell><TableCell>{nombreU(data, a.ubicacion_id)}</TableCell><TableCell>{mesCorto(a.periodo)}</TableCell>
                          <TableCell align="right">{n0(a.cantidad)}</TableCell><TableCell align="right">{n0(a.mediana)}</TableCell>
                          <TableCell align="right" sx={{ color: a.z > 0 ? '#DC2626' : '#D97706', fontWeight: 700 }}>{a.z > 0 ? '+' : ''}{n1(a.z)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <Typography fontSize={11} color="text.secondary" mt={1}>Desvío robusto (mediana y desviación absoluta mediana); se marca por encima de 3,5. Si fue un pedido extraordinario que no se repetirá, corríjalo en Demanda → Historia para que no distorsione el pronóstico.</Typography>
              </Box>
            )}
          </Paper>
        </>)}
      </Box>
    </Layout>
  )
}
