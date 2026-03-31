# Search & Navigation Design

**Spec**: `.specs/features/search-navigation/spec.md`
**Status**: Draft

---

## Architecture Overview

O índice de busca vive no main process — acesso direto ao filesystem, sem passar pelo renderer para ler arquivos. O renderer envia queries via IPC e recebe `SearchResult[]`. O índice é construído em memória e atualizado incrementalmente via chokidar (já existente do file watcher).

```mermaid
graph TD
    A[SearchBar - renderer] -->|IPC: search:query| B[search.ipc.ts - main]
    C[CommandPalette - renderer] -->|IPC: search:query + search:actions| B
    B --> D[SearchIndex - main]
    D --> E[vault .md files via fs]
    F[chokidar file watcher] -->|add/change/unlink| D
    D -->|update index| G[in-memory index Map]
    B --> H[SearchResult[]]
    H --> A
    H --> C
```

---

## Search Engine: Decisão de Implementação

Para vault ≤500 notas: **busca linear com regex** no main process é suficiente (< 50ms para 500 arquivos de 10KB cada).

Para vault maior: **Flexsearch** — lightweight (6KB gzip), ESM-compatible, sem binários nativos.

**Estratégia**: implementar linear primeiro; se performance degradar, substituir pelo Flexsearch sem mudar as interfaces IPC.

### Estrutura do índice in-memory

```typescript
// search.ipc.ts
interface IndexEntry {
  path: string             // path relativo ao vault
  title: string            // nome do arquivo ou frontmatter.title
  content: string          // conteúdo sem frontmatter (para snippet)
  fullContent: string      // conteúdo completo (para busca)
  tags: string[]           // frontmatter.tags
  notebook: string         // nome da pasta pai
  created: string          // frontmatter.created (ISO)
  updated: string          // frontmatter.updated (ISO)
  mtime: number            // fs mtime para invalidação do cache
}

// Índice global no main process
const searchIndex = new Map<string, IndexEntry>()
```

---

## Query Parser

O parser interpreta a query string em partes estruturadas:

```typescript
interface ParsedQuery {
  text: string             // termo de busca livre
  tags: string[]           // tag:dev tag:ideias
  notebook: string | null  // notebook:projects
  after: Date | null       // after:2024-01-01
  before: Date | null      // before:2024-12-31
  title: string | null     // title:reunião
  regex: RegExp | null     // /pattern/
}

function parseQuery(raw: string): ParsedQuery {
  // Extrai operadores com regex
  // Exemplo: "reunião tag:dev after:2024-01-01 notebook:work"
  // → { text: "reunião", tags: ["dev"], after: Date, notebook: "work" }
}
```

### Exemplos de queries

| Input | Interpretação |
|---|---|
| `reunião` | full-text em todo o conteúdo |
| `tag:dev` | notas com tag "dev" |
| `tag:dev tag:typescript` | notas com AMBAS as tags |
| `notebook:projects reunião` | full-text "reunião" dentro do notebook "projects" |
| `after:2024-01-01` | notas criadas após 01/01/2024 |
| `before:2024-12-31 after:2024-06-01` | intervalo de datas |
| `title:standup` | busca só no título |
| `/TODO.+/` | regex no conteúdo |

---

## Ranking de Resultados

Ordem de prioridade (sem TF-IDF completo na V1):

1. Match exato no título → score +3
2. Match no início do conteúdo (primeiros 200 chars) → score +2
3. Match no corpo → score +1 por ocorrência (max 5)
4. Mais recente → desempate

---

## Snippet Extraction

```typescript
function extractSnippet(content: string, term: string, length = 150): string {
  const idx = content.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return content.slice(0, length) + '...'
  const start = Math.max(0, idx - 60)
  const end = Math.min(content.length, idx + term.length + 90)
  return (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '')
}
```

---

## Components

### `SearchBar.tsx`
- **Purpose**: Input de busca no topo da sidebar
- **Location**: `src/components/search/SearchBar.tsx`
- **Interfaces**:
  - Input com placeholder "Buscar notas... (Cmd+F)"
  - Debounce 200ms antes de disparar `searchService.query(text)`
  - Chips de filtros ativos: cada operador vira badge removível
  - `Cmd+F` foca o input
  - Ao limpar → volta para file tree normal
- **Dependencies**: `searchStore`, `searchService`

### `SearchResults.tsx`
- **Purpose**: Lista de resultados substituindo a file tree quando busca ativa
- **Location**: `src/components/search/SearchResults.tsx`
- **Interfaces**:
  - Renderiza `searchStore.results`
  - Cada item: título da nota, notebook, snippet com termo destacado (`<mark>`)
  - Navegação com ↑↓ (keyboard), abrir com Enter ou click
  - Contagem de resultados no topo ("3 notas encontradas")
- **Dependencies**: `searchStore`, `editorStore`

### `CommandPalette.tsx`
- **Purpose**: Modal de acesso rápido a notas e ações (Cmd+K)
- **Location**: `src/components/search/CommandPalette.tsx`
- **Interfaces**:
  - Overlay modal com backdrop blur
  - Input fuzzy search
  - Seções: Recentes, Notas, Ações, Notebooks, Tags
  - Prefixos especiais: `>` (só ações), `#tag` (filtrar por tag), `@notebook`
  - Atalhos exibidos ao lado das ações
  - Histórico dos 10 itens mais recentes (electron-store)
  - Fechar com Esc ou click fora
