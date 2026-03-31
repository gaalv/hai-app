# Export & Import Tasks

**Design**: `.specs/features/export-import/design.md`
**Status**: Draft

> Tasks T102–T118. Depende de Data Model (T66–T82) e Auth OAuth (T41–T54) para export via Gist.

---

## Execution Plan

```
Phase 1 — Dependências (Sequential):
  T102

Phase 2 — Export IPC Handlers (Parallel após T102):
       ┌→ T103 [P] (PDF)
  T102 ┼→ T104 [P] (HTML)
       └→ T105 [P] (.md puro + Gist)

Phase 3 — Import IPC Handlers (Parallel após T102):
       ┌→ T106 [P] (.md avulso)
  T102 ┼→ T107 [P] (pasta)
       ├→ T108 [P] (Obsidian)
       └→ T109 [P] (Notion ZIP)

Phase 4 — Registrar + Expor (Sequential após Phase 2 + Phase 3):
  T103+T104+T105+T106+T107+T108+T109 → T110 → T111

Phase 5 — Renderer Services (Parallel após T111):
       ┌→ T112 [P] (exportService)
  T111 ┤
       └→ T113 [P] (importService)

Phase 6 — UI (Parallel após T112+T113):
       ┌→ T114 [P] (ExportMenu)
  T113 ┼→ T115 [P] (ImportDialog)
       └→ T116 [P] (GistShareButton)

Phase 7 — Integração:
  T114+T115+T116 → T117 → T118
```

---

## Task Breakdown

### T102: Instalar dependências de export/import

**What**: Instalar `adm-zip` para extração de ZIPs do Notion e `marked` para renderização HTML no export
**Where**: `package.json`
**Depends on**: —
**Requirement**: EXP-01, EXP-02, EXP-07

**Done quando**:
- [ ] `adm-zip` instalado; `@types/adm-zip` disponível
- [ ] `marked` instalado (verificar se já presente — pode estar como dep do react-markdown)
- [ ] `npm run dev` sem erros de import

**Verify**: `import AdmZip from 'adm-zip'` e `import { marked } from 'marked'` no main process sem erros

**Commit**: `chore(export-import): install adm-zip and marked dependencies`

---

### T103: Criar `export.ipc.ts` — handler `export:pdf` [P]

**What**: Renderizar nota como HTML e usar `webContents.printToPDF()` para gerar PDF
**Where**: `electron/ipc/export.ipc.ts`
**Depends on**: T102
**Requirement**: EXP-01

**Done quando**:
- [ ] Lê arquivo `.md` com `fs.readFile`
- [ ] Remove frontmatter com `gray-matter`
- [ ] Renderiza markdown para HTML com `marked`
- [ ] Cria `BrowserWindow` oculta, carrega HTML via `loadURL('data:text/html,...')`
- [ ] Chama `printToPDF({ marginsType: 1, printBackground: true, pageSize: 'A4' })`
- [ ] Destrói janela oculta após gerar PDF
- [ ] `dialog.showSaveDialog` com `defaultPath` = nome da nota + `.pdf`
- [ ] Escreve buffer com `fs.writeFile`
- [ ] Retorna `{ success: true }` ou erro descritivo

**Verify**: Exportar nota → dialog abre → PDF salvo com conteúdo formatado da nota

**Commit**: `feat(export): implement export:pdf IPC handler`

---

### T104: Criar `export.ipc.ts` — handler `export:html` [P]

**What**: Renderizar markdown para HTML standalone com CSS embutido
**Where**: `electron/ipc/export.ipc.ts` (adicionar)
**Depends on**: T102
**Requirement**: EXP-02

**Done quando**:
- [ ] Lê `.md` e remove frontmatter com gray-matter (se `stripFrontmatter = true`)
- [ ] Renderiza com `marked` + CSS de impressão embutido via template HTML
- [ ] HTML gerado é standalone: funciona ao abrir no browser sem servidor
- [ ] `dialog.showSaveDialog` com `.html` como extensão
- [ ] Escreve arquivo HTML completo

