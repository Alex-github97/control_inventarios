import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box, Card, Typography, alpha,
} from '@mui/material'
import { Language as LanguageIcon, Palette as PaletteIcon } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { LanguageSelector } from '@/components/LanguageSelector'
import { SUPPORTED_LANGUAGES } from '@/i18n'

const CARD_BG   = '#0F1E35'
const ACCENT    = '#32AC5C'
const SECTION_COLOR = '#6366F1'

export default function Configuracion() {
  const { t, i18n } = useTranslation()

  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)
    ?? SUPPORTED_LANGUAGES.find(l => l.code === 'es')!

  return (
    <Layout title={t('config.title')}>
      <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
        {t('config.subtitle')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 680 }}>

        {/* Language section */}
        <Card sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Header */}
          <Box sx={{
            px: 3, py: 2.5,
            background: `linear-gradient(135deg, ${alpha(ACCENT, 0.12)} 0%, ${alpha(ACCENT, 0.04)} 100%)`,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '10px',
              bgcolor: alpha(ACCENT, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LanguageIcon sx={{ color: ACCENT, fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#FFF' }}>
                {t('config.languageSection')}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                {t('config.languageDesc')}
              </Typography>
            </Box>
          </Box>

          {/* Language grid */}
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
              {SUPPORTED_LANGUAGES.map(lang => {
                const isActive = lang.code === i18n.language
                return (
                  <Box
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1,
                      px: 2, py: 1.25,
                      borderRadius: '10px',
                      border: `1px solid ${isActive ? ACCENT : 'rgba(255,255,255,0.09)'}`,
                      bgcolor: isActive ? alpha(ACCENT, 0.12) : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: isActive ? alpha(ACCENT, 0.18) : 'rgba(255,255,255,0.06)',
                        borderColor: isActive ? ACCENT : 'rgba(255,255,255,0.2)',
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: 20, lineHeight: 1 }}>{lang.flag}</Typography>
                    <Typography sx={{
                      fontSize: 13.5,
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? '#FFF' : 'rgba(255,255,255,0.55)',
                    }}>
                      {lang.name}
                    </Typography>
                  </Box>
                )
              })}
            </Box>

            {/* Current selection display */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              p: 2, borderRadius: '10px',
              bgcolor: alpha(ACCENT, 0.06),
              border: '1px solid rgba(50,172,92,0.15)',
            }}>
              <Typography sx={{ fontSize: 24, lineHeight: 1 }}>{current.flag}</Typography>
              <Box>
                <Typography sx={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {t('config.currentLanguage')}
                </Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>
                  {current.name}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Card>

        {/* Appearance placeholder (future feature) */}
        <Card sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.6 }}>
          <Box sx={{
            px: 3, py: 2.5,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '10px',
              bgcolor: alpha(SECTION_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PaletteIcon sx={{ color: SECTION_COLOR, fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#FFF' }}>
                {t('config.appearanceSection')}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                {t('config.appearanceDesc')}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            <Typography sx={{ fontSize: 13, color: '#475569', fontStyle: 'italic' }}>
              Próximamente disponible
            </Typography>
          </Box>
        </Card>

      </Box>
    </Layout>
  )
}
