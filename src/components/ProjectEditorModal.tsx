import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, PenTool, Eye, Sparkles, FolderKanban, Check, ExternalLink, Github, 
  ImageIcon, FlaskConical, BookOpen, Star, Plus, Trash2, RefreshCw, Link2, Share2
} from "lucide-react";
import { Project, ProjectCategory } from "../types";
import { Language } from "../lib/translations";
import ImageSelectorInput from "./ImageSelectorInput";
import ArticleContentEditor from "./ArticleContentEditor";
import MarkdownRenderer from "./MarkdownRenderer";
import TranslateButton from "./TranslateButton";
import { translateFields } from "../lib/translator";
import { StoredImage, listImages } from "../utils/imageDb";
import LocalImage from "./LocalImage";

interface ProjectEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Partial<Project> | null;
  categories: ProjectCategory[];
  onSave: (project: Project) => void;
  language?: Language;
}

export default function ProjectEditorModal({
  isOpen,
  onClose,
  project,
  categories,
  onSave,
  language = "pt",
}: ProjectEditorModalProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [editingLanguage, setEditingLanguage] = useState<Language>(language);

  // Form State
  const [formData, setFormData] = useState<Partial<Project>>({
    title: "",
    titleEn: "",
    description: "",
    descriptionEn: "",
    categoryId: categories[0]?.id || "",
    tags: [],
    projectUrl: "",
    githubUrl: "",
    imageUrl: "",
    detailedDescription: "",
    detailedDescriptionEn: "",
    scientificRelevance: "",
    scientificRelevanceEn: "",
    galleryImages: [],
    featured: false,
  });

  const [tagsInput, setTagsInput] = useState("");
  const [showLinkFields, setShowLinkFields] = useState(false);

  // Gallery & Media Bank
  const [isMediaBankOpen, setIsMediaBankOpen] = useState(false);
  const [localImages, setLocalImages] = useState<StoredImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({ ...project });
      setTagsInput((project.tags || []).join(", "));
    } else {
      setFormData({
        title: "",
        titleEn: "",
        description: "",
        descriptionEn: "",
        categoryId: categories[0]?.id || "",
        tags: [],
        projectUrl: "",
        githubUrl: "",
        imageUrl: "",
        detailedDescription: "",
        detailedDescriptionEn: "",
        scientificRelevance: "",
        scientificRelevanceEn: "",
        galleryImages: [],
        featured: false,
      });
      setTagsInput("");
    }
    setEditingLanguage(language);
    setActiveTab("edit");
  }, [project, isOpen, language, categories]);

  const loadLocalImages = async () => {
    setIsLoadingImages(true);
    try {
      const list = await listImages();
      setLocalImages(list);
    } catch (err) {
      console.error("Erro ao carregar banco de imagens:", err);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleToggleGalleryImage = (imgName: string) => {
    const dbKey = `db:${imgName}`;
    const current = formData.galleryImages || [];
    if (current.includes(dbKey)) {
      setFormData({
        ...formData,
        galleryImages: current.filter((x) => x !== dbKey),
      });
    } else {
      setFormData({
        ...formData,
        galleryImages: [...current, dbKey],
      });
    }
  };

  const handleRemoveGalleryImage = (idxToRemove: number) => {
    const current = formData.galleryImages || [];
    setFormData({
      ...formData,
      galleryImages: current.filter((_, idx) => idx !== idxToRemove),
    });
  };

  const handleAutoTranslate = async () => {
    const fieldsToTranslate = {
      titleEn: formData.title || "",
      descriptionEn: formData.description || "",
      detailedDescriptionEn: formData.detailedDescription || "",
      scientificRelevanceEn: formData.scientificRelevance || "",
    };

    const translated = await translateFields(fieldsToTranslate);

    setFormData((prev) => ({
      ...prev,
      titleEn: translated.titleEn || prev.titleEn || "",
      descriptionEn: translated.descriptionEn || prev.descriptionEn || "",
      detailedDescriptionEn: translated.detailedDescriptionEn || prev.detailedDescriptionEn || "",
      scientificRelevanceEn: translated.scientificRelevanceEn || prev.scientificRelevanceEn || "",
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const tagsArray = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const completeProject: Project = {
      id: formData.id || `proj-${Date.now()}`,
      title: formData.title || "Novo Projeto",
      titleEn: formData.titleEn || "",
      description: formData.description || "",
      descriptionEn: formData.descriptionEn || "",
      categoryId: formData.categoryId || (categories[0]?.id || ""),
      tags: tagsArray,
      projectUrl: formData.projectUrl || undefined,
      githubUrl: formData.githubUrl || undefined,
      imageUrl: formData.imageUrl || undefined,
      detailedDescription: formData.detailedDescription || "",
      detailedDescriptionEn: formData.detailedDescriptionEn || "",
      scientificRelevance: formData.scientificRelevance || "",
      scientificRelevanceEn: formData.scientificRelevanceEn || "",
      galleryImages: formData.galleryImages || [],
      featured: formData.featured || false,
      blogPostId: formData.blogPostId || undefined,
    };

    onSave(completeProject);
    onClose();
  };

  if (!isOpen) return null;

  // Selected Category Object
  const selectedCatObj = categories.find((c) => c.id === formData.categoryId);
  const categoryDisplayName = editingLanguage === "en" && selectedCatObj?.nameEn
    ? selectedCatObj.nameEn
    : selectedCatObj?.name || "";

  // Content for preview mode
  const displayTitle = editingLanguage === "en" && formData.titleEn ? formData.titleEn : formData.title || "Título do Projeto";
  const displayDescription = editingLanguage === "en" && formData.descriptionEn ? formData.descriptionEn : formData.description || "";
  const displayDetailedDescription = editingLanguage === "en" && formData.detailedDescriptionEn ? formData.detailedDescriptionEn : formData.detailedDescription || "";
  const displayScientificRelevance = editingLanguage === "en" && formData.scientificRelevanceEn ? formData.scientificRelevanceEn : formData.scientificRelevance || "";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto no-print">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Container */}
        <div className="flex min-h-screen items-center justify-center p-2 sm:p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-5xl rounded-3xl bg-slate-50 dark:bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col my-4 max-h-[92vh]"
          >
            {/* Top Toolbar / Header */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800 shadow-xs z-10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-900/60">
                  <PenTool className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold font-display text-slate-900 dark:text-white leading-snug">
                    {formData.id ? (language === "en" ? "Edit Project Post" : "Editar Artigo de Projeto") : (language === "en" ? "Create New Project" : "Novo Artigo de Projeto")}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                    {language === "en" ? "Natural reading-style editor & markdown preview" : "Editor em formato de artigo e pré-visualização em tempo real"}
                  </p>
                </div>
              </div>

              {/* View Switcher Tabs (Escrever / Pré-visualização) */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "edit"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <PenTool className="h-3.5 w-3.5" />
                  <span>{language === "en" ? "Write / Edit" : "Escrever"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{language === "en" ? "Post Preview" : "Pré-visualização"}</span>
                </button>
              </div>

              {/* Language Switcher, AI Translator & Actions */}
              <div className="flex items-center gap-2">
                <TranslateButton
                  onTranslate={handleAutoTranslate}
                  label={language === "en" ? "Translate PT → EN" : "Traduzir PT → EN"}
                  size="sm"
                />

                <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setEditingLanguage("pt")}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      editingLanguage === "pt"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    PT
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLanguage("en")}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      editingLanguage === "en"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    EN
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{language === "en" ? "Save Project" : "Salvar Projeto"}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Main Document Canvas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              {activeTab === "edit" ? (
                /* --- WRITE MODE (NATURAL ARTICLE-STYLE EDITOR) --- */
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8 bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                  
                  {/* 1. HERO COVER IMAGE SECTION */}
                  <div className="space-y-2">
                    <ImageSelectorInput
                      label={language === "en" ? "Cover Image" : "Imagem de Capa do Artigo/Projeto"}
                      value={formData.imageUrl || ""}
                      onChange={(val) => setFormData({ ...formData, imageUrl: val })}
                      placeholder="https://images.unsplash.com/photo-... ou db:nome.png"
                      id="project-editor-cover"
                    />
                  </div>

                  {/* 2. METADATA STRIP (CATEGORY, FEATURED, TAGS, LINKS) */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      
                      {/* Category Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400">
                          {language === "en" ? "Specialty Area:" : "Área de Atuação:"}
                        </span>
                        <select
                          required
                          value={formData.categoryId || ""}
                          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                          className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 text-xs font-bold font-sans focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              {language === "en" && c.nameEn ? c.nameEn : c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Featured Toggle */}
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          formData.featured
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${formData.featured ? "fill-amber-500 text-amber-500" : ""}`} />
                        <span>{language === "en" ? "Featured Project" : "Projeto em Destaque"}</span>
                      </button>

                      {/* Links Drawer Toggle */}
                      <button
                        type="button"
                        onClick={() => setShowLinkFields(!showLinkFields)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          showLinkFields || formData.projectUrl || formData.githubUrl
                            ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        <span>{language === "en" ? "External Links & Demo" : "Links de Demo e Repositório"}</span>
                      </button>
                    </div>

                    {/* Collapsible External Links */}
                    {showLinkFields && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60"
                      >
                        <div>
                          <label className="block text-[11px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                            <ExternalLink className="h-3 w-3 text-indigo-500" />
                            <span>{language === "en" ? "Demo / Publication URL" : "URL de Demonstração / Artigo"}</span>
                          </label>
                          <input
                            type="url"
                            placeholder="https://meuprojeto.com"
                            value={formData.projectUrl || ""}
                            onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                            <Github className="h-3 w-3 text-indigo-500" />
                            <span>{language === "en" ? "Repository URL (GitHub)" : "URL do Repositório (GitHub)"}</span>
                          </label>
                          <input
                            type="text"
                            placeholder="https://github.com/usuario/projeto"
                            value={formData.githubUrl || ""}
                            onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Tags Input */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-1">
                        {language === "en" ? "Tags / Technologies (comma separated)" : "Tags / Tecnologias Utilizadas (separadas por vírgula)"}
                      </label>
                      <input
                        type="text"
                        placeholder="React, Python, MATLAB, Finite Element Method..."
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* 3. DISPLAY TITLE (ARTICLE H1) */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase font-mono tracking-wider text-slate-400">
                      {editingLanguage === "en" ? "Project Title (English)" : "Título do Projeto (Português)"} *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingLanguage === "en" ? formData.titleEn || "" : formData.title || ""}
                      onChange={(e) => {
                        if (editingLanguage === "en") {
                          setFormData({ ...formData, titleEn: e.target.value });
                        } else {
                          setFormData({ ...formData, title: e.target.value });
                        }
                      }}
                      placeholder={editingLanguage === "en" ? "Enter project title..." : "Digite o título do artigo ou projeto..."}
                      className="w-full text-2xl sm:text-3xl lg:text-4xl font-black font-display text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 bg-transparent border-b-2 border-slate-200 dark:border-slate-800 focus:border-indigo-600 dark:focus:border-indigo-500 focus:outline-hidden py-2 leading-tight transition-colors"
                    />
                  </div>

                  {/* 4. LEAD SUMMARY CALLOUT BOX */}
                  <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 p-5 border-l-4 border-indigo-600 dark:border-indigo-500 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase font-mono tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{editingLanguage === "en" ? "Lead Summary (Displayed on Cards)" : "Resumo de Apresentação (Exibido no Card do Portfólio)"} *</span>
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={editingLanguage === "en" ? formData.descriptionEn || "" : formData.description || ""}
                      onChange={(e) => {
                        if (editingLanguage === "en") {
                          setFormData({ ...formData, descriptionEn: e.target.value });
                        } else {
                          setFormData({ ...formData, description: e.target.value });
                        }
                      }}
                      placeholder={editingLanguage === "en" ? "Write a compelling short summary for portfolio preview cards..." : "Escreva um resumo conciso e chamativo que descreva o objetivo e resultado principal do projeto..."}
                      className="w-full bg-transparent text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden resize-y placeholder-slate-400 dark:placeholder-slate-600 leading-relaxed"
                    />
                  </div>

                  {/* 5. MAIN ARTICLE CONTENT EDITOR */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
                        {editingLanguage === "en" ? "Engineering & Technical Post Details" : "Detalhamento de Engenharia & Conteúdo Técnico"}
                      </h3>
                    </div>

                    <ArticleContentEditor
                      value={editingLanguage === "en" ? formData.detailedDescriptionEn || "" : formData.detailedDescription || ""}
                      onChange={(val) => {
                        if (editingLanguage === "en") {
                          setFormData({ ...formData, detailedDescriptionEn: val });
                        } else {
                          setFormData({ ...formData, detailedDescription: val });
                        }
                      }}
                      label=""
                      placeholder={editingLanguage === "en" ? "Write the detailed technical description using Markdown, LaTeX formulas, code blocks, tables, and images..." : "Escreva os detalhes técnicos do projeto usando Markdown, fórmulas em LaTeX ($E=mc^2$), tabelas, códigos e imagens..."}
                      language={editingLanguage}
                      articleTitle={formData.title || "projeto"}
                      rows={14}
                    />
                  </div>

                  {/* 6. SCIENTIFIC & PHYSICAL RELEVANCE SECTION */}
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-5 border border-indigo-100 dark:border-indigo-950/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-mono">
                      <FlaskConical className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{editingLanguage === "en" ? "Scientific & Technological Relevance (Optional)" : "Relevância Científica & Aplicação Tecnológica (Opcional)"}</span>
                    </div>
                    <textarea
                      rows={3}
                      value={editingLanguage === "en" ? formData.scientificRelevanceEn || "" : formData.scientificRelevance || ""}
                      onChange={(e) => {
                        if (editingLanguage === "en") {
                          setFormData({ ...formData, scientificRelevanceEn: e.target.value });
                        } else {
                          setFormData({ ...formData, scientificRelevance: e.target.value });
                        }
                      }}
                      placeholder={editingLanguage === "en" ? "Describe how this work impacts physical research, materials science, optics, cryogenics, etc..." : "Explique como este projeto contribui para a física aplicada, ciência dos materiais, instrumentação, óptica ou indústria..."}
                      className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden resize-y placeholder-slate-400 dark:placeholder-slate-600 leading-relaxed"
                    />
                  </div>

                  {/* 7. GALLERY IMAGES SECTION */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
                          {language === "en" ? "Gallery Images" : "Galeria de Imagens do Projeto"}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMediaBankOpen(!isMediaBankOpen);
                          if (!isMediaBankOpen) loadLocalImages();
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{language === "en" ? "Add from Media Bank" : "Adicionar do Banco de Mídia"}</span>
                      </button>
                    </div>

                    {/* Attached Gallery Thumbnails */}
                    {(formData.galleryImages || []).length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(formData.galleryImages || []).map((imgUrl, idx) => (
                          <div key={idx} className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-video">
                            <LocalImage src={imgUrl} alt={`Galeria ${idx + 1}`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryImage(idx)}
                              className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/80 text-white hover:bg-red-600 transition-colors shadow-md cursor-pointer"
                              title="Remover Imagem da Galeria"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {language === "en" ? "No gallery images attached yet." : "Nenhuma imagem adicional na galeria ainda."}
                        </p>
                      </div>
                    )}

                    {/* Media Bank Picker Drawer */}
                    {isMediaBankOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 mt-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span className="text-xs font-bold font-mono uppercase text-slate-600 dark:text-slate-300">
                            {language === "en" ? "Select images for Gallery:" : "Selecione as imagens para a galeria:"}
                          </span>
                          <button
                            type="button"
                            onClick={loadLocalImages}
                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Atualizar"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {isLoadingImages ? (
                          <p className="text-xs text-slate-500 font-mono py-4 text-center">Carregando banco...</p>
                        ) : localImages.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-4">Nenhuma imagem no banco local.</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                            {localImages.map((img) => {
                              const dbKey = `db:${img.name}`;
                              const isSelected = (formData.galleryImages || []).includes(dbKey);
                              return (
                                <button
                                  key={img.name}
                                  type="button"
                                  onClick={() => handleToggleGalleryImage(img.name)}
                                  className={`relative group rounded-xl overflow-hidden border p-1 text-left transition-all cursor-pointer aspect-video bg-white dark:bg-slate-900 ${
                                    isSelected
                                      ? "border-indigo-600 ring-2 ring-indigo-500/50"
                                      : "border-slate-200 dark:border-slate-700 hover:border-slate-400"
                                  }`}
                                >
                                  <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover rounded-lg" />
                                  <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 p-1 text-[9px] font-mono text-white truncate">
                                    {img.name}
                                  </div>
                                  {isSelected && (
                                    <div className="absolute top-1.5 right-1.5 rounded-full bg-indigo-600 text-white p-1 shadow-md">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* SUBMIT BUTTON FOOTER */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {language === "en" ? "Cancel" : "Cancelar"}
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      {language === "en" ? "Save Project" : "Salvar Projeto"}
                    </button>
                  </div>
                </form>
              ) : (
                /* --- PREVIEW MODE (EXACT ARTICLE/POST READING VIEW) --- */
                <div className="max-w-4xl mx-auto space-y-8 bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                  {/* Hero Image */}
                  {formData.imageUrl && (
                    <div className="relative aspect-video sm:aspect-[21/9] w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
                      <LocalImage src={formData.imageUrl} alt={displayTitle} className="h-full w-full object-cover" />
                    </div>
                  )}

                  {/* Header Meta */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                        {categoryDisplayName || "Especialidade"}
                      </span>
                      {formData.featured && (
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-500" />
                          <span>Destaque</span>
                        </span>
                      )}
                      {(formData.tags || []).map((t, i) => (
                        <span key={i} className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-slate-900 dark:text-white leading-tight">
                      {displayTitle}
                    </h1>

                    {/* External Buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {formData.projectUrl && (
                        <a
                          href={formData.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>{language === "en" ? "Live Demo / Paper" : "Demonstração / Artigo"}</span>
                        </a>
                      )}
                      {formData.githubUrl && (
                        <a
                          href={formData.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <Github className="h-3.5 w-3.5" />
                          <span>GitHub</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Lead Callout */}
                  {displayDescription && (
                    <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 p-5 sm:p-6 border-l-4 border-indigo-600 dark:border-indigo-500">
                      <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                        {displayDescription}
                      </p>
                    </div>
                  )}

                  {/* Main Article Content */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white mb-4">
                      {language === "en" ? "Project Overview & Engineering" : "Detalhamento de Engenharia"}
                    </h2>
                    <MarkdownRenderer content={displayDetailedDescription} />
                  </div>

                  {/* Scientific Relevance */}
                  {displayScientificRelevance && (
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-6 border border-indigo-100 dark:border-indigo-950/80 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-mono">
                        <FlaskConical className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>{language === "en" ? "Scientific & Physical Relevance" : "Relevância Científica e Física"}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                        {displayScientificRelevance}
                      </p>
                    </div>
                  )}

                  {/* Gallery */}
                  {(formData.galleryImages || []).length > 0 && (
                    <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
                      <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
                        {language === "en" ? "Gallery" : "Galeria de Imagens"}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {(formData.galleryImages || []).map((imgUrl, idx) => (
                          <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video bg-slate-100 dark:bg-slate-800">
                            <LocalImage src={imgUrl} alt={`Galeria ${idx + 1}`} className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
