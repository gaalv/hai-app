import { create } from 'zustand'
import type { SyncStatusType, ConflictFile } from '../types/sync'
import type { CommitEntry } from '../types/electron'

interface SyncStore {
  status: SyncStatusType
  pendingChanges: number
  lastSync: string | null
  lastError: string | null
  repoUrl: string | null
  isConfigured: boolean
  conflicts: ConflictFile[]

  // History / version
  history: CommitEntry[]
  selectedCommit: CommitEntry | null
  diff: { before: string; after: string } | null
  isHistoryOpen: boolean

  // Auto-sync
  autoSyncInterval: number  // minutes: 0 = manual

  // Actions
  setStatus: (status: SyncStatusType) => void
  setPendingChanges: (n: number) => void
  setConflicts: (conflicts: ConflictFile[]) => void
  setLastError: (error: string | null) => void
  applyStatus: (s: import('../types/sync').SyncStatus) => void

  setHistory: (history: CommitEntry[]) => void
  setSelectedCommit: (commit: CommitEntry | null) => void
  setDiff: (diff: { before: string; after: string } | null) => void
  toggleHistory: () => void
  setAutoSyncInterval: (minutes: number) => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: 'not-configured',
  pendingChanges: 0,
  lastSync: null,
  lastError: null,
  repoUrl: null,
  isConfigured: false,
  conflicts: [],

  history: [],
  selectedCommit: null,
  diff: null,
  isHistoryOpen: false,

  autoSyncInterval: 0,

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
  }),

  setHistory: (history) => set({ history }),
  setSelectedCommit: (selectedCommit) => set({ selectedCommit }),
  setDiff: (diff) => set({ diff }),
  toggleHistory: () => set((s) => ({ isHistoryOpen: !s.isHistoryOpen })),
  setAutoSyncInterval: (autoSyncInterval) => set({ autoSyncInterval })
}))
