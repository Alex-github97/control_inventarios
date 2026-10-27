/**
 * Una reunión, de principio a fin: aviso → grabación (o carga) → transcripción
 * → revisión de lo que se propuso → cierre.
 *
 * La revisión es obligatoria (spec crm/compromisos-reunion): lo que propone el
 * modelo no crea nada hasta que alguien lo aprueba, y cada punto muestra la
 * frase de la reunión que lo respalda para poder comprobarlo.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, IconButton, LinearProgress,
  MenuItem, Switch, TextField, Tooltip, Typography, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  ArrowBack, CheckCircle, Close, CloudUpload, DeleteForever, Edit, FiberManualRecord, Refresh, SmartToy, Stop,
  WifiOff,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import {
  reunionesApi, minutoTexto, TEXTO_BOT, type CompromisoReunion, type ReunionDetalle, type TramoReunion,
} from '@/api/reuniones'
import { BORDE, CRM_COLOR, Panel, fechaHora } from '@/components/crm/comunes'
import { useAuthStore } from '@/store/authStore'
import { mensajeDeError } from '@/utils/errorApi'
import { GrabadorReunion, TextoVivo, type EstadoGrabador } from '@/utils/grabadorReunion'
import { ChipEstadoReunion } from './CRMReuniones'

const COLOR_TIPO: Record<string, string> = { COMPROMISO: CRM_COLOR, ACUERDO: '#059669', RIESGO: '#B91C1C' }
const TEXTO_TIPO: Record<string, string> = { COMPROMISO: 'Compromisos', ACUERDO: 'Acuerdos', RIESGO: 'Riesgos' }

/* ── Aviso y captura ───────────────────────────────────────────────────────── */
function Captura({ r, recargar }: { r: ReunionDetalle; recargar: () => void }) {
  const config = useQuery({ queryKey: ['crm', 'reuniones', 'config'], queryFn: reunionesApi.config })
  const [avise, setAvise] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estadoG, setEstadoG] = useState<EstadoGrabador>({ grabando: false, segundos: 0, pendientes: 0, sinRed: false })
  const [vivo, setVivo] = useState(false)
  const [lineasVivo, setLineasVivo] = useState<string[]>([])
  const [avisoVivo, setAvisoVivo] = useState<string | null>(null)
  const [deteniendo, setDeteniendo] = useState(false)
  const [progreso, setProgreso] = useState<number | null>(null)
  const [enviandoBot, setEnviandoBot] = useState(false)
  const grabador = useRef<GrabadorReunion>()
  const textoVivo = useRef<TextoVivo>()
  const stream = useRef<MediaStream>()
  const archivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    grabador.current = new GrabadorReunion(r.id, setEstadoG)
    // Si la página se recargó mientras grababa, lo que quedó en el navegador se sube.
    if (r.estado === 'EN_CURSO') void grabador.current.recuperar()
    return () => { grabador.current?.liberar(); textoVivo.current?.cerrar() }
  }, [r.id])   // eslint-disable-line react-hooks/exhaustive-deps

  const confirmar = useMutation({ mutationFn: () => reunionesApi.confirmarAviso(r.id), onSuccess: recargar,
                                  onError: e => setError(mensajeDeError(e)) })

  const grabar = async () => {
    setError(null)
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      setError('El navegador no dio acceso al micrófono, así que no se puede grabar. Revise el permiso del sitio.')
      return
    }
    try {
      if (r.estado === 'PROGRAMADA') await reunionesApi.iniciar(r.id)
      await grabador.current!.iniciar(stream.current)
      if (vivo) abrirVivo()
      recargar()
    } catch (e) {
      stream.current.getTracks().forEach(t => t.stop())
      setError(mensajeDeError(e))
    }
  }

  const abrirVivo = () => {
    if (!stream.current) return
    setAvisoVivo(null)
    textoVivo.current = new TextoVivo(setLineasVivo, motivo => { setAvisoVivo(motivo); setVivo(false) })
    void textoVivo.current.conectar(stream.current)
  }

  const cambiarVivo = (on: boolean) => {
    setVivo(on)
    if (!estadoG.grabando) return
    if (on) abrirVivo()
    else textoVivo.current?.cerrar()
  }

  const detener = async () => {
    setDeteniendo(true); setError(null)
    textoVivo.current?.cerrar()
    try {
      await grabador.current!.detener()
      recargar()
    } catch (e) {
      setError(mensajeDeError(e, (e as Error)?.message))
    } finally {
      setDeteniendo(false)
    }
  }

  const subir = async (f: File) => {
    setError(null); setProgreso(0)
    try {
      await reunionesApi.subirArchivo(r.id, f, setProgreso)
      recargar()
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setProgreso(null)
    }
  }

  if (r.estado === 'PROGRAMADA' && !r.aviso_confirmado) {
    return (
      <Panel sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 800, mb: 1 }}>Antes de grabar</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
          Lea este aviso a los asistentes. Queda constancia de que lo confirmó usted, con fecha y hora.
        </Typography>
        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha(CRM_COLOR, 0.06), border: `1px solid ${alpha(CRM_COLOR, 0.25)}`,
                   fontSize: 13.5, mb: 1.5 }}>
          {config.data?.aviso_texto ?? '…'}
        </Box>
        <FormControlLabel control={<Checkbox checked={avise} onChange={e => setAvise(e.target.checked)} />}
          label={<Typography sx={{ fontSize: 13 }}>Avisé a los asistentes que la reunión se graba y se transcribe</Typography>} />
        <Box sx={{ mt: 1 }}>
          <Button variant="contained" disabled={!avise || confirmar.isPending} onClick={() => confirmar.mutate()}>
            Confirmar aviso
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </Panel>
    )
  }

  const enCurso = r.estado === 'EN_CURSO'
  const conBot = r.origen === 'VIRTUAL' && !!r.enlace && !!config.data?.bot_configurado && r.estado === 'PROGRAMADA'
  return (
    <Panel sx={{ p: 2.5 }}>
      {conBot && (
        <Box sx={{ mb: 2, pb: 2, borderBottom: `1px solid ${BORDE}` }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>
            El bot entra a la reunión con el nombre «Asistente TittanWare — grabando». Admítalo desde la sala de espera.
          </Typography>
          <Button variant="contained" startIcon={<SmartToy />} disabled={enviandoBot}
            onClick={async () => {
              setEnviandoBot(true); setError(null)
              try { await reunionesApi.enviarBot(r.id); recargar() } catch (e) { setError(mensajeDeError(e)) }
              finally { setEnviandoBot(false) }
            }}>
            Enviar el bot a la reunión
          </Button>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>O grabe desde este equipo:</Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {estadoG.grabando ? (
          <>
            <FiberManualRecord sx={{ color: '#DC2626', animation: 'pulse 1.2s infinite',
              '@keyframes pulse': { '50%': { opacity: 0.3 } } }} />
            <Typography sx={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
              {minutoTexto(estadoG.segundos)}
            </Typography>
            <Button variant="contained" color="error" startIcon={deteniendo ? <CircularProgress size={16} color="inherit" /> : <Stop />}
              disabled={deteniendo} onClick={detener}>
              Terminar y procesar
            </Button>
          </>
        ) : (
          <>
            <Button variant="contained" color="error" startIcon={<FiberManualRecord />} onClick={grabar}
              disabled={progreso !== null}>
              {enCurso ? 'Continuar grabación' : 'Grabar aquí'}
            </Button>
            {enCurso && (
              <Button variant="outlined" startIcon={<Stop />} disabled={deteniendo} onClick={detener}>
                Terminar con lo grabado
              </Button>
            )}
            {!enCurso && (
              <>
                <Button variant="outlined" startIcon={<CloudUpload />} disabled={progreso !== null}
                  onClick={() => archivo.current?.click()}>
                  Subir una grabación
                </Button>
                <input ref={archivo} type="file" hidden accept=".mp3,.mp4,.m4a,.wav,.webm,audio/*,video/mp4"
                  onChange={e => { const f = e.target.files?.[0]; if (f) void subir(f); e.target.value = '' }} />
              </>
            )}
          </>
        )}
        <FormControlLabel sx={{ ml: 'auto' }}
          control={<Switch size="small" checked={vivo} onChange={e => cambiarVivo(e.target.checked)} />}
          label={<Typography sx={{ fontSize: 12.5 }}>Texto en vivo</Typography>} />
      </Box>
      {(estadoG.pendientes > 0 || estadoG.sinRed) && (
        <Alert severity={estadoG.sinRed ? 'warning' : 'info'} icon={estadoG.sinRed ? <WifiOff /> : undefined} sx={{ mt: 1.5 }}>
          {estadoG.sinRed
            ? `Sin conexión: ${estadoG.pendientes} trozos guardados en este equipo. Se envían solos al volver la red; no cierre el navegador.`
            : `Enviando ${estadoG.pendientes} trozos…`}
        </Alert>
      )}
      {progreso !== null && <Box sx={{ mt: 1.5 }}><LinearProgress variant="determinate" value={progreso * 100} />
        <Typography sx={{ fontSize: 12, mt: 0.5 }}>Subiendo la grabación… {Math.round(progreso * 100)} %</Typography></Box>}
      {avisoVivo && <Alert severity="info" sx={{ mt: 1.5 }}>El texto en vivo se apagó ({avisoVivo}). La grabación sigue normal.</Alert>}
      {vivo && estadoG.grabando && (
        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: '#0F172A', color: '#E2E8F0', fontSize: 13.5,
                   maxHeight: 220, overflow: 'auto', lineHeight: 1.6 }}>
          {lineasVivo.length ? lineasVivo.map((l, i) => <div key={i}>{l}</div>)
            : <span style={{ opacity: 0.6 }}>Escuchando…</span>}
        </Box>
      )}
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
    </Panel>
  )
}

/* ── Bot en la reunión ─────────────────────────────────────────────────────── */
function BotEnCurso({ r, recargar }: { r: ReunionDetalle; recargar: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const retirar = useMutation({ mutationFn: () => reunionesApi.retirarBot(r.id), onSuccess: recargar,
                                onError: e => setError(mensajeDeError(e)) })
  const estado = r.bot?.estado ?? 'requested'
  const esperando = estado === 'awaiting_admission' || estado === 'needs_help'
  return (
    <Panel sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <SmartToy sx={{ color: estado === 'active' ? '#DC2626' : '#64748B' }} />
        <Typography sx={{ fontWeight: 700, flex: 1 }}>{TEXTO_BOT[estado] ?? estado}</Typography>
        <Button variant="outlined" startIcon={<Stop />} disabled={retirar.isPending || estado === 'stopping'}
          onClick={() => retirar.mutate()}>
          Retirar el bot
        </Button>
      </Box>
      {estado === 'active' && <LinearProgress color="error" sx={{ mt: 1.5 }} />}
      {esperando && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          Si nadie lo admite, el bot se retira solo a los pocos minutos y la reunión queda marcada para grabarla de otra forma.
        </Alert>
      )}
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>
        Cuando la reunión termine, el bot entrega la grabación y empieza la transcripción. Puede cerrar esta pantalla.
      </Typography>
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
    </Panel>
  )
}

/* ── Transcripción ─────────────────────────────────────────────────────────── */
function Transcripcion({ r, resaltado, puedeEditar, recargar }: {
  r: ReunionDetalle; resaltado: number | null; puedeEditar: boolean; recargar: () => void
}) {
  const [editando, setEditando] = useState<number | null>(null)
  const [texto, setTexto] = useState('')
  const refs = useRef<Record<number, HTMLDivElement | null>>({})
  const guardar = useMutation({
    mutationFn: (c: { id: number; texto?: string; participante_id?: number; quitar_participante?: boolean }) =>
      reunionesApi.editarTramo(c.id, c),
    onSuccess: () => { setEditando(null); recargar() },
  })
  useEffect(() => {
    if (resaltado != null) refs.current[resaltado]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [resaltado])

  return (
    <Panel sx={{ p: 2, maxHeight: '75vh', overflow: 'auto' }}>
      <Typography sx={{ fontWeight: 800, mb: 1 }}>Transcripción</Typography>
      {r.tramos.map((t: TramoReunion) => (
        <Box key={t.id} ref={el => { refs.current[t.id] = el as HTMLDivElement | null }} sx={{
          display: 'flex', gap: 1.25, py: 1, borderBottom: `1px solid ${BORDE}`,
          bgcolor: resaltado === t.id ? alpha('#FACC15', 0.25) : 'transparent', transition: 'background .3s',
        }}>
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled', width: 48, flexShrink: 0, pt: 0.4,
                            fontVariantNumeric: 'tabular-nums' }}>{minutoTexto(t.inicio_s)}</Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <TextField select variant="standard" size="small" value={t.participante_id ?? ''} disabled={!puedeEditar}
              onChange={e => guardar.mutate(e.target.value === ''
                ? { id: t.id, quitar_participante: true } : { id: t.id, participante_id: Number(e.target.value) })}
              sx={{ minWidth: 140, mb: 0.25, '& .MuiInputBase-input': { fontSize: 11.5, fontWeight: 700, py: 0 } }}>
              <MenuItem value=""><em>Sin asignar</em></MenuItem>
              {r.participantes.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
            </TextField>
            {editando === t.id ? (
              <Box>
                <TextField fullWidth multiline size="small" value={texto} onChange={e => setTexto(e.target.value)} autoFocus />
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Button size="small" variant="contained" onClick={() => guardar.mutate({ id: t.id, texto })}>Guardar</Button>
                  <Button size="small" onClick={() => setEditando(null)}>Cancelar</Button>
                </Box>
              </Box>
            ) : (
              <Typography sx={{ fontSize: 13.5, lineHeight: 1.55 }}>
                {t.texto}
                {puedeEditar && (
                  <IconButton size="small" sx={{ ml: 0.5, p: 0.25 }} onClick={() => { setEditando(t.id); setTexto(t.texto) }}>
                    <Edit sx={{ fontSize: 14 }} />
                  </IconButton>
                )}
              </Typography>
            )}
            {t.texto_original && (
              <Tooltip title={`Transcripción original: «${t.texto_original}»`}>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled', cursor: 'help' }}>corregido</Typography>
              </Tooltip>
            )}
          </Box>
        </Box>
      ))}
    </Panel>
  )
}

/* ── Revisión ──────────────────────────────────────────────────────────────── */
function Punto({ c, r, alVer, recargar }: {
  c: CompromisoReunion; r: ReunionDetalle; alVer: (seg?: number | null) => void; recargar: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const accion = useMutation({
    mutationFn: (f: () => Promise<unknown>) => f(),
    onSuccess: () => { setError(null); recargar() },
    onError: e => setError(mensajeDeError(e)),
  })
  const editar = (cambios: Parameters<typeof reunionesApi.editarCompromiso>[1]) =>
    accion.mutate(() => reunionesApi.editarCompromiso(c.id, cambios))
  const propuesto = c.estado === 'PROPUESTO'
  const color = COLOR_TIPO[c.tipo]

  return (
    <Box data-punto={c.id} sx={{ p: 1.5, mb: 1, borderRadius: 1.5, border: `1px solid ${propuesto ? alpha(color, 0.4) : BORDE}`,
               bgcolor: c.estado === 'DESCARTADO' ? '#F8FAFC' : 'background.paper',
               opacity: c.estado === 'DESCARTADO' ? 0.6 : 1 }}>
      {propuesto ? (
        <TextField fullWidth variant="standard" defaultValue={c.descripcion}
          onBlur={e => e.target.value.trim() && e.target.value !== c.descripcion && editar({ descripcion: e.target.value })}
          sx={{ '& input': { fontSize: 13.5, fontWeight: 700 } }} />
      ) : (
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, textDecoration: c.estado === 'DESCARTADO' ? 'line-through' : 'none' }}>
          {c.descripcion}
        </Typography>
      )}
      {c.tipo === 'COMPROMISO' && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <TextField select size="small" label="Responsable" value={c.participante_id ?? ''} disabled={!propuesto}
            onChange={e => editar({ participante_id: Number(e.target.value) })} sx={{ minWidth: 170 }}>
            <MenuItem value="" disabled><em>{c.responsable_nombre ? `«${c.responsable_nombre}» (por asignar)` : 'Por asignar'}</em></MenuItem>
            {r.participantes.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="De quién" value={c.lado ?? ''} disabled={!propuesto}
            onChange={e => editar({ lado: e.target.value })} sx={{ minWidth: 120 }}>
            <MenuItem value="NUESTRO">Nuestro</MenuItem>
            <MenuItem value="CLIENTE">Del cliente</MenuItem>
          </TextField>
          <TextField size="small" type="date" label="Fecha límite" InputLabelProps={{ shrink: true }}
            value={c.fecha_limite ?? ''} disabled={!propuesto}
            onChange={e => editar(e.target.value ? { fecha_limite: e.target.value } : { quitar_fecha: true })}
            helperText={!c.fecha_limite && propuesto ? 'No definida' : undefined} />
        </Box>
      )}
      <Box onClick={() => alVer(c.minuto_s)} sx={{ mt: 1, fontSize: 12, color: 'text.secondary', cursor: 'pointer',
                                                   fontStyle: 'italic', '&:hover': { color: CRM_COLOR } }}>
        «{c.cita}» · min {minutoTexto(c.minuto_s)}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
        {propuesto ? (
          <>
            <Button size="small" variant="contained" startIcon={<CheckCircle />} disabled={accion.isPending}
              onClick={() => accion.mutate(() => reunionesApi.aprobar(c.id))}>Aprobar</Button>
            <Button size="small" startIcon={<Close />} disabled={accion.isPending}
              onClick={() => accion.mutate(() => reunionesApi.descartar(c.id))}>Descartar</Button>
          </>
        ) : (
          <Chip size="small" label={{ APROBADO: c.actividad_id ? 'Aprobado · actividad creada' : 'Aprobado',
                                      DESCARTADO: 'Descartado', CUMPLIDO: 'Cumplido', PROPUESTO: '' }[c.estado]}
            sx={{ fontSize: 11, height: 22, bgcolor: c.vencido ? alpha('#B91C1C', 0.12) : undefined,
                  color: c.vencido ? '#B91C1C' : undefined }} />
        )}
        {c.estado === 'APROBADO' && c.tipo === 'COMPROMISO' && (
          <Button size="small" onClick={() => accion.mutate(() => reunionesApi.cumplido(c.id))}>
            {c.vencido ? 'Vencido · marcar cumplido' : 'Marcar cumplido'}
          </Button>
        )}
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  )
}

