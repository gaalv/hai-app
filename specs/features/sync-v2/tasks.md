# Sync v2 Tasks

**Design**: `.specs/features/sync-v2/design.md`
**Status**: Draft

> Tasks T86–T101. Depende de GitHub Sync (T25–T40) e Data Model (T66–T82) concluídos.

---

## Execution Plan

```
Phase 1 — Backend IPC (Parallel após github-sync concluído):
       ┌→ T86 [P] (auto-sync timer)
       ├→ T87 [P] (get-history)
       ├→ T88 [P] (get-diff)
       └→ T89 [P] (restore-version + trash ops)

Phase 2 — Registrar + Expor (Sequential após Phase 1):
  T86+T87+T88+T89 → T90 → T91

Phase 3 — Renderer (Parallel após T91):
       ┌→ T92 [P] (syncStore — adições)
  T91 ─┤
       └→ T93 [P] (syncService — adições)

Phase 4 — UI Components (Parallel após T92+T93):
       ┌→ T94 [P] (SyncStatusBar)
  T93 ─┼→ T95 [P] (SyncHistoryPanel)
       ├→ T96 [P] (CommitDiffViewer)
       └→ T97 [P] (TrashSection)

Phase 5 — Integração:
  T94+T95+T96+T97 → T98 → T99
```

---

## Task Breakdown

### T86: Criar handler `sync:set-auto` e timer de auto-sync [P]

**What**: Implementar timer de auto-sync no main process com setInterval; handlers `sync:set-auto` e `sync:stop-auto`
**Where**: `electron/ipc/sync.ipc.ts` (adicionar)
**Depends on**: T29 (push existente), T30 (pull existente)
**Requirement**: SYNC2-01

**Done quando**:
- [ ] `sync:set-auto(intervalMinutes)` → cancela timer existente; se `intervalMinutes > 0`: cria novo `setInterval`
- [ ] `sync:stop-auto` → `clearInterval(autoSyncTimer)`
- [ ] Timer chama `handlePush` apenas se `statusMatrix` tem mudanças
- [ ] Timer chama `handleSafePull` — fast-forward only; se conflito: emite `sync:conflict-detected` para renderer
- [ ] Timer persiste entre janelas minimizadas (roda no main process, não no renderer)
- [ ] `intervalMinutes: 0` = modo manual (sem timer)

**Verify**: Configurar auto-sync de 1min → editar nota → aguardar → commit aparece no GitHub automaticamente

**Commit**: `feat(sync-v2): implement auto-sync timer in main process`

---

### T87: Criar handler `sync:get-history` [P]

**What**: Retornar lista de commits do repo usando `isomorphic-git log`
**Where**: `electron/ipc/sync.ipc.ts` (adicionar)
**Depends on**: T25 (isomorphic-git instalado)
**Requirement**: SYNC2-03

**Done quando**:
- [ ] `sync:get-history(limit?)` → `git.log({ fs, dir: vaultPath, depth: limit ?? 50 })`
- [ ] Retorna `CommitEntry[]`: `{ hash, shortHash, message, timestamp, filesChanged: [] }`
- [ ] Se vault não tem commits → retorna `[]` sem lançar erro
- [ ] Funciona sem internet (lê histórico local)

**Verify**: Após 3 commits → `sync:get-history()` retorna array com 3 entradas e metadados corretos

**Commit**: `feat(sync-v2): implement sync:get-history IPC handler`

---

### T88: Criar handler `sync:get-diff` [P]

**What**: Retornar diff linha a linha de uma nota entre HEAD e um commit específico
**Where**: `electron/ipc/sync.ipc.ts` (adicionar)
**Depends on**: T87
**Requirement**: SYNC2-03

**Done quando**:
- [ ] `sync:get-diff(commitHash, notePath)` → `git.readBlob({ fs, dir, oid: commitHash, filepath: notePath })`
- [ ] Lê conteúdo atual: `fs.readFile(path.join(vaultPath, notePath), 'utf-8')`
- [ ] Computa `DiffLine[]` via LCS linha a linha
- [ ] Retorna `DiffResult { notePath, commitHash, lines: DiffLine[] }`
- [ ] Se arquivo não existia no commit (novo arquivo) → todas linhas como `add`
- [ ] Se arquivo não existe mais (deletado) → todas linhas como `remove`

