import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, IconButton, Tooltip, FormControl,
  InputLabel, Select, MenuItem, Alert as MuiAlert,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, TextField,
} from '@mui/material'
import {
  CheckCircle, NotificationsActive, OpenInNew,
  Inventory2, LocalShipping, LocationOn, Warning, Assignment,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { StatusChip } from '@/components/common/StatusChip'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const NIVEL_COLORS: Record<string, { bg: string; color: string }> = {
  INFO:        { bg: '#DBEAFE', color: '#2563EB' },
  ADVERTENCIA: { bg: '#FEF3C7', color: '#D97706' },
  CRITICA:     { bg: '#FEE2E2', color: '#DC2626' },
}

const TIPO_LABELS: Record<string, string> = {
  ESTIBA_FALTANTE:       'Estiba faltante',
  STOCK_BAJO:            'Stock bajo',
  ESTIBA_FUERA_TIEMPO:   'Fuera de tiempo',
  CONTRATO_POR_VENCER:   'Contrato por vencer',
  DANO_RECURRENTE:       'Daño recurrente',
  DIFERENCIA_INVENTARIO: 'Diferencia inventario',
  ESTIBA_PERDIDA:        'Estiba perdida',
  MANIFIESTO_RETRASADO:  'Manifiesto retrasado',
  CAPACIDAD_BAJA:        'Capacidad baja',
}

function AlertaDetalleDialog({
  alerta,
  onClose,
  onResolver,
}: {
  alerta: any
  onClose: () => void
  onResolver: (alerta: { id: number; titulo: string }) => void
}) {
  const navigate = useNavigate()
  const nc = NIVEL_COLORS[alerta.nivel] || { bg: '#F1F5F9', color: '#64748B' }

  const { data: estiba, isLoading: loadingEstiba } = useQuery({
    queryKey: ['alerta-estiba', alerta.estiba_id],
    queryFn: () => apiClient.get(`/estibas/${alerta.estiba_id}`).then(r => r.data),
    enabled: !!alerta.estiba_id,
    staleTime: 30000,
  })

  const { data: manifiesto, isLoading: loadingManifiesto } = useQuery({
    queryKey: ['alerta-manifiesto', alerta.manifiesto_id],
    queryFn: () => apiClient.get(`/manifiestos/${alerta.manifiesto_id}`).then(r => r.data),
    enabled: !!alerta.manifiesto_id,
    staleTime: 30000,
  })

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip
                label={alerta.nivel}
                size="small"
                sx={{ bgcolor: nc.bg, color: nc.color, fontWeight: 800, fontSize: 11 }}
              />
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                {TIPO_LABELS[alerta.tipo] ?? alerta.tipo.replace(/_/g, ' ')}
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3, fontSize: 16 }}>
              {alerta.titulo}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
              {format(new Date(alerta.created_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Descripción */}
        {alerta.descripcion && (
          <Box sx={{ px: 3, py: 2, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
              {alerta.descripcion}
            </Typography>
          </Box>
        )}

        {/* Detalle de Estiba */}
        {alerta.estiba_id && (
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #E2E8F0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Inventory2 sx={{ fontSize: 16, color: '#64748B' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#374151' }}>
                Estiba involucrada
              </Typography>
            </Box>
            {loadingEstiba ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {[1, 2, 3].map(i => <Skeleton key={i} height={20} />)}
              </Box>
            ) : estiba ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {[
                  { label: 'Código', value: estiba.codigo_interno },
                  { label: 'Tipo', value: estiba.tipo },
                  { label: 'Estado actual', value: <StatusChip status={estiba.estado} size="small" /> },
                  { label: 'Ubicación', value: estiba.ubicacion_actual?.nombre ?? 'Sin ubicación' },
                  ...(estiba.valor_actual ? [{
                    label: 'Valor',
                    value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(estiba.valor_actual),
                  }] : []),
                ].map(({ label, value }) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#64748B', fontSize: 13 }}>{label}</Typography>
                    {typeof value === 'string'
                      ? <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{value}</Typography>
                      : value
                    }
                  </Box>
                ))}
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNew fontSize="small" />}
                  onClick={() => { navigate(`/estibas/${alerta.estiba_id}`); onClose() }}
                  sx={{ mt: 1, alignSelf: 'flex-start', fontSize: 12 }}
                >
                  Ver detalle de la estiba
                </Button>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>No se pudo cargar la estiba</Typography>
            )}
          </Box>
        )}

        {/* Detalle de Manifiesto */}
        {alerta.manifiesto_id && (
          <Box sx={{ px: 3, py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Assignment sx={{ fontSize: 16, color: '#64748B' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#374151' }}>
                Manifiesto de origen
              </Typography>
            </Box>
            {loadingManifiesto ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {[1, 2, 3].map(i => <Skeleton key={i} height={20} />)}
              </Box>
            ) : manifiesto ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {[
                  { label: 'Número', value: manifiesto.numero },
                  { label: 'Estado', value: <StatusChip status={manifiesto.estado} size="small" /> },
                  ...(manifiesto.vehiculo ? [{ label: 'Vehículo', value: manifiesto.vehiculo.placa }] : []),
                  ...(manifiesto.conductor ? [{ label: 'Conductor', value: `${manifiesto.conductor.nombre} ${manifiesto.conductor.apellido ?? ''}`.trim() }] : []),
                  ...(manifiesto.ruta ? [{ label: 'Ruta', value: manifiesto.ruta }] : []),
                  ...(manifiesto.cliente_nombre ? [{ label: 'Cliente', value: manifiesto.cliente_nombre }] : []),
                  { label: 'Fecha salida', value: manifiesto.fecha_salida ? format(new Date(manifiesto.fecha_salida), 'dd/MM/yyyy HH:mm', { locale: es }) : '—' },
                ].map(({ label, value }) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#64748B', fontSize: 13 }}>{label}</Typography>
                    {typeof value === 'string'
                      ? <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{value}</Typography>
                      : value
                    }
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>No se pudo cargar el manifiesto</Typography>
            )}
          </Box>
        )}

        {/* Estado de resolución */}
        {alerta.resuelta && (
          <Box sx={{ px: 3, py: 1.5, bgcolor: '#F0FDF4', borderTop: '1px solid #BBF7D0' }}>
            <Typography variant="body2" sx={{ color: '#16A34A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CheckCircle sx={{ fontSize: 14 }} />
              Alerta resuelta
              {alerta.fecha_resolucion && ` — ${format(new Date(alerta.fecha_resolucion), 'dd/MM/yyyy HH:mm', { locale: es })}`}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} sx={{ color: '#64748B' }}>Cerrar</Button>
        {!alerta.resuelta && (
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={() => { onResolver({ id: alerta.id, titulo: alerta.titulo }); onClose() }}
            sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}
          >
            Marcar como resuelta
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default function Alertas() {
  const queryClient = useQueryClient()
  const [filtroResuelta, setFiltroResuelta] = useState<string>('false')
  const [filtroNivel, setFiltroNivel] = useState<string>('')
  const [selectedAlerta, setSelectedAlerta] = useState<any | null>(null)
  const [resolverDialog, setResolverDialog] = useState<{ id: number; titulo: string } | null>(null)
  const [obsResolucion, setObsResolucion] = useState('')

  const { data: alertas, isLoading } = useQuery({
    queryKey: ['alertas', filtroResuelta, filtroNivel],
    queryFn: () => apiClient.get('/alertas', {
      params: {
        resuelta: filtroResuelta,
        ...(filtroNivel && { nivel: filtroNivel }),
        limit: 100,
      }
    }).then(r => r.data),
  })

  const resolverMutation = useMutation({
    mutationFn: ({ id, observacion }: { id: number; observacion: string }) =>
      apiClient.patch(`/alertas/${id}/resolver`, { observacion }).then(r => r.data),
    onSuccess: () => {
      toast.success('Alerta resuelta')
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      queryClient.invalidateQueries({ queryKey: ['alertas-count'] })
      queryClient.invalidateQueries({ queryKey: ['alertas-preview'] })
      setResolverDialog(null)
      setObsResolucion('')
      setSelectedAlerta(null)
    },
  })

  const abrirResolver = (e: React.MouseEvent, alerta: any) => {
    e.stopPropagation()
    setResolverDialog({ id: alerta.id, titulo: alerta.titulo })
  }

  return (
    <Layout title="Alertas">
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Estado</InputLabel>
          <Select value={filtroResuelta} label="Estado" onChange={e => setFiltroResuelta(e.target.value)}>
            <MenuItem value="false">Pendientes</MenuItem>
            <MenuItem value="true">Resueltas</MenuItem>
            <MenuItem value="">Todas</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Nivel</InputLabel>
          <Select value={filtroNivel} label="Nivel" onChange={e => setFiltroNivel(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="INFO">Info</MenuItem>
            <MenuItem value="ADVERTENCIA">Advertencia</MenuItem>
            <MenuItem value="CRITICA">Crítica</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nivel</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Título</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
              )) : (alertas || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                    <NotificationsActive sx={{ fontSize: 36, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                    No hay alertas
                  </TableCell>
                </TableRow>
              ) : (alertas || []).map((a: any) => {
                const nc = NIVEL_COLORS[a.nivel] || { bg: '#F1F5F9', color: '#64748B' }
                return (
                  <TableRow
                    key={a.id}
                    onClick={() => setSelectedAlerta(a)}
                    sx={{
                      opacity: a.resuelta ? 0.6 : 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#F8FAFC' },
                      transition: 'background 0.15s',
                    }}
                  >
                    <TableCell>
                      <Chip label={a.nivel} size="small"
                        sx={{ bgcolor: nc.bg, color: nc.color, fontWeight: 700, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 12, color: '#64748B' }}>
                        {TIPO_LABELS[a.tipo] ?? a.tipo.replace(/_/g, ' ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: a.leida ? 400 : 700 }}>{a.titulo}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {format(new Date(a.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {a.resuelta ? (
                        <Chip label="Resuelta" size="small" sx={{ bgcolor: '#DCFCE7', color: '#16A34A', fontSize: 11 }} />
                      ) : (
                        <Chip label="Pendiente" size="small" sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontSize: 11 }} />
                      )}
                    </TableCell>
                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                      {!a.resuelta && (
                        <Tooltip title="Resolver alerta">
                          <IconButton size="small" color="success" onClick={(e) => abrirResolver(e, a)}>
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {selectedAlerta && (
        <AlertaDetalleDialog
          alerta={selectedAlerta}
          onClose={() => setSelectedAlerta(null)}
          onResolver={(a) => setResolverDialog({ id: a.id, titulo: a.titulo })}
        />
      )}

      {/* ── Dialog: Resolver alerta ────────────────────────────────────── */}
      <Dialog
        open={!!resolverDialog}
        onClose={() => !resolverMutation.isPending && (setResolverDialog(null), setObsResolucion(''))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle sx={{ color: '#16A34A' }} />
          Resolver alerta
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
            {resolverDialog?.titulo}
          </Typography>
          <TextField
            label="Observación / acción tomada *"
            fullWidth
            multiline
            rows={3}
            size="small"
            value={obsResolucion}
            onChange={e => setObsResolucion(e.target.value)}
            placeholder="Describe qué acción se tomó para resolver esta alerta..."
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => { setResolverDialog(null); setObsResolucion('') }}
            disabled={resolverMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={() => resolverMutation.mutate({ id: resolverDialog!.id, observacion: obsResolucion })}
            disabled={!obsResolucion.trim() || resolverMutation.isPending}
            sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}
          >
            {resolverMutation.isPending ? 'Guardando...' : 'Confirmar resolución'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
