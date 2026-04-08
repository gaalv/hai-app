import { useState } from 'react'
import { useSyncMode } from '../../hooks/useSyncMode'
import { appService } from '../../services/app'
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

  const btn = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'danger' | 'ghost' = 'primary',
    disabled = false
  ) => (
    <button
      onClick={onClick}
      disabled={disabled || switching}
      className={`px-3 py-1.5 rounded text-[11px] font-sans cursor-pointer transition-colors disabled:opacity-50 ${
        variant === 'primary'
          ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20'
          : variant === 'danger'
          ? 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20'
          : 'text-[var(--text-3)] border border-[var(--border-2)] hover:border-[var(--text-3)] hover:text-[var(--text-2)]'
      }`}
    >
      {disabled && switching ? 'Alterando...' : label}
    </button>
  )

  return (
    <div className="space-y-5">
      <p className="text-[11px] font-sans uppercase tracking-widest text-[var(--text-3)]">Modo</p>

      <div className="flex items-center gap-3 px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--border-2)] rounded-lg">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-sans text-[var(--text)]">
              {isSync ? 'Sync com GitHub' : 'Local'}
            </p>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-sans bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--border-2)]">
              {isSync ? 'sync' : 'local'}
            </span>
          </div>
          <p className="text-[11px] font-sans text-[var(--text-3)]">
            {isSync
              ? 'Notas versionadas e acessíveis em outros dispositivos.'
              : 'Notas apenas neste dispositivo. Sem conta necessária.'}
          </p>
        </div>
      </div>

      {!confirming && (
        <button
          className="text-[11px] font-sans text-[var(--text-3)] underline underline-offset-2 cursor-pointer hover:text-[var(--text-2)] transition-colors"
          onClick={() => setConfirming(true)}
        >
          Trocar modo
        </button>
      )}

      {confirming && (
        <div className="p-3 bg-[var(--surface-2)] border border-[var(--border-2)] rounded-lg space-y-3">
          <p className="text-[11px] font-sans text-[var(--text-2)] leading-relaxed">
            {isSync
              ? 'O sync será desativado. Suas notas permanecem no dispositivo. O repositório GitHub não será apagado.'
              : profile
              ? 'Você precisará ter uma conta GitHub conectada. Suas notas poderão ser enviadas para o repositório configurado.'
              : 'Você precisará conectar sua conta GitHub primeiro.'}
          </p>
          <div className="flex gap-2">
            {isSync
              ? btn('Trocar para Local', handleSwitchToLocal, 'danger')
              : btn(
                  profile ? 'Trocar para Sync' : 'Conectar GitHub',
                  handleSwitchToSync,
                  'primary'
                )}
            {btn('Cancelar', () => setConfirming(false), 'ghost')}
          </div>
        </div>
      )}

      {mode === null && (
        <p className="text-[11px] font-sans text-[var(--text-3)]">
          Modo não configurado. Reinicie o app para configurar.
        </p>
      )}
    </div>
  )
}
