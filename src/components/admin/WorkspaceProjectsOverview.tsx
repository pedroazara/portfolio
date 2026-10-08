import React from "react";
import {
  ArrowUpRight,
  CalendarDays,
  FolderKanban,
  Plus,
  Target,
} from "lucide-react";
import type { AdminTask } from "../../lib/adminToolsService";
import { todayKey } from "../../lib/adminToolsService";
import type { AdminWorkspaceProject } from "../../lib/workspaceProjectsService";
import type { Project } from "../../types";

interface Props {
  projects: AdminWorkspaceProject[];
  portfolioProjects: Project[];
  tasks: AdminTask[];
  loading: boolean;
  error: string;
  workspaceUnavailable: boolean;
  onOpen: (id?: string) => void;
}

export default function WorkspaceProjectsOverview({
  projects,
  portfolioProjects,
  tasks,
  loading,
  error,
  workspaceUnavailable,
  onOpen,
}: Props) {
  const active = projects.filter((project) => project.status !== "completed");
  const visible = [...active]
    .sort(
      (a, b) =>
        Number(a.status === "paused") - Number(b.status === "paused") ||
        (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
        b.updated_at.localeCompare(a.updated_at),
    )
    .slice(0, 3);
  return (
    <section
      className="ws-card ws-projects-overview"
      aria-label="Projetos em foco"
    >
      <div className="ws-card-heading">
        <div>
          <span className="ws-eyebrow">
            <FolderKanban size={14} /> DO OBJETIVO À PRÓXIMA AÇÃO
          </span>
          <h2>Seus projetos</h2>
        </div>
        <button
          type="button"
          className="ws-text-button"
          onClick={() => onOpen()}
        >
          Ver projetos <ArrowUpRight size={15} />
        </button>
      </div>
      {loading ? (
        <p className="ws-projects-message" role="status">
          Carregando projetos…
        </p>
      ) : error ? (
        <p className="ws-projects-message" role="alert">
          Não foi possível carregar os projetos.{" "}
          <button type="button" onClick={() => onOpen()}>
            Abrir e tentar novamente
          </button>
        </p>
      ) : !active.length ? (
        <div className="ws-projects-start">
          <span className="ws-projects-start-icon" aria-hidden="true">
            <Target size={25} />
          </span>
          <div>
            <h3>
              {projects.length
                ? "Qual é seu próximo projeto?"
                : "O que você quer tirar do papel?"}
            </h3>
            <p>
              Defina um objetivo e reúna as tarefas, notas e referências para
              chegar lá.
            </p>
          </div>
          <button
            type="button"
            className="ws-primary"
            onClick={() => onOpen("new")}
          >
            <Plus size={16} /> Criar projeto
          </button>
        </div>
      ) : (
        <div className="ws-projects-preview-grid">
          {visible.map((project) => {
            const linked = tasks.filter((task) =>
              project.task_ids.includes(task.id),
            );
            const checklist = project.checklist_items ?? [];
            const total = linked.length + checklist.length;
            const completed = checklist.filter((item) => item.completed).length + linked.filter(
              (task) => task.status === "done",
            ).length;
            const next =
              linked.find(
                (task) =>
                  task.id === project.next_task_id && task.status !== "done",
              ) ??
              linked.find((task) => task.status === "doing") ??
              linked.find((task) => task.status !== "done");
            const nextChecklist = checklist
              .filter((item) => !item.completed)
              .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))[0];
            const blockers = (project.updates ?? []).filter((item) => item.kind === "blocker" && !item.resolved).length;
            const portfolioProject = portfolioProjects.find((item) => item.id === project.portfolio_project_id);
            const title = portfolioProject?.title ?? project.title;
            const overdue = Boolean(
              project.due_date && project.due_date < todayKey(),
            );
            return (
              <button
                key={project.id}
                type="button"
                className="ws-project-preview"
                onClick={() => onOpen(project.id)}
                aria-label={`Abrir projeto ${title}`}
              >
                <span className="ws-project-preview-title">
                  <strong>{title}</strong>
                  <ArrowUpRight size={16} />
                </span>
                <span className="ws-project-preview-goal">
                  {project.goal || "Defina o resultado que você quer alcançar."}
                </span>
                <span className="ws-project-preview-next">
                  <Target size={14} />
                  <span>
                    {workspaceUnavailable
                      ? "Carregando próximas ações…"
                      : project.status === "paused"
                        ? "Projeto em pausa"
                        : next
                          ? next.title
                          : nextChecklist
                            ? nextChecklist.title
                          : total
                            ? "Ações concluídas · revise o objetivo"
                            : "Adicione a primeira ação"}
                  </span>
                </span>
                <span className="ws-project-preview-meta">
                  <span>
                    {workspaceUnavailable
                      ? "—"
                      : total
                        ? `${completed}/${total} ações concluídas`
                        : "Sem ações"}
                  </span>
                  {blockers > 0 && <span className="is-overdue">{blockers} {blockers === 1 ? "impedimento" : "impedimentos"}</span>}
                  {project.due_date && (
                    <span className={overdue ? "is-overdue" : ""}>
                      <CalendarDays size={12} />
                      {overdue ? "Prazo vencido · " : ""}
                      {project.due_date.split("-").slice(1).reverse().join("/")}
                    </span>
                  )}
                </span>
                {total > 0 && !workspaceUnavailable && (
                  <span className="ws-project-preview-track" aria-hidden="true">
                    <span
                      style={{ width: `${(completed / total) * 100}%` }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
