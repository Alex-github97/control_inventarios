/**
 * Los contratos vigentes y los indicadores pactados en cada uno.
 *
 * EL SENTIDO DEL INDICADOR LO DA LA UNIDAD
 * En «OTIF 95%» se cumple llegando; en «responder en 24 horas» se cumple
 * quedándose por debajo. Pintar los dos igual —verde si el valor supera el
 * objetivo— marcaba en rojo una respuesta en 18 horas contra un pacto de 24, o
 * sea un acuerdo que se estaba cumpliendo de sobra. Aquí la dirección se decide
 * por la unidad, igual que en el servidor.
 *
 * LOS VENCIMIENTOS SE CUENTAN DESDE HOY
 * No hay un campo «días para vencer» guardado: se calcula al mirar. Un número
 * guardado envejece, y un contrato que dice «faltan 30 días» tres meses después
 * es peor que no decir nada.
 */
import { useState } from 'react'
import {
  Box, Typography, Tab, Tabs, Chip, alpha, MenuItem, TextField,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Handshake, Autorenew } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { crmApi, type Contrato } from '@/api/crm'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, CRM_COLOR, Encabezados, Estado, Panel,
  fecha, legible, num, pesos,
} from '@/components/crm/comunes'

const COLOR_ESTADO: Record<string, string> = {
  ACTIVO: '#059669', BORRADOR: '#94A3B8', VENCIDO: '#EF4444',
  RENOVADO: '#0EA5E9', TERMINADO: '#6B7280',
}

/** Días desde hoy hasta el fin. Negativo si ya pasó. */
const diasParaVencer = (c: Contrato): number | null => {
  if (!c.fecha_fin) return null
  const fin = new Date(`${c.fecha_fin.slice(0, 10)}T12:00:00`)
  return Math.round((fin.getTime() - Date.now()) / 86_400_000)
}

/** En horas y días se cumple por debajo; en porcentaje, por encima. */
const menorEsMejor = (unidad?: string | null) => {
  const u = (unidad || '').trim().toLowerCase()
  return ['hora', 'hr', 'h', 'día', 'dia', 'd', 'min', 'seg', 'semana']
    .some(x => u.startsWith(x))
}

