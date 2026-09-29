/**
 * QMS · Gestión de auditorías
 *
 * Era una maqueta: seis auditorías, cinco hallazgos y un programa anual
 * escritos a mano, y «Guardar» cerraba el diálogo sin enviar nada.
 *
 * Nada de lo que la maqueta traía como número se guarda: las cifras de arriba,
 * la cantidad de hallazgos de cada auditoría y las barras del programa se
 * calculan de las auditorías y los hallazgos reales. Un contador guardado al
 * lado se habría desviado con el primer hallazgo cerrado.
 */
import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  alpha, IconButton, Tooltip, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { FactCheck, Add, Edit, DeleteForever, ChevronLeft, ChevronRight } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { qmsApi, nombreDeUsuario, type Auditoria } from '@/api/qms'

import { COLOR_MODULO } from '@/config/marca'
const QMS_COLOR = COLOR_MODULO

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

// Enums de la base.
const TIPOS = ['INTERNA', 'EXTERNA', 'CLIENTE', 'CERTIFICACION', 'PROVEEDOR']
const ESTADOS = ['PLANIFICADA', 'EN_EJECUCION', 'COMPLETADA', 'CANCELADA']
const RESULTADOS = ['aprobado', 'condicionado', 'rechazado']
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const TIPO_COLOR: Record<string, string> = { INTERNA: '#0369A1', EXTERNA: '#D97706', CLIENTE: QMS_COLOR, CERTIFICACION: '#DC2626', PROVEEDOR: '#7C3AED' }
const EST_COLOR: Record<string, string> = { PLANIFICADA: '#0369A1', EN_EJECUCION: '#D97706', COMPLETADA: QMS_COLOR, CANCELADA: '#6B7280' }
const RES_COLOR: Record<string, string> = { aprobado: QMS_COLOR, condicionado: '#D97706', rechazado: '#DC2626' }
const HAL_TIPO_COLOR: Record<string, string> = { no_conformidad: '#DC2626', observacion: '#D97706', oportunidad_mejora: QMS_COLOR }
const HAL_TIPO_CORTO: Record<string, string> = { no_conformidad: 'NC', observacion: 'OBS', oportunidad_mejora: 'OM' }
const IMPACTO_COLOR: Record<string, string> = { alto: '#DC2626', medio: '#D97706', bajo: QMS_COLOR }

