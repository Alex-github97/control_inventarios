/**
 * El tablero del archivo documental.
 *
 * LA PREGUNTA QUE RESPONDE
 * No es «cuántos documentos tengo» —eso no le sirve a nadie— sino «qué se me
 * está venciendo, qué está esperando una firma y qué expediente está
 * incompleto». Por eso lo vencido y lo por vencer van primero, y el total va
 * como dato de contexto y no como titular.
 *
 * LAS ALERTAS LLEVAN SU DOCUMENTO
 * Cada línea dice cuál es. Una alerta que dice «hay documentos por vencer» sin
 * decir cuáles obliga a buscarlos a mano, y entonces nadie la usa.
 */
import { Box, Typography, alpha, Chip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  FolderSpecial, WarningAmber, Draw, AccountTree, Inventory2,
  Storage, EventBusy, Verified,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { dmsApi } from '@/api/dms'
import {
  BORDE, DMS_COLOR, Estado, Panel, BarraVigencia, ChipEstado, IconoArchivo,
  fecha, legible,
} from '@/components/dms/comunes'

export default function DMSDashboard() {
  const tablero = useQuery({
    queryKey: ['dms', 'tablero'],
    queryFn: () => dmsApi.tablero(),
  })
  const documentos = useQuery({
    queryKey: ['dms', 'documentos', 'todos'],
    queryFn: () => dmsApi.documentos(),
  })
  const firmas = useQuery({
    queryKey: ['dms', 'firmas', 'PENDIENTE'],
    queryFn: () => dmsApi.firmas({ estado: 'PENDIENTE' }),
  })
  const expedientes = useQuery({
    queryKey: ['dms', 'expedientes'],
    queryFn: () => dmsApi.expedientes(),
  })

  const k = tablero.data
  const todos = documentos.data ?? []

  // Lo que se vence dentro de noventa días, lo más urgente primero. Se calcula
  // al mirar y no se guarda: un «faltan 30 días» guardado envejece y miente.
  const porVencer = todos
    .filter(d => d.fecha_vigencia_fin)
    .map(d => ({
      d, dias: Math.round(
        (new Date(d.fecha_vigencia_fin!).getTime() - Date.now()) / 86_400_000),
    }))
    .filter(x => x.dias <= 90)
    .sort((a, b) => a.dias - b.dias)

  const vencidos = porVencer.filter(x => x.dias < 0)
  const incompletos = (expedientes.data ?? [])
    .filter(e => e.completitud_pct < 100)
    .sort((a, b) => a.completitud_pct - b.completitud_pct)

  const tarjetas = k ? [
    { label: 'Vencidos', value: vencidos.length, color: '#EF4444',
      icon: <EventBusy />, sub: vencidos.length ? 'requieren renovación ya' : 'ninguno' },
    { label: 'Vencen en 90 días', value: porVencer.length - vencidos.length,
      color: '#F59E0B', icon: <WarningAmber />, sub: 'hay tiempo de renovarlos' },
    { label: 'Firmas pendientes', value: k.firmas_pendientes, color: '#7C3AED',
      icon: <Draw />, sub: 'esperando a alguien' },
    { label: 'Expedientes incompletos', value: incompletos.length, color: '#0EA5E9',
      icon: <Inventory2 />, sub: `de ${expedientes.data?.length ?? 0} abiertos` },
    { label: 'Documentos vigentes', value: k.documentos_activos, color: '#059669',
      icon: <Verified />, sub: `${k.total_documentos} en total` },
    { label: 'Flujos en curso', value: k.workflows_activos, color: DMS_COLOR,
      icon: <AccountTree />, sub: 'en revisión o aprobación' },
    { label: 'Espacio ocupado',
      value: k.tamanio_total_mb >= 1024
        ? `${(k.tamanio_total_mb / 1024).toFixed(1)} GB`
        : `${Math.round(k.tamanio_total_mb)} MB`,
      color: '#6B7280', icon: <Storage />, sub: 'sumando todas las versiones' },
    { label: 'Categorías', value: k.categorias_total, color: '#94A3B8',
      icon: <FolderSpecial />, sub: 'clasificación del archivo' },
  ] : []

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${alpha(DMS_COLOR, 0.4)}`,
          }}>
            <FolderSpecial sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Archivo documental
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Qué se vence, qué espera firma y qué expediente está incompleto
            </Typography>
          </Box>
        </Box>

        <Estado cargando={tablero.isLoading} error={tablero.error} vacio={!k}
          mensajeVacio="Todavía no hay nada archivado"
          hint="Al cargar el primer documento aparecen aquí sus indicadores.">
          <Grid container spacing={2} sx={{ mb: 3 }} className="anim-stagger">
            {tarjetas.map((t, i) => (
              <Grid key={i} size={{ xs: 6, sm: 4, lg: 3 }}>
                <Box className="hover-lift" sx={{
                  border: `1px solid ${alpha(t.color, 0.3)}`, borderRadius: 2,
                  p: 2, display: 'flex', gap: 1.5, alignItems: 'center', height: '100%',
                }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${t.color} 0%, ${alpha(t.color, 0.6)} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    '& svg': { color: '#fff', fontSize: 20 },
                  }}>{t.icon}</Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{
                      fontSize: 22, fontWeight: 900, color: t.color, lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{t.value}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25 }}>
                      {t.label}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: t.color, fontWeight: 600 }}>
                      {t.sub}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Estado>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Panel sx={{ p: 2.5, height: '100%' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                Lo que se vence
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                Lo vencido primero. Un SOAT caído no es un aviso: es un camión
                que no puede salir.
              </Typography>
              <Estado cargando={documentos.isLoading} error={documentos.error}
                vacio={!porVencer.length}
                mensajeVacio="Nada se vence en los próximos 90 días"
                hint="Todos los documentos con vigencia están al día.">
                {porVencer.slice(0, 12).map(({ d }) => (
                  <Box key={d.id} component={Link} to={`/dms/documentos?doc=${d.id}`}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1,
                      borderRadius: 1.5, border: `1px solid ${BORDE}`,
                      bgcolor: '#F9FAFB', textDecoration: 'none', color: 'inherit',
                      '&:hover': { borderColor: DMS_COLOR },
                    }}>
                    <IconoArchivo nombre={d.nombre} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                        {d.nombre}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {d.codigo} · {d.tipo_nombre || 'sin tipo'}
                      </Typography>
                    </Box>
                    <BarraVigencia fin={d.fecha_vigencia_fin} />
                    <ChipEstado estado={d.estado} />
                  </Box>
                ))}
                {porVencer.length > 12 && (
                  <Typography sx={{ fontSize: 11.5, color: 'text.disabled',
                                    textAlign: 'center', mt: 1 }}>
                    y {porVencer.length - 12} más
                  </Typography>
                )}
              </Estado>
            </Panel>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Panel sx={{ p: 2.5, mb: 2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                Expedientes incompletos
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                Los más vacíos primero.
              </Typography>
              <Estado cargando={expedientes.isLoading} error={expedientes.error}
                vacio={!incompletos.length}
                mensajeVacio="Todos los expedientes están completos">
                {incompletos.slice(0, 8).map(e => (
                  <Box key={e.id} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between',
                               alignItems: 'center', mb: 0.5, gap: 1 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                        {e.nombre}
                      </Typography>
                      <Typography sx={{
                        fontSize: 12, fontWeight: 800, flexShrink: 0,
                        color: e.completitud_pct < 50 ? '#EF4444' : '#F59E0B',
                      }}>
                        {e.completitud_pct}%
                      </Typography>
                    </Box>
                    <Box sx={{ height: 6, borderRadius: 3, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                      <Box sx={{
                        height: '100%', width: `${e.completitud_pct}%`,
                        bgcolor: e.completitud_pct < 50 ? '#EF4444' : '#F59E0B',
                        borderRadius: 3,
                      }} />
                    </Box>
                    <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.25 }}>
                      {legible(e.tipo)} · {e.codigo}
                    </Typography>
                  </Box>
                ))}
              </Estado>
            </Panel>

            <Panel sx={{ p: 2.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                Esperando firma
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                Cada una detiene un documento.
              </Typography>
              <Estado cargando={firmas.isLoading} error={firmas.error}
                vacio={!firmas.data?.length}
                mensajeVacio="No hay firmas pendientes"
                hint="Todo lo que se envió a firmar ya se firmó.">
                {firmas.data?.slice(0, 8).map(f => {
                  const doc = todos.find(d => d.id === f.documento_id)
                  return (
                    <Box key={f.id} sx={{
                      display: 'flex', alignItems: 'center', gap: 1, p: 1.25, mb: 0.75,
                      borderRadius: 1.25, bgcolor: alpha('#F59E0B', 0.06),
                      border: `1px solid ${alpha('#F59E0B', 0.25)}`,
                    }}>
                      <Draw sx={{ fontSize: 15, color: '#F59E0B' }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }} noWrap>
                          {doc?.nombre ?? `Documento #${f.documento_id}`}
                        </Typography>
                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                          {legible(f.tipo_firma)} · pedida el {fecha(f.created_at)}
                        </Typography>
                      </Box>
                      <Chip label={`turno ${f.orden ?? 1}`} size="small"
                        sx={{ height: 18, fontSize: 9.5, flexShrink: 0 }} />
                    </Box>
                  )
                })}
              </Estado>
            </Panel>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  )
}
