/**
 * Dónde se guardan los secretos: en el teléfono, el almacén cifrado del sistema
 * (Keystore de Android); en la vista previa web, localStorage. La web es solo
 * para revisar pantallas: no es un lugar seguro y la app real no la usa.
 */
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

export async function leer(clave: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(clave) } catch { return null }
  }
  return SecureStore.getItemAsync(clave)
}

export async function guardar(clave: string, valor: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (valor == null) localStorage.removeItem(clave)
      else localStorage.setItem(clave, valor)
    } catch { /* sin almacenamiento */ }
    return
  }
  if (valor == null) await SecureStore.deleteItemAsync(clave)
  else await SecureStore.setItemAsync(clave, valor)
}
