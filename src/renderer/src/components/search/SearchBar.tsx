import { useRef, useState, useEffect, useCallback } from 'react'
import { useSearchStore } from '../../stores/search.store'
import { searchService } from '../../services/search'

interface Props {
  onResultsActive: (active: boolean) => void
}

export function SearchBar({ onResultsActive }: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localQuery, setLocalQuery] = useState('')
  const setQuery = useSearchStore((s) => s.setQuery)

  const runSearch = useCallback(
    (q: string) => {
      setQuery(q)
      if (!q.trim()) {
        onResultsActive(false)
        useSearchStore.getState().setResults([])
        return
      }
      onResultsActive(true)
      searchService.query(q)
    },
    [setQuery, onResultsActive]
  )

  useEffect(() => {
    const t = setTimeout(() => runSearch(localQuery), 200)
    return () => clearTimeout(t)
  }, [localQuery, runSearch])

  // Cmd+F focuses the search bar
  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleClear(): void {
    setLocalQuery('')
    onResultsActive(false)
    useSearchStore.getState().setResults([])
    inputRef.current?.focus()
  }

  return (
    <div className="px-2 py-2 border-b border-[var(--border)] shrink-0">
      <div className="flex items-center gap-1.5 bg-[var(--surface-3)] rounded-md px-2 py-1.5">
        <span className="text-[var(--text-4)] text-xs shrink-0">🔍</span>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-[var(--text)] text-xs outline-none placeholder:text-[var(--text-4)] min-w-0"
          placeholder="Buscar notas... (⌘F)"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleClear()
          }}
        />
        {localQuery && (
          <button
            className="text-[var(--text-4)] hover:text-[var(--text-2)] text-xs cursor-pointer shrink-0"
            onClick={handleClear}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
