# GitHub Sync Tasks

**Design**: `.specs/features/github-sync/design.md`
**Status**: Draft

> Tasks T25–T40. Depende de Vault Setup (T01–T11) e Note Editor (T12–T24) completos.

---

## Execution Plan

```
Phase 1 — Instalação + Backend Foundation (Sequential):
  T25 → T26 → T27

Phase 2 — Handlers IPC (Parallel após T27):
       ┌→ T28 [P] (configure)
  T27 ─┼→ T29 [P] (push)
       ├→ T30 [P] (pull + conflicts)
       └→ T31 [P] (status)

Phase 3 — Registrar + Expor (Sequential após Phase 2):
  T28+T29+T30+T31 → T32 → T33

Phase 4 — Stores + Services (Parallel após T33):
       ┌→ T34 [P] (sync.store)
  T33 ─┤
       └→ T35 [P] (syncService renderer)

Phase 5 — UI Components (Parallel após T34+T35):
       ┌→ T36 [P] (SyncStatusBadge)
  T35 ─┼→ T37 [P] (SyncConfigModal)
       └→ T38 [P] (ConflictModal)

Phase 6 — Integração final (Sequential):
  T36+T37+T38 → T39 → T40
```

---

## Task Breakdown

### T25: Instalar dependências de sync

**What**: Instalar `isomorphic-git`, `@isomorphic-git/http`, `@octokit/rest`, `keytar` e tipos necessários
**Where**: `package.json`
**Depends on**: T01
**Requirement**: SYNC-01, SYNC-02, SYNC-03

**Done when**:
- [ ] Todas as 4 libs instaladas sem conflito de versão
- [ ] `keytar` compila nativamente para Electron (verificar com `npm run dev`)
- [ ] `@types/keytar` ou tipagem inline disponível

**Verify**: `npm ls isomorphic-git keytar @octokit/rest` mostra versões instaladas; `npm run dev` abre sem erros

**Commit**: `chore(sync): install isomorphic-git, octokit and keytar`

---

### T26: Criar SyncConfig type + electron-store para sync

**What**: Definir `SyncConfig` interface e adicionar schema de sync ao `electron/store.ts`
**Where**: `src/types/sync.ts`, `electron/store.ts`
**Depends on**: T25, T04
**Requirement**: SYNC-01

**Done when**:
- [ ] `SyncConfig { repoUrl, configuredAt }` exportado de `src/types/sync.ts`
- [ ] `PushResult`, `PullResult`, `ConflictFile`, `SyncStatus` tipos definidos
- [ ] `electron/store.ts` tem schema `syncConfig: SyncConfig | null`
- [ ] `ElectronAPI` interface em `electron.d.ts` tem namespace `sync` tipado

**Verify**: TypeScript sem erros ao importar tipos de sync

**Commit**: `feat(sync): define sync types and extend electron-store schema`

---

### T27: Criar helper keychain.ts

**What**: Implementar `electron/keychain.ts` com funções `setPassword`, `getPassword`, `deletePassword` encapsulando `keytar`
**Where**: `electron/keychain.ts`
**Depends on**: T25
**Requirement**: SYNC-01 (PAT no keychain)

**Done when**:
- [ ] `setPassword(key, value)` chama `keytar.setPassword('muta-notes', key, value)`
- [ ] `getPassword(key)` retorna `string | null`
- [ ] `deletePassword(key)` remove entrada
- [ ] Constante `KEYCHAIN_SERVICE = 'muta-notes'` definida
- [ ] Erros de keytar capturados e relançados com mensagem descritiva

**Verify**: Chamar `setPassword('github-pat', 'test123')` → `getPassword('github-pat')` retorna `'test123'`

**Commit**: `feat(sync): create keychain helper wrapping keytar`

---

### T28: Criar sync.ipc.ts — handler configure [P]

**What**: Implementar handler `sync:configure` — valida PAT via Octokit, salva PAT no keychain, salva `repoUrl` no store, faz `git.init` e `git.addRemote` se necessário
**Where**: `electron/ipc/sync.ipc.ts`
**Depends on**: T26, T27
**Requirement**: SYNC-01

**Done when**:
- [ ] Valida PAT: `new Octokit({ auth: pat }).rest.users.getAuthenticated()` — lança se inválido
- [ ] Verifica acesso ao repo: `octokit.rest.repos.get({ owner, repo })` — lança se não encontrado
- [ ] Salva PAT: `keychain.setPassword('github-pat', pat)`
- [ ] Salva config: `store.set('syncConfig', { repoUrl, configuredAt })`
- [ ] `git.init({ fs, dir: vaultPath })` se vault não é repositório git
- [ ] `git.addRemote` para `origin` se não existe
- [ ] Se vault tem arquivos: cria primeiro commit automaticamente

