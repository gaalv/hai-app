# Interface v2 Design

**Spec**: `.specs/features/interface-v2/spec.md`
**Status**: Draft

---

## Architecture Overview

A interface é construída em camadas: BrowserWindow config (main process) → CSS variables system → layout React com `layoutStore` como fonte de verdade do estado visual.

```
┌──────────────────────────────────────────┐
│  Topbar (28px) — traffic lights + title  │  ← -webkit-app-region: drag
├──────────┬───────────────────────────────┤
│          │                               │
│ Sidebar  │     EditorPane                │
│ (220px)  │                               │
│          │                               │
│ collapsa │                               │
│ ←→       │                               │
├──────────┴───────────────────────────────┤
│  Statusbar (22px) — sync | words | vim   │  ← fixed bottom
└──────────────────────────────────────────┘
```

**Focus mode** esconde todas as camadas exceto o EditorPane, que expande para 100vh.

---

## CSS Variables System (Theming)

Toda a paleta de cores é definida como CSS custom properties no `:root`. O tema é aplicado via classe `data-theme="dark"` ou `data-theme="light"` no `<html>` — não via `prefers-color-scheme` diretamente no CSS, para permitir override manual.

```css
/* src/styles/themes.css */

:root[data-theme="dark"] {
  /* Backgrounds */
  --bg-base:       #0d1117;   /* GitHub dark base */
  --bg-surface:    #161b22;   /* surface cards, sidebar */
  --bg-surface-2:  #21262d;   /* hover, active states */
  --bg-surface-3:  #30363d;   /* inputs, code bg */

  /* Borders */
  --border:        #30363d;
  --border-subtle: #21262d;

  /* Text */
  --text-primary:  #e6edf3;
  --text-secondary:#8b949e;
  --text-muted:    #484f58;

  /* Accent */
  --color-primary: #3fb950;   /* GitHub green */
  --color-primary-hover: #46c757;
  --color-error:   #f85149;
  --color-warning: #d29922;

  /* Editor */
  --editor-bg:     #0d1117;
  --editor-selection: rgba(56, 139, 253, 0.25);
}

:root[data-theme="light"] {
  --bg-base:       #f6f8fa;
  --bg-surface:    #ffffff;
  --bg-surface-2:  #f0f3f6;
  --bg-surface-3:  #e8ebef;
  --border:        #d0d7de;
  --border-subtle: #e8ebef;
  --text-primary:  #1f2328;
  --text-secondary:#656d76;
  --text-muted:    #9198a1;
  --color-primary: #1a7f37;
  --color-primary-hover: #218a3e;
  --color-error:   #d1242f;
  --color-warning: #9a6700;
  --editor-bg:     #ffffff;
  --editor-selection: rgba(84, 174, 255, 0.2);
}
```

### Aplicação do tema

```typescript
// src/hooks/useTheme.ts
export function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme)
}

export function useTheme() {
  const { theme } = useSettingsStore()

  useEffect(() => {
    if (theme === 'auto') {
      // Ler preferência do sistema via Electron
      window.electronAPI.theme.getSystemTheme().then(applyTheme)
      // Listener para mudanças em tempo real
      window.electronAPI.theme.onSystemThemeChange(applyTheme)
    } else {
      applyTheme(theme)
    }
  }, [theme])
}
```

No main process, `nativeTheme` detecta mudanças do sistema:

```typescript
// electron/ipc/theme.ipc.ts
nativeTheme.on('updated', () => {
  const t = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  mainWindow.webContents.send('theme:system-changed', t)
})
```

---

## Mac Transparent Titlebar (INT-01)

```typescript
// electron/main.ts — BrowserWindow config
const mainWindow = new BrowserWindow({
  width: 1280,
  height: 800,
  titleBarStyle: 'hiddenInset',   // traffic lights sobrepostos ao conteúdo
  trafficLightPosition: { x: 14, y: 10 },
  vibrancy: 'under-window',       // blur de fundo (opcional, macOS only)
  visualEffectState: 'active',
  transparent: false,             // false para melhor performance
  backgroundColor: '#0d1117',     // evita flash branco na abertura
  webPreferences: { /* ... */ },
})
```

### Topbar React

```tsx
// src/components/layout/Topbar.tsx
// -webkit-app-region: drag na área que deve arrastar a janela
// -webkit-app-region: no-drag nos botões (evita conflito)
```

```css
.topbar {
  height: 44px;                        /* espaço para traffic lights */
  padding-left: 80px;                  /* clearance para os 3 botões */
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  user-select: none;
}
.topbar__actions {
  -webkit-app-region: no-drag;         /* botões clicáveis */
}
```

---

## Sidebar Colapsável (INT-03)

### Estado

```typescript
// src/stores/layout.store.ts
interface LayoutStore {
  sidebarOpen: boolean
  sidebarWidth: number          // px, default 220
  focusMode: boolean
  toggleSidebar(): void
  setSidebarWidth(w: number): void
  toggleFocusMode(): void
}
```

Estado persistido em `electron-store` (`appConfig.sidebarOpen`, `appConfig.sidebarWidth`).

