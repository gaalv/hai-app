import { useState } from 'react'
import { useAuthStore } from '../../stores/auth.store'

export function LoginScreen(): JSX.Element {
  const setAuth = useAuthStore((s) => s.setAuth)
  const [step, setStep] = useState<'idle' | 'polling' | 'setup'>('idle')
  const [userCode, setUserCode] = useState('')
  const [verificationUri, setVerificationUri] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [clientId, setClientId] = useState('')

  async function handleLogin(): Promise<void> {
    setError(null)
    try {
      const data = await window.electronAPI.auth.deviceFlowStart()
      setUserCode(data.userCode)
      setVerificationUri(data.verificationUri)
      setStep('polling')

      // Start polling in background
      const result = await window.electronAPI.auth.deviceFlowPoll(data.deviceCode, data.interval)
      setAuth(result.token, result.profile)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao autenticar'
      if (msg.includes('GITHUB_CLIENT_ID')) {
        setStep('setup')
      } else {
        setError(msg)
        setStep('idle')
      }
    }
  }

  async function handleSaveClientId(): Promise<void> {
    if (!clientId.trim()) return
    await window.electronAPI.auth.setClientId(clientId.trim())
    setStep('idle')
    handleLogin()
  }

  if (step === 'setup') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] titlebar-drag">
        <div className="titlebar-no-drag bg-[var(--surface)] border border-[var(--border-2)] rounded-xl p-10 w-[440px] text-center">
          <h1 className="text-2xl font-bold text-[var(--accent)] mb-2">Configurar GitHub App</h1>
          <p className="text-sm text-[var(--text-3)] mb-6">
            Para usar OAuth, você precisa registrar um GitHub OAuth App e informar o Client ID.
          </p>
          <p className="text-xs text-[var(--text-3)] mb-4 text-left bg-[var(--surface-2)] p-3 rounded-lg">
            1. Acesse <span className="text-[var(--accent)]">github.com/settings/developers</span><br />
            2. New OAuth App → Callback URL: <code className="bg-[var(--surface-3)] px-1 rounded">http://localhost</code><br />
            3. Cole o Client ID abaixo
          </p>
          <input
            className="w-full px-3 py-2.5 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border-2)] focus:border-[var(--accent)] rounded-lg text-sm outline-none mb-3 transition-colors"
            placeholder="Client ID (ex: Ov23liXXXXXXXXXX)"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveClientId()}
          />
          <button
            className="w-full py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
            onClick={handleSaveClientId}
            disabled={!clientId.trim()}
          >
            Salvar e continuar
          </button>
        </div>
      </div>
    )
  }

  if (step === 'polling') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] titlebar-drag">
        <div className="titlebar-no-drag bg-[var(--surface)] border border-[var(--border-2)] rounded-xl p-10 w-[420px] text-center">
          <h1 className="text-2xl font-bold text-[var(--accent)] mb-2">hai</h1>
          <p className="text-sm text-[var(--text-2)] mb-6">Autorize o acesso no GitHub</p>

          <div className="bg-[var(--surface-2)] rounded-xl p-6 mb-6">
            <p className="text-xs text-[var(--text-3)] mb-2">Digite este código em</p>
            <a
              href={verificationUri}
              className="text-[var(--accent)] text-xs underline block mb-4"
              onClick={(e) => { e.preventDefault(); window.open(verificationUri) }}
            >
              {verificationUri}
            </a>
            <div className="text-3xl font-mono font-bold tracking-[0.3em] text-[var(--text)] select-all">
              {userCode}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[var(--text-3)] text-sm">
            <span className="animate-spin text-[var(--accent)]">⟳</span>
            <span>Aguardando autorização...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] titlebar-drag">
      <div className="titlebar-no-drag bg-[var(--surface)] border border-[var(--border-2)] rounded-xl p-10 w-[380px] text-center shadow-xl">
        <h1 className="text-3xl font-bold text-[var(--accent)] mb-1 tracking-tight">hai</h1>
        <p className="text-xs text-[var(--text-3)] mb-1">escrever, em tupi guaraní</p>
        <p className="text-sm text-[var(--text-3)] mt-3 mb-8">
          Sincronize suas notas com GitHub.<br />
          Login seguro, sem senha armazenada.
        </p>

        {error && (
          <p className="text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg mb-4">{error}</p>
        )}

        <button
          className="w-full py-3 bg-[#24292e] hover:bg-[#2f363d] text-white rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-center gap-2"
          onClick={handleLogin}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Entrar com GitHub
        </button>

        <p className="text-xs text-[var(--text-4)] mt-4">
          Também é possível usar sem conta —{' '}
          <button
            className="text-[var(--accent)] cursor-pointer underline"
            onClick={() => {/* skip auth */}}
          >
            usar localmente
          </button>
        </p>
      </div>
    </div>
  )
}
