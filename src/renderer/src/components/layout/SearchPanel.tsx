import { useState } from 'react'

export function SearchPanel(): JSX.Element {
  const [filters, setFilters] = useState<Record<string, boolean>>({
    notebooks: true,
    planning: false,
    month: false,
    favorites: false,
  })

  function toggleFilter(key: string) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--app-sidebar)',
        overflow: 'hidden',
      }}
    >
      {/* Top area */}
      <div
        style={{
          padding: '20px 18px 14px',
          borderBottom: '0.5px solid var(--app-border)',
          flexShrink: 0,
        }}
      >
        {/* Search box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(124,110,245,0.4)',
            borderRadius: 'var(--app-radius)',
            padding: '8px 12px',
            boxShadow: '0 0 0 3px rgba(124,110,245,0.08)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.6, flexShrink: 0, color: 'var(--app-text-1)' }}>
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4"/>
            <line x1="9" y1="9" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--app-text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--app-text-2)' }}>planning</span>
            <span
              className="blink"
              style={{
                display: 'inline-block',
                width: 1.5,
                height: 14,
                background: 'var(--app-accent)',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 10,
              color: 'var(--app-text-3)',
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid var(--app-border-mid)',
              borderRadius: 4,
              padding: '2px 5px',
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ⌘K
          </span>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          <FilterPill
            active={filters.notebooks}
            onClick={() => toggleFilter('notebooks')}
            icon={
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="1" y="1" width="3.5" height="3.5" rx=".6" fill="currentColor"/>
                <rect x="5.5" y="1" width="3.5" height="3.5" rx=".6" fill="currentColor"/>
                <rect x="1" y="5.5" width="3.5" height="3.5" rx=".6" fill="currentColor"/>
                <rect x="5.5" y="5.5" width="3.5" height="3.5" rx=".6" fill="currentColor"/>
              </svg>
            }
          >
            Todos notebooks
          </FilterPill>
          <FilterPill
            active={filters.planning}
            onClick={() => toggleFilter('planning')}
            icon={
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1h3.5l4 4-3.5 3.5-4-4V1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                <circle cx="3" cy="3" r=".8" fill="currentColor"/>
              </svg>
            }
          >
            # planning
          </FilterPill>
          <FilterPill
            active={filters.month}
            onClick={() => toggleFilter('month')}
            icon={
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="1" y="1.5" width="8" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.1"/>
                <line x1="1" y1="4" x2="9" y2="4" stroke="currentColor" strokeWidth="1"/>
              </svg>
            }
          >
            Este mês
          </FilterPill>
          <FilterPill
            active={filters.favorites}
            onClick={() => toggleFilter('favorites')}
            icon={
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1l1.1 2.3 2.5.35-1.8 1.75.43 2.5L5 6.7l-2.23 1.2.43-2.5L1.4 3.65l2.5-.35z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
              </svg>
            }
          >
            Favoritos
          </FilterPill>
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <SectionLabel>3 resultados para "planning"</SectionLabel>

        <SearchResult
          iconBg="rgba(124,110,245,0.12)"
          iconColor="#7C6EF5"
          title={<>Q1 <mark>Planning</mark> — Reunião de Kick-off</>}
          excerpt="Definimos três OKRs principais para guiar o trabalho do time nos próximos 3 meses..."
          notebookColor="#7C6EF5"
          notebook="Trabalho"
          tags={['# planning', '# meeting']}
        />

        <SearchResult
          iconBg="rgba(245,166,35,0.12)"
          iconColor="#F5A623"
          title={<>Roadmap do Produto — <mark>Planning</mark> Q2</>}
          excerpt={<>Revisão das features prioritárias para o segundo trimestre. <mark>Planning</mark> com PMs e designers...</>}
          notebookColor="#F5A623"
          notebook="Projetos"
          tags={['# planning']}
        />

        <SearchResult
          iconBg="rgba(63,214,143,0.1)"
          iconColor="#3FD68F"
          title={<>Casamento — <mark>Planejamento</mark> Geral</>}
          excerpt="Lista de tarefas e fornecedores. Local, buffet, convites e datas importantes para o grande dia..."
          notebookColor="#3FD68F"
          notebook="Pessoal"
          tags={['# wedding', '# planning']}
        />

        <SectionLabel style={{ marginTop: 8 }}>Recentes</SectionLabel>

        <SearchResult
          dimIcon
          title="Katu Lang — Sintaxe do Parser"
          excerpt="Definição da gramática inicial. Tokens e regras de produção para expressões funcionais..."
          notebookColor="#7C6EF5"
          notebook="Trabalho"
          tags={['# katu']}
        />

        <SearchResult
          dimIcon
          title="AWS Cloud Practitioner — Plano de Estudos"
          excerpt="8 semanas até a prova. Semana 1: IAM, EC2, S3. Semana 2: RDS, VPC..."
          notebookColor="#7C6EF5"
          notebook="Trabalho"
          tags={['# aws', '# study']}
        />
      </div>
    </div>
  )
}

function FilterPill({
  children,
  active,
  icon,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  icon?: React.ReactNode
  onClick?: () => void
}): JSX.Element {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 9px',
        background: active ? 'var(--app-accent-dim)' : 'rgba(255,255,255,0.04)',
        border: active ? '0.5px solid rgba(124,110,245,0.3)' : '0.5px solid var(--app-border-mid)',
        borderRadius: 100,
        fontSize: 11,
        color: active ? 'var(--app-accent)' : 'var(--app-text-2)',
        cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'var(--app-accent-dim)'
          el.style.color = 'var(--app-accent)'
          el.style.borderColor = 'rgba(124,110,245,0.3)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'rgba(255,255,255,0.04)'
          el.style.color = 'var(--app-text-2)'
          el.style.borderColor = 'var(--app-border-mid)'
        }
      }}
    >
      {icon}
      {children}
    </div>
  )
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }): JSX.Element {
  return (
    <div
      style={{
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--app-text-3)',
        fontWeight: 500,
        padding: '14px 18px 6px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

const noteIconPath = (color: string) => (
  <>
    <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke={color} strokeWidth="1.3"/>
    <line x1="4.5" y1="5" x2="9.5" y2="5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="4.5" y1="10" x2="7.5" y2="10" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
  </>
)

const dimNoteIcon = (
  <>
    <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" opacity={0.35}/>
    <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity={0.35}/>
    <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity={0.35}/>
  </>
)

function SearchResult({
  iconBg,
  iconColor,
  dimIcon,
  title,
  excerpt,
  notebookColor,
  notebook,
  tags,
}: {
  iconBg?: string
  iconColor?: string
  dimIcon?: boolean
  title: React.ReactNode
  excerpt: React.ReactNode
  notebookColor: string
  notebook: string
  tags: string[]
}): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 18px',
        cursor: 'pointer',
        transition: 'background 0.1s',
        borderRadius: 'var(--app-radius)',
        margin: '1px 6px',
        color: 'var(--app-text-1)',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--app-hover)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {/* Icon */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
          background: dimIcon ? 'rgba(255,255,255,0.04)' : iconBg,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          {dimIcon ? dimNoteIcon : noteIconPath(iconColor!)}
        </svg>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
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
          <MarkStyled>{title}</MarkStyled>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--app-text-3)', lineHeight: 1.5 }}>
          <MarkStyled dimMark>{excerpt}</MarkStyled>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          <div style={{ fontSize: 10.5, color: 'var(--app-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: notebookColor, flexShrink: 0, display: 'inline-block' }} />
            {notebook}
          </div>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 10,
                color: 'var(--app-text-3)',
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid var(--app-border)',
                padding: '1px 6px',
                borderRadius: 100,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Wrapper that applies mark styles (defined in globals.css)
function MarkStyled({ children, dimMark }: { children: React.ReactNode; dimMark?: boolean }): JSX.Element {
  return (
    <span className={dimMark ? 'search-result-mark-dim' : 'search-result-mark'}>
      {children}
    </span>
  )
}
