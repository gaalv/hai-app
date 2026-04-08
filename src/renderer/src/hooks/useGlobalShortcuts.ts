import { useEffect } from 'react'

interface GlobalShortcutHandlers {
  onNewNote: () => void
  onCloseNote: () => void
  onOpenSettings: () => void
  onToggleFocusMode: () => void
  onTogglePreviewOnly: () => void
  onOpenSpotlight: () => void
}

export function useGlobalShortcuts(handlers: GlobalShortcutHandlers): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (!e.metaKey && !e.ctrlKey) return

      const tag = (document.activeElement as HTMLElement)?.tagName?.toUpperCase()
      const isInputFocused = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      // Cmd+N — Nova nota (não disparar se foco estiver em input)
      if (e.key === 'n' && !e.shiftKey && !isInputFocused) {
        e.preventDefault()
        handlers.onNewNote()
        return
      }

      // Cmd+W — Fechar nota ativa
      if (e.key === 'w' && !e.shiftKey) {
        e.preventDefault()
        handlers.onCloseNote()
        return
      }

      // Cmd+, — Abrir settings
      if (e.key === ',' && !e.shiftKey) {
        e.preventDefault()
        handlers.onOpenSettings()
        return
      }

      // Cmd+Shift+F — Toggle focus mode
      if (e.key === 'f' && e.shiftKey) {
        e.preventDefault()
        handlers.onToggleFocusMode()
        return
      }

      // Cmd+Shift+P — Toggle preview mode
      if (e.key === 'p' && e.shiftKey) {
        e.preventDefault()
        handlers.onTogglePreviewOnly()
        return
      }

      // Cmd+K — Spotlight search
      if (e.key === 'k' && !e.shiftKey) {
        e.preventDefault()
        handlers.onOpenSpotlight()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}
