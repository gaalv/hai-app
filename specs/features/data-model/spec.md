# Data Model Specification

## Problem Statement

A estrutura atual do Hai é flat — arquivos .md soltos no vault sem metadata de organização. Para suportar notebooks, tags e pinned notes precisamos de um manifesto central (`hai.json`) e frontmatter nas notas.

## Goals

- `hai.json` como fonte de verdade para organização (notebooks, tags, pinned)
- Notas organizadas em notebooks (pastas) com metadata via frontmatter
- Tags com cores customizáveis associadas a notas
- Inbox como notebook padrão para notas sem classificação

## hai.json Schema

```typescript
interface HaiManifest {
  version: number                    // schema version (1)
  notebooks: Notebook[]
  tags: Tag[]
  pinned: string[]                   // array de paths relativos
  inbox: string                      // path da pasta inbox (default: "inbox/")
  sync?: {
    repo: string
    interval: number                 // minutos: 5, 15, 30, 0 = manual
    lastSync?: string                // ISO date
  }
}

interface Notebook {
  id: string                         // uuid
  name: string
  path: string                       // path relativo ao vault
  color?: string                     // cor opcional (hex ou oklch)
  icon?: string                      // emoji ou nome de ícone
  order: number
}

interface Tag {
  name: string                       // slug (sem espaços)
  label: string                      // display name
  color: string                      // hex color
}
```

## Note Frontmatter Schema

```yaml
---
title: Nome da nota
notebook: projects          # id do notebook
tags: [dev, ideias]
created: 2025-01-01T00:00:00Z
updated: 2025-01-01T00:00:00Z
pinned: false
---
```

## Requirements

### DATA-01 — Criar/Ler hai.json
- IPC `manifest:load` — lê ou cria hai.json com defaults
- IPC `manifest:save` — persiste mudanças
- Criar inbox/ automaticamente se não existir
- Vault sem hai.json → criar com structure mínima

### DATA-02 — Notebooks CRUD
- IPC `notebooks:create`, `notebooks:rename`, `notebooks:delete`, `notebooks:list`
- Criar notebook = criar pasta no vault + entrada no hai.json
- Deletar notebook: opção de mover notas para inbox ou deletar junto
- Reordenar notebooks (drag & drop na sidebar)

### DATA-03 — Tags CRUD
- IPC `tags:create`, `tags:update`, `tags:delete`
- Tags armazenadas no hai.json com nome, label e cor
- Associação nota↔tags via frontmatter da nota
- Filtrar notas por tag

### DATA-04 — Pinned Notes
- IPC `notes:pin`, `notes:unpin`
- Lista de pinned em hai.json
- Seção "Fixadas" no topo da sidebar

### DATA-05 — Inbox
- Pasta especial configurada em hai.json
- Notas criadas via quick capture vão para inbox
- Seção "Inbox" na sidebar com badge de contagem
- Notas na inbox podem ser movidas para notebooks

### DATA-06 — Note Metadata
- Ler/escrever frontmatter nas notas com gray-matter
- Sync entre frontmatter e hai.json (tags, notebook assignment)
- `created` setado na criação, `updated` atualizado no save
- Migração: notas existentes sem frontmatter recebem frontmatter mínimo ao abrir

### DATA-07 — Manifest Sync
- hai.json incluído no commit do GitHub sync
- Resolver conflitos de hai.json: merge inteligente (union de notebooks e tags)
- Versionar hai.json separadamente das notas

## Out of Scope

- Múltiplos vaults simultâneos
- Compartilhar notebooks com outros usuários
- Templates de notebooks

## Acceptance Criteria

1. WHEN vault abre THEN hai.json é lido/criado e notebooks aparecem na sidebar
2. WHEN usuário cria notebook THEN pasta criada no vault + hai.json atualizado
3. WHEN nota tem tags no frontmatter THEN tags aparecem na UI com as cores configuradas
4. WHEN nota é fixada THEN aparece na seção "Fixadas" no topo da sidebar
5. WHEN nota criada via quick capture THEN vai para inbox automaticamente

## Status: PENDING — M3
