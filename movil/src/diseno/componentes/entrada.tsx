/**
 * Entrada de datos pensada para campo: campos grandes, un campo numérico con
 * pasos que se toca con guantes, control segmentado e interruptor.
 */
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native'
import * as Haptics from 'expo-haptics'
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { Minus, Plus, type LucideIcon } from 'lucide-react-native'
import { useTema } from '../tema'
import { ESPACIO, FUENTE, MOVIMIENTO, RADIO, TACTIL, TIPO } from '../tokens'
import { Texto } from './base'

export function Campo({ etiqueta, valor, onCambio, ayuda, error, icono: Icono, teclado, secreto, multilinea, placeholder, sinMayusculas, alEnviar }: {
  etiqueta: string; valor: string; onCambio: (v: string) => void; ayuda?: string; error?: string | null
  icono?: LucideIcon; teclado?: KeyboardTypeOptions; secreto?: boolean; multilinea?: boolean; placeholder?: string
  /** Códigos y usuarios: sin mayúscula inicial ni autocorrección. */
  sinMayusculas?: boolean; alEnviar?: () => void
}) {
  const { color } = useTema()
  const [foco, setFoco] = useState(false)
  const borde = error ? color.peligro : foco ? color.acento : color.borde
  return (
    <View style={{ gap: 6 }}>
      <Texto variante="nota" tono="secundario">{etiqueta}</Texto>
      <View style={[estilos.campo, { borderColor: borde, backgroundColor: color.superficie, borderWidth: foco || error ? 1.6 : 1 },
        multilinea && { minHeight: 104, alignItems: 'flex-start', paddingTop: ESPACIO.e3 }]}>
        {Icono && <Icono size={19} color={foco ? color.acento : color.textoTerciario} />}
        <TextInput accessibilityLabel={etiqueta} value={valor} onChangeText={onCambio} keyboardType={teclado} secureTextEntry={secreto}
          multiline={multilinea} placeholder={placeholder} autoCapitalize={sinMayusculas || secreto ? 'none' : 'sentences'}
          autoCorrect={!(sinMayusculas || secreto)} onSubmitEditing={alEnviar} returnKeyType={alEnviar ? 'go' : undefined} placeholderTextColor={color.textoTerciario} onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)} style={[TIPO.cuerpo, { flex: 1, color: color.texto, paddingVertical: 0 }]} />
      </View>
      {(error || ayuda) && <Texto variante="nota" tono={error ? 'peligro' : 'terciario'}>{error ?? ayuda}</Texto>}
    </View>
  )
}

