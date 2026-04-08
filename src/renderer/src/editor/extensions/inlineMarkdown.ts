import {
  ViewPlugin,
  ViewUpdate,
  DecorationSet,
  Decoration,
  EditorView,
  WidgetType
} from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

// ── Checkbox widget ───────────────────────────────────────

class CheckboxWidget extends WidgetType {
  constructor(private readonly checked: boolean) { super() }

  eq(other: CheckboxWidget): boolean { return other.checked === this.checked }

  toDOM(): HTMLElement {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = this.checked
    input.className = 'cm-task-checkbox'
    input.addEventListener('mousedown', (e) => e.preventDefault())
    return input
  }

  ignoreEvent(): boolean { return false }
}

// ── Helpers ──────────────────────────────────────────────

function cursorOnLine(view: EditorView, from: number): boolean {
  const line = view.state.doc.lineAt(from)
  return view.state.selection.ranges.some(
    (r) => r.head >= line.from && r.head <= line.to
  )
}

// ── Line decoration builder (code fences, blockquotes) ────

function buildLineDecorations(view: EditorView): DecorationSet {
  const lineDecos: Array<{ pos: number; deco: Decoration }> = []

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        // ── Fenced code block lines ──────────────────────
        if (node.name === 'FencedCode') {
          const startLine = view.state.doc.lineAt(node.from)
          const endLine = view.state.doc.lineAt(node.to)
          for (let ln = startLine.number; ln <= endLine.number; ln++) {
            const line = view.state.doc.line(ln)
            lineDecos.push({ pos: line.from, deco: Decoration.line({ class: 'cm-code-fence-line' }) })
          }
        }
        // ── Blockquote lines ─────────────────────────────
        if (node.name === 'Blockquote') {
          const startLine = view.state.doc.lineAt(node.from)
          const endLine = view.state.doc.lineAt(node.to)
          for (let ln = startLine.number; ln <= endLine.number; ln++) {
            const line = view.state.doc.line(ln)
            lineDecos.push({ pos: line.from, deco: Decoration.line({ class: 'cm-blockquote-line' }) })
          }
        }
      }
    })
  }

  // Line decorations must be sorted and unique per position
  lineDecos.sort((a, b) => a.pos - b.pos)
  const builder = new RangeSetBuilder<Decoration>()
  let lastPos = -1
  for (const { pos, deco } of lineDecos) {
    if (pos !== lastPos) {
      builder.add(pos, pos, deco)
      lastPos = pos
    }
  }
  return builder.finish()
}

