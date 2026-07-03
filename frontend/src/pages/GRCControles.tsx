import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  LinearProgress, IconButton, Divider, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert,
} from '@mui/material'
import { Shield, Add, Edit, Delete, Close, CheckCircle, Warning, Add as AddIcon } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const #E5E7EB  = '#E5E7EB'
const LBL       = alpha(GRC_COLOR, 0.85)
const TIPO_COLOR: Record<string,string> = { PREVENTIVO:'#059669', DETECTIVO:'#0891B2', CORRECTIVO:'#D97706', DIRECTIVO:GRC_COLOR }
const ESTADO_COLOR: Record<string,string> = { EFECTIVO:'#059669', PARCIAL:'#D97706', INEFECTIVO:'#DC2626', 'EN PRUEBA':'#0891B2' }
const TIPOS   = Object.keys(TIPO_COLOR)
const ESTADOS = Object.keys(ESTADO_COLOR)

const seed = [
  { id:'CTR-001', nombre:'Autenticación multifactor (MFA) en sistemas críticos', tipo:'PREVENTIVO', riesgo:'R-004', categoria:'Ciberseguridad', responsable:'CISO', frecuencia:'Continuo', efectividad:94, estado:'EFECTIVO', ultimaPrueba:'2026-05-15', descripcion:'MFA obligatorio para acceso a sistemas de producción, BD, VPN y paneles de administración. Usa TOTP y llaves FIDO2 para cuentas privilegiadas.', seguimientos:['2026-05-15: 100% cuentas admin con MFA activo','2026-04-01: Migración de SMS OTP a TOTP completada'] },
  { id:'CTR-002', nombre:'Control de inventario cíclico diario en bodegas', tipo:'DETECTIVO', riesgo:'R-003', categoria:'Operacional', responsable:'Dir. Operaciones', frecuencia:'Diario', efectividad:82, estado:'EFECTIVO', ultimaPrueba:'2026-06-01', descripcion:'Conteo físico rotativo de ubicaciones de alto valor cada día hábil. Cobertura mínima 20% de SKUs de mayor valorización diariamente.', seguimientos:['2026-06-01: Diferencial detectado en zona B-12, ajuste aplicado'] },
  { id:'CTR-003', nombre:'Plan de respaldo y recuperación (BCP/DRP)', tipo:'CORRECTIVO', riesgo:'R-001', categoria:'Tecnológico', responsable:'CTO', frecuencia:'Mensual', efectividad:75, estado:'PARCIAL', ultimaPrueba:'2026-04-20', descripcion:'Pruebas de recuperación para WMS, ERP y bases de datos. RTO objetivo: 4 horas. RPO objetivo: 1 hora. Actualmente RTO real es 6 horas.', seguimientos:['2026-04-20: RTO real: 6h (objetivo: 4h) — brecha identificada'] },
  { id:'CTR-004', nombre:'Verificación de seguridad en contratación de conductores', tipo:'PREVENTIVO', riesgo:'R-005', categoria:'SST / Seguridad', responsable:'Dir. RRHH', frecuencia:'Por evento', efectividad:97, estado:'EFECTIVO', ultimaPrueba:'2026-05-30', descripcion:'Verificación previa: antecedentes penales, SIMIT, psicotécnico, examen médico con optometría y referencias laborales.', seguimientos:['2026-05-30: 12 conductores vinculados con verificación completa'] },
  { id:'CTR-005', nombre:'Monitoreo de operaciones sospechosas SARLAFT', tipo:'DETECTIVO', riesgo:'R-006', categoria:'Financiero', responsable:'CLO', frecuencia:'Mensual', efectividad:68, estado:'PARCIAL', ultimaPrueba:'2026-05-31', descripcion:'Análisis mensual de transacciones para identificar patrones de LA/FT. Motor de reglas, listas restrictivas y reportes a UIAF.', seguimientos:['2026-05-31: Reporte UIAF mayo pendiente','2026-04-30: 3 alertas generadas, 1 escalada a compliance'] },
  { id:'CTR-006', nombre:'Gestión documental de políticas y procedimientos', tipo:'DIRECTIVO', riesgo:'R-001', categoria:'Governance', responsable:'Dir. Calidad', frecuencia:'Anual', efectividad:88, estado:'EFECTIVO', ultimaPrueba:'2026-03-01', descripcion:'Sistema de gestión documental con control de versiones, aprobaciones y distribución controlada. 127 documentos vigentes.', seguimientos:['2026-03-01: Revisión anual completada — 127 documentos vigentes'] },
]
type Control = typeof seed[0]
type Form = { nombre:string; tipo:string; categoria:string; riesgo:string; responsable:string; frecuencia:string; descripcion:string; ultimaPrueba:string; efectividad:number; estado:string }
const EMPTY: Form = { nombre:'', tipo:'PREVENTIVO', categoria:'', riesgo:'', responsable:'', frecuencia:'Mensual', descripcion:'', ultimaPrueba:'', efectividad:80, estado:'PARCIAL' }

