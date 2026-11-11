/**
 * Envío de informes de llantas por WhatsApp, Telegram o correo, con los
 * canales de TittanWare (un bot / número / remitente para todos los clientes).
 *
 *  - DestinatariosInformes: en Configuración, el administrador (o un perfil con
 *    el permiso «Destinatarios de informes») registra a quién se envía.
 *    Telegram no deja que un bot escriba primero: cada persona abre una vez su
 *    enlace del bot y queda vinculada sola.
 *  - BotonesEnviar: en cada informe de llantas, un botón por canal.
 */
import { useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import { ContentCopy, DeleteForever, Email, Send, Telegram, WhatsApp } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { mensajeDeError } from '@/utils/errorApi'

const B = '/eam/mensajeria'
export type Canal = 'WHATSAPP' | 'TELEGRAM' | 'CORREO'
const CANAL: Record<Canal, { nombre: string; color: string; icono: JSX.Element }> = {
  WHATSAPP: { nombre: 'WhatsApp', color: '#128C4A', icono: <WhatsApp /> },
  TELEGRAM: { nombre: 'Telegram', color: '#229ED9', icono: <Telegram /> },
  CORREO: { nombre: 'Correo', color: '#475569', icono: <Email /> },
}

interface Destinatario {
  id: number; alias: string; telefono?: string | null; correo?: string | null; telegram_usuario?: string | null
  activo: boolean; telegram_vinculado: boolean; enlace_telegram?: string | null
}
interface Estado { canales: Record<Canal, boolean>; bot_telegram?: string | null; gestiona: boolean }

export const useEstadoMensajeria = () => useQuery<Estado>({
  queryKey: ['mensajeria-estado'], queryFn: () => api.get(`${B}/estado`).then(r => r.data), staleTime: 60_000,
})
const useDestinatarios = () => useQuery<Destinatario[]>({
  queryKey: ['mensajeria-dest'], queryFn: () => api.get(`${B}/destinatarios`).then(r => r.data),
})
const tieneCanal = (d: Destinatario, c: Canal) =>
  c === 'WHATSAPP' ? !!d.telefono : c === 'CORREO' ? !!d.correo : d.telegram_vinculado

/* ── Configuración ─────────────────────────────────────────────────────────── */
export function DestinatariosInformes() {
  const qc = useQueryClient()
  const { data: estado } = useEstadoMensajeria()
  const { data: dests = [] } = useDestinatarios()
  const { data: envios = [] } = useQuery<any[]>({ queryKey: ['mensajeria-envios'], queryFn: () => api.get(`${B}/envios`).then(r => r.data), enabled: !!estado?.gestiona })
  const [nuevo, setNuevo] = useState({ alias: '', telefono: '', telegram_usuario: '', correo: '' })
  const refrescar = () => qc.invalidateQueries({ queryKey: ['mensajeria-dest'] })
  const crear = useMutation({
    mutationFn: () => api.post(`${B}/destinatarios`, nuevo),
    onSuccess: () => { setNuevo({ alias: '', telefono: '', telegram_usuario: '', correo: '' }); refrescar(); toast.success('Destinatario agregado') },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const borrar = useMutation({ mutationFn: (id: number) => api.delete(`${B}/destinatarios/${id}`), onSuccess: refrescar })
  if (!estado?.gestiona) return null
  return (
    <Card sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', mt: 3 }}>
      <CardContent>
        <Typography fontWeight={700} fontSize={15}>Destinatarios de informes de llantas</Typography>
        <Typography fontSize={12.5} color="text.secondary" mb={1.5}>
          A estas personas se les pueden enviar los informes de llantas por WhatsApp, Telegram o correo, desde TittanWare,
          TittanBot y la app TittanLite. Los envíos salen de los canales de TittanWare.
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
          {(Object.keys(CANAL) as Canal[]).map(c => (
            <Chip key={c} icon={CANAL[c].icono} label={`${CANAL[c].nombre}: ${estado.canales[c] ? 'activo' : 'próximamente'}`}
              color={estado.canales[c] ? 'success' : 'default'} variant={estado.canales[c] ? 'filled' : 'outlined'} />
          ))}
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1} mb={1.5}>
          <TextField size="small" label="Alias" value={nuevo.alias} onChange={e => setNuevo({ ...nuevo, alias: e.target.value })} />
          <TextField size="small" label="WhatsApp" placeholder="3001234567" value={nuevo.telefono} onChange={e => setNuevo({ ...nuevo, telefono: e.target.value })} />
          <TextField size="small" label="Usuario de Telegram" placeholder="@usuario" value={nuevo.telegram_usuario} onChange={e => setNuevo({ ...nuevo, telegram_usuario: e.target.value })} />
          <TextField size="small" label="Correo" value={nuevo.correo} onChange={e => setNuevo({ ...nuevo, correo: e.target.value })} />
          <Button variant="contained" disabled={!nuevo.alias.trim() || crear.isPending} onClick={() => crear.mutate()} sx={{ textTransform: 'none' }}>Agregar</Button>
        </Stack>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow>{['Alias', 'WhatsApp', 'Telegram', 'Correo', ''].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {dests.map(d => (
                <TableRow key={d.id}>
                  <TableCell sx={{ fontWeight: 700 }}>{d.alias}</TableCell>
                  <TableCell>{d.telefono ?? '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Typography fontSize={13}>{d.telegram_usuario ?? ''}</Typography>
                      {d.telegram_vinculado ? <Chip size="small" color="success" label="Vinculado" />
                        : d.enlace_telegram ? (
                          <Tooltip title="Mándele este enlace: al abrirlo y pulsar «Iniciar» queda vinculado solo">
                            <Button size="small" startIcon={<ContentCopy fontSize="small" />} sx={{ textTransform: 'none' }}
                              onClick={() => { navigator.clipboard.writeText(d.enlace_telegram!); toast.success('Enlace copiado') }}>Copiar enlace</Button>
                          </Tooltip>) : <Typography fontSize={12} color="text.secondary">Telegram próximamente</Typography>}
                    </Stack>
                  </TableCell>
                  <TableCell>{d.correo ?? '—'}</TableCell>
                  <TableCell align="right"><IconButton size="small" color="error" aria-label={`Quitar ${d.alias}`} onClick={() => borrar.mutate(d.id)}><DeleteForever fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
              {dests.length === 0 && <TableRow><TableCell colSpan={5}><Typography color="text.secondary" fontSize={13}>Sin destinatarios.</Typography></TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box>
        {envios.length > 0 && (
          <>
            <Typography fontWeight={700} mt={3} mb={1}>Últimos envíos</Typography>
            <Table size="small">
              <TableBody>
                {envios.slice(0, 10).map((e, i) => (
                  <TableRow key={i}>
                    <TableCell>{new Date(e.fecha).toLocaleString('es-CO')}</TableCell>
                    <TableCell>{e.alias}</TableCell>
                    <TableCell>{CANAL[e.canal as Canal]?.nombre ?? e.canal}</TableCell>
                    <TableCell>{e.informe}</TableCell>
                    <TableCell><Chip size="small" label={e.estado === 'ENVIADO' ? 'Enviado' : 'Error'} color={e.estado === 'ENVIADO' ? 'success' : 'error'} /></TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{e.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Enviar por un canal ───────────────────────────────────────────────────── */
function DialogoEnviar({ canal, informes, onCerrar }: { canal: Canal; informes: Record<string, unknown>[]; onCerrar: () => void }) {
  const { data: dests = [] } = useDestinatarios()
  const [elegidos, setElegidos] = useState<number[]>([])
  const [mensaje, setMensaje] = useState('')
  const disponibles = dests.filter(d => d.activo && tieneCanal(d, canal))
  const sinCanal = dests.filter(d => d.activo && !tieneCanal(d, canal))
  const enviar = useMutation({
    mutationFn: () => api.post(`${B}/enviar`, { canal, destinatario_ids: elegidos, informes, mensaje: mensaje || null }, { timeout: 600_000 }).then(r => r.data),
    onSuccess: (r: any) => {
      const fallos = r.resultados.filter((x: any) => x.estado !== 'ENVIADO')
      if (r.enviados) toast.success(`Enviado por ${CANAL[canal].nombre} (${r.enviados})`)
      fallos.forEach((x: any) => toast.error(`${x.alias}: ${x.error}`, { duration: 8000 }))
      if (!fallos.length) onCerrar()
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  return (
    <Dialog open onClose={onCerrar} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ color: CANAL[canal].color, display: 'flex' }}>{CANAL[canal].icono}</Box> Enviar por {CANAL[canal].nombre}
      </DialogTitle>
      <DialogContent dividers>
        {disponibles.length === 0 ? (
          <Alert severity="info">
            Nadie tiene {canal === 'WHATSAPP' ? 'número de WhatsApp' : canal === 'CORREO' ? 'correo' : 'Telegram vinculado'}.
            Se agrega en Configuración → Destinatarios de informes de llantas.
          </Alert>
        ) : (
          <Stack spacing={1.5}>
            <Box>
              {disponibles.map(d => (
                <FormControlLabel key={d.id} sx={{ display: 'flex' }}
                  control={<Checkbox checked={elegidos.includes(d.id)} onChange={e => setElegidos(e.target.checked ? [...elegidos, d.id] : elegidos.filter(x => x !== d.id))} />}
                  label={<Typography fontSize={14}>{d.alias} <Typography component="span" fontSize={12} color="text.secondary">
                    {canal === 'WHATSAPP' ? d.telefono : canal === 'CORREO' ? d.correo : d.telegram_usuario ?? ''}</Typography></Typography>} />
              ))}
            </Box>
            {sinCanal.length > 0 && <Typography fontSize={12} color="text.secondary">Sin este canal: {sinCanal.map(d => d.alias).join(', ')}</Typography>}
            <TextField size="small" label="Mensaje (opcional)" value={mensaje} onChange={e => setMensaje(e.target.value)} multiline minRows={2} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" startIcon={<Send />} disabled={!elegidos.length || enviar.isPending} onClick={() => enviar.mutate()}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: CANAL[canal].color, '&:hover': { bgcolor: CANAL[canal].color } }}>
          {enviar.isPending ? 'Enviando…' : 'Enviar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/** Un botón por canal para enviar el informe que se está viendo. */
export function BotonesEnviar({ informe }: { informe: Record<string, unknown> & { tipo: string } }) {
  const { data: estado } = useEstadoMensajeria()
  const [canal, setCanal] = useState<Canal | null>(null)
  return (
    <>
      <Stack direction="row" gap={0.75}>
        {(Object.keys(CANAL) as Canal[]).map(c => {
          const activo = !!estado?.canales[c]
          return (
            <Tooltip key={c} title={activo ? `Enviar por ${CANAL[c].nombre}` : `Envío por ${CANAL[c].nombre}: próximamente`}>
              <span>
                <IconButton aria-label={`Enviar por ${CANAL[c].nombre}`} disabled={!activo} onClick={() => setCanal(c)}
                  sx={{ border: '1px solid', borderColor: activo ? CANAL[c].color : 'divider', color: CANAL[c].color, borderRadius: 2 }}>
                  {CANAL[c].icono}
                </IconButton>
              </span>
            </Tooltip>
          )
        })}
      </Stack>
      {canal && <DialogoEnviar canal={canal} informes={[informe]} onCerrar={() => setCanal(null)} />}
    </>
  )
}
