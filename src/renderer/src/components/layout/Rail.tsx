import { useAuthStore } from '../../stores/auth.store'
import { HaiIcon } from '../ui/HaiIcon'

interface RailProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onAvatarClick: () => void
  onSettingsClick: () => void
}

export function Rail({ activeTab, onTabChange, onAvatarClick, onSettingsClick }: RailProps): JSX.Element {
  const { profile } = useAuthStore()
  const avatarInitial = (profile?.name || profile?.login || 'U')[0].toUpperCase()
  return (
    <nav
      className="flex flex-col items-center shrink-0 w-[52px] bg-[var(--app-rail)] border-r-[0.5px] border-r-[var(--app-border)] py-[14px] px-0 gap-[2px] titlebar-no-drag"
    >
      {/* Logo */}
      <div className="mb-[18px]">
        <HaiIcon size={28} />
      </div>

      {/* Notes (main editor) */}
      <RailBtn
        active={activeTab === 'notes'}
        title="Notas"
        onClick={() => onTabChange('notes')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3"/>
          <line x1="6" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="6" y1="7.5" x2="10" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="6" y1="10" x2="8.5" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </RailBtn>

      {/* Notebooks management */}
      <RailBtn
        active={activeTab === 'notebooks'}
        title="Notebooks"
        onClick={() => onTabChange('notebooks')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor"/>
          <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor"/>
          <rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor"/>
          <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor"/>
        </svg>
      </RailBtn>

      {/* Search */}
      <RailBtn
        active={activeTab === 'search'}
        title="Buscar"
        onClick={() => onTabChange('search')}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </RailBtn>

      {/* Tags */}
      <RailBtn
        active={activeTab === 'tags'}
        title="Tags"
        onClick={() => onTabChange('tags')}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M2 2h5l6 6-5 5-6-6V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <circle cx="5" cy="5" r="1" fill="currentColor"/>
        </svg>
      </RailBtn>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <RailBtn title="Configurações" onClick={onSettingsClick}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.9 2.9l1.1 1.1M11 11l1.1 1.1M2.9 12.1L4 11M11 4l1.1-1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </RailBtn>

      {/* Avatar */}
      <div
        className="flex items-center justify-center text-[10px] font-medium text-white mt-[6px] cursor-pointer w-[26px] h-[26px] rounded-full bg-gradient-to-br from-[#7C6EF5] to-[#C084FC] border-[1.5px] border-[rgba(124,110,245,0.4)]"
        onClick={onAvatarClick}
        title={`${profile?.login || 'Usuário'} · Clique para sair`}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.login}
            className="w-full h-full rounded-full object-cover"
          />
        ) : avatarInitial}
      </div>
    </nav>
  )
}

function RailBtn({
  children,
  active,
  title,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  title?: string
  onClick?: () => void
}): JSX.Element {
  return (
    <div
      className={`flex items-center justify-center cursor-pointer transition-colors duration-150 w-9 h-9 rounded-[var(--app-radius)] ${active ? 'bg-[var(--app-accent-dim)]' : 'hover:bg-[var(--app-hover)]'}`}
      title={title}
      onClick={onClick}
    >
      <span className={`text-[var(--app-text-1)] ${active ? 'opacity-100' : 'opacity-45'}`}>
        {children}
      </span>
    </div>
  )
}
