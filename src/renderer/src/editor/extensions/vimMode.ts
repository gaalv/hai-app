import { Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { vim } from '@replit/codemirror-vim'

export const vimCompartment = new Compartment()

export function toggleVimMode(view: EditorView, enabled: boolean): void {
  view.dispatch({
    effects: vimCompartment.reconfigure(enabled ? vim() : [])
  })
}
