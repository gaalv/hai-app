export interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileNode[]
}

export interface NoteListItem {
  absolutePath: string
  relativePath: string
  title: string
  preview: string
  tags: string[]
  created: string
  updated: string
}
