# Interface v2 Tasks

**Design**: `.specs/features/interface-v2/design.md`
**Status**: Draft

> Tasks T172–T184. Base do sistema visual — deve ser implementado antes ou em paralelo com outras features de UI. Não depende de features de dados (sync, search), mas outras features dependem do `layoutStore` e das CSS variables.

---

## Execution Plan

```
Phase 1 — Fundação CSS + BrowserWindow (Parallel):
  ┌→ T172 [P] (BrowserWindow titlebar config)
  └→ T173 [P] (CSS variables system — temas dark/light)

Phase 2 — Theme + Layout State (Parallel após T173):
  ┌→ T174 [P] (theme IPC + useTheme hook)
  └→ T175 [P] (layoutStore + persistência)

Phase 3 — Componentes de layout (Parallel após T174+T175):
  ┌→ T176 [P] (Topbar)
  ├→ T177 [P] (Sidebar com collapse + resizer)
  └→ T178 [P] (StatusBar shell + WordCount)

Phase 4 — Focus mode + Integração (Sequential após Phase 3):
  T176+T177+T178 → T179 → T180 → T181
```

---

## Task Breakdown

### T172: Configurar BrowserWindow para Mac transparent titlebar [P]

**What**: Atualizar a criação do `BrowserWindow` principal com `titleBarStyle: 'hiddenInset'` e parâmetros de visual macOS
**Where**: `electron/main.ts`
**Depends on**: —
**Requirement**: INT-01

**Done quando**:
- [ ] `titleBarStyle: 'hiddenInset'` configurado
- [ ] `trafficLightPosition: { x: 14, y: 10 }` para alinhamento preciso
- [ ] `backgroundColor: '#0d1117'` para evitar flash branco na abertura
- [ ] `vibrancy: 'under-window'` aplicado apenas no macOS (verificar `process.platform === 'darwin'`)
- [ ] Janela abre com traffic lights sobrepostos ao conteúdo, sem barra de título nativa
- [ ] Redimensionamento da janela continua funcionando (bordas nativas preservadas)

**Verify**: App abre no macOS → traffic lights (vermelho/amarelo/verde) aparecem sobre o conteúdo; janela redimensionável pelos cantos

**Commit**: `feat(interface-v2): configure hiddenInset titlebar for macOS native look`

---

### T173: Criar sistema de CSS variables com paletas dark/light [P]

**What**: Criar `src/styles/themes.css` com todas as CSS custom properties para ambos os temas; instalar `@fontsource/jetbrains-mono`
**Where**: `src/styles/themes.css`, `src/styles/fonts.css`, `src/styles/layout.css`, `package.json`
**Depends on**: —
**Requirement**: INT-02, INT-06, INT-07

**Done quando**:
- [ ] `@fontsource/jetbrains-mono` instalado (`npm install @fontsource/jetbrains-mono`)
- [ ] `themes.css`: todas as CSS vars definidas para `[data-theme="dark"]` e `[data-theme="light"]` conforme paleta do design
- [ ] Cores dark: `--bg-base: #0d1117`, `--bg-surface: #161b22`, `--color-primary: #3fb950` e demais vars
- [ ] Cores light: contrapartes legíveis para uso diurno
- [ ] `fonts.css`: `--font-sans` e `--font-mono` definidos; JetBrains Mono importado do `@fontsource`
- [ ] `layout.css`: estrutura flex `.app-root`, `.app-main` conforme design
- [ ] Todos os arquivos CSS importados em `src/main.tsx`
- [ ] `<html data-theme="dark">` como default inicial (antes de detectar sistema)

**Verify**: App abre com fundo `#0d1117`; elemento com classe usando `var(--color-primary)` aparece verde `#3fb950`

**Commit**: `feat(interface-v2): create CSS variables system with GitHub-based dark/light themes`

---

### T174: Criar theme IPC + `useTheme` hook [P]

