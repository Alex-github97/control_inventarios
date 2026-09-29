/**
 * LMS · Onboarding
 *
 * Era una maqueta: procesos de inducción de personas inventadas. Ahora cruza
 * a cada usuario con los cursos obligatorios publicados: cuáles completó,
 * cuáles lleva y cuáles no ha empezado, y deja inscribir a quien le falten.
 */
import { useState } from 'react'
import { Box, Typography, Paper, LinearProgress, Chip, Button, TextField, MenuItem, Alert, Tooltip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { RocketLaunch } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { lmsApi } from '@/api/lms'
import { Cifra, Encabezado, fmtFecha, errorApi } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const EST: Record<string, { l: string; c: string }> = { COMPLETADO: { l: 'Completado', c: '#15803D' }, EN_PROGRESO: { l: 'En progreso', c: '#D97706' }, INSCRITO: { l: 'Inscrito', c: '#0369A1' }, SIN_INSCRIBIR: { l: 'Sin inscribir', c: '#DC2626' }, ABANDONADO: { l: 'Abandonado', c: '#6B7280' } }

export default function LMSOnboarding() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['lms-onboarding'], queryFn: lmsApi.onboarding })
  const [filtro, setFiltro] = useState('pendientes')
  const personas = data?.personas ?? []
  const visibles = personas.filter(p => filtro === 'todos' || (filtro === 'pendientes' ? p.completados < p.total : p.completados === p.total))
  const inscribir = useMutation({
    mutationFn: async (p: typeof personas[number]) => {
      for (const c of p.cursos.filter(c => c.estado === 'SIN_INSCRIBIR')) await lmsApi.inscribirVarios(c.curso_id, [p.usuario_id])
    },
    onSuccess: () => { toast.success('Inscrito en los obligatorios que le faltaban'); qc.invalidateQueries({ queryKey: ['lms-onboarding'] }) },
    onError: (e: any) => toast.error(errorApi(e)),
  })

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<RocketLaunch sx={{ fontSize: 28 }} />} titulo="Onboarding" subtitulo="LMS · Avance de cada persona en los cursos obligatorios" color={LMS_COLOR} />
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        {data && data.obligatorios.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>No hay cursos obligatorios publicados. Márcalos como obligatorios en el catálogo.</Alert>}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Cursos obligatorios" valor={data?.obligatorios.length ?? 0} color={LMS_COLOR} sub={`${(data?.obligatorios ?? []).reduce((s, c) => s + c.duracion_horas, 0)} horas`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Personas al día" valor={personas.filter(p => p.total && p.completados === p.total).length} color="#15803D" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Con pendientes" valor={personas.filter(p => p.completados < p.total).length} color="#D97706" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Sin inscribir en alguno" valor={personas.filter(p => p.cursos.some(c => c.estado === 'SIN_INSCRIBIR')).length} color="#DC2626" /></Grid>
        </Grid>
        <TextField select size="small" label="Mostrar" value={filtro} onChange={e => setFiltro(e.target.value)} sx={{ minWidth: 180, mb: 2 }}>
          <MenuItem value="pendientes">Con pendientes</MenuItem><MenuItem value="aldia">Al día</MenuItem><MenuItem value="todos">Todos</MenuItem>
        </TextField>
        <Grid container spacing={2}>
          {visibles.map(p => (
            <Grid key={p.usuario_id} size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Box><Typography fontWeight={800}>{p.nombre}</Typography><Typography fontSize={12} color="text.secondary">{p.cargo ?? 'Sin cargo'} · usuario desde {fmtFecha(p.ingreso)}</Typography></Box>
                  <Typography fontWeight={800}>{p.completados}/{p.total}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={p.avance_pct ?? 0} sx={{ my: 1, height: 6, borderRadius: 3 }} />
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {p.cursos.map(c => <Tooltip key={c.curso_id} title={`${EST[c.estado]?.l ?? c.estado}${c.progreso_pct ? ` · ${c.progreso_pct.toFixed(0)}%` : ''}`}><Chip size="small" label={c.curso} sx={{ bgcolor: `${EST[c.estado]?.c ?? '#6B7280'}22`, color: EST[c.estado]?.c }} /></Tooltip>)}
                </Box>
                {p.cursos.some(c => c.estado === 'SIN_INSCRIBIR') && <Button size="small" sx={{ mt: 1 }} disabled={inscribir.isPending} onClick={() => inscribir.mutate(p)}>Inscribir en los que faltan</Button>}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Layout>
  )
}
