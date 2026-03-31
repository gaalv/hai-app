import type { VaultConfig } from './vault'

export interface ElectronAPI {
  vault: {
    openPicker: () => Promise<VaultConfig | null>
    configure: (path: string) => Promise<VaultConfig>
    load: () => Promise<VaultConfig | null>
    create: (name: string, parentPath: string) => Promise<VaultConfig>
  }
  notes: {
    read: (path: string) => Promise<string>
    save: (path: string, content: string) => Promise<void>
    create: (vaultPath: string, name?: string) => Promise<string>
    delete: (path: string) => Promise<void>
    rename: (oldPath: string, newName: string) => Promise<string>
    listAll: (vaultPath: string) => Promise<import('./notes').FileNode[]>
    watchStart: (vaultPath: string) => Promise<void>
    watchStop: () => Promise<void>
  }
  sync: {
    configure: (pat: string, repoUrl: string) => Promise<void>
    push: () => Promise<import('./sync').PushResult>
    pull: () => Promise<import('./sync').PullResult>
    resolveConflict: (path: string, choice: 'local' | 'remote') => Promise<void>
    getStatus: () => Promise<import('./sync').SyncStatus>
  }
  onFileTreeChanged: (callback: () => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
