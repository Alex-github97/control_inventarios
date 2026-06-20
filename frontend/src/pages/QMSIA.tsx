// QMS Module - IA y Análisis Avanzado
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Tab, Tabs,
  alpha, LinearProgress,
} from '@mui/material'
import { AutoFixHigh, Psychology, TrendingDown, Warning, Lightbulb } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const QMS_COLOR = '#059669'
const AI_COLOR = '#7C3AED'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

// Ishikawa: 6M categorías
const ISHIKAWA_CAUSES = [
  { categoria: 'Mano de Obra', color: '#DC2626', causas: ['Capacitación insuficiente en protocolos', 'Alta rotación de conductores', 'Fatiga por jornadas extensas', 'Comunicación deficiente en turno'] },
  { categoria: 'Máquina', color: '#EA580C', causas: ['Vehículos con mantenimiento vencido', 'Fallas en sistema de GPS/tracking', 'Equipos de cargue obsoletos'] },
  { categoria: 'Método', color: '#D97706', causas: ['Procedimientos desactualizados', 'Rutas sin optimización', 'Check-list de salida incompleto'] },
  { categoria: 'Material', color: '#0369A1', causas: ['Empaques inadecuados para carga frágil', 'Insumos de seguridad insuficientes', 'Documentación incompleta'] },
  { categoria: 'Medio Ambiente', color: '#7C3AED', causas: ['Condiciones climáticas adversas', 'Zonas de alto riesgo de seguridad', 'Infraestructura vial deficiente'] },
  { categoria: 'Medición', color: QMS_COLOR, causas: ['Indicadores sin baseline definido', 'Frecuencia de medición insuficiente', 'Sin trazabilidad de correcciones'] },
]

const AI_INSIGHTS = [
  { tipo: 'prediccion', titulo: 'Riesgo de NC elevado en Julio', desc: 'El modelo detecta un patrón de incremento del 34% en NCs los meses post-vacaciones. Se sugiere refuerzo de auditorías la primera semana de julio.', confianza: 89, accion: 'Programar auditoría preventiva 2026-07-07', icon: <Warning sx={{ fontSize: 16 }} />, color: '#DC2626' },
  { tipo: 'patron', titulo: 'Correlación hallazgos – rotación RRHH', desc: 'Se detecta correlación 0.74 entre períodos de alta rotación de conductores y no conformidades operacionales. El 68% de NCs ocurren en los primeros 30 días de un conductor nuevo.', confianza: 74, accion: 'Fortalecer programa de inducción a nuevos conductores', icon: <Psychology sx={{ fontSize: 16 }} />, color: '#7C3AED' },
  { tipo: 'mejora', titulo: 'Oportunidad: rutas de bajo riesgo sin KPI asignado', desc: 'El 23% de las rutas de corta distancia no tienen indicadores de seguimiento. Sin medición, no hay mejora posible en esos trayectos.', confianza: 91, accion: 'Asignar KPIs básicos a las 12 rutas sin medición', icon: <Lightbulb sx={{ fontSize: 16 }} />, color: '#D97706' },
  { tipo: 'prediccion', titulo: 'Proveedor Empaques del Norte: riesgo de salir a deficiente', desc: 'La tendencia de evaluación del proveedor cae 3.2 puntos/mes. En 2 meses alcanzará zona deficiente si no se toman acciones correctivas.', confianza: 82, accion: 'Reunión de seguimiento con el proveedor esta semana', icon: <TrendingDown sx={{ fontSize: 16 }} />, color: '#EA580C' },
]

const TENDENCIAS = [
  { mes: 'Ene', nc: 12, capas: 8, hallazgos: 18 },
  { mes: 'Feb', nc: 9, capas: 7, hallazgos: 14 },
  { mes: 'Mar', nc: 14, capas: 10, hallazgos: 20 },
  { mes: 'Abr', nc: 11, capas: 9, hallazgos: 16 },
  { mes: 'May', nc: 8, capas: 6, hallazgos: 13 },
  { mes: 'Jun', nc: 10, capas: 7, hallazgos: 15 },
]
const maxNc = Math.max(...TENDENCIAS.map(t => t.nc))
const maxH = Math.max(...TENDENCIAS.map(t => t.hallazgos))

