import { create } from 'zustand'

type Theme = 'auto' | 'dark' | 'light'

interface UIStore {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  sidebarOpen: boolean
  sidebarWidth: number
  focusMode: boolean
  vimMode: boolean
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  toggleFocusMode: () => void
  toggleVimMode: () => void
}

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'auto') return getSystemTheme()
  return theme
}

const stored = {
  theme: (localStorage.getItem('hai:theme') as Theme) ?? 'dark',
  sidebarOpen: localStorage.getItem('hai:sidebar') !== 'false',
  sidebarWidth: Number(localStorage.getItem('hai:sidebar-width')) || 220,
  vimMode: localStorage.getItem('hai:vim') === 'true'
}

export const useUIStore = create<UIStore>((set, get) => ({
  theme: stored.theme,
  resolvedTheme: resolveTheme(stored.theme),
  sidebarOpen: stored.sidebarOpen,
  sidebarWidth: stored.sidebarWidth,
  focusMode: false,
  vimMode: stored.vimMode,

  setTheme: (theme) => {
    localStorage.setItem('hai:theme', theme)
    const resolved = resolveTheme(theme)
    document.documentElement.dataset.theme = resolved
    set({ theme, resolvedTheme: resolved })
  },

  toggleSidebar: () => {
    const open = !get().sidebarOpen
    localStorage.setItem('hai:sidebar', String(open))
    set({ sidebarOpen: open })
  },

  setSidebarWidth: (width) => {
    localStorage.setItem('hai:sidebar-width', String(width))
    set({ sidebarWidth: width })
  },

  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

  toggleVimMode: () => {
    const vim = !useUIStore.getState().vimMode
    localStorage.setItem('hai:vim', String(vim))
    set({ vimMode: vim })
  }
}))

// Apply initial theme and listen for system changes
const initial = resolveTheme(stored.theme)
document.documentElement.dataset.theme = initial

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { theme, setTheme } = useUIStore.getState()
  if (theme === 'auto') setTheme('auto')
})
