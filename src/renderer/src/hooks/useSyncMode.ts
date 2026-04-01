import { useModeStore } from '../stores/mode.store'

export function useSyncMode() {
  const mode = useModeStore((s) => s.mode)
  return {
    mode,
    isSync: mode === 'sync',
    isLocal: mode === 'local'
  }
}
