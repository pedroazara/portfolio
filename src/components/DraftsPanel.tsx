import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Eye, PenLine } from "lucide-react";
import ArticleContentEditor from "./ArticleContentEditor";
import MarkdownRenderer from "./MarkdownRenderer";
import ConfirmModal from "./ConfirmModal";
import {
  AdminDraft,
  listDrafts,
  createDraft,
  updateDraft,
  deleteDraft,
} from "../lib/adminToolsService";

const AUTOSAVE_DELAY_MS = 1200;

export default function DraftsPanel() {
  const [drafts, setDrafts] = useState<AdminDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [pendingDelete, setPendingDelete] = useState<AdminDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listDrafts()
      .then((list) => {
        setDrafts(list);
        setSelectedId(list[0]?.id ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const selected = drafts.find((d) => d.id === selectedId) ?? null;

  const editSelected = (patch: Partial<Pick<AdminDraft, "title" | "content" | "tags">>) => {
    if (!selected) return;
    const id = selected.id;
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updateDraft(id, patch);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsSaving(false);
      }
    }, AUTOSAVE_DELAY_MS);
  };

  const handleCreate = async () => {
    try {
      const created = await createDraft({});
      setDrafts((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setView("edit");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await deleteDraft(id);
      setDrafts((prev) => {
        const next = prev.filter((d) => d.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-slate-500">Carregando rascunhos…</p>;
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
            Novo rascunho
          </button>

          <div className="space-y-1">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className={`group flex items-center gap-1 rounded-lg px-2.5 py-2 transition-colors ${
                  draft.id === selectedId
                    ? "bg-indigo-50 dark:bg-indigo-950/40"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(draft.id)}
                  className="min-w-0 flex-1 text-left cursor-pointer"
                >
                  <span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">
                    {draft.title}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {draft.content.slice(0, 60) || "vazio"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(draft)}
                  className="rounded p-1 text-slate-500 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100 dark:hover:text-rose-400 cursor-pointer"
                  aria-label="Excluir rascunho"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {drafts.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">Nenhum rascunho</p>
            )}
          </div>
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {selected ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <input
                  value={selected.title}
                  onChange={(e) => editSelected({ title: e.target.value })}
                  placeholder="Título do rascunho"
                  className="min-w-[160px] flex-1 border-0 bg-transparent text-base font-bold text-slate-900 outline-hidden dark:text-white"
                />
                <span className="text-[11px] text-slate-500">
                  {isSaving ? "salvando…" : "salvo"}
                </span>
                <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setView("edit")}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      view === "edit"
                        ? "bg-slate-900 text-white dark:bg-slate-700"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <PenLine className="h-3 w-3" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("preview")}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      view === "preview"
                        ? "bg-slate-900 text-white dark:bg-slate-700"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    Prévia
                  </button>
                </div>
              </div>

              <input
                value={selected.tags.join(", ")}
                onChange={(e) =>
                  editSelected({
                    tags: e.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Tags separadas por vírgula"
                className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-hidden focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />

              {view === "edit" ? (
                <ArticleContentEditor
                  value={selected.content}
                  onChange={(content) => editSelected({ content })}
                  label="Conteúdo"
                  articleTitle={selected.title}
                  rows={16}
                />
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <MarkdownRenderer content={selected.content || "_Rascunho vazio._"} />
                </div>
              )}
            </>
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">
              Selecione ou crie um rascunho.
            </p>
          )}
        </section>
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir rascunho"
        message={`"${pendingDelete?.title}" será removido permanentemente.`}
        confirmText="Excluir"
      />
    </div>
  );
}
