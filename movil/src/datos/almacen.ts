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
  try {
    return await SecureStore.getItemAsync(clave)
  } catch {
    // Android no puede descifrar el dato: pasa al reinstalar la app, cuando el
    // sistema restaura el valor pero la llave del Keystore ya no existe. Se
    // borra y se sigue como si no hubiera nada: la persona vuelve a ingresar.
    // Antes este error dejaba la app cargando para siempre, con la pantalla vacía.
    try { await SecureStore.deleteItemAsync(clave) } catch { /* nada que borrar */ }
    return null
  }
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
