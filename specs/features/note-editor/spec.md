# Note Editor Specification

## Problem Statement

O núcleo do app é criar e editar notas em markdown. O editor precisa ser funcional, fluido e não ficar no caminho do usuário — foco total na escrita, com preview quando necessário.

## Goals

- [ ] Usuário consegue criar e editar uma nota em markdown sem fricção
- [ ] Arquivos salvos no filesystem imediatamente (sem "salvar manualmente")
- [ ] Navegação entre notas via sidebar rápida e intuitiva

## Out of Scope

| Feature | Reason |
|---|---|
| Wikilinks `[[note]]` | M2+ — requer resolução de links entre arquivos |
| Graph view | M3 |
| Imagens inline no editor | M2 |
| Temas do editor | M2 |
| Vim/Emacs keybindings | M2 |
| Busca full-text | M3 |
| Spell check | M2 |

---

## User Stories

### P1: Criar nota ⭐ MVP

**User Story**: Como usuário, quero criar uma nova nota para que eu possa começar a escrever imediatamente.

**Why P1**: Criar nota é a ação mais fundamental do app.

**Acceptance Criteria**:

1. WHEN usuário clica em "Nova nota" (ou atalho `Cmd/Ctrl+N`) THEN sistema SHALL criar arquivo `.md` no vault e abri-lo no editor
2. WHEN nota é criada THEN sistema SHALL posicionar cursor no título (primeira linha `# `) pronto para digitar
3. WHEN usuário define o nome da nota THEN sistema SHALL usar esse nome como nome do arquivo (sanitizado para filesystem)
4. WHEN nome não é definido THEN sistema SHALL usar "Sem título" + timestamp como fallback

**Independent Test**: Clicar em "Nova nota" → editor abre com foco no título → digitar → arquivo `.md` aparece na sidebar e no filesystem.

---

### P1: Editar nota com autosave ⭐ MVP

**User Story**: Como usuário, quero que minhas notas sejam salvas automaticamente para que eu nunca perca conteúdo por esquecer de salvar.

**Why P1**: Autosave é expectativa básica de qualidade — sem isso o app é inseguro para uso real.

**Acceptance Criteria**:

1. WHEN usuário para de digitar por 500ms THEN sistema SHALL salvar o arquivo automaticamente
2. WHEN arquivo é salvo THEN sistema SHALL exibir indicador sutil de "Salvo" na UI
3. WHEN há mudanças não salvas THEN sistema SHALL exibir indicador de "não salvo" (ex: ponto no título da aba)
4. WHEN usuário fecha a nota com mudanças pendentes THEN sistema SHALL salvar antes de fechar

**Independent Test**: Editar nota → parar de digitar → verificar no Finder/Explorer que o arquivo foi atualizado sem nenhuma ação manual.

---

### P1: Sidebar com lista de notas ⭐ MVP

**User Story**: Como usuário, quero ver todas as minhas notas na sidebar para que eu possa navegar entre elas rapidamente.

**Why P1**: Sem navegação o app não tem usabilidade — o usuário ficaria cego ao conteúdo do vault.

**Acceptance Criteria**:

1. WHEN vault está carregado THEN sistema SHALL exibir sidebar com todos os arquivos `.md` do vault
2. WHEN vault tem subpastas THEN sistema SHALL exibir árvore de diretórios expansível/colapsável
3. WHEN usuário clica em um arquivo na sidebar THEN sistema SHALL abrir a nota no editor
4. WHEN nota é criada ou deletada THEN sistema SHALL atualizar sidebar automaticamente (file watcher)
5. WHEN sidebar tem muitos arquivos THEN sistema SHALL ser scrollável sem perda de performance

**Independent Test**: Ter múltiplas notas no vault → ver todas na sidebar → clicar em cada uma → cada uma abre no editor.

---

### P1: Preview de markdown ⭐ MVP

**User Story**: Como usuário, quero visualizar o markdown renderizado para que eu possa conferir a formatação do conteúdo.

