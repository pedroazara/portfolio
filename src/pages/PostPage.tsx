import React, { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Edit2, AlertCircle, FileText } from "lucide-react";
import { BlogPost, Project, ProjectCategory } from "../types";
import { Language } from "../lib/translations";
import { findBySlug, slugOf } from "../utils/slug";
import { estimateReadTime } from "../utils/readTime";
import { formatPostDate } from "../utils/postDate";
import MarkdownRenderer from "../components/MarkdownRenderer";
import TableOfContents from "../components/TableOfContents";
import ContentUnavailable from "../components/ContentUnavailable";
import { previaLiberada } from "../lib/previewLink";
import { extractToc } from "../utils/toc";
import LocalImage from "../components/LocalImage";
import { COVER_ASPECT_CLASS } from "../lib/coverAspect";
import { useLocalePath } from "../lib/routes";
import { projectAreaNames } from "../lib/projectAreas";
import { editTargetFromViewport } from "../utils/editTarget";
import ProgressoLeitura from "../components/ProgressoLeitura";
import ReferenciasSection from "../components/ReferenciasSection";
import CitarBotao from "../components/CitarBotao";
import { extractYear } from "../lib/citation";

interface PostPageProps {
  /** Trecho da URL: o `codigo` ou `id` do artigo. */
  slug: string;
  posts: BlogPost[];
  projects: Project[];
  categories: ProjectCategory[];
  authorName: string;
  isEditMode: boolean;
  language: Language;
  /** Se os dados já chegaram, e se a leitura da nuvem falhou. */
  isDataLoaded?: boolean;
  loadFailed?: boolean;
  /** Chave de prévia vinda da URL, que revela um rascunho específico. */
  chavePrevia?: string | null;
}

