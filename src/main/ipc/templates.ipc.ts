import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import store from '../store'

interface Template {
  name: string
  content: string
  isBuiltin: boolean
}

const BUILTIN_TEMPLATES: Template[] = [
  {
    name: 'Daily Note',
    content: '# {{date}}\n\n## Tasks\n- [ ] \n\n## Notes\n\n',
    isBuiltin: true
  },
  {
    name: 'Meeting Notes',
    content: '# Meeting: {{title}}\n\nDate: {{date}}\nAttendees: \n\n## Agenda\n\n## Notes\n\n## Action Items\n- [ ] \n',
    isBuiltin: true
  },
  {
    name: 'Blog Post',
    content: '# {{title}}\n\nDate: {{date}}\nTags: \n\n---\n\n',
    isBuiltin: true
  }
]

export function registerTemplateHandlers(): void {
  ipcMain.handle('templates:list', async (): Promise<Template[]> => {
    const vaultConfig = store.get('vaultConfig')
    const templates: Template[] = [...BUILTIN_TEMPLATES]

    if (vaultConfig) {
      const templatesDir = path.join(vaultConfig.path, '_templates')
      if (fs.existsSync(templatesDir)) {
        const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.md'))
        for (const file of files) {
          const content = fs.readFileSync(path.join(templatesDir, file), 'utf-8')
          templates.push({ name: file.replace('.md', ''), content, isBuiltin: false })
        }
      }
    }

    return templates
  })
}
