# Local or Sync Mode Tasks

**Design**: `.specs/features/local-or-sync/design.md`
**Status**: Draft

> Tasks T56–T64. Depende de Vault Setup (T01–T11) concluído; deve ser implementado antes de Auth OAuth (T41) e GitHub Sync (T25) para que o onboarding esteja correto.

---

## Execution Plan

```
Phase 1 — Config + Backend (Sequential):
  T56 → T57

Phase 2 — Renderer (Parallel após T57):
       ┌→ T58 [P] (modeStore)
  T57 ─┤
       └→ T59 [P] (appService)

Phase 3 — Onboarding + Hook (Parallel após T58+T59):
       ┌→ T60 [P] (OnboardingModeStep)
  T59 ─┤
       └→ T61 [P] (useSyncMode hook)

Phase 4 — Settings + Transitions (Sequential após T60+T61):
  T60+T61 → T62 → T63 → T64
```

---

## Task Breakdown

### T56: Adicionar `mode` ao AppConfig e electron-store schema

**What**: Estender o schema do electron-store com `appConfig.mode: 'local' | 'sync' | null`
**Where**: `src/types/app.ts`, `electron/store.ts`
**Depends on**: —
**Requirement**: LSMODE-02

**Done quando**:
- [ ] `AppConfig` interface tem campo `mode: 'local' | 'sync' | null`
- [ ] `electron/store.ts` tem schema atualizado com `mode: null` como default
- [ ] TypeScript sem erros

**Verify**: `store.get('mode')` retorna `null` em instalação limpa

**Commit**: `feat(local-or-sync): add mode field to AppConfig and electron-store schema`

---

### T57: Criar `app.ipc.ts` — handlers `app:get-mode` e `app:set-mode`

**What**: Handlers simples para ler e escrever o modo no electron-store
**Where**: `electron/ipc/app.ipc.ts`
**Depends on**: T56
**Requirement**: LSMODE-02

**Done quando**:
- [ ] `app:get-mode` → `store.get('mode')` → retorna `'local' | 'sync' | null`
- [ ] `app:set-mode(mode)` → `store.set('mode', mode)`
- [ ] Handlers registrados no `main.ts`
- [ ] Expostos no preload como `window.electronAPI.app.getMode()` e `window.electronAPI.app.setMode(mode)`
- [ ] Tipagem correta em `electron.d.ts`

**Verify**: `app:set-mode('local')` → `app:get-mode` retorna `'local'`

**Commit**: `feat(local-or-sync): create app:get-mode and app:set-mode IPC handlers`

---

### T58: Criar `mode.store.ts` [P]

**What**: Zustand store para o modo no renderer
**Where**: `src/stores/mode.store.ts`
**Depends on**: T57
**Requirement**: LSMODE-02, LSMODE-03, LSMODE-04

**Done quando**:
- [ ] `mode: 'local' | 'sync' | null` e `isLoaded: boolean` no estado
- [ ] `setMode(m)` action
- [ ] TypeScript sem erros

**Verify**: `modeStore.setMode('sync')` → `modeStore.mode === 'sync'`

**Commit**: `feat(local-or-sync): create mode Zustand store`

---

### T59: Criar `appService.ts` (renderer) [P]

**What**: Wrapper IPC para `getMode` e `setMode` que atualiza o `modeStore`
**Where**: `src/services/app.ts`
**Depends on**: T57, T58
**Requirement**: LSMODE-02

**Done quando**:
- [ ] `getMode()` → IPC → `modeStore.setMode(result)` + `modeStore.isLoaded = true` → retorna mode
- [ ] `setMode(mode)` → IPC → `modeStore.setMode(mode)`

**Verify**: `appService.getMode()` com `'sync'` no store → `modeStore.mode === 'sync'`

**Commit**: `feat(local-or-sync): create app service for mode management`

---

### T60: Criar `OnboardingModeStep.tsx` [P]

**What**: Passo de seleção de modo no onboarding
**Where**: `src/components/onboarding/OnboardingModeStep.tsx`
**Depends on**: T58, T59
**Requirement**: LSMODE-01

**Done quando**:
- [ ] Dois cards clicáveis lado a lado: "Local" e "Sync com GitHub"
- [ ] Card "Local": ícone de computador, "Notas apenas neste dispositivo. Sem conta necessária."
- [ ] Card "Sync com GitHub": ícone de nuvem/GitHub, "Notas versionadas e acessíveis em outros dispositivos."
- [ ] Card selecionado tem borda destacada
- [ ] Botão "Continuar" habilitado após selecionar um card
- [ ] Ao confirmar: chama `appService.setMode(selectedMode)`
- [ ] Callback `onComplete(mode: 'local' | 'sync')` para o pai navegar para o próximo passo

