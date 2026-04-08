import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import { useSyncStore } from '../../stores/sync.store'
import { useEditorStore } from '../../stores/editor.store'
import { useUIStore } from '../../stores/ui.store'
import type { RepoConfig } from '../../types/electron'

interface ProfileModalProps {
  onClose: () => void
  onLogout: () => void
}

function formatLastSync(iso: string | null): string {
  if (!iso) return 'Nunca sincronizado'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Agora mesmo'
  if (mins < 60) return `Há ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Há ${hrs}h`
  return new Date(iso).toLocaleDateString('pt-BR')
}

function SyncStatusDot({ status }: { status: string }): JSX.Element {
  const colors: Record<string, string> = {
    synced: 'bg-emerald-400',
    pending: 'bg-amber-400',
    syncing: 'bg-blue-400 animate-pulse',
    error: 'bg-red-400',
    'not-configured': 'bg-[var(--app-text-3)]'
  }
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors[status] ?? colors['not-configured']}`} />
}

function syncStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    synced: 'Sincronizado',
    pending: 'Mudanças pendentes',
    syncing: 'Sincronizando…',
    error: 'Erro no sync',
    'not-configured': 'Sync não configurado'
  }
  return labels[status] ?? status
}

export function ProfileModal({ onClose, onLogout }: ProfileModalProps): JSX.Element {
  const { profile } = useAuthStore()
  const { status, pendingChanges, lastSync } = useSyncStore()
  const { isDirty, isSaving } = useEditorStore()
  const { resolvedTheme, setTheme } = useUIStore()
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

  const repoName = repoConfig?.repoUrl
    ? repoConfig.repoUrl.replace('https://github.com/', '').replace('.git', '')
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-start bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative mb-[14px] ml-[60px] w-[280px] rounded-[var(--app-radius)] border border-[var(--app-border)] bg-[var(--app-main)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* User header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--app-border)]">
          <div className="shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.login}
                className="w-10 h-10 rounded-full border border-[var(--app-border-mid)]"
              />
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#C05010] to-[#E88A50] text-white text-sm font-semibold">
                {(profile?.name || profile?.login || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            {profile?.name && (
              <div className="text-[13px] font-semibold text-[var(--app-text-1)] truncate">
                {profile.name}
              </div>
            )}
            <div className="text-[12px] text-[var(--app-text-3)] truncate">
              @{profile?.login}
            </div>
            {profile?.email && (
              <div className="text-[11px] text-[var(--app-text-3)] truncate opacity-70">
                {profile.email}
              </div>
            )}
          </div>
        </div>

        {/* Status grid */}
        <div className="px-4 py-3 border-b border-[var(--app-border)]">
          {/* GitHub sync row — only show when configured */}
          {status !== 'not-configured' && (
            <div className="flex items-center gap-2 mb-2">
              <SyncStatusDot status={status} />
              <span className="text-[12px] text-[var(--app-text-2)] flex-1">{syncStatusLabel(status)}</span>
              {status === 'pending' && pendingChanges > 0 && (
                <span className="text-[10.5px] text-amber-400 font-medium tabular-nums">{pendingChanges} pendente{pendingChanges !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}

          {/* Save state row */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isSaving ? 'bg-blue-400 animate-pulse' : isDirty ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className="text-[12px] text-[var(--app-text-3)]">
              {isSaving ? 'Salvando…' : isDirty ? 'Não salvo' : 'Salvo'}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {lastSync && (
              <span className="text-[11px] text-[var(--app-text-3)] flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {formatLastSync(lastSync)}
              </span>
            )}
            {repoName && (
              <span className="text-[11px] text-[var(--app-text-3)] flex items-center gap-1 truncate max-w-[160px]">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                {repoName}
              </span>
            )}
            {version && (
              <span className="text-[11px] text-[var(--app-text-3)]">v{version}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 flex flex-col gap-1">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-full text-left px-3 py-2 rounded-[var(--app-radius)] text-[12px] text-[var(--app-text-2)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)] transition-colors cursor-pointer flex items-center gap-2"
          >
            {resolvedTheme === 'dark' ? (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2.8" stroke="currentColor" strokeWidth="1.4"/>
                <line x1="8" y1="1" x2="8" y2="2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="8" y1="13.2" x2="8" y2="15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="1" y1="8" x2="2.8" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="13.2" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="3.05" y1="3.05" x2="4.32" y2="4.32" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="11.68" y1="11.68" x2="12.95" y2="12.95" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="12.95" y1="3.05" x2="11.68" y2="4.32" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="4.32" y1="11.68" x2="3.05" y2="12.95" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 9.5A6 6 0 016.5 2.5a6 6 0 000 11 6 6 0 007-4z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-[var(--app-radius)] text-[12px] text-[var(--app-text-2)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)] transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 7V2M3 3.5A5.5 5.5 0 1011 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Sair da conta
          </button>
          <button
            onClick={() => window.electronAPI.app.quit()}
            className="w-full text-left px-3 py-2 rounded-[var(--app-radius)] text-[12px] text-[#F87171] hover:bg-[rgba(248,113,113,0.08)] transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M5 5l4 4M9 5l-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Sair do app
          </button>
        </div>
      </div>
    </div>
  )
}
