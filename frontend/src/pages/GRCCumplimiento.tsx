import React, { useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  LinearProgress, IconButton, Divider, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { VerifiedUser, Add, Edit, Delete, Close, CheckCircle, Warning, ErrorOutline, FileDownload } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const PAGE_BG   = '#F0F2F5'
const LBL       = alpha(GRC_COLOR, 0.85)
const ESTADO_COLOR: Record<string,string> = { CUMPLE:'#059669', PARCIAL:'#D97706', INCUMPLE:'#DC2626', 'NO APLICA':'#6B7280', 'EN REVISION':'#0891B2' }
const FRECUENCIAS = ['Mensual','Bimestral','Trimestral','Semestral','Anual']
const ESTADOS_R   = Object.keys(ESTADO_COLOR)

const seed = [
  { id:'CUM-001', norma:'ISO 9001:2015', clausula:'4.2 — Partes interesadas', categoria:'Contexto', responsable:'Dir. Calidad', frecuencia:'Anual', porcentaje:92, estado:'CUMPLE', ultimaRevision:'2026-04-15', proximaRevision:'2027-04-15', evidencia:'Matriz_PI_2026.pdf', descripcion:'Identificación y seguimiento de las necesidades de partes interesadas pertinentes incluyendo clientes, proveedores y reguladores.' },
  { id:'CUM-002', norma:'ISO 9001:2015', clausula:'6.1 — Riesgos y oportunidades', categoria:'Planificación', responsable:'Dir. Calidad', frecuencia:'Semestral', porcentaje:78, estado:'PARCIAL', ultimaRevision:'2026-03-20', proximaRevision:'2026-09-20', evidencia:'Matriz_RyO_v4.xlsx', descripcion:'Determinación de riesgos y oportunidades. Se requiere completar evaluación para procesos de logística inversa.' },
  { id:'CUM-003', norma:'ISO 27001:2022', clausula:'A.8 — Controles tecnológicos', categoria:'Controles', responsable:'CISO', frecuencia:'Mensual', porcentaje:65, estado:'PARCIAL', ultimaRevision:'2026-05-10', proximaRevision:'2026-06-10', evidencia:'Auditoria_Controles_TI.pdf', descripcion:'Implementación de los 34 controles tecnológicos. Pendiente gestión de identidades privilegiadas y monitoreo en tiempo real.' },
  { id:'CUM-004', norma:'BASC v5', clausula:'3.1 — Seguridad en instalaciones', categoria:'Seguridad', responsable:'Dir. Seguridad', frecuencia:'Trimestral', porcentaje:97, estado:'CUMPLE', ultimaRevision:'2026-05-20', proximaRevision:'2026-08-20', evidencia:'Inspeccion_Q2.pdf', descripcion:'Control de acceso físico a bodegas. CCTV, control biométrico y protocolos de verificación de personal.' },
  { id:'CUM-005', norma:'Ley 1581', clausula:'Art. 17 — Deberes del responsable', categoria:'Datos personales', responsable:'CLO', frecuencia:'Anual', porcentaje:88, estado:'CUMPLE', ultimaRevision:'2026-01-15', proximaRevision:'2027-01-15', evidencia:'Politica_Privacidad_v4.pdf', descripcion:'Política de privacidad actualizada, registro ante SIC y procedimiento de reclamos en todos los puntos de recolección.' },
  { id:'CUM-006', norma:'Decreto 1072', clausula:'2.2.4.6.37 — Indicadores SG-SST', categoria:'SST', responsable:'Dir. RRHH', frecuencia:'Trimestral', porcentaje:45, estado:'INCUMPLE', ultimaRevision:'2026-02-28', proximaRevision:'2026-05-31', evidencia:'', descripcion:'Medición de indicadores SST: frecuencia, severidad, mortalidad y ausentismo. Reportes retrasados 2 períodos.' },
  { id:'CUM-007', norma:'SARLAFT', clausula:'Cap. III — Evaluación LAFT', categoria:'Financiero', responsable:'CLO', frecuencia:'Mensual', porcentaje:70, estado:'PARCIAL', ultimaRevision:'2026-05-31', proximaRevision:'2026-06-30', evidencia:'Informe_LAFT_Mayo2026.pdf', descripcion:'Evaluación mensual del riesgo LA/FT. Pendiente cargar reportes a UIAF y actualizar matrices de segmentación.' },
]
type Req = typeof seed[0]
type Form = { norma:string; clausula:string; categoria:string; responsable:string; frecuencia:string; descripcion:string; proximaRevision:string; porcentaje:number; estado:string }
const EMPTY: Form = { norma:'', clausula:'', categoria:'', responsable:'', frecuencia:'Mensual', descripcion:'', proximaRevision:'', porcentaje:0, estado:'PARCIAL' }

const Row2 = ({ label, value, color }:{ label:string; value:string; color?:string }) => (
  <Box sx={{ mb:1.25 }}><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.25 }}>{label}</Typography><Typography sx={{ fontSize:13, color:color||'#334155', fontWeight:500 }}>{value}</Typography></Box>
)

