import { ipcMain, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import keytar from 'keytar'
import store from '../store'
import {
  parseRepoUrl,
  makeOctokit,
  uploadFile,
  downloadFile,
  getRepoTree,
  validateTokenAndRepo
} from './github-api'
import type { PushResult, PullResult, SyncStatus, ConflictFile } from '../../renderer/src/types/sync'

const SERVICE = 'hai'
const TOKEN_KEY = 'github-token'

// ── Auth ─────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  return keytar.getPassword(SERVICE, TOKEN_KEY)
}

function requireToken(): Promise<string> {
  return getToken().then((t) => {
    if (!t) throw new Error('Token não encontrado. Configure o sync.')
    return t
  })
}

// ── Vault file enumeration ────────────────────────────────

const SYNC_EXTENSIONS = new Set(['.md', '.txt', '.json'])

async function getVaultFiles(vaultPath: string): Promise<string[]> {
  const files: string[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile() && SYNC_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(path.relative(vaultPath, fullPath))
      }
    }
  }

  await walk(vaultPath)
  return files
}

// Normalize path separators to forward slashes (GitHub API requirement)
function toApiPath(relativePath: string): string {
  return relativePath.replace(/\\/g, '/')
}

// ── Push ─────────────────────────────────────────────────

async function handlePush(message?: string): Promise<PushResult> {
  const vaultConfig = store.get('vaultConfig')
  const syncConfig = store.get('syncConfig')
  if (!vaultConfig || !syncConfig) throw new Error('Vault ou sync não configurado')

  const token = await requireToken()
  const octokit = makeOctokit(token)
  const coords = parseRepoUrl(syncConfig.repoUrl)

  const commitMessage = message ?? `hai: sync ${new Date().toLocaleString('pt-BR')}`
  const files = await getVaultFiles(vaultConfig.path)
  const fileShas = store.get('fileShas') as Record<string, string>
  const lastSyncAt = store.get('lastSyncAt') as string | null
  const lastSyncMs = lastSyncAt ? new Date(lastSyncAt).getTime() : 0
  const updatedShas: Record<string, string> = { ...fileShas }
  let filesCommitted = 0

  for (const relativePath of files) {
    const apiPath = toApiPath(relativePath)
    const fullPath = path.join(vaultConfig.path, relativePath)

    // Skip files that haven't changed since the last sync
    if (lastSyncMs > 0) {
      try {
        const stat = await fs.stat(fullPath)
        if (stat.mtimeMs <= lastSyncMs) continue
      } catch { /* can't stat → include it */ }
    }

    let content: Buffer
    try {
      content = await fs.readFile(fullPath)
    } catch {
      continue  // File disappeared between enumeration and read
    }

    try {
      const result = await uploadFile(octokit, coords, apiPath, content, commitMessage, fileShas[relativePath])
      updatedShas[relativePath] = result.sha
      filesCommitted++
    } catch (err) {
      console.error(`[sync:push] failed to upload ${apiPath}:`, err)
      // Continue with remaining files
    }
  }

  const timestamp = new Date().toISOString()
  store.set('fileShas', updatedShas as never)
  store.set('lastSyncAt', timestamp as never)
  store.set('syncConfig', { ...syncConfig, lastSync: timestamp } as never)

  return { filesCommitted, commitHash: '', timestamp }
}

// ── Pull ─────────────────────────────────────────────────

async function handlePull(): Promise<PullResult> {
  const vaultConfig = store.get('vaultConfig')
  const syncConfig = store.get('syncConfig')
  if (!vaultConfig || !syncConfig) throw new Error('Vault ou sync não configurado')

  const token = await requireToken()
  const octokit = makeOctokit(token)
  const coords = parseRepoUrl(syncConfig.repoUrl)

  const tree = await getRepoTree(octokit, coords)
  const fileShas = store.get('fileShas') as Record<string, string>
  const lastSyncAt = store.get('lastSyncAt') as string | null

  const conflicts: ConflictFile[] = []
  const updatedShas: Record<string, string> = { ...fileShas }
  let filesUpdated = 0

  for (const entry of tree) {
    const ext = path.extname(entry.path).toLowerCase()
    if (!SYNC_EXTENSIONS.has(ext)) continue

    const relativePath = entry.path
    const lastKnownSha = fileShas[relativePath]

    // Skip files that haven't changed on GitHub
    if (entry.sha === lastKnownSha) continue

    const localPath = path.join(vaultConfig.path, ...relativePath.split('/'))

    // Download new version from GitHub
    let remoteFile: { content: string; sha: string }
    try {
      remoteFile = await downloadFile(octokit, coords, relativePath)
    } catch {
      continue  // Skip if can't download
    }

    // Check if local file was modified after last sync
    let localContent = ''
    let localModified = false

    try {
      localContent = await fs.readFile(localPath, 'utf-8')
      if (lastSyncAt) {
        const stat = await fs.stat(localPath)
        localModified = stat.mtimeMs > new Date(lastSyncAt).getTime()
      }
    } catch {
      // File doesn't exist locally — safe to create
    }

    if (localModified && localContent !== remoteFile.content) {
      // Both sides changed — conflict
      conflicts.push({
        path: relativePath,
        localContent,
        remoteContent: remoteFile.content
      })
    } else {
      // Safe to update local file
      await fs.mkdir(path.dirname(localPath), { recursive: true })
      await fs.writeFile(localPath, remoteFile.content, 'utf-8')
      updatedShas[relativePath] = remoteFile.sha
      filesUpdated++
    }
  }

  if (conflicts.length === 0) {
    const timestamp = new Date().toISOString()
    store.set('fileShas', updatedShas as never)
    store.set('lastSyncAt', timestamp as never)
    store.set('syncConfig', { ...syncConfig, lastSync: timestamp } as never)

    // Notify renderer to refresh the file tree
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('filetree:changed')
    })
  } else {
    // Notify renderer about conflicts
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('sync:conflict-detected', { conflicts })
    })
  }

  return { filesUpdated, hasConflicts: conflicts.length > 0, conflicts }
}

