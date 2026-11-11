/**
 * Reportería TittanLite: el tablero interactivo y las exportaciones masivas.
 *
 * El tablero sale de `/eam/lite/tablero/modelo` (hechos ya agrupados en SQL) y
 * se corta en el navegador con el kit de components/graficos: un clic en
 * cualquier barra filtra todo, como en el tablero del CMMS.
 *
 *  - Llantas a piso: las de la ÚLTIMA inspección Lite de cada vehículo en el
 *    periodo, por estado, profundidad, vida, marca, medida y tipo de vehículo.
 *  - Inspecciones: todas las del periodo, por mes e inspector.
 *  - Pila de desecho: las llantas que se desecharon con la app.
 */
import { useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Divider, Skeleton, Stack, Typography } from '@mui/material'
import { Download, Inventory2, Straighten } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { mensajeDeError } from '@/utils/errorApi'
import { COLOR_MODULO, ESTADO, PALETA } from '@/config/marca'
import { aFilas, agrupar, filtrar, filtrosQueNoAplican, sumar, type Grupo, type TablaServidor } from '@/components/graficos/cubo'
import { BarraFiltros, ProveedorFiltros, useFiltros } from '@/components/graficos/FiltroCruzado'
import { GraficoBarras, type LineaDetalle } from '@/components/graficos/GraficoBarras'
import { Indicador } from '@/components/graficos/Indicador'

interface Modelo {
  piso: TablaServidor; novedades: TablaServidor; inspecciones: TablaServidor; desechos: TablaServidor
  umbrales: { profundidad_minima: number; margen_alerta: number }
}
type FilaPiso = { marca: string; medida: string; vida: string; rango: string; estado: string; tipo_vehiculo: string
  novedad: string; n: number; mm: number; n_mm: number; criticas: number; psi: number; n_psi: number }
type FilaNovedad = { tipo_novedad: string; n: number }
type FilaInsp = { mes: string; inspector: string; tipo_vehiculo: string; inspecciones: number; vehiculos: number
  llantas: number; criticas: number; sincronizadas: number }
type FilaDesecho = { mes: string; dano: string; causa: string; marca: string; n: number; mm: number; n_mm: number }

const NOMBRES: Record<string, string> = {
  estado: 'Estado', rango: 'Profundidad', vida: 'Vida', marca: 'Marca', medida: 'Medida',
  tipo_vehiculo: 'Tipo de vehículo', novedad: 'Novedad', tipo_novedad: 'Novedad de campo',
  mes: 'Mes', inspector: 'Inspector', dano: 'Daño', causa: 'Causa',
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const mesCorto = (m: string) => { const [a, b] = m.split('-'); return b ? `${MESES[Number(b) - 1]} ${a.slice(2)}` : m }
const rango = (r: string) => {
  if (r === 'R99') return 'Sin medir'
  const i = Number(r.slice(1))
  return i >= 8 ? '16 mm o más' : `${i * 2} a ${i * 2 + 2} mm`
}
const vida = (v: string) => (v === 'V0' ? 'Nueva' : `R${v.slice(1)}`)
const legible = (t: string) => t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' ')
const numero = (v: number) => Math.round(v).toLocaleString('es-CO')
const pct = (v: number | null) => (v == null ? '—' : `${v.toLocaleString('es-CO', { maximumFractionDigits: v < 10 ? 1 : 0 })} %`)
const mm = (v: number | null) => (v == null ? '—' : `${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} mm`)

function formatoFiltro(d: string, v: string) {
  if (d === 'rango') return rango(v)
  if (d === 'vida') return vida(v)
  if (d === 'mes') return mesCorto(v)
  if (d === 'tipo_vehiculo') return legible(v)
  return v
}

const MEDIDAS_PISO = ['n', 'mm', 'n_mm', 'criticas', 'psi', 'n_psi']
const MEDIDAS_INSP = ['inspecciones', 'vehiculos', 'llantas', 'criticas', 'sincronizadas']
const MEDIDAS_DESECHO = ['n', 'mm', 'n_mm']