**Verify**: Editar nota → fazer commit → `sync:get-diff(commitHash, notePath)` retorna linhas adicionadas corretamente

**Commit**: `feat(sync-v2): implement sync:get-diff IPC handler with line-diff`

---

### T89: Criar handlers `sync:restore-version` e operações de lixeira [P]

**What**: Restaurar nota para versão de um commit; move-to-trash, restore-from-trash, empty-trash
**Where**: `electron/ipc/sync.ipc.ts` e `electron/ipc/manifest.ipc.ts` (adicionar)
**Depends on**: T88, T68 (manifest load/save)
**Requirement**: SYNC2-03, SYNC2-04

**Done quando**:
- [ ] `sync:restore-version(commitHash, notePath)` → lê blob do commit → `fs.writeFile` com conteúdo antigo
- [ ] Restauração cria novo arquivo no working dir (commitado no próximo push)
- [ ] `notes:move-to-trash(path)` → cria `.trash/` se não existe → `fs.rename` → atualiza `hai.json.trash[]`
- [ ] `notes:restore-from-trash(path)` → move de `.trash/` para `originalPath` → remove de `hai.json.trash[]`
- [ ] `notes:empty-trash()` → deleta todos arquivos em `.trash/` → limpa `hai.json.trash[]`
- [ ] `notes:auto-purge-trash(retentionDays)` → remove entradas com `deletedAt` expirado

**Verify**:
- Restaurar versão → conteúdo da nota reverte para o do commit
- Deletar nota → vai para `.trash/`; restaurar → volta para local original

**Commit**: `feat(sync-v2): implement restore-version and trash operation handlers`

---

### T90: Registrar novos handlers no `main.ts`

**What**: Registrar `sync:set-auto`, `sync:stop-auto`, `sync:get-history`, `sync:get-diff`, `sync:restore-version`, e os handlers de lixeira
**Where**: `electron/main.ts`
**Depends on**: T86, T87, T88, T89
**Requirement**: SYNC2-01, SYNC2-03, SYNC2-04

**Done quando**:
- [ ] Todos os 7 novos handlers registrados
- [ ] `npm run dev` sem erros

**Verify**: `window.electronAPI.sync.getHistory()` no DevTools → array de commits (ou `[]`)

**Commit**: `feat(sync-v2): register new sync-v2 IPC handlers in main process`

---

### T91: Expor novos métodos no `preload.ts`

**What**: Adicionar `getHistory`, `getDiff`, `restoreVersion`, `setAutoSync`, `stopAutoSync`, `onConflictDetected` ao namespace `sync`; adicionar `moveToTrash`, `restoreFromTrash`, `emptyTrash` ao namespace `notes`
**Where**: `electron/preload.ts`, `src/types/electron.d.ts`
**Depends on**: T90
**Requirement**: SYNC2-01, SYNC2-03, SYNC2-04

**Done quando**:
- [ ] Tipagem correta para todos os novos métodos
- [ ] `onConflictDetected(cb)` exposto como listener
- [ ] TypeScript sem erros

**Verify**: TypeScript aceita `window.electronAPI.sync.getHistory()` no renderer sem erros

**Commit**: `feat(sync-v2): expose sync-v2 methods via contextBridge preload`

---

### T92: Atualizar `sync.store.ts` com estado para histórico [P]

**What**: Adicionar campos de histórico e auto-sync ao `syncStore`
**Where**: `src/stores/sync.store.ts`
**Depends on**: T91, T34 (store existente)
**Requirement**: SYNC2-01, SYNC2-03

**Done quando**:
- [ ] `history: CommitEntry[]` adicionado
- [ ] `selectedCommit: CommitEntry | null` adicionado
- [ ] `diff: DiffResult | null` adicionado
- [ ] `isHistoryOpen: boolean` adicionado
- [ ] `autoSyncInterval: number` adicionado (0 = manual)
- [ ] Actions: `setHistory`, `setSelectedCommit`, `setDiff`, `toggleHistory`, `setAutoSyncInterval`

