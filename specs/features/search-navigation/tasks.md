# Search & Navigation Tasks

**Design**: `.specs/features/search-navigation/design.md`
**Status**: Draft

> Tasks T140–T156. Depende de Data Model (T66–T82) e Note Editor (T12–T24) concluídos — especificamente o file watcher (T15) e o manifest com tags/notebooks (T68–T72).

---

## Execution Plan

```
Phase 1 — Backend (Sequential):
  T140 → T141 → T142

Phase 2 — IPC Handlers (Parallel após T141):
       ┌→ T143 [P] (build-index)
  T141 ┼→ T144 [P] (query + ranking)
       └→ T145 [P] (incremental update)

Phase 3 — Registrar + Expor (Sequential após Phase 2):
  T143+T144+T145 → T146 → T147

Phase 4 — Renderer (Parallel após T147):
       ┌→ T148 [P] (searchStore)
  T147 ┤
       └→ T149 [P] (searchService)

Phase 5 — UI Components (Parallel após T148+T149):
       ┌→ T150 [P] (SearchBar)
  T149 ┼→ T151 [P] (SearchResults)
       └→ T152 [P] (CommandPalette)

Phase 6 — Integração:
  T150+T151+T152 → T153 → T154 → T155
```

---

## Task Breakdown

### T140: Definir tipos de search

**What**: Criar `SearchResult`, `ParsedQuery`, `CommandItem`, `RecentItem`, `IndexEntry` em `src/types/search.ts`
**Where**: `src/types/search.ts`
**Depends on**: —
**Requirement**: SEARCH-01, SEARCH-02, SEARCH-03

**Done quando**:
- [ ] Todos os 5 interfaces exportados de `src/types/search.ts`
- [ ] `ElectronAPI` em `electron.d.ts` tem namespace `search` tipado (`query`, `buildIndex`, `updateEntry`, `removeEntry`)
- [ ] TypeScript sem erros

**Verify**: Importar tipos em qualquer arquivo sem erros de TypeScript

**Commit**: `feat(search): define search types and interfaces`

---

### T141: Criar `parseQuery` — query parser com operadores

**What**: Implementar função que parseia string de busca em `ParsedQuery` com extração de operadores
**Where**: `electron/search/queryParser.ts`
**Depends on**: T140
**Requirement**: SEARCH-01

**Done quando**:
- [ ] `tag:dev` → `{ tags: ['dev'] }`
- [ ] `tag:dev tag:typescript` → `{ tags: ['dev', 'typescript'] }` (AND implícito)
- [ ] `notebook:projects` → `{ notebook: 'projects' }`
- [ ] `after:2024-01-01` → `{ after: Date }` (parse ISO date)
- [ ] `before:2024-12-31` → `{ before: Date }`
- [ ] `title:reunião` → `{ title: 'reunião' }`
- [ ] `/pattern/` → `{ regex: RegExp }`
- [ ] Resto da string → `{ text: '...' }` (espaços múltiplos colapsados)
- [ ] Query inválida (ex: `after:não-é-data`) → campo `null`, sem throw
- [ ] Unit test inline (ou comentário de verificação) para cada caso

**Verify**: `parseQuery('reunião tag:dev after:2024-01-01 notebook:work')` retorna `{ text: 'reunião', tags: ['dev'], after: Date(2024-01-01), notebook: 'work' }`

**Commit**: `feat(search): implement query parser with operator support`

---

### T142: Criar `extractSnippet` e `rankResults` helpers

**What**: Implementar extração de snippet contextualizado e ranking de resultados por relevância
**Where**: `electron/search/searchHelpers.ts`
**Depends on**: T140
**Requirement**: SEARCH-01, SEARCH-02

