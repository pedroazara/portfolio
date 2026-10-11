import React, { useState } from "react";
import { CalendarDays, ExternalLink, Loader2, LogOut, MapPin, RefreshCw, Settings2 } from "lucide-react";
import { shiftDay } from "../../lib/dailyUpdates";
import { LiveEvent } from "../../lib/googleAgendaService";
import { GoogleAgendaState } from "../../hooks/useGoogleAgenda";

/**
 * Google Agenda ao vivo, abaixo do card de hoje: conectar com a conta Google
 * e, depois, a semana inteira no estilo do painel.
 */

function GoogleMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function dayName(day: string, today: string) {
  if (day === today) return "Hoje";
  if (day === shiftDay(today, 1)) return "Amanhã";
  const label = new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const panel = "rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

interface Props {
  state: GoogleAgendaState;
  events: LiveEvent[];
  error: string;
  refreshing: boolean;
  today: string;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onRefresh: () => void;
}

export default function LiveAgenda({ state, events, error, refreshing, today, onConnect, onDisconnect, onRefresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showMore, setShowMore] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError("");
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading") {
    return (
      <div className={`${panel} flex items-center gap-2 px-6 py-8 text-sm text-slate-500`}>
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando o Google Agenda…
      </div>
    );
  }

  if (state === "unconfigured") {
    return (
      <div className={`${panel} border-dashed p-6`}>
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800">
            <Settings2 className="h-5 w-5 text-slate-500" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Falta configurar a conexão com o Google</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              É uma vez só: criar a chave do Google e colocar na Vercel (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET). Depois disso, aparece
              aqui o botão para entrar com a sua conta Google.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "disconnected" || (state === "error" && !events.length)) {
    return (
      <div className={`${panel} relative overflow-hidden p-6 sm:p-8`}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/60 blur-2xl dark:bg-indigo-900/20" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <GoogleMark className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {state === "error" ? "Não foi possível ler o Google Agenda" : "Conecte o seu Google Agenda"}
              </h3>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {state === "error"
                  ? error
                  : "Entre com a sua conta Google uma vez. Depois, os compromissos aparecem aqui e no card de hoje sozinhos, e o que você criar no painel vai direto para a agenda."}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(state === "error" ? async () => onRefresh() : onConnect)}
            className="inline-flex shrink-0 items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:shadow-md disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "error" ? <RefreshCw className="h-4 w-4" /> : <GoogleMark />}
            {state === "error" ? "Tentar de novo" : "Conectar com Google"}
          </button>
        </div>
        {actionError && (
          <p role="alert" className="relative mt-4 text-sm text-amber-700 dark:text-amber-300">
            {actionError}
          </p>
        )}
      </div>
    );
  }

  const days = Array.from({ length: showMore ? 14 : 7 }, (_, index) => shiftDay(today, index));
  const byDay = new Map<string, LiveEvent[]>();
  for (const event of events) byDay.set(event.day, [...(byDay.get(event.day) ?? []), event]);

  return (
    <section aria-label="Google Agenda ao vivo" className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <GoogleMark />
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Sua semana</h3>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Google Agenda conectado
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Atualizar a agenda"
            title="Atualizar"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-60 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <a
            href="https://calendar.google.com/calendar/r"
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir no Google Agenda"
            title="Abrir no Google Agenda"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={() => void run(onDisconnect)}
            disabled={busy}
            aria-label="Desconectar o Google Agenda"
            title="Desconectar"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-rose-600 disabled:opacity-60 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      {(error || actionError) && (
        <p role="alert" className="border-b border-slate-100 px-6 py-2 text-xs text-amber-700 dark:border-slate-800 dark:text-amber-300">
          {actionError || error}
        </p>
      )}
      <ol className="divide-y divide-slate-100 dark:divide-slate-800">
        {days.map((day) => {
          const items = byDay.get(day) ?? [];
          return (
            <li key={day} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 sm:px-6">
              <span className={`pt-0.5 text-sm font-semibold ${day === today ? "text-indigo-600 dark:text-indigo-300" : "text-slate-700 dark:text-slate-200"}`}>
                {dayName(day, today)}
              </span>
              {items.length ? (
                <ul className="space-y-1.5">
                  {items.map((event) => (
                    <li key={event.id} className="flex min-w-0 items-baseline gap-3 text-sm">
                      <span className="w-[5.5rem] shrink-0 font-semibold tabular-nums text-slate-400">
                        {event.allDay ? "Dia inteiro" : event.end ? `${event.start}–${event.end}` : event.start}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{event.title}</span>
                        {event.place && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="h-3 w-3" />
                            {event.place}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-slate-400">Livre</span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs dark:border-slate-800 sm:px-6">
        <span className="flex items-center gap-1.5 text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" /> Atualiza sozinha a cada 5 minutos
        </span>
        <button type="button" onClick={() => setShowMore((current) => !current)} className="font-semibold text-indigo-600 dark:text-indigo-300">
          {showMore ? "Mostrar só esta semana" : "Ver a próxima semana"}
        </button>
      </div>
    </section>
  );
}
