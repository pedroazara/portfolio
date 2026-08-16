import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ExternalLink, Pencil, Search } from "lucide-react";
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import {
  AdminLink,
  listLinks,
  createLink,
  updateLink,
  deleteLink,
} from "../lib/adminToolsService";

export default function LinkVault() {
  const [links, setLinks] = useState<AdminLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLink | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminLink | null>(null);

  useEffect(() => {
    listLinks()
      .then(setLinks)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    links.forEach((link) => link.tags.forEach((tag) => set.add(tag)));
    return [...set].sort();
  }, [links]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return links.filter((link) => {
      if (activeTag && !link.tags.includes(activeTag)) return false;
      if (!term) return true;
      return (
        link.title.toLowerCase().includes(term) ||
        link.url.toLowerCase().includes(term) ||
        (link.notes || "").toLowerCase().includes(term)
      );
    });
  }, [links, query, activeTag]);

  const openNew = () => {
    setEditing(null);
    setUrl("");
    setTitle("");
    setNotes("");
    setTagsInput("");
    setIsFormOpen(true);
  };

  const openEdit = (link: AdminLink) => {
    setEditing(link);
    setUrl(link.url);
    setTitle(link.title);
    setNotes(link.notes || "");
    setTagsInput(link.tags.join(", "));
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim() || !title.trim()) return;
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const payload = {
      url: url.trim(),
      title: title.trim(),
      notes: notes.trim() || null,
      tags,
    };
    try {
      if (editing) {
        const updated = await updateLink(editing.id, payload);
        setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await createLink(payload);
        setLinks((prev) => [created, ...prev]);
      }
      setIsFormOpen(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await deleteLink(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-slate-400">Carregando links…</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar links"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-hidden focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Novo link
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                activeTag === tag
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">Nenhum link aqui.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((link) => (
            <article
              key={link.id}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                >
                  <span className="truncate">{link.title}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </a>
                <p className="truncate text-xs text-slate-400">{link.url}</p>
                {link.notes && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{link.notes}</p>
                )}
                {link.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {link.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(link)}
                  className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Editar link"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(link)}
                  className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer"
                  aria-label="Excluir link"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <EditModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? "Editar link" : "Novo link"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              URL
            </label>
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-hidden focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Título
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-hidden focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-hidden focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tags (separadas por vírgula)
            </label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="óptica, ferramentas, ler depois"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-hidden focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </form>
      </EditModal>

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir link"
        message={`"${pendingDelete?.title}" será removido do cofre.`}
        confirmText="Excluir"
      />
    </div>
  );
}
