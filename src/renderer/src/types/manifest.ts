export interface Notebook {
  id: string
  name: string
  path: string      // relative to vault root
  color?: string
  icon?: string
  order: number
}

export interface Tag {
  name: string      // slug (no spaces, used as key)
  label: string     // display name
  color: string     // hex
}

export interface TrashEntry {
  path: string          // current path in .trash/
  originalPath: string  // original relative path
  deletedAt: string     // ISO date
}

export interface HaiManifest {
  version: number
  notebooks: Notebook[]
  tags: Tag[]
  pinned: string[]      // relative paths
  inbox: string         // relative path, default "inbox"
  trash: TrashEntry[]
  sync?: {
    repo: string
    interval: number    // minutes: 0 = manual, 5, 15, 30
    lastSync?: string
  }
}

export const DEFAULT_MANIFEST: HaiManifest = {
  version: 1,
  notebooks: [],
  tags: [],
  pinned: [],
  inbox: 'inbox',
  trash: []
}
