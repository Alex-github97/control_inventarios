/**
 * Planta de reencauche · Evaluación técnica, retenciones y rechazos
 *
 * - Evaluación técnica: las condicionales esperan aquí el dictamen de un
 *   usuario con rol técnico (la API lo comprueba, no solo esta pantalla).
 * - Retenciones: manuales o de un ciclo con desviación; calidad las libera con
 *   justificación o rechaza la carcasa.
 * - Rechazos: cada rechazada necesita disposición —devolución al cliente,
 *   gestor autorizado con acta o, si es de la planta, venta como no apta—.
 */
import { useState } from 'react'
import {
  Box, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Autocomplete,
  Alert, Checkbox, Typography, ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import { FactCheck } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { rtm, fechaHora } from '@/api/reencauche'
import { Encabezado, TablaRegistros, Etiqueta, errorApi } from '@/components/comun/Registro'
import { COLOR, SelectorPropietario, Paginacion, DialogoHojaDeVida } from '@/components/reencauche/comun'

function useMotivos() { return useQuery({ queryKey: ['rtm', 'motivos'], queryFn: rtm.motivos, staleTime: 300_000 }) }

function Evaluacion({ onHoja }: { onHoja: (codigo: string) => void }) {
  const qc = useQueryClient()
  const roles = useQuery({ queryKey: ['rtm', 'roles', 'yo'], queryFn: rtm.misRoles })
  const cola = useQuery({ queryKey: ['rtm', 'evaluacion'], queryFn: rtm.evaluacion, refetchInterval: 30_000 })
  const motivos = useMotivos()
  const [sel, setSel] = useState<any>(null)
  const [f, setF] = useState<any>({ resultado: 'APROBAR', justificacion: '', motivos: [] })
  const dictaminar = async () => {
    try {
      await rtm.dictaminar(sel.orden_id, { ...f, motivos: f.motivos.map((m: any) => m.id) })
      toast.success(f.resultado === 'APROBAR' ? `${sel.codigo} aprobada: sigue su ruta` : `${sel.codigo} rechazada`)
      setSel(null); qc.invalidateQueries({ queryKey: ['rtm'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <>
      {roles.data && !roles.data.TECNICO && <Alert severity="info" sx={{ mb: 1 }}>Solo un usuario con rol técnico de la planta puede dictaminar.</Alert>}
      <TablaRegistros filas={(cola.data ?? []).map((o: any) => ({ ...o, id: o.orden_id }))} cargando={cola.isLoading}
        vacio="No hay carcasas esperando dictamen" etiqueta={(o: any) => o.codigo} onFila={(o: any) => onHoja(o.codigo)}
        extra={(o: any) => <Button size="small" variant="outlined" disabled={!roles.data?.TECNICO}
          onClick={() => { setSel(o); setF({ resultado: 'APROBAR', justificacion: '', motivos: [] }) }}>Dictaminar</Button>}
        columnas={[
          { titulo: 'Código', valor: (o: any) => <b style={{ fontFamily: 'monospace' }}>{o.codigo}</b> },
          { titulo: 'Cliente', valor: (o: any) => o.cliente }, { titulo: 'Medida', valor: (o: any) => o.medida },
          { titulo: 'Etapa', valor: (o: any) => o.etapa?.nombre },
          { titulo: 'Por qué', valor: (o: any) => o.ultimo_paso?.decision === 'EVALUACION' ? 'Medida fuera de tolerancia' : 'Condicional en inspección' },
          { titulo: 'Desde', valor: (o: any) => fechaHora(o.ultimo_paso?.fin) },
        ]} />
      <Dialog open={!!sel} onClose={() => setSel(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Dictamen técnico · {sel?.codigo}</DialogTitle>
        <DialogContent>
          <ToggleButtonGroup exclusive value={f.resultado} onChange={(_, v) => v && setF({ ...f, resultado: v })} sx={{ my: 1 }}>
            <ToggleButton value="APROBAR" color="success">Aprobar</ToggleButton><ToggleButton value="RECHAZAR" color="error">Rechazar</ToggleButton>
          </ToggleButtonGroup>
          <TextField fullWidth multiline minRows={2} label="Justificación" value={f.justificacion} onChange={e => setF({ ...f, justificacion: e.target.value })} sx={{ my: 1 }} />
          {f.resultado === 'RECHAZAR' && <Autocomplete multiple size="small" options={(motivos.data ?? []).filter((m: any) => m.activo)} value={f.motivos}
            getOptionLabel={(m: any) => m.nombre} isOptionEqualToValue={(a: any, b: any) => a.id === b.id} onChange={(_, v) => setF({ ...f, motivos: v })}
            renderInput={p => <TextField {...p} label="Motivos de rechazo" />} />}
        </DialogContent>
        <DialogActions><Button onClick={() => setSel(null)}>Cancelar</Button>
          <Button variant="contained" onClick={dictaminar} disabled={f.justificacion.trim().length < 5 || (f.resultado === 'RECHAZAR' && !f.motivos.length)}>Firmar dictamen</Button></DialogActions>
      </Dialog>
    </>
  )
}

function Retenciones({ onHoja }: { onHoja: (codigo: string) => void }) {
  const qc = useQueryClient()
  const roles = useQuery({ queryKey: ['rtm', 'roles', 'yo'], queryFn: rtm.misRoles })
  const [estado, setEstado] = useState('ABIERTA')
  const lista = useQuery({ queryKey: ['rtm', 'retenciones', estado], queryFn: () => rtm.retenciones(estado) })
  const motivos = useMotivos()
  const [sel, setSel] = useState<any>(null)
  const [f, setF] = useState<any>({ accion: 'LIBERAR', justificacion: '', motivos: [] })
  const [nueva, setNueva] = useState({ codigo: '', motivo: '' })
  const cerrar = async () => {
    try { await rtm.cerrarRetencion(sel.id, { ...f, motivos: f.motivos.map((m: any) => m.id) }); toast.success('Retención cerrada'); setSel(null); qc.invalidateQueries({ queryKey: ['rtm'] }) }
    catch (e) { toast.error(errorApi(e)) }
  }
  const retener = async () => {
    try { await rtm.retener(nueva.codigo.trim().toUpperCase(), nueva.motivo); toast.success('Carcasa retenida'); setNueva({ codigo: '', motivo: '' }); qc.invalidateQueries({ queryKey: ['rtm'] }) }
    catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
        <TextField select size="small" label="Estado" value={estado} onChange={e => setEstado(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="ABIERTA">Abiertas</MenuItem><MenuItem value="LIBERADA">Liberadas</MenuItem><MenuItem value="RECHAZADA">Rechazadas</MenuItem>
        </TextField>
        <TextField size="small" label="Retener carcasa (código)" value={nueva.codigo} onChange={e => setNueva({ ...nueva, codigo: e.target.value })} />
        <TextField size="small" label="Motivo" value={nueva.motivo} onChange={e => setNueva({ ...nueva, motivo: e.target.value })} sx={{ minWidth: 260 }} />
        <Button variant="outlined" onClick={retener} disabled={!nueva.codigo || nueva.motivo.trim().length < 5}>Retener</Button>
      </Box>
      <TablaRegistros filas={lista.data ?? []} cargando={lista.isLoading} vacio="Sin retenciones" etiqueta={(r: any) => r.codigo}
        onFila={(r: any) => onHoja(r.codigo)}
        extra={(r: any) => r.estado === 'ABIERTA' && <Button size="small" variant="outlined" disabled={!roles.data?.CALIDAD}
          onClick={() => { setSel(r); setF({ accion: 'LIBERAR', justificacion: '', motivos: [] }) }}>Resolver</Button>}
        columnas={[
          { titulo: 'Código', valor: (r: any) => <b style={{ fontFamily: 'monospace' }}>{r.codigo}</b> },
          { titulo: 'Cliente', valor: (r: any) => r.cliente }, { titulo: 'Etapa', valor: (r: any) => r.etapa },
          { titulo: 'Origen', valor: (r: any) => <Etiqueta texto={r.origen === 'CICLO' ? `Ciclo ${r.ciclo}` : r.origen.toLowerCase().replace('_', ' ')} color={r.origen === 'CICLO' ? '#B45309' : '#7C3AED'} /> },
          { titulo: 'Motivo', valor: (r: any) => r.motivo }, { titulo: 'Desde', valor: (r: any) => fechaHora(r.creada_en) },
          ...(estado !== 'ABIERTA' ? [{ titulo: 'Justificación', valor: (r: any) => r.justificacion }] : []),
        ]} />
      <Dialog open={!!sel} onClose={() => setSel(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolver retención · {sel?.codigo}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 1 }}>{sel?.motivo}</Typography>
          <ToggleButtonGroup exclusive value={f.accion} onChange={(_, v) => v && setF({ ...f, accion: v })} sx={{ mb: 1 }}>
            <ToggleButton value="LIBERAR" color="success">Liberar</ToggleButton><ToggleButton value="RECHAZAR" color="error">Rechazar la carcasa</ToggleButton>
          </ToggleButtonGroup>
          <TextField fullWidth multiline minRows={2} label="Justificación" value={f.justificacion} onChange={e => setF({ ...f, justificacion: e.target.value })} sx={{ my: 1 }} />
          {f.accion === 'RECHAZAR' && <Autocomplete multiple size="small" options={(motivos.data ?? []).filter((m: any) => m.activo)} value={f.motivos}
            getOptionLabel={(m: any) => m.nombre} isOptionEqualToValue={(a: any, b: any) => a.id === b.id} onChange={(_, v) => setF({ ...f, motivos: v })}
            renderInput={p => <TextField {...p} label="Motivos de rechazo" />} />}
        </DialogContent>
        <DialogActions><Button onClick={() => setSel(null)}>Cancelar</Button>
          <Button variant="contained" onClick={cerrar} disabled={f.justificacion.trim().length < 5 || (f.accion === 'RECHAZAR' && !f.motivos.length)}>Confirmar</Button></DialogActions>
      </Dialog>
    </>
  )
}

function Rechazos({ onHoja }: { onHoja: (codigo: string) => void }) {
  const qc = useQueryClient()
  const planta = useQuery({ queryKey: ['rtm', 'planta'], queryFn: rtm.planta })
  const [cliente, setCliente] = useState<number | ''>('')
  const [pendientes, setPendientes] = useState(true)
  const [pag, setPag] = useState(0)
  const [por, setPor] = useState(50)
  const lista = useQuery({ queryKey: ['rtm', 'rechazos', cliente, pendientes, pag, por],
    queryFn: () => rtm.rechazos({ depositante_id: cliente || undefined, pendientes, limite: por, desplazamiento: pag * por }) })
  const [marcadas, setMarcadas] = useState<number[]>([])
  const [dlg, setDlg] = useState(false)
  const [f, setF] = useState<any>({ tipo: 'DEVOLUCION', gestor: '', acta: '', valor: '' })
  const disponer = async () => {
    try {
      const r = await rtm.disponer({ carcasa_ids: marcadas, tipo: f.tipo, gestor: f.gestor || null, acta: f.acta || null, valor: f.valor === '' ? null : Number(f.valor) })
      toast.success(`${r.carcasas} carcasa(s) con disposición ${f.tipo.toLowerCase()}`); setDlg(false); setMarcadas([]); qc.invalidateQueries({ queryKey: ['rtm'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  const filas = lista.data?.filas ?? []
  return (
    <>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <SelectorPropietario valor={cliente} onChange={v => { setCliente(v); setPag(0) }} todos />
        <TextField select size="small" label="Mostrar" value={pendientes ? 1 : 0} onChange={e => { setPendientes(Number(e.target.value) === 1); setPag(0) }} sx={{ minWidth: 200 }}>
          <MenuItem value={1}>Sin disposición cumplida</MenuItem><MenuItem value={0}>Todas</MenuItem>
        </TextField>
        <Button variant="contained" disabled={!marcadas.length} onClick={() => setDlg(true)} sx={{ bgcolor: COLOR }}>Disponer {marcadas.length || ''}</Button>
      </Box>
      <TablaRegistros filas={filas} cargando={lista.isLoading} vacio="Sin rechazos" etiqueta={(c: any) => c.codigo} onFila={(c: any) => onHoja(c.codigo)}
        columnas={[
          { titulo: '', valor: (c: any) => <Checkbox size="small" checked={marcadas.includes(c.id)} onClick={e => e.stopPropagation()}
            disabled={c.disposicion_estado === 'CUMPLIDA'} onChange={e => setMarcadas(e.target.checked ? [...marcadas, c.id] : marcadas.filter(x => x !== c.id))} /> },
          { titulo: 'Código', valor: (c: any) => <b style={{ fontFamily: 'monospace' }}>{c.codigo}</b> },
          { titulo: 'Cliente', valor: (c: any) => c.cliente }, { titulo: 'Medida', valor: (c: any) => c.medida },
          { titulo: 'Rechazada en', valor: (c: any) => c.etapa_rechazo }, { titulo: 'Motivos', valor: (c: any) => c.motivos.join('; ') },
          { titulo: 'Disposición', valor: (c: any) => c.disposicion ? `${c.disposicion.toLowerCase()} (${c.disposicion_estado.toLowerCase()})` : <Etiqueta texto="Pendiente" color="#DC2626" /> },
        ]} />
      <Paginacion total={lista.data?.total ?? 0} pagina={pag} porPagina={por} onPagina={setPag} onPorPagina={setPor} />
      <Dialog open={dlg} onClose={() => setDlg(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Disposición de {marcadas.length} carcasa(s)</DialogTitle>
        <DialogContent>
          <TextField select fullWidth size="small" label="Destino" value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })} sx={{ my: 1 }}>
            <MenuItem value="DEVOLUCION">Devolver al cliente (sale en la próxima entrega)</MenuItem>
            <MenuItem value="GESTOR">Gestor autorizado de residuos</MenuItem>
            {planta.data?.permite_venta_rechazo && <MenuItem value="VENTA">Vender como carcasa no apta (solo de la planta)</MenuItem>}
          </TextField>
          {f.tipo === 'GESTOR' && <>
            <TextField fullWidth size="small" label="Gestor" value={f.gestor} onChange={e => setF({ ...f, gestor: e.target.value })} sx={{ my: 1 }} />
            <TextField fullWidth size="small" label="Acta o certificado" value={f.acta} onChange={e => setF({ ...f, acta: e.target.value })} />
          </>}
          {f.tipo === 'VENTA' && <TextField fullWidth size="small" type="number" label="Valor de venta" value={f.valor} onChange={e => setF({ ...f, valor: e.target.value })} sx={{ my: 1 }} />}
        </DialogContent>
        <DialogActions><Button onClick={() => setDlg(false)}>Cancelar</Button>
          <Button variant="contained" onClick={disponer} disabled={f.tipo === 'GESTOR' && (!f.gestor || !f.acta)}>Registrar</Button></DialogActions>
      </Dialog>
    </>
  )
}

export default function RTMCalidad() {
  const [pestana, setPestana] = useState(0)
  const [hoja, setHoja] = useState<string | null>(null)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<FactCheck sx={{ fontSize: 28 }} />} titulo="Evaluación técnica y retenciones"
          subtitulo="Ninguna condicional avanza sin dictamen, ninguna retenida sin justificación, ninguna rechazada sin disposición" color={COLOR} />
        <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }}>
          <Tab label="Evaluación técnica" /><Tab label="Retenciones" /><Tab label="Rechazos y disposición" />
        </Tabs>
        {pestana === 0 && <Evaluacion onHoja={setHoja} />}
        {pestana === 1 && <Retenciones onHoja={setHoja} />}
        {pestana === 2 && <Rechazos onHoja={setHoja} />}
        <DialogoHojaDeVida abierto={!!hoja} q={hoja ?? undefined} onCerrar={() => setHoja(null)} />
      </Box>
    </Layout>
  )
}
