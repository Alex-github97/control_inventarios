/**
 * Grabador de reuniones presenciales que no pierde audio (design D6).
 *
 * MediaRecorder entrega un trozo cada 10 s. Cada trozo se guarda PRIMERO en
 * IndexedDB y después se sube; solo cuando el servidor lo confirma se borra
 * del navegador. Si la red se cae, los trozos esperan en IndexedDB y salen
 * solos al volver la conexión. Si se recarga la página, la grabación sigue en
 * una «sesión» nueva (el servidor sabe unir sesiones) y lo pendiente se sube.
 *
 * Al detener, el servidor revisa que la secuencia esté completa; si falta
 * algo, devuelve qué falta y el grabador lo reenvía desde IndexedDB.
 */
import { reunionesApi } from '@/api/reuniones'

const BD = 'tw_reuniones'
const ALMACEN = 'partes'
const TROZO_MS = 10_000

interface Parte { clave: string; reunion: number; sesion: number; numero: number; datos: Blob }

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(BD, 1)
    r.onupgradeneeded = () => {
      const s = r.result.createObjectStore(ALMACEN, { keyPath: 'clave' })
      s.createIndex('reunion', 'reunion')
    }
    r.onsuccess = () => ok(r.result)
    r.onerror = () => mal(r.error)
  })
}

async function tx<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir()
  return new Promise((ok, mal) => {
    const req = fn(db.transaction(ALMACEN, modo).objectStore(ALMACEN))
    req.onsuccess = () => ok(req.result)
    req.onerror = () => mal(req.error)
  })
}

const guardar = (p: Parte) => tx('readwrite', s => s.put(p))
const quitar = (clave: string) => tx('readwrite', s => s.delete(clave))
const pendientesDe = (reunion: number) =>
  tx<Parte[]>('readonly', s => s.index('reunion').getAll(reunion) as IDBRequest<Parte[]>)

const claveSesiones = (id: number) => `tw_grab_${id}_sesiones`
function leerSesiones(id: number): Record<number, number> {
  try { return JSON.parse(localStorage.getItem(claveSesiones(id)) || '{}') } catch { return {} }
}
function escribirSesiones(id: number, s: Record<number, number>) {
  try { localStorage.setItem(claveSesiones(id), JSON.stringify(s)) } catch { /* sin almacenamiento: se avisa por pendientes */ }
}

export interface EstadoGrabador {
  grabando: boolean
  segundos: number
  pendientes: number      // trozos que aún no confirmó el servidor
  sinRed: boolean
}

export class GrabadorReunion {
  private recorder?: MediaRecorder
  private sesion = 0
  private numero = 0
  private inicio = 0
  private reloj?: number
  private subida?: Promise<void>
  private sinRed = false
  private ultimoTrozo?: Promise<void>
  private resolverUltimo?: () => void
  private guardados: Promise<void> = Promise.resolve()
  pendientes = 0

  constructor(private reunionId: number, private alCambiar: (e: EstadoGrabador) => void) {
    window.addEventListener('online', this.subirPendientes)
  }

  liberar() {
    window.removeEventListener('online', this.subirPendientes)
    if (this.reloj) clearInterval(this.reloj)
  }

  private avisar() {
    this.alCambiar({
      grabando: this.recorder?.state === 'recording',
      segundos: this.inicio ? Math.floor((Date.now() - this.inicio) / 1000) : 0,
      pendientes: this.pendientes, sinRed: this.sinRed,
    })
  }

  /** Sube lo que haya quedado de una sesión anterior (recarga de página). */
  async recuperar() {
    this.pendientes = (await pendientesDe(this.reunionId)).length
    this.avisar()
    await this.subirPendientes()
  }

  async iniciar(stream: MediaStream) {
    const sesiones = leerSesiones(this.reunionId)
    this.sesion = Math.max(0, ...Object.keys(sesiones).map(Number)) + 1
    this.numero = 0
    const tipo = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
    this.recorder = new MediaRecorder(stream, { mimeType: tipo, audioBitsPerSecond: 32000 })
    // Encadenados: cada trozo se guarda después del anterior, y detener()
    // espera al último antes de pedirle al servidor que arme el audio.
    this.recorder.ondataavailable = ev => { this.guardados = this.guardados.then(() => this.alRecibir(ev.data)) }
    this.recorder.onstop = () => this.resolverUltimo?.()
    this.recorder.start(TROZO_MS)
    this.inicio = Date.now()
    this.reloj = window.setInterval(() => this.avisar(), 1000)
    this.avisar()
  }

  private async alRecibir(datos: Blob) {
    if (!datos.size) return
    this.numero += 1
    const p: Parte = {
      clave: `${this.reunionId}:${this.sesion}:${this.numero}`,
      reunion: this.reunionId, sesion: this.sesion, numero: this.numero, datos,
    }
    await guardar(p)
    const s = leerSesiones(this.reunionId)
    s[this.sesion] = this.numero
    escribirSesiones(this.reunionId, s)
    this.pendientes += 1
    this.avisar()
    void this.subirPendientes()
  }

  /** Sube lo pendiente. Si ya hay una subida en curso, la espera y vuelve a
   *  revisar: quien llama (p. ej. detener) necesita saber que terminó. */
  subirPendientes = async (): Promise<void> => {
    while (this.subida) await this.subida
    this.subida = this.subirUnaVez().finally(() => { this.subida = undefined })
    return this.subida
  }

