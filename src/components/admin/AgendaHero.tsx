import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type Transition } from "motion/react";
import { CalendarCheck2, Check, ChevronRight, Flame, Loader2, MapPin, Maximize2, Plus, Sparkles, X } from "lucide-react";
import { AgendaEvent, DailyUpdate, parseAgenda } from "../../lib/dailyUpdatesService";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useTodayHabits } from "../../hooks/useTodayHabits";
import MarkdownRenderer from "../MarkdownRenderer";
import HabitTracker from "../HabitTracker";

/**
 * Topo da área Agenda em Meu espaço: o dia de hoje num card grande (com os
 * compromissos e os hábitos do dia) e a prévia de amanhã ao lado.
 *
 * Clicar na prévia de amanhã, ou num hábito, expande aquele mesmo elemento
 * até o centro da tela com uma transição de layout. O hábito abre com o
 * cartão completo do acompanhamento de hábitos.
 *
 * Os compromissos vêm dos resumos que o agente publica de manhã (série
 * "agenda", um por dia). O Google Agenda ao vivo fica logo abaixo.
 */

const SPRING: Transition = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 };

function longDate(day: string) {
  const label = new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** `HH:MM` agora, em São Paulo. */
function nowTime(): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(),
  );
}

function useNow() {
  const [now, setNow] = useState(nowTime);
  useEffect(() => {
    const id = setInterval(() => setNow(nowTime()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const countLabel = (count: number) => (count === 0 ? "Dia livre" : count === 1 ? "1 compromisso" : `${count} compromissos`);

function untilLabel(now: string, time: string) {
  const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const minutes = toMinutes(time) - toMinutes(now);
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `em ${hours}h${String(rest).padStart(2, "0")}` : `em ${hours}h`;
}

const timeOf = (event: AgendaEvent) => (event.allDay ? "Dia inteiro" : event.end ? `${event.start}–${event.end}` : event.start);

/**
 * Camada que recebe um elemento expandido: fundo desfocado, Esc e clique fora
 * fecham, foco no botão de fechar. Com `layoutId`, o elemento de origem
 * (que tem o mesmo id) cresce até aqui.
 */
function Expanded({
  layoutId,
  label,
  onClose,
  children,
  className = "",
}: {
  layoutId?: string;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        layoutId={layoutId}
        transition={SPRING}
        initial={layoutId ? undefined : { opacity: 0 }}
        animate={layoutId ? undefined : { opacity: 1 }}
        exit={layoutId ? undefined : { opacity: 0 }}
        style={{ borderRadius: 28 }}
        className={`relative max-h-[85vh] w-full overflow-y-auto border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8 ${className}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: reduced ? 0 : 0.15, duration: 0.3 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          {children}
        </motion.div>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </div>
  );
}

/** Compromissos de hoje, em linhas grandes sobre o fundo colorido do card. */
function TodayEvents({ events, now }: { events: AgendaEvent[]; now: string }) {
  const currentIndex = events.findIndex(
    (event) => !event.allDay && event.start && event.start <= now && (event.end ?? event.start) > now,
  );
  const nextIndex = currentIndex >= 0 ? -1 : events.findIndex((event) => !event.allDay && event.start && event.start > now);
  return (
    <ol className="space-y-2">
      {events.map((event, index) => {
        const past = !event.allDay && (event.end ?? event.start)! <= now && index !== currentIndex;
        const current = index === currentIndex;
        const next = index === nextIndex;
        return (
          <li
            key={`${event.time}-${index}`}
            className={`flex flex-col gap-1 rounded-2xl px-4 py-3.5 transition sm:grid sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-start sm:gap-4 ${
              current ? "bg-white text-indigo-950 shadow-lg shadow-indigo-900/20" : "bg-white/10 hover:bg-white/15"
            } ${past ? "opacity-60" : ""}`}
          >
            <span className={`text-sm font-bold tabular-nums sm:pt-0.5 sm:text-base ${current ? "text-indigo-600" : "text-white"}`}>
              {timeOf(event)}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className={`text-lg font-semibold leading-snug ${current ? "text-slate-900" : "text-white"}`}>{event.title}</span>
                {current && (
                  <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    Agora
                  </span>
                )}
                {next && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">
                    Próximo · {untilLabel(now, event.start!)}
                  </span>
                )}
              </span>
              {event.place && (
                <span className={`mt-1 flex items-center gap-1.5 text-sm ${current ? "text-slate-500" : "text-white/80"}`}>
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{event.place}</span>
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Hábitos de hoje dentro do card: marcar o check-in e abrir o hábito. */
function TodayHabits({ onOpenHabits }: { onOpenHabits: () => void }) {
  const { habits, done, pending, loading, error, toggle } = useTodayHabits();
  const [openId, setOpenId] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const opened = habits.find((habit) => habit.id === openId);
  const total = habits.length;
  const count = habits.filter((habit) => done.has(habit.id)).length;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando hábitos…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">
          <Flame className="h-3.5 w-3.5" /> Hábitos de hoje
        </h4>
        {total > 0 && (
          <span className="text-xs font-semibold text-white/80">
            {count} de {total}
          </span>
        )}
      </div>
      {total > 0 && (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Hábitos feitos hoje" aria-valuemin={0} aria-valuemax={total} aria-valuenow={count}>
          <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${(count / total) * 100}%` }} />
        </div>
      )}
      {error && !total && <p className="text-sm text-white/75">Não foi possível carregar os hábitos.</p>}
      {total === 0 && !error ? (
        <button
          type="button"
          onClick={onOpenHabits}
          className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          <Plus className="h-4 w-4" /> Criar meu primeiro hábito
        </button>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {habits.map((habit) => {
            const isDone = done.has(habit.id);
            const layoutId = reduced ? undefined : `habito-${habit.id}`;
            return (
              <motion.li
                key={habit.id}
                layoutId={layoutId}
                transition={SPRING}
                style={{ borderRadius: 16, visibility: openId === habit.id && layoutId ? "hidden" : "visible" }}
                className={`flex min-w-0 items-center gap-1 p-1.5 transition-colors ${isDone ? "bg-white/25" : "bg-white/10 hover:bg-white/15"}`}
              >
                <button
                  type="button"
                  onClick={() => void toggle(habit.id)}
                  disabled={pending.has(habit.id)}
                  aria-pressed={isDone}
                  aria-label={`${isDone ? "Desfazer check-in de" : "Fazer check-in de"} ${habit.name}`}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                    isDone ? "bg-white text-indigo-600" : "border-2 border-white/50 text-transparent hover:border-white"
                  }`}
                >
                  <Check className="h-5 w-5" strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpenId(habit.id)}
                  aria-haspopup="dialog"
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left"
                >
                  <span className="truncate text-sm font-semibold text-white">{habit.name}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/60" />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
      {createPortal(
        <AnimatePresence>
          {opened && (
            <Expanded
              key={opened.id}
              layoutId={reduced ? undefined : `habito-${opened.id}`}
              label={opened.name}
              onClose={() => setOpenId(null)}
              className="max-w-xl"
            >
              <div className="pr-10">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-500 dark:text-violet-300">Hábito</span>
              </div>
              <div className="mt-3">
                <HabitTracker focusHabitId={opened.id} />
              </div>
            </Expanded>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function TodayCard({ day, update, onOpenHabits }: { day: string; update?: DailyUpdate; onOpenHabits: () => void }) {
  const now = useNow();
  const { events, notes } = parseAgenda(update?.content ?? "");

  return (
    <section
      aria-label="Hoje"
      className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-indigo-500/20 sm:p-8"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Hoje</span>
            <h3 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{longDate(day)}</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <CalendarCheck2 className="h-3.5 w-3.5" />
            {update ? countLabel(events.length) : "Resumo a caminho"}
          </span>
        </div>

        <div className="mt-6">
          {events.length > 0 ? (
            <TodayEvents events={events} now={now} />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-5">
              <Sparkles className="h-6 w-6 shrink-0 text-white/80" />
              <p className="text-base leading-relaxed text-white/90">
                {update
                  ? "Nenhum compromisso na agenda. Dia livre para os seus projetos."
                  : "Os compromissos de hoje chegam com o resumo da manhã. Enquanto isso, a agenda ao vivo está logo abaixo."}
              </p>
            </div>
          )}
          {notes && <MarkdownRenderer content={notes} className="mt-4 space-y-2 text-sm text-white/85" />}
        </div>

        <div className="mt-7 border-t border-white/15 pt-6">
          <TodayHabits onOpenHabits={onOpenHabits} />
        </div>
      </div>
    </section>
  );
}

function TomorrowContent({ day, update, expanded }: { day: string; update?: DailyUpdate; expanded: boolean }) {
  const { events, notes } = parseAgenda(update?.content ?? "");
  const shown = expanded ? events : events.slice(0, 4);
  return (
    <>
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300">Amanhã</span>
      <h3 className={`mt-1 font-bold tracking-tight text-slate-900 dark:text-white ${expanded ? "text-2xl sm:text-3xl" : "text-lg"}`}>
        {longDate(day)}
      </h3>
      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
        <CalendarCheck2 className="h-3.5 w-3.5" />
        {update ? countLabel(events.length) : "Ainda sem resumo"}
      </span>
      <div className="mt-4 w-full">
        {shown.length > 0 ? (
          <ul className={expanded ? "space-y-2" : "space-y-2.5"}>
            {shown.map((event, index) =>
              expanded ? (
                <li
                  key={index}
                  className="flex flex-col gap-1 rounded-2xl bg-slate-50 px-4 py-3.5 dark:bg-slate-800/60 sm:grid sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4"
                >
                  <span className="text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-300 sm:pt-0.5 sm:text-base">{timeOf(event)}</span>
                  <span className="min-w-0">
                    <span className="block text-lg font-semibold leading-snug text-slate-900 dark:text-white">{event.title}</span>
                    {event.place && (
                      <span className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{event.place}</span>
                      </span>
                    )}
                  </span>
                </li>
              ) : (
                <li key={index} className="flex min-w-0 items-baseline gap-2.5 text-sm">
                  <span className="w-12 shrink-0 font-semibold tabular-nums text-slate-400">{event.allDay ? "Dia" : event.start}</span>
                  <span className="truncate font-medium text-slate-700 dark:text-slate-200">{event.title}</span>
                </li>
              ),
            )}
            {!expanded && events.length > shown.length && (
              <li className="text-xs text-slate-400">+{events.length - shown.length} mais</li>
            )}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-slate-400">
            {update ? "Nada marcado. Amanhã está livre." : "A prévia de amanhã chega junto com o resumo da manhã."}
          </p>
        )}
        {expanded && notes && <MarkdownRenderer content={notes} className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300" />}
      </div>
    </>
  );
}

export default function AgendaHero({
  today,
  tomorrow,
  todayUpdate,
  tomorrowUpdate,
  onOpenHabits,
}: {
  today: string;
  tomorrow: string;
  todayUpdate?: DailyUpdate;
  tomorrowUpdate?: DailyUpdate;
  onOpenHabits: () => void;
}) {
  const [open, setOpen] = useState(false);
  const reduced = usePrefersReducedMotion();
  const layoutId = reduced ? undefined : "agenda-amanha";

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <TodayCard day={today} update={todayUpdate} onOpenHabits={onOpenHabits} />

      <motion.button
        type="button"
        layoutId={layoutId}
        transition={SPRING}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Ver amanhã, ${longDate(tomorrow)}`}
        whileHover={reduced ? undefined : { y: -3 }}
        whileTap={reduced ? undefined : { scale: 0.98 }}
        style={{ borderRadius: 28, visibility: open && layoutId ? "hidden" : "visible" }}
        className="group relative flex flex-col items-start overflow-hidden border border-slate-200 bg-white p-6 text-left shadow-sm transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
      >
        <TomorrowContent day={tomorrow} update={tomorrowUpdate} expanded={false} />
        <span className="mt-6 flex w-full items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-300">
          Toque para ver o dia
          <Maximize2 className="h-4 w-4 transition group-hover:scale-110" />
        </span>
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <Expanded layoutId={layoutId} label={`Amanhã, ${longDate(tomorrow)}`} onClose={() => setOpen(false)} className="max-w-2xl">
              <TomorrowContent day={tomorrow} update={tomorrowUpdate} expanded />
            </Expanded>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
