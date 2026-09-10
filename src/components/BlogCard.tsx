import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Calendar, Clock, Edit2, Trash2 } from "lucide-react";
import { BlogPost } from "../types";
import { Language } from "../lib/translations";
import { localePath } from "../lib/routes";
import { COVER_ASPECT_CLASS } from "../lib/coverAspect";
import { slugOf } from "../utils/slug";
import { estimateReadTime } from "../utils/readTime";
import LocalImage from "./LocalImage";

interface BlogCardProps {
  post: BlogPost;
  category: string;
  language: Language;
  featured?: boolean;
  isEditMode: boolean;
  dragHandle?: React.ReactNode;
  onOpen?: () => void;
  onEdit: (event: React.MouseEvent) => void;
  onDelete: (event: React.MouseEvent) => void;
}

/** A mesma hierarquia de leitura no destaque e nos demais artigos. */
export default function BlogCard({ post, category, language, featured = false, isEditMode, dragHandle, onOpen, onEdit, onDelete }: BlogCardProps) {
  const isEn = language === "en";
  const title = (isEn && post.titleEn) || post.title;
  const summary = (isEn && post.summaryEn) || post.summary;
  const content = (isEn && post.contentEn) || post.content;
  const headingId = React.useId();

  return (
    <article aria-labelledby={headingId} className={`blog-preview group relative h-full min-w-0 rounded-2xl border border-borda bg-superficie ${featured && post.imageUrl ? "grid md:grid-cols-2" : "flex flex-col"}`}>
      {dragHandle && <div className="absolute right-3 top-3 z-10 rounded-lg border border-borda bg-superficie p-1.5 shadow-sm">{dragHandle}</div>}

      {post.imageUrl && (
        <div className={`min-w-0 overflow-hidden rounded-t-2xl bg-superficie-alta ${featured ? "flex items-center md:rounded-l-2xl md:rounded-tr-none" : "border-b border-borda"}`}>
          <div className={`${COVER_ASPECT_CLASS} w-full shrink-0`}>
            <LocalImage src={post.imageUrl} alt={title} referrerPolicy="no-referrer" sizes="(min-width: 1600px) 740px, (min-width: 768px) 45vw, 90vw" className="h-full w-full object-contain" />
          </div>
        </div>
      )}

      <div className={`flex min-w-0 flex-1 flex-col p-5 sm:p-6 ${featured ? "lg:p-8" : ""}`}>
        {(featured || category || post.draft) && <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-tinta-suave">
          {featured && <span className="text-acento">{isEn ? "Featured article" : "Artigo em destaque"}</span>}
          {category && <span className="break-words">{category}</span>}
          {post.draft && <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">{isEn ? "Draft" : "Rascunho"}</span>}
        </div>}

        <h3 id={headingId} className={`max-w-3xl break-words font-display font-bold leading-snug tracking-tight text-tinta ${featured ? "text-2xl lg:text-3xl" : "text-xl"}`}>
          <Link
            to={localePath(`/blog/${encodeURIComponent(slugOf(post))}`, language)}
            onClick={event => {
              if (onOpen && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
                event.preventDefault();
                onOpen();
              }
            }}
            className="transition-colors after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:text-acento focus-visible:text-acento group-hover:text-acento"
          >{title}</Link>
        </h3>

        <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-tinta-suave ${summary ? "" : "mb-6"}`}>
          {post.date && <time dateTime={post.date} className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{post.date}</time>}
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{post.readTime || estimateReadTime(content, language)}</span>
        </div>

        {summary && <p className="mt-4 mb-6 max-w-3xl break-words text-sm leading-relaxed text-tinta-suave line-clamp-3">{summary}</p>}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-borda-suave pt-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-acento" aria-hidden="true">{isEn ? "Read article" : "Ler artigo"}<ArrowUpRight className="blog-preview-arrow h-4 w-4" /></span>
          {isEditMode && <div className="relative z-10 flex items-center gap-1.5">
            <button type="button" onClick={onEdit} aria-label={isEn ? "Edit article" : "Editar Artigo"} className="min-h-9 min-w-9 cursor-pointer rounded-lg p-2 text-tinta-suave transition-colors hover:bg-acento-suave hover:text-acento"><Edit2 className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" onClick={onDelete} aria-label={isEn ? "Delete article" : "Excluir Artigo"} className="min-h-9 min-w-9 cursor-pointer rounded-lg p-2 text-tinta-suave transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
          </div>}
        </div>
      </div>
    </article>
  );
}
