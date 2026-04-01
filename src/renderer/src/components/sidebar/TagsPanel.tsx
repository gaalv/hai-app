import { useState, useEffect } from 'react'
import { useManifestStore } from '../../stores/manifest.store'
import { manifestService } from '../../services/manifest'
import type { Tag } from '../../types/manifest'

interface ContextMenu {
  x: number
  y: number
  tag: Tag
}

export function TagsPanel(): JSX.Element {
  const { manifest, view, activeTag, setView } = useManifestStore()

  const [creating, setCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('')

  useEffect(() => {
    const handler = (): void => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  async function handleCreate(): Promise<void> {
    const label = newLabel.trim()
    if (!label) { setCreating(false); return }
    const name = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    await manifestService.createTag({ name, label, color: newColor })
    setNewLabel('')
    setNewColor('#6366f1')
    setCreating(false)
  }

  async function handleUpdate(): Promise<void> {
    if (!editing) return
    const label = editLabel.trim()
    if (!label) { setEditing(null); return }
    await manifestService.updateTag(editing.name, { label, color: editColor })
    setEditing(null)
  }

  async function handleDelete(tag: Tag): Promise<void> {
    if (!confirm(`Deletar tag "${tag.label}"? Ela será removida de todas as notas.`)) return
    await manifestService.deleteTag(tag.name)
    setContextMenu(null)
  }

  function openContextMenu(e: React.MouseEvent, tag: Tag): void {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, tag })
  }

  if (manifest.tags.length === 0 && !creating) {
    return (
      <div>
        <div className="flex items-center justify-between px-3 py-1 mt-2">
          <span className="text-[10px] font-semibold text-[var(--text-4)] uppercase tracking-widest">Tags</span>
          <button
            className="text-[var(--text-4)] hover:text-[var(--text-2)] text-xs cursor-pointer transition-colors w-4 h-4 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); setCreating(true) }}
            title="Criar tag"
          >+</button>
        </div>
        <p className="px-3 py-1 text-xs text-[var(--text-4)]">Nenhuma tag</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 mt-2">
        <span className="text-[10px] font-semibold text-[var(--text-4)] uppercase tracking-widest">Tags</span>
        <button
          className="text-[var(--text-4)] hover:text-[var(--text-2)] text-xs cursor-pointer transition-colors w-4 h-4 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setCreating(true) }}
          title="Criar tag"
        >+</button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="px-2 mb-2 flex flex-col gap-1">
          <input
            autoFocus
            className="w-full px-2 py-1 bg-[var(--surface-3)] text-[var(--text)] text-xs border border-[var(--accent)] rounded outline-none"
            placeholder="Nome da tag"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setCreating(false); setNewLabel('') }
            }}
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
            />
            <span className="text-[10px] text-[var(--text-4)]">Cor</span>
            <button
              className="ml-auto text-xs px-2 py-0.5 bg-[var(--accent)] text-white rounded cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handleCreate}
            >
              Criar
            </button>
          </div>
        </div>
      )}

      {/* Tag list */}
      {manifest.tags.map((tag) => (
        <div key={tag.name}>
          {editing?.name === tag.name ? (
            <div className="px-2 mb-1 flex flex-col gap-1">
              <input
                autoFocus
                className="w-full px-2 py-1 bg-[var(--surface-3)] text-[var(--text)] text-xs border border-[var(--accent)] rounded outline-none"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdate()
                  if (e.key === 'Escape') setEditing(null)
                }}
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                />
                <button
                  className="ml-auto text-xs px-2 py-0.5 bg-[var(--accent)] text-white rounded cursor-pointer hover:opacity-90"
                  onClick={handleUpdate}
                >
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer text-sm transition-colors ${
                view === 'tag' && activeTag === tag.name
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--surface-3)]'
              }`}
              onClick={() => setView('tag', tag.name)}
              onContextMenu={(e) => openContextMenu(e, tag)}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="text-[13px] truncate flex-1">{tag.label}</span>
            </div>
          )}
        </div>
      ))}

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
              setEditing(contextMenu.tag)
              setEditLabel(contextMenu.tag.label)
              setEditColor(contextMenu.tag.color)
              setContextMenu(null)
            }}
          >
            ✎ Editar
          </button>
          <div className="border-t border-[var(--border)] my-1" />
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 cursor-pointer"
            onClick={() => handleDelete(contextMenu.tag)}
          >
            🗑 Deletar
          </button>
        </div>
      )}
    </div>
  )
}
