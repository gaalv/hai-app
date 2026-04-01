import { useState } from 'react'
import { HaiIcon } from '../ui/HaiIcon'

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
    <div className="flex items-center justify-center min-h-screen bg-[var(--app-main)] relative overflow-hidden font-[var(--font-sans)] text-[13px] antialiased select-none titlebar-drag">
      {/* Radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(124,110,245,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-[2] w-[400px] bg-[rgba(15,15,20,0.95)] border-[0.5px] border-[var(--app-border-mid)] rounded-2xl px-8 pt-9 pb-8 backdrop-blur-[20px] titlebar-no-drag">
        {/* Logo — centered */}
        <div className="flex flex-col items-center mb-7">
          <HaiIcon size={44} className="mb-2.5" />
          <div className="text-[15px] font-medium text-[var(--app-text-1)] tracking-[-0.3px]">
            Hai
          </div>
        </div>

        {mode === 'choose' && (
          <>
            <div className="text-[20px] font-medium text-[var(--app-text-1)] tracking-[-0.5px] mb-[6px]">
              Configurar workspace
            </div>
            <div className="text-[13px] text-[var(--app-text-2)] mb-7 leading-relaxed">
              Suas notas são armazenadas num repositório GitHub privado. Conecte um repositório existente ou crie um novo.
            </div>

            <div className="flex flex-col gap-[10px]">
              <OptionCard
                title="Conectar repositório existente"
                description="Use um repositório GitHub que você já tem"
                icon={
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" className="opacity-70">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                }
                onClick={() => setMode('connect')}
              />
              <OptionCard
                title="Criar novo repositório"
                description="Cria um repositório privado no seu perfil"
                icon={
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-70">
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
              className="bg-transparent border-none p-0 cursor-pointer flex items-center gap-[5px] text-[var(--app-text-3)] text-[12px] mb-5"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Voltar
            </button>

            <div className="text-[18px] font-medium text-[var(--app-text-1)] tracking-[-0.5px] mb-[6px]">
              Conectar repositório
            </div>
            <div className="text-[13px] text-[var(--app-text-2)] mb-5">
              Cole a URL do repositório GitHub onde suas notas serão armazenadas.
            </div>

            <div className="mb-4">
              <div className="text-[11px] font-medium text-[var(--app-text-3)] tracking-[0.04em] uppercase mb-[6px]">
                URL do repositório
              </div>
              <input
                type="text"
                placeholder="https://github.com/usuario/repositorio"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConnect() }}
                autoFocus
                className="w-full bg-white/[0.04] border-[0.5px] border-[var(--app-border-mid)] rounded-[var(--app-radius)] py-[10px] px-3 text-[13px] text-[var(--app-text-1)] font-[var(--font-sans)] outline-none focus:border-[rgba(124,110,245,0.5)] focus:shadow-[0_0_0_3px_rgba(124,110,245,0.1)]"
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
              className="bg-transparent border-none p-0 cursor-pointer flex items-center gap-[5px] text-[var(--app-text-3)] text-[12px] mb-5"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Voltar
            </button>

            <div className="text-[18px] font-medium text-[var(--app-text-1)] tracking-[-0.5px] mb-[6px]">
              Novo repositório
            </div>
            <div className="text-[13px] text-[var(--app-text-2)] mb-5">
              Um repositório privado será criado no seu perfil GitHub.
            </div>

            <div className="mb-4">
              <div className="text-[11px] font-medium text-[var(--app-text-3)] tracking-[0.04em] uppercase mb-[6px]">
                Nome do repositório
              </div>
              <input
                type="text"
                placeholder="hai-notes"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value.replace(/\s+/g, '-').toLowerCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                autoFocus
                className="w-full bg-white/[0.04] border-[0.5px] border-[var(--app-border-mid)] rounded-[var(--app-radius)] py-[10px] px-3 text-[13px] text-[var(--app-text-1)] font-[var(--font-sans)] outline-none focus:border-[rgba(124,110,245,0.5)] focus:shadow-[0_0_0_3px_rgba(124,110,245,0.1)]"
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
      className="py-[14px] px-4 bg-white/[0.03] border-[0.5px] border-[var(--app-border-mid)] rounded-[10px] cursor-pointer flex items-center gap-[14px] transition-colors duration-[120ms] hover:bg-[rgba(124,110,245,0.08)] hover:border-[rgba(124,110,245,0.3)]"
    >
      <div className="text-[var(--app-text-1)] shrink-0">{icon}</div>
      <div>
        <div className="text-[13px] font-medium text-[var(--app-text-1)] mb-[2px]">{title}</div>
        <div className="text-[12px] text-[var(--app-text-3)]">{description}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto shrink-0 opacity-30">
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
      className={`w-full flex items-center justify-center gap-[7px] p-[11px] border-none rounded-[var(--app-radius)] text-[13px] font-medium text-white font-[var(--font-sans)] transition-opacity duration-150 hover:opacity-[0.88] ${disabled ? 'bg-[rgba(124,110,245,0.4)] cursor-not-allowed' : 'bg-[var(--app-accent)] cursor-pointer'}`}
    >
      {loading && (
        <div className="w-3 h-3 rounded-full border-[1.5px] border-white/20 border-t-white animate-spin shrink-0" />
      )}
      {children}
    </button>
  )
}

function ErrorMsg({ message }: { message: string }): JSX.Element {
  return (
    <div className="mb-[14px] py-[10px] px-3 bg-[rgba(248,113,113,0.08)] border-[0.5px] border-[rgba(248,113,113,0.3)] rounded-[var(--app-radius)] text-[12px] text-[#F87171] leading-normal">
      {message}
    </div>
  )
}
