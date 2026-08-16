import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Calendar, Clock, Share2, Check, Edit2, Code, AlertCircle, FileText,
} from "lucide-react";
import { BlogPost, Project } from "../types";
import { Language } from "../lib/translations";
import { findBySlug, slugOf } from "../utils/slug";
import { estimateReadTime } from "../utils/readTime";
import MarkdownRenderer from "../components/MarkdownRenderer";
import LocalImage from "../components/LocalImage";
import { COVER_ASPECT_CLASS } from "../lib/coverAspect";
import { useLocalePath } from "../lib/routes";

interface PostPageProps {
  /** Trecho da URL: o `codigo` ou `id` do artigo. */
  slug: string;
  posts: BlogPost[];
  projects: Project[];
  authorName: string;
  isEditMode: boolean;
  language: Language;
}

export default function PostPage({
  slug,
  posts,
  projects,
  authorName,
  isEditMode,
  language,
}: PostPageProps) {
  const navigate = useNavigate();
  const lp = useLocalePath();
  const [copiedLink, setCopiedLink] = useState(false);

  const post = findBySlug(posts, slug);

  // Toda troca de artigo começa no topo, como numa navegação de página comum.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
        <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          {language === "en" ? "Article not found" : "Artigo não encontrado"}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {language === "en"
            ? "It may have been deleted, or the link is wrong."
            : "Ele pode ter sido excluído, ou o link está errado."}
        </p>
        <Link
          to={lp("/blog")}
          className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
        >
          {language === "en" ? "Back to blog" : "Voltar ao blog"}
        </Link>
      </div>
    );
  }

  // Rascunho só é legível por quem está editando; para o público, some.
  if (post.draft && !isEditMode) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
        <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          {language === "en" ? "Article not available" : "Artigo indisponível"}
        </h1>
        <Link
          to={lp("/blog")}
          className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
        >
          {language === "en" ? "Back to blog" : "Voltar ao blog"}
        </Link>
      </div>
    );
  }

  const title = (language === "en" ? post.titleEn : post.title) || post.title;
  const content = (language === "en" ? post.contentEn : post.content) || post.content;
  const category = (language === "en" ? post.categoryEn : post.category) || post.category;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}${lp(`/blog/${slugOf(post)}`)}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Navegação anterior/próximo entre posts publicados, do mais novo ao mais
  // antigo. "Anterior" é o post mais recente que este; "próximo", o seguinte.
  const published = posts
    .filter((p) => !p.draft || isEditMode)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const currentIndex = published.findIndex((p) => p.id === post.id);
  const newerPost = currentIndex > 0 ? published[currentIndex - 1] : null;
  const olderPost = currentIndex >= 0 && currentIndex < published.length - 1 ? published[currentIndex + 1] : null;

  return (
    <article className="mx-auto max-w-4xl">
      {/* Barra de navegação do artigo */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link
          to={lp("/blog")}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {language === "en" ? "All articles" : "Todos os artigos"}
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
            {copiedLink
              ? language === "en" ? "Copied!" : "Copiado!"
              : language === "en" ? "Share" : "Compartilhar"}
          </button>

          {isEditMode && (
            <button
              type="button"
              onClick={() => navigate(`/admin/posts/${encodeURIComponent(slugOf(post))}`)} // admin: single-language, no locale prefix
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
            >
              <Edit2 className="h-3.5 w-3.5" />
              {language === "en" ? "Edit" : "Editar"}
            </button>
          )}
        </div>
      </div>

      {/* Capa */}
      {post.imageUrl && (
        <div className={`relative mb-8 w-full overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-950/50 ${COVER_ASPECT_CLASS}`}>
          <LocalImage
            src={post.imageUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Categoria e tags */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {post.draft && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            {language === "en" ? "Draft" : "Rascunho"}
          </span>
        )}
        {category && (
          <span className="rounded-full bg-indigo-600 px-4 py-1 font-sans text-xs font-bold uppercase tracking-wider text-white shadow-sm dark:bg-indigo-500">
            {category}
          </span>
        )}
        {post.tags.map((tag, idx) => (
          <span
            key={idx}
            className="rounded-full border border-indigo-100/50 bg-indigo-50 px-3 py-1 font-sans text-xs font-semibold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300"
          >
            #{tag}
          </span>
        ))}
      </div>

      <h1 className="font-display text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
        {title}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-6 font-mono text-xs text-slate-400 sm:text-sm dark:border-slate-800 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {post.date}
        </span>
        <span className="text-slate-200 dark:text-slate-800">•</span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {post.readTime || estimateReadTime(post.content, language)}
        </span>
        <span className="text-slate-200 dark:text-slate-800">•</span>
        <span>{authorName}</span>
      </div>

      <div className="prose prose-lg mt-10 max-w-none font-sans leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
        <MarkdownRenderer content={content} />
      </div>

      {/* Projetos relacionados */}
      {post.projetos && post.projetos.length > 0 && (
        <div className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
            <Code className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>{language === "en" ? "Related Projects" : "Projetos Relacionados"}</span>
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {post.projetos.map((code, idx) => {
              const proj = findBySlug(projects, code);

              if (!proj) {
                // Um código órfão é erro de conteúdo: aparece só para quem edita.
                return isEditMode ? (
                  <div
                    key={`orfao-${code}-${idx}`}
                    className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-4 font-mono text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>
                      {language === "en" ? "Unknown project code" : "Código de projeto inexistente"}: [{code}]
                    </span>
                  </div>
                ) : null;
              }

              const projTitle = (language === "en" && proj.titleEn ? proj.titleEn : proj.title) || proj.title;
              const projDesc = (language === "en" && proj.descriptionEn ? proj.descriptionEn : proj.description) || proj.description;
              const stack = proj.stack || proj.technologies || [];

              return (
                <Link
                  key={proj.id}
                  to={lp(`/projetos/${slugOf(proj)}`)}
                  className="group flex flex-col items-stretch gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-all hover:border-indigo-500 hover:shadow-md sm:flex-row dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-500"
                >
                  {proj.imageUrl && (
                    <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg bg-slate-200 sm:w-28 dark:bg-slate-800">
                      <LocalImage
                        src={proj.imageUrl}
                        alt={projTitle}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <h3 className="truncate font-display text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                        {projTitle}
                      </h3>
                      <p className="mb-2 line-clamp-2 font-sans text-xs text-slate-600 dark:text-slate-400">
                        {projDesc}
                      </p>
                    </div>
                    {stack.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {stack.slice(0, 3).map((tech, i) => (
                          <span
                            key={i}
                            className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {tech}
                          </span>
                        ))}
                        {stack.length > 3 && (
                          <span className="font-mono text-[10px] text-slate-400">+{stack.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Anterior / próximo */}
      {(newerPost || olderPost) && (
        <nav
          aria-label={language === "en" ? "More articles" : "Mais artigos"}
          className="mt-12 grid grid-cols-1 gap-3 border-t border-slate-200 pt-8 sm:grid-cols-2 dark:border-slate-800 no-print"
        >
          {newerPost ? (
            <Link
              to={lp(`/blog/${slugOf(newerPost)}`)}
              className="group rounded-2xl border border-slate-200 p-4 transition-all hover:border-indigo-500 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-500"
            >
              <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <ArrowLeft className="h-3 w-3" />
                {language === "en" ? "Newer" : "Mais recente"}
              </span>
              <span className="mt-1 block font-display text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                {(language === "en" ? newerPost.titleEn : newerPost.title) || newerPost.title}
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          {olderPost && (
            <Link
              to={lp(`/blog/${slugOf(olderPost)}`)}
              className="group rounded-2xl border border-slate-200 p-4 text-right transition-all hover:border-indigo-500 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-500"
            >
              <span className="flex items-center justify-end gap-1 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                {language === "en" ? "Older" : "Mais antigo"}
                <ArrowRight className="h-3 w-3" />
              </span>
              <span className="mt-1 block font-display text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                {(language === "en" ? olderPost.titleEn : olderPost.title) || olderPost.title}
              </span>
            </Link>
          )}
        </nav>
      )}

      <footer className="mt-12 border-t border-slate-100 pt-6 font-mono text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        © {new Date().getFullYear()} {authorName}
      </footer>
    </article>
  );
}
