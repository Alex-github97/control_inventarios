/**
 * El desempeño comercial: por ejecutivo, por segmento y en el tiempo.
 *
 * LA META Y LO LOGRADO VIENEN DEL SERVIDOR
 * `crm_objetivo_comercial` guarda la cuota de cada ejecutivo y lo que lleva
 * cerrado, contado por el valor del primer año de cada contrato ganado. Contar
 * un contrato a veinticuatro meses completo contra una cuota anual produce
 * cumplimientos del 250%, y una pantalla donde todo el mundo pasa del 200% no
 * sirve para decidir nada.
 *
 * LA TENDENCIA SALE DE LOS INDICADORES DIARIOS
 * Un punto por mes, tomado del último día de cada uno. Es la misma serie que
 * alimenta el tablero, así que las dos pantallas no pueden contradecirse.
 */
import { useMemo, useState } from 'react'
import { Box, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Assessment } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { crmApi } from '@/api/crm'
import {
  BORDE, CRM_COLOR, COLOR_SEGMENTO, Encabezados, Estado, Panel,
  legible, num, pesos,
} from '@/components/crm/comunes'

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                      'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Verde si llegó, ámbar si anda cerca, rojo si se quedó. */
const colorCumplimiento = (pct: number) =>
  pct >= 100 ? '#059669' : pct >= 80 ? '#F59E0B' : '#EF4444'

