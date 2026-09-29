/**
 * LMS · Mi aprendizaje
 *
 * Era una maqueta: cursos, avance, certificados e insignias de una persona
 * inventada. Ahora es el de quien inició sesión: sus inscripciones con avance
 * real, sus certificados con el estado calculado por fecha, sus insignias y
 * los cursos que le convienen, con la razón de cada uno.
 */
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Paper, LinearProgress, Chip, Button, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { School, EmojiEvents, WorkspacePremium } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { lmsApi } from '@/api/lms'
import { Cifra, Encabezado, Etiqueta, fmtFecha } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const EST: Record<string, { l: string; c: string }> = { INSCRITO: { l: 'Por empezar', c: '#0369A1' }, EN_PROGRESO: { l: 'En progreso', c: '#D97706' }, COMPLETADO: { l: 'Completado', c: '#15803D' }, ABANDONADO: { l: 'Abandonado', c: '#6B7280' }, PENDIENTE: { l: 'Pendiente', c: '#6B7280' } }
const CERT: Record<string, string> = { VIGENTE: '#15803D', POR_VENCER: '#D97706', VENCIDA: '#DC2626', CANCELADA: '#6B7280' }

export default function LMSMiAprendizaje() {
  const nav = useNavigate()
  const { data: mi, isLoading } = useQuery({ queryKey: ['lms-mi'], queryFn: lmsApi.miAprendizaje })
  const { data: rec } = useQuery({ queryKey: ['lms-recomendaciones'], queryFn: () => lmsApi.recomendaciones() })
  const activos = (mi?.cursos ?? []).filter(c => c.estado !== 'COMPLETADO')
  const hechos = (mi?.cursos ?? []).filter(c => c.estado === 'COMPLETADO')

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<School sx={{ fontSize: 28 }} />} titulo="Mi aprendizaje" subtitulo={mi ? `${mi.usuario.nombre}${mi.usuario.cargo ? ` · ${mi.usuario.cargo}` : ''}` : 'LMS'} color={LMS_COLOR} />
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="En curso" valor={activos.length} color="#D97706" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Completados" valor={hechos.length} color="#15803D" sub={`${mi?.horas_completadas ?? 0} horas de formación`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Certificados vigentes" valor={(mi?.certificados ?? []).filter(c => ['VIGENTE', 'POR_VENCER'].includes(c.estado)).length} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Puntos" valor={mi?.puntos ?? 0} color={LMS_COLOR} sub={`${mi?.insignias.length ?? 0} insignias`} /></Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography fontWeight={800} mb={1}>Mis cursos</Typography>
            {mi && mi.cursos.length === 0 && <Typography color="text.secondary" fontSize={14}>Aún no estás inscrito en ningún curso. Mira las recomendaciones o el catálogo.</Typography>}
            {(mi?.cursos ?? []).map(c => {
              const e = EST[c.estado] ?? { l: c.estado, c: '#6B7280' }
              return (
                <Paper key={c.id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2, cursor: 'pointer' }} onClick={() => nav(`/lms/curso/${c.curso_id}`)}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Box><Typography fontWeight={700}>{c.curso}</Typography><Typography fontSize={12} color="text.secondary">{c.codigo} · {c.duracion_horas} h{c.es_obligatorio ? ' · obligatorio' : ''}</Typography></Box>
                    <Etiqueta texto={e.l} color={e.c} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <LinearProgress variant="determinate" value={c.progreso_pct} sx={{ flex: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: e.c } }} />
                    <Typography fontSize={12} fontWeight={700}>{c.progreso_pct.toFixed(0)}%</Typography>
                    {c.nota_final != null && <Chip size="small" label={`Nota ${c.nota_final}`} />}
                  </Box>
                </Paper>
              )
            })}
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography fontWeight={800} mb={1}>Te recomendamos</Typography>
            {rec && rec.cursos.length === 0 && <Typography color="text.secondary" fontSize={13} mb={2}>Nada pendiente: no tienes obligatorios sin completar ni brechas registradas para tu cargo.</Typography>}
            {(rec?.cursos ?? []).slice(0, 4).map(c => (
              <Paper key={c.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2 }}>
                <Typography fontWeight={700} fontSize={14}>{c.nombre}</Typography>
                {c.razones.map(r => <Typography key={r} fontSize={12} color="text.secondary">• {r}</Typography>)}
                <Button size="small" onClick={() => nav(`/lms/curso/${c.id}`)}>Ver curso</Button>
              </Paper>
            ))}
            <Typography fontWeight={800} mt={2} mb={1}>Certificados</Typography>
            {mi && mi.certificados.length === 0 && <Typography color="text.secondary" fontSize={13}>Todavía no tienes certificados.</Typography>}
            {(mi?.certificados ?? []).map(c => (
              <Paper key={c.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <WorkspacePremium sx={{ color: CERT[c.estado] }} />
                <Box sx={{ flex: 1 }}><Typography fontSize={13} fontWeight={700}>{c.certificacion}</Typography><Typography fontSize={11} color="text.secondary">{c.numero} · vence {fmtFecha(c.vence)}</Typography></Box>
                <Etiqueta texto={c.estado.replace('_', ' ').toLowerCase()} color={CERT[c.estado]} />
              </Paper>
            ))}
            {!!mi?.insignias.length && (<>
              <Typography fontWeight={800} mt={2} mb={1}>Insignias</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {mi.insignias.map(i => <Chip key={i.nombre} icon={<EmojiEvents />} label={`${i.nombre} · ${i.puntos} pts`} sx={{ bgcolor: alpha(i.color || LMS_COLOR, 0.12) }} />)}
              </Box>
            </>)}
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
