import { ipcMain, shell, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import chokidar, { type FSWatcher } from 'chokidar'
import type { FileNode } from '../../renderer/src/types/notes'

let watcher: FSWatcher | null = null

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
    await fs.writeFile(filePath, content, 'utf-8')
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
}
