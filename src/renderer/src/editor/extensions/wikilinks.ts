import {
  ViewPlugin,
  ViewUpdate,
  DecorationSet,
  Decoration,
  EditorView,
  WidgetType
} from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g

class WikilinkWidget extends WidgetType {
  constructor(private readonly title: string) {
    super()
  }

  eq(other: WikilinkWidget): boolean {
    return other.title === this.title
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-wikilink-pill'
    span.textContent = this.title
    span.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      document.dispatchEvent(new CustomEvent('hai:open-note', { detail: { title: this.title } }))
    })
    return span
  }

  ignoreEvent(): boolean {
    return true
  }
}

function cursorOnLine(view: EditorView, from: number): boolean {
  const line = view.state.doc.lineAt(from)
  return view.state.selection.ranges.some(
    (r) => r.head >= line.from && r.head <= line.to
  )
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const decorations: Array<{ from: number; to: number; deco: Decoration }> = []

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    let match: RegExpExecArray | null

    WIKILINK_RE.lastIndex = 0
    while ((match = WIKILINK_RE.exec(text)) !== null) {
      const start = from + match.index
      const end = start + match[0].length
      const title = match[1]

      if (cursorOnLine(view, start)) {
        decorations.push({
          from: start,
          to: end,
          deco: Decoration.mark({ class: 'cm-wikilink-raw' })
        })
      } else {
        decorations.push({
          from: start,
          to: end,
          deco: Decoration.replace({ widget: new WikilinkWidget(title) })
        })
      }
    }
  }

  decorations.sort((a, b) => a.from - b.from || a.to - b.to)

  for (const { from, to, deco } of decorations) {
    builder.add(from, to, deco)
  }

  return builder.finish()
}

const wikilinksTheme = EditorView.baseTheme({
  '.cm-wikilink-pill': {
    display: 'inline-block',
    padding: '0 6px',
    borderRadius: '4px',
    background: 'rgba(192, 80, 16, 0.15)',
    border: '1px solid rgba(192, 80, 16, 0.40)',
    color: '#E88A50',
    fontSize: '0.9em',
    lineHeight: '1.5',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.15s'
  },
  '.cm-wikilink-pill:hover': {
    background: 'rgba(192, 80, 16, 0.25)'
  },
  '.cm-wikilink-raw': {
    color: '#D06828'
  }
})

export const wikilinksExtension = [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view)
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = buildDecorations(update.view)
        }
      }
    },
    { decorations: (v) => v.decorations }
  ),
  wikilinksTheme
]
