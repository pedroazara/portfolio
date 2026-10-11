import React from "react";
import { CalendarDays, Check, Inbox, Languages, Sparkles } from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";
import { DailyUpdate, kindLabel } from "../../lib/dailyUpdatesService";

/** Ícone e cor de cada série; as desconhecidas usam o padrão. */
export const KIND_STYLE: Record<string, { icon: typeof Sparkles; badge: string; dot: string }> = {
  agenda: {
    icon: CalendarDays,
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  ingles: {
    icon: Languages,
    badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
};
const DEFAULT_STYLE = {
  icon: Sparkles,
  badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  dot: "bg-slate-400",
};
export const kindStyle = (kind: string) => KIND_STYLE[kind] ?? DEFAULT_STYLE;

/** "sábado, 10 de outubro". Meio-dia evita que o fuso puxe a data para o dia anterior. */
export function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

interface Props {
  update: DailyUpdate;
  featured?: boolean;
  /** Mostra a data no cabeçalho (nas áreas, onde os cartões não vêm agrupados por dia). */
  showDay?: boolean;
  /** Presente quando o item está na caixa de entrada: o botão OK o guarda na área. */
  onDone?: () => void;
  busy?: boolean;
}

export default function DailyUpdateCard({ update, featured, showDay, onDone, busy }: Props) {
  const { icon: Icon, badge } = kindStyle(update.kind);
  const inInbox = !update.read_at;
  return (
    <article
      className={`rounded-2xl border bg-white shadow-sm transition dark:bg-slate-900 ${
        featured ? "border-indigo-200 p-6 ring-4 ring-indigo-500/5 dark:border-indigo-900/70" : "border-slate-200 p-5 dark:border-slate-800"
      }`}
    >
      <header className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${badge}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {kindLabel(update.kind)}
            {showDay && <span className="normal-case tracking-normal">· {dayLabel(update.day)}</span>}
            {showDay && inInbox && !onDone && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Inbox className="h-3 w-3" /> Na caixa de entrada
              </span>
            )}
          </span>
          <h3 className={`mt-1 font-bold tracking-tight text-slate-900 dark:text-white ${featured ? "text-xl" : "text-base"}`}>
            {update.title}
          </h3>
        </div>
        {onDone && inInbox && (
          <button
            type="button"
            onClick={onDone}
            disabled={busy}
            aria-label={`OK, guardar em ${kindLabel(update.kind)}`}
            title={`Guardar em ${kindLabel(update.kind)}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <Check className="h-4 w-4" />
            OK
          </button>
        )}
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
