import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FolderKanban } from "lucide-react";
import { Project, ProjectCategory } from "../types";
import { Language } from "../lib/translations";
import { findBySlug, slugOf } from "../utils/slug";
import ProjectForm from "../components/ProjectForm";
import EditorActionRail from "../components/EditorActionRail";
import { localePath } from "../lib/routes";
import { EditTargetState } from "../utils/editTarget";

interface ProjectEditorPageProps {
  /** Trecho da URL: o `codigo`/`id` do projeto, ou "novo". */
  slug: string;
  projects: Project[];
  categories: ProjectCategory[];
  onUpdateProjects: (projects: Project[]) => void;
  onUpdateCategories: (categories: ProjectCategory[]) => void;
  language: Language;
}

const FORM_ID = "project-editor-form";

export default function ProjectEditorPage({
  slug,
  projects,
  categories,
  onUpdateProjects,
  onUpdateCategories,
  language,
}: ProjectEditorPageProps) {
  const navigate = useNavigate();

  // Trecho que estava sendo lido quando se clicou "Editar" na página pública.
  const editTarget = (useLocation().state as EditTargetState | null)?.editTarget ?? null;

  const isNew = slug === "novo";
  const existing = useMemo(() => (isNew ? null : findBySlug(projects, slug)), [projects, slug, isNew]);

  const [view, setView] = useState<"edit" | "preview">("edit");
  const [isDirty, setIsDirty] = useState(false);
  // Projeto novo nasce rascunho: publicar é uma decisão, não um efeito colateral.
  const [isDraft, setIsDraft] = useState(() => existing?.draft ?? true);

  useEffect(() => {
    if (existing) setIsDraft(existing.draft ?? false);
  }, [existing]);

  /**
   * Qual botão pediu o envio. O formulário é submetido de fora, pela barra de
   * ações, então a intenção precisa chegar por aqui em vez de por um argumento.
   */
  const draftIntentRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const submitAs = (draft: boolean) => {
    draftIntentRef.current = draft;
    const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
    form?.requestSubmit();
  };

  /** Endereços de link já ocupados pelos outros projetos. */
  const reservedSlugs = useMemo(
    () =>
      projects
        .filter((p) => p.id !== existing?.id)
        .flatMap((p) => [p.codigo, p.id])
        .filter((slug): slug is string => Boolean(slug)),
    [projects, existing]
  );

  const handleSave = (project: Project) => {
    const draft = draftIntentRef.current ?? isDraft;
    draftIntentRef.current = null;

    const saved: Project = { ...project, draft };
    onUpdateProjects(
      existing ? projects.map((p) => (p.id === existing.id ? saved : p)) : [saved, ...projects]
    );

    setIsDraft(draft);
    setIsDirty(false);

    // Um rascunho não tem página pública; ficamos no editor para continuar.
    if (!draft) {
      navigate(localePath(`/project/${slugOf(saved)}`, language));
    } else if (slugOf(saved) !== slug) {
      // O endereço mudou: a própria URL do editor ficou apontando para um
      // projeto que não existe mais com aquele nome.
      navigate(`/admin/projetos/${encodeURIComponent(slugOf(saved))}`, { replace: true });
    }
  };

  if (!isNew && !existing) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <FolderKanban className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
        <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          {language === "en" ? "Project not found" : "Projeto não encontrado"}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {language === "en"
            ? "It may have been deleted, or the link is wrong."
            : "Ele pode ter sido excluído, ou o link está errado."}
        </p>
        <button
          onClick={() => navigate(localePath("/projetos", language))}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
        >
          {language === "en" ? "Back to projects" : "Voltar aos projetos"}
        </button>
      </div>
    );
  }

  return (
    <div className="no-print mx-auto grid max-w-[1500px] gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="min-w-0 lg:order-1">
        <ProjectForm
          project={existing}
          categories={categories}
          onUpdateCategories={onUpdateCategories}
          onSave={handleSave}
          language={language}
          view={view}
          onDirtyChange={setIsDirty}
          editTarget={editTarget}
          reservedSlugs={reservedSlugs}
        />
      </div>

      <aside className="lg:order-2">
        <EditorActionRail
          title={
            isNew
              ? language === "en" ? "New project" : "Novo projeto"
              : language === "en" ? "Edit project" : "Editar projeto"
          }
          isDirty={isDirty}
          isDraft={isDraft}
          onBack={() => navigate(localePath("/projetos", language))}
          onSaveDraft={() => submitAs(true)}
          onPublish={() => submitAs(false)}
          views={["edit", "preview"]}
          view={view}
          onViewChange={(v) => setView(v === "preview" ? "preview" : "edit")}
          language={language}
        />
      </aside>
    </div>
  );
}
