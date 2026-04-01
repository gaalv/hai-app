import { useState, useRef, useEffect } from 'react'
import { useManifestStore } from '../../stores/manifest.store'
import { useFileTreeStore } from '../../stores/fileTree.store'
import { useVaultStore } from '../../stores/vault.store'
import { manifestService } from '../../services/manifest'
import type { Notebook } from '../../types/manifest'

interface ContextMenu {
  x: number
  y: number
  notebook: Notebook
}

export function NotebookSection(): JSX.Element {
  const { manifest, view, activeNotebook, setView } = useManifestStore()
  const refresh = useFileTreeStore((s) => s.refresh)
  const vaultPath = useVaultStore((s) => s.config?.path ?? '')

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Notebook | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const notebooks = [...manifest.notebooks].sort((a, b) => a.order - b.order)

  useEffect(() => {
    const handler = (): void => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  async function handleCreate(): Promise<void> {
    const name = newName.trim()
    if (!name) { setCreating(false); return }
    await manifestService.createNotebook(name)
    setNewName('')
    setCreating(false)
    refresh(vaultPath)
  }

  async function handleRename(id: string): Promise<void> {
    const name = renameName.trim()
    if (!name) { setRenaming(null); return }
    await manifestService.renameNotebook(id, name)
    setRenaming(null)
    refresh(vaultPath)
  }

  async function handleDelete(nb: Notebook, moveToInbox: boolean): Promise<void> {
    await manifestService.deleteNotebook(nb.id, moveToInbox)
    setConfirmDelete(null)
    setContextMenu(null)
    refresh(vaultPath)
  }

  function openContextMenu(e: React.MouseEvent, nb: Notebook): void {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, notebook: nb })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 mt-2">
        <span className="text-[10px] font-semibold text-[var(--text-4)] uppercase tracking-widest">
          Notebooks
        </span>
        <button
          className="text-[var(--text-4)] hover:text-[var(--text-2)] text-xs cursor-pointer transition-colors w-4 h-4 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setCreating(true) }}
          title="Criar notebook"
        >
          +
        </button>
      </div>

      {/* New notebook input */}
      {creating && (
        <div className="px-2 mb-1">
          <input
            ref={inputRef}
            autoFocus
            className="w-full px-2 py-1 bg-[var(--surface-3)] text-[var(--text)] text-xs border border-[var(--accent)] rounded outline-none"
            placeholder="Nome do notebook"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setCreating(false); setNewName('') }
            }}
            onBlur={() => { if (!newName.trim()) setCreating(false) }}
          />
        </div>
      )}

      {/* Notebook list */}
      {notebooks.map((nb) => (
        <div key={nb.id}>
          {renaming === nb.id ? (
            <div className="px-2 mb-1">
              <input
                autoFocus
                className="w-full px-2 py-1 bg-[var(--surface-3)] text-[var(--text)] text-xs border border-[var(--accent)] rounded outline-none"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(nb.id)
                  if (e.key === 'Escape') setRenaming(null)
                }}
                onBlur={() => handleRename(nb.id)}
              />
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer text-sm transition-colors group ${
                view === 'notebook' && activeNotebook === nb.id
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--surface-3)]'
              }`}
              style={nb.color ? { borderLeft: `2px solid ${nb.color}` } : undefined}
              onClick={() => setView('notebook', nb.id)}
              onContextMenu={(e) => openContextMenu(e, nb)}
            >
              <span className="text-xs w-4 text-center">{nb.icon ?? '📓'}</span>
              <span className="flex-1 truncate text-[13px]">{nb.name}</span>
            </div>
          )}
        </div>
      ))}

      {notebooks.length === 0 && !creating && (
        <p className="px-3 py-1 text-xs text-[var(--text-4)]">Nenhum notebook</p>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-[var(--surface-2)] border border-[var(--border-2)] rounded-lg py-1 z-[500] shadow-xl min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--surface-3)] cursor-pointer"
            onClick={() => {
              setRenaming(contextMenu.notebook.id)
              setRenameName(contextMenu.notebook.name)
              setContextMenu(null)
            }}
          >
            ✎ Renomear
          </button>
          <div className="border-t border-[var(--border)] my-1" />
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 cursor-pointer"
            onClick={() => { setConfirmDelete(contextMenu.notebook); setContextMenu(null) }}
          >
            🗑 Deletar
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[600]"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl p-6 w-[340px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[var(--text)] mb-2">
              Deletar notebook "{confirmDelete.name}"
            </h3>
            <p className="text-xs text-[var(--text-3)] mb-5">
              O que fazer com as notas dentro deste notebook?
            </p>
            <div className="flex flex-col gap-2">
              <button
                className="px-4 py-2.5 bg-[var(--surface-3)] hover:bg-[var(--surface)] text-[var(--text-2)] rounded-lg text-sm transition-colors cursor-pointer"
                onClick={() => handleDelete(confirmDelete, true)}
              >
                Mover notas para o Inbox
              </button>
              <button
                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors cursor-pointer"
                onClick={() => handleDelete(confirmDelete, false)}
              >
                Deletar notas permanentemente
              </button>
              <button
                className="px-4 py-2 text-xs text-[var(--text-4)] hover:text-[var(--text-3)] cursor-pointer transition-colors"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
