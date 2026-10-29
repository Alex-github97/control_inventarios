/**
 * Listas que el servidor entrega por trozos.
 *
 * Con una flota grande algunas listas eran decenas de miles de filas: el
 * servidor tardaba en armarlas (y en producción eso tumbaba el proceso) y el
 * navegador se congelaba pintándolas. Esas rutas aceptan `limite` y
 * `desplazamiento` y mandan el total en la cabecera `X-Total-Count`.
 */
import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client'

export interface Pagina<T> { filas: T[]; total: number }

export async function pedirPagina<T>(url: string, params: Record<string, unknown>): Promise<Pagina<T>> {
  const r = await apiClient.get<T[]>(url, { params })
  return { filas: r.data, total: Number(r.headers['x-total-count'] ?? r.data.length) }
}

/** El valor, pero solo cuando dejó de cambiar: para no consultar con cada tecla. */
export function useRetardado<T>(valor: T, ms = 350): T {
  const [v, setV] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return v
}
