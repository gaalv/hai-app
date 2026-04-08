import { ipcMain } from 'electron'
import keytar from 'keytar'
import { parseRepoUrl, makeOctokit } from './github-api'
import store from '../store'

const SERVICE = 'hai'
const TOKEN_KEY = 'github-token'

async function requireToken(): Promise<string> {
  const t = await keytar.getPassword(SERVICE, TOKEN_KEY)
  if (!t) throw new Error('Token não encontrado. Configure o sync.')
  return t
}

export function registerHistoryHandlers(): void {
  ipcMain.handle('history:list-commits', async (_e, relativePath: string) => {
    const syncConfig = store.get('syncConfig')
    if (!syncConfig) throw new Error('Sync não configurado')
    const token = await requireToken()
    const octokit = makeOctokit(token)
    const coords = parseRepoUrl(syncConfig.repoUrl)

    const res = await octokit.repos.listCommits({
      owner: coords.owner,
      repo: coords.repo,
      path: relativePath,
      per_page: 30
    })

    return res.data.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author?.name ?? 'Unknown',
      date: c.commit.author?.date ?? ''
    }))
  })

  ipcMain.handle('history:get-file-at-commit', async (_e, sha: string, relativePath: string) => {
    const syncConfig = store.get('syncConfig')
    if (!syncConfig) throw new Error('Sync não configurado')
    const token = await requireToken()
    const octokit = makeOctokit(token)
    const coords = parseRepoUrl(syncConfig.repoUrl)

    const res = await octokit.repos.getContent({
      owner: coords.owner,
      repo: coords.repo,
      path: relativePath,
      ref: sha
    })

    const data = res.data
    if (Array.isArray(data) || data.type !== 'file') throw new Error('Not a file')
    return Buffer.from(data.content, 'base64').toString('utf-8')
  })
}
