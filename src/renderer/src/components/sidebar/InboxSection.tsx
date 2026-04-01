import { useManifestStore } from '../../stores/manifest.store'
import { useFileTreeStore } from '../../stores/fileTree.store'
import { useEditorStore } from '../../stores/editor.store'
import { useVaultStore } from '../../stores/vault.store'
import { pathJoin } from '../../lib/path'

export function InboxSection(): JSX.Element {
  const { manifest, view, setView } = useManifestStore()
  const nodes = useFileTreeStore((s) => s.nodes)
  const vaultPath = useVaultStore((s) => s.config?.path ?? '')
  const openNote = useEditorStore((s) => s.openNote)
  const activePath = useEditorStore((s) => s.activeNote?.path ?? null)

  const inboxAbsPath = pathJoin(vaultPath, manifest.inbox)
  const inboxNode = nodes.find((n) => n.type === 'dir' && n.path === inboxAbsPath)
  const inboxNotes = inboxNode?.children?.filter((n) => n.type === 'file') ?? []
  const count = inboxNotes.length

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer text-sm transition-colors ${
          view === 'inbox'
            ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
            : 'text-[var(--text-2)] hover:bg-[var(--surface-3)]'
        }`}
        onClick={() => setView('inbox')}
      >
        <span className="text-xs w-4 text-center">⬇</span>
        <span className="flex-1 truncate">Inbox</span>
        {count > 0 && (
          <span className="text-[10px] bg-[var(--surface-3)] text-[var(--text-3)] px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>

      {view === 'inbox' && (
        <div className="pl-5">
          {inboxNotes.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--text-4)]">Inbox vazio</p>
          ) : (
            inboxNotes.map((n) => {
              const isActive = n.path === activePath
              return (
                <div
                  key={n.path}
                  className={`flex items-center px-2 py-1.5 mx-1 rounded-md cursor-pointer text-[13px] transition-colors ${
                    isActive
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                      : 'text-[var(--text-2)] hover:bg-[var(--surface-3)]'
                  }`}
                  onClick={() => openNote(n.path)}
                  title={n.name}
                >
                  <span className="truncate">{n.name.replace('.md', '')}</span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
