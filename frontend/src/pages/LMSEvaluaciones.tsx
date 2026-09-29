/**
 * LMS · Evaluaciones
 *
 * Era una maqueta: evaluaciones con promedios y tasas de aprobación escritos
 * a mano. Ahora se arman eligiendo preguntas del banco, se amarran a un curso,
 * y los intentos, el promedio y los aprobados salen de los intentos reales.
 */
import { useState } from 'react'
import { Box, Typography, Autocomplete, TextField, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, Button, MenuItem, FormControlLabel, Switch } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Assignment } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { lmsApi, type Evaluacion, type Pregunta } from '@/api/lms'
import { TablaRegistros, Cifra, Encabezado, Etiqueta, errorApi } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const TIPOS: [string, string][] = [['DIAGNOSTICO', 'Diagnóstico'], ['FORMATIVO', 'Formativa'], ['CERTIFICACION', 'Certificación'], ['RECERTIFICACION', 'Recertificación'], ['PRACTICO', 'Práctica']]
type Form = { nombre: string; tipo: string; curso_id: string; descripcion: string; tiempo_limite_min: string; intentos_maximos: string; puntaje_aprobacion: string; aleatorizar_preguntas: boolean; activo: boolean; preguntas: Pregunta[] }
const VACIO: Form = { nombre: '', tipo: 'CERTIFICACION', curso_id: '', descripcion: '', tiempo_limite_min: '', intentos_maximos: '3', puntaje_aprobacion: '70', aleatorizar_preguntas: true, activo: true, preguntas: [] }

