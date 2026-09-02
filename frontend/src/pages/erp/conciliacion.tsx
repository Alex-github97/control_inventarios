/**
 * Conciliación bancaria: emparejar el extracto con los libros.
 *
 * El servidor PROPONE y la persona confirma. Conciliar automáticamente todo lo
 * que se parece esconde justo los casos que hay que mirar —dos facturas por el
 * mismo importe el mismo día, un pago que llegó partido en dos—, y un extracto
 * conciliado a la fuerza es peor que uno sin conciliar, porque nadie lo vuelve a
 * revisar.
 *
 * Por eso cada propuesta muestra POR QUÉ se propuso, y las ambiguas se marcan y
 * no traen sugerencia: son las que necesitan a alguien.
 */
import React, { useMemo, useState } from 'react'
import {
  Alert, Box, Button, Card, Checkbox, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select,
  Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  Tooltip, Typography, alpha,
} from '@mui/material'
import {
  CheckCircle, HelpOutline, LinkOff, PostAdd, WarningAmber,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient } from '@/api/client'
import { ERP_COLOR, mensajeDeError, pesos } from './nucleo'

interface Candidato {
  comprobante_id: number
  comprobante: string
  fecha: string
  concepto: string
  referencia?: string | null
  puntaje: number
  razones: string[]
}

interface Propuesta {
  movimiento_id: number
  fecha: string
  tipo: 'CREDITO' | 'DEBITO'
  monto: number
  concepto: string
  referencia?: string | null
  candidatos: Candidato[]
  sugerido: number | null
  ambiguo: boolean
}

interface Respuesta {
  cuenta: { id: number; numero: string }
  desde: string
  hasta: string
  sin_conciliar: number
  con_propuesta: number
  ambiguos: number
  propuestas: Propuesta[]
}

interface CuentaBancaria { id: number; numero: string; tipo?: string }
interface Cuenta { id: number; codigo: string; nombre: string; acepta_movimientos?: boolean }

const hoy = () => new Date().toISOString().slice(0, 10)
const haceMeses = (n: number) => {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().slice(0, 10)
}

