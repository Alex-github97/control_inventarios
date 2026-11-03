/**
 * El tema: modo claro u oscuro, siguiendo al teléfono salvo que el usuario
 * elija uno. Las pantallas piden colores con `useTema()`; nunca los escriben.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { Platform, useColorScheme, type ViewStyle } from 'react-native'
import { CLARO, OSCURO, type Colores, type NivelElevacion } from './tokens'

export type PreferenciaModo = 'sistema' | 'claro' | 'oscuro'

interface ValorTema {
  color: Colores
  oscuro: boolean
  preferencia: PreferenciaModo
  setPreferencia: (p: PreferenciaModo) => void
  /** Sombra en claro; en oscuro la elevación se marca con superficie más clara y un borde. */
  elevacion: (nivel: NivelElevacion) => ViewStyle
}

const Contexto = createContext<ValorTema | null>(null)

export function ProveedorTema({ children, inicial = 'sistema' }: { children: ReactNode; inicial?: PreferenciaModo }) {
  const sistema = useColorScheme()
  const [preferencia, setPreferencia] = useState<PreferenciaModo>(inicial)
  const oscuro = preferencia === 'oscuro' || (preferencia === 'sistema' && sistema === 'dark')
  const valor = useMemo<ValorTema>(() => {
    const color = oscuro ? OSCURO : CLARO
    const elevacion = (nivel: NivelElevacion): ViewStyle => {
      if (nivel === 0) return {}
      if (oscuro) return { borderWidth: 1, borderColor: color.borde }
      const y = [0, 1, 4, 10][nivel]
      const r = [0, 3, 12, 24][nivel]
      const o = [0, 0.06, 0.08, 0.12][nivel]
      return Platform.select<ViewStyle>({
        web: { boxShadow: `0px ${y}px ${r}px rgba(14,16,19,${o})` } as ViewStyle,
        default: { shadowColor: color.sombra, shadowOpacity: o * 1.6, shadowRadius: r / 2, shadowOffset: { width: 0, height: y }, elevation: nivel * 2 },
      })!
    }
    return { color, oscuro, preferencia, setPreferencia, elevacion }
  }, [oscuro, preferencia])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useTema(): ValorTema {
  const t = useContext(Contexto)
  if (!t) throw new Error('useTema fuera de ProveedorTema')
  return t
}
