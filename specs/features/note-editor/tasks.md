# Note Editor Tasks

**Design**: `.specs/features/note-editor/design.md`
**Status**: Draft

> Tasks T12–T24. Depende de Vault Setup (T01–T11) completo.

---

## Execution Plan

```
Phase 1 — Backend IPC (Sequential):
  T12 → T13 → T14 → T15

Phase 2 — Stores + Serviços (Parallel após T15):
       ┌→ T16 [P]
  T15 ─┤
       └→ T17 [P]

Phase 3 — Componentes atômicos (Parallel após T16+T17):
       ┌→ T18 [P] (CodeMirrorEditor)
  T17 ─┤
       └→ T19 [P] (MarkdownPreview)

Phase 4 — Componentes compostos (Sequential):
  T18 + T19 → T20 → T21 → T22 → T23 → T24
```

---

## Task Breakdown

### T12: Instalar e configurar dependências do editor

**What**: Instalar CodeMirror 6 e dependências de markdown; instalar `react-markdown`, `remark-gfm`, `chokidar`
**Where**: `package.json`
**Depends on**: T01
**Requirement**: EDITOR-01, EDITOR-04

**Done when**:
- [ ] `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-markdown`, `@codemirror/commands`, `@codemirror/language`, `@lezer/highlight` instalados
- [ ] `react-markdown`, `remark-gfm` instalados
- [ ] `chokidar` instalado (dependency do main process)
- [ ] `npm run dev` continua funcionando após instalar

**Verify**: `npm ls @codemirror/view` mostra versão instalada

**Commit**: `chore(editor): install CodeMirror 6, react-markdown and chokidar`

---

### T13: Criar FileNode type e interface de notesService

**What**: Definir `FileNode` interface e tipos de retorno de `notesService` em `src/types/notes.ts`
**Where**: `src/types/notes.ts`
**Depends on**: T12
**Requirement**: EDITOR-01, EDITOR-03

**Done when**:
- [ ] `FileNode` com `name`, `path`, `type`, `children?` definido e exportado
- [ ] Tipos `NoteReadResult`, `NoteCreateResult` definidos
- [ ] ElectronAPI interface em `electron.d.ts` atualizada com namespace `notes` tipado

**Verify**: TypeScript sem erros ao importar tipos em qualquer arquivo

**Commit**: `feat(editor): define FileNode and notes types`

---

### T14: Criar notes.ipc.ts com handlers de filesystem

**What**: Implementar `electron/ipc/notes.ipc.ts` com handlers: `notes:read`, `notes:save`, `notes:create`, `notes:delete`, `notes:rename`, `notes:list-all`
**Where**: `electron/ipc/notes.ipc.ts`
**Depends on**: T13
**Requirement**: EDITOR-01, EDITOR-02, EDITOR-03, EDITOR-05, EDITOR-06

**Done when**:
- [ ] `notes:read(path)` → `fs.readFile(path, 'utf-8')`
- [ ] `notes:save(path, content)` → `fs.writeFile(path, content, 'utf-8')`
- [ ] `notes:create(vaultPath, name?)` → cria arquivo com nome ou "Sem título + timestamp", retorna path
- [ ] `notes:delete(path)` → `shell.trashItem(path)` (lixeira do SO)
- [ ] `notes:rename(oldPath, newName)` → `fs.rename`, retorna novo path
- [ ] `notes:list-all(vaultPath)` → lê diretório recursivamente, retorna `FileNode[]` com apenas `.md`

**Verify**: Testar cada handler via DevTools console (`window.electronAPI.notes.read(path)`)

**Commit**: `feat(editor): implement notes IPC handlers`

---

### T15: Adicionar file watcher ao notes.ipc.ts + registrar todos handlers

**What**: Adicionar handlers `notes:watch-start` e `notes:watch-stop` com `chokidar`; registrar todos os handlers de notes no `main.ts`; expor API de notes no preload
**Where**: `electron/ipc/notes.ipc.ts`, `electron/main.ts`, `electron/preload.ts`
**Depends on**: T14
**Requirement**: EDITOR-03 (sidebar atualiza automaticamente)

**Done when**:
- [ ] `notes:watch-start(vaultPath)` inicia `chokidar.watch` e emite `filetree:changed` via `webContents.send`
- [ ] `notes:watch-stop()` para o watcher (sem leak)
- [ ] Todos handlers de notes registrados em `main.ts`
- [ ] `window.electronAPI.notes.*` e `window.electronAPI.onFileTreeChanged(cb)` disponíveis no renderer
- [ ] `npm run dev` sem erros

**Verify**: Criar arquivo `.md` manualmente na pasta do vault → sidebar atualiza sem reload

**Commit**: `feat(editor): add file watcher and register notes IPC`

