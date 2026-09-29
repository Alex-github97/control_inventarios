/**
 * GRC · Matriz de cumplimiento
 *
 * Era una maqueta: requisitos con porcentajes escritos a mano y una vista
 * «por norma» con cifras inventadas. Ahora cada fila evalúa una obligación
 * real en un proceso: estado, puntaje, evidencias y próxima evaluación. La
 * vista por tipo de obligación promedia esos puntajes.
 */
import { useState } from 'react'
import { Box, Typography, Tabs, Tab, Paper, LinearProgress } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { FactCheck } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { grcApi, type Cumplimiento } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, Etiqueta, fmtFecha, type Campo } from '@/components/comun/Registro'
import { ESTADOS_CUMPLIMIENTO, CUMPLIMIENTO_COLOR, TIPOS_OBLIGACION, etiqueta } from '@/components/grc/etiquetas'
import { COLOR_MODULO } from '@/config/marca'

const GRC_COLOR = COLOR_MODULO

export default function GRCCumplimiento() {
  const crud = useCrud(['grc-cumplimiento'], grcApi.cumplimiento, 'Evaluación', [['grc-tablero'], ['grc-obligaciones']], true)
  const { data: obligaciones = [] } = useQuery({ queryKey: ['grc-obligaciones'], queryFn: () => grcApi.obligaciones.listar() })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Cumplimiento | null }>({ abierto: false, r: null })
  const [tab, setTab] = useState(0)
  const nombreOb = (id: number) => obligaciones.find(o => o.id === id)
  const lista = crud.datos
  const hoy = new Date().toISOString().slice(0, 10)
  const conPuntaje = lista.filter(c => c.puntaje != null)
  const prom = conPuntaje.length ? conPuntaje.reduce((s, c) => s + (c.puntaje ?? 0), 0) / conPuntaje.length : null

  const CAMPOS: Campo[] = [
    { clave: 'obligacion_id', etiqueta: 'Obligación', tipo: 'seleccion', opciones: obligaciones.map(o => [o.id, `${o.codigo} · ${o.nombre}`] as [number, string]), obligatorio: true },
    { clave: 'proceso', etiqueta: 'Proceso', ancho: 6 },
    { clave: 'responsable', etiqueta: 'Responsable', ancho: 6 },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_CUMPLIMIENTO, obligatorio: true, ancho: 6 },
    { clave: 'puntaje', etiqueta: 'Puntaje (0-100)', tipo: 'numero', min: 0, max: 100, ancho: 6 },
    { clave: 'ultima_evaluacion', etiqueta: 'Evaluado', tipo: 'fecha', ancho: 6 },
    { clave: 'proxima_evaluacion', etiqueta: 'Próxima evaluación', tipo: 'fecha', ancho: 6 },
    { clave: 'evidencias', etiqueta: 'Evidencias', tipo: 'area', validar: (v, f) => (f.estado === 'cumple' && !String(v ?? '').trim() ? 'Para «cumple» registra la evidencia' : null) },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'area' },
  ]

  const porTipo = TIPOS_OBLIGACION.map(([t, l]) => {
    const filas = conPuntaje.filter(c => nombreOb(c.obligacion_id)?.tipo === t)
    return { t, l, n: filas.length, prom: filas.length ? filas.reduce((s, c) => s + (c.puntaje ?? 0), 0) / filas.length : null }
  }).filter(x => x.n)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<FactCheck sx={{ fontSize: 28 }} />} titulo="Matriz de cumplimiento" subtitulo="GRC · Evaluación de obligaciones por proceso"
          color={GRC_COLOR} accion="Nueva evaluación" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Cumplimiento promedio" valor={prom == null ? '—' : `${prom.toFixed(1)}%`} color={GRC_COLOR} sub="Promedio de los puntajes" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Cumplen" valor={lista.filter(c => c.estado === 'cumple').length} color="#15803D" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="No cumplen o parcial" valor={lista.filter(c => ['no_cumple', 'cumple_parcial'].includes(c.estado)).length} color="#DC2626" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Evaluación vencida" valor={lista.filter(c => c.proxima_evaluacion && c.proxima_evaluacion < hoy).length} color="#D97706" /></Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Evaluaciones" /><Tab label="Por tipo de obligación" /></Tabs>
        {tab === 0 && (
          <TablaRegistros<Cumplimiento> filas={lista} cargando={crud.isLoading} vacio="Sin evaluaciones registradas" etiqueta={c => nombreOb(c.obligacion_id)?.nombre ?? `#${c.id}`}
            onEditar={c => setDlg({ abierto: true, r: c })} onRetirar={c => crud.retirar.mutate(c.id)}
            columnas={[
              { titulo: 'Obligación', valor: c => <><b>{nombreOb(c.obligacion_id)?.nombre ?? '—'}</b><Typography fontSize={11} color="text.secondary">{nombreOb(c.obligacion_id)?.codigo}</Typography></> },
              { titulo: 'Proceso', valor: c => c.proceso ?? '—' },
              { titulo: 'Responsable', valor: c => c.responsable ?? '—' },
              { titulo: 'Estado', valor: c => <Etiqueta texto={etiqueta(ESTADOS_CUMPLIMIENTO, c.estado)} color={CUMPLIMIENTO_COLOR[c.estado] ?? '#6B7280'} /> },
              { titulo: 'Puntaje', alinear: 'right', valor: c => c.puntaje ?? '—' },
              { titulo: 'Próxima', valor: c => <Box sx={{ color: c.proxima_evaluacion && c.proxima_evaluacion < hoy ? 'error.main' : undefined }}>{fmtFecha(c.proxima_evaluacion)}</Box> },
            ]} />
        )}
        {tab === 1 && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            {porTipo.length === 0 && <Typography fontSize={13} color="text.secondary">Sin evaluaciones con puntaje.</Typography>}
            {porTipo.map(x => (
              <Box key={x.t} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography fontSize={13}>{x.l} <Typography component="span" fontSize={11} color="text.secondary">({x.n})</Typography></Typography><Typography fontWeight={700}>{x.prom!.toFixed(1)}%</Typography></Box>
                <LinearProgress variant="determinate" value={x.prom!} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: x.prom! >= 90 ? '#15803D' : x.prom! >= 70 ? '#D97706' : '#DC2626' } }} />
              </Box>
            ))}
          </Paper>
        )}
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? 'Editar evaluación' : 'Nueva evaluación'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ estado: 'en_evaluacion', ultima_evaluacion: hoy }} onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
