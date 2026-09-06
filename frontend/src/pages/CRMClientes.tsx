/**
 * El portafolio de clientes y la vista 360 de uno.
 *
 * DOS DECISIONES
 *
 * · **El filtro lo hace el servidor, no el navegador.** La API ya recibe
 *   `q`, `estado` y `segmento`. Traerse la lista entera para filtrarla acá
 *   funciona con treinta clientes y deja de funcionar con tres mil, que es
 *   justo cuando el filtro empieza a hacer falta.
 *
 * · **La vista 360 se arma de cinco consultas, no de un endpoint que lo
 *   devuelva todo.** Cada panel pide lo suyo y se dibuja en cuanto llega, así
 *   que el contrato aparece sin esperar a las encuestas. Un solo endpoint
 *   gordo obligaría a esperar al más lento para ver el primero.
 */
import { useState } from 'react'
import {
  Box, Typography, Tab, Tabs, Chip, InputBase, alpha, Button,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { People, Search, ArrowBack } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { crmApi, type ClienteCRM } from '@/api/crm'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, CRM_COLOR, COLOR_ESTADO_CLIENTE, COLOR_SEGMENTO, COLOR_TICKET,
  BarraSalud, Encabezados, Estado, Indicador, Panel,
  fecha, fechaHora, legible, num, pesos, porcentaje,
} from '@/components/crm/comunes'

const ESTADOS = ['Todos', 'CLIENTE_ACTIVO', 'LEAD', 'PROSPECTO', 'CLIENTE_INACTIVO']

const OPCIONES_ESTADO = ['PROSPECTO', 'LEAD', 'CLIENTE_ACTIVO',
                         'CLIENTE_INACTIVO', 'EXCLIENTE']
  .map(v => ({ valor: v, etiqueta: legible(v) }))
const OPCIONES_SEGMENTO = ['CORPORATIVO', 'ESTRATEGICO', 'MEDIANA', 'PEQUENA']
  .map(v => ({ valor: v, etiqueta: legible(v) }))
const OPCIONES_TIPO = ['EMPRESA', 'PERSONA_NATURAL', 'GOBIERNO']
  .map(v => ({ valor: v, etiqueta: legible(v) }))

