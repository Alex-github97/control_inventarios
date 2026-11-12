/**
 * Lubr-IA: el chat de análisis de aceite dentro del módulo de lubricación.
 *
 * Usa el motor de TittanBot con su propio perfil (`agente: 'lubria'`): otra
 * instrucción, solo herramientas de lubricación, y conversaciones aparte. Cada
 * resultado que se le envía pasa por el mismo evaluador de la plataforma
 * (Tormos, ASTM, límites de la flota), así que el chat y el informe dicen lo
 * mismo. La conversación vive fuera del componente: cambiar de pestaña no la
 * borra.
 */
import { useEffect, useRef, useState } from 'react'
import {
  Alert, Box, Button, Card, CircularProgress, IconButton, InputBase, Stack, Tooltip, Typography, alpha,
} from '@mui/material'
import {
  AddCommentOutlined, AttachFileRounded, ScienceOutlined, SendRounded,
} from '@mui/icons-material'
import { create } from 'zustand'
import { ACENTO, PALETA } from '@/config/marca'
import { tittanbotApi } from '@/api/tittanbot'
import { Burbuja, type Mensaje } from '@/components/tittanbot/TittanBot'
import { mensajeDeError } from '@/utils/errorApi'

const useLubrIA = create<{
  conversacion: number | null; mensajes: Mensaje[]
  set: (p: Partial<{ conversacion: number | null; mensajes: Mensaje[] }>) => void
}>(set => ({ conversacion: null, mensajes: [], set: p => set(p) }))

const SUGERENCIAS = [
  'Interprete esta muestra de un motor Cummins ISX 15W-40 con 12.000 km de aceite: Fe 48, Cr 4, Cu 9, Pb 6, Al 11, Si 31, Na 2, B 60, TBN 6,2, viscosidad 12,1 cSt, hollín 2,1 %, combustible 0, agua 0',
  '¿Qué muestras críticas tengo y qué hago primero?',
  '¿Por qué el silicio con aluminio indica polvo y no un sellador?',
  '¿Cuándo el sodio indica fuga de refrigerante?',
]

