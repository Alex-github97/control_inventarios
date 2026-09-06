/**
 * Los documentos del archivo: buscar, cargar, versionar y cambiar de estado.
 *
 * EL ESTADO NO SE EDITA EN EL FORMULARIO
 * Se mueve desde la propia fila, con su menú. Publicar un documento no es
 * cambiar una palabra: es afirmar que está vigente y que quien lo descargue
 * puede usarlo. Que eso ocurra como efecto secundario de guardar un formulario
 * donde se venía a corregir el nombre es exactamente cómo se publica algo sin
 * querer.
 *
 * LA VIGENCIA MANDA
 * Un documento cuya fecha de vencimiento ya pasó se marca en rojo aunque diga
 * «publicado». El valor de un archivo documental es saber qué está vigente; si
 * la pantalla no distingue lo vencido, no sirve para lo único que se le pide.
 */
import { useState } from 'react'
import {
  Box, Typography, Chip, InputBase, alpha, Menu, MenuItem, Tooltip,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Description, Search, History, Lock, Download,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { dmsApi, peso, type DocumentoEnLista } from '@/api/dms'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, DMS_COLOR, COLOR_ESTADO, Encabezados, Estado, Panel,
  BarraVigencia, ChipEstado, IconoArchivo, fecha, fechaHora, legible, vigencia,
} from '@/components/dms/comunes'

const ESTADOS = ['BORRADOR', 'EN_REVISION', 'APROBADO', 'PUBLICADO',
                 'OBSOLETO', 'ARCHIVADO']

