import React, { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Headphones, Check } from "lucide-react";
import { scopedKey } from "../../lib/localWorkspace";
import { todayKey } from "../../lib/adminToolsService";

interface FocusState {
  duration: number;
  remaining: number;
  endAt: number | null;
  day: string;
  sessions: number;
  minutes: number;
}
const fresh = (): FocusState => ({
  duration: 25,
  remaining: 1500,
  endAt: null,
  day: todayKey(),
  sessions: 0,
  minutes: 0,
});
function readTimer(): FocusState {
  try {
    const data = JSON.parse(
      localStorage.getItem(scopedKey("focus-timer:v1")) || "null",
    );
    if (
      data &&
      [15, 25, 50].includes(data.duration) &&
      Number.isFinite(data.remaining) &&
      data.remaining >= 0 &&
      data.remaining <= data.duration * 60 &&
      (data.endAt === null || Number.isFinite(data.endAt)) &&
      typeof data.day === "string" &&
      Number.isFinite(data.sessions) &&
      Number.isFinite(data.minutes)
    )
      return data;
  } catch {
    /* A new timer remains available if storage is inaccessible. */
  }
  return fresh();
}

export default function FocusTimer() {
  const [state, setState] = useState<FocusState>(readTimer);
  const [now, setNow] = useState(Date.now);
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState(false);
  const completeGuard = useRef<number | null>(null);
  const seconds = state.endAt
    ? Math.max(0, Math.ceil((state.endAt - now) / 1000))
    : state.remaining;
  useEffect(() => {
    try {
      localStorage.setItem(scopedKey("focus-timer:v1"), JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  useEffect(() => {
    if (!state.endAt || seconds > 0 || completeGuard.current === state.endAt)
      return;
    completeGuard.current = state.endAt;
    const completionDay = todayKey(new Date(state.endAt));
    setState((current) => ({
      ...current,
      remaining: current.duration * 60,
      endAt: null,
      day: completionDay,
      sessions: (current.day === completionDay ? current.sessions : 0) + 1,
      minutes:
        (current.day === completionDay ? current.minutes : 0) +
        current.duration,
    }));
    setNotice("Sessão concluída. Respire e faça uma pausa.");
  }, [seconds, state.endAt]);
  const toggle = () => {
    setNotice("");
    setNow(Date.now());
    setState((current) =>
      current.endAt
        ? {
            ...current,
            endAt: null,
            remaining: Math.max(
              0,
              Math.ceil((current.endAt - Date.now()) / 1000),
            ),
          }
        : { ...current, endAt: Date.now() + current.remaining * 1000 },
    );
  };
  const percent = (1 - seconds / (state.duration * 60)) * 100;
  return (
    <section className="ws-card ws-focus" aria-label="Temporizador de foco">
      <div className="ws-card-heading">
        <span className="ws-eyebrow">
          <Headphones size={15} /> MODO FOCO
        </span>
        <span className={`ws-live-label ${state.endAt ? "is-running" : ""}`}>
          {state.endAt ? "Em andamento" : "Seu tempo, protegido"}
        </span>
      </div>
      <div className="ws-duration-options" aria-label="Duração da sessão">
        {[15, 25, 50].map((duration) => (
          <button
            key={duration}
            type="button"
            aria-pressed={state.duration === duration}
            disabled={Boolean(state.endAt)}
            onClick={() => {
              setState((current) => ({
                ...current,
                duration,
                remaining: duration * 60,
              }));
              setNotice("");
            }}
          >
            {duration} min
          </button>
        ))}
      </div>
      <div
        className="ws-timer-face"
        style={{ "--focus-progress": `${percent}%` } as React.CSSProperties}
      >
        <div>
          <span
            className="ws-timer-value"
            role="timer"
            aria-label={`${Math.floor(seconds / 60)} minutos e ${seconds % 60} segundos`}
          >
            {String(Math.floor(seconds / 60)).padStart(2, "0")}
            <span>:</span>
            {String(seconds % 60).padStart(2, "0")}
          </span>
          <span className="ws-timer-caption">Uma coisa de cada vez.</span>
        </div>
      </div>
      <div className="ws-focus-controls">
        <button type="button" className="ws-primary" onClick={toggle}>
          {state.endAt ? <Pause size={16} /> : <Play size={16} />}{" "}
          {state.endAt
            ? "Pausar"
            : seconds < state.duration * 60
              ? "Continuar"
              : "Começar foco"}
        </button>
        <button
          type="button"
          className="ws-icon-button"
          aria-label="Reiniciar temporizador"
          onClick={() => {
            setState((current) => ({
              ...current,
              endAt: null,
              remaining: current.duration * 60,
            }));
            setNotice("");
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <p className="ws-focus-summary">
        <Check size={13} /> {state.day === todayKey() ? state.sessions : 0}{" "}
        sessões · {state.day === todayKey() ? state.minutes : 0} min de foco
        hoje
      </p>
      <p className="ws-device-note">Histórico salvo neste navegador</p>
      {notice && (
        <p className="ws-success" role="status">
          {notice}
        </p>
      )}
      {storageError && (
        <p className="ws-error" role="alert">
          O navegador não conseguiu salvar o temporizador.
        </p>
      )}
    </section>
  );
}
