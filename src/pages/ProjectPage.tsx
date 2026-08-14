import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Calendar, Clock, Share2, Check, Edit2, FolderKanban,
  Github, ExternalLink, FlaskConical, BookOpen, Layers,
} from "lucide-react";
import { Project, ProjectCategory, BlogPost } from "../types";
import { Language } from "../lib/translations";
import { findBySlug, slugOf } from "../utils/slug";
import { extractToc } from "../utils/toc";
import MarkdownRenderer from "../components/MarkdownRenderer";
import LocalImage from "../components/LocalImage";
import TableOfContents from "../components/TableOfContents";
import ProjectNavList from "../components/ProjectNavList";

interface ProjectPageProps {
  /** Trecho da URL: o `codigo` ou `id` do projeto. */
  slug: string;
  projects: Project[];
  categories: ProjectCategory[];
  posts: BlogPost[];
  isEditMode: boolean;
  language: Language;
}

/**
 * Página de leitura de um projeto.
 *
 * Segue o mesmo desenho da página de artigo do blog — capa, selos, título,
 * metadados e corpo em Markdown numa coluna de leitura — e acrescenta as três
 * navegações: sumário à esquerda, lista de projetos à direita e anterior/próximo
 * ao pé da página.
 */
export default function ProjectPage({
  slug,
  projects,
  categories,
  posts,
  isEditMode,
  language,
}: ProjectPageProps) {
  const navigate = useNavigate();
  const [copiedLink, setCopiedLink] = useState(false);

  const project = findBySlug(projects, slug);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  // Rascunhos só existem para quem edita; para o público, a resposta é a mesma
  // de um projeto inexistente, para não confirmar que ele existe.
  const isMissing = !project || (project.draft && !isEditMode);

  const visibleProjects = useMemo(
    () => projects.filter((p) => !p.draft || isEditMode),
    [projects, isEditMode]
  );

  const body = useMemo(() => {
    if (!project) return "";
    const detailed = (language === "en" && project.detailedDescriptionEn)
      ? project.detailedDescriptionEn
      : project.detailedDescription;
    const description = (language === "en" && project.descriptionEn)
      ? project.descriptionEn
      : project.description;
    return detailed || description || "";
  }, [project, language]);

  const toc = useMemo(() => extractToc(body), [body]);

  if (isMissing) {
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

  const title = (language === "en" && project.titleEn) ? project.titleEn : project.title;
  const summary = (language === "en" && project.descriptionEn) ? project.descriptionEn : project.description;
  const relevance = (language === "en" && project.scientificRelevanceEn)
    ? project.scientificRelevanceEn
    : project.scientificRelevance;

  const isInProgress =
    Boolean(project.emAndamento) ||
    project.status === "Em andamento" ||
    project.status === "In Progress";
  const isConcluded = Boolean(project.status) && !isInProgress;

  const projCatIds = project.categoryIds && project.categoryIds.length > 0
    ? project.categoryIds
    : (project.categoryId ? [project.categoryId] : []);
  const projCategories = categories.filter((c) => projCatIds.includes(c.id));

  const stack = project.stack || project.technologies || [];
  const gallery = (project.galleryImages || project.images || []).filter(Boolean) as string[];

  // Artigos do blog que referenciam este projeto, pelo código ou pelo id.
  const relatedPosts = posts.filter(
    (p) =>
      (!p.draft || isEditMode) &&
      (p.projetos || []).some((code) => code === project.codigo || code === project.id)
  );

  // Estimativa de leitura a partir do corpo, como no blog.
  const words = `${title} ${summary} ${body}`.trim().split(/\s+/).length;
  const readMinutes = Math.max(1, Math.ceil(words / 180));

  const periodLabel = (() => {
    if (!project.periodo) return null;
    if (typeof project.periodo === "string") return project.periodo;
    const { inicio, fim } = project.periodo;
    if (!inicio) return null;
    if (fim) return `${inicio} — ${fim}`;
    // Sem data de fim, "Presente" contradiria o selo de concluído.
    return isConcluded
      ? `${language === "en" ? "Started in" : "Início em"} ${inicio}`
      : `${inicio} — ${language === "en" ? "Present" : "Presente"}`;
  })();

  const currentIndex = visibleProjects.findIndex((p) => p.id === project.id);
  const previousProject = currentIndex > 0 ? visibleProjects[currentIndex - 1] : null;
  const nextProject =
    currentIndex >= 0 && currentIndex < visibleProjects.length - 1
      ? visibleProjects[currentIndex + 1]
      : null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/project/${slugOf(project)}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    // Três colunas em telas largas: sumário | leitura | projetos.
    // Abaixo de `xl` as laterais somem e sobra só a coluna de leitura.
    <div className="mx-auto grid max-w-[1700px] grid-cols-1 gap-10 xl:grid-cols-[14rem_minmax(0,1fr)_16rem]">
      {/* Sumário (esquerda) */}
      <aside className="hidden xl:block">
        <TableOfContents entries={toc} language={language} />
      </aside>

      <article className="min-w-0">
        {/* Barra de navegação do projeto */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
          <Link
            to="/projetos"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {language === "en" ? "All projects" : "Todos os projetos"}
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
              {copiedLink
                ? language === "en" ? "Copied!" : "Copiado!"
                : language === "en" ? "Share" : "Compartilhar"}
            </button>

            {isEditMode && (
              <button
                type="button"
                onClick={() => navigate(`/admin/projetos/${encodeURIComponent(slugOf(project))}`)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
              >
                <Edit2 className="h-3.5 w-3.5" />
                {language === "en" ? "Edit" : "Editar"}
              </button>
            )}
          </div>
        </div>

        {/* Capa */}
        {project.imageUrl && (
          <div className="relative mb-8 h-64 w-full overflow-hidden rounded-3xl bg-slate-100 sm:h-80 lg:h-96 dark:bg-slate-950/50">
            <LocalImage
              src={project.imageUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Selos */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {project.draft && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {language === "en" ? "Draft" : "Rascunho"}
            </span>
          )}
          {projCategories.map((cat) => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-1 font-sans text-xs font-bold uppercase tracking-wider text-white shadow-sm dark:bg-indigo-500"
            >
              <Layers className="h-3 w-3" />
              {(language === "en" && cat.nameEn) ? cat.nameEn : cat.name}
            </span>
          ))}
          {project.status && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {isInProgress && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />}
              {isInProgress ? (language === "en" ? "In progress" : "Em andamento") : project.status}
            </span>
          )}
          {(project.tags || []).map((tag, idx) => (
            <span
              key={idx}
              className="rounded-full border border-indigo-100/50 bg-indigo-50 px-3 py-1 font-sans text-xs font-semibold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              #{tag}
            </span>
          ))}
        </div>

        <h1 className="font-display text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          {title}
        </h1>

        {/* Metadados */}
        <div className="mt-6 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-6 font-mono text-xs text-slate-400 sm:text-sm dark:border-slate-800 dark:text-slate-500">
          {periodLabel && (
            <>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {periodLabel}
              </span>
              <span className="text-slate-200 dark:text-slate-800">•</span>
            </>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {readMinutes} {language === "en" ? "min read" : "min de leitura"}
          </span>
        </div>

        {/* Resumo em destaque */}
        {summary && (
          <p className="mt-8 border-l-4 border-indigo-500 bg-indigo-50/50 py-4 pl-5 pr-4 font-sans text-base leading-relaxed text-slate-700 dark:bg-indigo-950/20 dark:text-slate-200">
            {summary}
          </p>
        )}

        {/* Links do projeto */}
        {(project.githubUrl || project.projectUrl || project.documentationUrl || project.paperUrl) && (
          <div className="mt-6 flex flex-wrap gap-2 no-print">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Github className="h-3.5 w-3.5" />
                {language === "en" ? "Source code" : "Código-fonte"}
              </a>
            )}
            {project.projectUrl && (
              <a
                href={project.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {language === "en" ? "Live demo" : "Ver funcionando"}
              </a>
            )}
            {(project.documentationUrl || project.paperUrl) && (
              <a
                href={project.documentationUrl || project.paperUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {language === "en" ? "Documentation" : "Documentação"}
              </a>
            )}
          </div>
        )}

        {/* Corpo. O `className` é explícito porque o padrão do renderizador
            limita a coluna a 75ch — estreito demais para a largura desta página. */}
        <div className="mt-10">
          <MarkdownRenderer
            content={body}
            className="max-w-none space-y-4 text-base leading-relaxed text-slate-700 dark:text-slate-300"
          />
        </div>

        {/* Galeria */}
        {gallery.length > 0 && (
          <section className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
            <h2 className="mb-4 font-display text-lg font-bold text-slate-900 dark:text-white">
              {language === "en" ? "Gallery" : "Galeria"}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {gallery.map((img, idx) => (
                <div
                  key={idx}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950"
                >
                  <LocalImage
                    src={img}
                    alt={`${title} — ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tecnologias */}
        {stack.length > 0 && (
          <section className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
            <h2 className="mb-3 font-display text-lg font-bold text-slate-900 dark:text-white">
              {language === "en" ? "Technologies" : "Tecnologias"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {stack.map((tech, idx) => (
                <span
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Relevância científica */}
        {relevance && (
          <section className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
              <FlaskConical className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              {language === "en" ? "Scientific relevance" : "Relevância científica"}
            </h2>
            <MarkdownRenderer
              content={relevance}
              className="max-w-none space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
            />
          </section>
        )}

        {/* Artigos relacionados */}
        {relatedPosts.length > 0 && (
          <section className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
              <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              {language === "en" ? "Related articles" : "Artigos relacionados"}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {relatedPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${slugOf(post)}`}
                  className="group rounded-xl border border-slate-200 p-3.5 transition-all hover:border-indigo-500 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-500"
                >
                  <span className="block font-display text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                    {(language === "en" ? post.titleEn : post.title) || post.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block font-sans text-xs text-slate-600 dark:text-slate-400">
                    {(language === "en" ? post.summaryEn : post.summary) || post.summary}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Anterior / próximo */}
        {(previousProject || nextProject) && (
          <nav
            aria-label={language === "en" ? "More projects" : "Mais projetos"}
            className="mt-12 grid grid-cols-1 gap-3 border-t border-slate-200 pt-8 sm:grid-cols-2 dark:border-slate-800 no-print"
          >
            {previousProject ? (
              <Link
                to={`/project/${slugOf(previousProject)}`}
                className="group rounded-2xl border border-slate-200 p-4 transition-all hover:border-indigo-500 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-500"
              >
                <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  <ArrowLeft className="h-3 w-3" />
                  {language === "en" ? "Previous" : "Anterior"}
                </span>
                <span className="mt-1 block font-display text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                  {(language === "en" && previousProject.titleEn ? previousProject.titleEn : previousProject.title)}
                </span>
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}
            {nextProject && (
              <Link
                to={`/project/${slugOf(nextProject)}`}
                className="group rounded-2xl border border-slate-200 p-4 text-right transition-all hover:border-indigo-500 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-500"
              >
                <span className="flex items-center justify-end gap-1 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  {language === "en" ? "Next" : "Próximo"}
                  <ArrowRight className="h-3 w-3" />
                </span>
                <span className="mt-1 block font-display text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                  {(language === "en" && nextProject.titleEn ? nextProject.titleEn : nextProject.title)}
                </span>
              </Link>
            )}
          </nav>
        )}
      </article>

      {/* Navegador de projetos (direita) */}
      <aside className="hidden xl:block">
        <ProjectNavList projects={visibleProjects} currentId={project.id} language={language} />
      </aside>
    </div>
  );
}
