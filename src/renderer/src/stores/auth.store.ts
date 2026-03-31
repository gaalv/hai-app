import { create } from 'zustand'
import type { GitHubProfile } from '../types/auth'

interface AuthStore {
  token: string | null
  profile: GitHubProfile | null
  isLoading: boolean
  isAuthenticated: boolean

  checkAuth: () => Promise<void>
  logout: () => Promise<void>
  setAuth: (token: string, profile: GitHubProfile) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const token = await window.electronAPI.auth.getToken()
      if (token) {
        const profile = await window.electronAPI.auth.getProfile()
        set({ token, profile, isAuthenticated: true })
      } else {
        set({ token: null, profile: null, isAuthenticated: false })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    await window.electronAPI.auth.logout()
    set({ token: null, profile: null, isAuthenticated: false })
  },

  setAuth: (token, profile) => {
    set({ token, profile, isAuthenticated: true })
  }
}))
