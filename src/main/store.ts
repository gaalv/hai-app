import Store from 'electron-store'
import type { VaultConfig } from '../renderer/src/types/vault'
import type { SyncConfig } from '../renderer/src/types/sync'

interface StoreSchema {
  vaultConfig: VaultConfig | null
  syncConfig: SyncConfig | null
}

const store = new Store<StoreSchema>({
  name: 'hai-config',
  defaults: {
    vaultConfig: null,
    syncConfig: null
  }
})

export default store
