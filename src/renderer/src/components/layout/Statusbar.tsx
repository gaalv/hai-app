import { useEditorStore } from '../../stores/editor.store'

export function StatusBar(): JSX.Element {
  const isDirty = useEditorStore((s) => s.isDirty)
  const isSaving = useEditorStore((s) => s.isSaving)

  const syncLabel = isSaving ? 'Sincronizando...' : isDirty ? 'Não salvo' : 'Sync'
  const dotColor = isSaving ? 'bg-[#F5A623]' : isDirty ? 'bg-[#F87171]' : 'bg-[#3FD68F]'

  return (
    <div className="flex items-center justify-end shrink-0 h-[22px] px-2 bg-[var(--app-rail)] border-t-[0.5px] border-t-[var(--app-border)] text-[11px] text-[var(--app-text-3)] select-none gap-3">
      {/* Sync status */}
      <div className="flex items-center gap-[5px]">
        <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${dotColor}`} />
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="opacity-60">
          <path d="M1.5 5.5a4 4 0 017.2-2.4M9.5 5.5a4 4 0 01-7.2 2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M8.5 1.5v2h-2M2.5 9.5v-2h2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>{syncLabel}</span>
      </div>
    </div>
  )
}
