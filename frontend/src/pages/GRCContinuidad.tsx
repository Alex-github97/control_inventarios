import React, { useState, useRef } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Divider, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { AccountTree, Add, Edit, Delete, Close, FileDownload, UploadFile, PlayArrow } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const BORDER  = '#E5E7EB'
const LBL       = alpha(GRC_COLOR, 0.85)
const ESTADO_COLOR: Record<string,string> = { VIGENTE:'#059669', REVISION:'#D97706', VENCIDO:'#DC2626', BORRADOR:'#6B7280' }
const TIPO_COLOR: Record<string,string> = { BCP:'#059669', DRP:'#0891B2', ERP:'#EA580C', PCP:GRC_COLOR }
const ESTADOS = Object.keys(ESTADO_COLOR)
const TIPOS   = Object.keys(TIPO_COLOR)

const seed = [
  { id:'BCP-001', nombre:'Plan de Continuidad de Negocio — Operaciones Logísticas', tipo:'BCP', area:'Operaciones', responsable:'Dir. Operaciones', estado:'VIGENTE', version:'3.2', fechaAprobacion:'2026-01-15', fechaRevision:'2027-01-15', rto:'4 horas', rpo:'1 hora', descripcion:'Plan maestro de continuidad para las operaciones de transporte y bodegaje. Cubre escenarios de indisponibilidad de sistemas WMS, falla de proveedor principal y emergencias operativas.', ultimoPrueba:'2026-04-20', resultadoPrueba:'RTO real: 6h — brecha identificada. Plan de mejora en curso.', documentos:['BCP_v3.2_Aprobado.pdf','Anexo_Contactos_Emergencia.xlsx'] },
  { id:'BCP-002', nombre:'Plan de Recuperación de Desastres TI — WMS/ERP', tipo:'DRP', area:'Tecnología', responsable:'CTO', estado:'VIGENTE', version:'2.1', fechaAprobacion:'2025-11-01', fechaRevision:'2026-11-01', rto:'4 horas', rpo:'1 hora', descripcion:'Procedimientos de recuperación técnica para WMS, ERP y base de datos PostgreSQL. Incluye backups automatizados en AWS S3 con replicación multi-región.', ultimoPrueba:'2026-04-20', resultadoPrueba:'RPO cumplido (45 min). RTO pendiente de mejora (6h actual vs 4h objetivo).', documentos:['DRP_TI_v2.1.pdf','Runbook_Recuperacion_AWS.pdf'] },
  { id:'BCP-003', nombre:'Plan de Emergencias — Incendio y Evacuación Bodegas', tipo:'ERP', area:'SST / Operaciones', responsable:'Dir. SST', estado:'VIGENTE', version:'1.5', fechaAprobacion:'2026-02-01', fechaRevision:'2027-02-01', rto:'Inmediato', rpo:'N/A', descripcion:'Procedimientos de evacuación, comunicación con bomberos y ARL, y activación de brigadas de emergencia para bodegas Bogotá, Medellín y Barranquilla.', ultimoPrueba:'2026-05-15', resultadoPrueba:'Simulacro completado. Tiempo de evacuación: 4.5 min (objetivo: 5 min). APROBADO.', documentos:['Plan_Emergencias_Bodegas_v1.5.pdf','Planos_Evacuacion_2026.pdf'] },
  { id:'BCP-004', nombre:'Plan de Crisis — Comunicaciones e Imagen Corporativa', tipo:'PCP', area:'Dirección / Comunicaciones', responsable:'Dir. General', estado:'REVISION', version:'1.0', fechaAprobacion:'2025-06-01', fechaRevision:'2026-06-01', rto:'2 horas', rpo:'N/A', descripcion:'Protocolo de respuesta a crisis mediáticas, incidentes con terceros de alto impacto y situaciones de emergencia que requieran comunicación externa. Vencido — en proceso de actualización.', ultimoPrueba:'2025-12-10', resultadoPrueba:'Ejercicio de escritorio (tabletop) realizado. 3 mejoras identificadas.', documentos:['Plan_Crisis_Comunicaciones_v1.0.pdf'] },
]
type Plan = typeof seed[0]
type Form = { nombre:string; tipo:string; area:string; responsable:string; estado:string; version:string; fechaAprobacion:string; fechaRevision:string; rto:string; rpo:string; descripcion:string }
const EMPTY: Form = { nombre:'', tipo:'BCP', area:'', responsable:'', estado:'BORRADOR', version:'1.0', fechaAprobacion:'', fechaRevision:'', rto:'', rpo:'', descripcion:'' }

