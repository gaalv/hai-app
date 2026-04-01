import { useManifestStore } from '../stores/manifest.store'
import type { Tag } from '../types/manifest'

export const manifestService = {
  async loadManifest(): Promise<void> {
    const manifest = await window.electronAPI.manifest.load()
    useManifestStore.getState().setManifest(manifest)
  },

  async createNotebook(name: string) {
    const notebook = await window.electronAPI.manifest.notebooksCreate(name)
    useManifestStore.getState().addNotebook(notebook)
    return notebook
  },

  async deleteNotebook(id: string, moveToInbox: boolean): Promise<void> {
    await window.electronAPI.manifest.notebooksDelete(id, moveToInbox)
    useManifestStore.getState().removeNotebook(id)
  },

  async renameNotebook(id: string, newName: string) {
    const updated = await window.electronAPI.manifest.notebooksRename(id, newName)
    useManifestStore.getState().updateNotebook(id, updated)
    return updated
  },

  async createTag(tag: Tag): Promise<void> {
    await window.electronAPI.manifest.tagsCreate(tag)
    const { manifest } = useManifestStore.getState()
    useManifestStore.getState().setTags([...manifest.tags, tag])
  },

  async updateTag(name: string, updates: Partial<Tag>): Promise<void> {
    const updated = await window.electronAPI.manifest.tagsUpdate(name, updates)
    const { manifest } = useManifestStore.getState()
    useManifestStore.getState().setTags(
      manifest.tags.map((t) => (t.name === name ? updated : t))
    )
  },

  async deleteTag(name: string): Promise<void> {
    await window.electronAPI.manifest.tagsDelete(name)
    const { manifest } = useManifestStore.getState()
    useManifestStore.getState().setTags(manifest.tags.filter((t) => t.name !== name))
  },

  async pinNote(relativePath: string): Promise<void> {
    await window.electronAPI.manifest.pinNote(relativePath)
    const { manifest } = useManifestStore.getState()
    if (!manifest.pinned.includes(relativePath)) {
      useManifestStore.getState().setPinned([...manifest.pinned, relativePath])
    }
  },

  async unpinNote(relativePath: string): Promise<void> {
    await window.electronAPI.manifest.unpinNote(relativePath)
    const { manifest } = useManifestStore.getState()
    useManifestStore.getState().setPinned(manifest.pinned.filter((p) => p !== relativePath))
  },

  async trashNote(absolutePath: string) {
    return window.electronAPI.manifest.trashNote(absolutePath)
  },

  async restoreNote(trashPath: string): Promise<void> {
    await window.electronAPI.manifest.trashRestore(trashPath)
  },

  async listTrash() {
    return window.electronAPI.manifest.trashList()
  },

  async purgeTrash(trashPath?: string): Promise<void> {
    await window.electronAPI.manifest.trashPurge(trashPath)
  },

  async moveNote(absolutePath: string, notebookId: string | null): Promise<string> {
    return window.electronAPI.manifest.noteMove(absolutePath, notebookId)
  }
}
