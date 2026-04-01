import { create } from 'zustand'
import type { GitHubProfile } from '../types/auth'

interface AuthState {
  isAuthenticated: boolean
  profile: GitHubProfile | null
  isLoading: boolean
  error: string | null
  setProfile: (profile: GitHubProfile) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  profile: null,
  isLoading: true,
  error: null,

  setProfile: (profile) => set({ profile, isAuthenticated: true, isLoading: false, error: null }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  logout: () => set({ isAuthenticated: false, profile: null, isLoading: false, error: null })
}))
