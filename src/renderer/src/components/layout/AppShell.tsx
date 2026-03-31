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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#888', fontFamily: 'monospace' }}>
        Carregando...
      </div>
    )
  }

  if (error && !config) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'monospace', gap: 16 }}>
        <p style={{ color: '#f87171' }}>{error}</p>
        <button
          onClick={() => { useVaultStore.getState().clearVault(); useVaultStore.getState().setError(null) }}
          style={{ padding: '10px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace' }}
        >
          Reconfigurar vault
        </button>
      </div>
    )
  }

  if (!config) return <OnboardingScreen />

  return <MainLayout />
}
