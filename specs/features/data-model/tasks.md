# Data Model Tasks

**Design**: `.specs/features/data-model/design.md`
**Status**: Draft

> Tasks T66–T82. Depende de Vault Setup (T01–T11) e Note Editor (T12–T24) concluídos.

---

## Execution Plan

```
Phase 1 — Dependências + Tipos (Sequential):
  T66 → T67

Phase 2 — IPC Handlers (Parallel após T67):
       ┌→ T68 [P] (manifest load/save)
  T67 ─┼→ T69 [P] (notebooks CRUD)
       ├→ T70 [P] (tags CRUD)
       ├→ T71 [P] (pinned notes)
       └→ T72 [P] (inbox + frontmatter)

Phase 3 — Registrar + Expor (Sequential após Phase 2):
  T68+T69+T70+T71+T72 → T73 → T74

Phase 4 — Renderer (Parallel após T74):
       ┌→ T75 [P] (manifestStore)
  T74 ─┤
       └→ T76 [P] (manifestService)

Phase 5 — UI Components (Parallel após T75+T76):
       ┌→ T77 [P] (NotebookSection)
  T76 ─┼→ T78 [P] (TagsPanel)
       ├→ T79 [P] (NoteMetadataBar)
       └→ T80 [P] (PinnedSection + InboxSection)

Phase 6 — Integração:
  T77+T78+T79+T80 → T81 → T82
```

---

## Task Breakdown

### T66: Instalar `gray-matter`

**What**: Instalar `gray-matter` para leitura/escrita de YAML frontmatter em arquivos `.md`
**Where**: `package.json`
**Depends on**: —
**Requirement**: DATA-06

**Done quando**:
- [ ] `gray-matter` instalado (`npm install gray-matter`)
- [ ] `@types/gray-matter` disponível (ou tipagem incluída)
- [ ] `npm run dev` sem erros

**Verify**: `import matter from 'gray-matter'; matter('---\ntitle: test\n---\ncontent')` funciona no main process

**Commit**: `chore(data-model): install gray-matter for frontmatter parsing`

---

### T67: Definir tipos HaiManifest e Notebook/Tag/TrashEntry

**What**: Criar arquivo de tipos para o manifesto e entidades relacionadas
**Where**: `src/types/manifest.ts`
**Depends on**: T66
**Requirement**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05

**Done quando**:
- [ ] `HaiManifest`, `Notebook`, `Tag`, `TrashEntry` exportados de `src/types/manifest.ts`
- [ ] `NoteFrontmatter` interface exportada
- [ ] `DEFAULT_MANIFEST` constante exportada com inbox padrão
- [ ] `ElectronAPI` em `electron.d.ts` tem namespaces `manifest`, `notebooks`, `tags`, `notes` (extensão)
- [ ] TypeScript sem erros

**Verify**: Importar tipos em qualquer arquivo sem erros

**Commit**: `feat(data-model): define HaiManifest, Notebook, Tag and NoteFrontmatter types`

---

### T68: Criar `manifest.ipc.ts` — handlers load/save [P]

**What**: Ler ou criar `hai.json` na raiz do vault; escrever mudanças
**Where**: `electron/ipc/manifest.ipc.ts`
**Depends on**: T67
**Requirement**: DATA-01

**Done quando**:
- [ ] `manifest:load` → lê `hai.json` via `fs.readFile`; se não existe: cria `DEFAULT_MANIFEST` e salva
- [ ] `manifest:save(manifest)` → escreve `hai.json` com `JSON.stringify(manifest, null, 2)`
- [ ] Lê `vaultPath` do electron-store
- [ ] Erros de fs (permissão, vault não configurado) retornam mensagens claras

**Verify**: Deletar `hai.json` do vault → `manifest:load` → arquivo recriado com defaults

**Commit**: `feat(data-model): implement manifest:load and manifest:save IPC handlers`

---

### T69: Criar `manifest.ipc.ts` — handlers notebooks CRUD [P]

**What**: Create/rename/delete/reorder notebooks
**Where**: `electron/ipc/manifest.ipc.ts` (adicionar)
**Depends on**: T68
**Requirement**: DATA-02

