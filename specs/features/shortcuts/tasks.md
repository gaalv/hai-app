# Shortcuts Tasks

**Design**: `.specs/features/shortcuts/design.md`
**Status**: Draft

> Tasks T160–T170. Depende de Note Editor (T12–T24), Data Model (T66–T82) e Search Navigation (T140–T155) para integração dos atalhos.

---

## Execution Plan

```
Phase 1 — Quick Capture Backend (Sequential):
  T160 → T161 → T162

Phase 2 — Quick Capture Frontend + Local Shortcuts (Parallel após T162):
       ┌→ T163 [P] (QuickCaptureScreen)
  T162 ┼→ T164 [P] (useGlobalShortcuts hook)
       └→ T165 [P] (menu:* IPC listeners no renderer)

Phase 3 — Menu nativo + Integração (Sequential após Phase 2):
  T163+T164+T165 → T166 → T167 → T168
```

---

## Task Breakdown

### T160: Criar `quickCapture.ts` — window factory

**What**: Criar `electron/windows/quickCapture.ts` com a função de criação e toggle da janela flutuante
**Where**: `electron/windows/quickCapture.ts`
**Depends on**: —
**Requirement**: SHORT-01

**Done quando**:
- [ ] `createQuickCaptureWindow()` cria `BrowserWindow` com: `width: 520`, `height: 180`, `frame: false`, `transparent: true`, `alwaysOnTop: true`, `skipTaskbar: true`, `show: false`
- [ ] Posicionada no centro horizontal e ~35% do topo vertical da tela primária
- [ ] Carrega `/#/quick-capture` (dev: `http://localhost:5173/#/quick-capture`; prod: `index.html` com hash)
- [ ] `win.on('blur', () => win.hide())` — fecha ao perder foco
- [ ] `toggleQuickCapture(win)` — alterna `show/hide`, envia `quick-capture:focus` ao mostrar
- [ ] Exporta `createQuickCaptureWindow` e `toggleQuickCapture`

**Verify**: Importar módulo e chamar `createQuickCaptureWindow()` → janela criada sem erros; `toggleQuickCapture` faz `show/hide`

**Commit**: `feat(shortcuts): create QuickCapture BrowserWindow factory`

---

### T161: Registrar `globalShortcut` e handler `quick-capture:save`

**What**: Registrar `Cmd+Shift+H` como atalho global; implementar handler IPC `quick-capture:save` que cria nota na inbox
**Where**: `electron/main.ts`, `electron/ipc/quickCapture.ipc.ts`
**Depends on**: T160, T72 (inbox handler existente)
**Requirement**: SHORT-01

**Done quando**:
- [ ] `globalShortcut.register('CommandOrControl+Shift+H', () => toggleQuickCapture(qcWin))` no `app.whenReady()`
- [ ] `globalShortcut.unregisterAll()` no `app.on('will-quit')`
- [ ] `quick-capture:save(content)`:
  - Deriva título: primeira linha até 50 chars, ou `Captura ${ISO timestamp}` se vazia
  - Chama `notes:create` com `targetDir = inbox/` do hai.json
  - Escreve frontmatter mínimo (`title`, `created`, `updated`)
  - Retorna `{ path: string }`
  - Emite `filetree:changed` para a mainWindow atualizar a sidebar
  - Chama `win.hide()` na quickCaptureWindow após salvar

**Verify**: `Cmd+Shift+H` fora do app → janela abre; digitar e Enter → nota criada em `vault/inbox/`; janela fecha

**Commit**: `feat(shortcuts): register global shortcut and implement quick-capture:save IPC`

---

### T162: Expor API quick-capture no preload

**What**: Adicionar namespace `quickCapture` ao contextBridge com `save` e listener `onFocus`; adicionar namespace `menu` com `onAction`
**Where**: `electron/preload.ts`, `src/types/electron.d.ts`
**Depends on**: T161
**Requirement**: SHORT-01, SHORT-03

**Done quando**:
- [ ] `window.electronAPI.quickCapture.save(content): Promise<{ path: string }>`
- [ ] `window.electronAPI.quickCapture.onFocus(cb: () => void)` — listener para focar o textarea
- [ ] `window.electronAPI.menu.onAction(action, cb)` — escuta `menu:${action}` (ex: `'new-note'`, `'search'`)
- [ ] TypeScript sem erros

