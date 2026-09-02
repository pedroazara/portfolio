import React from "react";
import { Link2, ExternalLink } from "lucide-react";
import { ExperienceLink } from "../types";
import { Language } from "../lib/translations";

/**
 * Sem protocolo, um `href="doi.org/..."` vira um link relativo — o navegador o
 * resolve contra a própria página em vez de abrir a fonte.
 */
function comProtocolo(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Domínio legível, para quando a referência não tem título próprio. */
function hostnameOf(url: string): string {
  try {
    return new URL(comProtocolo(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface ReferenciasSectionProps {
  references?: ExperienceLink[];
  language?: Language;
}

/**
 * Fontes, artigos e materiais citados no texto — a bibliografia do projeto ou
 * artigo, numerada como em uma publicação.
 */
export default function ReferenciasSection({ references, language = "pt" }: ReferenciasSectionProps) {
  const refs = (references || []).filter((r) => r.url);
  if (refs.length === 0) return null;

  return (
    <section className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800 no-print">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
        <Link2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        {language === "en" ? "References" : "Referências"}
      </h2>
      <ol className="space-y-2.5">
        {refs.map((ref, i) => (
          <li key={i} className="flex items-start gap-2.5 font-sans text-sm">
            <span className="mt-px shrink-0 font-mono text-xs text-slate-400 dark:text-slate-600">
              [{i + 1}]
            </span>
            <a
              href={comProtocolo(ref.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex flex-wrap items-baseline gap-x-1.5 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
            >
              <span className="font-medium underline decoration-slate-300 underline-offset-2 group-hover:decoration-indigo-500 dark:decoration-slate-700">
                {ref.title || hostnameOf(ref.url)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-600">
                {ref.title && `(${hostnameOf(ref.url)})`}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
