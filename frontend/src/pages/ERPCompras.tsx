import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, Select,
  MenuItem, FormControl, InputLabel, alpha, Tabs, Tab,
} from '@mui/material'
import { Add, ShoppingCart, CheckCircle, Cancel } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ERP_COLOR = '#1A3A6B'

function formatCurrency(v: number | null | undefined) {
  if (v == null) return '$ 0'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

type EstadoRequisicion = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'EN_OC'
type EstadoOC = 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'EMITIDA' | 'PARCIALMENTE_RECIBIDA' | 'RECIBIDA' | 'CANCELADA'

interface Requisicion {
  id: number
  numero: string
  descripcion: string
  solicitante: string
  departamento: string
  fecha: string
  monto_estimado: number
  estado: EstadoRequisicion
}

interface OrdenCompra {
  id: number
  numero: string
  proveedor_nombre: string
  fecha: string
  fecha_entrega: string
  subtotal: number
  iva: number
  total: number
  estado: EstadoOC
}

const REQ_CONFIG: Record<EstadoRequisicion, { bg: string; color: string; label: string }> = {
  BORRADOR: { bg: '#F8FAFC', color: '#64748B', label: 'Borrador' },
  PENDIENTE: { bg: '#FFF7ED', color: '#C2410C', label: 'Pendiente' },
  APROBADA: { bg: '#F0FDF4', color: '#16A34A', label: 'Aprobada' },
  RECHAZADA: { bg: '#FEF2F2', color: '#DC2626', label: 'Rechazada' },
  EN_OC: { bg: '#EFF6FF', color: '#1D4ED8', label: 'En OC' },
}

const OC_CONFIG: Record<EstadoOC, { bg: string; color: string; label: string }> = {
  BORRADOR: { bg: '#F8FAFC', color: '#64748B', label: 'Borrador' },
  PENDIENTE: { bg: '#FFF7ED', color: '#C2410C', label: 'Pendiente Aprobación' },
  APROBADA: { bg: '#F0FDF4', color: '#16A34A', label: 'Aprobada' },
  EMITIDA: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Emitida' },
  PARCIALMENTE_RECIBIDA: { bg: '#F5F3FF', color: '#7C3AED', label: 'Parcialmente Recibida' },
  RECIBIDA: { bg: '#F0FDF4', color: '#16A34A', label: 'Recibida' },
  CANCELADA: { bg: '#FEF2F2', color: '#DC2626', label: 'Cancelada' },
}

const EMPTY_REQ = { descripcion: '', departamento: '', monto_estimado: '' }

export default function ERPCompras() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [openNew, setOpenNew] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_REQ })

  const { data: requisiciones = [], isLoading: loadingReq } = useQuery<Requisicion[]>({
    queryKey: ['erp-requisiciones'],
    queryFn: () => apiClient.get('/erp/compras/requisiciones').then(r => r.data),
  })

  const { data: ordenes = [], isLoading: loadingOC } = useQuery<OrdenCompra[]>({
    queryKey: ['erp-ordenes-compra'],
    queryFn: () => apiClient.get('/erp/compras/ordenes').then(r => r.data),
  })

  const createRequisicion = useMutation({
    mutationFn: (data: typeof EMPTY_REQ) => apiClient.post('/erp/compras/requisiciones', {
      ...data, monto_estimado: parseFloat(String(data.monto_estimado)),
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Requisición creada')
      qc.invalidateQueries({ queryKey: ['erp-requisiciones'] })
      setOpenNew(false); setForm({ ...EMPTY_REQ })
    },
    onError: () => toast.error('Error al crear requisición'),
  })

  const aprobarRequisicion = useMutation({
    mutationFn: (id: number) => apiClient.post(`/erp/compras/requisiciones/${id}/aprobar`).then(r => r.data),
    onSuccess: () => { toast.success('Requisición aprobada'); qc.invalidateQueries({ queryKey: ['erp-requisiciones'] }) },
    onError: () => toast.error('Error al aprobar'),
  })

  const aprobarOC = useMutation({
    mutationFn: (id: number) => apiClient.post(`/erp/compras/ordenes/${id}/aprobar`).then(r => r.data),
    onSuccess: () => { toast.success('OC aprobada'); qc.invalidateQueries({ queryKey: ['erp-ordenes-compra'] }) },
    onError: () => toast.error('Error al aprobar OC'),
  })

  const totalReq = requisiciones.reduce((a, r) => a + r.monto_estimado, 0)
  const totalOC = ordenes.reduce((a, o) => a + o.total, 0)
  const pendientesReq = requisiciones.filter(r => r.estado === 'PENDIENTE').length
  const pendientesOC = ordenes.filter(o => o.estado === 'PENDIENTE').length

  return (
    <Layout title="ERP — Compras Corporativas">
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${ERP_COLOR} 0%, #0D2347 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShoppingCart sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>Compras Corporativas</Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>ERP · Requisiciones → Aprobación → Órdenes de Compra</Typography>
          </Box>
          <Chip label="COMPRAS" size="small" sx={{ ml: 'auto', bgcolor: alpha(ERP_COLOR, 0.1), color: ERP_COLOR, fontWeight: 700, fontSize: 11, height: 24, letterSpacing: '0.05em' }} />
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Monto Req. Período', value: formatCurrency(totalReq), color: ERP_COLOR },
          { label: 'Total OC Emitidas', value: formatCurrency(totalOC), color: '#16A34A' },
          { label: 'Req. Pendientes', value: String(pendientesReq), color: '#F59E0B' },
          { label: 'OC Pendientes', value: String(pendientesOC), color: '#7C3AED' },
        ].map(kpi => (
          <Grid item xs={6} sm={3} key={kpi.label}>
            <Card sx={{ p: 2, borderRadius: '14px', border: `1px solid ${alpha(kpi.color, 0.15)}`, background: `linear-gradient(135deg, ${alpha(kpi.color, 0.04)} 0%, #fff 100%)` }}>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94A3B8', mb: 0.5 }}>{kpi.label}</Typography>
              {loadingReq ? <Skeleton width={80} height={28} /> : <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</Typography>}
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F1F5F9', px: 2, pt: 1 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flex: 1, '& .MuiTab-root': { fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', color: '#64748B', minHeight: 44, px: 2 }, '& .Mui-selected': { color: ERP_COLOR }, '& .MuiTabs-indicator': { bgcolor: ERP_COLOR, height: 2 } }}>
            <Tab label="Requisiciones" />
            <Tab label="Órdenes de Compra" />
          </Tabs>
          {tab === 0 && (
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpenNew(true)} sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#0D2347' }, height: 34, px: 2, fontSize: '0.8rem' }}>
              Nueva Requisición
            </Button>
          )}
        </Box>

        {tab === 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Número</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Solicitante</TableCell>
                  <TableCell>Departamento</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="right">Monto Estimado</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingReq ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                )) : requisiciones.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><Typography sx={{ color: '#94A3B8' }}>No hay requisiciones</Typography></TableCell></TableRow>
                ) : requisiciones.map(req => {
                  const cfg = REQ_CONFIG[req.estado] ?? REQ_CONFIG.BORRADOR
                  return (
                    <TableRow key={req.id}>
                      <TableCell><Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: ERP_COLOR, fontFamily: 'monospace' }}>{req.numero}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.875rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.descripcion}</Typography></TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{req.solicitante}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{req.departamento}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{req.fecha ? new Date(req.fecha).toLocaleDateString('es-CO') : '—'}</TableCell>
                      <TableCell align="right"><Typography sx={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{formatCurrency(req.monto_estimado)}</Typography></TableCell>
                      <TableCell><Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: '0.7rem', height: 22 }} /></TableCell>
                      <TableCell align="center">
                        {req.estado === 'PENDIENTE' && (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Button size="small" startIcon={<CheckCircle sx={{ fontSize: 12 }} />} onClick={() => aprobarRequisicion.mutate(req.id)} sx={{ fontSize: '0.72rem', height: 26, px: 1, bgcolor: '#F0FDF4', color: '#16A34A', '&:hover': { bgcolor: '#DCFCE7' } }}>
                              Aprobar
                            </Button>
                            <Button size="small" startIcon={<Cancel sx={{ fontSize: 12 }} />} sx={{ fontSize: '0.72rem', height: 26, px: 1, bgcolor: '#FEF2F2', color: '#DC2626', '&:hover': { bgcolor: '#FEE2E2' } }}>
                              Rechazar
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Número OC</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>F. Entrega</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell align="right">IVA</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingOC ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 9 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                )) : ordenes.length === 0 ? (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><Typography sx={{ color: '#94A3B8' }}>No hay órdenes de compra</Typography></TableCell></TableRow>
                ) : ordenes.map(oc => {
                  const cfg = OC_CONFIG[oc.estado] ?? OC_CONFIG.BORRADOR
                  return (
                    <TableRow key={oc.id}>
                      <TableCell><Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: ERP_COLOR, fontFamily: 'monospace' }}>{oc.numero}</Typography></TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>{oc.proveedor_nombre}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{oc.fecha ? new Date(oc.fecha).toLocaleDateString('es-CO') : '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{oc.fecha_entrega ? new Date(oc.fecha_entrega).toLocaleDateString('es-CO') : '—'}</TableCell>
                      <TableCell align="right"><Typography sx={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{formatCurrency(oc.subtotal)}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#DC2626' }}>{formatCurrency(oc.iva)}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(oc.total)}</Typography></TableCell>
                      <TableCell><Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: '0.7rem', height: 22 }} /></TableCell>
                      <TableCell align="center">
                        {oc.estado === 'PENDIENTE' && (
                          <Button size="small" startIcon={<CheckCircle sx={{ fontSize: 12 }} />} onClick={() => aprobarOC.mutate(oc.id)} sx={{ fontSize: '0.72rem', height: 26, px: 1, bgcolor: '#F0FDF4', color: '#16A34A', '&:hover': { bgcolor: '#DCFCE7' } }}>
                            Aprobar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      <Dialog open={openNew} onClose={() => { setOpenNew(false); setForm({ ...EMPTY_REQ }) }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B', pb: 1, borderBottom: '1px solid #F1F5F9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: alpha(ERP_COLOR, 0.1), color: ERP_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingCart sx={{ fontSize: 15 }} /></Box>
            Nueva Requisición de Compra
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Descripción *" fullWidth size="small" multiline rows={2} value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción del bien o servicio requerido" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Departamento *" fullWidth size="small" value={form.departamento} onChange={e => setForm(p => ({ ...p, departamento: e.target.value }))} placeholder="Ej: Operaciones" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Monto Estimado *" fullWidth size="small" type="number" value={form.monto_estimado} onChange={e => setForm(p => ({ ...p, monto_estimado: e.target.value }))} placeholder="0" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => { setOpenNew(false); setForm({ ...EMPTY_REQ }) }} variant="outlined" size="small">Cancelar</Button>
          <Button variant="contained" size="small" disabled={!form.descripcion || !form.departamento || createRequisicion.isPending} onClick={() => createRequisicion.mutate(form)} sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#0D2347' } }}>
            {createRequisicion.isPending ? 'Creando...' : 'Crear Requisición'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
