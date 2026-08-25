import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { BlogPost } from "../types";
import { Language } from "../lib/translations";
import { localePath } from "../lib/routes";
import { slugOf } from "../utils/slug";
import { estimateReadTime } from "../utils/readTime";

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

      <div className="flex flex-col gap-3">
        {publicados.map((post) => {
          const titulo = (isEn && post.titleEn) || post.title;
          const resumo = (isEn && post.summaryEn) || post.summary;

          return (
            <Link
              key={post.id}
              to={localePath(`/blog/${slugOf(post)}`, language)}
              className="group flex flex-col gap-1 rounded-2xl border border-borda-suave bg-superficie p-4 transition-all hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-baseline sm:gap-5 sm:p-5"
            >
              <span className="flex shrink-0 items-center gap-3 font-mono text-[11px] text-tinta-fraca sm:w-32">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {post.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {post.readTime || estimateReadTime(post.content, language)}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block font-display text-base font-bold text-tinta transition-colors group-hover:text-acento">
                  {titulo}
                </span>
                <span className="line-clamp-1 block text-sm text-tinta-suave">{resumo}</span>
              </span>
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