export default function GRCCumplimiento() {
  const [reqs, setReqs]     = useState(seed)
  const [sel, setSel]       = useState<Req|null>(null)
  const [tab, setTab]       = useState(0)
  const [dlgOpen, setDlgOpen] = useState(false)
  const [editId, setEditId]   = useState<string|null>(null)
  const [form, setForm]       = useState<Form>(EMPTY)
  const [snack, setSnack]     = useState('')

  const sf = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setForm(f=>({...f,[k]:e.target.value}))
  const ss = (k: keyof Form, v: string|number) => setForm(f=>({...f,[k]:v}))
  const ok = (msg: string) => setSnack(msg)

  const openNew = () => { setForm(EMPTY); setEditId(null); setDlgOpen(true) }
  const openEdit = (r: Req, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setForm({ norma:r.norma, clausula:r.clausula, categoria:r.categoria, responsable:r.responsable, frecuencia:r.frecuencia, descripcion:r.descripcion, proximaRevision:r.proximaRevision, porcentaje:r.porcentaje, estado:r.estado })
    setEditId(r.id); setDlgOpen(true)
  }
  const handleSave = () => {
    if (editId) {
      setReqs(list => list.map(r => r.id===editId ? {...r,...form} : r))
      if (sel?.id===editId) setSel(s => s ? {...s,...form} : null)
      ok('Requisito actualizado correctamente')
    } else {
      const n: Req = { ...form, id:`CUM-${String(reqs.length+1).padStart(3,'0')}`, ultimaRevision:new Date().toISOString().split('T')[0], evidencia:'' }
      setReqs(list=>[...list,n]); ok('Requisito creado correctamente')
    }
    setDlgOpen(false)
  }
  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const clausula = reqs.find(r=>r.id===id)?.clausula||''
    setReqs(list=>list.filter(r=>r.id!==id))
    if (sel?.id===id) setSel(null)
    ok(`"${clausula}" eliminado`)
  }
  const handleDownload = (name: string) => {
    if (!name) return
    const txt = `Evidencia: ${name}\nSistema GRC – Icoltrans\nFecha: ${new Date().toLocaleDateString('es-CO')}\n\n[Archivo de demostración]`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt],{type:'application/octet-stream'}))
    a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a)
    ok(`Descargando "${name}"`)
  }

  const promedio = Math.round(reqs.reduce((a,r)=>a+r.porcentaje,0)/reqs.length)

  return (
    <Layout>
      <Box sx={{ p:3, background:PAGE_BG, minHeight:'100vh' }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <VerifiedUser sx={{ color:GRC_COLOR, fontSize:28 }} />
            <Box><Typography variant="h5" sx={{ fontWeight:800, color:'#1E293B', lineHeight:1 }}>Gestión de Cumplimiento</Typography><Typography sx={{ fontSize:12, color:LBL }}>GRC · Monitoreo de requisitos normativos</Typography></Box>
            <Chip label="GRC" size="small" sx={{ bgcolor:alpha(GRC_COLOR,.15), color:GRC_COLOR, fontWeight:700, border:`1px solid ${alpha(GRC_COLOR,.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={openNew} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' }, borderRadius:2 }}>Nuevo Requisito</Button>
        </Box>

        <Grid container spacing={2} sx={{ mb:3 }}>
          {[{ label:'Global', value:`${promedio}%`, color:promedio>=80?'#059669':promedio>=60?'#D97706':'#DC2626' },{ label:'Cumple', value:reqs.filter(r=>r.estado==='CUMPLE').length, color:'#059669' },{ label:'Parcial', value:reqs.filter(r=>r.estado==='PARCIAL').length, color:'#D97706' },{ label:'Incumple', value:reqs.filter(r=>r.estado==='INCUMPLE').length, color:'#DC2626' }].map((k,i)=>(
            <Grid key={i} size={{ xs:6, md:3 }}><Card sx={{ bgcolor:'#FFFFFF', border:`1px solid ${alpha(k.color,.3)}`, borderRadius:2 }}><CardContent sx={{ p:'14px !important' }}><Typography sx={{ fontSize:26, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</Typography><Typography sx={{ fontSize:11, color:LBL }}>{k.label}</Typography></CardContent></Card></Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ mb:2, borderBottom:'1px solid #E5E7EB', '& .MuiTab-root':{ color:'#64748B', fontSize:13 }, '& .Mui-selected':{ color:GRC_COLOR }, '& .MuiTabs-indicator':{ bgcolor:GRC_COLOR } }}>
          <Tab label="Tabla de Requisitos" /><Tab label="Por Norma" />
        </Tabs>

        <Box sx={{ display:'flex', gap:2 }}>
          <Box sx={{ flex:1, minWidth:0 }}>
            {tab===0 && (
              <Paper sx={{ bgcolor:'transparent', overflowX:'auto' }}>
                <Table size="small">
                  <TableHead><TableRow sx={{ '& th':{ borderColor:'#E5E7EB', color:LBL, fontSize:11, fontWeight:700, textTransform:'uppercase' } }}>
                    <TableCell>ID</TableCell><TableCell>Norma / Cláusula</TableCell><TableCell>Categoría</TableCell><TableCell>Responsable</TableCell><TableCell>Cumplimiento</TableCell><TableCell>Estado</TableCell><TableCell>Próx. Revisión</TableCell><TableCell>Acciones</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {reqs.map(r=>(
                      <TableRow key={r.id} onClick={()=>setSel(r)} sx={{ cursor:'pointer', bgcolor:sel?.id===r.id?alpha(GRC_COLOR,.06):'transparent', '&:hover':{ bgcolor:alpha(GRC_COLOR,.04) }, '& td':{ borderColor:'#E5E7EB', color:'#334155', fontSize:12 } }}>
                        <TableCell sx={{ fontSize:10.5, color:LBL }}>{r.id}</TableCell>
                        <TableCell><Typography sx={{ fontSize:12, color:'#1E293B', fontWeight:600 }}>{r.norma}</Typography><Typography sx={{ fontSize:10.5, color:'#64748B' }}>{r.clausula}</Typography></TableCell>
                        <TableCell><Chip label={r.categoria} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(GRC_COLOR,.12), color:GRC_COLOR }} /></TableCell>
                        <TableCell>{r.responsable}</TableCell>
                        <TableCell sx={{ minWidth:140 }}>
                          <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                            <LinearProgress variant="determinate" value={r.porcentaje} sx={{ flex:1, height:5, borderRadius:2.5, bgcolor:'#E5E7EB', '& .MuiLinearProgress-bar':{ bgcolor:ESTADO_COLOR[r.estado]||GRC_COLOR } }} />
                            <Typography sx={{ fontSize:11, color:ESTADO_COLOR[r.estado]||GRC_COLOR, minWidth:30, fontWeight:700 }}>{r.porcentaje}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><Chip label={r.estado} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(ESTADO_COLOR[r.estado]||'#6B7280',.18), color:ESTADO_COLOR[r.estado]||'#6B7280' }} /></TableCell>
                        <TableCell sx={{ whiteSpace:'nowrap', fontSize:11 }}>{r.proximaRevision}</TableCell>
                        <TableCell>
                          <Box sx={{ display:'flex', gap:.25 }} onClick={e=>e.stopPropagation()}>
                            <IconButton size="small" title="Editar" onClick={e=>openEdit(r,e)} sx={{ color:GRC_COLOR, p:.5 }}><Edit sx={{ fontSize:14 }} /></IconButton>
                            {r.evidencia && <IconButton size="small" title="Descargar evidencia" onClick={()=>handleDownload(r.evidencia)} sx={{ color:'#059669', p:.5 }}><FileDownload sx={{ fontSize:14 }} /></IconButton>}
                            <IconButton size="small" title="Eliminar" onClick={e=>handleDelete(r.id,e)} sx={{ color:'#DC2626', p:.5 }}><Delete sx={{ fontSize:14 }} /></IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
            {tab===1 && (
              <Grid container spacing={2}>
                {[...new Set(reqs.map(r=>r.norma))].map(norma=>{
                  const items=reqs.filter(r=>r.norma===norma); const avg=Math.round(items.reduce((a,r)=>a+r.porcentaje,0)/items.length); const color=avg>=80?'#059669':avg>=60?'#D97706':'#DC2626'
                  return <Grid key={norma} size={{ xs:12, md:6 }}><Card sx={{ bgcolor:'#FFFFFF', border:`1px solid ${alpha(color,.3)}`, borderRadius:2 }}><CardContent sx={{ p:'14px !important' }}>
                    <Box sx={{ display:'flex', justifyContent:'space-between', mb:1.5 }}><Typography sx={{ fontWeight:700, color:'#1E293B', fontSize:14 }}>{norma}</Typography><Typography sx={{ fontSize:20, fontWeight:800, color, lineHeight:1 }}>{avg}%</Typography></Box>
                    <LinearProgress variant="determinate" value={avg} sx={{ height:6, borderRadius:3, mb:1.5, bgcolor:'#E5E7EB', '& .MuiLinearProgress-bar':{ bgcolor:color } }} />
                    {items.map(r=><Box key={r.id} onClick={()=>{setSel(r);setTab(0)}} sx={{ display:'flex', justifyContent:'space-between', py:.6, cursor:'pointer', '&:hover':{ opacity:.8 } }}>
                      <Typography sx={{ fontSize:11, color:'#64748B', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', pr:1 }}>{r.clausula}</Typography>
                      <Box sx={{ display:'flex', alignItems:'center', gap:.75 }}>
                        {r.estado==='CUMPLE'&&<CheckCircle sx={{ fontSize:13, color:'#059669' }} />}
                        {r.estado==='PARCIAL'&&<Warning sx={{ fontSize:13, color:'#D97706' }} />}
                        {r.estado==='INCUMPLE'&&<ErrorOutline sx={{ fontSize:13, color:'#DC2626' }} />}
                        <Typography sx={{ fontSize:11, color:ESTADO_COLOR[r.estado], fontWeight:600, minWidth:28 }}>{r.porcentaje}%</Typography>
                      </Box>
                    </Box>)}
                  </CardContent></Card></Grid>
                })}
              </Grid>
            )}
          </Box>

          {sel && (
            <Box sx={{ width:370, flexShrink:0, bgcolor:'#FFFFFF', border:`1px solid #E5E7EB`, borderRadius:2, p:2.5, height:'fit-content' }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1 }}>
                <Typography sx={{ color:'#1E293B', fontWeight:700, fontSize:13, flex:1, pr:1, lineHeight:1.4 }}>{sel.clausula}</Typography>
                <IconButton size="small" onClick={()=>setSel(null)} sx={{ color:'#64748B' }}><Close fontSize="small" /></IconButton>
              </Box>
              <Box sx={{ display:'flex', gap:.75, mb:2 }}>
                <Chip label={sel.norma} size="small" sx={{ bgcolor:alpha(GRC_COLOR,.18), color:GRC_COLOR, fontWeight:700, fontSize:10 }} />
                <Chip label={sel.estado} size="small" sx={{ bgcolor:alpha(ESTADO_COLOR[sel.estado],.18), color:ESTADO_COLOR[sel.estado], fontWeight:700, fontSize:10 }} />
              </Box>
              <Box sx={{ mb:2 }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', mb:.5 }}><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase' }}>Cumplimiento</Typography><Typography sx={{ fontSize:13, fontWeight:700, color:ESTADO_COLOR[sel.estado] }}>{sel.porcentaje}%</Typography></Box>
                <LinearProgress variant="determinate" value={sel.porcentaje} sx={{ height:8, borderRadius:4, bgcolor:'#E5E7EB', '& .MuiLinearProgress-bar':{ bgcolor:ESTADO_COLOR[sel.estado] } }} />
              </Box>
              <Row2 label="ID" value={sel.id} />
              <Row2 label="Categoría" value={sel.categoria} />
              <Row2 label="Responsable" value={sel.responsable} />
              <Row2 label="Frecuencia" value={sel.frecuencia} />
              <Row2 label="Última revisión" value={sel.ultimaRevision} />
              <Row2 label="Próxima revisión" value={sel.proximaRevision} color={sel.estado==='INCUMPLE'?'#DC2626':undefined} />
              <Divider sx={{ borderColor:'#E5E7EB', my:1.5 }} />
              <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.75 }}>Descripción</Typography>
              <Typography sx={{ fontSize:12, color:'#334155', lineHeight:1.7, mb:2 }}>{sel.descripcion}</Typography>
              {sel.evidencia && <>
                <Divider sx={{ borderColor:'#E5E7EB', my:1.5 }} />
                <Box sx={{ display:'flex', alignItems:'center', gap:1, p:.75, bgcolor:'#F8FAFC', borderRadius:1 }}>
                  <FileDownload sx={{ fontSize:14, color:GRC_COLOR }} />
                  <Typography sx={{ fontSize:11, color:'#334155', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sel.evidencia}</Typography>
                  <Button size="small" onClick={()=>handleDownload(sel.evidencia)} sx={{ fontSize:10, color:'#059669', p:'2px 6px', minWidth:0 }}>Descargar</Button>
                </Box>
              </>}
              <Divider sx={{ borderColor:'#E5E7EB', my:1.5 }} />
              <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                <Button size="small" startIcon={<Edit />} variant="outlined" fullWidth onClick={()=>openEdit(sel)} sx={{ color:GRC_COLOR, borderColor:alpha(GRC_COLOR,.4) }}>Editar Requisito</Button>
                <Button size="small" startIcon={<Delete />} variant="outlined" fullWidth onClick={()=>handleDelete(sel.id)} sx={{ color:'#DC2626', borderColor:alpha('#DC2626',.4) }}>Eliminar</Button>
              </Box>
            </Box>
          )}
        </Box>

        <Dialog open={dlgOpen} onClose={()=>setDlgOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight:700 }}>{editId?'Editar Requisito':'Nuevo Requisito de Cumplimiento'}</DialogTitle>
          <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'16px !important' }}>
            <TextField label="Norma" fullWidth size="small" value={form.norma} onChange={sf('norma')} />
            <TextField label="Cláusula / Artículo" fullWidth size="small" value={form.clausula} onChange={sf('clausula')} />
            <TextField label="Categoría" fullWidth size="small" value={form.categoria} onChange={sf('categoria')} />
            <TextField label="Responsable" fullWidth size="small" value={form.responsable} onChange={sf('responsable')} />
            <FormControl size="small"><InputLabel>Frecuencia</InputLabel>
              <Select label="Frecuencia" value={form.frecuencia} onChange={e=>ss('frecuencia',e.target.value)}>
                {FRECUENCIAS.map(f=><MenuItem key={f} value={f}>{f}</MenuItem>)}
              </Select></FormControl>
            <FormControl size="small"><InputLabel>Estado</InputLabel>
              <Select label="Estado" value={form.estado} onChange={e=>ss('estado',e.target.value)}>
                {ESTADOS_R.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select></FormControl>
            <TextField label="% Cumplimiento (0-100)" type="number" fullWidth size="small" value={form.porcentaje} onChange={e=>ss('porcentaje',Number(e.target.value))} inputProps={{ min:0, max:100 }} />
            <TextField label="Descripción" multiline rows={3} fullWidth size="small" value={form.descripcion} onChange={sf('descripcion')} />
            <TextField label="Próxima Revisión" type="date" fullWidth size="small" value={form.proximaRevision} onChange={sf('proximaRevision')} InputLabelProps={{ shrink:true }} />
          </DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}>
            <Button onClick={()=>setDlgOpen(false)} sx={{ color:'#64748B' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleSave} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' } }}>{editId?'Guardar Cambios':'Crear'}</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={!!snack} autoHideDuration={3500} onClose={()=>setSnack('')} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
          <Alert severity="success" onClose={()=>setSnack('')} sx={{ bgcolor:'#1E3A2F', color:'#FFF', '& .MuiAlert-icon':{ color:'#4ADE80' } }}>{snack}</Alert>
        </Snackbar>
      </Box>
    </Layout>
  )
}
