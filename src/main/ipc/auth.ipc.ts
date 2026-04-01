/**
 * GitHub OAuth via Device Flow (no server/callback needed).
 * https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 *
 * Requires: GITHUB_CLIENT_ID set in electron-store or env.
 * The user must register a GitHub OAuth App and provide the client_id.
 */
import { ipcMain, shell, BrowserWindow } from 'electron'
import store from '../store'
import keytar from 'keytar'
import type { GitHubProfile } from '../../renderer/src/types/auth'

const SERVICE = 'hai'
const TOKEN_KEY = 'github-token'

async function getToken(): Promise<string | null> {
  return keytar.getPassword(SERVICE, TOKEN_KEY)
}

async function setToken(token: string): Promise<void> {
  await keytar.setPassword(SERVICE, TOKEN_KEY, token)
}

async function deleteToken(): Promise<void> {
  await keytar.deletePassword(SERVICE, TOKEN_KEY)
}

async function fetchProfile(token: string): Promise<GitHubProfile> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json'
    }
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const data = await res.json() as Record<string, unknown>
  return {
    login: data.login as string,
    name: (data.name as string | null) ?? null,
    avatar_url: data.avatar_url as string,
    email: (data.email as string | null) ?? null,
    bio: (data.bio as string | null) ?? null
  }
}

export function registerAuthHandlers(): void {
  // Check if already authenticated
  ipcMain.handle('auth:get-token', async () => {
    return getToken()
  })

  ipcMain.handle('auth:get-profile', async () => {
    const token = await getToken()
    if (!token) return null

    // Check cache (< 1 hour)
    const cached = store.get('cachedProfile')
    const cachedAt = store.get('profileCachedAt')
    if (cached && cachedAt && Date.now() - (cachedAt as number) < 60 * 60 * 1000) {
      return cached
    }

    try {
      const profile = await fetchProfile(token)
      store.set('cachedProfile', profile)
      store.set('profileCachedAt', Date.now())
      return profile
    } catch {
      return null
    }
  })

  // Start device flow authentication
  ipcMain.handle('auth:device-flow-start', async () => {
    const clientId = store.get('githubClientId') as string | undefined | null
    if (!clientId) {
      return { error: 'client_id_not_configured' }
    }

    const res = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: `client_id=${clientId}&scope=repo%20read:user`
    })

    if (!res.ok) throw new Error('Erro ao iniciar autenticação com GitHub')
    const data = await res.json() as {
      device_code: string
      user_code: string
      verification_uri: string
      expires_in: number
      interval: number
    }

    // Open the verification URL in the browser
    shell.openExternal(data.verification_uri)

    return {
      device_code: data.device_code,
      user_code: data.user_code,
      verification_uri: data.verification_uri,
      expires_in: data.expires_in,
      interval: data.interval,
      // Also expose camelCase for convenience
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      deviceCode: data.device_code,
      expiresIn: data.expires_in
    }
  })

  // Poll for token after user authorizes
  ipcMain.handle('auth:device-flow-poll', async (_e, deviceCode: string, interval: number) => {
    const clientId = store.get('githubClientId') as string | undefined | null
    if (!clientId) {
      return { success: false, error: 'client_id_not_configured' }
    }

    // interval may be in ms (from renderer) or seconds (from spec); normalize to ms
    const waitMs = interval > 1000 ? interval : interval * 1000

    await new Promise((r) => setTimeout(r, waitMs))

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: `client_id=${clientId}&device_code=${deviceCode}&grant_type=urn:ietf:params:oauth:grant-type:device_code`
    })

    const data = await res.json() as Record<string, string>

    if (data.access_token) {
      await setToken(data.access_token)
      const profile = await fetchProfile(data.access_token)
      store.set('cachedProfile', profile)
      store.set('profileCachedAt', Date.now())
      return { success: true, token: data.access_token, profile }
    }

    if (data.error === 'authorization_pending' || data.error === 'slow_down') {
      return { success: false, pending: true }
    }

    if (data.error === 'access_denied') {
      return { success: false, error: 'Autorização negada pelo usuário' }
    }

    if (data.error === 'expired_token') {
      return { success: false, error: 'Código expirou. Tente novamente.' }
    }

    return { success: false, error: data.error ?? 'Erro desconhecido' }
  })

  // Set client_id (for first-time setup)
  ipcMain.handle('auth:set-client-id', async (_e, clientId: string) => {
    store.set('githubClientId', clientId)
  })

  ipcMain.handle('auth:logout', async () => {
    await deleteToken()
    store.delete('cachedProfile')
    store.delete('profileCachedAt')
    // Notify renderer
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('auth:changed', 'logout')
    })
  })

  // Notify renderer when auth changes (called from sync handlers)
  ipcMain.handle('auth:notify-windows', (_e, event: string) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('auth:changed', event)
    })
  })
}