const TF = { '& .MuiOutlinedInput-root':{ '& fieldset':{ borderColor:'rgba(0,0,0,0.15)' }, '&.Mui-focused fieldset':{ borderColor:GRC_COLOR } } }
const ILB = { sx:{ color:'text.secondary' } }
const Row2 = ({ label, value, color }:{ label:string; value:string; color?:string }) => (
  <Box sx={{ mb:1.25 }}><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.25 }}>{label}</Typography><Typography sx={{ fontSize:13, color:color||'text.primary', fontWeight:500 }}>{value}</Typography></Box>
)

export default function GRCContinuidad() {
  const [planes, setPlanes]       = useState(seed)
  const [sel, setSel]             = useState<Plan|null>(null)
  const [tab, setTab]             = useState(0)
  const [dlgOpen, setDlgOpen]     = useState(false)
  const [editId, setEditId]       = useState<string|null>(null)
  const [form, setForm]           = useState<Form>(EMPTY)
  const [blobUrls, setBlobUrls]   = useState<Record<string,string>>({})
  const [snack, setSnack]         = useState('')
  const [delConfirm, setDelConfirm] = useState<{id:string;name:string}|null>(null)
  const [delInput, setDelInput]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const sf=(k:keyof Form)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(f=>({...f,[k]:e.target.value}))
  const ss=(k:keyof Form,v:string)=>setForm(f=>({...f,[k]:v}))
  const ok=(msg:string)=>setSnack(msg)

  const requestDelete=(id:string,name:string,e?:React.MouseEvent)=>{ e?.stopPropagation(); setDelConfirm({id,name}); setDelInput('') }
  const confirmDelete=()=>{ if(delInput!=='ELIMINAR'||!delConfirm) return; handleDelete(delConfirm.id); setDelConfirm(null); setDelInput('') }

  const openNew=()=>{ setForm(EMPTY); setEditId(null); setDlgOpen(true) }
  const openEdit=(p:Plan,e?:React.MouseEvent)=>{ e?.stopPropagation(); setForm({ nombre:p.nombre, tipo:p.tipo, area:p.area, responsable:p.responsable, estado:p.estado, version:p.version, fechaAprobacion:p.fechaAprobacion, fechaRevision:p.fechaRevision, rto:p.rto, rpo:p.rpo, descripcion:p.descripcion }); setEditId(p.id); setDlgOpen(true) }
  const handleSave=()=>{
    if(editId){ setPlanes(list=>list.map(p=>p.id===editId?{...p,...form}:p)); if(sel?.id===editId) setSel(s=>s?{...s,...form}:null); ok('Plan actualizado') }
    else { const n:Plan={...form,id:`BCP-${String(planes.length+1).padStart(3,'0')}`,ultimoPrueba:'—',resultadoPrueba:'Sin prueba realizada',documentos:[]}; setPlanes(list=>[...list,n]); ok('Plan creado') }
    setDlgOpen(false)
  }
  const handleDelete=(id:string,e?:React.MouseEvent)=>{ e?.stopPropagation(); const nombre=planes.find(p=>p.id===id)?.nombre||''; setPlanes(list=>list.filter(p=>p.id!==id)); if(sel?.id===id) setSel(null); ok(`"${nombre}" eliminado`) }
  const ejecutarSimulacro=(id:string)=>{
    const fecha=new Date().toISOString().split('T')[0]
    setPlanes(list=>list.map(p=>p.id===id?{...p,ultimoPrueba:fecha,resultadoPrueba:`Simulacro iniciado el ${fecha}. Resultados pendientes.`}:p))
    if(sel?.id===id) setSel(s=>s?{...s,ultimoPrueba:fecha,resultadoPrueba:`Simulacro iniciado el ${fecha}. Resultados pendientes.`}:null)
    ok('Simulacro registrado correctamente')
  }
  const handleDownload=(name:string)=>{
    const url=blobUrls[name]
    const a=document.createElement('a')
    if(url){ a.href=url; a.download=name }
    else { const txt=`Plan de Continuidad: ${name}\nSistema GRC – Icoltrans\n\n[Documento de demostración]`; a.href=URL.createObjectURL(new Blob([txt],{type:'application/pdf'})); a.download=name }
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    ok(`Descargando "${name}"`)
  }
  const handleUpload=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file||!sel) return
    const url=URL.createObjectURL(file)
    setBlobUrls(prev=>({...prev,[file.name]:url}))
    setPlanes(list=>list.map(p=>p.id===sel.id?{...p,documentos:[...p.documentos,file.name]}:p))
    setSel(s=>s?{...s,documentos:[...s.documentos,file.name]}:null)
    ok(`"${file.name}" adjuntado correctamente`)
    e.target.value=''
  }

  const filtered = tab===0 ? planes : planes.filter(p=>p.tipo===TIPOS[tab-1])

  return (
    <Layout>
      <Box sx={{ p:3, minHeight:'100vh' }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <AccountTree sx={{ color:GRC_COLOR, fontSize:28 }} />
            <Box><Typography variant="h5" sx={{ fontWeight:800, color:'text.primary', lineHeight:1 }}>Planes de Continuidad</Typography><Typography sx={{ fontSize:12, color:LBL }}>GRC · BCP, DRP, ERP y planes de crisis</Typography></Box>
            <Chip label="GRC" size="small" sx={{ bgcolor:alpha(GRC_COLOR,.15), color:GRC_COLOR, fontWeight:700, border:`1px solid ${alpha(GRC_COLOR,.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={openNew} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' }, borderRadius:2 }}>Nuevo Plan</Button>
        </Box>

        <Grid container spacing={2} sx={{ mb:3 }}>
          {ESTADOS.map(est=>{ const color=ESTADO_COLOR[est]; return (
            <Grid key={est} size={{ xs:6, md:3 }}><Card sx={{ bgcolor:'#fff', border:`1px solid ${alpha(color,.3)}`, borderRadius:2 }}><CardContent sx={{ p:'14px !important' }}><Typography sx={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{planes.filter(p=>p.estado===est).length}</Typography><Typography sx={{ fontSize:11, color:LBL }}>{est}</Typography></CardContent></Card></Grid>
          )})}
        </Grid>

        <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ mb:2, borderBottom:'1px solid #F1F5F9', '& .MuiTab-root':{ color:'text.disabled', fontSize:12 }, '& .Mui-selected':{ color:GRC_COLOR }, '& .MuiTabs-indicator':{ bgcolor:GRC_COLOR } }}>
          <Tab label="Todos" />{TIPOS.map(t=><Tab key={t} label={t} />)}
        </Tabs>

        <Box sx={{ display:'flex', gap:2 }}>
          <Box sx={{ flex:1, minWidth:0 }}>
            <Paper sx={{ bgcolor:'#FFFFFF', border:'1px solid #E5E7EB', borderRadius:2, overflowX:'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th':{ borderColor:'#F1F5F9', color:LBL, fontSize:11, fontWeight:700, textTransform:'uppercase' } }}>
                  <TableCell>ID</TableCell><TableCell>Plan</TableCell><TableCell>Tipo</TableCell><TableCell>Área</TableCell><TableCell>RTO</TableCell><TableCell>RPO</TableCell><TableCell>Versión</TableCell><TableCell>Estado</TableCell><TableCell>Ú. Prueba</TableCell><TableCell>Acciones</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {filtered.map(p=>(
                    <TableRow key={p.id} onClick={()=>setSel(p)} sx={{ cursor:'pointer', bgcolor:sel?.id===p.id?alpha(GRC_COLOR,.06):'transparent', '&:hover':{ bgcolor:alpha(GRC_COLOR,.04) }, '& td':{ borderColor:'#F1F5F9', color:'text.secondary', fontSize:12 } }}>
                      <TableCell sx={{ fontSize:10.5, color:LBL }}>{p.id}</TableCell>
                      <TableCell sx={{ maxWidth:200 }}><Typography sx={{ fontSize:12.5, color:'text.primary', fontWeight:600, lineHeight:1.3 }}>{p.nombre}</Typography></TableCell>
                      <TableCell><Chip label={p.tipo} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(TIPO_COLOR[p.tipo]||GRC_COLOR,.18), color:TIPO_COLOR[p.tipo]||GRC_COLOR }} /></TableCell>
                      <TableCell sx={{ fontSize:11 }}>{p.area}</TableCell>
                      <TableCell sx={{ fontSize:11, color:'#D97706' }}>{p.rto}</TableCell>
                      <TableCell sx={{ fontSize:11, color:'#0891B2' }}>{p.rpo}</TableCell>
                      <TableCell><Chip label={`v${p.version}`} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(GRC_COLOR,.1), color:GRC_COLOR }} /></TableCell>
                      <TableCell><Chip label={p.estado} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(ESTADO_COLOR[p.estado],.18), color:ESTADO_COLOR[p.estado] }} /></TableCell>
                      <TableCell sx={{ fontSize:11 }}>{p.ultimoPrueba}</TableCell>
                      <TableCell>
                        <Box sx={{ display:'flex', gap:.25 }} onClick={e=>e.stopPropagation()}>
                          <IconButton size="small" title="Editar" onClick={e=>openEdit(p,e)} sx={{ color:GRC_COLOR, p:.5 }}><Edit sx={{ fontSize:14 }} /></IconButton>
                          <IconButton size="small" title="Eliminar" onClick={e=>requestDelete(p.id,p.nombre,e)} sx={{ color:'#DC2626', p:.5 }}><Delete sx={{ fontSize:14 }} /></IconButton>
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
                <Typography sx={{ color:'text.primary', fontWeight:700, fontSize:13, flex:1, pr:1, lineHeight:1.4 }}>{sel.nombre}</Typography>
                <IconButton size="small" onClick={()=>setSel(null)} sx={{ color:'text.disabled' }}><Close fontSize="small" /></IconButton>
              </Box>
              <Box sx={{ display:'flex', gap:.75, mb:2 }}>
                <Chip label={sel.tipo} size="small" sx={{ bgcolor:alpha(TIPO_COLOR[sel.tipo]||GRC_COLOR,.18), color:TIPO_COLOR[sel.tipo]||GRC_COLOR, fontSize:10 }} />
                <Chip label={sel.estado} size="small" sx={{ bgcolor:alpha(ESTADO_COLOR[sel.estado],.18), color:ESTADO_COLOR[sel.estado], fontWeight:700, fontSize:10 }} />
                <Chip label={`v${sel.version}`} size="small" sx={{ bgcolor:alpha(GRC_COLOR,.12), color:GRC_COLOR, fontSize:10 }} />
              </Box>
              <Box sx={{ display:'flex', gap:2, mb:1.5 }}><Box><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase' }}>RTO</Typography><Typography sx={{ fontSize:14, fontWeight:700, color:'#D97706' }}>{sel.rto}</Typography></Box><Box><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase' }}>RPO</Typography><Typography sx={{ fontSize:14, fontWeight:700, color:'#0891B2' }}>{sel.rpo}</Typography></Box></Box>
              <Row2 label="Área" value={sel.area} />
              <Row2 label="Responsable" value={sel.responsable} />
              <Row2 label="Aprobación" value={sel.fechaAprobacion} />
              <Row2 label="Revisión" value={sel.fechaRevision} />
              <Divider sx={{ borderColor:'#F1F5F9', my:1.5 }} />
              <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.75 }}>Descripción</Typography>
              <Typography sx={{ fontSize:12, color:'text.secondary', lineHeight:1.7, mb:2 }}>{sel.descripcion}</Typography>
              <Divider sx={{ borderColor:'#F1F5F9', my:1.5 }} />
              <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.5 }}>Última Prueba / Simulacro</Typography>
              <Typography sx={{ fontSize:11.5, color:'text.secondary', mb:.5 }}>{sel.ultimoPrueba}</Typography>
              <Typography sx={{ fontSize:11, color:'text.secondary', lineHeight:1.6, mb:2 }}>{sel.resultadoPrueba}</Typography>
              <Button size="small" startIcon={<PlayArrow />} fullWidth variant="contained" onClick={()=>ejecutarSimulacro(sel.id)} sx={{ bgcolor:'#D97706', '&:hover':{ bgcolor:'#B45309' }, mb:2 }}>Ejecutar Prueba de Simulacro</Button>
              <Divider sx={{ borderColor:'#F1F5F9', my:1 }} />
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
                <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em' }}>Documentos ({sel.documentos.length})</Typography>
                <Button size="small" startIcon={<UploadFile sx={{ fontSize:12 }} />} onClick={()=>fileRef.current?.click()} sx={{ color:GRC_COLOR, fontSize:10, p:'2px 8px', minWidth:'auto' }}>Subir</Button>
              </Box>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xlsx" style={{ display:'none' }} onChange={handleUpload} />
              {sel.documentos.map((d,i)=>(
                <Box key={i} sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', p:.75, mb:.5, bgcolor:'#F9FAFB', borderRadius:1, border:'1px solid #E5E7EB' }}>
                  <Typography sx={{ fontSize:11, color:'text.secondary', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, mr:1 }}>{d}</Typography>
                  <IconButton size="small" onClick={()=>handleDownload(d)} sx={{ color:GRC_COLOR, p:.5 }}><FileDownload sx={{ fontSize:14 }} /></IconButton>
                </Box>
              ))}
              <Divider sx={{ borderColor:'#F1F5F9', my:1.5 }} />
              <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                <Button size="small" startIcon={<Edit />} variant="outlined" fullWidth onClick={()=>openEdit(sel)} sx={{ color:GRC_COLOR, borderColor:alpha(GRC_COLOR,.4) }}>Editar Plan</Button>
                <Button size="small" startIcon={<Delete />} variant="outlined" fullWidth onClick={()=>requestDelete(sel.id,sel.nombre)} sx={{ color:'#DC2626', borderColor:alpha('#DC2626',.4) }}>Eliminar</Button>
              </Box>
            </Box>
          )}
        </Box>

        <Dialog open={dlgOpen} onClose={()=>setDlgOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight:700 }}>{editId?'Editar Plan':'Nuevo Plan de Continuidad'}</DialogTitle>
          <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'16px !important' }}>
            <TextField label="Nombre del Plan" fullWidth size="small" value={form.nombre} onChange={sf('nombre')} InputLabelProps={ILB} sx={TF} />
            <Box sx={{ display:'flex', gap:2 }}>
              <FormControl size="small" fullWidth><InputLabel>Tipo</InputLabel><Select label="Tipo" value={form.tipo} onChange={e=>ss('tipo',e.target.value)}>{TIPOS.map(t=><MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl>
              <FormControl size="small" fullWidth><InputLabel>Estado</InputLabel><Select label="Estado" value={form.estado} onChange={e=>ss('estado',e.target.value)}>{ESTADOS.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
            </Box>
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="Área" fullWidth size="small" value={form.area} onChange={sf('area')} InputLabelProps={ILB} sx={TF} />
              <TextField label="Responsable" fullWidth size="small" value={form.responsable} onChange={sf('responsable')} InputLabelProps={ILB} sx={TF} />
            </Box>
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="RTO Objetivo" fullWidth size="small" value={form.rto} onChange={sf('rto')} InputLabelProps={ILB} sx={TF} placeholder="ej: 4 horas" />
              <TextField label="RPO Objetivo" fullWidth size="small" value={form.rpo} onChange={sf('rpo')} InputLabelProps={ILB} sx={TF} placeholder="ej: 1 hora" />
            </Box>
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="Versión" fullWidth size="small" value={form.version} onChange={sf('version')} InputLabelProps={ILB} sx={TF} />
              <TextField label="Fecha Aprobación" type="date" fullWidth size="small" value={form.fechaAprobacion} onChange={sf('fechaAprobacion')} InputLabelProps={{ shrink:true }} sx={TF} />
            </Box>
            <TextField label="Fecha Revisión" type="date" fullWidth size="small" value={form.fechaRevision} onChange={sf('fechaRevision')} InputLabelProps={{ shrink:true }} sx={TF} />
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
