/**
 * AGS · Agenda — vista de día con una columna por profesional.
 *
 * Es la pantalla de mostrador: se ve de un golpe quién está ocupado y a qué
 * hora, se agenda sobre un espacio libre y desde cada cita se dispara todo el
 * ciclo (confirmar, atender, cobrar, recordar por WhatsApp).
 */
import { useMemo, useState } from 'react'
import {
  Box, Typography, Stack, Button, IconButton, TextField, MenuItem, Card, Chip,
  Menu, ListItemIcon, ListItemText, Tooltip, Alert, Divider, alpha, Paper,
  ToggleButtonGroup, ToggleButton, CircularProgress,
} from '@mui/material'
import {
  ChevronLeft, ChevronRight, Today as TodayIcon, Add as AddIcon,
  CheckCircle, PlayArrow, PointOfSale, WhatsApp, Cancel, PersonOff,
  Edit as EditIcon, MoreVert, EventBusy, Payments, Place,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import {
  AGS_COLOR, AGS_DARK, fmtCOP, fmtHora, fmtMinutos, hoyISO, sumarDiasISO,
  estadoCita, TRANSICIONES_CITA, DIAS_SEMANA,
  type Cita, type Profesional, type AGSConfigData, type Recordatorio,
} from '@/utils/ags'
import { DialogoCita } from '@/components/ags/DialogoCita'
import { DialogoCobro } from '@/components/ags/DialogoCobro'

// Altura en píxeles de un minuto de agenda. 1.4 deja una cita de 30 min en
// 42px: suficiente para leer el nombre del cliente sin volver la columna
// interminable en un día de 11 horas.
const PX_POR_MIN = 1.4
const ANCHO_HORAS = 56

function aMinutos(hhmm?: string | null): number {
  if (!hhmm) return 0
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function etiquetaDia(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  const dia = DIAS_SEMANA.find(x => x.valor === (d.getDay() === 0 ? 7 : d.getDay()))
  return `${dia?.label ?? ''} ${d.getDate()} de ${d.toLocaleDateString('es-CO', { month: 'long' })}`
}

export default function AGSAgenda() {
  const qc = useQueryClient()
  const [fecha, setFecha] = useState(hoyISO())
  const [filtroProf, setFiltroProf] = useState<number | 'todos'>('todos')

  // Diálogos
  const [citaDialogo, setCitaDialogo] = useState<{
    abierto: boolean; cita: Cita | null; inicio?: string; profesionalId?: number
  }>({ abierto: false, cita: null })
  const [cobroDialogo, setCobroDialogo] = useState<Cita | null>(null)

  // Menú contextual de una cita
  const [menu, setMenu] = useState<{ el: HTMLElement; cita: Cita } | null>(null)

  const { data: config } = useQuery<AGSConfigData>({
    queryKey: ['ags-config'],
    queryFn: async () => (await api.get('/ags/config')).data,
  })

  const { data: profesionales = [] } = useQuery<Profesional[]>({
    queryKey: ['ags-profesionales'],
    queryFn: async () => (await api.get('/ags/profesionales?solo_activos=true')).data,
  })

  const { data: citas = [], isLoading } = useQuery<Cita[]>({
    queryKey: ['ags-citas-dia', fecha],
    queryFn: async () => (await api.get('/ags/citas', {
      params: { desde: `${fecha}T00:00:00`, hasta: `${fecha}T23:59:59` },
    })).data,
  })

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, estado, motivo }: { id: number; estado: string; motivo?: string }) =>
      (await api.post(`/ags/citas/${id}/estado`, { estado, motivo })).data,
    onSuccess: (_d, v) => {
      toast.success(`Cita ${estadoCita(v.estado).label.toLowerCase()}`)
      qc.invalidateQueries({ queryKey: ['ags-citas-dia'] })
      qc.invalidateQueries({ queryKey: ['ags-dashboard'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo cambiar el estado'),
  })

  const recordar = useMutation({
    mutationFn: async (id: number) =>
      (await api.post(`/ags/citas/${id}/recordatorio`)).data as Recordatorio,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['ags-citas-dia'] })
      if (r.enlace_whatsapp) {
        window.open(r.enlace_whatsapp, '_blank', 'noopener')
        toast.success('Se abrió WhatsApp con el recordatorio listo')
      } else {
        navigator.clipboard?.writeText(r.mensaje)
        toast.success('El cliente no tiene teléfono. Mensaje copiado al portapapeles.')
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo generar el recordatorio'),
  })

  // Ventana horaria del tablero: la del negocio, ampliada si alguna cita
  // se sale de ella (una urgencia atendida fuera de horario debe verse).
  const { minInicio, minFin, horas } = useMemo(() => {
    let ini = aMinutos(config?.hora_apertura ?? '08:00')
    let fin = aMinutos(config?.hora_cierre ?? '19:00')
    for (const c of citas) {
      ini = Math.min(ini, aMinutos(fmtHora(c.fecha_inicio)))
      fin = Math.max(fin, aMinutos(fmtHora(c.fecha_fin)))
    }
    ini = Math.floor(ini / 60) * 60
    fin = Math.ceil(fin / 60) * 60
    if (fin <= ini) fin = ini + 60
    const lista: number[] = []
    for (let h = ini; h <= fin; h += 60) lista.push(h)
    return { minInicio: ini, minFin: fin, horas: lista }
  }, [config, citas])

  const columnas = useMemo(
    () => (filtroProf === 'todos' ? profesionales : profesionales.filter(p => p.id === filtroProf)),
    [profesionales, filtroProf],
  )

  const citasPorProf = useMemo(() => {
    const mapa = new Map<number, Cita[]>()
    for (const c of citas) {
      if (c.estado === 'CANCELADA') continue  // liberó el espacio, no lo ocupa
      const lista = mapa.get(c.profesional_id) ?? []
      lista.push(c)
      mapa.set(c.profesional_id, lista)
    }
    return mapa
  }, [citas])

  const resumenDia = useMemo(() => {
    const vivas = citas.filter(c => c.estado !== 'CANCELADA')
    return {
      total: vivas.length,
      atendidas: vivas.filter(c => c.estado === 'COMPLETADA').length,
      ingresos: vivas.filter(c => c.estado === 'COMPLETADA')
        .reduce((s, c) => s + (c.total || 0), 0),
      porCobrar: vivas.filter(c => c.estado === 'COMPLETADA' && !c.pagado)
        .reduce((s, c) => s + (c.saldo || 0), 0),
    }
  }, [citas])

  const altoTablero = (minFin - minInicio) * PX_POR_MIN

  /** Click sobre un espacio vacío: agenda a esa hora con ese profesional. */
  const clickEnVacio = (e: React.MouseEvent<HTMLDivElement>, profesionalId: number) => {
    const caja = e.currentTarget.getBoundingClientRect()
    const paso = config?.intervalo_agenda_min ?? 30
    const min = minInicio + (e.clientY - caja.top) / PX_POR_MIN
    const alineado = Math.round(min / paso) * paso
    const hh = String(Math.floor(alineado / 60)).padStart(2, '0')
    const mm = String(Math.round(alineado % 60)).padStart(2, '0')
    setCitaDialogo({
      abierto: true, cita: null,
      inicio: `${fecha}T${hh}:${mm}:00`, profesionalId,
    })
  }

  const accionesMenu = (cita: Cita) => {
    const posibles = TRANSICIONES_CITA[cita.estado] ?? []
    const items: { key: string; label: string; icon: JSX.Element; onClick: () => void; color?: string }[] = []

    if (posibles.includes('CONFIRMADA')) items.push({
      key: 'conf', label: 'Confirmar asistencia', icon: <CheckCircle fontSize="small" />,
      onClick: () => cambiarEstado.mutate({ id: cita.id, estado: 'CONFIRMADA' }),
    })
    if (posibles.includes('EN_CURSO')) items.push({
      key: 'curso', label: 'Iniciar atención', icon: <PlayArrow fontSize="small" />,
      onClick: () => cambiarEstado.mutate({ id: cita.id, estado: 'EN_CURSO' }),
    })
    if (!cita.pagado && cita.estado !== 'CANCELADA' && cita.estado !== 'NO_ASISTIO') items.push({
      key: 'cobrar', label: cita.total_pagado > 0 ? 'Completar el pago' : 'Cobrar',
      icon: <PointOfSale fontSize="small" />,
      onClick: () => setCobroDialogo(cita), color: '#16A34A',
    })
    if (cita.estado === 'AGENDADA' || cita.estado === 'CONFIRMADA') items.push({
      key: 'wa', label: 'Recordar por WhatsApp', icon: <WhatsApp fontSize="small" />,
      onClick: () => recordar.mutate(cita.id), color: '#25D366',
    })
    if (!cita.pagado && posibles.length > 0) items.push({
      key: 'edit', label: 'Editar / reprogramar', icon: <EditIcon fontSize="small" />,
      onClick: () => setCitaDialogo({ abierto: true, cita }),
    })
    if (posibles.includes('NO_ASISTIO')) items.push({
      key: 'noshow', label: 'Marcar que no asistió', icon: <PersonOff fontSize="small" />,
      onClick: () => cambiarEstado.mutate({ id: cita.id, estado: 'NO_ASISTIO' }), color: '#DC2626',
    })
    if (posibles.includes('CANCELADA')) items.push({
      key: 'cancel', label: 'Cancelar cita', icon: <Cancel fontSize="small" />,
      onClick: () => {
        const motivo = window.prompt('Motivo de la cancelación (opcional):') ?? undefined
        cambiarEstado.mutate({ id: cita.id, estado: 'CANCELADA', motivo })
      }, color: '#DC2626',
    })
    return items
  }

  return (
    <Layout title="Agenda">
      <Box className="anim-page-in">
        {/* ── Barra de control ── */}
        <Card sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton size="small" onClick={() => setFecha(sumarDiasISO(fecha, -1))}>
                <ChevronLeft />
              </IconButton>
              <Button
                size="small" startIcon={<TodayIcon />} onClick={() => setFecha(hoyISO())}
                variant={fecha === hoyISO() ? 'contained' : 'outlined'}
                sx={fecha === hoyISO() ? { bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } } : undefined}
              >
                Hoy
              </Button>
              <IconButton size="small" onClick={() => setFecha(sumarDiasISO(fecha, 1))}>
                <ChevronRight />
              </IconButton>
              <TextField
                type="date" size="small" value={fecha}
                onChange={e => setFecha(e.target.value)}
                sx={{ width: 165, ml: 1 }}
              />
            </Stack>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ textTransform: 'capitalize' }}>
                {etiquetaDia(fecha)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {resumenDia.total} cita{resumenDia.total === 1 ? '' : 's'} · {resumenDia.atendidas} atendida{resumenDia.atendidas === 1 ? '' : 's'} ·
                {' '}{fmtCOP(resumenDia.ingresos)} facturado
                {resumenDia.porCobrar > 0 && ` · ${fmtCOP(resumenDia.porCobrar)} por cobrar`}
              </Typography>
            </Box>

            <TextField
              select size="small" label="Profesional" sx={{ minWidth: 180 }}
              value={filtroProf}
              onChange={e => setFiltroProf(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
            >
              <MenuItem value="todos">Todo el equipo</MenuItem>
              {profesionales.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
            </TextField>

            <Button
              variant="contained" startIcon={<AddIcon />}
              onClick={() => setCitaDialogo({ abierto: true, cita: null, inicio: `${fecha}T09:00:00` })}
              sx={{ bgcolor: AGS_COLOR, '&:hover': { bgcolor: AGS_DARK } }}
            >
              Agendar cita
            </Button>
          </Stack>
        </Card>

        {/* ── Tablero ── */}
        {profesionales.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Todavía no hay nadie en el equipo. Registre al menos una persona en{' '}
            <strong>Equipo</strong> y defínale su jornada para poder agendar.
          </Alert>
        ) : (
          <Card sx={{ overflow: 'hidden' }}>
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={20} sx={{ color: AGS_COLOR }} />
              </Box>
            )}
            <Box sx={{ display: 'flex', overflowX: 'auto' }}>
              {/* Regla de horas */}
              <Box sx={{ width: ANCHO_HORAS, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ height: 52, borderBottom: '1px solid', borderColor: 'divider' }} />
                <Box sx={{ position: 'relative', height: altoTablero }}>
                  {horas.map(h => (
                    <Typography
                      key={h} variant="caption" color="text.secondary"
                      sx={{
                        position: 'absolute', right: 8, top: (h - minInicio) * PX_POR_MIN - 7,
                        fontSize: 11, fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {String(Math.floor(h / 60)).padStart(2, '0')}:00
                    </Typography>
                  ))}
                </Box>
              </Box>

              {/* Una columna por profesional */}
              {columnas.map(prof => {
                const color = prof.color || AGS_COLOR
                const jornadaHoy = (prof.horarios ?? []).filter(
                  h => h.dia_semana === (new Date(`${fecha}T12:00:00`).getDay() || 7),
                )
                return (
                  <Box
                    key={prof.id}
                    sx={{
                      flex: 1, minWidth: 190, borderRight: '1px solid', borderColor: 'divider',
                      '&:last-of-type': { borderRight: 'none' },
                    }}
                  >
                    {/* Encabezado de la columna */}
                    <Box sx={{
                      height: 52, px: 1.5, borderBottom: '1px solid', borderColor: 'divider',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center',
                      bgcolor: alpha(color, 0.07), borderTop: `3px solid ${color}`,
                    }}>
                      <Typography variant="body2" fontWeight={800} noWrap>{prof.nombre}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {jornadaHoy.length
                          ? jornadaHoy.map(h => `${h.hora_inicio}–${h.hora_fin}`).join(' · ')
                          : 'Sin jornada hoy'}
                      </Typography>
                    </Box>

                    {/* Rejilla + citas */}
                    <Box
                      onClick={e => clickEnVacio(e, prof.id)}
                      sx={{
                        position: 'relative', height: altoTablero, cursor: 'copy',
                        backgroundImage: `repeating-linear-gradient(
                          to bottom,
                          ${alpha('#94A3B8', 0.16)} 0px, ${alpha('#94A3B8', 0.16)} 1px,
                          transparent 1px, transparent ${60 * PX_POR_MIN}px)`,
                      }}
                    >
                      {/* Sombreado de la jornada: lo que está fuera se ve apagado */}
                      {jornadaHoy.map((h, i) => (
                        <Box key={i} sx={{
                          position: 'absolute', left: 0, right: 0,
                          top: (aMinutos(h.hora_inicio) - minInicio) * PX_POR_MIN,
                          height: (aMinutos(h.hora_fin) - aMinutos(h.hora_inicio)) * PX_POR_MIN,
                          bgcolor: alpha(color, 0.05), pointerEvents: 'none',
                        }} />
                      ))}

                      {(citasPorProf.get(prof.id) ?? []).map(cita => {
                        const est = estadoCita(cita.estado)
                        const top = (aMinutos(fmtHora(cita.fecha_inicio)) - minInicio) * PX_POR_MIN
                        const alto = Math.max(cita.duracion_min * PX_POR_MIN, 26)
                        const noVino = cita.estado === 'NO_ASISTIO'
                        return (
                          <Tooltip
                            key={cita.id} arrow placement="right"
                            title={
                              <Box sx={{ py: 0.5 }}>
                                <Typography variant="caption" fontWeight={700} display="block">
                                  {cita.codigo} · {est.label}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  {fmtHora(cita.fecha_inicio)}–{fmtHora(cita.fecha_fin)} ({fmtMinutos(cita.duracion_min)})
                                </Typography>
                                <Typography variant="caption" display="block">{cita.cliente}</Typography>
                                <Typography variant="caption" display="block">{cita.servicios_texto}</Typography>
                                <Typography variant="caption" display="block">
                                  {fmtCOP(cita.total)}{cita.pagado ? ' · pagado' : cita.saldo > 0 ? ` · debe ${fmtCOP(cita.saldo)}` : ''}
                                </Typography>
                              </Box>
                            }
                          >
                            <Paper
                              elevation={0}
                              onClick={e => { e.stopPropagation(); setMenu({ el: e.currentTarget, cita }) }}
                              sx={{
                                position: 'absolute', left: 4, right: 4, top, height: alto,
                                px: 1, py: 0.4, overflow: 'hidden', cursor: 'pointer',
                                borderLeft: `4px solid ${est.color}`,
                                bgcolor: alpha(est.color, noVino ? 0.06 : 0.13),
                                border: `1px solid ${alpha(est.color, 0.35)}`,
                                textDecoration: noVino ? 'line-through' : 'none',
                                transition: 'transform .12s, box-shadow .12s',
                                '&:hover': { transform: 'translateY(-1px)', boxShadow: 3, zIndex: 3 },
                              }}
                            >
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Typography variant="caption" fontWeight={800} sx={{ fontSize: 10.5 }}>
                                  {fmtHora(cita.fecha_inicio)}
                                </Typography>
                                {cita.lugar === 'DOMICILIO' && <Place sx={{ fontSize: 11 }} />}
                                {cita.pagado && <Payments sx={{ fontSize: 11, color: '#16A34A' }} />}
                              </Stack>
                              <Typography variant="caption" fontWeight={700} noWrap display="block" sx={{ fontSize: 11.5 }}>
                                {cita.cliente}
                              </Typography>
                              {alto > 40 && (
                                <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: 10.5 }}>
                                  {cita.servicios_texto}
                                </Typography>
                              )}
                            </Paper>
                          </Tooltip>
                        )
                      })}

                      {jornadaHoy.length === 0 && (
                        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', opacity: 0.4 }}>
                          <EventBusy sx={{ fontSize: 26 }} />
                          <Typography variant="caption">Sin jornada</Typography>
                        </Stack>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
            <Divider />
            <Box sx={{ p: 1.2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Haga clic en un espacio libre para agendar · clic en una cita para ver sus acciones
              </Typography>
            </Box>
          </Card>
        )}

        {/* ── Menú contextual de la cita ── */}
        <Menu
          open={Boolean(menu)} anchorEl={menu?.el} onClose={() => setMenu(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          {menu && (
            <Box sx={{ px: 2, py: 1, minWidth: 250 }}>
              <Typography variant="caption" fontWeight={800} display="block">
                {menu.cita.codigo} · {menu.cita.cliente}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {fmtHora(menu.cita.fecha_inicio)}–{fmtHora(menu.cita.fecha_fin)} · {fmtCOP(menu.cita.total)}
              </Typography>
              <Chip
                size="small" label={estadoCita(menu.cita.estado).label}
                sx={{
                  mt: 0.5, height: 18, fontSize: 10, fontWeight: 700,
                  bgcolor: alpha(estadoCita(menu.cita.estado).color, 0.15),
                  color: estadoCita(menu.cita.estado).color,
                }}
              />
            </Box>
          )}
          <Divider />
          {menu && accionesMenu(menu.cita).map(a => (
            <MenuItem key={a.key} onClick={() => { a.onClick(); setMenu(null) }}>
              <ListItemIcon sx={{ color: a.color }}>{a.icon}</ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: 13.5, color: a.color }}>
                {a.label}
              </ListItemText>
            </MenuItem>
          ))}
          {menu && accionesMenu(menu.cita).length === 0 && (
            <MenuItem disabled>
              <ListItemText primaryTypographyProps={{ fontSize: 13 }}>
                Sin acciones: la cita ya está cerrada
              </ListItemText>
            </MenuItem>
          )}
        </Menu>

        <DialogoCita
          abierto={citaDialogo.abierto}
          cita={citaDialogo.cita}
          inicioSugerido={citaDialogo.inicio}
          profesionalSugerido={citaDialogo.profesionalId}
          onCerrar={() => setCitaDialogo({ abierto: false, cita: null })}
          onGuardado={() => {
            qc.invalidateQueries({ queryKey: ['ags-citas-dia'] })
            qc.invalidateQueries({ queryKey: ['ags-dashboard'] })
          }}
        />

        <DialogoCobro
          cita={cobroDialogo}
          onCerrar={() => setCobroDialogo(null)}
          onCobrado={() => {
            qc.invalidateQueries({ queryKey: ['ags-citas-dia'] })
            qc.invalidateQueries({ queryKey: ['ags-dashboard'] })
          }}
        />
      </Box>
    </Layout>
  )
}
