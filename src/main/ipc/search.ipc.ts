import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import store from '../store'

interface SearchResult {
  path: string
  relativePath: string
  title: string
  snippet: string
  score: number
  tags: string[]
  notebook: string | null
  updatedAt: string | null
}

interface NoteIndex {
  path: string
  relativePath: string
  content: string
  title: string
  tags: string[]
  notebook: string | null
  updatedAt: string | null
}

// In-memory index
let noteIndex: NoteIndex[] = []
let indexedVaultPath: string | null = null

function extractFrontmatter(content: string): { tags: string[]; title?: string; notebook?: string; updated?: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return { tags: [] }
  const fm = match[1]
  const tags: string[] = []

  const tagsMatch = fm.match(/tags:\s*\[([^\]]*)\]/)
  if (tagsMatch) {
    tags.push(...tagsMatch[1].split(',').map((t) => t.trim().replace(/['"]/g, '')).filter(Boolean))
  }

  const titleMatch = fm.match(/title:\s*(.+)/)
  const notebookMatch = fm.match(/notebook:\s*(.+)/)
  const updatedMatch = fm.match(/updated:\s*(.+)/)

  return {
    tags,
    title: titleMatch?.[1]?.trim(),
    notebook: notebookMatch?.[1]?.trim(),
    updated: updatedMatch?.[1]?.trim()
  }
}

function extractTitle(content: string, filename: string): string {
  const fm = extractFrontmatter(content)
  if (fm.title) return fm.title

  // First # heading
  const headingMatch = content.replace(/^---[\s\S]*?---\n/, '').match(/^#{1,6}\s+(.+)$/m)
  if (headingMatch) return headingMatch[1].trim()

  return filename.replace('.md', '')
}

function getSnippet(content: string, query: string, length = 150): string {
  const cleanContent = content.replace(/^---[\s\S]*?---\n/, '').replace(/#{1,6}\s/g, '')
  const lowerContent = cleanContent.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerContent.indexOf(lowerQuery)

  if (idx === -1) return cleanContent.slice(0, length).trim() + '...'

  const start = Math.max(0, idx - 60)
  const end = Math.min(cleanContent.length, idx + length)
  const snippet = cleanContent.slice(start, end).trim()
  return (start > 0 ? '...' : '') + snippet + (end < cleanContent.length ? '...' : '')
}

async function buildIndex(vaultPath: string): Promise<void> {
  const index: NoteIndex[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const absPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(absPath)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = await fs.readFile(absPath, 'utf-8')
        const relativePath = path.relative(vaultPath, absPath)
        const fm = extractFrontmatter(content)
        const title = extractTitle(content, entry.name)
        const stat = await fs.stat(absPath)

        index.push({
          path: absPath,
          relativePath,
          content,
          title,
          tags: fm.tags,
          notebook: fm.notebook ?? null,
          updatedAt: fm.updated ?? stat.mtime.toISOString()
        })
      }
    }
  }

  await walk(vaultPath)
  noteIndex = index
  indexedVaultPath = vaultPath
}

interface SearchQuery {
  text: string
  tags?: string[]
  notebook?: string
  after?: string
  before?: string
  limit?: number
}

function parseQuery(rawQuery: string): SearchQuery {
  const query: SearchQuery = { text: '', tags: [], limit: 50 }
  let remaining = rawQuery

  // Extract tag: filters
  const tagMatches = [...rawQuery.matchAll(/tag:(\S+)/g)]
  for (const match of tagMatches) {
    query.tags!.push(match[1])
    remaining = remaining.replace(match[0], '').trim()
  }

  // Extract notebook: filter
  const notebookMatch = rawQuery.match(/notebook:(\S+)/)
  if (notebookMatch) {
    query.notebook = notebookMatch[1]
    remaining = remaining.replace(notebookMatch[0], '').trim()
  }

  // Extract after: filter
  const afterMatch = rawQuery.match(/after:(\S+)/)
  if (afterMatch) {
    query.after = afterMatch[1]
    remaining = remaining.replace(afterMatch[0], '').trim()
  }

  // Extract before: filter
  const beforeMatch = rawQuery.match(/before:(\S+)/)
  if (beforeMatch) {
    query.before = beforeMatch[1]
    remaining = remaining.replace(beforeMatch[0], '').trim()
  }

  query.text = remaining.trim()
  return query
}

export function registerSearchHandlers(): void {
  ipcMain.handle('search:index', async () => {
    const config = store.get('vaultConfig')
    if (!config) return
    await buildIndex(config.path)
    return noteIndex.length
  })

  ipcMain.handle('search:query', async (_e, rawQuery: string): Promise<SearchResult[]> => {
    const config = store.get('vaultConfig')
    if (!config) return []

    // Re-index if vault changed
    if (indexedVaultPath !== config.path) {
      await buildIndex(config.path)
    }

    const query = parseQuery(rawQuery)
    const results: SearchResult[] = []

    for (const note of noteIndex) {
      // Tag filter
      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every((t) => note.tags.includes(t))
        if (!hasAllTags) continue
      }

      // Notebook filter
      if (query.notebook) {
        if (!note.notebook?.includes(query.notebook)) continue
      }

      // Date filters
      if (query.after && note.updatedAt) {
        if (new Date(note.updatedAt) < new Date(query.after)) continue
      }
      if (query.before && note.updatedAt) {
        if (new Date(note.updatedAt) > new Date(query.before)) continue
      }

      // Text search
      let score = 0
      if (query.text) {
        const lowerText = query.text.toLowerCase()
        const lowerContent = note.content.toLowerCase()
        const lowerTitle = note.title.toLowerCase()

        if (!lowerContent.includes(lowerText) && !lowerTitle.includes(lowerText)) continue

        // Score: title match = 10, content match count
        if (lowerTitle.includes(lowerText)) score += 10
        const contentMatches = (lowerContent.match(new RegExp(lowerText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length
        score += contentMatches
      } else {
        score = 1 // No text filter = all results, ordered by date
      }

      results.push({
        path: note.path,
        relativePath: note.relativePath,
        title: note.title,
        snippet: query.text ? getSnippet(note.content, query.text) : note.content.slice(0, 150).trim() + '...',
        score,
        tags: note.tags,
        notebook: note.notebook,
        updatedAt: note.updatedAt
      })
    }

    return results
      .sort((a, b) => query.text ? b.score - a.score : new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
      .slice(0, query.limit)
  })

  // Invalidate a single note in the index (called after save)
  ipcMain.handle('search:invalidate', async (_e, filePath: string) => {
    const config = store.get('vaultConfig')
    if (!config) return

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const relativePath = path.relative(config.path, filePath)
      const fm = extractFrontmatter(content)
      const title = extractTitle(content, path.basename(filePath))
      const stat = await fs.stat(filePath)

      const idx = noteIndex.findIndex((n) => n.path === filePath)
      const entry: NoteIndex = {
        path: filePath,
        relativePath,
        content,
        title,
        tags: fm.tags,
        notebook: fm.notebook ?? null,
        updatedAt: fm.updated ?? stat.mtime.toISOString()
      }

      if (idx >= 0) noteIndex[idx] = entry
      else noteIndex.push(entry)
    } catch {
      // File deleted — remove from index
      noteIndex = noteIndex.filter((n) => n.path !== filePath)
    }
  })
}
