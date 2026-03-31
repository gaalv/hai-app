import { useState } from 'react'
import { useFileTreeStore } from '../../stores/fileTree.store'
import { useEditorStore } from '../../stores/editor.store'
import { useVaultStore } from '../../stores/vault.store'
import { useUIStore } from '../../stores/ui.store'
import type { FileNode } from '../../types/notes'

interface NodeProps {
  node: FileNode
  activePath: string | null
  vaultPath: string
}

function TreeNode({ node, activePath, vaultPath }: NodeProps): JSX.Element {
  const [expanded, setExpanded] = useState(true)
  const openNote = useEditorStore((s) => s.openNote)
  const refresh = useFileTreeStore((s) => s.refresh)

  async function handleDelete(): Promise<void> {
    if (!confirm(`Deletar "${node.name}"?`)) return
    await window.electronAPI.notes.delete(node.path)
    refresh(vaultPath)
  }

  async function handleRename(): Promise<void> {
    const newName = prompt('Novo nome:', node.name.replace('.md', ''))
    if (!newName || newName === node.name.replace('.md', '')) return
    await window.electronAPI.notes.rename(node.path, newName)
    refresh(vaultPath)
  }

  if (node.type === 'dir') {
    return (
      <div>
        <div
          className="flex items-center gap-1.5 px-3 py-1 cursor-pointer text-xs text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors select-none"
          onClick={() => setExpanded((e) => !e)}
        >
          <span className="text-[9px]">{expanded ? '▾' : '▸'}</span>
          <span className="uppercase tracking-wider font-medium">{node.name}</span>
        </div>
        {expanded && node.children?.map((child) => (
          <div key={child.path} className="pl-3">
            <TreeNode node={child} activePath={activePath} vaultPath={vaultPath} />
          </div>
        ))}
      </div>
    )
  }

  const isActive = node.path === activePath

  return (
    <div className="relative flex items-center group">
      <div
        className={`flex items-center px-3 py-1.5 cursor-pointer text-[13px] flex-1 overflow-hidden rounded-sm mx-1 transition-colors ${
          isActive
            ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
            : 'text-[var(--text-2)] hover:bg-[var(--surface-3)]'
        }`}
        onClick={() => openNote(node.path)}
        title={node.name}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {node.name.replace('.md', '')}
        </span>
      </div>
      <div className="absolute right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)] cursor-pointer text-[10px] px-1 py-0.5 rounded transition-colors"
          onClick={handleRename}
          title="Renomear"
        >✎</button>
        <button
          className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-3)] hover:text-red-400 cursor-pointer text-[10px] px-1 py-0.5 rounded transition-colors"
          onClick={handleDelete}
          title="Deletar"
        >✕</button>
      </div>
    </div>
  )
}

export function FileTree(): JSX.Element {
  const { nodes, isLoading } = useFileTreeStore()
  const activePath = useEditorStore((s) => s.activeNote?.path ?? null)
  const vaultConfig = useVaultStore((s) => s.config)
  const vaultPath = vaultConfig?.path ?? ''
  const sidebarWidth = useUIStore((s) => s.sidebarWidth)

  async function handleNewNote(): Promise<void> {
    const path = await window.electronAPI.notes.create(vaultPath)
    useEditorStore.getState().openNote(path)
  }

  return (
    <div
      className="bg-[var(--surface)] border-r border-[var(--border)] flex flex-col h-full select-none"
      style={{ width: sidebarWidth }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] shrink-0">
        <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-widest overflow-hidden text-ellipsis whitespace-nowrap">
          {vaultConfig?.name ?? 'Vault'}
        </span>
        <button
          className="text-[var(--text-3)] hover:text-[var(--text-2)] cursor-pointer text-lg leading-none w-6 h-6 flex items-center justify-center transition-colors"
          onClick={handleNewNote}
          title="Nova nota (⌘N)"
        >+</button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto py-1">
        {isLoading ? (
          <p className="px-3 py-2 text-[var(--text-4)] text-xs">Carregando...</p>
        ) : nodes.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-[var(--text-4)] text-xs mb-1">Vault vazio</p>
            <p className="text-[var(--text-4)] text-xs opacity-60">⌘N para criar nota</p>
          </div>
        ) : (
          nodes.map((node) => (
            <TreeNode key={node.path} node={node} activePath={activePath} vaultPath={vaultPath} />
          ))
        )}
      </div>
    </div>
  )
}
