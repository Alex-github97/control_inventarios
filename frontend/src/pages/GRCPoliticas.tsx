/**
 * GRC · Repositorio de políticas
 *
 * Era una maqueta: siete políticas fijas, un historial de versiones inventado y
 * una lista de personas que habían aceptado. El backend ya tenía el CRUD.
 *
 * Lo que la base sí guarda de aceptaciones es si la política las exige y
 * cuántas van; no hay tabla de quién aceptó ni de versiones anteriores, así que
 * esas dos vistas dicen lo que hay en vez de mostrar nombres inventados.
 */
import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, IconButton, Divider, Alert, LinearProgress, FormControlLabel, Switch,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Policy, Add, CheckCircle, Warning, Schedule, HistoryEdu,
  Edit, Delete, Close, HowToReg,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { SelectorCatalogo } from '@/components/catalogo/SelectorCatalogo'
import { SelectorResponsable } from '@/components/catalogo/SelectorResponsable'

const GRC_COLOR = '#6D28D9'
const LBL = alpha(GRC_COLOR, 0.85)
const PAGE_BG = '#F0F2F5'

/** Los valores del enum de la base van en minúscula. */
const ESTADOS = [
  { valor: 'borrador', label: 'Borrador', color: '#D97706' },
  { valor: 'en_revision', label: 'En revisión', color: '#0891B2' },
  { valor: 'aprobada', label: 'Aprobada', color: '#2563EB' },
  { valor: 'publicada', label: 'Publicada', color: '#059669' },
  { valor: 'vencida', label: 'Vencida', color: '#DC2626' },
  { valor: 'archivada', label: 'Archivada', color: '#6B7280' },
]
const estadoLabel = (v?: string | null) =>
  ESTADOS.find(e => e.valor === v)?.label ?? (v ?? '—')
const estadoColor = (v?: string | null) =>
  ESTADOS.find(e => e.valor === v)?.color ?? GRC_COLOR

interface Politica {
  id: number
  codigo?: string | null
  nombre: string
  tipo?: string | null
  version?: string | null
  estado?: string | null
  propietario?: string | null
  aprobador?: string | null
  fecha_aprobacion?: string | null
  fecha_vigencia?: string | null
  fecha_revision?: string | null
  periodicidad_revision?: string | null
  alcance?: string | null
  descripcion?: string | null
  aceptaciones_requeridas?: boolean
  aceptaciones_count?: number
}

const VACIO = {
  nombre: '', tipo: '', version: '1.0', estado: 'borrador',
  propietario: '', aprobador: '', fecha_aprobacion: '', fecha_vigencia: '',
  fecha_revision: '', periodicidad_revision: '', alcance: '', descripcion: '',
  aceptaciones_requeridas: false,
}

