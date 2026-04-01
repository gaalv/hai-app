import { useSyncStore } from '../stores/sync.store'

let autoListenerRegistered = false

function ensureAutoListeners(): void {
  if (autoListenerRegistered) return
  autoListenerRegistered = true

  window.electronAPI.onSyncAutoSynced((data) => {
    useSyncStore.getState().applyStatus({
      status: 'synced',
      pendingChanges: 0,
      lastSync: data.timestamp,
      lastError: null,
      repoUrl: useSyncStore.getState().repoUrl
    })
  })

  window.electronAPI.onSyncAutoError((data) => {
    useSyncStore.getState().setLastError(data.error)
    useSyncStore.getState().setStatus('error')
  })

  window.electronAPI.onSyncConflictDetected((data) => {
    useSyncStore.getState().setConflicts(data.conflicts)
    useSyncStore.getState().setStatus('error')
  })
}

async function configure(repoUrl: string): Promise<void> {
  useSyncStore.getState().setStatus('syncing')
  try {
    await window.electronAPI.sync.configure(repoUrl)
    useSyncStore.getState().applyStatus({
      status: 'synced',
      pendingChanges: 0,
      lastSync: new Date().toISOString(),
      lastError: null,
      repoUrl
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao configurar sync'
    useSyncStore.getState().setLastError(msg)
    useSyncStore.getState().setStatus('error')
    throw err
  }
}

async function push(): Promise<void> {
  useSyncStore.getState().setStatus('syncing')
  try {
    const result = await window.electronAPI.sync.push()
    useSyncStore.getState().applyStatus({
      status: 'synced',
      pendingChanges: 0,
      lastSync: result.timestamp,
      lastError: null,
      repoUrl: useSyncStore.getState().repoUrl
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao fazer push'
    useSyncStore.getState().setLastError(msg)
    useSyncStore.getState().setStatus('error')
    throw err
  }
}

async function pull(): Promise<void> {
  useSyncStore.getState().setStatus('syncing')
  try {
    const result = await window.electronAPI.sync.pull()
    if (result.hasConflicts && result.conflicts.length > 0) {
      useSyncStore.getState().setConflicts(result.conflicts)
      useSyncStore.getState().setStatus('error')
    } else {
      useSyncStore.getState().applyStatus({
        status: 'synced',
        pendingChanges: 0,
        lastSync: new Date().toISOString(),
        lastError: null,
        repoUrl: useSyncStore.getState().repoUrl
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao fazer pull'
    useSyncStore.getState().setLastError(msg)
    useSyncStore.getState().setStatus('error')
    throw err
  }
}

async function resolveConflict(filePath: string, choice: 'local' | 'remote'): Promise<void> {
  await window.electronAPI.sync.resolveConflict(filePath, choice)
  const remaining = useSyncStore.getState().conflicts.filter((c) => c.path !== filePath)
  useSyncStore.getState().setConflicts(remaining)
  if (remaining.length === 0) useSyncStore.getState().setStatus('synced')
}

async function refreshStatus(): Promise<void> {
  try {
    const status = await window.electronAPI.sync.getStatus()
    useSyncStore.getState().applyStatus(status)
  } catch {
    // silencioso — status pode falhar se git não inicializado ainda
  }
}

async function getHistory(relativePath?: string): Promise<void> {
  try {
    const history = await window.electronAPI.sync.getHistory(relativePath)
    useSyncStore.getState().setHistory(history)
  } catch {
    useSyncStore.getState().setHistory([])
  }
}

async function getDiff(relativePath: string, oidA: string, oidB: string): Promise<void> {
  try {
    const diff = await window.electronAPI.sync.getDiff(relativePath, oidA, oidB)
    useSyncStore.getState().setDiff(diff)
  } catch {
    useSyncStore.getState().setDiff(null)
  }
}

async function restoreVersion(relativePath: string, oid: string): Promise<string> {
  const content = await window.electronAPI.sync.restoreVersion(relativePath, oid)
  return content
}

async function setAutoSync(intervalMinutes: number): Promise<void> {
  await window.electronAPI.sync.setAutoSync(intervalMinutes)
  useSyncStore.getState().setAutoSyncInterval(intervalMinutes)
  ensureAutoListeners()
}

async function stopAutoSync(): Promise<void> {
  await window.electronAPI.sync.stopAutoSync()
  useSyncStore.getState().setAutoSyncInterval(0)
}

function init(): void {
  ensureAutoListeners()
  refreshStatus()
}

export const syncService = {
  configure,
  push,
  pull,
  resolveConflict,
  refreshStatus,
  getHistory,
  getDiff,
  restoreVersion,
  setAutoSync,
  stopAutoSync,
  init
}
