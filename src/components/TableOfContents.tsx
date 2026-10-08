import React, { useEffect, useState } from "react";
import { ArrowUp, ChevronDown } from "lucide-react";
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
 * Mostra só as seções principais (`##`); as subseções (`###`) aparecem
 * embaixo da seção que está sendo lida, e somem quando a leitura passa para a
 * próxima. Com todos os títulos de uma vez, um projeto de 17 títulos virava
 * uma parede de texto do tamanho da tela numa coluna de 10rem.
 *
 * Fica preso logo abaixo do cabeçalho, e não centrado na altura da tela: como
 * a lista muda de tamanho ao abrir e fechar subseções, centrada ela pularia a
 * cada troca de seção.
 */
export default function TableOfContents({ entries, language = "pt" }: TableOfContentsProps) {
  const t = (pt: string, en: string) => (language === "en" ? en : pt);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
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

      // No fim da página, a última seção pode não ter texto abaixo bastante
      // para o título subir até a linha — e nunca acenderia. Ali, vale a
      // última seção cujo título está à vista.
      const noFim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const linha = noFim ? window.innerHeight : LINHA_DE_CORTE;

      let current: string | null = null;
      for (const entry of entries) {
        const el = document.getElementById(entry.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= linha) {
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

  if (entries.length === 0) return null;

  // Volta ao início do artigo — e, com ele, o hash da URL some sozinho: sem
  // título abaixo da linha de corte, o próximo cálculo zera `activeId`.
  const voltarAoTopo = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cada subseção pertence à última seção principal antes dela; uma
  // subseção sem seção acima (-1) fica sempre à vista.
  const secaoDe: number[] = [];
  let ultimaSecao = -1;
  entries.forEach((entry, indice) => {
    if (entry.level !== 3) ultimaSecao = indice;
    secaoDe.push(entry.level === 3 ? ultimaSecao : indice);
  });
  const ativo = entries.findIndex((entry) => entry.id === activeId);
  const secaoAtiva = ativo >= 0 ? secaoDe[ativo] : -1;
  const visiveis = entries
    .map((entry, indice) => ({ entry, indice }))
    .filter(({ entry, indice }) => entry.level !== 3 || secaoDe[indice] === -1 || secaoDe[indice] === secaoAtiva);
  const totalSecoes = entries.filter((entry) => entry.level !== 3).length || entries.length;

  return (
    <nav
      aria-label={t("Sumário", "Table of contents")}
      className={`sticky ${STICKY_UNDER_HEADER_CLASS} max-h-[calc(100vh-9rem)] overflow-y-auto no-print`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="mb-3 flex min-h-11 w-full items-center gap-2 text-left text-sm font-semibold text-tinta xl:hidden"
      >
        {t("Nesta página", "On this page")}
        <span className="ml-auto font-mono text-[11px] font-normal text-tinta-fraca">
          {totalSecoes === 1 ? t("1 seção", "1 section") : t(`${totalSecoes} seções`, `${totalSecoes} sections`)}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 text-tinta-fraca transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <div className={expanded ? "block" : "hidden xl:block"}>
        <p className="mb-3 hidden font-mono text-[11px] font-bold uppercase tracking-wider text-tinta-fraca xl:block">
          {t("Sumário", "Contents")}
        </p>

        <ul className="space-y-0.5 border-l border-borda-suave">
          {visiveis.map(({ entry, indice }) => {
            const isActive = indice === ativo;
            // A seção principal de uma subseção em leitura: marcada mais de leve.
            const contemAtivo = !isActive && indice === secaoAtiva;
            return (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  aria-current={isActive ? "location" : undefined}
                  className={`-ml-px block min-w-0 border-l-2 py-1.5 pr-2 text-xs leading-snug transition-colors ${
                    entry.level === 3 ? "pl-6" : "pl-3 font-medium"
                  } ${
                    isActive
                      ? "border-acento font-semibold text-acento"
                      : contemAtivo
                        ? "border-acento/40 text-tinta"
                        : entry.level === 3
                          ? "border-transparent text-tinta-fraca hover:text-tinta"
                          : "border-transparent text-tinta-suave hover:text-tinta"
                  }`}
                >
                  {entry.text}
                </a>
              </li>
            );
          })}
        </ul>

        {/* Só na lateral: no celular a lista já fica no topo da página. */}
        <button
          type="button"
          onClick={voltarAoTopo}
          className="group mt-5 hidden items-center gap-1.5 text-xs font-semibold text-tinta-suave transition-colors hover:text-acento xl:flex"
        >
          <ArrowUp className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
          {t("Voltar ao início", "Back to top")}
        </button>
      </div>
    </nav>
  );
}
