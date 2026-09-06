/**
 * Las cotizaciones y sus renglones.
 *
 * EL TOTAL SE REHACE
 * Al abrir una cotización se traen sus renglones y se suman en pantalla. Si esa
 * suma no coincide con el total guardado, la pantalla lo dice en vez de mostrar
 * el total y callarse. Una cotización cuyo total no se puede rehacer renglón
 * por renglón no sirve para negociar, y el descuadre casi siempre es un renglón
 * que alguien editó sin recalcular.
 */
import { useState } from 'react'
import {
  Box, Typography, Tab, Tabs, Chip, alpha, Button,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Description, CheckCircle, Cancel, Schedule, ArrowBack,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { crmApi, type Cotizacion } from '@/api/crm'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, CRM_COLOR, Encabezados, Estado, Indicador, Panel,
  fecha, legible, num, pesos,
} from '@/components/crm/comunes'

const CFG_ESTADO: Record<string, { color: string; icono: JSX.Element }> = {
  BORRADOR:  { color: '#94A3B8', icono: <Schedule sx={{ fontSize: 14 }} /> },
  ENVIADA:   { color: '#0EA5E9', icono: <Schedule sx={{ fontSize: 14 }} /> },
  APROBADA:  { color: '#059669', icono: <CheckCircle sx={{ fontSize: 14 }} /> },
  RECHAZADA: { color: '#EF4444', icono: <Cancel sx={{ fontSize: 14 }} /> },
  VENCIDA:   { color: '#F59E0B', icono: <Cancel sx={{ fontSize: 14 }} /> },
}

