import { useState } from 'react'
import { appService } from '../../services/app'

interface Props {
  onComplete: (mode: 'local' | 'sync') => void
}

export function OnboardingModeStep({ onComplete }: Props): JSX.Element {
  const [selected, setSelected] = useState<'local' | 'sync' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const primaryBtn =
    'w-full px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm disabled:opacity-40 cursor-pointer hover:opacity-90 transition-opacity disabled:cursor-not-allowed'

  async function handleContinue(): Promise<void> {
    if (!selected) return
    setIsLoading(true)
    try {
      await appService.setMode(selected)
      onComplete(selected)
    } finally {
      setIsLoading(false)
    }
  }

  function cardCls(mode: 'local' | 'sync'): string {
    const base =
      'flex flex-col items-center gap-3 p-5 rounded-xl border cursor-pointer transition-all select-none'
    if (selected === mode) {
      return `${base} border-[var(--accent)] bg-[var(--accent-dim)]`
    }
    return `${base} border-[var(--border-2)] bg-[var(--surface-2)] hover:border-[var(--text-3)]`
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] titlebar-drag">
      <div className="titlebar-no-drag bg-[var(--surface)] border border-[var(--border-2)] rounded-xl p-10 w-[440px] text-center shadow-xl">
        <h1 className="text-3xl font-bold text-[var(--accent)] mb-1 tracking-tight">hai</h1>
        <p className="text-xs text-[var(--text-3)] mb-1">escrever, em tupi guaraní</p>
        <p className="text-sm text-[var(--text-3)] mb-7 mt-3">
          Como você quer usar suas notas?
        </p>

        <div className="flex gap-3 mb-7">
          <button className={cardCls('local')} onClick={() => setSelected('local')}>
            <span className="text-3xl">💻</span>
            <span className="text-sm font-medium text-[var(--text)]">Local</span>
            <span className="text-xs text-[var(--text-2)] leading-relaxed">
              Notas apenas neste dispositivo. Sem conta necessária.
            </span>
          </button>

          <button className={cardCls('sync')} onClick={() => setSelected('sync')}>
            <span className="text-3xl">☁️</span>
            <span className="text-sm font-medium text-[var(--text)]">Sync com GitHub</span>
            <span className="text-xs text-[var(--text-2)] leading-relaxed">
              Notas versionadas e acessíveis em outros dispositivos.
            </span>
          </button>
        </div>

        <button
          className={primaryBtn}
          onClick={handleContinue}
          disabled={!selected || isLoading}
        >
          {isLoading ? 'Salvando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
