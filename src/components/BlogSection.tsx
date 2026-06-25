import React, { useState } from "react";
import { BlogPost } from "../types";
import { 
  BookOpen, Calendar, Clock, Plus, Edit2, Trash2, X, FileText, 
  Tag, Image as ImageIcon, ArrowRight, User
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import MarkdownRenderer from "./MarkdownRenderer";
import LocalImage from "./LocalImage";
import ImageSelectorInput from "./ImageSelectorInput";
import { Language, translations } from "../lib/translations";

interface BlogSectionProps {
  posts: BlogPost[];
  isEditMode: boolean;
  onUpdatePosts: (updatedPosts: BlogPost[]) => void;
  authorName: string;
  selectedPostId?: string | null;
  onSelectPost?: (postId: string | null) => void;
  language?: Language;
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
  isEditMode,
  onUpdatePosts,
  authorName,
  selectedPostId,
  onSelectPost,
  language = "pt",
}: BlogSectionProps) {
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
  
  const selectedPost = selectedPostId !== undefined 
    ? (posts.find((p) => p.id === selectedPostId) || null)
    : (localSelectedPost ? (posts.find((p) => p.id === localSelectedPost.id) || null) : null);

  const setSelectedPost = (post: BlogPost | null) => {
    if (onSelectPost) {
      onSelectPost(post ? post.id : null);
    } else {
      setLocalSelectedPost(post);
    }
  };
  
  // Reset category filter when site language changes
  React.useEffect(() => {
    setSelectedCategory("Todos");
  }, [language]);

  // Create / Edit post form states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");
  const [postForm, setPostForm] = useState<Partial<BlogPost>>({
    title: "",
    titleEn: "",
    summary: "",
    summaryEn: "",
    content: "",
    contentEn: "",
    tags: [],
    imageUrl: "",
    readTime: "",
    date: "",
    category: "Instrumentação",
    categoryEn: "Instrumentation"
  });
  const [tagsInput, setTagsInput] = useState("");

  const handleOpenAdd = () => {
    setEditingPost(null);
    setPostForm({
      title: "",
      titleEn: "",
      summary: "",
      summaryEn: "",
      content: "",
      contentEn: "",
      tags: [],
      imageUrl: "",
      readTime: "5 min",
      date: new Date().toISOString().split("T")[0],
      category: "Instrumentação",
      categoryEn: "Instrumentation"
    });
    setTagsInput("");
    setEditingLanguage(language);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (post: BlogPost, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPost(post);
    setPostForm({ ...post });
    setTagsInput(post.tags.join(", "));
    setEditingLanguage(language);
    setIsFormModalOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmTitle = language === "en" ? "Delete Publication" : "Excluir Publicação";
    const confirmMsg = language === "en" 
      ? "Are you sure you want to delete this blog post?" 
      : "Deseja mesmo excluir esta publicação?";
    
    triggerConfirm(confirmTitle, confirmMsg, () => {
      const updated = posts.filter((p) => p.id !== id);
      onUpdatePosts(updated);
      if (selectedPost?.id === id) {
        setSelectedPost(null);
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const tagsArray = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const completePost: BlogPost = {
      id: editingPost?.id || `post-${Date.now()}`,
      title: postForm.title || "Publicação Sem Título",
      titleEn: postForm.titleEn || "",
      summary: postForm.summary || "",
      summaryEn: postForm.summaryEn || "",
      content: postForm.content || "",
      contentEn: postForm.contentEn || "",
      date: postForm.date || new Date().toISOString().split("T")[0],
      tags: tagsArray,
      imageUrl: postForm.imageUrl || undefined,
      readTime: postForm.readTime || "5 min read",
      category: postForm.category || "Instrumentação",
      categoryEn: postForm.categoryEn || "Instrumentation"
    };

    let updatedPosts: BlogPost[];
    if (editingPost) {
      updatedPosts = posts.map((p) => (p.id === editingPost.id ? completePost : p));
    } else {
      updatedPosts = [completePost, ...posts];
    }

    onUpdatePosts(updatedPosts);
    setIsFormModalOpen(false);
  };

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

  const availableCategories = ["Todos", ...Array.from(new Set([...defaultCats, ...postsCategories]))];

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    if (selectedCategory === "Todos" || selectedCategory === "All") return true;
    const postCat = getPostCategoryDisplay(post);
    return postCat.toLowerCase().trim() === selectedCategory.toLowerCase().trim();
  });

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
        {availableCategories.map((cat) => {
          const isActive = selectedCategory === cat || (selectedCategory === "Todos" && cat === "Todos");
          const displayLabel = cat === "Todos" ? (language === "en" ? "All" : "Todos") : cat;
          return (
            <button
              key={cat}
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
        /* Normal sized cards in a clean responsive grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => {
            const displayTitle = (language === "en" ? post.titleEn : post.title) || post.title;
            const displaySummary = (language === "en" ? post.summaryEn : post.summary) || post.summary;

            return (
              <article
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-slate-200/80 dark:hover:border-slate-700 cursor-pointer h-full"
              >
                {/* Cover Image */}
                {post.imageUrl ? (
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-50 dark:bg-slate-950/30 shrink-0 rounded-t-2xl">
                    <LocalImage
                      src={post.imageUrl}
                      alt={displayTitle}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] rounded-t-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/15 to-transparent" />
                    {getPostCategoryDisplay(post) && (
                      <span className="absolute top-3 left-3 rounded-full bg-slate-900/70 dark:bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                        {getPostCategoryDisplay(post)}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-950/30 shrink-0 flex items-center justify-center text-slate-400 dark:text-slate-500 rounded-t-2xl">
                    <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                    {getPostCategoryDisplay(post) && (
                      <span className="absolute top-3 left-3 rounded-full bg-slate-900/70 dark:bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                        {getPostCategoryDisplay(post)}
                      </span>
                    )}
                  </div>
                )}

                {/* Card Body */}
                <div className="flex-1 p-6 sm:p-7 md:p-8 flex flex-col justify-between">
                  <div className="space-y-5">
                    {/* Meta */}
                    <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {post.date}
                      </span>
                      <span className="text-slate-200 dark:text-slate-800">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {post.readTime || "5 min read"}
                      </span>
                    </div>

                    {/* Title & Summary */}
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-display tracking-tight leading-snug line-clamp-2">
                        {displayTitle}
                      </h3>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans line-clamp-3">
                        {displaySummary}
                      </p>
                    </div>

                    {/* Tags */}
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {post.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-indigo-50/60 dark:bg-indigo-950/40 px-2.5 py-0.5 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 font-sans"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                      {language === "en" ? "Read full article" : "Ler publicação integral"}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>

                    {/* Edit/Delete Actions */}
                    {isEditMode && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleOpenEdit(post, e)}
                          className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="Editar Artigo"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(post.id, e)}
                          className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Excluir Artigo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* --- Immersive Large Article Reading Drawer/Modal --- */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPost(null)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
            />

            <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100"
              >
                {/* Header Actions */}
                <div className="absolute right-4 top-4 z-10 flex gap-2">
                  {isEditMode && selectedPost && (
                    <button
                      onClick={(e) => handleOpenEdit(selectedPost, e)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/40 text-white backdrop-blur-xs transition-all hover:bg-indigo-600 hover:scale-105"
                      title="Editar Artigo"
                    >
                      <Edit2 className="h-4.5 w-4.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/40 text-white backdrop-blur-xs transition-colors hover:bg-slate-950/85"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Banner Cover Image */}
                {selectedPost.imageUrl && (
                  <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-slate-100">
                    <LocalImage
                      src={selectedPost.imageUrl}
                      alt={(language === "en" ? selectedPost.titleEn : selectedPost.title) || selectedPost.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                  </div>
                )}

                {/* Article Contents */}
                <div className="p-6 sm:p-10 md:p-12 max-h-[65vh] overflow-y-auto">
                  {/* Category/Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4 items-center">
                    {getPostCategoryDisplay(selectedPost) && (
                      <span className="rounded-full bg-indigo-600 px-3.5 py-1 text-[11px] font-bold text-white font-sans uppercase tracking-wider">
                        {getPostCategoryDisplay(selectedPost)}
                      </span>
                    )}
                    {selectedPost.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 font-sans"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight font-display leading-tight">
                    {(language === "en" ? selectedPost.titleEn : selectedPost.title) || selectedPost.title}
                  </h2>

                  {/* Author / Date Info */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-5 text-slate-400 font-mono text-xs">
                    <span className="flex items-center gap-1.5 font-sans font-semibold text-slate-700">
                      <div className="h-6 w-6 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                        <User className="h-3 w-3" />
                      </div>
                      {authorName}
                    </span>
                    <span className="text-slate-200 hidden sm:inline">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {selectedPost.date}
                    </span>
                    <span className="text-slate-200">•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {selectedPost.readTime || "5 min read"}
                    </span>
                  </div>

                  {/* Article Markdown/HTML Body Rendering */}
                  <div className="mt-8 prose max-w-none text-slate-800">
                    <MarkdownRenderer 
                      content={(language === "en" ? selectedPost.contentEn : selectedPost.content) || selectedPost.content} 
                    />
                  </div>
                </div>

                {/* Footer Modal Action */}
                <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-mono">
                    © {new Date().getFullYear()} {authorName}
                  </span>
                  <div className="flex gap-2">
                    {isEditMode && selectedPost && (
                      <button
                        onClick={(e) => handleOpenEdit(selectedPost, e)}
                        className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all active:scale-95"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>{language === "en" ? "Edit Article" : "Editar Artigo"}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedPost(null)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      {language === "en" ? "Close Reading" : "Fechar Leitura"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Article Editor Modal --- */}
      <EditModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingPost ? (language === "en" ? "Edit Article" : "Editar Artigo") : (language === "en" ? "Create New Article" : "Criar Novo Artigo")}
        size="3xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Editing Language Toggle */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

          {/* Bilingual fields section */}
          {editingLanguage === "pt" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Título do Artigo (Português) *
                </label>
                <input
                  type="text"
                  required
                  value={postForm.title || ""}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  placeholder="Ex: Explorando Redes de Difração com CCD Linear"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Categoria do Artigo (Português) *
                </label>
                <input
                  type="text"
                  required
                  value={postForm.category || ""}
                  onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
                  placeholder="Ex: Instrumentação, Física Computacional, Ciência dos Materiais"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
                  list="blog-categories-pt"
                />
                <datalist id="blog-categories-pt">
                  <option value="Física Computacional" />
                  <option value="Instrumentação" />
                  <option value="Ciência dos Materiais" />
                  <option value="Geral & Divulgação" />
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Resumo Breve (Português) * (Para exibição no card do blog)
                </label>
                <input
                  type="text"
                  required
                  value={postForm.summary || ""}
                  onChange={(e) => setPostForm({ ...postForm, summary: e.target.value })}
                  placeholder="Descreva brevemente o assunto do artigo em português..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Conteúdo Completo do Artigo (Português) *
                </label>
                <div className="text-[10px] text-slate-400 font-sans mb-1">
                  Suporta LaTeX ($$equação$$ ou $equação$), títulos com ##, código com ``` e listas.
                </div>
                <textarea
                  required
                  rows={10}
                  value={postForm.content || ""}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  placeholder="Escreva o conteúdo integral do artigo em português..."
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans resize-y"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Article Title (English) *
                </label>
                <input
                  type="text"
                  required
                  value={postForm.titleEn || ""}
                  onChange={(e) => setPostForm({ ...postForm, titleEn: e.target.value })}
                  placeholder="Ex: Exploring Diffraction Gratings with Linear CCDs"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Article Category (English) *
                </label>
                <input
                  type="text"
                  required
                  value={postForm.categoryEn || ""}
                  onChange={(e) => setPostForm({ ...postForm, categoryEn: e.target.value })}
                  placeholder="Ex: Instrumentation, Computational Physics, Materials Science"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
                  list="blog-categories-en"
                />
                <datalist id="blog-categories-en">
                  <option value="Computational Physics" />
                  <option value="Instrumentation" />
                  <option value="Materials Science" />
                  <option value="General & Outreach" />
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Short Summary (English) * (For blog card display)
                </label>
                <input
                  type="text"
                  required
                  value={postForm.summaryEn || ""}
                  onChange={(e) => setPostForm({ ...postForm, summaryEn: e.target.value })}
                  placeholder="Describe briefly the topic of the article in English..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Full Article Content (English) *
                </label>
                <div className="text-[10px] text-slate-400 font-sans mb-1">
                  Supports LaTeX ($$equation$$ or $equation$), headings with ##, code with ``` and lists.
                </div>
                <textarea
                  required
                  rows={10}
                  value={postForm.contentEn || ""}
                  onChange={(e) => setPostForm({ ...postForm, contentEn: e.target.value })}
                  placeholder="Write the full content of the article in English..."
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans resize-y"
                />
              </div>
            </div>
          )}

          {/* Universal fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "Tags (comma separated)" : "Tags (separadas por vírgula)"}
              </label>
              <input
                type="text"
                placeholder="Óptica, Python, Semicondutores"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
              />
            </div>

            <div>
              <ImageSelectorInput
                label={language === "en" ? "Article Cover Image" : "Imagem de Capa do Artigo"}
                value={postForm.imageUrl || ""}
                onChange={(val) => setPostForm({ ...postForm, imageUrl: val })}
                placeholder="https://images.unsplash.com/photo-..."
                id="blog-imageUrl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "Publication Date" : "Data de Publicação"}
              </label>
              <input
                type="date"
                required
                value={postForm.date || ""}
                onChange={(e) => setPostForm({ ...postForm, date: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "Reading Time" : "Tempo de Leitura"}
              </label>
              <input
                type="text"
                placeholder="Ex: 5 min read"
                value={postForm.readTime || ""}
                onChange={(e) => setPostForm({ ...postForm, readTime: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {language === "en" ? "Cancel" : "Cancelar"}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              {language === "en" ? "Publish Article" : "Publicar Artigo"}
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
        confirmText={language === "en" ? "Delete" : "Excluir"}
        cancelText={language === "en" ? "Cancel" : "Cancelar"}
        type="danger"
      />
    </div>
  );
}
