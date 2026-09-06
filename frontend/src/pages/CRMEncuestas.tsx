/**
 * Las encuestas de satisfacción y el NPS que sale de ellas.
 *
 * EL NPS SE CALCULA, NO SE GUARDA
 * Se cuentan promotores (9-10) menos detractores (0-6) sobre las respuestas
 * recibidas. Guardar un «NPS: +48» en algún lado y mostrarlo es lo que hace que
 * la cifra del tablero y la de las encuestas dejen de coincidir en cuanto
 * alguien responde una más.
 *
 * SOLO CUENTAN LAS RESPONDIDAS
 * Una encuesta enviada y no respondida no es un cero: es silencio. Contarla
 * como cero hunde el indicador y hace creer que el cliente está molesto cuando
 * lo único que pasa es que no abrió el correo. Lo que sí se muestra aparte es
 * la tasa de respuesta, que es su propio problema.
 *
 * Y CADA ESCALA CON LA SUYA
 * El NPS va de 0 a 10; el CSAT y el CES, de 1 a 5. Promediarlos juntos da un
 * número que no significa nada, así que se muestran separados.
 */
import { useMemo, useState } from 'react'
import { Box, Typography, Tab, Tabs, Chip, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { StarRate, ThumbUp, Speed, SentimentVeryDissatisfied } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { crmApi, type Encuesta } from '@/api/crm'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, CRM_COLOR, Encabezados, Estado, Indicador, Panel,
  fecha, legible,
} from '@/components/crm/comunes'

const CFG_TIPO: Record<string, { color: string; icono: JSX.Element; nombre: string; max: number }> = {
  NPS:  { color: '#059669', icono: <StarRate sx={{ fontSize: 16 }} />, nombre: 'Recomendación (NPS)', max: 10 },
  CSAT: { color: '#0EA5E9', icono: <ThumbUp sx={{ fontSize: 16 }} />, nombre: 'Satisfacción (CSAT)', max: 5 },
  CES:  { color: '#7C3AED', icono: <Speed sx={{ fontSize: 16 }} />, nombre: 'Esfuerzo (CES)', max: 5 },
}

const clasificarNps = (p: number) =>
  p >= 9 ? 'Promotor' : p >= 7 ? 'Neutro' : 'Detractor'
const colorNps = (p: number) =>
  p >= 9 ? '#059669' : p >= 7 ? '#F59E0B' : '#EF4444'

