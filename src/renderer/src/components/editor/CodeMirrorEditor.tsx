import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands'
import { indentOnInput } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { markdownKeymap } from '@codemirror/lang-markdown'
import { vim } from '@replit/codemirror-vim'

import { syntaxHighlightExtension } from '../../editor/extensions/syntaxHighlight'
import { inlineMarkdownExtension } from '../../editor/extensions/inlineMarkdown'
import { fontCompartment, defaultFontTheme } from '../../editor/extensions/fontTheme'
import { vimCompartment } from '../../editor/extensions/vimMode'
import { wikilinksExtension } from '../../editor/extensions/wikilinks'
import { themeCompartment, getEditorTheme } from '../../editor/extensions/editorTheme'
import { setActiveEditorView } from '../../editor/editorViewRef'
import '../../editor/extensions/inlineMarkdown.css'

export interface CodeMirrorEditorHandle {
  view: EditorView | null
}

interface Props {
  initialContent: string
  onChange: (content: string) => void
  focusMode?: boolean
  vimMode?: boolean
  themeMode?: 'dark' | 'light'
}

const baseTheme = EditorView.theme({
  '&': { height: '100%', background: 'transparent !important' },
  '.cm-scroller': { padding: '16px 20px', overflow: 'auto' },
  '.cm-content': { caretColor: '#C05010', fontFamily: 'var(--font-mono)' },
  '.cm-focused': { outline: 'none !important' },
  '.cm-line': { padding: '0' },
  '.cm-gutters': { display: 'none' },
})

const focusModeTheme = EditorView.theme({
  '.cm-scroller': { padding: '48px 24px' },
  '.cm-line': { lineHeight: '1.9' },
  '.cm-content': { maxWidth: '680px', margin: '0 auto', padding: '0 40px' }
})

const imagePasteHandler = EditorView.domEventHandlers({
  paste(event, view) {
    const items = event.clipboardData?.items
    if (!items) return false
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        event.preventDefault()
        const file = item.getAsFile()
        if (!file) continue
        const pos = view.state.selection.main.head
        const placeholder = '![](uploading...)'
        view.dispatch({ changes: { from: pos, insert: placeholder } })
        const reader = new FileReader()
        reader.onload = async () => {
          const dataUrl = reader.result as string
          const filename = `image-${Date.now()}.png`
          try {
            const result = await window.electronAPI.notes.saveImage(dataUrl, filename)
            const doc = view.state.doc.toString()
            const idx = doc.lastIndexOf(placeholder)
            if (idx !== -1) {
              view.dispatch({ changes: { from: idx, to: idx + placeholder.length, insert: `![](${result.relativePath})` } })
            }
          } catch {
            const doc = view.state.doc.toString()
            const idx = doc.lastIndexOf(placeholder)
            if (idx !== -1) view.dispatch({ changes: { from: idx, to: idx + placeholder.length, insert: '' } })
          }
        }
        reader.readAsDataURL(file)
        return true
      }
    }
    return false
  }
})

function buildExtensions(
  vimModeEnabled: boolean,
  focusModeEnabled: boolean,
  themeMode: 'dark' | 'light',
  onChange: () => void
) {
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) onChange()
  })

  return [
    syntaxHighlightExtension,
    ...inlineMarkdownExtension,
    ...wikilinksExtension,
    fontCompartment.of(defaultFontTheme),
    vimCompartment.of(vimModeEnabled ? vim() : []),
    themeCompartment.of(getEditorTheme(themeMode)),
    history(),
    indentOnInput(),
    closeBrackets(),
    keymap.of([
      ...closeBracketsKeymap,
      ...markdownKeymap,
      ...(vimModeEnabled ? [] : [indentWithTab]),
      ...defaultKeymap,
      ...historyKeymap,
    ]),
    EditorView.lineWrapping,
    baseTheme,
    ...(focusModeEnabled ? [focusModeTheme] : []),
    updateListener,
    imagePasteHandler
  ]
}

export const CodeMirrorEditor = forwardRef<CodeMirrorEditorHandle, Props>(
  function CodeMirrorEditor({ initialContent, onChange, focusMode, vimMode, themeMode = 'dark' }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const isLocalChange = useRef(false)
    const wasFocused = useRef(false)
    const extensionsRef = useRef<ReturnType<typeof buildExtensions>>([])

    useImperativeHandle(ref, () => ({
      get view() {
        return viewRef.current
      }
    }))

    // Reconfigure theme without remounting
    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      view.dispatch({ effects: themeCompartment.reconfigure(getEditorTheme(themeMode)) })
    }, [themeMode])

    useEffect(() => {
      if (!containerRef.current) return

      extensionsRef.current = buildExtensions(!!vimMode, !!focusMode, themeMode, () => {
        isLocalChange.current = true
        onChangeRef.current(viewRef.current?.state.doc.toString() ?? '')
      })

      const state = EditorState.create({
        doc: initialContent,
        extensions: extensionsRef.current
      })

      const view = new EditorView({ state, parent: containerRef.current })
      viewRef.current = view
      setActiveEditorView(view)
      // Place cursor at end of document so user can continue writing
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      view.focus()

      return () => {
        view.destroy()
        viewRef.current = null
        setActiveEditorView(null)
      }
      // Re-mount when mode changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusMode, vimMode])

    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      if (isLocalChange.current) {
        isLocalChange.current = false
        return
      }
      const current = view.state.doc.toString()
      if (current === initialContent) return
      // Capture focus state before replacing doc so we can restore it afterward
      wasFocused.current = view.hasFocus
      // Use setState to fully replace the document (e.g. when switching notes)
      // so we don't pollute the undo history with the prior note's content.
      view.setState(
        EditorState.create({
          doc: initialContent,
          extensions: extensionsRef.current
        })
      )
      if (wasFocused.current) view.focus()
    }, [initialContent])

    return <div ref={containerRef} className="h-full overflow-auto" />
  }
)