export function LubrIA() {
  const { conversacion, mensajes, set } = useLubrIA()
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [activo, setActivo] = useState<boolean | null>(null)
  const lista = useRef<HTMLDivElement>(null)
  const archivo = useRef<HTMLInputElement>(null)

  useEffect(() => { tittanbotApi.estado().then(e => setActivo(e.activo), () => setActivo(false)) }, [])
  useEffect(() => { lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' }) }, [mensajes, ocupado])

  const agregar = (m: Mensaje) => set({ mensajes: [...useLubrIA.getState().mensajes, m] })
  const enviar = async (t?: string) => {
    const mensaje = (t ?? texto).trim()
    if (!mensaje || ocupado) return
    setTexto('')
    set({ mensajes: [...useLubrIA.getState().mensajes.map(m => m.accion && !m.resuelta ? { ...m, resuelta: 'no' as const } : m),
                     { rol: 'usuario', texto: mensaje }] })
    setOcupado(true)
    try {
      const r = await tittanbotApi.mensaje(mensaje, useLubrIA.getState().conversacion, 'lubria')
      set({ conversacion: r.conversacion_id })
      agregar({ rol: 'asistente', texto: r.texto, accion: r.accion, descargas: r.descargas?.length ? r.descargas : undefined })
    } catch (e) {
      agregar({ rol: 'asistente', texto: mensajeDeError(e), error: true })
    } finally { setOcupado(false) }
  }
  const adjuntar = async (f: File) => {
    if (ocupado) return
    setOcupado(true)
    try {
      const r = await tittanbotApi.adjuntar(f, useLubrIA.getState().conversacion, 'lubria')
      set({ conversacion: r.conversacion_id })
      setOcupado(false)
      await enviar(`Adjunté «${r.nombre}» (${r.filas} filas) con resultados de laboratorio. ${texto.trim() || 'Interprételos.'}`)
    } catch (e) {
      agregar({ rol: 'asistente', texto: mensajeDeError(e), error: true })
      setOcupado(false)
    }
  }
  const confirmar = async (i: number, si: boolean) => {
    if (!conversacion) return
    setOcupado(true)
    set({ mensajes: useLubrIA.getState().mensajes.map((m, j) => j === i ? { ...m, resuelta: si ? 'si' : 'no' } : m) })
    try {
      const r = await tittanbotApi.confirmar(conversacion, si)
      agregar({ rol: 'asistente', texto: r.texto, error: si && !r.exito })
    } catch (e) {
      agregar({ rol: 'asistente', texto: mensajeDeError(e), error: true })
    } finally { setOcupado(false) }
  }

  return (
    <Card sx={{ borderRadius: 3, display: 'flex', flexDirection: 'column', height: { xs: '75vh', md: 'calc(100vh - 260px)' }, minHeight: 480 }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider',
        background: `linear-gradient(135deg, ${alpha(ACENTO.base, 0.10)} 0%, transparent 70%)` }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: ACENTO.base, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ScienceOutlined fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={800} lineHeight={1.2}>Lubr-IA</Typography>
          <Typography variant="caption" color="text.secondary">
            Interpreta sus análisis de aceite con el criterio de la plataforma (Tormos, ASTM y los límites de su flota)
          </Typography>
        </Box>
        <Tooltip title="Nueva conversación">
          <span><IconButton size="small" disabled={ocupado || !mensajes.length}
            onClick={() => set({ conversacion: null, mensajes: [] })} aria-label="Nueva conversación"><AddCommentOutlined fontSize="small" /></IconButton></span>
        </Tooltip>
      </Stack>

      {activo === false && (
        <Alert severity="info" sx={{ m: 2 }}>Lubr-IA usa el motor de TittanBot, que todavía no está activado en este servidor.</Alert>
      )}

      <Box ref={lista} sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {mensajes.length === 0 && (
          <Box sx={{ my: 'auto', textAlign: 'center', px: 2 }}>
            <Typography fontWeight={700} mb={0.5}>Envíe los resultados de una muestra</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Escríbalos o péguelos del boletín, adjunte un Excel del laboratorio, o pregunte por el número de una muestra
              o la placa de un equipo.
            </Typography>
            <Stack spacing={1} alignItems="stretch" sx={{ maxWidth: 620, mx: 'auto' }}>
              {SUGERENCIAS.map(s => (
                <Button key={s} variant="outlined" size="small" disabled={ocupado || activo === false} onClick={() => enviar(s)}
                  sx={{ textTransform: 'none', justifyContent: 'flex-start', textAlign: 'left', borderRadius: 2, color: PALETA.grafito }}>
                  {s}
                </Button>
              ))}
            </Stack>
          </Box>
        )}
        {mensajes.map((m, i) => <Burbuja key={i} m={m} ocupado={ocupado} onConfirmar={si => confirmar(i, si)} />)}
        {ocupado && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
            <CircularProgress size={14} /><Typography variant="caption">Lubr-IA está analizando…</Typography>
          </Stack>
        )}
      </Box>

      <Stack direction="row" alignItems="flex-end" spacing={1} sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <input ref={archivo} type="file" hidden accept=".xlsx,.xls,.csv"
          onChange={e => { const f = e.target.files?.[0]; if (f) adjuntar(f); e.target.value = '' }} />
        <Tooltip title="Adjuntar resultados en Excel o CSV">
          <span><IconButton size="small" disabled={ocupado || activo === false} onClick={() => archivo.current?.click()}
            aria-label="Adjuntar archivo"><AttachFileRounded fontSize="small" /></IconButton></span>
        </Tooltip>
        <InputBase multiline maxRows={6} fullWidth value={texto} disabled={activo === false}
          placeholder="Escriba o pegue los resultados del laboratorio…"
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
          sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: '#F3F4F6', fontSize: 14 }} />
        <IconButton color="primary" onClick={() => enviar()} disabled={!texto.trim() || ocupado} aria-label="Enviar">
          <SendRounded />
        </IconButton>
      </Stack>
    </Card>
  )
}
