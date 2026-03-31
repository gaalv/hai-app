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

  const inputCls = "w-full px-3 py-2.5 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border-2)] focus:border-[var(--accent)] rounded-md text-sm outline-none mb-2 transition-colors"

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
      <div className="bg-[var(--surface)] border border-[var(--border-2)] rounded-xl p-8 w-[440px]">
        <h2 className="text-base font-semibold text-[var(--text)] mb-5">Configurar GitHub Sync</h2>

        <label className="block text-xs text-[var(--text-3)] mb-1.5">Personal Access Token</label>
        <input
          type="password"
          className={inputCls}
          placeholder="ghp_..."
          value={pat}
          onChange={(e) => setPat(e.target.value)}
        />
        <p className="text-[11px] text-[var(--text-3)] mb-4 leading-relaxed">
          GitHub → Settings → Developer settings → Personal access tokens<br />
          Permissão necessária: <code className="bg-[var(--surface-3)] px-1 rounded">repo</code>
        </p>

        <label className="block text-xs text-[var(--text-3)] mb-1.5">URL do Repositório</label>
        <input
          className={inputCls}
          placeholder="https://github.com/usuario/notas"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
        />

        {error && (
          <p className="text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded my-2">{error}</p>
        )}

        <div className="flex gap-2 mt-5">
          <button
            className="flex-1 py-2.5 bg-[var(--accent)] text-white border-none rounded-lg cursor-pointer text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
            onClick={handleConnect}
            disabled={isLoading || !pat || !repoUrl}
          >
            {isLoading ? 'Conectando...' : 'Conectar'}
          </button>
          <button
            className="px-4 py-2.5 bg-transparent text-[var(--text-2)] border border-[var(--border-2)] rounded-lg cursor-pointer text-sm disabled:opacity-50 hover:border-[var(--text-3)] transition-colors"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
