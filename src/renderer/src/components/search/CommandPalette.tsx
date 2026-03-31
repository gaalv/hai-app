import { useState, useEffect, useRef } from 'react'
import { useEditorStore } from '../../stores/editor.store'
import { useUIStore } from '../../stores/ui.store'
import { useManifestStore } from '../../stores/manifest.store'
import type { SearchResult } from '../../types/electron'

interface Props {
  onClose: () => void
}

interface Action {
  id: string
  label: string
  description?: string
  shortcut?: string
  icon: string
  run: () => void
}

export function CommandPalette({ onClose }: Props): JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toggleSidebar, toggleFocusMode, toggleVimMode, vimMode } = useUIStore()
  const { setView } = useManifestStore()

  const actions: Action[] = [
    { id: 'new-note', label: 'Nova nota', shortcut: '⌘N', icon: '✎', run: () => { /* handled by parent */ onClose() } },
    { id: 'toggle-sidebar', label: 'Toggle sidebar', shortcut: '⌘\\', icon: '⇥', run: () => { toggleSidebar(); onClose() } },
    { id: 'focus-mode', label: 'Focus mode', shortcut: '⌘⇧F', icon: '◎', run: () => { toggleFocusMode(); onClose() } },
    { id: 'vim-mode', label: vimMode ? 'Desativar Vim mode' : 'Ativar Vim mode', icon: '⌨', run: () => { toggleVimMode(); onClose() } },
    { id: 'all-notes', label: 'Todas as notas', icon: '≡', run: () => { setView('all'); onClose() } },
    { id: 'inbox', label: 'Inbox', icon: '⬇', run: () => { setView('inbox'); onClose() } },
    { id: 'pinned', label: 'Notas fixadas', icon: '📌', run: () => { setView('pinned'); onClose() } },
    { id: 'trash', label: 'Lixeira', icon: '🗑', run: () => { setView('trash'); onClose() } }
  ]

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const search = async (): Promise<void> => {
      if (!query.trim()) { setResults([]); return }
      const r = await window.electronAPI.search.query(query)
      setResults(r.slice(0, 8))
    }
    const t = setTimeout(search, 150)
    return () => clearTimeout(t)
  }, [query])

  const filteredActions = query
    ? actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : actions

  const allItems = [
    ...results.map((r) => ({ type: 'note' as const, data: r })),
    ...filteredActions.map((a) => ({ type: 'action' as const, data: a }))
  ]

  const openNote = useEditorStore((s) => s.openNote)

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
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[15vh] z-[300]" onClick={onClose}>
      <div
        className="bg-[var(--surface)] border border-[var(--border-2)] rounded-xl w-[580px] max-h-[420px] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <span className="text-[var(--text-3)] text-sm">⌘</span>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-[var(--text)] text-sm outline-none placeholder:text-[var(--text-4)]"
            placeholder="Buscar notas ou ações..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button className="text-[var(--text-3)] hover:text-[var(--text-2)] text-xs cursor-pointer" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {/* Results */}
        <div className="overflow-auto">
          {results.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] text-[var(--text-4)] uppercase tracking-widest border-b border-[var(--border)]">Notas</p>
              {results.map((r, i) => (
                <div
                  key={r.path}
                  className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selected === i ? 'bg-[var(--accent-dim)]' : 'hover:bg-[var(--surface-2)]'}`}
                  onClick={() => handleSelect(i)}
                  onMouseEnter={() => setSelected(i)}
                >
                  <span className="text-[var(--text-3)] text-sm mt-0.5">✎</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text)] truncate">{r.title}</p>
                    <p className="text-xs text-[var(--text-3)] truncate">{r.snippet}</p>
                  </div>
                  {r.tags.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {r.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 bg-[var(--surface-3)] text-[var(--text-3)] rounded">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {filteredActions.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] text-[var(--text-4)] uppercase tracking-widest border-b border-[var(--border)]">Ações</p>
              {filteredActions.map((a, i) => {
                const globalIdx = results.length + i
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selected === globalIdx ? 'bg-[var(--accent-dim)]' : 'hover:bg-[var(--surface-2)]'}`}
                    onClick={() => handleSelect(globalIdx)}
                    onMouseEnter={() => setSelected(globalIdx)}
                  >
                    <span className="text-[var(--text-3)] text-sm w-4 text-center">{a.icon}</span>
                    <span className="flex-1 text-sm text-[var(--text)]">{a.label}</span>
                    {a.shortcut && <span className="text-xs text-[var(--text-4)] bg-[var(--surface-3)] px-1.5 py-0.5 rounded">{a.shortcut}</span>}
                  </div>
                )
              })}
            </div>
          )}

          {allItems.length === 0 && query && (
            <p className="px-4 py-6 text-sm text-[var(--text-3)] text-center">Nenhum resultado para "{query}"</p>
          )}
        </div>
      </div>
    </div>
  )
}
