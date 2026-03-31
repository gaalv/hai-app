import { useSyncStore } from '../../stores/sync.store'
import { syncService } from '../../services/sync'

export function ConflictModal(): JSX.Element | null {
  const conflicts = useSyncStore((s) => s.conflicts)
  if (conflicts.length === 0) return null

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Conflitos de sincronização</h2>
        <p style={styles.subtitle}>Escolha qual versão manter para cada arquivo:</p>

        <div style={styles.list}>
          {conflicts.map((conflict) => (
            <div key={conflict.path} style={styles.item}>
              <span style={styles.filename}>{conflict.path}</span>
              <div style={styles.actions}>
                <button style={styles.localBtn} onClick={() => syncService.resolveConflict(conflict.path, 'local')}>
                  Manter local
                </button>
                <button style={styles.remoteBtn} onClick={() => syncService.resolveConflict(conflict.path, 'remote')}>
                  Usar remoto
                </button>
              </div>
            </div>
          ))}
        </div>

        <button style={styles.cancelBtn} onClick={() => useSyncStore.getState().setConflicts([])}>
          Cancelar pull
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#141414', border: '1px solid #f87171', borderRadius: 8, padding: 28, width: 480, fontFamily: 'monospace', maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  title: { margin: '0 0 4px', fontSize: 16, color: '#f87171' },
  subtitle: { margin: '0 0 16px', fontSize: 12, color: '#888' },
  list: { overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 },
  item: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#1a1a1a', borderRadius: 6, gap: 12 },
  filename: { fontSize: 12, color: '#d4d4d4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  actions: { display: 'flex', gap: 6, flexShrink: 0 },
  localBtn: { padding: '5px 10px', background: '#1e2e1e', color: '#4ade80', border: '1px solid #2a3a2a', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' },
  remoteBtn: { padding: '5px 10px', background: '#1e1e2e', color: '#60a5fa', border: '1px solid #2a2a3a', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' },
  cancelBtn: { marginTop: 16, padding: '8px 0', background: 'transparent', color: '#555', border: '1px solid #2a2a2a', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }
}