---

### T16: Criar fileTree.store.ts [P]

**What**: Implementar Zustand store `src/stores/fileTree.store.ts` com `nodes: FileNode[]`, `isLoading`, e actions `init(vaultPath)`, `refresh()`
**Where**: `src/stores/fileTree.store.ts`
**Depends on**: T15
**Requirement**: EDITOR-03

**Done when**:
- [ ] `init(vaultPath)` chama `notesService.listAll()`, popula nodes, inicia watcher
- [ ] `refresh()` re-lista sem reiniciar watcher
- [ ] Listener `onFileTreeChanged` registrado no init, chama `refresh()` automaticamente
- [ ] TypeScript sem erros

**Verify**: Chamar `fileTreeStore.init(path)` → `fileTreeStore.nodes` populado com arquivos do vault

**Commit**: `feat(editor): create fileTree Zustand store`

---

### T17: Criar editor.store.ts com lógica de autosave [P]

**What**: Implementar Zustand store `src/stores/editor.store.ts` com `activeNote`, `isDirty`, `isSaving`, `previewMode` e actions `openNote`, `setContent`, `save`, `setPreviewMode`
**Where**: `src/stores/editor.store.ts`
**Depends on**: T15
**Requirement**: EDITOR-01, EDITOR-02, EDITOR-04

**Done when**:
- [ ] `openNote(path)` chama `notesService.read()`, seta `activeNote`
- [ ] `setContent(content)` atualiza `activeNote.content` e `isDirty = true`
- [ ] `save()` chama `notesService.save()`, seta `isDirty = false`
- [ ] `previewMode` alterna entre `'none'`, `'split'`, `'preview'`
- [ ] TypeScript sem erros

**Verify**: `editorStore.openNote(path)` → `editorStore.activeNote.content` tem conteúdo do arquivo

**Commit**: `feat(editor): create editor Zustand store`

---

### T18: Criar CodeMirrorEditor.tsx [P]

**What**: Componente React que encapsula CodeMirror 6 com extensões de markdown, syntax highlighting, line wrapping e dark theme
**Where**: `src/components/editor/CodeMirrorEditor.tsx`
**Depends on**: T16, T17
**Requirement**: EDITOR-01, EDITOR-02, EDITOR-07

**Done when**:
- [ ] Recebe `initialContent: string` e `onChange: (content: string) => void`
- [ ] Extensões configuradas: `markdown()`, `syntaxHighlighting(defaultHighlightStyle)`, `EditorView.lineWrapping`, `keymap.of([...defaultKeymap, ...historyKeymap])`, `history()`
- [ ] Tema escuro aplicado
- [ ] `onChange` chamado a cada keystroke com conteúdo atual
- [ ] Quando `initialContent` muda (nova nota aberta), editor atualiza sem re-montar

**Verify**: Renderizar componente → digitar markdown → `onChange` chamado → syntax highlighting visível

**Commit**: `feat(editor): create CodeMirrorEditor component`

---

### T19: Criar MarkdownPreview.tsx [P]

**What**: Componente que renderiza markdown em HTML com `react-markdown` + `remark-gfm`
**Where**: `src/components/editor/MarkdownPreview.tsx`
**Depends on**: T12
**Requirement**: EDITOR-04

**Done when**:
- [ ] Recebe `content: string`
- [ ] Renderiza headings, bold, italic, listas, código inline, code blocks, links
- [ ] GFM (tables, strikethrough, task lists) via `remark-gfm`
- [ ] Estilo de prose aplicado (dark theme)
- [ ] Atualiza em tempo real quando `content` muda

**Verify**: Passar string com `# Título`, `**bold**`, `` `code` `` e lista → todos renderizados corretamente

**Commit**: `feat(editor): create MarkdownPreview component`

---

### T20: Criar FileTree.tsx

**What**: Componente sidebar com árvore de arquivos, suporte a pastas colapsáveis e context menu
**Where**: `src/components/layout/FileTree.tsx`
**Depends on**: T16, T17
**Requirement**: EDITOR-03, EDITOR-05, EDITOR-06

**Done when**:
- [ ] Renderiza `fileTreeStore.nodes` como árvore expansível/colapsável
- [ ] Clique em arquivo → `editorStore.openNote(path)`
- [ ] Arquivo ativo destacado visualmente
- [ ] Context menu (botão direito): "Deletar" e "Renomear"
- [ ] "Deletar" chama `notesService.delete(path)` com confirmação via `dialog.showMessageBox`
- [ ] "Renomear" ativa edição inline do nome
- [ ] Botão "+" no topo → `editorStore` cria nova nota

**Verify**: Vault com 3+ arquivos em subpastas → todos visíveis → clicar arquivo → abre no editor