export default function PanelConciliacion() {
  const qc = useQueryClient()
  const [cuentaId, setCuentaId] = useState<number | ''>('')
  const [desde, setDesde] = useState(haceMeses(3))
  const [hasta, setHasta] = useState(hoy())
  const [elegidos, setElegidos] = useState<Record<number, number>>({})
  const [contabilizando, setContabilizando] = useState<Propuesta | null>(null)
  const [contrapartida, setContrapartida] = useState<number | ''>('')

  const { data: cuentas = [] } = useQuery<CuentaBancaria[]>({
    queryKey: ['erp-tesoreria-cuentas'],
    queryFn: () => apiClient.get('/erp/tesoreria/cuentas').then(r => r.data),
  })

  const laCuenta = cuentaId || cuentas[0]?.id || ''

  const { data, isLoading } = useQuery<Respuesta>({
    queryKey: ['erp-conciliacion', laCuenta, desde, hasta],
    queryFn: () => apiClient
      .get('/erp/tesoreria/conciliacion',
           { params: { cuenta_id: laCuenta, desde, hasta } })
      .then(r => r.data),
    enabled: !!laCuenta,
  })

  const { data: plan = [] } = useQuery<Cuenta[]>({
    queryKey: ['erp-cuentas'],
    queryFn: () => apiClient.get('/erp/contabilidad/cuentas').then(r => r.data),
  })
  const asentables = plan.filter(c => c.acepta_movimientos !== false)

  const conciliar = useMutation({
    mutationFn: (parejas: Array<{ movimiento_id: number; comprobante_id: number }>) =>
      apiClient.post('/erp/tesoreria/conciliar', { parejas }).then(r => r.data),
    onSuccess: (r: any) => {
      toast.success(`${r.conciliados} movimiento(s) conciliado(s)`)
      setElegidos({})
      qc.invalidateQueries({ queryKey: ['erp-conciliacion'] })
      qc.invalidateQueries({ queryKey: ['erp-tesoreria-movimientos'] })
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const contabilizar = useMutation({
    mutationFn: () => apiClient.post(
      `/erp/tesoreria/movimientos/${contabilizando!.movimiento_id}/contabilizar`,
      { cuenta_contrapartida_id: contrapartida, concepto: contabilizando!.concepto },
    ).then(r => r.data),
    onSuccess: (r: any) => {
      toast.success(`Contabilizado como ${r.comprobante} y conciliado`)
      setContabilizando(null); setContrapartida('')
      qc.invalidateQueries({ queryKey: ['erp-conciliacion'] })
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  // Marcadas por omisión: las que el servidor propuso sin ambigüedad. Las
  // ambiguas y las que no tienen candidato quedan sin marcar a propósito.
  const propuestas = data?.propuestas ?? []
  const seleccion = useMemo(() => {
    const base: Record<number, number> = {}
    for (const p of propuestas) if (p.sugerido) base[p.movimiento_id] = p.sugerido
    return { ...base, ...elegidos }
  }, [propuestas, elegidos])

  const marcadas = Object.entries(seleccion).filter(([, v]) => v)
  const sinCandidato = propuestas.filter(p => p.candidatos.length === 0).length

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Cuenta bancaria</InputLabel>
          <Select label="Cuenta bancaria" value={laCuenta}
                  onChange={e => setCuentaId(Number(e.target.value))}>
            {cuentas.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.numero}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" type="date" label="Desde" value={desde}
                   onChange={e => setDesde(e.target.value)}
                   InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="Hasta" value={hasta}
                   onChange={e => setHasta(e.target.value)}
                   InputLabelProps={{ shrink: true }} />
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          disabled={marcadas.length === 0 || conciliar.isPending}
          onClick={() => conciliar.mutate(marcadas.map(([m, c]) => ({
            movimiento_id: Number(m), comprobante_id: c,
          })))}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: ERP_COLOR,
                '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
        >
          Conciliar {marcadas.length > 0 && `(${marcadas.length})`}
        </Button>
      </Stack>

      {data && (
        <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
          <Chip label={`${data.sin_conciliar} sin conciliar`} />
          <Chip color="success" icon={<CheckCircle />}
                label={`${data.con_propuesta} con pareja clara`} />
          {data.ambiguos > 0 && (
            <Chip color="warning" icon={<WarningAmber />}
                  label={`${data.ambiguos} ambiguo(s)`} />
          )}
          {sinCandidato > 0 && (
            <Chip variant="outlined" label={`${sinCandidato} sin asiento`} />
          )}
        </Stack>
      )}

      {sinCandidato > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Los movimientos sin ningún asiento suelen ser comisiones, el 4x1000 o
          rendimientos: no vienen de una factura. Use «Contabilizar» en la fila
          para crearles el asiento y conciliarlos de una vez.
        </Alert>
      )}

      {isLoading && <Skeleton variant="rounded" height={280} />}

      {data && propuestas.length === 0 && (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
          <Typography color="text.secondary">
            No queda nada sin conciliar en este rango.
          </Typography>
        </Box>
      )}

      {propuestas.length > 0 && (
        <Card variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.04) }}>
                <TableCell padding="checkbox" />
                <TableCell sx={{ fontWeight: 700 }}>FECHA</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>CONCEPTO DEL EXTRACTO</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>MONTO</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ASIENTO PROPUESTO</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>POR QUÉ</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {propuestas.map(p => {
                const elegido = seleccion[p.movimiento_id]
                const cand = p.candidatos.find(c => c.comprobante_id === elegido)
                return (
                  <TableRow key={p.movimiento_id} hover
                            sx={{ bgcolor: p.ambiguo ? alpha('#D97706', 0.05) : undefined }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        disabled={p.candidatos.length === 0}
                        checked={!!elegido}
                        onChange={e => setElegidos(prev => ({
                          ...prev,
                          [p.movimiento_id]: e.target.checked
                            ? (elegido || p.candidatos[0]?.comprobante_id) : 0,
                        }))}
                      />
                    </TableCell>
                    <TableCell>{p.fecha}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="body2" noWrap>{p.concepto}</Typography>
                      {p.referencia && (
                        <Typography variant="caption" color="text.secondary">
                          ref. {p.referencia}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      <Typography
                        variant="body2" fontWeight={700}
                        color={p.tipo === 'CREDITO' ? 'success.main' : 'error.main'}
                      >
                        {p.tipo === 'CREDITO' ? '+' : '−'} {pesos(p.monto)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      {p.candidatos.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          Sin asiento que le corresponda
                        </Typography>
                      ) : (
                        <Select
                          size="small" fullWidth variant="standard"
                          value={elegido || ''}
                          onChange={e => setElegidos(prev => ({
                            ...prev, [p.movimiento_id]: Number(e.target.value),
                          }))}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>ninguno</em>
                          </MenuItem>
                          {p.candidatos.map(c => (
                            <MenuItem key={c.comprobante_id} value={c.comprobante_id}>
                              {c.comprobante} · {c.fecha}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      {p.ambiguo ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <WarningAmber fontSize="small" color="warning" />
                          <Typography variant="caption" color="warning.main">
                            Hay varios asientos igual de parecidos: elija usted.
                          </Typography>
                        </Stack>
                      ) : cand ? (
                        <Tooltip title={cand.razones.join(' · ')}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <HelpOutline fontSize="small" sx={{ color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">
                              {cand.razones.join(' · ')}
                            </Typography>
                          </Stack>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {p.candidatos.length === 0 && (
                        <Tooltip title="Crear el asiento de este movimiento">
                          <Button
                            size="small" startIcon={<PostAdd fontSize="small" />}
                            onClick={() => { setContabilizando(p); setContrapartida('') }}
                            sx={{ textTransform: 'none' }}
                          >
                            Contabilizar
                          </Button>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!contabilizando} onClose={() => setContabilizando(null)}
              maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Contabilizar el movimiento</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {contabilizando?.concepto} · {pesos(contabilizando?.monto)} ·{' '}
            {contabilizando?.fecha}
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            El banco ya lo pone la cuenta. Falta decir contra qué va: solo usted
            sabe si ese cargo es una comisión, un impuesto o una devolución, y
            deducirlo del texto del extracto se equivocaría en silencio.
          </Alert>
          <FormControl fullWidth size="small">
            <InputLabel>Cuenta de contrapartida *</InputLabel>
            <Select label="Cuenta de contrapartida *" value={contrapartida}
                    onChange={e => setContrapartida(Number(e.target.value))}>
              {asentables.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.codigo} · {c.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContabilizando(null)} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained" disabled={!contrapartida || contabilizar.isPending}
            onClick={() => contabilizar.mutate()}
            sx={{ textTransform: 'none', bgcolor: ERP_COLOR,
                  '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
          >
            Contabilizar y conciliar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