**Verify**: Exportar nota como HTML → abrir no browser → conteúdo legível com estilos aplicados

**Commit**: `feat(export): implement export:html IPC handler`

---

### T105: Criar `export.ipc.ts` — handlers `export:md` e `export:gist` [P]

**What**: Export .md puro (com/sem frontmatter) e compartilhamento via GitHub Gist
**Where**: `electron/ipc/export.ipc.ts` (adicionar)
**Depends on**: T102, T43 (token OAuth disponível)
**Requirement**: EXP-03, EXP-08

**Done quando**:
- [ ] `export:md(notePath, stripFrontmatter?)`:
  - Lê arquivo `.md`
  - Se `stripFrontmatter`: remove bloco YAML com gray-matter
  - `dialog.showSaveDialog` + `fs.writeFile`
- [ ] `export:gist(notePath)`:
  - Lê conteúdo da nota
  - `keytar.getPassword('hai', 'github-token')` → cria Gist via `octokit.gists.create`
  - Salva `gistUrl` e `gistId` no frontmatter da nota
  - Retorna `{ url: string }`
- [ ] `export:update-gist(notePath)`:
  - Lê `gistId` do frontmatter
  - `octokit.gists.update` com conteúdo atual

**Verify**:
- Export .md sem frontmatter → arquivo não tem bloco YAML
- Compartilhar como Gist → URL retornada e acessível publicamente no GitHub

**Commit**: `feat(export): implement export:md and export:gist IPC handlers`

---

### T106: Criar `import.ipc.ts` — handler `import:md-file` [P]

**What**: Importar um arquivo .md avulso para o vault
**Where**: `electron/ipc/import.ipc.ts`
**Depends on**: T68 (manifest load/save)
**Requirement**: EXP-04

**Done quando**:
- [ ] `dialog.showOpenDialog({ filters: [{ name: 'Markdown', extensions: ['md'] }], properties: ['openFile', 'multiSelections'] })`
- [ ] Para cada arquivo selecionado:
  - Verifica se já existe no destino → adiciona sufixo `-1`, `-2` se conflito
  - Copia para notebook ativo (lido do store) ou `inbox/` se nenhum ativo
  - Se arquivo não tem frontmatter: injeta mínimo (title, created, updated)
- [ ] Retorna `ImportResult { imported, skipped, errors }`

**Verify**: Arrastar/selecionar .md externo → arquivo copiado para inbox → aparece na sidebar

**Commit**: `feat(import): implement import:md-file IPC handler`

---

### T107: Criar `import.ipc.ts` — handler `import:folder` [P]

**What**: Importar pasta de arquivos .md preservando estrutura como notebooks
**Where**: `electron/ipc/import.ipc.ts` (adicionar)
**Depends on**: T68, T69 (notebooks CRUD)
**Requirement**: EXP-05

**Done quando**:
- [ ] `dialog.showOpenDialog({ properties: ['openDirectory'] })`
- [ ] Percorre recursivamente a pasta selecionada
- [ ] Cada subpasta → cria notebook correspondente no hai.json (via `notebooks:create`)
- [ ] Copia todos os `.md` mantendo hierarquia de subpastas
- [ ] Ignora arquivos não-.md (imagens, etc. são copiados mas não indexados)
- [ ] Retorna `ImportResult` com contagens

**Verify**: Importar pasta com 3 subpastas e 10 notas → 3 notebooks criados, 10 notas copiadas

**Commit**: `feat(import): implement import:folder IPC handler`

---

### T108: Criar `import.ipc.ts` — handler `import:obsidian` [P]

**What**: Importar vault do Obsidian com conversão de wikilinks e extração de hashtags
**Where**: `electron/ipc/import.ipc.ts` (adicionar)
**Depends on**: T68, T69
**Requirement**: EXP-06

