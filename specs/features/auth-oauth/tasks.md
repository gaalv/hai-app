# Auth OAuth Tasks

**Design**: `.specs/features/auth-oauth/design.md`
**Status**: Draft

> Tasks T41–T53. Depende de Vault Setup (T01–T11) concluído.

---

## Execution Plan

```
Phase 1 — Protocol + Backend (Sequential):
  T41 → T42 → T43

Phase 2 — Handlers IPC (Parallel após T43):
       ┌→ T44 [P] (callback + token)
  T43 ─┼→ T45 [P] (get-profile)
       └→ T46 [P] (logout + get-token)

Phase 3 — Registrar + Expor (Sequential após Phase 2):
  T44+T45+T46 → T47 → T48

Phase 4 — Renderer (Parallel após T48):
       ┌→ T49 [P] (authStore)
  T48 ─┤
       └→ T50 [P] (authService)

Phase 5 — UI (Parallel após T49+T50):
       ┌→ T51 [P] (LoginScreen)
  T50 ─┼→ T52 [P] (UserProfile)
       └→ T53 [P] (SettingsModal)

Phase 6 — Integração:
  T51+T52+T53 → T54
```

---

## Task Breakdown

### T41: Registrar protocol handler `hai://`

**What**: Registrar `hai://` como default protocol client no Electron e adicionar handler `app.on('open-url')` no `main.ts`
**Where**: `electron/main.ts`
**Depends on**: —
**Requirement**: AUTH-02

**Done quando**:
- [ ] `app.setAsDefaultProtocolClient('hai')` chamado antes de `app.whenReady()`
- [ ] Handler `app.on('open-url', (event, url) => ...)` registrado
- [ ] URL parseada para extrair `code` e `state` dos query params
- [ ] macOS: `open-url` event; Windows: segundo processo recebe url via `process.argv`
- [ ] Fallback Windows: `app.on('second-instance')` com `argv` parsing

**Verify**: Abrir `hai://oauth/callback?code=test` no terminal → `open-url` event disparado com URL correta

**Commit**: `feat(auth): register hai:// protocol handler for OAuth callback`

---

### T42: Criar helper `githubOAuth.ts`

**What**: Funções auxiliares para construir URL de autorização OAuth e trocar code por token
**Where**: `electron/githubOAuth.ts`
**Depends on**: —
**Requirement**: AUTH-02

**Done quando**:
- [ ] `buildAuthUrl(clientId: string, state: string): string` — constrói URL com scopes `repo,read:user`, redirect `hai://oauth/callback`
- [ ] `exchangeCode(clientId, clientSecret, code): Promise<string>` — POST para `https://github.com/login/oauth/access_token`
- [ ] `state` gerado com `crypto.randomUUID()` (validação CSRF básica)
- [ ] Client ID/secret lidos de variáveis de ambiente injetadas no build

**Verify**: `buildAuthUrl(clientId, state)` retorna URL com todos os params corretos

**Commit**: `feat(auth): create GitHub OAuth URL builder and token exchange helper`

---

### T43: Criar `auth.ipc.ts` — handler `auth:login`

**What**: Handler que abre browser com URL OAuth via `shell.openExternal`
**Where**: `electron/ipc/auth.ipc.ts`
**Depends on**: T41, T42
**Requirement**: AUTH-01, AUTH-02

**Done quando**:
- [ ] `auth:login` → chama `buildAuthUrl` + `shell.openExternal(url)`
- [ ] Armazena `state` pendente para validar no callback
- [ ] Callback `open-url` (do T41) chama `handleOAuthCallback(code, win)`
- [ ] `handleOAuthCallback`: valida state, chama `exchangeCode`, salva token no keychain via `keytar.setPassword('hai', 'github-token', token)`
- [ ] Após salvar token: emite `win.webContents.send('auth:complete')`
- [ ] Timeout de 5min: se callback não chegar, emite `auth:error` com mensagem

**Verify**: Clicar "Entrar com GitHub" → browser abre → após autorização, `auth:complete` é emitido para o renderer

**Commit**: `feat(auth): implement auth:login IPC handler with OAuth flow`

---

### T44: Criar `auth.ipc.ts` — handler `auth:get-profile` [P]

**What**: Handler que busca perfil do usuário no GitHub API usando token do keychain
**Where**: `electron/ipc/auth.ipc.ts` (adicionar)
**Depends on**: T43
**Requirement**: AUTH-03

**Done quando**:
- [ ] `auth:get-profile` → `keytar.getPassword('hai', 'github-token')` → `GET https://api.github.com/user`
- [ ] Retorna `{ login, name, avatar_url, email }`
- [ ] Cache no `electron-store`: `store.set('cachedProfile', profile)` com `profileCachedAt`
- [ ] Se sem token → retorna null

