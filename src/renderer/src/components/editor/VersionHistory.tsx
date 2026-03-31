import { useEffect, useState } from 'react'
import type { CommitEntry } from '../../types/electron'

interface Props {
  relativePath: string
  onRestore: (content: string) => void
  onClose: () => void
}

export function VersionHistory({ relativePath, onRestore, onClose }: Props): JSX.Element {
  const [commits, setCommits] = useState<CommitEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CommitEntry | null>(null)
  const [diff, setDiff] = useState<{ before: string; after: string } | null>(null)

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true)
      const history = await window.electronAPI.sync.getHistory(relativePath)
      setCommits(history)
      setLoading(false)
    }
    load()
  }, [relativePath])

  async function handleSelectCommit(commit: CommitEntry, index: number): Promise<void> {
    setSelected(commit)
    if (index < commits.length - 1) {
      const d = await window.electronAPI.sync.getDiff(
        relativePath,
        commits[index + 1].oid,
        commit.oid
      )
      setDiff(d)
    } else {
      setDiff(null)
    }
  }

  async function handleRestore(): Promise<void> {
    if (!selected) return
    if (!confirm('Restaurar esta versão? As mudanças atuais não salvas serão perdidas.')) return
    const content = await window.electronAPI.sync.restoreVersion(relativePath, selected.oid)
    onRestore(content)
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Histórico</span>
        <button className="text-[var(--text-3)] hover:text-[var(--text-2)] cursor-pointer text-xs" onClick={onClose}>✕</button>
      </div>

      {loading ? (
        <p className="px-3 py-4 text-xs text-[var(--text-4)]">Carregando...</p>
      ) : commits.length === 0 ? (
        <div className="px-3 py-4 text-center">
          <p className="text-xs text-[var(--text-4)]">Nenhum commit ainda</p>
          <p className="text-xs text-[var(--text-4)] mt-1 opacity-60">Faça um sync para ver o histórico</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {commits.map((c, i) => (
            <div
              key={c.oid}
              className={`px-3 py-2.5 cursor-pointer border-b border-[var(--border)] transition-colors ${
                selected?.oid === c.oid ? 'bg-[var(--accent-dim)]' : 'hover:bg-[var(--surface-2)]'
              }`}
              onClick={() => handleSelectCommit(c, i)}
            >
              <p className="text-xs text-[var(--text)] truncate">{c.message}</p>
              <p className="text-[10px] text-[var(--text-4)] mt-0.5">
                {new Date(c.timestamp).toLocaleString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Selected commit actions */}
      {selected && (
        <div className="border-t border-[var(--border)] p-3 shrink-0">
          {diff && (
            <div className="mb-3 text-[10px] bg-[var(--surface-2)] rounded p-2 max-h-32 overflow-auto">
              <p className="text-[var(--text-3)] mb-1">Diff:</p>
              {diff.after.split('\n').map((line, i) => {
                const beforeLine = diff.before.split('\n')[i] ?? ''
                const changed = line !== beforeLine
                return (
                  <div key={i} className={changed ? 'text-green-400' : 'text-[var(--text-4)]'}>
                    {line || ' '}
                  </div>
                )
              })}
            </div>
          )}
          <button
            className="w-full py-2 bg-[var(--accent)] text-white rounded-lg text-xs cursor-pointer hover:opacity-90 transition-opacity"
            onClick={handleRestore}
          >
            Restaurar esta versão
          </button>
        </div>
      )}
    </div>
  )
}