**Done quando**:
- [ ] `extractSnippet(content, term, length?)` → string com ~150 chars centrada no termo + `...` nas bordas
- [ ] `highlightRanges(snippet, term)` → `[number, number][]` com posições do termo no snippet
- [ ] `scoreEntry(entry, query)` → `number`:
  - Match no título: +3
  - Match nos primeiros 200 chars do conteúdo: +2
  - Match no corpo: +1 por ocorrência (max 5)
  - Bonus para notas mais recentes: +0.1 (desempate)
- [ ] `rankResults(entries, query)` → array sorted por score desc
- [ ] Busca case-insensitive em todos os campos de texto

**Verify**: Array com 3 notas onde 1 tem match no título → essa aparece primeiro no ranking

**Commit**: `feat(search): implement snippet extraction and result ranking helpers`

---

### T143: Criar `search.ipc.ts` — handler `search:build-index` [P]

**What**: Construir o índice in-memory lendo todos os `.md` do vault com gray-matter
**Where**: `electron/ipc/search.ipc.ts`
**Depends on**: T141, T142
**Requirement**: SEARCH-01

**Done quando**:
- [ ] `search:build-index(vaultPath)` → lê todos `.md` recursivamente
- [ ] Para cada arquivo: `gray-matter` extrai frontmatter + conteúdo; popula `IndexEntry`
- [ ] `searchIndex = new Map<string, IndexEntry>()` populado com path como chave
- [ ] Ignorar arquivos em `.trash/` e `.git/`
- [ ] Retorna `{ indexed: number }` com contagem de arquivos indexados
- [ ] Erro de leitura de arquivo individual: log + skip (não interrompe indexação)

**Verify**: `search:build-index(vaultPath)` em vault com 5 notas → `{ indexed: 5 }`; `searchIndex.size === 5`

**Commit**: `feat(search): implement search:build-index IPC handler`

---

### T144: Criar `search.ipc.ts` — handler `search:query` [P]

**What**: Busca no índice com filtros combinados e ranking
**Where**: `electron/ipc/search.ipc.ts` (adicionar)
**Depends on**: T141, T142, T143
**Requirement**: SEARCH-01

**Done quando**:
- [ ] `search:query(rawQuery)` → `parseQuery(rawQuery)` → aplica todos os filtros:
  - `text`: regex case-insensitive em `fullContent`
  - `tags`: `entry.tags` contém TODAS as tags da query (AND)
  - `notebook`: `entry.notebook` inclui o valor (case-insensitive)
  - `after`: `entry.created >= after`
  - `before`: `entry.created <= before`
  - `title`: regex em `entry.title`
  - `regex`: RegExp aplicada em `entry.fullContent`
- [ ] Aplica `rankResults()` nos matches
- [ ] Retorna max 50 resultados como `SearchResult[]`
- [ ] Query vazia → retorna `[]` (não retorna todas as notas)
- [ ] Performance: < 200ms para 500 notas (verificar com `console.time`)

**Verify**: `search:query('tag:dev')` retorna apenas notas com tag "dev"; `search:query('reunião tag:dev')` retorna apenas notas com "reunião" no conteúdo E tag "dev"

**Commit**: `feat(search): implement search:query IPC handler with filtering and ranking`

---

### T145: Criar `search.ipc.ts` — handlers incrementais [P]

**What**: Handlers para atualizar/remover entradas do índice conforme arquivos mudam
**Where**: `electron/ipc/search.ipc.ts` (adicionar)
**Depends on**: T143
**Requirement**: SEARCH-01

**Done quando**:
- [ ] `search:update-entry(path)` → re-lê o arquivo com gray-matter → substitui entrada no `searchIndex`
- [ ] `search:remove-entry(path)` → `searchIndex.delete(path)`
- [ ] Funções exportadas como `searchIpc.updateEntry(path)` para uso interno pelo watcher
- [ ] `notes.ipc.ts` file watcher conectado: `watcher.on('add'/'change', searchIpc.updateEntry)` e `watcher.on('unlink', searchIpc.removeEntry)`

**Verify**: Editar nota → após salvar → `search:query` com termo novo encontra a nota atualizada sem precisar rebuild manual

