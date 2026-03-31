import { useState } from 'react'
import { vaultService } from '../../services/vault'
import { useVaultStore } from '../../stores/vault.store'

export function OnboardingScreen(): JSX.Element {
  const error = useVaultStore((s) => s.error)
  const [isLoading, setIsLoading] = useState(false)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')

  async function handleSelectFolder(): Promise<void> {
    setIsLoading(true)
    try {
      await vaultService.openPicker()
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateVault(): Promise<void> {
    if (!newName.trim()) return
    setIsLoading(true)
    try {
      const parentConfig = await window.electronAPI.vault.openPicker()
      if (!parentConfig) return
      await vaultService.create(newName.trim(), parentConfig.path)
    } finally {
      setIsLoading(false)
      setCreatingNew(false)
    }
  }

  const inputCls = "w-full px-3 py-2.5 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border-2)] focus:border-[var(--accent)] rounded-lg text-sm outline-none transition-colors"
  const primaryBtn = "w-full px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm disabled:opacity-50 cursor-pointer hover:opacity-90 transition-opacity"
  const secondaryBtn = "w-full px-4 py-2.5 bg-transparent text-[var(--text-2)] border border-[var(--border-2)] hover:border-[var(--text-3)] rounded-lg text-sm disabled:opacity-50 cursor-pointer transition-colors"

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] titlebar-drag">
      <div className="titlebar-no-drag bg-[var(--surface)] border border-[var(--border-2)] rounded-xl p-10 w-[400px] text-center shadow-xl">
        <h1 className="text-3xl font-bold text-[var(--accent)] mb-1 tracking-tight">hai</h1>
        <p className="text-xs text-[var(--text-3)] mb-1">escrever, em tupi guaraní</p>
        <p className="text-sm text-[var(--text-3)] mb-7 mt-3">
          Selecione uma pasta para usar como vault de notas.
        </p>

        {error && (
          <p className="text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg mb-4">{error}</p>
        )}

        <div className="flex flex-col gap-2.5">
          <button className={primaryBtn} onClick={handleSelectFolder} disabled={isLoading}>
            {isLoading ? 'Abrindo...' : 'Selecionar pasta'}
          </button>

          {!creatingNew ? (
            <button className={secondaryBtn} onClick={() => setCreatingNew(true)} disabled={isLoading}>
              Criar novo vault
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                className={inputCls}
                placeholder="Nome do vault"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateVault()}
                autoFocus
              />
              <button className={primaryBtn} onClick={handleCreateVault} disabled={isLoading || !newName.trim()}>
                Criar
              </button>
              <button className={secondaryBtn} onClick={() => setCreatingNew(false)}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
