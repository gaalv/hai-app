import { useEffect, useState } from 'react'
import { useEditorStore } from '../../stores/editor.store'
import { useVaultStore } from '../../stores/vault.store'

interface Commit {
  sha: string
  message: string
  author: string
  date: string
}

interface Props {
  onClose: () => void
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function VersionHistory({ onClose }: Props): JSX.Element {
  const activeNote = useEditorStore((s) => s.activeNote)
  const setContent = useEditorStore((s) => s.setContent)
  const vaultConfig = useVaultStore((s) => s.config)

  const [commits, setCommits] = useState<Commit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSha, setSelectedSha] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const relativePath = activeNote && vaultConfig
    ? activeNote.path.replace(vaultConfig.path + '/', '')
    : null

  useEffect(() => {
    if (!relativePath) return
    let cancelled = false

    setCommits([])
    setSelectedSha(null)
    setPreviewContent(null)
    setLoading(true)
    setError(null)

    window.electronAPI.history.listCommits(relativePath)
      .then((result) => {
        if (!cancelled) {
          setCommits(result)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          setError(msg.includes('Sync não configurado') || msg.includes('Token não encontrado')
            ? 'Configure o sync com GitHub para ver o histórico.'
            : msg)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [relativePath])

  async function handleSelectCommit(sha: string): Promise<void> {
    if (!relativePath) return
    setSelectedSha(sha)
    setPreviewContent(null)
    setPreviewLoading(true)

    try {
      const content = await window.electronAPI.history.getFileAtCommit(sha, relativePath)
      setPreviewContent(content)
    } catch (err) {
      setPreviewContent(`Erro ao carregar versão: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setPreviewLoading(false)
    }
  }

  function handleRestore(): void {
    if (previewContent !== null) {
      setContent(previewContent)
      onClose()
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Histórico</span>
        <button
          className="text-[var(--text-3)] hover:text-[var(--text-2)] cursor-pointer text-xs"
          onClick={onClose}
        >✕</button>
      </div>

      {/* Commit list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className="flex items-center justify-center h-16">
            <span className="text-xs text-[var(--text-4)]">Carregando...</span>
          </div>
        )}

        {error && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-[var(--text-4)] leading-relaxed">{error}</p>
          </div>
        )}

        {!loading && !error && commits.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-[var(--text-4)]">Nenhum commit encontrado para esta nota.</p>
          </div>
        )}

        {!loading && commits.length > 0 && (
          <ul className="py-1">
            {commits.map((c) => (
              <li key={c.sha}>
                <button
                  className={`w-full text-left px-3 py-2 transition-colors cursor-pointer ${
                    selectedSha === c.sha
                      ? 'bg-[var(--accent-dim)] border-l-2 border-[var(--accent)]'
                      : 'hover:bg-[var(--surface-2)]'
                  }`}
                  onClick={() => handleSelectCommit(c.sha)}
                >
                  <p className="text-xs text-[var(--text-2)] truncate">{c.message.split('\n')[0]}</p>
                  <p className="text-[11px] text-[var(--text-4)] mt-0.5">{c.author} · {formatDate(c.date)}</p>
                  <p className="text-[10px] text-[var(--text-4)] font-mono mt-0.5 opacity-60">{c.sha.slice(0, 7)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Preview panel */}
      {selectedSha && (
        <div className="border-t border-[var(--border)] flex flex-col shrink-0 max-h-[40%]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--surface-2)] shrink-0">
            <span className="text-[11px] text-[var(--text-3)]">Preview</span>
            {previewContent !== null && (
              <button
                className="px-2 py-0.5 text-[11px] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)] rounded cursor-pointer hover:opacity-80"
                onClick={handleRestore}
              >
                Restaurar
              </button>
            )}
          </div>
          <div className="overflow-auto flex-1 p-2">
            {previewLoading && (
              <p className="text-xs text-[var(--text-4)] px-1">Carregando...</p>
            )}
            {!previewLoading && previewContent !== null && (
              <pre className="text-[11px] text-[var(--text-3)] font-mono whitespace-pre-wrap leading-relaxed">
                {previewContent.slice(0, 2000)}{previewContent.length > 2000 ? '\n...' : ''}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
