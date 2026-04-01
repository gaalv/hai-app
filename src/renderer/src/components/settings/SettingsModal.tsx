import { useState } from 'react'
import { useUIStore } from '../../stores/ui.store'
import { useAuthStore } from '../../stores/auth.store'
import { useSyncMode } from '../../hooks/useSyncMode'
import { updateFontTheme } from '../../editor/extensions/fontTheme'
import { toggleVimMode } from '../../editor/extensions/vimMode'
import { getActiveEditorView } from '../../editor/editorViewRef'
import { ModeSettingsSection } from './ModeSettingsSection'

interface Props {
  onClose: () => void
}

type Section = 'profile' | 'editor' | 'sync' | 'appearance' | 'mode'

const FONT_OPTIONS = [
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { label: 'Fira Code', value: "'Fira Code', monospace" },
  { label: 'Cascadia Code', value: "'Cascadia Code', monospace" },
  { label: 'Monospace do sistema', value: 'monospace' }
]

export function SettingsModal({ onClose }: Props): JSX.Element {
  const [section, setSection] = useState<Section>('appearance')
  const { isSync } = useSyncMode()
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

  const navItem = (s: Section, label: string) => (
    <button
      key={s}
      className={`text-left w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
        section === s
          ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
          : 'text-[var(--text-2)] hover:bg-[var(--surface-3)]'
      }`}
      onClick={() => setSection(s)}
    >
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200]" onClick={onClose}>
      <div
        className="bg-[var(--surface)] border border-[var(--border-2)] rounded-xl w-[620px] h-[460px] flex overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar nav */}
        <div className="w-44 bg-[var(--surface-2)] border-r border-[var(--border)] p-3 flex flex-col gap-1">
          <p className="text-[10px] text-[var(--text-4)] uppercase tracking-widest px-3 py-1 mb-1">Configurações</p>
          {navItem('appearance', 'Aparência')}
          {navItem('editor', 'Editor')}
          {isSync && navItem('sync', 'Sync')}
          {isSync && navItem('profile', 'Perfil')}
          {navItem('mode', 'Modo')}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {section === 'appearance' && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold text-[var(--text)]">Aparência</h2>

              <div>
                <label className="block text-xs text-[var(--text-3)] mb-2">Tema</label>
                <div className="flex gap-2">
                  {(['auto', 'dark', 'light'] as const).map((t) => (
                    <button
                      key={t}
                      className={`px-4 py-2 rounded-lg text-xs border cursor-pointer transition-colors ${
                        theme === t
                          ? 'bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--accent)]'
                          : 'bg-[var(--surface-2)] border-[var(--border-2)] text-[var(--text-2)] hover:border-[var(--text-3)]'
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
              <h2 className="text-sm font-semibold text-[var(--text)]">Editor</h2>

              {/* Vim mode toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text)]">Vim mode</p>
                  <p className="text-xs text-[var(--text-3)]">Ativa keybindings do Vim no editor</p>
                </div>
                <button
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${
                    vimMode ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]'
                  }`}
                  onClick={handleVimToggle}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      vimMode ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Font family */}
              <div>
                <label className="block text-xs text-[var(--text-3)] mb-2">Fonte</label>
                <select
                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border-2)] text-[var(--text-2)] rounded-lg text-xs cursor-pointer focus:outline-none focus:border-[var(--accent)]"
                  value={fontFamily}
                  onChange={(e) => handleFontFamily(e.target.value)}
                >
                  {FONT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Font size */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs text-[var(--text-3)]">Tamanho da fonte</label>
                  <span className="text-xs text-[var(--text-2)]">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={20}
                  step={1}
                  value={fontSize}
                  onChange={(e) => handleFontSize(Number(e.target.value))}
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-[var(--text-4)]">12px</span>
                  <span className="text-[10px] text-[var(--text-4)]">20px</span>
                </div>
              </div>

              {/* Line height */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs text-[var(--text-3)]">Espaçamento entre linhas</label>
                  <span className="text-xs text-[var(--text-2)]">{lineHeight.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={1.4}
                  max={2.0}
                  step={0.1}
                  value={lineHeight}
                  onChange={(e) => handleLineHeight(Number(e.target.value))}
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-[var(--text-4)]">1.4</span>
                  <span className="text-[10px] text-[var(--text-4)]">2.0</span>
                </div>
              </div>
            </div>
          )}

          {section === 'sync' && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold text-[var(--text)]">Sincronização</h2>
              <p className="text-xs text-[var(--text-3)]">
                Configure o sync no painel de sync (ícone na topbar).
              </p>
              <div>
                <label className="block text-xs text-[var(--text-3)] mb-2">Auto-sync</label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 5, 15, 30].map((min) => (
                    <button
                      key={min}
                      className="px-3 py-1.5 rounded-lg text-xs border border-[var(--border-2)] text-[var(--text-2)] hover:border-[var(--accent)] cursor-pointer transition-colors"
                      onClick={() => window.electronAPI.sync.setInterval(min)}
                    >
                      {min === 0 ? 'Manual' : `${min} min`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'mode' && (
            <ModeSettingsSection onRequestLogin={() => { /* handled inside */ }} />
          )}

          {section === 'profile' && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold text-[var(--text)]">Perfil</h2>

              {profile ? (
                <div className="flex items-center gap-3">
                  <img src={profile.avatar_url} alt={profile.login} className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="text-sm text-[var(--text)]">{profile.name ?? profile.login}</p>
                    <p className="text-xs text-[var(--text-3)]">@{profile.login}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-3)]">Não autenticado</p>
              )}

              {profile && (
                <button
                  className="px-4 py-2 bg-red-400/10 text-red-400 border border-red-400/20 rounded-lg text-xs cursor-pointer hover:bg-red-400/20 transition-colors"
                  onClick={async () => { await logout(); onClose() }}
                >
                  Sair da conta GitHub
                </button>
              )}
            </div>
          )}
        </div>

        {/* Close */}
        <button
          className="absolute top-4 right-4 text-[var(--text-3)] hover:text-[var(--text-2)] text-lg cursor-pointer transition-colors"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
