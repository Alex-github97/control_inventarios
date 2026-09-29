/**
 * LMS · Biblioteca de conocimiento
 *
 * Era una maqueta: recursos y lecciones escritos a mano. Ahora es el material
 * real de los cursos publicados —videos, documentos, presentaciones,
 * enlaces— para buscarlo sin entrar curso por curso. El material se agrega en
 * el temario de cada curso: una biblioteca aparte sería una segunda copia.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Paper, TextField, MenuItem, Chip, Button, LinearProgress } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { LocalLibrary, Search, PlayCircle, Description, Link as LinkIcon, Slideshow } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { lmsApi } from '@/api/lms'
import { Cifra, Encabezado } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const TIPOS: Record<string, { l: string; i: JSX.Element }> = {
  VIDEO: { l: 'Video', i: <PlayCircle /> }, DOCUMENTO: { l: 'Documento', i: <Description /> }, PRESENTACION: { l: 'Presentación', i: <Slideshow /> },
  ENLACE: { l: 'Enlace', i: <LinkIcon /> }, QUIZ: { l: 'Actividad', i: <Description /> }, SIMULACION: { l: 'Simulación', i: <PlayCircle /> }, SCORM: { l: 'SCORM', i: <Description /> },
}

export default function LMSKnowledge() {
  const nav = useNavigate()
  const { data: lista = [], isLoading } = useQuery({ queryKey: ['lms-biblioteca'], queryFn: lmsApi.biblioteca })
  const [buscar, setBuscar] = useState('')
  const [tipo, setTipo] = useState('')
  const visibles = lista.filter(x => (!tipo || x.tipo === tipo) && (!buscar || `${x.titulo} ${x.descripcion ?? ''} ${x.curso} ${x.categoria ?? ''}`.toLowerCase().includes(buscar.toLowerCase())))
  const minutos = lista.reduce((s, x) => s + (x.duracion_minutos || 0), 0)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<LocalLibrary sx={{ fontSize: 28 }} />} titulo="Biblioteca de conocimiento" subtitulo="LMS · Todo el material de los cursos publicados" color={LMS_COLOR} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Recursos" valor={lista.length} color={LMS_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Videos" valor={lista.filter(x => x.tipo === 'VIDEO').length} color="#DC2626" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Documentos y presentaciones" valor={lista.filter(x => ['DOCUMENTO', 'PRESENTACION'].includes(x.tipo)).length} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Horas de material" valor={(minutos / 60).toFixed(1)} color="#15803D" /></Grid>
        </Grid>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <TextField size="small" placeholder="Buscar material o curso" value={buscar} onChange={e => setBuscar(e.target.value)} InputProps={{ startAdornment: <Search sx={{ fontSize: 18, mr: 0.5, color: 'text.disabled' }} /> }} sx={{ minWidth: 280 }} />
          <TextField select size="small" label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">Todos</MenuItem>{Object.entries(TIPOS).map(([k, v]) => <MenuItem key={k} value={k}>{v.l}</MenuItem>)}
          </TextField>
        </Box>
        {isLoading && <LinearProgress />}
        {!isLoading && visibles.length === 0 && <Typography color="text.secondary">{lista.length ? 'Nada coincide con la búsqueda.' : 'Aún no hay material: se agrega en el temario de cada curso publicado.'}</Typography>}
        <Grid container spacing={2}>
          {visibles.map(x => (
            <Grid key={x.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', color: LMS_COLOR }}>{TIPOS[x.tipo]?.i}<Chip size="small" label={TIPOS[x.tipo]?.l ?? x.tipo} />{x.duracion_minutos ? <Typography fontSize={11} color="text.secondary">{x.duracion_minutos} min</Typography> : null}</Box>
                <Typography fontWeight={700} mt={1}>{x.titulo}</Typography>
                <Typography fontSize={12} color="text.secondary" sx={{ flex: 1 }}>{x.descripcion ?? ''}</Typography>
                <Typography fontSize={11} color="text.secondary" mt={1}>{x.curso} · {x.modulo}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {x.url && <Button size="small" variant="contained" href={x.url} target="_blank" rel="noopener" sx={{ bgcolor: LMS_COLOR }}>Abrir</Button>}
                  <Button size="small" onClick={() => nav(`/lms/curso/${x.curso_id}`)}>Ir al curso</Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Layout>
  )
}
