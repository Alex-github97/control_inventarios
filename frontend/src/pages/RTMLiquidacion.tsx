/**
 * Planta de reencauche · Liquidación
 *
 * Cada entrega a un cliente genera su liquidación: una línea por llanta
 * (reencauche con el precio congelado al aprobar la inspección final, sus
 * reparaciones) y el cargo de inspección de las rechazadas que se devuelven.
 * Aprobarla emite la factura en el ERP con el tercero del cliente; si no se
 * puede (sin resolución, cliente sin NIT), queda aprobada con el aviso.
 */
import { useState } from 'react'
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert, Typography,
  Table, TableBody, TableCell, TableHead, TableRow, LinearProgress,
} from '@mui/material'
import { RequestQuote } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { rtm, pesos, fechaHora, num } from '@/api/reencauche'
import { Encabezado, TablaRegistros, Etiqueta, errorApi } from '@/components/comun/Registro'
import { COLOR, SelectorPropietario, Paginacion } from '@/components/reencauche/comun'

const ESTADO: Record<string, string> = { BORRADOR: '#64748B', APROBADA: '#B45309', FACTURADA: '#15803D', ANULADA: '#94A3B8' }

function Detalle({ id, onCerrar }: { id: number | null; onCerrar: () => void }) {
  const qc = useQueryClient()
  const l = useQuery({ queryKey: ['rtm', 'liquidacion', id], queryFn: () => rtm.liquidacion(id!), enabled: !!id })
  const aprobar = async () => {
    try {
      const r = await rtm.aprobarLiquidacion(id!)
      if (r.estado === 'FACTURADA') toast.success(`Factura ${r.factura} emitida en el ERP`)
      else toast.error(`Aprobada, sin factura: ${r.aviso_factura}`, { duration: 8000 })
      qc.invalidateQueries({ queryKey: ['rtm'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  const d = l.data
  return (
    <Dialog open={!!id} onClose={onCerrar} maxWidth="md" fullWidth>
      <DialogTitle>Liquidación {d?.codigo} · {d?.cliente}</DialogTitle>
      <DialogContent dividers>
        {l.isLoading && <LinearProgress />}
        {d && <>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>Entrega {d.entrega} · {fechaHora(d.creada_en)}{d.factura ? ` · factura ${d.factura}` : ''}</Typography>
          {d.aviso_factura && <Alert severity="warning" sx={{ mb: 1 }}>{d.aviso_factura}</Alert>}
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700 } }}>
              <TableCell>Concepto</TableCell><TableCell>Descripción</TableCell><TableCell align="right">Cant.</TableCell>
              <TableCell align="right">Valor</TableCell><TableCell align="right">Total</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {d.lineas.map((x: any) => (
                <TableRow key={x.id} sx={{ '& td': { fontSize: 12.5 } }}>
                  <TableCell>{x.concepto === 'CARGO_INSPECCION' ? 'Cargo de inspección' : x.concepto.charAt(0) + x.concepto.slice(1).toLowerCase()}</TableCell>
                  <TableCell>{x.descripcion}</TableCell><TableCell align="right">{num(x.cantidad, 0)}</TableCell>
                  <TableCell align="right">{pesos(x.valor_unitario)}</TableCell><TableCell align="right">{pesos(x.total)}</TableCell>
                </TableRow>
              ))}
              <TableRow><TableCell colSpan={4} align="right">Subtotal</TableCell><TableCell align="right">{pesos(d.subtotal)}</TableCell></TableRow>
              <TableRow><TableCell colSpan={4} align="right">IVA 19 %</TableCell><TableCell align="right">{pesos(d.iva)}</TableCell></TableRow>
              <TableRow><TableCell colSpan={4} align="right"><b>Total</b></TableCell><TableCell align="right"><b>{pesos(d.total)}</b></TableCell></TableRow>
            </TableBody>
          </Table>
        </>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar}>Cerrar</Button>
        {d && ['BORRADOR', 'APROBADA'].includes(d.estado) && <Button variant="contained" onClick={aprobar} sx={{ bgcolor: COLOR }}>
          {d.estado === 'BORRADOR' ? 'Aprobar y facturar' : 'Reintentar factura'}</Button>}
      </DialogActions>
    </Dialog>
  )
}

export default function RTMLiquidacion() {
  const [cliente, setCliente] = useState<number | ''>('')
  const [estado, setEstado] = useState('')
  const [pag, setPag] = useState(0)
  const [por, setPor] = useState(25)
  const [sel, setSel] = useState<number | null>(null)
  const lista = useQuery({ queryKey: ['rtm', 'liquidaciones', cliente, estado, pag, por],
    queryFn: () => rtm.liquidaciones({ depositante_id: cliente || undefined, estado: estado || undefined, limite: por, desplazamiento: pag * por }) })
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<RequestQuote sx={{ fontSize: 28 }} />} titulo="Liquidación al cliente"
          subtitulo="Lo que se hizo sobre las llantas de cada cliente, con el precio fijado en la inspección final" color={COLOR} />
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
          <SelectorPropietario valor={cliente} onChange={v => { setCliente(v); setPag(0) }} todos sinPropio />
          <TextField select size="small" label="Estado" value={estado} onChange={e => { setEstado(e.target.value); setPag(0) }} sx={{ minWidth: 160 }}>
            <MenuItem value="">Todas</MenuItem>{Object.keys(ESTADO).map(k => <MenuItem key={k} value={k}>{k.toLowerCase()}</MenuItem>)}
          </TextField>
        </Box>
        <TablaRegistros filas={lista.data?.filas ?? []} cargando={lista.isLoading} vacio="Sin liquidaciones: nacen al despachar una entrega" etiqueta={(l: any) => l.codigo}
          onFila={(l: any) => setSel(l.id)}
          columnas={[
            { titulo: 'Liquidación', valor: (l: any) => <b>{l.codigo}</b> }, { titulo: 'Cliente', valor: (l: any) => l.cliente },
            { titulo: 'Entrega', valor: (l: any) => l.entrega }, { titulo: 'Fecha', valor: (l: any) => fechaHora(l.creada_en) },
            { titulo: 'Total', valor: (l: any) => pesos(l.total), alinear: 'right' },
            { titulo: 'Estado', valor: (l: any) => <Etiqueta texto={l.estado.toLowerCase()} color={ESTADO[l.estado]} /> },
            { titulo: 'Aviso', valor: (l: any) => l.aviso_factura ? <span style={{ color: '#B45309' }}>{l.aviso_factura}</span> : '' },
          ]} />
        <Paginacion total={lista.data?.total ?? 0} pagina={pag} porPagina={por} onPagina={setPag} onPorPagina={setPor} />
        <Detalle id={sel} onCerrar={() => setSel(null)} />
      </Box>
    </Layout>
  )
}
