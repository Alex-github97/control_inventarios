/**
 * APS · Capacidad (RCCP)
 *
 * Era maqueta: carga contra capacidad, cuellos de botella, una «matriz de
 * decisión» y turnos por planta escritos a mano. Ahora es la carga que el plan
 * pone sobre cada recurso: órdenes de producción × horas por unidad de su
 * ruta, contra horas por día × días hábiles × eficiencia.
 *
 * Es capacidad gruesa (RCCP): dice en qué mes y qué recurso no alcanza, no
 * programa las operaciones hora a hora.
 */
import { Box, Paper, Typography, Alert, LinearProgress, Table, TableHead, TableRow, TableCell, TableBody, Tooltip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Factory } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, pct, nombreR, mesCorto } from '@/api/aps'
import { Encabezado, Cifra } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
const color = (u: number | null) => u == null ? '#F8FAFC' : u > 100 ? '#FEE2E2' : u > 85 ? '#FEF3C7' : u > 0 ? '#DCFCE7' : '#F8FAFC'

export default function APSCapacidad() {
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'capacidad'], queryFn: apsApi.capacidad })
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Factory sx={{ fontSize: 28 }} />} titulo="Capacidad (RCCP)" subtitulo="APS · La carga que pone el plan sobre cada recurso, mes a mes" color={C} />
        {isLoading && <LinearProgress />}
        {data && !data.resumen.length && <Alert severity="info">No hay recursos registrados. Créelos en Configuración y asigne rutas a los productos que se fabrican.</Alert>}
        {data && data.resumen.length > 0 && (<>
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 12, md: 4 }}><Cifra etiqueta="Cuello de botella" valor={data.cuello ? nombreR(data, data.cuello.recurso_id) : 'Ninguno'} color={data.cuello && (data.cuello.uso_maximo_pct ?? 0) > 100 ? '#DC2626' : C} sub={data.cuello ? `Uso máximo ${pct(data.cuello.uso_maximo_pct)}` : undefined} /></Grid>
            <Grid size={{ xs: 6, md: 4 }}><Cifra etiqueta="Recursos con meses sobrecargados" valor={data.resumen.filter(r => r.meses_sobrecarga > 0).length} color="#DC2626" /></Grid>
            <Grid size={{ xs: 6, md: 4 }}><Cifra etiqueta="Horas de carga en el horizonte" valor={n0(data.resumen.reduce((s, r) => s + r.carga_total_horas, 0))} color="#7C3AED" /></Grid>
          </Grid>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', mb: 2 }}>
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Recurso</TableCell>{data.periodos.map(p => <TableCell key={p} align="center">{mesCorto(p)}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {data.resumen.map(r => (
                  <TableRow key={r.recurso_id}>
                    <TableCell sx={{ fontSize: 12 }}><b>{nombreR(data, r.recurso_id)}</b></TableCell>
                    {data.periodos.map(p => {
                      const c = data.capacidad.find(x => x.recurso_id === r.recurso_id && x.periodo === p)
                      return (
                        <Tooltip key={p} title={c ? `${n0(c.carga_horas)} h de ${n0(c.capacidad_horas)} h` : ''}>
                          <TableCell align="center" sx={{ fontSize: 12, bgcolor: color(c?.uso_pct ?? null), fontWeight: (c?.uso_pct ?? 0) > 100 ? 800 : 400 }}>
                            {c?.sin_capacidad ? 'Sin capacidad' : pct(c?.uso_pct)}
                          </TableCell>
                        </Tooltip>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          <Typography fontSize={12} color="text.secondary">Verde: holgado · amarillo: por encima de 85 % · rojo: el plan no cabe. Para resolver una sobrecarga: adelantar producción a un mes con holgura, agregar turnos (subir las horas por día del recurso) o probarlo primero en un escenario.</Typography>
        </>)}
      </Box>
    </Layout>
  )
}
