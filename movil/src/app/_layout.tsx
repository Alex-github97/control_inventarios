/**
 * Raíz de la app: fuentes, pantalla de bienvenida, gestos, áreas seguras, tema y sesión.
 */
import { useEffect } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { Stack, type ErrorBoundaryProps } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts,
} from '@expo-google-fonts/inter'
import { CLARO, ProveedorTema, useTema } from '@/diseno'
import { ProveedorSesion } from '@/datos/sesion'

SplashScreen.preventAutoHideAsync()

/**
 * Si una pantalla falla al dibujarse, se muestra qué pasó y se puede reintentar,
 * en vez de dejar la pantalla vacía. Usa componentes básicos a propósito: si el
 * error vino del tema o de las fuentes, esto igual se ve.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}) }, [])
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: CLARO.fondo }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: CLARO.texto }}>Algo falló al abrir esta pantalla</Text>
      <Text style={{ fontSize: 15, color: CLARO.textoSecundario }}>
        Toque «Reintentar». Si se repite, envíele este mensaje a su administrador:
      </Text>
      <View style={{ backgroundColor: CLARO.superficie, borderRadius: 12, padding: 12 }}>
        <Text selectable style={{ fontSize: 13, color: CLARO.peligro }}>{error?.message || String(error)}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={retry}
        style={{ backgroundColor: CLARO.acento, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: CLARO.textoSobreAcento, fontSize: 16, fontWeight: '700' }}>Reintentar</Text>
      </Pressable>
    </ScrollView>
  )
}

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
