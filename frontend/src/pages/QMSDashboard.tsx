/**
 * QMS · Torre de control de calidad
 *
 * Era una maqueta: ocho cifras con su «% vs mes anterior», un cumplimiento por
 * norma ISO, una tendencia de NC, cuatro alertas y tres auditorías, todo
 * escrito a mano. Ahora:
 *
 *  - Las cifras vienen de `/qms/dashboard`, que ya las calculaba.
 *  - La tendencia, las alertas y las próximas auditorías se derivan de los
 *    registros: no hay alertas guardadas, se leen del estado de las cosas.
 *  - Las flechas de «vs mes anterior» se quitaron: el servidor no guarda la
 *    foto del mes pasado y un porcentaje sin base es peor que ninguno.
 *  - El «Cumplimiento ISO» por norma no tenía de dónde salir —ningún registro
 *    del sistema mide qué porcentaje de una norma se cumple—. Se reemplazó por
 *    lo que sí se sabe de cada norma: sus auditorías y los hallazgos abiertos.
 */
import React, { useMemo } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, List, ListItem, Button, alpha,
  Divider, Table, TableBody, TableCell, TableHead, TableRow, Paper, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { WorkspacePremium, Refresh, CheckCircle, FactCheck, BugReport, Dangerous } from '@mui/icons-material'
import { useQuery, useQueryClient, useIsFetching } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { qmsApi, aNumero, aUmbrales } from '@/api/qms'

import { COLOR_MODULO } from '@/config/marca'
const QMS_COLOR = COLOR_MODULO

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIA = 86400000

