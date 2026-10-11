import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  KanbanSquare,
  Flame,
  StickyNote,
  Bookmark,
  PenLine,
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  LockKeyhole,
  Moon,
  Sun,
  Settings2,
  Command,
  Check,
  X,
  ChevronRight,
  History,
  Sunrise,
} from "lucide-react";
import TasksBoard from "../components/TasksBoard";
import HabitTracker from "../components/HabitTracker";
import QuickNotes from "../components/QuickNotes";
import LinkVault from "../components/LinkVault";
import DraftsPanel from "../components/DraftsPanel";
import PortfolioBrand from "../components/PortfolioBrand";
import { OrbitaIcon } from "../components/OrbitaIcon";
import WorkspaceOverview from "../components/admin/WorkspaceOverview";
import WorkspaceDialog from "../components/admin/WorkspaceDialog";
import ProjectsPanel from "../components/admin/ProjectsPanel";
import WorkspaceProjectsOverview from "../components/admin/WorkspaceProjectsOverview";
import EditLogPanel from "../components/admin/EditLogPanel";
import DailyUpdatesPanel from "../components/admin/DailyUpdatesPanel";
import { AdminHubTab, ADMIN_HUB_TABS } from "../lib/adminHubTabs";
import { createTask, createNote, createLink } from "../lib/adminToolsService";
import { usePersonalWorkspace } from "../hooks/usePersonalWorkspace";
import { useWorkspaceProjects } from "../hooks/useWorkspaceProjects";
import { isDevPreview } from "../lib/devPreview";
import { useLocalePath } from "../lib/routes";
import { useInboxDailyUpdates } from "../hooks/useInboxDailyUpdates";
import type { Project } from "../types";
import "./personal-workspace.css";

export type { AdminHubTab } from "../lib/adminHubTabs";
const TAB_META: Record<
  AdminHubTab,
  { label: string; description: string; icon: typeof KanbanSquare }
> = {
  "visao-geral": {
    label: "Visão geral",
    description: "Um novo olhar para o seu dia.",
    icon: LayoutDashboard,
  },
  atualizacoes: {
    label: "Atualizações",
    description: "Sua caixa de entrada do dia: a agenda, a dica de inglês e o que mais chegar.",
    icon: Sunrise,
  },
  projetos: {
    label: "Projetos",
    description: "Objetivos, próximas ações e materiais reunidos por projeto.",
    icon: FolderKanban,
  },
  tarefas: {
    label: "Tarefas",
    description: "Da primeira ideia à próxima conquista.",
    icon: KanbanSquare,
  },
  habitos: {
    label: "Hábitos",
    description: "Pequenas ações. Um caminho consistente.",
    icon: Flame,
  },
  notas: {
    label: "Notas",
    description: "Um lugar para pensar, conectar e lembrar.",
    icon: StickyNote,
  },
  links: {
    label: "Links",
    description: "Seu universo de referências, sempre por perto.",
    icon: Bookmark,
  },
  rascunhos: {
    label: "Rascunhos",
    description: "Dê espaço para as ideias ganharem forma.",
    icon: PenLine,
  },
  atividade: {
    label: "Atividade",
    description: "Cada edição do portfólio, sua ou de um agente de IA.",
    icon: History,
  },
};
type CaptureType = "task" | "note" | "link";
interface Props {
  tab: AdminHubTab;
  portfolioProjects: Project[];
  portfolioLoading?: boolean;
  portfolioError?: boolean;
  authorName?: string;
  darkMode?: boolean;
  onToggleTheme: () => void;
  onOpenManagement: () => void;
}

