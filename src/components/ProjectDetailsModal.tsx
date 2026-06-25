import React, { useState } from "react";
import { Project, ProjectCategory } from "../types";
import { X, ChevronLeft, ChevronRight, ExternalLink, Github, FlaskConical, Award, BookOpen, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LocalImage from "./LocalImage";
import MarkdownRenderer from "./MarkdownRenderer";
import { Language, translations } from "../lib/translations";

interface ProjectDetailsModalProps {
  project: Project | null;
  category: ProjectCategory | undefined;
  onClose: () => void;
  onNavigateToBlogPost?: (postId: string) => void;
  language?: Language;
}

export default function ProjectDetailsModal({
  project,
  category,
  onClose,
  onNavigateToBlogPost,
  language = "pt",
}: ProjectDetailsModalProps) {
  if (!project) return null;

  const displayTitle = (language === "en" && project.titleEn) ? project.titleEn : project.title;
  const displayDescription = (language === "en" && project.descriptionEn) ? project.descriptionEn : project.description;
  const displayDetailedDescription = (language === "en" && project.detailedDescriptionEn) ? project.detailedDescriptionEn : project.detailedDescription;
  const displayScientificRelevance = (language === "en" && project.scientificRelevanceEn) ? project.scientificRelevanceEn : project.scientificRelevance;
  const displayCategoryName = category ? ((language === "en" && category.nameEn) ? category.nameEn : category.name) : (language === "en" ? "Physics Project" : "Projeto de Física");

  const images = [
    project.imageUrl,
    ...(project.galleryImages || [])
  ].filter(Boolean) as string[];

  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity"
        />

        {/* Scrollable Container */}
        <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100"
          >
            {/* Header / Top Bar */}
            <div className="absolute right-4 top-4 z-10">
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/40 text-white backdrop-blur-xs transition-colors hover:bg-slate-950/80"
                id="close-details-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12">
              {/* Media Section: Left/Top 5 cols */}
              <div className="relative md:col-span-7 bg-slate-950 flex flex-col justify-center min-h-[300px] md:min-h-[500px]">
                {images.length > 0 ? (
                  <div className="relative w-full h-full aspect-video md:aspect-auto md:h-[550px] overflow-hidden group">
                    <LocalImage
                      src={images[activeImageIdx]}
                      alt={`${displayTitle} - ${language === "en" ? "View" : "Visualização"} ${activeImageIdx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />

                    {/* Image navigation */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs hover:bg-black/70 transition-colors"
                        >
                          <ChevronLeft className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs hover:bg-black/70 transition-colors"
                        >
                          <ChevronRight className="h-4.5 w-4.5" />
                        </button>

                        {/* Image Indicators */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 px-2.5 py-1.5 rounded-full backdrop-blur-xs">
                          {images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveImageIdx(idx);
                              }}
                              className={`h-1.5 w-1.5 rounded-full transition-all ${
                                idx === activeImageIdx ? "bg-white w-3" : "bg-white/55"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-slate-500 font-sans p-6">
                    <FlaskConical className="h-10 w-10 text-slate-600 mb-2" />
                    <p className="text-xs">{language === "en" ? "No visuals available for this project" : "Nenhum visual disponível para este projeto"}</p>
                  </div>
                )}
              </div>

              {/* Information Section: Right/Bottom 5 cols */}
              <div className="p-6 sm:p-8 md:p-10 md:col-span-5 flex flex-col justify-between max-h-[550px] overflow-y-auto">
                <div className="space-y-6">
                  {/* Category & Badge */}
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 font-sans">
                      <Layers className="h-3.5 w-3.5 text-indigo-600" />
                      {displayCategoryName}
                    </span>
                  </div>

                  {/* Title & Teaser */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display leading-tight">
                      {displayTitle}
                    </h2>
                    <div className="mt-2.5">
                      <MarkdownRenderer
                        content={displayDescription}
                        className="text-sm font-semibold text-indigo-600/90 font-sans leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Detailed Description */}
                  {displayDetailedDescription && (
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        <BookOpen className="h-4 w-4 text-slate-400" />
                        <span>{language === "en" ? "Approach & Engineering" : "Abordagem & Engenharia"}</span>
                      </div>
                      <MarkdownRenderer
                        content={displayDetailedDescription}
                        className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed space-y-2"
                      />
                    </div>
                  )}

                  {/* Scientific Relevance */}
                  {displayScientificRelevance && (
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        <FlaskConical className="h-4 w-4 text-indigo-500" />
                        <span className="text-slate-500">{language === "en" ? "Scientific Relevance" : "Relevância Científica"}</span>
                      </div>
                      <div className="italic bg-indigo-50/40 rounded-xl p-3.5 border border-indigo-100/50">
                        <MarkdownRenderer
                          content={displayScientificRelevance}
                          className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed space-y-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {project.tags.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        {language === "en" ? "Applied Skills" : "Competências Aplicadas"}
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {project.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 font-sans"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* External Links & Blog Redirection / Footer */}
                <div className="mt-8 pt-5 border-t border-slate-100 space-y-3">
                  {project.blogPostId && onNavigateToBlogPost && (
                    <button
                      onClick={() => {
                        onNavigateToBlogPost!(project.blogPostId!);
                        onClose();
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 px-4 py-3 text-xs font-bold text-indigo-700 transition-colors border border-indigo-100"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>{language === "en" ? "Detailed Explanation in Blog" : "Explicação Detalhada no Blog"}</span>
                    </button>
                  )}

                  {(project.projectUrl || project.githubUrl) && (
                    <div className="flex flex-wrap gap-3">
                      {project.projectUrl && (
                        <a
                          href={project.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>{language === "en" ? "Access Publication" : "Acessar Publicação"}</span>
                        </a>
                      )}
                      {project.githubUrl && (
                        <a
                          href={
                            project.githubUrl.startsWith("http")
                              ? project.githubUrl
                              : `https://github.com/${project.githubUrl}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Github className="h-4 w-4 text-slate-500" />
                          <span>{language === "en" ? "View Code" : "Ver Código"}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
