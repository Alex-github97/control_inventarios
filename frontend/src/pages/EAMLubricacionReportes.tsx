/**
 * Interpretación de muestras de aceite.
 *
 * QUÉ ES ESTA PANTALLA
 * El informe completo del programa de análisis de aceite: qué le pasa a cada
 * motor, por qué, contra qué criterio, y cómo se comporta la flota con el
 * recorrido. El orden de las pestañas es deliberado:
 *
 *   1. Cobertura   — a cuántos equipos deja fuera todo lo que sigue.
 *   2. Tablero     — cómo va el programa: qué dispara, qué cuesta, qué acierta.
 *   3. Conclusiones— la tabla de qué le pasa a cada placa y qué hacer.
 *   4. Por placa   — el seguimiento de un motor, con la tendencia entre las dos
 *                    últimas muestras.
 *   5. Correlación — si los mecanismos de la literatura se están cumpliendo con
 *                    los datos de esta flota.
 *   6. Dashboard   — el comportamiento contra el kilometraje.
 *   7. Extensión   — si se puede estirar el intervalo, y qué lo impide.
 *   8. Criterios   — los límites vigentes y de dónde sale cada uno.
 *
 * La cobertura va primero por una razón: sin ella, todo lo que sigue mide una
 * parte de la flota y se lee como si midiera toda.
 *
 * EL FILTRO ES UNO Y VIVE ARRIBA
 * Se declara en el componente raíz y baja a todas las pestañas. Con un filtro
 * por pestaña, cambiar de pestaña perdería el segmento y habría que volver a
 * escogerlo cada vez —que es justo lo que hace que nadie use un filtro—.
 *
 * DE DÓNDE SALE EL CRITERIO
 * De normas y literatura, no de la costumbre. Cada hallazgo muestra el método
 * del ensayo y, aparte, el origen del umbral: son dos cosas distintas y las
 * normas ASTM definen la primera, casi nunca la segunda. La pestaña de
 * criterios lo lista todo con su fuente.
 */
import { useMemo, useState } from 'react'
import {
  Alert, Box, Chip, Collapse, IconButton, MenuItem, Popover, Stack, Tab, Tabs,
  TextField, Tooltip, Typography, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  CancelOutlined, CheckCircle, Dashboard as DashboardIcon, EventBusy,
  ExpandLess, ExpandMore, GridOn, HelpOutline, InsertChartOutlined,
  MenuBook, Schedule, Science, ScatterPlot, Speed, TrendingUp, WarningAmber,
} from '@mui/icons-material'
import {
  CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Scatter,
  ScatterChart, Tooltip as RTooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { FiltrosFlota } from '@/components/lube/FiltrosFlota'
import {
  COLOR_ESTADO, COLOR_GRUPO, COLOR_NATURALEZA, ETIQUETA_GRUPO,
  ETIQUETA_NATURALEZA, colorCorrelacion, interpretacionApi, km,
  type DetalleParametro, type FiltroFlota, type FilaTablero,
  type Fuente, type LimiteAplicado, type ParametroDispersion,
} from '@/api/lubeInterpretacion'
import {
  ACENTO, BORDE, Encabezados, Estado, Panel, fecha, pesos,
} from '@/components/datos/vista'

const LUBE = ACENTO
const MONO = 'ui-monospace, SFMono-Regular, monospace'

/** Las claves de caché llevan el filtro entero: cambiarlo tiene que recargar. */
const clave = (que: string, f: FiltroFlota, extra?: unknown) =>
  ['lube', que, JSON.stringify(f), extra] as const

export default function EAMLubricacionReportes() {
  const [tab, setTab] = useState(0)
  const [filtro, setFiltro] = useState<FiltroFlota>({})

  const opciones = useQuery({
    queryKey: ['lube', 'filtros'],
    queryFn: () => interpretacionApi.filtros(),
  })

  const totalMuestras = useMemo(() => {
    const p = opciones.data?.placas ?? []
    const visibles = p.filter(x =>
      (!filtro.marca || x.marca === filtro.marca)
      && (!filtro.linea || x.linea === filtro.linea)
      && (!filtro.modelo || x.modelo === filtro.modelo)
      && (!filtro.placa || x.valor === filtro.placa))
    return { muestras: visibles.reduce((s, x) => s + x.muestras, 0),
             equipos: visibles.length }
  }, [opciones.data, filtro])

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${LUBE} 0%, #B45309 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Science sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Interpretación de muestras de aceite
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Qué le pasa a cada motor, por qué, y qué hacer — según norma
            </Typography>
          </Box>
        </Box>

        <FiltrosFlota valor={filtro} onCambio={setFiltro}
          opciones={opciones.data} cargando={opciones.isLoading}
          resumen={`${totalMuestras.muestras} muestra(s) · ${totalMuestras.equipos} equipo(s)`} />

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable"
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: `${LUBE} !important` },
            '& .MuiTabs-indicator': { bgcolor: LUBE },
          }}>
          <Tab icon={<EventBusy sx={{ fontSize: 16 }} />} iconPosition="start" label="Cobertura" />
          <Tab icon={<DashboardIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Tablero" />
          <Tab icon={<WarningAmber sx={{ fontSize: 16 }} />} iconPosition="start" label="Conclusiones" />
          <Tab icon={<TrendingUp sx={{ fontSize: 16 }} />} iconPosition="start" label="Por placa" />
          <Tab icon={<GridOn sx={{ fontSize: 16 }} />} iconPosition="start" label="Correlación" />
          <Tab icon={<InsertChartOutlined sx={{ fontSize: 16 }} />} iconPosition="start" label="Contra kilometraje" />
          <Tab icon={<Schedule sx={{ fontSize: 16 }} />} iconPosition="start" label="Extensión del intervalo" />
          <Tab icon={<MenuBook sx={{ fontSize: 16 }} />} iconPosition="start" label="Criterios y normas" />
        </Tabs>

        {tab === 0 && <Cobertura f={filtro} />}
        {tab === 1 && <Tablero f={filtro} />}
        {tab === 2 && <Conclusiones f={filtro} />}
        {tab === 3 && <PorPlaca f={filtro} />}
        {tab === 4 && <Correlacion f={filtro} />}
        {tab === 5 && <ContraKilometraje f={filtro} />}
        {tab === 6 && <Extension f={filtro} />}
        {tab === 7 && <Criterios f={filtro} />}
      </Box>
    </Layout>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Piezas compartidas
   ═══════════════════════════════════════════════════════════════════════════ */

function Cifra({ valor, etiqueta, color, nota, onClick, activo }: {
  valor: number | string; etiqueta: string; color: string
  nota?: string; onClick?: () => void; activo?: boolean
}) {
  return (
    <Box onClick={onClick} sx={{
      border: `1px solid ${alpha(color, activo ? 0.8 : 0.3)}`,
      borderRadius: 2, p: 2, height: '100%',
      cursor: onClick ? 'pointer' : 'default',
      bgcolor: activo ? alpha(color, 0.07) : 'transparent',
    }}>
      <Typography sx={{ fontSize: 26, fontWeight: 900, lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </Typography>
      <Typography sx={{ fontSize: 11, color, fontWeight: 600, mt: 0.25 }}>
        {etiqueta}
      </Typography>
      {nota && (
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.4 }}>
          {nota}
        </Typography>
      )}
    </Box>
  )
}

/** La insignia que dice qué autoridad tiene un umbral. */
function Naturaleza({ limite }: { limite?: LimiteAplicado | null }) {
  if (!limite?.naturaleza) return null
  const col = COLOR_NATURALEZA[limite.naturaleza] ?? '#64748B'
  const partes = [
    limite.metodo ? `Ensayo: ${limite.metodo}` : null,
    limite.criterio ? `Umbral: ${limite.criterio}` : null,
    limite.n ? `sobre ${limite.n} mediciones` : null,
    limite.porque,
  ].filter(Boolean)
  return (
    <Tooltip title={<Box sx={{ fontSize: 11.5, lineHeight: 1.5 }}>
      {partes.map((p, i) => <div key={i}>{p}</div>)}
    </Box>}>
      <Chip label={ETIQUETA_NATURALEZA[limite.naturaleza] ?? limite.naturaleza}
        size="small" sx={{
          height: 17, fontSize: 9, fontWeight: 800,
          bgcolor: alpha(col, 0.13), color: col,
        }} />
    </Tooltip>
  )
}

/** Las normas que respaldan una conclusión, con su título al pasar el ratón. */
function Fuentes({ codigos, fuentes }: {
  codigos?: string[]; fuentes?: Record<string, Fuente>
}) {
  if (!codigos?.length) return null
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {codigos.map(c => (
        <Tooltip key={c} title={
          fuentes?.[c]
            ? <Box sx={{ fontSize: 11.5, lineHeight: 1.5 }}>
                <b>{fuentes[c].titulo}</b><br />{fuentes[c].define}
              </Box>
            : c
        }>
          <Chip label={c} size="small" sx={{
            height: 17, fontSize: 9, fontWeight: 700, fontFamily: MONO,
            bgcolor: '#EEF2FF', color: '#3730A3',
          }} />
        </Tooltip>
      ))}
    </Stack>
  )
}

const PERIODOS = [
  { v: 90, t: 'Últimos 3 meses' }, { v: 180, t: 'Últimos 6 meses' },
  { v: 365, t: 'Último año' }, { v: 730, t: 'Últimos 2 años' },
  { v: 1460, t: 'Últimos 4 años' },
]

