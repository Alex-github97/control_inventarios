/**
 * APS · Distribución (DRP)
 *
 * Era maqueta: una red multi-escalón, traslados y brechas por nodo escritos a
 * mano. Ahora cada centro de distribución proyecta su stock contra su propio
 * pronóstico y, cuando baja del de seguridad, pide un traslado a la planta que
 * lo surte, con el tiempo de traslado de anticipación. Esos traslados son
 * demanda de la planta en el plan maestro.
 */
import { useState } from 'react'
import { Box, Paper, Typography, Tabs, Tab, LinearProgress, Alert, Table, TableHead, TableRow, TableCell, TableBody, Button, TextField, MenuItem } from '@mui/material'
import { AccountTree } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, nombreP, nombreU, mesCorto } from '@/api/aps'
import { Encabezado, Etiqueta, errorApi } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO

export default function APSDistribucion() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [clave, setClave] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['aps', 'distribucion'], queryFn: apsApi.distribucion })
  const actual = data?.drp.find(d => `${d.producto_id}-${d.ubicacion_id}` === clave) ?? data?.drp[0]
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<AccountTree sx={{ fontSize: 28 }} />} titulo="Distribución (DRP)" subtitulo="APS · Qué necesita cada centro de distribución y qué debe enviarle la planta" color={C} />
        {isLoading && <LinearProgress />}
        {data && (
          <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }}>
              <Tab label="Red" /><Tab label={`Traslados sugeridos (${data.traslados.length})`} /><Tab label="Proyección por centro" />
            </Tabs>
            {tab === 0 && (
              <Box sx={{ p: 3 }}>
                {!data.red.length && <Alert severity="info">Sin ubicaciones. Créelas en Configuración indicando de qué planta se surte cada centro.</Alert>}
                {data.red.filter(u => !u.abastecida_por_id).map(p => (
                  <Paper key={p.id} variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 1.5 }}>
                    <Typography fontWeight={800}>{p.nombre} <Typography component="span" fontSize={12} color="text.secondary">· {p.tipo ?? 'Planta'} · se abastece sola</Typography></Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      {data.red.filter(u => u.abastecida_por_id === p.id).map(u => {
                        const n = data.traslados.filter(t => t.ubicacion_id === u.id).length
                        return <Paper key={u.id} variant="outlined" sx={{ px: 1.5, py: 1, borderRadius: 2 }}><Typography fontSize={13} fontWeight={700}>→ {u.nombre}</Typography><Typography fontSize={11} color="text.secondary">{n} traslado{n === 1 ? '' : 's'} sugerido{n === 1 ? '' : 's'}</Typography></Paper>
                      })}
                      {!data.red.some(u => u.abastecida_por_id === p.id) && <Typography fontSize={12} color="text.secondary">No surte a ningún centro.</Typography>}
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
            {tab === 1 && (
              <Box sx={{ p: 3 }}>
                {!data.traslados.length && <Alert severity="success">Ningún centro necesita traslados en el horizonte.</Alert>}
                {data.traslados.length > 0 && (
                  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
                    <Table size="small">
                      <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Producto</TableCell><TableCell>Desde</TableCell><TableCell>Hacia</TableCell><TableCell align="right">Cantidad</TableCell><TableCell>Enviar en</TableCell><TableCell>Llega en</TableCell><TableCell /><TableCell /></TableRow></TableHead>
                      <TableBody>
                        {data.traslados.map((t, i) => (
                          <TableRow key={i} sx={{ '& td': { fontSize: 12 }, bgcolor: t.atrasada ? '#FEF2F2' : undefined }}>
                            <TableCell><b>{nombreP(data, t.producto_id)}</b></TableCell><TableCell>{nombreU(data, t.origen_id)}</TableCell><TableCell>{nombreU(data, t.ubicacion_id)}</TableCell>
                            <TableCell align="right">{n0(t.cantidad)}</TableCell><TableCell>{mesCorto(t.periodo_envio ?? t.periodo_lanzamiento)}</TableCell><TableCell>{mesCorto(t.periodo_recepcion)}</TableCell>
                            <TableCell>{t.atrasada && <Etiqueta texto="Atrasado" color="#DC2626" />}</TableCell>
                            <TableCell><Button size="small" onClick={async () => { try { await apsApi.aprobarOrden(t); toast.success('Traslado aprobado'); qc.invalidateQueries({ queryKey: ['aps'] }) } catch (e) { toast.error(errorApi(e)) } }}>Aprobar</Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                )}
              </Box>
            )}
            {tab === 2 && (
              <Box sx={{ p: 3 }}>
                {!data.drp.length && <Alert severity="info">Ningún centro de distribución tiene demanda registrada.</Alert>}
                {actual && (<>
                  <TextField select size="small" label="Producto y centro" value={`${actual.producto_id}-${actual.ubicacion_id}`} onChange={e => setClave(e.target.value)} sx={{ minWidth: 380, mb: 2 }}>
                    {data.drp.map(d => <MenuItem key={`${d.producto_id}-${d.ubicacion_id}`} value={`${d.producto_id}-${d.ubicacion_id}`}>{nombreP(data, d.producto_id)} · {nombreU(data, d.ubicacion_id)}</MenuItem>)}
                  </TextField>
                  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
                    <Table size="small">
                      <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}><TableCell>Concepto</TableCell>{actual.filas.map(f => <TableCell key={f.periodo} align="right">{mesCorto(f.periodo)}</TableCell>)}</TableRow></TableHead>
                      <TableBody>
                        {([['Demanda', 'demanda'], ['Traslados aprobados', 'programadas'], ['Traslados planificados', 'planificadas'], ['Stock final', 'stock_final'], ['Stock de seguridad', 'stock_seguridad']] as const).map(([t, k]) => (
                          <TableRow key={k} sx={{ '& td': { fontSize: 12 } }}>
                            <TableCell>{t}</TableCell>
                            {actual.filas.map(f => <TableCell key={f.periodo} align="right" sx={{ color: k === 'stock_final' && f.bajo_seguridad ? '#DC2626' : undefined, fontWeight: k === 'stock_final' ? 700 : 400 }}>{n0(f[k])}</TableCell>)}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </>)}
              </Box>
            )}
          </Paper>
        )}
      </Box>
    </Layout>
  )
}