/** Un número con botones grandes de más y menos: para profundidades, presiones, horas. */
export function CampoNumerico({ etiqueta, valor, onCambio, paso = 0.5, min = 0, max, unidad, decimales = 1, rango, previo }: {
  etiqueta: string; valor: number | null; onCambio: (v: number | null) => void; paso?: number; min?: number; max?: number
  unidad?: string; decimales?: number; rango?: { min?: number; max?: number }; previo?: number | null
}) {
  const { color } = useTema()
  const [texto, setTexto] = useState(valor == null ? '' : String(valor))
  const fuera = valor != null && rango && ((rango.min != null && valor < rango.min) || (rango.max != null && valor > rango.max))
  const fijar = (v: number | null) => {
    const r = v == null ? null : Math.max(min, max != null ? Math.min(max, v) : v)
    const redondeado = r == null ? null : Number(r.toFixed(decimales))
    setTexto(redondeado == null ? '' : String(redondeado))
    onCambio(redondeado)
  }
  const mover = (d: number) => { Haptics.selectionAsync(); fijar((valor ?? previo ?? 0) + d) }
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Texto variante="nota" tono="secundario">{etiqueta}</Texto>
        {previo != null && <Texto variante="nota" tono="terciario">Anterior {previo}{unidad ? ` ${unidad}` : ''}</Texto>}
      </View>
      <View style={[estilos.numerico, { backgroundColor: color.superficie, borderColor: fuera ? color.peligro : color.borde, borderWidth: fuera ? 1.6 : 1 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Restar ${paso}`} onPress={() => mover(-paso)} style={[estilos.paso, { backgroundColor: color.hundida }]}>
          <Minus size={22} color={color.texto} strokeWidth={2.4} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <TextInput accessibilityLabel={etiqueta} value={texto} keyboardType="decimal-pad" selectTextOnFocus
            onChangeText={t => { setTexto(t); const n = Number(t.replace(',', '.')); onCambio(t === '' || Number.isNaN(n) ? null : n) }}
            placeholder="—" placeholderTextColor={color.textoTerciario}
            style={[TIPO.cifra, { color: fuera ? color.peligro : color.texto, textAlign: 'center', width: Math.max(2, texto.length) * 22 + 12, paddingVertical: 0 }]} />
          {unidad && <Text style={[TIPO.cuerpoFuerte, { color: color.textoTerciario }]}>{unidad}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Sumar ${paso}`} onPress={() => mover(paso)} style={[estilos.paso, { backgroundColor: color.hundida }]}>
          <Plus size={22} color={color.texto} strokeWidth={2.4} />
        </Pressable>
      </View>
      {rango && (rango.min != null || rango.max != null) && (
        <Texto variante="nota" tono={fuera ? 'peligro' : 'terciario'}>
          {fuera ? 'Fuera de rango · ' : 'Rango '}{rango.min ?? '—'} a {rango.max ?? '—'}{unidad ? ` ${unidad}` : ''}
        </Texto>
      )}
    </View>
  )
}

export function Segmentado<T extends string>({ opciones, valor, onCambio }: { opciones: { valor: T; texto: string }[]; valor: T; onCambio: (v: T) => void }) {
  const { color, elevacion } = useTema()
  const [ancho, setAncho] = useState(0)
  const i = Math.max(0, opciones.findIndex(o => o.valor === valor))
  const w = ancho / opciones.length
  const deslizador = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(i * w, MOVIMIENTO.resorte) }], width: w }), [i, w])
  return (
    <View accessibilityRole="tablist" onLayout={e => setAncho(e.nativeEvent.layout.width - 8)} style={[estilos.segmentado, { backgroundColor: color.hundida }]}>
      {ancho > 0 && <Animated.View style={[estilos.deslizador, { backgroundColor: color.superficie }, elevacion(1), deslizador]} />}
      {opciones.map(o => (
        <Pressable key={o.valor} accessibilityRole="tab" accessibilityState={{ selected: o.valor === valor }}
          onPress={() => { Haptics.selectionAsync(); onCambio(o.valor) }} style={estilos.segmento}>
          <Text style={[TIPO.nota, { fontFamily: FUENTE.seminegrita, color: o.valor === valor ? color.texto : color.textoSecundario }]}>{o.texto}</Text>
        </Pressable>
      ))}
    </View>
  )
}

export function Interruptor({ valor, onCambio, etiqueta }: { valor: boolean; onCambio: (v: boolean) => void; etiqueta: string }) {
  const { color } = useTema()
  const bola = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(valor ? 22 : 0, MOVIMIENTO.resorte) }] }), [valor])
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={etiqueta} accessibilityState={{ checked: valor }} hitSlop={10}
      onPress={() => { Haptics.selectionAsync(); onCambio(!valor) }}
      style={[estilos.interruptor, { backgroundColor: valor ? color.acento : color.bordeFuerte }]}>
      <Animated.View style={[estilos.bola, { backgroundColor: color.superficie }, bola]} />
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  campo: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.e2, minHeight: 52, borderRadius: RADIO.grande, paddingHorizontal: ESPACIO.e4 },
  numerico: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIO.xl, padding: 6, minHeight: 72 },
  paso: { width: 60, height: 60, borderRadius: RADIO.grande, alignItems: 'center', justifyContent: 'center' },
  segmentado: { flexDirection: 'row', borderRadius: RADIO.medio + 2, padding: 4, minHeight: 44 },
  deslizador: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: RADIO.medio },
  segmento: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  interruptor: { width: 52, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center', minWidth: TACTIL - 4 },
  bola: { width: 24, height: 24, borderRadius: 12 },
})
