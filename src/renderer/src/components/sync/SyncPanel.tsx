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
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const isSyncing = status === 'syncing'

  async function handlePush(): Promise<void> {
    setMsg(null)
    try {
      await syncService.push()
      setMsg({ text: 'Push concluído!', ok: true })
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Erro ao fazer push', ok: false })
    }
  }

  async function handlePull(): Promise<void> {
    setMsg(null)
    try {
      await syncService.pull()
      onClose()
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Erro ao fazer pull', ok: false })
    }
  }

  if (showConfig) {
    return <SyncConfigModal onClose={() => { setShowConfig(false); onClose() }} />
  }

  return (
    <div className="absolute top-10 right-0 bg-[var(--surface-2)] border border-[var(--border-2)] rounded-lg p-4 w-60 z-50 shadow-xl">
      {repoUrl && (
        <p className="text-[11px] text-[var(--text-3)] mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {repoUrl.replace('https://github.com/', '')}
        </p>
      )}
      {lastSync && (
        <p className="text-[11px] text-[var(--text-3)] mb-3">
          Último sync: {new Date(lastSync).toLocaleString('pt-BR')}
        </p>
      )}
      {lastError && (
        <p className="text-[11px] text-red-400 mb-2 bg-red-400/10 px-2 py-1 rounded">{lastError}</p>
      )}
      {msg && (
        <p className={`text-[11px] mb-3 ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
      )}

      <div className="flex gap-1.5 mb-3">
        <button
          className="flex-1 py-2 bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-2)] rounded-md cursor-pointer text-xs disabled:opacity-40 hover:bg-[var(--accent-dim)] transition-colors"
          onClick={handlePush}
          disabled={isSyncing || !isConfigured}
        >
          {isSyncing ? '⟳' : '↑'} Push
        </button>
        <button
          className="flex-1 py-2 bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-2)] rounded-md cursor-pointer text-xs disabled:opacity-40 transition-colors"
          onClick={handlePull}
          disabled={isSyncing || !isConfigured}
        >
          {isSyncing ? '⟳' : '↓'} Pull
        </button>
      </div>

      <button
        className="w-full bg-transparent border-none text-[var(--text-3)] hover:text-[var(--text-2)] cursor-pointer text-[11px] text-left p-0 transition-colors"
        onClick={() => setShowConfig(true)}
      >
        {isConfigured ? 'Reconfigurar sync →' : 'Configurar sync →'}
      </button>
    </div>
  )
}
