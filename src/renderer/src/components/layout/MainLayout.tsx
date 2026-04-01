import { Sidebar } from './Sidebar'
import { NoteList } from './NoteList'
import { EditorPanel } from './EditorPanel'

export function MainLayout(): JSX.Element {
  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <NoteList />
      <EditorPanel />
    </div>
  )
}
