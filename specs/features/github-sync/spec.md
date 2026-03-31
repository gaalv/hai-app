# GitHub Sync Specification

## Problem Statement

O vault local precisa ser versionado e acessível de outros dispositivos. O GitHub funciona como backend gratuito e confiável, usando git como protocolo de sync. O usuário não deve precisar saber de git para usar — a interface abstrai os detalhes.

## Goals

- [ ] Usuário conecta vault a um repositório GitHub em menos de 2 minutos
- [ ] Push e pull funcionam com um clique, sem terminal
- [ ] Status de sync sempre visível e claro na UI

## Out of Scope

| Feature | Reason |
|---|---|
| OAuth GitHub | V1 usa PAT (Personal Access Token) — mais simples de implementar |
| Sync automático em background | V2 — requer file watcher + lógica de conflito robusta |
| Resolução de conflitos com merge visual | V1 exibe conflito e pede escolha simples (local vs remoto) |
| Suporte a GitLab / Bitbucket | V1 foca em GitHub apenas |
| Histórico de versões na UI | V2 |
| Branching | V1 usa apenas branch main/master |

---

## User Stories

### P1: Conectar vault a repositório GitHub ⭐ MVP

**User Story**: Como usuário, quero conectar meu vault a um repositório GitHub para que minhas notas sejam versionadas e acessíveis de outros lugares.

**Why P1**: Sem isso não há sync — é a configuração base de toda a feature.

**Acceptance Criteria**:

1. WHEN usuário acessa configurações de sync THEN sistema SHALL exibir campo para Personal Access Token e campo para URL do repositório
2. WHEN usuário insere PAT válido THEN sistema SHALL validar o token via GitHub API e exibir confirmação
3. WHEN usuário insere URL de repositório existente THEN sistema SHALL verificar acesso e exibir nome do repo confirmado
4. WHEN repositório não existe THEN sistema SHALL oferecer opção de criá-lo automaticamente via GitHub API
5. WHEN vault ainda não é um repositório git THEN sistema SHALL fazer `git init` e primeiro commit automaticamente
6. WHEN configuração é salva THEN sistema SHALL persistir PAT de forma segura (keychain do SO, não em texto plano)

**Independent Test**: Inserir PAT + URL do repo → ver confirmação de conexão → ver que o vault passou a ser um repositório git.

---

### P1: Push (enviar notas para GitHub) ⭐ MVP

**User Story**: Como usuário, quero enviar minhas notas para o GitHub com um clique para que estejam versionadas e seguras.

**Why P1**: É metade do sync — sem push não há backup.

**Acceptance Criteria**:

1. WHEN usuário clica em "Sincronizar" / "Push" THEN sistema SHALL fazer commit de todas as mudanças locais e push para o repositório remoto
2. WHEN push é bem-sucedido THEN sistema SHALL exibir confirmação com número de arquivos enviados e timestamp
3. WHEN não há mudanças locais THEN sistema SHALL exibir "Nada para enviar — vault em dia"
4. WHEN push falha (sem internet, token expirado) THEN sistema SHALL exibir erro claro com causa e sugestão de ação
5. WHEN push está em progresso THEN sistema SHALL exibir indicador de loading e bloquear push duplicado

**Independent Test**: Criar/editar nota → clicar em Push → ver nota aparecer no GitHub com commit.

---

### P1: Pull (receber notas do GitHub) ⭐ MVP

**User Story**: Como usuário, quero puxar notas do GitHub para meu dispositivo para que tenha a versão mais recente do vault.

**Why P1**: É a outra metade do sync — necessário para usar em múltiplos dispositivos.

**Acceptance Criteria**:

1. WHEN usuário clica em "Pull" THEN sistema SHALL fazer fetch + merge das mudanças remotas
2. WHEN pull é bem-sucedido THEN sistema SHALL atualizar sidebar e editor com conteúdo novo
3. WHEN não há mudanças remotas THEN sistema SHALL exibir "Vault já está atualizado"
4. WHEN pull falha (sem internet) THEN sistema SHALL exibir erro com causa
5. WHEN há conflito entre versão local e remota THEN sistema SHALL exibir modal com opções: "Manter local", "Usar remoto" ou "Cancelar"

**Independent Test**: Fazer mudança no GitHub direto → clicar em Pull no app → ver mudança refletida no editor e no filesystem.

---

### P1: Status de sync visível ⭐ MVP

**User Story**: Como usuário, quero ver o status do sync na interface para saber se meu vault está em dia com o GitHub.

**Why P1**: Sem feedback visual o usuário não sabe se o sync funcionou ou se há algo pendente.

**Acceptance Criteria**:

1. WHEN vault está em dia com remoto THEN sistema SHALL exibir ícone/badge verde "Sincronizado"
2. WHEN há mudanças locais não enviadas THEN sistema SHALL exibir badge com número de arquivos modificados
3. WHEN sync não está configurado THEN sistema SHALL exibir "Sync não configurado" com link para configurar
4. WHEN última sincronização falhou THEN sistema SHALL exibir ícone de erro com timestamp da última falha

**Independent Test**: Ver estado do badge em 4 cenários: sem configuração, com mudanças pendentes, sincronizado, e após erro.

---

### P2: Criar repositório automaticamente

**User Story**: Como usuário, quero criar um repositório GitHub novo direto pelo app para não precisar sair para o browser.

**Why P2**: Conveniente mas usuário pode criar o repo manualmente no GitHub antes de configurar.

**Acceptance Criteria**:

1. WHEN usuário escolhe "Criar novo repositório" THEN sistema SHALL exibir campos: nome do repo, privado/público
2. WHEN usuário confirma THEN sistema SHALL criar repo via GitHub API e conectar automaticamente

**Independent Test**: Criar repo pelo app → repo aparece no GitHub → vault conectado.

---

### P3: Histórico de commits na UI

**User Story**: Como usuário, quero ver os commits anteriores para rastrear quando e o que mudei nas notas.

**Why P3**: Útil mas não crítico — o usuário pode ver no GitHub diretamente.

**Acceptance Criteria**:

1. WHEN usuário abre histórico THEN sistema SHALL listar commits com mensagem, data e arquivos alterados
2. WHEN usuário clica em commit THEN sistema SHALL exibir diff das mudanças

---

## Edge Cases

- WHEN vault tem arquivos binários (imagens, PDFs) THEN sistema SHALL incluí-los no commit normalmente
- WHEN repositório remoto tem histórico divergente (force push por outro device) THEN sistema SHALL alertar e oferecer opção de reset local
- WHEN PAT expira THEN sistema SHALL detectar erro 401 e pedir novo token, sem perder dados locais
- WHEN internet cai durante push THEN sistema SHALL fazer rollback do commit parcial e informar o usuário
- WHEN vault tem `.gitignore` existente THEN sistema SHALL respeitá-lo sem sobrescrever

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| SYNC-01 | P1: Conectar repositório | Design | Pending |
| SYNC-02 | P1: Push | Design | Pending |
| SYNC-03 | P1: Pull | Design | Pending |
| SYNC-04 | P1: Status visível | Design | Pending |
| SYNC-05 | P2: Criar repositório | - | Pending |
| SYNC-06 | P3: Histórico de commits | - | Pending |

---

## Success Criteria

- [ ] Configuração de sync completa em menos de 2 minutos
- [ ] Push e pull executam sem erros em conexão normal
- [ ] PAT armazenado no keychain do SO (nunca em texto plano)
- [ ] Status de sync correto em 100% dos estados (sincronizado, pendente, erro, não configurado)
- [ ] Conflito nunca resulta em perda silenciosa de dados
