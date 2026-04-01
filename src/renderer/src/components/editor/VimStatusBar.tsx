import { useEffect, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import { useUIStore } from '../../stores/ui.store'
import { useEditorStore } from '../../stores/editor.store'

interface Props {
  viewRef: React.RefObject<EditorView | null>
}

export function VimStatusBar({ viewRef }: Props): JSX.Element | null {
  const vimEnabled = useUIStore((s) => s.vimMode)
  const { vimMode, setVimMode } = useEditorStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!vimEnabled) return

    // Poll the vim state from the CodeMirror view
    intervalRef.current = setInterval(() => {
      const view = viewRef.current
      if (!view) return

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vimState = (view.state as any).field?.vim ?? (view as any).state?.vim
        // Try accessing via getCM extension from @replit/codemirror-vim
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cm = (view as any).cm
        const mode = cm?.state?.vim?.mode ?? vimState?.mode ?? 'normal'
        setVimMode(mode)
      } catch {
        // ignore
      }
    }, 100)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [vimEnabled, viewRef, setVimMode])

  if (!vimEnabled) return null

  const modeLabel = vimMode.toUpperCase()

  let modeColor = 'text-[var(--text-3)]'
  if (vimMode === 'insert') modeColor = 'text-[var(--accent)]'
  else if (vimMode === 'visual') modeColor = 'text-yellow-400'

  return (
    <span
      className={`font-mono text-[10px] px-2 select-none ${modeColor}`}
      title="Modo Vim"
    >
      {modeLabel}
    </span>
  )
}
