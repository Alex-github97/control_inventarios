import React, { useState } from 'react'
import {
  Box, Card, CardContent, Typography, TextField, Button,
  InputAdornment, Alert, Skeleton, Divider, Chip, Avatar
} from '@mui/material'
import {
  QrCode2, Search, LocalShipping, LocationOn, Person,
  Timeline as TimelineIcon, Inventory2
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { estibasApi } from '@/api/estibas'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { StatusChip } from '@/components/common/StatusChip'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPO_COLORS: Record<string, string> = {
  CARGA: '#3B82F6', DESCARGA: '#32AC5C', TRANSFERENCIA: '#8B5CF6',
  RETORNO: '#F59E0B', BAJA: '#EF4444', REPARACION: '#F97316',
  RECEPCION: '#06B6D4', INVENTARIO: '#64748B', INSPECCION: '#EC4899',
  DISPOSICION_FINAL: '#DC2626',
}

export default function Trazabilidad() {
  const [codigoInput, setCodigoInput] = useState('')
  const [codigo, setCodigo] = useState('')
  const [estiba, setEstiba] = useState<any>(null)
  const [trazabilidad, setTrazabilidad] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleBuscar = async () => {
    if (!codigoInput.trim()) return
    setLoading(true)
    setError('')
    try {
      const e = await estibasApi.buscar(codigoInput.trim())
      setEstiba(e)
      const t = await estibasApi.trazabilidad(e.id)
      setTrazabilidad(t)
      setCodigo(codigoInput.trim())
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Estiba no encontrada')
      setEstiba(null)
      setTrazabilidad([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Trazabilidad">
      {/* Búsqueda */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Consultar Trazabilidad de Estiba
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Ingrese código interno, QR o RFID..."
              value={codigoInput}
              onChange={e => setCodigoInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBuscar()}
              InputProps={{
                startAdornment: <InputAdornment position="start"><QrCode2 sx={{ color: '#94A3B8' }} /></InputAdornment>
              }}
            />
            <Button
              variant="contained" onClick={handleBuscar} disabled={loading}
              startIcon={<Search />} sx={{ minWidth: 130, px: 3 }}
            >
              {loading ? 'Buscando...' : 'Consultar'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {estiba && (
        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
          {/* Info estiba */}
          <Card sx={{ minWidth: 280, maxWidth: 320 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'monospace' }}>
                  {estiba.codigo_interno}
                </Typography>
                <StatusChip status={estiba.estado} />
              </Box>

              {[
                { label: 'Tipo', value: estiba.tipo },
                { label: 'Material', value: estiba.material },
                { label: 'Propietario', value: estiba.tipo_propietario },
                { label: 'Total Usos', value: estiba.total_usos },
                {
                  label: 'Ubicación Actual',
                  value: estiba.estado === 'FALTANTE' ? 'Desconocida'
                       : estiba.estado === 'PERDIDA'  ? 'Pérdida confirmada'
                       : (estiba.ubicacion_actual?.nombre ?? '—'),
                },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8, borderBottom: '1px solid #F1F5F9' }}>
                  <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>{label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>{value}</Typography>
                </Box>
              ))}

              {estiba.codigo_qr && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Box component="img" src={estiba.codigo_qr} sx={{ width: 120, height: 120 }} />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card sx={{ flex: 1, minWidth: 0 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <TimelineIcon sx={{ color: '#32AC5C' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Historial Completo ({trazabilidad.length} eventos)
                </Typography>
              </Box>

              {trazabilidad.length === 0 ? (
                <Typography sx={{ color: '#94A3B8', textAlign: 'center', py: 4 }}>
                  Sin movimientos registrados
                </Typography>
              ) : (
                <Box sx={{ position: 'relative', pl: 2 }}>
                  {trazabilidad.map((item: any, idx: number) => (
                    <Box key={item.id} sx={{ display: 'flex', gap: 2, mb: 1.5, position: 'relative' }}>
                      {idx < trazabilidad.length - 1 && (
                        <Box sx={{ position: 'absolute', left: 12, top: 28, bottom: -6, width: 2, bgcolor: '#E2E8F0' }} />
                      )}
                      <Avatar sx={{ width: 26, height: 26, bgcolor: TIPO_COLORS[item.tipo] || '#94A3B8', fontSize: 10, fontWeight: 700, flexShrink: 0, zIndex: 1 }}>
                        {item.tipo[0]}
                      </Avatar>
                      <Box sx={{ flex: 1, bgcolor: '#FAFBFC', borderRadius: 2, p: 1.5, border: '1px solid #F1F5F9' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Chip label={item.tipo.replace('_', ' ')} size="small"
                            sx={{ bgcolor: TIPO_COLORS[item.tipo] || '#94A3B8', color: '#FFF', fontSize: 10, fontWeight: 700, height: 18 }}
                          />
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            {format(new Date(item.fecha), 'dd/MM/yy HH:mm', { locale: es })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          {item.ubicacion_destino && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                              <LocationOn sx={{ fontSize: 11, color: '#94A3B8' }} />
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.ubicacion_destino}</Typography>
                            </Box>
                          )}
                          {item.vehiculo && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                              <LocalShipping sx={{ fontSize: 11, color: '#94A3B8' }} />
                              <Typography variant="caption">{item.vehiculo}</Typography>
                            </Box>
                          )}
                          {item.manifiesto && (
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Manif. {item.manifiesto}</Typography>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <Person sx={{ fontSize: 11, color: '#94A3B8' }} />
                            <Typography variant="caption" sx={{ color: '#64748B' }}>{item.usuario}</Typography>
                          </Box>
                        </Box>
                        {item.estado_antes && item.estado_despues && (
                          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <Chip label={item.estado_antes} size="small" sx={{ fontSize: 9, height: 16, bgcolor: '#F1F5F9' }} />
                            <Typography variant="caption">→</Typography>
                            <Chip label={item.estado_despues} size="small" sx={{ fontSize: 9, height: 16, bgcolor: '#DCFCE7', color: '#16A34A' }} />
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {!estiba && !error && !loading && (
        <Box sx={{ textAlign: 'center', py: 10, color: '#94A3B8' }}>
          <QrCode2 sx={{ fontSize: 72, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Consulta la trazabilidad de cualquier estiba
          </Typography>
          <Typography variant="body2">
            Ingresa el código interno, código QR o RFID de la estiba
          </Typography>
        </Box>
      )}
    </Layout>
  )
}
