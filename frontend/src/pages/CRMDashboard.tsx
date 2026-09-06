/**
 * La torre de control comercial.
 *
 * DE DÓNDE SALE CADA CIFRA
 * Las ocho tarjetas de arriba salen de `crm_kpi_diario`, que el servidor calcula
 * de las mismas listas que muestran las demás pantallas. Es lo que evita que el
 * tablero diga «53 oportunidades» y la pantalla de oportunidades muestre otra
 * cosa: quien nota esa diferencia deja de creerle a las dos.
 *
 * La comparación con el mes anterior también es real: se toma el registro
 * diario de hace treinta días. Poner un «+12%» fijo es lo que convierte un
 * tablero en un adorno.
 */
import { Box, Typography, Chip, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  TrendingUp, People, Receipt, SupportAgent,
  StarRate, Handshake, Warning, EmojiEvents,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { crmApi, type KPIDiario } from '@/api/crm'
import {
  BORDE, CRM_COLOR, COLOR_ETAPA, Estado, Panel,
  legible, num, pesos,
} from '@/components/crm/comunes'

const ETAPAS_EMBUDO = [
  'IDENTIFICACION', 'CALIFICACION', 'PROPUESTA', 'NEGOCIACION', 'CIERRE_GANADO',
]

const NIVEL_COLOR: Record<string, string> = {
  CRITICO: '#EF4444', ALTO: CRM_COLOR, MEDIO: '#F59E0B',
}

/** «+12%» contra el mismo indicador de hace un mes. Sin dato viejo, nada. */
function variacion(hoy: number, antes?: number): string | undefined {
  if (antes == null || antes === 0) return undefined
  const pct = ((hoy - antes) / antes) * 100
  if (Math.abs(pct) < 0.5) return 'igual que hace un mes'
  return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}% vs. hace un mes`
}

export default function CRMDashboard() {
  const kpis = useQuery({
    queryKey: ['crm', 'kpis-diarios', 40],
    queryFn: () => crmApi.kpisDiarios(40),
  })
  const oportunidades = useQuery({
    queryKey: ['crm', 'oportunidades'],
    queryFn: () => crmApi.oportunidades(),
  })
  const alertas = useQuery({
    queryKey: ['crm', 'alertas'],
    queryFn: () => crmApi.alertas(),
  })

  // El servidor devuelve los días de más reciente a más antiguo.
  const hoy: KPIDiario | undefined = kpis.data?.[0]
  const mesPasado: KPIDiario | undefined = kpis.data?.[Math.min(29, (kpis.data?.length ?? 1) - 1)]

  const abiertas = (oportunidades.data ?? []).filter(
    o => !['CIERRE_GANADO', 'CIERRE_PERDIDO'].includes(o.estado))

  // El embudo se arma de las oportunidades reales. «Cierre ganado» cuenta las
  // del último trimestre y no las de toda la historia: un embudo que acumula
  // los cierres de tres años pierde toda proporción con las etapas de arriba.
  const haceTresMeses = new Date()
  haceTresMeses.setMonth(haceTresMeses.getMonth() - 3)
  const embudo = ETAPAS_EMBUDO.map(etapa => {
    const suyas = (oportunidades.data ?? []).filter(o =>
      o.estado === etapa &&
      (etapa !== 'CIERRE_GANADO' ||
       (o.fecha_cierre != null && new Date(o.fecha_cierre) >= haceTresMeses)))
    return {
      etapa,
      cant: suyas.length,
      valor: suyas.reduce((s, o) => s + num(
        etapa === 'CIERRE_GANADO' ? (o.valor_contratado ?? o.valor_estimado)
                                  : o.valor_estimado), 0),
      color: COLOR_ETAPA[etapa] || CRM_COLOR,
    }
  })
  const maxValor = Math.max(1, ...embudo.map(e => e.valor))

  const tarjetas = hoy ? [
    { label: 'Pipeline abierto', value: pesos(hoy.pipeline_valor), color: CRM_COLOR,
      icon: <TrendingUp />, sub: variacion(num(hoy.pipeline_valor), num(mesPasado?.pipeline_valor)) },
    { label: 'Clientes activos', value: hoy.clientes_activos, color: '#0EA5E9',
      icon: <People />, sub: `${hoy.total_clientes} en el portafolio` },
    { label: 'Tasa de cierre', value: `${num(hoy.win_rate).toFixed(0)}%`, color: '#059669',
      icon: <EmojiEvents />, sub: variacion(num(hoy.win_rate), num(mesPasado?.win_rate)) },
    { label: 'Contratos activos', value: hoy.contratos_activos, color: '#7C3AED',
      icon: <Handshake />, sub: hoy.contratos_por_vencer
        ? `${hoy.contratos_por_vencer} vencen en 90 días` : 'ninguno por vencer' },
    { label: 'Tickets abiertos', value: hoy.tickets_abiertos, color: '#F59E0B',
      icon: <SupportAgent />, sub: hoy.tickets_escalados
        ? `${hoy.tickets_escalados} escalado(s)` : 'ninguno escalado' },
    { label: 'Satisfacción media', value: num(hoy.csat_promedio)
        ? `${num(hoy.csat_promedio).toFixed(1)} / 5` : '—',
      color: '#059669', icon: <StarRate />,
      sub: num(hoy.csat_promedio) ? 'de los tickets calificados' : 'sin encuestas aún' },
    { label: 'Oportunidades', value: hoy.oportunidades_activas, color: '#D97706',
      icon: <Receipt />, sub: `conversión ${num(hoy.tasa_conversion).toFixed(0)}%` },
    { label: 'Alertas', value: alertas.data?.length ?? '—', color: '#EF4444',
      icon: <Warning />,
      sub: alertas.data?.length
        ? `${alertas.data.filter(a => a.nivel === 'CRITICO').length} crítica(s)`
        : 'nada urgente' },
  ] : []

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${alpha(CRM_COLOR, 0.4)}`,
          }}>
            <TrendingUp sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Torre de control comercial
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Embudo, clientes, servicio y contratos
            </Typography>
          </Box>
        </Box>

        <Estado cargando={kpis.isLoading} error={kpis.error} vacio={!hoy}
          mensajeVacio="Todavía no hay indicadores calculados"
          hint="Se generan a diario a partir de la actividad comercial.">
          <Grid container spacing={2} sx={{ mb: 3 }} className="anim-stagger">
            {tarjetas.map((k, i) => (
              <Grid key={i} size={{ xs: 6, sm: 4, lg: 3 }}>
                <Box className="hover-lift" sx={{
                  border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2,
                  p: 2, display: 'flex', gap: 1.5, alignItems: 'center', height: '100%',
                }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${k.color} 0%, ${alpha(k.color, 0.6)} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    '& svg': { color: '#fff', fontSize: 20 },
                    boxShadow: `0 3px 10px ${alpha(k.color, 0.35)}`,
                  }}>
                    {k.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{
                      fontSize: 22, fontWeight: 900, color: k.color, lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{k.value}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25 }}>
                      {k.label}
                    </Typography>
                    {k.sub && (
                      <Typography sx={{ fontSize: 10, color: k.color, fontWeight: 600 }}>
                        {k.sub}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Estado>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Panel sx={{ p: 2.5, height: '100%' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                Embudo por etapa
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2.5 }}>
                Los cierres ganados son los del último trimestre.
              </Typography>
              <Estado cargando={oportunidades.isLoading} error={oportunidades.error}
                vacio={!oportunidades.data?.length}
                mensajeVacio="No hay oportunidades registradas">
                {embudo.map(e => (
                  <Box key={e.etapa} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: e.color }} />
                        <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>
                          {legible(e.etapa)}
                        </Typography>
                        <Chip label={e.cant} size="small" sx={{
                          bgcolor: alpha(e.color, 0.15), color: e.color,
                          fontSize: 10, height: 18,
                        }} />
                      </Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: e.color }}>
                        {pesos(e.valor)}
                      </Typography>
                    </Box>
                    <Box sx={{ height: 6, borderRadius: 3, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                      <Box sx={{
                        height: '100%', width: `${(e.valor / maxValor) * 100}%`,
                        bgcolor: e.color, borderRadius: 3, transition: 'width .6s ease',
                      }} />
                    </Box>
                  </Box>
                ))}
              </Estado>
            </Panel>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Panel sx={{ p: 2.5, height: '100%' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                Oportunidades abiertas
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                Las de mayor valor primero.
              </Typography>
              <Estado cargando={oportunidades.isLoading} error={oportunidades.error}
                vacio={!abiertas.length}
                mensajeVacio="No hay ninguna oportunidad abierta"
                hint="Todo lo del embudo está cerrado, ganado o perdido.">
                {abiertas
                  .slice()
                  .sort((a, b) => num(b.valor_estimado) - num(a.valor_estimado))
                  .slice(0, 6)
                  .map(o => {
                    const col = COLOR_ETAPA[o.estado] || CRM_COLOR
                    return (
                      <Box key={o.id} sx={{
                        mb: 1.5, p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1.5,
                        border: `1px solid ${BORDE}`,
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, gap: 1 }}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>
                            {o.nombre}
                          </Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 800, color: CRM_COLOR, flexShrink: 0 }}>
                            {pesos(o.valor_estimado)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            {o.codigo}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Chip label={legible(o.estado)} size="small" sx={{
                              bgcolor: alpha(col, 0.15), color: col,
                              fontSize: 9.5, fontWeight: 600,
                            }} />
                            <Typography sx={{ fontSize: 11, color: col, fontWeight: 700 }}>
                              {o.probabilidad}%
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ mt: 0.75, height: 3, borderRadius: 2, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                          <Box sx={{
                            height: '100%', width: `${o.probabilidad}%`,
                            bgcolor: col, borderRadius: 2,
                          }} />
                        </Box>
                      </Box>
                    )
                  })}
              </Estado>
            </Panel>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Panel sx={{ p: 2.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                Alertas comerciales
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                Contratos por vencer, plazos incumplidos y cuentas en deterioro.
                Cada una lleva el documento que la origina.
              </Typography>
              <Estado cargando={alertas.isLoading} error={alertas.error}
                vacio={!alertas.data?.length}
                mensajeVacio="Nada que atender hoy"
                hint="Ningún contrato por vencer, ningún plazo incumplido y ninguna cuenta en deterioro.">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {alertas.data?.map((a, i) => {
                    const col = NIVEL_COLOR[a.nivel] || '#F59E0B'
                    return (
                      <Box key={i} sx={{
                        display: 'flex', gap: 1.5, p: 1.5, alignItems: 'center',
                        bgcolor: alpha(col, 0.07), borderRadius: 1.5,
                        border: `1px solid ${alpha(col, 0.2)}`,
                      }}>
                        <Chip label={a.nivel} size="small" sx={{
                          bgcolor: alpha(col, 0.2), color: col,
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                        }} />
                        {a.referencia && (
                          <Typography sx={{
                            fontSize: 11, fontFamily: 'monospace', color: 'text.secondary',
                            flexShrink: 0, minWidth: 104,
                          }}>
                            {a.referencia}
                          </Typography>
                        )}
                        <Typography sx={{ fontSize: 12.5, lineHeight: 1.5 }}>
                          {a.texto}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              </Estado>
            </Panel>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