**Verify**: `syncStore.setHistory([...])` → `syncStore.history` atualizado

**Commit**: `feat(sync-v2): extend sync store with history and auto-sync state`

---

### T93: Atualizar `syncService.ts` com métodos de histórico [P]

**What**: Adicionar `getHistory`, `getDiff`, `restoreVersion`, `setAutoSync` ao `syncService`
**Where**: `src/services/sync.ts`
**Depends on**: T91, T92, T35 (service existente)
**Requirement**: SYNC2-01, SYNC2-03

**Done quando**:
- [ ] `getHistory(limit?)` → IPC → `syncStore.setHistory(result)`
- [ ] `getDiff(hash, path)` → IPC → `syncStore.setDiff(result)`
- [ ] `restoreVersion(hash, path)` → IPC → recarrega conteúdo da nota no editor
- [ ] `setAutoSync(interval)` → IPC + `syncStore.setAutoSyncInterval(interval)`
- [ ] `stopAutoSync()` → IPC
- [ ] `onConflictDetected` listener registrado uma vez no startup

**Verify**: `syncService.getHistory()` → `syncStore.history` populado

**Commit**: `feat(sync-v2): extend sync service with history and auto-sync methods`

---

### T94: Criar `SyncStatusBar.tsx` [P]

**What**: Item na bottom statusbar com ícone e texto de status de sync
**Where**: `src/components/sync/SyncStatusBar.tsx`
**Depends on**: T92, T93
**Requirement**: SYNC2-02

**Done quando**:
- [ ] Ícone + texto: `⟳ Sincronizando` | `✓ Sincronizado` | `○ N pendentes` | `✕ Erro`
- [ ] Lê `syncStore.status` e `syncStore.pendingChanges`
- [ ] Tooltip com `syncStore.lastSync` formatado
- [ ] Click → abre `<SyncPanel>` (existente do github-sync, agora com aba "Histórico")
- [ ] Spinner animado no estado `syncing`

**Verify**: Editar nota sem push → badge mostra `○ 1 pendente`; após push → `✓ Sincronizado`

**Commit**: `feat(sync-v2): create SyncStatusBar component for statusbar`

---

### T95: Criar `SyncHistoryPanel.tsx` [P]

**What**: Painel lateral com timeline de commits do repo
**Where**: `src/components/sync/SyncHistoryPanel.tsx`
**Depends on**: T92, T93
**Requirement**: SYNC2-03

**Done quando**:
- [ ] Lista commits de `syncStore.history` (carregados via `syncService.getHistory()` no open)
- [ ] Cada item: hash curto, mensagem truncada, data relativa ("há 2h")
- [ ] Click em commit → chama `syncService.getDiff(hash, activeNotePath)` → exibe `<CommitDiffViewer>`
- [ ] Botão "Restaurar esta versão" por commit → confirmação → `syncService.restoreVersion`
- [ ] Estado de loading enquanto carrega histórico
- [ ] Mensagem "Sem histórico — faça seu primeiro sync" se `history.length === 0`

**Verify**: Abrir painel → lista commits; click em commit → diff carregado

**Commit**: `feat(sync-v2): create SyncHistoryPanel with commits timeline`

---

### T96: Criar `CommitDiffViewer.tsx` [P]

**What**: Visualização de diff linha a linha entre versão atual e commit selecionado
**Where**: `src/components/sync/CommitDiffViewer.tsx`
**Depends on**: T92
**Requirement**: SYNC2-03

**Done quando**:
- [ ] Lê `syncStore.diff` para renderizar linhas
- [ ] Linhas `add`: fundo verde claro com `+` prefixo
- [ ] Linhas `remove`: fundo vermelho claro com `-` prefixo
- [ ] Linhas `context`: fundo neutro sem prefixo
- [ ] Fonte monospace (JetBrains Mono, consistente com editor)
- [ ] Scroll independente do painel de histórico
- [ ] Estado "selecione um commit para ver o diff" se nenhum selecionado

**Verify**: Selecionar commit → diff renderizado com cores corretas para adições e remoções

**Commit**: `feat(sync-v2): create CommitDiffViewer component`

---

