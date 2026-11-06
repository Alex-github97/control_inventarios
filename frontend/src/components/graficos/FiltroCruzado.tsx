/**
 * Filtro cruzado entre los gráficos de un tablero, al estilo Power BI.
 *
 *   clic                → filtra por ese valor (otro clic sobre el mismo lo quita)
 *   Ctrl/⌘/Mayús + clic → suma o quita el valor sin soltar los demás
 *   clic sostenido y arrastrar → elige el tramo de barras o de meses recorrido
 *   Esc                 → quita todos los filtros
 *
 * Todos los gráficos de un mismo `ProveedorFiltros` comparten la selección.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material'
import { FilterAltOutlined } from '@mui/icons-material'
import type { Filtros } from './cubo'

interface ContextoFiltros {
  filtros: Filtros
  /** Nombre legible de cada dimensión, para los chips y los tooltips. */
  nombres: Record<string, string>
  elegir: (dimension: string, valores: string[], sumar?: boolean) => void
  alternar: (dimension: string, valor: string, sumar?: boolean) => void
  quitar: (dimension: string, valor?: string) => void
  limpiar: () => void
}

const Contexto = createContext<ContextoFiltros | null>(null)

export function ProveedorFiltros({ nombres, children }: { nombres: Record<string, string>; children: ReactNode }) {
  const [filtros, setFiltros] = useState<Filtros>({})

  const elegir = useCallback((dimension: string, valores: string[], sumar = false) => {
    setFiltros(f => {
      const antes = f[dimension] ?? []
      const nuevos = sumar ? [...new Set([...antes, ...valores])] : valores
      return { ...f, [dimension]: nuevos }
    })
  }, [])

  const alternar = useCallback((dimension: string, valor: string, sumar = false) => {
    setFiltros(f => {
      const antes = f[dimension] ?? []
      let nuevos: string[]
      if (sumar) nuevos = antes.includes(valor) ? antes.filter(v => v !== valor) : [...antes, valor]
      else nuevos = antes.length === 1 && antes[0] === valor ? [] : [valor]
      return { ...f, [dimension]: nuevos }
    })
  }, [])

  const quitar = useCallback((dimension: string, valor?: string) => {
    setFiltros(f => ({ ...f, [dimension]: valor ? (f[dimension] ?? []).filter(v => v !== valor) : [] }))
  }, [])

  const limpiar = useCallback(() => setFiltros({}), [])

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const destino = e.target as HTMLElement | null
      if (destino?.closest('input, textarea, [role="dialog"]')) return
      setFiltros({})
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const valor = useMemo(() => ({ filtros, nombres, elegir, alternar, quitar, limpiar }),
    [filtros, nombres, elegir, alternar, quitar, limpiar])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useFiltros(): ContextoFiltros {
  const c = useContext(Contexto)
  if (!c) throw new Error('useFiltros fuera de ProveedorFiltros')
  return c
}

/** Los filtros activos como chips, con su cruz y «Quitar filtros». */
export function BarraFiltros({ formato }: { formato?: (dimension: string, valor: string) => string }) {
  const { filtros, nombres, quitar, limpiar } = useFiltros()
  const activos = Object.entries(filtros).filter(([, v]) => v.length)
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap
      sx={{ minHeight: 34, px: 1.5, py: 0.75, borderRadius: 2, bgcolor: activos.length ? 'action.hover' : 'transparent' }}>
      <FilterAltOutlined sx={{ fontSize: 18, color: activos.length ? 'primary.main' : 'text.disabled' }} />
      {activos.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Clic en una barra para filtrar los demás gráficos · Ctrl + clic para sumar varios · arrastre para elegir un tramo
        </Typography>
      ) : (
        <>
          {activos.map(([d, valores]) => {
            const texto = valores.length <= 3
              ? valores.map(v => formato?.(d, v) ?? v).join(', ')
              : `${valores.length} valores`
            return (
              <Tooltip key={d} title={valores.length > 3 ? valores.map(v => formato?.(d, v) ?? v).join(' · ') : ''}>
                <Chip size="small" onDelete={() => quitar(d)}
                  label={<><Box component="span" sx={{ fontWeight: 400, opacity: .75 }}>{nombres[d] ?? d}: </Box>{texto}</>}
                  sx={{ fontWeight: 700, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }} />
              </Tooltip>
            )
          })}
          <Button size="small" onClick={limpiar} sx={{ ml: 'auto', textTransform: 'none' }}>
            Quitar filtros (Esc)
          </Button>
        </>
      )}
    </Stack>
  )
}
