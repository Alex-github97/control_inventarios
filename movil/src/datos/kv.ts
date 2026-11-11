/**
 * Almacén clave-valor del teléfono para lo que TittanLite guarda sin señal
 * (catálogos, vehículos, la cola de envíos). En Android, SQLite; la vista
 * previa web usa `kv.web.ts`.
 */
import Storage from 'expo-sqlite/kv-store'

export const kv = {
  leer: (k: string) => Storage.getItemAsync(k),
  escribir: (k: string, v: string) => Storage.setItemAsync(k, v),
}
