/**
 * SST · Elementos de protección personal
 *
 * Era una maqueta: cinco entregas escritas a mano y un «Registrar» que solo
 * ampliaba la lista en memoria. Ahora las entregas se guardan, se corrigen y
 * se reciben de vuelta. Si un EPP está vencido lo calcula el servidor con la
 * fecha de vencimiento; uno devuelto ya no cuenta.
 */
import { useState } from 'react'
import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton, Tooltip, LinearProgress, MenuItem, TextField, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { SafetyDivider, Edit, DeleteForever, AssignmentReturn, Search } from '@mui/icons-material'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { sstApi, type EntregaEPP } from '@/api/sst'
import { FormularioRegistro, useCrud, Cifra, Encabezado, fmtFecha, errorApi, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SST_COLOR = COLOR_MODULO
const TIPOS_EPP: [string, string][] = [['CABEZA', 'Cabeza (casco)'], ['OJOS_CARA', 'Ojos y cara'], ['AUDITIVO', 'Auditivo'],
  ['RESPIRATORIO', 'Respiratorio'], ['MANOS', 'Manos (guantes)'], ['PIES', 'Pies (botas)'], ['CUERPO', 'Cuerpo (overol, chaleco)'], ['CAIDAS', 'Protección contra caídas']]
const hoy = () => new Date().toISOString().slice(0, 10)

const CAMPOS: Campo[] = [
  { clave: 'trabajador', etiqueta: 'Trabajador', obligatorio: true, ancho: 6 },
  { clave: 'cargo', etiqueta: 'Cargo', ancho: 6 },
  { clave: 'area', etiqueta: 'Área', ancho: 6 },
  { clave: 'tipo_epp', etiqueta: 'Tipo de EPP', tipo: 'seleccion', opciones: TIPOS_EPP, obligatorio: true, ancho: 6 },
  { clave: 'descripcion_epp', etiqueta: 'Descripción (referencia, talla)', ancho: 8 },
  { clave: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero', min: 1, obligatorio: true, ancho: 4 },
  { clave: 'fecha_entrega', etiqueta: 'Fecha de entrega', tipo: 'fecha', obligatorio: true, ancho: 6 },
  { clave: 'fecha_vencimiento', etiqueta: 'Vence', tipo: 'fecha', ancho: 6,
    validar: (v, f) => (v && f.fecha_entrega && v < f.fecha_entrega ? 'Antes de la entrega' : null) },
  { clave: 'firma_recibido', etiqueta: 'El trabajador firmó el recibido', tipo: 'interruptor' },
]

export default function SSTEPP() {
  const crud = useCrud(['sst-epp'], sstApi.epp, 'Entrega', [['sst-tablero'], ['sst-indicadores']], true)
  const [dlg, setDlg] = useState<{ abierto: boolean; r: EntregaEPP | null }>({ abierto: false, r: null })
  const [tipo, setTipo] = useState('')
  const [buscar, setBuscar] = useState('')
  const devolver = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo?: string }) => sstApi.epp.devolver(id, motivo),
    onSuccess: () => { toast.success('Devolución registrada'); crud.refrescar() },
    onError: (e: any) => toast.error(errorApi(e)),
  })
  const lista = crud.datos
  const activos = lista.filter(e => !e.devuelto)
  const en30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const porVencer = activos.filter(e => !e.vencido && e.fecha_vencimiento && e.fecha_vencimiento <= en30)
  const visibles = lista.filter(e => (!tipo || e.tipo_epp === tipo) && (!buscar || e.trabajador.toLowerCase().includes(buscar.toLowerCase())))

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<SafetyDivider sx={{ fontSize: 28 }} />} titulo="Elementos de protección personal" subtitulo="SST · Entregas, vencimientos y devoluciones"
          color={SST_COLOR} accion="Registrar entrega" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Entregas activas" valor={activos.length} color={SST_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Vencidos sin reponer" valor={activos.filter(e => e.vencido).length} color="#DC2626" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Vencen en 30 días" valor={porVencer.length} color="#D97706" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Sin firma de recibido" valor={activos.filter(e => !e.firma_recibido).length} color="#6B7280" /></Grid>
        </Grid>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <TextField size="small" placeholder="Buscar trabajador" value={buscar} onChange={e => setBuscar(e.target.value)}
            InputProps={{ startAdornment: <Search sx={{ fontSize: 18, mr: 0.5, color: 'text.disabled' }} /> }} />
          <TextField select size="small" label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="">Todos</MenuItem>{TIPOS_EPP.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>
        </Box>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          {crud.isLoading && <LinearProgress />}
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Número</TableCell><TableCell>Trabajador</TableCell><TableCell>EPP</TableCell><TableCell align="right">Cant.</TableCell>
              <TableCell>Entregado</TableCell><TableCell>Vence</TableCell><TableCell>Firma</TableCell><TableCell>Estado</TableCell><TableCell />
            </TableRow></TableHead>
            <TableBody>
              {!crud.isLoading && visibles.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin entregas registradas</TableCell></TableRow>}
              {visibles.map(e => {
                const est = e.devuelto ? { l: 'Devuelto', c: '#6B7280' } : e.vencido ? { l: 'Vencido', c: '#DC2626' } : porVencer.includes(e) ? { l: 'Por vencer', c: '#D97706' } : { l: 'Vigente', c: '#15803D' }
                return (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{e.numero}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}><b>{e.trabajador}</b>{e.cargo && <Box component="span" sx={{ color: 'text.secondary' }}> · {e.cargo}</Box>}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{TIPOS_EPP.find(t => t[0] === e.tipo_epp)?.[1]}{e.descripcion_epp ? ` — ${e.descripcion_epp}` : ''}</TableCell>
                    <TableCell align="right">{e.cantidad}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmtFecha(e.fecha_entrega)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmtFecha(e.fecha_vencimiento)}</TableCell>
                    <TableCell>{e.firma_recibido ? <Chip size="small" label="Sí" color="success" variant="outlined" /> : <Chip size="small" label="No" variant="outlined" />}</TableCell>
                    <TableCell><Chip size="small" label={est.l} sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(est.c, 0.12), color: est.c }} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {!e.devuelto && <Tooltip title="Registrar devolución"><IconButton size="small" aria-label={`Devolver ${e.numero}`}
                        onClick={() => { const m = window.prompt('Motivo de la devolución (desgaste, cambio de cargo, retiro…)'); if (m !== null) devolver.mutate({ id: e.id, motivo: m }) }}>
                        <AssignmentReturn fontSize="small" /></IconButton></Tooltip>}
                      <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${e.numero}`} onClick={() => setDlg({ abierto: true, r: e })}><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Retirar"><IconButton size="small" aria-label={`Retirar ${e.numero}`} onClick={() => { if (window.confirm(`¿Retirar ${e.numero}?`)) crud.retirar.mutate(e.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Paper>
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Entrega ${dlg.r.numero}` : 'Registrar entrega de EPP'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ cantidad: '1', fecha_entrega: hoy(), tipo_epp: 'CUERPO' }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
