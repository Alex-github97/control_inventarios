/**
 * Las políticas de retención: cuánto hay que guardar cada cosa, y por qué ley.
 *
 * LA NORMA NO ES ADORNO
 * Cada política cita la norma que la obliga. Es lo que permite defender ante un
 * auditor por qué se conservó —o por qué se eliminó— un documento. Una política
 * sin norma es una costumbre, y una costumbre no se sostiene en una visita de
 * la autoridad.
 *
 * ELIMINAR ES UNA DECISIÓN, NO UN AUTOMATISMO
 * La pantalla dice qué cumplió su plazo y qué acción está pactada, pero no
 * borra nada sola. Un archivo documental que elimina por su cuenta es un
 * archivo del que nadie se fía.
 */
import { useState } from 'react'
import {
  Box, Typography, Chip, alpha, Tabs, Tab, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Gavel, Inventory, DeleteSweep, WarningAmber } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { dmsApi, type Retencion } from '@/api/dms'
import { useCrud } from '@/components/datos/useCrud'
import {
  BORDE, DMS_COLOR, Encabezados, Estado, Panel,
  BarraVigencia, ChipEstado, IconoArchivo, fecha, legible, vigencia,
} from '@/components/dms/comunes'

/** «2 años» se lee; «730 días» hay que dividirlo mentalmente. */
function plazo(dias?: number | null): string {
  if (!dias) return '—'
  if (dias >= 365) {
    const anios = Math.round(dias / 365)
    return `${anios} año${anios > 1 ? 's' : ''}`
  }
  if (dias >= 30) return `${Math.round(dias / 30)} meses`
  return `${dias} días`
}