**Commit**: `feat(search): implement incremental index updates and connect to file watcher`

---

### T146: Registrar handlers no `main.ts`

**What**: Importar `search.ipc.ts` e registrar `search:build-index`, `search:query`, `search:update-entry`, `search:remove-entry` no `main.ts`
**Where**: `electron/main.ts`
**Depends on**: T143, T144, T145
**Requirement**: SEARCH-01

**Done quando**:
- [ ] Todos os 4 handlers registrados
- [ ] `search:build-index(vaultPath)` chamado após vault ser carregado (no evento pós-vault-setup)
- [ ] `npm run dev` sem erros

**Verify**: `window.electronAPI.search.query('test')` no DevTools → array (vazio se sem match, sem erros)

**Commit**: `feat(search): register search IPC handlers in main process`

---

### T147: Expor API search no `preload.ts`

**What**: Adicionar namespace `search` ao contextBridge
**Where**: `electron/preload.ts`, `src/types/electron.d.ts`
**Depends on**: T146
**Requirement**: SEARCH-01, SEARCH-02

**Done quando**:
- [ ] `window.electronAPI.search.query(rawQuery): Promise<SearchResult[]>`
- [ ] `window.electronAPI.search.buildIndex(vaultPath): Promise<{ indexed: number }>`
- [ ] `window.electronAPI.search.updateEntry(path): Promise<void>`
- [ ] `window.electronAPI.search.removeEntry(path): Promise<void>`
- [ ] TypeScript sem erros

**Verify**: TypeScript aceita `window.electronAPI.search.query('test')` no renderer

**Commit**: `feat(search): expose search API via contextBridge preload`

---

### T148: Criar `search.store.ts` [P]

**What**: Zustand store para estado de busca no renderer
**Where**: `src/stores/search.store.ts`
**Depends on**: T147
**Requirement**: SEARCH-01, SEARCH-02, SEARCH-03

**Done quando**:
- [ ] `query`, `results`, `isSearching`, `isActive`, `isPaletteOpen`, `recentItems` no estado
- [ ] `setQuery`, `setResults`, `setActive`, `togglePalette`, `addToRecents` implementados
- [ ] `recentItems` persiste em `electron-store` (max 10 itens)
- [ ] TypeScript sem erros

**Verify**: `searchStore.setQuery('dev')` → `searchStore.query === 'dev'`

**Commit**: `feat(search): create search Zustand store`

---

### T149: Criar `searchService.ts` [P]

**What**: Wrapper IPC que chama `search:query`, atualiza o store e gerencia debounce
**Where**: `src/services/search.ts`
**Depends on**: T147, T148
**Requirement**: SEARCH-01, SEARCH-02, SEARCH-03

**Done quando**:
- [ ] `query(text)` → seta `isSearching: true` → chama IPC → `searchStore.setResults(results)` → `isSearching: false`
- [ ] `queryActions(text)` → filtra `STATIC_ACTIONS` localmente (sem IPC) com `includes` case-insensitive
- [ ] `rebuildIndex()` → chama `search:build-index`
- [ ] Query vazia: `searchStore.setResults([])` + `searchStore.setActive(false)` sem IPC call

**Verify**: `searchService.query('test')` → `searchStore.results` populado; query vazia → results `[]`

**Commit**: `feat(search): create search service for renderer`

---

### T150: Criar `SearchBar.tsx` [P]

**What**: Input de busca no topo da sidebar com chips de filtros ativos
**Where**: `src/components/search/SearchBar.tsx`
**Depends on**: T148, T149
**Requirement**: SEARCH-01, SEARCH-02

