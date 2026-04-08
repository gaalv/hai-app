import { useState, useMemo, useCallback } from 'react'
import { useManifestStore } from '../../stores/manifest.store'
import { useEditorStore } from '../../stores/editor.store'
import { useVaultStore } from '../../stores/vault.store'
import { useNotesStore } from '../../stores/notes.store'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDisplayDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number)
  return `${d} de ${MONTHS[m - 1]}`
}

export function CalendarPanel(): JSX.Element {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(toDateKey(new Date()))

  const { calendarLinks, calendarLink, calendarUnlink } = useManifestStore()
  const activeNote = useEditorStore((s) => s.activeNote)
  const openNote = useEditorStore((s) => s.openNote)
  const vaultPath = useVaultStore((s) => s.config?.path)
  const notes = useNotesStore((s) => s.notes)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // relative path of the active note
  const activeRelPath = useMemo(() => {
    if (!activeNote || !vaultPath) return null
    const p = activeNote.path
    return p.startsWith(vaultPath + '/') ? p.slice(vaultPath.length + 1) : p
  }, [activeNote?.path, vaultPath])

  // Lookup note title by relative path (from notes list or by parsing path)
  const getTitleForPath = useCallback((relPath: string): string => {
    const found = notes.find((n) => n.relativePath === relPath)
    if (found) return found.title
    return relPath.split('/').pop()?.replace(/\.md$/, '') ?? relPath
  }, [notes])

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(new Date(year, month - 1, 1))
  }, [year, month])

  const handleNextMonth = useCallback(() => {
    setCurrentDate(new Date(year, month + 1, 1))
  }, [year, month])

  const handleDayClick = useCallback((dateKey: string) => {
    setSelectedDay((prev) => prev === dateKey ? null : dateKey)
  }, [])

  async function handleLink(): Promise<void> {
    if (!selectedDay || !activeRelPath) return
    await calendarLink(selectedDay, activeRelPath)
  }

  async function handleUnlink(relPath: string): Promise<void> {
    if (!selectedDay) return
    await calendarUnlink(selectedDay, relPath)
  }

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = toDateKey(new Date())

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  const selectedLinks = selectedDay ? (calendarLinks[selectedDay] ?? []) : []
  const activeAlreadyLinked = !!(selectedDay && activeRelPath && selectedLinks.includes(activeRelPath))

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
            const hasLinks = !!(calendarLinks[dateKey]?.length)

            return (
              <button
                key={dateKey}
                onClick={() => handleDayClick(dateKey)}
                className={`relative w-full aspect-square flex items-center justify-center text-[11px] rounded-md cursor-pointer transition-colors border-none bg-transparent p-0 ${
                  isSelected
                    ? 'bg-[var(--app-accent)] text-white font-medium'
                    : isToday
                      ? 'bg-[var(--app-accent-dim)] text-[var(--app-accent)] font-medium'
                      : 'text-[var(--app-text-2)] hover:bg-[var(--app-hover)]'
                }`}
              >
                {day}
                {hasLinks && !isSelected && (
                  <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-[var(--app-accent)]" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day content */}
      <div className="flex-1 overflow-y-auto border-t-[0.5px] border-[var(--app-border)]">
        {selectedDay ? (
          <>
            {/* Day header */}
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
              <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--app-text-3)] font-medium">
                {formatDisplayDate(selectedDay)}
                {selectedLinks.length > 0 && (
                  <span className="normal-case ml-1">({selectedLinks.length})</span>
                )}
              </span>

              {/* Link current note button */}
              {activeNote && (
                <button
                  onClick={handleLink}
                  disabled={activeAlreadyLinked}
                  title={activeAlreadyLinked ? 'Nota já vinculada' : 'Vincular nota atual'}
                  className={`flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded transition-colors cursor-pointer border-none ${
                    activeAlreadyLinked
                      ? 'text-[var(--app-text-3)] bg-transparent opacity-40 cursor-default'
                      : 'text-[var(--app-accent)] bg-[var(--app-accent-dim)] hover:opacity-80'
                  }`}
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M4.5 1v7M1 4.5h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Vincular
                </button>
              )}
            </div>

            {/* Linked notes list */}
            {selectedLinks.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-[var(--app-text-3)]">
                {activeNote
                  ? 'Nenhuma nota vinculada. Clique em "Vincular" para adicionar a nota atual.'
                  : 'Nenhuma nota vinculada a este dia.'
                }
              </div>
            ) : (
              <ul>
                {selectedLinks.map((relPath) => {
                  const title = getTitleForPath(relPath)
                  const isActive = relPath === activeRelPath
                  return (
                    <li key={relPath} className="group flex items-center gap-1 mx-2 my-0.5">
                      <div
                        onClick={() => {
                          if (vaultPath) openNote(`${vaultPath}/${relPath}`)
                        }}
                        className={`flex-1 flex items-center gap-2 px-2.5 py-[7px] rounded-[var(--app-radius)] cursor-pointer hover:bg-[var(--app-hover)] transition-colors min-w-0 ${
                          isActive ? 'text-[var(--app-accent)]' : ''
                        }`}
                      >
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" className="text-[var(--app-text-3)] shrink-0">
                          <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                          <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                          <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                        <span className="text-[11.5px] text-[var(--app-text-1)] truncate">{title}</span>
                      </div>
                      {/* Unlink button */}
                      <button
                        onClick={() => handleUnlink(relPath)}
                        title="Desvincular"
                        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 shrink-0 rounded text-[var(--app-text-3)] hover:text-[#F87171] hover:bg-[var(--app-hover)] transition-all cursor-pointer bg-transparent border-none"
                      >
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 1.5l6 6M7.5 1.5l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
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
