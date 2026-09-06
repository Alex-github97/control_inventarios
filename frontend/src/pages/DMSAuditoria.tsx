/**
 * El rastro: quién vio, descargó o modificó cada documento, y desde dónde.
 *
 * PARA QUÉ SIRVE DE VERDAD
 * Para responder una pregunta concreta: «¿quién descargó ese contrato antes de
 * que se filtrara?». Por eso el filtro por documento y por acción está arriba y
 * no escondido, y por eso cada línea lleva la dirección de red. Un rastro que
 * no permite esa consulta es un registro que ocupa disco y no defiende a nadie.
 *
 * NO SE PUEDE EDITAR NI BORRAR
 * A propósito, y el servidor tampoco lo permite. Un rastro de auditoría que se
 * puede modificar no vale como prueba de nada.
 */
import { useMemo, useState } from 'react'
import {
  Box, Typography, Chip, InputBase, alpha, MenuItem, TextField, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Policy, Search, Visibility, Download, Edit, DeleteForever,
  Draw, CheckCircle, Cancel, Print, NoteAdd, LayersOutlined,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { dmsApi } from '@/api/dms'
import {
  BORDE, DMS_COLOR, Encabezados, Estado, Panel,
  IconoArchivo, fechaHora, legible,
} from '@/components/dms/comunes'

/** Cada acción con su icono y su color: el rojo es lo que hay que mirar. */
const ACCIONES: Record<string, { color: string; icono: JSX.Element }> = {
  CREACION:      { color: '#059669', icono: <NoteAdd sx={{ fontSize: 15 }} /> },
  VISUALIZACION: { color: '#94A3B8', icono: <Visibility sx={{ fontSize: 15 }} /> },
  DESCARGA:      { color: '#0EA5E9', icono: <Download sx={{ fontSize: 15 }} /> },
  MODIFICACION:  { color: '#F59E0B', icono: <Edit sx={{ fontSize: 15 }} /> },
  ELIMINACION:   { color: '#EF4444', icono: <DeleteForever sx={{ fontSize: 15 }} /> },
  FIRMA:         { color: '#7C3AED', icono: <Draw sx={{ fontSize: 15 }} /> },
  APROBACION:    { color: '#059669', icono: <CheckCircle sx={{ fontSize: 15 }} /> },
  RECHAZO:       { color: '#EF4444', icono: <Cancel sx={{ fontSize: 15 }} /> },
  IMPRESION:     { color: '#6B7280', icono: <Print sx={{ fontSize: 15 }} /> },
  VERSION_NUEVA: { color: '#2563EB', icono: <LayersOutlined sx={{ fontSize: 15 }} /> },
}

export default function DMSAuditoria() {
  const [accion, setAccion] = useState('Todas')
  const [documento, setDocumento] = useState<number | ''>('')
  const [busqueda, setBusqueda] = useState('')

  const registros = useQuery({
    queryKey: ['dms', 'auditoria', accion, documento],
    queryFn: () => dmsApi.auditoria({
      accion: accion === 'Todas' ? undefined : accion,
      documento_id: documento || undefined,
      limit: 400,
    }),
  })
  const documentos = useQuery({
    queryKey: ['dms', 'documentos', 'todos'], queryFn: () => dmsApi.documentos(),
  })

  const doc = (id?: number | null) =>
    documentos.data?.find(d => d.id === id)

  const texto = busqueda.trim().toLowerCase()
  const lista = (registros.data ?? []).filter(r => !texto ||
    (r.detalle || '').toLowerCase().includes(texto) ||
    (r.ip_origen || '').includes(texto) ||
    (doc(r.documento_id)?.nombre || '').toLowerCase().includes(texto))

  // Lo sensible: descargas e impresiones de documentos confidenciales, y
  // eliminaciones. Es lo que se revisa cuando algo se filtró.
  const sensibles = useMemo(
    () => (registros.data ?? []).filter(
      r => ['DESCARGA', 'IMPRESION', 'ELIMINACION'].includes(r.accion)),
    [registros.data])

  const porAccion = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of registros.data ?? []) c[r.accion] = (c[r.accion] || 0) + 1
    return Object.entries(c).sort((a, b) => b[1] - a[1])
  }, [registros.data])

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Policy sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Rastro de auditoría
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Quién vio, descargó o cambió cada documento, y desde dónde
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Box sx={{ border: `1px solid ${alpha(DMS_COLOR, 0.3)}`, borderRadius: 2, p: 2 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                fontVariantNumeric: 'tabular-nums' }}>
                {registros.isLoading ? '·' : (registros.data?.length ?? 0)}
              </Typography>
              <Typography sx={{ fontSize: 11, color: DMS_COLOR, fontWeight: 600, mt: 0.25 }}>
                Registros en el período
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Box sx={{ border: `1px solid ${alpha('#EF4444', 0.3)}`, borderRadius: 2, p: 2 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                fontVariantNumeric: 'tabular-nums' }}>
                {sensibles.length}
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#EF4444', fontWeight: 600, mt: 0.25 }}>
                Descargas, impresiones y borrados
              </Typography>
            </Box>
          </Grid>
          {porAccion.slice(0, 2).map(([a, n]) => {
            const cfg = ACCIONES[a] ?? { color: '#94A3B8', icono: null }
            return (
              <Grid key={a} size={{ xs: 6, md: 3 }}>
                <Box sx={{
                  border: `1px solid ${alpha(cfg.color, 0.3)}`, borderRadius: 2, p: 2,
                  display: 'flex', gap: 1.5, alignItems: 'center',
                }}>
                  <Box sx={{
                    width: 38, height: 38, borderRadius: '10px',
                    bgcolor: alpha(cfg.color, 0.15), display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    '& svg': { color: cfg.color, fontSize: 20 },
                  }}>{cfg.icono}</Box>
                  <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                      fontVariantNumeric: 'tabular-nums' }}>{n}</Typography>
                    <Typography sx={{ fontSize: 11, color: cfg.color, fontWeight: 600 }}>
                      {legible(a)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )
          })}
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{
            display: 'flex', gap: 1, border: `1px solid ${BORDE}`, borderRadius: 2,
            px: 2, py: 1, alignItems: 'center', flex: 1, minWidth: 220,
            bgcolor: 'background.paper',
          }}>
            <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
            <InputBase placeholder="Buscar por documento, detalle o dirección de red…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              sx={{ flex: 1, fontSize: 13.5 }} />
          </Box>
          <TextField select size="small" label="Documento" sx={{ minWidth: 260 }}
            value={documento}
            onChange={e => setDocumento(Number(e.target.value) || '')}>
            <MenuItem value=""><em>Todos los documentos</em></MenuItem>
            {documentos.data?.slice(0, 300).map(d => (
              <MenuItem key={d.id} value={d.id}>{d.codigo} · {d.nombre}</MenuItem>
            ))}
          </TextField>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          {['Todas', ...Object.keys(ACCIONES)].map(a => (
            <Chip key={a} label={a === 'Todas' ? 'Todas' : legible(a)} size="small"
              onClick={() => setAccion(a)}
              sx={{
                cursor: 'pointer',
                bgcolor: accion === a ? (ACCIONES[a]?.color || DMS_COLOR) : '#F1F5F9',
                color: accion === a ? '#FFF' : 'text.secondary',
                fontWeight: accion === a ? 700 : 400,
              }} />
          ))}
        </Box>

        <Panel>
          <Estado cargando={registros.isLoading} error={registros.error}
            vacio={!lista.length}
            mensajeVacio={accion !== 'Todas' || documento || texto
              ? 'Ningún registro coincide con ese filtro'
              : 'Todavía no hay actividad registrada'}
            hint={accion !== 'Todas' || documento || texto
              ? 'Pruebe quitando alguno de los filtros.'
              : 'Cada vez que alguien abra o descargue un documento quedará aquí.'}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <Encabezados columnas={['Cuándo', 'Acción', '', 'Documento',
                  'Detalle', 'Desde', 'Navegador']} />
                <tbody>
                  {lista.slice(0, 300).map(r => {
                    const cfg = ACCIONES[r.accion] ?? { color: '#94A3B8', icono: null }
                    const d = doc(r.documento_id)
                    return (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>
                          {fechaHora(r.created_at)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip icon={cfg.icono ?? undefined} label={legible(r.accion)}
                            size="small" sx={{
                              bgcolor: alpha(cfg.color, 0.12), color: cfg.color,
                              fontSize: 9.5, fontWeight: 700,
                              '& .MuiChip-icon': { color: cfg.color },
                            }} />
                        </td>
                        <td style={{ padding: '8px 6px', width: 28 }}>
                          <IconoArchivo nombre={d?.nombre} size={16} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, maxWidth: 260 }}>
                          {d?.nombre ?? (r.documento_id ? `Documento #${r.documento_id}` : '—')}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', maxWidth: 320 }}>
                          {r.detalle || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11,
                                     fontFamily: 'ui-monospace, monospace', color: '#6B7280',
                                     whiteSpace: 'nowrap' }}>
                          {r.ip_origen || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: '#9CA3AF', maxWidth: 200 }}>
                          {r.user_agent ? (
                            <Tooltip title={r.user_agent}>
                              <span>{r.user_agent.split(')')[0].split('(').pop() || r.user_agent}</span>
                            </Tooltip>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
            {lista.length > 300 && (
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled',
                                textAlign: 'center', py: 1.5 }}>
                Se muestran los 300 más recientes de {lista.length}. Filtre por
                documento o por acción para ver los anteriores.
              </Typography>
            )}
          </Estado>
        </Panel>
      </Box>
    </Layout>
  )
}
