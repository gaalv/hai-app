const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="#F5A623">
    <path d="M6 1l1.35 2.76 3.05.44-2.2 2.15.52 3.04L6 8.1 3.28 9.39l.52-3.04L1.6 4.2l3.05-.44z"/>
  </svg>
)

interface PinCard {
  accentColor: string
  notebookColor: string
  notebook: string
  title: string
  preview: string
  tags: string[]
  date: string
}

interface PinListItem {
  dotColor: string
  title: string
  meta: string
  date: string
}

const PIN_CARDS: PinCard[] = [
  {
    accentColor: '#7C6EF5',
    notebookColor: '#7C6EF5',
    notebook: 'Trabalho',
    title: 'Q1 Planning — Reunião de Kick-off',
    preview: 'Definimos três OKRs principais para guiar o trabalho do time...',
    tags: ['# planning', '# meeting'],
    date: 'Hoje',
  },
  {
    accentColor: '#C084FC',
    notebookColor: '#7C6EF5',
    notebook: 'Trabalho',
    title: 'Katu Lang — Sintaxe do Parser',
    preview: 'Gramática inicial. Tokens e regras de produção para expressões funcionais...',
    tags: ['# katu'],
    date: 'Seg',
  },
  {
    accentColor: '#F472B6',
    notebookColor: '#3FD68F',
    notebook: 'Pessoal',
    title: 'Casamento — Planejamento Geral',
    preview: 'Fornecedores, datas e lista de convidados para o grande dia...',
    tags: ['# wedding'],
    date: 'Dom',
  },
  {
    accentColor: '#F5A623',
    notebookColor: '#F5A623',
    notebook: 'Projetos',
    title: 'Roadmap do Produto — Q2',
    preview: 'Features prioritárias e entregáveis para o segundo trimestre do ano...',
    tags: ['# planning'],
    date: 'Seg',
  },
]

const PIN_LIST: PinListItem[] = [
  {
    dotColor: '#60A5FA',
    title: 'AWS Cloud Practitioner — Plano de Estudos',
    meta: 'Trabalho · # aws · # study',
    date: 'Dom',
  },
  {
    dotColor: '#3FD68F',
    title: 'Receita de Churrasco Perfeito',
    meta: 'Pessoal · # food',
    date: 'Sáb',
  },
  {
    dotColor: '#7C6EF5',
    title: 'Bauru Badgers — Documentação do Time',
    meta: 'Pessoal · # badgers · # planning',
    date: 'Sex',
  },
]

export function PinsPanel(): JSX.Element {
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
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--app-text-1)',
            letterSpacing: '-0.3px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1.5l1.6 3.3 3.6.52-2.6 2.54.62 3.6L7 9.7l-3.22 1.77.62-3.6L1.8 5.32l3.6-.52z"
              fill="#F5A623"
              stroke="#F5A623"
              strokeWidth=".5"
              strokeLinejoin="round"
            />
          </svg>
          Favoritos
        </div>
        <div style={{ fontSize: 11, color: 'var(--app-text-3)' }}>7 notas fixadas</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
        {/* Fixados group */}
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--app-text-3)',
            fontWeight: 500,
            margin: '0 0 8px',
          }}
        >
          Fixados
        </div>

        {/* Cards grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 20,
          }}
        >
          {PIN_CARDS.map((card, i) => (
            <PinCardItem key={i} card={card} />
          ))}
        </div>

        {/* Acesso rápido group */}
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--app-text-3)',
            fontWeight: 500,
            margin: '0 0 8px',
          }}
        >
          Acesso rápido
        </div>

        {/* List items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 20 }}>
          {PIN_LIST.map((item, i) => (
            <PinListItemRow key={i} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PinCardItem({ card }: { card: PinCard }): JSX.Element {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid var(--app-border)',
        borderRadius: 10,
        padding: 14,
        cursor: 'pointer',
        transition: 'background 0.12s, border-color 0.12s, transform 0.1s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'rgba(255,255,255,0.05)'
        el.style.borderColor = 'var(--app-border-mid)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'rgba(255,255,255,0.03)'
        el.style.borderColor = 'var(--app-border)'
        el.style.transform = 'translateY(0)'
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          borderRadius: '10px 10px 0 0',
          background: card.accentColor,
        }}
      />

      {/* Star */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          opacity: 0.7,
          cursor: 'pointer',
          transition: 'opacity 0.12s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
      >
        <StarIcon />
      </div>

      {/* Notebook */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 10.5,
          color: 'var(--app-text-3)',
          marginBottom: 8,
          marginTop: 2,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: card.notebookColor,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
        {card.notebook}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--app-text-1)',
          marginBottom: 6,
          lineHeight: 1.3,
          letterSpacing: '-0.2px',
        }}
      >
        {card.title}
      </div>

      {/* Preview */}
      <div
        style={{
          fontSize: 11.5,
          color: 'var(--app-text-3)',
          lineHeight: 1.5,
          marginBottom: 10,
        }}
      >
        {card.preview}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {card.tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 10,
              color: 'var(--app-accent)',
              background: 'var(--app-accent-dim)',
              border: '0.5px solid rgba(124,110,245,0.2)',
              padding: '2px 7px',
              borderRadius: 100,
            }}
          >
            {tag}
          </span>
        ))}
        <span style={{ fontSize: 10.5, color: 'var(--app-text-3)', marginLeft: 'auto' }}>
          {card.date}
        </span>
      </div>
    </div>
  )
}

function PinListItemRow({ item }: { item: PinListItem }): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid var(--app-border)',
        borderRadius: 'var(--app-radius)',
        cursor: 'pointer',
        transition: 'background 0.1s',
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
          background: item.dotColor,
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
          {item.title}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--app-text-3)' }}>{item.meta}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--app-text-3)', whiteSpace: 'nowrap' }}>{item.date}</div>
    </div>
  )
}
