import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Search, NotebookPen, Check, Loader2, RotateCw, ArrowUpRight } from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import { AdminNote, listNotes, createNote, updateNote, deleteNote } from "../lib/adminToolsService";

type NotePatch = Partial<Pick<AdminNote, "title" | "content">>;
type SaveState = "pending" | "saving" | "saved" | "error";
const AUTOSAVE_DELAY_MS = 900;

export default function QuickNotes({ requestedId }: { requestedId?: string | null }) {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminNote | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const pending = useRef(new Map<string, NotePatch>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saving = useRef(new Map<string, Promise<void>>());
  const failed = useRef(new Set<string>());
  const deleting = useRef(new Set<string>());
  const appliedRequestedId = useRef<string | null>(null);

  // Keep all changed fields together and serialize writes for each note.
  const saveNote = useCallback(async function save(id: string): Promise<void> {
    if (saving.current.has(id)) return saving.current.get(id);
    const patch = pending.current.get(id);
    if (!patch) return;
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    pending.current.delete(id);
    failed.current.delete(id);
    setSaveStates((prev) => ({ ...prev, [id]: "saving" }));
    const request = updateNote(id, patch)
      .then((updated) => {
        if (!failed.current.size) setError(null);
        setNotes((prev) => prev.map((note) => note.id === id ? { ...note, updated_at: updated.updated_at } : note));
        setSaveStates((prev) => ({ ...prev, [id]: pending.current.has(id) ? "pending" : "saved" }));
      })
      .catch((err: Error) => {
        pending.current.set(id, { ...patch, ...pending.current.get(id) });
        failed.current.add(id);
        setSaveStates((prev) => ({ ...prev, [id]: "error" }));
        setError(err.message || "Não foi possível salvar a nota. Tente novamente.");
      })
      .finally(() => {
        saving.current.delete(id);
        if (pending.current.has(id) && !failed.current.has(id)) void save(id);
      });
    saving.current.set(id, request);
    return request;
  }, []);

  useEffect(() => {
    if (!requestedId) { appliedRequestedId.current = null; return; }
    if (appliedRequestedId.current === requestedId || !notes.some((note) => note.id === requestedId)) return;
    appliedRequestedId.current = requestedId;
    setSelectedId(requestedId);
    setQuery("");
  }, [requestedId, notes]);

  useEffect(() => {
    listNotes().then((list) => {
      setNotes((current) => [...current, ...list.filter((note) => !current.some((existing) => existing.id === note.id))]);
      setSelectedId((current) => current ?? list[0]?.id ?? null);
    }).catch((err: Error) => setError(err.message)).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const onCaptured = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string; item: AdminNote }>).detail;
      if (detail?.type !== "note") return;
      setNotes((prev) => prev.some((note) => note.id === detail.item.id) ? prev : [detail.item, ...prev]);
      setSelectedId((current) => current ?? detail.item.id);
    };
    window.addEventListener("admin-workspace-entry-created", onCaptured);
    return () => window.removeEventListener("admin-workspace-entry-created", onCaptured);
  }, []);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (pending.current.size || saving.current.size) {
        [...pending.current.keys()].forEach((id) => { void saveNote(id); });
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
      timers.current.forEach(clearTimeout);
      pending.current.forEach((_, id) => { void saveNote(id); });
    };
  }, [saveNote]);

  useEffect(() => {
    const beforeLeave = (event: Event) => {
      const detail = (event as CustomEvent<{ pending: Promise<void>[] }>).detail;
      if (!detail?.pending) return;
      detail.pending.push((async () => {
        let ids = [...new Set([...pending.current.keys(), ...saving.current.keys()])];
        while (ids.length) {
          await Promise.all(ids.map((id) => saveNote(id)));
          if (failed.current.size) throw new Error("Há notas que ainda não foram salvas.");
          ids = [...new Set([...pending.current.keys(), ...saving.current.keys()])];
        }
        if (failed.current.size) throw new Error("Há notas que ainda não foram salvas.");
      })());
    };
    window.addEventListener("admin-workspace-before-leave", beforeLeave);
    return () => window.removeEventListener("admin-workspace-before-leave", beforeLeave);
  }, [saveNote]);

  const selected = notes.find((note) => note.id === selectedId) ?? null;
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return notes.filter((note) => `${note.title ?? ""} ${note.content}`.toLocaleLowerCase("pt-BR").includes(term))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [notes, query]);
  const state = selected ? saveStates[selected.id] ?? "saved" : "saved";
  const words = selected?.content.trim().split(/\s+/).filter(Boolean).length ?? 0;

  const editSelected = (patch: NotePatch) => {
    if (!selected || deleting.current.has(selected.id)) return;
    const id = selected.id;
    setNotes((prev) => prev.map((note) => note.id === id ? { ...note, ...patch } : note));
    pending.current.set(id, { ...pending.current.get(id), ...patch });
    failed.current.delete(id);
    setSaveStates((prev) => ({ ...prev, [id]: "pending" }));
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => { void saveNote(id); }, AUTOSAVE_DELAY_MS));
  };

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await createNote({ title: "Nova nota" });
      setNotes((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setQuery("");
    } catch (err) { setError((err as Error).message); }
    finally { setIsCreating(false); }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    if (deleting.current.has(id)) return;
    deleting.current.add(id);
    let retained: NotePatch = { title: pendingDelete.title, content: pendingDelete.content };
    setPendingDelete(null);
    clearTimeout(timers.current.get(id));
    pending.current.delete(id);
    try {
      await saving.current.get(id);
      retained = { ...retained, ...pending.current.get(id) };
      pending.current.delete(id);
      await deleteNote(id);
      failed.current.delete(id);
      timers.current.delete(id);
      setSaveStates((prev) => { const next = { ...prev }; delete next[id]; return next; });
      setNotes((prev) => prev.filter((note) => note.id !== id));
      if (selectedId === id) setSelectedId(notes.find((note) => note.id !== id)?.id ?? null);
    } catch (err) {
      pending.current.set(id, { ...retained, ...pending.current.get(id) });
      failed.current.add(id);
      setSaveStates((prev) => ({ ...prev, [id]: "error" }));
      setError((err as Error).message);
    } finally { deleting.current.delete(id); }
  };

  if (isLoading) return <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Abrindo seu caderno…</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Um lugar para suas ideias.</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Capture agora. Conecte os pontos depois.</p></div>
        <button type="button" onClick={handleCreate} disabled={isCreating} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:opacity-60">
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Nova nota
        </button>
      </div>
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><span>{error}</span>{failed.current.size > 0 && <button type="button" onClick={() => { setError(null); [...failed.current].forEach((id) => { void saveNote(id); }); }} className="flex items-center gap-1 font-semibold"><RotateCw className="h-3.5 w-3.5" />Tentar novamente</button>}</div>}
      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/30 lg:border-b-0 lg:border-r">
          <div className="p-4">
            <label className="relative block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nas notas…" aria-label="Buscar nas notas" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
            <div className="mt-5 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400"><span>Seu caderno</span><span>{notes.length}</span></div>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto px-3 pb-4 lg:max-h-[540px]">
            {visible.map((note) => <button key={note.id} type="button" onClick={() => setSelectedId(note.id)} aria-pressed={note.id === selectedId} className={`group block w-full rounded-xl border p-3.5 text-left transition ${note.id === selectedId ? "border-indigo-200 bg-white shadow-sm dark:border-indigo-800 dark:bg-indigo-950/40" : "border-transparent hover:bg-white dark:hover:bg-slate-800"}`}>
              <div className="flex items-center gap-2"><NotebookPen className={`h-3.5 w-3.5 shrink-0 ${note.id === selectedId ? "text-indigo-500" : "text-slate-400"}`} /><span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{note.title || "Sem título"}</span>{saveStates[note.id] === "error" && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" title="Ainda não salva" />}</div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{note.content || "Uma página em branco, muitas possibilidades."}</p>
              <span className="mt-3 block text-[10px] text-slate-400">{new Date(note.updated_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}</span>
            </button>)}
            {visible.length === 0 && <p className="px-3 py-6 text-center text-xs leading-relaxed text-slate-400">{query ? "Nenhuma nota com esse termo." : "Suas ideias vão morar aqui."}</p>}
          </div>
        </aside>
        <section className="flex min-h-[480px] min-w-0 flex-col">
          {selected ? <>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800 sm:px-7">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400" role="status">{state === "saving" || state === "pending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : state === "error" ? <RotateCw className="h-3.5 w-3.5 text-rose-500" /> : <Check className="h-3.5 w-3.5 text-emerald-500" />}{state === "saving" ? "Salvando…" : state === "pending" ? "Alterações pendentes" : state === "error" ? "Não salva · tente novamente" : "Todas as alterações salvas"}</span>
              <button type="button" onClick={() => setPendingDelete(selected)} aria-label="Excluir nota" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-1 flex-col px-5 pb-5 pt-7 sm:px-7"><input key={selected.id} value={selected.title || ""} onChange={(event) => editSelected({ title: event.target.value })} placeholder="Dê um nome à ideia" aria-label="Título da nota" className="mb-5 w-full border-0 bg-transparent text-2xl font-bold tracking-tight text-slate-900 outline-none placeholder:text-slate-300 dark:text-white dark:placeholder:text-slate-600" /><textarea value={selected.content} onChange={(event) => editSelected({ content: event.target.value })} placeholder="O que está passando pela sua cabeça?" aria-label="Conteúdo da nota" rows={14} className="min-h-72 w-full flex-1 resize-y border-0 bg-transparent text-sm leading-7 text-slate-600 outline-none placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-600" /></div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800 sm:px-7"><span>{words} {words === 1 ? "palavra" : "palavras"}</span><span>Salvamento automático</span></div>
          </> : <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/50"><NotebookPen className="h-7 w-7" strokeWidth={1.5} /></div><h3 className="text-lg font-bold text-slate-800 dark:text-white">Grandes ideias começam com uma nota.</h3><p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">Uma referência, uma descoberta ou algo que você não quer esquecer.</p><button type="button" onClick={handleCreate} disabled={isCreating} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 disabled:opacity-60 dark:text-indigo-400">Escrever minha primeira nota<ArrowUpRight className="h-4 w-4" /></button></div>}
        </section>
      </div>
      <ConfirmModal isOpen={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} onConfirm={confirmDelete} title="Excluir nota" message={`"${pendingDelete?.title || "Sem título"}" será removida permanentemente.`} confirmText="Excluir" />
    </div>
  );
}