**Done quando**:
- [ ] `dialog.showOpenDialog({ properties: ['openDirectory'] })` — usuário seleciona raiz do vault Obsidian
- [ ] Valida presença de `.obsidian/` para confirmar que é vault Obsidian (aviso se não encontrado, mas não bloqueia)
- [ ] Copia estrutura de pastas → notebooks
- [ ] Para cada `.md`: processa com `convertWikilinks()` e `extractHashtags()`
- [ ] Hashtags extraídas do corpo são adicionadas ao frontmatter `tags:`
- [ ] Tags do frontmatter Obsidian (formato `tags: [tag1, tag2]`) mantidas
- [ ] Wikilinks convertidos: `[[Nota]]` → `[Nota](nota.md)`, `[[Nota|Alias]]` → `[Alias](nota.md)`
- [ ] Retorna `ImportResult`

**Verify**: Importar vault Obsidian com wikilinks → notas importadas com links relativos válidos

**Commit**: `feat(import): implement import:obsidian handler with wikilink conversion`

---

### T109: Criar `import.ipc.ts` — handler `import:notion-zip` [P]

**What**: Extrair e processar export ZIP do Notion
**Where**: `electron/ipc/import.ipc.ts` (adicionar)
**Depends on**: T102 (`adm-zip`), T68, T69
**Requirement**: EXP-07

**Done quando**:
- [ ] `dialog.showOpenDialog({ filters: [{ name: 'ZIP', extensions: ['zip'] }] })`
- [ ] Extrai ZIP para diretório temporário com `adm-zip`
- [ ] Detecta estrutura Notion: arquivos com padrão `Nome XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.md`
- [ ] Strip de IDs Notion dos nomes: remove ` [A-F0-9]{32}` com regex
- [ ] Mapeia subpastas para notebooks
- [ ] Para cada `.md`: lê com gray-matter, remove metadata Notion do frontmatter (campos como `Created`, `Last Edited` no formato Notion)
- [ ] Converte campos de Database Notion → frontmatter YAML limpo
- [ ] Ignora `.csv` (databases exportados)
- [ ] Limpa diretório temporário após import
- [ ] Retorna `ImportResult`

**Verify**: Importar ZIP de export Notion → notas importadas com nomes limpos (sem IDs) e frontmatter legível

**Commit**: `feat(import): implement import:notion-zip handler with ZIP extraction`

---

### T110: Registrar todos os handlers no `main.ts`

**What**: Importar `export.ipc.ts` e `import.ipc.ts` e registrar todos os handlers
**Where**: `electron/main.ts`
**Depends on**: T103, T104, T105, T106, T107, T108, T109
**Requirement**: EXP-01 a EXP-08

**Done quando**:
- [ ] `export:pdf`, `export:html`, `export:md`, `export:gist`, `export:update-gist` registrados
- [ ] `import:md-file`, `import:folder`, `import:obsidian`, `import:notion-zip` registrados
- [ ] Erros não crasham o main process (try/catch em todos handlers)
- [ ] `npm run dev` sem erros

**Verify**: `window.electronAPI.export.pdf(path)` no DevTools → dialog de save aparece

**Commit**: `feat(export-import): register all export and import IPC handlers`

---

### T111: Expor APIs no `preload.ts`

**What**: Adicionar namespaces `export` e `import` ao contextBridge
**Where**: `electron/preload.ts`, `src/types/electron.d.ts`
**Depends on**: T110
**Requirement**: EXP-01 a EXP-08

**Done quando**:
- [ ] Namespace `export`: `pdf(path)`, `html(path, strip?)`, `md(path, strip?)`, `gist(path)`, `updateGist(path)`
- [ ] Namespace `import`: `mdFile()`, `folder()`, `obsidian()`, `notionZip()`
- [ ] Todos retornam tipos corretos (`ImportResult`, etc.)
- [ ] TypeScript sem erros

