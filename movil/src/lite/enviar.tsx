/**
 * Enviar un informe de TittanLite por WhatsApp o Telegram a los destinatarios
 * que el administrador configuró en TittanWare. El informe lo arma y lo manda
 * el servidor: el teléfono solo elige qué, a quién y por dónde.
 */
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { CheckSquare, Send, Square } from 'lucide-react-native'
import { Boton, Campo, ESPACIO, HojaInferior, Segmentado, Texto, useTema } from '@/diseno'
import { useSesion } from '@/datos/sesion'

interface Destinatario { id: number; alias: string; telefono?: string | null; telegram: boolean; whatsapp: boolean; activo: boolean; telegram_vinculado: boolean }

const INFORMES = [
  { valor: 'tittanlite_pdf', texto: 'Informe PDF' },
  { valor: 'tittanlite_excel', texto: 'Excel' },
  { valor: 'plan_recambio_excel', texto: 'Plan de recambio' },
]

export function EnviarInforme({ visible, onCerrar }: { visible: boolean; onCerrar: () => void }) {
  const { color } = useTema()
  const { llamar } = useSesion()
  const [dests, setDests] = useState<Destinatario[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [informe, setInforme] = useState('tittanlite_pdf')
  const [elegidos, setElegidos] = useState<number[]>([])
  const [canal, setCanal] = useState<'WHATSAPP' | 'TELEGRAM' | 'AMBOS'>('WHATSAPP')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    llamar(api => api.GET('/api/v1/eam/mensajeria/destinatarios')).then(
      d => setDests((d as Destinatario[]).filter(x => x.activo)),
      e => setError(e instanceof Error ? e.message : 'Sin conexión'))
  }, [visible, llamar])

  const enviar = async () => {
    setEnviando(true); setResultado(null)
    try {
      const r = await llamar(api => api.POST('/api/v1/eam/mensajeria/enviar', { body: {
        destinatario_ids: elegidos, canales: canal === 'AMBOS' ? ['WHATSAPP', 'TELEGRAM'] : [canal], mensaje: mensaje || null,
        informe: informe === 'plan_recambio_excel' ? { tipo: informe, origen: 'LITE', meses: 6 } : { tipo: informe, dias: 30 },
      } as never })) as { enviados: number; resultados: { alias: string; canal: string; estado: string; error?: string | null }[] }
      const fallos = r.resultados.filter(x => x.estado !== 'ENVIADO')
      setResultado(fallos.length
        ? `Enviado ${r.enviados}. Falló: ${fallos.map(f => `${f.alias} (${f.error})`).join('; ')}`
        : `Enviado a ${r.enviados} destino${r.enviados === 1 ? '' : 's'}.`)
    } catch (e) {
      setResultado(e instanceof Error ? e.message : 'No se pudo enviar: revise la señal')
    } finally { setEnviando(false) }
  }

  return (
    <HojaInferior visible={visible} onCerrar={onCerrar} titulo="Enviar informe">
      <View style={{ gap: ESPACIO.e3 }}>
        <Segmentado opciones={INFORMES} valor={informe} onCambio={setInforme} />
        <Texto variante="nota" tono="terciario">
          {informe === 'plan_recambio_excel' ? 'Cuándo cambiar cada llanta inspeccionada, próximos 6 meses.' : 'Las inspecciones de los últimos 30 días.'}
        </Texto>
        <Segmentado opciones={[{ valor: 'WHATSAPP', texto: 'WhatsApp' }, { valor: 'TELEGRAM', texto: 'Telegram' }, { valor: 'AMBOS', texto: 'Ambos' }]}
          valor={canal} onCambio={v => setCanal(v as typeof canal)} />
        {error && <Texto variante="nota" tono="peligro">{error}</Texto>}
        {dests?.length === 0 && <Texto tono="secundario">No hay destinatarios: el administrador los agrega en TittanWare, Configuración.</Texto>}
        {dests?.map(d => {
          const si = elegidos.includes(d.id)
          const Icono = si ? CheckSquare : Square
          return (
            <Pressable key={d.id} accessibilityRole="checkbox" accessibilityState={{ checked: si }} accessibilityLabel={d.alias}
              onPress={() => setElegidos(si ? elegidos.filter(x => x !== d.id) : [...elegidos, d.id])}
              style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.e3, minHeight: 48 }}>
              <Icono size={22} color={si ? color.acento : color.textoTerciario} />
              <View style={{ flex: 1 }}>
                <Texto>{d.alias}</Texto>
                <Texto variante="nota" tono="terciario">
                  {[d.whatsapp && d.telefono ? `WhatsApp ${d.telefono}` : null, d.telegram ? (d.telegram_vinculado ? 'Telegram' : 'Telegram sin vincular') : null].filter(Boolean).join(' · ')}
                </Texto>
              </View>
            </Pressable>
          )
        })}
        <Campo etiqueta="Mensaje (opcional)" valor={mensaje} onCambio={setMensaje} multilinea />
        {resultado && <Texto variante="nota" tono={resultado.startsWith('Enviado a') ? 'exito' : 'alerta'} accessibilityLiveRegion="polite">{resultado}</Texto>}
        <Boton titulo={enviando ? 'Enviando…' : 'Enviar'} icono={Send} ancho tamano="grande" onPress={enviar}
          cargando={enviando} deshabilitado={!elegidos.length} />
      </View>
    </HojaInferior>
  )
}
