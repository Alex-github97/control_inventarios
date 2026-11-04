/**
 * Piezas base del sistema de diseño: texto, botón, tarjeta, fila, chip,
 * separador y avatar. Todo toma color del tema y tamaño de los tokens.
 */
import { type ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import * as Haptics from 'expo-haptics'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { ChevronRight, type LucideIcon } from 'lucide-react-native'
import { useTema } from '../tema'
import { ESPACIO, FUENTE, MOVIMIENTO, RADIO, TACTIL, TIPO, type NivelElevacion, type VarianteTipo } from '../tokens'

type Tono = 'normal' | 'secundario' | 'terciario' | 'acento' | 'exito' | 'alerta' | 'peligro' | 'sobreAcento'

export function Texto({ variante = 'cuerpo', tono = 'normal', style, children, lineas, ...resto }: {
  variante?: VarianteTipo; tono?: Tono; style?: StyleProp<TextStyle>; children: ReactNode; lineas?: number
  accessibilityRole?: 'header' | 'text'; accessibilityLiveRegion?: 'none' | 'polite' | 'assertive'
}) {
  const { color } = useTema()
  const c = { normal: color.texto, secundario: color.textoSecundario, terciario: color.textoTerciario, acento: color.acento,
    exito: color.exito, alerta: color.alerta, peligro: color.peligro, sobreAcento: color.textoSobreAcento }[tono]
  const mayus = variante === 'mini'
  return (
    <Text numberOfLines={lineas} maxFontSizeMultiplier={1.6} {...resto}
      style={[TIPO[variante], { color: c }, mayus && { textTransform: 'uppercase' }, style]}>{children}</Text>
  )
}

const AnimadoPressable = Animated.createAnimatedComponent(Pressable)

/** Escala al presionar, con resorte: la respuesta táctil que se ve. */
function usePresion(escala = 0.97) {
  const s = useSharedValue(1)
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }))
  return {
    estilo,
    onPressIn: () => { s.set(withSpring(escala, MOVIMIENTO.resorte)) },
    onPressOut: () => { s.set(withSpring(1, MOVIMIENTO.resorte)) },
  }
}

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro'

export function Boton({ titulo, onPress, variante = 'primario', icono: Icono, cargando, deshabilitado, ancho = false, tamano = 'normal', vibrar = true, etiqueta }: {
  titulo: string; onPress?: () => void; variante?: VarianteBoton; icono?: LucideIcon; cargando?: boolean
  deshabilitado?: boolean; ancho?: boolean; tamano?: 'normal' | 'grande'; vibrar?: boolean; etiqueta?: string
}) {
  const { color } = useTema()
  const p = usePresion()
  const fondo = { primario: color.acento, secundario: color.acentoSuave, fantasma: 'transparent', peligro: color.peligro }[variante]
  const texto = { primario: color.textoSobreAcento, secundario: color.acentoSobreSuave, fantasma: color.acento, peligro: color.textoSobreAcento }[variante]
  const inactivo = deshabilitado || cargando
  return (
    <AnimadoPressable accessibilityRole="button" accessibilityLabel={etiqueta ?? titulo} accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      disabled={inactivo} onPressIn={p.onPressIn} onPressOut={p.onPressOut}
      onPress={() => { if (vibrar) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.() }}
      style={[p.estilo, estilos.boton, { backgroundColor: fondo, minHeight: tamano === 'grande' ? 56 : TACTIL, opacity: deshabilitado ? 0.45 : 1 },
        ancho && { alignSelf: 'stretch' }, variante === 'fantasma' && { paddingHorizontal: ESPACIO.e3 }]}>
      {cargando ? <ActivityIndicator color={texto} /> : (
        <>
          {Icono && <Icono size={tamano === 'grande' ? 22 : 19} color={texto} strokeWidth={2.2} />}
          <Text style={[TIPO.cuerpoFuerte, { color: texto, fontSize: tamano === 'grande' ? 17 : 15 }]}>{titulo}</Text>
        </>
      )}
    </AnimadoPressable>
  )
}

export function BotonIcono({ icono: Icono, onPress, etiqueta, tono = 'normal' }: { icono: LucideIcon; onPress?: () => void; etiqueta: string; tono?: 'normal' | 'acento' }) {
  const { color } = useTema()
  const p = usePresion(0.9)
  return (
    <AnimadoPressable accessibilityRole="button" accessibilityLabel={etiqueta} onPressIn={p.onPressIn} onPressOut={p.onPressOut}
      onPress={() => { Haptics.selectionAsync(); onPress?.() }}
      style={[p.estilo, estilos.botonIcono, { backgroundColor: tono === 'acento' ? color.acentoSuave : color.hundida }]}>
      <Icono size={21} color={tono === 'acento' ? color.acentoSobreSuave : color.texto} strokeWidth={2.1} />
    </AnimadoPressable>
  )
}