export default function CRMContratos() {
  const [tab, setTab] = useState(0)
  const [elegido, setElegido] = useState<number | ''>('')

  const contratos = useQuery({
    queryKey: ['crm', 'contratos'],
    queryFn: () => crmApi.contratos(),
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

  const campos = (registro: Contrato | null): CampoEntidad[] => [
    { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', obligatorio: true,
      ancho: 4, soloLectura: !!registro },
    { clave: 'nombre', etiqueta: 'Objeto del contrato', tipo: 'texto',
      obligatorio: true, ancho: 8 },
    { clave: 'cliente_id', etiqueta: 'Cliente', tipo: 'referencia',
      obligatorio: true, ancho: 6, soloLectura: !!registro,
      referencias: (clientes.data ?? []).map(c => ({ valor: c.id, etiqueta: c.razon_social })) },
    { clave: 'ejecutivo_id', etiqueta: 'Ejecutivo', tipo: 'referencia', ancho: 6,
      referencias: (ejecutivos.data ?? []).map(e => ({ valor: e.id, etiqueta: e.nombre })) },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', ancho: 4,
      porDefecto: 'BORRADOR',
      opciones: ['BORRADOR', 'ACTIVO', 'VENCIDO', 'RENOVADO', 'TERMINADO']
        .map(v => ({ valor: v, etiqueta: legible(v) })) },
    { clave: 'tipo_servicio', etiqueta: 'Tipo de servicio', tipo: 'texto', ancho: 4 },
    { clave: 'duracion_meses', etiqueta: 'Duración (meses)', tipo: 'numero',
      ancho: 4, minimo: 1 },
    { clave: 'fecha_inicio', etiqueta: 'Inicia', tipo: 'fecha', ancho: 4 },
    { clave: 'fecha_fin', etiqueta: 'Termina', tipo: 'fecha', ancho: 4,
      ayuda: 'De aquí sale el aviso de renovación.' },
    { clave: 'valor_mensual', etiqueta: 'Valor mensual', tipo: 'dinero',
      ancho: 4, minimo: 0 },
    { clave: 'valor_total', etiqueta: 'Valor total', tipo: 'dinero',
      ancho: 6, minimo: 0 },
    { clave: 'auto_renovacion', etiqueta: 'Se renueva automáticamente',
      tipo: 'interruptor', ancho: 6,
      ayuda: 'Si no, el sistema avisa con antelación para negociarlo.' },
    { clave: 'notas', etiqueta: 'Notas', tipo: 'parrafo' },
  ]

  const crud = useCrud<Contrato>({
    nombre: 'contrato', campos,
    titulo: c => `${c.codigo} · ${c.nombre}`,
    crear: d => crmApi.crearContrato(d),
    editar: (id, d) => crmApi.editarContrato(id, d),
    eliminar: id => crmApi.borrarContrato(id),
    consecuencia: () =>
      'Se eliminan también los indicadores pactados en él. Si tiene tickets '
      + 'asociados, el borrado se niega.',
    exigeEscribir: c => c.codigo,
  })

  const todos = contratos.data ?? []
  const activos = todos.filter(c => c.estado === 'ACTIVO')
  const porVencer = activos
    .map(c => ({ c, dias: diasParaVencer(c) }))
    .filter(x => x.dias != null && x.dias >= 0 && x.dias <= 90)
    .sort((a, b) => (a.dias! - b.dias!))
  const mensual = activos.reduce((s, c) => s + num(c.valor_mensual), 0)

  // El primer contrato activo se abre solo en la pestaña de indicadores: sin
  // preselección, esa pestaña se ve vacía la primera vez y parece que no hay
  // nada configurado.
  const contratoSLA = elegido || activos[0]?.id || ''

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Handshake sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Contratos y niveles de servicio
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Vigencias, facturación comprometida e indicadores pactados
            </Typography>
          </Box>
          <crud.BotonNuevo />
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Contratos activos', value: activos.length, color: '#059669' },
            { label: 'Facturación mensual', value: pesos(mensual), color: CRM_COLOR },
            { label: 'Vencen en 90 días', value: porVencer.length, color: '#F59E0B' },
            { label: 'Sin renovación automática',
              value: activos.filter(c => !c.auto_renovacion).length, color: '#7C3AED' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {contratos.isLoading ? '·' : k.value}
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
          <Tab label={`Contratos${todos.length ? ` (${todos.length})` : ''}`} />
          <Tab label="Indicadores pactados" />
          <Tab label={`Vencimientos${porVencer.length ? ` (${porVencer.length})` : ''}`} />
        </Tabs>

        {tab === 0 && (
          <Panel>
            <Estado cargando={contratos.isLoading} error={contratos.error}
              vacio={!todos.length}
              mensajeVacio="Todavía no hay contratos"
              hint="Se firman a partir de una cotización aprobada.">
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Código', 'Cliente', 'Servicio', 'Estado',
                    'Inicio', 'Fin', 'Mensual', 'Total', 'Renovación', 'Ejecutivo', '']} />
                  <tbody>
                    {todos.map(c => {
                      const col = COLOR_ESTADO[c.estado] || '#94A3B8'
                      const dias = diasParaVencer(c)
                      return (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.codigo}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{nombreCliente(c.cliente_id)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>{c.nombre}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={legible(c.estado)} size="small" sx={{
                              bgcolor: alpha(col, 0.15), color: col,
                              fontSize: 9.5, fontWeight: 700,
                            }} />
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fecha(c.fecha_inicio)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, whiteSpace: 'nowrap',
                                       color: dias != null && dias >= 0 && dias <= 90 ? '#F59E0B' : '#6B7280',
                                       fontWeight: dias != null && dias >= 0 && dias <= 90 ? 700 : 400 }}>
                            {fecha(c.fecha_fin)}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: CRM_COLOR, whiteSpace: 'nowrap' }}>{pesos(c.valor_mensual)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{pesos(c.valor_total)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {c.auto_renovacion ? (
                              <Chip icon={<Autorenew sx={{ fontSize: 13 }} />} label="Automática"
                                size="small" sx={{
                                  bgcolor: alpha('#059669', 0.12), color: '#059669',
                                  fontSize: 9.5, '& .MuiChip-icon': { color: '#059669' },
                                }} />
                            ) : (
                              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                                manual
                              </Typography>
                            )}
                          </td>
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
          <>
            <TextField select size="small" label="Contrato" sx={{ mb: 2, minWidth: 340 }}
              value={contratoSLA}
              onChange={e => setElegido(Number(e.target.value) || '')}>
              {todos.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  {c.codigo} · {nombreCliente(c.cliente_id)}
                </MenuItem>
              ))}
              {!todos.length && <MenuItem value="" disabled>Sin contratos</MenuItem>}
            </TextField>
            {contratoSLA
              ? <IndicadoresDelContrato id={Number(contratoSLA)} />
              : <Panel><Estado vacio mensajeVacio="No hay ningún contrato que mirar"><span /></Estado></Panel>}
          </>
        )}

        {tab === 2 && (
          <Panel sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
              Contratos que vencen en los próximos 90 días
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
              Una renovación pasa por el comité del cliente: avisar a quince días
              suele ser tarde.
            </Typography>
            <Estado cargando={contratos.isLoading} error={contratos.error}
              vacio={!porVencer.length}
              mensajeVacio="Ningún contrato vence en los próximos 90 días"
              hint="Buena señal: hay margen para preparar cada renovación.">
              {porVencer.map(({ c, dias }) => {
                const col = dias! <= 30 ? '#EF4444' : dias! <= 60 ? '#F59E0B' : '#0EA5E9'
                return (
                  <Box key={c.id} sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 2, p: 1.75, mb: 1, borderRadius: 1.5,
                    bgcolor: alpha(col, 0.06), border: `1px solid ${alpha(col, 0.25)}`,
                  }}>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        {nombreCliente(c.cliente_id)}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                        {c.codigo} · {c.nombre} · {pesos(c.valor_mensual)}/mes
                        {c.auto_renovacion ? ' · renovación automática' : ' · renovación manual'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 900, color: col,
                                        fontVariantNumeric: 'tabular-nums' }}>
                        {dias} días
                      </Typography>
                      <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
                        vence {fecha(c.fecha_fin)}
                      </Typography>
                    </Box>
                  </Box>
                )
              })}
            </Estado>
          </Panel>
        )}

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}

