import { create } from 'zustand'
import type { FileNode } from '../types/notes'

interface FileTreeStore {
  nodes: FileNode[]
  isLoading: boolean
  init: (vaultPath: string) => Promise<void>
  refresh: (vaultPath: string) => Promise<void>
}

export const useFileTreeStore = create<FileTreeStore>((set) => ({
  nodes: [],
  isLoading: false,

  init: async (vaultPath: string) => {
    set({ isLoading: true })
    try {
      const nodes = await window.electronAPI.notes.listAll(vaultPath)
      set({ nodes })
      await window.electronAPI.notes.watchStart(vaultPath)
      window.electronAPI.onFileTreeChanged(() => {
        useFileTreeStore.getState().refresh(vaultPath)
      })
    } finally {
      set({ isLoading: false })
    }
  },

  refresh: async (vaultPath: string) => {
    const nodes = await window.electronAPI.notes.listAll(vaultPath)
    set({ nodes })
  }
}))
