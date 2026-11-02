/**
 * Planta de reencauche · Indicadores
 *
 * Todos calculados de los registros —pasos, decisiones, ciclos, consumos y
 * reclamos—, nunca digitados: aceptación y rechazo inicial, embudo por punto de
 * inspección y rendimiento de carcasas, primera pasada, tiempos y espera por
 * etapa (el cuello de botella), productividad, autoclaves y desviaciones,
 * consumo de insumos, calidad final, garantías por cada 100 y costo por llanta.
 * Filtrables por periodo, cliente, medida, marca, banda, equipo y operario.
 */
import { useState } from 'react'
import { Box, Paper, Typography, TextField, MenuItem, LinearProgress, Chip, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { QueryStats } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { rtm, num, pesos } from '@/api/reencauche'
import { Encabezado, Cifra, TablaRegistros } from '@/components/comun/Registro'
import { COLOR, SelectorPropietario } from '@/components/reencauche/comun'

const fecha = (d: Date) => d.toLocaleDateString('en-CA')
const pct = (v?: number | null) => (v == null ? '—' : `${num(v, 1)} %`)

function Barras({ titulo, filas, unidad = '' }: { titulo: string; filas: { nombre: string; valor: number }[]; unidad?: string }) {
  const max = Math.max(1, ...filas.map(f => f.valor))
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{titulo}</Typography>
      {!filas.length && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Sin datos en el periodo</Typography>}
      {filas.slice(0, 10).map(f => (
        <Box key={f.nombre} sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}><span>{f.nombre}</span><b>{num(f.valor, 1)}{unidad}</b></Box>
          <LinearProgress variant="determinate" value={(f.valor / max) * 100} sx={{ height: 6, borderRadius: 3, bgcolor: alpha(COLOR, 0.1), '& .MuiLinearProgress-bar': { bgcolor: COLOR } }} />
        </Box>
      ))}
    </Paper>
  )
}