**Done quando**:
- [ ] Input com placeholder "Buscar notas... (Cmd+F)"
- [ ] Debounce de 200ms antes de chamar `searchService.query()`
- [ ] Ao digitar: `searchStore.setActive(true)` → sidebar mostra `<SearchResults>` em vez de file tree
- [ ] Chips de filtros ativos: parse da query detecta operadores e exibe badges `tag:dev ×`, `notebook:work ×`
- [ ] Click no `×` de um chip → remove o operador da query e re-busca
- [ ] Limpar input: `searchStore.setActive(false)` → volta para file tree
- [ ] `Cmd+F` foca o input (listener global via `useEffect`)

**Verify**: Digitar "reunião" → `<SearchResults>` aparece; digitar "tag:dev" → chip "tag:dev" aparece; `×` remove o filtro

**Commit**: `feat(search): create SearchBar with filter chips`

---

### T151: Criar `SearchResults.tsx` [P]

**What**: Lista de resultados com snippets e highlights, navegável por teclado
**Where**: `src/components/search/SearchResults.tsx`
**Depends on**: T148, T149
**Requirement**: SEARCH-02

**Done quando**:
- [ ] Renderiza `searchStore.results`
- [ ] Cada item: título da nota, badge do notebook, tags pequenas, snippet com termo em `<mark>`
- [ ] Highlight aplicado via `highlightRanges` do resultado (não re-parse no renderer)
- [ ] Contagem no topo: "3 notas encontradas" ou "Nenhum resultado para 'xyz'"
- [ ] Navegação por teclado: `↑↓` mudam item focado, `Enter` abre a nota via `editorStore.openNote`
- [ ] Click também abre a nota
- [ ] Loading state (skeleton) durante `searchStore.isSearching`

**Verify**: Buscar "teste" com 3 resultados → lista aparece com snippets e highlights; ↓↓ Enter → segunda nota abre

**Commit**: `feat(search): create SearchResults list with keyboard navigation`

---

### T152: Criar `CommandPalette.tsx` [P]

**What**: Modal Cmd+K com busca fuzzy em notas + ações + notebooks + tags
**Where**: `src/components/search/CommandPalette.tsx`
**Depends on**: T148, T149
**Requirement**: SEARCH-03, SEARCH-04

**Done quando**:
- [ ] `Cmd+K` abre overlay modal (listener global); `Esc` ou click fora fecha
- [ ] Input com busca em tempo real (sem debounce — local + IPC em paralelo)
- [ ] Sem texto: exibe "Recentes" (`searchStore.recentItems`, max 10)
- [ ] Com texto:
  - `>` prefix → só ações (`searchService.queryActions`)
  - `#texto` → busca notas com tag `texto` via `search:query('tag:texto')`
  - `@texto` → busca notas no notebook `texto`
  - Sem prefix → notas (`search:query`) + ações (`queryActions`) misturados por relevância
- [ ] Seções visuais: ícone de categoria (nota/ação/notebook/tag) por item
- [ ] Atalho exibido à direita de cada ação
- [ ] Seleção com ↑↓, execução com Enter
- [ ] Ao abrir nota: `searchStore.addToRecents({ type: 'note', ... })`

**Verify**: `Cmd+K` → palette abre; digitar "sync" → ação "Sincronizar agora" aparece; Enter → sync inicia; `Esc` → fecha

**Commit**: `feat(search): create CommandPalette with fuzzy search and actions`

---

### T153: Integrar SearchBar e SearchResults na sidebar

**What**: Adicionar `<SearchBar>` no topo da sidebar e alternar entre `<FileTree>` e `<SearchResults>` baseado em `searchStore.isActive`
**Where**: `src/components/layout/Sidebar.tsx` ou `MainLayout.tsx`
**Depends on**: T150, T151
**Requirement**: SEARCH-01, SEARCH-02

**Done quando**:
- [ ] `<SearchBar>` fixado no topo da sidebar (acima dos notebooks)
- [ ] `searchStore.isActive ? <SearchResults /> : <FileTree />` renderizado abaixo
- [ ] Transição suave ao ativar/desativar busca (ou sem animação, dependendo do que ficar mais limpo)
- [ ] `search:build-index` chamado quando vault path muda (além de no startup)

