/**
 * Enviar reportes desde TittanLite: se eligen los reportes, el período y el
 * canal (WhatsApp, Telegram o correo, con el bot de TittanWare), y a quién.
 * Los destinatarios los administra la cuenta del cliente en TittanWare.
 */
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { CheckSquare, Mail, MessageCircle, Send, Square } from 'lucide-react-native'
import { Boton, Campo, ESPACIO, RADIO, Tarjeta, Texto, useTema } from '@/diseno'
import { useSesion } from '@/datos/sesion'
import { CabeceraLite } from '@/lite/marca'

type Canal = 'WHATSAPP' | 'TELEGRAM' | 'CORREO'
interface Destinatario {
  id: number; alias: string; telefono?: string | null; correo?: string | null; activo: boolean; telegram_vinculado: boolean
}
interface Estado { canales: Record<Canal, boolean> }

const REPORTES = [
  { tipo: 'tittanlite_pdf', nombre: 'Informe de inspección (PDF)', detalle: 'Cada vehículo con sus llantas, profundidades, novedades y fotos.' },
  { tipo: 'tittanlite_excel', nombre: 'Informe de inspección (Excel)', detalle: 'Las mismas mediciones, en tabla.' },
  { tipo: 'disposicion_excel', nombre: 'Disposición final (Excel)', detalle: 'Llantas desechadas en el período y su causa.' },
  { tipo: 'plan_recambio_excel', nombre: 'Plan de recambio (Excel)', detalle: 'Cuándo cambiar cada llanta inspeccionada (próximos 6 meses).' },
]
const CANALES: { valor: Canal; texto: string; icono: typeof Send }[] = [
  { valor: 'WHATSAPP', texto: 'WhatsApp', icono: MessageCircle },
  { valor: 'TELEGRAM', texto: 'Telegram', icono: Send },
  { valor: 'CORREO', texto: 'Correo', icono: Mail },
]
const iso = (d: Date) => d.toISOString().slice(0, 10)
function periodo(p: string): [string, string] {
  const h = new Date()
  if (p === 'hoy') return [iso(h), iso(h)]
  if (p === '7') return [iso(new Date(Date.now() - 6 * 86400000)), iso(h)]
  if (p === 'mes') return [iso(new Date(h.getFullYear(), h.getMonth(), 1)), iso(h)]
  if (p === 'anterior') return [iso(new Date(h.getFullYear(), h.getMonth() - 1, 1)), iso(new Date(h.getFullYear(), h.getMonth(), 0))]
  return [iso(new Date(Date.now() - 29 * 86400000)), iso(h)]
}
const PERIODOS = [
  { valor: 'hoy', texto: 'Hoy' }, { valor: '7', texto: '7 días' }, { valor: '30', texto: '30 días' },
  { valor: 'mes', texto: 'Este mes' }, { valor: 'anterior', texto: 'Mes anterior' }, { valor: 'otro', texto: 'Otro' },
]
const FECHA = /^\d{4}-\d{2}-\d{2}$/

