import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, ArrowUpRight, Pencil, Search, Bookmark, Copy, Check, Loader2, Tags, Globe2 } from "lucide-react";
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import { AdminLink, listLinks, createLink, updateLink, deleteLink } from "../lib/adminToolsService";

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const accents = ["bg-indigo-50 text-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-400", "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400", "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400", "bg-violet-50 text-violet-500 dark:bg-violet-950/40 dark:text-violet-400"];

function safeUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch { return null; }
}

function domainOf(value: string): string {
  try { return new URL(value).hostname.replace(/^www\./, ""); }
  catch { return value; }
}

export default function LinkVault({ requestedId }: { requestedId?: string | null }) {
  const [links, setLinks] = useState<AdminLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState("recent");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<AdminLink | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const appliedRequestedId = useRef<string | null>(null);

  useEffect(() => {
    if (!requestedId) { appliedRequestedId.current = null; return; }
    if (appliedRequestedId.current === requestedId) return;
    const link = links.find((item) => item.id === requestedId);
    if (!link) return;
    appliedRequestedId.current = requestedId;
    setQuery(""); setActiveTag(null);
    setEditing(link); setUrl(link.url); setTitle(link.title);
    setNotes(link.notes || ""); setTagsInput(link.tags.join(", "));
    setFormError(null); setIsFormOpen(true);
  }, [requestedId, links]);

  useEffect(() => {
    listLinks().then((list) => setLinks((current) => [...current, ...list.filter((link) => !current.some((existing) => existing.id === link.id))]))
      .catch((err: Error) => setError(err.message)).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const onCaptured = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string; item: AdminLink }>).detail;
      if (detail?.type !== "link") return;
      setLinks((prev) => prev.some((link) => link.id === detail.item.id) ? prev : [detail.item, ...prev]);
    };
    window.addEventListener("admin-workspace-entry-created", onCaptured);
    return () => window.removeEventListener("admin-workspace-entry-created", onCaptured);
  }, []);

  useEffect(() => {
    if (!copiedId) return;
    const timer = setTimeout(() => setCopiedId(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedId]);

  const allTags = useMemo(() => [...new Set(links.flatMap((link) => link.tags))].sort((a, b) => a.localeCompare(b, "pt-BR")), [links]);
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return links.filter((link) => (!activeTag || link.tags.includes(activeTag)) && `${link.title} ${link.url} ${link.notes ?? ""} ${link.tags.join(" ")}`.toLocaleLowerCase("pt-BR").includes(term))
      .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title, "pt-BR") : b.created_at.localeCompare(a.created_at));
  }, [links, query, activeTag, sort]);

  const openNew = () => {
    setEditing(null); setUrl(""); setTitle(""); setNotes(""); setTagsInput(""); setFormError(null); setIsFormOpen(true);
  };
  const openEdit = (link: AdminLink) => {
    setEditing(link); setUrl(link.url); setTitle(link.title); setNotes(link.notes || ""); setTagsInput(link.tags.join(", ")); setFormError(null); setIsFormOpen(true);
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    const enteredUrl = url.trim();
    const normalizedUrl = safeUrl(/^[a-z][a-z\d+.-]*:/i.test(enteredUrl) ? enteredUrl : `https://${enteredUrl}`);
    if (!normalizedUrl || !title.trim()) { setFormError("Adicione um título e um endereço válido, começando com https://."); return; }
    const payload = { url: normalizedUrl, title: title.trim(), notes: notes.trim() || null, tags: [...new Set(tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean))] };
    setIsSaving(true); setFormError(null);
    try {
      if (editing) {
        const updated = await updateLink(editing.id, payload);
        setLinks((prev) => prev.map((link) => link.id === updated.id ? updated : link));
      } else {
        const created = await createLink(payload);
        setLinks((prev) => [created, ...prev]);
        setQuery(""); setActiveTag(null);
      }
      setIsFormOpen(false);
    } catch (err) { setFormError((err as Error).message); }
    finally { setIsSaving(false); }
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await deleteLink(id);
      setLinks((prev) => prev.filter((link) => link.id !== id));
      if (activeTag && !links.some((link) => link.id !== id && link.tags.includes(activeTag))) setActiveTag(null);
    } catch (err) { setError((err as Error).message); }
  };
  const copyLink = async (link: AdminLink) => {
    try { await navigator.clipboard.writeText(link.url); setCopiedId(link.id); }
    catch { setError("Não foi possível copiar o endereço. Você pode copiá-lo ao editar o link."); }
  };

  if (isLoading) return <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Organizando sua biblioteca…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Boas referências merecem um lugar.</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sua coleção de descobertas, ferramentas e inspiração.</p></div>
        <button type="button" onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500"><Plus className="h-4 w-4" />Salvar link</button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-56"><Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Encontre uma referência…" aria-label="Buscar links" className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/40 dark:text-white" /></label>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Ordenar links" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-500 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><option value="recent">Mais recentes</option><option value="title">Título: A–Z</option></select>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setActiveTag(null)} aria-pressed={!activeTag} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${!activeTag ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Todos <span className="ml-1.5 opacity-60">{links.length}</span></button>
          {allTags.map((tag) => <button key={tag} type="button" onClick={() => setActiveTag(activeTag === tag ? null : tag)} aria-pressed={activeTag === tag} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${activeTag === tag ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}>{tag}</button>)}
          {!allTags.length && <span className="ml-1 flex items-center gap-1.5 text-xs text-slate-400"><Tags className="h-3.5 w-3.5" />Use tags para criar suas coleções</span>}
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
      {visible.length === 0 ? <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900/40"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 dark:bg-violet-950/40"><Bookmark className="h-7 w-7" strokeWidth={1.5} /></div><h3 className="text-lg font-bold text-slate-800 dark:text-white">{links.length ? "Vamos tentar outra busca?" : "Seu próximo achado começa aqui."}</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{links.length ? "Nenhuma referência corresponde aos filtros selecionados." : "Guarde os links que fazem você pensar, aprender e criar. Tudo organizado por assunto."}</p><button type="button" onClick={links.length ? () => { setQuery(""); setActiveTag(null); } : openNew} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">{links.length ? "Limpar filtros" : "Salvar minha primeira referência"}<ArrowUpRight className="h-4 w-4" /></button></div> : <>
        <div className="flex items-center justify-between text-[11px] text-slate-400"><span>{visible.length} {visible.length === 1 ? "referência" : "referências"}{activeTag ? ` em ${activeTag}` : " na sua biblioteca"}</span><span className="hidden sm:block">Uma coleção feita por você</span></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((link) => {
            const hostname = domainOf(link.url);
            const accent = accents[hostname.length % accents.length];
            return <article key={link.id} className="group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
              <div className="mb-5 flex items-center justify-between gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold ${accent}`}>{hostname ? hostname.charAt(0).toUpperCase() : <Globe2 className="h-5 w-5" />}</div><div className="flex gap-0.5"><button type="button" onClick={() => copyLink(link)} aria-label={copiedId === link.id ? "Link copiado" : `Copiar link: ${link.title}`} title="Copiar endereço" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-indigo-500 dark:hover:bg-slate-800">{copiedId === link.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}</button><button type="button" onClick={() => openEdit(link)} aria-label={`Editar link: ${link.title}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-indigo-500 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setPendingDelete(link)} aria-label={`Excluir link: ${link.title}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30"><Trash2 className="h-3.5 w-3.5" /></button></div></div>
              <a href={safeUrl(link.url) ?? undefined} target="_blank" rel="noopener noreferrer" className="flex items-start justify-between gap-3 text-sm font-bold text-slate-800 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"><span className="line-clamp-2">{link.title}</span><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-indigo-500" /></a>
              <p className="mt-1.5 truncate text-[11px] text-slate-400">{hostname}</p>
              {link.notes && <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{link.notes}</p>}
              <div className="mt-auto flex flex-wrap gap-1.5 pt-5">{link.tags.map((tag) => <button type="button" onClick={() => setActiveTag(tag)} key={tag} className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-950">{tag}</button>)}{!link.tags.length && <span className="py-1 text-[10px] text-slate-400">Adicionado em {new Date(link.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}</span>}</div>
            </article>;
          })}
        </div>
      </>}
      <EditModal isOpen={isFormOpen} onClose={() => { if (!isSaving) setIsFormOpen(false); }} title={editing ? "Editar referência" : "Uma nova descoberta"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-slate-500">Salve o endereço e o que torna essa referência especial.</p>
          {formError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{formError}</p>}
          <div><label htmlFor="vault-url" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Endereço do link</label><input id="vault-url" autoFocus required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://uma-boa-referencia.com" className={fieldClass} /></div>
          <div><label htmlFor="vault-title" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Título</label><input id="vault-title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Como você quer encontrar este link?" className={fieldClass} /></div>
          <div><label htmlFor="vault-notes" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Por que guardar? <span className="font-normal text-slate-400">Opcional</span></label><textarea id="vault-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Uma ideia, um trecho ou o contexto da descoberta…" className={`${fieldClass} resize-y`} /></div>
          <div><label htmlFor="vault-tags" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Tags</label><input id="vault-tags" value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="design, pesquisa, ler depois" className={fieldClass} /><p className="mt-1.5 text-[11px] text-slate-400">Separe por vírgulas para organizar em coleções.</p></div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"><button type="button" disabled={isSaving} onClick={() => setIsFormOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button><button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{isSaving ? "Salvando…" : "Salvar referência"}</button></div>
        </form>
      </EditModal>
      <ConfirmModal isOpen={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} onConfirm={confirmDelete} title="Excluir referência" message={`"${pendingDelete?.title}" será removido da sua biblioteca.`} confirmText="Excluir" />
    </div>
  );
}
