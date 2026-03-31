# Editor v2 Tasks

**Design**: `.specs/features/editor-v2/design.md`
**Status**: Draft

> Tasks T120–T135. Depende de Note Editor (T12–T24) concluído — especificamente T18 (CodeMirrorEditor base) e T12 (deps CM6 instaladas).

---

## Execution Plan

```
Phase 1 — Dependências adicionais (Sequential):
  T120

Phase 2 — Extensões base (Parallel após T120):
       ┌→ T121 [P] (syntaxHighlight — code blocks)
  T120 ┼→ T122 [P] (inlineMarkdown — estrutura base + headings)
       └→ T123 [P] (font theme + Compartment)

Phase 3 — Inline elements (Parallel após T122):
       ┌→ T124 [P] (bold/italic)
  T122 ┼→ T125 [P] (inline code)
       ├→ T126 [P] (links + Ctrl+Click)
       └→ T127 [P] (list bullets)

Phase 4 — Vim mode (Sequential após T120):
  T120 → T128 → T129

Phase 5 — Composição + Settings (Sequential após Phase 2+3+4):
  T121+T124+T125+T126+T127+T128 → T130 → T131

Phase 6 — Settings UI + Integração final:
  T123+T131 → T132 → T133 → T134 → T135
```

---

## Task Breakdown

### T120: Instalar dependências do Editor v2

**What**: Instalar `@codemirror/language-data` (language packs para code blocks) e `@replit/codemirror-vim`
**Where**: `package.json`
**Depends on**: T12 (CM6 base já instalado)
**Requirement**: EDITOR2-04, EDITOR2-07

**Done quando**:
- [ ] `@codemirror/language-data` instalado
- [ ] `@replit/codemirror-vim` instalado
- [ ] Verificar compatibilidade ESM: `electron.vite.config.ts` com `optimizeDeps.include` se necessário
- [ ] `npm run dev` sem erros de import

**Verify**: `import { languages } from '@codemirror/language-data'` e `import { vim } from '@replit/codemirror-vim'` no renderer sem erros

**Commit**: `chore(editor-v2): install language-data and codemirror-vim`

---

### T121: Criar extensão de syntax highlight em code blocks [P]

**What**: Configurar `markdown({ codeLanguages: languages })` para syntax highlight automático em fenced code blocks
**Where**: `src/editor/extensions/syntaxHighlight.ts`
**Depends on**: T120
**Requirement**: EDITOR2-04

**Done quando**:
- [ ] `syntaxHighlightExtension` exportado: `markdown({ codeLanguages: languages })`
- [ ] Testado com ` ```js `, ` ```python `, ` ```bash `, ` ```json ` — cada um com cores corretas
- [ ] Language packs carregados lazy (não aumentam bundle inicial)
- [ ] Substituir o `markdown()` simples do T18 por esta extensão

**Verify**: Digitar ` ```javascript\nconst x = 1\n``` ` no editor → `const` aparece colorido como keyword JS

**Commit**: `feat(editor-v2): add syntax highlight to fenced code blocks via language-data`

---

### T122: Criar estrutura base do inlineMarkdown extension + headings [P]

**What**: Implementar `ViewPlugin` base com `syntaxTree` + `buildDecorations` + CSS; implementar decorações de headings H1/H2/H3
**Where**: `src/editor/extensions/inlineMarkdown.ts`, `src/editor/inlineMarkdown.css`
**Depends on**: T120
**Requirement**: EDITOR2-01

**Done quando**:
- [ ] `ViewPlugin` estruturado conforme design: recalcula decorações em `docChanged`, `selectionSet`, `viewportChanged`
- [ ] `buildDecorations` itera `syntaxTree` apenas no `visibleRanges` (performance)
- [ ] Decorações H1: marker `# ` → `.cm-md-hidden`; texto → `.cm-h1`
- [ ] Decorações H2: marker `## ` → `.cm-md-hidden`; texto → `.cm-h2`
- [ ] Decorações H3: marker `### ` → `.cm-md-hidden`; texto → `.cm-h3`
- [ ] Cursor na mesma linha: sem decorações (markdown cru visível)
- [ ] CSS: `.cm-h1 { font-size: 1.8em; font-weight: 700 }` etc.
- [ ] Verificar tamanho exato dos markers com `state.sliceDoc` antes de implementar (ver nota de armadilha no design)
- [ ] `Decoration.set()` recebe ranges sorted por `from`