function Periodo({ valor, onCambio, min = 90 }: {
  valor: number; onCambio: (v: number) => void; min?: number
}) {
  return (
    <TextField select size="small" label="Período" sx={{ width: 180 }}
      value={valor} onChange={e => onCambio(Number(e.target.value))}>
      {PERIODOS.filter(p => p.v >= min).map(p => (
        <MenuItem key={p.v} value={p.v}>{p.t}</MenuItem>
      ))}
    </TextField>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. Cobertura
   ═══════════════════════════════════════════════════════════════════════════ */

function Cobertura({ f }: { f: FiltroFlota }) {
  const anio = new Date().getFullYear()
  const d = useQuery({
    queryKey: clave('cobertura', f, anio),
    queryFn: () => interpretacionApi.cobertura(anio, f),
  })
  const c = d.data

  return (
    <Estado cargando={d.isLoading} error={d.error} vacio={!c}>
      <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
        Esto va primero a propósito. Todo lo demás en esta pantalla se calcula
        sobre los equipos que sí tienen muestra: un motor sin muestra no es un
        motor sano, es un motor del que no se sabe nada.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { etiqueta: `Con muestra en ${c?.anio}`,
            valor: c?.con_muestra_en_el_anio ?? 0, color: '#059669' },
          { etiqueta: 'Cobertura', valor: `${c?.cobertura_pct ?? 0}%`,
            color: (c?.cobertura_pct ?? 0) >= 90 ? '#059669' : '#F59E0B' },
          { etiqueta: 'Sin muestra este año',
            valor: c?.sin_muestra_en_el_anio.length ?? 0, color: '#F59E0B' },
          { etiqueta: 'Nunca muestreados',
            valor: c?.sin_historico.length ?? 0, color: '#EF4444' },
        ].map((k, i) => (
          <Grid key={i} size={{ xs: 6, md: 3 }}><Cifra {...k} /></Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Panel>
            <Box sx={{ p: 2, borderBottom: `1px solid ${BORDE}` }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                Sin muestra en {c?.anio}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                Tienen histórico y se les venció el turno. Hay que programarlos.
              </Typography>
            </Box>
            <Estado vacio={!c?.sin_muestra_en_el_anio.length}
              mensajeVacio="Todos los equipos con histórico se muestrearon este año"
              hint="Cobertura completa: el resto del informe habla de toda la flota.">
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Familia', 'Placa', 'Compartimento',
                    'Última muestra', 'Lleva']} />
                  <tbody>
                    {c?.sin_muestra_en_el_anio.map(x => {
                      const dias = x.ultima_muestra
                        ? Math.round((Date.now() - new Date(x.ultima_muestra).getTime()) / 86_400_000)
                        : null
                      return (
                        <tr key={x.compartimento_id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>{x.familia_motor}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, fontFamily: MONO }}>{x.placa}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12 }}>{x.compartimento}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fecha(x.ultima_muestra)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                                       color: (dias ?? 0) > 365 ? '#EF4444' : '#F59E0B' }}>
                            {dias == null ? '—' : `${dias} días`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Box>
            </Estado>
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Panel>
            <Box sx={{ p: 2, borderBottom: `1px solid ${BORDE}` }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                Nunca muestreados
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                No tienen histórico. Antes de programarlos hay que verificar que
                tengan por dónde tomar la muestra.
              </Typography>
            </Box>
            <Estado vacio={!c?.sin_historico.length}
              mensajeVacio="Todos los equipos tienen al menos una muestra"
              hint="No hay puntos ciegos en el programa.">
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Familia', 'Placa', 'Compartimento']} />
                  <tbody>
                    {c?.sin_historico.map(x => (
                      <tr key={x.compartimento_id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>{x.familia_motor}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, fontFamily: MONO }}>{x.placa}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>{x.compartimento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Estado>
          </Panel>
        </Grid>
      </Grid>
    </Estado>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. Tablero del programa
   ═══════════════════════════════════════════════════════════════════════════ */

function Tablero({ f }: { f: FiltroFlota }) {
  const [dias, setDias] = useState(365)
  const d = useQuery({
    queryKey: clave('programa', f, dias),
    queryFn: () => interpretacionApi.programa(dias, f),
  })
  const p = d.data

  return (
    <Estado cargando={d.isLoading} error={d.error} vacio={!p}>
      <Box sx={{ mb: 2 }}><Periodo valor={dias} onCambio={setDias} /></Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Cifra etiqueta="Muestras" color={LUBE} valor={p?.total_muestras ?? 0} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Cifra etiqueta="Críticas" valor={p?.criticas ?? 0}
            color={p?.criticas ? '#EF4444' : '#059669'} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Cifra etiqueta="Acierto del diagnóstico" color="#2563EB"
            valor={p?.diagnostico.acierto_pct != null
              ? `${p.diagnostico.acierto_pct}%` : '—'}
            nota={`${p?.diagnostico.confirmados ?? 0} confirmados · ${p?.diagnostico.desmentidos ?? 0} desmentidos`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Cifra etiqueta="Sin puerto de muestreo"
            valor={`${p?.sin_puerto_muestreo ?? 0} de ${p?.compartimentos ?? 0}`}
            color={p?.sin_puerto_muestreo ? '#F59E0B' : '#059669'}
            nota="Condiciona la calidad del dato" />
        </Grid>
      </Grid>

      {p?.drenajes.some(x => x.evitable) && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>
          Hay cargas drenadas por motivos marcados como evitables. Esos cambios
          son oportunidad perdida: el aceite salió antes de tiempo por algo que
          se podía prevenir.
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ParametrosQueDisparan parametros={p?.parametros ?? []} f={f} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Ranking titulo="Motivos de drenaje"
            ayuda="Por qué se saca el aceite, y cuánto rindió"
            filas={(p?.drenajes ?? []).map(x => ({
              etiqueta: x.etiqueta, valor: x.cantidad,
              texto: `${x.cantidad} · ${x.vida_promedio ?? '—'} prom.`,
              color: x.evitable ? '#EF4444' : '#F59E0B',
            }))} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Ranking titulo="Por marca"
            ayuda="Qué flota concentra los análisis críticos"
            filas={(p?.por_marca ?? []).map(x => ({
              etiqueta: x.etiqueta, valor: x.cantidad,
              texto: `${x.cantidad}${x.criticas ? ` · ${x.criticas} críticas` : ''}`,
              color: x.criticas ? '#EF4444' : '#94A3B8',
            }))} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Ranking titulo="Costo por unidad de vida"
            ayuda="Aceite, filtro, mano de obra y rellenos, por hora o kilómetro lubricado"
            filas={(p?.costos ?? []).map(x => ({
              etiqueta: x.etiqueta, valor: x.costo_por_unidad ?? 0,
              texto: `${pesos(x.costo_por_unidad)} / ${(x.unidad ?? '').toLowerCase()}`,
              color: LUBE,
            }))} />
        </Grid>
      </Grid>
    </Estado>
  )
}

interface FilaRanking {
  etiqueta: string; valor: number; texto: string; color: string
  codigo?: string; nota?: string
}

/**
 * Ranking horizontal con desplazamiento.
 *
 * El alto está fijo a propósito: el cuadro no crece con la cantidad de filas,
 * así que los cuatro paneles del tablero conservan el mismo tamaño aunque uno
 * tenga tres filas y otro treinta. La lista completa sigue estando: se llega a
 * ella con la rueda del ratón.
 */
function Ranking({ titulo, ayuda, filas, onClic, activo, alto = 260 }: {
  titulo: string; ayuda: string; filas: FilaRanking[]
  onClic?: (f: FilaRanking, e: React.MouseEvent<HTMLElement>) => void
  activo?: string | null
  alto?: number
}) {
  const tope = Math.max(1, ...filas.map(x => x.valor))
  return (
    <Panel sx={{ p: 2.5, height: '100%' }}>
      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{titulo}</Typography>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{ayuda}</Typography>
      {filas.length === 0 ? (
        <Typography sx={{ py: 4, textAlign: 'center', fontSize: 12.5,
                          color: 'text.disabled' }}>
          Sin datos todavía
        </Typography>
      ) : (
        <Box sx={{ mt: 1.5, maxHeight: alto, overflowY: 'auto', pr: 0.5 }}>
          <Stack spacing={1.1}>
            {filas.map(x => (
              <Box key={x.codigo ?? x.etiqueta}
                onClick={onClic ? e => onClic(x, e) : undefined}
                sx={{
                  cursor: onClic ? 'pointer' : 'default',
                  borderRadius: 1, p: onClic ? 0.6 : 0,
                  mx: onClic ? -0.6 : 0,
                  bgcolor: activo === x.codigo ? alpha(x.color, 0.09) : 'transparent',
                  '&:hover': onClic ? { bgcolor: alpha(x.color, 0.06) } : undefined,
                }}>
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 600 }}>
                    {x.etiqueta}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800,
                                    whiteSpace: 'nowrap',
                                    fontVariantNumeric: 'tabular-nums' }}>
                    {x.texto}
                  </Typography>
                </Stack>
                <Box sx={{
                  mt: 0.35, height: 6, borderRadius: 99, bgcolor: x.color,
                  width: `${Math.max(2, (x.valor / tope) * 100)}%`,
                }} />
                {x.nota && (
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.2 }}>
                    {x.nota}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Panel>
  )
}

/**
 * Los parámetros que disparan, todos, con su correlación al hacer clic.
 *
 * SIN TOPE Y CON SCROLL
 * La lista trae todo lo que se disparó alguna vez. Un tope de doce da la foto
 * general y estorba exactamente cuando se busca un parámetro concreto, que
 * casi nunca está entre los doce primeros.
 *
 * EL PANEL QUEDA FIJO HASTA QUE SE CIERRE
 * Se abre con clic —no al pasar el ratón— y se queda ahí. Un mapa de calor de
 * treinta filas no se puede leer si desaparece al mover el cursor.
 */
function ParametrosQueDisparan({ parametros, f }: {
  parametros: { codigo: string; etiqueta: string; grupo?: string | null
                unidad?: string | null; origen?: string | null
                cantidad: number; criticas: number; equipos: number }[]
  f: FiltroFlota
}) {
  const [ancla, setAncla] = useState<HTMLElement | null>(null)
  const [codigo, setCodigo] = useState<string | null>(null)

  return (
    <>
      <Ranking titulo="Parámetros que más disparan"
        ayuda="Qué está fallando. Clic en uno para ver con qué viene acompañado."
        activo={codigo}
        onClic={(x, e) => {
          setCodigo(x.codigo ?? null)
          setAncla(e.currentTarget)
        }}
        filas={parametros.map(x => ({
          codigo: x.codigo,
          etiqueta: x.etiqueta,
          valor: x.cantidad,
          texto: `${x.cantidad}${x.criticas ? ` · ${x.criticas} crít.` : ''}`,
          color: COLOR_GRUPO[x.grupo ?? ''] ?? '#EF4444',
          nota: `${x.equipos} equipo(s) · ${ETIQUETA_GRUPO[x.grupo ?? ''] ?? x.grupo ?? ''}`,
        }))} />

      <Popover
        open={!!ancla && !!codigo} anchorEl={ancla}
        onClose={() => { setAncla(null); setCodigo(null) }}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
        slotProps={{ paper: { sx: { borderRadius: 2, maxWidth: 480 } } }}
      >
        {codigo && <MapaCorrelacion codigo={codigo} f={f} />}
      </Popover>
    </>
  )
}

/** El mapa de calor de un parámetro contra todos los demás. Pearson. */
function MapaCorrelacion({ codigo, f }: { codigo: string; f: FiltroFlota }) {
  const d = useQuery({
    queryKey: clave('correlacion-de', f, codigo),
    queryFn: () => interpretacionApi.correlacionDe(codigo, f),
  })
  const c = d.data

  return (
    <Box sx={{ p: 2, width: 460 }}>
      <Estado cargando={d.isLoading} error={d.error} vacio={!c}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>
          {c?.nombre}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1.5 }}>
          Correlación de Pearson contra el resto de los parámetros, sobre{' '}
          {c?.muestras} muestra(s) del segmento.
        </Typography>

        <Estado vacio={!c?.contra.length}
          mensajeVacio="No hay pares con muestras suficientes"
          hint="Hacen falta al menos seis muestras con los dos parámetros medidos.">
          <Box sx={{ maxHeight: 340, overflowY: 'auto' }}>
            <Stack spacing={0.5}>
              {c?.contra.map(x => (
                <Tooltip key={x.codigo} placement="left" title={
                  <Box sx={{ fontSize: 11.5, lineHeight: 1.5 }}>
                    {x.r === null
                      ? 'No se pudo calcular: una de las series es constante.'
                      : `r = ${x.r} sobre ${x.n} muestras`}
                    {x.origen_probable && <><br />{x.origen_probable}</>}
                  </Box>
                }>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{
                      width: 46, height: 22, borderRadius: 0.75, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: colorCorrelacion(x.r),
                      color: x.r !== null && Math.abs(x.r) > 0.55 ? '#fff' : '#334155',
                      fontSize: 10.5, fontWeight: 800, fontFamily: MONO,
                    }}>
                      {x.r === null ? '—' : x.r.toFixed(2)}
                    </Box>
                    <Typography sx={{ flex: 1, fontSize: 12 }} noWrap>
                      {x.nombre}
                    </Typography>
                    <Chip label={ETIQUETA_GRUPO[x.grupo ?? ''] ?? '—'} size="small"
                      sx={{
                        height: 16, fontSize: 8.5, fontWeight: 700, flexShrink: 0,
                        bgcolor: alpha(COLOR_GRUPO[x.grupo ?? ''] ?? '#94A3B8', 0.13),
                        color: COLOR_GRUPO[x.grupo ?? ''] ?? '#64748B',
                      }} />
                    <Typography sx={{ fontSize: 10, color: 'text.disabled',
                                      width: 26, textAlign: 'right' }}>
                      {x.n}
                    </Typography>
                  </Stack>
                </Tooltip>
              ))}
            </Stack>
          </Box>
        </Estado>

        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 1.5,
                          lineHeight: 1.5 }}>
          {c?.nota}
        </Typography>
      </Estado>
    </Box>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. Conclusiones
   ═══════════════════════════════════════════════════════════════════════════ */

function Conclusiones({ f }: { f: FiltroFlota }) {
  const [dias, setDias] = useState(180)
  const [estado, setEstado] = useState('Todos')
  const [abierta, setAbierta] = useState<number | null>(null)

  const d = useQuery({
    queryKey: clave('tablero', f, dias),
    queryFn: () => interpretacionApi.tablero(dias, true, f),
  })

  const filas = (d.data?.filas ?? []).filter(
    x => estado === 'Todos' || x.estado === estado)
  const discrepan = (d.data?.filas ?? []).filter(x => x.discrepa).length

  return (
    <Estado cargando={d.isLoading} error={d.error} vacio={!d.data?.filas.length}
      mensajeVacio="Ninguna muestra con hallazgos en el período"
      hint="Todos los análisis salieron dentro de sus límites de norma.">
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {['CRITICO', 'ALERTA', 'NORMAL'].map(e => (
          <Grid key={e} size={{ xs: 4 }}>
            <Cifra valor={d.data?.resumen[e] ?? 0} color={COLOR_ESTADO[e]}
              activo={estado === e}
              onClick={() => setEstado(estado === e ? 'Todos' : e)}
              etiqueta={e === 'CRITICO' ? 'Críticas'
                : e === 'ALERTA' ? 'En alerta' : 'Normales'} />
          </Grid>
        ))}
      </Grid>

      {discrepan > 0 && (
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          En {discrepan} muestra(s) el criterio de norma y la severidad que había
          calculado el sistema con los límites configurados no coinciden. La
          columna «Estado» marca esas filas: normalmente significa que los
          límites cargados en la configuración no son los de referencia.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <Periodo valor={dias} onCambio={setDias} />
        {estado !== 'Todos' && (
          <Chip label={`Solo ${estado.toLowerCase()} — quitar filtro`} size="small"
            onDelete={() => setEstado('Todos')}
            sx={{ bgcolor: alpha(COLOR_ESTADO[estado], 0.15),
                  color: COLOR_ESTADO[estado] }} />
        )}
      </Box>

      <Panel>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <Encabezados columnas={['', 'Familia', 'Placa', 'Fecha', 'Tipo',
              'Qué está pasando', 'Acción sugerida', 'Estado']} />
            <tbody>
              {filas.map(x => (
                <FilaConclusion key={x.muestra_id} f={x}
                  fuentes={d.data?.fuentes}
                  abierta={abierta === x.muestra_id}
                  onAbrir={() => setAbierta(abierta === x.muestra_id ? null : x.muestra_id)} />
              ))}
            </tbody>
          </table>
        </Box>
      </Panel>
    </Estado>
  )
}

function FilaConclusion({ f, fuentes, abierta, onAbrir }: {
  f: FilaTablero; fuentes?: Record<string, Fuente>
  abierta: boolean; onAbrir: () => void
}) {
  const col = COLOR_ESTADO[f.estado] || '#94A3B8'
  return (
    <>
      <tr style={{ borderBottom: `1px solid ${BORDE}`, cursor: 'pointer' }}
        onClick={onAbrir}>
        <td style={{ padding: '4px 6px 4px 10px', width: 32 }}>
          <IconButton size="small">
            {abierta ? <ExpandLess sx={{ fontSize: 17 }} /> : <ExpandMore sx={{ fontSize: 17 }} />}
          </IconButton>
        </td>
        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{f.familia_motor}</td>
        <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, fontFamily: MONO, whiteSpace: 'nowrap' }}>
          {f.placa}
          {f.km != null && (
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontFamily: 'inherit' }}>
              {km(f.km)}
            </Typography>
          )}
        </td>
        <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fecha(f.fecha_toma)}</td>
        <td style={{ padding: '10px 14px' }}>
          <Typography sx={{
            fontSize: 12, fontWeight: 700, fontFamily: MONO,
            color: col, whiteSpace: 'nowrap',
          }}>{f.tipo}</Typography>
        </td>
        <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, maxWidth: 220 }}>{f.patron}</td>
        <td style={{ padding: '10px 14px', fontSize: 12, color: '#374151', maxWidth: 380 }}>
          {f.accion_sugerida}
          {f.accion_de_persona && (
            <Tooltip title="Escrita por el analista, no por el sistema">
              <Chip label="del analista" size="small" sx={{
                ml: 1, height: 17, fontSize: 9,
                bgcolor: alpha('#0EA5E9', 0.12), color: '#0369A1',
              }} />
            </Tooltip>
          )}
        </td>
        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
          <Chip label={f.estado} size="small" sx={{
            bgcolor: alpha(col, 0.15), color: col,
            border: `1px solid ${alpha(col, 0.3)}`,
            fontSize: 10, fontWeight: 800,
          }} />
          {f.discrepa && (
            <Tooltip title={`El sistema la había calificado como ${f.severidad_sistema} con los límites configurados. Acá se aplicó el criterio de norma.`}>
              <Chip label="≠" size="small" sx={{
                ml: 0.5, height: 20, fontSize: 11, fontWeight: 900,
                bgcolor: '#EEF2FF', color: '#3730A3',
              }} />
            </Tooltip>
          )}
        </td>
      </tr>
      <tr>
        <td colSpan={8} style={{ padding: 0, borderBottom: abierta ? `1px solid ${BORDE}` : 'none' }}>
          <Collapse in={abierta} unmountOnExit>
            <Box sx={{ p: 2.5, bgcolor: '#F9FAFB' }}>
              <Typography sx={{ fontSize: 12.5, lineHeight: 1.6, mb: 1.25 }}>
                {f.lectura}
              </Typography>

              <Box sx={{ p: 1.5, mb: 2, borderRadius: 1.5, bgcolor: '#fff',
                         border: `1px solid ${BORDE}` }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 800,
                                  color: 'text.secondary', letterSpacing: '.04em',
                                  mb: 0.5 }}>
                  CRITERIO APLICADO
                </Typography>
                <Typography sx={{ fontSize: 12, lineHeight: 1.55, mb: 0.75 }}>
                  {f.criterio}
                </Typography>
                {/* La regla nombra el modo de falla y el dato dice hasta dónde
                    llegó esta muestra. Cuando no coinciden hay que decirlo: si
                    no, un hallazgo que apenas rozó el umbral de precaución se
                    lee con la gravedad del modo entero. */}
                {f.severidad_del_modo !== f.severidad_norma && (
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary',
                                    mb: 0.75, lineHeight: 1.5 }}>
                    Este modo de falla es{' '}
                    <b>{f.severidad_del_modo.replace('_', ' ').toLowerCase()}</b>,
                    pero esta muestra solo alcanzó el umbral de precaución:
                    ningún parámetro llegó al límite de condena.
                  </Typography>
                )}
                <Fuentes codigos={f.fuentes} fuentes={fuentes} />
              </Box>

              {/* Los tres cruces que no salen de un parámetro suelto sino de la
                  relación entre varios. Van arriba porque son los que cambian
                  la conclusión. */}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
                {f.cruce_tbn_tan && (
                  <Chip icon={<WarningAmber sx={{ fontSize: 14 }} />}
                    label="Cruce TBN/TAN: reserva alcalina agotada" size="small"
                    sx={{ height: 22, fontSize: 10.5, fontWeight: 700,
                          bgcolor: alpha('#EF4444', 0.12), color: '#B91C1C' }} />
                )}
                {f.relacion_si_al != null && (
                  <Tooltip title="El polvo de carretera es aluminosilicato: lleva silicio y aluminio juntos. Una relación Al/Si baja apunta a que el silicio no es polvo.">
                    <Chip label={`Al/Si = ${f.relacion_si_al}`} size="small"
                      sx={{ height: 22, fontSize: 10.5, fontWeight: 700,
                            fontFamily: MONO,
                            bgcolor: '#F1F5F9', color: '#334155' }} />
                  </Tooltip>
                )}
                {f.desvio_viscosidad && (
                  <Tooltip title={`Grado ${f.desvio_viscosidad.grado}: el centro de su banda SAE J300 a 100 °C es ${f.desvio_viscosidad.referencia} cSt. Medido ${f.desvio_viscosidad.medido} cSt.`}>
                    <Chip
                      label={`Viscosidad ${f.desvio_viscosidad.direccion === 'ALTA' ? '▲' : '▼'} ${Math.abs(f.desvio_viscosidad.desvio_pct)}% vs SAE J300`}
                      size="small" sx={{
                        height: 22, fontSize: 10.5, fontWeight: 700,
                        bgcolor: alpha(f.desvio_viscosidad.estado
                          ? COLOR_ESTADO[f.desvio_viscosidad.estado] : '#94A3B8', 0.13),
                        color: f.desvio_viscosidad.estado
                          ? COLOR_ESTADO[f.desvio_viscosidad.estado] : '#64748B',
                      }} />
                  </Tooltip>
                )}
                {f.horas_aceite != null && (
                  <Chip label={`${Math.round(f.horas_aceite).toLocaleString('es-CO')} `
                    + `${(f.unidad_vida ?? 'horas').toLowerCase()} de vida del aceite`}
                    size="small" sx={{ height: 22, fontSize: 10.5,
                                       bgcolor: '#F1F5F9', color: '#334155' }} />
                )}
              </Stack>

              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary',
                                textTransform: 'uppercase', letterSpacing: '.04em', mb: 1 }}>
                Hallazgos, con el límite que los disparó
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Parámetro', 'Valor', 'Estado',
                    'Límite', 'Origen del límite', 'Tendencia',
                    'De dónde suele venir']} />
                  <tbody>
                    {f.detalle.map(p => <FilaHallazgo key={p.codigo} p={p} />)}
                  </tbody>
                </table>
              </Box>
            </Box>
          </Collapse>
        </td>
      </tr>
    </>
  )
}

