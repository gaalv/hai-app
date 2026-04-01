import { useState } from 'react'
import type { GitHubProfile } from '../../types/auth'
import { HaiIcon } from '../ui/HaiIcon'

type Step = 'idle' | 'waiting_browser' | 'polling' | 'setup_client_id'

interface LoginScreenProps {
  onLogin: (profile: GitHubProfile) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps): JSX.Element {
  const [step, setStep] = useState<Step>('idle')
  const [userCode, setUserCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [clientId, setClientId] = useState('')

  async function handleLogin(): Promise<void> {
    setError(null)

    // Check if there's already a valid token (e.g. soft logout)
    try {
      const existingToken = await window.electronAPI.auth.getToken()
      if (existingToken) {
        const profile = await window.electronAPI.auth.getProfile()
        if (profile) {
          onLogin(profile)
          return
        }
      }
    } catch { /* token invalid or expired — proceed with device flow */ }

    let result: Awaited<ReturnType<typeof window.electronAPI.auth.deviceFlowStart>>
    try {
      result = await window.electronAPI.auth.deviceFlowStart()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar com o GitHub')
      return
    }

    if ('error' in result && result.error === 'client_id_not_configured') {
      setStep('setup_client_id')
      return
    }

    if ('error' in result) {
      setError('Erro ao iniciar autenticação.')
      return
    }

    setUserCode(result.user_code)
    setStep('waiting_browser')

    // GitHub recommends polling at the given interval (seconds)
    const intervalMs = result.interval * 1000
    setTimeout(() => pollForToken(result.device_code, intervalMs), intervalMs)
  }

  async function pollForToken(code: string, intervalMs: number): Promise<void> {
    setStep('polling')

    let result: Awaited<ReturnType<typeof window.electronAPI.auth.deviceFlowPoll>>
    try {
      result = await window.electronAPI.auth.deviceFlowPoll(code)
    } catch {
      // Transient error — retry after interval
      setTimeout(() => pollForToken(code, intervalMs), intervalMs)
      return
    }

    if (result.success) {
      onLogin(result.profile)
      return
    }

    if ('pending' in result && result.pending) {
      setTimeout(() => pollForToken(code, intervalMs), intervalMs)
      return
    }

    if ('error' in result) {
      setError(result.error)
      setStep('idle')
    }
  }

  async function handleSaveClientId(): Promise<void> {
    if (!clientId.trim()) return
    await window.electronAPI.auth.setClientId(clientId.trim())
    setStep('idle')
    setError(null)
    handleLogin()
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--app-main)] relative overflow-hidden font-[var(--font-sans)] text-[13px] antialiased select-none titlebar-drag">
      {/* Radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(124,110,245,0.14) 0%, transparent 70%)',
        }}
      />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 30%, transparent 80%)',
        }}
      />

      {/* Card */}
      <div className="relative z-[2] w-[360px] bg-[rgba(15,15,20,0.95)] border-[0.5px] border-[var(--app-border-mid)] rounded-2xl px-8 pt-9 pb-8 backdrop-blur-[20px] titlebar-no-drag">
        {/* Logo — centered */}
        <div className="flex flex-col items-center mb-7">
          <HaiIcon size={48} className="mb-3" />
          <div className="text-[17px] font-medium text-[var(--app-text-1)] tracking-[-0.3px]">
            Hai
          </div>
        </div>

        {step === 'setup_client_id' ? (
          <>
            <div className="text-[18px] font-medium text-[var(--app-text-1)] tracking-[-0.5px] mb-[6px]">
            </div>
            <div className="text-[13px] text-[var(--app-text-2)] mb-5 leading-normal">
              Para autenticar com GitHub, você precisa de um OAuth App com{' '}
              <strong className="text-[var(--app-text-1)]">Device Flow</strong> habilitado.
              Crie um em{' '}
              <span className="text-[var(--app-accent)]">github.com/settings/developers</span>
              , marque "Enable Device Flow" e cole o Client ID abaixo.
            </div>
            <div className="mb-4">
              <div className="text-[11px] font-medium text-[var(--app-text-3)] tracking-[0.04em] uppercase mb-[6px]">
                GitHub OAuth Client ID
              </div>
              <input
                type="text"
                placeholder="Ov23li..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveClientId() }}
                className="w-full bg-white/[0.04] border-[0.5px] border-[var(--app-border-mid)] rounded-[var(--app-radius)] py-[10px] px-3 text-[13px] text-[var(--app-text-1)] font-[var(--font-sans)] outline-none focus:border-[rgba(124,110,245,0.5)] focus:shadow-[0_0_0_3px_rgba(124,110,245,0.1)]"
              />
            </div>
            <Btn onClick={handleSaveClientId} disabled={!clientId.trim()}>Salvar e continuar</Btn>
            <div
              onClick={() => setStep('idle')}
              className="mt-3 text-center text-[12px] text-[var(--app-text-3)] cursor-pointer"
            >
              Voltar
            </div>
          </>
        ) : step === 'waiting_browser' || step === 'polling' ? (
          <>
            <div className="text-[18px] font-medium text-[var(--app-text-1)] tracking-[-0.5px] mb-[6px]">
              Autorize no GitHub
            </div>
            <div className="text-[13px] text-[var(--app-text-2)] mb-5 leading-normal">
              O browser foi aberto. Digite o código abaixo na página do GitHub para autorizar o acesso.
            </div>

            {/* User code display */}
            <div className="bg-[rgba(124,110,245,0.08)] border-[0.5px] border-[rgba(124,110,245,0.3)] rounded-[10px] p-4 text-center mb-5">
              <div className="text-[11px] text-[var(--app-text-3)] mb-2 tracking-[0.05em] uppercase">
                Código de verificação
              </div>
              <div className="text-[28px] font-semibold text-[var(--app-text-1)] tracking-[0.15em] font-[var(--app-mono)]">
                {userCode}
              </div>
            </div>

            <div className="flex items-center gap-2 text-[12px] text-[var(--app-text-3)]">
              <Spinner />
              {step === 'waiting_browser' ? 'Aguardando autorização...' : 'Verificando...'}
            </div>

            {error && (
              <div className="mt-3 text-[12px] text-[#F87171]">{error}</div>
            )}

            <div
              onClick={() => { setStep('idle'); setError(null) }}
              className="mt-4 text-[12px] text-[var(--app-text-3)] cursor-pointer text-center"
            >
              Cancelar
            </div>
          </>
        ) : (
          <>
            <div className="text-[22px] font-medium text-[var(--app-text-1)] tracking-[-0.6px] mb-[6px] leading-[1.2] text-center">
              Bem-vindo
            </div>
            <div className="text-[13px] text-[var(--app-text-2)] mb-7 text-center">
              Entre com sua conta GitHub para continuar
            </div>

            {error && (
              <div className="mb-4 py-[10px] px-3 bg-[rgba(248,113,113,0.08)] border-[0.5px] border-[rgba(248,113,113,0.3)] rounded-[var(--app-radius)] text-[12px] text-[#F87171]">
                {error}
              </div>
            )}

            <Btn onClick={handleLogin}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              Entrar com GitHub
            </Btn>
          </>
        )}
      </div>
    </div>
  )
}

function Btn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-2 p-[11px] border-none rounded-[var(--app-radius)] text-[13px] font-medium text-white font-[var(--font-sans)] tracking-[-0.2px] transition-[opacity,transform] duration-150 hover:opacity-[0.88] active:scale-[0.99] ${disabled ? 'bg-[rgba(124,110,245,0.4)] cursor-not-allowed' : 'bg-[var(--app-accent)] cursor-pointer'}`}
    >
      {children}
    </button>
  )
}

function Spinner(): JSX.Element {
  return (
    <div className="w-3 h-3 rounded-full border-[1.5px] border-white/15 border-t-[var(--app-accent)] animate-spin shrink-0" />
  )
}
