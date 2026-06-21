import React, { useState, useRef } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Divider, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert, LinearProgress, Rating,
} from '@mui/material'
import { Business, Add, Edit, Delete, Close, FileDownload, UploadFile } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const PAGE_BG   = '#060C1A'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = 'rgba(109,40,217,0.25)'
const LBL       = alpha(GRC_COLOR, 0.85)
const ESTADO_COLOR: Record<string,string> = { ACTIVO:'#059669', INACTIVO:'#6B7280', REVISION:'#D97706', SUSPENDIDO:'#DC2626' }
const RIESGO_COLOR: Record<string,string> = { BAJO:'#059669', MEDIO:'#D97706', ALTO:'#EA580C', CRITICO:'#DC2626' }
const TIPOS = ['PROVEEDOR','CLIENTE','ALIADO','SUBCONTRATISTA','REGULADOR']
const ESTADOS = Object.keys(ESTADO_COLOR)
const RIESGOS = Object.keys(RIESGO_COLOR)

const seed = [
  { id:'TER-001', nombre:'Coordinadora Mercantil', tipo:'PROVEEDOR', pais:'Colombia', nit:'890.903.641-3', contacto:'gerencia@coordinadora.com', responsable:'Dir. Operaciones', estado:'ACTIVO', riesgo:'BAJO', calificacion:4.5, vencimientoContrato:'2027-12-31', descripcion:'Proveedor principal de servicios de transporte nacional. Alianza estratégica de 8 años. Cubre rutas Bogotá-Medellín, Bogotá-Cali y Costa Atlántica.', documentos:['Contrato_2026.pdf','Poliza_RC_2026.pdf','Certificado_Cámara.pdf'] },
  { id:'TER-002', nombre:'Servientrega S.A.', tipo:'PROVEEDOR', pais:'Colombia', nit:'800.155.765-9', contacto:'corporativo@servientrega.com', responsable:'Dir. Operaciones', estado:'ACTIVO', riesgo:'BAJO', calificacion:4.2, vencimientoContrato:'2026-09-30', descripcion:'Proveedor de mensajería y última milla. 3 años de relación comercial. Requiere renovación contractual en septiembre 2026.', documentos:['Contrato_Vigente.pdf','Certificados_BASC.pdf'] },
  { id:'TER-003', nombre:'AWS Colombia (Amazon Web Services)', tipo:'PROVEEDOR', pais:'Colombia', nit:'N/A (Extranjero)', contacto:'colombia@aws.amazon.com', responsable:'CTO', estado:'ACTIVO', riesgo:'MEDIO', calificacion:4.8, vencimientoContrato:'2027-01-31', descripcion:'Proveedor crítico de infraestructura cloud. Plataforma base del WMS y ERP. SLA 99.99% de disponibilidad. Datos procesados bajo DPA firmado con marco GDPR.', documentos:['MSA_AWS_2025.pdf','DPA_Firmado.pdf','SOC2_Report.pdf'] },
  { id:'TER-004', nombre:'Seguros Bolívar S.A.', tipo:'ALIADO', pais:'Colombia', nit:'860.034.313-4', contacto:'empresas@segurosbolivar.com', responsable:'Dir. Financiero', estado:'ACTIVO', riesgo:'BAJO', calificacion:4.3, vencimientoContrato:'2026-12-31', descripcion:'Aseguradora para flota vehicular, carga transportada, SOAT y responsabilidad civil. Pólizas integradas con sistema de gestión de reclamos.', documentos:['Poliza_Flota_2026.pdf','Poliza_Carga_2026.pdf'] },
  { id:'TER-005', nombre:'Ministerio de Transporte', tipo:'REGULADOR', pais:'Colombia', nit:'899.999.077-4', contacto:'contactenos@mintransporte.gov.co', responsable:'CLO', estado:'ACTIVO', riesgo:'BAJO', calificacion:3.0, vencimientoContrato:'N/A', descripcion:'Entidad regulatoria principal para habilitaciones de transporte de carga. Gestión de permisos RNDC, habilitaciones empresariales y revisiones de flota.', documentos:['Habilitacion_Empresa_2025.pdf','RNDC_Certificado.pdf'] },
  { id:'TER-006', nombre:'Transportes Rápidos del Norte', tipo:'SUBCONTRATISTA', pais:'Colombia', nit:'890.500.123-1', contacto:'ops@transportesnorte.com', responsable:'Dir. Operaciones', estado:'REVISION', riesgo:'ALTO', calificacion:3.1, vencimientoContrato:'2026-08-15', descripcion:'Subcontratista regional para zona norte (Barranquilla, Cartagena, Santa Marta). Auditoría pendiente por 2 incidentes de carga en Q1 2026. Contrato en revisión.', documentos:['Subcontrato_2025.pdf'] },
]
type Tercero = typeof seed[0]
type Form = { nombre:string; tipo:string; pais:string; nit:string; contacto:string; responsable:string; estado:string; riesgo:string; vencimientoContrato:string; descripcion:string }
const EMPTY: Form = { nombre:'', tipo:'PROVEEDOR', pais:'Colombia', nit:'', contacto:'', responsable:'', estado:'ACTIVO', riesgo:'BAJO', vencimientoContrato:'', descripcion:'' }