export default function CRMReportes() {
  const [tab, setTab] = useState(0)

  const objetivos = useQuery({
    queryKey: ['crm', 'objetivos'],
    queryFn: () => crmApi.objetivos(),
  })
  const clientes = useQuery({
    queryKey: ['crm', 'clientes', 'Todos', ''],
    queryFn: () => crmApi.clientes(),
  })
  const oportunidades = useQuery({
    queryKey: ['crm', 'oportunidades'],
    queryFn: () => crmApi.oportunidades(),
  })
  const contratos = useQuery({
    queryKey: ['crm', 'contratos'],
    queryFn: () => crmApi.contratos(),
  })
  const tickets = useQuery({
    queryKey: ['crm', 'tickets', 'Todos'],
    queryFn: () => crmApi.tickets(),
  })
  const kpis = useQuery({
    queryKey: ['crm', 'kpis-diarios', 400],
    queryFn: () => crmApi.kpisDiarios(365),
  })

  // Cada ejecutivo, con su cuota y con lo que se puede contar de su cartera.
  const porEjecutivo = useMemo(() => {
    return (objetivos.data ?? []).map(o => {
      const suyos = (clientes.data ?? []).filter(c => c.ejecutivo_id === o.ejecutivo_id)
      const susOpo = (oportunidades.data ?? []).filter(x => x.ejecutivo_id === o.ejecutivo_id)
      const abiertas = susOpo.filter(
        x => !['CIERRE_GANADO', 'CIERRE_PERDIDO'].includes(x.estado))
      const cerradas = susOpo.filter(
        x => ['CIERRE_GANADO', 'CIERRE_PERDIDO'].includes(x.estado))
      const ganadas = cerradas.filter(x => x.estado === 'CIERRE_GANADO')
      const susTickets = (tickets.data ?? []).filter(
        t => t.ejecutivo_id === o.ejecutivo_id &&
             ['ABIERTO', 'EN_PROCESO', 'ESCALADO'].includes(t.estado))
      return {
        o,
        clientes: suyos.length,
        activos: suyos.filter(c => c.estado === 'CLIENTE_ACTIVO').length,
        embudo: abiertas.reduce((s, x) => s + num(x.valor_estimado), 0),
        // La tasa de cierre solo sobre lo decidido: meter lo abierto en el
        // denominador la hunde y hace parecer que se vende peor de lo que se vende.
        tasa: cerradas.length
          ? Math.round((ganadas.length / cerradas.length) * 100) : null,
        pendientes: susTickets.length,
      }
    })
  }, [objetivos.data, clientes.data, oportunidades.data, tickets.data])

  const porSegmento = useMemo(() => {
    const activos = (contratos.data ?? []).filter(k => k.estado === 'ACTIVO')
    const g: Record<string, {
      n: number; activos: number; anual: number; mensual: number; salud: number[]
    }> = {}
    for (const c of clientes.data ?? []) {
      const k = c.segmento || 'SIN_SEGMENTO'
      const s = (g[k] ||= { n: 0, activos: 0, anual: 0, mensual: 0, salud: [] })
      s.n++
      if (c.estado === 'CLIENTE_ACTIVO') s.activos++
      s.anual += num(c.ingresos_ytd)
      s.mensual += activos
        .filter(x => x.cliente_id === c.id)
        .reduce((t, x) => t + num(x.valor_mensual), 0)
      if (c.health_score > 0) s.salud.push(c.health_score)
    }
    return Object.entries(g).sort((a, b) => b[1].anual - a[1].anual)
  }, [clientes.data, contratos.data])

  const serie = useMemo(() => {
    const porMes: Record<string, { fecha: string; embudo: number; tasa: number }> = {}
    for (const k of kpis.data ?? []) {
      const mes = k.fecha.slice(0, 7)
      const actual = porMes[mes]
      if (!actual || k.fecha > actual.fecha) {
        porMes[mes] = {
          fecha: k.fecha,
          embudo: num(k.pipeline_valor),
          tasa: num(k.win_rate),
        }
      }
    }
    return Object.entries(porMes)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([mes, v]) => ({
        etiqueta: `${MESES_CORTOS[Number(mes.slice(5, 7)) - 1]} ${mes.slice(2, 4)}`,
        embudo: v.embudo, tasa: v.tasa,
      }))
  }, [kpis.data])
  const maxEmbudo = Math.max(1, ...serie.map(s => s.embudo))

  const metaTotal = (objetivos.data ?? []).reduce((s, o) => s + num(o.meta), 0)
  const logradoTotal = (objetivos.data ?? []).reduce((s, o) => s + num(o.logrado), 0)
  const cumplimiento = metaTotal ? (logradoTotal / metaTotal) * 100 : null

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Assessment sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Desempeño comercial
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Cuota y cumplimiento por ejecutivo, por segmento y en el tiempo
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Cuota del equipo', value: pesos(metaTotal), color: '#7C3AED' },
            { label: 'Cerrado', value: pesos(logradoTotal), color: '#059669' },
            { label: 'Cumplimiento',
              value: cumplimiento == null ? '—' : `${cumplimiento.toFixed(0)}%`,
              color: cumplimiento == null ? '#94A3B8' : colorCumplimiento(cumplimiento) },
            { label: 'Ejecutivos con cuota',
              value: objetivos.data?.length ?? 0, color: CRM_COLOR },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {objetivos.isLoading ? '·' : k.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>
                  {k.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${CRM_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: CRM_COLOR },
        }}>
          <Tab label="Por ejecutivo" />
          <Tab label="Por segmento" />
          <Tab label="Tendencia" />
        </Tabs>

        {tab === 0 && (
          <Panel>
            <Estado cargando={objetivos.isLoading} error={objetivos.error}
              vacio={!porEjecutivo.length}
              mensajeVacio="Ningún ejecutivo tiene cuota asignada"
              hint="Sin cuota no hay contra qué medir el cierre.">
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Ejecutivo', 'Región', 'Cuota', 'Cerrado',
                    'Cumplimiento', 'Cartera', 'Embudo abierto', 'Tasa de cierre',
                    'Tickets sin cerrar']} />
                  <tbody>
                    {porEjecutivo.map(f => {
                      const pct = num(f.o.porcentaje)
                      const col = colorCumplimiento(pct)
                      return (
                        <tr key={f.o.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{f.o.ejecutivo}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{f.o.region || '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{pesos(f.o.meta)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: CRM_COLOR, whiteSpace: 'nowrap' }}>{pesos(f.o.logrado)}</td>
                          <td style={{ padding: '10px 14px', minWidth: 140 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 62, height: 6, borderRadius: 3, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                                <Box sx={{ height: '100%', width: `${Math.min(100, pct)}%`,
                                           bgcolor: col, borderRadius: 3 }} />
                              </Box>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: col,
                                                fontVariantNumeric: 'tabular-nums' }}>
                                {pct.toFixed(0)}%
                              </Typography>
                            </Box>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                            {f.activos} de {f.clientes}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{pesos(f.embudo)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700,
                                       fontVariantNumeric: 'tabular-nums',
                                       color: f.tasa == null ? '#9CA3AF'
                                         : f.tasa >= 30 ? '#059669' : '#F59E0B' }}>
                            {f.tasa == null ? '—' : `${f.tasa}%`}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700,
                                       fontVariantNumeric: 'tabular-nums',
                                       color: f.pendientes > 3 ? '#EF4444' : '#6B7280' }}>
                            {f.pendientes}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Box>
            </Estado>
          </Panel>
        )}

        {tab === 1 && (
          <Panel>
            <Estado cargando={clientes.isLoading} error={clientes.error}
              vacio={!porSegmento.length} mensajeVacio="No hay clientes segmentados">
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Segmento', 'Cuentas', 'Ya son clientes',
                    'Facturado al año', 'Mensual', 'Promedio por cuenta', 'Salud media']} />
                  <tbody>
                    {porSegmento.map(([seg, s]) => {
                      const sc = COLOR_SEGMENTO[seg] || '#94A3B8'
                      const saludMedia = s.salud.length
                        ? Math.round(s.salud.reduce((a, b) => a + b, 0) / s.salud.length)
                        : null
                      return (
                        <tr key={seg} style={{ borderBottom: `1px solid ${BORDE}` }}>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={legible(seg)} size="small" sx={{
                              bgcolor: alpha(sc, 0.15), color: sc,
                              fontSize: 10.5, fontWeight: 700,
                            }} />
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.n}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                            {s.activos}
                            <Box component="span" sx={{ color: 'text.disabled', fontSize: 11 }}>
                              {' '}· {s.n ? Math.round((s.activos / s.n) * 100) : 0}%
                            </Box>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: CRM_COLOR, whiteSpace: 'nowrap' }}>{pesos(s.anual)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{pesos(s.mensual)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{pesos(s.anual / Math.max(1, s.n))}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800,
                                       fontVariantNumeric: 'tabular-nums',
                                       color: saludMedia == null ? '#9CA3AF'
                                         : saludMedia >= 75 ? '#059669' : '#F59E0B' }}>
                            {saludMedia ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Box>
            </Estado>
          </Panel>
        )}

        {tab === 2 && (
          <Panel sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
              Embudo abierto y tasa de cierre, mes a mes
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2.5 }}>
              La barra es el embudo al cerrar el mes; el punto, la tasa de cierre
              acumulada. Sirven juntos: un embudo que crece con la tasa cayendo
              significa que se está llenando de negocios que no se van a ganar.
            </Typography>
            <Estado cargando={kpis.isLoading} error={kpis.error} vacio={!serie.length}
              mensajeVacio="Todavía no hay historia mensual"
              hint="Se acumula con los indicadores que el sistema calcula a diario.">
              <Box sx={{ position: 'relative', height: 250, display: 'flex',
                         alignItems: 'flex-end', gap: 1.25, overflowX: 'auto', pb: 1 }}>
                {serie.map(s => (
                  <Box key={s.etiqueta} sx={{
                    flex: '1 0 52px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', height: '100%', justifyContent: 'flex-end',
                    position: 'relative',
                  }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#059669',
                                      mb: 0.25 }}>
                      {s.tasa.toFixed(0)}%
                    </Typography>
                    {/* El punto de la tasa se coloca sobre la altura de la barra
                        para que se lea la relación entre las dos series sin
                        necesidad de un segundo eje. */}
                    <Box sx={{
                      width: 7, height: 7, borderRadius: '50%', bgcolor: '#059669',
                      mb: 0.5, flexShrink: 0,
                    }} />
                    <Typography sx={{ fontSize: 9.5, color: CRM_COLOR, fontWeight: 700,
                                      whiteSpace: 'nowrap' }}>
                      {pesos(s.embudo)}
                    </Typography>
                    <Box sx={{
                      width: '100%',
                      height: `${Math.max(3, (s.embudo / maxEmbudo) * 68)}%`,
                      bgcolor: CRM_COLOR, borderRadius: '4px 4px 0 0', opacity: 0.85,
                    }} />
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5 }}>
                      {s.etiqueta}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Estado>
          </Panel>
        )}
      </Box>
    </Layout>
  )
}
