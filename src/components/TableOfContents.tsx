import React, { useEffect, useState } from "react";
import { List } from "lucide-react";
import { TocEntry } from "../utils/toc";
import { Language } from "../lib/translations";

interface TableOfContentsProps {
  entries: TocEntry[];
  language?: Language;
}

/**
 * Sumário lateral com destaque da seção em leitura.
 *
 * O destaque usa IntersectionObserver com uma faixa estreita no topo da tela:
 * a seção "ativa" é a que cruza essa faixa, o que acompanha a rolagem sem
 * precisar recalcular posições a cada evento de scroll.
 */
export default function TableOfContents({ entries, language = "pt" }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (entries.length === 0) return;

    /**
     * A seção ativa é a última cujo título já passou por uma linha imaginária
     * logo abaixo do cabeçalho fixo.
     *
     * Uma tentativa anterior usava IntersectionObserver com uma faixa estreita,
     * mas um título que parasse exatamente na borda da faixa produzia
     * interseção de área zero e não era detectado — justamente o caso de quem
     * chega pelo link do sumário. Comparar posições não tem esse ponto cego.
     */
    const LINHA_DE_CORTE = 120;

    let frame = 0;

    const recalc = () => {
      frame = 0;

      let current: string | null = null;
      for (const entry of entries) {
        const el = document.getElementById(entry.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= LINHA_DE_CORTE) {
          current = entry.id;
        } else {
          // Os títulos estão em ordem de documento: o primeiro abaixo da linha
          // encerra a busca.
          break;
        }
      }

      setActiveId(current);
    };

    // Agrupa rajadas de rolagem num único cálculo por quadro.
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(recalc);
    };

    recalc();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [entries]);

  /**
   * Espelha a seção em leitura no endereço da página, para que copiar a URL
   * aponte para o trecho que a pessoa está lendo.
   *
   * Usa `replaceState` — e não o roteador — de propósito: cada seção
   * atravessada viraria uma entrada no histórico, e sair da página exigiria
   * apertar "voltar" uma vez por seção. `replaceState` também evita re-render
   * da árvore a cada rolagem.
   */
  useEffect(() => {
    const target = activeId ? `#${activeId}` : "";
    if (window.location.hash === target) return;

    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}${target}`
    );
  }, [activeId]);

  if (entries.length === 0) return null;

  return (
    <nav
      aria-label={language === "en" ? "Table of contents" : "Sumário"}
      className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto no-print"
    >
      <p className="mb-3 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <List className="h-3.5 w-3.5" />
        {language === "en" ? "Contents" : "Sumário"}
      </p>

      <ul className="space-y-0.5 border-l border-slate-200 dark:border-slate-800">
        {entries.map((entry) => {
          const isActive = entry.id === activeId;
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                aria-current={isActive ? "location" : undefined}
                className={`-ml-px block rounded-r-lg border-l-2 py-1.5 pr-2 text-xs leading-snug transition-all ${
                  entry.level === 3 ? "pl-6" : "pl-3 font-semibold"
                } ${
                  isActive
                    ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/50 dark:text-indigo-200"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {entry.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
