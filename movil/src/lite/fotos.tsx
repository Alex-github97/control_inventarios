/**
 * Fotos de una llanta: con la cámara o desde la galería (la del sistema, que
 * abre al instante). Se guardan en la cola y suben con el registro; salen en el
 * informe PDF de TittanLite.
 */
import { useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera, Image as Galeria, X } from 'lucide-react-native'
import { Boton, ESPACIO, RADIO, Texto, useTema } from '@/diseno'
import type { FotoPendiente } from '@/datos/lite'

export const TIPO_FOTO: Record<FotoPendiente['tipo'], string> = { NUMERO: 'Número', DANO: 'Daño', BANDA: 'Banda', OTRA: 'Otra' }

export function Fotos({ fotos, onCambio, tipos = ['DANO', 'BANDA', 'NUMERO', 'OTRA'], posicion }: {
  fotos: FotoPendiente[]; onCambio: (f: FotoPendiente[]) => void; tipos?: FotoPendiente['tipo'][]; posicion?: string
}) {
  const { color } = useTema()
  const [tipo, setTipo] = useState<FotoPendiente['tipo']>(tipos[0])
  const [error, setError] = useState<string | null>(null)
  const agregar = (uris: string[]) => onCambio([...fotos, ...uris.map(uri => ({ uri, tipo, posicion }))])
  const camara = async () => {
    setError(null)
    const p = await ImagePicker.requestCameraPermissionsAsync()
    if (!p.granted) { setError('Permita la cámara en los ajustes del teléfono'); return }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6 })
    if (!r.canceled) agregar(r.assets.map(a => a.uri))
  }
  const galeria = async () => {
    setError(null)
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 6, quality: 0.6 })
    if (!r.canceled) agregar(r.assets.map(a => a.uri))
  }
  return (
    <View style={{ gap: ESPACIO.e2 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.e2 }}>
        {tipos.map(t => (
          <Pressable key={t} accessibilityRole="radio" accessibilityState={{ selected: tipo === t }} onPress={() => setTipo(t)}
            style={[estilos.tipo, { backgroundColor: tipo === t ? color.acentoSuave : color.hundida, borderColor: tipo === t ? color.acento : 'transparent' }]}>
            <Texto variante="nota" style={{ color: tipo === t ? color.acentoSobreSuave : color.textoSecundario }}>{TIPO_FOTO[t]}</Texto>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: ESPACIO.e2 }}>
        <View style={{ flex: 1 }}><Boton titulo="Cámara" icono={Camera} variante="secundario" ancho onPress={camara} /></View>
        <View style={{ flex: 1 }}><Boton titulo="Galería" icono={Galeria} variante="secundario" ancho onPress={galeria} /></View>
      </View>
      {error && <Texto variante="nota" tono="peligro">{error}</Texto>}
      {fotos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: ESPACIO.e2 }}>
          {fotos.map((f, i) => (
            <View key={`${f.uri}-${i}`} style={[estilos.mini, { backgroundColor: color.hundida }]}>
              <Image source={{ uri: f.uri }} style={StyleSheet.absoluteFill} accessibilityLabel={`Foto: ${TIPO_FOTO[f.tipo]}`} />
              <View style={[estilos.rotulo, { backgroundColor: color.sombra }]}>
                <Texto variante="mini" style={{ color: color.superficie }}>{TIPO_FOTO[f.tipo]}</Texto>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Quitar foto" hitSlop={8}
                onPress={() => onCambio(fotos.filter((_, j) => j !== i))} style={[estilos.quitar, { backgroundColor: color.superficie }]}>
                <X size={14} color={color.peligro} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const estilos = StyleSheet.create({
  tipo: { paddingHorizontal: 12, minHeight: 34, borderRadius: RADIO.total, justifyContent: 'center', borderWidth: 1.5 },
  mini: { width: 84, height: 84, borderRadius: RADIO.medio, overflow: 'hidden' },
  rotulo: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 2, alignItems: 'center' },
  quitar: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
})
