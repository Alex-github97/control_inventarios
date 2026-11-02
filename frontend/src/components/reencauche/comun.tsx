/**
 * Piezas comunes de la planta de reencauche: selector de propietario, etiqueta
 * de la carcasa, hoja de vida y paginación en el servidor.
 */
import { useState } from 'react'
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, TextField, MenuItem, Chip, Paper,
  Table, TableBody, TableCell, TableHead, TableRow, TablePagination, LinearProgress, Alert, Divider, alpha,
} from '@mui/material'
import { Print, AttachFile } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { rtm, ESTADO_CARCASA, fechaHora, pesos, num } from '@/api/reencauche'
import { Etiqueta, errorApi } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

export const COLOR = COLOR_MODULO

export const usePropietarios = () => useQuery({ queryKey: ['rtm', 'propietarios'], queryFn: rtm.propietarios, staleTime: 60_000 })

export function SelectorPropietario({ valor, onChange, etiqueta = 'Cliente', todos = false, sinPropio = false, ancho = 260 }: {
  valor: number | ''; onChange: (v: number | '') => void; etiqueta?: string; todos?: boolean; sinPropio?: boolean; ancho?: number
}) {
  const p = usePropietarios()
  return (
    <TextField select size="small" label={etiqueta} value={valor} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      sx={{ minWidth: ancho }}>
      {todos && <MenuItem value="">Todos</MenuItem>}
      {(p.data ?? []).filter((d: any) => !(sinPropio && d.propio)).map((d: any) => (
        <MenuItem key={d.id} value={d.id}>{d.propio ? `${d.nombre} (la planta)` : d.nombre}</MenuItem>
      ))}
    </TextField>
  )
}

export function EstadoCarcasa({ estado }: { estado: string }) {
  const [t, c] = ESTADO_CARCASA[estado] ?? [estado, '#64748B']
  return <Etiqueta texto={t} color={c} />
}

const esc = (x: unknown) => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** La etiqueta que se pega en la carcasa: el código es lo que se escanea en cada estación. */
export async function imprimirEtiquetas(codigos: string[]) {
  const etiquetas = await Promise.all(codigos.map(c => rtm.etiqueta(c)))
  const qrs = await Promise.all(etiquetas.map(e => QRCode.toDataURL(e.codigo, { margin: 0, width: 300 })))
  const w = window.open('', '_blank', 'width=480,height=720')
  if (!w) return
  w.document.write(`<html><head><title>Etiquetas</title><style>
    @page{size:100mm 70mm;margin:3mm} body{font-family:Arial,sans-serif;margin:0}
    .e{width:94mm;height:64mm;display:flex;gap:3mm;align-items:center;page-break-after:always}
    .cod{font:700 22px monospace;letter-spacing:1px} .m{font-size:11px;line-height:1.35}</style></head><body>
    ${etiquetas.map((e, i) => `<div class="e"><img src="${qrs[i]}" style="width:38mm;height:38mm"/><div>
      <div class="cod">${esc(e.codigo)}</div>
      <div class="m"><b>${esc(e.cliente)}</b></div>
      <div class="m">${esc(e.medida)} · ${esc(e.marca)} ${esc(e.modelo)}</div>
      <div class="m">DOT ${esc(e.dot ?? 'ilegible')} · Reencauche nº ${esc(e.reencauche ?? '')}</div>
      <div class="m">${esc(e.banda ?? '')}</div>
      <div class="m">Orden ${esc(e.orden ?? '')}</div></div></div>`).join('')}
    </body></html>`)
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
}

export function BotonEtiqueta({ codigos, texto = 'Imprimir etiqueta' }: { codigos: string[]; texto?: string }) {
  return <Button size="small" startIcon={<Print />} onClick={() => imprimirEtiquetas(codigos)} disabled={!codigos.length}>{texto}</Button>
}

