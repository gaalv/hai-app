import { Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

export const fontCompartment = new Compartment()

export function createFontTheme(fontFamily: string, fontSize: number, lineHeight: number) {
  return EditorView.theme({
    '&': { fontFamily, fontSize: `${fontSize}px` },
    '.cm-content': { lineHeight: String(lineHeight) }
  })
}

export const defaultFontTheme = createFontTheme("'JetBrains Mono', monospace", 14, 1.7)

export function updateFontTheme(
  view: EditorView,
  fontFamily: string,
  fontSize: number,
  lineHeight: number
): void {
  view.dispatch({
    effects: fontCompartment.reconfigure(createFontTheme(fontFamily, fontSize, lineHeight))
  })
}
