# Vault Setup Tasks

**Design**: `.specs/features/vault-setup/design.md`
**Status**: Draft

> Inclui Phase 0 (Project Setup) — foundation para todas as features.

---

## Execution Plan

```
Phase 0 — Project Setup (Sequential, blocker para tudo):
  T01 → T02 → T03 → T04

Phase 1 — Vault Backend (Sequential):
  T04 → T05 → T06 → T07

Phase 2 — Vault Frontend (Parallel após T07):
       ┌→ T08 [P]
  T07 ─┤
       └→ T09 [P]

Phase 3 — Integração (Sequential):
  T08 + T09 → T10 → T11
```

---

## Task Breakdown

### T01: Inicializar projeto Electron + React + Vite

**What**: Criar scaffold do projeto com `electron-vite` (template react-ts), configurar tsconfig e estrutura de pastas `electron/` + `src/`
**Where**: raiz do projeto
**Depends on**: Nenhum
**Requirement**: Fundação de todas as features

**Done when**:
- [ ] `npm run dev` abre janela Electron com React rodando
- [ ] `electron/main.ts`, `electron/preload.ts`, `src/main.tsx` existem
- [ ] TypeScript sem erros (`tsc --noEmit`)
- [ ] Hot reload funciona no renderer

**Verify**: `npm run dev` → janela Electron abre com "Hello World" ou similar

**Commit**: `chore: initialize electron-vite react-ts project`

---

### T02: Configurar electron-builder para distribuição

**What**: Adicionar e configurar `electron-builder` no `package.json` com targets para macOS (dmg), Windows (nsis) e Linux (AppImage)
**Where**: `package.json`, `electron-builder.config.ts`
**Depends on**: T01
**Requirement**: Distribuição futura

**Done when**:
- [ ] `npm run build` gera binário funcional para o SO atual
- [ ] `appId`, `productName` e `icon` configurados
- [ ] Output em `dist/`

**Verify**: `npm run build` completa sem erros, binário executável gerado

**Commit**: `chore: configure electron-builder for distribution`

---

### T03: Criar preload.ts com skeleton do contextBridge

**What**: Implementar `electron/preload.ts` com `contextBridge.exposeInMainWorld('electronAPI', {...})` — namespaces vazios para `vault`, `notes`, `sync` tipados via interface `ElectronAPI`
**Where**: `electron/preload.ts`, `src/types/electron.d.ts`
**Depends on**: T01
**Requirement**: Arquitetura IPC de todas as features

**Done when**:
- [ ] `window.electronAPI` acessível no renderer sem erros de TypeScript
- [ ] Interface `ElectronAPI` definida em `src/types/electron.d.ts`
- [ ] `contextIsolation: true`, `nodeIntegration: false` no `BrowserWindow`

**Verify**: `console.log(window.electronAPI)` no renderer retorna objeto (não undefined)

**Commit**: `chore: setup contextBridge preload with typed ElectronAPI`

---

### T04: Configurar electron-store com VaultConfig

**What**: Instalar `electron-store`, criar `electron/store.ts` com instância tipada e schema para `VaultConfig`
**Where**: `electron/store.ts`
**Depends on**: T01
**Requirement**: VAULT-02 (persistência)

**Done when**:
- [ ] `electron-store` instalado
- [ ] Schema definido com `vaultPath: string | null` e `vaultConfiguredAt: string | null`
- [ ] Store exportado como singleton acessível pelos handlers IPC

**Verify**: `store.get('vaultPath')` retorna `null` na primeira execução

**Commit**: `chore: setup electron-store with VaultConfig schema`

---

### T05: Criar vault.ipc.ts com handlers de filesystem

**What**: Implementar `electron/ipc/vault.ipc.ts` com 4 handlers: `vault:open-picker`, `vault:configure`, `vault:load`, `vault:create`
**Where**: `electron/ipc/vault.ipc.ts`
**Depends on**: T03, T04
**Requirement**: VAULT-01, VAULT-02, VAULT-03

