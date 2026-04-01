import { ipcMain } from 'electron'
import store from '../store'

export function registerAppHandlers(): void {
  ipcMain.handle('app:get-mode', () => {
    return store.get('mode') ?? null
  })

  ipcMain.handle('app:set-mode', (_e, mode: 'local' | 'sync') => {
    store.set('mode', mode)
  })
}