**Verify**: Configurar com PAT válido + repo existente → `.git/` criado no vault → store tem `syncConfig`

**Commit**: `feat(sync): implement sync:configure IPC handler`

---

### T29: Criar sync.ipc.ts — handler push [P]

**What**: Implementar handler `sync:push` — `git.statusMatrix`, `git.add`, `git.commit`, `git.push`
**Where**: `electron/ipc/sync.ipc.ts` (adicionar ao arquivo)
**Depends on**: T27, T28
**Requirement**: SYNC-02

**Done when**:
- [ ] Recupera PAT via `keychain.getPassword('github-pat')`
- [ ] `git.statusMatrix` identifica arquivos modificados; retorna cedo se nenhum
- [ ] `git.add({ fs, dir, filepath: '.' })` faz staging de tudo
- [ ] `git.commit` com mensagem `sync: ISO-timestamp` e autor `Muta Notes`
- [ ] `git.push({ fs, http, dir, onAuth: () => ({ username: pat }) })`
- [ ] Retorna `PushResult { filesCommitted, commitHash, timestamp }`
- [ ] Erros de auth (401) relançados com mensagem "Token inválido ou expirado"
- [ ] Erros de rede relançados com mensagem "Sem conexão"

**Verify**: Criar nota → chamar `sync:push` → nota aparece no GitHub com commit

**Commit**: `feat(sync): implement sync:push IPC handler`

---

### T30: Criar sync.ipc.ts — handler pull + detecção de conflito [P]

**What**: Implementar handler `sync:pull` com `git.fetch`, `git.merge` e detecção de conflitos; handler `sync:resolve-conflict`
**Where**: `electron/ipc/sync.ipc.ts` (adicionar ao arquivo)
**Depends on**: T27, T28
**Requirement**: SYNC-03

**Done when**:
- [ ] `git.fetch({ fs, http, dir, onAuth })` busca refs remotas
- [ ] `git.merge({ fs, dir, ours: 'HEAD', theirs: 'FETCH_HEAD' })` faz merge
- [ ] Detecta arquivos em conflito via `git.statusMatrix` (estado `[path, 0, 2, 2]` ou similar)
- [ ] Para cada conflito: lê conteúdo local e conteúdo remoto, retorna `ConflictFile[]`
- [ ] Retorna `PullResult { filesUpdated, hasConflicts, conflicts }`
- [ ] `sync:resolve-conflict(path, 'local' | 'remote')`: escreve versão escolhida, faz `git.add`, `git.commit`

**Verify**:
- Sem conflito: notas atualizadas no vault
- Com conflito: `PullResult.hasConflicts = true` com conteúdos local e remoto

**Commit**: `feat(sync): implement sync:pull with conflict detection`

---

### T31: Criar sync.ipc.ts — handler getStatus [P]

**What**: Implementar handler `sync:get-status` — conta arquivos modificados não commitados via `git.statusMatrix`
**Where**: `electron/ipc/sync.ipc.ts` (adicionar ao arquivo)
**Depends on**: T26, T27
**Requirement**: SYNC-04

**Done when**:
- [ ] Se `syncConfig === null` → retorna `{ status: 'not-configured', pendingChanges: 0 }`
- [ ] `git.statusMatrix` conta arquivos com mudanças locais
- [ ] Retorna `{ status: 'pending' | 'synced', pendingChanges: number, lastSync, repoUrl }`
- [ ] Erros de git (vault não inicializado) tratados graciosamente

**Verify**: Editar nota sem fazer push → `sync:get-status` retorna `{ status: 'pending', pendingChanges: 1 }`

**Commit**: `feat(sync): implement sync:get-status IPC handler`

---

### T32: Registrar handlers sync no main.ts

**What**: Importar `sync.ipc.ts` e registrar todos os 5 handlers no `electron/main.ts`
**Where**: `electron/main.ts`, `electron/ipc/sync.ipc.ts`
**Depends on**: T28, T29, T30, T31
**Requirement**: SYNC-01, SYNC-02, SYNC-03, SYNC-04

**Done when**:
- [ ] `sync:configure`, `sync:push`, `sync:pull`, `sync:resolve-conflict`, `sync:get-status` registrados
- [ ] Erros não crasham o main process (try/catch em todos handlers)
- [ ] `npm run dev` sem erros

