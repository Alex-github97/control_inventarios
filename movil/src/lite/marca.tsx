/**
 * La identidad de TittanWare en TittanLite: el distintivo «TW» (el mismo del
 * portal y del ícono de la app) y la cabecera oscura con el logo.
 */
import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import { ESPACIO, RADIO, Texto, useTema } from '@/diseno'

export function LogoTW({ tamano = 40 }: { tamano?: number }) {
  const { color } = useTema()
  return (
    <View accessibilityLabel="TittanWare" style={{ width: tamano, height: tamano, borderRadius: tamano * 0.26,
      backgroundColor: color.acento, alignItems: 'center', justifyContent: 'center' }}>
      <Texto variante="cuerpoFuerte" style={{ color: color.textoSobreAcento, fontSize: tamano * 0.42, lineHeight: tamano * 0.5,
        letterSpacing: -tamano * 0.02, fontFamily: 'Inter_800ExtraBold' }}>TW</Texto>
    </View>
  )
}

/** Cabecera oscura de la marca: logo, título y una acción a la derecha. */
export function CabeceraLite({ titulo, subtitulo, accion, volver }: {
  titulo: string; subtitulo?: string; accion?: ReactNode; volver?: () => void
}) {
  const { color } = useTema()
  const borde = useSafeAreaInsets()
  return (
    <View style={{ backgroundColor: color.sombra, paddingTop: borde.top + ESPACIO.e3, paddingBottom: ESPACIO.e4,
      paddingHorizontal: ESPACIO.e4, flexDirection: 'row', alignItems: 'center', gap: ESPACIO.e3,
      borderBottomLeftRadius: RADIO.xl, borderBottomRightRadius: RADIO.xl }}>
      {volver ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={volver} hitSlop={12}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.velo }}>
          <ArrowLeft size={22} color={color.textoSobreAcento} />
        </Pressable>
      ) : <LogoTW tamano={40} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        {subtitulo && <Texto variante="nota" lineas={1} style={{ color: color.bordeFuerte }}>{subtitulo}</Texto>}
        <Texto variante="subtitulo" lineas={1} style={{ color: color.textoSobreAcento }}>{titulo}</Texto>
      </View>
      {accion}
    </View>
  )
}