**What**: Detectar tema do sistema via `nativeTheme`, emitir evento ao mudar; hook React que aplica o tema no `<html>`
**Where**: `electron/ipc/theme.ipc.ts`, `src/hooks/useTheme.ts`, `electron/preload.ts`
**Depends on**: T173
**Requirement**: INT-02

**Done quando**:
- [ ] `theme:get-system` IPC handler: retorna `'dark' | 'light'` via `nativeTheme.shouldUseDarkColors`
- [ ] `nativeTheme.on('updated', ...)` emite `theme:system-changed` para o renderer
- [ ] `window.electronAPI.theme.getSystemTheme()` e `window.electronAPI.theme.onSystemThemeChange(cb)` expostos no preload
- [ ] `useTheme()` hook:
  - Se `settingsStore.theme === 'auto'`: chama IPC para obter tema atual + registra listener de mudança
  - Se `'dark'` ou `'light'`: aplica diretamente
  - `applyTheme(t)` faz `document.documentElement.setAttribute('data-theme', t)`
- [ ] Transição suave: `html { transition: background-color 200ms, color 200ms }`
- [ ] `useTheme()` montado no `App.tsx`

**Verify**: Mudar tema do sistema no macOS (System Settings) → app atualiza automaticamente sem reload; toggle manual nas settings persiste entre sessões

**Commit**: `feat(interface-v2): implement theme detection with nativeTheme and useTheme hook`

---

### T175: Criar `layout.store.ts` [P]

**What**: Zustand store para estado visual do layout (sidebar, focus mode); persistido no electron-store
**Where**: `src/stores/layout.store.ts`
**Depends on**: —
**Requirement**: INT-03, INT-05

**Done quando**:
- [ ] `sidebarOpen: boolean` (default: `true`)
- [ ] `sidebarWidth: number` (default: `220`, min: `160`, max: `400`)
- [ ] `focusMode: boolean` (default: `false`)
- [ ] `toggleSidebar()`, `setSidebarWidth(w)`, `toggleFocusMode()`
- [ ] Estado lido do `electron-store` no init: `window.electronAPI.app.getLayoutConfig()`
- [ ] Cada mudança persiste via IPC: `window.electronAPI.app.setLayoutConfig(state)`
- [ ] IPC handlers `app:get-layout-config` e `app:set-layout-config` adicionados ao `app.ipc.ts`
- [ ] TypeScript sem erros

**Verify**: Colapsar sidebar → fechar app → reabrir → sidebar permanece colapsada

**Commit**: `feat(interface-v2): create layout store with sidebar and focus mode state`

---

### T176: Criar `Topbar.tsx` [P]

**What**: Barra superior com tráfego de luz integrado, título e toggle de sidebar
**Where**: `src/components/layout/Topbar.tsx`
**Depends on**: T174, T175
**Requirement**: INT-01, INT-03

**Done quando**:
- [ ] Altura `44px`, `padding-left: 80px` para os traffic lights
- [ ] `-webkit-app-region: drag` no container; `-webkit-app-region: no-drag` nos botões
- [ ] Botão de toggle sidebar à esquerda (ícone de sidebar) → `layoutStore.toggleSidebar()`
- [ ] Título/nome do vault centralizado (lê `vaultStore.name` ou nome do arquivo)
- [ ] Background `var(--bg-surface)`, `border-bottom: 1px solid var(--border-subtle)`
- [ ] `user-select: none` para evitar seleção acidental durante drag

**Verify**: Clicar e arrastar no centro da topbar → janela se move; botão de sidebar clicável; traffic lights posicionados corretamente

**Commit**: `feat(interface-v2): create Topbar with Mac traffic lights integration`

---

### T177: Criar `Sidebar.tsx` com collapse e drag-to-resize [P]

**What**: Sidebar com estado colapsado (ícones only), animação, e drag handle para redimensionar
**Where**: `src/components/layout/Sidebar.tsx`, `src/components/layout/SidebarResizer.tsx`
**Depends on**: T175
**Requirement**: INT-03

