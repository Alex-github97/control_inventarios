import React, { useState, useRef } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Divider, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Gavel, Add, Edit, Delete, Close, FileDownload, UploadFile } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const BORDER  = '#E5E7EB'
const LBL       = alpha(GRC_COLOR, 0.85)
const ESTADO_COLOR: Record<string,string> = { PLANIFICADA:'#0891B2', 'EN PROGRESO':'#D97706', COMPLETADA:'#059669', CANCELADA:'#6B7280' }
const TIPO_COLOR: Record<string,string>   = { INTERNA:'#059669', EXTERNA:'#EA580C', SEGUIMIENTO:GRC_COLOR }
const ESTADOS = Object.keys(ESTADO_COLOR)
const TIPOS   = Object.keys(TIPO_COLOR)

const seed = [
  { id:'AUD-001', titulo:'Auditoría ISO 27001 — Seguridad de la Información', tipo:'EXTERNA', area:'Tecnología', auditor:'BDO Auditores', responsable:'CTO', estado:'PLANIFICADA', inicio:'2026-07-05', fin:'2026-07-12', avance:0, descripcion:'Auditoría de certificación ISO 27001:2022. Alcance: gestión de activos TI, control de accesos, criptografía, seguridad física y gestión de incidentes. Auditoría presencial con revisión documental previa.', hallazgos:[], informe:null as string|null },
  { id:'AUD-002', titulo:'Continuidad de Negocio — Prueba BCP/DRP', tipo:'INTERNA', area:'Operaciones / TI', auditor:'Comité GRC', responsable:'Dir. Operaciones', estado:'PLANIFICADA', inicio:'2026-07-18', fin:'2026-07-20', avance:0, descripcion:'Simulacro de activación del Plan de Continuidad de Negocio. Prueba de recuperación de sistemas WMS, ERP y telecomunicaciones. Objetivo: validar RTO ≤ 4h y RPO ≤ 1h.', hallazgos:[], informe:null as string|null },
  { id:'AUD-003', titulo:'Cumplimiento Normativa Ambiental — Operaciones', tipo:'EXTERNA', area:'Operaciones / HSE', auditor:'Ministerio Ambiente', responsable:'Dir. HSE', estado:'PLANIFICADA', inicio:'2026-08-02', fin:'2026-08-04', avance:0, descripcion:'Visita de inspección del Ministerio de Ambiente por renovación de permisos ambientales. Revisión de gestión de residuos, emisiones de flota y planes de emergencia ambiental.', hallazgos:[], informe:null as string|null },
  { id:'AUD-004', titulo:'Auditoría SARLAFT — Prevención LA/FT', tipo:'INTERNA', area:'Compliance / Financiero', auditor:'Deloitte Colombia', responsable:'CLO', estado:'EN PROGRESO', inicio:'2026-06-01', fin:'2026-06-30', avance:65, descripcion:'Revisión integral del sistema de administración del riesgo LA/FT. Evaluación de señales de alerta, controles de onboarding de clientes, reportes a UIAF y capacitación del personal.', hallazgos:['Debilidad en segmentación de clientes','Reporte UIAF mayo presentado fuera de plazo'], informe:null as string|null },
  { id:'AUD-005', titulo:'Revisión Interna — Gestión de Flota y SST', tipo:'INTERNA', area:'SST / Operaciones', auditor:'Auditor Interno', responsable:'Dir. SST', estado:'COMPLETADA', inicio:'2026-04-10', fin:'2026-04-25', avance:100, descripcion:'Auditoría de cumplimiento del programa de mantenimiento vehicular, exámenes médicos periódicos de conductores y registros del SGSST según Decreto 1072 de 2015.', hallazgos:['2 vehículos con revisión vencida — corregido','Formato ARL desactualizado — actualizado'], informe:'Informe_AUD-005_Final.pdf' },
  { id:'AUD-006', titulo:'Seguimiento Hallazgos — ISO 31000 2025', tipo:'SEGUIMIENTO', area:'GRC', auditor:'Comité GRC', responsable:'Dir. GRC', estado:'COMPLETADA', inicio:'2026-03-01', fin:'2026-03-15', avance:100, descripcion:'Auditoría de seguimiento para verificar el cierre de hallazgos identificados en la auditoría ISO 31000 del año anterior. 12 de 14 hallazgos cerrados satisfactoriamente.', hallazgos:['2 hallazgos de bajo riesgo extendidos (fecha límite: agosto 2026)'], informe:'Informe_AUD-006_Seguimiento.pdf' },
]
type Auditoria = typeof seed[0]
type Form = { titulo:string; tipo:string; area:string; auditor:string; responsable:string; estado:string; inicio:string; fin:string; avance:number; descripcion:string }
const EMPTY: Form = { titulo:'', tipo:'INTERNA', area:'', auditor:'', responsable:'', estado:'PLANIFICADA', inicio:'', fin:'', avance:0, descripcion:'' }

