import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Eye, PenLine, FileText, Search, Download, Check, Loader2, RotateCw, ArrowUpRight, Clock3 } from "lucide-react";
import ArticleContentEditor from "./ArticleContentEditor";
import MarkdownRenderer from "./MarkdownRenderer";
import ConfirmModal from "./ConfirmModal";
import { AdminDraft, listDrafts, createDraft, updateDraft, deleteDraft } from "../lib/adminToolsService";

type DraftPatch = Partial<Pick<AdminDraft, "title" | "content" | "tags">>;
type SaveState = "pending" | "saving" | "saved" | "error";
const AUTOSAVE_DELAY_MS = 1200;

function relativeTime(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 1440) return `há ${Math.floor(minutes / 60)} h`;
  if (minutes < 10080) return `há ${Math.floor(minutes / 1440)} d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function wordCount(text: string): number { return text.trim() ? text.trim().split(/\s+/).length : 0; }

export default function DraftsPanel({ requestedId }: { requestedId?: string | null }) {
  const [drafts, setDrafts] = useState<AdminDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"edit" | "preview">("preview");
  const [pendingDelete, setPendingDelete] = useState<AdminDraft | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const pending = useRef(new Map<string, DraftPatch>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saving = useRef(new Map<string, Promise<void>>());
  const failed = useRef(new Set<string>());
  const deleting = useRef(new Set<string>());
  const appliedRequestedId = useRef<string | null>(null);

  // Merge title, text and tags; never let an older request overwrite a newer edit.
  const saveDraft = useCallback(async function save(id: string): Promise<void> {
    if (saving.current.has(id)) return saving.current.get(id);
    const patch = pending.current.get(id);
    if (!patch) return;
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    pending.current.delete(id);
    failed.current.delete(id);
    setSaveStates((prev) => ({ ...prev, [id]: "saving" }));
    const request = updateDraft(id, patch)
      .then((updated) => {
        if (!failed.current.size) setError(null);
        setDrafts((prev) => prev.map((draft) => draft.id === id ? { ...draft, updated_at: updated.updated_at } : draft));
        setSaveStates((prev) => ({ ...prev, [id]: pending.current.has(id) ? "pending" : "saved" }));
      })
      .catch((err: Error) => {
        pending.current.set(id, { ...patch, ...pending.current.get(id) });
        failed.current.add(id);
        setSaveStates((prev) => ({ ...prev, [id]: "error" }));
        setError(err.message || "Não foi possível salvar o rascunho. Tente novamente.");
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
    if (appliedRequestedId.current === requestedId) return;
    const requested = drafts.find((draft) => draft.id === requestedId);
    if (!requested) return;
    appliedRequestedId.current = requestedId;
    setSelectedId(requestedId);
    setTagsText(requested.tags.join(", "));
    setView("preview");
    setQuery("");
  }, [requestedId, drafts]);

  useEffect(() => {
    listDrafts().then((list) => {
      setDrafts(list); setSelectedId(list[0]?.id ?? null); setTagsText(list[0]?.tags.join(", ") ?? "");
    }).catch((err: Error) => setError(err.message)).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (pending.current.size || saving.current.size) {
        [...pending.current.keys()].forEach((id) => { void saveDraft(id); });
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
      timers.current.forEach(clearTimeout);
      pending.current.forEach((_, id) => { void saveDraft(id); });
    };
  }, [saveDraft]);

  useEffect(() => {
    const beforeLeave = (event: Event) => {
      const detail = (event as CustomEvent<{ pending: Promise<void>[] }>).detail;
      if (!detail?.pending) return;
      detail.pending.push((async () => {
        let ids = [...new Set([...pending.current.keys(), ...saving.current.keys()])];
        while (ids.length) {
          await Promise.all(ids.map((id) => saveDraft(id)));
          if (failed.current.size) throw new Error("Há rascunhos que ainda não foram salvos.");
          ids = [...new Set([...pending.current.keys(), ...saving.current.keys()])];
        }
        if (failed.current.size) throw new Error("Há rascunhos que ainda não foram salvos.");
      })());
    };
    window.addEventListener("admin-workspace-before-leave", beforeLeave);
    return () => window.removeEventListener("admin-workspace-before-leave", beforeLeave);
  }, [saveDraft]);

  const selected = drafts.find((draft) => draft.id === selectedId) ?? null;
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return drafts.filter((draft) => `${draft.title} ${draft.content} ${draft.tags.join(" ")}`.toLocaleLowerCase("pt-BR").includes(term))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [drafts, query]);
  const state = selected ? saveStates[selected.id] ?? "saved" : "saved";
  const words = selected ? wordCount(selected.content) : 0;

  const selectDraft = (draft: AdminDraft) => { setSelectedId(draft.id); setTagsText(draft.tags.join(", ")); setView("preview"); };
  const editSelected = (patch: DraftPatch) => {
    if (!selected || deleting.current.has(selected.id)) return;
    const id = selected.id;
    setDrafts((prev) => prev.map((draft) => draft.id === id ? { ...draft, ...patch } : draft));
    pending.current.set(id, { ...pending.current.get(id), ...patch });
    failed.current.delete(id);
    setSaveStates((prev) => ({ ...prev, [id]: "pending" }));
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => { void saveDraft(id); }, AUTOSAVE_DELAY_MS));
  };
  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true); setError(null);
    try {
      const created = await createDraft({});
      setDrafts((prev) => [created, ...prev]); setSelectedId(created.id); setTagsText(""); setQuery(""); setView("edit");
    } catch (err) { setError((err as Error).message); }
    finally { setIsCreating(false); }
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    if (deleting.current.has(id)) return;
    deleting.current.add(id);
    let retained: DraftPatch = { title: pendingDelete.title, content: pendingDelete.content, tags: pendingDelete.tags };
    setPendingDelete(null); clearTimeout(timers.current.get(id)); pending.current.delete(id);
    try {
      await saving.current.get(id);
      retained = { ...retained, ...pending.current.get(id) };
      pending.current.delete(id);
      await deleteDraft(id);
      failed.current.delete(id);
      timers.current.delete(id);
      setSaveStates((prev) => { const next = { ...prev }; delete next[id]; return next; });
      setDrafts((prev) => prev.filter((draft) => draft.id !== id));
      if (selectedId === id) {
        const next = drafts.find((draft) => draft.id !== id);
        setSelectedId(next?.id ?? null); setTagsText(next?.tags.join(", ") ?? ""); setView("preview");
      }
    } catch (err) {
      pending.current.set(id, { ...retained, ...pending.current.get(id) });
      failed.current.add(id);
      setSaveStates((prev) => ({ ...prev, [id]: "error" }));
      setError((err as Error).message);
    } finally { deleting.current.delete(id); }
  };
  const exportDraft = () => {
    if (!selected) return;
    const content = `# ${selected.title || "Sem título"}\n\n${selected.content}\n`;
    const objectUrl = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${selected.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "rascunho"}.md`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  if (isLoading) return <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Preparando seu espaço de escrita…</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Da ideia ao próximo artigo.</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Um espaço tranquilo para dar forma ao que você sabe.</p></div><button type="button" onClick={handleCreate} disabled={isCreating} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:opacity-60">{isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Novo rascunho</button></div>
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><span>{error}</span>{failed.current.size > 0 && <button type="button" onClick={() => { setError(null); [...failed.current].forEach((id) => { void saveDraft(id); }); }} className="flex items-center gap-1 font-semibold"><RotateCw className="h-3.5 w-3.5" />Tentar novamente</button>}</div>}
      <div className="grid items-start gap-5 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="p-1"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar rascunhos…" aria-label="Buscar rascunhos" className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/40 dark:text-white" /></label><div className="mb-3 mt-5 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400"><span>Em construção</span><span>{drafts.length}</span></div></div>
          <div className="max-h-72 space-y-1 overflow-y-auto xl:max-h-[600px]">{visible.map((draft) => <button key={draft.id} type="button" onClick={() => selectDraft(draft)} aria-pressed={draft.id === selectedId} className={`block w-full rounded-xl border p-3.5 text-left transition ${draft.id === selectedId ? "border-indigo-100 bg-indigo-50/70 dark:border-indigo-900 dark:bg-indigo-950/40" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800"}`}><div className="flex items-center gap-2"><FileText className={`h-3.5 w-3.5 shrink-0 ${draft.id === selectedId ? "text-indigo-500" : "text-slate-400"}`} /><span className="truncate text-sm font-semibold text-slate-800 dark:text-white">{draft.title || "Sem título"}</span>{saveStates[draft.id] === "error" && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" title="Ainda não salvo" />}</div><p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{draft.content.replace(/[#*`>_]/g, "").slice(0, 110) || "Tudo começa com a primeira frase."}</p><div className="mt-3 flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[10px] text-slate-400">{relativeTime(draft.updated_at)}</span>{draft.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-md bg-white/80 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{tag}</span>)}</div></button>)}{visible.length === 0 && <p className="px-3 py-8 text-center text-xs leading-relaxed text-slate-400">{query ? "Nenhum rascunho com esse termo." : "Suas próximas histórias vão aparecer aqui."}</p>}</div>
        </aside>
        <section className="min-h-[520px] min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {!selected ? <div className="flex min-h-[520px] flex-col items-center justify-center px-6 py-16 text-center"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 dark:bg-violet-950/40"><PenLine className="h-7 w-7" strokeWidth={1.5} /></div><h3 className="text-lg font-bold text-slate-800 dark:text-white">Uma página em branco. Muitas possibilidades.</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">Escreva no seu ritmo, experimente ideias e visualize o resultado antes de compartilhar.</p><button type="button" onClick={handleCreate} disabled={isCreating} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 disabled:opacity-60 dark:text-indigo-400">Começar a escrever<ArrowUpRight className="h-4 w-4" /></button></div> : <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-6"><div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-950"><button type="button" onClick={() => setView("edit")} aria-pressed={view === "edit"} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${view === "edit" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}><PenLine className="h-3.5 w-3.5" />Escrever</button><button type="button" onClick={() => setView("preview")} aria-pressed={view === "preview"} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${view === "preview" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}><Eye className="h-3.5 w-3.5" />Prévia</button></div><div className="flex items-center gap-1"><button type="button" onClick={exportDraft} title="Baixar em Markdown" className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Exportar .md</span></button><button type="button" onClick={() => setPendingDelete(selected)} aria-label="Excluir rascunho" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30"><Trash2 className="h-4 w-4" /></button></div></div>
            <div className="p-5 sm:p-7">
              {view === "preview" ? <><div className="mb-7"><span className="text-[10px] font-bold uppercase tracking-[0.17em] text-indigo-500">Rascunho pessoal</span><h2 className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{selected.title || "Sem título"}</h2><div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400"><span>Atualizado {relativeTime(selected.updated_at)}</span>{selected.tags.map((tag) => <span key={tag} className="rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{tag}</span>)}</div></div>{selected.content ? <MarkdownRenderer content={selected.content} className="max-w-none text-sm text-slate-600 dark:text-slate-300" /> : <div className="rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center dark:border-slate-700"><p className="text-sm text-slate-400">Seu texto vai ganhar vida aqui.</p><button type="button" onClick={() => setView("edit")} className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400">Escrever a primeira frase</button></div>}</> : <><label className="sr-only" htmlFor="draft-title">Título do rascunho</label><input id="draft-title" value={selected.title} onChange={(event) => editSelected({ title: event.target.value })} placeholder="Dê um título à sua ideia" className="w-full border-0 bg-transparent text-2xl font-bold tracking-tight text-slate-900 outline-none placeholder:text-slate-300 dark:text-white dark:placeholder:text-slate-600" /><label className="sr-only" htmlFor="draft-tags">Tags separadas por vírgulas</label><input id="draft-tags" value={tagsText} onChange={(event) => { setTagsText(event.target.value); editSelected({ tags: [...new Set(event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))] }); }} placeholder="Adicione tags separadas por vírgula" className="mb-5 mt-3 w-full border-0 border-b border-slate-100 bg-transparent px-0 py-2 text-xs text-slate-500 outline-none placeholder:text-slate-400 focus:border-indigo-300 dark:border-slate-800 dark:text-slate-400" /><ArticleContentEditor key={selected.id} value={selected.content} onChange={(content) => editSelected({ content })} label="" articleTitle={selected.title} rows={16} /></>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800 sm:px-7"><div className="flex items-center gap-3"><span>{words} {words === 1 ? "palavra" : "palavras"}</span>{words > 0 && <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{Math.max(1, Math.ceil(words / 200))} min de leitura</span>}</div><span role="status" className="flex items-center gap-1.5">{state === "saving" || state === "pending" ? <Loader2 className="h-3 w-3 animate-spin" /> : state === "error" ? <RotateCw className="h-3 w-3 text-rose-500" /> : <Check className="h-3 w-3 text-emerald-500" />}{state === "saving" ? "Salvando…" : state === "pending" ? "Alterações pendentes" : state === "error" ? "Não salvo · tente novamente" : "Todas as alterações salvas"}</span></div>
          </>}
        </section>
      </div>
      <ConfirmModal isOpen={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} onConfirm={confirmDelete} title="Excluir rascunho" message={`"${pendingDelete?.title || "Sem título"}" será removido permanentemente.`} confirmText="Excluir" />
    </div>
  );
}
