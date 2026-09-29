/**
 * LMS · Catálogo de cursos
 *
 * Era una maqueta: tarjetas escritas a mano y un «Inscribirme» que no hacía
 * nada. Ahora lista los cursos reales con su avance para quien mira, lleva a
 * tomar cada curso, y permite crear y editar cursos e inscribir a un grupo
 * (por ejemplo, a todo un cargo en un obligatorio).
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Paper, Chip, Button, TextField, MenuItem, LinearProgress, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Checkbox, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { MenuBook, Edit, GroupAdd, Search, Archive } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { lmsApi, type Curso, type PersonaLMS } from '@/api/lms'
import { FormularioRegistro, Encabezado, errorApi, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const MODALIDADES: [string, string][] = [['VIRTUAL', 'Virtual'], ['PRESENCIAL', 'Presencial'], ['HIBRIDO', 'Híbrido'], ['MICROLEARNING', 'Microlearning'], ['WEBINAR', 'Webinar'], ['SIMULACION', 'Simulación']]
const NIVELES: [string, string][] = [['BASICO', 'Básico'], ['INTERMEDIO', 'Intermedio'], ['AVANZADO', 'Avanzado'], ['EXPERTO', 'Experto']]
const ESTADOS: [string, string][] = [['BORRADOR', 'Borrador'], ['REVISION', 'En revisión'], ['PUBLICADO', 'Publicado']]
const MI_ESTADO: Record<string, { l: string; c: string }> = { INSCRITO: { l: 'Inscrito', c: '#0369A1' }, EN_PROGRESO: { l: 'En progreso', c: '#D97706' }, COMPLETADO: { l: 'Completado', c: '#15803D' }, ABANDONADO: { l: 'Abandonado', c: '#6B7280' } }

export default function LMSCatalogo() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { data: cursos = [], isLoading } = useQuery({ queryKey: ['lms-catalogo'], queryFn: lmsApi.catalogo })
  const { data: instructores = [] } = useQuery({ queryKey: ['lms-instructores'], queryFn: lmsApi.instructores.listar })
  const { data: personas = [] } = useQuery({ queryKey: ['lms-personas'], queryFn: lmsApi.personas })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Curso | null }>({ abierto: false, r: null })
  const [masiva, setMasiva] = useState<Curso | null>(null)
  const [elegidos, setElegidos] = useState<PersonaLMS[]>([])
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState('')
  const refrescar = () => qc.invalidateQueries({ queryKey: ['lms-catalogo'] })

  const archivar = useMutation({ mutationFn: (id: number) => lmsApi.archivarCurso(id), onSuccess: () => { toast.success('Curso archivado'); refrescar() } })
  const inscribir = useMutation({
    mutationFn: () => lmsApi.inscribirVarios(masiva!.id, elegidos.map(p => p.id)),
    onSuccess: r => { toast.success(`${r.inscritos} inscrito(s)${r.ya_estaban ? `, ${r.ya_estaban} ya lo estaban` : ''}`); refrescar(); setMasiva(null) },
    onError: (e: any) => toast.error(errorApi(e)),
  })

  const cargos = useMemo(() => [...new Set(personas.map(p => p.cargo).filter(Boolean))] as string[], [personas])
  const visibles = cursos.filter(c => (!estado || c.estado === estado) &&
    (!buscar || `${c.nombre} ${c.codigo} ${c.categoria ?? ''}`.toLowerCase().includes(buscar.toLowerCase())))
  const CAMPOS: Campo[] = [
    { clave: 'nombre', etiqueta: 'Curso', obligatorio: true },
    { clave: 'modalidad', etiqueta: 'Modalidad', tipo: 'seleccion', opciones: MODALIDADES, obligatorio: true, ancho: 6 },
    { clave: 'nivel', etiqueta: 'Nivel', tipo: 'seleccion', opciones: NIVELES, obligatorio: true, ancho: 6 },
    { clave: 'instructor_id', etiqueta: 'Instructor', tipo: 'seleccion', opciones: instructores.map(i => [i.id, i.nombre] as [number, string]), ancho: 6 },
    { clave: 'categoria', etiqueta: 'Categoría', ancho: 6 },
    { clave: 'duracion_horas', etiqueta: 'Duración (horas)', tipo: 'numero', min: 0, ancho: 4 },
    { clave: 'puntaje_aprobacion', etiqueta: 'Aprueba con (%)', tipo: 'numero', min: 0, max: 100, ancho: 4 },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS, obligatorio: true, ancho: 4, ayuda: 'Publicar exige contenidos' },
    { clave: 'es_obligatorio', etiqueta: 'Obligatorio para todos', tipo: 'interruptor' },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<MenuBook sx={{ fontSize: 28 }} />} titulo="Catálogo de cursos" subtitulo="LMS · Cursos disponibles y su avance"
          color={LMS_COLOR} accion="Nuevo curso" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <TextField size="small" placeholder="Buscar curso" value={buscar} onChange={e => setBuscar(e.target.value)} InputProps={{ startAdornment: <Search sx={{ fontSize: 18, mr: 0.5, color: 'text.disabled' }} /> }} />
          <TextField select size="small" label="Estado" value={estado} onChange={e => setEstado(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">Todos</MenuItem>{ESTADOS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>
        </Box>
        {isLoading && <LinearProgress />}
        {!isLoading && visibles.length === 0 && <Typography color="text.secondary">No hay cursos. Crea el primero con «Nuevo curso».</Typography>}
        <Grid container spacing={2}>
          {visibles.map(c => {
            const me = c.mi_estado ? MI_ESTADO[c.mi_estado] : null
            return (
              <Grid key={c.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={MODALIDADES.find(m => m[0] === c.modalidad)?.[1] ?? c.modalidad} />
                    <Chip size="small" label={NIVELES.find(m => m[0] === c.nivel)?.[1] ?? c.nivel} variant="outlined" />
                    {c.es_obligatorio && <Chip size="small" label="Obligatorio" color="warning" />}
                    {c.estado !== 'PUBLICADO' && <Chip size="small" label={ESTADOS.find(e => e[0] === c.estado)?.[1] ?? c.estado} />}
                  </Box>
                  <Typography fontWeight={800}>{c.nombre}</Typography>
                  <Typography fontSize={12} color="text.secondary">{c.codigo} · {c.duracion_horas} h · {c.total_contenidos} contenidos{c.instructor ? ` · ${c.instructor}` : ''}</Typography>
                  <Typography fontSize={13} color="text.secondary" mt={1} sx={{ flex: 1 }}>{c.descripcion ?? ''}</Typography>
                  <Typography fontSize={12} color="text.secondary" mt={1}>{c.total_inscritos} inscritos · {c.total_completados} completaron</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Button variant="contained" size="small" onClick={() => nav(`/lms/curso/${c.id}`)} sx={{ bgcolor: LMS_COLOR }}>{me ? 'Continuar' : 'Ver curso'}</Button>
                    {me && <Chip size="small" label={me.l} sx={{ bgcolor: alpha(me.c, 0.12), color: me.c, fontWeight: 700 }} />}
                    <Box sx={{ flex: 1 }} />
                    {c.estado === 'PUBLICADO' && <Tooltip title="Inscribir personas"><IconButton size="small" aria-label={`Inscribir personas en ${c.nombre}`} onClick={() => { setElegidos([]); setMasiva(c) }}><GroupAdd fontSize="small" /></IconButton></Tooltip>}
                    <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${c.nombre}`} onClick={() => setDlg({ abierto: true, r: c })}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Archivar"><IconButton size="small" aria-label={`Archivar ${c.nombre}`} onClick={() => { if (window.confirm(`¿Archivar «${c.nombre}»? Sus inscripciones y certificados se conservan.`)) archivar.mutate(c.id) }}><Archive fontSize="small" /></IconButton></Tooltip>
                  </Box>
                </Paper>
              </Grid>
            )
          })}
        </Grid>
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Curso ${dlg.r.codigo}` : 'Nuevo curso'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ modalidad: 'VIRTUAL', nivel: 'BASICO', estado: 'BORRADOR', duracion_horas: '1', puntaje_aprobacion: '70', es_obligatorio: false }}
          onGuardar={async d => {
            const cuerpo = { ...d, duracion_horas: d.duracion_horas ?? 0, puntaje_aprobacion: d.puntaje_aprobacion ?? 70 }
            const r = dlg.r ? await lmsApi.editarCurso(dlg.r.id, cuerpo) : await lmsApi.crearCurso(cuerpo)
            toast.success(dlg.r ? 'Curso actualizado' : 'Curso creado: ahora agrégale módulos y contenidos'); refrescar()
            if (!dlg.r) nav(`/lms/curso/${r.id}`)
          }}
          onCerrar={() => setDlg({ abierto: false, r: null })} />
        <Dialog open={!!masiva} onClose={() => setMasiva(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Inscribir en {masiva?.nombre}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', my: 1 }}>
              {cargos.map(cg => <Chip key={cg} label={`Todo el cargo: ${cg}`} onClick={() => setElegidos([...new Map([...elegidos, ...personas.filter(p => p.cargo === cg)].map(p => [p.id, p])).values()])} />)}
            </Box>
            <Autocomplete multiple disableCloseOnSelect options={personas} value={elegidos} onChange={(_, v) => setElegidos(v)}
              getOptionLabel={p => `${p.nombre}${p.cargo ? ` · ${p.cargo}` : ''}`} isOptionEqualToValue={(a, b) => a.id === b.id}
              renderOption={(props, p, { selected }) => <li {...props}><Checkbox size="small" checked={selected} />{p.nombre}{p.cargo ? ` · ${p.cargo}` : ''}</li>}
              renderInput={p => <TextField {...p} label="Personas" size="small" />} />
          </DialogContent>
          <DialogActions><Button onClick={() => setMasiva(null)}>Cancelar</Button><Button variant="contained" disabled={!elegidos.length || inscribir.isPending} onClick={() => inscribir.mutate()} sx={{ bgcolor: LMS_COLOR }}>Inscribir {elegidos.length || ''}</Button></DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