const errorDe = (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar')
const soloFecha = (v?: string | null) => (v ? v.slice(0, 10) : '—')
const aFecha = (v: string) => (v ? `${v}T00:00:00` : null)

const VACIO = {
  nombre: '', tipo: 'INTERNA', estado: 'PLANIFICADA', norma: '', empresa_auditora: '',
  auditor_lider_id: '', fecha_inicio_plan: '', fecha_fin_plan: '',
  fecha_inicio_real: '', fecha_fin_real: '', objetivo: '', alcance: '',
  conclusion: '', resultado: '',
}

export default function QMSAuditorias() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [dlg, setDlg] = useState<{ abierto: boolean; item: Auditoria | null }>({ abierto: false, item: null })
  const [f, setF] = useState({ ...VACIO })

  const { data: auditorias = [], isLoading } = useQuery({
    queryKey: ['qms-auditorias'], queryFn: () => qmsApi.auditorias(),
  })
  const { data: hallazgos = [] } = useQuery({
    queryKey: ['qms-hallazgos'], queryFn: () => qmsApi.hallazgos(),
  })
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-min'], queryFn: qmsApi.usuarios, retry: false,
  })

  const nombreUsuario = (id?: number | null) =>
    id == null ? '—' : nombreDeUsuario(usuarios.find(u => u.id === id))
  const codigoAuditoria = (id?: number | null) =>
    auditorias.find(a => a.id === id)?.codigo ?? '—'

  const hallazgosPorAuditoria = useMemo(() => {
    const m = new Map<number, number>()
    for (const h of hallazgos) if (h.auditoria_id != null) m.set(h.auditoria_id, (m.get(h.auditoria_id) ?? 0) + 1)
    return m
  }, [hallazgos])

  const anioActual = new Date().getFullYear()
  const kpis = [
    { label: 'Planificadas', value: auditorias.filter(a => a.estado === 'PLANIFICADA').length, color: '#0369A1' },
    { label: 'En Ejecución', value: auditorias.filter(a => a.estado === 'EN_EJECUCION').length, color: '#D97706' },
    {
      label: `Completadas (${anioActual})`, color: QMS_COLOR,
      value: auditorias.filter(a => a.estado === 'COMPLETADA'
        && (a.fecha_fin_real ?? a.fecha_fin_plan ?? '').startsWith(String(anioActual))).length,
    },
    { label: 'Hallazgos Abiertos', value: hallazgos.filter(h => h.estado !== 'CERRADO').length, color: '#DC2626' },
  ]

  // El programa del año: una barra por auditoría con fecha planificada en él.
  const programa = auditorias
    .filter(a => a.fecha_inicio_plan && a.estado !== 'CANCELADA')
    .map(a => {
      const ini = new Date(a.fecha_inicio_plan!)
      const fin = a.fecha_fin_plan ? new Date(a.fecha_fin_plan) : ini
      return { a, ini, fin: fin < ini ? ini : fin }
    })
    .filter(({ ini, fin }) => ini.getFullYear() <= anio && fin.getFullYear() >= anio)
    .sort((x, y) => x.ini.getTime() - y.ini.getTime())
  const posicionEnAnio = (d: Date) => {
    if (d.getFullYear() < anio) return 0
    if (d.getFullYear() > anio) return 1
    const inicio = new Date(anio, 0, 1).getTime()
    const total = new Date(anio + 1, 0, 1).getTime() - inicio
    return (d.getTime() - inicio) / total
  }

  const abrir = (item: Auditoria | null) => {
    setF(item ? {
      nombre: item.nombre, tipo: item.tipo, estado: item.estado,
      norma: item.norma ?? '', empresa_auditora: item.empresa_auditora ?? '',
      auditor_lider_id: item.auditor_lider_id != null ? String(item.auditor_lider_id) : '',
      fecha_inicio_plan: item.fecha_inicio_plan?.slice(0, 10) ?? '',
      fecha_fin_plan: item.fecha_fin_plan?.slice(0, 10) ?? '',
      fecha_inicio_real: item.fecha_inicio_real?.slice(0, 10) ?? '',
      fecha_fin_real: item.fecha_fin_real?.slice(0, 10) ?? '',
      objetivo: item.objetivo ?? '', alcance: item.alcance ?? '',
      conclusion: item.conclusion ?? '', resultado: item.resultado ?? '',
    } : { ...VACIO })
    setDlg({ abierto: true, item })
  }

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo: Partial<Auditoria> = {
        nombre: f.nombre.trim(), tipo: f.tipo, estado: f.estado,
        norma: f.norma.trim() || null, empresa_auditora: f.empresa_auditora.trim() || null,
        auditor_lider_id: f.auditor_lider_id ? Number(f.auditor_lider_id) : null,
        fecha_inicio_plan: aFecha(f.fecha_inicio_plan), fecha_fin_plan: aFecha(f.fecha_fin_plan),
        fecha_inicio_real: aFecha(f.fecha_inicio_real), fecha_fin_real: aFecha(f.fecha_fin_real),
        objetivo: f.objetivo.trim() || null, alcance: f.alcance.trim() || null,
        conclusion: f.conclusion.trim() || null, resultado: f.resultado || null,
      }
      return dlg.item ? qmsApi.editarAuditoria(dlg.item.id, cuerpo) : qmsApi.crearAuditoria(cuerpo)
    },
    onSuccess: () => {
      toast.success(dlg.item ? 'Auditoría actualizada' : 'Auditoría programada')
      qc.invalidateQueries({ queryKey: ['qms-auditorias'] })
      setDlg({ abierto: false, item: null })
    },
    onError: errorDe,
  })
  const borrar = useMutation({
    mutationFn: (id: number) => qmsApi.borrarAuditoria(id),
    onSuccess: () => { toast.success('Auditoría eliminada'); qc.invalidateQueries({ queryKey: ['qms-auditorias'] }) },
    onError: errorDe,
  })

  const fechasInvertidas = !!(f.fecha_inicio_plan && f.fecha_fin_plan && f.fecha_fin_plan < f.fecha_inicio_plan)
  const c = (k: keyof typeof f) => ({
    value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }),
  })
  const encabezado = { '& th': { borderColor: '#F1F5F9', color: 'text.disabled', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }
  const fila = { '& td': { borderColor: '#F9FAFB', color: 'text.secondary', fontSize: 12 } }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FactCheck sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Gestión de Auditorías</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>QMS · Auditorías internas y externas</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => abrir(null)} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' }, borderRadius: 2 }}>
            Nueva Auditoría
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.disabled', fontSize: 13 }, '& .Mui-selected': { color: QMS_COLOR }, '& .MuiTabs-indicator': { bgcolor: QMS_COLOR } }}>
          <Tab label="Lista de Auditorías" />
          <Tab label="Hallazgos" />
          <Tab label="Programa Anual" />
        </Tabs>

        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        <TabPanel value={tab} index={0}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={encabezado}>
                  <TableCell>Código</TableCell><TableCell>Nombre</TableCell><TableCell>Tipo</TableCell><TableCell>Norma</TableCell><TableCell>Auditor</TableCell><TableCell>Fecha Plan</TableCell><TableCell>Estado</TableCell><TableCell>Resultado</TableCell><TableCell>Hallazgos</TableCell><TableCell>Acc.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditorias.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={10} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>Sin auditorías registradas</TableCell></TableRow>
                )}
                {auditorias.map(a => {
                  const n = hallazgosPorAuditoria.get(a.id) ?? 0
                  const auditor = a.auditor_lider_id != null ? nombreUsuario(a.auditor_lider_id) : (a.empresa_auditora || '—')
                  return (
                    <TableRow key={a.id} sx={fila}>
                      <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>{a.codigo || '—'}</Typography></TableCell>
                      <TableCell sx={{ maxWidth: 220 }}><Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</Typography></TableCell>
                      <TableCell><Chip label={a.tipo} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(TIPO_COLOR[a.tipo] ?? '#6B7280', 0.15), color: TIPO_COLOR[a.tipo] ?? '#6B7280', fontWeight: 700 }} /></TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{a.norma || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{auditor}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{soloFecha(a.fecha_inicio_plan)}</TableCell>
                      <TableCell><Chip label={a.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(EST_COLOR[a.estado] ?? '#6B7280', 0.15), color: EST_COLOR[a.estado] ?? '#6B7280', fontWeight: 700 }} /></TableCell>
                      <TableCell>{a.resultado ? <Chip label={a.resultado} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(RES_COLOR[a.resultado] ?? '#6B7280', 0.15), color: RES_COLOR[a.resultado] ?? '#6B7280', fontWeight: 700 }} /> : <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}><Chip label={n} size="small" sx={{ fontSize: 11, height: 20, bgcolor: n > 0 ? alpha('#DC2626', 0.15) : '#F9FAFB', color: n > 0 ? '#DC2626' : 'text.disabled' }} /></TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${a.nombre}`} onClick={() => abrir(a)}><Edit sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                        <Tooltip title="Eliminar"><IconButton size="small" aria-label={`Eliminar ${a.nombre}`}
                          onClick={() => { if (window.confirm(`¿Eliminar la auditoría «${a.nombre}»?`)) borrar.mutate(a.id) }}>
                          <DeleteForever sx={{ fontSize: 14, color: '#DC2626' }} /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Paper sx={{ bgcolor: 'transparent' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={encabezado}>
                  <TableCell>Código</TableCell><TableCell>Descripción</TableCell><TableCell>Tipo</TableCell><TableCell>Auditoría</TableCell><TableCell>Impacto</TableCell><TableCell>Responsable</TableCell><TableCell>Fecha Límite</TableCell><TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {hallazgos.length === 0 && (
                  <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>Sin hallazgos. Se registran desde la pantalla de Hallazgos.</TableCell></TableRow>
                )}
                {hallazgos.map(h => {
                  const tc = HAL_TIPO_COLOR[h.tipo ?? ''] ?? '#6B7280'
                  const ic = IMPACTO_COLOR[h.impacto ?? ''] ?? '#6B7280'
                  const ec = h.estado === 'CERRADO' ? QMS_COLOR : h.estado === 'VERIFICACION' ? '#0369A1' : h.estado === 'EN_TRATAMIENTO' ? '#D97706' : '#DC2626'
                  return (
                    <TableRow key={h.id} sx={fila}>
                      <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: QMS_COLOR }}>{h.codigo || '—'}</Typography></TableCell>
                      <TableCell sx={{ maxWidth: 240 }}><Typography sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.descripcion}</Typography></TableCell>
                      <TableCell>{h.tipo ? <Chip label={HAL_TIPO_CORTO[h.tipo] ?? h.tipo} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(tc, 0.15), color: tc, fontWeight: 700 }} /> : '—'}</TableCell>
                      <TableCell sx={{ fontSize: 11, color: '#D97706' }}>{codigoAuditoria(h.auditoria_id)}</TableCell>
                      <TableCell>{h.impacto ? <Chip label={h.impacto} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(ic, 0.15), color: ic, fontWeight: 700 }} /> : '—'}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{nombreUsuario(h.responsable_id)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{soloFecha(h.fecha_limite)}</TableCell>
                      <TableCell><Chip label={h.estado.replace('_', ' ')} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(ec, 0.15), color: ec, fontWeight: 700 }} /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', flex: 1 }}>Programa de Auditorías {anio}</Typography>
                <IconButton size="small" aria-label="Año anterior" onClick={() => setAnio(anio - 1)}><ChevronLeft /></IconButton>
                <IconButton size="small" aria-label="Año siguiente" onClick={() => setAnio(anio + 1)}><ChevronRight /></IconButton>
              </Box>
              {programa.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No hay auditorías con fecha planificada en {anio}.</Typography>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Box sx={{ minWidth: 700 }}>
                    <Box sx={{ display: 'flex', mb: 1, ml: '180px' }}>
                      {MESES.map(m => (
                        <Box key={m} sx={{ flex: 1, textAlign: 'center' }}><Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 700 }}>{m}</Typography></Box>
                      ))}
                    </Box>
                    {programa.map(({ a, ini, fin }) => {
                      const izq = posicionEnAnio(ini)
                      // Una auditoría de un día sigue siendo visible.
                      const ancho = Math.max(posicionEnAnio(new Date(fin.getTime() + 86400000)) - izq, 0.006)
                      const color = TIPO_COLOR[a.tipo] ?? '#6B7280'
                      return (
                        <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', mb: 1, height: 28 }}>
                          <Tooltip title={a.nombre}>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', width: 172, flexShrink: 0, mr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.codigo} {a.nombre}
                            </Typography>
                          </Tooltip>
                          <Box sx={{ flex: 1, display: 'flex', position: 'relative', height: '100%' }}>
                            {MESES.map((m, i) => (
                              <Box key={m} sx={{ flex: 1, height: '100%', bgcolor: i % 2 === 0 ? '#F9FAFB' : 'transparent', borderLeft: '1px solid #F1F5F9' }} />
                            ))}
                            <Tooltip title={`${soloFecha(a.fecha_inicio_plan)} → ${soloFecha(a.fecha_fin_plan ?? a.fecha_inicio_plan)} · ${a.estado}`}>
                              <Box sx={{ position: 'absolute', left: `${izq * 100}%`, width: `${ancho * 100}%`, top: 4, height: 20, bgcolor: alpha(color, a.estado === 'COMPLETADA' ? 0.45 : 0.85), borderRadius: 1 }} />
                            </Tooltip>
                          </Box>
                        </Box>
                      )
                    })}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {dlg.item ? `Editar Auditoría ${dlg.item.codigo ?? ''}` : 'Nueva Auditoría'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12 }}><TextField label="Nombre" required fullWidth size="small" {...c('nombre')}
                helperText={dlg.item ? undefined : 'El código AUD-AAAA-NNN lo asigna el sistema'} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Tipo" fullWidth size="small" {...c('tipo')}>
                  {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Estado" fullWidth size="small" {...c('estado')}>
                  {ESTADOS.map(t => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField label="Norma" placeholder="ISO 9001:2015" fullWidth size="small" {...c('norma')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Auditor líder" fullWidth size="small" {...c('auditor_lider_id')}>
                  <MenuItem value=""><em>Externo / sin asignar</em></MenuItem>
                  {usuarios.map(u => <MenuItem key={u.id} value={String(u.id)}>{nombreDeUsuario(u)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Empresa auditora" fullWidth size="small" {...c('empresa_auditora')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Inicio plan" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} {...c('fecha_inicio_plan')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Fin plan" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} {...c('fecha_fin_plan')}
                error={fechasInvertidas} helperText={fechasInvertidas ? 'Antes del inicio' : undefined} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Inicio real" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} {...c('fecha_inicio_real')} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><TextField label="Fin real" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} {...c('fecha_fin_real')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Objetivo" fullWidth size="small" multiline minRows={2} {...c('objetivo')} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Alcance" fullWidth size="small" multiline minRows={2} {...c('alcance')} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Resultado" fullWidth size="small" {...c('resultado')}>
                  <MenuItem value=""><em>Sin resultado</em></MenuItem>
                  {RESULTADOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField label="Conclusión" fullWidth size="small" multiline minRows={2} {...c('conclusion')} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDlg({ abierto: false, item: null })} color="inherit">Cancelar</Button>
            <Button variant="contained" disabled={!f.nombre.trim() || fechasInvertidas || guardar.isPending}
              onClick={() => guardar.mutate()} sx={{ bgcolor: QMS_COLOR, '&:hover': { bgcolor: '#047857' } }}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
