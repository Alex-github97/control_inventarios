/**
 * Cierre de sesión por inactividad: 10 minutos sin que la persona toque el
 * teclado, el mouse o la pantalla.
 *
 * TRES PIEZAS
 * 1. Este módulo anota la última actividad REAL (no las consultas automáticas
 *    de las pantallas) y la comparte entre pestañas por localStorage: trabajar
 *    en una pestaña mantiene vivas las demás.
 * 2. Cada petición manda `X-Inactividad` con los segundos sin actividad. El
 *    servidor fija el vencimiento de la sesión en (última actividad + 10 min);
 *    una pestaña olvidada que sigue consultando sola no la extiende.
 * 3. Un minuto antes se avisa con una cuenta regresiva; al llegar a cero se
 *    cierra la sesión en el servidor y en el navegador.
 *
 * Aunque el navegador se cierre o el equipo se suspenda, la sesión muere en el
 * servidor a los 10 minutos: el aviso es una cortesía, la seguridad está allá.
 */
import { useEffect, useRef, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Typography } from '@mui/material'
import { TimerOutlined } from '@mui/icons-material'

export const INACTIVIDAD_MS = 10 * 60 * 1000
const AVISO_MS = 60 * 1000
// Mientras la persona trabaja sin pedir nada al servidor (llenando un
// formulario largo, por ejemplo), un pulso cada pocos minutos le avisa que
// sigue ahí; si no, la sesión vencería con la persona escribiendo.
const PULSO_MS = 3 * 60 * 1000

const CLAVE = 'tw_ultima_actividad'
const MOTIVO = 'tw_motivo_salida'

let ultima = Date.now()
let ultimaEscrita = 0

function compartida(): number {
  try { return Number(localStorage.getItem(CLAVE)) || 0 } catch { return 0 }
}

export function marcarActividad(): void {
  const ahora = Date.now()
  ultima = ahora
  // Escribir en cada tecla sería mucho: cada 5 s alcanza para las otras pestañas.
  if (ahora - ultimaEscrita > 5000) {
    ultimaEscrita = ahora
    try { localStorage.setItem(CLAVE, String(ahora)) } catch { /* sin almacenamiento: solo esta pestaña */ }
  }
}

export function ultimaActividad(): number {
  return Math.max(ultima, compartida())
}

/** Segundos desde la última actividad real, para la cabecera `X-Inactividad`. */
export function segundosInactivo(): number {
  return Math.max(0, Math.floor((Date.now() - ultimaActividad()) / 1000))
}

let escuchando = false
function escucharActividad(): void {
  if (escuchando) return
  escuchando = true
  const opciones = { passive: true, capture: true } as const
  for (const e of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']) {
    window.addEventListener(e, marcarActividad, opciones)
  }
  // Mover el mouse también es estar ahí, pero cuenta como mucho cada 15 s.
  let ultimoMovimiento = 0
  window.addEventListener('pointermove', () => {
    const t = Date.now()
    if (t - ultimoMovimiento > 15000) { ultimoMovimiento = t; marcarActividad() }
  }, opciones)
}

/** Deja el motivo para que la pantalla de ingreso lo muestre. */
export function anotarMotivoSalida(motivo: string): void {
  try { sessionStorage.setItem(MOTIVO, motivo) } catch { /* nada */ }
}

/** El motivo por el que se cerró la sesión (y lo olvida), o null. */
export function tomarMotivoSalida(): string | null {
  try {
    const m = sessionStorage.getItem(MOTIVO)
    sessionStorage.removeItem(MOTIVO)
    return m
  } catch { return null }
}

export const MENSAJE_INACTIVIDAD = 'Su sesión se cerró por inactividad. Vuelva a ingresar.'

/**
 * Vigila la inactividad mientras haya sesión. `alCerrar` cierra la sesión
 * (servidor y navegador); `pulso` es una consulta liviana con sesión.
 * `claveToken` es la llave de localStorage del token: si otra pestaña sale,
 * esta también.
 */
export function ControlInactividad({ alCerrar, pulso, claveToken }: {
  alCerrar: () => void
  pulso: () => Promise<unknown>
  claveToken: string
}) {
  const [restante, setRestante] = useState<number | null>(null)
  const cerrado = useRef(false)
  const ultimoPulso = useRef(Date.now())
  // En referencias: si el componente padre se vuelve a pintar con funciones
  // nuevas, el vigilante no se reinicia (reiniciarlo contaría como actividad).
  const fns = useRef({ alCerrar, pulso })
  fns.current = { alCerrar, pulso }

  useEffect(() => {
    escucharActividad()
    marcarActividad()   // entrar es actividad: lo anotado de una sesión vieja no cuenta
  }, [])

  useEffect(() => {
    const cerrar = () => {
      if (cerrado.current) return
      cerrado.current = true
      anotarMotivoSalida(MENSAJE_INACTIVIDAD)
      fns.current.alCerrar()
    }
    const revisar = () => {
      const quieto = Date.now() - ultimaActividad()
      if (quieto >= INACTIVIDAD_MS) { cerrar(); return }
      setRestante(quieto >= INACTIVIDAD_MS - AVISO_MS ? Math.ceil((INACTIVIDAD_MS - quieto) / 1000) : null)
      if (quieto < PULSO_MS && Date.now() - ultimoPulso.current >= PULSO_MS) {
        ultimoPulso.current = Date.now()
        fns.current.pulso().catch(() => { /* el 401, si lo hay, lo maneja el cliente HTTP */ })
      }
    }
    const t = window.setInterval(revisar, 1000)
    // Al volver de una suspensión o de otra ventana se revisa de inmediato.
    document.addEventListener('visibilitychange', revisar)
    window.addEventListener('focus', revisar)
    // Salir en otra pestaña cierra esta.
    const otraPestana = (e: StorageEvent) => {
      if (e.key === claveToken && !e.newValue && !cerrado.current) {
        cerrado.current = true
        window.location.reload()
      }
    }
    window.addEventListener('storage', otraPestana)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', revisar)
      window.removeEventListener('focus', revisar)
      window.removeEventListener('storage', otraPestana)
    }
  }, [claveToken])

  if (restante === null) return null
  return (
    <Dialog open maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <TimerOutlined color="warning" /> ¿Sigue ahí?
      </DialogTitle>
      <DialogContent>
        <Typography fontSize={14}>
          Por seguridad, su sesión se cerrará en <b>{restante} segundo{restante === 1 ? '' : 's'}</b> por inactividad.
        </Typography>
        <Box mt={2}>
          <LinearProgress variant="determinate" value={(restante / (AVISO_MS / 1000)) * 100} color="warning" />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={() => { cerrado.current = true; fns.current.alCerrar() }}>
          Cerrar sesión
        </Button>
        <Button variant="contained" onClick={() => {
          marcarActividad()
          ultimoPulso.current = Date.now()
          fns.current.pulso().catch(() => { /* idem */ })
          setRestante(null)
        }}>
          Seguir conectado
        </Button>
      </DialogActions>
    </Dialog>
  )
}