**Verify**: Digitar na SearchBar → FileTree some, SearchResults aparece; limpar input → FileTree volta

**Commit**: `feat(search): integrate SearchBar and SearchResults into sidebar`

---

### T154: Integrar CommandPalette no app

**What**: Renderizar `<CommandPalette>` no root do app e registrar atalho global `Cmd+K`
**Where**: `src/App.tsx` ou `MainLayout.tsx`
**Depends on**: T152
**Requirement**: SEARCH-03

**Done quando**:
- [ ] `<CommandPalette>` renderizado condicionalmente (`searchStore.isPaletteOpen`)
- [ ] Listener global `Cmd+K` → `searchStore.togglePalette()` registrado via `useEffect` no root
- [ ] Não conflita com outros atalhos (ex: `Cmd+K` em links do editor não abre palette)
- [ ] Portal React para renderizar fora da hierarquia DOM normal (evita z-index issues)

**Verify**: `Cmd+K` em qualquer tela → palette abre; `Esc` → fecha; outro `Cmd+K` → abre novamente

**Commit**: `feat(search): integrate CommandPalette with global Cmd+K shortcut`

---

### T155: Inicializar índice no startup e após troca de vault

**What**: Garantir que `search:build-index` é chamado sempre que o vault muda ou o app inicia com vault configurado
**Where**: `src/App.tsx` ou `src/screens/MainScreen.tsx`
**Depends on**: T149, T153, T154
**Requirement**: SEARCH-01

**Done quando**:
- [ ] `searchService.rebuildIndex()` chamado após `manifestService.loadManifest()` no startup
- [ ] `searchService.rebuildIndex()` chamado quando vault path muda (troca de vault nas settings)
- [ ] `search:build-index` acontece em background (não bloqueia render da UI)
- [ ] Log de resultado: "Indexadas N notas" no console (debug)

**Verify**: Abrir app com vault de 10 notas → `search:query('a')` retorna resultados sem precisar de ação manual

**Commit**: `feat(search): initialize search index on startup and vault change`

---

## Parallel Execution Map

```
Phase 1:  T140 → T141 → T142

Phase 2:  T141+T142 ─┬→ T143 [P] ─┐
                      ├→ T144 [P] ─┤→ T146 → T147
                      └→ T145 [P] ─┘

Phase 3:  T147 ─┬→ T148 [P] ─┐
                 └→ T149 [P] ─┘

Phase 4:  T148+T149 ─┬→ T150 [P] ─┐
                      ├→ T151 [P] ─┤→ T153 → T154 → T155
                      └→ T152 [P] ─┘
```

---

## Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T140: tipos | 1 arquivo de tipos | ✅ |
| T141: queryParser | 1 função pura | ✅ |
| T142: snippet + ranking helpers | 3 funções puras | ✅ |
| T143: build-index handler | 1 handler | ✅ |
| T144: query handler | 1 handler | ✅ |
| T145: update/remove handlers | 2 handlers + watcher hook | ✅ |
| T146: registrar handlers | 1 arquivo | ✅ |
| T147: expor no preload | 1 namespace | ✅ |
| T148: searchStore | 1 store | ✅ |
| T149: searchService | 1 service | ✅ |
| T150: SearchBar | 1 componente | ✅ |
| T151: SearchResults | 1 componente | ✅ |
| T152: CommandPalette | 1 componente | ✅ |
| T153: integrar sidebar | 2 modificações | ✅ |
| T154: integrar root + atalho | 1 modificação | ✅ |
| T155: inicializar índice | 1 modificação | ✅ |

---

## Nota: Estratégia de Performance

T144 inclui uma verificação explícita de `< 200ms` para 500 notas. Se a busca linear degradar, a migração para Flexsearch é isolada no `search.ipc.ts` — sem tocar nas interfaces IPC nem no renderer. O design foi planejado para esse upgrade sem impacto nas tarefas já completas.
