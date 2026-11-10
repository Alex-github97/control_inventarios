/**
 * TittanBot: la burbuja abajo a la derecha que abre el asistente en un pop-up.
 *
 * Va montado una sola vez en la raíz de la aplicación —no en cada página— para
 * que la conversación siga abierta al navegar. Solo aparece para quien tiene el
 * permiso «TittanBot» en su perfil (o es administrador).
 *
 * Las acciones (crear una OT, abrir un ticket) llegan como una tarjeta con
 * «Confirmar / Cancelar»: el servidor no las ejecuta hasta ese clic, y ejecuta
 * lo que guardó, no lo que mande esta pantalla.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Box, Button, Chip, CircularProgress, Fab, IconButton, InputBase, Paper, Stack, Tooltip,
  Typography, useMediaQuery, Zoom, alpha,
} from '@mui/material'
import {
  AutoAwesomeRounded, CloseRounded, SendRounded, AddCommentOutlined, FileDownloadOutlined,
  CheckRounded, BlockRounded,
} from '@mui/icons-material'
import { useLocation } from 'react-router-dom'
import { create } from 'zustand'
import { useAuthStore } from '@/store/authStore'
import { ACENTO, PALETA } from '@/config/marca'
import { tittanbotApi, type AccionPendiente, type Descarga } from '@/api/tittanbot'
import { mensajeDeError } from '@/utils/errorApi'

interface Mensaje {
  rol: 'usuario' | 'asistente'
  texto: string
  accion?: AccionPendiente
  resuelta?: 'si' | 'no'
  descargas?: Descarga[]
  error?: boolean
}

/** La conversación vive fuera del componente: cerrar el pop-up o cambiar de
 *  pantalla no la borra. Se reinicia con «Nueva conversación» o al salir. */
const useChat = create<{
  abierto: boolean; conversacion: number | null; mensajes: Mensaje[]
  set: (p: Partial<{ abierto: boolean; conversacion: number | null; mensajes: Mensaje[] }>) => void
}>(set => ({ abierto: false, conversacion: null, mensajes: [], set: p => set(p) }))

const DEGRADADO = `linear-gradient(135deg, ${ACENTO.base} 0%, ${ACENTO.profundo} 100%)`

const SUGERENCIAS = [
  '¿Qué tengo pendiente hoy?',
  '¿Cómo va el mantenimiento este mes?',
  '¿Qué muestras de aceite están vencidas?',
  '¿Cómo registro un cambio de aceite?',
]

/** Markdown mínimo: **negrita**, listas con guion o número, y saltos de línea. */
function Texto({ texto }: { texto: string }) {
  const lineas = texto.split('\n')
  const negrita = (s: string): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>)
  return (
    <>
      {lineas.map((l, i) => {
        const vineta = /^\s*[-•*]\s+(.*)$/.exec(l)
        const numero = /^\s*(\d+)[.)]\s+(.*)$/.exec(l)
        if (vineta) return <Box key={i} sx={{ display: 'flex', gap: 0.75, pl: 0.5 }}><span>•</span><span>{negrita(vineta[1])}</span></Box>
        if (numero) return <Box key={i} sx={{ display: 'flex', gap: 0.75, pl: 0.5 }}><span>{numero[1]}.</span><span>{negrita(numero[2])}</span></Box>
        if (!l.trim()) return <Box key={i} sx={{ height: 6 }} />
        return <Box key={i}>{negrita(l)}</Box>
      })}
    </>
  )
}

