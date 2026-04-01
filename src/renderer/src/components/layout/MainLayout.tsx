import { Sidebar } from './Sidebar'
import { NoteList } from './NoteList'
import { EditorPanel } from './EditorPanel'

export function MainLayout(): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}
    >
      <Sidebar />
      <NoteList />
      <EditorPanel />
    </div>
  )
}
