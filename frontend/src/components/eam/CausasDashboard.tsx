/**
 * Causas de falla en el tablero de mantenimiento.
 *
 * Sale de los análisis de causa raíz de las órdenes, cruzados con el activo:
 * cada OT va sobre un activo, y cada activo tiene marca y línea. Eso permite
 * pasar de «qué nos falla» a «qué nos falla en esta flota», que es donde la
 * respuesta sirve para decidir algo.
 *
 * Los filtros se encadenan: al elegir una marca, la lista de líneas se acota a
 * las suyas.
 */
import { useState } from 'react'
import {
  Box, Card, Typography, Stack, Chip, Skeleton, Alert, TextField, MenuItem,
  Divider, Tooltip, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import { Science, WarningAmber } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'

interface Fila { etiqueta: string; cantidad: number; costo: number; horas: number }
interface Analitica {
  total: number; cerrados: number; costo_total: number; horas_total: number
  acciones_vencidas: number
  por_causa: Fila[]; por_modo_falla: Fila[]; por_marca: Fila[]
  por_linea: Fila[]; por_tipo_activo: Fila[]; por_activo: Fila[]
}
interface Resumen {
  id: number; ot_id: number; ot_numero?: string | null
  fecha_analisis?: string | null; estado: string
  categoria_causa?: string | null; modo_falla?: string | null
  causa_raiz?: string | null; costo_estimado?: number | null
  activo?: string | null; marca?: string | null; linea?: string | null
}

const pesos = (v: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(v || 0)

/** Barras horizontales: con pocas categorías se leen mejor que una torta. */
function Ranking({ titulo, ayuda, filas, color }: {
  titulo: string; ayuda: string; filas: Fila[]; color: string
}) {
  const tope = Math.max(1, ...filas.map(f => f.cantidad))
  return (
    <Card sx={{ borderRadius: 3, p: 2.5, height: '100%' }}>
      <Typography variant="subtitle2" fontWeight={800}>{titulo}</Typography>
      <Typography variant="caption" color="text.secondary">{ayuda}</Typography>
      {filas.length === 0 ? (
        <Typography variant="body2" sx={{ py: 3, textAlign: 'center', color: PALETA.acero }}>
          Sin datos todavía
        </Typography>
      ) : (
        <Stack spacing={1.25} mt={2}>
          {filas.map(f => (
            <Box key={f.etiqueta}>
              <Stack direction="row" alignItems="baseline" spacing={1}>
                <Typography variant="caption" sx={{ flex: 1, fontWeight: 600 }}>
                  {f.etiqueta}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>
                  {f.cantidad}
                </Typography>
                {f.costo > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    · {pesos(f.costo)}
                  </Typography>
                )}
              </Stack>
              <Tooltip title={`${f.cantidad} análisis · ${pesos(f.costo)} · ${f.horas} h de parada`}>
                <Box sx={{
                  mt: 0.4, height: 7, borderRadius: 99, bgcolor: color,
                  width: `${(f.cantidad / tope) * 100}%`, minWidth: 4,
                }} />
              </Tooltip>
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  )
}

export function CausasDashboard() {
  const [marca, setMarca] = useState('')
  const [linea, setLinea] = useState('')

  const { data, isLoading } = useQuery<Analitica>({
    queryKey: ['rca-analitica', marca, linea],
    queryFn: () => api.get('/eam/causa-raiz/analitica', {
      params: { marca: marca || undefined, linea: linea || undefined },
    }).then(r => r.data),
  })

  // Sin filtrar, para poder ofrecer siempre todas las marcas en el selector.
  const { data: completo } = useQuery<Analitica>({
    queryKey: ['rca-analitica', '', ''],
    queryFn: () => api.get('/eam/causa-raiz/analitica').then(r => r.data),
  })

  const { data: casos = [] } = useQuery<Resumen[]>({
    queryKey: ['rca-listado', marca, linea],
    queryFn: () => api.get('/eam/causa-raiz', {
      params: { marca: marca || undefined, linea: linea || undefined },
    }).then(r => r.data),
  })

  if (isLoading || !data) {
    return <Skeleton variant="rectangular" height={340} sx={{ borderRadius: 3 }} />
  }

  const marcas = completo?.por_marca ?? []
  // La línea viene etiquetada con su marca; al filtrar por marca se muestran
  // solo las suyas, que es lo que se espera al encadenar los filtros.
  const lineas = (completo?.por_linea ?? []).filter(
    l => !marca || l.etiqueta.startsWith(marca))

  return (
    <Box>
      <Stack direction="row" alignItems="flex-end" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="subtitle2" fontWeight={800}>Causas de falla</Typography>
          <Typography variant="caption" color="text.secondary">
            De los análisis de causa raíz de las órdenes de trabajo
          </Typography>
        </Box>
        <TextField select size="small" label="Marca" value={marca} sx={{ minWidth: 170 }}
          onChange={e => { setMarca(e.target.value); setLinea('') }}>
          <MenuItem value="">Todas</MenuItem>
          {marcas.map(m => (
            <MenuItem key={m.etiqueta} value={m.etiqueta}>{m.etiqueta}</MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Línea" value={linea} sx={{ minWidth: 190 }}
          onChange={e => setLinea(e.target.value)}>
          <MenuItem value="">Todas</MenuItem>
          {lineas.map(l => {
            // El valor que espera el servidor es la línea sola, sin la marca.
            const solo = marca ? l.etiqueta.replace(`${marca} `, '') : l.etiqueta
            return <MenuItem key={l.etiqueta} value={solo}>{l.etiqueta}</MenuItem>
          })}
        </TextField>
      </Stack>

      {data.total === 0 ? (
        <Card sx={{ borderRadius: 3, p: 5, textAlign: 'center' }}>
          <Science sx={{ fontSize: 40, color: PALETA.acero, opacity: 0.4 }} />
          <Typography variant="body2" color="text.secondary" mt={1.5}>
            Todavía no hay análisis de causa raíz
            {marca || linea ? ' con esos filtros' : ''}.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Se registran dentro de cada orden de trabajo y aparecen acá al guardarlos.
          </Typography>
        </Card>
      ) : (
        <>
          <Card sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              <Box sx={{ flex: 1, minWidth: 130 }}>
                <Typography variant="caption" color="text.secondary">Análisis</Typography>
                <Typography variant="h6" fontWeight={800}>{data.total}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {data.cerrados} cerrados
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <Typography variant="caption" color="text.secondary">Costo de las fallas</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: ESTADO.peligro }}>
                  {pesos(data.costo_total)}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ flex: 1, minWidth: 130 }}>
                <Typography variant="caption" color="text.secondary">Horas de parada</Typography>
                <Typography variant="h6" fontWeight={800}>{data.horas_total}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <Typography variant="caption" color="text.secondary">Acciones vencidas</Typography>
                <Typography variant="h6" fontWeight={800} sx={{
                  color: data.acciones_vencidas > 0 ? ESTADO.peligro : ESTADO.exito,
                }}>
                  {data.acciones_vencidas}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  comprometidas y sin cerrar
                </Typography>
              </Box>
            </Stack>
          </Card>

          {data.acciones_vencidas > 0 && (
            <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}>
              Hay {data.acciones_vencidas} acciones con fecha vencida. Los análisis se
              están haciendo pero no se están cerrando: la falla puede repetirse.
            </Alert>
          )}

          <Box sx={{
            display: 'grid', gap: 2, mb: 2,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}>
            <Ranking titulo="Por categoría de causa"
              ayuda="Por qué falla, agrupado" filas={data.por_causa} color={COLOR_MODULO} />
            <Ranking titulo="Por modo de falla"
              ayuda="Cómo se manifiesta" filas={data.por_modo_falla} color={ESTADO.alerta} />
            <Ranking titulo="Por marca"
              ayuda="Qué flota concentra las fallas" filas={data.por_marca}
              color={PALETA.grafito} />
            <Ranking titulo="Por línea"
              ayuda="El detalle dentro de cada marca" filas={data.por_linea}
              color={PALETA.acero} />
          </Box>

          <Card sx={{ borderRadius: 3, mb: 2 }}>
            <Box sx={{ p: 2.5, pb: 1 }}>
              <Typography variant="subtitle2" fontWeight={800}>Análisis registrados</Typography>
              <Typography variant="caption" color="text.secondary">
                Del gráfico al caso concreto
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>OT</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ACTIVO</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>CAUSA</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>MODO DE FALLA</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">COSTO</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ESTADO</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {casos.map(c => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {c.ot_numero}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.activo ?? '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[c.marca, c.linea].filter(Boolean).join(' ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: PALETA.grafito }}>
                      {c.categoria_causa ?? '—'}
                    </TableCell>
                    <TableCell sx={{ color: PALETA.grafito }}>{c.modo_falla ?? '—'}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {c.costo_estimado ? pesos(c.costo_estimado) : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip label={c.estado} size="small" sx={{
                        height: 20, fontSize: 10, fontWeight: 700,
                        bgcolor: c.estado === 'CERRADO' ? `${ESTADO.exito}1A` : `${ESTADO.alerta}1F`,
                        color: c.estado === 'CERRADO' ? ESTADO.exito : ESTADO.alerta,
                      }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </Box>
  )
}
