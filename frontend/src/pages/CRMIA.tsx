/**
 * Señales comerciales: qué conviene hacer con cada cuenta, y por qué.
 *
 * POR QUÉ NO SE LLAMA «PREDICCIÓN»
 * Porque no lo es. Son reglas explícitas sobre datos que ya están: quién
 * factura por debajo de su potencial, a quién se le vence el contrato sin
 * renovación automática, quién viene con la salud caída. Cada línea dice de qué
 * dato sale, y por eso se puede discutir. Una recomendación que no se puede
 * rebatir no se aplica: se ignora.
 *
 * QUÉ SE QUITÓ
 * La maqueta tenía un asistente de chat con respuestas escritas a mano. No hay
 * modelo detrás, y un chat que responde lo mismo pase lo que pase es peor que
 * no tener chat: el cliente lo prueba dos veces y deja de creerle al resto del
 * módulo. En su lugar va la lista de tareas pendientes, que sí es real.
 */
import { useState } from 'react'
import { Box, Typography, Tab, Tabs, Chip, alpha, Button } from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  AutoAwesome, TrendingUp, Autorenew, HealthAndSafety, Replay,
  ArrowForward, TaskAlt,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { crmApi } from '@/api/crm'
import {
  BORDE, CRM_COLOR, Estado, Panel, fecha, legible, num, pesos,
} from '@/components/crm/comunes'

const CFG_TIPO: Record<string, { color: string; icono: JSX.Element; nombre: string }> = {
  AMPLIAR:   { color: '#059669', icono: <TrendingUp sx={{ fontSize: 16 }} />, nombre: 'Ampliar' },
  RENOVAR:   { color: '#0EA5E9', icono: <Autorenew sx={{ fontSize: 16 }} />, nombre: 'Renovar' },
  RECUPERAR: { color: '#EF4444', icono: <HealthAndSafety sx={{ fontSize: 16 }} />, nombre: 'Recuperar' },
  REACTIVAR: { color: '#7C3AED', icono: <Replay sx={{ fontSize: 16 }} />, nombre: 'Reactivar' },
  CONVERTIR: { color: CRM_COLOR, icono: <ArrowForward sx={{ fontSize: 16 }} />, nombre: 'Convertir' },
}

const COLOR_RIESGO: Record<string, string> = {
  BAJO: '#059669', MEDIO: '#F59E0B', ALTO: CRM_COLOR, CRITICO: '#EF4444',
}

