// GRC Module — Inventario de Riesgos + Mapa de Calor 5×5
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Slider,
} from '@mui/material'
import { Warning, Add } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const PRIORIDAD_COLOR: Record<string, string> = {
  CRITICA: '#DC2626', ALTA: '#EA580C', MEDIA: '#D97706', BAJA: GRC_COLOR,
}

function nivelColor(nivel: number) {
  if (nivel >= 15) return '#DC2626'
  if (nivel >= 10) return '#EA580C'
  if (nivel >= 5)  return '#D97706'
  return GRC_COLOR
}

function cellColor(prob: number, imp: number) {
  const n = prob * imp
  const c = nivelColor(n)
  return alpha(c, 0.12 + Math.min(n / 25, 1) * 0.28)
}

const RIESGOS = [
  { codigo: 'RSK-2026-001', nombre: 'Pérdida de datos de clientes', tipo: 'CIBERNETICO', proceso: 'TI', responsable: 'CISO', prob_i: 3, imp_i: 5, prob_r: 2, imp_r: 4, prioridad: 'CRITICA', estado: 'TRATAMIENTO' },
  { codigo: 'RSK-2026-002', nombre: 'Incumplimiento normativa aduanera', tipo: 'REGULATORIO', proceso: 'Comercio Exterior', responsable: 'CLO', prob_i: 2, imp_i: 5, prob_r: 1, imp_r: 5, prioridad: 'CRITICA', estado: 'EN_ANALISIS' },
  { codigo: 'RSK-2026-003', nombre: 'Falla proveedor crítico logístico', tipo: 'OPERACIONAL', proceso: 'Operaciones', responsable: 'COO', prob_i: 3, imp_i: 4, prob_r: 2, imp_r: 4, prioridad: 'ALTA', estado: 'TRATAMIENTO' },
  { codigo: 'RSK-2026-004', nombre: 'Fraude interno en tesorería', tipo: 'FRAUDE', proceso: 'Financiero', responsable: 'CFO', prob_i: 1, imp_i: 5, prob_r: 1, imp_r: 5, prioridad: 'ALTA', estado: 'MITIGADO' },
  { codigo: 'RSK-2026-005', nombre: 'Accidente laboral bodega principal', tipo: 'SST', proceso: 'RRHH', responsable: 'Dir. RRHH', prob_i: 2, imp_i: 4, prob_r: 1, imp_r: 3, prioridad: 'MEDIA', estado: 'IDENTIFICADO' },
  { codigo: 'RSK-2026-006', nombre: 'Robo de mercancía en tránsito', tipo: 'SEGURIDAD_FISICA', proceso: 'TMS', responsable: 'Dir. Seguridad', prob_i: 3, imp_i: 3, prob_r: 2, imp_r: 2, prioridad: 'MEDIA', estado: 'TRATAMIENTO' },
  { codigo: 'RSK-2026-007', nombre: 'Fluctuación cambiaria importaciones', tipo: 'FINANCIERO', proceso: 'Financiero', responsable: 'CFO', prob_i: 4, imp_i: 2, prob_r: 3, imp_r: 2, prioridad: 'MEDIA', estado: 'ACEPTADO' },
  { codigo: 'RSK-2026-008', nombre: 'Pérdida de certificación ISO 9001', tipo: 'REPUTACIONAL', proceso: 'Calidad', responsable: 'Dir. Calidad', prob_i: 1, imp_i: 4, prob_r: 1, imp_r: 3, prioridad: 'BAJA', estado: 'MITIGADO' },
]

const KPIs = [
  { label: 'Críticos',    value: RIESGOS.filter(r => r.prioridad === 'CRITICA').length, color: '#DC2626' },
  { label: 'Altos',       value: RIESGOS.filter(r => r.prioridad === 'ALTA').length,    color: '#EA580C' },
  { label: 'Medios',      value: RIESGOS.filter(r => r.prioridad === 'MEDIA').length,   color: '#D97706' },
  { label: 'Total',       value: RIESGOS.length,                                         color: GRC_COLOR },
]

const LABELS_PROB = ['', 'Raro', 'Improbable', 'Posible', 'Probable', 'Casi Seguro']
const LABELS_IMP  = ['', 'Insignificante', 'Menor', 'Moderado', 'Mayor', 'Catastrófico']

