import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useSearchStore } from '../../stores/search.store'
import { searchService } from '../../services/search'
import { useManifestStore } from '../../stores/manifest.store'
import { useEditorStore } from '../../stores/editor.store'
import type { SearchResult as SearchResultType } from '../../types/electron'

const DEBOUNCE_MS = 300
const RECENT_DAYS = 7

type FilterType =
  | { kind: 'notebook'; notebookId: string }
  | { kind: 'tag'; tagName: string }
  | { kind: 'recent' }

export function SearchPanel(): JSX.Element {
  const query = useSearchStore((s) => s.query)
  const results = useSearchStore((s) => s.results)
  const isLoading = useSearchStore((s) => s.isLoading)
  const setQuery = useSearchStore((s) => s.setQuery)

  const notebooks = useManifestStore((s) => s.notebooks)
  const tags = useManifestStore((s) => s.tags)

  const [activeFilters, setActiveFilters] = useState<FilterType[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        searchService.query(value)
      }, DEBOUNCE_MS)
    },
    [setQuery]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const toggleFilter = useCallback((filter: FilterType) => {
    setActiveFilters((prev) => {
      const exists = prev.some((f) => filterKey(f) === filterKey(filter))
      return exists ? prev.filter((f) => filterKey(f) !== filterKey(filter)) : [...prev, filter]
    })
  }, [])

  const isFilterActive = useCallback(
    (filter: FilterType) => activeFilters.some((f) => filterKey(f) === filterKey(filter)),
    [activeFilters]
  )

  const notebookMap = useMemo(
    () => new Map(notebooks.map((n) => [n.id, n])),
    [notebooks]
  )

  const filteredResults = useMemo(() => {
    if (activeFilters.length === 0) return results

    return results.filter((r) => {
      return activeFilters.every((filter) => {
        switch (filter.kind) {
          case 'notebook':
            return r.notebook === filter.notebookId
          case 'tag':
            return r.tags.includes(filter.tagName)
          case 'recent': {
            if (!r.updatedAt) return false
            const diff = Date.now() - new Date(r.updatedAt).getTime()
            return diff <= RECENT_DAYS * 24 * 60 * 60 * 1000
          }
        }
      })
    })
  }, [results, activeFilters])

  const handleResultClick = useCallback((path: string) => {
    useEditorStore.getState().openNote(path)
  }, [])

  return (
    <div className="flex-1 flex flex-col bg-[var(--app-sidebar)] overflow-hidden">
      {/* Top area */}
      <div className="pt-5 px-[18px] pb-3.5 border-b-[0.5px] border-[var(--app-border)] shrink-0">
        {/* Search box */}
        <div className="flex items-center gap-2 bg-white/5 border-[0.5px] border-[rgba(124,110,245,0.4)] rounded-[var(--app-radius)] py-2 px-3 shadow-[0_0_0_3px_rgba(124,110,245,0.08)]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-60 shrink-0 text-[var(--app-text-1)]">
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4"/>
            <line x1="9" y1="9" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar notas…"
            className="flex-1 text-[13px] text-[var(--app-text-1)] placeholder:text-[var(--app-text-3)] bg-transparent outline-none border-none"
          />
          <span className="text-[10px] text-[var(--app-text-3)] bg-white/5 border-[0.5px] border-[var(--app-border-mid)] rounded-[4px] py-[2px] px-[5px] ml-auto font-mono shrink-0">
            ⌘K
          </span>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap mt-3">
          {notebooks.map((nb) => (
            <FilterPill
              key={nb.id}
              active={isFilterActive({ kind: 'notebook', notebookId: nb.id })}
              onClick={() => toggleFilter({ kind: 'notebook', notebookId: nb.id })}
              icon={
                <span
                  className="w-[6px] h-[6px] rounded-full shrink-0 inline-block"
                  style={{ background: nb.color ?? 'var(--app-accent)' }}
                />
              }
            >
              {nb.name}
            </FilterPill>
          ))}
          {tags.map((tag) => (
            <FilterPill
              key={tag.name}
              active={isFilterActive({ kind: 'tag', tagName: tag.name })}
              onClick={() => toggleFilter({ kind: 'tag', tagName: tag.name })}
              icon={
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1h3.5l4 4-3.5 3.5-4-4V1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                  <circle cx="3" cy="3" r=".8" fill="currentColor"/>
                </svg>
              }
            >
              # {tag.label}
            </FilterPill>
          ))}
          <FilterPill
            active={isFilterActive({ kind: 'recent' })}
            onClick={() => toggleFilter({ kind: 'recent' })}
            icon={
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="1" y="1.5" width="8" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.1"/>
                <line x1="1" y1="4" x2="9" y2="4" stroke="currentColor" strokeWidth="1"/>
              </svg>
            }
          >
            Últimos 7 dias
          </FilterPill>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!query.trim() && (
          <div className="flex items-center justify-center h-full text-[13px] text-[var(--app-text-3)]">
            Busque por título, conteúdo ou tag
          </div>
        )}

        {query.trim() && isLoading && (
          <div className="flex items-center justify-center h-full">
            <svg className="animate-spin h-5 w-5 text-[var(--app-accent)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {query.trim() && !isLoading && filteredResults.length === 0 && (
          <div className="flex items-center justify-center h-full text-[13px] text-[var(--app-text-3)]">
            Nenhum resultado
          </div>
        )}

        {query.trim() && !isLoading && filteredResults.length > 0 && (
          <>
            <SectionLabel>
              {filteredResults.length} resultado{filteredResults.length !== 1 ? 's' : ''} para &ldquo;{query}&rdquo;
            </SectionLabel>

            {filteredResults.map((result) => {
              const nb = result.notebook ? notebookMap.get(result.notebook) : undefined
              const color = nb?.color ?? 'var(--app-accent)'

              return (
                <SearchResultCard
                  key={result.path}
                  result={result}
                  query={query}
                  notebookName={nb?.name ?? null}
                  notebookColor={color}
                  onClick={() => handleResultClick(result.path)}
                />
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

/* ── Helpers ── */

function filterKey(f: FilterType): string {
  switch (f.kind) {
    case 'notebook': return `nb:${f.notebookId}`
    case 'tag': return `tag:${f.tagName}`
    case 'recent': return 'recent'
  }
}

function highlightText(text: string, term: string): React.ReactNode {
  if (!term.trim()) return text
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part
  )
}

/* ── Sub-components ── */

function FilterPill({
  children,
  active,
  icon,
  onClick
}: {
  children: React.ReactNode
  active?: boolean
  icon?: React.ReactNode
  onClick?: () => void
}): JSX.Element {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-[5px] py-1 px-[9px] rounded-full text-[11px] cursor-pointer transition-[background,color,border-color] duration-[120ms] border-[0.5px] ${
        active
          ? 'bg-[var(--app-accent-dim)] border-[rgba(124,110,245,0.3)] text-[var(--app-accent)]'
          : 'bg-white/[0.04] border-[var(--app-border-mid)] text-[var(--app-text-2)] hover:bg-[var(--app-accent-dim)] hover:text-[var(--app-accent)] hover:border-[rgba(124,110,245,0.3)]'
      }`}
    >
      {icon}
      {children}
    </div>
  )
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <div className={`text-[10px] uppercase tracking-[0.07em] text-[var(--app-text-3)] font-medium pt-3.5 px-[18px] pb-1.5 ${className ?? ''}`}>
      {children}
    </div>
  )
}

const noteIconPath = (color: string): JSX.Element => (
  <>
    <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke={color} strokeWidth="1.3"/>
    <line x1="4.5" y1="5" x2="9.5" y2="5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="4.5" y1="10" x2="7.5" y2="10" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
  </>
)

function SearchResultCard({
  result,
  query,
  notebookName,
  notebookColor,
  onClick
}: {
  result: SearchResultType
  query: string
  notebookName: string | null
  notebookColor: string
  onClick: () => void
}): JSX.Element {
  const iconBg = notebookColor.startsWith('var(')
    ? 'rgba(124,110,245,0.12)'
    : hexToRgba(notebookColor, 0.12)

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-2.5 py-2.5 px-[18px] cursor-pointer transition-colors duration-100 rounded-[var(--app-radius)] my-px mx-1.5 text-[var(--app-text-1)] hover:bg-[var(--app-hover)]"
    >
      {/* Icon */}
      <div
        className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center shrink-0 mt-px"
        style={{ background: iconBg }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          {noteIconPath(notebookColor)}
        </svg>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[var(--app-text-1)] truncate mb-[3px]">
          <MarkStyled>{highlightText(result.title, query)}</MarkStyled>
        </div>
        {result.snippet && (
          <div className="text-[11.5px] text-[var(--app-text-3)] leading-[1.5] line-clamp-2">
            <MarkStyled dimMark>{highlightText(result.snippet, query)}</MarkStyled>
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-[5px] flex-wrap">
          {notebookName && (
            <div className="text-[10.5px] text-[var(--app-text-3)] flex items-center gap-1">
              <span className="w-[5px] h-[5px] rounded-full shrink-0 inline-block" style={{ background: notebookColor }} />
              {notebookName}
            </div>
          )}
          {result.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-[var(--app-text-3)] bg-white/5 border-[0.5px] border-[var(--app-border)] py-px px-1.5 rounded-full"
            >
              # {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function MarkStyled({ children, dimMark }: { children: React.ReactNode; dimMark?: boolean }): JSX.Element {
  return (
    <span className={dimMark ? 'search-result-mark-dim' : 'search-result-mark'}>
      {children}
    </span>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(124,110,245,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}
