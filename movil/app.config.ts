/**
 * Dos apps desde el mismo código: TittanWare (CMMS en campo) y TittanLite
 * (inspecciones de llantas sin restricciones). La variante sale de
 * APP_VARIANT al compilar; sin ella es TittanWare, exactamente como en app.json.
 *
 *   APP_VARIANT=lite npx expo export …   ·   APP_VARIANT=lite eas build …
 *
 * Cada una tiene su propio paquete Android, así que se instalan lado a lado.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig
  if (process.env.APP_VARIANT !== 'lite') {
    return { ...base, extra: { ...base.extra, variante: 'cmms' } }
  }
  return {
    ...base,
    name: 'TittanLite',
    slug: 'tittanlite',
    scheme: 'tittanlite',
    // El logo de TittanWare con «LITE» debajo, para distinguirla en el teléfono.
    icon: './assets/lite/icon.png',
    android: {
      ...base.android, package: 'tech.tittanware.lite',
      adaptiveIcon: {
        ...base.android?.adaptiveIcon,
        foregroundImage: './assets/lite/android-icon-foreground.png',
        backgroundImage: './assets/lite/android-icon-background.png',
        monochromeImage: './assets/lite/android-icon-monochrome.png',
      },
    },
    web: { ...base.web, favicon: './assets/lite/favicon.png' },
    plugins: (base.plugins ?? []).map(p => {
      if (!Array.isArray(p)) return p
      if (p[0] === 'expo-camera') {
        return ['expo-camera', { ...(p[1] as object),
          cameraPermission: 'La cámara se usa para leer el código de las llantas y tomar fotos de las inspecciones y las bajas.' }]
      }
      if (p[0] === 'expo-splash-screen') {
        const s = p[1] as { image?: string; dark?: { image?: string } }
        return ['expo-splash-screen', { ...s, image: './assets/lite/splash-icon.png',
          dark: { ...s.dark, image: './assets/lite/splash-icon.png' } }]
      }
      return p
    }),
    extra: { ...base.extra, variante: 'lite' },
  }
}