**Verify**: Chamar `auth:get-profile` com token válido no keychain → retorna objeto com login, name, avatar_url

**Commit**: `feat(auth): implement auth:get-profile IPC handler`

---

### T45: Criar `auth.ipc.ts` — handlers `auth:logout` e `auth:get-token` [P]

**What**: Handler de logout (limpa keychain + store) e get-token (retorna token para uso pelo sync)
**Where**: `electron/ipc/auth.ipc.ts` (adicionar)
**Depends on**: T43
**Requirement**: AUTH-05, AUTH-06

**Done quando**:
- [ ] `auth:logout` → `keytar.deletePassword('hai', 'github-token')` + `store.delete('cachedProfile')` + emite `auth:logged-out`
- [ ] `auth:get-token` → `keytar.getPassword('hai', 'github-token')` → retorna `string | null`
- [ ] `auth:check-auth` → retorna `boolean` (token existe no keychain)

**Verify**: `auth:logout` remove token do keychain; `auth:get-token` retorna null após logout

**Commit**: `feat(auth): implement auth:logout and auth:get-token IPC handlers`

---

### T46: Registrar handlers auth no `main.ts`

**What**: Importar `auth.ipc.ts` e registrar todos os handlers no `electron/main.ts`
**Where**: `electron/main.ts`
**Depends on**: T43, T44, T45
**Requirement**: AUTH-01, AUTH-02, AUTH-03, AUTH-05

**Done quando**:
- [ ] `auth:login`, `auth:get-profile`, `auth:logout`, `auth:get-token`, `auth:check-auth` registrados
- [ ] `app.on('open-url')` handler passa `mainWindow` corretamente para `handleOAuthCallback`
- [ ] `npm run dev` sem erros

**Verify**: `window.electronAPI.auth.checkAuth()` no console do DevTools retorna boolean

**Commit**: `feat(auth): register all auth IPC handlers in main process`

---

### T47: Expor API auth no `preload.ts`

**What**: Adicionar namespace `auth` ao contextBridge
**Where**: `electron/preload.ts`, `src/types/electron.d.ts`
**Depends on**: T46
**Requirement**: AUTH-01, AUTH-02, AUTH-03, AUTH-05

**Done quando**:
- [ ] `window.electronAPI.auth.login()` disponível
- [ ] `window.electronAPI.auth.logout()` disponível
- [ ] `window.electronAPI.auth.getProfile()` disponível
- [ ] `window.electronAPI.auth.getToken()` disponível
- [ ] `window.electronAPI.auth.checkAuth()` disponível
- [ ] `window.electronAPI.auth.onComplete(cb)` disponível (listener para `auth:complete`)
- [ ] `window.electronAPI.auth.onLoggedOut(cb)` disponível
- [ ] Tipagem sem erros TypeScript

**Verify**: TypeScript sem erros ao usar `window.electronAPI.auth.login()` no renderer

**Commit**: `feat(auth): expose auth API via contextBridge preload`

---

### T48: Criar `auth.store.ts` [P]

**What**: Zustand store para estado de autenticação no renderer
**Where**: `src/stores/auth.store.ts`
**Depends on**: T47
**Requirement**: AUTH-01, AUTH-03

**Done quando**:
- [ ] `isAuthenticated`, `profile`, `isLoading`, `error` no estado
- [ ] `setProfile`, `setLoading`, `setError`, `logout` implementados
- [ ] `logout()` reseta `isAuthenticated: false` e `profile: null`
- [ ] TypeScript sem erros

**Verify**: `authStore.setProfile({ login: 'test', ... })` → `authStore.isAuthenticated === true`

**Commit**: `feat(auth): create auth Zustand store`

---

### T49: Criar `authService.ts` [P]

**What**: Wrapper sobre `window.electronAPI.auth` que atualiza o `authStore`
**Where**: `src/services/auth.ts`
**Depends on**: T47, T48
**Requirement**: AUTH-01, AUTH-02, AUTH-03, AUTH-05

**Done quando**:
- [ ] `login()` seta `isLoading: true` → chama IPC → aguarda `onComplete` → chama `getProfile()` → atualiza store
- [ ] `logout()` chama IPC → `authStore.logout()`
- [ ] `getProfile()` chama IPC → `authStore.setProfile(profile)`
- [ ] `checkAuth(): Promise<boolean>` para checar no startup
- [ ] `onComplete` listener registrado uma vez no startup

**Verify**: `authService.checkAuth()` com token no keychain → `authStore.isAuthenticated === true`

**Commit**: `feat(auth): create auth service for renderer`

---

### T50: Criar `LoginScreen.tsx` [P]

