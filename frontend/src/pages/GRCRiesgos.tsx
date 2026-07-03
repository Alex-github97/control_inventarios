import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Divider, Select, MenuItem, FormControl, InputLabel,
  Snackbar, Alert,
} from '@mui/material'
import { BugReport, Add, Edit, Delete, Close, InfoOutlined } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const LBL       = alpha(GRC_COLOR, 0.85)
const NIVEL_COLOR: Record<string,string> = { CRITICO:'#DC2626', ALTO:'#EA580C', MEDIO:'#D97706', BAJO:'#059669', MUY_BAJO:'#6B7280' }
const TRATAMIENTOS = ['MITIGAR','TRANSFERIR','ACEPTAR','EVITAR']
const CATEGORIAS = ['Tecnológico','Operacional','Legal','Financiero','Comercial','SST','Ciberseguridad','Cadena de suministro','Laboral']
const LABELS_P = ['','Muy Baja','Baja','Media','Alta','Muy Alta']
const LABELS_I = ['','Insignif.','Menor','Moderado','Mayor','Catastrófico']

const calcNivel = (p:number,i:number) => { const n=p*i; if(n>=16) return 'CRITICO'; if(n>=9) return 'ALTO'; if(n>=4) return 'MEDIO'; if(n>=2) return 'BAJO'; return 'MUY_BAJO' }

const seed = [
  { id:'R-001', nombre:'Falla en sistema WMS', categoria:'Tecnológico', proceso:'Operaciones', probabilidad:3, impacto:5, responsable:'CTO', tratamiento:'MITIGAR', estado:'ABIERTO', descripcion:'Interrupción total o parcial del WMS que impide el control de inventario y despachos. Puede causar pérdidas de información y errores en picking.', controles:['Backup automático cada hora','Servidor de contingencia en caliente'] },
  { id:'R-002', nombre:'Incumplimiento SLA con cliente ancla', categoria:'Comercial', proceso:'Comercial', probabilidad:4, impacto:5, responsable:'CCO', tratamiento:'MITIGAR', estado:'EN_TRATAMIENTO', descripcion:'Falla en entrega dentro de tiempos acordados. Penalidades de hasta 5% del valor mensual del contrato.', controles:['Monitoreo OTIF en tiempo real','Plan de contingencia logística'] },
  { id:'R-003', nombre:'Fraude interno en bodega', categoria:'Operacional', proceso:'Bodega', probabilidad:2, impacto:4, responsable:'Dir. Seguridad', tratamiento:'MITIGAR', estado:'ABIERTO', descripcion:'Sustracción de mercancía por empleados propios o temporales durante operaciones de bodega.', controles:['CCTV 24/7','Doble firma en despachos > $5M','Auditoría sorpresiva mensual'] },
  { id:'R-004', nombre:'Ciber ataque – ransomware', categoria:'Ciberseguridad', proceso:'TI', probabilidad:3, impacto:5, responsable:'CISO', tratamiento:'MITIGAR', estado:'EN_TRATAMIENTO', descripcion:'Ataque de ransomware que cifra servidores de producción y bases de datos. Parálisis total de operaciones.', controles:['EDR en todos los endpoints','Backup offline diario','Segmentación de red OT/IT'] },
  { id:'R-005', nombre:'Accidente de tránsito con víctimas', categoria:'SST', proceso:'Transporte', probabilidad:2, impacto:5, responsable:'Dir. RRHH', tratamiento:'MITIGAR', estado:'ABIERTO', descripcion:'Accidente vial grave con lesionados o fallecidos involucrando vehículos propios.', controles:['GPS + telemetría','Programa anti-fatiga','Inspección preoperacional'] },
  { id:'R-006', nombre:'Fuga de datos personales – Ley 1581', categoria:'Legal', proceso:'TI / Legal', probabilidad:2, impacto:4, responsable:'CLO', tratamiento:'MITIGAR', estado:'ABIERTO', descripcion:'Exposición de datos personales por vulnerabilidad técnica o error humano. Multas SIC hasta 2000 SMMLV.', controles:['DLP en correo y endpoints','Clasificación de datos'] },
  { id:'R-007', nombre:'Huelga de personal operativo', categoria:'Laboral', proceso:'Operaciones', probabilidad:2, impacto:3, responsable:'Dir. RRHH', tratamiento:'ACEPTAR', estado:'MONITOREADO', descripcion:'Cese de actividades que paraliza operaciones. Afecta cumplimiento de pedidos.', controles:['Plan de relaciones laborales','Mesa de diálogo permanente'] },
]
type Riesgo = typeof seed[0]
type Form = { nombre:string; categoria:string; proceso:string; probabilidad:number; impacto:number; responsable:string; tratamiento:string; descripcion:string }
const EMPTY: Form = { nombre:'', categoria:'Tecnológico', proceso:'', probabilidad:3, impacto:3, responsable:'', tratamiento:'MITIGAR', descripcion:'' }

