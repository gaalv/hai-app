import { useState } from 'react'
import { useFileTreeStore } from '../../stores/fileTree.store'
import { useEditorStore } from '../../stores/editor.store'
import { useVaultStore } from '../../stores/vault.store'
import type { FileNode } from '../../types/notes'

interface NodeProps {
  node: FileNode
  activePath: string | null
  vaultPath: string
}

function TreeNode({ node, activePath, vaultPath }: NodeProps): JSX.Element {
  const [expanded, setExpanded] = useState(true)
  const openNote = useEditorStore((s) => s.openNote)
  const refresh = useFileTreeStore((s) => s.refresh)

  async function handleDelete(): Promise<void> {
    if (!confirm(`Deletar "${node.name}"?`)) return
    await window.electronAPI.notes.delete(node.path)
    refresh(vaultPath)
  }

  async function handleRename(): Promise<void> {
    const newName = prompt('Novo nome:', node.name.replace('.md', ''))
    if (!newName || newName === node.name.replace('.md', '')) return
    await window.electronAPI.notes.rename(node.path, newName)
    refresh(vaultPath)
  }

  if (node.type === 'dir') {
    return (
      <div>
        <div
          style={{ ...styles.item, ...styles.dirItem }}
          onClick={() => setExpanded((e) => !e)}
        >
          <span style={styles.icon}>{expanded ? '▾' : '▸'}</span>
          <span>{node.name}</span>
        </div>
        {expanded && node.children?.map((child) => (
          <div key={child.path} style={{ paddingLeft: 12 }}>
            <TreeNode node={child} activePath={activePath} vaultPath={vaultPath} />
          </div>
        ))}
      </div>
    )
  }

  const isActive = node.path === activePath

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <div
        style={{ ...styles.item, ...(isActive ? styles.activeItem : {}), flex: 1, overflow: 'hidden' }}
        onClick={() => openNote(node.path)}
        title={node.name}
      >
        <span style={{ ...styles.label, color: isActive ? '#c084fc' : '#d4d4d4' }}>
          {node.name.replace('.md', '')}
        </span>
      </div>
      <div style={styles.actions}>
        <button style={styles.actionBtn} onClick={handleRename} title="Renomear">✎</button>
        <button style={styles.actionBtn} onClick={handleDelete} title="Deletar">✕</button>
      </div>
    </div>
  )
}

export function FileTree(): JSX.Element {
  const { nodes, isLoading } = useFileTreeStore()
  const activePath = useEditorStore((s) => s.activeNote?.path ?? null)
  const vaultConfig = useVaultStore((s) => s.config)
  const vaultPath = vaultConfig?.path ?? ''

  async function handleNewNote(): Promise<void> {
    const path = await window.electronAPI.notes.create(vaultPath)
    useEditorStore.getState().openNote(path)
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <span style={styles.vaultName}>{vaultConfig?.name ?? 'Vault'}</span>
        <button style={styles.newBtn} onClick={handleNewNote} title="Nova nota">+</button>
      </div>
      <div style={styles.list}>
        {isLoading ? (
          <p style={styles.hint}>Carregando...</p>
        ) : nodes.length === 0 ? (
          <p style={styles.hint}>Nenhuma nota ainda</p>
        ) : (
          nodes.map((node) => (
            <TreeNode key={node.path} node={node} activePath={activePath} vaultPath={vaultPath} />
          ))
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: { width: 220, minWidth: 180, background: '#111', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', height: '100vh', userSelect: 'none' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #222' },
  vaultName: { fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  newBtn: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' },
  list: { flex: 1, overflow: 'auto', padding: '4px 0' },
  item: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontFamily: 'monospace' },
  activeItem: { background: '#1e1e2e' },
  dirItem: { color: '#888' },
  icon: { fontSize: 10, color: '#555' },
  label: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  hint: { padding: '8px 12px', color: '#444', fontSize: 12 },
  actions: { display: 'flex', gap: 2, paddingRight: 6, opacity: 0, transition: 'opacity 0.15s' },
  actionBtn: { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11, padding: '2px 4px', fontFamily: 'monospace' }
}
