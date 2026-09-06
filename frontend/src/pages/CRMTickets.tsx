/**
 * Los tickets de servicio: PQRS, reclamos, incidentes.
 *
 * EL PLAZO SE MIDE CONTRA LA FECHA LÍMITE, NO CONTRA UN PROMEDIO
 * Cada ticket trae su `fecha_limite`, puesta según su prioridad al crearlo. Un
 * ticket crítico y uno de consulta no incumplen a las mismas horas, así que un
 * «tiempo promedio de respuesta» no dice si se cumplió con nadie. Aquí se marca
 * en rojo el que ya se pasó de SU plazo, que es la pregunta que importa.
 *
 * SE PUEDE MOVER
 * El estado se cambia desde la propia fila. Un listado de tickets que solo se
 * mira obliga a llevar el seguimiento en otro lado.
 */
import { useState } from 'react'
import {
  Box, Typography, Tab, Tabs, Chip, InputBase, alpha, Menu, MenuItem, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { SupportAgent, Search, PriorityHigh } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { crmApi, type Ticket } from '@/api/crm'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, CRM_COLOR, COLOR_TICKET, COLOR_PRIORIDAD, Encabezados, Estado, Panel,
  fechaHora, legible, num,
} from '@/components/crm/comunes'

const ESTADOS = ['Todos', 'ABIERTO', 'EN_PROCESO', 'ESCALADO', 'RESUELTO', 'CERRADO']
const SIN_CERRAR = ['ABIERTO', 'EN_PROCESO', 'ESCALADO']

const COLOR_TIPO: Record<string, string> = {
  PQRS: '#7C3AED', RECLAMO: CRM_COLOR, SOLICITUD: '#0EA5E9',
  INCIDENTE: '#F59E0B', CONSULTA: '#059669',
}

/** Cuánto le queda —o cuánto lleva pasado— a un ticket sin cerrar. */
function plazo(t: Ticket): { texto: string; vencido: boolean } | null {
  if (!t.fecha_limite || !SIN_CERRAR.includes(t.estado)) return null
  const restan = (new Date(t.fecha_limite).getTime() - Date.now()) / 3_600_000
  if (restan < 0) {
    const h = Math.round(-restan)
    return { texto: h >= 48 ? `${Math.round(h / 24)} d pasado` : `${h} h pasado`,
             vencido: true }
  }
  const h = Math.round(restan)
  return { texto: h >= 48 ? `quedan ${Math.round(h / 24)} d` : `quedan ${h} h`,
           vencido: false }
}

