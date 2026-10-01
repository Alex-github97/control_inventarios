/**
 * GRC · Configuración
 *
 * Todo lo que el módulo usa para clasificar y calcular, administrable aquí:
 * - Matriz de riesgo: qué significa cada nivel de probabilidad e impacto en
 *   esta empresa, y desde qué nivel un riesgo es medio, alto o crítico (cambiar
 *   las bandas reclasifica todos los riesgos).
 * - Apetito por categoría: el nivel residual máximo que la empresa tolera.
 * - Plazos y avisos de la agenda.
 * - Catálogos del módulo (tipos de comité, marcos normativos, periodicidades…),
 *   que también se amplían desde los propios formularios.
 */
import { useEffect, useState } from 'react'
import { Box, Tabs, Tab, Paper, Typography, TextField, Button, Alert, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Settings, Save } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { grc } from '@/api/grc'
import { Encabezado, errorApi } from '@/components/comun/Registro'
import { AdminCatalogos } from '@/components/catalogo/AdminCatalogos'
import { GRC_COLOR, MatrizCalor } from '@/components/grc/comun'
import { PRIORIDADES } from '@/components/grc/etiquetas'

function Matriz() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['grc', 'matriz'], queryFn: grc.matriz })
  const [escala, setEscala] = useState<any[]>([])
  const [bandas, setBandas] = useState<any[]>([])
  useEffect(() => { if (q.data) { setEscala(q.data.escala); setBandas(q.data.bandas) } }, [q.data])
  const poner = (eje: string, valor: number, k: string, v: string) =>
    setEscala(e => e.map(x => x.eje === eje && x.valor === valor ? { ...x, [k]: v } : x))
  const guardar = async () => {
    try {
      await grc.guardarEscala(escala)
      await grc.guardarBandas(bandas.map(b => ({ ...b, minimo: Number(b.minimo) })))
      toast.success('Matriz guardada; los riesgos quedaron reclasificados')
      qc.invalidateQueries({ queryKey: ['grc'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Grid container spacing={2}>
      {(['probabilidad', 'impacto'] as const).map(eje => (
        <Grid key={eje} size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1, textTransform: 'capitalize' }}>{eje}</Typography>
            {escala.filter(x => x.eje === eje).sort((a, b) => a.valor - b.valor).map(x => (
              <Box key={x.valor} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
                <Box sx={{ width: 26, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{x.valor}</Box>
                <TextField size="small" label="Nombre" value={x.nombre} onChange={e => poner(eje, x.valor, 'nombre', e.target.value)} sx={{ width: 150 }} />
                <TextField size="small" label="Qué significa aquí" value={x.descripcion ?? ''} fullWidth multiline maxRows={3}
                  onChange={e => poner(eje, x.valor, 'descripcion', e.target.value)} />
              </Box>
            ))}
          </Paper>
        </Grid>
      ))}
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Bandas de prioridad</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>Nivel = probabilidad × impacto (1 a 25). Cada banda empieza en el nivel indicado.</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>Prioridad</TableCell><TableCell>Desde nivel</TableCell><TableCell>Color</TableCell><TableCell>Respuesta exigida</TableCell></TableRow></TableHead>
            <TableBody>
              {PRIORIDADES.slice().reverse().map(([k, l]) => {
                const b = bandas.find(x => x.prioridad === k) ?? { prioridad: k, minimo: '', color: '', respuesta: '' }
                const set = (campo: string, v: any) => setBandas(bs => bs.some(x => x.prioridad === k) ? bs.map(x => x.prioridad === k ? { ...x, [campo]: v } : x) : [...bs, { ...b, [campo]: v }])
                return (
                  <TableRow key={k}>
                    <TableCell sx={{ fontWeight: 700, color: b.color }}>{l}</TableCell>
                    <TableCell><TextField size="small" type="number" value={b.minimo} disabled={k === 'baja'} sx={{ width: 80 }}
                      onChange={e => set('minimo', e.target.value)} inputProps={{ min: 1, max: 25 }} /></TableCell>
                    <TableCell><input type="color" value={b.color || '#999999'} onChange={e => set('color', e.target.value)} aria-label={`Color ${l}`} /></TableCell>
                    <TableCell><TextField size="small" fullWidth value={b.respuesta ?? ''} onChange={e => set('respuesta', e.target.value)} /></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}><MatrizCalor titulo="Vista previa (con las bandas guardadas)" celdas={{}} /></Grid>
      <Grid size={12}>
        <Alert severity="info" sx={{ mb: 1 }}>
          <b>Cómo se calcula el riesgo residual.</b> Los controles vinculados a un riesgo lo reducen según su naturaleza y su
          efectividad <i>probada</i>: el preventivo baja la probabilidad, el detectivo y el correctivo bajan el impacto
          (2 niveles si es efectivo, 1 si es parcialmente efectivo) y el compensatorio baja ambos un nivel menos. En cada eje
          cuenta el mejor control. Un control sin probar no reduce nada.
        </Alert>
        <Button variant="contained" startIcon={<Save />} onClick={guardar} sx={{ bgcolor: GRC_COLOR }}>Guardar matriz</Button>
      </Grid>
    </Grid>
  )
}

function Apetito() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['grc', 'apetito'], queryFn: grc.apetito })
  const [filas, setFilas] = useState<any[]>([])
  useEffect(() => { if (q.data) setFilas(q.data.map(f => ({ ...f, apetito: f.apetito ?? '' }))) }, [q.data])
  const guardar = async () => {
    try {
      await grc.guardarApetito(filas.map(f => ({ categoria: f.categoria, apetito: f.apetito === '' ? null : Number(f.apetito) })))
      toast.success('Apetito guardado'); qc.invalidateQueries({ queryKey: ['grc'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, maxWidth: 640 }}>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
        Nivel residual máximo (1–25) que la empresa acepta en cada categoría. Un riesgo por encima queda marcado «fuera del apetito»
        en el inventario y en el tablero. Vacío: sin límite declarado. Las categorías se agregan en la pestaña Catálogos.
      </Typography>
      {filas.map((f, i) => (
        <Box key={f.categoria} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography sx={{ flex: 1, fontSize: 14 }}>{f.categoria}</Typography>
          <TextField size="small" type="number" value={f.apetito} sx={{ width: 110 }} inputProps={{ min: 1, max: 25, 'aria-label': `Apetito ${f.categoria}` }}
            onChange={e => setFilas(fs => fs.map((x, j) => j === i ? { ...x, apetito: e.target.value } : x))} />
        </Box>
      ))}
      <Button variant="contained" startIcon={<Save />} onClick={guardar} sx={{ mt: 1, bgcolor: GRC_COLOR }}>Guardar apetito</Button>
    </Paper>
  )
}

function Parametros() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['grc', 'parametros'], queryFn: grc.parametros })
  const [v, setV] = useState<Record<string, any>>({})
  useEffect(() => { if (q.data) setV(Object.fromEntries(q.data.map(p => [p.clave, p.valor]))) }, [q.data])
  const guardar = async () => {
    try { await grc.guardarParametros(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x)]))); toast.success('Parámetros guardados'); qc.invalidateQueries({ queryKey: ['grc'] }) }
    catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, maxWidth: 640 }}>
      {(q.data ?? []).map(p => (
        <Box key={p.clave} sx={{ mb: 2 }}>
          <TextField size="small" type="number" label={p.nombre} value={v[p.clave] ?? ''} helperText={p.ayuda} fullWidth
            inputProps={{ min: p.minimo, max: p.maximo }} onChange={e => setV({ ...v, [p.clave]: e.target.value })} />
        </Box>
      ))}
      <Button variant="contained" startIcon={<Save />} onClick={guardar} sx={{ bgcolor: GRC_COLOR }}>Guardar</Button>
    </Paper>
  )
}

export default function GRCConfig() {
  const [tab, setTab] = useState(0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Settings sx={{ fontSize: 28 }} />} titulo="Configuración GRC" subtitulo="Matriz de riesgo, apetito, plazos y catálogos del módulo" color={GRC_COLOR} />
        <Tabs value={tab} onChange={(_, x) => setTab(x)} sx={{ mb: 2 }}>
          <Tab label="Matriz de riesgo" /><Tab label="Apetito por categoría" /><Tab label="Plazos y avisos" /><Tab label="Catálogos" />
        </Tabs>
        {tab === 0 && <Matriz />}
        {tab === 1 && <Apetito />}
        {tab === 2 && <Parametros />}
        {tab === 3 && <AdminCatalogos modulo="GRC" color={GRC_COLOR} titulo="Catálogos de GRC" />}
      </Box>
    </Layout>
  )
}
