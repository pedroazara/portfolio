import React, { useState } from "react";
import { ArrowUpRight, CalendarPlus, Check, Loader2 } from "lucide-react";
import WorkspaceDialog from "./WorkspaceDialog";
import { googleEventUrl } from "../../lib/googleCalendar";
import { todayKey } from "../../lib/dailyUpdatesService";
import type { NewLiveEvent } from "../../lib/googleAgendaService";

/**
 * "Novo compromisso" na área Agenda. Com o Google Agenda conectado
 * (`onCreate`), salva direto na agenda. Sem a conexão, abre o Google Agenda
 * com o evento preenchido numa aba nova, e lá é só clicar em Salvar.
 */
export default function NewEventDialog({
  onClose,
  onOpened,
  onCreate,
}: {
  onClose: () => void;
  onOpened: () => void;
  onCreate?: (input: NewLiveEvent) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayKey);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !date || saving) return;
    if (!onCreate) {
      window.open(googleEventUrl({ title, date, start, end: start ? end : "", location, details }), "_blank", "noopener");
      onOpened();
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onCreate({ title: title.trim(), date, start, end: start ? end : "", location: location.trim(), details: details.trim() });
      onOpened();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceDialog
      title="Novo compromisso"
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <form className="ws-capture-form" onSubmit={(event) => void submit(event)}>
        <p>{onCreate ? "Vai direto para o seu Google Agenda." : "Preencha aqui e o Google Agenda abre com tudo pronto. É só salvar lá."}</p>
        <label htmlFor="event-title">O quê</label>
        <input
          id="event-title"
          data-autofocus
          required
          maxLength={240}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Reunião, aula, consulta…"
        />
        <label htmlFor="event-date">Dia</label>
        <input id="event-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="event-start">
              Início <span>vazio = dia inteiro</span>
            </label>
            <input id="event-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
          </div>
          <div>
            <label htmlFor="event-end">
              Fim <span>opcional</span>
            </label>
            <input
              id="event-end"
              type="time"
              value={end}
              disabled={!start}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
        </div>
        <label htmlFor="event-location">
          Onde <span>opcional</span>
        </label>
        <input
          id="event-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Endereço, sala ou link da chamada"
        />
        <label htmlFor="event-details">
          Detalhes <span>opcional</span>
        </label>
        <textarea id="event-details" rows={3} value={details} onChange={(event) => setDetails(event.target.value)} />
        {error && (
          <p role="alert" className="ws-error">
            {error}
          </p>
        )}
        <div className="ws-form-footer">
          <span>
            <CalendarPlus size={12} /> {onCreate ? "Na sua agenda principal" : "Abre numa aba nova"}
          </span>
          <button type="submit" className="ws-primary" disabled={!title.trim() || !date || saving}>
            {onCreate ? (
              <>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? "Salvando…" : "Salvar na agenda"}
              </>
            ) : (
              <>
                Abrir no Google Agenda <ArrowUpRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