function FilaHallazgo({ p }: { p: DetalleParametro }) {
  const c = COLOR_ESTADO[p.estado] || '#94A3B8'
  const l = p.limite
  // El umbral que se muestra es el que corresponde al estado alcanzado: si el
  // parámetro llegó a condena, mostrar el de precaución haría creer que se
  // quedó ahí.
  const umbral = l
    ? (p.estado === 'CONDENA' ? l.condena : l.precaucion) ?? l.condena ?? l.precaucion
    : null
  return (
    <tr style={{ borderBottom: `1px solid ${BORDE}` }}>
      <td style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600 }}>
        <Box component="span" sx={{ fontFamily: MONO, color: c, mr: 1 }}>
          {p.sigla}
        </Box>
        {p.nombre}
      </td>
      <td style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 700,
                   whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {p.texto ?? p.valor ?? '—'} {p.unidad}
      </td>
      <td style={{ padding: '8px 14px' }}>
        <Chip label={p.estado === 'TENDENCIA' ? 'tendencia' : p.estado.toLowerCase()}
          size="small" sx={{
            height: 18, fontSize: 9.5, fontWeight: 700,
            bgcolor: alpha(c, 0.15), color: c,
          }} />
      </td>
      <td style={{ padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap',
                   fontVariantNumeric: 'tabular-nums', color: '#374151' }}>
        {umbral == null ? '—'
          : `${l?.direccion === 'BAJO' ? '≤ ' : '≥ '}${umbral}`}
      </td>
      <td style={{ padding: '8px 14px' }}><Naturaleza limite={l} /></td>
      <td style={{ padding: '8px 14px', fontSize: 11.5, whiteSpace: 'nowrap',
                   color: p.tendencia ? '#4338CA' : '#9CA3AF' }}>
        {p.tendencia
          ? (p.tendencia.variacion == null ? 'apareció'
            : `▲ ${p.tendencia.variacion}%`)
          : '—'}
      </td>
      <td style={{ padding: '8px 14px', fontSize: 11.5, color: '#6B7280', maxWidth: 240 }}>
        {p.origen_probable || '—'}
      </td>
    </tr>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. Por placa
   ═══════════════════════════════════════════════════════════════════════════ */

