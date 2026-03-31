import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  vault: {
    openPicker: () => ipcRenderer.invoke('vault:open-picker'),
    configure: (path: string) => ipcRenderer.invoke('vault:configure', path),
    load: () => ipcRenderer.invoke('vault:load'),
    create: (name: string, parentPath: string) => ipcRenderer.invoke('vault:create', name, parentPath)
  },
  notes: {
    read: (path: string) => ipcRenderer.invoke('notes:read', path),
    save: (path: string, content: string) => ipcRenderer.invoke('notes:save', path, content),
    create: (vaultPath: string, name?: string) => ipcRenderer.invoke('notes:create', vaultPath, name),
    delete: (path: string) => ipcRenderer.invoke('notes:delete', path),
    rename: (oldPath: string, newName: string) => ipcRenderer.invoke('notes:rename', oldPath, newName),
    listAll: (vaultPath: string) => ipcRenderer.invoke('notes:list-all', vaultPath),
    watchStart: (vaultPath: string) => ipcRenderer.invoke('notes:watch-start', vaultPath),
    watchStop: () => ipcRenderer.invoke('notes:watch-stop')
  },
  sync: {
    configure: (pat: string, repoUrl: string) => ipcRenderer.invoke('sync:configure', pat, repoUrl),
    push: () => ipcRenderer.invoke('sync:push'),
    pull: () => ipcRenderer.invoke('sync:pull'),
    resolveConflict: (path: string, choice: 'local' | 'remote') =>
      ipcRenderer.invoke('sync:resolve-conflict', path, choice),
    getStatus: () => ipcRenderer.invoke('sync:get-status')
  },
  onFileTreeChanged: (callback: () => void) => {
    ipcRenderer.on('filetree:changed', callback)
  }
})
