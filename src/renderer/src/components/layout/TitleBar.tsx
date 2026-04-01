interface TitleBarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  calendarOpen: boolean
  onToggleCalendar: () => void
}

export function TitleBar({
  sidebarOpen,
  onToggleSidebar,
  calendarOpen,
  onToggleCalendar,
}: TitleBarProps): JSX.Element {
  return (
    <div className="h-[38px] shrink-0 flex items-center bg-[var(--app-rail)] border-b-[0.5px] border-b-[var(--app-border)] titlebar-drag select-none">
      {/* Left: traffic light space + sidebar toggle */}
      <div className="flex items-center pl-[78px] pr-2 shrink-0 titlebar-no-drag">
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center w-7 h-7 rounded-[var(--app-radius)] text-[var(--app-text-3)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-2)] transition-colors cursor-pointer border-none bg-transparent p-0"
          title={sidebarOpen ? 'Recolher barra lateral (⌘\\)' : 'Expandir barra lateral (⌘\\)'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {sidebarOpen ? (
              <>
                <rect x="1.5" y="2" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <line x1="5.5" y1="2" x2="5.5" y2="14" stroke="currentColor" strokeWidth="1.2" />
              </>
            ) : (
              <>
                <rect x="1.5" y="2" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <line x1="5.5" y1="2" x2="5.5" y2="14" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Spacer for drag area */}
      <div className="flex-1" />

      {/* Right: calendar toggle */}
      <div className="flex items-center pr-3 pl-2 shrink-0 titlebar-no-drag">
        <button
          onClick={onToggleCalendar}
          className={`flex items-center justify-center w-7 h-7 rounded-[var(--app-radius)] transition-colors cursor-pointer border-none bg-transparent p-0 ${
            calendarOpen
              ? 'bg-[var(--app-accent-dim)] text-[var(--app-accent)]'
              : 'text-[var(--app-text-3)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-2)]'
          }`}
          title={calendarOpen ? 'Fechar calendário' : 'Abrir calendário'}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="6.5" x2="14" y2="6.5" stroke="currentColor" strokeWidth="1.1" />
            <line x1="5" y1="1.5" x2="5" y2="4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="11" y1="1.5" x2="11" y2="4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="5.5" cy="9.5" r="0.8" fill="currentColor" />
            <circle cx="8" cy="9.5" r="0.8" fill="currentColor" />
            <circle cx="10.5" cy="9.5" r="0.8" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  )
}
