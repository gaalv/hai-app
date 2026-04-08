import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditorStore } from '../../stores/editor.store'
import { useNotesStore } from '../../stores/notes.store'
import { searchService } from '../../services/search'
import type { SearchResult } from '../../types/electron'

interface SpotlightSearchProps {
  onClose: () => void
}

const DEBOUNCE_MS = 200

export function SpotlightSearch({ onClose }: SpotlightSearchProps): JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const openNote = useEditorStore((s) => s.openNote)
  const selectNote = useNotesStore((s) => s.selectNote)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    searchService.query(q).then((res) => {
      setResults(res)
      setSelectedIdx(0)
      setIsLoading(false)
    }).catch(() => {
      setResults([])
      setIsLoading(false)
    })
  }, [])

  function handleQueryChange(value: string): void {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value), DEBOUNCE_MS)
  }

  function handleSelect(result: SearchResult): void {
    openNote(result.path)
    selectNote(result.path)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      handleSelect(results[selectedIdx])
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-[6px]"
      onClick={onClose}
    >
      <div
        className="w-[560px] max-h-[480px] flex flex-col rounded-[12px] bg-[var(--app-surface)] border-[0.5px] border-[var(--app-border-mid)] shadow-[0_24px_64px_rgba(0,0,0,0.55)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-[10px] px-4 py-3 border-b-[0.5px] border-[var(--app-border)] shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--app-text-3)] shrink-0">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar notas…"
            className="flex-1 text-[14px] text-[var(--app-text-1)] placeholder:text-[var(--app-text-3)] bg-transparent outline-none border-none"
          />
          {isLoading && (
            <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[var(--app-border-mid)] border-t-[var(--app-accent)] animate-spin shrink-0" />
          )}
          <kbd className="text-[10px] text-[var(--app-text-3)] bg-[var(--app-hover)] border-[0.5px] border-[var(--app-border)] rounded-[4px] px-[6px] py-[2px] font-mono shrink-0">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-[6px]">
          {!query.trim() && (
            <div className="flex items-center justify-center py-10 text-[13px] text-[var(--app-text-3)]">
              Digite para buscar suas notas
            </div>
          )}

          {query.trim() && !isLoading && results.length === 0 && (
            <div className="flex items-center justify-center py-10 text-[13px] text-[var(--app-text-3)]">
              Nenhuma nota encontrada
            </div>
          )}

          {results.map((result, idx) => (
            <SpotlightResultRow
              key={result.path}
              result={result}
              query={query}
              selected={idx === selectedIdx}
              dataIdx={idx}
              onHover={() => setSelectedIdx(idx)}
              onClick={() => handleSelect(result)}
            />
          ))}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 border-t-[0.5px] border-[var(--app-border)] bg-[var(--app-rail)] shrink-0">
            <HintKey label="↑↓" text="navegar" />
            <HintKey label="↵" text="abrir" />
            <HintKey label="esc" text="fechar" />
            <span className="ml-auto text-[10.5px] text-[var(--app-text-3)]">
              {results.length} resultado{results.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function highlightText(text: string, term: string): React.ReactNode {
  if (!term.trim()) return text
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-[rgba(192,80,16,0.3)] text-[var(--app-accent)] rounded-[2px] px-[1px]">{part}</mark>
      : part
  )
}

function SpotlightResultRow({
  result,
  query,
  selected,
  dataIdx,
  onHover,
  onClick,
}: {
  result: SearchResult
  query: string
  selected: boolean
  dataIdx: number
  onHover: () => void
  onClick: () => void
}): JSX.Element {
  return (
    <div
      data-idx={dataIdx}
      onMouseEnter={onHover}
      onClick={onClick}
      className={`flex items-start gap-3 px-4 py-[10px] cursor-pointer transition-colors duration-75 mx-[6px] my-px rounded-[8px] ${
        selected ? 'bg-[var(--app-accent-dim)]' : 'hover:bg-[var(--app-hover)]'
      }`}
    >
      {/* Icon */}
      <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 mt-px bg-[var(--app-hover)]">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="var(--app-text-3)" strokeWidth="1.3"/>
          <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="var(--app-text-3)" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="var(--app-text-3)" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="var(--app-text-3)" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[var(--app-text-1)] truncate">
          {highlightText(result.title || 'Sem título', query)}
        </div>
        {result.snippet && (
          <div className="text-[11.5px] text-[var(--app-text-3)] truncate mt-[2px]">
            {highlightText(result.snippet, query)}
          </div>
        )}
        {result.tags.length > 0 && (
          <div className="flex gap-1 mt-[4px] flex-wrap">
            {result.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] text-[var(--app-text-3)] bg-[var(--app-tag-bg)] px-[6px] py-[1px] rounded-full border-[0.5px] border-[var(--app-border)]">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function HintKey({ label, text }: { label: string; text: string }): JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <kbd className="text-[10px] text-[var(--app-text-3)] bg-[var(--app-hover)] border-[0.5px] border-[var(--app-border)] rounded-[3px] px-[5px] py-[1px] font-mono">
        {label}
      </kbd>
      <span className="text-[10.5px] text-[var(--app-text-3)]">{text}</span>
    </div>
  )
}
