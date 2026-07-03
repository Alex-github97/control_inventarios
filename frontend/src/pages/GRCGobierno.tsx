import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Avatar, IconButton, Divider,
  Snackbar, Alert,
} from '@mui/material'
import { AccountTree, Add, Groups, Person, Edit, Delete, PowerSettingsNew, Close } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const LBL       = alpha(GRC_COLOR, 0.85)
const TIPO_COLOR: Record<string, string> = {
  Riesgos: '#DC2626', Auditoría: '#D97706', Compliance: '#0891B2',
  Ciberseguridad: '#7C3AED', Continuidad: GRC_COLOR,
}
const PERIODOS = ['Semanal','Mensual','Trimestral','Semestral','Anual']

const initComites = [
  { nombre: 'Comité de Riesgos Corporativos', tipo: 'Riesgos', periodicidad: 'Mensual', presidente: 'CEO', miembros: 7, activo: true, descripcion: 'Responsable de identificar, evaluar y gestionar los riesgos estratégicos y operativos de la organización.' },
  { nombre: 'Comité de Auditoría y Control', tipo: 'Auditoría', periodicidad: 'Trimestral', presidente: 'CFO', miembros: 5, activo: true, descripcion: 'Supervisa la integridad financiera, los controles internos y el desempeño de auditoría.' },
  { nombre: 'Comité de Cumplimiento Normativo', tipo: 'Compliance', periodicidad: 'Mensual', presidente: 'CLO', miembros: 6, activo: true, descripcion: 'Garantiza el cumplimiento de leyes, regulaciones y políticas internas.' },
  { nombre: 'Comité de Seguridad de la Información', tipo: 'Ciberseguridad', periodicidad: 'Mensual', presidente: 'CISO', miembros: 8, activo: true, descripcion: 'Gestiona riesgos de seguridad de la información, ciberseguridad y protección de datos.' },
  { nombre: 'Comité de Continuidad del Negocio', tipo: 'Continuidad', periodicidad: 'Semestral', presidente: 'COO', miembros: 6, activo: false, descripcion: 'Diseña y prueba planes de continuidad operativa ante eventos disruptivos.' },
]
const initRaci = [
  { proceso: 'Gestión de Riesgos', responsable: 'CRMO', aprobador: 'CEO', consultado: 'CFO, COO', informado: 'Junta Directiva', descripcion: 'Identificación, valoración y tratamiento de riesgos empresariales' },
  { proceso: 'Auditorías Corporativas', responsable: 'Dir. Auditoría', aprobador: 'Comité Auditoría', consultado: 'CLO', informado: 'CEO, CFO', descripcion: 'Ejecución del plan anual de auditoría interna y externa' },
  { proceso: 'Cumplimiento Regulatorio', responsable: 'CLO', aprobador: 'CEO', consultado: 'CRMO, CISO', informado: 'Junta Directiva', descripcion: 'Monitoreo y cumplimiento de obligaciones legales y normativas' },
  { proceso: 'Seguridad de la Información', responsable: 'CISO', aprobador: 'CEO', consultado: 'CTO, CLO', informado: 'Comité Riesgos', descripcion: 'Protección de activos de información y gestión de ciberseguridad' },
  { proceso: 'Continuidad del Negocio', responsable: 'COO', aprobador: 'CEO', consultado: 'CRMO, CISO', informado: 'Junta Directiva', descripcion: 'Mantenimiento de operaciones críticas ante eventos disruptivos' },
  { proceso: 'Gestión de Terceros', responsable: 'Dir. Compras', aprobador: 'COO', consultado: 'CLO, CRMO', informado: 'CFO', descripcion: 'Due diligence, selección y monitoreo de proveedores y aliados estratégicos' },
]
const initResp = [
  { nombre: 'Carlos Rodríguez', cargo: 'CRMO — Chief Risk Management Officer', area: 'GRC', procesos: 4, email: 'c.rodriguez@icoltrans.com', telefono: '+57 310 000 0001', activo: true },
  { nombre: 'Laura Martínez', cargo: 'CLO — Chief Legal & Compliance Officer', area: 'Legal', procesos: 3, email: 'l.martinez@icoltrans.com', telefono: '+57 310 000 0002', activo: true },
  { nombre: 'Andrés Gómez', cargo: 'CISO — Chief Information Security Officer', area: 'TI', procesos: 2, email: 'a.gomez@icoltrans.com', telefono: '+57 310 000 0003', activo: true },
  { nombre: 'Diana Torres', cargo: 'Dir. Auditoría Interna', area: 'Auditoría', procesos: 5, email: 'd.torres@icoltrans.com', telefono: '+57 310 000 0004', activo: true },
]

