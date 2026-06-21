import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, LinearProgress, IconButton, Divider,
} from '@mui/material'
import { Policy, Add, CheckCircle, Warning, Schedule, HistoryEdu, Edit, Delete, Close, History, FileDownload, HowToReg } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const PAGE_BG   = '#060C1A'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'
const LBL       = alpha(GRC_COLOR, 0.85)

const ESTADO_COLOR: Record<string, string> = {
  PUBLICADA: '#059669', BORRADOR: '#D97706', REVISION: '#0891B2',
  VENCIDA: '#DC2626', ARCHIVADA: '#6B7280',
}

const initPoliticas = [
  { codigo: 'POL-2026-001', nombre: 'Política de Gestión de Riesgos Corporativos', tipo: 'Riesgos', version: '3.2', estado: 'PUBLICADA', propietario: 'CRMO', aprobador: 'CEO', vigencia: '2027-01-01', revision: '2026-12-01', aceptaciones: 128, requeridas: 145, descripcion: 'Esta política establece el marco corporativo para la identificación, evaluación, tratamiento y monitoreo de riesgos en todos los niveles de la organización, alineada con ISO 31000 y COSO ERM. Aplica a todos los empleados, contratistas y aliados estratégicos. Define roles, responsabilidades y procedimientos para garantizar una gestión de riesgos efectiva y consistente.', alcance: 'Toda la organización', periodicidad_revision: 'Anual' },
  { codigo: 'POL-2026-002', nombre: 'Política de Seguridad de la Información (ISO 27001)', tipo: 'Ciberseguridad', version: '2.1', estado: 'PUBLICADA', propietario: 'CISO', aprobador: 'CEO', vigencia: '2027-06-01', revision: '2026-11-01', aceptaciones: 210, requeridas: 210, descripcion: 'Define los principios y controles de seguridad de la información conforme a ISO 27001:2022. Establece requisitos de confidencialidad, integridad y disponibilidad de todos los activos de información de la organización, incluyendo sistemas, datos y procesos críticos.', alcance: 'Toda la organización', periodicidad_revision: 'Anual' },
  { codigo: 'POL-2026-003', nombre: 'Política de Cumplimiento Antisoborno (ISO 37001)', tipo: 'Compliance', version: '1.5', estado: 'PUBLICADA', propietario: 'CLO', aprobador: 'Junta', vigencia: '2026-12-31', revision: '2026-09-01', aceptaciones: 87, requeridas: 90, descripcion: 'Establece el marco de prevención, detección y respuesta a conductas de soborno, conforme a ISO 37001. Incluye debida diligencia de terceros, controles financieros, reportes confidenciales y sanciones aplicables.', alcance: 'Colaboradores, directivos y terceros', periodicidad_revision: 'Anual' },
  { codigo: 'POL-2026-004', nombre: 'Política de Continuidad del Negocio (ISO 22301)', tipo: 'Continuidad', version: '2.0', estado: 'REVISION', propietario: 'COO', aprobador: 'CEO', vigencia: '2026-07-01', revision: '2026-06-15', aceptaciones: 0, requeridas: 60, descripcion: 'Define la estrategia de continuidad operativa ante eventos disruptivos. Establece RTO, RPO y planes de contingencia para procesos críticos. Alineada con ISO 22301 e incluye requisitos de simulacros anuales.', alcance: 'Procesos y sistemas críticos', periodicidad_revision: 'Anual' },
  { codigo: 'POL-2026-005', nombre: 'Política de Gestión de Proveedores y Terceros', tipo: 'Terceros', version: '1.3', estado: 'PUBLICADA', propietario: 'Dir. Compras', aprobador: 'COO', vigencia: '2027-03-01', revision: '2026-12-01', aceptaciones: 42, requeridas: 45, descripcion: 'Establece los criterios de selección, evaluación y monitoreo de proveedores, contratistas y aliados estratégicos. Incluye due diligence de riesgos legales, financieros, reputacionales y de ciberseguridad.', alcance: 'Área de Compras y gestión contractual', periodicidad_revision: 'Anual' },
  { codigo: 'POL-2026-006', nombre: 'Política de Protección de Datos Personales', tipo: 'Privacidad', version: '4.0', estado: 'BORRADOR', propietario: 'CLO', aprobador: 'CEO', vigencia: null, revision: null, aceptaciones: 0, requeridas: 210, descripcion: 'Regula el tratamiento de datos personales conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013. Define derechos de los titulares, responsabilidades del tratamiento y medidas de seguridad aplicables.', alcance: 'Toda la organización y sistemas con datos personales', periodicidad_revision: 'Bianual' },
  { codigo: 'POL-2025-011', nombre: 'Política de Conflicto de Intereses', tipo: 'Ética', version: '1.0', estado: 'VENCIDA', propietario: 'CLO', aprobador: 'Junta', vigencia: '2026-01-01', revision: '2025-12-01', aceptaciones: 75, requeridas: 80, descripcion: 'Establece los lineamientos para identificar y gestionar situaciones de conflicto de intereses reales, potenciales o aparentes, aplicables a todos los colaboradores, directivos y miembros de junta.', alcance: 'Directivos, gerentes y colaboradores con poder de decisión', periodicidad_revision: 'Anual' },
]