export default function QMSIA() {
  const [tab, setTab] = useState(0)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AutoFixHigh sx={{ color: AI_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>IA & Análisis Avanzado</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>QMS · Causa raíz · Predicción · Ishikawa</Typography>
            </Box>
            <Chip label="QMS + IA" size="small" sx={{ bgcolor: alpha(AI_COLOR, 0.15), color: AI_COLOR, fontWeight: 700, border: `1px solid ${alpha(AI_COLOR, 0.3)}` }} />
          </Box>
          <Chip icon={<Psychology sx={{ fontSize: 14 }} />} label="Modelo activo" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.1), color: QMS_COLOR, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'rgba(255,255,255,0.45)', fontSize: 13 }, '& .Mui-selected': { color: AI_COLOR }, '& .MuiTabs-indicator': { bgcolor: AI_COLOR } }}>
          <Tab label="Insights IA" />
          <Tab label="Análisis Ishikawa" />
          <Tab label="Tendencias" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            {AI_INSIGHTS.map((ins, i) => (
              <Grid key={i} size={{ xs: 12, md: 6 }}>
                <Card sx={{ bgcolor: '#111827', border: `1px solid ${alpha(ins.color, 0.25)}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: '16px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: alpha(ins.color, 0.15), color: ins.color }}>
                          {ins.icon}
                        </Box>
                        <Box>
                          <Chip label={ins.tipo} size="small" sx={{ fontSize: 9, height: 16, bgcolor: alpha(ins.color, 0.12), color: ins.color, mb: 0.25 }} />
                          <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 13 }}>{ins.titulo}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right', ml: 1, flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 18, fontWeight: 800, color: ins.color }}>{ins.confianza}%</Typography>
                        <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>confianza</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', mb: 1.5, lineHeight: 1.5 }}>{ins.desc}</Typography>
                    <Box sx={{ p: 1, borderRadius: 1, bgcolor: alpha(ins.color, 0.08), border: `1px solid ${alpha(ins.color, 0.2)}` }}>
                      <Typography sx={{ fontSize: 11, color: ins.color, fontWeight: 600 }}>→ {ins.accion}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: '#FFF', fontSize: 16 }}>Diagrama de Ishikawa — No Conformidades Operacionales</Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Análisis de causa raíz · Efecto: Entregas fuera de SLA</Typography>
              </Box>

              {/* Efecto */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#DC2626', 0.15), border: '2px solid #DC2626', minWidth: 180, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>EFECTO PRINCIPAL</Typography>
                  <Typography sx={{ fontSize: 14, color: '#FFF', fontWeight: 800 }}>Entregas fuera de SLA</Typography>
                </Box>
              </Box>

              {/* Espina */}
              <Box sx={{ position: 'relative' }}>
                <Box sx={{ width: '85%', height: 3, bgcolor: '#DC2626', borderRadius: 1, mb: 0, ml: 0 }} />
                <Grid container spacing={1.5} sx={{ mt: 0 }}>
                  {ISHIKAWA_CAUSES.map((cat) => (
                    <Grid key={cat.categoria} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Card sx={{ bgcolor: alpha(cat.color, 0.07), border: `1px solid ${alpha(cat.color, 0.25)}`, borderRadius: 2 }}>
                        <CardContent sx={{ p: '12px !important' }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 800, color: cat.color, mb: 1, borderBottom: `1px solid ${alpha(cat.color, 0.3)}`, pb: 0.5 }}>{cat.categoria}</Typography>
                          {cat.causas.map((causa, j) => (
                            <Box key={j} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: cat.color, flexShrink: 0, mt: 0.75 }} />
                              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{causa}</Typography>
                            </Box>
                          ))}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Grid container spacing={3}>
            {/* NC Trend */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2 }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, color: '#FFF', mb: 0.5 }}>No Conformidades por Mes</Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', mb: 2 }}>2026 — tendencia con predicción IA</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 120 }}>
                    {TENDENCIAS.map((t, i) => (
                      <Box key={t.mes} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#DC2626' }}>{t.nc}</Typography>
                        <Box sx={{ width: '100%', height: `${(t.nc / maxNc) * 90}px`, borderRadius: '3px 3px 0 0', bgcolor: i === TENDENCIAS.length - 1 ? alpha('#DC2626', 0.4) : '#DC2626', border: i === TENDENCIAS.length - 1 ? '1px dashed #DC2626' : 'none' }} />
                        <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{t.mes}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Hallazgos trend */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2 }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, color: '#FFF', mb: 0.5 }}>Hallazgos por Mes</Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', mb: 2 }}>2026 — tendencia con predicción IA</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 120 }}>
                    {TENDENCIAS.map((t, i) => (
                      <Box key={t.mes} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#D97706' }}>{t.hallazgos}</Typography>
                        <Box sx={{ width: '100%', height: `${(t.hallazgos / maxH) * 90}px`, borderRadius: '3px 3px 0 0', bgcolor: i === TENDENCIAS.length - 1 ? alpha('#D97706', 0.4) : '#D97706', border: i === TENDENCIAS.length - 1 ? '1px dashed #D97706' : 'none' }} />
                        <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{t.mes}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Resumen IA */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: alpha(AI_COLOR, 0.06), border: `1px solid ${alpha(AI_COLOR, 0.25)}`, borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Psychology sx={{ color: AI_COLOR, fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, color: AI_COLOR }}>Resumen IA — Recomendaciones del Mes</Typography>
                  </Box>
                  {[
                    'El índice de calidad general está en 87.3%, por encima de la meta del 85%. Mantener el ritmo de auditorías internas.',
                    'Las NCs de categoría SST representan el 38% del total. Focalizar los próximos CAPA en este proceso.',
                    'La eficiencia de cierre de hallazgos mejoró 12% respecto a mayo. El programa de formación de auditores está dando resultados.',
                    '3 proveedores están en riesgo de degradación de categoría. Se recomienda convocar comité de proveedores para semana del 23 de junio.',
                  ].map((rec, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.75 }}>
                      <Typography sx={{ fontSize: 13, color: AI_COLOR, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</Typography>
                      <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{rec}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Box>
    </Layout>
  )
}
