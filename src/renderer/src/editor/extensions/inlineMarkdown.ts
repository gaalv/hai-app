import {
  ViewPlugin,
  ViewUpdate,
  DecorationSet,
  Decoration,
  EditorView
} from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

// ── Helpers ──────────────────────────────────────────────

function cursorOnLine(view: EditorView, from: number): boolean {
  const line = view.state.doc.lineAt(from)
  return view.state.selection.ranges.some(
    (r) => r.head >= line.from && r.head <= line.to
  )
}

// ── Decorations builder ────────────────────────────────

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

// ── Click handler for links ────────────────────────────

const linkClickHandler = EditorView.domEventHandlers({
  click(event, view) {
    if (!event.metaKey && !event.ctrlKey) return false

    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos == null) return false

    const tree = syntaxTree(view.state)
    let url: string | null = null

    tree.resolve(pos, 1).cursor().iterate((node) => {
      if (node.name === 'URL') {
        url = view.state.doc.sliceString(node.from, node.to)
      }
    })

    // Also check parent Link node for URL child
    if (!url) {
      const node = tree.resolve(pos, 1)
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
      // shell.openExternal not currently exposed — links are opened via setWindowOpenHandler
      return true
    }

    return false
  }
})

// ── View Plugin ────────────────────────────────────────

export const inlineMarkdownExtension = [
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
  linkClickHandler
]