type Politica = typeof initPoliticas[0]

const aceptHist: Record<string, { quien: string; fecha: string; version: string }[]> = {
  'POL-2026-001': [
    { quien: 'Carlos Rodríguez', fecha: '2026-01-15', version: '3.2' },
    { quien: 'Laura Martínez',   fecha: '2026-01-18', version: '3.2' },
    { quien: 'Andrés Gómez',     fecha: '2026-01-20', version: '3.2' },
  ],
}

const versiones: Record<string, { version: string; fecha: string; autor: string; cambios: string }[]> = {
  'POL-2026-001': [
    { version: '3.2', fecha: '2026-01-01', autor: 'CRMO', cambios: 'Actualización metodología de valoración de riesgos' },
    { version: '3.1', fecha: '2025-06-01', autor: 'CRMO', cambios: 'Incorporación apetito de riesgo ESG' },
    { version: '3.0', fecha: '2025-01-01', autor: 'CRMO', cambios: 'Alineación con COSO 2023' },
  ],
}

const KPIs = [
  { label: 'Políticas Vigentes',   value: initPoliticas.filter(p => p.estado === 'PUBLICADA').length, color: '#059669', icon: <CheckCircle /> },
  { label: 'Políticas Vencidas',   value: initPoliticas.filter(p => p.estado === 'VENCIDA').length,  color: '#DC2626', icon: <Warning /> },
  { label: 'En Revisión',          value: initPoliticas.filter(p => p.estado === 'REVISION').length, color: '#D97706', icon: <Schedule /> },
  { label: 'Cobertura Total',      value: '94%', color: GRC_COLOR, icon: <HistoryEdu /> },
]

