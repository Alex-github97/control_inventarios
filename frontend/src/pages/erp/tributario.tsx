/**
 * La parametrización tributaria: reglas con vigencia, parámetros del año y el
 * simulador.
 *
 * Tres ideas que gobiernan estas pantallas:
 *
 *  1. Una tarifa que cambia se agrega como regla NUEVA con su vigencia; no se
 *     edita la vieja. Editarla reescribiría cómo se calculó lo que ya se
 *     declaró, y al recontabilizar una factura de marzo saldría otra cifra.
 *  2. El cero siempre viene con su motivo. «No se retuvo» y «se olvidó retener»
 *     se ven igual en un total, y solo el motivo los distingue en una revisión.
 *  3. La UVT no se inventa. Un año sin UVT cargada bloquea las reglas que
 *     dependen de ella en vez de tratar el mínimo como cero, que haría retener
 *     sobre una compra de diez mil pesos.
 */
import React, { useState } from 'react'
import {
  Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, FormControlLabel, InputLabel, MenuItem, Select,
  Skeleton, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, alpha,
} from '@mui/material'
import { Add, Calculate, HelpOutline } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient } from '@/api/client'
import { ERP_COLOR, mensajeDeError, pesos } from './nucleo'

const hoy = () => new Date().toISOString().slice(0, 10)

interface ReglaImpuesto {
  id: number; impuesto: string; concepto: string; tarifa: number
  base_minima_uvt: number; vigente_desde: string; vigente_hasta?: string | null
  codigo_municipio?: string | null; papel?: string | null
  excluye_autorretenedor: boolean; activa: boolean
}

interface Parametro {
  id: number; anio: number; clave: string; valor: number
  descripcion?: string | null; fuente?: string | null
}

const IMPUESTOS = ['IVA', 'RETEFUENTE', 'RETEIVA', 'RETEICA']

const colorImpuesto: Record<string, 'primary' | 'warning' | 'secondary' | 'info'> = {
  IVA: 'primary', RETEFUENTE: 'warning', RETEIVA: 'secondary', RETEICA: 'info',
}

// ─── Reglas ───────────────────────────────────────────────────────────────────

