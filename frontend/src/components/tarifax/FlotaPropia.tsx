/**
 * Costo de flota propia: lo que le cuesta a la empresa hacer cada ruta con sus
 * vehículos (km × costo por kilómetro de la tipología, más un sobrecosto si
 * el destino queda lejos de las sedes), frente a la tarifa del cliente y a SICETAC.
 * El cálculo lo hace el servidor (`/tarifax/comparativo/tablero` → `flota`).
 */
import { useEffect, useState } from 'react'
import {
  Box, Paper, Typography, Button, Stack, TextField, Alert, Table, TableHead, TableRow, TableCell, TableBody,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions, Chip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { LocalShipping } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { errorApi } from '@/components/comun/Registro'

const BASE = '/tarifax/comparativo'
const pesos = (v?: number | null) => v == null ? '—' : v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const num = (v?: number | null) => v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: 0 })
const pct = (v?: number | null) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`
const millones = (v?: number | null) => v == null ? '—' : `$ ${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`

export interface FilaFlota {
  cliente: string; servicio: string | null; origen: string; destino: string; tipo_tarifa: string | null; categoria: string
  km: number; cpk: number; costo_ruta: number; con_sobrecosto: boolean; sobrecosto: number; costo_total: number
  tarifa: number; rentabilidad: number; margen: number; sicetac: number | null; vs_sicetac: number | null
}
export interface Flota {
  configurado: boolean; total: number; sin_cpk: string[]; sin_km: number; sedes: string[]; radio_km: number; sobrecosto_pct: number
  resumen: null | { rutas: number; tarifa_total: number; costo_total: number; rentabilidad: number; margen: number | null; con_perdida: number; con_sobrecosto: number; vs_sicetac: number | null }
  por_cliente: { cliente: string; rutas: number; tarifa_total: number; costo_total: number; rentabilidad: number; margen: number | null }[]
  detalle: FilaFlota[]
}
export interface FlotaConfig { cpk: Record<string, number>; sedes: string[]; radio_km: number; sobrecosto_pct: number; categorias: string[] }

/** Filas para el Excel, con los mismos nombres de columna de la tabla. */
export const filasExcelFlota = (f: Flota | null | undefined) => (f?.detalle ?? []).map(r => ({
  Cliente: r.cliente, 'Tipo de servicio': r.servicio, 'Tipo de tarifa': r.tipo_tarifa, Origen: r.origen, Destino: r.destino,
  'Tipo de vehículo': r.categoria, Km: r.km, 'CPK': r.cpk, 'Costo ruta': r.costo_ruta, Sobrecosto: r.sobrecosto,
  'Costo total de ruta': r.costo_total, 'Tarifa cliente': r.tarifa, Rentabilidad: r.rentabilidad, 'Margen %': r.margen,
  SICETAC: r.sicetac, 'Costo total vs SICETAC %': r.vs_sicetac,
}))

/** Texto de color neutro con el signo como apoyo: ganancia o pérdida se lee en la cifra, no solo en el color. */
function Signo({ v, sufijo = '' }: { v: number | null; sufijo?: string }) {
  if (v == null) return <>—</>
  return <Typography component="span" fontSize={12} fontWeight={700} color={v < 0 ? 'error.main' : 'text.primary'}>{sufijo === '%' ? pct(v) : pesos(v)}</Typography>
}

function Cifra({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: '100%' }}>
      <Typography fontSize={12} color="text.secondary">{titulo}</Typography>
      <Typography fontSize={22} fontWeight={800} lineHeight={1.25}>{valor}</Typography>
      {sub && <Typography fontSize={12} color="text.secondary">{sub}</Typography>}
    </Paper>
  )
}

export function TablaFlota({ flota, onConfigurar }: { flota: Flota | null | undefined; onConfigurar: () => void }) {
  const [pagina, setPagina] = useState(0)
  useEffect(() => setPagina(0), [flota])
  if (!flota?.configurado) return (
    <Alert severity="info" sx={{ m: 2 }} action={<Button size="small" onClick={onConfigurar}>Configurar</Button>}>
      Defina el costo por kilómetro (CPK) de cada tipología de vehículo para calcular lo que cuesta hacer cada ruta con flota propia
      y compararlo con la tarifa del cliente y con SICETAC.
    </Alert>
  )
  const r = flota.resumen
  return (
    <Box>
      <Alert severity="info" sx={{ m: 2 }} action={<Button size="small" onClick={onConfigurar}>Configurar</Button>}>
        Costo de la ruta = km × CPK. Sobrecosto = {num(flota.sobrecosto_pct)} % del costo de la ruta cuando el destino no es {flota.sedes.join(' ni ') || '—'}
        {' '}ni queda a {num(flota.radio_km)} km o menos de {flota.sedes.length > 1 ? 'alguna de ellas' : 'ella'}. Costo total de ruta = costo de la ruta + sobrecosto;
        la rentabilidad es la tarifa del cliente menos ese costo total. Los km salen del SICETAC más reciente.
      </Alert>
      {(flota.sin_cpk.length > 0 || flota.sin_km > 0) && <Alert severity="warning" sx={{ mx: 2, mb: 2 }}>
        {flota.sin_cpk.length > 0 && <>Sin CPK definido (no se calculan): {flota.sin_cpk.join(', ')}. </>}
        {flota.sin_km > 0 && <>{num(flota.sin_km)} tarifas tienen una ruta que SICETAC no publica, así que no se conoce su distancia.</>}
      </Alert>}
      {r && <Grid container spacing={1.5} sx={{ px: 2, mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}><Cifra titulo="Margen sobre la tarifa" valor={pct(r.margen)} sub={`${millones(r.rentabilidad)} de rentabilidad`} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra titulo="Costo total de ruta" valor={millones(r.costo_total)} sub={`frente a ${millones(r.tarifa_total)} cobrado`} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra titulo="Rutas con pérdida" valor={num(r.con_perdida)} sub={`de ${num(r.rutas)} · ${num(r.con_sobrecosto)} con sobrecosto`} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Cifra titulo="Flota propia vs SICETAC" valor={pct(r.vs_sicetac)} sub="costo total frente a SICETAC de las mismas rutas" /></Grid>
      </Grid>}
      {flota.por_cliente.length > 0 && <Box sx={{ px: 2, mb: 2 }}>
        <Typography fontWeight={700} fontSize={14} mb={0.5}>Por cliente</Typography>
        <Box sx={{ overflowX: 'auto', maxHeight: 260 }}>
          <Table size="small" stickyHeader>
            <TableHead><TableRow>{['Cliente', 'Rutas', 'Tarifa cliente', 'Costo total de ruta', 'Rentabilidad', 'Margen'].map((h, i) =>
              <TableCell key={h} align={i ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {flota.por_cliente.map(c => (
                <TableRow key={c.cliente} hover>
                  <TableCell sx={{ fontSize: 12 }}>{c.cliente}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12 }}>{num(c.rutas)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(c.tarifa_total)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(c.costo_total)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Signo v={c.rentabilidad} /></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Signo v={c.margen} sufijo="%" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Box>}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ '& td, & th': { px: 1 } }}>
          <TableHead><TableRow>
            {['Cliente', 'Ruta', 'Vehículo', 'Km', 'CPK', 'Costo ruta', 'Sobrecosto', 'Costo total de ruta', 'Tarifa cliente', 'Rentabilidad', 'Margen', 'SICETAC', 'Costo vs SICETAC'].map((h, i) =>
              <TableCell key={h} align={i >= 3 ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</TableCell>)}
          </TableRow></TableHead>
          <TableBody>
            {flota.detalle.slice(pagina * 25, pagina * 25 + 25).map((f, i) => (
              <TableRow key={i} hover>
                <TableCell sx={{ fontSize: 12, maxWidth: 170 }}><Typography fontSize={12} noWrap title={f.cliente}>{f.cliente}</Typography></TableCell>
                <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{f.origen} → {f.destino}</TableCell>
                <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }} title={f.tipo_tarifa ?? ''}>{f.categoria}</TableCell>
                <TableCell align="right" sx={{ fontSize: 12 }}>{num(f.km)}</TableCell>
                <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(f.cpk)}</TableCell>
                <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(f.costo_ruta)}</TableCell>
                <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{f.con_sobrecosto ? pesos(f.sobrecosto) : <Typography component="span" fontSize={12} color="text.secondary">—</Typography>}</TableCell>
                <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap', fontWeight: 700 }}>{pesos(f.costo_total)}</TableCell>
                <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(f.tarifa)}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Signo v={f.rentabilidad} /></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Signo v={f.margen} sufijo="%" /></TableCell>
                <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(f.sicetac)}</TableCell>
                <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pct(f.vs_sicetac)}</TableCell>
              </TableRow>
            ))}
            {!flota.detalle.length && <TableRow><TableCell colSpan={13} align="center" sx={{ py: 4, color: 'text.secondary' }}>Ninguna ruta con CPK y distancia para estos filtros.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Box>
      <TablePagination component="div" count={flota.detalle.length} page={pagina} onPageChange={(_, p) => setPagina(p)}
        rowsPerPage={25} rowsPerPageOptions={[25]} labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />
    </Box>
  )
}

/** Resumen para la sección de cargue: el CPK de cada tipología. */
export function ResumenFlota({ config, onEditar }: { config: FlotaConfig | undefined; onEditar: () => void }) {
  const cpk = Object.entries(config?.cpk ?? {})
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'center' }} mb={1.25}>
        <Box flex={1}>
          <Typography fontWeight={700}><LocalShipping sx={{ fontSize: 18, verticalAlign: 'text-bottom', mr: 0.5 }} />Costo flota propia</Typography>
          <Typography fontSize={13} color="text.secondary">
            Costo por kilómetro (CPK) de cada tipología y la regla del sobrecosto: {num(config?.sobrecosto_pct)} % si el destino no es {(config?.sedes ?? []).join(' ni ') || '—'} ni queda a {num(config?.radio_km)} km o menos.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<LocalShipping />} onClick={onEditar}>Configurar costo flota</Button>
      </Stack>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {cpk.map(([k, v]) => <Chip key={k} size="small" variant="outlined" label={`${k}: ${pesos(v)}/km`} />)}
        {!cpk.length && <Typography fontSize={12} color="text.secondary">Sin CPK definido todavía.</Typography>}
      </Stack>
    </Paper>
  )
}

export function DialogoFlota({ abierto, onCerrar, onGuardado, color }: { abierto: boolean; onCerrar: () => void; onGuardado: () => void; color: string }) {
  const [cfg, setCfg] = useState<FlotaConfig | null>(null)
  const [cpk, setCpk] = useState<Record<string, string>>({})
  const [sedes, setSedes] = useState('')
  const [radio, setRadio] = useState('50')
  const [pctSobre, setPctSobre] = useState('50')
  const [guardando, setGuardando] = useState(false)
  useEffect(() => {
    if (!abierto) return
    api.get(`${BASE}/flota`).then(r => {
      const d: FlotaConfig = r.data
      setCfg(d)
      setCpk(Object.fromEntries(Object.entries(d.cpk).map(([k, v]) => [k, String(v)])))
      setSedes(d.sedes.join(', ')); setRadio(String(d.radio_km)); setPctSobre(String(d.sobrecosto_pct))
    }).catch(e => toast.error(errorApi(e)))
  }, [abierto])
  const tipos = Array.from(new Set([...(cfg?.categorias ?? []), ...Object.keys(cpk)])).sort()
  const guardar = async () => {
    setGuardando(true)
    try {
      await api.put(`${BASE}/flota`, {
        cpk: Object.fromEntries(Object.entries(cpk).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])),
        sedes: sedes.split(',').map(x => x.trim()).filter(Boolean), radio_km: Number(radio) || 0, sobrecosto_pct: Number(pctSobre) || 0,
      })
      toast.success('Costo de flota propia guardado')
      onGuardado(); onCerrar()
    } catch (e) { toast.error(errorApi(e)) } finally { setGuardando(false) }
  }
  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle>Costo flota propia</DialogTitle>
      <DialogContent>
        <Typography fontSize={13} color="text.secondary" mb={2}>
          Costo por kilómetro (CPK) de cada tipología de vehículo de las tarifas de clientes. El costo de la ruta es km × CPK.
        </Typography>
        {tipos.map(t => (
          <TextField key={t} fullWidth size="small" type="number" sx={{ mb: 1.5 }} label={`CPK ${t}`}
            value={cpk[t] ?? ''} inputProps={{ min: 0, step: 100 }}
            InputProps={{ startAdornment: <Typography color="text.secondary" mr={1}>$</Typography>, endAdornment: <Typography color="text.secondary" ml={1}>/km</Typography> }}
            onChange={ev => setCpk(v => ({ ...v, [t]: ev.target.value }))} />
        ))}
        {!tipos.length && <Typography color="text.secondary" mb={2}>Cargue primero las negociaciones para ver las tipologías.</Typography>}
        <Typography fontWeight={700} fontSize={14} mt={1} mb={1}>Sobrecosto por destino lejano</Typography>
        <TextField fullWidth size="small" sx={{ mb: 1.5 }} label="Sedes (separadas por coma)" value={sedes} onChange={ev => setSedes(ev.target.value)}
          helperText="Destinos sin sobrecosto, igual que los que quedan dentro del radio de alguna sede." />
        <Stack direction="row" gap={1.5}>
          <TextField size="small" type="number" label="Radio sin sobrecosto" value={radio} onChange={ev => setRadio(ev.target.value)}
            InputProps={{ endAdornment: <Typography color="text.secondary" ml={1}>km</Typography> }} sx={{ flex: 1 }} />
          <TextField size="small" type="number" label="Sobrecosto" value={pctSobre} onChange={ev => setPctSobre(ev.target.value)}
            InputProps={{ endAdornment: <Typography color="text.secondary" ml={1}>%</Typography> }} sx={{ flex: 1 }}
            helperText="del costo de la ruta" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar}>Cancelar</Button>
        <Button variant="contained" disabled={guardando} onClick={guardar} sx={{ bgcolor: color }}>Guardar</Button>
      </DialogActions>
    </Dialog>
  )
}
