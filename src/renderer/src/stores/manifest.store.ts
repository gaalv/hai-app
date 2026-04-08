import { create } from 'zustand'
import type { HaiManifest, Notebook, Tag, TrashEntry } from '../types/manifest'
import { DEFAULT_MANIFEST } from '../types/manifest'

interface ManifestState {
  notebooks: Notebook[]
  tags: Tag[]
  pinned: string[]
  inbox: string
  trash: TrashEntry[]
  calendarLinks: Record<string, string[]>
  isLoaded: boolean

  // Full manifest helpers
  manifest: HaiManifest
  isLoading: boolean
  activeNotebook: string | null
  activeTag: string | null
  view: 'all' | 'inbox' | 'pinned' | 'trash' | 'notebook' | 'tag'

  // Atomic setters
  setManifest: (m: HaiManifest) => void
  addNotebook: (n: Notebook) => void
  removeNotebook: (id: string) => void
  updateNotebook: (id: string, updates: Partial<Notebook>) => void
  setTags: (tags: Tag[]) => void
  setPinned: (pinned: string[]) => void

  // Async actions
  load: () => Promise<void>
  save: (manifest: HaiManifest) => Promise<void>
  createNotebook: (name: string) => Promise<Notebook>
  deleteNotebook: (id: string, moveToInbox: boolean) => Promise<void>
  renameNotebook: (id: string, name: string) => Promise<void>
  createTag: (tag: Tag) => Promise<void>
  deleteTag: (name: string) => Promise<void>
  updateTag: (name: string, updates: Partial<Tag>) => Promise<void>
  pinNote: (relativePath: string) => Promise<void>
  unpinNote: (relativePath: string) => Promise<void>
  trashNote: (absolutePath: string) => Promise<void>
  trashRestore: (trashPath: string) => Promise<void>
  trashPurge: (trashPath?: string) => Promise<void>
  calendarLink: (dateKey: string, relativePath: string) => Promise<void>
  calendarUnlink: (dateKey: string, relativePath: string) => Promise<void>

  setView: (view: ManifestState['view'], id?: string) => void
}

export const useManifestStore = create<ManifestState>((set, get) => ({
  notebooks: [],
  tags: [],
  pinned: [],
  inbox: 'inbox',
  trash: [],
  calendarLinks: {},
  isLoaded: false,

  manifest: { ...DEFAULT_MANIFEST },
  isLoading: false,
  activeNotebook: null,
  activeTag: null,
  view: 'all',

  setManifest: (m: HaiManifest) => {
    set({
      manifest: m,
      notebooks: m.notebooks,
      tags: m.tags,
      pinned: m.pinned,
      inbox: m.inbox,
      trash: m.trash ?? [],
      calendarLinks: m.calendarLinks ?? {},
      isLoaded: true
    })
  },

  addNotebook: (n: Notebook) => {
    const { manifest } = get()
    const notebooks = [...manifest.notebooks, n]
    set({ notebooks, manifest: { ...manifest, notebooks } })
  },

  removeNotebook: (id: string) => {
    const { manifest } = get()
    const notebooks = manifest.notebooks.filter((n) => n.id !== id)
    set({ notebooks, manifest: { ...manifest, notebooks } })
  },

  updateNotebook: (id: string, updates: Partial<Notebook>) => {
    const { manifest } = get()
    const notebooks = manifest.notebooks.map((n) => n.id === id ? { ...n, ...updates } : n)
    set({ notebooks, manifest: { ...manifest, notebooks } })
  },

  setTags: (tags: Tag[]) => {
    const { manifest } = get()
    set({ tags, manifest: { ...manifest, tags } })
  },

  setPinned: (pinned: string[]) => {
    const { manifest } = get()
    set({ pinned, manifest: { ...manifest, pinned } })
  },

  load: async () => {
    set({ isLoading: true })
    try {
      const m = await window.electronAPI.manifest.load()
      get().setManifest(m)
    } finally {
      set({ isLoading: false })
    }
  },

  save: async (manifest: HaiManifest) => {
    get().setManifest(manifest)
    await window.electronAPI.manifest.save(manifest)
  },

  createNotebook: async (name: string) => {
    const notebook = await window.electronAPI.manifest.notebooksCreate(name)
    get().addNotebook(notebook)
    return notebook
  },

  deleteNotebook: async (id: string, moveToInbox: boolean) => {
    await window.electronAPI.manifest.notebooksDelete(id, moveToInbox)
    get().removeNotebook(id)
  },

  renameNotebook: async (id: string, name: string) => {
    const updated = await window.electronAPI.manifest.notebooksRename(id, name)
    get().updateNotebook(id, updated)
  },

  createTag: async (tag: Tag) => {
    await window.electronAPI.manifest.tagsCreate(tag)
    const { manifest } = get()
    get().setTags([...manifest.tags, tag])
  },

  deleteTag: async (name: string) => {
    await window.electronAPI.manifest.tagsDelete(name)
    const { manifest } = get()
    get().setTags(manifest.tags.filter((t) => t.name !== name))
  },

  updateTag: async (name: string, updates: Partial<Tag>) => {
    const updated = await window.electronAPI.manifest.tagsUpdate(name, updates)
    const { manifest } = get()
    get().setTags(manifest.tags.map((t) => t.name === name ? updated : t))
  },

  pinNote: async (relativePath: string) => {
    await window.electronAPI.manifest.pinNote(relativePath)
    const { manifest } = get()
    if (!manifest.pinned.includes(relativePath)) {
      get().setPinned([...manifest.pinned, relativePath])
    }
  },

  unpinNote: async (relativePath: string) => {
    await window.electronAPI.manifest.unpinNote(relativePath)
    const { manifest } = get()
    get().setPinned(manifest.pinned.filter((p) => p !== relativePath))
  },

  trashNote: async (absolutePath: string) => {
    const entry = await window.electronAPI.manifest.trashNote(absolutePath)
    const { trash } = get()
    set({ trash: [...trash, entry] })
  },

  trashRestore: async (trashPath: string) => {
    await window.electronAPI.manifest.trashRestore(trashPath)
    set((s) => ({ trash: s.trash.filter((e) => e.trashPath !== trashPath) }))
  },

  trashPurge: async (trashPath?: string) => {
    await window.electronAPI.manifest.trashPurge(trashPath)
    if (trashPath) {
      set((s) => ({ trash: s.trash.filter((e) => e.trashPath !== trashPath) }))
    } else {
      set({ trash: [] })
    }
  },

  calendarLink: async (dateKey: string, relativePath: string) => {
    await window.electronAPI.manifest.calendarLink(dateKey, relativePath)
    set((s) => {
      const existing = s.calendarLinks[dateKey] ?? []
      if (existing.includes(relativePath)) return s
      return { calendarLinks: { ...s.calendarLinks, [dateKey]: [...existing, relativePath] } }
    })
  },

  calendarUnlink: async (dateKey: string, relativePath: string) => {
    await window.electronAPI.manifest.calendarUnlink(dateKey, relativePath)
    set((s) => {
      const updated = (s.calendarLinks[dateKey] ?? []).filter((p) => p !== relativePath)
      const next = { ...s.calendarLinks }
      if (updated.length === 0) {
        delete next[dateKey]
      } else {
        next[dateKey] = updated
      }
      return { calendarLinks: next }
    })
  },

  setView: (view, id) => {
    if (view === 'notebook') set({ view, activeNotebook: id ?? null, activeTag: null })
    else if (view === 'tag') set({ view, activeTag: id ?? null, activeNotebook: null })
    else set({ view, activeNotebook: null, activeTag: null })
  }
}))
