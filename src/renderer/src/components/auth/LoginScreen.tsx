import { useState } from 'react'
import { authService } from '../../services/auth'

interface Props {
  onSuccess?: () => void
  onSkip?: () => void
}

export function LoginScreen({ onSuccess, onSkip }: Props): JSX.Element {
  const [step, setStep] = useState<'idle' | 'polling' | 'setup'>('idle')
  const [userCode, setUserCode] = useState('')
  const [verificationUri, setVerificationUri] = useState('')
  const [deviceCode, setDeviceCode] = useState('')
  const [interval, setIntervalMs] = useState(5000)
  const [error, setError] = useState<string | null>(null)
  const [clientId, setClientId] = useState('')
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogin(): Promise<void> {
    setError(null)
    setIsLoading(true)
    try {
      const data = await authService.startDeviceFlow()

      if (data.error === 'client_id_not_configured') {
        setStep('setup')
        setIsLoading(false)
        return
      }

      if (!data.device_code || !data.user_code || !data.verification_uri) {
        throw new Error('Resposta inválida do GitHub')
      }

      setUserCode(data.user_code)
      setVerificationUri(data.verification_uri)
      setDeviceCode(data.device_code)
      setIntervalMs((data.interval ?? 5) * 1000)
      setStep('polling')
      setIsLoading(false)

      // Poll until success or error
      await pollForToken(data.device_code, (data.interval ?? 5) * 1000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao autenticar'
      setError(msg)
      setStep('idle')
      setIsLoading(false)
    }
  }

  async function pollForToken(code: string, intervalMs: number): Promise<void> {
    const maxAttempts = 60
    let attempts = 0

    while (attempts < maxAttempts) {
      const result = await authService.pollDeviceFlow(code, intervalMs)

      if (result.success && result.profile) {
        await authService.getProfile()
        onSuccess?.()
        return
      }

      if (result.pending) {
        attempts++
        continue
      }

      // Error case
      setError(result.error ?? 'Erro ao autenticar')
      setStep('idle')
      return
    }

    setError('Tempo esgotado. Tente novamente.')
    setStep('idle')
  }

  async function handleSaveClientId(): Promise<void> {
    if (!clientId.trim()) return
    await window.electronAPI.auth.setClientId(clientId.trim())
    setStep('idle')
    handleLogin()
  }

  function handleCopyCode(): void {
    navigator.clipboard.writeText(userCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── setup ──────────────────────────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] titlebar-drag font-sans">
        <div className="titlebar-no-drag w-[420px] flex flex-col gap-8">
          {/* Logo */}
          <div className="text-center">
            <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">hai</span>
          </div>

          {/* Card */}
          <div className="bg-[var(--surface)] border border-[var(--border-2)] rounded-xl p-6 flex flex-col gap-5">
            <div>
              <p className="text-[13px] font-medium text-[var(--text)] mb-0.5">Configurar GitHub App</p>
              <p className="text-[12px] text-[var(--text-3)]">
                Registre um OAuth App no GitHub e informe o Client ID para habilitar o login.
              </p>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-2.5">
              {[
                <>
                  Acesse{' '}
                  <button
                    className="text-[var(--accent)] hover:underline cursor-pointer"
                    onClick={() => window.open('https://github.com/settings/developers')}
                  >
                    github.com/settings/developers
                  </button>
                </>,
                <>
                  New OAuth App → Callback URL:{' '}
                  <code className="font-mono text-[11px] bg-[var(--surface-2)] border border-[var(--border-2)] px-1.5 py-0.5 rounded">
                    http://localhost
                  </code>
                </>,
                <>Cole o Client ID abaixo</>
              ].map((content, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--surface-2)] border border-[var(--border-2)] flex items-center justify-center text-[10px] text-[var(--text-3)] mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-[12px] text-[var(--text-2)] leading-relaxed">{content}</span>
                </div>
              ))}
            </div>

            <input
              className="w-full px-3 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border-2)] focus:border-[var(--accent)] rounded-lg text-[13px] font-mono outline-none transition-colors placeholder:text-[var(--text-3)] placeholder:font-sans"
              placeholder="Ov23liXXXXXXXXXX"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveClientId()}
            />

            <div className="flex flex-col gap-2">
              <button
                className="w-full px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[13px] font-medium cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40"
                onClick={handleSaveClientId}
                disabled={!clientId.trim()}
              >
                Salvar e continuar
              </button>
              <button
                className="w-full px-4 py-2 text-[var(--text-3)] hover:text-[var(--text-2)] rounded-lg text-[13px] cursor-pointer transition-colors"
                onClick={() => setStep('idle')}
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── polling ────────────────────────────────────────────────────────────────
  if (step === 'polling') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] titlebar-drag font-sans">
        <div className="titlebar-no-drag w-[400px] flex flex-col gap-8">
          {/* Logo */}
          <div className="text-center">
            <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">hai</span>
          </div>

          {/* Card */}
          <div className="bg-[var(--surface)] border border-[var(--border-2)] rounded-xl p-6 flex flex-col gap-5">
            <div>
              <p className="text-[13px] font-medium text-[var(--text)] mb-0.5">Autorize no GitHub</p>
              <p className="text-[12px] text-[var(--text-3)]">
                Abra o link abaixo e insira o código para autorizar o acesso.
              </p>
            </div>

            {/* Link */}
            <div className="flex items-center gap-2">
              <button
                className="text-[12px] text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
                onClick={() => window.open(verificationUri)}
              >
                {verificationUri}
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </button>
            </div>

            {/* Code block */}
            <div className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl p-5 flex flex-col items-center gap-4">
              <p className="text-[11px] text-[var(--text-3)] uppercase tracking-wider">Código de autorização</p>
              <div className="font-mono text-[28px] font-semibold tracking-[0.25em] text-[var(--text)] select-all leading-none">
                {userCode}
              </div>
              <button
                className="px-3 py-1.5 bg-[var(--surface)] border border-[var(--border-2)] hover:border-[var(--text-3)] text-[var(--text-2)] hover:text-[var(--text)] rounded-lg text-[12px] cursor-pointer transition-colors"
                onClick={handleCopyCode}
              >
                {copied ? 'Copiado!' : 'Copiar código'}
              </button>
            </div>

            {/* Spinner */}
            <div className="flex items-center justify-center gap-2 text-[var(--text-3)]">
              <svg className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-[12px]">Aguardando autorização...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── idle ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] titlebar-drag font-sans">
      <div className="titlebar-no-drag w-[360px] flex flex-col gap-8">
        {/* Logo */}
        <div className="text-center flex flex-col gap-1">
          <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">hai</span>
          <p className="text-[11px] text-[var(--text-3)]">escrever, em tupi guaraní</p>
        </div>

        {/* Card */}
        <div className="bg-[var(--surface)] border border-[var(--border-2)] rounded-xl p-6 flex flex-col gap-4">
          <div>
            <p className="text-[13px] font-medium text-[var(--text)] mb-0.5">Sincronize com GitHub</p>
            <p className="text-[12px] text-[var(--text-3)]">
              Login seguro via OAuth — sem senha armazenada.
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-[11px] bg-red-400/8 border border-red-400/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            className="w-full py-2.5 bg-[#161b22] hover:bg-[#1c2128] active:bg-[#161b22] text-[var(--text)] border border-[#30363d] hover:border-[#484f58] rounded-lg text-[13px] font-medium cursor-pointer transition-colors flex items-center justify-center gap-2.5 disabled:opacity-40"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Iniciando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span>Continuar com GitHub</span>
              </>
            )}
          </button>

          {onSkip && (
            <p className="text-center text-[11px] text-[var(--text-3)]">
              ou{' '}
              <button
                className="text-[var(--text-2)] hover:text-[var(--text)] cursor-pointer underline transition-colors"
                onClick={onSkip}
              >
                usar localmente
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
