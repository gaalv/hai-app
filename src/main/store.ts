import Store from 'electron-store'
import type { VaultConfig } from '../renderer/src/types/vault'
import type { SyncConfig } from '../renderer/src/types/sync'
import type { GitHubProfile } from '../renderer/src/types/auth'

interface StoreSchema {
  vaultConfig: VaultConfig | null
  syncConfig: SyncConfig | null
  mode: 'local' | 'sync' | null
  githubClientId: string | null
  cachedProfile: GitHubProfile | null
  profileCachedAt: number | null
}

const store = new Store<StoreSchema>({
  name: 'hai-config',
  defaults: {
    vaultConfig: null,
    syncConfig: null,
    mode: null,
    githubClientId: null,
    cachedProfile: null,
    profileCachedAt: null
  }
})

export default store