function Tablero({ modelo }: { modelo: Modelo }) {
  const { filtros } = useFiltros()
  const base = useMemo(() => ({
    piso: aFilas<FilaPiso>(modelo.piso), novedades: aFilas<FilaNovedad>(modelo.novedades),
    insp: aFilas<FilaInsp>(modelo.inspecciones), desechos: aFilas<FilaDesecho>(modelo.desechos),
  }), [modelo])

  const piso = filtrar(base.piso, filtros)
  const insp = filtrar(base.insp, filtros)
  const desechos = filtrar(base.desechos, filtros)
  const llantas = sumar(piso, 'n')
  const medidas = sumar(piso, 'n_mm')
  const promedio = medidas ? sumar(piso, 'mm') / medidas : null
  const criticas = sumar(piso, 'criticas')
  const conNovedad = sumar(piso.filter(f => f.novedad === 'Con novedad'), 'n')
  const presiones = sumar(piso, 'n_psi')
  const inspecciones = sumar(insp, 'inspecciones')
  const lineas = sumar(insp, 'llantas')
  const sincronizadas = sumar(insp, 'sincronizadas')
  const desechadas = sumar(desechos, 'n')
  const mmDesecho = sumar(desechos, 'n_mm') ? sumar(desechos, 'mm') / sumar(desechos, 'n_mm') : null
  const u = modelo.umbrales

  const gPiso = (dim: keyof FilaPiso & string) => agrupar(filtrar(base.piso, filtros, dim), dim, MEDIDAS_PISO, 'n')
  const detallePiso = (g: Grupo): LineaDetalle[] => {
    const s = g.sumas
    const l: LineaDetalle[] = []
    if (s.n_mm) l.push({ etiqueta: 'Profundidad promedio', valor: mm(s.mm / s.n_mm) })
    if (s.n) l.push({ etiqueta: 'Críticas', valor: `${numero(s.criticas)} (${pct(100 * s.criticas / s.n)})`,
      tono: s.criticas / s.n > 0.15 ? 'mal' : s.criticas ? 'alerta' : 'bien' })
    if (s.n_psi) l.push({ etiqueta: 'Presión promedio', valor: `${numero(s.psi / s.n_psi)} psi` })
    return l
  }
  const comunPiso = { nombreMedida: 'Llantas', formato: numero, color: COLOR_MODULO, detalle: detallePiso }
  const gInsp = (dim: keyof FilaInsp & string) => agrupar(filtrar(base.insp, filtros, dim), dim, MEDIDAS_INSP, 'inspecciones')
  const detalleInsp = (g: Grupo): LineaDetalle[] => [
    { etiqueta: 'Llantas inspeccionadas', valor: numero(g.sumas.llantas) },
    { etiqueta: 'Críticas encontradas', valor: numero(g.sumas.criticas), tono: g.sumas.criticas ? 'alerta' : 'bien' },
    { etiqueta: 'Pasaron a TittanWare', valor: g.sumas.llantas ? pct(100 * g.sumas.sincronizadas / g.sumas.llantas) : '—' },
  ]
  const gDes = (dim: keyof FilaDesecho & string) => agrupar(filtrar(base.desechos, filtros, dim), dim, MEDIDAS_DESECHO, 'n')
  const detalleDes = (g: Grupo): LineaDetalle[] =>
    g.sumas.n_mm ? [{ etiqueta: 'Profundidad promedio al desechar', valor: mm(g.sumas.mm / g.sumas.n_mm) }] : []
  const noAf = {
    piso: filtrosQueNoAplican(base.piso, filtros), insp: filtrosQueNoAplican(base.insp, filtros),
    des: filtrosQueNoAplican(base.desechos, filtros),
  }

  if (!base.piso.length && !base.insp.length && !base.desechos.length) {
    return <Alert severity="info">No hay inspecciones ni desechos de TittanLite en el periodo.</Alert>
  }

  return (
    <>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 5, bgcolor: 'background.default', py: 1, mb: 1 }}>
        <BarraFiltros formato={formatoFiltro} />
      </Box>

      <Card sx={{ borderRadius: 3, p: 2.5, mb: 2 }}>
        <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap divider={<Divider orientation="vertical" flexItem />}>
          <Indicador titulo="Llantas a piso" valor={numero(llantas)}
            pie={`${numero(conNovedad)} con novedad (${pct(llantas ? 100 * conNovedad / llantas : null)})`}
            que="Llantas montadas según la última inspección de TittanLite de cada vehículo en el periodo."
            como="Cada vehículo cuenta una sola vez, con su inspección más reciente. Las posiciones marcadas «sin llanta» no cuentan."
            noAfectan={noAf.piso} />
          <Indicador titulo="Profundidad promedio" valor={mm(promedio)}
            pie={medidas < llantas ? `${numero(llantas - medidas)} sin medir` : 'todas medidas'}
            que="El promedio de la profundidad mínima de cada llanta (el surco más gastado)."
            como="Suma de la mínima de externo, central e interno ÷ llantas con al menos un surco medido."
            noAfectan={noAf.piso} />
          <Indicador titulo="Críticas" valor={pct(medidas ? 100 * criticas / medidas : null)}
            color={!medidas ? undefined : criticas / medidas > 0.15 ? ESTADO.peligro : criticas ? ESTADO.alerta : ESTADO.exito}
            alerta={criticas > 0} pie={`${numero(criticas)} en o bajo ${u.profundidad_minima} mm`}
            que="Llantas que ya llegaron a la profundidad mínima de retiro."
            como={`Profundidad mínima ≤ ${u.profundidad_minima} mm ÷ llantas medidas. Regular: hasta ${u.profundidad_minima + u.margen_alerta} mm.`}
            lectura="Por encima de 15 % se está rodando con llantas que deberían estar bajadas."
            noAfectan={noAf.piso} />
          <Indicador titulo="Presión promedio" valor={presiones ? `${numero(sumar(piso, 'psi') / presiones)} psi` : '—'}
            pie={presiones ? `sobre ${numero(presiones)} llantas` : 'sin presiones tomadas'}
            que="La presión promedio medida en campo." noAfectan={noAf.piso} />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap divider={<Divider orientation="vertical" flexItem />}>
          <Indicador titulo="Inspecciones" valor={numero(inspecciones)} pie={`${numero(lineas)} llantas inspeccionadas`}
            que="Todas las inspecciones de TittanLite del periodo (no solo la última de cada vehículo)." noAfectan={noAf.insp} />
          <Indicador titulo="Pasaron a TittanWare" valor={pct(lineas ? 100 * sincronizadas / lineas : null)}
            pie={`${numero(lineas - sincronizadas)} llantas solo en Lite`}
            que="Qué parte de lo inspeccionado se cargó también en TittanWare."
            como="Lo que no pasa las reglas de TittanWare (fechas, odómetro, profundidad, llanta en otra posición) queda solo en Lite con su motivo."
            noAfectan={noAf.insp} />
          <Indicador titulo="Llantas desechadas" valor={numero(desechadas)}
            pie={mmDesecho != null ? `con ${mm(mmDesecho)} en promedio` : undefined}
            que="Disposiciones finales registradas con la app en el periodo."
            lectura="Desechar con mucho labrado indica daños, no desgaste: revise las causas."
            noAfectan={noAf.des} />
        </Stack>
      </Card>

      <Typography variant="subtitle2" fontWeight={800} mb={1}>Llantas a piso</Typography>
      <Box sx={{ display: 'grid', gap: 2, mb: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <GraficoBarras {...comunPiso} dimension="rango" orientacion="vertical" titulo="Segmentación por profundidad"
          subtitulo="Profundidad mínima de cada llanta, de 2 en 2 mm" etiqueta={rango} grupos={gPiso('rango')}
          ayuda="Cada barra es un tramo de la profundidad mínima. Haga clic o arrastre para elegir tramos." />
        <GraficoBarras {...comunPiso} dimension="estado" titulo="Estado" grupos={gPiso('estado')}
          subtitulo={`Crítico ≤ ${u.profundidad_minima} mm · regular ≤ ${u.profundidad_minima + u.margen_alerta} mm`}
          ayuda="Bueno, regular o crítico según la profundidad mínima y los umbrales de la configuración de llantas." />
        <GraficoBarras {...comunPiso} dimension="vida" orientacion="vertical" titulo="Vidas y reencauches"
          subtitulo="Nueva, R1, R2…" etiqueta={vida} grupos={gPiso('vida')}
          ayuda="Cuántas veces se ha reencauchado cada llanta montada." />
        <GraficoBarras {...comunPiso} dimension="marca" titulo="Composición por marca" grupos={gPiso('marca')}
          ayuda="Llantas a piso por marca. El tooltip trae la profundidad promedio y las críticas de la marca." />
        <GraficoBarras {...comunPiso} dimension="medida" titulo="Composición por medida" grupos={gPiso('medida')} />
        <GraficoBarras {...comunPiso} dimension="tipo_vehiculo" titulo="Por tipo de vehículo" etiqueta={legible}
          grupos={gPiso('tipo_vehiculo')} />
        <GraficoBarras {...comunPiso} dimension="novedad" titulo="Con y sin novedad" grupos={gPiso('novedad')}
          ayuda="Llantas con al menos una novedad marcada en campo." />
        <GraficoBarras dimension="tipo_novedad" titulo="Novedades marcadas en campo" nombreMedida="Veces" formato={numero}
          color={PALETA.grafito} grupos={agrupar(filtrar(base.novedades, filtros, 'tipo_novedad'), 'tipo_novedad', ['n'], 'n')}
          ayuda="Una llanta puede tener varias novedades: la suma puede pasar el total de llantas." />
      </Box>

      <Typography variant="subtitle2" fontWeight={800} mb={1}>Inspecciones realizadas</Typography>
      <Box sx={{ display: 'grid', gap: 2, mb: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <GraficoBarras dimension="mes" orientacion="vertical" titulo="Inspecciones por mes" etiqueta={mesCorto}
          nombreMedida="Inspecciones" formato={numero} color={COLOR_MODULO} detalle={detalleInsp} grupos={gInsp('mes')} />
        <GraficoBarras dimension="inspector" titulo="Inspecciones por inspector" nombreMedida="Inspecciones"
          formato={numero} color={COLOR_MODULO} detalle={detalleInsp} grupos={gInsp('inspector')} />
      </Box>

      <Typography variant="subtitle2" fontWeight={800} mb={1}>Pila de desecho</Typography>
      <Box sx={{ display: 'grid', gap: 2, mb: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <GraficoBarras dimension="dano" titulo="Desechos por daño" nombreMedida="Llantas" formato={numero}
          color={ESTADO.peligro} detalle={detalleDes} grupos={gDes('dano')} vacio="Sin desechos con estos filtros" />
        <GraficoBarras dimension="causa" titulo="Desechos por causa" nombreMedida="Llantas" formato={numero}
          color={ESTADO.alerta} detalle={detalleDes} grupos={gDes('causa')} vacio="Sin desechos con estos filtros" />
      </Box>
    </>
  )
}

export function TableroTittanLite({ desde, hasta }: { desde: string; hasta: string }) {
  const { data, isLoading, isFetching, isError } = useQuery<Modelo>({
    queryKey: ['lite-tablero', desde, hasta],
    queryFn: () => api.get('/eam/lite/tablero/modelo', { params: { desde: desde || undefined, hasta: hasta || undefined }, timeout: 120_000 }).then(r => r.data),
    placeholderData: p => p,
  })
  if (isError) return <Alert severity="error">No se pudo cargar el tablero de TittanLite.</Alert>
  return (
    <ProveedorFiltros nombres={NOMBRES}>
      <Typography fontSize={12.5} color="text.secondary" mb={1}>
        Haga clic en cualquier barra para filtrar todo el tablero; clic con Ctrl suma valores; Esc limpia.
      </Typography>
      {isLoading || !data
        ? <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 3 }} />
        : <Box sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .2s' }}><Tablero modelo={data} /></Box>}
    </ProveedorFiltros>
  )
}

/* ── Exportaciones masivas ─────────────────────────────────────────────────── */
export function ExportarTittanLite({ desde, hasta }: { desde: string; hasta: string }) {
  const [bajando, setBajando] = useState('')
  const bajar = async (ruta: string, nombre: string) => {
    setBajando(ruta)
    try {
      const r = await api.get(`/eam/lite/exportar/${ruta}`, {
        params: { desde: desde || undefined, hasta: hasta || undefined }, responseType: 'blob', timeout: 600_000,
      })
      const url = URL.createObjectURL(r.data as Blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.xlsx`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      toast.success('Excel descargado')
    } catch (e: any) {
      // El blob de un error trae el JSON del servidor.
      let msj = mensajeDeError(e, 'No se pudo generar el Excel')
      try { msj = JSON.parse(await (e?.response?.data as Blob).text()).detail ?? msj } catch { /* se queda el genérico */ }
      toast.error(msj)
    } finally { setBajando('') }
  }
  const tarjeta = (ruta: string, nombre: string, titulo: string, icono: JSX.Element, texto: string, columnas: string) => (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1} mb={1}>
          <Box sx={{ color: COLOR_MODULO, display: 'flex' }}>{icono}</Box>
          <Typography fontWeight={800}>{titulo}</Typography>
        </Stack>
        <Typography fontSize={13} color="text.secondary" mb={1}>{texto}</Typography>
        <Typography fontSize={12} color="text.secondary" mb={2}><b>Columnas:</b> {columnas}</Typography>
        <Button variant="contained" startIcon={<Download />} disabled={!!bajando} onClick={() => bajar(ruta, nombre)}
          sx={{ textTransform: 'none', fontWeight: 700 }}>{bajando === ruta ? 'Generando…' : 'Descargar Excel'}</Button>
      </CardContent>
    </Card>
  )
  return (
    <Stack spacing={2}>
      <Typography fontSize={12.5} color="text.secondary">
        Exportaciones completas del periodo elegido{!desde && !hasta ? ' (sin fechas: todo el histórico)' : ''}, con lo que
        quedó solo en TittanLite y su motivo. Aguantan cientos de miles de filas.
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {tarjeta('inspecciones', 'tittanlite-inspecciones', 'Inspecciones tomadas', <Straighten />,
          'Todas las llantas de todas las inspecciones de TittanLite del periodo, una fila por llanta: no solo la última de cada vehículo.',
          'fecha y hora, vehículo, odómetro, inspector, posición, llanta, marca, referencia, medida, vida, surcos externo/central/interno, mínima, estado, presión, novedades, observación, fotos y sincronización con TittanWare.')}
        {tarjeta('desechos', 'tittanlite-pila-desecho', 'Pila de desecho', <Inventory2 />,
          'Las llantas desechadas con la app, una fila por llanta, y una hoja de resumen por daño, causa, ubicación del daño, marca y medida.',
          'fecha, llanta, vehículo, marca, referencia, medida, DOT, vida, daño (código, ubicación, avería, causa, motivo, responsable), surcos, reparaciones, regrabada, dónde está la carcasa, inspector, fotos y sincronización.')}
      </Box>
    </Stack>
  )
}
