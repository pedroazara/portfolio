import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type Transition } from "motion/react";
import { CalendarCheck2, Clock3, MapPin, Maximize2, Sparkles, X } from "lucide-react";
import { AgendaEvent, DailyUpdate, parseAgenda } from "../../lib/dailyUpdatesService";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import MarkdownRenderer from "../MarkdownRenderer";

/**
 * Topo da área Agenda: o dia de hoje num card grande e a prévia de amanhã ao
 * lado. Clicar na prévia expande o card de amanhã, com uma transição de
 * layout (o mesmo card cresce até o centro da tela).
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

function minutesUntil(now: string, time: string) {
  const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  return toMinutes(time) - toMinutes(now);
}

function untilLabel(minutes: number) {
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `em ${hours}h${String(rest).padStart(2, "0")}` : `em ${hours}h`;
}

/** Linha do tempo de compromissos. `tone` escolhe as cores do fundo onde ela fica. */
function Timeline({ events, now, tone }: { events: AgendaEvent[]; now?: string; tone: "hero" | "card" }) {
  const hero = tone === "hero";
  return (
    <ol className="relative space-y-1">
      {events.map((event, index) => {
        const past = Boolean(now && !event.allDay && (event.end ?? event.start)! <= now);
        return (
          <li
            key={`${event.time}-${index}`}
            className={`grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-2xl px-3 py-2.5 transition sm:grid-cols-[6.5rem_minmax(0,1fr)] ${
              past ? "opacity-55" : ""
            } ${hero ? "hover:bg-white/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
          >
            <span className={`pt-0.5 text-sm font-semibold tabular-nums ${hero ? "text-white/80" : "text-slate-500 dark:text-slate-400"}`}>
              {event.allDay ? "Dia inteiro" : event.end ? `${event.start}–${event.end}` : event.start}
            </span>
            <span className="min-w-0">
              <span className={`block font-semibold ${hero ? "text-white" : "text-slate-800 dark:text-white"}`}>
                {event.title}
              </span>
              {event.place && (
                <span className={`mt-0.5 flex items-center gap-1 truncate text-xs ${hero ? "text-white/70" : "text-slate-400"}`}>
                  <MapPin className="h-3 w-3 shrink-0" />
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

function TodayCard({ day, update }: { day: string; update?: DailyUpdate }) {
  const now = useNow();
  const { events, notes } = parseAgenda(update?.content ?? "");
  const current = events.find((event) => !event.allDay && event.start && event.start <= now && (event.end ?? event.start) > now);
  const next = events.find((event) => !event.allDay && event.start && event.start > now);
  const highlight = current ?? next;

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

        {highlight && (
          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-white/15 p-4 ring-1 ring-inset ring-white/20 backdrop-blur">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
              <Clock3 className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/70">
                {current ? "Agora" : `Próximo · ${untilLabel(minutesUntil(now, highlight.start!))}`}
              </span>
              <span className="block truncate text-lg font-bold">{highlight.title}</span>
              <span className="block text-sm text-white/75">
                {highlight.end ? `${highlight.start}–${highlight.end}` : highlight.start}
                {highlight.place ? ` · ${highlight.place}` : ""}
              </span>
            </span>
          </div>
        )}

        <div className="mt-5">
          {events.length > 0 ? (
            <Timeline events={events} now={now} tone="hero" />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-5">
              <Sparkles className="h-6 w-6 shrink-0 text-white/80" />
              <p className="text-sm leading-relaxed text-white/85">
                {update
                  ? "Nenhum compromisso na agenda. Dia livre para os seus projetos."
                  : "O resumo de hoje chega de manhã. Enquanto isso, a agenda ao vivo está logo abaixo."}
              </p>
            </div>
          )}
          {notes && <MarkdownRenderer content={notes} className="mt-4 space-y-2 text-sm text-white/85" />}
        </div>
      </div>
    </section>
  );
}

function TomorrowContent({ day, update, expanded }: { day: string; update?: DailyUpdate; expanded: boolean }) {
  const { events, notes } = parseAgenda(update?.content ?? "");
  const shown = expanded ? events : events.slice(0, 3);
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
      <div className="mt-4">
        {shown.length > 0 ? (
          expanded ? (
            <Timeline events={shown} tone="card" />
          ) : (
            <ul className="space-y-2">
              {shown.map((event, index) => (
                <li key={index} className="flex min-w-0 items-baseline gap-2 text-sm">
                  <span className="shrink-0 font-semibold tabular-nums text-slate-400">{event.allDay ? "Dia todo" : event.start}</span>
                  <span className="truncate text-slate-700 dark:text-slate-200">{event.title}</span>
                </li>
              ))}
              {events.length > shown.length && <li className="text-xs text-slate-400">+{events.length - shown.length} mais</li>}
            </ul>
          )
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
}: {
  today: string;
  tomorrow: string;
  todayUpdate?: DailyUpdate;
  tomorrowUpdate?: DailyUpdate;
}) {
  const [open, setOpen] = useState(false);
  const reduced = usePrefersReducedMotion();
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const layoutId = reduced ? undefined : "agenda-amanha";

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const button = trigger.current;
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [open]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <TodayCard day={today} update={todayUpdate} />

      <motion.button
        ref={trigger}
        type="button"
        layoutId={layoutId}
        transition={SPRING}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Ver amanhã, ${longDate(tomorrow)}`}
        whileHover={reduced ? undefined : { y: -3 }}
        whileTap={reduced ? undefined : { scale: 0.98 }}
        style={{ borderRadius: 28, visibility: open && layoutId ? "hidden" : "visible" }}
        className="group relative flex h-full flex-col items-start overflow-hidden border border-slate-200 bg-white p-6 text-left shadow-sm transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
      >
        <TomorrowContent day={tomorrow} update={tomorrowUpdate} expanded={false} />
        <span className="mt-auto flex w-full items-center justify-between pt-5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
          Toque para ver o dia
          <Maximize2 className="h-4 w-4 transition group-hover:scale-110" />
        </span>
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setOpen(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={`Amanhã, ${longDate(tomorrow)}`}
                layoutId={layoutId}
                transition={SPRING}
                initial={layoutId ? undefined : { opacity: 0 }}
                animate={layoutId ? undefined : { opacity: 1 }}
                exit={layoutId ? undefined : { opacity: 0 }}
                style={{ borderRadius: 28 }}
                className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8"
              >
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: reduced ? 0 : 0.15, duration: 0.3 } }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                >
                  <TomorrowContent day={tomorrow} update={tomorrowUpdate} expanded />
                </motion.div>
                <button
                  ref={closeButton}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
