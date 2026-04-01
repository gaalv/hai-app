import { EditorView } from '@codemirror/view'

/**
 * Module-level ref to the active CodeMirror EditorView instance.
 * Used by settings and other non-React code that needs to dispatch effects to the editor.
 */
let activeView: EditorView | null = null

export function setActiveEditorView(view: EditorView | null): void {
  activeView = view
}

export function getActiveEditorView(): EditorView | null {
  return activeView
}
