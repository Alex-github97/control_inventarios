import React, { useState } from 'react'
import {
  Grid, Card, CardContent, Typography, Box, Chip, Button,
  Divider, Skeleton, Alert, Avatar, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, TextField,
} from '@mui/material'
import {
  ArrowBack, QrCode2, Edit, LocalShipping, LocationOn,
  Person, Inventory2, Warning, CheckCircle, Cancel,
} from '@mui/icons-material'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estibasApi } from '@/api/estibas'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { StatusChip } from '@/components/common/StatusChip'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ROLES_SUPERVISION = new Set(['ADMINISTRADOR', 'SUPERVISOR_LOGISTICO'])

const TIPO_ICONS: Record<string, React.ReactNode> = {
  CARGA: <LocalShipping fontSize="small" />,
  DESCARGA: <LocationOn fontSize="small" />,
  TRANSFERENCIA: <Inventory2 fontSize="small" />,
  RETORNO: <ArrowBack fontSize="small" />,
  BAJA: <Warning fontSize="small" />,
}

const TIPO_COLORS: Record<string, string> = {
  CARGA: '#3B82F6',
  DESCARGA: '#32AC5C',
  TRANSFERENCIA: '#8B5CF6',
  RETORNO: '#F59E0B',
  BAJA: '#EF4444',
  REPARACION: '#F97316',
}

const TIPOS = ['MADERA', 'PLASTICO', 'METAL', 'CARTON', 'MIXTA']
const PROPIETARIOS = ['PROPIA', 'ALQUILADA', 'CLIENTE', 'PROVEEDOR', 'TERCERO']
const MATERIALES: Record<string, string[]> = {
  MADERA:   ['MADERA_PINO', 'MADERA_EUCALIPTO'],
  PLASTICO: ['PLASTICO_HDPE'],
  METAL:    ['ACERO', 'ALUMINIO'],
  CARTON:   ['CARTON_CORRUGADO'],
  MIXTA:    ['MADERA_PINO', 'MADERA_EUCALIPTO', 'PLASTICO_HDPE', 'ACERO', 'ALUMINIO', 'CARTON_CORRUGADO'],
}