- **Dependencies**: `searchStore`, `searchService`, `manifestStore`

### `searchService` (renderer)
- **Purpose**: Wrapper IPC para busca e indexação
- **Location**: `src/services/search.ts`
- **Interfaces**:
  ```typescript
  query(text: string): Promise<SearchResult[]>
  queryActions(text: string): CommandItem[]   // busca local em ações (sem IPC)
  rebuildIndex(): Promise<void>               // força reindexação completa
  ```
- **Dependencies**: `window.electronAPI.search`, `searchStore`

### `search.ipc.ts` (main process)
- **Purpose**: Índice in-memory + handlers de busca + atualização incremental
- **Location**: `electron/ipc/search.ipc.ts`
- **Interfaces**:
  ```typescript
  // search:build-index(vaultPath)
  //   → lê todos .md do vault com gray-matter
  //   → popula searchIndex Map

  // search:query(rawQuery)
  //   → parseQuery(rawQuery)
  //   → filtra searchIndex com todos os critérios
  //   → rankResults()
  //   → retorna SearchResult[] (max 50)

  // search:update-entry(path)
  //   → re-lê o arquivo, atualiza entrada no Map (chamado pelo file watcher)

  // search:remove-entry(path)
  //   → remove entrada do Map
  ```

### `searchStore`
- **Purpose**: Estado de busca no renderer
- **Location**: `src/stores/search.store.ts`
- **Interfaces**:
  ```typescript
  interface SearchStore {
    query: string
    results: SearchResult[]
    isSearching: boolean
    isActive: boolean        // true quando busca substituiu file tree
    isPaletteOpen: boolean
    recentItems: RecentItem[]
    setQuery(q: string): void
    setResults(r: SearchResult[]): void
    setActive(v: boolean): void
    togglePalette(): void
    addToRecents(item: RecentItem): void
  }
  ```

---

## Data Models

```typescript
interface SearchResult {
  path: string
  title: string
  notebook: string
  tags: string[]
  snippet: string          // texto com termo de busca contextualizado
  highlightRanges: [number, number][]  // posições do termo no snippet para <mark>
  score: number
  updated: string
}

interface CommandItem {
  id: string
  label: string
  description?: string
  shortcut?: string
  category: 'note' | 'action' | 'notebook' | 'tag'
  action: () => void
}

interface RecentItem {
  type: 'note' | 'action'
  label: string
  path?: string
  actionId?: string
  accessedAt: string
}
```

---

## Busca Incremental via File Watcher

O file watcher já existe (`notes.ipc.ts` com chokidar). É necessário conectar os eventos ao `searchIndex`:

```typescript
// notes.ipc.ts — adicionar ao watcher existente
watcher.on('add', (path) => {
  if (path.endsWith('.md')) searchIpc.updateEntry(path)
})
watcher.on('change', (path) => {
  if (path.endsWith('.md')) searchIpc.updateEntry(path)
})
watcher.on('unlink', (path) => {
  if (path.endsWith('.md')) searchIpc.removeEntry(path)
})
```

---

## Command Palette: Ações Registradas

As ações são definidas como array estático no renderer + ações dinâmicas injetadas por features:

```typescript
const STATIC_ACTIONS: CommandItem[] = [
  { id: 'new-note',    label: 'Nova nota',          shortcut: 'Cmd+N',       category: 'action' },
  { id: 'sync-push',   label: 'Sincronizar agora',  shortcut: '',            category: 'action' },
  { id: 'settings',    label: 'Configurações',       shortcut: 'Cmd+,',      category: 'action' },
  { id: 'focus-mode',  label: 'Modo foco',           shortcut: 'Cmd+Shift+F', category: 'action' },
  { id: 'toggle-sidebar', label: 'Toggle sidebar',  shortcut: 'Cmd+\\',     category: 'action' },
  { id: 'history',     label: 'Histórico de versões',shortcut: 'Cmd+H',      category: 'action' },
  { id: 'import',      label: 'Importar notas',      shortcut: '',            category: 'action' },
  { id: 'export-pdf',  label: 'Exportar como PDF',   shortcut: 'Cmd+Shift+E', category: 'action' },
]
```

---

## Tech Decisions

| Decisão | Escolha | Motivo |
|---|---|---|
| Engine de busca | Linear regex (V1) → Flexsearch (se necessário) | Zero deps na V1; interfaces IPC estáveis para migração |
| Índice | `Map<string, IndexEntry>` in-memory no main | Main tem acesso direto ao fs; sem round-trip para ler arquivos |
| Atualização incremental | Conectar ao chokidar existente | Reutiliza infraestrutura já presente |
| Query parser | Regex manual | Simples, zero deps, suficiente para os operadores previstos |
| Ranking | Score simples (título > início > corpo) | TF-IDF completo é overengineering para uso pessoal |
| Command palette fuzzy | Filtro com `string.includes` case-insensitive | Fuse.js é overkill para <200 ações + notas no palette |
| Highlight de snippet | `highlightRanges` no resultado + `<mark>` no render | Separação entre lógica (main) e apresentação (renderer) |
