import { useSyncStore } from '../../stores/sync.store'
import { useEditorStore } from '../../stores/editor.store'
import { useUIStore } from '../../stores/ui.store'

interface Props {
  onSyncClick: () => void
}

export function Statusbar({ onSyncClick }: Props): JSX.Element {
  const { status, lastSync, pendingChanges } = useSyncStore()
  const activeNote = useEditorStore((s) => s.activeNote)
  const vimMode = useUIStore((s) => s.vimMode)

  const wordCount = activeNote
    ? activeNote.content.trim().split(/\s+/).filter(Boolean).length
    : 0

  const charCount = activeNote ? activeNote.content.length : 0

  const syncConfig: Record<string, { icon: string; label: string; cls: string }> = {
    synced:           { icon: '✓', label: 'Sincronizado', cls: 'text-green-400' },
    pending:          { icon: '●', label: `${pendingChanges} pendente${pendingChanges !== 1 ? 's' : ''}`, cls: 'text-yellow-400' },
    syncing:          { icon: '⟳', label: 'Sincronizando', cls: 'text-blue-400 animate-spin' },
    error:            { icon: '✕', label: 'Erro de sync', cls: 'text-red-400' },
    'not-configured': { icon: '○', label: 'Sync desativado', cls: 'text-[var(--text-3)]' }
  }

  const sync = syncConfig[status] ?? syncConfig['not-configured']

  return (
    <div className="flex items-center justify-between px-3 h-[22px] text-[11px] bg-[var(--surface)] border-t border-[var(--border)] shrink-0 select-none titlebar-no-drag">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          className={`flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${sync.cls}`}
          onClick={onSyncClick}
          title={lastSync ? `Último sync: ${new Date(lastSync).toLocaleString('pt-BR')}` : undefined}
        >
          <span>{sync.icon}</span>
          <span>{sync.label}</span>
        </button>
      </div>

      {/* Right */}
      {activeNote && (
        <div className="flex items-center gap-3 text-[var(--text-3)]">
          {vimMode && <span className="text-[var(--accent)] font-medium">VIM</span>}
          <span>{wordCount} palavras</span>
          <span>{charCount} chars</span>
          <span>Markdown</span>
        </div>
      )}
    </div>
  )
}
