/** Vista previa web: localStorage (el SQLite de expo-sqlite en web exige un worker). */
export const kv = {
  leer: async (k: string): Promise<string | null> => { try { return localStorage.getItem(k) } catch { return null } },
  escribir: async (k: string, v: string): Promise<void> => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } },
}
