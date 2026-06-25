import React, { useState, useEffect } from "react";
import { Project, ProjectCategory, BlogPost } from "../types";
import { FolderKanban, Plus, Edit2, Trash2, ExternalLink, Github, Settings, Info, Eye, BookOpen, Image as ImageIcon, Check, RefreshCw } from "lucide-react";
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import ProjectDetailsModal from "./ProjectDetailsModal";
import LocalImage from "./LocalImage";
import ImageSelectorInput from "./ImageSelectorInput";
import { StoredImage, listImages } from "../utils/imageDb";
import MarkdownRenderer from "./MarkdownRenderer";
import { Language, translations } from "../lib/translations";

interface ProjectSectionProps {
  projects: Project[];
  categories: ProjectCategory[];
  isEditMode: boolean;
  onUpdateProjects: (updatedProjects: Project[]) => void;
  onUpdateCategories: (updatedCategories: ProjectCategory[]) => void;
  posts?: BlogPost[];
  onNavigateToBlogPost?: (postId: string) => void;
  language?: Language;
}

export default function ProjectSection({
  projects,
  categories,
  isEditMode,
  onUpdateProjects,
  onUpdateCategories,
  posts = [],
  onNavigateToBlogPost,
  language = "pt",
}: ProjectSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Project Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");
  const [projectForm, setProjectForm] = useState<Partial<Project>>({
    title: "",
    titleEn: "",
    description: "",
    descriptionEn: "",
    categoryId: "",
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
    blogPostId: "",
  });
  const [tagsInput, setTagsInput] = useState("");
  const [galleryInput, setGalleryInput] = useState("");

  // Gallery Image Bank State
  const [isGalleryBankOpen, setIsGalleryBankOpen] = useState(false);
  const [localImages, setLocalImages] = useState<StoredImage[]>([]);
  const [isLoadingGalleryImages, setIsLoadingGalleryImages] = useState(false);

  // Confirm Modal States
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCancelText, setConfirmCancelText] = useState("Cancelar");
  const [confirmType, setConfirmType] = useState<"danger" | "warning" | "info">("danger");

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, cancelText: string = "Cancelar", type: "danger" | "warning" | "info" = "danger") => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => onConfirm);
    setConfirmCancelText(cancelText);
    setConfirmType(type);
    setConfirmOpen(true);
  };

  const loadLocalImages = async () => {
    setIsLoadingGalleryImages(true);
    try {
      const list = await listImages();
      setLocalImages(list);
    } catch (err) {
      console.error("Erro ao buscar imagens locais:", err);
    } finally {
      setIsLoadingGalleryImages(false);
    }
  };

  const handleToggleGalleryImage = (imgName: string) => {
    const dbKey = `db:${imgName}`;
    const currentImages = galleryInput
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    if (currentImages.includes(dbKey)) {
      const filtered = currentImages.filter((x) => x !== dbKey);
      setGalleryInput(filtered.join(", "));
    } else {
      currentImages.push(dbKey);
      setGalleryInput(currentImages.join(", "));
    }
  };

  const isSelectedInGallery = (imgName: string) => {
    const dbKey = `db:${imgName}`;
    const currentImages = galleryInput
      .split(",")
      .map((x) => x.trim());
    return currentImages.includes(dbKey);
  };

  const handleToggleGalleryBank = () => {
    const nextVal = !isGalleryBankOpen;
    setIsGalleryBankOpen(nextVal);
    if (nextVal) {
      loadLocalImages();
    }
  };

  // Category Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<Partial<ProjectCategory>>({
    name: "",
    nameEn: "",
    description: "",
    descriptionEn: "",
  });

  // Filters projects based on selected tab/area
  const filteredProjects = activeCategory === "all"
    ? projects
    : projects.filter((p) => p.categoryId === activeCategory);

  // --- Project Handlers ---
  const handleOpenProjectAdd = () => {
    setEditingProject(null);
    setProjectForm({
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
      blogPostId: "",
    });
    setTagsInput("");
    setGalleryInput("");
    setEditingLanguage(language);
    setIsGalleryBankOpen(false);
    setIsProjectModalOpen(true);
  };

  const handleOpenProjectEdit = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(proj);
    setProjectForm({ ...proj });
    setTagsInput(proj.tags.join(", "));
    setGalleryInput((proj.galleryImages || []).join(", "));
    setEditingLanguage(language);
    setIsGalleryBankOpen(false);
    setIsProjectModalOpen(true);
  };

  const handleDeleteProject = (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm(
      language === "en" ? "Delete Project" : "Excluir Projeto",
      language === "en" 
        ? "Are you sure you want to delete this project? This action cannot be undone." 
        : "Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.",
      () => {
        const updated = projects.filter((p) => p.id !== projId);
        onUpdateProjects(updated);
      },
      language === "en" ? "Cancel" : "Cancelar",
      "danger"
    );
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const galleryArray = galleryInput
      .split(",")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    const completeProject: Project = {
      id: editingProject?.id || `proj-${Date.now()}`,
      title: projectForm.title || "Novo Projeto",
      titleEn: projectForm.titleEn || "",
      description: projectForm.description || "",
      descriptionEn: projectForm.descriptionEn || "",
      categoryId: projectForm.categoryId || (categories[0]?.id || ""),
      tags: tagsArray,
      projectUrl: projectForm.projectUrl || undefined,
      githubUrl: projectForm.githubUrl || undefined,
      imageUrl: projectForm.imageUrl || undefined,
      detailedDescription: projectForm.detailedDescription || "",
      detailedDescriptionEn: projectForm.detailedDescriptionEn || "",
      scientificRelevance: projectForm.scientificRelevance || "",
      scientificRelevanceEn: projectForm.scientificRelevanceEn || "",
      galleryImages: galleryArray,
      featured: projectForm.featured || false,
      blogPostId: projectForm.blogPostId || undefined,
    };

    if (editingProject) {
      // Edit existing
      const updated = projects.map((p) => (p.id === editingProject.id ? completeProject : p));
      onUpdateProjects(updated);
    } else {
      // Add new
      onUpdateProjects([...projects, completeProject]);
    }
    setIsProjectModalOpen(false);
  };

  // --- Category Handlers ---
  const handleOpenCategoryAdd = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", nameEn: "", description: "", descriptionEn: "" });
    setEditingLanguage(language);
    setIsCategoryModalOpen(true);
  };

  const handleOpenCategoryEdit = (cat: ProjectCategory) => {
    setEditingCategory(cat);
    setCategoryForm({ ...cat });
    setEditingLanguage(language);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = (catId: string) => {
    const hasProjects = projects.some((p) => p.categoryId === catId);
    if (hasProjects) {
      triggerConfirm(
        language === "en" ? "Cannot Delete Area" : "Não é possível excluir a área",
        language === "en" 
          ? "This area has linked projects. Move or remove the projects before deleting the area." 
          : "Esta área possui projetos vinculados. Mova ou remova os projetos antes de excluir a área.",
        () => {},
        "",
        "warning"
      );
      return;
    }
    triggerConfirm(
      language === "en" ? "Delete Specialty Area" : "Excluir Área de Especialidade",
      language === "en" 
        ? "Are you sure you want to delete this specialty area? This action cannot be undone." 
        : "Deseja realmente excluir esta área de projetos? Esta ação não pode ser desfeita.",
      () => {
        const updated = categories.filter((c) => c.id !== catId);
        onUpdateCategories(updated);
        if (activeCategory === catId) {
          setActiveCategory("all");
        }
      },
      language === "en" ? "Cancel" : "Cancelar",
      "danger"
    );
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const completeCategory: ProjectCategory = {
      id: editingCategory?.id || `cat-${Date.now()}`,
      name: categoryForm.name || "Nova Área",
      nameEn: categoryForm.nameEn || "",
      description: categoryForm.description || undefined,
      descriptionEn: categoryForm.descriptionEn || undefined,
    };

    if (editingCategory) {
      const updated = categories.map((c) => (c.id === editingCategory.id ? completeCategory : c));
      onUpdateCategories(updated);
    } else {
      onUpdateCategories([...categories, completeCategory]);
    }
    setIsCategoryModalOpen(false);
  };

  return (
    <section className="mb-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-10 shadow-xs print-border print-shadow-none print-m-0 transition-colors duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-2.5 text-indigo-600 dark:text-indigo-400 print-border">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              {language === "en" ? "Projects by Specialty Area" : "Projetos por Área de Especialidade"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
              {language === "en" 
                ? "My main works organized by specialty areas. Click on projects to see detailed information and pictures." 
                : "Meus principais trabalhos organizados por áreas de atuação. Clique nos projetos para ver mais informações e fotos."}
            </p>
          </div>
        </div>

        {/* Admin Tools for Projects and Areas */}
        {isEditMode && (
          <div className="flex flex-wrap gap-2 no-print print:hidden">
            <button
              onClick={handleOpenCategoryAdd}
              className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
              id="add-category-btn"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              {language === "en" ? "Add Area (Section)" : "Adicionar Área (Seção)"}
            </button>
            <button
              onClick={handleOpenProjectAdd}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 cursor-pointer"
              id="add-project-btn"
            >
              <Plus className="h-4 w-4" />
              {language === "en" ? "Add Project" : "Adicionar Projeto"}
            </button>
          </div>
        )}
      </div>

      {/* Tabs / Filter Navigation */}
      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-4 no-print print:hidden">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === "all"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {language === "en" ? `All Projects (${projects.length})` : `Todos os Projetos (${projects.length})`}
          </button>
          {categories.map((cat) => {
            const count = projects.filter((p) => p.categoryId === cat.id).length;
            return (
              <div key={cat.id} className="relative flex items-center group">
                <button
                  onClick={() => setActiveCategory(cat.id)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {cat.nameEn && language === "en" ? cat.nameEn : cat.name} ({count})
                </button>

                {/* Edit Category actions inline in Edit Mode */}
                {isEditMode && (
                  <div className="hidden group-hover:flex absolute -top-2 -right-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full shadow-md px-1 py-0.5 items-center gap-1 z-10">
                    <button
                      onClick={() => handleOpenCategoryEdit(cat)}
                      className="p-1 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      title="Editar Área"
                    >
                      <Edit2 className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1 rounded-full text-rose-600 dark:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      title="Excluir Área"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Area Description Card */}
      {activeCategory !== "all" && (categories.find((c) => c.id === activeCategory)?.description || categories.find((c) => c.id === activeCategory)?.descriptionEn) && (
        <div className="mb-6 rounded-xl bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5 no-print print:hidden">
          <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{language === "en" ? "About this area: " : "Sobre esta área: "}</span>
            {language === "en" 
              ? (categories.find((c) => c.id === activeCategory)?.descriptionEn || categories.find((c) => c.id === activeCategory)?.description)
              : (categories.find((c) => c.id === activeCategory)?.description || categories.find((c) => c.id === activeCategory)?.descriptionEn)}
          </p>
        </div>
      )}

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center font-sans">
          <FolderKanban className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
            {language === "en" ? "No projects found in this area." : "Nenhum projeto encontrado nesta área."}
          </p>
          {isEditMode && (
            <button
              onClick={handleOpenProjectAdd}
              className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
            >
              {language === "en" ? "Add first project" : "Adicionar primeiro projeto"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-1 print:gap-4">
          {filteredProjects.map((proj) => {
            const cat = categories.find((c) => c.id === proj.categoryId);
            return (
              <article
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 shadow-xs transition-all hover:shadow-lg hover:border-slate-200 dark:hover:border-slate-700 hover:-translate-y-1 cursor-pointer print-border print-shadow-none print-translate-none print-break-inside-avoid duration-300"
              >
                {/* Project Image */}
                {proj.imageUrl && (
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-50 dark:bg-slate-950/30 print:hidden rounded-t-2xl">
                    <LocalImage
                      src={proj.imageUrl}
                      alt={proj.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-t-2xl"
                    />
                    {/* View overlay icon */}
                    <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="rounded-full bg-white/90 dark:bg-slate-900/90 p-2.5 shadow-sm text-slate-950 dark:text-white scale-90 group-hover:scale-100 transition-transform">
                        <Eye className="h-4.5 w-4.5" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Project Body */}
                <div className="flex flex-1 flex-col p-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                    {cat ? ((language === "en" && cat.nameEn) ? cat.nameEn : cat.name) : (language === "en" ? "Uncategorized" : "Sem Categoria")}
                  </span>

                  <h3 className="mt-1.5 text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-display leading-tight">
                    {(language === "en" && proj.titleEn) ? proj.titleEn : proj.title}
                  </h3>

                  <div className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3 font-sans print:line-clamp-none overflow-hidden">
                    <MarkdownRenderer content={(language === "en" && proj.descriptionEn) ? proj.descriptionEn : proj.description} className="text-xs text-slate-500 dark:text-slate-400 font-sans space-y-1" />
                  </div>

                  {/* Tags */}
                  {proj.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {proj.tags.slice(0, 4).map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:text-slate-400 font-mono"
                        >
                          {tag}
                        </span>
                      ))}
                      {proj.tags.length > 4 && (
                        <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:text-slate-500 font-mono">
                          +{proj.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions / Links */}
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/80 no-print print:hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1">
                        {language === "en" ? "View details" : "Ver detalhes"}
                      </span>
                      {proj.blogPostId && onNavigateToBlogPost && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToBlogPost(proj.blogPostId!);
                          }}
                          className="flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/60 dark:border-indigo-900/40 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer"
                          title="Ver explicação detalhada no Blog"
                        >
                          <BookOpen className="h-3 w-3" />
                          <span>{language === "en" ? "Blog Explanation" : "Explicação no Blog"}</span>
                        </button>
                      )}
                    </div>

                    {/* Edit controls for Project */}
                    {isEditMode && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleOpenProjectEdit(proj, e)}
                          className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Editar Projeto"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteProject(proj.id, e)}
                          className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Excluir Projeto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Print Links */}
                  <div className="hidden print:flex flex-col gap-1 mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                    {proj.projectUrl && <div><span className="font-semibold">Link:</span> {proj.projectUrl}</div>}
                    {proj.githubUrl && <div><span className="font-semibold">Código:</span> {proj.githubUrl}</div>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          category={categories.find((c) => c.id === selectedProject.categoryId)}
          onClose={() => setSelectedProject(null)}
          onNavigateToBlogPost={onNavigateToBlogPost}
          language={language}
        />
      )}

      {/* Project Form Modal */}
      <EditModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title={editingProject ? (language === "en" ? "Edit Project" : "Editar Projeto") : (language === "en" ? "Add New Project" : "Adicionar Novo Projeto")}
        size="2xl"
      >
        <form onSubmit={handleProjectSubmit} className="space-y-4">
          
          {/* Editing Language Toggle */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700 font-sans">
                {language === "en" ? "Language under Editing" : "Idioma em Edição"}
              </p>
              <p className="text-[10px] text-slate-400 font-sans">
                {language === "en" 
                  ? "Toggle to specify contents in Portuguese or English" 
                  : "Alterne para preencher as informações em Português ou Inglês"}
              </p>
            </div>
            <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1 self-start sm:self-auto shrink-0 font-sans">
              <button
                type="button"
                onClick={() => setEditingLanguage("pt")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  editingLanguage === "pt"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => setEditingLanguage("en")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  editingLanguage === "en"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {editingLanguage === "pt" ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Título do Projeto * (Português)
                </label>
                <input
                  type="text"
                  required
                  value={projectForm.title || ""}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Project Title * (English)
                </label>
                <input
                  type="text"
                  required
                  value={projectForm.titleEn || ""}
                  onChange={(e) => setProjectForm({ ...projectForm, titleEn: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "Area of Specialty (Category) *" : "Área de Atuação (Categoria) *"}
              </label>
              <select
                required
                value={projectForm.categoryId || ""}
                onChange={(e) => setProjectForm({ ...projectForm, categoryId: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {language === "en" && c.nameEn ? c.nameEn : c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
              {language === "en" ? "Associated Blog Article (Optional)" : "Artigo de Blog Associado (Opcional - Redirecionamento ao Clicar)"}
            </label>
            <select
              value={projectForm.blogPostId || ""}
              onChange={(e) => setProjectForm({ ...projectForm, blogPostId: e.target.value || undefined })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden bg-white"
            >
              <option value="">{language === "en" ? "-- No Linked Article --" : "-- Sem Artigo Vinculado --"}</option>
              {posts.map((post) => (
                <option key={post.id} value={post.id}>
                  {language === "en" && post.titleEn ? post.titleEn : post.title}
                </option>
              ))}
            </select>
          </div>

          {editingLanguage === "pt" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Resumo Curto * (Português) (Exibido no Card)
              </label>
              <input
                type="text"
                required
                value={projectForm.description || ""}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Short Summary * (English) (Displayed on Card)
              </label>
              <input
                type="text"
                required
                value={projectForm.descriptionEn || ""}
                onChange={(e) => setProjectForm({ ...projectForm, descriptionEn: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          )}

          {editingLanguage === "pt" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Descrição Longa / Detalhes de Abordagem Científica e Engenharia (Português)
              </label>
              <textarea
                rows={5}
                value={projectForm.detailedDescription || ""}
                onChange={(e) => setProjectForm({ ...projectForm, detailedDescription: e.target.value })}
                placeholder="Descreva detalhadamente a modelagem física, métodos experimentais, equações resolvidas e setup..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden resize-y"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Detailed Description / Scientific & Engineering Details (English)
              </label>
              <textarea
                rows={5}
                value={projectForm.detailedDescriptionEn || ""}
                onChange={(e) => setProjectForm({ ...projectForm, detailedDescriptionEn: e.target.value })}
                placeholder="Detail the physical modeling, experimental methods, equations solved, and setup in English..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden resize-y"
              />
            </div>
          )}

          {editingLanguage === "pt" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Relevância Científica & Aplicação Tecnológica (Opcional) (Português)
              </label>
              <textarea
                rows={3}
                value={projectForm.scientificRelevance || ""}
                onChange={(e) => setProjectForm({ ...projectForm, scientificRelevance: e.target.value })}
                placeholder="Ex: Como este projeto contribui para a ciência dos materiais, óptica integrada, criogenia, etc."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden resize-y"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Scientific Relevance & Technological Application (Optional) (English)
              </label>
              <textarea
                rows={3}
                value={projectForm.scientificRelevanceEn || ""}
                onChange={(e) => setProjectForm({ ...projectForm, scientificRelevanceEn: e.target.value })}
                placeholder="Ex: How this project contributes to materials science, integrated optics, cryogenics, etc."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden resize-y"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
              {language === "en" ? "Tags / Technologies (separated by comma)" : "Tags / Tecnologias (separadas por vírgula)"}
            </label>
            <input
              type="text"
              placeholder="React, Tailwind, Node.js, etc."
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "Demo / Publication URL (Active Link)" : "URL de Demonstração / Publicação (Link Ativo)"}
              </label>
              <input
                type="url"
                placeholder="https://meuprojeto.com"
                value={projectForm.projectUrl || ""}
                onChange={(e) => setProjectForm({ ...projectForm, projectUrl: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "Repository URL (GitHub / GitLab)" : "URL do Repositório (GitHub / GitLab)"}
              </label>
              <input
                type="text"
                placeholder="https://github.com/usuario/projeto"
                value={projectForm.githubUrl || ""}
                onChange={(e) => setProjectForm({ ...projectForm, githubUrl: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ImageSelectorInput
              label={language === "en" ? "Project Cover Image" : "Imagem de Capa do Projeto"}
              value={projectForm.imageUrl || ""}
              onChange={(val) => setProjectForm({ ...projectForm, imageUrl: val })}
              placeholder="https://images.unsplash.com/photo-..."
              id="project-imageUrl"
            />
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  {language === "en" ? "Gallery Images (comma separated)" : "Imagens da Galeria (separadas por vírgula)"}
                </label>
                <button
                  type="button"
                  onClick={handleToggleGalleryBank}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isGalleryBankOpen
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <ImageIcon className="h-3 w-3" />
                  <span>{language === "en" ? "Media Bank" : "Banco de Mídia"}</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="https://unsplash-url-1, db:foto.png, https://unsplash-url-2"
                value={galleryInput}
                onChange={(e) => setGalleryInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />

              {/* Multi-select Image Bank panel for the gallery */}
              {isGalleryBankOpen && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                      {language === "en" ? "Select from Media Bank (multiple)" : "Selecionar do Banco de Mídia (múltiplas)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => loadLocalImages()}
                      title="Atualizar"
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </div>

                  {isLoadingGalleryImages ? (
                    <div className="flex items-center justify-center py-4 text-xs font-mono text-slate-400 gap-1.5 bg-white border border-slate-100 rounded-lg">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                      <span>{language === "en" ? "Fetching files..." : "Buscando arquivos..."}</span>
                    </div>
                  ) : localImages.length === 0 ? (
                    <div className="p-3 rounded-lg border border-dashed border-slate-200 bg-white text-center">
                      <p className="text-[11px] font-medium text-slate-500">{language === "en" ? "No images in Media Bank." : "Nenhuma imagem no Banco de Mídia."}</p>
                      <p className="text-[9px] text-slate-400 leading-normal max-w-xs mx-auto mt-1">
                        {language === "en" ? "Use 'Image Bank' button in top menu to upload pictures first." : "Use o botão 'Banco de Imagens' no menu superior para enviar fotos primeiro."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-white border border-slate-100 rounded-lg">
                      {localImages.map((img) => {
                        const selected = isSelectedInGallery(img.name);
                        return (
                          <button
                            key={img.name}
                            type="button"
                            onClick={() => handleToggleGalleryImage(img.name)}
                            className={`group relative flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                              selected
                                ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="relative h-7 w-7 rounded bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-100 shrink-0">
                              <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
                            </div>
                            <span className="text-[10px] font-mono text-slate-700 truncate flex-1" title={img.name}>
                              {img.name}
                            </span>
                            {selected && (
                              <div className="absolute top-1 right-1 rounded-full bg-indigo-600 p-0.5 text-white">
                                <Check className="h-2 w-2" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {language === "en" ? "Cancel" : "Cancelar"}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
            >
              {language === "en" ? "Save Project" : "Salvar Projeto"}
            </button>
          </div>
        </form>
      </EditModal>

      {/* Category (Area) Form Modal */}
      <EditModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? (language === "en" ? "Edit Specialty Area" : "Editar Área de Especialidade") : (language === "en" ? "Add New Area" : "Adicionar Nova Área")}
      >
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          
          {/* Editing Language Toggle */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700 font-sans">
                {language === "en" ? "Language under Editing" : "Idioma em Edição"}
              </p>
              <p className="text-[10px] text-slate-400 font-sans">
                {language === "en" 
                  ? "Toggle to specify contents in Portuguese or English" 
                  : "Alterne para preencher as informações em Português ou Inglês"}
              </p>
            </div>
            <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1 self-start sm:self-auto shrink-0 font-sans">
              <button
                type="button"
                onClick={() => setEditingLanguage("pt")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  editingLanguage === "pt"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => setEditingLanguage("en")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  editingLanguage === "en"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {editingLanguage === "pt" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Nome da Área / Seção (Português) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Física Computacional, Instrumentação"
                value={categoryForm.name || ""}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Area / Section Name (English) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Computational Physics, Instrumentation"
                value={categoryForm.nameEn || ""}
                onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          )}

          {editingLanguage === "pt" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Descrição Curta (Opcional) (Português)
              </label>
              <textarea
                placeholder="Escreva uma breve descrição explicativa sobre seus trabalhos nesta área de especialidade..."
                rows={3}
                value={categoryForm.description || ""}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Short Description (Optional) (English)
              </label>
              <textarea
                placeholder="Write a brief explanatory description of your work in this area of specialty..."
                rows={3}
                value={categoryForm.descriptionEn || ""}
                onChange={(e) => setCategoryForm({ ...categoryForm, descriptionEn: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {language === "en" ? "Cancel" : "Cancelar"}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
            >
              {language === "en" ? "Save Area" : "Salvar Área"}
            </button>
          </div>
        </form>
      </EditModal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmCallback || (() => {})}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={confirmCancelText ? (language === "en" ? "Delete" : "Excluir") : (language === "en" ? "OK" : "Entendido")}
        cancelText={confirmCancelText}
        type={confirmType}
      />
    </section>
  );
}
