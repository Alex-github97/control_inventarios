/**
 * Un indicador del tablero con su explicación al pasar el puntero: qué es, cómo
 * se calcula, sobre cuántos casos y qué filtros activos no lo afectan. Un número
 * sin eso invita a decidir sobre algo que no se entiende o que no aguanta.
 */
import type { ReactNode } from 'react'
import { Box, Divider, Stack, Tooltip, Typography } from '@mui/material'
import { useFiltros } from './FiltroCruzado'

interface Props {
  titulo: string
  valor: string
  pie?: string
  color?: string
  alerta?: boolean
  /** Qué significa, en una frase. */
  que: ReactNode
  /** Cómo se calcula. */
  como?: ReactNode
  /** Cómo leerlo: umbrales, qué es bueno. */
  lectura?: ReactNode
  /** Dimensiones de los filtros activos que este indicador no puede usar. */
  noAfectan?: string[]
}

export function Indicador({ titulo, valor, pie, color, alerta, que, como, lectura, noAfectan = [] }: Props) {
  const { nombres } = useFiltros()
  const ayuda = (
    <Box sx={{ p: 0.5, maxWidth: 300 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'inherit' }}>{titulo}</Typography>
      <Typography variant="body2" sx={{ color: 'inherit', mt: 0.5, fontSize: 12.5 }}>{que}</Typography>
      {como && (
        <>
          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,.2)' }} />
          <Typography variant="caption" sx={{ color: 'inherit', opacity: .75, display: 'block' }}>Cómo se calcula</Typography>
          <Typography variant="body2" sx={{ color: 'inherit', fontSize: 12.5 }}>{como}</Typography>
        </>
      )}
      {lectura && (
        <>
          <Typography variant="caption" sx={{ color: 'inherit', opacity: .75, display: 'block', mt: 1 }}>Cómo leerlo</Typography>
          <Typography variant="body2" sx={{ color: 'inherit', fontSize: 12.5 }}>{lectura}</Typography>
        </>
      )}
      {noAfectan.length > 0 && (
        <Typography variant="caption" sx={{ color: '#FCD34D', display: 'block', mt: 1 }}>
          No cambia con el filtro de {noAfectan.map(d => (nombres[d] ?? d).toLowerCase()).join(', ')}: este dato no se registra por esa dimensión.
        </Typography>
      )}
    </Box>
  )
  return (
    <Tooltip title={ayuda} arrow placement="bottom-start" enterDelay={200}>
      <Box sx={{ flex: 1, minWidth: 140, cursor: 'help' }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="caption" color="text.secondary">{titulo}</Typography>
          {noAfectan.length > 0 && <Box sx={{ width: 6, height: 6, borderRadius: 9, bgcolor: '#F59E0B' }} />}
        </Stack>
        <Typography variant="h6" fontWeight={800} sx={{ color: color ?? 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
          {valor}
        </Typography>
        {pie && (
          <Typography variant="caption" sx={{ color: alerta ? '#B45309' : 'text.secondary' }}>{pie}</Typography>
        )}
      </Box>
    </Tooltip>
  )
}
