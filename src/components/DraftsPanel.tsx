import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Eye, PenLine, FileText } from "lucide-react";
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

/** "há 5 min", "há 3 h"… cai para a data quando passa de uma semana. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;
  if (diffMs < minute) return "agora mesmo";
  if (diffMs < hour) return `há ${Math.floor(diffMs / minute)} min`;
  if (diffMs < day) return `há ${Math.floor(diffMs / hour)} h`;
  if (diffMs < day * 7) return `há ${Math.floor(diffMs / day)} d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default function DraftsPanel() {
  const [drafts, setDrafts] = useState<AdminDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"edit" | "preview">("preview");
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

  /** Abrir um rascunho da lista sempre entra na prévia; editar é uma escolha à parte. */
  const selectDraft = (id: string) => {
    setSelectedId(id);
    setView("preview");
  };

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
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {drafts.length} {drafts.length === 1 ? "rascunho" : "rascunhos"}
        </span>
        <button
          type="button"
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Novo rascunho
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="space-y-1.5">
          {drafts.map((draft) => {
            const isActive = draft.id === selectedId;
            return (
              <div
                key={draft.id}
                className={`group relative rounded-xl border p-3 transition-colors ${
                  isActive
                    ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40"
                    : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <button type="button" onClick={() => selectDraft(draft.id)} className="block w-full text-left cursor-pointer">
                  <span className="block truncate pr-5 text-sm font-semibold text-slate-900 dark:text-white">
                    {draft.title || "Sem título"}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                    {draft.content.slice(0, 80) || "vazio"}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {relativeTime(draft.updated_at)}
                    </span>
                    {draft.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(draft)}
                  className="absolute right-2 top-2 rounded p-1 text-slate-400 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100 dark:hover:text-rose-400 cursor-pointer"
                  aria-label="Excluir rascunho"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {drafts.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-500">Nenhum rascunho</p>
          )}
        </aside>

        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          {!selected ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <FileText className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-sm text-slate-500">Selecione ou crie um rascunho.</p>
            </div>
          ) : view === "preview" ? (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl font-bold text-slate-900 dark:text-white">
                    {selected.title || "Sem título"}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Atualizado {relativeTime(selected.updated_at)}</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span>{wordCount(selected.content)} palavras</span>
                    {selected.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selected.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setView("edit")}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 cursor-pointer"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Editar
                </button>
              </div>

              <div className="prose prose-slate max-w-none dark:prose-invert">
                <MarkdownRenderer
                  content={selected.content || "_Rascunho vazio. Clique em **Editar** para começar a escrever._"}
                />
              </div>
            </>
          ) : (
            <>
              <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
                <input
                  value={selected.title}
                  onChange={(e) => editSelected({ title: e.target.value })}
                  placeholder="Título do rascunho"
                  className="min-w-[200px] flex-1 border-0 bg-transparent font-display text-xl font-bold text-slate-900 outline-hidden dark:text-white"
                />
                <div className="flex shrink-0 items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500">
                    {isSaving ? "salvando…" : "salvo"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setView("preview")}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver prévia
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
                placeholder="+ tags"
                className="mb-4 w-full border-0 border-b border-transparent bg-transparent px-0 py-1 text-xs text-slate-500 outline-hidden placeholder:text-slate-400 focus:border-slate-200 dark:text-slate-400 dark:placeholder:text-slate-600 dark:focus:border-slate-700"
              />

              <ArticleContentEditor
                value={selected.content}
                onChange={(content) => editSelected({ content })}
                label=""
                articleTitle={selected.title}
                rows={16}
              />
            </>
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
