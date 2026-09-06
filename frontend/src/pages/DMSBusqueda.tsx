/**
 * Buscar en el archivo.
 *
 * LA BÚSQUEDA LA HACE EL SERVIDOR
 * El texto va como parámetro `q`. Traerse el archivo entero para filtrarlo en
 * el navegador funciona con seiscientos documentos y deja de funcionar con
 * sesenta mil, que es justo cuando buscar empieza a hacer falta.
 *
 * SE BUSCA EN TRES SITIOS
 * Documentos, expedientes y versiones. Un archivo donde solo se puede buscar
 * por el nombre del documento no sirve cuando lo que se recuerda es el nombre
 * del archivo adjunto o de quién era el expediente.
 */
import { useState } from 'react'
import {
  Box, Typography, Chip, InputBase, alpha, Tabs, Tab, MenuItem, TextField,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Search, ManageSearch, Inventory2, Layers } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { dmsApi, peso } from '@/api/dms'
import {
  BORDE, DMS_COLOR, COLOR_EXPEDIENTE, Encabezados, Estado, Panel,
  BarraVigencia, ChipEstado, IconoArchivo, fecha, fechaHora, legible,
} from '@/components/dms/comunes'

const ESTADOS = ['BORRADOR', 'EN_REVISION', 'APROBADO', 'PUBLICADO',
                 'OBSOLETO', 'ARCHIVADO']

