import { useAuthStore } from '../stores/auth.store'

export const authService = {
  async startDeviceFlow() {
    const result = await window.electronAPI.auth.deviceFlowStart()
    return result
  },

  async pollDeviceFlow(deviceCode: string) {
    return window.electronAPI.auth.deviceFlowPoll(deviceCode)
  },

  async getProfile() {
    const profile = await window.electronAPI.auth.getProfile()
    if (profile) {
      useAuthStore.getState().setProfile(profile)
      return profile
    }
    return null
  },

  async checkAuth(): Promise<boolean> {
    useAuthStore.getState().setLoading(true)
    try {
      const token = await window.electronAPI.auth.getToken()
      if (token) {
        await this.getProfile()
        return true
      }
      useAuthStore.getState().setLoading(false)
      return false
    } catch {
      useAuthStore.getState().setLoading(false)
      return false
    }
  },

  async logout() {
    await window.electronAPI.auth.logout()
    useAuthStore.getState().logout()
  }
}
