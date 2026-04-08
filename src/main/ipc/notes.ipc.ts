import { ipcMain, shell, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import chokidar, { type FSWatcher } from 'chokidar'
import matter from 'gray-matter'
import { v4 as uuidv4 } from 'uuid'
import store from '../store'
import type { FileNode, NoteListItem } from '../../renderer/src/types/notes'
import type { HaiManifest } from '../../renderer/src/types/manifest'

let watcher: FSWatcher | null = null

function getVaultPath(): string {
  const config = store.get('vaultConfig')
  if (!config) throw new Error('Vault não configurado')
  return config.path
}

async function loadManifest(vaultPath: string): Promise<HaiManifest> {
  const manifestPath = path.join(vaultPath, 'hai.json')
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8')
    return { version: '1', notebooks: [], tags: [], pinned: [], inbox: 'inbox', trash: [], ...JSON.parse(raw) }
  } catch {
    return { version: '1', notebooks: [], tags: [], pinned: [], inbox: 'inbox', trash: [] }
  }
}

async function readDir(dirPath: string): Promise<FileNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const nodes: FileNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const entryPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const children = await readDir(entryPath)
      nodes.push({ name: entry.name, path: entryPath, type: 'dir', children })
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      nodes.push({ name: entry.name, path: entryPath, type: 'file' })
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim() || 'Sem título'
}

