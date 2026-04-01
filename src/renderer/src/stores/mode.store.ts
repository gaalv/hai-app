import { create } from 'zustand'

interface ModeState {
  mode: 'local' | 'sync' | null
  isLoaded: boolean
  setMode: (m: 'local' | 'sync' | null) => void
  setLoaded: (loaded: boolean) => void
}

export const useModeStore = create<ModeState>((set) => ({
  mode: null,
  isLoaded: false,
  setMode: (m) => set({ mode: m }),
  setLoaded: (loaded) => set({ isLoaded: loaded })
}))
