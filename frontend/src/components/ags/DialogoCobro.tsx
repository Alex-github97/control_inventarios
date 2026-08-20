/**
 * Diálogo de cobro de una cita.
 *
 * Propina, descuento y materiales se capturan aquí y no al agendar, porque en
 * la práctica solo se conocen cuando se terminó de atender.
 */
import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem,
  Stack, Typography, Box, IconButton, Divider, Alert, alpha, Chip, Table,
  TableBody, TableRow, TableCell,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add, Delete, PointOfSale } from '@mui/icons-material'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import {
  AGS_COLOR, AGS_DARK, fmtCOP, MEDIOS_PAGO, type Cita,
} from '@/utils/ags'

interface MaterialEditable {
  descripcion: string
  cantidad: number
  precio_unitario: number
}

interface Props {
  cita: Cita | null
  onCerrar: () => void
  onCobrado: () => void
}

export function DialogoCobro({ cita, onCerrar, onCobrado }: Props) {
  const [medio, setMedio] = useState('EFECTIVO')
  const [propina, setPropina] = useState(0)
  const [descuento, setDescuento] = useState(0)
  const [motivo, setMotivo] = useState('')
  const [referencia, setReferencia] = useState('')
  const [materiales, setMateriales] = useState<MaterialEditable[]>([])
  const [parcial, setParcial] = useState<number | ''>('')
  const [idCargado, setIdCargado] = useState<number | null>(null)

  // Cargar los valores de la cita al abrirla, sin useEffect
  if (cita && idCargado !== cita.id) {
    setIdCargado(cita.id)
    setMedio(cita.medio_pago ?? 'EFECTIVO')
    setPropina(cita.propina ?? 0)
    setDescuento(cita.descuento ?? 0)
    setMotivo(cita.descuento_motivo ?? '')
    setReferencia('')
    setParcial('')
    setMateriales((cita.materiales ?? []).map(m => ({
      descripcion: m.descripcion, cantidad: m.cantidad, precio_unitario: m.precio_unitario,
    })))
  }
  if (!cita && idCargado !== null) setIdCargado(null)

  const cobrar = useMutation({
    mutationFn: async () => (await api.post(`/ags/citas/${cita!.id}/cobrar`, {
      medio_pago: medio,
      monto: parcial === '' ? null : Number(parcial),
      propina: Number(propina) || 0,
      descuento: Number(descuento) || 0,
      descuento_motivo: motivo || null,
      materiales: materiales
        .filter(m => m.descripcion.trim())
        .map(m => ({
          descripcion: m.descripcion,
          cantidad: Number(m.cantidad) || 1,
          precio_unitario: Number(m.precio_unitario) || 0,
        })),
      referencia: referencia || null,
      completar: true,
    })).data,
    onSuccess: (d: Cita) => {
      toast.success(d.pagado
        ? `Cobro registrado · ${d.codigo} completada`
        : `Abono registrado · queda ${fmtCOP(d.saldo)} por cobrar`)
      onCobrado()
      onCerrar()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo registrar el cobro'),
  })

  if (!cita) return null

  const totalMateriales = materiales.reduce(
    (s, m) => s + (Number(m.precio_unitario) || 0) * (Number(m.cantidad) || 1), 0)
  const total = Math.max(
    (cita.subtotal || 0) + totalMateriales - (Number(descuento) || 0) + (Number(propina) || 0), 0)
  const yaPagado = cita.total_pagado || 0
  const saldo = Math.max(total - yaPagado, 0)
  const aCobrar = parcial === '' ? saldo : Number(parcial)
  const excedeSaldo = aCobrar > saldo + 0.01
  const comisionEstimada = cita.comision_profesional || 0

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Cobrar {cita.codigo}
        <Typography variant="caption" color="text.secondary" display="block">
          {cita.cliente} · {cita.servicios_texto}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Materiales: solo relevante para oficios que los cobran */}
          <Grid size={12}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" fontWeight={700}>
                MATERIALES COBRADOS AL CLIENTE
              </Typography>
              <Button
                size="small" startIcon={<Add />}
                onClick={() => setMateriales(p => [...p, { descripcion: '', cantidad: 1, precio_unitario: 0 }])}
              >
                Agregar
              </Button>
            </Stack>
            {materiales.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                Sin materiales. Agréguelos si el trabajo consumió insumos que se le cobran aparte
                de la mano de obra.
              </Typography>
            ) : (
              <Stack spacing={0.8} sx={{ mt: 1 }}>
                {materiales.map((m, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small" label="Descripción" value={m.descripcion} sx={{ flex: 1 }}
                      onChange={e => setMateriales(p => p.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x))}
                    />
                    <TextField
                      size="small" type="number" label="Cant." value={m.cantidad} sx={{ width: 78 }}
                      onChange={e => setMateriales(p => p.map((x, j) => j === i ? { ...x, cantidad: Number(e.target.value) || 1 } : x))}
                    />
                    <TextField
                      size="small" type="number" label="Precio" value={m.precio_unitario} sx={{ width: 118 }}
                      onChange={e => setMateriales(p => p.map((x, j) => j === i ? { ...x, precio_unitario: Number(e.target.value) || 0 } : x))}
                    />
                    <IconButton size="small" onClick={() => setMateriales(p => p.filter((_x, j) => j !== i))}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </Grid>

          <Grid size={12}><Divider /></Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <TextField
              type="number" fullWidth size="small" label="Descuento"
              value={descuento} onChange={e => setDescuento(Number(e.target.value) || 0)}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 5 }}>
            <TextField
              fullWidth size="small" label="Motivo del descuento" value={motivo}
              onChange={e => setMotivo(e.target.value)} disabled={!descuento}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <TextField
              type="number" fullWidth size="small" label="Propina"
              value={propina} onChange={e => setPropina(Number(e.target.value) || 0)}
              helperText="Va completa al profesional"
            />
          </Grid>

          {/* Cuenta de cobro */}
          <Grid size={12}>
            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha(AGS_COLOR, 0.06) }}>
              <Table size="small">
                <TableBody>
                  {[
                    ['Servicios (mano de obra)', cita.subtotal || 0],
                    ...(totalMateriales ? [['Materiales', totalMateriales] as [string, number]] : []),
                    ...(descuento ? [['Descuento', -(Number(descuento) || 0)] as [string, number]] : []),
                    ...(propina ? [['Propina', Number(propina) || 0] as [string, number]] : []),
                  ].map(([label, valor]) => (
                    <TableRow key={String(label)}>
                      <TableCell sx={{ border: 0, py: 0.3, pl: 0 }}>
                        <Typography variant="caption">{label}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ border: 0, py: 0.3, pr: 0 }}>
                        <Typography variant="caption" fontWeight={600}>
                          {fmtCOP(valor as number)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ borderTop: '1px solid', borderColor: 'divider', py: 0.6, pl: 0 }}>
                      <Typography variant="body2" fontWeight={800}>Total</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ borderTop: '1px solid', borderColor: 'divider', py: 0.6, pr: 0 }}>
                      <Typography variant="body2" fontWeight={800}>{fmtCOP(total)}</Typography>
                    </TableCell>
                  </TableRow>
                  {yaPagado > 0 && (
                    <>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.3, pl: 0 }}>
                          <Typography variant="caption">Ya abonado</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ border: 0, py: 0.3, pr: 0 }}>
                          <Typography variant="caption" color="success.main">−{fmtCOP(yaPagado)}</Typography>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.3, pl: 0 }}>
                          <Typography variant="body2" fontWeight={700}>Saldo</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ border: 0, py: 0.3, pr: 0 }}>
                          <Typography variant="body2" fontWeight={700}>{fmtCOP(saldo)}</Typography>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
              {comisionEstimada > 0 && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Comisión del profesional: {fmtCOP(comisionEstimada)} (solo sobre mano de obra)
                </Typography>
              )}
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              select fullWidth size="small" label="Medio de pago"
              value={medio} onChange={e => setMedio(e.target.value)}
            >
              {MEDIOS_PAGO.map(m => <MenuItem key={m.valor} value={m.valor}>{m.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              type="number" fullWidth size="small" label="Monto a cobrar"
              value={parcial} onChange={e => setParcial(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={String(Math.round(saldo))}
              error={excedeSaldo}
              helperText={excedeSaldo ? 'Supera el saldo' : 'Vacío = todo el saldo'}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth size="small" label="Referencia / comprobante"
              value={referencia} onChange={e => setReferencia(e.target.value)}
              disabled={medio === 'EFECTIVO'}
            />
          </Grid>

          {aCobrar < saldo && aCobrar > 0 && (
            <Grid size={12}>
              <Alert severity="info" sx={{ py: 0.3 }}>
                Es un abono parcial: quedarán {fmtCOP(saldo - aCobrar)} por cobrar y la cita
                seguirá abierta hasta completar el pago.
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={800}>
            Se registra: {fmtCOP(aCobrar)}
          </Typography>
        </Box>
        <Button onClick={onCerrar}>Cancelar</Button>
        <Button
          variant="contained" startIcon={<PointOfSale />}
          onClick={() => cobrar.mutate()}
          disabled={cobrar.isPending || excedeSaldo || aCobrar <= 0}
          sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
        >
          {cobrar.isPending ? 'Registrando…' : 'Registrar cobro'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
