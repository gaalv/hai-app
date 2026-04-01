import { create } from 'zustand'
import type { NoteListItem } from '../types/notes'

interface NotesState {
  notes: NoteListItem[]
  selectedNotePath: string | null
  isLoading: boolean

  loadNotes: (notebookId: string) => Promise<void>
  selectNote: (absolutePath: string) => void
  createNote: (notebookId: string) => Promise<NoteListItem>
  updateNoteTitle: (absolutePath: string, title: string) => void
  clear: () => void
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  selectedNotePath: null,
  isLoading: false,

  loadNotes: async (notebookId: string) => {
    set({ isLoading: true, notes: [], selectedNotePath: null })
    try {
      const notes = await window.electronAPI.notes.listInNotebook(notebookId)
      set({ notes, isLoading: false })
    } catch {
      set({ isLoading: false, notes: [] })
    }
  },

  selectNote: (absolutePath: string) => {
    set({ selectedNotePath: absolutePath })
  },

  createNote: async (notebookId: string) => {
    const note = await window.electronAPI.notes.createInNotebook(notebookId)
    set((s) => ({ notes: [note, ...s.notes], selectedNotePath: note.absolutePath }))
    return note
  },

  updateNoteTitle: (absolutePath: string, title: string) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.absolutePath === absolutePath ? { ...n, title } : n))
    }))
  },

  clear: () => set({ notes: [], selectedNotePath: null, isLoading: false })
}))