export default function CRMCotizaciones() {
  const [tab, setTab] = useState(0)
  const [abierta, setAbierta] = useState<number | null>(null)

  const cotizaciones = useQuery({
    queryKey: ['crm', 'cotizaciones'],
    queryFn: () => crmApi.cotizaciones(),
  })
  const clientes = useQuery({
    queryKey: ['crm', 'clientes', 'Todos', ''],
    queryFn: () => crmApi.clientes(),
    staleTime: 5 * 60 * 1000,
  })
  const oportunidades = useQuery({
    queryKey: ['crm', 'oportunidades'],
    queryFn: () => crmApi.oportunidades(),
    staleTime: 60 * 1000,
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

  // Los totales NO se teclean: salen de los renglones. Un campo de total
  // editable permite guardar una cotizacion cuyo total no coincide con lo que
  // suma, y eso es justo lo que hace imposible sustentarla ante el cliente.
  const campos = (registro: Cotizacion | null): CampoEntidad[] => [
    { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', obligatorio: true,
      ancho: 4, soloLectura: !!registro },
    { clave: 'cliente_id', etiqueta: 'Cliente', tipo: 'referencia',
      obligatorio: true, ancho: 8, soloLectura: !!registro,
      referencias: (clientes.data ?? []).map(c => ({ valor: c.id, etiqueta: c.razon_social })) },
    { clave: 'oportunidad_id', etiqueta: 'Oportunidad', tipo: 'referencia', ancho: 6,
      referencias: (oportunidades.data ?? []).map(o => ({
        valor: o.id, etiqueta: `${o.codigo} · ${o.nombre}` })),
      ayuda: 'De qué negocio sale esta propuesta.' },
    { clave: 'ejecutivo_id', etiqueta: 'Ejecutivo', tipo: 'referencia', ancho: 6,
      referencias: (ejecutivos.data ?? []).map(e => ({ valor: e.id, etiqueta: e.nombre })) },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', ancho: 4,
      porDefecto: 'BORRADOR',
      opciones: ['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA']
        .map(v => ({ valor: v, etiqueta: legible(v) })) },
    { clave: 'validez_dias', etiqueta: 'Vigencia (días)', tipo: 'numero',
      ancho: 4, minimo: 1, porDefecto: 30 },
    { clave: 'fecha_envio', etiqueta: 'Enviada el', tipo: 'fecha', ancho: 4 },
    { clave: 'fecha_vencimiento', etiqueta: 'Vence el', tipo: 'fecha', ancho: 6 },
    { clave: 'notas', etiqueta: 'Notas', tipo: 'parrafo' },
  ]

  const crud = useCrud<Cotizacion>({
    nombre: 'cotización', genero: 'f', campos,
    titulo: c => c.codigo,
    crear: d => crmApi.crearCotizacion(d),
    editar: (id, d) => crmApi.editarCotizacion(id, d),
    eliminar: id => crmApi.borrarCotizacion(id),
    consecuencia: () =>
      'Se eliminan también sus renglones. Si de ella salió un contrato, el '
      + 'borrado se niega.',
  })

  const todas = cotizaciones.data ?? []
  const cuenta = (e: string) => todas.filter(c => c.estado === e).length
  const decididas = todas.filter(c => ['APROBADA', 'RECHAZADA'].includes(c.estado))
  // La tasa de aprobación mira solo las decididas. Contar las que siguen en la
  // mesa del cliente como si estuvieran rechazadas hunde la cifra sin motivo.
  const tasa = decididas.length
    ? Math.round((cuenta('APROBADA') / decididas.length) * 100) : null
  const enMesa = todas
    .filter(c => ['BORRADOR', 'ENVIADA'].includes(c.estado))
    .reduce((s, c) => s + num(c.total), 0)

  const abrir = (id: number) => { setAbierta(id); setTab(1) }

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Description sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Cotizaciones</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Propuestas enviadas, con su vigencia y su desglose
            </Typography>
          </Box>
          <crud.BotonNuevo etiqueta="Nueva cotización" />
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'En la mesa del cliente', value: pesos(enMesa), color: CRM_COLOR },
            { label: 'Enviadas', value: cuenta('ENVIADA'), color: '#0EA5E9' },
            { label: 'Aprobadas', value: cuenta('APROBADA'), color: '#059669' },
            { label: 'Tasa de aprobación',
              value: tasa == null ? '—' : `${tasa}%`, color: '#7C3AED' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {cotizaciones.isLoading ? '·' : k.value}
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
          <Tab label={`Lista${todas.length ? ` (${todas.length})` : ''}`} />
          <Tab label="Detalle" />
        </Tabs>

        {tab === 0 && (
          <Panel>
            <Estado cargando={cotizaciones.isLoading} error={cotizaciones.error}
              vacio={!todas.length}
              mensajeVacio="Todavía no hay cotizaciones"
              hint="Se crean desde una oportunidad que llegó a propuesta.">
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Código', 'Ver.', 'Cliente', 'Subtotal',
                    'IVA', 'Total', 'Estado', 'Enviada', 'Válida hasta', 'Ejecutivo', '']} />
                  <tbody>
                    {todas.map(c => {
                      const cfg = CFG_ESTADO[c.estado] ?? { color: '#94A3B8', icono: null }
                      return (
                        <tr key={c.id} onClick={() => abrir(c.id)}
                          style={{ borderBottom: `1px solid ${BORDE}`, cursor: 'pointer' }}>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.codigo}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>v{c.version}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{nombreCliente(c.cliente_id)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{pesos(c.subtotal)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{pesos(c.iva)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13.5, fontWeight: 800, color: CRM_COLOR, whiteSpace: 'nowrap' }}>{pesos(c.total)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip icon={cfg.icono ?? undefined} label={legible(c.estado)}
                              size="small" sx={{
                                bgcolor: alpha(cfg.color, 0.15), color: cfg.color,
                                fontSize: 9.5, fontWeight: 700,
                                '& .MuiChip-icon': { color: cfg.color },
                              }} />
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fecha(c.fecha_envio)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fecha(c.fecha_vencimiento)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{nombreEjecutivo(c.ejecutivo_id)}</td>
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
        )}

        {tab === 1 && (
          abierta == null ? (
            <Panel>
              <Estado vacio mensajeVacio="Escoja una cotización para ver su desglose"
                hint="Vuelva a la lista y haga clic sobre una fila.">
                <span />
              </Estado>
              <Box sx={{ p: 2, pt: 0, textAlign: 'center' }}>
                <Button size="small" startIcon={<ArrowBack />} onClick={() => setTab(0)}
                  sx={{ textTransform: 'none', color: CRM_COLOR }}>
                  Ir a la lista
                </Button>
              </Box>
            </Panel>
          ) : (
            <Detalle id={abierta} volver={() => setTab(0)}
              cliente={nombreCliente} ejecutivo={nombreEjecutivo} />
          )
        )}

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}

function Detalle({ id, volver, cliente, ejecutivo }: {
  id: number
  volver: () => void
  cliente: (id: number) => string
  ejecutivo: (id?: number | null) => string
}) {
  const detalle = useQuery({
    queryKey: ['crm', 'cotizacion', id],
    queryFn: () => crmApi.cotizacion(id),
  })

  const c = detalle.data?.cotizacion
  const items = detalle.data?.items ?? []
  const suma = items.reduce((s, i) => s + num(i.total), 0)
  // Un peso de diferencia es redondeo; más que eso es un renglón que alguien
  // cambió sin recalcular, y hay que decirlo en vez de enseñar el total y callar.
  const descuadre = c ? Math.abs(suma - num(c.subtotal)) > 1 : false
  const cfg = c ? CFG_ESTADO[c.estado] ?? { color: '#94A3B8', icono: null } : null

  return (
    <Estado cargando={detalle.isLoading} error={detalle.error} vacio={!c}
      mensajeVacio="Esa cotización ya no existe">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Panel sx={{ p: 2.5 }}>
            <Button size="small" startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
              onClick={volver}
              sx={{ textTransform: 'none', color: CRM_COLOR, mb: 0.5, ml: -1 }}>
              Lista
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'space-between',
                       flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 18, fontWeight: 800 }}>
                  {c!.codigo} <Box component="span" sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 500 }}>
                    versión {c!.version}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                  {cliente(c!.cliente_id)} · {ejecutivo(c!.ejecutivo_id)}
                </Typography>
              </Box>
              <Chip icon={cfg?.icono ?? undefined} label={legible(c!.estado)} sx={{
                bgcolor: alpha(cfg!.color, 0.15), color: cfg!.color, fontWeight: 700,
                '& .MuiChip-icon': { color: cfg!.color },
              }} />
            </Box>

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Indicador etiqueta="Subtotal" valor={pesos(c!.subtotal)} />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Indicador etiqueta="IVA" color="#0EA5E9" valor={pesos(c!.iva)} />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Indicador etiqueta="Total" color="#059669" valor={pesos(c!.total)} />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Indicador etiqueta="Válida hasta" color="#7C3AED"
                  valor={<Box component="span" sx={{ fontSize: 15 }}>
                    {fecha(c!.fecha_vencimiento)}
                  </Box>}
                  nota={`${c!.validez_dias} días desde el envío`} />
              </Grid>
            </Grid>

            {descuadre && (
              <Box sx={{
                mt: 2, p: 1.5, borderRadius: 1.5,
                bgcolor: alpha('#EF4444', 0.07),
                border: `1px solid ${alpha('#EF4444', 0.3)}`,
              }}>
                <Typography sx={{ fontSize: 12.5, color: '#B91C1C', fontWeight: 600 }}>
                  Los renglones suman {pesos(suma, { exacto: true })} y el subtotal
                  guardado dice {pesos(c!.subtotal, { exacto: true })}. Revise los
                  renglones antes de enviarla.
                </Typography>
              </Box>
            )}
          </Panel>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Panel>
            <Box sx={{ p: 2, borderBottom: `1px solid ${BORDE}` }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                Renglones ({items.length})
              </Typography>
            </Box>
            <Estado vacio={!items.length}
              mensajeVacio="Esta cotización no tiene renglones"
              hint="Un total sin renglones no se puede sustentar ante el cliente.">
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Descripción', 'Unidad', 'Cantidad',
                    'Precio unitario', 'Dcto.', 'Total']} />
                  <tbody>
                    {items.map(i => (
                      <tr key={i.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                        <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 500 }}>{i.descripcion}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>{i.unidad || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{num(i.cantidad).toLocaleString('es-CO')}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>{pesos(i.precio_unitario)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: num(i.descuento_pct) ? '#059669' : '#9CA3AF' }}>
                          {num(i.descuento_pct) ? `${num(i.descuento_pct).toFixed(0)}%` : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: CRM_COLOR, whiteSpace: 'nowrap' }}>{pesos(i.total)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#F8FAFC' }}>
                      <td colSpan={5} style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, textAlign: 'right' }}>
                        Suma de los renglones
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13.5, fontWeight: 900,
                                   color: descuadre ? '#EF4444' : '#059669', whiteSpace: 'nowrap' }}>
                        {pesos(suma)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Box>
            </Estado>
          </Panel>
        </Grid>
      </Grid>
    </Estado>
  )
}
