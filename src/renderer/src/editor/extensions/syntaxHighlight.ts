import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'

export const syntaxHighlightExtension = markdown({ codeLanguages: languages })
