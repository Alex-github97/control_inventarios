/**
 * SCM · Devoluciones a proveedor
 *
 * Era una maqueta: cinco devoluciones con proveedores y órdenes escritos a
 * mano, y un formulario donde el proveedor y la orden eran texto libre.
 *
 * Ahora cada devolución cuelga de una orden de compra real y el proveedor
 * sale de ella: no puede quedar a nombre de quien no vendió. Para aprobarla,
 * rechazarla o cerrarla hay que registrar la respuesta del proveedor, y lo
 * recuperado alimenta la tasa de recuperación.
 */
import { useState } from 'react'
import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton, Tooltip, LinearProgress, Typography, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Button } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { AssignmentReturn, Edit, DeleteForever, Gavel } from '@mui/icons-material'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { scmApi, getOrdenesCompra, type DevolucionSCM } from '@/api/scm'
import { FormularioRegistro, useCrud, Cifra, Encabezado, fmtFecha, errorApi, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SCM_COLOR = COLOR_MODULO
const MOTIVOS: [string, string][] = [['DEFECTO_CALIDAD', 'Defecto de calidad'], ['CANTIDAD_INCORRECTA', 'Cantidad incorrecta'],
  ['PRODUCTO_EQUIVOCADO', 'Producto equivocado'], ['DANOS_TRANSPORTE', 'Daños en transporte'], ['VENCIMIENTO', 'Vencimiento'], ['OTRO', 'Otro']]
const ESTADOS: Record<string, { l: string; c: string }> = {
  PENDIENTE: { l: 'Pendiente', c: '#6B7280' }, EN_PROCESO: { l: 'En proceso', c: '#D97706' }, APROBADA: { l: 'Aprobada', c: '#0369A1' },
  RECHAZADA: { l: 'Rechazada', c: '#DC2626' }, CERRADA: { l: 'Cerrada', c: '#15803D' },
}
const cop = (n?: number | null) => (n == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n))
const hoy = () => new Date().toISOString().slice(0, 10)

