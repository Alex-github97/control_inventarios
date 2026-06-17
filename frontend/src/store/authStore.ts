import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, authApi } from '@/api/auth'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (username, password) => {
        const data = await authApi.login(username, password)
        localStorage.setItem('access_token', data.access_token)
        set({ user: data.user, token: data.access_token, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('access_token')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'auth-storage', partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }) }
  )
)
