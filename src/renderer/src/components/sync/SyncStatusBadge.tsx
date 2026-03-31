import { useSyncStore } from '../../stores/sync.store'

interface Props {
  onClick: () => void
}

export function SyncStatusBadge({ onClick }: Props): JSX.Element {
  const { status, pendingChanges } = useSyncStore()

  const config: Record<string, { label: string; cls: string }> = {
    synced:           { label: '✓ Sincronizado',  cls: 'text-green-400 bg-green-400/10' },
    pending:          { label: `↑ ${pendingChanges} pendente${pendingChanges !== 1 ? 's' : ''}`, cls: 'text-yellow-400 bg-yellow-400/10' },
    syncing:          { label: '⟳ Sincronizando', cls: 'text-blue-400 bg-blue-400/10' },
    error:            { label: '✕ Erro',           cls: 'text-red-400 bg-red-400/10' },
    'not-configured': { label: '○ Sync',           cls: 'text-[var(--text-3)] bg-transparent' }
  }

  const { label, cls } = config[status] ?? config['not-configured']

  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded text-[11px] cursor-pointer whitespace-nowrap transition-opacity hover:opacity-80 ${cls}`}
    >
      {label}
    </button>
  )
}
