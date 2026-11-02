/**
 * Planta de reencauche · Garantías y posventa
 *
 * Un reclamo se registra sobre una llanta entregada (por su código), con la
 * falla, el kilometraje, las condiciones y fotos, y sigue recibido → en
 * análisis → dictaminado (procede, no procede, procede parcial) → cerrado. El
 * dictamen lo firma un técnico, y queda en la hoja de vida junto al ciclo y los
 * lotes de insumo que usó la llanta: así calidad sabe qué revisar.
 */
import { useState } from 'react'
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { GppMaybe } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { rtm, pesos, num } from '@/api/reencauche'
import { Encabezado, TablaRegistros, Etiqueta, errorApi, fmtFecha } from '@/components/comun/Registro'
import { COLOR, Paginacion, DialogoHojaDeVida } from '@/components/reencauche/comun'

const FALLAS: Record<string, string> = { DESPRENDIMIENTO: 'Desprendimiento de banda', SEPARACION: 'Separación', DESGASTE_IRREGULAR: 'Desgaste irregular',
  FALLA_PREMATURA: 'Falla prematura', DANO_CARCASA: 'Daño de carcasa' }
const ESTADO: Record<string, string> = { RECIBIDO: '#64748B', EN_ANALISIS: '#0369A1', DICTAMINADO: '#B45309', CERRADO: '#15803D' }
const SIGUIENTE: Record<string, string> = { RECIBIDO: 'EN_ANALISIS', EN_ANALISIS: 'DICTAMINADO', DICTAMINADO: 'CERRADO' }
const hoy = () => new Date().toLocaleDateString('en-CA')