export default function DMSRetencion() {
  const [tab, setTab] = useState(0)

  const politicas = useQuery({
    queryKey: ['dms', 'retenciones'], queryFn: () => dmsApi.retenciones(),
  })
  const tipos = useQuery({
    queryKey: ['dms', 'tipos'], queryFn: () => dmsApi.tipos(),
    staleTime: 10 * 60 * 1000,
  })
  const documentos = useQuery({
    queryKey: ['dms', 'documentos', 'todos'], queryFn: () => dmsApi.documentos(),
  })

  // Sin `eliminar`: el servidor no expone borrado de políticas. Es coherente —
  // una política retirada deja sin respaldo normativo a lo que ya se conservó
  // bajo ella—, así que se desactiva.
  const crud = useCrud<Retencion>({
    nombre: 'política', genero: 'f', claves: [['dms']],
    titulo: r => r.nombre,
    campos: () => [
      { clave: 'nombre', etiqueta: 'Nombre de la política', tipo: 'texto',
        obligatorio: true, ancho: 8 },
      { clave: 'tipo_documento_id', etiqueta: 'Se aplica a', tipo: 'referencia',
        ancho: 4,
        referencias: (tipos.data ?? []).map(t => ({ valor: t.id, etiqueta: t.nombre })) },
      { clave: 'dias_retencion_activo', etiqueta: 'Días en archivo activo',
        tipo: 'numero', ancho: 4, minimo: 1,
        ayuda: 'Cuánto se mantiene a la mano antes de pasar al histórico.' },
      { clave: 'dias_retencion_total', etiqueta: 'Días en total',
        tipo: 'numero', ancho: 4, minimo: 1,
        ayuda: 'Cuánto hay que conservarlo en total. Debe ser mayor que el anterior.' },
      { clave: 'accion_vencimiento', etiqueta: 'Al cumplirse el plazo',
        tipo: 'seleccion', ancho: 4, porDefecto: 'ARCHIVAR',
        opciones: [
          { valor: 'ARCHIVAR', etiqueta: 'Pasar al histórico' },
          { valor: 'ELIMINAR', etiqueta: 'Proponer eliminación' },
          { valor: 'REVISAR', etiqueta: 'Revisar caso por caso' },
        ] },
      { clave: 'normativa', etiqueta: 'Norma que lo obliga', tipo: 'texto',
        ancho: 12,
        ayuda: 'Ley 594 de 2000, Código de Comercio art. 28… Sin norma, la '
             + 'política no se puede defender ante un auditor.' },
      { clave: 'activo', etiqueta: 'Vigente', tipo: 'interruptor',
        ancho: 12, porDefecto: true },
    ],
    crear: d => dmsApi.crearRetencion(d),
    editar: (id, d) => dmsApi.editarRetencion(id, d),
  })

  const nombreTipo = (id?: number | null) =>
    tipos.data?.find(t => t.id === id)?.nombre ?? 'cualquier tipo'

  // Lo que ya cumplió su plazo, cruzando los documentos con la política de su
  // tipo. Se calcula al mirar: guardar un «vencido» lo deja envejeciendo.
  const porPolitica = new Map<number, Retencion>()
  for (const p of politicas.data ?? []) {
    if (p.tipo_documento_id) porPolitica.set(p.tipo_documento_id, p)
  }
  const cumplidos = (documentos.data ?? [])
    .map(d => {
      const tipo = tipos.data?.find(t => t.nombre === d.tipo_nombre)
      const pol = tipo ? porPolitica.get(tipo.id) : undefined
      if (!pol || !d.created_at || !pol.dias_retencion_total) return null
      const dias = Math.round(
        (Date.now() - new Date(d.created_at).getTime()) / 86_400_000)
      const restan = pol.dias_retencion_total - dias
      return restan <= 365 ? { d, pol, restan } : null
    })
    .filter((x): x is { d: any; pol: Retencion; restan: number } => !!x)
    .sort((a, b) => a.restan - b.restan)

  const activas = (politicas.data ?? []).filter(p => p.activo)
  const sinNorma = (politicas.data ?? []).filter(p => !p.normativa?.trim())

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Gavel sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Retención documental
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Cuánto hay que guardar cada cosa, y bajo qué norma
            </Typography>
          </Box>
          <crud.BotonNuevo etiqueta="Nueva política" />
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Políticas vigentes', value: activas.length, color: DMS_COLOR },
            { label: 'Sin norma citada', value: sinNorma.length,
              color: sinNorma.length ? '#EF4444' : '#059669' },
            { label: 'Cumplen plazo este año', value: cumplidos.length, color: '#F59E0B' },
            { label: 'Ya cumplido',
              value: cumplidos.filter(c => c.restan <= 0).length, color: '#EF4444' },
          ].map((s, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(s.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {politicas.isLoading ? '·' : s.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: s.color, fontWeight: 600, mt: 0.25 }}>
                  {s.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${DMS_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: DMS_COLOR },
        }}>
          <Tab label={`Políticas${politicas.data ? ` (${politicas.data.length})` : ''}`} />
          <Tab label={`Cumplen plazo${cumplidos.length ? ` (${cumplidos.length})` : ''}`} />
        </Tabs>

        {tab === 0 && (
          <Panel>
            <Estado cargando={politicas.isLoading} error={politicas.error}
              vacio={!politicas.data?.length}
              mensajeVacio="No hay políticas de retención definidas"
              hint="Sin política, nadie sabe cuánto tiempo hay que guardar cada cosa.">
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Política', 'Se aplica a', 'En activo',
                    'En total', 'Al vencer', 'Norma', '']} />
                  <tbody>
                    {politicas.data?.map(p => (
                      <tr key={p.id} style={{
                        borderBottom: `1px solid ${BORDE}`,
                        opacity: p.activo ? 1 : 0.55,
                      }}>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>
                          {p.nombre}
                          {!p.activo && (
                            <Chip label="inactiva" size="small" sx={{
                              ml: 1, height: 17, fontSize: 9,
                              bgcolor: '#F1F5F9', color: '#6B7280',
                            }} />
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>
                          {nombreTipo(p.tipo_documento_id)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                          {plazo(p.dias_retencion_activo)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {plazo(p.dias_retencion_total)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip
                            icon={p.accion_vencimiento === 'ELIMINAR'
                              ? <DeleteSweep sx={{ fontSize: 13 }} />
                              : <Inventory sx={{ fontSize: 13 }} />}
                            label={p.accion_vencimiento === 'ELIMINAR' ? 'Proponer eliminación'
                                 : p.accion_vencimiento === 'REVISAR' ? 'Revisar'
                                 : 'Pasar al histórico'}
                            size="small" sx={{
                              fontSize: 9.5, fontWeight: 700,
                              bgcolor: alpha(p.accion_vencimiento === 'ELIMINAR'
                                ? '#EF4444' : '#0EA5E9', 0.12),
                              color: p.accion_vencimiento === 'ELIMINAR' ? '#B91C1C' : '#0369A1',
                              '& .MuiChip-icon': {
                                color: p.accion_vencimiento === 'ELIMINAR' ? '#B91C1C' : '#0369A1',
                              },
                            }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, maxWidth: 280 }}>
                          {p.normativa ? (
                            <Typography sx={{ fontSize: 11.5, color: '#6B7280' }}>
                              {p.normativa}
                            </Typography>
                          ) : (
                            <Tooltip title="Sin norma citada, esta política no se puede defender ante un auditor">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <WarningAmber sx={{ fontSize: 14, color: '#EF4444' }} />
                                <span style={{ color: '#B91C1C', fontWeight: 600 }}>
                                  falta la norma
                                </span>
                              </Box>
                            </Tooltip>
                          )}
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <crud.Acciones registro={p} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Estado>
          </Panel>
        )}

        {tab === 1 && (
          <Panel sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
              Documentos que cumplen su plazo de conservación
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
              Nada se elimina solo. Esta lista dice qué revisar y qué acción está
              pactada para cada caso.
            </Typography>
            <Estado cargando={documentos.isLoading} error={documentos.error}
              vacio={!cumplidos.length}
              mensajeVacio="Ningún documento cumple su plazo este año"
              hint="Todo lo archivado sigue dentro de su período de conservación.">
              {cumplidos.slice(0, 60).map(({ d, pol, restan }) => (
                <Box key={d.id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1,
                  borderRadius: 1.5,
                  border: `1px solid ${restan <= 0 ? alpha('#EF4444', 0.3) : BORDE}`,
                  bgcolor: restan <= 0 ? alpha('#EF4444', 0.04) : '#F9FAFB',
                }}>
                  <IconoArchivo nombre={d.nombre} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                      {d.nombre}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {d.codigo} · archivado el {fecha(d.created_at)} · {pol.nombre}
                    </Typography>
                  </Box>
                  <Typography sx={{
                    fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                    color: restan <= 0 ? '#EF4444' : '#F59E0B',
                  }}>
                    {restan <= 0 ? `cumplió hace ${-restan} d` : `faltan ${restan} d`}
                  </Typography>
                  <Chip label={pol.accion_vencimiento === 'ELIMINAR'
                    ? 'proponer eliminación' : 'pasar al histórico'}
                    size="small" sx={{
                      fontSize: 9.5, flexShrink: 0,
                      bgcolor: alpha(pol.accion_vencimiento === 'ELIMINAR'
                        ? '#EF4444' : '#0EA5E9', 0.12),
                      color: pol.accion_vencimiento === 'ELIMINAR' ? '#B91C1C' : '#0369A1',
                    }} />
                  <ChipEstado estado={d.estado} />
                </Box>
              ))}
              {cumplidos.length > 60 && (
                <Typography sx={{ fontSize: 11.5, color: 'text.disabled',
                                  textAlign: 'center', mt: 1 }}>
                  y {cumplidos.length - 60} más
                </Typography>
              )}
            </Estado>
          </Panel>
        )}

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}
