import React, { useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Divider, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Security, Add, Edit, Delete, Close, Add as AddIcon, CheckCircle } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const LBL       = alpha(GRC_COLOR, 0.85)
const ESTADO_COLOR: Record<string,string> = { ABIERTO:'#DC2626', 'EN INVESTIGACIÓN':'#D97706', CONTENIDO:'#0891B2', CERRADO:'#059669' }
const SEVERIDAD_COLOR: Record<string,string> = { CRITICO:'#DC2626', ALTO:'#EA580C', MEDIO:'#D97706', BAJO:'#059669' }
const TIPO_COLOR: Record<string,string> = { CIBERSEGURIDAD:'#DC2626', OPERACIONAL:'#D97706', FRAUDE:'#EA580C', AMBIENTAL:'#059669', SST:GRC_COLOR, REGULATORIO:'#0891B2' }
const ESTADOS    = Object.keys(ESTADO_COLOR)
const SEVERIDADES = Object.keys(SEVERIDAD_COLOR)
const TIPOS      = Object.keys(TIPO_COLOR)

const seed = [
  { id:'INC-001', titulo:'Intento de phishing dirigido — Gerencia Financiera', tipo:'CIBERSEGURIDAD', area:'TI / Financiero', responsable:'CISO', severidad:'ALTO', estado:'CERRADO', fechaDeteccion:'2026-05-22', fechaCierre:'2026-05-24', descripcion:'Campaña de spear phishing dirigida al director financiero simulando correo del banco. El correo fue bloqueado por el filtro antispam y reportado por el usuario. Sin compromiso de credenciales.', acciones:['2026-05-22: Correo bloqueado y analizado por CISO','2026-05-23: Alerta enviada a toda la organización','2026-05-24: Filtros actualizados — incidente cerrado'] },
  { id:'INC-002', titulo:'Accidente leve — conductor en ruta Bogotá-Cali', tipo:'SST', area:'Operaciones / SST', responsable:'Dir. SST', severidad:'MEDIO', estado:'CERRADO', fechaDeteccion:'2026-05-10', fechaCierre:'2026-05-18', descripcion:'Colisión de baja intensidad en la vía Panamericana km 247. Conductor con golpe leve en hombro. Vehículo con daños menores en parachoque frontal. Sin carga afectada.', acciones:['2026-05-10: Atención médica inmediata — ARL notificada','2026-05-11: FURAT radicado ante ARL','2026-05-15: Investigación de accidente completada','2026-05-18: Recomendaciones implementadas — cerrado'] },
  { id:'INC-003', titulo:'Diferencial de inventario — bodega Medellín zona C', tipo:'OPERACIONAL', area:'Operaciones / Inventarios', responsable:'Dir. Operaciones', severidad:'MEDIO', estado:'EN INVESTIGACIÓN', fechaDeteccion:'2026-06-05', fechaCierre:'', descripcion:'Conteo cíclico detectó faltante de 48 unidades de producto SKU-7820 (valor estimado: $4.2M COP) en zona C de bodega Medellín. Causa en investigación — posibles errores de digitación vs merma real.', acciones:['2026-06-05: Diferencial detectado en conteo cíclico','2026-06-06: Conteo físico completo iniciado por supervisores','2026-06-07: Revisión de cámaras de seguridad en curso'] },
  { id:'INC-004', titulo:'Incumplimiento SLA cliente — retraso entrega 3 días', tipo:'OPERACIONAL', area:'Servicio al Cliente', responsable:'Dir. Comercial', severidad:'ALTO', estado:'CERRADO', fechaDeteccion:'2026-05-30', fechaCierre:'2026-06-03', descripcion:'Entrega de 12 pallets para cliente Grupo Éxito retrasada 3 días por falla en sistema de despachos durante migración de WMS v2.3 → v2.4. Penalidad contractual aplicada: $8.5M COP.', acciones:['2026-05-30: Notificación al cliente y trazabilidad activada','2026-06-01: Entrega completada con transporte alterno','2026-06-03: Reunión de post-mortem con cliente — acuerdo de compensación'] },
  { id:'INC-005', titulo:'Fuga potencial de datos — proveedor cloud', tipo:'CIBERSEGURIDAD', area:'TI / Compliance', responsable:'CISO', severidad:'CRITICO', estado:'EN INVESTIGACIÓN', fechaDeteccion:'2026-06-10', fechaCierre:'', descripcion:'Alerta de AWS GuardDuty sobre acceso inusual a bucket S3 desde IP no reconocida. Posible exfiltración de archivos de logs. Investigación forense en curso. Sin confirmación de datos personales comprometidos.', acciones:['2026-06-10: Alerta GuardDuty recibida y escalada a CISO','2026-06-11: Bucket S3 aislado — acceso bloqueado','2026-06-12: Empresa forense contratada — análisis en curso'] },
  { id:'INC-006', titulo:'Derrame de combustible — patio Bogotá', tipo:'AMBIENTAL', area:'Operaciones / HSE', responsable:'Dir. HSE', severidad:'MEDIO', estado:'CONTENIDO', fechaDeteccion:'2026-06-08', fechaCierre:'', descripcion:'Derrame de 35 litros de ACPM en patio norte durante mantenimiento vehicular. El derrame fue contenido con barreras absorbentes. Sin afectación a cuerpos de agua. Reporte a autoridad ambiental en curso.', acciones:['2026-06-08: Derrame contenido con absorbentes','2026-06-09: Suelo afectado removido y dispuesto correctamente','2026-06-10: Reporte PQRS enviado a Secretaría de Ambiente'] },
]
type Incidente = typeof seed[0]
type Form = { titulo:string; tipo:string; area:string; responsable:string; severidad:string; estado:string; fechaDeteccion:string; fechaCierre:string; descripcion:string }
const EMPTY: Form = { titulo:'', tipo:'OPERACIONAL', area:'', responsable:'', severidad:'MEDIO', estado:'ABIERTO', fechaDeteccion:'', fechaCierre:'', descripcion:'' }

