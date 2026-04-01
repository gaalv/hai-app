import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import type { RepoConfig } from '../../types/electron'

interface ProfileModalProps {
  onClose: () => void
  onLogout: () => void
}

export function ProfileModal({ onClose, onLogout }: ProfileModalProps): JSX.Element {
  const { profile } = useAuthStore()
  const [version, setVersion] = useState('')
  const [repoConfig, setRepoConfig] = useState<RepoConfig | null>(null)

  useEffect(() => {
    window.electronAPI.app.getVersion().then(setVersion).catch(() => {})
    window.electronAPI.repo.getConfig().then(setRepoConfig).catch(() => {})
  }, [])

  async function handleLogout(): Promise<void> {
    await window.electronAPI.auth.logoutFull()
    onLogout()
  }

  function handleQuit(): void {
    window.electronAPI.app.quit()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[380px] mx-4 rounded-[var(--app-radius)] border border-[var(--app-border)] bg-[var(--app-main)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-[var(--app-radius)] text-[var(--app-text-3)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="p-6">
          {/* Avatar & user info */}
          <div className="flex flex-col items-center gap-3 mb-5">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.login}
                className="w-16 h-16 rounded-full border-2 border-[var(--app-border-mid)]"
              />
            ) : (
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#7C6EF5] to-[#C084FC] text-white text-xl font-semibold">
                {(profile?.name || profile?.login || 'U')[0].toUpperCase()}
              </div>
            )}

            <div className="text-center">
              {profile?.name && (
                <div className="text-[15px] font-semibold text-[var(--app-text-1)]">
                  {profile.name}
                </div>
              )}
              <div className="text-[13px] text-[var(--app-text-2)]">
                @{profile?.login}
              </div>
              {profile?.email && (
                <div className="text-[12px] text-[var(--app-text-3)] mt-0.5">
                  {profile.email}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-2 mb-5 text-[12px]">
            {repoConfig?.repoUrl && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--app-radius)] bg-[var(--app-hover)]">
                <span className="text-[var(--app-text-3)] shrink-0">Repo</span>
                <span className="text-[var(--app-text-2)] truncate ml-auto">
                  {repoConfig.repoUrl}
                </span>
              </div>
            )}
            {version && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--app-radius)] bg-[var(--app-hover)]">
                <span className="text-[var(--app-text-3)] shrink-0">Versão</span>
                <span className="text-[var(--app-text-2)] ml-auto">v{version}</span>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="flex items-center justify-center gap-4 mb-5 text-[12px]">
            <a
              href="#"
              className="text-[var(--app-accent)] hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              Política de Privacidade
            </a>
            <span className="text-[var(--app-text-3)]">·</span>
            <a
              href="#"
              className="text-[var(--app-accent)] hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              Termos de Uso
            </a>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="flex-1 px-3 py-2 rounded-[var(--app-radius)] border border-[var(--app-border)] text-[var(--app-text-2)] text-[13px] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)] transition-colors cursor-pointer"
            >
              Sair da conta
            </button>
            <button
              onClick={handleQuit}
              className="flex-1 px-3 py-2 rounded-[var(--app-radius)] border border-[var(--app-border)] text-[var(--app-text-2)] text-[13px] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)] transition-colors cursor-pointer"
            >
              Sair do app
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