// ── Mark decorations builder ───────────────────────────

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()

  // Collect all decorations first so we can sort them
  const decorations: Array<{ from: number; to: number; deco: Decoration }> = []

  function hide(from: number, to: number): void {
    decorations.push({ from, to, deco: Decoration.mark({ class: 'cm-md-hidden' }) })
  }

  function mark(from: number, to: number, cls: string): void {
    decorations.push({ from, to, deco: Decoration.mark({ class: cls }) })
  }

  // Only iterate visible ranges for performance
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        const nFrom = node.from
        const nTo = node.to

        // ── ATX Headings (# ## ###) ─────────────────────
        if (
          node.name === 'ATXHeading1' ||
          node.name === 'ATXHeading2' ||
          node.name === 'ATXHeading3'
        ) {
          const level = parseInt(node.name.replace('ATXHeading', ''))
          const onLine = cursorOnLine(view, nFrom)

          mark(nFrom, nTo, `cm-h${level}`)

          if (!onLine) {
            node.node.cursor().iterate((child) => {
              if (child.name === 'HeaderMark') {
                // Hide the # marker plus the trailing space
                const markTo = Math.min(child.to + 1, nTo)
                hide(child.from, markTo)
              }
            })
          }
        }

        // ── Strong (Bold) **text** or __text__ ──────────
        if (node.name === 'StrongEmphasis') {
          const onLine = cursorOnLine(view, nFrom)
          mark(nFrom, nTo, 'cm-bold')

          if (!onLine) {
            node.node.cursor().iterate((child) => {
              if (child.name === 'EmphasisMark') {
                hide(child.from, child.to)
              }
            })
          }
        }

        // ── Emphasis (Italic) *text* or _text_ ──────────
        if (node.name === 'Emphasis') {
          const onLine = cursorOnLine(view, nFrom)
          mark(nFrom, nTo, 'cm-italic')

          if (!onLine) {
            node.node.cursor().iterate((child) => {
              if (child.name === 'EmphasisMark') {
                hide(child.from, child.to)
              }
            })
          }
        }

        // ── Inline Code `code` ───────────────────────────
        if (node.name === 'InlineCode') {
          const onLine = cursorOnLine(view, nFrom)

          if (!onLine) {
            node.node.cursor().iterate((child) => {
              if (child.name === 'CodeMark') {
                hide(child.from, child.to)
              }
            })
            // Mark the inner content (between the backtick marks)
            const cursor = node.node.cursor()
            let codeFrom = nFrom
            let codeTo = nTo
            cursor.firstChild()
            if (cursor.name === 'CodeMark') codeFrom = cursor.to
            cursor.parent()
            cursor.lastChild()
            if (cursor.name === 'CodeMark') codeTo = cursor.from
            if (codeFrom < codeTo) {
              mark(codeFrom, codeTo, 'cm-inline-code')
            }
          }
        }

        // ── Links [text](url) ────────────────────────────
        if (node.name === 'Link') {
          const onLine = cursorOnLine(view, nFrom)

          if (!onLine) {
            let labelFrom = -1
            let labelTo = -1
            let urlFrom = -1
            let urlTo = -1

            node.node.cursor().iterate((child) => {
              if (child.name === 'LinkLabel') {
                labelFrom = child.from + 1  // skip [
                labelTo = child.to - 1      // skip ]
              }
              if (child.name === 'URL') {
                urlFrom = child.from
                urlTo = child.to
              }
            })

            if (labelFrom >= 0 && urlFrom >= 0) {
              hide(nFrom, labelFrom)              // hide [
              hide(labelTo, urlTo + 1)            // hide ](url)
              mark(labelFrom, labelTo, 'cm-link-text')
            }
          } else {
            // Cursor on line: only style the link label text
            node.node.cursor().iterate((child) => {
              if (child.name === 'LinkLabel') {
                mark(child.from + 1, child.to - 1, 'cm-link-text')
              }
            })
          }
        }

        // ── List bullets ─────────────────────────────────
        if (node.name === 'ListMark') {
          const onLine = cursorOnLine(view, nFrom)
          if (!onLine) {
            const markerText = view.state.doc.sliceString(nFrom, nTo)
            // Only style unordered list markers
            if (markerText === '-' || markerText === '*' || markerText === '+') {
              mark(nFrom, nTo, 'cm-list-bullet')
            }
          }
        }

        // ── Task list checkboxes ── [ ] and [x] ─────────
        if (node.name === 'TaskMarker') {
          const text = view.state.doc.sliceString(nFrom, nTo)
          const checked = text.includes('x') || text.includes('X')
          decorations.push({
            from: nFrom,
            to: nTo,
            deco: Decoration.replace({ widget: new CheckboxWidget(checked) })
          })
        }

        // ── Fenced code block — hide markers ────────────
        if (node.name === 'FencedCode') {
          node.node.cursor().iterate((child) => {
            if (child.name === 'CodeMark') {
              const onLine = cursorOnLine(view, child.from)
              if (!onLine) {
                hide(child.from, child.to)
              } else {
                mark(child.from, child.to, 'cm-code-fence-mark')
              }
            }
            if (child.name === 'CodeInfo') {
              mark(child.from, child.to, 'cm-code-fence-lang')
            }
          })
        }

        // ── Strikethrough ~~text~~ ───────────────────────
        if (node.name === 'Strikethrough') {
          const onLine = cursorOnLine(view, nFrom)
          mark(nFrom, nTo, 'cm-strikethrough')

          if (!onLine) {
            node.node.cursor().iterate((child) => {
              if (child.name === 'StrikethroughMark') {
                hide(child.from, child.to)
              }
            })
          }
        }

        // ── Horizontal rule ──────────────────────────────
        if (node.name === 'HorizontalRule') {
          mark(nFrom, nTo, 'cm-hr')
        }

        // ── Blockquote marker > ──────────────────────────
        if (node.name === 'QuoteMark') {
          mark(nFrom, nTo, 'cm-blockquote-mark')
        }
      }
    })
  }

  // Sort by from position, then by to (replacements before marks on same range)
  decorations.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from
    return a.to - b.to
  })

  // Add to builder in order, skipping overlaps
  let lastTo = -1
  for (const { from, to, deco } of decorations) {
    if (from >= lastTo) {
      builder.add(from, to, deco)
      if (to > lastTo) lastTo = to
    }
  }

  return builder.finish()
}

// ── Click handler for links and checkboxes ─────────────

const clickHandler = EditorView.domEventHandlers({
  click(event, view) {
    // Toggle checkbox widget clicks
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos == null) return false
      const node = syntaxTree(view.state).resolve(pos, 1)
      if (node.name === 'TaskMarker') {
        const text = view.state.doc.sliceString(node.from, node.to)
        const replacement = text.includes('x') || text.includes('X') ? '[ ]' : '[x]'
        view.dispatch({ changes: { from: node.from, to: node.to, insert: replacement } })
        return true
      }
    }

    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos == null) return false

    const tree = syntaxTree(view.state)
    const node = tree.resolve(pos, 1)

    // Links: Cmd/Ctrl+Click to open
    if (!event.metaKey && !event.ctrlKey) return false

    let url: string | null = null

    tree.resolve(pos, 1).cursor().iterate((n) => {
      if (n.name === 'URL') {
        url = view.state.doc.sliceString(n.from, n.to)
      }
    })

    if (!url) {
      const linkNode = node.name === 'Link' ? node : node.parent
      if (linkNode && linkNode.name === 'Link') {
        linkNode.cursor().iterate((child) => {
          if (child.name === 'URL') {
            url = view.state.doc.sliceString(child.from, child.to)
          }
        })
      }
    }

    const urlStr = url as string | null
    if (urlStr && (urlStr.startsWith('https://') || urlStr.startsWith('http://'))) {
      return true
    }

    return false
  }
})

// ── Force decoration re-render on cursor move via click ────────────────────

const clickRerender = EditorView.domEventHandlers({
  click(_event, view) {
    // Dispatch an empty transaction so selectionSet fires and decorations
    // (show/hide markers) update immediately when the user clicks to a new line.
    view.dispatch({})
    return false
  }
})

// ── View Plugin ────────────────────────────────────────

const markPlugin = ViewPlugin.fromClass(
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
)

const linePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildLineDecorations(view)
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildLineDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)

export const inlineMarkdownExtension = [
  linePlugin,
  markPlugin,
  clickHandler,
  clickRerender
]
