import { create } from 'zustand'
import type { SyncStatusType, ConflictFile } from '../types/sync'

interface SyncStore {
  status: SyncStatusType
  pendingChanges: number
  lastSync: string | null
  lastError: string | null
  repoUrl: string | null
  isConfigured: boolean
  conflicts: ConflictFile[]
  setStatus: (status: SyncStatusType) => void
  setPendingChanges: (n: number) => void
  setConflicts: (conflicts: ConflictFile[]) => void
  setLastError: (error: string | null) => void
  applyStatus: (s: import('../types/sync').SyncStatus) => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: 'not-configured',
  pendingChanges: 0,
  lastSync: null,
  lastError: null,
  repoUrl: null,
  isConfigured: false,
  conflicts: [],
  setStatus: (status) => set({ status }),
  setPendingChanges: (pendingChanges) => set({ pendingChanges }),
  setConflicts: (conflicts) => set({ conflicts }),
  setLastError: (lastError) => set({ lastError }),
  applyStatus: (s) => set({
    status: s.status,
    pendingChanges: s.pendingChanges,
    lastSync: s.lastSync,
    lastError: s.lastError,
    repoUrl: s.repoUrl,
    isConfigured: s.status !== 'not-configured'
  })
}))
