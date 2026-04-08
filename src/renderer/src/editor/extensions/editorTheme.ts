import { EditorView } from '@codemirror/view'
import { Compartment, Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { oneDark } from '@codemirror/theme-one-dark'

// ── Theme compartment (reconfigured without remount) ──────

export const themeCompartment = new Compartment()

// ── Dark theme ────────────────────────────────────────────
// oneDark provides syntax colors; baseTheme forces transparent bg

export const darkEditorTheme: Extension = [
  oneDark,
  EditorView.theme({
    '&': { background: 'transparent !important' },
    '.cm-scroller': { overflow: 'auto' },
    '.cm-focused': { outline: 'none !important' },
    '.cm-gutters': { display: 'none' },
    '.cm-cursor': { borderLeftColor: '#C05010 !important', borderLeftWidth: '2px' },
    '.cm-activeLine': { backgroundColor: 'rgba(192,80,16,0.05) !important' },
    '.cm-selectionBackground, ::selection': { backgroundColor: 'rgba(192,80,16,0.20) !important' },
  })
]

// ── Light HighlightStyle ──────────────────────────────────

const lightHighlight = HighlightStyle.define([
  // Headings
  { tag: tags.heading1, color: '#1E0E04', fontWeight: '700' },
  { tag: tags.heading2, color: '#2A1208', fontWeight: '600' },
  { tag: tags.heading3, color: '#361A0C', fontWeight: '600' },
  { tag: [tags.heading4, tags.heading5, tags.heading6], color: '#4A2810', fontWeight: '600' },

  // Emphasis & strong
  { tag: tags.strong, color: '#1E0E04', fontWeight: '700' },
  { tag: tags.emphasis, color: '#2A1A0C', fontStyle: 'italic' },
  { tag: tags.strikethrough, color: '#8A5C38', textDecoration: 'line-through' },

  // Links & URLs
  { tag: tags.link, color: '#C05010', textDecoration: 'underline' },
  { tag: tags.url, color: '#8A4A28' },

  // Code (inline / monospace)
  { tag: [tags.monospace, tags.processingInstruction], color: '#7A3808' },

  // Strings & template literals
  { tag: tags.string, color: '#2A6010' },
  { tag: tags.special(tags.string), color: '#1A5A10' },
  { tag: tags.escape, color: '#C05010' },
  { tag: tags.regexp, color: '#1A6A30' },

  // Keywords — control flow, definitions, modules
  { tag: tags.keyword, color: '#963A0A', fontWeight: '600' },
  { tag: tags.controlKeyword, color: '#8A2A00', fontWeight: '600' },
  { tag: tags.definitionKeyword, color: '#7A3000', fontWeight: '600' },
  { tag: tags.moduleKeyword, color: '#963A0A', fontWeight: '600' },
  { tag: tags.modifier, color: '#7A3A0A', fontStyle: 'italic' },
  { tag: tags.operatorKeyword, color: '#963A0A' },
  { tag: tags.operator, color: '#4A2A0A' },

  // Functions & definitions
  { tag: tags.function(tags.variableName), color: '#1A4A90', fontWeight: '500' },
  { tag: tags.function(tags.propertyName), color: '#1A4A90' },
  { tag: tags.definition(tags.variableName), color: '#1E3A7A' },
  { tag: tags.definition(tags.propertyName), color: '#1A3A70' },
  { tag: tags.special(tags.variableName), color: '#6A1A8A' },  // this, self, super

  // Values / numbers / atoms / booleans
  { tag: [tags.number, tags.bool, tags.null], color: '#1A5A8A' },
  { tag: tags.atom, color: '#2A6010' },

  // Comments
  { tag: tags.comment, color: '#9A7050', fontStyle: 'italic' },
  { tag: tags.lineComment, color: '#9A7050', fontStyle: 'italic' },
  { tag: tags.blockComment, color: '#8A6040', fontStyle: 'italic' },
  { tag: tags.docComment, color: '#7A5830', fontStyle: 'italic' },

  // Types, classes, namespaces
  { tag: [tags.typeName, tags.className], color: '#6A2090' },
  { tag: tags.namespace, color: '#5A1A80' },
  { tag: tags.typeOperator, color: '#6A2090' },

  // Variables / properties
  { tag: tags.variableName, color: '#1E0E04' },
  { tag: tags.propertyName, color: '#4A2010' },
  { tag: tags.labelName, color: '#7A4A28' },

  // Punctuation, brackets
  { tag: [tags.bracket, tags.paren, tags.squareBracket], color: '#8A5C38' },
  { tag: tags.punctuation, color: '#9A6840' },
  { tag: tags.separator, color: '#9A6840' },

  // Meta / tag names (HTML/JSX)
  { tag: tags.tagName, color: '#963A0A' },
  { tag: tags.attributeName, color: '#4A2090' },
  { tag: tags.attributeValue, color: '#2A6010' },
  { tag: tags.angleBracket, color: '#8A5C38' },

  // List marks, quote marks
  { tag: tags.list, color: '#8A5038' },
  { tag: tags.quote, color: '#7A4A28' },

  // Invalid
  { tag: tags.invalid, color: '#A02020', textDecoration: 'underline' },
])

// ── Light base theme ──────────────────────────────────────

const lightBaseTheme = EditorView.theme({
  '&': {
    background: 'transparent !important',
    color: '#1E0E04',
  },
  '.cm-content': {
    caretColor: '#C05010',
  },
  '.cm-focused': { outline: 'none !important' },
  '.cm-gutters': { display: 'none' },
  '.cm-cursor': {
    borderLeftColor: '#C05010 !important',
    borderLeftWidth: '2px',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(192,80,16,0.04) !important',
  },
  '.cm-selectionBackground, .cm-selectionBackground *': {
    backgroundColor: 'rgba(192,80,16,0.18) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(192,80,16,0.22) !important',
  },
  '::selection': {
    backgroundColor: 'rgba(192,80,16,0.18) !important',
  },
  // Selection in non-focused
  '.cm-line': { padding: '0' },
}, { dark: false })

export const lightEditorTheme: Extension = [
  lightBaseTheme,
  syntaxHighlighting(lightHighlight),
]

// ── Helper to get the right theme extension ───────────────

export function getEditorTheme(mode: 'dark' | 'light'): Extension {
  return mode === 'dark' ? darkEditorTheme : lightEditorTheme
}
