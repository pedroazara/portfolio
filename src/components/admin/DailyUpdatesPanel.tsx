import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarPlus, CalendarRange, Check, CheckCheck, Inbox, Loader2, RefreshCw, X } from "lucide-react";
import {
  DAILY_UPDATE_KINDS,
  DailyUpdate,
  fetchDailyUpdates,
  kindLabel,
  setDailyUpdatesDone,
  shiftDay,
  todayKey,
} from "../../lib/dailyUpdatesService";
import DailyUpdateCard, { dayLabel, kindStyle } from "./DailyUpdateCard";
import DailyCalendar from "./DailyCalendar";
import GoogleAgendaEmbed from "./GoogleAgendaEmbed";
import NewEventDialog from "./NewEventDialog";
import AgendaHero from "./AgendaHero";

/**
 * Aba "Atualizações" do painel: a caixa de entrada do dia.
 *
 * Tudo o que os agentes publicam de manhã (a dica de inglês, o resumo da
 * agenda...) chega na caixa de entrada. O OK guarda o item na área da série;
 * o calendário mostra o que teve em cada dia. A área Agenda também traz o
 * Google Agenda ao vivo.
 *
 * A área aberta fica na URL (`?area=ingles`), para links e o botão voltar.
 */

const INBOX = "entrada";
const CALENDAR = "calendario";

interface Toast {
  message: string;
  undo?: string[];
}

function groupByDay(items: DailyUpdate[]): { day: string; items: DailyUpdate[] }[] {
  const groups: { day: string; items: DailyUpdate[] }[] = [];
  for (const item of items) {
    if (groups[groups.length - 1]?.day !== item.day) groups.push({ day: item.day, items: [] });
    groups[groups.length - 1].items.push(item);
  }
  return groups;
}

