import { useEffect } from 'react'
import { vaultService } from '../../services/vault'
import { useVaultStore } from '../../stores/vault.store'
import { OnboardingScreen } from '../vault/OnboardingScreen'
import { MainLayout } from './MainLayout'

export function AppShell(): JSX.Element {
  const { config, isLoading, error } = useVaultStore()

  useEffect(() => {
    vaultService.load()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--text-3)] text-sm">
        Carregando...
      </div>
    )
  }

  if (error && !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => {
            useVaultStore.getState().clearVault()
            useVaultStore.getState().setError(null)
          }}
          className="px-4 py-2.5 bg-[var(--accent)] hover:opacity-90 text-white rounded-lg text-sm transition-opacity cursor-pointer"
        >
          Reconfigurar vault
        </button>
      </div>
    )
  }

  if (!config) return <OnboardingScreen />

  return <MainLayout />
}