export default function CRMTickets() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('Todos')
  const [menu, setMenu] = useState<{ el: HTMLElement; t: Ticket } | null>(null)

  const tickets = useQuery({
    queryKey: ['crm', 'tickets', estado],
    queryFn: () => crmApi.tickets({ estado: estado === 'Todos' ? undefined : estado }),
  })
  const todos = useQuery({
    queryKey: ['crm', 'tickets', 'Todos'],
    queryFn: () => crmApi.tickets(),
  })
  const clientes = useQuery({
    queryKey: ['crm', 'clientes', 'Todos', ''],
    queryFn: () => crmApi.clientes(),
    staleTime: 5 * 60 * 1000,
  })
  const ejecutivos = useQuery({
    queryKey: ['crm', 'ejecutivos'],
    queryFn: () => crmApi.ejecutivos(),
    staleTime: 10 * 60 * 1000,
  })

  const nombreCliente = (id: number) =>
    clientes.data?.find(c => c.id === id)?.razon_social ?? `Cliente #${id}`
  const nombreEjecutivo = (id?: number | null) =>
    ejecutivos.data?.find(e => e.id === id)?.nombre ?? '—'

  // El estado se cambia desde el chip de la fila, no aqui: cerrar un ticket
  // sella su hora de resolucion, y eso no puede pasar como efecto secundario de
  // guardar un formulario donde se venia a corregir el asunto.
  const campos = (registro: Ticket | null): CampoEntidad[] => [
    { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', obligatorio: true,
      ancho: 4, soloLectura: !!registro },
    { clave: 'cliente_id', etiqueta: 'Cliente', tipo: 'referencia',
      obligatorio: true, ancho: 8, soloLectura: !!registro,
      referencias: (clientes.data ?? []).map(c => ({ valor: c.id, etiqueta: c.razon_social })) },
    { clave: 'asunto', etiqueta: 'Asunto', tipo: 'texto', obligatorio: true, ancho: 12 },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', ancho: 4,
      porDefecto: 'SOLICITUD',
      opciones: ['PQRS', 'RECLAMO', 'SOLICITUD', 'INCIDENTE', 'CONSULTA']
        .map(v => ({ valor: v, etiqueta: legible(v) })) },
    { clave: 'prioridad', etiqueta: 'Prioridad', tipo: 'seleccion', ancho: 4,
      porDefecto: 'MEDIA',
      opciones: ['CRITICA', 'ALTA', 'MEDIA', 'BAJA']
        .map(v => ({ valor: v, etiqueta: legible(v) })),
      ayuda: 'De ella depende el plazo de respuesta.' },
    { clave: 'canal', etiqueta: 'Canal', tipo: 'seleccion', ancho: 4,
      opciones: ['Correo', 'Teléfono', 'Portal', 'WhatsApp', 'Presencial']
        .map(v => ({ valor: v, etiqueta: v })) },
    { clave: 'ejecutivo_id', etiqueta: 'Responsable', tipo: 'referencia', ancho: 6,
      referencias: (ejecutivos.data ?? []).map(e => ({ valor: e.id, etiqueta: e.nombre })) },
    { clave: 'fecha_limite', etiqueta: 'Responder antes de', tipo: 'fechahora',
      ancho: 6, ayuda: 'Si se deja vacío, no se puede medir si se cumplió.' },
    { clave: 'satisfaccion', etiqueta: 'Satisfacción (1 a 5)', tipo: 'numero',
      ancho: 4, minimo: 1, maximo: 5,
      visibleSi: () => !!registro,
      ayuda: 'Se registra cuando el cliente califica.' },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'parrafo' },
  ]

  const crud = useCrud<Ticket>({
    nombre: 'ticket', campos,
    titulo: t => `${t.codigo} · ${t.asunto}`,
    crear: d => crmApi.crearTicket(d),
    editar: (id, d) => crmApi.editarTicket(id, d),
    eliminar: id => crmApi.borrarTicket(id),
    consecuencia: () =>
      'Se eliminan también sus interacciones y la encuesta que se le envió al '
      + 'cliente por este caso.',
  })

  const mover = useMutation({
    mutationFn: ({ t, estado }: { t: Ticket; estado: string }) =>
      crmApi.moverTicket(t.id, estado),
    onSuccess: () => {
      toast.success('Ticket actualizado')
      setMenu(null)
      qc.invalidateQueries({ queryKey: ['crm'] })
    },
    onError: (e: any) => toast.error(
      e?.response?.data?.detail ?? 'No se pudo cambiar el estado'),
  })

  const universo = todos.data ?? []
  const cuenta = (e: string) => universo.filter(t => t.estado === e).length
  const cerrados = universo.filter(
    t => t.estado === 'RESUELTO' || t.estado === 'CERRADO')
  const vencidos = universo.filter(t => plazo(t)?.vencido)
  const notas = cerrados.map(t => t.satisfaccion).filter((n): n is number => n != null)

  const texto = busqueda.trim().toLowerCase()
  const base = tab === 1
    ? (tickets.data ?? []).filter(
        t => t.estado === 'ESCALADO' || t.prioridad === 'CRITICA' || plazo(t)?.vencido)
    : (tickets.data ?? [])
  const filtrados = base.filter(t => !texto ||
    t.asunto.toLowerCase().includes(texto) ||
    t.codigo.toLowerCase().includes(texto) ||
    nombreCliente(t.cliente_id).toLowerCase().includes(texto))

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SupportAgent sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Servicio al cliente
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              PQRS, reclamos e incidentes, con su plazo de respuesta
            </Typography>
          </Box>
          <crud.BotonNuevo />
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Sin atender', value: cuenta('ABIERTO'), color: CRM_COLOR },
            { label: 'Escalados', value: cuenta('ESCALADO'), color: '#F59E0B' },
            { label: 'Fuera de plazo', value: vencidos.length, color: '#EF4444' },
            { label: 'Satisfacción media',
              value: notas.length
                ? `${(notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1)} / 5`
                : '—',
              color: '#059669' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {todos.isLoading ? '·' : k.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>
                  {k.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 2,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${CRM_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: CRM_COLOR },
        }}>
          <Tab label="Todos" />
          <Tab label="Escalados y fuera de plazo" />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{
            display: 'flex', gap: 1, border: `1px solid ${BORDE}`, borderRadius: 2,
            px: 2, py: 1, alignItems: 'center', flex: 1, minWidth: 200,
            bgcolor: 'background.paper',
          }}>
            <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
            <InputBase placeholder="Buscar por asunto, cliente o código…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              sx={{ flex: 1, fontSize: 13.5 }} />
          </Box>
          {ESTADOS.map(e => (
            <Chip key={e} label={e === 'Todos' ? 'Todos' : legible(e)} size="small"
              onClick={() => setEstado(e)}
              sx={{
                cursor: 'pointer',
                bgcolor: estado === e ? (COLOR_TICKET[e] || CRM_COLOR) : '#F1F5F9',
                color: estado === e ? '#FFF' : 'text.secondary',
                fontWeight: estado === e ? 700 : 400,
              }} />
          ))}
        </Box>

        <Panel>
          <Estado cargando={tickets.isLoading} error={tickets.error}
            vacio={!filtrados.length}
            mensajeVacio={tab === 1
              ? 'Nada escalado ni fuera de plazo'
              : busqueda || estado !== 'Todos'
                ? 'Ningún ticket coincide con ese filtro'
                : 'No hay tickets registrados'}
            hint={tab === 1
              ? 'Todo lo abierto está dentro de su plazo de respuesta.'
              : undefined}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <Encabezados columnas={['Código', 'Cliente', 'Tipo', 'Asunto',
                  'Prioridad', 'Estado', 'Plazo', 'Satisf.', 'Ejecutivo', '']} />
                <tbody>
                  {filtrados.map(t => {
                    const ec = COLOR_TICKET[t.estado] || '#94A3B8'
                    const pc = COLOR_PRIORIDAD[t.prioridad] || '#94A3B8'
                    const tc = COLOR_TIPO[t.tipo] || CRM_COLOR
                    const p = plazo(t)
                    return (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{t.codigo}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>{nombreCliente(t.cliente_id)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={legible(t.tipo)} size="small" sx={{
                            bgcolor: alpha(tc, 0.12), color: tc, fontSize: 9.5,
                          }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, maxWidth: 300 }}>{t.asunto}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {t.prioridad === 'CRITICA' && <PriorityHigh sx={{ fontSize: 14, color: pc }} />}
                            <Chip label={legible(t.prioridad)} size="small" sx={{
                              bgcolor: alpha(pc, 0.15), color: pc, fontSize: 9.5, fontWeight: 700,
                            }} />
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={legible(t.estado)} size="small"
                            onClick={e => setMenu({ el: e.currentTarget, t })}
                            sx={{
                              bgcolor: alpha(ec, 0.15), color: ec, fontSize: 9.5,
                              fontWeight: 700, cursor: 'pointer',
                              border: `1px solid ${alpha(ec, 0.3)}`,
                            }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, whiteSpace: 'nowrap',
                                     color: p?.vencido ? '#EF4444' : '#6B7280',
                                     fontWeight: p?.vencido ? 700 : 400 }}>
                          {p ? (
                            <Tooltip title={`Vence ${fechaHora(t.fecha_limite)}`}>
                              <span>{p.texto}</span>
                            </Tooltip>
                          ) : t.tiempo_solucion_hrs != null
                            ? `resuelto en ${num(t.tiempo_solucion_hrs).toFixed(0)} h`
                            : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {t.satisfaccion
                            ? `${'★'.repeat(t.satisfaccion)}${'☆'.repeat(5 - t.satisfaccion)}`
                            : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>
                          {nombreEjecutivo(t.ejecutivo_id)}
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <crud.Acciones registro={t} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </Estado>
        </Panel>

        <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
          <MenuItem disabled sx={{ fontSize: 11, opacity: 0.7 }}>Cambiar estado a…</MenuItem>
          {ESTADOS.filter(e => e !== 'Todos').map(e => (
            <MenuItem key={e} disabled={menu?.t.estado === e || mover.isPending}
              onClick={() => menu && mover.mutate({ t: menu.t, estado: e })}>
              <Box sx={{
                width: 9, height: 9, borderRadius: '50%', mr: 1.25,
                bgcolor: COLOR_TICKET[e] || '#94A3B8',
              }} />
              {legible(e)}
            </MenuItem>
          ))}
        </Menu>

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}