function EmptyState({ icon: Icon, title, children }: { icon: typeof Inbox; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h4 className="text-base font-bold text-slate-800 dark:text-white">{title}</h4>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}

export default function DailyUpdatesPanel() {
  const [params, setParams] = useSearchParams();
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [newEvent, setNewEvent] = useState(false);
  const today = todayKey();
  const [selectedDay, setSelectedDay] = useState(today);
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)),
  }));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUpdates(await fetchDailyUpdates());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  // Áreas: as séries conhecidas sempre (a Agenda tem o calendário ao vivo
  // mesmo sem resumos) e qualquer outra que já tenha chegado.
  const kinds = useMemo(() => {
    const known = Object.keys(DAILY_UPDATE_KINDS);
    const extra = [...new Set(updates.map((update) => update.kind))].filter((kind) => !known.includes(kind));
    return [...known, ...extra];
  }, [updates]);
  const requested = params.get("area") ?? INBOX;
  const area = requested === CALENDAR || kinds.includes(requested) ? requested : INBOX;
  const openArea = (key: string) => {
    const next = new URLSearchParams(params);
    if (key === INBOX) next.delete("area");
    else next.set("area", key);
    setParams(next, { replace: true });
  };

  // Itens com data futura (a prévia da agenda de amanhã) só entram na caixa
  // de entrada quando o dia chega.
  const inbox = useMemo(() => updates.filter((update) => !update.read_at && update.day <= today), [updates, today]);
  const kindsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const update of updates) {
      const list = map.get(update.day) ?? [];
      if (!list.includes(update.kind)) list.push(update.kind);
      map.set(update.day, list);
    }
    return map;
  }, [updates]);

  const setDone = async (ids: string[], done: boolean) => {
    if (!ids.length) return;
    const previous = updates;
    const readAt = done ? new Date().toISOString() : null;
    setBusy((current) => new Set([...current, ...ids]));
    setUpdates((current) => current.map((update) => (ids.includes(update.id) ? { ...update, read_at: readAt } : update)));
    try {
      await setDailyUpdatesDone(ids, done);
      if (!done) {
        setToast({ message: ids.length === 1 ? "De volta à caixa de entrada." : `${ids.length} itens de volta à caixa de entrada.` });
      } else if (ids.length === 1) {
        const kind = previous.find((update) => update.id === ids[0])?.kind ?? "";
        setToast({ message: `Guardada em ${kindLabel(kind)}.`, undo: ids });
      } else {
        setToast({ message: `${ids.length} itens guardados nas áreas.`, undo: ids });
      }
    } catch (err) {
      setUpdates(previous);
      setToast({ message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy((current) => new Set([...current].filter((id) => !ids.includes(id))));
    }
  };

  const card = (update: DailyUpdate, options: { featured?: boolean; showDay?: boolean } = {}) => (
    <DailyUpdateCard
      key={update.id}
      update={update}
      featured={options.featured}
      showDay={options.showDay}
      busy={busy.has(update.id)}
      onDone={update.read_at ? undefined : () => void setDone([update.id], true)}
    />
  );

  const relativeDay = (day: string) =>
    day === today ? `Hoje · ${dayLabel(day)}` : day === shiftDay(today, -1) ? `Ontem · ${dayLabel(day)}` : dayLabel(day);

  const tabs = [
    { key: INBOX, label: "Caixa de entrada", icon: Inbox, count: inbox.length },
    { key: CALENDAR, label: "Calendário", icon: CalendarRange, count: 0 },
    ...kinds.map((kind) => ({ key: kind, label: kindLabel(kind), icon: kindStyle(kind).icon, count: 0 })),
  ];

  if (loading && !updates.length && !error) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando as atualizações…
      </div>
    );
  }

  const sectionTitle = "mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400";
  const kindItems = updates.filter((update) => update.kind === area && update.day <= today);
  const tomorrow = shiftDay(today, 1);
  const agendaOf = (day: string) => updates.find((update) => update.kind === "agenda" && update.day === day);
  const dayItems = updates.filter((update) => update.day === selectedDay);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2" aria-label="Áreas das atualizações">
          {tabs.map(({ key, label, icon: Icon, count }) => {
            const active = area === key;
            return (
              <button
                key={key}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => openArea(key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                    : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {count > 0 && (
                  <span className="rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold leading-5 text-white dark:bg-indigo-500">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
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

      {area === INBOX && !error && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Para começar o dia</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                O que chegou para você. Dê OK e cada item vai para a área dele.
              </p>
            </div>
            {inbox.length > 1 && (
              <button
                type="button"
                onClick={() => void setDone(inbox.map((update) => update.id), true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <CheckCheck className="h-4 w-4" />
                OK em tudo
              </button>
            )}
          </div>
          {inbox.length ? (
            groupByDay(inbox).map((group) => (
              <section key={group.day} aria-label={relativeDay(group.day)}>
                <h3 className={sectionTitle}>{relativeDay(group.day)}</h3>
                <div className="grid max-w-3xl gap-4">
                  {group.items.map((update) => card(update, { featured: group.day === today }))}
                </div>
              </section>
            ))
          ) : (
            <EmptyState icon={CheckCheck} title="Tudo em dia.">
              Nada novo por aqui. O que você já deu OK está nas áreas de cada série e no calendário.
            </EmptyState>
          )}
        </>
      )}

      {area === CALENDAR && !error && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div>
            <DailyCalendar
              year={calendarMonth.year}
              month={calendarMonth.month}
              onMonthChange={(year, month) => setCalendarMonth({ year, month })}
              selected={selectedDay}
              onSelect={setSelectedDay}
              today={today}
              kindsByDay={kindsByDay}
            />
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-slate-400">
              {kinds.map((kind) => (
                <li key={kind} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${kindStyle(kind).dot}`} />
                  {kindLabel(kind)}
                </li>
              ))}
            </ul>
          </div>
          <section aria-label={dayLabel(selectedDay)} className="min-w-0">
            <h3 className={sectionTitle}>{relativeDay(selectedDay)}</h3>
            {dayItems.length ? (
              <div className="grid max-w-3xl gap-4">{dayItems.map((update) => card(update))}</div>
            ) : (
              <EmptyState icon={CalendarRange} title="Nada registrado neste dia.">
                Os dias com pontos no calendário têm atualizações.
              </EmptyState>
            )}
          </section>
        </div>
      )}

      {area !== INBOX && area !== CALENDAR && !error && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{kindLabel(area)}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {DAILY_UPDATE_KINDS[area]?.description ?? "Tudo o que chegou desta série."}
              </p>
            </div>
            {area === "agenda" && (
              <button type="button" className="ws-primary" onClick={() => setNewEvent(true)}>
                <CalendarPlus size={16} /> Novo compromisso
              </button>
            )}
          </div>
          {area === "agenda" && (
            <AgendaHero today={today} tomorrow={tomorrow} todayUpdate={agendaOf(today)} tomorrowUpdate={agendaOf(tomorrow)} />
          )}
          {area === "agenda" && <h3 className={`${sectionTitle} !mb-0`}>Google Agenda ao vivo</h3>}
          {area === "agenda" && <GoogleAgendaEmbed />}
          {area === "agenda" && kindItems.length > 0 && <h3 className={`${sectionTitle} !mb-0`}>Resumos de cada manhã</h3>}
          {kindItems.length ? (
            <div className="grid max-w-3xl gap-4">{kindItems.map((update) => card(update, { showDay: true }))}</div>
          ) : (
            <EmptyState icon={kindStyle(area).icon} title="Nada guardado ainda.">
              {area === "agenda"
                ? "O resumo da sua agenda chega na caixa de entrada toda manhã e, depois do OK, fica guardado aqui."
                : "Quando chegar a primeira, ela aparece na caixa de entrada e, depois do OK, fica guardada aqui."}
            </EmptyState>
          )}
        </>
      )}

      {newEvent && (
        <NewEventDialog
          onClose={() => setNewEvent(false)}
          onOpened={() => {
            setNewEvent(false);
            setToast({ message: "Abrimos o Google Agenda com o evento. Confirme lá em Salvar." });
          }}
        />
      )}

      {toast && (
        <div role="status" className="ws-toast">
          <Check size={18} />
          <span>{toast.message}</span>
          {toast.undo && (
            <span>
              <button
                type="button"
                onClick={() => {
                  const ids = toast.undo ?? [];
                  setToast(null);
                  void setDone(ids, false);
                }}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
              >
                Desfazer
              </button>
            </span>
          )}
          <button type="button" aria-label="Fechar aviso" onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