const TF = { '& .MuiOutlinedInput-root':{ color:'#FFF', '& fieldset':{ borderColor:'rgba(255,255,255,0.15)' }, '&.Mui-focused fieldset':{ borderColor:GRC_COLOR } } }
const ILB = { sx:{ color:'rgba(255,255,255,0.5)' } }
const Row2 = ({ label, value, color }:{ label:string; value:string; color?:string }) => (
  <Box sx={{ mb:1.25 }}><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.25 }}>{label}</Typography><Typography sx={{ fontSize:13, color:color||'#E2E8F0', fontWeight:500 }}>{value}</Typography></Box>
)

export default function GRCRiesgos() {
  const [riesgos, setRiesgos] = useState(seed)
  const [sel, setSel]         = useState<Riesgo|null>(null)
  const [tab, setTab]         = useState(0)
  const [dlgOpen, setDlgOpen] = useState(false)
  const [editId, setEditId]   = useState<string|null>(null)
  const [form, setForm]       = useState<Form>(EMPTY)
  const [snack, setSnack]     = useState('')

  const sf = (k:keyof Form)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(f=>({...f,[k]:e.target.value}))
  const ss = (k:keyof Form,v:string|number)=>setForm(f=>({...f,[k]:v}))
  const ok = (msg:string)=>setSnack(msg)

  const openNew = ()=>{ setForm(EMPTY); setEditId(null); setDlgOpen(true) }
  const openEdit = (r:Riesgo,e?:React.MouseEvent)=>{ e?.stopPropagation(); setForm({ nombre:r.nombre, categoria:r.categoria, proceso:r.proceso, probabilidad:r.probabilidad, impacto:r.impacto, responsable:r.responsable, tratamiento:r.tratamiento, descripcion:r.descripcion }); setEditId(r.id); setDlgOpen(true) }
  const handleSave = ()=>{
    if(editId){ setRiesgos(list=>list.map(r=>r.id===editId?{...r,...form}:r)); if(sel?.id===editId) setSel(s=>s?{...s,...form}:null); ok('Riesgo actualizado') }
    else { const n:Riesgo={...form,id:`R-${String(riesgos.length+1).padStart(3,'0')}`,estado:'ABIERTO',controles:[]}; setRiesgos(list=>[...list,n]); ok('Riesgo creado') }
    setDlgOpen(false)
  }
  const handleDelete=(id:string,e?:React.MouseEvent)=>{ e?.stopPropagation(); const nombre=riesgos.find(r=>r.id===id)?.nombre||''; setRiesgos(list=>list.filter(r=>r.id!==id)); if(sel?.id===id) setSel(null); ok(`"${nombre}" eliminado`) }

  return (
    <Layout>
      <Box sx={{ p:3, background:PAGE_BG, minHeight:'100vh' }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:3 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <BugReport sx={{ color:GRC_COLOR, fontSize:28 }} />
            <Box><Typography variant="h5" sx={{ fontWeight:800, color:'#FFF', lineHeight:1 }}>Inventario de Riesgos</Typography><Typography sx={{ fontSize:12, color:LBL }}>GRC · Identificación, evaluación y tratamiento</Typography></Box>
            <Chip label="GRC" size="small" sx={{ bgcolor:alpha(GRC_COLOR,.15), color:GRC_COLOR, fontWeight:700, border:`1px solid ${alpha(GRC_COLOR,.35)}` }} />
          </Box>
          <Button startIcon={<Add />} size="small" variant="contained" onClick={openNew} sx={{ bgcolor:GRC_COLOR, '&:hover':{ bgcolor:'#5B21B6' }, borderRadius:2 }}>Nuevo Riesgo</Button>
        </Box>

        <Grid container spacing={2} sx={{ mb:3 }}>
          {[{ label:'Crítico', value:riesgos.filter(r=>calcNivel(r.probabilidad,r.impacto)==='CRITICO').length, color:'#DC2626' },{ label:'Alto', value:riesgos.filter(r=>calcNivel(r.probabilidad,r.impacto)==='ALTO').length, color:'#EA580C' },{ label:'Medio', value:riesgos.filter(r=>calcNivel(r.probabilidad,r.impacto)==='MEDIO').length, color:'#D97706' },{ label:'Bajo / Muy Bajo', value:riesgos.filter(r=>['BAJO','MUY_BAJO'].includes(calcNivel(r.probabilidad,r.impacto))).length, color:'#059669' }].map(k=>(
            <Grid key={k.label} size={{ xs:6, md:3 }}><Card sx={{ bgcolor:'#FFFFFF', border:`1px solid ${alpha(k.color,.3)}`, borderRadius:2 }}><CardContent sx={{ p:'14px !important' }}><Typography sx={{ fontSize:26, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</Typography><Typography sx={{ fontSize:11, color:LBL }}>{k.label}</Typography></CardContent></Card></Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ mb:2, borderBottom:'1px solid rgba(255,255,255,0.08)', '& .MuiTab-root':{ color:'rgba(255,255,255,0.45)', fontSize:13 }, '& .Mui-selected':{ color:GRC_COLOR }, '& .MuiTabs-indicator':{ bgcolor:GRC_COLOR } }}>
          <Tab label="Inventario" /><Tab label="Mapa de Calor 5×5" />
        </Tabs>

        <Box sx={{ display:'flex', gap:2 }}>
          <Box sx={{ flex:1, minWidth:0 }}>
            {tab===0 && (
              <Paper sx={{ bgcolor:'transparent', overflowX:'auto' }}>
                <Table size="small">
                  <TableHead><TableRow sx={{ '& th':{ borderColor:'rgba(255,255,255,0.06)', color:LBL, fontSize:11, fontWeight:700, textTransform:'uppercase' } }}>
                    <TableCell>ID</TableCell><TableCell>Riesgo</TableCell><TableCell>Categoría</TableCell><TableCell align="center">P</TableCell><TableCell align="center">I</TableCell><TableCell>Nivel</TableCell><TableCell>Tratamiento</TableCell><TableCell>Responsable</TableCell><TableCell>Acciones</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {riesgos.map(r=>{ const nivel=calcNivel(r.probabilidad,r.impacto); return (
                      <TableRow key={r.id} onClick={()=>setSel(r)} sx={{ cursor:'pointer', bgcolor:sel?.id===r.id?alpha(GRC_COLOR,.06):'transparent', '&:hover':{ bgcolor:alpha(GRC_COLOR,.04) }, '& td':{ borderColor:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.8)', fontSize:12 } }}>
                        <TableCell sx={{ fontSize:10.5, color:LBL }}>{r.id}</TableCell>
                        <TableCell sx={{ maxWidth:200 }}><Typography sx={{ fontSize:12.5, color:'#FFF', fontWeight:600, lineHeight:1.3 }}>{r.nombre}</Typography></TableCell>
                        <TableCell><Chip label={r.categoria} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(GRC_COLOR,.12), color:GRC_COLOR }} /></TableCell>
                        <TableCell align="center"><Box sx={{ width:22, height:22, borderRadius:'50%', bgcolor:alpha(NIVEL_COLOR[nivel],.25), display:'flex', alignItems:'center', justifyContent:'center', mx:'auto' }}><Typography sx={{ fontSize:11, color:NIVEL_COLOR[nivel], fontWeight:700 }}>{r.probabilidad}</Typography></Box></TableCell>
                        <TableCell align="center"><Box sx={{ width:22, height:22, borderRadius:'50%', bgcolor:alpha(NIVEL_COLOR[nivel],.25), display:'flex', alignItems:'center', justifyContent:'center', mx:'auto' }}><Typography sx={{ fontSize:11, color:NIVEL_COLOR[nivel], fontWeight:700 }}>{r.impacto}</Typography></Box></TableCell>
                        <TableCell><Chip label={nivel} size="small" sx={{ fontSize:9, height:18, bgcolor:alpha(NIVEL_COLOR[nivel],.18), color:NIVEL_COLOR[nivel], fontWeight:700 }} /></TableCell>
                        <TableCell><Chip label={r.tratamiento} size="small" sx={{ fontSize:9, height:18, bgcolor:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.6)' }} /></TableCell>
                        <TableCell>{r.responsable}</TableCell>
                        <TableCell>
                          <Box sx={{ display:'flex', gap:.25 }} onClick={e=>e.stopPropagation()}>
                            <IconButton size="small" title="Editar" onClick={e=>openEdit(r,e)} sx={{ color:GRC_COLOR, p:.5 }}><Edit sx={{ fontSize:14 }} /></IconButton>
                            <IconButton size="small" title="Eliminar" onClick={e=>handleDelete(r.id,e)} sx={{ color:'#DC2626', p:.5 }}><Delete sx={{ fontSize:14 }} /></IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </Paper>
            )}

            {tab===1 && (
              <Box>
                <Box sx={{ overflowX:'auto', mb:3 }}>
                  <Box sx={{ display:'inline-flex', flexDirection:'column', gap:.5, minWidth:500 }}>
                    <Typography sx={{ fontSize:11, color:LBL, mb:1, textAlign:'center' }}>← PROBABILIDAD / IMPACTO →</Typography>
                    {[5,4,3,2,1].map(p=>(
                      <Box key={p} sx={{ display:'flex', alignItems:'center', gap:.5 }}>
                        <Typography sx={{ fontSize:9.5, color:LBL, width:60, textAlign:'right', pr:.5 }}>{LABELS_P[p]}</Typography>
                        {[1,2,3,4,5].map(i=>{ const nivel=calcNivel(p,i); const score=p*i; const aqui=riesgos.filter(r=>r.probabilidad===p&&r.impacto===i); const bg=NIVEL_COLOR[nivel]; return (
                          <Box key={i} onClick={()=>aqui.length>0&&setSel(aqui[0])} sx={{ width:72, height:56, borderRadius:1.5, bgcolor:alpha(bg,aqui.length>0?0.35:0.08), border:`1px solid ${alpha(bg,aqui.length>0?0.6:0.2)}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:.25, cursor:aqui.length>0?'pointer':'default', transition:'transform 0.15s', '&:hover':aqui.length>0?{ transform:'scale(1.05)' }:{} }}>
                            <Typography sx={{ fontSize:10, fontWeight:700, color:bg }}>{score}</Typography>
                            {aqui.length>0&&<Chip label={aqui.length} size="small" sx={{ height:14, fontSize:8, bgcolor:bg, color:'#FFF', fontWeight:700 }} />}
                          </Box>
                        )})}
                      </Box>
                    ))}
                    <Box sx={{ display:'flex', gap:.5, mt:.5, pl:'68px' }}>
                      {[1,2,3,4,5].map(i=><Typography key={i} sx={{ width:72, fontSize:9.5, color:LBL, textAlign:'center' }}>{LABELS_I[i]}</Typography>)}
                    </Box>
                  </Box>
                </Box>
                <Card sx={{ bgcolor:alpha(GRC_COLOR,.06), border:`1px solid ${alpha(GRC_COLOR,.2)}`, borderRadius:2 }}>
                  <CardContent sx={{ p:'14px !important' }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1.5 }}><InfoOutlined sx={{ color:GRC_COLOR, fontSize:18 }} /><Typography sx={{ fontWeight:700, color:'#FFF', fontSize:13 }}>Cómo leer el Mapa de Calor</Typography></Box>
                    <Typography sx={{ fontSize:12, color:'rgba(255,255,255,0.75)', lineHeight:1.8, mb:1.5 }}>La matriz 5×5 combina <strong style={{color:'#FFF'}}>Probabilidad (P)</strong> en el eje vertical e <strong style={{color:'#FFF'}}>Impacto (I)</strong> en el horizontal. Cada celda muestra el <em style={{color:GRC_COLOR}}>puntaje P×I</em>. Haz clic en una celda para ver el riesgo.</Typography>
                    <Grid container spacing={1}>
                      {[{ nivel:'CRITICO', rango:'16–25', accion:'Acción inmediata. Plan de tratamiento ≤ 30 días.', color:'#DC2626' },{ nivel:'ALTO', rango:'9–15', accion:'Tratamiento urgente. Plan ≤ 60 días.', color:'#EA580C' },{ nivel:'MEDIO', rango:'4–8', accion:'Seguimiento trimestral con indicadores.', color:'#D97706' },{ nivel:'BAJO', rango:'1–3', accion:'Aceptar o monitorear. Revisión semestral.', color:'#059669' }].map(l=>(
                        <Grid key={l.nivel} size={{ xs:12, md:6 }}><Box sx={{ p:1, bgcolor:alpha(l.color,.08), borderRadius:1, border:`1px solid ${alpha(l.color,.2)}` }}><Box sx={{ display:'flex', alignItems:'center', gap:.75, mb:.5 }}><Box sx={{ width:8, height:8, borderRadius:'50%', bgcolor:l.color }} /><Typography sx={{ fontSize:11, fontWeight:700, color:l.color }}>{l.nivel}</Typography><Typography sx={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>P×I: {l.rango}</Typography></Box><Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.65)', lineHeight:1.6 }}>{l.accion}</Typography></Box></Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>

          {sel && (
            <Box sx={{ width:370, flexShrink:0, bgcolor:'#FFFFFF', border:`1px solid #E5E7EB`, borderRadius:2, p:2.5, height:'fit-content' }}>
              <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:1 }}>
                <Typography sx={{ color:'#FFF', fontWeight:700, fontSize:13, flex:1, pr:1, lineHeight:1.4 }}>{sel.nombre}</Typography>
                <IconButton size="small" onClick={()=>setSel(null)} sx={{ color:'rgba(255,255,255,0.4)' }}><Close fontSize="small" /></IconButton>
              </Box>
              <Box sx={{ display:'flex', gap:.75, mb:2 }}>
                <Chip label={sel.categoria} size="small" sx={{ bgcolor:alpha(GRC_COLOR,.18), color:GRC_COLOR, fontSize:10 }} />
                <Chip label={calcNivel(sel.probabilidad,sel.impacto)} size="small" sx={{ bgcolor:alpha(NIVEL_COLOR[calcNivel(sel.probabilidad,sel.impacto)],.18), color:NIVEL_COLOR[calcNivel(sel.probabilidad,sel.impacto)], fontWeight:700, fontSize:10 }} />
              </Box>
              <Box sx={{ display:'flex', gap:2, mb:2 }}>
                {[{ l:'P', v:sel.probabilidad },{ l:'I', v:sel.impacto },{ l:'P×I', v:sel.probabilidad*sel.impacto }].map(x=>(
                  <Box key={x.l} sx={{ flex:1, p:1, bgcolor:'rgba(255,255,255,0.04)', borderRadius:1, textAlign:'center' }}>
                    <Typography sx={{ fontSize:22, fontWeight:800, color:NIVEL_COLOR[calcNivel(sel.probabilidad,sel.impacto)], lineHeight:1 }}>{x.v}</Typography>
                    <Typography sx={{ fontSize:9.5, color:LBL, textTransform:'uppercase', mt:.25 }}>{x.l}</Typography>
                  </Box>
                ))}
              </Box>
              <Row2 label="ID" value={sel.id} />
              <Row2 label="Proceso" value={sel.proceso} />
              <Row2 label="Responsable" value={sel.responsable} />
              <Row2 label="Tratamiento" value={sel.tratamiento} />
              <Row2 label="Estado" value={sel.estado.replace('_',' ')} />
              <Divider sx={{ borderColor:'rgba(255,255,255,0.06)', my:1.5 }} />
              <Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.75 }}>Descripción</Typography>
              <Typography sx={{ fontSize:12, color:'rgba(255,255,255,0.7)', lineHeight:1.7, mb:1.5 }}>{sel.descripcion}</Typography>
              {sel.controles.length>0&&<><Typography sx={{ fontSize:10, color:LBL, textTransform:'uppercase', letterSpacing:'0.06em', mb:.75 }}>Controles Existentes</Typography>{sel.controles.map((c,i)=><Box key={i} sx={{ display:'flex', gap:1, mb:.6, alignItems:'flex-start' }}><Box sx={{ width:5, height:5, borderRadius:'50%', bgcolor:GRC_COLOR, mt:.8, flexShrink:0 }} /><Typography sx={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>{c}</Typography></Box>)}</>}
              <Divider sx={{ borderColor:'rgba(255,255,255,0.06)', my:1.5 }} />
              <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                <Button size="small" startIcon={<Edit />} variant="outlined" fullWidth onClick={()=>openEdit(sel)} sx={{ color:GRC_COLOR, borderColor:alpha(GRC_COLOR,.4) }}>Editar Riesgo</Button>
                <Button size="small" startIcon={<Delete />} variant="outlined" fullWidth onClick={()=>handleDelete(sel.id)} sx={{ color:'#DC2626', borderColor:alpha('#DC2626',.4) }}>Eliminar</Button>
              </Box>
            </Box>
          )}
        </Box>

        <Dialog open={dlgOpen} onClose={()=>setDlgOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx:{ bgcolor:'#1F2937', color:'#FFF' } }}>
          <DialogTitle sx={{ fontWeight:700 }}>{editId?'Editar Riesgo':'Nuevo Riesgo'}</DialogTitle>
          <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:'16px !important' }}>
            <TextField label="Nombre del Riesgo" fullWidth size="small" value={form.nombre} onChange={sf('nombre')} InputLabelProps={ILB} sx={TF} />
            <FormControl size="small"><InputLabel sx={{ color:'rgba(255,255,255,0.5)' }}>Categoría</InputLabel><Select label="Categoría" value={form.categoria} onChange={e=>ss('categoria',e.target.value)} sx={{ color:'#FFF', '& fieldset':{ borderColor:'rgba(255,255,255,0.15)' } }}>{CATEGORIAS.map(c=><MenuItem key={c} value={c}>{c}</MenuItem>)}</Select></FormControl>
            <TextField label="Proceso" fullWidth size="small" value={form.proceso} onChange={sf('proceso')} InputLabelProps={ILB} sx={TF} />
            <Box sx={{ display:'flex', gap:2 }}>
              <FormControl size="small" fullWidth><InputLabel sx={{ color:'rgba(255,255,255,0.5)' }}>Probabilidad (1-5)</InputLabel><Select label="Probabilidad (1-5)" value={form.probabilidad} onChange={e=>ss('probabilidad',Number(e.target.value))} sx={{ color:'#FFF', '& fieldset':{ borderColor:'rgba(255,255,255,0.15)' } }}>{[1,2,3,4,5].map(n=><MenuItem key={n} value={n}>{n} — {LABELS_P[n]}</MenuItem>)}</Select></FormControl>
              <FormControl size="small" fullWidth><InputLabel sx={{ color:'rgba(255,255,255,0.5)' }}>Impacto (1-5)</InputLabel><Select label="Impacto (1-5)" value={form.impacto} onChange={e=>ss('impacto',Number(e.target.value))} sx={{ color:'#FFF', '& fieldset':{ borderColor:'rgba(255,255,255,0.15)' } }}>{[1,2,3,4,5].map(n=><MenuItem key={n} value={n}>{n} — {LABELS_I[n]}</MenuItem>)}</Select></FormControl>
            </Box>
            <TextField label="Responsable" fullWidth size="small" value={form.responsable} onChange={sf('responsable')} InputLabelProps={ILB} sx={TF} />
            <FormControl size="small"><InputLabel sx={{ color:'rgba(255,255,255,0.5)' }}>Tratamiento</InputLabel><Select label="Tratamiento" value={form.tratamiento} onChange={e=>ss('tratamiento',e.target.value)} sx={{ color:'#FFF', '& fieldset':{ borderColor:'rgba(255,255,255,0.15)' } }}>{TRATAMIENTOS.map(t=><MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl>
            <TextField label="Descripción" multiline rows={3} fullWidth size="small" value={form.descripcion} onChange={sf('descripcion')} InputLabelProps={ILB} sx={TF} />
          </DialogContent>
          <DialogActions sx={{ px:3, pb:2 }}>
            <Button onClick={()=>setDlgOpen(false)} sx={{ color:'rgba(255,255,255,0.5)' }}>Cancelar</Button>
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
