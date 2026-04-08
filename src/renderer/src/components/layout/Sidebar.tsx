import { useEffect, useState, useRef } from 'react'
import { useManifestStore } from '../../stores/manifest.store'
import { useNotesStore } from '../../stores/notes.store'
import { useEditorStore } from '../../stores/editor.store'
import { useVaultStore } from '../../stores/vault.store'
import { useAuthStore } from '../../stores/auth.store'

const NOTEBOOK_COLORS = ['#C05010', '#3FD68F', '#F5A623', '#F472B6', '#60A5FA', '#34D399', '#FB923C']
const TAG_COLORS = ['#C05010', '#3FD68F', '#F5A623', '#C084FC', '#F472B6', '#60A5FA', '#F87171', '#34D399']

export function Sidebar(): JSX.Element {
  const { notebooks, tags, activeNotebook, setView, isLoaded, load, createNotebook, createTag } = useManifestStore()
  const { loadNotes, selectNote } = useNotesStore()
  const activeNote = useEditorStore((s) => s.activeNote)
  const vaultPath = useVaultStore((s) => s.config?.path)
  const { profile } = useAuthStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newNotebookName, setNewNotebookName] = useState('')
  const [showTagForm, setShowTagForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const tagInputRef = useRef<HTMLInputElement>(null)

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

  // Sync sidebar to currently open note
  useEffect(() => {
    if (!activeNote || !vaultPath || !isLoaded) return
    const notePath = activeNote.path
    // Extract the notebook directory segment: {vaultPath}/{nb.path}/{file}.md
    const rel = notePath.startsWith(vaultPath) ? notePath.slice(vaultPath.length + 1) : notePath
    const nbPathSegment = rel.split('/')[0]
    const matchingNb = notebooks.find((n) => n.path === nbPathSegment)
    if (!matchingNb) return
    if (matchingNb.id !== activeNotebook) {
      setView('notebook', matchingNb.id)
      loadNotes(matchingNb.id).then(() => {
        selectNote(notePath)
      })
    } else {
      // Notebook already active — just ensure note is selected in the list
      selectNote(notePath)
    }
  }, [activeNote?.path])

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

  async function handleCreateTag(): Promise<void> {
    const name = newTagName.trim().toLowerCase().replace(/\s+/g, '-')
    if (!name) {
      setShowTagForm(false)
      return
    }
    await createTag({ name, label: name, color: newTagColor })
    setShowTagForm(false)
    setNewTagName('')
    setNewTagColor(TAG_COLORS[0])
  }

  useEffect(() => {
    if (showTagForm) setTimeout(() => tagInputRef.current?.focus(), 50)
  }, [showTagForm])

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
      <div className="flex-1 overflow-auto flex flex-col">
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
              <div className="flex items-center gap-[6px] bg-white/5 border-[0.5px] border-[var(--app-accent)] rounded-[var(--app-radius)] py-[4px] px-[8px]">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="shrink-0 text-[var(--app-accent)]">
                  <rect x="1" y="1.5" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="3.5" y1="4.5" x2="8.5" y2="4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  <line x1="3.5" y1="6.5" x2="8.5" y2="6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  <line x1="3.5" y1="8.5" x2="6" y2="8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                </svg>
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
                  className="flex-1 bg-transparent text-[12px] text-[var(--app-text-1)] placeholder:text-[var(--app-text-3)] outline-none border-none"
                />
              </div>
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
                className={`flex items-center cursor-pointer gap-[8px] py-[8px] px-[8px] rounded-[var(--app-radius)] text-[12.5px] transition-colors duration-[120ms] ${isActive ? 'bg-[var(--app-accent-dim)] text-[var(--app-text-1)]' : 'text-[var(--app-text-2)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)]'}`}
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
        <div className="pt-[10px] px-[8px] pb-[10px]">
          <div className="group flex items-center justify-between px-[6px] py-0 mb-[8px]">
            <div className="text-[10.5px] font-medium text-[var(--app-text-3)] tracking-[0.05em] uppercase">
              Tags
            </div>
            <button
              onClick={() => { setShowTagForm((v) => !v); setNewTagName('') }}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center rounded text-[var(--app-text-3)] hover:text-[var(--app-text-1)] hover:bg-[var(--app-hover)] cursor-pointer bg-transparent border-none"
              title="Nova tag"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {showTagForm && (
            <div className="mb-[8px] px-[2px]">
              <div className="flex items-center gap-[6px] bg-white/5 border-[0.5px] border-[var(--app-accent)] rounded-[var(--app-radius)] py-[4px] px-[8px] mb-[6px]">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="shrink-0 text-[var(--app-accent)]">
                  <path d="M1.5 1.5h4.2l4.8 4.8-4.2 4.2-4.8-4.8V1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  <circle cx="4" cy="4" r="0.9" fill="currentColor"/>
                </svg>
                <input
                  ref={tagInputRef}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTag()
                    if (e.key === 'Escape') { setShowTagForm(false); setNewTagName('') }
                  }}
                  onBlur={() => { if (!newTagName.trim()) setShowTagForm(false) }}
                  placeholder="nome-da-tag"
                  className="flex-1 bg-transparent text-[11.5px] text-[var(--app-text-1)] placeholder:text-[var(--app-text-3)] outline-none border-none"
                />
              </div>
              {/* Color picker */}
              <div className="flex gap-[4px] flex-wrap px-[2px]">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewTagColor(c)}
                    className="w-[14px] h-[14px] rounded-full border-[1.5px] cursor-pointer bg-transparent"
                    style={{
                      background: c,
                      borderColor: newTagColor === c ? 'var(--app-text-1)' : 'transparent',
                    }}
                  />
                ))}
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="ml-auto text-[10px] text-[var(--app-accent)] bg-transparent border-none cursor-pointer disabled:opacity-30 font-medium"
                >
                  Criar
                </button>
              </div>
            </div>
          )}

          {tags.length === 0 && !showTagForm && (
            <div
              onClick={() => setShowTagForm(true)}
              className="text-[11px] text-[var(--app-text-3)] cursor-pointer hover:text-[var(--app-text-2)] transition-colors px-[6px]"
            >
              + Criar primeira tag
            </div>
          )}

          <div className="flex flex-wrap gap-[5px] px-[2px]">
            {tags.map((tag) => (
              <TagChip
                key={tag.name}
                name={tag.name}
                label={tag.label || tag.name}
                color={tag.color}
                onClick={() => setView('tag', tag.name)}
              />
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Trash */}
        <div className="px-[8px] pb-[10px]">
          <TrashNavItem />
        </div>
      </div>
    </nav>
  )
}

