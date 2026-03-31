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

const SERVICE = 'hai-github'
const ACCOUNT = 'oauth-token'
const GITHUB_CLIENT_ID = process.env['GITHUB_CLIENT_ID'] ?? store.get('githubClientId' as never) ?? ''

async function getToken(): Promise<string | null> {
  return keytar.getPassword(SERVICE, ACCOUNT)
}

async function setToken(token: string): Promise<void> {
  await keytar.setPassword(SERVICE, ACCOUNT, token)
}

async function deleteToken(): Promise<void> {
  await keytar.deletePassword(SERVICE, ACCOUNT)
}

async function fetchProfile(token: string): Promise<GitHubProfile> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
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
    try {
      return await fetchProfile(token)
    } catch {
      return null
    }
  })

  // Start device flow authentication
  ipcMain.handle('auth:device-flow-start', async () => {
    if (!GITHUB_CLIENT_ID) {
      throw new Error('GITHUB_CLIENT_ID não configurado. Veja as instruções de setup.')
    }

    const res = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        scope: 'repo read:user user:email'
      })
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
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      deviceCode: data.device_code,
      interval: data.interval * 1000,
      expiresIn: data.expires_in
    }
  })

  // Poll for token after user authorizes
  ipcMain.handle('auth:device-flow-poll', async (_e, deviceCode: string, interval: number) => {
    const maxAttempts = 60
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, interval))

      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      })

      const data = await res.json() as Record<string, string>

      if (data.access_token) {
        await setToken(data.access_token)
        const profile = await fetchProfile(data.access_token)
        return { token: data.access_token, profile }
      }

      if (data.error === 'access_denied') throw new Error('Autorização negada pelo usuário')
      if (data.error === 'expired_token') throw new Error('Código expirou. Tente novamente.')
      // 'authorization_pending' or 'slow_down' → keep polling

      if (data.error === 'slow_down') {
        await new Promise((r) => setTimeout(r, 5000))
      }

      attempts++
    }

    throw new Error('Tempo esgotado. Tente novamente.')
  })

  // Set client_id (for first-time setup)
  ipcMain.handle('auth:set-client-id', async (_e, clientId: string) => {
    store.set('githubClientId' as never, clientId as never)
  })

  ipcMain.handle('auth:logout', async () => {
    await deleteToken()
  })

  // Notify renderer when auth changes (called from sync handlers)
  ipcMain.handle('auth:notify-windows', (_e, event: string) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('auth:changed', event)
    })
  })
}
