import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  FolderKanban,
  Globe2,
  Link2,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Target,
  Trash2,
  Unlink,
} from "lucide-react";
import { Link } from "react-router-dom";
import LocalImage from "../LocalImage";
import WorkspaceDialog from "./WorkspaceDialog";
import ProjectTracking from "./ProjectTracking";
import type { Project } from "../../types";
import { useLocalePath } from "../../lib/routes";
import { slugOf } from "../../utils/slug";
import type { PersonalWorkspaceData } from "../../hooks/usePersonalWorkspace";
import {
  createTask,
  todayKey,
  updateTask,
  type AdminTask,
} from "../../lib/adminToolsService";
import {
  createWorkspaceProject,
  deleteWorkspaceProject,
  updateWorkspaceProject,
  type AdminWorkspaceProject,
} from "../../lib/workspaceProjectsService";
import "./workspace-projects.css";

interface Props {
  projects: AdminWorkspaceProject[];
  loading: boolean;
  error: string;
  onReload: () => Promise<void>;
  workspace: PersonalWorkspaceData;
  workspaceLoading: boolean;
  workspaceError: string;
  requestedId?: string | null;
  portfolioProjects: Project[];
  portfolioLoading?: boolean;
  portfolioError?: boolean;
  requestedPortfolioId?: string | null;
  onOpenItem: (tab: "tarefas" | "notas" | "links", id: string) => void;
  onSelectProject?: (id: string | null) => void;
}
type Status = AdminWorkspaceProject["status"];
type ReferenceKind = "tasks" | "notes" | "links";
const statuses: { value: Status; label: string }[] = [
  { value: "active", label: "Em andamento" },
  { value: "planned", label: "Planejado" },
  { value: "paused", label: "Em pausa" },
  { value: "completed", label: "Concluído" },
];
const referenceLabels = { tasks: "tarefas", notes: "notas", links: "links" };
const referenceFields = {
  tasks: "task_ids",
  notes: "note_ids",
  links: "link_ids",
} as const;
const initialForm = {
  title: "",
  goal: "",
  due_date: "",
  status: "active" as Status,
  portfolio_project_id: "",
};

function portfolioForm(project: Project) {
  return {
    ...initialForm,
    title: project.title.slice(0, 160),
    goal: (project.description || "").slice(0, 2000),
    portfolio_project_id: project.id,
    status: project.emPlanejamento
      ? ("planned" as Status)
      : ("active" as Status),
  };
}

function dateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function projectTasks(project: AdminWorkspaceProject, tasks: AdminTask[]) {
  return project.task_ids.flatMap((id) => {
    const task = tasks.find((item) => item.id === id);
    return task ? [task] : [];
  });
}
function nextAction(project: AdminWorkspaceProject, tasks: AdminTask[]) {
  return (
    tasks.find(
      (task) => task.id === project.next_task_id && task.status !== "done",
    ) ||
    tasks.find((task) => task.status === "doing") ||
    tasks.find((task) => task.status !== "done")
  );
}
function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}
function referenceUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export default function ProjectsPanel({
  projects,
  loading,
  error,
  onReload,
  workspace,
  workspaceLoading,
  workspaceError,
  requestedId,
  portfolioProjects,
  portfolioLoading = false,
  portfolioError = false,
  requestedPortfolioId,
  onOpenItem,
  onSelectProject,
}: Props) {
  const lp = useLocalePath();
  const [query, setQuery] = useState("");
  const [listMode, setListMode] = useState<"tracking" | "portfolio">(
    "tracking",
  );
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    requestedId && requestedId !== "new" ? requestedId : null,
  );
  const [editor, setEditor] = useState<"new" | AdminWorkspaceProject | null>(
    null,
  );
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<AdminWorkspaceProject | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [busy, setBusy] = useState("");
  const pending = useRef(false);
  const [picker, setPicker] = useState<ReferenceKind | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerIds, setPickerIds] = useState<string[]>([]);
  const pickerVersion = useRef<string | undefined>(undefined);
  const [pickerMode, setPickerMode] = useState<"new" | "existing">("existing");
  const [pickerError, setPickerError] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [createdTask, setCreatedTask] = useState<AdminTask | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const handledPortfolioRequest = useRef<string | null>(null);
  const portfolioUnavailable = portfolioLoading || portfolioError;
  const publicById = useMemo(
    () => new Map(portfolioProjects.map((project) => [project.id, project])),
    [portfolioProjects],
  );

  useEffect(() => {
    if (requestedId === "new") {
      setSelectedId(null);
      setForm(initialForm);
      setFormError("");
      setEditor("new");
    } else setSelectedId(requestedId || null);
  }, [requestedId]);
  useEffect(() => {
    if (!requestedPortfolioId) {
      handledPortfolioRequest.current = null;
      return;
    }
    if (
      loading ||
      error ||
      portfolioUnavailable ||
      handledPortfolioRequest.current === requestedPortfolioId
    )
      return;
    handledPortfolioRequest.current = requestedPortfolioId;
    const existing = projects.find(
      (project) => project.portfolio_project_id === requestedPortfolioId,
    );
    if (existing) {
      setSelectedId(existing.id);
      onSelectProject?.(existing.id);
      return;
    }
    const publicProject = publicById.get(requestedPortfolioId);
    if (!publicProject) {
      setActionError(
        "Este projeto do portfólio não está mais disponível. Você pode acompanhar outro projeto ou criar um projeto pessoal.",
      );
      return;
    }
    setSelectedId(null);
    setForm(portfolioForm(publicProject));
    setFormError("");
    setEditor("new");
  }, [
    requestedPortfolioId,
    loading,
    error,
    portfolioUnavailable,
    projects,
    publicById,
    onSelectProject,
  ]);
  const selected = projects.find((project) => project.id === selectedId);
  const selectedPublic = selected?.portfolio_project_id
    ? publicById.get(selected.portfolio_project_id)
    : undefined;
  const selectedProjectId = selected?.id;
  useEffect(() => {
    if (selectedProjectId) detailHeading.current?.focus();
  }, [selectedProjectId]);
  const search = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = useMemo(
    () =>
      projects.filter(
        (project) =>
          (statusFilter === "all" || project.status === statusFilter) &&
          `${project.title} ${project.goal} ${publicById.get(project.portfolio_project_id || "")?.title || ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(search),
      ),
    [projects, statusFilter, search, publicById],
  );
  const filteredPortfolio = portfolioProjects.filter((project) =>
    `${project.title} ${project.description}`
      .toLocaleLowerCase("pt-BR")
      .includes(search),
  );
  const tasks = selected ? projectTasks(selected, workspace.tasks) : [];
  const next = selected ? nextAction(selected, tasks) : undefined;
  const completed = tasks.filter((task) => task.status === "done").length;
  const notes = selected
    ? workspace.notes.filter((note) => selected.note_ids.includes(note.id))
    : [];
  const links = selected
    ? workspace.links.filter((link) => selected.link_ids.includes(link.id))
    : [];
  const workspaceUnavailable = workspaceLoading || Boolean(workspaceError);

  function closeDetail() {
    const previousId = selectedId;
    setSelectedId(null);
    onSelectProject?.(null);
    setActionError("");
    requestAnimationFrame(() =>
      (
        (previousId && cardRefs.current.get(previousId)) ||
        listHeading.current
      )?.focus(),
    );
  }
  function openEditor(project?: AdminWorkspaceProject) {
    setForm(
      project
        ? {
            title: project.title,
            goal: project.goal,
            due_date: project.due_date || "",
            status: project.status,
            portfolio_project_id: project.portfolio_project_id || "",
          }
        : initialForm,
    );
    setFormError("");
    setEditor(project || "new");
  }
  function openPortfolioProject(publicProject: Project) {
    const existing = projects.find(
      (project) => project.portfolio_project_id === publicProject.id,
    );
    setActionError("");
    setNotice("");
    if (existing) {
      setSelectedId(existing.id);
      onSelectProject?.(existing.id);
      return;
    }
    setForm(portfolioForm(publicProject));
    setFormError("");
    setEditor("new");
  }
  function changePortfolioLink(id: string) {
    const linked = publicById.get(id);
    setForm((current) => ({
      ...current,
      portfolio_project_id: id,
      title: current.title.trim()
        ? current.title
        : (linked?.title || "").slice(0, 160),
      goal: current.goal.trim()
        ? current.goal
        : (linked?.description || "").slice(0, 2000),
    }));
  }
  function closeEditor() {
    if (!pending.current) {
      setEditor(null);
      if (editor === "new" && (requestedId === "new" || requestedPortfolioId))
        onSelectProject?.(null);
    }
  }
  async function perform(
    key: string,
    action: () => Promise<void>,
    setError = setActionError,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (cause) {
      setError(
        errorMessage(cause, "Não foi possível salvar. Tente novamente."),
      );
    } finally {
      pending.current = false;
      setBusy("");
    }
  }
  async function saveProject(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    const title = form.title.trim();
    if (!title) {
      setFormError("Dê um nome ao projeto.");
      return;
    }
    const duplicate =
      form.portfolio_project_id &&
      projects.find(
        (project) =>
          project.portfolio_project_id === form.portfolio_project_id &&
          (editor === "new" || project.id !== editor.id),
      );
    if (duplicate) {
      if (editor === "new") {
        setEditor(null);
        setSelectedId(duplicate.id);
        onSelectProject?.(duplicate.id);
        setNotice(
          "Este projeto já tem um acompanhamento. Ele foi aberto para você.",
        );
      } else
        setFormError(
          "Este projeto do portfólio já tem um acompanhamento. Escolha outro projeto ou mantenha este como pessoal.",
        );
      return;
    }
    await perform(
      "project",
      async () => {
        const input = {
          title,
          goal: form.goal.trim(),
          due_date: form.due_date || null,
          status: form.status,
          portfolio_project_id: form.portfolio_project_id || null,
        };
        const saved =
          editor === "new"
            ? await createWorkspaceProject(input)
            : await updateWorkspaceProject(editor.id, input, editor.updated_at);
        setSelectedId(saved.id);
        onSelectProject?.(saved.id);
        setEditor(null);
        setNotice(editor === "new" ? "Projeto criado." : "Projeto atualizado.");
        try {
          await onReload();
        } catch (cause) {
          setActionError(
            errorMessage(
              cause,
              "O projeto foi salvo, mas não foi possível atualizar a lista. Atualize para ver a versão salva.",
            ),
          );
        }
      },
      setFormError,
    );
  }
  function openPicker(
    kind: ReferenceKind,
    mode: "new" | "existing" = "existing",
  ) {
    if (!selected) return;
    setPickerIds([...selected[referenceFields[kind]]]);
    pickerVersion.current = selected.updated_at;
    setPickerQuery("");
    setPickerError("");
    setPickerMode(mode);
    setNewTaskTitle("");
    setCreatedTask(null);
    setPicker(kind);
  }
  function closePicker() {
    if (!pending.current) setPicker(null);
  }
  async function saveReferences(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !picker) return;
    await perform(
      "references",
      async () => {
        await updateWorkspaceProject(
          selected.id,
          {
            [referenceFields[picker]]: pickerIds,
            ...(picker === "tasks" &&
            selected.next_task_id &&
            !pickerIds.includes(selected.next_task_id)
              ? { next_task_id: null }
              : {}),
          },
          pickerVersion.current,
        );
        await onReload();
        setPicker(null);
        setNotice("Vínculos atualizados.");
      },
      setPickerError,
    );
  }
  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || (!createdTask && !newTaskTitle.trim())) return;
    await perform(
      "new-task",
      async () => {
        const task =
          createdTask ||
          (await createTask({
            title: newTaskTitle.trim(),
            position:
              workspace.tasks.reduce(
                (maximum, item) => Math.max(maximum, item.position),
                0,
              ) + 1,
          }));
        setCreatedTask(task);
        try {
          await updateWorkspaceProject(
            selected.id,
            {
              task_ids: Array.from(new Set([...selected.task_ids, task.id])),
              ...(!next ? { next_task_id: task.id } : {}),
            },
            selected.updated_at,
          );
        } catch (cause) {
          try {
            await onReload();
          } catch (refreshCause) {
            throw new Error(
              `A tarefa foi criada no quadro, mas não foi possível vincular nem atualizar o projeto. ${errorMessage(refreshCause, "Falha ao atualizar.")} Atualize os projetos antes de tentar vincular a tarefa criada; ela não será duplicada.`,
            );
          }
          throw new Error(
            `A tarefa foi criada no quadro, mas o vínculo falhou. ${errorMessage(cause, "")} Tente vincular novamente abaixo; a tarefa não será duplicada.`,
          );
        }
        setPicker(null);
        setNotice("Tarefa adicionada ao projeto.");
        try {
          await onReload();
        } catch (cause) {
          setActionError(
            errorMessage(
              cause,
              "A tarefa foi vinculada, mas não foi possível atualizar o projeto. Atualize para ver a versão salva.",
            ),
          );
        }
      },
      setPickerError,
    );
  }
  async function unlink(kind: ReferenceKind, id: string) {
    if (!selected) return;
    await perform(`unlink-${id}`, async () => {
      await updateWorkspaceProject(
        selected.id,
        {
          [referenceFields[kind]]: selected[referenceFields[kind]].filter(
            (item) => item !== id,
          ),
          ...(kind === "tasks" && selected.next_task_id === id
            ? { next_task_id: null }
            : {}),
        },
        selected.updated_at,
      );
      await onReload();
      setNotice("Item desvinculado. Ele continua salvo no seu espaço.");
    });
  }
  async function toggleTask(task: AdminTask) {
    await perform(`task-${task.id}`, async () => {
      await updateTask(task.id, {
        status: task.status === "done" ? "todo" : "done",
      });
      await onReload();
      setNotice(
        task.status === "done" ? "Tarefa reaberta." : "Tarefa concluída.",
      );
    });
  }
  async function chooseNext(task: AdminTask) {
    if (!selected) return;
    await perform(`next-${task.id}`, async () => {
      await updateWorkspaceProject(
        selected.id,
        { next_task_id: task.id },
        selected.updated_at,
      );
      await onReload();
      setNotice("Próxima ação definida.");
    });
  }
  async function removeProject(project: AdminWorkspaceProject) {
    await perform(
      "delete",
      async () => {
        await deleteWorkspaceProject(project.id);
        await onReload();
        setDeleteTarget(null);
        closeDetail();
        setNotice(
          "Projeto excluído. As tarefas, notas e links foram preservados.",
        );
      },
      setDeleteError,
    );
  }
  const pickerItems =
    picker === "tasks"
      ? workspace.tasks.map((item) => ({
          id: item.id,
          title: item.title,
          description:
            item.status === "done"
              ? "Concluída"
              : item.status === "doing"
                ? "Em andamento"
                : "A fazer",
        }))
      : picker === "notes"
        ? workspace.notes.map((item) => ({
            id: item.id,
            title: item.title || "Nota sem título",
            description: item.content.slice(0, 100),
          }))
        : workspace.links.map((item) => ({
            id: item.id,
            title: item.title || item.url,
            description: item.url,
          }));
  const visiblePickerItems = pickerItems.filter((item) =>
    `${item.title} ${item.description}`
      .toLocaleLowerCase("pt-BR")
      .includes(pickerQuery.trim().toLocaleLowerCase("pt-BR")),
  );

  return (
    <section className="wp-panel" aria-label="Projetos pessoais">
      {(error || actionError) && (
        <div className="ws-error-banner wp-error" role="alert">
          <span>{actionError || error}</span>
          {error && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void onReload()}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
      <div className="wp-announcement" role="status" aria-live="polite">
        {notice}
      </div>
      {loading ? (
        <div className="wp-loading" role="status">
          <LoaderCircle size={20} className="wp-spin" /> Carregando projetos…
        </div>
      ) : selected ? (
        <>
          <div className="wp-detail-toolbar">
            <button
              type="button"
              className="wp-text-button"
              onClick={closeDetail}
            >
              <ArrowLeft size={16} /> Todos os projetos
            </button>
            <div>
              <button
                type="button"
                className="wp-secondary"
                disabled={Boolean(busy)}
                onClick={() => openEditor(selected)}
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                type="button"
                className="ws-icon-button wp-delete"
                aria-label={`Excluir projeto ${selected.title}`}
                title="Excluir projeto"
                disabled={Boolean(busy)}
                onClick={() => {
                  setDeleteError("");
                  setDeleteTarget(selected);
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="wp-project-intro">
            <span className={`wp-status wp-status-${selected.status}`}>
              {statuses.find((item) => item.value === selected.status)?.label}
            </span>
            <h1 ref={detailHeading} tabIndex={-1}>
              {selected.title}
            </h1>
            {selected.goal ? (
              <p>{selected.goal}</p>
            ) : (
              <button
                type="button"
                className="wp-text-button"
                onClick={() => openEditor(selected)}
              >
                <Target size={15} /> Definir objetivo
              </button>
            )}
            {selected.due_date && (
              <span
                className={`wp-date ${selected.due_date < todayKey() && selected.status !== "completed" ? "wp-overdue" : ""}`}
              >
                <CalendarDays size={14} />{" "}
                {selected.due_date < todayKey() &&
                selected.status !== "completed"
                  ? "Prazo vencido em "
                  : "Prazo: "}
                {dateLabel(selected.due_date)}
              </span>
            )}
          </div>
          <section
            className="wp-portfolio-link"
            aria-label="Vínculo com o portfólio"
          >
            {selectedPublic?.imageUrl && !portfolioUnavailable ? (
              <LocalImage
                src={selectedPublic.imageUrl}
                alt=""
                sizes="73px"
                className="wp-linked-cover"
              />
            ) : (
              <span className="wp-linked-icon">
                <Globe2 size={22} />
              </span>
            )}
            <div className="wp-linked-copy">
              <span className="wp-eyebrow">NO SEU PORTFÓLIO</span>
              {portfolioUnavailable && selected.portfolio_project_id ? (
                <p>
                  {portfolioLoading
                    ? "Carregando o projeto do site…"
                    : "Não foi possível consultar o projeto do site."}
                </p>
              ) : selectedPublic ? (
                <>
                  <h2>{selectedPublic.title}</h2>
                  <p>
                    <span
                      className={`wp-publication ${selectedPublic.draft ? "is-draft" : ""}`}
                    >
                      {selectedPublic.draft ? "Rascunho" : "Publicado"}
                    </span>{" "}
                    Seu planejamento e suas anotações ficam privados.
                  </p>
                </>
              ) : (
                <>
                  <h2>
                    {selected.portfolio_project_id
                      ? "Projeto do portfólio indisponível"
                      : "Conecte este acompanhamento ao seu site"}
                  </h2>
                  <p>
                    {selected.portfolio_project_id
                      ? "Seu acompanhamento continua salvo. Você pode trocar ou remover o vínculo."
                      : "Associe a um projeto publicado ou em rascunho para acessar tudo por aqui."}
                  </p>
                </>
              )}
            </div>
            <div className="wp-linked-actions">
              {selectedPublic && !portfolioUnavailable && (
                <>
                  {!selectedPublic.draft && (
                    <Link
                      className="wp-secondary"
                      to={lp(
                        `/projetos/${encodeURIComponent(slugOf(selectedPublic))}`,
                      )}
                    >
                      <ArrowUpRight size={14} /> Ver no site
                    </Link>
                  )}
                  <Link
                    className="wp-secondary"
                    to={lp(
                      `/admin/projetos/${encodeURIComponent(slugOf(selectedPublic))}`,
                    )}
                  >
                    <Pencil size={14} /> Editar conteúdo
                  </Link>
                </>
              )}
              <button
                type="button"
                className="wp-text-button"
                disabled={Boolean(busy) || portfolioUnavailable}
                onClick={() => openEditor(selected)}
              >
                <Link2 size={14} />{" "}
                {selected.portfolio_project_id
                  ? "Alterar vínculo"
                  : "Vincular projeto"}
              </button>
            </div>
          </section>
          <ProjectTracking
            key={selected.id}
            project={selected}
            onReload={onReload}
          />
          {workspaceError && (
            <div className="ws-error-banner wp-error" role="alert">
              {workspaceError}
            </div>
          )}
          <div className="wp-detail-grid">
            <div className="wp-actions-column">
              <section className="wp-section" aria-label="Tarefas do projeto">
                <div className="wp-section-heading">
                  <h3>
                    Ações <span>{!workspaceUnavailable && tasks.length}</span>
                  </h3>
                  <button
                    type="button"
                    className="wp-text-button"
                    disabled={Boolean(busy) || workspaceUnavailable}
                    onClick={() => openPicker("tasks", "new")}
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                {!workspaceUnavailable && tasks.length > 0 && (
                  <div className="wp-progress-block">
                    <div>
                      <span>
                        {completed} de {tasks.length} concluídas
                      </span>
                      <strong>
                        {Math.round((completed / tasks.length) * 100)}%
                      </strong>
                    </div>
                    <progress
                      max={tasks.length}
                      value={completed}
                      aria-label="Progresso das tarefas do projeto"
                    />
                  </div>
                )}
                {workspaceUnavailable ? (
                  <p className="wp-section-empty">
                    {workspaceLoading
                      ? "Carregando…"
                      : "As ações ficam disponíveis quando a conexão voltar."}
                  </p>
                ) : tasks.length ? (
                  <ul className="wp-task-list">
                    {tasks.map((task) => (
                      <li
                        key={task.id}
                        className={task.status === "done" ? "wp-task-done" : next?.id === task.id ? "wp-task-next" : ""}
                      >
                        <button
                          type="button"
                          className="wp-task-check"
                          aria-label={`${task.status === "done" ? "Reabrir" : "Concluir"} ${task.title}`}
                          disabled={Boolean(busy)}
                          onClick={() => void toggleTask(task)}
                        >
                          {task.status === "done" ? (
                            <Check size={18} />
                          ) : (
                            <Circle size={19} />
                          )}
                        </button>
                        <div className="wp-task-copy">
                          <button
                            type="button"
                            onClick={() => onOpenItem("tarefas", task.id)}
                          >
                            {task.title}
                          </button>
                          {task.status === "doing" && <span>Em andamento</span>}
                          {next?.id === task.id && (
                            <span className="wp-task-next-label">Próxima</span>
                          )}
                        </div>
                        {task.status !== "done" && (
                          <button
                            type="button"
                            className={`ws-icon-button wp-next-select ${next?.id === task.id ? "is-next" : ""}`}
                            aria-label={`Definir ${task.title} como próxima ação`}
                            aria-pressed={next?.id === task.id}
                            title={
                              next?.id === task.id
                                ? "Próxima ação"
                                : "Definir como próxima ação"
                            }
                            disabled={Boolean(busy) || next?.id === task.id}
                            onClick={() => void chooseNext(task)}
                          >
                            <Target size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="ws-icon-button wp-unlink"
                          aria-label={`Desvincular tarefa ${task.title}`}
                          title="Desvincular do projeto"
                          disabled={Boolean(busy)}
                          onClick={() => void unlink("tasks", task.id)}
                        >
                          <Unlink size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="wp-section-empty">
                    <p>Transforme o objetivo em passos pequenos.</p>
                    <button
                      type="button"
                      className="wp-text-button"
                      disabled={Boolean(busy)}
                      onClick={() => openPicker("tasks")}
                    >
                      <Link2 size={14} /> Vincular tarefas existentes
                    </button>
                  </div>
                )}
                {tasks.length > 0 && !workspaceUnavailable && (
                  <button
                    type="button"
                    className="wp-section-footer wp-text-button"
                    disabled={Boolean(busy)}
                    onClick={() => openPicker("tasks")}
                  >
                    <Link2 size={14} /> Vincular tarefas existentes
                  </button>
                )}
              </section>
            </div>
            <div className="wp-references-column">
              <section className="wp-section" aria-label="Notas do projeto">
                <div className="wp-section-heading">
                  <h3>
                    <StickyNote size={16} /> Notas{" "}
                    <span>{!workspaceUnavailable && notes.length}</span>
                  </h3>
                  <button
                    type="button"
                    className="wp-text-button"
                    disabled={Boolean(busy) || workspaceUnavailable}
                    onClick={() => openPicker("notes")}
                  >
                    <Plus size={14} /> Vincular
                  </button>
                </div>
                {workspaceUnavailable ? (
                  <p className="wp-section-empty">
                    {workspaceLoading ? "Carregando…" : "Notas indisponíveis."}
                  </p>
                ) : notes.length ? (
                  <ul className="wp-reference-list">
                    {notes.map((note) => (
                      <li key={note.id}>
                        <button
                          type="button"
                          className="wp-reference-open"
                          onClick={() => onOpenItem("notas", note.id)}
                        >
                          <strong>{note.title || "Nota sem título"}</strong>
                          <span>
                            {note.content
                              .replace(/[#*`>]/g, "")
                              .slice(0, 100) || "Abrir nota"}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="ws-icon-button wp-unlink"
                          title="Desvincular do projeto"
                          aria-label={`Desvincular nota ${note.title || "sem título"}`}
                          disabled={Boolean(busy)}
                          onClick={() => void unlink("notes", note.id)}
                        >
                          <Unlink size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="wp-section-empty">
                    Reúna decisões e ideias que ajudam este projeto.
                  </p>
                )}
              </section>
              <section className="wp-section" aria-label="Links do projeto">
                <div className="wp-section-heading">
                  <h3>
                    <Bookmark size={16} /> Links{" "}
                    <span>{!workspaceUnavailable && links.length}</span>
                  </h3>
                  <button
                    type="button"
                    className="wp-text-button"
                    disabled={Boolean(busy) || workspaceUnavailable}
                    onClick={() => openPicker("links")}
                  >
                    <Plus size={14} /> Vincular
                  </button>
                </div>
                {workspaceUnavailable ? (
                  <p className="wp-section-empty">
                    {workspaceLoading ? "Carregando…" : "Links indisponíveis."}
                  </p>
                ) : links.length ? (
                  <ul className="wp-reference-list">
                    {links.map((link) => (
                      <li key={link.id}>
                        <a
                          className="wp-reference-open"
                          href={referenceUrl(link.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Abrir referência ${link.title || link.url} em nova aba`}
                        >
                          <strong>{link.title || link.url}</strong>
                          <span>{link.url}</span>
                        </a>
                        <button
                          type="button"
                          className="ws-icon-button"
                          title="Editar referência"
                          aria-label={`Editar referência ${link.title || link.url}`}
                          onClick={() => onOpenItem("links", link.id)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="ws-icon-button wp-unlink"
                          title="Desvincular do projeto"
                          aria-label={`Desvincular link ${link.title || link.url}`}
                          disabled={Boolean(busy)}
                          onClick={() => void unlink("links", link.id)}
                        >
                          <Unlink size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="wp-section-empty">
                    Tenha suas fontes e referências por perto.
                  </p>
                )}
              </section>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="wp-list-heading">
            <div>
              <h1 ref={listHeading} tabIndex={-1}>
                Projetos pessoais
              </h1>
              <p>
                {projects.length
                  ? `${projects.filter((project) => project.status === "active").length} em andamento · ${projects.filter((project) => project.status === "completed").length} concluídos`
                  : "Planeje as entregas e acompanhe os projetos do seu portfólio."}
              </p>
            </div>
            <button
              type="button"
              className="ws-primary"
              disabled={Boolean(busy) || Boolean(error)}
              onClick={() => openEditor()}
            >
              <Plus size={16} /> Novo projeto
            </button>
          </div>
          <div
            className="wp-source-tabs"
            role="group"
            aria-label="Origem dos projetos"
          >
            <button
              type="button"
              aria-pressed={listMode === "tracking"}
              onClick={() => setListMode("tracking")}
            >
              <FolderKanban size={16} /> Em acompanhamento{" "}
              <span>{projects.length}</span>
            </button>
            <button
              type="button"
              aria-pressed={listMode === "portfolio"}
              onClick={() => setListMode("portfolio")}
            >
              <Globe2 size={16} /> Do portfólio{" "}
              <span>
                {portfolioUnavailable ? "—" : portfolioProjects.length}
              </span>
            </button>
          </div>
          {selectedId && !selected && !error && (
            <p className="wp-inline-note" role="status">
              Este projeto não está mais disponível.
            </p>
          )}
          {(projects.length > 0 || listMode === "portfolio") && (
            <div className="wp-filters">
              <label className="wp-search">
                <Search size={16} />
                <input
                  type="search"
                  aria-label="Buscar projetos"
                  placeholder="Buscar projetos…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              {listMode === "tracking" && (
                <select
                  aria-label="Filtrar projetos por status"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as Status | "all")
                  }
                >
                  <option value="all">Todos os status</option>
                  {statuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          {listMode === "portfolio" ? (
            <>
              <p className="wp-source-description">
                Os projetos que já existem no site, publicados ou em rascunho.
                Inicie um acompanhamento para organizar entregas, prazos e
                decisões.
              </p>
              {portfolioUnavailable ? (
                <div className="wp-empty" role="status">
                  <Globe2 size={28} />
                  <h3>
                    {portfolioLoading
                      ? "Carregando seu portfólio…"
                      : "Não foi possível carregar seu portfólio"}
                  </h3>
                  <p>
                    {portfolioLoading
                      ? "Seus projetos aparecerão aqui em instantes."
                      : "Atualize a página para tentar novamente. Seus acompanhamentos continuam disponíveis."}
                  </p>
                </div>
              ) : filteredPortfolio.length ? (
                <div className="wp-project-grid wp-portfolio-grid">
                  {filteredPortfolio.map((publicProject) => {
                    const tracking = projects.find(
                      (project) =>
                        project.portfolio_project_id === publicProject.id,
                    );
                    return (
                      <button
                        key={publicProject.id}
                        type="button"
                        className="wp-project-card wp-portfolio-card"
                        disabled={Boolean(error) || Boolean(busy)}
                        onClick={() => openPortfolioProject(publicProject)}
                      >
                        <div className="wp-portfolio-cover">
                          {publicProject.imageUrl ? (
                            <LocalImage
                              src={publicProject.imageUrl}
                              alt=""
                              className="wp-portfolio-cover-image"
                              sizes="(max-width: 640px) 100vw, 400px"
                              loading="lazy"
                            />
                          ) : (
                            <Globe2 size={35} />
                          )}
                          <span
                            className={`wp-publication ${publicProject.draft ? "is-draft" : ""}`}
                          >
                            {publicProject.draft ? "Rascunho" : "Publicado"}
                          </span>
                        </div>
                        <div className="wp-portfolio-card-body">
                          <h3>{publicProject.title}</h3>
                          <p className="wp-card-goal">
                            {publicProject.description ||
                              "Organize os próximos passos deste projeto."}
                          </p>
                          <span className="wp-portfolio-cta">
                            {tracking ? (
                              <>
                                <Check size={15} /> Abrir acompanhamento
                              </>
                            ) : (
                              <>
                                <Plus size={15} /> Iniciar acompanhamento
                              </>
                            )}
                            <ArrowUpRight size={16} />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="wp-empty">
                  <span>
                    <Globe2 size={28} />
                  </span>
                  <h3>
                    {search
                      ? "Nenhum projeto encontrado"
                      : "Seu portfólio ainda não tem projetos"}
                  </h3>
                  <p>
                    {search
                      ? "Tente buscar por outro nome."
                      : "Crie o conteúdo do projeto no site e acompanhe a execução por aqui."}
                  </p>
                  {!search && (
                    <Link
                      className="ws-primary"
                      to={lp("/admin/projetos/novo")}
                    >
                      <Plus size={16} /> Criar projeto no portfólio
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : filtered.length > 0 ? (
            <div className="wp-project-grid">
              {filtered.map((project) => {
                const linkedTasks = projectTasks(project, workspace.tasks);
                const done = linkedTasks.filter(
                  (task) => task.status === "done",
                ).length;
                const nextTask = nextAction(project, linkedTasks);
                const checklist = project.checklist_items || [];
                const checklistDone = checklist.filter(
                  (item) => item.completed,
                ).length;
                const totalActions = linkedTasks.length + checklist.length;
                const allDone = done + checklistDone;
                const linkedPublic = publicById.get(
                  project.portfolio_project_id || "",
                );
                const nextChecklist = checklist.find((item) => !item.completed);
                const overdue =
                  project.due_date &&
                  project.due_date < todayKey() &&
                  project.status !== "completed";
                return (
                  <button
                    type="button"
                    className="wp-project-card"
                    key={project.id}
                    ref={(element) => {
                      if (element) cardRefs.current.set(project.id, element);
                      else cardRefs.current.delete(project.id);
                    }}
                    onClick={() => {
                      setSelectedId(project.id);
                      onSelectProject?.(project.id);
                      setActionError("");
                      setNotice("");
                    }}
                  >
                    <div className="wp-card-top">
                      <span className="wp-project-icon">
                        <FolderKanban size={19} />
                      </span>
                      <span className={`wp-status wp-status-${project.status}`}>
                        {
                          statuses.find((item) => item.value === project.status)
                            ?.label
                        }
                      </span>
                      <ChevronRight size={16} className="wp-card-arrow" />
                    </div>
                    <h3>{project.title}</h3>
                    {project.portfolio_project_id && !portfolioUnavailable && (
                      <span className="wp-card-connection">
                        <Globe2 size={12} />
                        {linkedPublic
                          ? `${linkedPublic.title} · ${linkedPublic.draft ? "Rascunho" : "Publicado"}`
                          : "Vínculo do portfólio indisponível"}
                      </span>
                    )}
                    <p className="wp-card-goal">
                      {project.goal ||
                        "Defina o resultado que você quer alcançar."}
                    </p>
                    <div className="wp-card-progress">
                      <span>
                        {workspaceUnavailable
                          ? workspaceLoading
                            ? "Carregando ações…"
                            : "Progresso indisponível"
                          : totalActions
                            ? `${allDone} de ${totalActions} ações concluídas`
                            : "Nenhuma ação definida"}
                      </span>
                      {checklist.length > 0 && (
                        <span className="wp-card-checklist-count">
                          Checklist {checklistDone}/{checklist.length}
                          {linkedTasks.length > 0
                            ? ` · Tarefas ${done}/${linkedTasks.length}`
                            : ""}
                        </span>
                      )}
                      {!workspaceUnavailable && totalActions > 0 && (
                        <progress
                          max={totalActions}
                          value={allDone}
                          aria-label={`Progresso de ${project.title}`}
                        />
                      )}
                    </div>
                    <div className="wp-card-next">
                      <Target size={13} />
                      <span>
                        {workspaceUnavailable
                          ? "Abra para ver o projeto"
                          : nextTask?.title ||
                            nextChecklist?.title ||
                            (totalActions
                              ? "Todas as ações concluídas"
                              : "Adicione o primeiro passo")}
                      </span>
                    </div>
                    {project.due_date && (
                      <span
                        className={`wp-date ${overdue ? "wp-overdue" : ""}`}
                      >
                        <CalendarDays size={12} />
                        {overdue ? "Prazo vencido · " : ""}
                        {dateLabel(project.due_date)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="wp-empty">
              <span>
                <FolderKanban size={28} />
              </span>
              <h3>
                {projects.length
                  ? "Nenhum projeto encontrado"
                  : error
                    ? "Não foi possível carregar os projetos"
                    : "Seu próximo projeto começa aqui"}
              </h3>
              <p>
                {projects.length
                  ? "Tente outro termo ou mude o filtro."
                  : error
                    ? "Tente atualizar para ver seus projetos."
                    : "O que você quer tirar do papel?"}
              </p>
              {!projects.length && !error && (
                <div className="wp-empty-actions">
                  {!portfolioUnavailable && portfolioProjects.length > 0 && (
                    <button
                      type="button"
                      className="ws-primary"
                      onClick={() => setListMode("portfolio")}
                    >
                      <Globe2 size={16} /> Escolher do portfólio
                    </button>
                  )}
                  <button
                    type="button"
                    className="wp-secondary"
                    onClick={() => openEditor()}
                  >
                    <Plus size={16} /> Criar meu primeiro projeto
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {editor && (
        <WorkspaceDialog
          title={editor === "new" ? "Novo projeto" : "Editar projeto"}
          onClose={closeEditor}
        >
          <form
            className="wp-form"
            onSubmit={(event) => void saveProject(event)}
          >
            <label htmlFor="wp-portfolio">
              Projeto do portfólio <span>Opcional</span>
            </label>
            <select
              id="wp-portfolio"
              value={form.portfolio_project_id}
              disabled={Boolean(busy) || portfolioUnavailable}
              onChange={(event) => changePortfolioLink(event.target.value)}
            >
              <option value="">Projeto pessoal, sem vínculo com o site</option>
              {form.portfolio_project_id &&
                !publicById.has(form.portfolio_project_id) && (
                  <option value={form.portfolio_project_id}>
                    {portfolioUnavailable
                      ? "Carregando vínculo…"
                      : "Projeto do portfólio indisponível"}
                  </option>
                )}
              {!portfolioUnavailable &&
                portfolioProjects.map((publicProject) => {
                  const inUse = projects.some(
                    (project) =>
                      project.portfolio_project_id === publicProject.id &&
                      (editor === "new" || project.id !== editor.id),
                  );
                  return (
                    <option
                      key={publicProject.id}
                      value={publicProject.id}
                      disabled={inUse}
                    >
                      {publicProject.title} ·{" "}
                      {inUse
                        ? "Já em acompanhamento"
                        : publicProject.draft
                          ? "Rascunho"
                          : "Publicado"}
                    </option>
                  );
                })}
            </select>
            <p className="wp-picker-note">
              {portfolioUnavailable
                ? portfolioLoading
                  ? "Carregando os projetos do site…"
                  : "Os projetos do site estão indisponíveis no momento."
                : "O vínculo não publica nem altera o conteúdo do site. Checklist, prazos e registros ficam apenas no seu painel."}
            </p>
            <label htmlFor="wp-title">Nome do projeto</label>
            <input
              id="wp-title"
              data-autofocus
              maxLength={160}
              required
              autoComplete="off"
              placeholder="Ex.: Publicar meu primeiro artigo"
              value={form.title}
              disabled={Boolean(busy)}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
            <label htmlFor="wp-goal">
              Objetivo <span>Qual resultado você quer alcançar?</span>
            </label>
            <textarea
              id="wp-goal"
              rows={3}
              maxLength={2000}
              placeholder="Ex.: Compartilhar os resultados da minha pesquisa."
              value={form.goal}
              disabled={Boolean(busy)}
              onChange={(event) =>
                setForm({ ...form, goal: event.target.value })
              }
            />
            <div className="wp-form-row">
              <div>
                <label htmlFor="wp-date">
                  Prazo <span>Opcional</span>
                </label>
                <input
                  type="date"
                  id="wp-date"
                  value={form.due_date}
                  disabled={Boolean(busy)}
                  onChange={(event) =>
                    setForm({ ...form, due_date: event.target.value })
                  }
                />
              </div>
              <div>
                <label htmlFor="wp-status">Status</label>
                <select
                  id="wp-status"
                  value={form.status}
                  disabled={Boolean(busy)}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value as Status })
                  }
                >
                  {statuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {formError && (
              <p className="wp-form-error" role="alert">
                {formError}
              </p>
            )}
            <div className="wp-form-footer">
              <button
                type="button"
                className="wp-secondary"
                disabled={Boolean(busy)}
                onClick={closeEditor}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="ws-primary"
                disabled={Boolean(busy) || !form.title.trim()}
              >
                {busy === "project" ? (
                  <LoaderCircle size={15} className="wp-spin" />
                ) : (
                  <Check size={15} />
                )}
                {busy === "project"
                  ? "Salvando…"
                  : editor === "new"
                    ? "Criar projeto"
                    : "Salvar alterações"}
              </button>
            </div>
          </form>
        </WorkspaceDialog>
      )}
      {picker && selected && (
        <WorkspaceDialog
          title={
            picker === "tasks"
              ? "Adicionar ações"
              : `Vincular ${referenceLabels[picker]}`
          }
          onClose={closePicker}
        >
          <div className="wp-picker">
            {picker === "tasks" && (
              <div
                className="wp-picker-tabs"
                role="group"
                aria-label="Como adicionar tarefas"
              >
                <button
                  type="button"
                  aria-pressed={pickerMode === "new"}
                  disabled={Boolean(busy) || Boolean(createdTask)}
                  onClick={() => {
                    setPickerMode("new");
                    setPickerError("");
                  }}
                >
                  <Plus size={14} /> Criar tarefa
                </button>
                <button
                  type="button"
                  aria-pressed={pickerMode === "existing"}
                  disabled={Boolean(busy) || Boolean(createdTask)}
                  onClick={() => {
                    setPickerMode("existing");
                    setPickerError("");
                  }}
                >
                  <Link2 size={14} /> Vincular existentes
                </button>
              </div>
            )}
            {picker === "tasks" && pickerMode === "new" ? (
              <form
                className="wp-new-task-form"
                onSubmit={(event) => void addTask(event)}
              >
                <label htmlFor="wp-new-task">O que precisa ser feito?</label>
                <input
                  data-autofocus
                  id="wp-new-task"
                  autoComplete="off"
                  required
                  maxLength={500}
                  placeholder="Escreva uma ação concreta"
                  value={newTaskTitle}
                  disabled={Boolean(busy) || Boolean(createdTask)}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                />
                {pickerError && (
                  <p className="wp-form-error" role="alert">
                    {pickerError}
                    {pickerError.includes("outra aba") && (
                      <>
                        {" "}
                        Feche esta janela e abra os vínculos novamente para usar
                        a versão atual.
                      </>
                    )}
                  </p>
                )}
                <div className="wp-form-footer">
                  <button
                    type="button"
                    className="wp-secondary"
                    disabled={Boolean(busy)}
                    onClick={closePicker}
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    className="ws-primary"
                    disabled={
                      Boolean(busy) || (!createdTask && !newTaskTitle.trim())
                    }
                  >
                    {busy ? (
                      <LoaderCircle size={15} className="wp-spin" />
                    ) : (
                      <Plus size={15} />
                    )}
                    {busy
                      ? "Salvando…"
                      : createdTask
                        ? "Vincular tarefa criada"
                        : "Adicionar tarefa"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={(event) => void saveReferences(event)}>
                <label className="wp-search">
                  <Search size={16} />
                  <input
                    data-autofocus
                    type="search"
                    aria-label={`Buscar ${referenceLabels[picker]} para vincular`}
                    placeholder={`Buscar ${referenceLabels[picker]}…`}
                    value={pickerQuery}
                    onChange={(event) => setPickerQuery(event.target.value)}
                  />
                </label>
                <div className="wp-picker-options">
                  {visiblePickerItems.length ? (
                    visiblePickerItems.map((item) => (
                      <label
                        key={item.id}
                        className={`wp-picker-option ${pickerIds.includes(item.id) ? "is-selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={pickerIds.includes(item.id)}
                          disabled={Boolean(busy)}
                          onChange={(event) =>
                            setPickerIds((current) =>
                              event.target.checked
                                ? [...current, item.id]
                                : current.filter((id) => id !== item.id),
                            )
                          }
                        />
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.description}</small>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="wp-section-empty">
                      {pickerItems.length
                        ? "Nenhum resultado para essa busca."
                        : `Você ainda não tem ${referenceLabels[picker]} salvos no seu espaço.`}
                    </p>
                  )}
                </div>
                <p className="wp-picker-note">
                  Desmarcar apenas remove o vínculo com este projeto.
                </p>
                {pickerError && (
                  <p className="wp-form-error" role="alert">
                    {pickerError}
                  </p>
                )}
                <div className="wp-form-footer">
                  <span>
                    {
                      pickerIds.filter((id) =>
                        pickerItems.some((item) => item.id === id),
                      ).length
                    }{" "}
                    selecionados
                  </span>
                  <button
                    type="submit"
                    className="ws-primary"
                    disabled={Boolean(busy)}
                  >
                    {busy ? (
                      <LoaderCircle size={15} className="wp-spin" />
                    ) : (
                      <Check size={15} />
                    )}
                    {busy ? "Salvando…" : "Salvar vínculos"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </WorkspaceDialog>
      )}
      {deleteTarget && (
        <WorkspaceDialog
          title="Excluir este projeto?"
          onClose={() => {
            if (!pending.current) setDeleteTarget(null);
          }}
        >
          <div className="wp-form">
            <p className="wp-delete-description">
              O acompanhamento <strong>{deleteTarget.title}</strong>, seu
              checklist, suas etapas e seu diário serão excluídos. O projeto no
              portfólio e as tarefas, notas e links originais continuarão
              salvos; apenas os vínculos com este acompanhamento serão
              removidos.
            </p>
            {deleteError && (
              <p className="wp-form-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="wp-form-footer">
              <button
                data-autofocus
                type="button"
                className="wp-secondary"
                disabled={Boolean(busy)}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="ws-primary wp-danger-button"
                disabled={Boolean(busy)}
                onClick={() => void removeProject(deleteTarget)}
              >
                {busy === "delete" ? (
                  <LoaderCircle size={15} className="wp-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                {busy === "delete" ? "Excluindo…" : "Excluir projeto"}
              </button>
            </div>
          </div>
        </WorkspaceDialog>
      )}
    </section>
  );
}
