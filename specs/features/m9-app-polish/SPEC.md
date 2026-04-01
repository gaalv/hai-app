# M9 — App Polish & Functional Completion

**Goal:** Transformar o app de demo parcial em produto funcional completo.
Conectar painéis mockados, redesenhar title bar, criar tela de perfil,
adicionar painel de calendário na barra lateral direita.

**Status:** In Progress

---

## 1. Title Bar Redesign (VSCode-style)

### Problema
A title bar atual é uma div vazia de 38px que só serve como drag region.
Não tem identidade visual, destoa do resto do app, e desperdiça espaço.

### Design

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔴🟡🟢  ◫  │  🔍 Buscar ou digitar comando... (⌘K)  │  📅 ◫  │
│  traffic   side│           search trigger              │ cal side│
│  lights    bar │          (opens command palette)       │     bar │
│            tog │                                        │     tog │
└──────────────────────────────────────────────────────────────────┘
```

- **Fundo:** `var(--app-rail)` — mesmo tom da Rail, integração visual
- **Altura:** 38px (mantém espaço para traffic lights macOS)
- **Drag region:** toda a barra é draggable, botões são no-drag
- **Esquerda:** espaço para traffic lights (macOS) + botão toggle sidebar
- **Centro:** trigger de busca (clique abre command palette / search)
- **Direita:** botão toggle calendário + botão toggle barra lateral direita

### Componente
`src/renderer/src/components/layout/TitleBar.tsx`

---

## 2. Painéis Funcionais (Conectar Dados Reais)

### 2.1 SearchPanel → searchService
- Input chama `searchService.search(query)` com debounce 300ms
- Resultados de `search.store.results`
- Click abre nota no editor
- Filtros por notebook, tag, data

### 2.2 TagsPanel (layout/) → manifest.store
- Tags do `manifest.store.tags`
- Notas filtradas por tag (via IPC `notes:list-in-notebook` + filter)
- Contagem real, criação funcional

### 2.3 PinsPanel → manifest.store
- Lista de `manifest.store.pinned`
- Carrega frontmatter para preview
- Click abre, botão unpin funcional

---

## 3. Tela de Perfil (ProfileModal)

Modal disparado pelo avatar na Rail.

**Seções:**
- Avatar + nome + login + email (do auth.store)
- Repositório atual + botão alterar
- Versão do app
- Links: Política de Privacidade, Termos de Uso
- Botões: Sair da conta, Sair do app

### IPC novo
- `app:get-version` — retorna version do package.json
- `app:quit` — fecha o app

---

## 4. Calendário (Barra Lateral Direita)

### Schema (frontmatter)
```yaml
dueDate: 2026-04-15  # opcional, ISO date
```

### Design
- Calendário mensal navegável
- Dots em dias com notas agendadas
- Lista de notas no dia selecionado
- Botão "Agendar nota" seta dueDate na nota ativa
- Largura: ~240px, colapsável

### Componente
`src/renderer/src/components/calendar/CalendarPanel.tsx`

---

## 5. Correções
- Fix auto-sync settings (IPC endpoint errado)
- Fix SearchPanel search backend connection

---

## Ordem de Implementação

1. Title Bar
2. Perfil Modal + IPC
3. Calendário + dueDate
4. SearchPanel funcional
5. TagsPanel funcional
6. PinsPanel funcional
7. Fix auto-sync
