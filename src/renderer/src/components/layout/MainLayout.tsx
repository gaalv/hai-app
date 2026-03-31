import { useEffect, useState } from 'react'
import { useVaultStore } from '../../stores/vault.store'
import { useFileTreeStore } from '../../stores/fileTree.store'
import { useSyncStore } from '../../stores/sync.store'
import { syncService } from '../../services/sync'
import { FileTree } from './FileTree'
import { EditorPane } from '../editor/EditorPane'
import { SyncStatusBadge } from '../sync/SyncStatusBadge'
import { SyncPanel } from '../sync/SyncPanel'
import { ConflictModal } from '../sync/ConflictModal'

export function MainLayout(): JSX.Element {
  const vaultPath = useVaultStore((s) => s.config?.path ?? '')
  const init = useFileTreeStore((s) => s.init)
  const conflicts = useSyncStore((s) => s.conflicts)
  const [syncPanelOpen, setSyncPanelOpen] = useState(false)

  useEffect(() => {
    if (vaultPath) {
      init(vaultPath)
      syncService.refreshStatus()
    }
  }, [vaultPath, init])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0a0a0a' }}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.appName}>hai</span>
        <div style={{ position: 'relative' }}>
          <SyncStatusBadge onClick={() => setSyncPanelOpen((o) => !o)} />
          {syncPanelOpen && <SyncPanel onClose={() => setSyncPanelOpen(false)} />}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <FileTree />
        <EditorPane />
      </div>

      {conflicts.length > 0 && <ConflictModal />}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 12px', height: 38, background: '#111', borderBottom: '1px solid #222',
    flexShrink: 0
  },
  appName: { fontSize: 12, color: '#444', fontFamily: 'monospace', letterSpacing: 2, textTransform: 'lowercase' }
}
