# Editor v2 Design

**Spec**: `.specs/features/editor-v2/spec.md`
**Status**: Draft

---

## Architecture Overview

O inline rendering é implementado como uma extensão CodeMirror 6 customizada. A extensão parseia o markdown AST via `syntaxTree(state)` do lezer e aplica decorações que escondem syntax markers e estilizam o conteúdo quando o cursor não está no range.

```
CodeMirror 6 Extension Stack:
  ┌─────────────────────────────────────┐
  │  inlineMarkdownExtension            │  ← customizado: hide syntax, estilo inline
  │    StateField<DecorationSet>        │
  │    ViewPlugin (cursor tracking)     │
  ├─────────────────────────────────────┤
  │  syntaxHighlightExtension           │  ← code blocks com lang packs
  │    markdown({ codeLanguages })      │
  ├─────────────────────────────────────┤
  │  vimExtension (condicional)         │  ← @replit/codemirror-vim
  ├─────────────────────────────────────┤
  │  fontTheme (dinâmico)               │  ← EditorView.theme com CSS vars
  ├─────────────────────────────────────┤
  │  base: keymap, history, lineWrapping│
  └─────────────────────────────────────┘
```

O `CodeMirrorEditor.tsx` existente (T18) recebe as extensões como props. Editor v2 substitui as extensões base por este stack.

---

## Core Concept: "Smart Hide" via Decorations

A abordagem mais robusta para inline rendering no CodeMirror 6 usa `Decoration.mark` para:
1. **Esconder syntax markers**: classe CSS com `display: none` ou `font-size: 0; width: 0`
2. **Estilizar o conteúdo**: classe CSS com os estilos visuais (font-size, font-weight, color, etc.)

A detecção de cursor acontece no `ViewPlugin.update()`: a cada mudança de seleção, recalcula quais ranges têm cursor ativo e remove as decorações de "esconder" nesses ranges.

```
syntaxTree(state) → iterar nós markdown
  ↓ para cada nó (Heading, Bold, etc.)
  ↓ cursor dentro do range?
    SIM → sem decoração (markdown cru visível)
    NÃO → Decoration.mark em syntax markers (hide) + mark no conteúdo (style)
```

---

## Inline Rendering Extension

### Arquivo principal
`src/editor/extensions/inlineMarkdown.ts`

### Nós do lezer que precisamos tratar

| Lezer node | Syntax markers | Decoração de conteúdo |
|---|---|---|
| `ATXHeading1` | `#·` | `.cm-h1` (font-size: 1.8em, bold) |
| `ATXHeading2` | `##·` | `.cm-h2` (font-size: 1.5em, bold) |
| `ATXHeading3` | `###·` | `.cm-h3` (font-size: 1.25em, bold) |
| `StrongEmphasis` | `**` ou `__` (abertura + fechamento) | `.cm-bold` (font-weight: bold) |
| `Emphasis` | `*` ou `_` (abertura + fechamento) | `.cm-italic` (font-style: italic) |
| `InlineCode` | `` ` `` (abertura + fechamento) | `.cm-inline-code` (fundo surface, monospace) |
| `Link` | `[`, `](url)` | `.cm-link-text` (sublinhado, cor primária) |
| `ListItem` > `ListMark` | `-·` ou `*·` ou `N.·` | `.cm-list-bullet` (substituído por `•`) |

### Implementação

```typescript
// src/editor/extensions/inlineMarkdown.ts
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from '@codemirror/view'
import { EditorState, Range } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = []
  const { state } = view
  const cursorPos = state.selection.main.head

  // Para cada viewport visível (performance: não processa todo o documento)
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from, to,
      enter(node) {
        const cursorInRange = cursorPos >= node.from && cursorPos <= node.to
        if (cursorInRange) return  // skip: mostrar markdown cru

        switch (node.name) {
          case 'ATXHeading1': decorateHeading(node, 1, decorations, state); break
          case 'ATXHeading2': decorateHeading(node, 2, decorations, state); break
          case 'ATXHeading3': decorateHeading(node, 3, decorations, state); break
          case 'StrongEmphasis': decorateStrong(node, decorations, state); break
          case 'Emphasis': decorateEmphasis(node, decorations, state); break
          case 'InlineCode': decorateInlineCode(node, decorations, state); break
          case 'Link': decorateLink(node, decorations, state); break
          case 'ListMark': decorateListMark(node, decorations); break
        }
      }
    })
  }

  return Decoration.set(decorations.sort((a, b) => a.from - b.from))
}

