/**
 * Piezas de TittanLite: sugerencias tocables (marcas, referencias, medidas que
 * ya existen en la cuenta), la cámara para fotos y la fila de fotos tomadas.
 */
import { useRef, useState } from 'react'
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Camera, X } from 'lucide-react-native'
import { Boton, ESPACIO, HojaInferior, RADIO, Texto, useTema } from '@/diseno'
import type { FotoPendiente } from '@/datos/lite'

export const TIPO_FOTO: Record<FotoPendiente['tipo'], string> = {
  NUMERO: 'Número', DANO: 'Daño', BANDA: 'Banda', OTRA: 'Otra',
}

/** Opciones que ya existen en la cuenta, filtradas por lo escrito. Se puede escribir otra. */
export function Sugerencias({ opciones, texto, onElegir, maximo = 6 }: {
  opciones: string[]; texto: string; onElegir: (v: string) => void; maximo?: number
}) {
  const { color } = useTema()
  const t = texto.trim().toLowerCase()
  const visibles = opciones.filter(o => o && (!t || o.toLowerCase().includes(t)) && o.toLowerCase() !== t).slice(0, maximo)
  if (!visibles.length) return null
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: ESPACIO.e2, paddingVertical: 2 }}>
      {visibles.map(o => (
        <Pressable key={o} accessibilityRole="button" accessibilityLabel={`Usar ${o}`} onPress={() => onElegir(o)}
          style={[estilos.sugerencia, { backgroundColor: color.acentoSuave }]}>
          <Texto variante="nota" style={{ color: color.acentoSobreSuave }}>{o}</Texto>
        </Pressable>
      ))}
    </ScrollView>
  )
}

/** Chips que se encienden y apagan (novedades de la llanta). */
export function Marcables({ opciones, elegidas, onCambio }: {
  opciones: { clave: string; nombre: string }[]; elegidas: string[]; onCambio: (v: string[]) => void
}) {
  const { color } = useTema()
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.e2 }}>
      {opciones.map(o => {
        const si = elegidas.includes(o.clave)
        return (
          <Pressable key={o.clave} accessibilityRole="checkbox" accessibilityState={{ checked: si }} accessibilityLabel={o.nombre}
            onPress={() => onCambio(si ? elegidas.filter(x => x !== o.clave) : [...elegidas, o.clave])}
            style={[estilos.marcable, { backgroundColor: si ? color.alertaSuave : color.hundida, borderColor: si ? color.alerta : 'transparent' }]}>
            <Texto variante="nota" style={{ color: si ? color.alerta : color.textoSecundario }}>{o.nombre}</Texto>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Cámara en una hoja inferior: se elige qué muestra la foto y se toma. */
export function TomarFoto({ visible, onCerrar, onFoto, tipos = ['DANO', 'BANDA', 'NUMERO', 'OTRA'] }: {
  visible: boolean; onCerrar: () => void; onFoto: (f: FotoPendiente) => void; tipos?: FotoPendiente['tipo'][]
}) {
  const { color } = useTema()
  const ref = useRef<CameraView>(null)
  const [permiso, pedir] = useCameraPermissions()
  const [tipo, setTipo] = useState<FotoPendiente['tipo']>(tipos[0])
  const [tomando, setTomando] = useState(false)
  const tomar = async () => {
    if (!ref.current || tomando) return
    setTomando(true)
    try {
      const f = await ref.current.takePictureAsync({ quality: 0.6 })
      if (f?.uri) { onFoto({ uri: f.uri, tipo }); onCerrar() }
    } finally { setTomando(false) }
  }
  return (
    <HojaInferior visible={visible} onCerrar={onCerrar} titulo="Tomar foto">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.e2, marginBottom: ESPACIO.e3 }}>
        {tipos.map(t => (
          <Pressable key={t} accessibilityRole="radio" accessibilityState={{ selected: tipo === t }} onPress={() => setTipo(t)}
            style={[estilos.marcable, { backgroundColor: tipo === t ? color.acentoSuave : color.hundida, borderColor: tipo === t ? color.acento : 'transparent' }]}>
            <Texto variante="nota" style={{ color: tipo === t ? color.acentoSobreSuave : color.textoSecundario }}>{TIPO_FOTO[t]}</Texto>
          </Pressable>
        ))}
      </View>
      {Platform.OS === 'web' || !permiso?.granted ? (
        <View style={[estilos.camara, { backgroundColor: color.hundida, alignItems: 'center', justifyContent: 'center', gap: ESPACIO.e3 }]}>
          <Camera size={36} color={color.textoTerciario} />
          {Platform.OS !== 'web'
            ? <Boton titulo="Permitir la cámara" variante="secundario" onPress={pedir} />
            : <Texto variante="nota" tono="terciario">La cámara funciona en el teléfono</Texto>}
        </View>
      ) : (
        <View style={estilos.camara}><CameraView ref={ref} style={StyleSheet.absoluteFill} facing="back" /></View>
      )}
      <View style={{ marginTop: ESPACIO.e3 }}>
        <Boton titulo={tomando ? 'Tomando…' : 'Tomar foto'} icono={Camera} ancho tamano="grande" onPress={tomar}
          deshabilitado={Platform.OS === 'web' || !permiso?.granted} cargando={tomando} />
      </View>
    </HojaInferior>
  )
}

export function FilaFotos({ fotos, onQuitar }: { fotos: FotoPendiente[]; onQuitar: (i: number) => void }) {
  const { color } = useTema()
  if (!fotos.length) return null
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: ESPACIO.e2 }}>
      {fotos.map((f, i) => (
        <View key={`${f.uri}-${i}`} style={[estilos.miniatura, { backgroundColor: color.hundida }]}>
          <Image source={{ uri: f.uri }} style={StyleSheet.absoluteFill} accessibilityLabel={`Foto: ${TIPO_FOTO[f.tipo]}`} />
          <View style={[estilos.rotulo, { backgroundColor: color.sombra }]}>
            <Texto variante="mini" style={{ color: color.superficie }}>{TIPO_FOTO[f.tipo]}</Texto>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Quitar foto" onPress={() => onQuitar(i)}
            style={[estilos.quitar, { backgroundColor: color.superficie }]}>
            <X size={14} color={color.peligro} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  sugerencia: { paddingHorizontal: 12, height: 32, borderRadius: RADIO.total, justifyContent: 'center' },
  marcable: { paddingHorizontal: 12, minHeight: 36, borderRadius: RADIO.total, justifyContent: 'center', borderWidth: 1.5 },
  camara: { height: 320, borderRadius: RADIO.xl, overflow: 'hidden' },
  miniatura: { width: 84, height: 84, borderRadius: RADIO.medio, overflow: 'hidden' },
  rotulo: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 2, alignItems: 'center' },
  quitar: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
})
