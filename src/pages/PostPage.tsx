import React, { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Calendar, Clock, Edit2, Code, AlertCircle, FileText, BookOpen,
} from "lucide-react";
import { BlogPost, Project } from "../types";
import { Language } from "../lib/translations";
import { findBySlug, slugOf } from "../utils/slug";
import { estimateReadTime } from "../utils/readTime";
import MarkdownRenderer from "../components/MarkdownRenderer";
import TableOfContents from "../components/TableOfContents";
import ContentUnavailable from "../components/ContentUnavailable";
import { previaLiberada } from "../lib/previewLink";
import { extractToc } from "../utils/toc";
import LocalImage from "../components/LocalImage";
import { COVER_ASPECT_CLASS } from "../lib/coverAspect";
import { useLocalePath } from "../lib/routes";
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
  authorName,
  isEditMode,
  language,
  isDataLoaded = true,
  loadFailed = false,
  chavePrevia = null,
}: PostPageProps) {
  const navigate = useNavigate();
  const lp = useLocalePath();
  // O que a barra de progresso mede: da capa ao fim do corpo, sem contar
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
          className="mt-5 inline-block rounded-xl bg-acento px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-acento-forte"
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
          className="mt-5 inline-block rounded-xl bg-acento px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-acento-forte"
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

  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[10rem_minmax(0,1fr)]">
      {/* Sumário (esquerda), só quando há títulos e largura para ele */}
      <aside className="min-w-0">
        {toc.length > 0 && <TableOfContents entries={toc} language={language} />}
      </aside>

      <article className="mx-auto w-full max-w-4xl">
      {/* Barra de navegação do artigo */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link
          to={lp("/blog")}
          className="flex items-center gap-1.5 rounded-xl border border-borda px-3 py-2 text-xs font-semibold text-tinta-suave transition-colors hover:bg-superficie-alta"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {language === "en" ? "All articles" : "Todos os artigos"}
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
              className="flex items-center gap-1.5 rounded-xl bg-acento px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-acento-forte"
            >
              <Edit2 className="h-3.5 w-3.5" />
              {language === "en" ? "Edit" : "Editar"}
            </button>
          )}
        </div>
      </div>

      <ProgressoLeitura targetRef={leituraRef} />

      {/* Da capa ao fim do corpo: o que a barra acima mede. */}
      <div ref={leituraRef}>

      {/* Capa */}
      {post.imageUrl && (
        <div className={`relative mb-8 w-full overflow-hidden rounded-3xl bg-superficie-alta ${COVER_ASPECT_CLASS}`}>
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
          <span className="inline-flex items-center gap-1 rounded-full bg-acento-suave px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-acento-tinta">
            {category}
          </span>
        )}
        {post.tags.map((tag, idx) => (
          <span
            key={idx}
            className="rounded-full border border-borda-suave bg-superficie-alta px-3 py-1 font-sans text-xs font-semibold text-tinta-suave"
          >
            #{tag}
          </span>
        ))}
      </div>

      <h1 className="font-display text-3xl font-black leading-tight tracking-tight text-tinta sm:text-5xl">
        {title}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-4 border-b border-borda-suave pb-6 font-mono text-xs text-tinta-fraca sm:text-sm">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {post.date}
        </span>
        <span className="text-borda">•</span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {post.readTime || estimateReadTime(post.content, language)}
        </span>
        <span className="text-borda">•</span>
        <span>{authorName}</span>
      </div>

      <div
        data-md-field="content"
        className="prose prose-lg mt-10 max-w-none font-sans leading-relaxed text-tinta dark:prose-invert"
      >
        {/* Sem limite de largura — o mesmo ajuste da página de projeto: um
            corpo mais estreito que a capa e o título acima dele lia como
            espaço desperdiçado, não como medida de leitura deliberada. */}
        <MarkdownRenderer
          content={content}
          className="max-w-none text-sm sm:text-base space-y-4 text-tinta-suave"
        />
      </div>

      </div>

      {/* Projetos relacionados */}
      {post.projetos && post.projetos.length > 0 && (
        <div className="mt-12 border-t border-borda-suave pt-8">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-tinta">
            <Code className="h-5 w-5 text-acento" />
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
                  className="group flex flex-col items-stretch gap-4 rounded-xl border border-borda-suave bg-superficie p-3.5 transition-all hover:border-acento hover:shadow-md sm:flex-row"
                >
                  {proj.imageUrl && (
                    <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg bg-superficie-alta sm:w-28">
                      <LocalImage
                        src={proj.imageUrl}
                        alt={projTitle}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <h3 className="truncate font-display text-sm font-bold text-tinta transition-colors group-hover:text-acento">
                        {projTitle}
                      </h3>
                      <p className="mb-2 line-clamp-2 font-sans text-xs text-tinta-suave">
                        {projDesc}
                      </p>
                    </div>
                    {stack.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {stack.slice(0, 3).map((tech, i) => (
                          <span
                            key={i}
                            className="rounded bg-superficie-alta px-1.5 py-0.5 font-mono text-[10px] text-tinta-suave"
                          >
                            {tech}
                          </span>
                        ))}
                        {stack.length > 3 && (
                          <span className="font-mono text-[10px] text-tinta-fraca">+{stack.length - 3}</span>
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

      {/* Veja também: outros artigos por assunto, não por ordem cronológica */}
      {relatedPosts.length > 0 && (
        <div className="mt-12 border-t border-borda-suave pt-8 no-print">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-tinta">
            <BookOpen className="h-5 w-5 text-acento" />
            <span>{language === "en" ? "You Might Also Like" : "Veja Também"}</span>
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {relatedPosts.map((relPost) => {
              const relTitle = (language === "en" ? relPost.titleEn : relPost.title) || relPost.title;
              return (
                <Link
                  key={relPost.id}
                  to={lp(`/blog/${slugOf(relPost)}`)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-borda-suave bg-superficie transition-all hover:border-acento hover:shadow-md"
                >
                  {relPost.imageUrl && (
                    <div className="aspect-video w-full shrink-0 overflow-hidden bg-superficie-alta">
                      <LocalImage
                        src={relPost.imageUrl}
                        alt={relTitle}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <h3 className="line-clamp-2 font-display text-sm font-bold text-tinta transition-colors group-hover:text-acento">
                      {relTitle}
                    </h3>
                    <span className="mt-2 flex items-center gap-1 font-mono text-[11px] text-tinta-fraca">
                      <Calendar className="h-3 w-3" />
                      {relPost.date}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Referências */}
      <ReferenciasSection references={post.references} language={language} />

      {/* Anterior / próximo */}
      {(newerPost || olderPost) && (
        <nav
          aria-label={language === "en" ? "More articles" : "Mais artigos"}
          className="mt-12 grid grid-cols-1 gap-3 border-t border-borda-suave pt-8 sm:grid-cols-2 no-print"
        >
          {newerPost ? (
            <Link
              to={lp(`/blog/${slugOf(newerPost)}`)}
              className="group rounded-2xl border border-borda-suave p-4 transition-all hover:border-acento hover:shadow-md"
            >
              <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-tinta-fraca">
                <ArrowLeft className="h-3 w-3" />
                {language === "en" ? "Newer" : "Mais recente"}
              </span>
              <span className="mt-1 block font-display text-sm font-bold text-tinta transition-colors group-hover:text-acento">
                {(language === "en" ? newerPost.titleEn : newerPost.title) || newerPost.title}
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          {olderPost && (
            <Link
              to={lp(`/blog/${slugOf(olderPost)}`)}
              className="group rounded-2xl border border-borda-suave p-4 text-right transition-all hover:border-acento hover:shadow-md"
            >
              <span className="flex items-center justify-end gap-1 font-mono text-[11px] uppercase tracking-wider text-tinta-fraca">
                {language === "en" ? "Older" : "Mais antigo"}
                <ArrowRight className="h-3 w-3" />
              </span>
              <span className="mt-1 block font-display text-sm font-bold text-tinta transition-colors group-hover:text-acento">
                {(language === "en" ? olderPost.titleEn : olderPost.title) || olderPost.title}
              </span>
            </Link>
          )}
        </nav>
      )}

      <footer className="mt-12 border-t border-borda-suave pt-6 font-mono text-xs text-tinta-fraca">
        © {new Date().getFullYear()} {authorName}
      </footer>
      </article>
    </div>
  );
}