**Verify**: `window.electronAPI.quickCapture.save('teste')` no DevTools → nota criada na inbox

**Commit**: `feat(shortcuts): expose quickCapture and menu APIs via preload`

---

### T163: Criar `QuickCaptureScreen.tsx` [P]

**What**: Tela da janela flutuante: textarea com foco automático, save com Enter, cancel com Esc
**Where**: `src/screens/QuickCaptureScreen.tsx`
**Depends on**: T162
**Requirement**: SHORT-01

**Done quando**:
- [ ] `textarea` ocupa quase toda a área da janela (padding interno)
- [ ] Placeholder: "Capturar ideia..."
- [ ] Foco automático ao montar + ao receber `quickCapture.onFocus` (janela reaberta)
- [ ] `Enter` (sem Shift): `quickCapture.save(content)` → limpa textarea
- [ ] `Shift+Enter`: quebra de linha normal
- [ ] `Esc`: `window.close()` ou IPC para `win.hide()`
- [ ] Visual: `background: var(--bg-surface)`, `border-radius: 12px`, `box-shadow` proeminente
- [ ] Css no `#root`: `background: transparent` para bordas arredondadas visíveis
- [ ] Estado de loading enquanto salva (textarea desabilitado brevemente)

**Verify**: Janela abre → textarea focado → digitar → Enter → janela fecha; nota aparece na sidebar/inbox

**Commit**: `feat(shortcuts): create QuickCaptureScreen component`

---

### T164: Criar `useGlobalShortcuts` hook [P]

**What**: Hook que registra todos os atalhos locais via `keydown` global no renderer
**Where**: `src/hooks/useGlobalShortcuts.ts`
**Depends on**: T162
**Requirement**: SHORT-02

**Done quando**:
- [ ] Listener `keydown` registrado no `window` via `useEffect` (cleanup no return)
- [ ] `Cmd+N` → `notesService.create(vaultPath)` (nova nota na inbox)
- [ ] `Cmd+K` → `searchStore.togglePalette()`
- [ ] `Cmd+F` → foca a `SearchBar` (via `searchBarRef` ou evento customizado)
- [ ] `Cmd+,` → `settingsStore.setOpen(true)`
- [ ] `Cmd+Shift+F` → `editorStore.toggleFocusMode()`
- [ ] `Cmd+\` → `layoutStore.toggleSidebar()`
- [ ] `Cmd+Shift+S` → `syncService.push()`
- [ ] `Cmd+H` → `syncStore.toggleHistory()`
- [ ] `Cmd+W` → `editorStore.closeNote()`
- [ ] `e.preventDefault()` em todos para evitar comportamento padrão do browser
- [ ] Não dispara dentro de inputs de outros modais (checar se `document.activeElement` é um input externo)

**Verify**: Cada atalho da tabela funciona sem precisar clicar primeiro no app; nenhum conflito com atalhos do sistema

**Commit**: `feat(shortcuts): create useGlobalShortcuts hook with all local shortcuts`

---

### T165: Implementar listeners de menu nativo no renderer [P]

**What**: Escutar eventos `menu:*` enviados pelo menu nativo e executar as ações correspondentes
**Where**: `src/hooks/useMenuListeners.ts`
**Depends on**: T162
**Requirement**: SHORT-03

**Done quando**:
- [ ] Hook `useMenuListeners()` com listeners para todos os eventos `menu:*`:
  - `menu:new-note` → `notesService.create(vaultPath)`
  - `menu:import` → abre `ImportDialog`
  - `menu:export-pdf` → `exportService.exportPDF(activePath)`
  - `menu:search` → foca a SearchBar
  - `menu:palette` → `searchStore.togglePalette()`
  - `menu:focus-mode` → `editorStore.toggleFocusMode()`
  - `menu:toggle-sidebar` → `layoutStore.toggleSidebar()`
  - `menu:history` → `syncStore.toggleHistory()`
  - `menu:sync` → `syncService.push()`
- [ ] Listeners registrados via `window.electronAPI.menu.onAction`
- [ ] Cleanup ao desmontar

**Verify**: Clicar em Arquivo > Nova Nota no menu macOS → nota criada; Sync > Sincronizar → push inicia

**Commit**: `feat(shortcuts): implement menu event listeners in renderer`

---

### T166: Criar menu nativo macOS com `buildAppMenu`

**What**: Construir e registrar o menu nativo da aplicação com todas as seções e atalhos
**Where**: `electron/menu.ts`, `electron/main.ts`
**Depends on**: T161 (para quickCapture no menu), T162
**Requirement**: SHORT-03

**Done quando**:
- [ ] `buildAppMenu(mainWindow, qcWin)` cria menu com seções: Arquivo, Editar, Visualizar, Sync
- [ ] Todos os aceleradores da tabela SHORT-02 visíveis no menu
- [ ] Ações de menu enviam `mainWindow.webContents.send('menu:${action}')` — renderer trata (T165)
- [ ] Exceção: quick capture e toggle sidebar executam direto no main (sem IPC)
- [ ] `Menu.setApplicationMenu(menu)` chamado no `app.whenReady()`
- [ ] `role: 'appMenu'` com nome do app (primeira entrada no macOS)

**Verify**: Abrir app no macOS → menu nativo exibe todas as seções com atalhos corretos

**Commit**: `feat(shortcuts): build native macOS application menu`

---

### T167: Adicionar rota `/quick-capture` ao router React

**What**: Detectar hash `#/quick-capture` e renderizar apenas `<QuickCaptureScreen>` sem o layout principal
**Where**: `src/App.tsx` ou `src/router.tsx`
**Depends on**: T163
**Requirement**: SHORT-01