// ── Resolve conflict ──────────────────────────────────────

async function handleResolveConflict(
  relativePath: string,
  choice: 'local' | 'remote',
  remoteContent?: string
): Promise<void> {
  const vaultConfig = store.get('vaultConfig')
  const syncConfig = store.get('syncConfig')
  if (!vaultConfig || !syncConfig) throw new Error('Vault não configurado')

  const localPath = path.join(vaultConfig.path, ...relativePath.split('/'))
  const fileShas = store.get('fileShas') as Record<string, string>
  const token = await requireToken()
  const octokit = makeOctokit(token)
  const coords = parseRepoUrl(syncConfig.repoUrl)

  if (choice === 'remote' && remoteContent !== undefined) {
    // Write remote version to disk
    await fs.mkdir(path.dirname(localPath), { recursive: true })
    await fs.writeFile(localPath, remoteContent, 'utf-8')
    // Fetch current SHA from GitHub to update cache
    const file = await downloadFile(octokit, coords, relativePath)
    const updatedShas = { ...fileShas, [relativePath]: file.sha }
    store.set('fileShas', updatedShas as never)
  } else {
    // Push local version to GitHub (force overwrite)
    const content = await fs.readFile(localPath)
    const message = `hai: resolve conflict ${relativePath}`
    const result = await uploadFile(octokit, coords, toApiPath(relativePath), content, message, fileShas[relativePath])
    const updatedShas = { ...fileShas, [relativePath]: result.sha }
    store.set('fileShas', updatedShas as never)
  }
}

// ── Status (mtime-based, no API call) ────────────────────

async function handleGetStatus(): Promise<SyncStatus> {
  const syncConfig = store.get('syncConfig')
  if (!syncConfig) {
    return { status: 'not-configured', pendingChanges: 0, lastSync: null, lastError: null, repoUrl: null }
  }

  const vaultConfig = store.get('vaultConfig')
  if (!vaultConfig) {
    return { status: 'not-configured', pendingChanges: 0, lastSync: null, lastError: null, repoUrl: syncConfig.repoUrl }
  }

  const lastSyncAt = store.get('lastSyncAt') as string | null
  const lastSync = syncConfig.lastSync ?? lastSyncAt ?? null

  if (!lastSyncAt) {
    // Never synced — all files are pending
    let pendingChanges = 0
    try {
      const files = await getVaultFiles(vaultConfig.path)
      pendingChanges = files.length
    } catch { /* ignore */ }
    return { status: 'pending', pendingChanges, lastSync, lastError: null, repoUrl: syncConfig.repoUrl }
  }

  try {
    const files = await getVaultFiles(vaultConfig.path)
    const lastSyncMs = new Date(lastSyncAt).getTime()
    let pendingChanges = 0

    for (const relativePath of files) {
      try {
        const stat = await fs.stat(path.join(vaultConfig.path, relativePath))
        if (stat.mtimeMs > lastSyncMs) pendingChanges++
      } catch {
        pendingChanges++
      }
    }

    return {
      status: pendingChanges > 0 ? 'pending' : 'synced',
      pendingChanges,
      lastSync,
      lastError: null,
      repoUrl: syncConfig.repoUrl
    }
  } catch {
    return { status: 'error', pendingChanges: 0, lastSync, lastError: 'Erro ao verificar status', repoUrl: syncConfig.repoUrl }
  }
}

// ── IPC Registration ──────────────────────────────────────

export function registerSyncHandlers(): void {
  // sync:configure — validate token + repo, store config
  ipcMain.handle('sync:configure', async (_event, repoUrl: string) => {
    const token = await requireToken()
    await validateTokenAndRepo(token, repoUrl)
    const syncConfig = store.get('syncConfig')
    store.set('syncConfig', {
      repoUrl,
      configuredAt: new Date().toISOString(),
      ...(syncConfig ? { lastSync: syncConfig.lastSync } : {})
    } as never)
    return { success: true }
  })

  // sync:push — upload all vault files to GitHub
  ipcMain.handle('sync:push', async (_event, message?: string) => {
    return handlePush(message)
  })

  // sync:pull — download changed files from GitHub
  ipcMain.handle('sync:pull', async () => {
    return handlePull()
  })

  // sync:resolve-conflict — apply user's choice for a conflicted file
  ipcMain.handle('sync:resolve-conflict', async (_event, filePath: string, choice: 'local' | 'remote', remoteContent?: string) => {
    await handleResolveConflict(filePath, choice, remoteContent)
    return { success: true }
  })

  // sync:get-status — pending changes count via mtime (no API call)
  ipcMain.handle('sync:get-status', async () => {
    return handleGetStatus()
  })
}
