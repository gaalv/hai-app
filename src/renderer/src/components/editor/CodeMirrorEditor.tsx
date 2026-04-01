import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { vim } from '@replit/codemirror-vim'

import { syntaxHighlightExtension } from '../../editor/extensions/syntaxHighlight'
import { inlineMarkdownExtension } from '../../editor/extensions/inlineMarkdown'
import { fontCompartment, defaultFontTheme } from '../../editor/extensions/fontTheme'
import { vimCompartment } from '../../editor/extensions/vimMode'
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
}

const baseTheme = EditorView.theme({
  '&': { height: '100%', background: 'transparent !important' },
  '.cm-scroller': { padding: '16px 20px', overflow: 'auto' },
  '.cm-content': { caretColor: 'oklch(0.59 0.24 292)', fontFamily: 'var(--font-mono)' },
  '.cm-focused': { outline: 'none !important' },
  '.cm-line': { padding: '0' },
  '.cm-gutters': { display: 'none' },
  '.cm-cursor': { borderLeftColor: 'var(--accent) !important', borderLeftWidth: '2px' }
})

const focusModeTheme = EditorView.theme({
  '.cm-scroller': { padding: '48px 24px' },
  '.cm-line': { lineHeight: '1.9' },
  '.cm-content': { maxWidth: '680px', margin: '0 auto', padding: '0 40px' }
})

function buildExtensions(vimModeEnabled: boolean, focusModeEnabled: boolean, onChange: () => void) {
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) onChange()
  })

  return [
    syntaxHighlightExtension,
    ...inlineMarkdownExtension,
    fontCompartment.of(defaultFontTheme),
    vimCompartment.of(vimModeEnabled ? vim() : []),
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    syntaxHighlighting(defaultHighlightStyle),
    EditorView.lineWrapping,
    oneDark,
    baseTheme,
    ...(focusModeEnabled ? [focusModeTheme] : []),
    updateListener
  ]
}

export const CodeMirrorEditor = forwardRef<CodeMirrorEditorHandle, Props>(
  function CodeMirrorEditor({ initialContent, onChange, focusMode, vimMode }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange
    const isLocalChange = useRef(false)

    useImperativeHandle(ref, () => ({
      get view() {
        return viewRef.current
      }
    }))

    useEffect(() => {
      if (!containerRef.current) return

      const state = EditorState.create({
        doc: initialContent,
        extensions: buildExtensions(!!vimMode, !!focusMode, () => {
          isLocalChange.current = true
          onChangeRef.current(viewRef.current?.state.doc.toString() ?? '')
        })
      })

      const view = new EditorView({ state, parent: containerRef.current })
      viewRef.current = view
      setActiveEditorView(view)
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
      view.dispatch({
        changes: { from: 0, to: current.length, insert: initialContent }
      })
    }, [initialContent])

    return <div ref={containerRef} className="h-full overflow-auto" />
  }
)
