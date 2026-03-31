# Local or Sync Mode Specification

## Problem Statement

Nem todo usuário quer sincronizar notas com o GitHub. Alguns querem um app de notas local simples, sem conta, sem OAuth, sem dependências externas. Outros querem sync entre dispositivos e versionamento. A escolha precisa ser feita no onboarding (sem ambiguidade) e pode ser alterada depois nas configurações.

## Goals

- Onboarding define o modo: local ou sync
- Modo local: sem login, sem sync, sem UI de GitHub
- Modo sync: OAuth obrigatório, sync features ativas
- Troca de modo possível nas configurações, com fluxo claro

## Requirements

### LSMODE-01 — Seleção de Modo no Onboarding
- Passo dedicado no onboarding: antes de selecionar vault
- Duas opções com descrição clara:
  - **Local** — "Notas apenas neste dispositivo. Sem conta necessária."
  - **Sync com GitHub** — "Notas versionadas e acessíveis em outros dispositivos."
- Seleção persiste em `appConfig.mode: 'local' | 'sync'` via electron-store
- Modo sync: onboarding continua para tela de login OAuth
- Modo local: onboarding continua direto para seleção de vault

### LSMODE-02 — Persistência do Modo
- `appConfig.mode` armazenado no electron-store (nível app, não no vault)
- Lido no startup antes de renderizar qualquer tela
- Default: se modo não configurado → exibir onboarding

### LSMODE-03 — Modo Local: Comportamento
- Nenhuma UI de sync exibida (status badge, painel, histórico)
- Nenhum prompt de login
- Settings sem seção de sync
- App funciona completamente offline
- `hai.json` ainda criado e usado (organização local permanece)

### LSMODE-04 — Modo Sync: Comportamento
- OAuth obrigatório antes de acessar o vault
- Todos os features de sync disponíveis (status, push/pull, histórico)
- Settings exibe seção "Sync" com repo, intervalo, último sync

### LSMODE-05 — Trocar Modo nas Configurações
- Settings > seção "Modo" com modo atual e botão "Trocar modo"
- Abre modal de confirmação com consequências explicadas:
  - Local → Sync: "Você precisará conectar sua conta GitHub. Suas notas serão enviadas para o repositório configurado."
  - Sync → Local: "O sync será desativado. Suas notas permanecem no dispositivo. O repositório GitHub não será apagado."
- Confirmação salva novo modo e atualiza UI sem reiniciar

### LSMODE-06 — Transição Local → Sync
- Após confirmar troca: exibir tela de login OAuth
- Após autenticar: exibir configuração de repositório (pode ser o mesmo da SyncConfigModal)
- Vault existente não é alterado — notas locais continuam presentes

### LSMODE-07 — Transição Sync → Local
- Token OAuth permanece no keychain (não é apagado — pode re-ativar sync)
- Sync automático (se ativo) é cancelado imediatamente
- Status bar de sync é ocultado
- Dados locais intactos

## Out of Scope

- Dois modos ativos simultaneamente (local + sync em paralelo)
- Sync parcial (algumas notas sync, outras não)
- Escolha de modo por vault (um vault por modo)

## Acceptance Criteria

1. WHEN app abre sem modo configurado THEN onboarding exibe passo de seleção local/sync
2. WHEN usuário escolhe local THEN app abre sem nenhum elemento de sync na UI
3. WHEN usuário escolhe sync THEN app direciona para login OAuth antes do vault
4. WHEN usuário troca local→sync nas settings THEN fluxo de OAuth e configuração de repo é iniciado
5. WHEN usuário troca sync→local nas settings THEN sync para imediatamente e UI de sync desaparece
6. WHEN app reabre com modo salvo THEN modo é respeitado sem exibir onboarding novamente

## Status: PENDING — M4
