import { useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '../../stores/editor.store'
import { useNotesStore } from '../../stores/notes.store'
import { CodeMirrorEditor } from '../editor/CodeMirrorEditor'

// Simple frontmatter parser (no Node.js dependency needed)
function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  if (!raw.startsWith('---')) return { frontmatter: '', body: raw }
  const end = raw.indexOf('\n---', 4)
  if (end === -1) return { frontmatter: '', body: raw }
  return {
    frontmatter: raw.slice(4, end),
    body: raw.slice(end + 4).replace(/^\n+/, '')
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

  const handleBodyChange = useCallback((newBody: string) => {
    if (!activeNote) return
    const { frontmatter } = splitFrontmatter(activeNote.content)
    const newContent = `---\n${frontmatter}\n---\n\n${newBody}`
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
        className="flex flex-col overflow-hidden flex-1 bg-[var(--app-main)] items-center justify-center"
      >
        <div className="text-center text-[var(--app-text-3)]">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3 block opacity-30">
            <rect x="6" y="4" width="28" height="32" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="12" y1="13" x2="28" y2="13" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="12" y1="19" x2="24" y2="19" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="12" y1="25" x2="20" y2="25" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          <div className="text-[13px]">Selecione uma nota para editar</div>
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

  return (
    <div
      className="flex flex-col overflow-hidden flex-1 bg-[var(--app-main)]"
    >
      {/* Topbar */}
      <div
        className="flex items-center shrink-0 px-6 py-[10px] border-b-[0.5px] border-b-[var(--app-border)] gap-2"
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-[12px] text-[var(--app-text-3)]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="4" height="4" rx="0.8" fill="currentColor" fillOpacity="0.4"/>
            <rect x="7" y="1" width="4" height="4" rx="0.8" fill="currentColor" fillOpacity="0.4"/>
            <rect x="1" y="7" width="4" height="4" rx="0.8" fill="currentColor" fillOpacity="0.4"/>
            <rect x="7" y="7" width="4" height="4" rx="0.8" fill="currentColor" fillOpacity="0.4"/>
          </svg>
          <span className="text-[var(--app-text-2)]">
            {title || 'Sem título'}
          </span>
        </div>

        <div className="flex-1" />

        {/* Save status */}
        <div
          className={`flex items-center gap-[5px] px-[10px] py-1 bg-[rgba(255,255,255,0.04)] border-[0.5px] border-[var(--app-border-mid)] rounded-full text-[11px] text-[var(--app-text-3)]`}
        >
          <span className={`w-[5px] h-[5px] rounded-full shrink-0 inline-block ${isSaving ? 'bg-[#F5A623]' : isDirty ? 'bg-[#F87171]' : 'bg-[#3FD68F]'}`} />
          {saveStatus}
        </div>

        {/* Save now button */}
        {isDirty && (
          <div
            onClick={() => save()}
            className="flex items-center justify-center cursor-pointer opacity-50 w-[30px] h-[30px] hover:opacity-90 transition-opacity duration-[120ms]"
            title="Salvar agora (⌘S)"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 6.5L5.5 10L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Metadata header */}
        <div className="shrink-0 pt-8 px-6 max-w-[720px] w-full mx-auto">
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center flex-wrap gap-2 mb-5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-[9px] py-[3px] bg-[var(--app-tag-bg)] border-[0.5px] border-[var(--app-border-mid)] rounded-full text-[11.5px] text-[var(--app-accent)]"
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
            className="text-[26px] font-medium text-[var(--app-text-1)] leading-[1.25] mb-[6px] tracking-[-0.6px] outline-none cursor-text min-h-8"
          >
            {title}
          </div>

          {/* Date row */}
          <div
            className="flex items-center text-[11.5px] text-[var(--app-text-3)] mb-6 gap-3"
          >
            {createdDate && (
              <span className="flex items-center gap-[5px]">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M3 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <line x1="1" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1"/>
                </svg>
                {createdDate}
              </span>
            )}
            <span className="flex items-center gap-[5px]">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5.5 3v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {readTime} min de leitura
            </span>
          </div>

          {/* Divider */}
          <div className="h-[0.5px] bg-[var(--app-border)] mb-0" />
        </div>

        {/* CodeMirror editor */}
        <div className="flex-1 overflow-hidden max-w-[720px] w-full mx-auto">
          <CodeMirrorEditor
            initialContent={body}
            onChange={handleBodyChange}
          />
        </div>
      </div>
    </div>
  )
}