const TF = { '& .MuiOutlinedInput-root':{ '& fieldset':{ borderColor:'rgba(0,0,0,0.15)' }, '&.Mui-focused fieldset':{ borderColor:GRC_COLOR } } }
const ILB = { sx:{ color:'text.secondary' } }
const Row2 = ({ label, value, color }:{ label:string; value:string; color?:string }) => (
  <Box sx={{ mb:1.25 }}><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.25 }}>{label}</Typography><Typography sx={{ fontSize:13, color:color||'text.primary', fontWeight:500 }}>{value}</Typography></Box>
)

export default function GRCAuditorias() {
  const [auditorias, setAuditorias] = useState(seed)
  const [sel, setSel]               = useState<Auditoria|null>(null)
  const [tab, setTab]               = useState(0)
  const [dlgOpen, setDlgOpen]       = useState(false)
  const [editId, setEditId]         = useState<string|null>(null)
  const [form, setForm]             = useState<Form>(EMPTY)
  const [blobUrls, setBlobUrls]     = useState<Record<string,string>>({})
  const [snack, setSnack]           = useState('')
  const [delConfirm, setDelConfirm] = useState<{id:string;name:string}|null>(null)
  const [delInput, setDelInput]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const sf=(k:keyof Form)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(f=>({...f,[k]:e.target.value}))
  const ss=(k:keyof Form,v:string|number)=>setForm(f=>({...f,[k]:v}))
  const ok=(msg:string)=>setSnack(msg)

  const requestDelete=(id:string,name:string,e?:React.MouseEvent)=>{ e?.stopPropagation(); setDelConfirm({id,name}); setDelInput('') }
  const confirmDelete=()=>{ if(delInput!=='ELIMINAR'||!delConfirm) return; handleDelete(delConfirm.id); setDelConfirm(null); setDelInput('') }

  const openNew=()=>{ setForm(EMPTY); setEditId(null); setDlgOpen(true) }
  const openEdit=(a:Auditoria,e?:React.MouseEvent)=>{ e?.stopPropagation(); setForm({ titulo:a.titulo, tipo:a.tipo, area:a.area, auditor:a.auditor, responsable:a.responsable, estado:a.estado, inicio:a.inicio, fin:a.fin, avance:a.avance, descripcion:a.descripcion }); setEditId(a.id); setDlgOpen(true) }
  const handleSave=()=>{
    if(editId){ setAuditorias(list=>list.map(a=>a.id===editId?{...a,...form}:a)); if(sel?.id===editId) setSel(s=>s?{...s,...form}:null); ok('Auditoría actualizada') }
    else { const n:Auditoria={...form,id:`AUD-${String(auditorias.length+1).padStart(3,'0')}`,hallazgos:[],informe:null}; setAuditorias(list=>[...list,n]); ok('Auditoría creada') }
    setDlgOpen(false)
  }
  const handleDelete=(id:string,e?:React.MouseEvent)=>{ e?.stopPropagation(); const titulo=auditorias.find(a=>a.id===id)?.titulo||''; setAuditorias(list=>list.filter(a=>a.id!==id)); if(sel?.id===id) setSel(null); ok(`"${titulo}" eliminada`) }
  const handleDownload=(name:string)=>{
    const url=blobUrls[name]
    const a=document.createElement('a')
    if(url){ a.href=url; a.download=name }
    else { const txt=`Informe de Auditoría: ${name}\nAuditoría: ${sel?.titulo||''}\nSistema GRC – Icoltrans\n\n[Documento de demostración]`; a.href=URL.createObjectURL(new Blob([txt],{type:'application/pdf'})); a.download=name }
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    ok(`Descargando "${name}"`)
  }
  const handleUpload=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file||!sel) return
    const url=URL.createObjectURL(file)
    setBlobUrls(prev=>({...prev,[file.name]:url}))
    setAuditorias(list=>list.map(a=>a.id===sel.id?{...a,informe:file.name}:a))
    setSel(s=>s?{...s,informe:file.name}:null)
    ok(`Informe "${file.name}" cargado correctamente`)
    e.target.value=''
  }

  const filtered = tab===0 ? auditorias : auditorias.filter(a=>{
    if(tab===1) return a.estado==='PLANIFICADA'
    if(tab===2) return a.estado==='EN PROGRESO'
    if(tab===3) return a.estado==='COMPLETADA'
    return true
  })

  return (
    <Layout>
      <Box sx={{ p:3, minHeight:'100vh' }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <Gavel sx={{ color:GRC_COLOR, fontSize:28 }} />
            <Box><Typography variant="h5" sx={{ fontWeight:800, color:'text.primary', lineHeight:1 }}>Gestión de Auditorías</Typography><Typography sx={{ fontSize:12, color:LBL }}>GRC · Auditorías internas, externas y seguimientos</Typography></Box>
            <Chip label="GRC" size="small" sx={{ bgcolor:alpha(GRC_COLOR,.15), color:GRC_COLOR, fontWeight:700, border:`1px solid ${alpha(GRC_COLOR,.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={openNew} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' }, borderRadius:2 }}>Nueva Auditoría</Button>
        </Box>

        <Grid container spacing={2} sx={{ mb:3 }}>
          {ESTADOS.map(est=>{ const color=ESTADO_COLOR[est]; return (
            <Grid key={est} size={{ xs:6, md:3 }}><Card sx={{ bgcolor:'#fff', border:`1px solid ${alpha(color,.3)}`, borderRadius:2 }}><CardContent sx={{ p:'14px !important' }}><Typography sx={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{auditorias.filter(a=>a.estado===est).length}</Typography><Typography sx={{ fontSize:11, color:LBL }}>{est}</Typography></CardContent></Card></Grid>
          )})}
        </Grid>

        <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ mb:2, borderBottom:'1px solid #F1F5F9', '& .MuiTab-root':{ color:'text.disabled', fontSize:12 }, '& .Mui-selected':{ color:GRC_COLOR }, '& .MuiTabs-indicator':{ bgcolor:GRC_COLOR } }}>
          <Tab label="Todas" /><Tab label="Planificadas" /><Tab label="En Progreso" /><Tab label="Completadas" />
        </Tabs>

        <Box sx={{ display:'flex', gap:2 }}>
          <Box sx={{ flex:1, minWidth:0 }}>
            <Paper sx={{ bgcolor:'transparent', overflowX:'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th':{ borderColor:'#F1F5F9', color:LBL, fontSize:11, fontWeight:700, textTransform:'uppercase' } }}>
                  <TableCell>ID</TableCell><TableCell>Auditoría</TableCell><TableCell>Tipo</TableCell><TableCell>Área</TableCell><TableCell>Auditor</TableCell><TableCell>Inicio</TableCell><TableCell>Fin</TableCell><TableCell>Avance</TableCell><TableCell>Estado</TableCell><TableCell>Acciones</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {filtered.map(a=>(
                    <TableRow key={a.id} onClick={()=>setSel(a)} sx={{ cursor:'pointer', bgcolor:sel?.id===a.id?alpha(GRC_COLOR,.06):'transparent', '&:hover':{ bgcolor:alpha(GRC_COLOR,.04) }, '& td':{ borderColor:'#F1F5F9', color:'text.secondary', fontSize:12 } }}>
                      <TableCell sx={{ fontSize:10.5, color:LBL }}>{a.id}</TableCell>
                      <TableCell sx={{ maxWidth:220 }}><Typography sx={{ fontSize:12.5, color:'text.primary', fontWeight:600, lineHeight:1.3 }}>{a.titulo}</Typography></TableCell>
                      <TableCell><Chip label={a.tipo} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(TIPO_COLOR[a.tipo]||GRC_COLOR,.18), color:TIPO_COLOR[a.tipo]||GRC_COLOR }} /></TableCell>
                      <TableCell sx={{ fontSize:11 }}>{a.area}</TableCell>
                      <TableCell sx={{ fontSize:11 }}>{a.auditor}</TableCell>
                      <TableCell sx={{ fontSize:11 }}>{a.inicio}</TableCell>
                      <TableCell sx={{ fontSize:11 }}>{a.fin}</TableCell>
                      <TableCell sx={{ minWidth:100 }}><Box sx={{ display:'flex', alignItems:'center', gap:1 }}><LinearProgress variant="determinate" value={a.avance} sx={{ flex:1, height:5, borderRadius:2.5, bgcolor:'#E2E8F0', '& .MuiLinearProgress-bar':{ bgcolor:ESTADO_COLOR[a.estado] } }} /><Typography sx={{ fontSize:11, fontWeight:700, color:ESTADO_COLOR[a.estado], minWidth:28 }}>{a.avance}%</Typography></Box></TableCell>
                      <TableCell><Chip label={a.estado} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(ESTADO_COLOR[a.estado],.18), color:ESTADO_COLOR[a.estado] }} /></TableCell>
                      <TableCell>
                        <Box sx={{ display:'flex', gap:.25 }} onClick={e=>e.stopPropagation()}>
                          <IconButton size="small" title="Editar" onClick={e=>openEdit(a,e)} sx={{ color:GRC_COLOR, p:.5 }}><Edit sx={{ fontSize:14 }} /></IconButton>
                          <IconButton size="small" title="Eliminar" onClick={e=>requestDelete(a.id,a.titulo,e)} sx={{ color:'#DC2626', p:.5 }}><Delete sx={{ fontSize:14 }} /></IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>

          {sel&&(
            <Box sx={{ width:370, flexShrink:0, bgcolor:'#fff', border:`1px solid #E5E7EB`, borderRadius:2, p:2.5, height:'fit-content' }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1 }}>
                <Typography sx={{ color:'text.primary', fontWeight:700, fontSize:13, flex:1, pr:1, lineHeight:1.4 }}>{sel.titulo}</Typography>
                <IconButton size="small" onClick={()=>setSel(null)} sx={{ color:'text.disabled' }}><Close fontSize="small" /></IconButton>
              </Box>
              <Box sx={{ display:'flex', gap:.75, mb:2, flexWrap:'wrap' }}>
                <Chip label={sel.tipo} size="small" sx={{ bgcolor:alpha(TIPO_COLOR[sel.tipo]||GRC_COLOR,.18), color:TIPO_COLOR[sel.tipo]||GRC_COLOR, fontSize:10 }} />
                <Chip label={sel.estado} size="small" sx={{ bgcolor:alpha(ESTADO_COLOR[sel.estado],.18), color:ESTADO_COLOR[sel.estado], fontWeight:700, fontSize:10 }} />
              </Box>
              <Box sx={{ mb:2 }}><Box sx={{ display:'flex', justifyContent:'space-between', mb:.5 }}><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase' }}>Avance</Typography><Typography sx={{ fontSize:13, fontWeight:700, color:ESTADO_COLOR[sel.estado] }}>{sel.avance}%</Typography></Box><LinearProgress variant="determinate" value={sel.avance} sx={{ height:8, borderRadius:4, bgcolor:'#E2E8F0', '& .MuiLinearProgress-bar':{ bgcolor:ESTADO_COLOR[sel.estado] } }} /></Box>
              <Row2 label="Área" value={sel.area} />
              <Row2 label="Auditor" value={sel.auditor} />
              <Row2 label="Responsable" value={sel.responsable} />
              <Row2 label="Inicio" value={sel.inicio} />
              <Row2 label="Fin" value={sel.fin} />
              <Divider sx={{ borderColor:'#F1F5F9', my:1.5 }} />
              <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.75 }}>Descripción</Typography>
              <Typography sx={{ fontSize:12, color:'text.secondary', lineHeight:1.7, mb:2 }}>{sel.descripcion}</Typography>
              {sel.hallazgos.length>0&&<>
                <Divider sx={{ borderColor:'#F1F5F9', my:1.5 }} />
                <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.75 }}>Hallazgos ({sel.hallazgos.length})</Typography>
                {sel.hallazgos.map((h,i)=><Box key={i} sx={{ display:'flex', gap:1, mb:.75, alignItems:'flex-start' }}><Box sx={{ width:5, height:5, borderRadius:'50%', bgcolor:'#D97706', mt:.75, flexShrink:0 }} /><Typography sx={{ fontSize:11, color:'text.secondary' }}>{h}</Typography></Box>)}
              </>}
              <Divider sx={{ borderColor:'#F1F5F9', my:1.5 }} />
              <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:1 }}>Informe Final</Typography>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display:'none' }} onChange={handleUpload} />
              {sel.informe ? (
                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', p:.75, bgcolor:'#F9FAFB', borderRadius:1, border:'1px solid #E5E7EB', mb:1 }}>
                  <Typography sx={{ fontSize:11, color:'text.secondary', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, mr:1 }}>{sel.informe}</Typography>
                  <IconButton size="small" onClick={()=>handleDownload(sel.informe!)} sx={{ color:GRC_COLOR, p:.5 }}><FileDownload sx={{ fontSize:14 }} /></IconButton>
                </Box>
              ) : (
                <Typography sx={{ fontSize:11, color:'text.disabled', mb:1 }}>Sin informe cargado</Typography>
              )}
              <Button size="small" startIcon={<UploadFile sx={{ fontSize:12 }} />} fullWidth variant="outlined" onClick={()=>fileRef.current?.click()} sx={{ color:GRC_COLOR, borderColor:alpha(GRC_COLOR,.4), mb:2 }}>{sel.informe?'Reemplazar Informe':'Cargar Informe'}</Button>
              <Divider sx={{ borderColor:'#F1F5F9', my:1 }} />
              <Box sx={{ display:'flex', flexDirection:'column', gap:1, mt:1 }}>
                <Button size="small" startIcon={<Edit />} variant="outlined" fullWidth onClick={()=>openEdit(sel)} sx={{ color:GRC_COLOR, borderColor:alpha(GRC_COLOR,.4) }}>Editar Auditoría</Button>
                <Button size="small" startIcon={<Delete />} variant="outlined" fullWidth onClick={()=>requestDelete(sel.id,sel.titulo)} sx={{ color:'#DC2626', borderColor:alpha('#DC2626',.4) }}>Eliminar</Button>
              </Box>
            </Box>
          )}
        </Box>

        <Dialog open={dlgOpen} onClose={()=>setDlgOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight:700 }}>{editId?'Editar Auditoría':'Nueva Auditoría'}</DialogTitle>
          <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'16px !important' }}>
            <TextField label="Título de la Auditoría" fullWidth size="small" value={form.titulo} onChange={sf('titulo')} InputLabelProps={ILB} sx={TF} />
            <Box sx={{ display:'flex', gap:2 }}>
              <FormControl size="small" fullWidth><InputLabel>Tipo</InputLabel><Select label="Tipo" value={form.tipo} onChange={e=>ss('tipo',e.target.value)}>{TIPOS.map(t=><MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl>
              <FormControl size="small" fullWidth><InputLabel>Estado</InputLabel><Select label="Estado" value={form.estado} onChange={e=>ss('estado',e.target.value)}>{ESTADOS.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
            </Box>
            <TextField label="Área de Alcance" fullWidth size="small" value={form.area} onChange={sf('area')} InputLabelProps={ILB} sx={TF} />
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="Auditor" fullWidth size="small" value={form.auditor} onChange={sf('auditor')} InputLabelProps={ILB} sx={TF} />
              <TextField label="Responsable Interno" fullWidth size="small" value={form.responsable} onChange={sf('responsable')} InputLabelProps={ILB} sx={TF} />
            </Box>
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="Fecha Inicio" type="date" fullWidth size="small" value={form.inicio} onChange={sf('inicio')} InputLabelProps={{ shrink:true }} sx={TF} />
              <TextField label="Fecha Fin" type="date" fullWidth size="small" value={form.fin} onChange={sf('fin')} InputLabelProps={{ shrink:true }} sx={TF} />
            </Box>
            <TextField label="% Avance" type="number" fullWidth size="small" value={form.avance} onChange={e=>ss('avance',Number(e.target.value))} InputLabelProps={ILB} sx={TF} inputProps={{ min:0,max:100 }} />
            <TextField label="Descripción / Alcance" multiline rows={3} fullWidth size="small" value={form.descripcion} onChange={sf('descripcion')} InputLabelProps={ILB} sx={TF} />
          </DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}><Button onClick={()=>setDlgOpen(false)} color="inherit">Cancelar</Button><Button variant="contained" onClick={handleSave} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' } }}>{editId?'Guardar Cambios':'Crear'}</Button></DialogActions>
        </Dialog>

        <Dialog open={!!delConfirm} onClose={()=>setDelConfirm(null)} maxWidth="xs" fullWidth PaperProps={{ sx:{ border:'1px solid rgba(220,38,38,0.3)' } }}>
          <DialogTitle sx={{ fontWeight:700, color:'#DC2626' }}>¿Eliminar registro?</DialogTitle>
          <DialogContent sx={{ pt:'8px !important' }}>
            <Typography sx={{ fontSize:13, color:'text.secondary', mb:2 }}>Va a eliminar <strong>"{delConfirm?.name}"</strong>. Esta acción no se puede deshacer.</Typography>
            <Typography sx={{ fontSize:12, color:'text.secondary', mb:1 }}>Escriba <strong style={{ color:'#DC2626' }}>ELIMINAR</strong> para confirmar:</Typography>
            <TextField fullWidth size="small" placeholder="ELIMINAR" value={delInput} onChange={e=>setDelInput(e.target.value)} sx={{ '& .MuiOutlinedInput-root':{ '& fieldset':{ borderColor:'rgba(220,38,38,0.4)' }, '&.Mui-focused fieldset':{ borderColor:'#DC2626' } } }} />
          </DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}>
            <Button onClick={()=>setDelConfirm(null)} color="inherit">Cancelar</Button>
            <Button variant="contained" disabled={delInput!=='ELIMINAR'} onClick={confirmDelete} sx={{ bgcolor:'#DC2626', '&:hover':{ bgcolor:'#B91C1C' }, '&.Mui-disabled':{ bgcolor:'rgba(220,38,38,0.25)' } }}>Eliminar</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={!!snack} autoHideDuration={3500} onClose={()=>setSnack('')} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
          <Alert severity="success" onClose={()=>setSnack('')}>{snack}</Alert>
        </Snackbar>
      </Box>
    </Layout>
  )
}
