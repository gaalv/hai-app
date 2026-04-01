import { useState, useEffect } from 'react'
import { useFileTreeStore } from '../../stores/fileTree.store'
import { useEditorStore } from '../../stores/editor.store'
import { useVaultStore } from '../../stores/vault.store'
import { useUIStore } from '../../stores/ui.store'
import { useManifestStore } from '../../stores/manifest.store'
import type { FileNode } from '../../types/notes'
import type { Notebook } from '../../types/manifest'
import { pathJoin, pathRelative } from '../../lib/path'

// ── Context menu ──────────────────────────────────────────

interface ContextMenuState {
  x: number; y: number
  target: { type: 'note'; node: FileNode } | { type: 'notebook'; nb: Notebook }
}

// ── File node item ────────────────────────────────────────

function NoteItem({ node, activePath, onContextMenu }: {
  node: FileNode
  activePath: string | null
  vaultPath?: string
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void
}): JSX.Element {
  const openNote = useEditorStore((s) => s.openNote)
  const isActive = node.path === activePath

  return (
    <div
      className={`group flex items-center px-2 py-1.5 mx-1 rounded-md cursor-pointer text-[13px] transition-colors ${
        isActive ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'text-[var(--text-2)] hover:bg-[var(--surface-3)]'
      }`}
      onClick={() => openNote(node.path)}
      onContextMenu={(e) => onContextMenu(e, node)}
      title={node.name}
    >
      <span className="truncate">{node.name.replace('.md', '')}</span>
    </div>
  )
}

// ── Section header ────────────────────────────────────────

function SectionHeader({ label, action }: { label: string; action?: { icon: string; onClick: () => void; title: string } }): JSX.Element {
  return (
    <div className="flex items-center justify-between px-3 py-1 mt-2">
      <span className="text-[10px] font-semibold text-[var(--text-4)] uppercase tracking-widest">{label}</span>
      {action && (
        <button
          className="text-[var(--text-4)] hover:text-[var(--text-2)] text-xs cursor-pointer transition-colors w-4 h-4 flex items-center justify-center"
          onClick={action.onClick}
          title={action.title}
        >
          {action.icon}
        </button>
      )}
    </div>
  )
}

// ── Sidebar nav item ──────────────────────────────────────

