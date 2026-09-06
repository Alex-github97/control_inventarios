/**
 * La clasificación del archivo: categorías, carpetas y tipos de documento.
 *
 * TRES COSAS DISTINTAS QUE SE CONFUNDEN
 * La **categoría** es de qué trata (calidad, legal). La **carpeta** es dónde
 * está guardado. El **tipo** es qué clase de papel es, y es el único que manda
 * sobre el comportamiento: decide qué campos se piden, si necesita firma y
 * cuánto dura vigente. Están en tres pestañas y no en una lista revuelta
 * porque confundirlos es lo que produce archivos donde nadie encuentra nada.
 *
 * BORRAR UN TIPO NO ES POSIBLE
 * El servidor no lo permite, y hace bien: los documentos que ya se cargaron con
 * ese tipo perderían las reglas bajo las que se aprobaron. Se desactiva, que
 * lo saca de la lista de opciones sin tocar lo archivado.
 */
import { useState } from 'react'
import {
  Box, Typography, Chip, alpha, Tabs, Tab, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Category, Folder, Description, Draw, Schedule, CheckCircle,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { dmsApi, type Categoria, type Carpeta, type TipoDocumento } from '@/api/dms'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, DMS_COLOR, Encabezados, Estado, Panel, legible,
} from '@/components/dms/comunes'

const PALETA = ['#0EA5E9', '#7C3AED', '#059669', '#B91C1C', '#F59E0B',
                '#EF4444', '#6B7280', '#2563EB'].map(v => ({ valor: v, etiqueta: v }))

