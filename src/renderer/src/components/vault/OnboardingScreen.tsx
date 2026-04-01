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

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] titlebar-drag font-sans">
      <div className="titlebar-no-drag w-[380px] flex flex-col gap-8">
        {/* Logo */}
        <div className="text-center">
          <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">hai</span>
          <p className="text-[11px] text-[var(--text-3)] mt-1">escrever, em tupi guaraní</p>
        </div>

        {/* Card */}
        <div className="bg-[var(--surface)] border border-[var(--border-2)] rounded-xl p-6 flex flex-col gap-4">
          <div>
            <p className="text-[13px] font-medium text-[var(--text)] mb-0.5">Abrir vault</p>
            <p className="text-[12px] text-[var(--text-3)]">
              Selecione uma pasta existente ou crie um novo vault de notas.
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-[11px] bg-red-400/8 border border-red-400/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              className="w-full px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[13px] font-medium disabled:opacity-40 cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity"
              onClick={handleSelectFolder}
              disabled={isLoading}
            >
              {isLoading ? 'Abrindo...' : 'Selecionar pasta'}
            </button>

            {!creatingNew ? (
              <button
                className="w-full px-4 py-2 bg-transparent text-[var(--text-2)] border border-[var(--border-2)] hover:border-[var(--text-3)] hover:text-[var(--text)] rounded-lg text-[13px] disabled:opacity-40 cursor-pointer transition-colors"
                onClick={() => setCreatingNew(true)}
                disabled={isLoading}
              >
                Criar novo vault
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  className="w-full px-3 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border-2)] focus:border-[var(--accent)] rounded-lg text-[13px] outline-none transition-colors placeholder:text-[var(--text-3)]"
                  placeholder="Nome do vault"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateVault()}
                  autoFocus
                />
                <button
                  className="w-full px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[13px] font-medium disabled:opacity-40 cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity"
                  onClick={handleCreateVault}
                  disabled={isLoading || !newName.trim()}
                >
                  Criar vault
                </button>
                <button
                  className="w-full px-4 py-2 bg-transparent text-[var(--text-3)] hover:text-[var(--text-2)] rounded-lg text-[13px] cursor-pointer transition-colors"
                  onClick={() => setCreatingNew(false)}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
