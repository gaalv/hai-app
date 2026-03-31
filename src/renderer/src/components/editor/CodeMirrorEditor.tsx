import { useEffect, useRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'

interface Props {
  initialContent: string
  onChange: (content: string) => void
}

export function CodeMirrorEditor({ initialContent, onChange }: Props): JSX.Element {
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
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(defaultHighlightStyle),
        EditorView.lineWrapping,
        oneDark,
        updateListener
      ]
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, []) // só monta uma vez

  // Quando troca de nota: atualiza conteúdo sem re-montar o editor
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === initialContent) return
    view.dispatch({
      changes: { from: 0, to: current.length, insert: initialContent }
    })
  }, [initialContent])

  return <div ref={containerRef} style={{ height: '100%', overflow: 'auto' }} />
}
