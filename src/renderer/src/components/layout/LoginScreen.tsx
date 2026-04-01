import { useState } from 'react'
import type { GitHubProfile } from '../../types/auth'

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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--app-main)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        WebkitFontSmoothing: 'antialiased',
        userSelect: 'none',
      }}
    >
      {/* Radial gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(124,110,245,0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      {/* Grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 30%, transparent 80%)',
        }}
      />

      {/* Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: 360,
          background: 'rgba(15,15,20,0.95)',
          border: '0.5px solid var(--app-border-mid)',
          borderRadius: 16,
          padding: '36px 32px 32px',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'var(--app-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              letterSpacing: '-0.5px',
            }}
          >
            N
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--app-text-1)', letterSpacing: '-0.3px' }}>
            Notas
          </div>
        </div>

        {step === 'setup_client_id' ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--app-text-1)', letterSpacing: '-0.5px', marginBottom: 6 }}>
              Configurar GitHub App
            </div>
            <div style={{ fontSize: 13, color: 'var(--app-text-2)', marginBottom: 20, lineHeight: 1.5 }}>
              Para autenticar com GitHub, você precisa de um OAuth App com{' '}
              <strong style={{ color: 'var(--app-text-1)' }}>Device Flow</strong> habilitado.
              Crie um em{' '}
              <span style={{ color: 'var(--app-accent)' }}>github.com/settings/developers</span>
              , marque "Enable Device Flow" e cole o Client ID abaixo.
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--app-text-3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                GitHub OAuth Client ID
              </div>
              <input
                type="text"
                placeholder="Ov23li..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveClientId() }}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid var(--app-border-mid)',
                  borderRadius: 'var(--app-radius)',
                  padding: '10px 12px',
                  fontSize: 13,
                  color: 'var(--app-text-1)',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(124,110,245,0.5)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,110,245,0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--app-border-mid)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
            <Btn onClick={handleSaveClientId} disabled={!clientId.trim()}>Salvar e continuar</Btn>
            <div
              onClick={() => setStep('idle')}
              style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--app-text-3)', cursor: 'pointer' }}
            >
              Voltar
            </div>
          </>
        ) : step === 'waiting_browser' || step === 'polling' ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--app-text-1)', letterSpacing: '-0.5px', marginBottom: 6 }}>
              Autorize no GitHub
            </div>
            <div style={{ fontSize: 13, color: 'var(--app-text-2)', marginBottom: 20, lineHeight: 1.5 }}>
              O browser foi aberto. Digite o código abaixo na página do GitHub para autorizar o acesso.
            </div>

            {/* User code display */}
            <div
              style={{
                background: 'rgba(124,110,245,0.08)',
                border: '0.5px solid rgba(124,110,245,0.3)',
                borderRadius: 10,
                padding: '16px',
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--app-text-3)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Código de verificação
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: 'var(--app-text-1)',
                  letterSpacing: '0.15em',
                  fontFamily: 'var(--app-mono)',
                }}
              >
                {userCode}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--app-text-3)' }}>
              <Spinner />
              {step === 'waiting_browser' ? 'Aguardando autorização...' : 'Verificando...'}
            </div>

            {error && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#F87171' }}>{error}</div>
            )}

            <div
              onClick={() => { setStep('idle'); setError(null) }}
              style={{ marginTop: 16, fontSize: 12, color: 'var(--app-text-3)', cursor: 'pointer', textAlign: 'center' }}
            >
              Cancelar
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: 'var(--app-text-1)',
                letterSpacing: '-0.6px',
                marginBottom: 6,
                lineHeight: 1.2,
              }}
            >
              Bem-vindo
            </div>
            <div style={{ fontSize: 13, color: 'var(--app-text-2)', marginBottom: 28 }}>
              Entre com sua conta GitHub para continuar
            </div>

            {error && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '10px 12px',
                  background: 'rgba(248,113,113,0.08)',
                  border: '0.5px solid rgba(248,113,113,0.3)',
                  borderRadius: 'var(--app-radius)',
                  fontSize: 12,
                  color: '#F87171',
                }}
              >
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
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 11,
        background: disabled ? 'rgba(124,110,245,0.4)' : 'var(--app-accent)',
        border: 'none',
        borderRadius: 'var(--app-radius)',
        fontSize: 13,
        fontWeight: 500,
        color: '#fff',
        fontFamily: 'var(--font-sans)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '-0.2px',
        transition: 'opacity 0.15s, transform 0.1s',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.opacity = '0.88' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
      onMouseDown={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.transform = 'scale(0.99)' }}
      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
    >
      {children}
    </button>
  )
}

function Spinner(): JSX.Element {
  return (
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.15)',
        borderTopColor: 'var(--app-accent)',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}