export default function PostPage({
  slug,
  posts,
  projects,
  categories,
  authorName,
  isEditMode,
  language,
  isDataLoaded = true,
  loadFailed = false,
  chavePrevia = null,
}: PostPageProps) {
  const navigate = useNavigate();
  const lp = useLocalePath();
  // O que a barra de progresso mede: do título ao fim do corpo, sem contar
  // projetos relacionados, navegação entre artigos e rodapé.
  const leituraRef = useRef<HTMLDivElement>(null);

  const post = findBySlug(posts, slug);

  // Toda troca de artigo começa no topo, como numa navegação de página comum.
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  // Sem artigo pode ser link errado — ou dado que ainda não chegou.
  if (!post && (!isDataLoaded || loadFailed)) {
    return <ContentUnavailable state={loadFailed ? "failed" : "loading"} language={language} />;
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-borda-suave bg-superficie p-10 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-tinta-fraca" />
        <h1 className="font-display text-lg font-bold text-tinta">
          {language === "en" ? "Article not found" : "Artigo não encontrado"}
        </h1>
        <p className="mt-1 text-sm text-tinta-suave">
          {language === "en"
            ? "It may have been deleted, or the link is wrong."
            : "Ele pode ter sido excluído, ou o link está errado."}
        </p>
        <Link
          to={lp("/blog")}
          className="mt-5 inline-block rounded-xl bg-acento-solido px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-acento-solido-hover"
        >
          {language === "en" ? "Back to blog" : "Voltar ao blog"}
        </Link>
      </div>
    );
  }

  // Rascunho só é legível por quem está editando — ou por quem chegou com a
  // chave de prévia, que é justamente o que permite mostrar antes de publicar.
  if (post.draft && !isEditMode && !previaLiberada(post, chavePrevia)) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-borda-suave bg-superficie p-10 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-tinta-fraca" />
        <h1 className="font-display text-lg font-bold text-tinta">
          {language === "en" ? "Article not available" : "Artigo indisponível"}
        </h1>
        <Link
          to={lp("/blog")}
          className="mt-5 inline-block rounded-xl bg-acento-solido px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-acento-solido-hover"
        >
          {language === "en" ? "Back to blog" : "Voltar ao blog"}
        </Link>
      </div>
    );
  }

  const title = (language === "en" ? post.titleEn : post.title) || post.title;
  const content = (language === "en" ? post.contentEn : post.content) || post.content;
  const category = (language === "en" ? post.categoryEn : post.category) || post.category;
  const toc = extractToc(content);

  const citationSource = {
    title,
    authorName,
    year: extractYear(post.date),
    siteName: language === "en" ? `${authorName}'s Blog` : `Blog de ${authorName}`,
    url: `${window.location.origin}${lp(`/blog/${slugOf(post)}`)}`,
  };

  // Navegação anterior/próximo entre posts publicados, do mais novo ao mais
  // antigo. "Anterior" é o post mais recente que este; "próximo", o seguinte.
  const published = posts
    .filter((p) => !p.draft || isEditMode)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const currentIndex = published.findIndex((p) => p.id === post.id);
  const newerPost = currentIndex > 0 ? published[currentIndex - 1] : null;
  const olderPost = currentIndex >= 0 && currentIndex < published.length - 1 ? published[currentIndex + 1] : null;

  // "Veja também": outros artigos que compartilham tag ou categoria, os mais
  // próximos primeiro. Tag em comum pesa mais que categoria porque é uma
  // escolha mais específica de quem escreveu — duas tags batendo diz mais
  // sobre o assunto do que estar na mesma categoria ampla.
  const postTags = new Set((post.tags || []).map((t) => t.toLowerCase()));
  const relatedPosts = published
    .filter((p) => p.id !== post.id)
    .map((p) => {
      const sharedTags = (p.tags || []).filter((t) => postTags.has(t.toLowerCase())).length;
      const sameCategory = post.category && p.category === post.category ? 1 : 0;
      return { post: p, score: sharedTags * 2 + sameCategory };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (b.post.date || "").localeCompare(a.post.date || ""))
    .slice(0, 3)
    .map((entry) => entry.post);

  const summary = (language === "en" ? post.summaryEn : post.summary) || post.summary;
  const isEn = language === "en";

  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,42rem)_minmax(0,1fr)]">
      {/* Sumário na margem esquerda, só quando há títulos e largura para ele;
          a coluna de leitura fica centrada, alinhada com o cabeçalho do blog. */}
      <aside className="min-w-0 xl:col-start-1 xl:row-start-1 xl:w-44 xl:justify-self-end xl:pt-40">
        {toc.length > 0 && <TableOfContents entries={toc} language={language} />}
      </aside>

      <article className="blog-article mx-auto w-full max-w-[42rem] xl:col-start-2 xl:row-start-1">
      {/* Barra de navegação do artigo */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link
          to={lp("/blog")}
          className="inline-flex items-center gap-1.5 text-sm text-tinta-fraca underline-offset-4 transition-colors hover:text-tinta hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {isEn ? "All articles" : "Todos os artigos"}
        </Link>

        <div className="flex items-center gap-2">
          <CitarBotao source={citationSource} shareUrl={citationSource.url} language={language} />

          {isEditMode && (
            <button
              type="button"
              // admin: single-language, no locale prefix. O alvo leva o editor
              // ao trecho que estava na tela, em vez de sempre ao topo.
              onClick={() =>
                navigate(`/admin/posts/${encodeURIComponent(slugOf(post))}`, {
                  state: { editTarget: editTargetFromViewport() },
                })
              }
              className="flex items-center gap-1.5 rounded-lg bg-acento-solido px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-acento-solido-hover"
            >
              <Edit2 className="h-3.5 w-3.5" />
              {isEn ? "Edit" : "Editar"}
            </button>
          )}
        </div>
      </div>

      <ProgressoLeitura targetRef={leituraRef} />

      {/* Do título ao fim do corpo: o que a barra acima mede. */}
      <div ref={leituraRef}>

      <header>
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-tinta-fraca">
          {post.draft && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {isEn ? "Draft" : "Rascunho"}
            </span>
          )}
          {category && <span className="font-medium text-acento-tinta">{category}</span>}
          {category && post.date && <span aria-hidden="true">·</span>}
          {post.date && <time dateTime={post.date}>{formatPostDate(post.date, language, "long")}</time>}
        </div>

        <h1 className="font-serif text-4xl font-bold leading-[1.15] tracking-tight text-tinta sm:text-5xl">
          {title}
        </h1>

        {summary && (
          <p className="mt-5 font-serif text-xl leading-relaxed text-tinta-suave">
            {summary}
          </p>
        )}

        <p className="mt-6 text-sm text-tinta-fraca">
          {isEn ? "By" : "Por"} <span className="text-tinta">{authorName}</span>
          <span aria-hidden="true"> · </span>
          {post.readTime || estimateReadTime(content, language)}
        </p>
      </header>

      {/* Capa */}
      {post.imageUrl && (
        <div className={`relative mt-10 w-full overflow-hidden rounded-md bg-superficie-alta ${COVER_ASPECT_CLASS}`}>
          <LocalImage
            src={post.imageUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div data-md-field="content" className="mt-10">
        <MarkdownRenderer content={content} className="max-w-none" />
      </div>

      </div>

      {post.tags.length > 0 && (
        <ul className="mt-12 flex flex-wrap gap-x-4 gap-y-1 text-sm text-tinta-fraca" aria-label={isEn ? "Tags" : "Etiquetas"}>
          {post.tags.map((tag, idx) => (
            <li key={idx}>#{tag}</li>
          ))}
        </ul>
      )}

      {/* Quem escreveu: uma linha, e o portfólio fica a um clique para quem quiser. */}
      <p className="mt-10 border-t border-borda pt-6 text-sm text-tinta-suave no-print">
        {isEn ? "Written by" : "Escrito por"} <span className="font-semibold text-tinta">{authorName}</span>.{" "}
        <Link to={lp("/")} className="text-tinta-fraca underline underline-offset-4 transition-colors hover:text-tinta">
          {isEn ? "About me" : "Sobre mim"}
        </Link>
      </p>

      {/* Projetos relacionados */}
      {post.projetos && post.projetos.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 font-serif text-lg font-bold text-tinta">
            {isEn ? "Projects mentioned" : "Projetos mencionados"}
          </h2>

          <ul className="divide-y divide-borda border-y border-borda">
            {post.projetos.map((code, idx) => {
              const proj = findBySlug(projects, code);

              if (!proj) {
                // Um código órfão é erro de conteúdo: aparece só para quem edita.
                return isEditMode ? (
                  <li
                    key={`orfao-${code}-${idx}`}
                    className="flex items-center gap-2 py-3 font-mono text-xs text-rose-700 dark:text-rose-300"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>
                      {isEn ? "Unknown project code" : "Código de projeto inexistente"}: [{code}]
                    </span>
                  </li>
                ) : null;
              }

              const projTitle = (isEn && proj.titleEn ? proj.titleEn : proj.title) || proj.title;
              const projDesc = (isEn && proj.descriptionEn ? proj.descriptionEn : proj.description) || proj.description;
              const areas = projectAreaNames(proj, categories, language);

              return (
                <li key={proj.id}>
                  <Link to={lp(`/projetos/${slugOf(proj)}`)} className="group block py-3">
                    <span className="font-semibold text-tinta underline-offset-4 group-hover:underline">{projTitle}</span>
                    {areas.length > 0 && <span className="ml-2 text-xs text-tinta-fraca">{areas.slice(0, 2).join(" · ")}</span>}
                    {projDesc && <span className="mt-0.5 block line-clamp-1 text-sm text-tinta-suave">{projDesc}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Veja também: outros artigos por assunto, não por ordem cronológica */}
      {relatedPosts.length > 0 && (
        <section className="mt-12 no-print">
          <h2 className="mb-3 font-serif text-lg font-bold text-tinta">
            {isEn ? "Keep reading" : "Continue lendo"}
          </h2>

          <ul className="divide-y divide-borda border-y border-borda">
            {relatedPosts.map((relPost) => {
              const relTitle = (isEn ? relPost.titleEn : relPost.title) || relPost.title;
              return (
                <li key={relPost.id}>
                  <Link to={lp(`/blog/${slugOf(relPost)}`)} className="group flex items-baseline justify-between gap-4 py-3">
                    <span className="font-serif text-[1.0625rem] text-tinta underline-offset-4 group-hover:underline">{relTitle}</span>
                    {relPost.date && (
                      <time dateTime={relPost.date} className="shrink-0 text-xs text-tinta-fraca">
                        {formatPostDate(relPost.date, language)}
                      </time>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Referências */}
      <ReferenciasSection references={post.references} language={language} />

      {/* Anterior / próximo */}
      {(newerPost || olderPost) && (
        <nav
          aria-label={isEn ? "More articles" : "Mais artigos"}
          className="mt-12 grid grid-cols-1 gap-6 border-t border-borda pt-8 sm:grid-cols-2 no-print"
        >
          {newerPost ? (
            <Link to={lp(`/blog/${slugOf(newerPost)}`)} className="group">
              <span className="flex items-center gap-1 text-xs text-tinta-fraca">
                <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                {isEn ? "Newer" : "Mais recente"}
              </span>
              <span className="mt-1 block font-serif text-[1.0625rem] font-semibold text-tinta underline-offset-4 group-hover:underline">
                {(isEn ? newerPost.titleEn : newerPost.title) || newerPost.title}
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          {olderPost && (
            <Link to={lp(`/blog/${slugOf(olderPost)}`)} className="group sm:text-right">
              <span className="flex items-center gap-1 text-xs text-tinta-fraca sm:justify-end">
                {isEn ? "Older" : "Mais antigo"}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </span>
              <span className="mt-1 block font-serif text-[1.0625rem] font-semibold text-tinta underline-offset-4 group-hover:underline">
                {(isEn ? olderPost.titleEn : olderPost.title) || olderPost.title}
              </span>
            </Link>
          )}
        </nav>
      )}
      </article>
    </div>
  );
}
