import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { codigoCliente } from './cliente'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // El cliente viaja hasta que hay token: el login lo necesita para saber en
  // qué empresa buscar al usuario. Después manda el token, que lo lleva firmado.
  const cliente = codigoCliente()
  if (cliente) {
    config.headers['X-Cliente'] = cliente
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Limpiar todo el estado de auth (token suelto + estado Zustand persistido)
      localStorage.removeItem('access_token')
      localStorage.removeItem('auth-storage')
      // El cliente elegido se conserva: la sesión caducó, pero sigue siendo la
      // misma empresa y volver a escribir su código en cada expiración sobra.
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
