import React from "react";
import { Link } from "react-router-dom";
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

/** "2026-09-08" vira "8 de set. de 2026"; qualquer outro formato passa como veio. */
function formatarData(data: string, language: Language) {
  const instante = new Date(`${data}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(instante.getTime())) return data;
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(instante);
}

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
      <div className="mb-6 flex items-end justify-between gap-3">
        <h2 id="titulo-artigos" className="font-display text-2xl font-extrabold tracking-tight text-tinta sm:text-3xl">
          {isEn ? "Latest articles" : "Últimos artigos"}
        </h2>
        <Link
          to={localePath("/blog", language)}
          className="hidden shrink-0 text-sm font-semibold text-acento-tinta underline-offset-4 hover:underline sm:inline"
        >
          {isEn ? "All articles" : "Todos os artigos"}
        </Link>
      </div>

      {/* Lista, e não grade de capas: artigo se escolhe pelo título, e um
          post só não deixa dois terços da largura vazios. */}
      <ol className="border-t border-borda">
        {publicados.map((post) => {
          const titulo = (isEn && post.titleEn) || post.title;
          const resumo = (isEn && post.summaryEn) || post.summary;

          return (
            <li key={post.id} className="border-b border-borda">
              <Link
                to={localePath(`/blog/${slugOf(post)}`, language)}
                className="group grid gap-2 py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8"
              >
                <div className="flex flex-wrap gap-x-4 text-sm text-tinta-fraca sm:flex-col">
                  {post.date && <time dateTime={post.date}>{formatarData(post.date, language)}</time>}
                  <span>{post.readTime || estimateReadTime(post.content, language)}</span>
                </div>
                <div className="max-w-[70ch]">
                  <h3 className="font-display text-lg font-bold leading-snug text-tinta transition-colors group-hover:text-acento-tinta">
                    {titulo}
                  </h3>
                  {resumo && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-tinta-suave">{resumo}</p>}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      <Link
        to={localePath("/blog", language)}
        className="mt-5 block text-center text-sm font-semibold text-acento-tinta underline-offset-4 hover:underline sm:hidden"
      >
        {isEn ? "All articles" : "Todos os artigos"}
      </Link>
    </section>
  );
}
