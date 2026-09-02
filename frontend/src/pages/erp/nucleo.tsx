/**
 * Lo que comparten las pantallas del ERP financiero.
 *
 * Va en un módulo aparte y no dentro de una página porque el núcleo contable
 * —períodos, reglas, libros— lo consultan varias pantallas, y tenerlo dos veces
 * es la razón por la que un cambio de criterio termina aplicado en una sola.
 *
 * Todas las llamadas nuevas piden `empresa_id`: la contabilidad es POR empresa y
 * un asiento en la compañía equivocada no se distingue a simple vista de uno
 * correcto. Por eso la empresa se elige explícitamente y se recuerda.
 */
import React, { useState } from 'react'
import {
  Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, Skeleton, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Tooltip, Typography, alpha,
} from '@mui/material'
import {
  CheckCircle, LockOpen, Lock, MenuBook, Rule, WarningAmber,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient } from '@/api/client'
import { COLOR_MODULO } from '@/config/marca'

export const ERP_COLOR = COLOR_MODULO

export const pesos = (v?: number | null) =>
  v == null ? '—'
    : new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0,
      }).format(v)

/** El mensaje que trae el servidor, que siempre dice qué configurar. */
export function mensajeDeError(e: any): string {
  const d = e?.response?.data?.detail
  if (typeof d === 'string') return d
  if (d?.contabilidad) return d.contabilidad
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg
  return e?.message || 'No se pudo completar la operación'
}

const hoy = () => new Date().toISOString().slice(0, 10)
const primeroDelAnio = () => `${new Date().getFullYear()}-01-01`

// ─── La empresa activa ────────────────────────────────────────────────────────

export interface EmpresaERP { id: number; nit: string; razon_social: string }

const CLAVE = 'erp.empresa'

/**
 * La empresa sobre la que se trabaja, recordada entre visitas.
 *
 * Se recuerda porque quien lleva la contabilidad de una compañía entra a la
 * misma todos los días, y volver a elegirla en cada pantalla es la clase de
 * fricción que lleva a que alguien no la cambie cuando sí debía.
 */
