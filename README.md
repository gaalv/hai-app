# Hai

> *Hai* — escrever, em Tupi Guarani.

App desktop pessoal para anotações em Markdown com sincronização via GitHub. Inspirado no Obsidian: seus arquivos ficam no seu computador, num repositório seu, sem serviços proprietários no meio.

---

## O que é

- Escreva notas em Markdown com um editor moderno (CodeMirror 6)
- Organize em pastas dentro de um *vault* — uma pasta local qualquer
- Visualize o resultado renderizado em split view ou preview
- Sincronize tudo com um repositório GitHub via push/pull com um clique
- Seu PAT do GitHub fica armazenado no keychain do sistema operacional, nunca em texto plano

## Stack

- **Electron** + React 18 + Vite + TypeScript
- **CodeMirror 6** — editor com syntax highlighting de Markdown
- **isomorphic-git** — operações git em JS puro, sem depender do git instalado
- **keytar** — armazenamento seguro de credenciais no keychain do SO
- **Zustand** — gerenciamento de estado

---

## Como usar

### 1. Configurar o vault

Na primeira abertura, o app pede para selecionar uma pasta como vault. Pode ser uma pasta existente com arquivos `.md` ou uma nova pasta vazia.

### 2. Criar e editar notas

- Clique em **+** na sidebar para criar uma nova nota
- O conteúdo é salvo automaticamente (autosave a cada 500ms após parar de digitar)
- Alterne entre **Editar**, **Split** e **Preview** na toolbar do editor
- Clique com o botão direito em uma nota na sidebar para renomear ou deletar

### 3. Sincronizar com GitHub

1. Crie um repositório no GitHub (pode ser privado)
2. Gere um Personal Access Token com permissão `repo` em:
   GitHub → Settings → Developer settings → Personal access tokens
3. Clique no badge de sync no canto superior direito
4. Clique em **Configurar sync**, insira o token e a URL do repositório
5. Use **Push** para enviar suas notas e **Pull** para receber atualizações

> O app inicializa o repositório git no vault automaticamente no primeiro push.

---

## Rodando localmente

### Pré-requisitos

- Node.js 18+
- npm 9+
- macOS, Windows ou Linux

### Instalação

```bash
git clone https://github.com/gaalv/hai
cd hai
npm install
```

> No macOS, `keytar` pode pedir permissão para acessar o keychain na primeira execução. Isso é esperado — é onde o token do GitHub é armazenado com segurança.

### Desenvolvimento

```bash
npm run dev
```

Abre o app com hot reload no renderer.

### Build para distribuição

```bash
# macOS (dmg universal: x64 + arm64)
npm run build:mac

# Windows (instalador NSIS)
npm run build:win

# Linux (AppImage)
npm run build:linux
```

O binário gerado fica em `dist/`.

### Outros comandos

```bash
npm run typecheck   # verificar tipos TypeScript
npm run lint        # lint
npm run format      # formatar com prettier
```

---

## Estrutura do projeto

```
src/
├── main/               # Electron main process
│   ├── ipc/            # Handlers IPC: vault, notes, sync
│   ├── store.ts        # Persistência de config (electron-store)
│   └── keychain.ts     # Wrapper keytar para o keychain do SO
├── preload/            # contextBridge — ponte main ↔ renderer
└── renderer/src/
    ├── components/     # UI: AppShell, FileTree, EditorPane, Sync*
    ├── stores/         # Estado global (Zustand): vault, editor, fileTree, sync
    ├── services/       # Chamadas IPC: vault, notes, sync
    └── types/          # Interfaces TypeScript compartilhadas
```

---

## Roadmap

- [x] Vault local configurável
- [x] Editor Markdown com autosave
- [x] Preview Markdown (split / toggle)
- [x] Sincronização com GitHub (push/pull)
- [ ] Busca full-text nas notas
- [ ] Graph view (links entre notas)
- [ ] Wikilinks `[[nota]]`
- [ ] Versão web
- [ ] Mobile (iOS/Android)
