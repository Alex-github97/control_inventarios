import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, authApi } from '@/api/auth'
import { olvidarCliente } from '@/api/cliente'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  /** Los módulos que la empresa tiene contratados; `['*']` son todos. */
  modulos: string[]
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      modulos: [],

      login: async (username, password) => {
        const data = await authApi.login(username, password)
        localStorage.setItem('access_token', data.access_token)
        set({
          user: data.user, token: data.access_token, isAuthenticated: true,
          modulos: data.modulos ?? ['*'],
        })
      },

      logout: () => {
        localStorage.removeItem('access_token')
        // Salir a propósito sí olvida el cliente: la siguiente persona que use
        // este equipo puede ser de otra empresa.
        olvidarCliente()
        set({ user: null, token: null, isAuthenticated: false, modulos: [] })
      },
    }),
    { name: 'auth-storage', partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated, modulos: state.modulos }) }
  )
)
