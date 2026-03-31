# Sync v2 Specification

## Problem Statement

O sync atual é manual (push/pull por botão). Para uso diário real o sync precisa ser automático, com histórico visual de versões aproveitando os commits do GitHub, e uma lixeira para recuperar notas deletadas.

## Goals

- Sync automático em background com intervalo configurável
- Histórico visual de versões: timeline de commits com diff visual
- Lixeira com período de retenção antes de apagar definitivamente
- Status claro na statusbar (estilo VSCode)

## Requirements

### SYNC2-01 — Auto Sync com Intervalo
- Intervalo configurável: 5, 15, 30 minutos ou manual
- Config salva em hai.json + settings
- Background timer no main process (setInterval)
- Push automático: apenas se há mudanças locais
- Pull automático: merge fast-forward se sem conflitos; pausar e notificar se conflito
- Indicador "syncing" na statusbar durante operação

### SYNC2-02 — Statusbar Sync (VSCode-style)
- Bottom statusbar com ícone de sync à esquerda
- Estados: `⟳ Sincronizando`, `✓ Sincronizado`, `○ N pendentes`, `✕ Erro`
- Tooltip com timestamp da última sincronização
- Click abre sync panel (com histórico, push/pull manual, config)

### SYNC2-03 — Histórico Visual de Versões
- Panel de histórico (abre do statusbar ou Cmd+H)
- Timeline de commits do repo (isomorphic-git log)
- Para cada commit: timestamp, mensagem, arquivos alterados
- Clicar em commit: diff visual da nota selecionada entre versão atual e commit
- Diff com syntax highlight: linhas adicionadas (verde), removidas (vermelho)
- Restaurar versão: substitui conteúdo atual pelo do commit selecionado

### SYNC2-04 — Lixeira
- Notas deletadas movem para `.trash/` no vault (oculta)
- Registro em hai.json: `{ path, deletedAt, originalPath }`
- Período de retenção configurável: 7, 30, 90 dias ou nunca (default 30)
- Seção "Lixeira" na sidebar (colapsada por padrão)
- Restaurar nota: move de volta para localização original
- Esvaziar lixeira: remove arquivos permanentemente + limpa hai.json
- Auto-purge: job diário remove entradas com deletedAt > período de retenção

### SYNC2-05 — Commit Messages
- Formato padrão: `hai: sync YYYY-MM-DD HH:mm`
- Mensagem customizada: campo opcional no sync panel
- Auto-commit antes de push (todas as mudanças desde último commit)

### SYNC2-06 — Conflict Resolution
- Manter UI atual (modal escolha: local vs remoto por arquivo)
- Adicionar opção: "Abrir diff" para comparar antes de escolher
- Conflitos no hai.json: merge automático (union de notebooks/tags)

### SYNC2-07 — hai.json no Sync
- Incluído automaticamente em todos os commits
- Tratado especialmente: conflito resolvido por merge (não replace)
- Excluído do diff visual de notas

## Out of Scope

- Sync com GitLab / Bitbucket
- Branching / múltiplas branches
- Realtime sync (WebSockets)
- Sync parcial (selecionar arquivos)

## Acceptance Criteria

1. WHEN intervalo configurado para 15min THEN sync automático acontece a cada 15min sem intervenção
2. WHEN usuário abre histórico de uma nota THEN vê commits com diff visual
3. WHEN nota é deletada THEN vai para lixeira (não some permanentemente)
4. WHEN nota na lixeira THEN pode ser restaurada com um clique
5. WHEN sync automático falha THEN notificação aparece na statusbar com erro

## Status: PENDING — M5
