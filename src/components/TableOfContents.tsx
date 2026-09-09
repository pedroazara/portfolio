import React, { useEffect, useState } from "react";
import { List, ArrowUp } from "lucide-react";
import { TocEntry } from "../utils/toc";
import { Language } from "../lib/translations";
import { STICKY_UNDER_HEADER_CLASS } from "../lib/cardStyle";

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
  const [expanded, setExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const entryKey = entries.map(entry => entry.id).join("|");
  useEffect(() => {
    // Markdown is lazy-loaded; wait for the target rather than erasing its hash.
    let id: string; try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
    if (!id) return;
    const reveal = () => { const target = document.getElementById(id); if (!target) return false; target.scrollIntoView({ behavior: "auto", block: "start" }); return true; };
    if (reveal()) return;
    const observer = new MutationObserver(() => { if (reveal()) observer.disconnect(); });
    observer.observe(document.getElementById("conteudo-principal") || document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 10000);
    return () => { observer.disconnect(); clearTimeout(timeout); };
  }, [entryKey]);

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
  const copySection = async (id: string) => {
    const url = new URL(window.location.href); url.hash = id;
    // Never share a sandbox toggle or a preview access token accidentally.
    url.search = "";
    try { await navigator.clipboard.writeText(url.href); setCopyStatus(language === "en" ? "Section link copied" : "Link da seção copiado"); }
    catch { setCopyStatus(language === "en" ? "Could not copy. Use the section link." : "Não foi possível copiar. Use o link da seção."); }
  };

  if (entries.length === 0) return null;

  // Volta ao início do artigo — e, com ele, o hash da URL some sozinho: sem
  // título abaixo da linha de corte, o próximo cálculo zera `activeId`.
  const voltarAoTopo = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav
      aria-label={language === "en" ? "Table of contents" : "Sumário"}
      className={`sticky ${STICKY_UNDER_HEADER_CLASS} max-h-[calc(100vh-9rem)] overflow-y-auto no-print`}
    >
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="mb-3 min-h-11 w-full rounded-xl border border-borda px-3 text-left text-sm xl:hidden">{language === "en" ? "On this page" : "Nesta página"} {expanded ? "−" : "+"}</button>
      <div className={expanded ? "block" : "hidden xl:block"}>
      <button
        type="button"
        onClick={voltarAoTopo}
        className="mb-4 flex w-full items-center gap-1.5 rounded-lg border border-borda px-2.5 py-1.5 text-xs font-semibold text-tinta-suave transition-colors hover:border-acento hover:text-acento"
      >
        <ArrowUp className="h-3.5 w-3.5" />
        {language === "en" ? "Back to top" : "Voltar ao início"}
      </button>

      <p className="mb-3 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <List className="h-3.5 w-3.5" />
        {language === "en" ? "Contents" : "Sumário"}
      </p>

      <ul className="space-y-0.5 border-l border-slate-200 dark:border-slate-800">
        {entries.map((entry) => {
          const isActive = entry.id === activeId;
          return (
            <li key={entry.id} className="flex items-center">
              <a
                href={`#${entry.id}`}
                aria-current={isActive ? "location" : undefined}
                className={`-ml-px block min-w-0 flex-1 rounded-r-lg border-l-2 py-1.5 pr-2 text-xs leading-snug transition-all ${
                  entry.level === 3 ? "pl-6" : "pl-3 font-semibold"
                } ${
                  isActive
                    ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/50 dark:text-indigo-200"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {entry.text}
              </a>
              <button type="button" onClick={() => copySection(entry.id)} aria-label={`${language === "en" ? "Copy section link" : "Copiar link da seção"}: ${entry.text}`} className="min-h-11 min-w-11 shrink-0 rounded text-sm text-tinta-suave hover:text-acento">#</button>
            </li>
          );
        })}
      </ul>
      </div>
      <p role="status" className="text-xs text-tinta-suave">{copyStatus}</p>
    </nav>
  );
}