function Revision({ r, alVer, recargar }: { r: ReunionDetalle; alVer: (seg?: number | null) => void; recargar: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const cerrar = useMutation({ mutationFn: () => reunionesApi.cerrar(r.id), onSuccess: recargar,
                               onError: e => setError(mensajeDeError(e)) })
  const reextraer = useMutation({ mutationFn: () => reunionesApi.reextraer(r.id), onSuccess: recargar,
                                  onError: e => setError(mensajeDeError(e)) })
  const pendientes = r.compromisos.filter(c => c.estado === 'PROPUESTO').length
  return (
    <Box>
      <Panel sx={{ p: 2, mb: 2 }}>
        <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Resumen</Typography>
        <Typography sx={{ fontSize: 13.5, lineHeight: 1.6 }}>{r.resumen || '—'}</Typography>
      </Panel>
      {(['COMPROMISO', 'ACUERDO', 'RIESGO'] as const).map(tipo => {
        const items = r.compromisos.filter(c => c.tipo === tipo)
        return (
          <Box key={tipo} sx={{ mb: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 13, color: COLOR_TIPO[tipo], mb: 1 }}>
              {TEXTO_TIPO[tipo]} ({items.length})
            </Typography>
            {items.length === 0 && <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Ninguno.</Typography>}
            {items.map(c => <Punto key={c.id} c={c} r={r} alVer={alVer} recargar={recargar} />)}
          </Box>
        )
      })}
      {r.estado === 'POR_REVISAR' && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="contained" color="success" disabled={pendientes > 0 || cerrar.isPending} onClick={() => cerrar.mutate()}>
            Cerrar revisión
          </Button>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {pendientes > 0 ? `Faltan ${pendientes} puntos por aprobar o descartar.`
              : 'Al cerrar, la reunión queda en los contactos del cliente con su resumen.'}
          </Typography>
          <Button size="small" startIcon={<Refresh />} sx={{ ml: 'auto' }} disabled={reextraer.isPending}
            onClick={() => reextraer.mutate()}>Volver a proponer</Button>
        </Box>
      )}
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
    </Box>
  )
}

