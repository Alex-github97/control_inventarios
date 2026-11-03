import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import es from '@compartido/i18n/es.json'
import en from '@compartido/i18n/en.json'
import pt from '@compartido/i18n/pt.json'
import fr from '@compartido/i18n/fr.json'
import de from '@compartido/i18n/de.json'
import zh from '@compartido/i18n/zh.json'
import ja from '@compartido/i18n/ja.json'
import it from '@compartido/i18n/it.json'
import ko from '@compartido/i18n/ko.json'
import ru from '@compartido/i18n/ru.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Español',    flag: '🇪🇸' },
  { code: 'en', name: 'English',    flag: '🇺🇸' },
  { code: 'pt', name: 'Português',  flag: '🇧🇷' },
  { code: 'fr', name: 'Français',   flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch',    flag: '🇩🇪' },
  { code: 'zh', name: '中文',        flag: '🇨🇳' },
  { code: 'ja', name: '日本語',      flag: '🇯🇵' },
  { code: 'it', name: 'Italiano',   flag: '🇮🇹' },
  { code: 'ko', name: '한국어',      flag: '🇰🇷' },
  { code: 'ru', name: 'Русский',    flag: '🇷🇺' },
]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es, en, pt, fr, de, zh, ja, it, ko, ru },
    fallbackLng: 'es',
    defaultNS: 'translation',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'empresa_lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