export default function LMSEvaluaciones() {
  const qc = useQueryClient()
  const { data: lista = [], isLoading } = useQuery({ queryKey: ['lms-evaluaciones'], queryFn: lmsApi.evaluaciones.listar })
  const { data: preguntas = [] } = useQuery({ queryKey: ['lms-preguntas'], queryFn: lmsApi.preguntas.listar })
  const { data: cursos = [] } = useQuery({ queryKey: ['lms-catalogo'], queryFn: lmsApi.catalogo })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Evaluacion | null }>({ abierto: false, r: null })
  const [f, setF] = useState<Form>(VACIO)
  const cerradas = preguntas.filter(p => ['MULTIPLE', 'VERDADERO_FALSO'].includes(p.tipo))
  const refrescar = () => qc.invalidateQueries({ queryKey: ['lms-evaluaciones'] })

  const abrir = (r: Evaluacion | null) => {
    setF(r ? { nombre: r.nombre, tipo: r.tipo, curso_id: r.curso_id ? String(r.curso_id) : '', descripcion: r.descripcion ?? '', tiempo_limite_min: r.tiempo_limite_min ? String(r.tiempo_limite_min) : '',
      intentos_maximos: String(r.intentos_maximos), puntaje_aprobacion: String(r.puntaje_aprobacion), aleatorizar_preguntas: r.aleatorizar_preguntas, activo: r.activo,
      preguntas: r.pregunta_ids.map(id => preguntas.find(p => p.id === id)).filter(Boolean) as Pregunta[] } : VACIO)
    setDlg({ abierto: true, r })
  }
  const error = !f.nombre.trim() ? 'Falta el nombre' : !(Number(f.intentos_maximos) >= 1) ? 'Al menos un intento'
    : !(Number(f.puntaje_aprobacion) >= 0 && Number(f.puntaje_aprobacion) <= 100) ? 'Aprobación de 0 a 100'
    : f.tiempo_limite_min !== '' && !(Number(f.tiempo_limite_min) > 0) ? 'Tiempo mayor que cero' : !f.preguntas.length ? 'Elige al menos una pregunta' : null
  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = { nombre: f.nombre.trim(), tipo: f.tipo, curso_id: f.curso_id ? Number(f.curso_id) : null, descripcion: f.descripcion.trim() || null,
        tiempo_limite_min: f.tiempo_limite_min ? Number(f.tiempo_limite_min) : null, intentos_maximos: Number(f.intentos_maximos),
        puntaje_aprobacion: Number(f.puntaje_aprobacion), aleatorizar_preguntas: f.aleatorizar_preguntas, activo: f.activo, pregunta_ids: f.preguntas.map(p => p.id) }
      return dlg.r ? lmsApi.evaluaciones.editar(dlg.r.id, cuerpo) : lmsApi.evaluaciones.crear(cuerpo)
    },
    onSuccess: () => { toast.success(dlg.r ? 'Evaluación actualizada' : 'Evaluación registrada'); refrescar(); setDlg({ abierto: false, r: null }) },
    onError: (e: any) => toast.error(errorApi(e)),
  })
  const retirar = useMutation({ mutationFn: (id: number) => lmsApi.evaluaciones.retirar(id), onSuccess: () => { toast.success('Evaluación desactivada'); refrescar() } })
  const intentos = lista.reduce((s, e) => s + e.intentos, 0)
  const aprob = lista.reduce((s, e) => s + e.aprobados, 0)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Assignment sx={{ fontSize: 28 }} />} titulo="Evaluaciones" subtitulo="LMS · Exámenes de los cursos" color={LMS_COLOR} accion="Nueva evaluación" onAccion={() => abrir(null)} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Evaluaciones activas" valor={lista.filter(e => e.activo).length} color={LMS_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Intentos presentados" valor={intentos} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Tasa de aprobación" valor={intentos ? `${Math.round((aprob / intentos) * 100)}%` : '—'} color="#15803D" sub="Por intento" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Sin curso" valor={lista.filter(e => !e.curso_id).length} color="#6B7280" sub="No bloquean la finalización de ningún curso" /></Grid>
        </Grid>
        <TablaRegistros<Evaluacion> filas={lista} cargando={isLoading} vacio="Sin evaluaciones" etiqueta={e => e.nombre}
          onEditar={e => abrir(e)} onRetirar={e => retirar.mutate(e.id)}
          columnas={[
            { titulo: 'Código', valor: e => <Box sx={{ fontFamily: 'monospace' }}>{e.codigo}</Box> },
            { titulo: 'Evaluación', valor: e => <><b>{e.nombre}</b><Typography fontSize={11} color="text.secondary">{e.curso ?? 'Sin curso'}</Typography></> },
            { titulo: 'Tipo', valor: e => TIPOS.find(t => t[0] === e.tipo)?.[1] ?? e.tipo },
            { titulo: 'Preguntas', alinear: 'right', valor: e => e.pregunta_ids.length },
            { titulo: 'Reglas', valor: e => `${e.puntaje_aprobacion}% · ${e.intentos_maximos} intento(s)${e.tiempo_limite_min ? ` · ${e.tiempo_limite_min} min` : ''}` },
            { titulo: 'Intentos', alinear: 'right', valor: e => e.intentos },
            { titulo: 'Promedio', alinear: 'right', valor: e => (e.promedio == null ? '—' : `${e.promedio}%`) },
            { titulo: 'Estado', valor: e => <Etiqueta texto={e.activo ? 'Activa' : 'Inactiva'} color={e.activo ? '#15803D' : '#6B7280'} /> },
          ]} />
        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, r: null })} maxWidth="md" fullWidth>
          <DialogTitle>{dlg.r ? `Evaluación ${dlg.r.codigo}` : 'Nueva evaluación'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, sm: 8 }}><TextField label="Nombre" required fullWidth size="small" value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField select label="Tipo" fullWidth size="small" value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}>{TIPOS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 12 }}><TextField select label="Curso" fullWidth size="small" value={f.curso_id} onChange={e => setF({ ...f, curso_id: e.target.value })} helperText="Si tiene curso, hay que aprobarla para completarlo">
                <MenuItem value=""><em>Sin curso</em></MenuItem>{cursos.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.codigo} · {c.nombre}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 4 }}><TextField label="Aprueba con (%)" type="number" fullWidth size="small" value={f.puntaje_aprobacion} onChange={e => setF({ ...f, puntaje_aprobacion: e.target.value })} /></Grid>
              <Grid size={{ xs: 4 }}><TextField label="Intentos" type="number" fullWidth size="small" value={f.intentos_maximos} onChange={e => setF({ ...f, intentos_maximos: e.target.value })} /></Grid>
              <Grid size={{ xs: 4 }}><TextField label="Minutos (vacío = sin límite)" type="number" fullWidth size="small" value={f.tiempo_limite_min} onChange={e => setF({ ...f, tiempo_limite_min: e.target.value })} /></Grid>
              <Grid size={{ xs: 12 }}>
                <Autocomplete multiple disableCloseOnSelect options={cerradas} value={f.preguntas} onChange={(_, v) => setF({ ...f, preguntas: v })}
                  getOptionLabel={p => `${p.codigo} · ${p.enunciado}`} isOptionEqualToValue={(a, b) => a.id === b.id}
                  renderOption={(props, p, { selected }) => <li {...props}><Checkbox size="small" checked={selected} />{p.codigo} · {p.enunciado} ({p.puntaje} pt)</li>}
                  renderInput={p => <TextField {...p} label="Preguntas (del banco, solo calificables)" size="small" />} />
                <Typography fontSize={11} color="text.secondary" mt={0.5}>{f.preguntas.length} preguntas · {f.preguntas.reduce((s, p) => s + p.puntaje, 0)} puntos</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel control={<Switch checked={f.aleatorizar_preguntas} onChange={e => setF({ ...f, aleatorizar_preguntas: e.target.checked })} />} label="Orden aleatorio por intento" />
                <FormControlLabel control={<Switch checked={f.activo} onChange={e => setF({ ...f, activo: e.target.checked })} />} label="Activa" />
              </Grid>
            </Grid>
            {error && <Typography fontSize={12} color="error">{error}</Typography>}
          </DialogContent>
          <DialogActions><Button onClick={() => setDlg({ abierto: false, r: null })}>Cancelar</Button><Button variant="contained" disabled={!!error || guardar.isPending} onClick={() => guardar.mutate()} sx={{ bgcolor: LMS_COLOR }}>Guardar</Button></DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
