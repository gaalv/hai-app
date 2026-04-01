import { useAuthStore } from '../../stores/auth.store'

interface RailProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onAvatarClick: () => void
}

export function Rail({ activeTab, onTabChange, onAvatarClick }: RailProps): JSX.Element {
  const { profile } = useAuthStore()
  const avatarInitial = (profile?.name || profile?.login || 'U')[0].toUpperCase()
  return (
    <nav
      className="flex flex-col items-center shrink-0"
      style={{
        width: 52,
        background: 'var(--app-rail)',
        borderRight: '0.5px solid var(--app-border)',
        padding: '14px 0',
        gap: 2,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center mb-[18px] text-[13px] font-medium text-white"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'var(--app-accent)',
          letterSpacing: '-0.5px',
        }}
      >
        N
      </div>

      {/* Notebooks */}
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

      {/* Favorites */}
      <RailBtn
        active={activeTab === 'pins'}
        title="Favoritos"
        onClick={() => onTabChange('pins')}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M7.5 1.5l1.7 3.5 3.8.55-2.75 2.7.65 3.8L7.5 10.4l-3.4 1.65.65-3.8L2 5.55l3.8-.55z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        </svg>
      </RailBtn>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <RailBtn title="Configurações">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.9 2.9l1.1 1.1M11 11l1.1 1.1M2.9 12.1L4 11M11 4l1.1-1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </RailBtn>

      {/* Avatar */}
      <div
        className="flex items-center justify-center text-[10px] font-medium text-white mt-[6px] cursor-pointer"
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7C6EF5 0%, #C084FC 100%)',
          border: '1.5px solid rgba(124,110,245,0.4)',
        }}
        onClick={onAvatarClick}
        title={`${profile?.login || 'Usuário'} · Clique para sair`}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.login}
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
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
      className="flex items-center justify-center cursor-pointer transition-colors duration-150"
      title={title}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--app-radius)',
        background: active ? 'var(--app-accent-dim)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--app-hover)'
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <span style={{ opacity: active ? 1 : 0.45, color: 'var(--app-text-1)' }}>
        {children}
      </span>
    </div>
  )
}
