/**
 * Las firmas: quién tiene que firmar qué, y quién ya firmó.
 *
 * FIRMAR DEJA HUELLA
 * Al firmar se guarda la hora, la dirección de red y el dispositivo. No es
 * adorno: una firma electrónica sin esos tres datos no se puede sostener ante
 * nadie que la discuta, y entonces no era una firma sino un botón.
 *
 * RECHAZAR EXIGE MOTIVO
 * Devolver un documento sin decir por qué obliga a quien lo redactó a adivinar,
 * y el ciclo se repite. El motivo es la mitad del valor del rechazo.
 */
import { useState } from 'react'
import {
  Box, Typography, Chip, alpha, Button, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Tabs, Tab,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Draw, CheckCircle, Cancel, Fingerprint } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { dmsApi, type Firma } from '@/api/dms'
import {
  BORDE, DMS_COLOR, COLOR_FIRMA, Encabezados, Estado, Panel,
  IconoArchivo, fechaHora, legible,
} from '@/components/dms/comunes'

export default function DMSFirmas() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [rechazando, setRechazando] = useState<Firma | null>(null)
  const [motivo, setMotivo] = useState('')

  const firmas = useQuery({
    queryKey: ['dms', 'firmas'],
    queryFn: () => dmsApi.firmas(),
  })
  const documentos = useQuery({
    queryKey: ['dms', 'documentos', 'todos'],
    queryFn: () => dmsApi.documentos(),
  })

  const doc = (id: number) =>
    documentos.data?.find(d => d.id === id)

  const refrescar = () => qc.invalidateQueries({ queryKey: ['dms'] })

  const firmar = useMutation({
    mutationFn: (f: Firma) => dmsApi.firmar(f.id),
    onSuccess: () => { toast.success('Documento firmado'); refrescar() },
    onError: (e: any) => toast.error(
      e?.response?.data?.detail ?? 'No se pudo firmar'),
  })

  const rechazar = useMutation({
    mutationFn: ({ f, obs }: { f: Firma; obs: string }) =>
      dmsApi.rechazarFirma(f.id, obs),
    onSuccess: () => {
      toast.success('Documento devuelto con observaciones')
      setRechazando(null); setMotivo(''); refrescar()
    },
    onError: (e: any) => toast.error(
      e?.response?.data?.detail ?? 'No se pudo rechazar'),
  })

  const todas = firmas.data ?? []
  const cuenta = (e: string) => todas.filter(f => f.estado === e).length
  const pendientes = todas.filter(f => f.estado === 'PENDIENTE')
    .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
  const lista = tab === 0 ? pendientes : todas

  // Cuánto lleva esperando la más vieja. Es la cifra que dice si el circuito de
  // firma está funcionando o si hay documentos varados hace semanas.
  const masVieja = pendientes[0]?.created_at
  const diasEspera = masVieja
    ? Math.round((Date.now() - new Date(masVieja).getTime()) / 86_400_000)
    : null

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Draw sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Firmas</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Qué está esperando una firma y desde cuándo
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Pendientes', value: cuenta('PENDIENTE'), color: '#F59E0B' },
            { label: 'Firmadas', value: cuenta('FIRMADO'), color: '#059669' },
            { label: 'Rechazadas', value: cuenta('RECHAZADO'), color: '#EF4444' },
            { label: 'La más vieja espera',
              value: diasEspera == null ? '—' : `${diasEspera} d`,
              color: diasEspera != null && diasEspera > 7 ? '#EF4444' : DMS_COLOR },
          ].map((s, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(s.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {firmas.isLoading ? '·' : s.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: s.color, fontWeight: 600, mt: 0.25 }}>
                  {s.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 2,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${DMS_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: DMS_COLOR },
        }}>
          <Tab label={`Por firmar${pendientes.length ? ` (${pendientes.length})` : ''}`} />
          <Tab label="Historial completo" />
        </Tabs>

        <Panel>
          <Estado cargando={firmas.isLoading} error={firmas.error}
            vacio={!lista.length}
            mensajeVacio={tab === 0 ? 'No hay nada esperando firma'
                                    : 'Todavía no se ha pedido ninguna firma'}
            hint={tab === 0 ? 'Todo lo que se envió a firmar ya se resolvió.' : undefined}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <Encabezados columnas={['', 'Documento', 'Tipo de firma', 'Turno',
                  'Estado', 'Pedida', 'Firmada', 'Desde dónde', '']} />
                <tbody>
                  {lista.map(f => {
                    const d = doc(f.documento_id)
                    const col = COLOR_FIRMA[f.estado] || '#94A3B8'
                    const espera = f.estado === 'PENDIENTE' && f.created_at
                      ? Math.round((Date.now() - new Date(f.created_at).getTime()) / 86_400_000)
                      : null
                    return (
                      <tr key={f.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                        <td style={{ padding: '8px 6px 8px 14px', width: 30 }}>
                          <IconoArchivo nombre={d?.nombre} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, maxWidth: 300 }}>
                          {d?.nombre ?? `Documento #${f.documento_id}`}
                          <Box component="div" sx={{ fontSize: 11, color: '#6B7280', fontWeight: 400 }}>
                            {d?.codigo}
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={legible(f.tipo_firma)} size="small" sx={{
                            bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR, fontSize: 9.5,
                          }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                          {f.orden ?? 1}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Chip label={legible(f.estado)} size="small" sx={{
                            bgcolor: alpha(col, 0.15), color: col,
                            fontSize: 9.5, fontWeight: 700,
                          }} />
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, whiteSpace: 'nowrap',
                                     color: espera != null && espera > 7 ? '#EF4444' : '#6B7280',
                                     fontWeight: espera != null && espera > 7 ? 700 : 400 }}>
                          {fechaHora(f.created_at)}
                          {espera != null && <Box component="div" sx={{ fontSize: 10.5 }}>
                            lleva {espera} día(s)
                          </Box>}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>
                          {fechaHora(f.fecha_firma)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>
                          {f.ip_firma ? (
                            <Tooltip title={`Dispositivo: ${f.dispositivo || 'no registrado'}`}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Fingerprint sx={{ fontSize: 14, color: '#059669' }} />
                                <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                                  {f.ip_firma}
                                </span>
                              </Box>
                            </Tooltip>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                          {f.estado === 'PENDIENTE' && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Button size="small" variant="contained"
                                startIcon={<CheckCircle sx={{ fontSize: 15 }} />}
                                disabled={firmar.isPending}
                                onClick={() => firmar.mutate(f)}
                                sx={{ textTransform: 'none', fontSize: 11.5 }}>
                                Firmar
                              </Button>
                              <Button size="small" color="error"
                                startIcon={<Cancel sx={{ fontSize: 15 }} />}
                                onClick={() => { setRechazando(f); setMotivo('') }}
                                sx={{ textTransform: 'none', fontSize: 11.5 }}>
                                Devolver
                              </Button>
                            </Box>
                          )}
                          {f.observaciones && f.estado !== 'PENDIENTE' && (
                            <Tooltip title={f.observaciones}>
                              <Typography sx={{ fontSize: 11, color: '#6B7280',
                                                maxWidth: 160 }} noWrap>
                                {f.observaciones}
                              </Typography>
                            </Tooltip>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </Estado>
        </Panel>

        <Dialog open={!!rechazando} onClose={() => setRechazando(null)}
          maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>¿Por qué se devuelve?</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
              Quien redactó el documento va a leer esto para saber qué corregir.
              Sin motivo, el documento vuelve igual y el ciclo se repite.
            </Typography>
            <TextField autoFocus fullWidth multiline minRows={3} size="small"
              label="Observaciones" value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Falta el anexo 2, la fecha de vigencia está mal…" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRechazando(null)} sx={{ textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button variant="contained" color="error"
              disabled={!motivo.trim() || rechazar.isPending}
              onClick={() => rechazando && rechazar.mutate({
                f: rechazando, obs: motivo.trim() })}
              sx={{ textTransform: 'none' }}>
              Devolver el documento
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
