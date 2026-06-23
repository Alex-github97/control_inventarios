import React, { useState, useEffect } from 'react'
import {
  Box, Card, Typography, Button, Grid, TextField, Select,
  MenuItem, FormControl, InputLabel, alpha, Tabs, Tab,
  Switch, FormControlLabel, Chip, Table, TableBody, TableCell,
  TableHead, TableRow, Skeleton,
} from '@mui/material'
import { Settings, Save, Add } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const ERP_COLOR = '#1A3A6B'

interface ConfigGeneral {
  moneda_base: string
  norma_contable: string
  metodo_inventario: string
  periodo_fiscal_inicio: string
  dias_vencimiento_cxc: number
  dias_vencimiento_cxp: number
  aprobacion_compras: boolean
  aprobacion_presupuesto: boolean
}

interface TasaCambio {
  id: number
  moneda_origen: string
  moneda_destino: string
  tasa: number
  fecha_vigencia: string
  activo: boolean
}

interface Integracion {
  id: number
  modulo: string
  descripcion: string
  habilitada: boolean
  ultima_sincronizacion?: string
}

interface Numeracion {
  id: number
  tipo_documento: string
  prefijo: string
  consecutivo_actual: number
  consecutivo_maximo: number
  activo: boolean
}

const EMPTY_TASA = { moneda_origen: 'USD', moneda_destino: 'COP', tasa: '', fecha_vigencia: new Date().toISOString().slice(0, 10) }

