import { useState } from 'react'
import { vaultService } from '../../services/vault'
import { useVaultStore } from '../../stores/vault.store'

export function OnboardingScreen(): JSX.Element {
  const error = useVaultStore((s) => s.error)
  const [isLoading, setIsLoading] = useState(false)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')

  async function handleSelectFolder(): Promise<void> {
    setIsLoading(true)
    try {
      await vaultService.openPicker()
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateVault(): Promise<void> {
    if (!newName.trim()) return
    setIsLoading(true)
    try {
      // Pede pasta pai via picker nativo, depois cria subpasta
      const parentConfig = await window.electronAPI.vault.openPicker()
      if (!parentConfig) return
      await vaultService.create(newName.trim(), parentConfig.path)
    } finally {
      setIsLoading(false)
      setCreatingNew(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Muta Notes</h1>
        <p style={styles.subtitle}>Selecione uma pasta para usar como vault de notas.</p>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.buttons}>
          <button style={styles.primaryBtn} onClick={handleSelectFolder} disabled={isLoading}>
            {isLoading ? 'Abrindo...' : 'Selecionar pasta'}
          </button>

          {!creatingNew ? (
            <button style={styles.secondaryBtn} onClick={() => setCreatingNew(true)} disabled={isLoading}>
              Criar novo vault
            </button>
          ) : (
            <div style={styles.createForm}>
              <input
                style={styles.input}
                placeholder="Nome do vault"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateVault()}
                autoFocus
              />
              <button style={styles.primaryBtn} onClick={handleCreateVault} disabled={isLoading || !newName.trim()}>
                Criar
              </button>
              <button style={styles.secondaryBtn} onClick={() => setCreatingNew(false)}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#e5e5e5',
    fontFamily: 'monospace'
  },
  card: {
    background: '#141414',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
    padding: 40,
    width: 400,
    textAlign: 'center'
  },
  title: { margin: '0 0 8px', fontSize: 28, color: '#c084fc' },
  subtitle: { margin: '0 0 24px', color: '#888', fontSize: 14 },
  error: { color: '#f87171', fontSize: 13, margin: '0 0 16px', background: '#1a0a0a', padding: 8, borderRadius: 4 },
  buttons: { display: 'flex', flexDirection: 'column', gap: 10 },
  primaryBtn: {
    padding: '10px 16px', background: '#7c3aed', color: '#fff', border: 'none',
    borderRadius: 6, cursor: 'pointer', fontSize: 14, fontFamily: 'monospace'
  },
  secondaryBtn: {
    padding: '10px 16px', background: 'transparent', color: '#888', border: '1px solid #2a2a2a',
    borderRadius: 6, cursor: 'pointer', fontSize: 14, fontFamily: 'monospace'
  },
  createForm: { display: 'flex', flexDirection: 'column', gap: 8 },
  input: {
    padding: '10px 12px', background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #333',
    borderRadius: 6, fontSize: 14, fontFamily: 'monospace', outline: 'none'
  }
}
