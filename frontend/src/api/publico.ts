import axios, { AxiosInstance } from 'axios'

/**
 * Cliente HTTP para las páginas públicas (sin login).
 *
 * Deliberadamente NO usa `apiClient`: ese adjunta el token guardado y, ante un
 * 401, borra la sesión y redirige a /login. Un visitante que entra a reservar
 * una cita no tiene sesión y no debe terminar en una pantalla de login ni
 * arrastrar el token de quien haya usado antes ese navegador.
 */
// El cast evita el error de tipos por `import.meta.env`: este proyecto no
// tiene cargados los tipos de vite/client en tsconfig.
const API_URL =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL
  || '/api/v1'

export const publicClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})
