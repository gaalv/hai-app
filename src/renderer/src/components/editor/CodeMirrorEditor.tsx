import { useEffect, useRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { vim } from '@replit/codemirror-vim'
import { markdownInlineDecorations, markdownInlineTheme } from '../../editor/markdownDecorations'

interface Props {
  initialContent: string
  onChange: (content: string) => void
  focusMode?: boolean
  vimMode?: boolean
}

const baseTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '14px', background: 'transparent !important' },
  '.cm-scroller': { padding: '16px 20px', lineHeight: '1.7', overflow: 'auto' },
  '.cm-content': { caretColor: 'oklch(0.59 0.24 292)', fontFamily: 'var(--font-mono)' },
  '.cm-focused': { outline: 'none !important' },
  '.cm-line': { padding: '0' },
  '.cm-gutters': { display: 'none' },
  '.cm-cursor': { borderLeftColor: 'var(--accent) !important', borderLeftWidth: '2px' }
})

const focusModeTheme = EditorView.theme({
  '.cm-scroller': { padding: '48px 24px' },
  '.cm-line': { lineHeight: '1.9' }
})

export function CodeMirrorEditor({ initialContent, onChange, focusMode, vimMode }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString())
      }
    })

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        ...(vimMode ? [vim()] : []),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(defaultHighlightStyle),
        EditorView.lineWrapping,
        oneDark,
        baseTheme,
        markdownInlineDecorations,
        markdownInlineTheme,
        ...(focusMode ? [focusModeTheme] : []),
        updateListener
      ]
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view
    view.focus()

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [focusMode, vimMode]) // re-mount when mode changes

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === initialContent) return
    view.dispatch({
      changes: { from: 0, to: current.length, insert: initialContent }
    })
  }, [initialContent])

  return <div ref={containerRef} className="h-full overflow-auto" />
}
