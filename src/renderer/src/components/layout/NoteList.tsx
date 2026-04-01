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

  const groups = groupNotesByDate(notes)

  return (
    <div
      className="flex flex-col shrink-0 overflow-hidden"
      style={{
        width: 268,
        background: 'var(--app-list)',
        borderRight: '0.5px solid var(--app-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: '14px 14px 10px', borderBottom: '0.5px solid var(--app-border)' }}
      >
        <div className="flex items-center" style={{ gap: 7, fontSize: 13, fontWeight: 500, color: 'var(--app-text-1)' }}>
          {activeNb && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: activeNb.color || '#7C6EF5',
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
            {activeNb?.name || 'Notas'}
          </span>
        </div>
        <div className="flex" style={{ gap: 2 }}>
          <IconBtn title="Nova nota" onClick={handleNewNote} disabled={!activeNotebook}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </IconBtn>
        </div>
      </div>

      {/* Scrollable list */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: '6px 0' }}
      >
        {isLoading && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.1)',
                borderTopColor: 'var(--app-accent)',
                animation: 'spin 0.7s linear infinite',
                margin: '0 auto',
              }}
            />
          </div>
        )}

        {!isLoading && !activeNotebook && (
          <div style={{ padding: '20px 14px', fontSize: 12, color: 'var(--app-text-3)' }}>
            Selecione um notebook para ver as notas.
          </div>
        )}

        {!isLoading && activeNotebook && notes.length === 0 && (
          <div style={{ padding: '20px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--app-text-3)', marginBottom: 10 }}>
              Nenhuma nota ainda.
            </div>
            <div
              onClick={handleNewNote}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: 'var(--app-accent)',
                cursor: 'pointer',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Criar primeira nota
            </div>
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
      style={{
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--app-text-3)',
        padding: '8px 20px 4px',
        fontWeight: 500,
      }}
    >
      {label}
    </div>
  )
}

function NoteItem({
  note,
  selected,
  onClick,
}: {
  note: NoteListItem
  selected: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <div
      className="cursor-pointer"
      onClick={onClick}
      style={{
        padding: '10px 14px',
        transition: 'background 0.1s',
        borderLeft: selected ? '2px solid var(--app-accent)' : '2px solid transparent',
        margin: '1px 6px',
        borderRadius: 'var(--app-radius)',
        background: selected ? 'var(--app-selected)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--app-hover)'
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--app-text-1)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 3,
        }}
      >
        {note.title || 'Sem título'}
      </div>
      {note.preview && (
        <div
          style={{
            fontSize: 11.5,
            color: 'var(--app-text-3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 5,
            lineHeight: 1.4,
          }}
        >
          {note.preview}
        </div>
      )}
      <div className="flex items-center" style={{ gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--app-text-3)' }}>{formatDate(note.updated)}</span>
        {note.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 10,
              color: 'var(--app-text-3)',
              background: 'var(--app-tag-bg)',
              padding: '1px 6px',
              borderRadius: 100,
              border: '0.5px solid var(--app-border)',
            }}
          >
            #{tag}
          </span>
        ))}
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
      className="flex items-center justify-center cursor-pointer"
      title={title}
      onClick={disabled ? undefined : onClick}
      style={{
        width: 26,
        height: 26,
        borderRadius: 5,
        opacity: disabled ? 0.2 : 0.4,
        transition: 'background 0.12s, opacity 0.12s',
        color: 'var(--app-text-1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'var(--app-hover)'
          el.style.opacity = '0.9'
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'transparent'
        el.style.opacity = disabled ? '0.2' : '0.4'
      }}
    >
      {children}
    </div>
  )
}
