import React from "react";
import { ExternalLink } from "lucide-react";
import { Profile } from "../types";
import { Language } from "../lib/translations";

interface FooterProps {
  profile: Profile;
  language: Language;
  onOpenPdfPreview?: () => void;
  buildDate?: string;
}

export function Footer({ profile, language, buildDate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  // Format build date according to active locale (defaults to current date if omitted)
  const formattedBuildDate = React.useMemo(() => {
    try {
      const date = buildDate ? new Date(buildDate) : new Date();
      if (isNaN(date.getTime())) return buildDate || "";
      return new Intl.DateTimeFormat(language === "en" ? "en-US" : "pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(date);
    } catch {
      return buildDate || "";
    }
  }, [buildDate, language]);

  // Helper to format URLs safely
  const formatUrl = (url?: string, defaultPrefix = "https://") => {
    if (!url || !url.trim()) return "";
    const trimmed = url.trim();
    return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `${defaultPrefix}${trimmed}`;
  };

  const rawRepoUrl = (profile.siteRepoUrl && !profile.siteRepoUrl.includes("pedroalmeida/portfolio"))
    ? profile.siteRepoUrl
    : "https://github.com/pedroazara/portfolio";
  const siteRepoUrl = formatUrl(rawRepoUrl);

  const isEn = language === "en";

  return (
    <footer className="no-print print:hidden mt-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Faixa de metadados e créditos */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-600 dark:text-slate-400 leading-normal flex-wrap">
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 justify-center md:justify-start">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              © {currentYear} {profile.name || "Pedro Henrique Almeida"}
            </span>
            {formattedBuildDate && (
              <>
                <span className="hidden sm:inline opacity-40">•</span>
                <span>
                  {isEn ? "Updated on" : "Atualizado em"} {formattedBuildDate}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center md:justify-end">
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 underline decoration-slate-300 dark:decoration-slate-700 transition-colors"
            >
              <span>{isEn ? "Text licensed under CC BY 4.0" : "Licença CC BY 4.0"}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
              <span className="sr-only">({isEn ? "opens in new tab" : "abre em nova aba"})</span>
            </a>

            {siteRepoUrl ? (
              <>
                <span className="hidden sm:inline opacity-40">•</span>
                <a
                  href={siteRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 underline decoration-slate-300 dark:decoration-slate-700 transition-colors"
                >
                  <span>{isEn ? "Source Code" : "Repositório do Site"}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
                  <span className="sr-only">({isEn ? "opens in new tab" : "abre em nova aba"})</span>
                </a>
              </>
            ) : null}

            <span className="hidden sm:inline opacity-40">•</span>
            <a
              href="https://ai.google.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold transition-colors"
            >
              <span>{isEn ? "Built with Google AI Studio" : "Construído com Google AI Studio"}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
              <span className="sr-only">({isEn ? "opens in new tab" : "abre em nova aba"})</span>
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}

export default Footer;
