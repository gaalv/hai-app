import { useSyncStore } from '../../stores/sync.store'
import { syncService } from '../../services/sync'

export function ConflictModal(): JSX.Element | null {
  const conflicts = useSyncStore((s) => s.conflicts)
  if (conflicts.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
      <div className="bg-[var(--surface)] border border-red-400/50 rounded-xl p-7 w-[480px] max-h-[80vh] flex flex-col">
        <h2 className="text-base font-semibold text-red-400 mb-1">Conflitos de sincronização</h2>
        <p className="text-xs text-[var(--text-3)] mb-4">Escolha qual versão manter para cada arquivo:</p>

        <div className="overflow-auto flex-1 flex flex-col gap-2">
          {conflicts.map((conflict) => (
            <div key={conflict.path} className="flex items-center justify-between px-3 py-2.5 bg-[var(--surface-2)] rounded-lg gap-3">
              <span className="text-xs text-[var(--text)] overflow-hidden text-ellipsis whitespace-nowrap flex-1">{conflict.path}</span>
              <div className="flex gap-1.5 shrink-0">
                <button
                  className="px-2.5 py-1 bg-green-400/10 text-green-400 border border-green-400/20 rounded cursor-pointer text-[11px] hover:bg-green-400/20 transition-colors"
                  onClick={() => syncService.resolveConflict(conflict.path, 'local')}
                >
                  Manter local
                </button>
                <button
                  className="px-2.5 py-1 bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded cursor-pointer text-[11px] hover:bg-blue-400/20 transition-colors"
                  onClick={() => syncService.resolveConflict(conflict.path, 'remote')}
                >
                  Usar remoto
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          className="mt-4 py-2 bg-transparent text-[var(--text-3)] border border-[var(--border-2)] rounded-lg cursor-pointer text-xs hover:text-[var(--text-2)] transition-colors"
          onClick={() => useSyncStore.getState().setConflicts([])}
        >
          Cancelar pull
        </button>
      </div>
    </div>
  )
}
