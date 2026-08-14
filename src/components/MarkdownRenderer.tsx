import React, { Suspense, lazy } from "react";

/**
 * Invólucro de carregamento sob demanda para o renderizador de Markdown.
 *
 * A implementação real arrasta `react-markdown`, `remark-gfm`, `remark-math`,
 * `rehype-katex` e o CSS do KaTeX — algumas centenas de KB que só fazem falta
 * quando há conteúdo formatado na tela. Como quase toda página renderiza algum
 * Markdown, mas nem toda visita chega a esse ponto, o custo sai do carregamento
 * inicial e passa a ser pago no primeiro uso.
 *
 * A API é idêntica à de antes: quem importa este arquivo não muda nada.
 */
const MarkdownRendererImpl = lazy(() => import("./MarkdownRendererImpl"));

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/** Espaço reservado com a mesma cor de fundo, para não piscar durante a troca. */
function MarkdownFallback({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-2 h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <Suspense fallback={<MarkdownFallback className={className} />}>
      <MarkdownRendererImpl content={content} className={className} />
    </Suspense>
  );
}