function PorPlaca({ f }: { f: FiltroFlota }) {
  const [comp, setComp] = useState<number | ''>('')

  const d = useQuery({
    queryKey: ['lube', 'placa', comp],
    queryFn: () => interpretacionApi.placa(Number(comp), 12),
    enabled: !!comp,
  })

  return (
    <>
      <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
        Un valor alto y estable no es lo mismo que un valor que se disparó. Por
        eso lo que se compara son las dos últimas muestras y no el último
        número: es el fundamento del análisis de tendencia de ASTM D7669.
      </Alert>

      <SelectorCompartimento valor={comp} onCambio={setComp} f={f} />

      {!comp ? (
        <Panel sx={{ mt: 2 }}>
          <Estado vacio mensajeVacio="Escoja un compartimento"
            hint="Se muestra su historial y qué se movió entre las dos últimas muestras.">
            <span />
          </Estado>
        </Panel>
      ) : (
        <Estado cargando={d.isLoading} error={d.error} vacio={!d.data?.muestras.length}
          mensajeVacio="Ese compartimento no tiene muestras">
          <Box sx={{ mt: 2 }}>
            <Panel sx={{ p: 2.5, mb: 2 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 800 }}>
                {d.data?.placa} · {d.data?.compartimento}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                {d.data?.familia_motor} · {d.data?.muestras.length} muestra(s) en el historial
              </Typography>
            </Panel>

            <Panel sx={{ mb: 2 }}>
              <Box sx={{ p: 2, borderBottom: `1px solid ${BORDE}` }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                  Qué se movió entre las dos últimas muestras
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                  Lo que empeoró primero. Se omiten los cambios menores al 15%,
                  que son ruido de laboratorio.
                </Typography>
              </Box>
              <Estado vacio={!d.data?.cambios.length}
                mensajeVacio="Nada se movió de forma apreciable"
                hint="Las dos últimas muestras son prácticamente iguales.">
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <Encabezados columnas={['Parámetro', 'Penúltima', 'Última',
                      'Variación', 'Estado', 'De dónde suele venir']} />
                    <tbody>
                      {d.data?.cambios.map(c => {
                        const col = COLOR_ESTADO[c.estado] || '#94A3B8'
                        const sube = c.delta > 0
                        return (
                          <tr key={c.codigo} style={{ borderBottom: `1px solid ${BORDE}` }}>
                            <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600 }}>
                              <Box component="span" sx={{ fontFamily: MONO, color: col, mr: 1 }}>
                                {c.sigla}
                              </Box>
                              {c.nombre}
                            </td>
                            <td style={{ padding: '10px 14px', fontSize: 12.5, color: '#6B7280',
                                         fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                              {c.penultima} {c.unidad}
                            </td>
                            <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800,
                                         fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                                         color: col }}>
                              {c.ultima} {c.unidad}
                            </td>
                            <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700,
                                         whiteSpace: 'nowrap',
                                         color: sube ? '#EF4444' : '#059669' }}>
                              {sube ? '▲' : '▼'} {Math.abs(c.variacion_pct)}%
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <Chip label={c.estado} size="small" sx={{
                                height: 18, fontSize: 9.5, fontWeight: 700,
                                bgcolor: alpha(col, 0.15), color: col,
                              }} />
                            </td>
                            <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', maxWidth: 280 }}>
                              {c.origen_probable || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </Box>
              </Estado>
            </Panel>

            <Panel sx={{ p: 2.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                Tendencia histórica
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                Solo los parámetros que alguna vez salieron de rango: dibujar los
                treinta llenaría la pantalla de líneas planas.
              </Typography>
              <Grid container spacing={2}>
                {(d.data?.series ?? [])
                  .filter(s => s.puntos.some(p => p.estado !== 'NORMAL'))
                  .map(s => <Serie key={s.codigo} serie={s} />)}
              </Grid>
            </Panel>
          </Box>
        </Estado>
      )}
    </>
  )
}

function SelectorCompartimento({ valor, onCambio, f }: {
  valor: number | ''
  onCambio: (v: number | '') => void
  f: FiltroFlota
}) {
  const d = useQuery({
    queryKey: clave('compartimentos', f),
    queryFn: () => interpretacionApi.compartimentos(f),
  })

  // Vienen ordenados por severidad de la última muestra: quien abre el selector
  // suele estar buscando el que está peor, no el primero del alfabeto.
  return (
    <TextField select size="small" label="Compartimento" sx={{ minWidth: 420 }}
      value={valor} onChange={e => onCambio(Number(e.target.value) || '')}
      helperText={d.isLoading ? 'Cargando…'
        : !d.data?.length ? 'Ningún compartimento en este segmento de flota.'
        : 'Ordenados por severidad de la última muestra.'}>
      <MenuItem value=""><em>Escoja uno</em></MenuItem>
      {d.data?.map(o => (
        <MenuItem key={o.compartimento_id} value={o.compartimento_id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              bgcolor: COLOR_ESTADO[o.severidad_ultima ?? ''] ?? '#CBD5E1',
            }} />
            <Box component="span" sx={{ fontFamily: MONO, fontWeight: 700 }}>
              {o.placa}
            </Box>
            <Box component="span">· {o.compartimento}</Box>
            <Box sx={{ flex: 1 }} />
            <Box component="span" sx={{ fontSize: 11, color: 'text.disabled' }}>
              {o.muestras} muestra(s)
            </Box>
          </Box>
        </MenuItem>
      ))}
    </TextField>
  )
}

/** Una barra por muestra. Los puntos fuera de rango van en su color. */
function Serie({ serie }: { serie: any }) {
  const valores = serie.puntos.map((p: any) => p.valor)
  const max = Math.max(...valores, 1)
  const min = Math.min(...valores, 0)
  const rango = max - min || 1

  return (
    <Grid size={{ xs: 12, md: 6, xl: 4 }}>
      <Box sx={{ p: 1.75, border: `1px solid ${BORDE}`, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between',
                   alignItems: 'baseline', mb: 1 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
            <Box component="span" sx={{ fontFamily: MONO, color: LUBE, mr: 0.75 }}>
              {serie.sigla}
            </Box>
            {serie.nombre}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
            {serie.unidad}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 70 }}>
          {serie.puntos.map((p: any, i: number) => {
            const alto = ((p.valor - min) / rango) * 100
            const col = COLOR_ESTADO[p.estado] || '#CBD5E1'
            return (
              <Tooltip key={i} title={
                `${fecha(p.fecha)}${p.km != null ? ` · ${km(p.km)}` : ''} · ${p.valor} ${serie.unidad ?? ''}`
              }>
                <Box sx={{
                  flex: 1, height: `${Math.max(4, alto)}%`,
                  bgcolor: col, borderRadius: '3px 3px 0 0',
                  opacity: p.estado === 'NORMAL' ? 0.4 : 0.95,
                }} />
              </Tooltip>
            )
          })}
        </Box>
        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.75 }}>
          {serie.origen_probable || '—'}
        </Typography>
      </Box>
    </Grid>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. Correlación
   ═══════════════════════════════════════════════════════════════════════════ */

function Correlacion({ f }: { f: FiltroFlota }) {
  const [ancla, setAncla] = useState<HTMLElement | null>(null)
  const [codigo, setCodigo] = useState<string | null>(null)

  const d = useQuery({
    queryKey: clave('correlacion', f),
    queryFn: () => interpretacionApi.correlacion(f),
  })
  const c = d.data

  return (
    <Estado cargando={d.isLoading} error={d.error} vacio={!c}>
      {c && !c.suficiente ? (
        <Alert severity="warning" sx={{ fontSize: 13 }}>{c.motivo}</Alert>
      ) : (
        <>
          <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
            Que dos cosas suban juntas no prueba que una cause la otra: pueden
            tener las dos una tercera causa, o coincidir. Abajo van los
            mecanismos que describe la literatura y, al lado, lo que dicen los
            datos de esta flota. La matriz sola no decide nada.
          </Alert>

          <Panel sx={{ p: 2.5, mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
              Los mecanismos, contrastados
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
              Correlación de Pearson sobre {c?.muestras} muestras. Algunos
              eslabones predicen relación INVERSA —el combustible diluye y la
              viscosidad baja—: en esos, una correlación positiva contradice el
              mecanismo en vez de confirmarlo.
            </Typography>
            {c?.cadena.map((e, i) => <Eslabon key={i} e={e} fuentes={c.fuentes} />)}
          </Panel>

          <Panel sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
              Matriz de correlación
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
              Rojo, suben juntos; azul, uno sube cuando el otro baja. Las celdas
              en gris no se pudieron calcular por falta de muestras con los dos
              parámetros medidos: eso no es un cero. Clic en una sigla para ver
              ese parámetro contra todos los demás.
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr>
                    <th style={{ padding: 4 }} />
                    {c?.parametros.map(p => (
                      <th key={p.codigo}
                        onClick={e => { setCodigo(p.codigo); setAncla(e.currentTarget) }}
                        style={{
                          padding: '4px 2px', fontSize: 9.5, fontWeight: 700,
                          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                          height: 58, color: '#6B7280', cursor: 'pointer',
                        }}>{p.sigla}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c?.matriz.map((fila, i) => (
                    <tr key={i}>
                      <th
                        onClick={e => {
                          setCodigo(c.parametros[i].codigo)
                          setAncla(e.currentTarget)
                        }}
                        style={{
                          padding: '2px 8px 2px 0', fontSize: 10, fontWeight: 700,
                          textAlign: 'right', whiteSpace: 'nowrap', color: '#6B7280',
                          cursor: 'pointer',
                        }}>{c.parametros[i].sigla}</th>
                      {fila.map((r, j) => (
                        <Tooltip key={j} title={
                          r === null
                            ? `${c.parametros[i].nombre} vs ${c.parametros[j].nombre}: sin datos suficientes`
                            : `${c.parametros[i].nombre} vs ${c.parametros[j].nombre}: r = ${r} sobre ${c.conteos[i][j]} muestras`
                        }>
                          <td style={{
                            width: 26, height: 22, textAlign: 'center',
                            background: colorCorrelacion(r),
                            color: r !== null && Math.abs(r) > 0.55 ? '#fff' : '#334155',
                            fontSize: 9, fontWeight: 700,
                            border: '1px solid #fff',
                          }}>
                            {r === null ? '' : Math.abs(r) >= 0.4 ? r.toFixed(2).replace('0.', '.') : ''}
                          </td>
                        </Tooltip>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Panel>

          <Popover
            open={!!ancla && !!codigo} anchorEl={ancla}
            onClose={() => { setAncla(null); setCodigo(null) }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            slotProps={{ paper: { sx: { borderRadius: 2 } } }}
          >
            {codigo && <MapaCorrelacion codigo={codigo} f={f} />}
          </Popover>
        </>
      )}
    </Estado>
  )
}

function Eslabon({ e, fuentes }: { e: any; fuentes?: Record<string, Fuente> }) {
  const confirmado = e.se_confirma
  const contradice = e.contradice
  const borde = contradice ? '#EF4444' : confirmado ? '#059669' : BORDE
  return (
    <Box sx={{
      p: 1.75, mb: 1.25, borderRadius: 1.5,
      border: `1px solid ${borde === BORDE ? BORDE : alpha(borde, 0.35)}`,
      bgcolor: contradice ? alpha('#EF4444', 0.03)
        : confirmado ? alpha('#059669', 0.03) : '#F9FAFB',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75,
                 flexWrap: 'wrap' }}>
        {e.causa.map((x: string) => (
          <Chip key={x} label={x} size="small" sx={{
            height: 20, fontSize: 10, fontWeight: 700, textTransform: 'capitalize',
            bgcolor: alpha(LUBE, 0.15), color: LUBE,
          }} />
        ))}
        <Typography sx={{ color: 'text.disabled' }}>→</Typography>
        {(e.efecto ?? []).filter((x: string) => !x.startsWith('__')).map((x: string) => (
          <Chip key={x} label={`${x} ▲`} size="small" sx={{
            height: 20, fontSize: 10, fontWeight: 700, textTransform: 'capitalize',
            bgcolor: alpha('#EF4444', 0.12), color: '#B91C1C',
          }} />
        ))}
        {(e.efecto_inverso ?? []).map((x: string) => (
          <Chip key={x} label={`${x} ▼`} size="small" sx={{
            height: 20, fontSize: 10, fontWeight: 700, textTransform: 'capitalize',
            bgcolor: alpha('#2563EB', 0.12), color: '#1D4ED8',
          }} />
        ))}
        <Box sx={{ flex: 1 }} />
        {e.correlacion_media == null ? (
          <Tooltip title="No hay suficientes muestras con los dos parámetros medidos">
            <Chip icon={<HelpOutline sx={{ fontSize: 13 }} />}
              label="sin datos" size="small" sx={{
                height: 20, fontSize: 10, bgcolor: '#F1F5F9', color: '#6B7280',
              }} />
          </Tooltip>
        ) : (
          <Tooltip title={
            `Media de las correlaciones orientadas por el signo que predice el mecanismo: ${e.correlacion_media}. `
            + `Sin orientar sería ${e.correlacion_cruda}.`
          }>
            <Chip
              icon={contradice ? <CancelOutlined sx={{ fontSize: 13 }} />
                : confirmado ? <CheckCircle sx={{ fontSize: 13 }} /> : undefined}
              label={contradice ? `contradice · r = ${e.correlacion_cruda}`
                : `r = ${e.correlacion_media}`}
              size="small" sx={{
                height: 20, fontSize: 10, fontWeight: 800,
                bgcolor: alpha(contradice ? '#EF4444'
                  : confirmado ? '#059669' : '#94A3B8', 0.15),
                color: contradice ? '#B91C1C' : confirmado ? '#059669' : '#6B7280',
                '& .MuiChip-icon': { color: 'inherit' },
              }} />
          </Tooltip>
        )}
      </Box>
      <Typography sx={{ fontSize: 12.5, lineHeight: 1.55 }}>{e.porque}</Typography>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5, mb: 0.75 }}>
        <b>Qué hacer:</b> {e.accion}
      </Typography>
      <Fuentes codigos={e.fuentes} fuentes={fuentes} />
      {contradice && (
        <Typography sx={{ fontSize: 11, color: '#B91C1C', mt: 0.75, lineHeight: 1.5 }}>
          El signo salió al revés del que predice el mecanismo. Antes de dudar
          de la física, hay que revisar los datos: unidades invertidas en la
          carga del boletín, o un ensayo que no es el que dice ser.
        </Typography>
      )}
    </Box>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. Contra kilometraje
   ═══════════════════════════════════════════════════════════════════════════ */

function ContraKilometraje({ f }: { f: FiltroFlota }) {
  const [dias, setDias] = useState(1460)
  const [grupo, setGrupo] = useState('Todos')

  const ev = useQuery({
    queryKey: clave('evolucion', f, dias),
    queryFn: () => interpretacionApi.evolucion(f, dias),
  })
  const di = useQuery({
    queryKey: clave('dispersion', f, dias),
    queryFn: () => interpretacionApi.dispersion(f, dias),
  })

  const parametros = (di.data?.parametros ?? []).filter(
    p => grupo === 'Todos' || p.grupo === grupo)

  return (
    <>
      <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
        El eje es el kilometraje y no la fecha: un vehículo parado tres meses no
        envejece su aceite, y dos muestras del mismo mes con 8.000 km de
        diferencia no son comparables. Las muestras sin lectura de odómetro
        quedan fuera y se informa cuántas.
      </Alert>

      <Stack direction="row" spacing={1} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <Periodo valor={dias} onCambio={setDias} min={180} />
        {(ev.data?.sin_medidor ?? 0) > 0 && (
          <Chip label={`${ev.data?.sin_medidor} muestra(s) sin odómetro, excluidas`}
            size="small" sx={{ height: 24, fontSize: 11,
                               bgcolor: '#FEF3C7', color: '#92400E' }} />
        )}
      </Stack>

      {/* ── Sección 1: desempeño por placa a través del recorrido ───────── */}
      <Panel sx={{ p: 2.5, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
          <Speed sx={{ fontSize: 18, color: LUBE }} />
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            Desempeño de las muestras a través del kilometraje
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
          Una serie por placa. El eje vertical es cuántos parámetros salieron de
          rango en cada muestra: graficar los treinta parámetros de cada placa
          produciría un plato de espagueti, y «cuántos hallazgos» se entiende de
          un golpe. La pendiente dice si el equipo se deteriora con el recorrido.
        </Typography>
        <Estado cargando={ev.isLoading} error={ev.error}
          vacio={!ev.data?.placas.length}
          mensajeVacio="Ninguna muestra del segmento tiene lectura de odómetro"
          hint="Sin kilometraje no se puede graficar contra el recorrido.">
          <EvolucionPorPlaca placas={ev.data?.placas ?? []} />
        </Estado>
      </Panel>

      {/* ── Sección 2: un diagrama de dispersión por parámetro ──────────── */}
      <Panel sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
          <ScatterPlot sx={{ fontSize: 18, color: LUBE }} />
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            Cada parámetro contra el kilometraje
          </Typography>
          <Box sx={{ flex: 1 }} />
          <TextField select size="small" label="Grupo" sx={{ width: 165 }}
            value={grupo} onChange={e => setGrupo(e.target.value)}>
            <MenuItem value="Todos">Todos</MenuItem>
            {Object.entries(ETIQUETA_GRUPO).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
        </Stack>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
          Que un metal de desgaste suba con el recorrido es normal, y que el TBN
          baje también. Lo que hay que mirar son los que NO se comportan así: un
          silicio que sube con el kilometraje delata una entrada de polvo que se
          abre con el uso, y un hierro plano en un motor de mucho recorrido suele
          significar que las muestras no se están tomando igual. Cada panel trae
          su pendiente con la escala en que se lee, y el r al lado: la pendiente
          dice cuánto sube, y el r si ese «cuánto» significa algo.
        </Typography>
        <Estado cargando={di.isLoading} error={di.error} vacio={!parametros.length}
          mensajeVacio={di.data?.motivo ?? 'No hay parámetros con muestras suficientes'}
          hint="Se exigen al menos seis puntos con kilometraje para dibujar un panel.">
          <Grid container spacing={2}>
            {parametros.map(p => (
              <Grid key={p.codigo} size={{ xs: 12, md: 6, xl: 4 }}>
                <PanelDispersion p={p} />
              </Grid>
            ))}
          </Grid>
        </Estado>
      </Panel>
    </>
  )
}

/** Doce colores estables para las series de placa. */
const PALETA_SERIES = ['#B45309', '#1D4ED8', '#059669', '#B91C1C', '#7C3AED',
  '#0891B2', '#CA8A04', '#DB2777', '#4338CA', '#15803D', '#EA580C', '#0F766E']

function EvolucionPorPlaca({ placas }: { placas: any[] }) {
  // Con más de doce series el gráfico deja de leerse: se muestran las que más
  // muestras tienen y se dice cuántas quedaron fuera, en vez de dibujar
  // cuarenta líneas del mismo color y llamarlo un gráfico.
  const TOPE = 12
  const visibles = placas.slice(0, TOPE)
  const ocultas = placas.length - visibles.length

  return (
    <>
      <Box sx={{ width: '100%', height: 340 }}>
        <ResponsiveContainer>
          {/* La leyenda va arriba. Abajo se montaba encima del rótulo del eje
              —«TRC-001 K…metraje»— y las dos cosas quedaban ilegibles. */}
          <ScatterChart margin={{ top: 8, right: 16, bottom: 26, left: 4 }}>
            <CartesianGrid stroke="#F1F5F9" />
            <XAxis type="number" dataKey="km" name="Kilometraje"
              tick={{ fontSize: 10.5 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              label={{ value: 'Kilometraje', position: 'insideBottom',
                       offset: -16, fontSize: 11 }} />
            <YAxis type="number" dataKey="hallazgos" name="Hallazgos"
              tick={{ fontSize: 10.5 }} allowDecimals={false}
              label={{ value: 'Parámetros fuera de rango', angle: -90,
                       position: 'insideLeft', fontSize: 11 }} />
            <ZAxis range={[38, 38]} />
            <RTooltip content={<TooltipEvolucion />} />
            <Legend verticalAlign="top" align="center" height={30}
              wrapperStyle={{ fontSize: 11 }} />
            {visibles.map((p, i) => (
              <Scatter key={p.placa} name={p.placa} data={p.puntos}
                fill={PALETA_SERIES[i % PALETA_SERIES.length]}
                line={{ strokeWidth: 1.5 }} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </Box>

      {ocultas > 0 && (
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1 }}>
          Se dibujan las {TOPE} placas con más muestras. Quedan {ocultas} fuera
          del gráfico: acote el segmento con el filtro de arriba para verlas.
        </Typography>
      )}

      <Box sx={{ mt: 2, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          {/* La pendiente va por 10.000 km y no por 1.000: los odómetros de
              flota están en cientos de miles, y a escala de mil la columna sale
              llena de ceros con dos decimales que no se pueden comparar. */}
          <Encabezados columnas={['Placa', 'Marca / línea', 'Motor', 'Muestras',
            'Recorrido cubierto', 'Hallazgos por 10.000 km', 'r']} />
          <tbody>
            {placas.map(p => {
              const t = p.tendencia
              const sube = (t?.por_diez_mil ?? 0) > 0
              return (
                <tr key={p.placa} style={{ borderBottom: `1px solid ${BORDE}` }}>
                  <td style={{ padding: '9px 14px', fontSize: 12.5, fontWeight: 700,
                               fontFamily: MONO }}>{p.placa}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#6B7280' }}>
                    {[p.marca, p.linea].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#6B7280' }}>
                    {p.motor || '—'}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12,
                               fontVariantNumeric: 'tabular-nums' }}>{p.muestras}</td>
                  <td style={{ padding: '9px 14px', fontSize: 11.5, color: '#6B7280',
                               whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {km(p.km_min)} → {km(p.km_max)}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12.5, fontWeight: 700,
                               whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                               color: !t ? '#9CA3AF' : sube ? '#EF4444' : '#059669' }}>
                    {!t ? '—' : `${sube ? '▲ +' : '▼ '}${t.por_diez_mil}`}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 11.5, color: '#6B7280',
                               fontVariantNumeric: 'tabular-nums' }}>
                    {t?.r ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Box>
    </>
  )
}

function TooltipEvolucion({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${BORDE}`, borderRadius: 1.5,
               p: 1.25, fontSize: 11.5, boxShadow: 3, maxWidth: 260 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 800, fontFamily: MONO }}>
        {p.numero}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
        {p.compartimento} · {fecha(p.fecha)}
      </Typography>
      <Typography sx={{ fontSize: 11.5, mt: 0.5 }}>
        {km(p.km)} · {p.hallazgos} parámetro(s) fuera
        {p.criticos ? `, ${p.criticos} crítico(s)` : ''}
      </Typography>
      {p.severidad && (
        <Chip label={p.severidad} size="small" sx={{
          mt: 0.5, height: 17, fontSize: 9, fontWeight: 700,
          bgcolor: alpha(COLOR_ESTADO[p.severidad] ?? '#94A3B8', 0.15),
          color: COLOR_ESTADO[p.severidad] ?? '#64748B',
        }} />
      )}
    </Box>
  )
}

/**
 * La pendiente en la escala que produce un número legible.
 *
 * «0,006 ppm por cada 1.000 km» no se puede comparar de un vistazo con
 * «0,023»; a escala de diez mil son 0,06 y 0,23 y sí. Se escoge la escala por
 * la magnitud y la etiqueta viaja con el número para que no se lea uno con la
 * unidad del otro.
 */
function pendienteLegible(r: { por_mil: number; por_diez_mil: number }) {
  return Math.abs(r.por_mil) >= 1
    ? { valor: r.por_mil, escala: '1.000 km' }
    : { valor: r.por_diez_mil, escala: '10.000 km' }
}

/** Un parámetro contra el kilometraje, con su recta de mínimos cuadrados. */
function PanelDispersion({ p }: { p: ParametroDispersion }) {
  const col = COLOR_GRUPO[p.grupo ?? ''] ?? LUBE
  const r = p.regresion
  // La recta se dibuja con dos puntos, de extremo a extremo del recorrido
  // medido. Prolongarla más allá sería extrapolar sobre kilómetros que nadie
  // ha muestreado.
  const recta = r ? [
    { km: r.x_min, y: r.intercepto + r.pendiente * r.x_min },
    { km: r.x_max, y: r.intercepto + r.pendiente * r.x_max },
  ] : null

  const porEstado = (e: string[]) => p.puntos.filter(x => e.includes(x.estado))

  return (
    <Box sx={{ p: 1.75, border: `1px solid ${BORDE}`, borderRadius: 2, height: '100%' }}>
      <Stack direction="row" alignItems="baseline" spacing={1} mb={0.25}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, flex: 1 }}>
          {p.nombre}
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
          {p.unidad}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.5} mb={1} flexWrap="wrap" useFlexGap>
        <Chip label={ETIQUETA_GRUPO[p.grupo ?? ''] ?? p.grupo} size="small"
          sx={{ height: 17, fontSize: 8.5, fontWeight: 700,
                bgcolor: alpha(col, 0.13), color: col }} />
        {r ? (
          <Tooltip title={
            `Pendiente de mínimos cuadrados: ${pendienteLegible(r).valor} ${p.unidad ?? ''} `
            + `por cada ${pendienteLegible(r).escala}. `
            + `r = ${r.r ?? '—'}, r² = ${r.r2 ?? '—'} sobre ${r.n} puntos.`
          }>
            <Chip
              label={`${pendienteLegible(r).valor > 0 ? '+' : ''}${pendienteLegible(r).valor} / ${pendienteLegible(r).escala}`}
              size="small" sx={{
                height: 17, fontSize: 8.5, fontWeight: 800, fontFamily: MONO,
                bgcolor: '#F1F5F9', color: '#334155',
              }} />
          </Tooltip>
        ) : (
          <Chip label="sin recta" size="small" sx={{
            height: 17, fontSize: 8.5, bgcolor: '#F1F5F9', color: '#6B7280' }} />
        )}
        {r?.r != null && (
          <Chip label={`r = ${r.r}`} size="small" sx={{
            height: 17, fontSize: 8.5, fontWeight: 700, fontFamily: MONO,
            bgcolor: colorCorrelacion(r.r),
            color: Math.abs(r.r) > 0.55 ? '#fff' : '#334155',
          }} />
        )}
        {p.fuera_de_rango > 0 && (
          <Chip label={`${p.fuera_de_rango} fuera`} size="small" sx={{
            height: 17, fontSize: 8.5, fontWeight: 700,
            bgcolor: alpha('#EF4444', 0.12), color: '#B91C1C' }} />
        )}
      </Stack>

      <Box sx={{ width: '100%', height: 168 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: -14 }}>
            <CartesianGrid stroke="#F1F5F9" />
            <XAxis type="number" dataKey="km" tick={{ fontSize: 9.5 }}
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
            <YAxis type="number" dataKey="valor" tick={{ fontSize: 9.5 }} />
            <ZAxis range={[26, 26]} />
            <RTooltip content={<TooltipDispersion unidad={p.unidad} />} />
            {recta && (
              <ReferenceLine ifOverflow="extendDomain" stroke="#334155"
                strokeDasharray="4 3" strokeWidth={1.5}
                segment={[{ x: recta[0].km, y: recta[0].y },
                          { x: recta[1].km, y: recta[1].y }]} />
            )}
            <Scatter data={porEstado(['NORMAL'])} fill={alpha(col, 0.45)} />
            <Scatter data={porEstado(['MARGINAL'])} fill={COLOR_ESTADO.MARGINAL} />
            <Scatter data={porEstado(['CRITICO'])} fill={COLOR_ESTADO.CRITICO} />
          </ScatterChart>
        </ResponsiveContainer>
      </Box>

      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.5 }}>
        {p.puntos.length} punto(s) · min {p.minimo} · prom {p.promedio} · máx {p.maximo}
      </Typography>
    </Box>
  )
}

function TooltipDispersion({ active, payload, unidad }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${BORDE}`, borderRadius: 1.5,
               p: 1, fontSize: 11.5, boxShadow: 3 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 800, fontFamily: MONO }}>
        {p.placa}
      </Typography>
      <Typography sx={{ fontSize: 11.5 }}>
        {km(p.km)} · {p.valor} {unidad}
      </Typography>
      {p.estado !== 'NORMAL' && (
        <Chip label={p.estado} size="small" sx={{
          mt: 0.4, height: 16, fontSize: 8.5, fontWeight: 700,
          bgcolor: alpha(COLOR_ESTADO[p.estado] ?? '#94A3B8', 0.15),
          color: COLOR_ESTADO[p.estado] ?? '#64748B',
        }} />
      )}
    </Box>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. Extensión del intervalo
   ═══════════════════════════════════════════════════════════════════════════ */

function Extension({ f }: { f: FiltroFlota }) {
  const d = useQuery({
    queryKey: clave('extension', f),
    queryFn: () => interpretacionApi.extension(f),
  })
  const familias = d.data?.familias ?? []
  const pueden = familias.filter(x => x.puede_evaluarse)

  return (
    <Estado cargando={d.isLoading} error={d.error} vacio={!familias.length}
      mensajeVacio="No hay muestras suficientes para evaluar la extensión">
      <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
        Se puede extender cuando el aceite llega al cambio con reserva. No se
        puede cuando algo lo está degradando antes de tiempo: extender sobre un
        motor al que le entra refrigerante no ahorra, adelanta una reparación.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { etiqueta: 'Familias analizadas', valor: familias.length, color: LUBE },
          { etiqueta: 'Se puede evaluar la extensión', valor: pueden.length,
            color: '#059669' },
          { etiqueta: 'Con algo que lo impide',
            valor: familias.length - pueden.length, color: '#F59E0B' },
        ].map((k, i) => (
          <Grid key={i} size={{ xs: 12, md: 4 }}><Cifra {...k} /></Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {familias.map(x => (
          <Grid key={x.familia} size={{ xs: 12, lg: 6 }}>
            <Panel sx={{ p: 2.5, height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                <Typography sx={{ fontSize: 14.5, fontWeight: 800, flex: 1 }}>
                  {x.familia}
                </Typography>
                <Chip label={x.puede_evaluarse ? 'Se puede evaluar' : 'Hoy no'}
                  size="small" sx={{
                    height: 20, fontSize: 9.5, fontWeight: 800,
                    bgcolor: alpha(x.puede_evaluarse ? '#059669' : '#94A3B8', 0.14),
                    color: x.puede_evaluarse ? '#059669' : '#475569',
                  }} />
              </Stack>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1.5 }}>
                {x.equipos} equipo(s) · {x.muestras} muestra(s)
              </Typography>

              <Grid container spacing={1} sx={{ mb: 1.5 }}>
                {[
                  { t: 'TBN medio', v: x.tbn_promedio },
                  { t: 'TBN al final', v: x.tbn_cuartil_bajo },
                  { t: 'Viscosidad', v: x.viscosidad_promedio },
                  { t: 'Vida media', v: x.vida_promedio },
                ].map(k => (
                  <Grid key={k.t} size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#F8FAFC',
                               textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 800,
                                        fontVariantNumeric: 'tabular-nums' }}>
                        {k.v ?? '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }}>
                        {k.t}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Typography sx={{ fontSize: 12, lineHeight: 1.55, mb: 1.25 }}>
                {x.motivo}
              </Typography>

              <Stack spacing={0.75}>
                {x.impedimentos.map(i => (
                  <Box key={i.impedimento} sx={{
                    p: 1.1, borderRadius: 1.25, bgcolor: alpha('#F59E0B', 0.07),
                    border: `1px solid ${alpha('#F59E0B', 0.22)}`,
                  }}>
                    <Stack direction="row" spacing={1}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700,
                                        color: '#B45309', flex: 1 }}>
                        {i.impedimento}
                      </Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 800,
                                        color: '#B45309', whiteSpace: 'nowrap' }}>
                        {i.pct}% de las muestras
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 11, color: '#78350F', mt: 0.25,
                                      lineHeight: 1.5 }}>
                      {i.porque}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Panel>
          </Grid>
        ))}
      </Grid>
    </Estado>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. Criterios y normas
   ═══════════════════════════════════════════════════════════════════════════ */

function Criterios({ f }: { f: FiltroFlota }) {
  const d = useQuery({
    queryKey: clave('normas', f),
    queryFn: () => interpretacionApi.normas(f),
  })
  const n = d.data

  return (
    <Estado cargando={d.isLoading} error={d.error} vacio={!n}>
      <Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>
        {n?.advertencia}
      </Alert>

      <Panel sx={{ mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: `1px solid ${BORDE}` }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            Límites de contaminación y de condición
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            Estos tienen valores de referencia publicados porque no dependen del
            tamaño ni de la metalurgia del motor: 0,2 % de agua es 0,2 % de agua
            en cualquier cárter.
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <Encabezados columnas={['Parámetro', 'Precaución', 'Condena',
              'Ensayo', 'Origen del umbral', 'Por qué ahí']} />
            <tbody>
              {Object.entries(n?.limites_motor ?? {}).map(([codigo, l]) => (
                <tr key={codigo} style={{ borderBottom: `1px solid ${BORDE}` }}>
                  <td style={{ padding: '9px 14px', fontSize: 12.5, fontWeight: 600 }}>
                    {l.nombre ?? codigo}
                    {l.unidad && (
                      <Typography component="span" sx={{ fontSize: 10.5,
                        color: 'text.disabled', ml: 0.75 }}>{l.unidad}</Typography>
                    )}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12,
                               fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {l.precaucion ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 700,
                               fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {l.condena ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <Fuentes codigos={l.metodo ? [l.metodo] : []} fuentes={n?.fuentes} />
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Naturaleza limite={l} />
                      <Typography sx={{ fontSize: 11, color: '#6B7280' }}>
                        {l.criterio}
                      </Typography>
                    </Stack>
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 11.5, color: '#374151',
                               maxWidth: 420, lineHeight: 1.5 }}>
                    {l.porque}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Panel>

      <Panel sx={{ mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: `1px solid ${BORDE}` }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            Metales de desgaste: límites de esta flota (ASTM D7720)
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            Para los metales de desgaste no existe un tope universal, y por eso
            la norma que sí trata de límites los deriva de la propia población:
            percentil {n?.percentiles.precaucion} para precaución y{' '}
            {n?.percentiles.condena} para condena. Hacen falta al menos{' '}
            {n?.minimo_poblacion} mediciones. Van separados por familia de
            compartimento porque el percentil solo dice algo sobre equipos
            comparables: un motor diésel y un sistema hidráulico no lo son.
          </Typography>
        </Box>
        <Estado vacio={!n?.por_familia.length}
          mensajeVacio="Ninguna familia alcanza población suficiente"
          hint="Con este segmento el diagnóstico se apoya solo en la tendencia.">
          {n?.por_familia.map(fam => (
            <Box key={fam.tipo} sx={{ borderTop: `1px solid ${BORDE}` }}>
              <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
                  {fam.nombre}
                  <Typography component="span" sx={{ fontSize: 11,
                    color: 'text.secondary', fontWeight: 500, ml: 1 }}>
                    {fam.muestras} muestra(s)
                  </Typography>
                </Typography>
              </Box>
              {Object.keys(fam.estadisticos).length > 0 ? (
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <Encabezados columnas={['Elemento', 'Mediana', 'Precaución',
                      'Condena', 'Mediciones']} />
                    <tbody>
                      {Object.entries(fam.estadisticos).map(([codigo, l]) => (
                        <tr key={codigo} style={{ borderBottom: `1px solid ${BORDE}` }}>
                          <td style={{ padding: '9px 14px', fontSize: 12.5, fontWeight: 700,
                                       fontFamily: MONO }}>{codigo}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: '#6B7280',
                                       fontVariantNumeric: 'tabular-nums' }}>{l.mediana ?? '—'}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 700,
                                       color: '#B45309',
                                       fontVariantNumeric: 'tabular-nums' }}>{l.precaucion}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 700,
                                       color: '#B91C1C',
                                       fontVariantNumeric: 'tabular-nums' }}>{l.condena}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: '#6B7280',
                                       fontVariantNumeric: 'tabular-nums' }}>{l.n}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              ) : (
                <Typography sx={{ px: 2, pb: 1.5, fontSize: 11.5,
                                  color: 'text.secondary' }}>
                  Ningún elemento alcanza las {n?.minimo_poblacion} mediciones
                  que hacen falta. En esta familia el diagnóstico de desgaste se
                  apoya solo en la tendencia.
                </Typography>
              )}
              {fam.insuficientes.length > 0 && (
                <Typography sx={{ px: 2, pb: 1.5, fontSize: 11,
                                  color: 'text.secondary' }}>
                  Sin límite por falta de población —un parámetro sin límite no
                  es un parámetro sano, es uno sin criterio—:{' '}
                  {fam.insuficientes.map(x =>
                    `${x.codigo} (${x.n}, faltan ${x.faltan})`).join(' · ')}
                </Typography>
              )}
            </Box>
          ))}
        </Estado>
      </Panel>

      <Panel sx={{ mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: `1px solid ${BORDE}` }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            Las reglas de diagnóstico, en el orden en que se evalúan
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            Gana la primera que encaje con el patrón completo de la muestra.
            Están de específica a genérica a propósito: combinar todas las que
            aplican produce una recomendación que dice seis cosas y no manda
            hacer ninguna.
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <Stack spacing={1.25}>
            {n?.reglas.map((r, i) => (
              <Box key={r.codigo} sx={{
                p: 1.6, borderRadius: 1.5, bgcolor: '#F9FAFB',
                border: `1px solid ${BORDE}`,
              }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}
                  flexWrap="wrap" useFlexGap>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800,
                                    color: 'text.disabled', fontFamily: MONO }}>
                    {String(i + 1).padStart(2, '0')}
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
                    {r.nombre}
                  </Typography>
                  <Chip label={r.severidad.replace('_', ' ').toLowerCase()}
                    size="small" sx={{
                      height: 19, fontSize: 9.5, fontWeight: 800,
                      bgcolor: alpha(COLOR_ESTADO[r.severidad] ?? '#94A3B8', 0.14),
                      color: COLOR_ESTADO[r.severidad] ?? '#475569',
                    }} />
                </Stack>
                <Typography sx={{ fontSize: 11.5, color: '#374151', mb: 0.4,
                                  lineHeight: 1.5 }}>
                  <b>Cuándo:</b> {r.criterio}
                </Typography>
                <Typography sx={{ fontSize: 12, lineHeight: 1.55, mb: 0.4 }}>
                  {r.lectura}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary',
                                  mb: 0.75, lineHeight: 1.5 }}>
                  <b>Qué hacer:</b> {r.accion}
                </Typography>
                <Fuentes codigos={r.fuentes} fuentes={n?.fuentes} />
              </Box>
            ))}
          </Stack>
        </Box>
      </Panel>

      <Panel>
        <Box sx={{ p: 2, borderBottom: `1px solid ${BORDE}` }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            Las fuentes
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            Qué define cada una, y qué NO define.
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <Encabezados columnas={['Referencia', 'Título', 'Qué define']} />
            <tbody>
              {Object.entries(n?.fuentes ?? {}).map(([codigo, fu]) => (
                <tr key={codigo} style={{ borderBottom: `1px solid ${BORDE}` }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800,
                               fontFamily: MONO, whiteSpace: 'nowrap',
                               color: '#3730A3' }}>{codigo}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, maxWidth: 340,
                               lineHeight: 1.5 }}>{fu.titulo}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11.5,
                               color: '#374151', maxWidth: 460, lineHeight: 1.5 }}>
                    {fu.define}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Panel>
    </Estado>
  )
}
