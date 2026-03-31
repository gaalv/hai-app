import { ipcMain, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import store from '../store'
import { getPassword, setPassword } from '../keychain'
import keytar from 'keytar'
import type { PushResult, PullResult, SyncStatus, ConflictFile } from '../../renderer/src/types/sync'

// ── Auth helpers ─────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  // Try OAuth token first, fall back to PAT
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
    await git.resolveRef({ fs, dir: vaultPath, ref: 'HEAD' })
  } catch {
    await git.init({ fs, dir: vaultPath, defaultBranch: 'main' })
  }

  const remotes = await git.listRemotes({ fs, dir: vaultPath })
  if (!remotes.find((r) => r.remote === 'origin')) {
    await git.addRemote({ fs, dir: vaultPath, remote: 'origin', url: repoUrl })
  }

  const status = await git.statusMatrix({ fs, dir: vaultPath })
  const hasChanges = status.some(([, head, workdir, stage]) => workdir !== head || stage !== head)

  if (hasChanges) {
    await git.add({ fs, dir: vaultPath, filepath: '.' })
    await git.commit({
      fs,
      dir: vaultPath,
      message: 'chore: initial commit from Hai',
      author: { name: 'Hai', email: 'hai@local' }
    })
  }
}

// ── Auto-sync timer ──────────────────────────────────────

let autoSyncTimer: NodeJS.Timeout | null = null