**Done when**:
- [ ] `vault:open-picker` abre `dialog.showOpenDialog` e retorna path ou null
- [ ] `vault:configure` valida permissões com `fs.access(path, fs.constants.R_OK | fs.constants.W_OK)` e salva no store
- [ ] `vault:load` lê store e verifica se path ainda existe; retorna null se não existe
- [ ] `vault:create` chama `fs.mkdir` e depois `vault:configure`
- [ ] Bloqueio de paths raiz (`/`, `C:\`, drive raiz)

**Verify**: Chamar handlers via `ipcMain.emit` em teste manual, verificar respostas esperadas

**Commit**: `feat(vault): implement vault IPC handlers`

---

### T06: Registrar handlers IPC no main.ts

**What**: Importar e registrar `vault.ipc.ts` no `electron/main.ts` via `ipcMain.handle`
**Where**: `electron/main.ts`
**Depends on**: T05
**Requirement**: VAULT-01, VAULT-02

**Done when**:
- [ ] Todos os 4 handlers de vault registrados com `ipcMain.handle`
- [ ] Erros capturados e propagados corretamente (não crasham o main process)

**Verify**: `npm run dev` sem erros no console do main process

**Commit**: `feat(vault): register vault IPC handlers in main process`

---

### T07: Expor API vault no preload.ts

**What**: Preencher namespace `vault` no `contextBridge` com `invoke` calls para os 4 handlers
**Where**: `electron/preload.ts`, `src/types/electron.d.ts`
**Depends on**: T03, T06
**Requirement**: VAULT-01, VAULT-02

**Done when**:
- [ ] `window.electronAPI.vault.openPicker()` disponível no renderer
- [ ] `window.electronAPI.vault.configure(path)` disponível
- [ ] `window.electronAPI.vault.load()` disponível
- [ ] `window.electronAPI.vault.create(name, parentPath)` disponível
- [ ] Tipos corretos no `ElectronAPI` interface

**Verify**: TypeScript não reclama de `window.electronAPI.vault.load()` no renderer

**Commit**: `feat(vault): expose vault API via contextBridge`

---

### T08: Criar vault.store.ts [P]

**What**: Implementar Zustand store `src/stores/vault.store.ts` com estado `path`, `name`, `isLoading`, `error` e actions `setVault`, `clearVault`
**Where**: `src/stores/vault.store.ts`
**Depends on**: T07
**Requirement**: VAULT-01, VAULT-02

**Done when**:
- [ ] Store criado com Zustand `create`
- [ ] `VaultConfig` type importado de `src/types/`
- [ ] `setVault` e `clearVault` implementados
- [ ] TypeScript sem erros

**Verify**: Importar store em qualquer componente e acessar `vaultStore.path` sem erros

**Commit**: `feat(vault): create vault Zustand store`

---

### T09: Criar vaultService.ts (renderer) [P]

**What**: Implementar `src/services/vault.ts` — wrapper tipado sobre `window.electronAPI.vault` com métodos `openPicker`, `create`, `load`
**Where**: `src/services/vault.ts`
**Depends on**: T07, T08
**Requirement**: VAULT-01, VAULT-02, VAULT-03

**Done when**:
- [ ] `openPicker()` chama IPC e faz `vaultStore.setVault()` ao confirmar
- [ ] `load()` chama IPC e popula store; retorna null se não configurado
- [ ] `create()` chama IPC e popula store
- [ ] Erros propagam como exceções tipadas

**Verify**: Chamar `vaultService.openPicker()` no console do DevTools — dialog nativo abre

**Commit**: `feat(vault): create vault service for renderer`

---

### T10: Criar OnboardingScreen.tsx

**What**: Componente de tela de primeiro uso com botões "Selecionar pasta" e "Criar novo vault"
**Where**: `src/components/vault/OnboardingScreen.tsx`
**Depends on**: T08, T09
**Requirement**: VAULT-01, VAULT-03

**Done when**:
- [ ] Renderiza título, descrição e 2 botões
- [ ] "Selecionar pasta" chama `vaultService.openPicker()` e exibe loading
- [ ] "Criar novo vault" abre input de nome + chama `vaultService.create()`
- [ ] Erros de permissão exibem mensagem inline
- [ ] Estilo consistente (dark theme, Tailwind ou CSS modules)

**Verify**: Renderizar componente → clicar "Selecionar pasta" → dialog abre → selecionar pasta → tela fecha (se `AppShell` integrado)

**Commit**: `feat(vault): create OnboardingScreen component`

---

### T11: Criar AppShell.tsx

**What**: Componente raiz que decide entre `<OnboardingScreen>` e `<MainLayout>` com base no vault configurado
**Where**: `src/components/layout/AppShell.tsx`
**Depends on**: T08, T09, T10
**Requirement**: VAULT-01, VAULT-02

**Done when**:
- [ ] No mount: chama `vaultService.load()`, popula store
- [ ] Se `vaultStore.path === null` → renderiza `<OnboardingScreen>`
- [ ] Se vault válido → renderiza `<MainLayout>` (pode ser placeholder por ora)
- [ ] Se vault salvo não existe mais → exibe erro com botão "Reconfigurar"
- [ ] Loading state enquanto verifica vault

**Verify**:
- Sem vault: app abre em OnboardingScreen ✓
- Após configurar vault e reabrir: app vai direto para MainLayout ✓
- Vault deletado manualmente: app mostra erro e volta para onboarding ✓

**Commit**: `feat(vault): create AppShell with vault routing logic`

---

## Parallel Execution Map

```
T01 → T02
T01 → T03 → T04 → T05 → T06 → T07 ─┬→ T08 [P] ─┐
                                      └→ T09 [P] ─┘→ T10 → T11
```

---

## Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T01: Init projeto | 1 scaffold | ✅ |
| T02: electron-builder | 1 config file | ✅ |
| T03: preload skeleton | 1 arquivo | ✅ |
| T04: electron-store | 1 arquivo + schema | ✅ |
| T05: vault.ipc.ts | 1 arquivo, 4 handlers coesos | ✅ |
| T06: registrar handlers | 1 arquivo, imports | ✅ |
| T07: expor no preload | 1 namespace | ✅ |
| T08: vault.store.ts | 1 store | ✅ |
| T09: vaultService.ts | 1 service | ✅ |
| T10: OnboardingScreen | 1 componente | ✅ |
| T11: AppShell | 1 componente | ✅ |
