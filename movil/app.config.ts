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
    android: { ...base.android, package: 'tech.tittanware.lite' },
    plugins: (base.plugins ?? []).map(p => Array.isArray(p) && p[0] === 'expo-camera'
      ? ['expo-camera', { ...(p[1] as object),
          cameraPermission: 'La cámara se usa para leer el código de las llantas y tomar fotos de las inspecciones y las bajas.' }]
      : p),
    extra: { ...base.extra, variante: 'lite' },
  }
}
