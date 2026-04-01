import { useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '../../stores/editor.store'
import { useNotesStore } from '../../stores/notes.store'

// Simple frontmatter parser (no Node.js dependency needed)
function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  if (!raw.startsWith('---')) return { frontmatter: '', body: raw }
  const end = raw.indexOf('\n---', 4)
  if (end === -1) return { frontmatter: '', body: raw }
  return {
    frontmatter: raw.slice(4, end),
    body: raw.slice(end + 4).replace(/^\n/, '')
  }
}

function extractTitle(frontmatter: string): string {
  const match = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m)
  return match ? match[1].trim() : ''
}

function extractTags(frontmatter: string): string[] {
  const match = frontmatter.match(/^tags:\s*\[([^\]]*)\]/m)
  if (!match) return []
  return match[1].split(',').map((t) => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
}

function formatDateTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

export function EditorPanel(): JSX.Element {
  const { activeNote, isDirty, isSaving, setContent, save } = useEditorStore()
  const { updateNoteTitle } = useNotesStore()
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const titleRef = useRef<HTMLDivElement>(null)

  // Auto-save after 1.5s of inactivity
  useEffect(() => {
    if (isDirty) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => { save() }, 1500)
    }
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [isDirty, activeNote?.content])

  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeNote) return
    const { frontmatter } = splitFrontmatter(activeNote.content)
    const newContent = `---\n${frontmatter}\n---\n\n${e.target.value}`
    setContent(newContent)
  }, [activeNote, setContent])

  const handleTitleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (!activeNote) return
    const newTitle = (e.currentTarget.textContent || '').trim()
    const { frontmatter, body } = splitFrontmatter(activeNote.content)

    // Update title in frontmatter
    const updatedFrontmatter = frontmatter.replace(/^title:.*$/m, `title: "${newTitle}"`)
    const newContent = `---\n${updatedFrontmatter}\n---\n\n${body}`
    setContent(newContent)
    updateNoteTitle(activeNote.path, newTitle)
  }, [activeNote, setContent, updateNoteTitle])

  if (!activeNote) {
    return (
      <div
        className="flex flex-col overflow-hidden"
        style={{ flex: 1, background: 'var(--app-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ textAlign: 'center', color: 'var(--app-text-3)' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }}>
            <rect x="6" y="4" width="28" height="32" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="12" y1="13" x2="28" y2="13" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="12" y1="19" x2="24" y2="19" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="12" y1="25" x2="20" y2="25" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          <div style={{ fontSize: 13 }}>Selecione uma nota para editar</div>
        </div>
      </div>
    )
  }

  const { frontmatter, body } = splitFrontmatter(activeNote.content)
  const title = extractTitle(frontmatter)
  const tags = extractTags(frontmatter)

  // Extract created date from frontmatter
  const createdMatch = frontmatter.match(/^created:\s*(.+)$/m)
  const createdDate = createdMatch ? formatDateTime(createdMatch[1].trim()) : ''
  const readTime = estimateReadTime(body)

  const saveStatus = isSaving ? 'Salvando...' : isDirty ? 'Não salvo' : 'Salvo automaticamente'
  const statusColor = isSaving ? '#F5A623' : isDirty ? '#F87171' : '#3FD68F'

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ flex: 1, background: 'var(--app-main)' }}
    >
      {/* Topbar */}
      <div
        className="flex items-center shrink-0"
        style={{
          padding: '10px 24px',
          borderBottom: '0.5px solid var(--app-border)',
          gap: 8,
        }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center" style={{ gap: 4, fontSize: 12, color: 'var(--app-text-3)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="4" height="4" rx="0.8" fill="currentColor" fillOpacity="0.4"/>
            <rect x="7" y="1" width="4" height="4" rx="0.8" fill="currentColor" fillOpacity="0.4"/>
            <rect x="1" y="7" width="4" height="4" rx="0.8" fill="currentColor" fillOpacity="0.4"/>
            <rect x="7" y="7" width="4" height="4" rx="0.8" fill="currentColor" fillOpacity="0.4"/>
          </svg>
          <span style={{ color: 'var(--app-text-2)' }}>
            {title || 'Sem título'}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Save status */}
        <div
          className="flex items-center"
          style={{
            gap: 5,
            padding: '4px 10px',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid var(--app-border-mid)',
            borderRadius: 100,
            fontSize: 11,
            color: 'var(--app-text-3)',
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, flexShrink: 0, display: 'inline-block' }} />
          {saveStatus}
        </div>

        {/* Save now button */}
        {isDirty && (
          <div
            onClick={() => save()}
            className="flex items-center justify-center cursor-pointer"
            style={{ opacity: 0.5, width: 30, height: 30 }}
            title="Salvar agora (⌘S)"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.9' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.5' }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 6.5L5.5 10L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Content area */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: '32px 24px 24px', maxWidth: 720, width: '100%', margin: '0 auto' }}
      >
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 20 }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '3px 9px',
                  background: 'var(--app-tag-bg)',
                  border: '0.5px solid var(--app-border-mid)',
                  borderRadius: 100,
                  fontSize: 11.5,
                  color: 'var(--app-accent)',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Title — editable */}
        <div
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleTitleInput}
          data-placeholder="Sem título"
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: 'var(--app-text-1)',
            lineHeight: 1.25,
            marginBottom: 6,
            letterSpacing: '-0.6px',
            outline: 'none',
            cursor: 'text',
            minHeight: 32,
          }}
        >
          {title}
        </div>

        {/* Date row */}
        <div
          className="flex items-center"
          style={{ fontSize: 11.5, color: 'var(--app-text-3)', marginBottom: 24, gap: 12 }}
        >
          {createdDate && (
            <span className="flex items-center" style={{ gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M3 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="1" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1"/>
              </svg>
              {createdDate}
            </span>
          )}
          <span className="flex items-center" style={{ gap: 5 }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M5.5 3v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {readTime} min de leitura
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 0.5, background: 'var(--app-border)', marginBottom: 20 }} />

        {/* Body — editable textarea */}
        <textarea
          value={body}
          onChange={handleBodyChange}
          placeholder="Comece a escrever..."
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: 400,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: 14,
            lineHeight: 1.72,
            color: 'rgba(238,238,242,0.85)',
            fontFamily: 'var(--font-sans)',
            caretColor: 'var(--app-accent)',
          }}
        />
      </div>

      {/* Bottom toolbar */}
      <div
        className="flex items-center shrink-0"
        style={{
          borderTop: '0.5px solid var(--app-border)',
          padding: '8px 24px',
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          gap: 2,
        }}
      >
        <ToolbarBtn title="Bold" style={{ fontWeight: 700 }}>B</ToolbarBtn>
        <ToolbarBtn title="Italic" style={{ fontStyle: 'italic' }}>I</ToolbarBtn>
        <ToolbarBtn title="Código" style={{ fontFamily: 'monospace', fontSize: 11 }}>&lt;/&gt;</ToolbarBtn>
        <ToolbarSep />
        <ToolbarBtn title="H1" style={{ fontSize: 11, fontWeight: 600 }}>H1</ToolbarBtn>
        <ToolbarBtn title="H2" style={{ fontSize: 11, fontWeight: 600 }}>H2</ToolbarBtn>
        <ToolbarBtn title="Lista">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="4" y1="3.5" x2="12" y2="3.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="4" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="4" y1="10.5" x2="12" y2="10.5" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="1.5" cy="3.5" r="0.9" fill="currentColor"/>
            <circle cx="1.5" cy="7" r="0.9" fill="currentColor"/>
            <circle cx="1.5" cy="10.5" r="0.9" fill="currentColor"/>
          </svg>
        </ToolbarBtn>
        <ToolbarSep />
        <ToolbarBtn title="Link">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5.5 8.5L8.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M6.5 4.5L7.5 3.5C8.5 2.5 10 2.5 11 3.5C12 4.5 12 6 11 7L10 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M7.5 9.5L6.5 10.5C5.5 11.5 4 11.5 3 10.5C2 9.5 2 8 3 7L4 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </ToolbarBtn>

        <div style={{ flex: 1 }} />

        <div className="flex items-center" style={{ gap: 5, fontSize: 11, color: 'var(--app-text-3)' }}>
          {isSaving ? (
            <>
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderTopColor: '#F5A623',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
              Salvando...
            </>
          ) : isDirty ? (
            <>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F87171' }} />
              Não salvo
            </>
          ) : (
            <>
              <div className="pulse-dot" />
              Salvo agora
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolbarBtn({
  children,
  title,
  style: extraStyle,
}: {
  children: React.ReactNode
  title?: string
  style?: React.CSSProperties
}): JSX.Element {
  return (
    <div
      className="flex items-center justify-center cursor-pointer"
      title={title}
      style={{
        width: 28,
        height: 28,
        borderRadius: 5,
        opacity: 0.4,
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--app-text-1)',
        transition: 'background 0.12s, opacity 0.12s',
        ...extraStyle,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'var(--app-hover)'
        el.style.opacity = '0.9'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'transparent'
        el.style.opacity = '0.4'
      }}
    >
      {children}
    </div>
  )
}

function ToolbarSep(): JSX.Element {
  return (
    <div
      style={{
        width: 0.5,
        height: 16,
        background: 'var(--app-border-mid)',
        margin: '0 4px',
        flexShrink: 0,
      }}
    />
  )
}