export default function EnviarReportes() {
  const { color } = useTema()
  const { llamar } = useSesion()
  const [estado, setEstado] = useState<Estado | null>(null)
  const [dests, setDests] = useState<Destinatario[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [informes, setInformes] = useState<string[]>(['tittanlite_pdf'])
  const [modo, setModo] = useState('30')
  const [desde, setDesde] = useState(periodo('30')[0])
  const [hasta, setHasta] = useState(periodo('30')[1])
  const [canal, setCanal] = useState<Canal | null>(null)
  const [elegidos, setElegidos] = useState<number[]>([])
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null)

  useEffect(() => {
    Promise.all([
      llamar(api => api.GET('/api/v1/eam/mensajeria/estado')),
      llamar(api => api.GET('/api/v1/eam/mensajeria/destinatarios')),
    ]).then(([e, d]) => {
      const est = e as unknown as Estado
      setEstado(est)
      setDests((d as unknown as Destinatario[]).filter(x => x.activo))
      setCanal(CANALES.find(c => est.canales[c.valor])?.valor ?? null)
    }, e => setError(e instanceof Error ? e.message : 'Sin conexión: los reportes se envían con señal'))
  }, [llamar])

  const elegirPeriodo = (p: string) => {
    setModo(p)
    if (p !== 'otro') { const [a, b] = periodo(p); setDesde(a); setHasta(b) }
  }
  const alcanza = (d: Destinatario) => canal === 'WHATSAPP' ? !!d.telefono : canal === 'TELEGRAM' ? d.telegram_vinculado : canal === 'CORREO' ? !!d.correo : false
  const disponibles = useMemo(() => (dests ?? []).filter(alcanza), [dests, canal]) // eslint-disable-line react-hooks/exhaustive-deps
  const validos = elegidos.filter(id => disponibles.some(d => d.id === id))
  const fechasOk = FECHA.test(desde) && FECHA.test(hasta) && desde <= hasta

  const enviar = async () => {
    if (!canal) return
    setEnviando(true); setResultado(null)
    try {
      const r = await llamar(api => api.POST('/api/v1/eam/mensajeria/enviar', { body: {
        canal, destinatario_ids: validos, mensaje: mensaje.trim() || null,
        informes: informes.map(tipo => tipo === 'plan_recambio_excel' ? { tipo, origen: 'LITE', meses: 6 } : { tipo, desde, hasta }),
      } as never })) as unknown as { enviados: number; resultados: { alias: string; informe: string; estado: string; error?: string | null }[] }
      const fallos = r.resultados.filter(x => x.estado !== 'ENVIADO')
      setResultado(fallos.length
        ? { ok: false, texto: `Enviados ${r.enviados}. Fallaron: ${fallos.map(f => `${f.alias} — ${f.informe} (${f.error})`).join('; ')}` }
        : { ok: true, texto: `Listo: ${r.enviados} envío${r.enviados === 1 ? '' : 's'}.` })
    } catch (e) {
      setResultado({ ok: false, texto: e instanceof Error ? e.message : 'No se pudo enviar: revise la señal' })
    } finally { setEnviando(false) }
  }

  const Casilla = ({ si, titulo, detalle, onPress }: { si: boolean; titulo: string; detalle?: string; onPress: () => void }) => {
    const Icono = si ? CheckSquare : Square
    return (
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: si }} accessibilityLabel={titulo} onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.e3, minHeight: 52 }}>
        <Icono size={24} color={si ? color.acento : color.textoTerciario} />
        <View style={{ flex: 1 }}>
          <Texto variante="cuerpoFuerte">{titulo}</Texto>
          {detalle && <Texto variante="nota" tono="terciario">{detalle}</Texto>}
        </View>
      </Pressable>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <CabeceraLite titulo="Enviar reportes" subtitulo="TittanLite" volver={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: ESPACIO.e4, gap: ESPACIO.e4, paddingBottom: ESPACIO.e8 }} keyboardShouldPersistTaps="handled">
        <Tarjeta style={{ gap: ESPACIO.e1 }}>
          <Texto variante="subtitulo">1. Reportes</Texto>
          {REPORTES.map(r => (
            <Casilla key={r.tipo} si={informes.includes(r.tipo)} titulo={r.nombre} detalle={r.detalle}
              onPress={() => setInformes(informes.includes(r.tipo) ? informes.filter(x => x !== r.tipo) : [...informes, r.tipo])} />
          ))}
        </Tarjeta>

        <Tarjeta style={{ gap: ESPACIO.e3 }}>
          <Texto variante="subtitulo">2. Período</Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.e2 }}>
            {PERIODOS.map(o => {
              const sel = modo === o.valor
              return (
                <Pressable key={o.valor} accessibilityRole="radio" accessibilityState={{ selected: sel }} onPress={() => elegirPeriodo(o.valor)}
                  style={{ paddingHorizontal: 14, minHeight: 40, borderRadius: RADIO.total, justifyContent: 'center', borderWidth: 1.5,
                    borderColor: sel ? color.acento : 'transparent', backgroundColor: sel ? color.acentoSuave : color.hundida }}>
                  <Texto variante="nota" style={{ color: sel ? color.acentoSobreSuave : color.textoSecundario }}>{o.texto}</Texto>
                </Pressable>
              )
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: ESPACIO.e2 }}>
            <View style={{ flex: 1 }}><Campo etiqueta="Desde" valor={desde} onCambio={v => { setModo('otro'); setDesde(v) }} teclado="numbers-and-punctuation" /></View>
            <View style={{ flex: 1 }}><Campo etiqueta="Hasta" valor={hasta} onCambio={v => { setModo('otro'); setHasta(v) }} teclado="numbers-and-punctuation" /></View>
          </View>
          {!fechasOk && <Texto variante="nota" tono="peligro">Fechas como AAAA-MM-DD, y «desde» antes de «hasta».</Texto>}
          {informes.includes('plan_recambio_excel') && <Texto variante="nota" tono="terciario">El plan de recambio mira hacia adelante: no usa el período.</Texto>}
        </Tarjeta>

        <Tarjeta style={{ gap: ESPACIO.e3 }}>
          <Texto variante="subtitulo">3. Canal y destinatarios</Texto>
          <View style={{ flexDirection: 'row', gap: ESPACIO.e2 }}>
            {CANALES.map(c => {
              const activo = !!estado?.canales[c.valor]
              const sel = canal === c.valor
              const Icono = c.icono
              return (
                <Pressable key={c.valor} accessibilityRole="radio" accessibilityState={{ selected: sel, disabled: !activo }}
                  accessibilityLabel={activo ? c.texto : `${c.texto}, próximamente`} disabled={!activo} onPress={() => setCanal(c.valor)}
                  style={{ flex: 1, minHeight: 72, borderRadius: RADIO.grande, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 4,
                    borderColor: sel ? color.acento : color.borde, backgroundColor: sel ? color.acentoSuave : color.superficie, opacity: activo ? 1 : 0.5 }}>
                  <Icono size={22} color={sel ? color.acento : color.textoSecundario} />
                  <Texto variante="nota" style={{ color: sel ? color.acentoSobreSuave : color.textoSecundario }}>{c.texto}</Texto>
                  {!activo && <Texto variante="mini" tono="terciario">próximamente</Texto>}
                </Pressable>
              )
            })}
          </View>
          {error && <Texto variante="nota" tono="peligro">{error}</Texto>}
          {estado && !canal && <Texto tono="secundario">Ningún canal está habilitado todavía en TittanWare.</Texto>}
          {canal && dests && disponibles.length === 0 && (
            <Texto tono="secundario">Ningún destinatario tiene {canal === 'CORREO' ? 'correo' : canal === 'WHATSAPP' ? 'teléfono' : 'Telegram vinculado'}: el administrador los configura en TittanWare.</Texto>
          )}
          {disponibles.map(d => (
            <Casilla key={d.id} si={elegidos.includes(d.id)} titulo={d.alias}
              detalle={canal === 'CORREO' ? d.correo ?? undefined : canal === 'WHATSAPP' ? d.telefono ?? undefined : 'Telegram vinculado'}
              onPress={() => setElegidos(elegidos.includes(d.id) ? elegidos.filter(x => x !== d.id) : [...elegidos, d.id])} />
          ))}
          <Campo etiqueta="Mensaje (opcional)" valor={mensaje} onCambio={setMensaje} multilinea />
        </Tarjeta>

        {resultado && <Texto variante="nota" tono={resultado.ok ? 'exito' : 'alerta'} accessibilityLiveRegion="polite">{resultado.texto}</Texto>}
        <Boton titulo={enviando ? 'Enviando…' : `Enviar ${informes.length} reporte${informes.length === 1 ? '' : 's'}`} icono={Send} ancho tamano="grande"
          onPress={enviar} cargando={enviando} deshabilitado={!canal || !validos.length || !informes.length || !fechasOk} />
      </ScrollView>
    </View>
  )
}