export function PanelReglasImpuesto({ empresaId }: { empresaId: number | null }) {
  const qc = useQueryClient()
  const [soloVigentes, setSoloVigentes] = useState(true)
  const [abierto, setAbierto] = useState(false)
  // Una regla nueva parte de la que se quiere reemplazar: lo normal es cambiar
  // la tarifa dejando todo lo demás igual.
  const [f, setF] = useState({
    impuesto: 'RETEFUENTE', concepto: '', tarifa: '', base_minima_uvt: '0',
    vigente_desde: hoy(), codigo_municipio: '', excluye_autorretenedor: true,
  })

  const { data: reglas = [], isLoading } = useQuery<ReglaImpuesto[]>({
    queryKey: ['erp-reglas-impuesto', empresaId, soloVigentes],
    queryFn: () => apiClient
      .get('/erp/tributacion/reglas',
           { params: { empresa_id: empresaId, vigentes: soloVigentes } })
      .then(r => r.data),
    enabled: empresaId != null,
  })

  const crear = useMutation({
    mutationFn: () => apiClient.post('/erp/tributacion/reglas', {
      empresa_id: empresaId,
      impuesto: f.impuesto,
      concepto: f.concepto,
      tarifa: Number(f.tarifa),
      base_minima_uvt: Number(f.base_minima_uvt || 0),
      vigente_desde: f.vigente_desde,
      codigo_municipio: f.codigo_municipio || null,
      excluye_autorretenedor: f.excluye_autorretenedor,
    }),
    onSuccess: () => {
      toast.success('Regla creada. La anterior queda cerrada en la víspera.')
      setAbierto(false)
      qc.invalidateQueries({ queryKey: ['erp-reglas-impuesto'] })
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const duplicar = (r: ReglaImpuesto) => {
    setF({
      impuesto: r.impuesto, concepto: r.concepto, tarifa: String(r.tarifa),
      base_minima_uvt: String(r.base_minima_uvt), vigente_desde: hoy(),
      codigo_municipio: r.codigo_municipio ?? '',
      excluye_autorretenedor: r.excluye_autorretenedor,
    })
    setAbierto(true)
  }

  if (empresaId == null) return null

  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 260 }}>
          Cuando una tarifa cambia se crea una regla nueva con su fecha de
          vigencia; la anterior no se toca. Así una factura vieja se sigue
          calculando con la tarifa que tenía cuando se emitió.
        </Typography>
        <FormControlLabel
          control={<Switch size="small" checked={soloVigentes}
                           onChange={e => setSoloVigentes(e.target.checked)} />}
          label={<Typography variant="body2">Solo vigentes hoy</Typography>}
        />
        <Button variant="contained" startIcon={<Add />}
                onClick={() => { setF({ ...f, vigente_desde: hoy() }); setAbierto(true) }}
                sx={{ textTransform: 'none', bgcolor: ERP_COLOR,
                      '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}>
          Nueva regla
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>IMPUESTO</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>CONCEPTO</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>TARIFA</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>BASE MÍNIMA</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>VIGENCIA</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>MUNICIPIO</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && [...Array(4)].map((_, i) => (
              <TableRow key={i}><TableCell colSpan={7}><Skeleton /></TableCell></TableRow>
            ))}
            {!isLoading && reglas.length === 0 && (
              <TableRow><TableCell colSpan={7}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No hay reglas {soloVigentes ? 'vigentes hoy' : 'registradas'}.
                </Typography>
              </TableCell></TableRow>
            )}
            {reglas.map(r => (
              <TableRow key={r.id} hover sx={{ opacity: r.activa ? 1 : 0.55 }}>
                <TableCell>
                  <Chip size="small" label={r.impuesto}
                        color={colorImpuesto[r.impuesto] ?? 'default'} />
                </TableCell>
                <TableCell>{r.concepto}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {r.tarifa}%
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.base_minima_uvt ? `${r.base_minima_uvt} UVT` : '—'}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {r.vigente_desde} → {r.vigente_hasta ?? 'sin cierre'}
                  </Typography>
                </TableCell>
                <TableCell>{r.codigo_municipio ?? '—'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => duplicar(r)} sx={{ textTransform: 'none' }}>
                    Nueva tarifa
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nueva regla tributaria</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Si ya existe una regla igual, esta la reemplaza desde la fecha de
            vigencia y la anterior se cierra el día antes. Los documentos ya
            emitidos conservan su cálculo.
          </Alert>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Impuesto *</InputLabel>
              <Select label="Impuesto *" value={f.impuesto}
                      onChange={e => setF({ ...f, impuesto: String(e.target.value) })}>
                {IMPUESTOS.map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" fullWidth label="Concepto *" value={f.concepto}
                       onChange={e => setF({ ...f, concepto: e.target.value })}
                       helperText="Por ejemplo: Compras generales, Honorarios, Transporte de carga." />
            <Stack direction="row" spacing={2}>
              <TextField size="small" fullWidth type="number" label="Tarifa % *"
                         value={f.tarifa} onChange={e => setF({ ...f, tarifa: e.target.value })} />
              <TextField size="small" fullWidth type="number" label="Base mínima (UVT)"
                         value={f.base_minima_uvt}
                         onChange={e => setF({ ...f, base_minima_uvt: e.target.value })}
                         helperText="0 si no tiene mínimo" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField size="small" fullWidth type="date" label="Vigente desde *"
                         InputLabelProps={{ shrink: true }} value={f.vigente_desde}
                         onChange={e => setF({ ...f, vigente_desde: e.target.value })} />
              <TextField size="small" fullWidth label="Código de municipio"
                         value={f.codigo_municipio}
                         onChange={e => setF({ ...f, codigo_municipio: e.target.value })}
                         helperText="Solo para ICA. Vacío = general." />
            </Stack>
            <FormControlLabel
              control={<Switch checked={f.excluye_autorretenedor}
                               onChange={e => setF({ ...f, excluye_autorretenedor: e.target.checked })} />}
              label={<Typography variant="body2">
                No aplicar a autorretenedores (ellos se autorretienen)
              </Typography>}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained"
                  disabled={!f.concepto || !f.tarifa || crear.isPending}
                  onClick={() => crear.mutate()}
                  sx={{ textTransform: 'none', bgcolor: ERP_COLOR,
                        '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}>
            Crear regla
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ─── Parámetros fiscales ──────────────────────────────────────────────────────

export function PanelParametros() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [f, setF] = useState({
    anio: new Date().getFullYear(), clave: 'UVT', valor: '', fuente: '',
  })

  const { data: parametros = [], isLoading } = useQuery<Parametro[]>({
    queryKey: ['erp-parametros'],
    queryFn: () => apiClient.get('/erp/tributacion/parametros').then(r => r.data),
  })

  const guardar = useMutation({
    mutationFn: () => apiClient.post('/erp/tributacion/parametros', {
      anio: f.anio, clave: f.clave, valor: Number(f.valor), fuente: f.fuente || null,
    }),
    onSuccess: () => {
      toast.success('Parámetro guardado')
      setAbierto(false)
      qc.invalidateQueries({ queryKey: ['erp-parametros'] })
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const anioActual = new Date().getFullYear()
  const faltaUVT = !isLoading &&
    !parametros.some(p => p.clave === 'UVT' && p.anio === anioActual)

  return (
    <>
      {/* Sin la UVT del año, las reglas con base mínima se detienen en vez de
          retener mal. Se avisa acá porque es un solo campo y bloquea facturación. */}
      {faltaUVT && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No hay UVT cargada para {anioActual}. Las reglas con base mínima en UVT
          no se pueden liquidar hasta que la cargue, porque el mínimo quedaría
          desconocido y se retendría sobre bases que no lo exigen.
        </Alert>
      )}

      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          La UVT y el salario mínimo cambian cada enero. Se cargan acá, con su
          fuente, y no se deducen ni se estiman.
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setAbierto(true)}
                sx={{ textTransform: 'none', bgcolor: ERP_COLOR,
                      '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}>
          Cargar valor
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>AÑO</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>VALOR</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>MONTO</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>FUENTE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && [...Array(3)].map((_, i) => (
              <TableRow key={i}><TableCell colSpan={4}><Skeleton /></TableCell></TableRow>
            ))}
            {parametros.map(p => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{p.anio}</TableCell>
                <TableCell><Chip size="small" variant="outlined" label={p.clave} /></TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {pesos(p.valor)}
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {p.fuente ?? '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cargar valor fiscal</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField size="small" fullWidth type="number" label="Año *" value={f.anio}
                       onChange={e => setF({ ...f, anio: Number(e.target.value) })} />
            <FormControl fullWidth size="small">
              <InputLabel>Valor *</InputLabel>
              <Select label="Valor *" value={f.clave}
                      onChange={e => setF({ ...f, clave: String(e.target.value) })}>
                <MenuItem value="UVT">UVT</MenuItem>
                <MenuItem value="SMMLV">Salario mínimo</MenuItem>
                <MenuItem value="AUXILIO_TRANSPORTE">Auxilio de transporte</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" fullWidth type="number" label="Monto en pesos *"
                       value={f.valor} onChange={e => setF({ ...f, valor: e.target.value })} />
            <TextField size="small" fullWidth label="Fuente" value={f.fuente}
                       onChange={e => setF({ ...f, fuente: e.target.value })}
                       helperText="La norma que lo fija. Es lo que permite verificarlo después." />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" disabled={!f.valor || guardar.isPending}
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

// ─── Simulador ────────────────────────────────────────────────────────────────

interface Liquidacion {
  base_gravada: string; total_impuestos: string; total_retenciones: string
  total_documento: string; neto_a_pagar: string
  detalle: Array<{
    impuesto: string; concepto: string; base: string; tarifa: string
    valor: string; motivo?: string | null; bloqueado?: boolean
  }>
}

/**
 * Qué se retendría sobre una base, y por qué no cuando no se retiene.
 *
 * El motivo es la mitad útil del resultado: en una revisión, poder explicar por
 * qué no se retuvo vale tanto como el número.
 */
export function PanelSimulador({ empresaId }: { empresaId: number | null }) {
  const [base, setBase] = useState('1000000')
  const [concepto, setConcepto] = useState('Compras generales')
  const [fecha, setFecha] = useState(hoy())
  const [resultado, setResultado] = useState<Liquidacion | null>(null)

  const simular = useMutation({
    mutationFn: () => apiClient.post('/erp/tributacion/simular', null, {
      params: { empresa_id: empresaId, base: Number(base), concepto, fecha },
    }).then(r => r.data as Liquidacion),
    onSuccess: setResultado,
    onError: (e: any) => { setResultado(null); toast.error(mensajeDeError(e)) },
  })

  if (empresaId == null) return null

  return (
    <>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Las retenciones se calculan sobre la base gravada, nunca sobre el total:
        incluir el IVA en la base es un error clásico y caro. El ReteIVA sí va
        sobre el IVA.
      </Typography>

      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" alignItems="flex-start">
        <TextField size="small" type="number" label="Base gravada" value={base}
                   onChange={e => setBase(e.target.value)} sx={{ width: 180 }} />
        <TextField size="small" label="Concepto" value={concepto}
                   onChange={e => setConcepto(e.target.value)} sx={{ width: 240 }} />
        <TextField size="small" type="date" label="Fecha del documento" value={fecha}
                   onChange={e => setFecha(e.target.value)}
                   InputLabelProps={{ shrink: true }} sx={{ width: 180 }} />
        <Button variant="contained" startIcon={<Calculate />}
                disabled={simular.isPending} onClick={() => simular.mutate()}
                sx={{ textTransform: 'none', bgcolor: ERP_COLOR,
                      '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}>
          Simular
        </Button>
      </Stack>

      {resultado && (
        <>
          <Stack direction="row" spacing={3} mb={2} flexWrap="wrap">
            {[
              ['Base gravada', resultado.base_gravada],
              ['Impuestos', resultado.total_impuestos],
              ['Retenciones', resultado.total_retenciones],
              ['Total documento', resultado.total_documento],
              ['Neto a pagar', resultado.neto_a_pagar],
            ].map(([etiqueta, valor]) => (
              <Box key={etiqueta}>
                <Typography variant="caption" color="text.secondary">
                  {String(etiqueta).toUpperCase()}
                </Typography>
                <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {pesos(Number(valor))}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Card variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.04) }}>
                  <TableCell sx={{ fontWeight: 700 }}>IMPUESTO</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>BASE</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>TARIFA</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>VALOR</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>POR QUÉ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultado.detalle.map((d, i) => (
                  <TableRow key={i} hover>
                    <TableCell>
                      <Chip size="small" label={d.impuesto}
                            color={colorImpuesto[d.impuesto] ?? 'default'} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {pesos(Number(d.base))}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {d.tarifa}%
                    </TableCell>
                    <TableCell align="right"
                               sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {pesos(Number(d.valor))}
                    </TableCell>
                    <TableCell>
                      {d.motivo ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Tooltip title={d.motivo}>
                            <HelpOutline fontSize="small"
                                         color={d.bloqueado ? 'error' : 'disabled'} />
                          </Tooltip>
                          <Typography variant="caption"
                                      color={d.bloqueado ? 'error' : 'text.secondary'}>
                            {d.motivo}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Aplicada
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  )
}
