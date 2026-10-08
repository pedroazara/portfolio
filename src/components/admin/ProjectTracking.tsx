import React, { useId, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Flag,
  ListChecks,
  LoaderCircle,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { todayKey } from "../../lib/adminToolsService";
import {
  updateWorkspaceProject,
  type AdminWorkspaceProject,
  type WorkspaceChecklistItem,
  type WorkspaceMilestone,
  type WorkspaceProjectUpdate,
} from "../../lib/workspaceProjectsService";
import WorkspaceDialog from "./WorkspaceDialog";
import "./project-tracking.css";

interface Props {
  project: AdminWorkspaceProject;
  onReload: () => Promise<void>;
}
type Section = "checklist" | "milestones" | "updates";
type Patch = Partial<
  Pick<AdminWorkspaceProject, "checklist_items" | "milestones" | "updates">
>;
type EditorValues = {
  title: string;
  due_date: string;
  priority: WorkspaceChecklistItem["priority"];
  milestone_id: string;
  kind: WorkspaceProjectUpdate["kind"];
};
type Editor = EditorValues & {
  section: Section;
  id: string | null;
  version: string | null;
  original: EditorValues;
};
type DeleteTarget = {
  section: Section;
  id: string;
  title: string;
  version: string | null;
};

const priorities = { low: "Baixa", medium: "Média", high: "Alta" };
const kinds = {
  progress: "Progresso",
  decision: "Decisão",
  blocker: "Impedimento",
};
const tabs = [
  { value: "checklist" as const, label: "Checklist", icon: ListChecks },
  { value: "milestones" as const, label: "Etapas", icon: Flag },
  { value: "updates" as const, label: "Diário", icon: MessageSquareText },
];

function shortDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}
function logDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProjectTracking({ project, onReload }: Props) {
  const id = useId();
  const [section, setSection] = useState<Section>("checklist");
  const [filter, setFilter] = useState<"open" | "done" | "all" | "overdue">(
    "open",
  );
  const [logFilter, setLogFilter] = useState<"all" | "blocker">("all");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [busy, setBusy] = useState("");
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // This snapshot is set only after the server confirms a write. It also keeps
  // a second action safe while the parent's refresh is still reaching the UI.
  const [confirmed, setConfirmed] = useState<AdminWorkspaceProject | null>(
    null,
  );
  const current =
    confirmed &&
    confirmed.id === project.id &&
    Date.parse(confirmed.updated_at) > Date.parse(project.updated_at)
      ? confirmed
      : project;
  const items = current.checklist_items ?? [];
  const milestones = current.milestones ?? [];
  const updates = current.updates ?? [];
  const today = todayKey();
  const done = items.filter((item) => item.completed).length;
  const overdue = items.filter(
    (item) => !item.completed && item.due_date && item.due_date < today,
  ).length;
  const blockers = updates.filter(
    (entry) => entry.kind === "blocker" && !entry.resolved,
  );
  const percent = items.length ? Math.round((done / items.length) * 100) : 0;
  const visibleItems = items.filter(
    (item) =>
      filter === "all" ||
      (filter === "done"
        ? item.completed
        : !item.completed &&
          (filter !== "overdue" ||
            Boolean(item.due_date && item.due_date < today))),
  );
  const visibleUpdates = [...updates]
    .filter(
      (entry) =>
        logFilter !== "blocker" ||
        (entry.kind === "blocker" && !entry.resolved),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const deadlines = [
    ...items
      .filter((item) => !item.completed && item.due_date)
      .map((item) => ({
        id: item.id,
        title: item.title,
        due: item.due_date!,
        section: "checklist" as const,
        label: "Checklist",
      })),
    ...milestones
      .filter((item) => !item.completed && item.due_date)
      .map((item) => ({
        id: item.id,
        title: item.title,
        due: item.due_date!,
        section: "milestones" as const,
        label: "Etapa",
      })),
  ]
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 3);

  async function save(
    patch: Patch,
    key: string,
    after: () => void,
    version = current.updated_at,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(key);
    setError("");
    setNotice("");
    try {
      const saved = await updateWorkspaceProject(current.id, patch, version);
      setConfirmed(saved);
      after();
      setNotice("Alteração salva.");
      try {
        await onReload();
      } catch {
        setError(
          "A alteração foi salva, mas não foi possível atualizar a lista. Recarregue os dados para continuar.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      pending.current = false;
      setBusy("");
    }
  }

  async function reload() {
    if (pending.current) return;
    pending.current = true;
    setBusy("reload");
    try {
      await onReload();
      setError("");
      setEditor((value) => (value ? { ...value, version: null } : value));
      setDeleteTarget((value) => (value ? { ...value, version: null } : value));
      setNotice(
        "Dados recarregados. Seu rascunho foi mantido; revise antes de salvar.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar os dados.",
      );
    } finally {
      pending.current = false;
      setBusy("");
    }
  }

  function openEditor(target: Section, itemId?: string) {
    const item =
      target === "checklist"
        ? items.find((value) => value.id === itemId)
        : undefined;
    const milestone =
      target === "milestones"
        ? milestones.find((value) => value.id === itemId)
        : undefined;
    const entry =
      target === "updates"
        ? updates.find((value) => value.id === itemId)
        : undefined;
    const values: EditorValues = {
      title: item?.title ?? milestone?.title ?? entry?.body ?? "",
      due_date: item?.due_date ?? milestone?.due_date ?? "",
      priority: item?.priority ?? "medium",
      milestone_id: item?.milestone_id ?? "",
      kind: entry?.kind ?? "progress",
    };
    setEditor({
      ...values,
      original: values,
      section: target,
      id: itemId || null,
      version: current.updated_at,
    });
    setError("");
    setNotice("");
  }

  function submitEditor(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || !editor.title.trim() || pending.current) return;
    const existingId = editor.id;
    const entryId = existingId || crypto.randomUUID();
    const version = editor.version ?? current.updated_at;
    // After reloading a conflict, a deleted record must not be silently recreated.
    if (
      existingId &&
      !(
        editor.section === "checklist"
          ? items
          : editor.section === "milestones"
            ? milestones
            : updates
      ).some((value) => value.id === existingId)
    ) {
      setError(
        "Este registro foi excluído em outra sessão. Copie seu rascunho e crie um novo registro, se necessário.",
      );
      return;
    }
    let patch: Patch;
    // Preserve fields that the user did not edit when rebasing after a conflict.
    // This avoids overwriting a changed deadline while saving a renamed item.
    const value = <K extends keyof EditorValues>(
      key: K,
      latest: EditorValues[K],
    ): EditorValues[K] =>
      existingId && editor[key] === editor.original[key] ? latest : editor[key];
    if (editor.section === "checklist") {
      const previous = items.find((value) => value.id === existingId);
      const item: WorkspaceChecklistItem = {
        id: entryId,
        title: value("title", previous?.title ?? "").trim(),
        due_date: value("due_date", previous?.due_date ?? "") || null,
        priority: value("priority", previous?.priority ?? "medium"),
        completed: previous?.completed ?? false,
        milestone_id:
          value("milestone_id", previous?.milestone_id ?? "") || null,
      };
      patch = {
        checklist_items: existingId
          ? items.map((value) => (value.id === existingId ? item : value))
          : [...items, item],
      };
    } else if (editor.section === "milestones") {
      const previous = milestones.find((value) => value.id === existingId);
      const milestone: WorkspaceMilestone = {
        id: entryId,
        title: value("title", previous?.title ?? "").trim(),
        due_date: value("due_date", previous?.due_date ?? "") || null,
        completed: previous?.completed ?? false,
      };
      patch = {
        milestones: existingId
          ? milestones.map((value) =>
              value.id === existingId ? milestone : value,
            )
          : [...milestones, milestone],
      };
    } else {
      const previous = updates.find((value) => value.id === existingId);
      const kind = value("kind", previous?.kind ?? "progress");
      const entry: WorkspaceProjectUpdate = {
        id: entryId,
        body: value("title", previous?.body ?? "").trim(),
        kind,
        resolved: kind === "blocker" ? (previous?.resolved ?? false) : false,
        created_at: previous?.created_at ?? new Date().toISOString(),
      };
      patch = {
        updates: existingId
          ? updates.map((value) => (value.id === existingId ? entry : value))
          : [...updates, entry],
      };
    }
    void save(patch, "editor", () => setEditor(null), version);
  }

  function requestDelete(target: Section, itemId: string, title: string) {
    setDeleteTarget({
      section: target,
      id: itemId,
      title,
      version: current.updated_at,
    });
    setError("");
  }

  function remove() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const patch: Patch =
      target.section === "checklist"
        ? { checklist_items: items.filter((item) => item.id !== target.id) }
        : target.section === "milestones"
          ? {
              milestones: milestones.filter((item) => item.id !== target.id),
              checklist_items: items.map((item) =>
                item.milestone_id === target.id
                  ? { ...item, milestone_id: null }
                  : item,
              ),
            }
          : { updates: updates.filter((entry) => entry.id !== target.id) };
    void save(
      patch,
      "delete",
      () => setDeleteTarget(null),
      target.version ?? current.updated_at,
    );
  }

  function switchTab(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setSection(tabs[next].value);
    document.getElementById(`${id}-tab-${tabs[next].value}`)?.focus();
  }

  const errorContent = error ? (
    <div className="pt-error" role="alert">
      <p>{error}</p>
      <button
        type="button"
        onClick={() => void reload()}
        disabled={Boolean(busy)}
      >
        <RefreshCw size={14} />
        {busy === "reload" ? "Recarregando…" : "Recarregar dados"}
      </button>
    </div>
  ) : null;

  return (
    <section
      className="pt-tracking"
      aria-labelledby={`${id}-heading`}
      aria-busy={Boolean(busy)}
    >
      <header className="pt-heading">
        <div>
          <h2 id={`${id}-heading`}>Acompanhamento</h2>
          <p>Entregas, etapas e decisões deste projeto.</p>
        </div>
        <span className="pt-private">Privado</span>
      </header>
      <div className="pt-summary">
        <div className="pt-progress">
          <div>
            <span>Checklist concluído</span>
            <strong>
              {done}
              <small> / {items.length}</small>
            </strong>
          </div>
          <progress
            value={done}
            max={items.length || 1}
            aria-label={`${percent}% do checklist concluído`}
          />
          <span>{percent}% das entregas</span>
        </div>
      </div>
      {deadlines.length > 0 && (
        <div className="pt-deadlines" aria-label="Prazos em aberto">
          <span>
            <CalendarDays size={14} /> Prazos em aberto
          </span>
          <div>
            {deadlines.map((entry) => (
              <button
                type="button"
                key={`${entry.section}-${entry.id}`}
                className={entry.due < today ? "is-overdue" : ""}
                disabled={Boolean(busy)}
                onClick={() => {
                  setSection(entry.section);
                  openEditor(entry.section, entry.id);
                }}
              >
                <time dateTime={entry.due}>{shortDate(entry.due)}</time>
                <span title={entry.title}>{entry.title}</span>
                <small>{entry.label}</small>
                <ChevronRight size={13} />
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        className="pt-tabbar"
        role="tablist"
        aria-label="Acompanhamento do projeto"
      >
        {tabs.map(({ value, label, icon: Icon }, index) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`${id}-tab-${value}`}
            aria-controls={`${id}-panel-${value}`}
            aria-selected={section === value}
            tabIndex={section === value ? 0 : -1}
            onClick={() => setSection(value)}
            onKeyDown={(event) => switchTab(event, index)}
          >
            <Icon size={16} />
            <span>{label}</span>
            <small>
              {value === "checklist"
                ? items.length
                : value === "milestones"
                  ? milestones.length
                  : updates.length}
            </small>
          </button>
        ))}
      </div>
      {!editor && !deleteTarget && errorContent}
      <p className="pt-notice" role="status">
        {!editor && !deleteTarget ? notice : ""}
      </p>
      <div
        className="pt-tabpanel"
        id={`${id}-panel-${section}`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${section}`}
        tabIndex={0}
      >
        {section === "checklist" && (
          <>
            <div className="pt-toolbar">
              <div
                className="pt-checklist-filters"
                role="group"
                aria-label="Filtrar checklist"
              >
                {([
                  { value: "open", label: "Pendentes", count: items.length - done },
                  { value: "done", label: "Concluídos", count: done },
                  { value: "all", label: "Todos", count: items.length },
                  { value: "overdue", label: "Atrasados", count: overdue },
                ] as const).map(({ value, label, count }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {label} <span>{count}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="ws-primary"
                disabled={Boolean(busy)}
                onClick={() => openEditor("checklist")}
              >
                <Plus size={15} />
                Adicionar item
              </button>
            </div>
            {visibleItems.length ? (
              <ul className="pt-list">
                {visibleItems.map((item) => {
                  const late =
                    !item.completed &&
                    Boolean(item.due_date && item.due_date < today);
                  const milestone = milestones.find(
                    (value) => value.id === item.milestone_id,
                  );
                  return (
                    <li
                      key={item.id}
                      className={`pt-checklist-item ${item.completed ? "is-complete" : ""} ${late ? "is-overdue" : ""}`}
                    >
                      <button
                        type="button"
                        className="pt-checkbox"
                        role="checkbox"
                        aria-checked={item.completed}
                        aria-label={`${item.completed ? "Reabrir" : "Concluir"} ${item.title}`}
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void save(
                            {
                              checklist_items: items.map((value) =>
                                value.id === item.id
                                  ? { ...value, completed: !value.completed }
                                  : value,
                              ),
                            },
                            item.id,
                            () => {},
                          )
                        }
                      >
                        {busy === item.id ? (
                          <LoaderCircle className="pt-spin" size={15} />
                        ) : item.completed ? (
                          <Check size={15} />
                        ) : null}
                      </button>
                      <div className="pt-item-main">
                        <span className="pt-item-title">{item.title}</span>
                        <div className="pt-item-meta">
                          <span
                            className={`pt-priority pt-priority-${item.priority}`}
                          >
                            Prioridade{" "}
                            {priorities[item.priority].toLocaleLowerCase(
                              "pt-BR",
                            )}
                          </span>
                          {item.due_date && (
                            <time
                              dateTime={item.due_date}
                              className={late ? "pt-late" : ""}
                            >
                              <CalendarDays size={12} />
                              {shortDate(item.due_date)}
                              {late
                                ? " · atrasado"
                                : item.due_date === today && !item.completed
                                  ? " · hoje"
                                  : ""}
                            </time>
                          )}
                          {milestone && (
                            <span>
                              <Flag size={12} />
                              {milestone.title}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="pt-item-actions">
                        <button
                          type="button"
                          className="ws-icon-button"
                          aria-label={`Editar item ${item.title}`}
                          disabled={Boolean(busy)}
                          onClick={() => openEditor("checklist", item.id)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="ws-icon-button"
                          aria-label={`Excluir item ${item.title}`}
                          disabled={Boolean(busy)}
                          onClick={() =>
                            requestDelete("checklist", item.id, item.title)
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="pt-empty">
                <ListChecks size={27} />
                <strong>
                  {items.length
                    ? "Nenhum item neste filtro"
                    : "Quebre o projeto em entregas"}
                </strong>
                <p>
                  {items.length
                    ? "Escolha outro filtro ou adicione uma nova ação."
                    : "Adicione o primeiro item e defina seu prazo e prioridade."}
                </p>
              </div>
            )}
          </>
        )}
        {section === "milestones" && (
          <>
            <div className="pt-toolbar">
              <p>
                {milestones.filter((item) => item.completed).length} de{" "}
                {milestones.length} etapas concluídas
              </p>
              <button
                type="button"
                className="ws-primary"
                disabled={Boolean(busy)}
                onClick={() => openEditor("milestones")}
              >
                <Plus size={15} />
                Adicionar etapa
              </button>
            </div>
            {milestones.length ? (
              <ol className="pt-milestones">
                {milestones.map((milestone, index) => {
                  const linked = items.filter(
                    (item) => item.milestone_id === milestone.id,
                  );
                  const completed = linked.filter(
                    (item) => item.completed,
                  ).length;
                  const late =
                    !milestone.completed &&
                    Boolean(milestone.due_date && milestone.due_date < today);
                  return (
                    <li
                      key={milestone.id}
                      className={`${milestone.completed ? "is-complete" : ""} ${late ? "is-overdue" : ""}`}
                    >
                      <span className="pt-step-number">
                        {milestone.completed ? (
                          <Check size={17} />
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </span>
                      <div className="pt-item-main">
                        <strong>{milestone.title}</strong>
                        <div className="pt-item-meta">
                          {milestone.due_date && (
                            <time
                              dateTime={milestone.due_date}
                              className={late ? "pt-late" : ""}
                            >
                              <CalendarDays size={12} />
                              {shortDate(milestone.due_date)}
                              {late ? " · atrasada" : ""}
                            </time>
                          )}
                          <span>
                            {linked.length
                              ? `${completed}/${linked.length} itens concluídos`
                              : "Sem itens vinculados"}
                          </span>
                        </div>
                        {linked.length > 0 && (
                          <progress
                            value={completed}
                            max={linked.length}
                            aria-label={`Checklist da etapa ${milestone.title}: ${completed} de ${linked.length}`}
                          />
                        )}
                      </div>
                      <div className="pt-milestone-actions">
                        <button
                          type="button"
                          className="pt-state-button"
                          disabled={Boolean(busy)}
                          aria-label={`${milestone.completed ? "Reabrir" : "Concluir"} etapa ${milestone.title}`}
                          onClick={() =>
                            void save(
                              {
                                milestones: milestones.map((value) =>
                                  value.id === milestone.id
                                    ? { ...value, completed: !value.completed }
                                    : value,
                                ),
                              },
                              milestone.id,
                              () => {},
                            )
                          }
                        >
                          {busy === milestone.id ? (
                            <LoaderCircle size={14} className="pt-spin" />
                          ) : (
                            <CheckCheck size={14} />
                          )}
                          {milestone.completed ? "Reabrir" : "Concluir"}
                        </button>
                        <div className="pt-item-actions">
                          <button
                            type="button"
                            className="ws-icon-button"
                            disabled={Boolean(busy)}
                            aria-label={`Editar etapa ${milestone.title}`}
                            onClick={() =>
                              openEditor("milestones", milestone.id)
                            }
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="ws-icon-button"
                            disabled={Boolean(busy)}
                            aria-label={`Excluir etapa ${milestone.title}`}
                            onClick={() =>
                              requestDelete(
                                "milestones",
                                milestone.id,
                                milestone.title,
                              )
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="pt-empty">
                <Flag size={27} />
                <strong>Defina os marcos do projeto</strong>
                <p>
                  Organize fases como pesquisa, protótipo e entrega. Vincule os
                  itens do checklist a cada etapa.
                </p>
              </div>
            )}
          </>
        )}
        {section === "updates" && (
          <>
            <div className="pt-toolbar">
              <label className="pt-filter">
                Mostrar
                <select
                  aria-label="Mostrar"
                  value={logFilter}
                  onChange={(event) =>
                    setLogFilter(event.target.value as typeof logFilter)
                  }
                >
                  <option value="all">Todos os registros</option>
                  <option value="blocker">
                    Impedimentos abertos ({blockers.length})
                  </option>
                </select>
              </label>
              <button
                type="button"
                className="ws-primary"
                disabled={Boolean(busy)}
                onClick={() => openEditor("updates")}
              >
                <Plus size={15} />
                Novo registro
              </button>
            </div>
            {visibleUpdates.length ? (
              <ol className="pt-updates">
                {visibleUpdates.map((entry) => (
                  <li
                    key={entry.id}
                    className={`pt-update pt-update-${entry.kind} ${entry.resolved ? "is-resolved" : ""}`}
                  >
                    <div className="pt-update-top">
                      <span className="pt-update-kind">
                        {entry.kind === "blocker" ? (
                          <AlertCircle size={14} />
                        ) : entry.kind === "decision" ? (
                          <Flag size={14} />
                        ) : (
                          <MessageSquareText size={14} />
                        )}
                        {kinds[entry.kind]}
                        {entry.kind === "blocker" && entry.resolved
                          ? " resolvido"
                          : ""}
                      </span>
                      <time dateTime={entry.created_at}>
                        {logDate(entry.created_at)}
                      </time>
                      <div className="pt-item-actions">
                        <button
                          type="button"
                          className="ws-icon-button"
                          disabled={Boolean(busy)}
                          aria-label={`Editar registro: ${entry.body.slice(0, 60)}`}
                          onClick={() => openEditor("updates", entry.id)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="ws-icon-button"
                          disabled={Boolean(busy)}
                          aria-label={`Excluir registro: ${entry.body.slice(0, 60)}`}
                          onClick={() =>
                            requestDelete("updates", entry.id, entry.body)
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <p>{entry.body}</p>
                    {entry.kind === "blocker" && (
                      <button
                        type="button"
                        className="pt-state-button"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void save(
                            {
                              updates: updates.map((value) =>
                                value.id === entry.id
                                  ? { ...value, resolved: !value.resolved }
                                  : value,
                              ),
                            },
                            entry.id,
                            () => {},
                          )
                        }
                      >
                        {busy === entry.id ? (
                          <LoaderCircle size={14} className="pt-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        {entry.resolved
                          ? "Reabrir impedimento"
                          : "Marcar como resolvido"}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="pt-empty">
                <MessageSquareText size={27} />
                <strong>
                  {logFilter === "blocker"
                    ? "Nenhum impedimento aberto"
                    : "Guarde o contexto das decisões"}
                </strong>
                <p>
                  {logFilter === "blocker"
                    ? "Quando algo bloquear o projeto, registre aqui para acompanhar a resolução."
                    : "Registre avanços, escolhas e dificuldades para retomar o trabalho de onde parou."}
                </p>
              </div>
            )}
          </>
        )}
      </div>
      {editor && (
        <WorkspaceDialog
          title={
            editor.section === "checklist"
              ? editor.id
                ? "Editar item do checklist"
                : "Adicionar item ao checklist"
              : editor.section === "milestones"
                ? editor.id
                  ? "Editar etapa"
                  : "Adicionar etapa"
                : editor.id
                  ? "Editar registro"
                  : "Novo registro no diário"
          }
          onClose={() => {
            if (!pending.current) setEditor(null);
          }}
        >
          <form className="pt-form" onSubmit={submitEditor}>
            {editor.section === "updates" && (
              <label>
                Tipo de registro
                <select
                  aria-label="Tipo de registro"
                  value={editor.kind}
                  disabled={Boolean(busy)}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      kind: event.target.value as Editor["kind"],
                    })
                  }
                >
                  {Object.entries(kinds).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              {editor.section === "updates"
                ? "O que aconteceu?"
                : editor.section === "milestones"
                  ? "Nome da etapa"
                  : "O que precisa ser feito?"}
              {editor.section === "updates" ? (
                <textarea
                  data-autofocus
                  required
                  maxLength={5000}
                  rows={5}
                  disabled={Boolean(busy)}
                  value={editor.title}
                  onChange={(event) =>
                    setEditor({ ...editor, title: event.target.value })
                  }
                  placeholder="Descreva o avanço, a decisão ou o impedimento…"
                />
              ) : (
                <input
                  data-autofocus
                  required
                  maxLength={300}
                  disabled={Boolean(busy)}
                  value={editor.title}
                  onChange={(event) =>
                    setEditor({ ...editor, title: event.target.value })
                  }
                  placeholder={
                    editor.section === "milestones"
                      ? "Ex.: Validar o protótipo"
                      : "Ex.: Testar a leitura do sensor"
                  }
                />
              )}
            </label>
            {editor.section !== "updates" && (
              <div className="pt-form-grid">
                <label>
                  Prazo <small>opcional</small>
                  <input
                    type="date"
                    min="0001-01-01"
                    max="9999-12-31"
                    disabled={Boolean(busy)}
                    value={editor.due_date}
                    onChange={(event) =>
                      setEditor({ ...editor, due_date: event.target.value })
                    }
                  />
                </label>
                {editor.section === "checklist" && (
                  <label>
                    Prioridade
                    <select
                      aria-label="Prioridade"
                      value={editor.priority}
                      disabled={Boolean(busy)}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          priority: event.target.value as Editor["priority"],
                        })
                      }
                    >
                      {Object.entries(priorities).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            {editor.section === "checklist" && (
              <label>
                Etapa
                <select
                  aria-label="Etapa"
                  value={editor.milestone_id}
                  disabled={Boolean(busy)}
                  onChange={(event) =>
                    setEditor({ ...editor, milestone_id: event.target.value })
                  }
                >
                  <option value="">Sem etapa</option>
                  {milestones.map((milestone) => (
                    <option key={milestone.id} value={milestone.id}>
                      {milestone.title}
                      {milestone.completed ? " (concluída)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {errorContent}
            {notice && (
              <p className="pt-notice" role="status">
                {notice}
              </p>
            )}
            <footer>
              <button
                type="button"
                className="pt-secondary"
                disabled={Boolean(busy)}
                onClick={() => setEditor(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="ws-primary"
                disabled={Boolean(busy) || !editor.title.trim()}
              >
                {busy === "editor" ? (
                  <LoaderCircle size={15} className="pt-spin" />
                ) : (
                  <Check size={15} />
                )}
                {busy === "editor"
                  ? "Salvando…"
                  : editor.id
                    ? "Salvar alterações"
                    : "Adicionar"}
              </button>
            </footer>
          </form>
        </WorkspaceDialog>
      )}
      {deleteTarget && (
        <WorkspaceDialog
          title={
            deleteTarget.section === "checklist"
              ? "Excluir item do checklist?"
              : deleteTarget.section === "milestones"
                ? "Excluir etapa?"
                : "Excluir registro do diário?"
          }
          onClose={() => {
            if (!pending.current) setDeleteTarget(null);
          }}
        >
          <div className="pt-form">
            <p className="pt-delete-copy">
              {deleteTarget.section === "milestones"
                ? "A etapa será excluída e seus itens continuarão no checklist, sem vínculo com uma etapa."
                : "Este registro será excluído permanentemente do acompanhamento do projeto."}
            </p>
            <blockquote className="pt-delete-preview">
              {deleteTarget.title}
            </blockquote>
            {errorContent}
            {notice && (
              <p className="pt-notice" role="status">
                {notice}
              </p>
            )}
            <footer>
              <button
                data-autofocus
                type="button"
                className="pt-secondary"
                disabled={Boolean(busy)}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="pt-danger"
                disabled={Boolean(busy)}
                onClick={remove}
              >
                {busy === "delete" ? (
                  <LoaderCircle className="pt-spin" size={15} />
                ) : (
                  <Trash2 size={15} />
                )}
                {busy === "delete" ? "Excluindo…" : "Excluir definitivamente"}
              </button>
            </footer>
          </div>
        </WorkspaceDialog>
      )}
    </section>
  );
}
