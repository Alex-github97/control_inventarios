/**
 * Superficies de pantalla: la pantalla con título grande, la hoja inferior,
 * el estado vacío, el aviso de sincronización y el escáner de códigos.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { CloudOff, RefreshCw, ScanLine, type LucideIcon } from 'lucide-react-native'
import { useTema } from '../tema'
import { ESPACIO, RADIO } from '../tokens'
import { Boton, Texto } from './base'

export function Pantalla({ titulo, subtitulo, accion, children, desplazable = true }: {
  titulo?: string; subtitulo?: string; accion?: ReactNode; children: ReactNode; desplazable?: boolean
}) {
  const { color } = useTema()
  const borde = useSafeAreaInsets()
  const cabecera = titulo ? (
    <View style={estilos.cabecera}>
      <View style={{ flex: 1, gap: 2 }}>
        {subtitulo && <Texto variante="nota" tono="terciario">{subtitulo}</Texto>}
        <Texto variante="titulo" accessibilityRole="header">{titulo}</Texto>
      </View>
      {accion}
    </View>
  ) : null
  const contenido = <View style={{ gap: ESPACIO.e6, paddingHorizontal: ESPACIO.e4, paddingBottom: borde.bottom + ESPACIO.e10 }}>{cabecera}{children}</View>
  return (
    <View style={{ flex: 1, backgroundColor: color.fondo, paddingTop: borde.top + ESPACIO.e2 }}>
      {desplazable ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>{contenido}</ScrollView> : contenido}
    </View>
  )
}

export function HojaInferior({ visible, onCerrar, titulo, children }: { visible: boolean; onCerrar: () => void; titulo?: string; children: ReactNode }) {
  const { color } = useTema()
  const borde = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      {visible && (
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(100)} style={[StyleSheet.absoluteFill, { backgroundColor: color.velo }]}>
            <Pressable accessibilityLabel="Cerrar" style={{ flex: 1 }} onPress={onCerrar} />
          </Animated.View>
          <Animated.View entering={SlideInDown.duration(160)} exiting={SlideOutDown.duration(120)}
            style={[estilos.hoja, { backgroundColor: color.elevada, paddingBottom: borde.bottom + ESPACIO.e4 }]}>
            <View style={[estilos.asa, { backgroundColor: color.bordeFuerte }]} />
            {titulo && <Texto variante="subtitulo" style={{ marginBottom: ESPACIO.e3 }}>{titulo}</Texto>}
            {children}
          </Animated.View>
        </View>
      )}
    </Modal>
  )
}

export function EstadoVacio({ icono: Icono, titulo, detalle, accion, onAccion }: {
  icono: LucideIcon; titulo: string; detalle?: string; accion?: string; onAccion?: () => void
}) {
  const { color } = useTema()
  return (
    <View style={{ alignItems: 'center', gap: ESPACIO.e3, paddingVertical: ESPACIO.e10 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: color.acentoSuave, alignItems: 'center', justifyContent: 'center' }}>
        <Icono size={32} color={color.acentoSobreSuave} strokeWidth={1.8} />
      </View>
      <Texto variante="subtitulo" style={{ textAlign: 'center' }}>{titulo}</Texto>
      {detalle && <Texto tono="secundario" style={{ textAlign: 'center', maxWidth: 300 }}>{detalle}</Texto>}
      {accion && <Boton titulo={accion} onPress={onAccion} variante="secundario" />}
    </View>
  )
}

/** La franja de estado: sin señal, pendientes por enviar, rechazados. */
export function AvisoSincronizacion({ enLinea, pendientes, rechazados, ultima, onSincronizar }: {
  enLinea: boolean; pendientes: number; rechazados: number; ultima?: string; onSincronizar?: () => void
}) {
  const { color } = useTema()
  const tono = rechazados ? color.peligro : !enLinea ? color.alerta : color.exito
  const fondo = rechazados ? color.peligroSuave : !enLinea ? color.alertaSuave : color.exitoSuave
  const texto = rechazados ? `${rechazados} registro${rechazados > 1 ? 's' : ''} necesita${rechazados > 1 ? 'n' : ''} atención`
    : !enLinea ? `Sin señal · ${pendientes} por enviar` : pendientes ? `Enviando ${pendientes}…` : `Sincronizado${ultima ? ` · ${ultima}` : ''}`
  const Icono = !enLinea ? CloudOff : RefreshCw
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${texto}. Sincronizar`} onPress={onSincronizar}
      style={[estilos.aviso, { backgroundColor: fondo }]}>
      <Icono size={16} color={tono} strokeWidth={2.4} />
      <Texto variante="nota" style={{ color: tono, flex: 1 }}>{texto}</Texto>
      {enLinea && <Texto variante="nota" style={{ color: tono }}>Sincronizar</Texto>}
    </Pressable>
  )
}

/** Lee QR y códigos de barras. En la web (vista previa) muestra un marco simulado. */
export function Escaner({ onCodigo, tipos = ['qr', 'code128', 'ean13'] }: {
  onCodigo: (codigo: string) => void; tipos?: ('qr' | 'code128' | 'ean13' | 'code39' | 'datamatrix')[]
}) {
  const { color } = useTema()
  const [permiso, pedirPermiso] = useCameraPermissions()
  const [leido, setLeido] = useState(false)
  useEffect(() => { if (permiso && !permiso.granted && permiso.canAskAgain) pedirPermiso() }, [permiso, pedirPermiso])
  const marco = (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
      <View style={[estilos.marco, { borderColor: color.acento }]} />
      <Texto variante="nota" style={{ color: color.superficie, marginTop: ESPACIO.e4 }}>Apunte al código del activo o la llanta</Texto>
    </View>
  )
  if (Platform.OS === 'web' || !permiso?.granted) {
    return (
      <View style={[estilos.camara, { backgroundColor: color.sombra, alignItems: 'center', justifyContent: 'center' }]}>
        <ScanLine size={40} color={color.acento} />
        {marco}
        {Platform.OS !== 'web' && <Boton titulo="Permitir la cámara" onPress={pedirPermiso} variante="secundario" />}
      </View>
    )
  }
  return (
    <View style={estilos.camara}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: tipos }}
        onBarcodeScanned={leido ? undefined : r => { setLeido(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onCodigo(r.data) }} />
      {marco}
    </View>
  )
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'flex-end', gap: ESPACIO.e3, paddingTop: ESPACIO.e2 },
  hoja: { borderTopLeftRadius: RADIO.xl + 4, borderTopRightRadius: RADIO.xl + 4, paddingHorizontal: ESPACIO.e5, paddingTop: ESPACIO.e2, gap: ESPACIO.e3, maxHeight: '88%' },
  asa: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: ESPACIO.e2 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.e2, paddingHorizontal: ESPACIO.e4, minHeight: 44, borderRadius: RADIO.grande },
  camara: { height: 300, borderRadius: RADIO.xl, overflow: 'hidden' },
  marco: { width: 210, height: 210, borderWidth: 3, borderRadius: RADIO.xl },
})
