/**
 * Google Agenda conectado ao painel (server/googleAgenda.ts): status da
 * conexão, compromissos dos próximos dias e criação de compromissos.
 *
 * No modo de teste (`?dev`) nada sai do navegador: a agenda é de mentira e
 * os compromissos novos ficam só na memória.
 */
import { supabase } from "./supabase";
import { isDevPreview } from "./devPreview";
import { AgendaEvent, shiftDay, todayKey } from "./dailyUpdates";

export interface LiveEvent {
  id: string;
  title: string;
  /** `AAAA-MM-DD` em São Paulo. */
  day: string;
  allDay: boolean;
  start?: string;
  end?: string;
  place?: string;
  link?: string;
}

export interface NewLiveEvent {
  title: string;
  date: string;
  start?: string;
  end?: string;
  location?: string;
  details?: string;
}

export interface GoogleAgendaStatus {
  configured: boolean;
  connected: boolean;
}

export class GoogleAgendaError extends Error {
  constructor(
    message: string,
    public disconnected = false,
    public unconfigured = false,
  ) {
    super(message);
  }
}

export function toAgendaEvent(event: LiveEvent): AgendaEvent {
  return {
    time: event.allDay ? "Dia inteiro" : event.end ? `${event.start}–${event.end}` : (event.start ?? ""),
    allDay: event.allDay,
    start: event.start,
    end: event.end,
    title: event.title,
    place: event.place,
  };
}

// ---------------------------------------------------------------- prévia local

let previewEvents: LiveEvent[] | null = null;

function previewList(): LiveEvent[] {
  if (previewEvents) return previewEvents;
  const day = (offset: number) => shiftDay(todayKey(), offset);
  const event = (id: string, offset: number, title: string, start?: string, end?: string, place?: string): LiveEvent => ({
    id,
    day: day(offset),
    title,
    allDay: !start,
    start,
    end,
    place,
  });
  previewEvents = [
    event("p1", 0, "Entrega do relatório de óptica"),
    event("p2", 0, "Reunião do grupo de pesquisa", "09:00", "10:00", "Google Meet"),
    event("p3", 0, "Revisão do projeto do telescópio", "14:30", "15:30", "Lab 2"),
    event("p4", 0, "Academia", "18:30"),
    event("p5", 1, "Aula de Cálculo III", "08:00", "09:40", "Sala B-204"),
    event("p6", 1, "Orientação com a professora", "11:00", "12:00", "Google Meet"),
    event("p7", 1, "Montagem do espelho do telescópio", "15:00", "17:00", "Lab 2"),
    event("p8", 1, "Jantar com a família", "19:30"),
    event("p9", 2, "Aula de Física Moderna", "10:00", "11:00"),
    event("p10", 3, "Seminário do laboratório", "16:00", "17:00", "Auditório"),
    event("p11", 5, "Viagem para o congresso"),
  ];
  return previewEvents;
}

// ---------------------------------------------------------------- servidor

async function call<T>(action: string, init: RequestInit & { params?: Record<string, string> } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new GoogleAgendaError("Entre como administrador para ver a agenda.");
  const params = new URLSearchParams({ action, ...(init.params ?? {}) });
  const response = await fetch(`/api/google-agenda?${params}`, {
    ...init,
    credentials: "same-origin",
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${data.session.access_token}` },
  });
  const isJson = (response.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    throw new GoogleAgendaError(
      body.error || `A agenda não respondeu (HTTP ${response.status}).`,
      Boolean(body.disconnected),
      Boolean(body.unconfigured),
    );
  }
  return body as T;
}

export async function fetchGoogleAgendaStatus(): Promise<GoogleAgendaStatus> {
  if (isDevPreview()) return { configured: true, connected: true };
  return call<GoogleAgendaStatus>("status");
}

/** Vai para a tela de consentimento do Google; ele volta para o painel. */
export async function connectGoogleAgenda(): Promise<void> {
  if (isDevPreview()) throw new GoogleAgendaError("A conexão com o Google fica desativada no modo de teste.");
  const { url } = await call<{ url: string }>("connect", { method: "POST" });
  window.location.assign(url);
}

export async function disconnectGoogleAgenda(): Promise<void> {
  if (isDevPreview()) return;
  await call("disconnect", { method: "POST" });
}

export async function fetchGoogleAgendaEvents(from: string, to: string): Promise<LiveEvent[]> {
  if (isDevPreview()) return previewList().filter((event) => event.day >= from && event.day <= to);
  const { events } = await call<{ events: LiveEvent[] }>("events", { params: { from, to } });
  return events;
}

export async function createGoogleAgendaEvent(input: NewLiveEvent): Promise<LiveEvent | null> {
  if (isDevPreview()) {
    const event: LiveEvent = {
      id: `p${Date.now()}`,
      day: input.date,
      title: input.title,
      allDay: !input.start,
      start: input.start || undefined,
      end: input.start ? input.end || undefined : undefined,
      place: input.location || undefined,
    };
    previewEvents = [...previewList(), event];
    return event;
  }
  const { event } = await call<{ event: LiveEvent | null }>("create", { method: "POST", body: JSON.stringify(input) });
  return event;
}
