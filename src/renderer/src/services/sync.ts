import { useSyncStore } from '../stores/sync.store'

let conflictListenerRegistered = false

function ensureConflictListener(): void {
  if (conflictListenerRegistered) return
  conflictListenerRegistered = true

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

async function push(message?: string): Promise<void> {
  useSyncStore.getState().setStatus('syncing')
  try {
    const result = await window.electronAPI.sync.push(message)
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

async function resolveConflict(filePath: string, choice: 'local' | 'remote', remoteContent?: string): Promise<void> {
  await window.electronAPI.sync.resolveConflict(filePath, choice, remoteContent)
  const remaining = useSyncStore.getState().conflicts.filter((c) => c.path !== filePath)
  useSyncStore.getState().setConflicts(remaining)
  if (remaining.length === 0) useSyncStore.getState().setStatus('synced')
}

async function refreshStatus(): Promise<void> {
  try {
    const status = await window.electronAPI.sync.getStatus()
    useSyncStore.getState().applyStatus(status)
  } catch {
    // Silencioso — status pode falhar se vault não configurado ainda
  }
}

function init(): void {
  ensureConflictListener()
  refreshStatus()
}

export const syncService = {
  configure,
  push,
  pull,
  resolveConflict,
  refreshStatus,
  init
}