**Done quando**:
- [ ] `notebooks:create(name, color?)` → cria pasta no vault + adiciona `Notebook` com UUID ao hai.json
- [ ] `notebooks:rename(id, name)` → renomeia pasta no fs + atualiza `name` no hai.json
- [ ] `notebooks:delete(id, strategy: 'inbox' | 'delete')` → move notas ou deleta + remove de hai.json
- [ ] `notebooks:reorder(ids[])` → atualiza campo `order` em todos os notebooks no hai.json
- [ ] `notebooks:list` → retorna `Notebook[]` do hai.json

**Verify**: Criar notebook "Projects" → pasta `projects/` criada no vault → hai.json tem novo entry

**Commit**: `feat(data-model): implement notebooks CRUD IPC handlers`

---

### T70: Criar `manifest.ipc.ts` — handlers tags CRUD [P]

**What**: Create/update/delete tags no hai.json
**Where**: `electron/ipc/manifest.ipc.ts` (adicionar)
**Depends on**: T68
**Requirement**: DATA-03

**Done quando**:
- [ ] `tags:create(name, label, color)` → adiciona `Tag` ao hai.json
- [ ] `tags:update(name, updates)` → atualiza label/color de tag existente
- [ ] `tags:delete(name)` → remove tag do hai.json; remove tag do frontmatter de todas as notas que a usam
- [ ] `tags:list` → retorna `Tag[]` do hai.json

**Verify**: Criar tag "dev" com cor azul → hai.json tem `{ name: 'dev', label: 'Dev', color: '#3b82f6' }`

**Commit**: `feat(data-model): implement tags CRUD IPC handlers`

---

### T71: Criar `manifest.ipc.ts` — handlers pinned [P]

**What**: Pin/unpin notas via hai.json
**Where**: `electron/ipc/manifest.ipc.ts` (adicionar)
**Depends on**: T68
**Requirement**: DATA-04

**Done quando**:
- [ ] `notes:pin(path)` → adiciona path relativo a `hai.json.pinned[]` (sem duplicatas)
- [ ] `notes:unpin(path)` → remove path de `hai.json.pinned[]`
- [ ] Atualiza frontmatter da nota: `pinned: true/false`

**Verify**: `notes:pin('inbox/ideia.md')` → hai.json.pinned inclui o path → frontmatter da nota tem `pinned: true`

**Commit**: `feat(data-model): implement notes:pin and notes:unpin IPC handlers`

---

### T72: Criar `manifest.ipc.ts` — inbox e frontmatter [P]

**What**: Garantir pasta inbox; ler/escrever frontmatter de notas com gray-matter
**Where**: `electron/ipc/manifest.ipc.ts` (adicionar)
**Depends on**: T66, T68
**Requirement**: DATA-05, DATA-06

**Done quando**:
- [ ] `inbox:ensure` → cria pasta `inbox/` se não existe no vault
- [ ] `notes:get-meta(path)` → lê frontmatter com gray-matter, retorna `NoteFrontmatter`
- [ ] `notes:update-meta(path, meta)` → re-escreve frontmatter preservando conteúdo
- [ ] `notes:migrate-frontmatter(path)` → adiciona frontmatter mínimo a notas sem ele (`title`, `created`, `updated`)
- [ ] `created` setado na criação (não sobrescrito em updates)
- [ ] `updated` atualizado em cada save

**Verify**: Nota sem frontmatter → `notes:migrate-frontmatter` → arquivo tem `---\ntitle: ...\ncreated: ...\n---`

**Commit**: `feat(data-model): implement inbox init and frontmatter read/write handlers`

---

### T73: Registrar handlers e expor no preload

**What**: Importar `manifest.ipc.ts` no `main.ts` e adicionar namespaces ao preload
**Where**: `electron/main.ts`, `electron/preload.ts`, `src/types/electron.d.ts`
**Depends on**: T68, T69, T70, T71, T72
**Requirement**: DATA-01 a DATA-06

**Done quando**:
- [ ] Todos os handlers registrados com `ipcMain.handle`
- [ ] Namespace `manifest` no contextBridge com `load`, `save`
- [ ] Namespace `notebooks` com `create`, `rename`, `delete`, `reorder`, `list`
- [ ] Namespace `tags` com `create`, `update`, `delete`, `list`
- [ ] Namespace `notes` estendido com `pin`, `unpin`, `getMeta`, `updateMeta`
- [ ] TypeScript sem erros
- [ ] `npm run dev` sem erros

