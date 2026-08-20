import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ZoomIn, X, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LocalImage from "./LocalImage";
import { headingIdsByLine } from "../utils/toc";
import { parseYouTubeUrl, YouTubeVideo } from "../utils/videoEmbed";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Player do YouTube no lugar do link.
 *
 * A proporção fixa evita o pulo de layout enquanto o iframe carrega, e o
 * carregamento tardio mantém fora do caminho crítico um recurso pesado que
 * quase sempre está abaixo da dobra.
 *
 * No celular a moldura ocupa a largura toda do texto e perde o arredondamento
 * exagerado — numa tela de 360px, um raio grande come a imagem. O Shorts vem
 * em pé e limitado a uma largura confortável, para não virar uma coluna alta
 * demais que empurra o resto do artigo para fora da tela.
 */
function YouTubeEmbed({ video, caption }: { video: YouTubeVideo; caption?: string }) {
  const frame = video.portrait
    ? "aspect-[9/16] max-w-[280px] sm:max-w-[320px]"
    : "aspect-video max-w-3xl";

  return (
    <figure className="my-5 sm:my-6 space-y-2">
      <div
        className={`relative mx-auto w-full ${frame} overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-md`}
      >
        <iframe
          src={video.embedUrl}
          title={caption || "Vídeo do YouTube"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      {caption && (
        <figcaption className="mx-auto max-w-prose px-2 text-center text-[11px] sm:text-xs italic text-slate-500 dark:text-slate-400 font-sans text-balance">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Um pedaço de linha: ou texto cru, ou um nó já renderizado pelo react-markdown. */
type LinePart =
  | { kind: "text"; value: string }
  | { kind: "node"; hast: any; rendered: React.ReactNode };

/** Segmento do parágrafo depois da separação: um vídeo ou as demais linhas. */
type ParagraphPart =
  | { kind: "video"; video: YouTubeVideo; caption?: string }
  | { kind: "lines"; lines: LinePart[][] };

/**
 * Quebra o parágrafo em linhas, do jeito que o leitor as enxerga.
 *
 * O parágrafo aqui é renderizado com `whitespace-pre-line`: uma quebra simples
 * já vira linha visível, então quem escreve trata cada linha como uma unidade.
 * O `remark`, porém, junta tudo num nó só. Esta função desfaz esse nó nas
 * linhas de origem, mantendo cada filho já renderizado (negrito, links, código)
 * no lugar certo.
 */
function splitLines(node: any, children: React.ReactNode): LinePart[][] {
  const hastKids: any[] = node?.children || [];
  const rendered = React.Children.toArray(children);
  const lines: LinePart[][] = [[]];

  const pushLine = () => lines.push([]);
  const push = (part: LinePart) => lines[lines.length - 1].push(part);

  hastKids.forEach((kid, index) => {
    if (kid?.type === "text") {
      // O texto é idêntico ao filho renderizado (uma string), então dá para
      // fatiá-lo sem perder nada.
      const chunks = String(kid.value ?? "").split("\n");
      chunks.forEach((chunk, i) => {
        if (i > 0) pushLine();
        if (chunk) push({ kind: "text", value: chunk });
      });
      return;
    }

    if (kid?.type === "element" && kid.tagName === "br") {
      pushLine();
      return;
    }

    push({ kind: "node", hast: kid, rendered: rendered[index] });
  });

  return lines;
}

/**
 * Reconhece a linha que contém apenas um link de vídeo.
 *
 * Um link citado no meio de uma frase continua sendo link — é o que o texto
 * pede ali. Só a URL sozinha na linha vira player.
 */
function videoFromLine(line: LinePart[]): { video: YouTubeVideo; caption?: string } | null {
  const meaningful = line.filter((part) => part.kind !== "text" || part.value.trim());
  if (meaningful.length !== 1) return null;
  const only = meaningful[0];

  // O `node` entregue aqui é hast: um link chega como elemento `a` com `href`.
  if (only.kind === "node" && only.hast?.type === "element" && only.hast.tagName === "a") {
    const href = String(only.hast.properties?.href || "");
    const video = parseYouTubeUrl(href);
    if (!video) return null;
    const label = textOf(only.hast).trim();
    return { video, caption: label && label !== href ? label : undefined };
  }

  // `remark-gfm` já transforma a URL solta em link; o caso `text` cobre o resto.
  if (only.kind === "text") {
    const video = parseYouTubeUrl(only.value.trim());
    return video ? { video } : null;
  }

  return null;
}

/**
 * Separa os vídeos do restante do parágrafo, ou `null` se não houver nenhum.
 *
 * Devolver `null` no caso comum deixa o parágrafo seguir pelo caminho de
 * sempre, com os filhos originais — sem reconstrução, sem risco de perder
 * formatação.
 */
function splitVideos(node: any, children: React.ReactNode): ParagraphPart[] | null {
  const lines = splitLines(node, children);
  const parts: ParagraphPart[] = [];
  let pending: LinePart[][] = [];
  let found = false;

  const flush = () => {
    // Linhas em branco nas bordas do bloco não viram espaço extra.
    while (pending.length && !pending[0].length) pending.shift();
    while (pending.length && !pending[pending.length - 1].length) pending.pop();
    if (pending.length) parts.push({ kind: "lines", lines: pending });
    pending = [];
  };

  for (const line of lines) {
    const video = videoFromLine(line);
    if (video) {
      found = true;
      flush();
      parts.push({ kind: "video", ...video });
      continue;
    }
    pending.push(line);
  }
  flush();

  return found ? parts : null;
}

/** Texto visível de um nó hast, para usar como legenda. */
function textOf(node: any): string {
  if (node?.type === "text") return String(node.value || "");
  return (node?.children || []).map(textOf).join("");
}

// Code block renderer with dynamic Copy button
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="group/code relative my-5 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-md">
      {/* File/Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-900 bg-slate-900/50 text-[10px] font-mono text-slate-400 select-none">
        <span>{lang ? lang.toUpperCase() : "CODE"}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 rounded-md px-2 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-slate-100 leading-relaxed max-h-[450px]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({ content, className = "max-w-[75ch] text-sm sm:text-base space-y-4 text-slate-600 dark:text-slate-300" }: MarkdownRendererProps) {
  const [zoomedImage, setZoomedImage] = useState<{ url: string; alt: string } | null>(null);

  const handleImageClick = (url: string, alt: string) => {
    setZoomedImage({ url, alt });
  };

  /**
   * Ids das âncoras, indexados pela linha de origem no Markdown.
   *
   * Derivar o id da posição — e não de um contador que avança a cada título
   * renderizado — mantém o resultado idêntico entre o sumário e o HTML. Um
   * contador mutável durante o render era incrementado duas vezes pelo
   * StrictMode, e as âncoras saíam com sufixo indevido.
   */
  const headingIds = React.useMemo(() => headingIdsByLine(content), [content]);

  const anchorFor = (node: any): string | undefined =>
    headingIds.get(node?.position?.start?.line);

  const renderers = {
    // Custom code block
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      const codeVal = String(children).replace(/\n$/, "");
      if (!inline && match) {
        return <CodeBlock code={codeVal} lang={match[1]} />;
      }
      return (
        <code
          className="rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold"
          {...props}
        >
          {children}
        </code>
      );
    },
    // Custom image element with lightbox zoom
    img({ node, src, alt, ...props }: any) {
      if (!src) return null;
      return (
        <figure className="my-6 space-y-2 text-center">
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleImageClick(src, alt || "");
            }}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 inline-block w-full max-w-3xl shadow-md hover:shadow-lg transition-all"
          >
            <LocalImage
              src={src}
              alt={alt}
              className="w-full max-h-[600px] object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm border border-slate-700/80 shadow-md">
                <ZoomIn className="h-3.5 w-3.5" />
                <span>Ampliar</span>
              </span>
            </div>
          </div>
          {alt && alt !== "Legenda da Imagem" && alt !== "imagem" && alt !== "alt" && (
            <figcaption className="text-xs text-slate-500 dark:text-slate-400 font-sans italic text-center">
              {alt}
            </figcaption>
          )}
        </figure>
      );
    },
    // Headings
    h1({ children }: any) {
      return (
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display pt-5 pb-1 tracking-tight border-b border-slate-100 dark:border-slate-800">
          {children}
        </h1>
      );
    },
    h2({ node, children }: any) {
      return (
        // `scroll-mt-24` compensa o cabeçalho fixo ao pular pela âncora.
        <h2
          id={anchorFor(node)}
          className="scroll-mt-24 text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display pt-4 pb-1 tracking-tight border-b border-slate-100 dark:border-slate-800"
        >
          {children}
        </h2>
      );
    },
    h3({ node, children }: any) {
      return (
        <h3
          id={anchorFor(node)}
          className="scroll-mt-24 text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display pt-3 tracking-tight"
        >
          {children}
        </h3>
      );
    },
    h4({ children }: any) {
      return (
        <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display pt-2 tracking-tight">
          {children}
        </h4>
      );
    },
    // Blockquote
    blockquote({ children }: any) {
      return (
        <blockquote className="my-4 pl-4 border-l-4 border-indigo-500 italic bg-indigo-50/20 dark:bg-indigo-950/30 py-2 text-slate-700 dark:text-slate-300 rounded-r-lg">
          {children}
        </blockquote>
      );
    },
    // Tables (GFM extension)
    table({ children }: any) {
      return (
        <div className="my-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">{children}</table>
        </div>
      );
    },
    thead({ children }: any) {
      return <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold font-mono uppercase text-[11px] tracking-wider">{children}</thead>;
    },
    tbody({ children }: any) {
      return <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">{children}</tbody>;
    },
    tr({ children }: any) {
      return <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">{children}</tr>;
    },
    th({ children }: any) {
      return <th className="px-3.5 py-2.5 font-bold">{children}</th>;
    },
    td({ children }: any) {
      return <td className="px-3.5 py-2 text-slate-700 dark:text-slate-300 leading-normal">{children}</td>;
    },
    // Lists
    ul({ children }: any) {
      return <ul className="list-disc pl-5 my-3 space-y-1.5">{children}</ul>;
    },
    ol({ children }: any) {
      return <ol className="list-decimal pl-5 my-3 space-y-1.5">{children}</ol>;
    },
    li({ children }: any) {
      return <li className="text-slate-600 dark:text-slate-300">{children}</li>;
    },
    hr() {
      return <hr className="my-6 border-t border-slate-200 dark:border-slate-800" />;
    },
    p({ node, children }: any) {
      const parts = splitVideos(node, children);
      if (!parts) return <div className="whitespace-pre-line leading-relaxed my-3">{children}</div>;

      return (
        <>
          {parts.map((part, index) =>
            part.kind === "video" ? (
              <YouTubeEmbed key={index} video={part.video} caption={part.caption} />
            ) : (
              <div key={index} className="whitespace-pre-line leading-relaxed my-3">
                {part.lines.map((line, lineIndex) => (
                  <React.Fragment key={lineIndex}>
                    {lineIndex > 0 && "\n"}
                    {line.map((piece, pieceIndex) => (
                      <React.Fragment key={pieceIndex}>
                        {piece.kind === "text" ? piece.value : piece.rendered}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )
          )}
        </>
      );
    }
  };

  return (
    <div className={`markdown-body font-sans leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        urlTransform={(url) => url}
        components={renderers}
      >
        {content}
      </ReactMarkdown>

      {/* Lightbox Image Zoom Viewer Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomedImage(null)}
              className="absolute inset-0 cursor-zoom-out"
            />

            <button
              onClick={() => setZoomedImage(null)}
              className="absolute right-6 top-6 z-[101] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer shadow-md border border-white/10"
              aria-label="Fechar visualização"
            >
              <X className="h-6 w-6" />
            </button>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative max-w-5xl max-h-[85vh] flex flex-col items-center z-[101] select-none"
            >
              <LocalImage
                src={zoomedImage.url}
                alt={zoomedImage.alt}
                referrerPolicy="no-referrer"
                className="object-contain max-w-full max-h-[75vh] rounded-2xl shadow-2xl border border-white/5 bg-transparent"
              />
              {zoomedImage.alt && (
                <div className="mt-4 rounded-xl bg-slate-900/90 px-4 py-2 text-sm text-slate-200 border border-slate-800/80 text-center shadow-lg max-w-xl truncate">
                  {zoomedImage.alt}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
