/**
 * GRC · Cumplimiento
 *
 * El índice de cumplimiento por marco normativo (lo que una auditoría externa
 * o una junta preguntan primero) y el registro de cada evaluación con su
 * evidencia. Las evaluaciones nuevas actualizan el estado de la obligación.
 */
import { useMemo, useState } from 'react'
import { Box, Paper, Typography, LinearProgress, Tabs, Tab } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Rule } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { grc, type Registro } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Encabezado, fmtFecha } from '@/components/comun/Registro'
import { CUMPLIMIENTO_COLOR } from '@/components/grc/etiquetas'
import { GRC_COLOR, ChipEstado, usePersonasGRC, useReferencias } from '@/components/grc/comun'
import { camposEvaluacion } from './GRCObligaciones'

export default function GRCCumplimiento() {
  const crud = useCrud(['grc', 'cumplimiento'], grc.cumplimiento, 'Evaluación', [['grc', 'obligaciones']], true)
  const obligaciones = useQuery({ queryKey: ['grc', 'obligaciones'], queryFn: () => grc.obligaciones.listar() })
  const personas = usePersonasGRC()
  const refs = useReferencias('obligacion')
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Registro | null }>({ abierto: false, r: null })
  const [tab, setTab] = useState(0)

  const marcos = useMemo(() => {
    const m: Record<string, Record<string, number>> = {}
    for (const o of obligaciones.data ?? []) {
      const k = o.marco ?? 'Sin marco'
      m[k] = m[k] ?? {}
      m[k][o.estado_cumplimiento] = (m[k][o.estado_cumplimiento] ?? 0) + 1
    }
    return Object.entries(m).map(([marco, c]) => {
      const aplic = Object.entries(c).filter(([e]) => !['no_aplica', 'en_evaluacion'].includes(e)).reduce((s, [, n]) => s + n, 0)
      const indice = aplic ? ((c.cumple ?? 0) + 0.5 * (c.cumple_parcial ?? 0)) / aplic * 100 : null
      return { marco, c, total: Object.values(c).reduce((a, b) => a + b, 0), indice }
    }).sort((a, b) => a.marco.localeCompare(b.marco))
  }, [obligaciones.data])

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Rule sx={{ fontSize: 28 }} />} titulo="Cumplimiento" subtitulo="GRC · Índice por marco normativo y evaluaciones con evidencia"
          color={GRC_COLOR} accion="Nueva evaluación" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Por marco normativo" /><Tab label="Evaluaciones" /></Tabs>
        {tab === 0 && (
          <Grid container spacing={2}>
            {marcos.length === 0 && <Typography sx={{ color: 'text.secondary', p: 2 }}>Registre obligaciones con su marco normativo para ver el índice.</Typography>}
            {marcos.map(m => (
              <Grid key={m.marco} size={{ xs: 12, md: 6, lg: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{m.marco}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>{m.total} obligacion(es)</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={m.indice ?? 0} sx={{ flex: 1, height: 8, borderRadius: 4,
                      '& .MuiLinearProgress-bar': { bgcolor: (m.indice ?? 0) >= 85 ? '#15803D' : (m.indice ?? 0) >= 60 ? '#D97706' : '#DC2626' } }} />
                    <Typography sx={{ fontWeight: 800, fontSize: 14, minWidth: 48 }}>{m.indice == null ? '—' : `${m.indice.toFixed(0)}%`}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    {Object.entries(m.c).map(([e, n]) => <Box key={e} sx={{ fontSize: 11.5, color: CUMPLIMIENTO_COLOR[e] }}>{n} {e.replace('_', ' ')}</Box>)}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
        {tab === 1 && (
          <TablaRegistros<Registro> filas={crud.datos} cargando={crud.isLoading} vacio="Sin evaluaciones" etiqueta={e => e.obligacion_nombre ?? 'evaluación'}
            onEditar={e => setDlg({ abierto: true, r: e })} onRetirar={e => crud.retirar.mutate(e.id)}
            columnas={[
              { titulo: 'Obligación', valor: e => `${e.obligacion_codigo ?? ''} · ${e.obligacion_nombre ?? ''}` },
              { titulo: 'Marco', valor: e => e.marco ?? '—' },
              { titulo: 'Resultado', valor: e => <ChipEstado v={e.estado} /> },
              { titulo: 'Puntaje', valor: e => e.puntaje ?? '—', alinear: 'right' },
              { titulo: 'Evaluó', valor: e => e.responsable_nombre ?? '—' },
              { titulo: 'Fecha', valor: e => fmtFecha(e.ultima_evaluacion) },
              { titulo: 'Próxima', valor: e => fmtFecha(e.proxima_evaluacion) },
            ]} />
        )}
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? 'Editar evaluación' : 'Nueva evaluación'} campos={camposEvaluacion(personas, refs)}
          registro={dlg.r} valoresIniciales={{ estado: 'en_evaluacion', ultima_evaluacion: new Date().toISOString().slice(0, 10) }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