**Why P1**: Editor sem preview é markdown cego — essencial para verificar o output.

**Acceptance Criteria**:

1. WHEN usuário ativa o preview (botão ou `Cmd/Ctrl+P`) THEN sistema SHALL exibir preview renderizado do markdown atual
2. WHEN preview está ativo THEN sistema SHALL suportar modo split (editor + preview lado a lado) e modo toggle (um de cada vez)
3. WHEN usuário edita no modo split THEN preview SHALL atualizar em tempo real
4. WHEN markdown contém heading, bold, italic, listas, código e links THEN preview SHALL renderizá-los corretamente

**Independent Test**: Escrever markdown com vários elementos → ativar preview split → ver todos renderizados corretamente em tempo real.

---

### P2: Deletar nota

**User Story**: Como usuário, quero deletar notas que não preciso mais para manter o vault organizado.

**Why P2**: Necessário mas não bloqueia uso básico. Usuário pode deletar pelo Finder em V1.

**Acceptance Criteria**:

1. WHEN usuário clica com botão direito em nota na sidebar THEN sistema SHALL exibir menu com opção "Deletar"
2. WHEN usuário confirma deleção THEN sistema SHALL mover arquivo para lixeira do SO (não deleção permanente)
3. WHEN nota deletada está aberta no editor THEN sistema SHALL fechar o editor e limpar o estado

**Independent Test**: Deletar nota → arquivo vai para lixeira → sidebar atualiza → editor fecha se estava aberto.

---

### P2: Renomear nota

**User Story**: Como usuário, quero renomear uma nota para corrigir nomes ou reorganizar o vault.

**Why P2**: Conveniente mas usuário pode renomear pelo Finder em V1.

**Acceptance Criteria**:

1. WHEN usuário clica duas vezes no nome da nota na sidebar THEN sistema SHALL ativar modo de edição inline do nome
2. WHEN usuário confirma novo nome THEN sistema SHALL renomear o arquivo no filesystem
3. WHEN novo nome tem caracteres inválidos para o SO THEN sistema SHALL sanitizar ou exibir aviso

**Independent Test**: Renomear nota via sidebar → arquivo renomeado no filesystem → sidebar reflete novo nome.

---

### P3: Syntax highlighting no editor

**User Story**: Como usuário, quero syntax highlighting no editor para que a leitura do markdown cru seja mais fácil.

**Why P3**: Melhora experiência mas editor funciona sem isso.

**Acceptance Criteria**:

1. WHEN usuário edita markdown THEN sistema SHALL destacar headings, bold, italic, links e blocos de código com cores distintas

---

## Edge Cases

- WHEN usuário abre nota com caracteres especiais no nome do arquivo THEN sistema SHALL exibir corretamente sem erros
- WHEN arquivo `.md` é modificado externamente (outro editor) THEN sistema SHALL detectar mudança e recarregar com aviso
- WHEN nota está vazia THEN sistema SHALL exibir placeholder "Comece a escrever..."
- WHEN vault fica inacessível durante edição (ex: HD externo desconectado) THEN sistema SHALL exibir erro e manter conteúdo em memória

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| EDITOR-01 | P1: Criar nota | Design | Pending |
| EDITOR-02 | P1: Autosave | Design | Pending |
| EDITOR-03 | P1: Sidebar | Design | Pending |
| EDITOR-04 | P1: Preview markdown | Design | Pending |
| EDITOR-05 | P2: Deletar nota | - | Pending |
| EDITOR-06 | P2: Renomear nota | - | Pending |
| EDITOR-07 | P3: Syntax highlighting | - | Pending |

---

## Success Criteria

- [ ] Nota criada e editável em menos de 2 cliques a partir da interface principal
- [ ] Autosave funciona em 100% das edições sem ação manual
- [ ] Preview renderiza os 6 elementos básicos de markdown corretamente
- [ ] Sidebar reflete estado real do filesystem sem precisar recarregar o app
