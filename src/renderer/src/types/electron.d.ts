import type { VaultConfig } from './vault'
import type { HaiManifest, Notebook, Tag, TrashEntry } from './manifest'
import type { GitHubProfile } from './auth'

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
    create: (vaultPath: string, name?: string, notebookPath?: string) => Promise<string>
    delete: (path: string) => Promise<void>
    rename: (oldPath: string, newName: string) => Promise<string>
    listAll: (vaultPath: string) => Promise<import('./notes').FileNode[]>
    watchStart: (vaultPath: string) => Promise<void>
    watchStop: () => Promise<void>
  }
  sync: {
    configure: (pat: string, repoUrl: string) => Promise<void>
    push: (message?: string) => Promise<import('./sync').PushResult>
    pull: () => Promise<import('./sync').PullResult>
    resolveConflict: (path: string, choice: 'local' | 'remote') => Promise<void>
    getStatus: () => Promise<import('./sync').SyncStatus>
    getHistory: (relativePath?: string) => Promise<CommitEntry[]>
    getDiff: (relativePath: string, oidA: string, oidB: string) => Promise<{ before: string; after: string }>
    restoreVersion: (relativePath: string, oid: string) => Promise<string>
    setInterval: (minutes: number) => Promise<void>
  }
  manifest: {
    load: () => Promise<HaiManifest>
    save: (manifest: HaiManifest) => Promise<void>
    notebooksCreate: (name: string) => Promise<Notebook>
    notebooksRename: (id: string, newName: string) => Promise<Notebook>
    notebooksDelete: (id: string, moveToInbox: boolean) => Promise<void>
    notebooksListNotes: (notebookId: string) => Promise<Array<{ name: string; path: string }>>
    tagsCreate: (tag: Tag) => Promise<Tag>
    tagsUpdate: (name: string, updates: Partial<Tag>) => Promise<Tag>
    tagsDelete: (name: string) => Promise<void>
    pinNote: (relativePath: string) => Promise<void>
    unpinNote: (relativePath: string) => Promise<void>
    trashNote: (absolutePath: string) => Promise<TrashEntry>
    trashRestore: (trashPath: string) => Promise<void>
    trashList: () => Promise<TrashEntry[]>
    trashPurge: (trashPath?: string) => Promise<void>
    noteMove: (absolutePath: string, notebookId: string | null) => Promise<string>
  }
  auth: {
    getToken: () => Promise<string | null>
    getProfile: () => Promise<GitHubProfile | null>
    deviceFlowStart: () => Promise<{ userCode: string; verificationUri: string; deviceCode: string; interval: number; expiresIn: number }>
    deviceFlowPoll: (deviceCode: string, interval: number) => Promise<{ token: string; profile: GitHubProfile }>
    setClientId: (clientId: string) => Promise<void>
    logout: () => Promise<void>
  }
  search: {
    index: () => Promise<number>
    query: (rawQuery: string) => Promise<SearchResult[]>
    invalidate: (filePath: string) => Promise<void>
  }
  quickCapture: {
    close: () => Promise<void>
  }
  export: {
    pdf: (filePath: string, content: string) => Promise<string | null>
    html: (filePath: string, content: string) => Promise<string | null>
    md: (filePath: string, content: string, stripFrontmatter: boolean) => Promise<string | null>
    gist: (filePath: string, content: string) => Promise<{ url: string; id: string }>
  }
  import: {
    md: () => Promise<string[]>
    folder: () => Promise<string[]>
  }
  onFileTreeChanged: (callback: () => void) => void
  onSyncAutoSynced: (callback: (data: { timestamp: string; files: number }) => void) => void
  onSyncAutoError: (callback: (data: { error: string }) => void) => void
  onAuthChanged: (callback: (event: string) => void) => void
}

export interface CommitEntry {
  oid: string
  message: string
  author: string
  timestamp: string
  files: string[]
}

export interface SearchResult {
  path: string
  relativePath: string
  title: string
  snippet: string
  score: number
  tags: string[]
  notebook: string | null
  updatedAt: string | null
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
