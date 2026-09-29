/**
 * LMS · Tablero de la plataforma de aprendizaje
 *
 * Era una maqueta. Ahora las cifras las calcula el servidor con el estado de
 * los certificados por fecha (antes quedaban «vigentes» para siempre) y la
 * brecha de competencias calculada; los cursos destacados y los certificados
 * por vencer salen de los registros.
 */
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Paper, LinearProgress, Button } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { School } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { lmsApi } from '@/api/lms'
import { Cifra, Encabezado, Etiqueta, fmtFecha } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO

export default function LMSDashboard() {
  const nav = useNavigate()
  const { data: t, isLoading } = useQuery({ queryKey: ['lms-tablero'], queryFn: lmsApi.tablero })
  const { data: rep } = useQuery({ queryKey: ['lms-reportes'], queryFn: lmsApi.reportes })
  const { data: certs = [] } = useQuery({ queryKey: ['lms-certificados'], queryFn: lmsApi.certificados })
  const n = (k: string) => (t ? t[k] ?? 0 : '—')
  const porVencer = certs.filter(c => c.estado === 'POR_VENCER' || c.estado === 'VENCIDA').slice(0, 6)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<School sx={{ fontSize: 28 }} />} titulo="Plataforma de aprendizaje" subtitulo="LMS · Tablero" color={LMS_COLOR} accion="Ir al catálogo" onAccion={() => nav('/lms/catalogo')} />
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Cursos publicados" valor={n('cursos_publicados')} color={LMS_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="En curso" valor={n('en_progreso')} color="#D97706" sub={`${n('inscripciones')} inscripciones en total`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Tasa de finalización" valor={t?.tasa_finalizacion == null ? '—' : `${t.tasa_finalizacion}%`} color="#15803D" sub={`${n('completados')} completados`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Horas de formación" valor={n('horas_completadas')} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Certificados vigentes" valor={n('certificados_vigentes')} color="#15803D" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Por vencer (30 días)" valor={n('certificados_por_vencer')} color="#D97706" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Vencidos" valor={n('certificados_vencidos')} color="#DC2626" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Brechas de competencia" valor={n('brechas')} color="#7C3AED" sub={`${n('banco_preguntas')} preguntas en el banco`} /></Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={700} mb={1}>Cursos con más inscritos</Typography>
              {!rep?.top_cursos.length && <Typography fontSize={13} color="text.secondary">Sin inscripciones todavía.</Typography>}
              {(rep?.top_cursos ?? []).slice(0, 6).map(c => (
                <Box key={c.codigo} sx={{ mb: 1.25 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography fontSize={13}>{c.curso}</Typography><Typography fontSize={12} color="text.secondary">{c.completados}/{c.inscritos} completaron</Typography></Box>
                  <LinearProgress variant="determinate" value={c.tasa ?? 0} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: LMS_COLOR } }} />
                </Box>
              ))}
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography fontWeight={700}>Certificados por renovar</Typography>
                <Button size="small" onClick={() => nav('/lms/certificaciones')}>Ver todos</Button>
              </Box>
              {porVencer.length === 0 && <Typography fontSize={13} color="text.secondary">Ninguno vence en los próximos 30 días.</Typography>}
              {porVencer.map(c => (
                <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
                  <Box><Typography fontSize={13} fontWeight={600}>{c.usuario}</Typography><Typography fontSize={11} color="text.secondary">{c.certificacion} · vence {fmtFecha(c.vence)}</Typography></Box>
                  <Etiqueta texto={c.estado === 'VENCIDA' ? 'Vencido' : `${c.dias_restantes} días`} color={c.estado === 'VENCIDA' ? '#DC2626' : '#D97706'} />
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
