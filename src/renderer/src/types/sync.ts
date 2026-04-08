export interface SyncConfig {
  repoUrl: string
  configuredAt: string
  lastSync?: string
}

export interface PushResult {
  filesCommitted: number
  commitHash: string
  timestamp: string
}

export interface ConflictFile {
  path: string
  localContent: string
  remoteContent: string
}

export interface PullResult {
  filesUpdated: number
  hasConflicts: boolean
  conflicts: ConflictFile[]
}

export type SyncStatusType = 'not-configured' | 'synced' | 'pending' | 'syncing' | 'error'

export interface SyncStatus {
  status: SyncStatusType
  pendingChanges: number
  lastSync: string | null
  lastError: string | null
  repoUrl: string | null
}
