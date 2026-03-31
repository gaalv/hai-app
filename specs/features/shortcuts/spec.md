# Shortcuts Specification

## Problem Statement

Capturar uma ideia rápida requer abrir o app, navegar até o vault, criar uma nota. Com quick capture, isso vira Cmd+Shift+H de qualquer lugar do sistema.

## Goals

- Quick capture global: Cmd+Shift+H abre janela flutuante, salva na inbox
- Atalhos locais padronizados para ações principais

## Requirements

### SHORT-01 — Quick Capture (Cmd+Shift+H)
- Atalho global registrado com `globalShortcut.register` no Electron
- Abre janela flutuante pequena (~500×200px) centrada na tela
- Sem barra de titulo, bordas arredondadas, sombra
- Input de texto simples (não markdown) + botão Salvar
- Salvar com Enter, cancelar com Esc
- Nota salva como .md na pasta inbox com título = primeiras 50 chars ou timestamp
- Janela some após salvar
- Ícone de app na menubar opcional (macOS) para acesso rápido

### SHORT-02 — Atalhos Locais

| Ação | Atalho |
|---|---|
| Nova nota | Cmd+N |
| Command palette | Cmd+K |
| Busca | Cmd+F |
| Focus mode | Cmd+Shift+F |
| Toggle sidebar | Cmd+\ |
| Salvar nota | Cmd+S (manual além de autosave) |
| Settings | Cmd+, |
| Sync manual | Cmd+Shift+S |
| Histórico de versões | Cmd+H |
| Fechar nota | Cmd+W |

### SHORT-03 — Menu de Aplicativo (macOS)
- Menu nativo com todas as ações principais
- Atalhos visíveis no menu (mesmos do SHORT-02)
- Submenus: File, Edit, View, Sync, Help

## Out of Scope

- Atalhos customizáveis pelo usuário (v2)
- Integração com Alfred/Raycast

## Acceptance Criteria

1. WHEN app não está em foco THEN Cmd+Shift+H abre janela de quick capture
2. WHEN usuário digita e pressiona Enter na quick capture THEN nota salva na inbox e janela fecha
3. WHEN usuário pressiona Cmd+N THEN nova nota criada e editor focado

## Status: PENDING — M7