function NavItem({ icon, label, active, count, onClick }: {
  icon: string; label: string; active: boolean; count?: number; onClick: () => void
}): JSX.Element {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer text-sm transition-colors ${
        active ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'text-[var(--text-2)] hover:bg-[var(--surface-3)]'
      }`}
      onClick={onClick}
    >
      <span className="text-xs w-4 text-center">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] bg-[var(--surface-3)] text-[var(--text-3)] px-1.5 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  )
}

// ── Main Sidebar ──────────────────────────────────────────

export function Sidebar(): JSX.Element {
  const { nodes, refresh } = useFileTreeStore()
  const activePath = useEditorStore((s) => s.activeNote?.path ?? null)
  const vaultConfig = useVaultStore((s) => s.config)
  const vaultPath = vaultConfig?.path ?? ''
  const sidebarWidth = useUIStore((s) => s.sidebarWidth)
  const { manifest, view, activeNotebook, activeTag, setView, createNotebook, pinNote, unpinNote } = useManifestStore()
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [expandedNbs, setExpandedNbs] = useState<Set<string>>(new Set())
  const [newNbName, setNewNbName] = useState('')
  const [creatingNb, setCreatingNb] = useState(false)

  // Close context menu on click outside
  useEffect(() => {
    const handler = (): void => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  function toggleNotebook(id: string): void {
    setExpandedNbs((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleNewNote(notebookPath?: string): Promise<void> {
    const dest = notebookPath ? pathJoin(vaultPath, notebookPath) : vaultPath
    const filePath = await window.electronAPI.notes.create(dest)
    useEditorStore.getState().openNote(filePath)
    refresh(vaultPath)
  }

  async function handleCreateNotebook(): Promise<void> {
    if (!newNbName.trim()) return
    await createNotebook(newNbName.trim())
    setNewNbName('')
    setCreatingNb(false)
    refresh(vaultPath)
  }

  function handleNoteContextMenu(e: React.MouseEvent, node: FileNode): void {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, target: { type: 'note', node } })
  }

  // Pinned notes
  const pinnedNodes = nodes.flatMap(function flat(n: FileNode): FileNode[] {
    if (n.type === 'file') return [n]
    return (n.children ?? []).flatMap(flat)
  }).filter((n) => {
    const rel = pathRelative(vaultPath, n.path)
    return manifest.pinned.includes(rel)
  })

  // Inbox notes
  const inboxPath = pathJoin(vaultPath, manifest.inbox)
  const inboxNode = nodes.find((n) => n.type === 'dir' && n.path === inboxPath)
  const inboxCount = inboxNode?.children?.length ?? 0

  // All notes flat
  function flatNotes(ns: FileNode[]): FileNode[] {
    return ns.flatMap((n) => n.type === 'file' ? [n] : flatNotes(n.children ?? []))
  }

  // Notes for current view
  function getViewNotes(): FileNode[] {
    if (view === 'pinned') return pinnedNodes
    if (view === 'inbox') return inboxNode?.children?.filter((n) => n.type === 'file') ?? []
    if (view === 'all') return flatNotes(nodes)
    if (view === 'notebook' && activeNotebook) {
      const nb = manifest.notebooks.find((n) => n.id === activeNotebook)
      if (!nb) return []
      const nbAbsPath = pathJoin(vaultPath, nb.path)
      const nbNode = nodes.find((n) => n.path === nbAbsPath)
      return nbNode?.children?.filter((n) => n.type === 'file') ?? []
    }
    if (view === 'tag' && activeTag) {
      // Tag filtering requires reading frontmatter - for now show all (TODO: filter by tag)
      return flatNotes(nodes)
    }
    return flatNotes(nodes)
  }

  const viewNotes = getViewNotes()

  return (
    <div
      className="bg-[var(--surface)] border-r border-[var(--border)] flex flex-col h-full select-none"
      style={{ width: sidebarWidth }}
    >
      {/* Vault name + new note */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)] shrink-0">
        <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-widest truncate">
          {vaultConfig?.name ?? 'Vault'}
        </span>
        <button
          className="text-[var(--text-3)] hover:text-[var(--text-2)] cursor-pointer text-base w-6 h-6 flex items-center justify-center transition-colors"
          onClick={() => handleNewNote()}
          title="Nova nota (⌘N)"
        >+</button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-1">
        {/* System views */}
        <NavItem icon="≡" label="Todas as notas" active={view === 'all'} count={flatNotes(nodes).length} onClick={() => setView('all')} />
        <NavItem icon="⬇" label="Inbox" active={view === 'inbox'} count={inboxCount} onClick={() => setView('inbox')} />
        {pinnedNodes.length > 0 && (
          <NavItem icon="📌" label="Fixadas" active={view === 'pinned'} count={pinnedNodes.length} onClick={() => setView('pinned')} />
        )}

        {/* Notebooks */}
        <SectionHeader
          label="Notebooks"
          action={{ icon: '+', onClick: () => setCreatingNb(true), title: 'Criar notebook' }}
        />

        {creatingNb && (
          <div className="px-2 mb-1">
            <input
              className="w-full px-2 py-1 bg-[var(--surface-3)] text-[var(--text)] text-xs border border-[var(--accent)] rounded outline-none"
              placeholder="Nome do notebook"
              value={newNbName}
              autoFocus
              onChange={(e) => setNewNbName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNotebook()
                if (e.key === 'Escape') setCreatingNb(false)
              }}
              onBlur={() => setCreatingNb(false)}
            />
          </div>
        )}

        {manifest.notebooks.map((nb) => (
          <div key={nb.id}>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer text-sm transition-colors group ${
                view === 'notebook' && activeNotebook === nb.id
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--surface-3)]'
              }`}
              onClick={() => { setView('notebook', nb.id); toggleNotebook(nb.id) }}
            >
              <span className="text-[9px] text-[var(--text-4)]">{expandedNbs.has(nb.id) ? '▾' : '▸'}</span>
              <span className="text-xs w-4 text-center">{nb.icon ?? '📓'}</span>
              <span className="flex-1 truncate text-[13px]">{nb.name}</span>
              <button
                className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--text-2)] text-xs cursor-pointer transition-all"
                onClick={(e) => { e.stopPropagation(); handleNewNote(nb.path) }}
                title="Nova nota neste notebook"
              >+</button>
            </div>

            {expandedNbs.has(nb.id) && view === 'notebook' && activeNotebook === nb.id && (
              <div className="pl-5">
                {viewNotes.map((n) => (
                  <NoteItem
                    key={n.path}
                    node={n}
                    activePath={activePath}
                    vaultPath={vaultPath}
                    onContextMenu={handleNoteContextMenu}
                  />
                ))}
                {viewNotes.length === 0 && (
                  <p className="px-3 py-2 text-xs text-[var(--text-4)]">Notebook vazio</p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Tags */}
        {manifest.tags.length > 0 && (
          <>
            <SectionHeader label="Tags" />
            {manifest.tags.map((tag) => (
              <div
                key={tag.name}
                className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer text-sm transition-colors ${
                  view === 'tag' && activeTag === tag.name
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                    : 'text-[var(--text-2)] hover:bg-[var(--surface-3)]'
                }`}
                onClick={() => setView('tag', tag.name)}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="text-[13px] truncate">{tag.label}</span>
              </div>
            ))}
          </>
        )}

        {/* Notes list for current view (non-notebook views) */}
        {view !== 'notebook' && (
          <>
            <SectionHeader label={view === 'all' ? 'Notas' : view === 'inbox' ? 'Inbox' : view === 'pinned' ? 'Fixadas' : 'Resultados'} />
            {viewNotes.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--text-4)]">Nenhuma nota</p>
            ) : (
              viewNotes.map((n) => (
                <NoteItem
                  key={n.path}
                  node={n}
                  activePath={activePath}
                  vaultPath={vaultPath}
                  onContextMenu={handleNoteContextMenu}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && contextMenu.target.type === 'note' && (
        <div
          className="fixed bg-[var(--surface-2)] border border-[var(--border-2)] rounded-lg py-1 z-[500] shadow-xl min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const node = (contextMenu.target as { type: 'note'; node: FileNode }).node
            const rel = pathRelative(vaultPath, node.path)
            const isPinned = manifest.pinned.includes(rel)
            return (
              <>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--surface-3)] cursor-pointer"
                  onClick={() => { isPinned ? unpinNote(rel) : pinNote(rel); setContextMenu(null) }}
                >
                  {isPinned ? '📌 Desafixar' : '📌 Fixar nota'}
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--surface-3)] cursor-pointer"
                  onClick={async () => {
                    const newName = prompt('Novo nome:', node.name.replace('.md', ''))
                    if (!newName) { setContextMenu(null); return }
                    await window.electronAPI.notes.rename(node.path, newName)
                    refresh(vaultPath)
                    setContextMenu(null)
                  }}
                >
                  ✎ Renomear
                </button>
                <div className="border-t border-[var(--border)] my-1" />
                <button
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 cursor-pointer"
                  onClick={async () => {
                    if (!confirm(`Mover "${node.name}" para a lixeira?`)) { setContextMenu(null); return }
                    await window.electronAPI.manifest.trashNote(node.path)
                    refresh(vaultPath)
                    setContextMenu(null)
                  }}
                >
                  🗑 Mover para lixeira
                </button>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
