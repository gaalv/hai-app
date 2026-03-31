import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import store from '../store'
import type { HaiManifest, Notebook, Tag, TrashEntry } from '../../renderer/src/types/manifest'

const DEFAULT_MANIFEST: HaiManifest = {
  version: 1,
  notebooks: [],
  tags: [],
  pinned: [],
  inbox: 'inbox',
  trash: []
}

function getManifestPath(): string {
  const config = store.get('vaultConfig')
  if (!config) throw new Error('Vault não configurado')
  return path.join(config.path, 'hai.json')
}

async function readManifest(): Promise<HaiManifest> {
  const manifestPath = getManifestPath()
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8')
    return { ...DEFAULT_MANIFEST, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_MANIFEST }
  }
}

async function writeManifest(manifest: HaiManifest): Promise<void> {
  const manifestPath = getManifestPath()
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
}

export function registerManifestHandlers(): void {
  // ── Load manifest ────────────────────────────────────
  ipcMain.handle('manifest:load', async () => {
    const manifest = await readManifest()
    // Ensure inbox folder exists
    const vaultPath = store.get('vaultConfig')!.path
    const inboxPath = path.join(vaultPath, manifest.inbox)
    await fs.mkdir(inboxPath, { recursive: true })
    return manifest
  })

  ipcMain.handle('manifest:save', async (_e, manifest: HaiManifest) => {
    await writeManifest(manifest)
  })

  // ── Notebooks ─────────────────────────────────────────
  ipcMain.handle('manifest:notebooks-create', async (_e, name: string) => {
    const manifest = await readManifest()
    const vaultPath = store.get('vaultConfig')!.path
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const notebookPath = slug || `notebook-${Date.now()}`

    const notebook: Notebook = {
      id: randomUUID(),
      name,
      path: notebookPath,
      order: manifest.notebooks.length
    }

    await fs.mkdir(path.join(vaultPath, notebookPath), { recursive: true })
    manifest.notebooks.push(notebook)
    await writeManifest(manifest)
    return notebook
  })

  ipcMain.handle('manifest:notebooks-rename', async (_e, id: string, newName: string) => {
    const manifest = await readManifest()
    const vaultPath = store.get('vaultConfig')!.path
    const nb = manifest.notebooks.find((n) => n.id === id)
    if (!nb) throw new Error('Notebook não encontrado')

    const newSlug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const oldAbsPath = path.join(vaultPath, nb.path)
    const newAbsPath = path.join(vaultPath, newSlug)

    await fs.rename(oldAbsPath, newAbsPath)
    nb.name = newName
    nb.path = newSlug
    await writeManifest(manifest)
    return nb
  })

  ipcMain.handle('manifest:notebooks-delete', async (_e, id: string, moveToInbox: boolean) => {
    const manifest = await readManifest()
    const vaultPath = store.get('vaultConfig')!.path
    const nb = manifest.notebooks.find((n) => n.id === id)
    if (!nb) throw new Error('Notebook não encontrado')

    const nbPath = path.join(vaultPath, nb.path)
    if (moveToInbox) {
      const inboxPath = path.join(vaultPath, manifest.inbox)
      await fs.mkdir(inboxPath, { recursive: true })
      const entries = await fs.readdir(nbPath)
      for (const entry of entries) {
        await fs.rename(path.join(nbPath, entry), path.join(inboxPath, entry))
      }
    }
    await fs.rm(nbPath, { recursive: true, force: true })
    manifest.notebooks = manifest.notebooks.filter((n) => n.id !== id)
    await writeManifest(manifest)
  })

  ipcMain.handle('manifest:notebooks-list-notes', async (_e, notebookId: string) => {
    const manifest = await readManifest()
    const vaultPath = store.get('vaultConfig')!.path
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

  // ── Tags ──────────────────────────────────────────────
  ipcMain.handle('manifest:tags-create', async (_e, tag: Omit<Tag, 'name'> & { name: string }) => {
    const manifest = await readManifest()
    if (manifest.tags.find((t) => t.name === tag.name)) {
      throw new Error('Tag já existe')
    }
    manifest.tags.push(tag)
    await writeManifest(manifest)
    return tag
  })

  ipcMain.handle('manifest:tags-update', async (_e, name: string, updates: Partial<Tag>) => {
    const manifest = await readManifest()
    const tag = manifest.tags.find((t) => t.name === name)
    if (!tag) throw new Error('Tag não encontrada')
    Object.assign(tag, updates)
    await writeManifest(manifest)
    return tag
  })

  ipcMain.handle('manifest:tags-delete', async (_e, name: string) => {
    const manifest = await readManifest()
    manifest.tags = manifest.tags.filter((t) => t.name !== name)
    await writeManifest(manifest)
  })

  // ── Pinned notes ──────────────────────────────────────
  ipcMain.handle('manifest:pin-note', async (_e, relativePath: string) => {
    const manifest = await readManifest()
    if (!manifest.pinned.includes(relativePath)) {
      manifest.pinned.push(relativePath)
      await writeManifest(manifest)
    }
  })

  ipcMain.handle('manifest:unpin-note', async (_e, relativePath: string) => {
    const manifest = await readManifest()
    manifest.pinned = manifest.pinned.filter((p) => p !== relativePath)
    await writeManifest(manifest)
  })

  // ── Trash ─────────────────────────────────────────────
  ipcMain.handle('manifest:trash-note', async (_e, absolutePath: string) => {
    const manifest = await readManifest()
    const vaultPath = store.get('vaultConfig')!.path
    const relative = path.relative(vaultPath, absolutePath)
    const trashDir = path.join(vaultPath, '.trash')
    await fs.mkdir(trashDir, { recursive: true })

    const trashName = `${Date.now()}_${path.basename(absolutePath)}`
    const trashPath = path.join(trashDir, trashName)
    await fs.rename(absolutePath, trashPath)

    const entry: TrashEntry = {
      path: path.relative(vaultPath, trashPath),
      originalPath: relative,
      deletedAt: new Date().toISOString()
    }
    manifest.trash.push(entry)
    await writeManifest(manifest)
    return entry
  })

  ipcMain.handle('manifest:trash-restore', async (_e, trashPath: string) => {
    const manifest = await readManifest()
    const vaultPath = store.get('vaultConfig')!.path
    const entry = manifest.trash.find((t) => t.path === trashPath)
    if (!entry) throw new Error('Arquivo não encontrado na lixeira')

    const src = path.join(vaultPath, entry.path)
    const dest = path.join(vaultPath, entry.originalPath)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.rename(src, dest)

    manifest.trash = manifest.trash.filter((t) => t.path !== trashPath)
    await writeManifest(manifest)
  })

  ipcMain.handle('manifest:trash-list', async () => {
    const manifest = await readManifest()
    return manifest.trash
  })

  ipcMain.handle('manifest:trash-purge', async (_e, trashPath?: string) => {
    const manifest = await readManifest()
    const vaultPath = store.get('vaultConfig')!.path

    const toDelete = trashPath
      ? manifest.trash.filter((t) => t.path === trashPath)
      : manifest.trash

    for (const entry of toDelete) {
      const absPath = path.join(vaultPath, entry.path)
      await fs.rm(absPath, { force: true })
    }

    manifest.trash = trashPath
      ? manifest.trash.filter((t) => t.path !== trashPath)
      : []

    await writeManifest(manifest)
  })

  // ── Note move (between notebooks) ─────────────────────
  ipcMain.handle('manifest:note-move', async (_e, absolutePath: string, notebookId: string | null) => {
    const manifest = await readManifest()
    const vaultPath = store.get('vaultConfig')!.path
    const destDir = notebookId
      ? path.join(vaultPath, manifest.notebooks.find((n) => n.id === notebookId)?.path ?? manifest.inbox)
      : path.join(vaultPath, manifest.inbox)

    await fs.mkdir(destDir, { recursive: true })
    const newPath = path.join(destDir, path.basename(absolutePath))
    await fs.rename(absolutePath, newPath)
    return newPath
  })
}
