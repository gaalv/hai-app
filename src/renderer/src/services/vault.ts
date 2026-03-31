import { useVaultStore } from '../stores/vault.store'

async function openPicker(): Promise<void> {
  const { setVault, setError } = useVaultStore.getState()
  try {
    const config = await window.electronAPI.vault.openPicker()
    if (config) setVault(config)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Erro ao selecionar pasta')
    throw err
  }
}

async function load(): Promise<void> {
  const { setVault, setLoading, setError } = useVaultStore.getState()
  setLoading(true)
  try {
    const config = await window.electronAPI.vault.load()
    if (config) setVault(config)
    else useVaultStore.setState({ config: null })
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Erro ao carregar vault')
  } finally {
    setLoading(false)
  }
}

async function create(name: string, parentPath: string): Promise<void> {
  const { setVault, setError } = useVaultStore.getState()
  try {
    const config = await window.electronAPI.vault.create(name, parentPath)
    setVault(config)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Erro ao criar vault')
    throw err
  }
}

export const vaultService = { openPicker, load, create }
