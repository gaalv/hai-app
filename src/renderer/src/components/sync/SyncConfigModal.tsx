import { useState } from 'react'
import { syncService } from '../../services/sync'

interface Props {
  onClose: () => void
}

export function SyncConfigModal({ onClose }: Props): JSX.Element {
  const [pat, setPat] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect(): Promise<void> {
    if (!pat.trim() || !repoUrl.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      await syncService.configure(pat.trim(), repoUrl.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Configurar GitHub Sync</h2>

        <label style={styles.label}>Personal Access Token</label>
        <input
          type="password"
          style={styles.input}
          placeholder="ghp_..."
          value={pat}
          onChange={(e) => setPat(e.target.value)}
        />
        <p style={styles.hint}>
          Crie em: GitHub → Settings → Developer settings → Personal access tokens<br />
          Permissões necessárias: <code>repo</code>
        </p>

        <label style={styles.label}>URL do Repositório</label>
        <input
          style={styles.input}
          placeholder="https://github.com/usuario/notas"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
        />

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.buttons}>
          <button style={styles.primaryBtn} onClick={handleConnect} disabled={isLoading || !pat || !repoUrl}>
            {isLoading ? 'Conectando...' : 'Conectar'}
          </button>
          <button style={styles.secondaryBtn} onClick={onClose} disabled={isLoading}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8, padding: 32, width: 440, fontFamily: 'monospace' },
  title: { margin: '0 0 20px', fontSize: 18, color: '#e5e5e5' },
  label: { display: 'block', fontSize: 12, color: '#888', marginBottom: 6 },
  input: { width: '100%', padding: '9px 12px', background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #333', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: 8, outline: 'none' },
  hint: { fontSize: 11, color: '#555', margin: '0 0 16px', lineHeight: 1.5 },
  error: { color: '#f87171', fontSize: 12, background: '#1a0a0a', padding: 8, borderRadius: 4, margin: '8px 0' },
  buttons: { display: 'flex', gap: 8, marginTop: 20 },
  primaryBtn: { flex: 1, padding: '10px 0', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 13 },
  secondaryBtn: { padding: '10px 16px', background: 'transparent', color: '#888', border: '1px solid #2a2a2a', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 13 }
}