export default function CRMClientes() {
  const [tab, setTab] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('Todos')
  const [elegido, setElegido] = useState<number | null>(null)

  const clientes = useQuery({
    queryKey: ['crm', 'clientes', estado, busqueda],
    queryFn: () => crmApi.clientes({
      estado: estado === 'Todos' ? undefined : estado,
      q: busqueda.trim() || undefined,
    }),
  })
  const ejecutivos = useQuery({
    queryKey: ['crm', 'ejecutivos'],
    queryFn: () => crmApi.ejecutivos(),
    staleTime: 10 * 60 * 1000,
  })

  const nombreEjecutivo = (id?: number | null) =>
    ejecutivos.data?.find(e => e.id === id)?.nombre ?? '—'

  // El código es la llave del cliente y no se cambia después de crearlo: hay
  // contratos, tickets y cotizaciones que lo citan en papel.
  const campos = (registro: ClienteCRM | null): CampoEntidad[] => [
    { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', obligatorio: true,
      ancho: 4, soloLectura: !!registro,
      ayuda: registro ? 'No se cambia: hay documentos que lo citan.'
                      : 'Por ejemplo CLI-2026-001.' },
    { clave: 'razon_social', etiqueta: 'Razón social', tipo: 'texto',
      obligatorio: true, ancho: 8 },
    { clave: 'nit', etiqueta: 'NIT', tipo: 'texto', ancho: 4 },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', ancho: 4,
      opciones: OPCIONES_TIPO, porDefecto: 'EMPRESA' },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', ancho: 4,
      opciones: OPCIONES_ESTADO, porDefecto: 'PROSPECTO',
      ayuda: registro ? undefined
        : 'Nace como prospecto; pasa a cliente al ganar una oportunidad.' },
    { clave: 'segmento', etiqueta: 'Segmento', tipo: 'seleccion', ancho: 4,
      opciones: OPCIONES_SEGMENTO },
    { clave: 'industria', etiqueta: 'Industria', tipo: 'texto', ancho: 4 },
    { clave: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto', ancho: 4 },
    { clave: 'ejecutivo_id', etiqueta: 'Ejecutivo a cargo', tipo: 'referencia',
      ancho: 6,
      referencias: (ejecutivos.data ?? []).map(e => ({ valor: e.id, etiqueta: e.nombre })) },
    { clave: 'potencial_anual', etiqueta: 'Potencial anual', tipo: 'dinero',
      ancho: 6, minimo: 0,
      ayuda: 'Cuánto podría facturar al año. De aquí sale la señal de ampliar.' },
    { clave: 'direccion', etiqueta: 'Dirección', tipo: 'texto', ancho: 6 },
    { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', ancho: 3 },
    { clave: 'email', etiqueta: 'Correo', tipo: 'texto', ancho: 3 },
    { clave: 'sitio_web', etiqueta: 'Sitio web', tipo: 'texto', ancho: 6 },
    { clave: 'notas', etiqueta: 'Notas', tipo: 'parrafo' },
  ]

  const crud = useCrud<ClienteCRM>({
    nombre: 'cliente',
    campos,
    titulo: c => c.razon_social,
    crear: d => crmApi.crearCliente(d),
    editar: (id, d) => crmApi.editarCliente(id, d),
    eliminar: id => crmApi.borrarCliente(id),
    consecuencia: () =>
      'Se eliminan también sus contactos, sus interacciones y sus encuestas. '
      + 'Si tiene contratos, tickets, oportunidades o cotizaciones, el borrado '
      + 'se niega para no perder esa historia.',
    exigeEscribir: c => c.razon_social,
  })

  const abrir360 = (id: number) => { setElegido(id); setTab(1) }

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <People sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Clientes</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Portafolio, salud de la cuenta y vista integrada
            </Typography>
          </Box>
          <crud.BotonNuevo />
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${CRM_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: CRM_COLOR },
        }}>
          <Tab label={`Portafolio${clientes.data ? ` (${clientes.data.length})` : ''}`} />
          <Tab label="Vista 360°" />
        </Tabs>

        {tab === 0 && (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box sx={{
                display: 'flex', gap: 1, flex: 1, minWidth: 200,
                bgcolor: 'background.paper', border: `1px solid ${BORDE}`,
                borderRadius: 2, px: 2, py: 1, alignItems: 'center',
              }}>
                <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
                <InputBase placeholder="Buscar por razón social o código…"
                  value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  sx={{ flex: 1, fontSize: 13.5 }} />
              </Box>
              {ESTADOS.map(e => (
                <Chip key={e} label={e === 'Todos' ? 'Todos' : legible(e)} size="small"
                  onClick={() => setEstado(e)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: estado === e ? CRM_COLOR : '#F1F5F9',
                    color: estado === e ? '#FFF' : 'text.secondary',
                    fontWeight: estado === e ? 700 : 400,
                  }} />
              ))}
            </Box>

            <Panel>
              <Estado
                cargando={clientes.isLoading} error={clientes.error}
                vacio={!clientes.data?.length}
                mensajeVacio={busqueda || estado !== 'Todos'
                  ? 'Ningún cliente coincide con ese filtro'
                  : 'Todavía no hay clientes registrados'}
                hint={busqueda || estado !== 'Todos'
                  ? 'Pruebe con otro texto o quite el filtro de estado.'
                  : 'Los prospectos se vuelven clientes al ganar una oportunidad.'}
              >
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <Encabezados columnas={['Código', 'Cliente', 'NIT', 'Estado',
                      'Segmento', 'Industria', 'Salud', 'Ingresos del año',
                      'Ejecutivo', 'Ciudad', '']} />
                    <tbody>
                      {clientes.data?.map(c => {
                        const ec = COLOR_ESTADO_CLIENTE[c.estado] || '#94A3B8'
                        const sc = COLOR_SEGMENTO[c.segmento || ''] || '#94A3B8'
                        return (
                          <tr key={c.id} onClick={() => abrir360(c.id)}
                            style={{ borderBottom: '1px solid #F9FAFB', cursor: 'pointer' }}>
                            <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.codigo}</td>
                            <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.razon_social}</td>
                            <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', fontFamily: 'monospace' }}>{c.nit || '—'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <Chip label={legible(c.estado)} size="small" sx={{
                                bgcolor: alpha(ec, 0.15), color: ec,
                                border: `1px solid ${alpha(ec, 0.3)}`,
                                fontSize: 10, fontWeight: 600,
                              }} />
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {c.segmento
                                ? <Chip label={legible(c.segmento)} size="small"
                                    sx={{ bgcolor: alpha(sc, 0.12), color: sc, fontSize: 10 }} />
                                : <span style={{ color: '#9CA3AF' }}>—</span>}
                            </td>
                            <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{c.industria || '—'}</td>
                            <td style={{ padding: '10px 14px' }}><BarraSalud score={c.health_score} /></td>
                            <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: num(c.ingresos_ytd) > 0 ? CRM_COLOR : '#9CA3AF' }}>
                              {pesos(c.ingresos_ytd)}
                            </td>
                            <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{nombreEjecutivo(c.ejecutivo_id)}</td>
                            <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{c.ciudad || '—'}</td>
                            <td style={{ padding: '4px 8px' }}>
                              <crud.Acciones registro={c} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </Box>
              </Estado>
            </Panel>
          </>
        )}

        {tab === 1 && (
          elegido == null ? (
            <Panel>
              <Estado vacio mensajeVacio="Escoja un cliente para ver su ficha"
                hint="Vuelva al portafolio y haga clic sobre una fila.">
                <span />
              </Estado>
              <Box sx={{ p: 2, pt: 0, textAlign: 'center' }}>
                <Button size="small" startIcon={<ArrowBack />} onClick={() => setTab(0)}
                  sx={{ textTransform: 'none', color: CRM_COLOR }}>
                  Ir al portafolio
                </Button>
              </Box>
            </Panel>
          ) : (
            <Vista360 clienteId={elegido} volver={() => setTab(0)}
              ejecutivo={nombreEjecutivo} />
          )
        )}

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}

