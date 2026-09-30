/**
 * APS · Torre de control
 *
 * Era maqueta, y su servidor devolvía cifras escritas en el código (exactitud
 * 91,4 %, OTIF 96,2 %, fill rate 97,8 %). Ahora todo sale del plan vigente.
 * OTIF, fill rate y orden perfecta se quitaron: necesitan pedidos y
 * entregas, que APS no registra; se miden en TMS y QMS.
 */
import { useNavigate } from 'react-router-dom'
import { Box, Paper, Typography, Alert, LinearProgress, Button, Table, TableBody, TableRow, TableCell, TableHead } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Hub } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, pesos, pct, nombreR, mesCorto, NIVEL_ALERTA } from '@/api/aps'
import { Encabezado, Cifra } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO

export default function APSDashboard() {
  const nav = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'tablero'], queryFn: apsApi.tablero })
  const m = data?.maestros
  const vacio = m && (!m.productos || !m.ubicaciones || !m.series_demanda)
  const k = data?.kpis
  const recursos = data ? Array.from(new Set(data.capacidad.map(c => c.recurso_id))) : []
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Hub sx={{ fontSize: 28 }} />} titulo="Torre de control APS" subtitulo="El plan vigente en una vista: demanda, inventario, capacidad y riesgos" color={C} />
        {isLoading && <LinearProgress />}
        {vacio && (
          <Alert severity="info" sx={{ mb: 2 }} action={<Button onClick={() => nav('/aps/config')}>Ir a Configuración</Button>}>
            Para planear hacen falta: ubicaciones ({m!.ubicaciones}), productos ({m!.productos}) y demanda histórica ({m!.series_demanda} series). Cárguelos en Configuración y en Demanda → Historia.
          </Alert>
        )}
        {k && !vacio && (<>
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Exactitud del pronóstico" valor={pct(k.exactitud_publicada_pct ?? k.exactitud_validacion_pct)} color={C} sub={k.exactitud_publicada_pct != null ? 'Lo publicado contra lo real' : 'En validación (aún sin publicados vencidos)'} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Inventario hoy" valor={pesos(k.valor_inventario)} color="#7C3AED" sub={k.cobertura_dias != null ? `${n0(k.cobertura_dias)} días de cobertura` : undefined} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Uso máximo de capacidad" valor={pct(k.uso_capacidad_maximo_pct)} color={(k.uso_capacidad_maximo_pct ?? 0) > 100 ? '#DC2626' : '#16A34A'} sub={`${k.recursos_sobrecargados} recurso(s) sobrecargado(s)`} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Órdenes atrasadas" valor={n0(k.ordenes_atrasadas)} color={k.ordenes_atrasadas ? '#DC2626' : '#16A34A'} sub={`de ${n0(k.ordenes_sugeridas)} sugeridas`} /></Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography fontWeight={800}>Riesgos del plan</Typography><Typography fontSize={12} color="text.secondary">{k.alertas} alertas · {k.alertas_criticas} críticas</Typography></Box>
                {!data!.alertas.length && <Typography fontSize={13} color="text.secondary" mt={1}>Sin alertas.</Typography>}
                {data!.alertas.map((a, i) => (
                  <Box key={i} sx={{ py: 1, borderBottom: '1px solid #F1F5F9' }}>
                    <Typography fontSize={13} fontWeight={700}><span style={{ color: NIVEL_ALERTA[a.nivel] }}>●</span> {a.titulo}</Typography>
                    <Typography fontSize={12} color="text.secondary">{a.detalle}</Typography>
                  </Box>
                ))}
                <Button size="small" sx={{ mt: 1 }} onClick={() => nav('/aps/plan')}>Ver el plan</Button>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2, overflow: 'auto' }}>
                <Typography fontWeight={800} mb={1}>Capacidad por mes (% de uso)</Typography>
                {!recursos.length && <Typography fontSize={12} color="text.secondary">Sin recursos registrados.</Typography>}
                {recursos.length > 0 && (
                  <Table size="small">
                    <TableHead><TableRow sx={{ '& th': { fontSize: 10, fontWeight: 700 } }}><TableCell>Recurso</TableCell>{data!.periodos.map(p => <TableCell key={p} align="center">{mesCorto(p)}</TableCell>)}</TableRow></TableHead>
                    <TableBody>
                      {recursos.map(r => (
                        <TableRow key={r}>
                          <TableCell sx={{ fontSize: 11 }}>{nombreR(data, r)}</TableCell>
                          {data!.periodos.map(p => { const c = data!.capacidad.find(x => x.recurso_id === r && x.periodo === p); const u = c?.uso_pct ?? 0
                            return <TableCell key={p} align="center" sx={{ fontSize: 11, bgcolor: u > 100 ? '#FEE2E2' : u > 85 ? '#FEF3C7' : undefined }}>{c?.uso_pct != null ? n0(c.uso_pct) : '—'}</TableCell> })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography fontWeight={800} mb={1}>Qué hay que hacer</Typography>
                <Typography fontSize={13}>Producir {n0(k.unidades_produccion)} unidades y comprar {n0(k.unidades_compra)} en el horizonte, por {pesos(k.costo_ordenes)}.</Typography>
                <Typography fontSize={12} color="text.secondary" mt={0.5}>Inventario proyectado promedio: {pesos(k.inventario_proyectado_promedio)}{k.rotacion_proyectada ? ` · rotación ${k.rotacion_proyectada} veces al año` : ''}.</Typography>
              </Paper>
            </Grid>
          </Grid>
        </>)}
      </Box>
    </Layout>
  )
}
