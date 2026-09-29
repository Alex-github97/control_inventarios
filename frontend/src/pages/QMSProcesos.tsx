/**
 * QMS · Mapa de procesos
 *
 * Era una maqueta: el mapa, la lista y los procedimientos salían de constantes
 * y «Nuevo proceso» cerraba el diálogo sin guardar. El servidor ya tenía el
 * CRUD de procesos y de procedimientos.
 *
 * El mapa no se guarda en ninguna parte: es la lista de procesos agrupada por
 * su tipo. Así un proceso nuevo aparece en su franja sin que nadie lo acomode.
 */
import React, { useState } from 'react'
import {
  Box, Typography, Chip, Button, Tab, Tabs, Table, TableBody, TableCell,
  TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, alpha, IconButton, Tooltip,
  LinearProgress, Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { DeviceHub, Add, Edit, DeleteForever } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { qmsApi, nombreDeUsuario, type Proceso, type Procedimiento } from '@/api/qms'

import { COLOR_MODULO } from '@/config/marca'
const QMS_COLOR = COLOR_MODULO

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

// Enums de la base.
const TIPOS = ['ESTRATEGICO', 'MISIONAL', 'APOYO', 'EVALUACION']
const ESTADOS_PROCESO = ['ACTIVO', 'REVISION', 'INACTIVO']
const ESTADOS_PROC = ['vigente', 'en_revision', 'obsoleto']

const TIPO_COLORS: Record<string, string> = {
  ESTRATEGICO: '#7C3AED', MISIONAL: QMS_COLOR, APOYO: '#6B7280', EVALUACION: '#D97706',
}
const TIPO_TITULO: Record<string, string> = {
  ESTRATEGICO: 'Procesos estratégicos', MISIONAL: 'Procesos misionales',
  APOYO: 'Procesos de apoyo', EVALUACION: 'Procesos de evaluación',
}

const errorDe = (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar')
const soloFecha = (v?: string | null) => (v ? v.slice(0, 10) : '—')
const numOVacio = (v: string) => (v.trim() === '' ? null : Number(v))

const PROCESO_VACIO = {
  codigo: '', nombre: '', tipo: 'MISIONAL', estado: 'ACTIVO', descripcion: '',
  objetivo: '', alcance: '', norma_iso: '', responsable_id: '', padre_id: '',
}
const PROC_VACIO = {
  codigo: '', nombre: '', descripcion: '', proceso_id: '', tipo: '',
  version: '1.0', estado: 'vigente', responsable_id: '', fecha_vigencia: '',
}

export default function QMSProcesos() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [dlgProceso, setDlgProceso] = useState<{ abierto: boolean; item: Proceso | null }>({ abierto: false, item: null })
  const [dlgProc, setDlgProc] = useState<{ abierto: boolean; item: Procedimiento | null }>({ abierto: false, item: null })
  const [fp, setFp] = useState({ ...PROCESO_VACIO })
  const [fd, setFd] = useState({ ...PROC_VACIO })

  const { data: procesos = [], isLoading } = useQuery({
    queryKey: ['qms-procesos'], queryFn: () => qmsApi.procesos(),
  })
  const { data: procedimientos = [], isLoading: cargandoProc } = useQuery({
    queryKey: ['qms-procedimientos'], queryFn: () => qmsApi.procedimientos(),
  })
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-min'], queryFn: qmsApi.usuarios, retry: false,
  })

  const nombreProceso = (id?: number | null) => procesos.find(p => p.id === id)?.nombre ?? '—'
  const nombreUsuario = (id?: number | null) =>
    id == null ? '—' : nombreDeUsuario(usuarios.find(u => u.id === id))

  const abrirProceso = (item: Proceso | null) => {
    setFp(item ? {
      codigo: item.codigo ?? '', nombre: item.nombre, tipo: item.tipo, estado: item.estado,
      descripcion: item.descripcion ?? '', objetivo: item.objetivo ?? '',
      alcance: item.alcance ?? '', norma_iso: item.norma_iso ?? '',
      responsable_id: item.responsable_id != null ? String(item.responsable_id) : '',
      padre_id: item.padre_id != null ? String(item.padre_id) : '',
    } : { ...PROCESO_VACIO })
    setDlgProceso({ abierto: true, item })
  }
  const abrirProc = (item: Procedimiento | null) => {
    setFd(item ? {
      codigo: item.codigo ?? '', nombre: item.nombre, descripcion: item.descripcion ?? '',
      proceso_id: item.proceso_id != null ? String(item.proceso_id) : '',
      tipo: item.tipo ?? '', version: item.version, estado: item.estado,
      responsable_id: item.responsable_id != null ? String(item.responsable_id) : '',
      fecha_vigencia: item.fecha_vigencia ? item.fecha_vigencia.slice(0, 10) : '',
    } : { ...PROC_VACIO })
    setDlgProc({ abierto: true, item })
  }

  const guardarProceso = useMutation({
    mutationFn: () => {
      const cuerpo: Partial<Proceso> = {
        codigo: fp.codigo.trim() || null, nombre: fp.nombre.trim(), tipo: fp.tipo,
        estado: fp.estado, descripcion: fp.descripcion.trim() || null,
        objetivo: fp.objetivo.trim() || null, alcance: fp.alcance.trim() || null,
        norma_iso: fp.norma_iso.trim() || null,
        responsable_id: numOVacio(fp.responsable_id), padre_id: numOVacio(fp.padre_id),
      }
      return dlgProceso.item
        ? qmsApi.editarProceso(dlgProceso.item.id, cuerpo)
        : qmsApi.crearProceso(cuerpo)
    },
    onSuccess: () => {
      toast.success(dlgProceso.item ? 'Proceso actualizado' : 'Proceso creado')
      qc.invalidateQueries({ queryKey: ['qms-procesos'] })
      setDlgProceso({ abierto: false, item: null })
    },
    onError: errorDe,
  })
  const borrarProceso = useMutation({
    mutationFn: (id: number) => qmsApi.borrarProceso(id),
    onSuccess: () => { toast.success('Proceso retirado'); qc.invalidateQueries({ queryKey: ['qms-procesos'] }) },
    onError: errorDe,
  })

  const guardarProc = useMutation({
    mutationFn: () => {
      const cuerpo: Partial<Procedimiento> = {
        codigo: fd.codigo.trim() || null, nombre: fd.nombre.trim(),
        descripcion: fd.descripcion.trim() || null, proceso_id: numOVacio(fd.proceso_id),
        tipo: fd.tipo.trim() || null, version: fd.version.trim() || '1.0', estado: fd.estado,
        responsable_id: numOVacio(fd.responsable_id),
        fecha_vigencia: fd.fecha_vigencia ? `${fd.fecha_vigencia}T00:00:00` : null,
      }
      return dlgProc.item
        ? qmsApi.editarProcedimiento(dlgProc.item.id, cuerpo)
        : qmsApi.crearProcedimiento(cuerpo)
    },
    onSuccess: () => {
      toast.success(dlgProc.item ? 'Procedimiento actualizado' : 'Procedimiento creado')
      qc.invalidateQueries({ queryKey: ['qms-procedimientos'] })
      setDlgProc({ abierto: false, item: null })
    },
    onError: errorDe,
  })
  const borrarProc = useMutation({
    mutationFn: (id: number) => qmsApi.borrarProcedimiento(id),
    onSuccess: () => { toast.success('Procedimiento eliminado'); qc.invalidateQueries({ queryKey: ['qms-procedimientos'] }) },
    onError: errorDe,
  })

  const encabezado = { '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }
  const fila = { '& td': { borderColor: '#E5E7EB', color: 'text.primary', fontSize: 12.5 } }
  const campo = (f: typeof fp, set: typeof setFp) => (k: keyof typeof fp) => ({
    value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ ...f, [k]: e.target.value }),
  })
  const cp = campo(fp, setFp)
  const cd = (k: keyof typeof fd) => ({
    value: fd[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFd({ ...fd, [k]: e.target.value }),
  })
  const selectorUsuario = (props: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <TextField select label="Responsable" fullWidth size="small" {...props}>
      <MenuItem value=""><em>Sin asignar</em></MenuItem>
      {usuarios.map(u => <MenuItem key={u.id} value={String(u.id)}>{nombreDeUsuario(u)}</MenuItem>)}
    </TextField>
  )

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DeviceHub sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Mapa de Procesos</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>QMS · Arquitectura de procesos organizacional</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained"
            onClick={() => (tab === 2 ? abrirProc(null) : abrirProceso(null))}
            sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            {tab === 2 ? 'Nuevo Procedimiento' : 'Nuevo Proceso'}
          </Button>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #E5E7EB', '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="Mapa Visual" />
          <Tab label={`Lista de Procesos (${procesos.length})`} />
          <Tab label={`Procedimientos (${procedimientos.length})`} />
        </Tabs>

        {(isLoading || cargandoProc) && <LinearProgress sx={{ mb: 2 }} />}

        <TabPanel value={tab} index={0}>
          {!isLoading && procesos.length === 0 && (
            <Alert severity="info">Todavía no hay procesos. Crea el primero con «Nuevo Proceso» y aparecerá en su franja del mapa.</Alert>
          )}
          {TIPOS.map(tipo => {
            const items = procesos.filter(p => p.tipo === tipo)
            if (!items.length) return null
            const color = TIPO_COLORS[tipo]
            return (
              <Box key={tipo} sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>{TIPO_TITULO[tipo]}</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {items.map(p => (
                    <Box key={p.id} role="button" aria-label={`Editar ${p.nombre}`} onClick={() => abrirProceso(p)}
                      sx={{ px: 2, py: 1.5, borderRadius: 2, border: `1px solid ${alpha(color, 0.3)}`, bgcolor: alpha(color, 0.07), minWidth: 160, cursor: 'pointer', '&:hover': { bgcolor: alpha(color, 0.13) } }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.primary' }}>{p.nombre}</Typography>
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25 }}>
                        {p.codigo ? `${p.codigo} · ` : ''}{p.estado === 'ACTIVO' ? 'Proceso activo' : p.estado === 'REVISION' ? 'En revisión' : 'Inactivo'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )
          })}
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={encabezado}>
                  <TableCell>Código</TableCell><TableCell>Nombre</TableCell><TableCell>Tipo</TableCell><TableCell>Responsable</TableCell><TableCell>Norma</TableCell><TableCell>Estado</TableCell><TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {procesos.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>Sin procesos registrados</TableCell></TableRow>
                )}
                {procesos.map(p => (
                  <TableRow key={p.id} sx={fila}>
                    <TableCell><Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: QMS_COLOR }}>{p.codigo || '—'}</Typography></TableCell>
                    <TableCell>{p.nombre}</TableCell>
                    <TableCell><Chip label={p.tipo} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(TIPO_COLORS[p.tipo] ?? '#6B7280', 0.15), color: TIPO_COLORS[p.tipo] ?? '#6B7280' }} /></TableCell>
                    <TableCell>{nombreUsuario(p.responsable_id)}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{p.norma_iso || '—'}</TableCell>
                    <TableCell><Chip label={p.estado} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(p.estado === 'ACTIVO' ? QMS_COLOR : '#D97706', 0.15), color: p.estado === 'ACTIVO' ? QMS_COLOR : '#D97706' }} /></TableCell>
                    <TableCell>
                      <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${p.nombre}`} onClick={() => abrirProceso(p)}><Edit sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                      <Tooltip title="Retirar del mapa"><IconButton size="small" aria-label={`Retirar ${p.nombre}`}
                        onClick={() => { if (window.confirm(`¿Retirar el proceso «${p.nombre}»?`)) borrarProceso.mutate(p.id) }}>
                        <DeleteForever sx={{ fontSize: 15, color: '#DC2626' }} /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={encabezado}>
                  <TableCell>Código</TableCell><TableCell>Nombre</TableCell><TableCell>Proceso</TableCell><TableCell>Versión</TableCell><TableCell>Estado</TableCell><TableCell>Vigencia</TableCell><TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {procedimientos.length === 0 && !cargandoProc && (
                  <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>Sin procedimientos registrados</TableCell></TableRow>
                )}
                {procedimientos.map(p => (
                  <TableRow key={p.id} sx={fila}>
                    <TableCell><Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: QMS_COLOR }}>{p.codigo || '—'}</Typography></TableCell>
                    <TableCell>{p.nombre}</TableCell>
                    <TableCell>{nombreProceso(p.proceso_id)}</TableCell>
                    <TableCell>v{p.version}</TableCell>
                    <TableCell><Chip label={p.estado.replace('_', ' ')} size="small" sx={{ fontSize: 10, height: 20, bgcolor: p.estado === 'vigente' ? alpha(QMS_COLOR, 0.15) : alpha('#D97706', 0.15), color: p.estado === 'vigente' ? QMS_COLOR : '#D97706' }} /></TableCell>
                    <TableCell>{soloFecha(p.fecha_vigencia)}</TableCell>
                    <TableCell>
                      <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${p.nombre}`} onClick={() => abrirProc(p)}><Edit sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                      <Tooltip title="Eliminar"><IconButton size="small" aria-label={`Eliminar ${p.nombre}`}
                        onClick={() => { if (window.confirm(`¿Eliminar el procedimiento «${p.nombre}»?`)) borrarProc.mutate(p.id) }}>
                        <DeleteForever sx={{ fontSize: 15, color: '#DC2626' }} /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <Dialog open={dlgProceso.abierto} onClose={() => setDlgProceso({ abierto: false, item: null })} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{dlgProceso.item ? 'Editar Proceso' : 'Nuevo Proceso'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField label="Código" placeholder="PE-004" fullWidth size="small" {...cp('codigo')} /></Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField label="Nombre del proceso" required fullWidth size="small" {...cp('nombre')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Tipo de proceso" fullWidth size="small" {...cp('tipo')}>
                  {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Estado" fullWidth size="small" {...cp('estado')}>
                  {ESTADOS_PROCESO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>{selectorUsuario(cp('responsable_id'))}</Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Norma ISO aplicable" placeholder="ISO 9001:2015" fullWidth size="small" {...cp('norma_iso')} /></Grid>
              <Grid size={{ xs: 12 }}>
                <TextField select label="Proceso padre" fullWidth size="small" {...cp('padre_id')}>
                  <MenuItem value=""><em>Ninguno</em></MenuItem>
                  {procesos.filter(p => p.id !== dlgProceso.item?.id).map(p => <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}><TextField label="Objetivo" fullWidth size="small" multiline minRows={2} {...cp('objetivo')} /></Grid>
              <Grid size={{ xs: 12 }}><TextField label="Alcance" fullWidth size="small" multiline minRows={2} {...cp('alcance')} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDlgProceso({ abierto: false, item: null })} color="inherit">Cancelar</Button>
            <Button variant="contained" disabled={!fp.nombre.trim() || guardarProceso.isPending}
              onClick={() => guardarProceso.mutate()} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>Guardar</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={dlgProc.abierto} onClose={() => setDlgProc({ abierto: false, item: null })} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{dlgProc.item ? 'Editar Procedimiento' : 'Nuevo Procedimiento'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField label="Código" placeholder="PRO-001" fullWidth size="small" {...cd('codigo')} /></Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField label="Nombre" required fullWidth size="small" {...cd('nombre')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Proceso" fullWidth size="small" {...cd('proceso_id')}>
                  <MenuItem value=""><em>Sin proceso</em></MenuItem>
                  {procesos.map(p => <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Tipo" placeholder="Procedimiento, instructivo, formato…" fullWidth size="small" {...cd('tipo')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Versión" fullWidth size="small" {...cd('version')} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField select label="Estado" fullWidth size="small" {...cd('estado')}>
                  {ESTADOS_PROC.map(t => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}><TextField label="Vigente hasta" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} {...cd('fecha_vigencia')} /></Grid>
              <Grid size={{ xs: 12 }}>{selectorUsuario(cd('responsable_id'))}</Grid>
              <Grid size={{ xs: 12 }}><TextField label="Descripción" fullWidth size="small" multiline minRows={2} {...cd('descripcion')} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDlgProc({ abierto: false, item: null })} color="inherit">Cancelar</Button>
            <Button variant="contained" disabled={!fd.nombre.trim() || guardarProc.isPending}
              onClick={() => guardarProc.mutate()} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