export default function RTMIndicadores() {
  const hoy = new Date()
  const [f, setF] = useState<any>({ desde: fecha(new Date(hoy.getTime() - 30 * 86400000)), hasta: fecha(hoy), depositante_id: '', medida: '',
    marca: '', banda_producto_id: '', equipo_id: '', operario_id: '' })
  const bandas = useQuery({ queryKey: ['rtm', 'insumos', 'BANDA'], queryFn: () => rtm.insumos('BANDA') })
  const equipos = useQuery({ queryKey: ['rtm', 'equipos'], queryFn: rtm.equipos })
  const usuarios = useQuery({ queryKey: ['rtm', 'usuarios'], queryFn: rtm.usuarios })
  const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''))
  const k = useQuery({ queryKey: ['rtm', 'indicadores', params], queryFn: () => rtm.indicadores(params) })
  const d = k.data
  const sel = (clave: string, etiqueta: string, opciones: [any, string][], ancho = 170) => (
    <TextField select size="small" label={etiqueta} value={f[clave]} onChange={e => setF({ ...f, [clave]: e.target.value })} sx={{ minWidth: ancho }}>
      <MenuItem value="">Todos</MenuItem>{opciones.map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}
    </TextField>
  )
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<QueryStats sx={{ fontSize: 28 }} />} titulo="Indicadores de la planta"
          subtitulo="Calculados de los pasos, decisiones, ciclos, consumos y reclamos registrados" color={COLOR} />
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <TextField size="small" type="date" label="Desde" value={f.desde} onChange={e => setF({ ...f, desde: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="Hasta" value={f.hasta} onChange={e => setF({ ...f, hasta: e.target.value })} InputLabelProps={{ shrink: true }} />
          <SelectorPropietario valor={f.depositante_id} onChange={v => setF({ ...f, depositante_id: v })} todos ancho={200} />
          <TextField size="small" label="Medida" value={f.medida} onChange={e => setF({ ...f, medida: e.target.value })} sx={{ width: 140 }} />
          <TextField size="small" label="Marca" value={f.marca} onChange={e => setF({ ...f, marca: e.target.value })} sx={{ width: 130 }} />
          {sel('banda_producto_id', 'Banda', (bandas.data ?? []).map((b: any) => [b.producto_id, b.nombre]))}
          {sel('equipo_id', 'Equipo', (equipos.data ?? []).map((e: any) => [e.id, e.nombre]))}
          {sel('operario_id', 'Operario', (usuarios.data ?? []).map((u: any) => [u.id, u.nombre]))}
        </Box>
        {k.isFetching && <LinearProgress sx={{ mb: 1 }} />}
        {d && <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Llantas recibidas" valor={num(d.recepcion.recibidas, 0)} color={COLOR} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Aceptación inicial" valor={pct(d.recepcion.aceptacion_inicial_pct)} color="#15803D" sub={`Rechazo inicial ${pct(d.recepcion.rechazo_inicial_pct)}`} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Rendimiento de carcasas" valor={pct(d.embudo.rendimiento_pct)} color="#0369A1" sub={`${num(d.embudo.terminadas, 0)} terminadas`} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Primera pasada (FPY)" valor={pct(d.primera_pasada.fpy_pct)} color="#7C3AED" /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Garantías por cada 100" valor={num(d.calidad.garantias_por_100, 2)} color="#DC2626" sub={`${d.calidad.garantias_procedentes} procedentes de ${num(d.calidad.entregadas, 0)} entregadas`} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Costo por llanta" valor={pesos(d.costo.por_llanta)} color="#B45309" sub={`Insumos ${pesos(d.costo.insumos)}`} /></Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Condicionales" valor={pct(d.recepcion.condicionales_pct)} color="#B45309" /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Inspección inicial (min)" valor={num(d.recepcion.tiempo_inspeccion_min, 1)} color="#64748B" /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Aprobación final" valor={pct(d.calidad.aprobacion_final_pct)} color="#15803D" /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Ciclos con desviación" valor={pct(d.vulcanizacion.desviacion_pct)} color="#DC2626" sub={`${d.vulcanizacion.ciclos} ciclos`} /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Tiempo en planta (h)" valor={num(d.tiempos.total_planta_h, 1)} color="#0369A1" /></Grid>
            <Grid size={{ xs: 6, md: 2 }}><Cifra etiqueta="Llantas por hora-hombre" valor={num(d.tiempos.productividad, 2)} color={COLOR} sub={`${num(d.tiempos.horas_hombre, 1)} h registradas`} /></Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Embudo de la planta</Typography>
                <Box sx={{ fontSize: 12.5, mb: 1 }}>Recibidas <b>{num(d.recepcion.recibidas, 0)}</b></Box>
                {d.embudo.etapas.map((e: any) => (
                  <Box key={e.etapa} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span>{e.etapa}</span><span><span style={{ color: '#DC2626' }}>−{e.rechazadas}</span> · siguen <b>{e.siguen}</b></span>
                    </Box>
                    <LinearProgress variant="determinate" value={d.recepcion.recibidas ? (e.siguen / d.recepcion.recibidas) * 100 : 0}
                      sx={{ height: 6, borderRadius: 3, bgcolor: alpha(COLOR, 0.1), '& .MuiLinearProgress-bar': { bgcolor: COLOR } }} />
                  </Box>
                ))}
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>En proceso: {d.embudo.en_proceso}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}><Barras titulo="Rechazos por motivo" filas={d.recepcion.rechazos_por_motivo.map((x: any) => ({ nombre: x.motivo, valor: x.carcasas }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Barras titulo="Rechazos por marca" filas={d.recepcion.rechazos_por_marca.map((x: any) => ({ nombre: x.marca, valor: x.carcasas }))} /></Grid>
          </Grid>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Tiempos por etapa {d.tiempos.cuello_de_botella && <Chip size="small" color="warning" label={`Más espera: ${d.tiempos.cuello_de_botella}`} sx={{ ml: 1 }} />}</Typography>
          <TablaRegistros filas={d.tiempos.por_etapa.map((t: any, i: number) => ({ ...t, id: i + 1 }))} vacio="Sin pasos en el periodo" etiqueta={(t: any) => t.etapa}
            columnas={[
              { titulo: 'Etapa', valor: (t: any) => <span style={{ fontWeight: t.etapa === d.tiempos.cuello_de_botella ? 800 : undefined }}>{t.etapa}</span> },
              { titulo: 'Proceso (min)', valor: (t: any) => num(t.proceso_min, 1), alinear: 'right' },
              { titulo: 'Espera antes (min)', valor: (t: any) => num(t.espera_min, 1), alinear: 'right' },
              { titulo: 'Pasos', valor: (t: any) => num(t.pasos, 0), alinear: 'right' },
            ]} />
          <Grid container spacing={2} sx={{ my: 2 }}>
            <Grid size={{ xs: 12, md: 4 }}><Barras titulo="Llantas por máquina" filas={d.tiempos.por_maquina.map((x: any) => ({ nombre: x.equipo, valor: x.llantas }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Barras titulo="Terminadas por turno" filas={d.tiempos.por_turno.map((x: any) => ({ nombre: x.turno, valor: x.llantas }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Barras titulo="Defectos más frecuentes" filas={d.calidad.defectos.map((x: any) => ({ nombre: `${x.defecto} (${x.zona.toLowerCase()})`, valor: x.veces }))} /></Grid>
          </Grid>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Autoclaves</Typography>
          <TablaRegistros filas={d.vulcanizacion.autoclaves.map((a: any) => ({ ...a, id: a.equipo_id }))} vacio="Sin ciclos en el periodo" etiqueta={(a: any) => a.autoclave}
            columnas={[
              { titulo: 'Autoclave', valor: (a: any) => a.autoclave }, { titulo: 'Ciclos', valor: (a: any) => a.ciclos, alinear: 'right' },
              { titulo: 'Llantas por ciclo', valor: (a: any) => num(a.llantas_por_ciclo, 1), alinear: 'right' },
              ...['temperatura', 'presion', 'vacio', 'tiempo'].map(v => ({ titulo: `Desv. ${v === 'presion' ? 'presión' : v === 'vacio' ? 'vacío' : v}`, valor: (a: any) => pct(a.desviacion_pct[v]), alinear: 'right' as const })),
            ]} />
          <Typography sx={{ fontWeight: 700, my: 1 }}>Consumo de insumos · {num(d.consumos.reparaciones_por_carcasa, 2)} reparaciones por carcasa</Typography>
          <TablaRegistros filas={d.consumos.insumos.map((x: any, i: number) => ({ ...x, id: i + 1 }))} vacio="Sin consumos en el periodo" etiqueta={(x: any) => x.insumo}
            columnas={[
              { titulo: 'Clase', valor: (x: any) => x.clase.toLowerCase() }, { titulo: 'Insumo', valor: (x: any) => x.insumo },
              { titulo: 'Total', valor: (x: any) => `${num(x.cantidad, 2)} ${x.unidad?.toLowerCase() ?? ''}`, alinear: 'right' },
              { titulo: 'Por llanta', valor: (x: any) => num(x.por_llanta, 3), alinear: 'right' },
              { titulo: 'Costo', valor: (x: any) => pesos(x.costo), alinear: 'right' },
            ]} />
        </>}
      </Box>
    </Layout>
  )
}