  private async subirUnaVez() {
    try {
      const partes = (await pendientesDe(this.reunionId)).sort((a, b) => a.sesion - b.sesion || a.numero - b.numero)
      for (const p of partes) {
        try {
          await reunionesApi.enviarParte(this.reunionId, p.sesion, p.numero, p.datos)
          await quitar(p.clave)
          this.sinRed = false
        } catch {
          // Sin red o servidor caído: queda en IndexedDB y se reintenta al
          // volver la conexión (evento `online`) o en el próximo trozo.
          this.sinRed = true
          break
        }
      }
      this.pendientes = (await pendientesDe(this.reunionId)).length
    } finally {
      this.avisar()
    }
  }

  /** Detiene, termina de subir y le pide al servidor que arme el audio. */
  async detener(): Promise<void> {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.ultimoTrozo = new Promise(ok => { this.resolverUltimo = ok })
      this.recorder.stop()
      this.recorder.stream.getTracks().forEach(t => t.stop())
      await this.ultimoTrozo
      await this.guardados
    }
    if (this.reloj) clearInterval(this.reloj)
    for (let intento = 0; intento < 5; intento++) {
      await this.subirPendientes()
      if (this.pendientes) throw new Error('Quedan partes sin subir. Revise la conexión y vuelva a intentar.')
      try {
        await reunionesApi.detener(this.reunionId, leerSesiones(this.reunionId))
        localStorage.removeItem(claveSesiones(this.reunionId))
        return
      } catch (e: any) {
        // El servidor dice qué partes faltan; si siguen en IndexedDB se
        // reenvían en la próxima vuelta.
        if (e?.response?.status !== 409 || !e?.response?.data?.detail?.faltan) throw e
      }
    }
    throw new Error('El servidor no recibió todas las partes del audio.')
  }
}

/* ── Texto en vivo (design D5) ──────────────────────────────────────────────
 * Solo de consulta: si falla, la grabación sigue igual. El navegador recibe una
 * credencial efímera del servidor (la clave de OpenAI nunca llega aquí) y abre
 * una sesión WebRTC de transcripción. gpt-live-transcribe no corta turnos solo:
 * se detecta el silencio aquí y se pide el texto de lo hablado.
 */
export class TextoVivo {
  private pc?: RTCPeerConnection
  private dc?: RTCDataChannel
  private ctx?: AudioContext
  private vad?: number
  private textos = new Map<string, string>()
  private orden: string[] = []

  constructor(private alTexto: (lineas: string[]) => void, private alFallar: (motivo: string) => void) {}

  async conectar(stream: MediaStream) {
    try {
      const { valor } = await reunionesApi.credencialVivo()
      this.pc = new RTCPeerConnection()
      stream.getAudioTracks().forEach(t => this.pc!.addTrack(t, stream))
      this.dc = this.pc.createDataChannel('oai-events')
      this.dc.onmessage = e => this.alEvento(JSON.parse(e.data))
      const oferta = await this.pc.createOffer()
      await this.pc.setLocalDescription(oferta)
      const r = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST', body: oferta.sdp,
        headers: { Authorization: `Bearer ${valor}`, 'Content-Type': 'application/sdp' },
      })
      if (!r.ok) throw new Error(`OpenAI respondió ${r.status}`)
      await this.pc.setRemoteDescription({ type: 'answer', sdp: await r.text() })
      this.pc.onconnectionstatechange = () => {
        if (this.pc && ['failed', 'disconnected'].includes(this.pc.connectionState)) this.fallar('Se perdió la conexión del texto en vivo.')
      }
      this.vigilarSilencio(stream)
    } catch (e: any) {
      this.fallar(e?.response?.data?.detail || e?.message || 'No se pudo abrir el texto en vivo.')
    }
  }

  private vigilarSilencio(stream: MediaStream) {
    this.ctx = new AudioContext()
    const an = this.ctx.createAnalyser()
    an.fftSize = 1024
    this.ctx.createMediaStreamSource(stream).connect(an)
    const buf = new Float32Array(an.fftSize)
    let hablando = false, silencioDesde = 0
    this.vad = window.setInterval(() => {
      an.getFloatTimeDomainData(buf)
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length)
      const ahora = performance.now()
      if (rms > 0.015) { hablando = true; silencioDesde = 0; return }
      if (!hablando) return
      if (!silencioDesde) silencioDesde = ahora
      if (ahora - silencioDesde > 700 && this.dc?.readyState === 'open') {
        this.dc.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
        hablando = false; silencioDesde = 0
      }
    }, 100)
  }

  private alEvento(ev: any) {
    const id = ev.item_id
    if (ev.type === 'conversation.item.input_audio_transcription.delta' && id) {
      if (!this.textos.has(id)) this.orden.push(id)
      this.textos.set(id, (this.textos.get(id) || '') + (ev.delta || ''))
    } else if (ev.type === 'conversation.item.input_audio_transcription.completed' && id) {
      if (!this.textos.has(id)) this.orden.push(id)
      this.textos.set(id, ev.transcript || '')
    } else if (ev.type === 'error') {
      this.fallar(ev.error?.message || 'Error del texto en vivo.')
      return
    } else {
      return
    }
    // Los turnos pueden completarse en desorden: se muestran en el orden en que empezaron.
    this.alTexto(this.orden.map(k => this.textos.get(k) || '').filter(Boolean).slice(-30))
  }

  private fallar(motivo: string) {
    this.cerrar()
    this.alFallar(motivo)
  }

  cerrar() {
    if (this.vad) clearInterval(this.vad)
    try { this.dc?.close() } catch { /* ya cerrado */ }
    try { this.pc?.close() } catch { /* ya cerrado */ }
    void this.ctx?.close().catch(() => undefined)
    this.pc = undefined; this.dc = undefined; this.ctx = undefined
  }
}
