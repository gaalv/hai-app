# Vault Setup Specification

## Problem Statement

O app precisa saber onde ficam as notas do usuário. O vault é a pasta raiz que contém todos os arquivos `.md`. Sem essa configuração, nenhuma outra feature funciona — é o ponto de entrada obrigatório do app.

## Goals

- [ ] Usuário consegue apontar uma pasta local como vault em menos de 30 segundos
- [ ] Configuração persiste entre sessões sem precisar reconfigurar
- [ ] App abre direto no vault na próxima inicialização

## Out of Scope

| Feature | Reason |
|---|---|
| Múltiplos vaults simultâneos | V1 foca em simplicidade, um vault por vez |
| Criação de estrutura de pastas pré-definida | Usuário tem controle total da organização |
| Sync automático ao abrir | Feature da GitHub Sync, não do Vault Setup |
| Migração de dados de outros apps (Obsidian, Notion) | V2+ |

---

## User Stories

### P1: Selecionar pasta como vault ⭐ MVP

**User Story**: Como usuário, quero selecionar uma pasta local como meu vault para que o app saiba onde criar e ler minhas notas.

**Why P1**: Sem vault configurado o app não tem função. É o pré-requisito de tudo.

**Acceptance Criteria**:

1. WHEN o app abre pela primeira vez THEN sistema SHALL exibir tela de onboarding para configurar vault
2. WHEN usuário clica em "Selecionar pasta" THEN sistema SHALL abrir dialog nativo do SO para escolher diretório
3. WHEN usuário confirma uma pasta THEN sistema SHALL salvar o caminho localmente e redirecionar para a interface principal
4. WHEN usuário seleciona pasta sem permissão de leitura/escrita THEN sistema SHALL exibir erro claro e manter dialog aberto

**Independent Test**: Abrir o app sem vault configurado → ver tela de onboarding → selecionar uma pasta → ver a interface principal carregada com os arquivos da pasta.

---

### P1: Persistir vault entre sessões ⭐ MVP

**User Story**: Como usuário, quero que o app lembre do meu vault para que eu não precise configurar toda vez que abrir.

**Why P1**: Sem persistência o app é inutilizável no dia a dia.

**Acceptance Criteria**:

1. WHEN usuário fecha e reabre o app THEN sistema SHALL carregar o último vault configurado automaticamente
2. WHEN vault configurado não existe mais no filesystem THEN sistema SHALL exibir erro e levar para tela de onboarding
3. WHEN app abre com vault válido THEN sistema SHALL ir direto para interface principal, sem tela de onboarding

**Independent Test**: Configurar vault → fechar app → reabrir → vault carregado automaticamente sem interação.

---

### P2: Criar nova pasta como vault

**User Story**: Como usuário, quero criar uma pasta nova direto pelo app para que eu não precise sair para criar no Finder/Explorer.

**Why P2**: Conveniente mas o usuário pode criar a pasta manualmente antes. Não bloqueia MVP.

**Acceptance Criteria**:

1. WHEN usuário clica em "Criar novo vault" THEN sistema SHALL abrir dialog para escolher localização e nome da pasta
2. WHEN usuário confirma THEN sistema SHALL criar a pasta e configurá-la como vault

**Independent Test**: Usar "Criar novo vault" → pasta criada → app abre com vault vazio funcional.

---

### P2: Trocar de vault

**User Story**: Como usuário, quero poder trocar o vault ativo para que eu consiga reorganizar minhas notas em diferentes contextos.

**Why P2**: Útil mas não crítico para MVP de uso pessoal.

**Acceptance Criteria**:

1. WHEN usuário acessa Configurações > Vault THEN sistema SHALL exibir caminho atual e opção de trocar
2. WHEN usuário confirma troca THEN sistema SHALL recarregar app com novo vault

**Independent Test**: Ter vault A configurado → trocar para vault B → ver arquivos de B na sidebar.

---

## Edge Cases

- WHEN pasta selecionada está em volume externo (HD, pendrive) THEN sistema SHALL avisar que o vault pode ficar indisponível se o volume for removido
- WHEN pasta selecionada é a raiz de um drive (ex: `/` ou `C:\`) THEN sistema SHALL bloquear e exibir aviso
- WHEN vault contém milhares de arquivos THEN sistema SHALL carregar sidebar de forma lazy, sem travar a UI

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| VAULT-01 | P1: Selecionar pasta | Design | Pending |
| VAULT-02 | P1: Persistir vault | Design | Pending |
| VAULT-03 | P2: Criar nova pasta | - | Pending |
| VAULT-04 | P2: Trocar de vault | - | Pending |

---

## Success Criteria

- [ ] Usuário configura vault em menos de 30 segundos no primeiro uso
- [ ] App abre no vault correto em 100% das sessões após configuração
- [ ] Zero perda de configuração após fechar/reabrir