**Verify**: TypeScript aceita `window.electronAPI.export.pdf('path')` no renderer

**Commit**: `feat(export-import): expose export and import APIs via contextBridge`

---

### T112: Criar `exportService.ts` [P]

**What**: Wrapper IPC para operações de export
**Where**: `src/services/export.ts`
**Depends on**: T111
**Requirement**: EXP-01, EXP-02, EXP-03, EXP-08

**Done quando**:
- [ ] `exportPDF(notePath)`, `exportHTML(notePath, strip?)`, `exportMD(notePath, strip?)` chamam IPC
- [ ] `shareAsGist(notePath)` chama IPC → retorna URL → copia para clipboard via `navigator.clipboard.writeText`
- [ ] `updateGist(notePath)` chama IPC
- [ ] Erros retornam mensagens amigáveis

**Verify**: `exportService.shareAsGist(path)` → URL no clipboard após criar Gist

**Commit**: `feat(export): create export service for renderer`

---

### T113: Criar `importService.ts` [P]

**What**: Wrapper IPC para operações de import com estado de progresso
**Where**: `src/services/import.ts`
**Depends on**: T111
**Requirement**: EXP-04, EXP-05, EXP-06, EXP-07

**Done quando**:
- [ ] `importMDFile()`, `importFolder()`, `importObsidian()`, `importNotion()` chamam IPC
- [ ] Retornam `ImportResult` ao completar
- [ ] Após import bem-sucedido: chama `manifestService.loadManifest()` para atualizar sidebar

**Verify**: `importService.importMDFile()` → arquivo importado → sidebar atualizada

**Commit**: `feat(import): create import service for renderer`

---

### T114: Criar `ExportMenu.tsx` [P]

**What**: Dropdown de opções de export acessível pelo editor
**Where**: `src/components/editor/ExportMenu.tsx`
**Depends on**: T112
**Requirement**: EXP-01, EXP-02, EXP-03

**Done quando**:
- [ ] Dropdown com 3 opções: "Exportar PDF", "Exportar HTML", "Exportar .md puro"
- [ ] Cada opção dispara `exportService.*` com path da nota ativa (`noteStore.activePath`)
- [ ] Loading state durante export (opção desabilitada com spinner)
- [ ] Toast de sucesso: "PDF exportado" / erro inline

**Verify**: Clicar "Exportar PDF" → dialog de save → PDF gerado com conteúdo da nota

**Commit**: `feat(export): create ExportMenu dropdown component`

---

### T115: Criar `ImportDialog.tsx` [P]

**What**: Modal de seleção de fonte de import com feedback de resultado
**Where**: `src/components/import/ImportDialog.tsx`
**Depends on**: T113
**Requirement**: EXP-04, EXP-05, EXP-06, EXP-07

**Done quando**:
- [ ] 4 cards: "Arquivo .md", "Pasta de .md", "Obsidian vault", "Notion export (ZIP)"
- [ ] Click em card dispara `importService.*` correspondente (abre dialog nativo via IPC)
- [ ] Progress spinner durante import
- [ ] Tela de resultado: "N notas importadas, K ignoradas" com lista de erros se houver
- [ ] Botão "Fechar" ou "Importar mais"

**Verify**: Clicar "Arquivo .md" → file dialog → nota importada → resultado exibido

**Commit**: `feat(import): create ImportDialog component with source selection`

---

### T116: Criar `GistShareButton.tsx` [P]

**What**: Botão na toolbar do editor para compartilhar nota como Gist
**Where**: `src/components/editor/GistShareButton.tsx`
**Depends on**: T112
**Requirement**: EXP-08

**Done quando**:
- [ ] Ícone de compartilhar na toolbar do editor
- [ ] Se nota sem Gist: tooltip "Compartilhar como Gist público"
- [ ] Click → `exportService.shareAsGist(path)` → toast "Link copiado: gist.github.com/..."
- [ ] Se nota já tem `gistUrl` no frontmatter: ícone diferente (indica Gist existente)
- [ ] Tooltip exibe URL do Gist existente + opção "Atualizar Gist"
- [ ] Requer modo sync ativo (`isSync` do `useSyncMode`) — oculto em modo local

