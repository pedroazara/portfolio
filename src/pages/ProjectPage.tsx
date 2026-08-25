import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Share2, Check, Edit2, FolderKanban,
  FlaskConical, BookOpen, Layers,
} from "lucide-react";
import { Project, ProjectCategory, BlogPost } from "../types";
import { Language } from "../lib/translations";
import { findBySlug, isOldSlug, slugOf } from "../utils/slug";
import { extractToc } from "../utils/toc";
import MarkdownRenderer from "../components/MarkdownRenderer";
import LocalImage from "../components/LocalImage";
import { COVER_ASPECT_CLASS } from "../lib/coverAspect";
import TableOfContents from "../components/TableOfContents";
import ContentUnavailable from "../components/ContentUnavailable";
import FichaProjeto from "../components/FichaProjeto";
import LinksDoProjeto from "../components/LinksDoProjeto";
import { formatarData, formatarPeriodo } from "../lib/periodo";
import { previaLiberada } from "../lib/previewLink";
import ProjectNavList from "../components/ProjectNavList";
import ProgressoLeitura from "../components/ProgressoLeitura";
import { STICKY_UNDER_HEADER_CLASS } from "../lib/cardStyle";
import { useLocalePath } from "../lib/routes";
import { editTargetFromViewport } from "../utils/editTarget";

