/**
 * Centro de informes del CMMS.
 *
 * Antes eran 1.712 líneas sobre datos escritos en el código. Ahora el catálogo
 * y los datos salen de `/eam/reportes`.
 *
 * CÓMO ESTÁ ARMADO
 * Hay una sola tabla que se dibuja a partir de las columnas que declara el
 * informe. Veinte informes con veinte pantallas casi iguales es veinte veces el
 * mismo error por corregir; acá el servidor dice qué columnas hay y de qué tipo,
 * y la pantalla —y el Excel— se arman solos.
 *
 * Los informes que ya viven en otro módulo se listan pero se abren allá. Traer
 * una copia de esas cifras acá sería la tercera versión de la misma fórmula, y
 * la tercera es la que empieza a dar otro número.
 */
import { useMemo, useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, Chip, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow, MenuItem, InputAdornment,
  Tooltip,
} from '@mui/material'
import {
  Download, Search, Assessment, OpenInNew, ArrowBack, TableChart,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { PALETA, COLOR_MODULO } from '@/config/marca'
import { apiClient as api } from '@/api/client'
import { descargarExcel } from '@/utils/excel'

const R = '/eam/reportes'

interface Columna { clave: string; titulo: string; tipo: string }

interface Informe {
  clave: string; nombre: string; descripcion: string; categoria: string
  columnas: Columna[]; ruta_modulo?: string | null
}

interface Resultado {
  clave: string; nombre: string; columnas: Columna[]
  periodo_dias: number; total: number; filas: Record<string, any>[]
}

const pesos = (v?: any) =>
  v == null || v === '' ? '—' : new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v))

const fecha = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/** Formatea una celda según el tipo que declara la columna. */
function celda(valor: any, tipo: string) {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (tipo === 'moneda') return pesos(valor)
  if (tipo === 'fecha') return fecha(valor)
  if (tipo === 'porcentaje') return `${valor}%`
  if (tipo === 'numero') return Number(valor).toLocaleString('es-CO',
    { maximumFractionDigits: 2 })
  return String(valor)
}

const NUMERICO = new Set(['numero', 'moneda', 'porcentaje'])

