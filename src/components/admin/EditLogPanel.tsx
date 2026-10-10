import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Database, History, Loader2, RefreshCw, UserRound } from "lucide-react";
import {
  AuthorKind,
  EditLogEntry,
  authorOf,
  changeLink,
  describeChange,
  fetchEditLog,
  fieldLabels,
  summarizeAuthors,
} from "../../lib/editLogService";
import { useLocalePath } from "../../lib/routes";

/**
 * Aba "Atividade" do painel: quem editou o portfólio — você, cada agente de
 * IA (pelos servidores MCP) ou scripts — e o que mudou em cada vez.
 */

const KIND_STYLE: Record<AuthorKind, { icon: typeof Bot; badge: string }> = {
  voce: { icon: UserRound, badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" },
  agente: { icon: Bot, badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  sistema: { icon: Database, badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
};

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

function timeAgo(iso: string): string {
  const seconds = (Date.parse(iso) - Date.now()) / 1000;
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [[60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.35, "week"], [12, "month"]];
  let value = seconds;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return relative.format(Math.round(value), unit);
    value /= size;
  }
  return relative.format(Math.round(value), "year");
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

export default function EditLogPanel() {
  const localePath = useLocalePath();
  const [entries, setEntries] = useState<EditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEntries(await fetchEditLog());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const authors = useMemo(() => summarizeAuthors(entries), [entries]);
  const visible = useMemo(
    () => (filter ? entries.filter((entry) => authorOf(entry).key === filter) : entries),
    [entries, filter],
  );

  // Linhas agrupadas por dia, na ordem em que chegaram (mais recentes primeiro).
  const days = useMemo(() => {
    const groups: { label: string; items: EditLogEntry[] }[] = [];
    for (const entry of visible) {
      const label = dayLabel(entry.updated_at);
      if (groups[groups.length - 1]?.label !== label) groups.push({ label, items: [] });
      groups[groups.length - 1].items.push(entry);
    }
    return groups;
  }, [visible]);

  if (loading && !entries.length) {
    return <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando o registro…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Quem mexeu no portfólio</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cada gravação, com o autor: você pelo painel, um agente de IA ou um script.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Atualizar
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{error}</p>}

      {authors.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {authors.map(({ author, edits, saves, sessions, tools, lastAt }) => {
            const { icon: Icon, badge } = KIND_STYLE[author.kind];
            const active = filter === author.key;
            return (
              <button
                key={author.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(active ? null : author.key)}
                className={`flex min-w-0 flex-col rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 dark:bg-slate-900 ${active ? "border-indigo-400 ring-2 ring-indigo-500/15" : "border-slate-200 dark:border-slate-800"}`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${badge}`}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-800 dark:text-white">{author.label}</span>
                    <span className="block truncate text-[11px] text-slate-400">{author.detail}</span>
                  </span>
                </span>
                <span className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {edits} {edits === 1 ? "edição" : "edições"}
                  {author.kind === "voce" && saves > edits ? ` · ${saves} gravações` : ""}
                  {author.kind === "agente" ? ` · ${sessions} ${sessions === 1 ? "sessão" : "sessões"}` : ""}
                  {" · "}última {timeAgo(lastAt)}
                </span>
                {tools.length > 0 && <span className="mt-2 line-clamp-2 text-[10px] text-slate-400">{tools.join(", ")}</span>}
              </button>
            );
          })}
        </div>
      )}

      {!error && entries.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40"><History className="h-7 w-7" strokeWidth={1.5} /></div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Nenhuma edição registrada ainda.</h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">A próxima alteração no portfólio, sua ou de um agente, aparece aqui.</p>
        </div>
      )}

      {days.map((day) => (
        <section key={day.label} aria-label={day.label}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{day.label}</h3>
          <ol className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {day.items.map((entry) => {
              const author = authorOf(entry);
              const { icon: Icon, badge } = KIND_STYLE[author.kind];
              return (
                <li key={entry.id} className="flex gap-3 p-4">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${badge}`} title={author.detail}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
                      <span className="font-bold text-slate-800 dark:text-white">{author.label}</span>
                      {entry.tool && <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{entry.tool}</code>}
                      {entry.session && <span className="text-[10px] text-slate-400" title="Sessão do agente">sessão {entry.session}</span>}
                      <time dateTime={entry.updated_at} title={new Date(entry.updated_at).toLocaleString("pt-BR")} className="ml-auto text-[11px] text-slate-400">
                        {new Date(entry.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {entry.saves > 1 ? ` · ${entry.saves} gravações desde ${new Date(entry.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                      </time>
                    </div>
                    {entry.note && <p className="mt-1 text-sm italic text-slate-600 dark:text-slate-300">“{entry.note}”</p>}
                    <ul className="mt-1.5 space-y-1">
                      {entry.changes.map((change, index) => {
                        const link = changeLink(change);
                        const fields = fieldLabels(change.fields);
                        const text = describeChange(change);
                        return (
                          <li key={index} className="text-sm text-slate-600 dark:text-slate-300">
                            {link ? <Link to={localePath(link)} className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400">{text}</Link> : text}
                            {fields.length > 0 && <span className="text-slate-400"> — {fields.join(", ")}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
