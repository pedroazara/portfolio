import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Quote, Copy, Check } from "lucide-react";
import { Language } from "../lib/translations";
import { CitationSource, citacoesPara } from "../lib/citation";

interface CitarBotaoProps {
  source: CitationSource;
  language?: Language;
}

/**
 * Botão "Citar": abre um painel com a referência pronta em dois formatos —
 * texto corrido (ABNT em português, APA em inglês) e BibTeX — cada um com seu
 * próprio botão de copiar.
 *
 * Mesma ideia do botão "Compartilhar" ao lado (link pronto, um clique), mas
 * aqui há duas variantes de texto em vez de uma só, o que pede um painel em
 * vez de copiar direto ao clicar.
 */
export default function CitarBotao({ source, language = "pt" }: CitarBotaoProps) {
  const [open, setOpen] = useState(false);
  const [copiado, setCopiado] = useState<"texto" | "bibtex" | null>(null);
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

  const copiar = (valor: string, formato: "texto" | "bibtex") => {
    navigator.clipboard.writeText(valor);
    setCopiado(formato);
    setTimeout(() => setCopiado(null), 2000);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Quote className="h-3.5 w-3.5" />
        {isEn ? "Cite" : "Citar"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[90vw] space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {texto.rotulo}
                </span>
                <button
                  type="button"
                  onClick={() => copiar(texto.valor, "texto")}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {copiado === "texto" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiado === "texto" ? (isEn ? "Copied" : "Copiado") : (isEn ? "Copy" : "Copiar")}
                </button>
              </div>
              <p className="rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {texto.valor}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  BibTeX
                </span>
                <button
                  type="button"
                  onClick={() => copiar(bibtex, "bibtex")}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {copiado === "bibtex" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiado === "bibtex" ? (isEn ? "Copied" : "Copiado") : (isEn ? "Copy" : "Copiar")}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-slate-50 p-2.5 font-mono text-[11px] leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {bibtex}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
