import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '../../stores/editor.store'
import { useUIStore } from '../../stores/ui.store'
import { useManifestStore } from '../../stores/manifest.store'
import { useSearchStore } from '../../stores/search.store'
import { syncService } from '../../services/sync'
import type { SearchResult } from '../../types/electron'

interface Action {
  id: string
  label: string
  description?: string
  shortcut?: string
  icon: string
  run: () => void
}

interface Props {
  onClose: () => void
}

export function CommandPalette({ onClose }: Props): JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toggleSidebar, toggleFocusMode, toggleVimMode, vimMode } = useUIStore()
  const { setView } = useManifestStore()
  const openNote = useEditorStore((s) => s.openNote)
  const openPalette = useSearchStore((s) => s.openPalette)

  const isCommandMode = query.startsWith('>')

  const actions: Action[] = [
    {
      id: 'new-note',
      label: 'Nova nota',
      shortcut: '⌘N',
      icon: '✎',
      run: () => {
        // trigger via keyboard shortcut mechanism
        window.dispatchEvent(new CustomEvent('hai:new-note'))
        onClose()
      }
    },
    {
      id: 'toggle-sidebar',
      label: 'Alternar sidebar',
      shortcut: '⌘\\',
      icon: '⇥',
      run: () => { toggleSidebar(); onClose() }
    },
    {
      id: 'focus-mode',
      label: 'Modo foco',
      shortcut: '⌘⇧F',
      icon: '◎',
      run: () => { toggleFocusMode(); onClose() }
    },
    {
      id: 'vim-mode',
      label: vimMode ? 'Desativar Vim mode' : 'Ativar Vim mode',
      icon: '⌨',
      run: () => { toggleVimMode(); onClose() }
    },
    {
      id: 'sync',
      label: 'Sincronizar',
      shortcut: '⌘⇧S',
      icon: '↑',
      run: () => { syncService.push(); onClose() }
    },
    {
      id: 'settings',
      label: 'Abrir configurações',
      shortcut: '⌘,',
      icon: '⚙',
      run: () => { window.dispatchEvent(new CustomEvent('hai:settings')); onClose() }
    },
    {
      id: 'all-notes',
      label: 'Todas as notas',
      icon: '≡',
      run: () => { setView('all'); onClose() }
    },
    {
      id: 'inbox',
      label: 'Inbox',
      icon: '⬇',
      run: () => { setView('inbox'); onClose() }
    },
    {
      id: 'pinned',
      label: 'Notas fixadas',
      icon: '📌',
      run: () => { setView('pinned'); onClose() }
    },
    {
      id: 'trash',
      label: 'Lixeira',
      icon: '🗑',
      run: () => { setView('trash'); onClose() }
    },
    {
      id: 'search',
      label: 'Buscar notas',
      shortcut: '⌘K',
      icon: '🔍',
      run: () => { openPalette(); onClose() }
    }
  ]

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (isCommandMode || !q.trim()) {
      setResults([])
      return
    }
    setIsLoading(true)
    try {
      const r = await window.electronAPI.search.query(q)
      setResults(r.slice(0, 8))
    } finally {
      setIsLoading(false)
    }
  }, [isCommandMode])

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 200)
    return () => clearTimeout(t)
  }, [query, runSearch])

  const filteredActions = isCommandMode
    ? actions.filter((a) => a.label.toLowerCase().includes(query.slice(1).toLowerCase()))
    : query
      ? actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
      : actions.slice(0, 5)

  const allItems = [
    ...results.map((r) => ({ type: 'note' as const, data: r })),
    ...filteredActions.map((a) => ({ type: 'action' as const, data: a }))
  ]

  function handleSelect(idx: number): void {
    const item = allItems[idx]
    if (!item) return
    if (item.type === 'note') {
      openNote(item.data.path)
      onClose()
    } else {
      item.data.run()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, allItems.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); handleSelect(selected) }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[15vh] z-[300]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border-2)] rounded-xl w-[600px] max-h-[500px] flex flex-col shadow-2xl overflow-hidden"
        style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0">
          <span className="text-[var(--text-3)] text-sm">
            {isCommandMode ? '>' : '⌘'}
          </span>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-[var(--text)] text-sm outline-none placeholder:text-[var(--text-4)]"
            placeholder="Buscar notas... (use > para comandos)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              className="text-[var(--text-3)] hover:text-[var(--text-2)] text-xs cursor-pointer"
              onClick={() => { setQuery(''); setResults([]); setSelected(0) }}
            >
              ✕
            </button>
          )}
          <span className="text-[10px] text-[var(--text-4)]">Esc para fechar</span>
        </div>

        {/* Results */}
        <div className="overflow-auto">
          {isLoading && (
            <div className="px-4 py-3 text-xs text-[var(--text-4)]">Buscando...</div>
          )}

          {!isLoading && results.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] text-[var(--text-4)] uppercase tracking-widest border-b border-[var(--border)]">
                Notas
              </p>
              {results.map((r, i) => (
                <div
                  key={r.path}
                  className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    selected === i ? 'bg-[var(--accent-dim)]' : 'hover:bg-[var(--surface-2)]'
                  }`}
                  onClick={() => handleSelect(i)}
                  onMouseEnter={() => setSelected(i)}
                >
                  <span className="text-[var(--text-3)] text-sm mt-0.5 shrink-0">✎</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text)] truncate font-medium">{r.title}</p>
                    <p className="text-xs text-[var(--text-3)] truncate">{r.snippet}</p>
                  </div>
                  {r.tags.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {r.tags.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 bg-[var(--surface-3)] text-[var(--text-3)] rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {filteredActions.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] text-[var(--text-4)] uppercase tracking-widest border-b border-[var(--border)]">
                {isCommandMode ? 'Comandos' : 'Ações'}
              </p>
              {filteredActions.map((a, i) => {
                const globalIdx = results.length + i
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      selected === globalIdx ? 'bg-[var(--accent-dim)]' : 'hover:bg-[var(--surface-2)]'
                    }`}
                    onClick={() => handleSelect(globalIdx)}
                    onMouseEnter={() => setSelected(globalIdx)}
                  >
                    <span className="text-[var(--text-3)] text-sm w-4 text-center shrink-0">{a.icon}</span>
                    <span className="flex-1 text-sm text-[var(--text)]">{a.label}</span>
                    {a.description && (
                      <span className="text-xs text-[var(--text-4)] truncate max-w-[200px]">{a.description}</span>
                    )}
                    {a.shortcut && (
                      <span className="text-xs text-[var(--text-4)] bg-[var(--surface-3)] px-1.5 py-0.5 rounded shrink-0">
                        {a.shortcut}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!isLoading && allItems.length === 0 && query && (
            <p className="px-4 py-6 text-sm text-[var(--text-3)] text-center">
              Sem resultados para "{query}"
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
