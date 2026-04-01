import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { GFM } from '@lezer/markdown'

export const syntaxHighlightExtension = markdown({
  codeLanguages: languages,
  extensions: [GFM]
})
