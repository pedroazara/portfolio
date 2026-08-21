import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, AlertCircle } from "lucide-react";
import { Project } from "../types";
import { Language } from "../lib/translations";
import { localePath } from "../lib/routes";

interface ProjetosRelacionadosProps {
  /** Códigos de projeto guardados na experiência ou atividade. */
  projectCodes?: string[];
  projects: Project[];
  isEditMode: boolean;
  language?: Language;
}

/**
 * Os projetos citados por uma experiência ou atividade, como links.
 *
 * Um código que não corresponde a projeto nenhum aparece em vermelho para quem
 * edita — é o sintoma de projeto renomeado ou apagado, e some sozinho da
 * página pública, onde vira apenas o texto do código.
 */
export default function ProjetosRelacionados({
  projectCodes,
  projects,
  isEditMode,
  language = "pt",
}: ProjetosRelacionadosProps) {
  if (!projectCodes || projectCodes.length === 0) return null;

  return (

      <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5 no-print print:hidden">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-sans">
            {language === "en" ? "Related Projects:" : "Projetos relacionados:"}
          </span>
          {projectCodes.map((code, idx) => {
            const proj = projects.find((p) => p.codigo === code || p.id === code);

            if (!proj) {
              if (isEditMode) {
                return (
                  <span
                    key={`exp-code-err-${code}-${idx}`}
                    className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-[11px] font-mono font-semibold"
                    title="Código de projeto não encontrado"
                  >
                    <AlertCircle className="h-3 w-3 text-rose-500" />
                    <span>Código inexistente: [{code}]</span>
                  </span>
                );
              }
              return (
                <span
                  key={`exp-code-${code}-${idx}`}
                  className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 text-[11px] font-sans"
                >
                  {code}
                </span>
              );
            }

            return (
              <Link
                key={`exp-code-proj-${code}-${idx}`}
                to={localePath(`/projetos/${proj.codigo || proj.id}`, language)}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2.5 py-0.5 text-[11.5px] font-sans font-medium transition-colors"
              >
                <span>{language === "en" && proj.titleEn ? proj.titleEn : proj.title}</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-70" />
              </Link>
            );
          })}
        </div>
        
        {/* Printable view without links */}
        <div className="hidden print:block text-xs text-slate-600 dark:text-slate-400 mt-1">
          Projetos: {projectCodes.map((code) => projects.find((p) => p.codigo === code || p.id === code)?.title || code).join(", ")}
        </div>
      </div>
    
  );
}
