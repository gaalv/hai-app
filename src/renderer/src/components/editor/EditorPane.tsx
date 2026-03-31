import { useState } from 'react'
import { useEditorStore } from '../../stores/editor.store'
import { useUIStore } from '../../stores/ui.store'
import { useVaultStore } from '../../stores/vault.store'
import { useDebounce } from '../../hooks/useDebounce'
import { CodeMirrorEditor } from './CodeMirrorEditor'
import { MarkdownPreview } from './MarkdownPreview'
import { VersionHistory } from './VersionHistory'

interface Props {
  focusMode?: boolean
}

export function EditorPane({ focusMode }: Props): JSX.Element {
  const { activeNote, isDirty, isSaving, saveError, previewMode, setContent, save, setPreviewMode } = useEditorStore()
  const vimMode = useUIStore((s) => s.vimMode)
  const vaultPath = useVaultStore((s) => s.config?.path ?? '')
  const [showHistory, setShowHistory] = useState(false)

  useDebounce(save, 500, [activeNote?.content])

  async function handleExport(format: 'pdf' | 'html' | 'md'): Promise<void> {
    if (!activeNote) return
    await window.electronAPI.export[format](activeNote.path, activeNote.content, false as never)
  }

  async function handleGist(): Promise<void> {
    if (!activeNote) return
    try {
      const result = await window.electronAPI.export.gist(activeNote.path, activeNote.content)
      navigator.clipboard.writeText(result.url)
      alert(`Gist criado! URL copiada: ${result.url}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar Gist')
    }
  }

  if (!activeNote) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--bg)] h-full overflow-hidden items-center justify-center">
        <p className="text-[var(--text-4)] text-sm">Selecione ou crie uma nota</p>
        <p className="text-[var(--text-4)] text-xs mt-1 opacity-50">⌘N para nova nota</p>
      </div>
    )
  }

  const showEditor = previewMode !== 'preview'
  const showPreview = previewMode !== 'none'

  const toolBtnBase = 'px-2.5 py-0.5 bg-transparent border border-[var(--border-2)] text-[var(--text-3)] rounded cursor-pointer text-xs transition-colors hover:border-[var(--text-3)]'
  const toolBtnActive = 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]'

  if (focusMode) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--bg)] h-full overflow-hidden">
        <div className="flex-1 flex justify-center overflow-hidden">
          <div className="w-full max-w-[680px] overflow-hidden">
            <CodeMirrorEditor
              initialContent={activeNote.content}
              onChange={setContent}
              focusMode
              vimMode={vimMode}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg)] h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-[var(--border)] bg-[var(--surface)] min-h-[40px] shrink-0">
        <span className="text-[13px] text-[var(--text-2)] overflow-hidden text-ellipsis whitespace-nowrap">
          {activeNote.path.split('/').pop()?.replace('.md', '')}
        </span>
        <div className="flex items-center gap-1">
          <button className={`${toolBtnBase} ${previewMode === 'none' ? toolBtnActive : ''}`} onClick={() => setPreviewMode('none')} title="Somente editor">Editar</button>
          <button className={`${toolBtnBase} ${previewMode === 'split' ? toolBtnActive : ''}`} onClick={() => setPreviewMode('split')} title="Split view">Split</button>
          <button className={`${toolBtnBase} ${previewMode === 'preview' ? toolBtnActive : ''}`} onClick={() => setPreviewMode('preview')} title="Somente preview">Preview</button>
          <span className="ml-2 text-[13px]">
            {saveError
              ? <span className="text-red-400">Erro ao salvar</span>
              : isSaving
                ? <span className="text-[var(--text-3)]">Salvando...</span>
                : isDirty
                  ? <span className="text-yellow-400">●</span>
                  : <span className="text-green-500">✓</span>}
          </span>

          {/* History */}
          <button
            className={`${toolBtnBase} ml-1 ${showHistory ? toolBtnActive : ''}`}
            onClick={() => setShowHistory(!showHistory)}
            title="Histórico de versões (⌘H)"
          >⏱</button>

          {/* Export dropdown */}
          <div className="relative group ml-1">
            <button className={toolBtnBase} title="Exportar">↑</button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-[var(--surface-2)] border border-[var(--border-2)] rounded-lg py-1 z-50 min-w-[120px] shadow-xl">
              <button className="px-4 py-2 text-xs text-left text-[var(--text-2)] hover:bg-[var(--surface-3)] cursor-pointer" onClick={() => handleExport('pdf')}>PDF</button>
              <button className="px-4 py-2 text-xs text-left text-[var(--text-2)] hover:bg-[var(--surface-3)] cursor-pointer" onClick={() => handleExport('html')}>HTML</button>
              <button className="px-4 py-2 text-xs text-left text-[var(--text-2)] hover:bg-[var(--surface-3)] cursor-pointer" onClick={() => handleExport('md')}>Markdown</button>
              <div className="border-t border-[var(--border)] my-1" />
              <button className="px-4 py-2 text-xs text-left text-[var(--text-2)] hover:bg-[var(--surface-3)] cursor-pointer" onClick={handleGist}>🔗 Gist público</button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit area */}
      <div className="flex-1 flex overflow-hidden">
        {showEditor && (
          <div className={`flex-1 overflow-hidden ${showPreview ? 'border-r border-[var(--border)]' : ''}`}>
            <CodeMirrorEditor initialContent={activeNote.content} onChange={setContent} vimMode={vimMode} />
          </div>
        )}
        {showPreview && (
          <div className="flex-1 overflow-hidden">
            <MarkdownPreview content={activeNote.content} />
          </div>
        )}
        {showHistory && (
          <div className="w-72 border-l border-[var(--border)] overflow-hidden shrink-0">
            <VersionHistory
              relativePath={activeNote.path.replace(vaultPath + '/', '')}
              onRestore={(content) => {
                setContent(content)
                setShowHistory(false)
              }}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
