import { useState, useEffect, useCallback, useRef } from 'react'
import { useManifestStore } from '../../stores/manifest.store'
import { useEditorStore } from '../../stores/editor.store'
import { searchService } from '../../services/search'
import type { SearchResult } from '../../types/electron'
import type { Notebook } from '../../types/manifest'

const NOTEBOOK_COLORS = [
  '#C05010', '#3FD68F', '#F5A623', '#F472B6',
  '#60A5FA', '#34D399', '#FB923C',
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

export function NotebooksPanel(): JSX.Element {
  const notebooks = useManifestStore((s) => s.notebooks)
  const createNotebook = useManifestStore((s) => s.createNotebook)

  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(NOTEBOOK_COLORS[0])
  const [newDescription, setNewDescription] = useState('')
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

  // Search notes when notebook selection changes
  useEffect(() => {
    if (!selectedNotebook) {
      setResults([])
      return
    }
    let cancelled = false
    setIsSearching(true)
    searchService.query('notebook:' + selectedNotebook).then((res) => {
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
  }, [selectedNotebook])

  const handleSelectNotebook = useCallback((name: string) => {
    setSelectedNotebook((prev) => (prev === name ? null : name))
  }, [])

  const handleOpenNote = useCallback((path: string) => {
    useEditorStore.getState().openNote(path)
  }, [])

  const handleCreateNotebook = useCallback(async () => {
    const name = newName.trim()
    if (!name) return
    await createNotebook(name)
    setNewName('')
    setNewColor(NOTEBOOK_COLORS[0])
    setNewDescription('')
    setShowCreateForm(false)
  }, [newName, createNotebook])

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
          Notebooks
        </div>
        <div
          onClick={() => setShowCreateForm((v) => !v)}
          className="flex items-center gap-[5px] py-[5px] px-2.5 bg-white/[0.04] border-[0.5px] border-[var(--app-border-mid)] rounded-[var(--app-radius)] text-[11.5px] text-[var(--app-text-2)] cursor-pointer transition-colors duration-[120ms] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)]"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <line x1="5.5" y1="1" x2="5.5" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="1" y1="5.5" x2="10" y2="5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Novo notebook
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-4 px-[22px]">
        {/* Create notebook form */}
        {showCreateForm && (
          <div className="mb-4 p-3 bg-white/[0.03] border-[0.5px] border-[var(--app-border-mid)] rounded-[10px]">
            <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--app-text-3)] font-medium mb-2">
              Novo notebook
            </div>
            <input
              ref={nameInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateNotebook(); if (e.key === 'Escape') setShowCreateForm(false) }}
              placeholder="Nome do notebook"
              className="w-full bg-white/[0.05] border-[0.5px] border-[var(--app-border)] rounded-[var(--app-radius)] px-2.5 py-1.5 text-[12px] text-[var(--app-text-1)] placeholder:text-[var(--app-text-3)] outline-none focus:border-[var(--app-accent)] mb-2"
            />
            <div className="flex items-center gap-1.5 mb-2.5">
              {NOTEBOOK_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${newColor === c ? 'scale-125 ring-1 ring-white/30' : 'hover:scale-110'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateNotebook(); if (e.key === 'Escape') setShowCreateForm(false) }}
              placeholder="Descrição (opcional)"
              className="w-full bg-white/[0.05] border-[0.5px] border-[var(--app-border)] rounded-[var(--app-radius)] px-2.5 py-1.5 text-[12px] text-[var(--app-text-1)] placeholder:text-[var(--app-text-3)] outline-none focus:border-[var(--app-accent)] mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateNotebook}
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

        {notebooks.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-3 text-[var(--app-text-3)]">
              <path d="M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <line x1="8" y1="4" x2="8" y2="20" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            <div className="text-[13px] text-[var(--app-text-2)] mb-1">Nenhum notebook criado</div>
            <div className="text-[11px] text-[var(--app-text-3)]">
              Clique em &quot;Novo notebook&quot; para começar a organizar suas notas.
            </div>
          </div>
        ) : (
          <>
            {/* Section label */}
            <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--app-text-3)] font-medium mb-2.5">
              Todos os notebooks ({notebooks.length})
            </div>

            {/* Notebook cards grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              {notebooks.map((nb) => (
                <NotebookCard
                  key={nb.id}
                  notebook={nb}
                  selected={selectedNotebook === nb.name}
                  onClick={() => handleSelectNotebook(nb.name)}
                />
              ))}
            </div>

            {/* Notes section */}
            {selectedNotebook ? (
              <>
                <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--app-text-3)] font-medium mb-2.5">
                  Notas em {selectedNotebook} {!isSearching && `(${maxResults})`}
                </div>

                {isSearching ? (
                  <div className="text-[11px] text-[var(--app-text-3)] py-4 text-center">
                    Buscando…
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-[11px] text-[var(--app-text-3)] py-4 text-center">
                    Nenhuma nota neste notebook.
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
                Selecione um notebook para ver as notas
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function NotebookCard({
  notebook,
  selected,
  onClick,
}: {
  notebook: Notebook
  selected: boolean
  onClick: () => void
}): JSX.Element {
  const color = notebook.color || NOTEBOOK_COLORS[0]
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
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center"
          style={{ background: color + '1a' }}
        >
          <div
            className="w-[10px] h-[10px] rounded-full"
            style={{ background: color }}
          />
        </div>
      </div>
      <div className="text-xs text-[var(--app-text-2)] truncate">{notebook.name}</div>
      <div className="mt-2 h-0.5 rounded-[1px] bg-white/[0.07] overflow-hidden">
        <div
          className="h-full rounded-[1px]"
          style={{ width: '100%', background: color }}
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