export default function GRCPoliticas() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [selId, setSelId] = useState<number | null>(null)
  const [panelTab, setPanelTab] = useState(0)
  const [dlg, setDlg] = useState<{ abierto: boolean; item: Politica | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState({ ...VACIO })
  const [wasOpen, setWasOpen] = useState(false)

  if (dlg.abierto && !wasOpen) {
    setWasOpen(true)
    const it = dlg.item
    setForm(it ? {
      nombre: it.nombre, tipo: it.tipo ?? '', version: it.version ?? '1.0',
      estado: it.estado ?? 'borrador', propietario: it.propietario ?? '',
      aprobador: it.aprobador ?? '',
      fecha_aprobacion: it.fecha_aprobacion ?? '',
      fecha_vigencia: it.fecha_vigencia ?? '',
      fecha_revision: it.fecha_revision ?? '',
      periodicidad_revision: it.periodicidad_revision ?? '',
      alcance: it.alcance ?? '', descripcion: it.descripcion ?? '',
      aceptaciones_requeridas: Boolean(it.aceptaciones_requeridas),
    } : { ...VACIO })
  }
  if (!dlg.abierto && wasOpen) setWasOpen(false)

  const { data: politicas = [], isLoading } = useQuery<Politica[]>({
    queryKey: ['grc-politicas'],
    queryFn: () => api.get('/grc/politicas').then(r => r.data),
  })

  const selPol = politicas.find(p => p.id === selId) ?? null
  const err = (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar')
  const invalidar = () => qc.invalidateQueries({ queryKey: ['grc-politicas'] })

  const cuerpoDe = (f: typeof VACIO) => ({
    nombre: f.nombre.trim(),
    tipo: f.tipo || null,
    version: f.version.trim() || '1.0',
    estado: f.estado || 'borrador',
    propietario: f.propietario.trim() || null,
    aprobador: f.aprobador.trim() || null,
    fecha_aprobacion: f.fecha_aprobacion || null,
    fecha_vigencia: f.fecha_vigencia || null,
    fecha_revision: f.fecha_revision || null,
    periodicidad_revision: f.periodicidad_revision || null,
    alcance: f.alcance.trim() || null,
    descripcion: f.descripcion.trim() || null,
    aceptaciones_requeridas: f.aceptaciones_requeridas,
  })

  const mutGuardar = useMutation({
    mutationFn: () => (dlg.item
      ? api.patch(`/grc/politicas/${dlg.item.id}`, cuerpoDe(form)).then(r => r.data)
      : api.post('/grc/politicas', cuerpoDe(form)).then(r => r.data)),
    onSuccess: () => {
      toast.success(dlg.item ? 'Política actualizada' : 'Política creada')
      invalidar(); setDlg({ abierto: false, item: null })
    },
    onError: err,
  })

  const mutBorrar = useMutation({
    mutationFn: (id: number) => api.delete(`/grc/politicas/${id}`),
    onSuccess: () => { toast.success('Política eliminada'); invalidar(); setSelId(null) },
    onError: err,
  })

  /** Lo único que la base guarda de aceptaciones es el acumulado, y lo suma el
   *  servidor: el contador no viaja en el cuerpo del PATCH. */
  const mutAceptar = useMutation({
    mutationFn: (p: Politica) =>
      api.post(`/grc/politicas/${p.id}/aceptar`).then(r => r.data),
    onSuccess: () => { toast.success('Aceptación registrada'); invalidar() },
    onError: err,
  })

  const kpis = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10)
    return [
      {
        label: 'Políticas vigentes', color: '#059669', icon: <CheckCircle />,
        value: politicas.filter(p => p.estado === 'publicada').length,
      },
      {
        label: 'Políticas vencidas', color: '#DC2626', icon: <Warning />,
        value: politicas.filter(p => p.estado === 'vencida'
          || (p.estado === 'publicada' && p.fecha_vigencia && p.fecha_vigencia < hoy)).length,
      },
      {
        label: 'En revisión', color: '#D97706', icon: <Schedule />,
        value: politicas.filter(p => p.estado === 'en_revision').length,
      },
      {
        label: 'Exigen aceptación', color: GRC_COLOR, icon: <HistoryEdu />,
        value: politicas.filter(p => p.aceptaciones_requeridas).length,
      },
    ]
  }, [politicas])

  const Row2 = ({ label, value }: { label: string; value: string }) => (
    <Box sx={{ mb: 1.25 }}>
      <Typography sx={{ fontSize: 10, color: LBL, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{value}</Typography>
    </Box>
  )

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Policy sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>Repositorio de Políticas</Typography>
              <Typography sx={{ fontSize: 12, color: LBL }}>GRC · Vigencias, revisiones y aceptaciones</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{
              bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700,
              border: `1px solid ${alpha(GRC_COLOR, 0.35)}`,
            }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained"
            onClick={() => setDlg({ abierto: true, item: null })}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Nueva política
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ color: alpha(k.color, 0.5), '& svg': { fontSize: 22 } }}>{k.icon}</Box>
                  <Box>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                    <Typography sx={{ fontSize: 11, color: LBL }}>{k.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 2, borderBottom: '1px solid #E5E7EB',
          '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 },
          '& .Mui-selected': { color: GRC_COLOR },
          '& .MuiTabs-indicator': { bgcolor: GRC_COLOR },
        }}>
          <Tab label={`Catálogo de políticas (${politicas.length})`} />
          <Tab label="Control de aceptaciones" />
        </Tabs>

        {isLoading && <LinearProgress sx={{ mb: 1 }} />}
        {!isLoading && politicas.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No hay políticas registradas. Use <strong>Nueva política</strong> para la primera;
            el código lo asigna el sistema.
          </Alert>
        )}

        {/* CATÁLOGO */}
        {tab === 0 && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Grid container spacing={2}>
                {politicas.map(p => {
                  const ec = estadoColor(p.estado)
                  return (
                    <Grid key={p.id} size={{ xs: 12, md: 6, lg: 4 }}>
                      <Card onClick={() => { setSelId(p.id); setPanelTab(0) }} sx={{
                        border: `1px solid ${selId === p.id ? alpha(GRC_COLOR, 0.5) : alpha(ec, 0.25)}`,
                        borderRadius: 2, cursor: 'pointer',
                        '&:hover': { borderColor: alpha(GRC_COLOR, 0.4) },
                        transition: 'border-color 0.15s',
                      }}>
                        <CardContent sx={{ p: '16px !important' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography sx={{ fontSize: 10, color: LBL }}>
                              {p.codigo ?? `POL-${p.id}`} · v{p.version ?? '1.0'}
                            </Typography>
                            <Chip label={estadoLabel(p.estado)} size="small"
                              sx={{ fontSize: 9, height: 18, bgcolor: alpha(ec, 0.18), color: ec }} />
                          </Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, mb: 1.5 }}>
                            {p.nombre}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                            <Box>
                              <Typography sx={{ fontSize: 9.5, color: LBL, textTransform: 'uppercase' }}>Propietario</Typography>
                              <Typography sx={{ fontSize: 11.5, fontWeight: 600 }}>{p.propietario ?? '—'}</Typography>
                            </Box>
                            <Box>
                              <Typography sx={{ fontSize: 9.5, color: LBL, textTransform: 'uppercase' }}>Aprobador</Typography>
                              <Typography sx={{ fontSize: 11.5, fontWeight: 600 }}>{p.aprobador ?? '—'}</Typography>
                            </Box>
                            <Box>
                              <Typography sx={{ fontSize: 9.5, color: LBL, textTransform: 'uppercase' }}>Vigencia</Typography>
                              <Typography sx={{ fontSize: 11.5 }}>{p.fecha_vigencia ?? '—'}</Typography>
                            </Box>
                          </Box>
                          {p.aceptaciones_requeridas && (
                            <Typography sx={{ fontSize: 10, color: LBL }}>
                              Exige aceptación · {p.aceptaciones_count ?? 0} registrada(s)
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5 }} onClick={e => e.stopPropagation()}>
                            <IconButton size="small" sx={{ color: GRC_COLOR, p: 0.5 }}
                              onClick={() => setDlg({ abierto: true, item: p })}>
                              <Edit sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton size="small" sx={{ color: '#DC2626', p: 0.5 }}
                              onClick={() => {
                                if (window.confirm(`¿Eliminar la política "${p.nombre}"?`)) mutBorrar.mutate(p.id)
                              }}>
                              <Delete sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            </Box>

            {/* PANEL DERECHO */}
            {selPol && (
              <Box sx={{
                width: 380, flexShrink: 0, bgcolor: '#FFFFFF',
                border: '1px solid #E5E7EB', borderRadius: 2, p: 2.5, height: 'fit-content',
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, flex: 1, pr: 1 }}>{selPol.nombre}</Typography>
                  <IconButton size="small" onClick={() => setSelId(null)}><Close fontSize="small" /></IconButton>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={estadoLabel(selPol.estado)} size="small" sx={{
                    bgcolor: alpha(estadoColor(selPol.estado), 0.18),
                    color: estadoColor(selPol.estado), fontWeight: 700, fontSize: 10,
                  }} />
                  <Chip label={`v${selPol.version ?? '1.0'}`} size="small"
                    sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontSize: 10 }} />
                  {selPol.tipo && (
                    <Chip label={selPol.tipo} size="small"
                      sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontSize: 10 }} />
                  )}
                </Box>
                <Tabs value={panelTab} onChange={(_, v) => setPanelTab(v)} sx={{
                  mb: 1.5,
                  '& .MuiTab-root': { color: 'text.secondary', fontSize: 11, minHeight: 32, py: 0.5 },
                  '& .Mui-selected': { color: GRC_COLOR },
                  '& .MuiTabs-indicator': { bgcolor: GRC_COLOR },
                }}>
                  <Tab label="Detalle" sx={{ minHeight: 32 }} />
                  <Tab label="Aceptaciones" sx={{ minHeight: 32 }} />
                </Tabs>
                {panelTab === 0 && (
                  <>
                    <Row2 label="Código" value={selPol.codigo ?? `POL-${selPol.id}`} />
                    <Row2 label="Propietario" value={selPol.propietario ?? 'Sin asignar'} />
                    <Row2 label="Aprobador" value={selPol.aprobador ?? 'Sin asignar'} />
                    <Row2 label="Aprobada el" value={selPol.fecha_aprobacion ?? 'No aprobada'} />
                    <Row2 label="Vigencia" value={selPol.fecha_vigencia ?? 'No definida'} />
                    <Row2 label="Próxima revisión" value={selPol.fecha_revision ?? 'No definida'} />
                    <Row2 label="Revisión periódica" value={selPol.periodicidad_revision ?? 'No definida'} />
                    <Row2 label="Alcance" value={selPol.alcance ?? 'No definido'} />
                    <Divider sx={{ borderColor: '#E5E7EB', my: 1.5 }} />
                    <Typography sx={{ fontSize: 10, color: LBL, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
                      Descripción
                    </Typography>
                    <Typography sx={{ fontSize: 12, lineHeight: 1.7 }}>
                      {selPol.descripcion ?? 'Sin descripción registrada.'}
                    </Typography>
                    <Divider sx={{ borderColor: '#E5E7EB', my: 1.5 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button size="small" startIcon={<Edit />} variant="outlined" fullWidth
                        onClick={() => setDlg({ abierto: true, item: selPol })}
                        sx={{ color: GRC_COLOR, borderColor: alpha(GRC_COLOR, 0.4) }}>
                        Editar política
                      </Button>
                      <Button size="small" startIcon={<Delete />} variant="outlined" fullWidth
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la política "${selPol.nombre}"?`)) mutBorrar.mutate(selPol.id)
                        }}
                        sx={{ color: '#DC2626', borderColor: alpha('#DC2626', 0.4) }}>
                        Eliminar
                      </Button>
                    </Box>
                  </>
                )}
                {panelTab === 1 && (
                  <>
                    {selPol.aceptaciones_requeridas ? (
                      <>
                        <Box sx={{ p: 1.5, bgcolor: alpha(GRC_COLOR, 0.08), borderRadius: 1, mb: 1.5 }}>
                          <Typography sx={{ fontSize: 11, color: LBL }}>Aceptaciones acumuladas</Typography>
                          <Typography sx={{ fontSize: 26, fontWeight: 800, color: GRC_COLOR, lineHeight: 1.2 }}>
                            {selPol.aceptaciones_count ?? 0}
                          </Typography>
                        </Box>
                        <Button size="small" startIcon={<HowToReg />} variant="contained" fullWidth
                          disabled={mutAceptar.isPending}
                          onClick={() => mutAceptar.mutate(selPol)}
                          sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' } }}>
                          Registrar una aceptación
                        </Button>
                        {/* Honesto sobre lo que hay: la base guarda el acumulado,
                            no el detalle de quién aceptó ni cuándo. */}
                        <Alert severity="info" sx={{ mt: 1.5, fontSize: 11 }}>
                          Por ahora solo se lleva el acumulado. El registro nominal de quién
                          aceptó y en qué versión todavía no existe en la base.
                        </Alert>
                      </>
                    ) : (
                      <Alert severity="info" sx={{ fontSize: 11 }}>
                        Esta política no exige aceptación. Actívelo desde
                        <strong> Editar política</strong> si debe ser aceptada por el personal.
                      </Alert>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* CONTROL DE ACEPTACIONES */}
        {tab === 1 && (
          <Paper sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: LBL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Política</TableCell><TableCell>Estado</TableCell>
                  <TableCell>Versión</TableCell><TableCell>Aceptaciones</TableCell>
                  <TableCell>Vigencia</TableCell><TableCell>Próx. revisión</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {politicas.filter(p => p.aceptaciones_requeridas).map(p => (
                  <TableRow key={p.id} hover sx={{ '& td': { borderColor: '#E5E7EB', fontSize: 12.5 } }}>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{p.nombre}</Typography>
                      <Typography sx={{ fontSize: 10, color: LBL }}>{p.codigo ?? `POL-${p.id}`}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={estadoLabel(p.estado)} size="small" sx={{
                        fontSize: 10, height: 18,
                        bgcolor: alpha(estadoColor(p.estado), 0.15), color: estadoColor(p.estado),
                      }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={`v${p.version ?? '1.0'}`} size="small"
                        sx={{ bgcolor: alpha(GRC_COLOR, 0.12), color: GRC_COLOR, fontSize: 10 }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{p.aceptaciones_count ?? 0}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{p.fecha_vigencia ?? '—'}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{p.fecha_revision ?? '—'}</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<HowToReg />} variant="contained"
                        disabled={mutAceptar.isPending}
                        onClick={() => mutAceptar.mutate(p)}
                        sx={{ bgcolor: GRC_COLOR, fontSize: 10, py: 0.25, px: 1, '&:hover': { bgcolor: '#5B21B6' } }}>
                        Aceptar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {politicas.filter(p => p.aceptaciones_requeridas).length === 0 && (
              <Box sx={{ p: 3 }}>
                <Alert severity="info">
                  Ninguna política exige aceptación. Marque <strong>Exige aceptación del personal</strong>
                  {' '}en la política que corresponda.
                </Alert>
              </Box>
            )}
          </Paper>
        )}

        {/* ALTA / EDICIÓN */}
        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })}
          maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            {dlg.item ? `Editar ${dlg.item.codigo ?? `POL-${dlg.item.id}`}` : 'Nueva política'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField label="Nombre de la política *" size="small" fullWidth autoFocus
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <SelectorCatalogo modulo="GRC" tipo="TIPO_POLITICA" label="Tipo"
                  valor={form.tipo} onChange={v => setForm(f => ({ ...f, tipo: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Estado" size="small" fullWidth value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  {ESTADOS.map(e => <MenuItem key={e.valor} value={e.valor}>{e.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Versión" size="small" fullWidth value={form.version}
                  onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SelectorResponsable label="Propietario" valor={form.propietario}
                  onChange={v => setForm(f => ({ ...f, propietario: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SelectorResponsable label="Aprobador" valor={form.aprobador}
                  onChange={v => setForm(f => ({ ...f, aprobador: v }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField label="Aprobada el" type="date" size="small" fullWidth
                  InputLabelProps={{ shrink: true }} value={form.fecha_aprobacion}
                  onChange={e => setForm(f => ({ ...f, fecha_aprobacion: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField label="Vigente hasta" type="date" size="small" fullWidth
                  InputLabelProps={{ shrink: true }} value={form.fecha_vigencia}
                  onChange={e => setForm(f => ({ ...f, fecha_vigencia: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField label="Próxima revisión" type="date" size="small" fullWidth
                  InputLabelProps={{ shrink: true }} value={form.fecha_revision}
                  onChange={e => setForm(f => ({ ...f, fecha_revision: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <SelectorCatalogo modulo="GRC" tipo="PERIODICIDAD_REVISION" label="Periodicidad"
                  valor={form.periodicidad_revision}
                  onChange={v => setForm(f => ({ ...f, periodicidad_revision: v }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Alcance" size="small" fullWidth
                  placeholder="A quién y a qué procesos aplica"
                  value={form.alcance}
                  onChange={e => setForm(f => ({ ...f, alcance: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Descripción" size="small" fullWidth multiline rows={4}
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={<Switch checked={form.aceptaciones_requeridas}
                    onChange={e => setForm(f => ({ ...f, aceptaciones_requeridas: e.target.checked }))} />}
                  label="Exige aceptación del personal" />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDlg({ abierto: false, item: null })}>Cancelar</Button>
            <Button variant="contained"
              disabled={!form.nombre.trim() || mutGuardar.isPending}
              onClick={() => mutGuardar.mutate()}
              sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' } }}>
              {mutGuardar.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
