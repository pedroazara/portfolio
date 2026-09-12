import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Share2, Quote, Copy, Check, Link2 } from "lucide-react";
import { Language } from "../lib/translations";
import { CitationSource, citacoesPara } from "../lib/citation";

interface CitarBotaoProps {
  source: CitationSource;
  /** Link da página, para a ação "Copiar link" no topo do painel. */
  shareUrl: string;
  language?: Language;
}

/**
 * Botão único de "Compartilhar": um gatilho abre um painel com o link da
 * página e a referência pronta em dois formatos — texto corrido (ABNT em
 * português, APA em inglês) e BibTeX — cada um com seu próprio botão de
 * copiar.
 *
 * Antes eram dois botões lado a lado ("Compartilhar" e "Citar") na barra do
 * artigo — duas ações de copiar algo que, para quem lê, são a mesma ideia
 * vista de dois ângulos. Um gatilho só deixa a barra mais silenciosa.
 */
export default function CitarBotao({ source, shareUrl, language = "pt" }: CitarBotaoProps) {
  const [open, setOpen] = useState(false);
  const [copiado, setCopiado] = useState<"link" | "texto" | "bibtex" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isEn = language === "en";

  useEffect(() => {
    if (!open) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [open]);

  const { texto, bibtex } = citacoesPara(source, language);

  const copiar = (valor: string, formato: "link" | "texto" | "bibtex") => {
    navigator.clipboard.writeText(valor);
    setCopiado(formato);
    setTimeout(() => setCopiado(null), 2000);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-borda px-3 py-2 text-xs font-semibold text-tinta-suave transition-colors hover:bg-superficie-alta"
      >
        <Share2 className="h-3.5 w-3.5" />
        {isEn ? "Share" : "Compartilhar"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[90vw] space-y-3 rounded-2xl border border-borda-suave bg-superficie p-4 shadow-lg"
          >
            <button
              type="button"
              onClick={() => copiar(shareUrl, "link")}
              className="flex w-full items-center justify-between rounded-lg bg-superficie-alta p-2.5 text-left"
            >
              <span className="flex min-w-0 items-center gap-2 text-xs text-tinta-suave">
                <Link2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{shareUrl}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-acento">
                {copiado === "link" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiado === "link" ? (isEn ? "Copied" : "Copiado") : (isEn ? "Copy" : "Copiar")}
              </span>
            </button>

            <div className="space-y-1.5 border-t border-borda-suave pt-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-tinta-fraca">
                  <Quote className="h-3 w-3" />
                  {texto.rotulo}
                </span>
                <button
                  type="button"
                  onClick={() => copiar(texto.valor, "texto")}
                  className="flex items-center gap-1 text-[11px] font-semibold text-acento hover:underline"
                >
                  {copiado === "texto" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiado === "texto" ? (isEn ? "Copied" : "Copiado") : (isEn ? "Copy" : "Copiar")}
                </button>
              </div>
              <p className="rounded-lg bg-superficie-alta p-2.5 text-xs leading-relaxed text-tinta-suave">
                {texto.valor}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-tinta-fraca">
                  BibTeX
                </span>
                <button
                  type="button"
                  onClick={() => copiar(bibtex, "bibtex")}
                  className="flex items-center gap-1 text-[11px] font-semibold text-acento hover:underline"
                >
                  {copiado === "bibtex" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiado === "bibtex" ? (isEn ? "Copied" : "Copiado") : (isEn ? "Copy" : "Copiar")}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-superficie-alta p-2.5 font-mono text-[11px] leading-relaxed text-tinta-suave">
                {bibtex}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
