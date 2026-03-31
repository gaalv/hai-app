import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import { Octokit } from '@octokit/rest'
import store from '../store'
import { getPassword, setPassword } from '../keychain'
import type { PushResult, PullResult, SyncStatus, ConflictFile } from '../../renderer/src/types/sync'

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
  if (!match) throw new Error('URL do repositório inválida. Use: https://github.com/user/repo')
  return { owner: match[1], repo: match[2].replace('.git', '') }
}

function getOnAuth(pat: string) {
  return () => ({ username: pat, password: '' })
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
      message: 'chore: initial commit from Muta Notes',
      author: { name: 'Muta Notes', email: 'muta@local' }
    })
  }
}

export function registerSyncHandlers(): void {
  // sync:configure
  ipcMain.handle('sync:configure', async (_event, pat: string, repoUrl: string) => {
    const octokit = new Octokit({ auth: pat })

    await octokit.rest.users.getAuthenticated()

    const { owner, repo } = parseRepoUrl(repoUrl)
    await octokit.rest.repos.get({ owner, repo })

    await setPassword('github-pat', pat)
    store.set('syncConfig', { repoUrl, configuredAt: new Date().toISOString() })

    const vaultConfig = store.get('vaultConfig')
    if (vaultConfig) {
      await ensureGitRepo(vaultConfig.path, repoUrl)
    }
  })

  // sync:push
  ipcMain.handle('sync:push', async () => {
    const vaultConfig = store.get('vaultConfig')
    const syncConfig = store.get('syncConfig')
    if (!vaultConfig || !syncConfig) throw new Error('Vault ou sync não configurado')

    const pat = await getPassword('github-pat')
    if (!pat) throw new Error('Token GitHub não encontrado. Reconfigure o sync.')

    const statusMatrix = await git.statusMatrix({ fs, dir: vaultConfig.path })
    const modified = statusMatrix.filter(([, head, workdir, stage]) => workdir !== head || stage !== head)

    if (modified.length === 0) {
      return { filesCommitted: 0, commitHash: '', timestamp: new Date().toISOString() } as PushResult
    }

    await git.add({ fs, dir: vaultConfig.path, filepath: '.' })
    const sha = await git.commit({
      fs,
      dir: vaultConfig.path,
      message: `sync: ${new Date().toISOString()}`,
      author: { name: 'Muta Notes', email: 'muta@local' }
    })

    await git.push({
      fs,
      http,
      dir: vaultConfig.path,
      remote: 'origin',
      onAuth: getOnAuth(pat)
    })

    return { filesCommitted: modified.length, commitHash: sha, timestamp: new Date().toISOString() } as PushResult
  })

  // sync:pull
  ipcMain.handle('sync:pull', async () => {
    const vaultConfig = store.get('vaultConfig')
    const syncConfig = store.get('syncConfig')
    if (!vaultConfig || !syncConfig) throw new Error('Vault ou sync não configurado')

    const pat = await getPassword('github-pat')
    if (!pat) throw new Error('Token GitHub não encontrado. Reconfigure o sync.')

    await git.fetch({
      fs,
      http,
      dir: vaultConfig.path,
      remote: 'origin',
      onAuth: getOnAuth(pat)
    })

    let mergeResult
    try {
      mergeResult = await git.merge({
        fs,
        dir: vaultConfig.path,
        ours: 'HEAD',
        theirs: 'FETCH_HEAD',
        author: { name: 'Muta Notes', email: 'muta@local' }
      })
    } catch (err) {
      // Conflito de merge — detectar arquivos conflitantes
      const statusMatrix = await git.statusMatrix({ fs, dir: vaultConfig.path })
      const conflicts: ConflictFile[] = []

      for (const [filepath, head, workdir, stage] of statusMatrix) {
        if (head === 1 && workdir === 2 && stage === 3) {
          const fullPath = path.join(vaultConfig.path, filepath)
          try {
            const localContent = await fs.readFile(fullPath, 'utf-8')
            conflicts.push({ path: filepath, localContent, remoteContent: '' })
          } catch {
            // arquivo pode ter sido deletado
          }
        }
      }

      return { filesUpdated: 0, hasConflicts: true, conflicts } as PullResult
    }

    return {
      filesUpdated: mergeResult.tree ? Object.keys(mergeResult.tree).length : 0,
      hasConflicts: false,
      conflicts: []
    } as PullResult
  })

  // sync:resolve-conflict
  ipcMain.handle('sync:resolve-conflict', async (_event, filePath: string, choice: 'local' | 'remote') => {
    const vaultConfig = store.get('vaultConfig')
    if (!vaultConfig) throw new Error('Vault não configurado')

    const fullPath = path.join(vaultConfig.path, filePath)

    if (choice === 'remote') {
      const remoteContent = await git.readBlob({
        fs,
        dir: vaultConfig.path,
        oid: 'FETCH_HEAD',
        filepath: filePath
      })
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
        pendingChanges,
        lastSync: syncConfig.configuredAt,
        lastError: null,
        repoUrl: syncConfig.repoUrl
      } as SyncStatus
    } catch {
      return {
        status: 'error',
        pendingChanges: 0,
        lastSync: null,
        lastError: 'Erro ao verificar status do git',
        repoUrl: syncConfig.repoUrl
      } as SyncStatus
    }
  })
}
