/**
 * Envío de informes del CMMS por Telegram y WhatsApp Business.
 *
 *  - ConfigMensajeria: el administrador pone el bot de Telegram, las
 *    credenciales de WhatsApp Business y los destinatarios (alias y teléfono).
 *    Telegram no permite escribirle a un número: cada destinatario abre una vez
 *    su enlace del bot y queda vinculado.
 *  - BotonEnviarInforme: en cualquier informe, elegir destinatarios y canal y
 *    enviarlo. El informe se arma en el servidor con los mismos parámetros.
 */
import { useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { ContentCopy, DeleteForever, Send, Sync, Telegram, WhatsApp } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { mensajeDeError } from '@/utils/errorApi'

const B = '/eam/mensajeria'
const TG = '#229ED9'
const WA = '#128C4A'

interface Destinatario {
  id: number; alias: string; telefono?: string | null; telegram: boolean; whatsapp: boolean; activo: boolean
  telegram_vinculado: boolean; enlace_telegram?: string | null
}
interface Config {
  telegram: { configurado: boolean; token?: string | null; bot?: string | null }
  whatsapp: { configurado: boolean; token?: string | null; numero_id?: string | null; plantilla?: string | null; idioma: string }
}

const useDestinatarios = () => useQuery<Destinatario[]>({ queryKey: ['mensajeria-dest'], queryFn: () => api.get(`${B}/destinatarios`).then(r => r.data) })

/* ── Configuración (administrador) ─────────────────────────────────────────── */
export function ConfigMensajeria() {
  const qc = useQueryClient()
  const esAdmin = useAuthStore(s => s.user?.rol === 'ADMINISTRADOR')
  const { data: cfg } = useQuery<Config>({ queryKey: ['mensajeria-config'], queryFn: () => api.get(`${B}/config`).then(r => r.data), enabled: esAdmin })
  const { data: dests = [] } = useDestinatarios()
  const { data: envios = [] } = useQuery<any[]>({ queryKey: ['mensajeria-envios'], queryFn: () => api.get(`${B}/envios`).then(r => r.data), enabled: esAdmin })
  const [tg, setTg] = useState('')
  const [wa, setWa] = useState({ token: '', numero_id: '', plantilla: '', idioma: '' })
  const [nuevo, setNuevo] = useState({ alias: '', telefono: '' })
  const refrescar = () => { qc.invalidateQueries({ queryKey: ['mensajeria-config'] }); qc.invalidateQueries({ queryKey: ['mensajeria-dest'] }) }

  const guardar = useMutation({
    mutationFn: (cuerpo: Record<string, unknown>) => api.put(`${B}/config`, cuerpo, { timeout: 60_000 }),
    onSuccess: () => { toast.success('Mensajería guardada'); setTg(''); setWa({ token: '', numero_id: '', plantilla: '', idioma: '' }); refrescar() },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const crear = useMutation({
    mutationFn: () => api.post(`${B}/destinatarios`, { alias: nuevo.alias.trim(), telefono: nuevo.telefono.trim() || null }),
    onSuccess: () => { setNuevo({ alias: '', telefono: '' }); refrescar() },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const borrar = useMutation({ mutationFn: (id: number) => api.delete(`${B}/destinatarios/${id}`), onSuccess: refrescar })
  const alternar = useMutation({
    mutationFn: (d: Destinatario & Partial<Destinatario>) => api.put(`${B}/destinatarios/${d.id}`, d), onSuccess: refrescar,
  })
  const revisar = useMutation({
    mutationFn: () => api.post(`${B}/telegram/revisar`).then(r => r.data),
    onSuccess: (r: any) => { toast.success(r.vinculados.length ? `Vinculados: ${r.vinculados.join(', ')}` : 'Nadie nuevo abrió su enlace todavía'); refrescar() },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  if (!esAdmin) return null
  return (
    <Card sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', mt: 3 }}>
      <CardContent>
        <Typography fontWeight={700} fontSize={15}>Envío de informes por Telegram y WhatsApp</Typography>
        <Typography fontSize={12.5} color="text.secondary" mb={2}>
          Desde los informes del CMMS, TittanBot y TittanLite se pueden mandar los informes a estas personas. Los tokens se
          guardan cifrados y no se vuelven a mostrar.
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: 2, height: '100%' }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <Telegram sx={{ color: TG }} /><Typography fontWeight={700}>Telegram</Typography>
                <Chip size="small" label={cfg?.telegram.configurado ? `@${cfg.telegram.bot}` : 'Sin configurar'} color={cfg?.telegram.configurado ? 'success' : 'default'} />
              </Stack>
              <Typography fontSize={12} color="text.secondary" mb={1}>
                Cree un bot con @BotFather en Telegram y pegue aquí su token.
              </Typography>
              <Stack direction="row" gap={1}>
                <TextField size="small" fullWidth label={cfg?.telegram.token ? `Token (${cfg.telegram.token})` : 'Token del bot'} value={tg}
                  onChange={e => setTg(e.target.value)} type="password" autoComplete="off" />
                <Button variant="contained" disabled={!tg.trim() || guardar.isPending} onClick={() => guardar.mutate({ telegram_token: tg })}
                  sx={{ textTransform: 'none' }}>Guardar</Button>
              </Stack>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <WhatsApp sx={{ color: WA }} /><Typography fontWeight={700}>WhatsApp Business</Typography>
                <Chip size="small" label={cfg?.whatsapp.configurado ? 'Configurado' : 'Sin configurar'} color={cfg?.whatsapp.configurado ? 'success' : 'default'} />
              </Stack>
              <Typography fontSize={12} color="text.secondary" mb={1}>
                De la API de WhatsApp Cloud de Meta: token permanente, identificador del número y una plantilla aprobada con
                encabezado de documento (sin plantilla, Meta solo deja enviar a quien escribió en las últimas 24 horas).
              </Typography>
              <Grid container spacing={1}>
                <Grid size={{ xs: 12 }}><TextField size="small" fullWidth type="password" autoComplete="off"
                  label={cfg?.whatsapp.token ? `Token (${cfg.whatsapp.token})` : 'Token de acceso'} value={wa.token} onChange={e => setWa({ ...wa, token: e.target.value })} /></Grid>
                <Grid size={{ xs: 6 }}><TextField size="small" fullWidth label="Id del número" placeholder={cfg?.whatsapp.numero_id ?? ''}
                  value={wa.numero_id} onChange={e => setWa({ ...wa, numero_id: e.target.value })} /></Grid>
                <Grid size={{ xs: 4 }}><TextField size="small" fullWidth label="Plantilla" placeholder={cfg?.whatsapp.plantilla ?? ''}
                  value={wa.plantilla} onChange={e => setWa({ ...wa, plantilla: e.target.value })} /></Grid>
                <Grid size={{ xs: 2 }}><TextField size="small" fullWidth label="Idioma" placeholder={cfg?.whatsapp.idioma ?? 'es'}
                  value={wa.idioma} onChange={e => setWa({ ...wa, idioma: e.target.value })} /></Grid>
              </Grid>
              <Button variant="contained" sx={{ mt: 1, textTransform: 'none' }} disabled={guardar.isPending || !Object.values(wa).some(v => v.trim())}
                onClick={() => guardar.mutate({ whatsapp_token: wa.token || null, whatsapp_numero_id: wa.numero_id || null,
                  whatsapp_plantilla: wa.plantilla || null, whatsapp_idioma: wa.idioma || null })}>Guardar</Button>
            </Box>
          </Grid>
        </Grid>

        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1} mt={3} mb={1}>
          <Typography fontWeight={700} sx={{ flex: 1 }}>Destinatarios</Typography>
          {cfg?.telegram.configurado && (
            <Button size="small" startIcon={<Sync />} onClick={() => revisar.mutate()} disabled={revisar.isPending} sx={{ textTransform: 'none' }}>
              Revisar quién abrió su enlace de Telegram
            </Button>
          )}
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mb={1.5}>
          <TextField size="small" label="Alias" value={nuevo.alias} onChange={e => setNuevo({ ...nuevo, alias: e.target.value })} />
          <TextField size="small" label="Teléfono (WhatsApp)" placeholder="3001234567" value={nuevo.telefono}
            onChange={e => setNuevo({ ...nuevo, telefono: e.target.value })} />
          <Button variant="outlined" disabled={!nuevo.alias.trim() || crear.isPending} onClick={() => crear.mutate()} sx={{ textTransform: 'none' }}>Agregar</Button>
        </Stack>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow>{['Alias', 'Teléfono', 'Telegram', 'WhatsApp', ''].map(h => <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {dests.map(d => (
                <TableRow key={d.id}>
                  <TableCell sx={{ fontWeight: 700 }}>{d.alias}</TableCell>
                  <TableCell>{d.telefono ?? '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <Checkbox size="small" checked={d.telegram} onChange={e => alternar.mutate({ ...d, telegram: e.target.checked })} inputProps={{ 'aria-label': `Telegram para ${d.alias}` }} />
                      {d.telegram && (d.telegram_vinculado ? <Chip size="small" color="success" label="Vinculado" />
                        : d.enlace_telegram ? (
                          <Tooltip title="Copie este enlace y mándeselo: al abrirlo y pulsar «Iniciar» queda vinculado">
                            <Button size="small" startIcon={<ContentCopy fontSize="small" />} sx={{ textTransform: 'none' }}
                              onClick={() => { navigator.clipboard.writeText(d.enlace_telegram!); toast.success('Enlace copiado') }}>Copiar enlace</Button>
                          </Tooltip>) : <Typography fontSize={12} color="text.secondary">Configure el bot</Typography>)}
                    </Stack>
                  </TableCell>
                  <TableCell><Checkbox size="small" checked={d.whatsapp} onChange={e => alternar.mutate({ ...d, whatsapp: e.target.checked })} inputProps={{ 'aria-label': `WhatsApp para ${d.alias}` }} /></TableCell>
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
                    <TableCell>{e.canal === 'TELEGRAM' ? 'Telegram' : 'WhatsApp'}</TableCell>
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

/* ── Enviar un informe ─────────────────────────────────────────────────────── */
export function BotonEnviarInforme({ informe, etiqueta = 'Enviar' }: { informe: Record<string, unknown> & { tipo: string }; etiqueta?: string }) {
  const [abierto, setAbierto] = useState(false)
  const { data: dests = [] } = useDestinatarios()
  const [elegidos, setElegidos] = useState<number[]>([])
  const [canales, setCanales] = useState<string[]>(['TELEGRAM', 'WHATSAPP'])
  const [mensaje, setMensaje] = useState('')
  const enviar = useMutation({
    mutationFn: () => api.post(`${B}/enviar`, { destinatario_ids: elegidos, canales, informe, mensaje: mensaje || null }, { timeout: 600_000 }).then(r => r.data),
    onSuccess: (r: any) => {
      const fallidos = r.resultados.filter((x: any) => x.estado !== 'ENVIADO')
      if (r.enviados) toast.success(`${r.archivo}: enviado ${r.enviados} vez/veces`)
      fallidos.forEach((x: any) => toast.error(`${x.alias} por ${x.canal === 'TELEGRAM' ? 'Telegram' : 'WhatsApp'}: ${x.error}`, { duration: 8000 }))
      if (!fallidos.length) setAbierto(false)
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })
  const activos = dests.filter(d => d.activo)
  return (
    <>
      <Button variant="outlined" startIcon={<Send />} onClick={() => setAbierto(true)} sx={{ textTransform: 'none', fontWeight: 700 }}>{etiqueta}</Button>
      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Enviar informe</DialogTitle>
        <DialogContent dividers>
          {activos.length === 0 ? (
            <Alert severity="info">No hay destinatarios. El administrador los agrega en Configuración → Envío de informes.</Alert>
          ) : (
            <Stack spacing={1.5}>
              <Box>
                {activos.map(d => (
                  <FormControlLabel key={d.id} sx={{ display: 'flex' }}
                    control={<Checkbox checked={elegidos.includes(d.id)} onChange={e => setElegidos(e.target.checked ? [...elegidos, d.id] : elegidos.filter(x => x !== d.id))} />}
                    label={<Typography fontSize={14}>{d.alias}
                      <Typography component="span" fontSize={12} color="text.secondary">
                        {[d.telegram && (d.telegram_vinculado ? ' · Telegram' : ' · Telegram sin vincular'), d.whatsapp && d.telefono && ' · WhatsApp'].filter(Boolean).join('')}
                      </Typography></Typography>} />
                ))}
              </Box>
              <Stack direction="row" gap={1}>
                {[['TELEGRAM', 'Telegram', <Telegram key="t" sx={{ color: TG }} />], ['WHATSAPP', 'WhatsApp', <WhatsApp key="w" sx={{ color: WA }} />]].map(([k, t, i]) => (
                  <FormControlLabel key={k as string} control={<Checkbox checked={canales.includes(k as string)}
                    onChange={e => setCanales(e.target.checked ? [...canales, k as string] : canales.filter(x => x !== k))} />}
                    label={<Stack direction="row" alignItems="center" gap={0.5}>{i}{t}</Stack>} />
                ))}
              </Stack>
              <TextField size="small" label="Mensaje (opcional)" value={mensaje} onChange={e => setMensaje(e.target.value)} multiline minRows={2} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" startIcon={<Send />} disabled={!elegidos.length || !canales.length || enviar.isPending}
            onClick={() => enviar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>{enviar.isPending ? 'Enviando…' : 'Enviar'}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
