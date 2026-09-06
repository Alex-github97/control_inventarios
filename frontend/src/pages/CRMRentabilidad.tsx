/**
 * Cuánto vale cada cliente y cómo se concentra la facturación.
 *
 * POR QUÉ NO HAY MARGEN
 * La maqueta mostraba costo y margen por cliente. El CRM no guarda el costo de
 * servir a nadie: eso vive en la contabilidad, y ese enlace todavía no está.
 * Mostrar un margen calculado con un porcentaje inventado sería peor que no
 * mostrarlo, porque alguien lo llevaría a un comité. Aquí va lo que sí se puede
 * sostener: lo facturado, lo comprometido en contrato y cómo se reparte.
 *
 * LA CONCENTRACIÓN ES EL DATO IMPORTANTE
 * Cuántos clientes hacen el 80% de la facturación responde a la pregunta que de
 * verdad quita el sueño: qué pasa si se va uno. Es una cifra que ninguna suma
 * de ingresos deja ver por sí sola.
 */
import { useMemo, useState } from 'react'
import { Box, Typography, Tab, Tabs, Chip, alpha, Alert } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { MonetizationOn } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { crmApi } from '@/api/crm'
import {
  BORDE, CRM_COLOR, COLOR_SEGMENTO, Encabezados, Estado, Panel,
  legible, num, pesos,
} from '@/components/crm/comunes'

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                      'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export default function CRMRentabilidad() {
  const [tab, setTab] = useState(0)

  const clientes = useQuery({
    queryKey: ['crm', 'clientes', 'Todos', ''],
    queryFn: () => crmApi.clientes(),
  })
  const contratos = useQuery({
    queryKey: ['crm', 'contratos'],
    queryFn: () => crmApi.contratos(),
  })
  const salud = useQuery({
    queryKey: ['crm', 'salud'],
    queryFn: () => crmApi.salud(),
  })
  const kpis = useQuery({
    queryKey: ['crm', 'kpis-diarios', 400],
    queryFn: () => crmApi.kpisDiarios(365),
  })

  // Una fila por cliente que factura, con lo que está comprometido en contrato.
  const filas = useMemo(() => {
    const activos = (contratos.data ?? []).filter(k => k.estado === 'ACTIVO')
    return (clientes.data ?? [])
      .map(c => {
        const suyos = activos.filter(k => k.cliente_id === c.id)
        const mensual = suyos.reduce((s, k) => s + num(k.valor_mensual), 0)
        const comprometido = suyos.reduce((s, k) => s + num(k.valor_total), 0)
        const suSalud = (salud.data ?? []).find(s => s.cliente_id === c.id)
        return {
          c, mensual, comprometido,
          anual: num(c.ingresos_ytd),
          contratos: suyos.length,
          salud: suSalud?.health_score ?? c.health_score,
          riesgo: suSalud ? num(suSalud.riesgo_churn) : null,
        }
      })
      .filter(f => f.anual > 0 || f.mensual > 0)
      .sort((a, b) => b.anual - a.anual)
  }, [clientes.data, contratos.data, salud.data])

  const totalAnual = filas.reduce((s, f) => s + f.anual, 0)
  const totalComprometido = filas.reduce((s, f) => s + f.comprometido, 0)
  const totalMensual = filas.reduce((s, f) => s + f.mensual, 0)

  // Cuántos clientes hacen el 80%. Se recorre la lista ya ordenada de mayor a
  // menor y se cuenta hasta cruzar el umbral.
  const concentracion = useMemo(() => {
    if (!totalAnual) return null
    let acumulado = 0
    for (let i = 0; i < filas.length; i++) {
      acumulado += filas[i].anual
      if (acumulado >= totalAnual * 0.8) return i + 1
    }
    return filas.length
  }, [filas, totalAnual])

  // La serie mensual sale de los indicadores diarios: se toma el último día de
  // cada mes, que es el que refleja los contratos vigentes al cerrarlo.
  const serie = useMemo(() => {
    const porMes: Record<string, { fecha: string; valor: number }> = {}
    for (const k of kpis.data ?? []) {
      const mes = k.fecha.slice(0, 7)
      const actual = porMes[mes]
      if (!actual || k.fecha > actual.fecha) {
        porMes[mes] = { fecha: k.fecha, valor: num(k.ingresos_mes) }
      }
    }
    return Object.entries(porMes)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([mes, v]) => ({
        etiqueta: `${MESES_CORTOS[Number(mes.slice(5, 7)) - 1]} ${mes.slice(2, 4)}`,
        valor: v.valor,
      }))
  }, [kpis.data])
  const maxSerie = Math.max(1, ...serie.map(s => s.valor))

  // Por segmento, agregando lo de arriba.
  const porSegmento = useMemo(() => {
    const g: Record<string, { n: number; anual: number; mensual: number; salud: number[] }> = {}
    for (const f of filas) {
      const k = f.c.segmento || 'SIN_SEGMENTO'
      const s = (g[k] ||= { n: 0, anual: 0, mensual: 0, salud: [] })
      s.n++; s.anual += f.anual; s.mensual += f.mensual
      if (f.salud > 0) s.salud.push(f.salud)
    }
    return Object.entries(g).sort((a, b) => b[1].anual - a[1].anual)
  }, [filas])

  const cargando = clientes.isLoading || contratos.isLoading

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MonetizationOn sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Valor de la cartera
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Qué factura cada cliente y cómo se concentra
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Facturado en el año', value: pesos(totalAnual), color: CRM_COLOR },
            { label: 'Facturación mensual', value: pesos(totalMensual), color: '#059669' },
            { label: 'Comprometido en contratos', value: pesos(totalComprometido), color: '#7C3AED',
              nota: 'valor total de lo firmado' },
            { label: 'Hacen el 80%',
              value: concentracion == null ? '—' : `${concentracion} cliente(s)`,
              color: concentracion != null && concentracion <= 3 ? '#EF4444' : '#0EA5E9',
              nota: concentracion != null && concentracion <= 3
                ? 'cartera muy concentrada' : `de ${filas.length}` },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {cargando ? '·' : k.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>
                  {k.label}
                </Typography>
                {k.nota && (
                  <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{k.nota}</Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>

        <Alert severity="info" sx={{ mb: 3, fontSize: 12.5 }}>
          Aquí no aparece el margen por cliente: el costo de servir a cada cuenta
          está en la contabilidad y ese enlace todavía no está hecho. Lo que se
          muestra es lo facturado y lo comprometido, que sí se puede sustentar.
        </Alert>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${CRM_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: CRM_COLOR },
        }}>
          <Tab label="Por cliente" />
          <Tab label="Por segmento" />
          <Tab label="Mes a mes" />
        </Tabs>

        <Estado cargando={cargando} error={clientes.error ?? contratos.error}
          vacio={!filas.length}
          mensajeVacio="Ningún cliente factura todavía"
          hint="La facturación aparece al firmar el primer contrato.">

          {tab === 0 && (
            <Panel>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Cliente', 'Segmento', 'Facturado al año',
                    '% de la cartera', 'Mensual', 'Contratos',
                    'Comprometido', 'Salud', 'Riesgo de pérdida']} />
                  <tbody>
                    {filas.map(f => {
                      const parte = totalAnual ? (f.anual / totalAnual) * 100 : 0
                      const sc = COLOR_SEGMENTO[f.c.segmento || ''] || '#94A3B8'
                      const colSalud = f.salud >= 75 ? '#059669'
                        : f.salud >= 60 ? '#F59E0B' : '#EF4444'
                      return (
                        <tr key={f.c.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{f.c.razon_social}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {f.c.segmento
                              ? <Chip label={legible(f.c.segmento)} size="small"
                                  sx={{ bgcolor: alpha(sc, 0.12), color: sc, fontSize: 9.5 }} />
                              : <span style={{ color: '#9CA3AF' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: CRM_COLOR, whiteSpace: 'nowrap' }}>{pesos(f.anual)}</td>
                          <td style={{ padding: '10px 14px', minWidth: 120 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 56, height: 5, borderRadius: 3, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                                <Box sx={{ height: '100%', width: `${Math.min(100, parte)}%`,
                                           bgcolor: CRM_COLOR, borderRadius: 3 }} />
                              </Box>
                              <Typography sx={{ fontSize: 11.5, fontWeight: 700,
                                                fontVariantNumeric: 'tabular-nums' }}>
                                {parte.toFixed(1)}%
                              </Typography>
                            </Box>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{pesos(f.mensual)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{f.contratos}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{pesos(f.comprometido)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800,
                                       color: f.salud > 0 ? colSalud : '#9CA3AF',
                                       fontVariantNumeric: 'tabular-nums' }}>
                            {f.salud > 0 ? f.salud : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                                       color: f.riesgo == null ? '#9CA3AF'
                                         : f.riesgo >= 20 ? '#EF4444' : '#059669' }}>
                            {f.riesgo == null ? '—' : `${f.riesgo.toFixed(0)}%`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Box>
            </Panel>
          )}

          {tab === 1 && (
            <Panel>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Segmento', 'Clientes', 'Facturado al año',
                    '% de la cartera', 'Mensual', 'Promedio por cliente', 'Salud media']} />
                  <tbody>
                    {porSegmento.map(([seg, s]) => {
                      const parte = totalAnual ? (s.anual / totalAnual) * 100 : 0
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
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: CRM_COLOR, whiteSpace: 'nowrap' }}>{pesos(s.anual)}</td>
                          <td style={{ padding: '10px 14px', minWidth: 130 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 64, height: 6, borderRadius: 3, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                                <Box sx={{ height: '100%', width: `${parte}%`, bgcolor: sc, borderRadius: 3 }} />
                              </Box>
                              <Typography sx={{ fontSize: 12, fontWeight: 700,
                                                fontVariantNumeric: 'tabular-nums' }}>
                                {parte.toFixed(0)}%
                              </Typography>
                            </Box>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{pesos(s.mensual)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{pesos(s.anual / s.n)}</td>
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
            </Panel>
          )}

          {tab === 2 && (
            <Panel sx={{ p: 2.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                Facturación mensual comprometida
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2.5 }}>
                La suma de los contratos vigentes al cerrar cada mes. Sube cuando
                se firma y baja cuando algo vence sin renovar.
              </Typography>
              <Estado cargando={kpis.isLoading} error={kpis.error} vacio={!serie.length}
                mensajeVacio="Todavía no hay historia mensual"
                hint="Se acumula con los indicadores que el sistema calcula a diario.">
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.25,
                           height: 220, overflowX: 'auto', pb: 1 }}>
                  {serie.map(s => (
                    <Box key={s.etiqueta} sx={{
                      flex: '1 0 46px', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', height: '100%', justifyContent: 'flex-end',
                    }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: CRM_COLOR, mb: 0.5,
                                        whiteSpace: 'nowrap' }}>
                        {pesos(s.valor)}
                      </Typography>
                      <Box sx={{
                        width: '100%',
                        height: `${Math.max(3, (s.valor / maxSerie) * 100)}%`,
                        bgcolor: CRM_COLOR, borderRadius: '4px 4px 0 0',
                        opacity: 0.85,
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
        </Estado>
      </Box>
    </Layout>
  )
}
