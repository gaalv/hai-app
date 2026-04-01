import { ipcMain, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import store from '../store'
import { getPassword } from '../keychain'
import keytar from 'keytar'
import type { PushResult, PullResult, SyncStatus, ConflictFile } from '../../renderer/src/types/sync'

// ── Auth helpers ─────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  // Primary: token stored by auth flow (service: 'hai', key: 'github-token')
  const token = await keytar.getPassword('hai', 'github-token')
  if (token) return token
  // Fallback: legacy keys
  const oauth = await keytar.getPassword('hai-github', 'oauth-token')
  if (oauth) return oauth
  return getPassword('github-pat')
}

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
  if (!match) throw new Error('URL do repositório inválida. Use: https://github.com/user/repo')
  return { owner: match[1], repo: match[2].replace('.git', '') }
}

function getOnAuth(token: string) {
  return () => ({ username: token, password: '' })
}

async function ensureGitRepo(vaultPath: string, repoUrl: string): Promise<void> {
  try {
    await git.resolveRef({ fs: { promises: fs }, dir: vaultPath, ref: 'HEAD' })
  } catch {
    await git.init({ fs: { promises: fs }, dir: vaultPath, defaultBranch: 'main' })
  }

  const remotes = await git.listRemotes({ fs: { promises: fs }, dir: vaultPath })
  const hasOrigin = remotes.find((r) => r.remote === 'origin')
  if (!hasOrigin) {
    await git.addRemote({ fs: { promises: fs }, dir: vaultPath, remote: 'origin', url: repoUrl })
  } else {
    // Update existing origin in case URL changed
    await git.deleteRemote({ fs: { promises: fs }, dir: vaultPath, remote: 'origin' })
    await git.addRemote({ fs: { promises: fs }, dir: vaultPath, remote: 'origin', url: repoUrl })
  }

  const status = await git.statusMatrix({ fs: { promises: fs }, dir: vaultPath })
  const hasChanges = status.some(([, head, workdir, stage]) => workdir !== head || stage !== head)

  if (hasChanges) {
    await git.add({ fs: { promises: fs }, dir: vaultPath, filepath: '.' })
    await git.commit({
      fs: { promises: fs },
      dir: vaultPath,
      message: 'chore: initial commit from Hai',
      author: { name: 'Hai', email: 'hai@local' }
    })
  }
}

// ── Auto-sync timer ──────────────────────────────────────

let autoSyncTimer: NodeJS.Timeout | null = null

async function handlePush(message?: string): Promise<PushResult> {
  const vaultConfig = store.get('vaultConfig')
  const syncConfig = store.get('syncConfig')
  if (!vaultConfig || !syncConfig) {
    console.warn('[sync:push] vault or sync not configured')
    throw new Error('Vault ou sync não configurado')
  }

  const token = await getAuthToken()
  if (!token) {
    console.warn('[sync:push] no auth token found')
    throw new Error('Token não encontrado. Configure o sync.')
  }

  const statusMatrix = await git.statusMatrix({ fs: { promises: fs }, dir: vaultConfig.path })
  const modified = statusMatrix.filter(([, head, workdir, stage]) => workdir !== head || stage !== head)

  let commitSha = ''

  if (modified.length > 0) {
    console.log(`[sync:push] staging ${modified.length} files:`, modified.map(([f]) => f))

    for (const [filepath, , workdir] of modified) {
      if (workdir === 0) {
        await git.remove({ fs: { promises: fs }, dir: vaultConfig.path, filepath })
      } else {
        await git.add({ fs: { promises: fs }, dir: vaultConfig.path, filepath })
      }
    }

    commitSha = await git.commit({
      fs: { promises: fs },
      dir: vaultConfig.path,
      message: message ?? `hai: sync ${new Date().toLocaleString('pt-BR')}`,
      author: { name: 'Hai', email: 'hai@local' }
    })
    console.log(`[sync:push] committed ${commitSha}`)
  } else {
    console.log('[sync:push] no local changes, checking for unpushed commits...')
  }

  // Always push — there may be previously committed but unpushed changes
  try {
    await git.push({ fs: { promises: fs }, http, dir: vaultConfig.path, remote: 'origin', onAuth: getOnAuth(token) })
  } catch (pushErr: unknown) {
    if (pushErr && typeof pushErr === 'object' && 'code' in pushErr && (pushErr as { code: string }).code === 'PushRejectedError') {
      console.warn('[sync:push] not-fast-forward, retrying with force')
      await git.push({ fs: { promises: fs }, http, dir: vaultConfig.path, remote: 'origin', force: true, onAuth: getOnAuth(token) })
    } else {
      throw pushErr
    }
  }
  console.log('[sync:push] pushed to origin')

  const timestamp = new Date().toISOString()
  store.set('syncConfig', { ...syncConfig, lastSync: timestamp } as never)

  return { filesCommitted: modified.length, commitHash: commitSha, timestamp }
}