**Verify**:
- Digitar `# Título` → mover cursor para outra linha → `#` some, "Título" aparece grande
- Voltar cursor para a linha → `# Título` cru aparece novamente

**Commit**: `feat(editor-v2): create inline markdown ViewPlugin with heading decorations`

---

### T123: Criar font theme com Compartment [P]

**What**: Implementar sistema de font theme configurável via `Compartment` e `EditorView.theme`
**Where**: `src/editor/extensions/fontTheme.ts`
**Depends on**: T120
**Requirement**: EDITOR2-08

**Done quando**:
- [ ] `fontCompartment` exportado como `new Compartment()`
- [ ] `createFontTheme(fontFamily, fontSize, lineHeight): Extension` implementado
- [ ] `defaultFontTheme = createFontTheme("'JetBrains Mono', monospace", 14, 1.7)` exportado
- [ ] `updateFontTheme(view, fontFamily, fontSize, lineHeight)` — despacha `fontCompartment.reconfigure`
- [ ] `settingsStore` estendido com `fontFamily`, `fontSize`, `lineHeight` e defaults
- [ ] `electron-store` persiste font settings entre sessões

**Verify**: Mudar font size nas settings → editor atualiza imediatamente sem recriar o EditorView

**Commit**: `feat(editor-v2): create configurable font theme with Compartment`

---

### T124: Implementar bold e italic no inlineMarkdown [P]

**What**: Adicionar decorações para `StrongEmphasis` e `Emphasis` no `buildDecorations`
**Where**: `src/editor/extensions/inlineMarkdown.ts` (adicionar)
**Depends on**: T122
**Requirement**: EDITOR2-02

**Done quando**:
- [ ] `StrongEmphasis`: markers `**` ou `__` (abertura e fechamento) → `.cm-md-hidden`; texto entre → `.cm-bold`
- [ ] `Emphasis`: markers `*` ou `_` → `.cm-md-hidden`; texto entre → `.cm-italic`
- [ ] `StrongEmphasis` dentro de `Emphasis` (e vice-versa): ambas as classes aplicadas
- [ ] Cursor dentro do span: mostra markdown cru completo (incluindo markers)
- [ ] CSS: `.cm-bold { font-weight: 700 }`, `.cm-italic { font-style: italic }`

**Verify**:
- `**texto**` fora do cursor → "texto" em negrito, sem `**`
- Cursor dentro → `**texto**` cru visível
- `***texto***` → negrito + itálico simultaneamente

**Commit**: `feat(editor-v2): add bold and italic inline decorations`

---

### T125: Implementar inline code no inlineMarkdown [P]

**What**: Adicionar decorações para `InlineCode`
**Where**: `src/editor/extensions/inlineMarkdown.ts` (adicionar)
**Depends on**: T122
**Requirement**: EDITOR2-03

**Done quando**:
- [ ] `InlineCode`: backticks abertura e fechamento → `.cm-md-hidden`; conteúdo → `.cm-inline-code`
- [ ] CSS: `.cm-inline-code { background: var(--surface-2); border-radius: 3px; padding: 0 3px; font-size: 0.9em }`
- [ ] Cursor dentro do inline code: backticks aparecem para edição

**Verify**: `` `código` `` fora do cursor → fundo de destaque sem backticks; cursor dentro → `` `código` `` cru

**Commit**: `feat(editor-v2): add inline code decoration`

---

### T126: Implementar links inline + Ctrl+Click [P]

**What**: Decorar links `[texto](url)` e abrir no browser com Ctrl/Cmd+Click
**Where**: `src/editor/extensions/inlineMarkdown.ts` (adicionar)
**Depends on**: T122
**Requirement**: EDITOR2-05