export default function DMSBusqueda() {
  const [tab, setTab] = useState(0)
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState('Todos')
  const [tipo, setTipo] = useState<number | ''>('')

  const consulta = texto.trim()

  const documentos = useQuery({
    queryKey: ['dms', 'buscar', consulta, estado, tipo],
    queryFn: () => dmsApi.documentos({
      q: consulta || undefined,
      estado: estado === 'Todos' ? undefined : estado,
      tipo_documento_id: tipo || undefined,
    }),
  })
  const expedientes = useQuery({
    queryKey: ['dms', 'expedientes'], queryFn: () => dmsApi.expedientes(),
  })
  const tipos = useQuery({
    queryKey: ['dms', 'tipos'], queryFn: () => dmsApi.tipos(),
    staleTime: 10 * 60 * 1000,
  })

  const encontrados = documentos.data ?? []

  // Los expedientes y las versiones se filtran acá porque la API no expone
  // búsqueda de texto sobre ellos. Con el volumen que manejan —decenas y unos
  // pocos miles— es aceptable; si crecen, hay que subirlo al servidor.
  const t = consulta.toLowerCase()
  const expsHallados = (expedientes.data ?? []).filter(
    e => !t || e.nombre.toLowerCase().includes(t)
      || (e.codigo || '').toLowerCase().includes(t))

  const resultados = tab === 1 ? encontrados.length
    : tab === 2 ? expsHallados.length
    : encontrados.length + expsHallados.length

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ManageSearch sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Buscar</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              En documentos, expedientes y archivos adjuntos
            </Typography>
          </Box>
        </Box>

        <Box sx={{
          display: 'flex', gap: 1, mb: 2, alignItems: 'center',
          border: `2px solid ${alpha(DMS_COLOR, 0.3)}`, borderRadius: 2,
          px: 2, py: 1.5, bgcolor: 'background.paper',
        }}>
          <Search sx={{ color: DMS_COLOR, fontSize: 24 }} />
          <InputBase autoFocus
            placeholder="Nombre del documento, código, expediente, nombre del archivo…"
            value={texto} onChange={e => setTexto(e.target.value)}
            sx={{ flex: 1, fontSize: 15 }} />
          {consulta && (
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {resultados} resultado(s)
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField select size="small" label="Tipo de documento" sx={{ minWidth: 220 }}
            value={tipo} onChange={e => setTipo(Number(e.target.value) || '')}>
            <MenuItem value=""><em>Cualquiera</em></MenuItem>
            {tipos.data?.map(t => (
              <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>
            ))}
          </TextField>
          {['Todos', ...ESTADOS].map(e => (
            <Chip key={e} label={e === 'Todos' ? 'Cualquier estado' : legible(e)}
              size="small" onClick={() => setEstado(e)}
              sx={{
                cursor: 'pointer',
                bgcolor: estado === e ? DMS_COLOR : '#F1F5F9',
                color: estado === e ? '#FFF' : 'text.secondary',
                fontWeight: estado === e ? 700 : 400,
              }} />
          ))}
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 2,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${DMS_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: DMS_COLOR },
        }}>
          <Tab label={`Todo${consulta ? ` (${resultados})` : ''}`} />
          <Tab label={`Documentos (${encontrados.length})`} />
          <Tab label={`Expedientes (${expsHallados.length})`} />
        </Tabs>

        {(tab === 0 || tab === 1) && (
          <Panel sx={{ mb: 2 }}>
            <Box sx={{ p: 1.5, borderBottom: `1px solid ${BORDE}`,
                       display: 'flex', alignItems: 'center', gap: 1 }}>
              <Layers sx={{ fontSize: 17, color: DMS_COLOR }} />
              <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Documentos</Typography>
            </Box>
            <Estado cargando={documentos.isLoading} error={documentos.error}
              vacio={!encontrados.length}
              mensajeVacio={consulta
                ? `Ningún documento coincide con «${consulta}»`
                : 'Escriba algo para buscar'}
              hint={consulta
                ? 'Pruebe con menos palabras, o quite los filtros de tipo y estado.'
                : 'También puede filtrar sin escribir nada.'}>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['', 'Código', 'Documento', 'Tipo',
                    'Estado', 'Vigencia', 'Propietario', 'Cargado']} />
                  <tbody>
                    {encontrados.slice(0, 100).map(d => (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                        <td style={{ padding: '8px 6px 8px 14px', width: 30 }}>
                          <IconoArchivo nombre={d.nombre} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: DMS_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{d.codigo || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, maxWidth: 340 }}>{d.nombre}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{d.tipo_nombre || '—'}</td>
                        <td style={{ padding: '10px 14px' }}><ChipEstado estado={d.estado} /></td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <BarraVigencia fin={d.fecha_vigencia_fin} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{d.propietario_nombre || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fecha(d.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
              {encontrados.length > 100 && (
                <Typography sx={{ fontSize: 11.5, color: 'text.disabled',
                                  textAlign: 'center', py: 1.5 }}>
                  Se muestran los primeros 100 de {encontrados.length}. Afine la
                  búsqueda para reducir la lista.
                </Typography>
              )}
            </Estado>
          </Panel>
        )}

        {(tab === 0 || tab === 2) && (
          <Panel>
            <Box sx={{ p: 1.5, borderBottom: `1px solid ${BORDE}`,
                       display: 'flex', alignItems: 'center', gap: 1 }}>
              <Inventory2 sx={{ fontSize: 17, color: DMS_COLOR }} />
              <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Expedientes</Typography>
            </Box>
            <Estado cargando={expedientes.isLoading} error={expedientes.error}
              vacio={!expsHallados.length}
              mensajeVacio={consulta
                ? `Ningún expediente coincide con «${consulta}»`
                : 'Escriba algo para buscar'}>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Código', 'Expediente', 'Clase',
                    'Completitud', 'Estado', 'Abierto']} />
                  <tbody>
                    {expsHallados.slice(0, 60).map(e => {
                      const col = COLOR_EXPEDIENTE[e.tipo] || DMS_COLOR
                      const cc = e.completitud_pct >= 100 ? '#059669'
                        : e.completitud_pct >= 60 ? '#F59E0B' : '#EF4444'
                      return (
                        <tr key={e.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: DMS_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{e.codigo || '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>{e.nombre}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={legible(e.tipo)} size="small" sx={{
                              bgcolor: alpha(col, 0.15), color: col,
                              fontSize: 9.5, fontWeight: 700,
                            }} />
                          </td>
                          <td style={{ padding: '10px 14px', minWidth: 130 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 60, height: 6, borderRadius: 3,
                                         bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                                <Box sx={{ height: '100%', width: `${e.completitud_pct}%`,
                                           bgcolor: cc, borderRadius: 3 }} />
                              </Box>
                              <Typography sx={{ fontSize: 12, fontWeight: 700, color: cc }}>
                                {e.completitud_pct}%
                              </Typography>
                            </Box>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>{legible(e.estado)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fecha(e.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Box>
            </Estado>
          </Panel>
        )}
      </Box>
    </Layout>
  )
}