**Verify**: `npm run dev` → abrir DevTools → invocar `window.electronAPI.sync.getStatus()` no console → retorna objeto

**Commit**: `feat(sync): register all sync IPC handlers in main process`

---

### T33: Expor API sync no preload.ts

**What**: Preencher namespace `sync` no contextBridge com todos os 5 métodos
**Where**: `electron/preload.ts`, `src/types/electron.d.ts`
**Depends on**: T32
**Requirement**: SYNC-01, SYNC-02, SYNC-03, SYNC-04

**Done when**:
- [ ] `window.electronAPI.sync.configure(pat, repoUrl)` disponível
- [ ] `window.electronAPI.sync.push()` disponível
- [ ] `window.electronAPI.sync.pull()` disponível
- [ ] `window.electronAPI.sync.resolveConflict(path, choice)` disponível
- [ ] `window.electronAPI.sync.getStatus()` disponível
- [ ] Tipagem correta sem erros TypeScript

**Verify**: TypeScript sem erros ao usar `window.electronAPI.sync.push()` no renderer

**Commit**: `feat(sync): expose sync API via contextBridge`

---

### T34: Criar sync.store.ts [P]

**What**: Implementar Zustand store `src/stores/sync.store.ts` com todos os estados e actions definidos no design
**Where**: `src/stores/sync.store.ts`
**Depends on**: T33
**Requirement**: SYNC-04

**Done when**:
- [ ] `status`, `pendingChanges`, `lastSync`, `lastError`, `repoUrl`, `isConfigured`, `conflicts` no estado
- [ ] `setStatus`, `setPendingChanges`, `setConflicts`, `setLastError` implementados
- [ ] TypeScript sem erros

**Verify**: Importar store e chamar `syncStore.setStatus('pending')` → estado atualizado

**Commit**: `feat(sync): create sync Zustand store`

---

### T35: Criar syncService.ts (renderer) [P]

**What**: Implementar `src/services/sync.ts` — wrapper sobre `window.electronAPI.sync` que também atualiza o `syncStore`
**Where**: `src/services/sync.ts`
**Depends on**: T33, T34
**Requirement**: SYNC-01, SYNC-02, SYNC-03, SYNC-04

**Done when**:
- [ ] `configure(pat, repoUrl)` chama IPC + atualiza store com `isConfigured: true`
- [ ] `push()` seta `status: 'syncing'` → chama IPC → seta `status: 'synced'` ou `'error'`
- [ ] `pull()` seta `status: 'syncing'` → chama IPC → se conflitos: `store.setConflicts(...)` → seta status
- [ ] `getStatus()` chama IPC e atualiza store
- [ ] Erros sempre atualizam `store.setLastError(message)`

**Verify**: `syncService.getStatus()` → `syncStore.status` atualizado corretamente

**Commit**: `feat(sync): create sync service for renderer`

---

### T36: Criar SyncStatusBadge.tsx [P]

**What**: Componente badge persistente que exibe o estado atual do sync
**Where**: `src/components/sync/SyncStatusBadge.tsx`
**Depends on**: T34, T35
**Requirement**: SYNC-04

**Done when**:
- [ ] 5 estados visuais distintos: `synced` (verde), `pending` (amarelo + número), `error` (vermelho), `not-configured` (cinza), `syncing` (spinner)
- [ ] Lê `syncStore.status` e `syncStore.pendingChanges`
- [ ] Clique abre `<SyncPanel>` (dropdown ou modal)
- [ ] `syncService.getStatus()` chamado no mount para estado inicial

**Verify**: Renderizar badge em cada estado → visual correto para cada um

**Commit**: `feat(sync): create SyncStatusBadge component`

---

### T37: Criar SyncConfigModal.tsx [P]

**What**: Modal para configurar PAT e repositório GitHub
**Where**: `src/components/sync/SyncConfigModal.tsx`
**Depends on**: T34, T35
**Requirement**: SYNC-01, SYNC-05

**Done when**:
- [ ] Campo PAT (input type=password) com botão "Validar token"
- [ ] Campo URL do repositório
- [ ] Opção "Criar repositório" (nome + privado/público) via `GitHubService.createRepo`
- [ ] Botão "Conectar" → `syncService.configure(pat, repoUrl)` com loading state
- [ ] Erros exibidos inline (token inválido, repo não encontrado)
- [ ] Fecha modal ao conectar com sucesso

**Verify**: Abrir modal → inserir PAT inválido → ver "Token inválido" inline → inserir PAT válido → conectar → modal fecha

