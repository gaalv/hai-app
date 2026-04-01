import { Rail } from './Rail'
import { Sidebar } from './Sidebar'
import { NoteList } from './NoteList'
import { EditorPanel } from './EditorPanel'
import { SearchPanel } from './SearchPanel'
import { TagsPanel } from './TagsPanel'
import { PinsPanel } from './PinsPanel'

type Tab = 'notebooks' | 'search' | 'tags' | 'pins'

interface AppLayoutProps {
  tab: Tab
  setTab: (tab: Tab) => void
  onLogout: () => void
}

export function AppLayout({ tab, setTab, onLogout }: AppLayoutProps): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--app-main)',
        color: 'var(--app-text-1)',
        fontSize: 13,
        fontFamily: 'var(--font-sans)',
        WebkitFontSmoothing: 'antialiased',
        userSelect: 'none',
      }}
    >
      <Rail activeTab={tab} onTabChange={(t) => setTab(t as Tab)} onAvatarClick={onLogout} />

      {/* Panel host */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {tab === 'notebooks' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <Sidebar />
            <NoteList />
            <EditorPanel />
          </div>
        )}
        {tab === 'search' && <SearchPanel />}
        {tab === 'tags' && <TagsPanel />}
        {tab === 'pins' && <PinsPanel />}
      </div>
    </div>
  )
}
