import { useState, useEffect, useRef } from "react";

export function QuickCapture(): JSX.Element {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSave(): Promise<void> {
    if (!text.trim()) {
      window.electronAPI.quickCapture.close();
      return;
    }
    setSaving(true);
    try {
      // Get vault config to find inbox
      const vaultConfig = await window.electronAPI.vault.load();
      if (!vaultConfig) throw new Error("Vault não configurado");

      const manifest = await window.electronAPI.manifest.load();
      const inboxAbsPath = `${vaultConfig.path}/${manifest.inbox}`;

      // Create note with first line as title
      const firstLine = text.split("\n")[0].slice(0, 50);
      const title =
        firstLine || `Capture ${new Date().toLocaleTimeString("pt-BR")}`;
      const content = `# ${title}\n\n${text}`;

      const filePath = await window.electronAPI.notes.create(
        inboxAbsPath,
        title,
      );
      await window.electronAPI.notes.save(filePath, content);

      setSaved(true);
      setTimeout(() => window.electronAPI.quickCapture.close(), 600);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "Escape") window.electronAPI.quickCapture.close();
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSave();
  }

  return (
    <div className="flex flex-col h-screen bg-[#111] text-neutral-200 overflow-hidden rounded-xl">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#222] shrink-0">
        <span className="text-xs text-purple-400 font-semibold tracking-widest">
          hai
        </span>
        <span className="text-xs text-neutral-500 ml-1">→ Inbox</span>
        <div className="flex-1" />
        <span className="text-[10px] text-neutral-600">
          ⌘↩ salvar · Esc cancelar
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className="flex-1 bg-transparent text-neutral-200 text-sm px-4 py-3 resize-none outline-none placeholder:text-neutral-600"
        placeholder="Capture uma ideia..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-[#222] shrink-0">
        <button
          className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 cursor-pointer transition-colors"
          onClick={() => window.electronAPI.quickCapture.close()}
        >
          Cancelar
        </button>
        <button
          className="px-4 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-md text-xs cursor-pointer transition-colors disabled:opacity-50"
          onClick={handleSave}
          disabled={saving || !text.trim()}
        >
          {saved ? "✓ Salvo!" : saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
