/**
 * El repositorio: el archivo visto como carpetas, no como lista.
 *
 * POR QUÉ EXISTE SI YA HAY UNA LISTA DE DOCUMENTOS
 * Porque son dos maneras distintas de buscar. La lista sirve cuando se sabe qué
 * se busca; el árbol, cuando se sabe dónde debería estar. Quien lleva un
 * archivo piensa en carpetas, y obligarlo a filtrar por menús desplegables es
 * pedirle que piense como la base de datos.
 *
 * EL PESO SE VE
 * Cada carpeta muestra cuánto ocupa. Es el dato que hace falta cuando el disco
 * empieza a llenarse y hay que decidir qué migrar al histórico.
 */
import { useState } from 'react'
import {
  Box, Typography, Chip, alpha, Breadcrumbs, Link as Enlace, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Folder, FolderOpen, Home, Lock, Public, Storage,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { dmsApi, peso, type Carpeta } from '@/api/dms'
import {
  BORDE, DMS_COLOR, Encabezados, Estado, Panel,
  BarraVigencia, ChipEstado, IconoArchivo, fecha,
} from '@/components/dms/comunes'

export default function DMSRepositorio() {
  const [actual, setActual] = useState<Carpeta | null>(null)

  const carpetas = useQuery({
    queryKey: ['dms', 'carpetas'], queryFn: () => dmsApi.carpetas(),
  })
  const documentos = useQuery({
    queryKey: ['dms', 'documentos', 'carpeta', actual?.id ?? 'raiz'],
    queryFn: () => dmsApi.documentos(
      actual ? { carpeta_id: actual.id } : undefined),
  })

  const todas = carpetas.data ?? []
  const hijas = todas.filter(c => (c.padre_id ?? null) === (actual?.id ?? null))
  const raices = todas.filter(c => !c.padre_id)

  // La ruta de migas se reconstruye subiendo por `padre_id`. Guardarla como
  // cadena en la carpeta funciona hasta que alguien mueve una y las rutas de
  // todas sus hijas quedan mintiendo.
  const camino: Carpeta[] = []
  let cursor = actual
  while (cursor) {
    camino.unshift(cursor)
    cursor = todas.find(c => c.id === cursor!.padre_id) ?? null
  }

  const enEstaCarpeta = documentos.data ?? []

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FolderOpen sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Repositorio</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              El archivo por carpetas, como está guardado
            </Typography>
          </Box>
        </Box>

        <Breadcrumbs sx={{ mb: 2, fontSize: 13 }}>
          <Enlace component="button" underline="hover" onClick={() => setActual(null)}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5,
                  color: actual ? DMS_COLOR : 'text.primary',
                  fontWeight: actual ? 400 : 700, fontSize: 13 }}>
            <Home sx={{ fontSize: 16 }} /> Raíz
          </Enlace>
          {camino.map((c, i) => (
            <Enlace key={c.id} component="button" underline="hover"
              onClick={() => setActual(c)}
              sx={{ color: i === camino.length - 1 ? 'text.primary' : DMS_COLOR,
                    fontWeight: i === camino.length - 1 ? 700 : 400, fontSize: 13 }}>
              {c.nombre}
            </Enlace>
          ))}
        </Breadcrumbs>

        <Estado cargando={carpetas.isLoading} error={carpetas.error}
          vacio={!todas.length}
          mensajeVacio="No hay carpetas creadas"
          hint="Las carpetas se crean en «Clasificación del archivo».">
          {!!hijas.length && (
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {hijas.map(c => (
                <Grid key={c.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                  <Box onClick={() => setActual(c)} sx={{
                    p: 1.75, borderRadius: 2, cursor: 'pointer', height: '100%',
                    border: `1px solid ${BORDE}`, bgcolor: 'background.paper',
                    transition: 'border-color .15s, transform .15s',
                    '&:hover': { borderColor: c.color || DMS_COLOR,
                                 transform: 'translateY(-2px)' },
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      <Folder sx={{ fontSize: 26, color: c.color || DMS_COLOR }} />
                      <Tooltip title={c.es_publica ? 'La ve todo el mundo'
                                                   : 'Restringida'}>
                        {c.es_publica
                          ? <Public sx={{ fontSize: 13, color: 'text.disabled' }} />
                          : <Lock sx={{ fontSize: 13, color: '#F59E0B' }} />}
                      </Tooltip>
                    </Box>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                      {c.nombre}
                    </Typography>
                    <ResumenCarpeta id={c.id} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}

          {!actual && !hijas.length && !!raices.length && (
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
              No hay carpetas en la raíz.
            </Typography>
          )}

          <Panel>
            <Box sx={{ p: 2, borderBottom: `1px solid ${BORDE}`,
                       display: 'flex', justifyContent: 'space-between',
                       alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                {actual ? `Documentos en ${actual.nombre}` : 'Documentos en la raíz'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {enEstaCarpeta.length} documento(s)
              </Typography>
            </Box>
            <Estado cargando={documentos.isLoading} error={documentos.error}
              vacio={!enEstaCarpeta.length}
              mensajeVacio={actual
                ? 'Esta carpeta no tiene documentos'
                : 'No hay documentos sueltos en la raíz'}
              hint={actual ? 'Entre a una subcarpeta o cargue uno nuevo.'
                           : 'Lo normal es que todo esté dentro de una carpeta.'}>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['', 'Código', 'Documento', 'Tipo',
                    'Versión', 'Estado', 'Vigencia', 'Cargado']} />
                  <tbody>
                    {enEstaCarpeta.map(d => (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                        <td style={{ padding: '8px 6px 8px 14px', width: 30 }}>
                          <IconoArchivo nombre={d.nombre} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: DMS_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{d.codigo || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, maxWidth: 340 }}>{d.nombre}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{d.tipo_nombre || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'monospace' }}>v{d.version_actual}</td>
                        <td style={{ padding: '10px 14px' }}><ChipEstado estado={d.estado} /></td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <BarraVigencia fin={d.fecha_vigencia_fin} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{fecha(d.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Estado>
          </Panel>
        </Estado>
      </Box>
    </Layout>
  )
}

/** Cuántos documentos y cuánto pesa una carpeta. */
function ResumenCarpeta({ id }: { id: number }) {
  const documentos = useQuery({
    queryKey: ['dms', 'documentos', 'carpeta', id],
    queryFn: () => dmsApi.documentos({ carpeta_id: id }),
    staleTime: 60 * 1000,
  })
  const n = documentos.data?.length ?? 0
  return (
    <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.25 }}>
      {documentos.isLoading ? 'contando…' : `${n} documento${n === 1 ? '' : 's'}`}
    </Typography>
  )
}
