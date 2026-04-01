import { useState } from 'react'
import { appService } from '../../services/app'

interface Props {
  onComplete: (mode: 'local' | 'sync') => void
}

export function OnboardingModeStep({ onComplete }: Props): JSX.Element {
  const [selected, setSelected] = useState<'local' | 'sync' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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
      'flex flex-col gap-1.5 p-4 rounded-xl border cursor-pointer transition-all select-none text-left'
    if (selected === mode) {
      return `${base} border-[var(--accent)] bg-[var(--accent-dim)]`
    }
    return `${base} border-[var(--border-2)] bg-[var(--surface-2)] hover:border-[var(--text-3)]`
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] titlebar-drag font-sans">
      <div className="titlebar-no-drag w-[420px] flex flex-col gap-8">
        {/* Logo */}
        <div className="text-center">
          <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">hai</span>
          <p className="text-[11px] text-[var(--text-3)] mt-1">escrever, em tupi guaraní</p>
        </div>

        {/* Card */}
        <div className="bg-[var(--surface)] border border-[var(--border-2)] rounded-xl p-6 flex flex-col gap-5">
          <div>
            <p className="text-[13px] font-medium text-[var(--text)] mb-0.5">Como usar suas notas?</p>
            <p className="text-[12px] text-[var(--text-3)]">
              Você pode mudar isso depois nas configurações.
            </p>
          </div>

          <div className="flex gap-3">
            <button className={cardCls('local')} onClick={() => setSelected('local')}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--text-2)] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
                </svg>
                <span className="text-[13px] font-medium text-[var(--text)]">Local</span>
              </div>
              <span className="text-[12px] text-[var(--text-2)] leading-relaxed">
                Notas apenas neste dispositivo. Sem conta necessária.
              </span>
            </button>

            <button className={cardCls('sync')} onClick={() => setSelected('sync')}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--text-2)] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                </svg>
                <span className="text-[13px] font-medium text-[var(--text)]">Sync com GitHub</span>
              </div>
              <span className="text-[12px] text-[var(--text-2)] leading-relaxed">
                Notas versionadas e acessíveis em outros dispositivos.
              </span>
            </button>
          </div>

          <button
            className="w-full px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[13px] font-medium disabled:opacity-40 cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity disabled:cursor-not-allowed"
            onClick={handleContinue}
            disabled={!selected || isLoading}
          >
            {isLoading ? 'Salvando...' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}
