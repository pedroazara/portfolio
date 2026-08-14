import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FolderKanban } from "lucide-react";
import { Project, ProjectCategory } from "../types";
import { Language } from "../lib/translations";
import { findBySlug, slugOf } from "../utils/slug";
import ProjectEditorModal from "../components/ProjectEditorModal";
import ProjectGalleryManager from "../components/ProjectGalleryManager";

interface ProjectEditorPageProps {
  /** Trecho da URL: o `codigo`/`id` do projeto, ou "novo". */
  slug: string;
  projects: Project[];
  categories: ProjectCategory[];
  onUpdateProjects: (projects: Project[]) => void;
  onUpdateCategories: (categories: ProjectCategory[]) => void;
  language: Language;
}

export default function ProjectEditorPage({
  slug,
  projects,
  categories,
  onUpdateProjects,
  onUpdateCategories,
  language,
}: ProjectEditorPageProps) {
  const navigate = useNavigate();

  const isNew = slug === "novo";
  const existing = useMemo(() => (isNew ? null : findBySlug(projects, slug)), [projects, slug, isNew]);

  // O projeto pode chegar depois, quando os dados da nuvem terminam de carregar.
  const [ready, setReady] = useState(isNew || Boolean(existing));
  useEffect(() => {
    if (existing) setReady(true);
  }, [existing]);

  const handleSave = (project: Project) => {
    onUpdateProjects(
      existing ? projects.map((p) => (p.id === existing.id ? project : p)) : [project, ...projects]
    );
    navigate(`/project/${slugOf(project)}`);
  };

  if (!isNew && !existing) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <FolderKanban className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
        <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          {language === "en" ? "Project not found" : "Projeto não encontrado"}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {ready
            ? language === "en" ? "It may have been deleted, or the link is wrong."
                                : "Ele pode ter sido excluído, ou o link está errado."
            : language === "en" ? "Loading…" : "Carregando…"}
        </p>
        <button
          onClick={() => navigate("/projetos")}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
        >
          {language === "en" ? "Back to projects" : "Voltar aos projetos"}
        </button>
      </div>
    );
  }

  return (
    <div className="no-print space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/projetos")}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {language === "en" ? "Back" : "Voltar"}
        </button>
        <h1 className="font-display text-sm font-bold text-slate-900 sm:text-base dark:text-white">
          {isNew
            ? language === "en" ? "New project" : "Novo projeto"
            : language === "en" ? "Edit project" : "Editar projeto"}
        </h1>
      </div>

      <ProjectEditorModal
        asPage
        isOpen
        onClose={() => navigate("/projetos")}
        project={existing}
        categories={categories}
        onUpdateCategories={onUpdateCategories}
        onSave={handleSave}
        language={language}
      />

      {/* Galeria do projeto: sobe direto para a pasta dele no Storage.
          Só faz sentido depois que o projeto tem um código definido. */}
      {existing?.codigo && (
        <ProjectGalleryManager projectCodigo={existing.codigo} language={language} />
      )}
    </div>
  );
}
