/**
 * Las campañas comerciales y lo que produjo cada una.
 *
 * EL RETORNO SE MUESTRA, NO SE ESCONDE
 * Cada campaña compara lo que costó contra lo que trajo. Es la única pregunta
 * que se le hace de verdad a una campaña, y la que hace falta antes de repetir
 * la del año pasado. Cuando el resultado es negativo también se dice: una
 * pantalla de campañas donde todas salen bien no sirve para decidir en qué
 * gastar el año que viene.
 *
 * Y CUANDO NO SE PUEDE CALCULAR, SE DICE
 * Una campaña recién lanzada no tiene retorno todavía. Mostrar «0%» ahí la haría
 * parecer un fracaso; lo honesto es decir que aún no hay con qué medirla.
 */
import { useState } from 'react'
import { Box, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Campaign, MailOutline } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { crmApi, type Campana } from '@/api/crm'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, CRM_COLOR, Encabezados, Estado, Panel,
  fecha, legible, num, pesos,
} from '@/components/crm/comunes'

const COLOR_TIPO: Record<string, string> = {
  EMAIL_MARKETING: '#0EA5E9', EVENTO: '#7C3AED',
  PROMOCION: CRM_COLOR, COMERCIAL: '#059669',
}

/** Cuánto devolvió por cada peso invertido. `null` si todavía no se puede saber. */
function retorno(c: Campana): number | null {
  const gasto = num(c.presupuesto)
  if (!gasto) return null
  // Una campaña que aún no ha cerrado nada no tiene retorno; tiene un plazo.
  if (!c.conversiones && c.activa) return null
  return ((num(c.ingresos_generados) - gasto) / gasto) * 100
}