export default function AdminHubPage({
  tab,
  portfolioProjects,
  portfolioLoading = false,
  portfolioError = false,
  authorName = "Pedro",
  darkMode = false,
  onToggleTheme,
  onOpenManagement,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedId = new URLSearchParams(location.search).get("item");
  const requestedPortfolioId = new URLSearchParams(location.search).get("portfolio");
  const localePath = useLocalePath();
  const { data, loading, error, refresh } = usePersonalWorkspace();
  const projectState = useWorkspaceProjects();
  const inboxUpdates = useInboxDailyUpdates();
  const [captureType, setCaptureType] = useState<CaptureType | null>(null);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const leavingRef = useRef(false);
  const [visitedEditors, setVisitedEditors] = useState<Set<AdminHubTab>>(
    () => new Set([tab]),
  );
  useEffect(() => {
    setVisitedEditors((current) =>
      current.has(tab) ? current : new Set([...current, tab]),
    );
  }, [tab]);
  const name = authorName.trim().split(/\s+/)[0] || "Pedro";
  const initials = authorName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const preview = isDevPreview();
  const path = (key: AdminHubTab) =>
    localePath(
      key === "visao-geral" ? "/admin/painel" : `/admin/painel/${key}`,
    );
  const go = (key: AdminHubTab, id?: string) => {
    setCommandsOpen(false);
    navigate(`${path(key)}${id ? `?item=${encodeURIComponent(id)}` : ""}`);
  };
  const openCapture = (type: CaptureType) => {
    setCommandsOpen(false);
    setCaptureType(type);
  };
  const leaveWorkspace = async (action: () => void | Promise<void>) => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    setLeaveError("");
    const pending: Promise<void>[] = [];
    window.dispatchEvent(
      new CustomEvent("admin-workspace-before-leave", { detail: { pending } }),
    );
    try {
      await Promise.all(pending);
      await action();
    } catch {
      setLeaveError(
        "Não foi possível salvar seu texto. Tente novamente antes de sair; sua edição continua aqui.",
      );
    } finally {
      leavingRef.current = false;
      setLeaving(false);
    }
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || captureType) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandsOpen((current) => !current);
        setQuery("");
        return;
      }
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="dialog"]',
        ) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        openCapture("note");
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [captureType]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  const counts: Partial<Record<AdminHubTab, number>> = {
    atualizacoes: inboxUpdates,
    projetos: projectState.projects.filter(
      (project) => project.status !== "completed",
    ).length,
    tarefas: data.tasks.filter((task) => task.status !== "done").length,
    notas: data.notes.length,
    links: data.links.length,
    rascunhos: data.drafts.length,
  };
  const commands = [
    ...ADMIN_HUB_TABS.map((key) => ({
      label: TAB_META[key].label,
      caption: TAB_META[key].description,
      icon: TAB_META[key].icon,
      action: () => go(key),
    })),
    ...projectState.projects.map((project) => ({
      label: portfolioProjects.find((item) => item.id === project.portfolio_project_id)?.title ?? project.title,
      caption: `Projeto pessoal · ${project.title} · ${project.goal}`,
      icon: FolderKanban,
      action: () => go("projetos", project.id),
    })),
    {
      label: "Criar uma tarefa",
      caption: "Registre seu próximo passo",
      icon: Plus,
      action: () => openCapture("task"),
    },
    {
      label: "Capturar uma ideia",
      caption: "Salve uma nota rápida",
      icon: PenLine,
      action: () => openCapture("note"),
    },
    {
      label: "Salvar uma referência",
      caption: "Adicione um link à biblioteca",
      icon: Bookmark,
      action: () => openCapture("link"),
    },
  ].filter((item) =>
    `${item.label} ${item.caption}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(
        query
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase(),
      ),
  );
  return (
    <div className="personal-workspace">
      <aside className="ws-sidebar" aria-label="Painel pessoal">
        <Link
          className="ws-brand orb-hover"
          to={localePath("/")}
          aria-label="Pedro Ázara — ir para o portfólio"
          aria-busy={leaving}
          title="Ir para o portfólio"
          onClick={(event) => {
            if (
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            void leaveWorkspace(() => navigate(localePath("/")));
          }}
        >
          <PortfolioBrand compact subtitle="Painel pessoal" />
        </Link>
        <div className="ws-sidebar-label">MEU ESPAÇO</div>
        <nav className="ws-nav" aria-label="Navegação do painel">
          {ADMIN_HUB_TABS.map((key) => {
            const { label, icon: Icon } = TAB_META[key];
            return (
              <Link
                key={key}
                to={path(key)}
                aria-label={label}
                title={label}
                aria-current={tab === key ? "page" : undefined}
                className={`ws-nav-link ${tab === key ? "active" : ""}`}
              >
                <Icon size={19} strokeWidth={1.7} />
                <span>{label}</span>
                {Boolean(counts[key]) && (
                  <span className="ws-nav-count">{counts[key]}</span>
                )}
                {key === "visao-geral" && (
                  <span className="ws-nav-active-dot" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="ws-sidebar-bottom">
          <div className="ws-sidebar-note">
            <span>
              <OrbitaIcon size={18} /> IDEIAS EM MOVIMENTO
            </span>
            <p>Seu próximo grande projeto pode começar com uma pequena nota.</p>
            <button type="button" onClick={() => openCapture("note")}>
              Registrar uma ideia <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="ws-profile">
            <span className="ws-avatar">{initials || "P"}</span>
            <div>
              <strong>{name}</strong>
              <span>
                <LockKeyhole size={10} /> Espaço privado
              </span>
            </div>
            <button
              type="button"
              className="ws-icon-button"
              aria-label="Configurações do portfólio"
              onClick={onOpenManagement}
            >
              <Settings2 size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="ws-shell">
        <header className="ws-topbar">
          <div className="ws-breadcrumb">
            <span>Painel pessoal</span>
            <ChevronRight size={14} />
            <strong>{TAB_META[tab].label}</strong>
          </div>
          <div className="ws-topbar-actions">
            <button
              type="button"
              className="ws-command-trigger"
              onClick={() => {
                setCommandsOpen(true);
                setQuery("");
              }}
              aria-label="Buscar atalhos"
            >
              <Search size={16} />
              <span>Buscar atalhos</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              type="button"
              className="ws-icon-button"
              onClick={onToggleTheme}
              aria-label={darkMode ? "Ativar tema claro" : "Ativar tema escuro"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              className="ws-icon-button ws-compact-settings"
              aria-label="Configurações do portfólio"
              onClick={onOpenManagement}
            >
              <Settings2 size={18} />
            </button>
          </div>
        </header>
        <div className="ws-content">
          <div className="ws-page-toolbar">
            <div className="ws-date">
              <span className="ws-date-dot" />
              <span>
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
              {preview && (
                <span className="ws-preview-badge">Prévia local</span>
              )}
            </div>
            <button
              type="button"
              className="ws-primary"
              onClick={() => openCapture("task")}
            >
              <Plus size={16} /> Nova entrada
            </button>
          </div>
          {tab === "visao-geral" ? (
            <WorkspaceOverview
              data={data}
              loading={loading}
              error={error}
              name={name}
              go={go}
              capture={openCapture}
              refresh={refresh}
              projectsOverview={
                <WorkspaceProjectsOverview
                  {...projectState}
                  portfolioProjects={portfolioProjects}
                  tasks={data.tasks}
                  workspaceUnavailable={loading || Boolean(error)}
                  onOpen={(id) => go("projetos", id)}
                />
              }
            />
          ) : (
            <>
              {tab !== "projetos" && (
                <div className="ws-section-intro">
                  <span className="ws-eyebrow">
                    SEU ESPAÇO, SUAS POSSIBILIDADES
                  </span>
                  <h1>{TAB_META[tab].label}</h1>
                  <p>{TAB_META[tab].description}</p>
                </div>
              )}
              <div
                className={
                  tab === "notas" || tab === "rascunhos" || tab === "projetos"
                    ? ""
                    : "ws-tool-panel"
                }
                key={tab}
              >
                {tab === "projetos" && (
                  <ProjectsPanel
                    projects={projectState.projects}
                    portfolioProjects={portfolioProjects}
                    portfolioLoading={portfolioLoading}
                    portfolioError={portfolioError}
                    requestedPortfolioId={requestedPortfolioId}
                    loading={projectState.loading}
                    error={projectState.error}
                    onReload={async () => {
                      await Promise.all([projectState.refresh({ throwOnError: true }), refresh()]);
                    }}
                    workspace={data}
                    workspaceLoading={loading}
                    workspaceError={error}
                    requestedId={requestedId}
                    onOpenItem={go}
                    onSelectProject={(id) => {
                      navigate(
                        `${path("projetos")}${id ? `?item=${encodeURIComponent(id)}` : ""}`,
                        { replace: true },
                      );
                    }}
                  />
                )}
                {tab === "tarefas" && <TasksBoard requestedId={requestedId} />}
                {tab === "habitos" && <HabitTracker />}
                {tab === "links" && <LinkVault requestedId={requestedId} />}
                {tab === "atualizacoes" && <DailyUpdatesPanel />}
                {tab === "atividade" && <EditLogPanel />}
              </div>
            </>
          )}
          {(visitedEditors.has("notas") || tab === "notas") && (
            <div hidden={tab !== "notas"} className="ws-tool-panel">
              <QuickNotes requestedId={tab === "notas" ? requestedId : null} />
            </div>
          )}
          {(visitedEditors.has("rascunhos") || tab === "rascunhos") && (
            <div hidden={tab !== "rascunhos"} className="ws-tool-panel">
              <DraftsPanel
                requestedId={tab === "rascunhos" ? requestedId : null}
              />
            </div>
          )}
          <footer className="ws-footer">
            <span>
              <LockKeyhole size={12} />{" "}
              {preview
                ? "Prévia local · alterações salvas apenas neste navegador"
                : "Seu espaço privado. Nada daqui aparece no portfólio."}
            </span>
            <span>
              Feito para o seu ritmo <OrbitaIcon size={16} />
            </span>
          </footer>
        </div>
      </div>
      {captureType && (
        <QuickCapture
          initialType={captureType}
          onClose={() => setCaptureType(null)}
          onSaved={(type) => {
            setCaptureType(null);
            setToast(
              type === "task"
                ? "Tarefa salva. Seu próximo passo está no quadro."
                : type === "note"
                  ? "Ideia salva nas suas notas."
                  : "Referência salva na biblioteca.",
            );
          }}
        />
      )}
      {commandsOpen && (
        <WorkspaceDialog
          title="Encontre seu próximo passo"
          onClose={() => setCommandsOpen(false)}
        >
          <div className="ws-command-search">
            <Search size={19} />
            <input
              data-autofocus
              aria-label="Buscar páginas e ações"
              placeholder="Para onde vamos?"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="ws-command-results">
            {commands.map((item) => (
              <button type="button" key={item.label} onClick={item.action}>
                <item.icon size={20} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.caption}</small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
            {!commands.length && (
              <p className="ws-empty-description">
                Nenhum atalho encontrado. Tente “nota” ou “tarefa”.
              </p>
            )}
          </div>
          <div className="ws-command-footer">
            <Command size={12} /> Ctrl / ⌘ K para abrir · Esc para fechar
          </div>
        </WorkspaceDialog>
      )}
      {toast && (
        <div role="status" className="ws-toast">
          <Check size={18} />
          <span>{toast}</span>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {leaveError && (
        <div role="alert" className="ws-toast ws-leave-error">
          <span>{leaveError}</span>
          <button
            type="button"
            aria-label="Fechar erro de salvamento"
            onClick={() => setLeaveError("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function QuickCapture({
  initialType,
  onClose,
  onSaved,
}: {
  initialType: CaptureType;
  onClose: () => void;
  onSaved: (type: CaptureType) => void;
}) {
  const [type, setType] = useState(initialType);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingRef.current || !title.trim()) return;
    let normalizedUrl = url.trim();
    if (type === "link") {
      try {
        const parsed = new URL(normalizedUrl);
        if (!/^https?:$/.test(parsed.protocol)) throw new Error();
        normalizedUrl = parsed.href;
      } catch {
        setError(
          "Insira um endereço válido começando com https:// ou http://.",
        );
        return;
      }
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const item =
        type === "task"
          ? await createTask({
              title: title.trim(),
              notes: content.trim() || null,
            })
          : type === "note"
            ? await createNote({ title: title.trim(), content: content.trim() })
            : await createLink({
                title: title.trim(),
                url: normalizedUrl,
                notes: content.trim() || null,
              });
      window.dispatchEvent(
        new CustomEvent("admin-workspace-entry-created", {
          detail: { type, item },
        }),
      );
      onSaved(type);
    } catch {
      setError(
        "Não foi possível salvar. Seu texto continua aqui para tentar novamente.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  return (
    <WorkspaceDialog
      title="Captura rápida"
      onClose={() => {
        if (!savingRef.current) onClose();
      }}
    >
      <form className="ws-capture-form" onSubmit={submit}>
        <p>Tire da cabeça. Dê um lugar à sua próxima ideia.</p>
        <div className="ws-capture-types">
          {(
            [
              { value: "task", label: "Tarefa", icon: KanbanSquare },
              { value: "note", label: "Nota", icon: StickyNote },
              { value: "link", label: "Link", icon: Bookmark },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={saving}
              aria-pressed={type === item.value}
              onClick={() => {
                setType(item.value);
                setError("");
              }}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>
        <label htmlFor="capture-title">Título</label>
        <input
          id="capture-title"
          data-autofocus
          required
          maxLength={240}
          value={title}
          disabled={saving}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={
            type === "task"
              ? "Qual é o próximo passo?"
              : type === "note"
                ? "Uma ideia que vale guardar…"
                : "Como se chama essa referência?"
          }
        />
        {type === "link" && (
          <>
            <label htmlFor="capture-url">Endereço do link</label>
            <input
              id="capture-url"
              type="url"
              required
              value={url}
              disabled={saving}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
            />
          </>
        )}
        <label htmlFor="capture-content">
          {type === "note" ? "Sua ideia" : "Detalhes"}
          <span>opcional</span>
        </label>
        <textarea
          id="capture-content"
          rows={4}
          value={content}
          disabled={saving}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Adicione contexto, pensamentos ou próximos passos…"
        />
        {error && (
          <p role="alert" className="ws-error">
            {error}
          </p>
        )}
        <div className="ws-form-footer">
          <span>
            <LockKeyhole size={12} /> Só você tem acesso
          </span>
          <button
            type="submit"
            className="ws-primary"
            disabled={saving || !title.trim()}
          >
            {saving
              ? "Salvando…"
              : type === "task"
                ? "Salvar tarefa"
                : type === "note"
                  ? "Salvar nota"
                  : "Salvar referência"}
            {!saving && <ArrowRight size={16} />}
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