interface ProjectPageProps {
  /** Trecho da URL: o `codigo` ou `id` do projeto. */
  slug: string;
  projects: Project[];
  categories: ProjectCategory[];
  posts: BlogPost[];
  isEditMode: boolean;
  language: Language;
  /** Se os dados já chegaram, e se a leitura da nuvem falhou. */
  isDataLoaded?: boolean;
  loadFailed?: boolean;
  /** Chave de prévia vinda da URL, que revela um rascunho específico. */
  chavePrevia?: string | null;
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
  isDataLoaded = true,
  loadFailed = false,
  chavePrevia = null,
}: ProjectPageProps) {
  const navigate = useNavigate();
  const lp = useLocalePath();
  const [copiedLink, setCopiedLink] = useState(false);

  const project = findBySlug(projects, slug);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  /**
   * Chegou por um endereço antigo: troca pela URL de hoje.
   *
   * `replace` para o botão "voltar" não cair no endereço antigo e refazer o
   * salto, e para os buscadores registrarem um endereço só.
   */
  useEffect(() => {
    if (project && isOldSlug(project, slug)) {
      navigate(lp(`/projetos/${slugOf(project)}`), { replace: true });
    }
  }, [project, slug, navigate, lp]);

  // Rascunhos só existem para quem edita; para o público, a resposta é a mesma
  // de um projeto inexistente, para não confirmar que ele existe.
  const isMissing =
    !project || (project.draft && !isEditMode && !previaLiberada(project, chavePrevia));

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

  // Projeto ausente pode ser link errado — ou dado que ainda não chegou.
  if (isMissing && (!isDataLoaded || loadFailed)) {
    return <ContentUnavailable state={loadFailed ? "failed" : "loading"} language={language} />;
  }

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
          to={lp("/projetos")}
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

  /**
   * O período como se lê, não como se guarda.
   *
   * A data vem em ISO ("2026-06") e saía assim na tela — agora passa pelo
   * mesmo formatador das seções do currículo, que devolve "jun 2026". Um
   * período escrito à mão (texto livre) é respeitado como veio.
   */
  const periodLabel = (() => {
    if (!project.periodo) return null;
    if (typeof project.periodo === "string") return project.periodo;

    const { inicio, fim } = project.periodo;
    if (!inicio) return null;

    // Sem data de fim, "Presente" contradiria o selo de concluído.
    if (!fim && isConcluded) {
      return `${language === "en" ? "Started in" : "Início em"} ${formatarData(inicio, language)}`;
    }
    return formatarPeriodo(inicio, fim, !fim, language);
  })();

  const currentIndex = visibleProjects.findIndex((p) => p.id === project.id);
  const previousProject = currentIndex > 0 ? visibleProjects[currentIndex - 1] : null;
  const nextProject =
    currentIndex >= 0 && currentIndex < visibleProjects.length - 1
      ? visibleProjects[currentIndex + 1]
      : null;

  // O que a barra de progresso mede: da capa ao fim do corpo, sem contar
  // galeria, relevância científica, artigos relacionados e navegação.
  const leituraRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}${lp(`/project/${slugOf(project)}`)}`);
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
        <ProgressoLeitura targetRef={leituraRef} />

        {/* Barra de navegação do projeto */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
          <Link
            to={lp("/projetos")}
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
                // O alvo leva o editor ao trecho que estava na tela.
                onClick={() =>
                  navigate(`/admin/projetos/${encodeURIComponent(slugOf(project))}`, {
                    state: { editTarget: editTargetFromViewport() },
                  })
                }
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
              >
                <Edit2 className="h-3.5 w-3.5" />
                {language === "en" ? "Edit" : "Editar"}
              </button>
            )}
          </div>
        </div>

        {/* Da abertura ao fim do corpo: o que a barra de progresso mede. */}
        <div ref={leituraRef}>

        {/* Abertura.

            A capa continua um bloco só dela: as capas aqui são logotipos e
            diagramas sobre fundo claro, e escrever o título por cima brigaria
            com o desenho. O painel sobe sobre a borda de baixo da imagem — o
            bastante para os dois lerem como uma peça, sem disputar espaço. */}
        {project.imageUrl && (
          <div className={`relative w-full overflow-hidden rounded-3xl bg-superficie-alta ${COVER_ASPECT_CLASS}`}>
            <LocalImage
              src={project.imageUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div
          className={`relative rounded-3xl border border-borda-suave bg-superficie p-6 shadow-sm sm:p-8 print:mt-0 print:border-0 print:p-0 print:shadow-none ${
            project.imageUrl ? "-mt-10 sm:-mt-14" : "mt-0"
          }`}
        >
          {(project.draft || projCategories.length > 0) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {project.draft && (
                <span className="rounded-full bg-amber-100 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  {language === "en" ? "Draft" : "Rascunho"}
                </span>
              )}
              {projCategories.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 rounded-full bg-acento-suave px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-acento-tinta"
                >
                  <Layers className="h-3 w-3" />
                  {(language === "en" && cat.nameEn) ? cat.nameEn : cat.name}
                </span>
              ))}
            </div>
          )}

          <h1 className="font-display text-3xl font-black leading-[1.05] tracking-tight text-tinta text-balance sm:text-5xl">
            {title}
          </h1>

          {summary && (
            <p className="mt-4 max-w-3xl font-sans text-base leading-relaxed text-tinta-suave sm:text-lg">
              {summary}
            </p>
          )}

          <FichaProjeto
            periodo={periodLabel}
            emAndamento={isInProgress}
            situacao={project.status}
            areas={projCategories.map((cat) => (language === "en" && cat.nameEn) ? cat.nameEn : cat.name)}
            tecnologias={project.stack && project.stack.length > 0 ? project.stack : (project.tags || [])}
            minutosDeLeitura={readMinutes}
            language={language}
          />
        </div>

        {/* Links do projeto.

            No desktop eles moram na coluna da direita, à mão o tempo todo.
            Aqui embaixo é a versão para quem não tem coluna lateral — sem
            isso, o celular perderia o caminho para o código e a demonstração. */}
        <div className="xl:hidden">
          <LinksDoProjeto project={project} language={language} />
        </div>

        {/* Corpo. `max-w-none` esticava o texto até ~100+ caracteres por
            linha — a coluna é larga, mas o texto não precisa preencher toda
            ela; a margem à direita é intencional, não espaço desperdiçado. */}
        <div className="mt-10" data-md-field="detailedDescription">
          <MarkdownRenderer
            content={body}
            className="max-w-[58ch] space-y-4 text-base leading-relaxed text-slate-700 dark:text-slate-300"
          />
        </div>

        </div>
        {/* fim do bloco medido pela barra de progresso */}

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

        {/* Relevância científica.

            "Tecnologias" morava aqui também, repetindo a mesma lista de
            chips que a ficha já mostra logo abaixo do título — a mesma
            informação duas vezes na mesma página. */}
        {relevance && (
          <section className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
              <FlaskConical className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              {language === "en" ? "Scientific relevance" : "Relevância científica"}
            </h2>
            <div data-md-field="scientificRelevance">
              <MarkdownRenderer
                content={relevance}
                className="max-w-[58ch] space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
              />
            </div>
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
                  to={lp(`/blog/${slugOf(post)}`)}
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
                to={lp(`/project/${slugOf(previousProject)}`)}
                className="group rounded-2xl border border-slate-200 p-4 transition-all hover:border-indigo-500 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-500"
              >
                <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-slate-500">
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
                to={lp(`/project/${slugOf(nextProject)}`)}
                className="group rounded-2xl border border-slate-200 p-4 text-right transition-all hover:border-indigo-500 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-500"
              >
                <span className="flex items-center justify-end gap-1 font-mono text-[11px] uppercase tracking-wider text-slate-500">
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

      {/* Coluna da direita: as saídas do projeto e a lista dos outros. */}
      <aside className="hidden xl:block">
        <div className={`sticky ${STICKY_UNDER_HEADER_CLASS} space-y-6`}>
          <LinksDoProjeto project={project} language={language} formato="barra" />
          <ProjectNavList projects={visibleProjects} currentId={project.id} language={language} />
        </div>
      </aside>
    </div>
  );
}
