import { create } from 'zustand'
import type { HaiManifest, Notebook, Tag } from '../types/manifest'
import { DEFAULT_MANIFEST } from '../types/manifest'

interface ManifestStore {
  manifest: HaiManifest
  isLoading: boolean
  activeNotebook: string | null   // notebook id
  activeTag: string | null        // tag name
  view: 'all' | 'inbox' | 'pinned' | 'trash' | 'notebook' | 'tag'

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

  setView: (view: ManifestStore['view'], id?: string) => void
}

export const useManifestStore = create<ManifestStore>((set, get) => ({
  manifest: { ...DEFAULT_MANIFEST },
  isLoading: false,
  activeNotebook: null,
  activeTag: null,
  view: 'all',

  load: async () => {
    set({ isLoading: true })
    try {
      const manifest = await window.electronAPI.manifest.load()
      set({ manifest })
    } finally {
      set({ isLoading: false })
    }
  },

  save: async (manifest: HaiManifest) => {
    set({ manifest })
    await window.electronAPI.manifest.save(manifest)
  },

  createNotebook: async (name: string) => {
    const notebook = await window.electronAPI.manifest.notebooksCreate(name)
    const { manifest } = get()
    set({ manifest: { ...manifest, notebooks: [...manifest.notebooks, notebook] } })
    return notebook
  },

  deleteNotebook: async (id: string, moveToInbox: boolean) => {
    await window.electronAPI.manifest.notebooksDelete(id, moveToInbox)
    const { manifest } = get()
    set({ manifest: { ...manifest, notebooks: manifest.notebooks.filter((n) => n.id !== id) } })
  },

  renameNotebook: async (id: string, name: string) => {
    const updated = await window.electronAPI.manifest.notebooksRename(id, name)
    const { manifest } = get()
    set({
      manifest: {
        ...manifest,
        notebooks: manifest.notebooks.map((n) => n.id === id ? updated : n)
      }
    })
  },

  createTag: async (tag: Tag) => {
    await window.electronAPI.manifest.tagsCreate(tag)
    const { manifest } = get()
    set({ manifest: { ...manifest, tags: [...manifest.tags, tag] } })
  },

  deleteTag: async (name: string) => {
    await window.electronAPI.manifest.tagsDelete(name)
    const { manifest } = get()
    set({ manifest: { ...manifest, tags: manifest.tags.filter((t) => t.name !== name) } })
  },

  updateTag: async (name: string, updates: Partial<Tag>) => {
    const updated = await window.electronAPI.manifest.tagsUpdate(name, updates)
    const { manifest } = get()
    set({
      manifest: {
        ...manifest,
        tags: manifest.tags.map((t) => t.name === name ? updated : t)
      }
    })
  },

  pinNote: async (relativePath: string) => {
    await window.electronAPI.manifest.pinNote(relativePath)
    const { manifest } = get()
    if (!manifest.pinned.includes(relativePath)) {
      set({ manifest: { ...manifest, pinned: [...manifest.pinned, relativePath] } })
    }
  },

  unpinNote: async (relativePath: string) => {
    await window.electronAPI.manifest.unpinNote(relativePath)
    const { manifest } = get()
    set({ manifest: { ...manifest, pinned: manifest.pinned.filter((p) => p !== relativePath) } })
  },

  setView: (view, id) => {
    if (view === 'notebook') set({ view, activeNotebook: id ?? null, activeTag: null })
    else if (view === 'tag') set({ view, activeTag: id ?? null, activeNotebook: null })
    else set({ view, activeNotebook: null, activeTag: null })
  }
}))
