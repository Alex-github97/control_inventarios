import React, { useState, useRef } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Divider, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Gavel, Add, Edit, Delete, Close, AttachFile, History, FileDownload, UploadFile } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const PAGE_BG   = '#F0F2F5'
const LBL       = alpha(GRC_COLOR, 0.85)

const TIPO_COLOR: Record<string,string> = { LEY:'#DC2626', DECRETO:'#EA580C', RESOLUCION:'#D97706', NORMA_ISO:GRC_COLOR, NORMA_TECNICA:'#0891B2', CONTRATO:'#059669', INTERNO:'#6B7280' }
const ESTADO_COLOR: Record<string,string> = { CUMPLIENDO:'#059669', PARCIAL:'#D97706', INCUMPLIMIENTO:'#DC2626', NO_APLICA:'#6B7280' }
const TIPOS   = Object.keys(TIPO_COLOR)
const ESTADOS = Object.keys(ESTADO_COLOR)
const PAISES  = ['Colombia','Ecuador','Perú','Venezuela','Panamá','México','España','EE.UU.','Brasil','Argentina','Internacional']
const AREAS   = ['Operaciones','TI / Tecnología','Compliance / Legal','Financiero','RRHH','Dirección General','Comercial','Logística','SST / HSE','GRC','Auditoría','Jurídico','Calidad','Seguridad','Bodega']
const RESPONSABLES = ['CEO','CFO','COO','CTO','CISO','CLO','CRMO','CCO','Dir. Operaciones','Dir. Financiero','Dir. RRHH','Dir. TI','Dir. Calidad','Dir. SST','Dir. GRC','Dir. Auditoría','Dir. Comercial','Dir. Seguridad','Dir. HSE','Dir. General','Auditor Interno']

const seed = [
  { codigo:'OBL-001', nombre:'Ley 1581 Protección de Datos', tipo:'LEY', pais:'Colombia', area:'Jurídico', responsable:'CLO', vencimiento:'2026-12-31', estado:'CUMPLIENDO', descripcion:'Regula el tratamiento de datos personales. Establece derechos de los titulares y deberes de los responsables del tratamiento.', adjuntos:['Ley_1581_texto.pdf','Politica_Privacidad_v4.pdf'], version:'2012' },
  { codigo:'OBL-002', nombre:'Decreto 1072 Seguridad y Salud en el Trabajo', tipo:'DECRETO', pais:'Colombia', area:'RRHH', responsable:'Dir. RRHH', vencimiento:'2026-07-01', estado:'PARCIAL', descripcion:'Decreto Único Reglamentario del Sector Trabajo. Establece el SG-SST con requisitos de documentación y evaluaciones de riesgo.', adjuntos:['Decreto_1072_2015.pdf'], version:'2015' },
  { codigo:'OBL-003', nombre:'ISO 9001:2015 Gestión de Calidad', tipo:'NORMA_ISO', pais:'Internacional', area:'Calidad', responsable:'Dir. Calidad', vencimiento:'2027-04-30', estado:'CUMPLIENDO', descripcion:'Norma que especifica requisitos para un sistema de gestión de la calidad con enfoque en el cliente y mejora continua.', adjuntos:['Certificado_ISO9001.pdf'], version:'2015' },
  { codigo:'OBL-004', nombre:'ISO 27001:2022 Seguridad de la Información', tipo:'NORMA_ISO', pais:'Internacional', area:'TI / Tecnología', responsable:'CISO', vencimiento:'2026-11-15', estado:'PARCIAL', descripcion:'Estándar para gestión de seguridad de la información. Requiere establecer y mejorar un SGSI con 93 controles.', adjuntos:['Gap_Analysis_ISO27001.pdf'], version:'2022' },
  { codigo:'OBL-005', nombre:'Resolución DIAN Facturación Electrónica', tipo:'RESOLUCION', pais:'Colombia', area:'Financiero', responsable:'CFO', vencimiento:'2026-06-30', estado:'INCUMPLIMIENTO', descripcion:'Resolución que regula la facturación electrónica obligatoria: formatos XML, validación previa y conservación de facturas.', adjuntos:[], version:'2023' },
  { codigo:'OBL-006', nombre:'BASC — Business Anti-Smuggling Coalition', tipo:'NORMA_TECNICA', pais:'Colombia', area:'Seguridad', responsable:'Dir. Seguridad', vencimiento:'2027-02-28', estado:'CUMPLIENDO', descripcion:'Requisitos del sistema de gestión de seguridad en la cadena de suministro: controles de acceso, inspección de carga y auditorías.', adjuntos:['Certificado_BASC_2026.pdf'], version:'2022' },
]
type Obl = typeof seed[0]
type Form = { nombre:string; tipo:string; pais:string; area:string; responsable:string; vencimiento:string; estado:string; descripcion:string }
const EMPTY: Form = { nombre:'', tipo:'LEY', pais:'Colombia', area:'', responsable:'', vencimiento:'', estado:'CUMPLIENDO', descripcion:'' }

