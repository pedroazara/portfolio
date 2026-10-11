import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectGoogleAgenda,
  createGoogleAgendaEvent,
  disconnectGoogleAgenda,
  fetchGoogleAgendaEvents,
  fetchGoogleAgendaStatus,
  GoogleAgendaError,
  LiveEvent,
  NewLiveEvent,
} from "../lib/googleAgendaService";
import { shiftDay, todayKey } from "../lib/dailyUpdates";

export type GoogleAgendaState = "loading" | "unconfigured" | "disconnected" | "connected" | "error";

/** Quantos dias, a partir de hoje, a agenda ao vivo carrega. */
export const LIVE_AGENDA_DAYS = 14;
const REFRESH_MS = 5 * 60_000;

/** Por dia; no dia, os de dia inteiro primeiro e depois por horário. */
const sortEvents = (events: LiveEvent[]) =>
  [...events].sort((a, b) =>
    a.day !== b.day ? a.day.localeCompare(b.day) : a.allDay !== b.allDay ? (a.allDay ? -1 : 1) : (a.start ?? "").localeCompare(b.start ?? ""),
  );

/**
 * Google Agenda ao vivo em Meu espaço: a conexão e os compromissos das
 * próximas duas semanas. Recarrega a cada 5 minutos e quando a aba volta a
 * ficar visível. Com `enabled` falso (outra área aberta), não consulta nada.
 */
export function useGoogleAgenda(enabled = true) {
  const [state, setState] = useState<GoogleAgendaState>("loading");
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setRefreshing(true);
    try {
      const status = await fetchGoogleAgendaStatus();
      if (!status.configured) {
        setState("unconfigured");
        return;
      }
      if (!status.connected) {
        setState("disconnected");
        setEvents([]);
        return;
      }
      const from = todayKey();
      setEvents(sortEvents(await fetchGoogleAgendaEvents(from, shiftDay(from, LIVE_AGENDA_DAYS - 1))));
      setState("connected");
      setError("");
    } catch (err) {
      if (err instanceof GoogleAgendaError && err.disconnected) {
        setState("disconnected");
        setEvents([]);
      } else if (err instanceof GoogleAgendaError && err.unconfigured) {
        setState("unconfigured");
      } else {
        setError(err instanceof Error ? err.message : String(err));
        setState((current) => (current === "connected" ? current : "error"));
      }
    } finally {
      loading.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, load]);

  const create = async (input: NewLiveEvent) => {
    const event = await createGoogleAgendaEvent(input);
    if (event) setEvents((current) => sortEvents([...current.filter((item) => item.id !== event.id), event]));
    void load();
  };

  const disconnect = async () => {
    await disconnectGoogleAgenda();
    setEvents([]);
    setState("disconnected");
  };

  return { state, events, error, refreshing, refresh: load, connect: connectGoogleAgenda, disconnect, create };
}