export default function ERPConfig() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [openTasa, setOpenTasa] = useState(false)
  const [tasaForm, setTasaForm] = useState({ ...EMPTY_TASA })
  const [configForm, setConfigForm] = useState<Partial<ConfigGeneral>>({})

  const { data: config, isLoading: loadingConfig } = useQuery<ConfigGeneral>({
    queryKey: ['erp-config-general'],
    queryFn: () => apiClient.get('/erp/config/general').then(r => r.data),
  })

  useEffect(() => {
    if (config) setConfigForm(config)
  }, [config])

  const { data: tasas = [], isLoading: loadingTasas } = useQuery<TasaCambio[]>({
    queryKey: ['erp-tasas-cambio'],
    queryFn: () => apiClient.get('/erp/config/tasas-cambio').then(r => r.data),
  })

  const { data: integraciones = [], isLoading: loadingInt } = useQuery<Integracion[]>({
    queryKey: ['erp-integraciones'],
    queryFn: () => apiClient.get('/erp/config/integraciones').then(r => r.data),
  })

  const { data: numeraciones = [], isLoading: loadingNum } = useQuery<Numeracion[]>({
    queryKey: ['erp-numeraciones'],
    queryFn: () => apiClient.get('/erp/config/numeraciones').then(r => r.data),
  })

  const saveConfig = useMutation({
    mutationFn: (data: Partial<ConfigGeneral>) => apiClient.put('/erp/config/general', data).then(r => r.data),
    onSuccess: () => { toast.success('Configuración guardada'); qc.invalidateQueries({ queryKey: ['erp-config-general'] }) },
    onError: () => toast.error('Error al guardar configuración'),
  })

  const createTasa = useMutation({
    mutationFn: (data: typeof EMPTY_TASA) => apiClient.post('/erp/config/tasas-cambio', {
      ...data, tasa: parseFloat(String(data.tasa)),
    }).then(r => r.data),
    onSuccess: () => { toast.success('Tasa registrada'); qc.invalidateQueries({ queryKey: ['erp-tasas-cambio'] }); setOpenTasa(false); setTasaForm({ ...EMPTY_TASA }) },
    onError: () => toast.error('Error al registrar tasa'),
  })

  const toggleIntegracion = useMutation({
    mutationFn: ({ id, habilitada }: { id: number; habilitada: boolean }) =>
      apiClient.patch(`/erp/config/integraciones/${id}`, { habilitada }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['erp-integraciones'] }),
    onError: () => toast.error('Error al actualizar integración'),
  })

  return (
    <Layout title="ERP — Configuración">
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${ERP_COLOR} 0%, #0D2347 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Settings sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>Configuración del ERP</Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>ERP · Parámetros generales, monedas, integraciones y numeración</Typography>
          </Box>
          <Chip label="CONFIG" size="small" sx={{ ml: 'auto', bgcolor: alpha(ERP_COLOR, 0.1), color: ERP_COLOR, fontWeight: 700, fontSize: 11, height: 24, letterSpacing: '0.05em' }} />
        </Box>
      </Box>

      <Card sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: '1px solid #F1F5F9', px: 2, pt: 1 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', color: '#64748B', minHeight: 44, px: 2 }, '& .Mui-selected': { color: ERP_COLOR }, '& .MuiTabs-indicator': { bgcolor: ERP_COLOR, height: 2 } }}>
            <Tab label="General" />
            <Tab label="Tasas de Cambio" />
            <Tab label="Integraciones" />
            <Tab label="Numeración" />
          </Tabs>
        </Box>

        {/* Tab 0: General config */}
        {tab === 0 && (
          <Box sx={{ p: 3 }}>
            {loadingConfig ? (
              <Grid container spacing={2}>{Array.from({ length: 6 }).map((_, i) => <Grid item xs={12} sm={6} key={i}><Skeleton height={50} /></Grid>)}</Grid>
            ) : (
              <>
                <Grid container spacing={2.5} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Moneda Base</InputLabel>
                      <Select value={configForm.moneda_base ?? 'COP'} label="Moneda Base" onChange={e => setConfigForm(p => ({ ...p, moneda_base: e.target.value }))}>
                        {['COP', 'USD', 'EUR', 'BRL', 'MXN'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Norma Contable</InputLabel>
                      <Select value={configForm.norma_contable ?? 'IFRS'} label="Norma Contable" onChange={e => setConfigForm(p => ({ ...p, norma_contable: e.target.value }))}>
                        {['IFRS', 'US_GAAP', 'LOCAL_COLOMBIA'].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Método Inventario</InputLabel>
                      <Select value={configForm.metodo_inventario ?? 'PROMEDIO_PONDERADO'} label="Método Inventario" onChange={e => setConfigForm(p => ({ ...p, metodo_inventario: e.target.value }))}>
                        {['PROMEDIO_PONDERADO', 'PEPS', 'UEPS'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Inicio Período Fiscal</InputLabel>
                      <Select value={configForm.periodo_fiscal_inicio ?? 'ENERO'} label="Inicio Período Fiscal" onChange={e => setConfigForm(p => ({ ...p, periodo_fiscal_inicio: e.target.value }))}>
                        {['ENERO', 'ABRIL', 'JULIO', 'OCTUBRE'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField label="Días Vencimiento CxC" fullWidth size="small" type="number" value={configForm.dias_vencimiento_cxc ?? 30} onChange={e => setConfigForm(p => ({ ...p, dias_vencimiento_cxc: parseInt(e.target.value) }))} />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField label="Días Vencimiento CxP" fullWidth size="small" type="number" value={configForm.dias_vencimiento_cxp ?? 30} onChange={e => setConfigForm(p => ({ ...p, dias_vencimiento_cxp: parseInt(e.target.value) }))} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel control={<Switch checked={configForm.aprobacion_compras ?? false} onChange={e => setConfigForm(p => ({ ...p, aprobacion_compras: e.target.checked }))} sx={{ '& .MuiSwitch-thumb': { bgcolor: ERP_COLOR }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: alpha(ERP_COLOR, 0.5) } }} />} label={<Typography sx={{ fontSize: '0.875rem' }}>Requerir aprobación en compras</Typography>} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel control={<Switch checked={configForm.aprobacion_presupuesto ?? false} onChange={e => setConfigForm(p => ({ ...p, aprobacion_presupuesto: e.target.checked }))} sx={{ '& .MuiSwitch-thumb': { bgcolor: ERP_COLOR }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: alpha(ERP_COLOR, 0.5) } }} />} label={<Typography sx={{ fontSize: '0.875rem' }}>Requerir aprobación en presupuestos</Typography>} />
                  </Grid>
                </Grid>
                <Button variant="contained" startIcon={<Save />} onClick={() => saveConfig.mutate(configForm)} disabled={saveConfig.isPending} sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#0D2347' } }}>
                  {saveConfig.isPending ? 'Guardando...' : 'Guardar configuración'}
                </Button>
              </>
            )}
          </Box>
        )}

        {/* Tab 1: Exchange rates */}
        {tab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, borderBottom: '1px solid #F1F5F9' }}>
              <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpenTasa(true)} sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#0D2347' }, height: 34, fontSize: '0.8rem' }}>
                Nueva Tasa
              </Button>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Origen</TableCell>
                    <TableCell>Destino</TableCell>
                    <TableCell align="right">Tasa</TableCell>
                    <TableCell>Vigencia</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingTasas ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                  )) : tasas.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><Typography sx={{ color: '#94A3B8' }}>No hay tasas de cambio registradas</Typography></TableCell></TableRow>
                  ) : tasas.map(t => (
                    <TableRow key={t.id}>
                      <TableCell><Chip label={t.moneda_origen} size="small" sx={{ bgcolor: alpha(ERP_COLOR, 0.1), color: ERP_COLOR, fontWeight: 700, fontSize: '0.75rem', height: 22 }} /></TableCell>
                      <TableCell><Chip label={t.moneda_destino} size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 600, fontSize: '0.75rem', height: 22 }} /></TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700 }}>{t.tasa.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</Typography></TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{t.fecha_vigencia}</TableCell>
                      <TableCell><Chip label={t.activo ? 'Vigente' : 'Inactiva'} size="small" sx={{ bgcolor: t.activo ? '#F0FDF4' : '#F8FAFC', color: t.activo ? '#16A34A' : '#64748B', fontWeight: 600, fontSize: '0.7rem', height: 22 }} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {openTasa && (
              <Box sx={{ p: 3, borderTop: '1px solid #F1F5F9', bgcolor: '#FAFBFC' }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, mb: 2, color: '#1E293B' }}>Registrar nueva tasa de cambio</Typography>
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={6} sm={2}><FormControl fullWidth size="small"><InputLabel>Origen</InputLabel><Select value={tasaForm.moneda_origen} label="Origen" onChange={e => setTasaForm(p => ({ ...p, moneda_origen: e.target.value }))}>{['USD', 'EUR', 'GBP', 'BRL'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl></Grid>
                  <Grid item xs={6} sm={2}><FormControl fullWidth size="small"><InputLabel>Destino</InputLabel><Select value={tasaForm.moneda_destino} label="Destino" onChange={e => setTasaForm(p => ({ ...p, moneda_destino: e.target.value }))}>{['COP', 'USD', 'EUR'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}</Select></FormControl></Grid>
                  <Grid item xs={6} sm={3}><TextField label="Tasa" fullWidth size="small" type="number" value={tasaForm.tasa} onChange={e => setTasaForm(p => ({ ...p, tasa: e.target.value }))} /></Grid>
                  <Grid item xs={6} sm={3}><TextField label="Fecha Vigencia" fullWidth size="small" type="date" value={tasaForm.fecha_vigencia} onChange={e => setTasaForm(p => ({ ...p, fecha_vigencia: e.target.value }))} /></Grid>
                  <Grid item xs={12} sm={2} sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="contained" disabled={!tasaForm.tasa || createTasa.isPending} onClick={() => createTasa.mutate(tasaForm as typeof EMPTY_TASA)} sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: '#0D2347' }, flex: 1 }}>Guardar</Button>
                    <Button size="small" variant="outlined" onClick={() => setOpenTasa(false)}>✕</Button>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 2: Integrations */}
        {tab === 2 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Módulo</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Última Sincronización</TableCell>
                  <TableCell align="center">Habilitada</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingInt ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 4 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                )) : integraciones.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 5 }}><Typography sx={{ color: '#94A3B8' }}>No hay integraciones configuradas</Typography></TableCell></TableRow>
                ) : integraciones.map(integ => (
                  <TableRow key={integ.id}>
                    <TableCell><Chip label={integ.modulo} size="small" sx={{ bgcolor: alpha(ERP_COLOR, 0.08), color: ERP_COLOR, fontWeight: 700, fontSize: '0.75rem', height: 22 }} /></TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{integ.descripcion}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{integ.ultima_sincronizacion ?? 'Nunca'}</TableCell>
                    <TableCell align="center">
                      <Switch checked={integ.habilitada} size="small" onChange={e => toggleIntegracion.mutate({ id: integ.id, habilitada: e.target.checked })} sx={{ '& .MuiSwitch-thumb': { bgcolor: integ.habilitada ? ERP_COLOR : '#CBD5E1' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: alpha(ERP_COLOR, 0.4) } }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Tab 3: Document numbering */}
        {tab === 3 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tipo de Documento</TableCell>
                  <TableCell>Prefijo</TableCell>
                  <TableCell align="right">Consecutivo Actual</TableCell>
                  <TableCell align="right">Máximo</TableCell>
                  <TableCell>Disponibles</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingNum ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                )) : numeraciones.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><Typography sx={{ color: '#94A3B8' }}>No hay rangos de numeración configurados</Typography></TableCell></TableRow>
                ) : numeraciones.map(num => {
                  const disponibles = num.consecutivo_maximo - num.consecutivo_actual
                  const pctUsado = num.consecutivo_maximo > 0 ? (num.consecutivo_actual / num.consecutivo_maximo) * 100 : 0
                  return (
                    <TableRow key={num.id}>
                      <TableCell sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{num.tipo_documento}</TableCell>
                      <TableCell><Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: ERP_COLOR, fontSize: '0.875rem' }}>{num.prefijo}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{num.consecutivo_actual.toLocaleString()}</Typography></TableCell>
                      <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#64748B' }}>{num.consecutivo_maximo.toLocaleString()}</Typography></TableCell>
                      <TableCell sx={{ minWidth: 130 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9', overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${pctUsado}%`, bgcolor: pctUsado >= 90 ? '#DC2626' : pctUsado >= 70 ? '#F59E0B' : '#16A34A', borderRadius: 3, transition: 'width 0.5s' }} />
                          </Box>
                          <Typography sx={{ fontSize: '0.72rem', color: '#64748B', minWidth: 28 }}>{disponibles.toLocaleString()}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Chip label={num.activo ? 'Activo' : 'Inactivo'} size="small" sx={{ bgcolor: num.activo ? '#F0FDF4' : '#F8FAFC', color: num.activo ? '#16A34A' : '#64748B', fontWeight: 600, fontSize: '0.7rem', height: 22 }} /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>
    </Layout>
  )
}
