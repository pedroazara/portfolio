import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BlogPost, Project } from "../types";
import {
  BookOpen, Plus, FileText, Rss
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ConfirmModal from "./ConfirmModal";
import { ReorderableList, mergeReorderedSubset } from "./Reorderable";
import BlogCard from "./BlogCard";
import { Language, translations } from "../lib/translations";
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

  // A listagem anima ao trocar de aba/busca, mas não na primeira renderização —
  // sem isso, o feed inteiro "nascia" deslizando de baixo para cima assim que
  // a página abria, o que parecia um soluço de carregamento, não uma transição.
  //
  // Isso precisa ser estado, não uma ref mutada durante o render: em
  // StrictMode (ativo em `main.tsx`) o React chama a função do componente duas
  // vezes por montagem, e uma ref já viraria `false` na primeira chamada —
  // fazendo a renderização que de fato vai para a tela pensar que não é mais a
  // primeira. Estado não sofre disso, porque não é alterado durante o render.
  const [hasAnimatedFeedOnce, setHasAnimatedFeedOnce] = useState(false);
  React.useEffect(() => {
    setHasAnimatedFeedOnce(true);
  }, []);
  const feedKey = `${activeCategoryFilter}-${searchQuery.trim()}`;
  const feedInitial = hasAnimatedFeedOnce ? { opacity: 0, y: 8 } : false;

  return (
    <div className="mt-16 border-t border-slate-100 dark:border-slate-800/80 pt-16 no-print print:hidden" id="blog-section">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="h-4.5 w-4.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-mono">
              {language === "en" ? "Scientific Communication" : "Divulgação Científica"}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display sm:text-3xl">
            {translations[language].blog}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-sans">
            {language === "en"
              ? "Articles, research notes and reflections on Physics Engineering, instrumentation and computational science."
              : "Artigos, notas de pesquisa e pensamentos sobre Engenharia Física, instrumentação e física computacional."}
          </p>
        </div>

        <div className="flex items-center gap-2 no-print print:hidden">
          <a
            href="/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            title={language === "en" ? "Subscribe via RSS" : "Assinar via RSS"}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-orange-300 hover:text-orange-500 dark:border-slate-800 dark:text-slate-400 dark:hover:border-orange-800 dark:hover:text-orange-400"
          >
            <Rss className="h-3.5 w-3.5" />
            <span>RSS</span>
          </a>

          {isEditMode && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
              id="add-post-btn"
            >
              <Plus className="h-4 w-4" />
              <span>{language === "en" ? "New Article" : "Novo Artigo"}</span>
            </button>
          )}
        </div>
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
              className={`relative rounded-full px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                isActive
                  ? "text-white"
                  : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="blog-tab-pill"
                  className="absolute inset-0 rounded-full bg-indigo-600 dark:bg-indigo-500 shadow-sm shadow-indigo-100 dark:shadow-none"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative">{displayLabel}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
      <motion.div
        key={feedKey}
        initial={feedInitial}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
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
        <div className="space-y-6">
          <BlogCard
            post={filteredPosts[0]}
            category={getPostCategoryDisplay(filteredPosts[0])}
            language={language}
            featured
            isEditMode={isEditMode}
            onOpen={onSelectPost ? () => setSelectedPost(filteredPosts[0]) : undefined}
            onEdit={event => handleOpenEdit(filteredPosts[0], event)}
            onDelete={event => handleDelete(filteredPosts[0].id, event)}
          />
          {filteredPosts.length > 1 && (
            <ReorderableList
              items={filteredPosts.slice(1)}
              isEditMode={canReorderPosts}
              onReorder={newOrder => onUpdatePosts(mergeReorderedSubset(posts, newOrder))}
              getKey={post => post.id}
              className="grid grid-cols-1 items-start gap-6 md:grid-cols-2"
              itemClassName="min-w-0"
            >
              {(post, dragHandle) => (
                <BlogCard
                  post={post}
                  category={getPostCategoryDisplay(post)}
                  language={language}
                  isEditMode={isEditMode}
                  dragHandle={dragHandle}
                  onOpen={onSelectPost ? () => setSelectedPost(post) : undefined}
                  onEdit={event => handleOpenEdit(post, event)}
                  onDelete={event => handleDelete(post.id, event)}
                />
              )}
            </ReorderableList>
          )}
        </div>
      )}
      </motion.div>
      </AnimatePresence>

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
