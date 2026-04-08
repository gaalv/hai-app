import { Octokit } from '@octokit/rest'

export interface RepoCoords {
  owner: string
  repo: string
}

export interface GitHubFile {
  path: string
  sha: string
  content: string  // decoded UTF-8
}

export interface UploadResult {
  sha: string
}

export function parseRepoUrl(repoUrl: string): RepoCoords {
  const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
  if (!match) throw new Error('URL do repositório inválida. Use: https://github.com/user/repo')
  return { owner: match[1], repo: match[2].replace('.git', '') }
}

export function makeOctokit(token: string): Octokit {
  return new Octokit({ auth: token })
}

/**
 * Upload (create or update) a single file in a GitHub repo.
 * If cachedSha is provided and still valid, uses it directly.
 * On 422 (SHA mismatch), fetches the current SHA and retries once.
 * Returns the new SHA of the file on GitHub.
 */
export async function uploadFile(
  octokit: Octokit,
  coords: RepoCoords,
  path: string,
  contentBuffer: Buffer,
  message: string,
  cachedSha?: string
): Promise<UploadResult> {
  const { owner, repo } = coords
  const contentBase64 = contentBuffer.toString('base64')

  const params = {
    owner,
    repo,
    path,
    message,
    content: contentBase64,
    committer: { name: 'Hai', email: 'hai@local' },
    ...(cachedSha ? { sha: cachedSha } : {})
  }

  try {
    const res = await octokit.repos.createOrUpdateFileContents(params)
    return { sha: res.data.content?.sha ?? '' }
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    if (status === 409 || status === 422) {
      // SHA mismatch — fetch the real current SHA from GitHub and retry once
      const existing = await octokit.repos.getContent({ owner, repo, path })
      // getContent returns file | symlink | submodule | directory[]
      // For a file it's a single object with a sha field
      const data = existing.data
      const currentSha = !Array.isArray(data) && 'sha' in data ? data.sha : undefined
      if (!currentSha) throw new Error(`Não foi possível obter o SHA atual de ${path}`)

      const retryRes = await octokit.repos.createOrUpdateFileContents({
        ...params,
        sha: currentSha
      })
      return { sha: retryRes.data.content?.sha ?? '' }
    }
    throw normalizeApiError(err)
  }
}

/**
 * Download a single file from GitHub. Returns decoded UTF-8 content and SHA.
 */
export async function downloadFile(
  octokit: Octokit,
  coords: RepoCoords,
  path: string
): Promise<GitHubFile> {
  const { owner, repo } = coords
  const res = await octokit.repos.getContent({ owner, repo, path })
  const data = res.data as { sha: string; content: string; encoding: string }
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return { path, sha: data.sha, content }
}

export interface TreeEntry {
  path: string
  sha: string
  type: string  // 'blob' | 'tree'
}

/**
 * Get all files in the repo as a flat list (recursive tree).
 */
export async function getRepoTree(
  octokit: Octokit,
  coords: RepoCoords
): Promise<TreeEntry[]> {
  const { owner, repo } = coords
  const res = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: 'HEAD',
    recursive: '1'
  })
  return (res.data.tree as TreeEntry[]).filter((e) => e.type === 'blob' && e.path)
}

/**
 * Validate that a token works and has access to the given repo.
 * Throws a user-friendly error on failure.
 */
export async function validateTokenAndRepo(token: string, repoUrl: string): Promise<void> {
  const octokit = makeOctokit(token)
  const { owner, repo } = parseRepoUrl(repoUrl)

  try {
    await octokit.users.getAuthenticated()
  } catch {
    throw new Error('Token inválido ou sem permissão de acesso ao GitHub.')
  }

  try {
    await octokit.repos.get({ owner, repo })
  } catch {
    throw new Error(`Repositório ${owner}/${repo} não encontrado ou sem acesso.`)
  }
}

/**
 * Create a new private GitHub repo for the authenticated user.
 * Returns the HTTPS clone URL.
 */
export async function createRepo(token: string, repoName: string): Promise<string> {
  const octokit = makeOctokit(token)

  const profileRes = await octokit.users.getAuthenticated()
  const owner = profileRes.data.login

  // Check if already exists
  try {
    await octokit.repos.get({ owner, repo: repoName })
    return `https://github.com/${owner}/${repoName}.git`
  } catch {
    // Doesn't exist, create it
  }

  const createRes = await octokit.repos.createForAuthenticatedUser({
    name: repoName,
    private: true,
    description: 'Hai notes workspace',
    auto_init: true
  })

  return createRes.data.clone_url
}

function normalizeApiError(err: unknown): Error {
  const status = (err as { status?: number }).status
  if (status === 401 || status === 403) return new Error('Token inválido ou expirado.')
  if (status === 404) return new Error('Repositório não encontrado ou sem acesso.')
  if (err instanceof Error) return err
  return new Error('Erro na API do GitHub.')
}