const Row2 = ({ label, value, color }:{ label:string; value:string; color?:string }) => (
  <Box sx={{ mb:1.25 }}><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.25 }}>{label}</Typography><Typography sx={{ fontSize:13, color:color||'#1E293B', fontWeight:500 }}>{value}</Typography></Box>
)

export default function GRCIncidentes() {
  const [incidentes, setIncidentes] = useState(seed)
  const [sel, setSel]               = useState<Incidente|null>(null)
  const [tab, setTab]               = useState(0)
  const [dlgOpen, setDlgOpen]       = useState(false)
  const [editId, setEditId]         = useState<string|null>(null)
  const [form, setForm]             = useState<Form>(EMPTY)
  const [accionDlg, setAccionDlg]   = useState(false)
  const [nuevaAccion, setNuevaAccion] = useState('')
  const [snack, setSnack]           = useState('')
  const [delConfirm, setDelConfirm] = useState<{id:string;name:string}|null>(null)
  const [delInput, setDelInput]     = useState('')

  const sf=(k:keyof Form)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(f=>({...f,[k]:e.target.value}))
  const ss=(k:keyof Form,v:string)=>setForm(f=>({...f,[k]:v}))
  const ok=(msg:string)=>setSnack(msg)

  const requestDelete=(id:string,name:string,e?:React.MouseEvent)=>{ e?.stopPropagation(); setDelConfirm({id,name}); setDelInput('') }
  const confirmDelete=()=>{ if(delInput!=='ELIMINAR'||!delConfirm) return; handleDelete(delConfirm.id); setDelConfirm(null); setDelInput('') }

  const openNew=()=>{ setForm(EMPTY); setEditId(null); setDlgOpen(true) }
  const openEdit=(i:Incidente,e?:React.MouseEvent)=>{ e?.stopPropagation(); setForm({ titulo:i.titulo, tipo:i.tipo, area:i.area, responsable:i.responsable, severidad:i.severidad, estado:i.estado, fechaDeteccion:i.fechaDeteccion, fechaCierre:i.fechaCierre, descripcion:i.descripcion }); setEditId(i.id); setDlgOpen(true) }
  const handleSave=()=>{
    if(editId){ setIncidentes(list=>list.map(i=>i.id===editId?{...i,...form}:i)); if(sel?.id===editId) setSel(s=>s?{...s,...form}:null); ok('Incidente actualizado') }
    else { const n:Incidente={...form,id:`INC-${String(incidentes.length+1).padStart(3,'0')}`,acciones:[]}; setIncidentes(list=>[...list,n]); ok('Incidente registrado') }
    setDlgOpen(false)
  }
  const handleDelete=(id:string,e?:React.MouseEvent)=>{ e?.stopPropagation(); const titulo=incidentes.find(i=>i.id===id)?.titulo||''; setIncidentes(list=>list.filter(i=>i.id!==id)); if(sel?.id===id) setSel(null); ok(`"${titulo}" eliminado`) }
  const addAccion=()=>{
    if(!nuevaAccion.trim()||!sel) return
    const fecha=new Date().toISOString().split('T')[0]; const entry=`${fecha}: ${nuevaAccion.trim()}`
    setIncidentes(list=>list.map(i=>i.id===sel.id?{...i,acciones:[...i.acciones,entry]}:i))
    setSel(s=>s?{...s,acciones:[...s.acciones,entry]}:null)
    ok('Acción registrada'); setNuevaAccion(''); setAccionDlg(false)
  }
  const cerrarIncidente=(id:string)=>{
    const fecha=new Date().toISOString().split('T')[0]
    setIncidentes(list=>list.map(i=>i.id===id?{...i,estado:'CERRADO',fechaCierre:fecha}:i))
    if(sel?.id===id) setSel(s=>s?{...s,estado:'CERRADO',fechaCierre:fecha}:null)
    ok('Incidente marcado como CERRADO')
  }

  const filtered = tab===0 ? incidentes : tab===1 ? incidentes.filter(i=>i.estado!=='CERRADO') : incidentes.filter(i=>i.estado==='CERRADO')

  return (
    <Layout>
      <Box sx={{ p:3, background:'#F0F2F5', minHeight:'100vh' }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <Security sx={{ color:GRC_COLOR, fontSize:28 }} />
            <Box><Typography variant="h5" sx={{ fontWeight:800, color:'#1E293B', lineHeight:1 }}>Gestión de Incidentes</Typography><Typography sx={{ fontSize:12, color:LBL }}>GRC · Registro, investigación y cierre de incidentes</Typography></Box>
            <Chip label="GRC" size="small" sx={{ bgcolor:alpha(GRC_COLOR,.15), color:GRC_COLOR, fontWeight:700, border:`1px solid ${alpha(GRC_COLOR,.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={openNew} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' }, borderRadius:2 }}>Nuevo Incidente</Button>
        </Box>

        <Grid container spacing={2} sx={{ mb:3 }}>
          {ESTADOS.map(est=>{ const color=ESTADO_COLOR[est]; return (
            <Grid key={est} size={{ xs:6, md:3 }}><Card sx={{ bgcolor:'#FFFFFF', border:`1px solid ${alpha(color,.3)}`, borderRadius:2 }}><CardContent sx={{ p:'14px !important' }}><Typography sx={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{incidentes.filter(i=>i.estado===est).length}</Typography><Typography sx={{ fontSize:11, color:LBL }}>{est}</Typography></CardContent></Card></Grid>
          )})}
        </Grid>

        <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ mb:2, borderBottom:'1px solid #E5E7EB', '& .MuiTab-root':{ color:'#64748B', fontSize:12 }, '& .Mui-selected':{ color:GRC_COLOR }, '& .MuiTabs-indicator':{ bgcolor:GRC_COLOR } }}>
          <Tab label="Todos" /><Tab label="Activos" /><Tab label="Cerrados" />
        </Tabs>

        <Box sx={{ display:'flex', gap:2 }}>
          <Box sx={{ flex:1, minWidth:0 }}>
            <Paper sx={{ bgcolor:'transparent', overflowX:'auto' }}>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th':{ borderColor:'#E5E7EB', color:LBL, fontSize:11, fontWeight:700, textTransform:'uppercase' } }}>
                  <TableCell>ID</TableCell><TableCell>Incidente</TableCell><TableCell>Tipo</TableCell><TableCell>Área</TableCell><TableCell>Severidad</TableCell><TableCell>Estado</TableCell><TableCell>Detectado</TableCell><TableCell>Cierre</TableCell><TableCell>Acciones</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {filtered.map(i=>(
                    <TableRow key={i.id} onClick={()=>setSel(i)} sx={{ cursor:'pointer', bgcolor:sel?.id===i.id?alpha(GRC_COLOR,.06):'transparent', '&:hover':{ bgcolor:alpha(GRC_COLOR,.04) }, '& td':{ borderColor:'#E5E7EB', color:'#334155', fontSize:12 } }}>
                      <TableCell sx={{ fontSize:10.5, color:LBL }}>{i.id}</TableCell>
                      <TableCell sx={{ maxWidth:220 }}><Typography sx={{ fontSize:12.5, color:'#1E293B', fontWeight:600, lineHeight:1.3 }}>{i.titulo}</Typography></TableCell>
                      <TableCell><Chip label={i.tipo} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(TIPO_COLOR[i.tipo]||GRC_COLOR,.18), color:TIPO_COLOR[i.tipo]||GRC_COLOR }} /></TableCell>
                      <TableCell sx={{ fontSize:11 }}>{i.area}</TableCell>
                      <TableCell><Chip label={i.severidad} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(SEVERIDAD_COLOR[i.severidad],.18), color:SEVERIDAD_COLOR[i.severidad] }} /></TableCell>
                      <TableCell><Chip label={i.estado} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(ESTADO_COLOR[i.estado],.18), color:ESTADO_COLOR[i.estado] }} /></TableCell>
                      <TableCell sx={{ fontSize:11 }}>{i.fechaDeteccion}</TableCell>
                      <TableCell sx={{ fontSize:11, color:'#64748B' }}>{i.fechaCierre||'—'}</TableCell>
                      <TableCell>
                        <Box sx={{ display:'flex', gap:.25 }} onClick={e=>e.stopPropagation()}>
                          <IconButton size="small" title="Editar" onClick={e=>openEdit(i,e)} sx={{ color:GRC_COLOR, p:.5 }}><Edit sx={{ fontSize:14 }} /></IconButton>
                          <IconButton size="small" title="Eliminar" onClick={e=>requestDelete(i.id,i.titulo,e)} sx={{ color:'#DC2626', p:.5 }}><Delete sx={{ fontSize:14 }} /></IconButton>
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
                <Chip label={sel.tipo} size="small" sx={{ bgcolor:alpha(TIPO_COLOR[sel.tipo]||GRC_COLOR,.18), color:TIPO_COLOR[sel.tipo]||GRC_COLOR, fontSize:10 }} />
                <Chip label={sel.severidad} size="small" sx={{ bgcolor:alpha(SEVERIDAD_COLOR[sel.severidad],.18), color:SEVERIDAD_COLOR[sel.severidad], fontWeight:700, fontSize:10 }} />
                <Chip label={sel.estado} size="small" sx={{ bgcolor:alpha(ESTADO_COLOR[sel.estado],.18), color:ESTADO_COLOR[sel.estado], fontWeight:700, fontSize:10 }} />
              </Box>
              <Row2 label="Área" value={sel.area} />
              <Row2 label="Responsable" value={sel.responsable} />
              <Row2 label="Detectado" value={sel.fechaDeteccion} />
              {sel.fechaCierre&&<Row2 label="Cerrado" value={sel.fechaCierre} color="#059669" />}
              <Divider sx={{ borderColor:'#E5E7EB', my:1.5 }} />
              <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.75 }}>Descripción</Typography>
              <Typography sx={{ fontSize:12, color:'#334155', lineHeight:1.7, mb:2 }}>{sel.descripcion}</Typography>
              <Divider sx={{ borderColor:'#E5E7EB', my:1.5 }} />
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
                <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em' }}>Acciones ({sel.acciones.length})</Typography>
                <IconButton size="small" title="Agregar acción" onClick={()=>setAccionDlg(true)} sx={{ color:GRC_COLOR, p:.5 }}><AddIcon sx={{ fontSize:14 }} /></IconButton>
              </Box>
              {sel.acciones.map((a,i)=><Box key={i} sx={{ display:'flex', gap:1, mb:.75, alignItems:'flex-start', p:.75, bgcolor:'#F8FAFC', borderRadius:1 }}><Box sx={{ width:5, height:5, borderRadius:'50%', bgcolor:GRC_COLOR, mt:.75, flexShrink:0 }} /><Typography sx={{ fontSize:11, color:'#334155', lineHeight:1.5 }}>{a}</Typography></Box>)}
              <Divider sx={{ borderColor:'#E5E7EB', my:1.5 }} />
              <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                {sel.estado!=='CERRADO'&&<Button size="small" startIcon={<CheckCircle />} variant="contained" fullWidth onClick={()=>cerrarIncidente(sel.id)} sx={{ bgcolor:'#059669', '&:hover':{ bgcolor:'#047857' } }}>Marcar como Cerrado</Button>}
                <Button size="small" startIcon={<Edit />} variant="outlined" fullWidth onClick={()=>openEdit(sel)} sx={{ color:GRC_COLOR, borderColor:alpha(GRC_COLOR,.4) }}>Editar Incidente</Button>
                <Button size="small" startIcon={<Delete />} variant="outlined" fullWidth onClick={()=>requestDelete(sel.id,sel.titulo)} sx={{ color:'#DC2626', borderColor:alpha('#DC2626',.4) }}>Eliminar</Button>
              </Box>
            </Box>
          )}
        </Box>

        {/* Dialog acción */}
        <Dialog open={accionDlg} onClose={()=>setAccionDlg(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight:700, fontSize:15 }}>Registrar Acción</DialogTitle>
          <DialogContent sx={{ pt:'12px !important' }}><TextField label="Descripción de la acción tomada" multiline rows={3} fullWidth size="small" value={nuevaAccion} onChange={e=>setNuevaAccion(e.target.value)} /></DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}><Button onClick={()=>setAccionDlg(false)} sx={{ color:'#64748B' }}>Cancelar</Button><Button variant="contained" onClick={addAccion} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' } }}>Registrar</Button></DialogActions>
        </Dialog>

        {/* Dialog crear/editar */}
        <Dialog open={dlgOpen} onClose={()=>setDlgOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight:700 }}>{editId?'Editar Incidente':'Nuevo Incidente'}</DialogTitle>
          <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'16px !important' }}>
            <TextField label="Título del Incidente" fullWidth size="small" value={form.titulo} onChange={sf('titulo')} />
            <Box sx={{ display:'flex', gap:2 }}>
              <FormControl size="small" fullWidth><InputLabel>Tipo</InputLabel><Select label="Tipo" value={form.tipo} onChange={e=>ss('tipo',e.target.value)}>{TIPOS.map(t=><MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl>
              <FormControl size="small" fullWidth><InputLabel>Severidad</InputLabel><Select label="Severidad" value={form.severidad} onChange={e=>ss('severidad',e.target.value)}>{SEVERIDADES.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
            </Box>
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="Área" fullWidth size="small" value={form.area} onChange={sf('area')} />
              <TextField label="Responsable" fullWidth size="small" value={form.responsable} onChange={sf('responsable')} />
            </Box>
            <FormControl size="small" fullWidth><InputLabel>Estado</InputLabel><Select label="Estado" value={form.estado} onChange={e=>ss('estado',e.target.value)}>{ESTADOS.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="Fecha Detección" type="date" fullWidth size="small" value={form.fechaDeteccion} onChange={sf('fechaDeteccion')} InputLabelProps={{ shrink:true }} />
              <TextField label="Fecha Cierre" type="date" fullWidth size="small" value={form.fechaCierre} onChange={sf('fechaCierre')} InputLabelProps={{ shrink:true }} />
            </Box>
            <TextField label="Descripción" multiline rows={3} fullWidth size="small" value={form.descripcion} onChange={sf('descripcion')} />
          </DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}><Button onClick={()=>setDlgOpen(false)} sx={{ color:'#64748B' }}>Cancelar</Button><Button variant="contained" onClick={handleSave} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' } }}>{editId?'Guardar Cambios':'Registrar'}</Button></DialogActions>
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
