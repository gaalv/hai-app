# Hai

**Vision:** App pessoal de notas em markdown com experiência de edição inline (estilo Typora/Bear), organização por notebooks e tags, e sincronização estruturada via GitHub — sem infraestrutura própria.

**For:** Uso pessoal com distribuição futura
**Solves:** Editor de notas markdown de alta qualidade com sync automático no GitHub, sem depender de serviços proprietários como Notion ou Roam.

## Goals

- Editor inline estilo Typora — markdown renderiza enquanto você digita, sem toggle editar/preview
- Organização por notebooks, tags e pinned notes com manifesto `hai.json`
- Sync automático e confiável com GitHub (OAuth, sem PAT)
- Histórico visual de versões aproveitando commits do repo
- Interface polida estilo Linear — nativa no Mac, tema claro/escuro

## Tech Stack

**Core:**
- Framework: Electron (shell desktop)
- Frontend: React 18 + Vite + TypeScript
- Styling: Tailwind CSS v4
- Editor: CodeMirror 6 (inline rendering extensions)
- Filesystem: Node.js `fs/promises` via IPC

**Key dependencies:**
- `electron` + `electron-builder` — shell e distribuição
- `electron-store` v10 — persistência de configurações (ESM)
- `keytar` — armazenamento seguro de tokens no keychain do SO
- `chokidar` v3 — file watcher cross-platform
- `isomorphic-git` — operações git puras em JS
- `@octokit/rest` — GitHub API (OAuth, repos, gists)
- CodeMirror 6 — editor com extensões customizadas de inline rendering
- `zustand` — estado global (vault, editor, fileTree, sync)

## Architecture

```
Electron Main (Node.js)
  ├── IPC handlers: vault, notes, sync, search
  ├── hai.json manifest: notebooks, tags, pinned, order
  ├── isomorphic-git: push/pull/log/diff
  └── chokidar: file watcher → events para renderer

Electron Renderer (React)
  ├── AppShell → Auth check → MainLayout
  ├── Sidebar: notebooks, file tree, tags, pinned
  ├── Editor: CodeMirror 6 inline rendering
  ├── Statusbar: sync status, word count, vim mode
  └── Modals: command palette, quick capture, conflict
```

## Data Model

**`hai.json`** (raiz do vault):
```json
{
  "version": 1,
  "notebooks": [{ "id": "...", "name": "...", "path": "..." }],
  "tags": [{ "name": "...", "color": "..." }],
  "pinned": ["path/to/note.md"],
  "inbox": "inbox/",
  "sync": { "repo": "...", "interval": 15, "lastSync": "..." }
}
```

**Nota `.md`** com frontmatter:
```markdown
---
title: Nome da nota
tags: [dev, ideias]
notebook: projects
created: 2025-01-01T00:00:00Z
updated: 2025-01-01T00:00:00Z
---

Conteúdo aqui...
```

## Scope v1.0

**Inclui:**
- Editor inline Typora-style com CodeMirror 6
- Organização: notebooks, tags, pinned, inbox
- Sync automático com GitHub via OAuth
- Histórico visual de versões (commits timeline + diff)
- Themes claro/escuro, sidebar colapsável, statusbar
- Busca full-text com filtros
- Command palette (Cmd+K)
- Quick capture (Cmd+Shift+H)
- Export: PDF, HTML, .md
- Import: .md, Obsidian, Notion
- Link público via GitHub Gist

**Fora do escopo v1.0:**
- Graph view / wikilinks
- Realtime collaboration
- Mobile / web
- Plugin system
- Múltiplos vaults simultâneos

## Constraints

- Desktop-first (macOS prioritário, Windows/Linux depois)
- GitHub como único backend de sync v1.0
- Zero infraestrutura própria — GitHub, Gist e OAuth App do GitHub
- ESM-only codebase (sem CJS workarounds)
