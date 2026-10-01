/**
 * GRC · Tablero
 *
 * Perfil de riesgo (inherente y residual), lo que está fuera del apetito,
 * eficacia del control interno, índice de cumplimiento, KRI, y la agenda de
 * todo lo que vence. El informe para la junta sale de aquí en PDF.
 */
import { useState } from 'react'
import { Box, Paper, Typography, Button, Tabs, Tab, Chip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Dashboard, PictureAsPdf } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { grc } from '@/api/grc'
import { Cifra, Encabezado, TablaRegistros, fmtFecha, errorApi } from '@/components/comun/Registro'
import { GRC_COLOR, MatrizCalor, ChipEstado } from '@/components/grc/comun'
import { KRI_COLOR } from '@/components/grc/etiquetas'
import { reporteJuntaPDF } from '@/components/grc/reporteJunta'

const RUTA: Record<string, string> = {
  control: '/grc/controles', politica: '/grc/politicas', obligacion: '/grc/obligaciones', hallazgo: '/grc/hallazgos',
  riesgo: '/grc/riesgos', continuidad: '/grc/continuidad', comite: '/grc/gobierno',
}

export default function GRCDashboard() {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['grc', 'tablero'], queryFn: grc.tablero })
  const agenda = useQuery({ queryKey: ['grc', 'agenda', 60], queryFn: () => grc.agenda(60) })
  const [vista, setVista] = useState<'vencido' | 'por_vencer' | 'todo'>('vencido')
  const t = q.data

  const informe = async () => {
    try { reporteJuntaPDF(await grc.reporteJunta(), GRC_COLOR) }
    catch (e) { toast.error(errorApi(e, 'No se pudo generar el informe')) }
  }
  const items = (agenda.data?.items ?? []).filter((i: any) => vista === 'todo' || i.estado === vista)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
          <Encabezado icono={<Dashboard sx={{ fontSize: 28 }} />} titulo="Gobierno, riesgo y cumplimiento" subtitulo="Tablero del módulo GRC" color={GRC_COLOR} />
          <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={informe}>Informe para la junta</Button>
        </Box>
        {t && <>
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 6, md: 3, lg: 1.5 }}><Cifra etiqueta="Riesgos abiertos" valor={t.riesgos.abiertos} color={GRC_COLOR} /></Grid>
            <Grid size={{ xs: 6, md: 3, lg: 1.5 }}><Cifra etiqueta="Críticos" valor={t.riesgos.criticos} color="#DC2626" /></Grid>
            <Grid size={{ xs: 6, md: 3, lg: 1.5 }}><Cifra etiqueta="Fuera del apetito" valor={t.riesgos.fuera_de_apetito.length} color="#991B1B" /></Grid>
            <Grid size={{ xs: 6, md: 3, lg: 1.5 }}><Cifra etiqueta="Controles efectivos" valor={t.controles.efectividad_pct == null ? '—' : `${t.controles.efectividad_pct}%`}
              color="#15803D" sub={`${t.controles.probados} de ${t.controles.total} probados`} /></Grid>
            <Grid size={{ xs: 6, md: 3, lg: 1.5 }}><Cifra etiqueta="Índice de cumplimiento" valor={t.cumplimiento.indice_pct == null ? '—' : `${t.cumplimiento.indice_pct}%`} color="#0369A1" /></Grid>
            <Grid size={{ xs: 6, md: 3, lg: 1.5 }}><Cifra etiqueta="Hallazgos vencidos" valor={t.hallazgos.vencidos} color="#EA580C" sub={`${t.hallazgos.abiertos} abiertos`} /></Grid>
            <Grid size={{ xs: 6, md: 3, lg: 1.5 }}><Cifra etiqueta="Incidentes (90 días)" valor={t.incidentes.ultimos_90} color="#7C3AED" sub={`${t.incidentes.abiertos} abiertos`} /></Grid>
            <Grid size={{ xs: 6, md: 3, lg: 1.5 }}><Cifra etiqueta="Vencido en agenda" valor={t.agenda.vencidos} color="#DC2626" sub={`${t.agenda.por_vencer} por vencer`} /></Grid>
          </Grid>
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 12, md: 6 }}><MatrizCalor titulo="Riesgo inherente" celdas={t.calor_inherente} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><MatrizCalor titulo="Riesgo residual" celdas={t.calor_residual} /></Grid>
          </Grid>
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Riesgos de mayor nivel</Typography>
              <TablaRegistros filas={t.top_riesgos} vacio="Sin riesgos abiertos" etiqueta={(r: any) => r.nombre} onFila={() => nav('/grc/riesgos')}
                columnas={[
                  { titulo: 'Código', valor: (r: any) => r.codigo },
                  { titulo: 'Riesgo', valor: (r: any) => r.nombre },
                  { titulo: 'Inherente', valor: (r: any) => r.nivel_inherente ?? '—', alinear: 'center' },
                  { titulo: 'Residual', valor: (r: any) => r.nivel_residual ?? '—', alinear: 'center' },
                  { titulo: 'Prioridad', valor: (r: any) => <ChipEstado v={r.prioridad} /> },
                  { titulo: 'Dueño', valor: (r: any) => r.responsable ?? '—' },
                ]} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Indicadores clave de riesgo</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {['critico', 'alerta', 'normal', 'sin_medicion'].map(k => (
                    <Chip key={k} label={`${t.kris[k] ?? 0} ${k.replace('_', ' ')}`} sx={{ bgcolor: KRI_COLOR[k], color: '#fff', fontWeight: 700 }} />
                  ))}
                </Box>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Fuera del apetito</Typography>
                {t.riesgos.fuera_de_apetito.length === 0 && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Ningún riesgo abierto supera el apetito declarado.</Typography>}
                {t.riesgos.fuera_de_apetito.map((r: any) => (
                  <Typography key={r.id} sx={{ fontSize: 12.5 }}>{r.codigo} · {r.nombre} — nivel {r.nivel} (tolera {r.apetito})</Typography>
                ))}
              </Paper>
            </Grid>
          </Grid>
        </>}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 700 }}>Agenda: lo que vence en los próximos 60 días</Typography>
            <Tabs value={vista} onChange={(_, v) => setVista(v)}>
              <Tab value="vencido" label={`Vencido (${agenda.data?.vencidos ?? 0})`} />
              <Tab value="por_vencer" label={`Por vencer (${agenda.data?.por_vencer ?? 0})`} />
              <Tab value="todo" label="Todo" />
            </Tabs>
          </Box>
          <TablaRegistros filas={items.map((i: any, n: number) => ({ ...i, id: n }))} cargando={agenda.isLoading} vacio="Nada en esta vista"
            etiqueta={(i: any) => i.titulo} onFila={(i: any) => RUTA[i.entidad] && nav(RUTA[i.entidad])}
            columnas={[
              { titulo: 'Fecha', valor: (i: any) => fmtFecha(i.fecha) },
              { titulo: 'Qué', valor: (i: any) => i.tipo },
              { titulo: 'Registro', valor: (i: any) => [i.codigo, i.titulo].filter(Boolean).join(' · ') },
              { titulo: 'Responsable', valor: (i: any) => i.responsable ?? '—' },
              { titulo: 'Días', valor: (i: any) => <Box sx={{ color: i.dias < 0 ? '#DC2626' : undefined, fontWeight: 700 }}>{i.dias}</Box>, alinear: 'right' },
            ]} />
        </Paper>
      </Box>
    </Layout>
  )
}
