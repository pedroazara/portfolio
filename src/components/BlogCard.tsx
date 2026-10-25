import React from "react";
import { Link } from "react-router-dom";
import { Edit2, Trash2 } from "lucide-react";
import { BlogPost } from "../types";
import { Language } from "../lib/translations";
import { localePath } from "../lib/routes";
import { slugOf } from "../utils/slug";
import { estimateReadTime } from "../utils/readTime";
import { formatPostDate } from "../utils/postDate";
import LocalImage from "./LocalImage";

interface BlogCardProps {
  post: BlogPost;
  category: string;
  language: Language;
  isEditMode: boolean;
  dragHandle?: React.ReactNode;
  onOpen?: () => void;
  onEdit: (event: React.MouseEvent) => void;
  onDelete: (event: React.MouseEvent) => void;
}

/**
 * Um artigo na listagem do blog: entrada de índice, não cartão de vitrine.
 * Data e assunto em cima, título e resumo no corpo, e a capa pequena ao lado
 * quando existe; a escolha é feita pelo título.
 */
export default function BlogCard({ post, category, language, isEditMode, dragHandle, onOpen, onEdit, onDelete }: BlogCardProps) {
  const isEn = language === "en";
  const title = (isEn && post.titleEn) || post.title;
  const summary = (isEn && post.summaryEn) || post.summary;
  const content = (isEn && post.contentEn) || post.content;
  const headingId = React.useId();

  return (
    <article aria-labelledby={headingId} className="blog-entry group relative grid min-w-0 gap-5 py-8 sm:grid-cols-[minmax(0,1fr)_8.5rem] sm:gap-8">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-tinta-fraca">
          {post.date && <time dateTime={post.date}>{formatPostDate(post.date, language, "long")}</time>}
          {post.date && category && <span aria-hidden="true">·</span>}
          {category && <span className="break-words">{category}</span>}
          {post.draft && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">{isEn ? "Draft" : "Rascunho"}</span>}
        </div>

        <h2 id={headingId} className="break-words font-serif text-2xl font-bold leading-snug tracking-tight text-tinta">
          <Link
            to={localePath(`/blog/${encodeURIComponent(slugOf(post))}`, language)}
            onClick={event => {
              if (onOpen && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
                event.preventDefault();
                onOpen();
              }
            }}
            className="decoration-1 underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline focus-visible:underline"
          >{title}</Link>
        </h2>

        {summary && <p className="mt-2.5 break-words font-serif text-[1.0625rem] leading-relaxed text-tinta-suave line-clamp-3">{summary}</p>}

        <div className="mt-3 flex items-center gap-3 text-[13px] text-tinta-fraca">
          <span>{post.readTime || estimateReadTime(content, language)}</span>
          {isEditMode && <div className="relative z-10 ml-auto flex items-center gap-1">
            {dragHandle}
            <button type="button" onClick={onEdit} aria-label={isEn ? "Edit article" : "Editar Artigo"} className="min-h-9 min-w-9 cursor-pointer rounded-lg p-2 text-tinta-suave transition-colors hover:bg-acento-suave hover:text-acento"><Edit2 className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" onClick={onDelete} aria-label={isEn ? "Delete article" : "Excluir Artigo"} className="min-h-9 min-w-9 cursor-pointer rounded-lg p-2 text-tinta-suave transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
          </div>}
        </div>
      </div>

      {post.imageUrl && (
        <div className="order-first aspect-[16/9] w-full overflow-hidden rounded-md bg-superficie-alta sm:order-none sm:aspect-[4/3] sm:mt-7">
          <LocalImage src={post.imageUrl} alt="" referrerPolicy="no-referrer" sizes="(min-width: 640px) 136px, 90vw" className="h-full w-full object-cover" />
        </div>
      )}
    </article>
  );
}
