import { ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { v4 as uuidv4 } from 'uuid'
import store from '../store'
import type { HaiManifest, Notebook, Tag, TrashEntry, NoteFrontmatter } from '../../renderer/src/types/manifest'

// ── Helpers ────────────────────────────────────────────────

function getVaultPath(): string {
  const config = store.get('vaultConfig')
  if (!config) throw new Error('Vault não configurado')
  return config.path
}

async function loadManifest(vaultPath: string): Promise<HaiManifest> {
  const manifestPath = path.join(vaultPath, 'hai.json')
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8')
    const parsed = JSON.parse(raw)
    return {
      version: '1',
      notebooks: [],
      tags: [],
      pinned: [],
      inbox: 'inbox',
      trash: [],
      ...parsed
    } as HaiManifest
  } catch {
    return {
      version: '1',
      notebooks: [],
      tags: [],
      pinned: [],
      inbox: 'inbox',
      trash: []
    }
  }
}

async function saveManifest(vaultPath: string, manifest: HaiManifest): Promise<void> {
  const manifestPath = path.join(vaultPath, 'hai.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
}

async function updateNoteFrontmatter(filePath: string, updates: Partial<NoteFrontmatter>): Promise<void> {
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch {
    return
  }
  const parsed = matter(raw)
  const newFrontmatter = { ...parsed.data, ...updates }
  const updated = matter.stringify(parsed.content, newFrontmatter)
  await fs.writeFile(filePath, updated, 'utf-8')
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// ── Register handlers ──────────────────────────────────────

export function registerManifestHandlers(): void {
  // ── manifest:load ─────────────────────────────────────────
  ipcMain.handle('manifest:load', async () => {
    const vaultPath = getVaultPath()
    let manifest = await loadManifest(vaultPath)

    // Ensure inbox folder exists
    const inboxPath = path.join(vaultPath, manifest.inbox)
    await fs.mkdir(inboxPath, { recursive: true })

    // If hai.json didn't exist, create it
    const manifestPath = path.join(vaultPath, 'hai.json')
    try {
      await fs.access(manifestPath)
    } catch {
      await saveManifest(vaultPath, manifest)
    }

    return manifest
  })

  // ── manifest:save ─────────────────────────────────────────
  ipcMain.handle('manifest:save', async (_e, manifest: HaiManifest) => {
    const vaultPath = getVaultPath()
    await saveManifest(vaultPath, manifest)
  })

  // ── Notebooks ─────────────────────────────────────────────
  ipcMain.handle('manifest:notebooks-create', async (_e, name: string) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)

    const slug = slugify(name) || `notebook-${Date.now()}`
    const notebookPath = slug

    const notebook: Notebook = {
      id: uuidv4(),
      name,
      path: notebookPath,
      order: manifest.notebooks.length,
      createdAt: new Date().toISOString()
    }

    await fs.mkdir(path.join(vaultPath, notebookPath), { recursive: true })
    manifest.notebooks.push(notebook)
    await saveManifest(vaultPath, manifest)
    return notebook
  })

  ipcMain.handle('manifest:notebooks-rename', async (_e, id: string, newName: string) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    const nb = manifest.notebooks.find((n) => n.id === id)
    if (!nb) throw new Error('Notebook não encontrado')

    const newSlug = slugify(newName) || `notebook-${Date.now()}`
    const oldAbsPath = path.join(vaultPath, nb.path)
    const newAbsPath = path.join(vaultPath, newSlug)

    await fs.rename(oldAbsPath, newAbsPath)
    nb.name = newName
    nb.path = newSlug
    await saveManifest(vaultPath, manifest)
    return nb
  })

  ipcMain.handle('manifest:notebooks-delete', async (_e, id: string, moveToInbox: boolean) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    const nb = manifest.notebooks.find((n) => n.id === id)
    if (!nb) throw new Error('Notebook não encontrado')

    const nbPath = path.join(vaultPath, nb.path)
    if (moveToInbox) {
      const inboxPath = path.join(vaultPath, manifest.inbox)
      await fs.mkdir(inboxPath, { recursive: true })
      const entries = await fs.readdir(nbPath)
      for (const entry of entries) {
        if (entry.endsWith('.md')) {
          await fs.rename(path.join(nbPath, entry), path.join(inboxPath, entry))
        }
      }
    }
    await fs.rm(nbPath, { recursive: true, force: true })
    manifest.notebooks = manifest.notebooks.filter((n) => n.id !== id)
    await saveManifest(vaultPath, manifest)
  })

  ipcMain.handle('manifest:notebooks-list-notes', async (_e, notebookId: string) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    const nb = manifest.notebooks.find((n) => n.id === notebookId)
    if (!nb) return []

    const nbPath = path.join(vaultPath, nb.path)
    try {
      const entries = await fs.readdir(nbPath)
      return entries
        .filter((e) => e.endsWith('.md') && !e.startsWith('.'))
        .map((e) => ({ name: e, path: path.join(nbPath, e) }))
    } catch {
      return []
    }
  })

  // ── Tags ──────────────────────────────────────────────────
  ipcMain.handle('manifest:tags-create', async (_e, tag: Tag) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    if (manifest.tags.find((t) => t.name === tag.name)) {
      throw new Error('Tag já existe')
    }
    manifest.tags.push(tag)
    await saveManifest(vaultPath, manifest)
    return tag
  })

  ipcMain.handle('manifest:tags-update', async (_e, name: string, updates: Partial<Tag>) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    const tag = manifest.tags.find((t) => t.name === name)
    if (!tag) throw new Error('Tag não encontrada')
    Object.assign(tag, updates)
    await saveManifest(vaultPath, manifest)
    return tag
  })

  ipcMain.handle('manifest:tags-delete', async (_e, name: string) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    manifest.tags = manifest.tags.filter((t) => t.name !== name)
    await saveManifest(vaultPath, manifest)

    // Remove tag from all notes' frontmatter
    async function removeTagFromDir(dirPath: string): Promise<void> {
      let entries: string[]
      try {
        entries = await fs.readdir(dirPath)
      } catch {
        return
      }
      for (const entry of entries) {
        if (entry.startsWith('.')) continue
        const entryPath = path.join(dirPath, entry)
        const stat = await fs.stat(entryPath).catch(() => null)
        if (!stat) continue
        if (stat.isDirectory()) {
          await removeTagFromDir(entryPath)
        } else if (entry.endsWith('.md')) {
          let raw: string
          try { raw = await fs.readFile(entryPath, 'utf-8') } catch { continue }
          const parsed = matter(raw)
          if (Array.isArray(parsed.data.tags) && parsed.data.tags.includes(name)) {
            parsed.data.tags = parsed.data.tags.filter((t: string) => t !== name)
            await fs.writeFile(entryPath, matter.stringify(parsed.content, parsed.data), 'utf-8')
          }
        }
      }
    }
    await removeTagFromDir(vaultPath)
  })

  // ── Pinned notes ──────────────────────────────────────────
  ipcMain.handle('manifest:pin-note', async (_e, relativePath: string) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    if (!manifest.pinned.includes(relativePath)) {
      manifest.pinned.push(relativePath)
    }
    await saveManifest(vaultPath, manifest)
    await updateNoteFrontmatter(path.join(vaultPath, relativePath), { pinned: true })
  })

  ipcMain.handle('manifest:unpin-note', async (_e, relativePath: string) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    manifest.pinned = manifest.pinned.filter((p) => p !== relativePath)
    await saveManifest(vaultPath, manifest)
    await updateNoteFrontmatter(path.join(vaultPath, relativePath), { pinned: false })
  })

  // ── Trash ─────────────────────────────────────────────────
  ipcMain.handle('manifest:trash-note', async (_e, absolutePath: string) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    const relative = path.relative(vaultPath, absolutePath)
    const trashDir = path.join(vaultPath, '.trash')
    await fs.mkdir(trashDir, { recursive: true })

    const trashName = `${Date.now()}_${path.basename(absolutePath)}`
    const trashAbsPath = path.join(trashDir, trashName)
    await fs.rename(absolutePath, trashAbsPath)

    const entry: TrashEntry = {
      originalPath: relative,
      trashedAt: new Date().toISOString(),
      trashPath: path.relative(vaultPath, trashAbsPath)
    }
    if (!manifest.trash) manifest.trash = []
    manifest.trash.push(entry)
    await saveManifest(vaultPath, manifest)
    return entry
  })

  ipcMain.handle('manifest:trash-restore', async (_e, trashPath: string) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    const entry = (manifest.trash ?? []).find((t) => t.trashPath === trashPath)
    if (!entry) throw new Error('Arquivo não encontrado na lixeira')

    const src = path.join(vaultPath, entry.trashPath)
    const dest = path.join(vaultPath, entry.originalPath)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.rename(src, dest)

    manifest.trash = (manifest.trash ?? []).filter((t) => t.trashPath !== trashPath)
    await saveManifest(vaultPath, manifest)
  })

  ipcMain.handle('manifest:trash-list', async () => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    return manifest.trash ?? []
  })

  ipcMain.handle('manifest:trash-purge', async (_e, trashPath?: string) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)
    const trash = manifest.trash ?? []

    if (trashPath) {
      const entry = trash.find((t) => t.trashPath === trashPath)
      if (entry) {
        await fs.rm(path.join(vaultPath, entry.trashPath), { force: true })
      }
      manifest.trash = trash.filter((t) => t.trashPath !== trashPath)
    } else {
      for (const entry of trash) {
        await fs.rm(path.join(vaultPath, entry.trashPath), { force: true })
      }
      manifest.trash = []
    }

    await saveManifest(vaultPath, manifest)
  })

  // ── Note move ─────────────────────────────────────────────
  ipcMain.handle('manifest:note-move', async (_e, absolutePath: string, notebookId: string | null) => {
    const vaultPath = getVaultPath()
    const manifest = await loadManifest(vaultPath)

    let destDir: string
    if (notebookId) {
      const nb = manifest.notebooks.find((n) => n.id === notebookId)
      destDir = path.join(vaultPath, nb?.path ?? manifest.inbox)
    } else {
      destDir = path.join(vaultPath, manifest.inbox)
    }

    await fs.mkdir(destDir, { recursive: true })
    const newPath = path.join(destDir, path.basename(absolutePath))
    await fs.rename(absolutePath, newPath)

    await updateNoteFrontmatter(newPath, { notebook: notebookId ?? undefined })
    return newPath
  })
}