interface KPICardProps { label: string; value: string; color?: string; icon?: React.ReactNode }
function KPICard({ label, value, color = QMS_COLOR, icon }: KPICardProps) {
  return (
    <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
      <CardContent sx={{ p: '16px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
          </Box>
          {icon && <Box sx={{ color, opacity: 0.7 }}>{icon}</Box>}
        </Box>
      </CardContent>
    </Card>
  )
}

type Alerta = { nivel: 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA'; texto: string }
const NIVEL_COLOR: Record<Alerta['nivel'], string> = { 'CRÍTICA': '#DC2626', ALTA: '#EA580C', MEDIA: '#D97706', BAJA: '#059669' }
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`

export default function QMSDashboard() {
  const qc = useQueryClient()
  const cargando = useIsFetching({ predicate: q => String(q.queryKey[0]).startsWith('qms-') }) > 0

  const { data: t } = useQuery({ queryKey: ['qms-dashboard'], queryFn: qmsApi.tablero })
  const { data: ncs = [] } = useQuery({ queryKey: ['qms-nc'], queryFn: () => qmsApi.noConformidades() })
  const { data: capas = [] } = useQuery({ queryKey: ['qms-capas'], queryFn: () => qmsApi.capas() })
  const { data: auditorias = [] } = useQuery({ queryKey: ['qms-auditorias'], queryFn: () => qmsApi.auditorias() })
  const { data: hallazgos = [] } = useQuery({ queryKey: ['qms-hallazgos'], queryFn: () => qmsApi.hallazgos() })
  // Los días de aviso son los de Configuración → Umbrales.
  const { data: params } = useQuery({ queryKey: ['qms-parametros'], queryFn: qmsApi.parametros })
  const u = aUmbrales(params)

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

  // NC detectadas por mes, los últimos seis meses incluido el actual.
  const tendencia = useMemo(() => {
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1)
      return { clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, mes: MESES[d.getMonth()], nc: 0 }
    })
    for (const nc of ncs) {
      const f = (nc.fecha_deteccion ?? nc.created_at ?? '').slice(0, 7)
      const m = meses.find(x => x.clave === f)
      if (m) m.nc++
    }
    return meses
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ncs])
  const maxNC = Math.max(1, ...tendencia.map(d => d.nc))

  const alertas = useMemo(() => {
    const out: Alerta[] = []
    const abiertas = capas.filter((c: any) => c.estado !== 'CERRADA')
    const vencidas = abiertas.filter((c: any) => c.fecha_limite && new Date(c.fecha_limite) < hoy)
    const porVencer = abiertas.filter((c: any) => {
      if (!c.fecha_limite) return false
      const d = (new Date(c.fecha_limite).getTime() - hoy.getTime()) / DIA
      return d >= 0 && d <= u.capa_dias_aviso
    })
    if (vencidas.length) out.push({ nivel: 'CRÍTICA', texto: `${plural(vencidas.length, 'CAPA vencida', 'CAPA vencidas')}${vencidas.length === 1 && vencidas[0].codigo ? ` (${vencidas[0].codigo})` : ''}` })
    if (porVencer.length) out.push({ nivel: 'ALTA', texto: `${plural(porVencer.length, 'CAPA vence', 'CAPA vencen')} en los próximos ${u.capa_dias_aviso} días` })

    const conCapa = new Set(capas.map((c: any) => c.nc_id).filter((x: any) => x != null))
    const sinCapa = ncs.filter((n: any) => n.estado !== 'CERRADA' && ['MAYOR', 'CRITICA'].includes(n.clasificacion) && !conCapa.has(n.id))
    if (sinCapa.length) out.push({ nivel: 'ALTA', texto: `${plural(sinCapa.length, 'NC mayor o crítica', 'NC mayores o críticas')} sin CAPA asignada` })

    // NC abiertas más allá del plazo de cierre que corresponde a su gravedad.
    const atrasadas = ncs.filter((n: any) => {
      if (n.estado === 'CERRADA') return false
      const desde = n.fecha_deteccion ?? n.created_at
      if (!desde) return false
      const plazo = ['MAYOR', 'CRITICA'].includes(n.clasificacion) ? u.nc_mayor_dias_cierre : u.nc_menor_dias_cierre
      return (hoy.getTime() - new Date(desde).getTime()) / DIA > plazo
    })
    if (atrasadas.length) out.push({ nivel: 'MEDIA', texto: `${plural(atrasadas.length, 'NC abierta', 'NC abiertas')} más allá de su plazo de cierre` })

    const proximas = auditorias.filter(a => a.estado === 'PLANIFICADA' && a.fecha_inicio_plan)
      .map(a => ({ a, dias: Math.round((new Date(a.fecha_inicio_plan!).getTime() - hoy.getTime()) / DIA) }))
      .filter(x => x.dias >= 0 && x.dias <= u.auditoria_dias_aviso)
      .sort((x, y) => x.dias - y.dias)
    if (proximas.length) {
      const { a, dias } = proximas[0]
      out.push({ nivel: 'MEDIA', texto: `Auditoría «${a.nombre}» ${dias === 0 ? 'empieza hoy' : `en ${dias} día${dias === 1 ? '' : 's'}`}` })
    }
    const halVencidos = hallazgos.filter(h => h.estado !== 'CERRADO' && h.fecha_limite && new Date(h.fecha_limite) < hoy)
    if (halVencidos.length) out.push({ nivel: 'MEDIA', texto: `${plural(halVencidos.length, 'hallazgo abierto', 'hallazgos abiertos')} con fecha límite vencida` })
    if (t && aNumero(t.riesgos_criticos) > 0) out.push({ nivel: 'ALTA', texto: `${plural(aNumero(t.riesgos_criticos), 'riesgo crítico activo', 'riesgos críticos activos')}` })
    const orden = ['CRÍTICA', 'ALTA', 'MEDIA', 'BAJA']
    return out.sort((x, y) => orden.indexOf(x.nivel) - orden.indexOf(y.nivel))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capas, ncs, auditorias, hallazgos, t, params])

  // Lo que se sabe de cada norma: sus auditorías y lo que dejaron abierto.
  const porNorma = useMemo(() => {
    const m = new Map<string, { norma: string; total: number; completadas: number; abiertos: number }>()
    const normaDe = new Map<number, string>()
    for (const a of auditorias) {
      if (!a.norma || a.estado === 'CANCELADA') continue
      normaDe.set(a.id, a.norma)
      const r = m.get(a.norma) ?? { norma: a.norma, total: 0, completadas: 0, abiertos: 0 }
      r.total++; if (a.estado === 'COMPLETADA') r.completadas++
      m.set(a.norma, r)
    }
    for (const h of hallazgos) {
      const n = h.auditoria_id != null ? normaDe.get(h.auditoria_id) : undefined
      if (n && h.estado !== 'CERRADO') m.get(n)!.abiertos++
    }
    return [...m.values()].sort((a, b) => b.total - a.total)
  }, [auditorias, hallazgos])

  const proximas = auditorias
    .filter(a => ['PLANIFICADA', 'EN_EJECUCION'].includes(a.estado))
    .sort((a, b) => (a.fecha_inicio_plan ?? '9').localeCompare(b.fecha_inicio_plan ?? '9'))
    .slice(0, 6)

  const cifra = (k: string) => (t ? String(aNumero(t[k])) : '—')

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WorkspacePremium sx={{ color: QMS_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Torre de Control de Calidad</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>QMS · Indicadores del sistema de gestión</Typography>
            </Box>
            <Chip label="QMS" size="small" sx={{ bgcolor: alpha(QMS_COLOR, 0.15), color: QMS_COLOR, fontWeight: 700, border: `1px solid ${alpha(QMS_COLOR, 0.3)}` }} />
          </Box>
          <Button startIcon={<Refresh />} size="small" disabled={cargando}
            onClick={() => qc.invalidateQueries({ predicate: q => String(q.queryKey[0]).startsWith('qms-') })}
            sx={{ color: QMS_COLOR, borderColor: alpha(QMS_COLOR, 0.4), border: 1, borderRadius: 2 }}>
            Actualizar
          </Button>
        </Box>
        {cargando && <LinearProgress sx={{ mb: 2 }} />}

        <Grid container spacing={2} sx={{ mb: 3 }} className="anim-stagger">
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="Índice de Calidad" value={t ? `${aNumero(t.indice_calidad).toFixed(1)}%` : '—'} color={QMS_COLOR} icon={<CheckCircle />} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="NC Abiertas" value={cifra('nc_abiertas')} color="#DC2626" icon={<BugReport />} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="Auditorías Pendientes" value={cifra('auditorias_pendientes')} color="#D97706" icon={<FactCheck />} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="CAPA Activas" value={cifra('capas_activas')} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="Hallazgos Abiertos" value={cifra('hallazgos_abiertos')} color="#EA580C" /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="Riesgos Críticos" value={cifra('riesgos_criticos')} color="#DC2626" icon={<Dangerous />} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="Quejas Abiertas" value={cifra('quejas_abiertas')} color="#D97706" /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><KPICard label="NPS Promedio" value={t ? aNumero(t.nps_promedio).toFixed(0) : '—'} color={QMS_COLOR} /></Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Auditorías por norma</Typography>
                {porNorma.length === 0 && <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Ninguna auditoría tiene norma registrada.</Typography>}
                {porNorma.map(s => {
                  const pct = s.total ? (s.completadas / s.total) * 100 : 0
                  return (
                    <Box key={s.norma} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>{s.norma}</Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                          {s.completadas}/{s.total} completadas
                          {s.abiertos > 0 && <Box component="span" sx={{ color: '#DC2626', fontWeight: 700 }}> · {s.abiertos} hallazgo{s.abiertos === 1 ? '' : 's'} abierto{s.abiertos === 1 ? '' : 's'}</Box>}
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct}
                        sx={{ height: 6, borderRadius: 3, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: QMS_COLOR, borderRadius: 3 } }} />
                    </Box>
                  )
                })}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>NC detectadas · Últimos 6 meses</Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 110, px: 1 }}>
                  {tendencia.map(d => (
                    <Box key={d.clave} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ fontSize: 10, color: '#DC2626', fontWeight: 700 }}>{d.nc}</Typography>
                      <Box sx={{ width: '100%', height: `${(d.nc / maxNC) * 80}px`, minHeight: 2, bgcolor: alpha('#DC2626', 0.7), borderRadius: '4px 4px 0 0' }} />
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{d.mes}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ p: '16px !important' }}>
                <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>Alertas de Calidad</Typography>
                {alertas.length === 0 && <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Sin alertas: nada vencido ni por vencer.</Typography>}
                <List dense disablePadding>
                  {alertas.map((a, i) => (
                    <ListItem key={i} disablePadding sx={{ mb: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Chip label={a.nivel} size="small" sx={{ bgcolor: alpha(NIVEL_COLOR[a.nivel], 0.15), color: NIVEL_COLOR[a.nivel], fontSize: 9, fontWeight: 700, height: 18 }} />
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25, pl: 0.5 }}>{a.texto}</Typography>
                      {i < alertas.length - 1 && <Divider sx={{ mt: 1, width: '100%', borderColor: '#F1F5F9' }} />}
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: 2 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Próximas Auditorías</Typography>
            <Paper sx={{ bgcolor: 'transparent' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { borderColor: '#F1F5F9', color: 'text.disabled', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' } }}>
                    <TableCell>Código</TableCell><TableCell>Nombre</TableCell><TableCell>Tipo</TableCell><TableCell>Fecha</TableCell><TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proximas.length === 0 && (
                    <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', color: 'text.secondary', py: 2 }}>No hay auditorías planificadas ni en curso</TableCell></TableRow>
                  )}
                  {proximas.map(a => (
                    <TableRow key={a.id} sx={{ '& td': { borderColor: '#F9FAFB', color: 'text.secondary', fontSize: 12.5 } }}>
                      <TableCell><Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: QMS_COLOR }}>{a.codigo || '—'}</Typography></TableCell>
                      <TableCell>{a.nombre}</TableCell>
                      <TableCell><Chip label={a.tipo} size="small" sx={{ fontSize: 10, height: 20 }} /></TableCell>
                      <TableCell>{a.fecha_inicio_plan?.slice(0, 10) ?? '—'}</TableCell>
                      <TableCell>
                        <Chip label={a.estado.replace('_', ' ')} size="small" sx={{ fontSize: 10, height: 20, fontWeight: 700, bgcolor: alpha('#D97706', 0.15), color: '#D97706' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </CardContent>
        </Card>
      </Box>
    </Layout>
  )
}
