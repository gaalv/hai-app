import { useState, useEffect, useRef, useCallback } from 'react'
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

function extractDate(frontmatter: string): string {
  const match = frontmatter.match(/^created:\s*['"]?(.+?)['"]?\s*$/m)
  if (!match) return ''
  const raw = match[1]
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('pt-BR', {
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
  const { activeNote, isDirty, setContent, save } = useEditorStore()
  const { updateNoteTitle } = useNotesStore()
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const activeNoteRef = useRef(activeNote)
  const lastNotePathRef = useRef<string | null>(null)
  activeNoteRef.current = activeNote

  // Set title text only when switching notes (uncontrolled contentEditable)
  useEffect(() => {
    if (!activeNote || !titleRef.current) return
    if (activeNote.path === lastNotePathRef.current) return
    lastNotePathRef.current = activeNote.path
    const { frontmatter } = splitFrontmatter(activeNote.content)
    titleRef.current.textContent = extractTitle(frontmatter)
  }, [activeNote?.path])

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
    const note = activeNoteRef.current
    if (!note) return
    const { frontmatter } = splitFrontmatter(note.content)
    const newContent = `---\n${frontmatter}\n---\n\n${newBody}`
    setContent(newContent)
  }, [setContent])

  const handleTitleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const note = activeNoteRef.current
    if (!note) return
    const newTitle = (e.currentTarget.textContent || '').trim()
    const { frontmatter, body } = splitFrontmatter(note.content)
    const updatedFrontmatter = frontmatter.replace(/^title:.*$/m, `title: "${newTitle}"`)
    const newContent = `---\n${updatedFrontmatter}\n---\n\n${body}`
    setContent(newContent)
    updateNoteTitle(note.path, newTitle)
  }, [setContent, updateNoteTitle])

  const handleAddTag = useCallback((newTag: string) => {
    const note = activeNoteRef.current
    if (!note) return
    const tag = newTag.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
    if (!tag) return
    const { frontmatter, body } = splitFrontmatter(note.content)
    const currentTags = extractTags(frontmatter)
    if (currentTags.includes(tag)) return
    const updatedTags = [...currentTags, tag]
    const tagStr = `[${updatedTags.map((t) => `"${t}"`).join(', ')}]`
    const updatedFrontmatter = frontmatter.match(/^tags:/m)
      ? frontmatter.replace(/^tags:\s*\[.*\]/m, `tags: ${tagStr}`)
      : frontmatter + `\ntags: ${tagStr}`
    const newContent = `---\n${updatedFrontmatter}\n---\n\n${body}`
    setContent(newContent)
  }, [setContent])

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    const note = activeNoteRef.current
    if (!note) return
    const { frontmatter, body } = splitFrontmatter(note.content)
    const currentTags = extractTags(frontmatter).filter((t) => t !== tagToRemove)
    const tagStr = `[${currentTags.map((t) => `"${t}"`).join(', ')}]`
    const updatedFrontmatter = frontmatter.replace(/^tags:\s*\[.*\]/m, `tags: ${tagStr}`)
    const newContent = `---\n${updatedFrontmatter}\n---\n\n${body}`
    setContent(newContent)
  }, [setContent])

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
  const tags = extractTags(frontmatter)
  const createdDate = extractDate(frontmatter)
  const readTime = estimateReadTime(body)

  return (
    <div
      className="flex flex-col overflow-hidden flex-1 bg-[var(--app-main)]"
    >
      {/* Content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Metadata header */}
        <div className="shrink-0 pt-8 px-6 max-w-[720px] w-full mx-auto">
          {/* Tags — interactive */}
          <TagBar tags={tags} onAdd={handleAddTag} onRemove={handleRemoveTag} />

          {/* Title — uncontrolled contentEditable, set via ref */}
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleTitleInput}
            data-placeholder="Sem título"
            className="text-[26px] font-medium text-[var(--app-text-1)] leading-[1.25] mb-[6px] tracking-[-0.6px] outline-none cursor-text min-h-8 empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--app-text-3)]"
          />

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
            key={activeNote.path}
            initialContent={body}
            onChange={handleBodyChange}
          />
        </div>
      </div>
    </div>
  )
}

// ── TagBar ───────────────────────────────────────────────

function TagBar({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}): JSX.Element {
  const [inputValue, setInputValue] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onAdd(inputValue)
      setInputValue('')
    }
    if (e.key === 'Escape') {
      setInputValue('')
      setIsAdding(false)
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onRemove(tags[tags.length - 1])
    }
  }

  return (
    <div className="flex items-center flex-wrap gap-1.5 mb-5 min-h-[26px]">
      {tags.map((tag) => (
        <span
          key={tag}
          onClick={() => onRemove(tag)}
          title="Clique para remover"
          className="group/tag flex items-center gap-1 px-[9px] py-[3px] bg-[var(--app-tag-bg)] border-[0.5px] border-[var(--app-border-mid)] rounded-full text-[11.5px] text-[var(--app-accent)] cursor-pointer hover:border-[var(--app-accent)] transition-colors"
        >
          #{tag}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className="opacity-0 group-hover/tag:opacity-60 transition-opacity"
          >
            <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {isAdding ? (
        <input
          autoFocus
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) onAdd(inputValue)
            setInputValue('')
            setIsAdding(false)
          }}
          placeholder="nova tag…"
          className="bg-transparent border-none outline-none text-[11.5px] text-[var(--app-text-1)] placeholder:text-[var(--app-text-3)] w-[80px]"
        />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-transparent border-[0.5px] border-dashed border-[var(--app-border-mid)] text-[var(--app-text-3)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)] transition-colors cursor-pointer"
          title="Adicionar tag"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
