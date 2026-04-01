import { useState } from 'react'

interface TagData {
  id: string
  name: string
  count: number
  barWidth: number
  color: string
  icon: React.ReactNode
}

interface NoteData {
  title: string
  notebook: string
  notebookColor: string
  date: string
}

const NOTES_BY_TAG: Record<string, NoteData[]> = {
  planning: [
    { title: 'Q1 Planning — Reunião de Kick-off', notebook: 'Trabalho', notebookColor: '#7C6EF5', date: 'Hoje' },
    { title: 'Roadmap do Produto — Planning Q2', notebook: 'Projetos', notebookColor: '#F5A623', date: 'Seg' },
    { title: 'Casamento — Planejamento Geral', notebook: 'Pessoal', notebookColor: '#3FD68F', date: 'Dom' },
    { title: 'Sprint Review — Retrospectiva', notebook: 'Projetos', notebookColor: '#F5A623', date: 'Sáb' },
    { title: 'Churrasco dos Badgers — Organização', notebook: 'Pessoal', notebookColor: '#7C6EF5', date: 'Sex' },
  ],
  coding: [
    { title: 'API Gateway — Decisões de Arquitetura', notebook: 'Trabalho', notebookColor: '#7C6EF5', date: 'Seg' },
    { title: 'Katu Lang — Sintaxe do Parser', notebook: 'Trabalho', notebookColor: '#7C6EF5', date: 'Seg' },
  ],
  aws: [
    { title: 'AWS Cloud Practitioner — Plano de Estudos', notebook: 'Trabalho', notebookColor: '#7C6EF5', date: 'Dom' },
    { title: 'API Gateway — Decisões de Arquitetura', notebook: 'Trabalho', notebookColor: '#7C6EF5', date: 'Seg' },
  ],
  katu: [
    { title: 'Katu Lang — Sintaxe do Parser', notebook: 'Trabalho', notebookColor: '#7C6EF5', date: 'Seg' },
  ],
  wedding: [
    { title: 'Casamento — Planejamento Geral', notebook: 'Pessoal', notebookColor: '#3FD68F', date: 'Dom' },
    { title: 'Lista de Convidados', notebook: 'Pessoal', notebookColor: '#3FD68F', date: 'Sáb' },
  ],
  study: [
    { title: 'AWS Cloud Practitioner — Plano de Estudos', notebook: 'Trabalho', notebookColor: '#7C6EF5', date: 'Dom' },
  ],
}

const TAGS: TagData[] = [
  {
    id: 'planning',
    name: '# planning',
    count: 5,
    barWidth: 100,
    color: '#7C6EF5',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="#7C6EF5" strokeWidth="1.3"/>
        <line x1="1.5" y1="5" x2="12.5" y2="5" stroke="#7C6EF5" strokeWidth="1"/>
        <line x1="4" y1="8" x2="7" y2="8" stroke="#7C6EF5" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'coding',
    name: '# coding',
    count: 7,
    barWidth: 80,
    color: '#3FD68F',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M5 4L2 7l3 3" stroke="#3FD68F" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 4l3 3-3 3" stroke="#3FD68F" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'aws',
    name: '# aws',
    count: 4,
    barWidth: 55,
    color: '#F5A623',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2l4.5 7.5H2.5L7 2z" stroke="#F5A623" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'katu',
    name: '# katu',
    count: 3,
    barWidth: 40,
    color: '#C084FC',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="4.5" stroke="#C084FC" strokeWidth="1.3"/>
        <path d="M5 7h4M7 5v4" stroke="#C084FC" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'wedding',
    name: '# wedding',
    count: 6,
    barWidth: 72,
    color: '#F472B6',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 11.5C7 11.5 2 8 2 5C2 3.3 3.3 2 5 2C6 2 6.9 2.5 7 2.5C7.1 2.5 8 2 9 2C10.7 2 12 3.3 12 5C12 8 7 11.5 7 11.5z" stroke="#F472B6" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'study',
    name: '# study',
    count: 4,
    barWidth: 55,
    color: '#60A5FA',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2L13 5l-6 3L1 5z" stroke="#60A5FA" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M3.5 6.5V10C3.5 10 5 11.5 7 11.5C9 11.5 10.5 10 10.5 10V6.5" stroke="#60A5FA" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function TagsPanel(): JSX.Element {
  const [selectedTag, setSelectedTag] = useState<string>('planning')

  const notes = NOTES_BY_TAG[selectedTag] ?? []

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--app-main)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '18px 22px 14px',
          borderBottom: '0.5px solid var(--app-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--app-text-1)', letterSpacing: '-0.3px' }}>
          Tags
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid var(--app-border-mid)',
            borderRadius: 'var(--app-radius)',
            fontSize: 11.5,
            color: 'var(--app-text-2)',
            cursor: 'pointer',
            transition: 'background 0.12s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'var(--app-hover)'
            el.style.color = 'var(--app-text-1)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(255,255,255,0.04)'
            el.style.color = 'var(--app-text-2)'
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <line x1="5.5" y1="1" x2="5.5" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="1" y1="5.5" x2="10" y2="5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Nova tag
        </div>
      </div>

      {/* Content */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}
      >
        {/* Section label */}
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--app-text-3)',
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          Todas as tags (8)
        </div>

        {/* Tag cards grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 24,
          }}
        >
          {TAGS.map((tag) => (
            <TagCard
              key={tag.id}
              tag={tag}
              selected={selectedTag === tag.id}
              onClick={() => setSelectedTag(tag.id)}
            />
          ))}
        </div>

        {/* Notes section label */}
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--app-text-3)',
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          Notas com # {selectedTag}
        </div>

        {/* Note list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {notes.map((note, i) => (
            <NoteItem key={i} note={note} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TagCard({
  tag,
  selected,
  onClick,
}: {
  tag: TagData
  selected: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? 'var(--app-accent-dim)' : 'rgba(255,255,255,0.03)',
        border: selected ? '0.5px solid rgba(124,110,245,0.35)' : '0.5px solid var(--app-border)',
        borderRadius: 10,
        padding: 14,
        cursor: 'pointer',
        transition: 'background 0.12s, border-color 0.12s, transform 0.1s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'rgba(255,255,255,0.05)'
          el.style.borderColor = 'var(--app-border-mid)'
          el.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'rgba(255,255,255,0.03)'
          el.style.borderColor = 'var(--app-border)'
          el.style.transform = 'translateY(0)'
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${tag.color}1a`,
            fontSize: 13,
          }}
        >
          {tag.icon}
        </div>
        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--app-text-1)', letterSpacing: '-0.5px' }}>
          {tag.count}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--app-text-2)' }}>{tag.name}</div>
      <div
        style={{
          marginTop: 8,
          height: 2,
          borderRadius: 1,
          background: 'rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 1,
            width: `${tag.barWidth}%`,
            background: tag.color,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}

function NoteItem({ note }: { note: NoteData }): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid var(--app-border)',
        borderRadius: 'var(--app-radius)',
        cursor: 'pointer',
        transition: 'background 0.1s, border-color 0.1s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'var(--app-hover)'
        el.style.borderColor = 'var(--app-border-mid)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'rgba(255,255,255,0.03)'
        el.style.borderColor = 'var(--app-border)'
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: note.notebookColor,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: 'var(--app-text-1)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {note.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--app-text-3)' }}>{note.notebook}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--app-text-3)', whiteSpace: 'nowrap' }}>{note.date}</div>
    </div>
  )
}