export default function SCMDevoluciones() {
  const crud = useCrud(['scm-devoluciones'], scmApi.devoluciones, 'Devolución', [], true)
  const { data: ocs } = useQuery({ queryKey: ['scm-ordenes-selector'], queryFn: () => getOrdenesCompra({ page_size: 200 }) })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: DevolucionSCM | null }>({ abierto: false, r: null })
  const [resolver, setResolver] = useState<DevolucionSCM | null>(null)
  const [fr, setFr] = useState({ estado: 'EN_PROCESO', resolucion: '', valor_recuperado: '' })

  const opcionesOC: [number, string][] = (ocs?.items ?? []).filter(o => o.estado !== 'BORRADOR' && o.estado !== 'CANCELADA')
    .map(o => [o.id, `${o.numero} · ${o.proveedor_nombre ?? 'Proveedor'} · ${cop(o.total)}`])
  const CAMPOS: Campo[] = [
    { clave: 'orden_id', etiqueta: 'Orden de compra', tipo: 'seleccion', opciones: opcionesOC, obligatorio: true },
    { clave: 'motivo', etiqueta: 'Motivo', tipo: 'seleccion', opciones: MOTIVOS, obligatorio: true, ancho: 6 },
    { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', obligatorio: true, ancho: 6, validar: v => (v && v > hoy() ? 'No puede ser futura' : null) },
    { clave: 'unidades', etiqueta: 'Unidades devueltas', tipo: 'numero', min: 0.01, ancho: 6 },
    { clave: 'valor', etiqueta: 'Valor devuelto', tipo: 'numero', min: 0, ancho: 6 },
    { clave: 'descripcion', etiqueta: 'Qué se devuelve y por qué', tipo: 'area', obligatorio: true },
  ]

  const cambiar = useMutation({
    mutationFn: () => scmApi.devoluciones.estado(resolver!.id, fr.estado, fr.resolucion.trim() || null,
      fr.valor_recuperado === '' ? null : Number(fr.valor_recuperado)),
    onSuccess: () => { toast.success('Devolución actualizada'); crud.refrescar(); setResolver(null) },
    onError: (e: any) => toast.error(errorApi(e)),
  })

  const lista = crud.datos
  const abiertas = lista.filter(d => !['CERRADA', 'RECHAZADA'].includes(d.estado))
  const devuelto = lista.reduce((s, d) => s + (d.valor || 0), 0)
  const recuperado = lista.reduce((s, d) => s + (d.valor_recuperado || 0), 0)
  const exigeResolucion = ['APROBADA', 'RECHAZADA', 'CERRADA'].includes(fr.estado)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<AssignmentReturn sx={{ fontSize: 28 }} />} titulo="Devoluciones a proveedor" subtitulo="SCM · Reclamaciones por calidad, cantidad o daños"
          color={SCM_COLOR} accion="Nueva devolución" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Abiertas" valor={abiertas.length} color="#D97706" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Valor devuelto" valor={cop(devuelto)} color={SCM_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Valor recuperado" valor={cop(recuperado)} color="#15803D" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Tasa de recuperación" valor={devuelto ? `${((recuperado / devuelto) * 100).toFixed(0)}%` : '—'} color="#0369A1" /></Grid>
        </Grid>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          {crud.isLoading && <LinearProgress />}
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Número</TableCell><TableCell>Proveedor / orden</TableCell><TableCell>Motivo</TableCell><TableCell>Fecha</TableCell>
              <TableCell align="right">Valor</TableCell><TableCell align="right">Recuperado</TableCell><TableCell>Estado</TableCell><TableCell />
            </TableRow></TableHead>
            <TableBody>
              {!crud.isLoading && lista.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin devoluciones</TableCell></TableRow>}
              {lista.map(d => {
                const e = ESTADOS[d.estado] ?? { l: d.estado, c: '#6B7280' }
                const cerrada = ['CERRADA', 'RECHAZADA'].includes(d.estado)
                return (
                  <TableRow key={d.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{d.numero}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}><b>{d.proveedor ?? '—'}</b><Typography fontSize={11} color="text.secondary">{d.orden_numero}</Typography></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{MOTIVOS.find(m => m[0] === d.motivo)?.[1] ?? d.motivo}
                      {d.descripcion && <Typography fontSize={11} color="text.secondary" noWrap sx={{ maxWidth: 260 }}>{d.descripcion}</Typography>}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmtFecha(d.fecha)}</TableCell>
                    <TableCell align="right" sx={{ fontSize: 12 }}>{cop(d.valor)}</TableCell>
                    <TableCell align="right" sx={{ fontSize: 12 }}>{cop(d.valor_recuperado)}</TableCell>
                    <TableCell><Chip size="small" label={e.l} sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(e.c, 0.12), color: e.c }} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {!cerrada && <Tooltip title="Registrar respuesta / cambiar estado"><IconButton size="small" aria-label={`Gestionar ${d.numero}`}
                        onClick={() => { setFr({ estado: d.estado === 'PENDIENTE' ? 'EN_PROCESO' : d.estado, resolucion: d.resolucion ?? '', valor_recuperado: d.valor_recuperado != null ? String(d.valor_recuperado) : '' }); setResolver(d) }}>
                        <Gavel fontSize="small" /></IconButton></Tooltip>}
                      {!cerrada && <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${d.numero}`} onClick={() => setDlg({ abierto: true, r: d })}><Edit fontSize="small" /></IconButton></Tooltip>}
                      <Tooltip title="Retirar"><IconButton size="small" aria-label={`Retirar ${d.numero}`} onClick={() => { if (window.confirm(`¿Retirar ${d.numero}?`)) crud.retirar.mutate(d.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Paper>

        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Devolución ${dlg.r.numero}` : 'Nueva devolución'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ fecha: hoy(), motivo: 'DEFECTO_CALIDAD' }} onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />

        <Dialog open={!!resolver} onClose={() => setResolver(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Gestionar {resolver?.numero}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Estado" fullWidth size="small" value={fr.estado} onChange={e => setFr({ ...fr, estado: e.target.value })}>
                  {Object.entries(ESTADOS).filter(([k]) => k !== 'PENDIENTE').map(([k, v]) => <MenuItem key={k} value={k}>{v.l}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Valor recuperado" type="number" fullWidth size="small" value={fr.valor_recuperado} onChange={e => setFr({ ...fr, valor_recuperado: e.target.value })}
                  error={fr.valor_recuperado !== '' && (Number(fr.valor_recuperado) < 0 || (resolver?.valor != null && Number(fr.valor_recuperado) > resolver.valor))}
                  helperText={resolver?.valor != null ? `Máximo ${cop(resolver.valor)}` : undefined} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Respuesta del proveedor" required={exigeResolucion} fullWidth size="small" multiline minRows={3} value={fr.resolucion}
                  onChange={e => setFr({ ...fr, resolucion: e.target.value })} helperText="Nota crédito, reposición, rechazo y su motivo…" />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResolver(null)}>Cancelar</Button>
            <Button variant="contained" disabled={(exigeResolucion && !fr.resolucion.trim()) || cambiar.isPending} onClick={() => cambiar.mutate()} sx={{ bgcolor: SCM_COLOR }}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
