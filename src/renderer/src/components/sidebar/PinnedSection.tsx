import { useManifestStore } from '../../stores/manifest.store'
import { useEditorStore } from '../../stores/editor.store'
import { useVaultStore } from '../../stores/vault.store'
import { manifestService } from '../../services/manifest'
import { useState, useEffect } from 'react'
import path from 'path'

interface ContextMenu {
  x: number
  y: number
  relativePath: string
}

export function PinnedSection(): JSX.Element {
  const { manifest, view, setView } = useManifestStore()
  const vaultPath = useVaultStore((s) => s.config?.path ?? '')
  const openNote = useEditorStore((s) => s.openNote)
  const activePath = useEditorStore((s) => s.activeNote?.path ?? null)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)

  useEffect(() => {
    const handler = (): void => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  const { pinned } = manifest

  if (pinned.length === 0) return <></>

  async function handleUnpin(relativePath: string): Promise<void> {
    await manifestService.unpinNote(relativePath)
    setContextMenu(null)
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer text-sm transition-colors ${
          view === 'pinned'
            ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
            : 'text-[var(--text-2)] hover:bg-[var(--surface-3)]'
        }`}
        onClick={() => setView('pinned')}
      >
        <span className="text-xs w-4 text-center">📌</span>
        <span className="flex-1 truncate">Fixadas</span>
        <span className="text-[10px] bg-[var(--surface-3)] text-[var(--text-3)] px-1.5 py-0.5 rounded-full">
          {pinned.length}
        </span>
      </div>

      {view === 'pinned' && (
        <div className="pl-5">
          {pinned.map((rel) => {
            const absPath = path.join(vaultPath, rel)
            const name = path.basename(rel, '.md')
            const isActive = absPath === activePath
            return (
              <div
                key={rel}
                className={`flex items-center px-2 py-1.5 mx-1 rounded-md cursor-pointer text-[13px] transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                    : 'text-[var(--text-2)] hover:bg-[var(--surface-3)]'
                }`}
                onClick={() => openNote(absPath)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setContextMenu({ x: e.clientX, y: e.clientY, relativePath: rel })
                }}
                title={name}
              >
                <span className="truncate">{name}</span>
              </div>
            )
          })}
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed bg-[var(--surface-2)] border border-[var(--border-2)] rounded-lg py-1 z-[500] shadow-xl min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--surface-3)] cursor-pointer"
            onClick={() => handleUnpin(contextMenu.relativePath)}
          >
            📌 Desafixar
          </button>
        </div>
      )}
    </div>
  )
}