### Animação

```css
.sidebar {
  width: var(--sidebar-width, 220px);
  min-width: 160px;
  max-width: 400px;
  transition: width 200ms ease, opacity 200ms ease;
  overflow: hidden;
}

.sidebar--collapsed {
  width: 48px;   /* só ícones */
}
```

### Modo ícones (collapsed)

Quando `sidebarOpen === false`, a sidebar exibe apenas ícones (sem labels):
- Ícone de notebooks (folder)
- Ícone de tags (tag)
- Ícone de busca (search)
- Ícone de lixeira (trash)

Cada ícone tem tooltip com o nome ao hover.

### Drag to resize

```tsx
// src/components/layout/SidebarResizer.tsx
// Div de 4px na borda direita da sidebar
// onMouseDown → setIsDragging(true) → mousemove atualiza layoutStore.sidebarWidth
// mouseup → setIsDragging(false)
```

---

## Statusbar (INT-04)

```
┌─────────────────────────────────────────────────────────────┐
│ ⟳ Sincronizando      main │           234 palavras  INSERT  │
└─────────────────────────────────────────────────────────────┘
  ← esquerda                                   direita →
```

```tsx
// src/components/layout/StatusBar.tsx
export function StatusBar() {
  return (
    <div className="statusbar">
      <div className="statusbar__left">
        <SyncStatusBar />          {/* de sync-v2, T94 */}
      </div>
      <div className="statusbar__right">
        <WordCount />              {/* novo — conta palavras da nota ativa */}
        <VimStatusBar />           {/* de editor-v2, T129 */}
        <span className="statusbar__lang">Markdown</span>
      </div>
    </div>
  )
}
```

```css
.statusbar {
  height: 22px;
  font-size: 11px;
  font-family: var(--font-mono);
  background: var(--color-primary);   /* verde GitHub — destaque */
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  flex-shrink: 0;
}
.statusbar__left, .statusbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}
```

### WordCount component

```typescript
// src/components/layout/WordCount.tsx
// Lê editorStore.activeNote.content
// Conta: content.trim().split(/\s+/).filter(Boolean).length
// Exibe: "234 palavras" (atualiza em tempo real via editorStore)
```

---

## Focus Mode (INT-05)

```css
/* Quando focusMode ativo — classes no <body> ou no root container */
.focus-mode .topbar    { display: none; }
.focus-mode .sidebar   { display: none; }
.focus-mode .statusbar { display: none; }
.focus-mode .editor-pane {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 60px;
}
```

`Esc` dentro do editor chama `editorStore.toggleFocusMode()` via keymap do CodeMirror (não conflita com Esc do vim normal mode).

---

## Layout CSS — Estrutura Principal

```css
/* src/styles/layout.css */
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Fora do app-root — sem o layout padrão */
.quick-capture-root {
  background: transparent;
}
```

---

## Typography & Font Loading

```css
/* src/styles/fonts.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

:root {
  --font-sans:  'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:  'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace;
}
```

**JetBrains Mono** — instalada via `@fontsource/jetbrains-mono` (não depende de CDN):

```typescript
// src/main.tsx
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/400-italic.css'
```

---

## Components

### `Topbar.tsx`
- Altura 44px, padding-left 80px (traffic lights)
- Título do app (ou nome do vault) centralizado
- Botão de toggle sidebar à esquerda (após traffic lights)
- `SyncStatusBadge` à direita (modo compact)
- `-webkit-app-region: drag` no container

### `Sidebar.tsx`
- Renderiza notebooks, tags, pinned, inbox, lixeira
- Modo colapsado: só ícones com tooltip
- Resizer (div de 4px) na borda direita
- Largura controlada por `layoutStore.sidebarWidth`

### `StatusBar.tsx`
- Compõe `SyncStatusBar` + `WordCount` + `VimStatusBar` + label "Markdown"
- Background: `var(--color-primary)` (verde GitHub)

### `WordCount.tsx`
- Conta palavras da nota ativa em tempo real
- Exibe: "N palavras" ou "N chars" (toggle com click)

### `layoutStore`
- `sidebarOpen`, `sidebarWidth`, `focusMode`
- Persiste no `electron-store`

---

## Tech Decisions

| Decisão | Escolha | Motivo |
|---|---|---|
| Paleta | GitHub dark (`#0d1117`) + verde `#3fb950` | Linear-style com identidade clara; familiar para devs |
| Tema via `data-theme` | Atributo no `<html>` | Permite override manual e CSS vars sem duplicação |
| `titleBarStyle: 'hiddenInset'` | Padrão Electron para macOS nativo | Melhor que `frameless` — mantém resize nativo |
| Statusbar bg | `var(--color-primary)` verde | Destaque visual como VSCode usa azul; distingue info do conteúdo |
| JetBrains Mono | `@fontsource/jetbrains-mono` | Bundle local — sem CDN, sem flash, sem dependência de rede |
| Sidebar collapse | Width → 48px (ícones) | Não desmonta componentes — estado preservado |
| Focus mode | Classes CSS no body | Zero JS para esconder/mostrar — apenas toggle de classe |
