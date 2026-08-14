import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit2, FolderKanban } from "lucide-react";
import { Project, ProjectCategory } from "../types";
import { Language } from "../lib/translations";
import { findBySlug, slugOf } from "../utils/slug";
import ProjectDetailsModal from "../components/ProjectDetailsModal";

interface ProjectPageProps {
  /** Trecho da URL: o `codigo` ou `id` do projeto. */
  slug: string;
  projects: Project[];
  categories: ProjectCategory[];
  isEditMode: boolean;
  language: Language;
}

/**
 * Página de leitura de um projeto (/project/<slug>).
 *
 * Reaproveita o corpo do ProjectDetailsModal em modo página — o mesmo conteúdo
 * que antes abria sobreposto à grade agora ocupa a rota inteira, com o botão
 * voltar do navegador funcionando.
 */
export default function ProjectPage({
  slug,
  projects,
  categories,
  isEditMode,
  language,
}: ProjectPageProps) {
  const navigate = useNavigate();
  const project = findBySlug(projects, slug);

  // Toda troca de projeto começa no topo, como numa navegação comum.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  // Projeto inexistente ou rascunho fora do modo de edição: mesma resposta,
  // para não confirmar a existência de rascunhos a quem não edita.
  if (!project || (project.draft && !isEditMode)) {
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
        <Link
          to="/projetos"
          className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
        >
          {language === "en" ? "Back to projects" : "Voltar aos projetos"}
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Barra de navegação da página */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link
          to="/projetos"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {language === "en" ? "All projects" : "Todos os projetos"}
        </Link>

        {isEditMode && (
          <button
            type="button"
            onClick={() => navigate(`/admin/projetos/${encodeURIComponent(slugOf(project))}`)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
          >
            <Edit2 className="h-3.5 w-3.5" />
            {language === "en" ? "Edit project" : "Editar projeto"}
          </button>
        )}
      </div>

      <ProjectDetailsModal
        asPage
        project={project}
        categories={categories}
        onClose={() => navigate("/projetos")}
        language={language}
      />
    </div>
  );
}