export function startAutoSync(intervalMinutes: number): void {
  stopAutoSync()
  if (intervalMinutes <= 0) return

  autoSyncTimer = setInterval(async () => {
    try {
      const vaultConfig = store.get('vaultConfig')
      const syncConfig = store.get('syncConfig')
      if (!vaultConfig || !syncConfig) return

      const token = await getAuthToken()
      if (!token) return

      const statusMatrix = await git.statusMatrix({ fs, dir: vaultConfig.path })
      const modified = statusMatrix.filter(([, head, workdir, stage]) => workdir !== head || stage !== head)

      if (modified.length > 0) {
        await git.add({ fs, dir: vaultConfig.path, filepath: '.' })
        await git.commit({
          fs,
          dir: vaultConfig.path,
          message: `hai: auto-sync ${new Date().toLocaleString('pt-BR')}`,
          author: { name: 'Hai', email: 'hai@local' }
        })
        await git.push({
          fs, http, dir: vaultConfig.path, remote: 'origin',
          onAuth: getOnAuth(token)
        })
      }

      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('sync:auto-synced', { timestamp: new Date().toISOString(), files: modified.length })
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
  // sync:configure
  ipcMain.handle('sync:configure', async (_event, pat: string, repoUrl: string) => {
    // Validate token
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${pat}`, Accept: 'application/vnd.github+json' }
    })
    if (!res.ok) throw new Error('Token inválido ou sem permissão')

    const { owner, repo } = parseRepoUrl(repoUrl)
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${pat}` }
    })
    if (!repoRes.ok) throw new Error(`Repositório ${owner}/${repo} não encontrado ou sem acesso`)

    await setPassword('github-pat', pat)
    store.set('syncConfig', { repoUrl, configuredAt: new Date().toISOString() })

    const vaultConfig = store.get('vaultConfig')
    if (vaultConfig) await ensureGitRepo(vaultConfig.path, repoUrl)
  })

  // sync:push
  ipcMain.handle('sync:push', async (_event, message?: string) => {
    const vaultConfig = store.get('vaultConfig')
    const syncConfig = store.get('syncConfig')
    if (!vaultConfig || !syncConfig) throw new Error('Vault ou sync não configurado')

    const token = await getAuthToken()
    if (!token) throw new Error('Token não encontrado. Configure o sync.')

    const statusMatrix = await git.statusMatrix({ fs, dir: vaultConfig.path })
    const modified = statusMatrix.filter(([, head, workdir, stage]) => workdir !== head || stage !== head)

    if (modified.length === 0) {
      return { filesCommitted: 0, commitHash: '', timestamp: new Date().toISOString() } as PushResult
    }

    await git.add({ fs, dir: vaultConfig.path, filepath: '.' })
    const sha = await git.commit({
      fs,
      dir: vaultConfig.path,
      message: message ?? `hai: sync ${new Date().toLocaleString('pt-BR')}`,
      author: { name: 'Hai', email: 'hai@local' }
    })

    await git.push({ fs, http, dir: vaultConfig.path, remote: 'origin', onAuth: getOnAuth(token) })

    return { filesCommitted: modified.length, commitHash: sha, timestamp: new Date().toISOString() } as PushResult
  })

  // sync:pull
  ipcMain.handle('sync:pull', async () => {
    const vaultConfig = store.get('vaultConfig')
    const syncConfig = store.get('syncConfig')
    if (!vaultConfig || !syncConfig) throw new Error('Vault ou sync não configurado')

    const token = await getAuthToken()
    if (!token) throw new Error('Token não encontrado. Configure o sync.')

    await git.fetch({ fs, http, dir: vaultConfig.path, remote: 'origin', onAuth: getOnAuth(token) })

    try {
      const mergeResult = await git.merge({
        fs, dir: vaultConfig.path,
        ours: 'HEAD', theirs: 'FETCH_HEAD',
        author: { name: 'Hai', email: 'hai@local' }
      })
      return {
        filesUpdated: mergeResult.tree ? Object.keys(mergeResult.tree).length : 0,
        hasConflicts: false, conflicts: []
      } as PullResult
    } catch {
      const statusMatrix = await git.statusMatrix({ fs, dir: vaultConfig.path })
      const conflicts: ConflictFile[] = []
      for (const [filepath, head, workdir, stage] of statusMatrix) {
        if (head === 1 && workdir === 2 && stage === 3) {
          try {
            const localContent = await fs.readFile(path.join(vaultConfig.path, filepath), 'utf-8')
            conflicts.push({ path: filepath, localContent, remoteContent: '' })
          } catch { /* deleted */ }
        }
      }
      return { filesUpdated: 0, hasConflicts: true, conflicts } as PullResult
    }
  })

  // sync:resolve-conflict
  ipcMain.handle('sync:resolve-conflict', async (_event, filePath: string, choice: 'local' | 'remote') => {
    const vaultConfig = store.get('vaultConfig')
    if (!vaultConfig) throw new Error('Vault não configurado')
    const fullPath = path.join(vaultConfig.path, filePath)
    if (choice === 'remote') {
      const remoteContent = await git.readBlob({ fs, dir: vaultConfig.path, oid: 'FETCH_HEAD', filepath: filePath })
      await fs.writeFile(fullPath, Buffer.from(remoteContent.blob), 'utf-8')
    }
    await git.add({ fs, dir: vaultConfig.path, filepath: filePath })
  })

  // sync:get-status
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
      const statusMatrix = await git.statusMatrix({ fs, dir: vaultConfig.path })
      const pendingChanges = statusMatrix.filter(([, head, workdir, stage]) => workdir !== head || stage !== head).length
      return {
        status: pendingChanges > 0 ? 'pending' : 'synced',
        pendingChanges, lastSync: syncConfig.configuredAt, lastError: null, repoUrl: syncConfig.repoUrl
      } as SyncStatus
    } catch {
      return { status: 'error', pendingChanges: 0, lastSync: null, lastError: 'Erro ao verificar git', repoUrl: syncConfig.repoUrl } as SyncStatus
    }
  })

  // sync:get-history — git log for a file
  ipcMain.handle('sync:get-history', async (_event, relativePath?: string) => {
    const vaultConfig = store.get('vaultConfig')
    if (!vaultConfig) return []
    try {
      const commits = await git.log({ fs, dir: vaultConfig.path, filepath: relativePath, depth: 50 })
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

  // sync:get-diff — diff a file between two commits
  ipcMain.handle('sync:get-diff', async (_event, relativePath: string, oidA: string, oidB: string) => {
    const vaultConfig = store.get('vaultConfig')
    if (!vaultConfig) return { before: '', after: '' }
    try {
      const readBlob = async (oid: string): Promise<string> => {
        const result = await git.readBlob({ fs, dir: vaultConfig.path, oid, filepath: relativePath })
        return new TextDecoder().decode(result.blob)
      }
      const [before, after] = await Promise.all([readBlob(oidA), readBlob(oidB)])
      return { before, after }
    } catch {
      return { before: '', after: '' }
    }
  })

  // sync:restore-version — restore file to a commit's content
  ipcMain.handle('sync:restore-version', async (_event, relativePath: string, oid: string) => {
    const vaultConfig = store.get('vaultConfig')
    if (!vaultConfig) throw new Error('Vault não configurado')
    const result = await git.readBlob({ fs, dir: vaultConfig.path, oid, filepath: relativePath })
    const content = new TextDecoder().decode(result.blob)
    await fs.writeFile(path.join(vaultConfig.path, relativePath), content, 'utf-8')
    return content
  })

  // sync:set-interval — update auto-sync interval
  ipcMain.handle('sync:set-interval', async (_event, minutes: number) => {
    startAutoSync(minutes)
  })
}