**Verify**: Selecionar "Local" → clicar Continuar → `modeStore.mode === 'local'`

**Commit**: `feat(local-or-sync): create OnboardingModeStep component`

---

### T61: Criar `useSyncMode()` hook [P]

**What**: Hook para componentes verificarem o modo atual sem acessar o store diretamente
**Where**: `src/hooks/useSyncMode.ts`
**Depends on**: T58
**Requirement**: LSMODE-03, LSMODE-04

**Done quando**:
- [ ] Retorna `{ mode, isSync: mode === 'sync', isLocal: mode === 'local' }`
- [ ] Reativo — re-renderiza quando `modeStore.mode` muda

**Verify**: Componente usando `useSyncMode()` renderiza condicionalmente baseado no modo

**Commit**: `feat(local-or-sync): create useSyncMode hook`

---

### T62: Atualizar onboarding para incluir `OnboardingModeStep`

**What**: Inserir o passo de seleção de modo como primeiro passo do onboarding existente
**Where**: `src/screens/OnboardingScreen.tsx` (ou equivalente)
**Depends on**: T60
**Requirement**: LSMODE-01

**Done quando**:
- [ ] Fluxo: OnboardingModeStep → (se sync: LoginScreen) → VaultSetup
- [ ] Se modo `local` selecionado: pula login e vai direto para vault setup
- [ ] Se modo `sync`: exibe LoginScreen antes do vault setup
- [ ] Onboarding não exibe passo de modo se `modeStore.mode` já está definido

**Verify**: App sem modo → primeiro passo é seleção; escolher local → pula login; escolher sync → exibe login

**Commit**: `feat(local-or-sync): add mode selection as first onboarding step`

---

### T63: Aplicar conditional rendering via `useSyncMode` nos componentes existentes

**What**: Envolver UI de sync com `isSync` do hook para que suma completamente em modo local
**Where**: `src/components/layout/MainLayout.tsx`, `src/components/settings/SettingsModal.tsx`
**Depends on**: T61
**Requirement**: LSMODE-03, LSMODE-04

**Done quando**:
- [ ] `MainLayout`: `{isSync && <SyncStatusBadge />}` e `{isSync && <SyncPanel />}`
- [ ] `SettingsModal`: `{isSync && <SyncSection />}`
- [ ] Em modo local: zero menção a sync, GitHub, ou OAuth na UI

**Verify**: Iniciar app em modo local → nenhum elemento de sync visível na interface

**Commit**: `feat(local-or-sync): hide sync UI when in local mode via useSyncMode hook`

---

### T64: Criar `ModeSettingsSection.tsx` com fluxo de troca de modo

**What**: Seção nas settings para ver e trocar o modo; fluxo guiado de transição
**Where**: `src/components/settings/ModeSettingsSection.tsx`, `src/components/settings/ModeTransitionFlow.tsx`
**Depends on**: T59, T61, T62
**Requirement**: LSMODE-05, LSMODE-06, LSMODE-07

**Done quando**:
- [ ] `ModeSettingsSection`: exibe modo atual + botão "Trocar modo"
- [ ] Local → Sync: abre modal de confirmação → (se não autenticado) fluxo OAuth → `SyncConfigModal` → `appService.setMode('sync')`
- [ ] Sync → Local: modal de confirmação com texto "sync será desativado" → `syncService.stopAutoSync()` → `appService.setMode('local')`
- [ ] Após troca: UI atualiza sem restart (hook `useSyncMode` re-renderiza componentes)
- [ ] Token não é apagado ao trocar para local

**Verify**:
- Local → Sync: após completar fluxo → statusbar de sync aparece
- Sync → Local: após confirmar → statusbar desaparece imediatamente

**Commit**: `feat(local-or-sync): create mode settings section with transition flows`

---

## Parallel Execution Map

```
Phase 1:  T56 → T57

Phase 2:  T57 ─┬→ T58 [P] ─┐
                └→ T59 [P] ─┘

Phase 3:  T58+T59 ─┬→ T60 [P] ─┐
                    └→ T61 [P] ─┘

Phase 4:  T60+T61 → T62 → T63 → T64
```
