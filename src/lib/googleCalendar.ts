import { shiftDay } from "./dailyUpdates";

/**
 * Link que abre o Google Agenda com um evento novo já preenchido. Basta
 * clicar em Salvar lá: nada passa pelo portfólio e não precisa de login
 * extra, porque quem cria o evento é a sua própria sessão do Google.
 */

export interface NewEvent {
  title: string;
  /** `AAAA-MM-DD`. */
  date: string;
  /** `HH:MM`; sem horário, o evento é de dia inteiro. */
  start?: string;
  /** `HH:MM`; sem fim, dura uma hora. */
  end?: string;
  location?: string;
  details?: string;
}

const compact = (date: string) => date.replaceAll("-", "");

function addHour(time: string): { time: string; nextDay: boolean } {
  const [hours, minutes] = time.split(":").map(Number);
  const total = hours * 60 + minutes + 60;
  const wrapped = total % (24 * 60);
  return {
    time: `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`,
    nextDay: total >= 24 * 60,
  };
}

export function googleEventUrl(event: NewEvent): string {
  let dates: string;
  if (!event.start) {
    dates = `${compact(event.date)}/${compact(shiftDay(event.date, 1))}`;
  } else {
    const fallback = addHour(event.start);
    const end = event.end || fallback.time;
    // Fim antes do início (ex.: 23:00–01:00) termina no dia seguinte.
    const endDate = (event.end ? end <= event.start : fallback.nextDay) ? shiftDay(event.date, 1) : event.date;
    const stamp = (date: string, time: string) => `${compact(date)}T${time.replace(":", "")}00`;
    dates = `${stamp(event.date, event.start)}/${stamp(endDate, end)}`;
  }
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title.trim(), dates, ctz: "America/Sao_Paulo" });
  if (event.location?.trim()) params.set("location", event.location.trim());
  if (event.details?.trim()) params.set("details", event.details.trim());
  return `https://calendar.google.com/calendar/render?${params}`;
}
