/**
 * Inventario del CMMS — existencias, kárdex, ajustes, traslados y rotación.
 *
 * Antes eran 1.180 líneas sobre datos escritos en el código. Ahora todo sale de
 * `/eam/inventario`.
 *
 * Las cantidades no se editan a mano en ninguna parte: se mueven con entradas,
 * salidas, ajustes y traslados, y cada una deja kárdex. Un campo «cantidad»
 * editable convertiría el inventario en un número que alguien cambia sin que
 * quede por qué.
 */
import { useMemo, useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, Chip, Alert, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Switch,
  FormControlLabel, Tabs, Tab, Divider, InputAdornment,
} from '@mui/material'
import {
  Add, Search, Inventory2, WarningAmber, SwapHoriz, Tune, Download,
  Warehouse, Refresh, DeleteOutline,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { apiClient as api } from '@/api/client'
import { descargarExcel, descargarLibro, hoja } from '@/utils/excel'

import { mensajeDeError } from '@/utils/errorApi'
const R = '/eam/inventario'


const pesos = (v?: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

const numero = (v?: number | null, d = 2) =>
  v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: d })

const fecha = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric' }) : '—'

interface Bodega {
  id: number; codigo: string; nombre: string
  pais_id?: number | null; ciudad_id?: number | null
  pais?: string | null; ciudad?: string | null; departamento?: string | null
  direccion?: string | null; responsable?: string | null; telefono?: string | null
  por_defecto: boolean; referencias?: number; valor?: number
}

interface Existencia {
  repuesto_id: number; codigo: string; nombre: string
  categoria?: string | null; unidad?: string | null
  bodega_id: number; bodega: string
  cantidad: number; costo_promedio: number; valor: number
  stock_minimo?: number | null; stock_maximo?: number | null
  ubicacion?: string | null; ultimo_movimiento?: string | null
  bajo_minimo: boolean; negativo: boolean
}

interface Movimiento {
  id: number; fecha: string; tipo: string; tipo_label?: string; signo?: number
  codigo?: string; repuesto?: string; bodega?: string
  cantidad: number; costo_unitario: number; costo_total: number
  saldo_cantidad?: number | null
  ot_numero?: string | null; motivo?: string | null
  documento?: string | null; proveedor?: string | null
  observaciones?: string | null; registrado_por?: string | null
}

interface FilaRotacion {
  repuesto_id: number; codigo: string; nombre: string; categoria?: string | null
  existencia: number; valor: number; salidas: number; valor_salidas: number
  movimientos: number; consumo_mensual: number
  rotacion: number | null; meses_stock: number | null
  dias_sin_movimiento: number | null; dormido: boolean
}