export const inlineMarkdownExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)
```

### Helper: decorateHeading

```typescript
function decorateHeading(node: SyntaxNode, level: number, decorations: Range<Decoration>[], state: EditorState) {
  // Esconder "# " no início
  const markerEnd = node.from + level + 1  // "### " = level chars + 1 espaço
  decorations.push(
    Decoration.mark({ class: 'cm-md-hidden' }).range(node.from, markerEnd)
  )
  // Estilizar o texto restante
  decorations.push(
    Decoration.mark({ class: `cm-h${level}` }).range(markerEnd, node.to)
  )
}
```

---

## Syntax Highlight em Code Blocks

Usar `markdown()` do `@codemirror/lang-markdown` com a opção `codeLanguages` — isso já faz syntax highlight automático dentro de fenced code blocks.

```typescript
// src/editor/extensions/syntaxHighlight.ts
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'

export const syntaxHighlightExtension = markdown({
  codeLanguages: languages  // inclui todos os language packs do @codemirror/language-data
})
```

**Linguagens incluídas via `@codemirror/language-data`**: JavaScript, TypeScript, Python, Bash, JSON, CSS, HTML, Markdown, Go, Rust, SQL, YAML, entre outros — lazy loaded automaticamente.

---

## Vim Mode

```typescript
// src/editor/extensions/vimMode.ts
import { vim } from '@replit/codemirror-vim'
import { Compartment } from '@codemirror/state'

export const vimCompartment = new Compartment()

// No CodeMirrorEditor: inicializar com vimCompartment.of([])
// Quando settings muda:
export function toggleVimMode(view: EditorView, enabled: boolean) {
  view.dispatch({
    effects: vimCompartment.reconfigure(enabled ? vim() : [])
  })
}
```

`Compartment` permite reconfigurar extensões em runtime sem recriar o editor inteiro — mantém histórico de undo, seleção e scroll position intactos.

**Statusbar vim**: `vim()` expõe um `statusbar` que pode ser lido via `vimGetCm(view)?.state?.vim?.mode`. Componente `VimStatusBar.tsx` lê isso e exibe `NORMAL` / `INSERT` / `VISUAL`.

---

## Font Settings via EditorView.theme

```typescript
// src/editor/extensions/fontTheme.ts
import { EditorView } from '@codemirror/view'
import { Compartment } from '@codemirror/state'

export const fontCompartment = new Compartment()

export function createFontTheme(fontFamily: string, fontSize: number, lineHeight: number) {
  return EditorView.theme({
    '.cm-content': {
      fontFamily,
      fontSize: `${fontSize}px`,
      lineHeight: `${lineHeight}`,
    },
    '.cm-line': { padding: '0 4px' },
  })
}

// Default: JetBrains Mono 14px 1.7
export const defaultFontTheme = createFontTheme("'JetBrains Mono', monospace", 14, 1.7)

export function updateFontTheme(view: EditorView, fontFamily: string, fontSize: number, lineHeight: number) {
  view.dispatch({
    effects: fontCompartment.reconfigure(createFontTheme(fontFamily, fontSize, lineHeight))
  })
}
```

---

## CSS para Inline Decorations

```css
/* src/editor/inlineMarkdown.css */

/* Syntax markers ocultos */
.cm-md-hidden { display: none; }

/* Headings */
.cm-h1 { font-size: 1.8em; font-weight: 700; line-height: 1.3; }
.cm-h2 { font-size: 1.5em; font-weight: 700; line-height: 1.3; }
.cm-h3 { font-size: 1.25em; font-weight: 600; line-height: 1.3; }

/* Inline formatting */
.cm-bold { font-weight: 700; }
.cm-italic { font-style: italic; }
.cm-inline-code {
  font-family: inherit; /* já monospace no editor */
  background: var(--surface-2);
  border-radius: 3px;
  padding: 0 3px;
  font-size: 0.9em;
}

/* Links */
.cm-link-text {
  color: var(--color-primary);
  text-decoration: underline;
  cursor: pointer;
}

