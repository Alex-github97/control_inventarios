/**
 * Cómo trabaja cada inspector: en qué orden recorre las llantas, en qué orden
 * toma los datos de cada una, si usa medidor Bluetooth, y la «memoria» de lo que
 * más registra (novedades, códigos de daño y observaciones) para no digitar dos
 * veces lo mismo. Se guarda en el teléfono.
 */
import { useCallback, useEffect, useState } from 'react'
import { kv } from '@/datos/kv'
import type { PosicionLite } from '@/datos/lite'

export type Ruta = 'izq_der' | 'der_izq' | 'perimetral'
export type Paso = 'profundidades' | 'presion' | 'novedades' | 'fotos' | 'llanta'

export const RUTAS: { valor: Ruta; texto: string; detalle: string }[] = [
  { valor: 'izq_der', texto: 'Eje por eje, izquierda a derecha', detalle: 'Del primer eje al último; en cada eje, de la llanta izquierda externa a la derecha externa.' },
  { valor: 'der_izq', texto: 'Eje por eje, derecha a izquierda', detalle: 'Igual, empezando cada eje por la derecha.' },
  { valor: 'perimetral', texto: 'Alrededor del vehículo', detalle: 'Lado izquierdo de adelante hacia atrás y vuelve por el derecho de atrás hacia adelante.' },
]
export const PASOS: Record<Paso, string> = {
  profundidades: 'Profundidades', presion: 'Presión', novedades: 'Novedades y observación', fotos: 'Fotos', llanta: 'Datos de la llanta',
}

export interface Preferencias {
  ruta: Ruta
  pasos: Paso[]
  avanceAutomatico: boolean      // al completar los 3 surcos con el medidor, pasa a la siguiente llanta
  medidor: boolean               // modo medidor Bluetooth activo
}
export interface Memoria {
  novedades: Record<string, number>
  danos: Record<number, number>
  observaciones: string[]
}

const K_PREF = 'lite.preferencias'
const K_MEM = 'lite.memoria'
export const PREF_INICIAL: Preferencias = {
  ruta: 'izq_der', pasos: ['profundidades', 'presion', 'novedades', 'fotos', 'llanta'], avanceAutomatico: true, medidor: false,
}
const MEM_INICIAL: Memoria = { novedades: {}, danos: {}, observaciones: [] }

async function leer<T>(k: string, d: T): Promise<T> {
  try { const v = await kv.leer(k); return v ? { ...d, ...JSON.parse(v) } : d } catch { return d }
}

export function usePreferencias() {
  const [pref, setPref] = useState<Preferencias>(PREF_INICIAL)
  const [memoria, setMemoria] = useState<Memoria>(MEM_INICIAL)
  useEffect(() => {
    leer(K_PREF, PREF_INICIAL).then(setPref)
    leer(K_MEM, MEM_INICIAL).then(setMemoria)
  }, [])
  const cambiar = useCallback((c: Partial<Preferencias>) => setPref(p => {
    const n = { ...p, ...c }
    kv.escribir(K_PREF, JSON.stringify(n))
    return n
  }), [])
  /** Recuerda lo que se acaba de registrar para proponerlo primero la próxima vez. */
  const recordar = useCallback((r: { novedades?: string[]; dano?: number | null; observacion?: string | null }) => setMemoria(m => {
    const n: Memoria = { novedades: { ...m.novedades }, danos: { ...m.danos }, observaciones: [...m.observaciones] }
    for (const k of r.novedades ?? []) n.novedades[k] = (n.novedades[k] ?? 0) + 1
    if (r.dano) n.danos[r.dano] = (n.danos[r.dano] ?? 0) + 1
    const o = r.observacion?.trim()
    if (o) n.observaciones = [o, ...n.observaciones.filter(x => x.toLowerCase() !== o.toLowerCase())].slice(0, 12)
    kv.escribir(K_MEM, JSON.stringify(n))
    return n
  }), [])
  return { pref, cambiar, memoria, recordar }
}

/** Las posiciones en el orden en que el inspector las recorre. */
export function ordenar(posiciones: PosicionLite[], ruta: Ruta): PosicionLite[] {
  const izq = (p: PosicionLite) => p.lado.toUpperCase().startsWith('I')
  const ext = (p: PosicionLite) => (/EXT/i.test(p.codigo) ? 0 : /INT/i.test(p.codigo) ? 1 : 0.5)
  const ejes = posiciones.filter(p => p.eje > 0)
  const resto = posiciones.filter(p => p.eje <= 0)
  const porEje = [...new Set(ejes.map(p => p.eje))].sort((a, b) => a - b)
  if (ruta === 'perimetral') {
    const lado = (es: boolean, desc: boolean) => ejes.filter(p => izq(p) === es)
      .sort((a, b) => (desc ? b.eje - a.eje : a.eje - b.eje) || ext(a) - ext(b))
    return [...lado(true, false), ...lado(false, true), ...resto]
  }
  const salida: PosicionLite[] = []
  for (const e of porEje) {
    const del = ejes.filter(p => p.eje === e)
    const i = del.filter(izq).sort((a, b) => ext(a) - ext(b))            // izquierda: externa → interna
    const d = del.filter(p => !izq(p)).sort((a, b) => ext(b) - ext(a))   // derecha: interna → externa
    salida.push(...(ruta === 'izq_der' ? [...i, ...d] : [...d.reverse(), ...i.reverse()]))
  }
  return [...salida, ...resto]
}