export default function EAMInventario() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [bodegaFiltro, setBodegaFiltro] = useState<number | ''>('')
  const [movimiento, setMovimiento] = useState<string | null>(null)
  const [traslado, setTraslado] = useState(false)

  const { data: bodegas = [] } = useQuery<Bodega[]>({
    queryKey: ['inv-bodegas'], queryFn: () => api.get(`${R}/bodegas`).then(r => r.data) })
  const { data: existencias = [], isLoading } = useQuery<Existencia[]>({
    queryKey: ['inv-existencias', bodegaFiltro, busqueda],
    queryFn: () => api.get(`${R}/existencias`, {
      params: { bodega_id: bodegaFiltro || undefined, buscar: busqueda || undefined },
    }).then(r => r.data) })
  const { data: movimientos = [] } = useQuery<Movimiento[]>({
    queryKey: ['inv-movimientos', bodegaFiltro],
    queryFn: () => api.get(`${R}/movimientos`, {
      params: { bodega_id: bodegaFiltro || undefined } }).then(r => r.data) })
  const { data: resumen } = useQuery<any>({
    queryKey: ['inv-resumen'], queryFn: () => api.get(`${R}/resumen`).then(r => r.data) })
  const { data: rotacion } = useQuery<any>({
    queryKey: ['inv-rotacion', bodegaFiltro],
    queryFn: () => api.get(`${R}/rotacion`, {
      params: { bodega_id: bodegaFiltro || undefined } }).then(r => r.data) })

  const refrescar = () => {
    for (const k of ['inv-existencias', 'inv-movimientos', 'inv-resumen',
                     'inv-rotacion', 'inv-bodegas']) {
      qc.invalidateQueries({ queryKey: [k] })
    }
  }

  const alertas = existencias.filter(e => e.negativo || e.bajo_minimo)

  const bajarExistencias = () => descargarExcel('inventario_existencias', existencias, [
    { titulo: 'Código', valor: 'codigo' },
    { titulo: 'Repuesto', valor: 'nombre' },
    { titulo: 'Categoría', valor: 'categoria' },
    { titulo: 'Bodega', valor: 'bodega' },
    { titulo: 'Ubicación', valor: 'ubicacion' },
    { titulo: 'Unidad', valor: 'unidad' },
    { titulo: 'Cantidad', valor: 'cantidad' },
    { titulo: 'Costo promedio', valor: 'costo_promedio' },
    { titulo: 'Valor', valor: 'valor' },
    { titulo: 'Stock mínimo', valor: 'stock_minimo' },
    { titulo: 'Estado', valor: e => e.negativo ? 'Negativo'
        : e.bajo_minimo ? 'Bajo mínimo' : 'Normal' },
    { titulo: 'Último movimiento', valor: 'ultimo_movimiento' },
  ], 'Existencias')

  const bajarKardex = () => descargarExcel('inventario_kardex', movimientos, [
    { titulo: 'Fecha', valor: 'fecha' },
    { titulo: 'Movimiento', valor: 'tipo_label' },
    { titulo: 'Código', valor: 'codigo' },
    { titulo: 'Repuesto', valor: 'repuesto' },
    { titulo: 'Bodega', valor: 'bodega' },
    { titulo: 'Entrada', valor: m => (m.signo ?? 0) > 0 ? m.cantidad : '' },
    { titulo: 'Salida', valor: m => (m.signo ?? 0) < 0 ? m.cantidad : '' },
    { titulo: 'Saldo', valor: 'saldo_cantidad' },
    { titulo: 'Costo unitario', valor: 'costo_unitario' },
    { titulo: 'Costo total', valor: 'costo_total' },
    { titulo: 'Orden', valor: 'ot_numero' },
    { titulo: 'Motivo', valor: 'motivo' },
    { titulo: 'Documento', valor: 'documento' },
    { titulo: 'Proveedor', valor: 'proveedor' },
    { titulo: 'Registró', valor: 'registrado_por' },
  ], 'Kárdex')

  const bajarRotacion = () => {
    if (!rotacion) return
    descargarLibro('inventario_rotacion', [
      { titulo: 'Rotación', ws: hoja<FilaRotacion>(rotacion.filas, [
        { titulo: 'Código', valor: 'codigo' },
        { titulo: 'Repuesto', valor: 'nombre' },
        { titulo: 'Categoría', valor: 'categoria' },
        { titulo: 'Existencia', valor: 'existencia' },
        { titulo: 'Valor', valor: 'valor' },
        { titulo: 'Salidas del periodo', valor: 'salidas' },
        { titulo: 'Valor salidas', valor: 'valor_salidas' },
        { titulo: 'Consumo mensual', valor: 'consumo_mensual' },
        { titulo: 'Rotación', valor: 'rotacion' },
        { titulo: 'Meses de stock', valor: 'meses_stock' },
        { titulo: 'Días sin movimiento', valor: 'dias_sin_movimiento' },
        { titulo: 'Estado', valor: f => f.dormido ? 'Dormido' : 'Con movimiento' },
      ]) },
      { titulo: 'Existencias', ws: hoja<Existencia>(existencias, [
        { titulo: 'Código', valor: 'codigo' },
        { titulo: 'Repuesto', valor: 'nombre' },
        { titulo: 'Bodega', valor: 'bodega' },
        { titulo: 'Cantidad', valor: 'cantidad' },
        { titulo: 'Costo promedio', valor: 'costo_promedio' },
        { titulo: 'Valor', valor: 'valor' },
      ]) },
    ])
  }

  return (
    <Layout title="Inventario">
      <Box className="anim-page-in">
        <Stack direction="row" alignItems="flex-start" spacing={2} mb={2.5} flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1, minWidth: 250 }}>
            <Typography variant="h6" fontWeight={800}>Inventario de repuestos</Typography>
            <Typography variant="caption" color="text.secondary">
              Existencias por bodega, kárdex y rotación. Las órdenes de trabajo descuentan solas.
            </Typography>
          </Box>
          <Button startIcon={<SwapHoriz />} variant="outlined" onClick={() => setTraslado(true)}
            disabled={bodegas.length < 2} sx={{ textTransform: 'none' }}>
            Trasladar
          </Button>
          <Button startIcon={<Tune />} variant="outlined" onClick={() => setMovimiento('AJUSTE_SALIDA')}
            disabled={bodegas.length === 0} sx={{ textTransform: 'none' }}>
            Ajustar
          </Button>
          <Button startIcon={<Add />} variant="contained" onClick={() => setMovimiento('ENTRADA')}
            disabled={bodegas.length === 0} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Registrar entrada
          </Button>
        </Stack>

        {bodegas.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }} action={
            <Button size="small" onClick={() => setTab(3)}>Crear bodega</Button>
          }>
            No hay bodegas. Sin al menos una, no hay dónde registrar existencias ni de dónde
            puedan descontar las órdenes de trabajo.
          </Alert>
        )}

        {alertas.length > 0 && (
          <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}>
            {alertas.filter(a => a.negativo).length > 0 && (
              <>{alertas.filter(a => a.negativo).length} existencias en negativo (salió más de
              lo que había: hay algo que conciliar). </>
            )}
            {alertas.filter(a => a.bajo_minimo && !a.negativo).length > 0 && (
              <>{alertas.filter(a => a.bajo_minimo && !a.negativo).length} por debajo del mínimo.</>
            )}
          </Alert>
        )}

        {resumen && (
          <Card sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
            <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap
              divider={<Divider orientation="vertical" flexItem />}>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <Typography variant="caption" color="text.secondary">Valor del inventario</Typography>
                <Typography variant="h6" fontWeight={800}>{pesos(resumen.valor_inventario)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {resumen.referencias} referencias
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 140 }}>
                <Typography variant="caption" color="text.secondary">Entradas del periodo</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: ESTADO.exito }}>
                  {pesos(resumen.entradas_valor)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 140 }}>
                <Typography variant="caption" color="text.secondary">Salidas del periodo</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: ESTADO.alerta }}>
                  {pesos(resumen.salidas_valor)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 140 }}>
                <Typography variant="caption" color="text.secondary">Requieren atención</Typography>
                <Typography variant="h6" fontWeight={800} sx={{
                  color: (resumen.existencias_negativas + resumen.bajo_minimo) > 0
                    ? ESTADO.peligro : ESTADO.exito }}>
                  {resumen.existencias_negativas + resumen.bajo_minimo}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {resumen.existencias_negativas} negativas · {resumen.bajo_minimo} bajo mínimo
                </Typography>
              </Box>
            </Stack>
          </Card>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 2.5, borderBottom: `1px solid ${PALETA.niebla}` }}>
          <Tab label={`Existencias (${existencias.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Entradas y salidas" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Rotación" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label={`Bodegas (${bodegas.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>

        {tab < 3 && (
          <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
            {tab === 0 && (
              <TextField size="small" placeholder="Buscar repuesto…" value={busqueda}
                onChange={e => setBusqueda(e.target.value)} sx={{ width: 260 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
            )}
            <TextField select size="small" label="Bodega" value={bodegaFiltro} sx={{ width: 200 }}
              onChange={e => setBodegaFiltro(Number(e.target.value) || '')}>
              <MenuItem value="">Todas</MenuItem>
              {bodegas.map(b => <MenuItem key={b.id} value={b.id}>{b.nombre}</MenuItem>)}
            </TextField>
            <Box sx={{ flex: 1 }} />
            {tab === 0 && (
              <Button startIcon={<Refresh />} sx={{ textTransform: 'none' }}
                onClick={() => api.post(`${R}/recalcular`).then((x: any) => {
                  refrescar()
                  toast.success(x.data.corregidas
                    ? `${x.data.corregidas} existencias corregidas contra el kárdex`
                    : 'Las existencias cuadran con el kárdex')
                })}>
                Verificar contra el kárdex
              </Button>
            )}
            <Button startIcon={<Download />} variant="outlined" sx={{ textTransform: 'none' }}
              onClick={tab === 0 ? bajarExistencias : tab === 1 ? bajarKardex : bajarRotacion}>
              Excel
            </Button>
          </Stack>
        )}

        {/* ── Existencias ───────────────────────────────────────────────── */}
        {tab === 0 && (
          isLoading ? <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} /> : (
            <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['CÓDIGO', 'REPUESTO', 'BODEGA', 'UBICACIÓN', 'CANTIDAD',
                      'COSTO PROM.', 'VALOR', 'MÍNIMO', 'ÚLT. MOVIMIENTO'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {existencias.map(e => (
                    <TableRow key={`${e.repuesto_id}-${e.bodega_id}`} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{e.codigo}</TableCell>
                      <TableCell>
                        {e.nombre}
                        {e.categoria && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {e.categoria}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{e.bodega}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: PALETA.grafito }}>
                        {e.ubicacion ?? '—'}
                      </TableCell>
                      <TableCell sx={{
                        fontVariantNumeric: 'tabular-nums', fontWeight: 800,
                        color: e.negativo ? ESTADO.peligro
                          : e.bajo_minimo ? ESTADO.alerta : 'text.primary' }}>
                        {numero(e.cantidad)} {e.unidad}
                        {e.negativo && (
                          <Tooltip title="Salió más de lo que había. El kárdex está bien; lo que falta es conciliar la diferencia.">
                            <Chip label="negativo" size="small" sx={{
                              ml: 0.5, height: 16, fontSize: 9, fontWeight: 700,
                              bgcolor: `${ESTADO.peligro}1A`, color: ESTADO.peligro }} />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {pesos(e.costo_promedio)}
                      </TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                        {pesos(e.valor)}
                      </TableCell>
                      <TableCell>{e.stock_minimo ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{fecha(e.ultimo_movimiento)}</TableCell>
                    </TableRow>
                  ))}
                  {existencias.length === 0 && (
                    <TableRow><TableCell colSpan={9} sx={{ py: 5, textAlign: 'center' }}>
                      <Inventory2 sx={{ fontSize: 36, color: PALETA.acero, opacity: 0.4 }} />
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        Sin existencias registradas.
                      </Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )
        )}

        {/* ── Kárdex ────────────────────────────────────────────────────── */}
        {tab === 1 && (
          <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['FECHA', 'MOVIMIENTO', 'REPUESTO', 'BODEGA', 'ENTRA', 'SALE',
                    'SALDO', 'COSTO', 'ORIGEN'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {movimientos.map(m => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ fontSize: 12 }}>{fecha(m.fecha)}</TableCell>
                    <TableCell>
                      <Chip label={m.tipo_label} size="small" sx={{
                        height: 19, fontSize: 10, fontWeight: 700,
                        bgcolor: `${(m.signo ?? 0) > 0 ? ESTADO.exito : ESTADO.alerta}1A`,
                        color: (m.signo ?? 0) > 0 ? ESTADO.exito : ESTADO.alerta }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {m.codigo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{m.repuesto}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{m.bodega}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums', color: ESTADO.exito }}>
                      {(m.signo ?? 0) > 0 ? numero(m.cantidad) : ''}
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums', color: ESTADO.alerta }}>
                      {(m.signo ?? 0) < 0 ? numero(m.cantidad) : ''}
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                      {numero(m.saldo_cantidad)}
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                      {pesos(m.costo_total)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {m.ot_numero ?? m.motivo ?? m.documento ?? '—'}
                      {m.registrado_por && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {m.registrado_por}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {movimientos.length === 0 && (
                  <TableRow><TableCell colSpan={9} sx={{ py: 5, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Sin movimientos registrados.
                    </Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* ── Rotación ──────────────────────────────────────────────────── */}
        {tab === 2 && rotacion && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              La rotación compara las salidas del periodo contra el inventario <b>actual</b>, no
              contra el promedio del periodo: el kárdex no guarda una foto diaria y
              reconstruirla no cambiaría la decisión. Lo que importa acá es la cola —el material
              dormido, que es plata quieta en un estante—.
              {rotacion.dormidos > 0 && (
                <> Hay <b>{rotacion.dormidos} referencias sin salidas</b> por {pesos(rotacion.valor_dormido)}.</>
              )}
            </Alert>
            <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['CÓDIGO', 'REPUESTO', 'EXISTENCIA', 'VALOR', 'SALIDAS',
                      'CONSUMO MENSUAL', 'ROTACIÓN', 'MESES DE STOCK', 'ESTADO'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rotacion.filas.map((f: FilaRotacion) => (
                    <TableRow key={f.repuesto_id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{f.codigo}</TableCell>
                      <TableCell>{f.nombre}</TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {numero(f.existencia)}
                      </TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{pesos(f.valor)}</TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{numero(f.salidas)}</TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {numero(f.consumo_mensual)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{numero(f.rotacion)}</TableCell>
                      <TableCell sx={{
                        color: f.meses_stock != null && f.meses_stock > 12
                          ? ESTADO.alerta : 'text.primary' }}>
                        {f.meses_stock != null ? numero(f.meses_stock, 1) : '—'}
                      </TableCell>
                      <TableCell>
                        {f.dormido ? (
                          <Tooltip title={f.dias_sin_movimiento
                            ? `${f.dias_sin_movimiento} días sin movimiento` : 'Sin salidas en el periodo'}>
                            <Chip label="Dormido" size="small" sx={{
                              height: 19, fontSize: 10, fontWeight: 700,
                              bgcolor: `${ESTADO.alerta}1A`, color: ESTADO.alerta }} />
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {f.movimientos} movimientos
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rotacion.filas.length === 0 && (
                    <TableRow><TableCell colSpan={9} sx={{ py: 5, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Sin movimientos en el periodo.
                      </Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </Box>
        )}

        {tab === 3 && <Bodegas />}

        {movimiento && (
          <DialogoMovimiento tipo={movimiento} bodegas={bodegas}
            onCerrar={() => setMovimiento(null)}
            onListo={() => { setMovimiento(null); refrescar() }} />
        )}
        {traslado && (
          <DialogoTraslado bodegas={bodegas} onCerrar={() => setTraslado(false)}
            onListo={() => { setTraslado(false); refrescar() }} />
        )}
      </Box>
    </Layout>
  )
}

/* ═══ Entrada, salida y ajuste ═════════════════════════════════════════════ */
function DialogoMovimiento({ tipo: tipoInicial, bodegas, onCerrar, onListo }: {
  tipo: string; bodegas: Bodega[]; onCerrar: () => void; onListo: () => void
}) {
  const [f, setF] = useState<any>({
    tipo: tipoInicial,
    bodega_id: bodegas.find(b => b.por_defecto)?.id ?? bodegas[0]?.id,
  })

  const { data: repuestos = [] } = useQuery<any[]>({
    queryKey: ['eam-repuestos'],
    queryFn: () => api.get('/eam/catalogos/repuestos').then(r => r.data) })
  const { data: motivos = [] } = useQuery<any[]>({
    queryKey: ['inv-motivos'], queryFn: () => api.get(`${R}/motivos`).then(r => r.data) })

  const esAjuste = String(f.tipo).startsWith('AJUSTE')

  const guardar = useMutation({
    mutationFn: () => api.post(`${R}/movimientos`, {
      repuesto_id: f.repuesto_id, bodega_id: f.bodega_id, tipo: f.tipo,
      cantidad: Number(f.cantidad),
      costo_unitario: f.costo_unitario === '' || f.costo_unitario == null
        ? null : Number(f.costo_unitario),
      motivo_id: f.motivo_id || null,
      documento: f.documento || null, proveedor: f.proveedor || null,
      observaciones: f.observaciones || null,
    }).then(r => r.data),
    onSuccess: (r: any) => {
      toast.success(`Saldo: ${r.saldo}${r.negativo ? ' — EN NEGATIVO' : ''}`,
        { duration: r.negativo ? 7000 : 4000 })
      onListo()
    },
    onError: (e: any) => toast.error(mensajeDeError(e), { duration: 7000 }),
  })

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {esAjuste ? 'Ajuste de inventario' : 'Movimiento de inventario'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField select size="small" label="Tipo" value={f.tipo}
            onChange={e => setF({ ...f, tipo: e.target.value })}>
            <MenuItem value="ENTRADA">Entrada (compra o recepción)</MenuItem>
            <MenuItem value="SALIDA">Salida directa</MenuItem>
            <MenuItem value="AJUSTE_ENTRADA">Ajuste positivo (sobrante)</MenuItem>
            <MenuItem value="AJUSTE_SALIDA">Ajuste negativo (faltante)</MenuItem>
          </TextField>
          <TextField select size="small" label="Repuesto" value={f.repuesto_id ?? ''}
            onChange={e => setF({ ...f, repuesto_id: Number(e.target.value) })}>
            {repuestos.map(r => (
              <MenuItem key={r.id} value={r.id}>{r.codigo} · {r.nombre}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Bodega" value={f.bodega_id ?? ''}
            onChange={e => setF({ ...f, bodega_id: Number(e.target.value) })}>
            {bodegas.map(b => <MenuItem key={b.id} value={b.id}>{b.nombre}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={1.5}>
            <TextField size="small" label="Cantidad" type="number" fullWidth
              value={f.cantidad ?? ''} onChange={e => setF({ ...f, cantidad: e.target.value })} />
            <TextField size="small" label="Costo unitario" type="number" fullWidth
              value={f.costo_unitario ?? ''}
              onChange={e => setF({ ...f, costo_unitario: e.target.value })}
              helperText={f.tipo === 'ENTRADA'
                ? 'Recalcula el promedio ponderado' : 'Vacío = sale al promedio actual'} />
          </Stack>
          {esAjuste && (
            <>
              <TextField select size="small" label="Motivo" value={f.motivo_id ?? ''}
                onChange={e => setF({ ...f, motivo_id: Number(e.target.value) || null })}>
                {motivos.map(m => <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>)}
              </TextField>
              {motivos.length === 0 && (
                <Alert severity="warning" sx={{ py: 0.25 }}>
                  No hay motivos configurados. Un ajuste sin motivo es un descuadre que nadie
                  puede explicar tres meses después; créelos en la pestaña de bodegas.
                </Alert>
              )}
            </>
          )}
          <Stack direction="row" spacing={1.5}>
            <TextField size="small" label="Documento" fullWidth value={f.documento ?? ''}
              onChange={e => setF({ ...f, documento: e.target.value })}
              helperText="Factura, remisión o acta de conteo" />
            <TextField size="small" label="Proveedor" fullWidth value={f.proveedor ?? ''}
              onChange={e => setF({ ...f, proveedor: e.target.value })} />
          </Stack>
          <TextField size="small" label="Observaciones" multiline rows={2}
            value={f.observaciones ?? ''}
            onChange={e => setF({ ...f, observaciones: e.target.value })} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained"
          disabled={!f.repuesto_id || !f.bodega_id || !f.cantidad || guardar.isPending}
          onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Registrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ═══ Traslado entre bodegas ═══════════════════════════════════════════════ */
function DialogoTraslado({ bodegas, onCerrar, onListo }: {
  bodegas: Bodega[]; onCerrar: () => void; onListo: () => void
}) {
  const [f, setF] = useState<any>({})
  const { data: repuestos = [] } = useQuery<any[]>({
    queryKey: ['eam-repuestos'],
    queryFn: () => api.get('/eam/catalogos/repuestos').then(r => r.data) })

  const guardar = useMutation({
    mutationFn: () => api.post(`${R}/traslados`, {
      repuesto_id: f.repuesto_id, bodega_origen_id: f.origen,
      bodega_destino_id: f.destino, cantidad: Number(f.cantidad),
      observaciones: f.observaciones || null }).then(r => r.data),
    onSuccess: (r: any) => {
      toast.success(`Trasladado a ${pesos(r.costo_unitario)} c/u · origen ${r.saldo_origen}, destino ${r.saldo_destino}`)
      onListo()
    },
    onError: (e: any) => toast.error(mensajeDeError(e), { duration: 7000 }),
  })

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Trasladar entre bodegas</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ py: 0.25 }}>
            El costo viaja con el material: la entrada en destino usa el promedio de origen. Si
            no, trasladar cambiaría el valor del inventario sin que haya pasado nada económico.
          </Alert>
          <TextField select size="small" label="Repuesto" value={f.repuesto_id ?? ''}
            onChange={e => setF({ ...f, repuesto_id: Number(e.target.value) })}>
            {repuestos.map(r => (
              <MenuItem key={r.id} value={r.id}>{r.codigo} · {r.nombre}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1.5}>
            <TextField select size="small" label="Desde" fullWidth value={f.origen ?? ''}
              onChange={e => setF({ ...f, origen: Number(e.target.value) })}>
              {bodegas.map(b => <MenuItem key={b.id} value={b.id}>{b.nombre}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Hacia" fullWidth value={f.destino ?? ''}
              onChange={e => setF({ ...f, destino: Number(e.target.value) })}>
              {bodegas.filter(b => b.id !== f.origen).map(b => (
                <MenuItem key={b.id} value={b.id}>{b.nombre}</MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField size="small" label="Cantidad" type="number" value={f.cantidad ?? ''}
            onChange={e => setF({ ...f, cantidad: e.target.value })} />
          <TextField size="small" label="Observaciones" value={f.observaciones ?? ''}
            onChange={e => setF({ ...f, observaciones: e.target.value })} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained"
          disabled={!f.repuesto_id || !f.origen || !f.destino || !f.cantidad}
          onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Trasladar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ═══ Bodegas y motivos ════════════════════════════════════════════════════ */
function Bodegas() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [edicion, setEdicion] = useState<Bodega | null>(null)
  const [f, setF] = useState<any>({})
  const [motivo, setMotivo] = useState('')

  const { data: bodegas = [] } = useQuery<Bodega[]>({
    queryKey: ['inv-bodegas'], queryFn: () => api.get(`${R}/bodegas`).then(r => r.data) })
  const { data: geo } = useQuery<any>({
    queryKey: ['inv-geografia'], queryFn: () => api.get(`${R}/geografia`).then(r => r.data) })
  const { data: motivos = [] } = useQuery<any[]>({
    queryKey: ['inv-motivos'], queryFn: () => api.get(`${R}/motivos`).then(r => r.data) })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['inv-bodegas'] })

  // Al escoger país, solo se ofrecen sus ciudades: es lo que impide guardar una
  // bodega en «Colombia · Lima».
  const ciudades = useMemo(() => (geo?.ciudades ?? []).filter(
    (c: any) => !f.pais_id || c.pais_id === f.pais_id), [geo, f.pais_id])

  const guardar = useMutation({
    mutationFn: () => edicion
      ? api.put(`${R}/bodegas/${edicion.id}`, f).then(r => r.data)
      : api.post(`${R}/bodegas`, f).then(r => r.data),
    onSuccess: () => { invalidar(); setAbierto(false); toast.success('Bodega guardada') },
    onError: (e: any) => toast.error(mensajeDeError(e), { duration: 7000 }),
  })

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Las bodegas se ubican en la jerarquía geográfica del <b>catálogo maestro</b> —país,
        departamento, ciudad—, la misma que usan los demás módulos. Escribir «Bogotá» a mano
        acá crearía una tercera versión de la misma ciudad y los informes por región dejarían
        de cuadrar.
      </Alert>
      <Stack direction="row" mb={2}>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<Add />}
          onClick={() => { setEdicion(null); setF({ por_defecto: bodegas.length === 0 }); setAbierto(true) }}
          sx={{ textTransform: 'none', fontWeight: 700 }}>Nueva bodega</Button>
      </Stack>
      <Card sx={{ borderRadius: 3, overflow: 'auto', mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['CÓDIGO', 'NOMBRE', 'UBICACIÓN', 'RESPONSABLE', 'REFERENCIAS',
                'VALOR', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {bodegas.map(b => (
              <TableRow key={b.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {b.codigo}
                  {b.por_defecto && (
                    <Tooltip title="Las órdenes de trabajo descuentan de acá cuando no se indica otra">
                      <Chip label="por defecto" size="small" sx={{
                        ml: 0.5, height: 16, fontSize: 9, fontWeight: 700,
                        bgcolor: `${COLOR_MODULO}1A`, color: COLOR_MODULO }} />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>{b.nombre}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {[b.pais, b.departamento, b.ciudad].filter(Boolean).join(' › ') || '—'}
                  {b.direccion && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {b.direccion}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{b.responsable ?? '—'}</TableCell>
                <TableCell>{b.referencias ?? 0}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{pesos(b.valor)}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => { setEdicion(b); setF({ ...b }); setAbierto(true) }}>
                    <Warehouse fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() =>
                    api.delete(`${R}/bodegas/${b.id}`).then(() => { invalidar(); toast.success('Desactivada') })
                      .catch((e: any) => toast.error(mensajeDeError(e), { duration: 7000 }))}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {bodegas.length === 0 && (
              <TableRow><TableCell colSpan={7} sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Sin bodegas.</Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Typography variant="subtitle2" fontWeight={800}>Motivos de ajuste</Typography>
      <Typography variant="caption" color="text.secondary">
        Tipificarlos permite ver si los faltantes vienen de conteos, de daños o de material
        prestado que no volvió.
      </Typography>
      <Stack direction="row" spacing={1.5} mt={1.5} mb={1.5}>
        <TextField size="small" label="Nuevo motivo" value={motivo} sx={{ width: 280 }}
          onChange={e => setMotivo(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && motivo.trim()) {
              api.post(`${R}/motivos`, { nombre: motivo }).then(() => {
                qc.invalidateQueries({ queryKey: ['inv-motivos'] }); setMotivo('')
              }).catch((x: any) => toast.error(mensajeDeError(x)))
            }
          }} />
        <Button startIcon={<Add />} disabled={!motivo.trim()} sx={{ textTransform: 'none' }}
          onClick={() => api.post(`${R}/motivos`, { nombre: motivo }).then(() => {
            qc.invalidateQueries({ queryKey: ['inv-motivos'] }); setMotivo('')
          }).catch((x: any) => toast.error(mensajeDeError(x)))}>
          Agregar
        </Button>
      </Stack>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {motivos.map(m => (
          <Chip key={m.id} label={m.nombre}
            onDelete={() => api.delete(`${R}/motivos/${m.id}`).then(() =>
              qc.invalidateQueries({ queryKey: ['inv-motivos'] }))} />
        ))}
      </Stack>

      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edicion ? `Editar ${edicion.codigo}` : 'Nueva bodega'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Código" value={f.codigo ?? ''} sx={{ width: 160 }}
                onChange={e => setF({ ...f, codigo: e.target.value })} />
              <TextField size="small" label="Nombre" value={f.nombre ?? ''} fullWidth
                onChange={e => setF({ ...f, nombre: e.target.value })} />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField select size="small" label="País" fullWidth value={f.pais_id ?? ''}
                onChange={e => setF({ ...f, pais_id: Number(e.target.value) || null, ciudad_id: null })}>
                <MenuItem value="">—</MenuItem>
                {(geo?.paises ?? []).map((p: any) => (
                  <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                ))}
              </TextField>
              <TextField select size="small" label="Ciudad" fullWidth value={f.ciudad_id ?? ''}
                onChange={e => setF({ ...f, ciudad_id: Number(e.target.value) || null })}
                helperText={f.pais_id ? `${ciudades.length} ciudades en ese país` : undefined}>
                <MenuItem value="">—</MenuItem>
                {ciudades.map((c: any) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre}{c.departamento ? ` · ${c.departamento}` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField size="small" label="Dirección" value={f.direccion ?? ''}
              onChange={e => setF({ ...f, direccion: e.target.value })} />
            <Stack direction="row" spacing={1.5}>
              <TextField size="small" label="Responsable" fullWidth value={f.responsable ?? ''}
                onChange={e => setF({ ...f, responsable: e.target.value })} />
              <TextField size="small" label="Teléfono" fullWidth value={f.telefono ?? ''}
                onChange={e => setF({ ...f, telefono: e.target.value })} />
            </Stack>
            <FormControlLabel label={<Box>
              <Typography variant="body2">Bodega por defecto</Typography>
              <Typography variant="caption" color="text.secondary">
                Las órdenes de trabajo descuentan de acá cuando no se indica otra. Solo una
                puede serlo.
              </Typography></Box>}
              control={<Switch checked={!!f.por_defecto}
                onChange={e => setF({ ...f, por_defecto: e.target.checked })} />} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" disabled={!f.codigo || !f.nombre}
            onClick={() => guardar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