type Comite  = typeof initComites[0]
type RaciRow = typeof initRaci[0]
type Resp    = typeof initResp[0]
type DlgType = 'comite' | 'raci' | 'resp' | null
type DelTarget = { name: string; action: () => void }

const TF = { '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover fieldset': { borderColor: GRC_COLOR }, '&.Mui-focused fieldset': { borderColor: GRC_COLOR } } }
const ILB = { sx: { color: 'text.secondary' } }

export default function GRCGobierno() {
  const [tab, setTab]           = useState(0)
  const [comites, setComites]   = useState(initComites)
  const [raciRows, setRaciRows] = useState(initRaci)
  const [responsables, setResponsables] = useState(initResp)

  const [selComite, setSelComite] = useState<Comite | null>(null)
  const [selRaci, setSelRaci]     = useState<RaciRow | null>(null)
  const [selResp, setSelResp]     = useState<Resp | null>(null)

  const [dlg, setDlg]       = useState<DlgType>(null)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [form, setForm]      = useState<Record<string, string>>({})

  const [delConfirm, setDelConfirm] = useState<DelTarget | null>(null)
  const [delInput, setDelInput]     = useState('')
  const [snack, setSnack]           = useState('')

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const ok = (msg: string) => setSnack(msg)
  const closeAll = () => { setDlg(null); setEditIdx(null); setForm({}) }
  const requestDelete = (name: string, action: () => void, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setDelConfirm({ name, action })
    setDelInput('')
  }
  const confirmDelete = () => {
    if (delInput !== 'ELIMINAR' || !delConfirm) return
    delConfirm.action()
    setDelConfirm(null)
    setDelInput('')
  }

  // ── Comités ──────────────────────────────────────
  const openNewComite = () => { setForm({ tipo: 'Riesgos', periodicidad: 'Mensual' }); setEditIdx(null); setDlg('comite') }
  const openEditComite = (i: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const c = comites[i]
    setForm({ nombre: c.nombre, tipo: c.tipo, periodicidad: c.periodicidad, presidente: c.presidente, miembros: String(c.miembros), descripcion: c.descripcion })
    setEditIdx(i); setDlg('comite')
  }
  const saveComite = () => {
    if (!form.nombre?.trim()) return
    if (editIdx !== null) {
      setComites(list => list.map((c, i) => i === editIdx ? { ...c, nombre: form.nombre, tipo: form.tipo || c.tipo, periodicidad: form.periodicidad || c.periodicidad, presidente: form.presidente || c.presidente, miembros: Number(form.miembros) || c.miembros, descripcion: form.descripcion ?? c.descripcion } : c))
      if (selComite) setSelComite(prev => prev ? { ...prev, nombre: form.nombre, tipo: form.tipo || prev.tipo, periodicidad: form.periodicidad || prev.periodicidad, presidente: form.presidente || prev.presidente, miembros: Number(form.miembros) || prev.miembros, descripcion: form.descripcion ?? prev.descripcion } : null)
      ok('Comité actualizado')
    } else {
      setComites(list => [...list, { nombre: form.nombre, tipo: form.tipo || 'Riesgos', periodicidad: form.periodicidad || 'Mensual', presidente: form.presidente || '—', miembros: Number(form.miembros) || 0, activo: true, descripcion: form.descripcion || '' }])
      ok('Comité creado')
    }
    closeAll()
  }
  const deleteComite = (i: number) => {
    const nombre = comites[i]?.nombre || ''
    setComites(c => c.filter((_, j) => j !== i))
    setSelComite(null)
    ok(`"${nombre}" eliminado`)
  }
  const toggleActivo = (i: number, e?: React.MouseEvent) => { e?.stopPropagation(); setComites(c => c.map((x, j) => j === i ? { ...x, activo: !x.activo } : x)) }

  // ── RACI ─────────────────────────────────────────
  const openNewRaci = () => { setForm({}); setEditIdx(null); setDlg('raci') }
  const openEditRaci = (i: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const r = raciRows[i]
    setForm({ proceso: r.proceso, responsable: r.responsable, aprobador: r.aprobador, consultado: r.consultado, informado: r.informado, descripcion: r.descripcion })
    setEditIdx(i); setDlg('raci')
  }
  const saveRaci = () => {
    if (!form.proceso?.trim()) return
    if (editIdx !== null) {
      setRaciRows(list => list.map((r, i) => i === editIdx ? { proceso: form.proceso, responsable: form.responsable || r.responsable, aprobador: form.aprobador || r.aprobador, consultado: form.consultado || r.consultado, informado: form.informado || r.informado, descripcion: form.descripcion ?? r.descripcion } : r))
      if (selRaci) setSelRaci(prev => prev ? { proceso: form.proceso, responsable: form.responsable || prev.responsable, aprobador: form.aprobador || prev.aprobador, consultado: form.consultado || prev.consultado, informado: form.informado || prev.informado, descripcion: form.descripcion ?? prev.descripcion } : null)
      ok('Entrada RACI actualizada')
    } else {
      setRaciRows(list => [...list, { proceso: form.proceso, responsable: form.responsable || '—', aprobador: form.aprobador || '—', consultado: form.consultado || '—', informado: form.informado || '—', descripcion: form.descripcion || '' }])
      ok('Entrada RACI creada')
    }
    closeAll()
  }
  const deleteRaci = (i: number) => {
    const nombre = raciRows[i]?.proceso || ''
    setRaciRows(r => r.filter((_, j) => j !== i))
    setSelRaci(null)
    ok(`"${nombre}" eliminado`)
  }

  // ── Responsables ──────────────────────────────────
  const openNewResp = () => { setForm({}); setEditIdx(null); setDlg('resp') }
  const openEditResp = (i: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const r = responsables[i]
    setForm({ nombre: r.nombre, cargo: r.cargo, area: r.area, procesos: String(r.procesos), email: r.email, telefono: r.telefono })
    setEditIdx(i); setDlg('resp')
  }
  const saveResp = () => {
    if (!form.nombre?.trim()) return
    if (editIdx !== null) {
      setResponsables(list => list.map((r, i) => i === editIdx ? { ...r, nombre: form.nombre, cargo: form.cargo || r.cargo, area: form.area || r.area, procesos: Number(form.procesos) || r.procesos, email: form.email || r.email, telefono: form.telefono || r.telefono } : r))
      if (selResp) setSelResp(prev => prev ? { ...prev, nombre: form.nombre, cargo: form.cargo || prev.cargo, area: form.area || prev.area, procesos: Number(form.procesos) || prev.procesos, email: form.email || prev.email, telefono: form.telefono || prev.telefono } : null)
      ok('Responsable actualizado')
    } else {
      setResponsables(list => [...list, { nombre: form.nombre, cargo: form.cargo || '—', area: form.area || 'GRC', procesos: Number(form.procesos) || 0, email: form.email || '—', telefono: form.telefono || '—', activo: true }])
      ok('Responsable creado')
    }
    closeAll()
  }
  const deleteResp = (i: number) => {
    const nombre = responsables[i]?.nombre || ''
    setResponsables(r => r.filter((_, j) => j !== i))
    setSelResp(null)
    ok(`"${nombre}" eliminado`)
  }
  const toggleRespAct = (i: number, e?: React.MouseEvent) => { e?.stopPropagation(); setResponsables(r => r.map((x, j) => j === i ? { ...x, activo: !x.activo } : x)) }

  const btnLabel  = tab === 0 ? 'Nuevo Comité' : tab === 1 ? 'Nueva Entrada RACI' : 'Nuevo Responsable'
  const btnAction = () => tab === 0 ? openNewComite() : tab === 1 ? openNewRaci() : openNewResp()

  const Panel = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
    <Box sx={{ width: 360, flexShrink: 0, border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5, height: 'fit-content' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: 14, flex: 1, pr: 1, lineHeight: 1.3 }}>{title}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}><Close fontSize="small" /></IconButton>
      </Box>
      {children}
    </Box>
  )

  const Row2 = ({ label, value }: { label: string; value: string }) => (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontSize: 10, color: LBL, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>{value}</Typography>
    </Box>
  )

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AccountTree sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Gobierno Corporativo</Typography>
              <Typography sx={{ fontSize: 12, color: LBL }}>GRC · Estructura de Gobierno · Comités · RACI</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={btnAction}
            sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' }, borderRadius: 2 }}>
            {btnLabel}
          </Button>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 }, '& .Mui-selected': { color: GRC_COLOR }, '& .MuiTabs-indicator': { bgcolor: GRC_COLOR } }}>
          <Tab label="Comités" icon={<Groups sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Matriz RACI" icon={<AccountTree sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Responsables" icon={<Person sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        {/* ── TAB COMITÉS ── */}
        {tab === 0 && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Grid container spacing={2}>
                {comites.map((c, i) => (
                  <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
                    <Card onClick={() => setSelComite(c)} sx={{ border: `1px solid ${selComite?.nombre === c.nombre ? alpha(GRC_COLOR, 0.5) : #E5E7EB}`, borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: alpha(GRC_COLOR, 0.4) } }}>
                      <CardContent sx={{ p: '16px !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                          <Chip label={c.tipo} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(TIPO_COLOR[c.tipo] || GRC_COLOR, 0.18), color: TIPO_COLOR[c.tipo] || GRC_COLOR }} />
                          <Chip label={c.activo ? 'Activo' : 'Inactivo'} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(c.activo ? GRC_COLOR : '#6B7280', 0.15), color: c.activo ? GRC_COLOR : '#6B7280' }} />
                        </Box>
                        <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14, mb: 1, lineHeight: 1.3 }}>{c.nombre}</Typography>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                          <Box><Typography sx={{ fontSize: 10, color: LBL, textTransform: 'uppercase' }}>Presidente</Typography><Typography sx={{ fontSize: 12, color: 'text.primary', fontWeight: 600 }}>{c.presidente}</Typography></Box>
                          <Box><Typography sx={{ fontSize: 10, color: LBL, textTransform: 'uppercase' }}>Periodicidad</Typography><Typography sx={{ fontSize: 12, color: 'text.primary', fontWeight: 600 }}>{c.periodicidad}</Typography></Box>
                          <Box><Typography sx={{ fontSize: 10, color: LBL, textTransform: 'uppercase' }}>Miembros</Typography><Typography sx={{ fontSize: 12, color: GRC_COLOR, fontWeight: 700 }}>{c.miembros}</Typography></Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                          <IconButton size="small" title="Editar" onClick={e => openEditComite(i, e)} sx={{ color: GRC_COLOR, p: 0.5 }}><Edit sx={{ fontSize: 16 }} /></IconButton>
                          <IconButton size="small" title={c.activo ? 'Inactivar' : 'Activar'} onClick={e => toggleActivo(i, e)} sx={{ color: c.activo ? '#D97706' : '#059669', p: 0.5 }}><PowerSettingsNew sx={{ fontSize: 16 }} /></IconButton>
                          <IconButton size="small" title="Eliminar" onClick={e => requestDelete(c.nombre, () => deleteComite(i), e)} sx={{ color: '#DC2626', p: 0.5 }}><Delete sx={{ fontSize: 16 }} /></IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
            {selComite && (
              <Panel title={selComite.nombre} onClose={() => setSelComite(null)}>
                <Chip label={selComite.tipo} size="small" sx={{ mb: 2, bgcolor: alpha(TIPO_COLOR[selComite.tipo] || GRC_COLOR, 0.18), color: TIPO_COLOR[selComite.tipo] || GRC_COLOR }} />
                <Row2 label="Presidente" value={selComite.presidente} />
                <Row2 label="Periodicidad" value={selComite.periodicidad} />
                <Row2 label="N.° Miembros" value={String(selComite.miembros)} />
                <Row2 label="Estado" value={selComite.activo ? 'Activo' : 'Inactivo'} />
                {selComite.descripcion && <><Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1.5 }} /><Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>{selComite.descripcion}</Typography></>}
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button size="small" startIcon={<Edit />} variant="outlined" sx={{ color: GRC_COLOR, borderColor: alpha(GRC_COLOR, 0.4), flex: 1 }}
                    onClick={() => openEditComite(comites.findIndex(c => c.nombre === selComite.nombre))}>
                    Editar
                  </Button>
                  <Button size="small" startIcon={<Delete />} variant="outlined" sx={{ color: '#DC2626', borderColor: alpha('#DC2626', 0.4), flex: 1 }}
                    onClick={() => requestDelete(selComite.nombre, () => deleteComite(comites.findIndex(c => c.nombre === selComite.nombre)))}>
                    Eliminar
                  </Button>
                </Box>
              </Panel>
            )}
          </Box>
        )}

        {/* ── TAB RACI ── */}
        {tab === 1 && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.06)', color: LBL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                      <TableCell>Proceso</TableCell>
                      <TableCell><Chip label="R" size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha('#DC2626', 0.18), color: '#DC2626' }} /> Responsable</TableCell>
                      <TableCell><Chip label="A" size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha('#D97706', 0.18), color: '#D97706' }} /> Aprobador</TableCell>
                      <TableCell><Chip label="C" size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(GRC_COLOR, 0.18), color: GRC_COLOR }} /> Consultado</TableCell>
                      <TableCell><Chip label="I" size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha('#0891B2', 0.18), color: '#0891B2' }} /> Informado</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {raciRows.map((r, i) => (
                      <TableRow key={i} onClick={() => setSelRaci(r)} sx={{ cursor: 'pointer', bgcolor: selRaci?.proceso === r.proceso ? alpha(GRC_COLOR, 0.06) : 'transparent', '&:hover': { bgcolor: alpha(GRC_COLOR, 0.04) }, '& td': { borderColor: 'rgba(255,255,255,0.04)', color: 'text.primary', fontSize: 12.5 } }}>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{r.proceso}</TableCell>
                        <TableCell sx={{ color: '#DC2626', fontWeight: 600 }}>{r.responsable}</TableCell>
                        <TableCell sx={{ color: '#D97706', fontWeight: 600 }}>{r.aprobador}</TableCell>
                        <TableCell>{r.consultado}</TableCell>
                        <TableCell>{r.informado}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                            <IconButton size="small" title="Editar" onClick={e => openEditRaci(i, e)} sx={{ color: GRC_COLOR, p: 0.5 }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                            <IconButton size="small" title="Eliminar" onClick={e => requestDelete(r.proceso, () => deleteRaci(i), e)} sx={{ color: '#DC2626', p: 0.5 }}><Delete sx={{ fontSize: 14 }} /></IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
            {selRaci && (
              <Panel title="Detalle RACI" onClose={() => setSelRaci(null)}>
                <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: 14, mb: 2 }}>{selRaci.proceso}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip label={`R: ${selRaci.responsable}`} size="small" sx={{ bgcolor: alpha('#DC2626', 0.15), color: '#DC2626', fontWeight: 700, fontSize: 11 }} />
                  <Chip label={`A: ${selRaci.aprobador}`} size="small" sx={{ bgcolor: alpha('#D97706', 0.15), color: '#D97706', fontWeight: 700, fontSize: 11 }} />
                </Box>
                <Row2 label="Consultado" value={selRaci.consultado} />
                <Row2 label="Informado" value={selRaci.informado} />
                {selRaci.descripcion && <><Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1.5 }} /><Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>{selRaci.descripcion}</Typography></>}
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button size="small" startIcon={<Edit />} variant="outlined" sx={{ color: GRC_COLOR, borderColor: alpha(GRC_COLOR, 0.4), flex: 1 }}
                    onClick={() => openEditRaci(raciRows.findIndex(r => r.proceso === selRaci.proceso))}>
                    Editar
                  </Button>
                  <Button size="small" startIcon={<Delete />} variant="outlined" sx={{ color: '#DC2626', borderColor: alpha('#DC2626', 0.4), flex: 1 }}
                    onClick={() => requestDelete(selRaci.proceso, () => deleteRaci(raciRows.findIndex(r => r.proceso === selRaci.proceso)))}>
                    Eliminar
                  </Button>
                </Box>
              </Panel>
            )}
          </Box>
        )}

        {/* ── TAB RESPONSABLES ── */}
        {tab === 2 && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Grid container spacing={2}>
                {responsables.map((r, i) => (
                  <Grid key={i} size={{ xs: 12, md: 6 }}>
                    <Card onClick={() => setSelResp(r)} sx={{ border: `1px solid ${selResp?.nombre === r.nombre ? alpha(GRC_COLOR, 0.5) : #E5E7EB}`, borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: alpha(GRC_COLOR, 0.4) } }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '16px !important' }}>
                        <Avatar sx={{ bgcolor: alpha(GRC_COLOR, 0.25), color: GRC_COLOR, width: 46, height: 46, fontWeight: 700, opacity: r.activo ? 1 : 0.4 }}>{r.nombre.slice(0, 2).toUpperCase()}</Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontWeight: 700, color: r.activo ? '#FFF' : 'rgba(255,255,255,0.4)', fontSize: 14 }}>{r.nombre}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.25 }} onClick={e => e.stopPropagation()}>
                              <IconButton size="small" title="Editar" onClick={e => openEditResp(i, e)} sx={{ color: GRC_COLOR, p: 0.5 }}><Edit sx={{ fontSize: 14 }} /></IconButton>
                              <IconButton size="small" title={r.activo ? 'Inactivar' : 'Activar'} onClick={e => toggleRespAct(i, e)} sx={{ color: r.activo ? '#D97706' : '#059669', p: 0.5 }}><PowerSettingsNew sx={{ fontSize: 14 }} /></IconButton>
                              <IconButton size="small" title="Eliminar" onClick={e => requestDelete(r.nombre, () => deleteResp(i), e)} sx={{ color: '#DC2626', p: 0.5 }}><Delete sx={{ fontSize: 14 }} /></IconButton>
                            </Box>
                          </Box>
                          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.3 }}>{r.cargo}</Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.75 }}>
                            <Chip label={r.area} size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR }} />
                            <Chip label={r.activo ? 'Activo' : 'Inactivo'} size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(r.activo ? '#059669' : '#6B7280', 0.15), color: r.activo ? '#059669' : '#6B7280' }} />
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', alignSelf: 'center' }}>{r.procesos} procesos</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
            {selResp && (
              <Panel title="Detalle Responsable" onClose={() => setSelResp(null)}>
                <Avatar sx={{ bgcolor: alpha(GRC_COLOR, 0.25), color: GRC_COLOR, width: 52, height: 52, fontWeight: 700, fontSize: 18, mb: 2 }}>{selResp.nombre.slice(0, 2).toUpperCase()}</Avatar>
                <Row2 label="Nombre" value={selResp.nombre} />
                <Row2 label="Cargo" value={selResp.cargo} />
                <Row2 label="Área" value={selResp.area} />
                <Row2 label="Email" value={selResp.email} />
                <Row2 label="Teléfono" value={selResp.telefono} />
                <Row2 label="Procesos Asignados" value={String(selResp.procesos)} />
                <Row2 label="Estado" value={selResp.activo ? 'Activo' : 'Inactivo'} />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1.5 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button size="small" startIcon={<Edit />} variant="outlined" fullWidth sx={{ color: GRC_COLOR, borderColor: alpha(GRC_COLOR, 0.4) }}
                    onClick={() => openEditResp(responsables.findIndex(r => r.nombre === selResp.nombre))}>
                    Editar
                  </Button>
                  <Button size="small" startIcon={<PowerSettingsNew />} variant="outlined" fullWidth
                    onClick={() => { const i = responsables.findIndex(r => r.nombre === selResp.nombre); toggleRespAct(i); setSelResp(prev => prev ? { ...prev, activo: !prev.activo } : null) }}
                    sx={{ color: selResp.activo ? '#D97706' : '#059669', borderColor: alpha(selResp.activo ? '#D97706' : '#059669', 0.4) }}>
                    {selResp.activo ? 'Inactivar' : 'Activar'}
                  </Button>
                  <Button size="small" startIcon={<Delete />} variant="outlined" fullWidth sx={{ color: '#DC2626', borderColor: alpha('#DC2626', 0.4) }}
                    onClick={() => requestDelete(selResp.nombre, () => deleteResp(responsables.findIndex(r => r.nombre === selResp.nombre)))}>
                    Eliminar
                  </Button>
                </Box>
              </Panel>
            )}
          </Box>
        )}

        {/* ── DIALOG COMITÉ (crear / editar) ── */}
        <Dialog open={dlg === 'comite'} onClose={closeAll} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: 'text.primary' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editIdx !== null ? 'Editar Comité' : 'Nuevo Comité'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre del Comité" fullWidth size="small" value={form.nombre || ''} onChange={e => f('nombre', e.target.value)} InputLabelProps={ILB} sx={TF} />
            <FormControl size="small">
              <InputLabel sx={{ color: 'text.secondary' }}>Tipo</InputLabel>
              <Select label="Tipo" value={form.tipo || 'Riesgos'} onChange={e => f('tipo', e.target.value)} sx={{ color: 'text.primary', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                {Object.keys(TIPO_COLOR).map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Presidente" fullWidth size="small" value={form.presidente || ''} onChange={e => f('presidente', e.target.value)} InputLabelProps={ILB} sx={TF} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ color: 'text.secondary' }}>Periodicidad</InputLabel>
                <Select label="Periodicidad" value={form.periodicidad || 'Mensual'} onChange={e => f('periodicidad', e.target.value)} sx={{ color: 'text.primary', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                  {PERIODOS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="N.° Miembros" type="number" fullWidth size="small" value={form.miembros || ''} onChange={e => f('miembros', e.target.value)} InputLabelProps={ILB} sx={TF} inputProps={{ min: 0 }} />
            </Box>
            <TextField label="Descripción" multiline rows={2} fullWidth size="small" value={form.descripcion || ''} onChange={e => f('descripcion', e.target.value)} InputLabelProps={ILB} sx={TF} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeAll} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={saveComite} sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' } }}>{editIdx !== null ? 'Guardar Cambios' : 'Crear'}</Button>
          </DialogActions>
        </Dialog>

        {/* ── DIALOG RACI (crear / editar) ── */}
        <Dialog open={dlg === 'raci'} onClose={closeAll} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: 'text.primary' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editIdx !== null ? 'Editar Entrada RACI' : 'Nueva Entrada RACI'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Proceso / Actividad" fullWidth size="small" value={form.proceso || ''} onChange={e => f('proceso', e.target.value)} InputLabelProps={ILB} sx={TF} />
            <TextField label="Responsable (R) — Quien ejecuta" fullWidth size="small" value={form.responsable || ''} onChange={e => f('responsable', e.target.value)} InputLabelProps={ILB} sx={TF} />
            <TextField label="Aprobador (A) — Quien aprueba" fullWidth size="small" value={form.aprobador || ''} onChange={e => f('aprobador', e.target.value)} InputLabelProps={ILB} sx={TF} />
            <TextField label="Consultado (C) — A quien se consulta" fullWidth size="small" value={form.consultado || ''} onChange={e => f('consultado', e.target.value)} InputLabelProps={ILB} sx={TF} />
            <TextField label="Informado (I) — A quien se informa" fullWidth size="small" value={form.informado || ''} onChange={e => f('informado', e.target.value)} InputLabelProps={ILB} sx={TF} />
            <TextField label="Descripción" multiline rows={2} fullWidth size="small" value={form.descripcion || ''} onChange={e => f('descripcion', e.target.value)} InputLabelProps={ILB} sx={TF} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeAll} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={saveRaci} sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' } }}>{editIdx !== null ? 'Guardar Cambios' : 'Crear'}</Button>
          </DialogActions>
        </Dialog>

        {/* ── DIALOG RESPONSABLE (crear / editar) ── */}
        <Dialog open={dlg === 'resp'} onClose={closeAll} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: 'text.primary' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{editIdx !== null ? 'Editar Responsable' : 'Nuevo Responsable GRC'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField label="Nombre Completo" fullWidth size="small" value={form.nombre || ''} onChange={e => f('nombre', e.target.value)} InputLabelProps={ILB} sx={TF} />
            <TextField label="Cargo" fullWidth size="small" value={form.cargo || ''} onChange={e => f('cargo', e.target.value)} InputLabelProps={ILB} sx={TF} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Área" fullWidth size="small" value={form.area || ''} onChange={e => f('area', e.target.value)} InputLabelProps={ILB} sx={TF} />
              <TextField label="N.° Procesos" type="number" fullWidth size="small" value={form.procesos || ''} onChange={e => f('procesos', e.target.value)} InputLabelProps={ILB} sx={TF} inputProps={{ min: 0 }} />
            </Box>
            <TextField label="Email" fullWidth size="small" value={form.email || ''} onChange={e => f('email', e.target.value)} InputLabelProps={ILB} sx={TF} />
            <TextField label="Teléfono" fullWidth size="small" value={form.telefono || ''} onChange={e => f('telefono', e.target.value)} InputLabelProps={ILB} sx={TF} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeAll} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" onClick={saveResp} sx={{ bgcolor: GRC_COLOR, '&:hover': { bgcolor: '#5B21B6' } }}>{editIdx !== null ? 'Guardar Cambios' : 'Crear'}</Button>
          </DialogActions>
        </Dialog>

        {/* ── DIALOG CONFIRMACIÓN ELIMINAR ── */}
        <Dialog open={!!delConfirm} onClose={() => setDelConfirm(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: '#1F2937', color: 'text.primary', border: '1px solid rgba(220,38,38,0.3)' } }}>
          <DialogTitle sx={{ fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Delete /> ¿Eliminar registro?
          </DialogTitle>
          <DialogContent sx={{ pt: '8px !important' }}>
            <Typography sx={{ fontSize: 13, color: 'text.primary', mb: 2 }}>
              Está a punto de eliminar <strong style={{ color: 'text.primary' }}>"{delConfirm?.name}"</strong>. Esta acción no se puede deshacer.
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
              Escriba <strong style={{ color: '#DC2626' }}>ELIMINAR</strong> para confirmar:
            </Typography>
            <TextField
              fullWidth size="small" placeholder="ELIMINAR"
              value={delInput} onChange={e => setDelInput(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: 'rgba(220,38,38,0.4)' }, '&.Mui-focused fieldset': { borderColor: '#DC2626' } } }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDelConfirm(null)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button variant="contained" disabled={delInput !== 'ELIMINAR'} onClick={confirmDelete}
              sx={{ bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' }, '&.Mui-disabled': { bgcolor: 'rgba(220,38,38,0.25)', color: 'text.disabled' } }}>
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity="success" onClose={() => setSnack('')} sx={{ bgcolor: '#1E3A2F', color: 'text.primary', '& .MuiAlert-icon': { color: '#4ADE80' } }}>{snack}</Alert>
        </Snackbar>
      </Box>
    </Layout>
  )
}