function Burbuja({ m, onConfirmar, ocupado }: {
  m: Mensaje; onConfirmar: (si: boolean) => void; ocupado: boolean
}) {
  const mio = m.rol === 'usuario'
  return (
    <Box sx={{ display: 'flex', justifyContent: mio ? 'flex-end' : 'flex-start' }}>
      <Box sx={{
        maxWidth: '88%', px: 1.5, py: 1, borderRadius: 2.5, fontSize: 13.5, lineHeight: 1.5,
        wordBreak: 'break-word',
        ...(mio
          ? { bgcolor: ACENTO.base, color: '#fff', borderBottomRightRadius: 6 }
          : { bgcolor: m.error ? '#FEF2F2' : '#F3F4F6', color: m.error ? '#991B1B' : PALETA.tinta,
              borderBottomLeftRadius: 6 }),
      }}>
        {m.texto && <Texto texto={m.texto} />}

        {m.accion && (
          <Box sx={{ mt: m.texto ? 1 : 0, p: 1.25, borderRadius: 2, bgcolor: '#fff',
                     border: `1px solid ${alpha(ACENTO.base, 0.35)}` }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: ACENTO.base, letterSpacing: '0.05em', mb: 0.5 }}>
              PARA CONFIRMAR
            </Typography>
            <Typography sx={{ fontSize: 12.8, color: PALETA.tinta }}>
              {m.accion.resumen.split(' · ').map((p, i) => <Box key={i}>{p}</Box>)}
            </Typography>
            {!m.resuelta ? (
              <Stack direction="row" spacing={1} mt={1.25}>
                <Button size="small" variant="contained" disabled={ocupado} startIcon={<CheckRounded />}
                  onClick={() => onConfirmar(true)}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 99, bgcolor: ACENTO.base }}>
                  Confirmar
                </Button>
                <Button size="small" disabled={ocupado} onClick={() => onConfirmar(false)}
                  sx={{ textTransform: 'none', borderRadius: 99, color: PALETA.grafito }}>
                  Cancelar
                </Button>
              </Stack>
            ) : (
              <Chip size="small" icon={m.resuelta === 'si' ? <CheckRounded /> : <BlockRounded />}
                label={m.resuelta === 'si' ? 'Confirmada' : 'Cancelada'}
                sx={{ mt: 1, height: 22, fontSize: 11, fontWeight: 700 }} />
            )}
          </Box>
        )}

        {m.descargas?.map(d => (
          <Button key={d.token} size="small" variant="outlined" startIcon={<FileDownloadOutlined />}
            onClick={() => tittanbotApi.descargar(d).catch(() => alert('El enlace venció; pídalo de nuevo.'))}
            sx={{ mt: 1, display: 'flex', textTransform: 'none', borderRadius: 2, bgcolor: '#fff',
                  justifyContent: 'flex-start', maxWidth: '100%' }}>
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.nombre}
            </Box>
          </Button>
        ))}
      </Box>
    </Box>
  )
}