**Commit**: `feat(editor): create FileTree sidebar component`

---

### T21: Criar notesService.ts (renderer)

**What**: Implementar `src/services/notes.ts` — wrapper sobre `window.electronAPI.notes` com todos os métodos tipados
**Where**: `src/services/notes.ts`
**Depends on**: T15, T13
**Requirement**: EDITOR-01, EDITOR-02, EDITOR-05, EDITOR-06

**Done when**:
- [ ] `read`, `save`, `create`, `delete`, `rename`, `listAll` implementados
- [ ] Erros propagam com mensagem descritiva
- [ ] Tipagem correta em todos os retornos

**Verify**: TypeScript sem erros ao usar `notesService.read(path)` no store

**Commit**: `feat(editor): create notes service for renderer`

---

### T22: Criar EditorPane.tsx

**What**: Container do editor: toolbar (nova nota, toggle preview), área de edição (`<CodeMirrorEditor>` ou split), status bar com estado de save
**Where**: `src/components/editor/EditorPane.tsx`
**Depends on**: T17, T18, T19, T21
**Requirement**: EDITOR-01, EDITOR-02, EDITOR-04

**Done when**:
- [ ] Sem nota ativa: exibe tela vazia com "Selecione ou crie uma nota"
- [ ] Com nota ativa: renderiza `<CodeMirrorEditor>`
- [ ] Toggle preview: alterna entre `none`, `split`, `preview` via `editorStore.setPreviewMode`
- [ ] `onChange` do CodeMirror → `editorStore.setContent` → debounce 500ms → `editorStore.save()`
- [ ] Status bar: "Salvo ✓" | "Salvando..." | "Erro ao salvar"
- [ ] Atalho `Cmd/Ctrl+P` → toggle preview

**Verify**: Abrir nota → editar → parar de digitar → "Salvo ✓" aparece → arquivo no disco atualizado

**Commit**: `feat(editor): create EditorPane with autosave and preview toggle`

---

### T23: Criar MainLayout.tsx

**What**: Layout principal: sidebar `<FileTree>` + área `<EditorPane>` com divisor redimensionável
**Where**: `src/components/layout/MainLayout.tsx`
**Depends on**: T20, T22
**Requirement**: EDITOR-03

**Done when**:
- [ ] `<FileTree>` à esquerda, `<EditorPane>` à direita
- [ ] Sidebar colapsável (botão ou atalho `Cmd/Ctrl+\`)
- [ ] Layout responsivo (sem overflow)
- [ ] `fileTreeStore.init(vaultStore.path)` chamado no mount

**Verify**: App abre com vault configurado → sidebar com arquivos → clicar arquivo → editor abre

**Commit**: `feat(editor): create MainLayout with FileTree and EditorPane`

---

### T24: Integrar useDebounce no EditorPane

**What**: Criar hook `src/hooks/useDebounce.ts` e integrar no autosave do `EditorPane` para garantir que save não dispara mais de 1x por 500ms
**Where**: `src/hooks/useDebounce.ts`, `src/components/editor/EditorPane.tsx`
**Depends on**: T22
**Requirement**: EDITOR-02

**Done when**:
- [ ] `useDebounce<T>(value: T, delay: number): T` implementado
- [ ] EditorPane usa hook: `const debouncedContent = useDebounce(content, 500)`
- [ ] `useEffect` observa `debouncedContent` e chama `editorStore.save()`
- [ ] Digitar rápido não cria múltiplos saves simultâneos

**Verify**: Monitorar network/disk com DevTools → editar rápido → apenas 1 write a cada 500ms

**Commit**: `feat(editor): implement debounced autosave`

---

## Parallel Execution Map

```
T12 → T13 → T14 → T15 ─┬→ T16 [P] ──────────────────────────┐
                         └→ T17 [P] → T18 [P] ─┐              │
                                      T19 [P] ──┤→ T22 → T23 → T24
                         └→ T21 ───→ T20 ───────┘
```

---

## Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T12: Instalar deps | package.json | ✅ |
| T13: Types FileNode | 1 arquivo de tipos | ✅ |
| T14: notes.ipc.ts | 1 arquivo, 6 handlers coesos | ✅ |
| T15: watcher + registrar | 1 arquivo + 2 arquivos pequenos | ✅ |
| T16: fileTree.store | 1 store | ✅ |
| T17: editor.store | 1 store | ✅ |
| T18: CodeMirrorEditor | 1 componente | ✅ |
| T19: MarkdownPreview | 1 componente | ✅ |
| T20: FileTree | 1 componente | ✅ |
| T21: notesService | 1 service | ✅ |
| T22: EditorPane | 1 componente | ✅ |
| T23: MainLayout | 1 componente | ✅ |
| T24: useDebounce | 1 hook | ✅ |
