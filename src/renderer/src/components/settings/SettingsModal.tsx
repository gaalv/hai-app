import { useState } from 'react'
import { useUIStore } from '../../stores/ui.store'
import { useAuthStore } from '../../stores/auth.store'
import { updateFontTheme } from '../../editor/extensions/fontTheme'
import { toggleVimMode } from '../../editor/extensions/vimMode'
import { getActiveEditorView } from '../../editor/editorViewRef'

interface Props {
  onClose: () => void
}

type Section = 'appearance' | 'editor' | 'sync' | 'profile'

const FONT_OPTIONS = [
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { label: 'Fira Code', value: "'Fira Code', monospace" },
  { label: 'Cascadia Code', value: "'Cascadia Code', monospace" },
  { label: 'Monospace do sistema', value: 'monospace' }
]

export function SettingsModal({ onClose }: Props): JSX.Element {
  const [section, setSection] = useState<Section>('appearance')
  const {
    theme,
    vimMode,
    fontFamily,
    fontSize,
    lineHeight,
    setTheme,
    toggleVimMode: storeToggleVimMode,
    setFontFamily,
    setFontSize,
    setLineHeight
  } = useUIStore()
  const { profile, logout } = useAuthStore()

  function handleVimToggle(): void {
    const newVal = !vimMode
    storeToggleVimMode()
    const view = getActiveEditorView()
    if (view) toggleVimMode(view, newVal)
  }

  function handleFontFamily(value: string): void {
    setFontFamily(value)
    const view = getActiveEditorView()
    if (view) updateFontTheme(view, value, fontSize, lineHeight)
  }

  function handleFontSize(value: number): void {
    setFontSize(value)
    const view = getActiveEditorView()
    if (view) updateFontTheme(view, fontFamily, value, lineHeight)
  }

  function handleLineHeight(value: number): void {
    setLineHeight(value)
    const view = getActiveEditorView()
    if (view) updateFontTheme(view, fontFamily, fontSize, value)
  }

  function handleLogout(): void {
    window.electronAPI.auth.logout()
    logout()
    onClose()
  }

  const navItem = (s: Section, label: string) => (
    <button
      key={s}
      className={`text-left w-full px-2.5 py-1.5 rounded text-[11px] font-sans transition-colors cursor-pointer ${
        section === s
          ? 'bg-[var(--app-accent-dim)] text-[var(--app-text-1)]'
          : 'text-[var(--app-text-2)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)]'
      }`}
      onClick={() => setSection(s)}
    >
      {label}
    </button>
  )

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--app-main)] border-[0.5px] border-[var(--app-border)] rounded-xl w-[640px] h-[480px] flex overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar nav */}
        <div className="w-[160px] shrink-0 bg-[var(--app-sidebar)] border-r-[0.5px] border-r-[var(--app-border)] flex flex-col pt-4 pb-3 px-2 gap-0.5">
          <p className="text-[10px] font-sans uppercase tracking-widest text-[var(--app-text-3)] px-2.5 pb-2">
            Configurações
          </p>
          {navItem('appearance', 'Aparência')}
          {navItem('editor', 'Editor')}
          {navItem('sync', 'Sincronização')}
          {navItem('profile', 'Perfil')}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-5">
          {section === 'appearance' && (
            <div className="space-y-4">
              <p className="text-[11px] font-sans uppercase tracking-widest text-[var(--app-text-3)]">
                Aparência
              </p>
              <div>
                <p className="text-[11px] font-sans text-[var(--app-text-3)] mb-2">Tema</p>
                <div className="flex gap-1.5">
                  {(['auto', 'dark', 'light'] as const).map((t) => (
                    <button
                      key={t}
                      className={`px-3 py-1.5 rounded text-[11px] font-sans border-[0.5px] cursor-pointer transition-colors ${
                        theme === t
                          ? 'bg-[var(--app-accent-dim)] border-[var(--app-accent)] text-[var(--app-accent)]'
                          : 'bg-white/[0.04] border-[var(--app-border)] text-[var(--app-text-2)] hover:border-[var(--app-text-3)] hover:text-[var(--app-text-1)]'
                      }`}
                      onClick={() => setTheme(t)}
                    >
                      {t === 'auto' ? 'Automático' : t === 'dark' ? 'Escuro' : 'Claro'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'editor' && (
            <div className="space-y-5">
              <p className="text-[11px] font-sans uppercase tracking-widest text-[var(--app-text-3)]">
                Editor
              </p>

              {/* Vim mode toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-sans text-[var(--app-text-1)]">Vim mode</p>
                  <p className="text-[11px] font-sans text-[var(--app-text-3)] mt-0.5">
                    Ativa keybindings do Vim no editor
                  </p>
                </div>
                <button
                  className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative shrink-0 ${
                    vimMode ? 'bg-[var(--app-accent)]' : 'bg-white/10'
                  }`}
                  onClick={handleVimToggle}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      vimMode ? 'translate-x-[18px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Font family */}
              <div>
                <p className="text-[11px] font-sans text-[var(--app-text-3)] mb-1.5">Fonte</p>
                <select
                  className="w-full px-2.5 py-1.5 bg-white/[0.04] border-[0.5px] border-[var(--app-border)] text-[var(--app-text-2)] rounded text-[11px] font-sans cursor-pointer focus:outline-none focus:border-[var(--app-accent)] transition-colors"
                  value={fontFamily}
                  onChange={(e) => handleFontFamily(e.target.value)}
                >
                  {FONT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font size */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <p className="text-[11px] font-sans text-[var(--app-text-3)]">Tamanho da fonte</p>
                  <span className="text-[11px] font-sans text-[var(--app-text-2)]">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={20}
                  step={1}
                  value={fontSize}
                  onChange={(e) => handleFontSize(Number(e.target.value))}
                  className="w-full accent-[var(--app-accent)] cursor-pointer"
                />
              </div>

              {/* Line height */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <p className="text-[11px] font-sans text-[var(--app-text-3)]">Espaçamento entre linhas</p>
                  <span className="text-[11px] font-sans text-[var(--app-text-2)]">{lineHeight.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={1.4}
                  max={2.0}
                  step={0.1}
                  value={lineHeight}
                  onChange={(e) => handleLineHeight(Number(e.target.value))}
                  className="w-full accent-[var(--app-accent)] cursor-pointer"
                />
              </div>
            </div>
          )}

          {section === 'sync' && (
            <div className="space-y-5">
              <p className="text-[11px] font-sans uppercase tracking-widest text-[var(--app-text-3)]">
                Sincronização
              </p>
              <div>
                <p className="text-[12px] font-sans text-[var(--app-text-1)] mb-1">Intervalo de auto-sync</p>
                <p className="text-[11px] font-sans text-[var(--app-text-3)] mb-3">
                  Com que frequência suas notas são sincronizadas com o GitHub.
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {[0, 5, 15, 30].map((min) => (
                    <button
                      key={min}
                      className="px-3 py-1.5 rounded text-[11px] font-sans border-[0.5px] border-[var(--app-border)] text-[var(--app-text-2)] hover:border-[var(--app-accent)] hover:text-[var(--app-text-1)] cursor-pointer transition-colors bg-white/[0.04]"
                      onClick={() => {
                        if (min === 0) {
                          window.electronAPI.sync.stopAutoSync()
                        } else {
                          window.electronAPI.sync.setAutoSync(min)
                        }
                      }}
                    >
                      {min === 0 ? 'Manual' : `${min} min`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[12px] font-sans text-[var(--app-text-1)] mb-1">Sync manual</p>
                <p className="text-[11px] font-sans text-[var(--app-text-3)] mb-3">
                  Forçar sincronização agora.
                </p>
                <button
                  className="px-3 py-1.5 rounded text-[11px] font-sans border-[0.5px] border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-accent-dim)] cursor-pointer hover:brightness-110 transition-all"
                  onClick={async () => {
                    try {
                      await window.electronAPI.sync.push()
                    } catch (err) {
                      console.error('[settings] sync push failed:', err)
                    }
                  }}
                >
                  Sincronizar agora
                </button>
              </div>
            </div>
          )}

          {section === 'profile' && (
            <div className="space-y-5">
              <p className="text-[11px] font-sans uppercase tracking-widest text-[var(--app-text-3)]">
                Perfil
              </p>

              {profile ? (
                <div className="flex items-center gap-3">
                  {profile.avatar_url && (
                    <img
                      src={profile.avatar_url}
                      alt={profile.login}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="text-[13px] font-sans text-[var(--app-text-1)] font-medium">
                      {profile.name ?? profile.login}
                    </p>
                    <p className="text-[11px] font-sans text-[var(--app-text-3)] mt-0.5">
                      @{profile.login}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] font-sans text-[var(--app-text-3)]">Não autenticado</p>
              )}

              <div className="h-[0.5px] bg-[var(--app-border)]" />

              <div>
                <p className="text-[12px] font-sans text-[var(--app-text-1)] mb-1">Versão</p>
                <p className="text-[11px] font-sans text-[var(--app-text-3)]">Hai v1.0.0</p>
              </div>

              <div className="h-[0.5px] bg-[var(--app-border)]" />

              <button
                className="px-3 py-1.5 bg-red-400/10 text-red-400 border-[0.5px] border-red-400/20 rounded text-[11px] font-sans cursor-pointer hover:bg-red-400/20 transition-colors"
                onClick={handleLogout}
              >
                Sair da conta
              </button>

              <button
                className="px-3 py-1.5 bg-white/[0.04] text-[var(--app-text-2)] border-[0.5px] border-[var(--app-border)] rounded text-[11px] font-sans cursor-pointer hover:bg-[var(--app-hover)] transition-colors ml-2"
                onClick={() => window.electronAPI.app.quit()}
              >
                Encerrar aplicação
              </button>
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          className="absolute top-3.5 right-3.5 w-6 h-6 flex items-center justify-center rounded text-[var(--app-text-3)] hover:text-[var(--app-text-1)] hover:bg-[var(--app-hover)] text-[11px] cursor-pointer transition-colors"
          onClick={onClose}
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
