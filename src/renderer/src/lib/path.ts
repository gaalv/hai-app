/** Browser-compatible path utilities for the renderer process */

export function pathJoin(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

export function pathBasename(p: string, ext?: string): string {
  const base = p.split('/').pop() ?? p
  if (ext && base.endsWith(ext)) return base.slice(0, -ext.length)
  return base
}

export function pathRelative(from: string, to: string): string {
  if (to.startsWith(from)) {
    const rel = to.slice(from.length)
    return rel.startsWith('/') ? rel.slice(1) : rel
  }
  return to
}
