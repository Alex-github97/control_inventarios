import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box, Button, Menu, MenuItem, Typography, Tooltip, alpha,
} from '@mui/material'
import { Language as LanguageIcon, Check } from '@mui/icons-material'
import { SUPPORTED_LANGUAGES } from '@/i18n'

interface LanguageSelectorProps {
  /** 'button' shows a full-width button with flag+name. 'compact' shows only the flag icon. */
  variant?: 'button' | 'compact'
  accentColor?: string
}

export function LanguageSelector({ variant = 'button', accentColor = '#32AC5C' }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)
    ?? SUPPORTED_LANGUAGES.find(l => l.code === 'es')!

  const handleChange = (code: string) => {
    i18n.changeLanguage(code)
    setAnchor(null)
  }

  return (
    <>
      <Tooltip title={variant === 'compact' ? t('lang.selectLanguage') : ''} placement="right">
        <Button
          onClick={e => setAnchor(e.currentTarget)}
          startIcon={variant === 'button' ? <LanguageIcon fontSize="small" /> : undefined}
          sx={{
            justifyContent: variant === 'button' ? 'flex-start' : 'center',
            minWidth: variant === 'compact' ? 44 : undefined,
            px: variant === 'compact' ? 1 : 2,
            py: 0.9,
            borderRadius: '10px',
            color: 'rgba(255,255,255,0.3)',
            border: '1px solid transparent',
            bgcolor: 'transparent',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.7)',
              borderColor: 'transparent',
            },
            textTransform: 'none',
            gap: 0.5,
            width: variant === 'button' ? '100%' : 'auto',
          }}
        >
          <Typography sx={{ fontSize: variant === 'compact' ? 18 : 16, lineHeight: 1, color: 'inherit' }}>
            {current.flag}
          </Typography>
          {variant === 'button' && (
            <Typography sx={{ fontSize: 12.5, fontWeight: 400, color: 'inherit' }}>
              {current.name}
            </Typography>
          )}
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              minWidth: 200,
              mt: 0.5,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            },
          },
        }}
      >
        <Typography sx={{ px: 2, py: 1, fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {t('lang.selectLanguage')}
        </Typography>
        {SUPPORTED_LANGUAGES.map(lang => {
          const isActive = lang.code === i18n.language
          return (
            <MenuItem
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              sx={{
                px: 2,
                py: 0.9,
                gap: 1.5,
                borderRadius: '8px',
                mx: 0.5,
                mb: 0.25,
                bgcolor: isActive ? alpha(accentColor, 0.12) : 'transparent',
                '&:hover': { bgcolor: alpha(accentColor, 0.08) },
              }}
            >
              <Typography sx={{ fontSize: 18, lineHeight: 1 }}>{lang.flag}</Typography>
              <Typography sx={{ fontSize: 13.5, fontWeight: isActive ? 700 : 400, color: isActive ? '#1E293B' : '#64748B', flex: 1 }}>
                {lang.name}
              </Typography>
              {isActive && <Check sx={{ fontSize: 16, color: accentColor }} />}
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