export default function EstibaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore(s => s.user)
  const esSupervisor = ROLES_SUPERVISION.has(user?.rol ?? '')

  const [openEdit, setOpenEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [editError, setEditError] = useState('')
  const [openQr, setOpenQr] = useState(false)

  // ── Estado FALTANTE ───────────────────────────────────────────────────────
  const [openRecuperar, setOpenRecuperar]   = useState(false)
  const [openPerdida, setOpenPerdida]       = useState(false)
  const [obsRecuperar, setObsRecuperar]     = useState('')
  const [bodegaRecuperar, setBodegaRecuperar] = useState('')
  const [obsPerdida, setObsPerdida]         = useState('')

  const { data: ubicaciones = [] } = useQuery({
    queryKey: ['ubicaciones-select'],
    queryFn: () => apiClient.get('/ubicaciones', { params: { page_size: 500 } }).then(r => r.data?.items ?? r.data ?? []),
    staleTime: 60000,
    enabled: openRecuperar,
  })

  const recuperarMutation = useMutation({
    mutationFn: () => apiClient.post(`/estibas/${id}/recuperar-faltante`, {
      observacion: obsRecuperar,
      ...(bodegaRecuperar ? { ubicacion_id: Number(bodegaRecuperar) } : {}),
    }),
    onSuccess: () => {
      toast.success('Estiba recuperada y vuelta a inventario')
      queryClient.invalidateQueries({ queryKey: ['estiba', id] })
      queryClient.invalidateQueries({ queryKey: ['estibas'] })
      queryClient.invalidateQueries({ queryKey: ['alertas-count'] })
      queryClient.invalidateQueries({ queryKey: ['alertas-preview'] })
      setOpenRecuperar(false)
      setObsRecuperar('')
      setBodegaRecuperar('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al recuperar'),
  })

  const perdidaMutation = useMutation({
    mutationFn: () => apiClient.post(`/estibas/${id}/confirmar-perdida`, {
      observacion: obsPerdida,
    }),
    onSuccess: () => {
      toast.success('Pérdida confirmada. Estiba marcada como PERDIDA.')
      queryClient.invalidateQueries({ queryKey: ['estiba', id] })
      queryClient.invalidateQueries({ queryKey: ['estibas'] })
      queryClient.invalidateQueries({ queryKey: ['alertas-count'] })
      queryClient.invalidateQueries({ queryKey: ['alertas-preview'] })
      setOpenPerdida(false)
      setObsPerdida('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al confirmar pérdida'),
  })

  const { data: estiba, isLoading, error } = useQuery({
    queryKey: ['estiba', id],
    queryFn: () => estibasApi.obtener(Number(id)),
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => estibasApi.actualizar(Number(id), data),
    onSuccess: () => {
      toast.success('Estiba actualizada correctamente')
      queryClient.invalidateQueries({ queryKey: ['estiba', id] })
      queryClient.invalidateQueries({ queryKey: ['estibas'] })
      setOpenEdit(false)
      setEditError('')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? 'Error al actualizar la estiba'
      setEditError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  const handleOpenEdit = () => {
    if (!estiba) return
    setEditForm({
      tipo: estiba.tipo,
      material: estiba.material,
      tipo_propietario: estiba.tipo_propietario,
      largo_cm: (estiba as any).largo_cm ?? 120,
      ancho_cm: (estiba as any).ancho_cm ?? 100,
      alto_cm: (estiba as any).alto_cm ?? 15,
      peso_kg: (estiba as any).peso_kg ?? 25,
      capacidad_carga_kg: (estiba as any).capacidad_carga_kg ?? 1000,
      valor_compra: (estiba as any).valor_compra ?? '',
      observaciones: estiba.observaciones ?? '',
    })
    setEditError('')
    setOpenEdit(true)
  }

  const handleEditSubmit = () => {
    updateMutation.mutate({
      ...editForm,
      largo_cm: Number(editForm.largo_cm),
      ancho_cm: Number(editForm.ancho_cm),
      alto_cm: Number(editForm.alto_cm),
      peso_kg: Number(editForm.peso_kg),
      capacidad_carga_kg: Number(editForm.capacidad_carga_kg),
      valor_compra: editForm.valor_compra !== '' ? Number(editForm.valor_compra) : null,
      observaciones: editForm.observaciones || null,
    })
  }

  const { data: trazabilidad } = useQuery({
    queryKey: ['trazabilidad', id],
    queryFn: () => estibasApi.trazabilidad(Number(id)),
  })

  if (error) return (
    <Layout>
      <Alert severity="error">Estiba no encontrada</Alert>
    </Layout>
  )

  return (
    <Layout>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ color: '#64748B' }}>
          Volver
        </Button>
        <Box sx={{ flex: 1 }}>
          {isLoading ? <Skeleton width={200} height={36} /> : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'monospace' }}>
                {estiba?.codigo_interno}
              </Typography>
              <StatusChip status={estiba?.estado ?? ''} size="medium" />
            </Box>
          )}
        </Box>
        <Button variant="outlined" startIcon={<QrCode2 />} onClick={() => setOpenQr(true)} disabled={isLoading || !estiba?.codigo_qr}>Ver QR</Button>
        <Button variant="contained" startIcon={<Edit />} onClick={handleOpenEdit} disabled={isLoading}>Editar</Button>
      </Box>

      {/* ── Panel FALTANTE ───────────────────────────────────────────────── */}
      {estiba?.estado === 'FALTANTE' && (
        <Box sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 2,
          border: '2px solid #FB923C',
          bgcolor: alpha('#FB923C', 0.07),
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
            <Warning sx={{ color: '#C2410C', fontSize: 32, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontWeight: 800, color: '#C2410C', fontSize: 15 }}>
                Estiba reportada como FALTANTE
              </Typography>
              <Typography variant="body2" sx={{ color: '#78350F', mt: 0.25 }}>
                Esta estiba no fue entregada en el destino. Un supervisor debe resolver la novedad.
              </Typography>
            </Box>
          </Box>
          {esSupervisor ? (
            <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
              <Button
                variant="contained"
                startIcon={<CheckCircle />}
                onClick={() => setOpenRecuperar(true)}
                sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                Recuperar faltante
              </Button>
              <Button
                variant="contained"
                startIcon={<Cancel />}
                onClick={() => setOpenPerdida(true)}
                sx={{ bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' }, fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                Confirmar pérdida
              </Button>
            </Box>
          ) : (
            <Chip
              label="Requiere supervisor"
              sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 700, border: '1px solid #FDE68A' }}
            />
          )}
        </Box>
      )}

      <Grid container spacing={2.5}>
        {/* Info principal */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Información General</Typography>
              {isLoading ? <Skeleton variant="rectangular" height={300} /> : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[
                    { label: 'Tipo', value: estiba?.tipo },
                    { label: 'Material', value: estiba?.material },
                    { label: 'Propietario', value: estiba?.tipo_propietario },
                    { label: 'Dimensiones', value: `${estiba?.largo_cm}×${estiba?.ancho_cm}×${estiba?.alto_cm} cm` },
                    { label: 'Peso', value: `${estiba?.peso_kg} kg` },
                    { label: 'Fecha Ingreso', value: estiba?.fecha_ingreso ? format(new Date(estiba.fecha_ingreso), 'dd/MM/yyyy', { locale: es }) : '—' },
                    { label: 'Total Usos', value: estiba?.total_usos },
                    { label: 'Valor Actual', value: estiba?.valor_actual ? `$${estiba.valor_actual.toLocaleString('es-CO')}` : '—' },
                  ].map(({ label, value }) => (
                    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#64748B', fontSize: 13 }}>{label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{value ?? '—'}</Typography>
                    </Box>
                  ))}

                  <Divider sx={{ my: 0.5 }} />

                  <Box>
                    <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12, mb: 0.5 }}>Ubicación Actual</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn sx={{ fontSize: 16, color: '#32AC5C' }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {estiba?.ubicacion_actual?.nombre ?? 'Sin ubicación'}
                      </Typography>
                    </Box>
                  </Box>

                  {estiba?.proveedor && (
                    <Box>
                      <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12, mb: 0.5 }}>Proveedor</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{estiba.proveedor.razon_social}</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* QR Code preview */}
          {estiba?.codigo_qr && (
            <Card sx={{ mt: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5, color: '#64748B' }}>
                  Código QR
                </Typography>
                <Box component="img" src={estiba.codigo_qr} sx={{ width: '80%', maxWidth: 180 }} />
                <Typography variant="caption" sx={{ display: 'block', mt: 1, fontFamily: 'monospace', color: '#64748B' }}>
                  {estiba.codigo_interno}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Timeline trazabilidad */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Historial de Trazabilidad
              </Typography>
              {!trazabilidad ? (
                <Skeleton variant="rectangular" height={400} />
              ) : trazabilidad.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, color: '#94A3B8' }}>
                  <Typography>Sin movimientos registrados</Typography>
                </Box>
              ) : (
                <Box sx={{ position: 'relative', pl: 3 }}>
                  {trazabilidad.map((item: any, index: number) => (
                    <Box key={item.id} sx={{ display: 'flex', gap: 2, mb: 2, position: 'relative' }}>
                      {/* Line */}
                      {index < trazabilidad.length - 1 && (
                        <Box sx={{ position: 'absolute', left: 16, top: 32, bottom: -8, width: 2, bgcolor: '#E2E8F0' }} />
                      )}
                      {/* Dot */}
                      <Avatar
                        sx={{ width: 32, height: 32, flexShrink: 0, bgcolor: TIPO_COLORS[item.tipo] || '#64748B', zIndex: 1 }}
                      >
                        {TIPO_ICONS[item.tipo] || <Inventory2 fontSize="small" />}
                      </Avatar>
                      {/* Content */}
                      <Box sx={{ flex: 1, bgcolor: '#F8FAFC', borderRadius: 2, p: 1.5, border: '1px solid #E2E8F0' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                          <Chip
                            label={item.tipo.replace('_', ' ')}
                            size="small"
                            sx={{ bgcolor: TIPO_COLORS[item.tipo] || '#64748B', color: '#FFF', fontSize: 10, fontWeight: 700, height: 20 }}
                          />
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            {format(new Date(item.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                          {item.ubicacion_destino && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationOn sx={{ fontSize: 12, color: '#94A3B8' }} />
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.ubicacion_destino}</Typography>
                            </Box>
                          )}
                          {item.vehiculo && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocalShipping sx={{ fontSize: 12, color: '#94A3B8' }} />
                              <Typography variant="caption">{item.vehiculo}</Typography>
                            </Box>
                          )}
                          {item.manifiesto && (
                            <Typography variant="caption" sx={{ color: '#64748B' }}>
                              Manifiesto: {item.manifiesto}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Person sx={{ fontSize: 12, color: '#94A3B8' }} />
                            <Typography variant="caption" sx={{ color: '#64748B' }}>{item.usuario}</Typography>
                          </Box>
                        </Box>
                        {item.observaciones && (
                          <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                            {item.observaciones}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* ── Dialog: Recuperar faltante ──────────────────────────────────── */}
      <Dialog open={openRecuperar} onClose={() => !recuperarMutation.isPending && setOpenRecuperar(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle sx={{ color: '#16A34A' }} />
          Recuperar Estiba Faltante
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 2.5 }}>
            Confirme que la estiba fue recuperada. Se moverá al estado <strong>EN INVENTARIO</strong>.
          </Typography>
          <TextField
            label="Observación *"
            fullWidth
            multiline
            rows={3}
            size="small"
            value={obsRecuperar}
            onChange={e => setObsRecuperar(e.target.value)}
            placeholder="Describe cómo y dónde fue recuperada la estiba..."
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Bodega destino (opcional)</InputLabel>
            <Select
              value={bodegaRecuperar}
              label="Bodega destino (opcional)"
              onChange={e => setBodegaRecuperar(e.target.value)}
            >
              <MenuItem value=""><em>Sin asignar</em></MenuItem>
              {(ubicaciones as any[])
                .filter((u: any) => u.tipo === 'BODEGA' && u.activo !== false)
                .map((u: any) => (
                  <MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenRecuperar(false)} disabled={recuperarMutation.isPending}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => recuperarMutation.mutate()}
            disabled={!obsRecuperar.trim() || recuperarMutation.isPending}
            sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}
          >
            {recuperarMutation.isPending ? 'Guardando...' : 'Confirmar recuperación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Confirmar pérdida ────────────────────────────────────── */}
      <Dialog open={openPerdida} onClose={() => !perdidaMutation.isPending && setOpenPerdida(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Cancel sx={{ color: '#DC2626' }} />
          Confirmar Pérdida de Estiba
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="error" sx={{ mb: 2 }}>
            Esta acción moverá la estiba al estado <strong>BAJA</strong>. No se puede revertir fácilmente.
          </Alert>
          <TextField
            label="Observación *"
            fullWidth
            multiline
            rows={3}
            size="small"
            value={obsPerdida}
            onChange={e => setObsPerdida(e.target.value)}
            placeholder="Describe las circunstancias de la pérdida..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenPerdida(false)} disabled={perdidaMutation.isPending}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => perdidaMutation.mutate()}
            disabled={!obsPerdida.trim() || perdidaMutation.isPending}
            sx={{ bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' } }}
          >
            {perdidaMutation.isPending ? 'Guardando...' : 'Confirmar pérdida definitiva'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Ver QR */}
      <Dialog open={openQr} onClose={() => setOpenQr(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, textAlign: 'center' }}>
          Código QR — {estiba?.codigo_interno}
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
          {estiba?.codigo_qr ? (
            <>
              <Box component="img" src={estiba.codigo_qr} alt="QR Code"
                sx={{ width: '85%', maxWidth: 240, display: 'block', mx: 'auto', mb: 1.5 }} />
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748B', display: 'block' }}>
                {estiba.codigo_interno}
              </Typography>
            </>
          ) : (
            <Typography sx={{ color: '#94A3B8', py: 3 }}>Sin código QR generado</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 1 }}>
          {estiba?.codigo_qr && (
            <Button variant="contained" component="a" href={estiba.codigo_qr}
              download={`${estiba.codigo_interno}_QR.png`}
              sx={{ bgcolor: '#32AC5C', '&:hover': { bgcolor: '#27884A' } }}>
              Descargar
            </Button>
          )}
          <Button onClick={() => setOpenQr(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={openEdit} onClose={() => !updateMutation.isPending && setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Editar Estiba — {estiba?.codigo_interno}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select value={editForm.tipo ?? ''} label="Tipo"
                  onChange={e => {
                    const tipo = e.target.value
                    const mats = MATERIALES[tipo] ?? []
                    setEditForm((f: any) => ({ ...f, tipo, material: mats[0] ?? '' }))
                  }}>
                  {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Material</InputLabel>
                <Select value={editForm.material ?? ''} label="Material"
                  onChange={e => setEditForm((f: any) => ({ ...f, material: e.target.value }))}>
                  {(MATERIALES[editForm.tipo] ?? []).map((m: string) => (
                    <MenuItem key={m} value={m}>{m.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Propietario</InputLabel>
                <Select value={editForm.tipo_propietario ?? ''} label="Propietario"
                  onChange={e => setEditForm((f: any) => ({ ...f, tipo_propietario: e.target.value }))}>
                  {PROPIETARIOS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label="Largo (cm)" type="number" fullWidth size="small"
                value={editForm.largo_cm ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, largo_cm: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label="Ancho (cm)" type="number" fullWidth size="small"
                value={editForm.ancho_cm ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, ancho_cm: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label="Alto (cm)" type="number" fullWidth size="small"
                value={editForm.alto_cm ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, alto_cm: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label="Peso (kg)" type="number" fullWidth size="small"
                value={editForm.peso_kg ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, peso_kg: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Capacidad carga (kg)" type="number" fullWidth size="small"
                value={editForm.capacidad_carga_kg ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, capacidad_carga_kg: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Valor de compra (COP)" type="number" fullWidth size="small"
                value={editForm.valor_compra ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, valor_compra: e.target.value }))}
                placeholder="Opcional" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Observaciones" fullWidth size="small" multiline rows={2}
                value={editForm.observaciones ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, observaciones: e.target.value }))} />
            </Grid>
            {editError && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ py: 0.5 }}>{editError}</Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenEdit(false)} disabled={updateMutation.isPending}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
