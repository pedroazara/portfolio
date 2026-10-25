import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BlogPost, Project } from "../types";
import { Plus, FileText, Rss } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ConfirmModal from "./ConfirmModal";
import { ReorderableList, mergeReorderedSubset } from "./Reorderable";
import BlogCard from "./BlogCard";
import { Language } from "../lib/translations";
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

  // Reordering only applies to the unfiltered "Todos" view.
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

  const isEn = language === "en";

  return (
    <div className="mx-auto max-w-[42rem] no-print print:hidden" id="blog-section">
      {/* Apresentação do blog: nome, uma frase sobre o que se escreve aqui. */}
      <header className="pt-6 pb-10 sm:pt-12">
        <h1 className="font-serif text-4xl font-bold tracking-tight text-tinta sm:text-5xl">
          {isEn ? "Notes" : "Notas"}
        </h1>
        <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-tinta-suave sm:text-xl">
          {isEn
            ? "Writing on science, technology, what I've been studying and other ideas worth putting down."
            : "Textos sobre ciência, tecnologia, o que ando estudando e outras ideias que valem ser escritas."}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
          <a
            href="/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-tinta-fraca underline-offset-4 transition-colors hover:text-tinta hover:underline"
          >
            <Rss className="h-3.5 w-3.5" aria-hidden="true" />
            {isEn ? "Subscribe via RSS" : "Assinar via RSS"}
          </a>

          {isEditMode && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-lg bg-acento-solido px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-acento-solido-hover"
              id="add-post-btn"
            >
              <Plus className="h-4 w-4" />
              <span>{isEn ? "New Article" : "Novo Artigo"}</span>
            </button>
          )}
        </div>
      </header>

      {/* Assuntos: links de texto, não pílulas. */}
      <nav aria-label={isEn ? "Topics" : "Assuntos"} className="flex flex-wrap gap-x-5 gap-y-2 border-b border-borda pb-3 text-sm">
        {availableCategories.map((cat, idx) => {
          const isActive = selectedCategory === cat;
          const displayLabel = cat === "Todos" ? (isEn ? "All" : "Todos") : cat;
          return (
            <button
              key={`blog-cat-${cat}-${idx}`}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              aria-pressed={isActive}
              className={`cursor-pointer underline-offset-[6px] transition-colors ${
                isActive ? "font-semibold text-tinta underline decoration-2 decoration-acento" : "text-tinta-fraca hover:text-tinta"
              }`}
            >
              {displayLabel}
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
      <motion.div
        key={feedKey}
        initial={feedInitial}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
      {filteredPosts.length === 0 ? (
        <div className="py-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-tinta-fraca" aria-hidden="true" />
          <h2 className="mt-4 font-serif text-lg font-bold text-tinta">
            {isEn ? "No articles found" : "Sem artigos publicados"}
          </h2>
          <p className="mt-1 text-sm text-tinta-suave">
            {isEditMode
              ? (isEn ? "Click 'New Article' to create your first post." : "Clique em 'Novo Artigo' para criar sua primeira publicação no blog.")
              : (isEn ? "No publications available under this category." : "Nenhuma publicação disponível nesta seção.")}
          </p>
        </div>
      ) : (
        <ReorderableList
          items={filteredPosts}
          isEditMode={canReorderPosts}
          onReorder={newOrder => onUpdatePosts(mergeReorderedSubset(posts, newOrder))}
          getKey={post => post.id}
          className="divide-y divide-borda"
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
