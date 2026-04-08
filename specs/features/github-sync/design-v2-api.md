# GitHub Sync — Design v2 (GitHub Contents API)

**Substitui**: `design.md` (abordagem isomorphic-git)
**Status**: Implementado

---

## Motivação

A abordagem anterior usava `isomorphic-git` para manter um repositório git local no vault e sincronizar via push/pull. Isso gerava problemas recorrentes:

- `force: true` no push destruía commits de outros dispositivos
- Merge via `FETCH_HEAD` tinha comportamento inconsistente no isomorphic-git
- Lógica de conflito complexa e frágil
- Impossível de portar para mobile (sem git binário no iOS/Android)

## Nova Abordagem: GitHub Contents API

Em vez de operações git locais, toda sincronização acontece via HTTP através da [GitHub Contents API](https://docs.github.com/en/rest/repos/contents). Não há repositório git local — o vault é apenas uma pasta com arquivos markdown.

```
Vault (pasta local)  ←→  GitHub Contents API  ←→  GitHub Repo
     .md, .json                REST/HTTPS              (arquivos)
```

## Architecture

```
sync.ipc.ts (main process)
  ├── getVaultFiles()      — walk vault, lista .md/.json
  ├── handlePush()         — PUT cada arquivo via API
  ├── handlePull()         — GET tree + arquivos novos/atualizados
  ├── getStatus()          — mtime vs lastSyncAt
  └── resolveConflict()    — escreve versão escolhida, força push

github-api.ts
  ├── uploadFile()         — createOrUpdateFileContents com retry
  ├── downloadFile()       — getContent → base64 decode
  ├── getRepoTree()        — git.getTree recursive
  └── parseRepoUrl()       — extrai owner/repo da URL
```

## Estado no electron-store

```typescript
interface StoreSchema {
  // ...campos existentes...
  fileShas: Record<string, string>  // relativePath → githubSha
  lastSyncAt: string | null         // ISO timestamp do último sync
}
```

### Por que guardar `fileShas`?

A GitHub Contents API **exige** o SHA atual do arquivo para atualizá-lo. Sem o SHA, a API retorna 422. Guardando o SHA após cada operação, evitamos roundtrips extras na maioria dos casos.

### Por que guardar `lastSyncAt`?

Para detecção de "pending changes" sem chamar a API: arquivos com `mtime > lastSyncAt` foram modificados localmente após o último sync.

## Push Flow

```
1. Walk vault → lista de relativePaths
2. Para cada arquivo:
   a. Lê conteúdo local → base64
   b. Busca cachedSha do fileShas
   c. PUT /repos/{owner}/{repo}/contents/{path}
      - com sha se tiver cache
      - sem sha se for arquivo novo
   d. Se 422 (sha mismatch): fetch SHA atual → retry
   e. Salva novo sha no cache
3. store.set('fileShas', updatedShas)
4. store.set('lastSyncAt', now)
```

**Garantia**: push nunca perde dados — se o SHA mudou no GitHub (edição em outro device), o retry busca o SHA atual antes de sobrescrever.

## Pull Flow

```
1. GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1
2. Para cada blob .md/.json:
   a. Compara githubSha com fileShas[path]
   b. Se igual → já em sync, skip
   c. Se diferente:
      - Baixa conteúdo do GitHub
      - Verifica se arquivo local foi modificado após lastSyncAt (mtime check)
      - Se local modificado E conteúdo diferente → CONFLITO
      - Se não → sobrescreve local
3. Se sem conflitos → atualiza fileShas + lastSyncAt
4. Se com conflitos → retorna ConflictFile[] sem tocar no store
```

## Conflict Detection

| GitHub mudou? | Local mudou? | Resultado |
|---|---|---|
| Não | Não | Skip (em sync) |
| Sim | Não | Update local (safe) |
| Não | Sim | Pending push |
| Sim | Sim | **CONFLITO** |

"Local mudou" = `file.mtime > lastSyncAt`

## Resolve Conflict

Usuário escolhe `local` ou `remote` por arquivo no `ConflictModal`.

- `remote`: sobrescreve local com conteúdo do GitHub → atualiza sha no cache
- `local`: faz push do arquivo local → força sobrescrever GitHub → atualiza sha

## Get Status (sem API call)

```typescript
// Conta arquivos com mtime > lastSyncAt
const pendingChanges = files.filter(f => stat(f).mtime > lastSyncAt).length
return pendingChanges > 0 ? 'pending' : 'synced'
```

Muito mais eficiente que `git.statusMatrix` — sem operação git, sem I/O de objetos.

## Arquivos Sincronizados

Walk recursivo no vault, excluindo:
- Arquivos/pastas iniciando com `.` (hidden)
- Extensões fora de `.md`, `.txt`, `.json`

Sem necessidade de `.gitignore`.

## Comparação com abordagem anterior

| | isomorphic-git (v1) | GitHub Contents API (v2) |
|---|---|---|
| Repositório local | Obrigatório | Não existe |
| Push multi-device | `force: true` (destrutivo) | SHA check (seguro) |
| Conflito detection | statusMatrix (frágil) | SHA + mtime (confiável) |
| Status sem API | statusMatrix | mtime check (rápido) |
| Mobile ready | Não (sem git nativo) | **Sim** (HTTP puro) |
| Dependências | isomorphic-git, http/node | @octokit/rest (já instalado) |
| Offline | Vault em sync ignorado | Mesmo comportamento |

## IPC Channels (mantidos para compat com renderer)

```
sync:configure     — validar token + repo, salvar config
sync:push          — upload all vault files to GitHub
sync:pull          — download changed files from GitHub
sync:get-status    — mtime-based pending count
sync:resolve-conflict — apply conflict resolution
```

Channels removidos (eram git-only, não expostos na UI final):
- `sync:get-history` — substituir por GitHub Commits API em v3
- `sync:get-diff` — idem
- `sync:restore-version` — idem
- `sync:set-interval` / `sync:set-auto` / `sync:stop-auto` — auto-sync simplificado
