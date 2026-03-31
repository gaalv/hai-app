import { useSyncStore } from '../stores/sync.store'

async function configure(pat: string, repoUrl: string): Promise<void> {
  useSyncStore.getState().setStatus('syncing')
  try {
    await window.electronAPI.sync.configure(pat, repoUrl)
    useSyncStore.getState().applyStatus({ status: 'synced', pendingChanges: 0, lastSync: new Date().toISOString(), lastError: null, repoUrl })
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
    await window.electronAPI.sync.push()
    useSyncStore.getState().applyStatus({ status: 'synced', pendingChanges: 0, lastSync: new Date().toISOString(), lastError: null, repoUrl: useSyncStore.getState().repoUrl })
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
      useSyncStore.getState().applyStatus({ status: 'synced', pendingChanges: 0, lastSync: new Date().toISOString(), lastError: null, repoUrl: useSyncStore.getState().repoUrl })
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

export const syncService = { configure, push, pull, resolveConflict, refreshStatus }
