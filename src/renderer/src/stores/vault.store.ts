import { create } from 'zustand'
import type { VaultConfig } from '../types/vault'

interface VaultStore {
  config: VaultConfig | null
  isLoading: boolean
  error: string | null
  setVault: (config: VaultConfig) => void
  clearVault: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useVaultStore = create<VaultStore>((set) => ({
  config: null,
  isLoading: true,
  error: null,
  setVault: (config) => set({ config, error: null }),
  clearVault: () => set({ config: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error })
}))