export default function RTMGarantias() {
  const qc = useQueryClient()
  const roles = useQuery({ queryKey: ['rtm', 'roles', 'yo'], queryFn: rtm.misRoles })
  const [estado, setEstado] = useState('')
  const [pag, setPag] = useState(0)
  const [por, setPor] = useState(25)
  const lista = useQuery({ queryKey: ['rtm', 'reclamos', estado, pag, por], queryFn: () => rtm.reclamos({ estado: estado || undefined, limite: por, desplazamiento: pag * por }) })
  const [nuevo, setNuevo] = useState(false)
  const [f, setF] = useState<any>({ codigo: '', falla: 'DESPRENDIMIENTO', km: '', condiciones: '', fecha: hoy() })
  const [fotos, setFotos] = useState<File[]>([])
  const [avance, setAvance] = useState<any>(null)
  const [d, setD] = useState<any>({ dictamen: 'PROCEDE', causa: '', compensacion: '', compensacion_valor: '' })
  const [hoja, setHoja] = useState<string | null>(null)
  const refrescar = () => qc.invalidateQueries({ queryKey: ['rtm', 'reclamos'] })
  const crear = async () => {
    try {
      const r = await rtm.crearReclamo({ ...f, codigo: f.codigo.trim().toUpperCase(), km: f.km === '' ? null : Number(f.km) })
      for (const foto of fotos) await rtm.subirFotoReclamo(r.id, foto)
      toast.success(`Reclamo ${r.codigo} registrado`); setNuevo(false); setFotos([]); refrescar()
    } catch (e) { toast.error(errorApi(e)) }
  }
  const avanzar = async (r: any, cuerpo: any = {}) => {
    try { await rtm.avanzarReclamo(r.id, { estado: SIGUIENTE[r.estado], ...cuerpo }); toast.success('Reclamo actualizado'); setAvance(null); refrescar() }
    catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<GppMaybe sx={{ fontSize: 28 }} />} titulo="Garantías y posventa"
          subtitulo="Reclamos sobre llantas entregadas, con dictamen técnico, causa y compensación" color={COLOR}
          accion="Nuevo reclamo" onAccion={() => setNuevo(true)} />
        <TextField select size="small" label="Estado" value={estado} onChange={e => { setEstado(e.target.value); setPag(0) }} sx={{ minWidth: 160, mb: 1.5 }}>
          <MenuItem value="">Todos</MenuItem>{Object.keys(ESTADO).map(k => <MenuItem key={k} value={k}>{k.toLowerCase().replace('_', ' ')}</MenuItem>)}
        </TextField>
        <TablaRegistros filas={lista.data?.filas ?? []} cargando={lista.isLoading} vacio="Sin reclamos" etiqueta={(r: any) => r.codigo}
          onFila={(r: any) => setHoja(r.llanta)}
          extra={(r: any) => SIGUIENTE[r.estado] && <Button size="small" variant="outlined"
            disabled={SIGUIENTE[r.estado] === 'DICTAMINADO' && !roles.data?.TECNICO}
            onClick={() => SIGUIENTE[r.estado] === 'DICTAMINADO' ? (setAvance(r), setD({ dictamen: 'PROCEDE', causa: '', compensacion: '', compensacion_valor: '' })) : avanzar(r)}>
            {SIGUIENTE[r.estado] === 'EN_ANALISIS' ? 'Analizar' : SIGUIENTE[r.estado] === 'DICTAMINADO' ? 'Dictaminar' : 'Cerrar'}</Button>}
          columnas={[
            { titulo: 'Reclamo', valor: (r: any) => <b>{r.codigo}</b> },
            { titulo: 'Llanta', valor: (r: any) => <span style={{ fontFamily: 'monospace' }}>{r.llanta}</span> },
            { titulo: 'Cliente', valor: (r: any) => r.cliente }, { titulo: 'Falla', valor: (r: any) => FALLAS[r.falla] ?? r.falla },
            { titulo: 'Km', valor: (r: any) => num(r.km, 0), alinear: 'right' }, { titulo: 'Fecha', valor: (r: any) => fmtFecha(r.fecha) },
            { titulo: 'Dictamen', valor: (r: any) => r.dictamen ? `${r.dictamen.toLowerCase().replace('_', ' ')}${r.causa ? ` · ${r.causa}` : ''}` : '—' },
            { titulo: 'Compensación', valor: (r: any) => r.compensacion ? `${r.compensacion}${r.compensacion_valor ? ` (${pesos(r.compensacion_valor)})` : ''}` : '—' },
            { titulo: 'Estado', valor: (r: any) => <Etiqueta texto={r.estado.toLowerCase().replace('_', ' ')} color={ESTADO[r.estado]} /> },
          ]} />
        <Paginacion total={lista.data?.total ?? 0} pagina={pag} porPagina={por} onPagina={setPag} onPorPagina={setPor} />
        <Dialog open={nuevo} onClose={() => setNuevo(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Nuevo reclamo de garantía</DialogTitle>
          <DialogContent>
            <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
              <Grid size={6}><TextField fullWidth size="small" label="Código de la llanta" value={f.codigo} onChange={e => setF({ ...f, codigo: e.target.value })} /></Grid>
              <Grid size={6}><TextField select fullWidth size="small" label="Falla" value={f.falla} onChange={e => setF({ ...f, falla: e.target.value })}>
                {Object.entries(FALLAS).map(([k, t]) => <MenuItem key={k} value={k}>{t}</MenuItem>)}</TextField></Grid>
              <Grid size={6}><TextField fullWidth size="small" type="number" label="Kilometraje" value={f.km} onChange={e => setF({ ...f, km: e.target.value })} /></Grid>
              <Grid size={6}><TextField fullWidth size="small" type="date" label="Fecha" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid size={12}><TextField fullWidth multiline minRows={2} size="small" label="Condiciones de operación" value={f.condiciones} onChange={e => setF({ ...f, condiciones: e.target.value })} /></Grid>
              <Grid size={12}>
                <Button component="label" size="small">Adjuntar fotos<input hidden multiple type="file" accept="image/*,.pdf" onChange={e => setFotos(Array.from(e.target.files ?? []))} /></Button>
                <Typography component="span" sx={{ fontSize: 12, ml: 1 }}>{fotos.map(x => x.name).join(', ')}</Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setNuevo(false)}>Cancelar</Button><Button variant="contained" onClick={crear} disabled={!f.codigo}>Registrar</Button></DialogActions>
        </Dialog>
        <Dialog open={!!avance} onClose={() => setAvance(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Dictamen · {avance?.codigo}</DialogTitle>
          <DialogContent>
            <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
              <Grid size={6}><TextField select fullWidth size="small" label="Dictamen" value={d.dictamen} onChange={e => setD({ ...d, dictamen: e.target.value })}>
                <MenuItem value="PROCEDE">Procede</MenuItem><MenuItem value="PARCIAL">Procede parcial</MenuItem><MenuItem value="NO_PROCEDE">No procede</MenuItem></TextField></Grid>
              <Grid size={6}><TextField fullWidth size="small" label="Causa probable" value={d.causa} onChange={e => setD({ ...d, causa: e.target.value })} /></Grid>
              {d.dictamen !== 'NO_PROCEDE' && <>
                <Grid size={8}><TextField fullWidth size="small" label="Compensación" value={d.compensacion} onChange={e => setD({ ...d, compensacion: e.target.value })} /></Grid>
                <Grid size={4}><TextField fullWidth size="small" type="number" label="Valor" value={d.compensacion_valor} onChange={e => setD({ ...d, compensacion_valor: e.target.value })} /></Grid>
              </>}
            </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setAvance(null)}>Cancelar</Button>
            <Button variant="contained" disabled={!d.causa} onClick={() => avanzar(avance, { ...d, compensacion_valor: d.compensacion_valor === '' ? null : Number(d.compensacion_valor) })}>Firmar dictamen</Button></DialogActions>
        </Dialog>
        <DialogoHojaDeVida abierto={!!hoja} q={hoja ?? undefined} onCerrar={() => setHoja(null)} />
      </Box>
    </Layout>
  )
}