export default function CRMIA() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [tipo, setTipo] = useState('Todas')

  const recomendaciones = useQuery({
    queryKey: ['crm', 'recomendaciones'],
    queryFn: () => crmApi.recomendaciones(),
  })
  const salud = useQuery({
    queryKey: ['crm', 'salud'],
    queryFn: () => crmApi.salud(),
  })
  const riesgos = useQuery({
    queryKey: ['crm', 'riesgos'],
    queryFn: () => crmApi.riesgos(),
  })
  const actividades = useQuery({
    queryKey: ['crm', 'actividades'],
    queryFn: () => crmApi.actividades({ pendientes: true }),
  })

  const completar = useMutation({
    mutationFn: (id: number) => crmApi.completarActividad(id),
    onSuccess: () => {
      toast.success('Tarea marcada como hecha')
      qc.invalidateQueries({ queryKey: ['crm', 'actividades'] })
    },
    onError: () => toast.error('No se pudo marcar la tarea'),
  })

  const todas = recomendaciones.data ?? []
  const lista = tipo === 'Todas' ? todas : todas.filter(r => r.tipo === tipo)
  const potencialTotal = todas.reduce((s, r) => s + num(r.potencial), 0)

  // Ordenadas por riesgo de pérdida, que es lo contrario de la salud. Las
  // cuentas sin contrato no tienen salud que medir y no salen aquí.
  const enRiesgo = (salud.data ?? [])
    .filter(s => s.health_score > 0 && s.health_score < 75)
    .sort((a, b) => a.health_score - b.health_score)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AutoAwesome sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Señales comerciales
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Qué hacer con cada cuenta, con el dato del que sale
            </Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${CRM_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: CRM_COLOR },
        }}>
          <Tab label={`Recomendaciones${todas.length ? ` (${todas.length})` : ''}`} />
          <Tab label={`Cuentas en riesgo${enRiesgo.length ? ` (${enRiesgo.length})` : ''}`} />
          <Tab label={`Tareas pendientes${actividades.data?.length ? ` (${actividades.data.length})` : ''}`} />
        </Tabs>

        {tab === 0 && (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label="Todas" size="small" onClick={() => setTipo('Todas')}
                sx={{
                  cursor: 'pointer',
                  bgcolor: tipo === 'Todas' ? CRM_COLOR : '#F1F5F9',
                  color: tipo === 'Todas' ? '#FFF' : 'text.secondary',
                  fontWeight: tipo === 'Todas' ? 700 : 400,
                }} />
              {Object.entries(CFG_TIPO).map(([t, cfg]) => {
                const n = todas.filter(r => r.tipo === t).length
                return (
                  <Chip key={t} label={`${cfg.nombre}${n ? ` · ${n}` : ''}`} size="small"
                    onClick={() => setTipo(t)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: tipo === t ? cfg.color : '#F1F5F9',
                      color: tipo === t ? '#FFF' : 'text.secondary',
                      fontWeight: tipo === t ? 700 : 400,
                    }} />
                )
              })}
              <Box sx={{ flex: 1 }} />
              {!!potencialTotal && (
                <Typography sx={{ fontSize: 12, color: CRM_COLOR, fontWeight: 700 }}>
                  Potencial identificado: {pesos(potencialTotal)}
                </Typography>
              )}
            </Box>

            <Estado cargando={recomendaciones.isLoading} error={recomendaciones.error}
              vacio={!lista.length}
              mensajeVacio={tipo === 'Todas'
                ? 'No hay nada que recomendar hoy'
                : `Nada de tipo «${CFG_TIPO[tipo]?.nombre ?? tipo}»`}
              hint={tipo === 'Todas'
                ? 'Todas las cuentas facturan cerca de su potencial, los contratos se renuevan solos y nadie está en deterioro.'
                : 'Pruebe con otro tipo de señal.'}>
              <Grid container spacing={2}>
                {lista.map((r, i) => {
                  const cfg = CFG_TIPO[r.tipo] ?? { color: '#94A3B8', icono: null, nombre: r.tipo }
                  return (
                    <Grid key={i} size={{ xs: 12, md: 6 }}>
                      <Panel sx={{ p: 2, height: '100%',
                                   borderColor: alpha(cfg.color, 0.3) }}>
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                          <Box sx={{
                            width: 34, height: 34, borderRadius: '9px', flexShrink: 0,
                            bgcolor: alpha(cfg.color, 0.15), display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            '& svg': { color: cfg.color },
                          }}>{cfg.icono}</Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                              {r.titulo}
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                              {r.cliente}
                            </Typography>
                          </Box>
                          <Chip label={cfg.nombre} size="small" sx={{
                            bgcolor: alpha(cfg.color, 0.12), color: cfg.color,
                            fontSize: 9.5, fontWeight: 700, flexShrink: 0, height: 20,
                          }} />
                        </Box>
                        <Typography sx={{ fontSize: 12.5, lineHeight: 1.55, mb: 1.25 }}>
                          {r.razon}
                        </Typography>
                        <Box sx={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', pt: 1.25,
                          borderTop: `1px solid ${BORDE}`,
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 44, height: 4, borderRadius: 2,
                                       bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${r.urgencia}%`,
                                         bgcolor: cfg.color, borderRadius: 2 }} />
                            </Box>
                            <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
                              prioridad {r.urgencia}
                            </Typography>
                          </Box>
                          {!!num(r.potencial) && (
                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>
                              {pesos(r.potencial)}
                            </Typography>
                          )}
                        </Box>
                      </Panel>
                    </Grid>
                  )
                })}
              </Grid>
            </Estado>
          </>
        )}

        {tab === 1 && (
          <Panel sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
              Cuentas cuya salud viene por debajo de 75
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
              El puntaje se compone de cinco cosas y aquí se muestran las cinco:
              un número solo dice que la cuenta está mal, el desglose dice por
              dónde.
            </Typography>
            <Estado cargando={salud.isLoading} error={salud.error}
              vacio={!enRiesgo.length}
              mensajeVacio="Ninguna cuenta por debajo de 75"
              hint="Todas las cuentas con contrato están en buen estado.">
              {enRiesgo.map(s => {
                const suRiesgo = (riesgos.data ?? []).find(r => r.cliente_id === s.cliente_id)
                const col = s.health_score < 55 ? '#EF4444'
                  : s.health_score < 65 ? CRM_COLOR : '#F59E0B'
                const componentes = [
                  { n: 'Servicio', v: s.score_tickets },
                  { n: 'Satisfacción', v: s.score_nps },
                  { n: 'Entregas', v: s.score_otif },
                  { n: 'Pago', v: s.score_pagos },
                  { n: 'Contrato', v: s.score_contratos },
                ].filter(c => c.v != null)
                return (
                  <Box key={s.id} sx={{
                    p: 2, mb: 1.5, borderRadius: 1.5,
                    bgcolor: alpha(col, 0.05), border: `1px solid ${alpha(col, 0.25)}`,
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between',
                               alignItems: 'flex-start', gap: 1.5, mb: 1.25 }}>
                      <Box>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                          {s.cliente}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                          calculado el {fecha(s.fecha_calculo)}
                          {num(s.ingresos_ytd) ? ` · factura ${pesos(s.ingresos_ytd)} al año` : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 22, fontWeight: 900, color: col,
                                          lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                          {s.health_score}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                          de salud
                        </Typography>
                      </Box>
                    </Box>
                    <Grid container spacing={0.75} sx={{ mb: 1 }}>
                      {componentes.map(c => (
                        <Grid key={c.n} size={{ xs: 6, sm: 4, md: 2.4 }}>
                          <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: 1,
                                     bgcolor: 'background.paper',
                                     border: `1px solid ${BORDE}` }}>
                            <Typography sx={{
                              fontSize: 14, fontWeight: 800,
                              fontVariantNumeric: 'tabular-nums',
                              color: (c.v as number) < 60 ? '#EF4444' : '#059669',
                            }}>{c.v}</Typography>
                            <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }}>
                              {c.n}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                    {s.prediccion_ia && (
                      <Typography sx={{ fontSize: 12, lineHeight: 1.5 }}>
                        {s.prediccion_ia}
                      </Typography>
                    )}
                    {suRiesgo?.plan_mitigacion && (
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.75 }}>
                        <b>Plan acordado:</b> {suRiesgo.plan_mitigacion}
                      </Typography>
                    )}
                    {suRiesgo && (
                      <Chip label={`riesgo ${suRiesgo.nivel.toLowerCase()}`} size="small"
                        sx={{
                          mt: 1, height: 19, fontSize: 9.5, fontWeight: 700,
                          bgcolor: alpha(COLOR_RIESGO[suRiesgo.nivel] || col, 0.15),
                          color: COLOR_RIESGO[suRiesgo.nivel] || col,
                        }} />
                    )}
                  </Box>
                )
              })}
            </Estado>
          </Panel>
        )}

        {tab === 2 && (
          <Panel sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
              Lo que cada ejecutivo tiene por hacer
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
              Ordenado por vencimiento. Lo vencido va primero y en rojo.
            </Typography>
            <Estado cargando={actividades.isLoading} error={actividades.error}
              vacio={!actividades.data?.length}
              mensajeVacio="No hay tareas pendientes"
              hint="Todo lo que estaba agendado se completó.">
              {actividades.data?.map(a => {
                const vencida = a.fecha_vencimiento
                  ? new Date(a.fecha_vencimiento).getTime() < Date.now() : false
                const col = vencida ? '#EF4444'
                  : a.prioridad === 'ALTA' ? '#F59E0B' : '#94A3B8'
                return (
                  <Box key={a.id} sx={{
                    display: 'flex', gap: 1.5, alignItems: 'center',
                    p: 1.5, mb: 1, borderRadius: 1.5,
                    bgcolor: vencida ? alpha('#EF4444', 0.05) : '#F9FAFB',
                    border: `1px solid ${vencida ? alpha('#EF4444', 0.25) : BORDE}`,
                  }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                        {a.asunto}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {a.cliente || 'Sin cliente'} · {legible(a.tipo)}
                        {a.descripcion ? ` · ${a.descripcion}` : ''}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 11.5, color: col, fontWeight: vencida ? 700 : 400,
                                      flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {vencida ? 'vencida · ' : ''}{fecha(a.fecha_vencimiento)}
                    </Typography>
                    <Button size="small" startIcon={<TaskAlt sx={{ fontSize: 15 }} />}
                      disabled={completar.isPending}
                      onClick={() => completar.mutate(a.id)}
                      sx={{ textTransform: 'none', flexShrink: 0, fontSize: 12 }}>
                      Hecha
                    </Button>
                  </Box>
                )
              })}
            </Estado>
          </Panel>
        )}
      </Box>
    </Layout>
  )
}
