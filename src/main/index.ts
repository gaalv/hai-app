import { app, BrowserWindow, shell, globalShortcut, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerVaultHandlers } from './ipc/vault.ipc'
import { registerNotesHandlers } from './ipc/notes.ipc'
import { registerSyncHandlers } from './ipc/sync.ipc'
import { registerManifestHandlers } from './ipc/manifest.ipc'
import { registerAuthHandlers } from './ipc/auth.ipc'
import { registerSearchHandlers } from './ipc/search.ipc'
import { registerExportHandlers } from './ipc/export.ipc'

let mainWindow: BrowserWindow | null = null
let quickCaptureWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 10 },
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow!.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createQuickCaptureWindow(): void {
  if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
    quickCaptureWindow.show()
    quickCaptureWindow.focus()
    return
  }

  quickCaptureWindow = new BrowserWindow({
    width: 520,
    height: 180,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#111111',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  quickCaptureWindow.on('blur', () => {
    quickCaptureWindow?.hide()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    quickCaptureWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#quick-capture`)
  } else {
    quickCaptureWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'quick-capture' })
  }

  quickCaptureWindow.on('ready-to-show', () => {
    quickCaptureWindow?.center()
    quickCaptureWindow?.show()
    quickCaptureWindow?.focus()
  })
}

// Close quick capture from renderer
ipcMain.handle('quick-capture:close', () => {
  quickCaptureWindow?.hide()
})

app.whenReady().then(() => {
  registerVaultHandlers()
  registerNotesHandlers()
  registerSyncHandlers()
  registerManifestHandlers()
  registerAuthHandlers()
  registerSearchHandlers()
  registerExportHandlers()

  createWindow()

  // Global shortcut: Quick Capture
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    createQuickCaptureWindow()
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
