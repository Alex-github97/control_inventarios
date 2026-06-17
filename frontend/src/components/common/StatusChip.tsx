import React from 'react'
import { Box, Typography } from '@mui/material'
import { STATUS_COLORS } from '@/theme/theme'

interface StatusChipProps {
  status: string
  size?: 'small' | 'medium'
}

export function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const config = STATUS_COLORS[status]
  const color  = config?.color  ?? '#64748B'
  const bg     = config?.bg     ?? '#F1F5F9'
  const border = config?.border ?? '#E2E8F0'
  const label  = config?.label  ?? status.replace(/_/g, ' ')

  return (
    <Box sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      px: size === 'medium' ? 1.5 : 1,
      py: size === 'medium' ? 0.5 : 0.3,
      borderRadius: '6px',
      bgcolor: bg,
      border: `1px solid ${border}`,
    }}>
      <Box sx={{
        width: size === 'medium' ? 7 : 5.5,
        height: size === 'medium' ? 7 : 5.5,
        borderRadius: '50%',
        bgcolor: color,
        flexShrink: 0,
      }} />
      <Typography sx={{
        fontSize: size === 'medium' ? 12 : 11,
        fontWeight: 600,
        color,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}>
        {label}
      </Typography>
    </Box>
  )
}
