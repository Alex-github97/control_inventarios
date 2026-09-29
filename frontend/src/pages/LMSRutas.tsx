/**
 * LMS · Rutas de aprendizaje
 *
 * Era una maqueta. Ahora una ruta es una secuencia de cursos reales pensada
 * para un cargo; su duración es la suma de sus cursos (se calcula) y las
 * rutas del cargo de cada persona entran en sus recomendaciones.
 */
import { useState } from 'react'
import { Box, Typography, Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete, IconButton, Tooltip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { AltRoute, Edit, DeleteForever, ArrowForward } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { lmsApi, type Ruta, type Curso } from '@/api/lms'
import { Encabezado, errorApi } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
type Form = { nombre: string; descripcion: string; cargo_objetivo: string; area_objetivo: string; cursos: Curso[] }
const VACIO: Form = { nombre: '', descripcion: '', cargo_objetivo: '', area_objetivo: '', cursos: [] }

export default function LMSRutas() {
  const qc = useQueryClient()
  const { data: rutas = [], isLoading } = useQuery({ queryKey: ['lms-rutas'], queryFn: lmsApi.rutas.listar })
  const { data: cursos = [] } = useQuery({ queryKey: ['lms-catalogo'], queryFn: lmsApi.catalogo })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Ruta | null }>({ abierto: false, r: null })
  const [f, setF] = useState<Form>(VACIO)
  const refrescar = () => qc.invalidateQueries({ queryKey: ['lms-rutas'] })
  const abrir = (r: Ruta | null) => {
    setF(r ? { nombre: r.nombre, descripcion: r.descripcion ?? '', cargo_objetivo: r.cargo_objetivo ?? '', area_objetivo: r.area_objetivo ?? '',
      cursos: r.cursos.map(c => cursos.find(x => x.id === c.id)).filter(Boolean) as Curso[] } : VACIO)
    setDlg({ abierto: true, r })
  }
  const guardar = useMutation({
    mutationFn: () => {
      const d = { nombre: f.nombre.trim(), descripcion: f.descripcion.trim() || null, cargo_objetivo: f.cargo_objetivo.trim() || null, area_objetivo: f.area_objetivo.trim() || null, curso_ids: f.cursos.map(c => c.id) }
      return dlg.r ? lmsApi.rutas.editar(dlg.r.id, d) : lmsApi.rutas.crear(d)
    },
    onSuccess: () => { toast.success('Ruta guardada'); refrescar(); setDlg({ abierto: false, r: null }) },
    onError: (e: any) => toast.error(errorApi(e)),
  })
  const retirar = useMutation({ mutationFn: (id: number) => lmsApi.rutas.retirar(id), onSuccess: () => { toast.success('Ruta retirada'); refrescar() } })

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<AltRoute sx={{ fontSize: 28 }} />} titulo="Rutas de aprendizaje" subtitulo="LMS · Secuencias de cursos por cargo" color={LMS_COLOR} accion="Nueva ruta" onAccion={() => abrir(null)} />
        {!isLoading && rutas.length === 0 && <Typography color="text.secondary">Sin rutas. Crea una eligiendo los cursos en el orden en que deben tomarse.</Typography>}
        <Grid container spacing={2}>
          {rutas.map(r => (
            <Grid key={r.id} size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box><Typography fontSize={12} color="text.secondary">{r.codigo}{r.cargo_objetivo ? ` · para ${r.cargo_objetivo}` : ''}</Typography><Typography fontWeight={800}>{r.nombre}</Typography></Box>
                  <Box>
                    <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${r.nombre}`} onClick={() => abrir(r)}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Retirar"><IconButton size="small" aria-label={`Retirar ${r.nombre}`} onClick={() => { if (window.confirm(`¿Retirar la ruta «${r.nombre}»?`)) retirar.mutate(r.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                  </Box>
                </Box>
                {r.descripcion && <Typography fontSize={13} color="text.secondary">{r.descripcion}</Typography>}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
                  {r.cursos.map((c, i) => (<Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{i > 0 && <ArrowForward sx={{ fontSize: 14, color: 'text.disabled' }} />}<Chip size="small" label={`${i + 1}. ${c.nombre}`} variant={c.estado === 'PUBLICADO' ? 'filled' : 'outlined'} /></Box>))}
                  {r.cursos.length === 0 && <Typography fontSize={12} color="text.secondary">Sin cursos</Typography>}
                </Box>
                <Typography fontSize={12} color="text.secondary" mt={1}>{r.cursos.length} cursos · {r.duracion_total_horas} horas</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, r: null })} maxWidth="sm" fullWidth>
          <DialogTitle>{dlg.r ? dlg.r.nombre : 'Nueva ruta'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12 }}><TextField label="Nombre" required fullWidth size="small" value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Cargo objetivo" fullWidth size="small" value={f.cargo_objetivo} onChange={e => setF({ ...f, cargo_objetivo: e.target.value })} helperText="Igual al cargo de los usuarios" /></Grid>
              <Grid size={{ xs: 6 }}><TextField label="Área" fullWidth size="small" value={f.area_objetivo} onChange={e => setF({ ...f, area_objetivo: e.target.value })} /></Grid>
              <Grid size={{ xs: 12 }}>
                <Autocomplete multiple options={cursos} value={f.cursos} onChange={(_, v) => setF({ ...f, cursos: v })} getOptionLabel={c => `${c.codigo} · ${c.nombre}`} isOptionEqualToValue={(a, b) => a.id === b.id}
                  renderInput={p => <TextField {...p} label="Cursos, en orden" size="small" helperText={`${f.cursos.reduce((s, c) => s + c.duracion_horas, 0)} horas en total`} />} />
              </Grid>
              <Grid size={{ xs: 12 }}><TextField label="Descripción" fullWidth size="small" multiline minRows={2} value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setDlg({ abierto: false, r: null })}>Cancelar</Button><Button variant="contained" disabled={!f.nombre.trim() || guardar.isPending} onClick={() => guardar.mutate()} sx={{ bgcolor: LMS_COLOR }}>Guardar</Button></DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
