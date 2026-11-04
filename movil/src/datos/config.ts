/**
 * A qué servidor habla la app. En la APK publicada, producción; para probar
 * contra el servidor local se compila o se sirve con EXPO_PUBLIC_API_BASE.
 */
import Constants from 'expo-constants'

export const API_BASE: string = process.env.EXPO_PUBLIC_API_BASE ?? 'https://app.tittanware.com'
export const VERSION_APP: string = Constants.expoConfig?.version ?? '0.0.0'