**Verify**: Click no botão → Gist criado → URL copiada para clipboard; reabrir nota → ícone indica Gist existente

**Commit**: `feat(export): create GistShareButton for sharing notes as GitHub Gist`

---

### T117: Integrar ExportMenu e GistShareButton no editor

**What**: Adicionar componentes de export à toolbar do editor e registrar atalho `Cmd+Shift+E`
**Where**: `src/components/editor/EditorToolbar.tsx` (ou equivalente)
**Depends on**: T114, T116
**Requirement**: EXP-01, EXP-08

**Done quando**:
- [ ] `<ExportMenu>` visível na toolbar do editor (ícone de download ou "Exportar")
- [ ] `<GistShareButton>` na toolbar (apenas em modo sync)
- [ ] `Cmd+Shift+E` abre `ExportMenu` dropdown
- [ ] Nenhum componente visível quando não há nota ativa

**Verify**: Nota aberta → botões de export visíveis na toolbar; Cmd+Shift+E → dropdown abre

**Commit**: `feat(export): integrate ExportMenu and GistShareButton into editor toolbar`

---

### T118: Integrar ImportDialog no menu e sidebar

**What**: Tornar `ImportDialog` acessível via menu Arquivo e botão na sidebar
**Where**: `src/components/layout/Sidebar.tsx` ou menu nativo
**Depends on**: T115
**Requirement**: EXP-04, EXP-05, EXP-06, EXP-07

**Done quando**:
- [ ] Botão "Importar" na sidebar (footer ou header) abre `<ImportDialog>`
- [ ] Menu nativo Arquivo > Importar (se menu nativo existir) abre dialog via IPC
- [ ] Drop de arquivo `.md` na sidebar também dispara `importService.importMDFile()` com o arquivo dropado

**Verify**: Arrastar .md para sidebar → nota importada; clicar "Importar" → ImportDialog abre

**Commit**: `feat(import): integrate ImportDialog into sidebar and file menu`

---

## Parallel Execution Map

```
Phase 1:  T102

Phase 2:  T102 ─┬→ T103 [P] ─┐         (export handlers)
                 ├→ T104 [P] ─┤
                 ├→ T105 [P] ─┤
                 ├→ T106 [P] ─┤→ T110 → T111
                 ├→ T107 [P] ─┤         (import handlers)
                 ├→ T108 [P] ─┤
                 └→ T109 [P] ─┘

Phase 3:  T111 ─┬→ T112 [P] ─┐
                 └→ T113 [P] ─┘

Phase 4:  T112+T113 ─┬→ T114 [P] ─┐
                      ├→ T115 [P] ─┤→ T117 → T118
                      └→ T116 [P] ─┘
```

---

## Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T102: instalar deps | package.json | ✅ |
| T103: export:pdf | 1 handler | ✅ |
| T104: export:html | 1 handler | ✅ |
| T105: export:md + gist | 2 handlers coesos | ✅ |
| T106: import:md-file | 1 handler | ✅ |
| T107: import:folder | 1 handler | ✅ |
| T108: import:obsidian | 1 handler + 2 funções aux | ✅ |
| T109: import:notion-zip | 1 handler | ✅ |
| T110: registrar handlers | 1 arquivo | ✅ |
| T111: expor no preload | 2 namespaces | ✅ |
| T112: exportService | 1 service | ✅ |
| T113: importService | 1 service | ✅ |
| T114: ExportMenu | 1 componente | ✅ |
| T115: ImportDialog | 1 componente | ✅ |
| T116: GistShareButton | 1 componente | ✅ |
| T117: integrar no editor | 2 integrações | ✅ |
| T118: integrar na sidebar | 2 integrações | ✅ |
