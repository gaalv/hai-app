import { ipcMain } from 'electron'
import keytar from 'keytar'
import store from '../store'
import { parseRepoUrl, makeOctokit, createRepo } from './github-api'

const SERVICE = 'hai'
const TOKEN_KEY = 'github-token'

async function getToken(): Promise<string | null> {
  return keytar.getPassword(SERVICE, TOKEN_KEY)
}

export function registerRepoHandlers(): void {
  // repo:get-config — return current repo config if set
  ipcMain.handle('repo:get-config', async () => {
    const syncConfig = store.get('syncConfig')
    const vaultConfig = store.get('vaultConfig')
    if (!syncConfig || !vaultConfig) return null
    return { localPath: vaultConfig.path, repoUrl: syncConfig.repoUrl }
  })

  // repo:connect — validate access to an existing GitHub repo and store config
  ipcMain.handle('repo:connect', async (_e, repoUrl: string) => {
    const token = await getToken()
    if (!token) throw new Error('Token não encontrado. Faça login primeiro.')

    const { owner, repo } = parseRepoUrl(repoUrl)
    const octokit = makeOctokit(token)

    // Validate token
    try {
      await octokit.users.getAuthenticated()
    } catch {
      throw new Error('Token inválido ou sem permissão de acesso ao GitHub.')
    }

    // Validate repo access
    try {
      await octokit.repos.get({ owner, repo })
    } catch {
      throw new Error(`Repositório ${owner}/${repo} não encontrado ou sem acesso.`)
    }

    const normalizedUrl = `https://github.com/${owner}/${repo}.git`
    const vaultConfig = store.get('vaultConfig')

    store.set('syncConfig', {
      repoUrl: normalizedUrl,
      configuredAt: new Date().toISOString()
    } as never)

    // Reset SHA cache when connecting to a (potentially different) repo
    store.set('fileShas', {} as never)
    store.set('lastSyncAt', null as never)

    return { localPath: vaultConfig?.path ?? null, repoUrl: normalizedUrl }
  })

  // repo:create — create a new private GitHub repo and store config
  ipcMain.handle('repo:create', async (_e, repoName: string) => {
    const token = await getToken()
    if (!token) throw new Error('Token não encontrado. Faça login primeiro.')

    const cloneUrl = await createRepo(token, repoName)
    const vaultConfig = store.get('vaultConfig')

    store.set('syncConfig', {
      repoUrl: cloneUrl,
      configuredAt: new Date().toISOString()
    } as never)

    // Reset SHA cache for fresh repo
    store.set('fileShas', {} as never)
    store.set('lastSyncAt', null as never)

    return { localPath: vaultConfig?.path ?? null, repoUrl: cloneUrl }
  })
}
