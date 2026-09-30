/**
 * APS · Escenarios (qué pasaría si)
 *
 * Era maqueta, y el servidor dejaba cada simulación «en ejecución» para
 * siempre sin producir nada. Ahora simular corre el plan completo —pronóstico,
 * DRP, MPS, MRP, capacidad— con los supuestos del escenario (más o menos
 * demanda, capacidad o costo) y lo compara con el plan base, métrica por
 * métrica. No toca órdenes ni existencias: solo compara.
 */
import { useState } from 'react'
import { Box, Paper, Typography, Button, LinearProgress, Alert, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Science } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, n1, NIVEL_ALERTA, type Escenario, type ResultadoSim, type Alerta } from '@/api/aps'
import { Encabezado, FormularioRegistro, TablaRegistros, useCrud, Etiqueta, errorApi, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
// Métricas donde subir es malo (costos, sobrecargas, atrasos) y donde es neutro.
const MALO_SI_SUBE = new Set(['costo_ordenes', 'inventario_proyectado_promedio', 'uso_capacidad_maximo_pct', 'recursos_sobrecargados', 'ordenes_atrasadas', 'alertas_criticas'])

const CAMPOS: Campo[] = [
  { clave: 'nombre', etiqueta: 'Nombre', obligatorio: true },
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', obligatorio: true, ancho: 6, opciones: [['WHAT_IF', 'Qué pasaría si'], ['OPTIMISTA', 'Optimista'], ['PESIMISTA', 'Pesimista'], ['BASE', 'Base']] },
  { clave: 'supuesto_demanda_delta_pct', etiqueta: 'Cambio en la demanda (%)', tipo: 'numero', min: -90, max: 300, ancho: 6 },
  { clave: 'supuesto_capacidad_delta_pct', etiqueta: 'Cambio en la capacidad (%)', tipo: 'numero', min: -90, max: 300, ancho: 6, ayuda: 'Ej. −25 = se pierde un turno de cuatro' },
  { clave: 'supuesto_costo_delta_pct', etiqueta: 'Cambio en los costos (%)', tipo: 'numero', min: -90, max: 300, ancho: 6 },
  { clave: 'descripcion', etiqueta: 'Qué se quiere saber', tipo: 'area' },
]

export default function APSEscenarios() {
  const qc = useQueryClient()
  const crud = useCrud<Escenario>(['aps', 'escenarios'], apsApi.escenarios, 'Escenario')
  const [ed, setEd] = useState<Escenario | null | undefined>(undefined)
  const [sel, setSel] = useState<Escenario | null>(null)
  const [corriendo, setCorriendo] = useState(false)
  const [ultimo, setUltimo] = useState<{ resultados: ResultadoSim[]; alertas: Alerta[] } | null>(null)
  const guardados = useQuery({ queryKey: ['aps', 'resultados', sel?.id], queryFn: () => apsApi.resultados(sel!.id), enabled: !!sel })

  const simular = async (e: Escenario) => {
    setSel(e); setCorriendo(true); setUltimo(null)
    try { const r = await apsApi.simular(e.id); setUltimo({ resultados: r.resultados, alertas: r.alertas_escenario }); toast.success('Simulación completa'); qc.invalidateQueries({ queryKey: ['aps', 'escenarios'] }) }
    catch (err) { toast.error(errorApi(err)) }
    finally { setCorriendo(false) }
  }
  const filas: ResultadoSim[] = ultimo?.resultados ?? (guardados.data?.resultados ?? []).map(r => ({ ...r, base: r.valor_base, escenario: r.valor_escenario }))
  const signo = (v: number | null | undefined) => v == null ? '—' : `${v > 0 ? '+' : ''}${n1(v)}`

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Science sx={{ fontSize: 28 }} />} titulo="Escenarios" subtitulo="APS · El plan completo con otros supuestos, comparado con el plan base" color={C} accion="Nuevo escenario" onAccion={() => setEd(null)} />
        <TablaRegistros<Escenario> filas={crud.datos} cargando={crud.isLoading} vacio="Sin escenarios. Cree uno: por ejemplo, demanda +20 % con la capacidad actual." etiqueta={e => e.nombre}
          onEditar={setEd} onRetirar={e => crud.retirar.mutate(e.id)} onFila={e => { setSel(e); setUltimo(null) }}
          extra={e => <Button size="small" variant="outlined" sx={{ mr: 1 }} disabled={corriendo} onClick={() => simular(e)}>Simular</Button>}
          columnas={[{ titulo: 'Escenario', valor: e => <b>{e.nombre}</b> }, { titulo: 'Demanda', alinear: 'right', valor: e => `${signo(e.supuesto_demanda_delta_pct)} %` },
            { titulo: 'Capacidad', alinear: 'right', valor: e => `${signo(e.supuesto_capacidad_delta_pct)} %` }, { titulo: 'Costos', alinear: 'right', valor: e => `${signo(e.supuesto_costo_delta_pct)} %` },
            { titulo: 'Estado', valor: e => <Etiqueta texto={e.estado === 'COMPLETADO' ? 'Simulado' : 'Sin simular'} color={e.estado === 'COMPLETADO' ? '#16A34A' : '#64748B'} /> }]} />
        {corriendo && <Box mt={2}><Typography fontSize={12} color="text.secondary">Corriendo el plan con los supuestos del escenario…</Typography><LinearProgress /></Box>}
        {sel && !corriendo && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mt: 2 }}>
            <Typography fontWeight={800} mb={1}>{sel.nombre}: comparación con el plan base</Typography>
            {!filas.length && <Alert severity="info">Aún no se ha simulado. Use «Simular».</Alert>}
            {filas.length > 0 && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Table size="small">
                    <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Métrica</TableCell><TableCell align="right">Base</TableCell><TableCell align="right">Escenario</TableCell><TableCell align="right">Cambio</TableCell></TableRow></TableHead>
                    <TableBody>
                      {filas.map(r => {
                        const malo = r.delta != null && r.delta !== 0 && (MALO_SI_SUBE.has(r.clave ?? '') || /Costo|Inventario|Uso|sobrecarg|atrasad|críticas/i.test(r.metrica)) === r.delta > 0
                        return (
                          <TableRow key={r.metrica} sx={{ '& td': { fontSize: 12 } }}>
                            <TableCell>{r.metrica}</TableCell><TableCell align="right">{n0(r.base)}</TableCell><TableCell align="right"><b>{n0(r.escenario)}</b></TableCell>
                            <TableCell align="right" sx={{ color: r.delta ? (malo ? '#DC2626' : '#16A34A') : undefined, fontWeight: 700 }}>{r.delta_pct != null ? `${signo(r.delta_pct)} %` : signo(r.delta)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  {ultimo && (<>
                    <Typography fontSize={12} fontWeight={700} color="text.secondary" mb={1}>Alertas del escenario</Typography>
                    {ultimo.alertas.map((a, i) => <Typography key={i} fontSize={12} mb={0.5}><span style={{ color: NIVEL_ALERTA[a.nivel] }}>●</span> {a.titulo}</Typography>)}
                    {!ultimo.alertas.length && <Typography fontSize={12} color="text.secondary">Sin alertas.</Typography>}
                  </>)}
                  {!ultimo && guardados.data?.simulacion && <Typography fontSize={12} color="text.secondary">Última simulación: {guardados.data.simulacion.fecha?.slice(0, 16).replace('T', ' ')}.</Typography>}
                </Grid>
              </Grid>
            )}
          </Paper>
        )}
        <FormularioRegistro abierto={ed !== undefined} titulo={ed ? 'Editar escenario' : 'Nuevo escenario'} campos={CAMPOS} registro={ed}
          valoresIniciales={{ tipo: 'WHAT_IF', supuesto_demanda_delta_pct: '0', supuesto_capacidad_delta_pct: '0', supuesto_costo_delta_pct: '0' }}
          onGuardar={c => crud.guardar(ed ?? null, { ...c, supuesto_demanda_delta_pct: c.supuesto_demanda_delta_pct ?? 0, supuesto_capacidad_delta_pct: c.supuesto_capacidad_delta_pct ?? 0, supuesto_costo_delta_pct: c.supuesto_costo_delta_pct ?? 0 })}
          onCerrar={() => setEd(undefined)} />
      </Box>
    </Layout>
  )
}
