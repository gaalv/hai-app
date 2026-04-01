import { useState } from 'react'

type Mode = 'choose' | 'connect' | 'create'

interface RepoSetupScreenProps {
  onSetup: () => void
}

export function RepoSetupScreen({ onSetup }: RepoSetupScreenProps): JSX.Element {
  const [mode, setMode] = useState<Mode>('choose')
  const [repoUrl, setRepoUrl] = useState('')
  const [repoName, setRepoName] = useState('hai-notes')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect(): Promise<void> {
    if (!repoUrl.trim()) return
    setLoading(true)
    setError(null)
    try {
      await window.electronAPI.repo.connect(repoUrl.trim())
      onSetup()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar repositório')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(): Promise<void> {
    if (!repoName.trim()) return
    setLoading(true)
    setError(null)
    try {
      await window.electronAPI.repo.create(repoName.trim())
      onSetup()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar repositório')
    } finally {
      setLoading(false)
    }
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
          background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(124,110,245,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: 400,
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
            }}
          >
            N
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--app-text-1)', letterSpacing: '-0.3px' }}>
            Notas
          </div>
        </div>

        {mode === 'choose' && (
          <>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--app-text-1)', letterSpacing: '-0.5px', marginBottom: 6 }}>
              Configurar workspace
            </div>
            <div style={{ fontSize: 13, color: 'var(--app-text-2)', marginBottom: 28, lineHeight: 1.6 }}>
              Suas notas são armazenadas num repositório GitHub privado. Conecte um repositório existente ou crie um novo.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <OptionCard
                title="Conectar repositório existente"
                description="Use um repositório GitHub que você já tem"
                icon={
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.7 }}>
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                }
                onClick={() => setMode('connect')}
              />
              <OptionCard
                title="Criar novo repositório"
                description="Cria um repositório privado no seu perfil"
                icon={
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
                    <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                }
                onClick={() => setMode('create')}
              />
            </div>
          </>
        )}

        {mode === 'connect' && (
          <>
            <button
              onClick={() => { setMode('choose'); setError(null) }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--app-text-3)', fontSize: 12, marginBottom: 20 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Voltar
            </button>

            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--app-text-1)', letterSpacing: '-0.5px', marginBottom: 6 }}>
              Conectar repositório
            </div>
            <div style={{ fontSize: 13, color: 'var(--app-text-2)', marginBottom: 20 }}>
              Cole a URL do repositório GitHub onde suas notas serão armazenadas.
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--app-text-3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                URL do repositório
              </div>
              <input
                type="text"
                placeholder="https://github.com/usuario/repositorio"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConnect() }}
                autoFocus
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

            {error && <ErrorMsg message={error} />}

            <ActionBtn onClick={handleConnect} loading={loading} disabled={!repoUrl.trim() || loading}>
              {loading ? 'Conectando...' : 'Conectar'}
            </ActionBtn>
          </>
        )}

        {mode === 'create' && (
          <>
            <button
              onClick={() => { setMode('choose'); setError(null) }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--app-text-3)', fontSize: 12, marginBottom: 20 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Voltar
            </button>

            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--app-text-1)', letterSpacing: '-0.5px', marginBottom: 6 }}>
              Novo repositório
            </div>
            <div style={{ fontSize: 13, color: 'var(--app-text-2)', marginBottom: 20 }}>
              Um repositório privado será criado no seu perfil GitHub.
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--app-text-3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                Nome do repositório
              </div>
              <input
                type="text"
                placeholder="hai-notes"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value.replace(/\s+/g, '-').toLowerCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                autoFocus
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

            {error && <ErrorMsg message={error} />}

            <ActionBtn onClick={handleCreate} loading={loading} disabled={!repoName.trim() || loading}>
              {loading ? 'Criando...' : 'Criar repositório'}
            </ActionBtn>
          </>
        )}
      </div>
    </div>
  )
}

function OptionCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
}): JSX.Element {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid var(--app-border-mid)',
        borderRadius: 10,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transition: 'background 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'rgba(124,110,245,0.08)'
        el.style.borderColor = 'rgba(124,110,245,0.3)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'rgba(255,255,255,0.03)'
        el.style.borderColor = 'var(--app-border-mid)'
      }}
    >
      <div style={{ color: 'var(--app-text-1)', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--app-text-1)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--app-text-3)' }}>{description}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.3 }}>
        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

function ActionBtn({
  children,
  onClick,
  loading,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  loading?: boolean
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
        gap: 7,
        padding: 11,
        background: disabled ? 'rgba(124,110,245,0.4)' : 'var(--app-accent)',
        border: 'none',
        borderRadius: 'var(--app-radius)',
        fontSize: 13,
        fontWeight: 500,
        color: '#fff',
        fontFamily: 'var(--font-sans)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.opacity = '0.88' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
    >
      {loading && (
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.2)',
            borderTopColor: '#fff',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </button>
  )
}

function ErrorMsg({ message }: { message: string }): JSX.Element {
  return (
    <div
      style={{
        marginBottom: 14,
        padding: '10px 12px',
        background: 'rgba(248,113,113,0.08)',
        border: '0.5px solid rgba(248,113,113,0.3)',
        borderRadius: 'var(--app-radius)',
        fontSize: 12,
        color: '#F87171',
        lineHeight: 1.5,
      }}
    >
      {message}
    </div>
  )
}
