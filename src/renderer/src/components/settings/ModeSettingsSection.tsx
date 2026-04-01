import { useState } from 'react'
import { useSyncMode } from '../../hooks/useSyncMode'
import { appService } from '../../services/app'
import { syncService } from '../../services/sync'
import { useAuthStore } from '../../stores/auth.store'

interface Props {
  onRequestLogin: () => void
}

export function ModeSettingsSection({ onRequestLogin }: Props): JSX.Element {
  const { mode, isSync } = useSyncMode()
  const { profile } = useAuthStore()
  const [confirming, setConfirming] = useState(false)
  const [switching, setSwitching] = useState(false)

  async function handleSwitchToLocal(): Promise<void> {
    setSwitching(true)
    try {
      await syncService.stopAutoSync()
      await appService.setMode('local')
    } finally {
      setSwitching(false)
      setConfirming(false)
    }
  }

  async function handleSwitchToSync(): Promise<void> {
    if (!profile) {
      onRequestLogin()
      return
    }
    setSwitching(true)
    try {
      await appService.setMode('sync')
    } finally {
      setSwitching(false)
      setConfirming(false)
    }
  }

  const btn = (label: string, onClick: () => void, variant: 'primary' | 'danger' | 'ghost' = 'primary', disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled || switching}
      className={`px-4 py-2 rounded-lg text-xs cursor-pointer transition-colors disabled:opacity-50 ${
        variant === 'primary'
          ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20'
          : variant === 'danger'
          ? 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20'
          : 'text-[var(--text-3)] border border-[var(--border-2)] hover:border-[var(--text-3)]'
      }`}
    >
      {disabled && switching ? 'Alterando...' : label}
    </button>
  )

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold text-[var(--text)]">Modo</h2>

      <div className="flex items-center gap-3 p-3 bg-[var(--surface-2)] border border-[var(--border-2)] rounded-lg">
        <span className="text-lg">{isSync ? '☁' : '💻'}</span>
        <div>
          <p className="text-sm text-[var(--text)]">{isSync ? 'Sync com GitHub' : 'Local'}</p>
          <p className="text-xs text-[var(--text-3)]">
            {isSync
              ? 'Notas versionadas e acessíveis em outros dispositivos.'
              : 'Notas apenas neste dispositivo. Sem conta necessária.'}
          </p>
        </div>
      </div>

      {!confirming && (
        <button
          className="text-xs text-[var(--text-3)] underline cursor-pointer hover:text-[var(--text-2)] transition-colors"
          onClick={() => setConfirming(true)}
        >
          Trocar modo
        </button>
      )}

      {confirming && (
        <div className="p-4 bg-[var(--surface-2)] border border-[var(--border-2)] rounded-lg space-y-3">
          <p className="text-xs text-[var(--text-2)]">
            {isSync
              ? 'O sync será desativado. Suas notas permanecem no dispositivo. O repositório GitHub não será apagado.'
              : profile
              ? 'Você precisará ter uma conta GitHub conectada. Suas notas poderão ser enviadas para o repositório configurado.'
              : 'Você precisará conectar sua conta GitHub primeiro.'}
          </p>
          <div className="flex gap-2">
            {isSync
              ? btn('Trocar para Local', handleSwitchToLocal, 'danger')
              : btn(profile ? 'Trocar para Sync' : 'Conectar GitHub', handleSwitchToSync, 'primary')}
            {btn('Cancelar', () => setConfirming(false), 'ghost')}
          </div>
        </div>
      )}

      {mode === null && (
        <p className="text-xs text-[var(--text-3)]">Modo não configurado. Reinicie o app para configurar.</p>
      )}
    </div>
  )
}