export default function DMSCategorias() {
  const [tab, setTab] = useState(0)

  const categorias = useQuery({
    queryKey: ['dms', 'categorias'], queryFn: () => dmsApi.categorias(),
  })
  const carpetas = useQuery({
    queryKey: ['dms', 'carpetas'], queryFn: () => dmsApi.carpetas(),
  })
  const tipos = useQuery({
    queryKey: ['dms', 'tipos'], queryFn: () => dmsApi.tipos(),
  })

  const crudCategoria = useCrud<Categoria>({
    nombre: 'categoría', genero: 'f', claves: [['dms']],
    titulo: c => c.nombre,
    campos: () => [
      { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', obligatorio: true, ancho: 8 },
      { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', ancho: 4,
        ayuda: 'Tres letras, para los códigos de documento.' },
      { clave: 'color', etiqueta: 'Color', tipo: 'seleccion', ancho: 6, opciones: PALETA },
      { clave: 'activo', etiqueta: 'Activa', tipo: 'interruptor', ancho: 6, porDefecto: true },
      { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'parrafo' },
    ],
    crear: d => dmsApi.crearCategoria(d),
    editar: (id, d) => dmsApi.editarCategoria(id, d),
    eliminar: id => dmsApi.borrarCategoria(id),
    consecuencia: () =>
      'Los tipos de documento que la usan quedan sin categoría. Los documentos '
      + 'no se tocan.',
  })

  const crudCarpeta = useCrud<Carpeta>({
    nombre: 'carpeta', genero: 'f', claves: [['dms']],
    titulo: c => c.ruta || c.nombre,
    campos: () => [
      { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', obligatorio: true, ancho: 8 },
      { clave: 'padre_id', etiqueta: 'Dentro de', tipo: 'referencia', ancho: 4,
        referencias: (carpetas.data ?? []).map(c => ({
          valor: c.id, etiqueta: c.ruta || c.nombre })),
        ayuda: 'Vacío la deja en la raíz.' },
      { clave: 'color', etiqueta: 'Color', tipo: 'seleccion', ancho: 6, opciones: PALETA },
      { clave: 'es_publica', etiqueta: 'Visible para todos',
        tipo: 'interruptor', ancho: 6, porDefecto: true,
        ayuda: 'Si no, solo la ve quien tenga permiso expreso.' },
      { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'parrafo' },
    ],
    crear: d => dmsApi.crearCarpeta(d),
    editar: (id, d) => dmsApi.editarCarpeta(id, d),
    eliminar: id => dmsApi.borrarCarpeta(id),
    consecuencia: () =>
      'Si tiene documentos dentro, el servidor niega el borrado: quedarían '
      + 'sueltos y sin sitio donde buscarlos.',
  })

  // Sin `eliminar`: el servidor no expone borrado de tipos, y hace bien.
  const crudTipo = useCrud<TipoDocumento>({
    nombre: 'tipo de documento', claves: [['dms']],
    titulo: t => t.nombre,
    campos: () => [
      { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', obligatorio: true, ancho: 8 },
      { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', ancho: 4 },
      { clave: 'categoria_id', etiqueta: 'Categoría', tipo: 'referencia', ancho: 6,
        referencias: (categorias.data ?? []).map(c => ({ valor: c.id, etiqueta: c.nombre })) },
      { clave: 'extensiones_permitidas', etiqueta: 'Formatos aceptados',
        tipo: 'texto', ancho: 6, porDefecto: 'pdf',
        ayuda: 'Separados por coma: pdf,docx,xlsx.' },
      { clave: 'dias_vigencia', etiqueta: 'Días de vigencia', tipo: 'numero',
        ancho: 4, minimo: 1,
        ayuda: 'Vacío = no vence. De aquí sale el aviso de vencimiento.' },
      { clave: 'requiere_firma', etiqueta: 'Necesita firma',
        tipo: 'interruptor', ancho: 4 },
      { clave: 'requiere_aprobacion', etiqueta: 'Necesita aprobación',
        tipo: 'interruptor', ancho: 4 },
      { clave: 'activo', etiqueta: 'Disponible para usar',
        tipo: 'interruptor', ancho: 12, porDefecto: true,
        ayuda: 'Desactivarlo lo saca de las opciones sin tocar lo ya archivado.' },
      { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'parrafo' },
    ],
    crear: d => dmsApi.crearTipo(d),
    editar: (id, d) => dmsApi.editarTipo(id, d),
  })

  const nombreCategoria = (id?: number | null) =>
    categorias.data?.find(c => c.id === id)?.nombre ?? '—'

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Category sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Clasificación del archivo
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              De qué trata, dónde se guarda y qué reglas sigue cada documento
            </Typography>
          </Box>
          {tab === 0 && <crudCategoria.BotonNuevo etiqueta="Nueva categoría" />}
          {tab === 1 && <crudCarpeta.BotonNuevo etiqueta="Nueva carpeta" />}
          {tab === 2 && <crudTipo.BotonNuevo etiqueta="Nuevo tipo" />}
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${DMS_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: DMS_COLOR },
        }}>
          <Tab label={`Categorías${categorias.data ? ` (${categorias.data.length})` : ''}`} />
          <Tab label={`Carpetas${carpetas.data ? ` (${carpetas.data.length})` : ''}`} />
          <Tab label={`Tipos${tipos.data ? ` (${tipos.data.length})` : ''}`} />
        </Tabs>

        {tab === 0 && (
          <Estado cargando={categorias.isLoading} error={categorias.error}
            vacio={!categorias.data?.length}
            mensajeVacio="No hay categorías definidas"
            hint="La categoría dice de qué trata el documento.">
            <Grid container spacing={2}>
              {categorias.data?.map(c => (
                <Grid key={c.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Panel sx={{ p: 2, height: '100%',
                               borderLeft: `4px solid ${c.color || DMS_COLOR}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between',
                               alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                          {c.nombre}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {c.codigo || 'sin código'} ·{' '}
                          {tipos.data?.filter(t => t.categoria_id === c.id).length ?? 0} tipo(s)
                        </Typography>
                      </Box>
                      <crudCategoria.Acciones registro={c} />
                    </Box>
                    {c.descripcion && (
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>
                        {c.descripcion}
                      </Typography>
                    )}
                    {!c.activo && (
                      <Chip label="inactiva" size="small" sx={{
                        mt: 1, height: 18, fontSize: 9.5,
                        bgcolor: '#F1F5F9', color: '#6B7280',
                      }} />
                    )}
                  </Panel>
                </Grid>
              ))}
            </Grid>
          </Estado>
        )}

        {tab === 1 && (
          <Panel>
            <Estado cargando={carpetas.isLoading} error={carpetas.error}
              vacio={!carpetas.data?.length}
              mensajeVacio="No hay carpetas creadas">
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['', 'Carpeta', 'Ruta', 'Visibilidad',
                    'Descripción', '']} />
                  <tbody>
                    {carpetas.data?.slice().sort((a, b) =>
                      (a.ruta || a.nombre).localeCompare(b.ruta || b.nombre)).map(c => (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                        <td style={{ padding: '8px 6px 8px 14px', width: 30 }}>
                          <Folder sx={{ fontSize: 18, color: c.color || DMS_COLOR }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>
                          {c.nombre}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280',
                                     fontFamily: 'ui-monospace, monospace' }}>
                          {c.ruta || '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={c.es_publica ? 'Todos' : 'Restringida'} size="small"
                            sx={{
                              fontSize: 9.5, fontWeight: 700,
                              bgcolor: alpha(c.es_publica ? '#059669' : '#F59E0B', 0.15),
                              color: c.es_publica ? '#059669' : '#B45309',
                            }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>
                          {c.descripcion || '—'}
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <crudCarpeta.Acciones registro={c} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Estado>
          </Panel>
        )}

        {tab === 2 && (
          <Panel>
            <Estado cargando={tipos.isLoading} error={tipos.error}
              vacio={!tipos.data?.length}
              mensajeVacio="No hay tipos de documento definidos"
              hint="El tipo decide qué campos se piden y si necesita firma.">
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['', 'Tipo', 'Categoría', 'Formatos',
                    'Vigencia', 'Exige', 'Documentos', '']} />
                  <tbody>
                    {tipos.data?.map(t => (
                      <tr key={t.id} style={{
                        borderBottom: `1px solid ${BORDE}`,
                        opacity: t.activo ? 1 : 0.55,
                      }}>
                        <td style={{ padding: '8px 6px 8px 14px', width: 30 }}>
                          <Description sx={{ fontSize: 18, color: '#6B7280' }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>
                          {t.nombre}
                          {!t.activo && (
                            <Chip label="inactivo" size="small" sx={{
                              ml: 1, height: 17, fontSize: 9,
                              bgcolor: '#F1F5F9', color: '#6B7280',
                            }} />
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>
                          {nombreCategoria(t.categoria_id)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5,
                                     fontFamily: 'ui-monospace, monospace', color: '#6B7280' }}>
                          {t.extensiones_permitidas || 'cualquiera'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {t.dias_vigencia ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Schedule sx={{ fontSize: 14, color: '#F59E0B' }} />
                              {t.dias_vigencia >= 365
                                ? `${Math.round(t.dias_vigencia / 365)} año(s)`
                                : `${t.dias_vigencia} días`}
                            </Box>
                          ) : <span style={{ color: '#9CA3AF' }}>no vence</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {t.requiere_firma && (
                              <Tooltip title="Necesita firma antes de publicarse">
                                <Draw sx={{ fontSize: 16, color: '#7C3AED' }} />
                              </Tooltip>
                            )}
                            {t.requiere_aprobacion && (
                              <Tooltip title="Pasa por un flujo de aprobación">
                                <CheckCircle sx={{ fontSize: 16, color: '#0EA5E9' }} />
                              </Tooltip>
                            )}
                            {!t.requiere_firma && !t.requiere_aprobacion && (
                              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                                nada
                              </Typography>
                            )}
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>
                          <CamposDelTipo id={t.id} />
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <crudTipo.Acciones registro={t} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Estado>
          </Panel>
        )}

        <crudCategoria.Dialogos />
        <crudCarpeta.Dialogos />
        <crudTipo.Dialogos />
      </Box>
    </Layout>
  )
}

/** Cuántos campos extra pide este tipo al cargar un documento. */
function CamposDelTipo({ id }: { id: number }) {
  const campos = useQuery({
    queryKey: ['dms', 'campos', id],
    queryFn: () => dmsApi.camposDeTipo(id),
    staleTime: 5 * 60 * 1000,
  })
  const n = campos.data?.length ?? 0
  if (campos.isLoading) return <span>·</span>
  return (
    <Tooltip title={n
      ? campos.data!.map(c => c.etiqueta).join(', ')
      : 'No pide campos adicionales'}>
      <span>{n ? `${n} campo(s)` : '—'}</span>
    </Tooltip>
  )
}
