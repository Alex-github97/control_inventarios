/** Entrada: con el teléfono vinculado, a su inicio (órdenes o TittanLite); si no, al ingreso. */
import { ActivityIndicator, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useTema } from '@/diseno'
import { useSesion } from '@/datos/sesion'
import { RUTA_INICIO } from '@/datos/variante'

export default function Inicio() {
  const { cargando, usuario } = useSesion()
  const { color } = useTema()
  // Mientras lee la sesión guardada se ve que está trabajando, no una pantalla vacía.
  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fondo }}>
        <ActivityIndicator size="large" color={color.acento} />
      </View>
    )
  }
  return <Redirect href={usuario ? RUTA_INICIO : '/ingreso'} />
}
