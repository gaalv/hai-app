import { useEffect } from 'react'
import { useManifestStore } from '../../stores/manifest.store'
import { useNotesStore } from '../../stores/notes.store'
import { useAuthStore } from '../../stores/auth.store'

const NOTEBOOK_COLORS = ['#7C6EF5', '#3FD68F', '#F5A623', '#F472B6', '#60A5FA', '#34D399', '#FB923C']

export function Sidebar(): JSX.Element {
  const { notebooks, tags, activeNotebook, setView, isLoaded, load } = useManifestStore()
  const { loadNotes } = useNotesStore()
  const { profile } = useAuthStore()

  useEffect(() => {
    if (!isLoaded) {
      load().then(() => {
        // Auto-select first notebook if none selected
        const manifest = useManifestStore.getState()
        if (!manifest.activeNotebook && manifest.notebooks.length > 0) {
          const first = manifest.notebooks[0]
          setView('notebook', first.id)
          loadNotes(first.id)
        }
      })
    }
  }, [isLoaded])

  function handleNotebookClick(notebookId: string): void {
    setView('notebook', notebookId)
    loadNotes(notebookId)
  }

  const workspaceName = profile?.name || profile?.login || 'Workspace'

  return (
    <nav
      className="flex flex-col shrink-0 overflow-hidden"
      style={{
        width: 220,
        background: 'var(--app-sidebar)',
        borderRight: '0.5px solid var(--app-border)',
      }}
    >
      {/* Header */}
      <div
        className="shrink-0"
        style={{ padding: '14px 14px 10px', borderBottom: '0.5px solid var(--app-border)' }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--app-text-2)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 10,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {workspaceName}
        </div>
        {/* Search bar (decorative for now) */}
        <div
          className="flex items-center cursor-text"
          style={{
            gap: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid var(--app-border-mid)',
            borderRadius: 'var(--app-radius)',
            padding: '5px 8px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.3, flexShrink: 0 }}>
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="7.5" y1="7.5" x2="10.5" y2="10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 12, color: 'var(--app-text-3)' }}>Buscar notas...</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {/* Notebooks section */}
        <div style={{ padding: '10px 8px 4px' }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              color: 'var(--app-text-3)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              padding: '0 6px',
              marginBottom: 2,
            }}
          >
            Notebooks
          </div>

          {!isLoaded && (
            <div style={{ padding: '8px 8px', fontSize: 12, color: 'var(--app-text-3)' }}>
              Carregando...
            </div>
          )}

          {isLoaded && notebooks.length === 0 && (
            <div style={{ padding: '8px 8px', fontSize: 12, color: 'var(--app-text-3)' }}>
              Nenhum notebook
            </div>
          )}

          {notebooks.map((nb, i) => {
            const color = nb.color || NOTEBOOK_COLORS[i % NOTEBOOK_COLORS.length]
            const isActive = activeNotebook === nb.id
            return (
              <div
                key={nb.id}
                className="flex items-center cursor-pointer"
                onClick={() => handleNotebookClick(nb.id)}
                style={{
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 'var(--app-radius)',
                  background: isActive ? 'var(--app-accent-dim)' : 'transparent',
                  color: isActive ? 'var(--app-text-1)' : 'var(--app-text-2)',
                  fontSize: 12.5,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--app-hover)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--app-text-1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--app-text-2)'
                  }
                }}
              >
                <span
                  style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}
                />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nb.name}
                </span>
              </div>
            )
          })}
        </div>

        {/* Tags section */}
        {tags.length > 0 && (
          <>
            <div style={{ padding: '10px 8px 4px' }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: 'var(--app-text-3)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  padding: '0 6px',
                  marginBottom: 2,
                }}
              >
                Tags
              </div>
            </div>
            <div style={{ padding: '0 8px 8px' }}>
              {tags.map((tag) => (
                <TagPill key={tag.name} label={`# ${tag.label || tag.name}`} color={tag.color} />
              ))}
            </div>
          </>
        )}
      </div>
    </nav>
  )
}

function TagPill({ label, color, active }: { label: string; color?: string; active?: boolean }): JSX.Element {
  return (
    <span
      className="inline-flex items-center cursor-pointer"
      style={{
        padding: '3px 8px',
        background: active ? 'var(--app-accent-dim)' : 'var(--app-tag-bg)',
        borderRadius: 100,
        fontSize: 11,
        color: active ? (color || 'var(--app-accent)') : 'var(--app-tag-text)',
        margin: '2px 2px',
        border: active ? '0.5px solid rgba(124,110,245,0.3)' : '0.5px solid var(--app-border)',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {label}
    </span>
  )
}
