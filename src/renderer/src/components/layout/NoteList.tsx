import { useManifestStore } from '../../stores/manifest.store'
import { useNotesStore } from '../../stores/notes.store'
import { useEditorStore } from '../../stores/editor.store'
import type { NoteListItem } from '../../types/notes'

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Ontem'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    }
  } catch {
    return ''
  }
}

function groupNotesByDate(notes: NoteListItem[]): Array<{ label: string; notes: NoteListItem[] }> {
  const today: NoteListItem[] = []
  const yesterday: NoteListItem[] = []
  const thisWeek: NoteListItem[] = []
  const older: NoteListItem[] = []

  const now = new Date()
  for (const note of notes) {
    const date = new Date(note.updated)
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) today.push(note)
    else if (diffDays === 1) yesterday.push(note)
    else if (diffDays < 7) thisWeek.push(note)
    else older.push(note)
  }

  const groups: Array<{ label: string; notes: NoteListItem[] }> = []
  if (today.length > 0) groups.push({ label: 'Hoje', notes: today })
  if (yesterday.length > 0) groups.push({ label: 'Ontem', notes: yesterday })
  if (thisWeek.length > 0) groups.push({ label: 'Esta semana', notes: thisWeek })
  if (older.length > 0) groups.push({ label: 'Mais antigas', notes: older })
  return groups
}