export function Paginacion({ total, pagina, porPagina, onPagina, onPorPagina }: {
  total: number; pagina: number; porPagina: number; onPagina: (p: number) => void; onPorPagina: (n: number) => void
}) {
  return (
    <TablePagination component="div" count={total} page={pagina} rowsPerPage={porPagina} rowsPerPageOptions={[25, 50, 100]}
      onPageChange={(_, p) => onPagina(p)} onRowsPerPageChange={e => { onPorPagina(Number(e.target.value)); onPagina(0) }}
      labelRowsPerPage="Filas" labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count.toLocaleString('es-CO')}`} />
  )
}

/** «2 nov 02:43 → 02:51» si empieza y termina el mismo día. */
function rango(ini?: string | null, fin?: string | null) {
  if (!ini) return '—'
  if (!fin || fin === ini) return fechaHora(ini)
  const a = new Date(ini), b = new Date(fin)
  const hora = b.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return a.toDateString() === b.toDateString() ? `${fechaHora(ini)} → ${hora}` : `${fechaHora(ini)} → ${fechaHora(fin)}`
}

const DECISION: Record<string, string> = {
  APROBADA: '#15803D', CONDICIONAL: '#B45309', RECHAZADA: '#DC2626', RETENIDA: '#7C3AED', CORRECCION: '#0369A1',
  REPETIR: '#B45309', EVALUACION: '#B45309', NO_CONFORME: '#DC2626',
}

function Mediciones({ meds }: { meds?: any[] | null }) {
  if (!meds?.length) return null
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {meds.map((m: any) => (
        <Chip key={m.clave} size="small" variant="outlined"
          label={`${m.nombre ?? m.clave}: ${typeof m.valor === 'boolean' ? (m.valor ? 'sí' : 'no') : num(m.valor, 2)}${m.unidad ? ' ' + m.unidad : ''}`}
          sx={{ fontSize: 11, borderColor: m.conforme === false ? '#DC2626' : undefined, color: m.conforme === false ? '#DC2626' : undefined }} />
      ))}
    </Box>
  )
}

async function abrirArchivo(id: number, nombre: string) {
  const blob = await rtm.descargarArchivo(id)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.download = nombre; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** Todo lo que le pasó a una llanta, visita por visita. */
export function HojaDeVida({ q, id }: { q?: string; id?: number }) {
  const h = useQuery({ queryKey: ['rtm', 'hoja', q, id], enabled: !!(q || id), retry: false,
    queryFn: () => id ? rtm.hojaPorId(id) : rtm.hojaDeVida(q!) })
  if (h.isLoading) return <LinearProgress />
  if (h.isError) return <Alert severity="warning">{errorApi(h.error, 'No se encontró la llanta')}</Alert>
  const d = h.data
  if (!d) return null
  if (d.varias) return <Alert severity="info">Varias llantas coinciden: {d.varias.map((x: any) => x.codigo).join(', ')}. Busque por el código.</Alert>
  const c = d.carcasa
  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2, borderColor: alpha(COLOR, 0.3) }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 20, fontFamily: 'monospace' }}>{c.codigo}</Typography>
            <Typography sx={{ fontSize: 13 }}>{c.cliente} · {c.medida} · {c.marca} {c.modelo}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              DOT {c.dot ?? (c.dot_ilegible ? 'ilegible' : '—')} · Serie {c.serie ?? '—'} · Reencauches {c.reencauches}
              {c.eam_neumatico_id ? ' · Llanta de la flota (CMMS)' : ''}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <EstadoCarcasa estado={c.estado} />
            <Typography sx={{ fontSize: 12, mt: 0.5 }}>{c.ubicacion}</Typography>
          </Box>
        </Box>
      </Paper>
      {d.visitas.map((v: any) => (
        <Paper key={v.orden_id} variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>Reencauche nº {v.numero_reencauche} · orden {v.orden}</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {v.banda && <Chip size="small" label={v.banda} />}
              <Etiqueta texto={v.estado === 'ABIERTA' ? 'En proceso' : v.estado === 'TERMINADA' ? 'Terminada' : 'Rechazada'}
                color={v.estado === 'RECHAZADA' ? '#DC2626' : v.estado === 'TERMINADA' ? '#15803D' : '#0369A1'} />
            </Box>
          </Box>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
            Recepción {v.recepcion?.codigo} ({fechaHora(v.recepcion?.fecha)}){v.recepcion?.remision ? ` · remisión ${v.recepcion.remision}` : ''}
            {v.recepcion?.viaje ? ` · recogida en el viaje ${v.recepcion.viaje}` : ''}
            {v.etapa_rechazo ? ` · rechazada en «${v.etapa_rechazo}»` : ''}
            {v.precio != null ? ` · precio ${pesos(v.precio)}` : ''} · insumos {pesos(v.costo_insumos)}
          </Typography>
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11.5 } }}>
              <TableCell>Etapa</TableCell><TableCell>Quién y dónde</TableCell><TableCell>Cuándo</TableCell>
              <TableCell>Resultado</TableCell><TableCell>Detalle</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {v.pasos.map((p: any) => (
                <TableRow key={p.id} sx={{ '& td': { fontSize: 12, verticalAlign: 'top' }, opacity: p.anulado_por ? 0.55 : 1 }}>
                  <TableCell>
                    {p.etapa}
                    {p.anulado_por && <Typography sx={{ fontSize: 10.5, color: '#DC2626' }}>Anulado por una corrección</Typography>}
                    {p.anula_a && <Typography sx={{ fontSize: 10.5, color: '#0369A1' }}>Corrección: {p.motivo_correccion}</Typography>}
                  </TableCell>
                  <TableCell>{p.operario ?? '—'}{p.equipo ? ` · ${p.equipo}` : ''}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{rango(p.inicio, p.fin)}</TableCell>
                  <TableCell>
                    {p.omitida ? <Etiqueta texto="Omitida" color="#64748B" /> : p.estado === 'ABIERTO' ? <Etiqueta texto="En proceso" color="#0369A1" />
                      : p.decision ? <Etiqueta texto={p.decision.charAt(0) + p.decision.slice(1).toLowerCase().replace('_', ' ')} color={DECISION[p.decision] ?? '#64748B'} /> : null}
                  </TableCell>
                  <TableCell>
                    <Mediciones meds={p.mediciones} />
                    {p.ciclo && <Typography sx={{ fontSize: 11.5 }}>Ciclo <b>{p.ciclo.codigo}</b> {p.ciclo.conforme ? 'sin desviaciones' : 'con desviación'}</Typography>}
                    {p.defectos.map((x: any, i: number) => <Typography key={i} sx={{ fontSize: 11.5 }}>Defecto: {x.defecto} ({x.zona.toLowerCase()}){x.ubicacion ? ` · ${x.ubicacion}` : ''}{x.tamano_mm ? ` · ${x.tamano_mm} mm` : ''}</Typography>)}
                    {p.motivos.map((x: string) => <Typography key={x} sx={{ fontSize: 11.5, color: '#DC2626' }}>Motivo: {x}</Typography>)}
                    {p.reparaciones.map((x: any, i: number) => <Typography key={i} sx={{ fontSize: 11.5 }}>Reparación {x.tipo_reparacion.toLowerCase()} · {x.tipo_dano.toLowerCase()} {x.tamano_mm} mm en {x.ubicacion.toLowerCase()}{x.fuera_limite ? ' (autorizada fuera de límite)' : ''}</Typography>)}
                    {p.consumos.map((x: any, i: number) => <Typography key={i} sx={{ fontSize: 11.5 }}>{x.insumo}: {num(x.cantidad, 2)} {x.unidad?.toLowerCase()} · lote <b>{x.lote ?? '—'}</b></Typography>)}
                    {p.pruebas.map((x: any) => (
                      <Box key={x.id} sx={{ fontSize: 11.5 }}>
                        {x.prueba.toLowerCase()}: {x.resultado}
                        {x.archivos.map((a: any) => <Button key={a.id} size="small" startIcon={<AttachFile />} onClick={() => abrirArchivo(a.id, a.nombre)} sx={{ fontSize: 11, py: 0 }}>{a.nombre}</Button>)}
                      </Box>
                    ))}
                    {p.observaciones && <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{p.observaciones}</Typography>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(v.retenciones.length > 0 || v.dictamenes.length > 0 || v.disposicion || v.entrega) && <Divider sx={{ my: 1 }} />}
          {v.retenciones.map((r: any, i: number) => <Typography key={i} sx={{ fontSize: 12 }}>Retención ({r.origen.toLowerCase()}): {r.motivo} · {r.estado.toLowerCase()}{r.justificacion ? ` — ${r.justificacion}` : ''}</Typography>)}
          {v.dictamenes.map((r: any, i: number) => <Typography key={i} sx={{ fontSize: 12 }}>Dictamen técnico: {r.resultado.toLowerCase()} por {r.tecnico} ({fechaHora(r.fecha)}) — {r.justificacion}</Typography>)}
          {v.disposicion && <Typography sx={{ fontSize: 12 }}>Disposición: {v.disposicion.tipo.toLowerCase()}{v.disposicion.gestor ? ` · ${v.disposicion.gestor}` : ''}{v.disposicion.acta ? ` · acta ${v.disposicion.acta}` : ''} ({v.disposicion.estado.toLowerCase()})</Typography>}
          {v.entrega && <Typography sx={{ fontSize: 12 }}>Entrega {v.entrega.codigo} · {v.entrega.estado.toLowerCase()}{v.entrega.viaje ? ` · viaje ${v.entrega.viaje}` : ''}{v.entrega.placa ? ` · placa ${v.entrega.placa}` : ''}{v.entrega.recibe ? ` · recibió ${v.entrega.recibe} el ${fechaHora(v.entrega.fecha)}` : ''}</Typography>}
        </Paper>
      ))}
      {d.reclamos.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Reclamos de garantía</Typography>
          {d.reclamos.map((r: any) => <Typography key={r.codigo} sx={{ fontSize: 12 }}>{r.codigo} · {r.falla.toLowerCase().replace('_', ' ')} a {num(r.km, 0)} km · {r.estado.toLowerCase()}{r.dictamen ? ` · ${r.dictamen.toLowerCase().replace('_', ' ')}` : ''}{r.causa ? ` · causa: ${r.causa}` : ''}</Typography>)}
        </Paper>
      )}
      {d.movimientos_wms.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Movimientos en el WMS</Typography>
          {d.movimientos_wms.map((m: any, i: number) => <Typography key={i} sx={{ fontSize: 12 }}>{fechaHora(m.fecha)} · {m.tipo.toLowerCase().replace('_', ' ')} ({m.sentido}) · {m.producto}{m.documento === 'POS_VENTA' ? ' · venta en el punto de venta' : ''}</Typography>)}
        </Paper>
      )}
    </Box>
  )
}

export function DialogoHojaDeVida({ abierto, q, id, onCerrar }: { abierto: boolean; q?: string; id?: number; onCerrar: () => void }) {
  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="lg" fullWidth>
      <DialogTitle>Hoja de vida de la llanta</DialogTitle>
      <DialogContent dividers>{abierto && <HojaDeVida q={q} id={id} />}</DialogContent>
      <DialogActions><Button onClick={onCerrar}>Cerrar</Button></DialogActions>
    </Dialog>
  )
}

/** Busca una llanta por código, DOT o serie y abre su hoja de vida. */
export function BuscadorHoja() {
  const [q, setQ] = useState('')
  const [abierta, setAbierta] = useState<string | null>(null)
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <TextField size="small" label="Código, DOT o serie" value={q} onChange={e => setQ(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && q.trim()) setAbierta(q.trim()) }} sx={{ minWidth: 240 }} />
      <Button variant="outlined" onClick={() => q.trim() && setAbierta(q.trim())}>Hoja de vida</Button>
      <DialogoHojaDeVida abierto={!!abierta} q={abierta ?? undefined} onCerrar={() => setAbierta(null)} />
    </Box>
  )
}
