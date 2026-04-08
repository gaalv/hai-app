export interface HaiManifest {
  version: string
  notebooks: Notebook[]
  tags: Tag[]
  pinned: string[]        // relative paths
  inbox: string           // default: 'inbox'
  trash?: TrashEntry[]
  calendarLinks?: Record<string, string[]>  // YYYY-MM-DD → relative paths[]
  syncConfig?: { repoUrl: string; autoSyncMinutes: number }
}

export interface Notebook {
  id: string
  name: string
  path: string            // relative path to folder in vault
  color?: string
  icon?: string
  order: number
  createdAt: string
}

export interface Tag {
  name: string
  label: string
  color: string
}

export interface TrashEntry {
  originalPath: string    // relative to vault
  trashedAt: string
  trashPath: string       // relative to vault/.trash/
  title?: string
}

export interface NoteFrontmatter {
  title: string
  created: string
  updated: string
  tags?: string[]
  pinned?: boolean
  notebook?: string       // notebook id
  gistId?: string
  gistUrl?: string
}

export const DEFAULT_MANIFEST: HaiManifest = {
  version: '1',
  notebooks: [],
  tags: [],
  pinned: [],
  inbox: 'inbox',
  trash: []
}
