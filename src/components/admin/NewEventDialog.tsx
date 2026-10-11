import React, { useState } from "react";
import { ArrowUpRight, CalendarPlus } from "lucide-react";
import WorkspaceDialog from "./WorkspaceDialog";
import { googleEventUrl } from "../../lib/googleCalendar";
import { todayKey } from "../../lib/dailyUpdatesService";

/**
 * "Novo compromisso" na área Agenda: um formulário curto que abre o Google
 * Agenda com o evento preenchido, numa aba nova. Lá é só clicar em Salvar.
 */
export default function NewEventDialog({ onClose, onOpened }: { onClose: () => void; onOpened: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayKey);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !date) return;
    window.open(googleEventUrl({ title, date, start, end: start ? end : "", location, details }), "_blank", "noopener");
    onOpened();
  };

  return (
    <WorkspaceDialog title="Novo compromisso" onClose={onClose}>
      <form className="ws-capture-form" onSubmit={submit}>
        <p>Preencha aqui e o Google Agenda abre com tudo pronto. É só salvar lá.</p>
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
        <div className="ws-form-footer">
          <span>
            <CalendarPlus size={12} /> Abre numa aba nova
          </span>
          <button type="submit" className="ws-primary" disabled={!title.trim() || !date}>
            Abrir no Google Agenda <ArrowUpRight size={16} />
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
