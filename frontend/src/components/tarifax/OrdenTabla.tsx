/**
 * Ordenar una tabla con un clic en el encabezado: el primer clic ordena de
 * mayor a menor (Z→A en los textos), el segundo invierte. Los vacíos van
 * siempre al final. Ordena todas las filas recibidas, no solo la página visible.
 */
import { useMemo, useState } from 'react'
import { TableCell, TableSortLabel } from '@mui/material'

export type ColumnaOrden<T> = { titulo: string; valor: (f: T) => string | number | null | undefined; numero?: boolean }
type Orden = { col: number; dir: 'asc' | 'desc' } | null

export function useOrden<T>(filas: T[], columnas: ColumnaOrden<T>[]) {
  const [orden, setOrden] = useState<Orden>(null)
  const ordenadas = useMemo(() => {
    if (!orden) return filas
    const { valor } = columnas[orden.col], signo = orden.dir === 'asc' ? 1 : -1
    return [...filas].sort((a, b) => {
      const x = valor(a), y = valor(b)
      const vx = x == null || x === '', vy = y == null || y === ''
      if (vx || vy) return vx ? (vy ? 0 : 1) : -1
      return signo * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es'))
    })
  }, [filas, orden])  // eslint-disable-line react-hooks/exhaustive-deps
  const ordenar = (col: number) => setOrden(o => o?.col === col ? { col, dir: o.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' })
  return { filas: ordenadas, orden, ordenar }
}

/** Las celdas del encabezado, cada una con su flecha de orden. */
export function EncabezadosOrden<T>({ columnas, orden, ordenar }: {
  columnas: ColumnaOrden<T>[]; orden: Orden; ordenar: (col: number) => void
}) {
  return <>{columnas.map((c, i) => (
    <TableCell key={c.titulo} align={c.numero ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}
      sortDirection={orden?.col === i ? orden.dir : false}>
      <TableSortLabel active={orden?.col === i} direction={orden?.col === i ? orden.dir : 'desc'} onClick={() => ordenar(i)}>
        {c.titulo}
      </TableSortLabel>
    </TableCell>
  ))}</>
}
