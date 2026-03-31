# Auth OAuth Specification

## Problem Statement

A autenticação atual usa Personal Access Token — requer que o usuário crie manualmente um token no GitHub, entenda escopos e saiba onde colá-lo. GitHub OAuth oferece experiência nativa de login ("Entrar com GitHub") sem fricção.

## Goals

- Login com um clique via GitHub OAuth (sem PAT manual)
- Perfil do usuário (avatar, nome) puxado do GitHub
- Settings centralizadas com configurações do app

## Architecture

OAuth em Electron usa um fluxo diferente de web:
1. App abre URL de autorização no browser externo (`shell.openExternal`)
2. GitHub redireciona para `hai://oauth/callback?code=...` (deep link)
3. Electron registra handler para `hai://` protocol
4. Main process troca `code` por `access_token` via GitHub API
5. Token armazenado no keychain via keytar

Requer: GitHub OAuth App registrada (client_id + client_secret).
Client secret armazenado no keychain (não no código).

## Requirements

### AUTH-01 — Tela de Login
- Tela inicial se não autenticado (antes de onboarding)
- Botão "Entrar com GitHub" com ícone do GitHub
- Texto explicativo minimalista
- Loading state durante auth flow

### AUTH-02 — OAuth Flow
- `shell.openExternal(githubOAuthUrl)` com scopes: `repo`, `read:user`
- Registrar protocol handler `hai://` no Electron
- Main process: receber callback, trocar code por token via fetch
- Armazenar token no keychain via keytar
- Emitir evento IPC para renderer quando auth completo

### AUTH-03 — Perfil do Usuário
- IPC `auth:get-profile` → fetch `GET /user` da GitHub API com token
- Retorna: `{ login, name, avatar_url, email }`
- Cache local no electron-store (refresh ao abrir app)
- Exibir avatar + nome na sidebar (bottom) ou settings

### AUTH-04 — Settings Module
- Tela de settings acessível por `Cmd+,` ou menu
- Seções: Perfil, Editor, Sync, Aparência
- **Editor:** fonte, tamanho, line height, vim mode
- **Sync:** intervalo (5/15/30min/manual), repo configurado
- **Aparência:** tema (auto/light/dark)
- **Perfil:** mostrar avatar/nome, botão "Sair"

### AUTH-05 — Logout
- Botão "Sair" nas settings
- Remove token do keychain
- Volta para tela de login
- Não apaga vault local

### AUTH-06 — Token Refresh / Expiração
- OAuth tokens do GitHub não expiram (diferente de OAuth2 padrão)
- Se 401: limpar token e redirecionar para login
- Detectar revogação manual pelo usuário no GitHub

## Out of Scope

- OAuth com outros providers (GitLab, etc.)
- Múltiplos usuários / contas
- SSO empresarial

## Acceptance Criteria

1. WHEN usuário abre app pela primeira vez THEN vê tela de login com botão "Entrar com GitHub"
2. WHEN usuário clica em "Entrar com GitHub" THEN browser abre, autoriza, e app recebe token automaticamente
3. WHEN auth completo THEN avatar e nome do GitHub aparecem no app
4. WHEN usuário abre settings THEN pode configurar editor, sync e aparência
5. WHEN usuário clica em "Sair" THEN volta para tela de login sem perder notas locais

## Status: PENDING — M4
