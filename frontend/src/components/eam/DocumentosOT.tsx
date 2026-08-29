/**
 * Documentos de una orden de trabajo.
 *
 * Cada tipo tiene su botón —cotización, orden de compra, factura, informe
 * técnico— en vez de un único «adjuntar» con un desplegable: el tipo es lo que
 * después permite encontrar el documento, y con un desplegable la mayoría
 * termina en «Otro».
 *
 * Al adjuntar una cotización o una factura se pide además su número, su valor y
 * el proveedor. Son tres campos que evitan tener que abrir el PDF para saber de
 * qué se trata, y hacen que la búsqueda sirva de algo.
 *
 * Los documentos son SOPORTE y nada más: el valor que se captura acá no toca el
 * costo de la orden, que se lleva en sus trabajos, repuestos y servicios. Si
 * alguna vez se quisiera que lo alimentara, tendría que ser una decisión
 * explícita y visible, no un efecto de adjuntar un archivo.
 */
import { useRef, useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, Chip, IconButton, Tooltip, Skeleton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  Table, TableBody, TableCell, TableHead, TableRow, LinearProgress,
} from '@mui/material'
import {
  RequestQuote, ShoppingCart, ReceiptLong, Description, AttachFile,
  Download, DeleteForever, PhotoCamera,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'

interface Adjunto {
  id: number
  ot_id: number
  ot_numero?: string | null
  tipo: string
  tipo_label?: string | null
  nombre: string
  tamano?: number | null
  numero_documento?: string | null
  fecha_documento?: string | null
  valor?: number | null
  proveedor?: string | null
  notas?: string | null
  subido_por?: string | null
  created_at?: string | null
}

/** Los tipos con botón propio. El resto entra por «Otro». */
const BOTONES = [
  { tipo: 'COTIZACION', label: 'Cotización', icono: <RequestQuote />, conDatos: true },
  { tipo: 'ORDEN_COMPRA', label: 'Orden de compra', icono: <ShoppingCart />, conDatos: true },
  { tipo: 'FACTURA', label: 'Factura', icono: <ReceiptLong />, conDatos: true },
  { tipo: 'INFORME_TECNICO', label: 'Informe técnico', icono: <Description />, conDatos: false },
  { tipo: 'FOTO', label: 'Fotografía', icono: <PhotoCamera />, conDatos: false },
  { tipo: 'OTRO', label: 'Otro', icono: <AttachFile />, conDatos: false },
]

const COLOR_TIPO: Record<string, string> = {
  COTIZACION: COLOR_MODULO,
  ORDEN_COMPRA: ESTADO.alerta,
  FACTURA: ESTADO.peligro,
  INFORME_TECNICO: ESTADO.exito,
  FOTO: PALETA.grafito,
  OTRO: PALETA.acero,
}

const peso = (b?: number | null) =>
  !b ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB`
    : `${(b / 1048576).toFixed(1)} MB`

const pesos = (v?: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(v)

const dia = (f?: string | null) => {
  if (!f) return '—'
  const [a, m, d] = f.slice(0, 10).split('-').map(Number)
  return Number.isFinite(a) ? `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}` : f
}

async function descargar(a: Adjunto) {
  try {
    const r = await api.get(`/eam/ot-adjuntos/${a.id}/descargar`, { responseType: 'blob' })
    const url = URL.createObjectURL(r.data)
    const el = document.createElement('a')
    el.href = url; el.download = a.nombre
    document.body.appendChild(el); el.click(); el.remove()
    URL.revokeObjectURL(url)
  } catch {
    toast.error('No se pudo descargar el documento')
  }
}

// ─── Diálogo de carga ─────────────────────────────────────────────────────────

function DialogoSubir({
  otId, definicion, onCerrar,
}: {
  otId: number
  definicion: typeof BOTONES[number] | null
  onCerrar: () => void
}) {
  const qc = useQueryClient()
  const entrada = useRef<HTMLInputElement>(null)
  const [archivos, setArchivos] = useState<File[]>([])
  const [f, setF] = useState({
    numero_documento: '', fecha_documento: '', valor: '', proveedor: '', notas: '',
  })
  const [listo, setListo] = useState<string | null>(null)

  // Se limpia al cambiar de tipo, para no arrastrar los datos del anterior.
  if (definicion && listo !== definicion.tipo) {
    setListo(definicion.tipo)
    setArchivos([])
    setF({ numero_documento: '', fecha_documento: '', valor: '', proveedor: '', notas: '' })
  }

  const subir = useMutation({
    mutationFn: async () => {
      const cuerpo = new FormData()
      archivos.forEach(a => cuerpo.append('archivos', a))
      cuerpo.append('tipo', definicion!.tipo)
      for (const [k, v] of Object.entries(f)) if (v.trim()) cuerpo.append(k, v.trim())
      const { data } = await api.post(`/eam/ots/${otId}/adjuntos`, cuerpo)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ot-adjuntos', otId] })
      onCerrar()
      toast.success('Documento adjuntado')
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail ?? 'No se pudo adjuntar el documento'),
  })

  const set = (k: keyof typeof f) => (e: any) => setF(p => ({ ...p, [k]: e.target.value }))

  return (
    <Dialog open={!!definicion} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Adjuntar {definicion?.label.toLowerCase()}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Button
            startIcon={<AttachFile />} variant="outlined" onClick={() => entrada.current?.click()}
            sx={{ textTransform: 'none' }}
          >
            Elegir archivos
          </Button>
          <input
            ref={entrada} type="file" hidden multiple
            onChange={e => {
              setArchivos(a => [...a, ...Array.from(e.target.files ?? [])])
              e.target.value = ''
            }}
          />
          {archivos.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {archivos.map((a, i) => (
                <Chip key={i} label={`${a.name} · ${peso(a.size)}`} size="small"
                  onDelete={() => setArchivos(x => x.filter((_, j) => j !== i))} />
              ))}
            </Stack>
          )}

          {definicion?.conDatos && (
            <>
              <Alert severity="info" sx={{ py: 0.5 }}>
                Con estos datos se puede encontrar el documento y cotejar cifras sin
                tener que abrirlo. El valor queda como dato del soporte:{' '}
                <strong>no se suma al costo de la orden</strong>, que se lleva en
                trabajos, repuestos y servicios.
              </Alert>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="N.º del documento" value={f.numero_documento}
                  onChange={set('numero_documento')} fullWidth
                  placeholder="COT-8891"
                />
                <TextField
                  label="Fecha" type="date" value={f.fecha_documento}
                  onChange={set('fecha_documento')} fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Valor" value={f.valor} onChange={set('valor')} fullWidth
                  placeholder="1250000"
                  helperText="Solo informativo. Admite el formato de la factura: $ 1.250.000"
                />
                <TextField
                  label="Proveedor" value={f.proveedor} onChange={set('proveedor')} fullWidth
                />
              </Stack>
            </>
          )}

          <TextField label="Notas" value={f.notas} onChange={set('notas')}
            fullWidth multiline rows={2} />
          {subir.isPending && <LinearProgress sx={{ borderRadius: 99 }} />}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button
          variant="contained" onClick={() => subir.mutate()}
          disabled={subir.isPending || archivos.length === 0}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {subir.isPending ? 'Subiendo…' : 'Adjuntar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Sección ──────────────────────────────────────────────────────────────────

export function DocumentosOT({ otId, otNumero }: { otId: number; otNumero?: string | null }) {
  const qc = useQueryClient()
  const [subiendo, setSubiendo] = useState<typeof BOTONES[number] | null>(null)

  const { data: adjuntos = [], isLoading } = useQuery<Adjunto[]>({
    queryKey: ['ot-adjuntos', otId],
    queryFn: () => api.get(`/eam/ots/${otId}/adjuntos`).then(r => r.data),
  })

  const borrar = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/ot-adjuntos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ot-adjuntos', otId] })
      toast.success('Documento eliminado')
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail ?? 'No se pudo eliminar'),
  })

  return (
    <Box>
      <Stack direction="row" alignItems="center" mb={1.5}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={800}>Documentos</Typography>
          <Typography variant="caption" color="text.secondary">
            Quedan asociados a {otNumero ?? 'esta orden'} y se pueden consultar por su número.
            Son soporte: <strong>no modifican los costos de la orden</strong>.
          </Typography>
        </Box>
        <Chip label={`${adjuntos.length}`} size="small" sx={{ fontWeight: 700 }} />
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={0.75} mb={2}>
        {BOTONES.map(b => (
          <Button
            key={b.tipo} size="small" variant="outlined" startIcon={b.icono}
            onClick={() => setSubiendo(b)}
            sx={{
              textTransform: 'none', fontWeight: 600, fontSize: 12,
              borderColor: `${COLOR_TIPO[b.tipo]}66`, color: COLOR_TIPO[b.tipo],
              '&:hover': { borderColor: COLOR_TIPO[b.tipo], bgcolor: `${COLOR_TIPO[b.tipo]}0F` },
            }}
          >
            {b.label}
          </Button>
        ))}
      </Stack>

      {isLoading && <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />}

      {!isLoading && adjuntos.length === 0 && (
        <Card variant="outlined" sx={{ borderRadius: 2, p: 3, textAlign: 'center' }}>
          <AttachFile sx={{ fontSize: 30, color: PALETA.acero, opacity: 0.5 }} />
          <Typography variant="body2" color="text.secondary" mt={1}>
            Esta orden todavía no tiene documentos.
          </Typography>
        </Card>
      )}

      {adjuntos.length > 0 && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>TIPO</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ARCHIVO</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>N.º DOC.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>FECHA</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  <Tooltip title="Valor del documento. No afecta el costo de la orden.">
                    <span>VALOR DOC.</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>PROVEEDOR</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {adjuntos.map(a => (
                <TableRow key={a.id} hover>
                  <TableCell>
                    <Chip label={a.tipo_label ?? a.tipo} size="small" sx={{
                      height: 20, fontSize: 10.5, fontWeight: 700,
                      bgcolor: `${COLOR_TIPO[a.tipo] ?? PALETA.acero}1A`,
                      color: COLOR_TIPO[a.tipo] ?? PALETA.acero,
                    }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {peso(a.tamano)}{a.subido_por ? ` · ${a.subido_por}` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {a.numero_documento ?? '—'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{dia(a.fecha_documento)}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {pesos(a.valor)}
                  </TableCell>
                  <TableCell sx={{ color: PALETA.grafito }}>{a.proveedor ?? '—'}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Descargar">
                      <IconButton size="small" onClick={() => descargar(a)}>
                        <Download fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" onClick={() => borrar.mutate(a.id)}>
                        <DeleteForever fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <DialogoSubir otId={otId} definicion={subiendo} onCerrar={() => setSubiendo(null)} />
    </Box>
  )
}
