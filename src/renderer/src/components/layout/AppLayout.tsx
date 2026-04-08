import { useState, useCallback, useRef, useEffect } from "react";
import { TitleBar } from "./TitleBar";
import { Rail } from "./Rail";
import { Sidebar } from "./Sidebar";
import { NoteList } from "./NoteList";
import { EditorPanel } from "./EditorPanel";

import { CalendarPanel } from "../calendar/CalendarPanel";
import { SettingsModal } from "../settings/SettingsModal";
import { ProfileModal } from "../profile/ProfileModal";
import { TemplatePickerModal, applyTemplate } from "../editor/TemplatePickerModal";
import { SpotlightSearch } from "../search/SpotlightSearch";
import { useAuthStore } from "../../stores/auth.store";
import { useManifestStore } from "../../stores/manifest.store";
import { useNotesStore } from "../../stores/notes.store";
import { useEditorStore } from "../../stores/editor.store";
import { useVaultStore } from "../../stores/vault.store";
import { useGlobalShortcuts } from "../../hooks/useGlobalShortcuts";

export function AppLayout(): JSX.Element {
  // Load vault config into renderer store so components can read the path
  const setVault = useVaultStore((s) => s.setVault)
  const vaultConfig = useVaultStore((s) => s.config)
  useEffect(() => {
    if (!vaultConfig) {
      window.electronAPI.vault.load().then((c) => { if (c) setVault(c) })
    }
  }, [])

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const { logout } = useAuthStore();

  const handleToggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const handleToggleCalendar = useCallback(() => setCalendarOpen((v) => !v), []);
  const handleOpenProfile = useCallback(() => setProfileOpen(true), []);
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleOpenSpotlight = useCallback(() => setSpotlightOpen(true), []);

  const { activeNotebook } = useManifestStore();
  const { createNote, selectNote } = useNotesStore();
  const { activeNote, closeNote, togglePreviewOnly, toggleFocusMode } = useEditorStore();
  const openNote = useEditorStore((s) => s.openNote);

  const activeNotebookRef = useRef(activeNotebook);
  activeNotebookRef.current = activeNotebook;

  const handleNewNote = useCallback(() => {
    if (!activeNotebookRef.current) return;
    setTemplatePickerOpen(true);
  }, []);

  const handleTemplateSelect = useCallback(async (templateContent: string) => {
    setTemplatePickerOpen(false);
    const nbId = activeNotebookRef.current;
    if (!nbId) return;
    const note = await createNote(nbId);
    if (templateContent) {
      const stem = note.absolutePath.split('/').pop()?.replace(/\.md$/, '') ?? '';
      const processed = applyTemplate(templateContent, stem);
      await window.electronAPI.notes.save(note.absolutePath, processed);
    }
    await openNote(note.absolutePath);
    selectNote(note.absolutePath);
  }, [createNote, openNote, selectNote]);

  const handleCloseNote = useCallback(() => {
    if (activeNote) closeNote();
  }, [activeNote, closeNote]);

  useGlobalShortcuts({
    onNewNote: handleNewNote,
    onCloseNote: handleCloseNote,
    onOpenSettings: handleOpenSettings,
    onToggleFocusMode: toggleFocusMode,
    onTogglePreviewOnly: togglePreviewOnly,
    onOpenSpotlight: handleOpenSpotlight,
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--app-main)] text-[var(--app-text-1)] text-[13px] font-sans antialiased select-none">
      <TitleBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        calendarOpen={calendarOpen}
        onToggleCalendar={handleToggleCalendar}
      />

      {/* Main content below titlebar */}
      <div className="flex flex-1 overflow-hidden">
        <Rail onAvatarClick={handleOpenProfile} />

        {/* 3-column layout */}
        <div className="flex flex-1 overflow-hidden">
          {sidebarOpen && <Sidebar />}
          <NoteList />
          <EditorPanel />
        </div>

        {/* Calendar sidebar (right) */}
        {calendarOpen && (
          <div className="w-[240px] shrink-0 border-l-[0.5px] border-l-[var(--app-border)] bg-[var(--app-sidebar)] flex flex-col">
            <CalendarPanel />
          </div>
        )}
      </div>

      {/* Modals */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {profileOpen && (
        <ProfileModal
          onClose={() => setProfileOpen(false)}
          onLogout={() => {
            setProfileOpen(false);
            logout();
          }}
        />
      )}
      {templatePickerOpen && (
        <TemplatePickerModal
          onSelect={handleTemplateSelect}
          onCancel={() => setTemplatePickerOpen(false)}
        />
      )}
      {spotlightOpen && (
        <SpotlightSearch onClose={() => setSpotlightOpen(false)} />
      )}
    </div>
  );
}
