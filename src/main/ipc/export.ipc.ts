import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'
import store from '../store'

export function registerExportHandlers(): void {
  // ── export:pdf ────────────────────────────────────────────
  ipcMain.handle('export:pdf', async (_e, filePath: string, content: string) => {
    const vaultConfig = store.get('vaultConfig')
    if (!vaultConfig) throw new Error('Vault não configurado')

    const { content: body, data: frontmatter } = matter(content)
    const title = (frontmatter.title as string | undefined) ?? path.basename(filePath, '.md')
    const htmlBody = await marked(body)

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; font-size: 14px; line-height: 1.7; max-width: 700px; margin: 40px auto; color: #111; }
    h1,h2,h3,h4,h5,h6 { font-family: system-ui, sans-serif; margin-top: 1.5em; }
    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; font-size: 0.875em; font-family: monospace; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 3px solid #ccc; margin: 0; padding-left: 16px; color: #555; }
    a { color: #6b21a8; }
    img { max-width: 100%; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    hr { border: none; border-top: 1px solid #eee; margin: 32px 0; }
  </style>
</head>
<body>
<h1>${title}</h1>
${htmlBody}
</body>
</html>`

    const filename = path.basename(filePath, '.md') + '.pdf'
    const { filePath: savePath, canceled } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })

    if (canceled || !savePath) return null

    const os = await import('node:os')
    const tmpFile = path.join(os.tmpdir(), `hai-export-${Date.now()}.html`)
    await fs.writeFile(tmpFile, html, 'utf-8')

    const exportWin = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
    await exportWin.loadFile(tmpFile)

    const pdfBuffer = await exportWin.webContents.printToPDF({
      margins: { marginType: 'default' },
      printBackground: true,
      pageSize: 'A4'
    })

    exportWin.destroy()
    await fs.unlink(tmpFile).catch(() => {})
    await fs.writeFile(savePath, pdfBuffer)

    return { success: true, path: savePath }
  })

  // ── export:html ───────────────────────────────────────────
  ipcMain.handle('export:html', async (_e, filePath: string, content: string) => {
    const { content: body, data: frontmatter } = matter(content)
    const title = (frontmatter.title as string | undefined) ?? path.basename(filePath, '.md')
    const htmlBody = await marked(body)

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
<h1>${title}</h1>
${htmlBody}
</body>
</html>`

    const filename = path.basename(filePath, '.md') + '.html'
    const { filePath: savePath, canceled } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'HTML', extensions: ['html'] }]
    })

    if (canceled || !savePath) return null

    await fs.writeFile(savePath, html, 'utf-8')
    return { success: true, path: savePath }
  })

  // ── export:md ─────────────────────────────────────────────
  ipcMain.handle('export:md', async (_e, filePath: string, content: string, stripFrontmatter: boolean) => {
    const finalContent = stripFrontmatter ? matter(content).content : content
    const filename = path.basename(filePath)

    const { filePath: savePath, canceled } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })

    if (canceled || !savePath) return null

    await fs.writeFile(savePath, finalContent.trim(), 'utf-8')
    return { success: true, path: savePath }
  })

  // ── share:gist ────────────────────────────────────────────
  ipcMain.handle('share:gist', async (_e, filePath: string, content: string) => {
    const keytar = await import('keytar')
    const token =
      (await keytar.getPassword('hai-github', 'oauth-token')) ??
      (await keytar.getPassword('hai', 'github-pat'))

    if (!token) return { error: 'not_authenticated' }

    const filename = path.basename(filePath)

    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: `Compartilhado do Hai — ${filename}`,
        public: false,
        files: { [filename]: { content } }
      })
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Erro ao criar Gist: ${text}`)
    }

    const data = (await res.json()) as { html_url: string; id: string }

    // Update frontmatter with gist info
    try {
      const parsed = matter(content)
      parsed.data.gistId = data.id
      parsed.data.gistUrl = data.html_url
      const updated = matter.stringify(parsed.content, parsed.data)
      await fs.writeFile(filePath, updated, 'utf-8')
    } catch {
      // Non-fatal: gist was created, frontmatter update failed
    }

    return { url: data.html_url, id: data.id }
  })
}
