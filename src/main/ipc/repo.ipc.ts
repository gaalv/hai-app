import { ipcMain, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import keytar from 'keytar'
import { v4 as uuidv4 } from 'uuid'
import store from '../store'
import type { HaiManifest } from '../../renderer/src/types/manifest'

const SERVICE = 'hai'
const TOKEN_KEY = 'github-token'

async function getToken(): Promise<string | null> {
  return keytar.getPassword(SERVICE, TOKEN_KEY)
}

function getLocalRepoPath(owner: string, repo: string): string {
  return path.join(app.getPath('userData'), 'repos', `${owner}-${repo}`)
}

function onAuth(token: string) {
  return () => ({ username: token, password: '' })
}

async function ensureHaiManifest(repoPath: string): Promise<boolean> {
  const manifestPath = path.join(repoPath, 'hai.json')
  try {
    await fs.access(manifestPath)
    return false // already exists
  } catch {
    const manifest: HaiManifest = {
      version: '1',
      notebooks: [
        {
          id: uuidv4(),
          name: 'Inbox',
          path: 'inbox',
          color: '#7C6EF5',
          order: 0,
          createdAt: new Date().toISOString()
        }
      ],
      tags: [],
      pinned: [],
      inbox: 'inbox',
      trash: []
    }
    await fs.mkdir(path.join(repoPath, 'inbox'), { recursive: true })
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    await fs.writeFile(path.join(repoPath, '.gitignore'), '.trash/\n', 'utf-8')
    return true // was created
  }
}

export function registerRepoHandlers(): void {
  // repo:get-config — check if a repo is already configured and local path exists
  ipcMain.handle('repo:get-config', async () => {
    const vaultConfig = store.get('vaultConfig')
    const syncConfig = store.get('syncConfig')
    if (!vaultConfig || !syncConfig) return null
    try {
      await fs.access(vaultConfig.path)
      return { localPath: vaultConfig.path, repoUrl: syncConfig.repoUrl }
    } catch {
      return null
    }
  })

  // repo:connect — clone an existing GitHub repo and initialize hai.json if needed
  ipcMain.handle('repo:connect', async (_e, repoUrl: string) => {
    const token = await getToken()
    if (!token) throw new Error('Token não encontrado. Faça login primeiro.')

    const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
    if (!match) throw new Error('URL de repositório inválida. Use: https://github.com/user/repo')
    const owner = match[1]
    const repo = match[2].replace('.git', '')

    // Verify repo exists
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    })
    if (!res.ok) throw new Error(`Repositório ${owner}/${repo} não encontrado ou sem acesso`)

    const localPath = getLocalRepoPath(owner, repo)
    await fs.mkdir(localPath, { recursive: true })

    // Check if already cloned
    let isCloned = false
    try {
      await git.resolveRef({ fs: { promises: fs }, dir: localPath, ref: 'HEAD' })
      isCloned = true
    } catch { /* not yet cloned */ }

    if (!isCloned) {
      await git.clone({
        fs: { promises: fs },
        http,
        dir: localPath,
        url: `https://github.com/${owner}/${repo}.git`,
        onAuth: onAuth(token),
        singleBranch: true,
        depth: 50
      })
    } else {
      try {
        await git.pull({
          fs: { promises: fs },
          http,
          dir: localPath,
          remote: 'origin',
          onAuth: onAuth(token),
          author: { name: 'Hai', email: 'hai@local' }
        })
      } catch { /* work with local copy */ }
    }

    const wasCreated = await ensureHaiManifest(localPath)
    const cloneUrl = `https://github.com/${owner}/${repo}.git`

    store.set('vaultConfig', { path: localPath, name: repo, configuredAt: new Date().toISOString() })
    store.set('syncConfig', { repoUrl: cloneUrl, configuredAt: new Date().toISOString() })

    if (wasCreated) {
      try {
        await git.add({ fs: { promises: fs }, dir: localPath, filepath: '.' })
        await git.commit({
          fs: { promises: fs },
          dir: localPath,
          message: 'chore: init hai workspace',
          author: { name: 'Hai', email: 'hai@local' }
        })
        await git.push({ fs: { promises: fs }, http, dir: localPath, remote: 'origin', onAuth: onAuth(token) })
      } catch { /* ok — might be an empty repo or push might fail */ }
    }

    return { localPath, repoUrl: cloneUrl }
  })

  // repo:create — create a new private GitHub repo and set it up as the workspace
  ipcMain.handle('repo:create', async (_e, repoName: string) => {
    const token = await getToken()
    if (!token) throw new Error('Token não encontrado. Faça login primeiro.')

    // Get owner login
    const profileRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    })
    if (!profileRes.ok) throw new Error('Erro ao obter perfil do GitHub')
    const profile = await profileRes.json() as { login: string }
    const owner = profile.login

    const localPath = getLocalRepoPath(owner, repoName)
    const cloneUrl = `https://github.com/${owner}/${repoName}.git`

    // Check if the remote repo already exists (from a previous partial attempt)
    let repoExists = false
    const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    })
    if (checkRes.ok) {
      repoExists = true
    }

    if (!repoExists) {
      // Create the repo with auto_init so GitHub sets up the default branch
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: repoName,
          private: true,
          description: 'Hai notes workspace',
          auto_init: true
        })
      })

      if (!createRes.ok) {
        const err = await createRes.json() as { message: string; errors?: Array<{ message: string }> }
        const detail = err.errors?.[0]?.message ?? err.message
        throw new Error(`Erro ao criar repositório: ${detail}`)
      }
    }

    // Prepare local directory — wipe stale state
    await fs.rm(localPath, { recursive: true, force: true }).catch(() => {})
    await fs.mkdir(localPath, { recursive: true })

    // Clone the remote (either just created with auto_init or from previous attempt)
    await git.clone({
      fs: { promises: fs },
      http,
      dir: localPath,
      url: cloneUrl,
      onAuth: onAuth(token),
      singleBranch: true,
      depth: 10
    })

    // Create workspace structure (no-op if already present)
    await ensureHaiManifest(localPath)

    // Stage everything and commit if there are changes
    await git.add({ fs: { promises: fs }, dir: localPath, filepath: '.' })
    const status = await git.statusMatrix({ fs: { promises: fs }, dir: localPath })
    const hasChanges = status.some(([, head, workdir, stage]) => head !== 1 || workdir !== 1 || stage !== 1)

    if (hasChanges) {
      await git.commit({
        fs: { promises: fs },
        dir: localPath,
        message: 'chore: init hai workspace',
        author: { name: 'Hai', email: 'hai@local' }
      })
      await git.push({
        fs: { promises: fs },
        http,
        dir: localPath,
        remote: 'origin',
        ref: 'main',
        onAuth: onAuth(token)
      })
    }

    store.set('vaultConfig', { path: localPath, name: repoName, configuredAt: new Date().toISOString() })
    store.set('syncConfig', { repoUrl: cloneUrl, configuredAt: new Date().toISOString() })

    return { localPath, repoUrl: cloneUrl }
  })
}
