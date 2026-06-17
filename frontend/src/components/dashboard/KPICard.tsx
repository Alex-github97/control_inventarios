import React from 'react'
import { Card, CardContent, Box, Typography, alpha } from '@mui/material'
import { TrendingUp, TrendingDown } from '@mui/icons-material'
import { motion } from 'framer-motion'

interface KPICardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ReactNode
  color?: string
  progress?: number
  trend?: { value: number; label: string }
  onClick?: () => void
}

export function KPICard({
  title, value, subtitle, icon,
  color = '#32AC5C', progress, trend, onClick,
}: KPICardProps) {
  const isPositiveTrend = (trend?.value ?? 0) >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ height: '100%' }}
      whileHover={onClick ? { y: -2 } : {}}
    >
      <Card
        onClick={onClick}
        sx={{
          height: '100%',
          cursor: onClick ? 'pointer' : 'default',
          position: 'relative',
          overflow: 'hidden',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': onClick ? {
            boxShadow: `0 8px 24px ${alpha(color, 0.14)}, 0 0 0 1px ${alpha(color, 0.12)}`,
          } : {},
        }}
      >
        {/* Subtle gradient accent — bottom-right corner */}
        <Box sx={{
          position: 'absolute',
          bottom: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(color, 0.08)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, position: 'relative' }}>
          {/* Top row: label + icon */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
            <Typography sx={{
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: '#94A3B8',
            }}>
              {title}
            </Typography>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: `0 4px 12px ${alpha(color, 0.3)}`,
              flexShrink: 0,
              '& svg': { fontSize: 20 },
            }}>
              {icon}
            </Box>
          </Box>

          {/* Value */}
          <Typography sx={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#0D1117',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
            mb: subtitle ? 0.5 : 0,
          }}>
            {typeof value === 'number' ? value.toLocaleString('es-CO') : value}
          </Typography>

          {subtitle && (
            <Typography sx={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
              {subtitle}
            </Typography>
          )}

          {/* Progress bar */}
          {progress !== undefined && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{
                height: 4,
                borderRadius: 99,
                bgcolor: alpha(color, 0.12),
                overflow: 'hidden',
              }}>
                <Box sx={{
                  height: '100%',
                  width: `${Math.min(progress, 100)}%`,
                  borderRadius: 99,
                  background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.7)})`,
                  transition: 'width 0.6s ease',
                }} />
              </Box>
              <Typography sx={{ fontSize: 11, color: '#94A3B8', mt: 0.75, fontWeight: 500 }}>
                {progress.toFixed(1)}% del total
              </Typography>
            </Box>
          )}

          {/* Trend badge */}
          {trend && (
            <Box sx={{ mt: 2, display: 'inline-flex', alignItems: 'center', gap: 0.5,
              bgcolor: isPositiveTrend ? alpha('#16A34A', 0.08) : alpha('#DC2626', 0.08),
              borderRadius: '6px',
              px: 1,
              py: 0.4,
            }}>
              {isPositiveTrend
                ? <TrendingUp sx={{ fontSize: 13, color: '#16A34A' }} />
                : <TrendingDown sx={{ fontSize: 13, color: '#DC2626' }} />
              }
              <Typography sx={{
                fontSize: 11.5,
                fontWeight: 700,
                color: isPositiveTrend ? '#16A34A' : '#DC2626',
              }}>
                {Math.abs(trend.value)}%
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                {trend.label}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