const TF_SX = { '& .MuiOutlinedInput-root': { color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&.Mui-focused fieldset': { borderColor: GRC_COLOR } } }
const LBL_SX = { sx: { color: 'rgba(255,255,255,0.5)' } }

export default function GRCPoliticas() {
  const [tab, setTab]             = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [selPol, setSelPol]       = useState<Politica | null>(null)
  const [politicas, setPoliticas] = useState(initPoliticas)
  const [panelTab, setPanelTab]   = useState(0)
  const [openAcept, setOpenAcept] = useState(false)

  const deletePol = (codigo: string) => { setPoliticas(p => p.filter(x => x.codigo !== codigo)); setSelPol(null) }

  const Row2 = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <Box sx={{ mb: 1.25 }}>
      <Typography sx={{ fontSize: 10, color: LBL, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: color || '#E2E8F0', fontWeight: 500 }}>{value}</Typography>
    </Box>
  )

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Policy sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Repositorio de Políticas</Typography>
              <Typography sx={{ fontSize: 12, color: LBL }}>GRC · Control de Versiones · Vigencias · Aceptaciones</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            Nueva Política
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {KPIs.map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2 }}>
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

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'rgba(255,255,255,0.45)', fontSize: 13 }, '& .Mui-selected': { color: GRC_COLOR }, '& .MuiTabs-indicator': { bgcolor: GRC_COLOR } }}>
          <Tab label="Catálogo de Políticas" />
          <Tab label="Control de Aceptaciones" />
        </Tabs>

        {/* CATÁLOGO */}
        {tab === 0 && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Grid container spacing={2}>
                {politicas.map(p => {
                  const ec = ESTADO_COLOR[p.estado] || GRC_COLOR
                  const pct = p.requeridas > 0 ? Math.round((p.aceptaciones / p.requeridas) * 100) : 0
                  return (
                    <Grid key={p.codigo} size={{ xs: 12, md: 6, lg: 4 }}>
                      <Card onClick={() => { setSelPol(p); setPanelTab(0) }} sx={{ bgcolor: CARD_BG, border: `1px solid ${selPol?.codigo === p.codigo ? alpha(GRC_COLOR, 0.5) : alpha(ec, 0.25)}`, borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: alpha(GRC_COLOR, 0.4) }, transition: 'border-color 0.15s' }}>
                        <CardContent sx={{ p: '16px !important' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography sx={{ fontSize: 10, color: LBL }}>{p.codigo} · v{p.version}</Typography>
                            <Chip label={p.estado} size="small" sx={{ fontSize: 9, height: 18, bgcolor: alpha(ec, 0.18), color: ec }} />
                          </Box>
                          <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 13, lineHeight: 1.3, mb: 1.5 }}>{p.nombre}</Typography>
                          <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                            <Box><Typography sx={{ fontSize: 9.5, color: LBL, textTransform: 'uppercase' }}>Propietario</Typography><Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{p.propietario}</Typography></Box>
                            <Box><Typography sx={{ fontSize: 9.5, color: LBL, textTransform: 'uppercase' }}>Aprobador</Typography><Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{p.aprobador}</Typography></Box>
                            <Box><Typography sx={{ fontSize: 9.5, color: LBL, textTransform: 'uppercase' }}>Vigencia</Typography><Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)' }}>{p.vigencia || '—'}</Typography></Box>
                          </Box>
                          {p.requeridas > 0 && (
                            <>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography sx={{ fontSize: 10, color: LBL }}>Aceptaciones: {p.aceptaciones}/{p.requeridas}</Typography>
                                <Typography sx={{ fontSize: 10, color: pct >= 90 ? '#059669' : pct >= 70 ? '#D97706' : '#DC2626', fontWeight: 700 }}>{pct}%</Typography>
                              </Box>
                              <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: pct >= 90 ? '#059669' : pct >= 70 ? '#D97706' : '#DC2626' } }} />
                            </>
                          )}
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5 }} onClick={e => e.stopPropagation()}>
                            <IconButton size="small" sx={{ color: GRC_COLOR, p: 0.5 }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                            <IconButton size="small" sx={{ color: '#D97706', p: 0.5 }} title="Historial de versiones"><History sx={{ fontSize: 14 }} /></IconButton>
                            <IconButton size="small" sx={{ color: '#059669', p: 0.5 }} title="Descargar PDF"><FileDownload sx={{ fontSize: 14 }} /></IconButton>
                            <IconButton size="small" onClick={() => deletePol(p.codigo)} sx={{ color: '#DC2626', p: 0.5 }}><Delete sx={{ fontSize: 14 }} /></IconButton>
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
              <Box sx={{ width: 380, flexShrink: 0, bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2, p: 2.5, height: 'fit-content' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Typography sx={{ color: '#FFF', fontWeight: 700, fontSize: 14, flex: 1, pr: 1 }}>{selPol.nombre}</Typography>
                  <IconButton size="small" onClick={() => setSelPol(null)} sx={{ color: 'rgba(255,255,255,0.4)' }}><Close fontSize="small" /></IconButton>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, mb: 2 }}>
                  <Chip label={selPol.estado} size="small" sx={{ bgcolor: alpha(ESTADO_COLOR[selPol.estado], 0.18), color: ESTADO_COLOR[selPol.estado], fontWeight: 700, fontSize: 10 }} />
                  <Chip label={`v${selPol.version}`} size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontSize: 10 }} />
                  <Chip label={selPol.tipo} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                </Box>
                <Tabs value={panelTab} onChange={(_, v) => setPanelTab(v)} sx={{ mb: 1.5, '& .MuiTab-root': { color: 'rgba(255,255,255,0.4)', fontSize: 11, minHeight: 32, py: 0.5 }, '& .Mui-selected': { color: GRC_COLOR }, '& .MuiTabs-indicator': { bgcolor: GRC_COLOR } }}>
                  <Tab label="Detalle" sx={{ minHeight: 32 }} />
                  <Tab label="Versiones" sx={{ minHeight: 32 }} />
                  <Tab label="Aceptaciones" sx={{ minHeight: 32 }} />
                </Tabs>
                {panelTab === 0 && (
                  <>
                    <Row2 label="Código" value={selPol.codigo} />
                    <Row2 label="Propietario" value={selPol.propietario} />
                    <Row2 label="Aprobador" value={selPol.aprobador} />
                    <Row2 label="Vigencia" value={selPol.vigencia || 'No definida'} />
                    <Row2 label="Próxima Revisión" value={selPol.revision || 'No definida'} />
                    <Row2 label="Alcance" value={selPol.alcance} />
                    <Row2 label="Revisión Periódica" value={selPol.periodicidad_revision} />
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1.5 }} />
                    <Typography sx={{ fontSize: 10, color: LBL, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>Descripción</Typography>
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{selPol.descripcion}</Typography>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1.5 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button size="small" startIcon={<Edit />} variant="outlined" fullWidth sx={{ color: GRC_COLOR, borderColor: alpha(GRC_COLOR, 0.4) }}>Editar Política</Button>
                      <Button size="small" startIcon={<FileDownload />} variant="outlined" fullWidth sx={{ color: '#059669', borderColor: alpha('#059669', 0.4) }}>Descargar PDF</Button>
                      <Button size="small" startIcon={<Delete />} variant="outlined" fullWidth onClick={() => deletePol(selPol.codigo)} sx={{ color: '#DC2626', borderColor: alpha('#DC2626', 0.4) }}>Eliminar</Button>
                    </Box>
                  </>
                )}
                {panelTab === 1 && (
                  <>
                    <Typography sx={{ fontSize: 12, color: LBL, mb: 1.5 }}>Historial de versiones — {selPol.codigo}</Typography>
                    {(versiones[selPol.codigo] || [{ version: selPol.version, fecha: '2026-01-01', autor: selPol.propietario, cambios: 'Versión inicial' }]).map((v, i) => (
                      <Box key={i} sx={{ p: 1.5, mb: 1, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1, borderLeft: i === 0 ? `3px solid ${GRC_COLOR}` : '3px solid rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Chip label={`v${v.version}`} size="small" sx={{ bgcolor: alpha(GRC_COLOR, i === 0 ? 0.2 : 0.08), color: i === 0 ? GRC_COLOR : 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                          <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{v.fecha}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)' }}>{v.cambios}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', mt: 0.25 }}>Autor: {v.autor}</Typography>
                      </Box>
                    ))}
                    <Button size="small" startIcon={<Add />} variant="outlined" fullWidth sx={{ color: GRC_COLOR, borderColor: alpha(GRC_COLOR, 0.4), mt: 1 }}>Nueva Versión</Button>
                  </>
                )}
                {panelTab === 2 && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography sx={{ fontSize: 12, color: LBL }}>Aceptaciones registradas</Typography>
                      <Button size="small" startIcon={<HowToReg />} variant="contained" sx={{ bgcolor: GRC_COLOR, fontSize: 10, py: 0.25, '&:hover': { bgcolor: '#5B21B6' } }} onClick={() => setOpenAcept(true)}>Registrar</Button>
                    </Box>
                    {(aceptHist[selPol.codigo] || []).length > 0 ? (aceptHist[selPol.codigo] || []).map((a, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.25, mb: 0.75, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
                        <Box><Typography sx={{ fontSize: 12, color: '#E2E8F0', fontWeight: 600 }}>{a.quien}</Typography><Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>v{a.version}</Typography></Box>
                        <Typography sx={{ fontSize: 11, color: '#059669' }}>{a.fecha}</Typography>
                      </Box>
                    )) : (
                      <Box sx={{ p: 2, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Sin aceptaciones registradas aún</Box>
                    )}
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1.5 }} />
                    <Box sx={{ p: 1.5, bgcolor: alpha(GRC_COLOR, 0.08), borderRadius: 1 }}>
                      <Typography sx={{ fontSize: 11, color: LBL, mb: 0.5 }}>Cobertura de aceptación</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{selPol.aceptaciones} / {selPol.requeridas}</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: selPol.aceptaciones / selPol.requeridas >= 0.9 ? '#059669' : '#D97706' }}>{selPol.requeridas > 0 ? Math.round((selPol.aceptaciones / selPol.requeridas) * 100) : 0}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={selPol.requeridas > 0 ? Math.round((selPol.aceptaciones / selPol.requeridas) * 100) : 0} sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: GRC_COLOR } }} />
                    </Box>
                  </>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* CONTROL DE ACEPTACIONES */}
        {tab === 1 && (
          <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: LBL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                  <TableCell>Política</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Versión</TableCell>
                  <TableCell>Aceptaciones</TableCell>
                  <TableCell>Cobertura</TableCell>
                  <TableCell>Próx. Revisión</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {politicas.filter(p => p.estado === 'PUBLICADA').map(p => {
                  const pct = Math.round((p.aceptaciones / p.requeridas) * 100)
                  return (
                    <TableRow key={p.codigo} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)', fontSize: 12.5 } }}>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography sx={{ fontSize: 12.5, color: '#FFF', fontWeight: 600 }}>{p.nombre}</Typography>
                        <Typography sx={{ fontSize: 10, color: LBL }}>{p.codigo}</Typography>
                      </TableCell>
                      <TableCell><Chip label={p.estado} size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(ESTADO_COLOR[p.estado], 0.15), color: ESTADO_COLOR[p.estado] }} /></TableCell>
                      <TableCell><Chip label={`v${p.version}`} size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.12), color: GRC_COLOR, fontSize: 10 }} /></TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{p.aceptaciones}/{p.requeridas}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={pct} sx={{ width: 70, height: 5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: pct >= 90 ? '#059669' : '#D97706' } }} />
                          <Typography sx={{ fontSize: 11, color: pct >= 90 ? '#059669' : '#D97706', fontWeight: 700 }}>{pct}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>{p.revision || '—'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button size="small" startIcon={<HowToReg />} variant="contained" sx={{ bgcolor: GRC_COLOR, fontSize: 10, py: 0.25, px: 1, '&:hover': { bgcolor: '#5B21B6' } }} onClick={() => setOpenAcept(true)}>Aceptar</Button>
                          <IconButton size="small" sx={{ color: '#D97706', p: 0.5 }} title="Historial de versiones"><History sx={{ fontSize: 14 }} /></IconButton>
                          <IconButton size="small" sx={{ color: '#059669', p: 0.5 }} title="Descargar PDF"><FileDownload sx={{ fontSize: 14 }} /></IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* DIALOG NUEVA POLÍTICA */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Nueva Política</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre de la Política" fullWidth size="small" InputLabelProps={LBL_SX} sx={TF_SX} />
            <FormControl size="small"><InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Tipo</InputLabel>
              <Select label="Tipo" defaultValue="" sx={{ color: '#FFF', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {['Riesgos','Compliance','Ciberseguridad','Continuidad','Privacidad','Ética','Terceros'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select></FormControl>
            <TextField label="Propietario" fullWidth size="small" InputLabelProps={LBL_SX} sx={TF_SX} />
            <TextField label="Aprobador" fullWidth size="small" InputLabelProps={LBL_SX} sx={TF_SX} />
            <TextField label="Descripción / Alcance" multiline rows={3} fullWidth size="small" InputLabelProps={LBL_SX} sx={TF_SX} />
            <TextField label="Fecha de Vigencia" type="date" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'rgba(255,255,255,0.5)' } }} sx={TF_SX} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
            <Button variant="contained" onClick={() => setOpenDialog(false)} sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' } }}>Guardar</Button>
          </DialogActions>
        </Dialog>

        {/* DIALOG REGISTRAR ACEPTACIÓN */}
        <Dialog open={openAcept} onClose={() => setOpenAcept(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: '#FFF' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Registrar Aceptación de Política</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre del Aceptante" fullWidth size="small" InputLabelProps={LBL_SX} sx={TF_SX} />
            <TextField label="Cargo" fullWidth size="small" InputLabelProps={LBL_SX} sx={TF_SX} />
            <TextField label="Área" fullWidth size="small" InputLabelProps={LBL_SX} sx={TF_SX} />
            <TextField label="Fecha de Aceptación" type="date" fullWidth size="small" InputLabelProps={{ shrink: true, sx: { color: 'rgba(255,255,255,0.5)' } }} sx={TF_SX} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenAcept(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
            <Button variant="contained" onClick={() => setOpenAcept(false)} sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' } }}>Registrar Aceptación</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