**What**: Tela inicial para usuários não autenticados
**Where**: `src/screens/LoginScreen.tsx`
**Depends on**: T48, T49
**Requirement**: AUTH-01, AUTH-02

**Done quando**:
- [ ] Logo/nome do app centralizado
- [ ] Botão "Entrar com GitHub" com ícone do GitHub (SVG inline ou lucide)
- [ ] Loading state durante auth flow (spinner no botão, botão desabilitado)
- [ ] Mensagem de erro inline se auth falhar
- [ ] Texto explicativo minimalista abaixo do botão

**Verify**: Renderizar `<LoginScreen>` → botão visível → clicar → loading state → callback recebido → tela some

**Commit**: `feat(auth): create LoginScreen component`

---

### T51: Criar `UserProfile.tsx` [P]

**What**: Exibir avatar e nome do usuário na sidebar inferior
**Where**: `src/components/auth/UserProfile.tsx`
**Depends on**: T48, T49
**Requirement**: AUTH-03, AUTH-04

**Done quando**:
- [ ] Avatar circular (`<img>` com `avatar_url`) + nome (`login` ou `name`)
- [ ] Lê `authStore.profile`
- [ ] Click → abre `<SettingsModal>`
- [ ] Estado de loading (skeleton) enquanto profile carrega

**Verify**: Com profile no store → avatar e nome exibidos; click → settings abre

**Commit**: `feat(auth): create UserProfile component for sidebar`

---

### T52: Criar `SettingsModal.tsx` [P]

**What**: Modal de configurações com seções Perfil, Editor, Sync, Aparência
**Where**: `src/components/settings/SettingsModal.tsx`
**Depends on**: T48, T49
**Requirement**: AUTH-04, AUTH-05

**Done quando**:
- [ ] Abre/fecha via `Cmd+,` (shortcut registrado) e click no UserProfile
- [ ] Seção **Perfil**: avatar, nome, login, botão "Sair" → `authService.logout()`
- [ ] Seção **Editor**: toggle Vim mode, seletor de tamanho de fonte
- [ ] Seção **Sync**: intervalo de auto-sync (5/15/30min/manual), repo atual
- [ ] Seção **Aparência**: tema (auto/light/dark)
- [ ] Mudanças salvas imediatamente no electron-store

**Verify**: Abrir settings → cada seção visível → clicar "Sair" → volta para LoginScreen

**Commit**: `feat(auth): create SettingsModal with profile, editor, sync and appearance sections`

---

### T53: Integrar fluxo de auth na inicialização do app

**What**: Modificar `App.tsx` para verificar auth no startup e exibir `<LoginScreen>` ou app principal baseado no estado
**Where**: `src/App.tsx`
**Depends on**: T50, T51, T52
**Requirement**: AUTH-01, AUTH-02

**Done quando**:
- [ ] No mount do `App.tsx`: `authService.checkAuth()` é chamado
- [ ] Se não autenticado: exibe `<LoginScreen>`
- [ ] Se autenticado: carrega perfil e exibe app principal
- [ ] `authStore.onLoggedOut` listener redireciona para `<LoginScreen>`
- [ ] Transição entre login/app sem reload completo

**Verify**: App sem token → LoginScreen; após auth → app principal; logout → LoginScreen novamente

**Commit**: `feat(auth): integrate auth check into app startup flow`

---

### T54: Atualizar `sync.ipc.ts` para usar OAuth token

**What**: Substituir `keytar.getPassword('muta', 'github-pat')` por `keytar.getPassword('hai', 'github-token')` em todos os handlers de sync
**Where**: `electron/ipc/sync.ipc.ts`
**Depends on**: T43, T25 (sync existente)
**Requirement**: AUTH-02

**Done quando**:
- [ ] Todas as referências a `'muta'` e `'github-pat'` substituídas por `'hai'` e `'github-token'`
- [ ] `sync:configure` não pede mais PAT — busca token via `auth:get-token`
- [ ] `SyncConfigModal.tsx` atualizado: campo PAT removido, apenas campo de repositório
- [ ] `github-sync/spec.md` atualizado: referência a PAT marcada como substituída por OAuth

**Verify**: Push/pull funcionam usando o OAuth token — sem campo PAT na UI

**Commit**: `feat(sync): migrate from PAT to OAuth token for GitHub authentication`

---

## Parallel Execution Map

```
Phase 1:  T41 → T42 → T43

Phase 2:  T43 ─┬→ T44 [P] ─┐
                ├→ T45 [P] ─┤→ T46 → T47
                └────────────┘

Phase 3:  T47 ─┬→ T48 [P] ─┐
                └→ T49 [P] ─┘

Phase 4:  T48+T49 ─┬→ T50 [P] ─┐
                    ├→ T51 [P] ─┤→ T53 → T54
                    └→ T52 [P] ─┘
```