export default function CRMCampanas() {
  const [tab, setTab] = useState(0)

  const campanas = useQuery({
    queryKey: ['crm', 'campanas'],
    queryFn: () => crmApi.campanas(),
  })

  // Los prospectos generados y los ingresos NO se teclean: los cuenta el
  // sistema a partir de a quien se le envio y que paso despues. Dejarlos a mano
  // convierte el retorno de la campana en lo que alguien quiso que fuera.
  const campos = (registro: Campana | null): CampoEntidad[] => [
    { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', obligatorio: true,
      ancho: 4, soloLectura: !!registro },
    { clave: 'nombre', etiqueta: 'Nombre de la campaña', tipo: 'texto',
      obligatorio: true, ancho: 8 },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', obligatorio: true,
      ancho: 4, porDefecto: 'EMAIL_MARKETING',
      opciones: ['EMAIL_MARKETING', 'EVENTO', 'PROMOCION', 'COMERCIAL']
        .map(v => ({ valor: v, etiqueta: legible(v) })) },
    { clave: 'fecha_inicio', etiqueta: 'Desde', tipo: 'fecha', ancho: 4 },
    { clave: 'fecha_fin', etiqueta: 'Hasta', tipo: 'fecha', ancho: 4 },
    { clave: 'presupuesto', etiqueta: 'Presupuesto', tipo: 'dinero',
      ancho: 6, minimo: 0,
      ayuda: 'Sin él no se puede calcular el retorno de la campaña.' },
    { clave: 'activa', etiqueta: 'En curso', tipo: 'interruptor', ancho: 6,
      porDefecto: true },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'parrafo' },
  ]

  const crud = useCrud<Campana>({
    nombre: 'campaña', genero: 'f', campos,
    titulo: c => c.nombre,
    crear: d => crmApi.crearCampana(d),
    editar: (id, d) => crmApi.editarCampana(id, d),
    eliminar: id => crmApi.borrarCampana(id),
    consecuencia: () =>
      'Se pierde también el registro de a qué clientes se les envió y quiénes '
      + 'respondieron.',
  })

  const todas = campanas.data ?? []
  const activas = todas.filter(c => c.activa)
  const invertido = todas.reduce((s, c) => s + num(c.presupuesto), 0)
  const generado = todas.reduce((s, c) => s + num(c.ingresos_generados), 0)
  const leads = todas.reduce((s, c) => s + c.leads_generados, 0)
  const conversiones = todas.reduce((s, c) => s + c.conversiones, 0)

  const enviados = todas.reduce((s, c) => s + c.enviados, 0)
  const abiertos = todas.reduce((s, c) => s + c.abiertos, 0)
  const respondidos = todas.reduce((s, c) => s + c.respondidos, 0)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Campaign sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Campañas</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Qué costó cada una y qué trajo
            </Typography>
          </Box>
          <crud.BotonNuevo etiqueta="Nueva campaña" />
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Campañas activas', value: activas.length, color: '#059669' },
            { label: 'Invertido', value: pesos(invertido), color: '#F59E0B' },
            { label: 'Ingresos atribuidos', value: pesos(generado), color: CRM_COLOR },
            { label: 'Prospectos generados', value: leads, color: '#0EA5E9',
              nota: `${conversiones} se volvieron cliente` },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {campanas.isLoading ? '·' : k.value}
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

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${CRM_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: CRM_COLOR },
        }}>
          <Tab label={`Campañas${todas.length ? ` (${todas.length})` : ''}`} />
          <Tab label="Alcance de los envíos" />
        </Tabs>

        <Estado cargando={campanas.isLoading} error={campanas.error}
          vacio={!todas.length}
          mensajeVacio="Todavía no hay campañas"
          hint="Aquí aparecen las de correo, los eventos y las promociones.">

          {tab === 0 && (
            <Panel>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Código', 'Campaña', 'Tipo', 'Período',
                    'Invertido', 'Prospectos', 'Conversiones', 'Ingresos', 'Retorno', '']} />
                  <tbody>
                    {todas.map(c => {
                      const col = COLOR_TIPO[c.tipo] || CRM_COLOR
                      const r = retorno(c)
                      return (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{c.codigo}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600 }}>
                            {c.nombre}
                            {c.activa && (
                              <Chip label="en curso" size="small" sx={{
                                ml: 1, height: 17, fontSize: 9,
                                bgcolor: alpha('#059669', 0.15), color: '#059669',
                              }} />
                            )}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={legible(c.tipo)} size="small" sx={{
                              bgcolor: alpha(col, 0.12), color: col, fontSize: 9.5,
                            }} />
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>
                            {fecha(c.fecha_inicio)} — {fecha(c.fecha_fin)}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{pesos(c.presupuesto)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{c.leads_generados}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{c.conversiones}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: CRM_COLOR, whiteSpace: 'nowrap' }}>{pesos(c.ingresos_generados)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap',
                                       color: r == null ? '#9CA3AF' : r >= 0 ? '#059669' : '#EF4444' }}>
                            {r == null
                              ? <span style={{ fontSize: 11, fontWeight: 400 }}>aún sin medir</span>
                              : `${r > 0 ? '+' : ''}${r.toFixed(0)}%`}
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <crud.Acciones registro={c} />
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
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {[
                  { label: 'Enviados', value: enviados, color: '#94A3B8', base: enviados },
                  { label: 'Abiertos', value: abiertos, color: '#0EA5E9', base: enviados },
                  { label: 'Respondieron', value: respondidos, color: '#059669', base: enviados },
                ].map(m => (
                  <Grid key={m.label} size={{ xs: 12, md: 4 }}>
                    <Box sx={{ border: `1px solid ${alpha(m.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                      <Typography sx={{ fontSize: 26, fontWeight: 900, color: m.color,
                                        lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                        {m.value}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
                        {m.label}
                        {m.base > 0 && m.label !== 'Enviados'
                          ? ` · ${Math.round((m.value / m.base) * 100)}% de los envíos`
                          : ''}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Panel sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                  Alcance campaña por campaña
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                  A cuántos se les envió, cuántos abrieron y cuántos contestaron.
                </Typography>
                <Estado vacio={!enviados}
                  mensajeVacio="Ninguna campaña tiene envíos registrados"
                  hint="El alcance se registra al enviar la campaña a la lista de clientes.">
                  {todas.filter(c => c.enviados > 0).map(c => {
                    const col = COLOR_TIPO[c.tipo] || CRM_COLOR
                    const pctAbre = Math.round((c.abiertos / c.enviados) * 100)
                    const pctResp = Math.round((c.respondidos / c.enviados) * 100)
                    return (
                      <Box key={c.id} sx={{ mb: 2.25 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between',
                                   mb: 0.75, gap: 1, flexWrap: 'wrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MailOutline sx={{ fontSize: 15, color: col }} />
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                              {c.nombre}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                            {c.enviados} enviados · {pctAbre}% abrió · {pctResp}% contestó
                          </Typography>
                        </Box>
                        {/* Dos barras superpuestas: la clara es lo abierto y la
                            oscura lo respondido, siempre sobre el total enviado,
                            para que se vea el embudo dentro de la propia barra. */}
                        <Box sx={{ position: 'relative', height: 8, borderRadius: 4,
                                   bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                          <Box sx={{ position: 'absolute', inset: 0, width: `${pctAbre}%`,
                                     bgcolor: alpha(col, 0.4), borderRadius: 4 }} />
                          <Box sx={{ position: 'absolute', inset: 0, width: `${pctResp}%`,
                                     bgcolor: col, borderRadius: 4 }} />
                        </Box>
                      </Box>
                    )
                  })}
                </Estado>
              </Panel>
            </>
          )}
        </Estado>

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}