export function useEmpresaERP() {
  const { data: empresas = [], isLoading } = useQuery<EmpresaERP[]>({
    queryKey: ['erp-empresas'],
    queryFn: () => apiClient.get('/erp/empresas').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const [elegida, setElegida] = useState<number | null>(() => {
    const g = localStorage.getItem(CLAVE)
    return g ? Number(g) : null
  })

  // Si lo recordado ya no existe —la borraron, o es otro tenant— se cae a la
  // primera en vez de dejar la pantalla pidiendo datos de una empresa fantasma.
  const valida = elegida != null && empresas.some(e => e.id === elegida)
  const empresaId = valida ? elegida : (empresas[0]?.id ?? null)

  const elegir = (id: number) => {
    localStorage.setItem(CLAVE, String(id))
    setElegida(id)
  }

  return { empresas, empresaId, elegir, cargando: isLoading }
}

export function SelectorEmpresa({ empresas, empresaId, elegir }: {
  empresas: EmpresaERP[]; empresaId: number | null; elegir: (id: number) => void
}) {
  // Con una sola empresa el selector no decide nada y solo ocupa espacio.
  if (empresas.length <= 1) return null
  return (
    <FormControl size="small" sx={{ minWidth: 220 }}>
      <InputLabel>Empresa</InputLabel>
      <Select label="Empresa" value={empresaId ?? ''}
              onChange={e => elegir(Number(e.target.value))}>
        {empresas.map(e => (
          <MenuItem key={e.id} value={e.id}>{e.razon_social}</MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

function SinEmpresa() {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography color="text.secondary">
        No hay ninguna empresa creada. Cree una en Configuración → Empresas para
        empezar a contabilizar.
      </Typography>
    </Box>
  )
}

// ─── Períodos ─────────────────────────────────────────────────────────────────

interface Periodo {
  id: number; anio: number; mes: number; estado: string
  cerrado_por?: string | null; cerrado_en?: string | null
  motivo_reapertura?: string | null
  comprobantes: number; debitos: number; creditos: number
}

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const colorEstado: Record<string, 'success' | 'default' | 'error'> = {
  ABIERTO: 'success', CERRADO: 'default', BLOQUEADO: 'error',
}

export function PanelPeriodos({ empresaId }: { empresaId: number | null }) {
  const qc = useQueryClient()
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [accion, setAccion] = useState<{ p: Periodo; cerrar: boolean } | null>(null)
  const [motivo, setMotivo] = useState('')

  const { data: periodos = [], isLoading } = useQuery<Periodo[]>({
    queryKey: ['erp-periodos', empresaId, anio],
    queryFn: () => apiClient
      .get('/erp/contabilidad/periodos', { params: { empresa_id: empresaId, anio } })
      .then(r => r.data),
    enabled: empresaId != null,
  })

  const mover = useMutation({
    mutationFn: ({ p, cerrar }: { p: Periodo; cerrar: boolean }) =>
      apiClient.post(
        `/erp/contabilidad/periodos/${cerrar ? 'cerrar' : 'reabrir'}`,
        { empresa_id: empresaId, anio: p.anio, mes: p.mes, motivo: motivo || undefined },
      ),
    onSuccess: (_d, v) => {
      toast.success(v.cerrar ? 'Período cerrado' : 'Período reabierto')
      setAccion(null); setMotivo('')
      qc.invalidateQueries({ queryKey: ['erp-periodos'] })
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  if (empresaId == null) return <SinEmpresa />

  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Cerrar un mes impide contabilizar en él. Es lo que evita que un asiento
          nuevo cambie una declaración ya presentada.
        </Typography>
        <TextField
          size="small" type="number" label="Año" value={anio}
          onChange={e => setAnio(Number(e.target.value))}
          sx={{ width: 110 }}
        />
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>MES</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>ESTADO</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>COMPROBANTES</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>DÉBITOS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>CRÉDITOS</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>CERRADO POR</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>ACCIÓN</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && [...Array(4)].map((_, i) => (
              <TableRow key={i}><TableCell colSpan={7}><Skeleton /></TableCell></TableRow>
            ))}
            {!isLoading && periodos.length === 0 && (
              <TableRow><TableCell colSpan={7}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  Todavía no hay períodos de {anio}. Se crean solos, abiertos, con
                  el primer asiento de cada mes.
                </Typography>
              </TableCell></TableRow>
            )}
            {periodos.map(p => {
              const desbalanceado = Math.abs(p.debitos - p.creditos) >= 0.01
              return (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{MESES[p.mes]} {p.anio}</TableCell>
                  <TableCell>
                    <Chip size="small" label={p.estado}
                          color={colorEstado[p.estado] ?? 'default'} />
                  </TableCell>
                  <TableCell align="right">{p.comprobantes}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {pesos(p.debitos)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      {pesos(p.creditos)}
                      {/* Un mes descuadrado no se debe cerrar; se avisa acá y no
                          después, cuando ya está cerrado. */}
                      {desbalanceado && (
                        <Tooltip title="Este mes no cuadra: revíselo antes de cerrarlo">
                          <WarningAmber fontSize="small" color="warning" />
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {p.cerrado_por || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {p.estado === 'ABIERTO' ? (
                      <Button size="small" startIcon={<Lock fontSize="small" />}
                              onClick={() => { setAccion({ p, cerrar: true }); setMotivo('') }}
                              sx={{ textTransform: 'none' }}>
                        Cerrar
                      </Button>
                    ) : p.estado === 'CERRADO' ? (
                      <Button size="small" startIcon={<LockOpen fontSize="small" />}
                              onClick={() => { setAccion({ p, cerrar: false }); setMotivo('') }}
                              sx={{ textTransform: 'none' }}>
                        Reabrir
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.secondary">Bloqueado</Typography>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!accion} onClose={() => setAccion(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {accion?.cerrar ? 'Cerrar' : 'Reabrir'} {accion && MESES[accion.p.mes]} {accion?.p.anio}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {accion?.cerrar
              ? 'Después de cerrarlo no se podrá contabilizar nada con fecha de ese mes.'
              : 'Reabrir un mes cerrado permite volver a modificar cifras que quizá ya se declararon. Diga por qué.'}
          </Typography>
          <TextField
            fullWidth multiline rows={2} autoFocus
            label={accion?.cerrar ? 'Observación (opcional)' : 'Motivo de la reapertura *'}
            value={motivo} onChange={e => setMotivo(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccion(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={mover.isPending || (!accion?.cerrar && !motivo.trim())}
            onClick={() => accion && mover.mutate(accion)}
            sx={{ textTransform: 'none', bgcolor: ERP_COLOR,
                  '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
          >
            {accion?.cerrar ? 'Cerrar período' : 'Reabrir período'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ─── Reglas contables ─────────────────────────────────────────────────────────

interface Regla {
  id: number; papel: string; condicion: string; cuenta_id: number
  cuenta_codigo?: string | null; cuenta_nombre?: string | null
  naturaleza: string; activa: boolean
}
interface ReglasPorEvento { evento: string; reglas: Regla[] }
interface RespuestaReglas {
  eventos: ReglasPorEvento[]
  gramatica: Record<string, string[]> | string[]
}
interface CuentaSimple { id: number; codigo: string; nombre: string; acepta_movimientos?: boolean }

const nombreEvento = (e: string) =>
  e.replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase())

/**
 * Qué cuenta cumple cada papel en cada evento.
 *
 * Es la pantalla que saca los códigos de cuenta de dentro del código: cambiar la
 * cuenta de cartera se hace acá, no en un despliegue.
 */
export function PanelReglas({ empresaId }: { empresaId: number | null }) {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<{ evento: string; regla?: Regla } | null>(null)
  const [papel, setPapel] = useState('')
  const [cuenta, setCuenta] = useState<number | ''>('')
  const [naturaleza, setNaturaleza] = useState('DEBITO')
  const [condicion, setCondicion] = useState('')

  const { data, isLoading } = useQuery<RespuestaReglas>({
    queryKey: ['erp-reglas', empresaId],
    queryFn: () => apiClient
      .get('/erp/contabilidad/reglas', { params: { empresa_id: empresaId } })
      .then(r => r.data),
    enabled: empresaId != null,
  })

  const { data: cuentas = [] } = useQuery<CuentaSimple[]>({
    queryKey: ['erp-cuentas'],
    queryFn: () => apiClient.get('/erp/contabilidad/cuentas').then(r => r.data),
  })

  // Solo las auxiliares reciben movimiento. Ofrecer una agrupadora deja armar
  // una regla que después revienta al primer asiento.
  const asentables = cuentas.filter(c => c.acepta_movimientos !== false)

  const guardar = useMutation({
    mutationFn: () => apiClient.post('/erp/contabilidad/reglas', {
      empresa_id: empresaId, evento: editando!.evento, papel,
      condicion, cuenta_id: cuenta, naturaleza,
    }),
    onSuccess: () => {
      toast.success('Regla guardada')
      setEditando(null)
      qc.invalidateQueries({ queryKey: ['erp-reglas'] })
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const abrir = (evento: string, regla?: Regla) => {
    setEditando({ evento, regla })
    setPapel(regla?.papel ?? '')
    setCuenta(regla?.cuenta_id ?? '')
    setNaturaleza(regla?.naturaleza ?? 'DEBITO')
    setCondicion(regla?.condicion ?? '')
  }

  const gramatica = data?.gramatica
  const papelesDe = (evento: string): string[] =>
    Array.isArray(gramatica) ? [] : (gramatica?.[evento] ?? [])

  if (empresaId == null) return <SinEmpresa />

  return (
    <>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Cada línea dice: «cuando pase este hecho, el papel de <em>cartera</em> lo
        cumple esta cuenta». El motor no conoce códigos de cuenta: los toma de acá.
      </Typography>

      {isLoading && <Skeleton variant="rounded" height={220} />}

      {!isLoading && (data?.eventos ?? []).length === 0 && (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Rule sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            Esta empresa aún no tiene reglas contables. Se siembran solas al
            arrancar; si no aparecieron, use «Sembrar plan de cuentas» en la
            pestaña de Plan de Cuentas.
          </Typography>
        </Box>
      )}

      {(data?.eventos ?? []).map(ev => (
        <Card key={ev.evento} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}
                 sx={{ px: 2, py: 1.2, bgcolor: alpha(ERP_COLOR, 0.04) }}>
            <Typography sx={{ fontWeight: 700, flex: 1 }}>{nombreEvento(ev.evento)}</Typography>
            <Button size="small" onClick={() => abrir(ev.evento)}
                    sx={{ textTransform: 'none' }}>
              Agregar papel
            </Button>
          </Stack>
          <Table size="small">
            <TableBody>
              {ev.reglas.map(r => (
                <TableRow key={r.id} hover sx={{ opacity: r.activa ? 1 : 0.5 }}>
                  <TableCell sx={{ width: 200, fontWeight: 600 }}>
                    {r.papel}
                    {r.condicion && (
                      <Chip size="small" label={r.condicion} sx={{ ml: 1, height: 18 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {r.cuenta_codigo} · {r.cuenta_nombre}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: 110 }}>
                    <Chip size="small" variant="outlined" label={r.naturaleza} />
                  </TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>
                    <Button size="small" onClick={() => abrir(ev.evento, r)}
                            sx={{ textTransform: 'none' }}>
                      Cambiar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ))}

      <Dialog open={!!editando} onClose={() => setEditando(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editando && nombreEvento(editando.evento)}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {papelesDe(editando?.evento ?? '').length > 0 ? (
              <FormControl fullWidth size="small">
                <InputLabel>Papel *</InputLabel>
                <Select label="Papel *" value={papel}
                        onChange={e => setPapel(String(e.target.value))}>
                  {papelesDe(editando?.evento ?? '').map(p => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField size="small" fullWidth label="Papel *" value={papel}
                         onChange={e => setPapel(e.target.value)} />
            )}

            <FormControl fullWidth size="small">
              <InputLabel>Cuenta *</InputLabel>
              <Select label="Cuenta *" value={cuenta}
                      onChange={e => setCuenta(Number(e.target.value))}>
                {asentables.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.codigo} · {c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Naturaleza *</InputLabel>
              <Select label="Naturaleza *" value={naturaleza}
                      onChange={e => setNaturaleza(String(e.target.value))}>
                <MenuItem value="DEBITO">Débito</MenuItem>
                <MenuItem value="CREDITO">Crédito</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small" fullWidth label="Condición" value={condicion}
              onChange={e => setCondicion(e.target.value.toUpperCase())}
              helperText="Opcional. Una regla con condición —EXPORTACION, por ejemplo— manda sobre la general."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditando(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" disabled={!papel || !cuenta || guardar.isPending}
                  onClick={() => guardar.mutate()}
                  sx={{ textTransform: 'none', bgcolor: ERP_COLOR,
                        '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ─── Libros ───────────────────────────────────────────────────────────────────

interface FilaBalance {
  cuenta_id: number; codigo: string; nombre: string
  acepta_movimientos: boolean
  saldo_inicial_debito: number; saldo_inicial_credito: number
  debitos: number; creditos: number
  saldo_final_debito: number; saldo_final_credito: number
}
interface Balance {
  filas: FilaBalance[]
  totales: Record<string, number>
  cuadra: boolean
}
interface LineaMayor {
  fecha: string; comprobante: string; concepto: string
  tercero?: string | null; debito: number; credito: number; saldo: number
}
interface Mayor {
  cuenta: { codigo?: string | null; nombre?: string | null }
  saldo_inicial: number; saldo_final: number; lineas: LineaMayor[]
  total_lineas: number; desplazamiento: number; limite: number
}

const POR_PAGINA = 500

/**
 * Balance de comprobación, y desde una cuenta el detalle de su movimiento.
 *
 * El balance es el reporte donde se ve un descuadre; el mayor es el que permite
 * bajar de la cifra al documento que la produjo. Van juntos porque por separado
 * obligan a copiar códigos de cuenta de una pantalla a otra.
 */
export function PanelLibros({ empresaId }: { empresaId: number | null }) {
  const [desde, setDesde] = useState(primeroDelAnio())
  const [hasta, setHasta] = useState(hoy())
  const [cuenta, setCuenta] = useState<FilaBalance | null>(null)
  const [pagina, setPagina] = useState(0)

  const { data: balance, isLoading } = useQuery<Balance>({
    queryKey: ['erp-balance', empresaId, desde, hasta],
    queryFn: () => apiClient
      .get('/erp/contabilidad/balance-comprobacion',
           { params: { empresa_id: empresaId, desde, hasta } })
      .then(r => r.data),
    enabled: empresaId != null,
  })

  const { data: mayor, isLoading: cargandoMayor } = useQuery<Mayor>({
    queryKey: ['erp-mayor', empresaId, cuenta?.cuenta_id, desde, hasta, pagina],
    queryFn: () => apiClient
      .get('/erp/contabilidad/libro-mayor',
           { params: { empresa_id: empresaId, cuenta_id: cuenta!.cuenta_id,
                       desde, hasta, limite: POR_PAGINA,
                       desplazamiento: pagina * POR_PAGINA } })
      .then(r => r.data),
    enabled: empresaId != null && cuenta != null,
  })

  if (empresaId == null) return <SinEmpresa />

  const t = balance?.totales

  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
        <TextField size="small" type="date" label="Desde" value={desde}
                   onChange={e => setDesde(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="Hasta" value={hasta}
                   onChange={e => setHasta(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Box sx={{ flex: 1 }} />
        {balance && (
          <Chip
            icon={balance.cuadra ? <CheckCircle /> : <WarningAmber />}
            color={balance.cuadra ? 'success' : 'error'}
            label={balance.cuadra ? 'El libro cuadra' : 'El libro NO cuadra'}
            sx={{ fontWeight: 700 }}
          />
        )}
      </Stack>

      {isLoading && <Skeleton variant="rounded" height={260} />}

      {balance && (
        <Card variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>CUENTA</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>SALDO INICIAL</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>DÉBITOS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>CRÉDITOS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>SALDO FINAL</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {balance.filas.length === 0 && (
                <TableRow><TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    Sin movimiento en el rango elegido.
                  </Typography>
                </TableCell></TableRow>
              )}
              {balance.filas.map(f => (
                <TableRow
                  key={f.cuenta_id} hover
                  onClick={() => {
                    if (!f.acepta_movimientos) return
                    setCuenta(f); setPagina(0)
                  }}
                  sx={{
                    cursor: f.acepta_movimientos ? 'pointer' : 'default',
                    // Las agrupadoras se ven distintas porque su saldo es la suma
                    // de las de abajo, no un movimiento propio.
                    '& td': { fontWeight: f.acepta_movimientos ? 400 : 700 },
                    bgcolor: f.acepta_movimientos ? undefined : alpha(ERP_COLOR, 0.02),
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {f.codigo} · {f.nombre}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {pesos(f.saldo_inicial_debito - f.saldo_inicial_credito)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {f.debitos ? pesos(f.debitos) : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {f.creditos ? pesos(f.creditos) : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {pesos(f.saldo_final_debito - f.saldo_final_credito)}
                  </TableCell>
                </TableRow>
              ))}
              {t && (
                <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.07) }}>
                  <TableCell sx={{ fontWeight: 800 }}>TOTALES</TableCell>
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {pesos(t.mov_d)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {pesos(t.mov_c)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!cuenta} onClose={() => setCuenta(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <MenuBook fontSize="small" sx={{ color: ERP_COLOR }} />
            <span>Libro mayor · {cuenta?.codigo} {cuenta?.nombre}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {cargandoMayor && <Skeleton variant="rounded" height={200} />}
          {mayor && (
            <>
              <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">SALDO INICIAL</Typography>
                  <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {pesos(mayor.saldo_inicial)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">SALDO FINAL</Typography>
                  <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {pesos(mayor.saldo_final)}
                  </Typography>
                </Box>
              </Stack>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.04) }}>
                      <TableCell sx={{ fontWeight: 700 }}>FECHA</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>COMPROBANTE</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>CONCEPTO</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>DÉBITO</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>CRÉDITO</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>SALDO</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mayor.lineas.length === 0 && (
                      <TableRow><TableCell colSpan={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Sin movimiento en el rango.
                        </Typography>
                      </TableCell></TableRow>
                    )}
                    {mayor.lineas.map((l, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{l.fecha}</TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{l.comprobante}</TableCell>
                        <TableCell>{l.concepto}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {l.debito ? pesos(l.debito) : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {l.credito ? pesos(l.credito) : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {pesos(l.saldo)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
          {mayor && mayor.total_lineas > POR_PAGINA ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small" disabled={pagina === 0}
                      onClick={() => setPagina(p => Math.max(0, p - 1))}
                      sx={{ textTransform: 'none' }}>
                Anterior
              </Button>
              <Typography variant="caption" color="text.secondary">
                {mayor.desplazamiento + 1}–
                {Math.min(mayor.desplazamiento + mayor.lineas.length, mayor.total_lineas)}
                {' de '}{mayor.total_lineas.toLocaleString('es-CO')} líneas
              </Typography>
              <Button
                size="small"
                disabled={mayor.desplazamiento + mayor.lineas.length >= mayor.total_lineas}
                onClick={() => setPagina(p => p + 1)}
                sx={{ textTransform: 'none' }}
              >
                Siguiente
              </Button>
            </Stack>
          ) : <Box />}
          <Button onClick={() => setCuenta(null)} sx={{ textTransform: 'none' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
