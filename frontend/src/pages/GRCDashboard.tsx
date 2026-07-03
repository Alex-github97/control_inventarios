// GRC Module — Torre de Control GRC
import React from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, LinearProgress,
  List, ListItem, ListItemText, Divider,
} from '@mui/material'
import {
  Shield, Warning, CheckCircle, Policy, Gavel, Security,
  BugReport, Inventory, Timeline,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'

interface KPI { label: string; value: string | number; sub: string; color: string; icon: React.ReactNode; trend?: number }
const KPIs: KPI[] = [
  { label: 'Riesgos Abiertos',        value: 34,    sub: '8 críticos',         color: '#DC2626', icon: <Warning /> },
  { label: 'Controles Efectivos',      value: '82%', sub: '127 controles total', color: '#D97706', icon: <Shield /> },
  { label: 'Cumplimiento General',     value: '91%', sub: 'ISO 31000 · COSO',    color: GRC_COLOR, icon: <CheckCircle /> },
  { label: 'Hallazgos Abiertos',       value: 12,    sub: '3 vencidos',          color: '#EA580C', icon: <BugReport /> },
  { label: 'Políticas Vigentes',       value: 24,    sub: '2 por vencer',        color: '#0891B2', icon: <Policy /> },
  { label: 'Auditorías en Curso',      value: 3,     sub: '2 internas · 1 ext.',  color: GRC_COLOR, icon: <Gavel /> },
  { label: 'Incidentes Abiertos',      value: 5,     sub: '1 crítico',           color: '#DC2626', icon: <Security /> },
  { label: 'Obligaciones Vencidas',    value: 2,     sub: 'Acción inmediata',    color: '#DC2626', icon: <Inventory /> },
]

const RIESGOS_CRITICOS = [
  { codigo: 'RSK-2026-018', nombre: 'Pérdida de datos de clientes (GDPR)',  prioridad: 'CRITICA',  nivel: 20 },
  { codigo: 'RSK-2026-011', nombre: 'Incumplimiento normativa aduanera',    prioridad: 'CRITICA',  nivel: 16 },
  { codigo: 'RSK-2026-024', nombre: 'Falla proveedor crítico logístico',    prioridad: 'ALTA',     nivel: 15 },
  { codigo: 'RSK-2026-007', nombre: 'Ciberataque a sistemas de despacho',   prioridad: 'ALTA',     nivel: 12 },
  { codigo: 'RSK-2026-033', nombre: 'Incidente seguridad en bodega central',prioridad: 'ALTA',     nivel: 10 },
]
const PRIORIDAD_COLOR: Record<string, string> = {
  CRITICA: '#DC2626', ALTA: '#EA580C', MEDIA: '#D97706', BAJA: GRC_COLOR,
}

const PROXIMAS_AUDITORIAS = [
  { codigo: 'AUD-2026-003', nombre: 'ISO 27001 — Seguridad de la Información', fecha: '2026-07-05', tipo: 'Externa' },
  { codigo: 'AUD-2026-004', nombre: 'Continuidad de Negocio (BCP Test)',         fecha: '2026-07-18', tipo: 'Interna' },
  { codigo: 'AUD-2026-005', nombre: 'Cumplimiento Normativa Ambiental',           fecha: '2026-08-02', tipo: 'Interna' },
]

const COMPLIANCE_MARCOS = [
  { nombre: 'ISO 31000',    pct: 94, color: GRC_COLOR },
  { nombre: 'ISO 37301',    pct: 88, color: '#0891B2' },
  { nombre: 'ISO 27001',    pct: 76, color: '#EA580C' },
  { nombre: 'ISO 22301',    pct: 82, color: '#D97706' },
  { nombre: 'COSO ERM',     pct: 91, color: GRC_COLOR },
  { nombre: 'COBIT 2019',   pct: 79, color: '#0891B2' },
]

export default function GRCDashboard() {
  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Shield sx={{ color: GRC_COLOR, fontSize: 30 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Torre de Control GRC</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Governance · Risk · Compliance — Junio 2026</Typography>
          </Box>
          <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {KPIs.map(k => (
            <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>{k.label}</Typography>
                      <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>{k.sub}</Typography>
                    </Box>
                    <Box sx={{ color: alpha(k.color, 0.45), '& svg': { fontSize: 26 } }}>{k.icon}</Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          {/* Riesgos críticos */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Warning sx={{ color: '#DC2626', fontSize: 18 }} />
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14 }}>Riesgos Prioritarios</Typography>
                </Box>
                {RIESGOS_CRITICOS.map(r => (
                  <Box key={r.codigo} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12, color: 'text.primary', flex: 1, mr: 1 }}>{r.nombre}</Typography>
                      <Chip label={r.prioridad} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(PRIORIDAD_COLOR[r.prioridad], 0.18), color: PRIORIDAD_COLOR[r.prioridad] }} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled', width: 110 }}>{r.codigo}</Typography>
                      <LinearProgress variant="determinate" value={(r.nivel / 25) * 100} sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: 'text.disabled', '& .MuiLinearProgress-bar': { bgcolor: PRIORIDAD_COLOR[r.prioridad] } }} />
                      <Typography sx={{ fontSize: 10, color: PRIORIDAD_COLOR[r.prioridad], width: 20, textAlign: 'right', fontWeight: 700 }}>{r.nivel}</Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Marcos de cumplimiento */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CheckCircle sx={{ color: GRC_COLOR, fontSize: 18 }} />
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14 }}>Cumplimiento por Marco</Typography>
                </Box>
                {COMPLIANCE_MARCOS.map(m => (
                  <Box key={m.nombre} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{m.nombre}</Typography>
                      <Typography sx={{ fontSize: 12, color: m.color, fontWeight: 700 }}>{m.pct}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={m.pct} sx={{ height: 5, borderRadius: 2, bgcolor: 'text.disabled', '& .MuiLinearProgress-bar': { bgcolor: m.color } }} />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Próximas auditorías */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ border: `1px solid #E5E7EB`, borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Timeline sx={{ color: '#0891B2', fontSize: 18 }} />
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14 }}>Próximas Auditorías</Typography>
                </Box>
                <List dense disablePadding>
                  {PROXIMAS_AUDITORIAS.map((a, i) => (
                    <React.Fragment key={a.codigo}>
                      {i > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1 }} />}
                      <ListItem disablePadding>
                        <ListItemText
                          primary={<Typography sx={{ fontSize: 12, color: 'text.primary', lineHeight: 1.3 }}>{a.nombre}</Typography>}
                          secondary={
                            <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, alignItems: 'center' }}>
                              <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{a.fecha}</Typography>
                              <Chip label={a.tipo} size="small" sx={{ fontSize: 9, height: 16, bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR }} />
                            </Box>
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