**Done quando**:
- [ ] `Link`: esconder `[`, `](url)` → `.cm-md-hidden`; texto entre `[` e `]` → `.cm-link-text`
- [ ] CSS: `.cm-link-text { color: var(--color-primary); text-decoration: underline; cursor: pointer }`
- [ ] `EditorView.domEventHandlers({ click })` adicionado: Ctrl/Cmd+Click na posição de um `URL` node → `window.electronAPI.shell.openExternal(url)`
- [ ] Cursor dentro do link: markdown cru visível

**Verify**: `[texto](https://example.com)` → "texto" sublinhado em cor primary; Cmd+Click → browser abre a URL

**Commit**: `feat(editor-v2): add link decoration with Ctrl+Click to open in browser`

---

### T127: Implementar list bullets no inlineMarkdown [P]

**What**: Substituir visualmente `-` / `*` / `1.` por bullet `•` via CSS
**Where**: `src/editor/extensions/inlineMarkdown.ts` (adicionar), `src/editor/inlineMarkdown.css`
**Depends on**: T122
**Requirement**: EDITOR2-06

**Done quando**:
- [ ] `ListMark` nodes: aplica `.cm-list-bullet` no marker
- [ ] CSS: `.cm-list-bullet { color: transparent }` + `.cm-list-bullet::before { content: '•'; color: var(--color-muted) }`
- [ ] Listas ordenadas (`1.`, `2.`): marker permanece visível com styling leve (sem substituição por número)
- [ ] Indentação das listas respeitada pelo line wrapping do CM

**Verify**: Lista com `- item 1\n- item 2` → bullets `•` visíveis; cursor no marker → `-` original visível

**Commit**: `feat(editor-v2): add list bullet decoration`

---

### T128: Implementar vim mode com Compartment

**What**: Integrar `@replit/codemirror-vim` via `Compartment` para toggle em runtime
**Where**: `src/editor/extensions/vimMode.ts`
**Depends on**: T120
**Requirement**: EDITOR2-07

**Done quando**:
- [ ] `vimCompartment = new Compartment()` exportado
- [ ] `toggleVimMode(view, enabled)` — `view.dispatch({ effects: vimCompartment.reconfigure(enabled ? vim() : []) })`
- [ ] `settingsStore.vimMode: boolean` com default `false`
- [ ] Toggle em runtime preserva conteúdo, undo history e posição do cursor (garantido pelo Compartment)
- [ ] Verificar ESM compatibility: `@replit/codemirror-vim` pode precisar estar em `optimizeDeps.include` do vite

**Verify**: Ativar vim mode nas settings → teclas `hjkl` movem cursor; desativar → editor normal

**Commit**: `feat(editor-v2): implement vim mode with runtime toggle via Compartment`

---

### T129: Criar VimStatusBar.tsx

**What**: Componente que exibe o modo vim atual (`NORMAL` / `INSERT` / `VISUAL`) na statusbar
**Where**: `src/components/editor/VimStatusBar.tsx`
**Depends on**: T128
**Requirement**: EDITOR2-07

**Done quando**:
- [ ] Lê modo via `getCM(editorViewRef.current)?.state?.vim?.mode` ou evento customizado do vim
- [ ] Exibe texto: `NORMAL` (cor muted), `INSERT` (cor primary), `VISUAL` (cor amarela)
- [ ] Fonte monospace pequena (10–11px)
- [ ] Visível apenas quando `settingsStore.vimMode === true`
- [ ] Posicionado à esquerda na statusbar/bottom bar do editor

**Verify**: Com vim mode ativo → pressionar `i` → exibe `INSERT`; `Esc` → exibe `NORMAL`

**Commit**: `feat(editor-v2): create VimStatusBar component`

---

### T130: Compor todas as extensões no CodeMirrorEditor

