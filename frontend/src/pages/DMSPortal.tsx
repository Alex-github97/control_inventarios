/**
 * Lo mío: lo que espera mi firma, lo que me avisaron y lo que subí.
 *
 * POR QUÉ UNA PANTALLA APARTE
 * Porque el archivo completo son seiscientos documentos y a cada persona le
 * tocan cinco. Obligar a filtrar el archivo entero para encontrar los propios
 * es lo que hace que la gente deje de entrar y las firmas se atasquen.
 *
 * LOS AVISOS SE MARCAN COMO LEÍDOS
 * Y se marcan de verdad, contra el servidor. Un contador de avisos que nunca
 * baja se ignora en una semana.
 */
import { Box, Typography, Chip, alpha, Button, Tooltip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Person, Draw, NotificationsActive, DoneAll, Upload, CheckCircle, Cancel,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { dmsApi } from '@/api/dms'
import { useAuthStore } from '@/store/authStore'
import {
  BORDE, DMS_COLOR, Estado, Panel,
  BarraVigencia, ChipEstado, IconoArchivo, fechaHora, legible,
} from '@/components/dms/comunes'

export default function DMSPortal() {
  const qc = useQueryClient()
  const usuario = useAuthStore(s => s.user)

  const firmas = useQuery({
    queryKey: ['dms', 'firmas', 'PENDIENTE'],
    queryFn: () => dmsApi.firmas({ estado: 'PENDIENTE' }),
  })
  const avisos = useQuery({
    queryKey: ['dms', 'notificaciones'],
    queryFn: () => dmsApi.notificaciones(),
  })
  const documentos = useQuery({
    queryKey: ['dms', 'documentos', 'todos'],
    queryFn: () => dmsApi.documentos(),
  })

  const refrescar = () => qc.invalidateQueries({ queryKey: ['dms'] })

  const firmar = useMutation({
    mutationFn: (id: number) => dmsApi.firmar(id),
    onSuccess: () => { toast.success('Documento firmado'); refrescar() },
    onError: (e: any) => toast.error(
      e?.response?.data?.detail ?? 'No se pudo firmar'),
  })
  const leer = useMutation({
    mutationFn: (id: number) => dmsApi.marcarLeida(id),
    onSuccess: refrescar,
    onError: () => toast.error('No se pudo marcar como leído'),
  })
  const leerTodo = useMutation({
    mutationFn: async () => {
      const pendientes = (avisos.data ?? []).filter(a => !a.leida)
      for (const a of pendientes) await dmsApi.marcarLeida(a.id)
    },
    onSuccess: () => { toast.success('Avisos marcados como leídos'); refrescar() },
    onError: () => toast.error('No se pudieron marcar todos'),
  })

  const doc = (id?: number | null) =>
    documentos.data?.find(d => d.id === id)

  const sinLeer = (avisos.data ?? []).filter(a => !a.leida)
  const pendientes = firmas.data ?? []

  // «Lo que subí» se saca del listado por el nombre del propietario, que es lo
  // que el servidor devuelve resuelto. No hay filtro por propietario en la API.
  const mios = (documentos.data ?? []).filter(
    d => usuario?.nombre && d.propietario_nombre
      && d.propietario_nombre.toLowerCase().includes(usuario.nombre.toLowerCase()))

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Person sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Mi escritorio</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Lo que le toca a usted del archivo documental
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Panel sx={{ p: 2.5, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Draw sx={{ fontSize: 18, color: '#F59E0B' }} />
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                  Esperando su firma
                </Typography>
                {!!pendientes.length && (
                  <Chip label={pendientes.length} size="small" sx={{
                    height: 19, fontSize: 10, fontWeight: 800,
                    bgcolor: alpha('#F59E0B', 0.15), color: '#B45309',
                  }} />
                )}
              </Box>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                Cada uno detiene un documento hasta que alguien lo resuelva.
              </Typography>
              <Estado cargando={firmas.isLoading} error={firmas.error}
                vacio={!pendientes.length}
                mensajeVacio="No tiene nada por firmar"
                hint="Cuando le envíen un documento a firmar aparecerá aquí.">
                {pendientes.map(f => {
                  const d = doc(f.documento_id)
                  const espera = f.created_at
                    ? Math.round((Date.now() - new Date(f.created_at).getTime()) / 86_400_000)
                    : null
                  return (
                    <Box key={f.id} sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75, mb: 1,
                      borderRadius: 1.5,
                      border: `1px solid ${espera != null && espera > 7
                        ? alpha('#EF4444', 0.35) : BORDE}`,
                      bgcolor: espera != null && espera > 7
                        ? alpha('#EF4444', 0.04) : '#F9FAFB',
                    }}>
                      <IconoArchivo nombre={d?.nombre} size={22} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>
                          {d?.nombre ?? `Documento #${f.documento_id}`}
                        </Typography>
                        <Typography sx={{
                          fontSize: 11,
                          color: espera != null && espera > 7 ? '#B91C1C' : 'text.secondary',
                          fontWeight: espera != null && espera > 7 ? 600 : 400,
                        }}>
                          {d?.codigo} · {legible(f.tipo_firma)}
                          {espera != null ? ` · esperando ${espera} día(s)` : ''}
                        </Typography>
                      </Box>
                      <Button size="small" variant="contained"
                        startIcon={<CheckCircle sx={{ fontSize: 15 }} />}
                        disabled={firmar.isPending}
                        onClick={() => firmar.mutate(f.id)}
                        sx={{ textTransform: 'none', flexShrink: 0 }}>
                        Firmar
                      </Button>
                    </Box>
                  )
                })}
              </Estado>
            </Panel>

            <Panel sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Upload sx={{ fontSize: 18, color: DMS_COLOR }} />
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                  Documentos a su nombre
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                De los que usted figura como responsable.
              </Typography>
              <Estado cargando={documentos.isLoading} error={documentos.error}
                vacio={!mios.length}
                mensajeVacio="No figura como responsable de ningún documento"
                hint="El responsable se asigna al cargar el documento.">
                {mios.slice(0, 15).map(d => (
                  <Box key={d.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 0.75,
                    borderRadius: 1.5, border: `1px solid ${BORDE}`, bgcolor: '#F9FAFB',
                  }}>
                    <IconoArchivo nombre={d.nombre} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                        {d.nombre}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {d.codigo} · v{d.version_actual}
                      </Typography>
                    </Box>
                    <BarraVigencia fin={d.fecha_vigencia_fin} />
                    <ChipEstado estado={d.estado} />
                  </Box>
                ))}
                {mios.length > 15 && (
                  <Typography sx={{ fontSize: 11.5, color: 'text.disabled',
                                    textAlign: 'center', mt: 1 }}>
                    y {mios.length - 15} más
                  </Typography>
                )}
              </Estado>
            </Panel>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Panel sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <NotificationsActive sx={{ fontSize: 18, color: '#7C3AED' }} />
                <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
                  Avisos
                </Typography>
                {!!sinLeer.length && (
                  <Tooltip title="Marcar todos como leídos">
                    <Button size="small" startIcon={<DoneAll sx={{ fontSize: 15 }} />}
                      disabled={leerTodo.isPending}
                      onClick={() => leerTodo.mutate()}
                      sx={{ textTransform: 'none', fontSize: 11.5 }}>
                      Leer todos ({sinLeer.length})
                    </Button>
                  </Tooltip>
                )}
              </Box>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                Vencimientos y firmas que le corresponden.
              </Typography>
              <Estado cargando={avisos.isLoading} error={avisos.error}
                vacio={!avisos.data?.length}
                mensajeVacio="No tiene avisos"
                hint="Aquí llegan los vencimientos y las solicitudes de firma.">
                {avisos.data?.slice(0, 25).map(a => (
                  <Box key={a.id} sx={{
                    display: 'flex', gap: 1.25, p: 1.5, mb: 0.75, borderRadius: 1.5,
                    border: `1px solid ${a.leida ? BORDE : alpha('#7C3AED', 0.3)}`,
                    bgcolor: a.leida ? 'transparent' : alpha('#7C3AED', 0.04),
                    opacity: a.leida ? 0.65 : 1,
                  }}>
                    <Box sx={{
                      width: 7, height: 7, borderRadius: '50%', mt: 0.75, flexShrink: 0,
                      bgcolor: a.leida ? 'transparent' : '#7C3AED',
                    }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: a.leida ? 500 : 700 }}>
                        {a.titulo}
                      </Typography>
                      {a.mensaje && (
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                          {a.mensaje}
                        </Typography>
                      )}
                      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.25 }}>
                        {fechaHora(a.created_at)}
                      </Typography>
                    </Box>
                    {!a.leida && (
                      <Tooltip title="Marcar como leído">
                        <Button size="small" disabled={leer.isPending}
                          onClick={() => leer.mutate(a.id)}
                          sx={{ textTransform: 'none', fontSize: 11, minWidth: 0, flexShrink: 0 }}>
                          Leído
                        </Button>
                      </Tooltip>
                    )}
                  </Box>
                ))}
              </Estado>
            </Panel>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
