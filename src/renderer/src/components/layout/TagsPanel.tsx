import { useState, useEffect, useCallback, useRef } from 'react'
import { useManifestStore } from '../../stores/manifest.store'
import { useEditorStore } from '../../stores/editor.store'
import { searchService } from '../../services/search'
import type { SearchResult } from '../../types/electron'
import type { Tag } from '../../types/manifest'

const TAG_COLORS = [
  '#C05010', '#3FD68F', '#F5A623', '#C084FC',
  '#F472B6', '#60A5FA', '#F87171', '#34D399',
]

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return days[date.getDay()]
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function TagsPanel(): JSX.Element {
  const tags = useManifestStore((s) => s.tags)
  const notebooks = useManifestStore((s) => s.notebooks)
  const createTag = useManifestStore((s) => s.createTag)

  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Notebook color lookup
  const notebookColorMap = useCallback(
    (notebookName: string | null): string => {
      if (!notebookName) return 'var(--app-text-3)'
      const nb = notebooks.find((n) => n.name === notebookName || n.path === notebookName)
      return nb?.color ?? 'var(--app-text-3)'
    },
    [notebooks]
  )

  // Search notes when tag selection changes
  useEffect(() => {
    if (!selectedTag) {
      setResults([])
      return
    }
    let cancelled = false
    setIsSearching(true)
    searchService.query('tag:' + selectedTag).then((res) => {
      if (!cancelled) {
        setResults(res)
        setIsSearching(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setResults([])
        setIsSearching(false)
      }
    })
    return () => { cancelled = true }
  }, [selectedTag])

  const handleSelectTag = useCallback((name: string) => {
    setSelectedTag((prev) => (prev === name ? null : name))
  }, [])

  const handleOpenNote = useCallback((path: string) => {
    useEditorStore.getState().openNote(path)
  }, [])

  const handleCreateTag = useCallback(async () => {
    const name = newTagName.trim().toLowerCase().replace(/\s+/g, '-')
    if (!name) return
    await createTag({ name, label: name, color: newTagColor })
    setNewTagName('')
    setNewTagColor(TAG_COLORS[0])
    setShowCreateForm(false)
  }, [newTagName, newTagColor, createTag])

  // Focus input when form opens
  useEffect(() => {
    if (showCreateForm) nameInputRef.current?.focus()
  }, [showCreateForm])

  const maxResults = results.length

  return (
    <div className="flex-1 flex flex-col bg-[var(--app-main)] overflow-hidden">
      {/* Header */}
      <div className="pt-[18px] px-[22px] pb-3.5 border-b-[0.5px] border-[var(--app-border)] flex items-center justify-between shrink-0">
        <div className="text-[15px] font-medium text-[var(--app-text-1)] tracking-[-0.3px]">
          Tags
        </div>
        <div
          onClick={() => setShowCreateForm((v) => !v)}
          className="flex items-center gap-[5px] py-[5px] px-2.5 bg-white/[0.04] border-[0.5px] border-[var(--app-border-mid)] rounded-[var(--app-radius)] text-[11.5px] text-[var(--app-text-2)] cursor-pointer transition-colors duration-[120ms] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)]"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <line x1="5.5" y1="1" x2="5.5" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="1" y1="5.5" x2="10" y2="5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Nova tag
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-4 px-[22px]">
        {/* Create tag form */}
        {showCreateForm && (
          <div className="mb-4 p-3 bg-white/[0.03] border-[0.5px] border-[var(--app-border-mid)] rounded-[10px]">
            <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--app-text-3)] font-medium mb-2">
              Nova tag
            </div>
            <input
              ref={nameInputRef}
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag(); if (e.key === 'Escape') setShowCreateForm(false) }}
              placeholder="Nome da tag"
              className="w-full bg-white/[0.05] border-[0.5px] border-[var(--app-border)] rounded-[var(--app-radius)] px-2.5 py-1.5 text-[12px] text-[var(--app-text-1)] placeholder:text-[var(--app-text-3)] outline-none focus:border-[var(--app-accent)] mb-2"
            />
            <div className="flex items-center gap-1.5 mb-2.5">
              {TAG_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${newTagColor === c ? 'scale-125 ring-1 ring-white/30' : 'hover:scale-110'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateTag}
                className="flex-1 py-1.5 bg-[var(--app-accent)] text-white text-[11px] font-medium rounded-[var(--app-radius)] hover:brightness-110 transition-all"
              >
                Criar
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 py-1.5 bg-white/[0.05] text-[var(--app-text-2)] text-[11px] font-medium rounded-[var(--app-radius)] hover:bg-white/[0.08] transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {tags.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-3 text-[var(--app-text-3)]">
              <path d="M7 7h10v10H7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M7 7l3-3h7l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            <div className="text-[13px] text-[var(--app-text-2)] mb-1">Nenhuma tag criada</div>
            <div className="text-[11px] text-[var(--app-text-3)]">
              Clique em &quot;Nova tag&quot; para começar a organizar suas notas.
            </div>
          </div>
        ) : (
          <>
            {/* Section label */}
            <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--app-text-3)] font-medium mb-2.5">
              Todas as tags ({tags.length})
            </div>

            {/* Tag cards grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              {tags.map((tag) => (
                <TagCard
                  key={tag.name}
                  tag={tag}
                  selected={selectedTag === tag.name}
                  onClick={() => handleSelectTag(tag.name)}
                />
              ))}
            </div>

            {/* Notes section */}
            {selectedTag ? (
              <>
                <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--app-text-3)] font-medium mb-2.5">
                  Notas com # {selectedTag} {!isSearching && `(${maxResults})`}
                </div>

                {isSearching ? (
                  <div className="text-[11px] text-[var(--app-text-3)] py-4 text-center">
                    Buscando…
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-[11px] text-[var(--app-text-3)] py-4 text-center">
                    Nenhuma nota com essa tag.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {results.map((r) => (
                      <NoteItem
                        key={r.path}
                        title={r.title}
                        notebook={r.notebook}
                        notebookColor={notebookColorMap(r.notebook)}
                        date={formatRelativeDate(r.updatedAt)}
                        onClick={() => handleOpenNote(r.path)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[11px] text-[var(--app-text-3)] py-4 text-center">
                Selecione uma tag para ver as notas
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TagIcon({ color }: { color: string }): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 4.5C2 3.12 3.12 2 4.5 2H7.17c.4 0 .78.16 1.06.44l3.33 3.33a1.5 1.5 0 010 2.12l-2.67 2.67a1.5 1.5 0 01-2.12 0L3.44 7.23A1.5 1.5 0 013 6.17V4.5z"
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="5.5" cy="5.5" r="1" fill={color} />
    </svg>
  )
}

function TagCard({
  tag,
  selected,
  onClick,
}: {
  tag: Tag
  selected: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <div
      onClick={onClick}
      className={`rounded-[10px] p-3.5 cursor-pointer transition-all duration-[120ms] relative overflow-hidden border-[0.5px] ${
        selected
          ? 'bg-[var(--app-accent-dim)] border-[rgba(124,110,245,0.35)]'
          : 'bg-white/[0.03] border-[var(--app-border)] hover:bg-white/[0.05] hover:border-[var(--app-border-mid)] hover:-translate-y-px'
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[13px]"
          style={{ background: tag.color + '1a' }}
        >
          <TagIcon color={tag.color} />
        </div>
      </div>
      <div className="text-xs text-[var(--app-text-2)]"># {tag.label}</div>
      <div className="mt-2 h-0.5 rounded-[1px] bg-white/[0.07] overflow-hidden">
        <div
          className="h-full rounded-[1px]"
          style={{ width: '100%', background: tag.color }}
        />
      </div>
    </div>
  )
}

function NoteItem({
  title,
  notebook,
  notebookColor,
  date,
  onClick,
}: {
  title: string
  notebook: string | null
  notebookColor: string
  date: string
  onClick: () => void
}): JSX.Element {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2.5 py-2.5 px-3 bg-white/[0.03] border-[0.5px] border-[var(--app-border)] rounded-[var(--app-radius)] cursor-pointer transition-colors duration-100 hover:bg-[var(--app-hover)] hover:border-[var(--app-border-mid)]"
    >
      <div
        className="w-[7px] h-[7px] rounded-full shrink-0"
        style={{ background: notebookColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium text-[var(--app-text-1)] truncate">
          {title}
        </div>
        {notebook && (
          <div className="text-[11px] text-[var(--app-text-3)]">{notebook}</div>
        )}
      </div>
      <div className="text-[11px] text-[var(--app-text-3)] whitespace-nowrap">{date}</div>
    </div>
  )
}
