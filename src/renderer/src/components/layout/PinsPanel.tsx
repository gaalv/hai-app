import { useState, useEffect, useCallback } from 'react'
import { useManifestStore } from '../../stores/manifest.store'
import { useEditorStore } from '../../stores/editor.store'
import type { Notebook } from '../../types/manifest'

const CARDS_COUNT = 4
const DEFAULT_COLOR = '#7C6EF5'

interface PinnedNote {
  relativePath: string
  absolutePath: string
  title: string
  preview: string
  tags: string[]
  notebookId: string | undefined
  updated: string | undefined
}

function parseFrontmatter(raw: string): {
  title: string
  tags: string[]
  notebook: string | undefined
  updated: string | undefined
  content: string
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    const firstLine = raw.trim().split('\n')[0] || 'Sem título'
    return { title: firstLine.replace(/^#\s*/, ''), tags: [], notebook: undefined, updated: undefined, content: raw }
  }

  const yaml = match[1]
  const content = match[2]

  const getField = (field: string): string | undefined => {
    const m = yaml.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'))
    return m ? m[1].trim() : undefined
  }

  const title = getField('title') || 'Sem título'
  const updated = getField('updated')
  const notebook = getField('notebook')

  const tags: string[] = []
  const tagsBlock = yaml.match(/^tags:\s*\n((?:\s+-\s+.+\n?)*)/m)
  if (tagsBlock) {
    const items = tagsBlock[1].matchAll(/^\s+-\s+(.+)$/gm)
    for (const item of items) tags.push(item[1].trim())
  } else {
    const inlineTags = yaml.match(/^tags:\s*\[([^\]]*)\]/m)
    if (inlineTags) {
      inlineTags[1].split(',').forEach((t) => {
        const trimmed = t.trim().replace(/^['"]|['"]$/g, '')
        if (trimmed) tags.push(trimmed)
      })
    }
  }

  return { title, tags, notebook, updated, content }
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000)

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return days[date.getDay()]
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function getNotebookInfo(
  notebookId: string | undefined,
  notebooks: Notebook[]
): { name: string; color: string } {
  if (!notebookId) return { name: '', color: DEFAULT_COLOR }
  const nb = notebooks.find((n) => n.id === notebookId)
  return nb ? { name: nb.name, color: nb.color || DEFAULT_COLOR } : { name: '', color: DEFAULT_COLOR }
}

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="#F5A623">
    <path d="M6 1l1.35 2.76 3.05.44-2.2 2.15.52 3.04L6 8.1 3.28 9.39l.52-3.04L1.6 4.2l3.05-.44z" />
  </svg>
)

export function PinsPanel(): JSX.Element {
  const pinned = useManifestStore((s) => s.pinned)
  const notebooks = useManifestStore((s) => s.notebooks)
  const unpinNote = useManifestStore((s) => s.unpinNote)

  const [notes, setNotes] = useState<PinnedNote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadNotes(): Promise<void> {
      setIsLoading(true)
      try {
        const vault = await window.electronAPI.vault.load()
        if (!vault || cancelled) {
          setIsLoading(false)
          return
        }

        const loaded: PinnedNote[] = []
        for (const rel of pinned) {
          try {
            const abs = `${vault.path}/${rel}`
            const raw = await window.electronAPI.notes.read(abs)
            const fm = parseFrontmatter(raw)
            const preview = fm.content.trim().slice(0, 80).replace(/\n/g, ' ')
            loaded.push({
              relativePath: rel,
              absolutePath: abs,
              title: fm.title,
              preview: preview || 'Sem conteúdo',
              tags: fm.tags,
              notebookId: fm.notebook,
              updated: fm.updated,
            })
          } catch {
            // Note may have been deleted — skip silently
          }
        }

        if (!cancelled) setNotes(loaded)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadNotes()
    return () => {
      cancelled = true
    }
  }, [pinned])

  const handleOpen = useCallback((absolutePath: string) => {
    useEditorStore.getState().openNote(absolutePath)
  }, [])

  const handleUnpin = useCallback(
    (e: React.MouseEvent, relativePath: string) => {
      e.stopPropagation()
      unpinNote(relativePath)
    },
    [unpinNote]
  )

  const cardNotes = notes.slice(0, CARDS_COUNT)
  const listNotes = notes.slice(CARDS_COUNT)

  return (
    <div className="flex-1 flex flex-col bg-[var(--app-main)] overflow-hidden">
      {/* Header */}
      <div className="pt-[18px] px-[22px] pb-[14px] border-b-[0.5px] border-[var(--app-border)] flex items-center justify-between shrink-0">
        <div className="text-[15px] font-medium text-[var(--app-text-1)] tracking-[-0.3px] flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1.5l1.6 3.3 3.6.52-2.6 2.54.62 3.6L7 9.7l-3.22 1.77.62-3.6L1.8 5.32l3.6-.52z"
              fill="#F5A623"
              stroke="#F5A623"
              strokeWidth=".5"
              strokeLinejoin="round"
            />
          </svg>
          Favoritos
        </div>
        <div className="text-[11px] text-[var(--app-text-3)]">
          {pinned.length} {pinned.length === 1 ? 'nota fixada' : 'notas fixadas'}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-4 px-[22px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg
              className="animate-spin h-5 w-5 text-[var(--app-text-3)]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <svg width="24" height="24" viewBox="0 0 14 14" fill="none" className="opacity-30">
              <path
                d="M7 1.5l1.6 3.3 3.6.52-2.6 2.54.62 3.6L7 9.7l-3.22 1.77.62-3.6L1.8 5.32l3.6-.52z"
                fill="#F5A623"
                stroke="#F5A623"
                strokeWidth=".5"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-[13px] text-[var(--app-text-3)]">Nenhuma nota fixada</div>
            <div className="text-[11px] text-[var(--app-text-3)] opacity-60">
              Clique na estrela de uma nota para fixá-la aqui
            </div>
          </div>
        ) : (
          <>
            {/* Fixados group */}
            {cardNotes.length > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--app-text-3)] font-medium mb-2">
                  Fixados
                </div>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {cardNotes.map((note) => {
                    const nb = getNotebookInfo(note.notebookId, notebooks)
                    return (
                      <PinCardItem
                        key={note.relativePath}
                        note={note}
                        notebookName={nb.name}
                        notebookColor={nb.color}
                        onOpen={handleOpen}
                        onUnpin={handleUnpin}
                      />
                    )
                  })}
                </div>
              </>
            )}

            {/* Acesso rápido group */}
            {listNotes.length > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--app-text-3)] font-medium mb-2">
                  Acesso rápido
                </div>
                <div className="flex flex-col gap-[5px] mb-5">
                  {listNotes.map((note) => {
                    const nb = getNotebookInfo(note.notebookId, notebooks)
                    return (
                      <PinListItemRow
                        key={note.relativePath}
                        note={note}
                        notebookName={nb.name}
                        notebookColor={nb.color}
                        onOpen={handleOpen}
                        onUnpin={handleUnpin}
                      />
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PinCardItem({
  note,
  notebookName,
  notebookColor,
  onOpen,
  onUnpin,
}: {
  note: PinnedNote
  notebookName: string
  notebookColor: string
  onOpen: (path: string) => void
  onUnpin: (e: React.MouseEvent, path: string) => void
}): JSX.Element {
  return (
    <div
      className="bg-white/[0.03] border-[0.5px] border-[var(--app-border)] rounded-[10px] p-[14px] cursor-pointer transition-all duration-[120ms] relative hover:bg-white/[0.05] hover:border-[var(--app-border-mid)] hover:-translate-y-px"
      onClick={() => onOpen(note.absolutePath)}
    >
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[10px]"
        style={{ backgroundColor: notebookColor }}
      />

      {/* Star (unpin) */}
      <div
        className="absolute top-[10px] right-[10px] opacity-70 cursor-pointer transition-opacity duration-[120ms] hover:opacity-100"
        onClick={(e) => onUnpin(e, note.relativePath)}
      >
        <StarIcon />
      </div>

      {/* Notebook */}
      {notebookName && (
        <div className="flex items-center gap-[5px] text-[10.5px] text-[var(--app-text-3)] mb-2 mt-[2px]">
          <span
            className="w-[5px] h-[5px] rounded-full shrink-0 inline-block"
            style={{ backgroundColor: notebookColor }}
          />
          {notebookName}
        </div>
      )}

      {/* Title */}
      <div className="text-[13px] font-medium text-[var(--app-text-1)] mb-[6px] leading-[1.3] tracking-[-0.2px]">
        {note.title}
      </div>

      {/* Preview */}
      <div className="text-[11.5px] text-[var(--app-text-3)] leading-normal mb-[10px]">
        {note.preview}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-[6px] flex-wrap">
        {note.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] text-[var(--app-accent)] bg-[var(--app-accent-dim)] border-[0.5px] border-[rgba(124,110,245,0.2)] py-[2px] px-[7px] rounded-full"
          >
            # {tag}
          </span>
        ))}
        <span className="text-[10.5px] text-[var(--app-text-3)] ml-auto">
          {formatDate(note.updated)}
        </span>
      </div>
    </div>
  )
}

function PinListItemRow({
  note,
  notebookName,
  notebookColor,
  onOpen,
  onUnpin,
}: {
  note: PinnedNote
  notebookName: string
  notebookColor: string
  onOpen: (path: string) => void
  onUnpin: (e: React.MouseEvent, path: string) => void
}): JSX.Element {
  const meta = [notebookName, ...note.tags.map((t) => `# ${t}`)].filter(Boolean).join(' · ')

  return (
    <div
      className="flex items-center gap-[10px] py-[9px] px-3 bg-white/[0.03] border-[0.5px] border-[var(--app-border)] rounded-[var(--app-radius)] cursor-pointer transition-colors duration-100 hover:bg-[var(--app-hover)] hover:border-[var(--app-border-mid)]"
      onClick={() => onOpen(note.absolutePath)}
    >
      <div
        className="w-[7px] h-[7px] rounded-full shrink-0"
        style={{ backgroundColor: notebookColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium text-[var(--app-text-1)] whitespace-nowrap overflow-hidden text-ellipsis">
          {note.title}
        </div>
        {meta && <div className="text-[10.5px] text-[var(--app-text-3)]">{meta}</div>}
      </div>
      <div
        className="opacity-70 cursor-pointer transition-opacity duration-[120ms] hover:opacity-100 shrink-0"
        onClick={(e) => onUnpin(e, note.relativePath)}
      >
        <StarIcon />
      </div>
      <div className="text-[11px] text-[var(--app-text-3)] whitespace-nowrap">
        {formatDate(note.updated)}
      </div>
    </div>
  )
}
