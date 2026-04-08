# Hai

> *Hai* — "to write", in Tupi Guarani.

**A local-first markdown notes app for developers. Your files, your repo, no middleman.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)
![Electron](https://img.shields.io/badge/electron-33-47848F.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)

<!-- screenshots -->

---

## Features

- **Notebooks** — organize notes into color-coded folders
- **Tags** — tag notes and filter them from the sidebar
- **Backlinks** — wiki-style `[[note name]]` linking with a live backlinks panel
- **Calendar** — attach notes to dates and browse them in a calendar view
- **Spotlight search** — full-text search across all notes
- **Markdown editor** — CodeMirror 6 with inline rendering and syntax highlighting
- **Markdown preview** — live rendered preview with GFM support
- **Templates** — create notes from reusable templates
- **Image paste** — paste screenshots directly into notes (saved to `assets/`)
- **Pinned notes** — pin important notes to the top of any notebook
- **Trash** — soft-delete with restore or permanent purge
- **GitHub Sync** — optional vault sync to a private GitHub repo via Device Flow (no passwords, no PATs)
- **Version history** — browse per-note git commit history (sync mode only)
- **Export** — PDF, HTML, Markdown, or GitHub Gist
- **Light / Dark themes** — terracota design system, dark by default

---

## Installation

### Download

Grab the latest release for your platform from the [Releases](https://github.com/gaalv/hai/releases) page:

| Platform | Format |
|----------|--------|
| macOS | `.dmg` (universal: x64 + arm64) |
| Windows | `.exe` (NSIS installer) |
| Linux | `.AppImage` |

### Build from source

See [Development](#development) below.

---

## GitHub Sync

Sync is entirely optional. When enabled, Hai uses a **GitHub App with Device Flow** — no passwords, no personal access tokens.

1. Click **Connect GitHub** in Settings
2. You'll receive a short code — enter it at `github.com/login/device`
3. Hai creates or connects a private repository as your vault
4. Push and pull with one click — all via the GitHub Contents API (no git binary required)

The OAuth token is stored in the OS keychain via `keytar`. It never touches disk in plain text.

---

## Development

**Prerequisites:** Node.js 18+, npm 9+

```bash
git clone https://github.com/gaalv/hai
cd hai
npm install
npm run dev
```

Hot reload is active in the renderer process. The main process restarts automatically on changes.

> On macOS, `keytar` may prompt for keychain access on first run. This is expected behavior.

### Other commands

```bash
npm run typecheck   # TypeScript type check (main + renderer)
npm run lint        # ESLint
npm run format      # Prettier
```

---

## Build

```bash
npm run build:mac     # macOS DMG (universal binary)
npm run build:win     # Windows installer
npm run build:linux   # Linux AppImage
```

Output goes to `dist/`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 33 + electron-vite |
| UI | React 19 + TypeScript |
| Editor | CodeMirror 6 |
| State | Zustand 5 |
| Styling | Tailwind CSS v4 |
| Frontmatter | gray-matter |
| GitHub API | Octokit |
| Secure storage | keytar |
| Markdown | react-markdown + remark-gfm + marked |
| Diagrams | Mermaid |

---

## Project Structure

```
src/
├── main/               # Electron main process
│   ├── ipc/            # IPC handlers: vault, notes, sync, export
│   ├── store.ts        # App config persistence (electron-store)
│   └── keychain.ts     # OS keychain wrapper (keytar)
├── preload/            # contextBridge — main ↔ renderer bridge
└── renderer/src/
    ├── components/     # UI: AppShell, Sidebar, Editor, Preview, Sync
    ├── stores/         # Zustand stores: vault, editor, notes, sync
    ├── services/       # IPC calls: vault, notes, sync, export
    └── types/          # Shared TypeScript interfaces
```

---

## Design System

Dark terracota theme. Built with Tailwind CSS v4 custom properties.

| Token | Value |
|-------|-------|
| Accent | `#C05010` |
| Background | `#0E0600` |
| Text | `#F0DEC8` |

---

## License

MIT © [gaalv](https://github.com/gaalv)
