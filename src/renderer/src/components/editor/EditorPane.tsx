import { useEditorStore } from '../../stores/editor.store'
import { useDebounce } from '../../hooks/useDebounce'
import { CodeMirrorEditor } from './CodeMirrorEditor'
import { MarkdownPreview } from './MarkdownPreview'

export function EditorPane(): JSX.Element {
  const { activeNote, isDirty, isSaving, saveError, previewMode, setContent, save, setPreviewMode } = useEditorStore()

  useDebounce(save, 500, [activeNote?.content])

  if (!activeNote) {
    return (
      <div style={{ ...styles.container, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#333', fontFamily: 'monospace', fontSize: 14 }}>Selecione ou crie uma nota</p>
      </div>
    )
  }

  const showEditor = previewMode !== 'preview'
  const showPreview = previewMode !== 'none'

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <span style={styles.filename}>{activeNote.path.split('/').pop()?.replace('.md', '')}</span>
        <div style={styles.toolbarRight}>
          <button
            style={{ ...styles.toolBtn, ...(previewMode === 'none' ? styles.toolBtnActive : {}) }}
            onClick={() => setPreviewMode('none')}
            title="Somente editor"
          >Editar</button>
          <button
            style={{ ...styles.toolBtn, ...(previewMode === 'split' ? styles.toolBtnActive : {}) }}
            onClick={() => setPreviewMode('split')}
            title="Split view"
          >Split</button>
          <button
            style={{ ...styles.toolBtn, ...(previewMode === 'preview' ? styles.toolBtnActive : {}) }}
            onClick={() => setPreviewMode('preview')}
            title="Somente preview"
          >Preview</button>
          <span style={styles.saveStatus}>
            {saveError ? <span style={{ color: '#f87171' }}>Erro ao salvar</span>
              : isSaving ? <span style={{ color: '#888' }}>Salvando...</span>
              : isDirty ? <span style={{ color: '#facc15' }}>●</span>
              : <span style={{ color: '#4ade80' }}>✓</span>}
          </span>
        </div>
      </div>

      <div style={styles.editArea}>
        {showEditor && (
          <div style={{ flex: 1, overflow: 'hidden', borderRight: showPreview ? '1px solid #222' : 'none' }}>
            <CodeMirrorEditor
              initialContent={activeNote.content}
              onChange={setContent}
            />
          </div>
        )}
        {showPreview && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <MarkdownPreview content={activeNote.content} />
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, display: 'flex', flexDirection: 'column', background: '#0f0f0f', height: '100vh', overflow: 'hidden' },
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', borderBottom: '1px solid #222', background: '#111', minHeight: 40 },
  filename: { fontSize: 13, color: '#888', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 4 },
  toolBtn: { padding: '3px 10px', background: 'transparent', border: '1px solid #2a2a2a', color: '#666', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' },
  toolBtnActive: { background: '#1e1e2e', color: '#c084fc', borderColor: '#4a3a6a' },
  saveStatus: { marginLeft: 8, fontSize: 13 },
  editArea: { flex: 1, display: 'flex', overflow: 'hidden' }
}