export default function EAMReportes() {
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState<Informe | null>(null)
  const [dias, setDias] = useState(180)
  const [busqueda, setBusqueda] = useState('')

  const { data: catalogo = [], isLoading } = useQuery<Informe[]>({
    queryKey: ['rep-catalogo'], queryFn: () => api.get(`${R}/catalogo`).then(r => r.data) })

  const { data: resultado, isFetching } = useQuery<Resultado>({
    queryKey: ['rep-datos', abierto?.clave, dias],
    queryFn: () => api.get(`${R}/${abierto!.clave}`, { params: { dias } }).then(r => r.data),
    enabled: !!abierto && !abierto.ruta_modulo,
  })

  const porCategoria = useMemo(() => {
    const g: Record<string, Informe[]> = {}
    for (const i of catalogo) {
      if (busqueda && !`${i.nombre} ${i.descripcion} ${i.categoria}`
        .toLowerCase().includes(busqueda.toLowerCase())) continue
      (g[i.categoria] ??= []).push(i)
    }
    return g
  }, [catalogo, busqueda])

  const filtradas = useMemo(() => {
    if (!resultado) return []
    if (!busqueda || abierto) return resultado.filas
    return resultado.filas
  }, [resultado, busqueda, abierto])

  const bajar = () => {
    if (!resultado) return
    descargarExcel(`reporte_${resultado.clave}`, resultado.filas,
      resultado.columnas.map(c => ({ titulo: c.titulo, valor: c.clave })),
      resultado.nombre.slice(0, 31))
  }

  /* ── Un informe abierto ─────────────────────────────────────────────── */
  if (abierto && !abierto.ruta_modulo) {
    return (
      <Layout title="Reportes">
        <Box className="anim-page-in">
          <Stack direction="row" alignItems="flex-end" spacing={2} mb={2.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Typography variant="h6" fontWeight={800}>{abierto.nombre}</Typography>
              <Typography variant="caption" color="text.secondary">
                {abierto.descripcion}
              </Typography>
            </Box>
            <TextField select size="small" label="Periodo" value={dias} sx={{ width: 150 }}
              onChange={e => setDias(Number(e.target.value))}>
              <MenuItem value={30}>30 días</MenuItem>
              <MenuItem value={90}>90 días</MenuItem>
              <MenuItem value={180}>6 meses</MenuItem>
              <MenuItem value={365}>1 año</MenuItem>
              <MenuItem value={730}>2 años</MenuItem>
            </TextField>
            <Button startIcon={<Download />} variant="outlined" onClick={bajar}
              disabled={!resultado?.total} sx={{ textTransform: 'none' }}>Excel</Button>
            <Button startIcon={<ArrowBack />} onClick={() => setAbierto(null)}
              sx={{ textTransform: 'none' }}>Volver</Button>
          </Stack>

          {isFetching ? <Skeleton variant="rectangular" height={340} sx={{ borderRadius: 3 }} /> : (
            <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
              <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${PALETA.niebla}` }}>
                <Typography variant="caption" color="text.secondary">
                  {resultado?.total ?? 0} filas · últimos {resultado?.periodo_dias ?? dias} días
                </Typography>
              </Box>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {(resultado?.columnas ?? []).map(c => (
                      <TableCell key={c.clave} sx={{ fontWeight: 700, fontSize: 11 }}
                        align={NUMERICO.has(c.tipo) ? 'right' : 'left'}>
                        {c.titulo.toUpperCase()}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtradas.map((fila, i) => (
                    <TableRow key={i} hover>
                      {(resultado?.columnas ?? []).map(c => (
                        <TableCell key={c.clave} sx={{
                          fontSize: 12.5,
                          fontVariantNumeric: NUMERICO.has(c.tipo) ? 'tabular-nums' : undefined,
                          fontWeight: c.tipo === 'moneda' ? 600 : undefined,
                        }} align={NUMERICO.has(c.tipo) ? 'right' : 'left'}>
                          {celda(fila[c.clave], c.tipo)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {(!resultado || resultado.total === 0) && (
                    <TableRow>
                      <TableCell colSpan={resultado?.columnas.length || 1}
                        sx={{ py: 5, textAlign: 'center' }}>
                        <TableChart sx={{ fontSize: 36, color: PALETA.acero, opacity: 0.4 }} />
                        <Typography variant="body2" color="text.secondary" mt={1}>
                          Sin datos en el periodo. Los informes salen de órdenes cerradas.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </Box>
      </Layout>
    )
  }

  /* ── El catálogo ────────────────────────────────────────────────────── */
  return (
    <Layout title="Reportes">
      <Box className="anim-page-in">
        <Stack direction="row" alignItems="flex-end" spacing={2} mb={2.5} flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography variant="h6" fontWeight={800}>Centro de informes</Typography>
            <Typography variant="caption" color="text.secondary">
              Todos se descargan en Excel, con los números como números
            </Typography>
          </Box>
          <TextField size="small" placeholder="Buscar informe…" value={busqueda}
            onChange={e => setBusqueda(e.target.value)} sx={{ width: 280 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
        </Stack>

        {isLoading ? <Skeleton variant="rectangular" height={340} sx={{ borderRadius: 3 }} /> : (
          Object.entries(porCategoria).map(([categoria, informes]) => (
            <Box key={categoria} mb={3}>
              <Typography variant="caption" sx={{
                fontWeight: 800, letterSpacing: '0.08em', color: PALETA.grafito }}>
                {categoria.toUpperCase()}
              </Typography>
              <Box sx={{ display: 'grid', gap: 1.5, mt: 1,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' } }}>
                {informes.map(i => (
                  <Card key={i.clave} sx={{
                    borderRadius: 3, p: 2, cursor: 'pointer', height: '100%',
                    border: `1px solid ${PALETA.niebla}`,
                    transition: 'border-color .18s ease, transform .18s ease',
                    '&:hover': { borderColor: COLOR_MODULO, transform: 'translateY(-2px)' },
                  }} onClick={() => i.ruta_modulo ? navigate(i.ruta_modulo) : setAbierto(i)}>
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800}>{i.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          {i.descripcion}
                        </Typography>
                      </Box>
                      {i.ruta_modulo ? (
                        <Tooltip title="Se consulta en su propio módulo: traer una copia acá sería otra versión de la misma cifra">
                          <OpenInNew sx={{ fontSize: 16, color: PALETA.acero }} />
                        </Tooltip>
                      ) : (
                        <Assessment sx={{ fontSize: 16, color: COLOR_MODULO }} />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={0.75} mt={1.25}>
                      {i.ruta_modulo ? (
                        <Chip label="En su módulo" size="small" sx={{
                          height: 19, fontSize: 10, fontWeight: 700,
                          bgcolor: `${PALETA.acero}1A`, color: PALETA.grafito }} />
                      ) : (
                        <Chip label={`${i.columnas.length} columnas`} size="small" sx={{
                          height: 19, fontSize: 10, fontWeight: 700,
                          bgcolor: `${COLOR_MODULO}1A`, color: COLOR_MODULO }} />
                      )}
                    </Stack>
                  </Card>
                ))}
              </Box>
            </Box>
          ))
        )}

        {!isLoading && Object.keys(porCategoria).length === 0 && (
          <Card sx={{ borderRadius: 3, p: 5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Ningún informe coincide con «{busqueda}».
            </Typography>
          </Card>
        )}
      </Box>
    </Layout>
  )
}
