# Roadmap

**Current Milestone:** v1.0 — Full-Featured Desktop App
**Status:** In Progress (base implementada, expandindo)

---

## ✅ Base Implementada (M0)

- Vault setup (selecionar/criar pasta)
- Editor CodeMirror 6 com split view preview
- Sidebar com file tree
- GitHub sync manual (push/pull) via PAT
- Autosave 500ms
- Tailwind CSS v4

---

## M1 — Interface & UX Polish

**Goal:** App visualmente polido, nativo no Mac, com temas e layout profissional
**Status:** ✅ Done

| Feature | Priority | Status |
|---|---|---|
| Mac transparent titlebar | P1 | ✅ Done |
| Light/dark theme (system preference) | P1 | ✅ Done |
| Collapsible sidebar (Cmd+\) | P1 | ✅ Done |
| VSCode-style statusbar | P1 | ✅ Done |
| JetBrains Mono como fonte padrão | P1 | ✅ Done |
| CSS variables para theming | P1 | ✅ Done |
| Focus mode (Cmd+Shift+F) | P2 | ✅ Done |

---

## M2 — Editor v2 (Inline Rendering)

**Goal:** Editor estilo Typora — markdown renderiza inline enquanto digita
**Status:** ✅ Done

| Feature | Priority | Status |
|---|---|---|
| Inline markdown rendering (headings, bold, italic, links, code) | P1 | ✅ Done |
| Vim mode (Cmd+\ toggle nas settings) | P2 | ✅ Done |
| Fonte JetBrains Mono no editor | P1 | ✅ Done |
| Syntax highlight em code blocks por linguagem | P1 | Pending (M2.1) |

---

## M3 — Data Model & Organização

**Goal:** Estrutura com notebooks, tags e hai.json como manifesto central
**Status:** ✅ Done

| Feature | Priority | Status |
|---|---|---|
| hai.json manifest (schema + IPC) | P1 | ✅ Done |
| Notebooks / hierarquia de pastas | P1 | ✅ Done |
| Tags com cores customizáveis | P1 | ✅ Done |
| Notas fixadas (pinned) | P2 | ✅ Done |
| Inbox (destino padrão sem notebook) | P2 | ✅ Done |
| Lixeira com restauração | P2 | ✅ Done |

---

## M4 — Auth OAuth & Perfil

**Goal:** Autenticação via GitHub OAuth (sem PAT), perfil do usuário
**Status:** ✅ Done

| Feature | Priority | Status |
|---|---|---|
| GitHub OAuth Device Flow | P1 | ✅ Done |
| Tela de login via GitHub | P1 | ✅ Done |
| Perfil: avatar e nome do GitHub | P2 | ✅ Done |
| Settings modal (tema, vim, sync interval) | P2 | ✅ Done |

---

## M5 — Sync v2

**Goal:** Sync automático com histórico visual e lixeira
**Status:** ✅ Done

| Feature | Priority | Status |
|---|---|---|
| Sync automático com intervalo configurável | P1 | ✅ Done |
| Status de sync na statusbar (VSCode-style) | P1 | ✅ Done |
| Histórico visual de versões (commits timeline + diff) | P1 | ✅ Done |
| Restaurar versão de commit | P1 | ✅ Done |
| OAuth token suportado no sync | P1 | ✅ Done |

---

## M6 — Search & Navigation

**Goal:** Encontrar qualquer nota instantaneamente
**Status:** ✅ Done

| Feature | Priority | Status |
|---|---|---|
| Busca full-text com filtros (tag, notebook, data) | P1 | ✅ Done |
| Command palette (Cmd+K) | P1 | ✅ Done |
| Indexação incremental | P1 | ✅ Done |

---

## M7 — Atalhos Globais

**Goal:** Acesso rápido ao app e à captura de notas de qualquer lugar
**Status:** ✅ Done

| Feature | Priority | Status |
|---|---|---|
| Nova nota (Cmd+N) | P1 | ✅ Done |
| Quick capture (Cmd+Shift+H) — janela flutuante global | P1 | ✅ Done |
| Command palette (Cmd+K) | P1 | ✅ Done |
| Settings (Cmd+,) | P1 | ✅ Done |
| Focus mode (Cmd+Shift+F) | P1 | ✅ Done |
| Toggle sidebar (Cmd+\) | P1 | ✅ Done |

---

## M8 — Export & Import & Share

**Goal:** Portabilidade de dados e compartilhamento
**Status:** ✅ Done

| Feature | Priority | Status |
|---|---|---|
| Export: PDF, HTML, .md puro | P1 | ✅ Done |
| Import: .md avulso, pasta de .md | P1 | ✅ Done |
| Link público via GitHub Gist | P2 | ✅ Done |
| Import: Notion, Obsidian | P2 | Pending (v2) |

---

## Future (v2+)

- Graph view / wikilinks `[[note]]`
- Mobile (iOS/Android)
- Web app
- Plugin system
- Realtime collaboration
- Multiple vaults
