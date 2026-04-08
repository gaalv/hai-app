import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  repo: {
    getConfig: () => ipcRenderer.invoke('repo:get-config'),
    connect: (repoUrl: string) => ipcRenderer.invoke('repo:connect', repoUrl),
    create: (repoName: string) => ipcRenderer.invoke('repo:create', repoName)
  },

  vault: {
    openPicker: () => ipcRenderer.invoke('vault:open-picker'),
    configure: (path: string) => ipcRenderer.invoke('vault:configure', path),
    load: () => ipcRenderer.invoke('vault:load'),
    create: (name: string, parentPath: string) => ipcRenderer.invoke('vault:create', name, parentPath)
  },

  notes: {
    read: (path: string) => ipcRenderer.invoke('notes:read', path),
    save: (path: string, content: string) => ipcRenderer.invoke('notes:save', path, content),
    create: (vaultPath: string, name?: string, notebookPath?: string) => ipcRenderer.invoke('notes:create', vaultPath, name, notebookPath),
    delete: (path: string) => ipcRenderer.invoke('notes:delete', path),
    rename: (oldPath: string, newName: string) => ipcRenderer.invoke('notes:rename', oldPath, newName),
    listAll: (vaultPath: string) => ipcRenderer.invoke('notes:list-all', vaultPath),
    listInNotebook: (notebookId: string) => ipcRenderer.invoke('notes:list-in-notebook', notebookId),
    createInNotebook: (notebookId: string, title?: string) => ipcRenderer.invoke('notes:create-in-notebook', notebookId, title),
    watchStart: (vaultPath: string) => ipcRenderer.invoke('notes:watch-start', vaultPath),
    watchStop: () => ipcRenderer.invoke('notes:watch-stop'),
    findByTitle: (title: string) => ipcRenderer.invoke('notes:find-by-title', title),
    getBacklinks: (relativePath: string) => ipcRenderer.invoke('notes:get-backlinks', relativePath),
    saveImage: (dataUrl: string, filename: string) => ipcRenderer.invoke('notes:save-image', dataUrl, filename)
  },

  sync: {
    configure: (repoUrl: string) => ipcRenderer.invoke('sync:configure', repoUrl),
    push: (message?: string) => ipcRenderer.invoke('sync:push', message),
    pull: () => ipcRenderer.invoke('sync:pull'),
    resolveConflict: (path: string, choice: 'local' | 'remote', remoteContent?: string) =>
      ipcRenderer.invoke('sync:resolve-conflict', path, choice, remoteContent),
    getStatus: () => ipcRenderer.invoke('sync:get-status')
  },

  manifest: {
    load: () => ipcRenderer.invoke('manifest:load'),
    save: (manifest: unknown) => ipcRenderer.invoke('manifest:save', manifest),
    notebooksCreate: (name: string) => ipcRenderer.invoke('manifest:notebooks-create', name),
    notebooksRename: (id: string, newName: string) => ipcRenderer.invoke('manifest:notebooks-rename', id, newName),
    notebooksDelete: (id: string, moveToInbox: boolean) => ipcRenderer.invoke('manifest:notebooks-delete', id, moveToInbox),
    notebooksListNotes: (notebookId: string) => ipcRenderer.invoke('manifest:notebooks-list-notes', notebookId),
    tagsCreate: (tag: unknown) => ipcRenderer.invoke('manifest:tags-create', tag),
    tagsUpdate: (name: string, updates: unknown) => ipcRenderer.invoke('manifest:tags-update', name, updates),
    tagsDelete: (name: string) => ipcRenderer.invoke('manifest:tags-delete', name),
    pinNote: (relativePath: string) => ipcRenderer.invoke('manifest:pin-note', relativePath),
    unpinNote: (relativePath: string) => ipcRenderer.invoke('manifest:unpin-note', relativePath),
    trashNote: (absolutePath: string) => ipcRenderer.invoke('manifest:trash-note', absolutePath),
    trashRestore: (trashPath: string) => ipcRenderer.invoke('manifest:trash-restore', trashPath),
    trashList: () => ipcRenderer.invoke('manifest:trash-list'),
    trashPurge: (trashPath?: string) => ipcRenderer.invoke('manifest:trash-purge', trashPath),
    noteMove: (absolutePath: string, notebookId: string | null) => ipcRenderer.invoke('manifest:note-move', absolutePath, notebookId),
    calendarLink: (dateKey: string, relativePath: string) => ipcRenderer.invoke('manifest:calendar-link', dateKey, relativePath),
    calendarUnlink: (dateKey: string, relativePath: string) => ipcRenderer.invoke('manifest:calendar-unlink', dateKey, relativePath)
  },

  auth: {
    getToken: () => ipcRenderer.invoke('auth:get-token'),
    getProfile: () => ipcRenderer.invoke('auth:get-profile'),
    deviceFlowStart: () => ipcRenderer.invoke('auth:device-flow-start'),
    deviceFlowPoll: (deviceCode: string) => ipcRenderer.invoke('auth:device-flow-poll', deviceCode),
    setClientId: (clientId: string) => ipcRenderer.invoke('auth:set-client-id', clientId),
    logout: () => ipcRenderer.invoke('auth:logout'),
    logoutFull: () => ipcRenderer.invoke('auth:logout-full')
  },

  search: {
    index: () => ipcRenderer.invoke('search:index'),
    query: (rawQuery: string) => ipcRenderer.invoke('search:query', rawQuery),
    invalidate: (filePath: string) => ipcRenderer.invoke('search:invalidate', filePath)
  },

  quickCapture: {
    close: () => ipcRenderer.invoke('quick-capture:close')
  },

  export: {
    pdf: (filePath: string, content: string) => ipcRenderer.invoke('export:pdf', filePath, content),
    html: (filePath: string, content: string) => ipcRenderer.invoke('export:html', filePath, content),
    md: (filePath: string, content: string, stripFrontmatter: boolean) => ipcRenderer.invoke('export:md', filePath, content, stripFrontmatter),
    gist: (filePath: string, content: string) => ipcRenderer.invoke('share:gist', filePath, content)
  },

  import: {
    md: () => ipcRenderer.invoke('import:md'),
    folder: () => ipcRenderer.invoke('import:folder')
  },

  app: {
    getMode: () => ipcRenderer.invoke('app:get-mode'),
    setMode: (mode: 'local' | 'sync') => ipcRenderer.invoke('app:set-mode', mode),
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    quit: () => ipcRenderer.invoke('app:quit'),
    openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url)
  },

  templates: {
    list: () => ipcRenderer.invoke('templates:list')
  },

  history: {
    listCommits: (relativePath: string) => ipcRenderer.invoke('history:list-commits', relativePath),
    getFileAtCommit: (sha: string, relativePath: string) => ipcRenderer.invoke('history:get-file-at-commit', sha, relativePath)
  },

  // Events
  onFileTreeChanged: (callback: () => void) => {
    ipcRenderer.on('filetree:changed', callback)
  },
  onSyncConflictDetected: (callback: (data: { conflicts: import('../renderer/src/types/sync').ConflictFile[] }) => void) => {
    ipcRenderer.on('sync:conflict-detected', (_e, data) => callback(data))
  },
  onAuthChanged: (callback: (event: string) => void) => {
    ipcRenderer.on('auth:changed', (_e, event) => callback(event))
  }
})
