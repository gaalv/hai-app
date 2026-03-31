async function read(filePath: string): Promise<string> {
  return window.electronAPI.notes.read(filePath)
}

async function save(filePath: string, content: string): Promise<void> {
  await window.electronAPI.notes.save(filePath, content)
}

async function create(vaultPath: string, name?: string): Promise<string> {
  return window.electronAPI.notes.create(vaultPath, name)
}

async function deleteNote(filePath: string): Promise<void> {
  await window.electronAPI.notes.delete(filePath)
}

async function rename(oldPath: string, newName: string): Promise<string> {
  return window.electronAPI.notes.rename(oldPath, newName)
}

async function listAll(vaultPath: string) {
  return window.electronAPI.notes.listAll(vaultPath)
}

export const notesService = { read, save, create, delete: deleteNote, rename, listAll }
