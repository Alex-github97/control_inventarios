/**
 * La planta: cómo está compuesta y cómo está produciendo.
 *
 * Antes esta pantalla eran 96 KB de plantas, líneas, máquinas y operarios
 * escritos en el código, con cuatro pestañas que repetían el alta que la
 * configuración del módulo ya hacía de verdad. Se veía completa y no había
 * forma de que mostrara la planta de nadie.
 *
 * Ahora hace dos cosas y ninguna es dar de alta:
 *
 *   1. Muestra el estado real de cada línea —sus celdas, sus máquinas, sus
 *      órdenes abiertas y su avance— leyendo de la operación.
 *   2. Abre el esquema de la línea, que es donde se dibuja por dónde entra el
 *      material y en qué orden lo recorren las máquinas.
 *
 * El alta se quedó en Configuración, que es donde estaba funcionando. Dos
 * formularios para crear la misma máquina es la forma segura de terminar con
 * dos máquinas.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, Chip, Skeleton, TextField, MenuItem,
  LinearProgress, Divider, Tooltip, Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Factory, PrecisionManufacturing, AccountTree, Timeline, Inventory2,
  ArrowBack, Settings, PlayArrow, WarningAmber,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { PALETA, COLOR_MODULO } from '@/config/marca'
import { apiClient as api } from '@/api/client'
import { DisenadorFlujo } from '@/components/mes/DisenadorFlujo'

interface Planta {
  id: number; codigo: string; nombre: string
  ciudad?: string | null; tipo_fabricacion: string; activo: boolean
}

interface LineaTablero {
  id: number; codigo: string; nombre: string
  capacidad_hora?: number | null; unidad_medida?: string | null
  celdas: { id: number; codigo: string; nombre: string; equipos: number }[]
  total_celdas: number; total_equipos: number
  nodos_esquema: number; tiene_esquema: boolean
  ordenes_abiertas: number
  cantidad_planificada: number; cantidad_producida: number; cantidad_scrap: number
  avance_pct?: number | null; scrap_pct?: number | null
  estado: string
}

interface Tablero {
  planta: { id: number; codigo: string; nombre: string; ciudad?: string | null
            tipo_fabricacion: string }
  lineas: LineaTablero[]
  totales: {
    lineas: number; celdas: number; equipos: number
    lineas_con_esquema: number; ordenes_abiertas: number; produccion_en_curso: number
  }
}

const COLOR_ESTADO: Record<string, string> = {
  PRODUCIENDO: '#16A34A',
  CONFIGURADA: COLOR_MODULO,
  'SIN ESQUEMA': '#D97706',
}

const numero = (v?: number | null, d = 0) =>
  v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: d })

/* ── Una cifra del encabezado ──────────────────────────────────────────────── */

function Cifra({ etiqueta, valor, icono, color }: {
  etiqueta: string; valor: string | number; icono: JSX.Element; color: string
}) {
  return (
    <Card sx={{ p: 1.75, borderRadius: 3, border: `1px solid ${PALETA.niebla}`,
      height: '100%' }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid',
          placeItems: 'center', bgcolor: `${color}1A`, color }}>{icono}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 19, fontWeight: 800, lineHeight: 1.1 }}>
            {valor}
          </Typography>
          <Typography sx={{ fontSize: 11, color: PALETA.acero }} noWrap>
            {etiqueta}
          </Typography>
        </Box>
      </Stack>
    </Card>
  )
}

/* ── La tarjeta de una línea ───────────────────────────────────────────────── */