### T97: Criar `TrashSection.tsx` [P]

**What**: Seção "Lixeira" colapsada na sidebar
**Where**: `src/components/sidebar/TrashSection.tsx`
**Depends on**: T74 (manifest store), T93
**Requirement**: SYNC2-04

**Done quando**:
- [ ] Lê `manifestStore.trash` para listar notas deletadas
- [ ] Exibe: nome da nota + data de deleção relativa
- [ ] Botão "Restaurar" por nota → `manifestService.restoreFromTrash(path)`
- [ ] Botão "Esvaziar lixeira" no header da seção → confirmação → `manifestService.emptyTrash()`
- [ ] Badge com contagem de itens na lixeira
- [ ] Seção colapsada por padrão

**Verify**: Deletar nota → aparece na lixeira com data; clicar Restaurar → nota volta ao local original

**Commit**: `feat(sync-v2): create TrashSection sidebar component`

---

### T98: Integrar SyncStatusBar no layout e inicializar auto-sync

**What**: Adicionar `<SyncStatusBar>` à bottom statusbar e inicializar auto-sync no startup
**Where**: `src/components/layout/StatusBar.tsx` ou `MainLayout.tsx`
**Depends on**: T94, T95, T96, T97
**Requirement**: SYNC2-01, SYNC2-02

**Done quando**:
- [ ] `<SyncStatusBar>` visível na bottom statusbar (à esquerda ou direita)
- [ ] No startup: `syncService.setAutoSync(settings.syncInterval)` chamado (0 se manual)
- [ ] `<SyncHistoryPanel>` renderizado condicionalmente quando `syncStore.isHistoryOpen`
- [ ] `<TrashSection>` adicionada ao final da sidebar

**Verify**: App completo — statusbar com sync status, Cmd+H abre histórico, lixeira na sidebar

**Commit**: `feat(sync-v2): integrate SyncStatusBar and initialize auto-sync on startup`

---

### T99: Ligar intervalo de auto-sync com settings

**What**: Quando usuário muda intervalo de sync nas settings, chamar `syncService.setAutoSync(newInterval)`
**Where**: `src/components/settings/SettingsModal.tsx`
**Depends on**: T93, T52 (SettingsModal existente)
**Requirement**: SYNC2-01

**Done quando**:
- [ ] Seletor de intervalo na seção Sync (5/15/30min/Manual)
- [ ] Ao mudar: salva no electron-store + `syncService.setAutoSync(interval)`
- [ ] Valor atual lido do `syncStore.autoSyncInterval` ao abrir settings

**Verify**: Mudar de "Manual" para "15min" → push automático acontece após 15min sem ação manual

**Commit**: `feat(sync-v2): connect auto-sync interval setting to sync service`

---

## Parallel Execution Map

```
Phase 1:  T86 [P] ─┐
          T87 [P] ─┤
          T88 [P] ─┤→ T90 → T91
          T89 [P] ─┘

Phase 2:  T91 ─┬→ T92 [P] ─┐
                └→ T93 [P] ─┘

Phase 3:  T92+T93 ─┬→ T94 [P] ─┐
                    ├→ T95 [P] ─┤→ T98 → T99
                    ├→ T96 [P] ─┤
                    └→ T97 [P] ─┘
```

---

## Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T86: auto-sync timer | 1 handler + setInterval | ✅ |
| T87: get-history | 1 handler | ✅ |
| T88: get-diff | 1 handler + LCS | ✅ |
| T89: restore-version + trash ops | 5 handlers coesos | ✅ |
| T90: registrar handlers | 1 arquivo | ✅ |
| T91: expor no preload | 2 namespaces | ✅ |
| T92: atualizar sync.store | extensão de 1 store | ✅ |
| T93: atualizar syncService | extensão de 1 service | ✅ |
| T94: SyncStatusBar | 1 componente | ✅ |
| T95: SyncHistoryPanel | 1 componente | ✅ |
| T96: CommitDiffViewer | 1 componente | ✅ |
| T97: TrashSection | 1 componente | ✅ |
| T98: integração layout | 2 modificações | ✅ |
| T99: settings ↔ auto-sync | 1 modificação | ✅ |