**What**: Atualizar `CodeMirrorEditor.tsx` para usar o stack completo de extensões v2
**Where**: `src/components/editor/CodeMirrorEditor.tsx`
**Depends on**: T121, T122, T124, T125, T126, T127, T128
**Requirement**: EDITOR2-01 a EDITOR2-07

**Done quando**:
- [ ] `buildExtensions(settings)` monta o array com todas as extensões na ordem do design
- [ ] `syntaxHighlightExtension` substitui o `markdown()` anterior
- [ ] `inlineMarkdownExtension` adicionado após markdown
- [ ] `vimCompartment.of(settings.vimMode ? vim() : [])` incluído
- [ ] `fontCompartment.of(createFontTheme(...))` incluído
- [ ] `viewRef` exposto via `useImperativeHandle` para que componentes pai possam chamar `toggleVimMode` e `updateFontTheme`
- [ ] `inlineMarkdown.css` importado no componente
- [ ] `npm run dev` sem erros

**Verify**: Editor abre com todos os elementos funcionando: headings grandes, bold, code highlight, vim mode toggle

**Commit**: `feat(editor-v2): compose all v2 extensions into CodeMirrorEditor`

---

### T131: Atualizar SettingsModal com seção de editor

**What**: Adicionar controles de font family, font size, line height e vim mode toggle na seção Editor do SettingsModal
**Where**: `src/components/settings/SettingsModal.tsx`
**Depends on**: T123, T128, T52 (SettingsModal existente)
**Requirement**: EDITOR2-07, EDITOR2-08

**Done quando**:
- [ ] Seção **Editor** completa:
  - Toggle "Vim mode" → `settingsStore.vimMode` → `toggleVimMode(viewRef, value)` + persiste no electron-store
  - Seletor "Fonte" (dropdown): JetBrains Mono, Fira Code, Cascadia Code, Monospace do sistema
  - Slider ou input numérico "Tamanho": 12–20px
  - Slider "Espaçamento entre linhas": 1.4–2.0 com passo 0.1
- [ ] Cada mudança: atualiza `settingsStore` + chama `updateFontTheme(viewRef, ...)` imediatamente
- [ ] Valores persistidos no electron-store via IPC
- [ ] Lidos no startup e aplicados ao montar o editor

**Verify**: Mudar font size de 14 para 18 nas settings → editor atualiza em tempo real sem recarregar

**Commit**: `feat(editor-v2): add font and vim settings to SettingsModal`

---

### T132: Integrar VimStatusBar no EditorPane

**What**: Adicionar `<VimStatusBar>` na statusbar do `EditorPane`
**Where**: `src/components/editor/EditorPane.tsx`
**Depends on**: T129, T131
**Requirement**: EDITOR2-07

**Done quando**:
- [ ] `<VimStatusBar viewRef={editorViewRef} />` renderizado na statusbar do editor
- [ ] Posicionado à esquerda; indicador de save ("Salvo ✓") permanece à direita
- [ ] Não visível quando vim mode desativado

**Verify**: Ativar vim mode → `NORMAL` aparece na statusbar; desativar → desaparece

**Commit**: `feat(editor-v2): integrate VimStatusBar into EditorPane statusbar`

---

### T133: Implementar Focus Mode (EDITOR2-09)

**What**: Modo de foco que centraliza o editor com padding lateral e max-width reduzido
**Where**: `src/components/editor/EditorPane.tsx`, `src/stores/editor.store.ts`
**Depends on**: T130
**Requirement**: EDITOR2-09

**Done quando**:
- [ ] `editorStore.focusMode: boolean` adicionado
- [ ] Toggle via `Cmd+Shift+F` (shortcut já definido em ROADMAP M1)
- [ ] Quando ativo: container do editor recebe classe `.focus-mode`
- [ ] CSS `.focus-mode .cm-content { max-width: 680px; margin: 0 auto; padding: 0 40px }`
- [ ] Sidebar some automaticamente quando focus mode ativa (ou fica como opção)

**Verify**: `Cmd+Shift+F` → editor centralizado com max-width 680px; shortcut novamente → volta ao normal

