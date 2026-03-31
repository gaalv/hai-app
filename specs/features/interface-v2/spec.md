# Interface v2 Specification

## Problem Statement

A interface atual é funcional mas genérica. Para v1.0 o app precisa ter identidade visual própria, sentir-se nativo no Mac e ter UX polida (temas, sidebar colapsável, statusbar).

## Goals

- App se sente nativo no macOS (titlebar transparente, traffic lights integrados)
- Tema claro/escuro automático baseado na preferência do sistema
- Sidebar colapsável sem perda de estado
- Statusbar inferior estilo VSCode com informações contextuais
- Focus mode para escrita sem distrações

## Requirements

### INT-01 — Mac Transparent Titlebar
- `titleBarStyle: 'hiddenInset'` no BrowserWindow
- Janela sem frame nativo, traffic lights sobrepostos ao conteúdo
- Área arrastável (`-webkit-app-region: drag`) na topbar

### INT-02 — Temas Claro/Escuro
- Detectar `prefers-color-scheme` do sistema na inicialização
- Toggle manual nas settings (auto / light / dark)
- Paleta dark: bg `#0a0a0a`, surface `#111`, border `#222`, primary `oklch(0.59 0.24 292)`
- Paleta light: bg `#f8f8f8`, surface `#fff`, border `#e5e5e5`, primary `oklch(0.45 0.24 292)`
- Transição suave entre temas (200ms)

### INT-03 — Sidebar Colapsável
- Toggle com atalho `Cmd+\` e botão na topbar
- Estado persistido no electron-store
- Animação de slide (200ms)
- Ao colapsar: mostra só ícones (notebooks, tags, search)
- Largura configurável por drag (min 160px, max 400px, default 220px)

### INT-04 — Statusbar VSCode-style
- Barra inferior fixa, altura 22px
- Lado esquerdo: sync status (ícone + texto), branch do git
- Lado direito: contagem de palavras/chars, modo Vim (quando ativo), linguagem (Markdown)
- Click no sync status abre sync panel
- Ícones: ⟳ syncing, ✓ synced, ✕ error, ○ not configured

### INT-05 — Focus Mode
- Atalho `Cmd+Shift+F`
- Esconde sidebar, topbar e statusbar
- Editor ocupa 100% da tela com padding generoso
- Sair com `Esc` ou mesmo atalho

### INT-06 — JetBrains Mono
- Fonte padrão para o editor e elementos monospace
- Fallback: `ui-monospace, monospace`
- Tamanho configurável nas settings (12px–20px, default 14px)

### INT-07 — Layout Linear-style
- Cores baseadas em tons de cinza escuro + verde como accent (ou manter purple como definido)
- Topbar minimalista: apenas app name e sync badge
- Sidebar: vault name + lista de notebooks/notas + tags section
- Sem bordas desnecessárias

## Out of Scope

- Temas customizáveis pelo usuário (v2)
- Extensões de tema / marketplace
- Múltiplas janelas

## Acceptance Criteria

1. WHEN app abre no macOS THEN traffic lights aparecem sobrepostos ao conteúdo sem barra nativa
2. WHEN sistema muda tema THEN app atualiza automaticamente sem reiniciar
3. WHEN usuário pressiona Cmd+\ THEN sidebar colapsa/expande com animação
4. WHEN nota está aberta THEN statusbar exibe contagem de palavras atualizada
5. WHEN Cmd+Shift+F THEN UI some e apenas editor fica visível

## Status: PENDING — M1