**Done quando**:
- [ ] Largura controlada por `layoutStore.sidebarWidth` via CSS var `--sidebar-width`
- [ ] `.sidebar--collapsed` → width: `48px`; exibe apenas ícones com tooltip
- [ ] Animação `transition: width 200ms ease` no colapso/expansão
- [ ] `SidebarResizer` — div de `4px` na borda direita com cursor `col-resize`
  - `onMouseDown` → event listeners globais `mousemove` + `mouseup`
  - `mousemove`: `layoutStore.setSidebarWidth(clamp(e.clientX, 160, 400))`
  - `mouseup`: remove listeners
- [ ] Modo colapsado: ícones com `title` (tooltip nativo) para cada seção
- [ ] Toggle via `Cmd+\` (integrado com `useGlobalShortcuts` de T164)

**Verify**: Arrastar a borda direita da sidebar → redimensiona em tempo real; `Cmd+\` → anima para ícones; reabrir → largura persistida

**Commit**: `feat(interface-v2): create collapsible Sidebar with drag-to-resize`

---

### T178: Criar `StatusBar.tsx` + `WordCount.tsx` [P]

**What**: Shell da statusbar inferior compondo sync status, contagem de palavras e vim mode
**Where**: `src/components/layout/StatusBar.tsx`, `src/components/layout/WordCount.tsx`
**Depends on**: T173 (CSS vars)
**Requirement**: INT-04

**Done quando**:
- [ ] `StatusBar.tsx`:
  - Altura `22px`, `font-size: 11px`, monospace
  - Background `var(--color-primary)` (verde)
  - `<div className="statusbar__left">` com `<SyncStatusBar />` (placeholder se feature não implementada)
  - `<div className="statusbar__right">` com `<WordCount />`, `<VimStatusBar />`, label `"Markdown"`
- [ ] `WordCount.tsx`:
  - Lê `editorStore.activeNote?.content`
  - Conta palavras: `content.trim().split(/\s+/).filter(Boolean).length`
  - Exibe "N palavras"; click → alterna para "N chars"
  - Exibe "—" quando sem nota ativa
- [ ] `SyncStatusBar` e `VimStatusBar` usam stubs/placeholders enquanto suas features não estão implementadas (renderizam `null` graciosamente se store não disponível)

**Verify**: Nota aberta com "Hello World foo" → statusbar exibe "3 palavras"; statusbar verde visível na parte inferior

**Commit**: `feat(interface-v2): create StatusBar shell with WordCount component`

---

### T179: Implementar focus mode

**What**: Esconder topbar, sidebar e statusbar com classe CSS; expandir editor
**Where**: `src/components/layout/MainLayout.tsx`, `src/styles/layout.css`
**Depends on**: T175, T176, T177, T178
**Requirement**: INT-05

**Done quando**:
- [ ] `layoutStore.focusMode` adiciona classe `focus-mode` ao `<body>`
- [ ] CSS: `.focus-mode .topbar`, `.focus-mode .sidebar`, `.focus-mode .statusbar` → `display: none`
- [ ] Editor centralizado: `max-width: 720px; margin: 0 auto; padding: 40px 60px`
- [ ] `Cmd+Shift+F` via `useGlobalShortcuts` (T164) já conectado ao `layoutStore.toggleFocusMode()`
- [ ] `Esc` no editor: `keymap` do CodeMirror chama `layoutStore.toggleFocusMode()` se `focusMode === true`
- [ ] Ao entrar no focus mode: viewport se ajusta sem janking

**Verify**: `Cmd+Shift+F` → topbar/sidebar/statusbar somem; editor centralizado; `Esc` → tudo volta

**Commit**: `feat(interface-v2): implement focus mode hiding all chrome`

---

### T180: Montar layout principal no `MainLayout.tsx`

**What**: Compor `Topbar`, `Sidebar`, `EditorPane`, `StatusBar` no layout principal usando as CSS vars e o `layoutStore`
**Where**: `src/components/layout/MainLayout.tsx`
**Depends on**: T176, T177, T178, T179
**Requirement**: INT-01, INT-03, INT-04

**Done quando**:
- [ ] Estrutura: `<div class="app-root"> <Topbar> <div class="app-main"> <Sidebar> <EditorPane> </div> <StatusBar> </div>`
- [ ] `--sidebar-width` CSS var atualizada quando `layoutStore.sidebarWidth` muda
- [ ] Classe `focus-mode` no `<body>` controlada por `layoutStore.focusMode`
- [ ] `useTheme()` hook montado aqui
- [ ] `npm run dev` sem erros visuais: layout correto no primeiro render

**Verify**: App abre com layout correto: topbar no topo, sidebar à esquerda, statusbar na base; nenhum elemento fora do lugar

**Commit**: `feat(interface-v2): assemble MainLayout with all UI layers`

---

### T181: Verificação cross-platform e polish final

**What**: Verificar layout no macOS e Windows; ajustar o que falhar; verificar tema claro
**Where**: `electron/main.ts`, CSS files
**Depends on**: T180
**Requirement**: INT-01, INT-02

**Done quando**:
- [ ] macOS: titlebar transparente, traffic lights integrados, vibrancy funcional
- [ ] Windows: `titleBarStyle: 'hidden'` em vez de `'hiddenInset'` (sem `trafficLightPosition`); janela com controles nativos visíveis
  - Usar `process.platform === 'darwin'` para aplicar `hiddenInset` só no macOS
  - No Windows: `titleBarStyle: 'hidden'` + overlay de controles via `titleBarOverlay`
- [ ] Tema claro: verificar contraste de todos os textos com as CSS vars de light theme
- [ ] Transição de tema (200ms) sem flash
- [ ] Sidebar collapse/expand: animação fluida sem layout shift

**Verify**: App funcional no macOS (traffic lights integrados) e Windows (controles nativos ou overlay); toggle de tema sem glitches

**Commit**: `feat(interface-v2): cross-platform titlebar and theme polish`

---

## Parallel Execution Map

```
Phase 1:  T172 [P] ─┐
          T173 [P] ─┤ (independentes)

