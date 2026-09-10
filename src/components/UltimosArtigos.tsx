import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock, FileText } from "lucide-react";
import { BlogPost } from "../types";
import { Language } from "../lib/translations";
import { localePath } from "../lib/routes";
import { slugOf } from "../utils/slug";
import { estimateReadTime } from "../utils/readTime";
import { COVER_ASPECT_CLASS } from "../lib/coverAspect";
import LocalImage from "./LocalImage";

interface UltimosArtigosProps {
  posts: BlogPost[];
  language?: Language;
}

const MAXIMO = 3;

/**
 * Os artigos mais recentes, na home — e nada quando não há nenhum.
 *
 * O blog nasceu recentemente e ainda pode não ter uma publicação sequer; uma
 * seção vazia anunciando isso na porta de entrada do site lê como site
 * inacabado. Melhor a home ficar em silêncio sobre o blog até haver algo para
 * mostrar.
 */
export default function UltimosArtigos({ posts, language = "pt" }: UltimosArtigosProps) {
  const isEn = language === "en";

  const publicados = [...posts]
    .filter((p) => !p.draft)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, MAXIMO);

  if (publicados.length === 0) return null;

  return (
    <section aria-labelledby="titulo-artigos">
      <div className="mb-5 flex items-end justify-between gap-3">
        <h2 id="titulo-artigos" className="font-display text-2xl font-black tracking-tight text-tinta">
          {isEn ? "Latest articles" : "Últimos artigos"}
        </h2>
        <Link
          to={localePath("/blog", language)}
          className="group hidden shrink-0 items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-acento sm:inline-flex"
        >
          {isEn ? "All articles" : "Todos os artigos"}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {publicados.map((post) => {
          const titulo = (isEn && post.titleEn) || post.title;
          const resumo = (isEn && post.summaryEn) || post.summary;

          return (
            <Link
              key={post.id}
              to={localePath(`/blog/${slugOf(post)}`, language)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-borda-suave bg-superficie shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`relative w-full overflow-hidden bg-superficie-alta ${COVER_ASPECT_CLASS}`}>
                {post.imageUrl ? (
                  <LocalImage
                    src={post.imageUrl}
                    alt={titulo}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-tinta-fraca">
                    <FileText className="h-8 w-8" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <span className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-widest text-acento">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readTime || estimateReadTime(post.content, language)}
                  </span>
                </span>
                <h3 className="font-display text-base font-bold leading-snug text-tinta transition-colors group-hover:text-acento">
                  {titulo}
                </h3>
                <p className="line-clamp-2 text-sm text-tinta-suave">{resumo}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        to={localePath("/blog", language)}
        className="mt-5 flex items-center justify-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-acento sm:hidden"
      >
        {isEn ? "All articles" : "Todos os artigos"}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
