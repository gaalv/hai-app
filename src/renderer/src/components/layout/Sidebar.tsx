import { useEffect, useState } from 'react'
import { useManifestStore } from '../../stores/manifest.store'
import { useNotesStore } from '../../stores/notes.store'
import { useAuthStore } from '../../stores/auth.store'

const NOTEBOOK_COLORS = ['#7C6EF5', '#3FD68F', '#F5A623', '#F472B6', '#60A5FA', '#34D399', '#FB923C']

export function Sidebar(): JSX.Element {
  const { notebooks, tags, activeNotebook, setView, isLoaded, load, createNotebook } = useManifestStore()
  const { loadNotes } = useNotesStore()
  const { profile } = useAuthStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newNotebookName, setNewNotebookName] = useState('')

  useEffect(() => {
    if (!isLoaded) {
      load().then(() => {
        // Auto-select first notebook if none selected
        const manifest = useManifestStore.getState()
        if (!manifest.activeNotebook && manifest.notebooks.length > 0) {
          const first = manifest.notebooks[0]
          setView('notebook', first.id)
          loadNotes(first.id)
        }
      })
    }
  }, [isLoaded])

  function handleNotebookClick(notebookId: string): void {
    setView('notebook', notebookId)
    loadNotes(notebookId)
  }

  function toggleCreateForm(): void {
    setShowCreateForm((v) => !v)
    setNewNotebookName('')
  }

  async function handleCreateNotebook(): Promise<void> {
    const name = newNotebookName.trim()
    if (!name) {
      setShowCreateForm(false)
      return
    }
    const nb = await createNotebook(name)
    setShowCreateForm(false)
    setNewNotebookName('')
    setView('notebook', nb.id)
    loadNotes(nb.id)
  }

  const workspaceName = profile?.name || profile?.login || 'Workspace'

  return (
    <nav
      className="flex flex-col shrink-0 overflow-hidden w-[220px] bg-[var(--app-sidebar)] border-r-[0.5px] border-r-[var(--app-border)]"
    >
      {/* Header */}
      <div
        className="shrink-0 pt-[14px] px-[14px] pb-[10px] border-b-[0.5px] border-b-[var(--app-border)]"
      >
        <div
          className="text-[11px] font-medium text-[var(--app-text-2)] tracking-[0.06em] uppercase overflow-hidden text-ellipsis whitespace-nowrap"
        >
          {workspaceName}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {/* Notebooks section */}
        <div className="pt-[10px] px-[8px] pb-[4px]">
          <div className="group flex items-center justify-between px-[6px] py-0 mb-[2px]">
            <div className="text-[10.5px] font-medium text-[var(--app-text-3)] tracking-[0.05em] uppercase">
              Notebooks
            </div>
            <button
              onClick={toggleCreateForm}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center rounded text-[var(--app-text-3)] hover:text-[var(--app-text-1)] hover:bg-[var(--app-hover)] cursor-pointer bg-transparent border-none"
              title="Novo notebook"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {showCreateForm && (
            <div className="px-[6px] mb-1">
              <input
                autoFocus
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNotebook()
                  if (e.key === 'Escape') {
                    setShowCreateForm(false)
                    setNewNotebookName('')
                  }
                }}
                onBlur={handleCreateNotebook}
                placeholder="Nome do notebook"
                className="w-full bg-white/5 border-[0.5px] border-[var(--app-accent)] rounded-[var(--app-radius)] py-[4px] px-[8px] text-[12px] text-[var(--app-text-1)] placeholder:text-[var(--app-text-3)] outline-none"
              />
            </div>
          )}

          {!isLoaded && (
            <div className="p-[8px] text-[12px] text-[var(--app-text-3)]">
              Carregando...
            </div>
          )}

          {isLoaded && notebooks.length === 0 && (
            <div className="p-[8px] text-[12px] text-[var(--app-text-3)]">
              Nenhum notebook
            </div>
          )}

          {notebooks.map((nb, i) => {
            const color = nb.color || NOTEBOOK_COLORS[i % NOTEBOOK_COLORS.length]
            const isActive = activeNotebook === nb.id
            return (
              <div
                key={nb.id}
                className={`flex items-center cursor-pointer gap-[8px] py-[6px] px-[8px] rounded-[var(--app-radius)] text-[12.5px] transition-colors duration-[120ms] ${isActive ? 'bg-[var(--app-accent-dim)] text-[var(--app-text-1)]' : 'text-[var(--app-text-2)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)]'}`}
                onClick={() => handleNotebookClick(nb.id)}
              >
                <span
                  className="w-[7px] h-[7px] rounded-full shrink-0"
                  style={{ background: color }}
                />
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {nb.name}
                </span>
              </div>
            )
          })}
        </div>

        {/* Tags section */}
        {tags.length > 0 && (
          <>
            <div className="pt-[10px] px-[8px] pb-[4px]">
              <div
                className="text-[10.5px] font-medium text-[var(--app-text-3)] tracking-[0.05em] uppercase px-[6px] py-0 mb-[2px]"
              >
                Tags
              </div>
            </div>
            <div className="px-[8px] pb-[8px]">
              {tags.map((tag) => (
                <TagPill key={tag.name} label={`# ${tag.label || tag.name}`} color={tag.color} />
              ))}
            </div>
          </>
        )}
      </div>
    </nav>
  )
}

function TagPill({ label, color, active }: { label: string; color?: string; active?: boolean }): JSX.Element {
  return (
    <span
      className={`inline-flex items-center cursor-pointer py-[3px] px-[8px] rounded-full text-[11px] m-[2px] border-[0.5px] transition-colors duration-[120ms] ${
        active
          ? `bg-[var(--app-accent-dim)] border-[rgba(124,110,245,0.3)]${!color ? ' text-[var(--app-accent)]' : ''}`
          : 'bg-[var(--app-tag-bg)] text-[var(--app-tag-text)] border-[var(--app-border)]'
      }`}
      style={active && color ? { color } : undefined}
    >
      {label}
    </span>
  )
}