export default function GRCRiesgos() {
  const [tab, setTab] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [prob, setProb] = useState(3)
  const [imp, setImp]   = useState(3)
  const nivelActual = prob * imp

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Warning sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Inventario de Riesgos</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>GRC · ISO 31000 · COSO ERM · Mapa de Calor 5×5</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Nuevo Riesgo
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {KPIs.map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Typography sx={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'rgba(255,255,255,0.45)', fontSize: 13 }, '& .Mui-selected': { color: GRC_COLOR }, '& .MuiTabs-indicator': { bgcolor: GRC_COLOR } }}>
          <Tab label="Mapa de Calor 5×5" />
          <Tab label="Inventario de Riesgos" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, color: '#FFF', mb: 2, fontSize: 14 }}>Mapa de Calor — Riesgos Inherentes</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {/* Y axis label */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', pr: 0.5 }}>
                      <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', textTransform: 'uppercase', letterSpacing: 1 }}>Probabilidad</Typography>
                    </Box>
                    <Box>
                      {[5,4,3,2,1].map(prob => (
                        <Box key={prob} sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                          <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', width: 60, alignSelf: 'center', textAlign: 'right', pr: 0.5 }}>{LABELS_PROB[prob]}</Typography>
                          {[1,2,3,4,5].map(imp => {
                            const riesgosCell = RIESGOS.filter(r => r.prob_i === prob && r.imp_i === imp)
                            return (
                              <Box key={imp} sx={{ width: 56, height: 44, borderRadius: 1, bgcolor: cellColor(prob, imp), display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {riesgosCell.length > 0 && (
                                  <>
                                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: nivelColor(prob * imp) }}>{riesgosCell.length}</Typography>
                                    <Typography sx={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>riesgo{riesgosCell.length > 1 ? 's' : ''}</Typography>
                                  </>
                                )}
                                <Typography sx={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', mt: riesgosCell.length ? 0 : 'auto' }}>{prob*imp}</Typography>
                              </Box>
                            )
                          })}
                        </Box>
                      ))}
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        <Box sx={{ width: 60 }} />
                        {LABELS_IMP.slice(1).map((l, i) => (
                          <Typography key={i} sx={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', width: 56, textAlign: 'center', lineHeight: 1.2 }}>{l}</Typography>
                        ))}
                      </Box>
                      <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textAlign: 'center', mt: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>Impacto</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, color: '#FFF', mb: 2, fontSize: 14 }}>Top Riesgos por Nivel</Typography>
                  {[...RIESGOS].sort((a,b) => (b.prob_i*b.imp_i) - (a.prob_i*a.imp_i)).slice(0,5).map(r => (
                    <Box key={r.codigo} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', flex: 1, mr: 1, lineHeight: 1.2 }}>{r.nombre}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          <Chip label={`${r.prob_i*r.imp_i}`} size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(nivelColor(r.prob_i*r.imp_i), 0.2), color: nivelColor(r.prob_i*r.imp_i), fontWeight: 800 }} />
                          <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>→</Typography>
                          <Chip label={`${r.prob_r*r.imp_r}`} size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(nivelColor(r.prob_r*r.imp_r), 0.15), color: nivelColor(r.prob_r*r.imp_r) }} />
                        </Box>
                      </Box>
                      <Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.3)' }}>{r.codigo} · {r.proceso}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', mb: 0.5 }}>Leyenda: Inherente → Residual</Typography>
                    {[{l:'Crítico (15-25)',c:'#DC2626'},{l:'Alto (10-14)',c:'#EA580C'},{l:'Medio (5-9)',c:'#D97706'},{l:'Bajo (1-4)',c:GRC_COLOR}].map(item => (
                      <Box key={item.l} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.c }} />
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{item.l}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Código</TableCell><TableCell>Riesgo</TableCell><TableCell>Tipo</TableCell><TableCell>Proceso</TableCell><TableCell>Prioridad</TableCell><TableCell>Nivel I.</TableCell><TableCell>Nivel R.</TableCell><TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {RIESGOS.map(r => (
                  <TableRow key={r.codigo} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 12 } }}>
                    <TableCell sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{r.codigo}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}><Typography sx={{ fontSize: 12.5, color: '#FFF', fontWeight: 600, lineHeight: 1.3 }}>{r.nombre}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: 11 }}>{r.tipo.replace('_', ' ')}</Typography></TableCell>
                    <TableCell>{r.proceso}</TableCell>
                    <TableCell><Chip label={r.prioridad} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(PRIORIDAD_COLOR[r.prioridad], 0.18), color: PRIORIDAD_COLOR[r.prioridad] }} /></TableCell>
                    <TableCell><Chip label={r.prob_i * r.imp_i} size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(nivelColor(r.prob_i*r.imp_i), 0.2), color: nivelColor(r.prob_i*r.imp_i), fontWeight: 800 }} /></TableCell>
                    <TableCell><Chip label={r.prob_r * r.imp_r} size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(nivelColor(r.prob_r*r.imp_r), 0.15), color: nivelColor(r.prob_r*r.imp_r) }} /></TableCell>
                    <TableCell><Chip label={r.estado} size="small" sx={{ fontSize: 9, height: 18, bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Riesgo</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre del Riesgo" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Tipo de Riesgo</InputLabel>
              <Select label="Tipo de Riesgo" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {['OPERACIONAL','FINANCIERO','REGULATORIO','REPUTACIONAL','CIBERNETICO','SST','FRAUDE','CONTINUIDAD','AMBIENTAL','MERCADO','SEGURIDAD_FISICA'].map(t => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Proceso / Área" fullWidth size="small" InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }} />
            <Box>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', mb: 1 }}>Probabilidad Inherente: {LABELS_PROB[prob]}</Typography>
              <Slider value={prob} onChange={(_, v) => setProb(v as number)} min={1} max={5} step={1} marks sx={{ color: nivelColor(nivelActual) }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', mb: 1 }}>Impacto Inherente: {LABELS_IMP[imp]}</Typography>
              <Slider value={imp} onChange={(_, v) => setImp(v as number)} min={1} max={5} step={1} marks sx={{ color: nivelColor(nivelActual) }} />
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: alpha(nivelColor(nivelActual), 0.15), border: `1px solid ${alpha(nivelColor(nivelActual), 0.4)}`, display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Nivel Inherente</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: nivelColor(nivelActual) }}>{nivelActual} / 25</Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
            <Button variant="contained" onClick={() => setOpenDialog(false)} sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' } }}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