const Row2 = ({ label, value, color }:{ label:string; value:string; color?:string }) => (
  <Box sx={{ mb:1.25 }}><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.25 }}>{label}</Typography><Typography sx={{ fontSize:13, color:color||'#334155', fontWeight:500 }}>{value}</Typography></Box>
)

export default function GRCObligaciones() {
  const [obls, setObls]           = useState(seed)
  const [sel, setSel]             = useState<Obl|null>(null)
  const [tab, setTab]             = useState(0)
  const [dlgOpen, setDlgOpen]     = useState(false)
  const [editId, setEditId]       = useState<string|null>(null)
  const [form, setForm]           = useState<Form>(EMPTY)
  const [blobUrls, setBlobUrls]   = useState<Record<string,string>>({})
  const [snack, setSnack]         = useState('')
  const [snackType, setSnackType] = useState<'success'|'error'>('success')
  const [delConfirm, setDelConfirm] = useState<{id:string;name:string}|null>(null)
  const [delInput, setDelInput]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const sf = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setForm(f=>({...f,[k]:e.target.value}))
  const ss = (k: keyof Form, v: string) => setForm(f=>({...f,[k]:v}))
  const ok = (msg: string) => { setSnack(msg); setSnackType('success') }
  const err = (msg: string) => { setSnack(msg); setSnackType('error') }

  const requestDelete = (id: string, name: string, e?: React.MouseEvent) => { e?.stopPropagation(); setDelConfirm({id,name}); setDelInput('') }
  const confirmDelete = () => { if (delInput!=='ELIMINAR'||!delConfirm) return; handleDelete(delConfirm.id); setDelConfirm(null); setDelInput('') }

  const openNew = () => { setForm(EMPTY); setEditId(null); setDlgOpen(true) }
  const openEdit = (o: Obl, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setForm({ nombre:o.nombre, tipo:o.tipo, pais:o.pais, area:o.area, responsable:o.responsable, vencimiento:o.vencimiento, estado:o.estado, descripcion:o.descripcion })
    setEditId(o.codigo); setDlgOpen(true)
  }
  const handleSave = () => {
    if (!form.nombre.trim()) return err('El nombre es requerido')
    if (editId) {
      setObls(list => list.map(o => o.codigo===editId ? {...o,...form} : o))
      if (sel?.codigo===editId) setSel(s => s ? {...s,...form} : null)
      ok('Obligación actualizada correctamente')
    } else {
      const n: Obl = { ...form, codigo:`OBL-${String(obls.length+1).padStart(3,'0')}`, adjuntos:[], version:'2026' }
      setObls(list => [...list, n])
      ok('Obligación creada correctamente')
    }
    setDlgOpen(false)
  }
  const handleDelete = (codigo: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const nombre = obls.find(o=>o.codigo===codigo)?.nombre||''
    setObls(list => list.filter(o=>o.codigo!==codigo))
    if (sel?.codigo===codigo) setSel(null)
    ok(`"${nombre}" eliminada`)
  }
  const handleDownload = (name: string) => {
    const url = blobUrls[name]
    const a = document.createElement('a')
    if (url) { a.href = url; a.download = name }
    else {
      const txt = `Documento: ${name}\nSistema GRC – Icoltrans\n\n[Archivo de demostración]`
      a.href = URL.createObjectURL(new Blob([txt],{type:'application/octet-stream'})); a.download = name
    }
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    ok(`Descargando "${name}"`)
  }
  const triggerUpload = (e?: React.MouseEvent) => { e?.stopPropagation(); fileRef.current?.click() }
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !sel) return
    const url = URL.createObjectURL(file)
    setBlobUrls(prev=>({...prev,[file.name]:url}))
    setObls(list=>list.map(o=>o.codigo===sel.codigo ? {...o,adjuntos:[...o.adjuntos,file.name]} : o))
    setSel(s=>s ? {...s,adjuntos:[...s.adjuntos,file.name]} : null)
    ok(`"${file.name}" adjuntado correctamente`); e.target.value=''
  }
  const removeAdj = (adj: string) => {
    setObls(list=>list.map(o=>o.codigo===sel!.codigo ? {...o,adjuntos:o.adjuntos.filter(a=>a!==adj)} : o))
    setSel(s=>s ? {...s,adjuntos:s.adjuntos.filter(a=>a!==adj)} : null)
    ok('Archivo eliminado')
  }

  const filtradas = tab===0 ? obls : obls.filter(o=>o.estado!=='CUMPLIENDO')

  return (
    <Layout>
      <Box sx={{ p:3, background:PAGE_BG, minHeight:'100vh' }}>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xlsx,.png,.jpg" style={{ display:'none' }} onChange={handleUpload} />

        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <Gavel sx={{ color:GRC_COLOR, fontSize:28 }} />
            <Box><Typography variant="h5" sx={{ fontWeight:800, color:'#1E293B', lineHeight:1 }}>Registro Normativo</Typography><Typography sx={{ fontSize:12, color:LBL }}>GRC · Leyes · Decretos · Normas ISO</Typography></Box>
            <Chip label="GRC" size="small" sx={{ bgcolor:alpha(GRC_COLOR,.15), color:GRC_COLOR, fontWeight:700, border:`1px solid ${alpha(GRC_COLOR,.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={openNew} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' }, borderRadius:2 }}>Nueva Obligación</Button>
        </Box>

        <Grid container spacing={2} sx={{ mb:3 }}>
          {[{ label:'Cumpliendo', value:obls.filter(o=>o.estado==='CUMPLIENDO').length, color:'#059669' },{ label:'Parcial', value:obls.filter(o=>o.estado==='PARCIAL').length, color:'#D97706' },{ label:'Incumplimiento', value:obls.filter(o=>o.estado==='INCUMPLIMIENTO').length, color:'#DC2626' },{ label:'Total', value:obls.length, color:GRC_COLOR }].map(k=>(
            <Grid key={k.label} size={{ xs:6, md:3 }}><Card sx={{ bgcolor:'#FFFFFF', border:`1px solid ${alpha(k.color,.3)}`, borderRadius:2 }}><CardContent sx={{ p:'14px !important' }}><Typography sx={{ fontSize:26, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</Typography><Typography sx={{ fontSize:11, color:LBL }}>{k.label}</Typography></CardContent></Card></Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ mb:2, borderBottom:'1px solid #E5E7EB', '& .MuiTab-root':{ color:'#64748B', fontSize:13 }, '& .Mui-selected':{ color:GRC_COLOR }, '& .MuiTabs-indicator':{ bgcolor:GRC_COLOR } }}>
          <Tab label="Todas" /><Tab label="Incumplimiento / Alertas" />
        </Tabs>

        <Box sx={{ display:'flex', gap:2 }}>
          <Box sx={{ flex:1, minWidth:0 }}>
            <Paper sx={{ bgcolor:'#FFFFFF', border:'1px solid #E5E7EB', borderRadius:2, overflowX:'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th':{ borderColor:'#E5E7EB', color:LBL, fontSize:11, fontWeight:700, textTransform:'uppercase' } }}>
                    <TableCell>Código</TableCell><TableCell>Obligación</TableCell><TableCell>Tipo</TableCell><TableCell>Área</TableCell><TableCell>Responsable</TableCell><TableCell>Vencimiento</TableCell><TableCell>Estado</TableCell><TableCell align="center">Arch.</TableCell><TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtradas.map(o=>(
                    <TableRow key={o.codigo} onClick={()=>setSel(o)} sx={{ cursor:'pointer', bgcolor:sel?.codigo===o.codigo?alpha(GRC_COLOR,.06):'transparent', '&:hover':{ bgcolor:alpha(GRC_COLOR,.04) }, '& td':{ borderColor:'#E5E7EB', color:'#334155', fontSize:12 } }}>
                      <TableCell sx={{ fontSize:10.5, color:LBL }}>{o.codigo}</TableCell>
                      <TableCell sx={{ maxWidth:200 }}><Typography sx={{ fontSize:12.5, color:'#1E293B', fontWeight:600, lineHeight:1.3 }}>{o.nombre}</Typography></TableCell>
                      <TableCell><Chip label={o.tipo.replace('_',' ')} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(TIPO_COLOR[o.tipo]||GRC_COLOR,.18), color:TIPO_COLOR[o.tipo]||GRC_COLOR }} /></TableCell>
                      <TableCell>{o.area}</TableCell>
                      <TableCell>{o.responsable}</TableCell>
                      <TableCell sx={{ whiteSpace:'nowrap', fontSize:11 }}>{o.vencimiento}</TableCell>
                      <TableCell><Chip label={o.estado} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(ESTADO_COLOR[o.estado]||'#6B7280',.18), color:ESTADO_COLOR[o.estado]||'#6B7280' }} /></TableCell>
                      <TableCell align="center"><Chip label={o.adjuntos.length} size="small" sx={{ bgcolor:'#F1F5F9', color:'#64748B', fontSize:10, minWidth:22 }} /></TableCell>
                      <TableCell>
                        <Box sx={{ display:'flex', gap:.25 }} onClick={e=>e.stopPropagation()}>
                          <IconButton size="small" title="Editar" onClick={e=>openEdit(o,e)} sx={{ color:GRC_COLOR, p:.5 }}><Edit sx={{ fontSize:14 }} /></IconButton>
                          <IconButton size="small" title="Eliminar" onClick={e=>requestDelete(o.codigo,o.nombre,e)} sx={{ color:'#DC2626', p:.5 }}><Delete sx={{ fontSize:14 }} /></IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>

          {sel && (
            <Box sx={{ width:370, flexShrink:0, bgcolor:'#FFFFFF', border:`1px solid #E5E7EB`, borderRadius:2, p:2.5, height:'fit-content' }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1 }}>
                <Typography sx={{ color:'#1E293B', fontWeight:700, fontSize:13, flex:1, pr:1, lineHeight:1.4 }}>{sel.nombre}</Typography>
                <IconButton size="small" onClick={()=>setSel(null)} sx={{ color:'#64748B' }}><Close fontSize="small" /></IconButton>
              </Box>
              <Box sx={{ display:'flex', gap:.75, mb:2, flexWrap:'wrap' }}>
                <Chip label={sel.tipo.replace('_',' ')} size="small" sx={{ bgcolor:alpha(TIPO_COLOR[sel.tipo]||GRC_COLOR,.18), color:TIPO_COLOR[sel.tipo]||GRC_COLOR, fontSize:10 }} />
                <Chip label={sel.estado} size="small" sx={{ bgcolor:alpha(ESTADO_COLOR[sel.estado],.18), color:ESTADO_COLOR[sel.estado], fontWeight:700, fontSize:10 }} />
              </Box>
              <Row2 label="Código" value={sel.codigo} />
              <Row2 label="País / Versión" value={`${sel.pais} · v${sel.version}`} />
              <Row2 label="Área" value={sel.area} />
              <Row2 label="Responsable" value={sel.responsable} />
              <Row2 label="Vencimiento" value={sel.vencimiento} color={sel.estado==='INCUMPLIMIENTO'?'#DC2626':undefined} />
              <Divider sx={{ borderColor:'#E5E7EB', my:1.5 }} />
              <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.75 }}>Descripción</Typography>
              <Typography sx={{ fontSize:12, color:'#334155', lineHeight:1.7, mb:2 }}>{sel.descripcion}</Typography>
              <Divider sx={{ borderColor:'#E5E7EB', my:1.5 }} />
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
                <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em' }}>Archivos adjuntos ({sel.adjuntos.length})</Typography>
                <Button size="small" startIcon={<UploadFile sx={{ fontSize:12 }} />} onClick={triggerUpload} sx={{ fontSize:10, color:GRC_COLOR, bgcolor:alpha(GRC_COLOR,.12), '&:hover':{ bgcolor:alpha(GRC_COLOR,.2) }, px:1, py:.25, borderRadius:1, minWidth:0 }}>Subir</Button>
              </Box>
              {sel.adjuntos.length===0 && <Typography sx={{ fontSize:11, color:'#94A3B8', fontStyle:'italic', mb:1 }}>Sin archivos adjuntos</Typography>}
              {sel.adjuntos.map((a,i)=>(
                <Box key={i} sx={{ display:'flex', alignItems:'center', gap:1, p:.75, mb:.5, bgcolor:'#F8FAFC', borderRadius:1 }}>
                  <AttachFile sx={{ fontSize:14, color:GRC_COLOR }} />
                  <Typography sx={{ fontSize:11, color:'#334155', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a}</Typography>
                  <IconButton size="small" onClick={()=>handleDownload(a)} sx={{ color:'#059669', p:.25 }}><FileDownload sx={{ fontSize:13 }} /></IconButton>
                  <IconButton size="small" onClick={()=>removeAdj(a)} sx={{ color:'#DC2626', p:.25 }}><Delete sx={{ fontSize:13 }} /></IconButton>
                </Box>
              ))}
              <Divider sx={{ borderColor:'#E5E7EB', my:1.5 }} />
              <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                <Button size="small" startIcon={<Edit />} variant="outlined" fullWidth onClick={()=>openEdit(sel)} sx={{ color:GRC_COLOR, borderColor:alpha(GRC_COLOR,.4) }}>Editar Obligación</Button>
                <Button size="small" startIcon={<History />} variant="outlined" fullWidth sx={{ color:'#0891B2', borderColor:alpha('#0891B2',.4) }}>Control de Versiones</Button>
                <Button size="small" startIcon={<Delete />} variant="outlined" fullWidth onClick={()=>requestDelete(sel.codigo,sel.nombre)} sx={{ color:'#DC2626', borderColor:alpha('#DC2626',.4) }}>Eliminar</Button>
              </Box>
            </Box>
          )}
        </Box>

        <Dialog open={dlgOpen} onClose={()=>setDlgOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight:700 }}>{editId ? 'Editar Obligación' : 'Nueva Obligación Normativa'}</DialogTitle>
          <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'16px !important' }}>
            <TextField label="Nombre de la Obligación" fullWidth size="small" value={form.nombre} onChange={sf('nombre')} />
            <FormControl size="small"><InputLabel>Tipo</InputLabel>
              <Select label="Tipo" value={form.tipo} onChange={e=>ss('tipo',e.target.value)}>
                {TIPOS.map(t=><MenuItem key={t} value={t}>{t.replace('_',' ')}</MenuItem>)}
              </Select></FormControl>
            <FormControl size="small"><InputLabel>País</InputLabel>
              <Select label="País" value={form.pais} onChange={e=>ss('pais',e.target.value)}>
                {PAISES.map(p=><MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select></FormControl>
            <FormControl size="small"><InputLabel>Área</InputLabel>
              <Select label="Área" value={form.area} onChange={e=>ss('area',e.target.value)}>
                {AREAS.map(a=><MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select></FormControl>
            <FormControl size="small"><InputLabel>Responsable</InputLabel>
              <Select label="Responsable" value={form.responsable} onChange={e=>ss('responsable',e.target.value)}>
                {RESPONSABLES.map(r=><MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select></FormControl>
            <TextField label="Descripción" multiline rows={3} fullWidth size="small" value={form.descripcion} onChange={sf('descripcion')} />
            <TextField label="Fecha de Vencimiento" type="date" fullWidth size="small" value={form.vencimiento} onChange={sf('vencimiento')} InputLabelProps={{ shrink:true }} />
            <FormControl size="small"><InputLabel>Estado</InputLabel>
              <Select label="Estado" value={form.estado} onChange={e=>ss('estado',e.target.value)}>
                {ESTADOS.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select></FormControl>
          </DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}>
            <Button onClick={()=>setDlgOpen(false)} sx={{ color:'#64748B' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleSave} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' } }}>{editId?'Guardar Cambios':'Crear'}</Button>
          </DialogActions>
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
            <Button variant="contained" disabled={delInput!=='ELIMINAR'} onClick={confirmDelete} sx={{ bgcolor:'#DC2626', '&:hover':{ bgcolor:'#B91C1C' }, '&.Mui-disabled':{ bgcolor:'rgba(220,38,38,0.15)', color:'rgba(220,38,38,0.4)' } }}>Eliminar</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={!!snack} autoHideDuration={3500} onClose={()=>setSnack('')} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
          <Alert severity={snackType} onClose={()=>setSnack('')} sx={{ bgcolor:snackType==='success'?'#1E3A2F':'#3A1F1F', color:'#FFF', '& .MuiAlert-icon':{ color:snackType==='success'?'#4ADE80':'#F87171' } }}>{snack}</Alert>
        </Snackbar>
      </Box>
    </Layout>
  )
}