export function NoteList(): JSX.Element {
  const { notebooks, activeNotebook } = useManifestStore()
  const pinned = useManifestStore((s) => s.pinned)
  const pinNote = useManifestStore((s) => s.pinNote)
  const unpinNote = useManifestStore((s) => s.unpinNote)
  const { notes, selectedNotePath, isLoading, createNote, selectNote } = useNotesStore()
  const { openNote } = useEditorStore()

  const activeNb = notebooks.find((n) => n.id === activeNotebook)

  async function handleNewNote(): Promise<void> {
    if (!activeNotebook) return
    const note = await createNote(activeNotebook)
    openNote(note.absolutePath)
  }

  function handleNoteClick(note: NoteListItem): void {
    selectNote(note.absolutePath)
    openNote(note.absolutePath)
  }

  const pinnedNotes = notes.filter((n) => pinned.includes(n.relativePath))
  const unpinnedNotes = notes.filter((n) => !pinned.includes(n.relativePath))
  const groups = groupNotesByDate(unpinnedNotes)

  return (
    <div
      className="flex flex-col shrink-0 overflow-hidden w-[268px] bg-[var(--app-list)] border-r-[0.5px] border-r-[var(--app-border)]"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0 px-[14px] pt-[14px] pb-[10px] border-b-[0.5px] border-b-[var(--app-border)]"
      >
        <div className="flex items-center gap-[7px] text-[13px] font-medium text-[var(--app-text-1)]">
          {activeNb && (
            <span
              className="w-2 h-2 rounded-full shrink-0 inline-block"
              style={{ background: activeNb.color || '#7C6EF5' }}
            />
          )}
          <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[140px]">
            {activeNb?.name || 'Notas'}
          </span>
        </div>
        <div className="flex gap-[2px]">
          <IconBtn title="Nova nota" onClick={handleNewNote} disabled={!activeNotebook}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </IconBtn>
        </div>
      </div>

      {/* Scrollable list */}
      <div
        className="flex-1 overflow-y-auto py-[6px]"
      >
        {isLoading && (
          <div className="p-5 text-center">
            <div
              className="w-4 h-4 rounded-full border-[1.5px] border-[rgba(255,255,255,0.1)] border-t-[var(--app-accent)] animate-[spin_0.7s_linear_infinite] mx-auto"
            />
          </div>
        )}

        {!isLoading && !activeNotebook && (
          <div className="px-[14px] py-5 text-[12px] text-[var(--app-text-3)]">
            Selecione um notebook para ver as notas.
          </div>
        )}

        {!isLoading && activeNotebook && notes.length === 0 && (
          <div className="px-[14px] py-5">
            <div className="text-[12px] text-[var(--app-text-3)] mb-[10px]">
              Nenhuma nota ainda.
            </div>
            <div
              onClick={handleNewNote}
              className="inline-flex items-center gap-[5px] text-[12px] text-[var(--app-accent)] cursor-pointer"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Criar primeira nota
            </div>
          </div>
        )}

        {!isLoading && pinnedNotes.length > 0 && (
          <div>
            <NoteGroupLabel label="📌 Fixados" />
            {pinnedNotes.map((note) => (
              <NoteItem
                key={note.absolutePath}
                note={note}
                selected={selectedNotePath === note.absolutePath}
                onClick={() => handleNoteClick(note)}
                isPinned
                onTogglePin={() => unpinNote(note.relativePath)}
              />
            ))}
          </div>
        )}

        {!isLoading && groups.map((group) => (
          <div key={group.label}>
            <NoteGroupLabel label={group.label} />
            {group.notes.map((note) => (
              <NoteItem
                key={note.absolutePath}
                note={note}
                selected={selectedNotePath === note.absolutePath}
                onClick={() => handleNoteClick(note)}
                isPinned={false}
                onTogglePin={() => pinNote(note.relativePath)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function NoteGroupLabel({ label }: { label: string }): JSX.Element {
  return (
    <div
      className="text-[10px] uppercase tracking-[0.07em] text-[var(--app-text-3)] px-5 pt-2 pb-1 font-medium"
    >
      {label}
    </div>
  )
}

function PinIcon({ filled }: { filled: boolean }): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M7.5 1.5L10.5 4.5L7.5 7.5L6.75 6.75L8.25 5.25L6.75 3.75L5.25 5.25L4.5 4.5L7.5 1.5Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
      <line x1="4.5" y1="7.5" x2="1.5" y2="10.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

function NoteItem({
  note,
  selected,
  onClick,
  isPinned,
  onTogglePin,
}: {
  note: NoteListItem
  selected: boolean
  onClick: () => void
  isPinned: boolean
  onTogglePin: () => void
}): JSX.Element {
  return (
    <div
      className={`group cursor-pointer px-[14px] py-[10px] transition-colors duration-100 mx-[6px] my-[1px] rounded-[var(--app-radius)] ${selected ? 'border-l-2 border-l-[var(--app-accent)] bg-[var(--app-selected)]' : 'border-l-2 border-l-transparent hover:bg-[var(--app-hover)]'}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div
            className="text-[13px] font-medium text-[var(--app-text-1)] whitespace-nowrap overflow-hidden text-ellipsis mb-[3px]"
          >
            {note.title || 'Sem título'}
          </div>
          {note.preview && (
            <div
              className="text-[11.5px] text-[var(--app-text-3)] whitespace-nowrap overflow-hidden text-ellipsis mb-[5px] leading-[1.4]"
            >
              {note.preview}
            </div>
          )}
          <div className="flex items-center gap-[6px]">
            <span className="text-[11px] text-[var(--app-text-3)]">{formatDate(note.updated)}</span>
            {isPinned && (
              <span className="text-[var(--app-accent)]">
                <PinIcon filled />
              </span>
            )}
            {note.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-[var(--app-text-3)] bg-[var(--app-tag-bg)] px-[6px] py-[1px] rounded-full border-[0.5px] border-[var(--app-border)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <div
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 shrink-0 rounded-[4px] transition-opacity duration-100 cursor-pointer hover:bg-[var(--app-hover)]"
          style={{ color: isPinned ? 'var(--app-accent)' : 'var(--app-text-3)' }}
          title={isPinned ? 'Desafixar' : 'Fixar'}
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin()
          }}
        >
          <PinIcon filled={isPinned} />
        </div>
      </div>
    </div>
  )
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  title?: string
  onClick?: () => void
  disabled?: boolean
}): JSX.Element {
  return (
    <div
      className={`flex items-center justify-center w-[26px] h-[26px] rounded-[5px] text-[var(--app-text-1)] transition-all duration-[120ms] ${disabled ? 'opacity-20 cursor-not-allowed' : 'opacity-40 cursor-pointer hover:bg-[var(--app-hover)] hover:opacity-90'}`}
      title={title}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </div>
  )
}
