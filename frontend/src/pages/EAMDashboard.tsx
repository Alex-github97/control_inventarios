/**
 * Tablero del CMMS, interactivo.
 *
 * Los datos salen de `/eam/dashboard/modelo`: los hechos ya agrupados por mes,
 * tipo, marca, línea, tipo de orden, prioridad y modo de falla. Los cortes se
 * hacen en el navegador, así que un clic en cualquier barra filtra todo el
 * tablero al instante (ver components/graficos).
 *
 * Dos decisiones que se notan al usarlo, heredadas del tablero anterior:
 *
 * Un indicador sin datos suficientes muestra «—» y no un cero. Un MTBF en cero
 * se lee como «se daña todo el tiempo», que es justo lo contrario de lo que
 * significa no tener datos.
 *
 * Cada promedio dice sobre cuántos casos se calculó. Un MTTR de tres órdenes no
 * merece la misma confianza que uno de trescientas, y esconderlo invita a tomar
 * decisiones sobre un número que no aguanta.
 */
import { useMemo, useState } from 'react'
import {
  Box, Card, Typography, Stack, Chip, Skeleton, Alert, TextField, MenuItem,
  Divider, Button, ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import { WarningAmber, ChevronRight, CheckCircleOutline } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { apiClient as api } from '@/api/client'
import { aFilas, agrupar, filtrar, filtrosQueNoAplican, sumar, type Grupo, type TablaServidor } from '@/components/graficos/cubo'
import { BarraFiltros, ProveedorFiltros, useFiltros } from '@/components/graficos/FiltroCruzado'
import { GraficoBarras, type LineaDetalle } from '@/components/graficos/GraficoBarras'
import { Indicador } from '@/components/graficos/Indicador'

interface AlertaTablero {
  tipo: string; referencia?: string | null; titulo: string; detalle?: string
  severidad: 'CRITICA' | 'ALTA' | 'MEDIA'; enlace?: string
}
interface Modelo {
  periodo_dias: number; desde: string
  activos: TablaServidor; cerradas: TablaServidor; abiertas: TablaServidor
  mtbf: TablaServidor; rutinas: TablaServidor; alertas: AlertaTablero[]
}
type FilaActivo = { tipo: string; marca: string; linea: string; estado_activo: string; n: number }
type FilaCerrada = {
  mes: string; tipo: string; marca: string; linea: string; tipo_ot: string; prioridad: string
  falla: boolean; modo: string; n: number; nf: number; costo: number; costo_mo: number
  costo_rep: number; costo_serv: number; horas_rep: number; casos_rep: number
}
type FilaAbierta = { tipo: string; marca: string; linea: string; estado_ot: string; prioridad: string; n: number; vencidas: number }
type FilaMtbf = { tipo: string; marca: string; linea: string; horas: number }
type FilaRutina = { tipo: string; marca: string; linea: string; n: number; vencidas: number }

const NOMBRES = {
  mes: 'Mes', tipo: 'Tipo de activo', marca: 'Marca', linea: 'Línea', tipo_ot: 'Tipo de orden',
  prioridad: 'Prioridad', modo: 'Modo de falla', estado_activo: 'Estado del activo', estado_ot: 'Estado de la orden',
}

const MEDIDAS_OT = ['n', 'nf', 'costo', 'costo_mo', 'costo_rep', 'costo_serv', 'horas_rep', 'casos_rep']

const pesos = (v?: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
/** Pesos abreviados para ejes y barras: $1,2 M se lee mejor que $1.234.567. */
const pesosCorto = (v: number) => {
  const a = Math.abs(v)
  if (a >= 1e9) return `$${(v / 1e9).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MM`
  if (a >= 1e6) return `$${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (a >= 1e3) return `$${(v / 1e3).toLocaleString('es-CO', { maximumFractionDigits: 0 })} mil`
  return `$${v.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}
const numero = (v?: number | null) => (v == null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: 0 }))
const pct = (v?: number | null) => (v == null ? '—' : `${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`)

/** Horas legibles: 36 h se entiende peor que «1 d 12 h». */
const duracion = (h?: number | null) => {
  if (h == null || !Number.isFinite(h)) return '—'
  if (h < 24) return `${h.toLocaleString('es-CO', { maximumFractionDigits: 1 })} h`
  const d = Math.floor(h / 24)
  const resto = Math.round(h % 24)
  return resto ? `${d} d ${resto} h` : `${d} d`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const mesCorto = (c: string) => {
  const [a, m] = c.split('-')
  return m ? `${MESES[Number(m) - 1]} ${a.slice(2)}` : c
}
/** OPERATIVO → Operativo, EN_ESPERA_REPUESTOS → En espera repuestos. */
const legible = (s: string) => {
  const t = s.replace(/_/g, ' ').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const colorAlerta = (s: string) =>
  s === 'CRITICA' ? ESTADO.peligro : s === 'ALTA' ? ESTADO.alerta : COLOR_MODULO

type Medida = 'n' | 'costo' | 'nf' | 'mttr'
const MEDIDA: Record<Medida, {
  nombre: string; formato: (v: number) => string; valor: string | ((s: Record<string, number>) => number)
  sumable: boolean; menosEsMejor: boolean
}> = {
  n: { nombre: 'Órdenes', formato: v => numero(v), valor: 'n', sumable: true, menosEsMejor: false },
  costo: { nombre: 'Costo', formato: pesosCorto, valor: 'costo', sumable: true, menosEsMejor: true },
  nf: { nombre: 'Fallas', formato: v => numero(v), valor: 'nf', sumable: true, menosEsMejor: true },
  mttr: { nombre: 'MTTR', formato: v => duracion(v), sumable: false, menosEsMejor: true,
    valor: s => (s.casos_rep ? s.horas_rep / s.casos_rep : 0) },
}

export default function EAMDashboard() {
  const [dias, setDias] = useState(365)
  const { data, isLoading, isFetching } = useQuery<Modelo>({
    queryKey: ['eam-dashboard-modelo', dias],
    queryFn: () => api.get('/eam/dashboard/modelo', { params: { dias } }).then(r => r.data),
    placeholderData: prev => prev,
  })

  return (
    <Layout title="Tablero de mantenimiento">
      <ProveedorFiltros nombres={NOMBRES}>
        <Box className="anim-page-in">
          <Stack direction="row" alignItems="flex-end" spacing={2} mb={1.5} flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Typography variant="h6" fontWeight={800}>Tablero de mantenimiento</Typography>
              <Typography variant="caption" color="text.secondary">
                Activos, órdenes y confiabilidad. Haga clic en cualquier barra para filtrar todo el tablero.
              </Typography>
            </Box>
            <TextField select size="small" label="Periodo" value={dias} sx={{ minWidth: 150 }}
              onChange={e => setDias(Number(e.target.value))}>
              <MenuItem value={90}>Últimos 90 días</MenuItem>
              <MenuItem value={180}>Últimos 6 meses</MenuItem>
              <MenuItem value={365}>Último año</MenuItem>
              <MenuItem value={730}>Últimos 2 años</MenuItem>
            </TextField>
          </Stack>
          {isLoading || !data
            ? <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 3 }} />
            : <Box sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .2s' }}><Tablero modelo={data} /></Box>}
        </Box>
      </ProveedorFiltros>
    </Layout>
  )
}

function Tablero({ modelo }: { modelo: Modelo }) {
  const navigate = useNavigate()
  const { filtros } = useFiltros()
  const [medida, setMedida] = useState<Medida>('n')
  const m = MEDIDA[medida]

  const base = useMemo(() => ({
    activos: aFilas<FilaActivo>(modelo.activos),
    cerradas: aFilas<FilaCerrada>(modelo.cerradas).map(f => ({ ...f, nf: f.falla ? f.n : 0 })),
    abiertas: aFilas<FilaAbierta>(modelo.abiertas),
    mtbf: aFilas<FilaMtbf>(modelo.mtbf),
    rutinas: aFilas<FilaRutina>(modelo.rutinas),
  }), [modelo])

  // Con todos los filtros: lo que leen los indicadores.
  const act = filtrar(base.activos, filtros)
  const cer = filtrar(base.cerradas, filtros)
  const ab = filtrar(base.abiertas, filtros)
  const mt = filtrar(base.mtbf, filtros)
  const ru = filtrar(base.rutinas, filtros)

  const totalActivos = sumar(act, 'n')
  const operativos = sumar(act.filter(f => f.estado_activo === 'OPERATIVO'), 'n')
  const disponibilidad = totalActivos ? operativos / totalActivos * 100 : null
  const abiertas = sumar(ab, 'n')
  const vencidas = sumar(ab, 'vencidas')
  const ordenes = sumar(cer, 'n')
  const fallas = sumar(cer, 'nf')
  const costo = sumar(cer, 'costo')
  const costoFallas = sumar(cer.filter(f => f.falla), 'costo')
  const casosRep = sumar(cer, 'casos_rep')
  const mttr = casosRep ? sumar(cer, 'horas_rep') / casosRep : null
  const mtbf = mt.length ? sumar(mt, 'horas') / mt.length : null
  const rutinas = sumar(ru, 'n')
  const rutinasVencidas = sumar(ru, 'vencidas')
  const cumplimiento = rutinas ? (rutinas - rutinasVencidas) / rutinas * 100 : null
  const costoPorOrden = ordenes ? costo / ordenes : null

  // Cada gráfico se filtra por todo MENOS por su propia dimensión.
  const gruposOT = (dim: keyof FilaCerrada & string, filas = base.cerradas) =>
    agrupar(filtrar(filas, filtros, dim), dim, MEDIDAS_OT, m.valor)

  const detalleOT = (g: Grupo): LineaDetalle[] => {
    const s = g.sumas
    const l: LineaDetalle[] = []
    if (medida !== 'n') l.push({ etiqueta: 'Órdenes cerradas', valor: numero(s.n) })
    if (medida !== 'nf' && s.n) l.push({ etiqueta: 'Por falla', valor: `${numero(s.nf)} (${pct(s.nf / s.n * 100)})`,
      tono: s.nf / s.n > 0.5 ? 'alerta' : undefined })
    if (medida !== 'costo') l.push({ etiqueta: 'Costo', valor: pesos(s.costo) })
    if (s.n && costoPorOrden) {
      const cpo = s.costo / s.n
      const d = (cpo - costoPorOrden) / costoPorOrden * 100
      l.push({ etiqueta: 'Costo por orden', valor: `${pesosCorto(cpo)} · ${d > 0 ? '+' : ''}${Math.round(d)}% vs. total`,
        tono: d > 25 ? 'mal' : d < -25 ? 'bien' : undefined })
    }
    if (s.costo > 0) l.push({ etiqueta: 'Repuestos · m. obra · serv.',
      valor: [s.costo_rep, s.costo_mo, s.costo_serv].map(v => `${Math.round(v / s.costo * 100)}%`).join(' · ') })
    if (medida !== 'mttr') l.push({ etiqueta: 'MTTR', valor: s.casos_rep ? `${duracion(s.horas_rep / s.casos_rep)} · ${numero(s.casos_rep)} casos` : '— sin fallas cerradas' })
    return l
  }

  const comun = { nombreMedida: m.nombre, formato: m.formato, sumable: m.sumable, menosEsMejor: m.menosEsMejor, color: COLOR_MODULO, detalle: detalleOT }
  const lecturaMedida = medida === 'mttr'
    ? 'El MTTR de cada barra es horas de reparación ÷ fallas cerradas con fecha de inicio y fin; las barras sin fallas cerradas quedan en cero.'
    : `${m.nombre} de las órdenes cerradas en el periodo.`

  // Disponibilidad por tipo (para el tooltip del gráfico de tipos).
  const dispPorTipo = useMemo(() => {
    const d = new Map<string, { total: number; op: number }>()
    for (const f of filtrar(base.activos, filtros, 'tipo')) {
      const x = d.get(f.tipo) ?? { total: 0, op: 0 }
      x.total += f.n; if (f.estado_activo === 'OPERATIVO') x.op += f.n
      d.set(f.tipo, x)
    }
    return d
  }, [base.activos, filtros])

  // Pareto de modos de falla: el acumulado dice cuántos modos explican el 80 %.
  const modos = agrupar(filtrar(base.cerradas.filter(f => f.falla), filtros, 'modo'), 'modo', MEDIDAS_OT, medida === 'n' ? 'nf' : m.valor)
  const totalModos = modos.reduce((s, g) => s + g.valor, 0)
  const acumulado = new Map<string, number>()
  ;[...modos].sort((a, b) => b.valor - a.valor).reduce((s, g) => { acumulado.set(g.clave, s + g.valor); return s + g.valor }, 0)

  const noAf = {
    activos: filtrosQueNoAplican(base.activos, filtros),
    cerradas: filtrosQueNoAplican(base.cerradas, filtros),
    abiertas: filtrosQueNoAplican(base.abiertas, filtros),
    mtbf: filtrosQueNoAplican(base.mtbf, filtros),
  }
  const desde = new Date(`${modelo.desde}T00:00:00`).toLocaleDateString('es-CO', { dateStyle: 'medium' })

  if (base.activos.length === 0) {
    return (
      <Alert severity="info" action={<Button size="small" onClick={() => navigate('/eam/activos')}>Ir a activos</Button>}>
        No hay activos registrados todavía. El tablero se llena solo a medida que se cargan activos y se cierran órdenes de trabajo.
      </Alert>
    )
  }

  return (
    <>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 5, bgcolor: 'background.default', py: 1, mb: 1 }}>
        <BarraFiltros formato={(d, v) => d === 'mes' ? mesCorto(v) : ['estado_activo', 'estado_ot', 'prioridad', 'tipo_ot'].includes(d) ? legible(v) : v} />
      </Box>

      {/* ── Indicadores ─────────────────────────────────────────────────────── */}
      <Card sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
        <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap divider={<Divider orientation="vertical" flexItem />}>
          <Indicador titulo="Activos" valor={numero(totalActivos)}
            pie={`${numero(operativos)} operativos`}
            que="Activos vigentes (no dados de baja) en la selección."
            como="Conteo de la hoja de vida de activos según su estado actual."
            noAfectan={noAf.activos} />
          <Indicador titulo="Disponibilidad" valor={pct(disponibilidad)}
            color={disponibilidad == null ? undefined : disponibilidad >= 90 ? ESTADO.exito : disponibilidad >= 75 ? ESTADO.alerta : ESTADO.peligro}
            que="Qué parte de la flota está lista para trabajar hoy."
            como="Activos en estado OPERATIVO ÷ activos vigentes. Es una foto del momento, no un promedio del periodo."
            lectura="Verde desde 90 %, ámbar entre 75 % y 90 %, rojo por debajo de 75 %."
            noAfectan={noAf.activos} />
          <Indicador titulo="Órdenes abiertas" valor={numero(abiertas)}
            pie={vencidas ? `${numero(vencidas)} vencidas (${pct(vencidas / Math.max(1, abiertas) * 100)})` : 'ninguna vencida'}
            alerta={vencidas > 0} color={vencidas ? ESTADO.alerta : undefined}
            que="Órdenes pendientes, asignadas, en ejecución o esperando repuestos, hoy."
            como="Vencida = su fecha requerida ya pasó y sigue abierta."
            lectura="Las vencidas son trabajo comprometido que no se cumplió: revíselas en «Requiere atención»."
            noAfectan={noAf.abiertas} />
          <Indicador titulo="Costo del periodo" valor={pesos(costo)}
            pie={costo ? `${pct(costoFallas / costo * 100)} en fallas · ${pesosCorto(costoPorOrden ?? 0)} por orden` : undefined}
            que={`Lo gastado en órdenes cerradas desde el ${desde}.`}
            como="Suma del costo total (mano de obra + repuestos + servicios) de las órdenes completadas en el periodo."
            lectura="Un costo en fallas alto frente al preventivo indica que se está reparando más de lo que se previene."
            noAfectan={noAf.cerradas} />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap divider={<Divider orientation="vertical" flexItem />}>
          <Indicador titulo="MTTR" valor={duracion(mttr)}
            pie={casosRep ? `sobre ${numero(casosRep)} ${casosRep === 1 ? 'orden' : 'órdenes'} de falla` : 'sin órdenes de falla cerradas'}
            que="Tiempo medio de reparación: cuánto dura detenido un activo cuando falla."
            como="Promedio de (fecha de cierre − fecha de inicio) de las órdenes marcadas como falla, cerradas y con las dos fechas."
            lectura="Menos es mejor. Con pocos casos el promedio es inestable: mire el número de órdenes."
            noAfectan={noAf.cerradas} />
          <Indicador titulo="MTBF" valor={duracion(mtbf)}
            pie={mt.length ? `sobre ${numero(mt.length)} ${mt.length === 1 ? 'activo' : 'activos'} con fallas repetidas` : 'hace falta más de una falla por activo'}
            que="Tiempo medio entre fallas: cada cuánto vuelve a fallar un mismo activo."
            como="Por activo con dos fallas o más en el periodo: (última − primera) ÷ (fallas − 1). Luego el promedio entre esos activos."
            lectura="Más es mejor. Solo se puede cortar por tipo, marca y línea: es un dato por activo, no por orden."
            noAfectan={noAf.mtbf} />
          <Indicador titulo="Cumplimiento del plan" valor={pct(cumplimiento)}
            color={cumplimiento == null ? undefined : cumplimiento >= 90 ? ESTADO.exito : cumplimiento >= 70 ? ESTADO.alerta : ESTADO.peligro}
            pie={rutinas ? `${numero(rutinasVencidas)} de ${numero(rutinas)} rutinas vencidas` : 'sin rutinas asignadas a activos'}
            que="Qué parte de las rutinas preventivas asignadas está al día."
            como="(Rutinas asignadas − rutinas con la próxima fecha vencida) ÷ rutinas asignadas, hoy."
            lectura="Verde desde 90 %, ámbar entre 70 % y 90 %, rojo por debajo."
            noAfectan={filtrosQueNoAplican(base.rutinas, filtros)} />
          <Indicador titulo="Tasa de fallas" valor={ordenes ? pct(fallas / ordenes * 100) : '—'}
            pie={ordenes ? `${numero(fallas)} de ${numero(ordenes)} órdenes cerradas` : undefined}
            color={!ordenes ? undefined : fallas / ordenes > 0.5 ? ESTADO.alerta : undefined}
            que="Qué parte del trabajo fue por falla y no programado."
            como="Órdenes cerradas marcadas como falla ÷ órdenes cerradas."
            lectura="Por encima de 50 % el mantenimiento es mayormente reactivo; la meta usual de clase mundial es menos de 20 %."
            noAfectan={noAf.cerradas} />
        </Stack>
      </Card>

      {/* ── Tiempo ──────────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5} flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle2" fontWeight={800}>Órdenes cerradas</Typography>
        <ToggleButtonGroup size="small" exclusive value={medida} onChange={(_, v) => v && setMedida(v)}>
          <ToggleButton value="n" sx={{ textTransform: 'none', px: 1.5 }}>Órdenes</ToggleButton>
          <ToggleButton value="costo" sx={{ textTransform: 'none', px: 1.5 }}>Costo</ToggleButton>
          <ToggleButton value="nf" sx={{ textTransform: 'none', px: 1.5 }}>Fallas</ToggleButton>
          <ToggleButton value="mttr" sx={{ textTransform: 'none', px: 1.5 }}>MTTR</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary">medir todos los gráficos de órdenes por esta cifra</Typography>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <GraficoBarras {...comun} dimension="mes" orientacion="vertical" titulo={`${m.nombre} por mes`}
          subtitulo={`Desde el ${desde}. Arrastre sobre los meses para elegir un tramo.`}
          etiqueta={mesCorto} grupos={gruposOT('mes')}
          ayuda={<>{lecturaMedida} Cada barra es el mes de cierre. El tooltip la compara con el mes anterior y con el promedio mensual.</>} />
      </Box>

      <Box sx={{ display: 'grid', gap: 2, mb: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <GraficoBarras {...comun} dimension="tipo" titulo={`${m.nombre} por tipo de activo`}
          subtitulo="Qué familia de activos concentra el trabajo" grupos={gruposOT('tipo')}
          ayuda={<>{lecturaMedida} El tooltip suma la disponibilidad actual de cada tipo.</>}
          detalle={g => {
            const d = dispPorTipo.get(g.clave)
            const l = detalleOT(g)
            if (d?.total) l.unshift({ etiqueta: 'Disponibilidad hoy', valor: `${pct(d.op / d.total * 100)} (${numero(d.op)} de ${numero(d.total)})`,
              tono: d.op / d.total < 0.75 ? 'mal' : d.op / d.total < 0.9 ? 'alerta' : 'bien' })
            return l
          }} />
        <GraficoBarras {...comun} dimension="modo" titulo={medida === 'n' ? 'Fallas por modo de falla' : `${m.nombre} por modo de falla`}
          nombreMedida={medida === 'n' ? 'Fallas' : m.nombre}
          subtitulo="Pareto: los pocos modos que explican la mayoría de fallas" grupos={modos}
          ayuda="Solo órdenes marcadas como falla, por el modo de falla del catálogo. El acumulado del tooltip dice cuántos modos explican el 80 %: atacarlos primero es lo que más reduce fallas."
          detalle={g => [
            { etiqueta: 'Acumulado (Pareto)', valor: totalModos ? pct((acumulado.get(g.clave) ?? 0) / totalModos * 100) : '—',
              tono: totalModos && (acumulado.get(g.clave) ?? 0) / totalModos <= 0.8 ? 'alerta' : undefined },
            ...detalleOT(g),
          ]} />
        <GraficoBarras {...comun} dimension="marca" titulo={`${m.nombre} por marca`}
          subtitulo="Dónde se concentra la carga de mantenimiento" grupos={gruposOT('marca')}
          ayuda={<>{lecturaMedida} Compare el costo por orden de cada marca contra el general: una marca cara por orden suele indicar repuestos costosos o fallas repetidas.</>} />
        <GraficoBarras {...comun} dimension="linea" titulo={`${m.nombre} por línea`}
          subtitulo="El detalle dentro de cada marca" grupos={gruposOT('linea')}
          ayuda={<>{lecturaMedida} Elija una marca en el gráfico de al lado para ver solo sus líneas.</>} />
        <GraficoBarras {...comun} dimension="tipo_ot" titulo={`${m.nombre} por tipo de orden`} etiqueta={legible}
          subtitulo="Preventivo frente a correctivo" grupos={gruposOT('tipo_ot')}
          ayuda={<>{lecturaMedida} Un mantenimiento sano tiene más preventivo que correctivo.</>} />
        <GraficoBarras {...comun} dimension="prioridad" titulo={`${m.nombre} por prioridad`} etiqueta={legible}
          subtitulo="Con qué urgencia se pidió el trabajo" grupos={gruposOT('prioridad')}
          ayuda={<>{lecturaMedida} Muchas órdenes críticas suelen ser fallas que el preventivo no está evitando.</>} />
        <GraficoBarras dimension="estado_activo" titulo="Activos por estado" etiqueta={legible}
          subtitulo="Foto de hoy" nombreMedida="Activos" formato={v => numero(v)} color={PALETA.grafito}
          grupos={agrupar(filtrar(base.activos, filtros, 'estado_activo'), 'estado_activo', ['n'], 'n')}
          ayuda="Estado actual de cada activo vigente. No depende del periodo ni de filtros de órdenes (mes, modo de falla, tipo de orden)." />
        <GraficoBarras dimension="estado_ot" titulo="Órdenes abiertas por estado" etiqueta={legible}
          subtitulo="Dónde está detenido el trabajo pendiente" nombreMedida="Órdenes" formato={v => numero(v)} color={PALETA.grafito}
          grupos={agrupar(filtrar(base.abiertas, filtros, 'estado_ot'), 'estado_ot', ['n', 'vencidas'], 'n')}
          ayuda="Órdenes abiertas hoy. Muchas en «espera de repuestos» apuntan a almacén o compras, no a mantenimiento."
          detalle={g => [{ etiqueta: 'Vencidas', valor: `${numero(g.sumas.vencidas)} (${pct(g.sumas.vencidas / Math.max(1, g.sumas.n) * 100)})`,
            tono: g.sumas.vencidas ? 'alerta' : 'bien' }]} />
      </Box>

      {/* ── Alertas ─────────────────────────────────────────────────────────── */}
      <Card sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <WarningAmber sx={{ fontSize: 18, color: modelo.alertas.length ? ESTADO.alerta : ESTADO.exito }} />
          <Typography variant="subtitle2" fontWeight={800}>Requiere atención</Typography>
          <Typography variant="caption" color="text.secondary">de toda la empresa, sin filtros</Typography>
        </Stack>
        {modelo.alertas.length === 0 ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
            <CheckCircleOutline sx={{ color: ESTADO.exito }} />
            <Typography variant="body2" color="text.secondary">Nada vencido ni en estado crítico.</Typography>
          </Stack>
        ) : (
          <Stack spacing={1}>
            {modelo.alertas.map((a, i) => (
              <Box key={i} onClick={() => a.enlace && navigate(a.enlace)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25,
                  borderRadius: 2, border: `1px solid ${PALETA.niebla}`,
                  borderLeft: `3px solid ${colorAlerta(a.severidad)}`,
                  cursor: a.enlace ? 'pointer' : 'default', transition: 'background .18s ease',
                  '&:hover': a.enlace ? { bgcolor: PALETA.bruma } : {},
                }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.titulo}</Typography>
                  {a.detalle && <Typography variant="caption" color="text.secondary">{a.detalle}</Typography>}
                </Box>
                <Chip label={a.severidad === 'CRITICA' ? 'Crítica' : a.severidad === 'ALTA' ? 'Alta' : 'Media'} size="small" sx={{
                  height: 20, fontSize: 10, fontWeight: 800,
                  bgcolor: `${colorAlerta(a.severidad)}1A`, color: colorAlerta(a.severidad) }} />
                {a.enlace && <ChevronRight sx={{ fontSize: 18, color: PALETA.acero }} />}
              </Box>
            ))}
          </Stack>
        )}
      </Card>
    </>
  )
}
