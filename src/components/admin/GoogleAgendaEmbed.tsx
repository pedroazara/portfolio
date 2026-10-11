import React, { useState } from "react";
import { CalendarDays, ExternalLink, LockKeyhole } from "lucide-react";

/**
 * Agenda ao vivo: o Google Agenda embutido no painel.
 *
 * O Google mostra os eventos privados só para quem está logado na conta dona
 * da agenda, no mesmo navegador. Por isso nada sai daqui: o painel guarda
 * apenas o e-mail (ou ID) da agenda, neste navegador, e o resto é o próprio
 * Google decidindo o que exibir. Navegadores que bloqueiam cookies de
 * terceiros (Safari, por exemplo) podem mostrar só os eventos públicos.
 */

const STORAGE_KEY = "painel:google-agenda";

function readCalendarId(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeCalendarId(value: string) {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, value);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Armazenamento bloqueado: a agenda vale só até recarregar a página.
  }
}

export function embedUrl(calendarId: string): string {
  const params = new URLSearchParams({
    src: calendarId,
    ctz: "America/Sao_Paulo",
    hl: "pt_BR",
    mode: "WEEK",
    showTitle: "0",
    showPrint: "0",
    showCalendars: "0",
    showTz: "0",
  });
  return `https://calendar.google.com/calendar/embed?${params}`;
}

export default function GoogleAgendaEmbed() {
  const [calendarId, setCalendarId] = useState(readCalendarId);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    writeCalendarId(value);
    setCalendarId(value);
    setEditing(false);
  };

  if (!calendarId || editing) {
    return (
      <form
        onSubmit={save}
        className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 dark:border-slate-800 dark:bg-slate-900/40"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Conecte o seu Google Agenda</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Informe o e-mail da sua conta Google (ou o ID de uma agenda específica). Os eventos aparecem aqui, ao vivo,
              enquanto você estiver logado nessa conta neste navegador.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="google-agenda-id" className="sr-only">
            E-mail ou ID da agenda
          </label>
          <input
            id="google-agenda-id"
            type="text"
            inputMode="email"
            autoComplete="email"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="voce@gmail.com"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!draft.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 dark:bg-indigo-500"
            >
              Mostrar agenda
            </button>
            {calendarId && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
          <LockKeyhole className="h-3 w-3" /> Fica salvo só neste navegador. Nada é enviado ao portfólio.
        </p>
      </form>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="truncate">Google Agenda · ao vivo</span>
        </span>
        <span className="flex items-center gap-3 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setDraft(calendarId);
              setEditing(true);
            }}
            className="text-slate-500 transition hover:text-indigo-600 dark:text-slate-400"
          >
            Trocar agenda
          </button>
          <a
            href="https://calendar.google.com/calendar/r"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-300"
          >
            Abrir no Google <ExternalLink className="h-3 w-3" />
          </a>
        </span>
      </div>
      <iframe
        title="Google Agenda"
        src={embedUrl(calendarId)}
        className="block h-[560px] w-full border-0"
        loading="lazy"
      />
    </div>
  );
}