function TrashNavItem(): JSX.Element {
  const { view, setView, trash } = useManifestStore()
  const isActive = view === 'trash'
  return (
    <div
      className={`flex items-center gap-[8px] py-[7px] px-[8px] rounded-[var(--app-radius)] text-[12px] cursor-pointer transition-colors duration-[120ms] ${
        isActive
          ? 'bg-[var(--app-accent-dim)] text-[var(--app-text-1)]'
          : 'text-[var(--app-text-3)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-2)]'
      }`}
      onClick={() => setView('trash')}
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0">
        <path d="M2 3.5h9M5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M10.5 3.5l-.6 7a.5.5 0 0 1-.5.5H3.6a.5.5 0 0 1-.5-.5l-.6-7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="flex-1">Lixeira</span>
      {trash.length > 0 && (
        <span className="text-[10px] text-[var(--app-text-3)] tabular-nums">{trash.length}</span>
      )}
    </div>
  )
}

function TagChip({ name, label, color, onClick }: { name: string; label: string; color?: string; onClick?: () => void }): JSX.Element {
  const activeTag = useManifestStore((s) => s.activeTag)
  const view = useManifestStore((s) => s.view)
  const isActive = view === 'tag' && activeTag === name
  const chipColor = color || 'var(--app-accent)'
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[11px] border-[0.5px] transition-colors duration-[120ms] cursor-pointer bg-transparent font-[var(--font-sans)] ${
        isActive
          ? 'border-[var(--app-accent)] text-[var(--app-text-1)]'
          : 'border-[var(--app-border-mid)] text-[var(--app-text-3)] hover:border-[var(--app-accent)] hover:text-[var(--app-text-2)]'
      }`}
      style={isActive ? { background: `rgba(${hexToRgb(chipColor)}, 0.12)` } : undefined}
    >
      <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: chipColor }} />
      {label}
    </button>
  )
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return '192, 80, 16'
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '192, 80, 16'
  return `${r}, ${g}, ${b}`
}
