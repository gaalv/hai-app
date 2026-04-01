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
    synced:           { icon: '✓', label: 'synced',   cls: 'text-green-500/70' },
    pending:          { icon: '●', label: `${pendingChanges}p`,  cls: 'text-yellow-500/70' },
    syncing:          { icon: '⟳', label: 'syncing',  cls: 'text-blue-400/70 animate-spin' },
    error:            { icon: '✕', label: 'error',    cls: 'text-red-400/70' },
    'not-configured': { icon: '○', label: '',         cls: 'text-[var(--text-4)]' }
  }

  const sync = syncConfig[status] ?? syncConfig['not-configured']

  return (
    <div className="flex items-center justify-between px-3 h-[22px] font-sans text-[10px] bg-[var(--bg)] border-t border-[var(--border)] shrink-0 select-none titlebar-no-drag">
      {/* Left */}
      <div className="flex items-center gap-2">
        <button
          className={`flex items-center gap-1 cursor-pointer hover:opacity-100 opacity-80 transition-opacity ${sync.cls}`}
          onClick={onSyncClick}
          title={lastSync ? `Último sync: ${new Date(lastSync).toLocaleString('pt-BR')}` : undefined}
        >
          <span>{sync.icon}</span>
          {sync.label && <span>{sync.label}</span>}
        </button>
      </div>

      {/* Right */}
      {activeNote && (
        <div className="flex items-center gap-2.5 text-[var(--text-4)]">
          {vimMode && <span className="text-[var(--accent)] font-medium tracking-wide">VIM</span>}
          <span>{wordCount}w</span>
          <span>{charCount}c</span>
          <span>md</span>
        </div>
      )}
    </div>
  )
}
