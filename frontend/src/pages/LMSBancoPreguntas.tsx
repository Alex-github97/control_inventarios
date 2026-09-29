/**
 * LMS · Banco de preguntas
 *
 * Era una maqueta en memoria. Ahora las preguntas se guardan con sus opciones
 * en un solo paso, y el servidor exige lo que hace calificable una pregunta
 * cerrada: al menos dos opciones y exactamente una correcta. Las abiertas se
 * guardan pero no entran a las evaluaciones que se califican solas.
 */
import { useState } from 'react'
import { Box, Typography, Paper, Button, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Radio, Chip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Quiz, Add, DeleteForever } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { lmsApi, type Pregunta } from '@/api/lms'
import { TablaRegistros, Cifra, Encabezado, errorApi } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const TIPOS: [string, string][] = [['MULTIPLE', 'Opción múltiple'], ['VERDADERO_FALSO', 'Verdadero / falso'], ['CASO_PRACTICO', 'Caso práctico (abierta)'], ['RESPUESTA_ABIERTA', 'Respuesta abierta']]
const cerrada = (t: string) => ['MULTIPLE', 'VERDADERO_FALSO'].includes(t)
type Form = { tipo: string; enunciado: string; nivel_dificultad: string; categoria: string; puntaje: string; opciones: { texto: string; es_correcta: boolean }[] }
const VACIO: Form = { tipo: 'MULTIPLE', enunciado: '', nivel_dificultad: 'MEDIO', categoria: '', puntaje: '1', opciones: [{ texto: '', es_correcta: true }, { texto: '', es_correcta: false }] }

