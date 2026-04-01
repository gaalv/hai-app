import { useState, useEffect, useMemo, useCallback } from 'react'
import { useEditorStore } from '../../stores/editor.store'

interface NoteWithDate {
  path: string
  title: string
  dueDate: string
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function parseFrontmatter(content: string): { title: string; dueDate?: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return { title: 'Sem título' }
  const fm = match[1]
  const title = fm.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? 'Sem título'
  const dueDate = fm.match(/^dueDate:\s*(.+)$/m)?.[1]?.trim()
  return { title, dueDate }
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CalendarPanel(): JSX.Element {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(toDateKey(new Date()))
  const [notes, setNotes] = useState<NoteWithDate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Load notes with dueDate
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    async function loadNotes(): Promise<void> {
      try {
        const vault = await window.electronAPI.vault.load()
        if (!vault || cancelled) return
        const allFiles = await window.electronAPI.notes.listAll(vault.path)
        const notesWithDates: NoteWithDate[] = []

        const flatFiles = flattenFiles(allFiles)
        for (const filePath of flatFiles) {
          try {
            const content = await window.electronAPI.notes.read(filePath)
            const fm = parseFrontmatter(content)
            if (fm.dueDate) {
              notesWithDates.push({ path: filePath, title: fm.title, dueDate: fm.dueDate })
            }
          } catch { /* skip unreadable */ }
        }

        if (!cancelled) setNotes(notesWithDates)
      } catch { /* ignore */ }
      if (!cancelled) setIsLoading(false)
    }

    loadNotes()
    return () => { cancelled = true }
  }, [])

  // Map dueDate → notes for quick lookup
  const notesByDate = useMemo(() => {
    const map: Record<string, NoteWithDate[]> = {}
    for (const n of notes) {
      const key = n.dueDate.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(n)
    }
    return map
  }, [notes])

  const selectedNotes = selectedDay ? (notesByDate[selectedDay] ?? []) : []

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = toDateKey(new Date())

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(new Date(year, month - 1, 1))
  }, [year, month])

  const handleNextMonth = useCallback(() => {
    setCurrentDate(new Date(year, month + 1, 1))
  }, [year, month])

  const handleOpenNote = useCallback((path: string) => {
    useEditorStore.getState().openNote(path)
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b-[0.5px] border-[var(--app-border)] shrink-0">
        <button
          onClick={handlePrevMonth}
          className="w-6 h-6 flex items-center justify-center rounded text-[var(--app-text-3)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)] transition-colors cursor-pointer bg-transparent border-none"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="text-[11.5px] font-medium text-[var(--app-text-1)]">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={handleNextMonth}
          className="w-6 h-6 flex items-center justify-center rounded text-[var(--app-text-3)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)] transition-colors cursor-pointer bg-transparent border-none"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="px-2 pt-2 pb-1 shrink-0">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="text-center text-[9px] text-[var(--app-text-3)] font-medium py-0.5">
              {wd}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-0">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = dateKey === todayKey
            const isSelected = dateKey === selectedDay
            const hasNotes = !!notesByDate[dateKey]

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                className={`relative w-full aspect-square flex items-center justify-center text-[11px] rounded-md cursor-pointer transition-colors border-none bg-transparent p-0 ${
                  isSelected
                    ? 'bg-[var(--app-accent)] text-white font-medium'
                    : isToday
                      ? 'bg-[var(--app-accent-dim)] text-[var(--app-accent)] font-medium'
                      : 'text-[var(--app-text-2)] hover:bg-[var(--app-hover)]'
                }`}
              >
                {day}
                {hasNotes && !isSelected && (
                  <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-[var(--app-accent)]" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day notes */}
      <div className="flex-1 overflow-y-auto border-t-[0.5px] border-[var(--app-border)]">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-[var(--app-accent)] animate-spin" />
          </div>
        ) : selectedDay ? (
          <>
            <div className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-[0.07em] text-[var(--app-text-3)] font-medium">
              {selectedNotes.length > 0
                ? `${selectedNotes.length} nota${selectedNotes.length > 1 ? 's' : ''} em ${formatDisplayDate(selectedDay)}`
                : `Nenhuma nota em ${formatDisplayDate(selectedDay)}`
              }
            </div>
            {selectedNotes.map((note) => (
              <div
                key={note.path}
                onClick={() => handleOpenNote(note.path)}
                className="flex items-center gap-2 mx-2 my-0.5 px-2.5 py-2 rounded-[var(--app-radius)] cursor-pointer hover:bg-[var(--app-hover)] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="text-[var(--app-text-3)] shrink-0">
                  <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span className="text-[11.5px] text-[var(--app-text-1)] truncate">{note.title}</span>
              </div>
            ))}
          </>
        ) : (
          <div className="flex items-center justify-center py-6 text-[11px] text-[var(--app-text-3)]">
            Selecione um dia
          </div>
        )}
      </div>
    </div>
  )
}

function formatDisplayDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number)
  return `${d} de ${MONTHS[m - 1]}`
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileNode[]
}

function flattenFiles(nodes: FileNode[]): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    if (node.type === 'file' && node.name.endsWith('.md')) {
      paths.push(node.path)
    }
    if (node.children) {
      paths.push(...flattenFiles(node.children))
    }
  }
  return paths
}
