/**
 * APS · Transporte
 *
 * Era maqueta: despachos planificados, rutas multi-parada «sugeridas», una
 * consolidación de carga y una «integración TMS» con diferencias inventadas.
 *
 * Ahora es la consolidación de los traslados del DRP: cada ruta (origen,
 * destino) y mes suma el peso de lo que hay que enviar y calcula cuántos
 * camiones hacen falta y qué tan llenos van. La capacidad del camión es la
 * restricción de transporte de la ubicación de origen, o la general de
 * Configuración. La optimización de rutas multi-parada y la integración con
 * TMS se quitaron: no había nada detrás.
 */
import { Box, Paper, Typography, LinearProgress, Alert, Table, TableHead, TableRow, TableCell, TableBody, Tooltip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { LocalShipping } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, pct, nombreU, nombreP, mesCorto } from '@/api/aps'
import { Encabezado, Cifra, Etiqueta } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO

export default function APSTransporte() {
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'transporte'], queryFn: apsApi.transporte })
  const cargas = data?.cargas ?? []
  const camiones = cargas.reduce((s, c) => s + (c.camiones ?? 0), 0)
  const ocupaciones = cargas.filter(c => c.ocupacion_pct != null).map(c => c.ocupacion_pct!)
  const sinPeso = Array.from(new Set(cargas.flatMap(c => c.productos_sin_peso)))
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<LocalShipping sx={{ fontSize: 28 }} />} titulo="Transporte" subtitulo="APS · Traslados del plan consolidados en camiones por ruta y mes" color={C} />
        {isLoading && <LinearProgress />}
        {data && !cargas.length && <Alert severity="info">No hay traslados planificados: ningún centro de distribución necesita envíos en el horizonte.</Alert>}
        {cargas.length > 0 && (<>
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Despachos (ruta y mes)" valor={cargas.length} color={C} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Camiones" valor={n0(camiones)} color="#7C3AED" /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Ocupación promedio" valor={ocupaciones.length ? pct(ocupaciones.reduce((a, b) => a + b, 0) / ocupaciones.length) : '—'} color="#16A34A" /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Kilos a mover" valor={n0(cargas.reduce((s, c) => s + c.kg, 0))} color="#D97706" /></Grid>
          </Grid>
          {sinPeso.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>Productos sin peso registrado ({sinPeso.join(', ')}): no entran en el cálculo de camiones. Regístrelo en Configuración → Productos.</Alert>}
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}>
                <TableCell>Mes</TableCell><TableCell>Ruta</TableCell><TableCell align="right">Unidades</TableCell><TableCell align="right">Kilos</TableCell>
                <TableCell align="right">Capacidad del camión</TableCell><TableCell align="right">Camiones</TableCell><TableCell align="right">Ocupación</TableCell><TableCell />
              </TableRow></TableHead>
              <TableBody>
                {cargas.map((c, i) => {
                  const ultimo = c.camiones && c.kg ? (c.kg - (c.camiones - 1) * c.capacidad_camion_kg) / c.capacidad_camion_kg * 100 : null
                  return (
                    <Tooltip key={i} title={c.lineas.map(l => `${nombreP(data, l.producto_id)}: ${n0(l.cantidad)}`).join(' · ')} placement="top">
                      <TableRow sx={{ '& td': { fontSize: 12 } }}>
                        <TableCell>{mesCorto(c.periodo)}</TableCell><TableCell><b>{nombreU(data, c.origen_id)} → {nombreU(data, c.destino_id)}</b></TableCell>
                        <TableCell align="right">{n0(c.unidades)}</TableCell><TableCell align="right">{n0(c.kg)}</TableCell>
                        <TableCell align="right">{n0(c.capacidad_camion_kg)} kg</TableCell><TableCell align="right"><b>{c.camiones ?? '—'}</b></TableCell>
                        <TableCell align="right">{pct(c.ocupacion_pct)}</TableCell>
                        <TableCell>{ultimo != null && ultimo < 40 && c.camiones! > 1 && <Etiqueta texto={`Último camión al ${n0(ultimo)} %`} color="#D97706" />}</TableCell>
                      </TableRow>
                    </Tooltip>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
          <Typography fontSize={11} color="text.secondary" mt={1}>Un último camión casi vacío es una oportunidad: adelantar o posponer parte del traslado al mes vecino puede ahorrar un viaje.</Typography>
        </>)}
      </Box>
    </Layout>
  )
}
