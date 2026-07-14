import React, { useState, useRef } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Divider, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { BugReport, Add, Edit, Delete, Close, FileDownload, UploadFile, CheckCircle } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const PAGE_BG   = '#F0F2F5'
const LBL       = alpha(GRC_COLOR, 0.85)
const ESTADO_COLOR: Record<string,string> = { ABIERTO:'#DC2626', 'EN TRATAMIENTO':'#D97706', CERRADO:'#059669', VENCIDO:'#EA580C' }
const SEVERIDAD_COLOR: Record<string,string> = { CRITICA:'#DC2626', ALTA:'#EA580C', MEDIA:'#D97706', BAJA:'#059669' }
const ESTADOS    = Object.keys(ESTADO_COLOR)
const SEVERIDADES = Object.keys(SEVERIDAD_COLOR)
const CATEGORIAS = ['Operacional','Ciberseguridad','Compliance','Financiero','SST','Governance','Tecnológico']

const seed = [
  { id:'HAL-001', titulo:'Falta de control de acceso físico en cuarto de servidores', fuente:'Auditoría ISO 27001', area:'TI / Seguridad Física', responsable:'CTO', severidad:'ALTA', estado:'EN TRATAMIENTO', fechaDeteccion:'2026-05-10', fechaLimite:'2026-07-10', categoria:'Ciberseguridad', descripcion:'El cuarto de servidores no cuenta con control biométrico. El acceso solo requiere tarjeta magnética sin bitácora de ingresos. Riesgo de acceso no autorizado a infraestructura crítica.', planAccion:'Instalación de lector biométrico programada para junio 2026. Cotización aprobada por $8.5M COP.', evidencias:['Foto_sala_servidores_actual.jpg'] },
  { id:'HAL-002', titulo:'Reportes UIAF presentados fuera de plazo en 2 meses', fuente:'Auditoría SARLAFT', area:'Compliance / Financiero', responsable:'CLO', severidad:'ALTA', estado:'EN TRATAMIENTO', fechaDeteccion:'2026-06-01', fechaLimite:'2026-07-31', categoria:'Compliance', descripcion:'Los reportes de operaciones sospechosas para los meses de marzo y abril 2026 fueron presentados con 5 días de retraso sobre el plazo legal, lo que constituye una debilidad en el proceso de compliance SARLAFT.', planAccion:'Implementación de alertas automáticas de vencimiento en sistema de gestión documental. Revisión del calendario de obligaciones regulatorias.', evidencias:['Reporte_UIAF_Marzo_2026.pdf','Captura_envio_tardio.png'] },
  { id:'HAL-003', titulo:'2 vehículos con revisión técnico-mecánica vencida', fuente:'Auditoría Flota SST', area:'Operaciones / SST', responsable:'Dir. SST', severidad:'MEDIA', estado:'CERRADO', fechaDeteccion:'2026-04-10', fechaLimite:'2026-05-15', categoria:'SST', descripcion:'Vehículos de placas XYZ-123 y ABC-456 operaron 12 días con la revisión técnico-mecánica vencida. Riesgo de infracción y sanciones del Ministerio de Transporte.', planAccion:'Revisiones realizadas el 15 de abril. Sistema de alertas vehiculares actualizado para notificar 30 días antes del vencimiento. CERRADO.', evidencias:['Cert_Revision_XYZ123_2026.pdf','Cert_Revision_ABC456_2026.pdf'] },
  { id:'HAL-004', titulo:'Formato de reporte de accidentes laborales desactualizado', fuente:'Revisión Interna SST', area:'SST / RRHH', responsable:'Dir. SST', severidad:'BAJA', estado:'CERRADO', fechaDeteccion:'2026-04-15', fechaLimite:'2026-05-30', categoria:'SST', descripcion:'El formato de reporte de accidentes laborales no incluía los campos requeridos por la Resolución 1111 de 2017. 3 reportes del trimestre presentados de forma incompleta.', planAccion:'Formato actualizado y distribuido a toda la operación. Capacitación realizada el 28 de abril. CERRADO.', evidencias:['Formato_FURAT_Actualizado_v2.xlsx'] },
  { id:'HAL-005', titulo:'Brecha en RTO: 6h vs objetivo de 4h en prueba BCP', fuente:'Prueba Continuidad Negocio', area:'TI / Operaciones', responsable:'CTO', severidad:'ALTA', estado:'ABIERTO', fechaDeteccion:'2026-04-20', fechaLimite:'2026-08-31', categoria:'Tecnológico', descripcion:'La prueba de recuperación de sistemas WMS y ERP arrojó un tiempo de recuperación de 6 horas, 2 horas por encima del objetivo contractual de 4 horas. Causa principal: proceso manual de restauración de backups.', planAccion:'Revisión de arquitectura de recuperación en curso. Evaluación de solución de backup automatizada. Fecha estimada de corrección: agosto 2026.', evidencias:['Informe_Prueba_BCP_Abril2026.pdf'] },
  { id:'HAL-006', titulo:'Segmentación de clientes insuficiente en sistema SARLAFT', fuente:'Auditoría SARLAFT', area:'Compliance', responsable:'CLO', severidad:'CRITICA', estado:'ABIERTO', fechaDeteccion:'2026-06-01', fechaLimite:'2026-06-30', categoria:'Compliance', descripcion:'El modelo de segmentación de clientes no distingue correctamente entre personas naturales y jurídicas de alto riesgo de LA/FT. El motor de reglas presenta 4 gaps identificados respecto a la Circular 100-000016 de la SFC.', planAccion:'Revisión urgente del motor de reglas SARLAFT. Reunión con proveedor del sistema agendada para el 25 de junio.', evidencias:[] },
]
type Hallazgo = typeof seed[0]
type Form = { titulo:string; fuente:string; area:string; responsable:string; severidad:string; estado:string; fechaDeteccion:string; fechaLimite:string; categoria:string; descripcion:string; planAccion:string }
const EMPTY: Form = { titulo:'', fuente:'', area:'', responsable:'', severidad:'MEDIA', estado:'ABIERTO', fechaDeteccion:'', fechaLimite:'', categoria:'Operacional', descripcion:'', planAccion:'' }

