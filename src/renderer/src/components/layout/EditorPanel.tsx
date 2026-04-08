import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '../../stores/editor.store'
import { useNotesStore } from '../../stores/notes.store'
import { useManifestStore } from '../../stores/manifest.store'
import { useVaultStore } from '../../stores/vault.store'
import { useUIStore } from '../../stores/ui.store'
import { CodeMirrorEditor } from '../editor/CodeMirrorEditor'
import { MarkdownPreview } from '../editor/MarkdownPreview'
import { BacklinksPanel } from '../editor/BacklinksPanel'

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
  // Inline format: tags: ["a", "b"] or tags: [a, b]
  const inlineMatch = frontmatter.match(/^tags:\s*\[([^\]]*)\]/m)
  if (inlineMatch) {
    return inlineMatch[1].split(',').map((t) => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
  }
  // YAML list format: tags:\n  - a\n  - b
  const listMatch = frontmatter.match(/^tags:\s*\n((?:\s+-\s+.+\n?)+)/m)
  if (listMatch) {
    return listMatch[1]
      .split('\n')
      .map((l) => l.replace(/^\s+-\s+/, '').trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
  }
  return []
}

// Replace tags in frontmatter, handling both YAML list and inline formats
function replaceTags(frontmatter: string, newTags: string[]): string {
  const tagStr = `[${newTags.map((t) => `"${t}"`).join(', ')}]`
  // Match inline format
  if (frontmatter.match(/^tags:\s*\[/m)) {
    return frontmatter.replace(/^tags:\s*\[.*\]/m, `tags: ${tagStr}`)
  }
  // Match YAML list format (tags: followed by indented - items)
  if (frontmatter.match(/^tags:\s*\n(\s+-)/m)) {
    return frontmatter.replace(/^tags:\s*\n(?:\s+-\s+.+\n?)*/m, `tags: ${tagStr}`)
  }
  // No tags field — append
  if (!frontmatter.match(/^tags:/m)) {
    return frontmatter + `\ntags: ${tagStr}`
  }
  // tags: (empty or other)
  return frontmatter.replace(/^tags:.*$/m, `tags: ${tagStr}`)
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
  const { activeNote, isDirty, isPreviewOnly, togglePreviewOnly, setContent, save, openNote } = useEditorStore()
  const { updateNoteTitle, selectNote } = useNotesStore()
  const { tags: manifestTags, notebooks } = useManifestStore()
  const vaultPath = useVaultStore((s) => s.config?.path)
  const themeMode = useUIStore((s) => s.resolvedTheme)
  const [showBacklinks, setShowBacklinks] = useState(false)

  useEffect(() => {
    async function handleOpenNote(e: Event): Promise<void> {
      const { title } = (e as CustomEvent<{ title: string }>).detail
      const result = await window.electronAPI.notes.findByTitle(title)
      if (result) {
        await openNote(result.path)
        selectNote(result.path)
      }
    }
    document.addEventListener('hai:open-note', handleOpenNote)
    return () => document.removeEventListener('hai:open-note', handleOpenNote)
  }, [openNote, selectNote])
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
    const tag = newTag.trim().toLowerCase()
    if (!tag) return
    const { frontmatter, body } = splitFrontmatter(note.content)
    const currentTags = extractTags(frontmatter)
    if (currentTags.includes(tag)) return
    const updatedFrontmatter = replaceTags(frontmatter, [...currentTags, tag])
    const newContent = `---\n${updatedFrontmatter}\n---\n\n${body}`
    setContent(newContent)
  }, [setContent])

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    const note = activeNoteRef.current
    if (!note) return
    const { frontmatter, body } = splitFrontmatter(note.content)
    const currentTags = extractTags(frontmatter).filter((t) => t !== tagToRemove)
    const updatedFrontmatter = replaceTags(frontmatter, currentTags)
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

  // Derive notebook name from note path
  const notebookName = (() => {
    if (!vaultPath || !notebooks.length) return null
    const rel = activeNote.path.startsWith(vaultPath)
      ? activeNote.path.slice(vaultPath.length + 1)
      : activeNote.path
    const segment = rel.split('/')[0]
    return notebooks.find((n) => n.path === segment)?.name ?? null
  })()

  return (
    <div
      className="flex flex-col overflow-hidden flex-1 bg-[var(--app-main)]"
    >
      {/* Content area */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {/* Floating edit/preview toggle */}
        <div className="absolute top-3 right-4 z-20 flex items-center gap-1.5">
          {/* Backlinks toggle */}
          <button
            onClick={() => setShowBacklinks((v) => !v)}
            title="Backlinks"
            className={`flex items-center justify-center w-6 h-6 rounded cursor-pointer transition-colors border border-transparent ${
              showBacklinks
                ? 'bg-[var(--app-accent-dim)] text-[var(--app-accent)] border-[var(--app-accent-dim)]'
                : 'text-[var(--app-text-3)] hover:text-[var(--app-text-2)] bg-[var(--app-surface)] border-[var(--app-border-mid)]'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M5 9.5H3a2.5 2.5 0 0 1 0-5h2M8 3.5h2a2.5 2.5 0 0 1 0 5H8M4.5 6.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        <div className="flex items-center gap-0.5 bg-[var(--app-surface)] border border-[var(--app-border-mid)] rounded-md p-0.5">
          <button
            onClick={() => isPreviewOnly && togglePreviewOnly()}
            title="Editar (⌘⇧P)"
            className={`flex items-center justify-center w-6 h-6 rounded cursor-pointer transition-colors ${
              !isPreviewOnly
                ? 'bg-[var(--app-accent-dim)] text-[var(--app-accent)]'
                : 'text-[var(--app-text-3)] hover:text-[var(--app-text-2)] bg-transparent'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 10.5l1.5-1.5 6-6 1.5 1.5-6 6L2 10.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M8.5 3l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            onClick={() => !isPreviewOnly && togglePreviewOnly()}
            title="Preview (⌘⇧P)"
            className={`flex items-center justify-center w-6 h-6 rounded cursor-pointer transition-colors ${
              isPreviewOnly
                ? 'bg-[var(--app-accent-dim)] text-[var(--app-accent)]'
                : 'text-[var(--app-text-3)] hover:text-[var(--app-text-2)] bg-transparent'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <ellipse cx="6.5" cy="6.5" rx="5" ry="3.5" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="6.5" cy="6.5" r="1.8" fill="currentColor"/>
            </svg>
          </button>
        </div>
        </div>
        {/* Metadata header */}
        <div className="shrink-0 pt-8 px-6 max-w-[720px] w-full mx-auto overflow-visible relative z-10">
          {/* Title — uncontrolled contentEditable, set via ref */}
          <div
            ref={titleRef}
            contentEditable={!isPreviewOnly}
            suppressContentEditableWarning
            onInput={handleTitleInput}
            data-placeholder="Sem título"
            className="text-[26px] font-medium text-[var(--app-text-1)] leading-[1.25] tracking-[-0.6px] outline-none cursor-text min-h-8 empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--app-text-3)]"
          />

          {/* Notebook name */}
          {notebookName && (
            <div className="flex items-center gap-[5px] mt-[6px] mb-[10px] text-[11.5px] text-[var(--app-text-3)]">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <rect x="1" y="1.5" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
                <line x1="3" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                <line x1="3" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                <line x1="3" y1="8" x2="5.5" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              {notebookName}
            </div>
          )}

          {/* Tags — interactive */}
          <div className={notebookName ? '' : 'mt-[10px]'}>
            <TagBar tags={tags} availableTags={manifestTags} onAdd={handleAddTag} onRemove={handleRemoveTag} />
          </div>

          {/* Date / read time row */}
          <div className="flex items-center text-[11.5px] text-[var(--app-text-3)] mb-6 gap-3">
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

        {/* Editor / Preview */}
        {isPreviewOnly ? (
          <div className="flex-1 overflow-auto max-w-[720px] w-full mx-auto">
            <MarkdownPreview content={body} vaultPath={vaultPath} />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden max-w-[720px] w-full mx-auto">
            <CodeMirrorEditor
              key={activeNote.path}
              initialContent={body}
              onChange={handleBodyChange}
              themeMode={themeMode}
            />
          </div>
        )}

        {/* Backlinks panel */}
        {showBacklinks && (
          <div className="shrink-0 border-t-[0.5px] border-t-[var(--app-border)] h-[220px]">
            <BacklinksPanel onClose={() => setShowBacklinks(false)} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── TagBar ───────────────────────────────────────────────

function TagBar({
  tags,
  availableTags,
  onAdd,
  onRemove,
}: {
  tags: string[]
  availableTags: { name: string; label: string; color: string }[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Tags not yet on this note
  const unassigned = availableTags.filter((t) => !tags.includes(t.name))
  const filtered = unassigned.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase()) ||
    t.label.toLowerCase().includes(filter.toLowerCase())
  )

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setFilter('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  return (
    <div className="flex items-center flex-wrap gap-1.5 mb-5 min-h-[26px]">
      {tags.map((tag) => {
        const manifest = availableTags.find((t) => t.name === tag)
        return (
          <span
            key={tag}
            onClick={() => onRemove(tag)}
            title="Clique para remover"
            className="group/tag flex items-center gap-1 px-[9px] py-[3px] bg-[var(--app-tag-bg)] border-[0.5px] border-[var(--app-border-mid)] rounded-full text-[11.5px] text-[var(--app-accent)] cursor-pointer hover:border-[var(--app-accent)] transition-colors"
          >
            {manifest?.color && (
              <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: manifest.color }} />
            )}
            #{manifest?.label || tag}
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              className="opacity-0 group-hover/tag:opacity-60 transition-opacity"
            >
              <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
        )
      })}

      {/* Add tag button + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => { setIsOpen(!isOpen); setFilter('') }}
          className="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-transparent border-[0.5px] border-dashed border-[var(--app-border-mid)] text-[var(--app-text-3)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)] transition-colors cursor-pointer"
          title="Adicionar tag"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[180px] bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg shadow-lg overflow-hidden">
            {availableTags.length > 3 && (
              <div className="p-1.5 border-b border-[var(--app-border)]">
                <input
                  autoFocus
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setIsOpen(false); setFilter('') }
                    if (e.key === 'Enter' && filtered.length === 1) {
                      onAdd(filtered[0].name)
                      setIsOpen(false)
                      setFilter('')
                    }
                  }}
                  placeholder="Filtrar…"
                  className="w-full bg-transparent border-none outline-none text-[11.5px] text-[var(--app-text-1)] placeholder:text-[var(--app-text-3)] px-1.5 py-1"
                />
              </div>
            )}
            <div className="max-h-[160px] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-[var(--app-text-3)]">
                  {unassigned.length === 0 ? 'Todas as tags já adicionadas' : 'Nenhuma tag encontrada'}
                </div>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => { onAdd(t.name); setIsOpen(false); setFilter('') }}
                    className="flex items-center gap-2 w-full px-3 py-[5px] text-left text-[11.5px] text-[var(--app-text-1)] hover:bg-[var(--app-hover)] transition-colors cursor-pointer bg-transparent border-none"
                  >
                    <span className="w-[8px] h-[8px] rounded-full shrink-0" style={{ background: t.color }} />
                    {t.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
