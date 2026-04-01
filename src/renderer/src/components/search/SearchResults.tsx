import { useEffect, useRef } from 'react'
import { useSearchStore } from '../../stores/search.store'
import { useEditorStore } from '../../stores/editor.store'

export function SearchResults(): JSX.Element {
  const { results, isLoading, query, selectedIndex, setSelectedIndex } = useSearchStore()
  const openNote = useEditorStore((s) => s.openNote)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(Math.max(selectedIndex - 1, 0))
      } else if (e.key === 'Enter') {
        const r = results[selectedIndex]
        if (r) openNote(r.path)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedIndex, results, setSelectedIndex, openNote])

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto py-1 px-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-2 py-2 mb-1 rounded-md">
            <div className="h-3 bg-[var(--surface-3)] rounded w-3/4 mb-1.5 animate-pulse" />
            <div className="h-2.5 bg-[var(--surface-3)] rounded w-full animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (!query.trim()) return <></>

  if (results.length === 0) {
    return (
      <div className="flex-1 px-3 py-4 text-xs text-[var(--text-4)] text-center">
        Sem resultados para "{query}"
      </div>
    )
  }

  return (
    <div ref={listRef} className="flex-1 overflow-auto py-1">
      <p className="px-3 py-1 text-[10px] text-[var(--text-4)] uppercase tracking-widest">
        {results.length} {results.length === 1 ? 'nota encontrada' : 'notas encontradas'}
      </p>
      {results.map((r, i) => (
        <div
          key={r.path}
          className={`px-2 py-2 mx-1 mb-0.5 rounded-md cursor-pointer transition-colors ${
            selectedIndex === i
              ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
              : 'hover:bg-[var(--surface-3)]'
          }`}
          onClick={() => openNote(r.path)}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <p className="text-[13px] text-[var(--text)] truncate font-medium">{r.title}</p>
          <p className="text-xs text-[var(--text-3)] truncate mt-0.5">{r.snippet}</p>
          {r.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {r.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1 py-0.5 bg-[var(--surface-3)] text-[var(--text-4)] rounded"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
