import { useState, useCallback } from 'react'
import { TitleBar } from './TitleBar'
import { Rail } from './Rail'
import { Sidebar } from './Sidebar'
import { NoteList } from './NoteList'
import { EditorPanel } from './EditorPanel'
import { SearchPanel } from './SearchPanel'
import { TagsPanel } from './TagsPanel'
import { NotebooksPanel } from './NotebooksPanel'
import { StatusBar } from './StatusBar'
import { CalendarPanel } from '../calendar/CalendarPanel'
import { SettingsModal } from '../settings/SettingsModal'

type Tab = 'notes' | 'notebooks' | 'search' | 'tags'

interface AppLayoutProps {
  tab: Tab
  setTab: (tab: Tab) => void
}

export function AppLayout({ tab, setTab }: AppLayoutProps): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleToggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
  const handleToggleCalendar = useCallback(() => setCalendarOpen((v) => !v), [])
  const handleSearchClick = useCallback(() => setTab('search'), [setTab])
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--app-main)] text-[var(--app-text-1)] text-[13px] font-sans antialiased select-none">
      <TitleBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        calendarOpen={calendarOpen}
        onToggleCalendar={handleToggleCalendar}
        onSearchClick={handleSearchClick}
      />

      {/* Main content below titlebar */}
      <div className="flex flex-1 overflow-hidden">
        <Rail
          activeTab={tab}
          onTabChange={(t) => setTab(t as Tab)}
          onAvatarClick={handleOpenSettings}
          onSettingsClick={handleOpenSettings}
        />

        {/* Panel host */}
        <div className="flex flex-1 overflow-hidden">
          {tab === 'notes' && (
            <div className="flex flex-1 overflow-hidden">
              {sidebarOpen && <Sidebar />}
              <NoteList />
              <EditorPanel />
            </div>
          )}
          {tab === 'notebooks' && <NotebooksPanel />}
          {tab === 'search' && <SearchPanel />}
          {tab === 'tags' && <TagsPanel />}
        </div>

        {/* Calendar sidebar (right) */}
        {calendarOpen && (
          <div className="w-[240px] shrink-0 border-l-[0.5px] border-l-[var(--app-border)] bg-[var(--app-sidebar)] flex flex-col">
            <CalendarPanel />
          </div>
        )}
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Settings modal */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
