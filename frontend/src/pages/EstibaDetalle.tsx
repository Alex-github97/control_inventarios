import React from 'react'
import {
  Grid, Card, CardContent, Typography, Box, Chip, Button,
  Divider, Skeleton, Alert, Avatar, Timeline, TimelineItem,
  TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot, TimelineOppositeContent
} from '@mui/material'
import {
  ArrowBack, QrCode2, Edit, LocalShipping, LocationOn,
  CalendarToday, Person, Inventory2, Warning
} from '@mui/icons-material'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { estibasApi } from '@/api/estibas'
import { Layout } from '@/components/layout/Layout'
import { StatusChip } from '@/components/common/StatusChip'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

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

export default function EstibaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: estiba, isLoading, error } = useQuery({
    queryKey: ['estiba', id],
    queryFn: () => estibasApi.obtener(Number(id)),
  })

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
        <Button variant="outlined" startIcon={<QrCode2 />}>Ver QR</Button>
        <Button variant="contained" startIcon={<Edit />}>Editar</Button>
      </Box>

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
    </Layout>
  )
}
