import { useSearchStore } from '../stores/search.store'

async function index(): Promise<number> {
  return window.electronAPI.search.index()
}

async function query(q: string): Promise<import('../types/electron').SearchResult[]> {
  const store = useSearchStore.getState()
  if (!q.trim()) {
    store.setResults([])
    return []
  }
  store.setLoading(true)
  try {
    const results = await window.electronAPI.search.query(q)
    store.setResults(results)
    return results
  } finally {
    store.setLoading(false)
  }
}

async function invalidate(path: string): Promise<void> {
  return window.electronAPI.search.invalidate(path)
}

export const searchService = { index, query, invalidate }
