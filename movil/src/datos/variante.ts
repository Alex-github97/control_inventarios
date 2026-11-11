/** Qué app es esta: TittanWare (CMMS) o TittanLite (llantas). Ver app.config.ts. */
import Constants from 'expo-constants'

export const VARIANTE: 'cmms' | 'lite' = Constants.expoConfig?.extra?.variante === 'lite' ? 'lite' : 'cmms'
export const ES_LITE = VARIANTE === 'lite'
export const NOMBRE_APP = ES_LITE ? 'TittanLite' : 'TittanWare'
/** A dónde entra la app con la sesión abierta. */
export const RUTA_INICIO = ES_LITE ? '/lite' : '/ordenes'
