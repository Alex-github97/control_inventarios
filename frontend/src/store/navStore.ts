import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Cómo dejó el usuario el panel de navegación: si está plegado, qué ancho le
 * dio, qué secciones abrió y qué pantallas marcó como favoritas.
 *
 * Cada página monta su propio `Layout`, así que el panel se vuelve a crear en
 * cada navegación; sin guardar esto, cada clic lo devolvería a como estaba al
 * principio.
 */
interface NavState {
  plegado: boolean
  ancho: number
  /** Sección → abierta. Las que no están, abiertas por omisión. */
  secciones: Record<string, boolean>
  favoritos: string[]
  /** El panel como cajón en pantallas angostas. No se guarda. */
  movil: boolean
  alternarPlegado: () => void
  setPlegado: (v: boolean) => void
  setAncho: (v: number) => void
  alternarSeccion: (clave: string, abierta: boolean) => void
  alternarFavorito: (ruta: string) => void
  setMovil: (v: boolean) => void
}

export const ANCHO_MIN = 208
export const ANCHO_MAX = 380

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      plegado: false,
      ancho: 256,
      secciones: {},
      favoritos: [],
      movil: false,
      alternarPlegado: () => set(s => ({ plegado: !s.plegado })),
      setPlegado: plegado => set({ plegado }),
      setAncho: ancho => set({ ancho: Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, Math.round(ancho))) }),
      alternarSeccion: (clave, abierta) => set(s => ({ secciones: { ...s.secciones, [clave]: abierta } })),
      alternarFavorito: ruta => set(s => ({
        favoritos: s.favoritos.includes(ruta)
          ? s.favoritos.filter(r => r !== ruta)
          : [...s.favoritos, ruta].slice(-12),
      })),
      setMovil: movil => set({ movil }),
    }),
    {
      name: 'tw-navegacion',
      partialize: s => ({ plegado: s.plegado, ancho: s.ancho, secciones: s.secciones, favoritos: s.favoritos }),
    },
  ),
)