export default function LMSBancoPreguntas() {
  const qc = useQueryClient()
  const { data: lista = [], isLoading } = useQuery({ queryKey: ['lms-preguntas'], queryFn: lmsApi.preguntas.listar })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Pregunta | null }>({ abierto: false, r: null })
  const [f, setF] = useState<Form>(VACIO)
  const [filtro, setFiltro] = useState('')
  const refrescar = () => qc.invalidateQueries({ queryKey: ['lms-preguntas'] })

  const abrir = (r: Pregunta | null) => {
    setF(r ? { tipo: r.tipo, enunciado: r.enunciado, nivel_dificultad: r.nivel_dificultad, categoria: r.categoria ?? '', puntaje: String(r.puntaje),
      opciones: r.opciones.length ? r.opciones.map(o => ({ texto: o.texto, es_correcta: o.es_correcta })) : VACIO.opciones } : VACIO)
    setDlg({ abierto: true, r })
  }
  const cambiarTipo = (tipo: string) => setF({ ...f, tipo, opciones: tipo === 'VERDADERO_FALSO' ? [{ texto: 'Verdadero', es_correcta: true }, { texto: 'Falso', es_correcta: false }] : f.opciones })
  const opsValidas = f.opciones.filter(o => o.texto.trim())
  const error = !f.enunciado.trim() ? 'Escribe el enunciado'
    : !(Number(f.puntaje) >= 1) ? 'El puntaje debe ser al menos 1'
    : cerrada(f.tipo) && opsValidas.length < 2 ? 'Necesita al menos dos opciones'
    : cerrada(f.tipo) && opsValidas.filter(o => o.es_correcta).length !== 1 ? 'Marca exactamente una correcta' : null

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = { tipo: f.tipo, enunciado: f.enunciado.trim(), nivel_dificultad: f.nivel_dificultad, categoria: f.categoria.trim() || null, puntaje: Number(f.puntaje), opciones: cerrada(f.tipo) ? opsValidas : [] }
      return dlg.r ? lmsApi.preguntas.editar(dlg.r.id, cuerpo) : lmsApi.preguntas.crear(cuerpo)
    },
    onSuccess: () => { toast.success(dlg.r ? 'Pregunta actualizada' : 'Pregunta registrada'); refrescar(); setDlg({ abierto: false, r: null }) },
    onError: (e: any) => toast.error(errorApi(e)),
  })
  const retirar = useMutation({ mutationFn: (id: number) => lmsApi.preguntas.retirar(id), onSuccess: () => { toast.success('Pregunta retirada'); refrescar() } })
  const visibles = filtro ? lista.filter(p => p.tipo === filtro) : lista

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Quiz sx={{ fontSize: 28 }} />} titulo="Banco de preguntas" subtitulo="LMS · Preguntas para las evaluaciones" color={LMS_COLOR} accion="Nueva pregunta" onAccion={() => abrir(null)} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Preguntas" valor={lista.length} color={LMS_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Calificables" valor={lista.filter(p => cerrada(p.tipo)).length} color="#15803D" sub="Múltiple y verdadero/falso" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Abiertas" valor={lista.filter(p => !cerrada(p.tipo)).length} color="#6B7280" sub="No entran a la calificación automática" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Sin usar" valor={lista.filter(p => !p.en_evaluaciones).length} color="#D97706" sub="No están en ninguna evaluación" /></Grid>
        </Grid>
        <TextField select size="small" label="Tipo" value={filtro} onChange={e => setFiltro(e.target.value)} sx={{ minWidth: 220, mb: 2 }}>
          <MenuItem value="">Todos</MenuItem>{TIPOS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
        </TextField>
        <TablaRegistros<Pregunta> filas={visibles} cargando={isLoading} vacio="Sin preguntas" etiqueta={p => p.codigo}
          onEditar={p => abrir(p)} onRetirar={p => retirar.mutate(p.id)}
          columnas={[
            { titulo: 'Código', valor: p => <Box sx={{ fontFamily: 'monospace' }}>{p.codigo}</Box> },
            { titulo: 'Pregunta', valor: p => <><b>{p.enunciado}</b>{cerrada(p.tipo) && <Typography fontSize={11} color="text.secondary">Correcta: {p.opciones.find(o => o.es_correcta)?.texto ?? '—'}</Typography>}</> },
            { titulo: 'Tipo', valor: p => TIPOS.find(t => t[0] === p.tipo)?.[1] ?? p.tipo },
            { titulo: 'Dificultad', valor: p => p.nivel_dificultad.toLowerCase() },
            { titulo: 'Puntaje', alinear: 'right', valor: p => p.puntaje },
            { titulo: 'En evaluaciones', alinear: 'right', valor: p => p.en_evaluaciones },
          ]} />
        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, r: null })} maxWidth="sm" fullWidth>
          <DialogTitle>{dlg.r ? `Pregunta ${dlg.r.codigo}` : 'Nueva pregunta'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12 }}><TextField label="Enunciado" required fullWidth multiline minRows={2} size="small" value={f.enunciado} onChange={e => setF({ ...f, enunciado: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Tipo" fullWidth size="small" value={f.tipo} onChange={e => cambiarTipo(e.target.value)}>{TIPOS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField select label="Dificultad" fullWidth size="small" value={f.nivel_dificultad} onChange={e => setF({ ...f, nivel_dificultad: e.target.value })}>{['BAJO', 'MEDIO', 'ALTO'].map(v => <MenuItem key={v} value={v}>{v.toLowerCase()}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Puntaje" type="number" fullWidth size="small" value={f.puntaje} onChange={e => setF({ ...f, puntaje: e.target.value })} /></Grid>
              <Grid size={{ xs: 12 }}><TextField label="Categoría" fullWidth size="small" value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })} /></Grid>
            </Grid>
            {cerrada(f.tipo) && (
              <Box mt={2}>
                <Typography fontSize={13} fontWeight={700} mb={1}>Opciones <Typography component="span" fontSize={11} color="text.secondary">(marca la correcta)</Typography></Typography>
                {dlg.r && dlg.r.en_evaluaciones > 0 && <Chip size="small" color="warning" label="Si ya tiene respuestas registradas, las opciones no se reemplazan" sx={{ mb: 1 }} />}
                {f.opciones.map((o, i) => (
                  <Paper key={i} variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.5, mb: 0.75 }}>
                    <Radio size="small" checked={o.es_correcta} inputProps={{ 'aria-label': `Opción ${i + 1} correcta` }}
                      onChange={() => setF({ ...f, opciones: f.opciones.map((x, j) => ({ ...x, es_correcta: j === i })) })} />
                    <TextField variant="standard" fullWidth placeholder={`Opción ${i + 1}`} value={o.texto} disabled={f.tipo === 'VERDADERO_FALSO'}
                      onChange={e => setF({ ...f, opciones: f.opciones.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} />
                    {f.tipo === 'MULTIPLE' && f.opciones.length > 2 && <IconButton size="small" aria-label={`Quitar opción ${i + 1}`} onClick={() => setF({ ...f, opciones: f.opciones.filter((_, j) => j !== i) })}><DeleteForever fontSize="small" /></IconButton>}
                  </Paper>
                ))}
                {f.tipo === 'MULTIPLE' && f.opciones.length < 6 && <Button size="small" startIcon={<Add />} onClick={() => setF({ ...f, opciones: [...f.opciones, { texto: '', es_correcta: false }] })}>Agregar opción</Button>}
              </Box>
            )}
            {error && <Typography fontSize={12} color="error" mt={1}>{error}</Typography>}
          </DialogContent>
          <DialogActions><Button onClick={() => setDlg({ abierto: false, r: null })}>Cancelar</Button><Button variant="contained" disabled={!!error || guardar.isPending} onClick={() => guardar.mutate()} sx={{ bgcolor: LMS_COLOR }}>Guardar</Button></DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
