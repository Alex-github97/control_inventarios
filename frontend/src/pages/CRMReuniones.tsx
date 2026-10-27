/**
 * Reuniones con clientes: se graban (o se sube la grabación), se transcriben y
 * de ahí salen los compromisos, que alguien revisa antes de que existan.
 *
 * Esta es la lista y el alta; el trabajo de cada reunión está en CRMReunion.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography, alpha,
} from '@mui/material'
import { Mic, VideoCall, Add } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { crmApi } from '@/api/crm'
import { reunionesApi, type EstadoReunion } from '@/api/reuniones'
import { BORDE, CRM_COLOR, Estado, Panel, fechaHora } from '@/components/crm/comunes'
import { mensajeDeError } from '@/utils/errorApi'

export const COLOR_ESTADO_REUNION: Record<EstadoReunion, string> = {
  PROGRAMADA: '#64748B', EN_CURSO: '#DC2626', PROCESANDO: '#D97706',
  POR_REVISAR: '#7C3AED', CERRADA: '#059669', FALLIDA: '#B91C1C',
}
export const TEXTO_ESTADO_REUNION: Record<EstadoReunion, string> = {
  PROGRAMADA: 'Programada', EN_CURSO: 'Grabando', PROCESANDO: 'Procesando',
  POR_REVISAR: 'Por revisar', CERRADA: 'Cerrada', FALLIDA: 'Falló',
}

export function ChipEstadoReunion({ estado }: { estado: EstadoReunion }) {
  const c = COLOR_ESTADO_REUNION[estado]
  return <Chip size="small" label={TEXTO_ESTADO_REUNION[estado]}
    sx={{ bgcolor: alpha(c, 0.12), color: c, fontWeight: 700, fontSize: 11, height: 22 }} />
}

function NuevaReunion({ abierto, cerrar }: { abierto: boolean; cerrar: () => void }) {
  const navegar = useNavigate()
  const qc = useQueryClient()
  const [clienteId, setClienteId] = useState<number | ''>('')
  const [oportunidadId, setOportunidadId] = useState<number | ''>('')
  const [titulo, setTitulo] = useState('')
  const [origen, setOrigen] = useState<'PRESENCIAL' | 'VIRTUAL'>('PRESENCIAL')
  const [enlace, setEnlace] = useState('')
  const [contactos, setContactos] = useState<number[]>([])

  const clientes = useQuery({ queryKey: ['crm', 'clientes', 'Todos', ''], queryFn: () => crmApi.clientes() })
  const config = useQuery({ queryKey: ['crm', 'reuniones', 'config'], queryFn: reunionesApi.config })
  const listaContactos = useQuery({
    queryKey: ['crm', 'contactos', clienteId], enabled: !!clienteId,
    queryFn: () => crmApi.contactos(Number(clienteId)),
  })
  const oportunidades = useQuery({
    queryKey: ['crm', 'oportunidades', 'cliente', clienteId], enabled: !!clienteId,
    queryFn: () => crmApi.oportunidades({ cliente_id: Number(clienteId) }),
  })

  const crear = useMutation({
    mutationFn: () => reunionesApi.crear({
      cliente_id: Number(clienteId), oportunidad_id: oportunidadId ? Number(oportunidadId) : null,
      titulo: titulo.trim(), origen, enlace: origen === 'VIRTUAL' ? enlace.trim() || null : null,
      participantes: contactos.map(c => ({ contacto_id: c })),
    }),
    onSuccess: r => {
      qc.invalidateQueries({ queryKey: ['crm', 'reuniones'] })
      cerrar()
      navegar(`/crm/reuniones/${r.id}`)
    },
  })

  return (
    <Dialog open={abierto} onClose={cerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Nueva reunión</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        <TextField select label="Cliente" value={clienteId} required
          onChange={e => { setClienteId(Number(e.target.value)); setContactos([]); setOportunidadId('') }}>
          {(clientes.data ?? []).map(c => <MenuItem key={c.id} value={c.id}>{c.razon_social}</MenuItem>)}
        </TextField>
        <TextField label="Tema de la reunión" value={titulo} onChange={e => setTitulo(e.target.value)} required
          placeholder="Ej.: Revisión trimestral de servicio" />
        <TextField select label="Oportunidad (opcional)" value={oportunidadId} disabled={!clienteId}
          onChange={e => setOportunidadId(e.target.value === '' ? '' : Number(e.target.value))}>
          <MenuItem value="">Ninguna</MenuItem>
          {(oportunidades.data ?? []).map(o => <MenuItem key={o.id} value={o.id}>{o.nombre}</MenuItem>)}
        </TextField>
        <ToggleButtonGroup exclusive size="small" value={origen} onChange={(_, v) => v && setOrigen(v)}>
          <ToggleButton value="PRESENCIAL"><Mic sx={{ fontSize: 18, mr: 1 }} />Presencial</ToggleButton>
          <ToggleButton value="VIRTUAL"><VideoCall sx={{ fontSize: 18, mr: 1 }} />Virtual</ToggleButton>
        </ToggleButtonGroup>
        {origen === 'VIRTUAL' && (
          <>
            <TextField label="Enlace de la reunión" value={enlace} onChange={e => setEnlace(e.target.value)}
              placeholder="https://meet.google.com/… o https://teams.microsoft.com/…" />
            <Alert severity="info" sx={{ fontSize: 12.5 }}>
              {config.data?.bot_configurado
                ? 'Con el enlace, el bot entra solo a Google Meet o Microsoft Teams. En Zoom, grabe desde este equipo o suba la grabación.'
                : 'El bot de reuniones no está activo en este servidor. Grabe la reunión desde este equipo o suba la grabación cuando termine.'}
            </Alert>
          </>
        )}
        {!!clienteId && (
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>Quiénes asisten del cliente</Typography>
            {(listaContactos.data ?? []).length === 0 && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Este cliente no tiene contactos registrados.</Typography>
            )}
            {(listaContactos.data ?? []).map(c => (
              <FormControlLabel key={c.id} sx={{ display: 'block', ml: 0 }}
                control={<Checkbox size="small" checked={contactos.includes(c.id)}
                  onChange={e => setContactos(p => e.target.checked ? [...p, c.id] : p.filter(x => x !== c.id))} />}
                label={<Typography sx={{ fontSize: 13 }}>{c.nombre}{c.cargo ? ` · ${c.cargo}` : ''}</Typography>} />
            ))}
          </Box>
        )}
        {crear.error && <Alert severity="error">{mensajeDeError(crear.error)}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={cerrar}>Cancelar</Button>
        <Button variant="contained" disabled={!clienteId || titulo.trim().length < 3 || crear.isPending}
          onClick={() => crear.mutate()}>Crear reunión</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function CRMReuniones() {
  const navegar = useNavigate()
  const [nueva, setNueva] = useState(false)
  const [estado, setEstado] = useState<string>('Todas')
  const reuniones = useQuery({
    queryKey: ['crm', 'reuniones', estado],
    queryFn: () => reunionesApi.listar({ estado: estado === 'Todas' ? undefined : estado }),
    refetchInterval: q => (q.state.data ?? []).some(r => r.estado === 'PROCESANDO') ? 5000 : false,
  })
  const config = useQuery({ queryKey: ['crm', 'reuniones', 'config'], queryFn: reunionesApi.config })
  const vencidos = useQuery({
    queryKey: ['crm', 'reuniones', 'vencidos'],
    queryFn: () => reunionesApi.seguimiento({ solo_vencidos: true }),
  })

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #7C3AED 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mic sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Reuniones</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Se graban, se transcriben y los compromisos quedan con responsable y fecha
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setNueva(true)}>Nueva reunión</Button>
        </Box>

        {config.data && !config.data.ia_configurada && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            La transcripción no está configurada en este servidor. Puede grabar y subir reuniones; se procesarán
            cuando el administrador de la plataforma la active.
          </Alert>
        )}
        {(vencidos.data ?? []).length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Hay {vencidos.data!.length} compromisos vencidos sin cumplir.{' '}
            {vencidos.data!.slice(0, 3).map(c => c.descripcion).join(' · ')}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          {['Todas', 'POR_REVISAR', 'PROCESANDO', 'PROGRAMADA', 'CERRADA', 'FALLIDA'].map(e => (
            <Chip key={e} size="small" onClick={() => setEstado(e)}
              label={e === 'Todas' ? 'Todas' : TEXTO_ESTADO_REUNION[e as EstadoReunion]}
              sx={{ cursor: 'pointer', bgcolor: estado === e ? CRM_COLOR : '#F1F5F9',
                    color: estado === e ? '#FFF' : 'text.secondary', fontWeight: estado === e ? 700 : 400 }} />
          ))}
        </Box>

        <Panel sx={{ p: 2.5 }}>
          <Estado cargando={reuniones.isLoading} error={reuniones.error} vacio={!(reuniones.data ?? []).length}
            mensajeVacio="Todavía no hay reuniones"
            hint="Cree una antes de empezar: el sistema le pide confirmar que avisó que se graba.">
            {(reuniones.data ?? []).map(r => (
              <Box key={r.id} onClick={() => navegar(`/crm/reuniones/${r.id}`)} sx={{
                display: 'flex', gap: 1.75, p: 1.75, mb: 1.25, borderRadius: 1.5, cursor: 'pointer',
                border: `1px solid ${BORDE}`, bgcolor: '#F9FAFB', alignItems: 'center',
                '&:hover': { borderColor: CRM_COLOR },
              }}>
                {r.origen === 'VIRTUAL' ? <VideoCall sx={{ color: '#7C3AED' }} /> : <Mic sx={{ color: CRM_COLOR }} />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{r.titulo}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {r.cliente} · {fechaHora(r.fecha)}
                    {r.audio_duracion_s ? ` · ${Math.round(r.audio_duracion_s / 60)} min` : ''}
                  </Typography>
                  {r.estado === 'FALLIDA' && r.motivo_falla && (
                    <Typography sx={{ fontSize: 11.5, color: '#B91C1C' }}>{r.motivo_falla}</Typography>
                  )}
                </Box>
                <ChipEstadoReunion estado={r.estado} />
              </Box>
            ))}
          </Estado>
        </Panel>
        <NuevaReunion abierto={nueva} cerrar={() => setNueva(false)} />
      </Box>
    </Layout>
  )
}
