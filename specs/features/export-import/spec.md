# Export & Import Specification

## Problem Statement

Notas precisam entrar e sair do app. Export para PDF/HTML para compartilhar; import de outros apps (Obsidian, Notion) para migrar; link público para compartilhar sem conta.

## Goals

- Export de nota em PDF, HTML e .md puro
- Import de arquivos .md avulsos ou pastas
- Import estruturado de Notion e Obsidian
- Link público via GitHub Gist (zero infraestrutura)

## Requirements

### EXP-01 — Export PDF
- `Cmd+Shift+E` ou menu Arquivo > Exportar
- Usar `webContents.printToPDF()` do Electron
- Aplicar CSS de impressão: fonte serif, tamanho legível, quebras de página sensatas
- Salvar com dialog nativo de save

### EXP-02 — Export HTML
- Renderizar markdown para HTML com react-markdown
- Incluir CSS inline (standalone, sem dependências externas)
- Abrir dialog de save

### EXP-03 — Export .md puro
- Exportar o arquivo .md sem frontmatter (opcional: toggle)
- Útil para compartilhar markdown limpo

### EXP-04 — Import .md
- Arrastar .md para sidebar ou Arquivo > Importar
- Copiar arquivo para notebook selecionado (ou inbox se nenhum)
- Não sobrescrever se já existe: renomear com sufixo

### EXP-05 — Import pasta de .md
- Selecionar pasta com dialog nativo
- Copiar estrutura de subpastas como notebooks
- Criar entradas no hai.json para cada notebook importado

### EXP-06 — Import Obsidian
- Selecionar vault do Obsidian (.obsidian/ detectado automaticamente)
- Migrar notas .md (manter frontmatter existente)
- Converter wikilinks `[[nota]]` para links relativos `[nota](nota.md)`
- Importar tags de `#tag` inline e frontmatter

### EXP-07 — Import Notion
- Aceitar export ZIP do Notion (formato markdown)
- Extrair e processar estrutura de subpáginas
- Converter metadata do Notion (Database properties) para frontmatter

### EXP-08 — Link Público via GitHub Gist
- Menu contextual na nota: "Compartilhar como Gist"
- Criar Gist público via GitHub API com conteúdo da nota
- Copiar URL do Gist para clipboard
- Badge na nota indicando "Gist público: [url]" armazenado no frontmatter
- Opção de atualizar Gist existente (edit) ou criar novo

## Out of Scope

- Export de vault inteiro como ZIP (v2)
- Sincronização bidirecional com Notion/Obsidian
- Import de Evernote, Bear, etc. (v2)

## Acceptance Criteria

1. WHEN usuário exporta nota para PDF THEN arquivo salvo com formatação legível
2. WHEN usuário importa pasta .md THEN notas aparecem na sidebar organizadas
3. WHEN usuário compartilha como Gist THEN URL copiada e nota acessível publicamente
4. WHEN usuário importa vault do Obsidian THEN notas e estrutura migradas sem perda

## Status: PENDING — M8
