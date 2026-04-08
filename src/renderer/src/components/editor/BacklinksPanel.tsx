import { useEffect, useState } from 'react'
import { useEditorStore } from '../../stores/editor.store'

interface Backlink {
  path: string
  title: string
  snippet: string
}

interface Props {
  onClose: () => void
}

export function BacklinksPanel({ onClose }: Props): JSX.Element {
  const activeNote = useEditorStore((s) => s.activeNote)
  const openNote = useEditorStore((s) => s.openNote)
  const [backlinks, setBacklinks] = useState<Backlink[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeNote) {
      setBacklinks([])
      return
    }

    let cancelled = false
    setLoading(true)

    window.electronAPI.notes.getBacklinks(activeNote.path).then((result) => {
      if (!cancelled) {
        setBacklinks(result)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [activeNote?.path])

  return (
    <div className="flex flex-col h-full bg-[var(--app-surface)]">
      <div className="flex items-center justify-between px-4 py-[7px] shrink-0 border-b-[0.5px] border-b-[var(--app-border)]">
        <span className="text-[10.5px] font-medium text-[var(--app-text-3)] uppercase tracking-[0.05em]">
          Backlinks {backlinks.length > 0 && <span className="normal-case">({backlinks.length})</span>}
        </span>
        <button
          className="text-[var(--app-text-3)] hover:text-[var(--app-text-1)] cursor-pointer bg-transparent border-none text-[14px] leading-none transition-colors"
          onClick={onClose}
        >×</button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: '176px' }}>
        {loading && (
          <div className="flex items-center justify-center h-12">
            <span className="text-[11px] text-[var(--app-text-3)]">Carregando...</span>
          </div>
        )}

        {!loading && backlinks.length === 0 && (
          <div className="px-4 py-5 text-[11px] text-[var(--app-text-3)]">
            Nenhuma nota aponta para esta nota.
          </div>
        )}

        {!loading && backlinks.length > 0 && (
          <ul>
            {backlinks.map((bl) => (
              <li key={bl.path}>
                <button
                  className="w-full text-left px-4 py-[8px] hover:bg-[var(--app-hover)] cursor-pointer transition-colors bg-transparent border-none border-b-[0.5px] border-b-[var(--app-border)] last:border-b-0"
                  onClick={() => openNote(bl.path)}
                >
                  <p className="text-[12px] font-medium text-[var(--app-text-1)] truncate">{bl.title}</p>
                  {bl.snippet && (
                    <p className="text-[11px] text-[var(--app-text-3)] mt-[2px] leading-relaxed line-clamp-2">{bl.snippet}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
