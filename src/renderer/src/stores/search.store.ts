import { create } from 'zustand'
import type { SearchResult } from '../types/electron'

interface SearchStore {
  paletteOpen: boolean
  query: string
  results: SearchResult[]
  isLoading: boolean
  selectedIndex: number
  togglePalette: () => void
  openPalette: () => void
  closePalette: () => void
  setQuery: (q: string) => void
  setResults: (r: SearchResult[]) => void
  setLoading: (v: boolean) => void
  setSelectedIndex: (i: number) => void
}

export const useSearchStore = create<SearchStore>((set) => ({
  paletteOpen: false,
  query: '',
  results: [],
  isLoading: false,
  selectedIndex: 0,

  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen, query: '', results: [], selectedIndex: 0 })),
  openPalette: () => set({ paletteOpen: true, query: '', results: [], selectedIndex: 0 }),
  closePalette: () => set({ paletteOpen: false, query: '', results: [], selectedIndex: 0 }),
  setQuery: (query) => set({ query, selectedIndex: 0 }),
  setResults: (results) => set({ results, selectedIndex: 0 }),
  setLoading: (isLoading) => set({ isLoading }),
  setSelectedIndex: (selectedIndex) => set({ selectedIndex })
}))
