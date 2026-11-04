/**
 * Raíz de la app: fuentes, pantalla de bienvenida, gestos, áreas seguras, tema y sesión.
 */
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts,
} from '@expo-google-fonts/inter'
import { ProveedorTema, useTema } from '@/diseno'
import { ProveedorSesion } from '@/datos/sesion'

SplashScreen.preventAutoHideAsync()

function Navegacion() {
  const { color, oscuro } = useTema()
  return (
    <>
      <StatusBar style={oscuro ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.fondo }, animation: 'slide_from_right' }} />
    </>
  )
}

export default function Raiz() {
  const [cargadas, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold })
  useEffect(() => { if (cargadas || error) SplashScreen.hideAsync() }, [cargadas, error])
  if (!cargadas && !error) return null
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ProveedorTema>
          <ProveedorSesion>
            <Navegacion />
          </ProveedorSesion>
        </ProveedorTema>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
