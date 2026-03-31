# State

## Decisions

- **Stack:** Electron + React + Vite + TypeScript (ESM-only, `"type": "module"`) — escolhido sobre Tauri pelo background JS do dev e distribuição futura mais simples.
- **Editor:** CodeMirror 6 — leve, mobile-ready, modular. Monaco descartado: pesado, sem suporte mobile real.
- **Inline rendering:** Extensões customizadas de CodeMirror 6 (Decorations + WidgetType) para estilo Typora — sem toggle editar/preview.
- **Git sync:** `isomorphic-git` no main process com Node.js `fs` diretamente (sem adapter).
- **GitHub auth:** GitHub OAuth em v1.0 (substitui PAT da implementação base). Requer GitHub App registrada com client_id/client_secret armazenados no keychain.
- **Data model:** `hai.json` na raiz do vault como manifesto (notebooks, tags, pinned, sync config). Notas .md usam frontmatter para metadata individual.
- **File watcher:** `chokidar` v3 no main process.
- **ESM-only:** `format: 'es'` no electron-vite config, `"type": "module"` no package.json. Preload compila para `.mjs`.
- **Preload path:** `../preload/index.mjs` (não `.js`) no main/index.ts — ESM output muda extensão.

## Implemented (M0 Base)

- ✅ Vault setup (onboarding, seleção/criação de pasta)
- ✅ Note editor (criar, editar, renomear, deletar, autosave 500ms)
- ✅ File tree sidebar (chokidar watch, expansão de dirs)
- ✅ GitHub sync manual (push/pull via PAT + isomorphic-git)
- ✅ Split view preview (react-markdown + remark-gfm)
- ✅ Tailwind CSS v4 (todos componentes migrados de inline styles)
- ✅ IPC contextBridge (vault, notes, sync namespaces)
- ✅ keytar para PAT no keychain
- ✅ electron-store v10 para configurações

## Blockers

_Nenhum_

## Todos

- [ ] Implementar M1: Interface & UX Polish
- [ ] Implementar M2: Editor v2 (inline rendering)
- [ ] Implementar M3: Data Model (hai.json + organização)
- [ ] Implementar M4: Auth OAuth
- [ ] Implementar M5: Sync v2
- [ ] Implementar M6: Search & Navigation
- [ ] Implementar M7: Atalhos Globais
- [ ] Implementar M8: Export/Import/Share
- [ ] keytar requer recompilação nativa para Electron — validar ao fazer build

## Deferred Ideas

- Graph view / wikilinks `[[note]]`
- Realtime collaboration
- Mobile / web app
- Plugin system
- Múltiplos vaults simultâneos

## Preferences

- ESM-only: sem workarounds CJS
- Tailwind CSS v4 para estilos (sem inline styles)
- Português BR para UI
- Paralelizar implementação onde possível