function IndicadoresDelContrato({ id }: { id: number }) {
  const sla = useQuery({
    queryKey: ['crm', 'sla', id],
    queryFn: () => crmApi.slaDeContrato(id),
  })

  return (
    <Panel sx={{ p: 2.5 }}>
      <Estado cargando={sla.isLoading} error={sla.error} vacio={!sla.data?.length}
        mensajeVacio="Este contrato no tiene indicadores pactados"
        hint="Sin indicadores no hay nada que medir ni que reclamar.">
        <Grid container spacing={1.5}>
          {sla.data?.map(s => {
            const objetivo = num(s.objetivo)
            const actual = num(s.valor_actual)
            const cumple = menorEsMejor(s.unidad)
              ? actual <= objetivo
              : actual >= objetivo
            const col = cumple ? '#059669' : '#EF4444'
            const unidad = s.unidad === '%' ? '%' : ` ${s.unidad || ''}`
            // La barra mide qué tan cerca se está del objetivo, siempre de 0 a
            // 100, para que los tres indicadores se comparen aunque uno vaya en
            // horas y otro en porcentaje.
            const avance = menorEsMejor(s.unidad)
              ? Math.min(100, (objetivo / Math.max(actual, 0.01)) * 100)
              : Math.min(100, (actual / Math.max(objetivo, 0.01)) * 100)
            return (
              <Grid key={s.id} size={{ xs: 12, md: 6 }}>
                <Box sx={{
                  p: 2, borderRadius: 1.5, height: '100%',
                  border: `1px solid ${alpha(col, 0.25)}`, bgcolor: alpha(col, 0.04),
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between',
                             alignItems: 'flex-start', gap: 1, mb: 1 }}>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        {s.indicador}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        objetivo {objetivo}{unidad} · medición {s.frecuencia_medicion || '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 18, fontWeight: 900, color: col,
                                        fontVariantNumeric: 'tabular-nums' }}>
                        {s.valor_actual == null ? '—' : `${actual}${unidad}`}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: col, fontWeight: 700 }}>
                        {s.valor_actual == null ? 'sin medir'
                          : cumple ? 'se cumple' : 'incumplido'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ height: 5, borderRadius: 3, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${avance}%`, bgcolor: col, borderRadius: 3 }} />
                  </Box>
                  {!cumple && s.penalizacion && (
                    <Typography sx={{ fontSize: 11, color: '#B91C1C', mt: 1 }}>
                      Penalización pactada: {s.penalizacion}
                    </Typography>
                  )}
                </Box>
              </Grid>
            )
          })}
        </Grid>
      </Estado>
    </Panel>
  )
}