function Vista360({ clienteId, volver, ejecutivo }: {
  clienteId: number
  volver: () => void
  ejecutivo: (id?: number | null) => string
}) {
  const cliente = useQuery({
    queryKey: ['crm', 'cliente', clienteId],
    queryFn: () => crmApi.cliente(clienteId),
  })
  const contratos = useQuery({
    queryKey: ['crm', 'contratos', clienteId],
    queryFn: () => crmApi.contratos({ cliente_id: clienteId }),
  })
  const tickets = useQuery({
    queryKey: ['crm', 'tickets', clienteId],
    queryFn: () => crmApi.tickets({ cliente_id: clienteId }),
  })
  const interacciones = useQuery({
    queryKey: ['crm', 'interacciones', clienteId],
    queryFn: () => crmApi.interacciones({ cliente_id: clienteId }),
  })
  const encuestas = useQuery({
    queryKey: ['crm', 'encuestas', clienteId],
    queryFn: () => crmApi.encuestas({ cliente_id: clienteId }),
  })

  const c = cliente.data
  const abiertos = (tickets.data ?? []).filter(
    t => ['ABIERTO', 'EN_PROCESO', 'ESCALADO'].includes(t.estado))
  const vigentes = (contratos.data ?? []).filter(k => k.estado === 'ACTIVO')

  // El NPS se calcula solo con las encuestas de tipo NPS y respondidas. Mezclar
  // CSAT (1 a 5) con NPS (0 a 10) daría un promedio que no significa nada, y
  // contar las no respondidas como cero hundiría la cifra sin motivo.
  const respuestasNps = (encuestas.data ?? [])
    .filter(e => e.tipo === 'NPS' && e.respondida && e.puntaje != null)
    .map(e => e.puntaje as number)
  const nps = respuestasNps.length
    ? Math.round(
        ((respuestasNps.filter(p => p >= 9).length -
          respuestasNps.filter(p => p <= 6).length) / respuestasNps.length) * 100)
    : null

  const mensual = vigentes.reduce((s, k) => s + num(k.valor_mensual), 0)

  return (
    <Estado cargando={cliente.isLoading} error={cliente.error} vacio={!c}
      mensajeVacio="Ese cliente ya no existe">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Panel sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between',
                       alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Box>
                <Button size="small" startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
                  onClick={volver}
                  sx={{ textTransform: 'none', color: CRM_COLOR, mb: 0.5, ml: -1 }}>
                  Portafolio
                </Button>
                <Typography sx={{ fontSize: 18, fontWeight: 800 }}>
                  {c!.razon_social}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {c!.codigo} · NIT {c!.nit || '—'} · Ejecutivo: {ejecutivo(c!.ejecutivo_id)}
                  {c!.ciudad ? ` · ${c!.ciudad}` : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label={legible(c!.estado)} size="small" sx={{
                  bgcolor: alpha(COLOR_ESTADO_CLIENTE[c!.estado] || '#94A3B8', 0.15),
                  color: COLOR_ESTADO_CLIENTE[c!.estado] || '#94A3B8', fontWeight: 700,
                }} />
                {c!.segmento && (
                  <Chip label={legible(c!.segmento)} size="small" sx={{
                    bgcolor: alpha(CRM_COLOR, 0.15), color: CRM_COLOR, fontWeight: 700,
                  }} />
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75,
                           px: 1.5, py: 0.5, bgcolor: '#F1F5F9', borderRadius: 1 }}>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Salud</Typography>
                  <BarraSalud score={c!.health_score} />
                </Box>
              </Box>
            </Box>

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Indicador etiqueta="Ingresos del año" valor={pesos(c!.ingresos_ytd)} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Indicador etiqueta="Facturación mensual" color="#059669"
                  valor={pesos(mensual)} nota={`${vigentes.length} contrato(s)`} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Indicador etiqueta="NPS" color="#0EA5E9"
                  valor={nps == null ? '—' : (nps > 0 ? `+${nps}` : String(nps))}
                  nota={respuestasNps.length
                    ? `${respuestasNps.length} respuesta(s)`
                    : 'sin encuestas respondidas'} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Indicador etiqueta="Tickets abiertos" color="#F59E0B"
                  valor={abiertos.length} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Indicador etiqueta="Potencial anual" color="#7C3AED"
                  valor={pesos(c!.potencial_anual)} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Indicador etiqueta="Riesgo de pérdida"
                  color={c!.health_score >= 70 ? '#059669' : '#EF4444'}
                  valor={porcentaje(Math.max(0, 100 - c!.health_score) / 2, 0)}
                  nota="derivado de la salud" />
              </Grid>
            </Grid>
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Panel sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>
              Contratos
            </Typography>
            <Estado cargando={contratos.isLoading} error={contratos.error}
              vacio={!contratos.data?.length}
              mensajeVacio="Sin contratos"
              hint="Se crean al ganar una oportunidad.">
              {contratos.data?.map(k => (
                <Box key={k.id} sx={{
                  p: 1.5, mb: 1, bgcolor: '#F9FAFB', borderRadius: 1.5,
                  border: `1px solid ${BORDE}`,
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{k.nombre}</Typography>
                    <Chip label={legible(k.estado)} size="small" sx={{
                      bgcolor: alpha(k.estado === 'ACTIVO' ? '#059669' : '#94A3B8', 0.15),
                      color: k.estado === 'ACTIVO' ? '#059669' : '#6B7280',
                      fontSize: 9.5, flexShrink: 0,
                    }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>
                    {k.codigo} · {pesos(k.valor_mensual)}/mes · vence {fecha(k.fecha_fin)}
                  </Typography>
                </Box>
              ))}
            </Estado>
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Panel sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>
              Tickets recientes
            </Typography>
            <Estado cargando={tickets.isLoading} error={tickets.error}
              vacio={!tickets.data?.length} mensajeVacio="Sin tickets"
              hint="Buena señal: este cliente no ha tenido que reclamar.">
              {tickets.data?.slice(0, 6).map(t => (
                <Box key={t.id} sx={{
                  p: 1.5, mb: 1, bgcolor: '#F9FAFB', borderRadius: 1.5,
                  border: `1px solid ${BORDE}`,
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{t.asunto}</Typography>
                    <Chip label={legible(t.estado)} size="small" sx={{
                      bgcolor: alpha(COLOR_TICKET[t.estado] || '#94A3B8', 0.15),
                      color: COLOR_TICKET[t.estado] || '#6B7280',
                      fontSize: 9.5, flexShrink: 0,
                    }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>
                    {t.codigo} · {legible(t.tipo)} · prioridad {t.prioridad.toLowerCase()}
                  </Typography>
                </Box>
              ))}
            </Estado>
          </Panel>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Panel sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>
              Historial de interacciones
            </Typography>
            <Estado cargando={interacciones.isLoading} error={interacciones.error}
              vacio={!interacciones.data?.length}
              mensajeVacio="Todavía nadie ha registrado un contacto"
              hint="Las llamadas y reuniones se anotan desde Interacciones.">
              {interacciones.data
                ?.slice()
                .sort((a, b) => String(b.fecha_interaccion ?? '')
                                  .localeCompare(String(a.fecha_interaccion ?? '')))
                .slice(0, 12)
                .map(h => (
                  <Box key={h.id} sx={{
                    display: 'flex', gap: 1.5, mb: 1.5, p: 1.5,
                    bgcolor: '#F9FAFB', borderRadius: 1.5,
                  }}>
                    <Box sx={{ textAlign: 'center', flexShrink: 0, minWidth: 92 }}>
                      <Chip label={legible(h.tipo)} size="small" sx={{
                        bgcolor: alpha(CRM_COLOR, 0.15), color: CRM_COLOR, fontSize: 9.5,
                      }} />
                      <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.5, display: 'block' }}>
                        {fechaHora(h.fecha_interaccion)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                        {h.asunto || legible(h.tipo)}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
                        {h.descripcion || '—'}
                        {h.resultado ? ` · ${h.resultado}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                ))}
            </Estado>
          </Panel>
        </Grid>
      </Grid>
    </Estado>
  )
}