export function Tarjeta({ children, onPress, elevacion = 1, style, relleno = ESPACIO.e4, etiqueta }: {
  children: ReactNode; onPress?: () => void; elevacion?: NivelElevacion; style?: StyleProp<ViewStyle>; relleno?: number; etiqueta?: string
}) {
  const t = useTema()
  const p = usePresion(0.985)
  const base = [estilos.tarjeta, { backgroundColor: elevacion >= 2 && t.oscuro ? t.color.elevada : t.color.superficie, padding: relleno }, t.elevacion(elevacion), style]
  if (!onPress) return <View style={base}>{children}</View>
  return (
    <AnimadoPressable accessibilityRole="button" accessibilityLabel={etiqueta} onPressIn={p.onPressIn} onPressOut={p.onPressOut}
      onPress={() => { Haptics.selectionAsync(); onPress() }} style={[p.estilo, ...base]}>{children}</AnimadoPressable>
  )
}

export function Fila({ titulo, detalle, icono: Icono, colorIcono, derecha, onPress, ultima }: {
  titulo: string; detalle?: string; icono?: LucideIcon; colorIcono?: string; derecha?: ReactNode; onPress?: () => void; ultima?: boolean
}) {
  const { color } = useTema()
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={detalle ? `${titulo}, ${detalle}` : titulo}
      onPress={onPress ? () => { Haptics.selectionAsync(); onPress() } : undefined}
      style={({ pressed }) => [estilos.fila, { backgroundColor: pressed ? color.hundida : 'transparent' }]}>
      {Icono && (
        <View style={[estilos.filaIcono, { backgroundColor: (colorIcono ?? color.acento) + '1F' }]}>
          <Icono size={20} color={colorIcono ?? color.acento} strokeWidth={2.1} />
        </View>
      )}
      <View style={[estilos.filaCuerpo, !ultima && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.borde }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="cuerpoFuerte" lineas={2}>{titulo}</Texto>
          {detalle && <Texto variante="nota" tono="secundario" lineas={2}>{detalle}</Texto>}
        </View>
        {derecha}
        {onPress && <ChevronRight size={18} color={color.textoTerciario} />}
      </View>
    </Pressable>
  )
}

export type TonoChip = 'neutro' | 'acento' | 'exito' | 'alerta' | 'peligro' | 'moderada'

export function Chip({ texto, tono = 'neutro', punto = true }: { texto: string; tono?: TonoChip; punto?: boolean }) {
  const { color } = useTema()
  const [fg, bg] = {
    neutro: [color.textoSecundario, color.hundida], acento: [color.acentoSobreSuave, color.acentoSuave], exito: [color.exito, color.exitoSuave],
    alerta: [color.alerta, color.alertaSuave], peligro: [color.peligro, color.peligroSuave], moderada: [color.moderada, color.moderadaSuave],
  }[tono]
  return (
    <View style={[estilos.chip, { backgroundColor: bg }]} accessibilityLabel={texto}>
      {punto && <View style={[estilos.punto, { backgroundColor: fg }]} />}
      <Text style={[TIPO.nota, { color: fg, fontFamily: FUENTE.seminegrita, fontSize: 12 }]}>{texto}</Text>
    </View>
  )
}

export function Seccion({ titulo, accion, onAccion, children }: { titulo: string; accion?: string; onAccion?: () => void; children: ReactNode }) {
  return (
    <View style={{ gap: ESPACIO.e3 }}>
      <View style={estilos.seccionCab}>
        <Texto variante="mini" tono="terciario" accessibilityRole="header">{titulo}</Texto>
        {accion && <Pressable accessibilityRole="button" onPress={onAccion} hitSlop={12}><Texto variante="nota" tono="acento">{accion}</Texto></Pressable>}
      </View>
      {children}
    </View>
  )
}

export function Avatar({ nombre, tamano = 40, onPress }: { nombre: string; tamano?: number; onPress?: () => void }) {
  const { color } = useTema()
  const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('')
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={nombre} disabled={!onPress} onPress={onPress}
      style={{ width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: color.acentoSuave, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[TIPO.cuerpoFuerte, { color: color.acentoSobreSuave, fontSize: tamano * 0.38 }]}>{iniciales}</Text>
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ESPACIO.e2, paddingHorizontal: ESPACIO.e5, borderRadius: RADIO.grande },
  botonIcono: { width: TACTIL, height: TACTIL, borderRadius: RADIO.total, alignItems: 'center', justifyContent: 'center' },
  tarjeta: { borderRadius: RADIO.xl },
  fila: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.e3, paddingLeft: ESPACIO.e4, minHeight: 60 },
  filaIcono: { width: 38, height: 38, borderRadius: RADIO.medio, alignItems: 'center', justifyContent: 'center' },
  filaCuerpo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: ESPACIO.e2, paddingVertical: ESPACIO.e3, paddingRight: ESPACIO.e4, minHeight: 60 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, borderRadius: RADIO.total, alignSelf: 'flex-start' },
  punto: { width: 6, height: 6, borderRadius: 3 },
  seccionCab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: ESPACIO.e1 },
})
