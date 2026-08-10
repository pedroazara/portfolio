import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Github, ExternalLink, FileText, Code, Calendar, 
  CheckCircle2, Clock, ShieldAlert, ChevronLeft, ChevronRight, Share2, Check 
} from "lucide-react";
import { ResumeData, Project } from "../types";
import LocalImage from "../components/LocalImage";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { Language } from "../lib/translations";

interface ProjectDetailsPageProps {
  resumeData: ResumeData;
  language?: Language;
  isEditMode?: boolean;
}

export default function ProjectDetailsPage({
  resumeData,
  language = "pt",
  isEditMode = false,
}: ProjectDetailsPageProps) {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Find project by codigo or id
  const project = (resumeData.projects || []).find(
    (p) => (p.codigo && p.codigo.toLowerCase() === codigo?.toLowerCase()) || p.id === codigo
  );

  // Auto-scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [codigo]);

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center font-sans">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display mb-2">
          {language === "en" ? "Project Not Found" : "Projeto Não Encontrado"}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-md mx-auto font-sans">
          {language === "en" 
            ? `No project with code or identifier "${codigo}" was found in our catalog.` 
            : `Nenhum projeto com o código ou identificador "${codigo}" foi encontrado no catálogo.`}
        </p>
        <Link
          to="/projetos"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{language === "en" ? "Back to Projects Catalog" : "Voltar ao Catálogo de Projetos"}</span>
        </Link>
      </div>
    );
  }

  // Derived content
  const title = (language === "en" && project.titleEn ? project.titleEn : project.title) || project.title;
  const description = (language === "en" && project.descriptionEn ? project.descriptionEn : project.description) || project.description;
  const longDescription = (language === "en" && project.longDescriptionEn ? project.longDescriptionEn : project.longDescription) || project.longDescription || description;
  const category = (language === "en" && project.categoryEn ? project.categoryEn : project.category) || project.category;
  const highlights = (language === "en" && project.highlightsEn ? project.highlightsEn : project.highlights) || project.highlights || [];
  const stack = project.stack || project.technologies || [];

  // Carousel images
  const allImages = project.images && project.images.length > 0 
    ? project.images 
    : project.imageUrl 
      ? [project.imageUrl] 
      : [];

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Cross-referenced Articles (Blog posts referencing this project code)
  const relatedPosts = (resumeData.posts || []).filter(
    (post) => post.projetos && post.projetos.includes(project.codigo || project.id)
  );

  return (
    <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link
          to="/projetos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{language === "en" ? "All Projects" : "Todos os Projetos"}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={language === "en" ? "Copy link" : "Copiar link de compartilhamento"}
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
            <span>{copiedLink ? (language === "en" ? "Copied!" : "Copiado!") : (language === "en" ? "Share" : "Compartilhar")}</span>
          </button>
        </div>
      </div>

      {/* Main Header Block */}
      <header className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Tag */}
          {category && (
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 font-sans">
              {category}
            </span>
          )}

          {/* Status Badge */}
          {project.status && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>{project.status}</span>
            </span>
          )}

          {/* Period */}
          {project.periodo && (
            <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md">
              <Calendar className="h-3 w-3" />
              <span>
                {typeof project.periodo === "string" 
                  ? project.periodo 
                  : `${project.periodo.inicio}${project.periodo.fim ? ` - ${project.periodo.fim}` : " - Presente"}`}
              </span>
            </span>
          )}
        </div>

        {/* Title (Bold, Display Font) */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display leading-tight">
          {title}
        </h1>

        {/* Short Description: Distinct typography weight (Font normal, muted color, weight 400) per 9.1 */}
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal font-sans leading-relaxed pt-1">
          {description}
        </p>
      </header>

      {/* Screenshot Gallery / Carousel with object-fit: contain per 9.1 */}
      {allImages.length > 0 && (
        <section className="mb-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950/90 overflow-hidden shadow-lg">
          {/* Main Image Stage (object-fit: contain to prevent cropping side text) */}
          <div className="relative aspect-[16/9] w-full flex items-center justify-center bg-slate-950 p-2 sm:p-4">
            <LocalImage
              src={allImages[currentImageIndex]}
              alt={`${title} screenshot ${currentImageIndex + 1}`}
              className="max-h-full max-w-full object-contain rounded-lg"
            />

            {/* Navigation Carousel Controls OUTSIDE or over protective strip per 9.1 */}
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white border border-slate-700/80 hover:bg-indigo-600 transition-colors shadow-md cursor-pointer"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white border border-slate-700/80 hover:bg-indigo-600 transition-colors shadow-md cursor-pointer"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Counter Strip at Bottom */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-xs font-mono text-slate-300 border border-slate-800">
                  {currentImageIndex + 1} / {allImages.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Strip */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-2 p-3 overflow-x-auto border-t border-slate-800 bg-slate-900/80">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all cursor-pointer ${
                    currentImageIndex === idx
                      ? "border-indigo-500 scale-105"
                      : "border-slate-800 opacity-60 hover:opacity-100"
                  }`}
                >
                  <LocalImage src={img} alt={`Thumb ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Grid Layout: Main Content (Left) & Metadata Sidebar / Action Block (Right) per 9.6 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Full Description & Highlights */}
        <div className="lg:col-span-8 space-y-8">
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              {language === "en" ? "About the Project" : "Sobre o Projeto"}
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
              <MarkdownRenderer content={longDescription} />
            </div>
          </section>

          {/* Key Highlights / Features */}
          {highlights.length > 0 && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                {language === "en" ? "Key Highlights & Capabilities" : "Destaques e Funcionalidades"}
              </h2>
              <ul className="space-y-3">
                {highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 font-sans">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs mt-0.5">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Right Column: Metadata Block & External Links per 9.6 */}
        <aside className="lg:col-span-4 space-y-6 sticky top-24">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 p-6 shadow-xs space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono border-b border-slate-200 dark:border-slate-800 pb-3">
              {language === "en" ? "Project Metadata" : "Metadados do Projeto"}
            </h3>

            {/* Category */}
            {category && (
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans block mb-1">
                  {language === "en" ? "Category" : "Categoria"}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-sans">
                  {category}
                </span>
              </div>
            )}

            {/* Period */}
            {project.periodo && (
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans block mb-1">
                  {language === "en" ? "Development Period" : "Período de Desenvolvimento"}
                </span>
                <span className="font-mono text-sm text-slate-800 dark:text-slate-200">
                  {typeof project.periodo === "string" 
                    ? project.periodo 
                    : `${project.periodo.inicio}${project.periodo.fim ? ` - ${project.periodo.fim}` : " - Presente"}`}
                </span>
              </div>
            )}

            {/* Status */}
            {project.status && (
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans block mb-1">
                  Status
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>{project.status}</span>
                </span>
              </div>
            )}

            {/* Technology Stack */}
            {stack.length > 0 && (
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans block mb-2">
                  {language === "en" ? "Technology Stack" : "Tecnologias & Stack"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {stack.map((tech, i) => (
                    <span
                      key={i}
                      className="rounded bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 text-xs font-mono font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* External Links Buttons */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              {(project.githubUrl || project.repositoryUrl) && (
                <a
                  href={project.githubUrl || project.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold shadow-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  <Github className="h-4 w-4" />
                  <span>{language === "en" ? "Source Code (GitHub)" : "Código Fonte (GitHub)"}</span>
                </a>
              )}

              {(project.liveUrl || project.demoUrl || project.link) && (
                <a
                  href={project.liveUrl || project.demoUrl || project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-xs font-bold shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>{language === "en" ? "Live Demo / App" : "Ver Protótipo / App"}</span>
                </a>
              )}

              {(project.documentationUrl || project.paperUrl) && (
                <a
                  href={project.documentationUrl || project.paperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span>{language === "en" ? "Documentation / Article" : "Documentação / Artigo"}</span>
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
