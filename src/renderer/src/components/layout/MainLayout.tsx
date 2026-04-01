import { useEffect, useState } from 'react'
import { useVaultStore } from '../../stores/vault.store'
import { useFileTreeStore } from '../../stores/fileTree.store'
import { useSyncStore } from '../../stores/sync.store'
import { useUIStore } from '../../stores/ui.store'
import { useManifestStore } from '../../stores/manifest.store'
import { useEditorStore } from '../../stores/editor.store'
import { syncService } from '../../services/sync'
import { Sidebar } from './Sidebar'
import { EditorPane } from '../editor/EditorPane'
import { SyncStatusBadge } from '../sync/SyncStatusBadge'
import { SyncPanel } from '../sync/SyncPanel'
import { ConflictModal } from '../sync/ConflictModal'
import { Statusbar } from './Statusbar'
import { CommandPalette } from '../search/CommandPalette'
import { SettingsModal } from '../settings/SettingsModal'
import { useAuthStore } from '../../stores/auth.store'
import { useSyncMode } from '../../hooks/useSyncMode'

export function MainLayout(): JSX.Element {
  const vaultPath = useVaultStore((s) => s.config?.path ?? '')
  const vaultName = useVaultStore((s) => s.config?.name ?? 'hai')
  const init = useFileTreeStore((s) => s.init)
  const refresh = useFileTreeStore((s) => s.refresh)
  const conflicts = useSyncStore((s) => s.conflicts)
  const { sidebarOpen, focusMode, toggleSidebar, toggleFocusMode } = useUIStore()
  const { load: loadManifest } = useManifestStore()
  const { profile } = useAuthStore()
  const { isSync } = useSyncMode()
  const [syncPanelOpen, setSyncPanelOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (vaultPath) {
      init(vaultPath)
      loadManifest()
      syncService.refreshStatus()
      window.electronAPI.search.index()
    }
  }, [vaultPath, init, loadManifest])

  // Listen for auto-sync events
  useEffect(() => {
    window.electronAPI.onSyncAutoSynced(({ timestamp }) => {
      useSyncStore.getState().setStatus('synced')
      useSyncStore.getState().applyStatus({
        status: 'synced', pendingChanges: 0, lastSync: timestamp, lastError: null,
        repoUrl: useSyncStore.getState().repoUrl
      })
      if (vaultPath) refresh(vaultPath)
    })
    window.electronAPI.onSyncAutoError(({ error }) => {
      useSyncStore.getState().applyStatus({
        status: 'error', pendingChanges: 0, lastSync: null, lastError: error,
        repoUrl: useSyncStore.getState().repoUrl
      })
    })
  }, [vaultPath, refresh])

  // Invalidate search index on save
  useEffect(() => {
    const note = useEditorStore.getState().activeNote
    if (note) window.electronAPI.search.invalidate(note.path)
  })

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === '\\') { e.preventDefault(); toggleSidebar() }
      if (meta && e.shiftKey && e.key === 'F') { e.preventDefault(); toggleFocusMode() }
      if (meta && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(true) }
      if (meta && e.key === ',') { e.preventDefault(); setSettingsOpen(true) }
      if (meta && e.key === 'n') {
        e.preventDefault()
        window.electronAPI.notes.create(vaultPath).then((p) => {
          useEditorStore.getState().openNote(p)
          useFileTreeStore.getState().refresh(vaultPath)
        })
      }
      if (e.key === 'Escape') {
        if (focusMode) toggleFocusMode()
        if (commandPaletteOpen) setCommandPaletteOpen(false)
        if (settingsOpen) setSettingsOpen(false)
        if (syncPanelOpen) setSyncPanelOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar, toggleFocusMode, focusMode, commandPaletteOpen, settingsOpen, syncPanelOpen, vaultPath])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg)]">
      {/* Topbar */}
      {!focusMode && (
        <div className="titlebar-drag flex items-center justify-between h-[36px] bg-[var(--surface)] border-b border-[var(--border)] shrink-0">
          {/* Left: traffic lights space + vault name */}
          <div className="titlebar-no-drag pl-[76px] flex items-center">
            <span
              className="font-sans text-[10px] tracking-[0.18em] uppercase text-[var(--text-4)] select-none"
            >
              {vaultName}
            </span>
          </div>

          {/* Right: controls */}
          <div className="titlebar-no-drag flex items-center gap-0.5 pr-2">
            {/* Sync badge — only in sync mode */}
            {isSync && (
              <div className="relative">
                <SyncStatusBadge onClick={() => setSyncPanelOpen((o) => !o)} />
                {syncPanelOpen && <SyncPanel onClose={() => setSyncPanelOpen(false)} />}
              </div>
            )}

            {/* Profile avatar */}
            {profile && (
              <img
                src={profile.avatar_url}
                alt={profile.login}
                className="w-[18px] h-[18px] rounded-full cursor-pointer opacity-40 hover:opacity-70 transition-opacity ml-1"
                onClick={() => setSettingsOpen(true)}
                title={profile.name ?? profile.login}
              />
            )}

            {/* Settings */}
            <button
              className="font-sans text-[11px] text-[var(--text-4)] hover:text-[var(--text-2)] w-6 h-6 flex items-center justify-center transition-colors cursor-pointer rounded"
              onClick={() => setSettingsOpen(true)}
              title="Configurações (⌘,)"
            >⚙</button>

            {/* Sidebar toggle */}
            <button
              className="font-sans text-[11px] text-[var(--text-4)] hover:text-[var(--text-2)] w-6 h-6 flex items-center justify-center transition-colors cursor-pointer rounded"
              onClick={toggleSidebar}
              title="Toggle sidebar (⌘\\)"
            >
              {sidebarOpen ? '⇥' : '⇤'}
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!focusMode && (
          <div
            className="shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out"
            style={{ width: sidebarOpen ? 220 : 0 }}
          >
            <Sidebar />
          </div>
        )}
        <EditorPane focusMode={focusMode} />
      </div>

      {/* Statusbar */}
      {!focusMode && (
        <Statusbar onSyncClick={() => setSyncPanelOpen((o) => !o)} />
      )}

      {/* Modals */}
      {conflicts.length > 0 && <ConflictModal />}
      {commandPaletteOpen && <CommandPalette onClose={() => setCommandPaletteOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
