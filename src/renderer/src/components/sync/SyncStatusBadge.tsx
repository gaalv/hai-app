import { useSyncStore } from '../../stores/sync.store'

interface Props {
  onClick: () => void
}

export function SyncStatusBadge({ onClick }: Props): JSX.Element {
  const { status, pendingChanges } = useSyncStore()

  const config: Record<string, { label: string; color: string; bg: string }> = {
    synced:         { label: '✓ Sincronizado', color: '#4ade80', bg: '#0a1a0a' },
    pending:        { label: `↑ ${pendingChanges} pendente${pendingChanges !== 1 ? 's' : ''}`, color: '#facc15', bg: '#1a1500' },
    syncing:        { label: '⟳ Sincronizando', color: '#60a5fa', bg: '#0a0f1a' },
    error:          { label: '✕ Erro', color: '#f87171', bg: '#1a0a0a' },
    'not-configured': { label: '○ Sem sync', color: '#555', bg: 'transparent' }
  }

  const { label, color, bg } = config[status] ?? config['not-configured']

  return (
    <button onClick={onClick} style={{ ...styles.badge, color, background: bg }}>
      {label}
    </button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    border: 'none',
    borderRadius: 4,
    padding: '3px 10px',
    fontSize: 11,
    fontFamily: 'monospace',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  }
}
