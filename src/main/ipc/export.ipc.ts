import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import store from '../store'

export function registerExportHandlers(): void {
  // export:pdf — uses webContents.printToPDF
  ipcMain.handle('export:pdf', async (_e, filePath: string, content: string) => {
    const vaultPath = store.get('vaultConfig')?.path
    if (!vaultPath) throw new Error('Vault não configurado')

    const filename = path.basename(filePath).replace('.md', '.pdf')
    const { filePath: savePath, canceled } = await dialog.showSaveDialog({
      defaultPath: path.join(require('os').homedir(), 'Desktop', filename),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })

    if (canceled || !savePath) return null

    const win = BrowserWindow.getFocusedWindow()
    if (!win) throw new Error('Nenhuma janela ativa')

    // Inject print-friendly HTML via a temp script
    const html = `
      <html>
      <head>
        <style>
          body { font-family: Georgia, serif; font-size: 14px; line-height: 1.7; max-width: 700px; margin: 40px auto; color: #111; }
          h1,h2,h3 { font-family: system-ui; }
          code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; font-size: 0.875em; }
          pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
          blockquote { border-left: 3px solid #ccc; margin: 0; padding-left: 16px; color: #555; }
          a { color: #6b21a8; }
        </style>
      </head>
      <body>${markdownToHtml(content)}</body>
      </html>
    `

    // Write to temp file and load it
    const os = await import('os')
    const tmpFile = path.join(os.tmpdir(), `hai-export-${Date.now()}.html`)
    await fs.writeFile(tmpFile, html, 'utf-8')

    const exportWin = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
    await exportWin.loadFile(tmpFile)

    const pdfBuffer = await exportWin.webContents.printToPDF({
      printBackground: false,
      pageSize: 'A4'
    })

    exportWin.destroy()
    await fs.unlink(tmpFile).catch(() => {})
    await fs.writeFile(savePath, pdfBuffer)

    return savePath
  })

  // export:html — standalone HTML file
  ipcMain.handle('export:html', async (_e, filePath: string, content: string) => {
    const filename = path.basename(filePath).replace('.md', '.html')
    const { filePath: savePath, canceled } = await dialog.showSaveDialog({
      defaultPath: path.join(require('os').homedir(), 'Desktop', filename),
      filters: [{ name: 'HTML', extensions: ['html'] }]
    })

    if (canceled || !savePath) return null

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${path.basename(filePath).replace('.md', '')}</title>
  <style>
    body { font-family: Georgia, serif; font-size: 16px; line-height: 1.8; max-width: 720px; margin: 60px auto; padding: 0 20px; color: #1a1a1a; background: #fff; }
    h1 { font-size: 2em; margin-bottom: 0.3em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    h1,h2,h3,h4 { font-family: system-ui, sans-serif; font-weight: 700; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.875em; }
    pre { background: #f5f5f5; padding: 20px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding: 0 16px; color: #555; font-style: italic; }
    a { color: #6b21a8; }
    img { max-width: 100%; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    hr { border: none; border-top: 1px solid #eee; margin: 32px 0; }
  </style>
</head>
<body>
${markdownToHtml(content)}
</body>
</html>`

    await fs.writeFile(savePath, html, 'utf-8')
    return savePath
  })

  // export:md — clean markdown (strip frontmatter optional)
  ipcMain.handle('export:md', async (_e, filePath: string, content: string, stripFrontmatter: boolean) => {
    const filename = path.basename(filePath)
    const { filePath: savePath, canceled } = await dialog.showSaveDialog({
      defaultPath: path.join(require('os').homedir(), 'Desktop', filename),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })

    if (canceled || !savePath) return null

    const finalContent = stripFrontmatter
      ? content.replace(/^---\n[\s\S]*?\n---\n?/, '')
      : content

    await fs.writeFile(savePath, finalContent, 'utf-8')
    return savePath
  })

  // import:md — import .md files into vault
  ipcMain.handle('import:md', async () => {
    const vaultPath = store.get('vaultConfig')?.path
    if (!vaultPath) throw new Error('Vault não configurado')

    const { filePaths, canceled } = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })

    if (canceled || filePaths.length === 0) return []

    const imported: string[] = []
    for (const src of filePaths) {
      const dest = path.join(vaultPath, path.basename(src))
      await fs.copyFile(src, dest)
      imported.push(dest)
    }

    return imported
  })

  // import:folder — import folder of .md files
  ipcMain.handle('import:folder', async () => {
    const vaultPath = store.get('vaultConfig')?.path
    if (!vaultPath) throw new Error('Vault não configurado')

    const { filePaths, canceled } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })

    if (canceled || !filePaths[0]) return []

    const srcDir = filePaths[0]
    const destDir = path.join(vaultPath, path.basename(srcDir))
    await fs.cp(srcDir, destDir, { recursive: true })

    return [destDir]
  })

  // share:gist — create a GitHub Gist from a note
  ipcMain.handle('share:gist', async (_e, filePath: string, content: string) => {
    const keytar = await import('keytar')
    const token = await keytar.getPassword('hai-github', 'oauth-token')
      ?? await keytar.getPassword('hai', 'github-pat')
    if (!token) throw new Error('Autentique com GitHub para compartilhar')

    const filename = path.basename(filePath)
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: `Shared from Hai — ${filename}`,
        public: true,
        files: { [filename]: { content } }
      })
    })

    if (!res.ok) throw new Error('Erro ao criar Gist')
    const data = await res.json() as { html_url: string; id: string }
    return { url: data.html_url, id: data.id }
  })
}

// ── Minimal markdown → HTML converter ────────────────────
// (used for export only — not a full parser)
function markdownToHtml(md: string): string {
  return md
    .replace(/^---[\s\S]*?---\n?/, '') // strip frontmatter
    .replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h1-6bplulia])/gm, '')
    .split('\n').join('<br>')
}