export function registerNotesHandlers(): void {
  ipcMain.handle('notes:read', async (_event, filePath: string) => {
    return fs.readFile(filePath, 'utf-8')
  })

  ipcMain.handle('notes:save', async (_event, filePath: string, content: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    // Update the `updated` frontmatter timestamp on every save
    let finalContent = content
    if (content.startsWith('---')) {
      try {
        const parsed = matter(content)
        parsed.data.updated = new Date().toISOString()
        finalContent = matter.stringify(parsed.content, parsed.data)
      } catch { /* keep original content */ }
    }
    await fs.writeFile(filePath, finalContent, 'utf-8')
  })

  ipcMain.handle('notes:create', async (_event, vaultPath: string, name?: string) => {
    const filename = name
      ? `${sanitizeFilename(name)}.md`
      : `Sem título ${new Date().toISOString().replace(/[:.]/g, '-')}.md`
    const filePath = path.join(vaultPath, filename)
    await fs.writeFile(filePath, `# ${name ?? 'Sem título'}\n\n`, 'utf-8')
    return filePath
  })

  ipcMain.handle('notes:delete', async (_event, filePath: string) => {
    await shell.trashItem(filePath)
  })

  ipcMain.handle('notes:rename', async (_event, oldPath: string, newName: string) => {
    const dir = path.dirname(oldPath)
    const ext = path.extname(oldPath)
    const safeName = sanitizeFilename(newName)
    const newPath = path.join(dir, `${safeName}${ext || '.md'}`)
    await fs.rename(oldPath, newPath)
    return newPath
  })

  ipcMain.handle('notes:list-all', async (_event, vaultPath: string) => {
    return readDir(vaultPath)
  })

  // notes:list-in-notebook — list notes in a notebook with frontmatter metadata
  ipcMain.handle('notes:list-in-notebook', async (_event, notebookId: string) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    const nb = manifest.notebooks.find((n) => n.id === notebookId)
    if (!nb) return []

    const nbPath = path.join(vaultPath, nb.path)
    try {
      const entries = await fs.readdir(nbPath)
      const notes: NoteListItem[] = []

      for (const entry of entries) {
        if (!entry.endsWith('.md') || entry.startsWith('.')) continue
        const filePath = path.join(nbPath, entry)
        try {
          const raw = await fs.readFile(filePath, 'utf-8')
          const parsed = matter(raw)
          const title = (parsed.data.title as string) || entry.replace('.md', '')
          const preview = parsed.content.replace(/^#+\s.*/gm, '').trim().replace(/\s+/g, ' ').slice(0, 120)

          notes.push({
            absolutePath: filePath,
            relativePath: path.relative(vaultPath, filePath),
            title,
            preview,
            tags: (parsed.data.tags as string[]) ?? [],
            created: (parsed.data.created as string) ?? new Date().toISOString(),
            updated: (parsed.data.updated as string) ?? new Date().toISOString()
          })
        } catch { /* skip unreadable files */ }
      }

      return notes.sort((a, b) => b.updated.localeCompare(a.updated))
    } catch {
      return []
    }
  })

  // notes:create-in-notebook — create a new markdown note inside a notebook folder
  ipcMain.handle('notes:create-in-notebook', async (_event, notebookId: string, title?: string) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    const nb = manifest.notebooks.find((n) => n.id === notebookId)
    if (!nb) throw new Error('Notebook não encontrado')

    const nbPath = path.join(vaultPath, nb.path)
    await fs.mkdir(nbPath, { recursive: true })

    const noteTitle = title || 'Sem título'
    const now = new Date().toISOString()
    const filename = `${uuidv4()}.md`
    const filePath = path.join(nbPath, filename)

    const content = matter.stringify('\n', {
      title: noteTitle,
      created: now,
      updated: now,
      tags: [],
      notebook: notebookId
    })
    await fs.writeFile(filePath, content, 'utf-8')

    const note: NoteListItem = {
      absolutePath: filePath,
      relativePath: path.relative(vaultPath, filePath),
      title: noteTitle,
      preview: '',
      tags: [],
      created: now,
      updated: now
    }
    return note
  })

  ipcMain.handle('notes:watch-start', async (_event, vaultPath: string) => {
    if (watcher) await watcher.close()

    watcher = chokidar.watch(vaultPath, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true
    })

    const notify = (): void => {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('filetree:changed')
      })
    }

    watcher.on('add', notify).on('unlink', notify).on('addDir', notify).on('unlinkDir', notify)
  })

  ipcMain.handle('notes:watch-stop', async () => {
    if (watcher) {
      await watcher.close()
      watcher = null
    }
  })

  ipcMain.handle('notes:find-by-title', async (_event, title: string) => {
    const vaultPath = getVaultPath()

    async function walk(dir: string): Promise<{ path: string; content: string } | null> {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        const entryPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          const found = await walk(entryPath)
          if (found) return found
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const filenameTitle = entry.name.replace(/\.md$/, '')
          if (filenameTitle.toLowerCase() === title.toLowerCase()) {
            const content = await fs.readFile(entryPath, 'utf-8')
            return { path: entryPath, content }
          }
          try {
            const raw = await fs.readFile(entryPath, 'utf-8')
            const parsed = matter(raw)
            if (
              parsed.data.title &&
              String(parsed.data.title).toLowerCase() === title.toLowerCase()
            ) {
              return { path: entryPath, content: raw }
            }
          } catch { /* skip */ }
        }
      }
      return null
    }

    return walk(vaultPath)
  })

  ipcMain.handle('notes:get-backlinks', async (_event, absolutePath: string) => {
    const vaultPath = getVaultPath()
    const relativePath = path.relative(vaultPath, absolutePath)
    const targetName = path.basename(relativePath, '.md')

    let targetTitle = targetName
    try {
      const raw = await fs.readFile(absolutePath, 'utf-8')
      const parsed = matter(raw)
      if (parsed.data.title) targetTitle = String(parsed.data.title)
    } catch { /* use filename */ }

    const results: Array<{ path: string; title: string; snippet: string }> = []

    async function walk(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        const entryPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(entryPath)
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const entryRelative = path.relative(vaultPath, entryPath)
          if (entryRelative === relativePath) continue
          try {
            const raw = await fs.readFile(entryPath, 'utf-8')
            const pattern = new RegExp(`\\[\\[${escapeRegex(targetTitle)}\\]\\]|\\[\\[${escapeRegex(targetName)}\\]\\]`)
            if (!pattern.test(raw)) continue

            const parsed = matter(raw)
            const noteTitle = (parsed.data.title as string) || entry.name.replace(/\.md$/, '')

            const lines = raw.split('\n')
            let snippet = ''
            for (const line of lines) {
              if (pattern.test(line)) {
                snippet = line.replace(/^#+\s*/, '').trim().slice(0, 120)
                break
              }
            }

            results.push({ path: entryPath, title: noteTitle, snippet })
          } catch { /* skip */ }
        }
      }
    }

    function escapeRegex(str: string): string {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    await walk(vaultPath)
    return results
  })

  ipcMain.handle('notes:save-image', async (_event, dataUrl: string, filename: string) => {
    const vaultPath = getVaultPath()
    const assetsDir = path.join(vaultPath, 'assets')
    await fs.mkdir(assetsDir, { recursive: true })

    const base64 = dataUrl.split(',')[1]
    const buffer = Buffer.from(base64, 'base64')

    const ext = dataUrl.includes('image/png') ? 'png' : dataUrl.includes('image/jpeg') ? 'jpg' : 'png'
    const safeName = filename || `image-${Date.now()}.${ext}`
    const filePath = path.join(assetsDir, safeName)

    await fs.writeFile(filePath, buffer)
    return { relativePath: `assets/${safeName}` }
  })
}
