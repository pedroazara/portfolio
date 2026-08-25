import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { BlogPost, Project } from "../types";
import { 
  BookOpen, Calendar, Clock, Plus, Edit2, Trash2, X, FileText, 
  Tag, Image as ImageIcon, ArrowRight, User, Share2, Check,
  Code, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import MarkdownRenderer from "./MarkdownRenderer";
import { ReorderableList, mergeReorderedSubset } from "./Reorderable";
import LocalImage from "./LocalImage";
import ImageSelectorInput from "./ImageSelectorInput";
import ArticleContentEditor from "./ArticleContentEditor";
import { Language, translations } from "../lib/translations";
import { estimateReadTime } from "../utils/readTime";
import { findBySlug, slugOf } from "../utils/slug";

interface BlogSectionProps {
  posts: BlogPost[];
  projects?: Project[];
  isEditMode: boolean;
  onUpdatePosts: (updatedPosts: BlogPost[]) => void;
  authorName: string;
  selectedPostId?: string | null;
  onSelectPost?: (postId: string | null) => void;
  language?: Language;
  searchQuery?: string;
}

const CATEGORIES = [
  "Todos",
  "Física Computacional",
  "Instrumentação",
  "Ciência dos Materiais",
  "Geral & Divulgação"
];

export default function BlogSection({
  posts = [],
  projects = [],
  isEditMode,
  onUpdatePosts,
  authorName,
  selectedPostId,
  onSelectPost,
  language = "pt",
  searchQuery = "",
}: BlogSectionProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlCategory = searchParams.get("categoria") || "Todos";
  const [localSelectedPost, setLocalSelectedPost] = useState<BlogPost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => onConfirm);
    setConfirmOpen(true);
  };

  // Aceita tanto o `codigo` quanto o `id` no trecho da URL.
  const selectedPost = selectedPostId !== undefined
    ? findBySlug(posts, selectedPostId)
    : (localSelectedPost ? findBySlug(posts, localSelectedPost.id) : null);

  const setSelectedPost = (post: BlogPost | null) => {
    if (onSelectPost) {
      onSelectPost(post ? slugOf(post) : null);
    } else {
      setLocalSelectedPost(post);
    }
  };
  
  // Reset category filter when site language changes
  React.useEffect(() => {
    setSelectedCategory("Todos");
  }, [language]);

  // Create / Edit post form states

  // Helper to translate category label
  const displayCategoryName = (cat?: string) => {
    if (!cat) return "";
    if (cat === "Todos") return language === "en" ? "All" : "Todos";
    if (language === "pt") return cat;
    switch (cat) {
      case "Física Computacional": return "Computational Physics";
      case "Instrumentação": return "Instrumentation";
      case "Ciência dos Materiais": return "Materials Science";
      case "Geral & Divulgação": return "General & Outreach";
      default: return cat;
    }
  };

  // Criar e editar acontecem em página dedicada; aqui só navegamos até ela.
  const handleOpenAdd = () => {
    navigate("/admin/posts/novo");
  };

  const handleOpenEdit = (post: BlogPost, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/admin/posts/${encodeURIComponent(slugOf(post))}`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm(
      language === "en" ? "Delete Publication" : "Excluir Publicação",
      language === "en"
        ? "Are you sure you want to delete this blog post?"
        : "Deseja mesmo excluir esta publicação?",
      () => onUpdatePosts(posts.filter((p) => p.id !== id))
    );
  };

  const getPostCategoryDisplay = (p: BlogPost) => {
    if (language === "en") {
      return p.categoryEn || displayCategoryName(p.category);
    }
    return p.category || "";
  };

  // Dynamic filter categories (always include default suggestions + any custom ones existing in posts)
  const defaultCats = language === "en" 
    ? ["Computational Physics", "Instrumentation", "Materials Science", "General & Outreach"]
    : ["Física Computacional", "Instrumentação", "Ciência dos Materiais", "Geral & Divulgação"];

  const postsCategories = posts
    .map((p) => getPostCategoryDisplay(p))
    .filter((cat): cat is string => !!cat);

  const availableCategories = [
    "Todos",
    ...Array.from(new Set([...defaultCats, ...postsCategories].filter((c) => c !== "Todos" && c !== "All"))),
  ];

  // Filter posts
  const activeCategoryFilter = urlCategory !== "Todos" ? urlCategory : selectedCategory;
  const filteredPosts = posts.filter((post) => {
    // Hide drafts for public users if not in edit mode
    if (!isEditMode && post.draft) return false;

    // Search query matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (post.title || "").toLowerCase().includes(q) || (post.titleEn || "").toLowerCase().includes(q);
      const summaryMatch = (post.summary || "").toLowerCase().includes(q) || (post.summaryEn || "").toLowerCase().includes(q);
      const tagMatch = (post.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!titleMatch && !summaryMatch && !tagMatch) return false;
    }

    if (activeCategoryFilter === "Todos" || activeCategoryFilter === "All") return true;
    const postCat = getPostCategoryDisplay(post);
    return postCat.toLowerCase().trim() === activeCategoryFilter.toLowerCase().trim();
  });

  // Reordering only applies to the unfiltered "Todos" view — the featured
  // hero post (filteredPosts[0]) always stays fixed; dragging only reorders
  // the remaining articles among themselves.
  const canReorderPosts =
    isEditMode && (activeCategoryFilter === "Todos" || activeCategoryFilter === "All") && !searchQuery.trim();

  return (
    <div className="mt-16 border-t border-slate-100 dark:border-slate-800/80 pt-16 no-print print:hidden" id="blog-section">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <BookOpen className="h-4.5 w-4.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 font-mono">
              {language === "en" ? "Scientific Communication" : "Divulgação Científica"}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-black text-slate-900 tracking-tight font-display sm:text-3xl">
            {translations[language].blog}
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-sans">
            {language === "en"
              ? "Articles, research notes and reflections on Physics Engineering, instrumentation and computational science."
              : "Artigos, notas de pesquisa e pensamentos sobre Engenharia Física, instrumentação e física computacional."}
          </p>
        </div>

        {isEditMode && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 no-print print:hidden"
            id="add-post-btn"
          >
            <Plus className="h-4 w-4" />
            <span>{language === "en" ? "New Article" : "Novo Artigo"}</span>
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="mb-8 flex flex-wrap gap-2 border-b border-slate-200/50 dark:border-slate-800/80 pb-4">
        {availableCategories.map((cat, idx) => {
          const isActive = selectedCategory === cat || (selectedCategory === "Todos" && cat === "Todos");
          const displayLabel = cat === "Todos" ? (language === "en" ? "All" : "Todos") : cat;
          return (
            <button
              key={`blog-cat-${cat}-${idx}`}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm shadow-indigo-100 dark:shadow-none"
                  : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
          <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white font-display">
            {language === "en" ? "No articles found" : "Sem artigos publicados"}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-sans">
            {isEditMode 
              ? (language === "en" ? "Click 'New Article' to create your first post." : "Clique em 'Novo Artigo' para criar sua primeira publicação no blog.") 
              : (language === "en" ? "No publications available under this category." : "Nenhuma publicação disponível nesta seção.")}
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Featured Hero Article (First Post) */}
          {filteredPosts.length > 0 && (() => {
            const featuredPost = filteredPosts[0];
            const featTitle = (language === "en" ? featuredPost.titleEn : featuredPost.title) || featuredPost.title;
            const featSummary = (language === "en" ? featuredPost.summaryEn : featuredPost.summary) || featuredPost.summary;

            return (
              <article
                key={featuredPost.id}
                onClick={() => setSelectedPost(featuredPost)}
                className="group relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-indigo-400 dark:hover:border-indigo-700 cursor-pointer"
              >
                <div className={`grid grid-cols-1 items-stretch ${featuredPost.imageUrl ? "lg:grid-cols-12" : ""}`}>
                  {/* Capa — só ocupa a metade da peça quando existe. Sem capa,
                      a versão anterior ainda reservava até 480px de cinza vazio
                      com um ícone no meio: a estreia do blog, sem foto, abria
                      com um buraco. Sem imagem, o texto simplesmente toma a
                      largura toda, e o selo de destaque migra para a linha de
                      metadados abaixo. */}
                  {featuredPost.imageUrl && (
                    <div className="lg:col-span-7 relative overflow-hidden min-h-[300px] sm:min-h-[380px] lg:min-h-[480px] bg-slate-100 dark:bg-slate-950">
                      <LocalImage
                        src={featuredPost.imageUrl}
                        alt={featTitle}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent lg:hidden" />
                      <span className="absolute top-5 left-5 rounded-full bg-indigo-600 dark:bg-indigo-500 px-4 py-1.5 text-xs font-black text-white uppercase tracking-wider shadow-md">
                        {language === "en" ? "Featured Article" : "Artigo em Destaque"}
                      </span>
                    </div>
                  )}

                  {/* Content (5 columns on desktop, full width without a cover) */}
                  <div className={`p-8 sm:p-10 lg:p-12 flex flex-col justify-between ${featuredPost.imageUrl ? "lg:col-span-5" : ""}`}>
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-500 font-mono text-xs">
                        {!featuredPost.imageUrl && (
                          <span className="rounded-full bg-indigo-600 dark:bg-indigo-500 px-3 py-1 text-[11px] font-black text-white uppercase tracking-wider">
                            {language === "en" ? "Featured Article" : "Artigo em Destaque"}
                          </span>
                        )}
                        {getPostCategoryDisplay(featuredPost) && (
                          <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {getPostCategoryDisplay(featuredPost)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {featuredPost.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {featuredPost.readTime || estimateReadTime(featuredPost.content, language)}
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-display tracking-tight leading-tight">
                        {featTitle}
                      </h3>

                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans line-clamp-5">
                        {featSummary}
                      </p>

                      {featuredPost.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {featuredPost.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="rounded-full bg-slate-100 dark:bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 px-6 py-3 text-xs font-bold text-white shadow-md transition-all group-hover:bg-indigo-700">
                        <span>{language === "en" ? "Read full article" : "Ler artigo completo"}</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>

                      {isEditMode && (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleOpenEdit(featuredPost, e)}
                            className="rounded-xl p-2 text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Editar Artigo" aria-label="Editar Artigo"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(featuredPost.id, e)}
                            className="rounded-xl p-2 text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Excluir Artigo" aria-label="Excluir Artigo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })()}

          {/* Remaining Articles (Spacious 2-column wide portfolio grid) */}
          {filteredPosts.length > 1 && (
            <ReorderableList
              items={filteredPosts.slice(1)}
              isEditMode={canReorderPosts}
              onReorder={(newOrder) => onUpdatePosts(mergeReorderedSubset(posts, newOrder))}
              getKey={(post) => post.id}
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12"
            >
              {(post, dragHandle) => {
                const displayTitle = (language === "en" ? post.titleEn : post.title) || post.title;
                const displaySummary = (language === "en" ? post.summaryEn : post.summary) || post.summary;

                return (
                  <article
                    onClick={() => setSelectedPost(post)}
                    className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-indigo-300 dark:hover:border-indigo-800/80 cursor-pointer h-full"
                  >
                    {/* Alça de arrastar — só existe na aba "Todos", sem busca ativa. */}
                    {dragHandle && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-4 top-4 z-10 rounded-full bg-white/90 dark:bg-slate-900/90 p-1.5 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity"
                      >
                        {dragHandle}
                      </div>
                    )}

                    {/* Cover Image — sem capa, nada de placeholder cinza com
                        ícone: o selo de categoria migra para a linha de
                        metadados do corpo, e o cartão fica só texto. */}
                    {post.imageUrl && (
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-50 dark:bg-slate-950/30 shrink-0">
                        <LocalImage
                          src={post.imageUrl}
                          alt={displayTitle}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent" />
                        {getPostCategoryDisplay(post) && (
                          <span className="absolute top-4 left-4 rounded-full bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-xs px-3.5 py-1 text-xs font-bold text-white uppercase tracking-wider">
                            {getPostCategoryDisplay(post)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="flex-1 p-8 sm:p-10 lg:p-11 flex flex-col justify-between">
                      <div className="space-y-4">
                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-500 font-mono text-xs">
                          {!post.imageUrl && getPostCategoryDisplay(post) && (
                            <span className="rounded-full bg-slate-900 dark:bg-slate-100 px-3 py-1 text-[11px] font-bold text-white dark:text-slate-900 uppercase tracking-wider">
                              {getPostCategoryDisplay(post)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {post.date}
                          </span>
                          <span className="text-slate-200 dark:text-slate-800">•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {post.readTime || estimateReadTime(post.content, language)}
                          </span>
                          {post.draft && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              {language === "en" ? "Draft" : "Rascunho"}
                            </span>
                          )}
                        </div>

                        {/* Title & Summary */}
                        <div>
                          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-display tracking-tight leading-snug line-clamp-2">
                            {displayTitle}
                          </h3>
                          <p className="mt-3.5 text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-sans line-clamp-3">
                            {displaySummary}
                          </p>
                        </div>

                        {/* Tags */}
                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {post.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-indigo-50/70 dark:bg-indigo-950/40 px-3 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-sans"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                          {language === "en" ? "Read full article" : "Ler publicação integral"}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>

                        {/* Edit/Delete Actions */}
                        {isEditMode && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleOpenEdit(post, e)}
                              className="rounded-lg p-1.5 text-slate-500 dark:text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="Editar Artigo" aria-label="Editar Artigo"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(post.id, e)}
                              className="rounded-lg p-1.5 text-slate-500 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                              title="Excluir Artigo" aria-label="Excluir Artigo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              }}
            </ReorderableList>
          )}
        </div>
      )}

      {/* A leitura do artigo virou página dedicada (PostPage), roteada em App.
          O que sobra aqui é só a listagem. */}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmCallback || (() => {})}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={language === "en" ? "Delete" : "Excluir"}
        cancelText={language === "en" ? "Cancel" : "Cancelar"}
        type="danger"
      />
    </div>
  );
}