export default function DMSDocumentos() {
  const qc = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('Todos')
  const [carpeta, setCarpeta] = useState<number | 'Todas'>('Todas')
  const [menu, setMenu] = useState<{ el: HTMLElement; d: DocumentoEnLista } | null>(null)
  const [historial, setHistorial] = useState<DocumentoEnLista | null>(null)

  const documentos = useQuery({
    queryKey: ['dms', 'documentos', estado, carpeta, busqueda],
    queryFn: () => dmsApi.documentos({
      estado: estado === 'Todos' ? undefined : estado,
      carpeta_id: carpeta === 'Todas' ? undefined : carpeta,
      q: busqueda.trim() || undefined,
    }),
  })
  const todos = useQuery({
    queryKey: ['dms', 'documentos', 'todos'],
    queryFn: () => dmsApi.documentos(),
  })
  const carpetas = useQuery({
    queryKey: ['dms', 'carpetas'],
    queryFn: () => dmsApi.carpetas(),
    staleTime: 10 * 60 * 1000,
  })
  const tipos = useQuery({
    queryKey: ['dms', 'tipos'],
    queryFn: () => dmsApi.tipos(),
    staleTime: 10 * 60 * 1000,
  })

  const mover = useMutation({
    mutationFn: ({ d, estado }: { d: DocumentoEnLista; estado: string }) =>
      dmsApi.cambiarEstado(d.id, estado),
    onSuccess: () => {
      toast.success('Estado actualizado')
      setMenu(null)
      qc.invalidateQueries({ queryKey: ['dms'] })
    },
    onError: (e: any) => toast.error(
      e?.response?.data?.detail ?? 'No se pudo cambiar el estado'),
  })

  const campos = (registro: DocumentoEnLista | null): CampoEntidad[] => [
    { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', ancho: 4,
      soloLectura: !!registro,
      ayuda: registro ? 'No se cambia: hay expedientes que lo citan.' : undefined },
    { clave: 'nombre', etiqueta: 'Nombre del documento', tipo: 'texto',
      obligatorio: true, ancho: 8 },
    { clave: 'tipo_documento_id', etiqueta: 'Tipo', tipo: 'referencia',
      obligatorio: true, ancho: 6,
      referencias: (tipos.data ?? []).map(t => ({ valor: t.id, etiqueta: t.nombre })),
      ayuda: 'Decide qué campos se le piden y si necesita firma.' },
    { clave: 'carpeta_id', etiqueta: 'Carpeta', tipo: 'referencia', ancho: 6,
      referencias: (carpetas.data ?? []).map(c => ({ valor: c.id, etiqueta: c.ruta || c.nombre })) },
    { clave: 'fecha_vigencia_inicio', etiqueta: 'Vigente desde', tipo: 'fecha', ancho: 4 },
    { clave: 'fecha_vigencia_fin', etiqueta: 'Vigente hasta', tipo: 'fecha', ancho: 4,
      ayuda: 'De aquí sale el aviso de vencimiento. Sin ella no se puede avisar.' },
    { clave: 'tags', etiqueta: 'Etiquetas', tipo: 'texto', ancho: 4,
      ayuda: 'Separadas por coma.' },
    { clave: 'es_confidencial', etiqueta: 'Confidencial', tipo: 'interruptor', ancho: 4,
      ayuda: 'Solo lo ve quien tenga permiso expreso.' },
    { clave: 'permite_descarga', etiqueta: 'Se puede descargar',
      tipo: 'interruptor', ancho: 4, porDefecto: true },
    { clave: 'permite_impresion', etiqueta: 'Se puede imprimir',
      tipo: 'interruptor', ancho: 4, porDefecto: true },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'parrafo' },
  ]

  const crud = useCrud<DocumentoEnLista>({
    nombre: 'documento', campos,
    claves: [['dms']],
    titulo: d => `${d.codigo ?? ''} ${d.nombre}`.trim(),
    crear: d => dmsApi.crearDocumento(d),
    editar: (id, d) => dmsApi.editarDocumento(id, d),
    eliminar: id => dmsApi.borrarDocumento(id),
    consecuencia: () =>
      'Se eliminan también todas sus versiones, sus firmas y su rastro de '
      + 'auditoría. Si es parte de un expediente, ese expediente queda incompleto.',
    exigeEscribir: d => d.codigo ?? d.nombre,
  })

  const universo = todos.data ?? []
  const lista = documentos.data ?? []
  const cuenta = (e: string) => universo.filter(d => d.estado === e).length
  const vencidos = universo.filter(d => (vigencia(d.fecha_vigencia_fin).dias ?? 1) < 0)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Description sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Documentos</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Todo lo archivado, con su versión, su estado y su vigencia
            </Typography>
          </Box>
          <crud.BotonNuevo />
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Publicados', value: cuenta('PUBLICADO'), color: '#059669' },
            { label: 'En revisión', value: cuenta('EN_REVISION'), color: '#F59E0B' },
            { label: 'Borradores', value: cuenta('BORRADOR'), color: '#94A3B8' },
            { label: 'Vencidos', value: vencidos.length, color: '#EF4444' },
          ].map((s, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(s.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {todos.isLoading ? '·' : s.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: s.color, fontWeight: 600, mt: 0.25 }}>
                  {s.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{
            display: 'flex', gap: 1, border: `1px solid ${BORDE}`, borderRadius: 2,
            px: 2, py: 1, alignItems: 'center', flex: 1, minWidth: 220,
            bgcolor: 'background.paper',
          }}>
            <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
            <InputBase placeholder="Buscar por nombre o código…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              sx={{ flex: 1, fontSize: 13.5 }} />
          </Box>
          {['Todos', ...ESTADOS].map(e => (
            <Chip key={e} label={e === 'Todos' ? 'Todos' : legible(e)} size="small"
              onClick={() => setEstado(e)}
              sx={{
                cursor: 'pointer',
                bgcolor: estado === e ? (COLOR_ESTADO[e] || DMS_COLOR) : '#F1F5F9',
                color: estado === e ? '#FFF' : 'text.secondary',
                fontWeight: estado === e ? 700 : 400,
              }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Chip label="Todas las carpetas" size="small" variant="outlined"
            onClick={() => setCarpeta('Todas')}
            sx={{
              cursor: 'pointer', fontSize: 11,
              borderColor: carpeta === 'Todas' ? DMS_COLOR : BORDE,
              color: carpeta === 'Todas' ? DMS_COLOR : '#64748B',
              fontWeight: carpeta === 'Todas' ? 700 : 400,
            }} />
          {carpetas.data?.filter(c => c.padre_id).map(c => (
            <Chip key={c.id} label={c.nombre} size="small" variant="outlined"
              onClick={() => setCarpeta(c.id)}
              sx={{
                cursor: 'pointer', fontSize: 11,
                borderColor: carpeta === c.id ? DMS_COLOR : BORDE,
                color: carpeta === c.id ? DMS_COLOR : '#64748B',
                fontWeight: carpeta === c.id ? 700 : 400,
              }} />
          ))}
        </Box>

        <Panel>
          <Estado cargando={documentos.isLoading} error={documentos.error}
            vacio={!lista.length}
            mensajeVacio={busqueda || estado !== 'Todos' || carpeta !== 'Todas'
              ? 'Ningún documento coincide con ese filtro'
              : 'Todavía no hay documentos archivados'}
            hint={busqueda || estado !== 'Todos' || carpeta !== 'Todas'
              ? 'Pruebe quitando alguno de los filtros.'
              : 'Use «Nuevo documento» para registrar el primero.'}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <Encabezados columnas={['', 'Código', 'Documento', 'Tipo', 'Versión',
                  'Estado', 'Vigencia', 'Propietario', 'Cargado', '']} />
                <tbody>
                  {lista.map(d => (
                    <tr key={d.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                      <td style={{ padding: '8px 6px 8px 14px', width: 30 }}>
                        <IconoArchivo nombre={d.nombre} />
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11.5, color: DMS_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{d.codigo || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, maxWidth: 320 }}>{d.nombre}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{d.tipo_nombre || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'monospace' }}>v{d.version_actual}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Box onClick={e => setMenu({ el: e.currentTarget as HTMLElement, d })}
                          sx={{ display: 'inline-block', cursor: 'pointer' }}>
                          <ChipEstado estado={d.estado} />
                        </Box>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <BarraVigencia fin={d.fecha_vigencia_fin} />
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{d.propietario_nombre || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fecha(d.created_at)}</td>
                      <td style={{ padding: '4px 8px' }}>
                        <crud.Acciones registro={d} extra={
                          <Tooltip title="Ver versiones">
                            <IconButton size="small" onClick={() => setHistorial(d)}>
                              <History sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                        } />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Estado>
        </Panel>

        <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
          <MenuItem disabled sx={{ fontSize: 11, opacity: 0.7 }}>Cambiar estado a…</MenuItem>
          {ESTADOS.map(e => (
            <MenuItem key={e} disabled={menu?.d.estado === e || mover.isPending}
              onClick={() => menu && mover.mutate({ d: menu.d, estado: e })}>
              <Box sx={{
                width: 9, height: 9, borderRadius: '50%', mr: 1.25,
                bgcolor: COLOR_ESTADO[e] || '#94A3B8',
              }} />
              {legible(e)}
            </MenuItem>
          ))}
        </Menu>

        <Versiones documento={historial} onCerrar={() => setHistorial(null)} />
        <crud.Dialogos />
      </Box>
    </Layout>
  )
}

/**
 * Las versiones de un documento.
 *
 * Cada una con su huella MD5. Sin ella no hay forma de demostrar que el archivo
 * que se descarga hoy es el mismo que se aprobó, y esa demostración es la mitad
 * del sentido de tener un archivo documental en vez de una carpeta compartida.
 */
function Versiones({ documento, onCerrar }: {
  documento: DocumentoEnLista | null
  onCerrar: () => void
}) {
  const versiones = useQuery({
    queryKey: ['dms', 'versiones', documento?.id],
    queryFn: () => dmsApi.versiones(documento!.id),
    enabled: !!documento,
  })

  return (
    <Dialog open={!!documento} onClose={onCerrar} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        Versiones
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 400 }}>
          {documento?.nombre}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Estado cargando={versiones.isLoading} error={versiones.error}
          vacio={!versiones.data?.length}
          mensajeVacio="Este documento no tiene versiones cargadas"
          hint="El archivo se sube desde la ficha del documento.">
          {versiones.data?.slice().sort((a, b) => b.version_numero - a.version_numero)
            .map((v, i) => (
            <Box key={v.id} sx={{
              display: 'flex', gap: 1.5, p: 1.75, mb: 1, borderRadius: 1.5,
              border: `1px solid ${i === 0 ? DMS_COLOR : BORDE}`,
              bgcolor: i === 0 ? alpha(DMS_COLOR, 0.04) : '#F9FAFB',
            }}>
              <IconoArchivo mime={v.tipo_mime} nombre={v.nombre_archivo} size={22} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    v{v.numero_version}
                  </Typography>
                  {i === 0 && (
                    <Chip label="actual" size="small" sx={{
                      height: 17, fontSize: 9,
                      bgcolor: alpha(DMS_COLOR, 0.15), color: DMS_COLOR,
                    }} />
                  )}
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                    {fechaHora(v.created_at)} · {peso(v.tamanio_bytes)}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>
                  {v.nombre_archivo}
                </Typography>
                {v.comentario && (
                  <Typography sx={{ fontSize: 12, mt: 0.25 }}>{v.comentario}</Typography>
                )}
                {v.hash_md5 && (
                  <Tooltip title="Huella del archivo: sirve para demostrar que no cambió">
                    <Typography sx={{
                      fontSize: 10, color: 'text.disabled',
                      fontFamily: 'ui-monospace, monospace', mt: 0.25,
                    }}>
                      md5 {v.hash_md5}
                    </Typography>
                  </Tooltip>
                )}
              </Box>
            </Box>
          ))}
        </Estado>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}