const TF = { '& .MuiOutlinedInput-root':{ '& fieldset':{ borderColor:'rgba(0,0,0,0.15)' }, '&.Mui-focused fieldset':{ borderColor:GRC_COLOR } } }
const ILB = { sx:{ color:'text.secondary' } }
const Row2 = ({ label, value, color }:{ label:string; value:string; color?:string }) => (
  <Box sx={{ mb:1.25 }}><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.25 }}>{label}</Typography><Typography sx={{ fontSize:13, color:color||'text.primary', fontWeight:500 }}>{value}</Typography></Box>
)

export default function GRCControles() {
  const [controles, setControles] = useState(seed)
  const [sel, setSel]             = useState<Control|null>(null)
  const [tab, setTab]             = useState(0)
  const [dlgOpen, setDlgOpen]     = useState(false)
  const [editId, setEditId]       = useState<string|null>(null)
  const [form, setForm]           = useState<Form>(EMPTY)
  const [segDlg, setSegDlg]       = useState(false)
  const [nuevoSeg, setNuevoSeg]   = useState('')
  const [snack, setSnack]           = useState('')
  const [delConfirm, setDelConfirm] = useState<{id:string;name:string}|null>(null)
  const [delInput, setDelInput]     = useState('')

  const sf=(k:keyof Form)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(f=>({...f,[k]:e.target.value}))
  const ss=(k:keyof Form,v:string|number)=>setForm(f=>({...f,[k]:v}))
  const ok=(msg:string)=>setSnack(msg)

  const requestDelete=(id:string,name:string,e?:React.MouseEvent)=>{ e?.stopPropagation(); setDelConfirm({id,name}); setDelInput('') }
  const confirmDelete=()=>{ if(delInput!=='ELIMINAR'||!delConfirm) return; handleDelete(delConfirm.id); setDelConfirm(null); setDelInput('') }

  const openNew=()=>{ setForm(EMPTY); setEditId(null); setDlgOpen(true) }
  const openEdit=(c:Control,e?:React.MouseEvent)=>{ e?.stopPropagation(); setForm({ nombre:c.nombre, tipo:c.tipo, categoria:c.categoria, riesgo:c.riesgo, responsable:c.responsable, frecuencia:c.frecuencia, descripcion:c.descripcion, ultimaPrueba:c.ultimaPrueba, efectividad:c.efectividad, estado:c.estado }); setEditId(c.id); setDlgOpen(true) }
  const handleSave=()=>{
    if(editId){ setControles(list=>list.map(c=>c.id===editId?{...c,...form}:c)); if(sel?.id===editId) setSel(s=>s?{...s,...form}:null); ok('Control actualizado') }
    else { const n:Control={...form,id:`CTR-${String(controles.length+1).padStart(3,'0')}`,seguimientos:[]}; setControles(list=>[...list,n]); ok('Control creado') }
    setDlgOpen(false)
  }
  const handleDelete=(id:string,e?:React.MouseEvent)=>{ e?.stopPropagation(); const nombre=controles.find(c=>c.id===id)?.nombre||''; setControles(list=>list.filter(c=>c.id!==id)); if(sel?.id===id) setSel(null); ok(`"${nombre}" eliminado`) }
  const addSeguimiento=()=>{
    if(!nuevoSeg.trim()||!sel) return
    const fecha=new Date().toISOString().split('T')[0]; const entry=`${fecha}: ${nuevoSeg.trim()}`
    setControles(list=>list.map(c=>c.id===sel.id?{...c,seguimientos:[entry,...c.seguimientos]}:c))
    setSel(s=>s?{...s,seguimientos:[entry,...s.seguimientos]}:null)
    ok('Seguimiento registrado'); setNuevoSeg(''); setSegDlg(false)
  }

  return (
    <Layout>
      <Box sx={{ p:3, minHeight:'100vh' }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <Shield sx={{ color:GRC_COLOR, fontSize:28 }} />
            <Box><Typography variant="h5" sx={{ fontWeight:800, color:'text.primary', lineHeight:1 }}>Gestión de Controles</Typography><Typography sx={{ fontSize:12, color:LBL }}>GRC · Controles internos y pruebas de efectividad</Typography></Box>
            <Chip label="GRC" size="small" sx={{ bgcolor:alpha(GRC_COLOR,.15), color:GRC_COLOR, fontWeight:700, border:`1px solid ${alpha(GRC_COLOR,.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={openNew} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' }, borderRadius:2 }}>Nuevo Control</Button>
        </Box>

        <Grid container spacing={2} sx={{ mb:3 }}>
          {[{ label:'Efectivo', value:controles.filter(c=>c.estado==='EFECTIVO').length, color:'#059669' },{ label:'Parcial', value:controles.filter(c=>c.estado==='PARCIAL').length, color:'#D97706' },{ label:'Inefectivo', value:controles.filter(c=>c.estado==='INEFECTIVO').length, color:'#DC2626' },{ label:'Efectividad Prom.', value:`${Math.round(controles.reduce((a,c)=>a+c.efectividad,0)/controles.length)}%`, color:GRC_COLOR }].map(k=>(
            <Grid key={k.label} size={{ xs:6, md:3 }}><Card sx={{ bgcolor:'#fff', border:`1px solid ${alpha(k.color,.3)}`, borderRadius:2 }}><CardContent sx={{ p:'14px !important' }}><Typography sx={{ fontSize:26, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</Typography><Typography sx={{ fontSize:11, color:LBL }}>{k.label}</Typography></CardContent></Card></Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ mb:2, borderBottom:'1px solid #F1F5F9', '& .MuiTab-root':{ color:'text.disabled', fontSize:13 }, '& .Mui-selected':{ color:GRC_COLOR }, '& .MuiTabs-indicator':{ bgcolor:GRC_COLOR } }}>
          <Tab label="Inventario" /><Tab label="Por Categoría" />
        </Tabs>

        <Box sx={{ display:'flex', gap:2 }}>
          <Box sx={{ flex:1, minWidth:0 }}>
            {tab===0&&(
              <Paper sx={{ bgcolor:'transparent', overflowX:'auto' }}>
                <Table size="small">
                  <TableHead><TableRow sx={{ '& th':{ borderColor:'#F1F5F9', color:LBL, fontSize:11, fontWeight:700, textTransform:'uppercase' } }}>
                    <TableCell>ID</TableCell><TableCell>Control</TableCell><TableCell>Tipo</TableCell><TableCell>Categoría</TableCell><TableCell>Responsable</TableCell><TableCell>Efectividad</TableCell><TableCell>Estado</TableCell><TableCell>Ú. Prueba</TableCell><TableCell>Acciones</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {controles.map(c=>(
                      <TableRow key={c.id} onClick={()=>setSel(c)} sx={{ cursor:'pointer', bgcolor:sel?.id===c.id?alpha(GRC_COLOR,.06):'transparent', '&:hover':{ bgcolor:alpha(GRC_COLOR,.04) }, '& td':{ borderColor:'#F1F5F9', color:'text.secondary', fontSize:12 } }}>
                        <TableCell sx={{ fontSize:10.5, color:LBL }}>{c.id}</TableCell>
                        <TableCell sx={{ maxWidth:220 }}><Typography sx={{ fontSize:12.5, color:'text.primary', fontWeight:600, lineHeight:1.3 }}>{c.nombre}</Typography></TableCell>
                        <TableCell><Chip label={c.tipo} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(TIPO_COLOR[c.tipo]||GRC_COLOR,.18), color:TIPO_COLOR[c.tipo]||GRC_COLOR }} /></TableCell>
                        <TableCell><Chip label={c.categoria} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(GRC_COLOR,.1), color:GRC_COLOR }} /></TableCell>
                        <TableCell>{c.responsable}</TableCell>
                        <TableCell sx={{ minWidth:120 }}><Box sx={{ display:'flex', alignItems:'center', gap:1 }}><LinearProgress variant="determinate" value={c.efectividad} sx={{ flex:1, height:5, borderRadius:2.5, bgcolor:'#E2E8F0', '& .MuiLinearProgress-bar':{ bgcolor:ESTADO_COLOR[c.estado]||GRC_COLOR } }} /><Typography sx={{ fontSize:11, color:ESTADO_COLOR[c.estado], fontWeight:700, minWidth:30 }}>{c.efectividad}%</Typography></Box></TableCell>
                        <TableCell><Chip label={c.estado} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(ESTADO_COLOR[c.estado]||'#6B7280',.18), color:ESTADO_COLOR[c.estado]||'#6B7280' }} /></TableCell>
                        <TableCell sx={{ whiteSpace:'nowrap', fontSize:11 }}>{c.ultimaPrueba}</TableCell>
                        <TableCell>
                          <Box sx={{ display:'flex', gap:.25 }} onClick={e=>e.stopPropagation()}>
                            <IconButton size="small" title="Editar" onClick={e=>openEdit(c,e)} sx={{ color:GRC_COLOR, p:.5 }}><Edit sx={{ fontSize:14 }} /></IconButton>
                            <IconButton size="small" title="Eliminar" onClick={e=>requestDelete(c.id,c.nombre,e)} sx={{ color:'#DC2626', p:.5 }}><Delete sx={{ fontSize:14 }} /></IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
            {tab===1&&(
              <Grid container spacing={2}>
                {[...new Set(controles.map(c=>c.categoria))].map(cat=>{ const items=controles.filter(c=>c.categoria===cat); const avg=Math.round(items.reduce((a,c)=>a+c.efectividad,0)/items.length); const color=avg>=80?'#059669':avg>=60?'#D97706':'#DC2626'; return (
                  <Grid key={cat} size={{ xs:12, md:6 }}><Card sx={{ bgcolor:'#fff', border:`1px solid ${alpha(color,.3)}`, borderRadius:2 }}><CardContent sx={{ p:'14px !important' }}>
                    <Box sx={{ display:'flex', justifyContent:'space-between', mb:1 }}><Typography sx={{ fontWeight:700, color:'text.primary', fontSize:14 }}>{cat}</Typography><Typography sx={{ fontWeight:800, color, fontSize:20 }}>{avg}%</Typography></Box>
                    <LinearProgress variant="determinate" value={avg} sx={{ height:6, borderRadius:3, mb:1.5, bgcolor:'#E2E8F0', '& .MuiLinearProgress-bar':{ bgcolor:color } }} />
                    {items.map(c=><Box key={c.id} onClick={()=>{setSel(c);setTab(0)}} sx={{ display:'flex', justifyContent:'space-between', py:.6, cursor:'pointer', '&:hover':{ opacity:.8 } }}><Typography sx={{ fontSize:11, color:'text.secondary', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', pr:1 }}>{c.nombre}</Typography><Box sx={{ display:'flex', alignItems:'center', gap:.75 }}>{c.estado==='EFECTIVO'?<CheckCircle sx={{ fontSize:13, color:'#059669' }} />:<Warning sx={{ fontSize:13, color:'#D97706' }} />}<Typography sx={{ fontSize:11, color:ESTADO_COLOR[c.estado], fontWeight:600 }}>{c.efectividad}%</Typography></Box></Box>)}
                  </CardContent></Card></Grid>
                )})}
              </Grid>
            )}
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
              </Box>
              <Box sx={{ mb:2 }}><Box sx={{ display:'flex', justifyContent:'space-between', mb:.5 }}><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase' }}>Efectividad</Typography><Typography sx={{ fontSize:13, fontWeight:700, color:ESTADO_COLOR[sel.estado] }}>{sel.efectividad}%</Typography></Box><LinearProgress variant="determinate" value={sel.efectividad} sx={{ height:8, borderRadius:4, bgcolor:'#E2E8F0', '& .MuiLinearProgress-bar':{ bgcolor:ESTADO_COLOR[sel.estado] } }} /></Box>
              <Row2 label="ID" value={sel.id} />
              <Row2 label="Categoría" value={sel.categoria} />
              <Row2 label="Riesgo vinculado" value={sel.riesgo} />
              <Row2 label="Responsable" value={sel.responsable} />
              <Row2 label="Frecuencia" value={sel.frecuencia} />
              <Row2 label="Última prueba" value={sel.ultimaPrueba} />
              <Divider sx={{ borderColor:'#F1F5F9', my:1.5 }} />
              <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.75 }}>Descripción</Typography>
              <Typography sx={{ fontSize:12, color:'text.secondary', lineHeight:1.7, mb:2 }}>{sel.descripcion}</Typography>
              <Divider sx={{ borderColor:'#F1F5F9', my:1.5 }} />
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
                <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em' }}>Seguimientos ({sel.seguimientos.length})</Typography>
                <IconButton size="small" title="Agregar seguimiento" onClick={()=>setSegDlg(true)} sx={{ color:GRC_COLOR, p:.5 }}><AddIcon sx={{ fontSize:14 }} /></IconButton>
              </Box>
              {sel.seguimientos.map((s,i)=><Box key={i} sx={{ display:'flex', gap:1, mb:.75, alignItems:'flex-start', p:.75, bgcolor:'#F9FAFB', borderRadius:1 }}><Box sx={{ width:5, height:5, borderRadius:'50%', bgcolor:GRC_COLOR, mt:.75, flexShrink:0 }} /><Typography sx={{ fontSize:11, color:'text.secondary', lineHeight:1.5 }}>{s}</Typography></Box>)}
              <Divider sx={{ borderColor:'#F1F5F9', my:1.5 }} />
              <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                <Button size="small" startIcon={<Edit />} variant="outlined" fullWidth onClick={()=>openEdit(sel)} sx={{ color:GRC_COLOR, borderColor:alpha(GRC_COLOR,.4) }}>Editar Control</Button>
                <Button size="small" startIcon={<Delete />} variant="outlined" fullWidth onClick={()=>requestDelete(sel.id,sel.nombre)} sx={{ color:'#DC2626', borderColor:alpha('#DC2626',.4) }}>Eliminar</Button>
              </Box>
            </Box>
          )}
        </Box>

        {/* Dialog seguimiento */}
        <Dialog open={segDlg} onClose={()=>setSegDlg(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight:700, fontSize:15 }}>Agregar Seguimiento</DialogTitle>
          <DialogContent sx={{ pt:'12px !important' }}><TextField label="Descripción del seguimiento" multiline rows={3} fullWidth size="small" value={nuevoSeg} onChange={e=>setNuevoSeg(e.target.value)} InputLabelProps={ILB} sx={TF} /></DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}><Button onClick={()=>setSegDlg(false)} color="inherit">Cancelar</Button><Button variant="contained" onClick={addSeguimiento} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' } }}>Agregar</Button></DialogActions>
        </Dialog>

        {/* Dialog crear/editar */}
        <Dialog open={dlgOpen} onClose={()=>setDlgOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight:700 }}>{editId?'Editar Control':'Nuevo Control'}</DialogTitle>
          <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'16px !important' }}>
            <TextField label="Nombre del Control" fullWidth size="small" value={form.nombre} onChange={sf('nombre')} InputLabelProps={ILB} sx={TF} />
            <FormControl size="small"><InputLabel>Tipo</InputLabel><Select label="Tipo" value={form.tipo} onChange={e=>ss('tipo',e.target.value)}>{TIPOS.map(t=><MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl>
            <TextField label="Categoría" fullWidth size="small" value={form.categoria} onChange={sf('categoria')} InputLabelProps={ILB} sx={TF} />
            <TextField label="Riesgo Vinculado (ID)" fullWidth size="small" value={form.riesgo} onChange={sf('riesgo')} InputLabelProps={ILB} sx={TF} />
            <TextField label="Responsable" fullWidth size="small" value={form.responsable} onChange={sf('responsable')} InputLabelProps={ILB} sx={TF} />
            <Box sx={{ display:'flex', gap:2 }}>
              <TextField label="% Efectividad" type="number" fullWidth size="small" value={form.efectividad} onChange={e=>ss('efectividad',Number(e.target.value))} InputLabelProps={ILB} sx={TF} inputProps={{ min:0,max:100 }} />
              <FormControl size="small" fullWidth><InputLabel>Estado</InputLabel><Select label="Estado" value={form.estado} onChange={e=>ss('estado',e.target.value)}>{ESTADOS.map(s=><MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
            </Box>
            <TextField label="Descripción" multiline rows={3} fullWidth size="small" value={form.descripcion} onChange={sf('descripcion')} InputLabelProps={ILB} sx={TF} />
            <TextField label="Fecha Última Prueba" type="date" fullWidth size="small" value={form.ultimaPrueba} onChange={sf('ultimaPrueba')} InputLabelProps={{ shrink:true }} sx={TF} />
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