function TarjetaLinea({ linea, onAbrirEsquema }: {
  linea: LineaTablero; onAbrirEsquema: () => void
}) {
  const color = COLOR_ESTADO[linea.estado] || PALETA.acero
  return (
    <Card sx={{
      p: 2, borderRadius: 3, height: '100%',
      border: `1px solid ${PALETA.niebla}`, borderLeft: `4px solid ${color}`,
      transition: 'transform .18s ease, box-shadow .18s ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 26px rgba(15,23,42,.10)' },
    }}>
      <Stack direction="row" alignItems="flex-start" spacing={1} mb={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
            color: PALETA.acero }}>{linea.codigo}</Typography>
          <Typography sx={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.2 }} noWrap>
            {linea.nombre}
          </Typography>
        </Box>
        <Chip label={linea.estado} size="small" sx={{
          height: 20, fontSize: 10, fontWeight: 800,
          bgcolor: `${color}1A`, color }} />
      </Stack>

      <Stack direction="row" spacing={2} mb={1.25}>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{linea.total_celdas}</Typography>
          <Typography sx={{ fontSize: 10.5, color: PALETA.acero }}>celdas</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{linea.total_equipos}</Typography>
          <Typography sx={{ fontSize: 10.5, color: PALETA.acero }}>máquinas</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{linea.nodos_esquema}</Typography>
          <Typography sx={{ fontSize: 10.5, color: PALETA.acero }}>etapas</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{linea.ordenes_abiertas}</Typography>
          <Typography sx={{ fontSize: 10.5, color: PALETA.acero }}>órdenes</Typography>
        </Box>
      </Stack>

      {linea.ordenes_abiertas > 0 ? (
        <Box mb={1.25}>
          <Stack direction="row" justifyContent="space-between" mb={0.4}>
            <Typography sx={{ fontSize: 11, color: PALETA.acero }}>
              {numero(linea.cantidad_producida)} de {numero(linea.cantidad_planificada)}
              {linea.unidad_medida ? ` ${linea.unidad_medida}` : ''}
            </Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color }}>
              {linea.avance_pct != null ? `${linea.avance_pct}%` : '—'}
            </Typography>
          </Stack>
          <LinearProgress variant="determinate"
            value={Math.min(100, linea.avance_pct ?? 0)}
            sx={{ height: 6, borderRadius: 3, bgcolor: `${color}22`,
              '& .MuiLinearProgress-bar': { bgcolor: color } }} />
          {linea.scrap_pct != null && linea.scrap_pct > 0 && (
            <Typography sx={{ fontSize: 10.5, color: '#DC2626', mt: 0.4 }}>
              {linea.scrap_pct}% de scrap en lo producido
            </Typography>
          )}
        </Box>
      ) : (
        <Typography sx={{ fontSize: 11.5, color: PALETA.acero, mb: 1.25 }}>
          Sin órdenes en curso.
          {linea.capacidad_hora
            ? ` Capacidad: ${numero(linea.capacidad_hora)} ${linea.unidad_medida || ''}/h.`
            : ''}
        </Typography>
      )}

      <Divider sx={{ mb: 1.25 }} />
      <Stack direction="row" spacing={1} alignItems="center">
        <Button size="small" variant={linea.tiene_esquema ? 'outlined' : 'contained'}
          startIcon={<AccountTree sx={{ fontSize: 16 }} />}
          onClick={onAbrirEsquema} sx={{ textTransform: 'none', fontSize: 12 }}>
          {linea.tiene_esquema ? 'Ver el esquema' : 'Dibujar el esquema'}
        </Button>
        {!linea.tiene_esquema && (
          <Tooltip title="Sin esquema no se sabe por dónde entra el material ni en qué orden lo recorre">
            <WarningAmber sx={{ fontSize: 17, color: '#D97706' }} />
          </Tooltip>
        )}
      </Stack>
    </Card>
  )
}

/* ── La pantalla ───────────────────────────────────────────────────────────── */