Phase 2:  T173 → T174 [P] ─┐
          T175 [P] ────────┤ (independentes entre si)

Phase 3:  T174+T175 ─┬→ T176 [P] ─┐
                      ├→ T177 [P] ─┤→ T179 → T180 → T181
                      └→ T178 [P] ─┘
```

---

## Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T172: BrowserWindow titlebar | 5 linhas no main.ts | ✅ |
| T173: CSS variables + fontes | 3 arquivos CSS + 1 npm install | ✅ |
| T174: theme IPC + hook | 1 IPC handler + 1 hook | ✅ |
| T175: layoutStore | 1 store | ✅ |
| T176: Topbar | 1 componente | ✅ |
| T177: Sidebar collapse + resize | 1 componente + 1 resizer | ✅ |
| T178: StatusBar + WordCount | 2 componentes | ✅ |
| T179: focus mode | CSS + 1 keymap entry | ✅ |
| T180: montar MainLayout | 1 composição | ✅ |
| T181: cross-platform + polish | verificação + ajustes | ✅ |

---

## Dependências de outras features

O `StatusBar` compõe componentes de outras features:
- `SyncStatusBar` → `sync-v2/tasks.md` T94 (deve existir antes ou usar stub)
- `VimStatusBar` → `editor-v2/tasks.md` T129 (deve existir antes ou usar stub)

**Estratégia de stub**: `StatusBar.tsx` importa condicionalmente — se o componente não existir ainda, renderiza `null`. Isso permite implementar `interface-v2` independentemente da ordem das features.
