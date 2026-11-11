/**
 * La identidad de TittanWare en las apps: el logo corporativo (aro y marca,
 * el mismo del ícono) y la cabecera oscura de TittanLite con el logo.
 */
import type { ReactNode } from 'react'
import { Image, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import { ESPACIO, RADIO, Texto, useTema } from '@/diseno'

const LOGO = require('../../assets/marca/logo.png')
const LOGO_PEQUENO = require('../../assets/marca/logo-pequeno.png')

/** El logo en su disco blanco. Pequeño, sin el lema (a ese tamaño no se lee). */
export function LogoTW({ tamano = 40 }: { tamano?: number }) {
  return (
    <Image source={tamano > 72 ? LOGO : LOGO_PEQUENO} accessibilityLabel="TittanWare" accessibilityRole="image"
      style={{ width: tamano, height: tamano }} resizeMode="contain" />
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