**Verify**: `window.electronAPI.manifest.load()` no DevTools → retorna HaiManifest

**Commit**: `feat(data-model): register manifest IPC handlers and expose via preload`

---

### T74: Criar `manifest.store.ts` [P]

**What**: Zustand store para o estado do manifesto no renderer
**Where**: `src/stores/manifest.store.ts`
**Depends on**: T73
**Requirement**: DATA-01 a DATA-04

**Done quando**:
- [ ] `notebooks`, `tags`, `pinned`, `inbox`, `isLoaded` no estado
- [ ] `setManifest(m)`, `addNotebook`, `removeNotebook`, `updateNotebook`, `setTags`, `setPinned` implementados
- [ ] TypeScript sem erros

**Verify**: `manifestStore.setManifest(defaultManifest)` → `manifestStore.notebooks` tem inbox

**Commit**: `feat(data-model): create manifest Zustand store`

---

### T75: Criar `manifestService.ts` [P]

**What**: Wrapper IPC que chama electron API e atualiza o store
**Where**: `src/services/manifest.ts`
**Depends on**: T73, T74
**Requirement**: DATA-01 a DATA-06

**Done quando**:
- [ ] `loadManifest()` → IPC → `manifestStore.setManifest(result)`
- [ ] `createNotebook(name, color?)` → IPC → `manifestStore.addNotebook(result)`
- [ ] `deleteNotebook(id, strategy)` → IPC → `manifestStore.removeNotebook(id)`
- [ ] `createTag(...)`, `updateTag(...)`, `deleteTag(...)` atualizam `manifestStore.tags`
- [ ] `pinNote(path)`, `unpinNote(path)` atualizam `manifestStore.pinned`

**Verify**: `manifestService.createTag('dev', 'Dev', '#3b82f6')` → `manifestStore.tags` atualizado

**Commit**: `feat(data-model): create manifest service for renderer`

---

### T76: Criar `NotebookSection.tsx` [P]

**What**: Lista de notebooks na sidebar com criação inline e menu de contexto
**Where**: `src/components/sidebar/NotebookSection.tsx`
**Depends on**: T74, T75
**Requirement**: DATA-02

**Done quando**:
- [ ] Lista notebooks de `manifestStore.notebooks` (ordenados por `order`)
- [ ] Notebook ativo destacado (lê rota/contexto atual)
- [ ] Click → navega para notebook (filtra file tree)
- [ ] Botão "+" → input inline para criar notebook com nome
- [ ] Right-click → menu contextual: Renomear, Mudar cor, Deletar
- [ ] Deletar → modal de confirmação (mover para inbox / deletar notas)

**Verify**: Criar notebook via UI → aparece na sidebar → pasta criada no vault

**Commit**: `feat(data-model): create NotebookSection sidebar component`

---

### T77: Criar `TagsPanel.tsx` [P]

**What**: Lista de tags com filtro e gerenciamento
**Where**: `src/components/sidebar/TagsPanel.tsx`
**Depends on**: T74, T75
**Requirement**: DATA-03

**Done quando**:
- [ ] Lista tags de `manifestStore.tags` com badge colorido
- [ ] Click → filtra lista de notas pela tag
- [ ] Botão "+" → criar nova tag (nome + color picker)
- [ ] Right-click → editar label/cor, deletar

**Verify**: Criar tag → aparece na lista; click na tag → notas filtradas

**Commit**: `feat(data-model): create TagsPanel sidebar component`

---

### T78: Criar `NoteMetadataBar.tsx` [P]

**What**: Barra abaixo do editor com tags e notebook da nota ativa
**Where**: `src/components/editor/NoteMetadataBar.tsx`
**Depends on**: T74, T75
**Requirement**: DATA-02, DATA-03, DATA-06

**Done quando**:
- [ ] Exibe tags da nota ativa (badges coloridos)
- [ ] Click em tag → remove da nota
- [ ] Botão "+" → dropdown para adicionar tag existente ou criar nova
- [ ] Dropdown para notebook atual → permite mover nota para outro notebook
- [ ] Mudanças chamam `manifestService.updateNoteMeta(path, meta)` imediatamente