/* ── Página ────────────────────────────────────────────────────────────────── */
export default function CRMReunion() {
  const { id } = useParams()
  const rid = Number(id)
  const navegar = useNavigate()
  const qc = useQueryClient()
  const usuario = useAuthStore(s => s.user)
  const esAdmin = String((usuario as any)?.rol ?? '').toUpperCase() === 'ADMINISTRADOR'
  const [resaltado, setResaltado] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['crm', 'reuniones', 'detalle', rid],
    queryFn: () => reunionesApi.ver(rid),
    refetchInterval: x => x.state.data?.estado === 'PROCESANDO' || (x.state.data?.estado === 'EN_CURSO' && x.state.data?.bot) ? 4000 : false,
  })
  const recargar = () => {
    qc.invalidateQueries({ queryKey: ['crm', 'reuniones'] })
  }
  const reintentar = useMutation({ mutationFn: () => reunionesApi.reintentar(rid), onSuccess: recargar,
                                   onError: e => setError(mensajeDeError(e)) })
  const borrar = useMutation({ mutationFn: () => reunionesApi.borrarAudio(rid), onSuccess: recargar,
                               onError: e => setError(mensajeDeError(e)) })

  const r = q.data
  const verMinuto = (seg?: number | null) => {
    if (seg == null || !r) return
    const t = [...r.tramos].reverse().find(x => x.inicio_s <= seg + 0.01)
    if (t) { setResaltado(t.id); setTimeout(() => setResaltado(null), 2500) }
  }
  const conTranscripcion = !!r && r.tramos.length > 0 && ['POR_REVISAR', 'CERRADA', 'FALLIDA'].includes(r.estado)
  const aprobados = useMemo(() => r?.compromisos.filter(c => c.estado !== 'PROPUESTO').length ?? 0, [r])

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <IconButton onClick={() => navegar('/crm/reuniones')}><ArrowBack /></IconButton>
          {r && (
            <>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 20, fontWeight: 800 }}>{r.titulo}</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {r.cliente} · {fechaHora(r.fecha)} · {r.origen === 'VIRTUAL' ? 'Virtual' : 'Presencial'}
                  {r.participantes.length ? ` · ${r.participantes.map(p => p.nombre).join(', ')}` : ''}
                </Typography>
              </Box>
              <ChipEstadoReunion estado={r.estado} />
            </>
          )}
        </Box>
        {q.isLoading && <CircularProgress />}
        {q.error && <Alert severity="error">{mensajeDeError(q.error)}</Alert>}
        {r && (
          <>
            {r.estado === 'EN_CURSO' && r.bot ? <BotEnCurso r={r} recargar={recargar} />
              : ['PROGRAMADA', 'EN_CURSO'].includes(r.estado) && <Captura r={r} recargar={recargar} />}
            {r.estado === 'PROCESANDO' && (
              <Panel sx={{ p: 2.5 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Transcribiendo y buscando compromisos…</Typography>
                <LinearProgress />
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 1 }}>
                  Puede seguir trabajando: esta pantalla se actualiza sola.
                </Typography>
              </Panel>
            )}
            {r.estado === 'FALLIDA' && (
              <Alert severity="error" sx={{ mb: 2 }} action={
                <Button color="inherit" size="small" startIcon={<Refresh />} disabled={reintentar.isPending}
                  onClick={() => reintentar.mutate()}>Reintentar</Button>}>
                {r.motivo_falla}
              </Alert>
            )}
            {conTranscripcion && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Transcripcion r={r} resaltado={resaltado} puedeEditar={r.estado !== 'CERRADA'} recargar={recargar} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  {r.estado !== 'FALLIDA' && <Revision r={r} alVer={verMinuto} recargar={recargar} />}
                </Grid>
              </Grid>
            )}
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {r.audio_borrado_en ? `Audio borrado el ${fechaHora(r.audio_borrado_en)}.`
                  : r.tiene_audio ? `Audio guardado${r.audio_duracion_s ? ` (${minutoTexto(r.audio_duracion_s)})` : ''}; se borra al vencer el plazo de retención.`
                  : ''}
                {r.aviso_confirmado_en ? ` Aviso de grabación confirmado el ${fechaHora(r.aviso_confirmado_en)}.` : ''}
                {r.estado === 'CERRADA' ? ` Revisión cerrada: ${aprobados} puntos revisados.` : ''}
              </Typography>
              {esAdmin && r.tiene_audio && r.estado !== 'PROCESANDO' && (
                <Button size="small" color="error" startIcon={<DeleteForever />} disabled={borrar.isPending}
                  onClick={() => { if (confirm('¿Borrar el audio de esta reunión ahora? La transcripción se conserva.')) borrar.mutate() }}>
                  Borrar audio
                </Button>
              )}
            </Box>
            {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
          </>
        )}
      </Box>
    </Layout>
  )
}