const Row2 = ({ label, value, color }:{ label:string; value:string; color?:string }) => (
  <Box sx={{ mb:1.25 }}><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.25 }}>{label}</Typography><Typography sx={{ fontSize:13, color:color||'#334155', fontWeight:500 }}>{value}</Typography></Box>
)

export default function GRCHallazgos() {
  const [hallazgos, setHallazgos] = useState(seed)
  const [sel, setSel]             = useState<Hallazgo|null>(null)
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
  const openEdit=(h:Hallazgo,e?:React.MouseEvent)=>{ e?.stopPropagation(); setForm({ titulo:h.titulo, fuente:h.fuente, area:h.area, responsable:h.responsable, severidad:h.severidad, estado:h.estado, fechaDeteccion:h.fechaDeteccion, fechaLimite:h.fechaLimite, categoria:h.categoria, descripcion:h.descripcion, planAccion:h.planAccion }); setEditId(h.id); setDlgOpen(true) }
  const handleSave=()=>{
    if(editId){ setHallazgos(list=>list.map(h=>h.id===editId?{...h,...form}:h)); if(sel?.id===editId) setSel(s=>s?{...s,...form}:null); ok('Hallazgo actualizado') }
    else { const n:Hallazgo={...form,id:`HAL-${String(hallazgos.length+1).padStart(3,'0')}`,evidencias:[]}; setHallazgos(list=>[...list,n]); ok('Hallazgo creado') }
    setDlgOpen(false)
  }
  const handleDelete=(id:string,e?:React.MouseEvent)=>{ e?.stopPropagation(); const titulo=hallazgos.find(h=>h.id===id)?.titulo||''; setHallazgos(list=>list.filter(h=>h.id!==id)); if(sel?.id===id) setSel(null); ok(`"${titulo}" eliminado`) }
  const marcarCerrado=(id:string)=>{ setHallazgos(list=>list.map(h=>h.id===id?{...h,estado:'CERRADO'}:h)); if(sel?.id===id) setSel(s=>s?{...s,estado:'CERRADO'}:null); ok('Hallazgo marcado como CERRADO') }
  const handleDownload=(name:string)=>{
    const url=blobUrls[name]
    const a=document.createElement('a')
    if(url){ a.href=url; a.download=name }
    else { const txt=`Evidencia: ${name}\nHallazgo: ${sel?.titulo||''}\nSistema GRC – Icoltrans\n\n[Archivo de demostración]`; a.href=URL.createObjectURL(new Blob([txt],{type:'application/octet-stream'})); a.download=name }
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    ok(`Descargando "${name}"`)
  }
  const handleUpload=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file||!sel) return
    const url=URL.createObjectURL(file)
    setBlobUrls(prev=>({...prev,[file.name]:url}))
    setHallazgos(list=>list.map(h=>h.id===sel.id?{...h,evidencias:[...h.evidencias,file.name]}:h))
    setSel(s=>s?{...s,evidencias:[...s.evidencias,file.name]}:null)
    ok(`Evidencia "${file.name}" cargada correctamente`)
    e.target.value=''
  }

  const filtered = tab===0 ? hallazgos : tab===1 ? hallazgos.filter(h=>h.estado==='ABIERTO'||h.estado==='VENCIDO'||h.estado==='EN TRATAMIENTO') : hallazgos.filter(h=>h.estado==='CERRADO')

  return (
    <Layout>
      <Box sx={{ p:3, background:PAGE_BG, minHeight:'100vh' }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <BugReport sx={{ color:GRC_COLOR, fontSize:28 }} />
            <Box><Typography variant="h5" sx={{ fontWeight:800, color:'#1E293B', lineHeight:1 }}>Gestión de Hallazgos</Typography><Typography sx={{ fontSize:12, color:LBL }}>GRC · Seguimiento de hallazgos y planes de acción</Typography></Box>
            <Chip label="GRC" size="small" sx={{ bgcolor:alpha(GRC_COLOR,.15), color:GRC_COLOR, fontWeight:700, border:`1px solid ${alpha(GRC_COLOR,.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={openNew} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' }, borderRadius:2 }}>Nuevo Hallazgo</Button>
        </Box>

        <Grid container spacing={2} sx={{ mb:3 }}>
          {ESTADOS.map(est=>{ const color=ESTADO_COLOR[est]; return (
            <Grid key={est} size={{ xs:6, md:3 }}><Card sx={{ bgcolor:'#FFFFFF', border:`1px solid ${alpha(color,.3)}`, borderRadius:2 }}><CardContent sx={{ p:'14px !important' }}><Typography sx={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{hallazgos.filter(h=>h.estado===est).length}</Typography><Typography sx={{ fontSize:11, color:LBL }}>{est}</Typography></CardContent></Card></Grid>
          )})}
        </Grid>

        <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ mb:2, borderBottom:'1px solid #E5E7EB', '& .MuiTab-root':{ color:'#64748B', fontSize:12 }, '& .Mui-selected':{ color:GRC_COLOR }, '& .MuiTabs-indicator':{ bgcolor:GRC_COLOR } }}>
          <Tab label="Todos" /><Tab label="Activos" /><Tab label="Cerrados" />
        </Tabs>

        <Box sx={{ display:'flex', gap:2 }}>
          <Box sx={{ flex:1, minWidth:0 }}>
            <Paper sx={{ bgcolor:'#FFFFFF', border:'1px solid #E5E7EB', borderRadius:2, overflowX:'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th':{ borderColor:'#E5E7EB', color:LBL, fontSize:11, fontWeight:700, textTransform:'uppercase' } }}>
                  <TableCell>ID</TableCell><TableCell>Hallazgo</TableCell><TableCell>Fuente</TableCell><TableCell>Área</TableCell><TableCell>Severidad</TableCell><TableCell>Estado</TableCell><TableCell>Límite</TableCell><TableCell>Acciones</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {filtered.map(h=>(
                    <TableRow key={h.id} onClick={()=>setSel(h)} sx={{ cursor:'pointer', bgcolor:sel?.id===h.id?alpha(GRC_COLOR,.06):'transparent', '&:hover':{ bgcolor:alpha(GRC_COLOR,.04) }, '& td':{ borderColor:'#E5E7EB', color:'#334155', fontSize:12 } }}>
                      <TableCell sx={{ fontSize:10.5, color:LBL }}>{h.id}</TableCell>
                      <TableCell sx={{ maxWidth:220 }}><Typography sx={{ fontSize:12.5, color:'#1E293B', fontWeight:600, lineHeight:1.3 }}>{h.titulo}</Typography></TableCell>
                      <TableCell sx={{ fontSize:11 }}>{h.fuente}</TableCell>
                      <TableCell sx={{ fontSize:11 }}>{h.area}</TableCell>
                      <TableCell><Chip label={h.severidad} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(SEVERIDAD_COLOR[h.severidad],.18), color:SEVERIDAD_COLOR[h.severidad] }} /></TableCell>
                      <TableCell><Chip label={h.estado} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(ESTADO_COLOR[h.estado],.18), color:ESTADO_COLOR[h.estado] }} /></TableCell>
                      <TableCell sx={{ fontSize:11, color:h.estado!=='CERRADO'&&h.fechaLimite<'2026-06-21'?'#DC2626':'#64748B' }}>{h.fechaLimite}</TableCell>
                      <TableCell>
                        <Box sx={{ display:'flex', gap:.25 }} onClick={e=>e.stopPropagation()}>
                          <IconButton size="small" title="Editar" onClick={e=>openEdit(h,e)} sx={{ color:GRC_COLOR, p:.5 }}><Edit sx={{ fontSize:14 }} /></IconButton>
                          <IconButton size="small" title="Eliminar" onClick={e=>requestDelete(h.id,h.titulo,e)} sx={{ color:'#DC2626', p:.5 }}><Delete sx={{ fontSize:14 }} /></IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>

          {sel&&(
            <Box sx={{ width:370, flexShrink:0, bgcolor:'#FFFFFF', border:`1px solid #E5E7EB`, borderRadius:2, p:2.5, height:'fit-content' }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1 }}>
                <Typography sx={{ color:'#1E293B', fontWeight:700, fontSize:13, flex:1, pr:1, lineHeight:1.4 }}>{sel.titulo}</Typography>
                <IconButton size="small" onClick={()=>setSel(null)} sx={{ color:'#64748B' }}><Close fontSize="small" /></IconButton>
              </Box>
              <Box sx={{ display:'flex', gap:.75, mb:2, flexWrap:'wrap' }}>
                <Chip label={sel.severidad} size="small" sx={{ bgcolor:alpha(SEVERIDAD_COLOR[sel.severidad],.18), color:SEVERIDAD_COLOR[sel.severidad], fontWeight:700, fontSize:10 }} />
                <Chip label={sel.estado} size="small" sx={{ bgcolor:alpha(ESTADO_COLOR[sel.estado],.18), color:ESTADO_COLOR[sel.estado], fontWeight:700, fontSize:10 }} />
                <Chip label={sel.categoria} size="small" sx={{ bgcolor:alpha(GRC_COLOR,.12), color:GRC_COLOR, fontSize:10 }} />
              </Box>
              <Row2 label="Fuente" value={sel.fuente} />
              <Row2 label="Área" value={sel.area} />
              <Row2 label="Responsable" value={sel.responsable} />
              <Row2 label="Detectado" value={sel.fechaDeteccion} />
              <Row2 label="Límite" value={sel.fechaLimite} color={sel.estado!=='CERRADO'&&sel.fechaLimite<'2026-06-21'?'#DC2626':undefined} />
              <Divider sx={{ borderColor:'#E5E7EB', my:1.5 }} />
              <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.75 }}>Descripción</Typography>
              <Typography sx={{ fontSize:12, color:'#334155', lineHeight:1.7, mb:2 }}>{sel.descripcion}</Typography>
              <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.75 }}>Plan de Acción</Typography>
              <Typography sx={{ fontSize:12, color:'#334155', lineHeight:1.7, mb:2 }}>{sel.planAccion}</Typography>
              <Divider sx={{ borderColor:'#E5E7EB', my:1.5 }} />
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
                <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em' }}>Evidencias ({sel.evidencias.length})</Typography>
                <Button size="small" startIcon={<UploadFile sx={{ fontSize:12 }} />} onClick={()=>fileRef.current?.click()} sx={{ color:GRC_COLOR, fontSize:10, p:'2px 8px', minWidth:'auto' }}>Subir</Button>
              </Box>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xlsx,.png,.jpg" style={{ display:'none' }} onChange={handleUpload} />
              {sel.evidencias.map((ev,i)=>(
                <Box key={i} sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', p:.75, mb:.5, bgcolor:'#F8FAFC', borderRadius:1, border:'1px solid #E5E7EB' }}>
                  <Typography sx={{ fontSize:11, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, mr:1 }}>{ev}</Typography>
                  <IconButton size="small" onClick={()=>handleDownload(ev)} sx={{ color:GRC_COLOR, p:.5 }}><FileDownload sx={{ fontSize:14 }} /></IconButton>
                </Box>
              ))}
              <Divider sx={{ borderColor:'#E5E7EB', my:1.5 }} />
              <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                {sel.estado!=='CERRADO'&&<Button size="small" startIcon={<CheckCircle />} variant="contained" fullWidth onClick={()=>marcarCerrado(sel.id)} sx={{ bgcolor:'#059669', '&:hover':{ bgcolor:'#047857' } }}>Marcar como Cerrado</Button>}
                <Button size="small" startIcon={<Edit />} variant="outlined" fullWidth onClick={()=>openEdit(sel)} sx={{ color:GRC_COLOR, borderColor:alpha(GRC_COLOR,.4) }}>Editar Hallazgo</Button>
                <Button size="small" startIcon={<Delete />} variant="outlined" fullWidth onClick={()=>requestDelete(sel.id,sel.titulo)} sx={{ color:'#DC2626', borderColor:alpha('#DC2626',.4) }}>Eliminar</Button>
              </Box>
            </Box>
          )}
        </Box>

        <Dialog open={dlgOpen} onClose={()=>setDlgOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight:700 }}>{editId?'Editar Hallazgo':'Nuevo Hallazgo'}</DialogTitle>
          <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'16px !important' }}>
            <TextField label="Título del Hallazgo" fullWidth size="small" value={form.titulo} onChange={sf('titulo')} />
            <Box sx={{ display:'flex', gap:2 }}>
              <FormControl size="small" fullWidth><InputLabel>Severidad</InputLabel><Select label="Severidad" value={form.severidad} onChange={e=>ss('severidad',e.target.value)}>{SEVERIDADES.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
              <FormControl size="small" fullWidth><InputLabel>Estado</InputLabel><Select label="Estado" value={form.estado} onChange={e=>ss('estado',e.target.value)}>{ESTADOS.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
            </Box>
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="Fuente / Origen" fullWidth size="small" value={form.fuente} onChange={sf('fuente')} />
              <FormControl size="small" fullWidth><InputLabel>Categoría</InputLabel><Select label="Categoría" value={form.categoria} onChange={e=>ss('categoria',e.target.value)}>{CATEGORIAS.map(c=><MenuItem key={c} value={c}>{c}</MenuItem>)}</Select></FormControl>
            </Box>
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="Área" fullWidth size="small" value={form.area} onChange={sf('area')} />
              <TextField label="Responsable" fullWidth size="small" value={form.responsable} onChange={sf('responsable')} />
            </Box>
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="Fecha Detección" type="date" fullWidth size="small" value={form.fechaDeteccion} onChange={sf('fechaDeteccion')} InputLabelProps={{ shrink:true }} />
              <TextField label="Fecha Límite" type="date" fullWidth size="small" value={form.fechaLimite} onChange={sf('fechaLimite')} InputLabelProps={{ shrink:true }} />
            </Box>
            <TextField label="Descripción" multiline rows={3} fullWidth size="small" value={form.descripcion} onChange={sf('descripcion')} />
            <TextField label="Plan de Acción" multiline rows={2} fullWidth size="small" value={form.planAccion} onChange={sf('planAccion')} />
          </DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}><Button onClick={()=>setDlgOpen(false)} sx={{ color:'#64748B' }}>Cancelar</Button><Button variant="contained" onClick={handleSave} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' } }}>{editId?'Guardar Cambios':'Crear'}</Button></DialogActions>
        </Dialog>

        <Dialog open={!!delConfirm} onClose={()=>setDelConfirm(null)} maxWidth="xs" fullWidth PaperProps={{ sx:{ border:'1px solid rgba(220,38,38,0.3)' } }}>
          <DialogTitle sx={{ fontWeight:700, color:'#DC2626' }}>¿Eliminar registro?</DialogTitle>
          <DialogContent sx={{ pt:'8px !important' }}>
            <Typography sx={{ fontSize:13, color:'#334155', mb:2 }}>Va a eliminar <strong style={{ color:'#1E293B' }}>"{delConfirm?.name}"</strong>. Esta acción no se puede deshacer.</Typography>
            <Typography sx={{ fontSize:12, color:'#64748B', mb:1 }}>Escriba <strong style={{ color:'#DC2626' }}>ELIMINAR</strong> para confirmar:</Typography>
            <TextField fullWidth size="small" placeholder="ELIMINAR" value={delInput} onChange={e=>setDelInput(e.target.value)} sx={{ '& .MuiOutlinedInput-root':{ '& fieldset':{ borderColor:'rgba(220,38,38,0.4)' }, '&.Mui-focused fieldset':{ borderColor:'#DC2626' } } }} />
          </DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}>
            <Button onClick={()=>setDelConfirm(null)} sx={{ color:'#64748B' }}>Cancelar</Button>
            <Button variant="contained" disabled={delInput!=='ELIMINAR'} onClick={confirmDelete} sx={{ bgcolor:'#DC2626', '&:hover':{ bgcolor:'#B91C1C' }, '&.Mui-disabled':{ bgcolor:'rgba(220,38,38,0.25)', color:'rgba(255,255,255,0.3)' } }}>Eliminar</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={!!snack} autoHideDuration={3500} onClose={()=>setSnack('')} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
          <Alert severity="success" onClose={()=>setSnack('')} sx={{ bgcolor:'#1E3A2F', color:'#FFF', '& .MuiAlert-icon':{ color:'#4ADE80' } }}>{snack}</Alert>
        </Snackbar>
      </Box>
    </Layout>
  )
}
