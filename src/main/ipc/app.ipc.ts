import { ipcMain, app, shell } from 'electron'
import store from '../store'

export function registerAppHandlers(): void {
  ipcMain.handle('app:get-mode', () => {
    return store.get('mode') ?? null
  })

  ipcMain.handle('app:set-mode', (_e, mode: 'local' | 'sync') => {
    store.set('mode', mode)
  })

  ipcMain.handle('app:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:quit', () => {
    app.quit()
  })

  ipcMain.handle('app:open-external', (_e, url: string) => {
    shell.openExternal(url)
  })
}
