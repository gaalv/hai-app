import { create } from 'zustand'

// Debounced push: waits 10s after the last save before pushing to GitHub
let pushTimer: ReturnType<typeof setTimeout> | null = null
function schedulePushAfterSave(): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    window.electronAPI.sync.push()
      .then((r) => console.log('[sync] push after save:', r))
      .catch((e) => console.error('[sync] push after save failed:', e))
  }, 10_000)
}

type PreviewMode = 'none' | 'split' | 'preview'

interface ActiveNote {
  path: string
  content: string
}

interface EditorStore {
  activeNote: ActiveNote | null
  isDirty: boolean
  isSaving: boolean
  saveError: string | null
  previewMode: PreviewMode
  vimMode: string
  focusMode: boolean
  openNote: (path: string) => Promise<void>
  setContent: (content: string) => void
  save: () => Promise<void>
  setPreviewMode: (mode: PreviewMode) => void
  closeNote: () => void
  setVimMode: (mode: string) => void
  toggleFocusMode: () => void
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  activeNote: null,
  isDirty: false,
  isSaving: false,
  saveError: null,
  previewMode: 'none',
  vimMode: 'normal',
  focusMode: false,

  openNote: async (path: string) => {
    const content = await window.electronAPI.notes.read(path)
    set({ activeNote: { path, content }, isDirty: false, saveError: null })
  },

  setContent: (content: string) => {
    const { activeNote } = get()
    if (!activeNote) return
    set({ activeNote: { ...activeNote, content }, isDirty: true })
  },

  save: async () => {
    const { activeNote, isDirty } = get()
    if (!activeNote || !isDirty) return
    set({ isSaving: true, saveError: null })
    try {
      await window.electronAPI.notes.save(activeNote.path, activeNote.content)
      set({ isDirty: false })
      // Debounced push after save — avoids flooding on rapid edits
      schedulePushAfterSave()
    } catch (err) {
      set({ saveError: err instanceof Error ? err.message : 'Erro ao salvar' })
    } finally {
      set({ isSaving: false })
    }
  },

  setPreviewMode: (previewMode: PreviewMode) => set({ previewMode }),

  closeNote: () => set({ activeNote: null, isDirty: false, saveError: null }),

  setVimMode: (mode: string) => set({ vimMode: mode }),

  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode }))
}))