**Commit**: `feat(sync): create SyncConfigModal component`

---

### T38: Criar ConflictModal.tsx [P]

**What**: Modal exibido quando pull retorna conflitos — lista arquivos e permite escolher local vs remoto por arquivo
**Where**: `src/components/sync/ConflictModal.tsx`
**Depends on**: T34, T35
**Requirement**: SYNC-03

**Done when**:
- [ ] Exibe lista de `syncStore.conflicts`
- [ ] Para cada arquivo: nome do arquivo + botões "Manter local" | "Usar remoto"
- [ ] Ao escolher: chama `syncService.resolveConflict(path, choice)` + remove arquivo da lista
- [ ] Botão "Cancelar" descarta o pull sem modificar arquivos
- [ ] Quando todos resolvidos: fecha modal + `syncStore.setStatus('synced')`

**Verify**: Simular `syncStore.setConflicts([{path, localContent, remoteContent}])` → modal abre → escolher → arquivo resolvido

**Commit**: `feat(sync): create ConflictModal component`

---

### T39: Criar SyncPanel.tsx

**What**: Painel de ações de sync: botões Push/Pull, histórico de último sync, link para configurações
**Where**: `src/components/sync/SyncPanel.tsx`
**Depends on**: T36, T37, T38
**Requirement**: SYNC-02, SYNC-03, SYNC-04

**Done when**:
- [ ] Botão "Push" → `syncService.push()` com loading + feedback de sucesso/erro
- [ ] Botão "Pull" → `syncService.pull()` — se conflitos, abre `<ConflictModal>`
- [ ] Exibe `syncStore.lastSync` formatado ("Sincronizado há 5min")
- [ ] Exibe `syncStore.lastError` se presente
- [ ] Link "Configurar sync" → abre `<SyncConfigModal>`
- [ ] Botões desabilitados durante `status === 'syncing'`

**Verify**: Clicar Push → loading → "Sincronizado há X segundos" aparece → nota no GitHub atualizada

**Commit**: `feat(sync): create SyncPanel with push/pull actions`

---

### T40: Integrar SyncStatusBadge no MainLayout

**What**: Adicionar `<SyncStatusBadge>` no header/titlebar do `MainLayout` e garantir inicialização do sync status
**Where**: `src/components/layout/MainLayout.tsx`
**Depends on**: T23, T39
**Requirement**: SYNC-04

**Done when**:
- [ ] Badge visível no canto superior direito (ou titlebar)
- [ ] `syncService.getStatus()` chamado no mount do MainLayout junto com `fileTreeStore.init`
- [ ] Clicar no badge abre/fecha `<SyncPanel>` (dropdown ou sidebar section)
- [ ] `<ConflictModal>` renderizado condicionalmente quando `syncStore.conflicts.length > 0`

**Verify**: App completo funcionando — badge visível, push/pull via badge, conflitos tratados via modal

**Commit**: `feat(sync): integrate SyncStatusBadge into MainLayout`

---

## Parallel Execution Map

```
Phase 1:  T25 → T26 → T27

Phase 2:  T27 ─┬→ T28 [P] ─┐
                ├→ T29 [P] ─┤→ T32 → T33
                ├→ T30 [P] ─┤
                └→ T31 [P] ─┘

Phase 3:  T33 ─┬→ T34 [P] ─┐
                └→ T35 [P] ─┘

Phase 4:  T34+T35 ─┬→ T36 [P] ─┐
                    ├→ T37 [P] ─┤→ T39 → T40
                    └→ T38 [P] ─┘
```

---

## Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T25: Instalar deps | package.json | ✅ |
| T26: SyncConfig types + store schema | 2 arquivos pequenos coesos | ✅ |
| T27: keychain.ts | 1 helper | ✅ |
| T28: handler configure | 1 handler | ✅ |
| T29: handler push | 1 handler | ✅ |
| T30: handler pull + resolve | 2 handlers coesos | ✅ |
| T31: handler getStatus | 1 handler | ✅ |
| T32: registrar handlers | 1 arquivo, imports | ✅ |
| T33: expor no preload | 1 namespace | ✅ |
| T34: sync.store | 1 store | ✅ |
| T35: syncService renderer | 1 service | ✅ |
| T36: SyncStatusBadge | 1 componente | ✅ |
| T37: SyncConfigModal | 1 componente | ✅ |
| T38: ConflictModal | 1 componente | ✅ |
| T39: SyncPanel | 1 componente | ✅ |
| T40: Integrar badge | 1 modificação | ✅ |
