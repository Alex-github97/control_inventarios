/**
 * LMS · Recomendaciones de formación
 *
 * Era una pantalla de «IA» con recomendaciones, predicciones, tendencias y un
 * asistente escritos a mano, y el servidor la respaldaba con puntajes fijos
 * (95 para todo obligatorio, 78 para el resto) y una «predicción» que era lo
 * completado más doce.
 *
 * Ahora dice qué curso le conviene a cada persona y POR QUÉ, con reglas que se
 * pueden revisar: obligatorios sin completar, competencias con brecha en su
 * cargo y rutas de su cargo. No hay puntajes: una regla explicada vale más que
 * un número que nadie puede verificar.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Paper, Autocomplete, TextField, Chip, Button, LinearProgress, Alert } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Lightbulb } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { lmsApi, type PersonaLMS } from '@/api/lms'
import { Encabezado } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO

export default function LMSIA() {
  const nav = useNavigate()
  const { data: personas = [] } = useQuery({ queryKey: ['lms-personas'], queryFn: lmsApi.personas })
  const [persona, setPersona] = useState<PersonaLMS | null>(null)
  const { data: rec, isLoading } = useQuery({ queryKey: ['lms-recomendaciones', persona?.id], queryFn: () => lmsApi.recomendaciones(persona?.id) })

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Lightbulb sx={{ fontSize: 28 }} />} titulo="Recomendaciones de formación" subtitulo="LMS · Qué curso le conviene a cada persona y por qué" color={LMS_COLOR} />
        <Autocomplete options={personas} value={persona} onChange={(_, v) => setPersona(v)} getOptionLabel={p => `${p.nombre}${p.cargo ? ` · ${p.cargo}` : ''}`}
          sx={{ maxWidth: 420, mb: 2 }} renderInput={p => <TextField {...p} size="small" label="Persona (vacío = tú)" />} />
        {isLoading && <LinearProgress />}
        {rec && (<>
          <Typography mb={2}><b>{rec.usuario.nombre}</b>{rec.usuario.cargo ? ` · ${rec.usuario.cargo}` : ' · sin cargo registrado'}</Typography>
          {!rec.usuario.cargo && <Alert severity="info" sx={{ mb: 2 }}>Sin cargo registrado solo se pueden recomendar los obligatorios: las brechas y las rutas se cruzan por cargo.</Alert>}
          {rec.cursos.length === 0 && <Typography color="text.secondary">Nada pendiente para esta persona.</Typography>}
          <Grid container spacing={2}>
            {rec.cursos.map(c => (
              <Grid key={c.id} size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>{c.es_obligatorio && <Chip size="small" color="warning" label="Obligatorio" />}<Chip size="small" label={`${c.duracion_horas} h`} /></Box>
                  <Typography fontWeight={800}>{c.nombre}</Typography>
                  {c.razones.map(r => <Typography key={r} fontSize={13} color="text.secondary">• {r}</Typography>)}
                  <Button size="small" sx={{ mt: 1 }} onClick={() => nav(`/lms/curso/${c.id}`)}>Ver curso</Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>)}
      </Box>
    </Layout>
  )
}