**Verify**: Abrir nota → ver tags; adicionar tag → frontmatter da nota atualizado

**Commit**: `feat(data-model): create NoteMetadataBar editor component`

---

### T79: Criar `PinnedSection.tsx` e `InboxSection.tsx` [P]

**What**: Seções especiais na sidebar para notas fixadas e inbox
**Where**: `src/components/sidebar/PinnedSection.tsx`, `src/components/sidebar/InboxSection.tsx`
**Depends on**: T74, T75
**Requirement**: DATA-04, DATA-05

**Done quando**:
- [ ] `PinnedSection`: lista notas de `manifestStore.pinned`; right-click → "Desafixar"
- [ ] `InboxSection`: lista notas na pasta `manifestStore.inbox`; badge com contagem
- [ ] Ambas acima da lista de notebooks na sidebar
- [ ] Click em nota → abre no editor

**Verify**: Fixar nota → aparece em PinnedSection; nota sem notebook → aparece em InboxSection

**Commit**: `feat(data-model): create PinnedSection and InboxSection sidebar components`

---

### T80: Integrar manifesto no startup do app

**What**: Chamar `manifestService.loadManifest()` quando vault é carregado
**Where**: `src/App.tsx` ou `src/screens/MainScreen.tsx`
**Depends on**: T75, T76, T77, T78, T79
**Requirement**: DATA-01

**Done quando**:
- [ ] `manifestService.loadManifest()` chamado após vault path estar disponível
- [ ] Se vault não tem `hai.json` → criado automaticamente com defaults (inbox)
- [ ] Sidebar renderiza notebooks, tags, pinned e inbox após load
- [ ] `manifestStore.isLoaded === true` antes de renderizar componentes dependentes

**Verify**: Abrir app com vault sem hai.json → sidebar tem "Inbox"; hai.json criado no vault

**Commit**: `feat(data-model): load manifest on app startup when vault is ready`

---

### T81: Migrar frontmatter de notas existentes

**What**: Ao abrir uma nota sem frontmatter, injetar campos mínimos automaticamente
**Where**: `electron/ipc/notes.ipc.ts` (modificar handler de leitura de nota)
**Depends on**: T72
**Requirement**: DATA-06

**Done quando**:
- [ ] Ao ler nota: checar se tem frontmatter
- [ ] Se sem frontmatter: chamar `notes:migrate-frontmatter(path)` e relê o arquivo
- [ ] `title` derivado do nome do arquivo (sem extensão)
- [ ] `created` e `updated` setados para `mtime` do arquivo
- [ ] Migração acontece uma vez — arquivos já com frontmatter não são modificados

**Verify**: Nota legacy sem frontmatter → abrir no app → arquivo tem frontmatter ao inspecionar

**Commit**: `feat(data-model): auto-migrate existing notes to include frontmatter`

---

### T82: Incluir `hai.json` no commit de sync

**What**: Garantir que `hai.json` é sempre incluído no `git.add` do push
**Where**: `electron/ipc/sync.ipc.ts` (handler push)
**Depends on**: T68 (manifest:save já atualiza hai.json)
**Requirement**: DATA-07

**Done quando**:
- [ ] `git.add({ fs, dir, filepath: '.' })` já inclui `hai.json` (comportamento padrão)
- [ ] Verificar que `.gitignore` (se existir) não exclui `hai.json`
- [ ] Se .gitignore existir: garantir que `hai.json` está na lista de tracked files

**Verify**: Fazer push após atualizar notebook → `hai.json` aparece no commit no GitHub

**Commit**: `feat(data-model): ensure hai.json is included in every sync commit`

---

## Parallel Execution Map

```
Phase 1:  T66 → T67

Phase 2:  T67 ─┬→ T68 [P] ─┐
                ├→ T69 [P] ─┤
                ├→ T70 [P] ─┤→ T73 → T74
                ├→ T71 [P] ─┤
                └→ T72 [P] ─┘

Phase 3:  T74 ─┬→ T75 [P] ─┐
                └→ T76 [P]  (paralelo com T75, mas dependente de T74)

Phase 4:  T75+T76 ─┬→ T77 [P] ─┐
                    ├→ T78 [P] ─┤→ T80 → T81 → T82
                    └→ T79 [P] ─┘
```
