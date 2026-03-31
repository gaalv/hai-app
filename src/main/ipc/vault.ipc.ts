import { ipcMain, dialog, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import store from '../store'
import type { VaultConfig } from '../../renderer/src/types/vault'

const BLOCKED_PATHS = ['/', 'C:\\', 'C:/', app.getPath('home')]

function isBlockedPath(p: string): boolean {
  const normalized = path.normalize(p)
  return BLOCKED_PATHS.some((b) => path.normalize(b) === normalized) || normalized.split(path.sep).length <= 2
}

async function validatePath(vaultPath: string): Promise<void> {
  if (isBlockedPath(vaultPath)) {
    throw new Error('Pasta inválida: selecione uma subpasta específica, não a raiz do sistema.')
  }
  await fs.access(vaultPath, fs.constants.R_OK | fs.constants.W_OK)
}

function buildConfig(vaultPath: string): VaultConfig {
  return {
    path: vaultPath,
    name: path.basename(vaultPath),
    configuredAt: new Date().toISOString()
  }
}

export function registerVaultHandlers(): void {
  ipcMain.handle('vault:open-picker', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Selecionar pasta do vault',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const vaultPath = result.filePaths[0]
    await validatePath(vaultPath)
    const config = buildConfig(vaultPath)
    store.set('vaultConfig', config)
    return config
  })

  ipcMain.handle('vault:configure', async (_event, vaultPath: string) => {
    await validatePath(vaultPath)
    const config = buildConfig(vaultPath)
    store.set('vaultConfig', config)
    return config
  })

  ipcMain.handle('vault:load', async () => {
    const config = store.get('vaultConfig')
    if (!config) return null
    try {
      await fs.access(config.path)
      return config
    } catch {
      return null
    }
  })

  ipcMain.handle('vault:create', async (_event, name: string, parentPath: string) => {
    const vaultPath = path.join(parentPath, name)
    await fs.mkdir(vaultPath, { recursive: true })
    await validatePath(vaultPath)
    const config = buildConfig(vaultPath)
    store.set('vaultConfig', config)
    return config
  })
}
