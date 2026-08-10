import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ZoomIn, X, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LocalImage from "./LocalImage";

interface MarkdownRendererProps {
  content: string;
  className?: string;
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
    h2({ children }: any) {
      return (
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display pt-4 pb-1 tracking-tight border-b border-slate-100 dark:border-slate-800">
          {children}
        </h2>
      );
    },
    h3({ children }: any) {
      return (
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display pt-3 tracking-tight">
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
    p({ children }: any) {
      return <div className="whitespace-pre-line leading-relaxed my-3">{children}</div>;
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
