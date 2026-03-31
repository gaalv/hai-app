import { useState } from 'react'
import { useSyncStore } from '../../stores/sync.store'
import { syncService } from '../../services/sync'
import { SyncConfigModal } from './SyncConfigModal'

interface Props {
  onClose: () => void
}

export function SyncPanel({ onClose }: Props): JSX.Element {
  const { status, lastSync, lastError, isConfigured, repoUrl } = useSyncStore()
  const [showConfig, setShowConfig] = useState(false)
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const isSyncing = status === 'syncing'

  async function handlePush(): Promise<void> {
    setPushMsg(null)
    try {
      await syncService.push()
      setPushMsg('Push concluído!')
    } catch (err) {
      setPushMsg(err instanceof Error ? err.message : 'Erro ao fazer push')
    }
  }

  async function handlePull(): Promise<void> {
    setPushMsg(null)
    try {
      await syncService.pull()
      onClose()
    } catch (err) {
      setPushMsg(err instanceof Error ? err.message : 'Erro ao fazer pull')
    }
  }

  if (showConfig) {
    return <SyncConfigModal onClose={() => { setShowConfig(false); onClose() }} />
  }

  return (
    <div style={styles.panel}>
      {repoUrl && <p style={styles.repo}>{repoUrl.replace('https://github.com/', '')}</p>}
      {lastSync && <p style={styles.meta}>Último sync: {new Date(lastSync).toLocaleString('pt-BR')}</p>}
      {lastError && <p style={styles.error}>{lastError}</p>}
      {pushMsg && <p style={{ ...styles.meta, color: pushMsg.includes('Erro') ? '#f87171' : '#4ade80' }}>{pushMsg}</p>}

      <div style={styles.buttons}>
        <button style={styles.btn} onClick={handlePush} disabled={isSyncing || !isConfigured}>
          {isSyncing ? '⟳' : '↑'} Push
        </button>
        <button style={styles.btn} onClick={handlePull} disabled={isSyncing || !isConfigured}>
          {isSyncing ? '⟳' : '↓'} Pull
        </button>
      </div>

      <button style={styles.configLink} onClick={() => setShowConfig(true)}>
        {isConfigured ? 'Reconfigurar sync' : 'Configurar sync →'}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: { position: 'absolute', top: 40, right: 8, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16, width: 240, zIndex: 50, fontFamily: 'monospace', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' },
  repo: { fontSize: 11, color: '#888', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { fontSize: 11, color: '#555', margin: '0 0 12px' },
  error: { fontSize: 11, color: '#f87171', margin: '0 0 8px', background: '#1a0a0a', padding: '4px 8px', borderRadius: 4 },
  buttons: { display: 'flex', gap: 6, marginBottom: 12 },
  btn: { flex: 1, padding: '8px 0', background: '#1e1e2e', color: '#c084fc', border: '1px solid #2a2a3a', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' },
  configLink: { width: '100%', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace', textAlign: 'left', padding: 0 }
}