export default function MESPlanta() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [plantaId, setPlantaId] = useState<number | null>(null)
  const lineaEsquema = params.get('linea') ? Number(params.get('linea')) : null

  const { data: plantas = [], isLoading: cargandoPlantas } = useQuery<Planta[]>({
    queryKey: ['mes-plantas'], queryFn: () => api.get('/mes/plantas').then(r => r.data) })

  // La primera planta se escoge sola: obligar a elegir cuando solo hay una es
  // un clic que no decide nada.
  useEffect(() => {
    if (plantaId == null && plantas.length) setPlantaId(plantas[0].id)
  }, [plantas, plantaId])

  const { data: tablero, isLoading } = useQuery<Tablero>({
    queryKey: ['mes-tablero', plantaId],
    queryFn: () => api.get(`/mes/plantas/${plantaId}/tablero`).then(r => r.data),
    enabled: plantaId != null,
  })

  const lineaAbierta = useMemo(
    () => tablero?.lineas.find(l => l.id === lineaEsquema) || null,
    [tablero, lineaEsquema])

  const abrirEsquema = (id: number) => setParams({ linea: String(id) })
  const cerrarEsquema = () => setParams({})

  /* ── El esquema de una línea ──────────────────────────────────────────── */
  if (lineaEsquema) {
    return (
      <Layout title="Planta">
        <Box className="anim-page-in">
          <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
            <Button startIcon={<ArrowBack />} onClick={cerrarEsquema}
              sx={{ textTransform: 'none' }}>Volver a la planta</Button>
            {lineaAbierta && (
              <Chip label={`${lineaAbierta.total_equipos} máquinas disponibles`}
                size="small" sx={{ height: 22, fontWeight: 700,
                  bgcolor: `${COLOR_MODULO}1A`, color: COLOR_MODULO }} />
            )}
          </Stack>
          <DisenadorFlujo lineaId={lineaEsquema} />
        </Box>
      </Layout>
    )
  }

  /* ── El tablero ───────────────────────────────────────────────────────── */
  return (
    <Layout title="Planta">
      <Box className="anim-page-in">
        <Stack direction="row" alignItems="flex-end" spacing={2} mb={2.5}
          flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography variant="h6" fontWeight={800}>Planta de producción</Typography>
            <Typography variant="caption" color="text.secondary">
              Cómo está compuesta cada línea y qué está produciendo ahora
            </Typography>
          </Box>
          {plantas.length > 0 && (
            <TextField select size="small" label="Planta" sx={{ width: 260 }}
              value={plantaId ?? ''} onChange={e => setPlantaId(Number(e.target.value))}>
              {plantas.map(p => (
                <MenuItem key={p.id} value={p.id}>
                  {p.nombre}{p.ciudad ? ` · ${p.ciudad}` : ''}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Button variant="outlined" startIcon={<Settings />}
            onClick={() => navigate('/mes/config')} sx={{ textTransform: 'none' }}>
            Configuración
          </Button>
        </Stack>

        {cargandoPlantas || isLoading ? (
          <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 3 }} />
        ) : plantas.length === 0 ? (
          <Card sx={{ borderRadius: 3, p: 6, textAlign: 'center' }}>
            <Factory sx={{ fontSize: 44, color: PALETA.acero, opacity: 0.5 }} />
            <Typography variant="subtitle1" fontWeight={800} mt={1.5}>
              Todavía no hay ninguna planta
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5} mb={2.5}>
              Una planta se compone de líneas, cada línea de celdas y cada celda de
              máquinas. Ese es el orden en que conviene darlas de alta.
            </Typography>
            <Button variant="contained" startIcon={<Settings />}
              onClick={() => navigate('/mes/config')} sx={{ textTransform: 'none' }}>
              Ir a la configuración
            </Button>
          </Card>
        ) : (
          <>
            <Grid container spacing={1.5} mb={2.5}>
              {[
                { e: 'Líneas', v: tablero?.totales.lineas ?? 0,
                  i: <PrecisionManufacturing sx={{ fontSize: 18 }} />, c: COLOR_MODULO },
                { e: 'Celdas de trabajo', v: tablero?.totales.celdas ?? 0,
                  i: <AccountTree sx={{ fontSize: 18 }} />, c: '#0F766E' },
                { e: 'Máquinas', v: tablero?.totales.equipos ?? 0,
                  i: <Factory sx={{ fontSize: 18 }} />, c: '#7C3AED' },
                { e: 'Líneas con esquema', v: `${tablero?.totales.lineas_con_esquema ?? 0}/${tablero?.totales.lineas ?? 0}`,
                  i: <Timeline sx={{ fontSize: 18 }} />, c: '#D97706' },
                { e: 'Órdenes abiertas', v: tablero?.totales.ordenes_abiertas ?? 0,
                  i: <PlayArrow sx={{ fontSize: 18 }} />, c: '#16A34A' },
                { e: 'Producido en curso', v: numero(tablero?.totales.produccion_en_curso),
                  i: <Inventory2 sx={{ fontSize: 18 }} />, c: '#0EA5E9' },
              ].map(x => (
                <Grid key={x.e} size={{ xs: 6, sm: 4, lg: 2 }}>
                  <Cifra etiqueta={x.e} valor={x.v} icono={x.i} color={x.c} />
                </Grid>
              ))}
            </Grid>

            {tablero && tablero.lineas.length === 0 ? (
              <Card sx={{ borderRadius: 3, p: 5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {tablero.planta.nombre} todavía no tiene líneas. Se crean en la
                  configuración del módulo.
                </Typography>
              </Card>
            ) : (
              <>
                {tablero && tablero.totales.lineas_con_esquema < tablero.totales.lineas && (
                  <Alert severity="info" sx={{ mb: 2, py: 0.4, fontSize: 12.5,
                    borderRadius: 2 }}>
                    Hay líneas sin esquema. Mientras no se dibuje, la línea es una
                    lista de máquinas: no se sabe por dónde entra el material ni
                    cuál es la etapa que marca el ritmo.
                  </Alert>
                )}
                <Grid container spacing={1.75}>
                  {tablero?.lineas.map(l => (
                    <Grid key={l.id} size={{ xs: 12, md: 6, xl: 4 }}>
                      <TarjetaLinea linea={l} onAbrirEsquema={() => abrirEsquema(l.id)} />
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </>
        )}
      </Box>
    </Layout>
  )
}
