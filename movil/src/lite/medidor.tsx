/**
 * Medidor de profundidad Bluetooth.
 *
 * Los profundímetros digitales con Bluetooth se emparejan con el teléfono como
 * un TECLADO: al medir, «escriben» el valor y un Enter. En modo medidor la app
 * deja un campo invisible con el foco, sin abrir el teclado en pantalla, y cada
 * lectura llena el siguiente surco en orden: externo → central → interno.
 *
 * Emparejar se hace una vez en los ajustes de Bluetooth de Android; el botón
 * los abre directamente.
 */
import { useEffect, useRef, type ComponentRef } from 'react'
import { Linking, Platform, TextInput } from 'react-native'

export async function abrirBluetooth(): Promise<void> {
  if (Platform.OS === 'android') {
    try { await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS'); return } catch { /* sigue abajo */ }
  }
  await Linking.openSettings()
}

/** Lee lo que «escribe» el medidor. Devuelve cada lectura como número (mm). */
export function CapturaMedidor({ activo, onLectura }: { activo: boolean; onLectura: (mm: number) => void }) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null)
  const texto = useRef('')
  useEffect(() => {
    if (!activo) return
    const t = setInterval(() => { if (!ref.current?.isFocused()) ref.current?.focus() }, 800)
    ref.current?.focus()
    return () => clearInterval(t)
  }, [activo])
  if (!activo) return null
  const entregar = () => {
    const n = Number(texto.current.replace(',', '.').replace(/[^\d.]/g, ''))
    texto.current = ''
    ref.current?.clear()
    if (Number.isFinite(n) && n >= 0 && n <= 40) onLectura(Math.round(n * 10) / 10)
  }
  return (
    <TextInput ref={ref} showSoftInputOnFocus={false} autoCorrect={false} caretHidden blurOnSubmit={false}
      accessibilityLabel="Lecturas del medidor Bluetooth" importantForAccessibility="no"
      onChangeText={t => {
        texto.current = t
        // Algunos medidores mandan salto de línea en vez de Enter.
        if (/[\n\r\t]/.test(t)) entregar()
      }}
      onSubmitEditing={entregar}
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
  )
}
