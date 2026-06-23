import React, { useState } from 'react'
import {
  Box, Card, Typography, Grid, Skeleton, alpha, Tabs, Tab,
  Table, TableBody, TableCell, TableHead, TableRow, Chip,
  LinearProgress,
} from '@mui/material'
import { Assessment, TrendingUp, TrendingDown, AccountBalance } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'

const ERP_COLOR = '#1A3A6B'

function formatCurrency(v: number | null | undefined) {
  if (v == null) return '$ 0'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return '0.0%'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

interface EstadoResultados {
  ingresos_operacionales: number
  costo_ventas: number
  utilidad_bruta: number
  gastos_admin: number
  gastos_ventas: number
  ebitda: number
  depreciacion: number
  ebit: number
  gastos_financieros: number
  utilidad_antes_impuestos: number
  impuestos: number
  utilidad_neta: number
  margen_bruto_pct: number
  margen_ebitda_pct: number
  margen_neto_pct: number
}

interface BalanceGeneral {
  activos_corrientes: number
  activos_fijos: number
  otros_activos: number
  total_activos: number
  pasivos_corrientes: number
  pasivos_largo_plazo: number
  total_pasivos: number
  patrimonio: number
  total_pasivos_patrimonio: number
}

interface FlujoCaja {
  mes: string
  operacional: number
  inversion: number
  financiacion: number
  flujo_neto: number
  saldo_inicial: number
  saldo_final: number
}

interface KPIFinanciero {
  nombre: string
  valor: number
  unidad: string
  variacion: number
  benchmark: string
}

export default function ERPReportes() {
  const [tab, setTab] = useState(0)

  const { data: er, isLoading: loadingER } = useQuery<EstadoResultados>({
    queryKey: ['erp-estado-resultados'],
    queryFn: () => apiClient.get('/erp/reportes/estado-resultados').then(r => r.data),
  })

  const { data: bg, isLoading: loadingBG } = useQuery<BalanceGeneral>({
    queryKey: ['erp-balance-general'],
    queryFn: () => apiClient.get('/erp/reportes/balance-general').then(r => r.data),
  })

  const { data: flujoCaja = [], isLoading: loadingFC } = useQuery<FlujoCaja[]>({
    queryKey: ['erp-flujo-caja'],
    queryFn: () => apiClient.get('/erp/reportes/flujo-caja').then(r => r.data),
  })

  const { data: kpis = [], isLoading: loadingKPIs } = useQuery<KPIFinanciero[]>({
    queryKey: ['erp-kpis-financieros'],
    queryFn: () => apiClient.get('/erp/reportes/kpis').then(r => r.data),
  })

  return (
    <Layout title="ERP — Reportes Financieros">
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${ERP_COLOR} 0%, #0D2347 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Assessment sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#1E293B' }}>Reportes Financieros Integrados</Typography>
            <Typography variant="body2" sx={{ color: '#64748B', fontSize: 12 }}>ERP · Estado de resultados, balance general, flujo de caja y KPIs</Typography>
          </Box>
          <Chip label="REPORTES" size="small" sx={{ ml: 'auto', bgcolor: alpha(ERP_COLOR, 0.1), color: ERP_COLOR, fontWeight: 700, fontSize: 11, height: 24, letterSpacing: '0.05em' }} />
        </Box>
      </Box>

      <Card sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: '1px solid #F1F5F9', px: 2, pt: 1 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', color: '#64748B', minHeight: 44, px: 2 }, '& .Mui-selected': { color: ERP_COLOR }, '& .MuiTabs-indicator': { bgcolor: ERP_COLOR, height: 2 } }}>
            <Tab label="Estado de Resultados" />
            <Tab label="Balance General" />
            <Tab label="Flujo de Caja" />
            <Tab label="KPIs Financieros" />
          </Tabs>
        </Box>

        {/* Tab 0: Income statement */}
        {tab === 0 && (
          <Box sx={{ p: 3 }}>
            {loadingER ? (
              <Grid container spacing={2}>{Array.from({ length: 6 }).map((_, i) => <Grid item xs={12} key={i}><Skeleton height={32} /></Grid>)}</Grid>
            ) : !er ? (
              <Box sx={{ textAlign: 'center', py: 6 }}><Typography sx={{ color: '#94A3B8' }}>No hay datos disponibles</Typography></Box>
            ) : (
              <Table size="small">
                <TableBody>
                  {[
                    { label: 'Ingresos Operacionales', value: er.ingresos_operacionales, bold: true, indent: 0, color: '#16A34A' },
                    { label: 'Costo de Ventas', value: -er.costo_ventas, bold: false, indent: 1, color: '#DC2626' },
                    { label: 'UTILIDAD BRUTA', value: er.utilidad_bruta, bold: true, indent: 0, color: er.utilidad_bruta >= 0 ? '#16A34A' : '#DC2626', divider: true },
                    { label: `   Margen Bruto: ${er.margen_bruto_pct?.toFixed(1)}%`, value: null, bold: false, indent: 2, color: '#64748B' },
                    { label: 'Gastos de Administración', value: -er.gastos_admin, bold: false, indent: 1, color: '#DC2626' },
                    { label: 'Gastos de Ventas', value: -er.gastos_ventas, bold: false, indent: 1, color: '#DC2626' },
                    { label: 'EBITDA', value: er.ebitda, bold: true, indent: 0, color: er.ebitda >= 0 ? '#16A34A' : '#DC2626', divider: true },
                    { label: `   Margen EBITDA: ${er.margen_ebitda_pct?.toFixed(1)}%`, value: null, bold: false, indent: 2, color: '#64748B' },
                    { label: 'Depreciación y Amortización', value: -er.depreciacion, bold: false, indent: 1, color: '#DC2626' },
                    { label: 'EBIT (Resultado Operacional)', value: er.ebit, bold: true, indent: 0, color: er.ebit >= 0 ? '#16A34A' : '#DC2626', divider: true },
                    { label: 'Gastos Financieros', value: -er.gastos_financieros, bold: false, indent: 1, color: '#DC2626' },
                    { label: 'UTILIDAD ANTES DE IMPUESTOS', value: er.utilidad_antes_impuestos, bold: true, indent: 0, color: er.utilidad_antes_impuestos >= 0 ? '#16A34A' : '#DC2626', divider: true },
                    { label: 'Impuesto de Renta', value: -er.impuestos, bold: false, indent: 1, color: '#DC2626' },
                    { label: 'UTILIDAD NETA', value: er.utilidad_neta, bold: true, indent: 0, color: er.utilidad_neta >= 0 ? '#16A34A' : '#DC2626', divider: true },
                    { label: `   Margen Neto: ${er.margen_neto_pct?.toFixed(1)}%`, value: null, bold: false, indent: 2, color: '#64748B' },
                  ].map((row, i) => (
                    <TableRow key={i} sx={row.divider ? { borderTop: `2px solid ${alpha(ERP_COLOR, 0.15)}`, bgcolor: alpha(ERP_COLOR, 0.02) } : {}}>
                      <TableCell sx={{ pl: 2 + (row.indent * 2), py: 0.75, borderBottom: 'none' }}>
                        <Typography sx={{ fontSize: row.bold ? '0.85rem' : '0.8rem', fontWeight: row.bold ? 700 : 400, color: row.bold ? '#1E293B' : '#64748B' }}>{row.label}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.75, borderBottom: 'none', minWidth: 180 }}>
                        {row.value !== null && (
                          <Typography sx={{ fontSize: row.bold ? '0.9rem' : '0.875rem', fontWeight: row.bold ? 800 : 400, fontFamily: 'monospace', color: row.color }}>{formatCurrency(row.value)}</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}

        {/* Tab 1: Balance sheet */}
        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            {loadingBG ? (
              <Skeleton height={300} />
            ) : !bg ? (
              <Box sx={{ textAlign: 'center', py: 6 }}><Typography sx={{ color: '#94A3B8' }}>No hay datos disponibles</Typography></Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94A3B8', mb: 1.5 }}>ACTIVOS</Typography>
                  {[
                    { label: 'Activos Corrientes', value: bg.activos_corrientes, pct: bg.total_activos ? (bg.activos_corrientes / bg.total_activos) * 100 : 0 },
                    { label: 'Activos Fijos (Neto)', value: bg.activos_fijos, pct: bg.total_activos ? (bg.activos_fijos / bg.total_activos) * 100 : 0 },
                    { label: 'Otros Activos', value: bg.otros_activos, pct: bg.total_activos ? (bg.otros_activos / bg.total_activos) * 100 : 0 },
                  ].map(item => (
                    <Box key={item.label} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>{item.label}</Typography>
                        <Typography sx={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(item.value)}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={item.pct} sx={{ height: 5, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: ERP_COLOR } }} />
                    </Box>
                  ))}
                  <Box sx={{ mt: 2, p: 1.5, borderRadius: '10px', bgcolor: alpha(ERP_COLOR, 0.06), border: `1px solid ${alpha(ERP_COLOR, 0.12)}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>TOTAL ACTIVOS</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: 'monospace', color: ERP_COLOR }}>{formatCurrency(bg.total_activos)}</Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94A3B8', mb: 1.5 }}>PASIVOS Y PATRIMONIO</Typography>
                  {[
                    { label: 'Pasivos Corrientes', value: bg.pasivos_corrientes, color: '#DC2626' },
                    { label: 'Pasivos Largo Plazo', value: bg.pasivos_largo_plazo, color: '#F59E0B' },
                    { label: 'Patrimonio', value: bg.patrimonio, color: '#16A34A' },
                  ].map(item => (
                    <Box key={item.label} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>{item.label}</Typography>
                        <Typography sx={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 600, color: item.color }}>{formatCurrency(item.value)}</Typography>
                      </Box>
                    </Box>
                  ))}
                  <Box sx={{ mt: 2, p: 1.5, borderRadius: '10px', bgcolor: alpha('#16A34A', 0.06), border: `1px solid ${alpha('#16A34A', 0.12)}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>TOTAL PASIVOS + PATRIMONIO</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: 'monospace', color: '#16A34A' }}>{formatCurrency(bg.total_pasivos_patrimonio)}</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        {/* Tab 2: Cash flow */}
        {tab === 2 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Mes</TableCell>
                  <TableCell align="right">Operacional</TableCell>
                  <TableCell align="right">Inversión</TableCell>
                  <TableCell align="right">Financiación</TableCell>
                  <TableCell align="right">Flujo Neto</TableCell>
                  <TableCell align="right">Saldo Inicial</TableCell>
                  <TableCell align="right">Saldo Final</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingFC ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}</TableRow>
                )) : flujoCaja.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><Typography sx={{ color: '#94A3B8' }}>No hay datos de flujo de caja</Typography></TableCell></TableRow>
                ) : flujoCaja.map(f => (
                  <TableRow key={f.mes}>
                    <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{f.mes}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: f.operacional >= 0 ? '#16A34A' : '#DC2626' }}>{formatCurrency(f.operacional)}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: f.inversion >= 0 ? '#16A34A' : '#DC2626' }}>{formatCurrency(f.inversion)}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: f.financiacion >= 0 ? '#16A34A' : '#DC2626' }}>{formatCurrency(f.financiacion)}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700, color: f.flujo_neto >= 0 ? '#16A34A' : '#DC2626' }}>{formatCurrency(f.flujo_neto)}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#64748B' }}>{formatCurrency(f.saldo_inicial)}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700, color: ERP_COLOR }}>{formatCurrency(f.saldo_final)}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Tab 3: Financial KPIs */}
        {tab === 3 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2}>
              {loadingKPIs ? Array.from({ length: 8 }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}><Skeleton height={100} sx={{ borderRadius: '14px' }} /></Grid>
              )) : kpis.length === 0 ? (
                <Grid item xs={12}><Box sx={{ textAlign: 'center', py: 6 }}><AccountBalance sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} /><Typography sx={{ color: '#94A3B8' }}>No hay KPIs disponibles</Typography></Box></Grid>
              ) : kpis.map(kpi => (
                <Grid item xs={12} sm={6} md={4} key={kpi.nombre}>
                  <Card sx={{ p: 2.5, borderRadius: '14px', border: `1px solid ${alpha(ERP_COLOR, 0.1)}`, background: `linear-gradient(135deg, ${alpha(ERP_COLOR, 0.03)} 0%, #fff 100%)` }}>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94A3B8', mb: 0.5 }}>{kpi.nombre}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                      <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: ERP_COLOR, fontFamily: 'monospace' }}>{kpi.valor.toFixed(1)}</Typography>
                      <Typography sx={{ fontSize: '0.85rem', color: '#94A3B8' }}>{kpi.unidad}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {kpi.variacion >= 0
                        ? <TrendingUp sx={{ fontSize: 14, color: '#16A34A' }} />
                        : <TrendingDown sx={{ fontSize: 14, color: '#DC2626' }} />}
                      <Typography sx={{ fontSize: '0.72rem', color: kpi.variacion >= 0 ? '#16A34A' : '#DC2626' }}>{fmtPct(kpi.variacion)} vs período anterior</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.68rem', color: '#94A3B8', mt: 0.5 }}>Benchmark: {kpi.benchmark}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Card>
    </Layout>
  )
}
