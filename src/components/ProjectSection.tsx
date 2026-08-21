import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Project, ProjectCategory, BlogPost } from "../types";
import { FolderKanban, Plus, Edit2, Trash2, ExternalLink, Github, Settings, Info, Eye, BookOpen, Image as ImageIcon, Check, RefreshCw, Search, ArrowLeft } from "lucide-react";
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import { ReorderableList, mergeReorderedSubset } from "./Reorderable";
import LocalImage from "./LocalImage";
import MarkdownRenderer from "./MarkdownRenderer";
import { SECTION_CARD_CLASS } from "../lib/cardStyle";
import { Language, translations } from "../lib/translations";
import TranslateButton from "./TranslateButton";
import { autoTranslateFields } from "../lib/translator";
import { useLocalePath } from "../lib/routes";
import { slugOf } from "../utils/slug";

interface ProjectSectionProps {
  projects: Project[];
  categories: ProjectCategory[];
  isEditMode: boolean;
  onUpdateProjects: (updatedProjects: Project[]) => void;
  onUpdateCategories: (updatedCategories: ProjectCategory[]) => void;
  posts?: BlogPost[];
  onNavigateToBlogPost?: (postId: string) => void;
  language?: Language;
  selectedProjectId?: string | null;
  onSelectProject?: (projectId: string | null) => void;
  isStandalonePage?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
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
  selectedProjectId,
  onSelectProject,
  isStandalonePage = false,
  searchQuery = "",
  onSearchChange,
}: ProjectSectionProps) {
  const navigate = useNavigate();
  const lp = useLocalePath();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [localSearch, setLocalSearch] = useState(searchQuery);
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

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

  // Category Modal States
  // `editingLanguage` alterna entre os campos PT e EN da categoria em edição.
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<Partial<ProjectCategory>>({
    name: "",
    nameEn: "",
    description: "",
    descriptionEn: "",
  });

  // Filters projects based on selected tab/area and search query
  // Rascunhos ficam visíveis só para o admin no modo de edição. Os contadores
  // das abas contam a partir desta lista, e não de `projects`, para não anunciar
  // "5 projetos" a um visitante que enxerga 2 cartões.
  const visibleProjects = projects.filter((p) => isEditMode || !p.draft);

  const filteredProjects = visibleProjects.filter((p) => {
    if (activeCategory !== "all") {
      const pCatIds = p.categoryIds && p.categoryIds.length > 0 ? p.categoryIds : (p.categoryId ? [p.categoryId] : []);
      if (!pCatIds.includes(activeCategory)) {
        return false;
      }
    }
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase().trim();
      const titleMatch = (p.title || "").toLowerCase().includes(q) || (p.titleEn || "").toLowerCase().includes(q);
      const descMatch = (p.description || "").toLowerCase().includes(q) || (p.descriptionEn || "").toLowerCase().includes(q);
      const tagMatch = (p.tags || []).some((t) => t.toLowerCase().includes(q));
      const relMatch = (p.scientificRelevance || "").toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !tagMatch && !relMatch) return false;
    }
    return true;
  });

  // Reordering only makes sense against the full, unfiltered list — with a
  // category tab or search active, dragging within that subset would shuffle
  // items relative to ones the admin can't currently see.
  const canReorderProjects = isEditMode && activeCategory === "all" && !localSearch.trim();

  // --- Project Handlers ---
  // A edição acontece em página dedicada (/admin/projetos/...), onde cabe também
  // a galeria que sobe imagens direto para a pasta do projeto no Storage.
  const handleOpenProjectAdd = () => {
    navigate("/admin/projetos/novo");
  };

  const handleOpenProjectEdit = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/admin/projetos/${encodeURIComponent(slugOf(proj))}`);
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

  const handleAutoTranslateCategory = async () => {
    await autoTranslateFields(
      {
        nameEn: categoryForm.name || "",
        descriptionEn: categoryForm.description || "",
      },
      setCategoryForm
    );

    setEditingLanguage("en");
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
    <section id="projetos" className={`mb-8 ${SECTION_CARD_CLASS}`}>
      {/* Standalone Page Top Header */}
      {isStandalonePage && (
        <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-6 no-print print:hidden">
          <Link
            to={lp("/curriculo")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-4 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{language === "en" ? "Back to résumé" : "Voltar ao currículo"}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-display">
            {language === "en" ? "Projects" : "Projetos"}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-sans">
            {language === "en"
              ? "My main works organized by specialty areas."
              : "Meus principais trabalhos organizados por áreas de atuação."}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        {/* Na página dedicada o cabeçalho acima já diz isto; repetir aqui só
            duplicaria o mesmo texto duas vezes na mesma tela. */}
        {isStandalonePage ? (
          <span />
        ) : (
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-2.5 text-indigo-600 dark:text-indigo-400 print-border">
              <FolderKanban className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                {language === "en" ? "Projects" : "Projetos"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                {language === "en"
                  ? "My main works organized by specialty areas."
                  : "Meus principais trabalhos organizados por áreas de atuação."}
              </p>
            </div>
          </div>
        )}

        {/* Search & Admin Controls */}
        <div className="flex flex-wrap items-center gap-2.5 no-print print:hidden">
          {/* Quick Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={handleSearchInputChange}
              placeholder={language === "en" ? "Search projects..." : "Buscar projetos..."}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Admin Tools for Projects and Areas */}
          {isEditMode && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleOpenCategoryAdd}
                className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
                id="add-category-btn"
              >
                <Settings className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                {language === "en" ? "Add Area" : "Adicionar Área"}
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
            {language === "en" ? `All Projects (${visibleProjects.length})` : `Todos os Projetos (${visibleProjects.length})`}
          </button>
          {categories.map((cat) => {
            const count = visibleProjects.filter((p) => {
              const pCatIds = p.categoryIds && p.categoryIds.length > 0 ? p.categoryIds : (p.categoryId ? [p.categoryId] : []);
              return pCatIds.includes(cat.id);
            }).length;
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
        <ReorderableList
          items={filteredProjects}
          isEditMode={canReorderProjects}
          onReorder={(newOrder) => onUpdateProjects(mergeReorderedSubset(projects, newOrder))}
          getKey={(proj) => proj.id}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-1 print:gap-4"
        >
          {(proj, dragHandle) => {
            const projCatIds = proj.categoryIds && proj.categoryIds.length > 0
              ? proj.categoryIds
              : (proj.categoryId ? [proj.categoryId] : []);
            const projCategories = categories.filter((c) => projCatIds.includes(c.id));
            return (
              <article
                onClick={() => {
                  if (onSelectProject) {
                    onSelectProject(slugOf(proj));
                  } else {
                    navigate(lp(`/projetos/${encodeURIComponent(slugOf(proj))}`));
                  }
                }}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 shadow-xs transition-all hover:shadow-lg hover:border-slate-200 dark:hover:border-slate-700 hover:-translate-y-1 cursor-pointer print-border print-shadow-none print-translate-none print-break-inside-avoid duration-300"
              >
                {/* Alça de arrastar — só existe quando a lista está reordenável
                    (aba "Todos", sem busca ativa). */}
                {dragHandle && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-3 top-3 z-10 rounded-full bg-white/90 dark:bg-slate-900/90 p-1.5 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity no-print"
                  >
                    {dragHandle}
                  </div>
                )}

                {/* Marca de rascunho — só aparece porque o filtro acima já
                    escondeu estes cartões de quem não está editando. */}
                {proj.draft && (
                  <div className="absolute right-3 top-3 z-10 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 shadow-sm dark:bg-amber-950/80 dark:text-amber-300 no-print">
                    {language === "en" ? "Draft" : "Rascunho"}
                  </div>
                )}

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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {projCategories.length > 0 ? (
                        projCategories.map((c) => (
                          <span
                            key={`card-cat-${proj.id}-${c.id}`}
                            className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 rounded-md px-1.5 py-0.5"
                          >
                            {(language === "en" && c.nameEn) ? c.nameEn : c.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                          {language === "en" ? "Uncategorized" : "Sem Categoria"}
                        </span>
                      )}
                    </div>

                    {(proj.emAndamento || proj.status === "Em andamento" || proj.status === "em_andamento" || proj.status === "In Progress") && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {language === "en" ? "In Progress" : "Em Andamento"}
                      </span>
                    )}
                  </div>

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
                          key={`proj-card-tag-${proj.id}-${idx}`}
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
                        {language === "en" ? "View full post" : "Ler post completo"}
                      </span>
                    </div>

                    {/* Edit controls for Project */}
                    {isEditMode && (
                      <div className="flex items-center gap-1.5">
                        {/* Toggle Featured Star Button */}
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
          }}
        </ReorderableList>
      )}

      {/* Os detalhes do projeto são uma página (/project/<slug>), não um modal. */}

      {/* A edição acontece em /admin/projetos/<slug>, não mais aqui. */}


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
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0 font-sans">
              <TranslateButton
                onTranslate={handleAutoTranslateCategory}
                label={language === "en" ? "Auto-Translate PT → EN" : "Traduzir PT → EN (Gemini AI)"}
                size="sm"
              />
              <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1">
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
