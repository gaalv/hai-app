/**
 * Inline markdown rendering extension for CodeMirror 6.
 * Hides syntax markers and applies formatting styles when cursor is not on the line.
 * Typora/Bear-style editing experience.
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view'
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
  const { doc } = view.state
  const tree = syntaxTree(view.state)

  // Collect decorations then sort before adding to builder
  const decorations: Array<{ from: number; to: number; deco: Decoration }> = []

  function hide(from: number, to: number): void {
    decorations.push({ from, to, deco: Decoration.replace({}) })
  }

  function mark(from: number, to: number, cls: string): void {
    decorations.push({ from, to, deco: Decoration.mark({ class: cls }) })
  }

  tree.iterate({
    enter(node) {
      const { from, to } = node

      // ── ATX Headings (# ## ###) ─────────────────────
      if (
        node.name === 'ATXHeading1' ||
        node.name === 'ATXHeading2' ||
        node.name === 'ATXHeading3' ||
        node.name === 'ATXHeading4' ||
        node.name === 'ATXHeading5' ||
        node.name === 'ATXHeading6'
      ) {
        const level = parseInt(node.name.replace('ATXHeading', ''))
        const onLine = cursorOnLine(view, from)

        // Apply heading style to the whole heading line
        mark(from, to, `cm-hai-h${level}`)

        if (!onLine) {
          // Find and hide the HeaderMark (## chars + space)
          node.node.cursor().iterate((child) => {
            if (child.name === 'HeaderMark') {
              // Hide the # marker and trailing space
              const markTo = Math.min(child.to + 1, to)
              hide(child.from, markTo)
            }
          })
        }
      }

      // ── Strong (Bold) **text** or __text__ ──────────
      if (node.name === 'StrongEmphasis') {
        const onLine = cursorOnLine(view, from)
        mark(from, to, 'cm-hai-bold')

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
        const onLine = cursorOnLine(view, from)
        mark(from, to, 'cm-hai-italic')

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
        const onLine = cursorOnLine(view, from)
        mark(from, to, 'cm-hai-code')

        if (!onLine) {
          node.node.cursor().iterate((child) => {
            if (child.name === 'CodeMark') {
              hide(child.from, child.to)
            }
          })
        }
      }

      // ── Links [text](url) ────────────────────────────
      if (node.name === 'Link') {
        const onLine = cursorOnLine(view, from)

        if (!onLine) {
          // Find and style the link parts
          let labelFrom = -1, labelTo = -1
          let urlFrom = -1, urlTo = -1

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
            // Hide [ ] ( ) and the URL — show only the label text styled
            hide(from, labelFrom)                   // hide [
            hide(labelTo, urlTo + 1)                // hide ](url)
            mark(labelFrom, labelTo, 'cm-hai-link') // style label
          }
        } else {
          // Cursor on line: just style the link label text
          node.node.cursor().iterate((child) => {
            if (child.name === 'LinkLabel') {
              mark(child.from + 1, child.to - 1, 'cm-hai-link')
            }
          })
        }
      }

      // ── Horizontal rule ──────────────────────────────
      if (node.name === 'HorizontalRule') {
        mark(from, to, 'cm-hai-hr')
      }

      // ── Blockquote ───────────────────────────────────
      if (node.name === 'Blockquote') {
        const onLine = cursorOnLine(view, from)
        mark(from, to, 'cm-hai-blockquote')

        if (!onLine) {
          node.node.cursor().iterate((child) => {
            if (child.name === 'QuoteMark') {
              hide(child.from, child.to + 1) // hide "> "
            }
          })
        }
      }

      // ── List items: hide bullet marker when off-line ─
      if (node.name === 'ListMark') {
        const onLine = cursorOnLine(view, from)
        if (!onLine) {
          // Replace bullet marker with a styled bullet widget
          const line = doc.lineAt(from)
          const indent = from - line.from
          const indentStr = ' '.repeat(indent)

          class BulletWidget extends WidgetType {
            toDOM(): HTMLElement {
              const span = document.createElement('span')
              span.textContent = indentStr + '•'
              span.className = 'cm-hai-bullet'
              return span
            }
          }

          // Only for unordered lists (single char markers)
          const markerText = doc.sliceString(from, to)
          if (markerText === '-' || markerText === '*' || markerText === '+') {
            decorations.push({
              from,
              to: Math.min(to + 1, doc.length), // hide marker + space
              deco: Decoration.replace({ widget: new BulletWidget() })
            })
          }
        }
      }
    }
  })

  // Sort by from position, then by to position (replacements before marks on same range)
  decorations.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from
    return a.to - b.to
  })

  // Remove overlapping decorations (skip if range already covered)
  let lastTo = -1
  for (const { from, to, deco } of decorations) {
    if (from >= lastTo) {
      builder.add(from, to, deco)
      if (to > lastTo) lastTo = to
    }
  }

  return builder.finish()
}

// ── View Plugin ────────────────────────────────────────

export const markdownInlineDecorations = ViewPlugin.fromClass(
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

// ── Theme ──────────────────────────────────────────────

export const markdownInlineTheme = EditorView.baseTheme({
  // Headings
  '.cm-hai-h1': { fontSize: '1.6em', fontWeight: '700', color: 'var(--text) !important', lineHeight: '1.3' },
  '.cm-hai-h2': { fontSize: '1.3em', fontWeight: '700', color: 'var(--text) !important', lineHeight: '1.4' },
  '.cm-hai-h3': { fontSize: '1.1em', fontWeight: '600', color: 'var(--text) !important' },
  '.cm-hai-h4': { fontSize: '1em',   fontWeight: '600', color: 'var(--text-2) !important' },
  '.cm-hai-h5': { fontSize: '0.9em', fontWeight: '600', color: 'var(--text-2) !important' },
  '.cm-hai-h6': { fontSize: '0.85em', fontWeight: '600', color: 'var(--text-3) !important' },

  // Inline styles
  '.cm-hai-bold':   { fontWeight: '700' },
  '.cm-hai-italic': { fontStyle: 'italic' },
  '.cm-hai-code': {
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'var(--surface-3) !important',
    color: 'var(--accent) !important',
    padding: '1px 5px',
    borderRadius: '4px',
    fontSize: '0.875em'
  },

  // Links
  '.cm-hai-link': {
    color: 'var(--accent) !important',
    textDecoration: 'underline',
    textDecorationStyle: 'dotted',
    cursor: 'pointer'
  },

  // Horizontal rule
  '.cm-hai-hr': { color: 'var(--border-2) !important' },

  // Blockquote
  '.cm-hai-blockquote': {
    borderLeft: '3px solid var(--border-2)',
    paddingLeft: '12px',
    color: 'var(--text-2) !important',
    fontStyle: 'italic'
  },

  // Bullet replacement
  '.cm-hai-bullet': { color: 'var(--accent)', marginRight: '4px' }
})