**Commit**: `feat(editor-v2): implement focus mode with centered layout`

---

### T134: Verificar performance com documentos longos

**What**: Testar com notas de 500+ linhas e garantir que o inline rendering não causa lag
**Where**: `src/editor/extensions/inlineMarkdown.ts`
**Depends on**: T130
**Requirement**: EDITOR2-01 a EDITOR2-06

**Done quando**:
- [ ] Confirmado que `buildDecorations` itera apenas `view.visibleRanges` (não o documento inteiro)
- [ ] Digitar em nota com 500 linhas: sem lag perceptível (< 16ms por frame)
- [ ] Se lag detectado: adicionar `requestAnimationFrame` ou mudar para `StateField` com `RangeSetBuilder`
- [ ] DevTools Performance profile: nenhuma task > 50ms durante digitação normal

**Verify**: Abrir nota com 500+ linhas → digitar livremente → sem travamentos ou frames perdidos

**Commit**: `perf(editor-v2): verify and optimize inline markdown extension performance`

---

### T135: Expor `shell.openExternal` no preload

**What**: Adicionar `shell.openExternal(url)` ao namespace `shell` no contextBridge (necessário para Ctrl+Click em links)
**Where**: `electron/preload.ts`, `src/types/electron.d.ts`
**Depends on**: T126
**Requirement**: EDITOR2-05

**Done quando**:
- [ ] `window.electronAPI.shell.openExternal(url)` disponível no renderer
- [ ] IPC handler `shell:open-external(url)` registrado no main: `shell.openExternal(url)`
- [ ] URL validada: apenas `https://` e `http://` aceitos (segurança)
- [ ] TypeScript sem erros

**Verify**: Chamar `window.electronAPI.shell.openExternal('https://example.com')` no DevTools → browser abre

**Commit**: `feat(editor-v2): expose shell.openExternal via preload for link clicks`

---

## Parallel Execution Map

```
Phase 1:  T120

Phase 2:  T120 ─┬→ T121 [P] ──────────────────────────────┐
                 ├→ T122 [P] ─┬→ T124 [P] ─┐               │
                 │             ├→ T125 [P] ─┤→ T130 → T131 ─┤→ T132
                 │             ├→ T126 [P] ─┤               │   T133
                 │             └→ T127 [P] ─┘               │   T134
                 ├→ T123 [P] ──────────────────────────────┤
                 └→ T128 ─→ T129 ──────────────────────────┘

T135 pode rodar em paralelo com qualquer phase após T120
```

---

## Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T120: instalar deps | package.json + vite config | ✅ |
| T121: syntaxHighlight extension | 1 extensão | ✅ |
| T122: inlineMarkdown base + headings | ViewPlugin + H1/H2/H3 | ✅ |
| T123: font theme + Compartment | 1 extensão + settings | ✅ |
| T124: bold/italic | adicionar ao ViewPlugin | ✅ |
| T125: inline code | adicionar ao ViewPlugin | ✅ |
| T126: links + Ctrl+Click | adicionar ao ViewPlugin + handler | ✅ |
| T127: list bullets | adicionar ao ViewPlugin + CSS | ✅ |
| T128: vim mode | 1 extensão + Compartment | ✅ |
| T129: VimStatusBar | 1 componente | ✅ |
| T130: compor extensões | atualizar CodeMirrorEditor | ✅ |
| T131: settings seção editor | atualizar SettingsModal | ✅ |
| T132: integrar VimStatusBar | atualizar EditorPane | ✅ |
| T133: focus mode | 1 toggle + CSS | ✅ |
| T134: performance check | verificação + otimização | ✅ |
| T135: shell.openExternal preload | 1 handler + 1 namespace | ✅ |

---

## Nota: Ordem de Implementação Recomendada

T122 (headings) é a task mais complexa — é a base do sistema de decorações. Implementá-la e testá-la completamente antes de partir para T124–T127. As tasks de elementos inline são todas aditivas ao mesmo `ViewPlugin`, então podem ser feitas sequencialmente com commits granulares para facilitar debug.