**Done quando**:
- [ ] `window.location.hash === '#/quick-capture'` → renderiza `<QuickCaptureScreen>` isolado
- [ ] Nenhum componente do app principal (sidebar, editor, stores) inicializado na rota quick capture
- [ ] CSS global da quick capture: `body { background: transparent; margin: 0 }`, `#root { background: transparent }`
- [ ] Sem flash de conteúdo do app principal ao abrir a janela

**Verify**: Abrir `http://localhost:5173/#/quick-capture` no dev → só a tela de captura visível; app principal sem interferência

**Commit**: `feat(shortcuts): add /quick-capture route to React app`

---

### T168: Montar hooks no MainLayout e verificação final

**What**: Adicionar `useGlobalShortcuts()` e `useMenuListeners()` ao `MainLayout`; verificar que todos os atalhos da tabela SHORT-02 funcionam sem conflito
**Where**: `src/components/layout/MainLayout.tsx`
**Depends on**: T164, T165, T166, T167
**Requirement**: SHORT-01, SHORT-02, SHORT-03

**Done quando**:
- [ ] `useGlobalShortcuts()` e `useMenuListeners()` chamados no `MainLayout`
- [ ] Verificar cada atalho da tabela SHORT-02 manualmente
- [ ] `Cmd+N` não conflita com o input da SearchBar
- [ ] `Cmd+H` não conflita com o histórico do browser (Electron previne isso via `preventDefault`)
- [ ] Quick capture global funciona com app em background
- [ ] Menu nativo exibe todos os atalhos corretamente no macOS

**Verify**: Walkthrough completo de todos os atalhos da tabela SHORT-02 — todos funcionam; quick capture cria nota na inbox; menu nativo operacional

**Commit**: `feat(shortcuts): mount global shortcuts and menu listeners in MainLayout`

---

## Parallel Execution Map

```
Phase 1:  T160 → T161 → T162

Phase 2:  T162 ─┬→ T163 [P] ─┐
                 ├→ T164 [P] ─┤→ T166 → T167 → T168
                 └→ T165 [P] ─┘
```

---

## Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T160: quickCapture window factory | 1 arquivo de factory | ✅ |
| T161: globalShortcut + save IPC | 1 registro + 1 handler | ✅ |
| T162: expor no preload | 2 namespaces | ✅ |
| T163: QuickCaptureScreen | 1 componente | ✅ |
| T164: useGlobalShortcuts | 1 hook | ✅ |
| T165: useMenuListeners | 1 hook | ✅ |
| T166: menu nativo | 1 template de menu | ✅ |
| T167: rota /quick-capture | 1 condição no router | ✅ |
| T168: montar hooks + verificação | 2 linhas + smoke test | ✅ |