export function TittanBot() {
  const { isAuthenticated, user, portal } = useAuthStore()
  const { pathname } = useLocation()
  const { abierto, conversacion, mensajes, set } = useChat()
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [activo, setActivo] = useState<boolean | null>(null)
  const movil = useMediaQuery('(max-width:600px)')
  const lista = useRef<HTMLDivElement>(null)
  const entrada = useRef<HTMLInputElement>(null)

  const puede = isAuthenticated && !portal && !!user &&
    (user.rol === 'ADMINISTRADOR' || !!user.permisos?.asistente)
  // Pantallas públicas o de ingreso: ahí no hay a quién asistir.
  const enIngreso = /^\/(login|empresa|reservar|portal|scanner-movil|sin-acceso)/.test(pathname) || pathname === '/'

  // Al cerrar sesión, la conversación se va con ella.
  useEffect(() => { if (!isAuthenticated) set({ abierto: false, conversacion: null, mensajes: [] }) },
    [isAuthenticated, set])

  useEffect(() => {
    if (!abierto || activo !== null) return
    tittanbotApi.estado().then(e => setActivo(e.activo)).catch(() => setActivo(false))
  }, [abierto, activo])

  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes, ocupado])

  useEffect(() => { if (abierto) setTimeout(() => entrada.current?.focus(), 150) }, [abierto])

  if (!puede || enIngreso) return null

  const agregar = (m: Mensaje) => set({ mensajes: [...useChat.getState().mensajes, m] })

  const enviar = async (t?: string) => {
    const mensaje = (t ?? texto).trim()
    if (!mensaje || ocupado) return
    setTexto('')
    // Una tarjeta sin responder queda descartada: el servidor la anula al
    // recibir un mensaje nuevo.
    set({ mensajes: [...useChat.getState().mensajes.map(m => m.accion && !m.resuelta ? { ...m, resuelta: 'no' as const } : m),
                     { rol: 'usuario', texto: mensaje }] })
    setOcupado(true)
    try {
      const r = await tittanbotApi.mensaje(mensaje, useChat.getState().conversacion)
      set({ conversacion: r.conversacion_id })
      agregar({ rol: 'asistente', texto: r.texto, accion: r.accion, descargas: r.descargas?.length ? r.descargas : undefined })
    } catch (e) {
      agregar({ rol: 'asistente', texto: mensajeDeError(e), error: true })
    } finally {
      setOcupado(false)
      setTimeout(() => entrada.current?.focus(), 50)
    }
  }

  const confirmar = async (indice: number, si: boolean) => {
    if (!conversacion) return
    setOcupado(true)
    set({ mensajes: useChat.getState().mensajes.map((m, i) => i === indice ? { ...m, resuelta: si ? 'si' : 'no' } : m) })
    try {
      const r = await tittanbotApi.confirmar(conversacion, si)
      agregar({ rol: 'asistente', texto: r.texto, error: si && !r.exito })
    } catch (e) {
      agregar({ rol: 'asistente', texto: mensajeDeError(e), error: true })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      {!abierto && (
        <Zoom in>
          <Tooltip title="TittanBot · su asistente" placement="left">
            <Fab onClick={() => set({ abierto: true })} aria-label="Abrir TittanBot"
              sx={{
                position: 'fixed', zIndex: 1300, right: movil ? 16 : 24,
                bottom: movil ? 'calc(16px + env(safe-area-inset-bottom))' : 24,
                background: DEGRADADO, color: '#fff',
                boxShadow: `0 10px 28px -6px ${alpha(ACENTO.base, 0.6)}`,
                '&:hover': { filter: 'brightness(1.08)' },
              }}>
              <AutoAwesomeRounded />
            </Fab>
          </Tooltip>
        </Zoom>
      )}

      {abierto && (
        <Paper elevation={12} role="dialog" aria-label="TittanBot" sx={{
          position: 'fixed', zIndex: 1300, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          right: movil ? 0 : 24, bottom: movil ? 0 : 24,
          width: movil ? '100vw' : 410, height: movil ? '100dvh' : 'min(640px, calc(100vh - 48px))',
          borderRadius: movil ? 0 : 4, border: `1px solid ${PALETA.niebla}`,
        }}>
          {/* Cabecera */}
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{
            px: 2, py: 1.25, pt: movil ? 'calc(10px + env(safe-area-inset-top))' : 1.25,
            background: DEGRADADO, color: '#fff',
          }}>
            <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.18)',
                       display: 'grid', placeItems: 'center' }}>
              <AutoAwesomeRounded sx={{ fontSize: 19 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>TittanBot</Typography>
              <Typography sx={{ fontSize: 11.5, opacity: 0.85 }}>
                {ocupado ? 'Pensando…' : 'Soporte, reportes y su día a día'}
              </Typography>
            </Box>
            <Tooltip title="Nueva conversación">
              <IconButton size="small" onClick={() => set({ conversacion: null, mensajes: [] })}
                aria-label="Nueva conversación" sx={{ color: '#fff' }}>
                <AddCommentOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cerrar (la conversación se conserva)">
              <IconButton size="small" onClick={() => set({ abierto: false })} aria-label="Cerrar TittanBot"
                sx={{ color: '#fff' }}>
                <CloseRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Mensajes */}
          <Box ref={lista} sx={{ flex: 1, overflowY: 'auto', px: 1.75, py: 1.5, display: 'flex',
                                 flexDirection: 'column', gap: 1.1, bgcolor: '#FCFCFD' }}>
            {mensajes.length === 0 && (
              <Box sx={{ my: 'auto', textAlign: 'center', px: 1 }}>
                <Box sx={{ width: 52, height: 52, borderRadius: '16px', background: DEGRADADO, color: '#fff',
                           display: 'grid', placeItems: 'center', mx: 'auto', mb: 1.5 }}>
                  <AutoAwesomeRounded />
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: 16 }}>
                  Hola{user?.nombre ? `, ${user.nombre}` : ''}. ¿En qué le ayudo?
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: PALETA.acero, mt: 0.5, mb: 2 }}>
                  Consulto órdenes, equipos, indicadores y lubricación; armo reportes; creo órdenes con su
                  confirmación y le explico cómo usar la plataforma. Actúo con sus mismos permisos.
                </Typography>
                {activo === false ? (
                  <Typography sx={{ fontSize: 12.5, color: '#B45309', fontWeight: 600 }}>
                    TittanBot todavía no está activado en este servidor.
                  </Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {SUGERENCIAS.map(s => (
                      <Button key={s} variant="outlined" size="small" onClick={() => enviar(s)} disabled={ocupado}
                        sx={{ textTransform: 'none', borderRadius: 99, justifyContent: 'flex-start',
                              borderColor: PALETA.niebla, color: PALETA.tinta, bgcolor: '#fff', px: 1.75,
                              '&:hover': { borderColor: ACENTO.base, bgcolor: alpha(ACENTO.base, 0.04) } }}>
                        {s}
                      </Button>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
            {mensajes.map((m, i) => (
              <Burbuja key={i} m={m} ocupado={ocupado} onConfirmar={si => confirmar(i, si)} />
            ))}
            {ocupado && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: PALETA.acero, pl: 0.5 }}>
                <CircularProgress size={14} thickness={5} sx={{ color: ACENTO.base }} />
                <Typography sx={{ fontSize: 12.5 }}>Consultando…</Typography>
              </Stack>
            )}
          </Box>

          {/* Entrada */}
          <Box sx={{ p: 1.25, pb: movil ? 'calc(10px + env(safe-area-inset-bottom))' : 1.25,
                     borderTop: `1px solid ${PALETA.niebla}`, bgcolor: '#fff' }}>
            <Stack direction="row" alignItems="flex-end" spacing={1} sx={{
              px: 1.25, py: 0.75, borderRadius: 3, border: `1px solid ${PALETA.niebla}`,
              '&:focus-within': { borderColor: ACENTO.base, boxShadow: `0 0 0 3px ${alpha(ACENTO.base, 0.12)}` },
            }}>
              <InputBase inputRef={entrada} multiline maxRows={5} fullWidth value={texto}
                placeholder="Escriba su pregunta…" disabled={activo === false}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                inputProps={{ 'aria-label': 'Mensaje para TittanBot', maxLength: 4000 }}
                sx={{ fontSize: 14, py: 0.5 }} />
              <IconButton size="small" onClick={() => enviar()} disabled={!texto.trim() || ocupado}
                aria-label="Enviar" sx={{ bgcolor: texto.trim() ? ACENTO.base : 'transparent', color: texto.trim() ? '#fff' : PALETA.acero,
                                          '&:hover': { bgcolor: ACENTO.profundo, color: '#fff' }, mb: 0.25 }}>
                <SendRounded sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
            <Typography sx={{ fontSize: 10.5, color: PALETA.acero, textAlign: 'center', mt: 0.75 }}>
              TittanBot puede equivocarse. Nada se crea ni se modifica sin su confirmación.
            </Typography>
          </Box>
        </Paper>
      )}
    </>
  )
}
