import React, { useState, useEffect, useRef } from "react";
import { Project, ProjectCategory } from "../types";
import { 
  X, ChevronLeft, ChevronRight, ExternalLink, Github, FlaskConical, 
  BookOpen, Layers, Share2, Check, User, Calendar, CheckCircle2, 
  Code, Clock, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LocalImage from "./LocalImage";
import MarkdownRenderer from "./MarkdownRenderer";
import { Language } from "../lib/translations";

interface ProjectDetailsModalProps {
  project: Project | null;
  category: ProjectCategory | undefined;
  onClose: () => void;
  language?: Language;
}

export default function ProjectDetailsModal({
  project,
  category,
  onClose,
  language = "pt",
}: ProjectDetailsModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!project) return;

    // Save previous active element to restore focus on close
    const previousActiveElement = document.activeElement as HTMLElement | null;

    // Prevent body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus close button or modal container
    const timer = setTimeout(() => {
      const closeBtn = document.getElementById("close-details-btn");
      if (closeBtn) {
        closeBtn.focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }
    }, 50);

    // Focus trap event listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElement && typeof previousActiveElement.focus === "function") {
        previousActiveElement.focus();
      }
    };
  }, [project, onClose]);

  if (!project) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/project/${project.codigo || project.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const displayTitle = (language === "en" && project.titleEn) ? project.titleEn : project.title;
  const displayDescription = (language === "en" && project.descriptionEn) ? project.descriptionEn : project.description;
  const displayDetailedDescription = (language === "en" && project.detailedDescriptionEn) 
    ? project.detailedDescriptionEn 
    : (project.detailedDescription || project.longDescriptionEn || project.longDescription || displayDescription);
  const displayScientificRelevance = (language === "en" && project.scientificRelevanceEn) 
    ? project.scientificRelevanceEn 
    : project.scientificRelevance;
  const displayCategoryName = category 
    ? ((language === "en" && category.nameEn) ? category.nameEn : category.name) 
    : (project.categoryEn && language === "en" ? project.categoryEn : project.category || (language === "en" ? "Physics Project" : "Projeto de Física"));

  const displayHighlights = (language === "en" && project.highlightsEn && project.highlightsEn.length > 0)
    ? project.highlightsEn
    : project.highlights || [];

  const stack = project.stack || project.technologies || [];

  const images = [
    project.imageUrl,
    ...(project.galleryImages || project.images || [])
  ].filter(Boolean) as string[];

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  // Estimate reading time based on text length
  const totalWords = (displayTitle + " " + displayDescription + " " + displayDetailedDescription).split(/\s+/).length;
  const readTimeMinutes = Math.max(1, Math.ceil(totalWords / 180));

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 overflow-y-auto" 
        aria-labelledby="modal-project-title" 
        role="dialog" 
        aria-modal="true"
      >
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity"
        />

        {/* Scrollable Container */}
        <div className="flex min-h-screen items-center justify-center p-3 sm:p-6 lg:p-8">
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-6xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 my-4 sm:my-8 outline-none"
          >
            {/* Header / Control Bar */}
            <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-md transition-all hover:bg-indigo-600 hover:scale-105 cursor-pointer shadow-md"
                aria-label={language === "en" ? "Copy project link" : "Copiar link do projeto"}
                title={copiedLink ? (language === "en" ? "Link Copied!" : "Link Copiado!") : (language === "en" ? "Copy Link" : "Copiar Link")}
              >
                {copiedLink ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Share2 className="h-4.5 w-4.5" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-md transition-colors hover:bg-slate-950/90 cursor-pointer shadow-md"
                id="close-details-btn"
                aria-label={language === "en" ? "Close modal" : "Fechar modal"}
                title={language === "en" ? "Close" : "Fechar"}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Unified Scrollable Container - Header cover gallery scrolls up with page */}
            <div className="max-h-[88vh] overflow-y-auto">
              {/* Banner Cover / Gallery Section */}
              {images.length > 0 && (
                <div className="relative w-full h-72 sm:h-[400px] lg:h-[460px] bg-slate-950 overflow-hidden group">
                  {/* Background blurred ambiance */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 scale-110 pointer-events-none"
                    style={{ backgroundImage: `url(${images[activeImageIdx]})` }}
                  />
                  
                  {/* Main Foreground Image */}
                  <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
                    <LocalImage
                      src={images[activeImageIdx]}
                      alt={`${displayTitle} - ${language === "en" ? "View" : "Visualização"} ${activeImageIdx + 1}`}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain shadow-2xl rounded-xl"
                    />
                  </div>

                  {/* Bottom gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80 pointer-events-none" />

                  {/* Image Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur-md hover:bg-indigo-600 transition-all shadow-lg cursor-pointer"
                        aria-label={language === "en" ? "Previous image" : "Imagem anterior"}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur-md hover:bg-indigo-600 transition-all shadow-lg cursor-pointer"
                        aria-label={language === "en" ? "Next image" : "Próxima imagem"}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      {/* Image Indicators */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-full backdrop-blur-md border border-slate-700/60 shadow-md">
                        {images.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveImageIdx(idx);
                            }}
                            aria-label={`Ir para imagem ${idx + 1}`}
                            className={`h-2 rounded-full transition-all cursor-pointer ${
                              idx === activeImageIdx ? "bg-indigo-400 w-5" : "bg-white/40 w-2 hover:bg-white/70"
                            }`}
                          />
                        ))}
                        <span className="font-mono text-xs text-slate-300 ml-1">
                          {activeImageIdx + 1}/{images.length}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Article Content Body (Full Blog Post Styling) */}
              <div className="p-6 sm:p-10 lg:p-14">
              {/* Category, Status & Period Badges */}
              <div className="flex flex-wrap items-center gap-2.5 mb-6">
                {/* Category Pill */}
                {displayCategoryName && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 text-white px-3.5 py-1 text-xs font-bold font-sans uppercase tracking-wider shadow-xs">
                    <Layers className="h-3.5 w-3.5" />
                    {displayCategoryName}
                  </span>
                )}

                {/* Status Badge */}
                {project.status && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{project.status}</span>
                  </span>
                )}

                {/* Period Tag */}
                {project.periodo && (
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {typeof project.periodo === "string" 
                        ? project.periodo 
                        : `${project.periodo.inicio}${project.periodo.fim ? ` - ${project.periodo.fim}` : " - Presente"}`}
                    </span>
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 id="modal-project-title" className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-display leading-tight mb-6">
                {displayTitle}
              </h1>

              {/* Publication Metadata Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 dark:border-slate-800 py-4 mb-8 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-sans">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 font-mono">
                    Engenharia Física — UFLA
                  </span>
                </div>

                <div className="flex items-center gap-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    <span>{readTimeMinutes} {language === "en" ? "min read" : "min de leitura"}</span>
                  </span>
                  {project.data && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>{project.data}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Lead Summary Callout */}
              {displayDescription && (
                <div className="mb-8 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 p-5 sm:p-6 border-l-4 border-indigo-600 dark:border-indigo-500 shadow-xs max-w-[75ch]">
                  <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200 font-sans leading-relaxed">
                    {displayDescription}
                  </p>
                </div>
              )}

              {/* Main Full Post Content (Markdown Render) */}
              <div className="mb-10 space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span>{language === "en" ? "Project Overview & Engineering" : "Detalhamento e Engenharia"}</span>
                </h2>
                
                <div className="prose prose-indigo dark:prose-invert max-w-[75ch] text-slate-800 dark:text-slate-200 text-base leading-relaxed">
                  <MarkdownRenderer content={displayDetailedDescription} />
                </div>
              </div>

              {/* Scientific Relevance Section (if present) */}
              {displayScientificRelevance && (
                <div className="mb-10 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-6 sm:p-8 border border-indigo-100 dark:border-indigo-950/80 shadow-xs space-y-3 max-w-[75ch]">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-mono">
                    <FlaskConical className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <span>{language === "en" ? "Scientific & Physical Relevance" : "Relevância Científica e Física"}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-sans text-sm sm:text-base leading-relaxed">
                    <MarkdownRenderer content={displayScientificRelevance} />
                  </div>
                </div>
              )}

              {/* Key Highlights / Features */}
              {displayHighlights.length > 0 && (
                <div className="mb-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-xs space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display border-b border-slate-100 dark:border-slate-800 pb-3">
                    {language === "en" ? "Key Highlights & Capabilities" : "Destaques e Funcionalidades do Projeto"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {displayHighlights.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-100 dark:border-slate-800/80">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 font-sans leading-snug">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Applied Competencies & Stack */}
              {(project.tags.length > 0 || stack.length > 0) && (
                <div className="mb-10 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                    {language === "en" ? "Applied Technologies & Skills" : "Tecnologias e Competências Aplicadas"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {stack.map((tech, idx) => (
                      <span
                        key={`stack-${idx}`}
                        className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.tags.map((tag, idx) => (
                      <span
                        key={`tag-${idx}`}
                        className="rounded-lg bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 font-sans border border-indigo-100 dark:border-indigo-900/50"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Repository & External Action Links */}
              {(project.projectUrl || project.githubUrl || project.repositoryUrl || project.liveUrl || project.demoUrl || project.documentationUrl || project.paperUrl) && (
                <div className="mb-10 p-6 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white shadow-xl space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300 font-mono">
                    {language === "en" ? "Project Access & Code" : "Acesso ao Código e Repositório"}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {(project.githubUrl || project.repositoryUrl) && (
                      <a
                        href={
                          (project.githubUrl || project.repositoryUrl!).startsWith("http")
                            ? (project.githubUrl || project.repositoryUrl!)
                            : `https://github.com/${project.githubUrl || project.repositoryUrl}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-5 py-3 text-xs sm:text-sm font-bold shadow-md transition-transform active:scale-95 cursor-pointer"
                      >
                        <Github className="h-4 w-4 text-slate-900" />
                        <span>{language === "en" ? "Source Code (GitHub)" : "Ver Código Fonte (GitHub)"}</span>
                      </a>
                    )}

                    {(project.projectUrl || project.liveUrl || project.demoUrl) && (
                      <a
                        href={project.projectUrl || project.liveUrl || project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 text-xs sm:text-sm font-bold shadow-md transition-transform active:scale-95 cursor-pointer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>{language === "en" ? "Live Application / Demo" : "Acessar Aplicação / Protótipo"}</span>
                      </a>
                    )}

                    {(project.documentationUrl || project.paperUrl) && (
                      <a
                        href={project.documentationUrl || project.paperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 text-xs sm:text-sm font-bold transition-transform active:scale-95 cursor-pointer"
                      >
                        <FileText className="h-4 w-4 text-slate-300" />
                        <span>{language === "en" ? "Documentation / Article" : "Ver Artigo / Documentação"}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
