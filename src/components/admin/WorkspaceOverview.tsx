import React, { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Check,
  Circle,
  CheckCheck,
  Flame,
  StickyNote,
  Bookmark,
  PenLine,
  ListTodo,
  Target,
  RotateCw,
} from "lucide-react";
import type { AdminHubTab } from "../../lib/adminHubTabs";
import { todayKey, updateTask, setHabitLog } from "../../lib/adminToolsService";
import type { PersonalWorkspaceData } from "../../hooks/usePersonalWorkspace";
import FocusTimer from "./FocusTimer";
import { OrbitaIcon } from "../OrbitaIcon";

interface Props {
  data: PersonalWorkspaceData;
  loading: boolean;
  error: string;
  name: string;
  go: (tab: AdminHubTab, id?: string) => void;
  capture: (type: "task" | "note" | "link") => void;
  refresh: () => Promise<void>;
  projectsOverview?: React.ReactNode;
}
export default function WorkspaceOverview({
  data,
  loading,
  error,
  name,
  go,
  capture,
  refresh,
  projectsOverview,
}: Props) {
  const [busy, setBusy] = useState<string[]>([]);
  const [actionError, setActionError] = useState("");
  const today = todayKey();
  const active = data.tasks
    .filter((task) => task.status !== "done")
    .sort(
      (a, b) =>
        Number(b.status === "doing") - Number(a.status === "doing") ||
        a.position - b.position,
    );
  const done = data.tasks.filter((task) => task.status === "done").length;
  const habitsDone = data.habits.filter((habit) =>
    data.logs.some(
      (log) => log.habit_id === habit.id && log.log_date === today,
    ),
  ).length;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const action = async (id: string, fn: () => Promise<unknown>) => {
    if (busy.includes(id)) return;
    setBusy((current) => [...current, id]);
    setActionError("");
    try {
      await fn();
      await refresh();
    } catch {
      setActionError(
        "Não foi possível salvar essa alteração. Tente novamente.",
      );
    } finally {
      setBusy((current) => current.filter((key) => key !== id));
    }
  };
  const recent = [
    ...data.notes.map((item) => ({
      id: item.id,
      title: item.title || "Nota sem título",
      content: item.content,
      date: item.updated_at,
      tab: "notas" as const,
      label: "Nota",
      icon: StickyNote,
    })),
    ...data.drafts.map((item) => ({
      id: item.id,
      title: item.title || "Rascunho sem título",
      content: item.content,
      date: item.updated_at,
      tab: "rascunhos" as const,
      label: "Rascunho",
      icon: PenLine,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + i);
    return date;
  });
  return (
    <>
      <section className="ws-welcome">
        <div className="ws-welcome-copy">
          <span className="ws-eyebrow">
            <span className="ws-status-dot" /> ESPAÇO PARA O QUE IMPORTA
          </span>
          <h1>
            {greeting}, {name}.<br />
            <span>Vamos dar vida às ideias?</span>
          </h1>
          <p>Organize a mente. Encontre seu ritmo. Construa algo seu.</p>
          <button
            type="button"
            onClick={() => capture("task")}
            className="ws-hero-button"
          >
            <Plus size={17} /> Definir meu próximo passo{" "}
            <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="ws-orbit-art" aria-hidden="true">
          <div className="ws-orbit-grid" />
          <div className="ws-orbit-ring ring-one" />
          <div className="ws-orbit-ring ring-two" />
          <div className="ws-orbit-ring ring-three" />
          <div className="ws-orbit-core">
            <OrbitaIcon size={52} />
          </div>
          <span className="ws-orbit-point point-one">
            <Check size={19} />
          </span>
          <span className="ws-orbit-point point-two">
            <PenLine size={18} />
          </span>
          <span className="ws-orbit-point point-three" />
          <span className="ws-orbit-caption">
            PEQUENOS PASSOS. NOVAS ÓRBITAS.
          </span>
        </div>
      </section>
      {projectsOverview}
      {error && (
        <div role="alert" className="ws-error ws-error-banner">
          {error}
          <button type="button" onClick={() => void refresh()}>
            <RotateCw size={14} /> Tentar novamente
          </button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="ws-error">
          {actionError}
        </p>
      )}
      <div className="ws-stats" aria-busy={loading}>
        {[
          {
            label: "Tarefas em aberto",
            value: active.length,
            caption: `${done} concluídas no total`,
            icon: ListTodo,
            tab: "tarefas" as const,
            tone: "violet",
          },
          {
            label: "Hábitos de hoje",
            value: `${habitsDone}/${data.habits.length}`,
            caption:
              habitsDone && habitsDone === data.habits.length
                ? "Tudo em dia. Bom trabalho!"
                : "Consistência se constrói",
            icon: Flame,
            tab: "habitos" as const,
            tone: "orange",
          },
          {
            label: "Ideias guardadas",
            value: data.notes.length,
            caption: `${data.drafts.length} rascunhos em construção`,
            icon: StickyNote,
            tab: "notas" as const,
            tone: "blue",
          },
          {
            label: "Na sua biblioteca",
            value: data.links.length,
            caption: "Referências para ir além",
            icon: Bookmark,
            tab: "links" as const,
            tone: "green",
          },
        ].map(({ label, value, caption, icon: Icon, tab, tone }) => (
          <button
            type="button"
            className="ws-stat"
            onClick={() => go(tab)}
            key={tab}
          >
            <span className={`ws-stat-icon ${tone}`}>
              <Icon size={19} />
            </span>
            <ArrowUpRight size={15} className="ws-stat-arrow" />
            <span className="ws-stat-label">{label}</span>
            <strong>{loading || error ? "—" : value}</strong>
            <span className="ws-stat-caption">{caption}</span>
          </button>
        ))}
      </div>
      <div className="ws-dashboard-grid">
        <div className="ws-main-column">
          <section className="ws-card ws-priorities">
            <div className="ws-card-heading">
              <div>
                <span className="ws-eyebrow">UM PASSO DE CADA VEZ</span>
                <h2>Seu próximo movimento</h2>
              </div>
              <button
                type="button"
                className="ws-text-button"
                onClick={() => go("tarefas")}
              >
                Ver quadro <ArrowUpRight size={15} />
              </button>
            </div>
            {loading ? (
              <div className="ws-loading" role="status">
                Organizando seu espaço…
              </div>
            ) : error ? (
              <p className="ws-empty-description">
                Suas tarefas aparecerão quando a conexão for restabelecida.
              </p>
            ) : active.length ? (
              <div className="ws-task-list">
                {active.slice(0, 4).map((task) => (
                  <div className="ws-task-row" key={task.id}>
                    <button
                      type="button"
                      className="ws-task-check"
                      disabled={busy.includes(task.id)}
                      aria-label={`Concluir ${task.title}`}
                      onClick={() =>
                        void action(task.id, () =>
                          updateTask(task.id, { status: "done" }),
                        )
                      }
                    >
                      <Circle size={21} />
                    </button>
                    <button
                      type="button"
                      className="ws-task-copy"
                      onClick={() => go("tarefas")}
                    >
                      <strong>{task.title}</strong>
                      {task.notes && <span>{task.notes}</span>}
                    </button>
                    <span className={`ws-task-status ${task.status}`}>
                      {task.status === "doing" ? "Em andamento" : "A fazer"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ws-empty">
                <div className="ws-empty-icon">
                  <CheckCheck size={27} strokeWidth={1.5} />
                </div>
                <h3>
                  {done
                    ? "Espaço livre para o próximo passo."
                    : "Grandes ideias começam pequenas."}
                </h3>
                <p>
                  {done
                    ? "Você concluiu suas tarefas. Que tal escolher um novo desafio?"
                    : "Adicione uma tarefa e transforme intenção em movimento."}
                </p>
                <button
                  type="button"
                  className="ws-text-button"
                  onClick={() => capture("task")}
                >
                  <Plus size={15} /> Criar uma tarefa
                </button>
              </div>
            )}
            <div className="ws-card-footer">
              <span>
                <Target size={14} />{" "}
                {active.length
                  ? `${active.filter((task) => task.status === "doing").length} em andamento · escolha uma para focar`
                  : "Um objetivo claro faz toda a diferença"}
              </span>
              <button
                type="button"
                className="ws-icon-button"
                aria-label="Adicionar tarefa"
                onClick={() => capture("task")}
              >
                <Plus size={17} />
              </button>
            </div>
          </section>
          <section className="ws-card ws-ideas">
            <div className="ws-card-heading">
              <div>
                <span className="ws-eyebrow">CONTINUE DE ONDE PAROU</span>
                <h2>Ideias em construção</h2>
              </div>
              <button
                type="button"
                className="ws-icon-button"
                aria-label="Capturar ideia"
                onClick={() => capture("note")}
              >
                <Plus size={18} />
              </button>
            </div>
            {loading ? (
              <p className="ws-loading">Carregando ideias…</p>
            ) : recent.length ? (
              <div className="ws-recent-grid">
                {recent.map((item) => (
                  <button
                    type="button"
                    key={`${item.tab}-${item.id}`}
                    className="ws-recent-note"
                    onClick={() => go(item.tab, item.id)}
                  >
                    <span className="ws-note-type">
                      <item.icon size={14} /> {item.label}
                      <ArrowUpRight size={13} />
                    </span>
                    <h3>{item.title}</h3>
                    <p>
                      {item.content.replace(/[#*`>\[\]]/g, "") ||
                        "Uma página aberta a possibilidades."}
                    </p>
                    <time dateTime={item.date}>
                      {new Date(item.date).toLocaleDateString("pt-BR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </time>
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                className="ws-capture-prompt"
                onClick={() => capture("note")}
              >
                <span className="ws-capture-icon">
                  <PenLine size={22} strokeWidth={1.5} />
                </span>
                <span>
                  <strong>Teve uma ideia? Guarde aqui.</strong>
                  <span>
                    Uma hipótese, uma referência, o começo de um projeto.
                  </span>
                </span>
                <ArrowRight size={19} />
              </button>
            )}
          </section>
          <div className="ws-shortcuts">
            <button type="button" onClick={() => capture("note")}>
              <StickyNote size={17} />
              <span>Capturar uma ideia</span>
              <kbd>N</kbd>
            </button>
            <button type="button" onClick={() => capture("link")}>
              <Bookmark size={17} />
              <span>Salvar uma referência</span>
              <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
        <div className="ws-side-column">
          <FocusTimer />
          <section className="ws-card ws-habit-preview">
            <div className="ws-card-heading">
              <div>
                <span className="ws-eyebrow">CULTIVE SEU RITMO</span>
                <h2>Um pouco, todo dia.</h2>
              </div>
              <Flame size={20} className="ws-orange" />
            </div>
            <div
              className="ws-week-strip"
              aria-label="Hábitos nos últimos sete dias"
            >
              {week.map((date) => {
                const key = todayKey(date);
                const count = data.habits.filter((habit) =>
                  data.logs.some(
                    (log) => log.habit_id === habit.id && log.log_date === key,
                  ),
                ).length;
                return (
                  <div key={key} className={key === today ? "is-today" : ""}>
                    <span>
                      {date
                        .toLocaleDateString("pt-BR", { weekday: "short" })
                        .replace(".", "")
                        .slice(0, 3)}
                    </span>
                    <span
                      className={`ws-week-day ${count > 0 ? "has-activity" : ""}`}
                      title={`${date.toLocaleDateString("pt-BR")}: ${count} hábitos registrados`}
                    >
                      {count > 0 ? <Check size={15} /> : date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="ws-mini-habits">
              {data.habits.slice(0, 3).map((habit) => {
                const checked = data.logs.some(
                  (log) => log.habit_id === habit.id && log.log_date === today,
                );
                return (
                  <button
                    key={habit.id}
                    type="button"
                    disabled={busy.includes(habit.id)}
                    aria-pressed={checked}
                    onClick={() =>
                      void action(habit.id, () =>
                        setHabitLog(habit.id, today, !checked),
                      )
                    }
                  >
                    <span
                      className={`ws-habit-check ${checked ? "checked" : ""}`}
                    >
                      {checked && <Check size={12} />}
                    </span>
                    <span>{habit.name}</span>
                  </button>
                );
              })}
            </div>
            {!data.habits.length && !loading && (
              <p className="ws-empty-description">
                Crie seu primeiro hábito e acompanhe cada pequena conquista.
              </p>
            )}
            <button
              type="button"
              className="ws-habit-link"
              onClick={() => go("habitos")}
            >
              {data.habits.length
                ? "Acompanhar meus hábitos"
                : "Criar meu primeiro hábito"}
              <ArrowRight size={15} />
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
