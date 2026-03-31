# Search & Navigation Specification

## Problem Statement

Com muitas notas o usuário precisa encontrá-las rapidamente. A navegação atual é apenas file tree — sem busca, sem filtros, sem acesso rápido a ações.

## Goals

- Busca full-text instantânea com filtros por tag, notebook e data
- Command palette (Cmd+K) para qualquer ação do app
- Busca estilo Spotlight (Cmd+F) dentro do app

## Requirements

### SEARCH-01 — Full-text Search
- IPC `search:query` — busca em todos os .md do vault
- Indexação incremental (rebuild ao criar/editar/deletar nota)
- Mostrar snippet de contexto com termo destacado
- Suporte a operadores: `tag:dev`, `notebook:projects`, `after:2024-01-01`, `before:`, `title:`
- Regex opcional com prefixo `/pattern/`
- Resultados ordenados por relevância (TF-IDF simples) ou data

### SEARCH-02 — Search UI
- Barra de busca no topo da sidebar ou atalho `Cmd+F`
- Input com placeholder "Buscar notas..."
- Chips de filtro ativos (tag:dev × , notebook:projects ×)
- Lista de resultados com preview do snippet
- Highlight do termo no resultado
- Navegar resultados com ↑↓, abrir com Enter

### SEARCH-03 — Command Palette (Cmd+K)
- Modal fullscreen-overlay com input de busca
- Busca fuzzy em ações + notas + notebooks + tags
- Categorias: Notas (abrir), Ações (nova nota, sync, settings, focus mode, etc.), Notebooks (ir para), Tags (filtrar)
- Histórico de itens recentes
- Atalho exibido ao lado de cada ação
- Fechar com Esc

### SEARCH-04 — Quick Note Switcher
- Dentro do command palette, `>` prefix para filtrar só ações
- Sem prefix: busca por notas + ações
- `#tag` para filtrar por tag
- `@notebook` para filtrar por notebook

## Technical Notes

- Índice de busca: construído em memória no main process (sem Lunr/Fuse como dep extra inicialmente)
- Para vault pequeno (<500 notas): busca linear com regex é suficiente
- Para vault grande: considerar Flexsearch (lightweight, ESM-compatible)
- Indexação acontece no main process, resultados via IPC para renderer

## Out of Scope

- Busca em arquivos não-.md (PDFs, imagens)
- Busca semântica / AI
- Salvar buscas

## Acceptance Criteria

1. WHEN usuário digita termo THEN resultados aparecem em <200ms para vault com até 500 notas
2. WHEN usuário usa `tag:dev` THEN só notas com tag "dev" aparecem
3. WHEN usuário pressiona Cmd+K THEN command palette abre com foco no input
4. WHEN usuário digita nome de nota no palette THEN nota aparece nos resultados e abre com Enter

## Status: PENDING — M6
