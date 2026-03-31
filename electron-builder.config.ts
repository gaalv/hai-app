import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.gaalv.hai',
  productName: 'Hai',
  copyright: 'Copyright © 2025 gaalv',
  directories: {
    buildResources: 'resources',
    output: 'dist'
  },
  files: ['out/**/*'],
  mac: {
    target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
    category: 'public.app-category.productivity'
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }]
  },
  linux: {
    target: [{ target: 'AppImage', arch: ['x64'] }],
    category: 'Office'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
}

export default config
