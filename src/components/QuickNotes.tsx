import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import {
  AdminNote,
  listNotes,
  createNote,
  updateNote,
  deleteNote,
} from "../lib/adminToolsService";

const AUTOSAVE_DELAY_MS = 900;

export default function QuickNotes() {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminNote | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listNotes()
      .then((list) => {
        setNotes(list);
        setSelectedId(list[0]?.id ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  /** Edição local imediata; a gravação espera o texto parar de mudar. */
  const editSelected = (patch: Partial<Pick<AdminNote, "title" | "content">>) => {
    if (!selected) return;
    const id = selected.id;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updateNote(id, patch);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsSaving(false);
      }
    }, AUTOSAVE_DELAY_MS);
  };

  const handleCreate = async () => {
    try {
      const created = await createNote({ title: "Nova nota" });
      setNotes((prev) => [created, ...prev]);
      setSelectedId(created.id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await deleteNote(id);
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-slate-400">Carregando notas…</p>;
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <aside>
          <button
            type="button"
            onClick={handleCreate}
            className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nova nota
          </button>

          <div className="space-y-1">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`group flex items-center gap-1 rounded-lg px-2.5 py-2 transition-colors ${
                  note.id === selectedId
                    ? "bg-indigo-50 dark:bg-indigo-950/40"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                  className="min-w-0 flex-1 text-left cursor-pointer"
                >
                  <span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">
                    {note.title || "Sem título"}
                  </span>
                  <span className="block truncate text-[11px] text-slate-400">
                    {note.content.slice(0, 60) || "vazio"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(note)}
                  className="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100 dark:hover:text-rose-400 cursor-pointer"
                  aria-label="Excluir nota"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">Nenhuma nota</p>
            )}
          </div>
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {selected ? (
            <>
              <div className="mb-2 flex items-center gap-2">
                <input
                  value={selected.title || ""}
                  onChange={(e) => editSelected({ title: e.target.value })}
                  placeholder="Título"
                  className="flex-1 border-0 bg-transparent text-base font-bold text-slate-900 outline-hidden dark:text-white"
                />
                <span className="shrink-0 text-[11px] text-slate-400">
                  {isSaving ? "salvando…" : "salvo"}
                </span>
              </div>
              <textarea
                value={selected.content}
                onChange={(e) => editSelected({ content: e.target.value })}
                placeholder="Escreva à vontade…"
                rows={18}
                className="w-full resize-y border-0 bg-transparent font-mono text-sm leading-relaxed text-slate-800 outline-hidden dark:text-slate-200"
              />
            </>
          ) : (
            <p className="py-16 text-center text-sm text-slate-400">
              Selecione ou crie uma nota.
            </p>
          )}
        </section>
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir nota"
        message={`"${pendingDelete?.title || "Sem título"}" será removida permanentemente.`}
        confirmText="Excluir"
      />
    </div>
  );
}