export function startAutoSync(intervalMinutes: number): void {
  stopAutoSync()
  if (intervalMinutes <= 0) return

  autoSyncTimer = setInterval(async () => {
    try {
      const result = await handlePush()
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('sync:auto-synced', { timestamp: result.timestamp, files: result.filesCommitted })
      })
    } catch (err) {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('sync:auto-error', { error: err instanceof Error ? err.message : 'Erro no auto-sync' })
      })
    }
  }, intervalMinutes * 60 * 1000)
}

export function stopAutoSync(): void {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer)
    autoSyncTimer = null
  }
}

// ── IPC Handlers ─────────────────────────────────────────

export function registerSyncHandlers(): void {
  // Restore auto-sync timer from saved config on startup
  const savedInterval = store.get('autoSyncMinutes' as never) as number | undefined
  if (savedInterval && savedInterval > 0) {
    startAutoSync(savedInterval)
  }

  // sync:configure — validate token, init git, add remote
  ipcMain.handle('sync:configure', async (_event, repoUrl: string) => {
    const token = await getAuthToken()
    if (!token) throw new Error('Nenhum token encontrado. Faça login com GitHub primeiro.')

    // Validate token
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    })
    if (!res.ok) throw new Error('Token inválido ou sem permissão')

    const { owner, repo } = parseRepoUrl(repoUrl)
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!repoRes.ok) throw new Error(`Repositório ${owner}/${repo} não encontrado ou sem acesso`)

    store.set('syncConfig', { repoUrl, configuredAt: new Date().toISOString() })

    const vaultConfig = store.get('vaultConfig')
    if (vaultConfig) await ensureGitRepo(vaultConfig.path, repoUrl)

    return { success: true }
  })

  // sync:push — stage all, commit, push
  ipcMain.handle('sync:push', async (_event, message?: string) => {
    return handlePush(message)
  })

  // sync:pull — fetch + merge, detect conflicts
  ipcMain.handle('sync:pull', async () => {
    const vaultConfig = store.get('vaultConfig')
    const syncConfig = store.get('syncConfig')
    if (!vaultConfig || !syncConfig) throw new Error('Vault ou sync não configurado')

    const token = await getAuthToken()
    if (!token) throw new Error('Token não encontrado. Configure o sync.')

    await git.fetch({ fs: { promises: fs }, http, dir: vaultConfig.path, remote: 'origin', onAuth: getOnAuth(token) })

    try {
      const mergeResult = await git.merge({
        fs: { promises: fs }, dir: vaultConfig.path,
        ours: 'HEAD', theirs: 'FETCH_HEAD',
        author: { name: 'Hai', email: 'hai@local' }
      })
      return {
        filesUpdated: mergeResult.tree ? Object.keys(mergeResult.tree).length : 0,
        hasConflicts: false, conflicts: []
      } as PullResult
    } catch {
      const statusMatrix = await git.statusMatrix({ fs: { promises: fs }, dir: vaultConfig.path })
      const conflicts: ConflictFile[] = []
      for (const [filepath, head, workdir, stage] of statusMatrix) {
        if (head === 1 && workdir === 2 && stage === 3) {
          try {
            const localContent = await fs.readFile(path.join(vaultConfig.path, filepath), 'utf-8')
            conflicts.push({ path: filepath, localContent, remoteContent: '' })
          } catch { /* deleted */ }
        }
      }

      // Notify renderer about detected conflicts
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('sync:conflict-detected', { conflicts })
      })

      return { filesUpdated: 0, hasConflicts: true, conflicts } as PullResult
    }
  })

  // sync:resolve-conflict — write chosen version, stage
  ipcMain.handle('sync:resolve-conflict', async (_event, filePath: string, choice: 'local' | 'remote') => {
    const vaultConfig = store.get('vaultConfig')
    if (!vaultConfig) throw new Error('Vault não configurado')
    const fullPath = path.join(vaultConfig.path, filePath)
    if (choice === 'remote') {
      try {
        const remoteContent = await git.readBlob({ fs: { promises: fs }, dir: vaultConfig.path, oid: 'FETCH_HEAD', filepath: filePath })
        await fs.writeFile(fullPath, Buffer.from(remoteContent.blob), 'utf-8')
      } catch {
        // FETCH_HEAD may not have the file blob directly; try reading current content
      }
    }
    // For 'local': the file already has local content (conflict markers need to be cleaned)
    // For simplicity, if local: keep the file as-is (user's local version)
    await git.add({ fs: { promises: fs }, dir: vaultConfig.path, filepath: filePath })
    return { success: true }
  })

  // sync:get-status — check pending changes via statusMatrix
  ipcMain.handle('sync:get-status', async () => {
    const syncConfig = store.get('syncConfig')
    if (!syncConfig) {
      return { status: 'not-configured', pendingChanges: 0, lastSync: null, lastError: null, repoUrl: null } as SyncStatus
    }
    const vaultConfig = store.get('vaultConfig')
    if (!vaultConfig) {
      return { status: 'not-configured', pendingChanges: 0, lastSync: null, lastError: null, repoUrl: syncConfig.repoUrl } as SyncStatus
    }
    try {
      const statusMatrix = await git.statusMatrix({ fs: { promises: fs }, dir: vaultConfig.path })
      const pendingChanges = statusMatrix.filter(([, head, workdir, stage]) => workdir !== head || stage !== head).length
      return {
        status: pendingChanges > 0 ? 'pending' : 'synced',
        pendingChanges,
        lastSync: (syncConfig as never as { lastSync?: string }).lastSync ?? syncConfig.configuredAt,
        lastError: null,
        repoUrl: syncConfig.repoUrl
      } as SyncStatus
    } catch {
      return { status: 'error', pendingChanges: 0, lastSync: null, lastError: 'Erro ao verificar git', repoUrl: syncConfig.repoUrl } as SyncStatus
    }
  })

  // sync:get-history — git log for a file or entire repo
  ipcMain.handle('sync:get-history', async (_event, relativePath?: string) => {
    const vaultConfig = store.get('vaultConfig')
    if (!vaultConfig) return []
    try {
      const commits = await git.log({ fs: { promises: fs }, dir: vaultConfig.path, filepath: relativePath, depth: 50 })
      return commits.map((c) => ({
        oid: c.oid,
        message: c.commit.message.trim(),
        author: c.commit.author.name,
        timestamp: new Date(c.commit.author.timestamp * 1000).toISOString(),
        files: [] as string[]
      }))
    } catch {
      return []
    }
  })

  // sync:get-diff — compare file content between two commits
  ipcMain.handle('sync:get-diff', async (_event, relativePath: string, oidA: string, oidB: string) => {
    const vaultConfig = store.get('vaultConfig')
    if (!vaultConfig) return { before: '', after: '' }
    try {
      const readBlob = async (oid: string): Promise<string> => {
        const result = await git.readBlob({ fs: { promises: fs }, dir: vaultConfig.path, oid, filepath: relativePath })
        return new TextDecoder().decode(result.blob)
      }
      const [before, after] = await Promise.all([readBlob(oidA), readBlob(oidB)])
      return { before, after }
    } catch {
      return { before: '', after: '' }
    }
  })

  // sync:restore-version — restore file to content at a specific commit
  ipcMain.handle('sync:restore-version', async (_event, relativePath: string, oid: string) => {
    const vaultConfig = store.get('vaultConfig')
    if (!vaultConfig) throw new Error('Vault não configurado')
    const result = await git.readBlob({ fs: { promises: fs }, dir: vaultConfig.path, oid, filepath: relativePath })
    const content = new TextDecoder().decode(result.blob)
    await fs.writeFile(path.join(vaultConfig.path, relativePath), content, 'utf-8')
    return content
  })

  // sync:set-interval — legacy: update auto-sync interval
  ipcMain.handle('sync:set-interval', async (_event, minutes: number) => {
    startAutoSync(minutes)
  })

  // sync:set-auto — set auto-sync interval (0 = manual)
  ipcMain.handle('sync:set-auto', async (_event, intervalMinutes: number) => {
    startAutoSync(intervalMinutes)
    store.set('autoSyncMinutes' as never, intervalMinutes as never)
  })

  // sync:stop-auto — stop auto-sync timer
  ipcMain.handle('sync:stop-auto', async () => {
    stopAutoSync()
    store.set('autoSyncMinutes' as never, 0 as never)
  })
}
