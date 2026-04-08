import { useEffect, useRef, useState } from 'react'

interface Template {
  name: string
  content: string
  isBuiltin: boolean
}

interface Props {
  onSelect: (content: string) => void
  onCancel: () => void
}

export function applyTemplate(content: string, title: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return content.replace(/\{\{date\}\}/g, date).replace(/\{\{title\}\}/g, title)
}

function getPreview(content: string): string {
  return content
    .split('\n')
    .slice(0, 2)
    .join(' ')
    .replace(/^#+\s/, '')
    .trim()
}

export function TemplatePickerModal({ onSelect, onCancel }: Props): JSX.Element {
  const [templates, setTemplates] = useState<Template[]>([])
  // 0 = blank note, 1..n = templates index + 1
  const [focusedIdx, setFocusedIdx] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    window.electronAPI.templates.list().then(setTemplates).catch(() => setTemplates([]))
  }, [])

  // total items: blank + all templates
  const totalItems = 1 + templates.length

  useEffect(() => {
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIdx((i) => (i + 1) % totalItems)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIdx((i) => (i - 1 + totalItems) % totalItems)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (focusedIdx === 0) {
          onSelect('')
        } else {
          const tpl = templates[focusedIdx - 1]
          if (tpl) onSelect(tpl.content)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [focusedIdx, totalItems, templates, onSelect, onCancel])

  const builtins = templates.filter((t) => t.isBuiltin)
  const custom = templates.filter((t) => !t.isBuiltin)

  // Compute index offsets for rendering: blank=0, builtins start at 1
  let itemIdx = 1

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--app-main)] border-[0.5px] border-[var(--app-border)] rounded-xl w-[480px] max-h-[520px] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b-[0.5px] border-[var(--app-border)] shrink-0">
          <p className="text-[13px] font-sans font-medium text-[var(--app-text-1)]">
            New note from template
          </p>
          <button
            className="text-[var(--app-text-3)] hover:text-[var(--app-text-1)] transition-colors cursor-pointer text-[18px] leading-none"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* List */}
        <ul
          ref={listRef}
          className="flex-1 overflow-y-auto py-2"
          role="listbox"
          aria-label="Templates"
        >
          {/* Blank note option */}
          <li
            role="option"
            aria-selected={focusedIdx === 0}
            className={`mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
              focusedIdx === 0
                ? 'bg-[var(--app-accent-dim)] text-[var(--app-text-1)]'
                : 'text-[var(--app-text-2)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)]'
            }`}
            onClick={() => onSelect('')}
            onMouseEnter={() => setFocusedIdx(0)}
          >
            <p className="text-[12px] font-sans font-medium">Blank note</p>
            <p className="text-[10px] font-sans text-[var(--app-text-3)] mt-0.5">
              Start with an empty note
            </p>
          </li>

          {/* Built-in templates */}
          {builtins.length > 0 && (
            <>
              <li className="px-5 pt-3 pb-1">
                <p className="text-[10px] font-sans uppercase tracking-widest text-[var(--app-text-3)]">
                  Built-in
                </p>
              </li>
              {builtins.map((tpl) => {
                const idx = itemIdx++
                return (
                  <li
                    key={tpl.name}
                    role="option"
                    aria-selected={focusedIdx === idx}
                    className={`mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      focusedIdx === idx
                        ? 'bg-[var(--app-accent-dim)] text-[var(--app-text-1)]'
                        : 'text-[var(--app-text-2)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)]'
                    }`}
                    onClick={() => onSelect(tpl.content)}
                    onMouseEnter={() => setFocusedIdx(idx)}
                  >
                    <p className="text-[12px] font-sans font-medium">{tpl.name}</p>
                    <p className="text-[10px] font-sans text-[var(--app-text-3)] mt-0.5 truncate">
                      {getPreview(tpl.content)}
                    </p>
                  </li>
                )
              })}
            </>
          )}

          {/* Custom templates */}
          {custom.length > 0 && (
            <>
              <li className="px-5 pt-3 pb-1">
                <p className="text-[10px] font-sans uppercase tracking-widest text-[var(--app-text-3)]">
                  Custom
                </p>
              </li>
              {custom.map((tpl) => {
                const idx = itemIdx++
                return (
                  <li
                    key={tpl.name}
                    role="option"
                    aria-selected={focusedIdx === idx}
                    className={`mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      focusedIdx === idx
                        ? 'bg-[var(--app-accent-dim)] text-[var(--app-text-1)]'
                        : 'text-[var(--app-text-2)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-1)]'
                    }`}
                    onClick={() => onSelect(tpl.content)}
                    onMouseEnter={() => setFocusedIdx(idx)}
                  >
                    <p className="text-[12px] font-sans font-medium">{tpl.name}</p>
                    <p className="text-[10px] font-sans text-[var(--app-text-3)] mt-0.5 truncate">
                      {getPreview(tpl.content)}
                    </p>
                  </li>
                )
              })}
            </>
          )}
        </ul>
      </div>
    </div>
  )
}
