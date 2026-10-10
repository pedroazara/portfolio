import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Languages, Loader2, RefreshCw, Sparkles, Sunrise } from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";
import {
  DailyUpdate,
  fetchDailyUpdates,
  kindLabel,
  markDailyUpdatesRead,
  todayKey,
} from "../../lib/dailyUpdatesService";

/**
 * Aba "Atualizações" do painel: tudo o que chega a cada manhã, numa linha do
 * tempo por dia. A primeira série é a dica de inglês, publicada por um agente
 * pelo servidor MCP `painel` (mcp/painel).
 *
 * Abrir a aba marca as novas como lidas; o selo "Nova" continua visível até
 * você sair, para não sumir no instante em que aparece.
 */

const KIND_ICON: Record<string, typeof Sparkles> = { ingles: Languages };

function dayLabel(day: string): string {
  // Meio-dia evita que o fuso puxe a data para o dia anterior.
  return new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function UpdateCard({ update, fresh, featured }: { update: DailyUpdate; fresh: boolean; featured?: boolean }) {
  const Icon = KIND_ICON[update.kind] ?? Sparkles;
  return (
    <article
      className={`rounded-2xl border bg-white shadow-sm dark:bg-slate-900 ${
        featured ? "border-indigo-200 p-6 ring-4 ring-indigo-500/5 dark:border-indigo-900/70" : "border-slate-200 p-5 dark:border-slate-800"
      }`}
    >
      <header className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {kindLabel(update.kind)}
            {fresh && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                Nova
              </span>
            )}
          </span>
          <h3 className={`mt-1 font-bold tracking-tight text-slate-900 dark:text-white ${featured ? "text-xl" : "text-base"}`}>{update.title}</h3>
        </div>
      </header>
      {update.content.trim() && (
        <MarkdownRenderer
          content={update.content}
          className={`mt-4 space-y-2 text-slate-600 dark:text-slate-300 ${featured ? "text-base" : "text-sm"}`}
        />
      )}
    </article>
  );
}

export default function DailyUpdatesPanel() {
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  // As que chegaram não lidas nesta visita: mantêm o selo "Nova" na tela.
  const fresh = useRef(new Set<string>());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchDailyUpdates();
      const unread = list.filter((update) => !update.read_at).map((update) => update.id);
      unread.forEach((id) => fresh.current.add(id));
      setUpdates(list);
      // Falhar ao marcar como lida não deve esconder o conteúdo.
      markDailyUpdatesRead(unread).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kinds = useMemo(() => [...new Set(updates.map((update) => update.kind))], [updates]);
  const visible = useMemo(() => (kind ? updates.filter((update) => update.kind === kind) : updates), [updates, kind]);
  const today = todayKey();
  const todays = visible.filter((update) => update.day === today);
  const earlier = useMemo(() => {
    const groups: { day: string; items: DailyUpdate[] }[] = [];
    for (const update of visible) {
      if (update.day === today) continue;
      if (groups[groups.length - 1]?.day !== update.day) groups.push({ day: update.day, items: [] });
      groups[groups.length - 1].items.push(update);
    }
    return groups;
  }, [visible, today]);

  if (loading && !updates.length) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando as atualizações…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Para começar o dia</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">O que chegou hoje e o histórico de cada série, do mais recente ao mais antigo.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </p>
      )}

      {kinds.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por série">
          {[null, ...kinds].map((key) => (
            <button
              key={key ?? "todas"}
              type="button"
              aria-pressed={kind === key}
              onClick={() => setKind(key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                kind === key
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                  : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
              }`}
            >
              {key ? kindLabel(key) : "Todas"}
            </button>
          ))}
        </div>
      )}

      {!error && (
        <section aria-label="Hoje">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Hoje · {dayLabel(today)}</h3>
          {todays.length ? (
            <div className="grid max-w-3xl gap-4">
              {todays.map((update) => (
                <UpdateCard key={update.id} update={update} fresh={fresh.current.has(update.id)} featured />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40">
                <Sunrise className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">Nada chegou hoje ainda.</h4>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                As atualizações da manhã aparecem aqui assim que forem publicadas.
              </p>
            </div>
          )}
        </section>
      )}

      {earlier.map((group) => (
        <section key={group.day} aria-label={dayLabel(group.day)}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{dayLabel(group.day)}</h3>
          <div className="grid max-w-3xl gap-3">
            {group.items.map((update) => (
              <UpdateCard key={update.id} update={update} fresh={fresh.current.has(update.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