/* List bullets: substitui "-" por "•" via content */
.cm-list-bullet { color: transparent; }
.cm-list-bullet::before { content: '•'; color: var(--color-muted); }
```

---

## Components

### `CodeMirrorEditor.tsx` (atualizado)
- Recebe `extensions?: Extension[]` adicionais como prop
- Internamente: monta o stack completo de extensões v2
- Expõe `viewRef: React.RefObject<EditorView>` para toggles de vim/font

### `VimStatusBar.tsx`
- **Purpose**: Exibe modo vim atual na statusbar
- **Location**: `src/components/editor/VimStatusBar.tsx`
- **Interfaces**:
  - Lê modo via `vimGetCm(editorView)` ou estado do store
  - Exibe `NORMAL` / `INSERT` / `VISUAL` em monospace pequeno
  - Visível apenas quando vim mode ativo (`settingsStore.vimMode`)

### `settingsStore` (adições para editor)
```typescript
interface EditorSettings {
  vimMode: boolean
  fontFamily: string         // default: 'JetBrains Mono'
  fontSize: number           // default: 14
  lineHeight: number         // default: 1.7
}
```

---

## Extension Composition no CodeMirrorEditor

```typescript
// src/components/editor/CodeMirrorEditor.tsx

function buildExtensions(settings: EditorSettings): Extension[] {
  return [
    // Base
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.lineWrapping,

    // Markdown + syntax highlight em code blocks
    syntaxHighlightExtension,           // markdown({ codeLanguages: languages })

    // Inline rendering (Typora-style)
    inlineMarkdownExtension,            // ViewPlugin customizado

    // Vim mode (condicional via Compartment)
    vimCompartment.of(settings.vimMode ? vim() : []),

    // Font theme (configurável via Compartment)
    fontCompartment.of(createFontTheme(settings.fontFamily, settings.fontSize, settings.lineHeight)),

    // Tema visual (dark/light)
    editorTheme,
  ]
}
```

---

## Ctrl+Click em Links

```typescript
// No inlineMarkdownExtension, adicionar handler de click:
EditorView.domEventHandlers({
  click(event, view) {
    if (!event.ctrlKey && !event.metaKey) return false
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos === null) return false
    // Encontrar nó Link na posição
    const node = syntaxTree(view.state).resolveInner(pos, 1)
    if (node.name === 'URL') {
      const url = view.state.sliceDoc(node.from, node.to)
      window.electronAPI.shell.openExternal(url)
      return true
    }
    return false
  }
})
```

---

## Tech Decisions

| Decisão | Escolha | Motivo |
|---|---|---|
| Inline rendering | `ViewPlugin` + `Decoration.mark` (smart hide) | Mais estável que `WidgetType` para text nodes; sem problemas de cursor |
| Parse de markdown | `syntaxTree(state)` do lezer (já embutido no `@codemirror/lang-markdown`) | Zero deps extras; AST preciso |
| Code block highlight | `markdown({ codeLanguages: languages })` | Oficial do CodeMirror 6; lazy loading por linguagem |
| Vim mode | `@replit/codemirror-vim` | Única lib madura de vim para CM6; mantida pelo Replit |
| Reconfiguration | `Compartment` para vim e font | Reconfigurar em runtime sem recriar editor (mantém undo history) |
| Cursor tracking | `update.selectionSet` no ViewPlugin | Dispara apenas quando cursor move, não em todo keystroke |
| List bullets | CSS `::before` com `content: '•'` | Sem substituição DOM — apenas visual |
| Focus mode | Padding + max-width via classe no container | Não precisa de extensão CM; só CSS |

---

## Notas de Implementação: Armadilhas Conhecidas

1. **Decorações fora de ordem**: `Decoration.set()` exige ranges sorted por `from`. Sempre fazer `.sort((a, b) => a.from - b.from)`.

2. **Heading marker size**: O `ATXHeading1` do lezer inclui o `# ` no `node.from`. Verificar com `console.log(state.sliceDoc(node.from, node.from + 3))` para confirmar o tamanho exato do marker antes de implementar.

3. **Cursor no início/fim de linha**: Para headings, o cursor na mesma linha (não necessariamente no `#`) deve mostrar o markdown cru. Verificar se `cursorPos >= node.from && cursorPos <= node.to` é suficiente ou se precisa comparar número de linha.

4. **`@replit/codemirror-vim` e ESM**: Pode precisar de configuração extra no `electron.vite.config.ts` para bundling correto. Verificar se precisa de `optimizeDeps.include`.

5. **Performance com muitos nós**: Usar `view.visibleRanges` em vez de iterar o documento inteiro. Para documentos com >1000 linhas, importante não processar fora do viewport.