const TF = { '& .MuiOutlinedInput-root':{ color:'#FFF', '& fieldset':{ borderColor:'rgba(255,255,255,0.15)' }, '&.Mui-focused fieldset':{ borderColor:GRC_COLOR } } }
const ILB = { sx:{ color:'rgba(255,255,255,0.5)' } }
const Row2 = ({ label, value, color }:{ label:string; value:string; color?:string }) => (
  <Box sx={{ mb:1.25 }}><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.25 }}>{label}</Typography><Typography sx={{ fontSize:13, color:color||'#E2E8F0', fontWeight:500 }}>{value}</Typography></Box>
)

export default function GRCTerceros() {
  const [terceros, setTerceros] = useState(seed)
  const [sel, setSel]           = useState<Tercero|null>(null)
  const [tab, setTab]           = useState(0)
  const [dlgOpen, setDlgOpen]   = useState(false)
  const [editId, setEditId]     = useState<string|null>(null)
  const [form, setForm]         = useState<Form>(EMPTY)
  const [blobUrls, setBlobUrls] = useState<Record<string,string>>({})
  const [snack, setSnack]       = useState('')
  const [delConfirm, setDelConfirm] = useState<{id:string;name:string}|null>(null)
  const [delInput, setDelInput]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const sf=(k:keyof Form)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(f=>({...f,[k]:e.target.value}))
  const ss=(k:keyof Form,v:string)=>setForm(f=>({...f,[k]:v}))
  const ok=(msg:string)=>setSnack(msg)

  const requestDelete=(id:string,name:string,e?:React.MouseEvent)=>{ e?.stopPropagation(); setDelConfirm({id,name}); setDelInput('') }
  const confirmDelete=()=>{ if(delInput!=='ELIMINAR'||!delConfirm) return; handleDelete(delConfirm.id); setDelConfirm(null); setDelInput('') }

  const openNew=()=>{ setForm(EMPTY); setEditId(null); setDlgOpen(true) }
  const openEdit=(t:Tercero,e?:React.MouseEvent)=>{ e?.stopPropagation(); setForm({ nombre:t.nombre, tipo:t.tipo, pais:t.pais, nit:t.nit, contacto:t.contacto, responsable:t.responsable, estado:t.estado, riesgo:t.riesgo, vencimientoContrato:t.vencimientoContrato, descripcion:t.descripcion }); setEditId(t.id); setDlgOpen(true) }
  const handleSave=()=>{
    if(editId){ setTerceros(list=>list.map(t=>t.id===editId?{...t,...form}:t)); if(sel?.id===editId) setSel(s=>s?{...s,...form}:null); ok('Tercero actualizado') }
    else { const n:Tercero={...form,id:`TER-${String(terceros.length+1).padStart(3,'0')}`,calificacion:4.0,documentos:[]}; setTerceros(list=>[...list,n]); ok('Tercero creado') }
    setDlgOpen(false)
  }
  const handleDelete=(id:string,e?:React.MouseEvent)=>{ e?.stopPropagation(); const nombre=terceros.find(t=>t.id===id)?.nombre||''; setTerceros(list=>list.filter(t=>t.id!==id)); if(sel?.id===id) setSel(null); ok(`"${nombre}" eliminado`) }
  const handleDownload=(name:string)=>{
    const url=blobUrls[name]
    const a=document.createElement('a')
    if(url){ a.href=url; a.download=name }
    else { const txt=`Documento: ${name}\nTercero: ${sel?.nombre||''}\nSistema GRC – Icoltrans\n\n[Archivo de demostración]`; a.href=URL.createObjectURL(new Blob([txt],{type:'application/octet-stream'})); a.download=name }
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    ok(`Descargando "${name}"`)
  }
  const handleUpload=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file||!sel) return
    const url=URL.createObjectURL(file)
    setBlobUrls(prev=>({...prev,[file.name]:url}))
    setTerceros(list=>list.map(t=>t.id===sel.id?{...t,documentos:[...t.documentos,file.name]}:t))
    setSel(s=>s?{...s,documentos:[...s.documentos,file.name]}:null)
    ok(`"${file.name}" adjuntado correctamente`)
    e.target.value=''
  }

  const filtered = tab===0 ? terceros : terceros.filter(t=>t.tipo===TIPOS[tab-1])

  return (
    <Layout>
      <Box sx={{ p:3, background:PAGE_BG, minHeight:'100vh' }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <Business sx={{ color:GRC_COLOR, fontSize:28 }} />
            <Box><Typography variant="h5" sx={{ fontWeight:800, color:'#FFF', lineHeight:1 }}>Gestión de Terceros</Typography><Typography sx={{ fontSize:12, color:LBL }}>GRC · Proveedores, clientes y partes relacionadas</Typography></Box>
            <Chip label="GRC" size="small" sx={{ bgcolor:alpha(GRC_COLOR,.15), color:GRC_COLOR, fontWeight:700, border:`1px solid ${alpha(GRC_COLOR,.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={openNew} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' }, borderRadius:2 }}>Nuevo Tercero</Button>
        </Box>

        <Grid container spacing={2} sx={{ mb:3 }}>
          {TIPOS.map(tipo=>{ const count=terceros.filter(t=>t.tipo===tipo).length; return (
            <Grid key={tipo} size={{ xs:6, md:'auto' }} sx={{ flex:1 }}><Card sx={{ bgcolor:CARD_BG, border:`1px solid ${CARD_BOR}`, borderRadius:2 }}><CardContent sx={{ p:'12px !important', textAlign:'center' }}><Typography sx={{ fontSize:22, fontWeight:800, color:GRC_COLOR }}>{count}</Typography><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase' }}>{tipo}</Typography></CardContent></Card></Grid>
          )})}
          <Grid size={{ xs:6, md:'auto' }} sx={{ flex:1 }}><Card sx={{ bgcolor:CARD_BG, border:`1px solid ${alpha('#DC2626',.3)}`, borderRadius:2 }}><CardContent sx={{ p:'12px !important', textAlign:'center' }}><Typography sx={{ fontSize:22, fontWeight:800, color:'#DC2626' }}>{terceros.filter(t=>t.riesgo==='ALTO'||t.riesgo==='CRITICO').length}</Typography><Typography sx={{ fontSize:10, color:'#DC2626', textTransform:'uppercase' }}>Alto/Crítico</Typography></CardContent></Card></Grid>
        </Grid>

        <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ mb:2, borderBottom:'1px solid rgba(255,255,255,0.08)', '& .MuiTab-root':{ color:'rgba(255,255,255,0.45)', fontSize:12 }, '& .Mui-selected':{ color:GRC_COLOR }, '& .MuiTabs-indicator':{ bgcolor:GRC_COLOR } }}>
          <Tab label="Todos" />{TIPOS.map(t=><Tab key={t} label={t} />)}
        </Tabs>

        <Box sx={{ display:'flex', gap:2 }}>
          <Box sx={{ flex:1, minWidth:0 }}>
            <Paper sx={{ bgcolor:'transparent', overflowX:'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th':{ borderColor:'rgba(255,255,255,0.06)', color:LBL, fontSize:11, fontWeight:700, textTransform:'uppercase' } }}>
                  <TableCell>ID</TableCell><TableCell>Nombre</TableCell><TableCell>Tipo</TableCell><TableCell>País</TableCell><TableCell>Responsable</TableCell><TableCell>Riesgo</TableCell><TableCell>Estado</TableCell><TableCell>Vence</TableCell><TableCell>Calif.</TableCell><TableCell>Acciones</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {filtered.map(t=>(
                    <TableRow key={t.id} onClick={()=>setSel(t)} sx={{ cursor:'pointer', bgcolor:sel?.id===t.id?alpha(GRC_COLOR,.06):'transparent', '&:hover':{ bgcolor:alpha(GRC_COLOR,.04) }, '& td':{ borderColor:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.8)', fontSize:12 } }}>
                      <TableCell sx={{ fontSize:10.5, color:LBL }}>{t.id}</TableCell>
                      <TableCell><Typography sx={{ fontSize:12.5, color:'#FFF', fontWeight:600 }}>{t.nombre}</Typography><Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>{t.nit}</Typography></TableCell>
                      <TableCell><Chip label={t.tipo} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(GRC_COLOR,.12), color:GRC_COLOR }} /></TableCell>
                      <TableCell>{t.pais}</TableCell>
                      <TableCell>{t.responsable}</TableCell>
                      <TableCell><Chip label={t.riesgo} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(RIESGO_COLOR[t.riesgo],.18), color:RIESGO_COLOR[t.riesgo] }} /></TableCell>
                      <TableCell><Chip label={t.estado} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(ESTADO_COLOR[t.estado],.18), color:ESTADO_COLOR[t.estado] }} /></TableCell>
                      <TableCell sx={{ fontSize:11 }}>{t.vencimientoContrato}</TableCell>
                      <TableCell><Rating value={t.calificacion} precision={0.5} size="small" readOnly sx={{ '& .MuiRating-iconFilled':{ color:GRC_COLOR } }} /></TableCell>
                      <TableCell>
                        <Box sx={{ display:'flex', gap:.25 }} onClick={e=>e.stopPropagation()}>
                          <IconButton size="small" title="Editar" onClick={e=>openEdit(t,e)} sx={{ color:GRC_COLOR, p:.5 }}><Edit sx={{ fontSize:14 }} /></IconButton>
                          <IconButton size="small" title="Eliminar" onClick={e=>requestDelete(t.id,t.nombre,e)} sx={{ color:'#DC2626', p:.5 }}><Delete sx={{ fontSize:14 }} /></IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>

          {sel&&(
            <Box sx={{ width:370, flexShrink:0, bgcolor:CARD_BG, border:`1px solid ${CARD_BOR}`, borderRadius:2, p:2.5, height:'fit-content' }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1 }}>
                <Typography sx={{ color:'#FFF', fontWeight:700, fontSize:13, flex:1, pr:1, lineHeight:1.4 }}>{sel.nombre}</Typography>
                <IconButton size="small" onClick={()=>setSel(null)} sx={{ color:'rgba(255,255,255,0.4)' }}><Close fontSize="small" /></IconButton>
              </Box>
              <Box sx={{ display:'flex', gap:.75, mb:2, flexWrap:'wrap' }}>
                <Chip label={sel.tipo} size="small" sx={{ bgcolor:alpha(GRC_COLOR,.15), color:GRC_COLOR, fontSize:10 }} />
                <Chip label={sel.estado} size="small" sx={{ bgcolor:alpha(ESTADO_COLOR[sel.estado],.18), color:ESTADO_COLOR[sel.estado], fontWeight:700, fontSize:10 }} />
                <Chip label={`Riesgo: ${sel.riesgo}`} size="small" sx={{ bgcolor:alpha(RIESGO_COLOR[sel.riesgo],.18), color:RIESGO_COLOR[sel.riesgo], fontSize:10 }} />
              </Box>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:2 }}><Rating value={sel.calificacion} precision={0.5} size="small" readOnly sx={{ '& .MuiRating-iconFilled':{ color:GRC_COLOR } }} /><Typography sx={{ fontSize:12, color:GRC_COLOR, fontWeight:700 }}>{sel.calificacion}/5</Typography></Box>
              <Row2 label="NIT" value={sel.nit} />
              <Row2 label="País" value={sel.pais} />
              <Row2 label="Contacto" value={sel.contacto} />
              <Row2 label="Responsable Interno" value={sel.responsable} />
              <Row2 label="Vencimiento Contrato" value={sel.vencimientoContrato} />
              <Divider sx={{ borderColor:'rgba(255,255,255,0.06)', my:1.5 }} />
              <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.75 }}>Descripción</Typography>
              <Typography sx={{ fontSize:12, color:'rgba(255,255,255,0.7)', lineHeight:1.7, mb:2 }}>{sel.descripcion}</Typography>
              <Divider sx={{ borderColor:'rgba(255,255,255,0.06)', my:1.5 }} />
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
                <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em' }}>Documentos ({sel.documentos.length})</Typography>
                <Button size="small" startIcon={<UploadFile sx={{ fontSize:12 }} />} onClick={()=>fileRef.current?.click()} sx={{ color:GRC_COLOR, fontSize:10, p:'2px 8px', minWidth:'auto' }}>Subir</Button>
              </Box>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xlsx,.png,.jpg" style={{ display:'none' }} onChange={handleUpload} />
              {sel.documentos.map((d,i)=>(
                <Box key={i} sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', p:.75, mb:.5, bgcolor:'rgba(255,255,255,0.03)', borderRadius:1, border:'1px solid rgba(255,255,255,0.06)' }}>
                  <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.7)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, mr:1 }}>{d}</Typography>
                  <IconButton size="small" title="Descargar" onClick={()=>handleDownload(d)} sx={{ color:GRC_COLOR, p:.5 }}><FileDownload sx={{ fontSize:14 }} /></IconButton>
                </Box>
              ))}
              <Divider sx={{ borderColor:'rgba(255,255,255,0.06)', my:1.5 }} />
              <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                <Button size="small" startIcon={<Edit />} variant="outlined" fullWidth onClick={()=>openEdit(sel)} sx={{ color:GRC_COLOR, borderColor:alpha(GRC_COLOR,.4) }}>Editar</Button>
                <Button size="small" startIcon={<Delete />} variant="outlined" fullWidth onClick={()=>requestDelete(sel.id,sel.nombre)} sx={{ color:'#DC2626', borderColor:alpha('#DC2626',.4) }}>Eliminar</Button>
              </Box>
            </Box>
          )}
        </Box>

        <Dialog open={dlgOpen} onClose={()=>setDlgOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx:{ bgcolor:'#1F2937', color:'#FFF' } }}>
          <DialogTitle sx={{ fontWeight:700 }}>{editId?'Editar Tercero':'Nuevo Tercero'}</DialogTitle>
          <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'16px !important' }}>
            <TextField label="Nombre / Razón Social" fullWidth size="small" value={form.nombre} onChange={sf('nombre')} InputLabelProps={ILB} sx={TF} />
            <Box sx={{ display:'flex', gap:2 }}>
              <FormControl size="small" fullWidth><InputLabel sx={{ color:'rgba(255,255,255,0.5)' }}>Tipo</InputLabel><Select label="Tipo" value={form.tipo} onChange={e=>ss('tipo',e.target.value)} sx={{ color:'#FFF', '& fieldset':{ borderColor:'rgba(255,255,255,0.15)' } }}>{TIPOS.map(t=><MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl>
              <FormControl size="small" fullWidth><InputLabel sx={{ color:'rgba(255,255,255,0.5)' }}>Estado</InputLabel><Select label="Estado" value={form.estado} onChange={e=>ss('estado',e.target.value)} sx={{ color:'#FFF', '& fieldset':{ borderColor:'rgba(255,255,255,0.15)' } }}>{ESTADOS.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
            </Box>
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="NIT / Identificación" fullWidth size="small" value={form.nit} onChange={sf('nit')} InputLabelProps={ILB} sx={TF} />
              <TextField label="País" fullWidth size="small" value={form.pais} onChange={sf('pais')} InputLabelProps={ILB} sx={TF} />
            </Box>
            <TextField label="Correo / Contacto" fullWidth size="small" value={form.contacto} onChange={sf('contacto')} InputLabelProps={ILB} sx={TF} />
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="Responsable Interno" fullWidth size="small" value={form.responsable} onChange={sf('responsable')} InputLabelProps={ILB} sx={TF} />
              <FormControl size="small" fullWidth><InputLabel sx={{ color:'rgba(255,255,255,0.5)' }}>Riesgo</InputLabel><Select label="Riesgo" value={form.riesgo} onChange={e=>ss('riesgo',e.target.value)} sx={{ color:'#FFF', '& fieldset':{ borderColor:'rgba(255,255,255,0.15)' } }}>{RIESGOS.map(r=><MenuItem key={r} value={r}>{r}</MenuItem>)}</Select></FormControl>
            </Box>
            <TextField label="Vencimiento Contrato" type="date" fullWidth size="small" value={form.vencimientoContrato} onChange={sf('vencimientoContrato')} InputLabelProps={{ shrink:true, sx:{ color:'rgba(255,255,255,0.5)' } }} sx={TF} />
            <TextField label="Descripción" multiline rows={3} fullWidth size="small" value={form.descripcion} onChange={sf('descripcion')} InputLabelProps={ILB} sx={TF} />
          </DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}><Button onClick={()=>setDlgOpen(false)} sx={{ color:'rgba(255,255,255,0.5)' }}>Cancelar</Button><Button variant="contained" onClick={handleSave} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' } }}>{editId?'Guardar Cambios':'Crear'}</Button></DialogActions>
        </Dialog>

        <Dialog open={!!delConfirm} onClose={()=>setDelConfirm(null)} maxWidth="xs" fullWidth PaperProps={{ sx:{ bgcolor:'#1F2937', color:'#FFF', border:'1px solid rgba(220,38,38,0.3)' } }}>
          <DialogTitle sx={{ fontWeight:700, color:'#DC2626' }}>¿Eliminar registro?</DialogTitle>
          <DialogContent sx={{ pt:'8px !important' }}>
            <Typography sx={{ fontSize:13, color:'rgba(255,255,255,0.7)', mb:2 }}>Va a eliminar <strong style={{ color:'#FFF' }}>"{delConfirm?.name}"</strong>. Esta acción no se puede deshacer.</Typography>
            <Typography sx={{ fontSize:12, color:'rgba(255,255,255,0.5)', mb:1 }}>Escriba <strong style={{ color:'#DC2626' }}>ELIMINAR</strong> para confirmar:</Typography>
            <TextField fullWidth size="small" placeholder="ELIMINAR" value={delInput} onChange={e=>setDelInput(e.target.value)} sx={{ '& .MuiOutlinedInput-root':{ color:'#FFF', '& fieldset':{ borderColor:'rgba(220,38,38,0.4)' }, '&.Mui-focused fieldset':{ borderColor:'#DC2626' } } }} />
          </DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}>
            <Button onClick={()=>setDelConfirm(null)} sx={{ color:'rgba(255,255,255,0.5)' }}>Cancelar</Button>
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