export default function CRMEncuestas() {
  const [tab, setTab] = useState(0)

  const encuestas = useQuery({
    queryKey: ['crm', 'encuestas'],
    queryFn: () => crmApi.encuestas(),
  })
  const clientes = useQuery({
    queryKey: ['crm', 'clientes', 'Todos', ''],
    queryFn: () => crmApi.clientes(),
    staleTime: 5 * 60 * 1000,
  })

  const nombreCliente = (id: number) =>
    clientes.data?.find(c => c.id === id)?.razon_social ?? `Cliente #${id}`

  // El tope del puntaje depende de la escala: el NPS llega a diez y el CSAT a
  // cinco. Un ocho en un CSAT metería en el promedio un valor imposible.
  const campos = (registro: Encuesta | null): CampoEntidad[] => [
    { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', obligatorio: true,
      ancho: 4, soloLectura: !!registro },
    { clave: 'cliente_id', etiqueta: 'Cliente', tipo: 'referencia',
      obligatorio: true, ancho: 8, soloLectura: !!registro,
      referencias: (clientes.data ?? []).map(c => ({ valor: c.id, etiqueta: c.razon_social })) },
    { clave: 'tipo', etiqueta: 'Escala', tipo: 'seleccion', obligatorio: true,
      ancho: 4, porDefecto: 'NPS', soloLectura: !!registro,
      opciones: Object.entries(CFG_TIPO).map(([v, c]) => ({
        valor: v, etiqueta: c.nombre })) },
    { clave: 'puntaje', etiqueta: 'Puntaje', tipo: 'numero', ancho: 4, minimo: 0,
      maximo: registro ? (CFG_TIPO[registro.tipo]?.max ?? 10) : 10,
      visibleSi: () => !!registro,
      ayuda: registro
        ? `De 0 a ${CFG_TIPO[registro.tipo]?.max ?? 10}. Registrarlo la marca como respondida.`
        : undefined },
    { clave: 'fecha_respuesta', etiqueta: 'Respondió el', tipo: 'fecha', ancho: 4,
      visibleSi: () => !!registro },
    { clave: 'comentario', etiqueta: 'Comentario del cliente', tipo: 'parrafo',
      visibleSi: () => !!registro },
  ]

  const crud = useCrud<Encuesta>({
    nombre: 'encuesta', genero: 'f', campos,
    titulo: e => `${e.codigo} · ${e.tipo}`,
    crear: d => crmApi.crearEncuesta(d),
    editar: (id, d) => crmApi.editarEncuesta(id, d),
    eliminar: id => crmApi.borrarEncuesta(id),
    consecuencia: e => e.respondida
      ? 'Su respuesta deja de contar en el NPS y en la satisfacción media.'
      : undefined,
  })

  const todas = encuestas.data ?? []

  const nps = useMemo(() => {
    const r = todas.filter(e => e.tipo === 'NPS' && e.respondida && e.puntaje != null)
    if (!r.length) return null
    const promotores = r.filter(e => e.puntaje! >= 9).length
    const detractores = r.filter(e => e.puntaje! <= 6).length
    return {
      total: r.length,
      promotores, detractores,
      neutros: r.length - promotores - detractores,
      score: Math.round(((promotores - detractores) / r.length) * 100),
    }
  }, [todas])

  const promedio = (tipo: string) => {
    const r = todas.filter(e => e.tipo === tipo && e.respondida && e.puntaje != null)
    if (!r.length) return null
    return r.reduce((s, e) => s + e.puntaje!, 0) / r.length
  }

  const enviadas = todas.length
  const respondidas = todas.filter(e => e.respondida).length
  const tasaRespuesta = enviadas ? Math.round((respondidas / enviadas) * 100) : null

  // Los detractores son la lista accionable: cada uno es un cliente que dijo que
  // no recomendaría, con su nombre y su motivo escrito.
  const detractores = todas.filter(
    e => e.tipo === 'NPS' && e.respondida && (e.puntaje ?? 10) <= 6)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <StarRate sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Satisfacción del cliente
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Encuestas enviadas tras cerrar un ticket, y lo que respondieron
            </Typography>
          </Box>
          <crud.BotonNuevo etiqueta="Enviar encuesta" />
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Indicador etiqueta="NPS" color={
                nps == null ? '#94A3B8' : nps.score >= 50 ? '#059669'
                  : nps.score >= 0 ? '#F59E0B' : '#EF4444'}
              valor={nps == null ? '—' : (nps.score > 0 ? `+${nps.score}` : String(nps.score))}
              nota={nps == null ? 'sin respuestas' : `sobre ${nps.total} respuesta(s)`} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Indicador etiqueta="Satisfacción (CSAT)" color="#0EA5E9"
              valor={promedio('CSAT') == null ? '—' : `${promedio('CSAT')!.toFixed(1)} / 5`} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Indicador etiqueta="Esfuerzo (CES)" color="#7C3AED"
              valor={promedio('CES') == null ? '—' : `${promedio('CES')!.toFixed(1)} / 5`} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Indicador etiqueta="Tasa de respuesta"
              color={tasaRespuesta != null && tasaRespuesta >= 40 ? '#059669' : '#F59E0B'}
              valor={tasaRespuesta == null ? '—' : `${tasaRespuesta}%`}
              nota={`${respondidas} de ${enviadas} enviadas`} />
          </Grid>
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${CRM_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: CRM_COLOR },
        }}>
          <Tab label="Reparto del NPS" />
          <Tab label={`Encuestas${todas.length ? ` (${todas.length})` : ''}`} />
          <Tab label={`Detractores${detractores.length ? ` (${detractores.length})` : ''}`} />
        </Tabs>

        <Estado cargando={encuestas.isLoading} error={encuestas.error}
          vacio={!todas.length}
          mensajeVacio="Todavía no se ha enviado ninguna encuesta"
          hint="Se envían al cerrar un ticket de servicio.">

          {tab === 0 && (
            <Panel sx={{ p: 2.5 }}>
              {nps == null ? (
                <Estado vacio mensajeVacio="Ninguna encuesta de recomendación respondida"
                  hint="El NPS aparece cuando haya al menos una respuesta.">
                  <span />
                </Estado>
              ) : (
                <>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                    Cómo se reparten las {nps.total} respuestas
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2.5 }}>
                    Promotores (9-10) menos detractores (0-6). Los neutros no suman
                    ni restan, y por eso el NPS puede ir de −100 a +100.
                  </Typography>
                  {[
                    { nombre: 'Promotores', rango: '9 a 10', n: nps.promotores, color: '#059669' },
                    { nombre: 'Neutros', rango: '7 a 8', n: nps.neutros, color: '#F59E0B' },
                    { nombre: 'Detractores', rango: '0 a 6', n: nps.detractores, color: '#EF4444' },
                  ].map(g => {
                    const pct = Math.round((g.n / nps.total) * 100)
                    return (
                      <Box key={g.nombre} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                            {g.nombre}
                            <Box component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}>
                              {' '}· puntaje {g.rango}
                            </Box>
                          </Typography>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: g.color }}>
                            {g.n} · {pct}%
                          </Typography>
                        </Box>
                        <Box sx={{ height: 8, borderRadius: 4, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: g.color, borderRadius: 4 }} />
                        </Box>
                      </Box>
                    )
                  })}
                </>
              )}
            </Panel>
          )}

          {tab === 1 && (
            <Panel>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Código', 'Cliente', 'Tipo', 'Puntaje',
                    'Clasificación', 'Enviada', 'Respondida', 'Comentario', '']} />
                  <tbody>
                    {todas.map(e => {
                      const cfg = CFG_TIPO[e.tipo] ?? { color: '#94A3B8', icono: null, nombre: e.tipo, max: 5 }
                      return (
                        <tr key={e.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{e.codigo}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{nombreCliente(e.cliente_id)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={e.tipo} size="small" sx={{
                              bgcolor: alpha(cfg.color, 0.12), color: cfg.color,
                              fontSize: 9.5, fontWeight: 700,
                            }} />
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap',
                                       color: e.puntaje == null ? '#9CA3AF' : cfg.color }}>
                            {e.puntaje == null ? '—' : `${e.puntaje} / ${cfg.max}`}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {e.tipo === 'NPS' && e.puntaje != null ? (
                              <Chip label={clasificarNps(e.puntaje)} size="small" sx={{
                                bgcolor: alpha(colorNps(e.puntaje), 0.15),
                                color: colorNps(e.puntaje), fontSize: 9.5, fontWeight: 700,
                              }} />
                            ) : (
                              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                                {e.respondida ? '—' : 'sin responder'}
                              </Typography>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fecha(e.fecha_envio)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fecha(e.fecha_respuesta)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', maxWidth: 320 }}>{e.comentario || '—'}</td>
                          <td style={{ padding: '4px 8px' }}>
                            <crud.Acciones registro={e} />
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
                Clientes que no recomendarían el servicio
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                Cada uno con lo que escribió. Es la lista corta a la que hay que
                llamar antes de la próxima renovación.
              </Typography>
              <Estado vacio={!detractores.length}
                mensajeVacio="Ningún detractor"
                hint="Nadie ha calificado el servicio por debajo de 7.">
                {detractores.map((e: Encuesta) => (
                  <Box key={e.id} sx={{
                    p: 1.75, mb: 1.25, borderRadius: 1.5,
                    bgcolor: alpha('#EF4444', 0.05),
                    border: `1px solid ${alpha('#EF4444', 0.25)}`,
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between',
                               gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                        {nombreCliente(e.cliente_id)}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <SentimentVeryDissatisfied sx={{ fontSize: 16, color: '#EF4444' }} />
                        <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#EF4444' }}>
                          {e.puntaje} / 10
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                          {fecha(e.fecha_respuesta)}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: 12.5, mt: 0.5, lineHeight: 1.5 }}>
                      {e.comentario || 'No dejó comentario.'}
                    </Typography>
                  </Box>
                ))}
              </Estado>
            </Panel>
          )}
        </Estado>

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}
