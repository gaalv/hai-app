import { useModeStore } from '../stores/mode.store'

export const appService = {
  async getMode() {
    const mode = await window.electronAPI.app.getMode()
    useModeStore.getState().setMode(mode)
    useModeStore.getState().setLoaded(true)
    return mode
  },

  async setMode(mode: 'local' | 'sync') {
    await window.electronAPI.app.setMode(mode)
    useModeStore.getState().setMode(mode)
  }
}
