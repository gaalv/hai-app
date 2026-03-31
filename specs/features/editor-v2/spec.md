# Editor v2 Specification

## Problem Statement

O editor atual é raw CodeMirror com toggle editar/preview. O diferencial do Hai é edição inline estilo Typora/Bear — markdown renderiza enquanto você digita, sem precisar trocar de modo.

## Goals

- Markdown renderizado inline: headings aparecem grandes, bold aparece em negrito, sem precisar sair do editor
- Syntax markers (**, ##, etc.) somem quando cursor não está na linha/posição
- Vim mode opcional
- Fonte e tamanho configuráveis

## Architecture

CodeMirror 6 usa um sistema de `Decorations` para modificar a renderização de texto:
- `Decoration.mark` — aplica classes CSS a ranges de texto (hide/show syntax markers)
- `Decoration.replace` — substitui ranges por widgets customizados
- `WidgetType` — componentes React-like renderizados inline

A extensão de inline rendering será um `StateField` + `ViewPlugin` que:
1. Parseia o markdown com o lezer tree do `@codemirror/lang-markdown`
2. Para cada nó markdown (Heading, Bold, Italic, Link, Code, etc.):
   - Se cursor não está no range: aplica decoração de hide nos syntax markers + estilo no conteúdo
   - Se cursor está no range: mostra markdown cru para edição

## Requirements

### EDITOR2-01 — Inline Heading Rendering
- `# Título` → texto aparece como H1 (font-size 2em, font-weight bold)
- `##`, `###` → H2, H3 com tamanhos decrescentes
- `#` marker some quando cursor não está na linha
- Cursor na linha: `# Título` aparece cru para edição

### EDITOR2-02 — Inline Bold/Italic
- `**texto**` → texto em negrito, `**` some quando cursor fora do range
- `*texto*` → itálico, `*` some quando cursor fora
- `***texto***` → negrito + itálico

### EDITOR2-03 — Inline Code
- `` `código` `` → fundo de destaque (surface color), fonte monospace
- Backticks somem quando cursor fora do span

### EDITOR2-04 — Code Blocks com Syntax Highlight
- ` ```linguagem ` → syntax highlight da linguagem especificada
- Suporte inicial: js/ts, python, bash, json, css, html, markdown
- Usar `@codemirror/language` + language packs

### EDITOR2-05 — Inline Links
- `[texto](url)` → texto aparece sublinhado em cor primary
- `(url)` some quando cursor fora do link
- Ctrl+Click abre link no browser externo

### EDITOR2-06 — Listas Inline
- `- item` ou `* item` → bullet aparece como `•`
- `1. item` → numeração formatada
- Indentação visual mantida

### EDITOR2-07 — Vim Mode
- Ativado via toggle nas settings (persistido)
- Usa `@replit/codemirror-vim` ou similar
- Statusbar exibe `NORMAL` / `INSERT` / `VISUAL` quando ativo
- Quick escape com `jk` configurável

### EDITOR2-08 — Font Settings
- Default: JetBrains Mono 14px
- Configurável nas settings: família (lista curada) e tamanho (12–20px)
- Line height configurável (1.4–2.0, default 1.7)

### EDITOR2-09 — Focus Mode Integration
- Quando focus mode ativo: padding lateral aumentado (max-width 680px centrado)
- Typewriter mode opcional: cursor sempre no centro vertical

## Out of Scope

- WYSIWYG completo (tabelas visuais, drag de elementos)
- Colaboração em tempo real
- Spell check
- Imagens inline no editor (v2)

## Acceptance Criteria

1. WHEN usuário escreve `# Título` e move cursor para outra linha THEN `#` some e texto aparece formatado como heading
2. WHEN usuário move cursor de volta para a linha THEN markdown cru aparece para edição
3. WHEN vim mode está ativo THEN statusbar exibe modo atual e comandos vim funcionam
4. WHEN code block com ```js THEN código aparece com syntax highlight de JS

## Status: PENDING — M2
